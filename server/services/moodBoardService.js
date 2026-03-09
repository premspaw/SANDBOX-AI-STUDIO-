import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

/**
 * Analyzes a set of mood board images to extract stylistic signals.
 * @param {Array<{inlineData: {data: string, mimeType: string}}>} imageParts - Array of base64 images
 * @returns {Promise<{moodSeed: string, palette: string[]}>}
 */
export async function analyzeMood(imageParts) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
            Analyze these mood board reference images. 
            Extract the dominant "Visual DNA" for a cinematic production.
            
            Return a JSON object:
            {
              "moodSeed": "A concise, highly descriptive 'Mood Seed' token (max 30 words). Include lighting style (e.g., 'Golden Hour glow', 'Moody Neo-noir shadows'), color temperature, and overall aesthetic vibe (e.g., '90s film grain', 'clean minimalist editorial'). This token will be injected into every image prompt to ensure consistency.",
              "palette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
              "aestheticLabels": ["label1", "label2", "label3"]
            }
            
            Focus on the style, lighting, and color, NOT the specific subjects in the images.
            Return ONLY valid JSON.
        `;

        const result = await model.generateContent([
            ...imageParts,
            { text: prompt }
        ]);

        const response = await result.response;
        const text = response.text();

        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            return JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.error('[MoodBoardService] JSON Parse Error:', e, 'Raw text:', text);
            return {
                moodSeed: "Cinematic lighting, professional color grading, high fidelity.",
                palette: ["#000000", "#ffffff"],
                aestheticLabels: ["Cinematic"]
            };
        }
    } catch (error) {
        console.error('[MoodBoardService] Analysis Error:', error);
        throw error;
    }
}
