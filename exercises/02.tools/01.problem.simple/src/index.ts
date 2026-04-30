import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

const server = new McpServer(
	{
		name: 'epicme',
		title: 'EpicMe',
		version: '1.0.0',
	},
	{
		// 🐨 add a capabilities object with a tools property that is an empty object
		instructions: 'This lets you solve math problems.',
	},
)

// 🐨 add a tool to the server with the server.registerTool API
// - the name should be 'add'
// - the config object should include a user-facing title and an llm-facing description explaining what it can be used to do (add one and two)
// - the config object should include an explicit empty inputSchema because this tool does not accept arguments
// - the callback should return a standard text response that says "The sum of 1 and 2 is 3."

async function main() {
	const transport = new StdioServerTransport()
	await server.connect(transport)
	console.error('EpicMe MCP Server running on stdio')
}

main().catch((error) => {
	console.error('Fatal error in main():', error)
	process.exit(1)
})
