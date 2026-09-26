import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Analyzes a set of mood board images to extract stylistic signals.
 * @param {Array<{inlineData: {data: string, mimeType: string}}>} imageParts - Array of base64 images
 * @returns {Promise<{moodSeed: string, palette: string[]}>}
 */
export async function analyzeMood(imageParts) {
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

    try {
        const apiKey = process.env.GOOGLE_API_KEY || process.env.ADMIN_GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
        if (apiKey) {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent([
                ...imageParts,
                { text: prompt }
            ]);
            const response = await result.response;
            const text = response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        }
    } catch (googleErr) {
        console.warn('[analyzeMood] Google model failed, trying OpenAI fallback:', googleErr.message);
    }

    // Fallback to OpenAI Vision
    if (process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY) {
        try {
            const { default: OpenAI } = await import('openai');
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY });
            const userContent = [];
            for (const img of imageParts) {
                if (img.inlineData?.data) {
                    userContent.push({
                        type: 'image_url',
                        image_url: {
                            url: `data:${img.inlineData.mimeType || 'image/jpeg'};base64,${img.inlineData.data}`
                        }
                    });
                }
            }
            userContent.push({ type: 'text', text: prompt });
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: userContent }],
                response_format: { type: 'json_object' }
            });
            const fbText = completion.choices?.[0]?.message?.content;
            if (fbText) return JSON.parse(fbText);
        } catch (openAiErr) {
            console.error('[analyzeMood] OpenAI fallback failed:', openAiErr.message);
        }
    }

    return {
        moodSeed: "Cinematic, high-contrast studio lighting with natural ambient accents.",
        palette: ["#1A1A1A", "#FFFFFF", "#FF5733", "#33FF57", "#3357FF"],
        aestheticLabels: ["cinematic", "commercial", "studio"]
    };
}
