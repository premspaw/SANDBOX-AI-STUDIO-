/**
 * Backward compatibility alias for server/mcp/server.js
 */
import { createZeroLensMcpServer } from './server.js';

export function createMCPServer() {
  return createZeroLensMcpServer();
}

export { createZeroLensMcpServer };
