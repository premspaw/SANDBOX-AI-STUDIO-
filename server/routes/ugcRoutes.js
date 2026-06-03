import express from 'express';
import fs from 'fs';
import { analyzeWardrobeRoute, wardrobeUploadMiddleware } from '../../services/wardrobeAnalyzerService.js';
import { analyzeLocationRoute, locationUploadMiddleware } from '../../services/locationAnalyzerService.js';
import * as productService from '../../services/productService.js';
import * as moodBoardService from '../../services/moodBoardService.js';
import * as masterExportService from '../../services/masterExportService.js';

export default function createRouter(deps) {
    const router = express.Router();
    const {
        consumeCredits,
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
        LOCAL_ASSETS_FILE
    } = deps;

    const VERTEX_LOCATION = deps.VERTEX_LOCATION || VERTEX_LOCATIONEarly;

    // --- UGC / VIDEO ENDPOINTS ---
    router.post('/video', async (req, res) => {
        try {
            const { image, script, bible, userId, duration, resolution, model, aspect_ratio } = req.body;
            if (!image || !script) throw new Error("Missing image or script");

            // Video synthesis is expensive
            const modelCredits = model === 'veo-fast' ? 3 : 5;
            await consumeCredits(userId, modelCredits);

            console.log(`[Video API] Starting generation: model=${model}, dur=${duration}, res=${resolution}, ratio=${aspect_ratio}`);
            console.log(`[Video API] Script preview: "${script.substring(0, 50)}..."`);
            console.log(`[Video API] Image provided: ${image ? (image.substring(0, 50) + '...') : 'NONE'}`);

            // Get OAuth2 token from service account for Vertex AI
            const vertexToken = await getVertexToken();
            if (!vertexToken) {
                throw new Error('Failed to get Vertex AI authentication token. Check GOOGLE_APPLICATION_CREDENTIALS_JSON env var.');
            }

            // Call Veo via Vertex AI using backend service account
            const modelName = (model === 'veo-fast') ? 'veo-3.1-fast-generate-preview' : 'veo-3.1-generate-preview';
            const requestedDuration = parseInt(String(duration).replace(/\D/g, '')) || 6;
            const durationSecs = [4, 6, 8].includes(requestedDuration) ? requestedDuration : 6;

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
                    aspectRatio: aspect_ratio || "9:16",
                    durationSeconds: durationSecs,
                }
            };

            const url = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${modelName}:predict`;

            console.log(`[Video API] Calling Vertex AI: ${url}`);
            const initialResponse = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${vertexToken}`
                },
                body: JSON.stringify(payload)
            });

            const initialData = await initialResponse.json();
            if (initialData.error) throw new Error(initialData.error.message);

            const operationName = initialData.name;
            if (!operationName) throw new Error('No operation name returned from Vertex AI');

            const pollPath = operationName.includes('/') ? operationName : `projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/operations/${operationName}`;

            // Poll for completion
            let done = false;
            let resultData = null;
            let attempts = 0;
            const maxAttempts = 60; // 5 minutes max

            while (!done && attempts < maxAttempts) {
                await new Promise(r => setTimeout(r, 5000));
                attempts++;

                const pollUrl = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/${pollPath}`;
                const pollResponse = await fetch(pollUrl, {
                    headers: { 'Authorization': `Bearer ${vertexToken}` }
                });
                const pollData = await pollResponse.json();
                
                if (pollData.error) throw new Error(pollData.error.message);
                if (pollData.done) {
                    resultData = pollData.response;
                    done = true;
                }
                console.log(`[Video API] Polling... attempt ${attempts}`);
            }

            if (!done) throw new Error('Video generation timed out after 5 minutes');

            const videoUri = resultData?.generatedVideos?.[0]?.video?.uri || resultData?.predictions?.[0]?.uri;
            if (!videoUri) throw new Error('No video URI in response');

            const downloadUrl = `${videoUri}&key=${vertexToken}`;
            const videoResp = await fetch(downloadUrl);
            if (!videoResp.ok) throw new Error(`Failed to download video: ${videoResp.status}`);
            
            const videoBuffer = await videoResp.arrayBuffer();
            let videoUrl = `data:video/mp4;base64,${Buffer.from(videoBuffer).toString('base64')}`;

            if (uploadVideoToSupabase) {
                console.log(`[Video API] Uploading generated video to GCS/Supabase for user: ${userId || 'anon'}`);
                try {
                    videoUrl = await uploadVideoToSupabase(Buffer.from(videoBuffer), userId, aspect_ratio || '9:16');
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

            const gemini = getGeminiClient();

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

                console.log(`[UGC-SPEECH] Multi-speaker TTS — ${s1}(${v1}) & ${s2}(${v2})`);

                const result = await gemini.models.generateContent({
                    model: 'gemini-3.1-flash-tts-preview',
                    contents: [{ role: 'user', parts: [{ text: structuredPrompt }] }],
                    config: {
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

                const audioData = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
                if (!audioData) throw new Error("Multi-speaker TTS failed — no audio returned");
                return res.json({ audio: `data:audio/wav;base64,${audioData}` });
            }

            const voiceRaw = (voice || 'kore').toLowerCase();
            const voiceName = allowedVoices.includes(voiceRaw) ? voiceRaw : 'kore';
            console.log(`[UGC-SPEECH] Single-speaker TTS — voice: ${voiceName}`);

            const result = await gemini.models.generateContent({
                model: 'gemini-2.5-flash-preview-tts',
                contents: [{ role: 'user', parts: [{ text }] }],
                config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName },
                        },
                    },
                },
            });

            const audioData = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
            if (!audioData) throw new Error("Speech synthesis failed — no audio returned");

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
            const gemini = getGeminiClient();

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
                model: 'gemini-2.0-flash',
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
                model: 'gemini-2.0-flash',
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
                trainingContext
            } = req.body;

            if (!characterImage || !productImage) throw new Error("Missing character or product image");

            const taskId = `ugc-engine-${Date.now()}`;
            broadcastProgress(taskId, 1, 4, 'Analyzing influencer + product synergy...');

            const synergy = await geminiService.analyzeUGCContext(characterImage, productImage, { characterMetadata, productMetadata });
            broadcastProgress(taskId, 2, 4, 'Generating viral ad script...');

            const script = await geminiService.generateUGCScript(synergy, niche || synergy.recommendedNiche, tone || synergy.suggestedTone, directive, trainingContext);
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
            if (supabase) {
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
    router.post('/proxy-image', async (req, res) => {
        try {
            const { url } = req.body;
            if (!url) return res.status(400).json({ error: 'URL is required' });
            
            const r = await fetch(url);
            if (!r.ok) throw new Error(`Failed to fetch image: ${r.statusText}`);
            
            const buf = await r.arrayBuffer();
            const b64 = Buffer.from(buf).toString('base64');
            const mime = r.headers.get('content-type') || 'image/jpeg';
            
            res.json({ base64: b64, mimeType: mime });
        } catch (error) {
            console.error('[UGC API] Proxy Image Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // UGC preview scene (fuses Character + Product, then animates with Veo)
    router.post('/preview-scene', async (req, res) => {
        const { characterImage, productImage, scene, analysis, aspectRatio = '9:16', duration = 6, nodeId } = req.body;
        const taskId = nodeId ? `ugc-preview-${nodeId}` : 'ugc-preview';

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
                model: 'gemini-2.0-flash',
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
            const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
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
            const veoModel = 'veo-3.1-generate-preview';
            const veoEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${veoModel}:predictLongRunning`;

            const veoBody = {
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

            const veoInitResp = await withRetry(() => fetch(veoEndpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(veoBody)
            }));
            const operation = await veoInitResp.json();

            if (operation.error) {
                console.error('[UGC-PREVIEW] Veo error:', operation.error);
                throw new Error(operation.error.message || 'Veo I2V initiation failed');
            }

            broadcastProgress(taskId, 3, 3, 'Rendering video (Service Account)...');

            const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operation.name}`;
            let attempts = 0;
            const maxAttempts = 60;
            while (attempts < maxAttempts) {
                await new Promise(r => setTimeout(r, 6000));
                attempts++;
                const pollResp = await fetch(pollUrl, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const opStatus = await pollResp.json();

                if (opStatus.done) {
                    const videoData = findVideoInResponse(opStatus);
                    if (!videoData) {
                        throw new Error('Veo rendered but returned no video.');
                    }

                    let finalVideoUrl = null;
                    let videoBuffer = null;

                    if (videoData.videoBytes || videoData.bytesBase64Encoded) {
                        const b64 = videoData.videoBytes ? Buffer.from(videoData.videoBytes).toString('base64') : videoData.bytesBase64Encoded;
                        videoBuffer = Buffer.from(b64, 'base64');
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
                                const arrayBuf = await videoResp.arrayBuffer();
                                videoBuffer = Buffer.from(arrayBuf);
                            }
                        } catch (err) {
                            console.warn('[UGC-PREVIEW] Failed to download video from URI:', err.message);
                        }
                    }

                    const userId = req.body.userId || req.body.user_id;

                    if (videoBuffer && uploadVideoToSupabase) {
                        try {
                            console.log(`[UGC-PREVIEW] Uploading preview video to Supabase for user: ${userId || 'anon'}`);
                            finalVideoUrl = await uploadVideoToSupabase(videoBuffer, userId, validAspectRatio);
                        } catch (uploadErr) {
                            console.warn('[UGC-PREVIEW] Supabase upload failed, falling back to data URL:', uploadErr.message);
                        }
                    }

                    // Fallback to data URL or URI if upload didn't yield a URL
                    if (!finalVideoUrl) {
                        if (videoBuffer) {
                            finalVideoUrl = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
                        } else if (videoData.uri) {
                            finalVideoUrl = `${videoData.uri}?alt=media&key=${apiKey}`;
                            if (token && token.startsWith('ya29')) {
                                finalVideoUrl = `${videoData.uri}?alt=media`;
                            }
                        }
                    }

                    if (!finalVideoUrl) throw new Error('Failed to assemble video URL.');

                    broadcastProgress(taskId, 3, 3, 'Video rendered!');
                    return res.json({ keyframeUrl, videoUrl: finalVideoUrl });
                }
            }
            throw new Error('Veo render timed out.');
        } catch (error) {
            console.error('[UGC-PREVIEW] Pipeline Error:', error);
            res.status(500).json({ error: error.message || 'UGC preview pipeline failed' });
        }
    });

    // UGC Context Analysis (synergy between creator + product) / General Gemini Proxy
    router.post('/ai/analyze-ugc', async (req, res) => {
        try {
            const { parts, model, generationConfig, characterImage, productImage, characterMetadata, productMetadata } = req.body;

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

                const gemini = getGeminiClient();
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
            const synergy = await geminiService.analyzeUGCContext(characterImage, productImage, { characterMetadata, productMetadata });
            res.json(synergy);
        } catch (error) {
            console.error('Analyze UGC / Proxy Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}
