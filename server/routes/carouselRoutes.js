import express from 'express';
import { readFileSync, rmSync } from 'fs';
import { generateCarousel as generateCarouselHTML } from '../../services/carouselGenerator.js';
import { isValidUuid } from '../utils/validateUuid.js';

export default function createRouter(deps) {
    const router = express.Router();
    const {
        uploadImageToSupabase,
        saveLocalAsset,
        supabase,
        supabaseAdmin,
        MARKETING_BUCKET,
        storageService,
        requireAuth,
        resolveGoogleApiKey,
        getVertexToken,
        VERTEX_PROJECT_ID,
        VERTEX_LOCATION
    } = deps;

    // ── Carousel HTML → Playwright → Supabase PNG pipeline ───────────────────────
    router.post('/carousel/generate', async (req, res) => {
        const { carouselData, userId, artDirection } = req.body;
        if (!carouselData?.brand || !carouselData?.slides) {
            return res.status(400).json({ error: 'Missing carouselData.brand or carouselData.slides' });
        }
        let tmpDir = null;
        try {
            console.log('[Carousel] Starting HTML generation for', carouselData.brand.name, '— artDirection:', artDirection || 'cinematic');
            const result = await generateCarouselHTML(carouselData, artDirection || 'cinematic');
            tmpDir = result.tmpDir;
            const uploadedSlides = [];
            for (let i = 0; i < result.outputPaths.length; i++) {
                const localPath = result.outputPaths[i];
                const buffer = readFileSync(localPath);
                const url = await uploadImageToSupabase(buffer, userId || 'anon');
                uploadedSlides.push({ index: i, url, filename: `slide_${i + 1}.png` });
                console.log(`[Carousel] Uploaded slide ${i + 1} → ${url}`);
            }
            res.json({
                slides: uploadedSlides,
                palette: result.palette,
                fonts: { heading: result.fonts.heading, body: result.fonts.body },
            });
        } catch (err) {
            console.error('[Carousel] Generation failed:', err);
            res.status(500).json({ error: err.message || 'Carousel generation failed' });
        } finally {
            if (tmpDir) {
                try { rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
            }
        }
    });

    // ── Carousel Image Generation: supports GPT Image 2 and Nano Banana 2 ───────────────
    const IMAGE_GEN_TIMEOUT = 120000; // 120 seconds max per image
    const MAX_RETRIES = 2; // Retry up to 2 times on timeout

    router.post('/carousel/generate-images', async (req, res) => {
        try {
            const { prompts, userId, brand, model: modelEngine } = req.body;
            if (!Array.isArray(prompts) || prompts.length === 0)
                return res.status(400).json({ error: 'prompts array required' });

            let user;
            try {
                user = await requireAuth(req);
            } catch (_) {}
            const targetUserId = user ? user.id : userId;
            const safeId  = (targetUserId || 'anon').replace(/[^a-z0-9_-]/gi, '');
            const targetModel = modelEngine || 'gpt-image-2';
            const isNanoBanana = targetModel === 'nano-banana-2';

            const slides = [];
            for (let i = 0; i < prompts.length; i++) {
                const { prompt, slideId } = prompts[i];
                console.log(`[Carousel-${targetModel}] Slide ${i + 1}/${prompts.length}: ${slideId}`);
                console.log(`[Carousel-${targetModel}] Prompt length: ${prompt?.length || 0} chars`);

                let imageBuffer;
                const startTime = Date.now();

                try {
                    if (isNanoBanana) {
                        const apiKey = await resolveGoogleApiKey(req, targetUserId, false);
                        const geminiModel = 'models/gemini-3.1-flash-image-preview';
                        
                        let endpoint = '';
                        const headers = { 'Content-Type': 'application/json' };
                        if (apiKey === 'VERTEX_AI_CLIENT') {
                            const token = await getVertexToken();
                            const activeModelLower = geminiModel.toLowerCase();
                            const needsGlobal = activeModelLower.includes('gemini') || activeModelLower.includes('banana') || activeModelLower.includes('omni');
                            const targetLocation = needsGlobal ? 'global' : (VERTEX_LOCATION || 'us-central1');
                            const apiVersion = needsGlobal ? 'v1beta1' : 'v1';
                            // Remove models/ prefix if present to format consistently
                            const activeModel = geminiModel.startsWith('models/') ? geminiModel.replace('models/', '') : geminiModel;
                            endpoint = `https://${VERTEX_LOCATION || 'us-central1'}-aiplatform.googleapis.com/${apiVersion}/projects/${VERTEX_PROJECT_ID}/locations/${targetLocation}/publishers/google/models/${activeModel}:generateContent`;
                            headers['Authorization'] = `Bearer ${token}`;
                            console.log(`[Carousel-NB2] [Vertex AI] Calling model gemini-3.1-flash-image-preview via Service Account token (location: ${targetLocation})`);
                        } else {
                            endpoint = `https://generativelanguage.googleapis.com/v1beta/${geminiModel}:generateContent?key=${apiKey}`;
                            console.log(`[Carousel-NB2] [AI Studio] Calling model ${geminiModel} via API Key`);
                        }

                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), IMAGE_GEN_TIMEOUT);
                        
                        const safetySettings = [
                            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                        ];

                        const resp = await fetch(
                            endpoint,
                            {
                                method: 'POST',
                                headers,
                                body: JSON.stringify({
                                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                                    safetySettings,
                                    generationConfig: {
                                        responseModalities: ['TEXT', 'IMAGE']
                                    }
                                }),
                                signal: controller.signal
                            }
                        );
                        clearTimeout(timeoutId);
                        
                        const data = await resp.json();
                        if (!resp.ok) {
                            throw new Error(data.error?.message || `Gemini API error: ${resp.status}`);
                        }

                        if (data.promptFeedback?.blockReason) {
                            const reason = data.promptFeedback.blockReason;
                            console.error('[Carousel-nano-banana-2] Google API prompt feedback block:', JSON.stringify(data.promptFeedback));
                            if (reason === 'OTHER') {
                                throw new Error("Google API blocked the request (blockReason: OTHER). This is typically caused by a sensitive reference photo, copyright/trademark restrictions, or a celebrity likeness filter.");
                            } else {
                                throw new Error(`Google API safety block: ${reason}. Please try a different reference image or prompt.`);
                            }
                        }

                        const candidate = data.candidates?.[0];
                        if (candidate && candidate.finishReason === 'SAFETY') {
                            throw new Error("SAFETY_REFUSAL: The creative prompt was blocked by safety filters.");
                        }

                        const inlineData = candidate?.content?.parts?.find(p => p.inlineData)?.inlineData;
                        if (!inlineData || !inlineData.data) {
                            throw new Error(`No image generated for slide ${i}`);
                        }
                        
                        imageBuffer = Buffer.from(inlineData.data, 'base64');
                    } else {
                        let retries = 0;
                        let lastError;
                        
                        while (retries <= MAX_RETRIES) {
                            try {
                                if (!process.env.OPENAI_API_KEY) {
                                    throw new Error('OPENAI_API_KEY is not configured in your .env file.');
                                }
                                const OpenAI = (await import('openai')).default;
                                const openai = new OpenAI({ 
                                    apiKey: process.env.OPENAI_API_KEY,
                                    timeout: IMAGE_GEN_TIMEOUT,
                                    maxRetries: 0
                                });
                                
                                console.log(`[Carousel-gpt-image-2] Slide ${i + 1} attempt ${retries + 1}/${MAX_RETRIES + 1}`);
                                
                                const imgResp = await openai.images.generate({
                                    model:   'gpt-image-2',
                                    prompt:  prompt,
                                    n:       1,
                                    size:    '1024x1536',
                                    quality: 'medium',
                                });

                                const b64 = imgResp.data?.[0]?.b64_json;
                                const url = imgResp.data?.[0]?.url;
                                if (b64) {
                                    imageBuffer = Buffer.from(b64, 'base64');
                                } else if (url) {
                                    const r = await fetch(url);
                                    imageBuffer = Buffer.from(await r.arrayBuffer());
                                } else {
                                    throw new Error(`No image data for slide ${i}`);
                                }
                                
                                if (retries > 0) {
                                    console.log(`[Carousel-gpt-image-2] Slide ${i + 1} succeeded on retry ${retries + 1}`);
                                }
                                break;
                                
                            } catch (retryErr) {
                                lastError = retryErr;
                                retries++;
                                
                                if (retryErr.name === 'AbortError' || retryErr.message?.includes('timeout')) {
                                    console.error(`[Carousel-gpt-image-2] Slide ${i + 1} timeout on attempt ${retries}`);
                                    
                                    if (retries <= MAX_RETRIES) {
                                        console.log(`[Carousel-gpt-image-2] Retrying slide ${i + 1}...`);
                                        await new Promise(r => setTimeout(r, 2000));
                                    }
                                } else {
                                    throw retryErr;
                                }
                            }
                        }
                        
                        if (!imageBuffer && lastError) {
                            throw lastError;
                        }
                    }

                    const elapsed = Date.now() - startTime;
                    console.log(`[Carousel-${targetModel}] Slide ${i + 1} generated in ${elapsed}ms`);

                    const filename = `users/${userId || 'anon'}/marketing/generated/${targetModel}_${safeId}_${Date.now()}_${i}.jpeg`;
                    let uploaded;
                    try {
                        uploaded = await storageService.uploadToGCS(imageBuffer, filename, 'image/jpeg', MARKETING_BUCKET);
                        console.log(`[Carousel] Slide ${i + 1} uploaded to R2: ${uploaded}`);
                    } catch (uploadErr) {
                        console.error(`[Carousel] Upload failed for slide ${i + 1}:`, uploadErr.message);
                        throw new Error(`Failed to upload slide ${i + 1}: ${uploadErr.message}`);
                    }
                    
                    slides.push({ index: i, url: uploaded, filename: `slide_${i + 1}.png` });
                    
                    const cleanPrompt = (prompts[i]?.prompt || '').substring(0, 1000);
                    saveLocalAsset({
                        name: `Carousel Slide ${i + 1} (${brand?.name || 'Zerolens'})`,
                        type: 'image',
                        url: uploaded,
                        prompt: cleanPrompt,
                        user_id: userId || 'anon',
                        created_at: new Date().toISOString(),
                        aspect: '9:16'
                    });

                    const dbClient = supabaseAdmin || supabase;
                    if (dbClient && isValidUuid(userId)) {
                        try {
                            await dbClient.from('assets').insert([{
                                name: `Carousel Slide ${i + 1} (${brand?.name || 'Zerolens'})`,
                                type: 'image',
                                url: uploaded,
                                prompt: cleanPrompt,
                                user_id: userId,
                                created_at: new Date().toISOString(),
                                metadata: { aspect: '9:16' }
                            }]);
                        } catch (dbErr) {
                            console.error('[DB] Failed to save slide to assets:', dbErr.message);
                        }
                    }
                    
                } catch (genErr) {
                    if (isNanoBanana && (genErr.name === 'AbortError' || genErr.message?.includes('timeout'))) {
                        console.error(`[Carousel-nano-banana-2] Slide ${i + 1} TIMEOUT — FALLING BACK to GPT Image 2`);
                        
                        try {
                            if (!process.env.OPENAI_API_KEY) {
                                throw new Error('OPENAI_API_KEY is not configured in your .env file.');
                            }
                            const OpenAI = (await import('openai')).default;
                            const openai = new OpenAI({ 
                                apiKey: process.env.OPENAI_API_KEY,
                                timeout: IMAGE_GEN_TIMEOUT,
                                maxRetries: 1
                            });
                            
                            const imgResp = await openai.images.generate({
                                model:   'gpt-image-2',
                                prompt:  prompt,
                                n:       1,
                                size:    '1024x1536',
                                quality: 'medium',
                            });

                            const b64 = imgResp.data?.[0]?.b64_json;
                            const url = imgResp.data?.[0]?.url;
                            if (b64) {
                                imageBuffer = Buffer.from(b64, 'base64');
                            } else if (url) {
                                const r = await fetch(url);
                                imageBuffer = Buffer.from(await r.arrayBuffer());
                            } else {
                                throw new Error(`No image data for slide ${i}`);
                            }
                            
                            const elapsed = Date.now() - startTime;
                            console.log(`[Carousel-gpt-image-2] Slide ${i + 1} FALLBACK generated in ${elapsed}ms`);

                            const filename = `users/${userId || 'anon'}/marketing/generated/fallback_${safeId}_${Date.now()}_${i}.jpeg`;
                            const uploaded = await storageService.uploadToGCS(imageBuffer, filename, 'image/jpeg', MARKETING_BUCKET);
                            
                            const cleanPrompt = (prompts[i]?.prompt || '').substring(0, 1000);
                            saveLocalAsset({
                                name: `Carousel Slide ${i + 1} (Fallback - ${brand?.name || 'Zerolens'})`,
                                type: 'image',
                                url: uploaded,
                                prompt: cleanPrompt,
                                user_id: userId || 'anon',
                                created_at: new Date().toISOString(),
                                aspect: '9:16'
                            });

                            const dbClient = supabaseAdmin || supabase;
                            if (dbClient && isValidUuid(userId)) {
                                try {
                                    await dbClient.from('assets').insert([{
                                        name: `Carousel Slide ${i + 1} (Fallback - ${brand?.name || 'Zerolens'})`,
                                        type: 'image',
                                        url: uploaded,
                                        prompt: cleanPrompt,
                                        user_id: userId,
                                        created_at: new Date().toISOString(),
                                        metadata: { aspect: '9:16' }
                                    }]);
                                } catch (dbErr) {
                                    console.error('[DB] Failed to save fallback slide to assets:', dbErr.message);
                                }
                            }
                            
                            slides.push({ index: i, url: uploaded, filename: `slide_${i + 1}.png`, fallback: true });
                            continue;
                        } catch (fallbackErr) {
                            console.error(`[Carousel] GPT Image 2 fallback also failed:`, fallbackErr.message);
                            throw new Error(`Both Nano Banana 2 and GPT Image 2 failed for slide ${i + 1}. Please try again.`);
                        }
                    }
                    
                    if (genErr.name === 'AbortError' || genErr.message?.includes('timeout')) {
                        console.error(`[Carousel-${targetModel}] Slide ${i + 1} TIMEOUT after ${IMAGE_GEN_TIMEOUT}ms`);
                        throw new Error(`Generation timed out. The AI image service may be slow or unavailable.`);
                    }
                    throw genErr;
                }
            }

            res.json({ slides });
        } catch (err) {
            console.error('[Carousel-Generate]', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // ── Carousel Chat: AI conversation to design Instagram carousel ──────────────
    router.post('/carousel/chat', async (req, res) => {
        try {
            const { history, systemPrompt } = req.body;
            if (!Array.isArray(history) || history.length === 0) {
                return res.status(400).json({ error: 'history is required' });
            }
            
            let user;
            try {
                user = await requireAuth(req);
            } catch (_) {}
            const targetUserId = user ? user.id : req.body.userId;
            const apiKey = await resolveGoogleApiKey(req, targetUserId);
            const geminiModel = 'models/gemini-2.5-flash';
            
            const contents = history.map(m => ({
                role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content || m.parts?.[0]?.text || '' }]
            }));
            
            if (systemPrompt) {
                contents.unshift({
                    role: 'user',
                    parts: [{ text: `System: ${systemPrompt}` }]
                });
            }
            
            const resp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/${geminiModel}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents,
                        generationConfig: {
                            maxOutputTokens: 4096,
                            temperature: 0.8
                        }
                    })
                }
            );
            
            const data = await resp.json();
            if (!resp.ok) {
                throw new Error(data.error?.message || `Gemini API error: ${resp.status}`);
            }
            
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            res.json({ text });
        } catch (err) {
            console.error('[Carousel Chat]', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // ── Creative Direction: New AI Creative Director endpoint ──────────────
    router.post('/creative-direction/generate', async (req, res) => {
        try {
            const { topic, brandName, audience, emotionalGoal, artDirection, userId, brandColor } = req.body;
            
            if (!topic) {
                return res.status(400).json({ error: 'topic is required' });
            }

            const { CreativeDirectionEngine } = await import('../../services/creativeDirection/index.js');
            
            const engine = new CreativeDirectionEngine(userId || 'anon');
            
            const creativeDirection = await engine.createCreativeDirection({
                topic,
                brandName,
                audience,
                emotionalGoal,
                artDirection,
                brandColor,
                carouselType: 'authority',
            });

            res.json({
                success: true,
                creativeDirection,
                brief: {
                    topic: creativeDirection.brief.topic,
                    brandName: creativeDirection.brief.brandName,
                    artDirection: creativeDirection.brief.artDirection,
                    emotionalGoal: creativeDirection.brief.emotionalGoal,
                    slideCount: creativeDirection.brief.slideCount,
                },
                prompts: creativeDirection.slides.map(s => ({
                    slide: s.index + 1,
                    purpose: s.purpose,
                    prompt: s.prompt,
                })),
            });
        } catch (err) {
            console.error('[Creative Direction]', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
