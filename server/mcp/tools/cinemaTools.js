/**
 * 🎬 Cinema Studio MCP Tools
 * Exposes video generation (Seedance 2.0, Seedance Fast, Veo 3.1, Omni Flash),
 * image generation (Nano Banana 2, GPT Image Pro), status polling, and asset queries.
 */

export function registerCinemaTools() {
  return [
    {
      name: 'cinema_generate_video',
      description: 'Generate high-end AI cinematic videos using Seedance 2.0 (1080p/720p), Seedance Fast (480p/720p), Veo 3.1, or Omni Flash.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { 
            type: 'string', 
            description: 'Detailed motion prompt describing the scene, camera movement (zoom out, pan, tilt), lighting, and mood.' 
          },
          engine: { 
            type: 'string', 
            enum: ['seedace', 'seedance-fast', 'veo-3.1-lite-generate-preview', 'omni-flash'],
            description: 'AI Video engine. "seedace" = Seedance 2.0 (1080p/720p), "seedance-fast" = Seedance Fast (480p/720p), "omni-flash" = Omni Flash.',
            default: 'seedace'
          },
          aspectRatio: { 
            type: 'string', 
            enum: ['16:9', '9:16', '1:1'], 
            description: 'Video aspect ratio. Default: 16:9',
            default: '16:9' 
          },
          resolution: { 
            type: 'string', 
            enum: ['480p', '720p', '1080p'], 
            description: 'Video resolution. Note: Seedance 2.0 supports 720p & 1080p; Seedance Fast supports 480p & 720p.',
            default: '720p' 
          },
          duration: { 
            type: 'number', 
            description: 'Duration in seconds (e.g. 4, 5, 6, 8, 10)', 
            default: 5 
          },
          generateAudio: {
            type: 'boolean',
            description: 'Whether to generate synchronized AI audio effects/voiceover for engines that support audio.',
            default: false
          },
          userId: { 
            type: 'string', 
            description: 'User ID requesting generation (optional)' 
          }
        },
        required: ['prompt']
      }
    },
    {
      name: 'cinema_generate_image',
      description: 'Generate high-fidelity AI image masterworks using Nano Banana 2 (NB2) or GPT Image Pro.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { 
            type: 'string', 
            description: 'Detailed image prompt describing subject, composition, background details, lighting style.' 
          },
          engine: { 
            type: 'string', 
            enum: ['nano-banana-2', 'nano-banana-pro', 'nano-banana-2-lite', 'gpt-image-2'],
            default: 'nano-banana-2' 
          },
          aspectRatio: { 
            type: 'string', 
            enum: ['16:9', '9:16', '1:1'], 
            default: '16:9' 
          },
          style: {
            type: 'string',
            enum: ['cinematic', 'photorealistic', 'anime', '3d-render'],
            description: 'Visual style preset'
          }
        },
        required: ['prompt']
      }
    },
    {
      name: 'cinema_get_task_status',
      description: 'Query asynchronous rendering status of a video generation task.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'The task ID returned from video generation initialization' },
          engine: { type: 'string', description: 'Engine used for task (e.g. seedace, seedance-fast)' }
        },
        required: ['taskId']
      }
    },
    {
      name: 'cinema_list_user_assets',
      description: 'Retrieve recent generated videos and images from the Cinema Studio gallery.',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'Target user ID' },
          limit: { type: 'number', description: 'Max number of assets to return', default: 20 }
        }
      }
    }
  ];
}

export async function handleCinemaToolCall(name, args) {
  const API_BASE = (process.env.API_BASE_URL || process.env.PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' ? 'https://zerolens.in' : 'http://localhost:5000')).replace(/\/+$/, '');
  
  if (name === 'cinema_generate_video') {
    const engine = args.engine || 'seedace';
    const isSeedance = engine.startsWith('seedance') || engine === 'seedace';
    const endpoint = isSeedance ? '/api/seedance/generate' : '/api/omni/generate-video';

    const resp = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        engine,
        model: engine === 'seedance-fast' ? 'dreamina-seedance-2-0-fast-260128' : 'dreamina-seedance-2-0-260128',
        prompt: args.prompt,
        seedanceContentArray: [{ type: 'text', text: args.prompt }],
        aspectRatio: args.aspectRatio || '16:9',
        resolution: args.resolution || '720p',
        duration: args.duration || 5,
        generateAudio: Boolean(args.generateAudio),
        userId: args.userId || 'mcp-agent'
      })
    });

    const result = await resp.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  if (name === 'cinema_generate_image') {
    const resp = await fetch(`${API_BASE}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: args.prompt,
        engine: args.engine || 'nano-banana-2',
        aspectRatio: args.aspectRatio || '16:9',
        style: args.style || 'cinematic'
      })
    });

    const result = await resp.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  if (name === 'cinema_get_task_status') {
    const engine = args.engine || 'seedace';
    const resp = await fetch(`${API_BASE}/api/seedance/status/${args.taskId}?engine=${engine}`);
    const result = await resp.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  if (name === 'cinema_list_user_assets') {
    const userId = args.userId || 'anon';
    const limit = args.limit || 20;
    const resp = await fetch(`${API_BASE}/api/get-user-assets?userId=${userId}&limit=${limit}`);
    const result = await resp.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  throw new Error(`Unhandled Cinema Studio tool: ${name}`);
}
