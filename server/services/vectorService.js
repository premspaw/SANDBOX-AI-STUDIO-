import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

const API_KEY = process.env.GOOGLE_API_KEY || process.env.API_KEY;

/**
 * Generate a vector embedding for a piece of text (e.g., character backstory).
 * Uses gemini-embedding-001: the production embedding model available for this project.
 * @param {string} text 
 */
export const getEmbedding = async (text) => {
    try {
        console.log(`[VECTOR] Generating embedding for text: ${text.substring(0, 50)}...`);

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "models/gemini-embedding-001",
                    content: { parts: [{ text }] },
                    taskType: "RETRIEVAL_QUERY"
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
 * Simple Cosine Similarity (for vault discovery demonstration)
 */
export const cosineSimilarity = (vecA, vecB) => {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magA * magB);
};
