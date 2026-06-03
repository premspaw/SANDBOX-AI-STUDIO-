// services/carouselGenerator.js — PREMIUM DESIGN SYSTEM
// Full Instagram carousel HTML → Playwright → 1080×1350px PNG pipeline

import path from 'path';
import os from 'os';
import fs from 'fs';

// ═══════════════════════════════════════════════════════════════════════════════
// NEW DESIGN SYSTEM IMPORTS (Modular Architecture)
// ═══════════════════════════════════════════════════════════════════════════════
import { 
  TOKENS, getToken, validateContrast, css,
  position, typography, layout, effects, ui, styleToString,
  calculateHierarchy, calculatePositions,
  generateBackgroundStack, generateLowPerformanceBackground
} from './design/index.js';
// Note: analyzeLayout, smartBreak defined locally; slide files import their own

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE TEMPLATES (New Modular Architecture)
// ═══════════════════════════════════════════════════════════════════════════════
import {
  renderHeroSlide,
  renderProblemSlide,
  renderSolutionSlide,
  renderFeaturesSlide,
  renderDetailsSlide,
  renderHowToSlide,
  renderCTASlide,
} from './slides/index.js';

// ─── Color utilities ─────────────────────────────────────────────────────────

function hexToHsl(hex) {
  if (!hex || typeof hex !== 'string') return [0, 0, 50]; // Default gray
  const cleanHex = hex.startsWith('#') ? hex : `#${hex}`;
  let r = (parseInt(cleanHex.slice(1, 3), 16) || 0) / 255;
  let g = (parseInt(cleanHex.slice(3, 5), 16) || 0) / 255;
  let b = (parseInt(cleanHex.slice(5, 7), 16) || 0) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}

const PRESET_PALETTES = [
  { name: 'gold',        SLIDE_BG: '#0A0800', BRAND_PRIMARY: '#D4AF37', BRAND_DARK: '#8B6914', BRAND_LIGHT: '#F0D060', FEEL: 'Luxury, finance, personal brand' },
  { name: 'electric-blue', SLIDE_BG: '#050A14', BRAND_PRIMARY: '#0EA5E9', BRAND_DARK: '#0047AB', BRAND_LIGHT: '#7DD3FC', FEEL: 'Tech, SaaS, AI tools' },
  { name: 'lime',        SLIDE_BG: '#080A06', BRAND_PRIMARY: '#C8F135', BRAND_DARK: '#5A7A00', BRAND_LIGHT: '#E8FF80', FEEL: 'Creator tools, bold, energetic' },
  { name: 'coral',       SLIDE_BG: '#0F0804', BRAND_PRIMARY: '#FF6B35', BRAND_DARK: '#CC3D00', BRAND_LIGHT: '#FFB347', FEEL: 'Food, lifestyle, coaching' },
  { name: 'purple',      SLIDE_BG: '#08040F', BRAND_PRIMARY: '#A855F7', BRAND_DARK: '#5B21B6', BRAND_LIGHT: '#D8B4FE', FEEL: 'Spirituality, wellness, beauty' },
  { name: 'teal',        SLIDE_BG: '#030F0F', BRAND_PRIMARY: '#00CED1', BRAND_DARK: '#006B6E', BRAND_LIGHT: '#67E8F9', FEEL: 'Healthcare, fintech, modern agency' },
  { name: 'rose',        SLIDE_BG: '#0F0408', BRAND_PRIMARY: '#F43F5E', BRAND_DARK: '#9F1239', BRAND_LIGHT: '#FDA4AF', FEEL: 'Fashion, beauty, women\'s brand' },
  { name: 'emerald',     SLIDE_BG: '#040F08', BRAND_PRIMARY: '#10B981', BRAND_DARK: '#065F46', BRAND_LIGHT: '#6EE7B7', FEEL: 'Sustainability, health, money' },
  { name: 'silver',      SLIDE_BG: '#080808', BRAND_PRIMARY: '#E2E8F0', BRAND_DARK: '#374151', BRAND_LIGHT: '#F1F5F9', FEEL: 'Minimal, architecture, high-end' },
  { name: 'amber',       SLIDE_BG: '#0C0800', BRAND_PRIMARY: '#F59E0B', BRAND_DARK: '#92400E', BRAND_LIGHT: '#FCD34D', FEEL: 'Food, coffee, hospitality' },
];

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return [0, 0, 0]; // Default black
  const h = hex.startsWith('#') ? hex : `#${hex}`;
  return [parseInt(h.slice(1, 3), 16) || 0, parseInt(h.slice(3, 5), 16) || 0, parseInt(h.slice(5, 7), 16) || 0];
}

function rgbDistance(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

function buildPalette(primaryHex) {
  const inputHex = (primaryHex?.startsWith('#') ? primaryHex : `#${primaryHex}`).toLowerCase();
  const inputRgb = hexToRgb(inputHex);

  // Exact match shortcut
  const exact = PRESET_PALETTES.find(p => p.BRAND_PRIMARY.toLowerCase() === inputHex);
  if (exact) {
    return {
      ...exact,
      GRADIENT: `linear-gradient(155deg, ${exact.BRAND_DARK} 0%, ${exact.BRAND_PRIMARY} 55%, ${exact.BRAND_LIGHT} 100%)`,
      DIVIDER: 'rgba(255,255,255,0.08)',
      TEXT_BODY: 'rgba(255,255,255,0.58)',
      TEXT_HEAD: '#ffffff',
    };
  }

  // Find closest by RGB distance
  let closest = PRESET_PALETTES[0];
  let minDist = Infinity;
  for (const p of PRESET_PALETTES) {
    const d = rgbDistance(inputRgb, hexToRgb(p.BRAND_PRIMARY));
    if (d < minDist) { minDist = d; closest = p; }
  }

  // Derive light/dark backgrounds from primary color temperature
  const [h, s, l] = hexToHsl(inputHex);
  const isWarm = (h >= 0 && h <= 60) || (h >= 300 && h <= 360);

  const LIGHT_BG   = isWarm ? '#F7F4F0' : '#F1F5F9';  // warm cream vs cool gray-white
  const DARK_BG    = isWarm ? '#1A1918' : '#0F172A';   // warm near-black vs cool near-black
  const LIGHT_BORDER = isWarm ? '#E8E3DD' : '#E2E8F0'; // 1 shade darker than LIGHT_BG

  return {
    ...closest,
    LIGHT_BG,
    DARK_BG,
    LIGHT_BORDER,
    GRADIENT: `linear-gradient(165deg, ${closest.BRAND_DARK} 0%, ${closest.BRAND_PRIMARY} 50%, ${closest.BRAND_LIGHT} 100%)`,
    DIVIDER: 'rgba(255,255,255,0.08)',
    TEXT_BODY: 'rgba(255,255,255,0.58)',
    TEXT_HEAD: '#ffffff',
  };
}

// ─── open-design · Editorial-Monocle direction ─────────────────────────────
// Refs: Monocle · FT Weekend · NYT Magazine
// Posture: serif display · sans body · no shadows · hairline borders only
// ─── Light / Dark color tokens ──────────────────────────────────────────────

function slideColors(palette, isLight) {
  if (isLight) {
    return {
      bg: palette.LIGHT_BG,
      text: '#111111',
      textMuted: 'rgba(0,0,0,0.5)',
      textDim: 'rgba(0,0,0,0.35)',
      border: palette.LIGHT_BORDER,
      borderDark: 'rgba(0,0,0,0.08)',
    };
  }
  return {
    bg: palette.DARK_BG || palette.SLIDE_BG,
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.6)',
    textDim: 'rgba(255,255,255,0.35)',
    border: 'rgba(255,255,255,0.1)',
    borderDark: 'rgba(255,255,255,0.08)',
  };
}

// ─── Editorial Design System — Safe zones, typography, composition ─────────

const SAFE = {
  left: 36,
  right: 36,
  top: 36,
  bottom: 52,  // clears progress bar
  canvasW: 420,
  canvasH: 525,
};

const TYPE = {
  headline: {
    size: 30,       // 28-34px range, fixed at 30 for consistency
    weight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.4px',
  },
  body: {
    size: 14,
    weight: 400,
    lineHeight: 1.5,
    letterSpacing: '0',
  },
  eyebrow: {
    size: 10,
    weight: 600,
    letterSpacing: '2px',
    transform: 'uppercase',
  },
  stepNumber: {
    size: 26,
    weight: 300,
  },
  small: {
    size: 11,
    weight: 500,
  },
  grain: {
    opacity: 0.04,
    blend: 'overlay',
  },
};

// ─── Smart Font Scaling ──────────────────────────────────────────────────────

function getHeadlineSize(text) {
  const len = (text || '').length;
  if (len < 24) return 34;
  if (len < 40) return 30;
  return 28;
}

function getHeadlineWidth(text) {
  const len = (text || '').length;
  if (len < 25) return '75%';
  if (len < 45) return '85%';
  return '95%';
}

function getBodyWidth(type) {
  // Different body widths per composition mode
  const widths = {
    hero: '55%',      // minimal, lots of negative space
    problem: '65%',   // dense, high contrast
    solution: '55%',
    features: '85%',  // grid needs width
    details: '85%',
    howto: '85%',
    cta: '50%',       // minimal, massive whitespace
    dramatic: '45%',  // very narrow, single focal point
    data: '90%',      // wide for structured grid
  };
  return widths[type] || '55%';
}

// ─── Stopword dictionary for semantic breaking ──────────────────────────────

const STOPWORDS = new Set([
  'a','an','the','and','but','or','nor','for','of','to','in','on','at',
  'with','from','by','as','is','are','was','were','be','been','being',
  'it','this','that','these','those','you','your','their','there','then',
  'when','where','what','how','who','which','why','can','could','will',
  'would','should','may','might','must','shall','have','has','had','do',
  'does','did','so','if','about','up','out','down','off','over','under',
  'again','further','then','once','here','all','any','both','each','few',
  'more','most','other','some','such','no','not','only','own','same','than',
  'too','very','just','now','also','get','got','go','going','went','comes',
]);

// ─── Semantic Line Breaking — phrase-based, not mechanical ─────────────────

function semanticBreak(text, mode = 'default') {
  if (!text) return text;
  const words = text.trim().split(/\s+/);
  if (words.length <= 3) return text;

  if (mode === 'dramatic') return dramaticBreak(words);
  if (mode === 'data') return dataBreak(words);

  const joined = words.join(' ');
  const len = words.length;
  const lastWord = words[len - 1].toLowerCase().replace(/[^a-z]/g, '');

  // ─── Strategy 1: Isolate punch word ────────────────────────────────────
  // For 4-7 word headlines, put final keyword/verb on its own line
  if (len >= 4 && len <= 7 && !STOPWORDS.has(lastWord) && words[len - 1].length <= 10) {
    const splitAt = len >= 6 ? len - 2 : len - 1;
    const beforeLast = words[splitAt - 1].toLowerCase().replace(/[^a-z]/g, '');
    if (!STOPWORDS.has(beforeLast)) {
      return words.slice(0, splitAt).join(' ') + '<br/>' + words.slice(splitAt).join(' ');
    }
  }

  // ─── Strategy 2: Split at punctuation (strongest boundary) ───────────────
  const punctMatch = joined.match(/^(.+?)([,;:—–]| +- +)(.+)$/);
  if (punctMatch) {
    const before = punctMatch[1].trim();
    const after = punctMatch[3].trim();
    if (before.length > 5 && after.length > 3) {
      return before + '<br/>' + after;
    }
  }

  // ─── Strategy 3: Phrase boundary (preposition / conjunction) ─────────────
  const phraseBoundaries = [
    { marker: ' but ', weight: 5, include: true },
    { marker: ' and ', weight: 4, include: false },
    { marker: ' for ', weight: 4, include: true },
    { marker: ' with ', weight: 3, include: true },
    { marker: ' that ', weight: 3, include: false },
    { marker: ' your ', weight: 3, include: false },
    { marker: ' in ', weight: 2, include: true },
    { marker: ' on ', weight: 2, include: true },
    { marker: ' of ', weight: 2, include: true },
    { marker: ' to ', weight: 2, include: true },
    { marker: ' from ', weight: 3, include: true },
  ];

  const lowerJoined = ' ' + joined.toLowerCase() + ' ';
  for (const { marker, weight, include } of phraseBoundaries) {
    const idx = lowerJoined.indexOf(marker);
    if (idx > 1 && idx < joined.length * 0.7) {
      const splitPoint = include ? idx + marker.length - 1 : idx;
      const before = joined.slice(0, splitPoint).trim();
      const after = joined.slice(splitPoint).trim();
      if (before.length > 8 && after.length > 5) {
        const beforeLast = before.split(/\s+/).pop().toLowerCase().replace(/[^a-z]/g, '');
        if (!STOPWORDS.has(beforeLast) || weight >= 4) {
          return before + '<br/>' + after;
        }
      }
    }
  }

  // ─── Strategy 4: Balanced midpoint (no stopword edges) ─────────────────
  const mid = Math.floor(len / 2);
  for (let offset = 0; offset <= 2; offset++) {
    for (const dir of [-1, 1]) {
      const splitAt = mid + (offset * dir);
      if (splitAt < 2 || splitAt > len - 2) continue;
      const beforeLast = words[splitAt - 1].toLowerCase().replace(/[^a-z]/g, '');
      const afterFirst = words[splitAt].toLowerCase().replace(/[^a-z]/g, '');
      if (!STOPWORDS.has(beforeLast) && !STOPWORDS.has(afterFirst)) {
        return words.slice(0, splitAt).join(' ') + '<br/>' + words.slice(splitAt).join(' ');
      }
    }
  }

  // ─── Fallback: mechanical smart break ──────────────────────────────────
  return smartBreak(joined);
}

// ─── Dramatic Break — emotional, punchy, high impact ───────────────────────

function dramaticBreak(words) {
  const len = words.length;
  if (len <= 2) return words.join(' ');
  if (len === 3) return words[0] + '<br/>' + words[1] + ' ' + words[2];
  if (len === 4) {
    // "Why Most Marketing Fails" → "Why Most Marketing<br/>Fails"
    return words.slice(0, 3).join(' ') + '<br/>' + words[3];
  }
  if (len <= 6) {
    const splitAt = len <= 5 ? 3 : 3;
    return words.slice(0, splitAt).join(' ') + '<br/>' + words.slice(splitAt).join(' ');
  }
  return semanticBreak(words.join(' '), 'default');
}

// ─── Data Break — minimal, clean, precise ──────────────────────────────────

function dataBreak(words) {
  const len = words.length;
  if (len <= 7) return words.join(' ');
  const joined = words.join(' ');
  const punctMatch = joined.match(/^(.+?)([,;:])(.+)$/);
  if (punctMatch) {
    return punctMatch[1].trim() + '<br/>' + punctMatch[3].trim();
  }
  const mid = Math.ceil(len / 2);
  return words.slice(0, mid).join(' ') + '<br/>' + words.slice(mid).join(' ');
}

// ─── Mechanical Smart Break — fallback only ────────────────────────────────

function smartBreak(text) {
  const words = (text || '').trim().split(/\s+/);
  if (words.length <= 3) return text;

  const lines = [];
  if (words.length <= 6) {
    lines.push(words.slice(0, 3).join(' '));
    lines.push(words.slice(3).join(' '));
  } else if (words.length <= 9) {
    lines.push(words.slice(0, 3).join(' '));
    lines.push(words.slice(3, 6).join(' '));
    lines.push(words.slice(6).join(' '));
  } else {
    lines.push(words.slice(0, 2).join(' '));
    lines.push(words.slice(2, 5).join(' '));
    lines.push(words.slice(5, 8).join(' '));
    lines.push(words.slice(8).join(' '));
  }
  return lines.join('<br/>');
}

function clampWords(text, maxWords) {
  const words = (text || '').trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '…';
}

function clampChars(text, maxChars) {
  const t = (text || '').trim();
  if (t.length <= maxChars) return t;
  return t.slice(0, maxChars).trim() + '…';
}

// ─── Layout Mode Selector — each slide type gets distinct composition ────────

function chooseLayoutMode(type, headlineLen) {
  const modes = {
    // HERO: light bg, centered feel, minimal body
    hero: {
      align: 'left',
      hTop: 100,
      bodyTop: 200,
      eyebrowTop: SAFE.top,
      density: 'sparse',
      visualWeight: 0.65,
    },
    // PROBLEM: dark bg, dense, high contrast
    problem: {
      align: 'center',
      hTop: 85,
      bodyTop: 180,
      eyebrowTop: SAFE.top,
      density: 'dense',
      visualWeight: 0.80,
    },
    // SOLUTION: gradient, balanced
    solution: {
      align: 'left',
      hTop: 80,
      bodyTop: 175,
      eyebrowTop: SAFE.top,
      density: 'balanced',
      visualWeight: 0.70,
    },
    // FEATURES: light bg, grid system
    features: {
      align: 'left',
      hTop: 75,
      bodyTop: 165,
      eyebrowTop: SAFE.top,
      density: 'structured',
      visualWeight: 0.75,
    },
    // DETAILS: dark bg, list composition
    details: {
      align: 'left',
      hTop: 75,
      bodyTop: 160,
      eyebrowTop: SAFE.top,
      density: 'structured',
      visualWeight: 0.72,
    },
    // HOWTO: light bg, numbered steps
    howto: {
      align: 'left',
      hTop: 70,
      bodyTop: 155,
      eyebrowTop: SAFE.top,
      density: 'structured',
      visualWeight: 0.74,
    },
    // CTA: gradient, minimal, single focal point
    cta: {
      align: 'center',
      hTop: 120,
      bodyTop: 220,
      eyebrowTop: SAFE.top,
      density: 'minimal',
      visualWeight: 0.55,
    },
    // DRAMATIC: massive whitespace, emotional
    dramatic: {
      align: 'center',
      hTop: 140,
      bodyTop: 280,
      eyebrowTop: SAFE.top,
      density: 'minimal',
      visualWeight: 0.45,
    },
    // DATA: structured grid, tight rhythm
    data: {
      align: 'left',
      hTop: 60,
      bodyTop: 140,
      eyebrowTop: SAFE.top,
      density: 'dense',
      visualWeight: 0.85,
    },
  };

  const mode = modes[type] || modes.hero;

  // Optical centering: short text sits higher, long text sits lower
  if (headlineLen < 20) mode.hTop -= 6;
  else if (headlineLen > 45) mode.hTop += 8;

  return mode;
}

// ─── analyzeLayout() — THE intelligence layer ───────────────────────────────

function analyzeLayout({ headline, body, type, mode }) {
  const compositionMode = mode || type;
  const hSize = getHeadlineSize(headline);
  const hWidth = getHeadlineWidth(headline);
  const bWidth = getBodyWidth(compositionMode);
  const composition = chooseLayoutMode(compositionMode, (headline || '').length);

  // Text constraints + semantic line break
  const rawHeadline = clampWords(clampChars(headline, 60), 12);
  const constrainedHeadline = semanticBreak(rawHeadline, compositionMode);
  const constrainedBody = clampChars(body, 120);

  // Line break count for downstream logic
  const lineBreaks = (constrainedHeadline.match(/<br\/>/g) || []).length;

  // Adjust body top if headline has many lines (pushes content down)
  const adjustedBodyTop = composition.bodyTop + (lineBreaks > 1 ? 12 : 0);

  return {
    // Typography
    headlineSize: hSize,
    headlineWidth: hWidth,
    bodyWidth: bWidth,
    lineBreaks,

    // Composition
    layoutMode: compositionMode,
    alignment: composition.align,
    density: composition.density,
    visualWeight: composition.visualWeight,

    // Positioning (pixels from safe zone edges)
    hTop: composition.hTop,
    bodyTop: adjustedBodyTop,
    eyebrowTop: composition.eyebrowTop,

    // Safe zone references
    safe: SAFE,

    // Constrained text
    constrainedHeadline,
    constrainedBody,
  };
}

function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string') return `rgba(0,0,0,${alpha})`;
  const h = hex.startsWith('#') ? hex : `#${hex}`;
  const r = parseInt(h.slice(1, 3), 16) || 0;
  const g = parseInt(h.slice(3, 5), 16) || 0;
  const b = parseInt(h.slice(5, 7), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

function buildLayeredBackground(palette) {
  const primaryFade = hexToRgba(palette.BRAND_PRIMARY, 0.18);
  return [
    `radial-gradient(circle at 15% 15%, rgba(255,255,255,0.12) 0%, transparent 32%)`,
    `radial-gradient(circle at 85% 85%, ${primaryFade} 0%, transparent 40%)`,
    palette.GRADIENT,
  ].join(', ');
}

// ─── Font pairings ────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// DYNAMIC FONT PAIRING SYSTEM — Art direction matched typography
// ═══════════════════════════════════════════════════════════════════════════════

const FONT_PAIRINGS = {
  // Legacy mappings (backward compatible)
  modern:     { heading: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans', weight: '800',
    url: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap' },
  warm:       { heading: 'Lora', body: 'Nunito Sans', weight: '600',
    url: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;600&family=Nunito+Sans:wght@400;600&display=swap' },
  technical:  { heading: 'Space Grotesk', body: 'Space Grotesk', weight: '700',
    url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap' },
  bold:       { heading: 'Fraunces', body: 'Outfit', weight: '700',
    url: 'https://fonts.googleapis.com/css2?family=Fraunces:wght@300;700&family=Outfit:wght@400;500;600&display=swap' },
  classic:    { heading: 'Libre Baskerville', body: 'Work Sans', weight: '700',
    url: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Work+Sans:wght@400;500;600&display=swap' },
  editorial:  { heading: 'Playfair Display', body: 'Inter', weight: '800',
    url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700&family=Inter:wght@400;500;600;700&display=swap' },
  friendly:   { heading: 'Bricolage Grotesque', body: 'Bricolage Grotesque', weight: '700',
    url: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&display=swap' },

  // ═══ Art Direction Matched Fonts ═══
  cinematic:  { heading: 'Bebas Neue', body: 'Inter', weight: '400',
    url: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap',
    desc: 'Extra-bold condensed cinematic headlines + clean geometric body' },

  luxury:     { heading: 'Cormorant Garamond', body: 'Satoshi', weight: '700',
    url: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Inter:wght@300;400;500&display=swap',
    fallback: { body: 'Inter' },
    desc: 'High-contrast elegant serif + sophisticated humanist sans' },

  apple:      { heading: 'Inter', body: 'Inter', weight: '700',
    url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
    desc: 'SF Pro alternative — precise, neutral, screen-optimized' },

  streetwear: { heading: 'Oswald', body: 'Roboto Condensed', weight: '700',
    url: 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Roboto+Condensed:wght@400;700&display=swap',
    desc: 'Bold condensed industrial + strong sans for raw energy' },

  tech:       { heading: 'JetBrains Mono', body: 'Inter', weight: '700',
    url: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap',
    desc: 'Monospace technical + highly legible body for SaaS' },

  futuristic: { heading: 'Orbitron', body: 'Rajdhani', weight: '700',
    url: 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@400;500;600;700&display=swap',
    desc: 'Geometric wide sans + tech-inspired display for cyber aesthetic' },

  minimal:    { heading: 'Space Grotesk', body: 'Space Grotesk', weight: '700',
    url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
    desc: 'Neutral grotesque — single family, mathematical spacing' },
};

// Enhanced font getter with art direction support
function getFonts(style, artDirection = null) {
  // Prioritize art direction matching
  if (artDirection && FONT_PAIRINGS[artDirection.toLowerCase()]) {
    return FONT_PAIRINGS[artDirection.toLowerCase()];
  }
  // Fall back to style mapping
  return FONT_PAIRINGS[(style || 'modern').toLowerCase()] || FONT_PAIRINGS.modern;
}

// Font weight helper for dynamic typography scaling
function getFontWeights(slideId, isCTA = false) {
  if (isCTA) return { heading: '800', body: '400', accent: '600' };
  if (slideId === 'hero') return { heading: '700', body: '400', accent: '500' };
  if (slideId === 'features') return { heading: '600', body: '400', accent: '500' };
  return { heading: '700', body: '400', accent: '500' };
}

// ─── open-design · Editorial-Monocle direction (moved to top of file) ────────────────

// ─── Slide primitives ─────────────────────────────────────────────────────────

function progressBar(index, total, palette, isLight = false) {
  const pct = ((index + 1) / total) * 100;
  const trackColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)';
  const fillColor  = isLight ? palette.BRAND_PRIMARY : '#ffffff';
  const labelColor = isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)';
  return `<div style="position:absolute;bottom:0;left:0;right:0;padding:16px 28px 20px;display:flex;align-items:center;gap:10px;pointer-events:none;">
  <div style="flex:1;height:3px;border-radius:2px;background:${trackColor};overflow:hidden;">
    <div style="height:100%;width:${pct.toFixed(1)}%;background:${fillColor};border-radius:2px;"></div>
  </div>
  <span style="font-size:11px;font-weight:500;color:${labelColor};font-family:var(--font-body);white-space:nowrap;">${index + 1}/${total}</span>
</div>`;
}

function swipeArrow(isLight = false) {
  const bgFade   = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';
  const stroke   = isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.35)';
  const gradient = isLight
    ? 'linear-gradient(to left, rgba(0,0,0,0.06) 0%, transparent 100%)'
    : 'linear-gradient(to left, rgba(255,255,255,0.08) 0%, transparent 100%)';
  return `
    <div style="position:absolute;right:0;top:0;bottom:0;width:48px;display:flex;align-items:center;justify-content:center;pointer-events:none;background:${gradient};">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>`;
}


// ─── Reusable components ────────────────────────────────────────────────────

function pillStrikethrough(text, palette, isLight) {
  const border = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.1)';
  const color  = isLight ? '#8A8580' : 'rgba(255,255,255,0.45)';
  return `<span style="font-size:${TYPE.small.size}px;padding:5px 12px;border:1px solid ${border};border-radius:20px;color:${color};text-decoration:line-through;font-family:var(--font-body);display:inline-block;">${text}</span>`;
}

function pillTag(text, palette, isLight) {
  const bg    = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)';
  const color = palette.BRAND_LIGHT;
  return `<span style="font-size:${TYPE.small.size}px;padding:5px 12px;background:${bg};border-radius:20px;color:${color};font-family:var(--font-body);display:inline-block;">${text}</span>`;
}

function quoteBox(label, quote, palette, isLight) {
  const bg     = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.15)';
  const border = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';
  const labelColor = isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)';
  const quoteColor = isLight ? '#111' : '#fff';
  return `<div style="padding:16px;background:${bg};border-radius:12px;border:1px solid ${border};margin-bottom:10px;">
    <p style="font-size:${TYPE.small.size}px;color:${labelColor};font-family:var(--font-body);margin:0 0 4px 0;">${label}</p>
    <p style="font-size:15px;color:${quoteColor};font-family:var(--font-heading);font-style:italic;line-height:1.45;margin:0;">&ldquo;${quote}&rdquo;</p>
  </div>`;
}

function featureRow(icon, title, desc, palette, isLight) {
  const C = slideColors(palette, isLight);
  return `<div style="display:flex;align-items:flex-start;gap:14px;padding:10px 0;border-bottom:1px solid ${C.border};">
    <span style="color:${palette.BRAND_PRIMARY};font-size:15px;flex-shrink:0;margin-top:1px;">${icon}</span>
    <div>
      <div style="font-size:14px;font-weight:600;color:${C.text};font-family:var(--font-body);line-height:1.3;">${title}</div>
      <div style="font-size:12px;color:${C.textMuted};font-family:var(--font-body);line-height:1.4;margin-top:2px;">${desc}</div>
    </div>
  </div>`;
}

function numberedStep(idx, title, desc, palette, isLight) {
  const C = slideColors(palette, isLight);
  const num = String(idx).padStart(2, '0');
  return `<div style="display:flex;align-items:flex-start;gap:16px;padding:14px 0;border-bottom:1px solid ${C.border};">
    <span style="font-family:var(--font-heading);font-size:${TYPE.stepNumber.size}px;font-weight:${TYPE.stepNumber.weight};color:${palette.BRAND_PRIMARY};min-width:34px;flex-shrink:0;line-height:1;">${num}</span>
    <div>
      <div style="font-size:14px;font-weight:600;color:${C.text};font-family:var(--font-body);line-height:1.3;">${title}</div>
      <div style="font-size:12px;color:${C.textMuted};font-family:var(--font-body);line-height:1.4;margin-top:2px;">${desc}</div>
    </div>
  </div>`;
}

function ctaButton(text, palette, isLight) {
  const bg    = palette.LIGHT_BG;
  const color = palette.BRAND_DARK || '#111';
  return `<div style="display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:${bg};color:${color};font-weight:600;font-size:14px;border-radius:28px;font-family:var(--font-body);">
    ${text}
  </div>`;
}

// ─── Slide builder — handles light/dark alternation ─────────────────────────

function buildSlide({ index, total, bg, content, palette, isLast, isLight = false, usesGradient = false, artDirection = 'cinematic', slideId = 'default' }) {
  const background = usesGradient ? buildLayeredBackground(palette) : (bg || palette.SLIDE_BG);
  const C = slideColors(palette, isLight);

  // Cinematic effects layers
  const meshGradient = !isLight ? `<div class="mesh-gradient" style="position:absolute;inset:0;background:radial-gradient(ellipse at 20% 30%, ${hexToRgba(palette.BRAND_PRIMARY, 0.15)} 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, ${hexToRgba(palette.BRAND_LIGHT, 0.12)} 0%, transparent 45%), radial-gradient(ellipse at 50% 50%, ${hexToRgba(palette.BRAND_PRIMARY, 0.08)} 0%, transparent 60%);pointer-events:none;z-index:1;mix-blend-mode:screen;"></div>` : '';

  const glowOrbPrimary = !isLight ? `<div class="glow-orb" style="position:absolute;border-radius:50%;filter:blur(80px);opacity:0.4;pointer-events:none;z-index:0;width:300px;height:300px;background:${palette.BRAND_PRIMARY};top:-100px;right:-80px;"></div>` : '';

  const glowOrbSecondary = !isLight ? `<div class="glow-orb" style="position:absolute;border-radius:50%;filter:blur(80px);opacity:0.25;pointer-events:none;z-index:0;width:200px;height:200px;background:${palette.BRAND_LIGHT};bottom:-60px;left:-40px;"></div>` : '';

  const vignette = `<div class="vignette" style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%, transparent 50%, ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.15)'} 100%);pointer-events:none;z-index:2;"></div>`;

  const grainOverlay = `<div class="grain-overlay" style="position:absolute;inset:0;opacity:0.035;mix-blend-mode:overlay;pointer-events:none;z-index:100;background-image:url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E');"></div>`;

  // Legacy grain for backward compatibility
  const grain = `<svg style="position:absolute;inset:0;width:100%;height:100%;opacity:${TYPE.grain.opacity};mix-blend-mode:${TYPE.grain.blend};pointer-events:none;z-index:99;" xmlns="http://www.w3.org/2000/svg"><filter id="gr${index}"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#gr${index})"/></svg>`;

  const bar = progressBar(index, total, palette, isLight);
  const arrow = isLast ? '' : swipeArrow(isLight);

  return `<div class="slide slide-${slideId}" style="background:${background};position:relative;width:${SAFE.canvasW}px;height:${SAFE.canvasH}px;flex-shrink:0;overflow:hidden;" data-slide-index="${index}" data-art-direction="${artDirection}">
  ${meshGradient}
  ${glowOrbPrimary}
  ${glowOrbSecondary}
  ${vignette}
  ${grainOverlay}
  ${grain}
  <div style="position:relative;z-index:10;">${content}</div>
  ${bar}
  ${arrow}
</div>`;
}

// ─── Slide content templates — spec-compliant ─────────────────────────────────

function slide_Hero({ brand, palette, total, isLight, artDirection = 'cinematic' }) {
  const { BRAND_PRIMARY } = palette;
  const C = slideColors(palette, isLight);
  const L = analyzeLayout({ headline: brand.hook, body: brand.subhook, type: 'hero' });
  const s = L.safe;
  const align = L.alignment;

  const content = `
    <!-- TOP: brand line -->
    <div style="position:absolute;left:${s.left}px;right:${s.right}px;top:${s.top}px;border-bottom:1px solid ${C.border};padding-bottom:10px;">
      <span style="font-size:${TYPE.eyebrow.size}px;font-weight:${TYPE.eyebrow.weight};letter-spacing:${TYPE.eyebrow.letterSpacing};text-transform:${TYPE.eyebrow.transform};color:${C.textDim};font-family:var(--font-body);display:inline-block;">${brand.name}</span>
      <span style="font-size:${TYPE.eyebrow.size}px;font-weight:${TYPE.eyebrow.weight};letter-spacing:${TYPE.eyebrow.letterSpacing};text-transform:${TYPE.eyebrow.transform};color:${BRAND_PRIMARY};font-family:var(--font-body);float:right;">${brand.tag || 'Issue 01'}</span>
    </div>
    <!-- CENTER: headline -->
    <h1 style="position:absolute;left:${s.left}px;top:${L.hTop}px;max-width:${L.headlineWidth};text-align:${align};font-family:var(--font-heading);font-size:${L.headlineSize}px;font-weight:${TYPE.headline.weight};line-height:${TYPE.headline.lineHeight};letter-spacing:${TYPE.headline.letterSpacing};color:${C.text};margin:0;">${L.constrainedHeadline}</h1>
    <!-- BOTTOM: subhook -->
    <p style="position:absolute;left:${s.left}px;top:${L.bodyTop}px;max-width:${L.bodyWidth};font-family:var(--font-body);font-size:${TYPE.body.size}px;line-height:${TYPE.body.lineHeight};color:${C.textMuted};margin:0;">${L.constrainedBody}</p>`;

  return buildSlide({ index: 0, total, isLast: false, palette, bg: palette.LIGHT_BG, content, isLight, artDirection, slideId: 'hero' });
}

function slide_Problem({ slide, palette, index, total, isLight, artDirection = 'cinematic' }) {
  const { BRAND_PRIMARY } = palette;
  const C = slideColors(palette, isLight);
  const points = slide.points || [];
  const L = analyzeLayout({ headline: slide.headline, body: slide.body, type: 'problem' });
  const s = L.safe;
  const align = L.alignment;

  const content = `
    <!-- TOP: eyebrow -->
    <p style="position:absolute;left:${s.left}px;top:${s.top}px;font-size:${TYPE.eyebrow.size}px;font-weight:${TYPE.eyebrow.weight};letter-spacing:${TYPE.eyebrow.letterSpacing};text-transform:${TYPE.eyebrow.transform};color:${BRAND_PRIMARY};font-family:var(--font-body);margin:0;">The Problem</p>
    <!-- CENTER: headline -->
    <h2 style="position:absolute;left:${s.left}px;top:${L.hTop}px;max-width:${L.headlineWidth};text-align:${align};font-family:var(--font-heading);font-size:${L.headlineSize}px;font-weight:${TYPE.headline.weight};line-height:${TYPE.headline.lineHeight};letter-spacing:${TYPE.headline.letterSpacing};color:${C.text};margin:0;">${L.constrainedHeadline}</h2>
    <!-- BOTTOM: points + body -->
    <div style="position:absolute;left:${s.left}px;right:${s.right}px;top:${L.bodyTop}px;">
      <div style="border-top:1px solid ${C.border};">
        ${points.slice(0,3).map(p => `<div style="padding:6px 0;border-bottom:1px solid ${C.border};">${pillStrikethrough(clampChars(p, 45), palette, isLight)}</div>`).join('')}
      </div>
      ${L.constrainedBody ? `<p style="font-family:var(--font-body);font-size:${TYPE.body.size}px;line-height:${TYPE.body.lineHeight};color:${C.textMuted};margin:8px 0 0 0;max-width:${L.bodyWidth};">${L.constrainedBody}</p>` : ''}
    </div>`;

  return buildSlide({ index, total, isLast: false, palette, bg: palette.DARK_BG, content, isLight, artDirection, slideId: 'problem' });
}

function slide_Solution({ slide, palette, index, total, isLight, artDirection = 'cinematic' }) {
  const { BRAND_PRIMARY } = palette;
  const C = slideColors(palette, isLight);
  const L = analyzeLayout({ headline: slide.headline, body: slide.body, type: 'solution' });
  const s = L.safe;
  const quote = slide.quote ? clampChars(slide.quote, 100) : '';
  const align = L.alignment;

  const content = `
    <!-- TOP: eyebrow -->
    <p style="position:absolute;left:${s.left}px;top:${s.top}px;font-size:${TYPE.eyebrow.size}px;font-weight:${TYPE.eyebrow.weight};letter-spacing:${TYPE.eyebrow.letterSpacing};text-transform:${TYPE.eyebrow.transform};color:${BRAND_PRIMARY};font-family:var(--font-body);margin:0;">The Solution</p>
    <!-- CENTER: headline -->
    <h2 style="position:absolute;left:${s.left}px;top:${L.hTop}px;max-width:${L.headlineWidth};text-align:${align};font-family:var(--font-heading);font-size:${L.headlineSize}px;font-weight:${TYPE.headline.weight};line-height:${TYPE.headline.lineHeight};letter-spacing:${TYPE.headline.letterSpacing};color:${C.text};margin:0;">${L.constrainedHeadline}</h2>
    <!-- BOTTOM: quote + body -->
    <div style="position:absolute;left:${s.left}px;right:${s.right}px;top:${L.bodyTop}px;">
      ${quote ? quoteBox('Insight', quote, palette, isLight) : ''}
      <p style="font-family:var(--font-body);font-size:${TYPE.body.size}px;line-height:${TYPE.body.lineHeight};color:${C.textMuted};margin:0;max-width:${L.bodyWidth};">${L.constrainedBody}</p>
    </div>`;

  return buildSlide({ index, total, isLast: false, palette, content, usesGradient: true, isLight, artDirection, slideId: 'solution' });
}

function slide_Features({ slide, palette, index, total, isLight, artDirection = 'cinematic' }) {
  const { BRAND_PRIMARY } = palette;
  const C = slideColors(palette, isLight);
  const features = (slide.features || []).slice(0, 3);
  const L = analyzeLayout({ headline: slide.headline, body: '', type: 'features' });
  const s = L.safe;

  const content = `
    <!-- TOP: eyebrow -->
    <p style="position:absolute;left:${s.left}px;top:${s.top}px;font-size:${TYPE.eyebrow.size}px;font-weight:${TYPE.eyebrow.weight};letter-spacing:${TYPE.eyebrow.letterSpacing};text-transform:${TYPE.eyebrow.transform};color:${BRAND_PRIMARY};font-family:var(--font-body);margin:0;">What You Get</p>
    <!-- CENTER: headline -->
    <h2 style="position:absolute;left:${s.left}px;top:${L.hTop}px;max-width:${L.headlineWidth};font-family:var(--font-heading);font-size:${L.headlineSize}px;font-weight:${TYPE.headline.weight};line-height:${TYPE.headline.lineHeight};letter-spacing:${TYPE.headline.letterSpacing};color:${C.text};margin:0;">${L.constrainedHeadline}</h2>
    <!-- BOTTOM: feature list -->
    <div style="position:absolute;left:${s.left}px;right:${s.right}px;top:${L.bodyTop}px;">
      ${features.map((f, i) => featureRow('●', clampChars(f.title, 30), clampChars(f.desc, 50), palette, isLight)).join('')}
    </div>`;

  return buildSlide({ index, total, isLast: false, palette, bg: palette.LIGHT_BG, content, isLight, artDirection, slideId: 'features' });
}

function slide_Details({ slide, palette, index, total, isLight, artDirection = 'cinematic' }) {
  const { BRAND_PRIMARY } = palette;
  const C = slideColors(palette, isLight);
  const points = (slide.points || []).slice(0, 4);
  const L = analyzeLayout({ headline: slide.headline, body: '', type: 'details' });
  const s = L.safe;

  const content = `
    <!-- TOP: eyebrow -->
    <p style="position:absolute;left:${s.left}px;top:${s.top}px;font-size:${TYPE.eyebrow.size}px;font-weight:${TYPE.eyebrow.weight};letter-spacing:${TYPE.eyebrow.letterSpacing};text-transform:${TYPE.eyebrow.transform};color:${BRAND_PRIMARY};font-family:var(--font-body);margin:0;">The Details</p>
    <!-- CENTER: headline -->
    <h2 style="position:absolute;left:${s.left}px;top:${L.hTop}px;max-width:${L.headlineWidth};font-family:var(--font-heading);font-size:${L.headlineSize}px;font-weight:${TYPE.headline.weight};line-height:${TYPE.headline.lineHeight};letter-spacing:${TYPE.headline.letterSpacing};color:${C.text};margin:0;">${L.constrainedHeadline}</h2>
    <!-- BOTTOM: bullet points -->
    <div style="position:absolute;left:${s.left}px;right:${s.right}px;top:${L.bodyTop}px;border-top:1px solid ${C.border};">
      ${points.map(p => `
      <div style="padding:6px 0;border-bottom:1px solid ${C.border};">
        <span style="display:inline-block;width:3px;height:3px;border-radius:50%;background:${BRAND_PRIMARY};vertical-align:middle;margin-right:8px;margin-bottom:2px;"></span>
        <span style="font-size:12px;color:${C.textMuted};font-family:var(--font-body);line-height:1.45;">${clampChars(p, 55)}</span>
      </div>`).join('')}
    </div>`;

  return buildSlide({ index, total, isLast: false, palette, bg: palette.DARK_BG, content, isLight, artDirection, slideId: 'details' });
}

function slide_HowTo({ slide, palette, index, total, isLight, artDirection = 'cinematic' }) {
  const { BRAND_PRIMARY } = palette;
  const steps = (slide.steps || []).slice(0, 3);
  const L = analyzeLayout({ headline: slide.headline, body: '', type: 'howto' });
  const s = L.safe;

  const content = `
    <!-- TOP: eyebrow -->
    <p style="position:absolute;left:${s.left}px;top:${s.top}px;font-size:${TYPE.eyebrow.size}px;font-weight:${TYPE.eyebrow.weight};letter-spacing:${TYPE.eyebrow.letterSpacing};text-transform:${TYPE.eyebrow.transform};color:${BRAND_PRIMARY};font-family:var(--font-body);margin:0;">How It Works</p>
    <!-- CENTER: headline -->
    <h2 style="position:absolute;left:${s.left}px;top:${L.hTop}px;max-width:${L.headlineWidth};font-family:var(--font-heading);font-size:${L.headlineSize}px;font-weight:${TYPE.headline.weight};line-height:${TYPE.headline.lineHeight};letter-spacing:${TYPE.headline.letterSpacing};color:${slideColors(palette, isLight).text};margin:0;">${L.constrainedHeadline}</h2>
    <!-- BOTTOM: steps -->
    <div style="position:absolute;left:${s.left}px;right:${s.right}px;top:${L.bodyTop}px;">
      ${steps.map((step, i) => numberedStep(i + 1, clampChars(step.title, 28), clampChars(step.desc, 50), palette, isLight)).join('')}
    </div>`;

  return buildSlide({ index, total, isLast: false, palette, bg: palette.LIGHT_BG, content, isLight, artDirection, slideId: 'howto' });
}

function slide_CTA({ brand, palette, total, ctaText, isLight, artDirection = 'cinematic' }) {
  const { BRAND_PRIMARY } = palette;
  const C = slideColors(palette, isLight);
  const handle = brand.handle ? brand.handle.replace(/^@/, '') : brand.name.toLowerCase().replace(/\s+/g, '');
  const L = analyzeLayout({ headline: brand.ctaHeadline || 'Ready to begin?', body: brand.ctaBody, type: 'cta' });
  const s = L.safe;
  const align = L.alignment;

  const content = `
    <!-- TOP: brand line -->
    <div style="position:absolute;left:${s.left}px;right:${s.right}px;top:${s.top}px;border-bottom:1px solid ${C.border};padding-bottom:10px;">
      <span style="font-size:${TYPE.eyebrow.size}px;font-weight:${TYPE.eyebrow.weight};letter-spacing:${TYPE.eyebrow.letterSpacing};text-transform:${TYPE.eyebrow.transform};color:${C.textDim};font-family:var(--font-body);display:inline-block;">${brand.name}</span>
      <span style="font-size:${TYPE.eyebrow.size}px;font-weight:${TYPE.eyebrow.weight};letter-spacing:${TYPE.eyebrow.letterSpacing};text-transform:${TYPE.eyebrow.transform};color:${C.textDim};font-family:var(--font-body);float:right;">@${handle}</span>
    </div>
    <!-- CENTER: headline -->
    <h2 style="position:absolute;left:${s.left}px;top:${L.hTop}px;max-width:${L.headlineWidth};text-align:${align};font-family:var(--font-heading);font-size:${L.headlineSize}px;font-weight:${TYPE.headline.weight};line-height:${TYPE.headline.lineHeight};letter-spacing:${TYPE.headline.letterSpacing};color:${C.text};margin:0;">${L.constrainedHeadline}</h2>
    <!-- BOTTOM: body + CTA -->
    <div style="position:absolute;left:${s.left}px;right:${s.right}px;top:${L.bodyTop}px;text-align:${align};">
      <p style="font-family:var(--font-body);font-size:${TYPE.body.size}px;line-height:${TYPE.body.lineHeight};color:${C.textMuted};margin:0 0 16px 0;max-width:${L.bodyWidth};display:inline-block;text-align:left;">${L.constrainedBody}</p>
      <div style="display:block;margin-top:4px;">${ctaButton(ctaText || 'Get Started', palette, isLight)}</div>
    </div>`;

  return buildSlide({ index: total - 1, total, isLast: true, palette, content, usesGradient: true, isLight, artDirection, slideId: 'cta' });
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildCarouselHTML({ brand, slides, palette, fonts, ctaText, artDirection = 'cinematic' }) {
  const total = slides.length + 1; // content slides + CTA
  const artDirectionClass = `art-direction-${artDirection}`;

  // ═══════════════════════════════════════════════════════════════════════════════
  // NEW MODULAR SLIDE RENDERERS (Design System Architecture)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('[HTML Render] Using NEW modular design system for', artDirection);
  
  const SLIDE_RENDERERS = {
    hero:     (s, i) => renderHeroSlide({ brand, palette, total, artDirection, intensity: 'balanced', isLight: true }),
    problem:  (s, i) => renderProblemSlide({ slide: s, palette, index: i, total, artDirection, intensity: 'balanced', isLight: false }),
    solution: (s, i) => renderSolutionSlide({ slide: s, palette, index: i, total, artDirection, intensity: 'balanced', isLight: false }),
    features: (s, i) => renderFeaturesSlide({ slide: s, palette, index: i, total, artDirection, intensity: 'balanced', isLight: true }),
    details:  (s, i) => renderDetailsSlide({ slide: s, palette, index: i, total, artDirection, intensity: 'balanced', isLight: false }),
    howto:    (s, i) => renderHowToSlide({ slide: s, palette, index: i, total, artDirection, intensity: 'balanced', isLight: true }),
  };

  const slidesHTML = slides.map((s, i) => {
    const renderer = SLIDE_RENDERERS[s.id] || SLIDE_RENDERERS.details;
    console.log(`[HTML Render] Slide ${i}: ${s.id} using ${renderer.name || 'details'}`);
    return renderer(s, i);
  }).join('\n');

  const ctaHTML = renderCTASlide({ brand, palette, total, ctaText, artDirection, intensity: 'aggressive', isLight: false });
  const handle  = brand.handle || brand.name.toLowerCase().replace(/\s+/g, '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fonts.url}" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --font-heading: '${fonts.heading}', Georgia, serif;
    --font-body:    '${fonts.body}', system-ui, sans-serif;
    --brand-primary: ${palette.BRAND_PRIMARY};
    --brand-dark: ${palette.BRAND_DARK};
    --brand-light: ${palette.BRAND_LIGHT};
    --light-bg: ${palette.LIGHT_BG};
    --dark-bg:  ${palette.DARK_BG};
  }
  html, body { width: 420px; background: #000; margin: 0; padding: 0; overflow-x: hidden; }
  .ig-frame { width: 420px; background: #fff; font-family: var(--font-body); }
  .ig-header { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid #efefef; }
  .ig-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--brand-primary); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0; }
  .ig-handle { font-size: 13px; font-weight: 600; color: #111; }
  .ig-sub    { font-size: 11px; color: #888; }
  .ig-more   { margin-left: auto; font-size: 20px; color: #555; line-height: 1; }
  .carousel-viewport { width: 420px; height: 525px; overflow: hidden; position: relative; cursor: grab; }
  .carousel-track { display: flex; width: ${total * 420}px; height: 525px; transition: transform 0.35s ease; }
  .slide { font-family: var(--font-body); flex-shrink: 0; }
  .ig-dots { display: flex; justify-content: center; gap: 4px; padding: 8px 0; }
  .ig-dot { width: 6px; height: 6px; border-radius: 50%; background: #dbdbdb; transition: background 0.2s; }
  .ig-dot.active { background: var(--brand-primary); }
  .ig-actions { display: flex; align-items: center; padding: 8px 14px 4px; gap: 14px; }
  .ig-actions svg { width: 24px; height: 24px; stroke: #111; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  .ig-actions .save { margin-left: auto; }
  .ig-caption { padding: 2px 14px 14px; font-size: 13px; color: #111; line-height: 1.45; }
  .ig-caption strong { font-weight: 600; }
  .ig-time { padding: 0 14px 12px; font-size: 10px; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px; }

  /* ═══════════════════════════════════════════════════════════════════════════
     CINEMATIC EFFECTS — Mesh gradients, glow, blur, grain
     ═══════════════════════════════════════════════════════════════════════════ */

  /* Mesh gradient background overlay */
  .mesh-gradient {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 20% 30%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 70%, rgba(236, 72, 153, 0.12) 0%, transparent 45%),
      radial-gradient(ellipse at 50% 50%, rgba(99, 102, 241, 0.08) 0%, transparent 60%);
    pointer-events: none;
    z-index: 1;
    mix-blend-mode: screen;
  }

  /* Cinematic glow orb */
  .glow-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.4;
    pointer-events: none;
    z-index: 0;
  }
  .glow-orb.primary {
    width: 300px;
    height: 300px;
    background: var(--brand-primary);
    top: -100px;
    right: -80px;
  }
  .glow-orb.secondary {
    width: 200px;
    height: 200px;
    background: var(--brand-light);
    bottom: -60px;
    left: -40px;
    opacity: 0.25;
  }

  /* Layered blur backdrop for depth */
  .blur-backdrop {
    position: absolute;
    inset: 0;
    backdrop-filter: blur(0px);
    background: linear-gradient(180deg,
      rgba(0,0,0,0) 0%,
      rgba(0,0,0,0.02) 50%,
      rgba(0,0,0,0.08) 100%
    );
    pointer-events: none;
    z-index: 1;
  }

  /* Procedural grain overlay */
  .grain-overlay {
    position: absolute;
    inset: 0;
    opacity: 0.035;
    mix-blend-mode: overlay;
    pointer-events: none;
    z-index: 100;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  /* Radial lighting vignette */
  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,0.15) 100%);
    pointer-events: none;
    z-index: 2;
  }

  /* Glassmorphism card effect */
  .glass-card {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    box-shadow:
      0 4px 24px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  /* Dynamic typography scaling */
  .headline-xl { font-size: 42px; line-height: 1.05; letter-spacing: -0.03em; }
  .headline-lg { font-size: 36px; line-height: 1.1; letter-spacing: -0.02em; }
  .headline-md { font-size: 30px; line-height: 1.15; letter-spacing: -0.01em; }

  /* Text gradient effect */
  .text-gradient {
    background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-light) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Glow text effect for dark slides */
  .text-glow {
    text-shadow:
      0 0 20px rgba(168, 85, 247, 0.3),
      0 0 40px rgba(168, 85, 247, 0.15);
  }

  /* Animated subtle float */
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-4px); }
  }
  .animate-float { animation: float 6s ease-in-out infinite; }

  /* CTA button glow pulse */
  @keyframes glow-pulse {
    0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.3); }
    50% { box-shadow: 0 0 40px rgba(168, 85, 247, 0.5); }
  }
  .btn-glow { animation: glow-pulse 3s ease-in-out infinite; }
</style>
</head>
<body>
<div class="ig-frame">
  <!-- IG Header -->
  <div class="ig-header ig-chrome">
    <div class="ig-avatar">${brand.name.charAt(0).toUpperCase()}</div>
    <div>
      <div class="ig-handle">@${handle}</div>
      <div class="ig-sub">${brand.name}</div>
    </div>
    <div class="ig-more">···</div>
  </div>
  <!-- Carousel -->
  <div class="carousel-viewport" id="viewport">
    <div class="carousel-track" id="track">
      ${slidesHTML}
      ${ctaHTML}
    </div>
  </div>
  <!-- Dots -->
  <div class="ig-dots ig-chrome" id="dots">
    ${Array.from({ length: total }, (_, i) => `<div class="ig-dot${i === 0 ? ' active' : ''}" data-i="${i}"></div>`).join('')}
  </div>
  <!-- Actions -->
  <div class="ig-actions ig-chrome">
    <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
    <svg class="save" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
  </div>
  <!-- Caption -->
  <div class="ig-caption ig-chrome"><strong>@${handle}</strong> ${brand.hook || ''}</div>
  <div class="ig-time ig-chrome">Just now</div>
</div>
<script>
  let cur = 0;
  const track   = document.getElementById('track');
  const dots    = document.querySelectorAll('.ig-dot');
  const total   = ${total};
  let startX = 0;
  document.getElementById('viewport').addEventListener('mousedown', e => { startX = e.clientX; });
  document.getElementById('viewport').addEventListener('mouseup', e => {
    const dx = e.clientX - startX;
    if (dx < -30 && cur < total - 1) cur++;
    if (dx >  30 && cur > 0)         cur--;
    track.style.transform = 'translateX(' + (-cur * 420) + 'px)';
    dots.forEach((d, i) => d.classList.toggle('active', i === cur));
  });
</script>
</body>
</html>`;
}

// ─── Playwright export ────────────────────────────────────────────────────────

async function exportSlidesToPNG(html, totalSlides) {
  const { chromium } = await import('playwright');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'carousel-'));
  fs.writeFileSync(path.join(tmpDir, 'carousel.html'), html, 'utf8');

  const VIEW_W = 420;
  const VIEW_H = 525;
  const SCALE  = 1080 / 420; // → 1080px output without reflowing layout

  const outputPaths = [];
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  try {
    const page = await browser.newPage({
      viewport: { width: VIEW_W, height: VIEW_H },
      deviceScaleFactor: SCALE,
    });

    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // wait for Google Fonts

    // Strip IG chrome — hide header, dots, actions, caption, timestamp
    await page.evaluate(() => {
      document.querySelectorAll('.ig-chrome').forEach(el => el.style.display = 'none');
      const frame    = document.querySelector('.ig-frame');
      const viewport = document.querySelector('.carousel-viewport');
      if (frame)    frame.style.cssText    = 'width:420px;height:525px;max-width:none;border-radius:0;box-shadow:none;overflow:hidden;margin:0;background:#000;';
      if (viewport) viewport.style.cssText = 'width:420px;height:525px;aspect-ratio:unset;overflow:hidden;cursor:default;';
      document.body.style.cssText = 'padding:0;margin:0;display:block;overflow:hidden;background:#000;';
    });
    await page.waitForTimeout(400);

    for (let i = 0; i < totalSlides; i++) {
      await page.evaluate((idx) => {
        const track = document.getElementById('track');
        track.style.transition = 'none';
        track.style.transform  = `translateX(${-idx * 420}px)`;
      }, i);
      await page.waitForTimeout(350);
      const outPath = path.join(tmpDir, `slide_${i + 1}.png`);
      await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: VIEW_W, height: VIEW_H } });
      outputPaths.push(outPath);
      console.log(`[Carousel] Exported slide ${i + 1}/${totalSlides}`);
    }
  } finally {
    await browser.close();
  }

  return { outputPaths, tmpDir };
}

// ─── Main export ──────────────────────────────────────────────────────────────

async function generateCarousel(carouselData, artDirection = null) {
  const { brand, slides, ctaText } = carouselData;

  const palette = buildPalette(brand.color || '#6366f1');
  const fonts   = getFonts(brand.fontStyle || brand.style || 'modern', artDirection);
  const total   = slides.length + 1; // +1 for CTA

  const html = buildCarouselHTML({ brand, slides, palette, fonts, ctaText, artDirection });
  const { outputPaths, tmpDir } = await exportSlidesToPNG(html, total);

  return { outputPaths, tmpDir, html, palette, fonts };
}

export { generateCarousel, buildPalette, getFonts };
