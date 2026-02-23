import dotenv from 'dotenv';
dotenv.config();
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import express from 'express';
import cors from 'cors';
import Replicate from 'replicate';
import { google } from 'googleapis';
import fs from 'fs';
import OpenAI, { toFile } from 'openai';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import nodeFetch from 'node-fetch';
import * as geminiService from './geminiService.js';
import * as audioService from './audioService.js';
import * as storageService from './storageService.js';
import * as workspaceService from './workspaceService.js';
import * as visionService from './visionService.js';
import * as vectorService from './vectorService.js';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Polyfill for Node.js 18 (required for OpenAI toFile)
if (!globalThis.File) {
    const { File } = await import('node:buffer');
    globalThis.File = File;
}

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

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

// Initialize Replicate
const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
import https from 'https';
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

// Generate Image (Multi-Model Support)
app.post('/api/generate-image', async (req, res) => {
    try {
        const { model, prompt, aspect_ratio, image } = req.body;

        // Route to appropriate model
        switch (model) {
            case 'openai':
                return await handleOpenAI(req, res);

            case 'replicate':
                return await handleReplicate(req, res);

            case 'gemini': // Compatibility for unrefreshed browsers
            case 'nano-banana':
            case 'nano-banana-pro':
            case 'veo':
                return await handleGoogle(req, res);

            case 'kling':
            case 'runway':
            case 'pika':
                return res.status(501).json({
                    error: 'Coming Soon',
                    message: `${model.toUpperCase()} integration is under development. Please try Nano Banana, OpenAI or Replicate models.`
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

// Handler for OpenAI GPT Image 1.5
async function handleOpenAI(req, res) {
    try {
        const { prompt, aspect_ratio, image, quality = 'low' } = req.body;

        // Map aspect ratio (gpt-image 1.5 supports 1024x1024, 1536x1024, 1024x1536)
        let size = "1024x1024";
        if (aspect_ratio === '16:9' || aspect_ratio === '21:9') size = "1536x1024";
        else if (aspect_ratio === '9:16' || aspect_ratio === '3:4') size = "1024x1536";

        console.log(`Calling OpenAI gpt-image-1.5 (${quality} quality) with prompt:`, prompt);
        if (image) console.log("Using reference image:", image.substring(0, 50) + "...");

        const startTime = Date.now();
        let response;
        if (image) {
            console.log("Using Images Edit API for multimodal generation...");

            // Fetch image and convert to File for OpenAI SDK
            let buffer;

            if (image.startsWith('data:')) {
                // Handle base64 data URLs
                const base64Data = image.split(',')[1];
                buffer = Buffer.from(base64Data, 'base64');
                console.log(`Loaded reference image from data URI (${buffer.length} bytes)`);
            } else if (image.startsWith('/assets/')) {
                // Handle local file paths
                const localPath = path.join(__dirname, 'public', image);
                buffer = fs.readFileSync(localPath);
                console.log(`Loaded reference image from local path: ${localPath} (${buffer.length} bytes)`);
            } else {
                // Handle remote URLs
                const imageResponse = await fetch(image);
                const arrayBuffer = await imageResponse.arrayBuffer();
                buffer = Buffer.from(arrayBuffer);
                console.log(`Loaded reference image from URL (${buffer.length} bytes)`);
            }

            // Format as a File object compatible with OpenAI SDK
            const imageFile = await toFile(buffer, 'reference.png', { type: 'image/png' });

            console.log("Calling OpenAI images.edit...");
            response = await openai.images.edit({
                model: "gpt-image-1.5",
                image: [imageFile],
                prompt: prompt,
                n: 1,
                size: size,
                quality: quality,
                input_fidelity: "high"
            });
        } else {
            console.log("Calling OpenAI images.generate...");
            response = await openai.images.generate({
                model: "gpt-image-1.5",
                prompt: prompt,
                n: 1,
                size: size,
                quality: quality
            });
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`OpenAI API call completed in ${elapsed}s`);

        // GPT Image response handling
        const candidate = response.data?.[0];
        let imageUrl = null;

        if (candidate?.url) {
            imageUrl = candidate.url;
            console.log("Received image URL from OpenAI");
        } else if (candidate?.b64_json) {
            imageUrl = `data:image/png;base64,${candidate.b64_json}`;
            console.log(`Received base64 image (${candidate.b64_json.length} chars)`);
        }

        console.log("Extracted Image URL (first 50 chars):", imageUrl?.substring(0, 50));

        if (!imageUrl) {
            console.error("OpenAI Response Structure:", JSON.stringify(response, null, 2));
            throw new Error("No displayable image data found in OpenAI response");
        }

        console.log("Sending successful response to client");
        res.json({ url: imageUrl });
    } catch (error) {
        console.error('OpenAI Engineering Error:', error);
        const status = error.status || 500;
        const message = error.error?.message || error.message;
        res.status(status).json({ error: message });
    }
}

// Handler for Replicate (existing Flux model)
async function handleReplicate(req, res) {
    try {
        const { prompt, aspect_ratio, image } = req.body;

        const input = {
            prompt: prompt,
            aspect_ratio: aspect_ratio || "16:9",
            output_format: "webp",
            output_quality: 80,
        };

        if (image) {
            input.image = image;
            input.prompt_strength = 0.8;
        }

        const output = await replicate.run(
            "black-forest-labs/flux-1.1-pro",
            { input }
        );

        res.json({ url: output });
    } catch (error) {
        console.error('Replicate Error:', error);
        res.status(500).json({ error: error.message });
    }
}

// Handler for Google Models (Nano Banana Native Gen & Veo Video)
// Handler for Google Models (Nano Banana Native Gen & Veo Video)
async function handleGoogle(req, res) {
    try {
        const { model, prompt, aspect_ratio, bible } = req.body;
        const apiKey = process.env.GOOGLE_API_KEY;

        if (model === 'veo') {
            const { duration, image, references = [] } = req.body;
            const inputImage = image || (references.length > 0 ? references[0] : null);

            const modelName = 'veo-3.1-generate-preview';
            console.log(`Calling Google Veo (${inputImage ? 'I2V' : 'T2V'}) with prompt:`, prompt);

            // Handle image processing for Veo if present
            let instance = { prompt: prompt };
            if (inputImage) {
                let imageData = '';
                let mimeType = 'image/png';
                if (inputImage.startsWith('data:')) {
                    const match = inputImage.match(/^data:([^;]+);base64,/);
                    if (match) mimeType = match[1];
                    imageData = inputImage.split(',')[1];
                } else if (inputImage.startsWith('http') || inputImage.startsWith('//')) {
                    const fullUrl = inputImage.startsWith('//') ? `https:${inputImage}` : inputImage;
                    const imgResp = await fetch(fullUrl);
                    const buffer = await imgResp.arrayBuffer();
                    imageData = Buffer.from(buffer).toString('base64');
                    const contentType = imgResp.headers.get('content-type');
                    if (contentType) mimeType = contentType;
                } else if (inputImage.startsWith('/assets/')) {
                    const localPath = path.join(__dirname, 'public', inputImage);
                    if (fs.existsSync(localPath)) {
                        imageData = fs.readFileSync(localPath).toString('base64');
                    }
                } else {
                    imageData = inputImage;
                }
                instance.image = { bytesBase64Encoded: imageData, mimeType };
            }

            const initialResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predictLongRunning?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances: [instance],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: aspect_ratio || "16:9",
                        durationSeconds: duration || 5
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
            // Image Generation uses the Native generateContent API (Nano Banana)
            const modelMapping = {
                'nano-banana': 'gemini-2.5-flash-image',
                'nano-banana-pro': 'gemini-3-pro-image-preview'
            };

            const modelName = modelMapping[model] || 'gemini-2.5-flash-image';

            const { google_search, quality, identity_images = [], product_image = null } = req.body;
            let resolution = "1K";
            if (model === 'nano-banana-pro') {
                resolution = "2K";
                if (quality === '4k') resolution = "4K";
                else if (quality === '1k') resolution = "1K";
                else if (quality === '2k') resolution = "2K";
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

            const { images = [], references = [] } = req.body;
            const combinedRefs = [...images, ...references, ...identity_images, product_image].filter(Boolean);
            const inputImages = Array.from(new Set(combinedRefs)); // De-duplicate

            const contentParts = await Promise.all(inputImages.map(async (img) => {
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
                        const localPath = path.join(__dirname, 'public', img);
                        if (fs.existsSync(localPath)) {
                            data = fs.readFileSync(localPath).toString('base64');
                        }
                    } else {
                        // Fallback if it's already base64 but misses prefix
                        data = img;
                    }

                    if (!data) return null;

                    return { inlineData: { mimeType, data } };
                } catch (e) {
                    console.error("Failed to process image reference:", e);
                    return null;
                }
            })).then(parts => parts.filter(Boolean));

            const finalPrompt = biblePrefix + cleanPrompt;
            contentParts.push({ text: finalPrompt });

            console.log(`Calling Google ${modelName} (${resolution}, Search: ${!!google_search}, Images: ${contentParts.length - 1}):`, finalPrompt.substring(0, 100));

            const payload = {
                contents: [{ parts: contentParts }],
                generationConfig: {
                    responseModalities: ["IMAGE"], // Force image generation
                    imageConfig: {
                        aspectRatio: aspect_ratio || "16:9",
                        imageSize: resolution
                    }
                }
            };

            if (google_search || model === 'nano-banana-pro') {
                payload.tools = [{ googleSearch: {} }];
            }

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
        let allImages = [];
        if (supabase) {
            console.log("[SERVER] Checking Supabase for assets (IPv4)...");
            try {
                const data = await supabaseRestGet('assets?select=*&order=created_at.desc&limit=100');
                const dbFormatted = data.map(a => ({
                    id: a.id,
                    type: a.type || 'image',
                    url: a.url || (a.path ? `${storageBase}/${a.path}` : ''),
                    name: a.name || (a.type === 'video' ? 'AI Video' : 'AI Asset'),
                    date: a.created_at ? new Date(a.created_at).toISOString().split('T')[0] : 'Today',
                    size: a.size || 'N/A'
                }));
                allImages = [...allImages, ...dbFormatted.filter(a => a.type === 'image')];
                const allVideos = dbFormatted.filter(a => a.type === 'video');
                console.log(`[SERVER] ✅ Found ${dbFormatted.length} assets from Supabase.`);

                const unique = Array.from(new Map(allImages.map(img => [img.url, img])).values());
                return res.json({
                    images: unique.sort((a, b) => b.id.localeCompare(a.id)),
                    videos: allVideos.sort((a, b) => b.id.localeCompare(a.id)),
                    upscaled: []
                });
            } catch (err) {
                console.warn("[SERVER] Supabase Assets Fetch failed:", err.message);
            }
        }

        try {
            const assetsDir = path.join(__dirname, 'public', 'assets', 'generations');
            if (fs.existsSync(assetsDir)) {
                const files = fs.readdirSync(assetsDir);
                const local = files.filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f)).map(f => ({
                    id: `local_${f}`,
                    type: 'image',
                    url: `/assets/generations/${f}`,
                    name: f,
                    date: fs.statSync(path.join(assetsDir, f)).mtime.toISOString().split('T')[0],
                    size: (fs.statSync(path.join(assetsDir, f)).size / (1024 * 1024)).toFixed(1) + ' MB'
                }));
                allImages = [...allImages, ...local];
            }
        } catch (e) { }

        const unique = Array.from(new Map(allImages.map(img => [img.url, img])).values());
        res.json({ images: unique.sort((a, b) => b.id.localeCompare(a.id)), videos: [], upscaled: [] });
    } catch (error) {
        console.error('List Assets Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/list-characters', async (req, res) => {
    try {
        if (!supabase) return res.json({ characters: [] });

        let dbData = [];
        console.log("[SERVER] Fetching characters via REST (IPv4)...");
        try {
            dbData = await supabaseRestGet('characters?select=*&order=timestamp.desc');
            if (!Array.isArray(dbData)) dbData = [];
            console.log(`[SERVER] ✅ Found ${dbData.length} characters.`);
        } catch (err) {
            console.warn("[SERVER] list-characters fetch failed:", err.message);
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
        const { imageData, fileName, type = 'image' } = req.body;
        if (!imageData) throw new Error("No asset data provided");

        const extension = type === 'video' ? 'mp4' : 'png';
        const mimeType = type === 'video' ? 'video/mp4' : 'image/png';
        const name = fileName || `gen_${Date.now()}.${extension}`;

        // Strip data prefix if present
        const base64Data = imageData.includes('base64,') ? imageData.split(',')[1] : imageData;
        const buffer = Buffer.from(base64Data, 'base64');
        const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2) + ' MB';

        let publicUrl = null;

        // Upload to GCS (PHASE 3)
        try {
            const gcsUrl = await storageService.uploadToGCS(buffer, name, mimeType);
            if (gcsUrl) publicUrl = gcsUrl;
            console.log(`[SERVER] Uploaded ${type} to GCS: ${publicUrl}`);
        } catch (gcsErr) {
            console.error("[SERVER] GCS Upload Error:", gcsErr);
        }

        // Save metadata to Supabase DB (Maintain consistency)
        if (supabase) {
            const { error: dbError } = await supabase
                .from('assets')
                .insert([{
                    name: name,
                    type: type,
                    path: name,
                    url: publicUrl || `/assets/generations/${name}`,
                    size: sizeMB,
                    created_at: new Date().toISOString()
                }]);

            if (dbError) console.error("Supabase DB Insert Error:", dbError);
        }

        // Always save locally as backup/cache
        const subDir = type === 'video' ? 'videos' : 'generations';
        const assetsDir = path.join(__dirname, 'public', 'assets', subDir);
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }
        const filePath = path.join(assetsDir, name);
        fs.writeFileSync(filePath, buffer);
        console.log(`Saved local asset: ${name} (${type})`);

        res.json({
            success: true,
            path: publicUrl || `/assets/${subDir}/${name}`,
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

        const [meta, data] = base64.split(',');
        const mimeType = meta.split(':')[1]?.split(';')[0] || 'image/png';
        const extension = mimeType.split('/')[1] || 'png';
        const filePath = `influencers/${characterId}/${slot}_${Date.now()}.${extension}`;

        const buffer = Buffer.from(data, 'base64');

        // Upload to GCS
        const publicUrl = await storageService.uploadToGCS(buffer, filePath, mimeType);
        if (!publicUrl) throw new Error("GCS Upload failed");

        // Also register in the 'assets' table so it shows up in the gallery
        const { error: dbError } = await supabase
            .from('assets')
            .insert([{
                name: `${slot}_${characterId}`,
                type: 'image',
                path: filePath,
                url: publicUrl,
                size: (buffer.length / (1024 * 1024)).toFixed(2) + ' MB'
            }]);

        if (dbError) console.error("[SERVER] Proxy Asset DB Error:", dbError);

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

        // Sanitize metadata to remove large base64 data
        const sanitizedMetadata = { ...character };
        if (sanitizedMetadata.photo && sanitizedMetadata.photo.startsWith('data:')) {
            delete sanitizedMetadata.photo;
        }
        if (sanitizedMetadata.image && sanitizedMetadata.image.startsWith('data:')) {
            delete sanitizedMetadata.image;
        }

        // Generate and Inject Semantic Embedding (PHASE 4)
        try {
            const searchSource = character.backstory || character.bio || character.name;
            if (searchSource) {
                const embedding = await vectorService.getEmbedding(searchSource);
                if (embedding) sanitizedMetadata.embedding = embedding;
            }
        } catch (vecErr) {
            console.error("[SERVER] Vector Embedding Failed during save:", vecErr);
        }

        const { error } = await supabase
            .from('characters')
            .upsert({
                id: character.id,
                name: character.name,
                visual_style: character.visualStyle || character.visual_style || 'Realistic',
                origin: character.origin || 'Unknown',
                image: bestImage,
                identity_kit: kitData,
                timestamp: character.timestamp || new Date().toISOString(),
                metadata: sanitizedMetadata
            });

        if (error) throw error;
        console.log(`[SERVER] Character ${character.name} saved successfully.`);
        res.json({ success: true });
    } catch (error) {
        console.error('Proxy Save Character Error:', error);
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
        const { image, script, bible } = req.body;
        if (!image || !script) throw new Error("Missing image or script");

        console.log(`Generating UGC Video for script: "${script.substring(0, 30)}..."`);
        const videoDataUrl = await geminiService.generateLipSyncVideo(image, script, bible);

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

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `You are a viral UGC content strategist. Generate a hook script for a ${niche} creator named ${characterName}.

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
        });

        const text = response.text;
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

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `You are a UGC caption designer. Break this script into caption segments for a ${style} overlay style.

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
        });

        const text = response.text;
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

// ============================================================
// PHASE 8: UGC Studio Pipeline
// ============================================================

// Auto-Storyboard: Gemini breaks user prompt into 5-6 scenes
app.post('/api/ugc/auto-storyboard', async (req, res) => {
    try {
        const { prompt, characterName, wardrobe, product, duration } = req.body;
        if (!prompt) throw new Error('No prompt provided');

        const sceneCount = Math.max(3, Math.round((duration || 30) / 5));

        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: `You are an expert AI Video Director. Combine the following Identity and Product into a photorealistic, natural language 9:16 vertical video storyboard with exactly ${sceneCount} scenes.

STORY CONCEPT: "${prompt}"
IDENTITY: ${characterName || 'the influencer'}
${wardrobe ? `WARDROBE: ${wardrobe}` : ''}
${product ? `PRODUCT: ${product}` : ''}

CRITICAL INSTRUCTIONS:
1. PROMPT TRANSLATION: Do NOT use UI tags like "SUBJECT:", "PRODUCT:", arrows "→", or pipes "|". Write in fluid, descriptive natural language sentences.
2. INTERACTION: The subject (${characterName}) must be WEARING, HOLDING, or ACTIVELY INTERACTING with the product. 
3. NO MANNEQUINS: If the product description mentions a mannequin or display stand, REMOVE it. The character should be the one wearing it.
4. CONSISTENCY: Ensure the character's facial features and wardrobe stay perfectly consistent across all ${sceneCount} prompts.

Generate JSON:
{
  "scenes": [
    {
      "index": 0,
      "timeRange": "0s-5s",
      "shotType": "CLOSE_UP | MEDIUM | WIDE",
      "action": "Natural language description of the scene action",
      "hasProduct": true,
      "prompt": "Full cinematic, photorealistic image generation prompt. Example: 'A stunning close-up of [Name] wearing the [Product] in a luxury setting, soft golden lighting, 8k resolution, photorealistic.'"
    }
  ]
}

Return ONLY valid JSON.`
        });
        const text = response.text;
        let storyboardData;
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            storyboardData = JSON.parse(jsonMatch[0]);
        } catch {
            storyboardData = {
                scenes: Array.from({ length: sceneCount }, (_, i) => ({
                    index: i,
                    timeRange: `${i * 5}s-${(i + 1) * 5}s`,
                    shotType: i === 0 ? 'CLOSE_UP' : i === sceneCount - 1 ? 'CLOSE_UP' : 'MEDIUM',
                    action: `Scene ${i + 1}`,
                    hasProduct: i === 1 || i === sceneCount - 2,
                    prompt: `${characterName || 'Influencer'} in scene ${i + 1}. ${wardrobe || ''}`
                }))
            };
        }

        broadcastProgress('ugc-storyboard', 1, 1, `Generated ${storyboardData.scenes.length} scenes!`);
        broadcastComplete('ugc-storyboard');
        res.json(storyboardData);
    } catch (error) {
        console.error('Auto-Storyboard Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Product Analysis: Google Vision-style analysis via Gemini
app.post('/api/ugc/analyze-product', async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) throw new Error('No image provided');

        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                        {
                            text: `Analyze this product image. Return JSON:
{
  "labels": ["label1", "label2", "label3", "label4", "label5"],
  "description": "One sentence describing the product, its brand, and key visual features",
  "colors": ["#hex1", "#hex2", "#hex3"]
}

Labels should include: product type, brand name if visible, material, category, any text on the product.
Colors should be the 3 dominant colors as hex codes.
Return ONLY valid JSON.` }
                    ]
                }
            ]
        });

        const text = response.text;
        let productData;
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            productData = JSON.parse(jsonMatch[0]);
        } catch {
            productData = { labels: ['product'], description: 'Product uploaded', colors: ['#ffffff'] };
        }

        res.json(productData);
    } catch (error) {
        console.error('Product Analysis Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Veo Image-to-Video: Animate a keyframe image into a 5s clip
// Consolidated Veo I2V Endpoint moved to UGC section below to avoid duplication.


// ============================================================
// PHASE 5: MusicFX Score Generation
// ============================================================

import * as musicService from './musicService.js';

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
    const payload = JSON.stringify({ type: 'progress', taskId, step, total, message });
    wss.clients.forEach(client => {
        if (client.readyState === 1) client.send(payload);
    });
}

function broadcastComplete(taskId) {
    const payload = JSON.stringify({ type: 'complete', taskId });
    wss.clients.forEach(client => {
        if (client.readyState === 1) client.send(payload);
    });
}

httpServer.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`WebSocket server active on ws://localhost:${port}`);
});
