import express from 'express';
import fs from 'fs';
import { analyzeWardrobeRoute, wardrobeUploadMiddleware } from '../../services/wardrobeAnalyzerService.js';
import { analyzeLocationRoute, locationUploadMiddleware } from '../../services/locationAnalyzerService.js';
import * as productService from '../../services/productService.js';
import * as moodBoardService from '../../services/moodBoardService.js';
import * as masterExportService from '../../services/masterExportService.js';
import { fetchAllowedProxyResource } from '../utils/safeProxy.js';
import { isValidUuid } from '../utils/validateUuid.js';

export default function createRouter(deps) {
    const router = express.Router();
    const {
        consumeCredits,
        claimOrCreateSpend,
        getVertexToken,
        upload,
        getGeminiClient,
        client,
        geminiService,
        broadcastProgress,
        broadcastComplete,
        findVideoInResponse,
        handleGoogle,
        supabase,
        VERTEX_PROJECT_ID,
        VERTEX_LOCATIONEarly = 'us-central1',
        uploadVideoToSupabase,
        LOCAL_ASSETS_FILE,
        resolveGoogleApiKey,
        requireAuth
    } = deps;

    const VERTEX_LOCATION = deps.VERTEX_LOCATION || VERTEX_LOCATIONEarly;

    // --- UGC / VIDEO ENDPOINTS ---
    router.post('/video', async (req, res) => {
        try {
            const { image, script, bible, userId, duration, resolution, model, aspect_ratio } = req.body;
            // Get credentials
            const vertexToken = await getVertexToken();
            const apiKey = await resolveGoogleApiKey(req, userId, true);
            if (!vertexToken && !apiKey) {
                throw new Error('Failed to acquire service account token or API key for Veo');
            }

            const requestedDuration = parseInt(String(duration).replace(/\D/g, '')) || 6;
            const durationSecs = [4, 6, 8].includes(requestedDuration) ? requestedDuration : 6;
            const validAspectRatio = aspect_ratio || "9:16";

            // Convert image to base64 if it's a URL
            let imageBase64, imageMime;
            if (image.startsWith('data:')) {
                const [meta, data] = image.split(',');
                imageBase64 = data;
                imageMime = meta.split(':')[1]?.split(';')[0] || 'image/png';
            } else {
                console.log(`[Video API] Fetching image from URL: ${image.substring(0, 80)}...`);
                const imgResp = await fetch(image);
                if (!imgResp.ok) throw new Error(`Failed to fetch image: ${imgResp.status}`);
                const imgBuffer = await imgResp.arrayBuffer();
                imageMime = imgResp.headers.get('content-type') || 'image/png';
                imageBase64 = Buffer.from(imgBuffer).toString('base64');
            }

            const payload = {
                instances: [{
                    prompt: script,
                    image: { bytesBase64Encoded: imageBase64, mimeType: imageMime }
                }],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: validAspectRatio,
                    durationSeconds: durationSecs,
                }
            };

            let videoBuffer = null;
            let success = false;

            // --- Option A: Vertex AI (First Preference) ---
            if (vertexToken) {
                try {
                    let modelName = 'veo-3.1-generate-001';
                    if (model === 'veo-fast' || model === 'veo_fast') {
                        modelName = 'veo-3.1-fast-generate-001';
                    } else if (model === 'veo-lite' || model === 'veo_lite') {
                        modelName = 'veo-3.1-lite-generate-001';
                    }
                    const url = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${modelName}:predictLongRunning`;
                    console.log(`[Video API] [Vertex AI] Calling model ${modelName} on url: ${url}`);
                    
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${vertexToken}`
                        },
                        body: JSON.stringify(payload)
                    });
                    
                    const initialData = await response.json();
                    if (initialData.error) throw new Error(initialData.error.message);
                    
                    const operationName = initialData.name;
                    if (!operationName) throw new Error('No operation name returned from Vertex AI');

                    const pollPath = operationName.includes('/') ? operationName : `projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/operations/${operationName}`;
                    console.log(`[Video API] [Vertex AI] Operation created: ${operationName}. Polling...`);

                    let done = false;
                    let resultData = null;
                    let attempts = 0;
                    const maxAttempts = 60; // 5-6 minutes

                    while (!done && attempts < maxAttempts) {
                        await new Promise(r => setTimeout(r, 6000));
                        attempts++;

                        const pollUrl = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/${pollPath}`;
                        const pollResponse = await fetch(pollUrl, {
                            headers: { 'Authorization': `Bearer ${vertexToken}` }
                        });
                        if (pollResponse.status === 404) {
                            console.log(`[Video API] Operation not propagated yet (404). Waiting...`);
                            continue;
                        }
                        const pollData = await pollResponse.json();
                        if (pollData.error) throw new Error(pollData.error.message);
                        if (pollData.done) {
                            resultData = pollData.response;
                            done = true;
                        }
                        if (attempts % 3 === 0) {
                            console.log(`[Video API] [Vertex AI] Polling... attempt ${attempts}`);
                        }
                    }

                    if (!done) throw new Error('Vertex AI video generation timed out');

                    // Extract video bytes directly or download if a URI is returned
                    const b64 = resultData?.predictions?.[0]?.bytesBase64Encoded;
                    if (b64) {
                        videoBuffer = Buffer.from(b64, 'base64');
                        success = true;
                        console.log(`[Video API] [Vertex AI] Video generated successfully via base64 predictions (${videoBuffer.length} bytes)`);
                    } else {
                        const videoUri = resultData?.generatedVideos?.[0]?.video?.uri || resultData?.predictions?.[0]?.uri;
                        if (videoUri) {
                            const downloadUrl = `${videoUri}&key=${vertexToken}`;
                            const videoResp = await fetch(downloadUrl);
                            if (videoResp.ok) {
                                videoBuffer = Buffer.from(await videoResp.arrayBuffer());
                                success = true;
                                console.log(`[Video API] [Vertex AI] Video downloaded successfully via URI (${videoBuffer.length} bytes)`);
                            }
                        }
                    }
                } catch (vertexErr) {
                    console.warn(`[Video API] [Vertex AI] Failed. Error: ${vertexErr.message}. Falling back to Google AI Studio...`);
                    if (apiKey === 'VERTEX_AI_CLIENT') {
                        throw vertexErr;
                    }
                }
            }

            // --- Option B: Google AI Studio / Gemini API (Fallback) ---
            if (!success && apiKey && apiKey !== 'VERTEX_AI_CLIENT') {
                try {
                    let aiStudioModelName = 'veo-3.1-generate-preview';
                    if (model === 'veo-fast' || model === 'veo_fast') {
                        aiStudioModelName = 'veo-3.1-fast-generate-preview';
                    } else if (model === 'veo-lite' || model === 'veo_lite') {
                        aiStudioModelName = 'veo-3.1-lite-generate-preview';
                    }
                    let url = `https://generativelanguage.googleapis.com/v1beta/models/${aiStudioModelName}:predictLongRunning`;
                    let headers = { 'Content-Type': 'application/json' };
                    if (apiKey) {
                        url += `?key=${apiKey}`;
                        console.log(`[Video API] [AI Studio] Calling model ${aiStudioModelName} via API Key`);
                    } else {
                        headers['Authorization'] = `Bearer ${vertexToken}`;
                        console.log(`[Video API] [AI Studio] Calling model ${aiStudioModelName} via Service Account token`);
                    }

                    const response = await fetch(url, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(payload)
                    });

                    const initialData = await response.json();
                    if (initialData.error) throw new Error(initialData.error.message);

                    const operationName = initialData.name;
                    if (!operationName) throw new Error('No operation name returned from Google AI Studio');

                    console.log(`[Video API] [AI Studio] Operation created: ${operationName}. Polling...`);

                    let done = false;
                    let resultData = null;
                    let attempts = 0;
                    const maxAttempts = 60;

                    while (!done && attempts < maxAttempts) {
                        await new Promise(r => setTimeout(r, 6000));
                        attempts++;

                        let pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}`;
                        let pollHeaders = {};
                        if (apiKey) {
                            pollUrl += `?key=${apiKey}`;
                        } else {
                            pollHeaders['Authorization'] = `Bearer ${vertexToken}`;
                        }

                        const pollResponse = await fetch(pollUrl, { headers: pollHeaders });
                        const pollData = await pollResponse.json();
                        if (pollData.error) throw new Error(pollData.error.message);
                        if (pollData.done) {
                            resultData = pollData;
                            done = true;
                        }
                        if (attempts % 3 === 0) {
                            console.log(`[Video API] [AI Studio] Polling... attempt ${attempts}`);
                        }
                    }

                    if (!done) throw new Error('Google AI Studio video generation timed out');

                    // Use findVideoInResponse helper
                    const videoObj = findVideoInResponse(resultData);
                    if (videoObj) {
                        const videoUri = videoObj.uri;
                        if (videoUri) {
                            let downloadUrl = videoUri;
                            let downloadHeaders = {};
                            if (apiKey) {
                                downloadUrl += `&key=${apiKey}`;
                            } else {
                                downloadHeaders['Authorization'] = `Bearer ${vertexToken}`;
                            }
                            const videoResp = await fetch(downloadUrl, { headers: downloadHeaders });
                            if (videoResp.ok) {
                                videoBuffer = Buffer.from(await videoResp.arrayBuffer());
                                success = true;
                                console.log(`[Video API] [AI Studio] Video generated and downloaded successfully (${videoBuffer.length} bytes)`);
                            }
                        }
                    }
                } catch (studioErr) {
                    console.error(`[Video API] [AI Studio] Failed. Error: ${studioErr.message}`);
                    throw new Error(`Video generation failed on both Vertex AI and Google AI Studio: ${studioErr.message}`);
                }
            }

            if (!success || !videoBuffer) {
                throw new Error('Video generation failed to return valid video buffer.');
            }

            let videoUrl = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;

            if (uploadVideoToSupabase) {
                console.log(`[Video API] Uploading generated video to GCS/Supabase for user: ${userId || 'anon'}`);
                try {
                    videoUrl = await uploadVideoToSupabase(videoBuffer, userId, validAspectRatio);
                } catch (uploadErr) {
                    console.warn('[Video API] Failed to upload generated video to GCS/Supabase, falling back to data URL:', uploadErr.message);
                }
            }

            console.log(`[Video API] Success - video generated (${videoBuffer.byteLength} bytes)`);
            res.json({ url: videoUrl });
        } catch (error) {
            console.error('[Video API] Error:', error);
            res.status(error.status || 500).json({ error: error.message || 'Connection error', details: error.stack });
        }
    });

    // UGC speech
    router.post('/speech', async (req, res) => {
        try {
            const {
                text, voice = 'Kore',
                multiSpeaker = false,
                host1Voice = 'Aoede', host2Voice = 'Puck',
                host1Name = 'Speaker 1', host2Name = 'Speaker 2',
                podcastScene = '', podcastDirectorNote = '',
            } = req.body;
            if (!text) return res.status(400).json({ error: 'No text provided' });

            const allowedVoices = [
                'achernar', 'achird', 'algenib', 'algieba', 'alnilam', 'aoede', 'autonoe', 
                'callirrhoe', 'charon', 'despina', 'enceladus', 'erinome', 'fenrir', 
                'gacrux', 'iapetus', 'kore', 'laomedeia', 'leda', 'orus', 'puck', 
                'pulcherrima', 'rasalgethi', 'sadachbia', 'sadaltager', 'schedar', 
                'sulafat', 'umbriel', 'vindemiatrix', 'zephyr', 'zubenelgenubi'
            ];

            const apiKey = await resolveGoogleApiKey(req, req.body.userId);
            const gemini = getGeminiClient(apiKey);

            if (multiSpeaker) {
                const s1 = host1Name || 'Speaker 1';
                const s2 = host2Name || 'Speaker 2';
                
                const v1Raw = (host1Voice || 'aoede').toLowerCase();
                const v2Raw = (host2Voice || 'puck').toLowerCase();
                
                const v1 = allowedVoices.includes(v1Raw) ? v1Raw : 'aoede';
                const v2 = allowedVoices.includes(v2Raw) ? v2Raw : 'puck';

                const transcript = text
                    .replace(/HOST 1\s*:/gi, `${s1}:`)
                    .replace(/HOST 2\s*:/gi, `${s2}:`)
                    .trim();

                const sceneBlock = podcastScene
                    ? `## THE SCENE\n${podcastScene}`
                    : `## THE SCENE\nA professional podcast studio with warm lighting, microphones, and a relaxed conversational atmosphere.`;

                const directorBlock = podcastDirectorNote
                    ? `### DIRECTOR'S NOTES\n${podcastDirectorNote}`
                    : `### DIRECTOR'S NOTES\nStyle: Natural, conversational, and engaging.\nPace: Relaxed but energetic. Allow natural pauses between speakers.\nTone: Warm, authentic, friendly banter between two hosts.`;

                const structuredPrompt = `# AUDIO PROFILE
## Host Cast
- ${s1} (Speaker 1): Engaging podcast host with a natural, warm delivery.
- ${s2} (Speaker 2): Co-host bringing energy, reactions, and follow-up questions.

${sceneBlock}

${directorBlock}

### TRANSCRIPT
${transcript}`;

                console.log(`[UGC-SPEECH] Multi-speaker TTS — s1: ${s1}, s2: ${s2}, text length: ${text?.length || 0}`);
                console.log(`[UGC-SPEECH] Structured prompt: ${structuredPrompt.substring(0, 300)}...`);

                const result = await gemini.models.generateContent({
                    model: 'gemini-3.1-flash-tts-preview',
                    contents: [{ role: 'user', parts: [{ text: structuredPrompt }] }],
                    config: {
                        safetySettings: [
                            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                        ],
                        responseModalities: ['AUDIO'],
                        speechConfig: {
                            multiSpeakerVoiceConfig: {
                                speakerVoiceConfigs: [
                                    {
                                        speaker: s1,
                                        voiceConfig: { prebuiltVoiceConfig: { voiceName: v1 } },
                                    },
                                    {
                                        speaker: s2,
                                        voiceConfig: { prebuiltVoiceConfig: { voiceName: v2 } },
                                    },
                                ],
                            },
                        },
                    },
                });

                const candidate = result.candidates?.[0];
                const audioData = candidate?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
                if (!audioData) {
                    const finishReason = candidate?.finishReason || 'UNKNOWN';
                    const safetyRatings = candidate?.safetyRatings ? JSON.stringify(candidate.safetyRatings) : 'N/A';
                    throw new Error(`Multi-speaker TTS failed — no audio returned. FinishReason: ${finishReason}, SafetyRatings: ${safetyRatings}`);
                }
                return res.json({ audio: `data:audio/wav;base64,${audioData}` });
            }

            const voiceRaw = (voice || 'kore').toLowerCase();
            const voiceName = allowedVoices.includes(voiceRaw) ? voiceRaw : 'kore';
            console.log(`[UGC-SPEECH] Single-speaker TTS — voice: ${voiceName}, text: "${text.substring(0, 200)}${text.length > 200 ? '...' : ''}"`);

            const result = await gemini.models.generateContent({
                model: 'gemini-2.5-flash-preview-tts',
                contents: [{ role: 'user', parts: [{ text }] }],
                config: {
                    safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                    ],
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName },
                        },
                    },
                },
            });

            const candidate = result.candidates?.[0];
            const audioData = candidate?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
            if (!audioData) {
                const finishReason = candidate?.finishReason || 'UNKNOWN';
                const safetyRatings = candidate?.safetyRatings ? JSON.stringify(candidate.safetyRatings) : 'N/A';
                throw new Error(`Speech synthesis failed — no audio returned. FinishReason: ${finishReason}, SafetyRatings: ${safetyRatings}`);
            }

            res.json({ audio: `data:audio/wav;base64,${audioData}` });
        } catch (error) {
            console.error('UGC Speech Error:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // Voice analysis
    const SUPPORTED_AUDIO_MIMES = new Set([
        'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/wave', 'audio/x-wav',
        'audio/ogg', 'audio/flac', 'audio/aac', 'audio/m4a', 'audio/x-m4a',
        'audio/webm', 'video/mp4', 'video/webm', 'video/quicktime',
    ]);

    router.post('/analyze-voice', upload.single('audio'), async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ error: 'No audio file uploaded' });

            const rawMime = req.file.mimetype || 'audio/mpeg';
            const mimeType = rawMime === 'audio/mp4' ? 'video/mp4'
                : rawMime === 'audio/x-m4a' ? 'audio/m4a'
                : rawMime;

            if (!SUPPORTED_AUDIO_MIMES.has(mimeType)) {
                return res.status(415).json({ error: `Unsupported file type: ${mimeType}. Upload MP3, WAV, M4A, OGG, FLAC, or MP4.` });
            }

            const audioBase64 = req.file.buffer.toString('base64');
            const apiKey = await resolveGoogleApiKey(req, req.body.userId);
            const gemini = getGeminiClient(apiKey);

            const audioPart = { inlineData: { mimeType, data: audioBase64 } };

            console.log(`[UGC-VOICE] Transcribing ${req.file.originalname} (${mimeType}, ${(req.file.size / 1024).toFixed(0)} KB)`);
            const transcribeResult = await gemini.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [audioPart, { text: 'Transcribe this audio exactly as spoken. Output only the transcript text, no labels or formatting.' }] }],
            });
            const transcript = transcribeResult.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

            console.log(`[UGC-VOICE] Transcript (${transcript.length} chars) — extracting style…`);
            const styleResult = await gemini.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{
                    role: 'user',
                    parts: [
                        audioPart,
                        {
                            text: `You are a voice coach analysing a speaker's unique delivery style.

Listen to the recording and return a single compact paragraph (max 70 words) describing:
1. Pace & rhythm (fast / slow / varied, pauses, rushing)
2. Tone & energy (warm, dry, enthusiastic, calm, sarcastic, etc.)
3. Sentence structure (short punchy lines, run-ons, filler words like "like", "you know", "right")
4. Any distinctive accent, slang, or verbal habits

Output ONLY the style description — no preamble, no headings.`,
                        },
                    ],
                }],
            });
            const style = styleResult.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

            if (!transcript && !style) {
                return res.status(422).json({ error: 'Could not extract content from audio — ensure the file contains clear speech.' });
            }

            console.log(`[UGC-VOICE] Done — transcript: ${transcript.slice(0, 60)}… | style: ${style.slice(0, 60)}…`);
            res.json({ transcript, style });
        } catch (error) {
            console.error('[UGC-VOICE] Error:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // Generate Hook
    router.post('/generate-hook', async (req, res) => {
        try {
            const { characterName, niche, hookStyle, script } = req.body;
            broadcastProgress('ugc-hook', 1, 3, 'Generating viral hook script...');

            const result = await client.models.generateContent({
                model: 'gemini-2.5-flash',
                config: { responseMimeType: "application/json" },
                contents: [{
                    role: 'user',
                    parts: [{
                        text: `You are a viral UGC content strategist. Generate a hook script for a ${niche} creator named ${characterName}.

HOOK STYLE: ${hookStyle}
${script ? `USER DIRECTION: ${script}` : ''}

Generate a JSON response:
{
  "hookScript": "The actual 2-3 sentence hook script (punchy, attention-grabbing)",
  "hookType": "PATTERN_INTERRUPT | QUESTION | SHOCKING_STAT | STORY_OPENER",
  "estimatedDuration": <seconds>,
  "captionHook": "A 5-word caption version for overlay"
}

Return ONLY valid JSON.`
                    }]
                }]
            });

            const text = result.text?.() ?? result.response?.text?.() ?? '';
            let hookData;
            try {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                hookData = JSON.parse(jsonMatch[0]);
            } catch {
                hookData = { hookScript: script || 'Hey, you need to see this...', hookType: hookStyle, estimatedDuration: 3, captionHook: 'Watch This Now' };
            }

            broadcastProgress('ugc-hook', 3, 3, 'Hook script generated!');
            broadcastComplete('ugc-hook');
            res.json(hookData);
        } catch (error) {
            console.error('UGC Hook Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Generate Avatar
    router.post('/generate-avatar', async (req, res) => {
        try {
            const { characterName, script, style, ratio } = req.body;
            broadcastProgress('ugc-avatar', 1, 3, 'Composing avatar render prompt...');

            const prompt = `CINEMATIC UGC PORTRAIT: ${characterName} speaking directly to camera in a ${style} style. Expression is engaging and authentic. ${ratio === '9:16' ? 'Vertical/portrait orientation' : 'Landscape orientation'}. The character appears to be saying: "${script}". Professional lighting, shallow depth of field, social media ready.`;

            broadcastProgress('ugc-avatar', 2, 3, 'Rendering avatar frame...');

            const result = await geminiService.generateCharacterImage({
                prompt,
                identity_images: [],
                aspectRatio: ratio || '9:16'
            });

            broadcastProgress('ugc-avatar', 3, 3, 'Avatar rendered!');
            broadcastComplete('ugc-avatar');
            res.json({ image: result, style });
        } catch (error) {
            console.error('UGC Avatar Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Generate Captions
    router.post('/generate-captions', async (req, res) => {
        try {
            const { script, style } = req.body;
            broadcastProgress('ugc-captions', 1, 2, 'Generating caption overlays...');

            const aiResp = await client.models.generateContent({
                model: 'gemini-2.5-flash',
                config: { responseMimeType: "application/json" },
                contents: [{
                    role: 'user',
                    parts: [{
                        text: `You are a UGC caption designer. Break this script into caption segments for a ${style} overlay style.

SCRIPT: "${script}"
STYLE: ${style}

Generate JSON:
{
  "captions": [
    { "text": "caption text", "startTime": 0.0, "endTime": 1.5, "emphasis": "NORMAL | BOLD | HIGHLIGHT" }
  ],
  "totalDuration": <number>,
  "style": "${style}"
}

Return ONLY valid JSON.`
                    }]
                }]
            });

            const text = aiResp.text?.() ?? aiResp.response?.text?.() ?? '';
            let captionData;
            try {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                captionData = JSON.parse(jsonMatch[0]);
            } catch {
                captionData = { captions: [{ text: script, startTime: 0, endTime: 3, emphasis: 'BOLD' }], totalDuration: 3, style };
            }

            broadcastProgress('ugc-captions', 2, 2, 'Captions generated!');
            broadcastComplete('ugc-captions');
            res.json(captionData);
        } catch (error) {
            console.error('UGC Captions Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Batch hooks
    router.post('/generate-hooks-batch', async (req, res) => {
        try {
            const { synergy, niche, tone, directive } = req.body;
            console.log(`[SERVER] Generating batch hooks for re-ranking...`);
            const hooks = await geminiService.generateCandidateHooks(synergy, niche, tone, directive);
            res.json({ hooks });
        } catch (error) {
            console.error('Batch Hooks Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Ad Engine
    router.post('/ad-engine', async (req, res) => {
        try {
            const {
                characterImage,
                productImage,
                characterMetadata,
                productMetadata,
                niche,
                tone,
                directive,
                trainingContext,
                userId
            } = req.body;

            if (!characterImage || !productImage) throw new Error("Missing character or product image");

            const taskId = `ugc-engine-${Date.now()}`;
            broadcastProgress(taskId, 1, 4, 'Analyzing influencer + product synergy...');

            const apiKey = await resolveGoogleApiKey(req, userId);
            const synergy = await geminiService.analyzeUGCContext(characterImage, productImage, { characterMetadata, productMetadata }, apiKey);
            broadcastProgress(taskId, 2, 4, 'Generating viral ad script...');

            const script = await geminiService.generateUGCScript(synergy, niche || synergy.recommendedNiche, tone || synergy.suggestedTone, directive, trainingContext, apiKey);
            broadcastProgress(taskId, 3, 4, 'Finalizing ad structure...');

            broadcastComplete(taskId);
            res.json({ synergy, script });
        } catch (error) {
            console.error('UGC Ad Engine Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Compile Ad
    router.post('/compile-ad', async (req, res) => {
        try {
            const { script, sceneVideos, bgMusicPath, nodeId } = req.body;
            if (!script || !sceneVideos || !sceneVideos.length) {
                throw new Error("Missing script or scene videos for compilation");
            }

            const taskId = `ugc-export-${nodeId || Date.now()}`;

            masterExportService.compileUGCAd(
                taskId,
                script,
                sceneVideos,
                bgMusicPath,
                (step, total, message) => {
                    broadcastProgress(taskId, step, total, message);
                }
            ).then(result => {
                broadcastComplete(taskId, { url: result.url, filename: result.filename });
            }).catch(err => {
                console.error(`[SERVER] Export Task ${taskId} failed:`, err);
                broadcastProgress(taskId, 0, 0, `Export Failed: ${err.message}`);
            });

            res.json({ success: true, taskId });
        } catch (error) {
            console.error('UGC Compile Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Product Analysis
    router.post('/analyze-product', async (req, res) => {
        const safeBody = (req.body && typeof req.body === 'object') ? req.body : {};
        const nodeId = safeBody.nodeId ?? Date.now();
        const taskId = `product - analysis - ${nodeId} `;
        try {
            const image = safeBody.image ?? '';
            if (!image || typeof image !== 'string') {
                return res.status(400).json({ error: 'Missing Product Image in payload' });
            }

            broadcastProgress(taskId, 1, 3, 'Processing product image...');
            const productData = await productService.analyzeProductItem(image, (step, total, msg) => {
                broadcastProgress(taskId, step, total, msg);
            });

            broadcastProgress(taskId, 3, 3, 'Analysis complete!');
            broadcastComplete(taskId);
            res.json(productData);
        } catch (error) {
            console.error('Product Analysis Error:', error);
            if (taskId) {
                try { broadcastProgress(taskId, 0, 0, `Analysis failed: ${error.message} `); } catch (e) { }
            }
            res.status(500).json({
                error: 'Product analysis failed',
                message: error.message || 'Unknown error during product analysis'
            });
        }
    });

    // Wardrobe Analysis
    router.post('/wardrobe/analyze', wardrobeUploadMiddleware, analyzeWardrobeRoute);

    // Location Analysis
    router.post('/analyze-location', locationUploadMiddleware, analyzeLocationRoute);

    // Mood board analysis
    router.post('/analyze-mood', async (req, res) => {
        try {
            const { images } = req.body;
            if (!images || !Array.isArray(images) || images.length === 0) {
                return res.status(400).json({ error: 'Missing reference images for mood analysis' });
            }

            console.log(`[SERVER] Analyzing Mood Board with ${images.length} images...`);

            const imageParts = images.map(img => {
                const match = img.match(/^data:([^;]+);base64,/);
                const mimeType = match ? match[1] : 'image/jpeg';
                const data = img.replace(/^data:image\/\w+;base64,/, '');
                return { inlineData: { data, mimeType } };
            });

            const result = await moodBoardService.analyzeMood(imageParts);
            res.json(result);
        } catch (error) {
            console.error('Mood Analysis Error:', error);
            res.status(500).json({
                error: 'Mood analysis failed',
                message: error.message || 'Unknown error during mood analysis'
            });
        }
    });

    // UGC assets fetch
    router.get('/assets/:userId', async (req, res) => {
        try {
            let { userId } = req.params;
            if (!userId || userId === 'null' || userId === 'undefined' || userId === '') {
                userId = 'local_user';
            }

            let dbData = [];
            if (supabase && isValidUuid(userId)) {
                try {
                    const { data, error } = await supabase
                        .from('assets')
                        .select('*')
                        .eq('user_id', userId)
                        .order('created_at', { ascending: false });
                    if (error) throw error;
                    dbData = data || [];
                } catch (sbErr) {
                    console.warn('[UGC-DB] Supabase fetch assets failed:', sbErr.message);
                }
            }

            // Always read and merge local JSON database
            const localAssets = [];
            try {
                if (LOCAL_ASSETS_FILE && fs.existsSync(LOCAL_ASSETS_FILE)) {
                    const fileAssets = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf8'));
                    fileAssets.forEach(a => {
                        if (a.user_id === userId) {
                            localAssets.push(a);
                        }
                    });
                }
            } catch (e) {
                console.error('[UGC-LOCAL-DB] Failed to read local fallback:', e.message);
            }

            const merged = [...localAssets, ...dbData];
            const uniqueUrls = new Set();
            const uniqueAssets = merged.filter(a => {
                if (!a.url) return false;
                if (a.type === 'marketing_template' || a.type === 'reference_upload') return false;
                if (uniqueUrls.has(a.url)) return false;
                uniqueUrls.add(a.url);
                return true;
            });

            // Sort unique assets by created_at descending (newest first)
            uniqueAssets.sort((x, y) => {
                const tx = x.created_at ? new Date(x.created_at).getTime() : 0;
                const ty = y.created_at ? new Date(y.created_at).getTime() : 0;
                return ty - tx;
            });

            res.json({ assets: uniqueAssets });
        } catch (error) {
            console.error('Fetch UGC Assets Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Proxy Image (Bypass CORS for R2 images in client)
    router.get('/proxy-image', async (req, res) => {
        try {
            const url = req.query.url;
            if (!url) return res.status(400).json({ error: 'URL is required' });

            const { buffer, contentType } = await fetchAllowedProxyResource(url);
            res.setHeader('Content-Type', contentType);
            res.send(buffer);
        } catch (error) {
            console.error('[UGC API] Get Proxy Image Error:', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    });

    router.post('/proxy-image', async (req, res) => {
        try {
            const { url } = req.body;
            if (!url) return res.status(400).json({ error: 'URL is required' });

            const { buffer, contentType } = await fetchAllowedProxyResource(url);
            const b64 = buffer.toString('base64');
            
            res.json({ base64: b64, mimeType: contentType });
        } catch (error) {
            console.error('[UGC API] Proxy Image Error:', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    });

    // UGC preview scene (fuses Character + Product, then animates with Veo)
    router.post('/preview-scene', async (req, res) => {
        const { characterImage, productImage, scene, analysis, aspectRatio = '9:16', duration = 6, nodeId, userId } = req.body;
        const taskId = nodeId ? `ugc-preview-${nodeId}` : 'ugc-preview';
        let user;
        try {
            user = await requireAuth(req);
        } catch (_) {}
        const targetUserId = user ? user.id : userId;

        try {
            if (!characterImage || !productImage) {
                return res.status(400).json({ error: 'Character and product images are required.' });
            }

            broadcastProgress(taskId, 1, 3, 'Synthesizing scene keyframe...');
            console.log(`[UGC-PREVIEW] STEP 1 — Keyframe generation for scene: ${scene?.time || 'N/A'}`);

            const keyframePrompt = [
                scene?.action || scene?.visuals || 'Character holding product confidently',
                analysis?.synergy ? `Context: ${analysis.synergy}` : '',
                analysis?.characterTraits?.length ? `Character traits: ${analysis.characterTraits.join(', ')}` : '',
                'The subject is physically interacting with the product. Professional photography, photorealistic, editorial quality, sharp focus.'
            ].filter(Boolean).join('. ');

            const toImagePart = async (imgStr) => {
                if (!imgStr) return null;
                if (imgStr.startsWith('data:')) {
                    const [meta, b64] = imgStr.split(',');
                    const mime = meta.split(':')[1]?.split(';')[0] || 'image/png';
                    return { inlineData: { data: b64, mimeType: mime } };
                }
                if (imgStr.startsWith('http') || imgStr.startsWith('//')) {
                    const fullUrl = imgStr.startsWith('//') ? `https:${imgStr}` : imgStr;
                    const r = await fetch(fullUrl);
                    const buf = await r.arrayBuffer();
                    const b64 = Buffer.from(buf).toString('base64');
                    const mime = r.headers.get('content-type') || 'image/png';
                    return { inlineData: { data: b64, mimeType: mime } };
                }
                return { inlineData: { data: imgStr, mimeType: 'image/png' } };
            };

            const charPart = await toImagePart(characterImage);
            const prodPart = await toImagePart(productImage);

            const imageParts = [charPart, prodPart].filter(Boolean);

            const withRetry = async (fn, retries = 3, delay = 2000) => {
                try {
                    const res = await fn();
                    if (res.status === 429 || res.status === 503 || res.status === 500) {
                        if (retries > 0) {
                            await new Promise(r => setTimeout(r, delay));
                            return withRetry(fn, retries - 1, delay * 2);
                        }
                    }
                    if (res.error && (res.error.code === 429 || res.error.message?.includes('quota'))) {
                        if (retries > 0) {
                            await new Promise(r => setTimeout(r, delay));
                            return withRetry(fn, retries - 1, delay * 2);
                        }
                    }
                    return res;
                } catch (err) {
                    if (retries > 0 && (err.message?.includes('quota') || err.message?.includes('429') || err.message?.includes('limit'))) {
                        await new Promise(r => setTimeout(r, delay));
                        return withRetry(fn, retries - 1, delay * 2);
                    }
                    throw err;
                }
            };

            const keyframeResult = await withRetry(() => client.models.generateContent({
                model: 'gemini-2.5-flash',
                config: { responseModalities: ['image', 'text'] },
                contents: [{
                    role: 'user',
                    parts: [
                        { text: keyframePrompt },
                        ...imageParts
                    ]
                }]
            }));

            const imgPart = keyframeResult.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            const keyframeUrl = imgPart ? `data:image/png;base64,${imgPart.inlineData.data}` : null;

            if (!keyframeUrl) throw new Error('Keyframe generation failed — Gemini returned no image.');

            broadcastProgress(taskId, 2, 3, 'Animating keyframe with Veo 3.1...');
            console.log(`[UGC-PREVIEW] STEP 2 — Sending keyframe to Veo I2V`);

            const motionPrompt = [
                scene?.action || 'Smooth, confident movement',
                analysis?.suggestedTone ? `Tone: ${analysis.suggestedTone}` : '',
                'Cinematic 8K quality. Photorealistic. Professional UGC ad production.'
            ].filter(Boolean).join('. ');

            const token = await getVertexToken();
            const apiKey = await resolveGoogleApiKey(req, targetUserId, true);
            if (!token && !apiKey) throw new Error('Failed to acquire service account token or API key');

            let keyframeBase64 = '';
            let keyframeMime = 'image/png';

            if (keyframeUrl.startsWith('data:')) {
                const match = keyframeUrl.match(/^data:([^;]+);base64,/);
                if (match) keyframeMime = match[1];
                keyframeBase64 = keyframeUrl.split(',')[1];
            } else if (keyframeUrl.startsWith('http')) {
                const imgResp = await fetch(keyframeUrl);
                const buffer = await imgResp.arrayBuffer();
                keyframeBase64 = Buffer.from(buffer).toString('base64');
                const ct = imgResp.headers.get('content-type');
                if (ct) keyframeMime = ct;
            } else {
                keyframeBase64 = keyframeUrl;
            }

            const requestedDuration = parseInt(duration) || 6;
            const validDuration = [4, 6, 8].includes(requestedDuration) ? requestedDuration : 6;
            const validAspectRatio = ['16:9', '9:16', '1:1'].includes(aspectRatio) ? aspectRatio : '9:16';

            const payload = {
                instances: [{
                    prompt: motionPrompt,
                    image: { bytesBase64Encoded: keyframeBase64, mimeType: keyframeMime }
                }],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: validAspectRatio,
                    durationSeconds: validDuration
                }
            };

            let videoBuffer = null;
            let success = false;

            // --- Option A: Vertex AI (First Preference) ---
            if (token) {
                try {
                    const veoModel = 'veo-3.1-generate-001';
                    const veoEndpoint = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${veoModel}:predictLongRunning`;
                    console.log(`[UGC-PREVIEW] [Vertex AI] Calling model ${veoModel} on url: ${veoEndpoint}`);

                    const veoInitResp = await withRetry(() => fetch(veoEndpoint, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(payload)
                    }));
                    const operation = await veoInitResp.json();

                    if (operation.error) {
                        throw new Error(operation.error.message || 'Veo I2V initiation failed on Vertex AI');
                    }

                    const operationName = operation.name;
                    if (!operationName) throw new Error('No operation name returned from Vertex AI');

                    broadcastProgress(taskId, 3, 3, 'Rendering video (Service Account)...');

                    const pollPath = operationName.includes('/') ? operationName : `projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/operations/${operationName}`;
                    let attempts = 0;
                    const maxAttempts = 60;
                    let done = false;
                    let resultData = null;

                    while (!done && attempts < maxAttempts) {
                        await new Promise(r => setTimeout(r, 6000));
                        attempts++;

                        const pollUrl = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/${pollPath}`;
                        const pollResp = await fetch(pollUrl, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (pollResp.status === 404) {
                            console.log(`[UGC-PREVIEW] Operation not propagated yet (404). Waiting...`);
                            continue;
                        }
                        const opStatus = await pollResp.json();

                        if (opStatus.error) throw new Error(opStatus.error.message);
                        if (opStatus.done) {
                            resultData = opStatus.response;
                            done = true;
                        }
                        if (attempts % 3 === 0) {
                            console.log(`[UGC-PREVIEW] [Vertex AI] Polling... attempt ${attempts}`);
                        }
                    }

                    if (!done) throw new Error('Vertex AI video generation timed out');

                    // Extract bytes directly or download via GCS URI
                    const b64 = resultData?.predictions?.[0]?.bytesBase64Encoded;
                    if (b64) {
                        videoBuffer = Buffer.from(b64, 'base64');
                        success = true;
                        console.log(`[UGC-PREVIEW] [Vertex AI] Video generated successfully via base64 predictions (${videoBuffer.length} bytes)`);
                    } else {
                        const videoUri = resultData?.generatedVideos?.[0]?.video?.uri || resultData?.predictions?.[0]?.uri;
                        if (videoUri) {
                            const downloadUrl = `${videoUri}&key=${token}`;
                            const videoResp = await fetch(downloadUrl);
                            if (videoResp.ok) {
                                videoBuffer = Buffer.from(await videoResp.arrayBuffer());
                                success = true;
                                console.log(`[UGC-PREVIEW] [Vertex AI] Video downloaded successfully via URI (${videoBuffer.length} bytes)`);
                            }
                        }
                    }
                } catch (vertexErr) {
                    console.warn(`[UGC-PREVIEW] [Vertex AI] Failed. Error: ${vertexErr.message}. Falling back to Google AI Studio...`);
                    if (apiKey === 'VERTEX_AI_CLIENT') {
                        throw vertexErr;
                    }
                }
            }

            // --- Option B: Google AI Studio / Gemini API (Fallback) ---
            if (!success && apiKey && apiKey !== 'VERTEX_AI_CLIENT') {
                try {
                    const veoModel = 'veo-3.1-generate-preview';
                    let veoEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${veoModel}:predictLongRunning`;
                    let headers = { 'Content-Type': 'application/json' };
                    if (apiKey) {
                        veoEndpoint += `?key=${apiKey}`;
                        console.log(`[UGC-PREVIEW] [AI Studio] Calling model ${veoModel} via API Key`);
                    } else {
                        headers['Authorization'] = `Bearer ${token}`;
                        console.log(`[UGC-PREVIEW] [AI Studio] Calling model ${veoModel} via Service Account token`);
                    }

                    const veoInitResp = await withRetry(() => fetch(veoEndpoint, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(payload)
                    }));
                    const operation = await veoInitResp.json();

                    if (operation.error) {
                        throw new Error(operation.error.message || 'Veo I2V initiation failed on Google AI Studio');
                    }

                    broadcastProgress(taskId, 3, 3, 'Rendering video (Fallback)...');

                    const operationName = operation.name;
                    if (!operationName) throw new Error('No operation name returned from Google AI Studio');

                    let attempts = 0;
                    const maxAttempts = 60;
                    let done = false;
                    let resultData = null;

                    while (!done && attempts < maxAttempts) {
                        await new Promise(r => setTimeout(r, 6000));
                        attempts++;

                        let pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}`;
                        let pollHeaders = {};
                        if (apiKey) {
                            pollUrl += `?key=${apiKey}`;
                        } else {
                            pollHeaders['Authorization'] = `Bearer ${token}`;
                        }

                        const pollResp = await fetch(pollUrl, { headers: pollHeaders });
                        const opStatus = await pollResp.json();

                        if (opStatus.error) throw new Error(opStatus.error.message);
                        if (opStatus.done) {
                            resultData = opStatus;
                            done = true;
                        }
                        if (attempts % 3 === 0) {
                            console.log(`[UGC-PREVIEW] [AI Studio] Polling... attempt ${attempts}`);
                        }
                    }

                    if (!done) throw new Error('Google AI Studio video generation timed out');

                    const videoData = findVideoInResponse(resultData);
                    if (!videoData) {
                        throw new Error('Veo rendered but returned no video.');
                    }

                    if (videoData.videoBytes || videoData.bytesBase64Encoded) {
                        const b64 = videoData.videoBytes ? Buffer.from(videoData.videoBytes).toString('base64') : videoData.bytesBase64Encoded;
                        videoBuffer = Buffer.from(b64, 'base64');
                        success = true;
                        console.log(`[UGC-PREVIEW] [AI Studio] Video generated successfully via base64 (${videoBuffer.length} bytes)`);
                    } else if (videoData.uri) {
                        let downloadUrl = videoData.uri;
                        let downloadHeaders = {};
                        if (apiKey) {
                            downloadUrl = `${videoData.uri}&key=${apiKey}`;
                        } else {
                            downloadHeaders['Authorization'] = `Bearer ${token}`;
                        }
                        try {
                            const videoResp = await fetch(downloadUrl, { headers: downloadHeaders });
                            if (videoResp.ok) {
                                videoBuffer = Buffer.from(await videoResp.arrayBuffer());
                                success = true;
                                console.log(`[UGC-PREVIEW] [AI Studio] Video downloaded successfully via URI (${videoBuffer.length} bytes)`);
                            }
                        } catch (err) {
                            console.warn('[UGC-PREVIEW] Failed to download video from URI:', err.message);
                        }
                    }
                } catch (studioErr) {
                    console.error(`[UGC-PREVIEW] [AI Studio] Failed. Error: ${studioErr.message}`);
                    throw new Error(`Video generation failed on both Vertex AI and Google AI Studio: ${studioErr.message}`);
                }
            }

            if (!success || !videoBuffer) {
                throw new Error('Video generation failed to return valid video buffer.');
            }

            const userIdVal = req.body.userId || req.body.user_id || targetUserId;
            let finalVideoUrl = null;

            if (videoBuffer && uploadVideoToSupabase) {
                try {
                    console.log(`[UGC-PREVIEW] Uploading preview video to Supabase for user: ${userIdVal || 'anon'}`);
                    finalVideoUrl = await uploadVideoToSupabase(videoBuffer, userIdVal, validAspectRatio);
                } catch (uploadErr) {
                    console.warn('[UGC-PREVIEW] Supabase upload failed, falling back to data URL:', uploadErr.message);
                }
            }

            if (!finalVideoUrl && videoBuffer) {
                finalVideoUrl = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
            }

            if (!finalVideoUrl) throw new Error('Failed to assemble video URL.');

            broadcastProgress(taskId, 3, 3, 'Video rendered!');
            return res.json({ keyframeUrl, videoUrl: finalVideoUrl });
        } catch (error) {
            console.error('[UGC-PREVIEW] Pipeline Error:', error);
            res.status(500).json({ error: error.message || 'UGC preview pipeline failed' });
        }
    });

    // UGC Context Analysis (synergy between creator + product) / General Gemini Proxy
    router.post('/ai/analyze-ugc', async (req, res) => {
        try {
            const { parts, model, generationConfig, characterImage, productImage, characterMetadata, productMetadata, userId } = req.body;

            // If parts are provided, act as a general Gemini proxy
            if (parts && Array.isArray(parts)) {
                console.log(`[UGC AI API] Proxying general content generation: requestedModel=${model}`);
                
                // Map custom model tags to a stable, supported model name
                let mappedModel = 'gemini-2.5-flash';
                if (model) {
                    const cleanModel = String(model).toLowerCase();
                    if (cleanModel.includes('banana') || cleanModel.includes('3.1-flash')) {
                        mappedModel = 'gemini-2.5-flash';
                    } else if (cleanModel.includes('3.1-pro')) {
                        mappedModel = 'gemini-2.5-flash';
                    } else {
                        mappedModel = model;
                    }
                }
                console.log(`[UGC AI API] Mapped model to stable identifier: ${mappedModel}`);

                // Format parts to ensure strict SDK structure
                const formattedParts = parts.map(part => {
                    if (part.inlineData) {
                        return {
                            inlineData: {
                                data: part.inlineData.data,
                                mimeType: part.inlineData.mimeType
                            }
                        };
                    }
                    if (part.text) {
                        return { text: part.text };
                    }
                    if (typeof part === 'string') {
                        return { text: part };
                    }
                    return part;
                });

                const apiKey = await resolveGoogleApiKey(req, userId);
                const gemini = getGeminiClient(apiKey);
                const payload = {
                    model: mappedModel,
                    contents: [{ role: 'user', parts: formattedParts }]
                };

                if (generationConfig) {
                    payload.config = generationConfig;
                }

                const result = await gemini.models.generateContent(payload);

                let responseText = '';
                if (result.text) {
                    responseText = result.text;
                } else if (typeof result.text === 'function') {
                    responseText = result.text();
                } else if (result.response && typeof result.response.text === 'function') {
                    responseText = result.response.text();
                } else if (result.response && result.response.text) {
                    responseText = result.response.text;
                } else if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
                    responseText = result.candidates[0].content.parts[0].text;
                }

                return res.json({ text: responseText });
            }

            // Otherwise, fall back to creator + product synergy analysis
            if (!characterImage || !productImage) {
                return res.status(400).json({ error: "Missing character or product image" });
            }
            const apiKey = await resolveGoogleApiKey(req, userId);
            const synergy = await geminiService.analyzeUGCContext(characterImage, productImage, { characterMetadata, productMetadata }, apiKey);
            res.json(synergy);
        } catch (error) {
            console.error('Analyze UGC / Proxy Error:', error);

            // Detect Gemini RESOURCE_EXHAUSTED (quota/billing) errors and surface them cleanly
            const errStr = typeof error.message === 'string' ? error.message : JSON.stringify(error);
            let innerCode = null;
            try {
                // The SDK wraps the API error as a JSON string inside error.message
                const outer = JSON.parse(errStr);
                const inner = typeof outer.error === 'string' ? JSON.parse(outer.error) : outer.error;
                innerCode = inner?.error?.code || inner?.code || null;
            } catch (_) { /* not JSON, ignore */ }

            if (innerCode === 429 || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('prepayment credits are depleted')) {
                return res.status(429).json({
                    error: 'AI quota exhausted. Your Gemini API prepayment credits are depleted. Please top up your balance at https://ai.studio/projects to continue using AI features.'
                });
            }

            res.status(500).json({ error: error.message });
        }
    });

    // ── Generic Text Generation (server-side, uses SDK/Service Account) ──
    router.post('/generate-text', async (req, res) => {
        try {
            const { prompt, model, responseSchema, userId, parts } = req.body;
            if (!prompt && !parts) return res.status(400).json({ error: 'prompt or parts is required' });

            const selectedModel = model || 'gemini-2.5-flash';
            console.log(`[UGC-TEXT] Server-side text generation — model: ${selectedModel}`);

            const apiKey = await resolveGoogleApiKey(req, userId);
            const gemini = getGeminiClient(apiKey);
            
            const config = {};
            if (responseSchema) {
                config.responseMimeType = 'application/json';
                config.responseSchema = responseSchema;
            }

            const result = await gemini.models.generateContent({
                model: selectedModel,
                contents: parts && Array.isArray(parts)
                    ? [{ role: 'user', parts }]
                    : [{ role: 'user', parts: [{ text: prompt }] }],
                config,
            });

            let text = '';
            if (result.text) {
                text = result.text;
            } else if (typeof result.text === 'function') {
                text = result.text();
            } else if (result.response && typeof result.response.text === 'function') {
                text = result.response.text();
            } else if (result.response && result.response.text) {
                text = result.response.text;
            } else if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
                text = result.candidates[0].content.parts[0].text;
            }

            if (!text) throw new Error('Empty response from AI');
            console.log(`[UGC-TEXT] ✅ Success`);
            return res.json({ text });
        } catch (error) {
            console.error('UGC-TEXT Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}
