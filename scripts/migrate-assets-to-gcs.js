/**
 * ASSET MIGRATION SCRIPT: Supabase/Local to Google Cloud Storage (GCS)
 * 
 * Instructions:
 * 1. Ensure you have @google-cloud/storage installed: `npm install @google-cloud/storage`
 * 2. Setup GCS Service Account credentials in .env (GOOGLE_APPLICATION_CREDENTIALS)
 * 3. Set MIGRATION_ASSETS_JSON to a private JSON array of {name, source, destination}.
 */

import { Storage } from '@google-cloud/storage';
import fetch from 'node-fetch';
import 'dotenv/config';

// Application Default Credentials: configure outside the repository.
const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME;
if (!BUCKET_NAME) throw new Error('GCS_BUCKET_NAME is required');

// List of assets to migrate (Source URL -> Target GCS Path)
// Supply fresh URLs privately; signed URLs must not be committed.
const ASSETS_TO_MIGRATE = JSON.parse(process.env.MIGRATION_ASSETS_JSON || '[]');

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
