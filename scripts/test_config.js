
import { getApiUrl, getWsUrl, API_BASE_URL } from './src/config/apiConfig.js';

console.log('API_BASE_URL:', API_BASE_URL);
console.log('Health check URL:', getApiUrl('/api/forge/health'));
console.log('WS URL:', getWsUrl());
