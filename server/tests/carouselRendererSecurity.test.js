// Offline regression suite: no provider calls, credentials, or customer data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { generateCarousel, getFonts } from '../../services/carouselGenerator.js';

const sample = () => ({
  brand: { name: 'Example & Co', hook: 'A better way', subhook: 'Build something useful', color: '#6366f1', handle: 'example', ctaHeadline: 'Ready to begin?', ctaBody: 'Start here' },
  slides: [
    { id: 'hero', headline: 'A better way' },
    { id: 'problem', headline: 'The old way', body: 'Too much friction', points: ['Slow', 'Expensive'] },
    { id: 'solution', headline: 'A fresh approach', quote: 'Make it easier', body: 'Try a new approach' },
    { id: 'features', headline: 'What you get', features: [{ title: 'Fast', desc: 'Ready today' }] },
    { id: 'details', headline: 'The details', points: ['One clear message'] },
    { id: 'howto', headline: 'Get started', steps: [{ title: 'Choose', desc: 'Pick your starting point' }] },
  ],
  ctaText: 'Get Started',
});

function stubRenderer(t, options = {}) {
  const state = { closed: false, screenshots: [], evaluations: [] };
  const page = {
    setDefaultTimeout: value => { state.timeout = value; },
    setContent: async (html, opts) => {
      state.html = html; state.contentOptions = opts;
      if (options.failContent) throw new Error('synthetic renderer failure');
    },
    waitForTimeout: async () => {},
    evaluate: async (fn, value) => { state.evaluations.push({ fn, value }); },
    screenshot: async opts => { state.screenshots.push(opts); fs.writeFileSync(opts.path, 'inert png fixture'); },
  };
  const context = {
    route: async (pattern, handler) => { state.pattern = pattern; state.route = handler; },
    newPage: async () => page,
  };
  t.mock.method(chromium, 'launch', async opts => {
    state.launchOptions = opts;
    if (options.failLaunch) throw new Error('synthetic launch failure');
    return {
      newContext: async opts => { state.contextOptions = opts; return context; },
      close: async () => { state.closed = true; },
    };
  });
  return state;
}

function cleanup(t, result) { t.after(() => fs.rmSync(result.tmpDir, { recursive: true, force: true })); }
function tempDirs() { return fs.readdirSync(os.tmpdir()).filter(name => name.startsWith('carousel-')).sort(); }

async function routed(state, url, type = 'image', options = {}) {
  const calls = { fetches: 0, fulfilled: false, aborted: false, disposed: false };
  await state.route({
    request: () => ({ url: () => url, resourceType: () => type, method: () => options.method || 'GET', isNavigationRequest: () => !!options.navigation }),
    fetch: async opts => {
      calls.fetches++; calls.fetchOptions = opts;
      if (options.fetchThrows) throw new Error('synthetic font outage');
      return {
        headers: () => ({ 'content-type': options.contentType || (type === 'stylesheet' ? 'text/css; charset=utf-8' : 'font/woff2') }),
        ok: () => options.ok ?? true,
        dispose: async () => { calls.disposed = true; },
      };
    },
    fulfill: async () => { calls.fulfilled = true; },
    abort: async () => { calls.aborted = true; },
  });
  return calls;
}

test('retains every supported slide and screenshot geometry with isolated browser options', async t => {
  const state = stubRenderer(t);
  const result = await generateCarousel(sample(), 'cinematic'); cleanup(t, result);
  assert.equal(result.outputPaths.length, 7);
  assert.equal((state.html.match(/data-slide-index=/g) || []).length, 7);
  assert.match(state.html, /Example &amp; Co/);
  assert.match(state.html, /Content-Security-Policy/);
  assert.match(state.html, /script-src 'none'/);
  assert.doesNotMatch(state.html, /<script\b/i);
  assert.equal(state.contextOptions.javaScriptEnabled, false);
  assert.equal(state.contextOptions.serviceWorkers, 'block');
  assert.equal(state.contextOptions.acceptDownloads, false);
  assert.deepEqual(state.contextOptions.permissions, []);
  assert.equal(state.pattern, '**/*');
  assert.deepEqual(state.contextOptions.viewport, { width: 420, height: 525 });
  assert.equal(state.contextOptions.deviceScaleFactor, 1080 / 420);
  assert.deepEqual(state.screenshots[0].clip, { x: 0, y: 0, width: 420, height: 525 });
  assert.equal(state.closed, true);
});

test('encodes HTML in every brand, slide, nested field, and CTA before template interpolation', async t => {
  const state = stubRenderer(t);
  const payload = '<b>x</b>&"\'';
  const input = sample();
  for (const key of ['name', 'handle', 'tag', 'hook', 'subhook', 'ctaHeadline', 'ctaBody']) input.brand[key] = payload;
  for (const slide of input.slides) {
    slide.headline = payload; slide.body = payload; slide.quote = payload;
    slide.points = [payload]; slide.features = [{ title: payload, desc: payload }]; slide.steps = [{ title: payload, desc: payload }];
  }
  input.ctaText = payload;
  const result = await generateCarousel(input, '\"><img src="http://127.0.0.1/">'); cleanup(t, result);
  assert.doesNotMatch(state.html, /<b>|<img\b|127\.0\.0\.1/);
  assert.match(state.html, /&lt;b&gt;x&lt;\/b&gt;&amp;&quot;&#39;/);
  assert.match(state.html, /data-art-direction="cinematic"/);
  assert.equal(input.brand.name, payload, 'caller data is not mutated');
});

test('blocks markup/entity, local-file, iframe, meta-refresh, CSS, and script injection', async t => {
  const state = stubRenderer(t);
  const input = sample();
  input.brand.name = '<script>globalThis.pwned=1</script><iframe src="file:///etc/passwd"></iframe><meta http-equiv="refresh" content="0;url=http://169.254.169.254/">';
  input.brand.subhook = '<style>body{background:url(http://127.0.0.1/)}</style><img src=x onerror="globalThis.pwned=1">';
  input.brand.ctaBody = '&#60;script&#62;globalThis.pwned=1&#60;/script&#62;';
  input.brand.color = '#fff; background-image:url(http://127.0.0.1/)';
  const result = await generateCarousel(input); cleanup(t, result);
  assert.doesNotMatch(state.html, /<script\b|<iframe\b|<img\b|<meta http-equiv="refresh"/i);
  assert.match(state.html, /&amp;#60;script/);
  assert.doesNotMatch(state.html, /background-image:url\(http:/);
});

test('does not resolve inherited style or slide renderer properties', async t => {
  const state = stubRenderer(t);
  assert.equal(getFonts('constructor').heading, getFonts('modern').heading);
  assert.equal(getFonts('__proto__', 'constructor').heading, getFonts('modern').heading);
  assert.equal(getFonts({ bad: true }, {}).heading, getFonts('modern').heading);
  const input = sample(); input.slides = [{ id: 'constructor', headline: 'Still a real slide' }];
  const result = await generateCarousel(input, 'constructor'); cleanup(t, result);
  assert.match(state.html, /slide-details/);
  assert.doesNotMatch(state.html, /function Object/);
});

test('rejects malformed or excessive input before starting Chromium', async t => {
  const state = stubRenderer(t);
  const invalid = [null, {}, { brand: [], slides: [] }];
  for (const mutate of [
    data => { data.slides = []; },
    data => { data.slides = Array(21).fill({}); },
    data => { data.slides = [null]; },
    data => { data.brand.name = 'x'.repeat(2001); },
    data => { data.brand.hook = {}; },
    data => { data.slides[0].points = {}; },
    data => { data.slides[0].points = Array(21).fill('x'); },
    data => { data.slides[0].features = [null]; },
    data => { data.slides[0].steps = [{ title: {}, desc: 'x' }]; },
  ]) { const data = sample(); mutate(data); invalid.push(data); }
  for (const data of invalid) await assert.rejects(generateCarousel(data), { status: 400, code: 'INVALID_CAROUSEL' });
  assert.equal(state.launchOptions, undefined);
});

test('denies arbitrary origins, metadata, localhost, credentials, ports, non-HTTPS, scripts, and navigation', async t => {
  const state = stubRenderer(t);
  const result = await generateCarousel(sample()); cleanup(t, result);
  for (const url of [
    'http://127.0.0.1/', 'https://127.0.0.1/', 'http://169.254.169.254/latest/meta-data/',
    'file:///etc/passwd', 'ftp://localhost/', 'https://[::1]/', 'https://example.invalid/pixel',
    'https://fonts.gstatic.com.evil.invalid/s/a/b.woff2', 'https://fonts.gstatic.com:444/s/a/b.woff2',
    'https://user:password@fonts.gstatic.com/s/a/b.woff2', 'https://fonts.gstatic.com/s/a/b.woff2?url=http://localhost',
    'https://fonts.gstatic.com/s/a/b.woff2#fragment', 'https://fonts.gstatic.com/redirect',
    'https://fonts.googleapis.com/css2?family=attacker',
  ]) {
    const calls = await routed(state, url, url.includes('googleapis') ? 'stylesheet' : 'font');
    assert.equal(calls.fetches, 0, url); assert.equal(calls.aborted, true, url);
  }
  for (const options of [{ navigation: true }, { method: 'POST' }]) {
    assert.equal((await routed(state, result.fonts.url, 'stylesheet', options)).fetches, 0);
  }
  assert.equal((await routed(state, result.fonts.url, 'script')).fetches, 0);
});

test('allows fixed Google Fonts only, with redirects disabled and responses disposed', async t => {
  const state = stubRenderer(t);
  const result = await generateCarousel(sample()); cleanup(t, result);
  for (const [url, type] of [[result.fonts.url, 'stylesheet'], ['https://fonts.gstatic.com/s/inter/v12/abc_DEF-123.woff2', 'font']]) {
    const calls = await routed(state, url, type);
    assert.equal(calls.fetches, 1); assert.equal(calls.fulfilled, true); assert.equal(calls.aborted, false);
    assert.equal(calls.fetchOptions.maxRedirects, 0); assert.equal(calls.fetchOptions.timeout, 10000); assert.equal(calls.disposed, true);
  }
  for (const options of [{ ok: false }, { contentType: 'text/html' }, { fetchThrows: true }]) {
    const calls = await routed(state, result.fonts.url, 'stylesheet', options);
    assert.equal(calls.aborted, true); assert.equal(calls.fulfilled, false);
  }
});

for (const failure of ['failLaunch', 'failContent']) {
  test(`cleans its temporary directory after ${failure}`, async t => {
    const state = stubRenderer(t, { [failure]: true });
    const before = tempDirs();
    await assert.rejects(generateCarousel(sample()), /synthetic/);
    assert.deepEqual(tempDirs(), before);
    if (failure === 'failContent') assert.equal(state.closed, true);
  });
}

// Explicit opt-in because installed Chromium is not present on every developer
// machine. Every external font response is fulfilled locally, never fetched.
test('real Chromium keeps text inert and exports distinct 1080x1350 slides offline', {
  skip: !process.env.CAROUSEL_TEST_CHROMIUM,
}, async t => {
  const realLaunch = chromium.launch.bind(chromium);
  let inspected = false;
  let blockedRequests = 0;
  t.mock.method(chromium, 'launch', async opts => {
    const browser = await realLaunch({ ...opts, executablePath: process.env.CAROUSEL_TEST_CHROMIUM });
    const realNewContext = browser.newContext.bind(browser);
    let page;
    browser.newContext = async contextOpts => {
      const context = await realNewContext(contextOpts);
      const realRoute = context.route.bind(context);
      context.route = (pattern, handler) => realRoute(pattern, route => handler({
        request: () => route.request(),
        // Synthetic CSS response. No call to the real route.fetch is possible.
        fetch: async () => ({ headers: () => ({ 'content-type': 'text/css' }), ok: () => true, dispose: async () => {} }),
        fulfill: () => route.fulfill({ status: 200, contentType: 'text/css', body: '/* offline font fixture */' }),
        abort: error => { blockedRequests++; return route.abort(error); },
      }));
      const realNewPage = context.newPage.bind(context);
      context.newPage = async () => { page = await realNewPage(); return page; };
      return context;
    };
    const realClose = browser.close.bind(browser);
    browser.close = async () => {
      try {
        const observed = await page.evaluate(() => ({
          activeTags: document.querySelectorAll('script, iframe, img, object').length,
          name: document.querySelector('.ig-sub').textContent,
          track: document.getElementById('track').style.transform,
        }));
        assert.equal(observed.activeTags, 0);
        assert.equal(observed.name, '<img src="http://127.0.0.1/secret">');
        assert.equal(observed.track, 'translateX(-2520px)');
        // Also exercise the isolated browser context without the generated CSP:
        // page scripts stay disabled, while our own evaluate still runs.
        await page.setContent('<script>window.__untrustedExecuted = true</script><img src="http://127.0.0.1/never-requested">');
        await page.waitForTimeout(50);
        assert.equal(await page.evaluate(() => window.__untrustedExecuted), undefined);
        assert.ok(blockedRequests > 0);
        inspected = true;
      } finally { await realClose(); }
    };
    return browser;
  });
  const input = sample(); input.brand.name = '<img src="http://127.0.0.1/secret">';
  const result = await generateCarousel(input, 'cinematic'); cleanup(t, result);
  assert.equal(inspected, true, 'real DOM and disabled script checks ran before closing');
  const pictures = result.outputPaths.map(file => fs.readFileSync(file));
  for (const png of pictures) {
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), 1080);
    assert.equal(png.readUInt32BE(20), 1350);
    assert.ok(png.length > 10000, 'rendered image is nonempty');
  }
  assert.ok(new Set(pictures.map(png => png.toString('base64'))).size >= 6, 'slide positioning produced distinct frames');
});
