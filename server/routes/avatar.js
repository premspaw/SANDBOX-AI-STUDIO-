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
            if (!refImageUrl && !wardrobeRefUrl && !propRefUrl) {
                return res.status(400).json({ error: 'At least one reference photo is required.' });
            }

            // 1. Charge credits conditionally (2 credits for Banana, 3 for GPT Image 2)
            const requiredCredits = model === 'banana' ? 2 : 3;
            console.log(`[Avatar Board] Consuming ${requiredCredits} credits for user: ${userId} using engine: ${model}`);
            await consumeCredits(userId, requiredCredits);

            // 2. Build the master prompt
            let prompt = buildBoardPrompt(boardType, additionalContext, model, boardMeta);
            if (aspectRatio && aspectRatio !== '1:1') {
                prompt += `\n\nEnsure the final output has a composition matching a ${aspectRatio} widescreen cinematic aspect ratio.`;
            }

            console.log(`[Avatar Board] Assembled Prompt for ${boardType} [${model}] [Aspect: ${aspectRatio}]: \n"${prompt.substring(0, 150)}..."`);

            let r2Url = '';

            if (model === 'banana') {
                // Trigger Google Gemini Imagen multimodal generation
                const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
                const activeModel = 'gemini-3.1-flash-image-preview';
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;

                const imageParts = [];
                const urlsToFetch = [];
                if (refImageUrl) urlsToFetch.push({ type: 'character likeness', url: refImageUrl });
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
                if (refImageUrl) multiRefNotes += `- The first image represents the character facial likeness, identity, and facial features.\n`;
                if (wardrobeRefUrl) multiRefNotes += `- The second image represents the wardrobe/outfit styling, garments, and clothing details.\n`;
                if (propRefUrl) multiRefNotes += `- The third image represents key prop/accessory design and detailing.\n`;

                if (multiRefNotes) {
                    prompt = `[Dynamic Visual Source Anchoring Guidelines:\n${multiRefNotes}Please visually synthesize all provided reference images seamlessly while maintaining the character identity, outfit, and prop aesthetics exactly as pictured in the respective reference images across all storyboard panels.]\n\n${prompt}`;
                }

                const parts = [...imageParts, { text: prompt }];

                console.log('[Avatar Board] Querying Google Gemini Imagen...');
                const geminiResp = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts }],
                        generationConfig: { 
                            responseModalities: ["IMAGE"],
                            imageConfig: {
                                aspectRatio: aspectRatio === '1:1' ? '1:1' : aspectRatio === '16:9' ? '16:9' : aspectRatio === '9:16' ? '9:16' : '1:1'
                            }
                        }
                    })
                });

                const result = await geminiResp.json();
                const b64 = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
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
                // Trigger GPT Image 2 image generation
                const openai = getOpenAIClient();
                
                // Prepend visual likeness/subject description for GPT Image 2 if any reference photo is provided
                if (refImageUrl || wardrobeRefUrl || propRefUrl) {
                    try {
                        console.log('[Avatar Board] Intercepting gpt-image-2 request to extract visual details using gpt-4o vision...');
                        
                        const visionPrompt = `Analyze the provided reference images.
- The first image represents the character's facial likeness, hair, and biological features.
- The second image (if provided) represents the wardrobe/outfit style, colors, and textures to use.
- The third image (if provided) represents the key prop/accessory design and detailing.

Synthesize all this information into a highly detailed, extremely precise and unified physical description of the character, their outfit, and their props under 140 words. Do not refer to the images as 'Image 1' or 'the first image' in your final description. Focus entirely on absolute descriptions of visual traits (face, hair, eyes, body, full outfit details, fabrics, prop structure, and aesthetic) to allow an AI image generator to recreate them with absolute fidelity.`;
                        
                        const userContent = [{ type: 'text', text: visionPrompt }];
                        if (refImageUrl) userContent.push({ type: 'image_url', image_url: { url: refImageUrl } });
                        if (wardrobeRefUrl) userContent.push({ type: 'image_url', image_url: { url: wardrobeRefUrl } });
                        if (propRefUrl) userContent.push({ type: 'image_url', image_url: { url: propRefUrl } });

                        const messages = [
                            {
                                role: 'user',
                                content: userContent
                            }
                        ];
                        
                        const likenessDescription = await openaiChat(messages, 'gpt-4o');
                        console.log(`[Avatar Board] Subject description extracted successfully: "${likenessDescription.substring(0, 100)}..."`);
                        
                        prompt = `[Reference Likeness/Subject Details: ${likenessDescription}]\n\n${prompt}`;
                    } catch (visionErr) {
                        console.warn('[Avatar Board] Warning: Failed to extract visual likeness via OpenAI Vision:', visionErr.message);
                    }
                }

                console.log('[Avatar Board] Querying OpenAI GPT Image 2...');
                
                const sizeMap = {
                    '1:1': '1024x1024',
                    '16:9': '1536x1024',
                    '9:16': '1024x1536'
                };
                const gptSize = sizeMap[aspectRatio] || '1024x1024';

                const response = await openai.images.generate({
                    model: 'gpt-image-2',
                    prompt,
                    quality: 'high',
                    size: gptSize,
                    n: 1
                });

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
                const { error: dbErr } = await client
                    .from('avatar_generations')
                    .insert({
                        user_id: userId,
                        type: boardType,
                        character_name: additionalContext || `${boardType} Target`,
                        style: 'Reference Board',
                        ref_image_url: refImageUrl || wardrobeRefUrl || propRefUrl || '',
                        output_url: r2Url,
                        prompt: prompt,
                        metadata: {
                            boardType,
                            additionalContext,
                            model,
                            refImageUrl,
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
