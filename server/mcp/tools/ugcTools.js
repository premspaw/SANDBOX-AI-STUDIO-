/**
 * 📱 UGC Studio MCP Tools
 * Exposes UGC ad script generation, viral hook variations, and avatar spokesperson video creation.
 */

export function registerUGCTools() {
  return [
    {
      name: 'ugc_generate_ad_script',
      description: 'Generate a high-converting UGC video ad script with hook, problem, solution, demonstration, and call to action.',
      inputSchema: {
        type: 'object',
        properties: {
          productName: { type: 'string', description: 'Name of the product or service' },
          productUrl: { type: 'string', description: 'URL or landing page of the product' },
          targetAudience: { type: 'string', description: 'Target audience description (e.g. Gen Z skincare enthusiasts, busy moms)' },
          platform: { 
            type: 'string', 
            enum: ['tiktok', 'reels', 'shorts'], 
            default: 'tiktok' 
          },
          tone: {
            type: 'string',
            enum: ['relatable', 'energetic', 'educational', 'dramatic'],
            default: 'relatable'
          }
        },
        required: ['productName']
      }
    },
    {
      name: 'ugc_generate_hook_variations',
      description: 'Generate 5 viral visual & verbal hook variations tailored for social video ads.',
      inputSchema: {
        type: 'object',
        properties: {
          productDescription: { type: 'string', description: 'Core product summary or value proposition' },
          niche: { type: 'string', description: 'Industry or niche (e.g. e-commerce, SaaS, fitness)' }
        },
        required: ['productDescription']
      }
    },
    {
      name: 'ugc_create_avatar_video',
      description: 'Render an AI spokesperson video clip speaking a UGC script.',
      inputSchema: {
        type: 'object',
        properties: {
          scriptText: { type: 'string', description: 'Script text to be spoken by the avatar' },
          avatarId: { type: 'string', description: 'Avatar template ID or voice ID' },
          aspectRatio: { type: 'string', enum: ['9:16', '16:9', '1:1'], default: '9:16' }
        },
        required: ['scriptText']
      }
    }
  ];
}

export async function handleUGCToolCall(name, args) {
  const API_BASE = (process.env.API_BASE_URL || process.env.PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' ? 'https://zerolens.in' : 'http://localhost:5000')).replace(/\/+$/, '');

  if (name === 'ugc_generate_ad_script') {
    const resp = await fetch(`${API_BASE}/api/ugc/generate-script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: args.productName,
        productUrl: args.productUrl,
        targetAudience: args.targetAudience,
        platform: args.platform || 'tiktok',
        tone: args.tone || 'relatable'
      })
    });

    const result = await resp.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  if (name === 'ugc_generate_hook_variations') {
    const resp = await fetch(`${API_BASE}/api/ugc/generate-hooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productDescription: args.productDescription,
        niche: args.niche || 'general'
      })
    });

    const result = await resp.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  if (name === 'ugc_create_avatar_video') {
    const resp = await fetch(`${API_BASE}/api/avatar/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptText: args.scriptText,
        avatarId: args.avatarId || 'default_avatar',
        aspectRatio: args.aspectRatio || '9:16'
      })
    });

    const result = await resp.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  throw new Error(`Unhandled UGC Studio tool: ${name}`);
}
