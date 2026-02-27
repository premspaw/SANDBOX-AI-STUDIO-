import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

const API_KEY = process.env.GOOGLE_API_KEY || process.env.API_KEY;
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'ai-cinemastudio-assets-569815811058';

/**
 * Upload a binary asset to Google Cloud Storage
 * @param {Buffer|string} data - Buffer or base64 string
 * @param {string} fileName - Destination filename
 * @param {string} contentType - MIME type
 */
export const uploadToGCS = async (data, fileName, contentType = 'image/png') => {
    try {
        console.log(`[GCS] Uploading ${fileName} to bucket ${BUCKET_NAME}...`);

        // Prepare buffer
        let buffer;
        if (typeof data === 'string' && data.startsWith('data:')) {
            buffer = Buffer.from(data.split(',')[1], 'base64');
        } else if (typeof data === 'string') {
            buffer = Buffer.from(data, 'base64');
        } else {
            buffer = data;
        }

        // Upload using JSON API (Simple Upload)
        const response = await fetch(`https://storage.googleapis.com/upload/storage/v1/b/${BUCKET_NAME}/o?uploadType=media&name=${encodeURIComponent(fileName)}&key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': contentType,
                'Content-Length': buffer.length
            },
            body: buffer
        });

        const result = await response.json();
        if (result.error) {
            console.error("[GCS] Upload Error:", JSON.stringify(result.error));
            throw new Error(result.error.message);
        }

        console.log(`[GCS] Successfully uploaded ${fileName}`);
        return `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;
    } catch (err) {
        console.error("[GCS] Upload Failed:", err);
        return null;
    }
};

/**
 * Get public URL for a GCS asset
 * @param {string} fileName 
 */
export const getPublicUrl = (fileName) => {
    return `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;
};

/**
 * List assets in the GCS bucket
 */
export const listAssetsGCS = async (prefix = '') => {
    try {
        const response = await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET_NAME}/o?prefix=${encodeURIComponent(prefix)}&key=${API_KEY}`);
        const data = await response.json();

        if (data.error) throw new Error(data.error.message);

        return (data.items || []).map(item => ({
            id: item.id,
            name: item.name,
            url: `https://storage.googleapis.com/${BUCKET_NAME}/${item.name}`,
            size: (parseInt(item.size) / (1024 * 1024)).toFixed(2) + ' MB',
            date: item.updated.split('T')[0]
        }));
    } catch (err) {
        console.error("[GCS] List Failed:", err);
        return [];
    }
};
