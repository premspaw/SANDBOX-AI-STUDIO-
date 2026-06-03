// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE TEMPLATES — Unified export for all slide renderers
// ═══════════════════════════════════════════════════════════════════════════════

export { renderHeroSlide } from './hero.js';
export { renderProblemSlide } from './problem.js';
export { renderSolutionSlide } from './solution.js';
export { renderFeaturesSlide } from './features.js';
export { renderDetailsSlide } from './details.js';
export { renderHowToSlide } from './howto.js';
export { renderCTASlide } from './cta.js';

export { 
  buildSlideWrapper,
  clampChars,
  pillStrikethrough,
  quoteBox,
  featureRow,
  numberedStep,
  ctaButton,
} from './utils.js';
// Note: styleToString is imported from design/styles.js via design/index.js
