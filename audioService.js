import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

const API_KEY = process.env.GOOGLE_API_KEY || process.env.API_KEY;

/**
 * Synthesize speech using Google Cloud TTS REST API
 * @param {string} text - The script to synthesize
 * @param {string} voiceId - The voice persona (e.g. 'en-US-Journey-F')
 */
export const synthesizeSpeech = async (text, voiceId = 'en-US-Journey-F') => {
    try {
        console.log(`Synthesizing TTS with voice: ${voiceId}`);
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
            return data.audioContent; // Base64 string
        } else {
            console.error("TTS API Error:", JSON.stringify(data));
            return null;
        }
    } catch (err) {
        console.error("TTS Synthesis Failed:", err);
        return null;
    }
};

/**
 * Transcribe speech using Google Cloud STT REST API
 * @param {string} audioContent - Base64 encoded audio
 */
export const transcribeSpeech = async (audioContent) => {
    try {
        console.log("Transcribing STT...");
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
        const transcription = data.results
            ?.map(result => result.alternatives[0].transcript)
            .join('\n');

        return transcription;
    } catch (err) {
        console.error("STT Transcription Failed:", err);
        return null;
    }
};
