import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGACY_SCHEMA_VERSION,
  SCHEMA_VERSION,
  addSource,
  applyCleanupCandidates,
  buildTimeline,
  createEmptyProject,
  defaultCleanupState,
  outputUsToSource,
  reorderSources,
  restoreCleanupCandidates,
  setCanvasPolicy,
  sourceIntervalToOutputIntervals,
  sourceUsToOutputUs,
  unionSourceIntervals,
  updateClip,
  validateForExport,
  validateProject,
} from '../src/features/ReelsEditor/core/editPlan.js';

function source(id, durationSec = 30, { width = 1920, height = 1080, rotation = 0 } = {}) {
  return {
    id,
    // Source IDs are arbitrary labels; checksums model SHA-256 and must be hex.
    checksum: 'a'.repeat(64),
    filename: `${id}.mp4`,
    bytes: 1_024,
    meta: {
      durationSec,
      width,
      height,
      rotation,
      fpsNum: 30,
      fpsDen: 1,
      variableFrameRate: false,
      hasAudio: true,
      videoCodec: 'h264',
      audioCodec: 'aac',
      timebaseNum: 1,
      timebaseDen: 90_000,
    },
  };
}

test('v2: source picker order, displayed single-source canvas, and export cap are independent', () => {
  const p0 = createEmptyProject({ id: 'p_v2_order', ownerId: 'user_v2' });
  const p1 = addSource(p0, source('sone', 90));

  assert.equal(p1.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(p1.sourceOrder, ['sone']);
  assert.equal(p1.clips[0].outSec, 90, 'full original source is selected; no hidden 60s trim');
  assert.deepEqual({ width: p1.canvas.width, height: p1.canvas.height }, { width: 1920, height: 1080 });
  assert.equal(validateForExport(p1).ok, false, 'the 60s limit remains an explicit export check');

  const p2 = addSource(p1, source('stwo', 30, { width: 1080, height: 1920 }));
  assert.deepEqual(p2.sourceOrder, ['sone', 'stwo']);
  assert.deepEqual({ width: p2.canvas.width, height: p2.canvas.height }, { width: 1080, height: 1920 });
  assert.equal(p2.canvasPolicy.requiresFitSelection, true);
  assert.match(validateForExport(p2).errors.join('\n'), /Choose fit or fill/);

  const p3 = setCanvasPolicy(p2, { fit: 'fit' });
  assert.equal(p3.canvasPolicy.requiresFitSelection, false);
  const reordered = reorderSources(p3, 1, 0);
  assert.deepEqual(reordered.sourceOrder, ['stwo', 'sone']);
  assert.equal(buildTimeline(reordered).segments[0].sourceId, 'stwo');
});

test('v2: source/output microsecond mappings are stable on a frame-quantized timeline', () => {
  const p0 = createEmptyProject({ id: 'p_v2_time', ownerId: 'user_v2' });
  const p1 = addSource(p0, source('stime', 12));
  const p2 = updateClip(p1, p1.clips[0].id, { speed: 2 });
  const timeline = buildTimeline(p2);

  assert.equal(timeline.durationUs, 6_000_000);
  assert.equal(sourceUsToOutputUs(timeline, 'stime', 2_000_000), 1_000_000);
  const sourceAtOneSecond = outputUsToSource(timeline, 1_000_000);
  assert.equal(sourceAtOneSecond.sourceUs, 2_000_000);
  assert.deepEqual(
    sourceIntervalToOutputIntervals(timeline, { sourceId: 'stime', startUs: 2_000_000, endUs: 4_000_000 })
      .map(({ startUs, endUs }) => ({ startUs, endUs })),
    [{ startUs: 1_000_000, endUs: 2_000_000 }],
  );
});

test('v2: cleanup candidates union safely around word anchors and restore exactly by candidate', () => {
  const p0 = createEmptyProject({ id: 'p_v2_cleanup', ownerId: 'user_v2' });
  const p1 = addSource(p0, source('sclean', 4));
  const candidate = {
    id: 'cleanup1',
    sourceId: 'sclean',
    startUs: 500_000,
    endUs: 1_500_000,
    kind: 'pause',
    decision: 'accepted',
    reason: 'Confirmed unwanted pause',
    confidence: 0.98,
    wordIds: [],
    protectedWordIds: [],
  };
  const project = {
    ...p1,
    wordAnchors: [{
      wordId: 'word1',
      sourceId: 'sclean',
      startUs: 1_000_000,
      endUs: 1_200_000,
      text: 'important',
      alignmentQuality: 'exact',
    }],
    cleanup: { ...defaultCleanupState(), candidates: [candidate] },
  };

  assert.deepEqual(
    unionSourceIntervals([
      { sourceId: 'sclean', startUs: 500_000, endUs: 900_000, candidateIds: ['cleanup1'] },
      { sourceId: 'sclean', startUs: 850_000, endUs: 1_500_000, candidateIds: ['cleanup2'] },
    ]).map(({ startUs, endUs, candidateIds }) => ({ startUs, endUs, candidateIds })),
    [{ startUs: 500_000, endUs: 1_500_000, candidateIds: ['cleanup1', 'cleanup2'] }],
  );

  const cleaned = applyCleanupCandidates(project, undefined, { guardUs: 120_000, now: '2026-10-26T00:00:00.000Z' });
  const removed = cleaned.clips.filter((clip) => !clip.enabled);
  assert.deepEqual(removed.map((clip) => [clip.inSec, clip.outSec]), [[0.5, 0.88], [1.32, 1.5]]);
  assert.ok(removed.every((clip) => clip.cleanupCandidateIds.includes('cleanup1')));
  assert.equal(validateProject(cleaned).ok, true);

  const restored = restoreCleanupCandidates(cleaned, 'cleanup1');
  assert.ok(restored.clips.every((clip) => clip.enabled));
  assert.equal(restored.cleanup.candidates[0].decision, 'restored');
  assert.equal(validateProject(restored).ok, true);
});

test('v2: deterministic scenes/effects/provenance validate while v1 records remain readable', () => {
  const p0 = createEmptyProject({ id: 'p_v2_schema', ownerId: 'user_v2' });
  const p1 = addSource(p0, source('sschema', 10));
  const project = {
    ...p1,
    wordAnchors: [{ wordId: 'worda', sourceId: 'sschema', startUs: 0, endUs: 300_000, text: 'Hello', alignmentQuality: 'high' }],
    scenes: [{
      id: 'scenea', component: 'emphasis_text', startUs: 0, endUs: 1_000_000,
      wordIds: ['worda'], data: { text: 'Hello' }, templateId: null, templateVersion: null,
    }],
    effects: [{ id: 'effecta', type: 'sound-effect', startUs: 200_000, durationUs: 200_000, assetId: null, gainDb: null, data: {} }],
    provenance: {
      provider: 'openai', model: 'planner-model', skill: 'reels-v2', skillVersion: '2',
      plannerVersion: '2', rendererVersion: '1.0.0', generatedAt: '2026-10-26T00:00:00.000Z',
    },
  };
  assert.equal(validateProject(project).ok, true);

  const { canvasPolicy, sourceOrder, wordAnchors, cleanup, scenes, effects, provenance, ...legacyFields } = project;
  const legacy = { ...legacyFields, schemaVersion: LEGACY_SCHEMA_VERSION };
  assert.equal(validateProject(legacy).ok, true, 'legacy schema-v1 projects remain readable');
});
