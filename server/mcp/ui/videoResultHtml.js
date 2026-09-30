/**
 * 🎬 ZeroLens MCP App UI Resource — Video Result Widget
 * Interactive Video Player component inside ChatGPT.
 */
export function getVideoResultHtml(data = {}) {
  const appBaseUrl = process.env.PUBLIC_APP_URL || 'https://zerolens.in';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZeroLens Studio Video</title>
  <style>
    :root {
      --bg: #090a10;
      --card-bg: rgba(18, 22, 34, 0.95);
      --border: rgba(255, 255, 255, 0.12);
      --accent: #f59e0b;
      --accent-glow: rgba(245, 158, 11, 0.3);
      --text: #f9fafb;
      --text-muted: #9ca3af;
      --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: transparent;
      color: var(--text);
      font-family: var(--font);
      display: flex;
      justify-content: center;
      padding: 10px;
      -webkit-font-smoothing: antialiased;
    }
    .widget-card {
      width: 100%;
      max-width: 680px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.7), 0 0 20px var(--accent-glow);
      backdrop-filter: blur(20px);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.02);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .brand-logo {
      width: 24px;
      height: 24px;
      border-radius: 7px;
      background: #f59e0b;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #000;
      font-size: 13px;
      font-weight: 900;
      box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
    }
    .badge {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 3px 9px;
      border-radius: 20px;
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .media-stage {
      position: relative;
      width: 100%;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 280px;
      max-height: 520px;
      overflow: hidden;
    }
    .media-stage video {
      width: 100%;
      height: auto;
      max-height: 520px;
      object-fit: contain;
      display: block;
    }
    .details {
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .prompt-text {
      font-size: 12.5px;
      line-height: 1.5;
      color: #e5e7eb;
      background: rgba(0, 0, 0, 0.3);
      padding: 8px 12px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      font-style: italic;
    }
    .meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 11px;
      color: var(--text-muted);
    }
    .meta-tags {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .meta-tag {
      background: rgba(255, 255, 255, 0.06);
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 600;
      color: #d1d5db;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 18px 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    .btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 9px 14px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 10px;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
      border: none;
    }
    .btn-primary {
      background: #f59e0b;
      color: #000;
      box-shadow: 0 0 15px rgba(245, 158, 11, 0.3);
    }
    .btn-primary:hover {
      background: #fbbf24;
      transform: translateY(-1px);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: #f3f4f6;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  </style>
</head>
<body>

<div class="widget-card" id="app">
  <div class="header">
    <div class="brand">
      <div class="brand-logo">▶</div>
      <span>ZeroLens Studio Cinema</span>
    </div>
    <span class="badge" id="model-badge">Seedance 2.5</span>
  </div>

  <div class="media-stage">
    <video id="generated-video" src="${data.videoUrl || data.url || ''}" controls autoplay loop playsinline preload="auto"></video>
  </div>

  <div class="details">
    <div class="prompt-text" id="prompt-display">${data.prompt || 'Generated with ZeroLens Cinema Studio'}</div>
    <div class="meta-row">
      <div class="meta-tags">
        <span class="meta-tag" id="aspect-tag">${data.aspectRatio || data.aspect_ratio || '16:9'}</span>
        <span class="meta-tag" id="res-tag">${data.resolution || '720p'}</span>
        <span class="meta-tag" id="duration-tag">${data.duration ? data.duration + 's' : '10s'}</span>
      </div>
      <span id="credits-tag">Shorts Deducted: ${data.credits_used || 50}</span>
    </div>
  </div>

  <div class="actions">
    <a id="btn-open-studio" class="btn btn-primary" href="${appBaseUrl}/cinema" target="_blank">
      Open in Cinema Studio
    </a>
    <a id="btn-download" class="btn btn-secondary" href="${data.videoUrl || data.url || '#'}" target="_blank" download="zerolens_video.mp4">
      Download MP4
    </a>
  </div>
</div>

<script type="module">
  function render(data) {
    if (!data) return;
    const vid = document.getElementById('generated-video');
    const promptEl = document.getElementById('prompt-display');
    const modelBadge = document.getElementById('model-badge');
    const aspectTag = document.getElementById('aspect-tag');
    const resTag = document.getElementById('res-tag');
    const durationTag = document.getElementById('duration-tag');
    const downloadBtn = document.getElementById('btn-download');

    const url = data.videoUrl || data.url || data.video_url;
    if (url && vid) {
      vid.src = url;
      if (downloadBtn) downloadBtn.href = url;
    }
    if (data.prompt && promptEl) promptEl.textContent = data.prompt;
    if (data.engine && modelBadge) modelBadge.textContent = data.engine;
    if ((data.aspectRatio || data.aspect_ratio) && aspectTag) aspectTag.textContent = data.aspectRatio || data.aspect_ratio;
    if (data.resolution && resTag) resTag.textContent = data.resolution;
    if (data.duration && durationTag) durationTag.textContent = data.duration + 's';
  }

  if (window.openai?.toolOutput) {
    render(window.openai.toolOutput);
  }

  window.addEventListener('message', (event) => {
    if (event.data?.toolOutput || event.data?.structuredContent) {
      render(event.data.toolOutput || event.data.structuredContent);
    }
  });
</script>

</body>
</html>`;
}
