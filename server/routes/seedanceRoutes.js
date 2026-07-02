import express from 'express';

export default function createRouter(deps) {
    const router = express.Router();
    const { uploadVideoToSupabase, resolveToPublicUrl, requireAuth, consumeCredits, claimOrCreateSpend } = deps;

    const generateKieTask = async ({
        prompt,
        aspectRatio,
        duration,
        resolution,
        generateAudio,
        resolvedIdentity,
        resolvedVideos,
        resolvedAudios,
        resolvedFirstFrame,
        resolvedLastFrame,
        targetModel
    }) => {
        const kieApiKey = process.env.KIE_API_KEY;
        if (!kieApiKey) {
            throw new Error("KIE_API_KEY is not configured on the server, cannot fall back.");
        }

        const input = {
            prompt: prompt,
            aspect_ratio: (aspectRatio || "16:9"),
            duration: Number(duration) || 5,
            resolution: resolution || '720p',
            generate_audio: !!generateAudio,
            web_search: false
        };
        if (resolvedFirstFrame) input.first_frame_url = resolvedFirstFrame;
        if (resolvedLastFrame) input.last_frame_url = resolvedLastFrame;
        if (resolvedIdentity?.length > 0) input.reference_image_urls = resolvedIdentity;
        if (resolvedVideos?.length > 0) input.reference_video_urls = resolvedVideos;
        if (resolvedAudios?.length > 0) input.reference_audio_urls = resolvedAudios;

        console.log(`[SEEDANCE-KIE-FALLBACK] Creating task via Kie.ai:`, JSON.stringify(input, null, 2));

        const createResp = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${kieApiKey}`
            },
            body: JSON.stringify({
                model: targetModel || 'bytedance/seedance-2-fast',
                input
            })
        });

        const createData = await createResp.json();
        if (createData.code !== 200) {
            throw new Error(`Kie.ai Error: ${createData.msg || JSON.stringify(createData)}`);
        }
        const taskId = createData.data?.taskId;
        if (!taskId) {
            throw new Error("Kie.ai task creation succeeded but did not return a taskId.");
        }
        return taskId;
    };

    // POST /api/seedance/generate
    router.post('/seedance/generate', async (req, res) => {
        try {
            let user;
            try {
                user = await requireAuth(req);
            } catch (authErr) {
                if (process.env.NODE_ENV === 'production') {
                    return res.status(401).json({ error: 'Authentication required to generate video.' });
                }
            }

            const {
                engine, // 'seedance-fast' or 'seedace'
                prompt, // Legacy support just in case
                firstFrame,
                lastFrame,
                identity_images,
                seedanceContentArray,
                duration,
                aspectRatio,
                resolution,
                userId,
                generateAudio
            } = req.body;

            const targetUserId = user ? user.id : userId;

            // Deduct credits: dynamic duration-based cost with 30% margin (same as veo-3.1 style, rounded off)
            let requiredCredits = 20; // fallback default
            const durationNum = Number(duration) || 5;
            const resLower = (resolution || '720p').toLowerCase();

            if (engine === 'seedance-fast') {
                const costPerSec = resLower === '480p' ? 4 : 10; // halved from 9 : 20
                requiredCredits = costPerSec * durationNum;
            } else if (engine === 'seedace') {
                const costPerSec = resLower === '4k' ? 62 : (resLower === '1080p' ? 30 : (resLower === '480p' ? 5 : 12)); // halved from 124 : 61 : 11 : 24
                requiredCredits = costPerSec * durationNum;
            } else if (engine === 'seedance-mini') {
                const costPerSec = resLower === '480p' ? 3 : 6; // halved from 6 : 12
                requiredCredits = costPerSec * durationNum;
            }

            if (targetUserId) {
                const creditReason = req.body.creditReason || 'cinematic_video_generation';
                console.log(`[SEEDANCE-GEN] Consuming/Claiming ${requiredCredits} credits for user: ${targetUserId} (duration: ${durationNum}s, res: ${resLower}, reason: ${creditReason})`);
                await claimOrCreateSpend(targetUserId, requiredCredits, creditReason);
            }

            console.log(`[SEEDANCE-GEN] Initiating generation | engine: ${engine} | duration: ${duration}s | ratio: ${aspectRatio} | audio: ${generateAudio}`);

            let content = [];
            let resolvedFirstFrame = null;
            let resolvedLastFrame = null;
            let resolvedIdentity = [];
            let finalPrompt = prompt || '';

            if (seedanceContentArray && seedanceContentArray.length > 0) {
                // New multimodal format
                content = await Promise.all(
                    seedanceContentArray.map(async (item) => {
                        const newItem = { ...item };
                        if (newItem.type === 'image_url' && newItem.image_url?.url) {
                            newItem.image_url.url = await resolveToPublicUrl(newItem.image_url.url, userId);
                        } else if (newItem.type === 'video_url' && newItem.video_url?.url) {
                            newItem.video_url.url = await resolveToPublicUrl(newItem.video_url.url, userId);
                        } else if (newItem.type === 'audio_url' && newItem.audio_url?.url) {
                            newItem.audio_url.url = await resolveToPublicUrl(newItem.audio_url.url, userId);
                        }
                        return newItem;
                    })
                );

                // Backwards extract for Kie.ai Fallback
                finalPrompt = content.find(c => c.type === 'text')?.text || '';
                resolvedFirstFrame = content.find(c => c.role === 'first_frame')?.image_url?.url;
                resolvedLastFrame = content.find(c => c.role === 'last_frame')?.image_url?.url;
                resolvedIdentity = content.filter(c => c.role === 'reference_image' && c.image_url?.url).map(c => c.image_url.url);
            } else {
                // Legacy image-only format support (fallback)
                const resolvedImages = await Promise.all([
                    resolveToPublicUrl(firstFrame, userId),
                    resolveToPublicUrl(lastFrame, userId),
                    ...(Array.isArray(identity_images) ? identity_images.map(img => resolveToPublicUrl(img, userId)) : [])
                ]);

                resolvedFirstFrame = resolvedImages[0];
                resolvedLastFrame = resolvedImages[1];
                resolvedIdentity = resolvedImages.slice(2).filter(Boolean);

                content.push({ type: "text", text: prompt });
                if (resolvedFirstFrame) content.push({ type: "image_url", image_url: { url: resolvedFirstFrame }, role: "reference_image" });
                if (resolvedLastFrame) content.push({ type: "image_url", image_url: { url: resolvedLastFrame }, role: "reference_image" });
                resolvedIdentity.forEach(url => {
                    if (url !== resolvedFirstFrame && url !== resolvedLastFrame) {
                        content.push({ type: "image_url", image_url: { url }, role: "reference_image" });
                    }
                });
            }

            // Extract video and audio references from resolved content array
            let resolvedVideos = [];
            let resolvedAudios = [];
            if (content.length > 0) {
                resolvedVideos = content
                    .filter(c => c.role === 'reference_video' && (c.video_url?.url || c.image_url?.url))
                    .map(c => c.video_url?.url || c.image_url?.url);
                resolvedAudios = content
                    .filter(c => c.role === 'reference_audio' && (c.audio_url?.url || c.image_url?.url))
                    .map(c => c.audio_url?.url || c.image_url?.url);
            }

            // Handle seedance-fast model
            if (engine === 'seedance-fast') {
                const apiKey = process.env.ARK_API_KEY;
                const preferKie = process.env.PREFER_KIE === 'true';

                if (preferKie || !apiKey) {
                    const kieApiKey = process.env.KIE_API_KEY;
                    if (!kieApiKey) {
                        throw new Error("PREFER_KIE is set or Ark API Key is missing, but KIE_API_KEY is not configured on the server.");
                    }
                    console.log(`[SEEDANCE-FAST] Routing directly to Kie.ai (preferKie: ${preferKie}, hasArkKey: ${!!apiKey})`);
                    const taskId = await generateKieTask({
                        prompt: finalPrompt,
                        aspectRatio,
                        duration,
                        resolution,
                        generateAudio,
                        resolvedIdentity,
                        resolvedVideos,
                        resolvedAudios,
                        resolvedFirstFrame,
                        resolvedLastFrame,
                        targetModel: 'bytedance/seedance-2-fast'
                    });
                    return res.json({ success: true, requestId: taskId, engine: 'seedace-kie' });
                }

                // If user specifies a specific endpoint ID, use that, otherwise default to the standard model ID
                const targetModel = req.body.model || "dreamina-seedance-2-0-fast-260128";

                const payload = {
                    model: targetModel,
                    content,
                    generate_audio: !!generateAudio,
                    ratio: aspectRatio || "16:9",
                    duration: Number(duration) || 5,
                    watermark: false
                };

                console.log(`[SEEDANCE-FAST] Creating task via BytePlus Ark:`, JSON.stringify(payload, null, 2));

                const createResp = await fetch("https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(payload)
                });

                const createData = await createResp.json();
                if (createData.error) {
                    let errorMessage = createData.error.message || JSON.stringify(createData.error);
                    if (errorMessage.toLowerCase().includes("real person")) {
                        errorMessage = "The reference image was flagged by safety filters for containing a real person. BytePlus Ark policy prohibits generating videos from real-person photos. Suggestion: Use a stylized/drawn reference image, or switch to a different engine (like Veo 3.1) that has different safety filters.";
                    }
                    const kieApiKey = process.env.KIE_API_KEY;
                    if (kieApiKey) {
                        console.log(`[SEEDANCE-FAST-FALLBACK] Ark task creation failed ("${errorMessage}"). Falling back to Kie.ai...`);
                        try {
                            const taskId = await generateKieTask({
                                prompt: finalPrompt,
                                aspectRatio,
                                duration,
                                resolution,
                                generateAudio,
                                resolvedIdentity,
                                resolvedVideos,
                                resolvedAudios,
                                resolvedFirstFrame,
                                resolvedLastFrame,
                                targetModel: 'bytedance/seedance-2-fast'
                            });
                            console.log(`[SEEDANCE-FAST-FALLBACK] Fallback task created on Kie.ai successfully: ${taskId}`);
                            return res.json({ success: true, requestId: taskId, engine: 'seedace-kie' });
                        } catch (fallbackErr) {
                            console.error(`[SEEDANCE-FAST-FALLBACK] Kie.ai fallback also failed:`, fallbackErr);
                            throw new Error(`BytePlus Ark request failed: "${errorMessage}", and Kie.ai fallback failed: "${fallbackErr.message}"`);
                        }
                    }
                    throw new Error(`BytePlus Ark Error: ${errorMessage}`);
                }
                if (!createData.id) {
                    throw new Error(`BytePlus Ark did not return a task ID. Response: ${JSON.stringify(createData)}`);
                }

                console.log(`[SEEDANCE-FAST] Task created successfully: ${createData.id}`);
                return res.json({ success: true, requestId: createData.id, engine: 'seedance-fast' });
            }

            // Handle seedace (Seedance 2.0) model
            if (engine === 'seedace') {
                // We support BOTH Kie.ai and BytePlus Ark for Seedance 2.0 based on env config
                const kieApiKey = process.env.KIE_API_KEY;
                const arkApiKey = process.env.ARK_API_KEY;
                const preferKie = process.env.PREFER_KIE === 'true';

                // Prefer Volcano/BytePlus Ark if configured and model starts with dreamina, and preferKie is false
                if (arkApiKey && !preferKie && (req.body.model || !kieApiKey)) {
                    const targetModel = req.body.model || "dreamina-seedance-2-0-260128";

                    const payload = {
                        model: targetModel,
                        content,
                        generate_audio: !!generateAudio,
                        ratio: aspectRatio || "16:9",
                        duration: Number(duration) || 5,
                        watermark: false
                    };

                    console.log(`[SEEDANCE-2.0-ARK] Creating task:`, JSON.stringify(payload, null, 2));

                    const createResp = await fetch("https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks", {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${arkApiKey}`
                        },
                        body: JSON.stringify(payload)
                    });

                    const createData = await createResp.json();
                    if (createData.error) {
                        let errorMessage = createData.error.message || JSON.stringify(createData.error);
                        if (errorMessage.toLowerCase().includes("real person")) {
                            errorMessage = "The reference image was flagged by safety filters for containing a real person. BytePlus Ark policy prohibits generating videos from real-person photos. Suggestion: Use a stylized/drawn reference image, or switch to a different engine (like Veo 3.1) that has different safety filters.";
                        }
                        if (kieApiKey) {
                            console.log(`[SEEDANCE-2.0-FALLBACK] Ark task creation failed ("${errorMessage}"). Falling back to Kie.ai...`);
                            try {
                                const taskId = await generateKieTask({
                                    prompt: finalPrompt,
                                    aspectRatio,
                                    duration,
                                    resolution,
                                    generateAudio,
                                    resolvedIdentity,
                                    resolvedVideos,
                                    resolvedAudios,
                                    resolvedFirstFrame,
                                    resolvedLastFrame,
                                    targetModel: 'bytedance/seedance-2-fast'
                                });
                                console.log(`[SEEDANCE-2.0-FALLBACK] Fallback task created on Kie.ai successfully: ${taskId}`);
                                return res.json({ success: true, requestId: taskId, engine: 'seedace-kie' });
                            } catch (fallbackErr) {
                                console.error(`[SEEDANCE-2.0-FALLBACK] Kie.ai fallback also failed:`, fallbackErr);
                                throw new Error(`BytePlus Ark request failed: "${errorMessage}", and Kie.ai fallback failed: "${fallbackErr.message}"`);
                            }
                        }
                        throw new Error(`BytePlus Ark Error: ${errorMessage}`);
                    }
                    if (!createData.id) {
                        throw new Error(`BytePlus Ark did not return a task ID. Response: ${JSON.stringify(createData)}`);
                    }

                    console.log(`[SEEDANCE-2.0-ARK] Task created successfully: ${createData.id}`);
                    return res.json({ success: true, requestId: createData.id, engine: 'seedace-ark' });
                } else {
                    // Fallback to Kie.ai
                    if (!kieApiKey) {
                        throw new Error("Neither ARK_API_KEY nor KIE_API_KEY is configured on the server.");
                    }

                    const input = {
                        prompt: finalPrompt,
                        aspect_ratio: (aspectRatio || "16:9"),
                        duration: Number(duration) || 5,
                        resolution: resolution || '720p',
                        generate_audio: !!generateAudio,
                        web_search: false
                    };
                    if (resolvedFirstFrame) input.first_frame_url = resolvedFirstFrame;
                    if (resolvedLastFrame) input.last_frame_url = resolvedLastFrame;
                    if (resolvedIdentity.length > 0) input.reference_image_urls = resolvedIdentity;
                    if (resolvedVideos.length > 0) input.reference_video_urls = resolvedVideos;
                    if (resolvedAudios.length > 0) input.reference_audio_urls = resolvedAudios;

                    console.log(`[SEEDANCE-2.0-KIE] Creating task via Kie.ai:`, JSON.stringify(input, null, 2));

                    const createResp = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${kieApiKey}`
                        },
                        body: JSON.stringify({
                            model: req.body.model || 'bytedance/seedance-2',
                            input
                        })
                    });

                    const createData = await createResp.json();
                    if (createData.code !== 200) {
                        throw new Error(`Kie.ai Error: ${createData.msg || JSON.stringify(createData)}`);
                    }
                    const taskId = createData.data?.taskId;
                    if (!taskId) {
                        throw new Error("Kie.ai task creation succeeded but did not return a taskId.");
                    }

                    console.log(`[SEEDANCE-2.0-KIE] Task created successfully: ${taskId}`);
                    return res.json({ success: true, requestId: taskId, engine: 'seedace-kie' });
                }
            }

            // Handle seedance-mini model — routes only through Kie.ai (no Ark)
            if (engine === 'seedance-mini') {
                const kieApiKey = process.env.KIE_API_KEY;
                if (!kieApiKey) {
                    throw new Error("KIE_API_KEY is not configured on the server, cannot run seedance-mini.");
                }

                const resolutionMini = resolution === '4k' ? '720p' : (resolution || '720p');

                const miniInput = {
                    prompt: finalPrompt,
                    aspect_ratio: (aspectRatio || "16:9"),
                    duration: Number(duration) || 5,
                    generate_audio: !!generateAudio,
                    resolution: resolutionMini,
                    web_search: false
                };

                if (resolvedFirstFrame) miniInput.first_frame_url = resolvedFirstFrame;
                if (resolvedLastFrame) miniInput.last_frame_url = resolvedLastFrame;
                if (resolvedIdentity.length > 0) {
                    miniInput.reference_image_urls = resolvedIdentity;
                }
                if (resolvedVideos.length > 0) {
                    miniInput.reference_video_urls = resolvedVideos;
                }
                if (resolvedAudios.length > 0) {
                    miniInput.reference_audio_urls = resolvedAudios;
                }

                console.log(`[SEEDANCE-MINI] Creating task via Kie.ai:`, JSON.stringify(miniInput, null, 2));

                const createResp = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${kieApiKey}`
                    },
                    body: JSON.stringify({
                        model: req.body.model || 'bytedance/seedance-2-mini',
                        input: miniInput
                    })
                });

                const createData = await createResp.json();
                if (createData.code !== 200) {
                    throw new Error(`Kie.ai Error: ${createData.msg || JSON.stringify(createData)}`);
                }
                const taskId = createData.data?.taskId;
                if (!taskId) {
                    throw new Error("Kie.ai task creation succeeded but did not return a taskId.");
                }

                console.log(`[SEEDANCE-MINI] Task created successfully: ${taskId}`);
                return res.json({ success: true, requestId: taskId, engine: 'seedance-mini' });
            }

            throw new Error(`Unsupported engine: ${engine}`);
        } catch (error) {
            console.error('[SEEDANCE-GEN-ERR]', error);
            res.status(500).json({ error: error.message });
        }
    });

    // GET /api/seedance/status/:requestId
    router.get('/seedance/status/:requestId', async (req, res) => {
        try {
            const { requestId } = req.params;
            const { userId, aspectRatio = '16:9', engine, folder } = req.query;

            console.log(`[SEEDANCE-STATUS] Checking status | id: ${requestId} | engine: ${engine}`);

            // 1. Handle Ark engine polling (seedance-fast or seedace-ark)
            if (engine === 'seedance-fast' || engine === 'seedace-ark') {
                const apiKey = process.env.ARK_API_KEY;
                if (!apiKey) throw new Error("Ark API Key missing.");

                const pollResp = await fetch(`https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks/${requestId}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    }
                });
                const pollData = await pollResp.json();

                if (pollData.error) {
                    throw new Error(`Ark Polling Failed: ${pollData.error.message || JSON.stringify(pollData.error)}`);
                }

                const state = pollData.status; // succeeded, failed, processing, pending etc.
                console.log(`[SEEDANCE-STATUS-ARK] ${requestId}: ${state}`);

                if (state === 'succeeded') {
                    const finalUrl = pollData.content?.video_url;
                    if (!finalUrl) throw new Error("No result video URL found in succeeded task.");

                    let supabaseUrl;
                    try {
                        console.log(`[SEEDANCE-STATUS-ARK] Downloading video: ${finalUrl}`);
                        const videoResp = await fetch(finalUrl, { signal: AbortSignal.timeout(60000) });
                        if (!videoResp.ok) throw new Error(`HTTP ${videoResp.status}`);
                        const ab = await videoResp.arrayBuffer();
                        if (!ab || ab.byteLength === 0) throw new Error('Empty response');
                        console.log(`[SEEDANCE-STATUS-ARK] Downloaded ${(ab.byteLength / 1024 / 1024).toFixed(1)}MB, uploading to Supabase...`);
                        supabaseUrl = await uploadVideoToSupabase(Buffer.from(ab), userId, aspectRatio, folder);
                    } catch (dlErr) {
                        console.warn(`[SEEDANCE-STATUS-ARK] Download/upload failed (${dlErr.message}), returning Ark URL directly`);
                        supabaseUrl = finalUrl;
                    }

                    return res.json({ status: 'completed', url: supabaseUrl });
                } else if (state === 'failed') {
                    return res.json({ status: 'failed', error: pollData.error?.message || 'Generation failed' });
                }

                return res.json({ status: 'processing' });
            }

            // 2. Handle Kie.ai engine polling
            if (engine === 'seedace-kie' || engine === 'seedace' || engine === 'seedance-mini') {
                const apiKey = process.env.KIE_API_KEY;
                if (!apiKey) throw new Error("Kie.ai API Key missing.");

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                let pollResp;
                try {
                    pollResp = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${requestId}`, {
                        headers: { 'Authorization': `Bearer ${apiKey}` },
                        signal: controller.signal
                    });
                } finally {
                    clearTimeout(timeoutId);
                }
                const pollData = await pollResp.json();

                if (pollData.code !== 200) {
                    throw new Error(`Kie.ai Polling Failed: ${pollData.msg || JSON.stringify(pollData)}`);
                }

                const state = pollData.data?.state || pollData.data?.status; // success, fail, generating, queuing, waiting
                console.log(`[SEEDANCE-STATUS-KIE] ${requestId}: ${state}`);

                if (state === 'success' || state === 'succeed' || state === 'completed') {
                    let finalUrl = pollData.data?.videos?.[0]?.url || pollData.data?.resultUrl;
                    if (!finalUrl && pollData.data?.resultJson) {
                        try {
                            const parsed = typeof pollData.data.resultJson === 'string'
                                ? JSON.parse(pollData.data.resultJson)
                                : pollData.data.resultJson;
                            finalUrl = parsed?.resultUrls?.[0] || parsed?.video_url;
                        } catch (e) {
                            console.warn('[SEEDANCE-STATUS-KIE] Failed to parse resultJson:', e.message);
                        }
                    }
                    if (!finalUrl) throw new Error("No result video URL found in completed Kie task.");

                    // Try to download and re-host on our storage (failsafe: return Kie URL directly)
                    let supabaseUrl;
                    try {
                        console.log(`[SEEDANCE-STATUS-KIE] Downloading video: ${finalUrl}`);
                        const videoResp = await fetch(finalUrl, { signal: AbortSignal.timeout(60000) });
                        if (!videoResp.ok) throw new Error(`HTTP ${videoResp.status}`);
                        const ab = await videoResp.arrayBuffer();
                        if (!ab || ab.byteLength === 0) throw new Error('Empty response');
                        console.log(`[SEEDANCE-STATUS-KIE] Downloaded ${(ab.byteLength / 1024 / 1024).toFixed(1)}MB, uploading to Supabase...`);
                        supabaseUrl = await uploadVideoToSupabase(Buffer.from(ab), userId, aspectRatio, folder);
                    } catch (dlErr) {
                        console.warn(`[SEEDANCE-STATUS-KIE] Download/upload failed (${dlErr.message}), returning Kie URL directly`);
                        supabaseUrl = finalUrl;
                    }

                    return res.json({ status: 'completed', url: supabaseUrl });
                } else if (state === 'fail' || state === 'failed' || state === 'error') {
                    return res.json({ status: 'failed', error: pollData.data?.failMsg || 'Kie.ai generation failed' });
                }

                return res.json({ status: 'processing' });
            }

            throw new Error(`Unsupported status check engine: ${engine}`);
        } catch (error) {
            console.error('[SEEDANCE-STATUS-ERR]', error.message, error.stack?.split('\n').slice(0, 3).join(' '));
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    return router;
}
