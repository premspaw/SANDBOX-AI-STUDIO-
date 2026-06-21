import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function createRouter(deps) {
    const router = express.Router();
    const {
        supabase,
        supabaseAdmin,
        storageService,
        storage,
        BUCKET_NAME,
        MARKETING_BUCKET,
        supabaseRestGet,
        LOCAL_ASSETS_FILE,
        requireAuth,
        openaiChat
    } = deps;

    // Helper middleware to check if user has admin role
    async function requireAdmin(req) {
        const user = await requireAuth(req);
        const adminClient = supabaseAdmin || supabase;
        if (!adminClient) throw Object.assign(new Error('Database not configured'), { status: 503 });

        const { data: profile, error } = await adminClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (error || profile?.role !== 'admin') {
            throw Object.assign(new Error('Forbidden: Admin access required'), { status: 403 });
        }
        return user;
    }

    // Agent Memory get (secured)
    router.get('/agent/memory', async (req, res) => {
        try {
            const user = await requireAuth(req);
            const { userId } = req.query;
            if (!userId) return res.status(400).json({ error: 'userId is required' });
            if (user.id !== userId) {
                return res.status(403).json({ error: 'Forbidden: You can only access your own agent memory.' });
            }
            
            let memories = [];
            try {
                memories = await storageService.readFromR2(`agent-memory/${userId}.json`);
                if (!Array.isArray(memories)) memories = [];
            } catch (_) {
                memories = [];
            }
            res.json({ memories });
        } catch (err) {
            console.error('[Agent Memory GET]', err.message);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    // Agent Memory post (secured)
    router.post('/agent/memory', async (req, res) => {
        try {
            const user = await requireAuth(req);
            const { userId, memories } = req.body;
            if (!userId || !Array.isArray(memories)) {
                return res.status(400).json({ error: 'userId and memories array are required' });
            }
            if (user.id !== userId) {
                return res.status(403).json({ error: 'Forbidden: You can only modify your own agent memory.' });
            }
            const payload = Buffer.from(JSON.stringify(memories, null, 2));
            await storageService.writeToR2(`agent-memory/${userId}.json`, payload);
            res.json({ success: true, count: memories.length });
        } catch (err) {
            console.error('[Agent Memory POST]', err.message);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    // Agent Chat (secured)
    router.post('/agent/chat', async (req, res) => {
        try {
            await requireAuth(req);
            const { history, systemPrompt, memory = [] } = req.body;
            if (!Array.isArray(history) || history.length === 0) {
                return res.status(400).json({ error: 'history is required' });
            }
            const openaiKey = process.env.OPENAI_API_KEY;
            if (!openaiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not set' });

            const memoryBlock = memory.length > 0
                ? `\n\n[SESSION MEMORY]\n${memory.map((m, i) => `${i + 1}. ${m}`).join('\n')}`
                : '';

            const messages = [
                { role: 'system', content: (systemPrompt || 'You are a helpful AI agent.') + memoryBlock },
                ...history
            ];

            const resp = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4.1',
                    messages,
                    max_tokens: 4096,
                    temperature: 0.75,
                })
            });
            const data = await resp.json();
            if (!resp.ok) return res.status(resp.status).json({ error: data?.error?.message || 'OpenAI error' });
            const text = data.choices?.[0]?.message?.content || '';
            res.json({ text });
        } catch (err) {
            console.error('[Agent Chat]', err.message);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    // List Assets (secured)
    router.get('/list-assets', async (req, res) => {
        try {
            const user = await requireAuth(req);
            let { userId } = req.query;
            if (!userId || userId === 'null' || userId === 'undefined' || userId === '') {
                userId = user.id;
            }

            if (user.id !== userId) {
                const adminClient = supabaseAdmin || supabase;
                const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single();
                if (profile?.role !== 'admin') {
                    return res.status(403).json({ error: 'Forbidden: You can only view your own assets.' });
                }
            }

            console.log(`[SERVER] Fetching assets for user: ${userId}`);

            let dbData = [];
            if (supabase) {
                try {
                    const q = `assets?user_id=eq.${userId}&select=*&order=created_at.desc&limit=100`;
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second safety timeout
                    
                    dbData = await supabaseRestGet(q, 8000);
                    clearTimeout(timeoutId);

                    if (!Array.isArray(dbData)) dbData = [];
                } catch (sbErr) {
                    console.warn("[SERVER] Supabase assets fetch failed or timed out:", sbErr.message);
                    dbData = [];
                }
            }

            // Always read and merge local JSON database
            const localAssets = [];
            try {
                if (fs.existsSync(LOCAL_ASSETS_FILE)) {
                    const fileAssets = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf8'));
                    fileAssets.forEach(a => {
                        if (a.user_id === userId) {
                            localAssets.push(a);
                        }
                    });
                }
            } catch (e) {
                console.error('[LOCAL-DB] Failed to read local fallback:', e.message);
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

            const formattedAssets = uniqueAssets.slice(0, 100).map(a => {
                let name = a.name || 'Generated Asset';
                let isTemplate = false;
                try {
                    if (name.startsWith('{') && name.endsWith('}')) {
                        const parsedName = JSON.parse(name);
                        name = parsedName.name || 'Marketing Asset';
                        isTemplate = parsedName.category ? true : false;
                    }
                } catch (_) {}

                let aspect = '16:9';
                let folder = 'generated';
                if (a.metadata) {
                    if (typeof a.metadata === 'object') {
                        aspect = a.metadata.aspect || a.metadata.aspect_ratio || aspect;
                        folder = a.metadata.folder || folder;
                    } else if (typeof a.metadata === 'string') {
                        try {
                            const parsed = JSON.parse(a.metadata);
                            aspect = parsed.aspect || parsed.aspect_ratio || aspect;
                            folder = parsed.folder || folder;
                        } catch (_) {}
                    }
                }
                if (aspect === '16:9' && (a.aspect || a.aspect_ratio)) {
                    aspect = a.aspect || a.aspect_ratio;
                }

                return {
                    id: a.id,
                    name,
                    type: a.type || 'image',
                    url: a.url,
                    date: a.created_at ? new Date(a.created_at).toISOString().split('T')[0] : 'Recently',
                    aspect,
                    prompt: a.prompt || '',
                    isTemplate,
                    folder
                };
            });

            res.json({ assets: formattedAssets });
        } catch (err) {
            console.error('List Assets Error:', err);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    // List Characters (secured)
    router.get('/list-characters', async (req, res) => {
        try {
            const user = await requireAuth(req);
            let { userId } = req.query;
            if (!userId || userId === 'null' || userId === 'undefined' || userId === '') {
                userId = user.id;
            }

            if (user.id !== userId) {
                const adminClient = supabaseAdmin || supabase;
                const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single();
                if (profile?.role !== 'admin') {
                    return res.status(403).json({ error: 'Forbidden: You can only view your own characters.' });
                }
            }
            if (!supabase) return res.json({ characters: [] });

            let dbData = [];
            console.log("[SERVER] Fetching characters via REST (IPv4)...");
            try {
                const q = `characters?user_id=eq.${userId}&select=*&order=timestamp.desc&limit=50`;

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);

                dbData = await supabaseRestGet(q, 8000);
                clearTimeout(timeoutId);

                if (!Array.isArray(dbData)) dbData = [];
                console.log(`[SERVER] ✅ Found ${dbData.length} characters.`);
            } catch (err) {
                console.warn("[SERVER] list-characters fetch failed or timed out:", err.message);
                dbData = [];
            }

            const formattedChars = dbData.map(c => {
                const parseJson = (val) => {
                    if (!val) return null;
                    if (typeof val === 'object') return val;
                    try { return JSON.parse(val); } catch (e) { return null; }
                };

                const kit = parseJson(c.identity_kit || c.identityKit);
                const meta = parseJson(c.metadata);

                const anchor = c.image ||
                    c.photo ||
                    kit?.anchor ||
                    meta?.image ||
                    meta?.photo ||
                    meta?.identityKit?.anchor ||
                    meta?.anchorImage ||
                    meta?.anchor ||
                    '';

                return {
                    id: c.id,
                    type: 'character',
                    name: c.name || 'Anonymous Identity',
                    visualStyle: c.visual_style || c.visualStyle || 'Realistic',
                    origin: c.origin || 'Unknown Sector',
                    anchorImage: anchor,
                    kitImages: {
                        anchor: anchor,
                        profile: kit?.profile || meta?.identityKit?.profile || meta?.kit?.profile || '',
                        expression: kit?.expression || meta?.identityKit?.expression || meta?.kit?.expression || '',
                        halfBody: kit?.halfBody || meta?.identityKit?.halfBody || meta?.kit?.halfBody || '',
                        fullBody: kit?.fullBody || meta?.identityKit?.fullBody || meta?.kit?.fullBody || '',
                        closeUp: kit?.closeUp || meta?.identityKit?.closeUp || meta?.kit?.closeUp || ''
                    },
                    date: c.timestamp ? new Date(c.timestamp).toISOString().split('T')[0] : 'Recently',
                    isCharacter: true,
                    rawData: { ...c, identity_kit: kit, metadata: meta }
                };
            });

            res.json({ characters: formattedChars });
        } catch (error) {
            console.error('List Characters Error:', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    });

    // Delete character (secured)
    router.delete('/delete-character/:id', async (req, res) => {
        try {
            const user = await requireAuth(req);
            const { id } = req.params;
            if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

            console.log(`[SERVER] Deleting character: ${id}`);

            // Fetch character to verify owner
            const { data: character } = await supabase.from('characters').select('user_id').eq('id', id).single();
            if (character && character.user_id !== user.id) {
                // Check if user is admin
                const adminClient = supabaseAdmin || supabase;
                const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single();
                if (profile?.role !== 'admin') {
                    return res.status(403).json({ error: 'Forbidden: You do not own this character.' });
                }
            }

            const { error } = await supabase
                .from('characters')
                .delete()
                .eq('id', id);

            if (error) {
                console.error(`[SERVER] Delete Character Error:`, error.message);
                throw error;
            }

            console.log(`[SERVER] Character ${id} deleted successfully`);
            res.json({ success: true, deletedId: id });
        } catch (error) {
            console.error('Delete Character Error:', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    });

    // Character image mirror to GCS (secured)
    router.post('/characters/mirror-to-gcs', async (req, res) => {
        try {
            const user = await requireAuth(req);
            const { characterId, imageUrl, imageName } = req.body;
            if (!supabaseAdmin) throw new Error("Supabase Admin is required");

            const { data: character } = await supabaseAdmin.from('characters').select('user_id').eq('id', characterId).single();
            if (character && character.user_id !== user.id) {
                const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
                if (profile?.role !== 'admin') {
                    return res.status(403).json({ error: 'Forbidden: You do not own this character.' });
                }
            }
            
            const imgResp = await fetch(imageUrl);
            if (!imgResp.ok) throw new Error(`Could not fetch image: HTTP ${imgResp.status}`);
            const buffer = Buffer.from(await imgResp.arrayBuffer());
            const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
            const ext = contentType.includes('png') ? 'png' : 'jpg';
            const fileName = `characters/${imageName || characterId}_${Date.now()}.${ext}`;

            const publicUrl = await storageService.uploadToGCS(buffer, fileName, contentType, BUCKET_NAME);
            const gcsUri = `gs://${BUCKET_NAME}/${fileName}`;

            // Save back to character in DB
            const { error: dbError } = await supabaseAdmin
                .from('characters')
                .update({
                    image: publicUrl,
                    metadata: {
                        image: publicUrl,
                        gcsUri
                    }
                })
                .eq('id', characterId);

            if (dbError) throw dbError;

            res.json({ success: true, publicUrl, gcsUri });
        } catch (err) {
            console.error('[CHAR-MIRROR-ERR]', err.message);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    // Character ensure GCS (secured)
    router.post('/characters/ensure-gcs', async (req, res) => {
        try {
            const user = await requireAuth(req);
            const { characterId } = req.body;
            if (!supabaseAdmin) throw new Error("Supabase Admin is required");

            const { data: character } = await supabaseAdmin.from('characters').select('user_id').eq('id', characterId).single();
            if (character && character.user_id !== user.id) {
                const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
                if (profile?.role !== 'admin') {
                    return res.status(403).json({ error: 'Forbidden: You do not own this character.' });
                }
            }

            const { data: char, error: fetchError } = await supabaseAdmin
                .from('characters')
                .select('*')
                .eq('id', characterId)
                .single();

            if (fetchError || !char) throw new Error("Character not found");

            const metadata = char.metadata || {};
            if (metadata.gcsUri && metadata.gcsUri.startsWith('gs://')) {
                return res.json({ success: true, publicUrl: char.image, gcsUri: metadata.gcsUri });
            }

            const imageUrl = char.image || char.photo;
            if (!imageUrl || imageUrl.startsWith('data:')) {
                throw new Error("No valid external image to mirror");
            }

            const imgResp = await fetch(imageUrl);
            if (!imgResp.ok) throw new Error(`Could not fetch image: HTTP ${imgResp.status}`);
            const buffer = Buffer.from(await imgResp.arrayBuffer());
            const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
            const ext = contentType.includes('png') ? 'png' : 'jpg';
            const fileName = `characters/${characterId}_${Date.now()}.${ext}`;

            const publicUrl = await storageService.uploadToGCS(buffer, fileName, contentType, BUCKET_NAME);
            const gcsUri = `gs://${BUCKET_NAME}/${fileName}`;

            const { error: dbError } = await supabaseAdmin
                .from('characters')
                .update({
                    image: publicUrl,
                    metadata: {
                        ...metadata,
                        image: publicUrl,
                        gcsUri
                    }
                })
                .eq('id', characterId);

            if (dbError) throw dbError;

            res.json({ success: true, publicUrl, gcsUri });
        } catch (err) {
            console.error('[CHAR-ENSURE-ERR]', err.message);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    // Save character (secured)
    router.post('/proxy/save-character', async (req, res) => {
        try {
            const user = await requireAuth(req);
            if (!supabase) throw new Error("Supabase not configured");
            const { character } = req.body;

            if (character.user_id && character.user_id !== user.id) {
                const adminClient = supabaseAdmin || supabase;
                const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single();
                if (profile?.role !== 'admin') {
                    return res.status(403).json({ error: 'Forbidden: You cannot save a character for another user.' });
                }
            }
            if (!character.user_id) {
                character.user_id = user.id;
            }

            let bestImage = '';
            const candidates = [
                character.image,
                character.photo,
                character.identityKit?.anchor,
                character.identity_kit?.anchor
            ].filter(Boolean);

            for (const candidate of candidates) {
                if (candidate && !candidate.startsWith('data:')) {
                    bestImage = candidate;
                    break;
                }
            }

            if (!bestImage && candidates.length > 0 && candidates[0].startsWith('data:')) {
                // If all candidate images are base64, we need to upload them
                const base64 = candidates[0];
                let mimeType = 'image/png';
                let extension = 'png';
                let data = base64;

                if (base64.includes(',')) {
                    const [meta, b64Data] = base64.split(',');
                    mimeType = meta.split(':')[1]?.split(';')[0] || 'image/png';
                    extension = mimeType.split('/')[1] || 'png';
                    data = b64Data;
                }

                const filePath = `users/characters/${character.id || 'unknown'}/anchor_${Date.now()}.${extension}`;
                const buffer = Buffer.from(data, 'base64');
                bestImage = await storageService.uploadToGCS(buffer, filePath, mimeType);
            }

            const finalChar = {
                ...character,
                image: bestImage,
                timestamp: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('characters')
                .upsert([finalChar], { onConflict: 'id' })
                .select();

            if (error) throw error;
            res.json({ success: true, character: data?.[0] || finalChar });
        } catch (error) {
            console.error('Save Character Error:', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    });

    // Supabase Health
    router.get('/supabase-health', async (req, res) => {
        try {
            if (!supabase) return res.status(503).json({ status: 'offline', error: 'Client uninitialized' });
            const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            if (error) throw error;
            res.json({ status: 'online', total_profiles: count });
        } catch (error) {
            console.error('Supabase Health Error:', error);
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    // Supabase Status
    router.get('/supabase-status', async (req, res) => {
        if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
        try {
            const { count, error } = await supabase.from('assets').select('*', { count: 'exact', head: true });
            if (error) throw error;
            res.json({ connection: 'ok', total_assets: count });
        } catch (err) {
            res.status(500).json({ connection: 'failed', error: err.message });
        }
    });

    // Get Landing Page Assets Configuration (remains public for static site rendering)
    router.get('/get-landing-assets', async (req, res) => {
        const defaultAssets = {
            heroBackground: "",
            backgroundMusic: "",
            pipelineDemo: "",
            gallery: []
        };

        try {
            try {
                const filePath = path.join(__dirname, '..', '..', 'src', 'config', 'landingAssets.js');
                if (fs.existsSync(filePath)) {
                    let content = fs.readFileSync(filePath, 'utf8');
                    const jsonMatch = content.match(/export const LANDING_ASSETS = (\{[\s\S]*\});/);
                    if (jsonMatch) {
                        try {
                            const objectStr = jsonMatch[1];
                            const parsed = new Function('return ' + objectStr)();
                            console.log("[SERVER] Extracted landing assets from local JS file (Priority 1).");
                            return res.json(parsed);
                        } catch (parseErr) {
                            console.warn("[SERVER] Local file JS evaluation failed:", parseErr.message);
                        }
                    }
                }
            } catch (fileErr) {
                console.warn("[SERVER] Local config fetch failed:", fileErr.message);
            }

            if (supabase) {
                try {
                    const { data, error } = await supabase
                        .from('app_settings')
                        .select('setting_value')
                        .eq('setting_key', 'landing_assets')
                        .single();

                    if (!error && data?.setting_value) {
                        console.log("[SERVER] Fetched landing assets from Supabase (Priority 2).");
                        return res.json(data.setting_value);
                    }
                } catch (supaErr) {
                    console.warn("[SERVER] Supabase landing assets fetch exception:", supaErr.message);
                }
            }

            return res.json(defaultAssets);
        } catch (error) {
            console.error('Final Landing Assets Catch:', error);
            if (!res.headersSent) {
                return res.json(defaultAssets);
            }
        }
    });

    // Update Landing Assets (secured: admin only)
    router.post('/update-landing-assets', async (req, res) => {
        try {
            await requireAdmin(req);
            const { assets } = req.body;
            if (!assets) throw new Error("No assets provided");

            if (supabase) {
                const { error: dbError } = await supabase
                    .from('app_settings')
                    .upsert({
                        setting_key: 'landing_assets',
                        setting_value: assets,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'setting_key' });

                if (dbError) {
                    console.error("[SERVER] Supabase Update Error:", dbError.message);
                    throw new Error(`Supabase update failed: ${dbError.message}`);
                }
                console.log("[SERVER] Updated landing assets in Supabase.");
            }

            const filePath = path.join(__dirname, '..', '..', 'src', 'config', 'landingAssets.js');
            const content = `/**
     * LANDING PAGE ASSET CONFIGURATION
     * 
     * Auto-generated via Asset Manager UI.
     */

    export const LANDING_ASSETS = ${JSON.stringify(assets, null, 4)};
    `;

            try {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`[SERVER] Updated local fallback at: ${filePath}`);
            } catch (fsErr) {
                console.warn("[SERVER] Local file update failed (likely read-only FS):", fsErr.message);
            }

            res.json({ success: true, message: 'Landing assets updated successfully (Supabase + Local)' });
        } catch (error) {
            console.error('Update Landing Assets Error:', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    });

    // Landing Assets Library (secured)
    router.get('/landing-assets-library', async (req, res) => {
        try {
            await requireAuth(req);
            if (!supabase) return res.json({ assets: [] });

            const folders = ['', 'videos', 'generated', 'refs'];
            const allAssets = [];

            for (const folder of folders) {
                const { data, error } = await supabase.storage
                    .from('assets')
                    .list(folder, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

                if (error || !data) continue;

                const files = data
                    .filter(f => f.id !== null)
                    .map(file => {
                        const pathStr = folder ? `${folder}/${file.name}` : file.name;
                        return {
                            id: file.id,
                            name: file.name,
                            url: supabase.storage.from('assets').getPublicUrl(pathStr).data.publicUrl,
                            type: file.name.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image',
                            size: file.metadata?.size || 0,
                            created_at: file.created_at
                        };
                    });

                allAssets.push(...files);
            }

            res.json({ assets: allAssets });
        } catch (err) {
            console.error('[ASSET-LIBRARY]', err);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    // Delete asset (secured)
    router.delete('/delete-asset/:id', async (req, res) => {
        try {
            const user = await requireAuth(req);
            const { id } = req.params;
            if (!supabase) return res.status(500).json({ error: 'Supabase client missing' });

            const { data: asset } = await supabase.from('assets').select('user_id').eq('id', id).single();
            if (asset && asset.user_id !== user.id) {
                const adminClient = supabaseAdmin || supabase;
                const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single();
                if (profile?.role !== 'admin') {
                    return res.status(403).json({ error: 'Forbidden: You do not own this asset.' });
                }
            }

            const { error } = await supabase.from('assets').delete().eq('id', id);
            if (error) throw error;
            res.json({ success: true, deletedId: id });
        } catch (error) {
            console.error('Delete Asset Error:', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    });

    // Marketing templates recover from R2 (secured: admin only)
    router.post('/marketing/recover-from-r2', async (req, res) => {
        try {
            await requireAdmin(req);
            const files = await storageService.listAssetsGCS('marketing/reference/', MARKETING_BUCKET);
            let recovered = 0;
            for (const file of files) {
                if (file.name.match(/\.(png|jpg|jpeg)$/i)) {
                    const url = storageService.getPublicUrl(file.name, MARKETING_BUCKET);
                    const name = path.basename(file.name);
                    const { error } = await (supabaseAdmin || supabase).from('assets').insert([{
                        name,
                        type: 'marketing_template',
                        url,
                        user_id: 'anon',
                        created_at: new Date().toISOString()
                    }]);
                    if (!error) recovered++;
                }
            }
            res.json({ recovered, total: files.length });
        } catch (err) {
            console.error('[MARKETING-RECOVER]', err.message);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    // Marketing templates get (remains user accessible for prompt suggestions)
    router.get('/marketing/templates', async (req, res) => {
        try {
            let rows = [];
            if (supabase) {
                try {
                    const r = await fetch(`${sbAssetsUrl()}?or=(type.eq.marketing_template,and(type.eq.image,name.like.*%22category%22:*))&order=created_at.desc`, { headers: sbH() });
                    if (r.ok) {
                        const data = await r.json();
                        rows = data.map(row => {
                            let meta = {};
                            try { meta = JSON.parse(row.name); } catch (_) { meta = { name: row.name }; }
                            const imgUrl = row.url;
                            return { id: meta.id || row.id, name: meta.name || row.name, image_url: imgUrl, prompt: meta.prompt || '', aspect: meta.aspect || '16/9', category: meta.category || 'other' };
                        });
                    }
                } catch (sbErr) {
                    console.warn('[SERVER] Supabase REST templates fetch failed:', sbErr.message);
                }
            }

            const localAssets = [];
            try {
                if (fs.existsSync(LOCAL_ASSETS_FILE)) {
                    const fileAssets = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf8'));
                    fileAssets.forEach(a => {
                        if ((a.type || '').toLowerCase() === 'marketing_template') {
                            let meta = {};
                            try { meta = JSON.parse(a.name); } catch (_) { meta = { name: a.name }; }
                            localAssets.push({
                                id: a.id,
                                name: meta.name || a.name,
                                image_url: a.url,
                                prompt: meta.prompt || a.prompt || '',
                                aspect: meta.aspect || '16/9',
                                category: meta.category || 'other'
                            });
                        }
                    });
                }
            } catch (e) {
                console.error('[LOCAL-DB] Failed to read local templates:', e.message);
            }

            const merged = [...localAssets, ...rows];
            const uniqueUrls = new Set();
            const finalRows = merged.filter(item => {
                if (!item.image_url) return false;
                if (uniqueUrls.has(item.image_url)) return false;
                uniqueUrls.add(item.image_url);
                return true;
            });

            res.json(finalRows);
        } catch (err) {
            console.error('Marketing templates error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // Marketing templates post (secured: admin only)
    router.post('/marketing/templates', async (req, res) => {
        try {
            await requireAdmin(req);
            const { id, name, image_url, prompt, aspect, category, user_id } = req.body;
            if (!image_url || !name || !prompt) {
                return res.status(400).json({ error: 'Missing required template fields' });
            }

            const meta = JSON.stringify({
                id, // Store client-side ID in the JSON metadata
                name,
                prompt,
                aspect: aspect || '16/9',
                category: category || 'other',
                isTemplate: true
            });

            // 1. Save to local_assets.json
            try {
                let localAssets = [];
                if (fs.existsSync(LOCAL_ASSETS_FILE)) {
                    localAssets = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf8'));
                }
                
                // Remove any existing one with same ID to overwrite
                localAssets = localAssets.filter(a => a.id !== id);

                localAssets.unshift({
                    id,
                    name: meta,
                    url: image_url,
                    type: 'marketing_template',
                    user_id: user_id || 'local_user',
                    created_at: new Date().toISOString()
                });

                fs.writeFileSync(LOCAL_ASSETS_FILE, JSON.stringify(localAssets, null, 2), 'utf8');
                console.log(`[LOCAL-DB] Saved template ${id} to ${LOCAL_ASSETS_FILE}`);
            } catch (err) {
                console.error('[LOCAL-DB] Failed to save template locally:', err.message);
            }

            // 2. Save to Supabase assets table
            if (supabase) {
                try {
                    const isUuid = user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id);
                    const payload = {
                        name: meta,
                        url: image_url,
                        type: 'image', // Use 'image' to bypass constraint while we filter using isTemplate flag
                        user_id: isUuid ? user_id : null,
                        created_at: new Date().toISOString()
                    };

                    const r = await fetch(sbAssetsUrl(), {
                        method: 'POST',
                        headers: sbH(),
                        body: JSON.stringify(payload)
                    });
                    if (!r.ok) {
                        const errData = await r.json().catch(() => ({}));
                        console.warn('[SERVER] Supabase REST template save failed:', errData);
                    } else {
                        console.log(`[DB-SAVE] Successfully saved template ${id} to assets table.`);
                    }
                } catch (sbErr) {
                    console.warn('[SERVER] Supabase REST template save exception:', sbErr.message);
                }
            }

            res.json({ success: true, id });
        } catch (err) {
            console.error('Save template error:', err);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    // Marketing templates delete (secured: admin only)
    router.delete('/marketing/templates/:id', async (req, res) => {
        try {
            await requireAdmin(req);
            const { id } = req.params;

            // 1. Delete from local_assets.json
            try {
                if (fs.existsSync(LOCAL_ASSETS_FILE)) {
                    let localAssets = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf8'));
                    const originalLength = localAssets.length;
                    localAssets = localAssets.filter(a => a.id !== id);
                    if (localAssets.length !== originalLength) {
                        fs.writeFileSync(LOCAL_ASSETS_FILE, JSON.stringify(localAssets, null, 2), 'utf8');
                        console.log(`[LOCAL-DB] Deleted template ${id} from ${LOCAL_ASSETS_FILE}`);
                    }
                }
            } catch (err) {
                console.error('[LOCAL-DB] Failed to delete template locally:', err.message);
            }

            // 2. Delete from Supabase assets table
            if (supabase) {
                try {
                    let dbIdToDelete = null;
                    if (id.startsWith('custom_') || id.startsWith('tpl_')) {
                        const searchUrl = `${sbAssetsUrl()}?or=(type.eq.marketing_template,and(type.eq.image,name.like.*%22category%22:*))&name=like.*%22id%22:%22${id}%22*`;
                        const searchResp = await fetch(searchUrl, { headers: sbH() });
                        if (searchResp.ok) {
                            const searchData = await searchResp.json();
                            if (searchData.length > 0) {
                                dbIdToDelete = searchData[0].id;
                            }
                        }
                    } else {
                        dbIdToDelete = id;
                    }

                    if (dbIdToDelete) {
                        const r = await fetch(`${sbAssetsUrl()}?id=eq.${dbIdToDelete}`, {
                            method: 'DELETE',
                            headers: sbH()
                        });
                        if (!r.ok) {
                            const errData = await r.json().catch(() => ({}));
                            console.warn('[SERVER] Supabase REST template delete failed:', errData);
                        } else {
                            console.log(`[DB-SAVE] Successfully deleted template ${dbIdToDelete} (client ID: ${id}) from assets table.`);
                        }
                    } else {
                        console.log(`[DB-SAVE] Template ${id} not found in Supabase assets table.`);
                    }
                } catch (sbErr) {
                    console.warn('[SERVER] Supabase REST template delete exception:', sbErr.message);
                }
            }

            res.json({ success: true, id });
        } catch (err) {
            console.error('Delete template error:', err);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    // Marketing Upload Reference (secured: user auth required)
    router.post('/marketing/upload-reference', async (req, res) => {
        try {
            const user = await requireAuth(req);
            const { image, userId, isTemplate } = req.body;
            if (!image) {
                return res.status(400).json({ error: 'No image data provided' });
            }

            if (isTemplate === true) {
                const adminClient = supabaseAdmin || supabase;
                const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single();
                if (profile?.role !== 'admin') {
                    return res.status(403).json({ error: 'Forbidden: Admin access required to upload template reference.' });
                }
            }

            // Extract base64 details
            let buffer;
            let mimeType = 'image/png';
            let ext = 'png';

            if (image.startsWith('data:')) {
                const match = image.match(/^data:([^;]+);base64,(.+)$/);
                if (match) {
                    mimeType = match[1];
                    ext = mimeType.split('/')[1] || 'png';
                    buffer = Buffer.from(match[2], 'base64');
                } else {
                    buffer = Buffer.from(image, 'base64');
                }
            } else {
                buffer = Buffer.from(image, 'base64');
            }

            const timestamp = Date.now();
            let fileName;
            if (isTemplate === true) {
                // Admin uploading a template reference image
                fileName = `marketing/reference/user_sandbox/ref_${timestamp}.${ext}`;
            } else {
                // Regular user uploading a recipe/property reference image (Temporary - target for 30-day auto-delete)
                fileName = `marketing/reference/temporary/${userId || 'anon'}/ref_${timestamp}.${ext}`;
            }

            console.log(`[Marketing] Uploading reference: ${fileName} (${mimeType})`);
            const publicUrl = await storageService.uploadToGCS(buffer, fileName, mimeType, MARKETING_BUCKET);
            
            res.json({
                success: true,
                url: publicUrl,
                bucket: 'zerolensbucket-cdn',
                path: fileName
            });
        } catch (err) {
            console.error('[Marketing] Upload reference error:', err);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    // Marketing Analyze Image (unsecured fallback support since front-end doesn't send JWT)
    router.post('/marketing/analyze-image', async (req, res) => {
        try {
            const { image } = req.body;
            if (!image) {
                return res.status(400).json({ error: 'No image data provided for analysis.' });
            }

            // Build the correct image_url value for GPT-4o Vision
            let imageUrlForVision;
            if (image.startsWith('http://') || image.startsWith('https://')) {
                // Direct public URL — pass as-is
                imageUrlForVision = image;
            } else if (image.startsWith('data:')) {
                // Already a proper data URI
                imageUrlForVision = image;
            } else {
                // Raw base64 — default to JPEG (most common uploaded format)
                imageUrlForVision = `data:image/jpeg;base64,${image}`;
            }

            console.log('[Marketing-Vision] Analyzing uploaded recipe/infographic reference image using GPT-4o Vision...');
            const systemPrompt = `You are an expert culinary analyzer and menu designer. Analyze the provided food image and return a JSON object describing the dish.
The response MUST be a JSON object with the following fields:
{
    "dish_name": string (a short, appealing name for the dish),
    "dish_presentation": string (description of the plating style, colors, arrangement),
    "ingredients": array of objects with { "name": string, "quantity": string },
    "steps": array of strings (approximate culinary steps to assemble/prepare the dish shown),
    "meta": {
        "calories": string (estimated calorie range, e.g., "350-450 kcal"),
        "time": string (estimated preparation/cooking time, e.g., "20-25 mins"),
        "servings": string (e.g., "1-2 servings")
    }
}`;

            const messages = [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Identify and analyze the food dish in this image. Extract ingredients, steps, presentation style, and meta statistics.' },
                        { type: 'image_url', image_url: { url: imageUrlForVision } }
                    ]
                }
            ];

            const content = await openaiChat(messages, 'gpt-4o', true);
            const parsed = JSON.parse(content);
            console.log(`[Marketing-Vision] Successfully analyzed dish: "${parsed.dish_name || 'Unknown'}"`);
            res.json(parsed);
        } catch (err) {
            console.error('[Marketing-Vision] Analysis failed:', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // Save Storyboard (secured)
    router.post('/proxy/save-storyboard', async (req, res) => {
        try {
            const user = await requireAuth(req);
            if (!supabase) throw new Error("Supabase client missing");
            const { storyboard } = req.body;

            if (storyboard.user_id && storyboard.user_id !== user.id) {
                const adminClient = supabaseAdmin || supabase;
                const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single();
                if (profile?.role !== 'admin') {
                    return res.status(403).json({ error: 'Forbidden: You cannot save a storyboard for another user.' });
                }
            }
            if (!storyboard.user_id) {
                storyboard.user_id = user.id;
            }

            const { data, error } = await supabase
                .from('storyboards')
                .upsert([storyboard], { onConflict: 'id' })
                .select();
            if (error) throw error;
            res.json({ success: true, storyboard: data?.[0] || storyboard });
        } catch (error) {
            console.error('Save Storyboard Error:', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    });

    // Upload Landing Assets (New Route, secures files uploads via admin panel)
    router.post('/landing-assets-upload', async (req, res) => {
        try {
            await requireAdmin(req);
            const { fileName, category, type, base64 } = req.body;
            if (!base64) {
                return res.status(400).json({ error: 'No file data provided' });
            }

            // Extract base64 details
            let buffer;
            let mimeType = type === 'video' ? 'video/mp4' : 'image/png';
            let ext = type === 'video' ? 'mp4' : 'png';

            if (base64.startsWith('data:')) {
                const match = base64.match(/^data:([^;]+);base64,(.+)$/);
                if (match) {
                    mimeType = match[1];
                    ext = mimeType.split('/')[1] || ext;
                    buffer = Buffer.from(match[2], 'base64');
                } else {
                    buffer = Buffer.from(base64, 'base64');
                }
            } else {
                buffer = Buffer.from(base64, 'base64');
            }

            const timestamp = Date.now();
            const filePath = `landing/assets/uploaded_${timestamp}.${ext}`;

            console.log(`[Landing Admin] Uploading asset: ${filePath} (${mimeType})`);
            const publicUrl = await storageService.uploadToGCS(buffer, filePath, mimeType, BUCKET_NAME);

            // Save to landing assets library (user_id = 'landing_assets')
            const dbClient = supabaseAdmin || supabase;
            if (dbClient) {
                try {
                    await dbClient.from('assets').insert([{
                        name: fileName || `landing_${timestamp}.${ext}`,
                        type: type || 'image',
                        url: publicUrl,
                        user_id: 'landing_assets',
                        created_at: new Date().toISOString()
                    }]);
                } catch (dbErr) {
                    console.warn('[Landing Admin] DB insert failed:', dbErr.message);
                }
            }

            res.json({
                success: true,
                url: publicUrl,
                path: filePath
            });
        } catch (err) {
            console.error('[Landing Admin] Upload error:', err);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    // Delete Landing Asset Library item (New Route, maps to the front-end delete action)
    router.delete('/admin/landing-assets/library/:id', async (req, res) => {
        try {
            await requireAdmin(req);
            const { id } = req.params;
            const adminClient = supabaseAdmin || supabase;
            if (!adminClient) return res.status(500).json({ error: 'Supabase client missing' });

            const { error } = await adminClient.from('assets').delete().eq('id', id);
            if (error) throw error;
            res.json({ success: true, deletedId: id });
        } catch (error) {
            console.error('Delete Landing Asset Error:', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    });

    // List Hermes skills (secured: admin only)
    router.get('/admin/hermes-skills', async (req, res) => {
        try {
            await requireAdmin(req);
            const client = supabaseAdmin || supabase;
            if (!client) return res.json({ skills: [] });

            const { data: skills, error } = await client
                .from('hermes_skills')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.json({ skills: skills || [] });
        } catch (error) {
            console.error('List Hermes Skills Error:', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    });

    // Save/Update Hermes skill (secured: admin only)
    router.post('/admin/hermes-skills', async (req, res) => {
        try {
            await requireAdmin(req);
            const client = supabaseAdmin || supabase;
            if (!client) throw new Error('Database not configured');

            const { id, name, description, system_instructions, is_active } = req.body;
            if (!name || !system_instructions) {
                return res.status(400).json({ error: 'name and system_instructions are required' });
            }

            const skillData = {
                name,
                description,
                system_instructions,
                is_active: is_active !== false,
                updated_at: new Date().toISOString()
            };

            if (id) {
                skillData.id = id;
            }

            const { data, error } = await client
                .from('hermes_skills')
                .upsert([skillData], { onConflict: 'id' })
                .select();

            if (error) throw error;
            res.json({ success: true, skill: data?.[0] });
        } catch (error) {
            console.error('Save Hermes Skill Error:', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    });

    // Delete Hermes skill (secured: admin only)
    router.delete('/admin/hermes-skills/:id', async (req, res) => {
        try {
            await requireAdmin(req);
            const client = supabaseAdmin || supabase;
            if (!client) throw new Error('Database not configured');

            const { id } = req.params;
            const { error } = await client
                .from('hermes_skills')
                .delete()
                .eq('id', id);

            if (error) throw error;
            res.json({ success: true, deletedId: id });
        } catch (error) {
            console.error('Delete Hermes Skill Error:', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    });

    // Helper functions for SB API (Supabase direct REST)
    function sbH() {
        return {
            'Content-Type': 'application/json',
            'apikey': (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim(),
            'Authorization': `Bearer ${(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()}`,
            'Prefer': 'return=representation'
        };
    }

    function sbAssetsUrl() {
        return `${(process.env.VITE_SUPABASE_URL || '').trim()}/rest/v1/assets`;
    }

    return router;
}
