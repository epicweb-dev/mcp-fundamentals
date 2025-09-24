import fs from 'node:fs/promises'
import path from 'node:path'
import { invariant } from '@epic-web/invariant'
import {
	Client,
	type ClientOptions,
} from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { test, expect } from 'vitest'

function getTestDbPath() {
	return `./test.ignored/db.${process.env.VITEST_WORKER_ID}.${Math.random().toString(36).slice(2)}.sqlite`
}

async function setupClient({ capabilities }: ClientOptions = {}) {
	const EPIC_ME_DB_PATH = getTestDbPath()
	const dir = path.dirname(EPIC_ME_DB_PATH)
	await fs.mkdir(dir, { recursive: true })
	const client = new Client(
		{
			name: 'EpicMeTester',
			version: '1.0.0',
		},
		{ capabilities },
	)
	const transport = new StdioClientTransport({
		command: 'tsx',
		args: ['src/index.ts'],
		env: {
			...process.env,
			EPIC_ME_DB_PATH,
		},
		stderr: 'ignore',
	})
	await client.connect(transport)
	return {
		client,
		EPIC_ME_DB_PATH,
		async [Symbol.asyncDispose]() {
			await client.transport?.close()
			// give things a moment to release locks and whatnot
			await new Promise((r) => setTimeout(r, 100))
			await fs.unlink(EPIC_ME_DB_PATH).catch(() => {}) // ignore missing file
		},
	}
}

test('Tool Definition', async () => {
	await using setup = await setupClient()
	const { client } = setup
	const list = await client.listTools()
	const [firstTool] = list.tools
	invariant(firstTool, '🚨 No tools found')

	expect(firstTool).toEqual(
		expect.objectContaining({
			name: expect.stringMatching(/^create_entry$/i),
			description: expect.stringMatching(/^create a new journal entry$/i),
			inputSchema: expect.objectContaining({
				type: 'object',
				properties: expect.objectContaining({
					title: expect.objectContaining({
						type: 'string',
						description: expect.stringMatching(/title/i),
					}),
					content: expect.objectContaining({
						type: 'string',
						description: expect.stringMatching(/content/i),
					}),
				}),
			}),
		}),
	)
})

test('Tool Call', async () => {
	await using setup = await setupClient()
	const { client } = setup
	const result = await client.callTool({
		name: 'create_entry',
		arguments: {
			title: 'Test Entry',
			content: 'This is a test entry',
		},
	})

	expect(result).toEqual(
		expect.objectContaining({
			content: expect.arrayContaining([
				expect.objectContaining({
					type: 'text',
					text: expect.stringMatching(
						/Entry "Test Entry" created successfully/,
					),
				}),
			]),
		}),
	)
})

test('Resource Templates List', async () => {
	await using setup = await setupClient()
	const { client } = setup
	const list = await client.listResourceTemplates()

	// 🚨 Proactive check: Ensure resource templates are registered
	invariant(
		list.resourceTemplates.length > 0,
		'🚨 No resource templates found - this exercise requires implementing parameterized resources with list callbacks',
	)

	const entriesTemplate = list.resourceTemplates.find(
		(rt) => rt.uriTemplate.includes('entries') && rt.uriTemplate.includes('{'),
	)
	const tagsTemplate = list.resourceTemplates.find(
		(rt) => rt.uriTemplate.includes('tags') && rt.uriTemplate.includes('{'),
	)

	// 🚨 Proactive checks for specific templates
	invariant(
		entriesTemplate,
		'🚨 No entries resource template found - should implement epicme://entries/{id} template',
	)
	invariant(
		tagsTemplate,
		'🚨 No tags resource template found - should implement epicme://tags/{id} template',
	)
})

test('Resource List - Entries', async () => {
	await using setup = await setupClient()
	const { client } = setup
	// First create some entries to test against
	await client.callTool({
		name: 'create_entry',
		arguments: {
			title: 'List Test Entry 1',
			content: 'This is test entry 1',
		},
	})

	await client.callTool({
		name: 'create_entry',
		arguments: {
			title: 'List Test Entry 2',
			content: 'This is test entry 2',
		},
	})

	const list = await client.listResources()

	// Since entries don't have a list callback, they shouldn't appear in the resources list
	const entryResources = list.resources.filter((r) => r.uri.includes('entries'))
	expect(entryResources).toHaveLength(0)

	// Verify that the entries template exists but doesn't have a list callback
	const templatesList = await client.listResourceTemplates()
	const entriesTemplate = templatesList.resourceTemplates.find(
		(rt) => rt.uriTemplate.includes('entries') && rt.uriTemplate.includes('{'),
	)
	expect(entriesTemplate).toBeDefined()
	expect(entriesTemplate?.list).toBeUndefined()
})

test('Resource List - Tags', async () => {
	await using setup = await setupClient()
	const { client } = setup
	// Create a tag to test against
	await client.callTool({
		name: 'create_tag',
		arguments: {
			name: 'List Test Tag',
			description: 'This is a test tag for listing',
		},
	})

	const list = await client.listResources()

	// 🚨 Proactive check: Ensure list callback returns actual tags
	const tagResources = list.resources.filter((r) => r.uri.includes('tags'))
	invariant(
		tagResources.length > 0,
		'🚨 No tag resources found in list - the list callback should return actual tags from the database',
	)

	// Should have both static resource and parameterized resources from list callback
	const staticTagsResource = tagResources.find((r) => r.uri === 'epicme://tags')
	const parameterizedTagResources = tagResources.filter((r) =>
		r.uri.match(/epicme:\/\/tags\/\d+/),
	)

	// 🚨 Proactive check: List should include resources from template list callback
	invariant(
		parameterizedTagResources.length > 0,
		'🚨 No parameterized tag resources found - the resource template list callback should return individual tags',
	)

	// Validate the structure of parameterized tag resources (from list callback)
	parameterizedTagResources.forEach((resource) => {
		expect(resource).toEqual(
			expect.objectContaining({
				name: expect.any(String),
				uri: expect.stringMatching(/epicme:\/\/tags\/\d+/),
				mimeType: 'application/json',
			}),
		)
	})
})
