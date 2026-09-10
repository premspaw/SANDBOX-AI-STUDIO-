import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createZeroLensMcpServer, dispatchMcpToolCall, getAllMcpTools } from '../mcp/server.js';
import { generateOpenAPISpec } from '../mcp/openapiSpec.js';
import { resolveMcpUser } from '../mcp/auth/mcpAuthMiddleware.js';
import {
  handleAuthorizeGet,
  handleAuthorizePost,
  handleTokenPost,
  handleUserInfoGet
} from '../mcp/auth/oauthHandler.js';
import { renderWidgetHtml } from '../mcp/ui/widgetRenderer.js';

export default function createMcpRouter(deps = {}) {
  const router = express.Router();

  // Active SSE transports map (for session-based SSE connections)
  const activeSseTransports = new Map();

  // Parse URL-encoded bodies for OAuth form submissions
  router.use(express.urlencoded({ extended: true }));

  // ─────────────────────────────────────────────────────────────
  // 1. STREAMABLE HTTP ENDPOINT (Official OpenAI Apps Architecture)
  // ─────────────────────────────────────────────────────────────
  router.post('/', async (req, res) => {
    try {
      const user = await resolveMcpUser(req, deps);

      if (!user) {
        res.setHeader('WWW-Authenticate', 'Bearer realm="ZeroLens", error="invalid_token"');
        return res.status(401).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Unauthorized: Valid ZeroLens OAuth Bearer token or Supabase session required.'
          },
          id: req.body?.id ?? null
        });
      }

      // Create an MCP server instance scoped to this authenticated user
      const server = createZeroLensMcpServer(user, deps);
      const transport = new StreamableHTTPServerTransport({
        endpoint: '/api/mcp'
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error('[MCP Streamable HTTP Error]:', err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: `Internal server error: ${err.message}` },
          id: req.body?.id ?? null
        });
      }
    }
  });

  // Alias for clients explicitly asking for /streamable
  router.post('/streamable', async (req, res) => {
    return router.handle(Object.assign(req, { url: '/' }), res);
  });

  // ─────────────────────────────────────────────────────────────
  // 2. REMOTE SSE ENDPOINTS (Backward Compatibility)
  // ─────────────────────────────────────────────────────────────
  router.get('/sse', async (req, res) => {
    try {
      const user = await resolveMcpUser(req, deps);
      const transport = new SSEServerTransport('/api/mcp/messages', res);
      const server = createZeroLensMcpServer(user, deps);

      activeSseTransports.set(transport.sessionId, { transport, server, user });

      transport.onclose = () => {
        activeSseTransports.delete(transport.sessionId);
      };

      await server.connect(transport);
      console.log(`[MCP SSE] Connected session: ${transport.sessionId} (User: ${user?.email || 'anon'})`);
    } catch (err) {
      console.error('[MCP SSE Error]:', err);
      if (!res.headersSent) {
        res.status(500).end('MCP SSE Connection Failed');
      }
    }
  });

  router.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId;
    const session = activeSseTransports.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'MCP SSE Session not found' });
    }

    await session.transport.handlePostMessage(req, res);
  });

  // ─────────────────────────────────────────────────────────────
  // 3. OAUTH 2.0 ENDPOINTS (For ChatGPT App Installation & Auth)
  // ─────────────────────────────────────────────────────────────
  router.get('/auth/authorize', async (req, res) => {
    await handleAuthorizeGet(req, res, deps);
  });

  router.post('/auth/authorize', async (req, res) => {
    await handleAuthorizePost(req, res, deps);
  });

  router.post('/auth/token', async (req, res) => {
    await handleTokenPost(req, res, deps);
  });

  router.get('/auth/userinfo', async (req, res) => {
    const user = await resolveMcpUser(req, deps);
    await handleUserInfoGet(req, res, user);
  });

  // ─────────────────────────────────────────────────────────────
  // 4. EMBEDDED UI WIDGET (For ChatGPT Canvas / Iframe Rendering)
  // ─────────────────────────────────────────────────────────────
  router.get('/ui/widget', (req, res) => {
    const {
      id = '',
      type = 'image',
      status = 'completed',
      url = '',
      prompt = '',
      model = 'ZeroLens AI',
      progress,
      error
    } = req.query;

    const appBaseUrl = `${req.protocol}://${req.get('host') || 'zerolens.in'}`;
    const html = renderWidgetHtml({
      generationId: id,
      type,
      status,
      progress: progress ? Number(progress) : null,
      resultUrl: url,
      prompt,
      model,
      error,
      appBaseUrl
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'ALLOWALL'); // Allow embedding in ChatGPT canvas
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    res.send(html);
  });

  // ─────────────────────────────────────────────────────────────
  // 5. OPENAPI SPEC & TOOL LIST (For ChatGPT Custom GPT Actions)
  // ─────────────────────────────────────────────────────────────
  router.get('/openapi.json', (req, res) => {
    const protocol = req.protocol || 'https';
    const host = req.get('host') || 'zerolens.in';
    const baseUrl = `${protocol}://${host}`;

    const spec = generateOpenAPISpec(baseUrl);
    res.json(spec);
  });

  router.get('/tools', (req, res) => {
    res.json({
      tools: getAllMcpTools()
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. VERTEX AI MCP DIRECT STUDIO ASSISTANTS
  // ─────────────────────────────────────────────────────────────
  router.post('/enhance-prompt', async (req, res) => {
    try {
      const { prompt, style, engine, aspectRatio } = req.body;
      const { enhancePromptWithMcp } = await import('../services/vertexMcpService.js');
      const enhanced = await enhancePromptWithMcp({ prompt, style, engine, aspectRatio });
      res.json({ success: true, original: prompt, enhancedPrompt: enhanced });
    } catch (err) {
      console.error('[Vertex MCP Enhance Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/generate-shotlist', async (req, res) => {
    try {
      const { idea, sceneCount, aspectRatio, style } = req.body;
      const { generateShotlistWithMcp } = await import('../services/vertexMcpService.js');
      const shotlist = await generateShotlistWithMcp({ idea, sceneCount, aspectRatio, style });
      res.json({ success: true, shotlist });
    } catch (err) {
      console.error('[Vertex MCP Shotlist Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/count-tokens', async (req, res) => {
    try {
      const { text, model } = req.body;
      const { countTokensWithMcp } = await import('../services/vertexMcpService.js');
      const tokenStats = await countTokensWithMcp(text, model);
      res.json({ success: true, ...tokenStats });
    } catch (err) {
      console.error('[Vertex MCP Count Tokens Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

