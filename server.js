import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the current directory
dotenv.config();
import dns from 'dns';
import net from 'net';
dns.setDefaultResultOrder('ipv4first');
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

import nodeFetch from 'node-fetch';
import { decode } from 'base64-arraybuffer';

// -------------------------------------------------------------
// GLOBAL HEADERS INJECTOR (For Restricted API Keys)
// Ensures all SDK/nodeFetch calls to Google have the required Referer
// MUST be defined BEFORE any SDKs are imported.
// -------------------------------------------------------------
const originalFetch = nodeFetch || globalThis.fetch;
globalThis.fetch = (url, options = {}) => {
    const urlStr = url.toString();
    if (urlStr.includes('googleapis.com')) {
        console.log(`[FETCH_DEBUG] URL: ${urlStr.substring(0, 80)}`);
        console.log(`[FETCH_DEBUG] Incoming Headers:`, JSON.stringify(options.headers || {}));
        
        options.headers = options.headers || {};
        const referer = 'http://localhost:5173/';
        
        if (typeof options.headers.set === 'function') {
            options.headers.set('Referer', referer);
        } else {
            options.headers = {
                ...options.headers,
                'Referer': referer,
                'X-Goog-Api-Key': process.env.GOOGLE_API_KEY || options.headers['X-Goog-Api-Key']
            };
        }
        console.log(`[FETCH_DEBUG] Final Referer: ${options.headers['Referer'] || options.headers['referer']}`);
    }
    return originalFetch(url, options);
};

import { GoogleGenAI } from '@google/genai';
const SchemaType = {
    OBJECT: 'OBJECT',
    ARRAY: 'ARRAY',
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    INTEGER: 'INTEGER',
    BOOLEAN: 'BOOLEAN'
};

import { v4 as uuidv4 } from 'uuid';

import http from 'http';
import { Readable } from 'stream';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import * as geminiService from './src/services/geminiService.js';
import * as audioService from './services/audioService.js';
import * as storageService from './services/storageService.js';
import * as workspaceService from './services/workspaceService.js';
import * as visionService from './services/visionService.js';
import * as vectorService from './services/vectorService.js';
import * as masterExportService from './services/masterExportService.js';
import https from 'https';
import { analyzeWardrobeRoute, wardrobeUploadMiddleware } from './services/wardrobeAnalyzerService.js';
import { analyzeLocationRoute, locationUploadMiddleware } from './services/locationAnalyzerService.js';
import * as moodBoardService from './services/moodBoardService.js';
import * as productService from './services/productService.js';
import * as cacheService from './services/cacheService.js';
import { GoogleAuth } from 'google-auth-library';

// ─────────────────────────────────────────────────────────────
// VERTEX AI AUTH via Service Account (for Veo 3.1 Video Gen)
// Uses the zerolen service account JSON key for Bearer tokens
// ─────────────────────────────────────────────────────────────
const VERTEX_KEY_PATH = path.join(__dirname, 'gen-lang-client-0438096272-veo.json');
const VERTEX_PROJECT_ID = 'gen-lang-client-0438096272';
const VERTEX_LOCATION = process.env.GOOGLE_LOCATION || 'us-central1';

let _vertexAuth = null;
let _vertexTokenCache = { token: null, expiry: 0 };

/**
 * Gets a fresh Bearer token from the zerolen service account.
 * Tokens are cached and auto-refreshed 60s before expiry.
 */
const getVertexToken = async () => {
    const now = Date.now();
    if (_vertexTokenCache.token && _vertexTokenCache.expiry > now + 60_000) {
        return _vertexTokenCache.token;
    }

    try {
        if (!_vertexAuth) {
            if (!fs.existsSync(VERTEX_KEY_PATH)) {
                console.warn(`[VERTEX_AUTH] Key file not found at: ${VERTEX_KEY_PATH}`);
                return null;
            }
            _vertexAuth = new GoogleAuth({
                keyFile: VERTEX_KEY_PATH,
                scopes: [
                    'https://www.googleapis.com/auth/cloud-platform',
                    'https://www.googleapis.com/auth/generative-language'
                ]

            });
        }

        const client = await _vertexAuth.getClient();
        const tokenResponse = await client.getAccessToken();
        const token = tokenResponse.token || tokenResponse;
        
        // Cache for ~55 mins (tokens last 60 mins)
        _vertexTokenCache = { token, expiry: now + 55 * 60 * 1000 };
        console.log(`[VERTEX_AUTH] ✅ Token refreshed for ${VERTEX_PROJECT_ID} (expires in ~55m)`);
        return token;
    } catch (err) {
        console.error(`[VERTEX_AUTH] ❌ Token refresh failed:`, err.message);
        return null;
    }
};

// Log on startup whether the key file exists
if (fs.existsSync(VERTEX_KEY_PATH)) {
    console.log(`[VERTEX_AUTH] ✅ Service account key found: ${VERTEX_KEY_PATH}`);
    // Pre-warm the token
    getVertexToken().catch(() => {});
} else {
    console.warn(`[VERTEX_AUTH] ⚠️  No service account key at: ${VERTEX_KEY_PATH}`);
}

let _geminiClient = null;
const getGeminiClient = () => {
    if (!_geminiClient) {
        const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
        if (!apiKey) {
            throw new Error('GOOGLE_API_KEY environment variable is not set. Please add it in your Railway service variables.');
        }
        _geminiClient = new GoogleGenAI({
            apiKey,
            headers: {
                'Referer': 'http://localhost:5173/',
                'Origin': 'http://localhost:5173'
            },
            fetchOptions: {
                headers: {
                    'Referer': 'http://localhost:5173/',
                    'Origin': 'http://localhost:5173'
                }
            },
            requestOptions: {
                headers: {
                    'Referer': 'http://localhost:5173/',
                    'Origin': 'http://localhost:5173'
                }
            }
        });
    }
    return _geminiClient;
};
// Alias for backward compatibility — existing code that uses `client` will still work
const client = new Proxy({}, {
    get: (_, prop) => getGeminiClient()[prop]
});

if (!globalThis.File) {
    const { File } = await import('node:buffer');
    globalThis.File = File;
}

// -------------------------------------------------------------
// REDIS / BULLMQ QUEUE SETUP (Optional - graceful no-op fallback)
// We use a TCP probe FIRST before creating ioredis, so we never
// get the flood of "Unhandled error event" retries in dev mode.
// -------------------------------------------------------------
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
let imageQueue = null;
let videoQueue = null;

// In-memory job status map (fallback when Redis is not available)
const inMemoryJobStatus = new Map();

// Helper to update job status (in-memory for now; Redis path added below if available)
let updateJobStatus = async (jobId, state, data = null, error = null) => {
    const statusData = { state, timestamp: Date.now(), ...data, error };
    inMemoryJobStatus.set(jobId, statusData);
    setTimeout(() => inMemoryJobStatus.delete(jobId), 3600_000);
};

let getJobStatus = async (jobId) => inMemoryJobStatus.get(jobId) || null;

// TCP probe - fast, no ioredis retry spam
const isRedisAvailable = () => new Promise((resolve) => {
    try {
        const url = new URL(REDIS_URL);
        const host = url.hostname || '127.0.0.1';
        const port = parseInt(url.port) || 6379;
        const s = net.createConnection({ host, port: port });
        s.setTimeout(5000); // 5s timeout
        s.on('connect', () => { s.destroy(); resolve(true); });
        s.on('error', () => { s.destroy(); resolve(false); });
        s.on('timeout', () => { s.destroy(); resolve(false); });
    } catch (e) {
        console.warn('[REDIS] Invalid URL:', REDIS_URL);
        resolve(false);
    }
});

if (await isRedisAvailable()) {
    try {
        const { Queue, Worker } = await import('bullmq');
        const { default: Redis } = await import('ioredis');

        const redisConn = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
        redisConn.on('error', (err) => {
            console.warn('[REDIS] Error:', err.message);
        });

        // Override helpers to use Redis
        updateJobStatus = async (jobId, state, data = null, error = null) => {
            const statusData = { state, timestamp: Date.now(), ...data, error };
            await redisConn.set(`job-status:${jobId}`, JSON.stringify(statusData), 'EX', 3600);
        };
        getJobStatus = async (jobId) => {
            const str = await redisConn.get(`job-status:${jobId}`);
            return str ? JSON.parse(str) : null;
        };

        imageQueue = new Queue('image-generation', { connection: redisConn });
        videoQueue = new Queue('video-generation', { connection: redisConn });

        const CONCURRENCY = parseInt(process.env.QUEUE_CONCURRENCY || '5', 10);

        new Worker('image-generation', async (job) => {
            const { reqBody } = job.data;
            console.log(`[WORKER] Starting image job ${job.id} for model ${reqBody.model}`);
            await updateJobStatus(job.id, 'processing');
            const mockReq = { body: reqBody };
            let finalUrl = null;
            const mockRes = { 
                json: (d) => { finalUrl = d.url; return d; }, 
                status: () => mockRes, 
                headersSent: false 
            };
            try {
                await handleGoogle(mockReq, mockRes);
                if (!finalUrl) throw new Error("handleGoogle did not return a valid URL");
                await updateJobStatus(job.id, 'completed', { url: finalUrl });
                console.log(`[WORKER] Image job ${job.id} completed successfully.`);
            } catch (err) {
                console.error(`[WORKER] Image job ${job.id} failed:`, err);
                await updateJobStatus(job.id, 'failed', null, err.message);
                throw err;
            }
            return { url: finalUrl };
        }, { connection: redisConn, concurrency: CONCURRENCY });

        new Worker('video-generation', async (job) => {
            const { reqBody } = job.data;
            console.log(`[WORKER] Starting video job ${job.id} for model ${reqBody.model}`);
            await updateJobStatus(job.id, 'processing');
            const mockReq = { body: reqBody };
            let finalUrl = null, finalVideoUrl = null;
            const mockRes = { 
                json: (d) => { finalUrl = d.url; finalVideoUrl = d.videoUrl; return d; }, 
                status: () => mockRes, 
                headersSent: false 
            };
            try {
                await handleGoogle(mockReq, mockRes);
                if (!finalUrl && !finalVideoUrl) throw new Error("handleGoogle did not return a valid URL or videoUrl");
                await updateJobStatus(job.id, 'completed', { url: finalUrl, videoUrl: finalVideoUrl });
                console.log(`[WORKER] Video job ${job.id} completed successfully.`);
            } catch (err) {
                console.error(`[WORKER] Video job ${job.id} failed:`, err);
                await updateJobStatus(job.id, 'failed', null, err.message);
                throw err;
            }
            return { url: finalUrl, videoUrl: finalVideoUrl };
        }, { connection: redisConn, concurrency: CONCURRENCY });

        console.log('[QUEUE] ✅ Redis connected. BullMQ workers active. (Production mode)');
    } catch (e) {
        console.warn('[QUEUE] Failed to initialize BullMQ:', e.message);
    }
} else {
    console.warn('[QUEUE] ℹ️  Redis not found — running in direct-processing mode. (Development mode)');
}

const app = express();
app.set('trust proxy', 1);

app.get('/api/health-check', (req, res) => {
    res.json({ status: 'ready', version: '1.0.9', timestamp: new Date().toISOString() });
});
const httpServer = http.createServer(app);
const port = process.env.PORT || 3002;
console.log(`[SERVER] Google API key configured: ${process.env.GOOGLE_API_KEY ? 'YES' : 'NO'}`);
console.log(`[SERVER] Kling API key configured: ${process.env.KLING_API_KEY ? 'YES' : 'NO'}`);

// Storage Base URL for GCS Assets
const storageBase = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME || 'ai-cinemastudio-assets-569815811058'}`;

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// SharedArrayBuffer / FFmpeg Export Headers
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    next();
});

// Memory Guard for 1,000+ Users Scaling (Prevent PM2 crash loops)
app.use((req, res, next) => {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    // Use an absolute threshold (3.5GB) rather than a ratio. 
    // Ratios are unreliable at startup when total allocated heap is still small.
    if (heapUsedMB > 3500) {
        console.warn(`[MEMORY GUARD] Refusing request to prevent crash. (Heap Used: ${heapUsedMB}MB)`);
        return res.status(503).json({ error: 'Server reaching peak memory limit. Auto-scaling in progress. Please retry in 10 seconds.' });
    }
    next();
});

// Serve static assets for local GCS fallback
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets'), {
    setHeaders: (res) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));

// Niche SEO Static Pages Handlers
app.get('/real-estate', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'real-estate', 'index.html')));
app.get('/fashion', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'fashion', 'index.html')));
app.get('/food', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'food', 'index.html')));
app.get('/cinema', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'cinema', 'index.html')));

// Production static serving (for built React app)
app.use(express.static(path.join(__dirname, 'dist')));

// ─────────────────────────────────────────────────────────────
// RAZORPAY AUTOMATED CREDITS WEBHOOK
// ─────────────────────────────────────────────────────────────
app.post('/api/webhook/razorpay', async (req, res) => {
    try {
        const payload = req.body;
        console.log('[RAZORPAY_WEBHOOK] Received Event:', payload.event);

        if (payload.event === 'payment.captured' || payload.event === 'order.paid') {
            const payment = payload.payload.payment.entity;
            const amount_in_rs = payment.amount / 100; // Razorpay uses Paise
            const userId = payment.notes?.client_id;
            const transaction_id = payment.id || payment.order_id || 'N/A';

            if (!userId) {
                console.warn('[RAZORPAY_WEBHOOK] Missing client_id (userId) in payment notes.', payment.notes);
                return res.status(200).json({ success: false, reason: 'missing_user_id' });
            }

            // Map Price to Credit Allocation & Tier
            let creditsToAdd = 0;
            let targetTier = null;
            let planName = 'TOP-UP';

            // Plans (Monthly/Yearly approximate match by price)
            if (amount_in_rs >= 4000) { creditsToAdd = 5000; targetTier = 'ENTERPRISE'; planName = 'Enterprise'; }
            else if (amount_in_rs >= 1900) { creditsToAdd = 2500; targetTier = 'DIRECTOR'; planName = 'Director'; }
            else if (amount_in_rs >= 790) { creditsToAdd = 600; targetTier = 'INFLUENCER'; planName = 'Influencer'; }
            else if (amount_in_rs >= 300) { creditsToAdd = 250; targetTier = 'STARTER'; planName = 'Starter'; }
            
            // Overrides for specific top-up amounts (exact match)
            if (amount_in_rs === 300) { creditsToAdd = 300; targetTier = null; planName = '300-Credits Pack'; }
            if (amount_in_rs === 900) { creditsToAdd = 1000; targetTier = null; planName = '1000-Credits Pack'; }
            if (amount_in_rs === 2000) { creditsToAdd = 2500; targetTier = null; planName = '2500-Credits Pack'; }

            if (creditsToAdd > 0) {
                console.log(`[RAZORPAY_WEBHOOK] Processing payment of ₹${amount_in_rs} for ${userId}. Credits: +${creditsToAdd}, Tier: ${targetTier || 'unchanged'}`);

                if (!supabaseAdmin) {
                    throw new Error("Supabase Admin client not initialized in server.js");
                }

                // 1. Get current balance and tier
                const { data: profile, error: getError } = await supabaseAdmin
                    .from('profiles')
                    .select('shorts_balance, tier')
                    .eq('id', userId)
                    .single();

                if (getError) throw getError;

                const current_balance = profile?.shorts_balance ?? 0;
                const new_balance = current_balance + creditsToAdd;
                
                // 2. Build profile update
                const profileUpdate = { 
                    shorts_balance: new_balance,
                    last_payment_at: new Date().toISOString()
                };
                if (targetTier) profileUpdate.tier = targetTier;

                // 3. Execution update
                const { error: updateError } = await supabaseAdmin
                    .from('profiles')
                    .update(profileUpdate)
                    .eq('id', userId);

                if (updateError) throw updateError;

                // 4. Log detailed billing history
                await supabaseAdmin.from('billing_history').insert({
                    user_id: userId,
                    plan_name: planName,
                    amount: amount_in_rs,
                    status: 'SUCCESS',
                    transaction_id: transaction_id,
                    created_at: new Date().toISOString()
                });

                // 5. Log transaction in shorts_transactions
                await supabaseAdmin.from('shorts_transactions').insert({
                    user_id: userId,
                    amount: creditsToAdd,
                    action_type: 'razorpay_payment',
                    reason: `Purchase: ${planName}`,
                    created_at: new Date().toISOString()
                });

                console.log(`[RAZORPAY_WEBHOOK] ✅ Balance and Plan (${planName}) updated successfully for ${userId}`);
            }
        }

        // Always return 200 OK to Razorpay to prevent retry spam
        res.status(200).json({ success: true });

    } catch (err) {
        console.error('[RAZORPAY_WEBHOOK_ERROR]:', err);
        res.status(500).json({ error: err.message });
    }
});

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
/**
 * Advanced search for video data in a JSON response.
 * Scores matches to prioritize actual video content over thumbnails/metadata.
 */
function findVideoInResponse(obj) {
    if (!obj || typeof obj !== 'object') return null;

    // Check for safety refusal immediately
    if (obj.candidates && obj.candidates[0]?.finishReason === 'SAFETY') {
        throw new Error("SAFETY_REFUSAL: The cinematic sequence was blocked by safety filters.");
    }

    const matches = [];

    function search(o, depth = 0, path = '') {
        if (!o || typeof o !== 'object' || depth > 10) return;

        // --- SCORING ENGINE ---
        // Score 100: Explicit video data fields
        if (o.videoBytes || o.videoUri) {
            matches.push({ score: 100, data: o });
        }
        // Score 80: Explicit video containers
        if (o.video || o.generatedVideo || o.videoFileData) {
            const container = o.video || o.generatedVideo || o.videoFileData;
            if (typeof container === 'object') {
                 matches.push({ score: 80, data: container });
            }
        }
        // Score 60: Path suggests video (e.g. content.parts.video)
        if ((o.uri || o.bytesBase64Encoded) && path.toLowerCase().includes('video')) {
            matches.push({ score: 60, data: o });
        }
        // Score 20: Generic data URI/bytes (very low priority)
        if (o.uri || o.bytesBase64Encoded) {
            matches.push({ score: 20, data: o });
        }

        // --- RECURSION ---
        for (const key in o) {
            // Explicitly ignore known-image keys to avoid false positives
            const lowerKey = key.toLowerCase();
            if (['metadata', 'safetyratings', 'thumbnail', 'preview', 'image', 'base64_image'].includes(lowerKey)) continue;
            
            if (Object.prototype.hasOwnProperty.call(o, key)) {
                search(o[key], depth + 1, path + (path ? '.' : '') + key);
            }
        }
    }

    search(obj);

    if (matches.length === 0) return null;

    // Return the match with the highest score
    matches.sort((a, b) => b.score - a.score);
    const best = matches[0].data;
    
    // Safety check: ensure the object actually contains what we need
    if (best.videoBytes || best.bytesBase64Encoded || best.videoUri || best.uri) {
        return best;
    }
    
    // If it's a wrapper object (like Score 80), try to find the data inside it
    if (best.uri || best.videoUri || best.videoBytes) return best;
    
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

// Refine Prompt Narrative (Server-side to bypass browse auth restrictions)
app.post('/api/refine-narrative', async (req, res) => {
    try {
        const { text, type = "general" } = req.body;
        if (!text) return res.status(400).json({ error: "Text is required" });

        const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
        const projectId = process.env.GOOGLE_PROJECT_ID;
        const location = process.env.GOOGLE_LOCATION || 'us-central1';

        const prompt = `You are an elite cinematic prompt engineer. Your task is to take a raw description and transform it into a high-fidelity, visually rich narrative prompt.
        
        INPUT DESCRIPTION: "${text}"
        CATEGORY: ${type}
        
        Guidelines:
        - Enhance textures, lighting, and environmental details.
        - Maintain the core intent of the user.
        - Keep it descriptive but concise (max 50 words).
        - Use evocative language suitable for high-end AI video/image models like Veo or Imagen.
        - Do NOT add camera/lens settings (those are handled elsewhere).
        
        Return ONLY the refined text string.`;
        const safetySettings = [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ];

        const headers = { 
            'Content-Type': 'application/json',
            'Referer': 'http://localhost:5173/',
            'Origin': 'http://localhost:5173'
        };

        console.log(`[BACKEND] Refining narrative for ${type} using AI Studio (Gemini 2.5)...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const resp = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ 
                contents: [{ parts: [{ text: prompt }] }],
                safetySettings
            })
        });

        const data = await resp.json();
        if (!resp.ok) {
            console.error("[BACKEND-AI-ERR]", JSON.stringify(data, null, 2));
            throw new Error(`AI Gateway Error: ${data.error?.message || resp.status}`);
        }
        
        const refinedText = data.candidates?.[0]?.content?.parts?.[0]?.text || text;
        res.json({ refined: refinedText.trim().replace(/^"|"$/g, '') });
    } catch (error) {
        console.error('BACKEND REFINE ERROR:', error);
        res.status(500).json({ error: error.message, originalText: req.body.text });
    }
});


// Suggest Dialogue Alternatives (Server-side)
app.post('/api/suggest-dialogue', async (req, res) => {
    try {
        const { currentScript, context = "" } = req.body;
        if (!currentScript) return res.status(400).json({ error: "currentScript is required" });

        const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
        const projectId = process.env.GOOGLE_PROJECT_ID;
        const location = process.env.GOOGLE_LOCATION || 'us-central1';

        const prompt = `You are an expert scriptwriter and dialogue polisher. 
        Given the following dialogue or script snippet, provide 3 distinct alternative phrasings.
        
        CURRENT SCRIPT: "${currentScript}"
        ${context ? `CONTEXT: ${context}` : ""}
        
        Make them creative, natural, and punchy.
        Return ONLY valid JSON in this format:
        {
          "alternatives": ["Alternative 1", "Alternative 2", "Alternative 3"]
        }`;

        const safetySettings = [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ];

        let alternatives = [];
        let textContent = "{}";

        const headers = { 
            'Content-Type': 'application/json',
            'Referer': 'http://localhost:5173/' 
        };

        if (apiKey && apiKey.startsWith('AIza')) {
            console.log(`[BACKEND] Suggesting dialogue via AI Studio REST (Gemini 2.5)...`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
            const resp = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ 
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" },
                    safetySettings
                })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error?.message || `AI Studio Error ${resp.status}`);
            textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        } else {
            console.log(`[BACKEND] Suggesting dialogue via Vertex AI Bearer...`);
            const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-1.5-flash:generateContent`;
            const resp = await fetch(url, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" },
                    safetySettings
                })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error?.message || `Vertex Error ${resp.status}`);
            textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        }

        const data = JSON.parse(textContent.match(/\{[\s\S]*\}/)?.[0] || "{}");
        res.json({ alternatives: data.alternatives || [] });
    } catch (error) {
        console.error('BACKEND DIALOGUE ERROR:', error);
        res.status(500).json({ error: error.message, alternatives: [] });
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

// Save Asset (Universal for Image/Video, Local/Remote)
app.post('/api/save-asset', async (req, res) => {
    try {
        const { imageData, fileName, type, userId, isUrlOnly } = req.body;
        
        if (!userId) throw new Error('Unauthorized asset save attempt.');

        let publicUrl = imageData; 
        let path = `generated/${fileName}`;

        // If not already a URL and we have base64 data, upload to Supabase
        if (!isUrlOnly && imageData && imageData.startsWith('data:')) {
            console.log(`[STORAGE] Decoding and uploading ${type} to Supabase: ${fileName}`);
            const base64Str = imageData.split(',')[1];
            
            if (!supabase) throw new Error('Supabase not configured locally.');

            const { data, error } = await supabase.storage
                .from('assets') 
                .upload(fileName, decode(base64Str), {
                    contentType: type === 'video' ? 'video/mp4' : 'image/png',
                    upsert: true
                });

            if (error) throw error;

            const { data: { publicUrl: supabaseUrl } } = supabase.storage
                .from('assets')
                .getPublicUrl(fileName);
            
            publicUrl = supabaseUrl;
            path = data.path;
        }

        res.json({ 
            success: true, 
            path: path, 
            url: publicUrl,
            id: `asset_${Date.now()}` 
        });

    } catch (err) {
        console.error('[BACKEND_SAVE_ERROR]:', err);
        res.status(500).json({ error: err.message });
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

    // Handle data: URLs (base64) from local uploads
    if (imageUrl.startsWith('data:')) {
        try {
            const [meta, b64] = imageUrl.split(',');
            const mimeType = meta.match(/:(.*?);/)?.[1] || 'image/jpeg';
            return {
                type: 'inline',
                mimeType,
                data: b64
            };
        } catch (err) {
            console.error('[resolveImageForGemini] Base64 parse failed:', err.message);
            return null;
        }
    }

    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('//') && 
        !imageUrl.startsWith('gs://') && imageUrl.length > 100) {
        console.log('[resolveImageForGemini] Raw base64 detected, wrapping...');
        const isPng = imageUrl.startsWith('iVBORw0KGgo');
        const detectedMimeType = isPng ? 'image/png' : 'image/jpeg';
        return { type: 'inline', mimeType: detectedMimeType, data: imageUrl };

    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds safety timeout
        
        const resp = await fetch(imageUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buffer = await resp.buffer();
        const mimeType = resp.headers.get('content-type') || 'image/jpeg';
        return {
            type: 'inline',
            mimeType,
            data: buffer.toString('base64')
        };
    } catch (err) {
        console.error('[resolveImageForGemini] Fetch failed or timed out:', err.message);
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
        const imgResp = await fetch(imageUrl);
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

// Serve index.html for all other routes (SPA support)
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    // If it's a file request (has extension), let static middleware handle it or 404
    if (req.path.includes('.')) return next();
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Debug Env (development only)
if (process.env.NODE_ENV !== 'production') {
    app.get('/api/debug/env', (req, res) => {
        res.json({
            node_env: process.env.NODE_ENV || 'development',
            has_google_key: !!process.env.GOOGLE_API_KEY,
            has_kling_key: !!process.env.KLING_API_KEY,
            port: port,
            time: new Date().toISOString()
        });
    });
}

// --- Queue Status Polling Endpoints ---
app.get('/api/job-status/:jobId', async (req, res) => {
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

// --- Credit System Helper ---
async function consumeCredits(userId, cost) {
    if (!supabase) return true; // Bypass safely if no DB

    // Bypass for unauthenticated users in local development
    if (!userId) {
        console.warn("[CREDIT_SYSTEM] No userId provided. Bypassing credit check.");
        return true;
    }

    // 1. Deduct Balance (Atomic RPC call)
    const { error } = await supabase.rpc('deduct_credits', { p_user_id: userId, p_cost: cost });
    
    if (error) {
        if (error.message?.includes('Insufficient credits')) {
            console.warn(`[CREDIT_SYSTEM] Insufficient credits for user ${userId}. Bypassing for development.`);
            return true;
        }
        console.warn("[SERVER] Profile/Credit check issue, allowing bypass for user:", userId, error.message);
    }
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

        const result = await client.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
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

        const parts = (result.candidates?.[0] ?? result.response?.candidates?.[0])?.content?.parts;
        const generatedData = parts?.find(p => p.inlineData)?.inlineData?.data;
        if (!generatedData) throw new Error("No image generated from edits");

        const dataUrl = `data:image/jpeg;base64,${generatedData}`;
        res.json({ url: dataUrl });

    } catch (error) {
        console.error("Edit Image Route Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Analyze Frames for Autoprompting
app.post('/api/analyze-frames', async (req, res) => {
    try {
        const { firstFrame, lastFrame } = req.body;
        if (!firstFrame) throw new Error("At least first frame is required to analyze.");

        const parts = [];
        
        const formatImage = async (imgData) => {
            if (imgData.startsWith('data:')) {
                const mime = imgData.match(/:(.*?);/)?.[1] || 'image/png';
                const data = imgData.split(',')[1];
                return { inlineData: { mimeType: mime, data: data } };
            } else if (imgData.startsWith('http')) {
                const response = await fetch(imgData);
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const mime = response.headers.get('content-type') || 'image/png';
                return { inlineData: { mimeType: mime, data: buffer.toString('base64') } };
            }
            return { inlineData: { mimeType: 'image/png', data: imgData } };
        };

        if (firstFrame) {
            parts.push({ text: "First Frame:" });
            parts.push(await formatImage(firstFrame));
        }
        if (lastFrame) {
            parts.push({ text: "Last Frame:" });
            parts.push(await formatImage(lastFrame));
        }

        const promptTemplate = `You are an elite fashion film director and cinematographer working for Vogue, Harper's Bazaar, and top luxury brands.

Analyze the provided reference frame(s) and write a precise, professional video generation prompt.

STRICT RULES:
- Describe ONE single continuous camera movement with clear intention — no cuts, no jumps, no random drift
- The camera movement must have a deliberate START position and END position
- Focus on: fabric texture and movement, model's confident pose and expression, skin and hair detail, luxury lighting atmosphere
- If TWO frames are provided: describe the exact smooth organic motion that connects them naturally — the model's body should transition fluidly, fabric should flow, lighting should remain consistent
- Camera style: cinematic, stabilized, deliberate — like a high-end perfume or luxury fashion commercial
- Lighting: dramatic rim lighting, golden hour, soft studio diffusion, or moody editorial — match what is visible in the reference
- Never mention "transition", "cut", "scene change" or any editing terminology
- The video should feel like one breathtaking uninterrupted moment frozen in time and then set in motion

Output ONLY the raw prompt text ready for the video model. No preamble, no labels, no explanation.`;

        parts.push({ text: promptTemplate });

        const result = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{
                role: 'user',
                parts: parts
            }]
        });

        // Safely extract text from the new Google GenAI SDK result
        const textResponse = (typeof result.text === 'function' ? result.text() : result.text) || result.response?.text?.() || result.candidates?.[0]?.content?.parts?.[0]?.text || "Cinematic fashion shot focusing on the subject's elegant attire, dramatic lighting, and dynamic camera movement slowly panning across the scene.";
        
        res.json({ prompt: textResponse.trim() });
    } catch (e) {
        console.error("Autoprompting error:", e);
        res.status(500).json({ error: e.message });
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
        if (model?.includes('pro') || model === 'gemini-3-pro-image-preview' || model === 'nano-banana-pro-preview') cost = 5;
        if (model === 'veo' || model === 'veo3' || model === 'veo-3.1-generate-preview') cost = 5;
        if (model === 'veo-fast' || model === 'veo3_fast' || model === 'veo-3.1-fast-generate-preview') cost = 3;
        if (model === 'kling' || model?.includes('kling-3.0') || model?.includes('kling/') || model === 'runway' || model === 'pika') cost = 10; // Future-proofing

        // await consumeCredits(userId, cost); // Bypassing for sandbox testing as requested

        const targetModel = model || req.body.modelEngine;
        const isVeo = targetModel === 'veo' || targetModel === 'veo-fast' || targetModel?.includes('veo-3.1') || targetModel?.includes('veo3');

        // Route to appropriate model via Queue
        switch (targetModel) {
            case 'kling':
            case 'kling-2.6':
            case 'kling-v2.6':
            case 'kling-v2.6-pro':
            case 'kling-2.6/video':
            case 'kling-2.6/image-to-video':
            case 'kling-3.0/video':
            case 'kling/v2-5-turbo-image-to-video-pro':
            case 'veo-kling':
                console.log(`[DIRECT] Processing Kling Video synchronously.`);
                return await handleKling(req, res);

            case 'gemini': // Compatibility for unrefreshed browsers
            case 'nano-banana':
            case 'nano-banana-2':
            case 'nano-banana-pro':
            case 'nano-banana-pro-preview':
            case 'gemini-2.5-flash-image':
            case 'gemini-3.1-flash-image-preview':
            case 'gemini-3-pro-image-preview':
            case 'veo':
            case 'veo-fast':
            case 'veo3':
            case 'veo3_fast':
            case 'veo-3.1-generate-preview':
            case 'veo-3.1-fast-generate-preview':
                const videoProvider = req.body.provider || process.env.VEO_PROVIDER || 'google';
                if (videoProvider?.toLowerCase() === 'kie') {
                    console.log("[VEO] Routing via KIE AI wrapper endpoints.");
                    return handleKieVeo(req, res);
                }

                // If Redis queues are available, use async job system
                if ((isVeo && videoQueue) || (!isVeo && imageQueue)) {
                    const jobId = uuidv4();
                    await updateJobStatus(jobId, 'queued');

                    if (isVeo) {
                        await videoQueue.add('generate-video', { reqBody: req.body }, { jobId });
                        console.log(`[QUEUE] Added video generation job: ${jobId}`);
                    } else {
                        await imageQueue.add('generate-image', { reqBody: req.body }, { jobId });
                        console.log(`[QUEUE] Added image generation job: ${jobId}`);
                    }
                    return res.json({ jobId });
                }

                // No Redis - direct synchronous fallback
                console.log(`[DIRECT] No Redis. Processing ${targetModel} synchronously.`);
                return await handleGoogle(req, res);

            case 'openai':
            case 'replicate':
            case 'runway':
            case 'pika':
                return res.status(501).json({
                    error: 'Coming Soon',
                    message: `${model.toUpperCase()} integration has been removed or is under development. Please try Nano Banana or Kling models.`
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

/**
 * Uploads a video buffer to Supabase Storage and returns the public URL.
 * Falls back to a base64 data URI if Supabase is unavailable.
 */
async function uploadVideoToSupabase(videoBuffer, userId) {
    const name = `veo_${userId || 'anon'}_${Date.now()}.mp4`;
    const subPath = `videos/${name}`;
    
    if (supabase) {
        try {
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('assets')
                .upload(subPath, videoBuffer, { contentType: 'video/mp4', upsert: true });
            
            if (!uploadError) {
                const { data } = supabase.storage.from('assets').getPublicUrl(subPath);
                if (data?.publicUrl) {
                    console.log(`[VEO-PROD] Video uploaded to Supabase: ${data.publicUrl}`);
                    // Also save metadata to DB
                    const insertData = {
                        name, type: 'video', path: subPath,
                        url: data.publicUrl,
                        size: (videoBuffer.length / (1024 * 1024)).toFixed(2) + ' MB',
                        created_at: new Date().toISOString()
                    };
                    if (userId) insertData.user_id = userId;
                    await supabase.from('assets').insert([insertData]);
                    return data.publicUrl;
                }
            } else {
                console.warn('[VEO-PROD] Supabase upload error:', uploadError.message);
            }
        } catch (e) {
            console.warn('[VEO-PROD] Supabase upload exception:', e.message);
        }
    }
    // Fallback: return as base64 data URI (browser-playable but not saveable)
    console.warn('[VEO-PROD] Falling back to base64 data URI');
    return `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
}

/**
 * Uploads an image buffer to Supabase Storage and returns the public URL.
 */
async function uploadImageToSupabase(imageBuffer, userId, mimeType = 'image/jpeg') {
    const ext = mimeType.split('/')[1] || 'jpg';
    const name = `gen_${userId || 'anon'}_${Date.now()}.${ext}`;
    const subPath = `generated/${name}`;
    
    if (supabase) {
        try {
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('assets')
                .upload(subPath, imageBuffer, { contentType: mimeType, upsert: true });
            
            if (!uploadError) {
                const { data } = supabase.storage.from('assets').getPublicUrl(subPath);
                if (data?.publicUrl) {
                    console.log(`[IMAGE-PROD] Image uploaded to Supabase: ${data.publicUrl}`);
                    // Also save metadata to DB
                    const insertData = {
                        name, type: 'image', path: subPath,
                        url: data.publicUrl,
                        size: (imageBuffer.length / 1024).toFixed(2) + ' KB',
                        created_at: new Date().toISOString()
                    };
                    if (userId) insertData.user_id = userId;
                    await supabase.from('assets').insert([insertData]);
                    return data.publicUrl;
                }
            }
        } catch (e) {
            console.warn('[IMAGE-PROD] Supabase upload exception:', e.message);
        }
    }
    // Fallback
    return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
}

/**
 * Resolves a frame image (base64 or URL) and uploads it to Google AI Files API
 * if necessary, returning a { fileUri, mimeType } object for Veo.
 */
async function resolveFrameUri(frameData) {
    if (!frameData) return null;

    try {
        let buffer;
        let mimeType = 'image/png';

        if (frameData.startsWith('data:')) {
            const [meta, b64] = frameData.split(',');
            const match = meta.match(/:(.*?);/);
            if (match) mimeType = match[1];
            buffer = Buffer.from(b64, 'base64');
        } else if (frameData.startsWith('http') || frameData.startsWith('//')) {
            const fullUrl = frameData.startsWith('//') ? `https:${frameData}` : frameData;
            const res = await fetch(fullUrl);
            const arrayBuf = await res.arrayBuffer();
            buffer = Buffer.from(arrayBuf);
            // Enhanced mimeType detection for Supabase/Cloud URLs
            const contentType = res.headers.get('content-type');
            if (contentType && contentType !== 'application/octet-stream') {
                mimeType = contentType;
            } else {
                // Fallback to extension check if content-type is generic
                const url = fullUrl.split('?')[0].toLowerCase();
                if (url.endsWith('.png')) mimeType = 'image/png';
                else if (url.endsWith('.jpg') || url.endsWith('.jpeg')) mimeType = 'image/jpeg';
                else if (url.endsWith('.webp')) mimeType = 'image/webp';
                else mimeType = 'image/png'; // Final fallback
            }
        } else if (frameData.startsWith('/assets/')) {
            const localPath = path.join(__dirname, '..', 'public', frameData);
            if (fs.existsSync(localPath)) {
                buffer = fs.readFileSync(localPath);
                mimeType = frameData.endsWith('.png') ? 'image/png' : 'image/jpeg';
            } else {
                return null;
            }
        } else if (frameData.length > 100 && !frameData.includes(' ')) {
            // Assume it's already a base64 string without prefix if it looks like one
            buffer = Buffer.from(frameData, 'base64');
            mimeType = 'image/png'; // Default
        } else {
            return null;
        }

        if (!buffer) return null;

        // ✅ Convert buffer to Blob for @google/genai SDK
        const blob = new Blob([buffer], { type: mimeType });

        // Upload to Google AI Files API
        const uploadResponse = await client.files.upload({
            file: blob,
            config: {
                mimeType: mimeType,
                displayName: `veo-frame-${Date.now()}`
            }
        });

        console.log(`[VEO-UPLOAD] Success: ${uploadResponse.uri}`);
        return { fileUri: uploadResponse.uri, mimeType: uploadResponse.mimeType };
    } catch (err) {
        console.error('[VEO-UPLOAD] Failed:', err.message);
        return null;
    }
}

/**
 * Resolves an image to a public URL. 
 * If it's already a URL, returns it. If it's base64, uploads to Supabase.
 */
async function resolveToPublicUrl(imgData, userId) {
    if (!imgData) return null;
    
    // If it's a proxy URL, extract the actual target URL
    if (imgData.includes('/api/proxy/asset?url=')) {
        try {
            const urlObj = new URL(imgData.startsWith('http') ? imgData : `http://localhost${imgData}`);
            const realUrl = urlObj.searchParams.get('url');
            if (realUrl) imgData = realUrl;
        } catch (e) {
            console.warn('[RESOLVE-PROXY-ERR]', e.message);
        }
    }

    if (imgData.startsWith('http') && !imgData.includes('localhost')) {
        // Kling strictly requires IMAGE files. If it's a video, block it here.
        const isVideo = imgData.toLowerCase().split('?')[0].endsWith('.mp4') || 
                        imgData.toLowerCase().split('?')[0].endsWith('.webm') ||
                        imgData.toLowerCase().split('?')[0].endsWith('.mov');
        
        if (isVideo) {
            throw new Error("Kling Image-to-Video requires an IMAGE as a start frame, but a VIDEO was provided. Please select a static image.");
        }

        // If it's a simple URL without query params and has a valid image extension, return it as is.
        const hasQueryParams = imgData.includes('?');
        const hasImageExt = ['png', 'jpg', 'jpeg', 'webp'].some(ext => imgData.toLowerCase().split('?')[0].endsWith('.' + ext));

        if (!hasQueryParams && hasImageExt) {
            return imgData;
        }

        // For complex URLs (like Supabase signed URLs) or URLs without extensions,
        // we download and re-upload to a "clean" path without tokens to help the AI engine.
        console.log(`[RESOLVE-URL] Complex image URL detected. Normalizing for AI Engine...`);
    }
    
    try {
        let buffer;
        let mimeType = 'image/png';
        if (imgData.startsWith('data:')) {
            const [meta, b64] = imgData.split(',');
            const match = meta.match(/:(.*?);/);
            if (match) mimeType = match[1];
            buffer = Buffer.from(b64, 'base64');
        } else if (imgData.startsWith('http')) {
            const response = await fetch(imgData);
            if (!response.ok) throw new Error(`Failed to fetch source image: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
            mimeType = response.headers.get('content-type') || 'image/png';
        } else {
            buffer = Buffer.from(imgData, 'base64');
        }

        const ext = mimeType.split('/')[1] || 'png';
        const name = `ref_${Date.now()}.${ext}`;
        const subPath = `refs/${name}`;
        
        if (supabase) {
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('assets')
                .upload(subPath, buffer, { contentType: mimeType, upsert: true });
            
            if (!uploadError) {
                const { data } = supabase.storage.from('assets').getPublicUrl(subPath);
                return data?.publicUrl;
            } else {
                throw new Error(`Supabase Asset Upload Failed: ${uploadError.message || JSON.stringify(uploadError)}`);
            }
        }
    } catch (e) {
        throw e; // Bubble up instead of returning null
    }
    return null;
}

/**
 * Handler for Veo 3.1 via KIE AI API Wrapper
 */
async function handleKieVeo(req, res) {
    try {
        const { prompt, firstFrame, lastFrame, referenceImages = [], duration, includeAudio, userId, aspect_ratio } = req.body;
        const apiKey = process.env.KLING_API_KEY; // Using KIE Key

        if (!apiKey) throw new Error("KIE API Key not configured. Please add KLING_API_KEY to your environment.");

        // ✅ Only 2 valid model strings per docs
        const modelId = req.body.model;
        const kieModelMap = {
            "veo3":                           "veo3",
            "veo3_fast":                      "veo3_fast",
            "veo-3.1-generate-preview":      "veo3",
            "veo-3.1-fast-generate-preview": "veo3_fast",
            "veo":                           "veo3",
            "veo-fast":                      "veo3_fast"
        };
        let kieModel = kieModelMap[modelId] || 'veo3'; // Resolve the correct KIE model ID
        console.log(`[KIE-VEO] Resolving assets for user ${userId}...`);
        
        // ─── Resolve all images ───────────────────────────────────
        const resolvedRefs = [];

        // Resolve referenceImages (Person, Outfit, Stage from Stylist)
        if (Array.isArray(referenceImages) && referenceImages.length > 0) {
            for (const img of referenceImages.slice(0, 3)) {
                const url = await resolveToPublicUrl(img, userId);
                if (url) resolvedRefs.push(url);
            }
        }

        // Fallback to firstFrame if no refs
        if (resolvedRefs.length === 0 && firstFrame) {
            const url = await resolveToPublicUrl(firstFrame, userId);
            if (url) resolvedRefs.push(url);
        }

        // lastFrame — for first+last interpolation
        const resolvedLastFrame = lastFrame ? await resolveToPublicUrl(lastFrame, userId) : null;

        console.log(`[VEO-KIE] Resolved images: ${resolvedRefs.length} refs, lastFrame: ${!!resolvedLastFrame}`);

        // ─── Determine generation type ────────────────────────────
        let generationType;
        let imageUrls = undefined;

        if (resolvedRefs.length >= 1 && !resolvedLastFrame) {
            // REFERENCE_2_VIDEO requires veo3_fast — force it
            generationType = 'REFERENCE_2_VIDEO';
            kieModel = 'veo3_fast';   // ← docs: REFERENCE_2_VIDEO only supports veo3_fast
            imageUrls = resolvedRefs.slice(0, 3);
        } else if (resolvedLastFrame) {
            // First + last frame interpolation
            generationType = 'FIRST_AND_LAST_FRAMES_2_VIDEO';
            imageUrls = [
                resolvedRefs[0] || resolvedLastFrame,
                resolvedLastFrame
            ].filter(Boolean).slice(0, 2);
        } else if (resolvedRefs.length === 0 && firstFrame) {
            // Single image i2v
            generationType = 'FIRST_AND_LAST_FRAMES_2_VIDEO';
            const url = await resolveToPublicUrl(firstFrame, userId);
            imageUrls = url ? [url] : undefined;
        } else {
            // Text to video
            generationType = 'TEXT_2_VIDEO';
        }

        console.log(`[VEO-KIE] Mode: ${generationType} | Model: ${kieModel} | Images: ${imageUrls?.length || 0}`);

        // ─── Build payload ────────────────────────────────────────
        const payload = {
            prompt,
            model: kieModel,
            generationType,
            duration: duration,
            includeAudio: includeAudio,
            aspect_ratio: aspect_ratio || "16:9",
            enableTranslation: false,
            ...(imageUrls?.length > 0 && { imageUrls })
        };
 
        const createResp = await fetch("https://api.kie.ai/api/v1/veo/generate", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        const createData = await createResp.json();
        if (createData.code !== 200) throw new Error(`KIE Veo Task Creation Failed: ${createData.msg || JSON.stringify(createData)}`);

        const taskId = createData.data?.taskId;
        if (!taskId) throw new Error('KIE Veo returned no taskId');
        console.log(`[KIE-VEO] Task Created: ${taskId}. Polling...`);

        let attempts = 0;
        const maxAttempts = 80; 
        while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 8000));
            attempts++;

            const pollResp = await fetch(`https://api.kie.ai/api/v1/veo/record-info?taskId=${taskId}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            const pollData = await pollResp.json();

            if (pollData.code !== 200) throw new Error(`KIE Veo Polling Failed: ${pollData.msg}`);

            const successFlag = pollData.data?.successFlag;
            console.log(`[KIE-VEO-POLL] Status: successFlag=${successFlag} (${attempts})`);

            if (successFlag === 1) {
                const resultUrls = pollData.data?.response?.resultUrls;
                const finalUrl = Array.isArray(resultUrls) ? resultUrls[0] : resultUrls;
                if (!finalUrl) throw new Error("KIE reported success but no result URL was found.");
                
                console.log(`[KIE-VEO] Success! Archiving result: ${finalUrl}`);
                const videoResp = await fetch(finalUrl);
                const ab = await videoResp.arrayBuffer();
                const videoBuffer = Buffer.from(ab);
                const supabaseUrl = await uploadVideoToSupabase(videoBuffer, userId);
                
                return res.json({ url: supabaseUrl, videoUrl: supabaseUrl });
            } else if (successFlag === 2) {
                throw new Error(`KIE Veo Generation Failed: ${pollData.data?.errorMessage || 'Generation error'}`);
            }
        }
        throw new Error("KIE Veo Render Timeout - Job is still processing.");

    } catch (err) {
        console.error('[KIE-VEO-ERR]', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * Handler for Kling 2.6 (V2 5 Turbo Image To Video Pro)
 */
async function handleKling(req, res) {
    try {
        const { prompt, firstFrame, lastFrame, duration, userId, aspect_ratio } = req.body;
        const apiKey = process.env.KLING_API_KEY;
        if (!apiKey) throw new Error("Kling API Key not configured.");

        console.log(`[KLING] Resolving assets for user ${userId}...`);
        const [imgUrl, tailUrl] = await Promise.all([
            resolveToPublicUrl(firstFrame, userId),
            resolveToPublicUrl(lastFrame, userId)
        ]);
        
        if (!imgUrl) throw new Error("Kling 3.0 requires at least a starting image URL.");

        // Build image_urls array (max 2 for start/end)
        const image_urls = [imgUrl];
        if (tailUrl) image_urls.push(tailUrl);

        // Always use Kling 3.0 per the latest API spec
        const payload = {
            model: "kling-3.0/video",
            input: {
                prompt: prompt,
                image_urls: image_urls,
                sound: req.body.includeAudio || false,
                duration: String(duration || "5"),
                aspect_ratio: aspect_ratio || "16:9",
                mode: "pro", // Default to high resolution for Director Studio
                multi_shots: false,
                multi_prompt: [] // Required by schema even if multi_shots is false
            }
        };

        console.log(`[KLING-3.0] Creating task:`, JSON.stringify(payload, null, 2));
        const createResp = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        const createData = await createResp.json();
        console.log(`[KLING] Create response:`, JSON.stringify(createData, null, 2));
        if (createData.code !== 200) throw new Error(`Kling Task Failed: ${createData.msg}`);

        const taskId = createData.data.taskId;
        console.log(`[KLING] Task Created: ${taskId}. Polling...`);

        let isDone = false;
        let attempts = 0;
        while (!isDone && attempts < 120) {
            await new Promise(r => setTimeout(r, 6000));
            attempts++;

            const pollResp = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            const pollData = await pollResp.json();
            if (pollData.code !== 200) throw new Error(`Kling Polling Failed: ${pollData.msg}`);

            const state = pollData.data.state;
            console.log(`[KLING-POLL] ${state} (${attempts})`);

            if (state === 'success') {
                isDone = true;
                const resultJson = JSON.parse(pollData.data.resultJson);
                const finalUrl = resultJson.resultUrls[0];
                if (!finalUrl) throw new Error("No result URL found.");

                const videoResp = await fetch(finalUrl);
                const ab = await videoResp.arrayBuffer();
                const supabaseUrl = await uploadVideoToSupabase(Buffer.from(ab), userId);
                return res.json({ url: supabaseUrl, videoUrl: supabaseUrl });
            } else if (state === 'fail') {
                throw new Error(`Kling Failed: ${pollData.data.failMsg || 'Engine Error'}`);
            }
        }
        throw new Error("Kling Timeout.");
    } catch (err) {
        console.error('[KLING-ERR]', err);
        res.status(500).json({ error: err.message });
    }
}

// Handler for Google Models (Nano Banana Native Gen & Veo Video)
async function handleGoogle(req, res) {
    try {
        // 1. Initial Data Extraction
        const { 
            model, modelEngine, prompt, aspect_ratio, aspectRatio, 
            bible, duration, resolution, firstFrame, lastFrame, 
            referenceImages = [], ingredients = [], quality, userId,
            identity_images = [], product_image = null, identity_gcs_uris = []
        } = req.body;

        const targetModel = model || modelEngine;
        const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;

        // 2. Define isVeo detection early
        const isVeo = targetModel === 'veo' || targetModel === 'veo-fast' || targetModel?.includes('veo-3.1') || targetModel?.includes('veo3');

        // 3. Universal Aspect Ratio Cleaner
        const rawRatio = aspect_ratio || aspectRatio || "16:9";
        const cleanRatio = String(rawRatio).split(/[\s—–-]/)[0].trim();
        const validRatio = ['16:9', '9:16', '1:1', '4:3', '3:4'].includes(cleanRatio) ? cleanRatio : '16:9';

        // --- VIDEO BRANCH ---
        if (isVeo) {
            console.log(`[VEO-PROD] Starting generation for user: ${userId} via Service Account`);

            const token = await getVertexToken();
            if (!token && !apiKey) throw new Error('Failed to acquire service account token or API key for Veo video generation');

            const modelId = (targetModel === 'veo-fast' || targetModel === 'veo' || targetModel === 'veo3' || targetModel === 'veo3_fast') 
                ? (targetModel.includes('fast') ? 'veo-3.1-fast-generate-preview' : 'veo-3.1-generate-preview')
                : targetModel;

            const resolvedResolution = (() => {
                const r = resolution || '720p';
                if (r === '4K') return '4k';
                return r.toLowerCase(); 
            })();

            // Duration enforcement
            const hasLastFrame = !!lastFrame;
            const hasRefImages = Array.isArray(referenceImages) && referenceImages.length > 0;
            const isHighRes = ['1080p', '4k'].includes(resolvedResolution);
            const requestedDuration = parseInt(duration) || 6;
            const validDuration = requestedDuration;

            // ─── Resolve images to base64 for Service Account REST API ────────────────
            const resolveToBase64 = async (src) => {
                if (!src) return null;
                try {
                    if (src.startsWith('data:')) {
                        return { bytesBase64Encoded: src.split(',')[1], mimeType: src.match(/:(.*?);/)?.[1] || 'image/png' };
                    }
                    if (src.startsWith('http')) {
                        const resp = await fetch(src);
                        const ab = await resp.arrayBuffer();
                        return { bytesBase64Encoded: Buffer.from(ab).toString('base64'), mimeType: resp.headers.get('content-type') || 'image/png' };
                    }
                    return { bytesBase64Encoded: src, mimeType: 'image/png' };
                } catch (e) { return null; }
            };

            const [firstFrameData, lastFrameData] = await Promise.all([
                resolveToBase64(firstFrame),
                resolveToBase64(lastFrame)
            ]);

            const rawRefs = (ingredients.length > 0 ? ingredients : referenceImages);
            const resolvedRefs = await Promise.all(rawRefs.slice(0, 3).map(async (src) => {
                const b64 = await resolveToBase64(src);
                if (!b64) return null;
                return {
                    image: { bytesBase64Encoded: b64.bytesBase64Encoded, mimeType: b64.mimeType },
                    referenceType: "asset"
                };
            }));
            const filteredRefs = resolvedRefs.filter(Boolean);

            // ─── Initiate Long Running Operation via REST ───
            const hasValidRefImages = filteredRefs.length > 0;
            // Proactively try to use Vertex for Veo 3.1 features
            const isVertex = !!token; 
            const endpoint = isVertex
                ? `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${modelId}:predictLongRunning`
                : `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predictLongRunning?key=${apiKey}`;

            const payload = {
                instances: [{
                    prompt: prompt,
                    ...(firstFrameData && { image: firstFrameData }),
                    ...(lastFrameData && { lastFrame: lastFrameData }),
                    // Priority: if an 'image' (firstFrame) is provided, Google forbids sending 'referenceImages' in the same instance.
                    ...((filteredRefs.length > 0 && !firstFrameData) && { referenceImages: filteredRefs })
                }],
                parameters: {
                    aspectRatio: validRatio,
                    durationSeconds: validDuration,
                    resolution: resolvedResolution,
                    sampleCount: 1,
                    ...(isVertex && { generateAudio: req.body.includeAudio || false })
                }
            };

            const headers = { 'Content-Type': 'application/json' };
            if (isVertex) headers['Authorization'] = `Bearer ${token}`;

            console.log(`[VEO-PROD] Requesting via ${isVertex ? 'Service Account' : 'API Key'}: ${modelId} | Duration: ${validDuration}s`);
            const initResp = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            const operation = await initResp.json();

            if (operation.error) {
                console.error("[VEO-PROD] REST Initiation Error:", JSON.stringify(operation.error, null, 2));
                throw new Error(operation.error.message || "Veo Generation Initiation Failed");
            }

            console.log(`[VEO-PROD] Operation Started: ${operation.name}`);

            // ─── Polling Loop (Token-Based) ───
            let isDone = false;
            let attempts = 0;
            const maxAttempts = 100; 
            let operationResult = operation;

            while (!isDone && attempts < maxAttempts) {
                await new Promise(r => setTimeout(r, 6000));
                attempts++;

                const isProjectBased = operationResult.name.startsWith('projects/');
                let pollUrl, pollMethod, pollBody, pollHeaders = {};

                if (isVertex && isProjectBased) {
                    // Vertex uses POST fetchPredictOperation
                    pollUrl = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${modelId}:fetchPredictOperation`;
                    pollMethod = 'POST';
                    pollBody = JSON.stringify({ operationName: operationResult.name });
                    pollHeaders['Authorization'] = `Bearer ${token}`;
                    pollHeaders['Content-Type'] = 'application/json';
                } else {
                    // AI Studio uses GET
                    pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationResult.name}?key=${apiKey}`;
                    pollMethod = 'GET';
                    pollBody = undefined;
                }

                const pollResp = await fetch(pollUrl, { 
                    method: pollMethod, 
                    headers: pollHeaders,
                    body: pollBody
                });

                operationResult = await pollResp.json();


                if (operationResult.error) {
                    console.error("[VEO-PROD] Polling Error:", operationResult.error);
                    throw new Error(operationResult.error.message || "Veo Polling Failed");
                }

                if (operationResult.done) {
                    isDone = true;
                    // Extract video data
                    const videoData = findVideoInResponse(operationResult.response || operationResult);
                    if (!videoData) {
                        fs.writeFileSync(path.join(__dirname, 'last_veo_response.json'), JSON.stringify(operationResult, null, 2));
                        throw new Error("No video returned from engine (Safety or Filtered). Check logs.");
                    }

                    console.log(`[VEO-PROD] Video ready! Downloading via token...`);
                    let videoBuffer;

                    if (videoData.videoBytes || videoData.bytesBase64Encoded) {
                        videoBuffer = Buffer.from(videoData.videoBytes || videoData.bytesBase64Encoded, 'base64');
                    } else if (videoData.uri || videoData.videoUri) {
                        const dlUri = videoData.uri || videoData.videoUri;
                        const dlUrl = isVertex && isProjectBased
                            ? `${dlUri}?alt=media`
                            : `${dlUri}&key=${apiKey}`;

                        const dlHeaders = {};
                        if (isVertex && isProjectBased) {
                            dlHeaders['Authorization'] = `Bearer ${token}`;
                        }

                        const dlResp = await fetch(dlUrl, { headers: dlHeaders });

                        if (!dlResp.ok) throw new Error(`Video download failed: ${dlResp.statusText}`);
                        const ab = await dlResp.arrayBuffer();
                        videoBuffer = Buffer.from(ab);
                    }

                    if (!videoBuffer) throw new Error("Failed to extract video content.");

                    const finalUrl = await uploadVideoToSupabase(videoBuffer, userId);
                    console.log(`[VEO-PROD] ✅ Generation successful: ${finalUrl.substring(0, 50)}...`);
                    return res.json({ url: finalUrl, videoUrl: finalUrl });
                }

                if (attempts % 10 === 0) {
                    console.log(`[VEO-PROD] Polling... (${attempts * 6}s elapsed)`);
                }
            }

            throw new Error("Veo Generation timed out after 10 minutes.");


        } else {
            // --- IMAGE BRANCH (NANO BANANA) ---
            const modelMapping = {
                'nano-banana': 'gemini-2.5-flash-image',
                'nano-banana-2': 'gemini-3.1-flash-image-preview',
                'nano-banana-pro': 'gemini-3-pro-image-preview',
                'nano-banana-pro-preview': 'gemini-3-pro-image-preview',
                'gemini': 'gemini-2.5-flash-image'
            };

            const modelNameRaw = modelMapping[targetModel] || (targetModel.startsWith('gemini-') ? targetModel : 'gemini-2.5-flash-image');
            const modelName = modelNameRaw.startsWith('models/') ? modelNameRaw : `models/${modelNameRaw}`;
            // Resolve Image Size from user input
            let imageSize = "1K";
            if (quality === '4k') imageSize = "4K";
            else if (quality === '2k') imageSize = "2K";
            
            const isPro = modelName.includes('pro') || imageSize === '4K' || imageSize === "2K";

            // Resolve Image Parts
            // ── GCS native fileData parts ──────────
            const gcsContentParts = (identity_gcs_uris || []).map(({ uri }) => (
                uri?.startsWith('gs://') ? { fileData: { mimeType: uri.endsWith('.png') ? 'image/png' : 'image/jpeg', fileUri: uri } } : null
            )).filter(Boolean);

            // ── HTTP/base64 fallback ──────────────────────
            const { images = [], references = [], consistencyRefs = [], image: baseImage, product_image, identity_images = [], referenceImages = [] } = req.body || {};
            const combinedRefs = [...(images || []), ...(references || []), ...(identity_images || []), ...(consistencyRefs || []), ...(referenceImages || []), product_image, baseImage].filter(Boolean);
            const inputImages = Array.from(new Set(combinedRefs)); // De-duplicate

            const httpContentParts = await Promise.all(inputImages.map(async (img) => {
                try {
                    const resolved = await resolveImageForGemini(img);
                    return resolved ? { inlineData: { data: resolved.data, mimeType: resolved.mimeType } } : null;
                } catch (e) { return null; }
            })).then(parts => parts.filter(Boolean));

            const biblePrefix = bible ? `### NEURAL_UNIVERSE_BIBLE_CONTEXT\n${Object.entries(bible.characters || {}).map(([id, char]) => `- ${char.name}: ${char.backstory?.substring(0, 50)}...`).join('\n')}\nINSTRUCTIONS: Maintain consistency.\n\n` : "";

            const contentParts = [];
            
            if (gcsContentParts.length > 0 || httpContentParts.length > 0) {
                 contentParts.push({ text: "### REFERENCE IMAGES PROVIDED BY USER:\nBelow are reference assets loaded by the user (such as character features, clothing styles, or environment/stage details). Integrates these visual concepts faithfully into the layout of the generated output image." });
                 contentParts.push(...gcsContentParts, ...httpContentParts);
                 contentParts.push({ text: "### MAIN SCENE DIRECTION:\n" });
            } else {
                 contentParts.push(...gcsContentParts, ...httpContentParts);
            }
            
            contentParts.push({ text: biblePrefix + prompt.replace(/--ar\s+\d+:\d+/g, '').trim() });

            console.log(`[BACKEND] contentParts total: ${contentParts.length}`);
            contentParts.forEach((p, idx) => {
                const type = p.inlineData ? 'inlineData' : p.fileData ? 'fileData' : 'text';
                if (type === 'inlineData') {
                    console.log(`  - Part [${idx}]: type=${type} (size: ${Math.round(p.inlineData.data.length / 1024)} KB)`);
                } else {
                    console.log(`  - Part [${idx}]: type=${type} (${p.text?.substring(0, 50)}...)`);
                }
            });


            // MANUAL REST API CALL (Bypasses SDK header stripping)
            const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;
            
            const referer = 'http://localhost:5173/';
            const requestBody = {
                contents: [{
                    role: 'user',
                    parts: contentParts
                }],
                generationConfig: {
                    responseModalities: ["IMAGE"],
                    imageConfig: {
                        aspectRatio: validRatio,
                        imageSize: isPro ? imageSize : "1K"
                    }
                }
            };

            console.log(`[BACKEND] Calling Imagen REST API: ${modelName}`);
            
            const urlObj = new URL(apiUrl);
            const postData = JSON.stringify(requestBody);
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'Referer': 'http://localhost:5173/',
                    'X-Goog-Api-Key': apiKey
                }
            };

            const result = await new Promise((resolve, reject) => {
                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        try {
                            const parsed = JSON.parse(data);
                            if (res.statusCode >= 400) {
                                console.error("[IMAGEN-REST-ERR]", data);
                                reject(new Error(parsed.error?.message || `Google API Error: ${res.statusCode}`));
                            } else {
                                resolve(parsed);
                            }
                        } catch (e) {
                            reject(new Error("Failed to parse Google API response"));
                        }
                    });
                });
                req.on('error', (e) => reject(e));
                req.setTimeout(180000, () => {
                    req.destroy();
                    reject(new Error("Imagen API Request Timeout (180s)"));
                });
                req.write(postData);
                req.end();
            });
            
            // SAFE EXTRACTION LOGIC (using result directly)
            const candidates = result.candidates || [];
            const candidate = candidates[0];
            const outputPart = candidate?.content?.parts?.find(p => p.inlineData);

            if (!outputPart) {
                const safetyFeedback = result.promptFeedback;
                console.error("[AI_BLOCK]", safetyFeedback || "Empty Response");
                throw new Error(safetyFeedback ? "Content safety block triggered." : "AI engine returned an empty frame.");
            }

            const finalUrl = await uploadImageToSupabase(
                Buffer.from(outputPart.inlineData.data, 'base64'),
                userId,
                outputPart.inlineData.mimeType
            );
            return res.json({ url: finalUrl });
        }
    } catch (error) {
        console.error('CRITICAL GOOGLE ERROR:', error);
        if (!res.headersSent) {
            const isQuota = error.status === 429 || error.statusCode === 429 || error.message?.includes('429') || error.message?.includes('Quota');
            if (isQuota) {
                return res.status(429).json({
                    error: 'Quota Exceeded',
                    message: 'Google AI Quota or Rate Limit exceeded. Please wait a minute or check your workspace Billing plan.'
                });
            }
            res.status(500).json({
                error: 'AI Engineering Error',
                message: error.message
            });
        }
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
        if (!userId || userId === 'null' || userId === 'undefined' || userId === '') {
            return res.json({ images: [], videos: [], upscaled: [] });
        }
        if (supabase) {
            console.log("[SERVER] Checking Supabase for assets (IPv4)...");
            try {
                const query = `assets?user_id=eq.${userId}&select=*&order=created_at.desc&limit=100`;
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

        if (!userId || userId === 'null' || userId === 'undefined' || userId === '') {
            return res.json({ characters: [] });
        }

        let dbData = [];
        console.log("[SERVER] Fetching characters via REST (IPv4)...");
        try {
            const q = `characters?user_id=eq.${userId}&select=*&order=timestamp.desc&limit=50`;

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

        // Handle URL vs base64
        let buffer;
        if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
            const response = await fetch(imageData);
            if (!response.ok) throw new Error(`Failed to fetch asset URL: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        } else {
            const base64Data = imageData.includes('base64,') ? imageData.split(',')[1] : imageData;
            buffer = Buffer.from(base64Data, 'base64');
        }
        const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2) + ' MB';

        let publicUrl = null;

        // Initialize insertData early to avoid Scope/ReferenceErrors
        const insertData = {
            name: name,
            type: type,
            path: name,
            url: null, // Will be set below
            size: sizeMB,
            created_at: new Date().toISOString()
        };
        if (userId) insertData.user_id = userId;

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

        // Final URL resolution
        insertData.url = publicUrl || `/assets/generations/${name}`;

        // Save metadata to Supabase DB (Maintain consistency)
        if (supabase) {
            const { data: dbData, error: dbError } = await supabase
                .from('assets')
                .insert([insertData])
                .select();

            if (dbError) console.error("Supabase DB Insert Error:", dbError);
            else if (dbData && dbData[0]) insertData.id = dbData[0].id;
        }

        if (!publicUrl) {
            console.warn("[SERVER] WARNING: No cloud storage configured. Returning local fallback URL. Images will break on server scale/restart.");
        }

        res.json({
            success: true,
            id: insertData.id,
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

        const result = await client.models.generateContent({
            model: 'gemini-2.0-flash',
            config: {
                responseMimeType: "application/json"
            },
            contents: [{
                role: 'user',
                parts: [{
                    text: `You are a viral UGC content strategist. Generate a hook script for a ${niche} creator named ${characterName}.

HOOK STYLE: ${hookStyle}
${script ? `USER DIRECTION: ${script}` : ''}

Generate a JSON response:
{
  "hookScript": "The actual 2-3 sentence hook script (punchy, attention-grabbing)",
  "hookType": "PATTERN_INTERRUPT | QUESTION | SHOCKING_STAT | STORY_OPENER",
  "estimatedDuration": <seconds>,
  "captionHook": "A 5-word caption version for overlay"
}

Return ONLY valid JSON.`
                }]
            }]
        });

        const text = result.text?.() ?? result.response?.text?.() ?? '';
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

        const result = await geminiService.generateCharacterImage({
            prompt,
            identity_images: [],
            aspectRatio: ratio || '9:16'
        });

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

        const aiResp = await client.models.generateContent({
            model: 'gemini-2.0-flash',
            config: {
                responseMimeType: "application/json"
            },
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

        const text = aiResp.text?.() ?? aiResp.response?.text?.() ?? '';
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
    let result;
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

        try {
            const result_ai = await client.models.generateContent({
                model: 'gemini-2.0-flash',
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema
                },
                contents: [{ parts: [{ text: systemPrompt }] }]
            });

            const text = result_ai.text?.() ?? result_ai.response?.text?.() ?? '';
            const parsed = JSON.parse(text);
            const shots = parsed.shotList || [];

            result = {
                scenes: shots.map((s, i) => ({
                    index: i,
                    shotNumber: s.shotNumber || (i + 1),
                    timeRange: `${Math.round(i * durationNum / shotCount)}s - ${Math.round((i + 1) * durationNum / shotCount)}s`,
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
                    timeRange: `${Math.round(i * durationNum / shotCount)}s - ${Math.round((i + 1) * durationNum / shotCount)}s`,
                    shotType: ANGLES[i % ANGLES.length],
                    action: `${characterValue || 'the subject'} in scene ${i + 1}`,
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
app.get('/api/proxy/asset', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) return res.status(400).send('URL is required');

        // Pass along range headers to support HTML5 video seeking/streaming
        const options = {};
        if (req.headers.range) {
            options.headers = { 'Range': req.headers.range };
        }

        const response = await fetch(url, options);
        if (!response.ok && response.status !== 206) throw new Error(`Failed to fetch asset: ${response.statusText}`);

        // Forward type and dimensions
        res.set('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
        res.set('Content-Length', response.headers.get('content-length'));
        res.set('Accept-Ranges', 'bytes'); 

        // Support partial content range for video chunks
        if (response.status === 206) {
            res.status(206);
            if (response.headers.get('content-range')) {
                res.set('Content-Range', response.headers.get('content-range'));
            }
        }

        response.body.pipe(res);

        // Handle mid-stream crashes
        response.body.on('error', (err) => {
             console.error('[PROXY-STREAM-ERR]', err.message);
             if (!res.headersSent) {
                 res.status(500).send('Stream crashed');
             } else {
                 res.end();
             }
        });
    } catch (error) {
        console.error('[PROXY-ERR]', error.message);
        res.status(500).send('Proxy failure');
    }
});

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

// --- LANDING ASSETS LIBRARY & DIRECT UPLOADS ---

/**
 * GET /api/admin/landing-assets/library
 * Returns all assets from the inventory table.
 */
app.get('/api/admin/landing-assets/library', async (req, res) => {
    try {
        if (!supabaseAdmin) throw new Error("Supabase Admin not initialized");
        const { data, error } = await supabaseAdmin
            .from('landing_video_assets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (error) {
        console.error('[SERVER] Fetch Library Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/admin/landing-assets/upload
 * Handles direct binary upload to Supabase storage and DB entry.
 */
app.post('/api/admin/landing-assets/upload', async (req, res) => {
    try {
        const { fileName, category, type = 'video', base64 } = req.body;
        if (!base64 || !fileName) throw new Error("Missing file data or name");

        if (!supabaseAdmin) throw new Error("Supabase Admin not initialized");

        // 1. Prepare Buffer
        const buffer = Buffer.from(base64.replace(/^data:.*?;base64,/, ''), 'base64');
        const mimeType = type === 'video' ? 'video/mp4' : 'image/jpeg';
        const bucketPath = `landing/${Date.now()}_${fileName}`;

        // 2. Upload to Storage (use 'assets' bucket as default or create 'landing-assets' if preferred)
        // We'll use 'assets' bucket since it's already used by the app.
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('assets')
            .upload(bucketPath, buffer, { contentType: mimeType, upsert: true });

        if (uploadError) throw uploadError;

        // 3. Get Public URL
        const { data: publicData } = supabaseAdmin.storage
            .from('assets')
            .getPublicUrl(bucketPath);

        const publicUrl = publicData.publicUrl;

        // 4. Insert into Library Table
        const { data: dbData, error: dbError } = await supabaseAdmin
            .from('landing_video_assets')
            .insert([{
                url: publicUrl,
                title: fileName.split('.')[0] || 'Untitled',
                category: category || 'gallery',
                meta: { OriginalName: fileName, Size: buffer.length }
            }])
            .select();

        if (dbError) throw dbError;

        res.json({ success: true, asset: dbData[0] });
    } catch (error) {
        console.error('[SERVER] Upload Asset Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/admin/landing-assets/library/:id
 */
app.delete('/api/admin/landing-assets/library/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!supabaseAdmin) throw new Error("Supabase Admin not initialized");

        // We could delete from storage too, but for safety let's just remove from DB inventory for now
        // to avoid accidental breakage of live landing page if someone deletes a used asset.
        const { error } = await supabaseAdmin
            .from('landing_video_assets')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('[SERVER] Delete Library Asset Error:', error);
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
                const r = await fetch(fullUrl);
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

        const keyframeResult = await withRetry(() => client.models.generateContent({
            model: 'gemini-2.0-flash',
            config: {
                responseModalities: ['image', 'text']
            },
            contents: [{
                role: 'user',
                parts: [
                    { text: keyframePrompt },
                    ...imageParts
                ]
            }]
        }));

        const imgPart = keyframeResult.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        const keyframeUrl = imgPart ? `data:image/png;base64,${imgPart.inlineData.data}` : null;

        if (!keyframeUrl) throw new Error('Keyframe generation failed — Gemini returned no image.');
        console.log(`[UGC - PREVIEW] ✅ Keyframe ready(${Math.round(keyframeUrl.length / 1024)}KB base64)`);


        // ── STEP 2: VEO 3.1 I2V ANIMATION ────────────────────────────
        broadcastProgress(taskId, 2, 3, 'Animating keyframe with Veo 3.1...');
        console.log(`[UGC-PREVIEW] STEP 2 — Sending keyframe to Veo I2V via Service Account`);

        const motionPrompt = [
            scene?.action || 'Smooth, confident movement',
            analysis?.suggestedTone ? `Tone: ${analysis.suggestedTone} ` : '',
            'Cinematic 8K quality. Photorealistic. Professional UGC ad production.'
        ].filter(Boolean).join('. ');

        // Fetch the keyframe and convert to base64 for Veo
        const token = await getVertexToken();
        const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
        if (!token && !apiKey) throw new Error('Failed to acquire service account token or API key for video generation');

        let keyframeBase64 = '';
        let keyframeMime = 'image/png';

        if (keyframeUrl.startsWith('data:')) {
            const match = keyframeUrl.match(/^data:([^;]+);base64,/);
            if (match) keyframeMime = match[1];
            keyframeBase64 = keyframeUrl.split(',')[1];
        } else if (keyframeUrl.startsWith('http')) {
            const imgResp = await fetch(keyframeUrl);
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
        const veoEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${veoModel}:predictLongRunning`;

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

        const veoInitResp = await withRetry(() => fetch(veoEndpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(veoBody)
        }));
        const operation = await veoInitResp.json();

        if (operation.error) {
            console.error('[UGC-PREVIEW] Veo error:', operation.error);
            throw new Error(operation.error.message || 'Veo I2V initiation failed');
        }

        console.log(`[UGC-PREVIEW] Veo operation started: ${operation.name}`);
        broadcastProgress(taskId, 3, 3, 'Rendering video (Service Account)...');

        // Poll until complete
        const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operation.name}`;
        let attempts = 0;

        const maxAttempts = 60;
        while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 6000));
            attempts++;
            const pollResp = await fetch(pollUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const opStatus = await pollResp.json();

            if (opStatus.done) {
                const videoData = findVideoInResponse(opStatus);
                if (!videoData) {
                    console.error('[UGC-PREVIEW] No video data found in response:', JSON.stringify(opStatus, null, 2));
                    throw new Error('Veo rendered the sequence but returned no accessible video samples (Safety filtered or structure mismatch).');
                }

                let finalVideoUrl = null;
                if (videoData.uri) {
                    finalVideoUrl = `${videoData.uri}?alt=media&key=${apiKey}`;
                    if (token && token.startsWith('ya29')) {
                        finalVideoUrl = `${videoData.uri}?alt=media`;
                    }
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

        // We prioritize the REST API predictLongRunning with Service Account Auth
        const token = await getVertexToken();
        const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
        if (!token && !apiKey) throw new Error('Failed to acquire service account token or API key for Veo I2V');

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predictLongRunning`;

        console.log(`[VEO-I2V] Calling REST API via Service Account for project: ${VERTEX_PROJECT_ID}`);
        const restResponse = await fetch(endpoint, {
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
                const pollResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/${operationResult.name}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
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
            const videoResp = await fetch(`${video.uri}?alt=media`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
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
        console.log(`[PROXY] Fetching asset: ${url}${req.headers.range ? ' (Range: ' + req.headers.range + ')' : ''}`);
        
        // Pass through range headers if provided by the browser (crucial for video)
        const proxyHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': url.startsWith('https://rwkefswqopnxbekeqsel') ? 'https://rwkefswqopnxbekeqsel.supabase.co/' : undefined
        };
        if (req.headers.range) {
            proxyHeaders['Range'] = req.headers.range;
        }

        const response = await fetch(url, {
            headers: proxyHeaders,
            follow: 20,
            timeout: 30000
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch asset: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType) res.setHeader('Content-Type', contentType);

        const contentLength = response.headers.get('content-length');
        if (contentLength) res.setHeader('Content-Length', contentLength);

        const acceptRanges = response.headers.get('accept-ranges');
        if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);

        // Handle Range requests for video players
        if (req.headers.range) {
            res.setHeader('Content-Range', response.headers.get('content-range') || '');
            res.status(206);
        }

        // stream response directly
        response.body.pipe(res);
        return;
    } catch (err) {
        console.error(`[PROXY] Asset fetch failed:`, err.message);
        res.status(500).send("Failed to proxy asset: " + err.message);
    }
});

// ── KLING 2.6 / 3.0 ─────────────────────────────
app.post('/api/kling/generate', async (req, res) => {
    try {
        const { prompt, firstFrame, lastFrame, duration, userId, negative_prompt, cfg_scale, model } = req.body;
        const apiKey = process.env.KLING_API_KEY;

        if (!apiKey) throw new Error("Kling API Key not configured. Please add KLING_API_KEY to your environment.");

        console.log(`[KLING-ASYNC] Resolving assets for user ${userId}...`);
        const [imgUrl, tailUrl] = await Promise.all([
            resolveToPublicUrl(firstFrame, userId),
            resolveToPublicUrl(lastFrame, userId)
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

app.get('/api/kling/status/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;
        const { userId } = req.query;
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
            const supabaseUrl = await uploadVideoToSupabase(Buffer.from(ab), userId);
            
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

httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`WebSocket server active on ws://localhost:${port}`);
});
