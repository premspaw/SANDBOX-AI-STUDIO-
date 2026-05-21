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

function buildPalette(primaryHex) {
  const hex = primaryHex?.startsWith('#') ? primaryHex : `#${primaryHex || '6366f1'}`;
  const [h, s, l] = hexToHsl(hex);
  const SLIDE_BG      = hslToHex(h, Math.min(s * 0.35, 25), 7);
  const BRAND_PRIMARY = hex;
  const BRAND_LIGHT   = hslToHex(h, Math.min(s + 10, 100), Math.min(l + 22, 88));
  const BRAND_DARK    = hslToHex(h, Math.min(s + 5, 100),  Math.max(l - 28, 12));
  const GRADIENT      = `linear-gradient(155deg, ${BRAND_DARK} 0%, ${BRAND_PRIMARY} 55%, ${BRAND_LIGHT} 100%)`;
  const DIVIDER       = 'rgba(255,255,255,0.08)';
  const TEXT_BODY     = 'rgba(255,255,255,0.58)';
  const TEXT_HEAD     = '#ffffff';
  return { SLIDE_BG, BRAND_PRIMARY, BRAND_LIGHT, BRAND_DARK, GRADIENT, DIVIDER, TEXT_BODY, TEXT_HEAD };
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
  dark:       '#211A14',   // ink (OKLch 20% 0.018 70)
  darkSurf:   '#2C2219',
  light:      '#F7F4F0',   // paper (OKLch 98% 0.004 95)
  lightAlt:   '#EDE8E2',
  paper:      '#F7F4F0',
  paperMuted: 'rgba(247,244,240,0.58)',
  paperDim:   'rgba(247,244,240,0.28)',
  ink:        '#211A14',
  inkMuted:   'rgba(33,26,20,0.52)',
  inkDim:     'rgba(33,26,20,0.28)',
  border:     'rgba(33,26,20,0.12)',
  borderDark: 'rgba(247,244,240,0.10)',
};

// ─── Slide primitives ─────────────────────────────────────────────────────────

function progressBar(index, total, palette, isLight = false) {
  const pct   = ((index + 1) / total) * 100;
  const track = isLight ? CW.border : CW.borderDark;
  const label = isLight ? CW.inkDim  : CW.paperDim;
  return `<div style="position:absolute;bottom:0;left:0;right:0;padding:14px 32px 18px;display:flex;align-items:center;gap:12px;border-top:1px solid ${track};">
  <div style="flex:1;height:1px;background:${track};overflow:hidden;">
    <div style="height:100%;width:${pct.toFixed(1)}%;background:${palette.BRAND_PRIMARY};"></div>
  </div>
  <span style="font-size:9px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:${label};font-family:var(--font-body);">${index + 1}&thinsp;/&thinsp;${total}</span>
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
  const background = usesGradient ? palette.GRADIENT : (bg || palette.SLIDE_BG);
  const grain = `<svg style="position:absolute;inset:0;width:100%;height:100%;opacity:0.04;mix-blend-mode:${isLight ? 'multiply' : 'overlay'};pointer-events:none;" xmlns="http://www.w3.org/2000/svg"><filter id="gr"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#gr)"/></svg>`;
  const bar = progressBar(index, total, palette, isLight);
  const arrow = isLast ? '' : swipeArrow(isLight);
  return `<div class="slide" style="background:${background};position:relative;width:420px;height:525px;flex-shrink:0;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;padding:0 36px 52px;">
  ${grain}
  ${content}
  ${bar}
  ${arrow}
</div>`;
}

// ─── Slide content templates — spec-compliant ─────────────────────────────────

function slide_Hero({ brand, palette, total }) {
  const { BRAND_PRIMARY } = palette;
  const handle = brand.handle ? brand.handle.replace(/^@/, '') : brand.name.toLowerCase().replace(/\s+/g, '');

  const content = `
    <div style="display:flex;flex-direction:column;">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${CW.borderDark};padding-bottom:14px;margin-bottom:26px;">
        <span style="font-size:9px;font-weight:600;letter-spacing:0.20em;text-transform:uppercase;color:${CW.paperDim};font-family:var(--font-body);">${brand.name}</span>
        <span style="font-size:9px;font-weight:600;letter-spacing:0.20em;text-transform:uppercase;color:${BRAND_PRIMARY};font-family:var(--font-body);">${brand.tag || 'Issue 01'}</span>
      </div>
      <h1 style="font-family:var(--font-heading);font-size:52px;font-weight:900;line-height:0.92;letter-spacing:-0.01em;color:${CW.paper};margin:0 0 22px 0;max-width:92%;">${brand.hook}</h1>
      <p style="font-family:var(--font-body);font-size:14px;line-height:1.52;color:${CW.paperMuted};margin:0;max-width:80%;">${brand.subhook}</p>
    </div>`;

  return buildSlide({ index: 0, total, isLast: false, palette, content, usesGradient: true });
}

function slide_Problem({ slide, palette, index, total }) {
  const { BRAND_PRIMARY } = palette;
  const points = slide.points || [];

  const content = `
    <div style="display:flex;flex-direction:column;">
      <p style="font-size:9px;font-weight:600;letter-spacing:0.20em;text-transform:uppercase;color:${BRAND_PRIMARY};font-family:var(--font-body);margin:0 0 18px 0;">The Problem</p>
      <h2 style="font-family:var(--font-heading);font-size:46px;font-weight:900;line-height:0.93;letter-spacing:-0.01em;color:${CW.paper};margin:0 0 22px 0;max-width:92%;">${slide.headline}</h2>
      <div style="display:flex;flex-direction:column;gap:0;border-top:1px solid ${CW.borderDark};">
        ${points.map(p => `<div style="padding:10px 0;border-bottom:1px solid ${CW.borderDark};display:flex;align-items:center;gap:10px;"><span style="font-size:11px;color:${CW.paperDim};font-family:var(--font-body);text-decoration:line-through;">${p}</span></div>`).join('')}
      </div>
      ${slide.body ? `<p style="font-family:var(--font-body);font-size:14px;line-height:1.52;color:${CW.paperMuted};margin:16px 0 0 0;max-width:80%;">${slide.body}</p>` : ''}
    </div>`;

  return buildSlide({ index, total, isLast: false, palette, content, usesGradient: true });
}

function slide_Solution({ slide, palette, index, total }) {
  const { BRAND_PRIMARY } = palette;

  const content = `
    <div style="display:flex;flex-direction:column;">
      <p style="font-size:9px;font-weight:600;letter-spacing:0.20em;text-transform:uppercase;color:${BRAND_PRIMARY};font-family:var(--font-body);margin:0 0 18px 0;">The Solution</p>
      <h2 style="font-family:var(--font-heading);font-size:46px;font-weight:900;line-height:0.93;letter-spacing:-0.01em;color:${CW.ink};margin:0 0 20px 0;max-width:92%;">${slide.headline}</h2>
      ${slide.quote ? `<div style="border-left:2px solid ${BRAND_PRIMARY};padding-left:16px;margin-bottom:16px;"><p style="font-family:var(--font-heading);font-size:15px;font-style:italic;line-height:1.48;color:${CW.inkMuted};margin:0;">&ldquo;${slide.quote}&rdquo;</p></div>` : ''}
      <p style="font-family:var(--font-body);font-size:14px;line-height:1.52;color:${CW.inkMuted};margin:0;max-width:80%;">${slide.body || ''}</p>
    </div>`;

  return buildSlide({ index, total, isLast: false, palette, content, usesGradient: true });
}

function slide_Features({ slide, palette, index, total }) {
  const { BRAND_PRIMARY } = palette;
  const features = slide.features || [];

  const content = `
    <div style="display:flex;flex-direction:column;">
      <p style="font-size:9px;font-weight:600;letter-spacing:0.20em;text-transform:uppercase;color:${BRAND_PRIMARY};font-family:var(--font-body);margin:0 0 16px 0;">What You Get</p>
      <h2 style="font-family:var(--font-heading);font-size:40px;font-weight:900;line-height:0.93;letter-spacing:-0.01em;color:${CW.ink};margin:0 0 20px 0;max-width:92%;">${slide.headline}</h2>
      <div style="display:flex;flex-direction:column;border-top:1px solid ${CW.border};">
        ${features.map((f, i) => `
        <div style="display:flex;align-items:baseline;gap:14px;padding:11px 0;border-bottom:1px solid ${CW.border};">
          <span style="font-size:9px;font-weight:700;letter-spacing:0.12em;color:${BRAND_PRIMARY};min-width:20px;font-family:var(--font-body);">${String(i + 1).padStart(2,'0')}</span>
          <div>
            <div style="font-size:13px;font-weight:600;color:${CW.ink};font-family:var(--font-body);line-height:1.3;">${f.title}</div>
            <div style="font-size:12px;color:${CW.inkMuted};font-family:var(--font-body);line-height:1.4;margin-top:2px;">${f.desc}</div>
          </div>
        </div>`).join('')}
      </div>
    </div>`;

  return buildSlide({ index, total, isLast: false, palette, content, usesGradient: true });
}

function slide_Details({ slide, palette, index, total }) {
  const { BRAND_PRIMARY } = palette;
  const points = slide.points || [];

  const content = `
    <div style="display:flex;flex-direction:column;">
      <p style="font-size:9px;font-weight:600;letter-spacing:0.20em;text-transform:uppercase;color:${BRAND_PRIMARY};font-family:var(--font-body);margin:0 0 16px 0;">The Details</p>
      <h2 style="font-family:var(--font-heading);font-size:42px;font-weight:900;line-height:0.93;letter-spacing:-0.01em;color:${CW.paper};margin:0 0 22px 0;max-width:92%;">${slide.headline}</h2>
      <div style="display:flex;flex-direction:column;border-top:1px solid ${CW.borderDark};">
        ${points.map(p => `
        <div style="display:flex;align-items:baseline;gap:12px;padding:10px 0;border-bottom:1px solid ${CW.borderDark};">
          <div style="width:3px;height:3px;border-radius:50%;background:${BRAND_PRIMARY};flex-shrink:0;margin-top:6px;"></div>
          <p style="font-size:13px;color:${CW.paperMuted};font-family:var(--font-body);margin:0;line-height:1.48;">${p}</p>
        </div>`).join('')}
      </div>
    </div>`;

  return buildSlide({ index, total, isLast: false, palette, content, usesGradient: true });
}

function slide_HowTo({ slide, palette, index, total }) {
  const { BRAND_PRIMARY } = palette;
  const steps = slide.steps || [];

  const content = `
    <div style="display:flex;flex-direction:column;">
      <p style="font-size:9px;font-weight:600;letter-spacing:0.20em;text-transform:uppercase;color:${BRAND_PRIMARY};font-family:var(--font-body);margin:0 0 16px 0;">How It Works</p>
      <h2 style="font-family:var(--font-heading);font-size:42px;font-weight:900;line-height:0.93;letter-spacing:-0.01em;color:${CW.ink};margin:0 0 20px 0;max-width:92%;">${slide.headline}</h2>
      <div style="display:flex;flex-direction:column;border-top:1px solid ${CW.border};">
        ${steps.map((step, i) => `
        <div style="display:flex;align-items:baseline;gap:16px;padding:12px 0;border-bottom:1px solid ${CW.border};">
          <span style="font-family:var(--font-heading);font-size:22px;font-weight:900;color:${BRAND_PRIMARY};min-width:32px;line-height:1;letter-spacing:-0.02em;">${String(i + 1).padStart(2, '0')}</span>
          <div>
            <div style="font-size:13px;font-weight:600;color:${CW.ink};font-family:var(--font-body);line-height:1.3;">${step.title}</div>
            <div style="font-size:12px;color:${CW.inkMuted};font-family:var(--font-body);line-height:1.4;margin-top:2px;">${step.desc}</div>
          </div>
        </div>`).join('')}
      </div>
    </div>`;

  return buildSlide({ index, total, isLast: false, palette, content, usesGradient: true });
}

function slide_CTA({ brand, palette, total, ctaText }) {
  const { BRAND_PRIMARY } = palette;
  const handle = brand.handle ? brand.handle.replace(/^@/, '') : brand.name.toLowerCase().replace(/\s+/g, '');

  const content = `
    <div style="display:flex;flex-direction:column;">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${CW.border};padding-bottom:14px;margin-bottom:26px;">
        <span style="font-size:9px;font-weight:600;letter-spacing:0.20em;text-transform:uppercase;color:${CW.inkDim};font-family:var(--font-body);">${brand.name}</span>
        <span style="font-size:9px;font-weight:600;letter-spacing:0.20em;text-transform:uppercase;color:${CW.inkDim};font-family:var(--font-body);">@${handle}</span>
      </div>
      <h2 style="font-family:var(--font-heading);font-size:50px;font-weight:900;line-height:0.92;letter-spacing:-0.01em;color:${CW.ink};margin:0 0 20px 0;max-width:92%;">${brand.ctaHeadline || 'Ready to begin?'}</h2>
      <p style="font-family:var(--font-body);font-size:14px;line-height:1.52;color:${CW.inkMuted};margin:0 0 28px 0;max-width:78%;">${brand.ctaBody || ''}</p>
      <div style="display:inline-flex;align-items:center;padding:11px 26px;background:${BRAND_PRIMARY};color:#fff;font-weight:600;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-family:var(--font-body);">
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
