/**
 * 📊 Marketing Studio MCP Tools
 * Exposes social carousel generation, brand voice cloning (yourVoice), and marketing campaign creation.
 */

export function registerMarketingTools() {
  return [
    {
      name: 'marketing_generate_carousel',
      description: 'Generate multi-slide Instagram or LinkedIn carousel card copy and visual layout directives.',
      inputSchema: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Core topic or educational concept for the carousel' },
          slideCount: { type: 'number', description: 'Number of slides (e.g. 5 to 10)', default: 5 },
          brandTone: { type: 'string', description: 'Voice and tone style (e.g. professional, punchy, witty)' },
          aspectRatio: { type: 'string', enum: ['1:1', '4:5', '9:16'], default: '4:5' }
        },
        required: ['topic']
      }
    },
    {
      name: 'marketing_clone_brand_voice',
      description: 'Analyze sample brand writing to extract a reusable voice and tone profile ("yourVoice").',
      inputSchema: {
        type: 'object',
        properties: {
          sampleText: { type: 'string', description: 'Sample post or brand copy text (at least 200 words recommended)' },
          brandName: { type: 'string', description: 'Name of the brand' }
        },
        required: ['sampleText']
      }
    },
    {
      name: 'marketing_create_full_campaign',
      description: 'Generate a comprehensive product launch campaign kit (ad headlines, video prompts, social copy).',
      inputSchema: {
        type: 'object',
        properties: {
          productLaunchDetails: { type: 'string', description: 'Overview of product feature, launch offer, and goals' }
        },
        required: ['productLaunchDetails']
      }
    }
  ];
}

export async function handleMarketingToolCall(name, args) {
  const API_BASE = (process.env.API_BASE_URL || process.env.PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' ? 'https://zerolens.in' : 'http://localhost:5000')).replace(/\/+$/, '');

  if (name === 'marketing_generate_carousel') {
    const resp = await fetch(`${API_BASE}/api/carousel/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: args.topic,
        slideCount: args.slideCount || 5,
        brandTone: args.brandTone || 'punchy',
        aspectRatio: args.aspectRatio || '4:5'
      })
    });

    const result = await resp.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  if (name === 'marketing_clone_brand_voice') {
    const resp = await fetch(`${API_BASE}/api/yourvoice/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleText: args.sampleText,
        brandName: args.brandName || 'My Brand'
      })
    });

    const result = await resp.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  if (name === 'marketing_create_full_campaign') {
    const resp = await fetch(`${API_BASE}/api/marketing/create-campaign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productLaunchDetails: args.productLaunchDetails
      })
    });

    const result = await resp.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  throw new Error(`Unhandled Marketing Studio tool: ${name}`);
}
