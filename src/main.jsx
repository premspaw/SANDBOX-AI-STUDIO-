import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Auto-reload on stale Vite dynamic import chunk load failures (common after new production deployments)
window.addEventListener('vite:preload-error', (event) => {
  console.warn('[Vite Preload Error] Stale chunk detected, refreshing page...');
  window.location.reload();
});

// Suppress unhandled rejections/errors caused by third-party browser extensions (e.g., Chrome extension messaging, Urban VPN's 200.js 'M_ID' bug, Console Ninja reportAllChanges startTime bug)
window.addEventListener('unhandledrejection', (event) => {
  const msg = event?.reason?.message || (typeof event?.reason === 'string' ? event.reason : '') || '';
  const stack = event?.reason?.stack || '';
  if (
    msg.includes("Could not establish connection") ||
    msg.includes("Receiving end does not exist") ||
    msg.includes("reading 'M_ID'") || 
    msg.includes("reading 'startTime'") ||
    stack.includes('200.js') || 
    stack.includes('reportAllChanges') ||
    stack.includes('chrome-extension://')
  ) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  const msg = event?.message || '';
  const filename = event?.filename || '';
  const stack = event?.error?.stack || '';
  if (
    msg.includes("Could not establish connection") ||
    msg.includes("Receiving end does not exist") ||
    msg.includes("reading 'M_ID'") || 
    msg.includes("reading 'startTime'") ||
    filename.includes('200.js') || 
    filename.includes('chrome-extension://') ||
    stack.includes('reportAllChanges')
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
