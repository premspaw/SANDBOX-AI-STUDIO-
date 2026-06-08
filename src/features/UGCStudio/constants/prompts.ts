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

CONTEXT:
- Host 1 reference image: ${params.podcastHost1Img ? 'provided' : 'not provided'}
- Host 2 reference image: ${params.podcastHost2Img ? 'provided' : 'not provided'}
- Product reference image: ${params.podcastProductImg ? 'provided' : 'not provided'}
- User direction/topic: ${params.userPrompt || 'Create a useful, engaging short podcast-style product discussion.'}
- Product knowledge: ${params.productDetails || 'No product scan yet. Infer a general product discussion without making specific factual claims.'}
- Duration: ${params.scriptDuration}. Create exactly ${params.segmentCount} segment(s), each about 8 seconds.${params.voiceStyle ? `\n- Voice/speaking style to mimic: ${params.voiceStyle}` : ''}

STYLE RULES:
- Natural host banter, not an ad read.
- Alternate HOST 1 and HOST 2.
- Include small reactions, agreement, and handoff lines.
- Keep each segment concise and speakable.
- If a product is referenced, discuss it conversationally and avoid unsupported claims.
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
  sceneCount: number;
  durationLogic: string;
  SCRIPT_TONES: any;
  VIDEO_STYLES: any;
  voiceStyle?: string;
  strategyContext: string;
  trainingContent: string;
}) => {
  const toneInfo = params.SCRIPT_TONES[params.selectedScriptTone] || params.SCRIPT_TONES.viral_marketing;
  const styleInfo = params.VIDEO_STYLES[params.selectedVideoStyle] || params.VIDEO_STYLES.calm;

  return `You are an elite UGC scriptwriter who writes exactly how real people actually talk — casual, natural, human.

CRITICAL WRITING STYLE — READ THIS FIRST:
- Write like a real person speaking to a friend, NOT like an ad or a press release
- Use contractions: "I've", "you'll", "it's", "don't", "can't", "this'll"
- Use filler energy words naturally: "okay so", "honestly", "literally", "like", "okay real talk", "no cap", "I'm not even joking"
- Short punchy sentences. Fragments are fine. Real people don't always finish sentences perfectly.
- Avoid ANY corporate/ad words: "experience", "elevate", "indulge", "journey", "discover", "innovative", "premium", "solution", "transformative"
- No rhyming unless the tone specifically calls for it
- The script should sound like something you'd actually say out loud — read it back and if it sounds robotic, rewrite it

══════════════════════════════════════════════════
STEP 1 — CREATIVE DIRECTION (HIGHEST PRIORITY)
══════════════════════════════════════════════════
${params.userPrompt
  ? `The creator has given you this creative direction. Follow it precisely and let it shape the entire script:\n"${params.userPrompt}"`
  : `No specific direction given. Use your best judgment to create a compelling, authentic UGC script.`}

══════════════════════════════════════════════════
STEP 2 — PRODUCT KNOWLEDGE
══════════════════════════════════════════════════
${params.productDetails || 'No product scanned yet. Write a general lifestyle UGC script.'}

══════════════════════════════════════════════════
STEP 3 — SCRIPT PARAMETERS
══════════════════════════════════════════════════
DURATION: ${params.scriptDuration} → EXACTLY ${params.sceneCount} scene(s) of 8 seconds each (${params.durationLogic})
LANGUAGE: ${params.language} — Write ALL dialogue in ${params.language} only.
TONE: ${toneInfo.prompt || toneInfo}
PERFORMANCE STYLE: ${styleInfo.name} — ${styleInfo.modifier || styleInfo}${params.voiceStyle ? `\nVOICE STYLE (mimic this speaker's personality exactly in how you write): ${params.voiceStyle}` : ''}
${params.strategyContext}

══════════════════════════════════════════════════
STEP 4 — VIRAL SCRIPT TRAINING EXAMPLES
══════════════════════════════════════════════════
${params.trainingContent || 'No templates loaded. Apply viral UGC best practices.'}

══════════════════════════════════════════════════
MANDATORY RULES — FOLLOW EVERY SINGLE ONE
══════════════════════════════════════════════════
1. HOOK FIRST: Scene 1 MUST open with a natural, scroll-stopping hook in the first 2 seconds. Sound like a real person — NOT an ad. Good examples: "okay so I tried this and I'm obsessed", "why did nobody tell me about this sooner", "I genuinely can't stop thinking about this", "bro this changed everything for me". BAD examples: "Experience the ultimate...", "Discover the power of...", "Introducing the revolutionary...".
2. TONE: Every single line must feel and sound like: ${toneInfo.name || 'Viral Marketing'} — ${toneInfo.prompt || toneInfo}. The tone must be consistent across ALL scenes.
3. WORD COUNT: Strictly 20-25 spoken words per 8-second scene. Total ≈ ${params.sceneCount * 22} words.
4. SCENE COUNT: Output EXACTLY ${params.sceneCount} scene(s). No more, no less.
5. COMPLETE THOUGHTS: Each scene is self-contained — no sentence starts in one scene and ends in another.
6. LANGUAGE: Every word of dialogue must be in ${params.language}. No mixing languages.
7. PRODUCT INTEGRATION: Use specific details from the product knowledge above (benefits, use cases, audience) — not generic claims.
8. FORMATTING: Label each scene exactly as: [0:00 - 0:08] HOOK, [0:08 - 0:16] PAYOFF, etc.
9. VISUAL CUES: Describe a realistic UGC creator shot — natural lighting, phone camera, authentic setting. NO cinematic/commercial tropes. NO bokeh, NO 85mm lens.
10. CLOTHING RULE: If the product is clothing/apparel, the creator MUST be wearing it — never just holding it.

Return ONLY a valid JSON object:
{
  "script": "Clean dialogue-only with timestamps and scene labels",
  "scenes": [
    {
      "id": "1",
      "timestamp": "0:00 - 0:08",
      "label": "HOOK",
      "dialogue": "The exact spoken words for this scene in ${params.language}",
      "visualCue": "Realistic UGC shot description: creator action, expression, environment, camera angle. Performance: ${styleInfo.modifier || ''}. The creator is saying: [insert dialogue here]."
    }
  ]
}`;
};

export const buildRegenerateScriptPartPrompt = (params: {
  script: string;
  label: string;
  idx: number;
}) => {
  return `You are an expert UGC video editor refining a viral script. 
CURRENT FULL SCRIPT:
${params.script}

TASK: Provide a COMPLETELY DIFFERENT and MORE COMPELLING version of the ${params.label} for Scene ${params.idx + 1}.
The new version MUST flow seamlessly with the rest of the script but offer a fresh hook, different phrasing, or a new value proposition.
WORD COUNT: Strictly 20-30 words for this 8-second segment.

Return ONLY a valid JSON object:
{
  "newDialogue": "The new spoken text for this ${params.label}",
  "newVisualCue": "A new visual action description for Veo 3.1"
}`;
};

export const buildAnalyzeScenePrompt = (params: {
  text: string;
  productDetails: string;
  selectedVideoStyle: string;
  VIDEO_STYLES: any;
}) => {
  const styleInfo = params.VIDEO_STYLES[params.selectedVideoStyle] || params.VIDEO_STYLES.calm;
  return `Analyze the following UGC script dialogue and generate a detailed visual prompt for a video generation model (like Veo 3.1).

DIALOGUE: "${params.text}"
PRODUCT: ${params.productDetails}
PERFORMANCE STYLE: ${styleInfo.modifier || styleInfo}

The visual prompt should describe a UGC Creator Style scene:
1. The creator talking directly to the camera with a relatable, genuine emotion.
2. A natural, everyday environment (living room, bedroom, outdoor street, cozy cafe).
3. The camera angle and movement (prefer wide or medium shots, avoid tight portraits).
4. If the product is clothing, the creator MUST be wearing it naturally and showing it off.
5. The creator is speaking the exact words: "${params.text}". This is critical for accurate lip-sync.
6. Performance Style: The creator's performance must reflect a ${styleInfo.name} style: ${styleInfo.modifier}.

AVOID: 85mm lens, portrait mode, heavy bokeh, or 'fashion film' or 'cinematic' aesthetics. Keep it grounded, natural, and realistic.
Return ONLY the visual prompt text (max 80 words).`;
};

export const buildSplitScenePrompt = (params: {
  dialog: string;
  productDetails: string;
  selectedVideoStyle: string;
  VIDEO_STYLES: any;
}) => {
  const styleInfo = params.VIDEO_STYLES[params.selectedVideoStyle];
  const styleName = styleInfo?.name || 'UGC casual';
  const styleModifier = styleInfo?.modifier || 'natural, authentic, relatable';

  return `You are an expert Veo 3.1 video prompt engineer for UGC (User-Generated Content) videos.

DIALOGUE for this scene: "${params.dialog}"
PRODUCT / BRAND CONTEXT: ${params.productDetails || 'a consumer product'}
VIDEO STYLE: ${styleName} — ${styleModifier}

Generate a single detailed visual prompt (max 80 words) for this specific scene. The prompt must:
1. Describe a natural, relatable UGC creator environment (living room, cafe, street, bedroom, etc.).
2. Specify the creator's action, expression, and camera angle (prefer medium or wide shot).
3. Include the creator speaking the dialogue naturally with authentic lip sync.
4. If the product is wearable, the creator must be wearing or demonstrating it.
5. Avoid: 85mm lens, heavy bokeh, cinematic/fashion aesthetics.

Return ONLY the visual prompt text. No preamble, no extra text.`;
};
