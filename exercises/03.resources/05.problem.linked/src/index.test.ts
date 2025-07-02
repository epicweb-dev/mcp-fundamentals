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

test('Resource Link in Tool Response', async () => {
	try {
		const result = await client.callTool({
			name: 'create_entry',
			arguments: {
				title: 'Linked Entry Test',
				content: 'This entry should be linked as a resource',
			},
		})

		// 🚨 The key learning objective: Tool responses should include resource_link content
		// when creating resources, not just text confirmations
		
		// Type guard for content array
		const content = result.content as Array<any>
		invariant(Array.isArray(content), '🚨 Tool response content must be an array')
		
		// Check if response includes resource_link content type
		const hasResourceLink = content.some((item: any) => 
			item.type === 'resource_link'
		)
		
		if (!hasResourceLink) {
			throw new Error('Tool response should include resource_link content type')
		}
		
		// Find the resource_link content
		const resourceLink = content.find((item: any) => 
			item.type === 'resource_link'
		) as any
		
		// 🚨 Proactive checks: Resource link should have proper structure
		invariant(resourceLink, '🚨 Tool response should include resource_link content type')
		invariant(resourceLink.uri, '🚨 Resource link must have uri field')
		invariant(resourceLink.name, '🚨 Resource link must have name field')
		invariant(typeof resourceLink.uri === 'string', '🚨 Resource link uri must be a string')
		invariant(typeof resourceLink.name === 'string', '🚨 Resource link name must be a string')
		invariant(resourceLink.uri.includes('entries'), '🚨 Resource link URI should reference the created entry')
		
		expect(resourceLink).toEqual(
			expect.objectContaining({
				type: 'resource_link',
				uri: expect.stringMatching(/epicme:\/\/entries\/\d+/),
				name: expect.stringMatching(/Linked Entry Test/),
				description: expect.any(String),
				mimeType: expect.stringMatching(/application\/json/),
			}),
		)
		
	} catch (error) {
		console.error('🚨 Resource linking not implemented in tool responses!')
		console.error('🚨 This exercise teaches you how to include resource links in tool responses')
		console.error('🚨 You need to:')
		console.error('🚨   1. When your tool creates a resource, include a resource_link content item')
		console.error('🚨   2. Set type: "resource_link" in the response content')
		console.error('🚨   3. Include uri, name, description, and mimeType fields')
		console.error('🚨   4. The URI should point to the created resource (e.g., epicme://entries/1)')
		console.error('🚨 Example: { type: "resource_link", uri: "epicme://entries/1", name: "My Entry", description: "...", mimeType: "application/json" }')
		throw new Error(`🚨 Tool should include resource_link content type when creating resources. ${error}`)
	}
})
