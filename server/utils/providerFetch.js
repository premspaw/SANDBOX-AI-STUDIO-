// Never infer credential destinations from substrings of a user-controlled URL.
const GOOGLE_KEY_HOSTS = new Set([
  'generativelanguage.googleapis.com', 'aiplatform.googleapis.com',
  'texttospeech.googleapis.com', 'speech.googleapis.com', 'vision.googleapis.com',
  'docs.googleapis.com'
]);
export function isGoogleKeyDestination(input) {
  try {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') &&
      (GOOGLE_KEY_HOSTS.has(url.hostname) || /^[a-z0-9]+(?:-[a-z0-9]+)*-aiplatform\.googleapis\.com$/.test(url.hostname));
  } catch { return false; }
}
export function createGoogleProviderFetch(originalFetch, { apiKey, appOrigin }) {
  return (input, options = {}) => {
    if (!isGoogleKeyDestination(input)) return originalFetch(input, options);
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const headers = new Headers(options.headers ?? input?.headers);
    headers.set('Referer', `${appOrigin.replace(/\/$/, '')}/`);
    if (!headers.has('authorization') && !headers.has('x-goog-api-key') && !url.searchParams.has('key') && apiKey) {
      headers.set('X-Goog-Api-Key', apiKey.trim());
    }
    // No cross-origin redirects carrying API-key headers. Provider API URLs are final endpoints.
    return originalFetch(input, { ...options, headers, redirect: 'error' });
  };
}
