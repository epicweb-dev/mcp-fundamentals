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
				'🚨 This exercise teaches you how to add prompts to your MCP server',
			)
			console.error('🚨 You need to:')
			console.error('🚨   1. Add "prompts" to your server capabilities')
			console.error(
				'🚨   2. Create an initializePrompts function in a prompts.ts file',
			)
			console.error('🚨   3. Use server.registerPrompt() to register prompts')
			console.error(
				'🚨   4. Call initializePrompts() in your main init() method',
			)
			console.error(
				'🚨   5. Register prompts that can help users analyze their journal entries',
			)
			console.error(
				'🚨 In src/index.ts, add prompts capability and request handlers',
			)
			throw new Error(
				`🚨 Prompts capability not declared - add "prompts" to server capabilities and implement prompt handlers. ${error}`,
			)
		}
		throw error
	}
})

test('Prompt Argument Completion', async () => {
	await using setup = await setupClient()
	const { client } = setup
	// First create some entries to have data for completion
	await client.callTool({
		name: 'create_entry',
		arguments: {
			title: 'Completion Test Entry 1',
			content: 'This is for testing prompt completions',
		},
	})

	await client.callTool({
		name: 'create_entry',
		arguments: {
			title: 'Completion Test Entry 2',
			content: 'This is another prompt completion test',
		},
	})

	try {
		// Test that prompt completion functionality works
		const list = await client.listPrompts()
		invariant(
			list.prompts.length > 0,
			'🚨 No prompts found - need prompts to test completion',
		)

		const firstPrompt = list.prompts[0]
		invariant(firstPrompt, '🚨 No prompts available to test completion')
		invariant(
			firstPrompt.arguments && firstPrompt.arguments.length > 0,
			'🚨 Prompt should have completable arguments',
		)

		const firstArg = firstPrompt.arguments[0]
		invariant(firstArg, '🚨 First prompt argument should exist')

		// Test completion functionality using the proper MCP SDK method
		const completionResult = await client.complete({
			ref: {
				type: 'ref/prompt',
				name: firstPrompt.name,
			},
			argument: {
				name: firstArg.name,
				value: '1', // Should match at least one of our created entries
			},
		})

		// 🚨 Proactive check: Completion should return results
		invariant(
			Array.isArray(completionResult.completion?.values),
			'🚨 Prompt completion should return an array of values',
		)
		invariant(
			completionResult.completion.values.length > 0,
			'🚨 Prompt completion should return at least one matching result for value="1"',
		)

		// Check that completion values are strings
		completionResult.completion.values.forEach((value: any) => {
			invariant(
				typeof value === 'string',
				'🚨 Completion values should be strings',
			)
		})
	} catch (error: any) {
		console.error('🚨 Prompt argument completion not fully implemented!')
		console.error(
			'🚨 This exercise teaches you how to add completion support to prompt arguments',
		)
		console.error('🚨 You need to:')
		console.error('🚨   1. Add "completion" to your server capabilities')
		console.error(
			'🚨   2. Import completable from @modelcontextprotocol/sdk/server/completable.js',
		)
		console.error(
			'🚨   3. Wrap your prompt argument schema with completable():',
		)
		console.error(
			'🚨      entryId: completable(z.string(), async (value) => { return ["1", "2", "3"] })',
		)
		console.error(
			'🚨   4. The completion callback should filter entries matching the partial value',
		)
		console.error('🚨   5. Return an array of valid completion strings')
		console.error(`🚨 Error details: ${error?.message || error}`)

		if (error?.code === -32601) {
			throw new Error(
				'🚨 Completion capability not declared - add "completion" to server capabilities and use completable() for prompt arguments',
			)
		} else if (error?.code === -32602) {
			throw new Error(
				'🚨 Completable arguments not implemented - wrap prompt arguments with completable() function',
			)
		} else {
			throw new Error(
				`🚨 Prompt argument completion not working - check capability declaration and completable() usage. ${error}`,
			)
		}
	}
})
