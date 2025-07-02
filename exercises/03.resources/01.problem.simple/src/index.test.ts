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

test('Resource List', async () => {
	try {
		const list = await client.listResources()
		const tagsResource = list.resources.find(r => r.name === 'tags')
		
		// 🚨 Proactive check: Ensure the tags resource is registered
		invariant(tagsResource, '🚨 No "tags" resource found - make sure to register the tags resource')
		
		expect(tagsResource).toEqual(
			expect.objectContaining({
				name: 'tags',
				uri: expect.stringMatching(/^epicme:\/\/tags$/i),
				description: expect.stringMatching(/tags/i),
			}),
		)
	} catch (error: any) {
		if (error.code === -32601) {
			console.error('🚨 Resources capability not implemented!')
			console.error('🚨 This exercise requires implementing resources with the MCP server')
			console.error('🚨 You need to: 1) Add resources: {} to server capabilities, 2) Register a "tags" resource in initializeResources()')
			console.error('🚨 Check src/resources.ts and implement a static resource for "epicme://tags"')
			const enhancedError = new Error('🚨 Resources capability required. Register a "tags" resource that returns all tags from the database. ' + (error.message || error))
			enhancedError.stack = error.stack
			throw enhancedError
		}
		throw error
	}
})

test('Tags Resource Read', async () => {
	try {
		const result = await client.readResource({
			uri: 'epicme://tags',
		})

		expect(result).toEqual(
			expect.objectContaining({
				contents: expect.arrayContaining([
					expect.objectContaining({
						mimeType: 'application/json',
						uri: 'epicme://tags',
						text: expect.any(String),
					}),
				]),
			}),
		)
		
		// 🚨 Proactive check: Ensure the resource content is valid JSON
		const content = result.contents[0]
		invariant(content && 'text' in content, '🚨 Resource content must have text field')
		invariant(typeof content.text === 'string', '🚨 Resource content text must be a string')
		
		let tags: unknown
		try {
			tags = JSON.parse(content.text)
		} catch (error) {
			throw new Error('🚨 Resource content must be valid JSON')
		}
		
		// 🚨 Proactive check: Ensure tags is an array
		invariant(Array.isArray(tags), '🚨 Tags resource should return an array of tags')
	} catch (error: any) {
		if (error.code === -32601) {
			console.error('🚨 Resource read failed - resources capability not implemented!')
			console.error('🚨 This means you haven\'t registered the "tags" resource properly')
			console.error('🚨 In src/resources.ts, use agent.server.registerResource() to create a "tags" resource')
			console.error('🚨 The resource should return JSON array of all tags from agent.db.getTags()')
			const enhancedError = new Error('🚨 "tags" resource registration required. ' + (error.message || error))
			enhancedError.stack = error.stack
			throw enhancedError
		}
		throw error
	}
})
