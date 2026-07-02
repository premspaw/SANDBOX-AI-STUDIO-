import express from 'express';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os';

ffmpeg.setFfmpegPath(ffmpegStatic);

async function stripAudioFromBuffer(inputBuffer) {
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `omni_in_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`);
    const outputPath = path.join(tempDir, `omni_out_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`);
    
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

async function resolveMediaToBase64(mediaUrl) {
    if (!mediaUrl) return null;
    let data = '';
    let mimeType = 'application/octet-stream';

    if (mediaUrl.startsWith('data:')) {
        const match = mediaUrl.match(/^data:([^;]+);base64,/);
        if (match) mimeType = match[1];
        data = mediaUrl.split(',')[1];
    } else if (mediaUrl.startsWith('http') || mediaUrl.startsWith('//')) {
        const fullUrl = mediaUrl.startsWith('//') ? `https:${mediaUrl}` : mediaUrl;
        const resp = await fetch(fullUrl);
        if (!resp.ok) throw new Error(`Failed to fetch media from URL: ${resp.statusText}`);
        const buffer = await resp.arrayBuffer();
        data = Buffer.from(buffer).toString('base64');
        const contentType = resp.headers.get('content-type');
        if (contentType) mimeType = contentType;
    } else {
        data = mediaUrl; // Assume raw base64
    }
    return { data, mimeType };
}

export default function createRouter(deps) {
    const router = express.Router();
    const {
        getVertexToken,
        uploadVideoToSupabase,
        broadcastProgress,
        broadcastComplete,
        requireAuth,
        resolveGoogleApiKey,
        claimOrCreateSpend
    } = deps;

    // Gemini Omni/Omni Flash Image-to-Video: Animate a keyframe image into a clip
    router.post('/omni-i2v', async (req, res) => {
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
            if (!motionPrompt && !prompt) throw new Error('No motion prompt provided');

            const targetUserId = user ? user.id : userId;

            // Deduct credits: omni/omni-flash are cost-per-second, veo standard is 80, veo fast is 20
            let requiredCredits = 10; // Default (reduced from 20)
            const modelLower = (model || '').toLowerCase();
            if (modelLower.includes('omni-flash')) {
                let costPerSec = 6; // default 720p (halved from 12)
                const res = String(resolution || '1080p').toLowerCase();
                if (res === '4k') {
                    costPerSec = generateAudio ? 19 : 15;
                } else if (res === '1080p') {
                    costPerSec = generateAudio ? 8 : 6;
                } else { // 720p
                    costPerSec = generateAudio ? 6 : 5;
                }
                requiredCredits = Math.ceil(costPerSec * 1.1 * Number(duration));
            } else if (modelLower.includes('omni')) {
                requiredCredits = 3 * Number(duration);
            }

            if (targetUserId) {
                const creditReason = req.body.creditReason || 'cinematic_video_generation';
                console.log(`[OMNI-I2V] Consuming/Claiming ${requiredCredits} credits for user: ${targetUserId} (reason: ${creditReason})`);
                await claimOrCreateSpend(targetUserId, requiredCredits, creditReason);
            }

            const taskId = nodeId ? `veo-${nodeId}` : 'veo-default';
            const validAspectRatio = ['16:9', '9:16', '1:1'].includes(aspectRatio) ? aspectRatio : '16:9';

            console.log(`[OMNI-I2V] Starting | taskId: ${taskId} | duration: ${duration}s | ratio: ${validAspectRatio} | model: ${model} | image: ${!!image}`);

            const apiKey = await resolveGoogleApiKey(req, targetUserId);
            const token = await getVertexToken();
            if (!token && !apiKey) throw new Error('Failed to acquire service account token or API key');

            broadcastProgress(taskId, 1, 3, 'Gemini Omni engine initializing...');
            
            // Construct input parts for Gemini Omni Flash (multimodal)
            let inputParts = [];
            const inputImage = image || req.body.firstFrameImage;
            
            if (inputImage) {
                const resolved = await resolveMediaToBase64(inputImage);
                if (resolved) {
                    inputParts.push({
                        type: 'image',
                        data: resolved.data,
                        mime_type: resolved.mimeType || 'image/png'
                    });
                }
            }

            // Reference images from board (ref_images)
            const refImages = req.body.ref_images || [];
            for (const refImg of refImages) {
                const imgUrl = refImg.url || refImg.imageUrl;
                if (imgUrl && imgUrl !== inputImage) {
                    const resolved = await resolveMediaToBase64(imgUrl);
                    if (resolved) {
                        inputParts.push({
                            type: 'image',
                            data: resolved.data,
                            mime_type: resolved.mimeType || 'image/png'
                        });
                    }
                }
            }

            // Legacy/alternate reference images
            const legacyRefImgs = req.body.referenceImages || req.body.identity_images;
            if (legacyRefImgs && legacyRefImgs.length > 0) {
                for (const refImg of legacyRefImgs) {
                    if (refImg === inputImage) continue;
                    const resolved = await resolveMediaToBase64(refImg);
                    if (resolved) {
                        inputParts.push({
                            type: 'image',
                            data: resolved.data,
                            mime_type: resolved.mimeType || 'image/png'
                        });
                    }
                }
            }

            // Reference videos from board (ref_videos)
            const refVideos = req.body.ref_videos || [];
            for (const refVid of refVideos) {
                const vidUrl = refVid.url || refVid.imageUrl;
                if (vidUrl) {
                    const resolved = await resolveMediaToBase64(vidUrl);
                    if (resolved) {
                        inputParts.push({
                            type: 'video',
                            data: resolved.data,
                            mime_type: resolved.mimeType || 'video/mp4'
                        });
                    }
                }
            }

            // Reference audios from board (ref_audios)
            const refAudios = req.body.ref_audios || [];
            for (const refAud of refAudios) {
                const audUrl = refAud.url || refAud.imageUrl;
                if (audUrl) {
                    const resolved = await resolveMediaToBase64(audUrl);
                    if (resolved) {
                        inputParts.push({
                            type: 'audio',
                            data: resolved.data,
                            mime_type: resolved.mimeType || 'audio/mp3'
                        });
                    }
                }
            }

            // Append prompt text
            const textPrompt = motionPrompt || prompt;
            if (textPrompt) {
                inputParts.push({
                    type: 'text',
                    text: textPrompt
                });
            }

            let finalInput;
            if (inputParts.length === 1 && inputParts[0].type === 'text') {
                finalInput = inputParts[0].text;
            } else {
                finalInput = inputParts;
            }

            let taskType = 'text_to_video';
            if (inputImage) {
                taskType = 'image_to_video';
            } else if (refVideos.length > 0 || refAudios.length > 0) {
                taskType = 'reference_to_video';
            }
            
            const modelName = modelLower.includes('flash') ? 'gemini-omni-flash-preview' : 'gemini-omni-preview';

            const reqBody = {
                model: modelName,
                input: finalInput,
                responseFormat: {
                    type: "video",
                    aspectRatio: validAspectRatio,
                    delivery: "uri"
                },
                generationConfig: {
                    videoConfig: {
                        task: req.body.task && req.body.task !== 'auto' ? req.body.task : taskType
                    }
                }
            };

            let endpoint;
            let headers = { 'Content-Type': 'application/json' };

            if (apiKey) {
                endpoint = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;
            } else {
                endpoint = `https://generativelanguage.googleapis.com/v1beta/interactions`;
                headers['Authorization'] = `Bearer ${token}`;
            }

            console.log(`[OMNI-I2V] Sending request to ${endpoint}`);
            const restResponse = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(reqBody)
            });

            const interactionResult = await restResponse.json();

            if (interactionResult.error) {
                console.error(`[OMNI-I2V] Interactions API Error:`, JSON.stringify(interactionResult.error, null, 2));
                throw new Error(interactionResult.error.message || "Interactions API Failed");
            }

            const steps = interactionResult.steps || [];
            let videoData = null;
            let videoUri = null;

            for (const step of steps) {
                if (step.type === 'model_output' && step.content) {
                    for (const content of step.content) {
                        if (content.type === 'video') {
                            if (content.data) {
                                videoData = content.data;
                            } else if (content.uri) {
                                videoUri = content.uri;
                            }
                        }
                    }
                }
            }

            if (!videoData && !videoUri) {
                console.error(`[OMNI-I2V] No video found in response:`, JSON.stringify(interactionResult, null, 2));
                throw new Error("No video output returned from Omni engine.");
            }

            let videoBuffer;

            if (videoData) {
                videoBuffer = Buffer.from(videoData, 'base64');
            } else if (videoUri) {
                const match = videoUri.match(/\/files\/([^:/]+)/);
                const fileId = match ? match[1] : null;
                if (!fileId) throw new Error("Could not parse file ID from video URI: " + videoUri);

                broadcastProgress(taskId, 2, 3, 'Processing video file (Omni Render)...');
                
                let fileActive = false;
                let pollAttempts = 0;
                const maxPollAttempts = 60; // 5 minutes
                while (!fileActive && pollAttempts < maxPollAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    pollAttempts++;
                    
                    let filePollUrl;
                    let filePollHeaders = {};
                    if (apiKey) {
                        filePollUrl = `https://generativelanguage.googleapis.com/v1beta/files/${fileId}?key=${apiKey}`;
                    } else {
                        filePollUrl = `https://generativelanguage.googleapis.com/v1beta/files/${fileId}`;
                        filePollHeaders['Authorization'] = `Bearer ${token}`;
                    }

                    const pollResp = await fetch(filePollUrl, { headers: filePollHeaders });
                    if (!pollResp.ok) {
                        console.warn(`[OMNI-I2V] File polling status error: ${pollResp.status}`);
                        continue;
                    }
                    const fileInfo = await pollResp.json();
                    const stateName = fileInfo.state?.name || fileInfo.state;
                    console.log(`[OMNI-I2V] [${taskId}] File ${fileId} state: ${stateName} (${pollAttempts * 5}s elapsed)`);
                    
                    if (stateName === 'ACTIVE') {
                        fileActive = true;
                    } else if (stateName === 'FAILED') {
                        throw new Error('Omni video generation file failed processing.');
                    }
                    
                    if (pollAttempts % 2 === 0) {
                        broadcastProgress(taskId, 2, 3, `Rendering video... (${pollAttempts * 5}s)`);
                    }
                }

                if (!fileActive) throw new Error('Omni video processing timed out.');

                console.log(`[OMNI-I2V] Downloading URI: ${videoUri}`);
                let downloadUrl = videoUri;
                let downloadHeaders = {};
                if (apiKey) {
                    downloadUrl = videoUri.includes('?') ? `${videoUri}&key=${apiKey}` : `${videoUri}?key=${apiKey}`;
                } else {
                    downloadHeaders['Authorization'] = `Bearer ${token}`;
                }

                const videoResp = await fetch(downloadUrl, { headers: downloadHeaders });
                if (!videoResp.ok) throw new Error(`Video download failed: ${videoResp.statusText}`);
                const videoBufferArray = await videoResp.arrayBuffer();
                videoBuffer = Buffer.from(videoBufferArray);
            }

            if (generateAudio === false) {
                console.log('[OMNI-I2V] generateAudio is false. Stripping audio...');
                try {
                    videoBuffer = await stripAudioFromBuffer(videoBuffer);
                    console.log('[OMNI-I2V] Audio stripped.');
                } catch (ffmpegErr) {
                    console.error('[OMNI-I2V] Failed to strip audio:', ffmpegErr);
                }
            }

            const publicUrl = await uploadVideoToSupabase(
                videoBuffer,
                userId,
                validAspectRatio,
                'generated',
                motionPrompt || prompt || '',
                modelLower.includes('flash') ? 'Omni Flash' : 'Omni'
            );

            broadcastProgress(taskId, 3, 3, 'Sequence ready!');
            broadcastComplete(taskId);
            console.log(`[OMNI-I2V] ✅ [${taskId}] Success`);

            res.json({ videoUrl: publicUrl });
        } catch (error) {
            console.error('[OMNI-I2V] Error:', error);
            const taskId = req.body.nodeId ? `veo-${req.body.nodeId}` : 'veo-default';
            broadcastProgress(taskId, 0, 0, `Error: ${error.message}`);
            res.status(500).json({ error: error.message || 'Video generation failed' });
        }
    });

    return router;
}
