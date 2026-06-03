// ═══════════════════════════════════════════════════════════════════════════════
// SOLUTION SLIDE TEMPLATE — Hope, clarity, release
// ═══════════════════════════════════════════════════════════════════════════════

import { TOKENS, css } from '../design/tokens.js';
import { typography, position, styleToString } from '../design/styles.js';
import { generateBackgroundStack } from '../design/backgrounds.js';
import { analyzeLayout } from '../design/hierarchy.js';
import { smartBreak } from '../design/semantic.js';
import { buildSlideWrapper, quoteBox, clampChars } from './utils.js';

export function renderSolutionSlide({ slide, palette, index, total, artDirection = 'cinematic', intensity = 'balanced', isLight = false }) {
  const { BRAND_PRIMARY } = palette;
  const safe = TOKENS.safe;
  
  const quote = slide.quote ? clampChars(slide.quote, 100) : '';
  
  // Analyze content hierarchy
  const content = {
    eyebrow: 'The Solution',
    headline: slide.headline,
    quote: quote,
    body: slide.body,
  };
  
  const hierarchy = analyzeLayout(content, 'solution', palette, isLight);
  const positions = hierarchy.positions;
  
  // Break headline
  const headlineBreak = smartBreak(slide.headline, { maxLength: 50, maxLines: 2 });
  
  // Generate styles
  const headlineStyle = typography.scaledHeadline(headlineBreak.text, 320, 'left', hierarchy.readability.recommendedTextColor);
  const eyebrowStyle = typography.eyebrow(BRAND_PRIMARY);
  const bodyStyle = typography.body(hierarchy.readability.elements.body?.color, true);
  
  // Build content HTML
  const contentHTML = `
    <!-- TOP: eyebrow -->
    <p style="${styleToString({
      ...eyebrowStyle,
      ...position.absolute({ left: safe.left, top: safe.top }),
    })}">The Solution</p>
    
    <!-- CENTER: headline -->
    <h2 style="${styleToString({
      ...headlineStyle,
      ...position.absolute({ left: safe.left, top: positions.headline?.top || 90 }),
      maxWidth: '320px',
    })}">${headlineBreak.text.replace(/\n/g, '<br/>')}</h2>
    
    <!-- BOTTOM: quote + body -->
    <div style="${styleToString({
      ...position.absolute({ 
        left: safe.left, 
        right: safe.right, 
        top: positions.body?.top || 260 
      }),
    })}">
      ${quote ? quoteBox('Insight', quote, palette, isLight) : ''}
      <p style="${styleToString({
        ...bodyStyle,
        maxWidth: '300px',
      })}">${clampChars(slide.body, 140)}</p>
    </div>
  `;
  
  // Generate background (uses gradient, open and optimistic)
  const bgLayers = generateBackgroundStack(palette, { 
    intensity, 
    isLight, 
    useOrbs: true, 
    useMesh: true,
    useGradient: true 
  });
  
  return buildSlideWrapper({
    index,
    total,
    artDirection,
    isLight,
    bgLayers,
    content: contentHTML,
    palette,
    slideId: 'solution',
  });
}
