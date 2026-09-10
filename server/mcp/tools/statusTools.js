import { renderWidgetHtml } from '../ui/widgetRenderer.js';

export function getStatusToolDefinitions() {
  return [
    {
      name: 'check_generation',
      description: 'Check the real-time status and retrieve the output URL of an asynchronous video or image generation job in ZeroLens.',
      inputSchema: {
        type: 'object',
        properties: {
          generation_id: {
            type: 'string',
            description: 'The generation or job ID returned when starting an image or video generation.'
          }
        },
        required: ['generation_id']
      }
    }
  ];
}

/**
 * Handle execution of check_generation tool
 */
export async function executeCheckGeneration(args, user, deps) {
  const { generation_id } = args;

  if (!generation_id || typeof generation_id !== 'string') {
    throw new Error('Missing or invalid generation_id parameter.');
  }

  const { getJobStatus, supabaseAdmin, supabase } = deps;
  const dbClient = supabaseAdmin || supabase;
  const appBaseUrl = (process.env.PUBLIC_APP_URL || 'https://zerolens.in').replace(/\/+$/, '');

  let status = 'processing';
  let progress = null;
  let resultUrl = null;
  let error = null;
  let details = {};

  // 1. Check job status tracker (Redis BullMQ or in-memory)
  if (typeof getJobStatus === 'function') {
    try {
      const jobData = await getJobStatus(generation_id);
      if (jobData) {
        status = jobData.state || jobData.status || status;
        resultUrl = jobData.url || jobData.videoUrl || null;
        error = jobData.error || null;
        progress = typeof jobData.progress === 'number' ? jobData.progress : (status === 'completed' ? 1.0 : (status === 'queued' ? 0.1 : 0.6));
        details = {
          engine: jobData.engine || jobData.model,
          aspectRatio: jobData.aspect_ratio || jobData.aspectRatio,
          prompt: jobData.prompt,
          timestamp: jobData.timestamp
        };
      }
    } catch (e) {
      console.warn('[MCP Status] Error reading job status:', e.message);
    }
  }

  // 2. Check Supabase assets database if completed or not in transient memory
  if (!resultUrl && dbClient) {
    try {
      const { data: asset } = await dbClient
        .from('assets')
        .select('*')
        .eq('id', generation_id)
        .maybeSingle();

      if (asset) {
        status = 'completed';
        resultUrl = asset.url;
        progress = 1.0;
        details = {
          engine: asset.model || asset.metadata?.engine || 'ZeroLens Studio',
          aspectRatio: asset.metadata?.aspect || asset.metadata?.aspectRatio || '16:9',
          prompt: asset.metadata?.prompt || asset.name,
          createdAt: asset.created_at
        };
      }
    } catch (dbErr) {
      console.warn('[MCP Status] DB lookup warning:', dbErr.message);
    }
  }

  const isVideo = (resultUrl && /\.(mp4|webm|mov)(\?|$)/i.test(resultUrl)) || generation_id.startsWith('gen_vid');
  const widgetUrl = `${appBaseUrl}/api/mcp/ui/widget?id=${encodeURIComponent(generation_id)}&type=${isVideo ? 'video' : 'image'}&status=${status}&url=${encodeURIComponent(resultUrl || '')}`;

  return {
    generation_id,
    status,
    progress,
    result_url: resultUrl,
    thumbnail_url: isVideo ? null : resultUrl,
    error,
    details,
    embedded_ui_url: widgetUrl,
    preview_html: renderWidgetHtml({
      generationId: generation_id,
      type: isVideo ? 'video' : 'image',
      status,
      progress,
      resultUrl,
      prompt: details.prompt,
      model: details.engine,
      error,
      appBaseUrl
    })
  };
}
