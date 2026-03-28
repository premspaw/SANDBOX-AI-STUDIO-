// services/gcsService.js
import { Storage } from '@google-cloud/storage';

// These should be added to your Railway (or local .env) environment variables:
// GCS_BUCKET_NAME=zerolensbucket_1
// GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}

const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
const storage = new Storage({ credentials });
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

export async function uploadToGCS(fileUrl, userId, type) {
  try {
    console.log(`[GCS_SERVICE] Fetching file from: ${fileUrl}`);
    // fetch the file from Veo/Imagen URL
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Failed to fetch file from ${fileUrl}: ${response.statusText}`);
    
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'video/mp4';
    
    const ext = contentType.includes('video') ? 'mp4' : 'png';
    const filename = `users/${userId}/${type}/${Date.now()}.${ext}`;
    
    console.log(`[GCS_SERVICE] Saving to GCS: ${process.env.GCS_BUCKET_NAME}/${filename}`);
    const file = bucket.file(filename);
    await file.save(Buffer.from(buffer), {
      contentType,
      metadata: { cacheControl: 'public, max-age=31536000' }
    });

    const publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${filename}`;
    console.log(`[GCS_SERVICE] ✅ Uploaded: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error(`[GCS_SERVICE] ❌ Upload Error:`, err);
    throw err;
  }
}
