import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking Supabase...");

    // Check characters with select *
    const { data: chars, error: charErr } = await supabase.from('characters').select('*');
    if (charErr) {
        console.error("Chars Error:", charErr);
    } else {
        console.log("Characters data count:", chars.length);
        if (chars.length > 0) {
            console.log("Columns of characters:", Object.keys(chars[0]));
            console.log("Sample character data:", JSON.stringify(chars[0], null, 2));
        }
    }

    // Check assets with select *
    const { data: assets, error: assetErr } = await supabase.from('assets').select('*');
    if (assetErr) {
        console.error("Assets Error:", assetErr);
    } else {
        console.log("Assets data count:", assets.length);
        if (assets.length > 0) {
            console.log("Columns of assets:", Object.keys(assets[0]));
            // Check URLs
            console.log("First 3 asset URLs:", assets.slice(0, 3).map(a => a.url));
        }
    }
}

check();
