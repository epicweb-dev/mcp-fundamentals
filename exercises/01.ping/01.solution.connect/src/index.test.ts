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
	try {
		await client.connect(transport)
	} catch (error) {
		console.error(
			'🚨 Could not connect to MCP server. Have you created the server and connected it to the STDIO transport yet?',
		)
		throw error
	}
})

afterAll(async () => {
	await client.transport?.close()
})

test('Ping', async () => {
	const result = await client.ping()

	expect(result).toEqual({})
})
