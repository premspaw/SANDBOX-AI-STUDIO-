import { supabase } from '../lib/supabase';
import { getApiUrl } from '../config/apiConfig';

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
 * Saves character data to Supabase Database directly.
 */
export const saveCharacterToDb = async (character) => {
    try {
        // Normalize fields for the characters table
        const payload = {
            id: character.id,
            name: character.name || character.title || 'UNNAMED_CONSTRUCT',
            user_id: character.userId || character.user_id,
            visual_style: character.visualStyle || character.visual_style || 'Realistic',
            origin: character.origin || 'Unknown',
            image: character.image || character.photo || character.anchor_image,
            anchor_image: character.anchor_image || character.image || character.photo,
            identity_kit: character.identityKit || character.identity_kit || {},
            timestamp: character.timestamp || new Date().toISOString(),
            metadata: character.metadata || character
        };

        // Remove large base64 from metadata if it exists
        if (payload.metadata.image && payload.metadata.image.startsWith('data:')) delete payload.metadata.image;
        if (payload.metadata.photo && payload.metadata.photo.startsWith('data:')) delete payload.metadata.photo;

        const { data, error } = await supabase
            .from('characters')
            .upsert(payload)
            .select();

        if (error) throw error;
        return data?.[0];
    } catch (err) {
        console.error("Direct save character failed:", err);
        throw err;
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
