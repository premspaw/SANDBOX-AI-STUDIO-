import express from 'express';
import { config as configHiggsfield, higgsfield } from '@higgsfield/client/v2';

export default function createRouter(deps) {
    const router = express.Router();
    const { uploadVideoToSupabase, resolveToPublicUrl, requireAuth, consumeCredits } = deps;

    // Configure Higgsfield credentials from environment
    const hfCredentials = process.env.HF_CREDENTIALS || process.env.HF_KEY;
    if (hfCredentials) {
        configHiggsfield({
            credentials: hfCredentials.trim(),
        });
        console.log('[REMIX] ✅ Higgsfield client initialized successfully');
    } else {
        console.warn('[REMIX] ⚠️ HF_CREDENTIALS not found in environment');
    }

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
                    error: 'HF_CREDENTIALS not configured on the server. Please set HF_CREDENTIALS in .env.local' 
                });
            }

            configHiggsfield({
                credentials: activeCredentials.trim(),
            });

            console.log(`[REMIX] Submitting Motion Transfer job to Higgsfield:`, {
                model: 'higgsfield/genjutsu/motion-transfer/v1.0',
                video_url: resolvedVideoUrl.substring(0, 60) + '...',
                images_count: resolvedImageUrls.length,
                resolution: chosenResolution,
                prompt: prompt.substring(0, 40)
            });

            const result = await higgsfield.subscribe(
                'higgsfield/genjutsu/motion-transfer/v1.0',
                {
                    input: {
                        prompt: prompt || '',
                        video_url: resolvedVideoUrl,
                        image_urls: resolvedImageUrls,
                        resolution: chosenResolution
                    },
                    withPolling: true,
                }
            );

            console.log(`[REMIX] Job response received:`, {
                status: result.status,
                request_id: result.request_id,
                has_video: Boolean(result.video?.url)
            });

            if (result.status === 'failed') {
                return res.status(500).json({
                    error: result.error || 'Motion Transfer generation failed on Higgsfield engine.',
                    requestId: result.request_id
                });
            }

            const outputVideoUrl = result.video?.url;
            if (!outputVideoUrl) {
                return res.status(500).json({
                    error: 'Higgsfield did not return a valid video output URL.',
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
                error: error.message || 'Internal server error while executing Motion Transfer.',
                details: error.toString()
            });
        }
    });

    return router;
}
