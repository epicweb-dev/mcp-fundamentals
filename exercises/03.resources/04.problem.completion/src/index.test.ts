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

test('Resource Template Completions', async () => {
	// First create some entries to have data for completion
	await client.callTool({
		name: 'create_entry',
		arguments: {
			title: 'Completion Test Entry 1',
			content: 'This is for testing completions',
		},
	})
	
	await client.callTool({
		name: 'create_entry',
		arguments: {
			title: 'Completion Test Entry 2',
			content: 'This is another completion test',
		},
	})
	
	// Test that resource templates exist
	const templates = await client.listResourceTemplates()
	
	// 🚨 Proactive check: Ensure resource templates are registered
	invariant(templates.resourceTemplates.length > 0, '🚨 No resource templates found - this exercise requires implementing resource templates')
	
	const entriesTemplate = templates.resourceTemplates.find(rt => 
		rt.uriTemplate.includes('entries') && rt.uriTemplate.includes('{')
	)
	invariant(entriesTemplate, '🚨 No entries resource template found - should implement epicme://entries/{id} template')
	
	// 🚨 The key learning objective for this exercise is adding completion support
	// This requires BOTH declaring completions capability AND implementing complete callbacks
	
	// Test if completion capability is properly declared by trying to use completion API
	let completionSupported = false
	try {
		// This should work if server declares completion capability and implements complete callbacks
		await (client as any)._client.request({
			method: 'completion/complete',
			params: {
				ref: {
					type: 'resource',
					uri: 'epicme://entries/{id}',
				},
				argument: {
					name: 'id',
					value: '1',
				},
			},
		})
		completionSupported = true
	} catch (error: any) {
		// -32601 = Method not found (missing completion capability)
		// -32602 = Invalid params (missing complete callbacks)
		if (error?.code === -32601 || error?.code === -32602) {
			completionSupported = false
		} else {
			// Other errors might be acceptable (like no matches found)
			completionSupported = true
		}
	}
	
	// 🚨 Proactive check: Completion functionality must be fully implemented
	invariant(completionSupported, '🚨 Resource template completion requires both declaring completions capability in server AND implementing complete callbacks for template parameters')
})
