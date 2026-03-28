import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    console.log("🧹 [CLEANUP] Removing dummy test asset...");
    const { error } = await supabase
        .from('assets')
        .delete()
        .eq('url', 'https://example.com/test.png');
        
    if (error) {
        console.error("❌ Cleanup failed:", error.message);
    } else {
        console.log("✅ Dummy asset removed successfully.");
    }
}

cleanup();
