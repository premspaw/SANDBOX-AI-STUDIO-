import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAssetUrls() {
  const { data, error } = await supabase
    .from('assets')
    .select('id, name, type, url, created_at')
    .eq('user_id', 'cec79985-ce59-4d23-82a2-3ae6f69994ed')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error("Error fetching asset URLs:", error);
  } else {
    console.log(`Found ${data.length} assets in database:`);
    data.forEach((row, i) => {
      console.log(`${i + 1}. ID: ${row.id}, Type: ${row.type}, URL: ${row.url} (Created at: ${row.created_at})`);
    });
  }
}

checkAssetUrls();
