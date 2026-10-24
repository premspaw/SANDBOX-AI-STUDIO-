import express from 'express';
import {createUtilityAuth} from '../utils/utilityAuth.js';
import { createHiggsfieldClient } from '@higgsfield/client/v2';
import fetch from 'node-fetch';
import multer from 'multer';

export default function createAdsStudioRouter(deps) {
    const router = express.Router();
    const authenticate=createUtilityAuth(deps.requireAuth);
    const {
        requireAuth,
        claimOrCreateSpend,
        consumeCredits,
        handleOpenAI,
        handleGoogle,
        uploadImageToSupabase,
        storageService,
        supabaseAdmin
    } = deps;

    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

    const getHfClient = (credentials) => {
        return createHiggsfieldClient({
            credentials: credentials.trim(),
            timeout: 600000,
            maxPollTime: 600000,
            pollInterval: 3000
        });
    };

    const getActiveHfKey = (req) => {
        return req.headers['x-hf-key'] ||
            req.headers['x-admin-trial-key'] ||
            process.env.HF_CREDENTIALS ||
            process.env.HF_KEY ||
            null;
    };

    /**
     * Upload product reference image for Ads Studio (converts uploaded file/buffer to public URL)
     */
    router.post(['/upload-asset', '/ads-studio/upload-asset'], authenticate, upload.single('image'), async (req, res) => {
        try {
            const userId = req.utilityUser.id;
            let buffer = null;
            let mimeType = 'image/png';

            if (req.file) {
                buffer = req.file.buffer;
                mimeType = req.file.mimetype || 'image/png';
            } else if (req.body.image) {
                const b64 = req.body.image;
                const matches = b64.match(/^data:([^;]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    mimeType = matches[1];
                    buffer = Buffer.from(matches[2], 'base64');
                } else {
                    buffer = Buffer.from(b64, 'base64');
                }
            }

            if(buffer && (buffer.length>25*1024*1024 || !['image/jpeg','image/png','image/webp'].includes(mimeType)))return res.status(400).json({error:'Use a JPEG, PNG or WebP up to 25 MB.'});
            if (!buffer) {
                return res.status(400).json({ error: 'No image file or base64 provided.' });
            }

            let publicUrl = null;
            if (typeof uploadImageToSupabase === 'function') {
                try {
                    publicUrl = await uploadImageToSupabase(
                        buffer,
                        userId,
                        mimeType,
                        undefined,
                        'marketing-ads',
                        '1:1',
                        'Ads Studio Product Asset'
                    );
                } catch (upErr) {
                    console.warn('[AdsStudio-Upload] Cloud storage upload failed, falling back to data URL:', upErr.message);
                }
            }

            if (!publicUrl) {
                publicUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
            }

            res.json({ success: true, url: publicUrl });
        } catch (err) {
            console.error('[AdsStudio-Upload] Error:', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * Generate Ads via Ads Studio Workflow
     * Supports:
     * - 'higgsfield/ads-studio/v1.0' (Official Higgsfield Ads Studio)
     * - 'openai-2.5-sunburst' / 'openai-2.5-flare' (Our custom high-conversion commercial workflow)
     * - 'nano-banana-pro' (Google Nano Banana 4K)
     */
    router.post(['/generate', '/ads-studio/generate'], authenticate, async (req, res) => {
        const userId = req.utilityUser.id;
        const {
            prompt = '',
            niche = '',
            target_audience = '',
            language = '',
            aspect_ratio = '1:1',
            batch_size = 1,
            image_urls = [],
            engine = 'higgsfield/ads-studio/v1.0',
            sync = true
        } = req.body;

        if (typeof prompt !== 'string' || !prompt.trim() || prompt.length>20000) {
            return res.status(400).json({ error: 'Ad brief / prompt is required.' });
        }

        if(!Array.isArray(image_urls)||image_urls.length>8||image_urls.some(u=>typeof u!=='string'||u.length>5000))return res.status(400).json({error:'Invalid reference images'});
        if(!claimOrCreateSpend)return res.status(503).json({error:'Billing service unavailable'});
        const safeBatchSize = Math.max(1, Math.min(8, Number(batch_size) || 1));
        const activeHfKey = getActiveHfKey(req);
        const engineLower = (engine || '').toLowerCase();

        // 1. Calculate and charge credits
        let costPerAd = 3; // Higgsfield standard wholesale margin: 3 Shorts
        if (engineLower.includes('sunburst')) costPerAd = 2.5;
        else if (engineLower.includes('flare')) costPerAd = 1.5;
        else if (engineLower.includes('nano-banana') || engineLower.includes('gemini')) costPerAd = 1;
        
        const totalCredits = costPerAd * safeBatchSize;

        let spendSuccess = false;
        try {
            if (userId && userId !== 'anonymous' && claimOrCreateSpend) {
                await claimOrCreateSpend(userId, totalCredits, `ads_studio_${engineLower}`);
                spendSuccess = true;
            }
        } catch (credErr) {
            return res.status(402).json({
                error: credErr.message || `Insufficient Shorts! You need ${totalCredits}⚡ credits to generate ${safeBatchSize} ad creative(s).`
            });
        }

        try {
            // ── HIGGSFIELD ADS STUDIO v1.0 WORKFLOW ─────────────────────────
            if (engineLower === 'higgsfield/ads-studio/v1.0' || engineLower === 'higgsfield-ads-studio') {
                if (!activeHfKey) {
                    throw new Error('Higgsfield credentials (HF_CREDENTIALS / HF_KEY) are not configured. Switch engine to OpenAI 2.5 Sunflare or provide HF_CREDENTIALS in Settings.');
                }

                console.log(`[ADS-STUDIO] Submitting to Higgsfield (${engine}):`, {
                    prompt: prompt.substring(0, 60),
                    niche,
                    target_audience,
                    aspect_ratio,
                    batch_size: safeBatchSize,
                    image_urls_count: image_urls.length
                });

                const client = getHfClient(activeHfKey);
                const inputPayload = {
                    prompt: prompt.trim(),
                    niche: niche || '',
                    target_audience: target_audience || '',
                    language: language || '',
                    batch_size: safeBatchSize,
                    aspect_ratio: aspect_ratio || '1:1',
                    image_urls: Array.isArray(image_urls) ? image_urls : []
                };

                const hfResult = await client.subscribe(
                    'higgsfield/ads-studio/v1.0',
                    {
                        input: inputPayload,
                        withPolling: Boolean(sync)
                    }
                );

                if(hfResult?.request_id)await deps.updateJobStatus?.(hfResult.request_id,hfResult.status,{userId});
                console.log(`[ADS-STUDIO] Response status: ${hfResult?.status}, request_id: ${hfResult?.request_id}`);

                if (hfResult.status === 'failed') {
                    throw new Error(hfResult.error || 'Ads Studio generation failed on upstream provider.');
                }

                // If async requested and still queued/in_progress
                if (!sync && (hfResult.status === 'queued' || hfResult.status === 'in_progress')) {
                    return res.json({
                        success: true,
                        status: hfResult.status,
                        request_id: hfResult.request_id,
                        status_url: hfResult.status_url,
                        creditsDeducted: totalCredits
                    });
                }

                // Format completed images
                const returnedImages = Array.isArray(hfResult.images) ? hfResult.images : [];
                const finalImages = returnedImages.map((img, idx) => ({
                    url: img.url,
                    aspect_ratio,
                    batch_index: idx + 1,
                    engine: 'higgsfield/ads-studio/v1.0'
                }));

                return res.json({
                    success: true,
                    status: 'completed',
                    request_id: hfResult.request_id,
                    images: finalImages,
                    engine: 'higgsfield/ads-studio/v1.0',
                    creditsDeducted: totalCredits
                });
            }

            // ── OUR CUSTOM OPENAI 2.5 SUNBURST / FLARE ADS WORKFLOW ──────────
            if (engineLower.includes('openai') || engineLower.includes('sunburst') || engineLower.includes('flare')) {
                console.log(`[ADS-STUDIO] Generating via OpenAI 2.5 Commercial Ad Workflow:`, { engine, prompt: prompt.substring(0, 50) });

                // Construct high-converting commercial ad prompt
                const enhancedAdPrompt = `COMMERCIAL ADVERTISEMENT CREATIVE:
Brief / Vision: ${prompt.trim()}
${niche ? `Industry Niche: ${niche}` : ''}
${target_audience ? `Target Audience & Psychographics: ${target_audience}` : ''}
Style & Layout: Billboard-grade commercial advertising photography, luxury studio lighting, high contrast visual hook, crisp product placement, clean negative space for typography and headlines, modern editorial palette. Zero watermarks, zero clutter.`;

                // Map aspect ratio to dimensions
                let size = '1024x1024';
                if (aspect_ratio === '9:16' || aspect_ratio === '4:5' || aspect_ratio === '3:4') size = '1024x1536';
                else if (aspect_ratio === '16:9' || aspect_ratio === '21:9' || aspect_ratio === '3:2') size = '1536x1024';

                const generatedImages = [];
                const targetModel = engineLower.includes('flare') ? 'gpt-image-2.5-flare' : 'gpt-image-2.5-sunburst';

                // Generate batch
                for (let i = 0; i < safeBatchSize; i++) {
                    const mockReq = {
                        body: {
                            model: targetModel,
                            prompt: enhancedAdPrompt + (safeBatchSize > 1 ? ` (Creative Variation ${i + 1})` : ''),
                            size,
                            quality: 'hd',
                            userId,
                            folder: 'marketing-ads',
                            image: image_urls[0] || null,
                            referenceImages: image_urls
                        }
                    };

                    let candidateUrl = null;
                    let genError = null;
                    const mockRes = {
                        json: (d) => {
                            if (d.url) candidateUrl = d.url;
                            if (d.error) genError = d.error;
                            return d;
                        },
                        status: () => mockRes,
                        headersSent: false
                    };

                    await handleOpenAI(mockReq, mockRes);

                    if (candidateUrl) {
                        generatedImages.push({
                            url: candidateUrl,
                            aspect_ratio,
                            batch_index: i + 1,
                            engine: targetModel
                        });
                    } else if (genError) {
                        throw new Error(genError);
                    }
                }

                if (generatedImages.length === 0) {
                    throw new Error("No ad creatives were returned by the AI engine.");
                }

                return res.json({
                    success: true,
                    status: 'completed',
                    images: generatedImages,
                    engine: targetModel,
                    creditsDeducted: totalCredits
                });
            }

            // ── GOOGLE NANO BANANA PRO WORKFLOW ────────────────────────────
            if (engineLower.includes('nano-banana') || engineLower.includes('gemini')) {
                console.log(`[ADS-STUDIO] Generating via Google Nano Banana Pro:`, { prompt: prompt.substring(0, 50) });

                const enhancedAdPrompt = `Elite commercial product advertisement. ${prompt.trim()}. Niche: ${niche || 'commercial'}. Target: ${target_audience || 'general'}. Crisp 4K commercial photography, studio strobe lighting, razor sharp details, magazine ad layout.`;

                // Google Imagen 3 / Gemini Pro supports: '1:1', '3:4', '4:3', '9:16', '16:9'
                let googleRatio = '1:1';
                if (['1:1', '3:4', '4:3', '9:16', '16:9'].includes(aspect_ratio)) {
                    googleRatio = aspect_ratio;
                } else if (aspect_ratio === '4:5') {
                    googleRatio = '3:4'; // Closest portrait match
                } else if (aspect_ratio === '21:9') {
                    googleRatio = '16:9'; // Closest landscape match
                }

                const mockReq = {
                    body: {
                        model: 'gemini-3-pro-image-preview',
                        prompt: enhancedAdPrompt,
                        aspect_ratio: googleRatio,
                        quality: '4K',
                        userId,
                        folder: 'marketing-ads',
                        referenceImages: image_urls
                    }
                };

                let candidateUrl = null;
                let genError = null;
                const mockRes = {
                    json: (d) => {
                        if (d.url) candidateUrl = d.url;
                        if (d.error) genError = d.error;
                        return d;
                    },
                    status: () => mockRes,
                    headersSent: false
                };

                await handleGoogle(mockReq, mockRes);

                if (!candidateUrl) {
                    throw new Error(genError || "Nano Banana generation returned no URL.");
                }

                return res.json({
                    success: true,
                    status: 'completed',
                    images: [{ url: candidateUrl, aspect_ratio, batch_index: 1, engine: 'nano-banana-pro' }],
                    engine: 'nano-banana-pro',
                    creditsDeducted: totalCredits
                });
            }

            throw new Error(`Unsupported engine: ${engine}`);

        } catch (error) {
            console.error('[ADS-STUDIO] Generation failed:', error.message);

            if(spendSuccess)await deps.refundCredits?.(userId,totalCredits).catch(()=>{});

            return res.status(500).json({
                error: error.message || 'Ads Studio generation failed.'
            });
        }
    });

    /**
     * Poll status for async Higgsfield requests
     */
    router.get(['/status/:requestId', '/ads-studio/status/:requestId'], authenticate, async (req, res) => {
        const { requestId } = req.params;
        const job=await deps.getJobStatus?.(requestId);
        if(!job || job.userId!==req.utilityUser.id)return res.status(404).json({error:'Job not found'});
        const activeHfKey = getActiveHfKey(req);

        if (!activeHfKey) {
            return res.status(400).json({ error: 'Higgsfield credentials not available.' });
        }

        try {
            const parts = activeHfKey.trim().split(':');
            const authHeader = parts.length === 2 ? `Key ${parts[0]}:${parts[1]}` : `Bearer ${activeHfKey.trim()}`;
            const ep = `https://api.higgsfield.ai/requests/${requestId}/status`;

            const resp = await fetch(ep, {
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                signal: AbortSignal.timeout(15000)
            });

            if (!resp.ok) {
                return res.json({ success: true, status: 'processing', requestId });
            }

            const data = await resp.json();
            return res.json({
                success: true,
                status: data.status,
                requestId,
                images: data.images || []
            });
        } catch (err) {
            console.error('[ADS-STUDIO-STATUS] Error:', err.message);
            res.json({ success: true, status: 'processing', requestId });
        }
    });

    return router;
}
