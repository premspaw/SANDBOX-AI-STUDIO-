// services/carouselGenerator.js — PREMIUM DESIGN SYSTEM
// Full Instagram carousel HTML → Playwright → 1080×1350px PNG pipeline

import path from 'path';
import os from 'os';
import fs from 'fs';

// ─── Color utilities ─────────────────────────────────────────────────────────

function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
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
  const h = hex.startsWith('#') ? hex : `#${hex}`;
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
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

  return {
    ...closest,
    GRADIENT: `linear-gradient(155deg, ${closest.BRAND_DARK} 0%, ${closest.BRAND_PRIMARY} 55%, ${closest.BRAND_LIGHT} 100%)`,
    DIVIDER: 'rgba(255,255,255,0.08)',
    TEXT_BODY: 'rgba(255,255,255,0.58)',
    TEXT_HEAD: '#ffffff',
  };
}

// ─── Layout Intelligence Layer ───────────────────────────────────────────────

function getHeadlineSize(text) {
  const len = (text || '').length;
  if (len < 20) return 96;
  if (len < 35) return 80;
  if (len < 50) return 66;
  if (len < 65) return 54;
  return 48;
}

function getHeadlineWidth(text) {
  const len = (text || '').length;
  if (len < 25) return '62%';
  if (len < 45) return '74%';
  return '86%';
}

function getEyebrowSpacing(headlineSize) {
  if (headlineSize >= 80) return '28px';
  if (headlineSize >= 66) return '24px';
  return '20px';
}

function getBodySpacing(headlineSize) {
  if (headlineSize >= 80) return '40px';
  if (headlineSize >= 66) return '34px';
  return '28px';
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

function analyzeSlideComposition({ headline, body, type }) {
  const hSize = getHeadlineSize(headline);
  const hWidth = getHeadlineWidth(headline);
  const eyebrowGap = getEyebrowSpacing(hSize);
  const bodyGap = getBodySpacing(hSize);

  // Text constraints
  const constrainedHeadline = clampWords(clampChars(headline, 55), 12);
  const constrainedBody = clampChars(body, 120);

  return {
    headlineSize: hSize,
    headlineWidth: hWidth,
    eyebrowGap,
    bodyGap,
    constrainedHeadline,
    constrainedBody,
  };
}

// ─── Font pairings ────────────────────────────────────────────────────────────

const FONT_PAIRINGS = {
  modern:     { heading: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans',
    url: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap' },
  warm:       { heading: 'Lora', body: 'Nunito Sans',
    url: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;600&family=Nunito+Sans:wght@400;600&display=swap' },
  technical:  { heading: 'Space Grotesk', body: 'Space Grotesk',
    url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap' },
  bold:       { heading: 'Fraunces', body: 'Outfit',
    url: 'https://fonts.googleapis.com/css2?family=Fraunces:wght@300;700&family=Outfit:wght@400;500;600&display=swap' },
  classic:    { heading: 'Libre Baskerville', body: 'Work Sans',
    url: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Work+Sans:wght@400;500;600&display=swap' },
  editorial:  { heading: 'Playfair Display', body: 'Inter',
    url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700&family=Inter:wght@400;500;600;700&display=swap' },
  friendly:   { heading: 'Bricolage Grotesque', body: 'Bricolage Grotesque',
    url: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&display=swap' },
};

function getFonts(style) {
  return FONT_PAIRINGS[(style || 'modern').toLowerCase()] || FONT_PAIRINGS.modern;
}

// ─── open-design · Editorial-Monocle direction ─────────────────────────────
// Refs: Monocle · FT Weekend · NYT Magazine
// Posture: serif display · sans body · no shadows · hairline borders only
const CW = {
  dark:       '#211A14',
  darkSurf:   '#2C2219',
  light:      '#F7F4F0',
  lightAlt:   '#EDE8E2',
  paper:      '#F7F4F0',
  paperMuted: 'rgba(247,244,240,0.72)',   // stronger body contrast
  paperDim:   'rgba(247,244,240,0.38)',
  ink:        '#211A14',
  inkMuted:   'rgba(33,26,20,0.62)',
  inkDim:     'rgba(33,26,20,0.32)',
  border:     'rgba(33,26,20,0.12)',
  borderDark: 'rgba(247,244,240,0.12)',
};

// ─── Slide primitives ─────────────────────────────────────────────────────────

function progressBar(index, total, palette, isLight = false) {
  const pct   = ((index + 1) / total) * 100;
  const track = isLight ? CW.border : CW.borderDark;
  const label = isLight ? CW.inkDim  : CW.paperDim;
  return `<div style="position:absolute;bottom:18px;left:72px;display:flex;align-items:center;gap:10px;">
  <div style="width:100px;height:1px;opacity:0.25;background:${track};overflow:hidden;border-radius:1px;">
    <div style="height:100%;width:${pct.toFixed(1)}%;background:${palette.BRAND_PRIMARY};"></div>
  </div>
  <span style="font-size:8px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${label};font-family:var(--font-body);">${String(index + 1).padStart(2,'0')} / ${String(total).padStart(2,'0')}</span>
</div>`;
}

function swipeArrow(isLight = false) {
  const stroke = isLight ? CW.inkDim : CW.paperDim;
  return `
    <div style="position:absolute;right:0;top:0;bottom:52px;width:36px;display:flex;align-items:center;justify-content:center;pointer-events:none;">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>`;
}


function buildSlide({ index, total, bg, content, palette, isLast, isLight = false, usesGradient = false }) {
  const baseGradient = usesGradient ? palette.GRADIENT : (bg || palette.SLIDE_BG);
  // Layered gradient: radial highlight + base gradient for depth
  const background = `${baseGradient}`;
  const grain = `<svg style="position:absolute;inset:0;width:100%;height:100%;opacity:0.035;mix-blend-mode:${isLight ? 'multiply' : 'overlay'};pointer-events:none;" xmlns="http://www.w3.org/2000/svg"><filter id="gr"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#gr)"/></svg>`;
  const radial = `<div style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 80% 60% at 30% 20%, rgba(255,255,255,0.06) 0%, transparent 55%);"></div>`;
  const bar = progressBar(index, total, palette, isLight);
  const arrow = isLast ? '' : swipeArrow(isLight);
  return `<div class="slide" style="background:${background};position:relative;width:420px;height:525px;flex-shrink:0;overflow:hidden;">
  ${grain}
  ${radial}
  <div style="position:absolute;inset:0;padding:90px 72px 70px 72px;display:flex;flex-direction:column;justify-content:space-between;">
    ${content}
  </div>
  ${bar}
  ${arrow}
</div>`;
}

// ─── Slide content templates — spec-compliant ─────────────────────────────────

function slide_Hero({ brand, palette, total }) {
  const { BRAND_PRIMARY } = palette;
  const comp = analyzeSlideComposition({ headline: brand.hook, body: brand.subhook, type: 'hero' });

  const content = `
    <div style="display:flex;flex-direction:column;height:100%;">
      <!-- TOP: brand line -->
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${CW.borderDark};padding-bottom:12px;">
        <span style="font-size:8px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${CW.paperDim};font-family:var(--font-body);">${brand.name}</span>
        <span style="font-size:8px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${BRAND_PRIMARY};font-family:var(--font-body);">${brand.tag || 'Issue 01'}</span>
      </div>
      <!-- CENTER: headline -->
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
        <h1 style="font-family:var(--font-heading);font-size:${comp.headlineSize}px;font-weight:900;line-height:0.90;letter-spacing:-0.015em;color:${CW.paper};margin:0;max-width:${comp.headlineWidth};">${comp.constrainedHeadline}</h1>
      </div>
      <!-- BOTTOM: subhook -->
      <p style="font-family:var(--font-body);font-size:13px;line-height:1.55;color:${CW.paperMuted};margin:0;max-width:82%;">${comp.constrainedBody}</p>
    </div>`;

  return buildSlide({ index: 0, total, isLast: false, palette, content, usesGradient: true });
}

function slide_Problem({ slide, palette, index, total }) {
  const { BRAND_PRIMARY } = palette;
  const points = slide.points || [];
  const comp = analyzeSlideComposition({ headline: slide.headline, body: slide.body, type: 'problem' });

  const content = `
    <div style="display:flex;flex-direction:column;height:100%;">
      <!-- TOP: eyebrow -->
      <p style="font-size:8px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${BRAND_PRIMARY};font-family:var(--font-body);margin:0;">The Problem</p>
      <!-- CENTER: headline -->
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
        <h2 style="font-family:var(--font-heading);font-size:${comp.headlineSize}px;font-weight:900;line-height:0.90;letter-spacing:-0.015em;color:${CW.paper};margin:0;max-width:${comp.headlineWidth};">${comp.constrainedHeadline}</h2>
      </div>
      <!-- BOTTOM: points + body -->
      <div style="display:flex;flex-direction:column;gap:0;border-top:1px solid ${CW.borderDark};">
        ${points.slice(0,3).map(p => `<div style="padding:8px 0;border-bottom:1px solid ${CW.borderDark};"><span style="font-size:11px;color:${CW.paperDim};font-family:var(--font-body);text-decoration:line-through;">${clampChars(p, 45)}</span></div>`).join('')}
      </div>
      ${comp.constrainedBody ? `<p style="font-family:var(--font-body);font-size:13px;line-height:1.55;color:${CW.paperMuted};margin:10px 0 0 0;max-width:82%;">${comp.constrainedBody}</p>` : ''}
    </div>`;

  return buildSlide({ index, total, isLast: false, palette, content, usesGradient: true });
}

function slide_Solution({ slide, palette, index, total }) {
  const { BRAND_PRIMARY } = palette;
  const comp = analyzeSlideComposition({ headline: slide.headline, body: slide.body, type: 'solution' });
  const quote = slide.quote ? clampChars(slide.quote, 100) : '';

  const content = `
    <div style="display:flex;flex-direction:column;height:100%;">
      <!-- TOP: eyebrow -->
      <p style="font-size:8px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${BRAND_PRIMARY};font-family:var(--font-body);margin:0;">The Solution</p>
      <!-- CENTER: headline -->
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
        <h2 style="font-family:var(--font-heading);font-size:${comp.headlineSize}px;font-weight:900;line-height:0.90;letter-spacing:-0.015em;color:${CW.paper};margin:0;max-width:${comp.headlineWidth};">${comp.constrainedHeadline}</h2>
      </div>
      <!-- BOTTOM: quote + body -->
      ${quote ? `<div style="border-left:2px solid ${BRAND_PRIMARY};padding-left:14px;margin-bottom:10px;"><p style="font-family:var(--font-heading);font-size:14px;font-style:italic;line-height:1.50;color:${CW.paperMuted};margin:0;">&ldquo;${quote}&rdquo;</p></div>` : ''}
      <p style="font-family:var(--font-body);font-size:13px;line-height:1.55;color:${CW.paperMuted};margin:0;max-width:82%;">${comp.constrainedBody}</p>
    </div>`;

  return buildSlide({ index, total, isLast: false, palette, content, usesGradient: true });
}

function slide_Features({ slide, palette, index, total }) {
  const { BRAND_PRIMARY } = palette;
  const features = (slide.features || []).slice(0, 3);
  const comp = analyzeSlideComposition({ headline: slide.headline, body: '', type: 'features' });

  const content = `
    <div style="display:flex;flex-direction:column;height:100%;">
      <!-- TOP: eyebrow -->
      <p style="font-size:8px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${BRAND_PRIMARY};font-family:var(--font-body);margin:0;">What You Get</p>
      <!-- CENTER: headline -->
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
        <h2 style="font-family:var(--font-heading);font-size:${comp.headlineSize}px;font-weight:900;line-height:0.90;letter-spacing:-0.015em;color:${CW.paper};margin:0;max-width:${comp.headlineWidth};">${comp.constrainedHeadline}</h2>
      </div>
      <!-- BOTTOM: feature list -->
      <div style="display:flex;flex-direction:column;border-top:1px solid ${CW.borderDark};">
        ${features.map((f, i) => `
        <div style="display:flex;align-items:baseline;gap:12px;padding:9px 0;border-bottom:1px solid ${CW.borderDark};">
          <span style="font-size:8px;font-weight:800;letter-spacing:0.10em;color:${BRAND_PRIMARY};min-width:18px;font-family:var(--font-body);">${String(i + 1).padStart(2,'0')}</span>
          <div>
            <div style="font-size:12px;font-weight:700;color:${CW.paper};font-family:var(--font-body);line-height:1.3;">${clampChars(f.title, 30)}</div>
            <div style="font-size:11px;color:${CW.paperDim};font-family:var(--font-body);line-height:1.4;margin-top:1px;">${clampChars(f.desc, 50)}</div>
          </div>
        </div>`).join('')}
      </div>
    </div>`;

  return buildSlide({ index, total, isLast: false, palette, content, usesGradient: true });
}

function slide_Details({ slide, palette, index, total }) {
  const { BRAND_PRIMARY } = palette;
  const points = (slide.points || []).slice(0, 4);
  const comp = analyzeSlideComposition({ headline: slide.headline, body: '', type: 'details' });

  const content = `
    <div style="display:flex;flex-direction:column;height:100%;">
      <!-- TOP: eyebrow -->
      <p style="font-size:8px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${BRAND_PRIMARY};font-family:var(--font-body);margin:0;">The Details</p>
      <!-- CENTER: headline -->
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
        <h2 style="font-family:var(--font-heading);font-size:${comp.headlineSize}px;font-weight:900;line-height:0.90;letter-spacing:-0.015em;color:${CW.paper};margin:0;max-width:${comp.headlineWidth};">${comp.constrainedHeadline}</h2>
      </div>
      <!-- BOTTOM: bullet points -->
      <div style="display:flex;flex-direction:column;border-top:1px solid ${CW.borderDark};">
        ${points.map(p => `
        <div style="display:flex;align-items:baseline;gap:10px;padding:8px 0;border-bottom:1px solid ${CW.borderDark};">
          <div style="width:3px;height:3px;border-radius:50%;background:${BRAND_PRIMARY};flex-shrink:0;margin-top:5px;"></div>
          <p style="font-size:12px;color:${CW.paperMuted};font-family:var(--font-body);margin:0;line-height:1.50;">${clampChars(p, 55)}</p>
        </div>`).join('')}
      </div>
    </div>`;

  return buildSlide({ index, total, isLast: false, palette, content, usesGradient: true });
}

function slide_HowTo({ slide, palette, index, total }) {
  const { BRAND_PRIMARY } = palette;
  const steps = (slide.steps || []).slice(0, 3);
  const comp = analyzeSlideComposition({ headline: slide.headline, body: '', type: 'howto' });

  const content = `
    <div style="display:flex;flex-direction:column;height:100%;">
      <!-- TOP: eyebrow -->
      <p style="font-size:8px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${BRAND_PRIMARY};font-family:var(--font-body);margin:0;">How It Works</p>
      <!-- CENTER: headline -->
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
        <h2 style="font-family:var(--font-heading);font-size:${comp.headlineSize}px;font-weight:900;line-height:0.90;letter-spacing:-0.015em;color:${CW.paper};margin:0;max-width:${comp.headlineWidth};">${comp.constrainedHeadline}</h2>
      </div>
      <!-- BOTTOM: steps -->
      <div style="display:flex;flex-direction:column;border-top:1px solid ${CW.borderDark};">
        ${steps.map((step, i) => `
        <div style="display:flex;align-items:baseline;gap:12px;padding:9px 0;border-bottom:1px solid ${CW.borderDark};">
          <span style="font-family:var(--font-heading);font-size:18px;font-weight:900;color:${BRAND_PRIMARY};min-width:28px;line-height:1;letter-spacing:-0.02em;">${String(i + 1).padStart(2, '0')}</span>
          <div>
            <div style="font-size:12px;font-weight:700;color:${CW.paper};font-family:var(--font-body);line-height:1.3;">${clampChars(step.title, 28)}</div>
            <div style="font-size:11px;color:${CW.paperDim};font-family:var(--font-body);line-height:1.4;margin-top:1px;">${clampChars(step.desc, 50)}</div>
          </div>
        </div>`).join('')}
      </div>
    </div>`;

  return buildSlide({ index, total, isLast: false, palette, content, usesGradient: true });
}

function slide_CTA({ brand, palette, total, ctaText }) {
  const { BRAND_PRIMARY } = palette;
  const handle = brand.handle ? brand.handle.replace(/^@/, '') : brand.name.toLowerCase().replace(/\s+/g, '');
  const comp = analyzeSlideComposition({ headline: brand.ctaHeadline || 'Ready to begin?', body: brand.ctaBody, type: 'cta' });

  const content = `
    <div style="display:flex;flex-direction:column;height:100%;">
      <!-- TOP: brand line -->
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${CW.borderDark};padding-bottom:12px;">
        <span style="font-size:8px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${CW.paperDim};font-family:var(--font-body);">${brand.name}</span>
        <span style="font-size:8px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${CW.paperDim};font-family:var(--font-body);">@${handle}</span>
      </div>
      <!-- CENTER: headline -->
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
        <h2 style="font-family:var(--font-heading);font-size:${comp.headlineSize}px;font-weight:900;line-height:0.90;letter-spacing:-0.015em;color:${CW.paper};margin:0;max-width:${comp.headlineWidth};">${comp.constrainedHeadline}</h2>
      </div>
      <!-- BOTTOM: body + CTA -->
      <p style="font-family:var(--font-body);font-size:13px;line-height:1.55;color:${CW.paperMuted};margin:0 0 16px 0;max-width:78%;">${comp.constrainedBody}</p>
      <div style="display:inline-flex;align-self:flex-start;align-items:center;padding:10px 24px;background:${BRAND_PRIMARY};color:#0a0a0a;font-weight:800;font-size:11px;letter-spacing:0.10em;text-transform:uppercase;font-family:var(--font-body);border-radius:2px;">
        ${ctaText || 'Get Started'}
      </div>
    </div>`;

  return buildSlide({ index: total - 1, total, isLast: true, palette, content, usesGradient: true });
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildCarouselHTML({ brand, slides, palette, fonts, ctaText }) {
  const total = slides.length + 1; // content slides + CTA

  const SLIDE_BUILDERS = {
    hero:     (s, i) => slide_Hero({ brand, palette, total }),
    problem:  (s, i) => slide_Problem({ slide: s, palette, index: i, total }),
    solution: (s, i) => slide_Solution({ slide: s, palette, index: i, total }),
    features: (s, i) => slide_Features({ slide: s, palette, index: i, total }),
    details:  (s, i) => slide_Details({ slide: s, palette, index: i, total }),
    howto:    (s, i) => slide_HowTo({ slide: s, palette, index: i, total }),
  };

  const slidesHTML = slides.map((s, i) => {
    const builder = SLIDE_BUILDERS[s.id] || SLIDE_BUILDERS.details;
    return builder(s, i);
  }).join('\n');

  const ctaHTML = slide_CTA({ brand, palette, total, ctaText });
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

async function generateCarousel(carouselData) {
  const { brand, slides, ctaText } = carouselData;

  const palette = buildPalette(brand.color || '#6366f1');
  const fonts   = getFonts(brand.fontStyle || brand.style || 'modern');
  const total   = slides.length + 1; // +1 for CTA

  const html = buildCarouselHTML({ brand, slides, palette, fonts, ctaText });
  const { outputPaths, tmpDir } = await exportSlidesToPNG(html, total);

  return { outputPaths, tmpDir, html, palette, fonts };
}

export { generateCarousel, buildPalette, getFonts };
