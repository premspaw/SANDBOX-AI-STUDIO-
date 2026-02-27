import fetch from 'node-fetch';

async function testEndpoint() {
    console.log("Testing /api/ugc/ad-engine...");
    try {
        const resp = await fetch('http://localhost:3001/api/ugc/ad-engine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                characterImage: 'test',
                productImage: 'test'
            })
        });

        console.log("Status:", resp.status);
        const data = await resp.json();
        console.log("Data:", data);
    } catch (err) {
        console.error("Test failed:", err.message);
    }
}

testEndpoint();
