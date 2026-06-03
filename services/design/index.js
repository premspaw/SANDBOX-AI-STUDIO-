// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM — Unified export for all design modules
// ═══════════════════════════════════════════════════════════════════════════════

export { TOKENS, getToken, calculateTypeScale, getContrastRatio, validateContrast, css } from './tokens.js';
export { 
  position, 
  typography, 
  layout, 
  effects, 
  ui, 
  slideContainer, 
  styleToString, 
  generateSlideStyles 
} from './styles.js';
export { 
  calculateHierarchy, 
  calculatePositions, 
  optimizeReadability, 
  generateAnimationSequence, 
  analyzeLayout 
} from './hierarchy.js';
export { 
  generateMeshGradient, 
  generateGlowOrbs, 
  generateLayeredBackground,
  generateGrain, 
  generateVignette, 
  generateNoiseTexture,
  generateScanLines,
  generateBackgroundStack,
  generateLowPerformanceBackground 
} from './backgrounds.js';
export { 
  optimizeLines, 
  analyzeContentDensity, 
  calculateOptimalTypography 
} from './semantic.js';
// Note: smartBreak is imported directly by slide files from semantic.js
