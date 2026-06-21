import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Storage } from '@google-cloud/storage';
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Supabase Client
const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const supabase = (supabaseUrl && supabaseKey && supabaseUrl.startsWith('https://'))
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// ── Bucket / folder constants ────────────────────────────────────────────────
const GCS_BUCKET   = process.env.GCS_BUCKET_NAME || 'zerolensbucket_1';
const R2_BUCKET    = process.env.R2_BUCKET_NAME  || 'zerolensbucket-cdn';

// Marketing assets live under marketing/ subfolder — no separate bucket needed.
export const MARKETING_BUCKET = R2_BUCKET;   // R2 is now primary
export const MARKETING_FOLDER = 'marketing';

// Public CDN base — set GCS_CDN_BASE_URL=https://pub-xxx.r2.dev in .env
const CDN_BASE = (process.env.GCS_CDN_BASE_URL || 'https://pub-05a4fe33e706492e8d437c36f9a8aa94.r2.dev').replace(/\/$/, '');

// ── Cloudflare R2 client (S3-compatible) ─────────────────────────────────────
// Runtime credentials only. Configure these in Railway variables.
const R2_ACCOUNT_ID     = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID  = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT_URL   = process.env.R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const R2_CONFIGURED = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);

let r2Client = null;
if (R2_CONFIGURED) {
    r2Client = new S3Client({
        region: 'auto',
        endpoint: R2_ENDPOINT_URL,
        credentials: {
            accessKeyId:     R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
    });
    console.log('[R2] ✅ Cloudflare R2 client initialised — primary storage active');
    console.log('[R2] Bucket:', R2_BUCKET);
    console.log('[R2] CDN Base:', CDN_BASE);
} else {
    console.log('[R2] ⚠️  R2 not configured — falling back to GCS');
}

// ── Google Cloud Storage client (fallback) ───────────────────────────────────
let storageOptions = {};
try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        let cleanJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
        if (cleanJson.startsWith("'") && cleanJson.endsWith("'")) cleanJson = cleanJson.slice(1, -1);
        const credentials = JSON.parse(cleanJson);
        if (credentials.private_key) credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
        storageOptions.credentials = credentials;
    }
} catch (e) {
    console.error('[GCS] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', e.message);
}
const gcsStorage = new Storage(storageOptions);
const gcsBucket  = gcsStorage.bucket(GCS_BUCKET);

// ── URL builder ──────────────────────────────────────────────────────────────
const toPublicUrl = (fileName, bucketName) => {
    const encoded = fileName.split('/').map(encodeURIComponent).join('/');
    if (CDN_BASE) return `${CDN_BASE}/${encoded}`;
    if (r2Client)  return `https://${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${encoded}`;
    return `https://storage.googleapis.com/${bucketName || GCS_BUCKET}/${encoded}`;
};

// ── toBuffer helper ───────────────────────────────────────────────────────────
const toBuffer = (data) => {
    if (typeof data === 'string' && data.startsWith('data:')) return Buffer.from(data.split(',')[1], 'base64');
    if (typeof data === 'string') return Buffer.from(data, 'base64');
    return data;
};

const uploadToSupabase = async (buffer, fileName, contentType) => {
    if (!supabase) return null;
    try {
        console.log(`[SUPABASE-STORAGE] Uploading ${fileName} → assets...`);
        const cleanPath = fileName.replace(/\\/g, '/').replace(/\/+/g, '/');
        const { data, error } = await supabase.storage
            .from('assets')
            .upload(cleanPath, buffer, {
                contentType: contentType,
                upsert: true
            });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage
            .from('assets')
            .getPublicUrl(cleanPath);
        console.log(`[SUPABASE-STORAGE] ✅ Uploaded: ${publicUrl}`);
        return publicUrl;
    } catch (err) {
        console.error('[SUPABASE-STORAGE] Upload Failed:', err.message);
        return null;
    }
};

/**
 * Upload a binary asset — R2 first, GCS fallback.
 * @param {Buffer|string} data
 * @param {string} fileName
 * @param {string} contentType
 * @param {string} targetBucket  - ignored when R2 is active (uses R2_BUCKET)
 */
export const uploadToGCS = async (data, fileName, contentType = 'image/png', targetBucket) => {
    const buffer = toBuffer(data);

    if (r2Client) {
        try {
            console.log(`[R2] Uploading ${fileName} → ${R2_BUCKET}...`);
            await r2Client.send(new PutObjectCommand({
                Bucket:       R2_BUCKET,
                Key:          fileName,
                Body:         buffer,
                ContentType:  contentType,
                CacheControl: 'public, max-age=31536000',
            }));
            const url = toPublicUrl(fileName);
            console.log(`[R2] ✅ Uploaded: ${url}`);
            return url;
        } catch (err) {
            console.error('[R2] Upload failed, falling back to GCS:', err.message);
        }
    }

    // GCS fallback
    try {
        const bkt  = targetBucket && targetBucket !== GCS_BUCKET
            ? gcsStorage.bucket(targetBucket)
            : gcsBucket;
        console.log(`[GCS] Uploading ${fileName} → ${targetBucket || GCS_BUCKET}...`);
        const file = bkt.file(fileName);
        await file.save(buffer, {
            contentType,
            resumable: false,
            metadata: { cacheControl: 'public, max-age=31536000' },
        });
        const url = toPublicUrl(fileName, targetBucket || GCS_BUCKET);
        console.log(`[GCS] ✅ Uploaded: ${url}`);
        return url;
    } catch (err) {
        console.error('[GCS] Upload Failed, falling back to Supabase Storage:', err.message);
        try {
            const supabaseUrl = await uploadToSupabase(buffer, fileName, contentType);
            if (supabaseUrl) return supabaseUrl;
        } catch (subErr) {
            console.error('[GCS -> SUPABASE] Fallback failed:', subErr.message);
        }

        // Final fallback: local storage
        try {
            const baseName = path.basename(fileName);
            const publicAssetsDir = path.join(process.cwd(), 'public', 'assets');
            if (!fs.existsSync(publicAssetsDir)) {
                fs.mkdirSync(publicAssetsDir, { recursive: true });
            }
            const localFilePath = path.join(publicAssetsDir, baseName);
            fs.writeFileSync(localFilePath, buffer);
            const url = `/assets/${baseName}`;
            console.log(`[LOCAL-STORAGE-FALLBACK] ✅ Saved locally: ${url}`);
            return url;
        } catch (localErr) {
            console.error('[LOCAL-STORAGE-FALLBACK] Failed to save locally:', localErr.message);
            throw err;
        }
    }
};

/**
 * Get public URL for any stored asset.
 */
export const getPublicUrl = (fileName, bucketName) => toPublicUrl(fileName, bucketName);

/**
 * Read a file from R2 as a string (for JSON/text files).
 */
export const readFromR2 = async (fileName) => {
    if (!r2Client) throw new Error('R2 not configured');
    const res = await r2Client.send(new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: fileName,
    }));
    const chunks = [];
    for await (const chunk of res.Body) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf-8');
};

/**
 * Upload a JSON/text file to R2.
 */
export const writeToR2 = async (fileName, content, contentType = 'application/json') => {
    if (!r2Client) throw new Error('R2 not configured');
    await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: fileName,
        Body: Buffer.from(content, 'utf-8'),
        ContentType: contentType,
    }));
};

/**
 * List assets (R2 first, GCS fallback).
 */
export const listAssetsGCS = async (prefix = '', targetBucket) => {
    if (r2Client) {
        try {
            const res = await r2Client.send(new ListObjectsV2Command({
                Bucket: R2_BUCKET,
                Prefix: prefix,
            }));
            return (res.Contents || []).map(obj => ({
                id:   obj.Key,
                name: obj.Key,
                url:  toPublicUrl(obj.Key),
                size: ((obj.Size || 0) / (1024 * 1024)).toFixed(2) + ' MB',
                date: obj.LastModified?.toISOString().split('T')[0],
            }));
        } catch (err) {
            console.error('[R2] List failed, falling back to GCS:', err.message);
        }
    }

    try {
        const bkt = targetBucket && targetBucket !== GCS_BUCKET
            ? gcsStorage.bucket(targetBucket)
            : gcsBucket;
        const [files] = await bkt.getFiles({ prefix });
        return files.map(file => ({
            id:   file.id,
            name: file.name,
            url:  toPublicUrl(file.name, targetBucket || GCS_BUCKET),
            size: (parseInt(file.metadata.size || 0) / (1024 * 1024)).toFixed(2) + ' MB',
            date: file.metadata.updated?.split('T')[0],
        }));
    } catch (err) {
        console.error('[GCS] List Failed:', err);
        return [];
    }
};
