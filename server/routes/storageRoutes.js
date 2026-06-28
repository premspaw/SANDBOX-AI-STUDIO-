// Storage Routes Handler
import express from 'express';
import { fetchAllowedProxyResource, validateProxyUrl } from '../utils/safeProxy.js';
import { isValidUuid } from '../utils/validateUuid.js';

export default function createRouter(deps) {
    const router = express.Router();
    const {
        storage,
        BUCKET_NAME,
        MARKETING_BUCKET,
        supabase,
        supabaseAdmin,
        storageService,
        audioService,
        workspaceService,
        geminiService,
        saveLocalAsset
    } = deps;

    // Image proxy — fetches R2/GCS images server-side and returns with CORS headers
    router.get('/proxy-image', async (req, res) => {
        try {
            const { url } = req.query;
            if (!url) {
                return res.status(400).json({ error: 'url parameter is required' });
            }

            // Secure validation to prevent SSRF
            const parsedUrl = await validateProxyUrl(url);
            const finalUrl = parsedUrl.toString();

            // Detect video by extension (needs Range + streaming support)
            const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(finalUrl);
            const rangeHeader = req.headers['range'];

            // Forward Range header to upstream if present
            const upstreamHeaders = { 'User-Agent': 'ZerolensProxy/1.0' };
            if (rangeHeader) upstreamHeaders['Range'] = rangeHeader;

            let upstream;
            let lastErr;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    upstream = await fetch(finalUrl, {
                        headers: upstreamHeaders,
                        redirect: 'follow',
                        timeout: 6000
                    });
                    if (upstream.ok || upstream.status === 206) {
                        break;
                    }
                    if (attempt < 3) await new Promise(r => setTimeout(r, 600));
                } catch (err) {
                    lastErr = err;
                    if (attempt < 3) await new Promise(r => setTimeout(r, 600));
                }
            }

            if (!upstream || (!upstream.ok && upstream.status !== 206)) {
                const status = upstream ? upstream.status : 500;
                const statusText = upstream ? upstream.statusText : (lastErr ? lastErr.message : 'Unknown proxy fetch error');
                console.error(`[Proxy Error]: Failed to fetch ${finalUrl} after 3 attempts. Status: ${status}, Error: ${statusText}`);
                return res.status(status).json({ error: `Upstream error: ${statusText}` });
            }

            // CORS headers — always required
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

            const ct = upstream.headers.get('content-type') || (isVideo ? 'video/mp4' : 'application/octet-stream');
            res.setHeader('Content-Type', ct);

            // Force download if requested via query parameter
            const downloadFilename = req.query.download;
            if (downloadFilename) {
                const encodedFilename = encodeURIComponent(downloadFilename);
                res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
            }

            if (isVideo || rangeHeader) {
                // ✅ Video streaming: Chrome requires Accept-Ranges + Content-Length to cache & seek
                res.setHeader('Accept-Ranges', 'bytes');
                const cl = upstream.headers.get('content-length');
                if (cl) res.setHeader('Content-Length', cl);
                const cr = upstream.headers.get('content-range');
                if (cr) res.setHeader('Content-Range', cr);
                res.setHeader('Cache-Control', 'public, max-age=3600');
                res.status(upstream.status === 206 ? 206 : 200);

                // Stream directly — handle both Node.js streams and Web ReadableStreams
                if (upstream.body) {
                    if (typeof upstream.body.pipe === 'function') {
                        upstream.body.pipe(res);
                    } else {
                        const { Readable } = await import('stream');
                        Readable.fromWeb(upstream.body).pipe(res);
                    }
                } else {
                    res.end();
                }
            } else {
                // Images / small assets — buffer and send
                let buffer;
                if (upstream.body && typeof upstream.body.pipe === 'function') {
                    const chunks = [];
                    for await (const chunk of upstream.body) {
                        chunks.push(chunk);
                    }
                    buffer = Buffer.concat(chunks);
                } else {
                    buffer = Buffer.from(await upstream.arrayBuffer());
                }
                res.setHeader('Cache-Control', 'public, max-age=86400');
                res.send(buffer);
            }
        } catch (err) {
            console.error('[PROXY-IMAGE]', err.message);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    // Save Asset (Universal for Image/Video, Local/Remote)
    router.post('/save-asset', async (req, res) => {
        try {
            if (!req.body || typeof req.body !== 'object') {
                return res.status(400).json({ error: "Invalid request: missing JSON body or Content-Type header." });
            }

            const { imageData } = req.body;
            const userId = req.body.userId || req.body.user_id;
            const type = req.body.type || 'image';
            const fileName = req.body.fileName || `asset_${Date.now()}.png`;
            
            const aspect = req.body.aspect || req.body.aspectRatio || req.body.aspect_ratio || '16:9';
            
            if (!imageData) throw new Error("No asset data provided");

            if (imageData.startsWith('https://storage.googleapis.com/') || (imageData.startsWith('http') && !imageData.includes('localhost'))) {
                const isGCS = imageData.startsWith('https://storage.googleapis.com/');
                console.log(`[SAVE-ASSET] ${isGCS ? 'GCS' : 'Public'} URL detected, saving to DB only`);
                
                const name = fileName || `asset_${Date.now()}`;
                let dbInsertedId = `asset_${Date.now()}`;
                
                // Save locally to local_assets.json
                saveLocalAsset({
                    name: fileName || `asset_${Date.now()}`,
                    type: type,
                    url: imageData,
                    user_id: userId || 'local_user',
                    aspect: aspect
                });

                const dbClient = supabaseAdmin || supabase;
                if (dbClient && isValidUuid(userId)) {
                    console.log(`[DB-SAVE] Attempting insert for User: ${userId}, Type: ${type}`);
                    
                    const { data: insertedData, error: dbError } = await dbClient.from('assets').insert([{
                        name: fileName || `asset_${Date.now()}`,
                        type: type,
                        url: imageData,
                        user_id: userId,
                        created_at: new Date().toISOString(),
                        metadata: { aspect }
                    }]).select();

                    if (dbError) {
                        console.error("CRITICAL DATABASE ERROR:", dbError.message, dbError.details);
                        return res.status(500).json({ success: false, error: dbError.message });
                    }
                    
                    console.log('[DB-INSERT_SUCCESS] ✅ Asset Saved to DB');
                    dbInsertedId = insertedData[0].id;
                }

                return res.json({
                    success: true,
                    path: imageData,
                    url: imageData,
                    id: dbInsertedId,
                    name
                });
            }

            let publicUrl = imageData; 
            const ext = type === 'video' ? 'mp4' : type === 'audio' ? 'mp3' : 'png';
            const mimeType = type === 'video' ? 'video/mp4' : type === 'audio' ? 'audio/mpeg' : 'image/png';
            const name = fileName || `gen_${userId || 'anon'}_${Date.now()}.${ext}`;
            // Reference uploads (ref_, upload_) go to /uploads/ so gallery filters exclude them
            const isRefUpload = name.startsWith('ref_') || name.startsWith('upload_');
            let gcsPath = `users/${userId || 'anon'}/${isRefUpload ? 'uploads' : 'generated'}/${name}`;

            if (imageData.startsWith('data:')) {
                const base64Str = imageData.split(',')[1];
                const buffer = Buffer.from(base64Str, 'base64');
                
                try {
                    const gcsUrl = await storageService.uploadToGCS(buffer, gcsPath, mimeType);
                    if (gcsUrl) {
                        publicUrl = gcsUrl;
                        console.log(`[STORAGE] Uploaded ${type} to GCS: ${publicUrl}`);
                    }
                } catch (gcsErr) {
                    console.error(`[SERVER] GCS Upload failed:`, gcsErr.message);
                    throw gcsErr;
                }
            }

            // Reference uploads are NOT gallery items — skip local_assets.json save
            if (!isRefUpload) {
                saveLocalAsset({
                    name,
                    type,
                    url: publicUrl,
                    user_id: userId || 'local_user',
                    aspect: aspect
                });
            }

            let insertedId = `asset_${Date.now()}`;
            const dbClient = supabaseAdmin || supabase;
            if (dbClient && isValidUuid(userId)) {
                // Use 'reference_upload' type for ref items so gallery queries can filter them out
                const dbType = isRefUpload ? 'reference_upload' : type;
                const { data: dbData, error: dbError } = await dbClient
                    .from('assets')
                    .insert([{
                        name,
                        type: dbType,
                        url: publicUrl,
                        user_id: userId,
                        created_at: new Date().toISOString(),
                        metadata: { aspect }
                    }])
                    .select();
                if (dbError) {
                    console.error("❌ [SERVER] Supabase DB Insert Error:", dbError.message, dbError.details);
                } else if (dbData && dbData.length > 0) {
                    insertedId = dbData[0].id;
                    console.log(`✅ [GCS-DB-SAVE] Success:`, insertedId);
                }
            }

            res.json({ success: true, path: gcsPath, url: publicUrl, id: insertedId });
        } catch (err) {
            console.error('[BACKEND_SAVE_ERROR]:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // Proxy TTS
    router.post('/proxy/tts', async (req, res) => {
        try {
            const { text, voiceId } = req.body;
            if (!text) throw new Error('No text provided');

            console.log(`[SERVER] Synthesizing speech via Gemini Engine for: ${voiceId}`);
            const audioData = await geminiService.synthesizeSpeech(text, voiceId);

            if (audioData) {
                return res.json({ audioContent: audioData });
            }

            throw new Error('Speech synthesis failed');
        } catch (error) {
            console.error('TTS Proxy Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Proxy STT
    router.post('/proxy/stt', async (req, res) => {
        try {
            const { audio } = req.body;
            if (!audio) throw new Error('No audio data provided');
            const result = await audioService.transcribeSpeech(audio);
            if (!result.success) throw new Error(result.error);
            res.json({ transcription: result.transcription });
        } catch (error) {
            console.error('STT Proxy Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Workspace Script Import
    router.post('/workspace/import-doc', async (req, res) => {
        try {
            const { docId } = req.body;
            if (!docId) throw new Error('No Doc ID provided');
            const result = await workspaceService.parseGoogleDocScript(docId);
            if (!result) throw new Error('Failed to parse Google Doc');
            res.json(result);
        } catch (error) {
            console.error('Workspace Import Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Upload asset
    router.post('/upload-asset', async (req, res) => {
        try {
            const image = req.body.image || req.body.data || req.body.imageData;
            const { userId, type = 'image', filename, folder } = req.body;
            if (!image) throw new Error("No image data provided");

            const mimeMatch = image.match(/^data:(image\/[a-zA-Z+]+|video\/[a-zA-Z0-9]+);base64,/);
            const mimeType = mimeMatch ? mimeMatch[1] : (type === 'video' ? 'video/mp4' : 'image/png');
            const ext = mimeType.split('/')[1] || (type === 'video' ? 'mp4' : 'png');
            
            const aspect = req.body.aspect || req.body.aspectRatio || req.body.aspect_ratio || '16:9';

            const base64Str = image.split(',')[1] || image;
            const buffer = Buffer.from(base64Str, 'base64');

            // Determine if this is a reference upload or a generated asset
            const isRefUpload = folder === 'reference' || folder === 'uploads';
            const namePrefix = isRefUpload ? 'ref_' : 'gen_';
            const name = filename || `${namePrefix}${Date.now()}.${ext}`;
            const storagePath = isRefUpload ? 'uploads' : (folder || 'generated');
            const filePath = `users/${userId || 'anon'}/${storagePath}/${name}`;
            const dbType = isRefUpload ? 'reference_upload' : type;

            const publicUrl = await storageService.uploadToGCS(buffer, filePath, mimeType, BUCKET_NAME);
            
            // Only save generated assets to local_assets.json (not reference uploads)
            if (!isRefUpload) {
                saveLocalAsset({
                    name,
                    type,
                    url: publicUrl,
                    user_id: userId || 'local_user',
                    aspect: aspect,
                    metadata: { folder: storagePath }
                });
            }

            // Save to assets database table in Supabase
            const dbClient = supabaseAdmin || supabase;
            if (dbClient && isValidUuid(userId)) {
                try {
                    await dbClient.from('assets').insert([{
                        name,
                        type: dbType,
                        url: publicUrl,
                        user_id: userId,
                        created_at: new Date().toISOString(),
                        metadata: { aspect, folder: storagePath }
                    }]);
                    console.log(`[UPLOAD-ASSET] Saved ${dbType} to DB for user ${userId}`);
                } catch (dbErr) {
                    console.warn('[UPLOAD-ASSET] DB insert failed:', dbErr.message);
                }
            }

            res.json({ success: true, url: publicUrl, path: filePath });
        } catch (err) {
            console.error('[UPLOAD-ASSET-ERR]', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // Proxy asset
    router.get('/proxy/asset', async (req, res) => {
        try {
            const { path: assetPath, bucket: targetBucket } = req.query;
            if (!assetPath) return res.status(400).send("path is required");
            
            const activeBucket = targetBucket || BUCKET_NAME;
            const file = storage.bucket(activeBucket).file(assetPath);
            const [exists] = await file.exists();
            
            if (!exists) {
                return res.status(404).send(`Asset ${assetPath} not found in ${activeBucket}`);
            }

            const [metadata] = await file.getMetadata();
            res.set({
                'Content-Type': metadata.contentType || 'application/octet-stream',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=31536000',
            });

            const stream = file.createReadStream();
            stream.on('error', (streamErr) => {
                console.error('[PROXY-STREAM-ERR]', streamErr.message);
                if (!res.headersSent) res.status(500).send(streamErr.message);
            });
            stream.pipe(res);
        } catch (err) {
            console.error('[PROXY-ERR]', err.message);
            res.status(500).send(err.message);
        }
    });

    return router;
}
