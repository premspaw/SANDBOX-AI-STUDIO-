import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function listModels() {
    console.log("Listing models for API Key:", process.env.GOOGLE_API_KEY?.substring(0, 10) + '...');
    try {
        // We can't actually list models directly from genAI object easily in JS SDK without another import,
        // but we can try to probe some likely names.
        const modelsToTry = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-8b',
            'gemini-1.5-pro',
            'gemini-1.0-pro',
            'gemini-pro'
        ];

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                await model.generateContent("test");
                console.log(`✅ Model ${modelName} is available.`);
            } catch (err) {
                console.log(`❌ Model ${modelName} failed: ${err.message}`);
            }
        }
    } catch (err) {
        console.error("List failed:", err.message);
    }
}

listModels();
