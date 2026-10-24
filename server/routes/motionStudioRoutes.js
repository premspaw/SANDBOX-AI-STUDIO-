import express from 'express';
import {createUtilityAuth} from '../utils/utilityAuth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodeFetch from 'node-fetch';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

export default function createMotionStudioRouter(deps = {}) {
    const router = express.Router();
    const {
        VERTEX_PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'new-zerolens-api',
        VERTEX_LOCATION = process.env.GOOGLE_LOCATION || 'us-central1',
        getVertexToken = async () => null,
        openaiChat = null,
        getGeminiClient = null
    } = deps;

    // Helper: read skill markdown contract
    const loadSkillContract = (skillId) => {
        if (!skillId || skillId === 'auto') return null;
        const candidatePaths = [
            path.join(rootDir, 'public', 'skills', 'motion-styles', skillId, 'SKILL.md'),
            path.join(rootDir, 'public', 'motion-styles', skillId, 'SKILL.md')
        ];
        for (const p of candidatePaths) {
            try {
                if (fs.existsSync(p)) {
                    return fs.readFileSync(p, 'utf8');
                }
            } catch (_) {}
        }
        return null;
    };

    // Helper: read skill template.html to inspect default parameters
    const loadSkillTemplateHead = (skillId) => {
        if (!skillId || skillId === 'auto') return '';
        const candidatePaths = [
            path.join(rootDir, 'public', 'skills', 'motion-styles', skillId, 'template.html'),
            path.join(rootDir, 'public', 'motion-styles', skillId, 'template.html')
        ];
        for (const p of candidatePaths) {
            try {
                if (fs.existsSync(p)) {
                    const content = fs.readFileSync(p, 'utf8');
                    return content.slice(0, 1500);
                }
            } catch (_) {}
        }
        return '';
    };

    // Helper: list available motion skills with summaries
    const getAvailableSkillsSummary = () => {
        const skillsDir = path.join(rootDir, 'public', 'motion-styles');
        try {
            if (!fs.existsSync(skillsDir)) return [];
            const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
            return entries
                .filter(e => e.isDirectory() && e.name.startsWith('motion-'))
                .map(e => {
                    const skillPath = path.join(skillsDir, e.name, 'SKILL.md');
                    let desc = '';
                    if (fs.existsSync(skillPath)) {
                        const content = fs.readFileSync(skillPath, 'utf8');
                        const m = content.match(/description:\s*['"]?([^'"\n]+)['"]?/i);
                        if (m) desc = m[1];
                    }
                    return { id: e.name, description: desc };
                });
        } catch (_) {
            return [];
        }
    };

    // Procedural Fallback Choreographer
    const generateProceduralChoreography = ({ brief, lyrics, duration = 15, selectedSkill, mood, intensity }) => {
        const dur = Number(duration) > 0 ? Number(duration) : 15;
        const lines = (lyrics || '')
            .split('\n')
            .map(l => l.replace(/\[\d{2}:\d{2}(?:\.\d{1,3})?\]/g, '').trim())
            .filter(Boolean);

        const skill = selectedSkill && selectedSkill !== 'auto' ? selectedSkill : 'motion-wireframe-3d';
        const lineCount = Math.max(lines.length, 3);
        const segmentDur = dur / lineCount;

        const timedLyrics = lines.length > 0 
            ? lines.map((text, i) => {
                const start = Number((i * segmentDur).toFixed(2));
                const end = Number(((i + 1) * segmentDur - 0.2).toFixed(2));
                const words = text.split(/\s+/);
                const highlight = words.length > 2 ? words[Math.floor(words.length / 2)] : words[0] || '';
                return { start, end, text, highlight };
            })
            : [
                { start: 0.5, end: Number((dur * 0.35).toFixed(2)), text: brief || "ZeroLens Motion Studio", highlight: "ZeroLens" },
                { start: Number((dur * 0.4).toFixed(2)), end: Number((dur * 0.75).toFixed(2)), text: "Procedural 3D Motion Choreography", highlight: "Choreography" },
                { start: Number((dur * 0.8).toFixed(2)), end: Number((dur - 0.5).toFixed(2)), text: "Synchronized to Every Beat", highlight: "Beat" }
            ];

        const palette = {
            name: 'ZeroLens Lime Core',
            bg: '#0a0a0b',
            c1: '#c8f135',
            c2: '#ffffff',
            c3: '#1d2a0a'
        };

        const scenes = [
            {
                id: 'scene-1',
                name: 'Opening Hook & Motif',
                start: 0,
                end: Number((dur * 0.33).toFixed(2)),
                skill: skill,
                primaryText: timedLyrics[0]?.text?.slice(0, 24) || 'OPENING',
                subText: 'PHASE 01 • ESTABLISH',
                cameraMove: 'Dolly-In with 15° Horizon Roll',
                parameters: { speed: 1.0, particleDensity: 'medium', wireframe: true, bg: palette.bg, c1: palette.c1, c2: palette.c2, c3: palette.c3 }
            },
            {
                id: 'scene-2',
                name: 'Main Rhythmic Climax',
                start: Number((dur * 0.33).toFixed(2)),
                end: Number((dur * 0.75).toFixed(2)),
                skill: skill,
                primaryText: timedLyrics[Math.floor(timedLyrics.length / 2)]?.text?.slice(0, 24) || 'DROP BEAT',
                subText: 'PHASE 02 • INTENSITY',
                cameraMove: 'Rapid 360° Orbit on Beat Drop',
                parameters: { speed: 1.6, particleDensity: 'high', wireframe: true, bg: palette.bg, c1: palette.c1, c2: palette.c2, c3: palette.c3 }
            },
            {
                id: 'scene-3',
                name: 'Outro & Resolution',
                start: Number((dur * 0.75).toFixed(2)),
                end: dur,
                skill: skill,
                primaryText: timedLyrics[timedLyrics.length - 1]?.text?.slice(0, 24) || 'FINALE',
                subText: 'PHASE 03 • RESOLVE',
                cameraMove: 'Smooth Crane Backwards to Orthographic',
                parameters: { speed: 0.8, particleDensity: 'low', wireframe: true, bg: palette.bg, c1: palette.c1, c2: palette.c2, c3: palette.c3 }
            }
        ];

        const primaryText = timedLyrics[0]?.text || 'ZEROLENS';
        const subText = timedLyrics[1]?.text || 'MOTION STUDIO';
        const cleanHex = (h) => (h || '').replace('#', '');
        const templateQuery = `text=${encodeURIComponent(primaryText)}&sub=${encodeURIComponent(subText)}&c1=${cleanHex(palette.c1)}&c2=${cleanHex(palette.c2)}&c3=${cleanHex(palette.c3)}&bg=${cleanHex(palette.bg)}&dur=${dur}`;
        const previewUrl = `/motion-styles/${skill}/template.html?${templateQuery}`;

        return {
            title: brief ? brief.slice(0, 40) : 'Procedural Motion Scene',
            modelUsed: 'procedural-motion-engine',
            recommendedSkill: skill,
            summary: `Automated motion choreography calculated for ${dur}s sequence across ${scenes.length} visual beats.`,
            palette,
            cameraChoreography: [
                { time: 0, type: 'Dolly-In', fov: 45, description: 'Smooth entrance establishing geometric wireframe' },
                { time: Number((dur * 0.33).toFixed(1)), type: 'Orbit Spin', fov: 55, description: 'Dynamic rotation locked to chorus rhythm' },
                { time: Number((dur * 0.75).toFixed(1)), type: 'Elevation Pull', fov: 40, description: 'Decelerating ascent into final title rest' }
            ],
            timedLyrics,
            scenes,
            previewUrl,
            engineRecommendation: {
                engine: 'Motion as Code / Three.js',
                why: 'Provides real-time GPU 60 FPS animation with zero prerendering latency.'
            }
        };
    };

    // POST /api/motion-studio/choreograph
    router.post('/choreograph', createUtilityAuth(deps.requireAuth), async (req, res) => {
        try {
            const {
                model = 'gemini-4-argon',
                apiKey: userApiKey,
                brief = '',
                lyrics = '',
                songTitle = '',
                duration = 15,
                selectedSkill = 'auto',
                aspectRatio = '9:16',
                mood = 'Abstract mood',
                intensity = 'Balanced'
            } = req.body;

            if(typeof selectedSkill!=='string'||selectedSkill!=='auto'&&!/^motion-[a-z0-9-]{1,80}$/.test(selectedSkill))
                return res.status(400).json({error:'Invalid motion template'});
            if(!Number.isFinite(Number(duration))||Number(duration)<1||Number(duration)>60
              ||typeof brief!=='string'||brief.length>20000||typeof lyrics!=='string'||lyrics.length>20000)
                return res.status(400).json({error:'Invalid duration, brief or lyrics'});
            const isClaude = String(model).toLowerCase().startsWith('claude');
            const isOpenAI = String(model).toLowerCase().startsWith('gpt') || String(model).toLowerCase().startsWith('o3');
            const targetSkill = selectedSkill && selectedSkill !== 'auto' ? selectedSkill : null;
            const skillContract = targetSkill ? loadSkillContract(targetSkill) : null;
            const skillTemplateHead = targetSkill ? loadSkillTemplateHead(targetSkill) : '';
            const availableSkills = getAvailableSkillsSummary();

            const systemPrompt = `You are an elite 3D/2D Motion Director, Procedural Animator, and Lyric Choreographer for ZeroLens Motion Studio.
Your mission is to analyze a musical track/lyrics/brief and generate an end-to-end procedural animation storyboard.
You MUST output ONLY a valid JSON object matching this exact schema:

{
  "title": "Creative Title for this sequence",
  "summary": "2-3 sentences explaining your artistic direction, rhythm synchronization, and visual pacing.",
  "recommendedSkill": "${targetSkill || 'motion-wireframe-3d'}",
  "palette": {
    "name": "Palette Name",
    "bg": "#hex",
    "c1": "#hex (primary glow/lines)",
    "c2": "#hex (accent/secondary)",
    "c3": "#hex (ambient/grid)"
  },
  "cameraChoreography": [
    { "time": 0.0, "type": "Camera move name", "fov": 50, "description": "Direction details" }
  ],
  "timedLyrics": [
    { "start": 0.5, "end": 3.8, "text": "Original line text (preserve Kannada / Hindi / English characters)", "highlight": "Key emphasized word" }
  ],
  "scenes": [
    {
      "id": "scene-1",
      "name": "Scene Name",
      "start": 0.0,
      "end": 5.0,
      "skill": "skill-id",
      "primaryText": "Display header",
      "subText": "Display subheader",
      "cameraMove": "Specific camera transition",
      "parameters": {
        "speed": 1.2,
        "wireframe": true,
        "bg": "#hex",
        "c1": "#hex",
        "c2": "#hex",
        "c3": "#hex"
      }
    }
  ],
  "engineRecommendation": {
    "engine": "Motion as Code / Three.js | Remotion | HyperFrames",
    "why": "Specific reason why this engine fits the song"
  }
}

CRITICAL RULES:
1. Preserve any non-Latin scripts (Kannada, Devanagari, Japanese, etc.) accurately without corruption.
2. Timestamps in timedLyrics and scenes MUST strictly be between 0.0 and ${duration} seconds.
3. Align visual cuts and camera changes with the natural phrase endings and rhythmic drops.
4. Output RAW JSON only. Do not wrap in markdown code blocks like \`\`\`json.`;

            const userContent = `PROJECT PARAMETERS:
- Song/Track Name: ${songTitle || 'Untitled Track'}
- Target Duration: ${duration} seconds
- Aspect Ratio: ${aspectRatio}
- Desired Mood: ${mood}
- Intensity: ${intensity}
${targetSkill ? `- Target Motion Skill: ${targetSkill}` : '- Motion Skill: Auto-pick best matching skill from available list'}

${skillContract ? `CURRENT SKILL CONTRACT & PARAMETERS:\n${skillContract}\n` : `AVAILABLE PROCEDURAL MOTION SKILLS:\n${availableSkills.map(s => `- ${s.id}: ${s.description}`).join('\n')}\n`}

${skillTemplateHead ? `TEMPLATE PARAMETERS:\n${skillTemplateHead}\n` : ''}

${lyrics ? `LYRICS / TIMING INPUT:\n${lyrics}` : `MOTION BRIEF / THEME:\n${brief || 'Modern dynamic visualizer matching song rhythm and energy'}`}`;

            let aiResponseText = null;
            let modelUsed = model;

            if (isClaude) {
                const claudeKey = userApiKey || process.env.ANTHROPIC_API_KEY;
                if (!claudeKey) {
                    const fallback = generateProceduralChoreography({ brief, lyrics, duration, selectedSkill, mood, intensity });
                    fallback.note = 'No Anthropic API key provided. Generated with ZeroLens Procedural Engine.';
                    return res.json(fallback);
                }

                const claudeModel = model.includes('3-5') ? 'claude-3-5-sonnet-20241022' : 'claude-3-7-sonnet-20250219';
                const response = await nodeFetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': claudeKey,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: claudeModel,
                        max_tokens: 4096,
                        system: systemPrompt,
                        messages: [{ role: 'user', content: userContent }]
                    })
                });

                if (response.ok) {
                    const claudeData = await response.json();
                    aiResponseText = claudeData?.content?.[0]?.text;
                    modelUsed = claudeModel;
                }
            } else if (isOpenAI) {
                const openaiKey = userApiKey || process.env.OPENAI_API_KEY;
                if (openaiKey) {
                    const response = await nodeFetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${openaiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: model === 'o3-mini' ? 'o3-mini' : 'gpt-4o',
                            messages: [
                                { role: 'system', content: systemPrompt },
                                { role: 'user', content: userContent }
                            ],
                            response_format: { type: 'json_object' }
                        })
                    });
                    if (response.ok) {
                        const openAiData = await response.json();
                        aiResponseText = openAiData?.choices?.[0]?.message?.content;
                        modelUsed = model;
                    }
                }
            } else {
                const effectiveGoogleKey = userApiKey || process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_API_KEY;
                const token = await getVertexToken().catch(() => null);

                try {
                    const client = new GoogleGenAI({
                        vertexai: true,
                        apiKey: effectiveGoogleKey || undefined,
                        project: VERTEX_PROJECT_ID,
                        location: VERTEX_LOCATION,
                        googleAuthOptions: token ? { credentials: { access_token: token } } : undefined
                    });

                    const genConfig = {
                        maxOutputTokens: 8192,
                        temperature: 0.4,
                        systemInstruction: systemPrompt,
                        thinkingConfig: { thinkingLevel: 'MEDIUM' }
                    };

                    const result = await client.models.generateContent({
                        model: 'gemini-4-argon',
                        contents: [{ role: 'user', parts: [{ text: userContent }] }],
                        config: genConfig
                    });

                    aiResponseText = result.text || result?.candidates?.[0]?.content?.parts?.[0]?.text;
                    modelUsed = 'gemini-4-argon';
                } catch (genaiErr) {
                    if (token || effectiveGoogleKey) {
                        const endpoint = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/gemini-4-argon:generateContent`;
                        const headers = { 'Content-Type': 'application/json' };
                        if (token) headers['Authorization'] = `Bearer ${token}`;
                        else headers['X-Goog-Api-Key'] = effectiveGoogleKey;

                        const restRes = await nodeFetch(endpoint, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({
                                contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userContent}` }] }],
                                generationConfig: { temperature: 0.4, maxOutputTokens: 8192 }
                            })
                        });

                        if (restRes.ok) {
                            const restData = await restRes.json();
                            aiResponseText = restData?.candidates?.[0]?.content?.parts?.[0]?.text;
                            modelUsed = 'gemini-4-argon (vertex-rest)';
                        }
                    }

                    if (!aiResponseText && getGeminiClient) {
                        try {
                            const fallbackAi = getGeminiClient();
                            if (fallbackAi) {
                                const fbResult = await fallbackAi.models.generateContent({
                                    model: 'gemini-2.5-flash',
                                    contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userContent}` }] }]
                                });
                                aiResponseText = fbResult.text;
                                modelUsed = 'gemini-2.5-flash (connected fallback)';
                            }
                        } catch (_) {}
                    }
                }
            }

            if (!aiResponseText) {
                const fallback = generateProceduralChoreography({ brief, lyrics, duration, selectedSkill, mood, intensity });
                fallback.note = 'Synthesized via procedural engine (API keys inactive or throttled).';
                return res.json(fallback);
            }

            let cleanJsonStr = aiResponseText.trim();
            if (cleanJsonStr.startsWith('```json')) cleanJsonStr = cleanJsonStr.slice(7);
            else if (cleanJsonStr.startsWith('```')) cleanJsonStr = cleanJsonStr.slice(3);
            if (cleanJsonStr.endsWith('```')) cleanJsonStr = cleanJsonStr.slice(0, -3);
            cleanJsonStr = cleanJsonStr.trim();

            try {
                const parsed = JSON.parse(cleanJsonStr);
                parsed.modelUsed = modelUsed;

                const chosenSkill = parsed.recommendedSkill || targetSkill || 'motion-wireframe-3d';
                const p = parsed.palette || {};
                const cleanHex = (h) => (h || '').replace('#', '');
                const firstScene = parsed.scenes?.[0] || {};
                const qText = firstScene.primaryText || parsed.timedLyrics?.[0]?.text || 'ZEROLENS';
                const qSub = firstScene.subText || parsed.timedLyrics?.[1]?.text || 'MOTION';
                const query = `text=${encodeURIComponent(qText)}&sub=${encodeURIComponent(qSub)}&c1=${cleanHex(p.c1 || 'c8f135')}&c2=${cleanHex(p.c2 || 'ffffff')}&c3=${cleanHex(p.c3 || '444444')}&bg=${cleanHex(p.bg || '0a0a0b')}&dur=${duration}`;
                parsed.previewUrl = `/motion-styles/${chosenSkill}/template.html?${query}`;

                return res.json(parsed);
            } catch (jsonErr) {
                const fallback = generateProceduralChoreography({ brief, lyrics, duration, selectedSkill, mood, intensity });
                fallback.rawAiNotes = aiResponseText.slice(0, 500);
                fallback.modelUsed = `${modelUsed} (parsed with recovery)`;
                return res.json(fallback);
            }

        } catch (error) {
            console.error('[MOTION-STUDIO] Error in /choreograph:', error);
            const fallback = generateProceduralChoreography(req.body);
            fallback.error = error.message;
            res.status(200).json(fallback);
        }
    });

    // GET /api/motion-studio/skills
    router.get('/skills', (req, res) => {
        try {
            const skills = getAvailableSkillsSummary();
            res.json({ count: skills.length, skills });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/motion-studio/models
    router.get('/models', (req, res) => {
        res.json({
            models: [
                {
                    id: 'gemini-4-argon',
                    name: 'Gemini 4 Argon',
                    provider: 'Google Vertex AI',
                    features: ['Thinking Level: Medium', '1M Context', '3D Motion Synthesis'],
                    isConfigured: Boolean(process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_API_KEY)
                },
                {
                    id: 'claude-3-7-sonnet',
                    name: 'Claude 3.7 Sonnet',
                    provider: 'Anthropic',
                    features: ['Hybrid Reasoning', 'Visual Choreography', 'Code Architecture'],
                    isConfigured: Boolean(process.env.ANTHROPIC_API_KEY)
                },
                {
                    id: 'claude-3-5-sonnet',
                    name: 'Claude 3.5 Sonnet',
                    provider: 'Anthropic',
                    features: ['Fast Latency', 'High Precision Instruction Following'],
                    isConfigured: Boolean(process.env.ANTHROPIC_API_KEY)
                },
                {
                    id: 'gpt-4o',
                    name: 'OpenAI GPT-4o',
                    provider: 'OpenAI',
                    features: ['Multimodal Audio & Vision', 'Structured Scene Generation'],
                    isConfigured: Boolean(process.env.OPENAI_API_KEY)
                }
            ]
        });
    });

    return router;
}
