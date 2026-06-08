import express from 'express';

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
            if (!url) return res.status(400).json({ error: 'url param required' });
            const r = await fetch(url);
            if (!r.ok) return res.status(r.status).send('Upstream error');
            const contentType = r.headers.get('content-type') || 'image/png';
            res.set({
                'Access-Control-Allow-Origin': '*',
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000',
            });
            const buf = await r.arrayBuffer();
            res.send(Buffer.from(buf));
        } catch (err) {
            console.error('[PROXY-IMAGE]', err.message);
            res.status(500).send('Proxy error');
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
                if (dbClient && userId) {
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
            let gcsPath = `users/${userId || 'anon'}/generated/${name}`;

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

            // Save locally to local_assets.json
            saveLocalAsset({
                name,
                type,
                url: publicUrl,
                user_id: userId || 'local_user',
                aspect: aspect
            });

            let insertedId = `asset_${Date.now()}`;
            const dbClient = supabaseAdmin || supabase;
            if (dbClient && userId) {
                const { data: dbData, error: dbError } = await dbClient
                    .from('assets')
                    .insert([{
                        name,
                        type,
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
            const { userId, type = 'image', filename } = req.body;
            if (!image) throw new Error("No image data provided");

            const mimeMatch = image.match(/^data:(image\/[a-zA-Z+]+|video\/[a-zA-Z0-9]+);base64,/);
            const mimeType = mimeMatch ? mimeMatch[1] : (type === 'video' ? 'video/mp4' : 'image/png');
            const ext = mimeType.split('/')[1] || (type === 'video' ? 'mp4' : 'png');
            
            const aspect = req.body.aspect || req.body.aspectRatio || req.body.aspect_ratio || '16:9';

            const base64Str = image.split(',')[1] || image;
            const buffer = Buffer.from(base64Str, 'base64');
            const name = filename || `upload_${Date.now()}.${ext}`;
            const filePath = `users/${userId || 'anon'}/uploads/${name}`;

            const publicUrl = await storageService.uploadToGCS(buffer, filePath, mimeType, BUCKET_NAME);
            
            // Save locally to local_assets.json
            saveLocalAsset({
                name,
                type,
                url: publicUrl,
                user_id: userId || 'local_user',
                aspect: aspect
            });

            // Save to assets database table in Supabase
            const dbClient = supabaseAdmin || supabase;
            if (dbClient && userId) {
                try {
                    await dbClient.from('assets').insert([{
                        name,
                        type,
                        url: publicUrl,
                        user_id: userId,
                        created_at: new Date().toISOString(),
                        metadata: { aspect }
                    }]);
                    console.log(`[UPLOAD-ASSET] Saved uploaded ${type} to DB for user ${userId}`);
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
