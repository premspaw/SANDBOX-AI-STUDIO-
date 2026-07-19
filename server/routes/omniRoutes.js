import express from 'express';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { GoogleGenAI } from '@google/genai';
import { Storage } from '@google-cloud/storage';

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

function sanitizeMime(mime, defaultMime) {
    if (!mime || mime === 'application/octet-stream') {
        return defaultMime;
    }
    return mime;
}

async function uploadToGoogleFileApi(base64Data, mimeType, apiKey, token) {
    const buffer = Buffer.from(base64Data, 'base64');
    const metadata = {
        file: {
            displayName: `motion_ref_${Date.now()}`
        }
    };
    
    const boundary = `----GoogleFileApiBoundary${Date.now().toString(16)}`;
    const metadataPart = [
        `--${boundary}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify(metadata),
        ''
    ].join('\r\n');
    
    const mediaPartHeader = [
        `--${boundary}`,
        `Content-Type: ${mimeType}`,
        'Content-Transfer-Encoding: binary',
        '',
        ''
    ].join('\r\n');
    
    const footer = `\r\n--${boundary}--`;
    
    const bodyBuffer = Buffer.concat([
        Buffer.from(metadataPart),
        Buffer.from(mediaPartHeader),
        buffer,
        Buffer.from(footer)
    ]);
    
    let uploadUrl = 'https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=multipart';
    const headers = {
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else if (apiKey) {
        uploadUrl += `&key=${apiKey}`;
    }
    
    console.log(`[OMNI-I2V] Uploading reference video to Google File API... (size: ${bodyBuffer.length} bytes)`);
    const response = await fetch(uploadUrl, {
        method: 'POST',
        headers,
        body: bodyBuffer
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google File API upload failed (${response.status}): ${errorText}`);
    }
    
    const fileResource = await response.json();
    const fileUri = fileResource.file.uri;
    const fileId = fileResource.file.name.split('/').pop();
    console.log(`[OMNI-I2V] Reference video uploaded. File ID: ${fileId}. Poll checking status...`);
    
    // Poll file state until ACTIVE (typically 1-2 checks)
    let fileActive = false;
    let attempts = 0;
    while (!fileActive && attempts < 15) {
        await new Promise(res => setTimeout(res, 1000));
        attempts++;
        let checkUrl = `https://generativelanguage.googleapis.com/v1beta/files/${fileId}`;
        const checkHeaders = {};
        if (token) {
            checkHeaders['Authorization'] = `Bearer ${token}`;
        } else if (apiKey) {
            checkUrl += `?key=${apiKey}`;
        }
        
        const checkResp = await fetch(checkUrl, { headers: checkHeaders });
        if (checkResp.ok) {
            const info = await checkResp.json();
            console.log(`[OMNI-I2V] File ${fileId} state: ${info.state}`);
            if (info.state === 'ACTIVE') {
                fileActive = true;
            } else if (info.state === 'FAILED') {
                throw new Error('Google File API processing failed');
            }
        }
    }
    
    if (!fileActive) {
        throw new Error(`Google File API processing timed out for file ID: ${fileId}`);
    }
    
    return fileUri;
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
        claimOrCreateSpend,
        VERTEX_PROJECT_ID,
        VERTEX_LOCATION,
        VERTEX_KEY
    } = deps;

    async function uploadToGcs(buffer, mimeType) {
        const authOptions = {
            projectId: VERTEX_PROJECT_ID || 'freeeapi-499012'
        };
        if (VERTEX_KEY) {
            if (typeof VERTEX_KEY === 'string') {
                authOptions.keyFilename = VERTEX_KEY;
            } else {
                authOptions.credentials = VERTEX_KEY;
            }
        }
        const storage = new Storage(authOptions);
        const bucketName = 'freeeapi-499012-video-gen-bucket';
        const bucket = storage.bucket(bucketName);
        const filename = `motion-ref-videos/${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;
        const file = bucket.file(filename);

        console.log(`[OMNI-I2V] Uploading reference video to GCS bucket: ${bucketName}/${filename}...`);
        await file.save(buffer, {
            metadata: {
                contentType: mimeType || 'video/mp4'
            }
        });
        
        const gsUri = `gs://${bucketName}/${filename}`;
        console.log(`[OMNI-I2V] Reference video uploaded to GCS: ${gsUri}`);
        return gsUri;
    }

    // Build a dedicated Vertex AI client for the Interactions API (Omni Flash)
    // Must use location='global' and Api-Revision: 2026-05-20 as per the Python SDK reference.
    function createVertexOmniClient() {
        const vertexKey = deps.VERTEX_KEY;
        const authOptions = {};
        if (vertexKey) {
            if (typeof vertexKey === 'string') {
                authOptions.keyFilename = vertexKey;
            } else {
                authOptions.credentials = vertexKey;
            }
        }
        return new GoogleGenAI({
            vertexai: true,
            project: VERTEX_PROJECT_ID,
            location: 'global',
            googleAuthOptions: authOptions,
            httpOptions: {
                headers: {
                    'Api-Revision': '2026-05-20'
                }
            }
        });
    }

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
            const isOmniFlash = modelLower.includes('flash');

            const adminPassword = req?.headers?.['x-admin-password'] || '';
            const isHeaderAdmin = adminPassword === 'admin123' || adminPassword === '10000';
            
            let isAdmin = isHeaderAdmin;
            if (!isAdmin && user) {
                if (user.role === 'admin' || (user.email && user.email.startsWith('premspaw@gmail'))) {
                    isAdmin = true;
                }
            }
            if (!isAdmin && targetUserId) {
                const adminClient = deps.supabaseAdmin || deps.supabase;
                if (adminClient) {
                    try {
                        const { data: profile } = await adminClient
                            .from('profiles')
                            .select('role, email')
                            .eq('id', targetUserId)
                            .single();
                        if (profile?.role === 'admin' || profile?.email?.startsWith('premspaw@gmail')) {
                            isAdmin = true;
                        }
                    } catch (err) {
                        console.warn('[OMNI-I2V] Role lookup failed:', err.message);
                    }
                }
            }

            if (isAdmin && isOmniFlash) {
                console.log(`[OMNI-I2V] 👑 Admin requesting Omni Flash. Enforcing Vertex AI only, bypassing Google AI Studio API.`);
            }

            const apiKey = (isAdmin && isOmniFlash) ? null : await resolveGoogleApiKey(req, targetUserId, true);
            const token = await getVertexToken();
            
            if (isAdmin && isOmniFlash && !token) {
                throw new Error('Vertex AI Service Account token is required for Admin Omni Flash generations.');
            }
            if (!token && !apiKey) throw new Error('Failed to acquire service account token or API key');

            broadcastProgress(taskId, 1, 3, 'Gemini Omni engine initializing...');
            
            // Omni doesn't accept duration_seconds as an API param.
            // Duration is controlled by embedding timecode instructions in the prompt.
            const rawTextPrompt = motionPrompt || prompt;
            const durationPrefix = `[0-${validDuration}s] `;
            const durationSuffix = ` Generate exactly a ${validDuration}-second video, single continuous shot, no scene cuts beyond what is described.`;
            const textPrompt = rawTextPrompt ? `${durationPrefix}${rawTextPrompt}${durationSuffix}` : rawTextPrompt;

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
                                          (req.body.identity_images && req.body.identity_images.length > 0) ||
                                          (req.body.ref_images && req.body.ref_images.length > 0);

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

            async function uploadVideoReference(base64Data, mimeType) {
                const buffer = Buffer.from(base64Data, 'base64');
                if (uploadVideoToSupabase) {
                    try {
                        console.log(`[OMNI-I2V] Uploading reference video (${buffer.length} bytes) to Cloudflare R2...`);
                        const r2Url = await uploadVideoToSupabase(buffer, targetUserId || 'anon', validAspectRatio, 'reference', 'Omni Reference Video', 'Omni Flash');
                        if (r2Url) {
                            console.log(`[OMNI-I2V] ✅ Reference video uploaded to Cloudflare R2: ${r2Url}`);
                            return r2Url;
                        }
                    } catch (r2Err) {
                        console.warn(`[OMNI-I2V] Cloudflare R2 upload failed (${r2Err.message}), trying GCS / File API...`);
                    }
                }
                if (token || VERTEX_PROJECT_ID) {
                    try {
                        const gsUri = await uploadToGcs(buffer, mimeType);
                        return gsUri;
                    } catch (gcsErr) {
                        console.warn(`[OMNI-I2V] GCS upload failed (${gcsErr.message}), falling back to Google File API...`);
                    }
                }
                return await uploadToGoogleFileApi(base64Data, mimeType, apiKey, token);
            }

            if (primaryImageResolved) {
                const isVideo = primaryImageResolved.mimeType && primaryImageResolved.mimeType.startsWith('video/');
                if (isVideo) {
                    // Omni Flash does NOT support inline video/mp4 base64 — must upload via GCS / File API
                    broadcastProgress(taskId, 1.5, 3, 'Uploading reference video...');
                    try {
                        const fileUri = await uploadVideoReference(
                            primaryImageResolved.data,
                            sanitizeMime(primaryImageResolved.mimeType, 'video/mp4')
                        );
                        inputParts.push({ type: 'video', uri: fileUri });
                        console.log(`[OMNI-I2V] Reference video uploaded: ${fileUri}`);
                    } catch (fileApiErr) {
                        console.warn(`[OMNI-I2V] Reference video upload failed, skipping: ${fileApiErr.message}`);
                    }
                } else {
                    inputParts.push({
                        type: 'image',
                        data: primaryImageResolved.data,
                        mime_type: sanitizeMime(primaryImageResolved.mimeType, 'image/png')
                    });
                }
            }

            // 2. Count image references resolved so far
            const imageCount = inputParts.filter(p => p.type === 'image').length;
            const videoCount = inputParts.filter(p => p.type === 'video' || p.type === 'document').length;

            // 3. Add other references only if task is reference_to_video or edit (or auto-inferring and we have image(s)/video(s))
            // Under user rules, we strictly filter board references based on mentions in the chat box!
            const allowedToRefImages = promptHasImageMention && (
                requestedTask === 'reference_to_video' || 
                requestedTask === 'edit' || 
                (imageCount > 0) || 
                (videoCount > 0)
            );
            const hasRefVideosInBody = Boolean(req.body.ref_videos && req.body.ref_videos.length > 0) || Boolean(req.body.refVideo);
            const allowedToRefVideos = (promptLower.includes('@video') || promptLower.includes('@ref_video') || hasRefVideosInBody) && (
                requestedTask === 'reference_to_video' || 
                requestedTask === 'edit' || 
                requestedTask === 'auto' ||
                (imageCount > 0) || 
                (videoCount > 0) ||
                hasRefVideosInBody
            );
            const allowedToRefAudios = promptLower.includes('@audio') && (
                requestedTask === 'reference_to_video' || 
                requestedTask === 'edit' || 
                (imageCount > 0) || 
                (videoCount > 0)
            );

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
                                const isVid = resolved.mimeType && resolved.mimeType.startsWith('video/');
                                if (isVid) {
                                    try {
                                        const fileUri = await uploadVideoReference(
                                            resolved.data,
                                            sanitizeMime(resolved.mimeType, 'video/mp4')
                                        );
                                        inputParts.push({ type: 'video', uri: fileUri });
                                        console.log(`[OMNI-I2V] Tagged video uploaded to File API: ${fileUri}`);
                                    } catch (fileApiErr) {
                                        console.warn(`[OMNI-I2V] File API upload failed for tagged video: ${fileApiErr.message}`);
                                    }
                                } else {
                                    inputParts.push({
                                        type: 'image',
                                        data: resolved.data,
                                        mime_type: sanitizeMime(resolved.mimeType, 'image/png')
                                    });
                                }
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
                            const isVid = resolved.mimeType && resolved.mimeType.startsWith('video/');
                            if (isVid) {
                                try {
                                    const fileUri = await uploadVideoReference(
                                        resolved.data,
                                        sanitizeMime(resolved.mimeType, 'video/mp4')
                                    );
                                    inputParts.push({ type: 'video', uri: fileUri });
                                    console.log(`[OMNI-I2V] Legacy ref video uploaded to File API: ${fileUri}`);
                                } catch (fileApiErr) {
                                    console.warn(`[OMNI-I2V] File API upload failed for legacy ref video: ${fileApiErr.message}`);
                                }
                            } else {
                                inputParts.push({
                                    type: 'image',
                                    data: resolved.data,
                                    mime_type: sanitizeMime(resolved.mimeType, 'image/png')
                                });
                            }
                        }
                    }
                }
            }

            if (allowedToRefVideos) {
                // Reference videos from board or direct upload must go through GCS / File API
                const refVideos = req.body.ref_videos || (req.body.refVideo ? [{ url: req.body.refVideo }] : []);
                for (const refVid of refVideos) {
                    const vidUrl = refVid.url || refVid.imageUrl || refVid;
                    if (vidUrl) {
                        try {
                            const resolved = await resolveMediaToBase64(vidUrl);
                            if (resolved) {
                                const fileUri = await uploadVideoReference(
                                    resolved.data,
                                    sanitizeMime(resolved.mimeType, 'video/mp4')
                                );
                                inputParts.push({ type: 'video', uri: fileUri });
                                console.log(`[OMNI-I2V] Ref video uploaded to GCS / File API: ${fileUri}`);
                            }
                        } catch (fileApiErr) {
                            console.warn(`[OMNI-I2V] File API upload failed for ref video, skipping: ${fileApiErr.message}`);
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
                                mime_type: sanitizeMime(resolved.mimeType, 'audio/mp3')
                            });
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
            const finalVideoCount = inputParts.filter(p => p.type === 'video' || p.type === 'document').length;
            const finalAudioCount = inputParts.filter(p => p.type === 'audio').length;

            let taskType = 'text_to_video';
            if (finalVideoCount > 0 && finalImageCount === 0) {
                taskType = 'edit';
            } else if (finalImageCount === 1 && finalVideoCount === 0 && finalAudioCount === 0) {
                taskType = 'image_to_video';
            } else if (finalImageCount > 0 || finalVideoCount > 0 || finalAudioCount > 0) {
                taskType = 'reference_to_video';
            }

            let finalTaskType = req.body.task && req.body.task !== 'auto' ? req.body.task : taskType;

            // Vertex AI Interactions API parameter constraints:
            // 1. 'reference_to_video' requires at least 1 image or audio reference.
            if (finalTaskType === 'reference_to_video' && finalImageCount === 0 && finalAudioCount === 0 && finalVideoCount === 0) {
                finalTaskType = 'text_to_video';
            }

            // 2. 'image_to_video' requires at least 1 image
            if (finalTaskType === 'image_to_video' && finalImageCount === 0) {
                finalTaskType = 'text_to_video';
            }

            // 3. 'edit' requires exactly 1 input video
            if (finalTaskType === 'edit' && finalVideoCount === 0) {
                console.warn(`[OMNI-I2V] Task 'edit' requested but finalVideoCount is 0. Falling back to reference_to_video or text_to_video.`);
                finalTaskType = finalImageCount > 0 ? 'reference_to_video' : 'text_to_video';
            }

            const modelName = modelLower.includes('flash') ? 'gemini-omni-flash-preview' : 'gemini-omni-preview';

            const responseFormat = {
                type: "video",
                delivery: token ? "inline" : "uri"
            };

            if (finalTaskType !== 'edit') {
                responseFormat.aspect_ratio = validAspectRatio;
            }

            const reqBody = {
                model: modelName,
                input: finalInput,
                response_format: responseFormat,
                generation_config: {
                    video_config: {
                        task: finalTaskType,
                    }
                }
            };

            let videoBuffer = null;
            let success = false;

            // --- Option A: Vertex AI SDK via 'global' location with Api-Revision header ---
            // This mirrors the Python SDK: genai.Client(vertexai=True, project=..., location='global')
            if (token || VERTEX_PROJECT_ID) {
                try {
                    const vertexOmniClient = createVertexOmniClient();
                    
                    // Build the structured input in the format required by interactions API
                    // The Python SDK format: input=[{type:'user_input', content:[{type:'text', data:'...'}]}]
                    let sdkContent;
                    if (typeof finalInput === 'string') {
                        // Plain text prompt — wrap as text content object
                        sdkContent = [{ type: 'text', text: finalInput }];
                    } else if (Array.isArray(finalInput)) {
                        // Multimodal parts — remap to interactions API content format
                        sdkContent = finalInput.map(part => {
                            if (part.type === 'text') return { type: 'text', text: part.text };
                            if (part.type === 'image') return { type: 'image', data: part.data, mime_type: part.mime_type };
                            if (part.type === 'video' || part.type === 'document') {
                                if (part.data) return { type: 'document', data: part.data };
                                if (part.uri) return { type: 'document', uri: part.uri };
                                return null;
                            }
                            if (part.type === 'audio') return { type: 'audio', data: part.data, mime_type: part.mime_type };
                            return part;
                        }).filter(Boolean);
                    } else {
                        sdkContent = [{ type: 'text', text: String(finalInput) }];
                    }
                    
                    const sdkInput = [
                        {
                            type: 'user_input',
                            content: sdkContent
                        }
                    ];

                    // Construct response_format from reqBody
                    const responseFormat = reqBody.response_format;
                    const generationConfig = reqBody.generation_config;

                    console.log(`[OMNI-I2V] [Vertex AI SDK] Calling interactions.create on model ${reqBody.model} via location=global`);
                    console.log(`[OMNI-I2V] [Vertex AI SDK] sdkInput:`, JSON.stringify(sdkInput, null, 2).substring(0, 1000) + '... (truncated)');
                    
                    const interactionResult = await vertexOmniClient.interactions.create({
                        model: reqBody.model,
                        input: sdkInput,
                        response_format: responseFormat,
                        generation_config: generationConfig
                    });

                    const steps = interactionResult.steps || [];
                    let videoData = null;
                    let videoUri = null;

                    for (const step of steps) {
                        if (step.type === 'model_output' && step.content) {
                            const contentItems = Array.isArray(step.content) ? step.content : [step.content];
                            for (const content of contentItems) {
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
                        console.error('[OMNI-I2V] [Vertex AI SDK] Raw result:', JSON.stringify(interactionResult).substring(0, 500));
                        throw new Error("No video output returned from Omni engine.");
                    }

                    if (videoData) {
                        videoBuffer = Buffer.from(videoData, 'base64');
                        success = true;
                        console.log(`[OMNI-I2V] [Vertex AI SDK] Video generated via base64 (${videoBuffer.length} bytes)`);
                    } else if (videoUri) {
                        // For URI delivery, download via Vertex AI signed URL
                        broadcastProgress(taskId, 2, 3, 'Processing video file (Omni Render)...');

                        // Poll for file readiness if needed
                        const match = videoUri.match(/\/files\/([^:/]+)/);
                        const fileId = match ? match[1] : null;

                        if (fileId) {
                            let fileActive = false;
                            let pollAttempts = 0;
                            const maxPollAttempts = 60;
                            while (!fileActive && pollAttempts < maxPollAttempts) {
                                await new Promise(resolve => setTimeout(resolve, 5000));
                                pollAttempts++;

                                // Poll via Vertex AI token
                                const filePollUrl = `https://generativelanguage.googleapis.com/v1beta/files/${fileId}`;
                                const filePollHeaders = token 
                                    ? { 'Authorization': `Bearer ${token}` }
                                    : {};

                                const pollResp = await fetch(filePollUrl, { headers: filePollHeaders });
                                if (!pollResp.ok) {
                                    console.warn(`[OMNI-I2V] File polling status error: ${pollResp.status}`);
                                    continue;
                                }
                                const fileInfo = await pollResp.json();
                                const stateName = fileInfo.state?.name || fileInfo.state;
                                console.log(`[OMNI-I2V] [Vertex AI SDK] File ${fileId} state: ${stateName} (${pollAttempts * 5}s elapsed)`);

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
                        }

                        console.log(`[OMNI-I2V] [Vertex AI SDK] Downloading video from URI: ${videoUri}`);
                        const downloadHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
                        const videoResp = await fetch(videoUri, { headers: downloadHeaders });
                        if (!videoResp.ok) throw new Error(`Video download failed: ${videoResp.statusText}`);
                        videoBuffer = Buffer.from(await videoResp.arrayBuffer());
                        success = true;
                        console.log(`[OMNI-I2V] [Vertex AI SDK] Video downloaded via URI (${videoBuffer.length} bytes)`);
                    }
                } catch (serviceErr) {
                    console.error(`[OMNI-I2V] [Vertex AI SDK] Vertex AI Omni generation failed:`, serviceErr);
                    throw serviceErr;
                }
            }

            // --- Option B: User API Key (Fallback) ---
            if (!success && apiKey && apiKey !== 'VERTEX_AI_CLIENT') {
                try {
                    const endpoint = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;
                    const headers = { 'Content-Type': 'application/json' };

                    // Force URI delivery mode for Google AI Studio API Key fallback
                    reqBody.response_format.delivery = "uri";

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
            
            let msg = error.message || 'Video generation failed';
            if (msg.includes('Responsible AI') || msg.includes('violates Google')) {
                msg = "Google's Responsible AI policy blocked this prompt or reference media. Please modify your text prompt or reference images and try again.";
            }
            res.status(400).json({ error: msg });
        }
    });

    return router;
}
