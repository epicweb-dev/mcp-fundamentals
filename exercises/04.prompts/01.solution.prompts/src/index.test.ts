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
	
	expect(tagSuggestionsPrompt).toEqual(
		expect.objectContaining({
			name: expect.any(String),
			description: expect.stringMatching(/tag|suggest/i),
			arguments: expect.arrayContaining([
				expect.objectContaining({
					name: expect.stringMatching(/entry|id/i),
					description: expect.any(String),
					required: true,
				}),
			]),
		}),
	)
})

test('Prompt Get', async () => {
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
						type: 'text',
						text: expect.any(String),
					}),
				}),
			]),
		}),
	)
	
	// 🚨 Proactive check: Ensure prompt contains meaningful content
	invariant(result.messages.length > 0, '🚨 Prompt should contain at least one message')
	const firstMessage = result.messages[0]
	invariant(firstMessage, '🚨 First message should exist')
	invariant(typeof firstMessage.content.text === 'string', '🚨 Message content text should be a string')
	invariant(firstMessage.content.text.length > 10, '🚨 Prompt message should be more than just a placeholder')
})
