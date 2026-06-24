import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase URL or Key in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  'profiles',
  'characters',
  'assets',
  'shorts_transactions',
  'billing_history',
  'ugc_scene_templates',
  'avatar_generations'
];

async function checkDatabase() {
  console.log("========================================");
  console.log("🔍 Checking Supabase Database and Storage...");
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Using Key Type: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon'}`);
  console.log("========================================\n");

  // 1. Check Tables
  console.log("--- 📋 Database Tables Status ---");
  for (const table of tables) {
    try {
      const { data, count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(1);

      if (error) {
        console.error(`❌ Table "${table}": Error ->`, error.message);
      } else {
        const rowCount = count !== null ? count : 'Unknown';
        console.log(`✅ Table "${table}": Accessible. Rows: ${rowCount}`);
        if (data && data.length > 0) {
          console.log(`   Columns found: ${Object.keys(data[0]).join(', ')}`);
        } else {
          console.log(`   Columns found: (Empty Table)`);
        }
      }
    } catch (err) {
      console.error(`❌ Table "${table}": Unexpected exception ->`, err.message || err);
    }
  }

  // 1b. Analyze asset types since marketing_templates are stored in assets table
  console.log("\n--- 📊 Asset Table Type Analysis ---");
  try {
    const { data: assets, error: assetErr } = await supabase
      .from('assets')
      .select('type');

    if (assetErr) {
      console.error("❌ Assets Type Analysis: Error ->", assetErr.message);
    } else if (assets) {
      const counts = {};
      assets.forEach(asset => {
        const type = asset.type || 'null';
        counts[type] = (counts[type] || 0) + 1;
      });
      console.log("Distinct asset types and their row counts in 'assets' table:");
      Object.entries(counts).forEach(([type, count]) => {
        console.log(`   - "${type}": ${count} rows`);
      });
    }
  } catch (err) {
    console.error("❌ Assets Type Analysis: Unexpected exception ->", err.message || err);
  }

  // 2. Check Storage Buckets
  console.log("\n--- 📁 Storage Buckets Status ---");
  try {
    const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
    if (bucketErr) {
      console.error("❌ Storage: Error listing buckets ->", bucketErr.message);
    } else {
      console.log(`✅ Storage: Accessible. Found ${buckets.length} bucket(s):`);
      for (const bucket of buckets) {
        console.log(`   - "${bucket.name}" (Public: ${bucket.public}, Allowed Content Types: ${bucket.allowed_mime_types ? bucket.allowed_mime_types.join(', ') : 'All'})`);
        
        // List files in bucket root
        const { data: files, error: fileErr } = await supabase.storage.from(bucket.name).list('', { limit: 5 });
        if (fileErr) {
          console.error(`     ❌ Error listing files: ${fileErr.message}`);
        } else {
          console.log(`     Found ${files.length} items (showing up to 5):`);
          files.forEach(file => {
            console.log(`       * ${file.name} (${file.id ? 'File' : 'Folder'}${file.metadata ? `, Size: ${file.metadata.size}B` : ''})`);
          });
        }
      }
    }
  } catch (err) {
    console.error("❌ Storage: Unexpected exception ->", err.message || err);
  }
  console.log("\n========================================");
}

checkDatabase();
