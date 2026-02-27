// ─────────────────────────────────────────────────────────────
//  wardrobeAnalyzerService.js
// ─────────────────────────────────────────────────────────────

import { GoogleGenerativeAI } from '@google/generative-ai';
import multer from 'multer';
import fs from 'fs';
import os from 'os';

// Initialize SDK
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Multer Config for local temp storage (up to 20MB)
export const wardrobeUploadMiddleware = multer({
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

// ── Placement rules per category ──────────────────────────────
const PLACEMENT_RULES = {
    eyewear: { worn: 'worn on face, resting on nose', closeUp: 'extreme close-up of face showing sunglasses clearly, model looking directly at camera' },
    watch: { worn: 'worn on left wrist', closeUp: 'extreme close-up of wrist and watch face, arm elegantly posed' },
    belt: { worn: 'worn around waist over outfit', closeUp: 'medium shot focused on waist and belt buckle detail' },
    jacket: { worn: 'worn over shoulders as outerwear', closeUp: 'medium shot showing jacket lapels and fabric texture' },
    shoes: { worn: 'worn on feet', closeUp: 'low angle shot showing shoes prominently, model standing' },
    jewelry: { worn: 'worn as body accessory', closeUp: 'extreme close-up of the jewelry piece against skin' },
    bag: { worn: 'carried on shoulder or held in hand', closeUp: 'medium shot with bag prominently displayed, model posed' },
    hat: { worn: 'worn on head', closeUp: 'medium close-up framing face and hat together' },
    top: { worn: 'worn on upper body', closeUp: 'medium shot showing top clearly, upper body framing' },
    bottom: { worn: 'worn on lower body', closeUp: 'full body shot showing bottom garment clearly' },
};

// ── Prompt Builder ────────────────────────────────────────────
function buildWardrobePrompt(category) {
    const placement = PLACEMENT_RULES[category.toLowerCase()] || { worn: 'worn on body', closeUp: 'close-up showing item clearly' };

    return `
You are an expert fashion stylist and AI prompt engineer.
Analyze this ${category} item image and describe it precisely.

The item will be placed on a model character in an AI-generated photo.
This is a WARDROBE item — it is WORN ON THE BODY, not held as a product.
Placement: ${placement.worn}

Output the data matching this JSON schema:
{
  "name": "Specific item name (e.g., 'Oversized black acetate sunglasses')",
  "category": "${category}",
  "brand": "Brand name if visible, else null",
  "color": "Primary color(s)",
  "material": "Material/fabric (e.g., 'leather', 'gold metal')",
  "style": "Style descriptor (e.g., 'luxury', 'streetwear')",
  "placement": "${placement.worn}",
  "wearPrompt": "Short prompt describing how this item appears when worn (e.g., 'wearing oversized black sunglasses resting on nose'). Start with 'wearing'. Under 20 words.",
  "closeUpPrompt": "Full image generation prompt for a dedicated close-up shot of JUST THIS ITEM on the model. ${placement.closeUp}. Include lighting suggestion. Under 60 words.",
  "fullBodyPrompt": "How to describe this item in a full body or medium shot where the whole outfit is visible. Under 25 words."
}
`;
}

// ── Core Analysis Function ────────────────────────────────────
export async function analyzeWardrobeItem(tempFilePath, mimeType, category) {
    try {
        const imageData = fs.readFileSync(tempFilePath);
        const base64 = imageData.toString('base64');

        // UPGRADE: Using gemini-2.5-flash with STRICT JSON output forced
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                responseMimeType: "application/json" // This prevents Markdown/Regex issues!
            }
        });

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: mimeType || 'image/jpeg',
                    data: base64,
                },
            },
            { text: buildWardrobePrompt(category) },
        ]);

        // Because responseMimeType is set, we can just parse the raw text directly
        return JSON.parse(result.response.text());

    } finally {
        // Always clean up the temp file to keep the server lean
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
}

// ── Express Route ─────────────────────────────────────────────
export async function analyzeWardrobeRoute(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Missing wardrobe image attachment' });
        }

        const safeBody = (req.body && typeof req.body === 'object') ? req.body : {};
        const category = safeBody.category || 'jewelry';

        const item = await analyzeWardrobeItem(req.file.path, req.file.mimetype, category);

        if (!item) {
            throw new Error('Analysis service returned empty result');
        }

        return res.status(200).json({ success: true, item });
    } catch (err) {
        console.error('[WardrobeAnalyzer] Route Error:', err);

        // Fallback cleanup if file exists
        if (req.file?.path && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) { }
        }

        return res.status(500).json({
            success: false,
            error: 'Wardrobe analysis failed',
            message: err.message || 'Unknown internal error'
        });
    }
}
