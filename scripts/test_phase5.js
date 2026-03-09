// Phase 5 Diagnostic Script
const API = 'http://localhost:3001';

async function runDiagnostics() {
    console.log('=== PHASE 5 DIAGNOSTICS ===\n');

    // Test 1: UGC Hook Generation
    console.log('Test 1: UGC Hook Generation...');
    try {
        const res = await fetch(`${API}/api/ugc/generate-hook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ characterName: 'Priya', niche: 'tech', hookStyle: 'PATTERN_INTERRUPT', script: '' })
        });
        const data = await res.json();
        console.log(data.error ? `FAIL: ${data.error}` : `SUCCESS: Hook generated — "${data.hookScript?.substring(0, 60)}..."`);
    } catch (e) { console.log('FAIL:', e.message); }

    // Test 2: Music Score Generation
    console.log('\nTest 2: Music Score Generation...');
    try {
        const res = await fetch(`${API}/api/music/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: 'Epic trailer music for a sci-fi reveal', style: 'EPIC_TRAILER', duration: 10 })
        });
        const data = await res.json();
        console.log(data.error ? `FAIL: ${data.error}` : `SUCCESS: Score "${data.score?.title}" — ${data.score?.bpm} BPM, Key: ${data.score?.key}`);
    } catch (e) { console.log('FAIL:', e.message); }

    // Test 3: WebSocket Connection
    console.log('\nTest 3: WebSocket Connection...');
    try {
        const { default: WebSocket } = await import('ws');
        const ws = new WebSocket('ws://localhost:3001');
        await new Promise((resolve, reject) => {
            ws.on('open', () => {
                ws.on('message', (msg) => {
                    const data = JSON.parse(msg.toString());
                    console.log(`SUCCESS: WebSocket connected — ${data.message}`);
                    ws.close();
                    resolve();
                });
            });
            ws.on('error', reject);
            setTimeout(() => reject(new Error('Timeout')), 5000);
        });
    } catch (e) { console.log('FAIL:', e.message); }

    console.log('\n=== DIAGNOSTICS COMPLETE ===');
}

runDiagnostics();
