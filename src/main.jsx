import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Auto-reload on stale Vite dynamic import chunk load failures (common after new production deployments)
window.addEventListener('vite:preload-error', (event) => {
  console.warn('[Vite Preload Error] Stale chunk detected, refreshing page...');
  window.location.reload();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
