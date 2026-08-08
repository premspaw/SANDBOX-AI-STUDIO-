import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMCPServer } from '../mcp/mcpServer.js';
import { generateOpenAPISpec } from '../mcp/openapiSpec.js';
import { handleCinemaToolCall } from '../mcp/tools/cinemaTools.js';
import { handleUGCToolCall } from '../mcp/tools/ugcTools.js';
import { handleMarketingToolCall } from '../mcp/tools/marketingTools.js';

const router = express.Router();

// Active SSE transports map
const activeSseTransports = new Map();

// GET /api/mcp/sse — Remote SSE Connection endpoint for Claude Desktop & remote agents
router.get('/sse', async (req, res) => {
  try {
    const transport = new SSEServerTransport('/api/mcp/messages', res);
    const server = createMCPServer();

    activeSseTransports.set(transport.sessionId, { transport, server });

    transport.onclose = () => {
      activeSseTransports.delete(transport.sessionId);
    };

    await server.connect(transport);
  } catch (err) {
    console.error('[MCP SSE Error]:', err);
    if (!res.headersSent) {
      res.status(500).end('MCP SSE Connection Failed');
    }
  }
});

// POST /api/mcp/messages — Incoming message handler for SSE session
router.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId;
  const session = activeSseTransports.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'MCP SSE Session not found' });
  }

  await session.transport.handlePostMessage(req, res);
});

// GET /api/mcp/openapi.json — Expose OpenAPI spec for ChatGPT Custom GPT Actions
router.get('/openapi.json', (req, res) => {
  const protocol = req.protocol || 'https';
  const host = req.get('host') || 'zerolens.in';
  const baseUrl = `${protocol}://${host}`;
  
  const spec = generateOpenAPISpec(baseUrl);
  res.json(spec);
});

// POST /api/mcp/action/:toolName — Universal REST endpoint for ChatGPT Actions & HTTP clients
router.post('/action/:toolName', async (req, res) => {
  const { toolName } = req.params;
  const args = req.body || {};

  try {
    let result;
    if (toolName.startsWith('cinema_')) {
      result = await handleCinemaToolCall(toolName, args);
    } else if (toolName.startsWith('ugc_')) {
      result = await handleUGCToolCall(toolName, args);
    } else if (toolName.startsWith('marketing_')) {
      result = await handleMarketingToolCall(toolName, args);
    } else {
      return res.status(404).json({ error: `Unknown MCP tool action: ${toolName}` });
    }

    res.json(result);
  } catch (err) {
    console.error(`[MCP Action Error] ${toolName}:`, err);
    res.status(500).json({ error: err.message || 'Internal MCP tool error' });
  }
});

export default router;
