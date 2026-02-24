import { getApiUrl } from './config/apiConfig';

/**
 * Uploads a base64 image or file to Supabase Storage via Proxy.
 */
export const uploadAsset = async (base64, characterId, slot) => {
    try {
        const response = await fetch(getApiUrl('/api/proxy/upload'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64, characterId, slot })
        });
        const data = await response.json();
        return data.publicUrl || null;
    } catch (err) {
        console.error(`Proxy upload failed for ${slot}:`, err);
        return null;
    }
};

/**
 * Saves character data to Supabase Database via Proxy.
 */
export const saveCharacterToDb = async (character) => {
    try {
        const response = await fetch(getApiUrl('/api/proxy/save-character'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ character })
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
    } catch (err) {
        console.error("Proxy save character failed:", err);
    }
};


/**
 * Saves a storyboard item to the database via Proxy.
 */
export const saveStoryboardItem = async (characterId, imageUrl, orderIndex) => {
    try {
        const response = await fetch(getApiUrl('/api/proxy/save-storyboard'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ characterId, imageUrl, orderIndex })
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
    } catch (err) {
        console.error("Proxy save storyboard failed:", err);
    }
};

/**
 * Saves a generated image or video asset to the library.
 */
export const saveGeneratedAsset = async (data, type = 'image', name = null) => {
    try {
        const response = await fetch(getApiUrl('/api/save-asset'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageData: data, // Could be image or video dataUrl
                fileName: name,
                type: type
            })
        });
        const result = await response.json();
        return result.path || null;
    } catch (err) {
        console.error("Save asset failed:", err);
        return null;
    }
};
