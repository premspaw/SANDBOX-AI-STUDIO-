import dotenv from 'dotenv';
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
            return { success: true, audioContent: data.audioContent };
        } else {
            console.error("TTS API Error:", JSON.stringify(data));
            return {
                success: false,
                error: data.error?.message || "Check if Cloud Text-to-Speech API is enabled in Google Cloud Console."
            };
        }
    } catch (err) {
        console.error("TTS Synthesis Failed:", err);
        return { success: false, error: err.message };
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
        if (data.error) {
            console.error("STT API Error:", JSON.stringify(data));
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
        console.error("STT Transcription Failed:", err);
        return { success: false, error: err.message };
    }
};
