import { Transform } from 'node:stream';
import dns from 'node:dns/promises';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';

const DEFAULT_ALLOWED_HOSTS = ['zerolens.in', 'cdn.zerolens.in', 'storage.googleapis.com', 'googleusercontent.com', 'supabase.co', 'supabase.in', 'r2.dev', 'r2.cloudflarestorage.com', 'cloudflarestorage.com'];
const MAX_REDIRECTS = 3;
const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;
const badIpv4 = new net.BlockList();
for (const [network, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]]) badIpv4.addSubnet(network, prefix, 'ipv4');
const publicIpv6 = new net.BlockList();
publicIpv6.addSubnet('2000::', 3, 'ipv6');
const badIpv6 = new net.BlockList();
for (const [network,prefix] of [['2001:db8::',32],['2001::',32],['2002::',16]]) badIpv6.addSubnet(network,prefix,'ipv6');
const fail = (message, status = 403) => Object.assign(new Error(message), { status });
export function isPrivateIp(address) {
    const family = net.isIP(address);
    if (family === 4) return badIpv4.check(address, 'ipv4');
    if (family === 6) return !publicIpv6.check(address, 'ipv6') || badIpv6.check(address, 'ipv6');
    return true;
}
const getAllowedHosts = () => {
    const hosts = [...DEFAULT_ALLOWED_HOSTS, ...(process.env.PROXY_ALLOWED_HOSTS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean)];
    if (process.env.GCS_CDN_BASE_URL) {
        try { hosts.push(new URL(process.env.GCS_CDN_BASE_URL).hostname); } catch { /* Invalid configuration is not an allow rule. */ }
    }
    return hosts;
};
async function resolveProxyTarget(rawUrl, lookup = dns.lookup) {
    let parsed;
    try { parsed = new URL(rawUrl); } catch { throw fail('Invalid URL', 400); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || (parsed.port && !['80','443'].includes(parsed.port))) throw fail('Unsupported proxy URL', 400);
    const host = parsed.hostname.toLowerCase();
    if (!getAllowedHosts().some(allowed => allowed !== '*' && (allowed.startsWith('*.') ? host.endsWith(allowed.slice(1)) : host === allowed || host.endsWith(`.${allowed}`)))) throw fail('Proxy target is not allowed');
    let addresses;
    try { addresses = await lookup(host, { all: true }); } catch { throw fail('Proxy target could not be resolved', 502); }
    if (!addresses?.length || addresses.some(({address}) => isPrivateIp(address))) throw fail('Proxy target resolved to a blocked network address');
    return { parsed, addresses };
}
export const validateProxyUrl = async (rawUrl, options = {}) => (await resolveProxyTarget(rawUrl, options.lookup)).parsed;

export async function fetchAllowedProxyResponse(rawUrl, options = {}) {
    let currentUrl = rawUrl;
    const fetchImpl = options.fetchImpl || globalThis.fetch;
    const timeout = AbortSignal.timeout(options.timeoutMs || 30000);
    const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
        const { parsed, addresses } = await resolveProxyTarget(currentUrl, options.lookup);
        // node-fetch uses this agent; the approved addresses are pinned through connection.
        const Agent = parsed.protocol === 'https:' ? https.Agent : http.Agent;
        const agent = new Agent({ lookup(_host, opts, callback) {
            if (opts?.all) return callback(null, addresses);
            const chosen = addresses.find(a => !opts?.family || a.family === opts.family) || addresses[0];
            callback(null, chosen.address, chosen.family);
        } });
        const response = await fetchImpl(parsed.toString(), { headers: options.headers, redirect: 'manual', signal, agent });
        if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
            response.body?.destroy?.();
            await response.body?.cancel?.();
            currentUrl = new URL(response.headers.get('location'), parsed).toString();
            continue;
        }
        if (!response.ok) {
            response.body?.destroy?.();
            throw fail('Remote media request failed', response.status);
        }
        if (Number(response.headers.get('content-length') || 0) > (options.maxBytes || DEFAULT_MAX_BYTES)) {
            response.body?.destroy?.();
            await response.body?.cancel?.();
            throw fail('Remote resource is too large', 413);
        }
        return response;
    }
    throw fail('Too many redirects', 400);
}
export async function readProxyBody(response, maxBytes = DEFAULT_MAX_BYTES) {
    const chunks = [];
    let size = 0;
    if (!response.body) return Buffer.alloc(0);
    for await (const chunk of response.body) {
        const bytes = Buffer.from(chunk);
        size += bytes.length;
        if (size > maxBytes) {
            response.body?.destroy?.();
            throw fail('Remote resource is too large', 413);
        }
        chunks.push(bytes);
    }
    return Buffer.concat(chunks, size);
}
export async function fetchAllowedProxyResource(rawUrl, options = {}) {
    const response = await fetchAllowedProxyResponse(rawUrl, options);
    const buffer = await readProxyBody(response, options.maxBytes || DEFAULT_MAX_BYTES);
    return { buffer, contentType: response.headers.get('content-type') || 'application/octet-stream' };
}

export function createProxyByteLimit(maxBytes = DEFAULT_MAX_BYTES) {
    let size = 0;
    return new Transform({ transform(chunk, encoding, callback) {
        size += chunk.length;
        if (size > maxBytes) return callback(fail('Remote resource is too large', 413));
        callback(null, chunk);
    } });
}
