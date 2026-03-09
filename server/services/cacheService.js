import { GoogleAICacheManager } from '@google/generative-ai/server';

let cacheManager = null;

const initCacheManager = () => {
    if (!cacheManager) {
        if (!process.env.GOOGLE_API_KEY) {
            console.warn("[Cache Service] No GOOGLE_API_KEY found, context caching will be disabled.");
            return null;
        }
        cacheManager = new GoogleAICacheManager(process.env.GOOGLE_API_KEY);
    }
    return cacheManager;
};

// Map of unique cache hashes to active model caches
const activeCaches = new Map();

/**
 * Attempts to cache a large Neural Universe Bible context.
 * Google Gemini Caching requires strictly > 32,768 tokens (which is roughly ~100,000 characters).
 * If the context is too small, this skips caching and returns null.
 * 
 * @param {string} bibleContext - The massive text blob to cache.
 * @returns {string|null} - The cache name, or null if caching was skipped or failed.
 */
export async function cacheBibleContext(bibleContext) {
    if (!bibleContext || bibleContext.length < 50000) {
        // Skip caching if it's clearly too small to meet the 32k token minimum (~120k chars usually).
        // Returning null tells the orchestrator to fall back to standard non-cached requests.
        return null;
    }

    const manager = initCacheManager();
    if (!manager) return null;

    try {
        console.log(`[Cache Service] Attempting to cache Neural Universe Bible...`);
        const cacheObj = await manager.create({
            model: 'models/gemini-1.5-flash-001',
            displayName: 'neural_universe_bible_cache',
            systemInstruction: 'You are an absolute expert on the provided Universe Bible and must strictly enforce its rules across all generated content and sequences.',
            contents: [
                {
                    role: 'user',
                    parts: [{ text: bibleContext }],
                },
            ],
            // Default TTL is 60 minutes
            ttlSeconds: 60 * 60,
        });

        console.log(`[Cache Service] Successfully Caches Universe Bible! Name: ${cacheObj.name}`);
        return cacheObj.name;
    } catch (err) {
        if (err.message && err.message.includes('400')) {
            console.warn("[Cache Service] Context size too small for Google Caching (>32k tokens required). Falling back to inline prompt.");
        } else {
            console.error("[Cache Service] Error generating Context Cache:", err.message || err);
        }
        return null;
    }
}
