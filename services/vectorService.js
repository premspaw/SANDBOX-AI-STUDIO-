import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

const API_KEY = process.env.GOOGLE_API_KEY || process.env.API_KEY;

/**
 * Generate a vector embedding for a piece of text (e.g., character backstory).
 * Upgraded to gemini-embedding-2-preview for multimodal awareness.
 * @param {string} text 
 */
export const getEmbedding = async (text) => {
    try {
        console.log(`[VECTOR] Generating embedding for text: ${text.substring(0, 50)}...`);

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "models/gemini-embedding-2-preview",
                    content: { parts: [{ text }] }
                })
            }
        );

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        console.log(`[VECTOR] Embedding generated successfully (${data.embedding.values.length} dimensions).`);
        return data.embedding.values;
    } catch (err) {
        console.error("[VECTOR] Embedding Failed:", err);
        return null;
    }
};

/**
 * Generate a multimodal vector embedding.
 * Supports text, images (base64 or GCS), and audio (base64 or GCS).
 * @param {Array} parts - Array of objects like { text: '...' } or { inline_data: { mime_type: '...', data: '...' } }
 */
export const getMultimodalEmbedding = async (parts) => {
    try {
        console.log(`[VECTOR] Generating multimodal embedding with ${parts.length} content parts...`);

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "models/gemini-embedding-2-preview",
                    content: { parts }
                })
            }
        );

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        return data.embedding.values;
    } catch (err) {
        console.error("[VECTOR] Multimodal Embedding Failed:", err);
        return null;
    }
};

/**
 * Simple Cosine Similarity (for vault discovery demonstration)
 */
export const cosineSimilarity = (vecA, vecB) => {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magA * magB);
};
