import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import nodeFetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;

async function testImageGen(modelName) {
    console.log(`Testing model: ${modelName}`);
    const payload = {
        contents: [{ parts: [{ text: "A futuristic cinema studio with AI robots" }] }],
        generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: {
                aspectRatio: "16:9"
            }
        }
    };

    try {
        const response = await nodeFetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.error) {
            console.error(`Error for ${modelName}:`, JSON.stringify(data.error, null, 2));
        } else {
            const parts = data.candidates?.[0]?.content?.parts || [];
            const hasImage = parts.some(p => p.inlineData);
            console.log(`Success for ${modelName}: Image returned? ${hasImage}`);
        }
    } catch (error) {
        console.error(`Fetch error for ${modelName}:`, error);
    }
}

async function runTests() {
    await testImageGen('gemini-2.5-flash-image');
    await testImageGen('gemini-3.1-flash-image-preview');
    await testImageGen('gemini-3-pro-image-preview');
}

runTests();
