import fetch from 'node-fetch';

async function testGen() {
    console.log("Testing Image Generation Payload...");
    try {
        const response = await fetch('http://localhost:3002/api/forge/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: "A futuristic portrait of a creative director",
                aspect_ratio: '16:9',
                identity_images: []
            })
        });

        const data = await response.json();
        if (response.ok) {
            console.log("SUCCESS: Image generation triggered correctly.");
            console.log("Response URL preview:", data.url ? data.url.substring(0, 100) + '...' : 'NULL');
        } else {
            console.error("FAILED:", data.error || data.message);
        }
    } catch (e) {
        console.error("CONNECTION ERROR:", e.message);
    }
}

async function testLanding() {
    console.log("\nTesting Landing Assets Route...");
    try {
        const response = await fetch('http://localhost:3002/api/get-landing-assets');
        const data = await response.json();
        if (response.ok) {
            console.log("SUCCESS: Landing assets route returned data.");
            console.log("Data keys:", Object.keys(data));
        } else {
            console.error("FAILED:", response.status);
        }
    } catch (e) {
        console.error("CONNECTION ERROR:", e.message);
    }
}

testGen().then(() => testLanding());
