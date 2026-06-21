import express from 'express';
import * as cacheService from '../../services/cacheService.js';

export default function createRouter(deps) {
    const router = express.Router();
    const APP_ORIGIN = (process.env.APP_ORIGIN || process.env.PUBLIC_APP_URL || 'https://zerolens.in').replace(/\/+$/, '');
    const {
        geminiService,
        vectorService,
        handleGoogle,
        supabase
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

    // Refine Prompt Narrative
    router.post('/refine-narrative', async (req, res) => {
        try {
            const { text, type = "general" } = req.body;
            if (!text) return res.status(400).json({ error: "Text is required" });

            const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;

            const prompt = `You are an elite cinematic prompt engineer. Your task is to take a raw description and transform it into a high-fidelity, visually rich narrative prompt.
            
            INPUT DESCRIPTION: "${text}"
            CATEGORY: ${type}
            
            Guidelines:
            - Enhance textures, lighting, and environmental details.
            - Maintain the core intent of the user.
            - Keep it descriptive but concise (max 50 words).
            - Use evocative language suitable for high-end AI video/image models like Veo or Imagen.
            - Do NOT add camera/lens settings (those are handled elsewhere).
            
            Return ONLY the refined text string.`;
            const safetySettings = [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ];

            const headers = { 
                'Content-Type': 'application/json',
                'Referer': `${APP_ORIGIN}/`,
                'Origin': APP_ORIGIN
            };

            console.log(`[BACKEND] Refining narrative for ${type} using AI Studio (Gemini 2.5)...`);
            const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
            
            const resp = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ 
                    contents: [{ parts: [{ text: prompt }] }],
                    safetySettings
                })
            });

            const data = await resp.json();
            if (!resp.ok) {
                console.error("[BACKEND-AI-ERR]", JSON.stringify(data, null, 2));
                throw new Error(`AI Gateway Error: ${data.error?.message || resp.status}`);
            }
            
            const refinedText = data.candidates?.[0]?.content?.parts?.[0]?.text || text;
            res.json({ refined: refinedText.trim().replace(/^"|"$/g, '') });
        } catch (error) {
            console.error('BACKEND REFINE ERROR:', error);
            res.status(500).json({ error: error.message, originalText: req.body.text });
        }
    });

    // Suggest Dialogue Alternatives
    router.post('/suggest-dialogue', async (req, res) => {
        try {
            const { currentScript, context = "" } = req.body;
            if (!currentScript) return res.status(400).json({ error: "currentScript is required" });

            const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
            const projectId = process.env.GOOGLE_PROJECT_ID;
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
                const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
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
                const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-1.5-flash-latest:generateContent`;
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

            const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
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
