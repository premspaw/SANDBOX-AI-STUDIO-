// ===== DURATION CONFIGURATION =====
export const DURATIONS = [
  { value: 10, label: "10s", shots: 4 },
  { value: 15, label: "15s", shots: 6 },
  { value: 30, label: "30s", shots: 8 },
  { value: 45, label: "45s", shots: 10 },
  { value: 60, label: "60s", shots: 12 },
  { value: 120, label: "120s", shots: 18 }
];

export const getShotCountFromDuration = (duration) => {
  const config = DURATIONS.find(d => d.value === duration);
  return config ? config.shots : 6;
};

// ===== STYLE PRIMERS (Visual DNA per Niche) =====
export const STYLE_PRIMERS = {
  FASHION: "High fashion editorial. Sharp lighting. Premium styling. Vogue aesthetic.",

  "PRODUCT HERO": "Clean studio product showcase. Soft diffused lighting. Commercial photography precision.",

  "LUXURY WATCH": "Macro jewelry photography. Dramatic rim lighting. Dark premium background. Ultra-detailed.",

  "TECH LAUNCH": "Futuristic tech showcase. LED rim lighting. Dark gradient background. Minimal premium feel.",

  "FOOD & BEVERAGE": "Appetizing food photography. Natural diffused light. Fresh vibrant colors. Mouth-watering detail.",

  CINEMATIC: "Anamorphic lens. Film grain. Dramatic color grading. Movie trailer look.",

  "TRAVEL REEL": "Adventure documentary style. Natural lighting. Atmospheric mood. Wanderlust aesthetic.",

  "FITNESS ENERGY": "High-energy sports photography. Dynamic motion. Bold contrast. Motivational power.",

  "BEAUTY GLOW": "Soft beauty lighting. Glowing skin tones. Clean elegant composition. Magazine quality.",

  "MINIMALIST BRAND": "Clean minimalist aesthetic. Negative space. Soft shadows. Scandinavian simplicity.",

  "STREETWEAR HYPE": "Urban street photography. Bold colors. Gritty textures. Hypebeast aesthetic.",

  "LIFESTYLE VLOG": "Casual lifestyle photography. Natural window light. Warm inviting tones. Authentic moments.",

  "UGC AD": "Handheld smartphone footage. Natural window light. Authentic social realism.",

  CUSTOM: "Professional commercial photography. Cinematic lighting. Ultra realistic."
};

// ===== SHOT TEMPLATES (Camera Angles & Actions) =====
export const SHOT_TEMPLATES = {
  hook: {
    camera: [
      "extreme close-up reveal",
      "dynamic push-in",
      "dramatic low angle",
      "fast zoom to detail",
      "slow-motion entrance",
      "overhead tracking start"
    ],
    action: [
      "product showcase reveal",
      "bold confident entrance",
      "attention-grabbing motion",
      "mysterious introduction",
      "power statement pose",
      "dramatic product placement"
    ]
  },

  dynamic_scene: {
    camera: [
      // CLASSIC SHOTS
      "medium shot",
      "wide establishing shot",
      "close-up detail",
      "over-the-shoulder",

      // DYNAMIC ANGLES
      "low angle power shot",
      "high angle bird's eye view",
      "dutch angle dramatic tilt",
      "eye-level conversational",

      // MOVEMENT SHOTS
      "tracking shot following subject",
      "dolly push-in intimate",
      "dolly pull-out revealing context",
      "handheld dynamic motion",
      "steadicam smooth glide",

      // PRODUCT-FOCUSED
      "macro extreme close-up",
      "floating product beauty shot",
      "360-degree rotating view",

      // CINEMATIC
      "silhouette backlit dramatic",
      "bokeh depth of field shallow focus",
      "lens flare golden hour",
      "reflection shot mirror surface",

      // FASHION/LIFESTYLE
      "full-body portrait",
      "three-quarter profile",
      "candid lifestyle moment",
      "walking toward camera",
      "twirl motion capture",

      // CREATIVE
      "symmetrical centered composition",
      "rule of thirds balanced",
      "negative space minimalist",
      "leading lines perspective"
    ],

    action: [
      // PRODUCT INTERACTION
      "naturally holding product",
      "demonstrating product feature",
      "unboxing reveal moment",
      "product in use closeup",

      // LIFESTYLE ACTIONS
      "casual walking motion",
      "contemplative pause",
      "confident striding forward",
      "looking back over shoulder",
      "mid-laugh authentic moment",

      // DYNAMIC MOVEMENT
      "motion blur action",
      "freeze-frame mid-jump",
      "hair flip dramatic",
      "fabric flowing movement",
      "spinning slow-motion",

      // EMOTIONAL BEATS
      "surprise reaction",
      "satisfied smile",
      "concentrated focus",
      "excited gesture",
      "proud presentation",

      // ENVIRONMENTAL
      "interacting with environment",
      "leaning against surface",
      "sitting casually",
      "standing in doorway",

      // TECHNICAL
      "detail inspection closeup",
      "texture highlight",
      "feature demonstration",
      "material showcase"
    ]
  },

  hero_outro: {
    camera: [
      "hero shot wide angle",
      "signature pose medium",
      "final reveal pull-back",
      "confident close-up",
      "victorious low angle",
      "elegant profile silhouette"
    ],
    action: [
      "confident power stance",
      "satisfied product hold",
      "memorable signature pose",
      "victorious moment",
      "serene final moment",
      "bold statement finish"
    ]
  }
};

// ===== CONTEXT MODE DETECTION =====
export const detectContextMode = (inputs) => {
  const hasCharacter = inputs.character && inputs.character !== 'a model';
  const hasProduct = inputs.product && inputs.product.trim() !== '';

  if (hasCharacter && hasProduct) return "character_with_product";
  if (hasProduct && !hasCharacter) return "product_only";
  if (hasCharacter && !hasProduct) return "character_only";

  return "empty";
};

// ===== SHUFFLE HELPER =====
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// ===== BUILD SHOT PLAN =====
export const buildShotPlan = ({ inputs, niche, duration, profiles }) => {
  const totalShots = getShotCountFromDuration(duration);
  const contextMode = detectContextMode(inputs);

  let shots = [];

  // 1️⃣ HOOK SHOT
  const hookTemplate = SHOT_TEMPLATES.hook;
  const hookIndex = Math.floor(Math.random() * hookTemplate.camera.length);

  shots.push({
    role: "hook",
    shotNumber: 1,
    camera: hookTemplate.camera[hookIndex],
    action: hookTemplate.action[hookIndex],
    contextMode
  });

  // Prepare shuffle for fallback
  const dynamicTemplate = SHOT_TEMPLATES.dynamic_scene;
  const shuffledCameras = shuffleArray(dynamicTemplate.camera);
  const shuffledActions = shuffleArray(dynamicTemplate.action);

  // 2️⃣ INTELLIGENT MIDDLE INJECTION
  for (let i = 1; i < totalShots - 1; i++) {
    let camera = "";
    let action = "";

    // RULE 1: If product is MICRO, force at least two MACRO shots
    if (profiles?.product?.isMicro && (i === 1 || i === 3)) {
      camera = "macro extreme close-up detail";
      action = "focusing on the intricate textures and finish";
    }
    // RULE 2: If location is DEEP, force a WIDE shot at shot #2
    else if (profiles?.location?.hasBackgroundDepth && i === 2) {
      camera = "wide cinematic establishing shot";
      action = "showing the scale of the environment";
    }
    // FALLBACK: Use existing shuffle logic
    else {
      camera = shuffledCameras[i % shuffledCameras.length];
      action = shuffledActions[i % shuffledActions.length];
    }

    shots.push({
      role: "dynamic_scene",
      shotNumber: i + 1,
      camera,
      action,
      contextMode
    });
  }

  // 3️⃣ HERO OUTRO
  const outroTemplate = SHOT_TEMPLATES.hero_outro;
  const outroIndex = Math.floor(Math.random() * outroTemplate.camera.length);

  shots.push({
    role: "hero_outro",
    shotNumber: totalShots,
    camera: outroTemplate.camera[outroIndex],
    action: outroTemplate.action[outroIndex],
    contextMode
  });

  return shots;
};

// ===== BUILD PROMPT FROM SHOT =====
export const buildPromptFromShot = (inputs, shot, niche, aspectRatio, sessionSeed, profiles) => {
  const stylePrimer = STYLE_PRIMERS[niche] || STYLE_PRIMERS.CUSTOM;
  const contextMode = shot.contextMode;

  // DYNAMIC MOTION LOGIC
  const motionInstruction = profiles?.wardrobe?.isFlowy
    ? "MOVEMENT: The character moves gracefully, allowing the fabric to flow and catch the air."
    : profiles?.wardrobe?.isRigid
      ? "MOVEMENT: The character maintains a strong, structured posture with sharp, intentional moves."
      : "MOVEMENT: Natural and relaxed lifestyle motion.";

  // LIGHTING CONSISTENCY
  const finalLighting = profiles?.location?.lighting
    ? `LIGHTING: Match the environment lighting exactly: ${profiles.location.lighting}`
    : "LIGHTING: Professional cinematic commercial lighting.";

  // Common context for all modes
  const commonContext = `
${stylePrimer}
Session ID: ${sessionSeed}
${finalLighting}
${motionInstruction}
Maintain consistent visual DNA across all shots.
`.trim();

  // ===== PRODUCT-ONLY MODE =====
  if (contextMode === "product_only") {
    return `
${commonContext}

VISUAL REFERENCE LOCK: The provided reference image is the ONLY source of truth for the product design.
MATCH THE PRODUCT EXACTLY as shown in the reference image (e.g., specific watch model, face, strap, and materials).
Do not generate a generic product. Use the actual design from the reference.

PRODUCT FOCUS MODE - No people in frame

Shot ${shot.shotNumber}: ${shot.role}
Camera Angle: ${shot.camera}
Action: ${shot.action}

Product Details:
${inputs.product}

Location/Background:
${inputs.location || "Clean studio background with soft gradient"}

Aspect Ratio: ${aspectRatio}

Ultra realistic. Professional commercial product photography. No people visible.
`.trim();
  }

  // ===== CHARACTER + PRODUCT MODE =====
  if (contextMode === "character_with_product") {
    return `
${commonContext}

VISUAL REFERENCE LOCK: The provided reference images contain the EXACT character AND product to be featured.
1. SUBJECT IDENTITY: Match the face and features of the character reference exactly.
2. PRODUCT DESIGN: Match the product design (e.g., the specific watch) shown in the reference exactly.
Do not hallucinate or change the design of the product.

Shot ${shot.shotNumber}: ${shot.role}
Camera Angle: ${shot.camera}
Action: ${shot.action}

Character:
${inputs.character}

Wardrobe:
${inputs.wardrobe || 'Stylish outfit matching the scene aesthetic'}

Product Interaction:
${inputs.product}

Location:
${inputs.location || 'Modern studio environment'}

Aspect Ratio: ${aspectRatio}

Ultra realistic. Cinematic lighting. Character naturally interacting with product.
`.trim();
  }

  // ===== CHARACTER-ONLY MODE =====
  if (contextMode === "character_only") {
    return `
${commonContext}

Session ID: ${sessionSeed}
Maintain consistent lighting and color grading across all shots.
${inputs.kit ? 'STRICT IDENTITY LOCK: Maintain exact same face and features across all shots.' : ''}

Shot ${shot.shotNumber}: ${shot.role}
Camera Angle: ${shot.camera}
Action: ${shot.action}

Character:
${inputs.character}

Wardrobe:
${inputs.wardrobe || 'Stylish outfit matching the scene aesthetic'}

Location:
${inputs.location || 'Modern studio environment'}

Aspect Ratio: ${aspectRatio}

Ultra realistic. Cinematic lighting. Professional lifestyle photography.
`.trim();
  }

  // Fallback
  return `${stylePrimer}\n\nSession ID: ${sessionSeed}\nAspect Ratio: ${aspectRatio}`;
};
