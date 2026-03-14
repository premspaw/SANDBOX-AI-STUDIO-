import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
const modelName = 'gemini-2.0-flash'; // For testing generateContent
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

async function test() {
    const headers = {
        'Content-Type': 'application/json',
        'Referer': 'http://localhost:5173/',
        'Origin': 'http://localhost:5173'
    };
    
    const body = {
        contents: [{
            parts: [{ text: "Hello" }]
        }]
    };

    console.log("Testing with headers:", headers);
    const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });

    const data = await resp.json();
    console.log("Status:", resp.status);
    console.log("Response:", JSON.stringify(data, null, 2));
}

test();
