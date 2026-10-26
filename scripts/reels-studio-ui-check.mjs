import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium } from 'playwright';
import { createEmptyProject, addSource } from '../src/features/ReelsEditor/core/editPlan.js';

const harness = '.reels-ui-check.html';
await fs.writeFile(harness, '<div id="root"></div><script type="module">import React from "react";import{createRoot}from"react-dom/client";import Editor from "/src/features/ReelsEditor/ReelsEditorPage.jsx";import "/src/index.css";createRoot(document.getElementById("root")).render(React.createElement(Editor));</script>');
let server, browser;
try {
  server = await createServer({ configFile: false, plugins: [react()], server: { host: '127.0.0.1', port: 0 }, optimizeDeps: { include: ['react', 'react-dom/client'] } });
  await server.listen();
  browser = await chromium.launch({ headless: true });
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    let project = createEmptyProject({ id: 'p_ui', ownerId: 'test', name: 'UI test' });
    let aiCalls = 0, uploads = 0, failure = false;
    await page.route('**/api/reels/**', async route => {
      const request = route.request(), url = new URL(request.url()), pathname = url.pathname;
      let body;
      if (pathname.endsWith('/ai-engines')) body = { engines: [{ id: 'openai', available: true, defaultModel: 'test-model' }] };
      else if (pathname.endsWith('/sources') && request.method() === 'POST') {
        uploads++;
        const source = { id: 's_ui', checksum: 'b'.repeat(64), filename: 'raw.mp4', bytes: 100,
          meta: { durationSec: 10, width: 576, height: 1024, rotation: 0, fpsNum: 30, fpsDen: 1,
            variableFrameRate: false, hasAudio: true, videoCodec: 'h264', audioCodec: 'aac' } };
        project = { ...addSource(project, source), revision: project.revision + 1 };
        body = { project, source, warnings: [] };
      } else if (pathname.endsWith('/analyze/silence')) body = { job: { id: 'j_silence', status: 'succeeded', result: { gaps: [] } } };
      else if (pathname.endsWith('/ai-edit')) {
        aiCalls++;
        if (failure) { await route.fulfill({ status: 503, json: { error: 'Provider unavailable' } }); return; }
        const data = request.postDataJSON();
        assert.equal(data.engine, 'openai');
        assert.equal(data.style, 'reference-editor');
        project = { ...project, revision: project.revision + 1 };
        body = { project, transcript: 'This is the actual spoken script.', paperEditSummary: 'Kept the speaker visible.' };
      } else if (pathname.endsWith('/renders')) body = { job: { id: 'j_render', revision: project.revision, status: 'succeeded' } };
      else if (pathname.endsWith('/jobs/j_render/url')) body = { playUrl: '/fake-video.mp4', downloadUrl: '/fake-download.mp4', fileName: 'edited.mp4' };
      else if (pathname.endsWith('/url')) body = { url: '/fake-video.mp4' };
      else if (pathname.endsWith('/jobs')) body = { jobs: [] };
      else if (pathname.endsWith('/projects/p_ui') && request.method() === 'PUT') {
        const data = request.postDataJSON(); project = { ...data.project, revision: project.revision + 1 }; body = { project };
      } else if (pathname.endsWith('/projects/p_ui')) body = { project };
      else if (pathname.endsWith('/projects')) body = { projects: [project] };
      else throw new Error('Unexpected API call: ' + pathname);
      await route.fulfill({ json: body });
    });
    await page.goto(server.resolvedUrls.local[0] + harness);
    await page.getByRole('button', { name: 'Edit Video', exact: true }).waitFor();
    assert.equal(aiCalls, 0);
    await page.getByLabel('Upload videos', { exact: true }).setInputFiles({ name: 'raw.mp4', mimeType: 'video/mp4', buffer: Buffer.from('fixture') });
    await page.getByText('Footage uploaded.', { exact: false }).waitFor();
    assert.equal(uploads, 1); assert.equal(aiCalls, 0, 'upload must never invoke paid planning');
    await page.getByRole('button', { name: 'Edit Video', exact: true }).click();
    await page.getByText('Kept the speaker visible.', { exact: true }).waitFor();
    assert.equal(aiCalls, 1);
    await page.getByRole('button', { name: 'Rendered', exact: true }).waitFor();
    assert.ok(await page.getByRole('link', { name: 'Download MP4', exact: true }).isVisible());
    await page.getByRole('button', { name: 'Make changes', exact: true }).click();
    await page.getByLabel('Editing request').fill('Shorten the title');
    failure = true;
    await page.getByRole('button', { name: 'Apply changes', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Provider unavailable' }).waitFor();
    assert.equal(aiCalls, 2);
    assert.ok(await page.getByLabel('Editing request').inputValue());
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflow, false, 'page overflow at width ' + width);
    assert.deepEqual(errors, []);
    console.log('PASS studio upload/edit/failure/mobile width=' + width);
    await page.close();
  }
} finally {
  await browser?.close(); await server?.close(); await fs.rm(harness, { force: true });
}
