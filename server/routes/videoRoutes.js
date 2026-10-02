import express from 'express';
import * as musicService from '../../services/musicService.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os';

ffmpeg.setFfmpegPath(ffmpegStatic);

async function stripAudioFromBuffer(inputBuffer) {
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `veo_in_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`);
    const outputPath = path.join(tempDir, `veo_out_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`);
    
    await fs.promises.writeFile(inputPath, inputBuffer);
    
    try {
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions('-an') // Strip audio stream
                .outputOptions('-vcodec', 'copy') // Copy video stream directly without transcoding
                .output(outputPath)
                .on('end', resolve)
                .on('error', (err) => {
                    console.error('[FFMPEG STRIP ERROR]:', err);
                    reject(err);
                })
                .run();
        });
        
        const outputBuffer = await fs.promises.readFile(outputPath);
        return outputBuffer;
    } finally {
        // Clean up temp files
        fs.promises.unlink(inputPath).catch(() => {});
        fs.promises.unlink(outputPath).catch(() => {});
    }
}

export default function createRouter(deps) {
    const router = express.Router();
    const {
        getJobStatus,
        findVideoInResponse,
        getVertexToken,
        uploadVideoToSupabase,
        resolveToPublicUrl,
        broadcastProgress,
        broadcastComplete,
        VERTEX_PROJECT_ID,
        VERTEX_LOCATION,
        requireAuth,
        resolveGoogleApiKey,
        consumeCredits,
        claimOrCreateSpend,
        videoQueue,
        updateJobStatus
    } = deps;

    // Queue Status Polling Endpoints
    router.get('/job-status/:jobId', async (req, res) => {
        try {
            const { jobId } = req.params;
            const statusData = await getJobStatus(jobId);
            if (!statusData) {
                return res.status(404).json({ error: 'Job not found or expired' });
            }
            res.json(statusData);
        } catch (err) {
            console.error('Job Status Error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // Veo Image-to-Video: Animate a keyframe image into a clip
    const handleVeoGenerate = async (req, res) => {
        try {
            let user;
            try {
                user = await requireAuth(req);
            } catch (authErr) {
                if (process.env.NODE_ENV === 'production') {
                    return res.status(401).json({ error: 'Authentication required to generate video.' });
                }
            }

            const { image, motionPrompt, prompt, duration = 8, aspectRatio = '16:9', nodeId, userId, generateAudio, resolution = '720p', model } = req.body;
            const modelName = model || '';
            const textPrompt = motionPrompt || prompt;
            if (!textPrompt) throw new Error('No motion prompt provided');

            const targetUserId = user ? user.id : userId;

            const apiKey = await resolveGoogleApiKey(req, targetUserId, true);
            const token = await getVertexToken();
            if (!token && !apiKey) throw new Error('Failed to acquire service account token or API key');

            // Deduct credits: prefer client-sent creditCost if provided
            let requiredCredits = typeof req.body.creditCost === 'number' && req.body.creditCost > 0
                ? req.body.creditCost
                : 10;
            const modelLower = (model || '').toLowerCase();
            if (!req.body.creditCost && (modelLower.includes('full') || modelLower.includes('high') || duration > 6)) {
                requiredCredits = 40;
            }

            if (targetUserId) {
                const creditReason = req.body.creditReason || 'cinematic_video_generation';
                console.log(`[VEO-I2V] Consuming/Claiming ${requiredCredits} credits for user: ${targetUserId} (reason: ${creditReason})`);
                await claimOrCreateSpend(targetUserId, requiredCredits, creditReason);
            }

            const taskId = nodeId ? `veo-${nodeId}` : 'veo-default';
            const validDuration = [4, 5, 6, 8, 10, 12, 15].includes(Number(duration)) ? Number(duration) : 8;
            const validAspectRatio = ['16:9', '9:16', '1:1'].includes(aspectRatio) ? aspectRatio : '16:9';
            const validResolution = ['720p', '1080p', '4k'].includes(resolution) ? resolution : '720p';

            console.log(`[VEO-I2V] Starting | taskId: ${taskId} | duration: ${validDuration}s | ratio: ${validAspectRatio} | res: ${validResolution} | image: ${!!image}`);

            // Build the instance object (shared for both SDK and REST formats)
            let instance = { prompt: textPrompt };

            const resolveImagePayload = async (imgSrc) => {
                if (!imgSrc) return null;
                if (typeof imgSrc === 'object' && imgSrc.bytesBase64Encoded) return imgSrc;
                let imageData = '';
                let mimeType = 'image/png';

                if (typeof imgSrc === 'string' && imgSrc.startsWith('data:')) {
                    const match = imgSrc.match(/^data:([^;]+);base64,/);
                    if (match) mimeType = match[1];
                    imageData = imgSrc.split(',')[1];
                } else if (typeof imgSrc === 'string' && (imgSrc.startsWith('http') || imgSrc.startsWith('//'))) {
                    if (imgSrc.startsWith('blob:')) {
                        console.warn('[VEO-I2V] Received blob URL which cannot be fetched by server:', imgSrc);
                        return null;
                    }
                    const fullUrl = imgSrc.startsWith('//') ? `https:${imgSrc}` : imgSrc;
                    const imgResp = await fetch(fullUrl);
                    if (!imgResp.ok) throw new Error(`Failed to fetch image: ${imgResp.statusText}`);
                    const buffer = await imgResp.arrayBuffer();
                    imageData = Buffer.from(buffer).toString('base64');
                    const contentType = imgResp.headers.get('content-type');
                    if (contentType) mimeType = contentType;
                } else if (typeof imgSrc === 'string') {
                    imageData = imgSrc;
                } else {
                    return null;
                }

                return {
                    bytesBase64Encoded: imageData,
                    mimeType: mimeType
                };
            };

            const firstFrameSrc = image || req.body.firstFrameImage || req.body.firstFrame;
            const lastFrameSrc = req.body.lastFrameImage || req.body.imageEnd || req.body.lastFrame;

            if (firstFrameSrc) {
                const firstFrameObj = await resolveImagePayload(firstFrameSrc);
                if (firstFrameObj) {
                    instance.image = firstFrameObj;
                }
            }

            if (lastFrameSrc) {
                const lastFrameObj = await resolveImagePayload(lastFrameSrc);
                if (lastFrameObj) {
                    instance.lastImage = lastFrameObj;
                    instance.lastFrame = lastFrameObj;
                    instance.endImage = lastFrameObj;
                }
            }

            let frameDirective = '';
            if (firstFrameSrc && lastFrameSrc) {
                frameDirective = `[Start Frame: initial image at 0s] [End Frame: final image at ${validDuration}s]. Smooth continuous transition starting from the start frame and concluding at the end frame. `;
            } else if (firstFrameSrc) {
                frameDirective = `[Start Frame: initial image at 0s]. Animate smoothly starting directly from this frame. `;
            } else if (lastFrameSrc) {
                frameDirective = `[End Frame: final image at ${validDuration}s]. Conclude smoothly at this final frame. `;
            }

            let audioDirective = '';
            if (generateAudio !== false && !textPrompt.includes('[Audio:')) {
                audioDirective = ` [Audio: Realistic synchronized environmental sound effects, natural foley, and ambient room tones ONLY. Strictly NO background music, NO BGM, NO soundtrack, NO musical instruments, NO melody, NO singing. High-fidelity diegetic sound effects only.]`;
            }

            instance.prompt = frameDirective ? `${frameDirective}${textPrompt}${audioDirective}` : `${textPrompt}${audioDirective}`;

            console.log(`[VEO-I2V] Constructed Instance Keys:`, Object.keys(instance), instance.image ? `| image.mimeType: ${instance.image.mimeType}` : '', instance.lastImage ? `| lastImage.mimeType: ${instance.lastImage.mimeType}` : '');

            broadcastProgress(taskId, 1, 3, 'Preparing video scene...');

            let videoBuffer = null;
            let success = false;
            let lastVertexErr = null;

            // --- Option A: Vertex AI (First Preference) ---
            if (token) {
                try {
                    let vertexModel = 'veo-3.1-generate-001';
                    if (modelName.includes('fast')) {
                        vertexModel = 'veo-3.1-fast-generate-001';
                    } else if (modelName.includes('lite')) {
                        vertexModel = 'veo-3.1-lite-generate-001';
                    }
                    const veoEndpoint = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${vertexModel}:predictLongRunning`;
                    console.log(`[VEO-I2V] [Vertex AI] Calling model ${vertexModel} on url: ${veoEndpoint}`);

                    const restResponse = await fetch(veoEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            instances: [instance],
                            parameters: {
                                sampleCount: 1,
                                aspectRatio: validAspectRatio,
                                durationSeconds: Math.min(validDuration, 8),
                                resolution: validResolution
                            }
                        })
                    });

                    const operationResultData = await restResponse.json();
                    if (operationResultData.error) {
                        throw new Error(operationResultData.error.message || "REST Initiation Failed on Vertex AI");
                    }

                    const operationName = operationResultData.name;
                    console.log(`[VEO-I2V] [Vertex AI] Operation started: ${operationName}`);
                    broadcastProgress(taskId, 2, 3, 'Rendering video sequence...');

                    // Use fetchPredictOperation — the CORRECT polling method for Veo predictLongRunning.
                    // Standard GET /v1/{operationName} always returns 404 for publisher-scoped Veo operations.
                    const fetchOpUrl = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${vertexModel}:fetchPredictOperation`;

                    let attempts = 0;
                    const maxAttempts = 38;   // 38 × 8s = 304s (~5 min hard cap)
                    let isDone = false;
                    let operationResult = null;
                    const pollStartTime = Date.now();

                    while (!isDone && attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 8000));
                        attempts++;

                        const pollResp = await fetch(fetchOpUrl, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ operationName })
                        });

                        if (!pollResp.ok) {
                            const errText = await pollResp.text().catch(() => pollResp.status);
                            console.warn(`[VEO-I2V] [Vertex AI] Poll attempt #${attempts} returned ${pollResp.status}: ${errText}`);
                            if (pollResp.status === 429) {
                                // Rate-limited — back off extra
                                await new Promise(resolve => setTimeout(resolve, 10000));
                            }
                            continue;
                        }

                        operationResult = await pollResp.json();

                        if (operationResult.error) throw new Error(operationResult.error.message);
                        isDone = operationResult.done;

                        const elapsed = Math.round((Date.now() - pollStartTime) / 1000);
                        if (attempts % 3 === 0 || isDone) {
                            console.log(`[VEO-I2V] [Vertex AI] ${isDone ? '✅ Done' : 'Generating...'} (${elapsed}s, poll #${attempts})`);
                            broadcastProgress(taskId, 2, 3, `Rendering video... (${elapsed}s)`);
                        }
                    }

                    if (!isDone) throw new Error('Vertex AI video generation timed out after ~5 min');

                    const responseData = operationResult.response;

                    // Detect Safety/RAI Filter Blocking
                    if (responseData?.raiMediaFilteredCount > 0 || responseData?.raiMediaFilteredReasons) {
                        const reasons = responseData.raiMediaFilteredReasons ? ` (${responseData.raiMediaFilteredReasons.join(', ')})` : '';
                        throw new Error(`Video blocked by Google's safety filters/RAI policy${reasons}. Please tweak your prompt and try again.`);
                    }

                    // Try all known response shapes
                    // Shape 1: base64 in predictions
                    const b64 = responseData?.predictions?.[0]?.bytesBase64Encoded;
                    if (b64) {
                        videoBuffer = Buffer.from(b64, 'base64');
                        success = true;
                        console.log(`[VEO-I2V] [Vertex AI] ✅ Got video via base64 predictions (${videoBuffer.length} bytes)`);
                    }

                    // Shape 2: GCS URI in generatedVideos
                    if (!success) {
                        const gcsUri = responseData?.generatedVideos?.[0]?.video?.uri
                            || responseData?.generatedVideos?.[0]?.uri;
                        if (gcsUri) {
                            console.log(`[VEO-I2V] [Vertex AI] Downloading from generatedVideos URI: ${gcsUri}`);
                            const videoResp = await fetch(gcsUri, { headers: { 'Authorization': `Bearer ${token}` } });
                            if (videoResp.ok) {
                                videoBuffer = Buffer.from(await videoResp.arrayBuffer());
                                success = true;
                                console.log(`[VEO-I2V] [Vertex AI] ✅ Downloaded via generatedVideos URI (${videoBuffer.length} bytes)`);
                            } else {
                                console.warn(`[VEO-I2V] generatedVideos URI download failed: ${videoResp.status}`);
                            }
                        }
                    }

                    // Shape 3: URI in predictions
                    if (!success) {
                        const predUri = responseData?.predictions?.[0]?.uri
                            || responseData?.predictions?.[0]?.video?.uri;
                        if (predUri) {
                            console.log(`[VEO-I2V] [Vertex AI] Downloading from predictions URI: ${predUri}`);
                            const videoResp = await fetch(predUri, { headers: { 'Authorization': `Bearer ${token}` } });
                            if (videoResp.ok) {
                                videoBuffer = Buffer.from(await videoResp.arrayBuffer());
                                success = true;
                                console.log(`[VEO-I2V] [Vertex AI] ✅ Downloaded via predictions URI (${videoBuffer.length} bytes)`);
                            }
                        }
                    }

                    // Shape 4: fetchPredictOperation-specific .videos array
                    if (!success) {
                        const vidObj = operationResult?.videos?.[0] || responseData?.videos?.[0];
                        const vidUri = vidObj?.uri || vidObj?.video?.uri;
                        const vidB64 = vidObj?.bytesBase64Encoded;
                        if (vidB64) {
                            videoBuffer = Buffer.from(vidB64, 'base64');
                            success = true;
                            console.log(`[VEO-I2V] [Vertex AI] ✅ Got video via .videos[].bytesBase64Encoded (${videoBuffer.length} bytes)`);
                        } else if (vidUri) {
                            console.log(`[VEO-I2V] [Vertex AI] Downloading from .videos URI: ${vidUri}`);
                            const videoResp = await fetch(vidUri, { headers: { 'Authorization': `Bearer ${token}` } });
                            if (videoResp.ok) {
                                videoBuffer = Buffer.from(await videoResp.arrayBuffer());
                                success = true;
                                console.log(`[VEO-I2V] [Vertex AI] ✅ Downloaded via .videos URI (${videoBuffer.length} bytes)`);
                            }
                        }
                    }
                } catch (vertexErr) {
                    lastVertexErr = vertexErr.message;
                    console.warn(`[VEO-I2V] [Vertex AI] Failed. Error: ${vertexErr.message}. Falling back to Google AI Studio...`);
                }
            }

            // --- Option B: Google AI Studio / Gemini API (Fallback) ---
            if (!success) {
                const studioKey = (apiKey && apiKey !== 'VERTEX_AI_CLIENT') ? apiKey : (process.env.ADMIN_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
                if (studioKey || token) {
                    try {
                        let aiStudioModel = 'veo-3.1-generate-preview';
                        if (modelName.includes('fast')) {
                            aiStudioModel = 'veo-3.1-fast-generate-preview';
                        } else if (modelName.includes('lite')) {
                            aiStudioModel = 'veo-3.1-lite-generate-preview';
                        }
                        let endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${aiStudioModel}:predictLongRunning`;
                        let headers = { 'Content-Type': 'application/json' };
                        if (studioKey) {
                            endpoint += `?key=${studioKey}`;
                            console.log(`[VEO-I2V] [AI Studio Fallback] Calling model ${aiStudioModel} via API Key`);
                        } else {
                            headers['Authorization'] = `Bearer ${token}`;
                            console.log(`[VEO-I2V] [AI Studio Fallback] Calling model ${aiStudioModel} via Service Account token`);
                        }

                    const restResponse = await fetch(endpoint, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            instances: [instance],
                            parameters: {
                                sampleCount: 1,
                                aspectRatio: validAspectRatio,
                                durationSeconds: Math.min(validDuration, 8),
                                resolution: validResolution
                            }
                        })
                    });

                    const operation = await restResponse.json();
                    if (operation.error) {
                        throw new Error(operation.error.message || "REST Initiation Failed on Google AI Studio");
                    }

                    console.log(`[VEO-I2V] [AI Studio] Operation started: ${operation.name}`);
                    broadcastProgress(taskId, 2, 3, 'Rendering video sequence...');

                    let attempts = 0;
                    const maxAttempts = 60;
                    let isDone = false;
                    let operationResult = operation;

                    while (!isDone && attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 6000));
                        attempts++;

                        let pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationResult.name}`;
                        let pollHeaders = {};
                        if (apiKey) {
                            pollUrl += `?key=${apiKey}`;
                        } else {
                            pollHeaders['Authorization'] = `Bearer ${token}`;
                        }

                        const pollResp = await fetch(pollUrl, { headers: pollHeaders });
                        if (!pollResp.ok) throw new Error(`HTTP Error: ${pollResp.status}`);
                        operationResult = await pollResp.json();

                        if (operationResult.error) throw new Error(operationResult.error.message);
                        isDone = operationResult.done;

                        if (attempts % 3 === 0) {
                            const elapsed = attempts * 6;
                            console.log(`[VEO-I2V] [AI Studio] Still generating... (${elapsed}s elapsed)`);
                            broadcastProgress(taskId, 2, 3, `Rendering video... (${elapsed}s)`);
                        }
                    }

                    if (!isDone) throw new Error('Google AI Studio video generation timed out');

                    const video = findVideoInResponse(operationResult);
                    if (!video) throw new Error('No video returned from Veo 3.1 on Google AI Studio');

                    if (video.videoBytes || video.bytesBase64Encoded) {
                        const b64 = video.videoBytes ? Buffer.from(video.videoBytes).toString('base64') : video.bytesBase64Encoded;
                        videoBuffer = Buffer.from(b64, 'base64');
                        success = true;
                        console.log(`[VEO-I2V] [AI Studio] Video generated successfully via base64 (${videoBuffer.length} bytes)`);
                    } else if (video.uri) {
                        console.log(`[VEO-I2V] Downloading URI: ${video.uri}`);
                        let downloadUrl = video.uri;
                        let downloadHeaders = {};
                        if (apiKey) {
                            downloadUrl = `${video.uri}&key=${apiKey}`;
                        } else {
                            downloadHeaders['Authorization'] = `Bearer ${token}`;
                        }
                        const videoResp = await fetch(downloadUrl, { headers: downloadHeaders });
                        if (!videoResp.ok) throw new Error(`Video download failed: ${videoResp.statusText}`);
                        videoBuffer = Buffer.from(await videoResp.arrayBuffer());
                        success = true;
                    }
                } catch (studioErr) {
                    console.error(`[VEO-I2V] [AI Studio] Failed. Error: ${studioErr.message}`);
                    if (studioErr.message.includes('prepayment credits are depleted')) {
                        throw new Error(lastVertexErr ? `[Vertex AI Video Error]: ${lastVertexErr}` : 'Google AI Studio prepayment credits are depleted. Please ensure Vertex AI credentials are active.');
                    }
                    throw new Error(lastVertexErr ? `[Vertex AI]: ${lastVertexErr} | [AI Studio]: ${studioErr.message}` : studioErr.message);
                }
            }
        }

            if (!success || !videoBuffer) {
                throw new Error(lastVertexErr ? `[Vertex AI Video Error]: ${lastVertexErr}` : 'Video generation failed to return valid video buffer.');
            }

            if (generateAudio === false) {
                console.log('[VEO-I2V] generateAudio is false. Stripping audio from video bytes...');
                try {
                    videoBuffer = await stripAudioFromBuffer(videoBuffer);
                    console.log('[VEO-I2V] Audio successfully stripped.');
                } catch (ffmpegErr) {
                    console.error('[VEO-I2V] Failed to strip audio using FFmpeg:', ffmpegErr);
                }
            }

            const publicUrl = await uploadVideoToSupabase(videoBuffer, userId, validAspectRatio, 'generated', motionPrompt || prompt || '', model || 'Veo 3.1');
            let videoUrl = publicUrl;

            if (!videoUrl) throw new Error('Failed to assemble video URL.');

            broadcastProgress(taskId, 3, 3, 'Sequence ready!');
            broadcastComplete(taskId);
            console.log(`[VEO-I2V] ✅ [${taskId}] Success`);

            res.json({ videoUrl });
        } catch (error) {
            console.error('[VEO-I2V] Error:', error);
            const taskId = req.body.nodeId ? `veo-${req.body.nodeId}` : 'veo-default';
            broadcastProgress(taskId, 0, 0, `Error: ${error.message}`);
            return res.status(500).json({ error: error.message || 'Video generation failed' });
        }
    };

    router.post('/veo-i2v', handleVeoGenerate);
    router.post('/veo/generate-video', handleVeoGenerate);
    router.post('/generate-video', handleVeoGenerate);
    router.post('/veo/generate', handleVeoGenerate);
    router.post('/generate', handleVeoGenerate);

    // MusicFX Score Generation
    router.post('/music/generate', async (req, res) => {
        try {
            const { prompt, style, duration } = req.body;
            broadcastProgress('music-gen', 1, 2, `Composing ${style} score...`);

            const result = await musicService.generateMusicScore(prompt, style, duration);
            if (!result) throw new Error('Music generation failed');

            broadcastProgress('music-gen', 2, 2, 'Score composed!');
            broadcastComplete('music-gen');
            res.json(result);
        } catch (error) {
            console.error('Music Generation Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Kling Generation
    router.post('/kling/generate', async (req, res) => {
        try {
            let user;
            try {
                user = await requireAuth(req);
            } catch (authErr) {
                if (process.env.NODE_ENV === 'production') {
                    return res.status(401).json({ error: 'Authentication required to generate video.' });
                }
            }

            const { prompt, firstFrame, lastFrame, duration, userId, negative_prompt, cfg_scale, model } = req.body;
            const apiKey = process.env.KLING_API_KEY;

            if (!apiKey) throw new Error("Kling API Key not configured. Please add KLING_API_KEY to your environment.");

            const targetUserId = user ? user.id : userId;
            let requiredCredits = typeof req.body.creditCost === 'number' && req.body.creditCost > 0
                ? req.body.creditCost
                : 7;
            if (!req.body.creditCost && model === 'kling/v3-turbo-image-to-video') {
                const durationSec = Number(duration) || 5;
                const costPerSec = (req.body.resolution === '1080p') ? (0.1125 * 1.30 * 84) : (0.09 * 1.30 * 84); // 12.285 or 9.828 credits/sec
                requiredCredits = Math.round(costPerSec * durationSec);
            }

            if (targetUserId) {
                const creditReason = req.body.creditReason || 'cinematic_video_generation';
                console.log(`[KLING-GEN] Consuming/Claiming ${requiredCredits} credits for user: ${targetUserId} (reason: ${creditReason})`);
                await claimOrCreateSpend(targetUserId, requiredCredits, creditReason);
            }

            console.log(`[KLING-ASYNC] Resolving assets for user ${targetUserId}...`);
            const [imgUrl, tailUrl] = await Promise.all([
                resolveToPublicUrl(firstFrame, targetUserId),
                resolveToPublicUrl(lastFrame, targetUserId)
            ]);

            let selectedModel = model;
            if (!imgUrl && selectedModel === 'kling/v3-turbo-image-to-video') {
                selectedModel = 'kling/v3-turbo-text-to-video';
            }

            let image_urls = [];
            if (imgUrl) image_urls.push(imgUrl);
            if (tailUrl) image_urls.push(tailUrl);

            let payload;
            if (selectedModel === 'kling/v3-turbo-image-to-video') {
                payload = {
                    model: 'kling/v3-turbo-image-to-video',
                    input: {
                        prompt,
                        image_urls,
                        duration: String(duration || "5"),
                        resolution: req.body.resolution || "720p"
                    }
                };
            } else if (selectedModel === 'kling/v3-turbo-text-to-video') {
                payload = {
                    model: 'kling/v3-turbo-text-to-video',
                    input: {
                        prompt,
                        duration: String(duration || "5"),
                        resolution: req.body.resolution || "720p"
                    }
                };
            } else {
                if (!imgUrl) throw new Error("Kling requires at least one starting image URL.");
                payload = {
                    model: selectedModel || "kling-3.0/video",
                    input: {
                        prompt,
                        image_urls,
                        mode: "pro",
                        sound: false,
                        multi_shots: false,
                        duration: String(duration || "5"),
                        negative_prompt: negative_prompt || "low quality, blur, distort",
                        cfg_scale: parseFloat(cfg_scale) || 0.5
                    }
                };
            }

            console.log(`[KLING-ASYNC] Creating task...`, JSON.stringify(payload, null, 2));
            const createResp = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload)
            });

            const createData = await createResp.json();
            if (createData.code !== 200) throw new Error(`Kling Task Creation Failed: ${createData.msg || 'Unknown Error'}`);

            const taskId = createData.data.taskId;
            console.log(`[KLING-ASYNC] Task Created: ${taskId}`);
            res.json({ success: true, requestId: taskId });
        } catch (error) {
            console.error('[KLING-GEN-ERR]', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Kling Status
    router.get('/kling/status/:requestId', async (req, res) => {
        try {
            const { requestId } = req.params;
            const { userId, aspectRatio = '16:9' } = req.query;
            const apiKey = process.env.KLING_API_KEY;

            if (!apiKey) throw new Error("Kling API Key missing.");

            const pollResp = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${requestId}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            const pollData = await pollResp.json();

            if (pollData.code !== 200) {
                if (pollData.code === 422 && (pollData.msg === 'recordInfo is null' || !pollData.data)) {
                    console.log(`[KLING-STATUS] Task ${requestId} not propagated yet. Treating as processing.`);
                    return res.json({ status: 'processing' });
                }
                throw new Error(`Kling Polling Failed: ${pollData.msg}`);
            }
            if (!pollData.data) throw new Error("Kling Polling Success but no data returned.");

            const state = pollData.data.state;
            console.log(`[KLING-STATUS] ${requestId}: ${state}`);

            if (state === 'success') {
                let finalUrl = pollData.data.videos?.[0]?.url || pollData.data.resultUrl;
                if (!finalUrl && pollData.data.resultJson) {
                    try {
                        const parsed = typeof pollData.data.resultJson === 'string'
                            ? JSON.parse(pollData.data.resultJson)
                            : pollData.data.resultJson;
                        finalUrl = parsed?.resultUrls?.[0] || parsed?.video_url;
                    } catch (e) {
                        console.warn('[KLING-STATUS-ERR] Failed to parse resultJson:', e.message);
                    }
                }
                
                if (!finalUrl) throw new Error("No result URL found.");
                
                // Archive to Supabase
                const jobInfo = (await getJobStatus(requestId)) || {};
                const prompt = jobInfo.prompt || '';
                const model = jobInfo.model || 'Kling';

                const videoResp = await fetch(finalUrl);
                const ab = await videoResp.arrayBuffer();
                const supabaseUrl = await uploadVideoToSupabase(Buffer.from(ab), userId, aspectRatio, 'generated', prompt, model);
                
                return res.json({ status: 'completed', url: supabaseUrl });
            } else if (state === 'fail') {
                return res.json({ status: 'failed', error: pollData.data.failMsg || 'Generation failed' });
            }

            res.json({ status: 'processing' });
        } catch (error) {
            console.error('[KLING-STATUS-ERR]', error);
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    // Kling Motion Control Generation
    router.post('/kling/motion-control', async (req, res) => {
        try {
            let user;
            try {
                user = await requireAuth(req);
            } catch (authErr) {
                if (process.env.NODE_ENV === 'production') {
                    return res.status(401).json({ error: 'Authentication required to generate motion control video.' });
                }
            }

            const { prompt, input_url, video_url, mode = '720p', character_orientation = 'video', userId } = req.body;
            const apiKey = process.env.KLING_API_KEY;

            if (!apiKey) throw new Error("Kling API Key not configured. Please add KLING_API_KEY to your environment.");

            const targetUserId = user ? user.id : userId;
            const duration = req.body.duration || 5;
            const resolvedMode = (mode === 'pro' || mode === '1080p') ? '1080p' : '720p';
            const rate = resolvedMode === '1080p' ? 9 : 7;
            const requiredCredits = typeof req.body.creditCost === 'number' && req.body.creditCost > 0
                ? req.body.creditCost
                : Math.ceil(rate * duration);

            if (targetUserId) {
                const creditReason = req.body.creditReason || `kling_motion_control_${resolvedMode}`;
                console.log(`[KLING-MOTION] Consuming ${requiredCredits} credits for user: ${targetUserId} (reason: ${creditReason})`);
                await claimOrCreateSpend(targetUserId, requiredCredits, creditReason);
            }

            console.log(`[KLING-MOTION] Resolving assets for user ${targetUserId}...`);
            const [imgUrl, vidUrl] = await Promise.all([
                resolveToPublicUrl(input_url, targetUserId),
                resolveToPublicUrl(video_url, targetUserId)
            ]);

            if (!imgUrl) throw new Error("Kling Motion Control requires a subject reference image URL.");
            if (!vidUrl) throw new Error("Kling Motion Control requires a motion reference video URL.");

            const targetPrompt = (prompt && prompt.trim()) 
                ? prompt.trim() 
                : "No distortion, the character's movements are consistent with the video.";

            const kieMode = (mode === 'pro' || mode === '1080p') ? '1080p' : '720p';

            const payload = {
                model: "kling-3.0/motion-control",
                callBackUrl: req.body.callBackUrl || "https://zerolens.app/api/callback",
                input: {
                    prompt: targetPrompt,
                    input_urls: [imgUrl],
                    video_urls: [vidUrl],
                    character_orientation: (character_orientation === 'image') ? 'image' : 'video',
                    mode: kieMode
                }
            };

            if (req.body.aspectRatio || req.body.aspect_ratio) {
                payload.input.aspect_ratio = req.body.aspectRatio || req.body.aspect_ratio;
            }

            console.log(`[KLING-MOTION] Creating task on Kie.ai (mode: ${kieMode})...`);
            const createResp = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload)
            });

            const createData = await createResp.json();
            if (createData.code !== 200) {
                if (targetUserId) {
                    try {
                        const { refundCredits } = await import('../../services/creditService.js');
                        if (refundCredits) await refundCredits(targetUserId, requiredCredits, `kling_motion_control_refund`);
                    } catch (refErr) {
                        console.error('[KLING-REFUND-ERR]', refErr);
                    }
                }
                throw new Error(`Kling Motion Task Creation Failed: ${createData.msg || 'Unknown Error'}`);
            }

            const taskId = createData.data.taskId;
            console.log(`[KLING-MOTION] Task Created: ${taskId}`);

            if (updateJobStatus) {
                await updateJobStatus(taskId, 'processing', {
                    prompt: prompt || 'Motion Control Video',
                    model: 'kling-3.0/motion-control'
                });
            }

            res.json({ success: true, requestId: taskId });
        } catch (error) {
            console.error('[KLING-MOTION-ERR]', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ─────────────────────────────────────────────────────────────
    // POST /video/generate — Unified BullMQ-queued video generation
    // Supports: provider = "veo" | "seedance" | "openai"
    // Returns { jobId } immediately; frontend polls /video/job-status/:jobId
    // ─────────────────────────────────────────────────────────────
    router.post('/video/generate', async (req, res) => {
        try {
            let user;
            try {
                user = await requireAuth(req);
            } catch (authErr) {
                if (process.env.NODE_ENV === 'production') {
                    return res.status(401).json({ error: 'Authentication required to generate video.' });
                }
            }

            const {
                provider = 'veo',
                model,
                duration = 8,
                resolution = '720p',
                userId,
                engine
            } = req.body;

            const targetUserId = user ? user.id : userId;

            // --- Dynamic credit cost by provider ---
            let requiredCredits = 20;
            const durationNum = Number(duration) || 5;
            const resLower = (resolution || '720p').toLowerCase();

            if (provider === 'veo') {
                const modelLower = (model || '').toLowerCase();
                requiredCredits = (modelLower.includes('full') || modelLower.includes('high') || durationNum > 6) ? 40 : 10;
            } else if (provider === 'seedance') {
                const eng = engine || 'seedance-fast';
                if (eng === 'seedance-fast') {
                    requiredCredits = (resLower === '480p' ? 3 : 6) * durationNum;
                } else {
                    requiredCredits = ((resLower === '1080p' || resLower === '4k') ? 20 : resLower === '480p' ? 3 : 8) * durationNum;
                }
            } else if (provider === 'openai') {
                requiredCredits = 2;
            }

            if (targetUserId) {
                const creditReason = req.body.creditReason || 'cinematic_video_generation';
                console.log(`[VIDEO-GENERATE] Consuming/Claiming ${requiredCredits} credits | user: ${targetUserId} | provider: ${provider} (reason: ${creditReason})`);
                await claimOrCreateSpend(targetUserId, requiredCredits, creditReason);
            }

            // --- Route to BullMQ if Redis is connected ---
            if (videoQueue) {
                const job = await videoQueue.add('generate', { reqBody: req.body }, {
                    attempts: 2,
                    backoff: { type: 'fixed', delay: 5000 },
                    removeOnComplete: { age: 3600 },   // keep completed jobs 1hr
                    removeOnFail:    { age: 86400 }    // keep failed jobs 24hr
                });
                await updateJobStatus(job.id, 'queued');
                console.log(`[VIDEO-QUEUE] ✅ Job ${job.id} queued | provider: ${provider}`);
                return res.json({ jobId: job.id, status: 'queued' });
            }

            // --- Fallback: Redis not available ---
            console.warn('[VIDEO-GENERATE] videoQueue unavailable — REDIS_URL not set or Redis unreachable.');
            return res.status(503).json({
                error: 'Queue system unavailable. Please add a Redis service in Railway and set REDIS_URL.',
                hint: 'Railway → New Service → Redis → copy REDIS_URL into your app\'s environment variables.'
            });

        } catch (error) {
            console.error('[VIDEO-GENERATE-ERR]', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    });

    // ─────────────────────────────────────────────────────────────
    // POST /video/upscale, /upscale, /veo/upscale — Video Upscale to 1080p HD
    // Cost: 5 Shorts per second
    // ─────────────────────────────────────────────────────────────
    const handleVideoUpscale = async (req, res) => {
        const tempDir = os.tmpdir();
        const inputPath = path.join(tempDir, `upscale_in_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`);
        const outputPath = path.join(tempDir, `upscale_out_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`);
        let targetUserId = null;
        let requiredCredits = 0;

        try {
            let user;
            try {
                user = await requireAuth(req);
            } catch (authErr) {
                if (process.env.NODE_ENV === 'production') {
                    return res.status(401).json({ error: 'Authentication required to upscale video.' });
                }
            }

            const {
                videoUrl,
                video,
                duration = 5,
                aspectRatio = '16:9',
                resolution = '1080p',
                prompt = '',
                userId
            } = req.body;

            targetUserId = user ? user.id : userId;
            const srcUrl = videoUrl || video;

            if (!srcUrl) {
                return res.status(400).json({ error: 'Missing videoUrl or video parameter.' });
            }

            const durationSec = Math.max(1, Math.round(Number(duration) || 5));
            requiredCredits = durationSec * 5; // 5 Shorts per second

            if (targetUserId) {
                const creditReason = req.body.creditReason || 'video_upscale_1080p';
                console.log(`[VIDEO-UPSCALE] Consuming/Claiming ${requiredCredits} credits | user: ${targetUserId} | duration: ${durationSec}s`);
                await claimOrCreateSpend(targetUserId, requiredCredits, creditReason);
            }

            // Resolve source video URL
            let fullUrl = srcUrl;
            if (typeof srcUrl === 'string' && (srcUrl.startsWith('http') || srcUrl.startsWith('//') || srcUrl.startsWith('/'))) {
                fullUrl = srcUrl.startsWith('//') ? `https:${srcUrl}` : srcUrl;
                if (typeof resolveToPublicUrl === 'function') {
                    fullUrl = await resolveToPublicUrl(fullUrl, targetUserId);
                }
                if (typeof fullUrl === 'string' && fullUrl.startsWith('/')) {
                    const port = process.env.PORT || 3002;
                    fullUrl = `http://localhost:${port}${fullUrl}`;
                }
            }

            console.log(`[VIDEO-UPSCALE] Dispatching 1080p upscale payload to Google Omni Flash 1.1 | video: ${fullUrl}`);

            let upscaledVideoUrl = null;

            // ── Primary Stage: Google Gemini Omni Flash 1.1 (Neural 1080p Detail Refinement) ──
            let rawRefinedUrl = null;
            try {
                const port = process.env.PORT || 3002;
                const upscalePrompt = prompt
                    ? `REFINE AND UPSCALE TO 1080p FULL HD: Enhance fine textures, cinematic sharpness, clean edges, facial details, and lighting to crystal-clear 1080p resolution. Maintain 100% motion consistency. [Context: ${prompt}]`
                    : 'Refine and upscale this video to 1080p HD quality with crisp textures, cinematic lighting, and sharp high-definition details.';

                const omniResp = await fetch(`http://localhost:${port}/api/omni-i2v`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        video: fullUrl,
                        sourceVideo: fullUrl,
                        task: 'edit',
                        duration: durationSec,
                        prompt: upscalePrompt,
                        motionPrompt: upscalePrompt,
                        resolution: '1080p',
                        aspectRatio: aspectRatio || '16:9',
                        generateAudio: true,
                        model: 'gemini-omni-1.1-flash-preview',
                        userId: targetUserId,
                        creditReason: 'video_upscale_1080p'
                    })
                });

                if (omniResp.ok) {
                    const omniData = await omniResp.json();
                    if (omniData.videoUrl || omniData.url) {
                        rawRefinedUrl = omniData.videoUrl || omniData.url;
                        console.log(`[VIDEO-UPSCALE] ✅ Google Omni Flash 1.1 completed detail refinement: ${rawRefinedUrl}`);
                    }
                } else {
                    const errTxt = await omniResp.text();
                    console.warn(`[VIDEO-UPSCALE] Omni Flash 1.1 returned ${omniResp.status}: ${errTxt}. Continuing with direct Lanczos 1080p master pipeline...`);
                }
            } catch (omniErr) {
                console.warn(`[VIDEO-UPSCALE] Omni Flash 1.1 invocation note: ${omniErr.message}. Continuing with direct Lanczos 1080p master pipeline...`);
            }

            // ── Final Master Stage: Hardware 1080p Lanczos Upscaler & Unsharp Detail Enhancement ──
            // Guarantee 100% true 1080p dimensions (1920x1080 / 1080x1920) and high-bitrate clarity
            const sourceForScaling = rawRefinedUrl || fullUrl || srcUrl;
            console.log(`[VIDEO-UPSCALE] Fetching video buffer for 1080p hardware encoding from: ${sourceForScaling}`);

            let videoBuffer;
            if (typeof sourceForScaling === 'string' && sourceForScaling.startsWith('data:')) {
                const base64Data = sourceForScaling.split(',')[1];
                videoBuffer = Buffer.from(base64Data, 'base64');
            } else {
                const vResp = await fetch(sourceForScaling);
                if (!vResp.ok) throw new Error(`Failed to fetch source video for 1080p encoding: ${vResp.statusText} (${sourceForScaling})`);
                const ab = await vResp.arrayBuffer();
                videoBuffer = Buffer.from(ab);
            }

            await fs.promises.writeFile(inputPath, videoBuffer);

            const isVertical = aspectRatio === '9:16' || aspectRatio === 'portrait' || aspectRatio === 'vertical';
            const isSquare = aspectRatio === '1:1' || aspectRatio === 'square';
            const scaleFilter = isVertical
                ? 'scale=1080:1920:force_original_aspect_ratio=decrease:flags=lanczos,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,unsharp=5:5:0.8:5:5:0.0'
                : isSquare
                ? 'scale=1080:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=1080:1080:(ow-iw)/2:(oh-ih)/2,unsharp=5:5:0.8:5:5:0.0'
                : 'scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,unsharp=5:5:0.8:5:5:0.0';

            console.log(`[VIDEO-UPSCALE] 🚀 Encoding true 1080p Full HD video (${isVertical ? '1080x1920' : (isSquare ? '1080x1080' : '1920x1080')}) at CRF 18...`);

            await new Promise((resolvePromise, rejectPromise) => {
                ffmpeg(inputPath)
                    .videoFilters(scaleFilter)
                    .outputOptions([
                        '-c:v libx264',
                        '-preset fast',
                        '-crf 18',
                        '-pix_fmt yuv420p',
                        '-movflags +faststart'
                    ])
                    .output(outputPath)
                    .on('end', () => {
                        console.log('[VIDEO-UPSCALE] ✅ 1080p Full HD encoding complete.');
                        resolvePromise();
                    })
                    .on('error', (err) => {
                        console.error('[VIDEO-UPSCALE-ERR] FFmpeg encoding error:', err);
                        rejectPromise(err);
                    })
                    .run();
            });

            const outputBuffer = await fs.promises.readFile(outputPath);

            const promptTag = prompt ? `${prompt} [1080p HD Upscaled]` : '1080p HD Upscaled Video';
            upscaledVideoUrl = await uploadVideoToSupabase(
                outputBuffer,
                targetUserId,
                aspectRatio,
                'generated',
                promptTag,
                '1080p HD Upscaler'
            );

            console.log(`[VIDEO-UPSCALE] 🏆 True 1080p Full HD Master uploaded: ${upscaledVideoUrl}`);

            res.json({
                success: true,
                url: upscaledVideoUrl,
                videoUrl: upscaledVideoUrl,
                resolution: '1080p',
                duration: durationSec,
                creditsSpent: requiredCredits,
                aspectRatio
            });
        } catch (error) {
            console.error('[VIDEO-UPSCALE-FAIL]', error);
            // Refund credits if deducted
            if (targetUserId && requiredCredits > 0) {
                try {
                    const { refundCredits } = await import('../../services/creditService.js');
                    if (refundCredits) await refundCredits(targetUserId, requiredCredits, 'video_upscale_refund');
                } catch (rErr) {
                    console.error('[VIDEO-UPSCALE] Refund error:', rErr);
                }
            }
            res.status(error.status || 500).json({ error: error.message || 'Video upscale failed.' });
        } finally {
            fs.promises.unlink(inputPath).catch(() => {});
            fs.promises.unlink(outputPath).catch(() => {});
        }
    };

    router.post('/upscale', handleVideoUpscale);
    router.post('/video/upscale', handleVideoUpscale);
    router.post('/veo/upscale', handleVideoUpscale);

    return router;
}
