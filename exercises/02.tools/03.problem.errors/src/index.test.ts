import { invariant } from '@epic-web/invariant'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { test, beforeAll, afterAll, expect } from 'vitest'

let client: Client

beforeAll(async () => {
	client = new Client({
		name: 'EpicMeTester',
		version: '1.0.0',
	})
	const transport = new StdioClientTransport({
		command: 'tsx',
		args: ['src/index.ts'],
	})
	await client.connect(transport)
})

afterAll(async () => {
	await client.transport?.close()
})

test('Tool Definition', async () => {
	const list = await client.listTools()
	const [firstTool] = list.tools
	invariant(firstTool, '🚨 No tools found')

	expect(firstTool).toEqual(
		expect.objectContaining({
			name: expect.stringMatching(/^add$/i),
			description: expect.stringMatching(/^add two numbers$/i),
			inputSchema: expect.objectContaining({
				type: 'object',
				properties: expect.objectContaining({
					firstNumber: expect.objectContaining({
						type: 'number',
						description: expect.stringMatching(/first/i),
					}),
					secondNumber: expect.objectContaining({
						type: 'number',
						description: expect.stringMatching(/second/i),
					}),
				}),
				required: expect.arrayContaining(['firstNumber', 'secondNumber']),
			}),
		}),
	)
	
	// 🚨 Proactive check: Ensure the tool schema includes both required arguments
	invariant(
		firstTool.inputSchema?.properties?.firstNumber,
		'🚨 Tool must have firstNumber parameter defined'
	)
	invariant(
		firstTool.inputSchema?.properties?.secondNumber,
		'🚨 Tool must have secondNumber parameter defined'
	)
})

test('Tool Call - Successful Addition', async () => {
	const result = await client.callTool({
		name: 'add',
		arguments: {
			firstNumber: 1,
			secondNumber: 2,
		},
	})

	expect(result).toEqual(
		expect.objectContaining({
			content: expect.arrayContaining([
				expect.objectContaining({
					type: 'text',
					text: expect.stringMatching(/3/),
				}),
			]),
		}),
	)
})

test('Tool Call - Error with Negative Second Number', async () => {
	const result = await client.callTool({
		name: 'add',
		arguments: {
			firstNumber: 5,
			secondNumber: -3,
		},
	})

	try {
		expect(result).toEqual(
			expect.objectContaining({
				content: expect.arrayContaining([
					expect.objectContaining({
						type: 'text',
						text: expect.stringMatching(/negative/i),
					}),
				]),
				isError: true,
			}),
		)
	} catch (error) {
		console.error('🚨 Tool error handling not properly implemented!')
		console.error('🚨 This exercise teaches you how to handle errors in MCP tools')
		console.error('🚨 Expected: Tool should return isError: true with message about negative numbers')
		console.error(`🚨 Actual: Tool returned normal response: ${JSON.stringify(result, null, 2)}`)
		console.error('🚨 You need to:')
		console.error('🚨   1. Check if secondNumber is negative in your add tool')
		console.error('🚨   2. Throw an Error with message containing "negative"')
		console.error('🚨   3. The MCP SDK will automatically set isError: true')
		console.error('🚨 In src/index.ts, add: if (secondNumber < 0) throw new Error("Second number cannot be negative")')
		throw new Error(`🚨 Tool should return error response when secondNumber is negative, but returned normal response instead. ${error}`)
	}
})

test('Tool Call - Another Successful Addition', async () => {
	const result = await client.callTool({
		name: 'add',
		arguments: {
			firstNumber: 10,
			secondNumber: 5,
		},
	})

	expect(result).toEqual(
		expect.objectContaining({
			content: expect.arrayContaining([
				expect.objectContaining({
					type: 'text',
					text: expect.stringMatching(/15/),
				}),
			]),
		}),
	)
})
