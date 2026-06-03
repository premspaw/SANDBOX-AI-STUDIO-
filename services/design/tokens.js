// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN TOKEN SYSTEM — Single source of truth for all visual values
// ═══════════════════════════════════════════════════════════════════════════════

export const TOKENS = {
  // ─── Canvas & Grid ──────────────────────────────────────────────────────────
  canvas: {
    width: 420,
    height: 525,
    exportWidth: 1080,
    exportHeight: 1350,
    aspectRatio: '4:5',
  },

  // ─── Safe Zones ─────────────────────────────────────────────────────────────
  safe: {
    left: 36,
    right: 36,
    top: 36,
    bottom: 52, // clears progress bar
    minTextPadding: 60, // from edges
  },

  // ─── Spacing Scale ────────────────────────────────────────────────────────────
  spacing: {
    '0': 0,
    '1': 4,
    '2': 8,
    '3': 12,
    '4': 16,
    '5': 20,
    '6': 24,
    '7': 32,
    '8': 40,
    '9': 48,
    '10': 64,
    '11': 80,
    '12': 100,
  },

  // ─── Border Radius ────────────────────────────────────────────────────────────
  radius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    '3xl': 28,
    full: 9999,
  },

  // ─── Opacity Scale ────────────────────────────────────────────────────────────
  opacity: {
    '0': 0,
    '5': 0.05,
    '10': 0.10,
    '15': 0.15,
    '20': 0.20,
    '25': 0.25,
    '30': 0.30,
    '40': 0.40,
    '50': 0.50,
    '60': 0.60,
    '70': 0.70,
    '80': 0.80,
    '90': 0.90,
    '100': 1,
  },

  // ─── Blur Scale ─────────────────────────────────────────────────────────────────
  blur: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    '2xl': 40,
    '3xl': 64,
    '4xl': 80,
  },

  // ─── Glow/Shadow Effects ──────────────────────────────────────────────────────
  glow: {
    minimal: '0 0 20px rgba(168, 85, 247, 0.15)',
    subtle: '0 0 30px rgba(168, 85, 247, 0.25)',
    medium: '0 0 40px rgba(168, 85, 247, 0.35)',
    strong: '0 0 60px rgba(168, 85, 247, 0.45)',
    maximum: '0 0 80px rgba(168, 85, 247, 0.55), 0 0 120px rgba(168, 85, 247, 0.35)',
  },

  // ─── Typography Scale ───────────────────────────────────────────────────────────
  type: {
    // Headlines scale by content length
    headline: {
      xl: { size: 42, lineHeight: 1.05, letterSpacing: '-0.03em', weight: 700 },
      lg: { size: 36, lineHeight: 1.1, letterSpacing: '-0.02em', weight: 700 },
      md: { size: 30, lineHeight: 1.15, letterSpacing: '-0.01em', weight: 600 },
      sm: { size: 28, lineHeight: 1.2, letterSpacing: '-0.01em', weight: 600 },
    },
    body: {
      size: 14,
      lineHeight: 1.5,
      letterSpacing: '0',
      weight: 400,
    },
    eyebrow: {
      size: 10,
      lineHeight: 1.2,
      letterSpacing: '2px',
      weight: 600,
      transform: 'uppercase',
    },
    stepNumber: {
      size: 26,
      lineHeight: 1,
      letterSpacing: '0',
      weight: 300,
    },
    small: {
      size: 11,
      lineHeight: 1.4,
      weight: 500,
    },
  },

  // ─── Z-Index Scale ────────────────────────────────────────────────────────────
  z: {
    base: 0,
    content: 10,
    ui: 20,
    overlay: 30,
    modal: 40,
    grain: 100,
  },

  // ─── Animation Timing ─────────────────────────────────────────────────────────
  motion: {
    instant: '0ms',
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '800ms',
    slowest: '1200ms',
    easing: {
      default: 'ease',
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      dramatic: 'cubic-bezier(0.87, 0, 0.13, 1)',
    },
  },

  // ─── Visual Hierarchy Weights ───────────────────────────────────────────────────
  priority: {
    headline: 10,
    cta: 9,
    statistic: 8,
    visual: 7,
    quote: 6,
    body: 5,
    eyebrow: 4,
    decoration: 2,
    background: 1,
  },

  // ─── Design Intensity Modes ───────────────────────────────────────────────────
  intensity: {
    minimal: {
      glow: 'none',
      texture: 'none',
      gradient: 'none',
      decoration: 'zero',
      complexity: 'single element only',
      blur: 'none',
    },
    balanced: {
      glow: 'subtle',
      texture: 'light',
      gradient: 'soft',
      decoration: 'minimal',
      complexity: '2-3 elements balanced',
      blur: 'md',
    },
    aggressive: {
      glow: 'strong',
      texture: 'heavy',
      gradient: 'dramatic',
      decoration: 'prominent',
      complexity: 'high impact, layered depth',
      blur: 'xl',
    },
    editorial: {
      glow: 'subtle',
      texture: 'paper',
      gradient: 'none',
      decoration: 'refined',
      complexity: 'typography-forward',
      blur: 'none',
    },
  },
};

// ─── Utility: Get token with fallback ─────────────────────────────────────────
export const getToken = (path, fallback = null) => {
  const keys = path.split('.');
  let value = TOKENS;
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) return fallback;
  }
  return value ?? fallback;
};

// ─── Utility: Calculate typography scale based on content ──────────────────────
export const calculateTypeScale = (text, availableWidth, availableHeight) => {
  const len = text?.length || 0;
  const words = text?.split(/\s+/)?.length || 0;
  
  // Base size from character count
  let baseSize = TOKENS.type.headline.md.size;
  if (len < 20) baseSize = TOKENS.type.headline.xl.size;
  else if (len < 35) baseSize = TOKENS.type.headline.lg.size;
  else if (len < 50) baseSize = TOKENS.type.headline.md.size;
  else baseSize = TOKENS.type.headline.sm.size;
  
  // Adjust for word count (longer words need more space)
  const avgWordLength = len / Math.max(words, 1);
  if (avgWordLength > 8) baseSize -= 2;
  
  // Adjust for available width
  const estimatedWidth = len * (baseSize * 0.6); // rough estimate
  if (estimatedWidth > availableWidth) {
    const scaleFactor = availableWidth / estimatedWidth;
    baseSize = Math.max(24, Math.floor(baseSize * scaleFactor * 0.9));
  }
  
  return baseSize;
};

// ─── Utility: Contrast ratio calculator ─────────────────────────────────────────
export const getContrastRatio = (bg, text) => {
  const luminance = (hex) => {
    if (!hex || typeof hex !== 'string') return 0.5; // Default mid-gray
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >>  8) & 0xff;
    const b = (rgb >>  0) & 0xff;
    const [lr, lg, lb] = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  };
  
  const l1 = luminance(bg) + 0.05;
  const l2 = luminance(text) + 0.05;
  return l1 > l2 ? l1 / l2 : l2 / l1;
};

// ─── Utility: Validate contrast (WCAG) ──────────────────────────────────────────
export const validateContrast = (bg, text, level = 'AA') => {
  const ratio = getContrastRatio(bg, text);
  const required = level === 'AAA' ? 7 : 4.5;
  return {
    ratio: ratio.toFixed(2),
    pass: ratio >= required,
    level,
    score: Math.min(100, (ratio / required) * 100),
  };
};

// ─── Utility: CSS value generators ──────────────────────────────────────────────
export const css = {
  px: (value) => `${value}px`,
  percent: (value) => `${value}%`,
  rgba: (hex, alpha) => {
    if (!hex || typeof hex !== 'string') return `rgba(0, 0, 0, ${alpha})`;
    const cleanHex = hex.startsWith('#') ? hex : `#${hex}`;
    const r = parseInt(cleanHex.slice(1, 3), 16) || 0;
    const g = parseInt(cleanHex.slice(3, 5), 16) || 0;
    const b = parseInt(cleanHex.slice(5, 7), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },
  position: (pos) => {
    if (typeof pos === 'string') return pos;
    return Object.entries(pos)
      .map(([k, v]) => `${k}:${typeof v === 'number' ? v + 'px' : v}`)
      .join(';');
  },
};
