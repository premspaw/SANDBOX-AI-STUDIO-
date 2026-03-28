import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Storage } from '@google-cloud/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'zerolensbucket_1';

let storageOptions = {};
try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        // Handle properly if wrapped in quotes
        let cleanJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
        if (cleanJson.startsWith("'") && cleanJson.endsWith("'")) {
            cleanJson = cleanJson.slice(1, -1);
        }
        const credentials = JSON.parse(cleanJson);
        if (credentials.private_key) {
            credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
        }
        storageOptions.credentials = credentials;
    }
} catch (e) {
    console.error('[GCS] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', e.message);
}

const storage = new Storage(storageOptions);
const bucket = storage.bucket(BUCKET_NAME);

const toPublicUrl = (fileName) => 
    `https://storage.googleapis.com/${BUCKET_NAME}/${fileName.split('/').map(encodeURIComponent).join('/')}`;

/**
 * Upload a binary asset to Google Cloud Storage
 * @param {Buffer|string} data - Buffer or base64 string
 * @param {string} fileName - Destination filename
 * @param {string} contentType - MIME type
 */
export const uploadToGCS = async (data, fileName, contentType = 'image/png') => {
    try {
        console.log(`[GCS] Uploading ${fileName} to bucket ${BUCKET_NAME}...`);

        let buffer;
        if (typeof data === 'string' && data.startsWith('data:')) {
            buffer = Buffer.from(data.split(',')[1], 'base64');
        } else if (typeof data === 'string') {
            buffer = Buffer.from(data, 'base64');
        } else {
            buffer = data;
        }

        const file = bucket.file(fileName);
        await file.save(buffer, {
            contentType: contentType,
            resumable: false,
            metadata: {
                cacheControl: 'public, max-age=31536000'
            }
        });

        const url = toPublicUrl(fileName);
        console.log(`[GCS] ✅ Uploaded: ${url}`);
        return url;
    } catch (err) {
        console.error("[GCS] Upload Failed:", err);
        throw err;
    }
};

/**
 * Get public URL for a GCS asset
 * @param {string} fileName 
 */
export const getPublicUrl = (fileName) => {
    return toPublicUrl(fileName);
};

/**
 * List assets in the GCS bucket
 */
export const listAssetsGCS = async (prefix = '') => {
    try {
        const [files] = await bucket.getFiles({ prefix });
        return files.map(file => ({
            id: file.id,
            name: file.name,
            url: toPublicUrl(file.name),
            size: (parseInt(file.metadata.size || 0) / (1024 * 1024)).toFixed(2) + ' MB',
            date: file.metadata.updated?.split('T')[0]
        }));
    } catch (err) {
        console.error("[GCS] List Failed:", err);
        return [];
    }
};
