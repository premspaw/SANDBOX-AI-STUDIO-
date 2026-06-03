// ═══════════════════════════════════════════════════════════════════════════════
// PROBLEM SLIDE TEMPLATE — Pain points, tension, confrontation
// ═══════════════════════════════════════════════════════════════════════════════

import { TOKENS, css } from '../design/tokens.js';
import { typography, position, styleToString } from '../design/styles.js';
import { generateBackgroundStack } from '../design/backgrounds.js';
import { analyzeLayout } from '../design/hierarchy.js';
import { smartBreak } from '../design/semantic.js';
import { buildSlideWrapper, pillStrikethrough, clampChars } from './utils.js';


export function renderProblemSlide({ slide, palette, index, total, artDirection = 'cinematic', intensity = 'balanced', isLight = false }) {
  const { BRAND_PRIMARY } = palette;
  const safe = TOKENS.safe;
  
  const points = slide.points || [];
  
  // Analyze content hierarchy
  const content = {
    eyebrow: 'The Problem',
    headline: slide.headline,
    painPoints: points,
    body: slide.body,
  };
  
  const hierarchy = analyzeLayout(content, 'problem', palette, isLight);
  const positions = hierarchy.positions;
  
  // Break headline
  const headlineBreak = smartBreak(slide.headline, { maxLength: 50, maxLines: 2, preferPunchWords: true });
  
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
    })}">${eyebrowStyle.color}</p>
    
    <!-- CENTER: headline -->
    <h2 style="${styleToString({
      ...headlineStyle,
      ...position.absolute({ left: safe.left, top: positions.headline?.top || 90 }),
      maxWidth: '320px',
    })}">${headlineBreak.text.replace(/\n/g, '<br/>')}</h2>
    
    <!-- BOTTOM: pain points + body -->
    <div style="${styleToString({
      ...position.absolute({ 
        left: safe.left, 
        right: safe.right, 
        top: positions.painPoints?.top || 280 
      }),
    })}">
      <div style="${styleToString({
        borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}`,
      })}">
        ${points.slice(0, 3).map(p => `
          <div style="${styleToString({
            padding: `${css.px(TOKENS.spacing[2])} 0`,
            borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}`,
          })}">
            ${pillStrikethrough(clampChars(p, 45), palette, isLight)}
          </div>
        `).join('')}
      </div>
      ${slide.body ? `
        <p style="${styleToString({
          ...bodyStyle,
          marginTop: css.px(TOKENS.spacing[3]),
        })}">${clampChars(slide.body, 120)}</p>
      ` : ''}
    </div>
  `;
  
  // Generate background (darker, compressed tension)
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
    slideId: 'problem',
  });
}
