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
const DYNAMIC_SHOTS = {
    PRODUCT: {
        camera: [
            "macro extreme close-up",
            "360-degree rotating view",
            "low angle hero shot",
            "overhead flat lay perspective",
            "slow tracking along texture",
            "dolly push-in to detail",
            "floating minimalist composition",
            "reflection shot on dark surface",
            "cinematic depth of field macro"
        ],
        action: [
            "product showcase reveal",
            "highlighting exquisite craftsmanship",
            "demonstrating fine materials",
            "rotating slowly to catch light",
            "pristine studio presentation",
            "elegant material showcase",
            "detail inspection sweep",
            "feature highlight reveal"
        ]
    },
    CHARACTER: {
        camera: [
            "medium portrait shot",
            "candid lifestyle angle",
            "over-the-shoulder perspective",
            "wide establishing movement",
            "steadicam smooth glide",
            "dynamic tracking shot",
            "low angle cinematic power",
            "lifestyle depth of field"
        ],
        action: [
            "casual walking motion",
            "confident looking at camera",
            "authentic interaction moment",
            "mid-laugh lifestyle beat",
            "proud presentation gesture",
            "naturally adjusting wardrobe",
            "walking through environment",
            "turning to face camera"
        ]
    }
};

export const SHOT_TEMPLATES = {
    hook: {
        camera: [
            "extreme close-up reveal",
            "dynamic push-in",
            "dramatic low angle",
            "fast zoom to detail",
            "slow-motion entrance"
        ],
        action: [
            "bold visual introduction",
            "mysterious reveal",
            "power statement start",
            "cinematic first impression"
        ]
    },
    hero_outro: {
        camera: [
            "signature pose medium",
            "final wide reveal",
            "confident close-up finish",
            "victorious low angle"
        ],
        action: [
            "satisfied product hold",
            "memorable final pose",
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
export const buildShotPlan = ({ inputs, niche, duration }) => {
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

    // 2️⃣ MIDDLE DYNAMIC SCENES with VARIATION (Mode-Sensed)
    const isProductOnly = contextMode === "product_only";
    const template = isProductOnly ? DYNAMIC_SHOTS.PRODUCT : DYNAMIC_SHOTS.CHARACTER;

    const shuffledCameras = shuffleArray(template.camera);
    const shuffledActions = shuffleArray(template.action);

    for (let i = 1; i < totalShots - 1; i++) {
        const cameraIndex = (i - 1) % shuffledCameras.length;
        const actionIndex = (i - 1) % shuffledActions.length;

        shots.push({
            role: isProductOnly ? "product_detail" : "dynamic_scene",
            shotNumber: i + 1,
            camera: shuffledCameras[cameraIndex],
            action: shuffledActions[actionIndex],
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
export const buildPromptFromShot = (inputs, shot, niche, aspectRatio, sessionSeed) => {
    const stylePrimer = STYLE_PRIMERS[niche] || STYLE_PRIMERS.CUSTOM;
    const contextMode = shot.contextMode;

    // ===== PRODUCT-ONLY MODE =====
    if (contextMode === "product_only") {
        return `
${stylePrimer}

Session ID: ${sessionSeed}
Maintain consistent lighting and color grading across all shots.

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
${stylePrimer}

Session ID: ${sessionSeed}
Maintain consistent lighting and color grading across all shots.

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
${stylePrimer}

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
