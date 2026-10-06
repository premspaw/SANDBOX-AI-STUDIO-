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

const ALLOWED_MIME_TYPES = new Set([
    'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif', 
    'image/gif', 'image/bmp', 'image/tiff', 'video/mp4', 'video/webm', 'video/quicktime', 'audio/mp3', 'audio/wav', 'audio/mpeg'
]);

function sanitizeMime(mime, defaultMime = 'image/jpeg') {
    if (!mime || typeof mime !== 'string') return defaultMime;
    let cleaned = mime.split(';')[0].trim().toLowerCase();
    if (cleaned === 'image/jpg') cleaned = 'image/jpeg';
    
    if (ALLOWED_MIME_TYPES.has(cleaned)) {
        return cleaned;
    }
    
    if (mime.endsWith('.png')) return 'image/png';
    if (mime.endsWith('.jpg') || mime.endsWith('.jpeg')) return 'image/jpeg';
    if (mime.endsWith('.webp')) return 'image/webp';
    if (mime.endsWith('.gif')) return 'image/gif';
    if (mime.endsWith('.mp4')) return 'video/mp4';
    if (mime.endsWith('.webm')) return 'video/webm';
    
    return defaultMime;
}

async function resolveMediaToBase64(mediaUrl) {
    if (!mediaUrl) return null;
    if (typeof mediaUrl !== 'string') {
        if (typeof mediaUrl === 'object' && mediaUrl.url) {
            mediaUrl = mediaUrl.url;
        } else {
            return null;
        }
    }
    mediaUrl = mediaUrl.trim();
    if (mediaUrl.startsWith('blob:')) {
        console.warn(`[OMNI-I2V] Cannot resolve browser-local blob URL on backend: ${mediaUrl}`);
        return null;
    }
    let data = '';
    let mimeType = 'image/jpeg';

    if (mediaUrl.startsWith('data:')) {
        const match = mediaUrl.match(/^data:([^;]+);base64,/);
        if (match) mimeType = match[1];
        data = mediaUrl.split(',')[1] || '';
    } else if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://') || mediaUrl.startsWith('//') || mediaUrl.startsWith('/')) {
        let fullUrl = mediaUrl;
        if (mediaUrl.startsWith('//')) fullUrl = `https:${mediaUrl}`;
        else if (mediaUrl.startsWith('/')) fullUrl = `https://pub-05a4fe33e706492e8d437c36f9a8aa94.r2.dev${mediaUrl}`;
        
        let success = false;
        let lastErr = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 20000);
                const resp = await fetch(fullUrl, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': '*/*'
                    }
                });
                clearTimeout(timeoutId);
                if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
                const buffer = await resp.arrayBuffer();
                data = Buffer.from(buffer).toString('base64');
                const contentType = resp.headers.get('content-type');
                if (contentType) mimeType = contentType;
                success = true;
                break;
            } catch (fetchErr) {
                lastErr = fetchErr;
                if (attempt < 2) {
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        }
        if (!success) {
            console.warn(`[OMNI-I2V] Failed to fetch media from URL (${fullUrl}): ${lastErr?.message}`);
            return null;
        }
    } else {
        data = mediaUrl; // Assume raw base64
    }

    if (mediaUrl.toLowerCase().includes('.png')) mimeType = 'image/png';
    else if (mediaUrl.toLowerCase().includes('.jpg') || mediaUrl.toLowerCase().includes('.jpeg')) mimeType = 'image/jpeg';
    else if (mediaUrl.toLowerCase().includes('.webp')) mimeType = 'image/webp';
    else if (mediaUrl.toLowerCase().includes('.mp4')) mimeType = 'video/mp4';

    return { data, mimeType: sanitizeMime(mimeType, 'image/jpeg') };
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
        VERTEX_KEY,
        storage,
        BUCKET_NAME,
        storageService
    } = deps;

    async function uploadToGcs(buffer, mimeType) {
        const authOptions = {
            projectId: VERTEX_PROJECT_ID || process.env.GOOGLE_PROJECT_ID || 'new-zerolens-api'
        };
        if (VERTEX_KEY) {
            if (typeof VERTEX_KEY === 'string') {
                authOptions.keyFilename = VERTEX_KEY;
            } else {
                authOptions.credentials = VERTEX_KEY;
            }
        }
        const storageClient = storage || new Storage(authOptions);
        const bucketName = process.env.GCS_BUCKET_NAME || BUCKET_NAME || 'zerolensbucket-cdn';
        const bucket = storageClient.bucket(bucketName);
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
        let vertexKey = deps.VERTEX_KEY;
        if (!vertexKey) {
            const fallbackPath = path.join(process.cwd(), 'server', 'config', 'vertexKey.json');
            if (fs.existsSync(fallbackPath)) {
                vertexKey = fallbackPath;
            } else {
                const localPath = path.join(process.cwd(), 'new-zerolens-api.json');
                if (fs.existsSync(localPath)) vertexKey = localPath;
            }
        }
        const authOptions = {
            scopes: [
                'https://www.googleapis.com/auth/cloud-platform',
                'https://www.googleapis.com/auth/generative-language'
            ]
        };
        if (vertexKey) {
            if (typeof vertexKey === 'string') {
                authOptions.keyFilename = vertexKey;
            } else {
                authOptions.credentials = vertexKey;
            }
        }
        return new GoogleGenAI({
            vertexai: true,
            project: VERTEX_PROJECT_ID || 'new-zerolens-api',
            location: 'global',
            googleAuthOptions: authOptions,
            httpOptions: {
                headers: {
                    'Api-Revision': '2026-05-20'
                }
            }
        });
    }

    // Gemini Omni/Omni Flash Video Generation Route
    const handleOmniGenerate = async (req, res) => {
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
            const rawTask = req.body.task && req.body.task !== 'auto' ? req.body.task : null;
            const requestedTask = (rawTask === 'extension' || rawTask === 'extend') ? 'extend' : rawTask;
            if (!motionPrompt && !prompt && requestedTask !== 'extend' && requestedTask !== 'motion_control') throw new Error('No motion prompt provided');

            const targetUserId = user ? user.id : userId;

            const validDuration = Number(duration) >= 3 && Number(duration) <= 15 ? Number(duration) : 8;
            const rawRes = (resolution || '720p').toLowerCase();
            const validResolution = ['360p', '720p', '1080p', '4k'].includes(rawRes) ? rawRes : '720p';
            console.log(`[OMNI-I2V] Resolution: ${validResolution} (requested: ${resolution}) | Duration: ${validDuration}s | Audio: ${!!generateAudio}`);
            console.log(`[OMNI-I2V] Task: ${requestedTask || 'auto'} | CreditReason: ${req.body.creditReason || 'default'} | HasVideo: ${!!(req.body.video || req.body.sourceVideo || req.body.refVideo)} | RefImages: ${(req.body.ref_images || []).length}`);

            // Deduct credits: omni/omni-flash are cost-per-second
            let requiredCredits = 10; // Default
            const modelLower = (model || '').toLowerCase();
            if (requestedTask === 'extend' || requestedTask === 'edit') {
                requiredCredits = validDuration * 5;
            } else if (modelLower.includes('omni-flash') || modelLower.includes('flash')) {
                let costPerSec = 5; // default 720p
                if (validResolution === '4k') {
                    costPerSec = generateAudio ? 19 : 15;
                } else if (validResolution === '1080p') {
                    costPerSec = generateAudio ? 8 : 6;
                } else if (validResolution === '360p') {
                    costPerSec = generateAudio ? 5 : 4;
                } else { // 720p
                    costPerSec = generateAudio ? 6 : 5;
                }
                requiredCredits = Math.ceil(costPerSec * 1.1 * validDuration);
            } else if (modelLower.includes('omni')) {
                requiredCredits = 3 * validDuration;
            }

            if (typeof req.body.creditCost === 'number' && req.body.creditCost > 0) {
                requiredCredits = req.body.creditCost;
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

            console.log(`[OMNI-I2V] ⚡ Requesting Omni Flash. Prioritizing Vertex AI Service Account as PRIMARY for all users and admins.`);

            const token = await getVertexToken();
            const apiKey = await resolveGoogleApiKey(req, targetUserId, true);
            
            if (!token && !apiKey) throw new Error('Failed to acquire service account token or API key');

            async function trimVideoBufferToMaxDuration(inputBuffer, maxDurationSec = 10) {
                const tempDir = os.tmpdir();
                const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
                const inputPath = path.join(tempDir, `omni_ref_in_${uniqueId}.mp4`);
                const outputPath = path.join(tempDir, `omni_ref_trimmed_${uniqueId}.mp4`);
                
                await fs.promises.writeFile(inputPath, inputBuffer);
                
                try {
                    console.log(`[OMNI-REF-VIDEO] ✂️ Processing reference video (trimming to max ${maxDurationSec}s & stripping audio track with -an to prevent Google speech-edit blocks)...`);

                    await new Promise((resolve, reject) => {
                        ffmpeg(inputPath)
                            .setStartTime(0)
                            .setDuration(maxDurationSec)
                            .outputOptions(['-c:v libx264', '-preset ultrafast', '-an'])
                            .output(outputPath)
                            .on('end', resolve)
                            .on('error', reject)
                            .run();
                    });

                    const trimmedBuffer = await fs.promises.readFile(outputPath);
                    await Promise.all([
                        fs.promises.unlink(inputPath).catch(() => {}),
                        fs.promises.unlink(outputPath).catch(() => {})
                    ]);
                    console.log(`[OMNI-REF-VIDEO] ✅ Reference video ready (${trimmedBuffer.length} bytes, pure visual motion track).`);
                    return trimmedBuffer;
                } catch (err) {
                    console.warn(`[OMNI-REF-VIDEO] Video processing failed (${err.message}). Using original buffer as fallback.`);
                    await fs.promises.unlink(inputPath).catch(() => {});
                    await fs.promises.unlink(outputPath).catch(() => {});
                    return inputBuffer;
                }
            }

            async function uploadVideoReference(base64Data, mimeType) {
                let buffer = Buffer.from(base64Data, 'base64');
                try {
                    buffer = await trimVideoBufferToMaxDuration(buffer, 10);
                } catch (trimErr) {
                    console.warn(`[OMNI-I2V] Reference video trim check failed:`, trimErr.message);
                }
                const trimmedBase64 = buffer.toString('base64');

                let uri = null;
                // Priority 1 for Vertex AI: Upload directly to GCS so Vertex AI Interactions API gets native gs:// URI!
                if (token || VERTEX_PROJECT_ID) {
                    try {
                        console.log(`[OMNI-I2V] Uploading reference video (${buffer.length} bytes) to GCS for Vertex AI...`);
                        const gsUri = await uploadToGcs(buffer, mimeType);
                        if (gsUri) {
                            uri = gsUri;
                        }
                    } catch (gcsErr) {
                        console.warn(`[OMNI-I2V] GCS upload failed (${gcsErr.message}), falling back to Google File API...`);
                    }
                }

                // Priority 2: Google File API via API key (for Google AI Studio)
                if (!uri && apiKey) {
                    try {
                        console.log(`[OMNI-I2V] Uploading reference video (${buffer.length} bytes) to Google File API...`);
                        const fileApiUri = await uploadToGoogleFileApi(trimmedBase64, mimeType || 'video/mp4', apiKey, null);
                        if (fileApiUri) {
                            console.log(`[OMNI-I2V] ✅ Reference video uploaded to Google File API: ${fileApiUri}`);
                            uri = fileApiUri;
                        }
                    } catch (fileErr) {
                        console.warn(`[OMNI-I2V] Google File API upload failed (${fileErr.message}), falling back to Cloudflare R2...`);
                    }
                }

                // Priority 3: Cloudflare R2 (for non-Vertex engines or storage)
                if (!uri && uploadVideoToSupabase) {
                    try {
                        console.log(`[OMNI-I2V] Uploading reference video (${buffer.length} bytes) to Cloudflare R2...`);
                        const r2Url = await uploadVideoToSupabase(buffer, targetUserId || 'anon', validAspectRatio, 'reference', 'Omni Reference Video', 'Omni Flash');
                        if (r2Url) {
                            console.log(`[OMNI-I2V] ✅ Reference video uploaded to Cloudflare R2: ${r2Url}`);
                            uri = r2Url;
                        }
                    } catch (r2Err) {
                        console.warn(`[OMNI-I2V] Cloudflare R2 upload failed (${r2Err.message})`);
                    }
                }

                return { uri, data: trimmedBase64 };
            }

            broadcastProgress(taskId, 1, 3, 'Preparing video scene...');
            
            // Omni doesn't accept duration_seconds as an API param.
            // Duration is controlled by embedding timecode instructions in the prompt.
            const rawTextPrompt = motionPrompt || prompt;
            const durationPrefix = `[0-${validDuration}s] `;
            const durationSuffix = ` Generate exactly a ${validDuration}-second video, single continuous shot, no scene cuts beyond what is described.`;
            let textPrompt = rawTextPrompt ? `${durationPrefix}${rawTextPrompt}${durationSuffix}` : rawTextPrompt;
            
            // Construct input parts for Gemini Omni Flash (multimodal)
            let inputParts = [];
            const isExtendOrEdit = requestedTask === 'extend' || requestedTask === 'edit';
            // In multi-reference / i2v, inputImage must ONLY be an actual image, NEVER fall back to refVideo!
            const inputImage = image || req.body.firstFrameImage || req.body.firstFrame || (isExtendOrEdit ? (req.body.video || req.body.sourceVideo || req.body.refVideo) : null);
            const endImage = req.body.lastFrameImage || req.body.imageEnd || req.body.lastFrame;

            // 1. Primary image (Start Frame): only include if not doing pure text_to_video
            let primaryImageResolved = null;
            if (inputImage && requestedTask !== 'text_to_video') {
                primaryImageResolved = await resolveMediaToBase64(inputImage);
                if (primaryImageResolved) {
                    console.log(`[OMNI-I2V] ✅ Resolved Start Frame image (${primaryImageResolved.mimeType}, ${primaryImageResolved.data.length} chars)`);
                }
            }

            // 2. Secondary image (End Frame): only include if not doing pure text_to_video
            let endImageResolved = null;
            if (endImage && requestedTask !== 'text_to_video') {
                endImageResolved = await resolveMediaToBase64(endImage);
                if (endImageResolved) {
                    console.log(`[OMNI-I2V] ✅ Resolved End Frame image (${endImageResolved.mimeType}, ${endImageResolved.data.length} chars)`);
                }
            }

            // Reference media arrays from payload
            // Preserve explicit MultiRef slots. Filtering empty entries on the
            // client must never shift @image2 into @image1.
            const rawImageSlots = Array.isArray(req.body.multiImageSlots) ? req.body.multiImageSlots : [];
            const isMultiReference = req.body.multiReferenceMode === true || rawImageSlots.length > 0;
            const rawRefImages = rawImageSlots.length > 0
                ? rawImageSlots
                : (req.body.ref_images || req.body.refImages || req.body.omniMultiImages || []);
            const rawSlotVideos = req.body.multiVideoSlots || req.body.omniMultiVideos;
            const rawRefVideos = req.body.ref_videos || req.body.refVideos || req.body.reference_video_urls || (req.body.refVideo ? [{ url: req.body.refVideo }] : []);

            // If primary image was not explicitly provided but ref_images exist, use first reference image as primary (only if image)
            if (!isMultiReference && !primaryImageResolved && rawRefImages.length > 0 && requestedTask !== 'text_to_video') {
                const firstRef = typeof rawRefImages[0] === 'string' ? rawRefImages[0] : (rawRefImages[0].url || rawRefImages[0].imageUrl);
                if (firstRef) {
                    const candidate = await resolveMediaToBase64(firstRef);
                    if (candidate && !candidate.mimeType?.startsWith('video/')) {
                        primaryImageResolved = candidate;
                        console.log(`[OMNI-I2V] ✅ Promoted ref_images[0] to Start Frame image (${primaryImageResolved.mimeType})`);
                    }
                }
            }

            // Tag mapping: translate @image1..4 and @video1..3 to Google Omni Flash <IMAGE_REF_N> & <VIDEO_REF_N>
            let compiledPrompt = rawTextPrompt || '';
            if (requestedTask === 'extend' || requestedTask === 'edit') {
                compiledPrompt = compiledPrompt
                    .replace(/@image1\b/gi, '<IMAGE_REF_0>')
                    .replace(/@image2\b/gi, '<IMAGE_REF_1>')
                    .replace(/@image3\b/gi, '<IMAGE_REF_2>')
                    .replace(/@image4\b/gi, '<IMAGE_REF_3>')
                    .replace(/@video1\b/gi, '<VIDEO_REF_0>')
                    .replace(/@ref_video\b/gi, '<VIDEO_REF_0>')
                    .replace(/@video\b(?![\d])/gi, '<VIDEO_REF_0>');
            } else if (isMultiReference) {
                compiledPrompt = compiledPrompt
                    .replace(/@image1\b/gi, '<IMAGE_REF_0>')
                    .replace(/@image2\b/gi, '<IMAGE_REF_1>')
                    .replace(/@image3\b/gi, '<IMAGE_REF_2>')
                    .replace(/@image4\b/gi, '<IMAGE_REF_3>')
                    .replace(/@video1\b/gi, '<VIDEO_REF_0>')
                    .replace(/@video2\b/gi, '<VIDEO_REF_1>')
                    .replace(/@video3\b/gi, '<VIDEO_REF_2>')
                    .replace(/@ref_video\b/gi, '<VIDEO_REF_0>')
                    .replace(/@video\b(?![\d])/gi, '<VIDEO_REF_0>');
            } else {
                compiledPrompt = compiledPrompt
                    .replace(/@image1\b/gi, '<START_FRAME>')
                    .replace(/@image2\b/gi, '<IMAGE_REF_0>')
                    .replace(/@image3\b/gi, '<IMAGE_REF_1>')
                    .replace(/@image4\b/gi, '<IMAGE_REF_2>')
                    .replace(/@video1\b/gi, '<VIDEO_REF_0>')
                    .replace(/@video2\b/gi, '<VIDEO_REF_1>')
                    .replace(/@video3\b/gi, '<VIDEO_REF_2>')
                    .replace(/@ref_video\b/gi, '<VIDEO_REF_0>')
                    .replace(/@video\b(?![\d])/gi, '<VIDEO_REF_0>');
            }

            // 1. Start Frame with explicit placeholder
            if (primaryImageResolved) {
                const isVideo = primaryImageResolved.mimeType && primaryImageResolved.mimeType.startsWith('video/');
                if (isVideo) {
                    broadcastProgress(taskId, 1.5, 3, 'Uploading reference video...');
                    let videoRefObj = null;
                    try {
                        videoRefObj = await uploadVideoReference(
                            primaryImageResolved.data,
                            sanitizeMime(primaryImageResolved.mimeType, 'video/mp4')
                        );
                    } catch (fileApiErr) {
                        console.warn(`[OMNI-I2V] Reference video upload failed, falling back to inline data: ${fileApiErr.message}`);
                    }
                    const finalVideoData = videoRefObj?.data || primaryImageResolved.data;
                    const finalVideoUri = videoRefObj?.uri || undefined;
                    if (requestedTask === 'extend') {
                        inputParts.push({ type: 'text', text: '<VIDEO_REF_0>\n[Source Video to Extend]:\n' });
                    } else if (requestedTask === 'edit') {
                        inputParts.push({ type: 'text', text: '<VIDEO_REF_0>\n[Source Video to Edit]:\n' });
                    } else {
                        inputParts.push({ type: 'text', text: '<START_FRAME>\n[Video reference at 00:00]:\n' });
                    }
                    inputParts.push({
                        type: 'video',
                        uri: finalVideoUri,
                        data: finalVideoData,
                        mime_type: sanitizeMime(primaryImageResolved.mimeType, 'video/mp4')
                    });
                    console.log(`[OMNI-I2V] ✅ Added reference video to inputParts (${requestedTask || 'reference'}, uri=${finalVideoUri || 'inline-base64'})`);
                } else {
                    inputParts.push({
                        type: 'text',
                        text: '<START_FRAME>\n[Initial Starting Keyframe at timestamp 00:00]:\n'
                    });
                    inputParts.push({
                        type: 'image',
                        data: primaryImageResolved.data,
                        mime_type: sanitizeMime(primaryImageResolved.mimeType, 'image/png')
                    });
                    console.log(`[OMNI-I2V] ✅ Added <START_FRAME> image to inputParts (${primaryImageResolved.data.length} chars)`);
                }
            }

            // 2. Middle Prompt (Directives and scene motion instructions)
            const secFormatted = validDuration < 10 ? `0${validDuration}` : `${validDuration}`;
            const sfxDirective = (generateAudio && !compiledPrompt.includes('[Audio:'))
                ? ' [Audio: Realistic synchronized environmental sound effects, natural foley, and ambient room tones ONLY. Strictly NO background music, NO BGM, NO soundtrack, NO musical instruments, NO melody, NO singing. High-fidelity diegetic sound effects only.]'
                : '';
            let middlePromptText = '';
            if (requestedTask === 'extend') {
                const actionPart = compiledPrompt?.trim()
                    ? `Continuation action and progression: ${compiledPrompt}.`
                    : 'Continue the natural action, character performance, and camera movement forward smoothly and naturally.';
                const refLockingDirective = rawRefImages.length > 0
                    ? ` Strictly preserve character appearance, facial likeness, clothing/wardrobe, and environmental location style matching the attached reference images (<IMAGE_REF_0>${rawRefImages.length > 1 ? ` through <IMAGE_REF_${rawRefImages.length - 1}>` : ''}).`
                    : '';
                middlePromptText = `\n<PROMPT>\n[0-${validDuration}s] SCENE EXTENSION & CONTINUATION DIRECTIVE: Seamlessly extend and continue the scene from the exact final frame of the preceding source video without any visual discontinuity or jump cuts. Preserve 100% strict consistency with the original clip: maintain identical character identity and facial features, identical costumes and wardrobe textures, identical environment and location geometry, lighting direction, color grading, and physical dynamics.${refLockingDirective} ${actionPart}${sfxDirective} Generate a single continuous ${validDuration}-second extension shot.\n`;
            } else if (requestedTask === 'edit') {
                const editActionPart = compiledPrompt?.trim()
                    ? `Modification and editing instructions: ${compiledPrompt}.`
                    : 'Modify the video as instructed while maintaining overall motion flow, camera movement, composition, and scene continuity.';
                const refLockingDirective = rawRefImages.length > 0
                    ? ` Incorporate, align, or replace target elements using the attached visual reference images (<IMAGE_REF_0>${rawRefImages.length > 1 ? ` through <IMAGE_REF_${rawRefImages.length - 1}>` : ''}).`
                    : '';
                middlePromptText = `\n<PROMPT>\n[0-${validDuration}s] VIDEO EDIT & REPLACEMENT DIRECTIVE: Precisely edit the source video <VIDEO_REF_0>. Maintain identical composition, perspective, camera motion, and unedited elements of the original clip. Apply the requested edits seamlessly across all frames without flickering or artifacts.${refLockingDirective} ${editActionPart}${sfxDirective} Generate the edited video.\n`;
            } else if (requestedTask === 'motion_control') {
                const actionPart = compiledPrompt?.trim()
                    ? `Additional performance and environment instructions: ${compiledPrompt}.`
                    : '';
                middlePromptText = `\n<PROMPT>\n[0-${validDuration}s] MOTION CONTROL & EXACT FACE PRESERVATION DIRECTIVE: Precisely transfer the full-body motion, choreography, gestures, body movement pacing, and physical action from <VIDEO_REF_0> onto the subject in <START_FRAME>. CRITICAL FACE PRESERVATION: The subject's exact face, facial structure, facial features, eyes, expressions, skin tone, hair, and individual likeness must strictly and identically match the attached reference image <START_FRAME> without any distortion, morphing, or facial drift. Ensure seamless realistic performance transfer with natural kinematics and fluid movement while retaining 100% facial and character fidelity from <START_FRAME>.${actionPart ? ' ' + actionPart : ''}${sfxDirective} Generate a single continuous ${validDuration}-second motion-controlled video, single continuous shot, no scene cuts.\n`;
            } else if (primaryImageResolved && endImageResolved) {
                middlePromptText = `\n<PROMPT>\n[0-${validDuration}s] The video MUST begin at timestamp 00:00 directly with the exact subject, composition, and initial pose shown in <START_FRAME>. Scene motion and action: ${compiledPrompt}${sfxDirective}. The video MUST transition smoothly and continuously throughout the ${validDuration} seconds so the action finishes seamlessly into <END_FRAME> at 00:${secFormatted}. Generate a single continuous shot with no scene cuts.\n`;
            } else if (primaryImageResolved) {
                middlePromptText = `\n<PROMPT>\n[0-${validDuration}s] The video MUST begin at timestamp 00:00 directly using the initial frame <START_FRAME>. Scene motion and action: ${compiledPrompt}${sfxDirective}. Generate a single continuous ${validDuration}-second shot starting from this frame.\n`;
            } else if (endImageResolved) {
                middlePromptText = `\n<PROMPT>\n[0-${validDuration}s] Scene motion and action: ${compiledPrompt}${sfxDirective}. The video MUST conclude at timestamp 00:${secFormatted} directly matching the final composition of <END_FRAME>.\n`;
            } else {
                middlePromptText = `\n<PROMPT>\n[0-${validDuration}s] ${compiledPrompt}${sfxDirective}. Generate exactly a ${validDuration}-second continuous video shot, single continuous shot, no scene cuts.\n`;
            }

            inputParts.push({
                type: 'text',
                text: middlePromptText
            });

            // 3. End Frame with explicit placeholder
            if (endImageResolved) {
                inputParts.push({
                    type: 'text',
                    text: `\n<END_FRAME>\n[Final Ending Keyframe at timestamp 00:${secFormatted}]:\n`
                });
                inputParts.push({
                    type: 'image',
                    data: endImageResolved.data,
                    mime_type: sanitizeMime(endImageResolved.mimeType, 'image/png')
                });
                console.log(`[OMNI-I2V] ✅ Added <END_FRAME> image to inputParts (${endImageResolved.data.length} chars)`);
            }

            // 4. Additional Reference Images (Slots 2, 3, 4 or board items)
            let refImageCounter = 0;
            for (let i = 0; i < rawRefImages.length; i++) {
                const refImg = rawRefImages[i];
                const imgUrl = typeof refImg === 'string' ? refImg : (refImg.url || refImg.imageUrl);
                if (!imgUrl) continue;
                const slot = isMultiReference && Number.isInteger(refImg?.slot)
                    ? refImg.slot
                    : refImageCounter;

                // Skip if this image is identical to the primary Start Frame already added
                if (primaryImageResolved && imgUrl === inputImage) continue;

                const resolved = await resolveMediaToBase64(imgUrl);
                if (resolved && resolved.data) {
                    const isVid = resolved.mimeType && resolved.mimeType.startsWith('video/');
                    if (isVid) {
                        try {
                            const videoRef = await uploadVideoReference(
                                resolved.data,
                                sanitizeMime(resolved.mimeType, 'video/mp4')
                            );
                            inputParts.push({ type: 'text', text: `\n<VIDEO_REF_${refImageCounter}>:\n[Driving Video Reference]:\n` });
                            inputParts.push({
                                type: 'video',
                                uri: videoRef?.uri || undefined,
                                data: videoRef?.data || resolved.data,
                                mime_type: sanitizeMime(resolved.mimeType, 'video/mp4')
                            });
                            console.log(`[OMNI-I2V] ✅ Uploaded video ref from ref_images[${i}] (${videoRef?.uri || 'inline-base64'})`);
                        } catch (fileApiErr) {
                            console.warn(`[OMNI-I2V] Upload failed for ref_images[${i}]: ${fileApiErr.message}`);
                        }
                    } else {
                        // Skip if duplicate of primary image data
                        if (primaryImageResolved && resolved.data === primaryImageResolved.data) continue;

                        inputParts.push({
                            type: 'text',
                            text: `\n<IMAGE_REF_${slot}>:\n[Visual Reference Image ${slot + 1}]:\n`
                        });
                        inputParts.push({
                            type: 'image',
                            data: resolved.data,
                            mime_type: sanitizeMime(resolved.mimeType, 'image/png')
                        });
                        console.log(`[OMNI-I2V] ✅ Added <IMAGE_REF_${slot}> from ref_images[${i}] (${resolved.data.length} chars, ${resolved.mimeType})`);
                        refImageCounter = Math.max(refImageCounter, slot + 1);
                    }
                }
            }

            // 5. Reference Videos (Slots 1, 2, 3: @video1, @video2, @video3)
            let videoSlotsToProcess = [];
            if (Array.isArray(rawSlotVideos) && rawSlotVideos.some(v => v)) {
                for (let s = 0; s < 3; s++) {
                    const item = rawSlotVideos.find(v => v && v.slot === s) || rawSlotVideos[s];
                    if (item) {
                        const url = typeof item === 'string' ? item : (item.url || item.imageUrl || item.data);
                        if (url) {
                            videoSlotsToProcess.push({ slot: s, url });
                        }
                    }
                }
            } else if (Array.isArray(rawRefVideos) && rawRefVideos.length > 0) {
                for (let s = 0; s < rawRefVideos.length; s++) {
                    const item = rawRefVideos[s];
                    const url = typeof item === 'string' ? item : (item.url || item.imageUrl || item.data);
                    if (url) {
                        videoSlotsToProcess.push({ slot: s, url });
                    }
                }
            }

            for (const { slot, url } of videoSlotsToProcess) {
                if (!url) continue;
                if (isExtendOrEdit && (url === inputImage || (primaryImageResolved && url === primaryImageResolved.data))) {
                    continue;
                }

                try {
                    const resolved = await resolveMediaToBase64(url);
                    if (resolved && resolved.data) {
                        const videoRef = await uploadVideoReference(
                            resolved.data,
                            sanitizeMime(resolved.mimeType, 'video/mp4')
                        );
                        inputParts.push({
                            type: 'text',
                            text: `\n<VIDEO_REF_${slot}>:\n[Driving Motion Video Reference ${slot + 1}]:\n`
                        });
                        inputParts.push({
                            type: 'video',
                            uri: videoRef?.uri || undefined,
                            data: videoRef?.data || resolved.data,
                            mime_type: sanitizeMime(resolved.mimeType, 'video/mp4')
                        });
                        console.log(`[OMNI-I2V] ✅ Added <VIDEO_REF_${slot}> for slot ${slot + 1} (${videoRef?.uri || 'inline-base64'})`);
                    }
                } catch (fileApiErr) {
                    console.warn(`[OMNI-I2V] Upload failed for reference video slot ${slot + 1}: ${fileApiErr.message}`);
                }
            }

            // 6. Legacy / tagged identity images
            const legacyRefImgs = req.body.referenceImages || req.body.identity_images;
            if (legacyRefImgs && Array.isArray(legacyRefImgs) && legacyRefImgs.length > 0) {
                for (const legacyImg of legacyRefImgs) {
                    if (legacyImg === inputImage) continue;
                    const resolved = await resolveMediaToBase64(legacyImg);
                    if (resolved && resolved.data && (!primaryImageResolved || resolved.data !== primaryImageResolved.data)) {
                        inputParts.push({
                            type: 'text',
                            text: `\n<IMAGE_REF_${refImageCounter}>:\n[Tagged Identity Reference]:\n`
                        });
                        inputParts.push({
                            type: 'image',
                            data: resolved.data,
                            mime_type: sanitizeMime(resolved.mimeType, 'image/png')
                        });
                        console.log(`[OMNI-I2V] ✅ Added legacy ref <IMAGE_REF_${refImageCounter}> (${resolved.data.length} chars)`);
                        refImageCounter++;
                    }
                }
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
            if (finalTaskType === 'extension') {
                finalTaskType = 'extend';
            }
            // 'motion_control' is an internal label (used for prompt builder), NOT a valid Vertex AI task type.
            // When image + video are provided for motion control, the correct API task is 'reference_to_video'.
            if (finalTaskType === 'motion_control') {
                finalTaskType = finalVideoCount > 0 ? 'reference_to_video' : (finalImageCount > 0 ? 'image_to_video' : 'text_to_video');
                console.log(`[OMNI-I2V] motion_control task remapped to '${finalTaskType}' (images:${finalImageCount}, videos:${finalVideoCount})`);
            }

            // When multiple images are provided (e.g. Start Frame + End Frame, or multi-reference images),
            // task MUST be 'reference_to_video' because Google Omni's 'image_to_video' only animates 1 image!
            if (finalImageCount > 1 && finalTaskType !== 'extend' && finalTaskType !== 'edit') {
                console.log(`[OMNI-I2V] Multi-frame input detected (${finalImageCount} images). Enforcing task: reference_to_video.`);
                finalTaskType = 'reference_to_video';
            }

            // Vertex AI Interactions API parameter constraints:
            // 1. 'reference_to_video' requires at least 1 image or audio reference.
            if (finalTaskType === 'reference_to_video' && finalImageCount === 0 && finalAudioCount === 0 && finalVideoCount === 0) {
                finalTaskType = 'text_to_video';
            }

            // 2. 'image_to_video' requires at least 1 image
            if (finalTaskType === 'image_to_video' && finalImageCount === 0) {
                finalTaskType = 'text_to_video';
            }

            // 3. 'edit' requires at least 1 input video
            if (finalTaskType === 'edit' && finalVideoCount === 0) {
                console.warn(`[OMNI-I2V] Task 'edit' requested but finalVideoCount is 0. Falling back to reference_to_video or text_to_video.`);
                finalTaskType = finalImageCount > 0 ? 'reference_to_video' : 'text_to_video';
            }

            // 4. 'extend' requires at least 1 input video
            if (finalTaskType === 'extend' && finalVideoCount === 0) {
                console.warn(`[OMNI-I2V] Task 'extend' requested but finalVideoCount is 0. Falling back to reference_to_video or text_to_video.`);
                finalTaskType = finalImageCount > 0 ? 'reference_to_video' : 'text_to_video';
            }

            // Enforce Google Gemini Omni Flash 1.1 as the sole model
            const modelName = 'gemini-omni-1.1-flash-preview';

            const responseFormat = {
                type: "video",
                delivery: token ? "inline" : "uri"
            };

            if (finalTaskType !== 'edit' && finalTaskType !== 'extend') {
                responseFormat.aspect_ratio = validAspectRatio;
            }
            if (validResolution) {
                responseFormat.resolution = validResolution;
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
            let lastOmniError = null;

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
                            if (part.type === 'video') {
                                if (part.uri && (part.uri.startsWith('gs://') || part.uri.startsWith('https://generativelanguage.googleapis.com'))) {
                                    return { type: 'video', uri: part.uri };
                                }
                                return {
                                    type: 'video',
                                    data: part.data,
                                    mime_type: part.mime_type || 'video/mp4'
                                };
                            }
                            if (part.type === 'document') {
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

                    console.log(`[OMNI-I2V] [Vertex AI REST PRIMARY] Calling global interactions API on project ${VERTEX_PROJECT_ID}`);
                    const interactionRestUrl = `https://aiplatform.googleapis.com/v1beta1/projects/${VERTEX_PROJECT_ID}/locations/global/interactions`;
                    
                    const interactionReqBody = {
                        model: reqBody.model,
                        input: sdkInput,
                        response_format: responseFormat,
                        generation_config: generationConfig
                    };

                    const restResp = await fetch(interactionRestUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                            'Api-Revision': '2026-05-20'
                        },
                        body: JSON.stringify(interactionReqBody)
                    });

                    const interactionResult = await restResp.json();
                    if (!restResp.ok || interactionResult.error) {
                        const errDetails = interactionResult.error?.message || JSON.stringify(interactionResult.error || interactionResult);
                        throw new Error(`Vertex AI Interactions error (${restResp.status}): ${errDetails}`);
                    }

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
                    lastOmniError = serviceErr.message;
                    console.warn(`[OMNI-I2V] [Vertex AI SDK] Vertex AI Omni generation failed: ${serviceErr.message}`);
                }
            }

            const isVertexPolicyViolation = lastOmniError && (
                lastOmniError.includes('content_blocked') ||
                lastOmniError.includes('policy') ||
                lastOmniError.includes('Policy') ||
                lastOmniError.includes('Responsible AI') ||
                lastOmniError.includes('prohibited') ||
                lastOmniError.includes('prominent individuals') ||
                lastOmniError.includes('photorealistic individuals') ||
                lastOmniError.includes('reputational harms') ||
                lastOmniError.includes('violates Google')
            );

            // --- Option A.2: Vertex AI Veo Fast Fallback (Keeps video rendering 100% on Vertex AI) ---
            if (!success && !isVertexPolicyViolation && token) {
                try {
                    console.log(`[OMNI-I2V] Attempting Vertex AI Veo Fast fallback on model veo-3.1-fast-generate-001 (location: ${VERTEX_LOCATION || 'us-central1'})...`);
                    const veoModel = 'veo-3.1-fast-generate-001';
                    const veoEndpoint = `https://${VERTEX_LOCATION || 'us-central1'}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION || 'us-central1'}/publishers/google/models/${veoModel}:predictLongRunning`;
                    
                    const veoInstance = { prompt: rawTextPrompt || compiledPrompt };
                    if (primaryImageResolved) {
                        veoInstance.image = {
                            bytesBase64Encoded: primaryImageResolved.data,
                            mimeType: primaryImageResolved.mimeType || 'image/png'
                        };
                    }
                    if (endImageResolved) {
                        veoInstance.lastImage = {
                            bytesBase64Encoded: endImageResolved.data,
                            mimeType: endImageResolved.mimeType || 'image/png'
                        };
                    }

                    const veoResp = await fetch(veoEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            instances: [veoInstance],
                            parameters: {
                                sampleCount: 1,
                                aspectRatio: validAspectRatio,
                                durationSeconds: Math.min(validDuration, 8),
                                resolution: validResolution
                            }
                        })
                    });

                    if (veoResp.ok) {
                        const initData = await veoResp.json();
                        const opName = initData.name;
                        if (opName) {
                            console.log(`[OMNI-I2V] [Vertex AI Veo Fallback] Operation started: ${opName}`);
                            broadcastProgress(taskId, 2, 3, 'Rendering video sequence (Vertex AI)...');
                            const fetchOpUrl = `https://${VERTEX_LOCATION || 'us-central1'}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION || 'us-central1'}/publishers/google/models/${veoModel}:fetchPredictOperation`;
                            let done = false;
                            let pollCount = 0;
                            while (!done && pollCount < 36) {
                                await new Promise(r => setTimeout(r, 8000));
                                pollCount++;
                                const pollResp = await fetch(fetchOpUrl, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                    body: JSON.stringify({ operationName: opName })
                                });
                                if (pollResp.ok) {
                                    const pollData = await pollResp.json();
                                    if (pollData.done) {
                                        done = true;
                                        const b64 = pollData.response?.videos?.[0]?.bytesBase64Encoded ||
                                                    pollData.response?.predictions?.[0]?.bytesBase64Encoded ||
                                                    pollData.response?.generatedVideos?.[0]?.video?.bytesBase64Encoded;
                                        if (b64) {
                                            videoBuffer = Buffer.from(b64, 'base64');
                                            success = true;
                                            console.log(`[OMNI-I2V] [Vertex AI Veo Fallback] ✅ Video generated successfully (${videoBuffer.length} bytes)`);
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        const errTxt = await veoResp.text().catch(() => '');
                        console.warn(`[OMNI-I2V] [Vertex AI Veo Fallback] Failed (${veoResp.status}): ${errTxt.substring(0, 200)}`);
                    }
                } catch (vFallbackErr) {
                    console.warn(`[OMNI-I2V] [Vertex AI Veo Fallback] Error: ${vFallbackErr.message}`);
                }
            }

            // --- Option B: Multi-Key Google AI Studio Fallback (Only if not a policy block) ---
            if (!success && !isVertexPolicyViolation) {
                const candidateKeys = [
                    (apiKey && apiKey !== 'VERTEX_AI_CLIENT') ? apiKey : null,
                    process.env.ADMIN_GOOGLE_API_KEY,
                    process.env.GOOGLE_API_KEY,
                    process.env.VITE_GOOGLE_API_KEY,
                    process.env.GEMINI_API_KEY
                ].filter(k => k && typeof k === 'string' && (k.startsWith('AIza') || k.startsWith('AQ.')));

                // Deduplicate keys
                const uniqueKeys = [...new Set(candidateKeys)];

                for (const studioKey of uniqueKeys) {
                    try {
                        const endpoint = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${studioKey}`;
                        const headers = { 'Content-Type': 'application/json' };

                        // Force URI delivery mode for Google AI Studio API Key fallback
                        reqBody.response_format.delivery = "uri";
                        if (reqBody.model === 'gemini-omni-1.1-flash-preview') {
                            reqBody.model = 'gemini-omni-flash-preview';
                        }

                        console.log(`[OMNI-I2V] [AI Studio Fallback] Trying key ${studioKey.substring(0, 10)}... on ${endpoint}`);
                        const restResponse = await fetch(endpoint, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify(reqBody)
                        });

                        const interactionResult = await restResponse.json();
                        if (interactionResult.error) {
                            const errMessage = interactionResult.error.message || JSON.stringify(interactionResult.error);
                            console.warn(`[OMNI-I2V] [AI Studio Fallback] Key ${studioKey.substring(0, 10)} failed: ${errMessage}`);
                            // If key is depleted, skip and do not overwrite Vertex error
                            if (errMessage.includes('prepayment credits are depleted')) {
                                console.warn(`[OMNI-I2V] [AI Studio Fallback] Key has depleted credits, skipping AI Studio.`);
                                continue;
                            }
                            lastOmniError = errMessage;
                            if (errMessage.includes('content_blocked') || errMessage.includes('policy') || errMessage.includes('Responsible AI') || errMessage.includes('prohibited') || errMessage.includes('prominent individuals')) {
                                lastOmniError = errMessage;
                                break;
                            }
                            continue;
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
                            console.warn(`[OMNI-I2V] [AI Studio Fallback] No video output returned with key ${studioKey.substring(0, 10)}`);
                            continue;
                        }

                        if (videoData) {
                            videoBuffer = Buffer.from(videoData, 'base64');
                            success = true;
                            break;
                        } else if (videoUri) {
                            const match = videoUri.match(/\/files\/([^:/]+)/);
                            const fileId = match ? match[1] : null;
                            if (!fileId) continue;

                            broadcastProgress(taskId, 2, 3, 'Processing video file (Omni Render)...');
                            
                            let fileActive = false;
                            let pollAttempts = 0;
                            const maxPollAttempts = 60;
                            while (!fileActive && pollAttempts < maxPollAttempts) {
                                await new Promise(resolve => setTimeout(resolve, 5000));
                                pollAttempts++;
                                
                                const filePollUrl = `https://generativelanguage.googleapis.com/v1beta/files/${fileId}?key=${studioKey}`;
                                const pollResp = await fetch(filePollUrl);
                                if (!pollResp.ok) {
                                    const pollErrText = await pollResp.text().catch(() => '');
                                    console.warn(`[OMNI-I2V] File polling status error (${pollResp.status}): ${pollErrText.substring(0, 200)}`);
                                    continue;
                                }
                                const fileInfo = await pollResp.json();
                                const stateName = fileInfo.state?.name || fileInfo.state;
                                console.log(`[OMNI-I2V] [API Key] [${taskId}] File ${fileId} state: ${stateName} (${pollAttempts * 5}s elapsed)`);
                                
                                if (stateName === 'ACTIVE') {
                                    fileActive = true;
                                } else if (stateName === 'FAILED') {
                                    break;
                                }
                                
                                if (pollAttempts % 2 === 0) {
                                    broadcastProgress(taskId, 2, 3, `Rendering video... (${pollAttempts * 5}s)`);
                                }
                            }

                            if (!fileActive) continue;

                            console.log(`[OMNI-I2V] Downloading URI: ${videoUri}`);
                            const downloadUrl = videoUri.includes('?') ? `${videoUri}&key=${studioKey}` : `${videoUri}?key=${studioKey}`;
                            const videoResp = await fetch(downloadUrl);
                            if (!videoResp.ok) continue;
                            videoBuffer = Buffer.from(await videoResp.arrayBuffer());
                            success = true;
                            break;
                        }
                    } catch (apiKeyErr) {
                        console.warn(`[OMNI-I2V] [API Key ${studioKey.substring(0, 10)}] Failed: ${apiKeyErr.message}`);
                    }
                }
            }

            if (!success || !videoBuffer) {
                const finalErrMsg = lastOmniError 
                    ? `[Vertex AI Video Error]: ${lastOmniError}`
                    : 'Video generation failed on Vertex AI without valid video buffer output.';
                throw new Error(finalErrMsg);
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
                'Omni'
            );

            broadcastProgress(taskId, 3, 3, 'Sequence ready!');
            broadcastComplete(taskId);
            console.log(`[OMNI-I2V] ✅ [${taskId}] Success`);

            res.json({ videoUrl: publicUrl, url: publicUrl, status: 'completed' });
        } catch (error) {
            console.error('[OMNI-I2V] Error:', error);
            const taskId = req.body.nodeId ? `veo-${req.body.nodeId}` : 'veo-default';
            broadcastProgress(taskId, 0, 0, `Error: ${error.message}`);
            
            // Refund user credits if deducted
            const targetUser = req.body.userId || 'cec79985-ce59-4d23-82a2-3ae6f69994ed';
            if (targetUser && (deps.supabaseAdmin || deps.supabase)) {
                const dbClient = deps.supabaseAdmin || deps.supabase;
                try {
                    const reqCreds = Number(req.body.requiredCredits) || 66;
                    const { data: prof } = await dbClient.from('profiles').select('shorts_balance').eq('id', targetUser).maybeSingle();
                    if (prof) {
                        await dbClient.from('profiles').update({ shorts_balance: (prof.shorts_balance || 0) + reqCreds }).eq('id', targetUser);
                        await dbClient.from('shorts_transactions').insert({
                            user_id: targetUser,
                            amount: reqCreds,
                            action_type: 'omni_generation_refund',
                            reason: `Refund: ${error.message?.substring(0, 100)}`
                        });
                        console.log(`[OMNI-I2V] 🔄 Refunded ${reqCreds} credits to user ${targetUser}`);
                    }
                } catch (refErr) {
                    console.warn('[OMNI-I2V] Failed to refund credits:', refErr.message);
                }
            }

            let msg = error.message || 'Video generation failed';
            if (msg.includes('speech edits')) {
                msg = "Google's video edit model currently cannot edit audio/speech tracks. The audio track has been automatically stripped. Please try again. Your credits have been refunded.";
            } else if (msg.includes('Responsible AI') || msg.includes('violates Google') || msg.includes('prominent individuals') || msg.includes('prohibited_content') || msg.includes('prohibited content') || msg.includes('content_blocked') || msg.includes('policy') || msg.includes('Policy') || msg.includes('Safety') || msg.includes('safety') || msg.includes('reputational harms') || msg.includes('photorealistic individuals')) {
                msg = "Google's Responsible AI policy blocked this generation (detected recognizable persons or prohibited content). Please use a different reference image/video or adjust your prompt and try again. Your credits have been refunded.";
            } else if (msg.includes('prepayment credits are depleted')) {
                msg = "Google AI Studio API key prepayment credits are depleted. Please add credits at https://ai.studio/projects or wait for Vertex AI quota to reset. Credits refunded.";
            } else if (msg.includes('429') || msg.includes('Quota exceeded')) {
                msg = "Omni Flash generation quota temporarily exceeded (1 request/min). Please wait 60 seconds and try again. Credits refunded.";
            }
            return res.status(500).json({ error: msg });
        }
    };

    router.post('/omni-i2v', handleOmniGenerate);
    router.post('/generate', handleOmniGenerate);
    router.post('/omni/generate', handleOmniGenerate);
    router.post('/omni/generate-video', handleOmniGenerate);
    router.post('/generate-video', handleOmniGenerate);

    return router;
}
