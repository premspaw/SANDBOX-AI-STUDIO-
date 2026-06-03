// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL HIERARCHY ENGINE — Dynamic layout based on content priority
// ═══════════════════════════════════════════════════════════════════════════════

import { TOKENS } from './tokens.js';

// ─── Element Priority Scores ────────────────────────────────────────────────────
const ELEMENT_PRIORITY = {
  headline: 10,
  cta: 9,
  statistic: 8,
  visual: 7,
  quote: 6,
  body: 5,
  eyebrow: 4,
  decoration: 2,
  background: 1,
};

// ─── Layout Mode Configurations ───────────────────────────────────────────────────
const LAYOUT_MODES = {
  // Hero: Headline dominant
  hero: {
    elements: ['eyebrow', 'headline', 'subhook'],
    weights: { headline: 10, eyebrow: 3, subhook: 4 },
    spacing: 'generous',
    align: 'left',
    density: 'sparse',
  },
  
  // Problem: Compressed, confronting
  problem: {
    elements: ['eyebrow', 'headline', 'painPoints', 'body'],
    weights: { headline: 8, painPoints: 7, body: 5, eyebrow: 3 },
    spacing: 'tight',
    align: 'left',
    density: 'dense',
  },
  
  // Solution: Open, optimistic
  solution: {
    elements: ['eyebrow', 'headline', 'quote', 'body'],
    weights: { headline: 9, quote: 7, body: 5, eyebrow: 3 },
    spacing: 'breathing',
    align: 'left',
    density: 'balanced',
  },
  
  // Features: Triad grid
  features: {
    elements: ['eyebrow', 'headline', 'featureList'],
    weights: { headline: 6, featureList: 9, eyebrow: 3 },
    spacing: 'structured',
    align: 'left',
    density: 'dense',
  },
  
  // Details: Stacked rhythm
  details: {
    elements: ['eyebrow', 'headline', 'bulletList'],
    weights: { headline: 7, bulletList: 8, eyebrow: 3 },
    spacing: 'consistent',
    align: 'left',
    density: 'structured',
  },
  
  // How-to: Numbered steps
  howto: {
    elements: ['eyebrow', 'headline', 'steps'],
    weights: { headline: 6, steps: 9, eyebrow: 3 },
    spacing: 'numbered',
    align: 'left',
    density: 'structured',
  },
  
  // CTA: Single focal, climactic
  cta: {
    elements: ['brand', 'headline', 'body', 'ctaButton'],
    weights: { headline: 10, ctaButton: 10, body: 3, brand: 2 },
    spacing: 'isolated',
    align: 'center',
    density: 'sparse',
  },
};

// ─── Calculate Visual Hierarchy ─────────────────────────────────────────────────
export const calculateHierarchy = (content, slideType = 'hero') => {
  const mode = LAYOUT_MODES[slideType] || LAYOUT_MODES.hero;
  
  // Score each element based on content presence and priority
  const scores = {};
  let totalScore = 0;
  
  mode.elements.forEach(element => {
    const hasContent = content[element] && 
      (typeof content[element] === 'string' ? content[element].length > 0 : true);
    
    const priority = mode.weights[element] || ELEMENT_PRIORITY[element] || 5;
    const score = hasContent ? priority : 0;
    
    scores[element] = {
      score,
      priority,
      hasContent,
      weight: score / 10, // 0-1 scale
    };
    
    totalScore += score;
  });
  
  // Calculate visual dominance percentages
  Object.keys(scores).forEach(key => {
    scores[key].dominance = totalScore > 0 ? (scores[key].score / totalScore) : 0;
  });
  
  // Determine layout density
  const activeElements = Object.values(scores).filter(s => s.hasContent).length;
  const density = activeElements > 4 ? 'dense' : activeElements > 2 ? 'balanced' : 'sparse';
  
  // Calculate recommended whitespace
  const whitespaceRatios = {
    sparse: 0.6,    // 60% whitespace
    balanced: 0.45, // 45% whitespace
    dense: 0.25,    // 25% whitespace
    structured: 0.35,
  };
  
  return {
    scores,
    totalScore,
    activeElements,
    density,
    recommendedWhitespace: whitespaceRatios[density] || 0.45,
    dominantElement: Object.entries(scores)
      .sort((a, b) => b[1].score - a[1].score)[0]?.[0],
    mode,
  };
};

// ─── Layout Position Calculator ─────────────────────────────────────────────────
export const calculatePositions = (hierarchy, safeZone) => {
  const { scores, density, mode } = hierarchy;
  const S = safeZone || TOKENS.safe;
  const canvasH = TOKENS.canvas.height;
  
  // Available vertical space
  const availableHeight = canvasH - S.top - S.bottom;
  
  // Calculate element heights based on dominance
  const positions = {};
  let currentY = S.top;
  
  // Sort elements by score (highest first)
  const sortedElements = Object.entries(scores)
    .filter(([_, s]) => s.hasContent)
    .sort((a, b) => b[1].score - a[1].score);
  
  // Spacing multipliers
  const spacingMultipliers = {
    sparse: 2.5,
    balanced: 1.8,
    dense: 1.2,
    tight: 0.8,
    isolated: 4,
  };
  
  const baseGap = 16;
  const gap = baseGap * (spacingMultipliers[mode.spacing] || 1.5);
  
  sortedElements.forEach(([name, data], index) => {
    // Height allocation based on dominance
    const heightAllocation = availableHeight * (data.dominance * 0.8 + 0.1);
    
    positions[name] = {
      top: currentY,
      height: heightAllocation,
      score: data.score,
      dominance: data.dominance,
    };
    
    currentY += heightAllocation + gap;
  });
  
  return positions;
};

// ─── Contrast & Readibility Optimizer ───────────────────────────────────────────
export const optimizeReadability = (bgColor, elements) => {
  // Determine if background is light or dark
  const isLight = (hex) => {
    if (!hex || typeof hex !== 'string') return false; // Default to dark
    const cleanHex = hex.startsWith('#') ? hex : `#${hex}`;
    const r = parseInt(cleanHex.slice(1, 3), 16) || 0;
    const g = parseInt(cleanHex.slice(3, 5), 16) || 0;
    const b = parseInt(cleanHex.slice(5, 7), 16) || 0;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  };
  
  const bgIsLight = isLight(bgColor);
  
  const optimized = {};
  
  Object.entries(elements).forEach(([name, content]) => {
    if (!content) return;
    
    const isImportant = ['headline', 'cta', 'statistic'].includes(name);
    
    optimized[name] = {
      color: bgIsLight 
        ? (isImportant ? '#111111' : 'rgba(0,0,0,0.6)')
        : (isImportant ? '#ffffff' : 'rgba(255,255,255,0.7)'),
      weight: isImportant ? 700 : 400,
      size: isImportant ? 'large' : 'normal',
    };
  });
  
  return {
    isLight: bgIsLight,
    elements: optimized,
    background: bgColor,
    recommendedTextColor: bgIsLight ? '#111111' : '#ffffff',
  };
};

// ─── Animation Sequence Generator ───────────────────────────────────────────────
export const generateAnimationSequence = (hierarchy, intensity = 'balanced') => {
  const intensityTiming = {
    minimal: { stagger: 0, duration: 'normal' },
    balanced: { stagger: 150, duration: 'normal' },
    aggressive: { stagger: 100, duration: 'fast' },
    editorial: { stagger: 200, duration: 'slow' },
  };
  
  const timing = intensityTiming[intensity] || intensityTiming.balanced;
  const { scores } = hierarchy;
  
  // Sort by priority (highest first for entrance order)
  const sorted = Object.entries(scores)
    .filter(([_, s]) => s.hasContent)
    .sort((a, b) => b[1].score - a[1].score);
  
  return sorted.map(([name, data], index) => ({
    element: name,
    delay: index * timing.stagger,
    duration: TOKENS.motion[timing.duration],
    easing: TOKENS.motion.easing.smooth,
    priority: data.score,
    animation: index === 0 ? 'fade-in-scale' : 'fade-in-up',
  }));
};

// ─── Export Combined Layout Analysis ────────────────────────────────────────────
export const analyzeLayout = (content, slideType, palette, isLight) => {
  const hierarchy = calculateHierarchy(content, slideType);
  const positions = calculatePositions(hierarchy);
  const readability = optimizeReadability(
    isLight ? palette.LIGHT_BG : (palette.DARK_BG || palette.SLIDE_BG),
    content
  );
  const animation = generateAnimationSequence(hierarchy);
  
  return {
    hierarchy,
    positions,
    readability,
    animation,
    recommendations: generateRecommendations(hierarchy, readability),
  };
};

// ─── Generate Layout Recommendations ───────────────────────────────────────────
const generateRecommendations = (hierarchy, readability) => {
  const recs = [];
  
  if (hierarchy.density === 'dense') {
    recs.push('Consider splitting content — high density may reduce impact');
  }
  
  if (hierarchy.activeElements > 5) {
    recs.push('Too many elements — remove 1-2 for clearer hierarchy');
  }
  
  if (readability.isLight) {
    recs.push('Light background — ensure sufficient contrast on all text');
  }
  
  return recs;
};
