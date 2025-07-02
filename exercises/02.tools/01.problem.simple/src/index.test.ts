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
	try {
		const list = await client.listTools()
		const [firstTool] = list.tools
		invariant(firstTool, '🚨 No tools found')

		expect(firstTool).toEqual(
			expect.objectContaining({
				name: expect.stringMatching(/^add$/i),
				description: expect.stringMatching(/add/i),
				inputSchema: expect.objectContaining({
					type: 'object',
				}),
			}),
		)
	} catch (error: any) {
		if (error.code === -32601) {
			console.error('🚨 Tools capability not implemented!')
			console.error('🚨 This exercise requires registering tools with the MCP server')
			console.error('🚨 You need to: 1) Add tools: {} to server capabilities, 2) Register an "add" tool in initializeTools()')
			console.error('🚨 Check src/tools.ts and make sure you implement the "add" tool')
			const enhancedError = new Error('🚨 Tools capability required. Register an "add" tool that hardcodes 1 + 2 = 3. ' + (error.message || error))
			enhancedError.stack = error.stack
			throw enhancedError
		}
		throw error
	}
})

test('Tool Call', async () => {
	try {
		const result = await client.callTool({
			name: 'add',
			arguments: {},
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
	} catch (error: any) {
		if (error.code === -32601) {
			console.error('🚨 Tool call failed - tools capability not implemented!')
			console.error('🚨 This means you haven\'t registered the "add" tool properly')
			console.error('🚨 In src/tools.ts, use agent.server.registerTool() to create a simple "add" tool')
			console.error('🚨 The tool should return "1 + 2 = 3" (hardcoded for this simple exercise)')
			const enhancedError = new Error('🚨 "add" tool registration required. ' + (error.message || error))
			enhancedError.stack = error.stack
			throw enhancedError
		}
		throw error
	}
})
