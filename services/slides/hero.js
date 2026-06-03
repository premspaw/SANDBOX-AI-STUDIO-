// ═══════════════════════════════════════════════════════════════════════════════
// HERO SLIDE TEMPLATE — First impression, hook attention
// ═══════════════════════════════════════════════════════════════════════════════

import { TOKENS, css } from '../design/tokens.js';
import { typography, position, ui, styleToString } from '../design/styles.js';
import { generateBackgroundStack } from '../design/backgrounds.js';
import { analyzeLayout } from '../design/hierarchy.js';
import { smartBreak } from '../design/semantic.js';

export function renderHeroSlide({ brand, palette, total, artDirection = 'cinematic', intensity = 'balanced', isLight = true }) {
  const { BRAND_PRIMARY } = palette;
  const safe = TOKENS.safe;
  
  // Analyze content hierarchy
  const content = {
    eyebrow: brand.name,
    headline: brand.hook,
    subhook: brand.subhook,
  };
  
  const hierarchy = analyzeLayout(content, 'hero', palette, isLight);
  const positions = hierarchy.positions;
  
  // Break headline if needed
  const headlineBreak = smartBreak(brand.hook, { maxLength: 45, maxLines: 2 });
  
  // Generate styles
  const headlineStyle = typography.scaledHeadline(headlineBreak.text, 320, 'left', hierarchy.readability.recommendedTextColor);
  const eyebrowStyle = typography.eyebrow(BRAND_PRIMARY);
  const bodyStyle = typography.body(hierarchy.readability.elements.body?.color, true);
  
  // Build content HTML
  const contentHTML = `
    <!-- TOP: brand line -->
    <div style="${styleToString({
      ...position.safeZone('left', { bottom: undefined }),
      borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}`,
      paddingBottom: css.px(TOKENS.spacing[3]),
    })}">
      <span style="${styleToString(eyebrowStyle)}; color: ${isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)'}">${brand.name}</span>
      <span style="${styleToString(eyebrowStyle)}; color: ${BRAND_PRIMARY}; float: right;">${brand.tag || 'Issue 01'}</span>
    </div>
    
    <!-- CENTER: headline -->
    <h1 style="${styleToString({
      ...headlineStyle,
      ...position.absolute({ left: safe.left, top: positions.headline?.top || 100 }),
      maxWidth: '320px',
    })}">${headlineBreak.text.replace(/\n/g, '<br/>')}</h1>
    
    <!-- BOTTOM: subhook -->
    <p style="${styleToString({
      ...bodyStyle,
      ...position.absolute({ left: safe.left, top: positions.subhook?.top || 350 }),
      maxWidth: '280px',
    })}">${brand.subhook || ''}</p>
  `;
  
  // Generate background
  const bgLayers = !isLight 
    ? generateBackgroundStack(palette, { intensity, isLight, useOrbs: true, useMesh: true })
    : [{ type: 'base', style: { background: palette.LIGHT_BG } }];
  
  return buildSlideWrapper({
    index: 0,
    total,
    artDirection,
    isLight,
    bgLayers,
    content: contentHTML,
    palette,
  });
}

// ─── Slide Wrapper Builder ─────────────────────────────────────────────────────
function buildSlideWrapper({ index, total, artDirection, isLight, bgLayers, content, palette }) {
  const isLast = index === total - 1;
  
  // Render background layers
  const bgHTML = bgLayers.map(layer => 
    `<div class="bg-layer ${layer.type}" style="${styleToString(layer.style)}"></div>`
  ).join('\n');
  
  // Progress bar
  const progress = ((index + 1) / total) * 100;
  const progressBar = `
    <div style="${styleToString({
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: `${css.px(TOKENS.spacing[4])} ${css.px(TOKENS.spacing[7])} ${css.px(TOKENS.spacing[5])}`,
      display: 'flex',
      alignItems: 'center',
      gap: css.px(TOKENS.spacing[3]),
      pointerEvents: 'none',
      zIndex: TOKENS.z.ui,
    })}">
      <div style="${styleToString({
        flex: 1,
        height: '3px',
        background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)',
        borderRadius: css.px(TOKENS.radius.full),
        overflow: 'hidden',
      })}">
        <div style="${styleToString({
          width: `${progress}%`,
          height: '100%',
          background: isLight ? palette.BRAND_PRIMARY : '#ffffff',
          borderRadius: 'inherit',
        })}"></div>
      </div>
      <span style="${styleToString({
        fontSize: '9px',
        fontWeight: 700,
        color: isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)',
        fontFamily: 'var(--font-body)',
      })}">${index + 1}/${total}</span>
    </div>
  `;
  
  // Swipe arrow (if not last)
  const arrow = !isLast ? `
    <div style="${styleToString({
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      background: isLight 
        ? 'linear-gradient(to left, rgba(0,0,0,0.06) 0%, transparent 100%)'
        : 'linear-gradient(to left, rgba(255,255,255,0.08) 0%, transparent 100%)',
    })}">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.35)'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  ` : '';
  
  return `
    <div class="slide slide-hero" data-slide-index="${index}" data-art-direction="${artDirection}" style="${styleToString({
      position: 'relative',
      width: css.px(TOKENS.canvas.width),
      height: css.px(TOKENS.canvas.height),
      flexShrink: 0,
      overflow: 'hidden',
      background: isLight ? palette.LIGHT_BG : (palette.SLIDE_BG || palette.DARK_BG),
    })}">
      ${bgHTML}
      <div style="${styleToString({ position: 'relative', zIndex: TOKENS.z.content })}">
        ${content}
      </div>
      ${progressBar}
      ${arrow}
    </div>
  `;
}
