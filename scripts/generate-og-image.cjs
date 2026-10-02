const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function generateOgImage() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2 // High DPI 2x render for crystal sharpness
  });

  // Convert images to base64 data URIs for seamless, 100% reliable rendering
  const bannerPath = path.resolve(__dirname, '../public/pricing/season-discount-banner.jpg');
  const bannerBase64 = fs.existsSync(bannerPath)
    ? `data:image/jpeg;base64,${fs.readFileSync(bannerPath).toString('base64')}`
    : '';

  const iconPath = path.resolve(__dirname, '../public/zerolens-icon-512.png');
  const iconBase64 = fs.existsSync(iconPath)
    ? `data:image/png;base64,${fs.readFileSync(iconPath).toString('base64')}`
    : '';

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;0,800;0,900;1,900&family=Space+Grotesk:wght@600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 1200px;
      height: 630px;
      overflow: hidden;
      background: radial-gradient(circle at 20% 20%, #0d1607 0%, #050705 50%, #020302 100%);
      color: #ffffff;
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      position: relative;
      display: flex;
    }

    /* Ambient Lighting */
    .bg-glow-lime {
      position: absolute;
      top: -80px;
      left: 100px;
      width: 550px;
      height: 480px;
      background: radial-gradient(circle, rgba(212, 255, 0, 0.28) 0%, rgba(212, 255, 0, 0.06) 50%, transparent 70%);
      filter: blur(80px);
      pointer-events: none;
    }
    .bg-glow-cyan {
      position: absolute;
      bottom: -100px;
      right: 120px;
      width: 600px;
      height: 450px;
      background: radial-gradient(circle, rgba(0, 240, 255, 0.18) 0%, rgba(16, 185, 129, 0.08) 50%, transparent 70%);
      filter: blur(90px);
      pointer-events: none;
    }
    .grid-lines {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px);
      background-size: 44px 44px;
      pointer-events: none;
    }

    /* Outer Border Frame */
    .frame-border {
      position: absolute;
      inset: 16px;
      border: 1px solid rgba(212, 255, 0, 0.28);
      border-radius: 24px;
      pointer-events: none;
      box-shadow: inset 0 0 60px rgba(0,0,0,0.85), 0 0 40px rgba(212, 255, 0, 0.12);
      z-index: 20;
    }
    .frame-corner {
      position: absolute;
      width: 26px;
      height: 26px;
      border-color: #D4FF00;
      border-style: solid;
      pointer-events: none;
      z-index: 25;
    }
    .frame-tl { top: 22px; left: 22px; border-width: 3.5px 0 0 3.5px; }
    .frame-tr { top: 22px; right: 22px; border-width: 3.5px 3.5px 0 0; }
    .frame-bl { bottom: 22px; left: 22px; border-width: 0 0 3.5px 3.5px; }
    .frame-br { bottom: 22px; right: 22px; border-width: 0 3.5px 3.5px 0; }

    /* Layout */
    .container {
      position: relative;
      z-index: 10;
      width: 100%;
      height: 100%;
      padding: 40px 50px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 36px;
    }

    .left-col {
      width: 630px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
    }

    /* Top Badges */
    .top-badge-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .badge-primary {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: linear-gradient(135deg, rgba(212, 255, 0, 0.22), rgba(212, 255, 0, 0.08));
      border: 1.5px solid #D4FF00;
      color: #D4FF00;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12.5px;
      font-weight: 900;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      box-shadow: 0 0 20px rgba(212, 255, 0, 0.35);
    }
    .badge-secondary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.16);
      color: #ffffff;
      padding: 6px 13px;
      border-radius: 9999px;
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }

    /* Brand Logo Lockup */
    .logo-lockup {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 14px;
    }
    .logo-icon {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      box-shadow: 0 0 30px rgba(212, 255, 0, 0.45);
      border: 2px solid rgba(212, 255, 0, 0.5);
    }
    .brand-title-wrap {
      display: flex;
      flex-direction: column;
    }
    .brand-name {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 48px;
      font-weight: 900;
      line-height: 1;
      letter-spacing: -1.5px;
    }
    .brand-name .white { color: #ffffff; }
    .brand-name .lime {
      color: #D4FF00;
      text-shadow: 0 0 30px rgba(212, 255, 0, 0.65);
    }
    .brand-subtitle {
      font-family: 'Space Grotesk', monospace;
      font-size: 11px;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.65);
      letter-spacing: 4px;
      text-transform: uppercase;
      margin-top: 4px;
    }

    /* Main Bold Headlines */
    .hero-content {
      margin-top: 10px;
    }
    .main-headline {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 38px;
      font-weight: 900;
      line-height: 1.12;
      letter-spacing: -1.2px;
      text-transform: uppercase;
      color: #ffffff;
    }
    .main-headline .highlight {
      color: #D4FF00;
      text-shadow: 0 0 30px rgba(212, 255, 0, 0.45);
    }
    .hero-desc {
      font-size: 16px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.9);
      margin-top: 10px;
      line-height: 1.4;
    }
    .hero-desc .accent {
      color: #D4FF00;
      font-weight: 900;
    }

    /* Feature Badges Grid */
    .features-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 16px;
    }
    .feature-item {
      display: flex;
      align-items: center;
      gap: 9px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 8px 13px;
      border-radius: 11px;
      font-size: 13px;
      font-weight: 700;
      color: #f1f5f9;
    }
    .feature-item .icon {
      font-size: 15px;
      flex-shrink: 0;
    }
    .feature-item.highlight-pill {
      background: linear-gradient(135deg, rgba(212, 255, 0, 0.12), rgba(212, 255, 0, 0.03));
      border-color: rgba(212, 255, 0, 0.45);
      color: #ffffff;
      box-shadow: 0 0 15px rgba(212, 255, 0, 0.12);
    }
    .feature-item.highlight-pill strong {
      color: #D4FF00;
      font-weight: 900;
    }

    /* Bottom Footer Bar */
    .footer-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      padding-top: 14px;
    }
    .url-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'Space Grotesk', monospace;
      font-size: 16px;
      font-weight: 900;
      color: #D4FF00;
      letter-spacing: 0.5px;
    }
    .dot-rec {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ef4444;
      box-shadow: 0 0 12px #ef4444;
      display: inline-block;
    }
    .footer-sub {
      font-size: 12px;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.7);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* Right Showcase Column */
    .right-col {
      width: 440px;
      height: 100%;
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .card-preview {
      width: 420px;
      height: 510px;
      position: relative;
      border-radius: 22px;
      overflow: hidden;
      border: 2px solid rgba(212, 255, 0, 0.45);
      box-shadow: 
        0 25px 50px -12px rgba(0, 0, 0, 0.95),
        0 0 45px rgba(212, 255, 0, 0.22);
      background: #0d1209;
    }
    .card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: 80% 45%;
      display: block;
    }
    /* Floating Overlays on the Card */
    .overlay-badge-top {
      position: absolute;
      top: 16px;
      left: 16px;
      background: rgba(0, 0, 0, 0.88);
      border: 1px solid rgba(212, 255, 0, 0.6);
      color: #D4FF00;
      padding: 7px 14px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 1px;
      text-transform: uppercase;
      box-shadow: 0 4px 15px rgba(0,0,0,0.6);
    }
    .overlay-badge-bottom {
      position: absolute;
      bottom: 16px;
      left: 16px;
      right: 16px;
      background: linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.96) 100%);
      border: 1.5px solid rgba(212, 255, 0, 0.35);
      padding: 12px 16px;
      border-radius: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .stat-box {
      display: flex;
      flex-direction: column;
    }
    .stat-val {
      font-size: 20px;
      font-weight: 900;
      color: #ffffff;
      line-height: 1;
      font-family: 'Space Grotesk', sans-serif;
    }
    .stat-val .lime {
      color: #D4FF00;
      text-shadow: 0 0 15px rgba(212, 255, 0, 0.5);
    }
    .stat-lbl {
      font-size: 10px;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.7);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 4px;
    }
    .cta-pill {
      background: #D4FF00;
      color: #000000;
      font-size: 11.5px;
      font-weight: 900;
      padding: 8px 16px;
      border-radius: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 0 20px rgba(212, 255, 0, 0.5);
    }
  </style>
</head>
<body>
  <div class="bg-glow-lime"></div>
  <div class="bg-glow-cyan"></div>
  <div class="grid-lines"></div>

  <!-- Decorative Frame Borders -->
  <div class="frame-border"></div>
  <div class="frame-corner frame-tl"></div>
  <div class="frame-corner frame-tr"></div>
  <div class="frame-corner frame-bl"></div>
  <div class="frame-corner frame-br"></div>

  <div class="container">
    <!-- Left Column: Bold Typography & Details -->
    <div class="left-col">
      <!-- Top Pills -->
      <div>
        <div class="top-badge-row">
          <div class="badge-primary">
            <span>⚡</span>
            <span>INDIA'S 1ST & ONLY AI VIDEO APP</span>
          </div>
          <div class="badge-secondary">
            <span>🎬</span>
            <span>CINEMA & UGC</span>
          </div>
        </div>

        <!-- Logo Lockup -->
        <div class="logo-lockup">
          ${iconBase64 ? `<img src="${iconBase64}" class="logo-icon" alt="ZeroLens Logo" />` : ''}
          <div class="brand-title-wrap">
            <div class="brand-name">
              <span class="white">Zero</span><span class="lime">Lens</span>
            </div>
            <div class="brand-subtitle">AI VIDEO STUDIO · ZEROLENS.IN</div>
          </div>
        </div>
      </div>

      <!-- Main Bold Headlines -->
      <div class="hero-content">
        <h1 class="main-headline">
          YOUR ALL-IN-ONE<br>
          <span class="highlight">AI CINEMA & UGC STUDIO</span>
        </h1>
        <p class="hero-desc">
          Drop a product. Drop a face. Get viral video ads & cinema scenes in <span class="accent">60 seconds</span>.
        </p>

        <!-- Features Badges Grid -->
        <div class="features-list">
          <div class="feature-item highlight-pill">
            <span class="icon">📱</span>
            <span><strong>Viral UGC Video Ads</strong> (10s)</span>
          </div>
          <div class="feature-item highlight-pill">
            <span class="icon">🎬</span>
            <span><strong>Cinema & Film Director</strong></span>
          </div>
          <div class="feature-item">
            <span class="icon">🔄</span>
            <span><strong>Remix & Object Swap</strong></span>
          </div>
          <div class="feature-item">
            <span class="icon">📸</span>
            <span><strong>Nano Banana</strong> 4K Images</span>
          </div>
          <div class="feature-item">
            <span class="icon">✨</span>
            <span><strong>No Actors • No Camera</strong></span>
          </div>
          <div class="feature-item">
            <span class="icon">⚡</span>
            <span><strong>Instant Video Renders</strong></span>
          </div>
        </div>
      </div>

      <!-- Footer Bar -->
      <div class="footer-bar">
        <div class="url-chip">
          <span class="dot-rec"></span>
          <span>zerolens.in</span>
        </div>
        <div class="footer-sub">
          ⚡ 100% Cloud AI · Made for Creators & Brands
        </div>
      </div>
    </div>

    <!-- Right Column: Visual Showcase -->
    <div class="right-col">
      <div class="card-preview">
        ${bannerBase64 ? `<img src="${bannerBase64}" class="card-img" alt="UGC Studio Demo" />` : ''}
        <div class="overlay-badge-top">
          ✨ 4K AI UGC AD DEMO
        </div>
        <div class="overlay-badge-bottom">
          <div class="stat-box">
            <span class="stat-val"><span class="lime">₹30</span> / Ad</span>
            <span class="stat-lbl">99% Cheaper Than Shoots</span>
          </div>
          <div class="cta-pill">
            Try Now →
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  // Wait a moment for web fonts to fully render
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 600));

  const outputPath = path.resolve(__dirname, '../public/og-image.jpg');
  await page.screenshot({
    path: outputPath,
    type: 'jpeg',
    quality: 94
  });

  console.log(`[SUCCESS] New high-res og-image.jpg saved to: ${outputPath}`);
  await browser.close();
}

generateOgImage().catch(err => {
  console.error('[ERROR] Failed to generate og-image:', err);
  process.exit(1);
});
