import { renderWidgetHtml } from '../ui/widgetRenderer.js';

export function getVideoToolDefinitions() {
  return [
    {
      name: 'generate_video',
      description: 'Generate high-end cinematic AI videos asynchronously using ZeroLens video engines (Seedance 2.0, Seedance Fast, Google Veo 3.1). Returns a generation ID immediately for asynchronous status checking.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Motion prompt describing scene action, subject movement, camera dynamics (e.g. pan, zoom, tilt), and cinematic lighting.'
          },
          engine: {
            type: 'string',
            enum: ['seedace', 'seedance-fast', 'veo-3.1-generate-preview'],
            description: 'Video generation model. "seedance-fast" = quick renders, "seedace" = Seedance 2.0 (1080p high fidelity), "veo-3.1-generate-preview" = Google DeepMind Veo 3.1.',
            default: 'seedance-fast'
          },
          aspect_ratio: {
            type: 'string',
            enum: ['16:9', '9:16', '1:1'],
            description: 'Video aspect ratio. Default: "16:9"',
            default: '16:9'
          },
          duration: {
            type: 'number',
            description: 'Duration in seconds (typically 5 or 8). Default: 5',
            default: 5
          },
          resolution: {
            type: 'string',
            enum: ['720p', '1080p'],
            description: 'Resolution of the rendered video. Default: "720p"',
            default: '720p'
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
    engine = 'seedance-fast',
    aspect_ratio = '16:9',
    duration = 5,
    resolution = '720p',
    first_frame_url,
    last_frame_url,
    generate_audio = false,
    project_id = 'default'
  } = args;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Missing or empty prompt parameter.');
  }

  // Cost calculation
  let cost = 10;
  if (engine === 'seedace') cost = 15;
  if (engine === 'veo-3.1-generate-preview' || engine.includes('veo')) cost = 20;

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

  const jobPayload = {
    jobId: generationId,
    prompt,
    engine,
    aspectRatio: aspect_ratio,
    aspect_ratio,
    duration: Number(duration) || 5,
    resolution,
    firstFrame: first_frame_url,
    lastFrame: last_frame_url,
    generateAudio: Boolean(generate_audio),
    userId: user.id,
    projectId: project_id,
    folder: project_id,
    provider: engine.includes('veo') ? 'veo' : 'seedance'
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
    generation_id: generationId,
    status: 'processing',
    type: 'video',
    engine,
    prompt,
    aspect_ratio,
    duration,
    resolution,
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
            body: JSON.stringify({ model: 'bytedance/seedance-2-fast', input })
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
              id: generationId,
              name: `video_${Date.now()}.mp4`,
              type: 'video',
              url: finalVideoUrl,
              user_id: user.id,
              created_at: new Date().toISOString(),
              metadata: {
                prompt: jobPayload.prompt,
                engine: jobPayload.engine,
                aspect: jobPayload.aspectRatio,
                projectId: jobPayload.projectId || 'default'
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
