
import fetch from 'node-fetch';

async function testOpenAI() {
    const payload = {
        model: "gpt-image-2-2026-04-21",
        prompt: JSON.stringify({
            goal: "Create a professional marketing asset",
            mode: "detailed_infographic",
            subject: "Gourmet Burger",
            details: {
                composition: "Centered",
                visual_quality: "High"
            }
        }),
        quality: "medium",
        userId: "test_user"
    };

    console.log("Sending request to server...");
    const resp = await fetch('http://127.0.0.1:3002/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await resp.json();
    console.log("Response:", JSON.stringify(data, null, 2));
}

testOpenAI();
