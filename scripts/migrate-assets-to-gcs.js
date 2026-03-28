/**
 * ASSET MIGRATION SCRIPT: Supabase/Local to Google Cloud Storage (GCS)
 * 
 * Instructions:
 * 1. Ensure you have @google-cloud/storage installed: `npm install @google-cloud/storage`
 * 2. Setup GCS Service Account credentials in .env (GOOGLE_APPLICATION_CREDENTIALS)
 * 3. Update the `ASSETS_TO_MIGRATE` array below.
 */

import { Storage } from '@google-cloud/storage';
import fetch from 'node-fetch';
import 'dotenv/config';

// GCP Configuration
const storage = new Storage({
  projectId: 'gen-lang-client-0438096272', // Updated Project ID
  keyFilename: 'gen-lang-client-0438096272-veo.json'
});

const BUCKET_NAME = 'zerolensbucket_1'; // Updated Bucket Name

// List of assets to migrate (Source URL -> Target GCS Path)
const ASSETS_TO_MIGRATE = [
  {
    name: 'hero_background',
    source: 'https://rwkefswqopnxbekeqsel.supabase.co/storage/v1/object/sign/mrdai/0302(6).mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xZTI0NmQyYi02M2FiLTQyYzAtODVkMi1iMzUyMTFjZTNkNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtcmRhaS8wMzAyKDYpLm1wNCIsImlhdCI6MTc3MjYyNzI0OSwiZXhwIjoxODA0MTYzMjQ5fQ.p0ycZrXxRK5CUunNSdCbghmYDXdaeObUNLA5kJxeRws',
    destination: 'hero_background.mp4'
  },
  {
    name: 'background_music',
    source: 'https://rwkefswqopnxbekeqsel.supabase.co/storage/v1/object/sign/mrdai/0224(1).MP3?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xZTI0NmQyYi02M2FiLTQyYzAtODVkMi1iMzUyMTFjZTNkNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtcmRhaS8wMjI0KDEpLk1QMyIsImlhdCI6MTc3MTkxNDEyNSwiZXhwIjoxODAzNDUwMTI1fQ.qaJhnVONzdwwlY_vquFkQslB2RBsBSuQPLvGEMER6Xc',
    destination: 'background_music.mp3'
  },
  {
    name: 'pipeline_demo',
    source: 'https://rwkefswqopnxbekeqsel.supabase.co/storage/v1/object/sign/mrdai/0302(6).mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xZTI0NmQyYi02M2FiLTQyYzAtODVkMi1iMzUyMTFjZTNkNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtcmRhaS8wMzAyKDYpLm1wNCIsImlhdCI6MTc3MjYyNzI0OSwiZXhwIjoxODA0MTYzMjQ5fQ.p0ycZrXxRK5CUunNSdCbghmYDXdaeObUNLA5kJxeRws',
    destination: 'pipeline_demo.mp4'
  }
];

async function migrateAsset(asset) {
  try {
    console.log(`🚀 Starting migration for: ${asset.name}`);
    
    // 1. Fetch from source
    const response = await fetch(asset.source);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const buffer = await response.arrayBuffer();

    // 2. Upload to GCS
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(asset.destination);

    await file.save(Buffer.from(buffer), {
      metadata: {
        contentType: 'video/mp4',
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
      resumable: false
    });

    // 3. Set Public Access (Optional - Bucket can handle this at level)
    // await file.makePublic();

    console.log(`✅ Successfully migrated ${asset.name} to gs://${BUCKET_NAME}/${asset.destination}`);
    console.log(`🔗 Public URL: https://storage.googleapis.com/${BUCKET_NAME}/${asset.destination}`);

  } catch (error) {
    console.error(`❌ Migration failed for ${asset.name}:`, error.message);
  }
}

async function runMigration() {
  console.log('--- STARTING ASSET MIGRATION TO GCS ---');
  
  // Verify bucket exists
  const [exists] = await storage.bucket(BUCKET_NAME).exists();
  if (!exists) {
    console.log(`Creating bucket ${BUCKET_NAME}...`);
    await storage.createBucket(BUCKET_NAME, {
      location: 'us-central1',
      storageClass: 'STANDARD'
    });
  }

  for (const asset of ASSETS_TO_MIGRATE) {
    await migrateAsset(asset);
  }

  console.log('--- MIGRATION COMPLETE ---');
}

runMigration().catch(console.error);
