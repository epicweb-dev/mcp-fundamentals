import { invariant } from '@epic-web/invariant'
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type EpicMeMCP } from './index.ts'

export async function initializeResources(agent: EpicMeMCP) {
	agent.server.registerResource(
		'tags',
		'epicme://tags',
		{
			title: 'Tags',
			description: 'All tags currently in the database',
		},
		async (uri) => {
			const tags = await agent.db.getTags()
			return {
				contents: [
					{
						mimeType: 'application/json',
						text: JSON.stringify(tags),
						uri: uri.toString(),
					},
				],
			}
		},
	)

	agent.server.registerResource(
		'tag',
		new ResourceTemplate('epicme://tags/{id}', {
			list: async () => {
				const tags = await agent.db.getTags()
				return {
					resources: tags.map((tag) => ({
						name: tag.name,
						uri: `epicme://tags/${tag.id}`,
						mimeType: 'application/json',
					})),
				}
			},
		}),
		{
			title: 'Tag',
			description: 'A single tag with the given ID',
		},
		async (uri, { id }) => {
			const tag = await agent.db.getTag(Number(id))
			invariant(tag, `Tag with ID "${id}" not found`)
			return {
				contents: [
					{
						mimeType: 'application/json',
						text: JSON.stringify(tag),
						uri: uri.toString(),
					},
				],
			}
		},
	)

	agent.server.registerResource(
		'entry',
		new ResourceTemplate('epicme://entries/{id}', {
			list: undefined,
		}),
		{
			title: 'Journal Entry',
			description: 'A single journal entry with the given ID',
		},
		async (uri, { id }) => {
			const entry = await agent.db.getEntry(Number(id))
			invariant(entry, `Entry with ID "${id}" not found`)
			return {
				contents: [
					{
						mimeType: 'application/json',
						text: JSON.stringify(entry),
						uri: uri.toString(),
					},
				],
			}
		},
	)
}
