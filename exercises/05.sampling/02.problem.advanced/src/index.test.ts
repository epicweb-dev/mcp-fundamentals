import fs from 'node:fs/promises'
import path from 'node:path'
import { invariant } from '@epic-web/invariant'
import { faker } from '@faker-js/faker'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import {
	CreateMessageRequestSchema,
	type CreateMessageResult,
} from '@modelcontextprotocol/sdk/types.js'
import { test, beforeAll, afterAll, expect } from 'vitest'
import { type z } from 'zod'

let client: Client
const EPIC_ME_DB_PATH = `./test.ignored/db.${process.env.VITEST_WORKER_ID}.sqlite`

beforeAll(async () => {
	const dir = path.dirname(EPIC_ME_DB_PATH)
	await fs.mkdir(dir, { recursive: true })
	client = new Client(
		{
			name: 'EpicMeTester',
			version: '1.0.0',
		},
		{
			capabilities: {
				sampling: {},
			},
		},
	)
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

async function deferred<ResolvedValue>() {
	const ref = {} as {
		promise: Promise<ResolvedValue>
		resolve: (value: ResolvedValue) => void
		reject: (reason?: any) => void
		value: ResolvedValue | undefined
		reason: any | undefined
	}
	ref.promise = new Promise<ResolvedValue>((resolve, reject) => {
		ref.resolve = (value) => {
			ref.value = value
			resolve(value)
		}
		ref.reject = (reason) => {
			ref.reason = reason
			reject(reason)
		}
	})

	return ref
}

test('Sampling', async () => {
	const messageResultDeferred = await deferred<CreateMessageResult>()
	const messageRequestDeferred =
		await deferred<z.infer<typeof CreateMessageRequestSchema>>()

	client.setRequestHandler(CreateMessageRequestSchema, (r) => {
		messageRequestDeferred.resolve(r)
		return messageResultDeferred.promise
	})

	const fakeTag1 = {
		name: faker.lorem.word(),
		description: faker.lorem.sentence(),
	}
	const fakeTag2 = {
		name: faker.lorem.word(),
		description: faker.lorem.sentence(),
	}

	const result = await client.callTool({
		name: 'create_tag',
		arguments: fakeTag1,
	})
	const tag1Resource = (result.content as any).find(
		(c: any) => c.type === 'resource',
	)?.resource
	invariant(tag1Resource, '🚨 No tag1 resource found')
	const newTag1 = JSON.parse(tag1Resource.text) as any
	invariant(newTag1.id, '🚨 No new tag1 found')

	const entry = {
		title: faker.lorem.words(3),
		content: faker.lorem.paragraphs(2),
	}
	await client.callTool({
		name: 'create_entry',
		arguments: entry,
	})
	const request = await messageRequestDeferred.promise

	expect(request).toEqual(
		expect.objectContaining({
			method: 'sampling/createMessage',
			params: expect.objectContaining({
				maxTokens: expect.any(Number),
				systemPrompt: expect.stringMatching(/example/i),
				messages: expect.arrayContaining([
					expect.objectContaining({
						role: 'user',
						content: expect.objectContaining({
							type: 'text',
							text: expect.stringMatching(/entry/i),
							mimeType: 'application/json',
						}),
					}),
				]),
			}),
		}),
	)

	// 🚨 Proactive checks for advanced sampling requirements
	const params = request.params
	invariant(params && 'maxTokens' in params, '🚨 maxTokens parameter is required')
	invariant(params.maxTokens > 50, '🚨 maxTokens should be increased for longer responses (>50)')
	
	invariant(params && 'systemPrompt' in params, '🚨 systemPrompt is required')
	invariant(typeof params.systemPrompt === 'string', '🚨 systemPrompt must be a string')
	
	invariant(params && 'messages' in params && Array.isArray(params.messages), '🚨 messages array is required')
	const userMessage = params.messages.find(m => m.role === 'user')
	invariant(userMessage, '🚨 User message is required')
	invariant(userMessage.content.mimeType === 'application/json', '🚨 Content should be JSON for structured data')
	
	// 🚨 Validate the JSON structure contains required fields
	invariant(typeof userMessage.content.text === 'string', '🚨 User message content text must be a string')
	let messageData: any
	try {
		messageData = JSON.parse(userMessage.content.text)
	} catch (error) {
		throw new Error('🚨 User message content must be valid JSON')
	}
	
	invariant(messageData.entry, '🚨 JSON should contain entry data')
	invariant(messageData.existingTags, '🚨 JSON should contain existingTags for context')
	invariant(Array.isArray(messageData.existingTags), '🚨 existingTags should be an array')

	messageResultDeferred.resolve({
		model: 'stub-model',
		stopReason: 'endTurn',
		role: 'assistant',
		content: {
			type: 'text',
			text: JSON.stringify([{ id: newTag1.id }, fakeTag2]),
		},
	})

	// give the server a chance to process the result
	await new Promise((resolve) => setTimeout(resolve, 100))
})
