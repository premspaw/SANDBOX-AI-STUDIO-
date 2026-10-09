import express from 'express';
import { createHiggsfieldClient } from '@higgsfield/client/v2';
import { isValidUuid } from '../utils/validateUuid.js';

function sanitizeServerError(rawMsg) {
    if (!rawMsg) return 'High server demand or temporary service interruption. Any deducted Shorts have been refunded. Please try again or contact support at support@zerolens.in.';
    const str = typeof rawMsg === 'string' ? rawMsg : (rawMsg.message || JSON.stringify(rawMsg));
    const lower = str.toLowerCase();

    const isPolicyViolation = 
        lower.includes('responsible ai') ||
        lower.includes('content safety') ||
        lower.includes('safety') ||
        lower.includes('policy') ||
        lower.includes('prohibited') ||
        lower.includes('nsfw') ||
        lower.includes('moderation');
    if (isPolicyViolation) {
        return '⚠️ Content Safety Policy Restriction: Your prompt or reference media was flagged by content safety filters. Any deducted Shorts credits have been refunded. Please adjust your prompt or media and try again.';
    }

    if (lower.includes('insufficient') && (lower.includes('shorts') || lower.includes('balance'))) {
        return 'Insufficient Shorts balance. Please top up your Shorts credits to continue.';
    }

    return 'High server demand or temporary service interruption. Any deducted Shorts have been refunded. Please try again or contact support at support@zerolens.in.';
}

export default function createRouter(deps) {
    const router = express.Router();
    const { 
        uploadVideoToSupabase, 
        uploadImageToSupabase,
        storageService,
        resolveToPublicUrl, 
        requireAuth, 
        consumeCredits,
        supabase,
        supabaseAdmin,
        saveLocalAsset
    } = deps;

    const getHfClient = (credentials) => {
        return createHiggsfieldClient({
            credentials: credentials.trim(),
            timeout: 900000,
            maxPollTime: 900000,
            pollInterval: 3000
        });
    };

    // Configure Higgsfield credentials from environment
    const hfCredentials = process.env.HF_CREDENTIALS || process.env.HF_KEY;
    if (hfCredentials) {
        console.log('[REMIX] ✅ Higgsfield client configured (15m polling timeout)');
    } else {
        console.warn('[REMIX] ⚠️ HF_CREDENTIALS not found in environment');
    }

    // ── Genjutsu Motion Transfer (v1.0) ───────────────────────────────────────
    router.post(['/motion-transfer', '/api/remix/motion-transfer'], async (req, res) => {
        const userId = req.headers['x-user-id'] || req.body.userId || 'anonymous';
        const { 
            prompt = '', 
            video_url, 
            videoUrl, 
            image_urls, 
            imageUrls, 
            reference_image,
            resolution = '720p'
        } = req.body;

        const rawVideo = video_url || videoUrl;
        const rawImages = image_urls || imageUrls || (reference_image ? [reference_image] : []);

        if (!rawVideo) {
            return res.status(400).json({ error: 'Source video_url is required for Motion Transfer.' });
        }

        if (!Array.isArray(rawImages) || rawImages.length === 0) {
            return res.status(400).json({ error: 'At least one reference image (image_urls) is required.' });
        }

        // Validate resolution
        const validResolutions = ['480p', '720p', '1080p'];
        const chosenResolution = validResolutions.includes(resolution) ? resolution : '720p';

        // Credit key mapping
        const creditKey = `remix_motion_transfer_${chosenResolution}`;

        try {
            // Resolve URLs if sent as data URIs / local files / supabase paths
            console.log(`[REMIX] Resolving source video and ${rawImages.length} reference image(s)...`);
            const resolvedVideoUrl = await resolveToPublicUrl(rawVideo, userId);
            
            const resolvedImageUrls = (await Promise.all(
                rawImages.map(async (img) => {
                    const url = typeof img === 'object' ? img.url : img;
                    if (!url) return null;
                    return await resolveToPublicUrl(url, userId);
                })
            )).filter(Boolean);

            if (!resolvedVideoUrl) {
                return res.status(400).json({ error: 'Failed to resolve public URL for source video.' });
            }

            if (resolvedImageUrls.length === 0) {
                return res.status(400).json({ error: 'Failed to resolve public URLs for reference images.' });
            }

            // Check and configure credentials on the fly if needed
            const activeCredentials = process.env.HF_CREDENTIALS || process.env.HF_KEY;
            if (!activeCredentials) {
                return res.status(500).json({ 
                    error: 'Motion Transfer service temporarily unavailable. Please contact support@zerolens.in' 
                });
            }

            const client = getHfClient(activeCredentials);

            console.log(`[REMIX] Submitting Motion Transfer job to Higgsfield:`, {
                model: 'higgsfield/genjutsu/motion-transfer/v1.0',
                video_url: resolvedVideoUrl.substring(0, 60) + '...',
                images_count: resolvedImageUrls.length,
                resolution: chosenResolution,
                prompt: prompt.substring(0, 40)
            });

            const result = await client.subscribe(
                'higgsfield/genjutsu/motion-transfer/v1.0',
                {
                    input: {
                        prompt: prompt || '',
                        video_url: resolvedVideoUrl,
                        image_urls: resolvedImageUrls,
                        resolution: chosenResolution
                    },
                    withPolling: true
                }
            );

            console.log(`[REMIX] Job response received:`, {
                status: result.status,
                request_id: result.request_id,
                has_video: Boolean(result.video?.url)
            });

            if (result.status === 'failed') {
                return res.status(500).json({
                    error: sanitizeServerError(result.error) || 'Motion Transfer generation could not be completed. Any deducted Shorts have been refunded. Please try again or contact support@zerolens.in',
                    requestId: result.request_id
                });
            }

            const outputVideoUrl = result.video?.url;
            if (!outputVideoUrl) {
                return res.status(500).json({
                    error: 'Motion Transfer could not complete output synthesis. Please try again or contact support@zerolens.in',
                    details: result
                });
            }

            // Optionally upload to Supabase storage if function is provided
            let persistedUrl = outputVideoUrl;
            if (typeof uploadVideoToSupabase === 'function') {
                try {
                    const saved = await uploadVideoToSupabase(outputVideoUrl, `remix_${Date.now()}.mp4`, userId);
                    if (saved) persistedUrl = saved;
                } catch (saveErr) {
                    console.warn('[REMIX] Notice: fallback to direct CDN url:', saveErr.message);
                }
            }

            // Persist to local asset record
            if (typeof saveLocalAsset === 'function' && userId) {
                try {
                    saveLocalAsset({
                        name: prompt ? `Motion Remix: ${prompt.substring(0, 50)}` : 'Motion Remix Video',
                        type: 'video',
                        url: persistedUrl,
                        user_id: userId,
                        created_at: new Date().toISOString(),
                        aspect: '16:9',
                        resolution: chosenResolution,
                        metadata: {
                            engine: 'Higgsfield Motion Transfer',
                            mode: 'motion-transfer',
                            prompt,
                            resolution: chosenResolution,
                            requestId: result.request_id,
                            zipUrl: result.zip?.url || null,
                            movUrl: result.mov?.url || null
                        }
                    });
                } catch (saveErr) { /* ignore */ }
            }

            // Persist to Supabase database assets table
            const dbClient = supabaseAdmin || supabase;
            if (dbClient && isValidUuid(userId)) {
                try {
                    await dbClient.from('assets').insert([{
                        user_id: userId,
                        type: 'video',
                        url: persistedUrl,
                        name: prompt ? `Motion Remix: ${prompt.substring(0, 50)}` : 'Motion Remix Video',
                        created_at: new Date().toISOString(),
                        model: 'higgsfield-motion-transfer',
                        metadata: {
                            engine: 'Higgsfield Motion Transfer',
                            mode: 'motion-transfer',
                            prompt,
                            resolution: chosenResolution,
                            requestId: result.request_id,
                            zipUrl: result.zip?.url || null,
                            movUrl: result.mov?.url || null
                        }
                    }]);
                    console.log(`[REMIX] Saved Motion Transfer asset to database for user: ${userId}`);
                } catch (dbErr) {
                    console.warn('[REMIX] DB assets insert warning:', dbErr.message);
                }
            }

            return res.json({
                success: true,
                status: 'completed',
                videoUrl: persistedUrl,
                originalUrl: outputVideoUrl,
                requestId: result.request_id,
                zipUrl: result.zip?.url || null,
                movUrl: result.mov?.url || null,
                meta: {
                    prompt,
                    resolution: chosenResolution,
                    creditKey
                }
            });

        } catch (error) {
            console.error('[REMIX] Error executing motion-transfer:', error);
            return res.status(500).json({
                error: sanitizeServerError(error.message) || 'Motion Transfer service temporarily unavailable. Please contact support@zerolens.in.',
                details: error.toString()
            });
        }
    });

    // ── Genjutsu Object Swap (v1.0) ───────────────────────────────────────────
    router.post(['/object-swap', '/api/remix/object-swap', '/api/object-swap'], async (req, res) => {
        const userId = req.headers['x-user-id'] || req.body.userId || 'anonymous';
        const { 
            prompt = '', 
            video_url, 
            videoUrl, 
            image_urls, 
            imageUrls, 
            reference_image,
            reference_images,
            resolution = '720p'
        } = req.body;

        const rawVideo = video_url || videoUrl;
        const rawImages = image_urls || imageUrls || reference_images || (reference_image ? [reference_image] : []);

        if (!rawVideo) {
            return res.status(400).json({ error: 'Source video_url is required for Object Swap.' });
        }

        if (!Array.isArray(rawImages) || rawImages.length === 0) {
            return res.status(400).json({ error: 'At least one reference image (image_urls) of the replacement object/item is required.' });
        }

        // Validate resolution
        const validResolutions = ['480p', '720p', '1080p'];
        const chosenResolution = validResolutions.includes(resolution) ? resolution : '720p';

        // Credit key mapping
        const creditKey = `object_swap_${chosenResolution}`;

        try {
            // Resolve URLs if sent as data URIs / local files / supabase paths
            console.log(`[OBJECT-SWAP] Resolving source video and ${rawImages.length} replacement object image(s)...`);
            const resolvedVideoUrl = await resolveToPublicUrl(rawVideo, userId);
            
            const resolvedImageUrls = (await Promise.all(
                rawImages.map(async (img) => {
                    const url = typeof img === 'object' ? img.url : img;
                    if (!url) return null;
                    return await resolveToPublicUrl(url, userId);
                })
            )).filter(Boolean);

            if (!resolvedVideoUrl) {
                return res.status(400).json({ error: 'Failed to resolve public URL for source video.' });
            }

            if (resolvedImageUrls.length === 0) {
                return res.status(400).json({ error: 'Failed to resolve public URLs for replacement object images.' });
            }

            // Check and configure credentials on the fly if needed
            const activeCredentials = process.env.HF_CREDENTIALS || process.env.HF_KEY;
            if (!activeCredentials) {
                return res.status(500).json({ 
                    error: 'Object Swap service temporarily unavailable. Please contact support@zerolens.in' 
                });
            }

            const client = getHfClient(activeCredentials);

            console.log(`[OBJECT-SWAP] Submitting Object Swap job to Higgsfield:`, {
                model: 'higgsfield/genjutsu/object-swap/v1.0',
                video_url: resolvedVideoUrl.substring(0, 60) + '...',
                images_count: resolvedImageUrls.length,
                resolution: chosenResolution,
                prompt: prompt.substring(0, 40)
            });

            const result = await client.subscribe(
                'higgsfield/genjutsu/object-swap/v1.0',
                {
                    input: {
                        prompt: prompt || '',
                        video_url: resolvedVideoUrl,
                        image_urls: resolvedImageUrls,
                        resolution: chosenResolution
                    },
                    withPolling: true
                }
            );

            console.log(`[OBJECT-SWAP] Job response received:`, {
                status: result.status,
                request_id: result.request_id,
                has_video: Boolean(result.video?.url)
            });

            if (result.status === 'failed') {
                return res.status(500).json({
                    error: sanitizeServerError(result.error) || 'Object Swap generation could not be completed. Any deducted Shorts have been refunded. Please try again or contact support@zerolens.in',
                    requestId: result.request_id
                });
            }

            const outputVideoUrl = result.video?.url;
            if (!outputVideoUrl) {
                return res.status(500).json({
                    error: 'Object Swap could not complete output synthesis. Please try again or contact support@zerolens.in',
                    details: result
                });
            }

            // Persist to Supabase if available
            let persistedUrl = outputVideoUrl;
            if (typeof uploadVideoToSupabase === 'function') {
                try {
                    const saved = await uploadVideoToSupabase(outputVideoUrl, `object_swap_${Date.now()}.mp4`, userId);
                    if (saved) persistedUrl = saved;
                } catch (saveErr) {
                    console.warn('[OBJECT-SWAP] Notice: fallback to direct CDN url:', saveErr.message);
                }
            }

            // Persist to local asset record
            if (typeof saveLocalAsset === 'function' && userId) {
                try {
                    saveLocalAsset({
                        name: prompt ? `Object Swap: ${prompt.substring(0, 50)}` : 'Object Swap Video',
                        type: 'video',
                        url: persistedUrl,
                        user_id: userId,
                        created_at: new Date().toISOString(),
                        aspect: '16:9',
                        resolution: chosenResolution,
                        metadata: {
                            engine: 'Higgsfield Object Swap',
                            mode: 'object-swap',
                            prompt,
                            resolution: chosenResolution,
                            requestId: result.request_id,
                            zipUrl: result.zip?.url || null,
                            movUrl: result.mov?.url || null,
                            jsxUrl: result.jsx?.url || null,
                            fbxUrl: result.fbx?.url || null,
                            plyUrl: result.ply?.url || null
                        }
                    });
                } catch (saveErr) { /* ignore */ }
            }

            // Persist to Supabase database assets table
            const dbClient = supabaseAdmin || supabase;
            if (dbClient && isValidUuid(userId)) {
                try {
                    await dbClient.from('assets').insert([{
                        user_id: userId,
                        type: 'video',
                        url: persistedUrl,
                        name: prompt ? `Object Swap: ${prompt.substring(0, 50)}` : 'Object Swap Video',
                        created_at: new Date().toISOString(),
                        model: 'higgsfield-object-swap',
                        metadata: {
                            engine: 'Higgsfield Object Swap',
                            mode: 'object-swap',
                            prompt,
                            resolution: chosenResolution,
                            requestId: result.request_id,
                            zipUrl: result.zip?.url || null,
                            movUrl: result.mov?.url || null,
                            jsxUrl: result.jsx?.url || null,
                            fbxUrl: result.fbx?.url || null,
                            plyUrl: result.ply?.url || null
                        }
                    }]);
                    console.log(`[OBJECT-SWAP] Saved Object Swap asset to database for user: ${userId}`);
                } catch (dbErr) {
                    console.warn('[OBJECT-SWAP] DB assets insert warning:', dbErr.message);
                }
            }

            return res.json({
                success: true,
                status: 'completed',
                videoUrl: persistedUrl,
                originalUrl: outputVideoUrl,
                requestId: result.request_id,
                zipUrl: result.zip?.url || null,
                movUrl: result.mov?.url || null,
                jsxUrl: result.jsx?.url || null,
                fbxUrl: result.fbx?.url || null,
                plyUrl: result.ply?.url || null,
                meta: {
                    prompt,
                    resolution: chosenResolution,
                    creditKey
                }
            });

        } catch (error) {
            console.error('[OBJECT-SWAP] Error executing object-swap:', error);
            return res.status(500).json({
                error: sanitizeServerError(error.message) || 'Object Swap service temporarily unavailable. Please contact support@zerolens.in.',
                details: error.toString()
            });
        }
    });

    // ── Check Higgsfield Job Status by Request ID ────────────────────────────
    router.get(['/status/:requestId', '/api/remix/status/:requestId'], async (req, res) => {
        const { requestId } = req.params;
        const activeCredentials = process.env.HF_CREDENTIALS || process.env.HF_KEY;
        if (!activeCredentials) {
            return res.status(500).json({ error: 'Service temporarily unavailable. Please contact support@zerolens.in.' });
        }
        try {
            const parts = activeCredentials.trim().split(':');
            if (parts.length !== 2) {
                return res.status(500).json({ error: 'Invalid HF_CREDENTIALS format.' });
            }
            const authHeader = `Key ${parts[0]}:${parts[1]}`;
            const ep = `https://api.higgsfield.ai/v1/requests/${requestId}/status`;
            const resp = await fetch(ep, {
                headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' }
            });
            const data = await resp.json();
            return res.json({
                success: true,
                status: data.status,
                requestId,
                videoUrl: data.video?.url || null,
                zipUrl: data.zip?.url || null,
                movUrl: data.mov?.url || null,
                raw: data
            });
        } catch (err) {
            return res.status(500).json({ error: 'Status check temporarily unavailable. Please contact support@zerolens.in.' });
        }
    });

    // ── AI Influencer Options Catalog ─────────────────────────────────────────
    router.get(['/ai-influencer/options', '/api/remix/ai-influencer/options', '/api/ai-influencer/options'], async (req, res) => {
        try {
            const resp = await fetch('https://api.higgsfield.ai/models/higgsfield/ai-influencer/options');
            if (!resp.ok) {
                return res.status(resp.status).json({ error: 'Options catalog temporarily unavailable.' });
            }
            const catalog = await resp.json();
            return res.json({ success: true, catalog });
        } catch (err) {
            console.error('[AI-INFLUENCER] Error fetching options catalog:', err);
            return res.status(500).json({ error: 'Options catalog temporarily unavailable.' });
        }
    });

    // ── Higgsfield AI Influencer Character Sheet Generation (v1.0) ───────────
    router.post(['/ai-influencer', '/api/remix/ai-influencer', '/api/ai-influencer'], async (req, res) => {
        const userId = req.headers['x-user-id'] || req.body.userId || 'anonymous';
        const {
            tier = 'normal',
            brief = '',
            image_url = null,
            imageUrl = null,
            item_image_urls = [],
            itemImageUrls = [],
            selection = {},
            seed = null,
            variation_index = 0,
            variationIndex = 0,
            body_color = null,
            bodyColor = null,
            pinned_species = null,
            pinnedSpecies = null,
            trait_variants = null
        } = req.body;

        const activeTier = tier || 'normal';
        const rawImageUrl = image_url || imageUrl || null;
        const rawItemImageUrls = (item_image_urls && item_image_urls.length > 0) ? item_image_urls : itemImageUrls;

        try {
            console.log(`[AI-INFLUENCER] Resolving input reference photos if provided...`);
            let resolvedImageUrl = null;
            if (rawImageUrl) {
                resolvedImageUrl = await resolveToPublicUrl(rawImageUrl, userId);
            }

            let resolvedItemImageUrls = [];
            if (Array.isArray(rawItemImageUrls) && rawItemImageUrls.length > 0) {
                resolvedItemImageUrls = (await Promise.all(
                    rawItemImageUrls.map(async (img) => {
                        const url = typeof img === 'object' ? img.url : img;
                        if (!url) return null;
                        return await resolveToPublicUrl(url, userId);
                    })
                )).filter(Boolean).slice(0, 3);
            }

            const activeCredentials = process.env.HF_CREDENTIALS || process.env.HF_KEY;
            if (!activeCredentials) {
                return res.status(500).json({
                    error: 'AI Influencer service temporarily unavailable. Please contact support@zerolens.in'
                });
            }

            const client = getHfClient(activeCredentials);

            const isHuman = ['normal', 'freak', 'total'].includes(activeTier);

            const inputPayload = {
                tier: activeTier,
                brief: (brief || '').substring(0, 4000),
                image_url: resolvedImageUrl || null,
                item_image_urls: resolvedItemImageUrls || [],
                selection: selection || {},
                seed: (seed !== null && seed !== undefined && !isNaN(Number(seed))) ? Math.max(1, Math.min(1000000, Number(seed))) : null,
                variation_index: isHuman ? 0 : Math.max(0, Number(variation_index || variationIndex || 0)),
                body_color: isHuman ? null : (body_color || bodyColor || null),
                pinned_species: (activeTier === 'insects') ? (pinned_species || pinnedSpecies || null) : null,
                trait_variants: trait_variants || null
            };

            console.log(`[AI-INFLUENCER] Submitting AI Influencer job to Higgsfield:`, {
                tier: activeTier,
                has_identity_photo: Boolean(resolvedImageUrl),
                item_images_count: resolvedItemImageUrls.length,
                selection_keys: Object.keys(selection || {}),
                seed: inputPayload.seed
            });

            const result = await client.subscribe(
                'higgsfield/ai-influencer',
                {
                    input: inputPayload,
                    withPolling: true
                }
            );

            console.log(`[AI-INFLUENCER] Job response received:`, {
                status: result.status,
                request_id: result.request_id,
                images_count: result.images?.length || 0
            });

            if (result.status === 'failed') {
                return res.status(500).json({
                    error: sanitizeServerError(result.error) || 'AI Influencer generation could not be completed. Any deducted Shorts have been refunded. Please try again or contact support@zerolens.in',
                    requestId: result.request_id
                });
            }

            const outputImageUrl = result.images?.[0]?.url;
            if (!outputImageUrl) {
                return res.status(500).json({
                    error: 'AI Influencer sheet could not complete synthesis. Please try again or contact support@zerolens.in',
                    details: result
                });
            }

            let persistedUrl = outputImageUrl;
            try {
                let imgBuffer = null;
                if (typeof outputImageUrl === 'string' && (outputImageUrl.startsWith('http://') || outputImageUrl.startsWith('https://'))) {
                    const imgResp = await fetch(outputImageUrl);
                    if (imgResp.ok) {
                        const ab = await imgResp.arrayBuffer();
                        imgBuffer = Buffer.from(ab);
                    }
                } else if (typeof outputImageUrl === 'string' && outputImageUrl.startsWith('data:')) {
                    imgBuffer = Buffer.from(outputImageUrl.split(',')[1], 'base64');
                }

                if (imgBuffer && storageService && typeof storageService.uploadToGCS === 'function') {
                    const filename = `ai_influencer_${Date.now()}.png`;
                    const key = `users/${userId || 'anon'}/generated/${filename}`;
                    const saved = await storageService.uploadToGCS(imgBuffer, key, 'image/png');
                    if (saved) persistedUrl = saved;
                }
            } catch (saveErr) {
                console.warn('[AI-INFLUENCER] Notice: fallback to direct CDN url:', saveErr.message);
            }

            // Persist to local asset record
            if (typeof saveLocalAsset === 'function' && userId) {
                try {
                    saveLocalAsset({
                        name: brief ? `AI Influencer: ${brief.substring(0, 50)}` : 'AI Influencer Sheet',
                        type: 'image',
                        url: persistedUrl,
                        user_id: userId,
                        created_at: new Date().toISOString(),
                        aspect: '16:9',
                        resolution: '2K',
                        metadata: {
                            engine: 'Higgsfield AI Influencer',
                            mode: 'ai-influencer',
                            tier: activeTier,
                            brief,
                            prompt: brief,
                            seed: inputPayload.seed,
                            selection,
                            requestId: result.request_id
                        }
                    });
                } catch (saveErr) { /* ignore */ }
            }

            // Persist to Supabase database assets table
            const dbClient = supabaseAdmin || supabase;
            if (dbClient && isValidUuid(userId)) {
                try {
                    await dbClient.from('assets').insert([{
                        user_id: userId,
                        type: 'image',
                        url: persistedUrl,
                        name: brief ? `AI Influencer: ${brief.substring(0, 50)}` : 'AI Influencer Sheet',
                        created_at: new Date().toISOString(),
                        model: 'higgsfield-ai-influencer',
                        metadata: {
                            engine: 'Higgsfield AI Influencer',
                            mode: 'ai-influencer',
                            tier: activeTier,
                            brief,
                            prompt: brief,
                            seed: inputPayload.seed,
                            selection,
                            requestId: result.request_id
                        }
                    }]);
                    console.log(`[AI-INFLUENCER] Saved AI Influencer character sheet asset to database for user: ${userId}`);
                } catch (dbErr) {
                    console.warn('[AI-INFLUENCER] DB assets insert warning:', dbErr.message);
                }
            }

            return res.json({
                success: true,
                status: 'completed',
                imageUrl: persistedUrl,
                originalUrl: outputImageUrl,
                images: result.images || [{ url: persistedUrl }],
                requestId: result.request_id,
                meta: {
                    tier: activeTier,
                    seed: inputPayload.seed,
                    selection,
                    creditCost: 26
                }
            });

        } catch (error) {
            console.error('[AI-INFLUENCER] Error executing ai-influencer:', error);
            return res.status(500).json({
                error: sanitizeServerError(error.message) || 'AI Influencer service temporarily unavailable. Please contact support@zerolens.in.',
                details: error.toString()
            });
        }
    });

    return router;
}

