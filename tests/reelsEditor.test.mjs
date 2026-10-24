import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCHEMA_VERSION,
  createEmptyProject,
  createClip,
  addSource,
  buildTimeline,
  splitAtFrame,
  updateClip,
  moveClip,
  deleteClip,
  applyGapRemoval,
  proposeGaps,
  addTextOverlay,
  updateOverlay,
  removeOverlay,
  overlayStateAt,
  validateProject,
  validateForExport,
  sourceToOutputFrame,
  outputFrameToSource,
  LIMITS,
} from '../src/features/ReelsEditor/core/editPlan.js';
import { buildRenderPlan, PROFILES } from '../server/reels/renderPlan.js';

function mockSource(id = 's1', durationSec = 30) {
  return {
    id,
    checksum: 'a'.repeat(64),
    filename: 'clip1.mp4',
    bytes: 1048576,
    meta: {
      durationSec,
      width: 1920,
      height: 1080,
      rotation: 0,
      fpsNum: 30,
      fpsDen: 1,
      variableFrameRate: false,
      hasAudio: true,
      videoCodec: 'h264',
      audioCodec: 'aac',
    },
  };
}

test('editPlan: createEmptyProject produces valid schema v1 project', () => {
  const p = createEmptyProject({ id: 'p_test', ownerId: 'user_123', name: 'My Reel' });
  assert.equal(p.schemaVersion, SCHEMA_VERSION);
  assert.equal(p.canvas.width, 1080);
  assert.equal(p.canvas.height, 1920);
  assert.equal(p.canvas.fps.num, 30);
  const validation = validateProject(p);
  assert.equal(validation.ok, true, `Validation failed: ${validation.errors?.join(', ')}`);
});

test('editPlan: addSource and buildTimeline compute correct frame output', () => {
  const p0 = createEmptyProject({ id: 'p1', ownerId: 'user_1' });
  const src = mockSource('s1', 15);
  const p1 = addSource(p0, src);

  assert.equal(p1.sources.length, 1);
  assert.equal(p1.clips.length, 1);
  const tl = buildTimeline(p1);
  assert.equal(tl.fps, 30);
  assert.equal(tl.durationSec, 15);
  assert.equal(tl.totalFrames, 450);
  assert.equal(tl.segments.length, 1);
  assert.equal(tl.segments[0].startFrame, 0);
  assert.equal(tl.segments[0].endFrame, 450);
});

test('editPlan: splitAtFrame creates 2 contiguous clips without modifying source media', () => {
  const p0 = createEmptyProject({ id: 'p1', ownerId: 'user_1' });
  const src = mockSource('s1', 10);
  const p1 = addSource(p0, src);

  // Split at frame 90 (3.0 seconds into the video)
  const p2 = splitAtFrame(p1, 90);
  assert.equal(p2.clips.length, 2);
  assert.equal(p2.clips[0].inSec, 0);
  assert.equal(p2.clips[0].outSec, 3);
  assert.equal(p2.clips[1].inSec, 3);
  assert.equal(p2.clips[1].outSec, 10);

  const tl = buildTimeline(p2);
  assert.equal(tl.totalFrames, 300); // Still 10s * 30fps = 300 frames total
  assert.equal(tl.segments.length, 2);
  assert.equal(tl.segments[0].endFrame, 90);
  assert.equal(tl.segments[1].startFrame, 90);
  assert.equal(tl.segments[1].endFrame, 300);
});

test('editPlan: clip speed adjustment remaps output frames correctly', () => {
  const p0 = createEmptyProject({ id: 'p1', ownerId: 'user_1' });
  const src = mockSource('s1', 10);
  const p1 = addSource(p0, src);

  // Double speed (2x): 10 seconds of footage plays in 5 seconds (150 frames)
  const p2 = updateClip(p1, p1.clips[0].id, { speed: 2 });
  const tl = buildTimeline(p2);
  assert.equal(tl.durationSec, 5);
  assert.equal(tl.totalFrames, 150);
});

test('editPlan: gap removal creates disabled clip segments that can be restored', () => {
  const p0 = createEmptyProject({ id: 'p1', ownerId: 'user_1' });
  const src = mockSource('s1', 12);
  const p1 = addSource(p0, src);

  const rawSilences = [{ startSec: 4.0, endSec: 7.0 }];
  const gaps = proposeGaps(rawSilences, { sourceId: 's1', minGapSec: 0.6, paddingSec: 0.2 });
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].startSec, 4.2);
  assert.equal(gaps[0].endSec, 6.8);

  const p2 = applyGapRemoval(p1, gaps);
  // Expect 3 clips: [0 - 4.2 enabled], [4.2 - 6.8 disabled gap], [6.8 - 12 enabled]
  assert.equal(p2.clips.length, 3);
  assert.equal(p2.clips[0].enabled, true);
  assert.equal(p2.clips[1].enabled, false);
  assert.equal(p2.clips[1].origin, 'gap-removal');
  assert.equal(p2.clips[2].enabled, true);

  // Restoring the disabled gap:
  const p3 = updateClip(p2, p2.clips[1].id, { enabled: true });
  assert.equal(p3.clips[1].enabled, true);
  const tl3 = buildTimeline(p3);
  assert.equal(tl3.durationSec, 12);
});

test('editPlan: source-anchored text overlays track cuts and flag orphans', () => {
  const p0 = createEmptyProject({ id: 'p1', ownerId: 'user_1' });
  const src = mockSource('s1', 20);
  const p1 = addSource(p0, src);

  // Add text overlay at frame 150 (5.0s on source s1)
  const p2 = addTextOverlay(p1, 150, { text: 'Key Insight' });
  assert.equal(p2.overlays.length, 1);
  assert.equal(p2.overlays[0].anchorMode, 'source');
  assert.equal(p2.overlays[0].anchor.sourceSec, 5.0);

  // Trim front of the clip by cutting out 0 to 2 seconds (inSec: 2.0)
  const p3 = updateClip(p2, p2.clips[0].id, { inSec: 2.0 });
  // The overlay's 5.0s moment on source s1 is now at output time (5 - 2) = 3s = frame 90
  assert.equal(p3.overlays[0].startFrame, 90);
  assert.equal(p3.overlays[0].needsReview, false);

  // Now trim the clip from the front to start at 6.0s (inSec: 6.0, outSec: 16.0 -> 10s duration)
  // This cuts out source moment 5.0s completely!
  const p4 = updateClip(p3, p3.clips[0].id, { inSec: 6.0, outSec: 16.0 });
  assert.equal(p4.overlays[0].needsReview, true);

  // Export validation should block rendering when an overlay needs review
  const exportCheck = validateForExport(p4);
  assert.equal(exportCheck.ok, false);
  assert.ok(exportCheck.errors.some((err) => /lost its footage/.test(err)));
});

test('editPlan: overlayStateAt evaluates deterministic fade & slide transitions', () => {
  const overlay = {
    id: 't1',
    startFrame: 30,
    durationFrames: 60, // frames 30 to 90
    animation: { in: 'slide-up', durationFrames: 10 },
  };

  // Outside bounds
  assert.equal(overlayStateAt(overlay, 20), null);
  assert.equal(overlayStateAt(overlay, 95), null);

  // Start entrance: frame 30 -> pIn = 0, alpha = 0, offsetY = 80
  const at30 = overlayStateAt(overlay, 30);
  assert.equal(at30.alpha, 0);
  assert.equal(at30.offsetY, 80);

  // Fully entered: frame 40 -> pIn = 1, alpha = 1, offsetY = 0
  const at40 = overlayStateAt(overlay, 40);
  assert.equal(at40.alpha, 1);
  assert.equal(at40.offsetY, 0);

  // Midway: frame 60
  const at60 = overlayStateAt(overlay, 60);
  assert.equal(at60.alpha, 1);
  assert.equal(at60.offsetY, 0);

  // Exit fade out: frame 85 -> 5 frames from end (90) of 10-frame duration -> pOut = 0.5
  const at85 = overlayStateAt(overlay, 85);
  assert.equal(at85.alpha, 0.5);
});

test('renderPlan: buildRenderPlan creates valid FFmpeg commands and filtergraph', () => {
  const p0 = createEmptyProject({ id: 'proj_xyz', ownerId: 'usr_abc' });
  const src = mockSource('src_1', 12);
  const p1 = addSource(p0, src);
  const p2 = addTextOverlay(p1, 30, { text: 'Transform Your Business' });

  const sourcePaths = new Map([['src_1', 'C:\\dummy\\src_1.mp4']]);
  const plan = buildRenderPlan(p2, { sourcePaths, profile: 'export' });

  assert.equal(plan.width, 1080);
  assert.equal(plan.height, 1920);
  assert.equal(plan.durationSec, 12);
  assert.equal(plan.hasAudio, true);
  assert.equal(plan.textFiles.length, 1);
  assert.equal(plan.textFiles[0].content, 'Transform Your Business');

  // Verify security & escaping: user text is never directly in the filter string
  assert.ok(!plan.filterScript.includes('Transform Your Business'));
  assert.ok(plan.filterScript.includes('textfile=layer0.txt'));
  assert.ok(plan.filterScript.includes('drawtext='));
  assert.ok(plan.filterScript.includes('format=yuv420p'));
  assert.ok(plan.args.includes('-filter_complex_script'));
  assert.ok(plan.args.includes('graph.txt'));
});
