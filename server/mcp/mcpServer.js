import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { registerCinemaTools, handleCinemaToolCall } from './tools/cinemaTools.js';
import { registerUGCTools, handleUGCToolCall } from './tools/ugcTools.js';
import { registerMarketingTools, handleMarketingToolCall } from './tools/marketingTools.js';

export function createMCPServer() {
  const server = new Server(
    {
      name: 'sandbox-ai-studio-mcp',
      version: '2.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List all registered tools across Cinema, UGC, and Marketing Studios
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        ...registerCinemaTools(),
        ...registerUGCTools(),
        ...registerMarketingTools()
      ]
    };
  });

  // Dispatch tool calls to respective handlers
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name.startsWith('cinema_')) {
        return await handleCinemaToolCall(name, args || {});
      } else if (name.startsWith('ugc_')) {
        return await handleUGCToolCall(name, args || {});
      } else if (name.startsWith('marketing_')) {
        return await handleMarketingToolCall(name, args || {});
      }

      throw new Error(`Unknown tool requested: ${name}`);
    } catch (err) {
      console.error(`[MCP Tool Error] ${name}:`, err);
      return {
        content: [{ type: 'text', text: `Error executing ${name}: ${err.message}` }],
        isError: true
      };
    }
  });

  return server;
}
