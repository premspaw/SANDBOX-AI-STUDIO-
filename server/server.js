import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the parent directory (project root)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
// Imports
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import nodeFetch from 'node-fetch';
import * as geminiService from '../src/services/geminiService.js';
import * as audioService from './services/audioService.js';
import * as storageService from './services/storageService.js';
import * as workspaceService from './services/workspaceService.js';
import * as visionService from './services/visionService.js';
import * as vectorService from './services/vectorService.js';
import * as masterExportService from './services/masterExportService.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import https from 'https';
import { analyzeWardrobeRoute, wardrobeUploadMiddleware } from './services/wardrobeAnalyzerService.js';
import { analyzeLocationRoute, locationUploadMiddleware } from './services/locationAnalyzerService.js';
import * as moodBoardService from './services/moodBoardService.js';
import * as productService from './services/productService.js';
import * as cacheService from './services/cacheService.js';
import { GoogleAuth } from 'google-auth-library';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY);

// Duplicates removed

// Force Polyfill for Node.js (fetch and File) to resolve undici timeout errors
globalThis.fetch = nodeFetch;
if (!globalThis.File) {
    const { File } = await import('node:buffer');
    globalThis.File = File;
}

const app = express();
const port = 3002;
console.log(`[SERVER] AI Key loaded: ${process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.substring(0, 5) + '...' : 'MISSING'}`);

// Storage Base URL for GCS Assets
const storageBase = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME || 'ai-cinemastudio-assets-569815811058'}`;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static assets for local GCS fallback
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets'), {
    setHeaders: (res) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));

// Rate Limiting (Protects from DDoS and API Abuses)
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests', message: 'Rate limit exceeded. Please try again in 1 minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

/**
 * Recursive helper to find video data anywhere in a JSON response.
 * Look for: uri, videoBytes, or bytesBase64Encoded.
 */
function findVideoInResponse(obj) {
    if (!obj || typeof obj !== 'object') return null;

    // Check direct properties
    if (obj.uri || obj.videoBytes || obj.bytesBase64Encoded) return obj;
    if (obj.video && (obj.video.uri || obj.video.videoBytes || obj.video.bytesBase64Encoded)) return obj.video;

    // Recurse through arrays or objects
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const result = findVideoInResponse(obj[key]);
            if (result) return result;
        }
    }
    return null;
}

// --- FORGE / IDENTITY PROTOCOL (PRIORITY) ---
app.get('/api/forge/health', (req, res) => res.json({ status: 'Forge API is Live' }));

// Analyze Identity
app.post('/api/forge/analyze', async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) throw new Error('No image provided');
        const analysis = await geminiService.analyzeIdentity(image);
        res.json({ analysis });
    } catch (error) {
        console.error('Forge Analysis Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cache Neural Universe Bible Context
app.post('/api/forge/cache-bible', async (req, res) => {
    try {
        const { bibleContext } = req.body;
        if (!bibleContext) throw new Error('No bibleContext provided');

        const cacheName = await cacheService.cacheBibleContext(bibleContext);

        // cacheName will be null if context was too small (<32k tokens) or failed
        res.json({ success: true, cacheName });
    } catch (error) {
        console.error('Forge Context Caching Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Generate Character Image
app.post('/api/forge/generate', async (req, res) => {
    try {
        const { prompt, references, aspect_ratio, resolution, identity_images, product_image, bible, duration, visualStyle } = req.body;
        const result = await geminiService.generateCharacterImage({
            prompt,
            identity_images: identity_images || references,
            product_image,
            aspectRatio: aspect_ratio || '1:1',
            resolution: resolution || '1K',
            bible,
            duration,
            visualStyle
        });
        res.json({ url: result });
    } catch (error) {
        console.error('Forge Generation Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────────────────────
// DUAL STORAGE: Supabase (UI) + GCS (Gemini native pipeline)
// ─────────────────────────────────────────────────────────────

/**
 * Resolves an image source for Gemini:
 *  - If a gs:// URI exists → return it directly (native, zero-copy)
 *  - Otherwise fetch the URL and return a { mimeType, data } inline blob
 */
async function resolveImageForGemini(imageUrl, gcsUri) {
    // Prefer GCS native URI when available
    if (gcsUri && gcsUri.startsWith('gs://')) {
        return { type: 'gcs', uri: gcsUri };
    }
    if (!imageUrl) return null;

    try {
        const resp = await nodeFetch(imageUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buffer = await resp.buffer();
        const mimeType = resp.headers.get('content-type') || 'image/jpeg';
        return {
            type: 'inline',
            mimeType,
            data: buffer.toString('base64')
        };
    } catch (err) {
        console.error('[resolveImageForGemini] Fetch failed:', err.message);
        return null;
    }
}

/**
 * POST /api/characters/mirror-to-gcs
 * Body: { characterId, imageUrl, imageName? }
 * Uploads the character image to GCS and saves gs:// URI to DB.
 */
const adminUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseAdmin = (adminUrl && adminKey) ? createClient(adminUrl, adminKey) : null;

app.post('/api/characters/mirror-to-gcs', async (req, res) => {
    try {
        const { characterId, imageUrl, imageName } = req.body;
        if (!characterId || !imageUrl) {
            return res.status(400).json({ error: 'characterId and imageUrl are required' });
        }

        // Fetch the image from Supabase/wherever
        const imgResp = await nodeFetch(imageUrl);
        if (!imgResp.ok) throw new Error(`Could not fetch image: HTTP ${imgResp.status}`);
        const buffer = await imgResp.buffer();
        const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
        const ext = contentType.includes('png') ? 'png' : 'jpg';
        const fileName = `characters/${imageName || characterId}_${Date.now()}.${ext}`;

        // Upload to GCS
        const BUCKET = process.env.GCS_BUCKET_NAME || 'ai-cinemastudio-assets-569815811058';
        const gcsUri = `gs://${BUCKET}/${fileName}`;
        await storageService.uploadToGCS(buffer, fileName, contentType);

        // Save gcs_uri back to Supabase characters table
        const { error: dbError } = await supabaseAdmin
            .from('characters')
            .update({ gcs_uri: gcsUri })
            .eq('id', characterId);

        if (dbError) {
            console.warn('[mirror-to-gcs] DB update warning:', dbError.message);
        }

        console.log(`[mirror-to-gcs] ✅ ${characterId} → ${gcsUri}`);
        res.json({ success: true, gcs_uri: gcsUri });
    } catch (err) {
        console.error('[mirror-to-gcs] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/characters/ensure-gcs
 * Body: { userId } — bulk-sync all characters for a user that are missing gcs_uri
 */
app.post('/api/characters/ensure-gcs', async (req, res) => {
    try {
        const { userId } = req.body;
        const query = supabaseAdmin
            .from('characters')
            .select('id, name, image, anchor_image, gcs_uri')
            .is('gcs_uri', null);

        if (userId) query.eq('user_id', userId);

        const { data: chars, error } = await query.limit(20);
        if (error) throw error;

        const results = [];
        for (const char of (chars || [])) {
            const imgUrl = char.anchor_image || char.image;
            if (!imgUrl) continue;
            try {
                const mirrorResp = await fetch(`http://localhost:3002/api/characters/mirror-to-gcs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ characterId: char.id, imageUrl: imgUrl, imageName: char.name?.replace(/\s+/g, '_') })
                });
                const mirrorData = await mirrorResp.json();
                results.push({ id: char.id, name: char.name, ...mirrorData });
            } catch (e) {
                results.push({ id: char.id, name: char.name, error: e.message });
            }
        }
        res.json({ synced: results.length, results });
    } catch (err) {
        console.error('[ensure-gcs] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Export helper for use in geminiService
export { resolveImageForGemini };

// --- AUDIO ORCHESTRATION (PHASE 2) ---

// Proxy TTS
app.post('/api/proxy/tts', async (req, res) => {
    try {
        const { text, voiceId } = req.body;
        if (!text) throw new Error('No text provided');

        console.log(`[SERVER] Synthesizing speech via Gemini Engine for: ${voiceId}`);
        const audioData = await geminiService.synthesizeSpeech(text, voiceId);

        if (audioData) {
            return res.json({ audioContent: audioData });
        }

        throw new Error('Speech synthesis engine (Gemini) failed to return audio data. Please try another voice or script.');
    } catch (error) {
        console.error('TTS Proxy Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Proxy STT
app.post('/api/proxy/stt', async (req, res) => {
    try {
        const { audio } = req.body; // Base64
        if (!audio) throw new Error('No audio data provided');
        const result = await audioService.transcribeSpeech(audio);
        if (!result.success) throw new Error(result.error);
        res.json({ transcription: result.transcription });
    } catch (error) {
        console.error('STT Proxy Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Workspace Script Import (PHASE 3)
app.post('/api/workspace/import-doc', async (req, res) => {
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

// Semantic Search (PHASE 4)
app.post('/api/influencer/semantic-search', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) throw new Error('No query provided');

        console.log(`[SERVER] Performing semantic search for: "${query}"`);
        const queryEmbedding = await vectorService.getEmbedding(query);
        if (!queryEmbedding) throw new Error('Failed to generate search embedding');

        // Fetch all characters to perform similarity check (demonstration mode)
        // In production, you would use Vertex AI Vector Search / pgvector
        const { data: characters, error } = await supabase
            .from('characters')
            .select('id, name, image, visual_style, origin, metadata');

        if (error) throw error;

        const results = characters
            .map(c => {
                const embedding = c.metadata?.embedding;
                if (!embedding) return null;
                const similarity = vectorService.cosineSimilarity(queryEmbedding, embedding);
                return { ...c, similarity };
            })
            .filter(c => c && c.similarity > 0.7) // Threshold
            .sort((a, b) => b.similarity - a.similarity);

        res.json({ results: results.slice(0, 10) });
    } catch (error) {
        console.error('Semantic Search Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- DIRECTOR PHASE 6: RESEARCH & THINKING ---

// Research Agent (Google Search)
app.post('/api/director/research', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) throw new Error('No query provided');
        console.log(`[PHASE 6] Research Agent conducting data-mining for: "${query}"`);
        const result = await geminiService.researchProductionContext(query);
        res.json(result);
    } catch (error) {
        console.error('Research Agent Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Thinking Mode Sequence Generation
app.post('/api/director/thinking-sequence', async (req, res) => {
    try {
        const { narrative, bible } = req.body;
        if (!narrative) throw new Error('No narrative provided');
        console.log(`[PHASE 6] Thinking Mode engaged for narrative arc.`);
        const result = await geminiService.generateThinkerSequence(narrative, bible);
        res.json(result);
    } catch (error) {
        console.error('Thinking Mode Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Initialize Supabase
const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const supabase = (supabaseUrl && supabaseKey && supabaseUrl.startsWith('https://'))
    ? createClient(supabaseUrl, supabaseKey)
    : null;

if (supabase) {
    const isServiceKey = supabaseKey === (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    console.log(`[SERVER] Supabase initialized. Using ${isServiceKey ? 'Service Role' : 'Anon'} key.`);
} else {
    console.warn("[SERVER] Supabase NOT configured. check env variables.");
}

// Helper: Supabase REST GET with forced IPv4 (bypasses undici/node-fetch IPv6 hang on Node 18)
function supabaseRestGet(tablePath, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
        const url = new URL(`${process.env.VITE_SUPABASE_URL}/rest/v1/${tablePath}`);
        const opts = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            headers: {
                'apikey': apiKey,
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            family: 4, // Force IPv4
            timeout: timeoutMs
        };
        const req = https.get(opts, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(data)); }
                    catch (e) { reject(new Error('Invalid JSON from Supabase')); }
                } else {
                    reject(new Error(`Supabase REST ${res.statusCode}: ${data.substring(0, 200)}`));
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Supabase REST timeout')); });
    });
}

// Health Check
app.get('/', (req, res) => {
    res.send('AI CinemaStudio API Proxy (Replicate Mode) is running');
});

// Debug Env
app.get('/api/debug/env', (req, res) => {
    res.json({
        node_env: process.env.NODE_ENV,
        has_google_key: !!process.env.GOOGLE_API_KEY,
        google_key_prefix: process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.substring(0, 5) : 'MISSING',
        port: port,
        time: new Date().toISOString()
    });
});

// --- Credit System Helper ---
async function consumeCredits(userId, cost) {
    if (!supabase) return true; // Bypass safely if no DB

    // Bypass for unauthenticated users in local development
    if (!userId) {
        console.warn("[CREDIT_SYSTEM] No userId provided. Bypassing credit check.");
        return true;
    }

    // 1. Check Balance
    const { data: profile, error: err1 } = await supabase
        .from('profiles')
        .select('id, shorts_balance')
        .eq('id', userId)
        .single();

    if (err1 || !profile) {
        console.error("[SERVER] Credit Check Error:", err1);
        throw new Error("Could not verify your credit balance.");
    }

    if (profile.shorts_balance < cost) {
        throw new Error(`Insufficient credits. You need ${cost} but have ${profile.shorts_balance}. Please upgrade your plan or earn more.`);
    }

    // 2. Deduct Balance
    const { error: err2 } = await supabase
        .from('profiles')
        .update({ shorts_balance: profile.shorts_balance - cost })
        .eq('id', userId);

    if (err2) {
        console.error("[SERVER] Credit Deduct Error:", err2);
        throw new Error("Failed to deduct credits from account.");
    }

    console.log(`[CREDIT_SYSTEM] Deducted ${cost} from user ${userId}. Remaining: ${profile.shorts_balance - cost}`);
    return true;
}

// --- Pricing & Subscription API ---
app.post('/api/pricing/purchase', async (req, res) => {
    try {
        const { userId, planId } = req.body;

        if (!supabase) {
            return res.status(503).json({ error: "Supabase connection not initialized" });
        }

        if (!userId || !planId) {
            return res.status(400).json({ error: "Missing userId or planId" });
        }

        // 1. Determine Credits & Tier based on planId
        let creditsToAdd = 0;
        let newTier = 'FREE';

        switch (planId.toLowerCase()) {
            case 'influencer':
                creditsToAdd = 150;
                newTier = 'INFLUENCER';
                break;
            case 'director':
                creditsToAdd = 600;
                newTier = 'DIRECTOR';
                break;
            case 'business':
                creditsToAdd = 1200;
                newTier = 'BUSINESS';
                break;
            default:
                return res.status(400).json({ error: "Invalid plan ID" });
        }

        // 2. Fetch current balance
        const { data: profile, error: err1 } = await supabase
            .from('profiles')
            .select('shorts_balance')
            .eq('id', userId)
            .single();

        if (err1 || !profile) {
            console.error("[SERVER] Pricing Update Error (Fetch):", err1);
            return res.status(500).json({ error: "Could not fetch user profile" });
        }

        const newBalance = profile.shorts_balance + creditsToAdd;

        // 3. Update Balance and Tier
        const { error: err2 } = await supabase
            .from('profiles')
            .update({
                shorts_balance: newBalance,
                tier: newTier
            })
            .eq('id', userId);

        if (err2) {
            console.error("[SERVER] Pricing Update Error (Update):", err2);
            return res.status(500).json({ error: "Failed to update profile" });
        }

        // 4. Record Transaction (Optional, but good practice)
        try {
            await supabase.from('shorts_transactions').insert({
                user_id: userId,
                amount: creditsToAdd,
                action_type: `PURCHASE_${newTier}`
            });
        } catch (txErr) {
            console.warn("[SERVER] Failed to record transaction log:", txErr);
            // Non-blocking error
        }

        console.log(`[PRICING] User ${userId} purchased ${planId}. New Balance: ${newBalance}`);
        res.json({ success: true, newBalance, newTier });

    } catch (error) {
        console.error('Pricing Purchase Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// Image Edit / Inpainting via Vertex AI
// ─────────────────────────────────────────────────────────
app.post('/api/edit-image', async (req, res) => {
    try {
        const { imageBase64, maskBase64, prompt, userId } = req.body;

        // 1. Credit Check
        await consumeCredits(userId, 5);

        // 2. Cleanup Base64 headers
        const imgClean = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const maskClean = maskBase64.replace(/^data:image\/\w+;base64,/, '');

        // 3. Use standard Gemini API with specific editing instructions
        const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image-preview' });

        const originalImagePart = {
            inlineData: { data: imgClean, mimeType: "image/jpeg" }
        };

        const maskImagePart = {
            inlineData: { data: maskClean, mimeType: "image/png" } // PNG is better for sharp mask boundaries
        };

        const editPrompt = `Perform surgical inpainting on the first image. 
The second image is a binary mask where the white pixels indicate Exactly where you must modify the image.
The rest of the image (black pixels) must remain untouched.
Action: ${prompt || "modify the highlighted area as requested"}`;

        console.log(`[IMAGE_EDIT] Prompt: "${editPrompt}"`);
        console.log(`[IMAGE_EDIT] Mask Size: ${Math.round(maskClean.length / 1024)} KB`);

        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    originalImagePart,
                    maskImagePart,
                    { text: editPrompt }
                ]
            }],
            generationConfig: {
                responseModalities: ["IMAGE"]
            }
        });

        const generatedData = result?.response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!generatedData) throw new Error("No image generated from edits");

        const dataUrl = `data:image/jpeg;base64,${generatedData}`;
        res.json({ url: dataUrl });

    } catch (error) {
        console.error("Edit Image Route Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Generate Image (Multi-Model Support)
app.post('/api/generate-image', async (req, res) => {
    try {
        const { model, prompt, aspect_ratio, image, resolution, userId } = req.body;
        console.log(`[SERVER] Received generation request for model: ${model}`);

        // Credit Check
        let cost = 1; // Default
        if (model === 'nano-banana-2' || model === 'gemini-3.1-flash-image-preview') cost = 2;
        if (model?.includes('pro') || model === 'veo-fast' || model === 'gemini-3-pro-image-preview') cost = 5;
        if (model === 'veo') cost = 5;

        await consumeCredits(userId, cost);

        // Route to appropriate model
        switch (model) {
            case 'gemini': // Compatibility for unrefreshed browsers
            case 'nano-banana':
            case 'nano-banana-2':
            case 'nano-banana-pro':
            case 'gemini-2.5-flash-image':
            case 'gemini-3.1-flash-image-preview':
            case 'gemini-3-pro-image-preview':
            case 'veo':
            case 'veo-fast':
                return await handleGoogle(req, res);

            case 'openai':
            case 'replicate':
            case 'kling':
            case 'runway':
            case 'pika':
                return res.status(501).json({
                    error: 'Coming Soon',
                    message: `${model.toUpperCase()} integration has been removed or is under development. Please try Nano Banana models.`
                });

            default:
                console.warn(`Attempted to select unknown model: ${model}`);
                return res.status(400).json({
                    error: 'Model Missing',
                    message: `The model ID '${model}' is no longer supported or was renamed. Please refresh your browser (Ctrl+R) to load the latest engines.`
                });
        }
    } catch (error) {
        console.error('Generation error:', error);
        res.status(500).json({
            error: 'AI Engineering Error',
            message: error.message || 'An unexpected error occurred during generation.'
        });
    }
});

// Generation Error cases handled further down in handler code

// Handler for Google Models (Nano Banana Native Gen & Veo Video)
// Handler for Google Models (Nano Banana Native Gen & Veo Video)
async function handleGoogle(req, res) {
    try {
        const { model, modelEngine, prompt, aspect_ratio, aspectRatio, bible } = req.body;
        const targetModel = model || modelEngine;
        const targetAspectRatio = aspect_ratio || aspectRatio || "16:9";
        const apiKey = process.env.GOOGLE_API_KEY;

        if (targetModel === 'veo' || targetModel === 'veo-fast') {
            const { duration, image, resolution, firstFrame, lastFrame, references = [] } = req.body;
            const inputImage = image || (references.length > 0 ? references[0] : null);

            const modelName = targetModel === 'veo-fast' ? 'veo-3.1-fast-generate-preview' : 'veo-3.1-generate-preview';
            console.log(`Calling Google Veo (${inputImage ? 'I2V' : 'T2V'}) with prompt:`, prompt);

            // Helper to get base64 and mime type from various image sources
            async function getImageData(input) {
                if (!input) return null;
                let imageData = '';
                let mimeType = 'image/png';
                if (input.startsWith('data:')) {
                    const match = input.match(/^data:([^;]+);base64,/);
                    if (match) mimeType = match[1];
                    imageData = input.split(',')[1];
                } else if (input.startsWith('http') || input.startsWith('//')) {
                    const fullUrl = input.startsWith('//') ? `https:${input}` : input;
                    const imgResp = await fetch(fullUrl);
                    const buffer = await imgResp.arrayBuffer();
                    imageData = Buffer.from(buffer).toString('base64');
                    const contentType = imgResp.headers.get('content-type');
                    if (contentType) mimeType = contentType;
                } else if (input.startsWith('/assets/')) {
                    const localPath = path.join(__dirname, 'public', input);
                    if (fs.existsSync(localPath)) {
                        imageData = fs.readFileSync(localPath).toString('base64');
                    }
                } else {
                    imageData = input;
                }
                return { bytesBase64Encoded: imageData, mimeType };
            }

            let instance = { prompt: prompt };

            // Handle First/Last Frame Transitions (Priority)
            if (firstFrame || lastFrame) {
                if (firstFrame) {
                    const frameData = await getImageData(firstFrame);
                    if (frameData) instance.first_frame_image = frameData;
                }
                if (lastFrame) {
                    const frameData = await getImageData(lastFrame);
                    if (frameData) instance.last_frame_image = frameData;
                }
            }
            // Fallback to standard I2V if no first/last but specific image provided
            else if (inputImage) {
                const frameData = await getImageData(inputImage);
                if (frameData) instance.image = frameData;
            }

            const initialResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predictLongRunning?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances: [instance],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: aspect_ratio || "16:9",
                        durationSeconds: duration || 5,
                        resolution: resolution || "1080p"
                    }
                })
            });

            const initialData = await initialResponse.json();
            if (initialData.error) {
                console.error('[VEO-HG] Initiation Error:', JSON.stringify(initialData.error, null, 2));
                throw new Error(initialData.error.message || "Google Veo HG Initiation Failed");
            }

            const operationName = initialData.name;
            console.log(`[VEO-HG] Operation started: ${operationName}`);

            // Polling logic
            let resultData = null;
            let attempts = 0;
            const maxAttempts = 100;

            while (attempts < maxAttempts) {
                const pollResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`);
                const pollData = await pollResponse.json();

                if (pollData.error) throw new Error(pollData.error.message || "Veo Poll Failed");

                if (pollData.done) {
                    resultData = pollData.response;
                    break;
                }

                await new Promise(resolve => setTimeout(resolve, 2000));
                attempts++;
                if (attempts % 5 === 0) console.log(`[VEO-HG] Still waiting... (${attempts * 2}s elapsed)`);
            }

            if (!resultData) throw new Error("Video generation timed out");

            const video = findVideoInResponse(resultData);
            if (!video) throw new Error("No video data returned from Google");

            let videoUrl = null;
            if (video.videoBytes || video.bytesBase64Encoded) {
                const b64 = video.videoBytes ? Buffer.from(video.videoBytes).toString('base64') : video.bytesBase64Encoded;
                videoUrl = `data:video/mp4;base64,${b64}`;
            } else if (video.uri) {
                const videoResp = await nodeFetch(`${video.uri}&key=${apiKey}`);
                const videoBuffer = await videoResp.arrayBuffer();
                videoUrl = `data:video/mp4;base64,${Buffer.from(videoBuffer).toString('base64')}`;
            }

            return res.json({ url: videoUrl });
        } else {
            // Image Generation uses the Native generateContent API
            const modelMapping = {
                'nano-banana': 'gemini-2.5-flash-image',
                'nano-banana-2': 'gemini-3.1-flash-image-preview',
                'nano-banana-pro': 'gemini-3-pro-image-preview',
                'gemini': 'gemini-2.5-flash-image'
            };

            // If targetModel is already a full gemini-xxx ID, use it directly
            const modelName = targetModel.startsWith('gemini-') ? targetModel : (modelMapping[targetModel] || 'gemini-2.5-flash-image');
            // Nano Banana 2 and Pro models support higher resolution
            const isPro = modelName.includes('pro') || modelName.includes('3.1');

            const { google_search, quality, identity_images = [], product_image = null, identity_gcs_uris = [] } = req.body;

            // Resolve 1K/2K/4K resolution for Pro model
            let imageSize = "1K";
            if (isPro) {
                if (quality === '4k') imageSize = "4K";
                else if (quality === '2k') imageSize = "2K";
                else imageSize = "1K";
            }

            const cleanPrompt = (prompt || '').replace(/--ar\s+\d+:\d+/g, '').trim();

            let biblePrefix = "";
            if (bible) {
                biblePrefix = "### NEURAL_UNIVERSE_BIBLE_CONTEXT\n";
                if (bible.characters && Object.keys(bible.characters).length > 0) {
                    biblePrefix += "CHARACTERS:\n";
                    Object.entries(bible.characters).forEach(([id, char]) => {
                        biblePrefix += `- ${char.name}: ${char.backstory?.substring(0, 50)}...\n`;
                    });
                }
                biblePrefix += "INSTRUCTIONS: Maintain consistency with the above universe context.\n\n";
            }

            // ── GCS native fileData parts (no download, zero-copy) ──────────
            // Gemini supports gs:// URIs directly as fileData parts.
            // These are character reference images stored in GCS.
            const gcsContentParts = (identity_gcs_uris || []).map(({ name, uri }) => {
                if (!uri || !uri.startsWith('gs://')) return null;
                console.log(`[GCS-NATIVE] Using ${name || 'character'} → ${uri}`);
                return {
                    fileData: {
                        mimeType: uri.endsWith('.png') ? 'image/png' : 'image/jpeg',
                        fileUri: uri
                    }
                };
            }).filter(Boolean);

            // ── HTTP/base64 fallback for non-GCS images ──────────────────────
            const { images = [], references = [], consistencyRefs = [], image: baseImage } = req.body || {};

            // Only include HTTP identity_images that don't already have a GCS counterpart
            const gcsCharacterIds = new Set((identity_gcs_uris || []).map(g => g.name));
            const filteredIdentityImages = (identity_images || []).filter(img => {
                // Simple heuristic: skip if a GCS URI exists for any tagged character
                return gcsContentParts.length === 0 || true; // always include non-GCS refs
            });

            const combinedRefs = [...(images || []), ...(references || []), ...(filteredIdentityImages || []), ...(consistencyRefs || []), product_image, baseImage].filter(Boolean);
            const inputImages = Array.from(new Set(combinedRefs)); // De-duplicate

            const httpContentParts = await Promise.all(inputImages.map(async (img) => {
                try {
                    let data = '';
                    let mimeType = 'image/png';

                    if (img.startsWith('data:')) {
                        mimeType = img.split(';')[0].split(':')[1];
                        data = img.split(',')[1];
                    } else if (img.startsWith('http') || img.startsWith('//')) {
                        const fullUrl = img.startsWith('//') ? `https:${img}` : img;
                        const imageResp = await fetch(fullUrl);
                        const buffer = await imageResp.arrayBuffer();
                        data = Buffer.from(buffer).toString('base64');
                    } else if (img.startsWith('/assets/')) {
                        const localPath = path.join(__dirname, '..', 'public', img);
                        if (fs.existsSync(localPath)) {
                            data = fs.readFileSync(localPath).toString('base64');
                        }
                    } else {
                        data = img;
                    }

                    if (!data) return null;

                    return { inlineData: { mimeType, data } };
                } catch (e) {
                    console.error("Failed to process image reference:", e);
                    return null;
                }
            })).then(parts => parts.filter(Boolean));

            // Combine: GCS native parts first, then HTTP inline parts, then text
            const contentParts = [...gcsContentParts, ...httpContentParts];

            const finalPrompt = biblePrefix + cleanPrompt;
            contentParts.push({ text: finalPrompt });

            console.log(`[GEMINI_SERVER_PAYLOAD] ${modelName}:`, JSON.stringify({ contents: [{ parts: contentParts }] }, null, 2));
            console.log(`Calling Google ${modelName} (${isPro ? imageSize : '1K'}, Search: ${!!google_search}, Images: ${contentParts.length - 1}):`, finalPrompt.substring(0, 100));

            // Standard payload for Gemini Image Generation API (REST requirements)
            const payload = {
                contents: [{ parts: contentParts }],
                generation_config: {
                    response_modalities: ["IMAGE"],
                    image_config: {
                        aspect_ratio: targetAspectRatio
                    }
                }
            };

            // Gemini 3.0 Pro Image supports explicit size (1K, 2K, 4K)
            if (isPro) {
                payload.generation_config.image_config.image_size = imageSize;
            }

            // Note: Google Search tool is currently not enabled for image generation models
            // if (google_search || isPro) {
            //     payload.tools = [{ googleSearch: {} }];
            // }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.error) {
                console.error("Google API Error Response:", JSON.stringify(data, null, 2));
                throw new Error(data.error.message || "Google Gemini Error");
            }

            const parts = data.candidates?.[0]?.content?.parts || [];
            const imagePart = parts.find(p => p.inlineData);
            const textPart = parts.find(p => p.text);

            if (!imagePart) {
                console.error("No image part in Google response:", JSON.stringify(data, null, 2));
                throw new Error(textPart ? `Refusal: ${textPart.text}` : "No image data returned. Ensure the prompt is safe and try again.");
            }

            const b64Data = imagePart.inlineData.data;
            const mimeType = imagePart.inlineData.mimeType || "image/png";

            return res.json({
                url: `data:${mimeType};base64,${b64Data}`,
                description: textPart?.text || ""
            });
        }
    } catch (error) {
        console.error('Google Engineering Error:', error);
        res.status(500).json({
            error: 'Google API Error',
            message: error.message
        });
    }
}

// --- OPENAI CANVAS ROUTES ---

// 1. Copy Generation
app.post('/api/canvas/copy', async (req, res) => {
    try {
        const { intent, tone, projectType } = req.body;

        const systemPrompt = `You are a professional marketing copywriter. Create short, bold poster copy for a ${projectType}. Tone: ${tone}. Rules: Headline max 6 words, Subtext max 10 words, CTA max 3 words. Return JSON only with keys: headline, subtext, cta.`;

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: intent }
            ],
            model: "gpt-4o",
            response_format: { type: "json_object" },
        });

        const result = JSON.parse(completion.choices[0].message.content);
        res.json(result);

    } catch (error) {
        console.error('OpenAI Copy Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Image Generation (DALL-E 3)
app.post('/api/canvas/image', async (req, res) => {
    try {
        const { prompt, width, height } = req.body;

        // Map size (gpt-image supports 1024x1024, 1024x1536, 1536x1024)
        let size = "1024x1024";
        if (width > height) size = "1536x1024"; // Landscape
        else if (height > width) size = "1024x1536"; // Portrait

        const response = await openai.images.generate({
            model: "gpt-image-1.5",
            prompt: `Professional poster background, no text, ${prompt}`,
            n: 1,
            size: size,
            quality: "high"
        });

        res.json({ url: response.data[0].url });

    } catch (error) {
        console.error('OpenAI Image Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 3. AI Director Analysis
app.post('/api/canvas/analyze', async (req, res) => {
    try {
        const { context, url, brandName, projectType } = req.body;

        const systemPrompt = `You are an expert Creative Director. Analyze the request for a "${projectType}".
        Input Context: "${context}"
        Reference URL: "${url || 'None'}"
        Brand: "${brandName || 'Generic'}"

        Produce a comprehensive Design Plan in JSON format:
        {
            "theme": "Short style name (e.g. Cyberpunk, Minimal)",
            "visualDirection": "Detailed prompt for DALL-E background generation (no text in image)",
            "headline": "Catchy headline (max 6 words)",
            "subtext": "Persuasive subtext (max 12 words)",
            "cta": "Strong Call to Action",
            "suggestedPalette": ["#hex", "#hex", "#hex"]
        }`;

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: "Create the plan." }
            ],
            model: "gpt-4o",
            response_format: { type: "json_object" },
        });

        const result = JSON.parse(completion.choices[0].message.content);
        res.json(result);

    } catch (error) {
        console.error('Analyst Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- GOOGLE DRIVE INTEGRATION ---
const DRIVE_CLIENT_ID = process.env.GDRIVE_CLIENT_ID;
const DRIVE_CLIENT_SECRET = process.env.GDRIVE_CLIENT_SECRET;
const DRIVE_REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

async function uploadToDrive(filePath, fileName) {
    if (!DRIVE_CLIENT_ID || !DRIVE_CLIENT_SECRET) {
        console.log("Google Drive not configured in .env. Skipping cloud sync.");
        return null;
    }

    // This is a structural implementation. 
    // For a real production app, you would use a refresh token stored in a database.
    console.log(`[DRIVE SYNC] Preparing to upload ${fileName}...`);
    // Mocking success for the demo as real OAuth requires user interaction
    return "DRIVE_FILE_ID_MOCK";
}

// --- ASSET MANAGEMENT ---
// --- ASSET MANAGEMENT ---
app.get('/api/list-assets', async (req, res) => {
    try {
        const { userId } = req.query;
        let allImages = [];
        if (supabase) {
            console.log("[SERVER] Checking Supabase for assets (IPv4)...");
            try {
                // If the user_id exists, filter by it so the history is per-user
                let query = 'assets?select=*&order=created_at.desc&limit=100';
                if (userId) {
                    query = `assets?user_id=eq.${userId}&select=*&order=created_at.desc&limit=100`;
                }
                const data = await supabaseRestGet(query);
                const dbFormatted = data.map(a => ({
                    id: a.id,
                    type: a.type || 'image',
                    url: a.url || (a.path ? `${storageBase}/${a.path}` : ''),
                    name: a.name || (a.type === 'video' ? 'AI Video' : 'AI Asset'),
                    date: a.created_at ? new Date(a.created_at).toISOString().split('T')[0] : 'Today',
                    timestamp: a.created_at ? new Date(a.created_at).getTime() : 0,
                    size: a.size || 'N/A'
                }));
                allImages = [...allImages, ...dbFormatted.filter(a => a.type === 'image')];
                const allVideos = dbFormatted.filter(a => a.type === 'video');
                console.log(`[SERVER] ✅ Found ${dbFormatted.length} assets from Supabase.`);

                const unique = Array.from(new Map(allImages.map(img => [img.url, img])).values());
                return res.json({
                    images: unique.sort((a, b) => b.timestamp - a.timestamp),
                    videos: allVideos.sort((a, b) => b.timestamp - a.timestamp),
                    upscaled: []
                });
            } catch (err) {
                console.warn("[SERVER] Supabase Assets Fetch failed:", err.message);
            }
        }

        try {
            const assetsDir = path.join(__dirname, '..', 'public', 'assets', 'generations');
            if (fs.existsSync(assetsDir)) {
                // Async file reading to avoid blocking event loop
                const files = await fs.promises.readdir(assetsDir);
                // Limit local files processing to recent 50 to avoid massive I/O
                const imageFiles = files.filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f)).slice(0, 50);

                const statsPromises = imageFiles.map(async (f) => {
                    const stat = await fs.promises.stat(path.join(assetsDir, f));
                    return {
                        id: `local_${f}`,
                        type: 'image',
                        url: `/assets/generations/${f}`,
                        name: f,
                        date: stat.mtime.toISOString().split('T')[0],
                        timestamp: stat.mtime.getTime(),
                        size: (stat.size / (1024 * 1024)).toFixed(1) + ' MB'
                    };
                });

                const local = await Promise.all(statsPromises);
                allImages = [...allImages, ...local];
            }
        } catch (e) { console.warn("[SERVER] Local assets read skipped:", e.message) }

        const unique = Array.from(new Map(allImages.map(img => [img.url, img])).values());
        res.json({ images: unique.sort((a, b) => b.timestamp - a.timestamp), videos: [], upscaled: [] });
    } catch (error) {
        console.error('List Assets Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/list-characters', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!supabase) return res.json({ characters: [] });

        let dbData = [];
        console.log("[SERVER] Fetching characters via REST (IPv4)...");
        try {
            let q = 'characters?select=*&order=timestamp.desc&limit=50';
            if (userId && userId !== 'null' && userId !== 'undefined' && userId !== '') {
                q = `characters?or=(user_id.eq.${userId},user_id.is.null)&select=*&order=timestamp.desc&limit=50`;
            }

            // Add AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

            dbData = await supabaseRestGet(q, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!Array.isArray(dbData)) dbData = [];
            console.log(`[SERVER] ✅ Found ${dbData.length} characters.`);
        } catch (err) {
            console.warn("[SERVER] list-characters fetch failed or timed out:", err.message);
            dbData = [];
        }

        const data = dbData;

        const formattedChars = (data || []).map(c => {
            // Robust JSON Parsing
            const parseJson = (val) => {
                if (!val) return null;
                if (typeof val === 'object') return val;
                try { return JSON.parse(val); } catch (e) { return null; }
            };

            const kit = parseJson(c.identity_kit || c.identityKit);
            const meta = parseJson(c.metadata);

            // Robust fallback for image hunting
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
        res.status(500).json({ error: error.message });
    }
});

// Delete a character by ID
app.delete('/api/delete-character/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

        console.log(`[SERVER] Deleting character: ${id}`);

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
        res.status(500).json({ error: error.message });
    }
});


app.post('/api/save-asset', async (req, res) => {
    try {
        const { imageData, fileName, type = 'image', userId } = req.body;
        if (!imageData) throw new Error("No asset data provided");

        const extension = type === 'video' ? 'mp4' : 'png';
        const mimeType = type === 'video' ? 'video/mp4' : 'image/png';
        const name = fileName || `gen_${Date.now()}.${extension}`;

        // Strip data prefix if present
        const base64Data = imageData.includes('base64,') ? imageData.split(',')[1] : imageData;
        const buffer = Buffer.from(base64Data, 'base64');
        const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2) + ' MB';

        let publicUrl = null;

        // Try Supabase Storage (Best approach for serverless/hosting)
        if (supabase) {
            try {
                const subPath = `${type}s/${name}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('assets')
                    .upload(subPath, buffer, { contentType: mimeType, upsert: true });

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('assets')
                    .getPublicUrl(subPath);

                if (data?.publicUrl) publicUrl = data.publicUrl;
                console.log(`[SERVER] Uploaded ${type} to Supabase Storage: ${publicUrl}`);
            } catch (supaErr) {
                console.warn("[SERVER] Supabase Storage Failed (ensure 'assets' bucket exists and is public!):", supaErr.message);
            }
        }

        // Fallback to GCS if configured and Supabase failed
        if (!publicUrl) {
            try {
                const gcsUrl = await storageService.uploadToGCS(buffer, name, mimeType);
                if (gcsUrl) publicUrl = gcsUrl;
                console.log(`[SERVER] Uploaded ${type} to GCS: ${publicUrl}`);
            } catch (gcsErr) {
                console.error("[SERVER] GCS Upload Error:", gcsErr);
            }
        }

        // Save metadata to Supabase DB (Maintain consistency)
        if (supabase) {
            const insertData = {
                name: name,
                type: type,
                path: name,
                url: publicUrl || `/assets/generations/${name}`,
                size: sizeMB,
                created_at: new Date().toISOString()
            };
            if (userId) insertData.user_id = userId;

            const { error: dbError } = await supabase
                .from('assets')
                .insert([insertData]);

            if (dbError) console.error("Supabase DB Insert Error:", dbError);
        }

        if (!publicUrl) {
            console.warn("[SERVER] WARNING: No cloud storage configured. Returning local fallback URL. Images will break on server scale/restart.");
        }

        res.json({
            success: true,
            path: publicUrl || `/assets/${type}s/${name}`,
            name: name,
            type: type
        });
    } catch (error) {
        console.error('Save Asset Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- AUTO-RETENTION POLICY: 15 DAYS ---
setInterval(async () => {
    if (!supabase) return;
    try {
        console.log("[SERVER] Running 15-day auto-retention cleanup...");
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

        const { data: oldAssets, error } = await supabase
            .from('assets')
            .delete()
            .lt('created_at', fifteenDaysAgo.toISOString())
            .select();

        if (error) throw error;
        if (oldAssets?.length > 0) {
            console.log(`[SERVER] Cleaned up ${oldAssets.length} expired assets.`);
        }
    } catch (err) {
        console.error("[SERVER] Retention cleanup failed:", err);
    }
}, 1000 * 60 * 60 * 12); // Every 12 hours

// --- AI INFLUENCER ENDPOINTS ---

// --- PROXY STORAGE & DATABASE (to bypass browser DNS issues) ---
app.post('/api/proxy/upload', async (req, res) => {
    try {
        if (!supabase) throw new Error("Supabase not configured");
        const { base64, characterId, slot } = req.body;
        if (!base64) throw new Error("No data provided");

        // If it's already a URL, just return it
        if (typeof base64 === 'string' && base64.startsWith('http')) {
            return res.json({ publicUrl: base64 });
        }

        let mimeType = 'image/png';
        let extension = 'png';
        let data = base64;

        if (base64.includes(',')) {
            const [meta, b64Data] = base64.split(',');
            mimeType = meta.split(':')[1]?.split(';')[0] || 'image/png';
            extension = mimeType.split('/')[1] || 'png';
            data = b64Data;
        }

        const safeCharId = (characterId || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
        const safeSlot = (slot || 'asset').replace(/[^a-zA-Z0-9]/g, '_');
        const filePath = `influencers/${safeCharId}/${safeSlot}_${Date.now()}.${extension}`;

        const buffer = Buffer.from(data, 'base64');

        // Attempt Upload to GCS first
        let publicUrl = null;
        try {
            publicUrl = await storageService.uploadToGCS(buffer, filePath, mimeType);
        } catch (gcsErr) {
            console.warn(`[SERVER] GCS Upload failed (${gcsErr.message}). Falling back to local filesystem...`);
        }

        // --- LOCAL FALLBACK IF GCS FAILS ---
        if (!publicUrl) {
            const publicDir = path.join(__dirname, 'public', 'assets', 'characters');
            if (!fs.existsSync(publicDir)) {
                fs.mkdirSync(publicDir, { recursive: true });
            }

            // Clean up IDs for safe filename (redundant check but safe)
            const fallbackCharId = (characterId || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
            const fallbackSlot = (slot || 'asset').replace(/[^a-zA-Z0-9]/g, '_');

            const localFileName = `${fallbackSlot}_${fallbackCharId}_${Date.now()}.${extension}`;
            const localPath = path.join(publicDir, localFileName);

            fs.writeFileSync(localPath, buffer);
            console.log(`[SERVER] Image saved locally to ${localPath}`);

            // Generate localhost URL
            publicUrl = `http://localhost:${port}/assets/characters/${localFileName}`;
        }

        // We skip recording in the 'assets' table here because if the table is missing or 
        // the schema is wrong, it causes the entire character saving flow to fail.
        // The publicUrl (GCS or Local) is sufficient to render the character.

        res.json({ publicUrl });
    } catch (error) {
        console.error('Proxy Upload Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/proxy/save-character', async (req, res) => {
    try {
        if (!supabase) throw new Error("Supabase not configured");
        const { character } = req.body;

        // Determine the best image URL (never save raw base64 — it's too large)
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

        // If only base64 is available, log a warning (upload should have happened first)
        if (!bestImage && candidates.length > 0) {
            console.warn(`[SERVER] save-character: No public URL found for ${character.name}, only base64. Upload may have failed.`);
        }

        console.log(`[SERVER] Saving character: ${character.name} (${character.id}), image: ${bestImage ? bestImage.substring(0, 60) + '...' : 'EMPTY'}`);

        const kitData = character.identityKit || character.identity_kit || null;

        // Extract consistency markers
        const anchorImage = character.anchor_image || character.identityKit?.anchor || character.identity_kit?.anchor || bestImage;
        const gcsUri = character.gcs_uri || null;
        const userId = character.userId || character.user_id || character.metadata?.userId || null;

        // Sanitize metadata to remove ALL large base64 data to prevent Postgres Statement Timeouts
        const sanitizedMetadata = { ...character };

        // Remove known base64 fields natively at root level
        if (sanitizedMetadata.photo && sanitizedMetadata.photo.startsWith('data:')) delete sanitizedMetadata.photo;
        if (sanitizedMetadata.image && sanitizedMetadata.image.startsWith('data:')) delete sanitizedMetadata.image;

        // Aggressive recursive cleaning of objects to strip any large base64 strings
        const cleanData = (obj) => {
            if (!obj || typeof obj !== 'object') return obj;
            const newObj = Array.isArray(obj) ? [...obj] : { ...obj };
            Object.keys(newObj).forEach(key => {
                const value = newObj[key];
                if (typeof value === 'string' && (value.startsWith('data:') || value.length > 10000)) {
                    delete newObj[key];
                } else if (typeof value === 'object' && value !== null) {
                    newObj[key] = cleanData(value);
                }
            });
            return newObj;
        };

        if (sanitizedMetadata.identityKit) {
            sanitizedMetadata.identityKit = cleanData(sanitizedMetadata.identityKit);
        }
        if (sanitizedMetadata.identity_kit) {
            sanitizedMetadata.identity_kit = cleanData(sanitizedMetadata.identity_kit);
        }

        // Final safety check for identityKit nested under metadata if any
        if (sanitizedMetadata.metadata?.identityKit) {
            sanitizedMetadata.metadata.identityKit = cleanData(sanitizedMetadata.metadata.identityKit);
        }


        // Generate and Inject Semantic Embedding (PHASE 4) - DISABLED IN SAFE MODE
        /*
        try {
            const searchSource = character.backstory || character.bio || character.name;
            if (searchSource) {
                const embedding = await vectorService.getEmbedding(searchSource);
                if (embedding) sanitizedMetadata.embedding = embedding;
            }
        } catch (vecErr) {
            console.error("[SERVER] Vector Embedding Failed during save:", vecErr);
        }
        */

        const { error } = await supabase
            .from('characters')
            .upsert({
                id: character.id,
                name: character.name,
                user_id: userId,
                visual_style: character.visualStyle || character.visual_style || 'Realistic',
                origin: character.origin || 'Unknown',
                image: bestImage,
                anchor_image: anchorImage,
                gcs_uri: gcsUri,
                identity_kit: kitData,
                timestamp: character.timestamp || new Date().toISOString(),
                metadata: sanitizedMetadata
            });

        if (error) throw error;
        console.log(`[SERVER] Character ${character.name} saved successfully. User: ${userId || 'SYSTEM'}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Proxy Save Character Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/delete-character/:id', async (req, res) => {
    try {
        if (!supabase) throw new Error("Supabase not configured");
        const { id } = req.params;
        console.log(`[SERVER] Attempting to delete character: ${id}`);

        const { error } = await supabase
            .from('characters')
            .delete()
            .eq('id', id);

        if (error) throw error;
        console.log(`[SERVER] Character ${id} deleted successfully.`);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete Character Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/proxy/save-storyboard', async (req, res) => {
    try {
        if (!supabase) throw new Error("Supabase not configured");
        const { characterId, imageUrl, orderIndex } = req.body;

        const { error } = await supabase
            .from('storyboard_items')
            .insert({
                character_id: characterId,
                image: imageUrl,
                order_index: orderIndex
            });

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('Proxy Save Storyboard Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/supabase-health', async (req, res) => {
    try {
        if (!supabase) return res.json({ status: 'NOT_CONFIGURED' });
        const { data, error } = await supabase.from('characters').select('id').limit(1);
        if (error) throw error;
        res.json({ status: 'OK', data });
    } catch (error) {
        res.status(500).json({ status: 'ERROR', error: error.message });
    }
});

// Identity Analysis: Analyze a photo and return a text description
app.post('/api/influencer/analyze', async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) throw new Error('No image provided');

        // Parallel execution: Gemini Text Analysis + Vision API Tagging
        const [analysis, tags] = await Promise.all([
            geminiService.analyzeIdentity(image),
            visionService.tagCharacterImage(image)
        ]);

        res.json({ analysis, tags });
    } catch (error) {
        console.error('Identity Analysis Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Identity Kit: Generate the full 5-point Nano Banana kit
app.post('/api/influencer/identity-kit', async (req, res) => {
    try {
        const { image, style } = req.body;
        if (!image) throw new Error('No reference image provided');
        console.log(`Generating Identity Kit (${style || 'Realistic'}) from reference...`);
        const kit = await geminiService.generateIdentityKit(image, style || 'Realistic');
        res.json({ kit });
    } catch (error) {
        console.error('Identity Kit Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Image Generation for character
app.post('/api/influencer/generate', async (req, res) => {
    try {
        const { character, prompt, pose, environment, outfit, style, aspect_ratio = "9:16" } = req.body;

        // Style modifier mapping
        const styleModifiers = {
            'Ultra Realistic': 'RAW photo, hyper-realistic, skin pores visible, no retouching, documentary photography style.',
            'Cinematic': 'Cinematic film still, dramatic depth of field, color graded, movie quality lighting.',
            'Anime': 'Anime art style, 2D illustration, vibrant colors, Studio Ghibli quality.',
            'Cyberpunk': 'Cyberpunk aesthetic, neon lights, high-tech environment, gritty futurism.',
            'Ethereal': 'Ethereal dreamlike photography, soft glow, angelic, fantasy art style.',
            'Realistic': 'Photorealistic, high fidelity, clean studio lighting.',
        };
        const styleDesc = styleModifiers[style] || styleModifiers['Realistic'];

        // Character consistency logic: Inject character description and style into prompt
        const characterPrompt = `Digital influencer ${character.name}, ${character.niche} niche. ${character.name} is the subject.
        Scene: ${prompt || ''} ${environment || ''}. 
        Pose: ${pose || 'Natural'}. 
        Outfit: ${outfit || 'Stylish'}.
        Visual Style: ${styleDesc}
        High-end social media aesthetics, 9:16 portrait format.`;

        // Reuse handleGoogle logic but return the result directly
        req.body = {
            model: 'nano-banana-pro', // Use best available for influencer
            prompt: characterPrompt,
            aspect_ratio: aspect_ratio,
            bible // Pass bible context for handleGoogle to use
        };

        return await handleGoogle(req, res);
    } catch (error) {
        console.error('Influencer Gen Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- UGC / VIDEO ENDPOINTS ---
app.post('/api/ugc/video', async (req, res) => {
    try {
        const { image, script, bible, userId, duration, resolution, model, aspect_ratio } = req.body;
        if (!image || !script) throw new Error("Missing image or script");

        // Video synthesis is expensive
        const modelCredits = model === 'veo-fast' ? 3 : 5;
        await consumeCredits(userId, modelCredits);

        console.log(`Generating UGC Video for script: "${script.substring(0, 30)}..." [model=${model}, dur=${duration}, res=${resolution}, ratio=${aspect_ratio}]`);
        const videoDataUrl = await geminiService.generateLipSyncVideo(image, script, bible, { duration, resolution, model, aspect_ratio });

        if (!videoDataUrl) throw new Error("Video generation failed (returned null)");

        res.json({ url: videoDataUrl });
    } catch (error) {
        console.error('UGC Video Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ugc/speech', async (req, res) => {
    try {
        const { text, voice } = req.body;
        const audioData = await geminiService.synthesizeSpeech(text, voice);
        if (!audioData) throw new Error("Speech synthesis failed");

        res.json({ audio: `data:audio/mp3;base64,${audioData}` });
    } catch (error) {
        console.error('UGC Speech Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// PHASE 5: UGC Viral Pipeline Endpoints
// ============================================================

app.post('/api/ugc/generate-hook', async (req, res) => {
    try {
        const { characterName, niche, hookStyle, script } = req.body;
        broadcastProgress('ugc-hook', 1, 3, 'Generating viral hook script...');

        // Use the already-initialized GoogleGenerativeAI client (`genAI`)
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

        const result = await model.generateContent(`You are a viral UGC content strategist. Generate a hook script for a ${niche} creator named ${characterName}.

HOOK STYLE: ${hookStyle}
${script ? `USER DIRECTION: ${script}` : ''}

Generate a JSON response:
{
  "hookScript": "The actual 2-3 sentence hook script (punchy, attention-grabbing)",
  "hookType": "PATTERN_INTERRUPT | QUESTION | SHOCKING_STAT | STORY_OPENER",
  "estimatedDuration": <seconds>,
  "captionHook": "A 5-word caption version for overlay"
}

Return ONLY valid JSON.`);

        const text = result?.response?.text?.() || '';
        let hookData;
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            hookData = JSON.parse(jsonMatch[0]);
        } catch {
            hookData = { hookScript: script || 'Hey, you need to see this...', hookType: hookStyle, estimatedDuration: 3, captionHook: 'Watch This Now' };
        }

        broadcastProgress('ugc-hook', 3, 3, 'Hook script generated!');
        broadcastComplete('ugc-hook');
        res.json(hookData);
    } catch (error) {
        console.error('UGC Hook Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ugc/generate-avatar', async (req, res) => {
    try {
        const { characterName, script, style, ratio } = req.body;
        broadcastProgress('ugc-avatar', 1, 3, 'Composing avatar render prompt...');

        const prompt = `CINEMATIC UGC PORTRAIT: ${characterName} speaking directly to camera in a ${style} style. Expression is engaging and authentic. ${ratio === '9:16' ? 'Vertical/portrait orientation' : 'Landscape orientation'}. The character appears to be saying: "${script}". Professional lighting, shallow depth of field, social media ready.`;

        broadcastProgress('ugc-avatar', 2, 3, 'Rendering avatar frame...');

        const result = await geminiService.generateCharacterImage(prompt, [], ratio || '9:16');

        broadcastProgress('ugc-avatar', 3, 3, 'Avatar rendered!');
        broadcastComplete('ugc-avatar');
        res.json({ image: result, style });
    } catch (error) {
        console.error('UGC Avatar Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ugc/generate-captions', async (req, res) => {
    try {
        const { script, style } = req.body;
        broadcastProgress('ugc-captions', 1, 2, 'Generating caption overlays...');

        const response = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }).generateContent({
            contents: [{
                role: 'user',
                parts: [{
                    text: `You are a UGC caption designer. Break this script into caption segments for a ${style} overlay style.

SCRIPT: "${script}"
STYLE: ${style}

Generate JSON:
{
  "captions": [
    { "text": "caption text", "startTime": 0.0, "endTime": 1.5, "emphasis": "NORMAL | BOLD | HIGHLIGHT" }
  ],
  "totalDuration": <number>,
  "style": "${style}"
}

Return ONLY valid JSON.`
                }]
            }]
        });

        const result = await response.response;
        const text = result.text();
        let captionData;
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            captionData = JSON.parse(jsonMatch[0]);
        } catch {
            captionData = { captions: [{ text: script, startTime: 0, endTime: 3, emphasis: 'BOLD' }], totalDuration: 3, style };
        }

        broadcastProgress('ugc-captions', 2, 2, 'Captions generated!');
        broadcastComplete('ugc-captions');
        res.json(captionData);
    } catch (error) {
        console.error('UGC Captions Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PHASE 9: UGC AD ENGINE ORCHESTRATION
 */
app.post('/api/ugc/generate-hooks-batch', async (req, res) => {
    try {
        const { synergy, niche, tone, directive } = req.body;
        console.log(`[SERVER] Generating batch hooks for re-ranking...`);
        const hooks = await geminiService.generateCandidateHooks(synergy, niche, tone, directive);
        res.json({ hooks });
    } catch (error) {
        console.error('Batch Hooks Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ugc/ad-engine', async (req, res) => {
    try {
        const {
            characterImage,
            productImage,
            characterMetadata,
            productMetadata,
            niche,
            tone,
            directive,
            trainingContext // Now accepting training context from frontend
        } = req.body;

        if (!characterImage || !productImage) throw new Error("Missing character or product image");

        const taskId = `ugc-engine-${Date.now()}`;
        broadcastProgress(taskId, 1, 4, 'Analyzing influencer + product synergy...');

        // Step 1: Analyze Synergy
        const synergy = await geminiService.analyzeUGCContext(characterImage, productImage, { characterMetadata, productMetadata });
        broadcastProgress(taskId, 2, 4, 'Generating viral ad script...');

        // Step 2: Generate Script (passing trainingContext)
        const script = await geminiService.generateUGCScript(synergy, niche || synergy.recommendedNiche, tone || synergy.suggestedTone, directive, trainingContext);
        broadcastProgress(taskId, 3, 4, 'Finalizing ad structure...');

        broadcastComplete(taskId);
        res.json({
            synergy,
            script
        });
    } catch (error) {
        console.error('UGC Ad Engine Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ugc/compile-ad', async (req, res) => {
    try {
        const { script, sceneVideos, bgMusicPath, nodeId } = req.body;
        if (!script || !sceneVideos || !sceneVideos.length) {
            throw new Error("Missing script or scene videos for compilation");
        }

        const taskId = `ugc-export-${nodeId || Date.now()}`;

        // Spawn async compilation so we don't timeout the HTTP request
        // The frontend will track progress via WebSocket
        masterExportService.compileUGCAd(
            taskId,
            script,
            sceneVideos,
            bgMusicPath,
            (step, total, message) => {
                broadcastProgress(taskId, step, total, message);
            }
        ).then(result => {
            broadcastComplete(taskId, { url: result.url, filename: result.filename });
        }).catch(err => {
            console.error(`[SERVER] Export Task ${taskId} failed:`, err);
            broadcastProgress(taskId, 0, 0, `Export Failed: ${err.message}`);
        });

        res.json({ success: true, taskId });
    } catch (error) {
        console.error('UGC Compile Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// PHASE 8: UGC Studio Pipeline
// ============================================================

// Auto-Storyboard: Gemini breaks user prompt into 5-6 scenes
// --- Cinematography Style Dictionary ---
const NICHE_STYLES = {
    "FASHION": {
        vibe: "High-end editorial, Vogue aesthetic, elegant and sophisticated.",
        lighting: "Soft cinematic lighting, rim lights, dramatic shadows, glowing skin.",
        camera: "Slow-motion tracking shots, low-angle hero shots, 50mm and 85mm portrait lenses.",
        pacing: "Smooth, deliberate, graceful transitions."
    },
    "GYM UGC AD": {
        vibe: "High energy, sweaty, motivational, fast-paced fitness aesthetic.",
        lighting: "High-contrast gym lighting, neon accents, hard directional light.",
        camera: "Handheld shaky-cam, dynamic push-ins, wide 24mm action angles, POV shots.",
        pacing: "Rapid cuts, energetic, matching an upbeat tempo."
    },
    "SKINCARE": {
        vibe: "Clean, pure, organic, glowing, morning routine aesthetic.",
        lighting: "Soft, diffused natural window light, bright and airy, pastel tones.",
        camera: "Extreme macro close-ups on product textures, soft focus backgrounds, 100mm macro lens.",
        pacing: "Calm, soothing, slow reveals."
    },
    "FOOD REVIEW": {
        vibe: "Appetizing, mouth-watering, casual vlog style.",
        lighting: "Bright, warm ring-lighting or sunny cafe lighting to make food look fresh.",
        camera: "Over-the-head top-down shots, extreme close-ups on textures, subject looking directly into the lens.",
        pacing: "Punchy, reactive, engaging."
    },
    "TECH UNBOX": {
        vibe: "Sleek, futuristic, premium, detail-oriented.",
        lighting: "Moody studio lighting, RGB background accents, sharp reflections on the product.",
        camera: "Smooth motorized slider shots, precise macro focus pulls, sleek pans.",
        pacing: "Methodical, focused on product details."
    },
    "CUSTOM": {
        vibe: "Professional cinematic video.",
        lighting: "Balanced cinematic lighting.",
        camera: "Standard varied focal lengths.",
        pacing: "Moderate rhythm."
    },
    "RAW iPHONE UGC": {
        vibe: "Ultra-realistic, raw, unedited, authentic everyday life, candid vlog style.",
        lighting: "Natural ambient lighting, daylight, true-to-life shadows, zero artificial studio lighting.",
        camera: "Shot on iPhone 15 Pro Max, Apple ProRAW. Handheld camera feel. For close-ups: hyper-detailed, visible skin pores, peach fuzz, micro-textures, perfectly natural human skin.",
        pacing: "Casual, fast-paced TikTok style, natural organic movement."
    },
    "DOCUMENTARY REALISM": {
        vibe: "Grounded, highly authentic, fly-on-the-wall realism, cinematic but unpolished.",
        lighting: "Available practical lighting, natural contrast, moody, high dynamic range.",
        camera: "Handheld 35mm lens, natural film grain, slight motion blur, imperfect framing, photorealistic.",
        pacing: "Reactive, observant, natural human rhythm."
    }
};

app.post('/api/ugc/generate-storyboard', async (req, res) => {
    try {
        const safeBody = (req.body && typeof req.body === 'object') ? req.body : {};
        const {
            duration,
            inputs: rawInputs,
            prompt,
            characterName,
            wardrobe,
            product,
            selectedNiche,
            niche,
            moodSeed
        } = safeBody;

        // ── Support both old and new payload formats ──
        const durationStr = String(duration || '30s').replace('s', '');
        const durationNum = parseInt(durationStr, 10) || 30;

        // ── Resolve 4 Pillars (defensive defaults) ──
        const inputs = (rawInputs && typeof rawInputs === 'object') ? rawInputs : {};

        // Critical validation: Prompt or Inputs must exist
        if (!prompt && Object.keys(inputs).length === 0) {
            return res.status(400).json({ error: 'Missing core data (prompt or inputs) for storyboard generation' });
        }

        const characterValue = inputs.character ?? characterName ?? '';
        const productDesc = inputs.product ?? product ?? '';
        const wardrobeDesc = inputs.wardrobe ?? wardrobe ?? '';
        const wardrobeDetails = Array.isArray(inputs.wardrobeDetails) ? inputs.wardrobeDetails : [];
        const locationValue = inputs.location ?? '';

        // ── Dynamic Shot Calculation ──
        let shotCount = 6; // default
        if (durationNum <= 10) shotCount = 4;
        else if (durationNum <= 15) shotCount = 6;
        else if (durationNum <= 30) shotCount = 8;
        else if (durationNum <= 45) shotCount = 10;
        else shotCount = 12;

        // ── Camera Angle Rotation List ──
        const ANGLES = [
            'Wide Angle Establishing Shot',
            'Medium Tracking Shot',
            'Extreme Close-Up',
            'Over-the-Shoulder',
            'Low Angle Hero Shot',
            'High Angle Bird\'s Eye',
            'Rack Focus Close-Up',
            'Dutch Angle',
            'Dolly Zoom',
            'POV First-Person Shot',
            'Cowboy Shot (mid-thigh)',
            'Two-Shot Wide'
        ];

        const nicheKey = selectedNiche || niche || 'CUSTOM';
        const activeStyle = NICHE_STYLES[nicheKey] || NICHE_STYLES["CUSTOM"];

        const wardrobeCloseUpInfo = wardrobeDetails.length > 0
            ? `\nSPECIAL WARDROBE CLOSE-UP ASSETS:\n` + wardrobeDetails.map(item => `- ITEM: ${item.name}, CLOSE-UP PROMPT: ${item.closeUpPrompt}`).join('\n')
            : "";

        const locationDetails = inputs.locationDetails || null;
        const locationPromptRules = locationDetails?.establishingPrompt
            ? `\nLOCATION CONTEXT (REQUIRED):\n- For Wide/Establishing shots, use this EXACT phrase for the environment: "${locationDetails.establishingPrompt}"\n- For Close-up/Medium/Portrait shots, use this EXACT phrase for the blurred background: "${locationDetails.backgroundPrompt}"\n`
            : "";

        const systemPrompt = `You are a master Cinematographer generating a professional Shot List.
You must generate EXACTLY ${shotCount} chronological scenes.

CRITICAL CONSISTENCY RULES:
Subject: ${characterValue || 'the subject'}
Wardrobe: ${wardrobeDesc || 'their outfit'}
Product: ${productDesc || 'the product'}
Environment: ${locationValue || 'a cinematic environment'}
${locationPromptRules}
${wardrobeCloseUpInfo}
${moodSeed ? `\nVISUAL STYLE GUIDELINE (MOOD_SEED):\n- All shots MUST adhere to this stylistic profile: "${moodSeed}"\n` : ""}

🎬 DIRECTOR'S STYLE OVERRIDE (${nicheKey}):
You MUST strictly adhere to these stylistic rules for EVERY generated shot:
- Vibe: ${activeStyle.vibe}
- Lighting: ${activeStyle.lighting}
- Camera Angles/Lenses: ${activeStyle.camera}
- Pacing/Action: ${activeStyle.pacing}

WARDROBE CLOSE-UP INJECTION (CRITICAL):
${wardrobeDetails.length > 0 ? `If wardrobe close-up assets are provided above, you MUST replace EXACTLY ONE of the ${shotCount} shots (randomly, but ideally late in the sequence) with one of the specific wardrobe macro-shots. The 'prompt' for that shot must be copied exactly from the 'CLOSE-UP PROMPT' listed above.` : "Maintain standard shot progression."}

Ensure the 'prompt' field for each scene explicitly includes the lighting and camera lens instructions mentioned above so the Image Generator renders it perfectly in this specific niche style.

CINEMATOGRAPHY RULES:
Use a completely DIFFERENT camera framing and angle for each consecutive shot to create dynamic editing.
Required angle progression for ${shotCount} shots: ${ANGLES.slice(0, shotCount).join(' → ')}.

You must output EXACTLY ${shotCount} shots. No more, no less.`;

        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                shotList: {
                    type: SchemaType.ARRAY,
                    description: `Exactly ${shotCount} cinematic shots`,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            shotNumber: { type: SchemaType.INTEGER, description: "Sequential shot number" },
                            framing: { type: SchemaType.STRING, description: "Specific camera angle/lens" },
                            action: { type: SchemaType.STRING, description: "Brief description of the action" },
                            hasProduct: { type: SchemaType.BOOLEAN, description: "Whether the product is highly visible in this shot" },
                            prompt: { type: SchemaType.STRING, description: "The full exhaustive image generation prompt" }
                        },
                        required: ["shotNumber", "framing", "action", "hasProduct", "prompt"]
                    }
                }
            },
            required: ["shotList"]
        };

        let result;
        try {
            const model = genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: schema
                }
            });
            // Log the prompt being sent to Gemini
            console.log(`[STORYBOARD_PAYLOAD] Request Prompt: `, systemPrompt.substring(0, 500) + "...");

            const result_ai = await model.generateContent({
                contents: [{ parts: [{ text: systemPrompt }] }]
            });

            const parsed = JSON.parse(result_ai.response.text());
            const shots = parsed.shotList || [];

            result = {
                scenes: shots.map((s, i) => ({
                    index: i,
                    shotNumber: s.shotNumber || (i + 1),
                    timeRange: `${Math.round(i * durationNum / shotCount)} s - ${Math.round((i + 1) * durationNum / shotCount)} s`,
                    shotType: s.framing || s.shotType || ANGLES[i % ANGLES.length],
                    action: s.action || '',
                    hasProduct: s.hasProduct ?? true,
                    prompt: s.prompt || ''
                }))
            };
        } catch (aiError) {
            console.error('[AUTO_STORYBOARD] Critical failure generating structured schema. Using Local Fallback.', aiError);
            result = {
                scenes: Array.from({ length: shotCount }, (_, i) => ({
                    index: i,
                    shotNumber: i + 1,
                    timeRange: `${Math.round(i * durationNum / shotCount)} s - ${Math.round((i + 1) * durationNum / shotCount)} s`,
                    shotType: ANGLES[i % ANGLES.length],
                    action: `${characterValue || 'the subject'} in scene ${i + 1} `,
                    hasProduct: true,
                    prompt: `${characterValue || 'the subject'} wearing ${wardrobeDesc || 'their outfit'} in ${locationValue || 'cinematic environment'}, featuring ${productDesc || 'the product'}. ${ANGLES[i % ANGLES.length]}. Cinematic lighting, photorealistic, 8k.`
                }))
            };
        }

        broadcastProgress('ugc-storyboard', 1, 1, `Generated ${result.scenes.length} shots!`);
        broadcastComplete('ugc-storyboard');
        res.json(result);
    } catch (error) {
        console.error("Storyboard Generation CRASHED:", error);
        return res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack // Send the stack trace so we can debug it!
        });
    }
});
// Product Analysis: Google Vision-style analysis via Gemini REST API
app.post('/api/ugc/analyze-product', async (req, res) => {
    const safeBody = (req.body && typeof req.body === 'object') ? req.body : {};
    const nodeId = safeBody.nodeId ?? Date.now();
    const taskId = `product - analysis - ${nodeId} `;
    try {
        const image = safeBody.image ?? '';

        if (!image || typeof image !== 'string') {
            return res.status(400).json({ error: 'Missing Product Image in payload' });
        }

        broadcastProgress(taskId, 1, 3, 'Processing product image...');

        const productData = await productService.analyzeProductItem(image, (step, total, msg) => {
            broadcastProgress(taskId, step, total, msg);
        });

        broadcastProgress(taskId, 3, 3, 'Analysis complete!');
        broadcastComplete(taskId);

        res.json(productData);
    } catch (error) {
        console.error('Product Analysis Error:', error);
        if (taskId) {
            try { broadcastProgress(taskId, 0, 0, `Analysis failed: ${error.message} `); } catch (e) { }
        }
        res.status(500).json({
            error: 'Product analysis failed',
            message: error.message || 'Unknown error during product analysis',
            stack: error.stack
        });
    }
});

// Wardrobe Analysis: Multimodal analysis for items WORN on body
app.post('/api/wardrobe/analyze', wardrobeUploadMiddleware, analyzeWardrobeRoute);

// Location Analysis: Multimodal analysis for environments
app.post('/api/analyze-location', locationUploadMiddleware, analyzeLocationRoute);

// Mood Board Analysis: Analyze reference images for style/lighting/color
app.post('/api/ugc/analyze-mood', async (req, res) => {
    try {
        const { images } = req.body;
        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'Missing reference images for mood analysis' });
        }

        console.log(`[SERVER] Analyzing Mood Board with ${images.length} images...`);

        const imageParts = images.map(img => {
            const match = img.match(/^data:([^;]+);base64,/);
            const mimeType = match ? match[1] : 'image/jpeg';
            const data = img.replace(/^data:image\/\w+;base64,/, '');
            return { inlineData: { data, mimeType } };
        });

        const result = await moodBoardService.analyzeMood(imageParts);
        res.json(result);
    } catch (error) {
        console.error('Mood Analysis Error:', error);
        res.status(500).json({
            error: 'Mood analysis failed',
            message: error.message || 'Unknown error during mood analysis'
        });
    }
});

// Get Landing Page Assets Configuration (Supabase + Local Fallback)
app.get('/api/get-landing-assets', async (req, res) => {
    const defaultAssets = {
        heroBackground: "",
        backgroundMusic: "",
        pipelineDemo: "",
        gallery: []
    };

    try {
        // 1. Try Supabase first
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('app_settings')
                    .select('setting_value')
                    .eq('setting_key', 'landing_assets')
                    .single();

                if (!error && data?.setting_value) {
                    console.log("[SERVER] Fetched landing assets from Supabase.");
                    return res.json(data.setting_value);
                }
            } catch (supaErr) {
                console.warn("[SERVER] Supabase landing assets fetch exception:", supaErr.message);
            }
        }

        // 2. Fallback to local landingAssets.js
        try {
            const filePath = path.join(__dirname, '..', 'src', 'config', 'landingAssets.js');
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const jsonMatch = content.match(/export const LANDING_ASSETS = (\{[\s\S]*\});/);
                if (jsonMatch) {
                    try {
                        const parsed = JSON.parse(jsonMatch[1]);
                        console.log("[SERVER] Extracted landing assets from local file.");
                        return res.json(parsed);
                    } catch (parseErr) {
                        console.warn("[SERVER] Local file JSON parse failed:", parseErr.message);
                    }
                }
            }
        } catch (fileErr) {
            console.warn("[SERVER] Local fallback failed:", fileErr.message);
        }

        // 3. Final Fallback
        return res.json(defaultAssets);
    } catch (error) {
        console.error('Final Landing Assets Catch:', error);
        if (!res.headersSent) {
            return res.json(defaultAssets);
        }
    }
});

// Update Landing Page Assets Configuration
app.post('/api/update-landing-assets', async (req, res) => {
    try {
        const { assets } = req.body;
        if (!assets) throw new Error("No assets provided");

        // 1. Update Supabase (Primary)
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

        // 2. Also update local file (Secondary/Cache/Legacy)
        const filePath = path.join(__dirname, '..', 'src', 'config', 'landingAssets.js');
        const content = `/**
 * LANDING PAGE ASSET CONFIGURATION
 * 
 * Auto-generated via Asset Manager UI.
 */

export const LANDING_ASSETS = ${JSON.stringify(assets, null, 4)};
`;

        try {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`[SERVER] Updated local fallback at: ${filePath} `);
        } catch (fsErr) {
            console.warn("[SERVER] Local file update failed (likely read-only FS):", fsErr.message);
            // Don't throw if Supabase succeeded, as this is just a fallback
        }

        res.json({ success: true, message: 'Landing assets updated successfully (Supabase + Local)' });
    } catch (error) {
        console.error('Update Landing Assets Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Veo Image-to-Video: Animate a keyframe image into a 5s clip


// ============================================================
// PHASE 5: MusicFX Score Generation
// ============================================================

import * as musicService from './services/musicService.js';

app.post('/api/music/generate', async (req, res) => {
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

// ============================================================
// PHASE 5: UGC AD ORCHESTRATION
// ============================================================


// ============================================================
// UGC PREVIEW SCENE: 2-Step Keyframe → Veo I2V Pipeline
// Step 1: Generate keyframe (Character + Product fused together)
// Step 2: Animate keyframe with Veo 3.1 I2V
// ============================================================
app.post('/api/ugc/preview-scene', async (req, res) => {
    const { characterImage, productImage, scene, analysis, aspectRatio = '9:16', duration = 6, nodeId } = req.body;
    const taskId = nodeId ? `ugc - preview - ${nodeId} ` : 'ugc-preview';

    try {
        if (!characterImage || !productImage) {
            return res.status(400).json({ error: 'Character and product images are required.' });
        }

        // ── STEP 1: KEYFRAME GENERATION (Direct Gemini API - avoids server circular loop) ─
        broadcastProgress(taskId, 1, 3, 'Synthesizing scene keyframe...');
        console.log(`[UGC - PREVIEW] STEP 1 — Keyframe generation for scene: ${scene?.time || 'N/A'} `);

        const keyframePrompt = [
            scene?.action || scene?.visuals || 'Character holding product confidently',
            analysis?.synergy ? `Context: ${analysis.synergy} ` : '',
            analysis?.characterTraits?.length ? `Character traits: ${analysis.characterTraits.join(', ')} ` : '',
            'The subject is physically interacting with the product. Professional photography, photorealistic, editorial quality, sharp focus.'
        ].filter(Boolean).join('. ');

        // Helper: convert image string to inline part for Gemini
        const toImagePart = async (imgStr) => {
            if (!imgStr) return null;
            if (imgStr.startsWith('data:')) {
                const [meta, b64] = imgStr.split(',');
                const mime = meta.split(':')[1]?.split(';')[0] || 'image/png';
                return { inlineData: { data: b64, mimeType: mime } };
            }
            if (imgStr.startsWith('http') || imgStr.startsWith('//')) {
                const fullUrl = imgStr.startsWith('//') ? `https:${imgStr} ` : imgStr;
                const r = await nodeFetch(fullUrl);
                const buf = await r.arrayBuffer();
                const b64 = Buffer.from(buf).toString('base64');
                const mime = r.headers.get('content-type') || 'image/png';
                return { inlineData: { data: b64, mimeType: mime } };
            }
            // assume raw base64
            return { inlineData: { data: imgStr, mimeType: 'image/png' } };
        };

        const charPart = await toImagePart(characterImage);
        const prodPart = await toImagePart(productImage);

        const imageParts = [charPart, prodPart].filter(Boolean);

        // Helper for retrying Gemini/Veo calls
        const withRetry = async (fn, retries = 3, delay = 2000) => {
            try {
                const res = await fn();

                // For fetch objects
                if (res.status === 429 || res.status === 503 || res.status === 500) {
                    if (retries > 0) {
                        console.log(`[UGC - PREVIEW] API limit / error(${res.status}), retrying in ${delay}ms... (${retries} left)`);
                        await new Promise(r => setTimeout(r, delay));
                        return withRetry(fn, retries - 1, delay * 2);
                    }
                }

                // For the AI SDK results which might throw or have error objects
                if (res.error && (res.error.code === 429 || res.error.message?.includes('quota'))) {
                    if (retries > 0) {
                        console.log(`[UGC - PREVIEW] Logic Quota hit, retrying in ${delay}ms... (${retries} left)`);
                        await new Promise(r => setTimeout(r, delay));
                        return withRetry(fn, retries - 1, delay * 2);
                    }
                }

                return res;
            } catch (err) {
                if (retries > 0 && (err.message?.includes('quota') || err.message?.includes('429') || err.message?.includes('limit'))) {
                    console.log(`[UGC - PREVIEW] Exception Quota hit, retrying in ${delay}ms... (${retries} left)`);
                    await new Promise(r => setTimeout(r, delay));
                    return withRetry(fn, retries - 1, delay * 2);
                }
                throw err;
            }
        };

        const keyframeResult = await withRetry(() => genAI.getGenerativeModel({
            model: 'gemini-1.5-flash'
        }).generateContent({
            generationConfig: { responseModalities: ['image', 'text'] },
            contents: [{
                role: 'user',
                parts: [
                    { text: keyframePrompt },
                    ...imageParts
                ]
            }]
        }));

        const imgPart = keyframeResult.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        const keyframeUrl = imgPart ? `data: image / png; base64, ${imgPart.inlineData.data} ` : null;

        if (!keyframeUrl) throw new Error('Keyframe generation failed — Gemini returned no image.');
        console.log(`[UGC - PREVIEW] ✅ Keyframe ready(${Math.round(keyframeUrl.length / 1024)}KB base64)`);


        // ── STEP 2: VEO 3.1 I2V ANIMATION ────────────────────────────
        broadcastProgress(taskId, 2, 3, 'Animating keyframe with Veo 3.1...');
        console.log(`[UGC - PREVIEW] STEP 2 — Sending keyframe to Veo I2V`);

        const motionPrompt = [
            scene?.action || 'Smooth, confident movement',
            analysis?.suggestedTone ? `Tone: ${analysis.suggestedTone} ` : '',
            'Cinematic 8K quality. Photorealistic. Professional UGC ad production.'
        ].filter(Boolean).join('. ');

        // Fetch the keyframe and convert to base64 for Veo
        const apiKey = process.env.GOOGLE_API_KEY;
        let keyframeBase64 = '';
        let keyframeMime = 'image/png';

        if (keyframeUrl.startsWith('data:')) {
            const match = keyframeUrl.match(/^data:([^;]+);base64,/);
            if (match) keyframeMime = match[1];
            keyframeBase64 = keyframeUrl.split(',')[1];
        } else if (keyframeUrl.startsWith('http')) {
            const imgResp = await nodeFetch(keyframeUrl);
            const buffer = await imgResp.arrayBuffer();
            keyframeBase64 = Buffer.from(buffer).toString('base64');
            const ct = imgResp.headers.get('content-type');
            if (ct) keyframeMime = ct;
        } else {
            keyframeBase64 = keyframeUrl; // raw base64
        }

        const validDuration = [4, 6, 8].includes(Number(duration)) ? Number(duration) : 6;
        const validAspectRatio = ['16:9', '9:16', '1:1'].includes(aspectRatio) ? aspectRatio : '9:16';
        const veoModel = 'veo-3.1-generate-preview';
        const veoEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${veoModel}:predictLongRunning?key=${apiKey}`;

        const veoBody = {
            instances: [{
                prompt: motionPrompt,
                image: { bytesBase64Encoded: keyframeBase64, mimeType: keyframeMime }
            }],
            parameters: {
                sampleCount: 1,
                aspectRatio: validAspectRatio,
                durationSeconds: validDuration
            }
        };

        const veoInitResp = await withRetry(() => nodeFetch(veoEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(veoBody)
        }));
        const operation = await veoInitResp.json();

        if (operation.error) {
            console.error('[UGC-PREVIEW] Veo error:', operation.error);
            throw new Error(operation.error.message || 'Veo I2V initiation failed');
        }

        console.log(`[UGC-PREVIEW] Veo operation started: ${operation.name}`);
        broadcastProgress(taskId, 3, 3, 'Rendering video (this takes ~2 min)...');

        // Poll until complete
        const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operation.name}?key=${apiKey}`;
        let attempts = 0;
        const maxAttempts = 60;
        while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 6000));
            attempts++;
            const pollResp = await nodeFetch(pollUrl);
            const opStatus = await pollResp.json();
            if (opStatus.done) {
                const videoData = findVideoInResponse(opStatus);
                if (!videoData) {
                    console.error('[UGC-PREVIEW] No video data found in response:', JSON.stringify(opStatus, null, 2));
                    throw new Error('Veo rendered the sequence but returned no accessible video samples (Safety filtered or structure mismatch).');
                }

                let finalVideoUrl = null;
                if (videoData.uri) {
                    finalVideoUrl = `${videoData.uri}&key=${apiKey}`;
                } else if (videoData.videoBytes || videoData.bytesBase64Encoded) {
                    const b64 = videoData.videoBytes ? Buffer.from(videoData.videoBytes).toString('base64') : videoData.bytesBase64Encoded;
                    finalVideoUrl = `data:video/mp4;base64,${b64}`;
                }

                if (!finalVideoUrl) throw new Error('Failed to assemble video URL from Veo response.');

                console.log(`[UGC-PREVIEW] ✅ Video ready: ${finalVideoUrl.substring(0, 60)}...`);
                broadcastProgress(taskId, 3, 3, 'Video rendered!');
                return res.json({ keyframeUrl, videoUrl: finalVideoUrl });
            }
        }
        throw new Error('Veo render timed out after 6 minutes.');
    } catch (error) {
        console.error('[UGC-PREVIEW] Pipeline Error:', error);
        res.status(500).json({ error: error.message || 'UGC preview pipeline failed' });
    }
});


// ============================================================
// VEO 3.1 IMAGE-TO-VIDEO ENGINE
// Official SDK: ai.models.generateVideos + ai.operations.getVideosOperation
// Docs: https://ai.google.dev/gemini-api/docs/video
// ============================================================
app.post('/api/ugc/veo-i2v', async (req, res) => {
    try {
        const { image, motionPrompt, duration = 8, aspectRatio = '16:9', nodeId } = req.body;
        if (!motionPrompt) throw new Error('No motion prompt provided');

        const taskId = nodeId ? `veo-${nodeId}` : 'veo-default';
        const validDuration = [4, 6, 8].includes(Number(duration)) ? Number(duration) : 8;
        const validAspectRatio = ['16:9', '9:16', '1:1'].includes(aspectRatio) ? aspectRatio : '16:9';

        console.log(`[VEO-I2V] Starting | taskId: ${taskId} | duration: ${validDuration}s | ratio: ${validAspectRatio} | image: ${!!image}`);

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

        const modelName = 'veo-3.1-generate-preview';
        let operation;

        // We prioritize the REST API predictLongRunning as it has been more stable for Veo 3.1 in this environment
        const apiKey = process.env.GOOGLE_API_KEY;
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predictLongRunning?key=${apiKey}`;

        console.log(`[VEO-I2V] Calling REST API: ${endpoint}`);
        // Use nodeFetch instead of global fetch for better stability on Node 18
        const restResponse = await nodeFetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instances: [instance],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: validAspectRatio,
                    durationSeconds: validDuration
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
                const pollResp = await nodeFetch(`https://generativelanguage.googleapis.com/v1beta/${operationResult.name}?key=${apiKey}`);
                if (!pollResp.ok) throw new Error(`HTTP Error: ${pollResp.status}`);
                operationResult = await pollResp.json();

                if (operationResult.error) {
                    console.error(`[VEO-I2V] Polling Error:`, JSON.stringify(operationResult.error, null, 2));
                    throw new Error(operationResult.error.message || "Veo Poll Failed");
                }

                isDone = operationResult.done;
            } catch (pollError) {
                console.warn(`[VEO-I2V] Polling retry due to error: ${pollError.message}`);
                // Simple retry: wait 2s and continue to next loop iteration
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
            videoUrl = `data:video/mp4;base64,${b64}`;
        } else if (video.uri) {
            console.log(`[VEO-I2V] Downloading URI: ${video.uri}`);
            const videoResp = await nodeFetch(`${video.uri}&key=${apiKey}`);
            if (!videoResp.ok) throw new Error(`Video download failed: ${videoResp.statusText}`);
            const videoBuffer = await videoResp.arrayBuffer();
            videoUrl = `data:video/mp4;base64,${Buffer.from(videoBuffer).toString('base64')}`;
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

// ============================================================
// PHASE 5: WebSocket Server for Real-Time Progress
// ============================================================

import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
    console.log('[WS] Client connected');
    ws.send(JSON.stringify({ type: 'connected', message: 'Neural link established' }));

    ws.on('close', () => console.log('[WS] Client disconnected'));
});

function broadcastProgress(taskId, step, total, message) {
    try {
        if (!wss || !wss.clients) return;
        const payload = JSON.stringify({ type: 'progress', taskId, step, total, message });
        wss.clients.forEach(client => {
            if (client.readyState === 1) {
                try { client.send(payload); } catch (e) { }
            }
        });
    } catch (err) {
        console.error('[WS_PROGRESS_ERR]', err);
    }
}

function broadcastComplete(taskId) {
    try {
        if (!wss || !wss.clients) return;
        const payload = JSON.stringify({ type: 'complete', taskId });
        wss.clients.forEach(client => {
            if (client.readyState === 1) {
                try { client.send(payload); } catch (e) { }
            }
        });
    } catch (err) {
        console.error('[WS_COMPLETE_ERR]', err);
    }
}

// Proxy endpoint for remote assets (resilience against DNS issues)
app.get('/api/proxy/asset', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send("URL required");

    try {
        console.log(`[PROXY] Fetching asset: ${url}`);
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch asset: ${response.statusText}`);
        }

        // Forward headers (content-type, content-length)
        const contentType = response.headers.get('content-type');
        if (contentType) res.setHeader('Content-Type', contentType);

        const contentLength = response.headers.get('content-length');
        if (contentLength) res.setHeader('Content-Length', contentLength);

        // Stream the response body
        response.body.pipe(res);
        return;
    } catch (err) {
        console.error(`[PROXY] Asset fetch failed:`, err.message);
        res.status(500).send("Failed to proxy asset");
    }
});

httpServer.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`WebSocket server active on ws://localhost:${port}`);
});
