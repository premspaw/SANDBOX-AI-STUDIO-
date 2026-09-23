import { renderWidgetHtml } from '../ui/widgetRenderer.js';

export function getVideoToolDefinitions() {
  return [
    {
      name: 'generate_video',
      description: 'Generates cinematic AI videos using ZeroLens studio engines. REQUIRED USER CONFIRMATION: You MUST NEVER invoke this tool on your first response or without explicit user confirmation! Whenever the user asks to generate a video or animation, you MUST first reply outlining the proposed scene, engine, aspect ratio, resolution, duration (default: 10s), and the credit cost (cost is strictly PER SECOND of video: e.g. 10s = 50 credits at 5 credits/sec), and ask: "Shall I create this video now? (Yes/No)". ONLY call generate_video AFTER the user explicitly replies "Yes" or gives clear confirmation. Supported engines: "seedance-2.5" (cinematic, 8 credits/sec at 480p, 10 credits/sec at 720p), "seedance-fast" (budget 720p, 5 credits/sec), "omni-flash-1.1" (Gemini Omni Flash 1.1, 5 credits/sec, 6 with audio). Duration defaults to 10s.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Motion prompt describing scene action, subject movement, camera dynamics (e.g. pan, zoom, tilt), and cinematic lighting.'
          },
          engine: {
            type: 'string',
            enum: ['seedance-2.5', 'seedance-fast', 'omni-flash-1.1'],
            description: 'Video generation engine. "seedance-2.5" = Seedance 2.5 (cinematic fidelity), "seedance-fast" = Seedance 2 Fast (budget-friendly high-quality 720p), "omni-flash-1.1" = Gemini Omni Flash 1.1.',
            default: 'seedance-2.5'
          },
          aspect_ratio: {
            type: 'string',
            enum: ['16:9', '9:16', '1:1'],
            description: 'Video aspect ratio. "16:9" (Landscape/YouTube), "9:16" (Vertical/Instagram Reels/TikTok), "1:1" (Square). Default: "16:9"',
            default: '16:9'
          },
          duration: {
            type: 'number',
            description: 'Duration in seconds (e.g. 5, 8, 10). Default: 10',
            default: 10
          },
          resolution: {
            type: 'string',
            enum: ['720p', '480p'],
            description: 'Resolution of the rendered video. "720p" (default for Omni Flash & Seedance Fast) or "480p" (default for Seedance 2.5). Default: "720p"',
            default: '720p'
          },
          user_confirmed: {
            type: 'boolean',
            description: 'Must be true. Confirms that the user explicitly replied "Yes" to create the video.',
            default: false
          },
          first_frame_url: {
            type: 'string',
            description: 'Optional URL of a starting image frame to animate from.'
          },
          last_frame_url: {
            type: 'string',
            description: 'Optional URL of an ending frame for interpolated camera movement.'
          },
          generate_audio: {
            type: 'boolean',
            description: 'Generate ambient sound effects / cinematic audio where supported.',
            default: false
          },
          project_id: {
            type: 'string',
            description: 'Target project or folder ID. Default: "default"'
          }
        },
        required: ['prompt']
      }
    }
  ];
}

/**
 * Handle execution of generate_video tool
 */
export async function executeGenerateVideo(args, user, deps) {
  if (!user || !user.id) {
    throw new Error('Authentication required: user context missing.');
  }

  const {
    prompt,
    engine = 'seedance-2.5',
    aspect_ratio = '16:9',
    duration = 10,
    first_frame_url,
    last_frame_url,
    generate_audio = false,
    project_id = 'default'
  } = args;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Missing or empty prompt parameter.');
  }

  // Resolve default resolution based on engine if not provided
  let resolution = args.resolution;
  if (!resolution) {
    if (engine === 'seedance-2.5') {
      resolution = '480p'; // Default 480p for Seedance 2.5
    } else {
      resolution = '720p'; // Default 720p for Omni Flash & Seedance Fast
    }
  }

  // Video duration in seconds (default: 10s)
  const durationSec = Math.max(Number(duration) || 10, 1);

  // Per-second rate calculation
  let costPerSec = 5;
  if (engine === 'seedance-fast') {
    costPerSec = 5;
  } else if (engine.toLowerCase().includes('omni')) {
    costPerSec = generate_audio ? 6 : 5;
  } else if (engine === 'seedance-2.5') {
    costPerSec = (resolution === '480p' ? 8 : 10);
  } else if (engine === 'seedace') {
    costPerSec = 15;
  } else if (engine === 'veo-3.1-generate-preview' || engine.includes('veo')) {
    costPerSec = 20;
  }

  // Total cost = costPerSec * durationSec
  const cost = costPerSec * durationSec;

  const {
    consumeCredits,
    supabaseAdmin,
    supabase,
    videoQueue,
    updateJobStatus
  } = deps;
  const dbClient = supabaseAdmin || supabase;

  // 1. Check user credit balance
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
      if (currentBalance < cost) {
        throw new Error(`Insufficient Shorts credits. Current balance: ${currentBalance}, required: ${cost}.`);
      }
    }
  }

  // 2. Deduct credits server-side
  if (typeof consumeCredits === 'function') {
    try {
      await consumeCredits(user.id, cost, 'mcp_chatgpt_video_generation');
    } catch (creditErr) {
      throw new Error(`Credit verification failed: ${creditErr.message}`);
    }
  }

  const generationId = `gen_vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const appBaseUrl = (process.env.PUBLIC_APP_URL || 'https://zerolens.in').replace(/\/+$/, '');
  const isOmni = engine.toLowerCase().includes('omni');
  let targetKieModel = 'bytedance/seedance-2-5';
  if (engine === 'seedance-fast' || resolution === '480p') {
    targetKieModel = 'bytedance/seedance-2-fast';
  }

  const jobPayload = {
    jobId: generationId,
    prompt,
    engine,
    targetModel: targetKieModel,
    aspectRatio: aspect_ratio,
    aspect_ratio,
    duration: Number(duration) || 10,
    resolution,
    firstFrame: first_frame_url,
    lastFrame: last_frame_url,
    generateAudio: Boolean(generate_audio),
    userId: user.id,
    projectId: project_id,
    folder: project_id,
    provider: isOmni ? 'omni' : 'seedance'
  };

  // 3. Mark job as queued in tracking system
  if (typeof updateJobStatus === 'function') {
    await updateJobStatus(generationId, 'queued', {
      prompt,
      engine,
      aspect_ratio,
      userId: user.id,
      cost
    });
  }

  // 4. Enqueue into BullMQ or background runner
  if (videoQueue && typeof videoQueue.add === 'function') {
    try {
      await videoQueue.add('video-generation', { reqBody: jobPayload }, { jobId: generationId });
      console.log(`[MCP Video] Enqueued job ${generationId} in Redis BullMQ`);
    } catch (qErr) {
      console.warn('[MCP Video] Failed to add to BullMQ, falling back to background worker:', qErr.message);
      launchBackgroundVideoWorker(jobPayload, generationId, cost, user, deps);
    }
  } else {
    // Background execution with automatic status updates and refunds on failure
    launchBackgroundVideoWorker(jobPayload, generationId, cost, user, deps);
  }

  const widgetUrl = `${appBaseUrl}/api/mcp/ui/widget?id=${generationId}&type=video&status=processing`;

  return {
    branding: '🎬 Generated via ZeroLens Studio (zerolens.in)',
    provider: 'ZeroLens AI Studio',
    generation_id: generationId,
    status: 'processing',
    type: 'video',
    engine,
    prompt,
    aspect_ratio,
    duration: durationSec,
    resolution,
    cost_per_second: costPerSec,
    credits_used: cost,
    estimated_seconds: engine.includes('fast') ? 40 : 80,
    check_instructions: `Call the "check_generation" tool with generation_id "${generationId}" to retrieve render progress and the final video URL.`,
    embedded_ui_url: widgetUrl,
    preview_html: renderWidgetHtml({
      generationId,
      type: 'video',
      status: 'processing',
      prompt,
      model: engine,
      appBaseUrl
    })
  };
}

/**
 * Fallback background runner when Redis/BullMQ worker is not running in separate process
 */
async function launchBackgroundVideoWorker(jobPayload, generationId, cost, user, deps) {
  const { updateJobStatus, supabaseAdmin, supabase } = deps;
  const dbClient = supabaseAdmin || supabase;

  // Run asynchronously without blocking tool return
  (async () => {
    try {
      if (typeof updateJobStatus === 'function') {
        await updateJobStatus(generationId, 'processing', { progress: 0.1 });
      }

      let finalVideoUrl = null;

      // Seedance path via existing API / routes
      if (jobPayload.provider === 'seedance') {
        const arkApiKey = process.env.ARK_API_KEY;
        const kieApiKey = process.env.KIE_API_KEY;

        if (kieApiKey) {
          const input = {
            prompt: jobPayload.prompt,
            aspect_ratio: jobPayload.aspectRatio.replace(':', '/'),
            duration: Number(jobPayload.duration) || 5,
            resolution: jobPayload.resolution || '720p',
            generate_audio: Boolean(jobPayload.generateAudio)
          };
          if (jobPayload.firstFrame) input.first_frame_url = jobPayload.firstFrame;

          const resp = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kieApiKey}` },
            body: JSON.stringify({ model: jobPayload.targetModel || 'bytedance/seedance-2-5', input })
          });
          const d = await resp.json();
          const taskId = d.data?.taskId;

          if (taskId) {
            // Poll Kie.ai
            for (let i = 0; i < 60; i++) {
              await new Promise(r => setTimeout(r, 5000));
              const poll = await fetch(`https://api.kie.ai/api/v1/jobs/task?taskId=${taskId}`, {
                headers: { 'Authorization': `Bearer ${kieApiKey}` }
              });
              const pData = await poll.json();
              const st = pData.data?.status;
              if (st === 'succeed' || st === 'completed') {
                finalVideoUrl = pData.data?.videos?.[0]?.url || pData.data?.resultUrl;
                break;
              }
              if (st === 'failed' || st === 'error') {
                throw new Error(pData.data?.failMsg || 'Kie.ai render failed');
              }
              if (typeof updateJobStatus === 'function') {
                await updateJobStatus(generationId, 'processing', { progress: Math.min(0.15 + (i * 0.015), 0.9) });
              }
            }
          }
        }
      }

      // If finished and we have a video URL, save to Supabase assets
      if (finalVideoUrl) {
        if (dbClient) {
          try {
            await dbClient.from('assets').insert([{
              name: `video_${Date.now()}.mp4`,
              type: 'video',
              url: finalVideoUrl,
              user_id: user.id,
              created_at: new Date().toISOString(),
              model: jobPayload.engine || 'veo-3.1',
              metadata: {
                prompt: jobPayload.prompt,
                engine: jobPayload.engine,
                aspect: jobPayload.aspectRatio,
                projectId: jobPayload.projectId || 'default',
                generationId
              }
            }]);
          } catch (dbErr) {
            console.warn('[MCP Video Worker] DB insert warning:', dbErr.message);
          }
        }

        if (typeof updateJobStatus === 'function') {
          await updateJobStatus(generationId, 'completed', { videoUrl: finalVideoUrl, url: finalVideoUrl });
        }
        console.log(`[MCP Video Worker] ✅ Completed job ${generationId}: ${finalVideoUrl}`);
      } else {
        throw new Error('Video generation reached maximum timeout without result URL.');
      }

    } catch (err) {
      console.error(`[MCP Video Worker] ❌ Job ${generationId} failed:`, err.message);
      if (typeof updateJobStatus === 'function') {
        await updateJobStatus(generationId, 'failed', null, err.message);
      }

      // Refund user credits on failure
      if (dbClient) {
        try {
          const { data: prof } = await dbClient.from('profiles').select('shorts_balance').eq('id', user.id).single();
          if (prof) {
            await dbClient.from('profiles').update({ shorts_balance: prof.shorts_balance + cost }).eq('id', user.id);
            await dbClient.from('shorts_transactions').insert([{
              user_id: user.id,
              amount: Math.round(cost),
              action_type: 'refund_mcp_chatgpt_video_generation',
              created_at: new Date().toISOString()
            }]);
            console.log(`[MCP Video Worker] 🔄 Refunded ${cost} credits to user ${user.id}`);
          }
        } catch (refErr) {
          console.warn('[MCP Video Worker] Refund error:', refErr.message);
        }
      }
    }
  })();
}
