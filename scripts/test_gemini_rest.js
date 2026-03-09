import nodeFetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function testRest() {
    const apiKey = process.env.GOOGLE_API_KEY;
    const model = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    console.log("Testing REST API...");
    try {
        const resp = await nodeFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello" }] }]
            })
        });

        console.log("Status:", resp.status);
        const data = await resp.json();
        if (data.error) {
            console.log("REST Error:", JSON.stringify(data.error, null, 2));
        } else {
            console.log("REST Success! Response text:", data.candidates?.[0]?.content?.parts?.[0]?.text);
        }
    } catch (err) {
        console.error("REST failed:", err.message);
    }
}

testRest();
