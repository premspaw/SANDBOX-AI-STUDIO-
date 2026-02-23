import { GoogleGenerativeAI } from "@google/generative-ai";

const getAI = () => {
    // Priority: Runtime Store Key > Env Var
    const storeKey = typeof window !== 'undefined' && window.__VEO_API_KEY__;
    const apiKey = storeKey ||
        (typeof process !== 'undefined' ? process.env.GOOGLE_API_KEY : null) ||
        (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GOOGLE_API_KEY : null) ||
        '';
    return new GoogleGenerativeAI(apiKey);
};

/**
 * Checks if the local backend is alive.
 */
export const checkBackend = async () => {
    if (typeof window === 'undefined') return false;
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 1500);
        const resp = await fetch('http://localhost:3002/api/forge/health', {
            method: 'GET',
            signal: controller.signal
        });
        clearTimeout(id);
        return resp.ok;
    } catch (e) {
        return false;
    }
};

// Neural Universe Bible Formatter
const formatBibleContext = (bible) => {
    if (!bible) return "";
    let context = "### NEURAL_UNIVERSE_BIBLE_CONTEXT\n";

    if (Object.keys(bible.characters).length > 0) {
        context += "CHARACTERS:\n";
        Object.entries(bible.characters).forEach(([id, char]) => {
            context += `- ${char.name}: ${char.backstory?.substring(0, 100)}... Personality: ${char.personality}\n`;
        });
    }

    if (bible.rules && bible.rules.length > 0) {
        context += "DIRECTORIAL_RULES:\n";
        bible.rules.forEach(rule => context += `- ${rule}\n`);
    }

    context += "INSTRUCTIONS: Maintain absolute visual and narrative consistency with the above context in this generation.\n\n";
    return context;
};

// Image Extractor
const extractImage = (response) => {
    if (!response.candidates || response.candidates.length === 0) return null;
    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts) return null;

    for (const part of candidate.content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
};

// Retry Wrapper
async function withRetry(fn, retries = 3, delay = 1000) {
    try {
        return await fn();
    } catch (error) {
        if (retries > 0 && (error.status === 500 || error.status === 503 || error.status === 429)) {
            console.warn(`API Error ${error.status}. Retrying in ${delay}ms... (${retries} left)`);
            await new Promise(res => setTimeout(res, delay));
            return withRetry(fn, retries - 1, delay * 2);
        }
        throw error;
    }
}

/**
 * RULE 4 — Payload Optimization:
 * Compresses a base64 image to max 1024x1024px using browser Canvas API.
 * - If already a URL (http/https), skip — server handles remote fetching.
 * - If base64 is small (<200KB raw), skip compression to save time.
 * - Otherwise: draw to canvas, downscale proportionally, re-encode as JPEG 85%.
 * @param {string} img - base64 data URL or remote URL
 * @returns {Promise<string>} - compressed data URL or original
 */
const compressImageToMax1024 = async (img) => {
    if (!img) return img;
    // If server-side, skip browser-only compression
    if (typeof window === 'undefined') return img;

    // Already small enough (<~200KB base64 ≈ ~150KB binary) — skip
    const isData = img.startsWith('data:');
    const isUrl = img.startsWith('http') || img.startsWith('//');
    const rawB64 = (!isData && !isUrl) ? img : (img.includes('base64,') ? img.split('base64,')[1] : null);

    // If it's base64 and small, skip
    if (rawB64 && rawB64.length < 200_000) return img;

    return new Promise((resolve) => {
        const image = new Image();
        if (isUrl) image.crossOrigin = "anonymous"; // Needed for canvas if URL

        image.onload = () => {
            const MAX = 1024;
            let { width, height } = image;

            if (width > MAX || height > MAX) {
                if (width > height) {
                    height = Math.round((height / width) * MAX);
                    width = MAX;
                } else {
                    width = Math.round((width / height) * MAX);
                    height = MAX;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0, width, height);

            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            console.log(`[PAYLOAD_OPT] Compressed image: ${isUrl ? 'URL' : Math.round(rawB64.length / 1024) + 'KB'} → ${Math.round(compressed.length / 1024)}KB (${width}×${height}px)`);
            resolve(compressed);
        };
        image.onerror = () => resolve(img);

        if (isData) {
            image.src = img;
        } else if (isUrl) {
            image.src = img.startsWith('//') ? `https:${img}` : img;
        } else {
            image.src = `data:image/png;base64,${img}`;
        }
    });
};

/**
 * Builds a safe, prioritized reference image array for Consistency Mode.
 * Rules:
 *  1. Always include poseImage (if exists) then wardrobeImage (if exists) first.
 *  2. Fill remaining slots with identity_kit images: anchor → angle_3 → angle_1 → angle_2 → angle_4.
 *  3. Hard cap at MAX_REFS (4) to prevent Vertex API payload overflow.
 *  4. Strip null/undefined with .filter(Boolean).
 *
 * @param {object} opts
 * @param {object|null} opts.kit       - character.identity_kit (has .anchor, .angle_1 … .angle_4)
 * @param {string|null} opts.anchor    - fallback single anchorImage from store
 * @param {string|null} opts.wardrobe  - wardrobeImage from store
 * @param {string|null} opts.pose      - poseImage from store
 * @param {string|null} opts.product   - currentProduct.image from store (optional)
 * @returns {string[]} - safe references array, max 4 items
 */
export const buildConsistencyRefs = async ({ kit, anchor, wardrobe, pose, product } = {}) => {
    const MAX_REFS = 4;

    // Priority 1: wardrobe + pose always win a slot (they define the current scene context)
    const priority = [pose, wardrobe].filter(Boolean);

    // Priority 2: identity_kit images — most informative angles first
    const kitOrder = [
        kit?.anchor,    // hero front shot — highest identity signal
        kit?.angle_3,   // 3/4 angle — best for face + body
        kit?.angle_1,   // side angle
        kit?.angle_2,   // close-up face
        kit?.angle_4,   // full body
    ].filter(Boolean);

    // Fallback: if no kit, use single anchor image
    const kitRefs = kitOrder.length > 0 ? kitOrder : [anchor].filter(Boolean);

    // Fill remaining slots after priority images
    const remainingSlots = MAX_REFS - priority.length;
    const kitSlice = kitRefs.slice(0, remainingSlots);

    // Combine and enforce hard cap
    const rawRefs = [...priority, ...kitSlice].filter(Boolean).slice(0, MAX_REFS);

    // ✅ RULE 4: Compress all base64 refs to max 1024px before sending
    const refs = await Promise.all(rawRefs.map(compressImageToMax1024));

    console.log(`[CONSISTENCY_ENGINE] ${refs.length}/${MAX_REFS} refs packed | Kit: ${kitSlice.length} | Scene: ${priority.length}`);
    return refs;
};

const SYSTEM_PROMPT_EXPANDER = `
You are an expert AI prompt engineer for high-end, multi-modal image generation pipelines (ControlNet/IP-Adapter). 
Take the provided JSON payload and rewrite it into a single, flawless, highly descriptive natural language prompt.

CRITICAL ARCHITECTURE RULE: 
The final image generator will receive actual photos of the 'subject' and the 'productDetails' alongside this text prompt. 
THEREFORE: 
1. DO NOT describe physical appearance, clothing, or exact colors/logos. Let the provided image files do the heavy lifting. 
2. ANTI-LEAKAGE RULE: NEVER use the subject's actual name (e.g., 'Kajol') in the final output prompt. Image generators often have celebrity weights tied to names. 
3. Use generic identifiers instead: 'the subject', 'the person', 'the woman', or 'the man' based on the 'subjectDescription' context.

RULES:
1. Fix all typos and bad grammar from the 'userAction'.
2. Describe HOW the subject is physically interacting with the 'productDetails' based on the 'userAction'.
3. Place the action in the exact environment requested by the 'userAction', completely ignoring the original product scan background.
4. CATEGORY STYLING:
   - "FOOD REVIEW" / "TECH UNBOX": Bright studio lighting, vlog-style, subject looking at camera.
   - "SKINCARE" / "FASHION": Soft flattering beauty lighting, glowing editorial aesthetic.
   - "GYM UGC AD": Energetic, high-contrast, fitness environment.
5. DYNAMIC LENS & FRAMING: Use 'duration' to determine the shot distance:
   - "15s": Extremely tight, macro close-up shot. Use "100mm macro lens, shallow depth of field."
   - "30s": Standard portrait/medium shot. Use "50mm or 85mm portrait lens."
   - "60s": Wide environmental/lifestyle shot. Use "24mm or 35mm wide-angle lens, deep background context."
6. CAMERA EQUIPMENT OVERRIDE: Look at 'visualStyle': 
   - If "UGC_Photo": Append "Shot on iPhone 15 Pro Max, Apple ProRAW, computational photography, casual, candid, unedited everyday look."
   - If "Cinematic": Append "Shot on ARRI Alexa 65, anamorphic lens, cinematic color grading, dramatic volumetric lighting, 8k resolution, cinematic masterpiece."
7. Output ONLY the final prompt string.
`;

export const generateCharacterImage = async (params) => {
    return withRetry(async () => {
        try {
            // 1. Try local server first (Frontend only)
            if (typeof window !== 'undefined') {
                const isAlive = await checkBackend();
                if (isAlive) {
                    const response = await fetch('http://localhost:3002/api/forge/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(params)
                    });

                    if (response.ok) {
                        const data = await response.json();
                        return data.url;
                    }
                }
            }

            // 2. Fallback: Direct SDK (Standalone Mode or Backend usage)
            const ai = getAI();
            const model = ai.getGenerativeModel({ model: "gemini-3-pro-image-preview" });

            const prompt = params.prompt;
            const refs = params.identity_images || [];

            const parts = [
                { text: prompt },
                ...refs.map(ref => {
                    const [meta, data] = ref.split(',');
                    return { inlineData: { data, mimeType: meta.split(':')[1]?.split(';')[0] || 'image/png' } };
                })
            ];

            const result = await model.generateContent({
                contents: [{ role: "user", parts }],
                generationConfig: {
                    responseModalities: ["image", "text"]
                }
            });

            const candidate = result.response.candidates?.[0];
            const imgPart = candidate?.content?.parts?.find(p => p.inlineData);
            return imgPart ? `data:image/png;base64,${imgPart.inlineData.data}` : null;

        } catch (error) {
            console.error('Image Gen Error:', error);
            throw error;
        }
    });
};

export const upscaleImage = async (image, targetRes) => {
    return withRetry(async () => {
        try {
            // 1. Try local server
            if (typeof window !== 'undefined') {
                const isAlive = await checkBackend();
                if (isAlive) {
                    const response = await fetch('http://localhost:3002/api/forge/upscale', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image, targetRes })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        return data.image;
                    }
                }
            }

            // 2. Standalone Fallback
            const ai = getAI();
            const apiKey = ai.apiKey;
            const data = image.includes('base64,') ? image.split(',')[1] : image;
            const modelName = 'gemini-3-pro-image-preview';
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances: [{
                        prompt: "Enhance this image, maintain exact identity, high fidelity textures, cinematic lighting.",
                        image: { bytesBase64Encoded: data, mimeType: 'image/png' }
                    }],
                    parameters: { sampleCount: 1, aspectRatio: "1:1", outputMimeType: "image/png" }
                })
            });

            const result = await response.json();
            const base64Image = result.predictions?.[0]?.bytesBase64Encoded;
            return base64Image ? `data:image/png;base64,${base64Image}` : null;
        } catch (err) {
            console.error("Upscale failed:", err);
            return null;
        }
    });
};

/**
 * Returns optimized prompts based on visual style.
 * @param {string} style - 'Realistic' | 'Anime' | 'Cyberpunk' etc.
 */
export const getIdentityPrompts = (style = 'Realistic') => {
    if (style === 'Ultra Realistic') {
        const RAW_NEGATIVE_PROMPT = "Avoid: cinematic, dramatic lighting, movie poster, 3d render, anime, illustration, painting, bokeh, blur, depth of field, makeup, airbrushed, photoshop, studio lighting, volumetric fog, glamour shot";

        return {
            anchor: `
          Raw photo of this person, completely front-facing, straight-on angle. 
          Style: Passport photo, Driver's License photo.
          Lighting: Flat, neutral, flash photography. 
          Details: Visible skin pores, imperfections, no makeup, 1:1 Identity match.
          Background: Plain white wall.
          Camera: Shot on iPhone, 50mm lens, sharp focus everywhere.
          ${RAW_NEGATIVE_PROMPT}
        `,
            profile: `
          Raw photo of this person from a side profile view (90 degrees). 
          Style: Mugshot side view, medical reference.
          Lighting: Harsh, realistic, neutral. 
          Details: Exact nose shape, jawline structure, ear shape. 
          Background: Plain neutral background.
          ${RAW_NEGATIVE_PROMPT}
        `,
            expression: `
          Raw candid selfie of this person shouting. 
          Expression: Angry, mouth wide open, teeth visible, aggressive. 
          Lighting: Front flash, hard shadows. 
          Details: Forehead veins, skin texture stretching. 
          Angle: Slightly close-up, mobile phone camera distortion.
          ${RAW_NEGATIVE_PROMPT}
        `,
            halfBody: `
          Medium shot, half-body photo of this person standing straight. 
          Style: Casual snapshot, mirror selfie style.
          Clothing: Neutral grey t-shirt. 
          Lighting: Overhead fluorescent lighting (shopping mall style).
          Details: Torso proportions, shoulder width, collarbones.
          ${RAW_NEGATIVE_PROMPT}
        `,
            fullBody: `
          Wide shot, full body photo of this person standing against a plain wall.
          Style: Casting call photo, polaroid style.
          Clothing: Neutral simple clothing, barefoot.
          Camera: Shot on iPhone, wide angle lens.
          Details: Full height, leg proportions, posture, realistic body type. 
          No artistic angles, camera at eye level.
          ${RAW_NEGATIVE_PROMPT}
        `
        };
    } else {
        // Default / Stylized Prompts
        const styleModifier =
            style === 'Anime' ? "Anime style, 2D animation style, Studio Ghibli style, vibrant colors." :
                style === 'Cartoon' ? "3D Cartoon style, Pixar style, expressive features, soft lighting." :
                    style === 'Cinematic' ? "Cinematic lighting, movie scene, dramatic depth of field, color graded." :
                        style === 'Cyberpunk' ? "Cyberpunk style, neon lighting, high tech, gritty future." :
                            style === 'Ethereal' ? "Ethereal style, dreamlike, soft glow, angelic, fantasy art." :
                                "Photorealistic, high fidelity, neutral lighting.";

        return {
            anchor: `Recreate this person, completely front-facing, straight-on angle like a passport photo. 1:1 Identity match. White background. Factual description. ${styleModifier}`,
            profile: `Same person from a side profile view (90 degrees). Keep all identity markers, freckles, nose shape identical. Neutral background. Rebuild this person from side angle. ${styleModifier}`,
            expression: `Same person, strong angry expression. Mouth open wide in a shout, showing upper and lower teeth. Lips stretched, eyebrows pulled down. Keep identity 1:1. ${styleModifier}`,
            halfBody: `Medium shot, half-body photo of this person. Shoulders, collarbones, and torso proportions visible. Neutral clothing, standing straight. Maintain facial identity. ${styleModifier}`,
            fullBody: `Wide shot, full body photo of this person. Standing straight, barefoot, neutral clothing. Show overall silhouette, limb proportions, posture, and leg anatomy. ${styleModifier}`,
            spatialKit: `A 2x2 grid sprite sheet (Spatial Identity Kit) of this person. Quadrant 1: Extreme close-up. Quadrant 2: Side profile. Quadrant 3: Angry shouting expression. Quadrant 4: Full body shot. High fidelity reference sheet. 1:1 identity consistency. ${styleModifier}`
        };
    }
};

export const generateIdentityKit = async (originImage, style = 'Realistic') => {
    const prompts = getIdentityPrompts(style);

    // Generate both individual shots and the spatial grid
    const [anchor, profile, expression, halfBody, fullBody, spatialKit] = await Promise.all([
        generateCharacterImage({ prompt: prompts.anchor, identity_images: [originImage], aspectRatio: '1:1' }).catch(() => null),
        generateCharacterImage({ prompt: prompts.profile, identity_images: [originImage], aspectRatio: '1:1' }).catch(() => null),
        generateCharacterImage({ prompt: prompts.expression, identity_images: [originImage], aspectRatio: '1:1' }).catch(() => null),
        generateCharacterImage({ prompt: prompts.halfBody, identity_images: [originImage], aspectRatio: '3:4' }).catch(() => null),
        generateCharacterImage({ prompt: prompts.fullBody, identity_images: [originImage], aspectRatio: '9:16' }).catch(() => null),
        generateCharacterImage({ prompt: prompts.spatialKit, identity_images: [originImage], aspectRatio: '1:1', resolution: '2K' }).catch(() => null)
    ]);

    return {
        anchor: anchor || originImage,
        profile: profile || '',
        expression: expression || '',
        halfBody: halfBody || '',
        fullBody: fullBody || '',
        spatialKit: spatialKit || ''
    };
};

export const generateSurgicalRepair = async (originalImage, maskImage, repairPrompt) => {
    return withRetry(async () => {
        try {
            // 1. Try local server first
            if (typeof window !== 'undefined') {
                const isAlive = await checkBackend();
                if (isAlive) {
                    const response = await fetch('http://localhost:3001/api/forge/repair', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image: originalImage, mask: maskImage, prompt: repairPrompt })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        return data.image;
                    }
                }
            }

            // 2. Standalone Fallback
            const ai = getAI();
            const apiKey = ai.apiKey;
            const base64Original = originalImage.includes('base64,') ? originalImage.split(',')[1] : originalImage;
            const base64Mask = maskImage.includes('base64,') ? maskImage.split(',')[1] : maskImage;

            const modelName = 'gemini-3-pro-image-preview';
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances: [{
                        prompt: `In-paint the masked area: ${repairPrompt}. Ensure seamless blending with the surrounding pixels.`,
                        image: { bytesBase64Encoded: base64Original },
                        mask: { image: { bytesBase64Encoded: base64Mask } }
                    }],
                    parameters: {
                        sampleCount: 1,
                        editMode: "INPAINT_INSERTING",
                        maskMode: "MASK_MODE_USER_PROVIDED",
                        outputMimeType: "image/png"
                    }
                })
            });

            if (response.ok) {
                const result = await response.json();
                const base64Image = result.predictions?.[0]?.bytesBase64Encoded;
                return base64Image ? `data:image/png;base64,${base64Image}` : null;
            }
            return null;
        } catch (err) {
            console.error("Surgical repair failed:", err);
            return null;
        }
    });
};

export const synthesizeSpeech = async (text, voice = 'Puck') => {
    try {
        // 1. Try local server
        if (typeof window !== 'undefined') {
            const isAlive = await checkBackend();
            if (isAlive) {
                const response = await fetch('http://localhost:3002/api/ugc/speech', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, voice })
                });
                if (response.ok) {
                    const data = await response.json();
                    // Server returns data URL, we need raw base64
                    return data.audio.split(',')[1];
                }
            }
        }

        // 2. Standalone Fallback
        const ai = getAI();
        const namedVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Zephyr', 'Orion',
            'Leda', 'Orus', 'Perseus', 'Castor', 'Pollux', 'Cetus', 'Aquila', 'Rigel',
            'Spica', 'Algieba', 'Despina', 'Erinome', 'Algenib', 'Rasalghul'];

        const voiceName = namedVoices.includes(voice) ? voice : 'Puck';

        const model = ai.getGenerativeModel({ model: "gemini-2.5-pro-tts" });
        const result = await model.generateContent({
            contents: [{ parts: [{ text }] }],
            generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName },
                    },
                },
            },
        });

        const data = result.response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return data || null;
    } catch (err) {
        console.error("[GEMINI_TTS] Error:", err?.message || err);
        return null;
    }
};


export const generateLipSyncVideo = async (image, prompt, bible = null) => {
    try {
        if (typeof window !== 'undefined') {
            const isAlive = await checkBackend();
            if (isAlive) {
                const response = await fetch('http://localhost:3002/api/ugc/video', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image, script: prompt, bible })
                });

                if (response.ok) {
                    const data = await response.json();
                    return data.url;
                }
            }
        }

        // --- STANDALONE FALLBACK ---
        console.log("[STANDALONE] Calling Veo 3.1 directly.");
        const ai = getAI();
        const [meta, data] = image.split(',');
        const mimeType = meta.split(':')[1]?.split(';')[0] || 'image/png';

        // Note: Using the model direct API because SDK 'generateVideos' might be Node-only in some versions
        const modelName = 'veo-3.1-generate-preview';
        const apiKey = ai.apiKey;

        const initialResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predictLongRunning?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instances: [{
                    prompt: prompt,
                    image: { bytesBase64Encoded: data, mimeType }
                }],
                parameters: { sampleCount: 1, aspectRatio: "9:16" }
            })
        });

        const initialData = await initialResponse.json();
        if (initialData.error) throw new Error(initialData.error.message);

        const operationName = initialData.name;
        let done = false;
        let resultData = null;

        while (!done) {
            await new Promise(r => setTimeout(r, 5000));
            const pollResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`);
            const pollData = await pollResponse.json();
            if (pollData.error) throw new Error(pollData.error.message);
            if (pollData.done) {
                resultData = pollData.response;
                done = true;
            }
        }

        // Use a generic finder or direct path since we know the structure usually includes generatedVideos
        const videoUri = resultData?.generatedVideos?.[0]?.video?.uri || resultData?.predictions?.[0]?.uri;
        if (!videoUri) return null;

        const videoResp = await fetch(`${videoUri}&key=${apiKey}`);

        if (typeof window === 'undefined') {
            const buffer = await videoResp.arrayBuffer();
            return `data:video/mp4;base64,${Buffer.from(buffer).toString('base64')}`;
        } else {
            const blob = await videoResp.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        }

    } catch (err) {
        console.error("Video generation failed:", err);
        return null;
    }
};

const getBase64FromUrl = async (url) => {
    const fullUrl = url.startsWith('//') ? `https:${url}` : url;
    const response = await fetch(fullUrl);

    if (typeof window === 'undefined') {
        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/png';
        return `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`;
    } else {
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
};

export const analyzeIdentity = async (imageInput) => {
    return withRetry(async () => {
        try {
            // 1. Try local server first (Frontend only)
            if (typeof window !== 'undefined') {
                const isAlive = await checkBackend();
                if (isAlive) {
                    const response = await fetch('http://localhost:3002/api/forge/analyze', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image: imageInput })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        return data.analysis;
                    }
                }
            }

            // 2. Standalone Fallback
            const ai = getAI();
            const model = ai.getGenerativeModel({ model: 'gemini-3-flash-preview' });
            let base64 = imageInput;
            if (!base64.startsWith('data:')) {
                base64 = await getBase64FromUrl(base64);
            }

            const [meta, data] = base64.split(',');
            const mimeType = meta.split(':')[1]?.split(';')[0] || 'image/png';

            const result = await model.generateContent({
                contents: [{
                    parts: [
                        { inlineData: { data, mimeType } },
                        { text: "Identity extraction: Describe this person's key visual markers (facial features, hair, vibe) for consistent AI generation. Be surgical and technical. 100 words." }
                    ]
                }]
            });
            return result.response.text() || "Identity extraction failed.";
        } catch (err) {
            console.error("Identity analysis failed:", err);
            return "Analysis unavailable.";
        }
    });
};

export const generateDynamicAngles = async (imageInput, name) => {
    return withRetry(async () => {
        try {
            // 1. Try local server
            if (typeof window !== 'undefined') {
                const isAlive = await checkBackend();
                if (isAlive) {
                    const response = await fetch('http://localhost:3002/api/forge/generate-angles', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image: imageInput, name })
                    });
                    if (response.ok) return await response.json();
                }
            }

            // 2. Standalone Fallback
            const ai = getAI();
            const model = ai.getGenerativeModel({ model: 'gemini-3-flash-preview' });
            let base64 = imageInput;
            if (!base64.startsWith('data:')) {
                base64 = await getBase64FromUrl(base64);
            }
            const [meta, data] = base64.split(',');
            const mimeType = meta.split(':')[1]?.split(';')[0] || 'image/png';

            const prompt = `
                You are a Cinematography Director. Analyze this image of "${name}". 
                Identify the 6 most interesting visual aspects (e.g., a specific piece of jewelry, a scar, texture of fabric, a silhouette, a prop, facial feature). 
                Generate 6 distinct, creative camera angle prompts to highlight these specific details.
                Return a JSON array of 6 objects with "label" and "prompt".
            `;

            const result = await model.generateContent({
                contents: [{
                    parts: [
                        { inlineData: { data, mimeType } },
                        { text: prompt }
                    ]
                }],
                generationConfig: { responseMimeType: "application/json" }
            });

            return JSON.parse(result.response.text() || '[]');
        } catch (err) {
            console.error("Dynamic angle generation failed:", err);
            return [
                { label: "CLOSE_UP", prompt: "A generic close up shot." },
                { label: "WIDE_SHOT", prompt: "A generic wide shot." },
                { label: "SIDE_PROFILE", prompt: "A side profile shot." },
                { label: "LOW_ANGLE", prompt: "A low angle heroic shot." },
                { label: "OVERHEAD", prompt: "A high angle overhead shot." },
                { label: "DETAIL", prompt: "A macro detail shot." }
            ];
        }
    });
};

export const generateBackstory = async (analysis, name) => {
    try {
        // 1. Try local server
        if (typeof window !== 'undefined') {
            const isAlive = await checkBackend();
            if (isAlive) {
                const response = await fetch('http://localhost:3002/api/forge/generate-backstory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ analysis, name })
                });
                if (response.ok) {
                    const data = await response.json();
                    return data.backstory;
                }
            }
        }

        // 2. Standalone Fallback
        const ai = getAI();
        const model = ai.getGenerativeModel({ model: 'gemini-3-flash-preview' });
        const result = await model.generateContent(`Generate a 100-word backstory for ${name} based on this identity analysis: ${analysis}. Be gritty, atmospheric, and professional.`);
        return result.response.text() || "Backstory generation failed.";
    } catch (err) {
        console.error("Backstory generation failed:", err);
        return "Backstory unavailable.";
    }
};

export const generateDetailMatrix = async (name, references) => {
    return withRetry(async () => {
        try {
            // 1. Try local server
            if (typeof window !== 'undefined') {
                const isAlive = await checkBackend();
                if (isAlive) {
                    const response = await fetch('http://localhost:3002/api/forge/generate-matrix', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, references })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        return data.image;
                    }
                }
            }

            // 2. Standalone Fallback
            const ai = getAI();
            const apiKey = ai.apiKey;
            const instances = [{ prompt: `A 3x3 forensic detail matrix for character ${name}. Showcase diverse extreme closeups, textures, and details.` }];

            if (references && references.length > 0) {
                const ref = references[0];
                if (ref && ref.includes('base64,')) {
                    const mime = ref.split(';')[0].split(':')[1] || 'image/png';
                    instances[0].image = { bytesBase64Encoded: ref.split(',')[1], mimeType: mime };
                }
            }

            const modelName = 'gemini-3-pro-image-preview';
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances,
                    parameters: { sampleCount: 1, aspectRatio: "1:1", outputMimeType: "image/png" }
                })
            });

            const result = await response.json();
            const base64Image = result.predictions?.[0]?.bytesBase64Encoded;
            return base64Image ? `data:image/png;base64,${base64Image}` : null;
        } catch (err) {
            console.error("Detail matrix generation failed:", err);
            return null;
        }
    });
};
export const generateStoryboardDescriptions = async (narrative, count = 4) => {
    try {
        // 1. Try local server
        if (typeof window !== 'undefined') {
            const isAlive = await checkBackend();
            if (isAlive) {
                const response = await fetch('http://localhost:3002/api/ugc/auto-storyboard', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ narrative, count })
                });
                if (response.ok) return await response.json();
            }
        }

        // 2. Standalone Fallback
        const ai = getAI();
        const model = ai.getGenerativeModel({ model: 'gemini-3-flash-preview' });
        const prompt = `Decompose this narrative arc into ${count} distinct cinematic scene descriptions for a storyboard. 
      NARRATIVE: ${narrative}. 
      Return a JSON array of strings, where each string is a detailed visual prompt focusing on lighting, composition, and character action.
      Example output format: ["Prompt 1", "Prompt 2", ... "Prompt N"]`;

        const result = await model.generateContent({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                }
            }
        });
        return JSON.parse(result.response.text() || '[]');
    } catch (err) {
        console.error("Storyboard description generation failed:", err);
        return [];
    }
};
export const generateAmbientMusic = async (description) => {
    try {
        if (typeof window !== 'undefined') {
            const isAlive = await checkBackend();
            if (isAlive) {
                const response = await fetch('http://localhost:3002/api/music/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: description, style: 'Cinematic', duration: 30 })
                });
                if (response.ok) return await response.json();
            }
        }
        console.log(`[Acoustic_Engine] (Standalone Fallback) Synthesizing: ${description}`);
        return { url: "https://example.com/ambient_track.mp3" };
    } catch (err) {
        console.error("Music generation failed:", err);
        return { url: "https://example.com/ambient_track.mp3" };
    }
};

export const generateAmbientSFX = async (description) => {
    try {
        // SFX endpoint not yet distinct from music in server.js but following pattern
        console.log(`[Acoustic_Engine] Generating SFX: ${description}`);
        await new Promise(r => setTimeout(r, 2000));
        return { url: "https://example.com/sfx_track.wav" };
    } catch (err) {
        return { url: "https://example.com/sfx_track.wav" };
    }
};

/**
 * RESEARCH AGENT: Connects to real-time Google Search to ground the production.
 * Uses gemini-2.0-flash with search tools.
 */
export const researchProductionContext = async (query) => {
    return withRetry(async () => {
        try {
            if (typeof window !== 'undefined') {
                const isAlive = await checkBackend();
                if (isAlive) {
                    const response = await fetch('http://localhost:3002/api/director/research', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query })
                    });
                    if (response.ok) return await response.json();
                }
            }

            const ai = getAI();
            const model = ai.getGenerativeModel({ model: "gemini-3-flash-preview" });
            const prompt = `You are a Production Researcher. Conduct deep research on: "${query}".`;
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                tools: [{ googleSearch: {} }]
            });
            return {
                research: result.response.text(),
                grounding: result.response.candidates?.[0]?.groundingMetadata || null
            };
        } catch (err) {
            console.error("Research Agent failed:", err);
            return { research: `Search link down. Using internal knowledge for: ${query}`, grounding: null };
        }
    });
};

export const generateThinkerSequence = async (narrative, bible = null) => {
    return withRetry(async () => {
        try {
            if (typeof window !== 'undefined') {
                const isAlive = await checkBackend();
                if (isAlive) {
                    const response = await fetch('http://localhost:3002/api/director/thinking-sequence', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ narrative, bible })
                    });
                    if (response.ok) return await response.json();
                }
            }

            const ai = getAI();
            const bibleContext = formatBibleContext(bible);
            const model = ai.getGenerativeModel({ model: "gemini-3-flash-thinking-preview" });
            const prompt = `${bibleContext} Narrative Arc: "${narrative}". Return JSON sequence of nodes. Reasoning included.`;
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const cleanJson = text.includes('```json') ? text.split('```json')[1].split('```')[0] : text;
            return JSON.parse(cleanJson);
        } catch (err) {
            console.error("Thinking Mode failed:", err);
            return generateDirectorSequence(narrative, bible);
        }
    });
};

export const generateDirectorSequence = async (narrative, bible = null) => {
    try {
        if (typeof window !== 'undefined') {
            const isAlive = await checkBackend();
            if (isAlive) {
                const response = await fetch('http://localhost:3002/api/director/thinking-sequence', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ narrative, bible, mode: 'DIRECTOR' })
                });
                if (response.ok) return await response.json();
            }
        }

        const ai = getAI();
        const bibleContext = formatBibleContext(bible);
        const model = ai.getGenerativeModel({ model: 'gemini-3-flash-preview' });
        const prompt = `${bibleContext} Narrative: "${narrative}". Decompose into cinematic nodes JSON.`;
        const result = await model.generateContent({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });
        return JSON.parse(result.response.text() || '{"nodes":[]}');
    } catch (err) {
        console.error("Auto-Director sequence generation failed:", err);
        return { nodes: [] };
    }
};

export const analyzeSceneMultimodal = async (imageInput, bible = null) => {
    try {
        if (typeof window !== 'undefined') {
            const isAlive = await checkBackend();
            if (isAlive) {
                const response = await fetch('http://localhost:3002/api/forge/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: imageInput, bible, mode: 'SCENE_CRITIQUE' })
                });
                if (response.ok) return await response.json();
            }
        }

        const ai = getAI();
        const model = ai.getGenerativeModel({ model: 'gemini-3-flash-preview' });
        let base64 = imageInput;
        if (!base64.startsWith('data:')) base64 = await getBase64FromUrl(base64);
        const [meta, data] = base64.split(',');
        const mimeType = meta.split(':')[1]?.split(';')[0] || 'image/png';

        const result = await model.generateContent({
            contents: [{
                parts: [
                    { text: "Critique this cinematic scene. Format as JSON." },
                    { inlineData: { data, mimeType } }
                ]
            }],
            generationConfig: { responseMimeType: "application/json" }
        });
        return JSON.parse(result.response.text() || '{}');
    } catch (err) {
        console.error("Multimodal analysis failed:", err);
        return { critique: "Analysis failed.", score: 0, recommendations: [] };
    }
};

export const expandPrompt = async (payload) => {
    try {
        if (typeof window !== 'undefined') {
            const isAlive = await checkBackend();
            if (isAlive) {
                const response = await fetch('http://localhost:3002/api/forge/expand-prompt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (response.ok) {
                    const data = await response.json();
                    return data.expanded;
                }
            }
        }

        const ai = getAI();
        const model = ai.getGenerativeModel({ model: 'gemini-3-flash-preview' });
        const result = await model.generateContent([
            { text: SYSTEM_PROMPT_EXPANDER },
            { text: JSON.stringify(payload) }
        ]);
        return result.response.text() || payload.userAction;
    } catch (err) {
        console.error("Prompt expansion failed:", err);
        return payload.userAction;
    }
};

export const enhancePrompt = async (prompt) => {
    try {
        if (typeof window !== 'undefined') {
            const isAlive = await checkBackend();
            if (isAlive) {
                const response = await fetch('http://localhost:3002/api/forge/enhance-prompt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt })
                });
                if (response.ok) {
                    const data = await response.json();
                    return data.enhanced;
                }
            }
        }

        const ai = getAI();
        const model = ai.getGenerativeModel({ model: 'gemini-3-flash-preview' });
        const result = await model.generateContent(`As a Director, enhance this prompt: ${prompt}`);
        return result.response.text() || prompt;
    } catch (err) {
        console.error("Prompt enhancement failed:", err);
        return prompt;
    }
};

/**
 * PHASE 9: UGC AD ENGINE
 * Analyze dual-image context for Influencer + Product synergy.
 */
export async function analyzeUGCContext(characterImage, productImage, metadata = {}) {
    try {
        console.log(`[GEMINI] Analyzing UGC Context for synergy with metadata...`);
        const ai = getAI();
        const model = ai.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            generationConfig: { responseMimeType: "application/json" }
        });

        const processImage = async (img) => {
            if (img.startsWith('data:')) return { inlineData: { mimeType: img.split(';')[0].split(':')[1], data: img.split(',')[1] } };
            if (img.startsWith('http')) {
                const resp = await fetch(img);
                const buffer = await resp.arrayBuffer();
                return { inlineData: { mimeType: resp.headers.get('content-type') || 'image/png', data: Buffer.from(buffer).toString('base64') } };
            }
            return null;
        };

        const charPart = await processImage(characterImage);
        const prodPart = await processImage(productImage);

        const prompt = `Analyze these two images and the provided metadata:
        1. UGC Creator: ${JSON.stringify(metadata.characterMetadata || "Unknown Creator")}
        2. Product: ${JSON.stringify(metadata.productMetadata || "Unknown Product")}
        
        Identify the 'Synergy Point'. How can this creator authentically market this product?
        Look for:
        - Common aesthetic (e.g., both are minimalist, both are high-energy).
        - Use case (e.g., creator is in a gym, product is a protein shake).
        - Visual matching (e.g., color palette compatibility).
        - Leverage the metadata: Use the character's 'analysis' (backstory/vibe) and product's 'description' for deeper context.

        Return JSON:
        {
          "synergy": "One sentence summary of why they match",
          "characterTraits": ["trait1", "trait2"],
          "productSellingPoints": ["point1", "point2"],
          "recommendedNiche": "e.g. fitness, tech, fashion",
          "suggestedTone": "e.g. energetic, educational, minimalist"
        }
        Return ONLY valid JSON.`;

        const result = await model.generateContent([prompt, charPart, prodPart]);
        const response = await result.response;
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('analyzeUGCContext Error:', error);
        return { synergy: "Standard lifestyle marketing", recommendedNiche: "lifestyle", suggestedTone: "casual" };
    }
}

/**
 * Generate a full UGC Ad Script based on synergy analysis.
 */
export async function generateUGCScript(analysis, niche, tone, directive = "") {
    try {
        console.log(`[GEMINI] Generating UGC Script for ${niche} with directive: ${directive}`);
        const ai = getAI();
        const model = ai.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `You are a viral UGC Scriptwriter. Generate a 30-second ad script based on this analysis:
        ANALYSIS: ${JSON.stringify(analysis)}
        NICHE: ${niche}
        TONE: ${tone}
        ${directive ? `USER_SPECIFIC_DIRECTIVE: ${directive}` : ""}

        Rules:
        1. Start with a Pattern Interrupt hook (0-3s).
        2. Middle section must show the creator interacting with the product points.
        3. End with a strong CTA.
        4. Focus on the USP: ${analysis.productSellingPoints?.join(', ')}.
        5. CAMERA LOGIC (CRITICAL): Append high-end photography modifiers to the end of EVERY scene's 'prompt'.
           - If niche is 'lifestyle/casual': Append "Shot on iPhone 15 Pro Max, Apple ProRAW, macro lens, natural lighting, 4k."
           - If niche is 'luxury/high-end': Append "Cinematic lighting, ARRI Alexa, 85mm lens, movie quality, photorealistic, 8k."
        ${directive ? `6. STICK TO THIS STYLE/HOOK: ${directive}` : "6. No generic fillers."}

        Return JSON:
        {
          "hook": "The first 3 seconds anchor script",
          "fullScript": "The complete 30s voiceover script",
          "scenes": [
            { "time": "0s-5s", "action": "Shot description", "prompt": "Visual prompt + camera logic" },
            { "time": "5s-15s", "action": "Demonstration", "prompt": "Visual prompt + camera logic" },
            { "time": "15s-25s", "action": "Closer interaction", "prompt": "Visual prompt + camera logic" },
            { "time": "25s-30s", "action": "Closer to camera CTA", "prompt": "Visual prompt + camera logic" }
          ]
        }
        Return ONLY valid JSON.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('generateUGCScript Error:', error);
        throw error;
    }
}
