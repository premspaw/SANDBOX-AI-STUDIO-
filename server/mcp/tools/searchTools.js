/**
 * 🔍 OpenAI Deep Research & Company Knowledge Tools (search & fetch)
 * Conforms to OpenAI's official Remote MCP Specification for ChatGPT Plugins & Deep Research.
 */

import fs from 'fs';
import path from 'path';

export function getSearchToolDefinitions() {
  return [
    {
      name: 'search',
      description: 'Search ZeroLens AI Studio assets, video generation prompts, UGC ad scripts, and creative knowledge. Returns matching items with title, id, and canonical citation URLs for ChatGPT Deep Research.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query string. Natural language queries work best for semantic and keyword search across studio projects and assets.'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default: 10, max: 25)',
            default: 10
          }
        },
        required: ['query']
      }
    },
    {
      name: 'fetch',
      description: 'Retrieve complete document content, prompt parameters, media URL, and metadata by ID for detailed analysis and citation in ChatGPT.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Document or asset ID returned from the search tool (e.g. asset_xxx, template_xxx).'
          }
        },
        required: ['id']
      }
    }
  ];
}

// Built-in Studio Knowledge Base for prompt crafting and UGC frameworks
const STUDIO_KNOWLEDGE_DOCS = [
  {
    id: 'kb_seedance_prompting_guide',
    title: 'Seedance 2.0 Cinematic Motion Prompting Architecture',
    url: 'https://zerolens.in/docs/seedance-guide',
    keywords: ['seedance', 'seedace', 'video', 'cinematic', 'prompting', 'camera', 'lighting', 'motion'],
    text: `Seedance 2.0 Prompting Guide for ZeroLens Studio:
1. Cinematic Structure: [Subject Description] + [Environment/Lighting] + [Specific Camera Movement] + [Physics/Atmosphere].
2. Best Camera Directives: "pan right slowly", "dolly zoom in", "aerial orbit shot", "first-person dynamic tilt".
3. Resolution Guidelines: Use 720p for fast previews, 1080p for final master renders.
4. Aspect Ratios: 16:9 for cinematic film, 9:16 for TikTok/Reels/Shorts, 1:1 for Instagram feed.
5. Recommended Engine: "seedace" for ultra-realistic physics and 1080p rendering.`,
    metadata: { category: 'guide', engine: 'seedance-2.0', source: 'zerolens-docs' }
  },
  {
    id: 'kb_ugc_viral_hooks',
    title: 'ZeroLens UGC Ad Scripting & Viral 3-Second Hooks Framework',
    url: 'https://zerolens.in/docs/ugc-frameworks',
    keywords: ['ugc', 'hook', 'script', 'viral', 'ad', 'tiktok', 'reels', 'marketing', 'conversion'],
    text: `ZeroLens UGC Viral Video Formula:
1. Hook (0-3s): Disrupt the feed. Visual pattern interrupt + bold statement (e.g. "Stop scrolling if you have oily skin" or "I tested 5 AI video tools so you don't have to").
2. Agitate (3-8s): Present the daily struggle or frustration in relatable language.
3. Solution & Demo (8-20s): Introduce the product naturally in real-world lighting.
4. Social Proof & Benefit (20-25s): "After 2 weeks of using this..."
5. Call to Action (25-30s): Clear, single action ("Click the link below for 20% off").`,
    metadata: { category: 'framework', domain: 'ugc-marketing', source: 'zerolens-docs' }
  },
  {
    id: 'kb_nano_banana_styles',
    title: 'Nano Banana 2 & GPT Image Pro Visual Style Master Reference',
    url: 'https://zerolens.in/docs/image-styles',
    keywords: ['nano banana', 'nb2', 'image', 'styles', 'photorealistic', '3d', 'render', 'prompt'],
    text: `ZeroLens Image Engine Style Presets:
- photorealistic: 8k UHD, natural ambient lighting, 85mm portrait lens, shallow depth of field.
- cinematic: anamorphic lens flare, moody contrast, 35mm film grain, teal and orange color grade.
- anime: Makoto Shinkai aesthetic, vibrant sky, detailed cel shading, luminous light accents.
- 3d-render: Unreal Engine 5 render, Octane lighting, ray-traced subsurface scattering.`,
    metadata: { category: 'guide', engine: 'nano-banana-2', source: 'zerolens-docs' }
  }
];

/**
 * Handle execution of search tool
 */
export async function executeSearch(args, user, deps = {}) {
  const query = (args.query || '').trim();
  const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 25);
  const appBaseUrl = (process.env.PUBLIC_APP_URL || 'https://zerolens.in').replace(/\/+$/, '');

  if (!query) {
    return { results: [] };
  }

  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 1);
  const results = [];
  const seenIds = new Set();

  // 1. Search Supabase Assets Database
  const { supabaseAdmin, supabase } = deps;
  const dbClient = supabaseAdmin || supabase;

  if (dbClient) {
    try {
      let queryBuilder = dbClient
        .from('assets')
        .select('id, name, type, url, metadata, model, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(100);

      // If authenticated user, scope to their assets or public studio assets
      if (user?.id) {
        if (typeof queryBuilder.or === 'function') {
          queryBuilder = queryBuilder.or(`user_id.eq.${user.id},user_id.is.null`);
        } else if (typeof queryBuilder.eq === 'function') {
          queryBuilder = queryBuilder.eq('user_id', user.id);
        }
      }

      const { data: dbAssets, error } = await queryBuilder;

      if (!error && Array.isArray(dbAssets)) {
        for (const asset of dbAssets) {
          const prompt = (asset.metadata?.prompt || asset.name || '').toLowerCase();
          const engine = (asset.model || asset.metadata?.engine || '').toLowerCase();
          const type = (asset.type || 'image').toLowerCase();
          const matches = queryTerms.some(term => 
            prompt.includes(term) || engine.includes(term) || type.includes(term)
          );

          if (matches && !seenIds.has(asset.id)) {
            seenIds.add(asset.id);
            const title = asset.name || asset.metadata?.prompt?.slice(0, 60) || `${asset.type === 'video' ? 'Video' : 'Image'} Asset`;
            results.push({
              id: `asset_${asset.id}`,
              title: `${title} (${asset.model || asset.type || 'media'})`,
              url: asset.url || `${appBaseUrl}/gallery?id=${asset.id}`
            });

            if (results.length >= limit) break;
          }
        }
      }
    } catch (err) {
      console.warn('[MCP Search] Supabase query warning:', err.message);
    }
  }

  // 2. Fallback to Local Assets JSON if database returned few results
  if (results.length < limit) {
    try {
      const localFile = deps.LOCAL_ASSETS_FILE || path.resolve(process.cwd(), 'local_assets.json');
      if (fs.existsSync(localFile)) {
        const fileContent = fs.readFileSync(localFile, 'utf8');
        const localAssets = JSON.parse(fileContent);

        if (Array.isArray(localAssets)) {
          for (const asset of localAssets) {
            const prompt = (asset.prompt || asset.name || '').toLowerCase();
            const matches = queryTerms.some(term => prompt.includes(term));

            const assetId = asset.id || asset._id;
            if (matches && assetId && !seenIds.has(assetId)) {
              seenIds.add(assetId);
              results.push({
                id: `asset_${assetId}`,
                title: asset.name || asset.prompt?.slice(0, 60) || 'ZeroLens Asset',
                url: asset.url || `${appBaseUrl}/gallery?id=${assetId}`
              });

              if (results.length >= limit) break;
            }
          }
        }
      }
    } catch (localErr) {
      console.warn('[MCP Search] Local assets lookup warning:', localErr.message);
    }
  }

  // 3. Search Studio Knowledge Base Documents
  if (results.length < limit) {
    for (const doc of STUDIO_KNOWLEDGE_DOCS) {
      const matches = queryTerms.some(term => 
        doc.keywords.some(kw => kw.includes(term)) ||
        doc.title.toLowerCase().includes(term) ||
        doc.text.toLowerCase().includes(term)
      );

      if (matches && !seenIds.has(doc.id)) {
        seenIds.add(doc.id);
        results.push({
          id: doc.id,
          title: doc.title,
          url: doc.url
        });

        if (results.length >= limit) break;
      }
    }
  }

  return { results };
}

/**
 * Handle execution of fetch tool
 */
export async function executeFetch(args, user, deps = {}) {
  const rawId = (args.id || '').trim();
  const appBaseUrl = (process.env.PUBLIC_APP_URL || 'https://zerolens.in').replace(/\/+$/, '');

  if (!rawId) {
    throw new Error('Missing required parameter: id');
  }

  // 1. Check Studio Knowledge Base Docs first if ID matches
  const knowledgeDoc = STUDIO_KNOWLEDGE_DOCS.find(d => d.id === rawId);
  if (knowledgeDoc) {
    return {
      id: knowledgeDoc.id,
      title: knowledgeDoc.title,
      text: knowledgeDoc.text,
      url: knowledgeDoc.url,
      metadata: knowledgeDoc.metadata
    };
  }

  // 2. Normalize Asset ID (strip optional asset_ prefix)
  const assetId = rawId.startsWith('asset_') ? rawId.replace('asset_', '') : rawId;

  // 3. Query Supabase Database for full asset content
  const { supabaseAdmin, supabase } = deps;
  const dbClient = supabaseAdmin || supabase;

  if (dbClient) {
    try {
      const { data: asset, error } = await dbClient
        .from('assets')
        .select('*')
        .eq('id', assetId)
        .maybeSingle();

      if (!error && asset) {
        const engine = asset.model || asset.metadata?.engine || 'ZeroLens Engine';
        const type = asset.type || 'image';
        const prompt = asset.metadata?.prompt || asset.prompt || asset.name || '';
        const aspect = asset.metadata?.aspect || asset.metadata?.aspectRatio || '16:9';
        const duration = asset.metadata?.duration ? `${asset.metadata.duration}s` : 'N/A';
        const resolution = asset.metadata?.resolution || '720p';

        const fullText = [
          `ZeroLens Studio Asset: ${asset.name || 'Untitled'}`,
          `Type: ${type.toUpperCase()}`,
          `AI Engine: ${engine}`,
          `Generation Prompt: "${prompt}"`,
          `Aspect Ratio: ${aspect}`,
          `Resolution: ${resolution}`,
          `Duration: ${duration}`,
          `Created At: ${asset.created_at}`,
          `Direct Media URL: ${asset.url || 'Rendering'}`
        ].join('\n');

        return {
          id: `asset_${asset.id}`,
          title: asset.name || prompt.slice(0, 60) || 'ZeroLens Asset',
          text: fullText,
          url: asset.url || `${appBaseUrl}/gallery?id=${asset.id}`,
          metadata: {
            type,
            engine,
            aspect_ratio: aspect,
            created_at: asset.created_at,
            source: 'supabase_assets'
          }
        };
      }
    } catch (dbErr) {
      console.warn('[MCP Fetch] Database fetch warning:', dbErr.message);
    }
  }

  // 4. Check local_assets.json
  try {
    const localFile = deps.LOCAL_ASSETS_FILE || path.resolve(process.cwd(), 'local_assets.json');
    if (fs.existsSync(localFile)) {
      const localAssets = JSON.parse(fs.readFileSync(localFile, 'utf8'));
      const found = localAssets.find(a => (a.id === assetId || a._id === assetId));
      if (found) {
        return {
          id: `asset_${found.id || found._id}`,
          title: found.name || found.prompt?.slice(0, 60) || 'Local Asset',
          text: `Local Asset Prompt: "${found.prompt || found.name}"\nEngine: ${found.model || 'ZeroLens'}\nURL: ${found.url}`,
          url: found.url || `${appBaseUrl}/gallery?id=${found.id}`,
          metadata: { source: 'local_assets_cache' }
        };
      }
    }
  } catch (err) {
    console.warn('[MCP Fetch] Local file check warning:', err.message);
  }

  throw new Error(`Document or asset with ID "${rawId}" was not found.`);
}
