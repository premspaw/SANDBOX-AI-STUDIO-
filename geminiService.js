import { GoogleGenAI } from "@google/genai";

const getAI = () => {
    const apiKey = (typeof process !== 'undefined' ? process.env.GOOGLE_API_KEY : null) ||
        (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GOOGLE_API_KEY : null) ||
        '';
    return new GoogleGenAI({ apiKey });
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
 * Generates a character image based on prompt and references.
 * @param {string} prompt 
 * @param {string[]} references - Array of base64 image strings
 * @param {'1:1'|'3:4'|'4:3'|'9:16'|'16:9'} aspectRatio 
 * @param {'1K'|'2K'|'4K'} resolution 
 */
export const generateCharacterImage = async (
    prompt,
    references = [],
    aspectRatio = '1:1',
    resolution = '1K',
    bible = null
) => {
    return withRetry(async () => {
        try {
            const apiKey = (typeof process !== 'undefined' ? process.env.VITE_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY : null) ||
                (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GOOGLE_API_KEY : null) ||
                '';

            if (!apiKey) throw new Error("No API Key found for generation");

            const bibleContext = formatBibleContext(bible);
            const finalPrompt = bibleContext + prompt;

            // Prepare instances for Imagen 4.0 :predict
            const instances = [{ prompt: finalPrompt }];

            // If we have references, pass them to Imagen 4.0 for consistency (Image-to-Image / Reference)
            if (references && references.length > 0) {
                const ref = references[0]; // Imagen usually takes 1 primary reference in many SDK setups
                if (ref && ref.includes('base64,')) {
                    const data = ref.split(',')[1];
                    instances[0].image = { bytesBase64Encoded: data };
                }
            }

            const modelName = 'imagen-4.0-generate-001';
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances,
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: aspectRatio,
                        outputMimeType: "image/png"
                    }
                })
            });

            const result = await response.json();
            if (result.error) throw new Error(result.error.message);

            const base64Image = result.predictions?.[0]?.bytesBase64Encoded;
            return base64Image ? `data:image/png;base64,${base64Image}` : null;
        } catch (err) {
            console.error("Character generation failed:", err);
            return null;
        }
    });
};

export const upscaleImage = async (image, targetRes) => {
    return withRetry(async () => {
        try {
            const apiKey = (typeof process !== 'undefined' ? process.env.VITE_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY : null) ||
                (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GOOGLE_API_KEY : null) ||
                '';

            const data = image.includes('base64,') ? image.split(',')[1] : image;

            const modelName = 'imagen-4.0-generate-001'; // Using Imagen 4.0 across the stack
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances: [{
                        prompt: "Enhance this image, maintain exact identity, high fidelity textures, cinematic lighting.",
                        image: { bytesBase64Encoded: data }
                    }],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: "1:1",
                        outputMimeType: "image/png"
                    }
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
        generateCharacterImage(prompts.anchor, [originImage], '1:1').catch(() => null),
        generateCharacterImage(prompts.profile, [originImage], '1:1').catch(() => null),
        generateCharacterImage(prompts.expression, [originImage], '1:1').catch(() => null),
        generateCharacterImage(prompts.halfBody, [originImage], '3:4').catch(() => null),
        generateCharacterImage(prompts.fullBody, [originImage], '9:16').catch(() => null),
        generateCharacterImage(prompts.spatialKit, [originImage], '1:1', '2K').catch(() => null)
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
            const apiKey = (typeof process !== 'undefined' ? process.env.VITE_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY : null) ||
                (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GOOGLE_API_KEY : null) ||
                '';

            const base64Original = originalImage.includes('base64,') ? originalImage.split(',')[1] : originalImage;
            const base64Mask = maskImage.includes('base64,') ? maskImage.split(',')[1] : maskImage;

            const modelName = 'imagen-4.0-generate-001';
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances: [{
                        prompt: `Repair this image inside the masked area: ${repairPrompt}. Maintain absolute identity and background consistency.`,
                        image: { bytesBase64Encoded: base64Original }
                        // Note: Some Imagen endpoints use a separate mask parameter, 
                        // but for standard repair/edit we often combine instructions or use specific models.
                        // Defaulting to prompt-based edit for now as it's most compatible.
                    }],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: "1:1",
                        outputMimeType: "image/png"
                    }
                })
            });

            const result = await response.json();
            const base64Image = result.predictions?.[0]?.bytesBase64Encoded;
            return base64Image ? `data:image/png;base64,${base64Image}` : null;
        } catch (err) {
            console.error("Surgical repair failed:", err);
            return null;
        }
    });
};

export const synthesizeSpeech = async (text, voice = 'Zephyr') => {
    try {
        const ai = getAI();
        // Note: 'gemini-2.5-flash-preview-tts' is hypothetical or specific to a preview. 
        // Ensuring use of a valid model text if needed, but keeping original logic.
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice },
                    },
                },
            },
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (err) {
        console.error("Speech synthesis failed:", err);
        return null;
    }
};

export const generateLipSyncVideo = async (image, prompt, bible = null) => {
    try {
        const ai = getAI();
        const bibleContext = formatBibleContext(bible);
        const finalPrompt = `${bibleContext} A hyper-realistic close-up cinematic portrait video of the person in the image. They are speaking the following script clearly: "${prompt}". Focus on perfectly natural lip movements, expressive micro-expressions, and realistic blinking. Keep background stable. Cinematic 8k photography quality.`;

        const [meta, data] = image.split(',');
        const mimeType = meta.split(':')[1]?.split(';')[0] || 'image/png';

        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: finalPrompt,
            image: {
                imageBytes: data,
                mimeType: mimeType,
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '9:16'
            }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) return null;

        // We assume the link needs the API key appended or header auth, but standard fetch follows.
        // The original TS had &key=process.env.API_KEY, we keep that.
        const videoResp = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await videoResp.blob();
        // In Node.js environment, we return base64 or buffer, not URL.createObjectURL (browser only).
        // Converting blob/buffer to base64 data URI for frontend.
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        return `data:video/mp4;base64,${base64}`;

    } catch (err) {
        console.error("Video generation failed:", err);
        return null;
    }
};

export const analyzeIdentity = async (base64) => {
    return withRetry(async () => {
        try {
            const ai = getAI();
            const [meta, data] = base64.split(',');
            const mimeType = meta.split(':')[1]?.split(';')[0] || 'image/png';

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        { inlineData: { data, mimeType } },
                        { text: "Identity extraction: Describe this person's key visual markers (facial features, hair, vibe) for consistent AI generation. Be surgical and technical. 100 words." }
                    ]
                }
            });
            return response.text || "Identity extraction failed.";
        } catch (err) {
            console.error("Identity analysis failed:", err);
            return "Analysis unavailable.";
        }
    });
};

export const generateDynamicAngles = async (base64, name) => {
    return withRetry(async () => {
        try {
            const ai = getAI();
            const [meta, data] = base64.split(',');
            const mimeType = meta.split(':')[1]?.split(';')[0] || 'image/png';

            const prompt = `
        You are a Cinematography Director. Analyze this image of "${name}". 
        Identify the 6 most interesting visual aspects (e.g., a specific piece of jewelry, a scar, texture of fabric, a silhouette, a prop, facial feature). 
        
        Generate 6 distinct, creative camera angle prompts to highlight these specific details.
        
        Return a JSON array of 6 objects with this schema:
        {
          "label": "Short Uppercase Label (e.g. RING_MACRO)",
          "prompt": "Detailed camera prompt describing the angle, focus, and composition."
        }
      `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        { inlineData: { data, mimeType } },
                        { text: prompt }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                label: { type: "STRING" },
                                prompt: { type: "STRING" }
                            }
                        }
                    }
                }
            });

            const json = JSON.parse(response.text || '[]');
            return json;
        } catch (err) {
            console.error("Dynamic angle generation failed, falling back to defaults.", err);
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
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a 100-word backstory for ${name} based on this identity analysis: ${analysis}. Be gritty, atmospheric, and professional.`,
        });
        return response.text || "Backstory generation failed.";
    } catch (err) {
        console.error("Backstory generation failed:", err);
        return "Backstory unavailable.";
    }
};

export const generateDetailMatrix = async (name, references) => {
    return withRetry(async () => {
        try {
            const apiKey = (typeof process !== 'undefined' ? process.env.VITE_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY : null) ||
                (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GOOGLE_API_KEY : null) ||
                '';

            const instances = [{ prompt: `A 3x3 forensic detail matrix for character ${name}. Showcase diverse extreme closeups, textures, and details.` }];

            if (references && references.length > 0) {
                const ref = references[0];
                if (ref && ref.includes('base64,')) {
                    instances[0].image = { bytesBase64Encoded: ref.split(',')[1] };
                }
            }

            const modelName = 'imagen-4.0-generate-001';
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
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Decompose this narrative arc into ${count} distinct cinematic scene descriptions for a storyboard. 
      NARRATIVE: ${narrative}. 
      Return a JSON array of strings, where each string is a detailed visual prompt focusing on lighting, composition, and character action.
      Example output format: ["Prompt 1", "Prompt 2", ... "Prompt N"]`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                }
            }
        });
        return JSON.parse(response.text || '[]');
    } catch (err) {
        console.error("Storyboard description generation failed:", err);
        return [];
    }
};
export const generateAmbientMusic = async (description) => {
    console.log(`[Acoustic_Engine] Synthesizing ambient track: ${description}`);
    await new Promise(r => setTimeout(r, 3000));
    return "https://example.com/ambient_track.mp3";
};


export const generateAmbientSFX = async (description) => {
    console.log(`[Acoustic_Engine] Generating SFX: ${description}`);
    await new Promise(r => setTimeout(r, 2000));
    return "https://example.com/sfx_track.wav";
};

export const generateDirectorSequence = async (narrative, bible = null) => {
    try {
        const ai = getAI();
        const bibleContext = formatBibleContext(bible);
        const prompt = `${bibleContext} Narrative: "${narrative}". 
        You are a Cinematic Director. Decompose this narrative into a cinematic sequence of production nodes for a React Flow canvas. 
        
        Available Node Types:
        1. "influencer": Represents the character. Needs "label" (name) and "description".
        2. "dialogue": Represents speech. Needs "script" (text) and "label" (VOICE_TYPE).
        3. "camera": Represents movement. Needs "movement" (PAN_LEFT, ZOOM_IN, DOLLY, etc) and "label".
        4. "lighting": Represents atmosphere. Needs "atmosphere" (NEON, NOIR, VOLUMETRIC) and "label".
        5. "video": Represents final render outlet.
        
        Return a JSON object with:
        {
          "nodes": [
            { "id": "char_1", "type": "influencer", "label": "Character Name", "description": "Visual character description" },
            { "id": "cam_1", "type": "camera", "label": "CAMERA_ORCHESTRATOR", "movement": "ZOOM_IN", "connectTo": "char_1" },
            { "id": "diag_1", "type": "dialogue", "label": "VOICE_TRACK", "script": "What they say...", "connectTo": "cam_1" }
          ]
        }
        Create a logic chain where components are connected sequentially. Limit to 6 nodes total. Ensure labels are punchy and in ALL_CAPS.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json"
            }
        });

        return JSON.parse(response.text || '{"nodes":[]}');
    } catch (err) {
        console.error("Auto-Director sequence generation failed:", err);
        return { nodes: [] };
    }
};

export const analyzeSceneMultimodal = async (image, bible = null) => {
    try {
        const ai = getAI();
        const model = 'gemini-2.5-flash';

        const [meta, data] = image.split(',');
        const mimeType = meta.split(':')[1]?.split(';')[0] || 'image/png';

        const prompt = `${bibleContext} Analyze this scene frame as a cinematic director. 
        Evaluate the following markers:
        1. Visual Consistency: Does it move the narrative forward?
        2. Lighting & Composition: Is it professional and cinematic?
        3. Performance/Pose: Is it evocative?
        
        Provide a concise critique and a Director's Score (0-100). 
        Format as JSON: { "critique": "...", "score": 85, "recommendations": ["...", "..."] }`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: prompt },
                    { inlineData: { data, mimeType } }
                ]
            },
            config: {
                responseMimeType: "application/json"
            }
        });

        return JSON.parse(response.text || '{}');
    } catch (err) {
        console.error("Multimodal analysis failed:", err);
        return { critique: "Neural vision link unstable. Manual review required.", score: 0, recommendations: [] };
    }
};
