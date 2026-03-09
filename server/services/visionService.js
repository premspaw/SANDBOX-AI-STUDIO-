import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

const API_KEY = process.env.GOOGLE_API_KEY || process.env.API_KEY;

/**
 * Extract tags and metadata from a character image using Google Vision API
 * @param {string} imageSource - Base64 string or image URL
 */
export const tagCharacterImage = async (imageSource) => {
    try {
        console.log(`[VISION] Analyzing character image...`);

        let imageJson = {};
        if (imageSource.startsWith('data:')) {
            imageJson = { content: imageSource.split(',')[1] };
        } else {
            imageJson = { source: { imageUri: imageSource } };
        }

        const payload = {
            requests: [
                {
                    image: imageJson,
                    features: [
                        { type: 'LABEL_DETECTION', maxResults: 10 },
                        { type: 'FACE_DETECTION', maxResults: 1 },
                        { type: 'IMAGE_PROPERTIES', maxResults: 1 }
                    ]
                }
            ]
        };

        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        const result = data.responses?.[0] || {};

        if (result.error) {
            console.error("[VISION] API Error:", JSON.stringify(result.error));
            throw new Error(result.error.message);
        }

        // Extract meaningful tags
        const labels = (result.labelAnnotations || []).map(l => l.description);
        const properties = result.imagePropertiesAnnotation || {};
        const face = result.faceAnnotations?.[0] || {};

        const tags = {
            labels: labels,
            dominantColors: properties.dominantColors?.colors?.slice(0, 3).map(c => ({
                color: `rgb(${c.color.red}, ${c.color.green}, ${c.color.blue})`,
                pixelFraction: c.pixelFraction
            })),
            isPerson: labels.some(l => l.toLowerCase() === 'person' || l.toLowerCase() === 'face'),
            emotion: face.joyLikelihood || 'UNKNOWN'
        };

        console.log(`[VISION] Extracted ${labels.length} labels.`);
        return tags;
    } catch (err) {
        console.error("[VISION] Tagging Failed:", err);
        return null;
    }
};
