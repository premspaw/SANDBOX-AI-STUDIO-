import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

/**
 * Generate music/audio scores using Gemini's generative capabilities.
 * This creates a text-based music prompt that can be fed to downstream audio generators.
 * @param {string} prompt - Describes the desired music style and mood
 * @param {string} style - Style preset (SYNTHWAVE, ORCHESTRAL, LOFI, etc.)
 * @param {number} duration - Desired duration in seconds
 */
export const generateMusicScore = async (prompt, style = 'SYNTHWAVE_DRIVE', duration = 10) => {
    try {
        console.log(`[MUSIC] Generating score: ${style} (${duration}s) — "${prompt.substring(0, 40)}..."`);

        // Use Gemini to generate a detailed music composition instruction
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a professional film composer and sound designer. Generate a detailed music composition description for the following request.

STYLE: ${style}
DURATION: ${duration} seconds
MOOD/CONTEXT: ${prompt}

Respond in JSON format with:
{
  "title": "A short title for the score",
  "description": "A 2-3 sentence description of the composition",
  "bpm": <number>,
  "key": "<musical key>",
  "instruments": ["list", "of", "instruments"],
  "layers": [
    { "name": "layer name", "description": "what this layer does", "timing": "when it enters" }
  ],
  "dynamics": "description of volume/intensity changes over time"
}

Return ONLY valid JSON.`,
        });

        const text = response.text;
        let scoreData;
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            scoreData = JSON.parse(jsonMatch[0]);
        } catch {
            scoreData = { title: style, description: text, bpm: 120, key: 'Am' };
        }

        console.log(`[MUSIC] Score generated: "${scoreData.title}"`);
        return {
            score: scoreData,
            style,
            duration,
            generated: true
        };
    } catch (err) {
        console.error('[MUSIC] Generation failed:', err);
        return null;
    }
};
