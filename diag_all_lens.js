
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function diag() {
    const { data: chars } = await supabase.from('characters').select('id, name, identity_kit, metadata');
    chars.forEach(c => {
        const kitLen = JSON.stringify(c.identity_kit).length;
        const metaLen = JSON.stringify(c.metadata).length;
        console.log(`${c.name}: Kit=${kitLen}, Meta=${metaLen}`);
    });
}

diag();
