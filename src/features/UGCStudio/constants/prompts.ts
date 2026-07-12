// ─── SHARED VOICE RULES ─────────────────────────────────────────────────────
// Injected into EVERY prompt that generates or regenerates dialogue.
// This ensures tone NEVER drifts back to "ad voice" on any code path.
const VOICE_RULES_BLOCK = `
─── HUMAN VOICE RULES (APPLY TO EVERY LINE) ────────────────────────────────
▸ SOUND LIKE A REAL PERSON, NOT AN AD:
  - Write EXACTLY how someone talks when they're hyped and telling a friend about something.
  - Imagine you're sending a voice note to your best friend. That energy. That looseness.
  - Thoughts don't have to be perfectly ordered. Real people jump around a little.
  - It's OKAY to start mid-thought: "Okay wait—", "So I've been using this for like—", "Not gonna lie,"
  - Sentences can trail off: "and it's just like... I can't even explain it."
  - Use intentionally imperfect grammar: "it's so good I can't" / "this thing goes hard" / "I'm literally obsessed"

▸ BANNED WORDS — never use even once (instantly sounds fake/robotic):
  "premium", "luxury", "exclusivity", "experience", "elevate", "indulge", "journey", "discover",
  "innovative", "solution", "transformative", "revolutionary", "features", "designed to", "unmatched",
  "perfect choice", "game-changer", "state-of-the-art", "cutting-edge", "world-class", "exceptional",
  "superior", "high-quality", "best-in-class", "seamless", "effortlessly", "unleash", "harness",
  "leverage", "empower", "curated", "bespoke", "artisan", "craft", "crafted", "showcase",
  "It's literally in my bio", "link in bio", "link's in my bio".

▸ BANNED OPENERS — never start a line with:
  "Are you looking for...", "Introducing...", "Say goodbye to...", "Say hello to...",
  "This product is...", "I'm excited to share...", "Today I'm reviewing...", "Check out this..."

▸ CONTRACTIONS — use in every single sentence:
  "I've", "you'll", "it's", "don't", "can't", "this'll", "what's", "I'm", "they're",
  "we've", "wouldn't", "couldn't", "didn't", "I'd", "isn't", "hasn't", "you'd".

▸ NATURAL FILLERS & EMOTION — sprinkle throughout:
  "okay so", "honestly", "literally", "like", "real talk", "no cap", "seriously",
  "I'm not even joking", "wait—", "okay but", "hear me out", "lowkey", "not gonna lie",
  "bro", "okay okay", "alright so", "so basically", "and I was like", "the thing is".

▸ SENTENCE RHYTHM — mix every scene:
  - Short punchy fragment: "It works."
  - One-breath sentence: "I've been using it every single day and I'm not stopping."
  - Trailing thought: "It's just... different, you know?"
  - Reaction line: "And I was like, wait, actually?"
  - Never write 2 long sentences back to back. Break it up.

▸ CTA STYLE — end casually, never corporate:
  Use: "comment 'me' and I'll send it to you", "go check it out", "it's in my profile", "seriously just try it"
  Never: "purchase now", "buy today", "click below to order", "visit our website", "link in bio", "It's literally in my bio".
────────────────────────────────────────────────────────────────────────────
`;

// ─── LANGUAGE-AWARE WORD COUNT ───────────────────────────────────────────────
function getWordRange(language: string, isOmni: boolean, sceneCount: number, isMultiShot: boolean): string {
  const lang = language.toLowerCase();
  const isDravidian = ['kannada', 'tamil', 'telugu', 'malayalam'].some(l => lang.includes(l));
  const isHindi = lang.includes('hindi') || lang.includes('urdu');
  if (isOmni) {
    // 10-second scenes
    if (isMultiShot) {
      if (isDravidian) return `Strictly 20-22 spoken words per 10-second scene (natural Dravidian pace ~2.0 words/sec — 20 min, 22 max). Total ≈ ${sceneCount * 21} words.`;
      if (isHindi)    return `Strictly 22-24 spoken words per 10-second scene (energetic Hindi pace ~2.2 words/sec — 22 min, 24 max). Total ≈ ${sceneCount * 23} words.`;
      return               `Strictly 24-28 spoken words per 10-second scene (natural English pace ~2.6 words/sec — 24 min, 28 max). Total ≈ ${sceneCount * 26} words.`;
    } else {
      if (isDravidian) return `Strictly 20-22 spoken words or less per 10-second scene (natural Dravidian pace ~2.0 words/sec — 20 min, 22 max). Total ≈ ${sceneCount * 21} words.`;
      if (isHindi)    return `Strictly 24-26 spoken words or less per 10-second scene (energetic Hindi pace ~2.5 words/sec — 24 min, 26 max). Total ≈ ${sceneCount * 25} words.`;
      return               `Strictly 28-30 spoken words or less per 10-second scene (natural English pace ~2.8 words/sec — 28 min, 30 max). Total ≈ ${sceneCount * 29} words.`;
    }
  } else {
    // 8-second scenes
    if (isMultiShot) {
      if (isDravidian) return `Strictly 15-18 spoken words per 8-second scene (natural Dravidian pace ~2.0 words/sec — 15 min, 18 max). Total ≈ ${sceneCount * 16} words.`;
      if (isHindi)    return `Strictly 17-20 spoken words per 8-second scene (energetic Hindi pace ~2.2 words/sec — 17 min, 20 max). Total ≈ ${sceneCount * 18} words.`;
      return               `Strictly 20-24 spoken words per 8-second scene (natural English pace ~2.5 words/sec — 20 min, 24 max). Total ≈ ${sceneCount * 22} words.`;
    } else {
      if (isDravidian) return `Strictly 16-18 spoken words or less per 8-second scene (natural Dravidian pace ~2.0 words/sec — 16 min, 18 max). Total ≈ ${sceneCount * 17} words.`;
      if (isHindi)    return `Strictly 19-21 spoken words or less per 8-second scene (energetic Hindi pace ~2.5 words/sec — 19 min, 21 max). Total ≈ ${sceneCount * 20} words.`;
      return               `Strictly 22-24 spoken words or less per 8-second scene (natural English pace ~2.8 words/sec — 22 min, 24 max). Total ≈ ${sceneCount * 23} words.`;
    }
  }
}

// ─── TIMESTAMP HELPER ────────────────────────────────────────────────────────
// Generates full timestamp examples for ANY scene count so the model never
// has to infer the pattern beyond scene 2.
function buildTimestampExamples(sceneCount: number, sceneSeconds: number): string {
  const labels = ['HOOK', 'PAYOFF', 'PROOF', 'SOCIAL PROOF', 'CTA', 'BONUS'];
  const lines: string[] = [];
  for (let i = 0; i < sceneCount; i++) {
    const start = i * sceneSeconds;
    const end = (i + 1) * sceneSeconds;
    const startStr = `${Math.floor(start / 60)}:${String(start % 60).padStart(2, '0')}`;
    const endStr = `${Math.floor(end / 60)}:${String(end % 60).padStart(2, '0')}`;
    const label = labels[i] ?? `SCENE ${i + 1}`;
    lines.push(`[${startStr} - ${endStr}] ${label}: dialogue for scene ${i + 1}`);
  }
  return lines.join('\n');
}

export const buildPodcastPrompt = (params: {
  language: string;
  podcastHost1Img: boolean;
  podcastHost2Img: boolean;
  podcastProductImg: boolean;
  userPrompt: string;
  productDetails: string;
  scriptDuration: string;
  segmentCount: number;
  voiceStyle?: string;
}) => {
  return `You are an expert podcast producer writing a short two-host branded podcast segment.

Create a natural ${params.language} conversation between HOST 1 and HOST 2.

─── PRODUCT INTEGRATION RULES (MANDATORY) ───
You MUST base the entire conversation on the scanned product details:
PRODUCT DETAILS / KNOWLEDGE:
${params.productDetails ? params.productDetails : `No product scanned yet. Base the conversation on the user's topic direction: "${params.userPrompt}"`}

- Do NOT invent a random product. The hosts must discuss this specific product.
- Weave the product's benefits, use cases, or audience details into the conversation.

CONTEXT:
- Host 1 reference image: ${params.podcastHost1Img ? 'provided' : 'not provided'}
- Host 2 reference image: ${params.podcastHost2Img ? 'provided' : 'not provided'}
- Product reference image: ${params.podcastProductImg ? 'provided' : 'not provided'}
- User direction/topic: ${params.userPrompt || 'Create a useful, engaging short podcast-style product discussion.'}
- Duration: ${params.scriptDuration}. Create exactly ${params.segmentCount} segment(s), each about 8 seconds.${params.voiceStyle ? `\n- Voice/speaking style to mimic: ${params.voiceStyle}` : ''}

STYLE RULES:
- Natural host banter, not an ad read.
- Alternate HOST 1 and HOST 2.
- Include small reactions, agreement, and handoff lines.
- Keep each segment concise and speakable. Each segment's dialogue must contain strictly between 16 and 20 words.
- Each scene's visualCue must specify a DIFFERENT camera angle cut: Scene 1 = wide two-shot, Scene 2 = medium shot on HOST 1, Scene 3 = medium shot on HOST 2, Scene 4+ = over-shoulder or close-up reaction. Always mention: microphones, studio lighting, product on desk if provided. No title cards.

Return ONLY valid JSON:
{
  "script": "[0:00 - 0:08] HOST 1: ...\\nHOST 2: ...",
  "scenes": [
    {
      "id": "1",
      "timestamp": "0:00 - 0:08",
      "label": "PODCAST",
      "dialogue": "HOST 1: ...\\nHOST 2: ...",
      "visualCue": "Two-host podcast setup. Cut at timestamp. Host 1 and Host 2 seated at microphones, natural studio lighting, camera angle changes per cut (wide shot / over-shoulder / close-up alternating). Product visible on desk if provided. No title cards or lower thirds."
    }
  ]
}`;
};

export const buildScriptPrompt = (params: {
  userPrompt: string;
  productDetails: string;
  scriptDuration: string;
  language: string;
  selectedScriptTone: string;
  selectedVideoStyle: string;
  selectedSceneStyle?: string;
  sceneCount: number;
  durationLogic: string;
  SCRIPT_TONES: any;
  VIDEO_STYLES: any;
  SCENE_STYLES?: any;
  voiceStyle?: string;
  strategyContext: string;
  trainingContent: string;
  nicheHookContext?: string;
  scriptModel?: 'veo3' | 'omni';
  isMultiShot?: boolean;
}) => {
  const toneInfo = params.SCRIPT_TONES[params.selectedScriptTone] || params.SCRIPT_TONES.viral_marketing;
  const styleInfo = params.VIDEO_STYLES[params.selectedVideoStyle] || params.VIDEO_STYLES.calm;
  const sceneStyleInfo = params.SCENE_STYLES && params.selectedSceneStyle
    ? params.SCENE_STYLES[params.selectedSceneStyle]
    : null;

  const isOmni = params.scriptModel === 'omni';
  const sceneSeconds = isOmni ? 10 : 8;
  const wordCountConstraint = getWordRange(params.language, isOmni, params.sceneCount, !!params.isMultiShot);
  const timestampExamples = buildTimestampExamples(params.sceneCount, sceneSeconds);

  return `You are a professional UGC script writer. You write exactly how real people talk on camera.
  
${params.nicheHookContext || ''}

─── STYLE PRESET RULES (MANDATORY) ───
Your generated script (both dialogue and visual cues) MUST strictly align with the following style preset:
- STYLE PRESET NAME: ${sceneStyleInfo ? `"${sceneStyleInfo.name}"` : 'Normal/Standard Talking'}
- STYLE PRESET DESCRIPTION: ${sceneStyleInfo ? sceneStyleInfo.description : 'Creator talking directly to camera'}
- PROMPT MODIFIER (for visual cue generation): ${sceneStyleInfo ? sceneStyleInfo.promptModifier : 'direct-to-camera'}

Instructions for this specific style preset:
- If it is "📦 Unboxing", the dialogue and visual cues must focus on opening the product package, unboxing, showing packaging detail, and first-time reactions.
- If it is "👆 POV Shot", the visual cues must describe first-person perspective cuts looking down at hands demonstrating or holding the product.
- If it is "🎥 Cinematic B-Roll", the visual cues must focus on slow-motion, detailed close-up product views with dramatic professional lighting.
- If it is "😲 Reaction Shot", the visual cue and dialogue must be high-energy, showing extreme surprise, delight, or excitement reacting to the product.
- If it is "🚶 Walk & Talk", the dialogue and cues must be casual, creator walking around, holding the phone, and talk vlogging.
- Ensure the scene descriptions and dialogue feel natural to this specific style.

─── PRODUCT INTEGRATION RULES (MANDATORY) ───
You MUST base the entire script on the scanned product details provided below:
PRODUCT DETAILS / KNOWLEDGE:
${params.productDetails ? params.productDetails : `No product scanned yet. Base the script on the user's input: "${params.userPrompt || 'lifestyle product'}"`}

- Do NOT invent random unrelated products or ignore the product knowledge.
- In spoken dialogue, reference specific benefits (e.g. key selling points), target audience, and use cases of the scanned product.
- If the product details are present, the script must sell/discuss THIS specific product.

SCRIPT PARAMETERS:
- TONE: ${toneInfo.name} — ${toneInfo.prompt || toneInfo}
- PERFORMANCE STYLE: ${styleInfo.name} — ${styleInfo.modifier || styleInfo}${params.voiceStyle ? `\n- VOICE STYLE: ${params.voiceStyle}` : ''}
- DURATION: ${params.scriptDuration} → EXACTLY ${params.sceneCount} scene(s) of ${sceneSeconds} seconds each (${params.durationLogic})
- LANGUAGE: ${params.language} — Write ALL dialogue in ${params.language} only.
${params.strategyContext}

${VOICE_RULES_BLOCK}

─── ADDITIONAL SCRIPT RULES ──────────────────────────────────────────────
1. Write the HOOK first. It must follow the niche hook patterns and rules above.
   The hook is the most important line — spend 70% of your thinking on it.
   CRITICAL: DO NOT start the hook with generic, overused clichéd prefixes like "Okay wait", "Wait", "Wait, okay", "So...", or "Literally". These are boring and reduce engagement.
   Create a fresh, unique, product-specific hook statement that connects to the main benefit or problem of the product.
2. The hook must work WITHOUT seeing the product.
   Viewer clicks because of the hook, not the product.
3. After the hook, write the rest of the script naturally — don't announce scene names mid-script.

4. HOOK TYPES — pick one that fits the product naturally:
   - Question hook: "Why does nobody talk about this?"
   - Confession hook: "I was NOT expecting this to work."
   - Contrast hook: "I wasted so much money before I found this."
   - Reaction hook: "I tried this as a joke and now I'm completely obsessed."
   - Statement hook: "This changed my entire morning routine."

5. SCRIPT IS SPOKEN WORDS ONLY. No stage directions. No [smiles]. No (pause) in the dialogue text.

6. WORD COUNT: ${wordCountConstraint}

7. SCENE COUNT: Output EXACTLY ${params.sceneCount} scene(s). No more, no less.

8. COMPLETE THOUGHTS: Each scene is self-contained — no sentence starts in one scene and ends in another.

9. PRODUCT INTEGRATION: Use specific details from the product knowledge (benefits, use cases, audience) — not generic claims.
   Show the benefit through a real story or reaction, don't just list it.

10. FORMATTING: In the "script" JSON field, write the entire script as one single continuous, complete spoken text flow (a clean combined paragraph) WITHOUT any timestamps (e.g. no [0:00 - 0:08]), and WITHOUT scene names or labels (e.g. no HOOK:, PAYOFF:, CTA:). It must read like a single natural spoken flow.

11. VISUAL CUES: Describe a realistic UGC creator shot — natural lighting, phone camera, authentic setting. Include the Prompt Modifier details in your visual descriptions.

12. CLOTHING RULE: If the product is clothing/apparel, the creator MUST be wearing it — never just holding it.

13. ENERGY RULE: Each scene must have a distinct energy shift.
    HOOK = curiosity/surprise → PAYOFF = proof/excitement → CTA = casual confidence.
    Don't write every scene at the same flat energy level.
─────────────────────────────────────────────────────────────────────────

STRUCTURE FOR ${params.scriptDuration}:
${params.durationLogic}

${params.trainingContent ? `TRAINING EXAMPLES FROM YOUR KNOWLEDGE BASE:\n${params.trainingContent}` : ''}

Write the script now. Return ONLY a valid JSON object.
The "scenes" array MUST contain EXACTLY ${params.sceneCount} scene(s) matching the duration.

Example structure (script shown as a single continuous paragraph):
{
  "hook": "the opening line only — max 10 words, matching the hook dialogue exactly",
  "script": "One complete spoken script flow (the combined dialogues from all scenes) as a single continuous paragraph without any timestamps, brackets, or scene labels (e.g. 'No joke, I\\'ve been using... It\\'s like, I don\\'t... Honestly, if you\\'re...')",
  "scenes": [
    {
      "id": "1",
      "timestamp": "0:00 - 0:${isOmni ? '10' : '08'}",
      "label": "HOOK",
      "dialogue": "The exact spoken words for scene 1 in ${params.language}",
      "visualCue": "Realistic UGC shot description: creator action, expression, environment, camera angle. Performance: ${styleInfo.modifier || ''}. The creator is saying: [insert dialogue here]. Visual style preset details: ${sceneStyleInfo ? sceneStyleInfo.promptModifier : 'direct-to-camera'}."
    },
    {
      "id": "2",
      "timestamp": "0:${isOmni ? '10' : '08'} - 0:${isOmni ? '20' : '16'}",
      "label": "PAYOFF",
      "dialogue": "The exact spoken words for scene 2 in ${params.language}",
      "visualCue": "Realistic UGC shot description for scene 2... Visual style preset details: ${sceneStyleInfo ? sceneStyleInfo.promptModifier : 'direct-to-camera'}."
    }
  ]
}`;
};

export const buildRegenerateScriptPartPrompt = (params: {
  script: string;
  label: string;
  idx: number;
  productDetails?: string;
  selectedSceneStyle?: string;
  SCENE_STYLES?: any;
  scriptModel?: 'veo3' | 'omni';
  language?: string;
}) => {
  const sceneStyleInfo = params.SCENE_STYLES && params.selectedSceneStyle
    ? params.SCENE_STYLES[params.selectedSceneStyle]
    : null;

  const isOmni = params.scriptModel === 'omni';
  const sceneSeconds = isOmni ? 10 : 8;
  const wordRange = getWordRange(params.language || 'English', isOmni, 1, true);

  return `You are an expert UGC video editor refining a viral script.
CURRENT FULL SCRIPT:
${params.script}

─── STYLE & PRODUCT CONTEXT ───
- SELECTED VIDEO STYLE PRESET: ${sceneStyleInfo ? `"${sceneStyleInfo.name}" (${sceneStyleInfo.description})` : 'Normal talking directly to camera'}
- SCANNED PRODUCT DETAILS: ${params.productDetails || 'lifestyle product'}

${VOICE_RULES_BLOCK}

TASK: Provide a COMPLETELY DIFFERENT and MORE COMPELLING version of the ${params.label} for Scene ${params.idx + 1}.
The new version MUST flow seamlessly with the rest of the script and:
1. Align perfectly with the selected style preset.
2. Integrate details from the scanned product details above.
3. Offer a fresh hook, different phrasing, or a new value proposition.
4. Match the human voice and energy of the surrounding scenes — do NOT drift into ad-speak.

WORD COUNT: ${wordRange}

Return ONLY a valid JSON object:
{
  "newDialogue": "The new spoken text for this ${params.label}",
  "newVisualCue": "A new visual action description for the video model. Incorporate visual style preset details: ${sceneStyleInfo ? sceneStyleInfo.promptModifier : 'direct-to-camera'}."
}`;
};

export const buildAnalyzeScenePrompt = (params: {
  text: string;
  productDetails: string;
  selectedVideoStyle: string;
  VIDEO_STYLES: any;
  selectedSceneStyle?: string;
  SCENE_STYLES?: any;
  hasRefImage?: boolean;
  imageDescription?: string;
}) => {
  const styleInfo = params.VIDEO_STYLES[params.selectedVideoStyle] || params.VIDEO_STYLES.calm;
  const sceneStyleInfo = params.SCENE_STYLES && params.selectedSceneStyle
    ? params.SCENE_STYLES[params.selectedSceneStyle]
    : null;

  const faceLockNote = params.hasRefImage
    ? `
⚠️ FACE CONSISTENCY — CRITICAL:
A reference image of the creator is provided. You MUST:
- Keep the creator's face EXACTLY as shown in the reference image
- Do NOT alter facial features, skin tone, eye shape, nose, lips, or face structure
- Maintain natural facial symmetry — this is a real person, not AI-generated
- The creator speaks like a real UGC creator — authentic, direct, relatable
- NO face morphing, NO idealization, NO stylization of the face
- The face and body must remain 100% consistent with the reference throughout the entire video
${params.imageDescription ? `REFERENCE IMAGE ANALYSIS: ${params.imageDescription}` : ''}`
    : '';

  const sceneStyleInstruction = sceneStyleInfo
    ? `VISUAL STYLE PRESET: ${sceneStyleInfo.name} — ${sceneStyleInfo.description}. You MUST ensure the visual cue describes this style. Prompt Modifier: ${sceneStyleInfo.promptModifier}`
    : '';

  return `Analyze the following UGC script dialogue and generate a detailed visual prompt for a video generation model (like Veo 3.1).

DIALOGUE: "${params.text}"
PRODUCT: ${params.productDetails}
PERFORMANCE STYLE: ${styleInfo.modifier || styleInfo}
${sceneStyleInstruction}
${faceLockNote}

The visual prompt should describe a UGC Creator Style scene:
1. The creator talking directly to the camera with a relatable, genuine emotion.
2. A natural, everyday environment (living room, bedroom, outdoor street, cozy cafe).
3. The camera angle and movement (prefer wide or medium shots, avoid tight portraits).
4. If the product is clothing, the creator MUST be wearing it naturally and showing it off.
5. The creator is speaking the exact words: "${params.text}". This is critical for accurate lip-sync.
6. Performance Style: The creator's performance must reflect a ${styleInfo.name} style: ${styleInfo.modifier}.
7. Visual Style Preset: Incorporate the preset details: ${sceneStyleInfo ? sceneStyleInfo.promptModifier : 'direct-to-camera'}.
${params.hasRefImage ? '8. The creator\'s face must stay IDENTICAL to the reference image — same person, same face, no changes.' : ''}

AVOID: 85mm lens, portrait mode, heavy bokeh, or 'fashion film' or 'cinematic' aesthetics. Keep it grounded, natural, and realistic.
Return ONLY the visual prompt text (max 100 words).`;
};

/**
 * Builds the AI prompt for analyzing a reference image and generating a
 * face-consistent video prompt. The AI sees the actual image and extracts
 * face descriptors that are baked into the video prompt.
 */
export const buildImageAnalysisPrompt = (params: {
  text: string;
  productDetails: string;
  selectedVideoStyle: string;
  VIDEO_STYLES: any;
  selectedSceneStyle?: string;
  SCENE_STYLES?: any;
}) => {
  const styleInfo = params.VIDEO_STYLES[params.selectedVideoStyle] || params.VIDEO_STYLES.calm;
  const sceneStyleInfo = params.SCENE_STYLES && params.selectedSceneStyle
    ? params.SCENE_STYLES[params.selectedSceneStyle]
    : null;

  return `You are an expert Veo 3.1 prompt engineer. A reference image of the UGC creator is provided.

Your job is to:
1. ANALYZE the reference image — describe the person's exact face, skin tone, hair, eye color, facial structure, outfit, and expression in detail.
2. GENERATE a Veo 3.1 video prompt (max 120 words) that:
   - Starts by describing the creator using the EXACT physical details from the image (e.g. "A [skin tone] [gender] creator with [hair description], [eye description], wearing [outfit]...")
   - Has them speak naturally to camera: "${params.text}"
   - Uses UGC creator style — direct, relatable, authentic — NOT cinematic
   - Specifies a natural environment (living room, bedroom, cafe, etc.)
   - Performance style: ${styleInfo.name} — ${styleInfo.modifier || 'natural and authentic'}
   - Visual Style Preset: ${sceneStyleInfo ? sceneStyleInfo.promptModifier : 'direct-to-camera'}

CRITICAL FACE RULES:
- The creator's face MUST stay exactly as shown in the reference image throughout the entire video
- Do NOT change face shape, facial features, skin tone, or expression baseline
- Do NOT idealize or stylize the face — they should look like the real person in the image
- Natural facial symmetry must be preserved
- They speak like a real UGC creator, not an actor

PRODUCT CONTEXT: ${params.productDetails || 'consumer product'}

Return ONLY the video prompt text. No extra commentary.`;
};

export const buildSplitScenePrompt = (params: {
  dialog: string;
  productDetails: string;
  selectedVideoStyle: string;
  VIDEO_STYLES: any;
  selectedSceneStyle?: string;
  SCENE_STYLES?: any;
}) => {
  const styleInfo = params.VIDEO_STYLES[params.selectedVideoStyle];
  const styleName = styleInfo?.name || 'UGC casual';
  const styleModifier = styleInfo?.modifier || 'natural, authentic, relatable';
  
  const sceneStyleInfo = params.SCENE_STYLES && params.selectedSceneStyle
    ? params.SCENE_STYLES[params.selectedSceneStyle]
    : null;

  return `You are an expert Veo 3.1 video prompt engineer for UGC (User-Generated Content) videos.

DIALOGUE for this scene: "${params.dialog}"
PRODUCT / BRAND CONTEXT: ${params.productDetails || 'a consumer product'}
VIDEO STYLE: ${styleName} — ${styleModifier}
${sceneStyleInfo ? `VISUAL STYLE PRESET: ${sceneStyleInfo.name} — Prompt Modifier: ${sceneStyleInfo.promptModifier}` : ''}

Generate a single detailed visual prompt (max 80 words) for this specific scene. The prompt must:
1. Describe a natural, relatable UGC creator environment (living room, cafe, street, bedroom, etc.).
2. Specify the creator's action, expression, and camera angle (prefer medium or wide shot).
3. Include the creator speaking the dialogue naturally with authentic lip sync.
4. If the product is wearable, the creator must be wearing or demonstrating it.
5. Visual Style Preset details to include: ${sceneStyleInfo ? sceneStyleInfo.promptModifier : 'direct-to-camera'}.
6. Avoid: 85mm lens, heavy bokeh, cinematic/fashion aesthetics.

Return ONLY the visual prompt text. No preamble, no extra text.`;
};
