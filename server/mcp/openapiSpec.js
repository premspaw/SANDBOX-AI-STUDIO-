/**
 * 🌐 Dynamic OpenAPI 3.0 Specification Generator for ChatGPT Custom GPT Actions
 * Automatically converts all registered ZeroLens MCP tools into OpenAPI 3.0 endpoints
 * with OAuth 2.0 and Bearer Auth security definitions.
 */

import { getAllMcpTools } from './server.js';
import { registerCinemaTools } from './tools/cinemaTools.js';
import { registerUGCTools } from './tools/ugcTools.js';
import { registerMarketingTools } from './tools/marketingTools.js';

export function generateOpenAPISpec(baseUrl = (process.env.PUBLIC_APP_URL || 'https://zerolens.in')) {
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');

  // Core ZeroLens ChatGPT tools + legacy tools
  const allTools = [
    ...getAllMcpTools(),
    ...registerCinemaTools(),
    ...registerUGCTools(),
    ...registerMarketingTools()
  ];

  // Deduplicate tools by name
  const seenNames = new Set();
  const uniqueTools = allTools.filter(t => {
    if (seenNames.has(t.name)) return false;
    seenNames.add(t.name);
    return true;
  });

  const paths = {};

  uniqueTools.forEach(tool => {
    const pathName = `/api/mcp/action/${tool.name}`;
    paths[pathName] = {
      post: {
        summary: tool.description,
        operationId: tool.name,
        security: [
          { OAuth2: ['generate_image', 'generate_video', 'check_generation', 'list_projects', 'get_usage'] },
          { BearerAuth: [] }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: tool.inputSchema || { type: 'object' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Successful tool execution result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    content: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          type: { type: 'string' },
                          text: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': { description: 'Bad Request - Invalid input parameters' },
          '401': { description: 'Unauthorized - Missing or invalid Bearer token' },
          '402': { description: 'Payment Required - Insufficient Shorts credits' },
          '500': { description: 'Internal tool execution error' }
        }
      }
    };
  });

  return {
    openapi: '3.0.1',
    info: {
      title: 'ZeroLens AI Studio API for ChatGPT',
      description: 'ZeroLens image and cinematic video generation tools, project management, and credit tracking for ChatGPT Apps & OpenAI Actions.',
      version: '2.0.0',
      contact: {
        name: 'ZeroLens Support',
        url: 'https://zerolens.in'
      }
    },
    servers: [
      {
        url: cleanBaseUrl,
        description: 'ZeroLens Production Server'
      }
    ],
    components: {
      securitySchemes: {
        OAuth2: {
          type: 'oauth2',
          description: 'ZeroLens OAuth 2.0 Authorization Code Grant for ChatGPT App',
          flows: {
            authorizationCode: {
              authorizationUrl: `${cleanBaseUrl}/api/mcp/auth/authorize`,
              tokenUrl: `${cleanBaseUrl}/api/mcp/auth/token`,
              scopes: {
                'generate_image': 'Generate AI images using ZeroLens models',
                'generate_video': 'Render cinematic AI videos',
                'check_generation': 'Check status and retrieve rendered assets',
                'list_projects': 'Access user projects and folders',
                'get_usage': 'View account tier and credit balance'
              }
            }
          }
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'ZeroLens API Access Token or Supabase session JWT'
        }
      }
    },
    security: [
      { OAuth2: [] },
      { BearerAuth: [] }
    ],
    paths
  };
}
