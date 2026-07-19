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
    router.post('/veo-i2v', async (req, res) => {
        try {
            let user;
            try {
                user = await requireAuth(req);
            } catch (authErr) {
                if (process.env.NODE_ENV === 'production') {
                    return res.status(401).json({ error: 'Authentication required to generate video.' });
                }
            }

            const { image, motionPrompt, prompt, duration = 8, aspectRatio = '16:9', nodeId, userId, generateAudio, resolution = '1080p', model } = req.body;
            const modelName = model || '';
            if (!motionPrompt && !prompt) throw new Error('No motion prompt provided');

            const targetUserId = user ? user.id : userId;

            const apiKey = await resolveGoogleApiKey(req, targetUserId, true);
            const token = await getVertexToken();
            if (!token && !apiKey) throw new Error('Failed to acquire service account token or API key');

            // Deduct credits: veo_fast costs 10 credits, veo_full/standard costs 40 credits (halved)
            let requiredCredits = 10; // Default
            const modelLower = (model || '').toLowerCase();
            if (modelLower.includes('full') || modelLower.includes('high') || duration > 6) {
                requiredCredits = 40;
            }

            if (targetUserId) {
                const creditReason = req.body.creditReason || 'cinematic_video_generation';
                console.log(`[VEO-I2V] Consuming/Claiming ${requiredCredits} credits for user: ${targetUserId} (reason: ${creditReason})`);
                await claimOrCreateSpend(targetUserId, requiredCredits, creditReason);
            }

            const taskId = nodeId ? `veo-${nodeId}` : 'veo-default';
            const validDuration = [4, 6, 8].includes(Number(duration)) ? Number(duration) : 8;
            const validAspectRatio = ['16:9', '9:16', '1:1'].includes(aspectRatio) ? aspectRatio : '16:9';
            const validResolution = ['720p', '1080p', '4k'].includes(resolution) ? resolution : '1080p';

            console.log(`[VEO-I2V] Starting | taskId: ${taskId} | duration: ${validDuration}s | ratio: ${validAspectRatio} | res: ${validResolution} | image: ${!!image}`);

            // Build the instance object (shared for both SDK and REST formats)
            let instance = { prompt: motionPrompt };

            const resolveImagePayload = async (imgSrc) => {
                if (!imgSrc) return null;
                let imageData = '';
                let mimeType = 'image/png';

                if (imgSrc.startsWith('data:')) {
                    const match = imgSrc.match(/^data:([^;]+);base64,/);
                    if (match) mimeType = match[1];
                    imageData = imgSrc.split(',')[1];
                } else if (imgSrc.startsWith('http') || imgSrc.startsWith('//')) {
                    const fullUrl = imgSrc.startsWith('//') ? `https:${imgSrc}` : imgSrc;
                    const imgResp = await fetch(fullUrl);
                    if (!imgResp.ok) throw new Error(`Failed to fetch image: ${imgResp.statusText}`);
                    const buffer = await imgResp.arrayBuffer();
                    imageData = Buffer.from(buffer).toString('base64');
                    const contentType = imgResp.headers.get('content-type');
                    if (contentType) mimeType = contentType;
                } else {
                    imageData = imgSrc;
                }

                return {
                    bytesBase64Encoded: imageData,
                    mimeType: mimeType
                };
            };

            const firstFrameSrc = image || req.body.firstFrameImage;
            const lastFrameSrc = req.body.lastFrameImage || req.body.imageEnd;

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
                }
            }

            console.log(`[VEO-I2V] Constructed Instance Keys:`, Object.keys(instance), instance.image ? `| image.mimeType: ${instance.image.mimeType}` : '', instance.lastImage ? `| lastImage.mimeType: ${instance.lastImage.mimeType}` : '');

            broadcastProgress(taskId, 1, 3, 'Veo 3.1 engine initializing...');

            let videoBuffer = null;
            let success = false;

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
                                durationSeconds: validDuration,
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
                    broadcastProgress(taskId, 2, 3, 'Animating scene (Vertex AI Render)...');

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
                    console.warn(`[VEO-I2V] [Vertex AI] Failed. Error: ${vertexErr.message}. Falling back to Google AI Studio...`);
                    if (apiKey === 'VERTEX_AI_CLIENT') {
                        throw vertexErr;
                    }
                }
            }

            // --- Option B: Google AI Studio / Gemini API (Fallback) ---
            if (!success && apiKey && apiKey !== 'VERTEX_AI_CLIENT') {
                try {
                    let aiStudioModel = 'veo-3.1-generate-preview';
                    if (modelName.includes('fast')) {
                        aiStudioModel = 'veo-3.1-fast-generate-preview';
                    } else if (modelName.includes('lite')) {
                        aiStudioModel = 'veo-3.1-lite-generate-preview';
                    }
                    let endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${aiStudioModel}:predictLongRunning`;
                    let headers = { 'Content-Type': 'application/json' };
                    if (apiKey) {
                        endpoint += `?key=${apiKey}`;
                        console.log(`[VEO-I2V] [AI Studio] Calling model ${aiStudioModel} via API Key`);
                    } else {
                        headers['Authorization'] = `Bearer ${token}`;
                        console.log(`[VEO-I2V] [AI Studio] Calling model ${aiStudioModel} via Service Account token`);
                    }

                    const restResponse = await fetch(endpoint, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            instances: [instance],
                            parameters: {
                                sampleCount: 1,
                                aspectRatio: validAspectRatio,
                                durationSeconds: validDuration,
                                resolution: validResolution
                            }
                        })
                    });

                    const operation = await restResponse.json();
                    if (operation.error) {
                        throw new Error(operation.error.message || "REST Initiation Failed on Google AI Studio");
                    }

                    console.log(`[VEO-I2V] [AI Studio] Operation started: ${operation.name}`);
                    broadcastProgress(taskId, 2, 3, 'Animating scene (Fallback Render)...');

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
                    throw new Error(`Video generation failed on both Vertex AI and Google AI Studio: ${studioErr.message}`);
                }
            }

            if (!success || !videoBuffer) {
                throw new Error('Video generation failed to return valid video buffer.');
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
            res.status(500).json({ error: error.message || 'Video generation failed' });
        }
    });

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
            let requiredCredits = 7;
            if (model === 'kling/v3-turbo-image-to-video') {
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

            const { prompt, input_url, video_url, mode = 'std', character_orientation = 'video', background_source = 'input_video', userId } = req.body;
            const apiKey = process.env.KLING_API_KEY;

            if (!apiKey) throw new Error("Kling API Key not configured. Please add KLING_API_KEY to your environment.");

            const targetUserId = user ? user.id : userId;
            const duration = req.body.duration || 5;
            const rate = mode === 'pro' ? 9 : 7; // halved from 18 : 14
            const requiredCredits = Math.ceil(rate * duration);

            if (targetUserId) {
                const creditReason = req.body.creditReason || `kling_motion_control_${mode}`;
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

            const payload = {
                model: "kling-3.0/motion-control",
                callBackUrl: req.body.callBackUrl || "https://zerolens.app/api/callback",
                input: {
                    prompt: prompt || "",
                    input_urls: [imgUrl],
                    video_urls: [vidUrl],
                    mode,
                    character_orientation,
                    background_source
                }
            };

            console.log(`[KLING-MOTION] Creating task on Kie.ai...`);
            const createResp = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload)
            });

            const createData = await createResp.json();
            if (createData.code !== 200) throw new Error(`Kling Motion Task Creation Failed: ${createData.msg || 'Unknown Error'}`);

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
                resolution = '1080p',
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

    return router;
}
