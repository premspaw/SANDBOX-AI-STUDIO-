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

            const validDuration = Number(duration) >= 3 && Number(duration) <= 10 ? Number(duration) : 8;
            const validResolution = ['720p', '1080p'].includes(resolution) ? resolution : '720p';

            // Deduct credits: omni/omni-flash are cost-per-second, veo standard is 80, veo fast is 20
            let requiredCredits = 10; // Default (reduced from 20)
            const modelLower = (model || '').toLowerCase();
            if (modelLower.includes('omni-flash')) {
                let costPerSec = 6; // default 720p (halved from 12)
                if (validResolution === '4k') {
                    costPerSec = generateAudio ? 19 : 15;
                } else if (validResolution === '1080p') {
                    costPerSec = generateAudio ? 8 : 6;
                } else { // 720p
                    costPerSec = generateAudio ? 6 : 5;
                }
                requiredCredits = Math.ceil(costPerSec * 1.1 * validDuration);
            } else if (modelLower.includes('omni')) {
                requiredCredits = 3 * validDuration;
            }

            if (targetUserId) {
                const creditReason = req.body.creditReason || 'cinematic_video_generation';
                console.log(`[OMNI-I2V] Consuming/Claiming ${requiredCredits} credits for user: ${targetUserId} (reason: ${creditReason})`);
                await claimOrCreateSpend(targetUserId, requiredCredits, creditReason);
            }

            const taskId = nodeId ? `veo-${nodeId}` : 'veo-default';
            const validAspectRatio = ['16:9', '9:16'].includes(aspectRatio) ? aspectRatio : '16:9';

            console.log(`[OMNI-I2V] Starting | taskId: ${taskId} | duration: ${validDuration}s | ratio: ${validAspectRatio} | model: ${model} | image: ${!!image}`);

            const apiKey = await resolveGoogleApiKey(req, targetUserId);
            const token = await getVertexToken();
            if (!token && !apiKey) throw new Error('Failed to acquire service account token or API key');

            broadcastProgress(taskId, 1, 3, 'Gemini Omni engine initializing...');
            
            const textPrompt = motionPrompt || prompt;

            // Construct input parts for Gemini Omni Flash (multimodal)
            let inputParts = [];
            const inputImage = image || req.body.firstFrameImage;
            const requestedTask = req.body.task && req.body.task !== 'auto' ? req.body.task : null;

            // 1. Primary image: only include if not doing pure text_to_video
            let primaryImageResolved = null;
            if (inputImage && requestedTask !== 'text_to_video') {
                primaryImageResolved = await resolveMediaToBase64(inputImage);
            }

            // Check if the user mentioned reference board items in the prompt (e.g., using @image, @loc, @ward, etc.)
            const promptLower = (textPrompt || '').toLowerCase();
            const promptHasImageMention = promptLower.includes('@image') || 
                                          promptLower.includes('@loc') || 
                                          promptLower.includes('@ward') || 
                                          promptLower.includes('@prop') || 
                                          promptLower.includes('@mood') || 
                                          (req.body.identity_images && req.body.identity_images.length > 0);

            let fallbackImgUrl = null;
            // If primary image was not explicitly provided but task is not text_to_video, fallback to first reference image on the board
            // But only if the prompt mentions "@image" or other tagged images to prevent unwanted sending!
            if (!primaryImageResolved && requestedTask !== 'text_to_video' && promptHasImageMention) {
                const refImages = req.body.ref_images || [];
                const legacyRefImgs = req.body.referenceImages || req.body.identity_images || [];
                if (refImages.length > 0) {
                    fallbackImgUrl = refImages[0].url || refImages[0].imageUrl;
                } else if (legacyRefImgs.length > 0) {
                    fallbackImgUrl = legacyRefImgs[0];
                }
                if (fallbackImgUrl) {
                    primaryImageResolved = await resolveMediaToBase64(fallbackImgUrl);
                }
            }

            if (primaryImageResolved) {
                inputParts.push({
                    type: 'image',
                    data: primaryImageResolved.data,
                    mime_type: primaryImageResolved.mimeType || 'image/png'
                });
            }

            // 2. Count image references resolved so far
            const imageCount = inputParts.filter(p => p.type === 'image').length;

            // 3. Add other references only if task is reference_to_video (or auto-inferring and we have image(s))
            // Under user rules, we strictly filter board references based on mentions in the chat box!
            const allowedToRefImages = promptHasImageMention && (requestedTask ? requestedTask === 'reference_to_video' : (imageCount > 0));
            const allowedToRefVideos = promptLower.includes('@video') && (requestedTask ? requestedTask === 'reference_to_video' : (imageCount > 0));
            const allowedToRefAudios = promptLower.includes('@audio') && (requestedTask ? requestedTask === 'reference_to_video' : (imageCount > 0));

            if (allowedToRefImages) {
                // Reference images from board (ref_images)
                const refImages = req.body.ref_images || [];
                for (const refImg of refImages) {
                    const imgUrl = refImg.url || refImg.imageUrl;
                    if (imgUrl && imgUrl !== inputImage && (!fallbackImgUrl || imgUrl !== fallbackImgUrl)) {
                        // If identity_images is provided, only include reference images that are explicitly in identity_images (tagged by @ location/wardrobe/prop/etc)
                        // If identity_images is not provided but @image is in prompt, include all ref_images.
                        const isTagged = req.body.identity_images && req.body.identity_images.length > 0
                            ? req.body.identity_images.some(url => String(url).trim() === String(imgUrl).trim())
                            : true;

                        if (isTagged) {
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
                }

                // Legacy/alternate reference images (usually already pre-filtered tagged images)
                const legacyRefImgs = req.body.referenceImages || req.body.identity_images;
                if (legacyRefImgs && legacyRefImgs.length > 0) {
                    for (const refImg of legacyRefImgs) {
                        if (refImg === inputImage || (fallbackImgUrl && refImg === fallbackImgUrl)) continue;
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
            }

            const updatedImageCount = inputParts.filter(p => p.type === 'image').length;

            // Only add videos and audios if we have at least one image reference to satisfy reference_to_video constraints
            if (updatedImageCount > 0) {
                if (allowedToRefVideos) {
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
                }

                if (allowedToRefAudios) {
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
                }
            }

            // Append prompt text
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

            const finalImageCount = inputParts.filter(p => p.type === 'image').length;
            const finalVideoCount = inputParts.filter(p => p.type === 'video').length;
            const finalAudioCount = inputParts.filter(p => p.type === 'audio').length;

            let taskType = 'text_to_video';
            if (requestedTask) {
                taskType = requestedTask;
            } else {
                if (finalImageCount === 1 && finalVideoCount === 0 && finalAudioCount === 0) {
                    taskType = 'image_to_video';
                } else if (finalImageCount > 1 || finalVideoCount > 0 || finalAudioCount > 0) {
                    taskType = 'reference_to_video';
                }
            }
            
            const modelName = modelLower.includes('flash') ? 'gemini-omni-flash-preview' : 'gemini-omni-preview';

            const reqBody = {
                model: modelName,
                input: finalInput,
                response_format: {
                    type: "video",
                    aspect_ratio: validAspectRatio,
                    delivery: "uri"
                },
                generation_config: {
                    video_config: {
                        task: req.body.task && req.body.task !== 'auto' ? req.body.task : taskType,
                        duration_seconds: validDuration,
                        resolution: validResolution
                    }
                }
            };

            let videoBuffer = null;
            let success = false;

            // --- Option A: Service Account Token / Vertex Token (First Preference) ---
            if (token) {
                try {
                    const endpoint = `https://generativelanguage.googleapis.com/v1beta/interactions`;
                    const headers = {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    };

                    console.log(`[OMNI-I2V] [Service Account] Sending request to ${endpoint}`);
                    const restResponse = await fetch(endpoint, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(reqBody)
                    });

                    const interactionResult = await restResponse.json();
                    if (interactionResult.error) {
                        throw new Error(interactionResult.error.message || "Interactions API Failed on Service Account");
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
                        throw new Error("No video output returned from Omni engine.");
                    }

                    if (videoData) {
                        videoBuffer = Buffer.from(videoData, 'base64');
                        success = true;
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
                            
                            const filePollUrl = `https://generativelanguage.googleapis.com/v1beta/files/${fileId}`;
                            const filePollHeaders = { 'Authorization': `Bearer ${token}` };

                            const pollResp = await fetch(filePollUrl, { headers: filePollHeaders });
                            if (!pollResp.ok) {
                                console.warn(`[OMNI-I2V] File polling status error: ${pollResp.status}`);
                                continue;
                            }
                            const fileInfo = await pollResp.json();
                            const stateName = fileInfo.state?.name || fileInfo.state;
                            console.log(`[OMNI-I2V] [Service Account] [${taskId}] File ${fileId} state: ${stateName} (${pollAttempts * 5}s elapsed)`);
                            
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
                        const downloadHeaders = { 'Authorization': `Bearer ${token}` };
                        const videoResp = await fetch(videoUri, { headers: downloadHeaders });
                        if (!videoResp.ok) throw new Error(`Video download failed: ${videoResp.statusText}`);
                        videoBuffer = Buffer.from(await videoResp.arrayBuffer());
                        success = true;
                    }
                } catch (serviceErr) {
                    console.warn(`[OMNI-I2V] [Service Account] Failed. Error: ${serviceErr.message}. Falling back to API Key...`);
                }
            }

            // --- Option B: User API Key (Fallback) ---
            if (!success && apiKey) {
                try {
                    const endpoint = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;
                    const headers = { 'Content-Type': 'application/json' };

                    console.log(`[OMNI-I2V] [API Key] Sending request to ${endpoint}`);
                    const restResponse = await fetch(endpoint, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(reqBody)
                    });

                    const interactionResult = await restResponse.json();
                    if (interactionResult.error) {
                        throw new Error(interactionResult.error.message || "Interactions API Failed on API Key");
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
                        throw new Error("No video output returned from Omni engine.");
                    }

                    if (videoData) {
                        videoBuffer = Buffer.from(videoData, 'base64');
                        success = true;
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
                            
                            const filePollUrl = `https://generativelanguage.googleapis.com/v1beta/files/${fileId}?key=${apiKey}`;
                            const pollResp = await fetch(filePollUrl);
                            if (!pollResp.ok) {
                                console.warn(`[OMNI-I2V] File polling status error: ${pollResp.status}`);
                                continue;
                            }
                            const fileInfo = await pollResp.json();
                            const stateName = fileInfo.state?.name || fileInfo.state;
                            console.log(`[OMNI-I2V] [API Key] [${taskId}] File ${fileId} state: ${stateName} (${pollAttempts * 5}s elapsed)`);
                            
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
                        const downloadUrl = videoUri.includes('?') ? `${videoUri}&key=${apiKey}` : `${videoUri}?key=${apiKey}`;
                        const videoResp = await fetch(downloadUrl);
                        if (!videoResp.ok) throw new Error(`Video download failed: ${videoResp.statusText}`);
                        videoBuffer = Buffer.from(await videoResp.arrayBuffer());
                        success = true;
                    }
                } catch (apiKeyErr) {
                    console.error(`[OMNI-I2V] [API Key] Failed. Error: ${apiKeyErr.message}`);
                    throw new Error(`Video generation failed on both Service Account and API Key: ${apiKeyErr.message}`);
                }
            }

            if (!success || !videoBuffer) {
                throw new Error('Video generation failed to return valid video buffer.');
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
