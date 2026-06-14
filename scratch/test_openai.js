import fetch from 'node-fetch';

async function testOpenAI() {
    const payload = {
        model: "gpt-image-2",
        prompt: "A delicious gourmet burger on a dark background",
        quality: "medium",
        size: "1024x1024",
        userId: "cec79985-ce59-4d23-82a2-3ae6f69994ed",
        format: "webp",
        output_compression: 80,
        background: "opaque"
    };

    console.log("Sending request to server...");
    const resp = await fetch('http://127.0.0.1:3002/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await resp.json();
    console.log("Response status:", resp.status);
    console.log("Response data:", JSON.stringify(data, null, 2));
}

testOpenAI();
