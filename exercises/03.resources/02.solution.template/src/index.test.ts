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
	invariant(list.resourceTemplates.length > 0, '🚨 No resource templates found - this exercise requires implementing parameterized resources like epicme://entries/{id}')
	
	const entriesTemplate = list.resourceTemplates.find(rt => 
		rt.uriTemplate.includes('entries') && rt.uriTemplate.includes('{')
	)
	const tagsTemplate = list.resourceTemplates.find(rt => 
		rt.uriTemplate.includes('tags') && rt.uriTemplate.includes('{')
	)
	
	// 🚨 Proactive checks for specific templates
	invariant(entriesTemplate, '🚨 No entries resource template found - should implement epicme://entries/{id} template')
	invariant(tagsTemplate, '🚨 No tags resource template found - should implement epicme://tags/{id} template')
	
	expect(entriesTemplate).toEqual(
		expect.objectContaining({
			name: expect.any(String),
			uriTemplate: expect.stringMatching(/entries.*\{.*\}/),
			description: expect.stringMatching(/entry|entries/i),
		}),
	)
	
	expect(tagsTemplate).toEqual(
		expect.objectContaining({
			name: expect.any(String),
			uriTemplate: expect.stringMatching(/tags.*\{.*\}/),
			description: expect.stringMatching(/tag|tags/i),
		}),
	)
})

test('Resource Template Read - Entry', async () => {
	// First create an entry to test against
	await client.callTool({
		name: 'create_entry',
		arguments: {
			title: 'Template Test Entry',
			content: 'This entry is for testing templates',
		},
	})
	
	const result = await client.readResource({
		uri: 'epicme://entries/1',
	})

	expect(result).toEqual(
		expect.objectContaining({
			contents: expect.arrayContaining([
				expect.objectContaining({
					mimeType: 'application/json',
					uri: 'epicme://entries/1',
					text: expect.any(String),
				}),
			]),
		}),
	)
	
	// 🚨 Proactive check: Ensure the resource content is valid JSON and contains entry data
	const content = result.contents[0]
	invariant(content && 'text' in content, '🚨 Resource content must have text field')
	invariant(typeof content.text === 'string', '🚨 Resource content text must be a string')
	
	let entryData: any
	try {
		entryData = JSON.parse(content.text)
	} catch (error) {
		throw new Error('🚨 Resource content must be valid JSON')
	}
	
	// 🚨 Proactive check: Ensure entry data contains expected fields
	invariant(entryData.id, '🚨 Entry resource should contain id field')
	invariant(entryData.title, '🚨 Entry resource should contain title field')
	invariant(entryData.content, '🚨 Entry resource should contain content field')
})
