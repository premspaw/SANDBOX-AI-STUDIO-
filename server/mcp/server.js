/**
 * 🚀 ZeroLens OpenAI App & MCP Server
 * Conforms to Model Context Protocol (MCP) standards for ChatGPT OpenAI Apps.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { getImageToolDefinitions, executeGenerateImage } from './tools/imageTools.js';
import { getVideoToolDefinitions, executeGenerateVideo } from './tools/videoTools.js';
import { getStatusToolDefinitions, executeCheckGeneration } from './tools/statusTools.js';
import { getProjectToolDefinitions, executeListProjects, executeGetProject } from './tools/projectTools.js';
import { getUsageToolDefinitions, executeGetUsage } from './tools/usageTools.js';
import { getSearchToolDefinitions, executeSearch, executeFetch } from './tools/searchTools.js';

// Legacy tools for backward compatibility with Claude / Cursor
import { registerCinemaTools, handleCinemaToolCall } from './tools/cinemaTools.js';
import { registerUGCTools, handleUGCToolCall } from './tools/ugcTools.js';
import { registerMarketingTools, handleMarketingToolCall } from './tools/marketingTools.js';

/**
 * Returns all tool definitions exposed to ChatGPT
 */
export function getAllMcpTools() {
  return [
    ...getSearchToolDefinitions(),
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
    case 'search':
      return await executeSearch(args, user, deps);

    case 'fetch':
      return await executeFetch(args, user, deps);

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
        tools: {},
        prompts: {}
      }
    }
  );

  // List all registered tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: getAllMcpTools()
    };
  });

  // List all available guided prompt workflows
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: 'create_carousel',
          description: 'Design and generate a multi-slide social media carousel (LinkedIn / Instagram). Asks for format/ratio, plans each slide, and renders every image inline.',
          arguments: [
            {
              name: 'topic',
              description: 'Topic or headline of the carousel',
              required: true
            },
            {
              name: 'slides_count',
              description: 'Number of slides (default: 4)',
              required: false
            },
            {
              name: 'aspect_ratio',
              description: 'Aspect ratio (e.g. 1:1, 4:5, 3:4, 16:9)',
              required: false
            }
          ]
        },
        {
          name: 'create_product_shot',
          description: 'Generate a commercial studio photograph for a product using ZeroLens Nano Banana 2.',
          arguments: [
            {
              name: 'product',
              description: 'Description of the product to photograph',
              required: true
            },
            {
              name: 'lighting_style',
              description: 'e.g. moody, soft studio, neon, sunlight',
              required: false
            }
          ]
        }
      ]
    };
  });

  // Get specific prompt content
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: promptArgs } = request.params;
    if (name === 'create_carousel') {
      const topic = promptArgs?.topic || 'Founder Lessons';
      const count = promptArgs?.slides_count || 4;
      const ratio = promptArgs?.aspect_ratio || '1:1';
      return {
        description: `Create a ${count}-slide carousel about ${topic}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I want to create a ${count}-slide carousel about "${topic}". First, confirm the aspect ratio (recommended: ${ratio}) and style with me. Then plan the title, slide content, and invoke ZeroLens generate_image for each slide, embedding every image directly into the chat with Markdown (![Slide](url)).`
            }
          }
        ]
      };
    }
    if (name === 'create_product_shot') {
      const product = promptArgs?.product || 'Luxury watch';
      const style = promptArgs?.lighting_style || 'professional studio lighting';
      return {
        description: `Create a studio product shot of ${product}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Generate a studio product photo of "${product}" with ${style} using ZeroLens generate_image. Make sure to embed the final image directly into the chat using markdown: ![${product}](url).`
            }
          }
        ]
      };
    }
    throw new Error(`Unknown prompt: ${name}`);
  });

/**
 * Formats the response text for ChatGPT / Claude / AI agents so it prominently
 * features ZeroLens Studio branding, credits, and markdown-rendered media.
 */
function formatToolCallResponseText(name, result) {
  if (!result || typeof result !== 'object') {
    return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  }

  if (name === 'generate_image') {
    const urls = result.urls || (result.url ? [result.url] : []);
    const imgMarkdown = urls
      .map((u, i) => `**Output ${i + 1}:**\n![ZeroLens Image ${i + 1}](${u})\n[📥 View & Download Image ${i + 1}](${u})`)
      .join('\n\n');

    return [
      `### 🎨 Generated via ZeroLens Studio`,
      ``,
      `* **Prompt:** "${result.prompt || ''}"`,
      `* **Engine:** \`${result.model || 'Nano Banana 2'}\``,
      `* **Aspect Ratio:** \`${result.aspect_ratio || '1:1'}\``,
      `* **Shorts Credits Deducted:** \`${result.credits_used ?? 1}\``,
      `* **Remaining Shorts Balance:** \`${result.remaining_balance ?? 'N/A'}\``,
      `* **Job ID:** \`${result.generation_id || ''}\``,
      ``,
      imgMarkdown,
      ``,
      `---`,
      `*Created with [ZeroLens Studio](https://zerolens.in)*`
    ].join('\n');
  }

  if (name === 'generate_video') {
    return [
      `### 🎬 Generated via ZeroLens Studio`,
      ``,
      `* **Status:** \`${result.status || 'processing'}\``,
      `* **Engine:** \`${result.engine || 'Seedance 2.0'}\``,
      `* **Prompt:** "${result.prompt || ''}"`,
      `* **Aspect Ratio:** \`${result.aspect_ratio || '16:9'}\``,
      `* **Duration:** \`${result.duration || 5}s\``,
      `* **Shorts Credits Deducted:** \`${result.credits_used ?? 10}\``,
      `* **Job ID:** \`${result.generation_id || ''}\``,
      ``,
      result.video_url
        ? `[🎥 Watch Generated Video](${result.video_url})`
        : `⏳ **Rendering in progress.** *Please call \`check_generation\` with Job ID \`${result.generation_id}\` to retrieve the video link.*`,
      ``,
      `---`,
      `*Created with [ZeroLens Studio](https://zerolens.in)*`
    ].join('\n');
  }

  if (name === 'check_generation') {
    if (result.status === 'completed' && (result.video_url || result.output_url)) {
      const mediaUrl = result.video_url || result.output_url;
      return [
        `### ✨ ZeroLens Studio: Media Ready!`,
        ``,
        `* **Status:** \`completed\``,
        `* **Job ID:** \`${result.generation_id || ''}\``,
        `* **Media URL:** [📥 Download / Watch Result](${mediaUrl})`,
        ``,
        `---`,
        `*Created with [ZeroLens Studio](https://zerolens.in)*`
      ].join('\n');
    }
  }

  if (name === 'get_usage') {
    return [
      `### 💳 ZeroLens Studio Account Status`,
      ``,
      `* **User:** \`${result.email || 'Creator'}\``,
      `* **Shorts Balance:** \`${result.shorts_balance ?? 0} Credits\``,
      `* **Subscription Tier:** \`${result.tier || 'Standard'}\``,
      ``,
      `---`,
      `*Manage your account at [ZeroLens Studio](https://zerolens.in)*`
    ].join('\n');
  }

  return JSON.stringify(result, null, 2);
}

  // Call tool handler - returns both structuredContent and content for OpenAI Deep Research & Plugin compatibility
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const activeUser = userContext || {
      id: process.env.DEV_MOCK_USER_ID || 'cec79985-ce59-4d23-82a2-3ae6f69994ed',
      email: 'dev@zerolens.in',
      role: 'authenticated'
    };

    try {
      const result = await dispatchMcpToolCall(name, args || {}, activeUser, deps);
      const responseText = formatToolCallResponseText(name, result);

      return {
        structuredContent: result,
        content: [
          {
            type: 'text',
            text: responseText
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
