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
            return_last_frame: false,
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
                engine, // 'seedance-fast', 'seedace', 'seedance-mini', 'seedance-2.5'
                prompt, // Legacy text prompt
                firstFrame,
                lastFrame,
                identity_images,
                reference_image_urls,
                reference_video_urls,
                reference_audio_urls,
                ref_images,
                ref_videos,
                ref_audios,
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
                const costPerSec = resLower === '480p' ? 15 : 25;
                requiredCredits = costPerSec * durationNum;
            } else if (engine === 'seedace') {
                const costPerSec = resLower === '4k' ? 140 : (resLower === '1080p' ? 70 : (resLower === '480p' ? 15 : 30));
                requiredCredits = costPerSec * durationNum;
            } else if (engine === 'seedance-mini') {
                const costPerSec = resLower === '480p' ? 10 : 15;
                requiredCredits = costPerSec * durationNum;
            } else if (engine === 'seedance-2.5' || engine === 'seedance-2-5' || engine === 'bytedance/seedance-2-5') {
                const costPerSec = resLower === '1080p' ? 70 : (resLower === '480p' ? 15 : 30);
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
            let resolvedVideos = [];
            let resolvedAudios = [];
            let finalPrompt = prompt || '';

            if (seedanceContentArray && Array.isArray(seedanceContentArray) && seedanceContentArray.length > 0) {
                content = (await Promise.all(
                    seedanceContentArray.map(async (item) => {
                        if (!item) return null;
                        const newItem = { ...item };
                        if (newItem.type === 'text') {
                            return newItem;
                        }
                        if (newItem.type === 'image_url') {
                            const raw = typeof newItem.image_url === 'object' ? newItem.image_url?.url : newItem.image_url;
                            if (!raw) return null;
                            const publicUrl = await resolveToPublicUrl(raw, userId);
                            if (!publicUrl) return null;
                            newItem.image_url = { url: publicUrl };
                            return newItem;
                        }
                        if (newItem.type === 'video_url') {
                            const raw = typeof newItem.video_url === 'object' ? newItem.video_url?.url : newItem.video_url;
                            if (!raw) return null;
                            const publicUrl = await resolveToPublicUrl(raw, userId);
                            if (!publicUrl) return null;
                            newItem.video_url = { url: publicUrl };
                            return newItem;
                        }
                        if (newItem.type === 'audio_url') {
                            const raw = typeof newItem.audio_url === 'object' ? newItem.audio_url?.url : newItem.audio_url;
                            if (!raw) return null;
                            const publicUrl = await resolveToPublicUrl(raw, userId);
                            if (!publicUrl) return null;
                            newItem.audio_url = { url: publicUrl };
                            return newItem;
                        }
                        return newItem;
                    })
                )).filter(Boolean);

                finalPrompt = content.find(c => c.type === 'text')?.text || finalPrompt;
                resolvedFirstFrame = content.find(c => c.role === 'first_frame')?.image_url?.url || null;
                resolvedLastFrame = content.find(c => c.role === 'last_frame')?.image_url?.url || null;
                resolvedIdentity = content.filter(c => c.role === 'reference_image' && c.image_url?.url).map(c => c.image_url.url);
                resolvedVideos = content.filter(c => (c.role === 'reference_video' || c.type === 'video_url') && c.video_url?.url).map(c => c.video_url.url);
                resolvedAudios = content.filter(c => (c.role === 'reference_audio' || c.type === 'audio_url') && c.audio_url?.url).map(c => c.audio_url.url);
            }

            // Merge top-level firstFrame / lastFrame if not already discovered
            if (!resolvedFirstFrame && firstFrame) {
                resolvedFirstFrame = await resolveToPublicUrl(firstFrame, userId);
            }
            if (!resolvedLastFrame && lastFrame) {
                resolvedLastFrame = await resolveToPublicUrl(lastFrame, userId);
            }

            // Merge any top-level reference images passed
            const rawRefImgs = [
                ...(Array.isArray(reference_image_urls) ? reference_image_urls : []),
                ...(Array.isArray(identity_images) ? identity_images : []),
                ...(Array.isArray(ref_images) ? ref_images : [])
            ];
            if (rawRefImgs.length > 0) {
                const resolvedExtras = (await Promise.all(rawRefImgs.map(img => resolveToPublicUrl(img, userId)))).filter(Boolean);
                resolvedIdentity = Array.from(new Set([...resolvedIdentity, ...resolvedExtras]));
            }

            // Merge any top-level reference videos passed
            const rawRefVids = [
                ...(Array.isArray(reference_video_urls) ? reference_video_urls : []),
                ...(Array.isArray(ref_videos) ? ref_videos : [])
            ];
            if (rawRefVids.length > 0) {
                const resolvedExtraVids = (await Promise.all(rawRefVids.map(vid => resolveToPublicUrl(vid, userId)))).filter(Boolean);
                resolvedVideos = Array.from(new Set([...resolvedVideos, ...resolvedExtraVids]));
            }

            // Merge any top-level reference audios passed
            const rawRefAuds = [
                ...(Array.isArray(reference_audio_urls) ? reference_audio_urls : []),
                ...(Array.isArray(ref_audios) ? ref_audios : [])
            ];
            if (rawRefAuds.length > 0) {
                const resolvedExtraAuds = (await Promise.all(rawRefAuds.map(aud => resolveToPublicUrl(aud, userId)))).filter(Boolean);
                resolvedAudios = Array.from(new Set([...resolvedAudios, ...resolvedExtraAuds]));
            }

            // Ensure first and last frames are not duplicated into reference_image_urls
            resolvedIdentity = resolvedIdentity.filter(url => url !== resolvedFirstFrame && url !== resolvedLastFrame);

            // Rebuild content array if empty
            if (content.length === 0) {
                if (finalPrompt) content.push({ type: "text", text: finalPrompt });
                if (resolvedFirstFrame) content.push({ type: "image_url", image_url: { url: resolvedFirstFrame }, role: "first_frame" });
                if (resolvedLastFrame) content.push({ type: "image_url", image_url: { url: resolvedLastFrame }, role: "last_frame" });
                resolvedIdentity.forEach(url => content.push({ type: "image_url", image_url: { url }, role: "reference_image" }));
                resolvedVideos.forEach(url => content.push({ type: "video_url", video_url: { url }, role: "reference_video" }));
                resolvedAudios.forEach(url => content.push({ type: "audio_url", audio_url: { url }, role: "reference_audio" }));
            }

            if (generateAudio && !finalPrompt.includes('[Audio:')) {
                const sfxDirective = ' [Audio: Realistic synchronized environmental sound effects and natural foley ONLY. Strictly NO background music, NO soundtrack, NO musical score.]';
                finalPrompt = `${finalPrompt}${sfxDirective}`;
                const textItem = content.find(c => c.type === 'text');
                if (textItem) {
                    textItem.text = `${textItem.text}${sfxDirective}`;
                }
            }

            console.log(`[SEEDANCE-GEN] Resolved multimodal assets:`, {
                firstFrame: !!resolvedFirstFrame,
                lastFrame: !!resolvedLastFrame,
                refImagesCount: resolvedIdentity.length,
                refVideosCount: resolvedVideos.length,
                refAudiosCount: resolvedAudios.length
            });

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
                    resolution: (resolution || '720p').toLowerCase(),
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
                        resolution: (resolution || '1080p').toLowerCase(),
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
                        return_last_frame: false,
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
                    return_last_frame: false,
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

            // Handle seedance-2.5 model — routes through Kie.ai
            if (engine === 'seedance-2.5' || engine === 'seedance-2-5' || engine === 'bytedance/seedance-2-5') {
                const kieApiKey = process.env.KIE_API_KEY;
                if (!kieApiKey) {
                    throw new Error("KIE_API_KEY is not configured on the server, cannot run seedance-2.5.");
                }

                const resolution25 = resolution === '4k' ? '1080p' : (resolution || '720p');

                const seedance25Input = {
                    prompt: finalPrompt,
                    aspect_ratio: (aspectRatio || "16:9"),
                    duration: Number(duration) || 10,
                    generate_audio: !!generateAudio,
                    resolution: resolution25,
                    return_last_frame: false,
                    web_search: false
                };

                if (resolvedFirstFrame) seedance25Input.first_frame_url = resolvedFirstFrame;
                if (resolvedLastFrame) seedance25Input.last_frame_url = resolvedLastFrame;
                if (resolvedIdentity.length > 0) {
                    seedance25Input.reference_image_urls = resolvedIdentity;
                }
                if (resolvedVideos.length > 0) {
                    seedance25Input.reference_video_urls = resolvedVideos;
                }
                if (resolvedAudios.length > 0) {
                    seedance25Input.reference_audio_urls = resolvedAudios;
                }

                console.log(`[SEEDANCE-2.5] Creating task via Kie.ai:`, JSON.stringify(seedance25Input, null, 2));

                const createResp = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${kieApiKey}`
                    },
                    body: JSON.stringify({
                        model: req.body.model || 'bytedance/seedance-2-5',
                        input: seedance25Input
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

                console.log(`[SEEDANCE-2.5] Task created successfully: ${taskId}`);
                return res.json({ success: true, requestId: taskId, engine: 'seedance-2.5-kie' });
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
            const { userId, aspectRatio = '16:9', engine, folder, projectId } = req.query;

            console.log(`[SEEDANCE-STATUS] Checking status | id: ${requestId} | engine: ${engine}`);

            // 1. Handle Ark engine polling (only if explicitly seedace-ark or Ark is requested AND not a Kie task ID)
            const isKieEngine = engine === 'seedace-kie' || engine === 'seedace' || engine === 'seedance-mini' || engine === 'seedance-2.5-kie' || engine === 'seedance-2.5' || engine === 'seedance-2-5' || engine === 'bytedance/seedance-2-5' || engine === 'bytedance/seedance-2-fast' || engine === 'bytedance/seedance-2-mini' || engine === 'bytedance/seedance-2' || (process.env.PREFER_KIE === 'true') || !process.env.ARK_API_KEY;

            if (!isKieEngine && (engine === 'seedace-ark' || (engine === 'seedance-fast' && process.env.ARK_API_KEY))) {
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

                    let supabaseUrl = finalUrl;
                    if (typeof uploadVideoToSupabase === 'function') {
                        try {
                            console.log(`[SEEDANCE-STATUS-ARK] Downloading video: ${finalUrl}`);
                            const videoResp = await fetch(finalUrl, { signal: AbortSignal.timeout(60000) });
                            if (videoResp.ok) {
                                const ab = await videoResp.arrayBuffer();
                                if (ab && ab.byteLength > 0) {
                                    console.log(`[SEEDANCE-STATUS-ARK] Downloaded ${(ab.byteLength / 1024 / 1024).toFixed(1)}MB, uploading to Supabase...`);
                                    const extraMeta = projectId ? { projectId } : {};
                                    supabaseUrl = await uploadVideoToSupabase(Buffer.from(ab), userId, aspectRatio, folder, undefined, undefined, extraMeta);
                                }
                            }
                        } catch (dlErr) {
                            console.warn(`[SEEDANCE-STATUS-ARK] Download/upload failed (${dlErr.message}), returning Ark URL directly`);
                            supabaseUrl = finalUrl;
                        }
                    }

                    return res.json({ status: 'completed', url: supabaseUrl });
                } else if (state === 'failed') {
                    return res.json({ status: 'failed', error: pollData.error?.message || 'Generation failed' });
                }

                return res.json({ status: 'processing' });
            }

            // 2. Handle Kie.ai engine polling (fault-tolerant with automatic propagation wait)
            const apiKey = process.env.KIE_API_KEY;
            if (!apiKey) {
                return res.status(500).json({ status: 'error', message: "Kie.ai API Key missing on server." });
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            let pollResp;
            try {
                pollResp = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${requestId}`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` },
                    signal: controller.signal
                });
            } catch (netErr) {
                console.warn(`[SEEDANCE-STATUS-KIE] Network polling warning for task ${requestId}: ${netErr.message}`);
                return res.json({ status: 'processing' });
            } finally {
                clearTimeout(timeoutId);
            }

            if (!pollResp.ok) {
                console.warn(`[SEEDANCE-STATUS-KIE] HTTP ${pollResp.status} from Kie API for task ${requestId}. Continuing polling.`);
                return res.json({ status: 'processing' });
            }

            let pollData;
            try {
                pollData = await pollResp.json();
            } catch (jsonErr) {
                console.warn(`[SEEDANCE-STATUS-KIE] Non-JSON response from Kie API for task ${requestId}: ${jsonErr.message}`);
                return res.json({ status: 'processing' });
            }

            // If task is initializing or not propagated in Kie's distributed DB yet (e.g. 422 recordInfo is null, 404, etc.)
            if (pollData.code !== 200 || !pollData.data) {
                console.log(`[SEEDANCE-STATUS-KIE] Task ${requestId} initializing or propagating (code: ${pollData.code}, msg: ${pollData.msg}). Treating as processing.`);
                return res.json({ status: 'processing' });
            }

            const state = (pollData.data?.state || pollData.data?.status || '').toLowerCase();
            console.log(`[SEEDANCE-STATUS-KIE] ${requestId}: ${state}`);

            if (state === 'success' || state === 'succeed' || state === 'completed') {
                let finalUrl = pollData.data?.videos?.[0]?.url || pollData.data?.resultUrl;
                if (!finalUrl && pollData.data?.resultJson) {
                    try {
                        const parsed = typeof pollData.data.resultJson === 'string'
                            ? JSON.parse(pollData.data.resultJson)
                            : pollData.data.resultJson;
                        finalUrl = parsed?.resultUrls?.[0] || parsed?.video_url || (Array.isArray(parsed) ? parsed[0] : null);
                    } catch (e) {
                        console.warn('[SEEDANCE-STATUS-KIE] Failed to parse resultJson:', e.message);
                    }
                }

                if (!finalUrl && pollData.data?.url) {
                    finalUrl = pollData.data.url;
                }

                if (!finalUrl) {
                    console.warn('[SEEDANCE-STATUS-KIE] No final URL found in payload:', JSON.stringify(pollData.data));
                    return res.json({ status: 'processing' });
                }

                // Try to download and re-host on Supabase storage (failsafe: return Kie URL directly)
                let supabaseUrl = finalUrl;
                if (typeof uploadVideoToSupabase === 'function') {
                    try {
                        console.log(`[SEEDANCE-STATUS-KIE] Downloading video: ${finalUrl}`);
                        const videoResp = await fetch(finalUrl, { signal: AbortSignal.timeout(60000) });
                        if (videoResp.ok) {
                            const ab = await videoResp.arrayBuffer();
                            if (ab && ab.byteLength > 0) {
                                console.log(`[SEEDANCE-STATUS-KIE] Downloaded ${(ab.byteLength / 1024 / 1024).toFixed(1)}MB, uploading to Supabase...`);
                                const extraMeta = projectId ? { projectId } : {};
                                supabaseUrl = await uploadVideoToSupabase(Buffer.from(ab), userId, aspectRatio, folder, undefined, undefined, extraMeta);
                            }
                        }
                    } catch (dlErr) {
                        console.warn(`[SEEDANCE-STATUS-KIE] Download/upload failed (${dlErr.message}), returning Kie URL directly`);
                        supabaseUrl = finalUrl;
                    }
                }

                return res.json({ status: 'completed', url: supabaseUrl });
            } else if (state === 'fail' || state === 'failed' || state === 'error') {
                return res.json({ status: 'failed', error: pollData.data?.failMsg || pollData.data?.failCode || 'Kie.ai generation failed' });
            }

            return res.json({ status: 'processing' });
        } catch (error) {
            console.error('[SEEDANCE-STATUS-ERR]', error.message, error.stack?.split('\n').slice(0, 3).join(' '));
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    return router;
}
