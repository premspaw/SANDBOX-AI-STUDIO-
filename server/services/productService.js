import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import fs from 'fs';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

/**
 * Core product analysis logic using Gemini 2.5 Flash
 */
export async function analyzeProductItem(image, broadcast) {
    // Robust base64 extraction
    let base64Data = '';
    let mimeType = 'image/jpeg';

    if (image.startsWith('data:')) {
        const parts = image.split(',');
        if (parts.length < 2) throw new Error('Invalid Data URL format');

        const meta = parts[0];
        base64Data = parts[1];

        const mimeMatch = meta.match(/:(.*?);/);
        if (mimeMatch) mimeType = mimeMatch[1];
    } else {
        base64Data = image;
    }

    if (broadcast) broadcast(2, 3, 'Analyzing product features and creative potential via Vision AI...');

    const schema = {
        type: SchemaType.OBJECT,
        properties: {
            brandName: { type: SchemaType.STRING, description: "Brand name if visible on the product, else 'Generic'" },
            productName: { type: SchemaType.STRING, description: "Name/Type of the product" },
            category: { type: SchemaType.STRING, description: "Product category (e.g., Skincare, Electronics, Beverage, Fashion)" },
            description: { type: SchemaType.STRING, description: "One sentence describing the product and its key features" },
            materials: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Materials visible (e.g., glass, matte plastic, chrome, leather)" },
            colors: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Dominant 3 colors as Hex codes" },
            vibe: { type: SchemaType.STRING, description: "The styling aesthetic vibe (e.g., minimalist, futuristic, rugged, luxurious)" },
            lightingSuggestion: { type: SchemaType.STRING, description: "Recommended lighting style for filming this product (e.g., Bright studio, moody spotlights, neon reflections)" },
            recommendedCameraShot: { type: SchemaType.STRING, description: "Best camera shot to highlight this product's features (e.g., Macro close-up on logo, Slow pan across texture)" },
            targetAudience: { type: SchemaType.STRING, description: "Inferred target demographic based on packaging design" },
            labels: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Generic keywords for search" }
        },
        required: ["productName", "category", "description", "materials", "colors", "vibe", "lightingSuggestion", "recommendedCameraShot", "labels"]
    };

    // Using gemini-2.5-flash with STRUCTURED OUTPUT schemas
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });

    const result = await model.generateContent([
        { inlineData: { mimeType, data: base64Data } },
        { text: "Analyze this product image. Extract all details according to the schema for a high-end commercial video production." }
    ]);

    const response = await result.response;
    const text = response.text();

    try {
        const parsed = JSON.parse(text);
        console.log("[ProductService] Successfully extracted structured creative data:", parsed.productName);
        return parsed;
    } catch (parseErr) {
        console.error('[ProductService] Critical Schema Failure:', parseErr);
        throw new Error("Failed to parse AI structure.");
    }
}

