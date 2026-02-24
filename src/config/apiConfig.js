/**
 * API Configuration
 * Centralizes the backend URL for production and development.
 */

// Safe environment variable retrieval
const VITE_API_URL =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL) ||
    'http://localhost:3002';

const VITE_WS_URL =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.VITE_WS_URL) ||
    null;

// Ensure base URL doesn't have a trailing slash
export const API_BASE_URL = VITE_API_URL.endsWith('/') ? VITE_API_URL.slice(0, -1) : VITE_API_URL;

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
    const base = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
    return base;
};
