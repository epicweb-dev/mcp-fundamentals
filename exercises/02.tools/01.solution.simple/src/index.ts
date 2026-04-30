import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

const server = new McpServer(
	{
		name: 'epicme',
		title: 'EpicMe',
		version: '1.0.0',
	},
	{
		capabilities: {
			tools: {},
		},
		instructions: 'This lets you solve math problems.',
	},
)

server.registerTool(
	'add',
	{
		title: 'Add',
		description: 'Add one and two',
		inputSchema: {},
	},
	async () => {
		return {
			content: [
				{
					type: 'text',
					text: `The sum of 1 and 2 is 3.`,
				},
			],
		}
	},
)

async function main() {
	const transport = new StdioServerTransport()
	await server.connect(transport)
	console.error('EpicMe MCP Server running on stdio')
}

main().catch((error) => {
	console.error('Fatal error in main():', error)
	process.exit(1)
})
