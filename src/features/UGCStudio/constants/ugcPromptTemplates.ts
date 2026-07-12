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
- Raw smartphone camera look: Shot on a regular smartphone (such as an iPhone rear camera), wide-angle lens, direct sensor capture, authentic handheld micro-shake. No cinematic lenses, anamorphic squeeze, bokeh depth, or studio lenses.
- Raw skin realism: Creator's face must show 100% realistic, raw details with visible open skin pores, fine lines, natural skin texture, and minor blemishes. Absolutely NO beauty filters, NO skin smoothing, NO digital airbrushing, and NO makeup.
- Natural human blinking and micro-expressions.
- Natural breathing and subtle head movement.
- Realistic finger motion and object interaction.
- Accurate eye contact while speaking.
- No exaggerated acting.
- No AI artifacts, morphing, identity drift, or hand deformation.
- Consistent camera exposure and white balance.
- Preserve product branding exactly.
- NO UI OVERLAYS: Do not render any phone screens, camera borders, recording icons, social media UI, or digital overlays in the video itself. The output must be pure camera footage.`;

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
  firstFrameRefTag?: string;  // e.g. "<IMAGE_REF_3>" (the scene's custom ref image)
  isBRollMontage?: boolean;
  bRollType?: string;
}

export function buildScenePrompt(p: BuildScenePromptParams): string {
  const template = UGC_CATEGORY_TEMPLATES[p.category] || UGC_CATEGORY_TEMPLATES.general;

  // Reference declarations — natural language, no jargon
  const refLines: string[] = [];

  if (p.hasFirstFrame && p.firstFrameRefTag) {
    refLines.push(
      `- ${p.firstFrameRefTag} is the custom starting frame and reference image for this specific scene. The video's opening frame must animate directly from the static visual state of ${p.firstFrameRefTag}.`
    );
  } else if (p.sceneIdx === 0 && p.hasFirstFrame) {
    refLines.push(
      "- The video's opening frame should visually match and animate from the provided starting reference image."
    );
  }

  if (p.hasCharacterRef) {
    refLines.push(
      `- ${p.characterRefTag} is the creator identity reference. Use this image only as a guide for the creator's facial features, hairstyle, skin tone, and clothing. Do not start the video with this image unless it matches ${p.firstFrameRefTag || 'the starting frame'}.`
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
  if (p.sceneIdx > 0 && !p.hasFirstFrame) {
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

  if (p.isBRollMontage) {
    return `Create a ${p.sceneDurationSec}-second ultra-realistic vertical UGC video. ${sceneContext}

${refLines.join('\n')}

Category focus: B-Roll / Product Montage. ${p.bRollType ? `Specifically focus on: **${p.bRollType}**.` : ''}

IMPORTANT: This is a cinematic B-roll / Montage scene. NO talking head. NO spoken dialogue.

Style:
Authentic smartphone front-camera visual look. Pure camera footage ONLY (no digital overlays, no recording icons, no phone UI). Natural handheld movement but smooth and deliberate. Real indoor or natural lighting only. Show the product in its best light. No beauty filter, no cinematic grading, no artificial sharpening. Keep facial details realistic.

Dialogue for this scene:
NO DIALOGUE OR VOICE-OVER. The character must NOT speak to the camera. Use any provided script text ("${p.dialog}") purely as thematic inspiration for the visual actions.

Break this scene into sequential shots covering the full ${p.sceneDurationSec} seconds. You have complete freedom to define the timecode timestamps (e.g., [0-4s], [4-8s]) based on visual pacing.

For each shot segment:
- Write the entire segment description as ONE unified paragraph. Blend all descriptions (camera movement, visual action, sound effects) into one block of text.
- Mix extreme close-ups on product details/textures, creator's hands interacting with the product, and cinematic establishing shots of the location.
- Creator's face can be shown reacting or using the product, but they MUST NOT be speaking.

UGC DIRECTOR BRIEF:
- Act as a top-tier director for a UGC ad. Thoroughly analyze the provided Product scan data, Character, and Location.
- Purposefully design the multi-shot layers and B-roll based on the product details ("${p.productDetails}") and context. Do NOT give random shots. Every shot must be purposefully selected to showcase the product.
- Sound: rich diegetic sound effects (foley) matching the actions (e.g., lid popping, liquid pouring, fabric swishing, ambient room tone). NO music.

${GLOBAL_UGC_STYLE_BLOCK}

Return only the final prompt text, structured with your custom timecode labels. No introductory or explanatory text. Write each timecode as one continuous block.`;
  }

  return `Create a ${p.sceneDurationSec}-second ultra-realistic vertical UGC video. ${sceneContext}

${refLines.join('\n')}

Category focus: ${template.name}. ${template.instruction}

IMPORTANT: This is a ${template.name} video. Every shot must stay strictly within this category — do not introduce actions, objects, or product-interaction details from any other category (e.g. no skincare pump/dispense/apply-to-face actions unless this actually IS a skincare video).

Style:
Authentic smartphone front-camera visual look. Pure camera footage ONLY (no digital overlays, no recording icons, no phone UI). Natural handheld movement with subtle micro-shake. Real indoor or natural lighting only. No beauty filter, no cinematic grading, no artificial sharpening, no film grain. Keep facial details realistic with natural skin texture.

Dialogue for this scene — this is the complete, mandatory script. Every single word below MUST be spoken somewhere in this video, in this exact order. Do not skip, cut, shorten, drop, or omit any sentence or phrase:
"${p.dialog}"

Break this scene into sequential shots covering the full ${p.sceneDurationSec} seconds. You have complete freedom to define the timecode timestamps (e.g., [0-4s], [4-8s], [8-10s]) based on how long each physical action and spoken dialogue block takes.

For each shot segment:
- Write the entire segment description as **ONE unified paragraph**. Do NOT use sub-headers (like "Visuals:", "Dialogue:", "Action:", "Audio:") or nested bullet points. Blended all descriptions (camera movement, visual action, dialogue narration, sound effects) into one block of text.
- Focus on exactly ONE simple physical action per segment (e.g. only holding the product, or only opening the cap, or only applying/using). Do NOT pack multiple complex motions together.
- Keep the visual pacing slow, steady, and realistic.
- **Handling Dialogue Flow**: Ensure dialogue flows naturally. Never cut or split a sentence mid-word, mid-phrase, or on trailing articles/prepositions (e.g. ending a segment on "the", "and", "a", "of"). Complete the phrase or sentence fully within the current segment before transitioning to the next shot.
- **ACTION & B-ROLL VOICE-OVER RULE**: If the creator is performing any physical action (e.g. eating, applying skincare, reacting, handling a product) OR if it is a close-up/B-roll shot, the assigned dialogue MUST STILL continue uninterrupted as a natural voice-over. Never pause, skip, shorten, or drop any spoken dialogue during actions or B-rolls; carry the speech over the visual naturally.
- If the creator is directly on-camera (face visible) and not performing an action, they speak their dialogue exactly, word-for-word, in sync with natural mouth movement.
- Use natural transitions like "the camera naturally reframes to" or "the camera shifts to show" rather than abrupt "cut to" transitions to maintain a smooth, continuous vlogging style.

Audio:
Natural room ambience only. Realistic sound matching each action (pouring, movement, breathing, handling as appropriate). No background music.

${GLOBAL_UGC_STYLE_BLOCK}

Return only the final prompt text, structured with your custom timecode labels. No introductory or explanatory text, no headers, no list sub-headers, no rule explanations. Write each timecode as one continuous block.`;
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

// ── 6. Motion-Match Prompt for Omni Flash video editing ───────────────────────
// Instructs Omni Flash to use a reference video's motion as a blueprint and
// swap the creator identity, product, and location with the provided references.

export interface BuildVideoRefPromptParams {
  dialog: string;             // Full dialogue for this scene
  sceneDurationSec: number;   // Duration of this scene in seconds
  characterRefTag: string;    // e.g. "<IMAGE_REF_0>"
  productRefTag: string;      // e.g. "<IMAGE_REF_1>"
  locationRefTag?: string;    // e.g. "<IMAGE_REF_2>" or ''
  hasCharacterRef: boolean;
  hasProductRef: boolean;
  hasLocationRef: boolean;
  productDetails?: string;
  scenePrompt?: string;       // Optional detailed scene prompt
}

export function buildVideoRefPrompt(p: BuildVideoRefPromptParams): string {
  const charInstruction = p.hasCharacterRef
    ? `Replace the person in the reference video with ${p.characterRefTag} — match their exact face, hairstyle, skin tone, and clothing from ${p.characterRefTag}. Keep every movement, gesture, and head position from the reference video exactly.`
    : 'Keep the creator identity as-is from the reference video.';

  const productInstruction = p.hasProductRef
    ? `Swap any product or object held in the reference video with ${p.productRefTag}. Preserve the exact branding, label design, colors, and proportions of ${p.productRefTag}. The hand grip and product position should match the reference video.`
    : '';

  const locationInstruction = p.hasLocationRef && p.locationRefTag
    ? `Replace the background and environment with the setting from ${p.locationRefTag}. Keep the lighting direction and intensity similar to the reference video but adapt it to the new environment.`
    : 'Preserve the background and environment from the reference video.';

  const promptToCheck = `${p.scenePrompt || ''} ${p.dialog || ''}`.toLowerCase();
  const hasVoiceover = promptToCheck.includes('voice-over') ||
                       promptToCheck.includes('voiceover') ||
                       promptToCheck.includes('off-screen') ||
                       promptToCheck.includes('narration') ||
                       promptToCheck.includes('narrating') ||
                       promptToCheck.includes('b-roll') ||
                       promptToCheck.includes('broll');

  const dialogueInstruction = hasVoiceover
    ? `The creator's voice is heard speaking this dialogue as an off-screen voice-over/narration with no mouth/lip movement during B-roll/close-up segments. CRITICAL: every single word of the dialogue must be fully spoken in the audio from start to finish without skipping, shortening, or omitting, even if the creator is performing actions like eating or applying skincare: "${p.dialog}"`
    : `The creator says this dialogue in exact sync with the original video's lip movements. CRITICAL: every single word of the dialogue must be fully spoken in the audio from start to finish without skipping, shortening, or omitting, even if the creator is performing actions like eating or applying skincare: "${p.dialog}"`;

  return `Edit this reference video using Gemini Omni Flash. This is a ${p.sceneDurationSec}-second UGC-style product ad clip.

MOTION REFERENCE RULE: Use the reference video ONLY as a motion blueprint — preserve every body movement, facial expression timing, head nod, eye blink, hand gesture, and camera micro-shake from the reference video EXACTLY. Do NOT change the timing, pacing, or motion in any way.

IDENTITY SWAP:
${charInstruction}

PRODUCT SWAP:
${productInstruction}

ENVIRONMENT:
${locationInstruction}

DIALOGUE:
${dialogueInstruction}

CAMERA & STYLE:
Authentic handheld smartphone camera aesthetic. Wide-angle lens, direct raw sensor capture look, natural micro-shake. Natural indoor room lighting only. No beauty filters, no skin smoothing, no digital airbrushing. Keep facial details 100% raw with visible open skin pores and natural textures.

${GLOBAL_UGC_STYLE_BLOCK}

Keep everything else the same as the reference video. Return only the edited video, no commentary.`;
}
