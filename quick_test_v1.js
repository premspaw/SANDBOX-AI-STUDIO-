import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY || process.env.API_KEY,
    apiVersion: 'v1'
});

async function quickTest() {
    try {
        console.log("Quick test with gemini-1.5-flash (v1)...");
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: 'Tell me a 1-word joke.'
        });
        console.log("RESPONSE TEXT:", response.text);
    } catch (err) {
        console.error("QUICK TEST FAILED:", err.message);
    }
}

quickTest();
