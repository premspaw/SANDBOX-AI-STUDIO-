// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE UTILITIES — Shared helpers for all slide templates
// ═══════════════════════════════════════════════════════════════════════════════

import { TOKENS, css } from '../design/tokens.js';

// ─── Slide Wrapper Builder ─────────────────────────────────────────────────────
export function buildSlideWrapper({ index, total, artDirection, isLight, bgLayers, content, palette, slideId = 'slide' }) {
  const isLast = index === total - 1;
  
  // Render background layers
  const bgHTML = bgLayers.map((layer, i) => 
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
    <div class="slide slide-${slideId}" data-slide-index="${index}" data-art-direction="${artDirection}" style="${styleToString({
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

// ─── Style Object to CSS String ──────────────────────────────────────────────────
export function styleToString(style) {
  if (!style || typeof style !== 'object') return '';
  return Object.entries(style)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${kebabKey}:${value}`;
    })
    .join(';');
}

// ─── Text Clamp Utility ─────────────────────────────────────────────────────────
export function clampChars(text, maxChars) {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars - 3).trim();
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 10 ? truncated.slice(0, lastSpace) + '...' : truncated + '...';
}

// ─── Strikethrough Pill Component ─────────────────────────────────────────────────
export function pillStrikethrough(text, palette, isLight) {
  return `
    <span style="${styleToString({
      display: 'inline-flex',
      alignItems: 'center',
      padding: `${css.px(TOKENS.spacing[1])} ${css.px(TOKENS.spacing[3])}`,
      background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
      borderRadius: css.px(TOKENS.radius.lg),
      fontSize: '12px',
      color: isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)',
      fontFamily: 'var(--font-body)',
      textDecoration: 'line-through',
      textDecorationColor: palette.BRAND_PRIMARY,
      textDecorationThickness: '2px',
    })}">${text}</span>
  `;
}

// ─── Quote Box Component ────────────────────────────────────────────────────────
export function quoteBox(label, quote, palette, isLight) {
  return `
    <div style="${styleToString({
      padding: `${css.px(TOKENS.spacing[4])} ${css.px(TOKENS.spacing[5])}`,
      background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
      borderRadius: css.px(TOKENS.radius.xl),
      borderLeft: `3px solid ${palette.BRAND_PRIMARY}`,
      marginBottom: css.px(TOKENS.spacing[4]),
    })}">
      <p style="${styleToString({
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '1px',
        textTransform: 'uppercase',
        color: palette.BRAND_PRIMARY,
        margin: `0 0 ${css.px(TOKENS.spacing[2])} 0`,
        fontFamily: 'var(--font-body)',
      })}">${label}</p>
      <p style="${styleToString({
        fontSize: '14px',
        lineHeight: 1.5,
        fontStyle: 'italic',
        color: isLight ? '#111' : '#fff',
        margin: 0,
        fontFamily: 'var(--font-heading)',
      })}">"${quote}"</p>
    </div>
  `;
}

// ─── Feature Row Component ──────────────────────────────────────────────────────
export function featureRow(icon, title, desc, palette, isLight) {
  return `
    <div style="${styleToString({
      display: 'flex',
      alignItems: 'flex-start',
      gap: css.px(TOKENS.spacing[3]),
      padding: `${css.px(TOKENS.spacing[3])} 0`,
      borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'}`,
    })}">
      <span style="${styleToString({
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: palette.BRAND_PRIMARY,
        marginTop: '6px',
        flexShrink: 0,
      })}"></span>
      <div>
        <p style="${styleToString({
          fontSize: '13px',
          fontWeight: 600,
          color: isLight ? '#111' : '#fff',
          margin: `0 0 ${css.px(TOKENS.spacing[1])} 0`,
          fontFamily: 'var(--font-body)',
        })}">${title}</p>
        <p style="${styleToString({
          fontSize: '12px',
          color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)',
          margin: 0,
          lineHeight: 1.4,
          fontFamily: 'var(--font-body)',
        })}">${desc}</p>
      </div>
    </div>
  `;
}

// ─── Numbered Step Component ──────────────────────────────────────────────────────
export function numberedStep(number, title, desc, palette, isLight) {
  return `
    <div style="${styleToString({
      display: 'flex',
      alignItems: 'flex-start',
      gap: css.px(TOKENS.spacing[3]),
      padding: `${css.px(TOKENS.spacing[3])} 0`,
    })}">
      <span style="${styleToString({
        fontSize: '22px',
        fontWeight: 300,
        color: palette.BRAND_PRIMARY,
        fontFamily: 'var(--font-heading)',
        minWidth: '32px',
      })}">${String(number).padStart(2, '0')}</span>
      <div>
        <p style="${styleToString({
          fontSize: '13px',
          fontWeight: 600,
          color: isLight ? '#111' : '#fff',
          margin: `0 0 ${css.px(TOKENS.spacing[1])} 0`,
          fontFamily: 'var(--font-body)',
        })}">${title}</p>
        <p style="${styleToString({
          fontSize: '12px',
          color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)',
          margin: 0,
          lineHeight: 1.4,
          fontFamily: 'var(--font-body)',
        })}">${desc}</p>
      </div>
    </div>
  `;
}

// ─── CTA Button Component ─────────────────────────────────────────────────────────
export function ctaButton(text, palette, isLight, size = 'md') {
  const sizes = {
    sm: { padding: '8px 20px', fontSize: 12 },
    md: { padding: '12px 28px', fontSize: 14 },
    lg: { padding: '16px 36px', fontSize: 16 },
  };
  
  const s = sizes[size];
  
  return `
    <div style="${styleToString({
      display: 'inline-flex',
      alignItems: 'center',
      gap: css.px(TOKENS.spacing[2]),
      padding: s.padding,
      background: palette.LIGHT_BG,
      color: palette.BRAND_DARK || '#111',
      fontWeight: 600,
      fontSize: css.px(s.fontSize),
      borderRadius: css.px(TOKENS.radius['3xl']),
      fontFamily: 'var(--font-body)',
    })}">${text}</div>
  `;
}
