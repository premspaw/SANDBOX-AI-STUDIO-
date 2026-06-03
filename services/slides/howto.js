// ═══════════════════════════════════════════════════════════════════════════════
// HOW-TO SLIDE TEMPLATE — Numbered steps, clarity
// ═══════════════════════════════════════════════════════════════════════════════

import { TOKENS, css } from '../design/tokens.js';
import { typography, position, styleToString } from '../design/styles.js';
import { generateBackgroundStack } from '../design/backgrounds.js';
import { analyzeLayout } from '../design/hierarchy.js';
import { smartBreak } from '../design/semantic.js';
import { buildSlideWrapper, numberedStep, clampChars } from './utils.js';

export function renderHowToSlide({ slide, palette, index, total, artDirection = 'cinematic', intensity = 'balanced', isLight = true }) {
  const { BRAND_PRIMARY } = palette;
  const safe = TOKENS.safe;
  
  const steps = (slide.steps || []).slice(0, 3);
  
  // Analyze content hierarchy
  const content = {
    eyebrow: 'How It Works',
    headline: slide.headline,
    steps: steps,
  };
  
  const hierarchy = analyzeLayout(content, 'howto', palette, isLight);
  const positions = hierarchy.positions;
  
  // Break headline
  const headlineBreak = smartBreak(slide.headline, { maxLength: 45, maxLines: 2 });
  
  // Generate styles
  const headlineStyle = typography.scaledHeadline(headlineBreak.text, 320, 'left', hierarchy.readability.recommendedTextColor);
  const eyebrowStyle = typography.eyebrow(BRAND_PRIMARY);
  
  // Build content HTML
  const contentHTML = `
    <!-- TOP: eyebrow -->
    <p style="${styleToString({
      ...eyebrowStyle,
      ...position.absolute({ left: safe.left, top: safe.top }),
    })}">How It Works</p>
    
    <!-- CENTER: headline -->
    <h2 style="${styleToString({
      ...headlineStyle,
      ...position.absolute({ left: safe.left, top: positions.headline?.top || 90 }),
      maxWidth: '320px',
    })}">${headlineBreak.text.replace(/\n/g, '<br/>')}</h2>
    
    <!-- BOTTOM: steps -->
    <div style="${styleToString({
      ...position.absolute({ 
        left: safe.left, 
        right: safe.right, 
        top: positions.steps?.top || 260 
      }),
    })}">
      ${steps.map((step, i) => numberedStep(i + 1, clampChars(step.title, 28), clampChars(step.desc, 50), palette, isLight)).join('')}
    </div>
  `;
  
  // Generate background
  const bgLayers = generateBackgroundStack(palette, { 
    intensity, 
    isLight, 
    useOrbs: intensity !== 'minimal', 
    useMesh: intensity !== 'minimal' 
  });
  
  return buildSlideWrapper({
    index,
    total,
    artDirection,
    isLight,
    bgLayers,
    content: contentHTML,
    palette,
    slideId: 'howto',
  });
}
