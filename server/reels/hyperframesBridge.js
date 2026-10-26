/**
 * HyperFrames Bridge for ZeroLens Reels Studio.
 * Generates deterministic, seekable HTML/CSS/GSAP compositions compliant with
 * HeyGen's open-source HyperFrames standard (heygen-com/hyperframes).
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { buildTimeline } from '../../src/features/ReelsEditor/core/editPlan.js';
import * as store from './store.js';

/**
 * Generates a self-contained, standalone HyperFrames composition HTML string.
 */
export function generateHyperFramesHtml(project, options = {}) {
  const tl = buildTimeline(project);
  const durationSec = Math.max(1, tl.durationSec || 15);
  const width = project.canvas?.width || 1080;
  const height = project.canvas?.height || 1920;
  const fps = tl.fps || 30;

  const brand = project.brand || {
    background: '#0a0a0a',
    surface: '#18181b',
    text: '#ffffff',
    accent: '#c8f135',
    secondary: '#9c89ff',
    font: 'poppins',
  };

  const videoSrc = options.videoUrl || (options.relativeVideo ? 'input-video.mp4' : '');

  // Render cards markup & GSAP cues
  const cardsHtml = [];
  const gsapTweens = [];

  project.overlays.forEach((overlay, idx) => {
    if (overlay.needsReview) return;
    const startSec = overlay.startFrame / fps;
    const durationCardSec = overlay.durationFrames / fps;
    const endSec = startSec + durationCardSec;
    const cardId = `hf-card-${idx}`;

    const lines = (overlay.text || '').split('\n').filter(Boolean);
    const primaryColor = overlay.style?.color || brand.text;
    const boxColor = overlay.style?.boxColor || brand.surface;
    const boxOpacity = overlay.style?.boxOpacity ?? 0.85;
    const fontSize = overlay.style?.fontSize || 72;
    const topPct = (overlay.style?.y ?? 0.5) * 100;
    const leftPct = (overlay.style?.x ?? 0.5) * 100;

    let cardContentHtml = '';

    if (overlay.templateId === 'split-screen-50') {
      cardContentHtml = `
        <div class="hf-split-card">
          <div class="hf-split-accent"></div>
          <div class="hf-split-body">
            ${lines.map((l, i) => `<div class="${i === 0 ? 'hf-headline' : 'hf-detail'}">${escapeHtml(l)}</div>`).join('')}
          </div>
        </div>
      `;
    } else if (overlay.templateId === 'kinetic-wheel-list') {
      cardContentHtml = `
        <div class="hf-wheel-card">
          <div class="hf-wheel-header">KEY STEPS</div>
          <div class="hf-wheel-list">
            ${lines.map((l, i) => `<div class="hf-wheel-item ${i === 0 ? 'active' : ''}"><span class="hf-step-num">0${i + 1}</span> <span>${escapeHtml(l.replace(/^[▶▷\s•\d]+/, ''))}</span></div>`).join('')}
          </div>
        </div>
      `;
    } else if (overlay.templateId === 'data-callout-pill') {
      cardContentHtml = `
        <div class="hf-data-pill">
          <div class="hf-pill-glow"></div>
          ${lines.map((l, i) => `<div class="${i === 0 ? 'hf-stat-val' : 'hf-stat-sub'}">${escapeHtml(l)}</div>`).join('')}
        </div>
      `;
    } else if (overlay.templateId === 'full-summary-finale') {
      cardContentHtml = `
        <div class="hf-summary-card">
          <div class="hf-summary-badge">FINAL RECAP 🚀</div>
          <div class="hf-summary-points">
            ${lines.map((l) => `<div class="hf-summary-row">${escapeHtml(l)}</div>`).join('')}
          </div>
          <div class="hf-summary-footer">ZeroLens • Save & Share</div>
        </div>
      `;
    } else if (overlay.templateId === 'hormozi-caption') {
      cardContentHtml = `
        <div class="hf-hormozi-pill">
          <span class="hf-hormozi-text">${escapeHtml(overlay.text)}</span>
        </div>
      `;
    } else {
      cardContentHtml = `
        <div class="hf-standard-pill">
          ${lines.map((l) => `<div>${escapeHtml(l)}</div>`).join('')}
        </div>
      `;
    }

    cardsHtml.push(`
      <div id="${cardId}" class="hf-card" style="top: ${topPct.toFixed(2)}%; left: ${leftPct.toFixed(2)}%; font-size: ${fontSize}px; --box-bg: ${boxColor}; --box-opacity: ${boxOpacity}; --text-col: ${primaryColor};">
        ${cardContentHtml}
      </div>
    `);

    // GSAP animations for seekability
    const inAnim = overlay.animation?.in || 'slide-up';
    const animFrames = overlay.animation?.durationFrames || 9;
    const animSec = Math.max(0.1, animFrames / fps);

    if (inAnim === 'slide-up') {
      gsapTweens.push(`
        tl.fromTo("#${cardId}", { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: ${animSec.toFixed(3)}, ease: "power2.out" }, ${startSec.toFixed(3)});
        tl.to("#${cardId}", { opacity: 0, y: -40, duration: ${animSec.toFixed(3)}, ease: "power2.in" }, ${(endSec - animSec).toFixed(3)});
      `);
    } else if (inAnim === 'fade') {
      gsapTweens.push(`
        tl.fromTo("#${cardId}", { opacity: 0 }, { opacity: 1, duration: ${animSec.toFixed(3)}, ease: "power1.inOut" }, ${startSec.toFixed(3)});
        tl.to("#${cardId}", { opacity: 0, duration: ${animSec.toFixed(3)}, ease: "power1.inOut" }, ${(endSec - animSec).toFixed(3)});
      `);
    } else {
      gsapTweens.push(`
        tl.set("#${cardId}", { opacity: 1, visibility: "visible" }, ${startSec.toFixed(3)});
        tl.set("#${cardId}", { opacity: 0, visibility: "hidden" }, ${endSec.toFixed(3)});
      `);
    }
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(project.name || 'ZeroLens Reel')} • HyperFrames Composition</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Caveat:wght@700&family=Inter:wght@400;600;800;900&family=Montserrat:wght@700;900&family=Poppins:wght@600;800;900&family=Syne:wght@700;800&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <style>
    :root {
      --bg: ${brand.background};
      --surface: ${brand.surface};
      --text: ${brand.text};
      --accent: ${brand.accent};
      --secondary: ${brand.secondary};
      --font-family: 'Poppins', sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #000;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow: hidden;
      font-family: var(--font-family);
    }
    #composition {
      position: relative;
      width: ${width}px;
      height: ${height}px;
      background: var(--bg);
      overflow: hidden;
      transform-origin: center center;
    }
    #video-wrap {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    }
    #video-wrap video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    #cards-wrap {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 10;
    }
    .hf-card {
      position: absolute;
      transform: translate(-50%, -50%);
      opacity: 0;
      text-align: center;
      max-width: 90%;
      line-height: 1.25;
      font-weight: 800;
    }
    .hf-standard-pill {
      background: var(--box-bg);
      opacity: var(--box-opacity);
      color: var(--text-col);
      padding: 0.35em 0.8em;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 16px 40px rgba(0,0,0,0.6);
      white-space: pre-line;
    }
    .hf-hormozi-pill {
      background: #000000;
      color: var(--accent);
      padding: 0.4em 0.9em;
      border-radius: 16px;
      border: 2px solid var(--accent);
      box-shadow: 0 12px 30px rgba(0,0,0,0.8);
      font-weight: 900;
      letter-spacing: -0.02em;
    }
    .hf-split-card {
      position: relative;
      background: var(--surface);
      border-radius: 24px;
      padding: 2rem;
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
      width: 880px;
      text-align: left;
    }
    .hf-split-accent {
      position: absolute;
      top: 0; left: 10%; right: 10%;
      height: 4px;
      background: var(--accent);
      border-radius: 4px;
      box-shadow: 0 0 15px var(--accent);
    }
    .hf-split-body .hf-headline {
      color: var(--accent);
      font-size: 1.1em;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
    }
    .hf-split-body .hf-detail {
      color: #fff;
      font-size: 0.9em;
      opacity: 0.95;
    }
    .hf-wheel-card {
      background: rgba(10, 10, 12, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 28px;
      padding: 2.2rem;
      width: 860px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(12px);
    }
    .hf-wheel-header {
      font-size: 0.6em;
      letter-spacing: 0.2em;
      color: var(--secondary);
      margin-bottom: 1.2rem;
      text-align: left;
    }
    .hf-wheel-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.8rem;
      font-size: 0.85em;
      color: #71717a;
      text-align: left;
    }
    .hf-wheel-item.active {
      color: #fff;
      font-weight: 900;
    }
    .hf-step-num {
      color: var(--accent);
      background: rgba(200, 241, 53, 0.15);
      padding: 0.1em 0.4em;
      border-radius: 8px;
      font-size: 0.8em;
    }
    .hf-data-pill {
      background: rgba(11, 19, 43, 0.92);
      border: 2px solid var(--accent);
      border-radius: 36px;
      padding: 1.2rem 2.5rem;
      box-shadow: 0 0 35px rgba(6, 182, 212, 0.35);
    }
    .hf-stat-val {
      color: var(--accent);
      font-size: 1.1em;
      font-weight: 900;
    }
    .hf-stat-sub {
      color: #fff;
      font-size: 0.75em;
      opacity: 0.85;
      font-weight: 600;
    }
    .hf-summary-card {
      background: radial-gradient(circle at top, #1c1530 0%, #09090b 100%);
      border: 1px solid rgba(156, 137, 255, 0.3);
      border-radius: 32px;
      padding: 2.5rem;
      width: 900px;
      box-shadow: 0 24px 80px rgba(0,0,0,0.9);
    }
    .hf-summary-badge {
      display: inline-block;
      background: rgba(156, 137, 255, 0.2);
      color: #c4b5fd;
      padding: 0.3em 1em;
      border-radius: 20px;
      font-size: 0.65em;
      margin-bottom: 1.2rem;
    }
    .hf-summary-points {
      text-align: left;
      font-size: 0.85em;
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
      margin-bottom: 1.5rem;
    }
    .hf-summary-footer {
      font-size: 0.55em;
      color: #71717a;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div id="composition" data-duration="${durationSec.toFixed(2)}" data-fps="${fps}">
    <div id="video-wrap">
      ${videoSrc ? `<video id="main-video" src="${escapeHtml(videoSrc)}" playsinline muted preload="auto"></video>` : ''}
    </div>
    <div id="cards-wrap">
      ${cardsHtml.join('\n')}
    </div>
  </div>

  <script>
    // HyperFrames deterministic timeline orchestrator
    const tl = gsap.timeline({ paused: true });
    window.__timeline = tl;

    ${gsapTweens.join('\n')}

    // Segment mapping for jump-cuts and silence removal
    const segments = ${JSON.stringify(tl.segments.map((s) => ({
      startSec: Number((s.startFrame / fps).toFixed(3)),
      endSec: Number((s.endFrame / fps).toFixed(3)),
      inSec: s.inSec,
      outSec: s.outSec,
      speed: s.speed || 1,
    })))};

    // HyperFrames seek API with multi-clip jump-cut alignment
    window.seekTo = function(seconds) {
      tl.seek(seconds);
      const v = document.getElementById('main-video');
      if (!v) return;
      const seg = segments.find((s) => seconds >= s.startSec && seconds < s.endSec) || segments[segments.length - 1];
      if (seg) {
        const relSec = Math.max(0, seconds - seg.startSec);
        const targetSrcSec = Math.min(seg.outSec, seg.inSec + (relSec * seg.speed));
        if (Math.abs(v.currentTime - targetSrcSec) > 0.05) {
          v.currentTime = targetSrcSec;
        }
      }
    };

    // Auto-scale to viewport for preview
    function scaleViewport() {
      const comp = document.getElementById('composition');
      const scale = Math.min(window.innerWidth / ${width}, window.innerHeight / ${height}) * 0.95;
      comp.style.transform = "scale(" + scale + ")";
    }
    window.addEventListener('resize', scaleViewport);
    scaleViewport();
  </script>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Exports a full HyperFrames project bundle to the filesystem.
 */
export async function exportHyperFramesBundle(project, ownerId) {
  const tl = buildTimeline(project);
  const workDir = path.resolve('videos', project.id);
  await fsp.mkdir(workDir, { recursive: true });

  const metadata = {
    schemaVersion: 3,
    composition: {
      fps: tl.fps || 30,
      width: project.canvas?.width || 1080,
      height: project.canvas?.height || 1920,
      durationSeconds: Number((tl.durationSec || 15).toFixed(2)),
      layout: 'portrait',
      themeId: 'noir',
    },
    cardsCount: project.overlays?.length || 0,
  };

  await fsp.writeFile(path.join(workDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');

  const html = generateHyperFramesHtml(project, { relativeVideo: true });
  await fsp.writeFile(path.join(workDir, 'index.html'), html, 'utf8');

  // Copy first source video as input-video.mp4 if present
  if (project.sources?.[0]?.id) {
    const srcPath = store.paths.media(ownerId, project.sources[0].id);
    const destPath = path.join(workDir, 'input-video.mp4');
    if (fs.existsSync(srcPath)) {
      await fsp.copyFile(srcPath, destPath).catch(() => {});
    }
  }

  return {
    workDir,
    indexPath: path.join(workDir, 'index.html'),
    metadataPath: path.join(workDir, 'metadata.json'),
    html,
  };
}
