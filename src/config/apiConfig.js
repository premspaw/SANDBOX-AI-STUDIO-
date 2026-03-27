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
    (isDev ? 'http://localhost:3002' : '');

const VITE_WS_URL =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.VITE_WS_URL) ||
    (isDev ? 'ws://localhost:3002' : '');

// Ensure base URL doesn't have a trailing slash
export const API_BASE_URL = VITE_API_URL ? (VITE_API_URL.endsWith('/') ? VITE_API_URL.slice(0, -1) : VITE_API_URL) : '';

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
    
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:'))
        return url;
        
    // Handle raw base64 strings that might have been saved without prefix
    if (url.startsWith('/9j/') || (url.length > 1000 && !url.includes('/'))) {
        return `data:image/jpeg;base64,${url.startsWith('/') ? url.substring(1) : url}`;
    }
    
    const path = url.startsWith('/') ? url : '/' + url;
    return `${API_BASE_URL}${path}`;
};
