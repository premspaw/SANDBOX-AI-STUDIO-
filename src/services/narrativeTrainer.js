import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Narrative Trainer Service (Advanced)
 * 
 * Uses Gemini Embeddings (text-embedding-004) to learn user preferences.
 * Includes memory management and dislike-based penalization.
 */

const getAI = () => {
    const storeKey = typeof window !== 'undefined' && window.__VEO_API_KEY__;
    const apiKey = storeKey ||
        (typeof process !== 'undefined' ? process.env.GOOGLE_API_KEY : null) ||
        (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GOOGLE_API_KEY : null) ||
        '';
    return new GoogleGenerativeAI(apiKey);
};

const STORAGE_KEY = 'LUNAR_FLARE_TRAINING_DATA';
const MAX_MEMORY_LIMIT = 50; // Prevents localStorage from crashing

/**
 * Saves a user preference for a specific hook.
 * @param {string} hook - The narrative hook text.
 * @param {boolean} isLiked - Whether the user liked it.
 */
export const savePreference = async (hook, isLiked) => {
    try {
        const ai = getAI();
        const model = ai.getGenerativeModel({ model: "text-embedding-004" });

        const result = await model.embedContent(hook);
        const embedding = result.embedding.values;

        let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

        const existingIdx = data.findIndex(item => item.hook === hook);
        const newItem = { hook, embedding, isLiked, timestamp: Date.now() };

        if (existingIdx >= 0) {
            data[existingIdx] = newItem;
        } else {
            data.push(newItem);
        }

        // --- Memory Management: Rolling Window ---
        data.sort((a, b) => b.timestamp - a.timestamp);
        if (data.length > MAX_MEMORY_LIMIT) {
            data = data.slice(0, MAX_MEMORY_LIMIT);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log(`[NarrativeTrainer] Saved ${isLiked ? 'LIKE' : 'DISLIKE'} for hook.`);
    } catch (error) {
        console.error("[NarrativeTrainer] Error saving preference:", error);
    }
};

/**
 * Re-ranks a list of candidate hooks based on similarity to trained data.
 * Reward similarity to "Liked" hooks, penalize similarity to "Disliked" hooks.
 * @param {string[]} candidateHooks - List of newly generated hooks.
 * @returns {Promise<object[]>} - List of hooks with scores.
 */
export const rankHooks = async (candidateHooks) => {
    try {
        const trainingData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

        if (trainingData.length === 0) {
            return candidateHooks.map(hook => ({ hook, score: 0.5 }));
        }

        const ai = getAI();
        const model = ai.getGenerativeModel({ model: "text-embedding-004" });

        // Embed candidates in parallel
        const results = await Promise.all(candidateHooks.map(h => model.embedContent(h)));
        const candidateEmbeddings = results.map(r => r.embedding.values);

        const scoredHooks = candidateHooks.map((hook, i) => {
            const candidateEmb = candidateEmbeddings[i];
            let totalScore = 0;

            trainingData.forEach(item => {
                const sim = cosineSimilarity(candidateEmb, item.embedding);
                if (item.isLiked) {
                    totalScore += sim; // Reward similarity to likes
                } else {
                    totalScore -= sim; // Penalize similarity to dislikes
                }
            });

            return { hook, score: totalScore };
        });

        return scoredHooks.sort((a, b) => b.score - a.score);
    } catch (error) {
        console.error("[NarrativeTrainer] Error ranking hooks:", error);
        return candidateHooks.map(hook => ({ hook, score: 0 }));
    }
};

/**
 * Returns a string summary for prompt injection.
 */
export const getTrainingContext = () => {
    try {
        const trainingData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
            .filter(item => item.isLiked)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 3);

        if (trainingData.length === 0) return "";

        return `\nUSER PREFERENCE CONTEXT (Mimic this style):\n` +
            trainingData.map(item => `- "${item.hook}"`).join('\n');
    } catch (e) {
        return "";
    }
};

function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return isNaN(similarity) ? 0 : similarity;
}
