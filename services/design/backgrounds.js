// ═══════════════════════════════════════════════════════════════════════════════
// BACKGROUND & FX ENGINE — Cinematic visual effects generator
// ═══════════════════════════════════════════════════════════════════════════════

import { TOKENS, css } from './tokens.js';

// ─── Mesh Gradient Generator ────────────────────────────────────────────────────
export const generateMeshGradient = (palette, intensity = 'balanced') => {
  const { BRAND_PRIMARY, BRAND_LIGHT, BRAND_DARK } = palette;
  
  const opacityMap = {
    minimal: [0.08, 0.05, 0.03],
    balanced: [0.15, 0.12, 0.08],
    aggressive: [0.25, 0.20, 0.15],
    editorial: [0.05, 0.03, 0.02],
  };
  
  const [op1, op2, op3] = opacityMap[intensity] || opacityMap.balanced;
  
  return {
    position: 'absolute',
    inset: 0,
    background: [
      `radial-gradient(ellipse at 20% 30%, ${css.rgba(BRAND_PRIMARY, op1)} 0%, transparent 50%)`,
      `radial-gradient(ellipse at 80% 70%, ${css.rgba(BRAND_LIGHT, op2)} 0%, transparent 45%)`,
      `radial-gradient(ellipse at 50% 50%, ${css.rgba(BRAND_PRIMARY, op3)} 0%, transparent 60%)`,
    ].join(', '),
    pointerEvents: 'none',
    zIndex: 1,
    mixBlendMode: 'screen',
  };
};

// ─── Glow Orb Generator ───────────────────────────────────────────────────────────
export const generateGlowOrbs = (palette, intensity = 'balanced', isLight = false) => {
  if (isLight) return []; // No orbs on light backgrounds
  
  const { BRAND_PRIMARY, BRAND_LIGHT } = palette;
  
  const config = {
    minimal: { primary: { size: 200, opacity: 0.15, blur: '3xl' }, secondary: null },
    balanced: { primary: { size: 300, opacity: 0.4, blur: '4xl' }, secondary: { size: 200, opacity: 0.25, blur: '3xl' } },
    aggressive: { primary: { size: 400, opacity: 0.55, blur: '4xl' }, secondary: { size: 300, opacity: 0.4, blur: '3xl' } },
    editorial: { primary: { size: 150, opacity: 0.1, blur: '2xl' }, secondary: null },
  };
  
  const settings = config[intensity] || config.balanced;
  const orbs = [];
  
  // Primary orb
  orbs.push({
    position: 'absolute',
    width: css.px(settings.primary.size),
    height: css.px(settings.primary.size),
    borderRadius: '50%',
    filter: `blur(${TOKENS.blur[settings.primary.blur]}px)`,
    opacity: settings.primary.opacity,
    background: BRAND_PRIMARY,
    pointerEvents: 'none',
    zIndex: 0,
    top: css.px(-100),
    right: css.px(-80),
  });
  
  // Secondary orb (if enabled)
  if (settings.secondary) {
    orbs.push({
      position: 'absolute',
      width: css.px(settings.secondary.size),
      height: css.px(settings.secondary.size),
      borderRadius: '50%',
      filter: `blur(${TOKENS.blur[settings.secondary.blur]}px)`,
      opacity: settings.secondary.opacity,
      background: BRAND_LIGHT,
      pointerEvents: 'none',
      zIndex: 0,
      bottom: css.px(-60),
      left: css.px(-40),
    });
  }
  
  return orbs;
};

// ─── Layered Background Generator ───────────────────────────────────────────────
export const generateLayeredBackground = (palette, intensity = 'balanced') => {
  const { BRAND_PRIMARY, BRAND_DARK, BRAND_LIGHT, GRADIENT, SLIDE_BG } = palette;
  
  const primaryFade = css.rgba(BRAND_PRIMARY, intensity === 'aggressive' ? 0.25 : 0.18);
  
  return {
    background: [
      `radial-gradient(circle at 15% 15%, rgba(255,255,255,0.12) 0%, transparent 32%)`,
      `radial-gradient(circle at 85% 85%, ${primaryFade} 0%, transparent 40%)`,
      GRADIENT || `linear-gradient(165deg, ${BRAND_DARK} 0%, ${BRAND_PRIMARY} 50%, ${BRAND_LIGHT} 100%)`,
    ].join(', '),
    backgroundColor: SLIDE_BG,
  };
};

// ─── Grain Overlay ────────────────────────────────────────────────────────────────
export const generateGrain = (intensity = 'balanced') => {
  const opacityMap = {
    minimal: 0.02,
    balanced: 0.035,
    aggressive: 0.06,
    editorial: 0.04,
  };
  
  return {
    position: 'absolute',
    inset: 0,
    opacity: opacityMap[intensity] || 0.035,
    mixBlendMode: 'overlay',
    pointerEvents: 'none',
    zIndex: TOKENS.z.grain,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
  };
};

// ─── Vignette Generator ───────────────────────────────────────────────────────────
export const generateVignette = (intensity = 'balanced', isLight = false) => {
  const opacityMap = {
    minimal: isLight ? 0.05 : 0.10,
    balanced: isLight ? 0.08 : 0.15,
    aggressive: isLight ? 0.12 : 0.25,
    editorial: isLight ? 0.04 : 0.08,
  };
  
  return {
    position: 'absolute',
    inset: 0,
    background: `radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,${opacityMap[intensity] || 0.15}) 100%)`,
    pointerEvents: 'none',
    zIndex: TOKENS.z.overlay,
  };
};

// ─── Noise Texture (Alternative to Grain) ───────────────────────────────────────
export const generateNoiseTexture = (opacity = 0.04) => ({
  position: 'absolute',
  inset: 0,
  opacity,
  mixBlendMode: 'overlay',
  pointerEvents: 'none',
  zIndex: TOKENS.z.grain,
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
});

// ─── Scan Lines Effect ────────────────────────────────────────────────────────────
export const generateScanLines = (opacity = 0.03) => ({
  position: 'absolute',
  inset: 0,
  opacity,
  pointerEvents: 'none',
  zIndex: TOKENS.z.overlay,
  backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)`,
});

// ─── Complete Background Stack Generator ──────────────────────────────────────────
export const generateBackgroundStack = (palette, options = {}) => {
  const {
    intensity = 'balanced',
    isLight = false,
    useGradient = true,
    useMesh = true,
    useOrbs = true,
    useGrain = true,
    useVignette = true,
  } = options;
  
  console.log(`[BackgroundStack] isLight=${isLight}, intensity=${intensity}, palette=`, { primary: palette.BRAND_PRIMARY, light: palette.BRAND_LIGHT });
  
  const layers = [];
  
  // Base background - dark gets gradient, light gets subtle tint
  if (useGradient && !isLight) {
    layers.push({ type: 'base', style: generateLayeredBackground(palette, intensity) });
    console.log('[BackgroundStack] Added layered background (dark)');
  } else if (isLight) {
    // Light slides: subtle gradient tint
    layers.push({ 
      type: 'base', 
      style: { 
        background: `linear-gradient(165deg, ${palette.LIGHT_BG} 0%, rgba(255,255,255,0.97) 100%)`,
        backgroundColor: palette.LIGHT_BG 
      } 
    });
    console.log('[BackgroundStack] Added light background');
  }
  
  // Mesh gradient - dark gets full, light gets subtle
  if (useMesh && !isLight) {
    layers.push({ type: 'mesh', style: generateMeshGradient(palette, intensity) });
    console.log('[BackgroundStack] Added mesh gradient (dark)');
  } else if (useMesh && isLight) {
    // Subtle mesh for light slides
    const { BRAND_PRIMARY } = palette;
    layers.push({ 
      type: 'mesh', 
      style: {
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at 30% 20%, ${css.rgba(BRAND_PRIMARY, 0.03)} 0%, transparent 50%)`,
        pointerEvents: 'none',
        zIndex: 1,
      }
    });
    console.log('[BackgroundStack] Added subtle mesh (light)');
  }
  
  // Glow orbs - dark gets full, light gets subtle
  if (useOrbs && !isLight) {
    const orbs = generateGlowOrbs(palette, intensity, isLight);
    orbs.forEach((orb, i) => {
      layers.push({ type: `orb-${i}`, style: orb });
    });
    console.log(`[BackgroundStack] Added ${orbs.length} glow orbs (dark)`);
  } else if (useOrbs && isLight) {
    // Subtle brand tint orb for light slides
    const { BRAND_PRIMARY } = palette;
    layers.push({
      type: 'orb-0',
      style: {
        position: 'absolute',
        width: '250px',
        height: '250px',
        borderRadius: '50%',
        filter: `blur(${TOKENS.blur['3xl']}px)`,
        opacity: 0.08,
        background: BRAND_PRIMARY,
        pointerEvents: 'none',
        zIndex: 0,
        top: '-80px',
        right: '-60px',
      }
    });
    console.log('[BackgroundStack] Added subtle glow orb (light)');
  }
  
  // Grain
  if (useGrain) {
    layers.push({ type: 'grain', style: generateGrain(intensity) });
  }
  
  // Vignette
  if (useVignette) {
    layers.push({ type: 'vignette', style: generateVignette(intensity, isLight) });
  }
  
  console.log(`[BackgroundStack] Generated ${layers.length} layers:`, layers.map(l => l.type).join(', '));
  return layers;
};

// ─── Performance-Optimized Background (for batch exports) ─────────────────────────
export const generateLowPerformanceBackground = (palette, isLight = false) => {
  // Skip expensive blur effects
  return {
    background: isLight ? palette.LIGHT_BG : (palette.SLIDE_BG || palette.DARK_BG),
    backgroundImage: !isLight ? `linear-gradient(180deg, ${palette.BRAND_DARK} 0%, ${palette.SLIDE_BG} 100%)` : 'none',
  };
};
