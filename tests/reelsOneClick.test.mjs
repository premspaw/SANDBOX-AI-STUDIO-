import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { createEmptyProject, addSource, applyGapRemoval, validateProject } from '../src/features/ReelsEditor/core/editPlan.js';
import { runOneClickEdit } from '../src/features/ReelsEditor/services/oneClickEdit.js';
import { Plan } from '../server/reels/aiEditor.js';

function fixture() {
  return addSource(createEmptyProject({ id: 'p1', ownerId: 'u1' }), {
    id: 's1', checksum: 'a'.repeat(64), filename: 'speech.mp4', bytes: 100,
    meta: { durationSec: 10, width: 576, height: 1024, rotation: 0,
      fpsNum: 30, fpsDen: 1, variableFrameRate: false, hasAudio: true,
      videoCodec: 'h264', audioCodec: 'aac' },
  });
}
function fakeApi(calls) {
  return {
    detectSilence: async () => { calls.push('cleanup'); return { id: 'j1', status: 'succeeded', result: { gaps: [{ sourceId: 's1', startSec: 2, endSec: 3 }] } }; },
    saveRevision: async (id, revision, project) => { calls.push('save'); return { ...project, revision: revision + 1 }; },
    applyAiEdit: async (id, options) => { calls.push(['ai', options]); return { project: { ...fixture(), revision: 2 }, transcript: 'Actual speech', paperEditSummary: 'Emphasized the key idea.' }; },
    startRender: async (id, options) => { calls.push(['render', options]); return { id: 'j2', revision: 2, status: 'succeeded' }; },
    getJobDownloadUrl: async () => { calls.push('url'); return { playUrl: '/play', downloadUrl: '/download', fileName: 'video.mp4' }; },
  };
}
test('one click explicitly cleans, saves, calls selected OpenAI style, and renders the saved revision', async () => {
  const calls = [], stages = [];
  const result = await runOneClickEdit({ api: fakeApi(calls), project: fixture(),
    style: 'reference-editor', onStage: s => stages.push(s) });
  assert.deepEqual(calls.map(c => Array.isArray(c) ? c[0] : c), ['cleanup', 'save', 'ai', 'render', 'url']);
  assert.equal(calls[2][1].engine, 'openai');
  assert.equal(calls[2][1].style, 'reference-editor');
  assert.equal(calls[2][1].baseRevision, 1);
  assert.equal(calls[3][1].revision, 2);
  assert.equal(result.transcript, 'Actual speech');
  assert.deepEqual(stages, ['cleanup', 'design', 'render', 'done']);
});
test('AI failure never starts a render or fabricates a successful result', async () => {
  const calls = [], api = fakeApi(calls);
  api.applyAiEdit = async () => { throw new Error('Provider unavailable'); };
  await assert.rejects(runOneClickEdit({ api, project: fixture(), style: 'reference-editor' }), /Provider unavailable/);
  assert.deepEqual(calls, ['cleanup', 'save']);
});
test('refinement skips acoustic cleanup and preserves original cleanup decisions', async () => {
  const calls = [];
  await runOneClickEdit({ api: fakeApi(calls), project: fixture(), style: 'viral-hook', cleanup: false, userPrompt: 'Shorten the title' });
  assert.deepEqual(calls.map(c => Array.isArray(c) ? c[0] : c), ['ai', 'render', 'url']);
  assert.equal(calls[0][1].userPrompt, 'Shorten the title');
});
test('cancelled workflow cannot launch paid planning', async () => {
  const controller = new AbortController(); controller.abort();
  const calls = [];
  await assert.rejects(runOneClickEdit({ api: fakeApi(calls), project: fixture(), signal: controller.signal }), /Stopped/);
  assert.equal(calls.length, 0);
});
test('failed cleanup prevents planning and rendering', async () => {
  const calls = [], api = fakeApi(calls);
  api.detectSilence = async () => ({ id: 'bad', status: 'failed', error: 'Audio decode failed' });
  await assert.rejects(runOneClickEdit({ api, project: fixture(), style: 'reference-editor' }), /Audio decode failed/);
  assert.equal(calls.length, 0);
});
test('gap union never duplicates footage and all original spans remain recoverable', () => {
  const p = applyGapRemoval(fixture(), [
    { sourceId: 's1', startSec: 2, endSec: 5 },
    { sourceId: 's1', startSec: 3, endSec: 4 },
    { sourceId: 's1', startSec: 4.5, endSec: 6 },
  ]);
  assert.equal(validateProject(p).ok, true);
  assert.deepEqual(p.clips.map(c => [c.inSec, c.outSec, c.enabled]), [[0, 2, true], [2, 6, false], [6, 10, true]]);
  assert.ok(Math.abs(p.clips.reduce((sum, c) => sum + c.outSec - c.inSec, 0) - 10) < 1e-9);
});
test('cleanup retains tiny word fragments instead of dropping them', () => {
  const p = applyGapRemoval(fixture(), [{ sourceId: 's1', startSec: 0.04, endSec: 9.96 }]);
  assert.equal(p.clips[0].inSec, 0);
  assert.equal(p.clips[0].enabled, true);
  assert.equal(p.clips.at(-1).outSec, 10);
  assert.equal(p.clips.at(-1).enabled, true);
  assert.ok(Math.abs(p.clips.reduce((sum, c) => sum + c.outSec - c.inSec, 0) - 10) < 1e-9);
});
test('provider schema requires every object property for strict structured output', () => {
  const schema = z.toJSONSchema(Plan);
  function inspect(node) {
    if (node.type === 'object') {
      assert.equal(node.additionalProperties, false);
      assert.deepEqual([...node.required].sort(), Object.keys(node.properties).sort());
      Object.values(node.properties).forEach(inspect);
    }
    if (node.items) inspect(node.items);
  }
  inspect(schema);
});
