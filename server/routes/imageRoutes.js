import express from 'express';

export default function createRouter(deps) {
    const router = express.Router();
    const {
        consumeCredits,
        handleGoogle,
        handleOpenAI,
        openaiChat,
        geminiService,
        requireAuth
    } = deps;

    // Generate Image (Multi-Model Support)
    router.post('/generate-image', async (req, res) => {
        try {
            let user;
            try {
                user = await requireAuth(req);
            } catch (authErr) {
                if (process.env.NODE_ENV === 'production') {
                    return res.status(401).json({ error: 'Authentication required to generate images.' });
                }
            }

            const { model } = req.body;
            const targetUserId = user ? user.id : req.body.userId;

            // Deduct credits based on the model
            let requiredCredits = 2; // Default (Gemini 3.1 Flash Image preview / Nano Banana 2)
            const modelLower = (model || '').toLowerCase();
            if (modelLower === 'gpt-image-2') {
                const q = (req.body.quality || 'medium').toLowerCase();
                if (q === 'low') requiredCredits = 2;
                else if (q === 'high') requiredCredits = 5;
                else requiredCredits = 3; // medium / auto
            } else if (modelLower.includes('gpt') || modelLower.includes('openai') || modelLower.includes('dall')) {
                requiredCredits = 5; // OpenAI DALL-E costs 5 credits
            } else if (modelLower.includes('pro')) {
                requiredCredits = 5;
            } else if (modelLower === 'nano-banana' || modelLower === 'banana') {
                requiredCredits = 1;
            }

            if (targetUserId) {
                console.log(`[Generate Image] Consuming ${requiredCredits} credits for user: ${targetUserId} using model: ${model}`);
                await consumeCredits(targetUserId, requiredCredits);
            }

            if (model === 'gpt-image-2' || model === 'gpt-image-1' || model?.startsWith('gpt') || model?.startsWith('dall')) {
                return await handleOpenAI(req, res);
            }
            return await handleGoogle(req, res);
        } catch (err) {
            console.error('[Generate Image Error]:', err.message);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    // Proxy Remote Image/Video to bypass browser CORS
    router.get('/proxy-image', async (req, res) => {
        try {
            const { url } = req.query;
            if (!url) {
                return res.status(400).json({ error: 'url parameter is required' });
            }
            const { default: fetch } = await import('node-fetch');
            const response = await fetch(url);
            if (!response.ok) {
                return res.status(response.status).json({ error: `Failed to fetch remote resource: ${response.statusText}` });
            }
            const contentType = response.headers.get('content-type') || 'application/octet-stream';
            const buffer = await response.buffer();
            res.setHeader('Content-Type', contentType);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(buffer);
        } catch (err) {
            console.error('[Proxy Error]:', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // Edit Image (Inpainting/Outpainting)
    router.post('/edit-image', async (req, res) => {
        try {
            let user;
            try {
                user = await requireAuth(req);
            } catch (authErr) {
                if (process.env.NODE_ENV === 'production') {
                    return res.status(401).json({ error: 'Authentication required to edit images.' });
                }
            }

            const { imageBase64, maskBase64, prompt, referenceImage, userId, model = 'gemini' } = req.body;
            if (!imageBase64 || !maskBase64) {
                return res.status(400).json({ error: 'Base image and mask image are required.' });
            }

            const targetUserId = user ? user.id : userId;
            const { default: fetch } = await import('node-fetch');

            // 1. Deduct credits: Gemini/Banana inpaint costs 3 credits, GPT/OpenAI costs 5 credits
            const requiredCredits = model === 'gemini' ? 3 : 5;
            if (targetUserId) {
                console.log(`[Inpaint] Consuming ${requiredCredits} credits for user: ${targetUserId} using model: ${model}`);
                await consumeCredits(targetUserId, requiredCredits);
            }

            const toBuffer = async (str) => {
                if (!str) return null;
                if (str.startsWith('http://') || str.startsWith('https://')) {
                    const response = await fetch(str);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch remote image from URL: ${str}`);
                    }
                    return await response.buffer();
                }
                if (str.startsWith('data:')) {
                    return Buffer.from(str.split(',')[1], 'base64');
                }
                return Buffer.from(str, 'base64');
            };

            const imageBuffer = await toBuffer(imageBase64);
            const maskBuffer = await toBuffer(maskBase64);

            let buffer;

            if (model === 'gemini') {
                // Call premium Gemini 3.1 Flash Image model (Nano Banana 2) with native multimodal inpainting
                const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
                const activeModel = 'gemini-3.1-flash-image-preview';
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;

                console.log('[Inpaint] Querying Google Gemini 3.1 Multimodal Inpainting...');
                
                const parts = [
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: imageBuffer.toString('base64')
                        }
                    },
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: maskBuffer.toString('base64')
                        }
                    }
                ];

                if (referenceImage) {
                    try {
                        console.log('[Inpaint] Downloading style/guidance reference image...');
                        const refBuffer = await toBuffer(referenceImage);
                        if (refBuffer) {
                            parts.push({
                                inlineData: {
                                    mimeType: 'image/png',
                                    data: refBuffer.toString('base64')
                                }
                            });
                            console.log('[Inpaint] Style reference image loaded successfully.');
                        }
                    } catch (refErr) {
                        console.warn('[Inpaint] Warning: Failed to download reference image:', refErr.message);
                    }
                }

                parts.push({
                    text: `You are an expert image editor. Look at the base image and the mask image. Modify only the region of the base image that is highlighted in white in the mask image, according to this instruction: "${prompt}".${referenceImage ? ' Use the third provided reference image as a strong visual style, detail, and likeness guide for what to draw inside the edited area.' : ''} Keep all other parts of the image exactly the same.`
                });

                const safetySettings = [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ];

                const geminiResp = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts }],
                        safetySettings,
                        generationConfig: { responseModalities: ["IMAGE"] }
                    })
                });

                const result = await geminiResp.json();

                if (result.promptFeedback?.blockReason) {
                    const reason = result.promptFeedback.blockReason;
                    console.error('[Inpaint] Google API prompt feedback block:', JSON.stringify(result.promptFeedback));
                    if (reason === 'OTHER') {
                        throw new Error("Google API blocked the request (blockReason: OTHER). This is typically caused by a sensitive reference photo, copyright/trademark restrictions, or a celebrity likeness filter.");
                    } else {
                        throw new Error(`Google API safety block: ${reason}. Please try a different reference image or prompt.`);
                    }
                }

                const candidate = result.candidates?.[0];
                if (candidate && candidate.finishReason === 'SAFETY') {
                    throw new Error("SAFETY_REFUSAL: The creative prompt was blocked by safety filters.");
                }

                const b64 = candidate?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
                if (!b64) {
                    console.error('[Inpaint] Google API error response:', JSON.stringify(result));
                    throw new Error(result.error?.message || "Google API returned no image candidates");
                }

                buffer = Buffer.from(b64, 'base64');
            } else {
                // Call OpenAI Edit API
                const apiKey = process.env.OPENAI_API_KEY;
                if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
                const { default: OpenAI, toFile } = await import('openai');
                const openai = new OpenAI({ apiKey });

                const targetModel = model || 'gpt-image-2';
                console.log(`[Inpaint] Calling OpenAI edit API with model: ${targetModel}...`);

                const imageFile = await toFile(imageBuffer, 'image.png');
                const maskFile = await toFile(maskBuffer, 'mask.png');

                const imagesList = [imageFile];
                if (referenceImage) {
                    try {
                        const refBuffer = await toBuffer(referenceImage);
                        if (refBuffer) {
                            const refFile = await toFile(refBuffer, 'reference.png');
                            imagesList.push(refFile);
                        }
                    } catch (refErr) {
                        console.warn('[Inpaint] Warning: Failed to load reference image for OpenAI:', refErr.message);
                    }
                }

                const isGPTImage = targetModel === 'gpt-image-2' || targetModel === 'gpt-image-1.5' || targetModel.startsWith('gpt-image');

                const response = await openai.images.edit({
                    model: targetModel,
                    image: (isGPTImage && imagesList.length > 1) ? imagesList : imageFile,
                    mask: maskFile,
                    prompt: prompt,
                    n: 1,
                    size: '1024x1024',

                });

                const resultUrl = response.data?.[0]?.url;
                if (!resultUrl) {
                    throw new Error(`${targetModel} edit API failed to return an image.`);
                }

                // Download image buffer from OpenAI CDN
                const dallEResp = await fetch(resultUrl);
                if (!dallEResp.ok) {
                    throw new Error(`Failed to download image from OpenAI CDN: ${dallEResp.statusText}`);
                }
                buffer = await dallEResp.buffer();
            }

            // Save to standard R2 storage
            const { v4: uuidv4 } = await import('uuid');
            const uuid = uuidv4();
            const outputFileName = `outputs/edits/${userId}/${uuid}.png`;
            console.log(`[Inpaint] Transferring edited image to Cloudflare R2: ${outputFileName}`);
            
            const storageService = await import('../../services/storageService.js');
            const r2Url = await storageService.uploadToGCS(buffer, outputFileName, 'image/png');

            res.json({ url: r2Url });
        } catch (error) {
            console.error('Edit Image Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Analyze Frames
    router.post('/analyze-frames', async (req, res) => {
        try {
            const { frames } = req.body;
            if (!frames || !frames.length) {
                return res.status(400).json({ error: 'No frames provided' });
            }
            const actualService = geminiService || await import('../../src/services/geminiService.js');
            const analysis = await actualService.analyzeStoryboardFrames(frames);
            res.json({ analysis });
        } catch (error) {
            console.error('Frame Analysis Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // OpenAI Canvas: Copy Generation
    router.post('/canvas/copy', async (req, res) => {
        try {
            const { intent, tone, projectType } = req.body;
            const systemPrompt = `You are a professional marketing copywriter. Create short, bold poster copy for a ${projectType}. Tone: ${tone}. Rules: Headline max 6 words, Subtext max 10 words, CTA max 3 words. Return JSON only with keys: headline, subtext, cta.`;
            const content = await openaiChat([
                { role: "system", content: systemPrompt },
                { role: "user", content: intent }
            ], "gpt-4o", true);
            const result = JSON.parse(content);
            res.json(result);
        } catch (error) {
            console.error('OpenAI Copy Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // OpenAI Canvas: Image Generation (DALL-E 3)
    router.post('/canvas/image', async (req, res) => {
        try {
            const { prompt, width, height } = req.body;
            let size = "1024x1024";
            if (width > height) size = "1536x1024";
            else if (height > width) size = "1024x1536";
            
            // Reuse handleOpenAI standard behavior for safety and credit charge
            const mockReq = {
                body: {
                    ...req.body,
                    model: 'gpt-image-2',
                    prompt: `Professional poster background, no text, ${prompt}`,
                    size,
                    quality: 'hd'
                }
            };
            return await handleOpenAI(mockReq, res);
        } catch (error) {
            console.error('OpenAI Image Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // OpenAI Canvas: AI Director Analysis
    router.post('/canvas/analyze', async (req, res) => {
        try {
            const { context, url, brandName, projectType } = req.body;
            const systemPrompt = `You are an expert Creative Director. Analyze the request for a "${projectType}".
            Input Context: "${context}"
            Reference URL: "${url || 'None'}"
            Brand: "${brandName || 'Generic'}"
            Produce a comprehensive Design Plan in JSON format with keys: theme, visualDirection, headline, subtext, cta, suggestedPalette.`;
            const content = await openaiChat([
                { role: "system", content: systemPrompt },
                { role: "user", content: "Create the plan." }
            ], "gpt-4o", true);
            const result = JSON.parse(content);
            res.json(result);
        } catch (error) {
            console.error('Analyst Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Marketing Studio: GPT-4o Prompt Generation
    router.post('/marketing/generate-prompt', async (req, res) => {
        try {
            const { category, recipeData, medicalData, specialIngredients, brandColors, selectedStyle, referenceImage } = req.body;
            const isMedical = category === 'medical';

            const systemPrompt = `You are an expert marketing prompt engineer. Given business inputs, generate a JSON prompt object for an AI image generator.
            Return ONLY valid JSON matching this structure:
            {
                "goal": string,
                "mode": "premium_product_ad" | "detailed_infographic",
                "scene": string (lighting, mood, background description),
                "subject": string,
                "details": {
                    "composition": string,
                    "visual_quality": string
                },
                "constraints": string[]
            }`;

            let userContext = '';
            if (isMedical) {
                userContext = `Create a professional medical clinic marketing asset.
                Clinic: ${medicalData.clinic_name || 'Medical Clinic'}
                Doctor: ${medicalData.doctor_name || ''}
                Specialization: ${medicalData.specialization || ''}
                Services: ${medicalData.services || ''}
                Tagline: ${medicalData.tagline || ''}
                Style: ${selectedStyle}`;
            } else {
                userContext = `Create a marketing asset for a food/restaurant business.
                Dish: ${recipeData.dish_name || ''}
                Presentation: ${recipeData.dish_presentation || 'Modern editorial plating'}
                Ingredients: ${recipeData.ingredients?.map(i => `${i.quantity} ${i.name}`).join(', ') || ''}
                Steps: ${recipeData.steps?.join(' | ') || ''}
                Stats: ${recipeData.meta?.calories || ''} cal, ${recipeData.meta?.time || ''}, ${recipeData.meta?.servings || ''} servings
                Special Ingredients: ${specialIngredients?.join(', ') || 'None'}
                Style: ${selectedStyle}`;
            }

            const content = await openaiChat([
                { role: "system", content: systemPrompt },
                { role: "user", content: userContext + `\nBrand Colors: ${brandColors?.join(', ')}\nReference image provided: ${referenceImage ? 'Yes' : 'No'}` }
            ], "gpt-4o", true);

            const parsed = JSON.parse(content);
            res.json({ prompt: parsed, raw: content });
        } catch (err) {
            console.error('[MARKETING-PROMPT-ERR]', err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
