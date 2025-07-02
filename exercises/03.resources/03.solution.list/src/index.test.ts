import fs from 'node:fs/promises'
import path from 'node:path'
import { invariant } from '@epic-web/invariant'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { test, beforeAll, afterAll, expect } from 'vitest'

let client: Client
const EPIC_ME_DB_PATH = `./test.ignored/db.${process.env.VITEST_WORKER_ID}.sqlite`

beforeAll(async () => {
	const dir = path.dirname(EPIC_ME_DB_PATH)
	await fs.mkdir(dir, { recursive: true })
	client = new Client({
		name: 'EpicMeTester',
		version: '1.0.0',
	})
	const transport = new StdioClientTransport({
		command: 'tsx',
		args: ['src/index.ts'],
		env: {
			...process.env,
			EPIC_ME_DB_PATH,
		},
	})
	await client.connect(transport)
})

afterAll(async () => {
	await client.transport?.close()
	await fs.unlink(EPIC_ME_DB_PATH)
})

test('Tool Definition', async () => {
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
	const list = await client.listResourceTemplates()
	
	// 🚨 Proactive check: Ensure resource templates are registered
	invariant(list.resourceTemplates.length > 0, '🚨 No resource templates found - this exercise requires implementing parameterized resources with list callbacks')
	
	const entriesTemplate = list.resourceTemplates.find(rt => 
		rt.uriTemplate.includes('entries') && rt.uriTemplate.includes('{')
	)
	const tagsTemplate = list.resourceTemplates.find(rt => 
		rt.uriTemplate.includes('tags') && rt.uriTemplate.includes('{')
	)
	
	// 🚨 Proactive checks for specific templates
	invariant(entriesTemplate, '🚨 No entries resource template found - should implement epicme://entries/{id} template')
	invariant(tagsTemplate, '🚨 No tags resource template found - should implement epicme://tags/{id} template')
})

test('Resource List - Entries', async () => {
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
	
	// 🚨 Proactive check: Ensure list callback returns actual entries
	const entryResources = list.resources.filter(r => r.uri.includes('entries'))
	invariant(entryResources.length > 0, '🚨 No entry resources found in list - the list callback should return actual entries from the database')
	
	// Check that we have at least the entries we created
	const foundEntries = entryResources.filter(r => 
		r.uri.includes('entries/1') || r.uri.includes('entries/2')
	)
	invariant(foundEntries.length >= 2, '🚨 List should return the entries that were created')
	
	// Validate the structure of listed resources
	entryResources.forEach(resource => {
		expect(resource).toEqual(
			expect.objectContaining({
				name: expect.any(String),
				uri: expect.stringMatching(/epicme:\/\/entries\/\d+/),
				mimeType: 'application/json',
			}),
		)
		
		// 🚨 Proactive check: List should not include content (only metadata)
		invariant(!('text' in resource), '🚨 Resource list should only contain metadata, not the full content - use readResource to get content')
	})
})

test('Resource List - Tags', async () => {
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
	const tagResources = list.resources.filter(r => r.uri.includes('tags'))
	invariant(tagResources.length > 0, '🚨 No tag resources found in list - the list callback should return actual tags from the database')
	
	// Should have both static resource and parameterized resources from list callback
	const staticTagsResource = tagResources.find(r => r.uri === 'epicme://tags')
	const parameterizedTagResources = tagResources.filter(r => r.uri.match(/epicme:\/\/tags\/\d+/))
	
	// 🚨 Proactive check: List should include resources from template list callback
	invariant(parameterizedTagResources.length > 0, '🚨 No parameterized tag resources found - the resource template list callback should return individual tags')
	
	// Validate the structure of parameterized tag resources (from list callback)
	parameterizedTagResources.forEach(resource => {
		expect(resource).toEqual(
			expect.objectContaining({
				name: expect.any(String),
				uri: expect.stringMatching(/epicme:\/\/tags\/\d+/),
				mimeType: 'application/json',
			}),
		)
	})
})
