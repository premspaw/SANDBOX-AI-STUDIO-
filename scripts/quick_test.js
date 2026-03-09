import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || process.env.API_KEY });

async function quickTest() {
    try {
        console.log("Quick test with gemini-2.0-flash...");
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: 'Tell me a 1-word joke.'
        });
        console.log("RESPONSE TEXT:", response.text);
    } catch (err) {
        console.error("QUICK TEST FAILED:", err.message);
        if (err.response) {
            console.error("RESPONSE DATA:", await err.response.text());
        }
    }
}

quickTest();
