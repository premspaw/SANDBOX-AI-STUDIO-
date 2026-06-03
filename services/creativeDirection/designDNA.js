// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN DNA ENGINE — System-wide creative direction configuration
// Defines the emotional and visual character of every carousel
// ═══════════════════════════════════════════════════════════════════════════════

export const DESIGN_DNA = {
  // Cinematic intensity levels
  cinematicLevels: {
    subtle:    { grain: 0.1,  glow: 0.2,  depth: 0.3,  drama: 0.2 },
    balanced:  { grain: 0.3,  glow: 0.4,  depth: 0.5,  drama: 0.5 },
    dramatic:  { grain: 0.6,  glow: 0.7,  depth: 0.8,  drama: 0.8 },
    cinematic: { grain: 0.9,  glow: 0.9,  depth: 1.0,  drama: 1.0 },
  },

  // Emotional intensity curve
  emotionalIntensity: {
    calm:      { escalation: 'flat',     peak: 'none',    resolution: 'gentle' },
    steady:    { escalation: 'gradual',  peak: 'mid',     resolution: 'soft' },
    dynamic:   { escalation: 'building', peak: 'late',    resolution: 'strong' },
    explosive: { escalation: 'sharp',    peak: 'climax',  resolution: 'dramatic' },
  },

  // Whitespace philosophy
  whitespaceRatio: {
    dense:     { text: 0.70,  visual: 0.25,  margin: 0.05 },
    balanced:  { text: 0.45,  visual: 0.35,  margin: 0.20 },
    editorial: { text: 0.30,  visual: 0.40,  margin: 0.30 },
    minimal:   { text: 0.20,  visual: 0.30,  margin: 0.50 },
  },

  // Visual density spectrum
  visualDensity: {
    light:  { elements: 2, layers: 1, complexity: 'simple' },
    medium: { elements: 3, layers: 2, complexity: 'layered' },
    heavy:  { elements: 4, layers: 3, complexity: 'rich' },
    maximal:{ elements: 5, layers: 4, complexity: 'complex' },
  },

  // Pacing curves for slide sequences
  pacingCurves: {
    flat:      [1, 1, 1, 1, 1, 1, 1],           // Steady throughout
    rising:    [0.3, 0.4, 0.5, 0.7, 0.9, 1.0, 1.0], // Building to climax
    wave:      [0.5, 0.8, 0.6, 0.9, 0.7, 1.0, 0.9], // Rhythmic waves
    hook:      [0.9, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0], // Hook then build
    reveal:    [0.4, 0.4, 0.6, 0.8, 0.9, 1.0, 0.9], // Slow reveal
  },

  // Typography energy signatures
  typographyEnergy: {
    whisper:   { weight: 'light',   scale: 0.8,  presence: 'subtle' },
    speak:     { weight: 'regular', scale: 1.0,  presence: 'clear' },
    shout:     { weight: 'bold',    scale: 1.3,  presence: 'strong' },
    scream:    { weight: 'heavy',   scale: 1.6,  presence: 'dominant' },
  },

  // Color aggression (how bold/vibrant)
  colorAggression: {
    muted:     { saturation: 0.6, contrast: 0.7, vibrancy: 'low' },
    natural:   { saturation: 0.9, contrast: 0.9, vibrancy: 'medium' },
    bold:      { saturation: 1.2, contrast: 1.1, vibrancy: 'high' },
    aggressive:{ saturation: 1.5, contrast: 1.4, vibrancy: 'extreme' },
  },

  // Editorial style influences
  editorialStyle: {
    classic:   { influence: 'traditional', grids: 'rigid',    flow: 'formal' },
    modern:    { influence: 'contemporary',  grids: 'flexible', flow: 'clean' },
    brutalist: { influence: 'raw',         grids: 'broken',   flow: 'aggressive' },
    editorial: { influence: 'magazine',      grids: 'asymmetric', flow: 'elegant' },
    digital:   { influence: 'screen-native', grids: 'fluid',   flow: 'dynamic' },
  },
};

// Default DNA profile
export const DEFAULT_DNA = {
  cinematicLevel: 'balanced',
  emotionalIntensity: 'dynamic',
  whitespaceRatio: 'balanced',
  visualDensity: 'medium',
  pacingCurve: 'rising',
  typographyEnergy: 'shout',
  colorAggression: 'natural',
  editorialStyle: 'modern',
};

// Topic to art direction auto-mapping
export const TOPIC_ART_DIRECTION_MAP = {
  // Finance & Business
  finance: { artDirection: 'luxury', emotionalTone: 'aspirational', intensity: 'steady' },
  investing: { artDirection: 'luxury', emotionalTone: 'confident', intensity: 'steady' },
  crypto: { artDirection: 'tech', emotionalTone: 'revolutionary', intensity: 'dynamic' },
  startup: { artDirection: 'apple', emotionalTone: 'optimistic', intensity: 'rising' },
  entrepreneurship: { artDirection: 'streetwear', emotionalTone: 'hustle', intensity: 'dynamic' },

  // Technology
  ai: { artDirection: 'futuristic', emotionalTone: 'revolutionary', intensity: 'dramatic' },
  software: { artDirection: 'tech', emotionalTone: 'precise', intensity: 'steady' },
  product: { artDirection: 'apple', emotionalTone: 'premium', intensity: 'balanced' },

  // Creative
  film: { artDirection: 'cinematic', emotionalTone: 'artistic', intensity: 'dramatic' },
  photography: { artDirection: 'editorial', emotionalTone: 'visual', intensity: 'balanced' },
  design: { artDirection: 'minimal', emotionalTone: 'refined', intensity: 'steady' },
  art: { artDirection: 'cinematic', emotionalTone: 'expressive', intensity: 'dynamic' },

  // Lifestyle
  fashion: { artDirection: 'editorial', emotionalTone: 'aspirational', intensity: 'dynamic' },
  beauty: { artDirection: 'luxury', emotionalTone: 'desirable', intensity: 'steady' },
  fitness: { artDirection: 'streetwear', emotionalTone: 'energetic', intensity: 'explosive' },
  wellness: { artDirection: 'minimal', emotionalTone: 'peaceful', intensity: 'calm' },

  // Content & Education
  storytelling: { artDirection: 'cinematic', emotionalTone: 'engaging', intensity: 'wave' },
  education: { artDirection: 'apple', emotionalTone: 'clear', intensity: 'steady' },
  tips: { artDirection: 'tech', emotionalTone: 'helpful', intensity: 'balanced' },
  tutorial: { artDirection: 'minimal', emotionalTone: 'practical', intensity: 'flat' },

  // Marketing
  marketing: { artDirection: 'streetwear', emotionalTone: 'persuasive', intensity: 'dynamic' },
  sales: { artDirection: 'luxury', emotionalTone: 'urgent', intensity: 'rising' },
  brand: { artDirection: 'editorial', emotionalTone: 'distinctive', intensity: 'balanced' },
};

// Detect art direction from topic
export function detectArtDirection(topic) {
  const topicLower = (topic || '').toLowerCase();
  
  for (const [key, config] of Object.entries(TOPIC_ART_DIRECTION_MAP)) {
    if (topicLower.includes(key)) {
      return config;
    }
  }
  
  // Default fallback
  return { artDirection: 'cinematic', emotionalTone: 'engaging', intensity: 'balanced' };
}

// Build DNA from creative brief
export function buildDNAFromBrief(brief) {
  const autoDetected = detectArtDirection(brief.topic);
  
  return {
    cinematicLevel: brief.cinematicLevel || DEFAULT_DNA.cinematicLevel,
    emotionalIntensity: brief.emotionalIntensity || autoDetected.intensity || DEFAULT_DNA.emotionalIntensity,
    whitespaceRatio: brief.whitespaceRatio || DEFAULT_DNA.whitespaceRatio,
    visualDensity: brief.visualDensity || DEFAULT_DNA.visualDensity,
    pacingCurve: brief.pacingCurve || DEFAULT_DNA.pacingCurve,
    typographyEnergy: brief.typographyEnergy || DEFAULT_DNA.typographyEnergy,
    colorAggression: brief.colorAggression || DEFAULT_DNA.colorAggression,
    editorialStyle: brief.editorialStyle || DEFAULT_DNA.editorialStyle,
    artDirection: brief.artDirection || autoDetected.artDirection,
    emotionalTone: brief.emotionalTone || autoDetected.emotionalTone,
  };
}

export default DESIGN_DNA;
