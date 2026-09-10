import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { createZeroLensMcpServer, getAllMcpTools, dispatchMcpToolCall } from '../server.js';
import { generateAccessToken, verifyAccessToken } from '../auth/oauthHandler.js';
import { resolveMcpUser } from '../auth/mcpAuthMiddleware.js';
import { renderWidgetHtml } from '../ui/widgetRenderer.js';

describe('ZeroLens OpenAI App / MCP Test Suite', () => {

  // Mock dependencies object replicating ZeroLens backend environment
  const mockUser = {
    id: 'test-user-12345-uuid',
    email: 'creator@zerolens.in',
    role: 'authenticated'
  };

  let mockShortsBalance = 100;
  const mockTransactions = [];
  const mockAssets = [];
  const mockJobStatuses = new Map();

  const mockDeps = {
    supabaseAdmin: {
      from: (tableName) => ({
        select: (cols, opts) => ({
          eq: (col, val) => ({
            maybeSingle: async () => {
              if (tableName === 'profiles') {
                return { data: { shorts_balance: mockShortsBalance, tier: 'PRO' } };
              }
              if (tableName === 'assets') {
                const found = mockAssets.find(a => a[col] === val);
                return { data: found || null };
              }
              return { data: null };
            },
            single: async () => {
              if (tableName === 'profiles') {
                return { data: { shorts_balance: mockShortsBalance, tier: 'PRO' } };
              }
              const found = mockAssets.find(a => a[col] === val);
              return { data: found || null };
            },
            order: () => ({
              limit: async (n) => {
                if (tableName === 'assets') {
                  return { data: mockAssets.filter(a => a.user_id === val).slice(0, n), error: null };
                }
                if (tableName === 'shorts_transactions') {
                  return { data: mockTransactions.filter(t => t.user_id === val).slice(0, n), error: null };
                }
                return { data: [], error: null };
              }
            })
          }),
          order: () => ({
            limit: async () => ({ data: [], error: null })
          })
        }),
        insert: async (rows) => {
          if (tableName === 'shorts_transactions') {
            mockTransactions.push(...rows);
          }
          if (tableName === 'assets') {
            mockAssets.push(...rows);
          }
          return { data: rows, error: null };
        },
        update: (fields) => ({
          eq: async (col, val) => {
            if (tableName === 'profiles' && fields.shorts_balance !== undefined) {
              mockShortsBalance = fields.shorts_balance;
            }
            return { error: null };
          }
        })
      })
    },
    consumeCredits: async (userId, cost, reason) => {
      if (mockShortsBalance < cost) {
        throw new Error('Insufficient credits');
      }
      mockShortsBalance -= cost;
      mockTransactions.push({ user_id: userId, amount: -cost, reason, created_at: new Date().toISOString() });
      return true;
    },
    updateJobStatus: async (jobId, state, data, error) => {
      mockJobStatuses.set(jobId, { state, ...data, error });
    },
    getJobStatus: async (jobId) => {
      return mockJobStatuses.get(jobId) || null;
    },
    handleGoogle: async (req, res) => {
      const url = `https://zerolensbucket-cdn.r2.cloudflarestorage.com/generated/test_image_${Date.now()}.png`;
      mockAssets.push({
        id: `asset_${Date.now()}`,
        url,
        user_id: req.body.userId,
        name: 'test_image.png',
        created_at: new Date().toISOString(),
        metadata: { prompt: req.body.prompt, projectId: req.body.projectId }
      });
      return res.json({ url });
    },
    handleOpenAI: async (req, res) => {
      const url = `https://zerolensbucket-cdn.r2.cloudflarestorage.com/generated/openai_test_${Date.now()}.png`;
      return res.json({ url });
    }
  };

  // 1. MCP Initialization
  it('1. MCP Initialization: creates an MCP server instance with valid capabilities', () => {
    const server = createZeroLensMcpServer(mockUser, mockDeps);
    assert.ok(server, 'Server instance should be created');
  });

  // 2. Tool Discovery
  it('2. Tool Discovery: advertises all 6 required ZeroLens tools with valid schemas', () => {
    const tools = getAllMcpTools();
    const toolNames = tools.map(t => t.name);

    assert.ok(toolNames.includes('generate_image'), 'Should include generate_image');
    assert.ok(toolNames.includes('generate_video'), 'Should include generate_video');
    assert.ok(toolNames.includes('check_generation'), 'Should include check_generation');
    assert.ok(toolNames.includes('list_projects'), 'Should include list_projects');
    assert.ok(toolNames.includes('get_project'), 'Should include get_project');
    assert.ok(toolNames.includes('get_usage'), 'Should include get_usage');

    // Verify schemas
    const imgTool = tools.find(t => t.name === 'generate_image');
    assert.equal(imgTool.inputSchema.type, 'object');
    assert.ok(imgTool.inputSchema.required.includes('prompt'));

    const vidTool = tools.find(t => t.name === 'generate_video');
    assert.equal(vidTool.inputSchema.type, 'object');
    assert.ok(vidTool.inputSchema.required.includes('prompt'));
  });

  // 3. generate_image validation and execution
  it('3. generate_image: rejects invalid prompt and succeeds with valid prompt', async () => {
    // Empty prompt should fail
    await assert.rejects(
      async () => {
        await dispatchMcpToolCall('generate_image', { prompt: '' }, mockUser, mockDeps);
      },
      /Missing or empty prompt/
    );

    const initialBalance = mockShortsBalance;
    const res = await dispatchMcpToolCall('generate_image', {
      prompt: 'Cinematic shot of neon cyberpunk metropolis at night',
      aspect_ratio: '16:9',
      model: 'nano-banana-2',
      image_count: 1
    }, mockUser, mockDeps);

    assert.equal(res.status, 'completed');
    assert.ok(res.urls.length === 1);
    assert.ok(res.urls[0].startsWith('https://'));
    assert.equal(res.credits_used, 1);
    assert.equal(mockShortsBalance, initialBalance - 1);
    assert.ok(res.preview_html.includes('ZeroLens Studio Preview'));
  });

  // 4. generate_video validation and async dispatch
  it('4. generate_video: dispatches async job, deducts credits, and returns processing status', async () => {
    const initialBalance = mockShortsBalance;
    const res = await dispatchMcpToolCall('generate_video', {
      prompt: 'Dramatic drone sweep through volcanic mountain ridge',
      engine: 'seedance-fast',
      aspect_ratio: '16:9',
      duration: 5
    }, mockUser, mockDeps);

    assert.equal(res.status, 'processing');
    assert.ok(res.generation_id.startsWith('gen_vid_'));
    assert.equal(res.credits_used, 10);
    assert.equal(mockShortsBalance, initialBalance - 10);
    assert.ok(res.check_instructions.includes('check_generation'));
    assert.ok(res.embedded_ui_url.includes('/api/mcp/ui/widget'));
  });

  // 5. Authentication and Authorization
  it('5. Auth: correctly signs and validates OAuth tokens; rejects invalid tokens', () => {
    const token = generateAccessToken({ sub: mockUser.id, email: mockUser.email, role: mockUser.role });
    assert.ok(token && typeof token === 'string');

    const verified = verifyAccessToken(token);
    assert.ok(verified);
    assert.equal(verified.sub, mockUser.id);
    assert.equal(verified.email, mockUser.email);

    // Invalid token
    const invalid = verifyAccessToken('invalid.token.here');
    assert.equal(invalid, null);

    // Tampered token
    const tampered = token.slice(0, -5) + 'xxxxx';
    assert.equal(verifyAccessToken(tampered), null);
  });

  // 6. check_generation status handling
  it('6. check_generation: reports status from job system and renders completed widget', async () => {
    const testJobId = 'test_vid_status_job_1';
    mockJobStatuses.set(testJobId, {
      state: 'completed',
      url: 'https://zerolensbucket-cdn.r2.cloudflarestorage.com/generated/test_video.mp4',
      progress: 1.0,
      engine: 'Seedance Fast'
    });

    const res = await dispatchMcpToolCall('check_generation', {
      generation_id: testJobId
    }, mockUser, mockDeps);

    assert.equal(res.status, 'completed');
    assert.equal(res.progress, 1.0);
    assert.ok(res.result_url.endsWith('.mp4'));
    assert.ok(res.preview_html.includes('<video'));
  });

  // 7. list_projects and get_project
  it('7. Project tools: lists projects and retrieves project assets', async () => {
    const listRes = await dispatchMcpToolCall('list_projects', { limit: 10 }, mockUser, mockDeps);
    assert.ok(Array.isArray(listRes.projects));
    assert.ok(listRes.projects.some(p => p.id === 'default'));

    const projRes = await dispatchMcpToolCall('get_project', { project_id: 'default' }, mockUser, mockDeps);
    assert.equal(projRes.project_id, 'default');
    assert.ok(Array.isArray(projRes.assets));
  });

  // 8. get_usage
  it('8. get_usage: returns accurate account balance, tier, and transaction history', async () => {
    const res = await dispatchMcpToolCall('get_usage', {}, mockUser, mockDeps);
    assert.equal(res.user_id, mockUser.id);
    assert.equal(res.tier, 'PRO');
    assert.equal(res.shorts_balance, mockShortsBalance);
    assert.ok(Array.isArray(res.recent_transactions));
  });

  // 9. Upstream generation failure & automatic credit refund
  it('9. Upstream failure: catches engine errors gracefully and refunds deducted credits', async () => {
    const initialBalance = mockShortsBalance;
    const failingDeps = {
      ...mockDeps,
      handleGoogle: async () => {
        throw new Error('Upstream Vertex AI Quota Exceeded');
      }
    };

    await assert.rejects(
      async () => {
        await dispatchMcpToolCall('generate_image', {
          prompt: 'A portrait of an astronaut',
          model: 'nano-banana-2'
        }, mockUser, failingDeps);
      },
      /Vertex AI Quota Exceeded/
    );

    // Balance must be refunded back to initial
    assert.equal(mockShortsBalance, initialBalance);
  });

  // 10. Embedded UI Widget Renderer
  it('10. Embedded UI Widget: generates valid, accessible HTML for images and videos', () => {
    const imageHtml = renderWidgetHtml({
      generationId: 'img_test_1',
      type: 'image',
      status: 'completed',
      resultUrl: 'https://example.com/test.jpg',
      prompt: 'A golden retriever'
    });
    assert.ok(imageHtml.includes('<img'));
    assert.ok(imageHtml.includes('Open in ZeroLens'));

    const videoHtml = renderWidgetHtml({
      generationId: 'vid_test_1',
      type: 'video',
      status: 'completed',
      resultUrl: 'https://example.com/test.mp4',
      prompt: 'A dynamic drone flight'
    });
    assert.ok(videoHtml.includes('<video'));
    assert.ok(videoHtml.includes('Open in ZeroLens'));
  });

});
