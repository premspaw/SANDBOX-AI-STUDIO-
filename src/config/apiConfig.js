/**
 * API Configuration
 * Centralizes the backend URL for production and development.
 */

// Isomorphic check for Environment Variables
const getEnvVar = (key) => {
    // Check Vite/Browser environment
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
        return import.meta.env[key];
    }
    // Check Node.js environment
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
    }
    return null;
};

const VITE_API_URL = getEnvVar('VITE_API_URL') || 'http://localhost:3002';

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
    const ws_env = getEnvVar('VITE_WS_URL');
    if (ws_env) return ws_env;
    const base = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
    return base;
};
