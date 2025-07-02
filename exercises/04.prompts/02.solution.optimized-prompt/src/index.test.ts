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

test('Prompts List', async () => {
	const list = await client.listPrompts()
	
	// 🚨 Proactive check: Ensure prompts are registered
	invariant(list.prompts.length > 0, '🚨 No prompts found - make sure to register prompts with the prompts capability')
	
	const tagSuggestionsPrompt = list.prompts.find(p => p.name.includes('tag') || p.name.includes('suggest'))
	invariant(tagSuggestionsPrompt, '🚨 No tag suggestions prompt found - should include a prompt for suggesting tags')
})

test('Optimized Prompt with Embedded Resources', async () => {
	// First create an entry and tag for testing
	await client.callTool({
		name: 'create_entry',
		arguments: {
			title: 'Optimized Test Entry',
			content: 'This entry is for testing optimized prompts',
		},
	})
	
	await client.callTool({
		name: 'create_tag',
		arguments: {
			name: 'Optimization',
			description: 'Tag for optimization testing',
		},
	})
	
	const list = await client.listPrompts()
	const firstPrompt = list.prompts[0]
	invariant(firstPrompt, '🚨 No prompts available to test')
	
	const result = await client.getPrompt({
		name: firstPrompt.name,
		arguments: {
			entryId: '1',
		},
	})

	expect(result).toEqual(
		expect.objectContaining({
			messages: expect.arrayContaining([
				expect.objectContaining({
					role: expect.stringMatching(/user|system/),
					content: expect.objectContaining({
						type: expect.stringMatching(/text|resource/),
					}),
				}),
			]),
		}),
	)
	
	// 🚨 Proactive check: Ensure prompt has multiple messages (optimization means embedding data)
	invariant(result.messages.length > 1, '🚨 Optimized prompt should have multiple messages - instructions plus embedded data')
	
	// 🚨 Proactive check: Ensure at least one message is a resource (embedded data)
	const resourceMessages = result.messages.filter(m => m.content.type === 'resource')
	invariant(resourceMessages.length > 0, '🚨 Optimized prompt should embed resource data directly instead of instructing LLM to run tools')
	
	// 🚨 Proactive check: Ensure prompt doesn't tell LLM to run tools (that's what we're optimizing away)
	const textMessages = result.messages.filter(m => m.content.type === 'text')
	const hasToolInstructions = textMessages.some(m => 
		typeof m.content.text === 'string' && 
		(m.content.text.toLowerCase().includes('get_entry') || 
		 m.content.text.toLowerCase().includes('list_tags') ||
		 m.content.text.toLowerCase().includes('create_tag'))
	)
	invariant(!hasToolInstructions, '🚨 Optimized prompt should NOT instruct LLM to run tools - data should be embedded directly')
	
	// Validate structure of resource messages
	resourceMessages.forEach(resMsg => {
		expect(resMsg.content).toEqual(
			expect.objectContaining({
				type: 'resource',
				resource: expect.objectContaining({
					uri: expect.any(String),
					mimeType: 'application/json',
					text: expect.any(String),
				}),
			}),
		)
		
		// 🚨 Proactive check: Ensure embedded resource contains valid JSON
		invariant('resource' in resMsg.content, '🚨 Resource message must have resource field')
		invariant(typeof resMsg.content.resource === 'object' && resMsg.content.resource !== null, '🚨 Resource must be an object')
		invariant('text' in resMsg.content.resource, '🚨 Resource must have text field')
		invariant(typeof resMsg.content.resource.text === 'string', '🚨 Resource text must be a string')
		try {
			JSON.parse(resMsg.content.resource.text)
		} catch (error) {
			throw new Error('🚨 Embedded resource data must be valid JSON')
		}
	})
})
