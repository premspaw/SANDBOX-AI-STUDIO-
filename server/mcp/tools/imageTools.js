import { renderWidgetHtml } from '../ui/widgetRenderer.js';

export function getImageToolDefinitions() {
  return [
    {
      name: 'generate_image',
      description: 'Generate high-fidelity AI images using ZeroLens image generation models (Nano Banana 2, Nano Banana Pro, GPT Image Pro). Deducts credits from user account.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Detailed prompt describing the subject, composition, atmosphere, and lighting.'
          },
          aspect_ratio: {
            type: 'string',
            enum: ['1:1', '16:9', '9:16', '3:4', '4:3'],
            description: 'Image aspect ratio. Default: "1:1"',
            default: '1:1'
          },
          style: {
            type: 'string',
            enum: ['cinematic', 'photorealistic', 'anime', '3d-render', 'digital-art', 'minimalist'],
            description: 'Visual artistic style preset.'
          },
          model: {
            type: 'string',
            enum: ['nano-banana-2', 'nano-banana-pro', 'nano-banana-2-lite', 'gpt-image-2'],
            description: 'Image generation engine. "nano-banana-2" = standard high-quality, "nano-banana-pro" = ultra detail, "gpt-image-2" = OpenAI DALL-E / GPT Image.',
            default: 'nano-banana-2'
          },
          reference_image_url: {
            type: 'string',
            description: 'Optional URL of an image to use as reference or visual anchor.'
          },
          image_count: {
            type: 'number',
            description: 'Number of images to generate (1 to 4). Default: 1',
            default: 1
          },
          project_id: {
            type: 'string',
            description: 'Target project or folder ID to save into. Default: "default"'
          }
        },
        required: ['prompt']
      }
    }
  ];
}

/**
 * Handle execution of generate_image tool
 */
export async function executeGenerateImage(args, user, deps) {
  if (!user || !user.id) {
    throw new Error('Authentication required: user context missing.');
  }

  const {
    prompt,
    aspect_ratio = '1:1',
    style,
    model = 'nano-banana-2',
    reference_image_url,
    image_count = 1,
    project_id = 'default'
  } = args;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Missing or empty prompt parameter.');
  }

  const count = Math.min(Math.max(Number(image_count) || 1, 1), 4);

  // Compute credit cost per model
  let costPerImage = 1;
  const mLower = model.toLowerCase();
  if (mLower === 'nano-banana-2-lite') costPerImage = 0.5;
  else if (mLower === 'nano-banana-pro') costPerImage = 3;
  else if (mLower === 'gpt-image-2') costPerImage = 2;

  const totalCost = costPerImage * count;
  const { consumeCredits, supabaseAdmin, supabase, handleGoogle, handleOpenAI } = deps;
  const dbClient = supabaseAdmin || supabase;

  // 1. Verify user's credit balance
  let currentBalance = 0;
  if (dbClient) {
    const { data: profile } = await dbClient
      .from('profiles')
      .select('shorts_balance, brand_voice')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      const fractional = profile.brand_voice?.fractional_shorts || 0;
      currentBalance = (profile.shorts_balance ?? 0) + fractional;
      if (currentBalance < totalCost) {
        throw new Error(`Insufficient Shorts credits. Current balance: ${currentBalance}, required: ${totalCost}.`);
      }
    }
  }

  // 2. Deduct credits server-side
  let creditsDeducted = false;
  if (typeof consumeCredits === 'function') {
    try {
      await consumeCredits(user.id, totalCost, 'mcp_chatgpt_image_generation');
      creditsDeducted = true;
    } catch (creditErr) {
      throw new Error(`Credit verification failed: ${creditErr.message}`);
    }
  }

  const generatedUrls = [];
  const generationId = `gen_img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const compiledPrompt = style ? `${prompt}, styled in ${style} aesthetic` : prompt;

  try {
    for (let i = 0; i < count; i++) {
      let finalUrl = null;
      let engineError = null;

      // Create a mock Express req / res to route into existing ZeroLens handlers
      const mockReq = {
        body: {
          model,
          prompt: compiledPrompt,
          aspectRatio: aspect_ratio,
          aspect_ratio,
          userId: user.id,
          referenceImages: reference_image_url ? [reference_image_url] : [],
          folder: project_id,
          projectId: project_id
        },
        headers: {}
      };

      const mockRes = {
        json: (d) => {
          if (d.url) finalUrl = d.url;
          if (d.error || d.message) engineError = d.message || d.error;
          return d;
        },
        status: () => mockRes,
        headersSent: false
      };

      if (mLower.includes('gpt') || mLower.includes('dall')) {
        if (typeof handleOpenAI === 'function') {
          await handleOpenAI(mockReq, mockRes);
        } else {
          throw new Error('OpenAI image handler unavailable.');
        }
      } else {
        if (typeof handleGoogle === 'function') {
          await handleGoogle(mockReq, mockRes);
        } else {
          throw new Error('Google image generation engine unavailable.');
        }
      }

      if (!finalUrl) {
        throw new Error(engineError || 'Image generation completed without returning an asset URL.');
      }

      generatedUrls.push(finalUrl);
    }

    const appBaseUrl = (process.env.PUBLIC_APP_URL || 'https://zerolens.in').replace(/\/+$/, '');
    const previewUrl = generatedUrls[0];
    const widgetUrl = `${appBaseUrl}/api/mcp/ui/widget?id=${generationId}&type=image&status=completed&url=${encodeURIComponent(previewUrl)}`;

    return {
      generation_id: generationId,
      status: 'completed',
      type: 'image',
      count: generatedUrls.length,
      urls: generatedUrls,
      prompt,
      model,
      aspect_ratio,
      project_id,
      credits_used: totalCost,
      remaining_balance: Math.max(0, currentBalance - totalCost),
      embedded_ui_url: widgetUrl,
      preview_html: renderWidgetHtml({
        generationId,
        type: 'image',
        status: 'completed',
        resultUrl: previewUrl,
        prompt,
        model,
        appBaseUrl
      })
    };

  } catch (err) {
    // 3. Automatic refund if failure occurred after deduction
    if (creditsDeducted && dbClient) {
      try {
        const { data: prof } = await dbClient.from('profiles').select('shorts_balance').eq('id', user.id).single();
        if (prof) {
          await dbClient.from('profiles').update({ shorts_balance: prof.shorts_balance + totalCost }).eq('id', user.id);
          await dbClient.from('shorts_transactions').insert([{
            user_id: user.id,
            amount: Math.round(totalCost),
            action_type: 'refund_mcp_chatgpt_image_generation',
            created_at: new Date().toISOString()
          }]);
          console.log(`[MCP Image] 🔄 Refunded ${totalCost} credits to user ${user.id} after failure.`);
        }
      } catch (refErr) {
        console.warn('[MCP Image] Refund error:', refErr.message);
      }
    }
    throw new Error(`ZeroLens Image Generation Failed: ${err.message}`);
  }
}
