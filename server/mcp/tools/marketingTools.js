/**
 * 📊 Marketing Studio MCP Tools
 * Exposes social carousel generation, brand voice cloning (yourVoice),
 * marketing campaign creation, and handwritten restaurant menu poster generation.
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
    },
    {
      name: 'marketing_create_handwritten_menu',
      description: 'Create aesthetic handwritten restaurant food menu posters, recipe journals, and cafe chalkboards. Accepts menu dish items, pricing, or handwritten notes. If the user attaches an image of a food plate or existing menu in ChatGPT, pass its vision breakdown into visual_context or image_url.',
      inputSchema: {
        type: 'object',
        properties: {
          dish_names_or_items: {
            type: 'string',
            description: 'Menu dishes, prices, ingredients, or food descriptions (e.g. "Truffle Gnocchi - ₹450, Burrata Pizza - ₹600, Tiramisu - ₹300")'
          },
          visual_context: {
            type: 'string',
            description: 'Visual description of any photo uploaded by the user in chat (e.g. food presentation, plating, table setting, colors)'
          },
          reference_image_url: {
            type: 'string',
            description: 'Optional public URL of the food photo or existing menu if provided'
          },
          handwritten_style: {
            type: 'string',
            enum: ['casual-diary', 'white-ink-sketch', 'artisan-calligraphy', 'chalkboard-bistro', 'cozy-watercolor'],
            description: 'Handwritten artistic style for annotations and titles',
            default: 'casual-diary'
          },
          aspect_ratio: {
            type: 'string',
            enum: ['1:1', '4:5', '9:16', '16:9'],
            description: 'Layout aspect ratio: 4:5 for Instagram, 9:16 for Stories/Reels, 1:1 for square, 16:9 for banners',
            default: '4:5'
          },
          language: {
            type: 'string',
            description: 'Language of handwritten text (e.g. English, Italian, Japanese)',
            default: 'English'
          }
        },
        required: ['dish_names_or_items']
      }
    }
  ];
}

export async function handleMarketingToolCall(name, args) {
  const API_BASE = (process.env.API_BASE_URL || process.env.PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' ? 'https://zerolens.in' : `http://localhost:${process.env.PORT || 3002}`)).replace(/\/+$/, '');

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

  if (name === 'marketing_create_handwritten_menu') {
    const {
      dish_names_or_items,
      visual_context = '',
      reference_image_url,
      handwritten_style = 'casual-diary',
      aspect_ratio = '4:5',
      language = 'English',
      model = 'nano-banana-2'
    } = args;

    // Compose rich aesthetic handwritten food journal / menu prompt
    const promptParts = [
      `Aesthetic restaurant food menu and lifestyle culinary poster featuring: ${dish_names_or_items}.`,
      visual_context ? `Visual presentation details: ${visual_context}.` : '',
      `Handwritten ${language} annotations and price callouts written in ${handwritten_style} style with delicate white and cream ink doodles, arrows, and handwritten tasting notes.`,
      `Artistic line drawing outlines around visible food elements, loose sketchy strokes, cozy emotional food journal mood.`,
      `Commercial high-end food magazine photography, beautiful restaurant table setting, soft natural daylight, shallow depth of field, high resolution 8k.`
    ].filter(Boolean).join(' ');

    const resp = await fetch(`${API_BASE}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: promptParts,
        aspectRatio: aspect_ratio,
        aspect_ratio: aspect_ratio,
        model: model,
        referenceImage: reference_image_url,
        userId: 'mcp_user'
      })
    });

    const result = await resp.json();
    if (!result.url) {
      throw new Error(result.error || 'Failed to generate handwritten menu image');
    }

    return {
      success: true,
      imageUrl: result.url,
      dishItems: dish_names_or_items,
      style: handwritten_style,
      content: [
        {
          type: 'text',
          text: `### 📋 Generated Handwritten Menu Poster\n\n![Menu Poster](${result.url})\n\n**Dishes & Items:** ${dish_names_or_items}\n**Style:** ${handwritten_style}\n**Download/View Image:** [Open Full Resolution](${result.url})`
        }
      ]
    };
  }

  throw new Error(`Unhandled Marketing Studio tool: ${name}`);
}
