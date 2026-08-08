/**
 * 🌐 Dynamic OpenAPI Specification Generator for ChatGPT Custom GPT Actions
 * Automatically converts all registered MCP tools into OpenAPI 3.0 endpoints.
 */

import { registerCinemaTools } from './tools/cinemaTools.js';
import { registerUGCTools } from './tools/ugcTools.js';
import { registerMarketingTools } from './tools/marketingTools.js';

export function generateOpenAPISpec(baseUrl = (process.env.PUBLIC_APP_URL || 'https://zerolens.in')) {
  const allTools = [
    ...registerCinemaTools(),
    ...registerUGCTools(),
    ...registerMarketingTools()
  ];

  const paths = {};

  allTools.forEach(tool => {
    const pathName = `/api/mcp/action/${tool.name}`;
    paths[pathName] = {
      post: {
        summary: tool.description,
        operationId: tool.name,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: tool.inputSchema
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
          }
        }
      }
    };
  });

  return {
    openapi: '3.0.0',
    info: {
      title: 'SANDBOX AI Studio MCP Action Gateway API',
      description: 'OpenAPI interface exposing Cinema Studio, UGC Studio, and Marketing Studio capabilities for ChatGPT Custom GPT Actions.',
      version: '2.0.0'
    },
    servers: [
      {
        url: baseUrl,
        description: 'SANDBOX Studio Backend Server'
      }
    ],
    paths
  };
}
