import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

export default function createRouter(deps) {
    const router = express.Router();
    const {
        consumeCredits,
        requireAuth,
        storageService,
        supabaseAdmin,
        supabase,
        resolveGoogleApiKey
    } = deps;

    // Helper to wrap raw PCM (24kHz, 1-channel, 16-bit) in a playable WAV header
    function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitDepth = 16) {
        const header = Buffer.alloc(44);
        
        // "RIFF" chunk descriptor
        header.write('RIFF', 0);
        header.writeUInt32LE(36 + pcmBuffer.length, 4);
        header.write('WAVE', 8);
        
        // "fmt " sub-chunk
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16); // sub-chunk size (16 for PCM)
        header.writeUInt16LE(1, 20);  // audio format (1 for PCM)
        header.writeUInt16LE(numChannels, 22);
        header.writeUInt32LE(sampleRate, 24);
        header.writeUInt32LE(sampleRate * numChannels * (bitDepth / 8), 28); // byte rate
        header.writeUInt16LE(numChannels * (bitDepth / 8), 32);              // block align
        header.writeUInt16LE(bitDepth, 34);                                  // bits per sample
        
        // "data" sub-chunk
        header.write('data', 36);
        header.writeUInt32LE(pcmBuffer.length, 40);
        
        return Buffer.concat([header, pcmBuffer]);
    }

    // Dynamic voice preview with permanent in-memory and storage caching
    router.get('/preview-voice', async (req, res) => {
        const { voiceName } = req.query;
        if (!voiceName) {
            return res.status(400).json({ error: 'voiceName is required.' });
        }

        try {
            if (!global.voicePreviewCache) {
                global.voicePreviewCache = {};
            }

            if (global.voicePreviewCache[voiceName]) {
                return res.json({ url: global.voicePreviewCache[voiceName] });
            }

            const fileName = `voices/previews/preview-${voiceName.toLowerCase()}.wav`;
            
            let user;
            try {
                user = await requireAuth(req);
            } catch (_) {}
            const targetUserId = user ? user.id : req.query.userId;
            const apiKey = await resolveGoogleApiKey(req, targetUserId);
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${apiKey}`;
            const promptText = `Hi! I am the voice model, ${voiceName}.`;

            const geminiResp = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: promptText }] }],
                    generationConfig: {
                        responseModalities: ['AUDIO'],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: voiceName
                                }
                            }
                        }
                    }
                })
            });

            const result = await geminiResp.json();
            if (result.error) {
                throw new Error(result.error.message || "Google API preview failed");
            }

            const b64 = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
            if (!b64) {
                throw new Error("No inline audio data returned");
            }

            const rawPcmBuffer = Buffer.from(b64, 'base64');
            const wavBuffer = pcmToWav(rawPcmBuffer);

            const publicUrl = await storageService.uploadToGCS(wavBuffer, fileName, 'audio/wav');
            global.voicePreviewCache[voiceName] = publicUrl;

            res.json({ url: publicUrl });
        } catch (err) {
            console.error('[TTS Preview Route Error]:', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/generate-voice', async (req, res) => {
        const requiredCredits = 2; // Flat rate for voice generation
        let targetUserId = null;
        let creditsDeducted = false;

        try {
            let user;
            try {
                user = await requireAuth(req);
            } catch (authErr) {
                if (process.env.NODE_ENV === 'production') {
                    return res.status(401).json({ error: 'Authentication required to generate speech.' });
                }
            }

            const { prompt, voiceName = 'Kore', model = 'gemini-3.1-flash-tts-preview', userId, style, pace, accent, language } = req.body;
            if (!prompt) {
                return res.status(400).json({ error: 'Prompt text is required.' });
            }

            targetUserId = user ? user.id : userId;

            // Estimate credits cost based on prompt length
            const promptChars = prompt.length;
            const estInputTokens = Math.ceil(promptChars / 4);
            const estOutputTokens = Math.ceil(promptChars * 1.67);
            
            let baseInputRate = 1.00;
            let baseOutputRate = 20.00;
            if (model === 'gemini-3-flash-preview') {
                baseInputRate = 0.50;
                baseOutputRate = 3.00;
            } else if (model.includes('pro')) {
                baseInputRate = 5.00;
                baseOutputRate = 80.00;
            }

            const estGoogleCost = (estInputTokens / 1000000) * baseInputRate + (estOutputTokens / 1000000) * baseOutputRate;
            const estOurCostUSD = estGoogleCost * 1.30;
            const estimatedCredits = Math.max(1, Math.ceil(estOurCostUSD * 100));

            // Verify credit balance first
            if (targetUserId) {
                const client = supabaseAdmin || supabase;
                if (client) {
                    const { data: profile } = await client
                        .from('profiles')
                        .select('shorts_balance, brand_voice')
                        .eq('id', targetUserId)
                        .single();
                    const brandVoice = profile?.brand_voice || {};
                    const fractionalShorts = brandVoice.fractional_shorts || 0;
                    const balance = (profile?.shorts_balance ?? 0) + fractionalShorts;
                    if (balance < estimatedCredits) {
                        return res.status(402).json({ error: `Insufficient credits. This synthesis requires ~${estimatedCredits}⚡, but you only have ${balance}⚡.` });
                    }
                }
            }

            const apiKey = await resolveGoogleApiKey(req, targetUserId);
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            // Build final steerable prompt based on selected style, pace, accent, and language
            let finalPrompt = '';
            const directives = [];
            if (style && style !== 'none' && style !== 'Default' && style !== 'None') {
                directives.push(`style: ${style.toLowerCase()}`);
            }
            if (pace && pace !== 'none' && pace !== 'Default' && pace !== 'None') {
                directives.push(`pace: ${pace.toLowerCase()}`);
            }
            if (accent && accent !== 'none' && accent !== 'Default' && accent !== 'None' && accent !== 'Neutral') {
                directives.push(`accent: ${accent.toLowerCase()}`);
            }
            if (language && language !== 'none' && language !== 'Default' && language !== 'None' && language !== 'English') {
                directives.push(`language: ${language.toLowerCase()}`);
            }

            if (directives.length > 0) {
                finalPrompt = `[${directives.join(', ')}] ${prompt}`;
            } else {
                finalPrompt = prompt;
            }

            console.log(`[TTS] Requesting Gemini TTS model ${model} for voice: ${voiceName} with prompt: "${finalPrompt}"...`);
            const geminiResp = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
                    generationConfig: {
                        responseModalities: ['AUDIO'],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: voiceName
                                }
                            }
                        }
                    }
                })
            });

            const result = await geminiResp.json();

            if (result.error) {
                console.error("[TTS Error Body]:", JSON.stringify(result.error, null, 2));
                throw new Error(result.error.message || "Google API returned an error");
            }

            const candidate = result.candidates?.[0];
            if (candidate && candidate.finishReason === 'SAFETY') {
                throw new Error("SAFETY_REFUSAL: The voice prompt was blocked by safety filters.");
            }

            const parts = candidate?.content?.parts;
            const hasTextOnly = parts?.some(p => p.text) && !parts?.some(p => p.inlineData);
            if (hasTextOnly) {
                throw new Error(`The selected model (${model}) returned text instead of audio. Please select a text-to-speech optimized model (e.g., Gemini 3.1 Flash TTS).`);
            }

            const b64 = parts?.find(p => p.inlineData)?.inlineData?.data;
            if (!b64) {
                console.error("[TTS Empty Body]:", JSON.stringify(result, null, 2));
                throw new Error("Google API returned no audio content");
            }

            // Convert base64 PCM back to binary buffer
            const rawPcmBuffer = Buffer.from(b64, 'base64');
            const wavBuffer = pcmToWav(rawPcmBuffer);

            // Upload the WAV file to GCS/R2
            const uuid = uuidv4();
            const fileName = `users/${targetUserId || 'anon'}/generated-voices/${uuid}.wav`;
            const publicUrl = await storageService.uploadToGCS(wavBuffer, fileName, 'audio/wav');

            // --- Token and Pricing Cost Calculation (Base vs 30% margin markup) ---
            let inputRate = 1.00;  // per 1M tokens (USD)
            let outputRate = 20.00; // per 1M tokens (USD)

            if (model === 'gemini-3-flash-preview') {
                inputRate = 0.50;
                outputRate = 3.00;
            } else if (model.includes('pro')) {
                inputRate = 5.00;
                outputRate = 80.00;
            }

            // Estimations for fallbacks
            const promptTokenCount = result.usageMetadata?.promptTokenCount || Math.ceil(finalPrompt.length / 4);
            const durationSec = rawPcmBuffer.length / 48000; // 24kHz 16-bit mono PCM = 48000 bytes/sec
            const candidatesTokenCount = result.usageMetadata?.candidatesTokenCount || Math.ceil(durationSec * 25);
            const totalTokens = promptTokenCount + candidatesTokenCount;

            const googleInputCostUSD = (promptTokenCount / 1000000) * inputRate;
            const googleOutputCostUSD = (candidatesTokenCount / 1000000) * outputRate;
            const totalGoogleCostUSD = googleInputCostUSD + googleOutputCostUSD;

            const ourInputCostUSD = googleInputCostUSD * 1.30;
            const ourOutputCostUSD = googleOutputCostUSD * 1.30;
            const totalOurCostUSD = ourInputCostUSD + ourOutputCostUSD;

            // Write detailed transaction record to user's database in R2
            try {
                const dbPath = `users/${targetUserId || 'anon'}/yourvoice-pricing-history.json`;
                let userHistory = [];
                try {
                    const existingData = await storageService.readFromR2(dbPath);
                    if (existingData) {
                        userHistory = JSON.parse(existingData);
                    }
                } catch (readErr) {
                    console.log(`[TTS DB] Creating new pricing database for user ${targetUserId || 'anon'}`);
                }

                const newRecord = {
                    id: `tts_${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    model,
                    voiceName,
                    prompt: prompt,
                    style: style || 'Default',
                    pace: pace || 'Default',
                    accent: accent || 'Neutral',
                    language: language || 'English',
                    audioUrl: publicUrl,
                    tokens: {
                        input: promptTokenCount,
                        output: candidatesTokenCount,
                        total: totalTokens
                    },
                    pricing: {
                        googleInputCostUSD,
                        googleOutputCostUSD,
                        totalGoogleCostUSD,
                        ourInputCostUSD,
                        ourOutputCostUSD,
                        totalOurCostUSD,
                        marginPct: 30
                    }
                };

                userHistory.unshift(newRecord);
                if (userHistory.length > 100) {
                    userHistory = userHistory.slice(0, 100);
                }

                await storageService.writeToR2(dbPath, JSON.stringify(userHistory, null, 2), 'application/json');
                console.log(`[TTS DB] Successfully updated user billing records in R2: ${dbPath}`);
            } catch (dbErr) {
                console.error('[TTS DB Error]: Failed to save history to R2:', dbErr.message);
            }

            // Deduct credits after successful generation
            if (targetUserId) {
                const actualCredits = Math.max(1, Math.ceil(totalOurCostUSD * 100));
                console.log(`[TTS] Consuming ${actualCredits} credits for user: ${targetUserId}`);
                await consumeCredits(targetUserId, actualCredits);
            }

            res.json({ 
                url: publicUrl, 
                fileName,
                tokens: {
                    input: promptTokenCount,
                    output: candidatesTokenCount,
                    total: totalTokens
                },
                pricing: {
                    googleInputCostUSD,
                    googleOutputCostUSD,
                    totalGoogleCostUSD,
                    ourInputCostUSD,
                    ourOutputCostUSD,
                    totalOurCostUSD,
                    marginPct: 30
                }
            });

        } catch (err) {
            console.error('[TTS Generation Error]:', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // Fetch user pricing history from R2
    router.get('/voice-history', async (req, res) => {
        try {
            let user;
            try {
                user = await requireAuth(req);
            } catch (authErr) {
                if (process.env.NODE_ENV === 'production') {
                    return res.status(401).json({ error: 'Authentication required.' });
                }
            }
            const targetUserId = user ? user.id : (req.query.userId || 'anon');
            const dbPath = `users/${targetUserId}/yourvoice-pricing-history.json`;
            let userHistory = [];
            try {
                const existingData = await storageService.readFromR2(dbPath);
                if (existingData) {
                    userHistory = JSON.parse(existingData);
                }
            } catch (readErr) {
                console.log(`[TTS DB] Pricing history database not found or empty for user ${targetUserId}`);
            }
            res.json({ history: userHistory });
        } catch (err) {
            console.error('[TTS History Route Error]:', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // Delete history item from R2 database
    router.post('/delete-voice-history-item', async (req, res) => {
        try {
            let user;
            try {
                user = await requireAuth(req);
            } catch (authErr) {
                if (process.env.NODE_ENV === 'production') {
                    return res.status(401).json({ error: 'Authentication required.' });
                }
            }
            const { id, userId } = req.body;
            if (!id) {
                return res.status(400).json({ error: 'ID is required.' });
            }
            const targetUserId = user ? user.id : (userId || 'anon');
            const dbPath = `users/${targetUserId}/yourvoice-pricing-history.json`;
            let userHistory = [];
            try {
                const existingData = await storageService.readFromR2(dbPath);
                if (existingData) {
                    userHistory = JSON.parse(existingData);
                }
            } catch (readErr) {
                // Ignore if not found
            }
            userHistory = userHistory.filter(item => item.id !== id);
            await storageService.writeToR2(dbPath, JSON.stringify(userHistory, null, 2), 'application/json');
            res.json({ success: true });
        } catch (err) {
            console.error('[TTS Delete History Route Error]:', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
