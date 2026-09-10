/**
 * 🚀 ZeroLens OpenAI App & MCP Server
 * Conforms to Model Context Protocol (MCP) standards for ChatGPT OpenAI Apps.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { getImageToolDefinitions, executeGenerateImage } from './tools/imageTools.js';
import { getVideoToolDefinitions, executeGenerateVideo } from './tools/videoTools.js';
import { getStatusToolDefinitions, executeCheckGeneration } from './tools/statusTools.js';
import { getProjectToolDefinitions, executeListProjects, executeGetProject } from './tools/projectTools.js';
import { getUsageToolDefinitions, executeGetUsage } from './tools/usageTools.js';

// Legacy tools for backward compatibility with Claude / Cursor
import { registerCinemaTools, handleCinemaToolCall } from './tools/cinemaTools.js';
import { registerUGCTools, handleUGCToolCall } from './tools/ugcTools.js';
import { registerMarketingTools, handleMarketingToolCall } from './tools/marketingTools.js';

/**
 * Returns all tool definitions exposed to ChatGPT
 */
export function getAllMcpTools() {
  return [
    ...getImageToolDefinitions(),
    ...getVideoToolDefinitions(),
    ...getStatusToolDefinitions(),
    ...getProjectToolDefinitions(),
    ...getUsageToolDefinitions()
  ];
}

/**
 * Dispatch an MCP tool call by name
 */
export async function dispatchMcpToolCall(name, args, user, deps = {}) {
  switch (name) {
    case 'generate_image':
      return await executeGenerateImage(args, user, deps);

    case 'generate_video':
      return await executeGenerateVideo(args, user, deps);

    case 'check_generation':
      return await executeCheckGeneration(args, user, deps);

    case 'list_projects':
      return await executeListProjects(args, user, deps);

    case 'get_project':
      return await executeGetProject(args, user, deps);

    case 'get_usage':
      return await executeGetUsage(args, user, deps);

    default:
      // Fallback for legacy names
      if (name.startsWith('cinema_')) {
        return await handleCinemaToolCall(name, args);
      } else if (name.startsWith('ugc_')) {
        return await handleUGCToolCall(name, args);
      } else if (name.startsWith('marketing_')) {
        return await handleMarketingToolCall(name, args);
      }
      throw new Error(`Unknown MCP tool requested: ${name}`);
  }
}

/**
 * Factory to create an MCP Server instance with bound dependencies and optional user context
 */
export function createZeroLensMcpServer(userContext = null, deps = {}) {
  const server = new Server(
    {
      name: 'zerolens-app',
      version: '2.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // List all registered tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: getAllMcpTools()
    };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const activeUser = userContext || {
      id: process.env.DEV_MOCK_USER_ID || 'cec79985-ce59-4d23-82a2-3ae6f69994ed',
      email: 'dev@zerolens.in',
      role: 'authenticated'
    };

    try {
      const result = await dispatchMcpToolCall(name, args || {}, activeUser, deps);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (err) {
      console.error(`[MCP Tool Error] ${name}:`, err);
      return {
        content: [
          {
            type: 'text',
            text: `Error executing ${name}: ${err.message}`
          }
        ],
        isError: true
      };
    }
  });

  return server;
}
