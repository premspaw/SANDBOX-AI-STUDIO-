#!/usr/bin/env node

/**
 * 🚀 SANDBOX AI Studio - MCP STDIO Server Entrypoint
 * Used by Claude Desktop, Cursor, and local AI agent clients.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from './mcpServer.js';

async function main() {
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 SANDBOX AI Studio MCP Server listening on STDIO');
}

main().catch((err) => {
  console.error('Fatal error starting MCP STDIO server:', err);
  process.exit(1);
});
