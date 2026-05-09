
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testQuery() {
    const { data, error } = await supabase.from('camera_angles').select('*');
    if (error) {
        console.error('Error querying camera_angles:', error.message);
    } else {
        console.log('Camera angles found:', data.length);
        console.log(JSON.stringify(data, null, 2));
    }
}

testQuery();
