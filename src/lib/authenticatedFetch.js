/** Add app sessions only to configured first-party API requests. */
export function isTrustedApiRequest(input, origin, apiBaseUrl = '') {
  try {
    const raw = typeof input === 'string' || input instanceof URL ? String(input) : input?.url;
    const url = new URL(raw, origin);
    if (url.username || url.password || !(url.pathname === '/api' || url.pathname.startsWith('/api/'))) return false;
    const allowed = new Set([new URL(origin).origin]);
    if (apiBaseUrl) {
      const api = new URL(apiBaseUrl, origin);
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname);
      if (!api.username && !api.password && (api.protocol === 'https:' || (local && api.protocol === 'http:'))) allowed.add(api.origin);
    }
    return ['https:', 'http:'].includes(url.protocol) && allowed.has(url.origin);
  } catch { return false; }
}

export function createAuthenticatedFetch({ fetch: originalFetch, getSession, origin, apiBaseUrl = '' }) {
  return async (input, init = {}) => {
    if (!isTrustedApiRequest(input, origin, apiBaseUrl)) return originalFetch(input, init);
    const headers = new Headers(init.headers ?? input?.headers);
    if (headers.has('authorization')) return originalFetch(input, init);
    let session;
    try { ({ data: { session } = {} } = await getSession()); } catch { /* send without credentials; server rejects protected calls */ }
    if (!session?.access_token) return originalFetch(input, init);
    headers.set('Authorization', `Bearer ${session.access_token}`);
    return originalFetch(input, { ...init, headers });
  };
}
