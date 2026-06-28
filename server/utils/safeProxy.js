import dns from 'dns/promises';
import net from 'net';

const DEFAULT_ALLOWED_HOSTS = [
    'storage.googleapis.com',
    'googleusercontent.com',
    'supabase.co',
    'supabase.in',
    'r2.dev',
    'r2.cloudflarestorage.com',
    'cloudflarestorage.com'
];

// Add custom CDN host if configured
if (process.env.GCS_CDN_BASE_URL) {
    try {
        const cdnHost = new URL(process.env.GCS_CDN_BASE_URL).hostname;
        if (cdnHost && !DEFAULT_ALLOWED_HOSTS.includes(cdnHost)) {
            DEFAULT_ALLOWED_HOSTS.push(cdnHost);
        }
    } catch (_) {}
}

const MAX_REDIRECTS = 3;
const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;

const getAllowedHosts = () => {
    const configured = (process.env.PROXY_ALLOWED_HOSTS || '')
        .split(',')
        .map(host => host.trim().toLowerCase())
        .filter(Boolean);
    return configured.length ? configured : DEFAULT_ALLOWED_HOSTS;
};

const isAllowedHost = (hostname) => {
    const host = hostname.toLowerCase();
    return getAllowedHosts().some(allowed => {
        if (allowed === '*') return process.env.NODE_ENV !== 'production';
        if (allowed.startsWith('*.')) return host.endsWith(allowed.slice(1));
        return host === allowed || host.endsWith(`.${allowed}`);
    });
};

const isPrivateIp = (address) => {
    const version = net.isIP(address);
    if (version === 4) {
        const [a, b] = address.split('.').map(Number);
        return (
            a === 10 ||
            a === 127 ||
            (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) ||
            address === '0.0.0.0'
        );
    }
    if (version === 6) {
        const normalized = address.toLowerCase();
        return (
            normalized === '::1' ||
            normalized === '::' ||
            normalized.startsWith('fc') ||
            normalized.startsWith('fd') ||
            normalized.startsWith('fe80')
        );
    }
    return true;
};

export const validateProxyUrl = async (rawUrl) => {
    let parsed;
    try {
        parsed = new URL(rawUrl);
    } catch {
        const err = new Error('Invalid URL');
        err.status = 400;
        throw err;
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        const err = new Error('Only http and https URLs are allowed');
        err.status = 400;
        throw err;
    }

    if (!isAllowedHost(parsed.hostname)) {
        const err = new Error('Proxy target is not allowed');
        err.status = 403;
        throw err;
    }

    const addresses = await dns.lookup(parsed.hostname, { all: true });
    if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) {
        const err = new Error('Proxy target resolved to a blocked network address');
        err.status = 403;
        throw err;
    }

    return parsed;
};

export const fetchAllowedProxyResource = async (rawUrl, options = {}) => {
    const maxBytes = options.maxBytes || DEFAULT_MAX_BYTES;
    let currentUrl = rawUrl;

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
        const parsed = await validateProxyUrl(currentUrl);
        const response = await fetch(parsed.toString(), { redirect: 'manual' });

        if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
            currentUrl = new URL(response.headers.get('location'), parsed).toString();
            continue;
        }

        if (!response.ok) {
            const err = new Error(`Failed to fetch remote resource: ${response.statusText}`);
            err.status = response.status;
            throw err;
        }

        const contentLength = Number(response.headers.get('content-length') || 0);
        if (contentLength > maxBytes) {
            const err = new Error('Remote resource is too large');
            err.status = 413;
            throw err;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > maxBytes) {
            const err = new Error('Remote resource is too large');
            err.status = 413;
            throw err;
        }

        return {
            buffer,
            contentType: response.headers.get('content-type') || 'application/octet-stream'
        };
    }

    const err = new Error('Too many redirects');
    err.status = 400;
    throw err;
};
