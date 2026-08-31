/**
 * API Configuration
 * Centralizes the backend URL for production and development.
 */

// Determine if we're in a development environment
const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;

// Safe environment variable retrieval
const VITE_API_URL =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL) ||
    (isDev ? 'http://127.0.0.1:3002' : '');

const VITE_WS_URL =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.VITE_WS_URL) ||
    (isDev ? 'ws://127.0.0.1:3002' : '');

// Ensure base URL doesn't have a trailing slash
export const API_BASE_URL = VITE_API_URL ? (VITE_API_URL.endsWith('/') ? VITE_API_URL.slice(0, -1) : VITE_API_URL) : '';

// Alias for API_BASE
export const API_BASE = API_BASE_URL;

/**
 * Helper to ensure URLs don't have double slashes
 * @param {string} endpoint - The API endpoint path
 * @returns {string} - The full API URL
 */
export const getApiUrl = (endpoint) => {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${API_BASE_URL}${path}`;
};

/**
 * Helper to get the WebSocket URL
 * @returns {string} - The full WebSocket URL
 */
export const getWsUrl = () => {
    if (VITE_WS_URL) return VITE_WS_URL;
    if (!API_BASE_URL) {
        // If relative URL, build WS from current window location
        if (typeof window !== 'undefined') {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            return `${protocol}//${window.location.host}`;
        }
        return '';
    }
    const base = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
    return base;
};

/**
 * Resolves a URL to its correct form (handles base64, remote, and relative paths)
 * @param {string} url - The URL or base64 string
 * @returns {string} - The resolved URL
 */
export const resolveUrl = (url) => {
    if (!url) return '';
    if (typeof url !== 'string') return url;
    
    // 1. Identify video for proxying
    const isVideo = url.toLowerCase().split('?')[0].endsWith('.mp4') || 
                    url.toLowerCase().split('?')[0].endsWith('.webm') ||
                    url.toLowerCase().split('?')[0].endsWith('.mov');

    // ✅ FIX: Route ALL external video URLs through the backend proxy.
    // This prevents ERR_CACHE_OPERATION_NOT_SUPPORTED in Chrome for GCS/Supabase
    if (isVideo && url.startsWith('http') && !url.includes('localhost') && !url.includes('/api/proxy-image')) {
        return getApiUrl(`/api/proxy-image?url=${encodeURIComponent(url)}&cors=1`);
    }

    // ✅ FIX: Route R2 image URLs through proxy to avoid CORS header issues
    const isR2 = url.includes('r2.dev') || url.includes('r2.cloudflarestorage.com');
    if (isR2 && !url.includes('/api/proxy-image')) {
        return getApiUrl(`/api/proxy-image?url=${encodeURIComponent(url)}&cors=1`);
    }

    // 2. Already fully qualified or data/blob
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:'))
        return url;
        
    // 3. Detect and prefix raw base64 image strings
    // Patterns: 
    // - /9j/ -> JPEG
    // - iVBORw0KGgo -> PNG
    // - R0lGOD -> GIF
    // - UklGR -> WebP
    const isLikelyBase64 = 
        url.startsWith('/9j/') || 
        url.startsWith('9j/') ||
        url.startsWith('iVBORw0KGgo') ||
        url.startsWith('R0lGOD') || 
        url.startsWith('UklGR') ||
        (url.length > 2000 && !url.includes(' ') && !url.includes('-'));

    if (isLikelyBase64) {
        if (url.startsWith('/9j/') || url.startsWith('9j/')) {
            const cleanUrl = url.startsWith('/') ? url : '/' + url;
            return `data:image/jpeg;base64,${cleanUrl}`;
        }
        if (url.startsWith('iVBORw0KGgo')) return `data:image/png;base64,${url}`;
        if (url.startsWith('R0lGOD')) return `data:image/gif;base64,${url}`;
        if (url.startsWith('UklGR')) return `data:image/webp;base64,${url}`;
        
        // Generic fallback for long strings
        return `data:image/jpeg;base64,${url}`;
    }
    
    // 4. Relative paths
    const path = url.startsWith('/') ? url : '/' + url;
    return `${API_BASE_URL}${path}`;
};
