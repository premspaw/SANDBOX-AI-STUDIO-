import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import { buildBoardPrompt } from '../services/avatarPromptBuilder.js';

export default function createRouter(deps) {
    const router = express.Router();
    const {
        supabaseAdmin,
        supabase,
        storageService,
        getOpenAIClient,
        openaiChat,
        consumeCredits,
        requireAuth,
        resolveGoogleApiKey,
        getVertexToken,
        VERTEX_PROJECT_ID,
        VERTEX_LOCATION,
        VERTEX_KEY
    } = deps;

    // Helper to secure base64 decoding
    const toBuffer = (base64Str) => {
        if (!base64Str) return null;
        if (base64Str.startsWith('data:')) {
            return Buffer.from(base64Str.split(',')[1], 'base64');
        }
        return Buffer.from(base64Str, 'base64');
    };

    const resolveImageToBuffer = async (imgSrc) => {
        if (!imgSrc) return null;
        if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
            const resp = await fetch(imgSrc);
            if (!resp.ok) throw new Error(`Failed to fetch image from URL: ${resp.statusText}`);
            const mimeType = resp.headers.get('content-type') || 'image/png';
            const buffer = await resp.buffer();
            return { buffer, mimeType };
        }
        if (imgSrc.startsWith('data:')) {
            const [header, b64] = imgSrc.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
            return { buffer: Buffer.from(b64, 'base64'), mimeType };
        }
        return { buffer: Buffer.from(imgSrc, 'base64'), mimeType: 'image/png' };
    };

    /**
     * POST /api/avatar/upload-ref
     * Body: { image: string (base64), userId: string }
     * Uploads the user reference image to Cloudflare R2
     */
    router.post(['/avatar/upload-ref', '/upload-ref'], async (req, res) => {
        try {
            const { image, userId } = req.body;
            if (!image) {
                return res.status(400).json({ error: 'No reference image provided.' });
            }

            const buffer = toBuffer(image);
            if (!buffer) {
                return res.status(400).json({ error: 'Invalid image encoding.' });
            }

            const uid = userId || 'anon';
            const uuid = uuidv4();
            const fileName = `avatars/${uid}/${uuid}.png`;
            
            console.log(`[Avatar] Uploading reference photo: ${fileName}`);
            const publicUrl = await storageService.uploadToGCS(buffer, fileName, 'image/png');

            res.json({
                success: true,
                url: publicUrl,
                key: fileName
            });
        } catch (err) {
            console.error('[Avatar upload-ref error]:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/avatar/generate-board
     * Body: { boardType: string, refImageUrl: string, additionalContext: string, userId: string }
     * Generates one of the 6 GPT Image 2 Reference Boards
     */
    router.post(['/avatar/generate-board', '/generate-board'], async (req, res) => {
        try {
            const {
                boardType,
                refImageUrl,       // character likeness
                leftProfileRefUrl, // optional left profile likeness
                rightProfileRefUrl,// optional right profile likeness
                wardrobeRefUrl,    // wardrobe/outfit
                propRefUrl,        // prop/accessory
                additionalContext = '',
                userId,
                model = 'gpt2',
                aspectRatio = '1:1',
                boardMeta = {}
            } = req.body;

            if (!userId) {
                return res.status(400).json({ error: 'User must be authenticated to generate.' });
            }
            if (!boardType) {
                return res.status(400).json({ error: 'Board type is required.' });
            }

            // 1. Charge credits conditionally (5 credits for Nano Banana Pro, 2 for Nano Banana 2, 3 for GPT Image 2)
            const isBananaPro = model === 'banana' || model === 'banana-pro';
            const isBanana2 = model === 'banana2' || model === 'banana-2' || model === 'nb2';
            const requiredCredits = isBananaPro ? 5 : isBanana2 ? 2 : 3;
            console.log(`[Avatar Board] Consuming ${requiredCredits} credits for user: ${userId} using engine: ${model}`);
            await consumeCredits(userId, requiredCredits);

            const isValidImageUrl = (url) => {
                if (!url) return false;
                const s = String(url).trim().toLowerCase();
                return s !== '' && s !== 'null' && s !== 'undefined' && s !== 'none';
            };
            const hasRefImage = isValidImageUrl(refImageUrl) || 
                               isValidImageUrl(leftProfileRefUrl) || 
                               isValidImageUrl(rightProfileRefUrl) || 
                               isValidImageUrl(wardrobeRefUrl) || 
                               isValidImageUrl(propRefUrl);

            // 2. Build the master prompt
            let prompt = buildBoardPrompt(boardType, additionalContext, model, boardMeta);
            if (!hasRefImage) {
                // Remove reference image requirements/mentions in prompt templates
                prompt = prompt
                    .replace(/Use the uploaded image\(s\) as the ONLY identity reference\./gi, '')
                    .replace(/Preserve the exact facial identity with maximum accuracy\./gi, '')
                    .replace(/Do not beautify, stylize, or redesign the face\./gi, '')
                    .replace(/Lock the person's facial features, hairstyle, skin tone, facial proportions, body proportions, age, expression, and overall likeness across every panel\./gi, '')
                    .replace(/using the attached (photo|photos|image) of the (character|creature|object|location)? as the single source of truth/gi, 'based on the description')
                    .replace(/using the attached (photo|photos|image) as the single source of truth/gi, 'based on the description')
                    .replace(/using the attached (photo|photos|image) as the single source keyframe/gi, 'based on the description')
                    .replace(/using the attached (photo|photos|image)/gi, 'based on the description')
                    .replace(/attached photo of the character as the single source of truth/gi, 'character description')
                    .replace(/attached photos as the single source of truth/gi, 'character description')
                    .replace(/attached photo of the location as the single source of truth/gi, 'location description')
                    .replace(/attached photo of the object as the single source of truth/gi, 'object description')
                    .replace(/attached image of the creature as the single source of truth/gi, 'creature description')
                    .replace(/attached photo as the single source keyframe/gi, 'scene description')
                    .replace(/Keep the clothing and props exactly the same as the uploaded references unless explicitly changed\./gi, 'Generate the clothing and props based on the description parameters.')
                    .replace(/uploaded references/gi, 'description parameters')
                    .replace(/uploaded reference/gi, 'description parameters')
                    .replace(/uploaded image/gi, 'description')
                    .replace(/# IDENTITY LOCK[\s\S]*?(?=##|$)/gi, '') // Remove identity lock details if no reference photo is uploaded
                    .replace(/## FACE ANALYSIS[\s\S]*?(?=##|$)/gi, '')
                    .replace(/## IDENTITY CONSISTENCY[\s\S]*?(?=##|$)/gi, '')
                    .replace(/## MULTI-REFERENCE MODE[\s\S]*?(?=##|$)/gi, '')
                    .replace(/## PRIORITY ORDER[\s\S]*?(?=IDENTITY LOCK:|$)/gi, '')
                    .replace(/IDENTITY LOCK: MAXIMUM \| FACIAL CONSISTENCY: 100% \| CHARACTER CONSISTENCY: 100% \| NO IDENTITY DRIFT \| NO BEAUTIFICATION \| NO FACE REINTERPRETATION/gi, '');
            }
            if (aspectRatio && aspectRatio !== '1:1') {
                prompt += `\n\nEnsure the final output has a composition matching a ${aspectRatio} widescreen cinematic aspect ratio.`;
            }

            console.log(`[Avatar Board] Assembled Prompt for ${boardType} [${model}] [Aspect: ${aspectRatio}]: \n"${prompt.substring(0, 150)}..."`);

            let r2Url = '';

            if (isBananaPro || isBanana2) {
                const apiKey = await resolveGoogleApiKey(req, userId, true);
                const activeModel = isBananaPro ? 'gemini-3-pro-image-preview' : 'gemini-3.1-flash-image';

                const imageParts = [];
                const urlsToFetch = [];
                if (refImageUrl) urlsToFetch.push({ type: boardType === 'LOCATION' ? 'location atmosphere' : boardType === 'OBJECT' ? 'prop reference' : 'character likeness', url: refImageUrl });
                if (leftProfileRefUrl && boardType === 'CHARACTER') urlsToFetch.push({ type: 'left profile likeness', url: leftProfileRefUrl });
                if (rightProfileRefUrl && boardType === 'CHARACTER') urlsToFetch.push({ type: 'right profile likeness', url: rightProfileRefUrl });
                if (wardrobeRefUrl && boardType === 'CHARACTER') urlsToFetch.push({ type: 'wardrobe reference', url: wardrobeRefUrl });
                if (propRefUrl) urlsToFetch.push({ type: 'prop reference', url: propRefUrl });

                await Promise.all(urlsToFetch.map(async (item) => {
                    try {
                        console.log(`[Avatar Board] Downloading ${item.type} to pass to Gemini: ${item.url}`);
                        const imgResp = await fetch(item.url);
                        if (imgResp.ok) {
                            const imgBuffer = await imgResp.buffer();
                            const mimeType = imgResp.headers.get('content-type') || 'image/png';
                            imageParts.push({
                                inlineData: {
                                    mimeType,
                                    data: imgBuffer.toString('base64')
                                }
                            });
                        }
                    } catch (fetchErr) {
                        console.warn(`[Avatar Board] Warning: Failed to download ${item.type} image for Gemini:`, fetchErr.message);
                    }
                }));

                // Prepend visual anchoring guidelines tailored to the active production mode
                let multiRefNotes = '';
                if (boardType === 'LOCATION') {
                    if (refImageUrl) multiRefNotes += `- The reference image represents the architectural style, environmental atmosphere, lighting mood, and color grade of the location.\n`;
                } else if (boardType === 'OBJECT') {
                    if (propRefUrl || refImageUrl) multiRefNotes += `- The reference image represents the product prop design, materials, geometry, and surface finishes.\n`;
                } else {
                    if (refImageUrl) multiRefNotes += `- The main face image represents the character's facial likeness, identity, and features from the front.\n`;
                    if (leftProfileRefUrl) multiRefNotes += `- The left profile image represents the character's facial likeness and features from the left profile side.\n`;
                    if (rightProfileRefUrl) multiRefNotes += `- The right profile image represents the character's facial likeness and features from the right profile side.\n`;
                    if (wardrobeRefUrl) multiRefNotes += `- The wardrobe reference image represents the wardrobe/outfit styling, garments, and details.\n`;
                    if (propRefUrl) multiRefNotes += `- The prop reference image represents key prop/accessory design and detailing.\n`;
                }

                if (multiRefNotes) {
                    if (boardType === 'LOCATION') {
                        prompt = `[Visual Atmosphere Reference Notes:\n${multiRefNotes}Match the environmental lighting and aesthetic mood of the reference image for this cinematic location scene. Remember: completely empty, no people.]\n\n${prompt}`;
                    } else if (boardType === 'OBJECT') {
                        prompt = `[Visual Prop Reference Notes:\n${multiRefNotes}Match the prop design, materials, and form factor of the reference image. Remember: isolated on a neutral light gray studio background, no text, no hands.]\n\n${prompt}`;
                    } else {
                        prompt = `[Dynamic Visual Source Anchoring Guidelines:\n${multiRefNotes}Please visually synthesize all provided reference images seamlessly while maintaining the character identity (matching profile angles if provided), outfit, and prop aesthetics exactly as pictured in the respective reference images across all turnaround panels.]\n\n${prompt}`;
                    }
                }

                const parts = [...imageParts, { text: prompt }];

                const safetySettings = [
                    { category: "HARM_CATEGORY_IMAGE_HATE", threshold: "OFF" },
                    { category: "HARM_CATEGORY_IMAGE_DANGEROUS_CONTENT", threshold: "OFF" },
                    { category: "HARM_CATEGORY_IMAGE_HARASSMENT", threshold: "OFF" },
                    { category: "HARM_CATEGORY_IMAGE_SEXUALLY_EXPLICIT", threshold: "OFF" },
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ];

                const generationBody = JSON.stringify({
                    contents: [{ role: 'user', parts }],
                    safetySettings,
                    generationConfig: { 
                        responseModalities: ["IMAGE", "TEXT"],
                        imageConfig: {
                            aspectRatio: aspectRatio === '1:1' ? '1:1' : aspectRatio === '16:9' ? '16:9' : aspectRatio === '9:16' ? '9:16' : '1:1',
                            imageSize: isBananaPro ? '2K' : '1K'
                        },
                        thinkingConfig: {
                            thinkingLevel: "MINIMAL"
                        }
                    }
                });

                // Helper to perform the call against Vertex AI or AI Studio
                const executeGeneration = async (useVertex) => {
                    let ep = '';
                    const hdrs = { 'Content-Type': 'application/json' };
                    if (useVertex) {
                        const token = await getVertexToken();
                        if (!token) throw new Error('Vertex AI authentication token could not be acquired.');
                        // Vertex AI hosts gemini-3.1-flash-image at location: global
                        const vertexModel = 'gemini-3.1-flash-image';
                        ep = `https://aiplatform.googleapis.com/v1beta1/projects/${VERTEX_PROJECT_ID}/locations/global/publishers/google/models/${vertexModel}:generateContent`;
                        hdrs['Authorization'] = `Bearer ${token}`;
                        console.log(`[Avatar Board] [Vertex AI PRIMARY] Calling model ${vertexModel} (location: global, 2K)`);
                    } else {
                        const studioKey = (apiKey && apiKey !== 'VERTEX_AI_CLIENT') ? apiKey : (process.env.ADMIN_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_API_KEY);
                        if (!studioKey) throw new Error('No Google AI Studio API key configured.');
                        ep = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${studioKey}`;
                        console.log(`[Avatar Board] [AI Studio FALLBACK] Calling model gemini-3.1-flash-image via API Key`);
                    }

                    const resp = await fetch(ep, {
                        method: 'POST',
                        headers: hdrs,
                        body: generationBody
                    });
                    const resJson = await resp.json().catch(() => ({}));
                    return { ok: resp.ok, status: resp.status, data: resJson };
                };

                let result = null;
                const tokenCheck = await getVertexToken().catch(() => null);
                const canUseVertex = Boolean(VERTEX_KEY || apiKey === 'VERTEX_AI_CLIENT' || tokenCheck);
                const studioKey = (apiKey && apiKey !== 'VERTEX_AI_CLIENT') ? apiKey : (process.env.ADMIN_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_API_KEY);

                // 1. Try Vertex AI first whenever credentials exist
                if (canUseVertex) {
                    try {
                        const res = await executeGeneration(true);
                        if (res.ok && res.data?.candidates?.[0]?.content?.parts?.some(p => p.inlineData)) {
                            result = res.data;
                        } else {
                            console.warn('[Avatar Board] Vertex AI generation response not successful:', JSON.stringify(res.data).slice(0, 300));
                            // Fallback to AI Studio if available
                            if (studioKey) {
                                console.log('[Avatar Board] Attempting fallback to Google AI Studio...');
                                const studioRes = await executeGeneration(false);
                                if (studioRes.ok) result = studioRes.data;
                                else result = res.data; // keep vertex error if both fail
                            } else {
                                result = res.data;
                            }
                        }
                    } catch (vertexErr) {
                        console.warn('[Avatar Board] Vertex AI invocation error:', vertexErr.message);
                        if (studioKey) {
                            console.log('[Avatar Board] Falling back to Google AI Studio after Vertex exception...');
                            const studioRes = await executeGeneration(false);
                            result = studioRes.data;
                        } else {
                            throw vertexErr;
                        }
                    }
                } else {
                    // 2. Vertex credentials not found on this server, try AI Studio
                    console.log('[Avatar Board] Vertex credentials not found in env, attempting Google AI Studio...');
                    const studioRes = await executeGeneration(false);
                    result = studioRes.data;
                }

                if (!result) {
                    throw new Error("Failed to receive generation response from either Vertex AI or AI Studio.");
                }

                if (result.promptFeedback?.blockReason) {
                    const reason = result.promptFeedback.blockReason;
                    console.error('[Avatar Board] Google API prompt feedback block:', JSON.stringify(result.promptFeedback));
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
                    console.error('[Avatar Board] Google API error response:', JSON.stringify(result));
                    throw new Error(result.error?.message || "Google API returned no image candidates");
                }

                const buffer = Buffer.from(b64, 'base64');
                const uuid = uuidv4();
                const outputFileName = `outputs/boards/${userId}/${uuid}.png`;
                console.log(`[Avatar Board] Transferring image to Cloudflare R2: ${outputFileName}`);
                r2Url = await storageService.uploadToGCS(buffer, outputFileName, 'image/png');
            } else {
                // Trigger GPT Image 2 image generation (Force official client to prevent OpenRouter proxying)
                const openai = getOpenAIClient(true);
                
                 // Prepend visual likeness/subject description for GPT Image 2 if any reference photo is provided
                 if (boardType === 'CHARACTER' && (refImageUrl || leftProfileRefUrl || rightProfileRefUrl || wardrobeRefUrl || propRefUrl)) {
                    try {
                        console.log('[Avatar Board] Intercepting gpt-image-2 request to extract character visual details using gpt-4o vision...');
                        
                        const visionPrompt = `Analyze the provided reference images in detail.
- The main face likeness image (and profile images if provided) represents the character's facial likeness, features, and shape.
- The wardrobe image (if provided) represents the clothing style, colors, and textures.
- The prop image (if provided) represents the key prop/accessory design.

Provide a highly detailed, extremely precise, and unified physical description of this character, their facial features, their outfit, and their props. 

Specifically describe:
1. FACIAL LIKENESS: Define their exact face shape, estimated age, ethnicity/skin tone, eye shape/color, eyebrow structure, nose shape, lip thickness, cheekbones, jawline, facial hair (e.g. beard/stubble), hairstyle, hair color/texture, and any distinctive facial features. Be extremely specific so an AI image generator can recreate their face likeness with high accuracy.
2. OUTFIT/WARDROBE: Describe the garment types, colors, materials/textures (e.g., denim, leather, cotton), stitching, fit, footwear, and any logos or details visible.
3. PROPS/ACCESSORIES: Describe any props or objects (e.g., bags, tools, equipment) including their shapes, materials, and colors.

Limit the entire description to under 300 words. Do not refer to the images as "image 1" or "the uploaded photo"; write it as a direct physical description of a person. Focus entirely on absolute visual traits.`;
                        
                        const userContent = [{ type: 'text', text: visionPrompt }];
                        if (refImageUrl) userContent.push({ type: 'image_url', image_url: { url: refImageUrl } });
                        if (leftProfileRefUrl) userContent.push({ type: 'image_url', image_url: { url: leftProfileRefUrl } });
                        if (rightProfileRefUrl) userContent.push({ type: 'image_url', image_url: { url: rightProfileRefUrl } });
                        if (wardrobeRefUrl) userContent.push({ type: 'image_url', image_url: { url: wardrobeRefUrl } });
                        if (propRefUrl) userContent.push({ type: 'image_url', image_url: { url: propRefUrl } });

                        const response = await openai.chat.completions.create({
                            model: 'gpt-4o',
                            messages: [
                                {
                                    role: 'user',
                                    content: userContent
                                }
                            ]
                        });
                        const likenessDescription = response.choices?.[0]?.message?.content || '';
                        console.log(`[Avatar Board] Subject description extracted successfully: "${likenessDescription.substring(0, 100)}..."`);
                        
                        prompt = `The character's physical appearance is as follows:\n${likenessDescription}\n\n${prompt}`;
                        
                        // Replace the generic "Use the uploaded image(s) as the ONLY identity reference." with the specific description reference
                        prompt = prompt.replace(
                            /Use the uploaded image\(s\) as the ONLY identity reference\./gi,
                            'Use the physical appearance details described above as the ONLY identity reference.'
                        );
                    } catch (visionErr) {
                        console.warn('[Avatar Board] Warning: Failed to extract visual likeness via OpenAI Vision:', visionErr.message);
                    }
                } else if (boardType === 'LOCATION' && refImageUrl) {
                    prompt = `[Atmosphere Reference Guidance: Use the architectural mood, lighting, and environmental tone of the attached image as inspiration for the cinematic location. Maintain an empty environment with no people.]\n\n${prompt}`;
                } else if (boardType === 'OBJECT' && (propRefUrl || refImageUrl)) {
                    prompt = `[Prop Reference Guidance: Use the prop design, materials, and form factor of the attached image. Present isolated on a seamless neutral light gray background with soft floor shadow, no text.]\n\n${prompt}`;
                }

                const sizeMap = {
                    '1:1': '1024x1024',
                    '16:9': '1536x1024',
                    '9:16': '1024x1536'
                };
                const gptSize = sizeMap[aspectRatio] || '1024x1024';

                let response;
                if (hasRefImage) {
                    const { toFile } = await import('openai');
                    const resolved = await resolveImageToBuffer(refImageUrl || leftProfileRefUrl || rightProfileRefUrl || wardrobeRefUrl || propRefUrl);
                    if (!resolved) throw new Error('Failed to resolve reference image to buffer.');
                    const { buffer: rawBuf } = resolved;
                    const imageFile = await toFile(rawBuf, 'reference.png', { type: 'image/png' });

                    const imagesList = [imageFile];
                    
                    if (leftProfileRefUrl) {
                        try {
                            const resL = await resolveImageToBuffer(leftProfileRefUrl);
                            if (resL) imagesList.push(await toFile(resL.buffer, 'left_profile.png', { type: 'image/png' }));
                        } catch (e) { console.warn('[Avatar Board] Failed to add left profile to edit list:', e.message); }
                    }
                    if (rightProfileRefUrl) {
                        try {
                            const resR = await resolveImageToBuffer(rightProfileRefUrl);
                            if (resR) imagesList.push(await toFile(resR.buffer, 'right_profile.png', { type: 'image/png' }));
                        } catch (e) { console.warn('[Avatar Board] Failed to add right profile to edit list:', e.message); }
                    }
                    if (wardrobeRefUrl) {
                        try {
                            const resW = await resolveImageToBuffer(wardrobeRefUrl);
                            if (resW) imagesList.push(await toFile(resW.buffer, 'wardrobe.png', { type: 'image/png' }));
                        } catch (e) { console.warn('[Avatar Board] Failed to add wardrobe to edit list:', e.message); }
                    }
                    if (propRefUrl) {
                        try {
                            const resP = await resolveImageToBuffer(propRefUrl);
                            if (resP) imagesList.push(await toFile(resP.buffer, 'prop.png', { type: 'image/png' }));
                        } catch (e) { console.warn('[Avatar Board] Failed to add prop to edit list:', e.message); }
                    }

                    console.log('[Avatar Board] Querying OpenAI GPT Image 2 (Edits/Reference)...');
                    response = await openai.images.edit({
                        model: 'gpt-image-2',
                        image: imagesList.length > 1 ? imagesList : imageFile,
                        prompt,
                        size: gptSize,
                        n: 1
                    });
                } else {
                    console.log('[Avatar Board] Querying OpenAI GPT Image 2 (Generate)...');
                    response = await openai.images.generate({
                        model: 'gpt-image-2',
                        prompt,
                        quality: 'high',
                        size: gptSize,
                        n: 1
                    });
                }

                let buffer;
                const b64 = response.data?.[0]?.b64_json;
                const dallEUrl = response.data?.[0]?.url;

                if (b64) {
                    console.log('[Avatar Board] Successfully received Base64 from gpt-image-2...');
                    buffer = Buffer.from(b64, 'base64');
                } else if (dallEUrl) {
                    console.log(`[Avatar Board] Downloading from OpenAI CDN: ${dallEUrl.slice(0, 100)}...`);
                    const dallEResp = await fetch(dallEUrl);
                    if (!dallEResp.ok) {
                        throw new Error(`Failed to download image from OpenAI CDN: ${dallEResp.statusText}`);
                    }
                    buffer = await dallEResp.buffer();
                } else {
                    throw new Error('GPT Image 2 failed to return an image.');
                }

                const uuid = uuidv4();
                const outputFileName = `outputs/boards/${userId}/${uuid}.png`;
                console.log(`[Avatar Board] Transferring image to Cloudflare R2: ${outputFileName}`);
                r2Url = await storageService.uploadToGCS(buffer, outputFileName, 'image/png');
            }

            // 5. Insert generation details into Supabase database
            const client = supabaseAdmin || supabase;
            if (client) {
                console.log('[Avatar Board] Logging generation details in Supabase...');

                let characterName = '';
                if (boardType === 'CHARACTER') {
                    const name = boardMeta.name || '';
                    const age = boardMeta.age || '';
                    if (name && age) {
                        characterName = `NAME: ${name.toUpperCase()}, AGE: ${age}`;
                    } else if (name) {
                        characterName = `NAME: ${name.toUpperCase()}`;
                    } else {
                        characterName = additionalContext || `${boardType} Target`;
                    }
                } else {
                    const name = boardMeta.name || '';
                    characterName = name ? `${name.toUpperCase()} — ${boardType} Board` : (additionalContext || `${boardType} Target`);
                }

                const { error: dbErr } = await client
                    .from('avatar_generations')
                    .insert({
                        user_id: userId,
                        type: boardType,
                        character_name: characterName,
                        style: 'Reference Board',
                        ref_image_url: refImageUrl || leftProfileRefUrl || rightProfileRefUrl || wardrobeRefUrl || propRefUrl || '',
                        output_url: r2Url,
                        prompt: prompt,
                        metadata: {
                            boardType,
                            additionalContext,
                            model,
                            refImageUrl,
                            leftProfileRefUrl,
                            rightProfileRefUrl,
                            wardrobeRefUrl,
                            propRefUrl
                        }
                    });
                if (dbErr) {
                    console.warn('[Avatar Board] Warning: Failed to write to Supabase log:', dbErr.message);
                }
            }

            res.json({
                success: true,
                outputUrl: r2Url,
                prompt: prompt
            });
        } catch (err) {
            console.error('[Avatar generate-board error]:', err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
