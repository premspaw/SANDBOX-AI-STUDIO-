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
        consumeCredits
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
    router.post('/avatar/upload-ref', async (req, res) => {
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
    router.post('/avatar/generate-board', async (req, res) => {
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

            // 1. Charge credits conditionally (5 credits for Nano Banana Pro, 3 for GPT Image 2)
            const requiredCredits = model === 'banana' ? 5 : 3;
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

            if (model === 'banana') {
                // Trigger Google Gemini Imagen Pro multimodal generation in 2K
                const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
                const activeModel = 'gemini-3-pro-image-preview';
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;

                const imageParts = [];
                const urlsToFetch = [];
                if (refImageUrl) urlsToFetch.push({ type: 'character likeness', url: refImageUrl });
                if (leftProfileRefUrl) urlsToFetch.push({ type: 'left profile likeness', url: leftProfileRefUrl });
                if (rightProfileRefUrl) urlsToFetch.push({ type: 'right profile likeness', url: rightProfileRefUrl });
                if (wardrobeRefUrl) urlsToFetch.push({ type: 'wardrobe reference', url: wardrobeRefUrl });
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

                // Prepend visual anchoring guidelines to help Gemini synthesize them visually
                let multiRefNotes = '';
                if (refImageUrl) multiRefNotes += `- The main face image represents the character's facial likeness, identity, and features from the front.\n`;
                if (leftProfileRefUrl) multiRefNotes += `- The left profile image represents the character's facial likeness and features from the left profile side.\n`;
                if (rightProfileRefUrl) multiRefNotes += `- The right profile image represents the character's facial likeness and features from the right profile side.\n`;
                if (wardrobeRefUrl) multiRefNotes += `- The wardrobe reference image represents the wardrobe/outfit styling, garments, and details.\n`;
                if (propRefUrl) multiRefNotes += `- The prop reference image represents key prop/accessory design and detailing.\n`;

                if (multiRefNotes) {
                    prompt = `[Dynamic Visual Source Anchoring Guidelines:\n${multiRefNotes}Please visually synthesize all provided reference images seamlessly while maintaining the character identity (matching profile angles if provided), outfit, and prop aesthetics exactly as pictured in the respective reference images across all storyboard panels.]\n\n${prompt}`;
                }

                const parts = [...imageParts, { text: prompt }];

                const safetySettings = [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ];

                console.log('[Avatar Board] Querying Google Gemini Imagen...');
                const geminiResp = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts }],
                        safetySettings,
                        generationConfig: { 
                            responseModalities: ["IMAGE"],
                            imageConfig: {
                                aspectRatio: aspectRatio === '1:1' ? '1:1' : aspectRatio === '16:9' ? '16:9' : aspectRatio === '9:16' ? '9:16' : '1:1',
                                imageSize: '2K'
                            }
                        }
                    })
                });

                const result = await geminiResp.json();

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
                 if (refImageUrl || leftProfileRefUrl || rightProfileRefUrl || wardrobeRefUrl || propRefUrl) {
                    try {
                        console.log('[Avatar Board] Intercepting gpt-image-2 request to extract visual details using gpt-4o vision...');
                        
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
