/**
 * 🎨 ZeroLens Embedded UI Widget for ChatGPT Canvas & MCP Clients
 * Lightweight, responsive, modern dark-mode component.
 */

export function renderWidgetHtml({
  generationId = '',
  type = 'image', // 'image' | 'video'
  status = 'completed', // 'queued' | 'processing' | 'completed' | 'failed'
  progress = null,
  resultUrl = '',
  thumbnailUrl = '',
  prompt = '',
  model = 'ZeroLens AI',
  error = null,
  appBaseUrl = process.env.PUBLIC_APP_URL || 'https://zerolens.in'
}) {
  const isVideo = type === 'video' || (resultUrl && /\.(mp4|webm|mov)(\?|$)/i.test(resultUrl));
  const isCompleted = status === 'completed' && Boolean(resultUrl);
  const isProcessing = status === 'processing' || status === 'queued';
  const isFailed = status === 'failed' || Boolean(error);

  let statusBadgeColor = '#3b82f6';
  let statusText = 'Processing';
  if (isCompleted) {
    statusBadgeColor = '#10b981';
    statusText = 'Completed';
  } else if (isFailed) {
    statusBadgeColor = '#ef4444';
    statusText = 'Failed';
  } else if (status === 'queued') {
    statusBadgeColor = '#f59e0b';
    statusText = 'Queued';
  }

  const studioUrl = `${appBaseUrl}/studio?assetId=${encodeURIComponent(generationId)}&type=${type}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZeroLens Studio Preview</title>
  <style>
    :root {
      --bg: #090a10;
      --card-bg: rgba(18, 22, 34, 0.95);
      --border: rgba(255, 255, 255, 0.1);
      --accent: #f59e0b;
      --text: #f9fafb;
      --text-muted: #9ca3af;
      --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: transparent;
      color: var(--text);
      font-family: var(--font);
      display: flex;
      justify-content: center;
      padding: 12px;
    }
    .widget-container {
      width: 100%;
      max-width: 540px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(16px);
      transition: all 0.3s ease;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .brand-logo {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #000;
      font-size: 11px;
      font-weight: 900;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #fff;
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: ${statusBadgeColor};
      box-shadow: 0 0 8px ${statusBadgeColor};
      ${isProcessing ? 'animation: pulse 1.5s infinite;' : ''}
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .media-area {
      position: relative;
      background: #000;
      min-height: 240px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .media-content {
      width: 100%;
      max-height: 380px;
      object-fit: contain;
      display: block;
    }
    .placeholder-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      gap: 12px;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(245, 158, 11, 0.2);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .progress-bar-wrap {
      width: 180px;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 8px;
    }
    .progress-bar-fill {
      height: 100%;
      background: var(--accent);
      width: ${progress ? Math.min(Math.round(progress * 100), 100) : (status === 'queued' ? 20 : 65)}%;
      transition: width 0.3s ease;
    }
    .details {
      padding: 14px 16px;
    }
    .prompt-text {
      font-size: 13px;
      color: #e5e7eb;
      line-height: 1.45;
      margin-bottom: 10px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-muted);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 10px;
    }
    .actions {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.2);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    .btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 9px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid transparent;
    }
    .btn-primary {
      background: var(--accent);
      color: #000;
    }
    .btn-primary:hover {
      background: #fbbf24;
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  </style>
</head>
<body>
  <div class="widget-container">
    <div class="header">
      <div class="brand">
        <div class="brand-logo">ZL</div>
        <span>ZeroLens ${type === 'video' ? 'Cinema' : 'Studio'}</span>
      </div>
      <div class="status-badge">
        <span class="status-dot"></span>
        <span>${statusText}</span>
      </div>
    </div>

    <div class="media-area">
      ${isCompleted ? (
        isVideo ? `
          <video class="media-content" src="${resultUrl}" poster="${thumbnailUrl || ''}" controls autoplay loop playsinline></video>
        ` : `
          <img class="media-content" src="${resultUrl}" alt="${prompt || 'ZeroLens AI Generated Image'}" loading="lazy" />
        `
      ) : isFailed ? `
        <div class="placeholder-state">
          <div style="font-size: 32px; color: #ef4444;">⚠️</div>
          <div style="font-size: 13px; color: #fca5a5;">Generation Failed</div>
          <div style="font-size: 11px; color: var(--text-muted); max-width: 280px;">${error || 'An error occurred during rendering.'}</div>
        </div>
      ` : `
        <div class="placeholder-state">
          <div class="spinner"></div>
          <div style="font-size: 13px; font-weight: 600;">Generating ${isVideo ? 'Video' : 'Image'}...</div>
          <div style="font-size: 11px; color: var(--text-muted);">${status === 'queued' ? 'Waiting in generation queue' : 'Rendering high-fidelity frames'}</div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill"></div>
          </div>
        </div>
      `}
    </div>

    <div class="details">
      ${prompt ? `<div class="prompt-text">"${prompt}"</div>` : ''}
      <div class="meta-row">
        <span>Model: <strong>${model}</strong></span>
        ${generationId ? `<span>ID: <code style="color:#f59e0b;">${generationId.slice(0, 16)}...</code></span>` : ''}
      </div>
    </div>

    <div class="actions">
      <a href="${studioUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
        <span>⚡ Open in ZeroLens</span>
      </a>
      ${isCompleted ? `
        <a href="${resultUrl}" target="_blank" download class="btn btn-secondary">
          <span>⬇ Download</span>
        </a>
      ` : ''}
    </div>
  </div>
</body>
</html>`;
}
