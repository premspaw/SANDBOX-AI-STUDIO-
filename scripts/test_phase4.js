import fetch from 'node-fetch';

const API = 'http://localhost:3001';

async function testVisionAnalysis() {
    console.log("Testing Vision-Powered Character Analysis...");
    try {
        const response = await fetch(`${API}/api/influencer/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
            })
        });
        const data = await response.json();
        if (data.tags && data.tags.labels) {
            console.log(`SUCCESS: Vision labels extracted: ${data.tags.labels.slice(0, 3).join(', ')}`);
        } else {
            console.log("FAIL: Vision tagging failed.");
            console.log(data);
        }
    } catch (err) {
        console.error("Vision Test Failed:", err);
    }
}

async function testSemanticSearch() {
    console.log("\nTesting Semantic Vault Search...");
    try {
        const response = await fetch(`${API}/api/influencer/semantic-search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: "find characters with a futuristic cyber vibe" })
        });
        const data = await response.json();
        if (Array.isArray(data.results)) {
            console.log(`SUCCESS: Semantic search pulse active. Found ${data.results.length} matches.`);
        } else {
            console.log("FAIL: Semantic search failed.");
            console.log(data);
        }
    } catch (err) {
        console.error("Semantic Search Test Failed:", err);
    }
}

async function runTests() {
    await testVisionAnalysis();
    await testSemanticSearch();
}

runTests();
