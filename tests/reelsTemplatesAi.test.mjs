import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyProject,
  addSource,
  validateProject,
  buildTimeline,
} from '../src/features/ReelsEditor/core/editPlan.js';
import {
  REEL_TEMPLATES,
  getTemplateById,
  instantiateTemplate,
} from '../src/features/ReelsEditor/core/templates.js';
import { getAvailableEngines, executeAiEdit } from '../server/reels/aiEditor.js';

test('templates: all 6 reel presets have valid schema and OFL fonts', () => {
  assert.equal(REEL_TEMPLATES.length, 6);
  for (const t of REEL_TEMPLATES) {
    assert.ok(t.id, 'Must have id');
    assert.ok(t.name, 'Must have name');
    assert.ok(t.defaultText, 'Must have defaultText');
    assert.ok(['poppins', 'noto-kannada'].includes(t.style.font));
    assert.match(t.style.color, /^#[0-9a-fA-F]{6}$/);
    assert.match(t.style.boxColor, /^#[0-9a-fA-F]{6}$/);
    assert.ok(t.style.fontSize >= 16 && t.style.fontSize <= 220);
    assert.ok(['none', 'fade', 'slide-up'].includes(t.animation.in));
  }
});

test('templates: instantiateTemplate creates valid overlay schema', () => {
  const viralHook = getTemplateById('viral-hook');
  assert.ok(viralHook);

  const overlay = instantiateTemplate(viralHook, 45, 30, 'STOP SCROLLING NOW');
  assert.equal(overlay.text, 'STOP SCROLLING NOW');
  assert.equal(overlay.startFrame, 45);
  assert.equal(overlay.templateId, 'viral-hook');
  assert.equal(overlay.durationFrames, 90);

  // Test inside a project
  const p0 = createEmptyProject({ id: 'p_test', ownerId: 'u1' });
  const p1 = {
    ...p0,
    overlays: [{ ...overlay, id: 't1' }],
  };
  const val = validateProject(p1);
  assert.equal(val.ok, true, `Validation failed: ${val.errors?.join(', ')}`);
});

test('aiEditor: getAvailableEngines reports gemini, openai, and claude', () => {
  const engines = getAvailableEngines();
  const ids = engines.map((e) => e.id);
  assert.ok(ids.includes('gemini'), 'Must include gemini');
  assert.ok(ids.includes('openai'), 'Must include openai');
  assert.ok(ids.includes('claude'), 'Must include claude');
});

test('aiEditor: executeAiEdit applies templates and validates project schema', async () => {
  const p0 = createEmptyProject({ id: 'p_ai', ownerId: 'u1' });
  const mockSource = {
    id: 's1',
    checksum: 'a'.repeat(64),
    filename: 'test.mp4',
    bytes: 1024,
    meta: {
      durationSec: 15,
      width: 1080,
      height: 1920,
      rotation: 0,
      fpsNum: 30,
      fpsDen: 1,
      variableFrameRate: false,
      hasAudio: false,
      videoCodec: 'h264',
      audioCodec: null,
    },
  };
  const p1 = addSource(p0, mockSource);

  const res = await executeAiEdit({
    project: p1,
    ownerId: 'u1',
    engine: 'gemini',
    style: 'viral-hook',
    removeGaps: false,
    userPrompt: 'Test hook',
  });

  assert.ok(res.project, 'Must return updated project');
  assert.ok(res.overlaysCount >= 1, 'Must have at least one overlay');
  assert.equal(res.project.overlays.length, res.overlaysCount);

  const val = validateProject(res.project);
  assert.equal(val.ok, true, `Project validation failed: ${val.errors?.join(', ')}`);
});
