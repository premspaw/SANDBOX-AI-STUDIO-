#!/usr/bin/env node

/**
 * 🚀 ZeroLens Studio - MCP STDIO Server Entrypoint
 * Used by Claude Desktop, Cursor, Antigravity IDE, and local CLI agents.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createZeroLensMcpServer } from './server.js';

async function main() {
  const server = createZeroLensMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 ZeroLens MCP Server listening on STDIO');
}

main().catch((err) => {
  console.error('Fatal error starting MCP STDIO server:', err);
  process.exit(1);
});
