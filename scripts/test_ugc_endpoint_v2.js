import fetch from 'node-fetch';

async function testEndpoint() {
    console.log("Testing /api/ugc/ad-engine on port 3002...");
    try {
        const resp = await fetch('http://localhost:3002/api/ugc/ad-engine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                characterImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
                productImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
                metadata: {
                    characterMetadata: { name: "Test Creator" },
                    productMetadata: { description: "Test Product" }
                }
            })
        });

        console.log("Status:", resp.status);
        if (resp.ok) {
            const data = await resp.json();
            console.log("Success! Synergy:", data.synergy);
            console.log("Script scenes count:", data.script?.scenes?.length);
        } else {
            const text = await resp.text();
            console.log("Error body:", text);
        }
    } catch (err) {
        console.error("Test failed:", err.message);
    }
}

testEndpoint();
