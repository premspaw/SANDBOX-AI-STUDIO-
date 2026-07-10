// ─── UGC Prompt Templates ────────────────────────────────────────────────────
// Clean, Omni Flash-optimised prompt building.
// No jargon, no meta-labels — every string here becomes part of the actual
// generation prompt sent to the model.

// ── 1. Category-specific shot direction ──────────────────────────────────────

export interface UGCCategoryTemplate {
  name: string;
  instruction: string;
}

export const UGC_CATEGORY_TEMPLATES: Record<string, UGCCategoryTemplate> = {
  general: {
    name: 'General Lifestyle',
    instruction:
      'Creator talking naturally to camera, using the product in a real moment, then a satisfying close-up of the product itself.',
  },
  skincare: {
    name: 'Skincare / Cosmetics',
    instruction:
      'Close-up product texture, creator applying it to skin, a genuine reaction to how it feels, ending on the result — glowy, dewy skin.',
  },
  fashion: {
    name: 'Fashion Try-On',
    instruction:
      'Try-on moment, close-up on fabric and stitching detail, creator moving naturally to show fit and drape, ending on a styled full-look moment.',
  },
  tech: {
    name: 'Tech Gadget',
    instruction:
      'Unboxing or first-touch moment, hands-on demonstration of a key feature, macro close-up on build quality and detail.',
  },
  lifestyle_routine: {
    name: 'Daily Routine / Lifestyle',
    instruction:
      'Product folded naturally into a daily routine or ritual moment, warm natural light, ending on a calm satisfied beat.',
  },
  food_beverage: {
    name: 'Food & Beverage',
    instruction:
      'Pour or plating moment, a genuine bite or sip reaction, close-up on texture/ingredients, ending on a styled presentation shot.',
  },
  fitness_supplements: {
    name: 'Fitness / Supplements',
    instruction:
      'Creator taking the product, a burst of energy or mid-activity moment, close-up on packaging, ending on a satisfied post-effort beat.',
  },
  jewelry_accessories: {
    name: 'Jewelry / Accessories',
    instruction:
      'Macro shot catching light off the piece, creator putting it on, natural hand/wrist movement showing detail, ending on a styled full look.',
  },
  home_kitchen: {
    name: 'Home & Kitchen',
    instruction:
      'Product solving a real task in use, a visible before/after or result, close-up on build/design quality, ending styled in the home setting.',
  },
  pet_products: {
    name: 'Pet Products',
    instruction:
      'Pet reacting to or using the product, close-up on comfort/enjoyment, owner demonstrating it, ending on a warm pet-and-owner moment.',
  },
  baby_kids: {
    name: 'Baby / Kids Products',
    instruction:
      "Gentle demonstration with the child, close-up on safety/material detail, parent's reassured reaction, ending on a warm family moment.",
  },
  clinic_service: {
    name: 'Clinic / Medical Service',
    instruction:
      'Welcoming clinic environment, a consultation moment (no graphic medical detail), a confident patient reaction, ending on a clear results-oriented close.',
  },
  subscription_app: {
    name: 'App / Subscription Service',
    instruction:
      'Creator opening the app on screen, a key feature demo with genuine reaction, a problem being solved, ending on a clear call-to-action beat.',
  },
};

// ── 2. Auto-detect category from product text ─────────────────────────────────

export function detectUgcCategory(
  productName: string | undefined,
  description: string | undefined,
  context: string
): string {
  const text = `${productName || ''} ${description || ''} ${context}`.toLowerCase();
  if (/serum|cream|skincare|lotion|cosmetic|lipstick|makeup|spf|sunscreen/.test(text))
    return 'skincare';
  if (/dress|outfit|apparel|shirt|jacket|shoe|sneaker|fashion|wear|clothing/.test(text))
    return 'fashion';
  if (/phone|gadget|headphone|charger|laptop|device|electronic|earbuds/.test(text))
    return 'tech';
  if (/food|drink|snack|coffee|tea|juice|beverage|brew|protein bar|smoothie/.test(text))
    return 'food_beverage';
  if (/protein|supplement|gym|fitness|workout|whey|pre-workout|creatine/.test(text))
    return 'fitness_supplements';
  if (/jewelry|necklace|ring|earring|bracelet|watch|pendant/.test(text))
    return 'jewelry_accessories';
  if (/kitchen|home|appliance|cookware|furniture|decor/.test(text))
    return 'home_kitchen';
  if (/pet|dog|cat|puppy|kitten|paw/.test(text))
    return 'pet_products';
  if (/baby|infant|toddler|kids|child|newborn/.test(text))
    return 'baby_kids';
  if (/clinic|hair transplant|treatment|dermat|therapy|dr\.|doctor|medical/.test(text))
    return 'clinic_service';
  if (/app|subscription|saas|software|platform|tool/.test(text))
    return 'subscription_app';
  return 'general';
}

// ── 3. Global UGC style block — appended to every generation prompt ───────────
// Improves Omni Flash identity consistency and removes common artefacts.

export const GLOBAL_UGC_STYLE_BLOCK = `UGC Style Requirements:
- Single real person only.
- Natural human blinking and micro-expressions.
- Natural breathing and subtle head movement.
- Realistic finger motion and object interaction.
- Accurate eye contact while speaking.
- No exaggerated acting.
- No AI artifacts, morphing, identity drift, or hand deformation.
- Consistent camera exposure and white balance.
- Preserve product branding exactly.`;

// ── 4. Build a per-scene Omni Flash prompt ────────────────────────────────────

export interface BuildScenePromptParams {
  dialog: string;             // Dialogue for THIS scene only
  sceneIdx: number;           // 0-based
  totalScenes: number;
  sceneDurationSec: number;   // Duration of this clip in seconds (e.g. 10)
  totalDurationSec: number;   // Full stitched video duration (e.g. 30)
  productDetails: string;
  category: string;           // from detectUgcCategory
  hasCharacterRef: boolean;
  hasProductRef: boolean;
  hasLocationRef: boolean;
  hasFirstFrame: boolean;
  characterRefTag: string;    // e.g. "<IMAGE_REF_0>"
  productRefTag: string;      // e.g. "<IMAGE_REF_1>"
  locationRefTag: string;     // e.g. "<IMAGE_REF_2>" or ''
}

export function buildScenePrompt(p: BuildScenePromptParams): string {
  const template = UGC_CATEGORY_TEMPLATES[p.category] || UGC_CATEGORY_TEMPLATES.general;

  // Reference declarations — natural language, no jargon
  const refLines: string[] = [];
  if (p.hasFirstFrame && p.sceneIdx === 0) {
    refLines.push(
      "- The video's opening frame should visually match the provided starting reference image."
    );
  }
  if (p.hasCharacterRef) {
    refLines.push(
      `- ${p.characterRefTag} is the creator identity reference. Preserve the exact face, hairstyle, skin tone, proportions, and clothing consistently throughout.`
    );
  }
  if (p.hasProductRef) {
    refLines.push(
      `- ${p.productRefTag} is the exact product reference. Preserve the packaging, label, colors, proportions, branding, and texture exactly.`
    );
  }
  if (p.hasLocationRef && p.locationRefTag) {
    refLines.push(
      `- ${p.locationRefTag} is the location/background reference. Keep the setting consistent with it.`
    );
  }
  if (p.sceneIdx > 0) {
    refLines.push(
      '- This scene picks up visually from where the previous scene ended. Do not restart from the beginning.'
    );
  }

  // Timecode partitioning — relative within this clip (always starts from 0s)
  const step = p.sceneDurationSec > 20 ? 5 : 3;
  const timecodes: string[] = [];
  for (let t = 0; t < p.sceneDurationSec; t += step) {
    const end = Math.min(t + step, p.sceneDurationSec);
    timecodes.push(`[${t}-${end}s]`);
  }

  const sceneContext =
    p.totalScenes > 1
      ? `This is scene ${p.sceneIdx + 1} of ${p.totalScenes} in a ${p.totalDurationSec}-second stitched video.`
      : `This is a ${p.totalDurationSec}-second video.`;

  return `Create a ${p.sceneDurationSec}-second ultra-realistic vertical UGC video. ${sceneContext}

${refLines.join('\n')}

Category focus: ${template.name}. ${template.instruction}

Style:
Authentic iPhone front-camera aesthetic. Natural handheld movement with subtle micro-shake. Real indoor or natural lighting only. No beauty filter, no cinematic grading, no artificial sharpening, no film grain. Keep facial details realistic with natural skin texture.

Dialogue for this scene — say every word exactly without skipping:
"${p.dialog}"

Break this scene into sequential shots using this timecode structure: ${timecodes.join(', ')}

For each shot:
- Focus on exactly ONE simple physical action per timecode block (e.g. only holding the product, or only opening the cap, or only applying/using). Do NOT pack multiple complex motions together.
- Keep the visual pacing slow and steady. Never compress a multi-step routine (like unboxing, opening, applying, and reacting) into a short 10-second scene.
- If the creator is on camera (face visible), they speak their dialogue exactly, word-for-word, in sync with natural mouth movement.
- If a shot is a close-up or B-roll with no face visible, the dialogue MUST continue in the background as a continuous natural voice-over. NEVER skip, shorten, or drop any spoken dialogue.
- Use natural transitions like "the camera naturally reframes to" or "the camera shifts to show" rather than abrupt "cut to" transitions to maintain a smooth, continuous vlogging style.

Audio:
Natural room ambience only. Realistic sound matching each action (pouring, movement, breathing, handling as appropriate). No background music.

${GLOBAL_UGC_STYLE_BLOCK}

Return only the final prompt text, structured with timecode labels. No introductory or explanatory text, no headers, no rule explanations.`;
}

// ── 5. Validate that required reference tags survived generation ──────────────

export interface PromptValidationResult {
  valid: boolean;
  missing: string[];
}

export function validateScenePrompt(
  promptText: string,
  hasCharacterRef: boolean,
  characterRefTag: string,
  hasProductRef: boolean,
  productRefTag: string
): PromptValidationResult {
  const missing: string[] = [];
  if (hasCharacterRef && !promptText.includes(characterRefTag)) {
    missing.push(`${characterRefTag} (creator identity)`);
  }
  if (hasProductRef && !promptText.includes(productRefTag)) {
    missing.push(`${productRefTag} (product)`);
  }
  return { valid: missing.length === 0, missing };
}
