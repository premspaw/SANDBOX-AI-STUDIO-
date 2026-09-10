import dotenv from 'dotenv';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getServiceAccountKey() {
    const keyPaths = [
        path.join(__dirname, '..', 'project-c0b5ea74-5ba2-4e68-8ab.json'),
        path.join(__dirname, '..', 'freeeapi-499012-fd14302639c7.json'),
        path.join(process.cwd(), 'project-c0b5ea74-5ba2-4e68-8ab.json')
    ];
    for (const p of keyPaths) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

let ttsClient = null;
try {
    const keyFile = getServiceAccountKey();
    ttsClient = new TextToSpeechClient(keyFile ? { keyFilename: keyFile } : {});
} catch (e) {
    console.warn('[AudioService] TextToSpeechClient init warning:', e.message);
}

const API_KEY = process.env.GOOGLE_API_KEY || process.env.API_KEY;

/**
 * Synthesize speech using Google Cloud TTS SDK or REST fallback
 * @param {string} text - The script to synthesize
 * @param {string} voiceId - The voice persona (e.g. 'en-US-Journey-F' or 'en-US-Neural2-F')
 */
export const synthesizeSpeech = async (text, voiceId = 'en-US-Journey-F') => {
    try {
        console.log(`[AudioService] Synthesizing TTS with voice: ${voiceId}`);

        // 1. Primary: Google Cloud Text-to-Speech SDK
        if (ttsClient) {
            try {
                const [response] = await ttsClient.synthesizeSpeech({
                    input: { text },
                    voice: {
                        languageCode: voiceId.split('-').slice(0, 2).join('-'),
                        name: voiceId,
                    },
                    audioConfig: {
                        audioEncoding: 'MP3',
                    },
                });

                if (response?.audioContent) {
                    const base64Audio = Buffer.from(response.audioContent).toString('base64');
                    return { success: true, audioContent: base64Audio };
                }
            } catch (sdkErr) {
                console.warn('[AudioService] SDK synthesis fallback:', sdkErr.message);
            }
        }

        // 2. Fallback: REST API
        const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input: { text },
                voice: {
                    languageCode: voiceId.split('-').slice(0, 2).join('-'),
                    name: voiceId,
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                },
            })
        });

        const data = await response.json();
        if (data.audioContent) {
            return { success: true, audioContent: data.audioContent };
        } else {
            console.error("[AudioService] TTS REST API Error:", JSON.stringify(data));
            return {
                success: false,
                error: data.error?.message || "Check if Cloud Text-to-Speech API is enabled in Google Cloud Console."
            };
        }
    } catch (err) {
        console.error("[AudioService] TTS Synthesis Failed:", err);
        return { success: false, error: err.message };
    }
};

/**
 * Transcribe speech using Google Cloud STT REST API
 * @param {string} audioContent - Base64 encoded audio
 */
export const transcribeSpeech = async (audioContent) => {
    try {
        console.log("[AudioService] Transcribing STT...");
        const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                config: {
                    encoding: 'WEBM_OPUS',
                    sampleRateHertz: 48000,
                    languageCode: 'en-US',
                },
                audio: {
                    content: audioContent,
                },
            })
        });

        const data = await response.json();
        if (data.error) {
            console.error("[AudioService] STT API Error:", JSON.stringify(data));
            return {
                success: false,
                error: data.error.message || "Check if Cloud Speech-to-Text API is enabled."
            };
        }

        const transcription = data.results
            ?.map(result => result.alternatives[0].transcript)
            .join('\n');

        return { success: true, transcription };
    } catch (err) {
        console.error("[AudioService] STT Transcription Failed:", err);
        return { success: false, error: err.message };
    }
};
