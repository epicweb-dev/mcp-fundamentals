import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

const server = new McpServer(
	{
		name: 'epicme',
		title: 'EpicMe',
		version: '1.0.0',
		description: 'A learning MCP server for the EpicMe journal app.',
		websiteUrl: 'https://www.epicai.pro',
		icons: [
			{
				src: 'https://www.epicai.pro/favicon.svg',
				mimeType: 'image/svg+xml',
			},
		],
	},
	{
		instructions: 'This lets you solve math problems.',
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
