import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function createBucket() {
    const bucketName = 'marketing-assets-cinemai'; // Suggested name
    
    let credentials;
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        let cleanJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
        if (cleanJson.startsWith("'") && cleanJson.endsWith("'")) cleanJson = cleanJson.slice(1, -1);
        credentials = JSON.parse(cleanJson);
        if (credentials.private_key) credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }

    const storage = new Storage({
        credentials,
        projectId: credentials?.project_id || process.env.GOOGLE_PROJECT_ID
    });

    try {
        console.log(`[GCS] Attempting to create bucket: ${bucketName}...`);
        const [bucket] = await storage.createBucket(bucketName, {
            location: 'US', // or your preferred location
            storageClass: 'STANDARD',
        });
        console.log(`[GCS] ✅ Bucket ${bucket.name} created successfully.`);
    } catch (err) {
        console.error('[GCS] ❌ Error creating bucket:', err.message);
        if (err.message.includes('You already own this bucket')) {
            console.log('[GCS] ℹ️ You already own this bucket.');
        }
    }
}

createBucket();
