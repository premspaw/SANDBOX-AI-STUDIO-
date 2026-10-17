// Guard a specific route before provider or upload middleware. Shared /api
// mounts also contain public routes, so this must never be a router-wide gate.
export function validateUtilityInput(body) {
    if (body == null) return; // Multipart fields are parsed by bounded upload middleware.
    if (typeof body !== 'object' || Array.isArray(body)) throw new Error('Expected an object body');
    const arrays = { prompts: 20, history: 100, frames: 60, images: 20, parts: 32 };
    for (const [field, maximum] of Object.entries(arrays)) {
        if (body[field] !== undefined && (!Array.isArray(body[field]) || body[field].length > maximum)) {
            throw new Error(`${field} must be an array with at most ${maximum} items`);
        }
    }
    const textLimits = { prompt: 100000, text: 100000, systemPrompt: 100000, bibleContext: 1000000 };
    for (const [field, maximum] of Object.entries(textLimits)) {
        if (body[field] !== undefined && (typeof body[field] !== 'string' || body[field].length > maximum)) {
            throw new Error(`${field} must be text with at most ${maximum} characters`);
        }
    }
    if (body.prompts?.some(item => !item || typeof item.prompt !== 'string' || item.prompt.length > 20000)) {
        throw new Error('Each image prompt must be text with at most 20000 characters');
    }
    if (body.images?.some(item => typeof item !== 'string')) throw new Error('Images must be strings');
    if (body.parts?.some(item => item == null || (typeof item !== 'string' && (typeof item !== 'object' || Array.isArray(item))))) {
        throw new Error('Invalid content part');
    }
    if (body.generationConfig !== undefined) {
        const config = body.generationConfig;
        if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Invalid generationConfig');
        if (config.maxOutputTokens !== undefined && (!Number.isInteger(config.maxOutputTokens) || config.maxOutputTokens < 1 || config.maxOutputTokens > 32768)) {
            throw new Error('maxOutputTokens must be an integer from 1 to 32768');
        }
        if (config.candidateCount !== undefined && config.candidateCount !== 1) throw new Error('Only one output candidate is supported');
    }
}

export function createUtilityAuth(requireAuth) {
    return async (req, res, next) => {
        let user;
        try {
            user = await requireAuth(req);
            if (!user?.id) return res.status(401).json({ error: 'Authentication required' });
        } catch (error) {
            return res.status(error.status === 503 ? 503 : 401).json({ error: error.status === 503 ? 'Authentication service unavailable' : 'Authentication required' });
        }
        try { validateUtilityInput(req.body); }
        catch (error) { return res.status(400).json({ error: error.message }); }
        req.utilityUser = user;
        if (req.body) {
            req.body.userId = user.id;
            if ('user_id' in req.body) req.body.user_id = user.id;
        }
        next();
    };
}
