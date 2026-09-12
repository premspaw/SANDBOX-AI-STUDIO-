import express from 'express';
import * as cacheService from '../../services/cacheService.js';

export default function createRouter(deps) {
    const router = express.Router();
    const APP_ORIGIN = (process.env.APP_ORIGIN || process.env.PUBLIC_APP_URL || 'https://zerolens.in').replace(/\/+$/, '');
    const {
        geminiService,
        vectorService,
        handleGoogle,
        supabase,
        requireAuth,
        resolveGoogleApiKey,
        openaiChat
    } = deps;

    // Forge Health
    router.get('/health', (req, res) => res.json({ status: 'Forge API is Live' }));

    // Analyze Identity
    router.post('/analyze', async (req, res) => {
        try {
            const { image } = req.body;
            if (!image) throw new Error('No image provided');
            const analysis = await geminiService.analyzeIdentity(image);
            res.json({ analysis });
        } catch (error) {
            console.error('Forge Analysis Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Cache Neural Universe Bible Context
    router.post('/cache-bible', async (req, res) => {
        try {
            const { bibleContext } = req.body;
            if (!bibleContext) throw new Error('No bibleContext provided');

            const cacheName = await cacheService.cacheBibleContext(bibleContext);

            // cacheName will be null if context was too small (<32k tokens) or failed
            res.json({ success: true, cacheName });
        } catch (error) {
            console.error('Forge Context Caching Error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Refine Prompt Narrative & Storyboard Breakdown (Powered by Astra ChatGPT 6)
    // Helper: Execute Gemini Content Generation with Model Cascade Fallback
    const callGeminiWithCascade = async (preferredModel, promptText, apiKey, isJson = false) => {
        if (!apiKey || typeof apiKey !== 'string') return null;
        
        // Models cascade list
        const candidateModels = [];
        if (preferredModel && preferredModel.startsWith('gemini')) {
            candidateModels.push(preferredModel);
        }
        if (!candidateModels.includes('gemini-2.5-pro')) candidateModels.push('gemini-2.5-pro');
        if (!candidateModels.includes('gemini-2.5-flash')) candidateModels.push('gemini-2.5-flash');
        if (!candidateModels.includes('gemini-2.0-flash')) candidateModels.push('gemini-2.0-flash');
        if (!candidateModels.includes('gemini-2.0-flash-exp')) candidateModels.push('gemini-2.0-flash-exp');
        if (!candidateModels.includes('gemini-1.5-pro')) candidateModels.push('gemini-1.5-pro');
        if (!candidateModels.includes('gemini-1.5-flash')) candidateModels.push('gemini-1.5-flash');

        for (const model of candidateModels) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Referer': `${APP_ORIGIN}/`,
                        'Origin': APP_ORIGIN
                    },
                    body: JSON.stringify({ 
                        contents: [{ 
                            parts: [{ text: isJson ? `${promptText}\n\nReturn strict valid JSON only without markdown fences.` : promptText }] 
                        }]
                    })
                });

                if (resp.ok) {
                    const data = await resp.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text && text.trim()) {
                        return { text: text.trim(), model };
                    }
                }
            } catch (e) {
                console.warn(`[GeminiCascade] Failed on model ${model}:`, e.message);
            }
        }
        return null;
    };

    // Refine Prompt Narrative & Storyboard Breakdown (Powered by Selected AI Model & Astra)
    router.post('/refine-narrative', async (req, res) => {
        try {
            const { text, type = "general", scenario = "", format = "video", aiModel = "gemini-2.5-flash" } = req.body;
            if (!text) return res.status(400).json({ error: "Text is required" });

            let refinedText = text;
            const isStoryboard = type === 'director_storyboard';

            const antiMorphingRules = `
CRITICAL CINEMATIC QUALITY & ANTI-MORPHING RULES:
1. ZERO MORPHING: Human faces, bodies, limbs, clothing, architecture, and props must NEVER melt, morph, deform, stretch, or blend between objects or poses.
2. CLEAN CINEMATIC CUTS: If perspective, angle, or focus changes, use sharp cinematic cut markers (e.g. "[Cut to: Tight Close-Up]", "[Cut to: Wide Tracking]") — strictly prohibit soft warping or morphing transitions.
3. ZERO AI SLOP: Ban plastic/waxy skin, rubbery motion, extra fingers/limbs, distorted anatomy, jittery backgrounds, blurry soup, cheap CGI halo/glow, and floating text.
4. PHYSICAL REALISM: Enforce authentic 24fps shutter speed, natural motion blur, realistic eye contact, subtle human micro-movements, and consistent directional lighting.`;

            // If user selected a Gemini model or if Gemini is requested
            if (aiModel.startsWith('gemini') || !process.env.EXPLABS_API_KEY) {
                let user;
                try { user = await requireAuth(req); } catch (_) {}
                const targetUserId = user ? user.id : req.body.userId;
                const rawApiKey = await resolveGoogleApiKey(req, targetUserId);
                const apiKey = (rawApiKey && rawApiKey !== 'VERTEX_AI_CLIENT') ? rawApiKey : (process.env.ADMIN_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY || process.env.GEMINI_API_KEY);

                if (apiKey) {
                    console.log(`[BACKEND] Refining narrative/prompts with Gemini (${aiModel})...`);
                    const geminiSystem = isStoryboard
                        ? `You are the Lead Storyboard Director of ZeroLens AI Studio. Analyze the given script, dialogues, and settings. Output ONLY a valid JSON array of sequential 10-second shot objects strictly representing the script. ${antiMorphingRules}\nDo NOT wrap in markdown code blocks.`
                        : `You are an elite cinematic prompt engineer for AI video and image models. Enhance the given text into production-ready prompts. ${antiMorphingRules}`;

                    const promptPayload = `${geminiSystem}\n\n${scenario ? `SCENARIO CONTEXT:\n${scenario}\n\n` : ''}${text}`;
                    const geminiResult = await callGeminiWithCascade(aiModel, promptPayload, apiKey, isStoryboard);
                    
                    if (geminiResult && geminiResult.text) {
                        if (isStoryboard) {
                            const jsonMatch = geminiResult.text.match(/\[\s*\{[\s\S]*\}\s*\]/);
                            refinedText = jsonMatch ? jsonMatch[0] : geminiResult.text.replace(/```json/g, '').replace(/```/g, '').trim();
                        } else {
                            refinedText = geminiResult.text;
                        }
                        return res.json({ 
                            refined: isStoryboard ? refinedText : refinedText.replace(/^"|"$/g, ''),
                            narrative: refinedText,
                            model: geminiResult.model
                        });
                    }
                }
            }

            // Astra (gpt-6-astra) / OpenAI Engine
            if (process.env.EXPLABS_API_KEY && openaiChat) {
                console.log(`[BACKEND] Refining narrative/prompts for ${type} using Astra (${aiModel})...`);
                try {
                    const systemPrompt = isStoryboard
                        ? `You are Astra (ChatGPT 6), the Lead Director & Storyboard Architect of ZeroLens AI Studio. You deeply analyze scripts, screenplays, spoken dialogue lines, character arcs, and multi-shot continuity. When provided a project setup, script, and dialogues, deconstruct it strictly into sequential 10-second cinematic shots matching the exact script and dialogue flow. ${antiMorphingRules}\nReturn ONLY a valid JSON array of shot objects without markdown fences, preamble, or commentary.`
                        : `You are Astra (ChatGPT 6), the elite prompt engineer and cinematic director of ZeroLens AI Studio.
Your mission is to understand the complete scenario, narrative, story, and script, and write high-fidelity, visually rich prompts for AI ${format === 'image' ? 'image' : 'video'} models (like Veo, Seedance, Imagen 3, Omni Flash).
Guidelines:
- Comprehend the full narrative arc and emotional atmosphere.
- Enhance textures, lighting, volumetric atmosphere, camera physics, and environmental details.
- Preserve character and location anchors (@character, @location, <FIRST_FRAME>, <LAST_FRAME>).
- If writing a video prompt, describe camera dynamics, temporal action beats, and lighting evolution.
${antiMorphingRules}
- Return ONLY the final camera-ready prompt text without quotes or preamble.`;

                    const astraResponse = await openaiChat([
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: scenario ? `SCENARIO CONTEXT:\n${scenario}\n\nRAW PROMPT / SCRIPT:\n${text}` : text }
                    ], aiModel === 'gpt-4o' ? 'gpt-4o' : 'gpt-6-astra', isStoryboard);

                    if (astraResponse && typeof astraResponse === 'string' && astraResponse.trim()) {
                        refinedText = astraResponse.trim();
                        if (isStoryboard) {
                            const jsonMatch = refinedText.match(/\[\s*\{[\s\S]*\}\s*\]/);
                            if (jsonMatch) {
                                refinedText = jsonMatch[0];
                            }
                        }
                        return res.json({ 
                            refined: isStoryboard ? refinedText : refinedText.replace(/^"|"$/g, ''),
                            narrative: refinedText,
                            model: aiModel || 'gpt-6-astra'
                        });
                    }
                } catch (astraErr) {
                    console.warn('[BACKEND] Astra prompt writing failed, falling back to Gemini:', astraErr.message);
                }
            }

            res.json({ refined: (refinedText || text).trim().replace(/^"|"$/g, ''), narrative: refinedText });
        } catch (error) {
            console.error('BACKEND REFINE ERROR:', error);
            res.json({ refined: (req.body?.text || '').trim(), error: error.message });
        }
    });

    // Dedicated Prompt & Scenario Writer
    router.post('/write-prompt', async (req, res) => {
        try {
            const { prompt, scenario = "", type = "video", style = "", character = "", location = "", aiModel = "gemini-2.5-flash" } = req.body;
            if (!prompt && !scenario) return res.status(400).json({ error: "Prompt or scenario is required" });

            const systemPrompt = `You are the Lead AI Director and Cinematic Prompt Architect of ZeroLens AI Studio.
Your specialty is taking a user's rough idea, story beat, or scenario, and expanding it into a world-class, production-grade ${type === 'image' ? 'Image' : 'Video'} generation prompt.

Key Directives:
1. Scenario Comprehension: Character identities, location geography, dramatic tension, and emotional tone.
2. Prompt Precision: Concrete visual cues (e.g. "anamorphic 50mm T1.5 lens, shallow depth-of-field, volumetric golden-hour backlight raking across rain-soaked asphalt, subtle 24fps push-in tracking shot").
3. Tag Integration: Seamlessly place anchors like @character, @location, <FIRST_FRAME>, <LAST_FRAME> where appropriate.
4. ANTI-MORPHING & ANTI-SLOP: Prohibit morphing, liquid transitions, melting faces, extra fingers, or rubbery artifacts. Specify clean cinematic cuts between angles.

Format your response as a JSON object:
{
  "refinedPrompt": "The complete, camera-ready prompt text with zero morphing and 24fps physical realism",
  "cameraMotion": "Specific camera movement description (e.g. Slow push-in dolly at 24fps)",
  "lighting": "Specific lighting setup (e.g. Chiaroscuro high-contrast neon with soft amber fill)",
  "audioCue": "Atmospheric sound and foley cue for video generation"
}`;

            const userContent = `REQUEST TYPE: ${type.toUpperCase()} PROMPT
USER PROMPT / IDEA: "${prompt || ''}"
SCENARIO / STORY CONTEXT: "${scenario || 'None provided'}"
STYLE PREFERENCE: "${style || 'Cinematic Film'}"
CHARACTER ANCHOR: "${character || 'None'}"
LOCATION ANCHOR: "${location || 'None'}"

Write the ultimate, high-fidelity prompt for this scenario.`;

            let result = null;
            let usedModel = 'gpt-6-astra';

            // 1. Primary: Try Astra (GPT-6 Astra / OpenAI) for everyone
            if (process.env.EXPLABS_API_KEY && openaiChat) {
                try {
                    const response = await openaiChat([
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userContent }
                    ], aiModel === 'gpt-4o' ? 'gpt-4o' : 'gpt-6-astra', true);

                    if (response) {
                        try {
                            const match = response.match(/\{[\s\S]*\}/);
                            result = JSON.parse(match ? match[0] : response);
                            usedModel = 'gpt-6-astra';
                        } catch (_) {
                            result = { refinedPrompt: response };
                            usedModel = 'gpt-6-astra';
                        }
                    }
                } catch (astraErr) {
                    console.warn('[WRITE-PROMPT] Astra call failed, falling back to Vertex AI / Gemini Latest:', astraErr.message);
                }
            }

            // 2. Fallback: Vertex AI Gemini MCP / Latest Gemini 2.5 Models
            if (!result || !result.refinedPrompt) {
                let user;
                try { user = await requireAuth(req); } catch (_) {}
                const targetUserId = user ? user.id : req.body.userId;
                const rawApiKey = await resolveGoogleApiKey(req, targetUserId);
                const apiKey = (rawApiKey && rawApiKey !== 'VERTEX_AI_CLIENT') ? rawApiKey : (process.env.ADMIN_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY || process.env.GEMINI_API_KEY);

                if (apiKey) {
                    const geminiRes = await callGeminiWithCascade('gemini-2.5-flash', `${systemPrompt}\n\n${userContent}`, apiKey, true);
                    if (geminiRes && geminiRes.text) {
                        try {
                            const match = geminiRes.text.match(/\{[\s\S]*\}/);
                            result = JSON.parse(match ? match[0] : geminiRes.text);
                            usedModel = `Gemini MCP (${geminiRes.model})`;
                        } catch (_) {
                            result = { refinedPrompt: geminiRes.text };
                            usedModel = `Gemini MCP (${geminiRes.model})`;
                        }
                    }
                }

                // If still not resolved, try Vertex AI MCP generate content directly
                if (!result || !result.refinedPrompt) {
                    try {
                        const { vertexMcpGenerateContent } = await import('../services/vertexMcpService.js');
                        const mcpText = await vertexMcpGenerateContent({
                            prompt: userContent,
                            systemInstruction: systemPrompt,
                            model: 'gemini-2.5-flash',
                            temperature: 0.7
                        });
                        if (mcpText) {
                            try {
                                const match = mcpText.match(/\{[\s\S]*\}/);
                                result = JSON.parse(match ? match[0] : mcpText);
                                usedModel = 'Vertex AI Gemini MCP (2.5)';
                            } catch (_) {
                                result = { refinedPrompt: mcpText };
                                usedModel = 'Vertex AI Gemini MCP (2.5)';
                            }
                        }
                    } catch (mcpErr) {
                        console.warn('[WRITE-PROMPT] Vertex MCP fallback failed:', mcpErr.message);
                    }
                }
            }

            if (!result || !result.refinedPrompt) {
                result = { refinedPrompt: prompt || scenario };
            }

            res.json({
                success: true,
                model: usedModel,
                ...result
            });
        } catch (err) {
            console.error('[WRITE-PROMPT-ERROR]', err);
            res.status(500).json({ error: err.message });
        }
    });

    // 🎬 Interactive Director: Generate Complete Script from Concept/Idea
    router.post('/director/generate-script', async (req, res) => {
        try {
            const { idea, duration = '60 sec', genre = 'Commercial', directorStyle = 'Christopher Nolan', character = '', location = '', aiModel = 'gemini-2.5-flash' } = req.body;
            if (!idea) return res.status(400).json({ error: "Idea or logline is required" });

            const systemPrompt = `You are the Lead Screenwriter & Cinematic Director of ZeroLens AI Cinema Studio.
When given a film idea or pitch, write a formatted, industry-standard cinematic shooting script optimized for AI video generation (like Gemini Omni Flash 1.1 and Seedance 2.0).

Format rules:
1. Title and Logline at top.
2. Character and Location brief.
3. Sequential Scene Beats with visual framing, lighting, camera motion, action, and sound cues.
4. Explicitly design for clean cinematic shot cuts without morphing or rubbery visual artifacts.
5. Keep the script tightly paced for a ${duration} total runtime.
6. Return the clean text of the script ready to be loaded directly into a production deck.`;

            const userContent = `IDEA / PITCH: "${idea}"
TARGET DURATION: ${duration}
GENRE / GOAL: ${genre}
DIRECTOR STYLE: ${directorStyle}
${character ? `CHARACTER DETAILS: ${character}` : ''}
${location ? `LOCATION DETAILS: ${location}` : ''}

Generate the complete shooting script now.`;

            let script = '';
            let usedModel = aiModel || 'gemini-2.5-flash';

            // 1. Primary: Use Vertex AI MCP & Latest Gemini 2.5 Model to write the script
            try {
                const { vertexMcpGenerateContent } = await import('../services/vertexMcpService.js');
                const mcpScript = await vertexMcpGenerateContent({
                    prompt: userContent,
                    systemInstruction: systemPrompt,
                    model: 'gemini-2.5-flash',
                    temperature: 0.7
                });
                if (mcpScript && mcpScript.trim().length > 50) {
                    script = mcpScript.trim();
                    usedModel = 'Vertex AI Gemini MCP (2.5)';
                }
            } catch (mcpErr) {
                console.warn('[DIRECTOR-GENERATE-SCRIPT] Vertex MCP script generation fallback to Gemini Cascade:', mcpErr.message);
            }

            // 2. Fallback: Gemini Cascade (2.5 Pro / 2.5 Flash / 2.0)
            if (!script) {
                let user;
                try { user = await requireAuth(req); } catch (_) {}
                const targetUserId = user ? user.id : req.body.userId;
                const rawApiKey = await resolveGoogleApiKey(req, targetUserId);
                const apiKey = (rawApiKey && rawApiKey !== 'VERTEX_AI_CLIENT') ? rawApiKey : (process.env.ADMIN_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY || process.env.GEMINI_API_KEY);

                if (apiKey) {
                    const geminiRes = await callGeminiWithCascade('gemini-2.5-flash', `${systemPrompt}\n\n${userContent}`, apiKey, false);
                    if (geminiRes && geminiRes.text) {
                        script = geminiRes.text;
                        usedModel = `Gemini (${geminiRes.model})`;
                    }
                }
            }

            // 3. Fallback: Astra (ChatGPT 6)
            if (!script && process.env.EXPLABS_API_KEY && openaiChat) {
                try {
                    const response = await openaiChat([
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userContent }
                    ], 'gpt-6-astra', false);
                    script = response?.trim() || '';
                    usedModel = 'gpt-6-astra';
                } catch (e) {
                    console.warn('[DIRECTOR-GENERATE-SCRIPT] Astra fallback call failed:', e.message);
                }
            }

            if (!script) {
                script = `TITLE: ${idea.slice(0, 40)}...\n\nLOGLINE: ${idea}\n\nSCENE 1 - INT/EXT - ESTABLISHING\nA sweeping cinematic wide shot captures the atmospheric environment. Soft directional lighting highlights subtle dust particles in the air.\n\nSCENE 2 - CLOSE-UP - THE REVEAL\nThe camera pushes in smoothly toward the subject, revealing intricate textures and dynamic reflections.\n\nSCENE 3 - CLIMAX & BRAND REVEAL\nAn orbit camera move captures the final hero composition with dramatic contrast and cinematic lens flare.`;
            }

            res.json({ success: true, script, model: usedModel });
        } catch (err) {
            console.error('[DIRECTOR-GENERATE-SCRIPT]', err);
            res.status(500).json({ error: err.message });
        }
    });

    // 🎬 Interactive "Vibe Directing" Co-Pilot Chat (Live Natural Language Storyboard & Settings Tweaks)
    router.post('/director/chat', async (req, res) => {
        try {
            const { message, currentShots = [], currentSettings = {}, scriptText = '', activeScene = null, activeShot = null, activeShotIndex = null, aiModel = 'gemini-2.5-flash' } = req.body;
            if (!message) return res.status(400).json({ error: "Message is required" });

            const systemPrompt = `You are the Lead AI Co-Director & Storyboard Architect in ZeroLens AI Cinema Studio.
You work side-by-side with human directors to refine scripts, storyboard shots, camera moves, lighting, aspect ratios, and resolutions in real time.

When the user asks for changes, you MUST:
1. Actively interpret their directorial command.
2. If the user refers to "this shot", "current shot", or "here", apply modifications primarily to the active shot (or active scene).
3. If they request aspect ratio (e.g. 16:9, 9:16, 1:1, 2.39:1, 4:3), resolution (e.g. 720p, 1080p, 4K), or duration, update the settings object accordingly.
4. If they request changes to specific shots (lighting, camera movement, actions, mood, or new shots), update the shots array with refined prompts, cameraMotion, and titles.
5. Strict Quality Rules: All shot prompts must enforce ZERO MORPHING, clean cinematic cut transitions, and photorealistic 24fps physical motion.
6. Keep continuity tags like @char_..., @wardrobe_..., @prop_..., and @loc_... intact.
7. Provide an insightful, punchy directorial reply explaining what was changed and why it enhances the cinematic vision.

OUTPUT FORMAT REQUIREMENTS:
Return STRICTLY valid JSON with no markdown formatting or fences:
{
  "reply": "Conversational explanation of the changes made as the AI Co-Director.",
  "updatedSettings": {
    "aspectRatio": "current or updated (16:9 | 9:16 | 1:1 | 2.39:1 | 4:3)",
    "resolution": "current or updated (720p | 1080p | 4K)",
    "videoDuration": "current or updated duration string"
  },
  "updatedShots": [
    /* Complete array of updated shot objects */
  ],
  "suggestedNextSteps": [
    "Quick 1-click suggestion 1",
    "Quick 1-click suggestion 2"
  ]
}`;

            const userContent = `USER DIRECTORIAL COMMAND:
"${message}"

TARGET CONTEXT:
Active Scene: ${activeScene || 'All'}
Active Shot Index: ${activeShotIndex !== null ? activeShotIndex + 1 : 'None specified'}
Active Shot: ${activeShot ? JSON.stringify({ id: activeShot.id, title: activeShot.title, shotType: activeShot.shotType, cameraMotion: activeShot.cameraMotion, omniPrompt: activeShot.omniPrompt }) : 'None selected'}

CURRENT PROJECT SETTINGS:
${JSON.stringify(currentSettings, null, 2)}

CURRENT SCRIPT CONTEXT:
${scriptText || 'None'}

CURRENT SHOTS ARRAY (${currentShots.length} shots):
${JSON.stringify(currentShots.map(s => ({
    id: s.id,
    sceneNumber: s.sceneNumber,
    shotNumber: s.shotNumber,
    title: s.title,
    shotType: s.shotType,
    cameraMotion: s.cameraMotion,
    duration: s.duration,
    mode: s.mode,
    characterTag: s.characterTag,
    locationTag: s.locationTag,
    wardrobeTag: s.wardrobeTag,
    propTag: s.propTag,
    omniPrompt: s.omniPrompt,
    audioBeat: s.audioBeat
})), null, 2)}

Modify the storyboard, settings, or shots according to the user's command and return the JSON.`;

            let result = null;

            // Route to Gemini
            if (aiModel.startsWith('gemini') || !process.env.EXPLABS_API_KEY) {
                let user;
                try { user = await requireAuth(req); } catch (_) {}
                const targetUserId = user ? user.id : req.body.userId;
                const rawApiKey = await resolveGoogleApiKey(req, targetUserId);
                const apiKey = (rawApiKey && rawApiKey !== 'VERTEX_AI_CLIENT') ? rawApiKey : (process.env.ADMIN_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY || process.env.GEMINI_API_KEY);

                if (apiKey) {
                    const geminiRes = await callGeminiWithCascade(aiModel, `${systemPrompt}\n\n${userContent}`, apiKey, true);
                    if (geminiRes && geminiRes.text) {
                        const jsonMatch = geminiRes.text.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            try {
                                result = JSON.parse(jsonMatch[0]);
                            } catch (_) {}
                        }
                    }
                }
            }

            if (!result && process.env.EXPLABS_API_KEY && openaiChat) {
                try {
                    const rawResp = await openaiChat([
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userContent }
                    ], aiModel === 'gpt-4o' ? 'gpt-4o' : 'gpt-6-astra', true);

                    const jsonMatch = rawResp.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        result = JSON.parse(jsonMatch[0]);
                    }
                } catch (pe) {
                    console.warn('[DIRECTOR-CHAT] Astra call/parse warning:', pe.message);
                }
            }

            if (!result || !result.reply) {
                result = {
                    reply: `Understood! I've analyzed your direction: "${message}". Let's refine the shots to match your creative vision.`,
                    updatedSettings: currentSettings,
                    updatedShots: currentShots,
                    suggestedNextSteps: ["Enhance volumetric lighting", "Add close-up hero shot"]
                };
            }

            // Merge back runtime properties into updatedShots if preserved
            if (Array.isArray(result.updatedShots) && result.updatedShots.length > 0) {
                result.updatedShots = result.updatedShots.map((updatedShot, idx) => {
                    const original = currentShots.find(s => s.id === updatedShot.id) || currentShots[idx] || {};
                    return {
                        ...original,
                        ...updatedShot,
                        id: updatedShot.id || original.id || `shot_${Date.now()}_${idx}`,
                        status: original.status || 'idle',
                        videoUrl: original.videoUrl || null,
                        startFrame: original.startFrame || null,
                        endFrame: original.endFrame || null
                    };
                });
            } else {
                result.updatedShots = currentShots;
            }

            res.json({
                success: true,
                model: 'gpt-6-astra',
                reply: result.reply,
                updatedSettings: result.updatedSettings || currentSettings,
                updatedShots: result.updatedShots,
                suggestedNextSteps: result.suggestedNextSteps || []
            });
        } catch (err) {
            console.error('[DIRECTOR-CHAT-ERROR]', err);
            res.status(500).json({ error: err.message });
        }
    });

    // Suggest Dialogue Alternatives
    router.post('/suggest-dialogue', async (req, res) => {
        try {
            const { currentScript, context = "" } = req.body;
            if (!currentScript) return res.status(400).json({ error: "currentScript is required" });

            let user;
            try {
                user = await requireAuth(req);
            } catch (_) {}
            const targetUserId = user ? user.id : req.body.userId;
            const rawApiKey = await resolveGoogleApiKey(req, targetUserId);
            const apiKey = (rawApiKey && rawApiKey !== 'VERTEX_AI_CLIENT') ? rawApiKey : (process.env.ADMIN_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
            const projectId = process.env.NEW_GOOGLE_PROJECT_ID || process.env.GOOGLE_PROJECT_ID;
            const location = process.env.GOOGLE_LOCATION || 'us-central1';

            const prompt = `You are an expert scriptwriter and dialogue polisher. 
            Given the following dialogue or script snippet, provide 3 distinct alternative phrasings.
            
            CURRENT SCRIPT: "${currentScript}"
            ${context ? `CONTEXT: ${context}` : ""}
            
            Make them creative, natural, and punchy.
            Return ONLY valid JSON in this format:
            {
              "alternatives": ["Alternative 1", "Alternative 2", "Alternative 3"]
            }`;

            const safetySettings = [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ];

            let textContent = "{}";

            const headers = { 
                'Content-Type': 'application/json',
                'Referer': `${APP_ORIGIN}/`,
                'Origin': APP_ORIGIN
            };

            if (apiKey && apiKey.startsWith('AIza')) {
                console.log(`[BACKEND] Suggesting dialogue via AI Studio REST (Gemini 2.5)...`);
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ 
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: "application/json" },
                        safetySettings
                    })
                });
                const data = await resp.json();
                if (!resp.ok) throw new Error(data.error?.message || `AI Studio Error ${resp.status}`);
                textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
            } else {
                console.log(`[BACKEND] Suggesting dialogue via Vertex AI Bearer...`);
                const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-2.5-flash:generateContent`;
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: {
                        ...headers,
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: "application/json" },
                        safetySettings
                    })
                });
                const data = await resp.json();
                if (!resp.ok) throw new Error(data.error?.message || `Vertex Error ${resp.status}`);
                textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
            }

            const data = JSON.parse(textContent.match(/\{[\s\S]*\}/)?.[0] || "{}");
            res.json({ alternatives: data.alternatives || [] });
        } catch (error) {
            console.error('BACKEND DIALOGUE ERROR:', error);
            res.status(500).json({ error: error.message, alternatives: [] });
        }
    });

    // Generate Character Image (Bypassing geminiService for direct REST stability using handleGoogle)
    router.post('/generate', async (req, res) => {
        try {
            const { prompt, references, identity_images, aspect_ratio, modelEngine, quality, system_instruction, userId } = req.body;
            
            if (!userId) {
                return res.status(400).json({ error: "Missing User ID. Cannot persist generated matrix." });
            }

            // We modify the request object to match what handleGoogle expects
            const mockReq = {
                body: {
                    prompt,
                    identity_images: references || identity_images,
                    userId,
                    model: modelEngine || 'nano-banana-pro',
                    quality: quality || '2k', // Matrix looks better in high res
                    aspect_ratio: aspect_ratio || '16:9',
                    system_instruction
                }
            };

            console.log(`[FORGE_GEN] Calling handleGoogle for ${userId}`);
            await handleGoogle(mockReq, res);

        } catch (error) {
            console.error('[FORGE_GEN_ERROR] ❌:', error.message);
            res.status(500).json({ 
                error: "Generation Failed",
                message: error.message
            });
        }
    });

    // Semantic Search (PHASE 4)
    router.post('/influencer/semantic-search', async (req, res) => {
        try {
            const { query } = req.body;
            if (!query) throw new Error('No query provided');

            console.log(`[SERVER] Performing semantic search for: "${query}"`);
            const queryEmbedding = await vectorService.getEmbedding(query);
            if (!queryEmbedding) throw new Error('Failed to generate search embedding');

            const { data: characters, error } = await supabase
                .from('characters')
                .select('id, name, image, visual_style, origin, metadata');

            if (error) throw error;

            const results = characters
                .map(c => {
                    const embedding = c.metadata?.embedding;
                    if (!embedding) return null;
                    const similarity = vectorService.cosineSimilarity(queryEmbedding, embedding);
                    return { ...c, similarity };
                })
                .filter(c => c && c.similarity > 0.7) // Threshold
                .sort((a, b) => b.similarity - a.similarity);

            res.json({ results: results.slice(0, 10) });
        } catch (error) {
            console.error('Semantic Search Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Research Agent (Google Search)
    router.post('/director/research', async (req, res) => {
        try {
            const { query } = req.body;
            if (!query) throw new Error('No query provided');
            console.log(`[PHASE 6] Research Agent conducting data-mining for: "${query}"`);
            const result = await geminiService.researchProductionContext(query);
            res.json(result);
        } catch (error) {
            console.error('Research Agent Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Thinking Mode Sequence Generation
    router.post('/director/thinking-sequence', async (req, res) => {
        try {
            const { narrative, bible } = req.body;
            if (!narrative) throw new Error('No narrative provided');
            console.log(`[PHASE 6] Thinking Mode engaged for narrative arc.`);
            const result = await geminiService.generateThinkerSequence(narrative, bible);
            res.json(result);
        } catch (error) {
            console.error('Thinking Mode Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Hermes chat route
    router.post('/hermes/chat', async (req, res) => {
        try {
            const { message, userId, sessionId, reset, carouselType, artDirection, typography, brandName } = req.body;
            if (!message) {
                return res.status(400).json({ error: 'message is required' });
            }

            // Fetch active admin skills from Supabase if available
            let adminSkillsText = '';
            if (supabase) {
                try {
                    const { data: skills, error } = await supabase
                        .from('hermes_skills')
                        .select('name, system_instructions')
                        .eq('is_active', true);
                    
                    if (!error && skills && skills.length > 0) {
                        adminSkillsText = '\n\nADMIN-PROVIDED EXPERT SKILLS:\n' + 
                            skills.map(s => `### Skill: ${s.name}\n${s.system_instructions}`).join('\n\n');
                    }
                } catch (dbErr) {
                    console.warn('[Hermes Chat] Failed to fetch admin skills from Supabase:', dbErr.message);
                }
            }

            const systemPrompt = `You are Hermes, a world-class GenAI Creative Director and Expert Prompt Engineer.
Your mission is to help users generate stunning premium images and videos, design beautiful Instagram carousels, write viral Reels/TikTok scripts, and craft high-converting copy.

SCOPE AND CONSTRAINTS:
- YOU ARE A CREATIVE CONTENT WRITER AND ART DIRECTOR ONLY.
- Under NO circumstances should you assist with programming, writing code, software development, debugging, or tech engineering questions. If the user asks for code, script code, HTML, CSS, JavaScript, or any programming task, you MUST politely decline and redirect them back to content creation: "I am Hermes, your AI Creative Director. I specialize in scripting, storytelling, reel production, and art direction. Let's design an amazing content strategy or script for your brand instead!"
- Focus entirely on storytelling scripts, Reel copywriting, hook optimization, brand voice refinement, content calendars, and image/video prompt recommendations.

USER CONTEXT:
- Carousel Type: ${carouselType?.label || 'Not specified'}
- Art Direction: ${artDirection || 'cinematic'}
- Typography: ${typography || 'cinematic'}
- Brand: ${brandName || 'Not specified'}${adminSkillsText}

YOUR CRITICAL ROLES:
1. DESIGN & CAROUSEL CREATIVE DIRECTION:
   - Be extremely proactive, bold, and opinionated. Suggest appropriate visual pacing, color palettes, and aesthetic styles.
   - Always pitch 1-2 creative design hook ideas or visual style adjustments to make their concept pop.
   - If the user asks to outline a carousel or case study, generate a creative brief with 5-7 slides.

2. VIRAL SCRIPTWRITING & REELS OPTIMIZATION:
   - When asked for scripts or Reel frameworks, provide detailed audio, visual b-roll directions, transition cues, text-on-screen overlays, and highly engaging voiceover copy.
   - Focus on retaining watch-time and capturing hooks in the first 3 seconds.

3. EXPERT PROMPT ENGINEERING & MULTI-MODEL RECOMMENDATION:
   - Proactively suggest visual prompt recommendations even if the user is just describing a topic or visual concept. Act as a Prompt Architect.
   - Expand their simple query into a masterfully detailed visual prompt (detailing lighting, cinematic lens/atmosphere, high-fidelity styles, and visual details) for premium outputs.
   - Recommend the absolute best model engine:
     * "seedance-1-5-pro-251215" for video/animation with rich cinematic motion.
     * "gpt-image-2" for detailed vector, branding, or graphic layout images.
     * "nano-banana-2" for beautiful high-fidelity standard illustrations/photos.
   - Select correct parameters for the recommendation, e.g. ratio ("16:9", "9:16", "1:1", or "adaptive") and duration (5).

RESPONSE FORMAT:
You MUST respond with valid JSON matching one of these structures based on intent:

A. For general chatbot / conversation or when suggesting a single image/video prompt:
{
  "type": "message",
  "content": "A highly engaging, proactive, and creative response. Pitch cool ideas, suggest visual pacing, or critique/improve the user's concepts enthusiastically.",
  "promptRecommendation": {
    "type": "image" or "video",
    "suggestedModel": "seedance-1-5-pro-251215" or "gpt-image-2" or "nano-banana-2",
    "expertPrompt": "Your expanded premium prompt here (e.g. 'Gourmet wagyu beef burger plated with rim volumetric lighting, extreme close-up, photorealistic 8k...' or 'FPV drone thread through misty forest canopy, cinematic flow, --duration 5 --camerafixed false')",
    "parameters": {
      "ratio": "16:9" or "1:1" or "9:16",
      "duration": 5,
      "generate_audio": true
    }
  }
}

B. When generating a full Instagram carousel brief:
{
  "type": "brief",
  "content": "Creative brief summary for user, highlighting your active design recommendations.",
  "brief": {
    "topic": "main topic",
    "brandName": "extracted brand",
    "audience": "target audience",
    "artDirection": "suggested style",
    "cta": "call to action"
  },
  "creativeDirection": {
    "slides": [
      {"headline": "Headline 1", "body": "Body text 1"},
      ...
    ]
  }
}

Keep responses highly engaging, creative, proactive, and actionable. Output only the raw JSON.`;

            const reqModel = req.body.model;
            let apiUrl = 'https://api.openai.com/v1/chat/completions';
            let apiKey = process.env.OPENAI_API_KEY;
            let modelToUse = 'gpt-4o';

            if (reqModel === 'gpt-6-astra') {
                if (!process.env.EXPLABS_API_KEY) {
                    return res.status(401).json({ error: 'EXPLABS_API_KEY is not set. Please create one under Settings -> API Keys and export it.' });
                }
                apiUrl = 'https://api.experientiallabs.ai/v1/chat/completions';
                apiKey = process.env.EXPLABS_API_KEY;
                modelToUse = 'gpt-6-astra';
            }

            const openaiResp = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: modelToUse,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message }
                    ],
                    temperature: 0.8,
                    max_tokens: 1500
                })
            });

            if (!openaiResp.ok) {
                const errData = await openaiResp.json().catch(() => ({}));
                throw new Error(errData.error?.message || `OpenAI error: ${openaiResp.status}`);
            }

            const openaiData = await openaiResp.json();
            const aiContent = openaiData.choices?.[0]?.message?.content || '';

            let parsedResponse;
            try {
                const jsonMatch = aiContent.match(/```json\n?([\s\S]*?)```/) || 
                                  aiContent.match(/{[\s\S]*}/);
                const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiContent;
                parsedResponse = JSON.parse(jsonStr);
            } catch (parseErr) {
                parsedResponse = {
                    type: 'message',
                    content: aiContent
                };
            }

            res.json({
                type: parsedResponse.type || 'message',
                content: parsedResponse.content || '',
                brief: parsedResponse.brief || null,
                creativeDirection: parsedResponse.creativeDirection || null,
                promptRecommendation: parsedResponse.promptRecommendation || null
            });

        } catch (err) {
            console.error('[Hermes Chat]', err.message);
            res.status(500).json({ 
                error: err.message,
                type: 'error',
                content: 'Sorry, I encountered an error. Please try again.'
            });
        }
    });

    return router;
}
