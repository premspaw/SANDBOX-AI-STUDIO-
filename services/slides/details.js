// ═══════════════════════════════════════════════════════════════════════════════
// DETAILS SLIDE TEMPLATE — Bullet rhythm, stacked info
// ═══════════════════════════════════════════════════════════════════════════════

import { TOKENS, css } from '../design/tokens.js';
import { typography, position, styleToString } from '../design/styles.js';
import { generateBackgroundStack } from '../design/backgrounds.js';
import { analyzeLayout } from '../design/hierarchy.js';
import { smartBreak } from '../design/semantic.js';
import { buildSlideWrapper, clampChars } from './utils.js';

export function renderDetailsSlide({ slide, palette, index, total, artDirection = 'cinematic', intensity = 'balanced', isLight = false }) {
  const { BRAND_PRIMARY } = palette;
  const safe = TOKENS.safe;
  
  const points = (slide.points || []).slice(0, 4);
  
  // Analyze content hierarchy
  const content = {
    eyebrow: 'The Details',
    headline: slide.headline,
    bulletList: points,
  };
  
  const hierarchy = analyzeLayout(content, 'details', palette, isLight);
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
    })}">The Details</p>
    
    <!-- CENTER: headline -->
    <h2 style="${styleToString({
      ...headlineStyle,
      ...position.absolute({ left: safe.left, top: positions.headline?.top || 90 }),
      maxWidth: '320px',
    })}">${headlineBreak.text.replace(/\n/g, '<br/>')}</h2>
    
    <!-- BOTTOM: bullet points -->
    <div style="${styleToString({
      ...position.absolute({ 
        left: safe.left, 
        right: safe.right, 
        top: positions.bulletList?.top || 260 
      }),
      borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}`,
    })}">
      ${points.map(p => `
        <div style="${styleToString({
          padding: `${css.px(TOKENS.spacing[2])} 0`,
          borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}`,
        })}">
          <span style="${styleToString({
            display: 'inline-block',
            width: '3px',
            height: '3px',
            borderRadius: '50%',
            background: BRAND_PRIMARY,
            verticalAlign: 'middle',
            marginRight: css.px(TOKENS.spacing[2]),
            marginBottom: '2px',
          })}"></span>
          <span style="${styleToString({
            fontSize: '12px',
            color: isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)',
            fontFamily: 'var(--font-body)',
            lineHeight: 1.45,
          })}">${clampChars(p, 55)}</span>
        </div>
      `).join('')}
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
    slideId: 'details',
  });
}
