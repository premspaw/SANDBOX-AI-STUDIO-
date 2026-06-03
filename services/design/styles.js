// ═══════════════════════════════════════════════════════════════════════════════
// STYLE SYSTEM — Reusable style generators (replaces inline styles)
// ═══════════════════════════════════════════════════════════════════════════════

import { TOKENS, css, getToken } from './tokens.js';

// ─── Style Registry — Generates CSS class names dynamically ─────────────────────
const styleRegistry = new Map();
let classCounter = 0;

export const generateClassName = (prefix = 'style') => {
  return `${prefix}-${++classCounter}`;
};

// ─── Position System ────────────────────────────────────────────────────────────
export const position = {
  absolute: (config = {}) => {
    const { left, right, top, bottom, zIndex } = config;
    return {
      position: 'absolute',
      ...(left !== undefined && { left: css.px(left) }),
      ...(right !== undefined && { right: css.px(right) }),
      ...(top !== undefined && { top: css.px(top) }),
      ...(bottom !== undefined && { bottom: css.px(bottom) }),
      ...(zIndex !== undefined && { zIndex }),
    };
  },
  
  safeZone: (align = 'left', offset = {}) => {
    const safe = TOKENS.safe;
    return {
      position: 'absolute',
      left: css.px(offset.left ?? safe.left),
      right: css.px(offset.right ?? safe.right),
      top: css.px(offset.top ?? safe.top),
      ...(offset.bottom && { bottom: css.px(offset.bottom) }),
    };
  },
};

// ─── Typography System ────────────────────────────────────────────────────────────
export const typography = {
  headline: (size = 'md', align = 'left', color = 'inherit') => ({
    fontFamily: 'var(--font-heading)',
    fontSize: css.px(TOKENS.type.headline[size]?.size ?? TOKENS.type.headline.md.size),
    fontWeight: TOKENS.type.headline[size]?.weight ?? 700,
    lineHeight: TOKENS.type.headline[size]?.lineHeight ?? 1.15,
    letterSpacing: TOKENS.type.headline[size]?.letterSpacing ?? '-0.01em',
    textAlign: align,
    color,
    margin: 0,
  }),
  
  body: (color = 'inherit', muted = false) => ({
    fontFamily: 'var(--font-body)',
    fontSize: css.px(TOKENS.type.body.size),
    fontWeight: TOKENS.type.body.weight,
    lineHeight: TOKENS.type.body.lineHeight,
    letterSpacing: TOKENS.type.body.letterSpacing,
    color: muted ? 'var(--text-muted)' : color,
    margin: 0,
  }),
  
  eyebrow: (color = 'var(--brand-primary)') => ({
    fontFamily: 'var(--font-body)',
    fontSize: css.px(TOKENS.type.eyebrow.size),
    fontWeight: TOKENS.type.eyebrow.weight,
    letterSpacing: TOKENS.type.eyebrow.letterSpacing,
    textTransform: TOKENS.type.eyebrow.transform,
    color,
    margin: 0,
  }),
  
  // Dynamic scaling based on content
  scaledHeadline: (text, maxWidth, align = 'left', color = 'inherit') => {
    const len = text?.length || 0;
    let sizeKey = 'md';
    if (len < 24) sizeKey = 'xl';
    else if (len < 40) sizeKey = 'lg';
    else if (len < 55) sizeKey = 'md';
    else sizeKey = 'sm';
    
    return typography.headline(sizeKey, align, color);
  },
};

// ─── Layout Components ───────────────────────────────────────────────────────────
export const layout = {
  flex: (direction = 'row', align = 'center', justify = 'flex-start', gap = 0) => ({
    display: 'flex',
    flexDirection: direction,
    alignItems: align,
    justifyContent: justify,
    gap: css.px(gap),
  }),
  
  grid: (columns = 1, gap = 0) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: css.px(gap),
  }),
  
  maxWidth: (width) => ({
    maxWidth: typeof width === 'number' ? css.px(width) : width,
  }),
};

// ─── Visual Effects ───────────────────────────────────────────────────────────────
export const effects = {
  // Glow effects
  glow: (intensity = 'subtle', color = 'var(--brand-primary)') => {
    const glowMap = TOKENS.glow;
    return {
      boxShadow: glowMap[intensity]?.replace(/rgba\(168, 85, 247/g, color) || glowMap.subtle,
    };
  },
  
  // Blur effects
  blur: (amount = 'lg') => ({
    filter: `blur(${TOKENS.blur[amount] || 40}px)`,
  }),
  
  // Glassmorphism
  glass: (opacity = 0.03, blurAmount = 'xl') => ({
    background: `rgba(255, 255, 255, ${opacity})`,
    backdropFilter: `blur(${TOKENS.blur[blurAmount]}px) saturate(180%)`,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: css.px(TOKENS.radius.xl),
  }),
  
  // Grain overlay
  grain: (opacity = 0.035) => ({
    position: 'absolute',
    inset: 0,
    opacity,
    mixBlendMode: 'overlay',
    pointerEvents: 'none',
    zIndex: TOKENS.z.grain,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
  }),
  
  // Vignette
  vignette: (intensity = 0.15, isLight = false) => ({
    position: 'absolute',
    inset: 0,
    background: `radial-gradient(ellipse at 50% 50%, transparent 50%, ${isLight ? 'rgba(0,0,0,0.08)' : `rgba(0,0,0,${intensity})`} 100%)`,
    pointerEvents: 'none',
    zIndex: TOKENS.z.overlay,
  }),
  
  // Mesh gradient
  meshGradient: (colors, positions) => ({
    position: 'absolute',
    inset: 0,
    background: colors.map((c, i) => 
      `radial-gradient(ellipse at ${positions[i]}, ${c} 0%, transparent 50%)`
    ).join(', '),
    pointerEvents: 'none',
    zIndex: 1,
    mixBlendMode: 'screen',
  }),
  
  // Glow orb
  glowOrb: (color, size = 300, position, opacity = 0.4, blur = '4xl') => ({
    position: 'absolute',
    width: css.px(size),
    height: css.px(size),
    borderRadius: '50%',
    filter: `blur(${TOKENS.blur[blur]}px)`,
    opacity,
    background: color,
    pointerEvents: 'none',
    zIndex: 0,
    ...position,
  }),
};

// ─── UI Components ────────────────────────────────────────────────────────────────
export const ui = {
  // Progress bar
  progressBar: (track, fill, height = 3, borderRadius = 'full') => ({
    container: {
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
    },
    track: {
      flex: 1,
      height: css.px(height),
      background: track,
      borderRadius: css.px(TOKENS.radius[borderRadius]),
      overflow: 'hidden',
    },
    fill: (percent) => ({
      width: `${percent}%`,
      height: '100%',
      background: fill,
      borderRadius: 'inherit',
      transition: 'width 0.3s ease',
    }),
  }),
  
  // Swipe arrow
  swipeArrow: (stroke, background) => ({
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: css.px(48),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    background,
  }),
  
  // CTA Button
  ctaButton: (bg, color, size = 'md') => {
    const sizes = {
      sm: { padding: '8px 20px', fontSize: 12 },
      md: { padding: '12px 28px', fontSize: 14 },
      lg: { padding: '16px 36px', fontSize: 16 },
    };
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: css.px(TOKENS.spacing[2]),
      padding: sizes[size].padding,
      background: bg,
      color,
      fontWeight: 600,
      fontSize: css.px(sizes[size].fontSize),
      borderRadius: css.px(TOKENS.radius['3xl']),
      fontFamily: 'var(--font-body)',
    };
  },
};

// ─── Slide Container ────────────────────────────────────────────────────────────
export const slideContainer = (background, artDirection = 'cinematic', isLight = false) => {
  const S = TOKENS.safe;
  return {
    base: {
      background,
      position: 'relative',
      width: css.px(TOKENS.canvas.width),
      height: css.px(TOKENS.canvas.height),
      flexShrink: 0,
      overflow: 'hidden',
    },
    contentLayer: {
      position: 'relative',
      zIndex: TOKENS.z.content,
    },
  };
};

// ─── Style to CSS String Converter ────────────────────────────────────────────────
export const styleToString = (style) => {
  return Object.entries(style)
    .map(([key, value]) => {
      const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${kebabKey}: ${value}`;
    })
    .join('; ');
};

// ─── Batch Style Generator ────────────────────────────────────────────────────────
export const generateSlideStyles = (palette, artDirection, isLight) => {
  const C = {
    bg: isLight ? palette.LIGHT_BG : (palette.DARK_BG || palette.SLIDE_BG),
    text: isLight ? '#111111' : '#ffffff',
    textMuted: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)',
    textDim: isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)',
    border: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
  };
  
  return {
    colors: C,
    eyebrow: typography.eyebrow(palette.BRAND_PRIMARY),
    headline: (align = 'left') => typography.headline('md', align, C.text),
    body: typography.body(C.textMuted, true),
  };
};
