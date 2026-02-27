
import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

function supabaseRestGet(tablePath, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${supabaseUrl}/rest/v1/${tablePath}`);
        const opts = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            headers: {
                'apikey': apiKey,
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            family: 4, // Force IPv4
            timeout: timeoutMs
        };
        console.log(`[DEBUG] Fetching: ${url.href}`);
        const req = https.get(opts, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(data)); }
                    catch (e) { reject(new Error('Invalid JSON from Supabase')); }
                } else {
                    reject(new Error(`Supabase REST ${res.statusCode}: ${data.substring(0, 200)}`));
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Supabase REST timeout')); });
    });
}

async function runTest() {
    console.log("Starting Character Fetch Test...");
    try {
        console.log("1. Testing basic fetch (select *)...");
        const data1 = await supabaseRestGet('characters?select=*');
        console.log(`✅ Success! Found ${data1.length} characters.`);
        if (data1.length > 0) {
            console.log("Sample keys:", Object.keys(data1[0]));
        }

        console.log("\n2. Testing ordered fetch (order=timestamp.desc)...");
        try {
            const data2 = await supabaseRestGet('characters?select=*&order=timestamp.desc');
            console.log(`✅ Success! Ordered fetch found ${data2.length} characters.`);
        } catch (e) {
            console.error("❌ Ordered fetch failed (likely no 'timestamp' column):", e.message);
        }

        console.log("\n3. Testing ordered fetch (order=created_at.desc)...");
        try {
            const data3 = await supabaseRestGet('characters?select=*&order=created_at.desc');
            console.log(`✅ Success! Ordered fetch (created_at) found ${data3.length} characters.`);
        } catch (e) {
            console.error("❌ Ordered fetch (created_at) failed:", e.message);
        }

    } catch (err) {
        console.error("CRITICAL TEST FAILURE:", err);
    }
}

runTest();
