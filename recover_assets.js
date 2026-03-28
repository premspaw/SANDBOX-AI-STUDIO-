import { createClient } from '@supabase/supabase-js';
import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'zerolensbucket_1';

const GCS_KEY_PATH = path.join(__dirname, 'src', 'components', 'canvas', 'gen-lang-client-0438096272-2caf3e3dbd1d.json');
const storage = new Storage({ keyFilename: GCS_KEY_PATH });

const supabase = createClient(supabaseUrl, supabaseKey);

async function recoverAssets(userId) {
    console.log(`🚀 [RECOVERY] Scanning GCS for user: ${userId}...`);
    const bucket = storage.bucket(BUCKET_NAME);
    const prefix = `users/${userId}/generated/`;
    
    // 1. List files in GCS
    const [files] = await bucket.getFiles({ prefix });
    console.log(`Found ${files.length} files in GCS.`);

    // 2. Filter for images/videos
    const candidates = files.filter(f => {
        const ext = path.extname(f.name).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.mp4', '.mov', '.webm'].includes(ext);
    });
    console.log(`Identified ${candidates.length} media candidates.`);

    // 3. Check existing in DB to avoid dupes
    const { data: existing } = await supabase
        .from('assets')
        .select('url')
        .eq('user_id', userId);
    
    const existingUrls = new Set(existing?.map(e => e.url) || []);

    // 4. Upsert missing ones
    let recoveredCount = 0;
    for (const file of candidates) {
        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${file.name}`;
        
        if (!existingUrls.has(publicUrl)) {
            const type = file.name.endsWith('.mp4') || file.name.endsWith('.mov') || file.name.endsWith('.webm') ? 'video' : 'image';
            
            const { error } = await supabase.from('assets').insert([{
                name: path.basename(file.name),
                type: type,
                url: publicUrl,
                user_id: userId,
                created_at: file.metadata.timeCreated || new Date().toISOString()
            }]);
            
            if (!error) {
                recoveredCount++;
                console.log(`✅ Recovered: ${path.basename(file.name)}`);
            } else {
                console.error(`❌ Failed: ${path.basename(file.name)} - ${error.message}`);
            }
        }
    }

    console.log(`🏆 [DONE] Successfully recovered ${recoveredCount} assets into the database.`);
}

// User's ID from logs
const TARGET_USER = 'cec79985-ce59-4d23-82a2-3ae6f69994ed';
recoverAssets(TARGET_USER).catch(console.error);
