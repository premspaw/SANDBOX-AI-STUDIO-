/**
 * Avatar Studio Prompt Builder Service
 * Compiles exact GPT Image 2 Reference Board prompts for the 6-Board System.
 */

const BOARDS = {
    SHOT: `Create a single high-resolution, densely packed storyboard reference sheet titled "SHOT BOARD" using the attached photo as the single source keyframe. Generate a sequential 12-shot storyboard that breaks the scene into a coherent visual progression — same character(s), same location, same lighting continuity — as if filmed as continuous coverage. All on-image labels in ENGLISH. Editorial storyboard layout with a dark near-black background, thin yellow neon accent light, faint film-grain overlay, and production-grade storyboard UI. The composition should feel structured but flexible: allow the source keyframe, metadata, shot grid, camera notes, and secondary panels to float into different balanced placements rather than locking them into a fixed left-and-right arrangement. Include: A prominent source keyframe with metadata block: SCENE · ACT · SHOT COUNT: 12 · RUNTIME ~30s · SETTING · CHARACTERS · EMOTIONAL ARC · CAMERA STYLE · COLOR SCRIPT · EDIT STYLE. PANEL 01 — SHOT SEQUENCE (12 frames): 01 ESTABLISHING WIDE · 02 CHARACTER ENTERS — MEDIUM · 03 OVER-THE-SHOULDER · 04 CLOSE-UP — REACTION · 05 INSERT — OBJECT DETAIL · 06 COUNTER OTS · 07 TWO-SHOT MEDIUM · 08 TRACKING SHOT · 09 LOW ANGLE WIDE · 10 EXTREME CLOSE-UP — EYES · 11 SLOW PULL-BACK · 12 WIDE — RESOLUTION. PANEL 02 — KEY EMOTIONAL BEATS (3 dramatic close-ups). PANEL 03 — CAMERA NOTES (lens choices, motion, framing, height). PANEL 04 — LIGHTING CONTINUITY (4 frames). PANEL 05 — COVERAGE TYPES (Wide, Medium, Close-Up, Insert, OTS). PANEL 06 — COLOR PALETTE (6 HEX swatches). Bottom: "Use this shot board as a visual reference for consistent scene breakdown across all generations." Style: Cinematic · Realistic · Continuous. Photorealistic. 8K, fine grain, cinematic color grading.`,
    
    OBJECT: `Create a single high-resolution, densely packed product/object reference sheet titled "OBJECT BOARD" using the attached photo of the object as the single source of truth for design, materials, proportions, color and detailing. The object must be identical across every panel. All on-image labels in ENGLISH. Editorial product-design board layout with a dark near-black background, thin yellow neon accent light, faint film-grain overlay, and premium industrial-design UI. Include a prominent hero product shot with metadata block: NAME · ERA · ORIGIN · MATERIAL · DIMENSIONS · WEIGHT · DESCRIPTION · KEY FEATURES · CONDITION · PURPOSE. PANEL 01 — VIEWS (6 angles on neutral plinth): FRONT · 3/4 LEFT · LEFT SIDE · BACK · 3/4 RIGHT · TOP-DOWN. PANEL 02 — DETAILS (4 macros): handle/grip · body/blade · engraving/maker's mark · edge/wear. PANEL 03 — LIGHTING/MOOD (4 same-angle portraits): SOFT DAYLIGHT · WARM TUNGSTEN · COOL BLUE NIGHT · HARD CINEMATIC SIDE-LIGHT. PANEL 04 — COLOR PALETTE (6 HEX swatches). Bottom: "Use this product board as a visual reference for consistent depiction of the object across all generations." Style: Premium · Realistic · Cinematic. Photorealistic. 8K, fine grain, cinematic color grading.`,

    LOCATION: `Create a single high-resolution, densely packed location reference sheet titled "LOCATION BOARD" using the attached photo of the location as the single source of truth for its architecture, atmosphere, lighting, materials and color palette. The space must be identical across every panel. All on-image labels in ENGLISH. Editorial location-reference board layout with a dark near-black background, thin yellow neon accent light, faint film-grain overlay, and production-grade location-scout UI. Include a prominent hero shot with metadata block: NAME · TYPE · ERA · SCALE · ARCHITECTURE · MATERIALS · ATMOSPHERE · DEFAULT TIME · DEFAULT WEATHER · PURPOSE. PANEL 01 — VIEWS (5 shots, identical lighting): WIDE · MID · TIGHT · ALT ANGLE · OVERHEAD. PANEL 02 — TIME OF DAY (4 same-angle shots): DAWN · NOON · DUSK · NIGHT. PANEL 03 — DETAILS (2 macros): material/texture close-up · architectural detail. PANEL 04 — SET DRESSING/PROPS (5 isolated prop studies on dark background). PANEL 05 — WEATHER/MOOD (4 shots): CLEAR SUNNY · OVERCAST · RAIN-SOAKED · MISTY FOG. PANEL 06 — COLOR PALETTE (6 HEX swatches). Bottom: "Use this location board as a visual reference for consistent depiction of the environment across all generations." Style: Modern · Realistic · Cinematic. Photorealistic. 8K, fine grain, cinematic color grading.`,

    POSE: `Create a single high-resolution, densely packed character pose reference sheet titled "POSE BOARD" using the attached photo of the character as the single source of truth for face, hair, body proportions and outfit. The character must be identical across every panel. All on-image labels in ENGLISH. Editorial animation-reference layout with a dark near-black background, thin yellow neon accent light, faint film-grain overlay, and studio reference UI. Include a large full-body hero standing shot with metadata block: NAME · AGE · BUILD · HEIGHT · OUTFIT · POSE LANGUAGE · CENTER OF GRAVITY · DOMINANT HAND · PURPOSE: animation and video-generation reference. PANEL 01 — BASIC POSES (5 full-body shots): STAND · SIT · WALK · RUN · JUMP. PANEL 02 — ACTION POSES (5 dynamic shots): FIGHT STANCE · THROW · DODGE · CLIMB · LAND. PANEL 03 — EXPRESSIONS (5 tight headshots): NEUTRAL · LAUGH · ANGRY · SAD · SURPRISED. PANEL 04 — ANGLE COVERAGE (4 standing portraits): FRONT · 3/4 · SIDE · BACK. PANEL 05 — COLOR PALETTE (6 HEX swatches). Bottom: "Use this pose sheet as a visual reference for consistent animation of the character across all generations." Style: Animation Ready · Realistic · Cinematic. Photorealistic. 8K, fine grain, cinematic color grading.`,

    CHARACTER: `Create a single high-resolution, densely packed character reference sheet titled "CHARACTER BOARD" using the attached photo of the person as the single source of truth for face, hair, eyes, skin tone and body proportions. The same person must appear in every panel — same age, same outfit. All on-image labels in ENGLISH. Editorial reference-board layout with a dark near-black background, thin yellow neon accent light, faint film-grain overlay, and production-grade character-design UI. Include a large hero portrait with metadata block: NAME · AGE · HEIGHT · BUILD · HAIR · EYES · FEATURES · OUTFIT · CHARACTER · MOOD. PANEL 01 — VIEWS (5 full-body shots, neutral backdrop): FRONT · 3/4 LEFT · SIDE LEFT · BACK · 3/4 RIGHT. PANEL 02 — EXPRESSIONS (5 tight headshots): NEUTRAL · SMILE · THOUGHTFUL · FOCUSED · SERIOUS. PANEL 03 — DETAILS (2 macros): face/eyes close-up · distinctive outfit detail. PANEL 04 — OUTFIT FLAT-LAYS (5 isolated product shots on dark background): jacket · shirt · trousers · watch · shoes. PANEL 05 — LIGHTING/MOOD (4 same-pose portraits): SOFT DAYLIGHT · WARM TUNGSTEN INTERIOR · COOL BLUE NIGHT · HARD CINEMATIC SIDE-LIGHT. PANEL 06 — COLOR PALETTE (6 HEX swatches). Bottom: "Use this character board as a visual reference for consistent depiction of the character across all generations." Style: Modern · Realistic · Cinematic. Photorealistic. 8K, fine grain, cinematic color grading.`,

    CREATURE: `Create a single high-resolution, densely packed creature reference sheet titled "CREATURE BOARD" using the attached image of the creature as the single source of truth for anatomy, skin/scale/fur texture, color and proportions. The creature must be identical across every panel. All on-image labels in ENGLISH. Editorial creature-design board layout with a dark near-black background, thin yellow neon accent light, faint film-grain overlay, and VFX-studio creature-design UI. Include a large hero portrait with metadata block: NAME/SPECIES · AGE · SIZE · WEIGHT · HABITAT · DIET · TEMPERAMENT · DISTINCT FEATURES (3-5 bullets) · ABILITIES/TRAITS (3-4 bullets) · LORE NOTE. PANEL 01 — VIEWS (5 full-body angles): FRONT · 3/4 LEFT · SIDE LEFT · BACK · 3/4 RIGHT. PANEL 02 — EXPRESSIONS/EMOTIONS (5 head close-ups): CALM · HUNTING · ROARING · CURIOUS · WOUNDED. PANEL 03 — ANATOMY DETAILS (4 macros): EYES · TEETH/MOUTH · SKIN/SCALES/FUR TEXTURE · CLAW/LIMB/WING. PANEL 04 — SCALE COMPARISON (beside 1.8m human + 30cm ruler). PANEL 05 — BEHAVIOR/POSES (4 environmental shots): RESTING · STALKING · ATTACKING · FLEEING. PANEL 06 — COLOR PALETTE (6 HEX swatches). Bottom: "Use this creature board as a visual reference for consistent depiction of the creature across all generations." Style: VFX Ready · Realistic · Cinematic. Photorealistic. 8K, fine grain, cinematic color grading.`
};

/**
 * Retrieves the compiled prompt for the selected Reference Board
 * @param {string} boardType - SHOT, OBJECT, LOCATION, POSE, CHARACTER, CREATURE
 * @param {string} additionalContext - Optional context to prepend to the prompt
 * @param {string} model - Visual engine selected (gpt2 or banana)
 * @param {object} boardMeta - Metadata parameters dynamically captured from the client UI
 */
export function buildBoardPrompt(boardType, additionalContext = '', model = 'gpt2', boardMeta = {}) {
    const basePrompt = BOARDS[boardType] || BOARDS.CHARACTER;
    let compiledPrompt = basePrompt;

    // Build the dynamic metadata blocks based on board type
    if (boardType === 'SHOT') {
        const scene = boardMeta.name || 'Untitled Scene';
        const genre = boardMeta.genre || 'Cinematic';
        const camera = boardMeta.cinematographyStyle || 'Cinematic';
        
        const shotMetadata = `SCENE: "${scene}" · ACT: I · SHOT COUNT: 12 · RUNTIME ~30s · SETTING: 'Same Location' · CHARACTERS: 'Same Character(s)' · EMOTIONAL ARC: 'Dramatic Progression' · CAMERA STYLE: "${camera}" · COLOR SCRIPT: "${genre}" · EDIT STYLE: 'Continuous continuity'`;
        
        compiledPrompt = compiledPrompt.replace(
            `SCENE · ACT · SHOT COUNT: 12 · RUNTIME ~30s · SETTING · CHARACTERS · EMOTIONAL ARC · CAMERA STYLE · COLOR SCRIPT · EDIT STYLE`,
            shotMetadata
        );
    } else if (boardType === 'OBJECT') {
        const name = boardMeta.name || 'Prop Object';
        const material = boardMeta.material || 'Premium Materials';
        const colors = boardMeta.colorPalette || 'Cohesive Palette';
        const style = boardMeta.brandStyle || 'Industrial Design';
        
        const objectMetadata = `NAME: "${name}" · ERA: 'Contemporary' · ORIGIN: 'Design Studio' · MATERIAL: "${material}" · DIMENSIONS: 'Standard' · WEIGHT: 'Standard' · DESCRIPTION: "${style}" · KEY FEATURES: "${colors}" · CONDITION: 'New' · PURPOSE: 'Product design reference'`;
        
        compiledPrompt = compiledPrompt.replace(
            `NAME · ERA · ORIGIN · MATERIAL · DIMENSIONS · WEIGHT · DESCRIPTION · KEY FEATURES · CONDITION · PURPOSE`,
            objectMetadata
        );
    } else if (boardType === 'LOCATION') {
        const name = boardMeta.name || 'Scenic Location';
        const type = boardMeta.setting || 'Environment';
        const era = boardMeta.era || 'Contemporary';
        const time = boardMeta.timeOfDay || 'Golden hour';
        const weather = boardMeta.weather || 'Clear';
        
        const locationMetadata = `NAME: "${name}" · TYPE: "${type}" · ERA: "${era}" · SCALE: 'Epic Scale' · ARCHITECTURE: 'Detailed' · MATERIALS: 'Realistic Materials' · ATMOSPHERE: 'Cohesive' · DEFAULT TIME: "${time}" · DEFAULT WEATHER: "${weather}" · PURPOSE: 'Consistent environment reference'`;
        
        compiledPrompt = compiledPrompt.replace(
            `NAME · TYPE · ERA · SCALE · ARCHITECTURE · MATERIALS · ATMOSPHERE · DEFAULT TIME · DEFAULT WEATHER · PURPOSE`,
            locationMetadata
        );
    } else if (boardType === 'POSE') {
        const name = boardMeta.name || 'Character';
        const action = boardMeta.action || 'Dynamic movement';
        const emotion = boardMeta.emotion || 'Determined';
        
        const poseMetadata = `NAME: "${name}" · AGE: 'Adult' · BUILD: 'Athletic' · HEIGHT: '1.8m' · OUTFIT: 'Studio costume' · POSE LANGUAGE: "${action}" · CENTER OF GRAVITY: 'Balanced' · DOMINANT HAND: 'Right' · PURPOSE: animation and video-generation reference (emotion: "${emotion}")`;
        
        compiledPrompt = compiledPrompt.replace(
            `NAME · AGE · BUILD · HEIGHT · OUTFIT · POSE LANGUAGE · CENTER OF GRAVITY · DOMINANT HAND · PURPOSE: animation and video-generation reference`,
            poseMetadata
        );
    } else if (boardType === 'CHARACTER') {
        const name = boardMeta.name || 'Character';
        const age = boardMeta.age || '25';
        const gender = boardMeta.gender || 'Person';
        const ethnicity = boardMeta.ethnicity || 'Natural';
        const build = boardMeta.build || 'Standard';
        const outfit = boardMeta.outfit || 'Cohesive outfit';
        const hair = boardMeta.hair || 'Cohesive hair style';
        const vibe = boardMeta.personality || 'Neutral';
        
        const charMetadata = `NAME: "${name}" · AGE: "${age}" · HEIGHT: '1.75m' · BUILD: "${build}" · HAIR: "${hair}" · EYES: 'Matching' · FEATURES: "Gender: ${gender} · Ethnicity/Skin: ${ethnicity}" · OUTFIT: "${outfit}" · CHARACTER: "${vibe}" · MOOD: 'Consistent'`;
        
        compiledPrompt = compiledPrompt.replace(
            `NAME · AGE · HEIGHT · BUILD · HAIR · EYES · FEATURES · OUTFIT · CHARACTER · MOOD`,
            charMetadata
        );

        // Dynamic Style Substitution
        let styleStr = 'Style: Modern · Realistic · Cinematic. Photorealistic. 8K, fine grain, cinematic color grading.';
        if (boardMeta.style) {
            if (boardMeta.style === 'Realistic') {
                styleStr = 'Style: Modern · Realistic · Cinematic. Photorealistic, 8K, fine grain, cinematic color grading, raw photo.';
            } else if (boardMeta.style === 'Ultra Realistic') {
                styleStr = 'Style: Ultra-Realistic · Hyper-Photorealistic · Highly Detailed. Incredible textures, pores, skin details, raytraced real-world lighting, masterpiece raw photo quality, highly authentic likeness.';
            } else if (boardMeta.style === '3D') {
                styleStr = 'Style: 3D Octane Render · Unreal Engine 5 Style · Cinematic CGI. Premium 3D modeling, octane render, raytracing, highly detailed subsurface scattering, high-end digital character styling.';
            } else if (boardMeta.style === 'Anime') {
                styleStr = 'Style: Premium Japanese Anime · Detailed Cell-Shaded illustration · Makoto Shinkai aesthetic. Hand-drawn anime character sheet, highly clean line-art, cinematic anime keys, vibrant cell shading.';
            }
        }
        compiledPrompt = compiledPrompt.replace(
            'Style: Modern · Realistic · Cinematic. Photorealistic. 8K, fine grain, cinematic color grading.',
            styleStr
        );
    } else if (boardType === 'CREATURE') {
        const name = boardMeta.name || 'Creature';
        const type = boardMeta.type || 'Organism';
        const size = boardMeta.size || 'Medium';
        const biome = boardMeta.biome || 'Terrestrial';
        
        const creatureMetadata = `NAME/SPECIES: "${name} (${type})" · AGE: 'N/A' · SIZE: "${size}" · WEIGHT: 'N/A' · HABITAT: "${biome}" · DIET: 'N/A' · TEMPERAMENT: 'Predatory' · DISTINCT FEATURES: 'Detailed physiology' · ABILITIES/TRAITS: 'Adapts to environment' · LORE NOTE: 'Consistent creature reference study'`;
        
        compiledPrompt = compiledPrompt.replace(
            `NAME/SPECIES · AGE · SIZE · WEIGHT · HABITAT · DIET · TEMPERAMENT · DISTINCT FEATURES (3-5 bullets) · ABILITIES/TRAITS (3-4 bullets) · LORE NOTE`,
            creatureMetadata
        );
    }

    if (additionalContext && additionalContext.trim().length > 0) {
        return `[Context Override: ${additionalContext.trim()}]\n\n${compiledPrompt}`;
    }
    
    return compiledPrompt;
}
