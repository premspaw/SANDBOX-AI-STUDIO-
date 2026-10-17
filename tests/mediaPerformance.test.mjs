import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { staticAssetOptions } from '../server/http/staticAssets.js';
import { compatibleLandingVideo, landingVideoPoster } from '../src/config/landingMedia.js';
import { syncPreviewPlayback, hasPreviewMediaError } from '../src/lib/previewPlayback.js';

test('static handler caches only hashed build chunks indefinitely, keeps HTML fresh and supports video ranges', async t => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'zerolens-static-'));
    await fs.mkdir(path.join(dir, 'assets'));
    await fs.writeFile(path.join(dir, 'index.html'), '<html>fresh</html>');
    await fs.writeFile(path.join(dir, 'assets/index-Abc123_-.js'), 'export default 1;');
    await fs.writeFile(path.join(dir, 'assets/logo.js'), 'logo');
    await fs.writeFile(path.join(dir, 'preview.mp4'), '0123456789');
    const app = express();
    app.use(express.static(dir, staticAssetOptions(dir)));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await fs.rm(dir, { recursive: true }); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const html = await fetch(base);
    assert.equal(html.headers.get('cache-control'), 'no-cache, no-store, must-revalidate');
    const chunk = await fetch(`${base}/assets/index-Abc123_-.js`);
    assert.equal(chunk.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    const unhashed = await fetch(`${base}/assets/logo.js`);
    assert.equal(unhashed.headers.get('cache-control'), 'public, max-age=3600');
    const range = await fetch(`${base}/preview.mp4`, { headers: { Range: 'bytes=2-5' } });
    assert.equal(range.status, 206);
    assert.equal(range.headers.get('content-range'), 'bytes 2-5/10');
    assert.equal(await range.text(), '2345');
});

test('exact HEVC source URLs receive compatible local replacements; other assets are unchanged', () => {
    assert.equal(compatibleLandingVideo('https://cdn.zerolens.in/landing-assets/IMG_5525.MP4'), '/media/landing/brand-story-h264.mp4');
    assert.equal(compatibleLandingVideo('https://cdn.zerolens.in/landing/assets/uploaded_1783622383095.mp4'), '/media/landing/skin-care-h264.mp4');
    assert.equal(compatibleLandingVideo('https://cdn.zerolens.in/landing-assets/cinema.mp4'), null);
    assert.equal(landingVideoPoster('/media/landing/brand-story-h264.mp4'), '/media/landing/brand-story-poster.jpg');
});

test('offscreen/hidden previews pause and late play promises cannot restart them', async () => {
    let finishPlay;
    let pauses = 0;
    const video = { play: () => new Promise(resolve => { finishPlay = resolve; }), pause: () => { pauses += 1; } };
    syncPreviewPlayback(video, true);
    syncPreviewPlayback(video, false);
    assert.equal(pauses, 1);
    finishPlay();
    await Promise.resolve();
    assert.equal(pauses, 2);
});

test('autoplay rejection is handled without an unhandled rejection', async () => {
    syncPreviewPlayback({ play: () => Promise.reject(new Error('not allowed')), pause() {} }, true);
    await new Promise(resolve => setImmediate(resolve));
});

test('production handler is configured once before the SPA fallback', async () => {
    const source = await fs.readFile(new URL('../server.js', import.meta.url), 'utf8');
    assert.equal((source.match(/app\.use\(express\.static\(path\.join\(__dirname, 'dist'\)/g) || []).length, 1);
    assert.match(source, /staticAssetOptions\(path\.join\(__dirname, 'dist'\)\)/);
});

test('lazy preview errors require a current source and real non-aborted media error', () => {
    assert.equal(hasPreviewMediaError(null), false);
    assert.equal(hasPreviewMediaError({ currentSrc: '', error: { code: 4 } }), false);
    assert.equal(hasPreviewMediaError({ currentSrc: 'fixture.mp4', error: null }), false);
    assert.equal(hasPreviewMediaError({ currentSrc: 'fixture.mp4', error: { code: 1 } }), false);
    for (const code of [2,3,4]) assert.equal(hasPreviewMediaError({ currentSrc: 'fixture.mp4', error: { code } }), true);
});

test('successful preview load clears any stale fallback state', async () => {
    const source=await fs.readFile(new URL('../src/components/common/ViewportVideo.jsx',import.meta.url),'utf8');
    assert.match(source, /onCanPlay=\{\(\) => \{ setFailed\(false\)/);
});
