// ─────────────────────────────────────────────────────────────
//  locationAnalyzerService.js
// ─────────────────────────────────────────────────────────────

import { GoogleGenerativeAI } from '@google/generative-ai';
import multer from 'multer';
import fs from 'fs';
import os from 'os';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// ── Multer — same config as wardrobeAnalyzerService ───────────
export const locationUploadMiddleware = multer({
    dest: os.tmpdir(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Images only'));
        }
    },
}).single('image');

// ── Prompt builder ────────────────────────────────────────────
function buildLocationPrompt() {
    return `
You are an expert Hollywood location scout and cinematic AI prompt engineer.
Analyze the uploaded image of a location/environment.
Extract the core visual atmosphere, lighting, and setting.

Output the data matching this EXACT JSON schema — no markdown, no explanation:
{
  "name": "Short evocative name (e.g., 'Neon Cyberpunk Alley', 'Brutalist Coastal Pier', 'Sunlit Parisian Café')",
  "settingType": "Interior or Exterior",
  "timeOfDay": "Golden Hour | Blue Hour | Night | Midday | Overcast | Dawn | Studio Lighting",
  "lighting": "Describe the key lighting (e.g., 'High-contrast neon reflections from wet pavement', 'Soft diffused window light from the left')",
  "atmosphere": "The mood in 3-5 words (e.g., 'Moody and dangerous', 'Warm and intimate', 'Cold and architectural')",
  "colorGrade": "Dominant color palette (e.g., 'Desaturated blues and greys with magenta neon accents')",

  "establishingPrompt": "A wide-angle cinematic prompt describing the FULL environment with [CHARACTER] present. Used for wide establishing shots where the whole location is visible. Start with 'Wide shot —' or 'Set in a...'. Under 30 words.",

  "backgroundPrompt": "How this location looks when it is OUT OF FOCUS behind [CHARACTER] in a medium or close-up portrait shot. ONLY describe the blurred background elements — never mention the character. Start with 'blurred'. Under 20 words. Example: 'blurred neon street lights and wet pavement reflections, shallow depth of field, bokeh'"
}
`;
}

// ── Core analysis ──
export async function analyzeLocationItem(tempFilePath, mimeType) {
    try {
        const imageData = fs.readFileSync(tempFilePath);
        const base64 = imageData.toString('base64');

        // Gemini 2.5 Flash + strict JSON mode
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                responseMimeType: 'application/json',
            },
        });

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: mimeType || 'image/jpeg',
                    data: base64,
                },
            },
            { text: buildLocationPrompt() },
        ]);

        return JSON.parse(result.response.text());

    } finally {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try { fs.unlinkSync(tempFilePath); } catch (e) { }
        }
    }
}

// ── Express route ──
export async function analyzeLocationRoute(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Missing location image attachment' });
        }

        const locationData = await analyzeLocationItem(req.file.path, req.file.mimetype);

        if (!locationData) {
            throw new Error('Analysis service returned empty result');
        }

        return res.status(200).json({ success: true, location: locationData });
    } catch (err) {
        console.error('[LocationAnalyzer] Route Error:', err);

        if (req.file?.path && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) { }
        }

        return res.status(500).json({
            success: false,
            error: 'Location analysis failed',
            message: err.message || 'Unknown internal error'
        });
    }
}
