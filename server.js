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
import multer from 'multer';
import { readFileSync, rmSync } from 'fs';
import { isValidUuid } from './server/utils/validateUuid.js';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const normalizeOrigin = (value) => {
    if (!value) return null;
    const trimmed = value.trim().replace(/\/+$/, '');
    if (!trimmed) return null;
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const APP_ORIGIN = normalizeOrigin(process.env.APP_ORIGIN || process.env.PUBLIC_APP_URL || process.env.RAILWAY_PUBLIC_DOMAIN)
    || (process.env.NODE_ENV === 'production' ? 'https://zerolens.in' : 'http://localhost:5173');

const getAllowedCorsOrigins = () => {
    const configured = (process.env.CORS_ORIGINS || '')
        .split(',')
        .map(normalizeOrigin)
        .filter(Boolean);
    const defaults = [APP_ORIGIN];
    if (process.env.NODE_ENV !== 'production') {
        defaults.push('http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3002', 'http://127.0.0.1:3002');
    }
    return [...new Set([...configured, ...defaults])];
};

// -------------------------------------------------------------
// GLOBAL HEADERS INJECTOR (For Restricted API Keys)
// Ensures all SDK/nodeFetch calls to Google have the required Referer
// MUST be defined BEFORE any SDKs are imported.
// -------------------------------------------------------------
const originalFetch = nodeFetch || globalThis.fetch;
globalThis.fetch = (url, options = {}) => {
    const urlStr = url.toString();
    if (urlStr.includes('googleapis.com')) {
        options.headers = options.headers || {};
        const referer = `${APP_ORIGIN}/`;
        
        // Detect if request already has an Authorization header (Vertex AI / OAuth2)
        let hasAuth = false;
        if (typeof options.headers.has === 'function') {
            hasAuth = options.headers.has('Authorization') || options.headers.has('authorization');
        } else {
            hasAuth = !!(options.headers['Authorization'] || options.headers['authorization']);
        }

        if (typeof options.headers.set === 'function') {
            options.headers.set('Referer', referer);
            if (!hasAuth && process.env.GOOGLE_API_KEY) {
                options.headers.set('X-Goog-Api-Key', process.env.GOOGLE_API_KEY.trim());
            }
        } else {
            options.headers = {
                ...options.headers,
                'Referer': referer
            };
            if (!hasAuth && process.env.GOOGLE_API_KEY) {
                options.headers['X-Goog-Api-Key'] = process.env.GOOGLE_API_KEY.trim();
            }
        }
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
import { MARKETING_BUCKET, MARKETING_FOLDER } from './services/storageService.js';
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
import OpenAI from 'openai';

import { Storage } from '@google-cloud/storage';
import crypto from 'crypto'; // For Razorpay webhook HMAC-SHA256 verification

// ─────────────────────────────────────────────────────────────
// VERTEX AI & GCS AUTH via Service Account
// ─────────────────────────────────────────────────────────────

// Helper to load credentials from Env or File (Root then Nested)
function getCredentials(fileName, envKey) {
    if (process.env[envKey]) {
        try {
            let cleanJson = process.env[envKey];
            if (cleanJson.startsWith("'") && cleanJson.endsWith("'")) cleanJson = cleanJson.slice(1, -1);
            const credentials = JSON.parse(cleanJson);
            if (credentials.private_key) credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
            return credentials;
        } catch (e) {
            console.error(`[AUTH] Failed to parse ${envKey}:`, e.message);
        }
    }

    const paths = [
        path.join(__dirname, fileName),
        path.join(__dirname, 'src', 'components', 'canvas', fileName)
    ];

    for (const p of paths) {
        if (fs.existsSync(p)) {
            console.log(`[AUTH] ✅ Loading credentials from: ${p}`);
            return p;
        }
    }
    return null;
}

const GCS_KEY = getCredentials('new-zerolens-api-073f27e79f0c.json', 'GCS_CREDENTIALS_JSON');
const storage = new Storage({ 
    ...(typeof GCS_KEY === 'string' ? { keyFilename: GCS_KEY } : { credentials: GCS_KEY })
});

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'zerolensbucket_1';

// ✅ Switched to new-zerolens-api (99582442891) — Veo 3.1 confirmed working 2026-05-31
const VERTEX_KEY = getCredentials('new-zerolens-api-073f27e79f0c.json', 'NEW_GOOGLE_APPLICATION_CREDENTIALS_JSON');
const VERTEX_PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'new-zerolens-api';
const VERTEX_LOCATION = process.env.GOOGLE_LOCATION || 'us-central1';

let _vertexAuth = null;
let _vertexTokenCache = { token: null, expiry: 0 };

const getVertexToken = async () => {
    const now = Date.now();
    if (_vertexTokenCache.token && _vertexTokenCache.expiry > now + 60_000) {
        return _vertexTokenCache.token;
    }

    try {
        if (!_vertexAuth) {
            let authOptions = {
                scopes: [
                    'https://www.googleapis.com/auth/cloud-platform',
                    'https://www.googleapis.com/auth/generative-language',
                    'https://www.googleapis.com/auth/generative-language.tuning'
                ]
            };

            if (VERTEX_KEY) {
                if (typeof VERTEX_KEY === 'string') {
                    authOptions.keyFile = VERTEX_KEY;
                } else {
                    authOptions.credentials = VERTEX_KEY;
                }
                _vertexAuth = new GoogleAuth(authOptions);
            } else {
                console.warn(`[VERTEX_AUTH] No valid authentication found! Missing credentials.`);
                return null;
            }
        }

        const client = await _vertexAuth.getClient();
        const tokenResponse = await client.getAccessToken();
        const token = tokenResponse.token || tokenResponse;
        
        _vertexTokenCache = { token, expiry: now + 55 * 60 * 1000 };
        console.log(`[VERTEX_AUTH] ✅ Token refreshed for ${VERTEX_PROJECT_ID} (expires in ~55m)`);
        return token;
    } catch (err) {
        console.error(`[VERTEX_AUTH] ❌ Token refresh failed:`, err.message);
        return null;
    }
};

// Initial Token Check
getVertexToken().catch(() => {});

// ── OpenAI/OpenRouter SDK + Raw Helper ───────────────────────────────────────
const _LLM_API_KEY = () => process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
const OPENAI_API_KEY = () => process.env.OPENAI_API_KEY;
const _IS_OPENROUTER = () => !!process.env.OPENROUTER_API_KEY;
const getOpenAIClient = (forceOfficial = false) => {
    if (!forceOfficial && _IS_OPENROUTER()) {
        return new OpenAI({ apiKey: _LLM_API_KEY(), baseURL: 'https://openrouter.ai/api/v1' });
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured in your .env file. OpenAI image generation requires an official OpenAI API key.');
    }
    return new OpenAI({ apiKey });
};
const openaiChat = async (messages, model = 'gpt-4o', jsonMode = false) => {
    const apiKey = _LLM_API_KEY();
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');
    const isOR = _IS_OPENROUTER();
    const apiUrl = isOR ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
    const actualModel = isOR ? (process.env.OPENROUTER_MODEL || 'nousresearch/hermes-3-llama-3.1-405b:free') : model;
    const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            ...(isOR && { 'HTTP-Referer': 'http://localhost:5173', 'X-Title': 'ZeroLens AI Studio' }),
        },
        body: JSON.stringify({ model: actualModel, messages, ...(jsonMode ? { response_format: { type: 'json_object' } } : {}) })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message || 'LLM chat error');
    return data.choices?.[0]?.message?.content;
};

let _geminiClient = null;
const getGeminiClient = () => {
    if (!_geminiClient) {
        const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
        if (!apiKey) {
            throw new Error('GOOGLE_API_KEY environment variable is not set.');
        }
        _geminiClient = new GoogleGenAI({
            apiKey,
            headers: {
                'Referer': `${APP_ORIGIN}/`,
                'Origin': APP_ORIGIN
            },
            fetchOptions: {
                headers: {
                    'Referer': `${APP_ORIGIN}/`,
                    'Origin': APP_ORIGIN
                }
            },
            requestOptions: {
                headers: {
                    'Referer': `${APP_ORIGIN}/`,
                    'Origin': APP_ORIGIN
                }
            }
        });
    }
    return _geminiClient;
};
const client = new Proxy({}, {
    get: (_, prop) => getGeminiClient()[prop]
});

if (!globalThis.File) {
    const { File } = await import('node:buffer');
    globalThis.File = File;
}

// -------------------------------------------------------------
// REDIS / BULLMQ QUEUE SETUP (Optional - graceful no-op fallback)
// -------------------------------------------------------------
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
let imageQueue = null;
let videoQueue = null;
const inMemoryJobStatus = new Map();

let updateJobStatus = async (jobId, state, data = null, error = null) => {
    const statusData = { state, timestamp: Date.now(), ...data, error };
    inMemoryJobStatus.set(jobId, statusData);
    setTimeout(() => inMemoryJobStatus.delete(jobId), 3600_000);
};

let getJobStatus = async (jobId) => inMemoryJobStatus.get(jobId) || null;

const isRedisAvailable = () => new Promise((resolve) => {
    try {
        const url = new URL(REDIS_URL);
        const host = url.hostname || '127.0.0.1';
        const port = parseInt(url.port) || 6379;
        const s = net.createConnection({ host, port: port });
        s.setTimeout(5000);
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
            let workerError = null;
            const mockRes = { 
                json: (d) => { 
                    if (d.error || d.message) workerError = d.message || d.error;
                    if (d.url) finalUrl = d.url; 
                    return d; 
                }, 
                status: () => mockRes, 
                headersSent: false 
            };
            try {
                await handleGoogle(mockReq, mockRes);
                if (!finalUrl && !workerError) {
                    throw new Error("AI Engine finished without returning a result or an error message.");
                }
                if (workerError) throw new Error(workerError);
                await updateJobStatus(job.id, 'completed', { url: finalUrl });
            } catch (err) {
                console.error(`[WORKER] Image job ${job.id} failed:`, err.message);
                await updateJobStatus(job.id, 'failed', null, err.message);
                throw err;
            }
            return { url: finalUrl };
        }, { connection: redisConn, concurrency: CONCURRENCY });

        new Worker('video-generation', async (job) => {
            const { reqBody } = job.data;
            const { provider = 'veo' } = reqBody;
            console.log(`[WORKER] Starting video job ${job.id} | provider: ${provider}`);
            await updateJobStatus(job.id, 'processing');
            try {
                let videoUrl = null;
                if (provider === 'seedance') {
                    videoUrl = await handleSeedanceJob(reqBody);
                } else if (provider === 'openai') {
                    // OpenAI image generation via queue
                    let finalUrl = null;
                    const mockRes = { json: (d) => { if (d.url) finalUrl = d.url; return d; }, status: () => mockRes, headersSent: false };
                    await handleOpenAI({ body: reqBody }, mockRes);
                    videoUrl = finalUrl;
                } else {
                    // Default: Google Veo 3.1 (full polling loop in worker)
                    videoUrl = await handleVeoJob(reqBody);
                }
                await updateJobStatus(job.id, 'completed', { videoUrl });
                console.log(`[WORKER] ✅ Video job ${job.id} completed`);
                return { videoUrl };
            } catch (err) {
                console.error(`[WORKER] ❌ Video job ${job.id} failed:`, err.message);
                await updateJobStatus(job.id, 'failed', null, err.message);
                throw err;
            }
        }, { connection: redisConn, concurrency: CONCURRENCY });

        console.log('[QUEUE] ✅ Redis connected. BullMQ workers active.');
    } catch (e) {
        console.warn('[QUEUE] Failed to initialize BullMQ:', e.message);
    }
} else {
    console.warn('[QUEUE] ℹ️  Redis not found — running in direct-processing mode.');
}

const app = express();
app.set('trust proxy', 1);

const httpServer = http.createServer(app);
const port = process.env.PORT || 3002;

// Storage Base URL for GCS Assets
const storageBase = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME || 'zerolensbucket_1'}`;

// Middleware
const allowedCorsOrigins = getAllowedCorsOrigins();
app.use(cors({
    origin(origin, callback) {
        if (!origin) return callback(null, true);
        const normalized = normalizeOrigin(origin);
        if (process.env.NODE_ENV !== 'production') {
            const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized);
            if (isLocal) return callback(null, true);
        }
        return callback(null, allowedCorsOrigins.includes(normalized));
    },
    credentials: true
}));
app.use(compression());

// SharedArrayBuffer / FFmpeg Export Headers
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    next();
});

// Memory Guard for 1,000+ Users Scaling
app.use((req, res, next) => {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    if (heapUsedMB > 3500) {
        console.warn(`[MEMORY GUARD] Refusing request. (Heap Used: ${heapUsedMB}MB)`);
        return res.status(503).json({ error: 'Server reaching peak memory limit. Please retry in 10 seconds.' });
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

// Initialize Supabase
const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const supabase = (supabaseUrl && supabaseKey && supabaseUrl.startsWith('https://'))
    ? createClient(supabaseUrl, supabaseKey)
    : null;

const adminUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseAdmin = (adminUrl && adminKey) ? createClient(adminUrl, adminKey) : null;

if (supabase) {
    const isServiceKey = supabaseKey === (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    console.log(`[SERVER] Supabase initialized. Using ${isServiceKey ? 'Service Role' : 'Anon'} key.`);
} else {
    console.warn("[SERVER] Supabase NOT configured. check env variables.");
}

const LOCAL_ASSETS_FILE = path.join(__dirname, 'local_assets.json');

function saveLocalAsset(asset) {
    try {
        let assets = [];
        if (fs.existsSync(LOCAL_ASSETS_FILE)) {
            assets = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf8'));
        }
        assets.unshift({
            id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            ...asset,
            created_at: asset.created_at || new Date().toISOString()
        });
        fs.writeFileSync(LOCAL_ASSETS_FILE, JSON.stringify(assets.slice(0, 500), null, 2), 'utf8');
    } catch (e) {
        console.error('[LOCAL-DB] Failed to save local asset:', e.message);
    }
}

function getLocalAssets(userId) {
    try {
        if (fs.existsSync(LOCAL_ASSETS_FILE)) {
            const assets = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf8'));
            return assets.filter(a => a.user_id === userId);
        }
    } catch (e) {
        console.error('[LOCAL-DB] Failed to get local assets:', e.message);
    }
    return [];
}

async function supabaseRestGet(tablePath, timeoutMs = 15000) {
    const url = `${supabaseUrl}/rest/v1/${tablePath}`;
    const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
    };
    
    try {
        const resp = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    } catch (err) {
        console.error(`[SUPABASE_REST_GET] ${tablePath} failed:`, err.message);
        throw err;
    }
}

// ─────────────────────────────────────────────────────────────
// SECURE CREDITS HELPER (S3 Fix)
// ─────────────────────────────────────────────────────────────
async function requireAuth(req) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
        if (process.env.NODE_ENV !== 'production') {
            console.log('[requireAuth] Dev Mode: Bypassing auth, using mock user.');
            return { id: 'cec79985-ce59-4d23-82a2-3ae6f69994ed', email: 'premspaw@gmail.com', role: 'admin' };
        }
        throw Object.assign(new Error('Missing Authorization header'), { status: 401 });
    }

    const adminClient = supabaseAdmin || supabase;
    if (!adminClient) {
        if (process.env.NODE_ENV !== 'production') {
            return { id: 'cec79985-ce59-4d23-82a2-3ae6f69994ed', email: 'premspaw@gmail.com', role: 'admin' };
        }
        throw Object.assign(new Error('Database not configured'), { status: 503 });
    }

    const { data, error } = await adminClient.auth.getUser(token);
    if (error || !data?.user) {
        if (process.env.NODE_ENV !== 'production') {
            return { id: 'cec79985-ce59-4d23-82a2-3ae6f69994ed', email: 'premspaw@gmail.com', role: 'admin' };
        }
        throw Object.assign(new Error('Invalid session token'), { status: 401 });
    }
    return data.user;
}

async function consumeCredits(userId, cost, reason = 'generation') {
    if (!supabase) {
        if (process.env.NODE_ENV === 'production') {
            const err = new Error('Credit system is unavailable');
            err.status = 503;
            throw err;
        }
        return true;
    }

    if (!userId) {
        if (process.env.NODE_ENV !== 'production') {
            return true; // Dev mode fallback
        }
        const err = new Error('Sign in required');
        err.status = 401;
        throw err;
    }

    const { error } = await supabase.rpc('deduct_credits', { p_user_id: userId, p_cost: cost });
    
    if (error) {
        if (error.message?.includes('Insufficient credits')) {
            const err = new Error('Insufficient credits');
            err.status = 402;
            throw err;
        }
        const err = new Error('Unable to deduct credits');
        err.status = 500;
        throw err;
    }

    // Write audit log to shorts_transactions so client-side refunds work properly
    try {
        await supabase.from('shorts_transactions').insert({
            user_id: userId,
            amount: -cost,
            action_type: reason,
            created_at: new Date().toISOString()
        });
        console.log(`[consumeCredits] ✅ Logged transaction in database for user ${userId}: spent ${cost} credits (reason: ${reason}).`);
    } catch (logErr) {
        console.warn('[consumeCredits] Failed to write audit log:', logErr.message);
    }

    return true;
}

async function claimOrCreateSpend(userId, cost, reason = 'generation') {
    if (!supabase) {
        if (process.env.NODE_ENV === 'production') {
            const err = new Error('Credit system is unavailable');
            err.status = 503;
            throw err;
        }
        return true;
    }

    if (!userId) {
        if (process.env.NODE_ENV !== 'production') {
            return true; // Dev mode fallback
        }
        const err = new Error('Sign in required');
        err.status = 401;
        throw err;
    }

    // 1. Look for a recent unclaimed spend transaction from the client
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
    try {
        const { data: txs, error: fetchErr } = await supabase
            .from('shorts_transactions')
            .select('id')
            .eq('user_id', userId)
            .eq('amount', -cost)
            .eq('action_type', reason)
            .is('reason', null) // null means unclaimed/unused
            .gte('created_at', thirtySecondsAgo)
            .order('created_at', { ascending: true })
            .limit(1);

        if (!fetchErr && txs && txs.length > 0) {
            const txId = txs[0].id;
            // Try to claim it
            const { error: claimErr } = await supabase
                .from('shorts_transactions')
                .update({ reason: 'claimed' })
                .eq('id', txId)
                .is('reason', null);

            if (!claimErr) {
                console.log(`[Credits] ✅ Claimed recent client-side transaction ${txId} for user ${userId} (${reason}). No extra charge.`);
                return true;
            }
        }
    } catch (err) {
        console.warn('[claimOrCreateSpend] Failed to check/claim existing transaction:', err.message);
    }

    // 2. If no valid transaction found, deduct credits now (server-side fallback)
    console.log(`[Credits] No recent transaction found for user ${userId} (${reason}). Charging now...`);
    return await consumeCredits(userId, cost, reason);
}

// ─────────────────────────────────────────────────────────────
// SHARED HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────
function findVideoInResponse(obj) {
    if (!obj || typeof obj !== 'object') return null;
    if (obj.candidates && obj.candidates[0]?.finishReason === 'SAFETY') {
        throw new Error("SAFETY_REFUSAL: The cinematic sequence was blocked by safety filters.");
    }
    const matches = [];
    function search(o, depth = 0, path = '') {
        if (!o || typeof o !== 'object' || depth > 10) return;
        if (o.videoBytes || o.videoUri) matches.push({ score: 100, data: o });
        if (o.video || o.generatedVideo || o.videoFileData) {
            const container = o.video || o.generatedVideo || o.videoFileData;
            if (typeof container === 'object') matches.push({ score: 80, data: container });
        }
        if ((o.uri || o.bytesBase64Encoded) && path.toLowerCase().includes('video')) matches.push({ score: 60, data: o });
        if (o.uri || o.bytesBase64Encoded) matches.push({ score: 20, data: o });

        for (const key in o) {
            const lowerKey = key.toLowerCase();
            if (['metadata', 'safetyratings', 'thumbnail', 'preview', 'image', 'base64_image'].includes(lowerKey)) continue;
            if (Object.prototype.hasOwnProperty.call(o, key)) {
                search(o[key], depth + 1, path + (path ? '.' : '') + key);
            }
        }
    }
    search(obj);
    if (matches.length === 0) return null;
    matches.sort((a, b) => b.score - a.score);
    const best = matches[0].data;
    if (best.videoBytes || best.bytesBase64Encoded || best.videoUri || best.uri) return best;
    return null;
}

async function uploadVideoToSupabase(videoBuffer, userId, aspectRatio = '16:9', folder = 'generated', prompt = '', engine = '', extraMetadata = {}) {
    const name = `veo_${userId || 'anon'}_${Date.now()}.mp4`;
    const filePath = `users/${userId || 'anon'}/${folder}/${name}`;

    try {
        console.log(`[STORAGE-VIDEO] Uploading video ${name} via storageService...`);
        const publicUrl = await storageService.uploadToGCS(videoBuffer, filePath, 'video/mp4', BUCKET_NAME);
        
        // Save to local fallback database
        saveLocalAsset({
            name,
            type: 'video',
            url: publicUrl,
            user_id: userId || 'local_user',
            aspect: aspectRatio,
            metadata: { folder, ...extraMetadata },
            prompt: prompt,
            engine: engine
        });

        const dbClient = supabaseAdmin || supabase;
        if (dbClient && isValidUuid(userId)) {
            try {
                await dbClient.from('assets').insert([{
                    name, type: 'video', url: publicUrl,
                    user_id: userId, created_at: new Date().toISOString(),
                    metadata: { aspect: aspectRatio, folder, ...extraMetadata },
                    prompt: prompt,
                    engine: engine
                }]);
            } catch (e) {
                console.warn('[DB]', e.message);
            }
        }
        return publicUrl;
    } catch (err) {
        console.error('[GCS-VIDEO-ERR]', err.message);
        return `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
    }
}


async function uploadImageToSupabase(imageBuffer, userId, mimeType = 'image/jpeg', targetBucket = MARKETING_BUCKET, folder = `${MARKETING_FOLDER}/generated`, aspectRatio = '1:1', prompt = '', engine = '', extraMetadata = {}) {
    const ext = mimeType.split('/')[1] || 'jpg';
    const name = `gen_${userId || 'anon'}_${Date.now()}.${ext}`;
    let filePath = (userId && userId !== 'anon') ? `users/${userId}/${folder}/${name}` : `${folder}/anon/${name}`;

    try {
        const publicUrl = await storageService.uploadToGCS(imageBuffer, filePath, mimeType, targetBucket);
        
        // Save to local fallback database
        saveLocalAsset({
            name,
            type: 'image',
            url: publicUrl,
            user_id: userId || 'local_user',
            aspect: aspectRatio,
            metadata: { folder, ...extraMetadata },
            prompt: prompt,
            engine: engine
        });

        const dbClient = supabaseAdmin || supabase;
        if (dbClient && isValidUuid(userId)) {
            try {
                await dbClient.from('assets').insert([{
                    name, type: 'image', url: publicUrl,
                    user_id: userId, created_at: new Date().toISOString(),
                    metadata: { aspect: aspectRatio, folder, ...extraMetadata },
                    prompt: prompt,
                    engine: engine
                }]);
            } catch (e) {
                console.warn('[DB]', e.message);
            }
        }
        return publicUrl;
    } catch (err) {
        console.error('[GCS-IMAGE-ERR]', err.message);
        return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    }
}

async function resolveImageForGemini(imageUrl, gcsUri) {
    if (gcsUri && gcsUri.startsWith('gs://')) {
        return { fileData: { fileUri: gcsUri, mimeType: gcsUri.endsWith('.png') ? 'image/png' : 'image/jpeg' } };
    }
    if (imageUrl && imageUrl.startsWith('data:')) {
        try {
            const [meta, b64] = imageUrl.split(',');
            const mimeType = meta.match(/:(.*?);/)?.[1] || 'image/jpeg';
            return { type: 'inline', mimeType, data: b64 };
        } catch (e) {
            console.error('[resolveImageForGemini] Base64 parse failed:', e.message);
            return null;
        }
    }
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const resp = await fetch(imageUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buffer = await resp.buffer();
        const mimeType = resp.headers.get('content-type') || 'image/jpeg';
        return { type: 'inline', mimeType, data: buffer.toString('base64') };
    } catch (err) {
        console.error('[resolveImageForGemini] Fetch failed:', err.message);
        return null;
    }
}

async function resolveFrameUri(frameData) {
    if (!frameData) return null;
    try {
        let buffer;
        let mimeType = 'image/png';
        if (frameData.startsWith('data:')) {
            const [meta, b64] = frameData.split(',');
            mimeType = meta.match(/:(.*?);/)?.[1] || 'image/png';
            buffer = Buffer.from(b64, 'base64');
        } else if (frameData.startsWith('http') || frameData.startsWith('//')) {
            const fullUrl = frameData.startsWith('//') ? `https:${frameData}` : frameData;
            const res = await fetch(fullUrl);
            buffer = Buffer.from(await res.arrayBuffer());
            mimeType = res.headers.get('content-type') || 'image/png';
        } else {
            buffer = Buffer.from(frameData, 'base64');
        }
        return { inlineData: { data: buffer.toString('base64'), mimeType } };
    } catch (e) {
        return null;
    }
}

async function resolveToPublicUrl(imgData, userId) {
    if (!imgData) return null;
    if (imgData.startsWith('http')) return imgData;
    try {
        const buffer = imgData.startsWith('data:') ? Buffer.from(imgData.split(',')[1], 'base64') : Buffer.from(imgData, 'base64');
        const name = `asset_${Date.now()}.jpg`;
        const filePath = `users/${userId || 'anon'}/temp/${name}`;
        return await storageService.uploadToGCS(buffer, filePath, 'image/jpeg');
    } catch (e) {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
// CORE GENERATION HANDLERS
// ─────────────────────────────────────────────────────────────
async function handleKieVeo(req, res) {
    try {
        const { prompt, firstFrame, duration, userId } = req.body;
        const apiKey = process.env.KIE_API_KEY || process.env.KLING_API_KEY;
        const imgUrl = await resolveToPublicUrl(firstFrame, userId);

        const resp = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: "veo-3.1-generate-preview",
                input: { prompt, image_urls: imgUrl ? [imgUrl] : [], duration: String(duration || 6) }
            })
        });
        const d = await resp.json();
        res.json(d);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function handleKling(req, res) {
    try {
        const { prompt, firstFrame, lastFrame, duration, userId } = req.body;
        const apiKey = process.env.KIE_API_KEY || process.env.KLING_API_KEY;
        const [imgUrl, tailUrl] = await Promise.all([
            resolveToPublicUrl(firstFrame, userId),
            resolveToPublicUrl(lastFrame, userId)
        ]);

        const resp = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: "kling-3.0/video",
                input: { prompt, image_urls: imgUrl ? [imgUrl] : (tailUrl ? [tailUrl] : []), duration: String(duration || 5) }
            })
        });
        const d = await resp.json();
        res.json(d);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Resolve any image source (data URI, raw base64, or HTTP URL) to a raw Buffer + mimeType
// WITHOUT going through GCS storage — avoids MIME corruption and unnecessary roundtrips.
async function resolveImageToBuffer(imgSrc) {
    if (!imgSrc) return null;

    // HTTP/HTTPS URL — fetch directly
    if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
        const resp = await fetch(imgSrc);
        if (!resp.ok) throw new Error(`Failed to fetch image from URL: ${resp.statusText}`);
        const mimeType = resp.headers.get('content-type') || 'image/png';
        const buffer = Buffer.from(await resp.arrayBuffer());
        return { buffer, mimeType };
    }

    // Data URI — data:image/png;base64,xxxx
    if (imgSrc.startsWith('data:')) {
        const [header, b64] = imgSrc.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
        return { buffer: Buffer.from(b64, 'base64'), mimeType };
    }

    // Raw base64 — assume PNG
    return { buffer: Buffer.from(imgSrc, 'base64'), mimeType: 'image/png' };
}

async function handleOpenAI(req, res) {
    try {
        const { model, prompt, quality, size, image, secondImage, userId, folder, format, output_format, output_compression, background } = req.body;
        
        // Force the official OpenAI client for image generation/edits since OpenRouter does not support it
        const openai = getOpenAIClient(true);
        const isEdit = !!image;
        const finalFormat = output_format || format || 'png';

        let response;
        if (isEdit) {
            // Resolve image buffer directly — no GCS roundtrip, preserves exact MIME type
            const { toFile } = await import('openai');
            const resolved = await resolveImageToBuffer(image);
            if (!resolved) throw new Error('Failed to resolve reference image to buffer.');
            const { buffer: rawBuf, mimeType: imgMime } = resolved;
            // OpenAI images.edit only accepts PNG — convert MIME header accordingly
            const imageFile = await toFile(rawBuf, 'reference.png', { type: imgMime });

            const imagesList = [imageFile];
            if (secondImage) {
                try {
                    const resolved2 = await resolveImageToBuffer(secondImage);
                    if (resolved2) {
                        const imageFile2 = await toFile(resolved2.buffer, 'second_reference.png', { type: resolved2.mimeType });
                        imagesList.push(imageFile2);
                    }
                } catch (secErr) {
                    console.warn('[handleOpenAI] Warning: Failed to resolve second image:', secErr.message);
                }
            }

            let finalSize = size || '1024x1024';
            if (finalSize === '1792x1024') finalSize = '1536x1024';
            if (finalSize === '1024x1792') finalSize = '1024x1536';

            const isGPTImage = model === 'gpt-image-2' || model === 'gpt-image-1.5' || (model && (model.startsWith('gpt-image') || model.startsWith('gpt-5')));

            response = await openai.images.edit({
                model: model === 'dall-e-2' ? 'dall-e-2' : (model || 'gpt-image-2'),
                image: (isGPTImage && imagesList.length > 1) ? imagesList : imageFile,
                prompt,
                n: 1,
                size: finalSize,
                output_format: finalFormat,
                ...((finalFormat === 'jpeg' || finalFormat === 'webp') && output_compression !== undefined ? { output_compression: Number(output_compression) } : {}),
                ...(background ? { background } : {})
            });
        } else {
            let finalSize = size || '1024x1024';
            if (finalSize === '1792x1024') finalSize = '1536x1024';
            if (finalSize === '1024x1792') finalSize = '1024x1536';

            const finalQuality = quality === 'hd' || quality === 'high' ? 'high' : (quality === 'low' ? 'low' : 'medium');

            response = await openai.images.generate({
                model: (model === 'dall-e-2') ? 'dall-e-2' : 'gpt-image-2',
                prompt,
                quality: finalQuality,
                size: finalSize,
                n: 1,
                output_format: finalFormat,
                ...((finalFormat === 'jpeg' || finalFormat === 'webp') && output_compression !== undefined ? { output_compression: Number(output_compression) } : {}),
                ...(background ? { background } : {})
            });
        }

        let imageBuffer;
        const b64 = response.data?.[0]?.b64_json;
        const tempUrl = response.data?.[0]?.url;

        if (b64) {
            imageBuffer = Buffer.from(b64, 'base64');
        } else if (tempUrl) {
            // Download the image and upload to Supabase to make it permanent
            const imageResp = await fetch(tempUrl);
            if (!imageResp.ok) {
                throw new Error(`Failed to download image from OpenAI: ${imageResp.statusText}`);
            }
            imageBuffer = Buffer.from(await imageResp.arrayBuffer());
        } else {
            throw new Error("OpenAI API returned no image candidates");
        }

        // Extract aspect ratio for metadata
        let aspectRatio = '1:1';
        if (size === '1536x1024' || size === '1792x1024') aspectRatio = '16:9';
        else if (size === '1024x1536' || size === '1024x1792') aspectRatio = '9:16';

        const isGrid = !!req.body.isGrid;
        const extraMetadata = isGrid ? { isGrid: true } : {};
        const url = await uploadImageToSupabase(
            imageBuffer,
            userId,
            'image/png',
            undefined,
            folder,
            aspectRatio,
            prompt || '',
            model || 'DALL-E 3',
            extraMetadata
        );

        res.json({ url });
    } catch (error) {
        console.error('[handleOpenAI Error]:', error.message);
        res.status(500).json({ error: error.message });
    }
}

async function handleGoogle(req, res) {
    try {
        const { model, modelEngine, prompt, negativePrompt, negative_prompt, aspect_ratio, aspectRatio, userId, firstFrame, lastFrame, referenceImages = [], quality, resolution, imageSize, size, folder } = req.body;
        const targetModel = model || modelEngine;
        // Admin trial key takes priority (only injected by admins via Settings > Admin tab)
        const adminTrialKey = req.headers?.['x-admin-trial-key'] || '';
        const apiKey = adminTrialKey || process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
        if (adminTrialKey) {
            console.log(`[handleGoogle] ⚡ ADMIN TRIAL MODE — Using admin-supplied trial API key.`);
        }
        if (targetModel?.includes('kling')) {
            return await handleKling(req, res);
        }
        if (req.body.provider === 'kie') {
            return await handleKieVeo(req, res);
        }

        const isVeo = targetModel === 'veo' || targetModel === 'veo-fast' || targetModel?.includes('veo-3.1') || targetModel?.includes('veo3');

        if (isVeo) {
            const token = await getVertexToken();
            const endpoint = token 
                ? `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${targetModel}:predictLongRunning`
                : `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:predictLongRunning?key=${apiKey}`;

            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const resp = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    instances: [{ prompt, image: await resolveFrameUri(firstFrame) }],
                    parameters: { aspectRatio: aspect_ratio || aspectRatio || '16:9' }
                })
            });
            const op = await resp.json();
            res.json(op);
        } else {
            // Imagen
            let activeModel = model || 'gemini-3.1-flash-image-preview';
            if (activeModel === 'nano-banana-2' || activeModel === 'nano-banana') {
                activeModel = 'gemini-3.1-flash-image-preview';
            } else if (activeModel === 'nano-banana-pro' || activeModel === 'pro') {
                activeModel = 'gemini-3-pro-image-preview';
            }
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;

            const parts = [];
            if (referenceImages && referenceImages.length > 0) {
                for (const imgUrl of referenceImages) {
                    const resolved = await resolveImageForGemini(imgUrl);
                    if (resolved) {
                        if (resolved.fileData) {
                            parts.push(resolved);
                        } else if (resolved.type === 'inline' && resolved.data) {
                            parts.push({
                                inlineData: {
                                    mimeType: resolved.mimeType,
                                    data: resolved.data
                                }
                            });
                        }
                    }
                }
            }
            let compiledPrompt = prompt || '';
            const neg = negativePrompt || negative_prompt;
            if (neg) {
                compiledPrompt += ` [Avoid including: ${neg}]`;
            }
            parts.push({ text: compiledPrompt });

            const activeRatio = aspect_ratio || aspectRatio || '1:1';
            const validRatios = ['1:1', '16:9', '9:16', '3:4', '4:3'];
            const mappedRatio = validRatios.includes(activeRatio) ? activeRatio : '1:1';

            // Map the resolution to standard Google GenAI size (default 1K, upscale 2K)
            let finalImageSize = '1K';
            const sizeVal = (imageSize || resolution || quality || size || '').toUpperCase();
            if (sizeVal.includes('2K') || sizeVal.includes('2048')) {
                finalImageSize = '2K';
            } else if (sizeVal.includes('4K') || sizeVal.includes('4096')) {
                finalImageSize = '4K';
            } else if (sizeVal.includes('512')) {
                finalImageSize = '512';
            } else if (sizeVal.includes('1K') || sizeVal.includes('1024')) {
                finalImageSize = '1K';
            }

            const safetySettings = [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ];

            console.log(`[handleGoogle] Imagen request aspect ratio: ${mappedRatio}, size: ${finalImageSize}`);

            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts }],
                    safetySettings,
                    generationConfig: { 
                        responseModalities: ["IMAGE"],
                        imageConfig: {
                            aspectRatio: mappedRatio,
                            imageSize: finalImageSize
                        }
                    }
                })
            });
            
            const result = await resp.json();
            if (result.error) {
                console.error("[Imagen Error Body]:", JSON.stringify(result.error, null, 2));
                throw new Error(result.error.message || "Google API returned an error");
            }

            if (result.promptFeedback?.blockReason) {
                const reason = result.promptFeedback.blockReason;
                console.error('[handleGoogle] Google API prompt feedback block:', JSON.stringify(result.promptFeedback));
                if (reason === 'OTHER') {
                    throw new Error("Google API blocked the request (blockReason: OTHER). This is typically caused by a sensitive reference photo, copyright/trademark restrictions, or a celebrity likeness filter.");
                } else {
                    throw new Error(`Google API safety block: ${reason}. Please try a different reference image or prompt.`);
                }
            }

            const candidate = result.candidates?.[0];
            if (candidate && candidate.finishReason === 'SAFETY') {
                throw new Error("SAFETY_REFUSAL: The creative prompt was blocked by safety filters.");
            }

            const b64 = candidate?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
            if (!b64) {
                const finishReason = candidate?.finishReason || 'N/A';
                const promptFeedback = result.promptFeedback;
                console.error("[Imagen Empty Body] finishReason:", finishReason, "promptFeedback:", JSON.stringify(promptFeedback), "full:", JSON.stringify(result).slice(0, 2000));
                throw new Error(`Google API returned no image candidates. finishReason: ${finishReason}${promptFeedback?.blockReason ? `, blockReason: ${promptFeedback.blockReason}` : ''}${result.error?.message ? `, apiError: ${result.error.message}` : ''}`);
            }

            const isGrid = !!req.body.isGrid;
            const extraMetadata = isGrid ? { isGrid: true } : {};
            const url = await uploadImageToSupabase(
                Buffer.from(b64, 'base64'), 
                userId, 
                'image/jpeg', 
                undefined, 
                folder, 
                mappedRatio, 
                prompt || '', 
                model || 'Nano Banana 2', 
                extraMetadata
            );
            res.json({ url });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ─────────────────────────────────────────────────────────────
// QUEUE JOB HANDLERS — called by BullMQ video-generation worker
// These run INSIDE the worker (off the HTTP thread) and do the
// full polling loop so the API responds instantly with a jobId.
// ─────────────────────────────────────────────────────────────

async function handleVeoJob(reqBody) {
    const {
        prompt, firstFrame, userId, aspectRatio, aspect_ratio,
        duration = 8, resolution = '1080p', model
    } = reqBody;

    const validDuration = [4, 6, 8].includes(Number(duration)) ? Number(duration) : 8;
    const validAspectRatio = ['16:9', '9:16', '1:1'].includes(aspectRatio || aspect_ratio)
        ? (aspectRatio || aspect_ratio) : '16:9';
    const validResolution = ['720p', '1080p', '4k'].includes(resolution) ? resolution : '1080p';
    const modelName = model || 'veo-3.1-generate-preview';

    const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
    const token = await getVertexToken();
    if (!token && !apiKey) throw new Error('No Veo auth credentials configured (GOOGLE_API_KEY or service account)');

    const instance = { prompt };
    if (firstFrame) {
        const resolved = await resolveFrameUri(firstFrame);
        if (resolved?.inlineData) instance.image = resolved.inlineData;
    }

    const endpoint = apiKey
        ? `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predictLongRunning?key=${apiKey}`
        : `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predictLongRunning`;
    const headers = { 'Content-Type': 'application/json' };
    if (!apiKey && token) headers['Authorization'] = `Bearer ${token}`;

    const initResp = await fetch(endpoint, {
        method: 'POST', headers,
        body: JSON.stringify({
            instances: [instance],
            parameters: { sampleCount: 1, aspectRatio: validAspectRatio, durationSeconds: validDuration, resolution: validResolution }
        })
    });
    let operation = await initResp.json();
    if (operation.error) throw new Error(operation.error.message || 'Veo operation initiation failed');
    console.log(`[VEO-JOB] Operation started: ${operation.name}`);

    // Poll until done (max ~6 minutes)
    let attempts = 0;
    while (!operation.done && attempts < 60) {
        await new Promise(r => setTimeout(r, 6000));
        attempts++;
        try {
            const pollUrl = apiKey
                ? `https://generativelanguage.googleapis.com/v1beta/${operation.name}?key=${apiKey}`
                : `https://generativelanguage.googleapis.com/v1beta/${operation.name}`;
            const pollHeaders = (!apiKey && token) ? { 'Authorization': `Bearer ${token}` } : {};
            const pollResp = await fetch(pollUrl, { headers: pollHeaders });
            if (pollResp.ok) {
                const polled = await pollResp.json();
                if (polled.error) throw new Error(polled.error.message || 'Veo poll error');
                operation = polled;
            }
            if (attempts % 5 === 0) console.log(`[VEO-JOB] Still generating... (${attempts * 6}s elapsed)`);
        } catch (e) {
            if (e.message.includes('poll error')) throw e;
            console.warn(`[VEO-JOB] Poll retry (attempt ${attempts}):`, e.message);
        }
    }

    if (!operation.done) throw new Error('Veo generation timed out after 6 minutes');

    const video = findVideoInResponse(operation);
    if (!video) throw new Error('No video data found in Veo response');

    let videoBuffer;
    if (video.videoBytes || video.bytesBase64Encoded) {
        const b64 = video.videoBytes
            ? Buffer.from(video.videoBytes).toString('base64')
            : video.bytesBase64Encoded;
        videoBuffer = Buffer.from(b64, 'base64');
    } else if (video.uri) {
        const dlUrl = apiKey ? `${video.uri}&key=${apiKey}` : video.uri;
        const dlHeaders = (!apiKey && token) ? { 'Authorization': `Bearer ${token}` } : {};
        const dlResp = await fetch(dlUrl, { headers: dlHeaders });
        if (!dlResp.ok) throw new Error(`Veo video download failed: ${dlResp.statusText}`);
        videoBuffer = Buffer.from(await dlResp.arrayBuffer());
    }

    if (!videoBuffer) throw new Error('Could not extract video buffer from Veo response');
    console.log(`[VEO-JOB] ✅ Downloaded (${Math.round(videoBuffer.length / 1024)}KB), uploading to storage...`);
    return await uploadVideoToSupabase(videoBuffer, userId, validAspectRatio, 'generated', prompt || '', model || 'Veo 3.1');
}

async function handleSeedanceJob(reqBody) {
    const {
        engine = 'seedance-fast', prompt, firstFrame, lastFrame,
        aspectRatio = '16:9', duration = 5, resolution = '1080p',
        generateAudio, userId
    } = reqBody;

    const arkApiKey  = process.env.ARK_API_KEY;
    const kieApiKey  = process.env.KIE_API_KEY;
    const preferKie  = process.env.PREFER_KIE === 'true';

    const resolvedFirst = firstFrame ? await resolveToPublicUrl(firstFrame, userId) : null;
    const resolvedLast  = lastFrame  ? await resolveToPublicUrl(lastFrame,  userId) : null;

    let taskId     = null;
    let taskEngine = null;

    // --- BytePlus Ark path ---
    if (arkApiKey && !preferKie) {
        const targetModel = reqBody.model || (engine === 'seedance-fast'
            ? 'dreamina-seedance-2-0-fast-260128' : 'dreamina-seedance-2-0-260128');
        const content = [];
        if (prompt)        content.push({ type: 'text',      text:      prompt });
        if (resolvedFirst) content.push({ type: 'image_url', image_url: { url: resolvedFirst }, role: 'first_frame' });
        if (resolvedLast)  content.push({ type: 'image_url', image_url: { url: resolvedLast  }, role: 'last_frame'  });

        try {
            const createResp = await fetch('https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${arkApiKey}` },
                body: JSON.stringify({ model: targetModel, content, generate_audio: !!generateAudio, ratio: aspectRatio, duration: Number(duration), watermark: false })
            });
            const d = await createResp.json();
            if (!d.error && d.id) { taskId = d.id; taskEngine = 'ark'; }
            else console.warn('[SEEDANCE-JOB] Ark failed, trying Kie.ai:', d.error?.message || d);
        } catch (e) {
            console.warn('[SEEDANCE-JOB] Ark request error:', e.message);
        }
    }

    // --- Kie.ai path (primary or fallback) ---
    if (!taskId && kieApiKey) {
        const input = {
            prompt,
            aspect_ratio: aspectRatio.replace(':', '/'),
            duration: Number(duration) || 5,
            resolution: resolution === '4k' ? '1080p' : (resolution || '1080p'),
            generate_audio: !!generateAudio,
            web_search: false
        };
        if (resolvedFirst) input.first_frame_url = resolvedFirst;
        if (resolvedLast)  input.last_frame_url  = resolvedLast;

        const model = reqBody.model || 'bytedance/seedance-2-fast';
        const createResp = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kieApiKey}` },
            body: JSON.stringify({ model, input })
        });
        const d = await createResp.json();
        if (d.code === 200 && d.data?.taskId) {
            taskId = d.data.taskId; taskEngine = 'kie';
        } else {
            throw new Error(`Kie.ai task creation failed: ${d.msg || JSON.stringify(d)}`);
        }
    }

    if (!taskId) throw new Error('No Seedance API key configured. Set ARK_API_KEY or KIE_API_KEY in Railway.');
    console.log(`[SEEDANCE-JOB] Task created: ${taskId} via ${taskEngine}`);

    // --- Poll until done (max ~10 minutes) ---
    for (let attempts = 0; attempts < 100; attempts++) {
        await new Promise(r => setTimeout(r, 6000));
        try {
            let finalUrl = null;

            if (taskEngine === 'ark') {
                const pollResp = await fetch(
                    `https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks/${taskId}`,
                    { headers: { 'Authorization': `Bearer ${arkApiKey}` } }
                );
                const d = await pollResp.json();
                if (d.status === 'succeeded') finalUrl = d.content?.video_url;
                if (d.status === 'failed') throw new Error(d.error?.message || 'Ark Seedance generation failed');
            } else {
                const pollResp = await fetch(
                    `https://api.kie.ai/api/v1/jobs/task?taskId=${taskId}`,
                    { headers: { 'Authorization': `Bearer ${kieApiKey}` } }
                );
                const d = await pollResp.json();
                const state = d.data?.status;
                if (state === 'succeed' || state === 'completed')
                    finalUrl = d.data?.videos?.[0]?.url || d.data?.resultUrl;
                if (state === 'failed' || state === 'error')
                    throw new Error(d.data?.failMsg || 'Kie.ai Seedance generation failed');
            }

            if (finalUrl) {
                console.log(`[SEEDANCE-JOB] ✅ Video ready, uploading to storage...`);
                const videoResp = await fetch(finalUrl);
                const ab = await videoResp.arrayBuffer();
                return await uploadVideoToSupabase(Buffer.from(ab), userId, aspectRatio, 'generated', prompt || '', engine || 'Seedance');
            }
            if (attempts % 5 === 0) console.log(`[SEEDANCE-JOB] Processing... (${attempts * 6}s elapsed)`);
        } catch (e) {
            if (e.message.includes('failed')) throw e;
            console.warn(`[SEEDANCE-JOB] Poll error (attempt ${attempts}):`, e.message);
        }
    }
    throw new Error('Seedance generation timed out after 10 minutes');
}

// -------------------------------------------------------------
// WEB/WEBSOCKET SERVER ORCHESTRATION & PROGRESS HANDLERS
// -------------------------------------------------------------
const activeTaskWS = new Map();

function broadcastProgress(taskId, step, total, message) {
    const ws = activeTaskWS.get(taskId);
    if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'progress', taskId, step, total, message }));
    }
}

function broadcastComplete(taskId, resultData = null) {
    const ws = activeTaskWS.get(taskId);
    if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'complete', taskId, data: resultData }));
    }
}

import { WebSocketServer } from 'ws';
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
    console.log('[WS] Client connected');
    ws.send(JSON.stringify({ type: 'connected', message: 'Neural link established' }));

    ws.on('message', (msgStr) => {
        try {
            const data = JSON.parse(msgStr);
            if (data.type === 'subscribe' && data.taskId) {
                activeTaskWS.set(data.taskId, ws);
                console.log(`[WS] Subscribed to task: ${data.taskId}`);
            }
        } catch (_) {}
    });

    ws.on('close', () => {
        for (const [key, value] of activeTaskWS.entries()) {
            if (value === ws) activeTaskWS.delete(key);
        }
    });
});

// ── RAZORPAY AUTOMATED Webhook (S2 signature timingSafeEqual verify) ─────────
// Razorpay webhook must be placed BEFORE express.json() to get the raw body
app.post('/api/webhook/razorpay',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error('[RAZORPAY_WEBHOOK] RAZORPAY_WEBHOOK_SECRET not set!');
            return res.status(500).json({ error: 'Webhook secret not configured on server.' });
        }

        const razorpaySignature = req.headers['x-razorpay-signature'];
        if (!razorpaySignature) {
            return res.status(401).json({ error: 'Missing signature header.' });
        }

        const rawBody = req.body;
        const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

        if (!crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(razorpaySignature, 'hex'))) {
            return res.status(401).json({ error: 'Invalid signature.' });
        }

        const payload = JSON.parse(rawBody.toString());
        if (payload.event === 'payment.captured' || payload.event === 'order.paid') {
            const payment = payload.payload.payment.entity;
            const amount_in_rs = payment.amount / 100;
            const userId = payment.notes?.client_id;
            const transaction_id = payment.id || payment.order_id || 'N/A';

            if (userId) {
                let creditsToAdd = 0;
                let targetTier = null;
                let planName = 'TOP-UP';

                // Exact Match Checks (Plans & Top-Ups)
                if (amount_in_rs === 9999 || amount_in_rs === 7999) { creditsToAdd = 9999; targetTier = 'ENTERPRISE'; planName = 'Enterprise'; }
                else if (amount_in_rs === 4999 || amount_in_rs === 3999) { creditsToAdd = 4999; targetTier = 'DIRECTOR'; planName = 'Director'; }
                else if (amount_in_rs === 1999 || amount_in_rs === 1599) { creditsToAdd = 1999; targetTier = 'INFLUENCER'; planName = 'Influencer'; }
                else if (amount_in_rs === 399 || amount_in_rs === 319) { creditsToAdd = 399; targetTier = 'STARTER'; planName = 'Starter'; }
                
                // Top-Up Packs (No Tier updates)
                else if (amount_in_rs === 900) { creditsToAdd = 1000; targetTier = null; planName = '1000-Credits Pack'; }
                else if (amount_in_rs === 4000) { creditsToAdd = 4500; targetTier = null; planName = '4500-Credits Pack'; }
                else if (amount_in_rs === 9000) { creditsToAdd = 10000; targetTier = null; planName = '10000-Credits Pack'; }
                
                // Fallback Legacy range checks
                else if (amount_in_rs >= 7000) { creditsToAdd = 9999; targetTier = 'ENTERPRISE'; planName = 'Enterprise'; }
                else if (amount_in_rs >= 3500) { creditsToAdd = 4999; targetTier = 'DIRECTOR'; planName = 'Director'; }
                else if (amount_in_rs >= 1500) { creditsToAdd = 1999; targetTier = 'INFLUENCER'; planName = 'Influencer'; }
                else if (amount_in_rs >= 300) { creditsToAdd = 399; targetTier = 'STARTER'; planName = 'Starter'; }

                if (creditsToAdd > 0 && supabaseAdmin) {
                    const { data: existingPayment } = await supabaseAdmin
                        .from('billing_history')
                        .select('id')
                        .eq('transaction_id', transaction_id)
                        .maybeSingle();

                    if (existingPayment) {
                        console.log(`[RAZORPAY_WEBHOOK] Duplicate payment ignored: ${transaction_id}`);
                        return res.status(200).json({ success: true, duplicate: true });
                    }

                    const { data: profile } = await supabaseAdmin.from('profiles').select('shorts_balance').eq('id', userId).single();
                    const new_balance = (profile?.shorts_balance ?? 0) + creditsToAdd;

                    const profileUpdate = { shorts_balance: new_balance, last_payment_at: new Date().toISOString() };
                    if (targetTier) profileUpdate.tier = targetTier;

                    await supabaseAdmin.from('profiles').update(profileUpdate).eq('id', userId);
                    await supabaseAdmin.from('billing_history').insert({ user_id: userId, plan_name: planName, amount: amount_in_rs, status: 'SUCCESS', transaction_id });
                    await supabaseAdmin.from('shorts_transactions').insert({ user_id: userId, amount: creditsToAdd, action_type: 'razorpay_payment', reason: `Purchase: ${planName}` });
                }
            }
        }
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('[RAZORPAY_WEBHOOK_ERROR]:', err);
        res.status(500).json({ error: err.message });
    }
});

// JSON parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 500,
    message: { error: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        const ip = req.ip || req.connection?.remoteAddress || '';
        return ip.includes('127.0.0.1') || ip.includes('::1') || ip.includes('localhost');
    }
});
app.use('/api/', apiLimiter);

// Niche SEO Static Pages Handlers
app.get('/real-estate', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'real-estate', 'index.html')));
app.get('/fashion', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'fashion', 'index.html')));
app.get('/food', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'food', 'index.html')));
app.get('/cinema', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'cinema', 'index.html')));

// Production static serving
app.use(express.static(path.join(__dirname, 'dist')));

// -------------------------------------------------------------
// MODULE MOUNTINGS (Passing Dependencies Object)
// -------------------------------------------------------------
const deps = {
    supabase,
    supabaseAdmin,
    storage,
    BUCKET_NAME,
    MARKETING_BUCKET,
    MARKETING_FOLDER,
    VERTEX_PROJECT_ID,
    VERTEX_LOCATION,
    getVertexToken,
    openaiChat,
    getOpenAIClient,
    getGeminiClient,
    client,
    imageQueue,
    videoQueue,
    updateJobStatus,
    getJobStatus,
    upload,
    requireAuth,
    consumeCredits,
    claimOrCreateSpend,
    handleGoogle,
    handleOpenAI,
    handleKling,
    uploadImageToSupabase,
    uploadVideoToSupabase,
    resolveFrameUri,
    resolveToPublicUrl,
    broadcastProgress,
    broadcastComplete,
    findVideoInResponse,
    geminiService,
    audioService,
    storageService,
    workspaceService,
    visionService,
    vectorService,
    masterExportService,
    supabaseRestGet,
    LOCAL_ASSETS_FILE,
    saveLocalAsset
};

import createCreditsRouter from './server/routes/creditsRoutes.js';
import createImageRouter from './server/routes/imageRoutes.js';
import createVideoRouter from './server/routes/videoRoutes.js';
import createSeedanceRouter from './server/routes/seedanceRoutes.js';
import createUgcRouter from './server/routes/ugcRoutes.js';
import createForgeRouter from './server/routes/forgeRoutes.js';
import createCarouselRouter from './server/routes/carouselRoutes.js';
import createStorageRouter from './server/routes/storageRoutes.js';
import createAdminRouter from './server/routes/adminRoutes.js';
import createAvatarRouter from './server/routes/avatar.js';
import createYourVoiceRouter from './server/routes/yourVoiceRoutes.js';

// ── Credits ──────────────────────────────────────────────────────────────────
app.use('/api', createCreditsRouter(deps));

// ── Images ───────────────────────────────────────────────────────────────────
app.use('/api', createImageRouter(deps));

// ── Video (Veo / Kie) ────────────────────────────────────────────────────────
app.use('/api', createVideoRouter(deps));

// ── Seedance ─────────────────────────────────────────────────────────────────
app.use('/api/seedance', createSeedanceRouter(deps)); // frontend: /api/seedance/*
app.use('/api', createSeedanceRouter(deps));          // legacy: /api/seedance-* or direct

// ── UGC Studio ───────────────────────────────────────────────────────────────
app.use('/api/ugc', createUgcRouter(deps));           // frontend: /api/ugc/*
app.use('/api', createUgcRouter(deps));               // legacy: /api/video, /api/speech, etc.

// ── Forge ────────────────────────────────────────────────────────────────────
app.use('/api/forge', createForgeRouter(deps));       // frontend: /api/forge/*
app.use('/api', createForgeRouter(deps));             // legacy: /api/suggest-dialogue, /api/director/research, etc.

// ── Carousel Studio ──────────────────────────────────────────────────────────
app.use('/api/carousel', createCarouselRouter(deps)); // frontend: /api/carousel/*
app.use('/api', createCarouselRouter(deps));          // legacy direct paths

// ── Storage & Assets ─────────────────────────────────────────────────────────
app.use('/api', createStorageRouter(deps));

// ── Admin ────────────────────────────────────────────────────────────────────
app.use('/api', createAdminRouter(deps));

// ── Avatar Studio ─────────────────────────────────────────────────────────────
app.use('/api/avatar', createAvatarRouter(deps));     // frontend: /api/avatar/*
app.use('/api', createAvatarRouter(deps));            // legacy paths

// ── Your Voice ───────────────────────────────────────────────────────────────
app.use('/api', createYourVoiceRouter(deps));

// Catch-all route to serve the SPA index.html for any client-side routes (avoiding ERR_CANNOT_GET on page reloads)
// Uses native RegExp to bypass path-to-regexp parser and prevent Express 5 compatibility crashes.
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION] Kept alive:', err.message);
});
process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED REJECTION] Kept alive:', reason?.message || reason);
});

// Helper to extract file path/key from storage URL
function getStorageKeyFromUrl(url) {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        let pathname = parsed.pathname;
        if (pathname.startsWith('/')) {
            pathname = pathname.slice(1);
        }
        if (parsed.hostname.includes('storage.googleapis.com')) {
            const parts = pathname.split('/');
            parts.shift(); // Remove bucket name prefix
            return decodeURIComponent(parts.join('/'));
        }
        return decodeURIComponent(pathname);
    } catch (_) {
        return null;
    }
}

// Auto-deletion logic for temporary uploads older than 10 days
async function cleanupOldUploadedReferenceAssets() {
    console.log('[CLEANUP] Starting auto-deletion cleanup of reference_upload assets older than 10 days...');
    const dbClient = supabaseAdmin || supabase;
    if (!dbClient) {
        console.warn('[CLEANUP] Supabase client missing. Skipping cleanup.');
        return;
    }

    try {
        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
        const isoString = tenDaysAgo.toISOString();

        console.log(`[CLEANUP] Querying reference_upload assets created before: ${isoString}`);

        // Fetch old assets
        const { data: oldAssets, error } = await dbClient
            .from('assets')
            .select('*')
            .eq('type', 'reference_upload')
            .lt('created_at', isoString);

        if (error) throw error;
        if (!oldAssets || oldAssets.length === 0) {
            console.log('[CLEANUP] No old reference_upload assets found.');
            return;
        }

        console.log(`[CLEANUP] Found ${oldAssets.length} assets to delete.`);

        for (const asset of oldAssets) {
            try {
                const storageKey = getStorageKeyFromUrl(asset.url);
                if (storageKey) {
                    await storageService.deleteAssetFromStorage(storageKey);
                }
                
                await dbClient.from('assets').delete().eq('id', asset.id);
                console.log(`[CLEANUP] Successfully deleted asset ID: ${asset.id}, URL: ${asset.url}`);
            } catch (err) {
                console.error(`[CLEANUP] Failed to delete asset ID ${asset.id}:`, err.message);
            }
        }
        
        // Clean local database backup
        try {
            if (fs.existsSync(LOCAL_ASSETS_FILE)) {
                let localAssets = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf8'));
                const originalLength = localAssets.length;
                
                localAssets = localAssets.filter(asset => {
                    if (asset.type === 'reference_upload') {
                        const createdAt = asset.created_at ? new Date(asset.created_at) : null;
                        if (createdAt && createdAt < tenDaysAgo) {
                            return false;
                        }
                    }
                    return true;
                });
                
                if (localAssets.length !== originalLength) {
                    fs.writeFileSync(LOCAL_ASSETS_FILE, JSON.stringify(localAssets, null, 2), 'utf8');
                    console.log(`[CLEANUP] Cleaned up ${originalLength - localAssets.length} old reference assets from local_assets.json`);
                }
            }
        } catch (localErr) {
            console.error('[CLEANUP] Failed to clean local database fallback:', localErr.message);
        }

        console.log('[CLEANUP] Auto-deletion cleanup complete.');
    } catch (err) {
        console.error('[CLEANUP] Cleanup job failed:', err.message);
    }
}

httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
    
    // Run cleanup on startup (deferred by 10s to let server stabilize)
    setTimeout(cleanupOldUploadedReferenceAssets, 10000);
    
    // Set daily cleanup interval (24 hours)
    setInterval(cleanupOldUploadedReferenceAssets, 24 * 60 * 60 * 1000);
});
