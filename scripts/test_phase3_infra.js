import fetch from 'node-fetch';

async function testGCS() {
    console.log("Testing GCS Proxy Upload...");
    try {
        const response = await fetch('http://localhost:3001/api/save-asset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
                fileName: `test_infra_${Date.now()}.png`
            })
        });
        const data = await response.json();
        if (data.success && data.path.includes('storage.googleapis.com')) {
            console.log(`SUCCESS: Asset saved and uploaded to GCS: ${data.path}`);
        } else {
            console.log("FAIL: GCS Upload check failed.");
            console.log(data);
        }
    } catch (err) {
        console.error("GCS Test Failed:", err);
    }
}

async function testWorkspace() {
    console.log("\nTesting Workspace Import Proxy...");
    // Using a known public doc ID or a realistic mock ID
    const testDocId = "1z_eWstN9x8JmXpAOnjU8rN6v-E3h-8z1q-M3r-_Q9W8";
    try {
        const response = await fetch('http://localhost:3001/api/workspace/import-doc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ docId: testDocId })
        });
        const data = await response.json();
        if (data.content) {
            console.log(`SUCCESS: Parsed Doc Title: ${data.title}`);
            console.log(`Content Snapshot: ${data.content.substring(0, 50)}...`);
        } else {
            console.log("FAIL: Workspace Import failed (likely auth or invalid ID).");
            console.log(data);
        }
    } catch (err) {
        console.error("Workspace Test Failed:", err);
    }
}

async function runTests() {
    await testGCS();
    await testWorkspace();
}

runTests();
