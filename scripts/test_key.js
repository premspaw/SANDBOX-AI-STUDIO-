
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

async function test() {
    console.log("Testing API Key:", apiKey.substring(0, 10) + "...");
    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello" }] }]
            })
        });
        const data = await resp.json();
        console.log("Response Status:", resp.status);
        console.log("Response Data:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Test failed:", e);
    }
}

test();
