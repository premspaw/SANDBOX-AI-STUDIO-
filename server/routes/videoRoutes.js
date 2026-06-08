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
        requireAuth,
        consumeCredits
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

            const { image, motionPrompt, duration = 8, aspectRatio = '16:9', nodeId, userId, generateAudio, resolution = '1080p', model } = req.body;
            if (!motionPrompt) throw new Error('No motion prompt provided');

            const targetUserId = user ? user.id : userId;

            // Deduct credits: veo_fast costs 20 credits, veo_full/standard costs 80 credits
            let requiredCredits = 20; // Default
            const modelLower = (model || '').toLowerCase();
            if (modelLower.includes('full') || modelLower.includes('high') || duration > 6) {
                requiredCredits = 80;
            }

            if (targetUserId) {
                console.log(`[VEO-I2V] Consuming ${requiredCredits} credits for user: ${targetUserId}`);
                await consumeCredits(targetUserId, requiredCredits);
            }

            const taskId = nodeId ? `veo-${nodeId}` : 'veo-default';
            const validDuration = [4, 6, 8].includes(Number(duration)) ? Number(duration) : 8;
            const validAspectRatio = ['16:9', '9:16', '1:1'].includes(aspectRatio) ? aspectRatio : '16:9';
            const validResolution = ['720p', '1080p', '4k'].includes(resolution) ? resolution : '1080p';

            console.log(`[VEO-I2V] Starting | taskId: ${taskId} | duration: ${validDuration}s | ratio: ${validAspectRatio} | res: ${validResolution} | image: ${!!image}`);

            // Build the instance object (shared for both SDK and REST formats)
            let instance = { prompt: motionPrompt };

            if (image) {
                let imageData = '';
                let mimeType = 'image/png';

                if (image.startsWith('data:')) {
                    const match = image.match(/^data:([^;]+);base64,/);
                    if (match) mimeType = match[1];
                    imageData = image.split(',')[1];
                } else if (image.startsWith('http') || image.startsWith('//')) {
                    const fullUrl = image.startsWith('//') ? `https:${image}` : image;
                    const imgResp = await fetch(fullUrl);
                    if (!imgResp.ok) throw new Error(`Failed to fetch input image: ${imgResp.statusText}`);
                    const buffer = await imgResp.arrayBuffer();
                    imageData = Buffer.from(buffer).toString('base64');
                    const contentType = imgResp.headers.get('content-type');
                    if (contentType) mimeType = contentType;
                } else {
                    imageData = image; // Assume raw base64
                }

                // Structure for Vertex / AI Studio Predict API
                instance.image = {
                    bytesBase64Encoded: imageData,
                    mimeType: mimeType
                };
            }

            console.log(`[VEO-I2V] Constructed Instance Keys:`, Object.keys(instance), instance.image ? `| image.mimeType: ${instance.image.mimeType}` : '');

            broadcastProgress(taskId, 1, 3, 'Veo 3.1 engine initializing...');

            let modelName = req.body.model || 'veo-3.1-generate-preview';
            let operation;

            const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
            const token = await getVertexToken();
            if (!token && !apiKey) throw new Error('Failed to acquire service account token or API key for Veo I2V');

            let endpoint;
            let headers = { 'Content-Type': 'application/json' };

            if (apiKey) {
                endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predictLongRunning?key=${apiKey}`;
                console.log(`[VEO-I2V] Calling REST API via API Key (Pay-as-you-go)...`);
            } else {
                endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predictLongRunning`;
                headers['Authorization'] = `Bearer ${token}`;
                console.log(`[VEO-I2V] Calling REST API via Service Account for project: ${VERTEX_PROJECT_ID}`);
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

            operation = await restResponse.json();

            if (operation.error) {
                console.error(`[VEO-I2V] REST Initiation Error:`, JSON.stringify(operation.error, null, 2));
                throw new Error(operation.error.message || "REST Initiation Failed");
            }

            console.log(`[VEO-I2V] Operation started: ${operation.name}`);
            broadcastProgress(taskId, 2, 3, 'Animating scene (Veo 3.1 Render)...');

            // Poll until done (max ~5 minutes)
            let attempts = 0;
            const maxAttempts = 60; // 60 × 6s = 6 minutes
            let isDone = false;
            let operationResult = operation;

            while (!isDone && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 6000)); // 6s interval

                try {
                    let pollUrl;
                    let pollHeaders = {};
                    if (apiKey) {
                        pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationResult.name}?key=${apiKey}`;
                    } else {
                        pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationResult.name}`;
                        pollHeaders['Authorization'] = `Bearer ${token}`;
                    }

                    const pollResp = await fetch(pollUrl, { headers: pollHeaders });
                    if (!pollResp.ok) throw new Error(`HTTP Error: ${pollResp.status}`);
                    operationResult = await pollResp.json();

                    if (operationResult.error) {
                        console.error(`[VEO-I2V] Polling Error:`, JSON.stringify(operationResult.error, null, 2));
                        throw new Error(operationResult.error.message || "Veo Poll Failed");
                    }

                    isDone = operationResult.done;
                } catch (pollError) {
                    console.warn(`[VEO-I2V] Polling retry due to error: ${pollError.message}`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }

                attempts++;

                if (attempts % 3 === 0) {
                    const elapsed = attempts * 6;
                    console.log(`[VEO-I2V] [${taskId}] Still generating... (${elapsed}s elapsed)`);
                    broadcastProgress(taskId, 2, 3, `Rendering video... (${elapsed}s)`);
                }
            }

            if (!isDone) throw new Error('Video generation timed out after 6 minutes.');

            const video = findVideoInResponse(operationResult);

            if (!video) {
                console.error(`[VEO-I2V] No video data found. Full response:`, JSON.stringify(operationResult, null, 2));
                throw new Error('No video returned from Veo 3.1. Structure mismatch or filtered.');
            }

            let videoUrl = null;
            if (video.videoBytes || video.bytesBase64Encoded) {
                const b64 = video.videoBytes ? Buffer.from(video.videoBytes).toString('base64') : video.bytesBase64Encoded;
                let videoBuffer = Buffer.from(b64, 'base64');
                
                if (generateAudio === false) {
                    console.log('[VEO-I2V] generateAudio is false. Stripping audio from video bytes...');
                    try {
                        videoBuffer = await stripAudioFromBuffer(videoBuffer);
                        console.log('[VEO-I2V] Audio successfully stripped.');
                    } catch (ffmpegErr) {
                        console.error('[VEO-I2V] Failed to strip audio using FFmpeg:', ffmpegErr);
                    }
                }
                
                const publicUrl = await uploadVideoToSupabase(videoBuffer, userId, validAspectRatio);
                videoUrl = publicUrl;
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
                const videoBufferArray = await videoResp.arrayBuffer();
                let videoBuffer = Buffer.from(videoBufferArray);
                
                if (generateAudio === false) {
                    console.log('[VEO-I2V] generateAudio is false. Stripping audio from downloaded video bytes...');
                    try {
                        videoBuffer = await stripAudioFromBuffer(videoBuffer);
                        console.log('[VEO-I2V] Audio successfully stripped.');
                    } catch (ffmpegErr) {
                        console.error('[VEO-I2V] Failed to strip audio using FFmpeg:', ffmpegErr);
                    }
                }
                
                const publicUrl = await uploadVideoToSupabase(videoBuffer, userId, validAspectRatio);
                videoUrl = publicUrl;
            }

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
            const requiredCredits = 15; // Kling costs 15 credits

            if (targetUserId) {
                console.log(`[KLING-GEN] Consuming ${requiredCredits} credits for user: ${targetUserId}`);
                await consumeCredits(targetUserId, requiredCredits);
            }

            console.log(`[KLING-ASYNC] Resolving assets for user ${targetUserId}...`);
            const [imgUrl, tailUrl] = await Promise.all([
                resolveToPublicUrl(firstFrame, targetUserId),
                resolveToPublicUrl(lastFrame, targetUserId)
            ]);

            if (!imgUrl) throw new Error("Kling requires at least one starting image URL.");

            let image_urls = [imgUrl];
            if (tailUrl) image_urls.push(tailUrl);

            const payload = {
                model: model || "kling-3.0/video",
                input: {
                    prompt,
                    image_urls,
                    mode: "pro",
                    sound: false,
                    multi_shots: false,
                    duration: String(duration).includes("10") ? "10" : "5",
                    negative_prompt: negative_prompt || "low quality, blur, distort",
                    cfg_scale: parseFloat(cfg_scale) || 0.5
                }
            };

            console.log(`[KLING-ASYNC] Creating task...`);
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

            if (pollData.code !== 200) throw new Error(`Kling Polling Failed: ${pollData.msg}`);
            if (!pollData.data) throw new Error("Kling Polling Success but no data returned.");

            const state = pollData.data.state;
            console.log(`[KLING-STATUS] ${requestId}: ${state}`);

            if (state === 'success') {
                const resultJson = JSON.parse(pollData.data.resultJson);
                const finalUrl = resultJson.resultUrls[0];
                
                if (!finalUrl) throw new Error("No result URL found.");
                
                // Archive to Supabase
                const videoResp = await fetch(finalUrl);
                const ab = await videoResp.arrayBuffer();
                const supabaseUrl = await uploadVideoToSupabase(Buffer.from(ab), userId, aspectRatio);
                
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

    return router;
}
