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
})

test('Optimized Prompt with Embedded Resources', async () => {
	await using setup = await setupClient()
	const { client } = setup
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

	try {
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
		invariant(
			result.messages.length > 1,
			'🚨 Optimized prompt should have multiple messages - instructions plus embedded data',
		)

		// 🚨 Proactive check: Ensure at least one message is a resource (embedded data)
		const resourceMessages = result.messages.filter(
			(m) => m.content.type === 'resource',
		)
		invariant(
			resourceMessages.length > 0,
			'🚨 Optimized prompt should embed resource data directly instead of instructing LLM to run tools',
		)

		// 🚨 Proactive check: Ensure prompt doesn't tell LLM to run data retrieval tools (that's what we're optimizing away)
		const textMessages = result.messages.filter(
			(m) => m.content.type === 'text',
		)
		const hasDataRetrievalInstructions = textMessages.some(
			(m) =>
				m.content.type === 'text' &&
				typeof m.content.text === 'string' &&
				(m.content.text.toLowerCase().includes('get_entry') ||
					m.content.text.toLowerCase().includes('list_tags') ||
					m.content.text.toLowerCase().includes('look up')),
		)
		invariant(
			!hasDataRetrievalInstructions,
			'🚨 Optimized prompt should NOT instruct LLM to run data retrieval tools like get_entry or list_tags - data should be embedded directly',
		)

		// Note: The prompt can still instruct the LLM to use action tools like create_tag or add_tag_to_entry

		// Validate structure of resource messages
		resourceMessages.forEach((resMsg) => {
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
			invariant(
				'resource' in resMsg.content,
				'🚨 Resource message must have resource field',
			)
			invariant(
				typeof resMsg.content.resource === 'object' &&
					resMsg.content.resource !== null,
				'🚨 Resource must be an object',
			)
			invariant(
				'text' in resMsg.content.resource,
				'🚨 Resource must have text field',
			)
			invariant(
				typeof resMsg.content.resource.text === 'string',
				'🚨 Resource text must be a string',
			)
			try {
				JSON.parse(resMsg.content.resource.text)
			} catch (error) {
				throw new Error('🚨 Embedded resource data must be valid JSON')
			}
		})
	} catch (error) {
		console.error('🚨 Prompt optimization not properly implemented!')
		console.error(
			'🚨 This exercise requires you to optimize prompts by embedding resource data directly in the prompt messages, instead of instructing the LLM to call get_entry or list_tags.',
		)
		console.error('🚨 You need to:')
		console.error(
			'🚨   1. Fetch the entry and tag data in your prompt handler.',
		)
		console.error(
			'🚨   2. Create multiple messages: one with instructions, others with embedded resource content (type: "resource", mimeType: "application/json").',
		)
		console.error(
			'🚨   3. DO NOT tell the LLM to call get_entry or list_tags - provide the data directly.',
		)
		console.error(
			'🚨   4. Ensure at least one message is a resource, and that the resource contains valid JSON.',
		)
		console.error('🚨 This reduces LLM tool calls and improves performance!')
		throw new Error(
			`🚨 Optimized prompt should embed resource data directly, not instruct LLM to fetch it. ${error}`,
		)
	}
})
