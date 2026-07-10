// ─── VIDEO STYLES & SCENE STYLES ──────────────────────────────────────────────
// Extracted from UGC.tsx — pure constants, no React dependency.

export interface VideoStyle {
  name: string;
  icon: string;
  description: string;
  modifier: string;
}

export interface SceneStyle {
  name: string;
  group: string;
  description: string;
  promptModifier: string;
}

export const VIDEO_STYLES: Record<string, VideoStyle> = {
  calm: {
    name: 'Calm & Natural',
    icon: '😌',
    description: 'Gentle, conversational',
    modifier:
      'calm and natural delivery, subtle hand gestures, gentle pacing, conversational tone, minimal dramatic movements, soft eye contact',
  },
  energetic: {
    name: 'Energetic',
    icon: '⚡',
    description: 'Fast-paced, expressive',
    modifier:
      'energetic and dynamic performance, fast-paced delivery, expressive hand gestures, animated facial expressions, vibrant energy',
  },
  action: {
    name: 'Action-Packed',
    icon: '🎬',
    description: 'Dramatic, intense',
    modifier:
      'action-oriented performance, dramatic movements, intense expressions, powerful gestures, high energy, dynamic delivery',
  },
  professional: {
    name: 'Professional',
    icon: '💼',
    description: 'Corporate, confident',
    modifier:
      'professional and polished delivery, confident posture, measured gestures, corporate aesthetic, business-appropriate tone',
  },
  casual: {
    name: 'Casual & Fun',
    icon: '😄',
    description: 'Relaxed, friendly',
    modifier:
      'casual and fun atmosphere, relaxed demeanor, spontaneous gestures, friendly smile, approachable vibe',
  },
  storytelling: {
    name: 'Storytelling',
    icon: '📖',
    description: 'Narrative-driven',
    modifier:
      'narrative storytelling style, expressive delivery with emotional range, thoughtful pauses, varied pacing, engaging eye contact',
  },
};

export const SCENE_STYLES: Record<string, SceneStyle> = {
  // Talking
  normal_talking: {
    name: '🎙️ Normal Talking',
    group: 'Talking',
    description: 'Direct-to-cam, relaxed lip-sync',
    promptModifier:
      'direct-to-camera, relaxed lip-sync, creator talking directly to the camera in a natural environment',
  },
  walk_talk: {
    name: '🚶 Walk & Talk',
    group: 'Talking',
    description: 'Creator walking while speaking, handheld vlog',
    promptModifier:
      'handheld vlog style, creator walking while speaking to camera, natural background movement, slight camera bobbing',
  },
  reaction_shot: {
    name: '😲 Reaction Shot',
    group: 'Talking',
    description: 'Wide-eyed surprise/delight reacting to product',
    promptModifier:
      'wide-eyed surprise and delight reacting to product, expressive positive emotion, dynamic close-up',
  },
  mirror_selfie: {
    name: '🪞 Mirror Selfie',
    group: 'Talking',
    description: 'Creator filming in mirror, tilted phone, casual',
    promptModifier:
      'creator filming a mirror selfie, tilted phone visible, casual natural lighting, authentic home environment',
  },
  // Camera Cuts
  fast_cut: {
    name: '✂️ Fast Cut',
    group: 'Camera Cuts',
    description: 'Rapid angle switches every 1-2 sec, high energy',
    promptModifier:
      'high energy video with fast cuts, rapid angle switches every 1 to 2 seconds, dynamic pacing',
  },
  dramatic_zoom: {
    name: '🔍 Dramatic Zoom',
    group: 'Camera Cuts',
    description: 'Slow cinematic push-in zoom, suspense/hook',
    promptModifier:
      'slow cinematic push-in zoom, dramatic camera push, creating suspense and hook effect, focused framing',
  },
  pov_shot: {
    name: '👆 POV Shot',
    group: 'Camera Cuts',
    description: 'First-person view looking down at product in hand',
    promptModifier:
      'first-person point-of-view POV shot, looking down at product in hands, hands interacting with product naturally',
  },
  // Product Focus
  cinematic_b_roll: {
    name: '🎥 Cinematic B-Roll',
    group: 'Product Focus',
    description: 'Slow-mo glide, bokeh, luxury reveal',
    promptModifier:
      'slow-motion glide, cinematic b-roll, high quality bokeh, luxury product reveal, professional lighting',
  },
  close_up_detail: {
    name: '🔬 Close-Up Detail',
    group: 'Product Focus',
    description: 'Extreme macro of product texture/color',
    promptModifier:
      'extreme macro close-up detail, showing texture and color of product, sharp focus on details, cinematic depth',
  },
  unboxing: {
    name: '📦 Unboxing',
    group: 'Product Focus',
    description: 'Overhead hands-opening reveal, surprise reaction',
    promptModifier:
      'overhead shot of hands-opening reveal, unboxing experience, surprise and delight reaction',
  },
  before_after: {
    name: '🔄 Before & After',
    group: 'Product Focus',
    description: 'Sequential transformation reveal with contrast',
    promptModifier:
      'sequential before and after transformation reveal, clear contrast and transition, split screen or side-by-side style comparison',
  },
  // Educational
  tutorial_step: {
    name: '🎓 Tutorial Step',
    group: 'Educational',
    description: 'Instructional hold-and-point educational framing',
    promptModifier:
      'instructional hold-and-point educational framing, step-by-step tutorial demo, clear actions and explanations',
  },
  dynamic_action: {
    name: '⚡ Dynamic Action',
    group: 'Educational',
    description: 'Handheld physical demo, shaky energy',
    promptModifier:
      'dynamic action, handheld physical demo, shaky high-energy camera movement, active product demonstration',
  },
};
// ─── MULTI-SHOT PRESETS ─────────────────────────────────────────────────────
// Each preset is a curated UGC director template that drives the full
// generateAllSplitPrompts pipeline.  The `buildPrompt` function receives
// scene-level context and returns a Gemini Omni Flash-compatible prompt string.

export interface MultiShotPreset {
  id: string;
  label: string;
  emoji: string;
  description: string;
  /** Builds the AI meta-prompt sent to Gemini to generate the video prompt */
  buildPrompt: (ctx: MultiShotPromptContext) => string;
}

export interface MultiShotPromptContext {
  dialog: string;            // Dialogue for THIS scene
  sceneIdx: number;          // 0-based index of this scene
  totalScenes: number;       // Total number of split scenes
  sceneDurationSec: number;  // Duration of this single scene in seconds
  productDetails: string;    // Product context string
  instructions: string[];    // Reference image tag lines
  refMappings: Record<string, string>; // { character, product, location, firstFrame }
  selectedSceneStyle: string;
  SCENE_STYLES: Record<string, SceneStyle>;
}

// ─── Shared realism block injected into every preset ────────────────────────
const REALISM_BLOCK = `
HYPER-REALISM RULES (non-negotiable for every creator face shot):
- Shot on a smartphone (iPhone rear camera). Handheld, slightly imperfect framing. NOT cinematic.
- Creator's skin: visible skin pores, natural skin texture, subtle imperfections, no smoothing, no beauty filter, no makeup.
- Natural home lighting only: window light, overhead LED, or ambient room light. Never studio lighting.
- NO cinematic elements: no 85mm portrait compression, no creamy bokeh, no lens flares, no film grain.
- REAL-WORLD PHYSICS: liquids pour and splash under gravity; fabrics drape naturally; objects have solid weight.
- When creator is on-screen (face visible): MUST lip-sync the dialogue exactly, word-for-word, to camera.
- When shot is B-roll / close-up / product shot (no face): dialogue continues as VOICE-OVER in background.
- ALL dialogue in this scene MUST be fully spoken. Do not skip, shorten, or paraphrase any word.
- Do NOT describe mouth actions (sipping, eating) simultaneously with lip-sync. Separate them: act first → lower to camera → speak.`;

// ─── Shared timecode instruction ─────────────────────────────────────────────
function timecodeInstruction(durationSec: number): string {
  const step = 3;
  const segs: string[] = [];
  for (let t = 0; t < durationSec; t += step) {
    segs.push(`[${t}-${Math.min(t + step, durationSec)}s]`);
  }
  return `Partition this scene into sequential shots using EXACTLY this timecode structure: ${segs.join(' ... ')} ...
Write each timecode block as ONE continuous paragraph integrating: visual description + camera movement + dialogue delivery + sound effects.
DO NOT use subheaders (Shot:, Camera:, Dialogue:, Audio:). Everything in one paragraph per block.`;
}

function firstFrameRule(refMappings: Record<string, string>, sceneIdx: number): string {
  if (!refMappings.firstFrame) return '';
  return sceneIdx === 0
    ? `Scene 1 MUST begin from the exact static visual state of <FIRST_FRAME>. Animate from this starting frame.`
    : `Do NOT restart from <FIRST_FRAME>. Pick up visually from where the previous scene ended. Keep styling consistent.`;
}

export const MULTI_SHOT_PRESETS: MultiShotPreset[] = [
  // ── 1. Food & Beverage Review ─────────────────────────────────────────────
  {
    id: 'food_beverage_review',
    label: 'Food & Beverage Review',
    emoji: '🍽️',
    description: 'Sensory close-ups, sip/taste moments, kitchen or café setting',
    buildPrompt(ctx) {
      const { dialog, sceneIdx, totalScenes, sceneDurationSec, productDetails, instructions, refMappings } = ctx;
      const creator = refMappings.character || '<IMAGE_REF_0>';
      const product = refMappings.product || '<IMAGE_REF_1>';
      const location = refMappings.location || '';
      const locationLine = location ? `LOCATION REF: ${location} — match this setting exactly.` : 'Setting: Natural home kitchen or café table with warm, authentic lighting.';
      return `You are the world's best UGC video director specialising in Food & Beverage content.
Write the Gemini Omni Flash video prompt for Scene ${sceneIdx + 1} of ${totalScenes}.

DIALOGUE THIS SCENE (say EVERY word):
"${dialog}"

PRODUCT: ${productDetails || 'food or beverage product'}
CREATOR REF: ${creator} (keep face, skin, hair, outfit 100% consistent)
PRODUCT REF: ${product} (show exact visual — colour, texture, packaging)
${locationLine}

${firstFrameRule(refMappings, sceneIdx)}

REFERENCE TAGS IN USE:
${instructions.join('\n')}

UGC DIRECTOR BRIEF:
- Open with a sensory hook: product close-up OR creator holding the product naturally.
- Mix: creator lip-sync talking-head shots (from shoulder height, phone held up naturally) + product B-roll (pouring liquid, condensation, texture macro, steam, crinkle packaging).
- B-roll = voice-over. Creator face = lip-sync. ALL dialogue must be heard.
- Sensory language in visuals: make the product look delicious — liquid flow, steam wisps, glistening surface, crisp packaging.
- Creator feels like a real person at home, NOT a model. Relatable energy, happy expression, natural sip or bite between segments.
- Sound design: ambient kitchen/café tone, subtle product SFX (pour, crack, fizz), NO music.

${timecodeInstruction(sceneDurationSec)}
${REALISM_BLOCK}

Return ONLY the final prompt text with timecodes. No preamble, no scene labels.`;
    }
  },

  // ── 2. Lifestyle Product ──────────────────────────────────────────────────
  {
    id: 'lifestyle_product',
    label: 'Lifestyle Product',
    emoji: '✨',
    description: 'Daily routine integration, bedroom/bathroom, intimate & relatable',
    buildPrompt(ctx) {
      const { dialog, sceneIdx, totalScenes, sceneDurationSec, productDetails, instructions, refMappings } = ctx;
      const creator = refMappings.character || '<IMAGE_REF_0>';
      const product = refMappings.product || '<IMAGE_REF_1>';
      const location = refMappings.location || '';
      const locationLine = location ? `LOCATION REF: ${location} — match this setting.` : 'Setting: Clean, cosy home interior — bedroom, bathroom, or bright living area with natural window light.';
      return `You are the world's best UGC video director specialising in Lifestyle & Beauty products.
Write the Gemini Omni Flash video prompt for Scene ${sceneIdx + 1} of ${totalScenes}.

DIALOGUE THIS SCENE (say EVERY word):
"${dialog}"

PRODUCT: ${productDetails || 'lifestyle product'}
CREATOR REF: ${creator}
PRODUCT REF: ${product}
${locationLine}

${firstFrameRule(refMappings, sceneIdx)}

REFERENCE TAGS IN USE:
${instructions.join('\n')}

UGC DIRECTOR BRIEF:
- Seamlessly integrate the product into a natural daily routine moment (applying to skin, placing on dresser, using in morning routine).
- Mix: intimate talking-head closeups (chest-up, natural window light) + product detail B-roll (texture on surface, applying motion, label reveal).
- Creator feels like a real friend sharing a personal routine — NOT an ad. Friendly, warm, leaning slightly into camera.
- Show the product placed naturally in the environment (on bathroom shelf, bedside table, dressing area).
- Creator face shots: natural skin, pores visible, maybe slightly flushed, no makeup look is authentic.
- Sound: ambient home sounds, soft taps of the product, NO music.

${timecodeInstruction(sceneDurationSec)}
${REALISM_BLOCK}

Return ONLY the final prompt text with timecodes. No preamble.`;
    }
  },

  // ── 3. Location Showcase ──────────────────────────────────────────────────
  {
    id: 'location_showcase',
    label: 'Location Showcase',
    emoji: '📍',
    description: 'Place-forward: show the attached location, walk-through, establishing vibe',
    buildPrompt(ctx) {
      const { dialog, sceneIdx, totalScenes, sceneDurationSec, productDetails, instructions, refMappings } = ctx;
      const creator = refMappings.character || '<IMAGE_REF_0>';
      const product = refMappings.product || '';
      const location = refMappings.location || '<IMAGE_REF_2>';
      return `You are the world's best UGC video director specialising in location and destination content.
Write the Gemini Omni Flash video prompt for Scene ${sceneIdx + 1} of ${totalScenes}.

DIALOGUE THIS SCENE (say EVERY word):
"${dialog}"

LOCATION REF: ${location} — this place MUST appear as the primary visual backdrop. Match its architecture, colours, and atmosphere exactly.
CREATOR REF: ${creator}
${product ? `PRODUCT REF: ${product}` : ''}
${productDetails ? `CONTEXT: ${productDetails}` : ''}

${firstFrameRule(refMappings, sceneIdx)}

REFERENCE TAGS IN USE:
${instructions.join('\n')}

UGC DIRECTOR BRIEF:
- The LOCATION is the hero. Open every scene with an establishing shot of the location ref.
- Creator appears within the location naturally (walking through, sitting, gesturing at surroundings).
- Mix: walk-and-talk handheld (creator moving through the space, speaking to camera) + location B-roll (architectural details, ambient life, textures, signage, views).
- Creator talking to camera feels like a vlog — genuine discovery energy, pointing things out, turning to show the location.
- B-roll = voice-over. Creator face = lip-sync. ALL dialogue must be heard.
- Sound: ambient location sound (crowd murmur, nature, echoes, breeze), NO artificial music.

${timecodeInstruction(sceneDurationSec)}
${REALISM_BLOCK}

Return ONLY the final prompt text with timecodes. No preamble.`;
    }
  },

  // ── 4. Unboxing Hook ─────────────────────────────────────────────────────
  {
    id: 'unboxing_hook',
    label: 'Unboxing Hook',
    emoji: '📦',
    description: 'Overhead hands reveal, surprise reaction, product discovery moment',
    buildPrompt(ctx) {
      const { dialog, sceneIdx, totalScenes, sceneDurationSec, productDetails, instructions, refMappings } = ctx;
      const creator = refMappings.character || '<IMAGE_REF_0>';
      const product = refMappings.product || '<IMAGE_REF_1>';
      return `You are the world's best UGC video director specialising in unboxing and product reveal content.
Write the Gemini Omni Flash video prompt for Scene ${sceneIdx + 1} of ${totalScenes}.

DIALOGUE THIS SCENE (say EVERY word):
"${dialog}"

PRODUCT: ${productDetails || 'packaged product'}
CREATOR REF: ${creator}
PRODUCT REF: ${product}
Setting: Table or desk surface, overhead or angled smartphone view, natural room light.

${firstFrameRule(refMappings, sceneIdx)}

REFERENCE TAGS IN USE:
${instructions.join('\n')}

UGC DIRECTOR BRIEF:
- Scene opens with a top-down or 45° overhead view of the product packaging on a clean surface.
- Creator's hands (NOT face) interact first — turning the box, pulling open packaging, sliding product out.
- Cut to creator's face reaction — genuine wide-eyed surprise/delight, authentic emotion.
- Mix: overhead product reveal shots (packaging opening, product emerging) + creator reaction close-ups + product detail macros (texture, label, contents).
- The product must be shown in beautiful detail — lighting catches its surface naturally.
- Creator lines are delivered looking directly into camera after the reveal, like sharing a real discovery.
- Sound: packaging crinkle, cardboard tear, product slide, ambient room tone. NO music.

${timecodeInstruction(sceneDurationSec)}
${REALISM_BLOCK}

Return ONLY the final prompt text with timecodes. No preamble.`;
    }
  },

  // ── 5. Skincare / Beauty Routine ─────────────────────────────────────────
  {
    id: 'skincare_routine',
    label: 'Skincare / Beauty Routine',
    emoji: '💆',
    description: 'Bathroom setting, natural skin, application ritual, glowy result',
    buildPrompt(ctx) {
      const { dialog, sceneIdx, totalScenes, sceneDurationSec, productDetails, instructions, refMappings } = ctx;
      const creator = refMappings.character || '<IMAGE_REF_0>';
      const product = refMappings.product || '<IMAGE_REF_1>';
      const location = refMappings.location || '';
      const locationLine = location ? `LOCATION REF: ${location}` : 'Setting: Bathroom — mirror with ambient LED or natural window light, clean counter, no clutter.';
      return `You are the world's best UGC video director specialising in skincare and beauty routine content.
Write the Gemini Omni Flash video prompt for Scene ${sceneIdx + 1} of ${totalScenes}.

DIALOGUE THIS SCENE (say EVERY word):
"${dialog}"

PRODUCT: ${productDetails || 'skincare or beauty product'}
CREATOR REF: ${creator}
PRODUCT REF: ${product}
${locationLine}

${firstFrameRule(refMappings, sceneIdx)}

REFERENCE TAGS IN USE:
${instructions.join('\n')}

UGC DIRECTOR BRIEF:
- Bathroom or vanity setting. Creator is mid-routine, natural (no makeup, bare face, maybe in a towel or casual top).
- Mix: talking-head shots in front of mirror (or directly to camera, phone propped on counter) + product application B-roll (dropper on skin, cream spreading, serum absorbing, glow result).
- Creator skin must look RAW and real: visible pores, slight texture, natural redness or pigmentation — this is what makes skincare content believable.
- Product application shots: show the exact texture of the product (gel, cream, oil) on realistic skin. Macro shots of absorption or glow.
- Creator feels like they just woke up or just washed their face — completely unfiltered, that's the power.
- Sound: soft product dispense, cream patting, ambient bathroom (faint ventilation, water drip). NO music.

${timecodeInstruction(sceneDurationSec)}
${REALISM_BLOCK}

Return ONLY the final prompt text with timecodes. No preamble.`;
    }
  },

  // ── 6. High-Energy Hook ───────────────────────────────────────────────────
  {
    id: 'high_energy_hook',
    label: 'High-Energy Hook',
    emoji: '🔥',
    description: 'Fast cuts every 2s, hook opener, grab attention in 3 seconds',
    buildPrompt(ctx) {
      const { dialog, sceneIdx, totalScenes, sceneDurationSec, productDetails, instructions, refMappings } = ctx;
      const creator = refMappings.character || '<IMAGE_REF_0>';
      const product = refMappings.product || '<IMAGE_REF_1>';
      return `You are the world's best UGC video director specialising in high-energy, hook-first social content.
Write the Gemini Omni Flash video prompt for Scene ${sceneIdx + 1} of ${totalScenes}.

DIALOGUE THIS SCENE (say EVERY word):
"${dialog}"

PRODUCT: ${productDetails || 'consumer product'}
CREATOR REF: ${creator}
PRODUCT REF: ${product}

${firstFrameRule(refMappings, sceneIdx)}

REFERENCE TAGS IN USE:
${instructions.join('\n')}

UGC DIRECTOR BRIEF:
- This scene GRABS attention immediately. Every 2 seconds a different shot. High energy, fast delivery, leaning into the hook.
- Mix of: creator speaking close-up (extreme close, eyes filling frame at first) + rapid product cuts + action shots (grabbing, opening, using).
- Creator delivery is FAST and punchy — slight urgency, eyebrows raised, leaning into camera.
- Camera angle changes every 2 seconds: start extreme close, cut to wide, cut to product macro, cut to creator mid-shot.
- The very first shot (0-2s): creator's face EXTREMELY close to camera, mid-sentence, maximum hook energy. Like they just said something unbelievable.
- Each cut must feel like a hard edit — sharp, clean, no slow transitions.
- Sound: diegetic ambient + product SFX perfectly synced to cuts. NO music.

${timecodeInstruction(sceneDurationSec)}
${REALISM_BLOCK}

Return ONLY the final prompt text with timecodes. No preamble.`;
    }
  },
];
