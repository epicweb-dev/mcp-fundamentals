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
		stderr: 'ignore',
		env: {
			...process.env,
			EPIC_ME_DB_PATH,
		},
	})
	await client.connect(transport)
	return {
		client,
		EPIC_ME_DB_PATH,
		async [Symbol.asyncDispose]() {
			await client.transport?.close()
			// give things a moment to release locks and whatnot
			await new Promise((r) => setTimeout(r, 100))
			await fs.unlink(EPIC_ME_DB_PATH).catch(() => {}) // ignore missing file.catch(() => {})
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

test('Prompts List', async () => {
	await using setup = await setupClient()
	const { client } = setup
	try {
		const list = await client.listPrompts()

		// 🚨 Proactive check: Ensure prompts are registered
		invariant(
			list.prompts.length > 0,
			'🚨 No prompts found - make sure to register prompts with the prompts capability',
		)

		const tagSuggestionsPrompt = list.prompts.find(
			(p) => p.name.includes('tag') || p.name.includes('suggest'),
		)
		invariant(
			tagSuggestionsPrompt,
			'🚨 No tag suggestions prompt found - should include a prompt for suggesting tags',
		)

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
	} catch (error: any) {
		if (
			error?.code === -32601 ||
			error?.message?.includes('Method not found')
		) {
			console.error('🚨 Prompts capability not implemented!')
			console.error(
				"🚨 This exercise requires you to add support for MCP's prompt capability to your server.",
			)
			console.error('🚨 You need to:')
			console.error('🚨   1. Add "prompts" to your server capabilities.')
			console.error(
				'🚨   2. Create an initializePrompts function in prompts.ts.',
			)
			console.error(
				'🚨   3. Use server.registerPrompt() to register prompts (e.g., for suggesting tags).',
			)
			console.error(
				'🚨   4. Call initializePrompts() in your main init() method.',
			)
			console.error(
				'🚨   5. Implement prompt handlers that return meaningful, parameterized prompt messages.',
			)
			console.error(
				'🚨 In src/index.ts, add prompts capability and request handlers.',
			)
			throw new Error(
				`🚨 Prompts capability not declared - add "prompts" to server capabilities and implement prompt handlers. ${error}`,
			)
		}
		throw error
	}
})

test('Prompt Get', async () => {
	await using setup = await setupClient()
	const { client } = setup
	try {
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
		invariant(
			result.messages.length > 0,
			'🚨 Prompt should contain at least one message',
		)
		const firstMessage = result.messages[0]
		invariant(firstMessage, '🚨 First message should exist')
		invariant(firstMessage.content.type === 'text', '🚨 Message content should be a text')
		invariant(
			typeof firstMessage.content.text === 'string',
			'🚨 Message content text should be a string',
		)
		invariant(
			firstMessage.content.text.length > 10,
			'🚨 Prompt message should be more than just a placeholder',
		)
	} catch (error: any) {
		if (
			error?.code === -32601 ||
			error?.message?.includes('Method not found')
		) {
			console.error('🚨 Prompts capability not implemented!')
			console.error(
				'🚨 This exercise requires you to create and serve prompts via MCP.',
			)
			console.error('🚨 You need to:')
			console.error('🚨   1. Add "prompts" to your server capabilities.')
			console.error(
				'🚨   2. Handle prompt requests by returning prompt messages.',
			)
			console.error(
				'🚨   3. Create prompt templates that help analyze journal entries.',
			)
			console.error(
				'🚨   4. Return prompt messages with proper role and content.',
			)
			console.error(
				'🚨 In src/index.ts, implement a prompt handler to return formatted prompts.',
			)
			throw new Error(
				`🚨 Prompt get functionality not implemented - add prompts capability and a prompt handler. ${error}`,
			)
		}
		throw error
	}
})
