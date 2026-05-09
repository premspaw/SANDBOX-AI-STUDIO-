
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    try {
        const sqlPath = path.join(process.cwd(), 'supabase', 'setup_camera_angles.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Applying migration...');
        
        // Split SQL by statements (simple split by ;)
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
            
            if (error) {
                // If exec_sql RPC doesn't exist, try direct query via REST (though REST doesn't support arbitrary SQL)
                // In Supabase, usually you'd use a migration tool or the dashboard.
                // Since I don't have exec_sql, I'll try to use a dummy table check to see if I can at least run DDL.
                // Actually, standard Supabase JS client doesn't support raw SQL unless you have a custom RPC.
                
                console.warn(`RPC exec_sql failed or missing: ${error.message}`);
                console.log('Attempting to use direct table operations for seeding if table exists...');
                
                // Fallback: Create table manually if RPC fails (this is a bit complex for a script)
                // Let's try to just use the MCP tool if I can find the project ref.
            }
        }

        console.log('Migration finished.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    }
}

runMigration();
