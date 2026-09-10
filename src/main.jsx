import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Auto-reload on stale Vite dynamic import chunk load failures (common after new production deployments)
window.addEventListener('vite:preload-error', (event) => {
  console.warn('[Vite Preload Error] Stale chunk detected, refreshing page...');
  window.location.reload();
});

// Suppress unhandled rejections/errors caused by third-party browser extensions (e.g., Urban VPN's 200.js 'M_ID' bug)
window.addEventListener('unhandledrejection', (event) => {
  const msg = event?.reason?.message || '';
  const stack = event?.reason?.stack || '';
  if (msg.includes("reading 'M_ID'") || stack.includes('200.js') || stack.includes('chrome-extension://')) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  const msg = event?.message || '';
  const filename = event?.filename || '';
  if (msg.includes("reading 'M_ID'") || filename.includes('200.js') || filename.includes('chrome-extension://')) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
