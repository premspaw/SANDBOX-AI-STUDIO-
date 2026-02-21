import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || process.env.API_KEY });

async function listModels() {
    console.log("Listing available models...");
    try {
        const models = await ai.models.list();
        for (const m of models) {
            console.log(`- ${m.name} (${m.displayName})`);
        }
    } catch (err) {
        console.error("Failed to list models:", err);
    }
}

async function testSingleModel(modelName) {
    console.log(`\nTesting model: ${modelName}`);
    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: "Hi, respond with 'OK' if you see this.",
            config: { maxOutputTokens: 10 }
        });
        console.log(`SUCCESS [${modelName}]: ${response.text}`);
    } catch (err) {
        console.log(`FAIL [${modelName}]: ${err.message}`);
    }
}

async function run() {
    console.log("Listing available models...");
    try {
        const response = await ai.models.list();
        // The list() method usually returns a pager or an object with models
        const models = response.models || response;
        if (Array.isArray(models)) {
            models.forEach(m => console.log(`- ${m.name}`));
        } else if (response.next) {
            // Handle pager if needed
            for await (const m of response) {
                console.log(`- ${m.name}`);
            }
        }
    } catch (err) {
        console.error("Failed to list models:", err.message);
    }
}

run();
