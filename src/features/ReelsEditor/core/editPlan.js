/**
 * ZeroLens Reels Editor — canonical edit plan (schema v1).
 *
 * This module is the single source of truth for preview AND export timing.
 * It is plain ESM with no DOM/Node dependencies so both the browser editor and
 * the server render worker import it. Every edit operation is pure: it returns
 * a new project object and never mutates the input.
 *
 * Time model
 *  - Source times (clip in/out, anchors) are seconds on the immutable source.
 *  - Output times (overlays, timeline) are integer frames at canvas.fps.
 *  - A clip's output length = round(((out - in) / speed) * fps) frames.
 *  - Source timestamps are NEVER placed directly on the output; they are
 *    remapped through buildTimeline() after every trim/reorder/speed change.
 */
import { z } from 'zod';
import { REEL_TEMPLATES, ALL_TEMPLATES } from './templates.js';
import { brandLayer, DEFAULT_BRAND } from './brand.js';

/**
 * Schema v2 adds durable editing evidence (word anchors, cleanup decisions,
 * source ordering, scenes, effects, and provenance). The validator keeps
 * accepting v1 projects so older saved projects can still be opened and
 * edited before their persistence layer performs a migration.
 */
export const SCHEMA_VERSION = 2;
export const LEGACY_SCHEMA_VERSION = 1;
export const SUPPORTED_SCHEMA_VERSIONS = Object.freeze([LEGACY_SCHEMA_VERSION, SCHEMA_VERSION]);
export const MICROSECONDS_PER_SECOND = 1_000_000;
export const RENDERER = Object.freeze({ name: 'zerolens-ffmpeg', version: '1.0.0' });

export const LIMITS = Object.freeze({
  minOutputSec: 5,
  maxOutputSec: 60,
  maxSourceSec: 120,
  maxSources: 3,
  maxClips: 200,
  maxOverlays: 30,
  maxSimultaneousOverlays: 5,
  minSpeed: 0.25,
  maxSpeed: 4,
  minClipSec: 0.1,
  maxTextLength: 280,
});

/** Fonts bundled in server/reels/assets/fonts (SIL OFL). Preview loads the same files. */
export const FONTS = Object.freeze({
  poppins: { label: 'Poppins Bold', file: 'Poppins-Bold.ttf', family: 'ZL Poppins Bold, Poppins, sans-serif', titleFont: 'Poppins', bodyFont: 'Poppins' },
  'noto-kannada': { label: 'Noto Sans Kannada', file: 'NotoSansKannada.ttf', family: 'ZL Noto Kannada, "Noto Sans Kannada", sans-serif', titleFont: 'Noto Sans Kannada', bodyFont: 'Noto Sans Kannada' },
  'montserrat-caveat': { label: 'Montserrat + Caveat', file: 'Poppins-Bold.ttf', family: '"Montserrat", "Caveat", sans-serif', titleFont: 'Montserrat', bodyFont: 'Caveat' },
  'playfair-inter': { label: 'Playfair + Inter', file: 'Poppins-Bold.ttf', family: '"Playfair Display", "Inter", serif', titleFont: 'Playfair Display', bodyFont: 'Inter' },
  'anton-inter': { label: 'Anton + Inter', file: 'Poppins-Bold.ttf', family: '"Anton", "Inter", sans-serif', titleFont: 'Anton', bodyFont: 'Inter' },
  'poppins-gochi': { label: 'Poppins + Gochi Hand', file: 'Poppins-Bold.ttf', family: '"Poppins", "Gochi Hand", cursive', titleFont: 'Poppins', bodyFont: 'Gochi Hand' },
  'syne-outfit': { label: 'Syne + Outfit', file: 'Poppins-Bold.ttf', family: '"Syne", "Outfit", sans-serif', titleFont: 'Syne', bodyFont: 'Outfit' },
});

export const ANIMATIONS = Object.freeze(['none', 'fade', 'slide-up']);
export const CANVAS_PRESETS = Object.freeze(['source', 'portrait', 'square', 'landscape', 'custom']);
export const CANVAS_FIT_MODES = Object.freeze(['fill', 'fit']);
export const CLEANUP_MODES = Object.freeze(['natural', 'tight', 'manual']);
export const CLEANUP_KINDS = Object.freeze(['pause', 'silence', 'repetition', 'filler', 'custom']);
export const CLEANUP_DECISIONS = Object.freeze(['proposed', 'accepted', 'rejected', 'protected', 'restored']);
export const ALIGNMENT_QUALITIES = Object.freeze(['exact', 'high', 'medium', 'low', 'unknown']);
export const SCENE_COMPONENTS = Object.freeze([
  'emphasis_text',
  'ordered_cards',
  'process_arrows',
  'comparison',
  'concept_diagram',
  'speaker_inset',
]);
export const EFFECT_TYPES = Object.freeze(['sound-effect', 'transition', 'highlight']);
/** Pixel distance (at 1080-wide canvas) of the slide-up entrance. */
export const SLIDE_DISTANCE = 80;

// ───────────────────────────── Schema ─────────────────────────────
const Id = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, 'Invalid id');
const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colour must be #RRGGBB');
const Unit = z.number().min(0).max(1);
const Int = z.number().int();
const Microseconds = Int.nonnegative().max(31_536_000 * MICROSECONDS_PER_SECOND);

const SourceMeta = z.strictObject({
  durationSec: z.number().positive(),
  width: Int.positive(),
  height: Int.positive(),
  rotation: Int,
  fpsNum: Int.positive(),
  fpsDen: Int.positive(),
  variableFrameRate: z.boolean(),
  hasAudio: z.boolean(),
  videoCodec: z.string().max(40),
  audioCodec: z.string().max(40).nullable(),
  /** Optional FFprobe time base; absent on legacy projects. */
  timebaseNum: Int.positive().optional(),
  timebaseDen: Int.positive().optional(),
  /** Display dimensions after rotation, recorded by the ingest worker when available. */
  displayWidth: Int.positive().optional(),
  displayHeight: Int.positive().optional(),
});

const Source = z.strictObject({
  id: Id,
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  filename: z.string().max(200),
  bytes: Int.nonnegative(),
  meta: SourceMeta,
});

const Crop = z.strictObject({
  mode: z.enum(['fill', 'fit']),
  focusX: Unit,
  focusY: Unit,
  zoom: z.number().min(1).max(3),
});

const ClipRemoval = z.strictObject({
  sourceStartUs: Microseconds,
  sourceEndUs: Microseconds,
  candidateIds: z.array(Id).max(100),
  /** Original user intent is retained so a restored span never becomes an AI clip. */
  originalOrigin: z.enum(['user', 'gap-removal']),
});

const Clip = z.strictObject({
  id: Id,
  sourceId: Id,
  inSec: z.number().min(0),
  outSec: z.number().positive(),
  speed: z.number().min(LIMITS.minSpeed).max(LIMITS.maxSpeed),
  audioPolicy: z.enum(['preserve-pitch', 'mute']),
  enabled: z.boolean(),
  origin: z.enum(['user', 'gap-removal']),
  volume: z.number().min(0).max(2),
  muted: z.boolean(),
  fadeInSec: z.number().min(0).max(5),
  fadeOutSec: z.number().min(0).max(5),
  crop: Crop,
  /** v2 evidence used to offer exact, reversible cleanup restores. */
  cleanupCandidateIds: z.array(Id).max(100).optional(),
  removal: ClipRemoval.nullable().optional(),
});

const TextStyle = z.strictObject({
  x: Unit,
  y: Unit,
  fontSize: Int.min(16).max(220),
  color: Hex,
  boxColor: Hex,
  boxOpacity: Unit,
  font: z.enum(Object.keys(FONTS)),
});

const Overlay = z.strictObject({
  id: Id,
  kind: z.literal('text'),
  text: z.string().min(1).max(LIMITS.maxTextLength),
  startFrame: Int.min(0),
  durationFrames: Int.min(1),
  /** 'source' overlays follow the footage moment they were placed on; 'output' overlays stay at a fixed output frame. */
  anchorMode: z.enum(['source', 'output']),
  anchor: z.strictObject({ sourceId: Id, sourceSec: z.number().min(0) }).nullable(),
  needsReview: z.boolean(),
  style: TextStyle,
  animation: z.strictObject({ in: z.enum(ANIMATIONS), durationFrames: Int.min(0).max(60) }),
  templateId: z.string().max(80).nullable(),
  templateVersion: z.string().max(40).nullable(),
});

/** Source-anchored caption cue (schema reserved for the captions milestone). */
const Caption = z.strictObject({
  id: Id,
  text: z.string().max(200),
  sourceId: Id,
  sourceStartSec: z.number().min(0),
  sourceEndSec: z.number().positive(),
  sourceStartUs: Microseconds.optional(),
  sourceEndUs: Microseconds.optional(),
  outputStartUs: Microseconds.optional(),
  outputEndUs: Microseconds.optional(),
  wordIds: z.array(Id).max(80).optional(),
});

const Audio = z.strictObject({
  denoise: z.strictObject({ enabled: z.boolean(), strength: z.enum(['light', 'medium']) }),
  normalize: z.strictObject({ enabled: z.boolean(), targetLufs: z.number().min(-24).max(-9) }),
});

/** Canvas selection is explicit so mixed-source exports cannot silently crop footage. */
export const CanvasPolicySchema = z.strictObject({
  preset: z.enum(CANVAS_PRESETS),
  fit: z.enum(CANVAS_FIT_MODES).nullable(),
  requiresFitSelection: z.boolean(),
  sourceId: Id.nullable(),
});

/** Timestamped speech evidence. All v2 edit decisions anchor to these records, not transcript strings. */
export const WordAnchorSchema = z.strictObject({
  wordId: Id,
  sourceId: Id,
  startUs: Microseconds,
  endUs: Microseconds,
  text: z.string().min(1).max(120),
  alignmentQuality: z.enum(ALIGNMENT_QUALITIES),
});

export const CleanupCandidateSchema = z.strictObject({
  id: Id,
  sourceId: Id,
  startUs: Microseconds,
  endUs: Microseconds,
  kind: z.enum(CLEANUP_KINDS),
  decision: z.enum(CLEANUP_DECISIONS),
  reason: z.string().max(600),
  confidence: z.number().min(0).max(1).nullable(),
  /** Words deliberately targeted by a confirmed semantic cleanup. */
  wordIds: z.array(Id).max(100),
  /** Never trim these words, even when another candidate overlaps them. */
  protectedWordIds: z.array(Id).max(100),
});

const CleanupState = z.strictObject({
  mode: z.enum(CLEANUP_MODES),
  candidates: z.array(CleanupCandidateSchema).max(5000),
  protectedWordIds: z.array(Id).max(5000),
  appliedAt: z.string().max(40).nullable(),
});

/** Deterministic renderer scene; arbitrary planner fields live under bounded data, never at top level. */
export const SceneSchema = z.strictObject({
  id: Id,
  component: z.enum(SCENE_COMPONENTS),
  startUs: Microseconds,
  endUs: Microseconds,
  wordIds: z.array(Id).max(100),
  data: z.record(z.string().max(64), z.unknown()),
  templateId: z.string().max(80).nullable(),
  templateVersion: z.string().max(40).nullable(),
});

export const EffectSchema = z.strictObject({
  id: Id,
  type: z.enum(EFFECT_TYPES),
  startUs: Microseconds,
  durationUs: Microseconds,
  assetId: z.string().max(120).nullable(),
  gainDb: z.number().min(-60).max(12).nullable(),
  data: z.record(z.string().max(64), z.unknown()),
});

export const ProvenanceSchema = z.strictObject({
  provider: z.enum(['openai', 'gemini', 'manual', 'system', 'unknown']).nullable(),
  model: z.string().max(160).nullable(),
  skill: z.string().max(160).nullable(),
  skillVersion: z.string().max(80).nullable(),
  plannerVersion: z.string().max(80).nullable(),
  rendererVersion: z.string().max(80).nullable(),
  generatedAt: z.string().max(40).nullable(),
});

export const ProjectSchema = z.strictObject({
  schemaVersion: z.union([z.literal(LEGACY_SCHEMA_VERSION), z.literal(SCHEMA_VERSION)]),
  id: Id,
  ownerId: z.string().min(1).max(80),
  revision: Int.min(0),
  name: z.string().min(1).max(120),
  /** Retained when opening an older project; v2 uses brand.templateId instead. */
  editStyle: z.string().max(80).optional(),
  canvas: z.strictObject({
    width: Int.min(64).max(3840).multipleOf(2),
    height: Int.min(64).max(3840).multipleOf(2),
    fps: z.strictObject({ num: z.literal(30), den: z.literal(1) }),
  }),
  /** Optional on v1 projects; present on all projects created by v2. */
  canvasPolicy: CanvasPolicySchema.optional(),
  brand: z.strictObject({background: Hex, surface: Hex, text: Hex, accent: Hex, secondary: Hex, font: z.enum(Object.keys(FONTS)), animation: z.enum(ANIMATIONS), templateId: z.enum((ALL_TEMPLATES || REEL_TEMPLATES).map(t=>t.id))}).optional(),
  sources: z.array(Source).max(LIMITS.maxSources),
  clips: z.array(Clip).max(LIMITS.maxClips),
  overlays: z.array(Overlay).max(LIMITS.maxOverlays),
  captions: z.array(Caption).max(1000),
  /** Picker/source order is separate from the edited clip timeline. */
  sourceOrder: z.array(Id).max(LIMITS.maxSources).optional(),
  wordAnchors: z.array(WordAnchorSchema).max(50000).optional(),
  cleanup: CleanupState.optional(),
  scenes: z.array(SceneSchema).max(500).optional(),
  effects: z.array(EffectSchema).max(500).optional(),
  provenance: ProvenanceSchema.optional(),
  audio: Audio,
  renderer: z.strictObject({ name: z.literal(RENDERER.name), version: z.string().max(20) }),
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40),
});

// ───────────────────────────── Factories ─────────────────────────────
export const newId = (prefix = '') =>
  `${prefix}${(globalThis.crypto?.randomUUID?.() || `${Date.now()}${Math.random()}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 20)}`;

export function defaultCanvasPolicy() {
  return { preset: 'portrait', fit: 'fill', requiresFitSelection: false, sourceId: null };
}

export function defaultCleanupState() {
  return { mode: 'natural', candidates: [], protectedWordIds: [], appliedAt: null };
}

export function defaultProvenance() {
  return {
    provider: null,
    model: null,
    skill: null,
    skillVersion: null,
    plannerVersion: null,
    rendererVersion: RENDERER.version,
    generatedAt: null,
  };
}

const evenCanvasDimension = (value) => {
  const finite = Number.isFinite(value) ? Math.floor(value) : 1080;
  return Math.max(64, Math.min(3840, finite - (finite % 2)));
};

/** Display dimensions account for rotation while retaining immutable encoded metadata. */
export function sourceDisplayDimensions(source) {
  const meta = source?.meta || {};
  const rotation = ((Number(meta.rotation) || 0) % 360 + 360) % 360;
  const rotated = rotation === 90 || rotation === 270;
  const width = Number(meta.displayWidth) || (rotated ? Number(meta.height) : Number(meta.width));
  const height = Number(meta.displayHeight) || (rotated ? Number(meta.width) : Number(meta.height));
  const max = Math.max(width || 0, height || 0, 1);
  const scale = max > 3840 ? 3840 / max : 1;
  return {
    width: evenCanvasDimension((width || 1080) * scale),
    height: evenCanvasDimension((height || 1920) * scale),
  };
}

/** Derive a safe default canvas without changing the source footage itself. */
export function deriveCanvasForSources(sources, currentCanvas = { width: 1080, height: 1920, fps: { num: 30, den: 1 } }) {
  const allSources = Array.isArray(sources) ? sources : [];
  const fps = currentCanvas?.fps || { num: 30, den: 1 };
  if (allSources.length === 1) {
    const displayed = sourceDisplayDimensions(allSources[0]);
    return {
      canvas: { width: displayed.width, height: displayed.height, fps },
      canvasPolicy: { preset: 'source', fit: 'fill', requiresFitSelection: false, sourceId: allSources[0].id },
    };
  }
  if (allSources.length > 1) {
    return {
      canvas: { width: 1080, height: 1920, fps },
      // A deliberate null prevents a mixed-source export from silently choosing a crop rule.
      canvasPolicy: { preset: 'portrait', fit: null, requiresFitSelection: true, sourceId: null },
    };
  }
  return { canvas: { width: 1080, height: 1920, fps }, canvasPolicy: defaultCanvasPolicy() };
}

function canonicalSourceOrder(sources, requested) {
  const sourceIds = (sources || []).map((source) => source.id);
  const known = new Set(sourceIds);
  const seen = new Set();
  const ordered = [];
  for (const id of Array.isArray(requested) ? requested : []) {
    if (known.has(id) && !seen.has(id)) { ordered.push(id); seen.add(id); }
  }
  for (const id of sourceIds) {
    if (!seen.has(id)) { ordered.push(id); seen.add(id); }
  }
  return ordered;
}

/**
 * Add v2 fields to an in-memory legacy project without changing its declared
 * schema version. Persistence migrations can call upgradeProjectToV2 instead.
 */
export function ensureV2ProjectFields(project) {
  const sources = Array.isArray(project?.sources) ? project.sources : [];
  const inferred = deriveCanvasForSources(sources, project?.canvas);
  return {
    ...project,
    canvasPolicy: project?.canvasPolicy || inferred.canvasPolicy,
    sourceOrder: canonicalSourceOrder(sources, project?.sourceOrder),
    wordAnchors: Array.isArray(project?.wordAnchors) ? project.wordAnchors : [],
    cleanup: project?.cleanup || defaultCleanupState(),
    scenes: Array.isArray(project?.scenes) ? project.scenes : [],
    effects: Array.isArray(project?.effects) ? project.effects : [],
    provenance: project?.provenance || defaultProvenance(),
  };
}

export function upgradeProjectToV2(project) {
  return { ...ensureV2ProjectFields(project), schemaVersion: SCHEMA_VERSION };
}

/** Sources in the original picker/order rail, independent from individual clip edits. */
export function orderedSources(project) {
  const sources = project?.sources || [];
  const byId = new Map(sources.map((source) => [source.id, source]));
  return canonicalSourceOrder(sources, project?.sourceOrder).map((id) => byId.get(id)).filter(Boolean);
}

/**
 * Explicit source ordering also reorders each source's existing clips as a
 * group. This makes source rail reordering affect the default timeline while
 * preserving every per-source trim/split in that group.
 */
export function setSourceOrder(project, sourceIds) {
  const base = ensureV2ProjectFields(project);
  const expected = new Set(base.sources.map((source) => source.id));
  const requested = Array.isArray(sourceIds) ? sourceIds : [];
  if (requested.length !== expected.size || new Set(requested).size !== expected.size || requested.some((id) => !expected.has(id))) {
    return project;
  }
  const grouped = new Map();
  for (const clip of base.clips) {
    const clips = grouped.get(clip.sourceId) || [];
    clips.push(clip);
    grouped.set(clip.sourceId, clips);
  }
  const clips = requested.flatMap((id) => grouped.get(id) || []);
  // Preserve malformed/legacy clips for validation rather than silently losing them.
  const knownClipCount = clips.length;
  if (knownClipCount !== base.clips.length) {
    clips.push(...base.clips.filter((clip) => !expected.has(clip.sourceId)));
  }
  return reconcile(base, { ...base, sourceOrder: [...requested], clips });
}

export function reorderSources(project, fromIndex, toIndex) {
  const base = ensureV2ProjectFields(project);
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= base.sourceOrder.length || toIndex >= base.sourceOrder.length) {
    return project;
  }
  const next = [...base.sourceOrder];
  const [sourceId] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, sourceId);
  return setSourceOrder(base, next);
}

/** Update crop/canvas policy and apply standard output dimensions for presets. */
export function setCanvasPolicy(project, patch = {}) {
  const base = ensureV2ProjectFields(project);
  const { width, height, ...policyPatch } = patch;
  const policy = { ...base.canvasPolicy, ...policyPatch };
  let canvas = { ...base.canvas, fps: { ...base.canvas.fps } };
  if (policy.preset === 'source') {
    const source = base.sources.find((item) => item.id === (policy.sourceId || base.sources[0]?.id));
    if (source) {
      const displayed = sourceDisplayDimensions(source);
      canvas = { ...canvas, ...displayed };
      policy.sourceId = source.id;
    }
  } else if (policy.preset === 'portrait') {
    canvas = { ...canvas, width: 1080, height: 1920 };
    policy.sourceId = null;
  } else if (policy.preset === 'square') {
    canvas = { ...canvas, width: 1080, height: 1080 };
    policy.sourceId = null;
  } else if (policy.preset === 'landscape') {
    canvas = { ...canvas, width: 1920, height: 1080 };
    policy.sourceId = null;
  } else if (policy.preset === 'custom') {
    canvas = { ...canvas, width: evenCanvasDimension(width ?? canvas.width), height: evenCanvasDimension(height ?? canvas.height) };
    policy.sourceId = null;
  }
  policy.requiresFitSelection = base.sources.length > 1 && policy.fit == null;
  return { ...base, canvas, canvasPolicy: policy };
}

export function createEmptyProject({ id, ownerId, name = 'Untitled reel', now = new Date().toISOString() }) {
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    ownerId,
    revision: 0,
    name,
    canvas: { width: 1080, height: 1920, fps: { num: 30, den: 1 } },
    brand: {...DEFAULT_BRAND},
    sources: [],
    clips: [],
    overlays: [],
    captions: [],
    canvasPolicy: defaultCanvasPolicy(),
    sourceOrder: [],
    wordAnchors: [],
    cleanup: defaultCleanupState(),
    scenes: [],
    effects: [],
    provenance: defaultProvenance(),
    audio: { denoise: { enabled: false, strength: 'light' }, normalize: { enabled: false, targetLufs: -14 } },
    renderer: { name: RENDERER.name, version: RENDERER.version },
    createdAt: now,
    updatedAt: now,
  };
}

export function createClip(source, overrides = {}) {
  return {
    id: newId('c'),
    sourceId: source.id,
    inSec: 0,
    // A source can be longer than the export limit; do not silently discard
    // the remaining original footage. validateForExport enforces output caps.
    outSec: round3(source.meta.durationSec),
    speed: 1,
    audioPolicy: 'preserve-pitch',
    enabled: true,
    origin: 'user',
    volume: 1,
    muted: false,
    fadeInSec: 0,
    fadeOutSec: 0,
    crop: { mode: 'fill', focusX: 0.5, focusY: 0.5, zoom: 1 },
    cleanupCandidateIds: [],
    removal: null,
    ...overrides,
  };
}

// ───────────────────────────── Timeline ─────────────────────────────
export const round3 = (n) => Math.round(n * 1000) / 1000;
export const round6 = (n) => Math.round(n * MICROSECONDS_PER_SECOND) / MICROSECONDS_PER_SECOND;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Convert seconds to integer microseconds. Reject invalid timing at the boundary instead of rounding NaN. */
export function secondsToUs(seconds) {
  if (!Number.isFinite(seconds)) throw new TypeError('seconds must be a finite number');
  return Math.round(seconds * MICROSECONDS_PER_SECOND);
}

export function usToSeconds(microseconds) {
  if (!Number.isFinite(microseconds)) throw new TypeError('microseconds must be a finite number');
  return microseconds / MICROSECONDS_PER_SECOND;
}

/** Alias names make the source/output time unit obvious at call sites. */
export const sourceSecToUs = secondsToUs;
export const outputSecToUs = secondsToUs;
export const sourceUsToSec = usToSeconds;
export const outputUsToSec = usToSeconds;

export function projectFps(project) {
  return project.canvas.fps.num / project.canvas.fps.den;
}

export function clipOutputFrames(clip, fps) {
  return Math.max(1, Math.round(((clip.outSec - clip.inSec) / clip.speed) * fps));
}

/** Map every enabled clip onto the output timeline in integer frames. */
export function buildTimeline(project) {
  const fps = projectFps(project);
  const segments = [];
  let cursor = 0;
  project.clips.forEach((clip, index) => {
    if (!clip.enabled) return;
    const frames = clipOutputFrames(clip, fps);
    const startFrame = cursor;
    const endFrame = cursor + frames;
    segments.push({
      clipId: clip.id,
      clipIndex: index,
      sourceId: clip.sourceId,
      inSec: clip.inSec,
      outSec: clip.outSec,
      sourceInUs: secondsToUs(clip.inSec),
      sourceOutUs: secondsToUs(clip.outSec),
      speed: clip.speed,
      startFrame,
      endFrame,
      // Output time follows the frame-quantised renderer timeline, so endpoints
      // are stable across preview, export, and browser seek operations.
      startUs: Math.round((startFrame * MICROSECONDS_PER_SECOND) / fps),
      endUs: Math.round((endFrame * MICROSECONDS_PER_SECOND) / fps),
    });
    cursor = endFrame;
  });
  const durationUs = Math.round((cursor * MICROSECONDS_PER_SECOND) / fps);
  return { fps, segments, totalFrames: cursor, durationSec: cursor / fps, durationUs, frameDurationUs: MICROSECONDS_PER_SECOND / fps };
}

/** Output frame → { segment, sourceSec }, or null outside the timeline. */
export function outputFrameToSource(timeline, frame) {
  const seg = timeline.segments.find((s) => frame >= s.startFrame && frame < s.endFrame);
  if (!seg) return null;
  const sourceSec = seg.inSec + ((frame - seg.startFrame) / timeline.fps) * seg.speed;
  return { segment: seg, sourceSec: Math.min(sourceSec, seg.outSec) };
}

/** Output microsecond â†’ source microsecond, or null outside the rendered timeline. */
export function outputUsToSource(timeline, outputUs) {
  const time = Math.round(outputUs);
  const seg = timeline.segments.find((item) => time >= item.startUs && time < item.endUs);
  if (!seg) return null;
  const outputSpan = seg.endUs - seg.startUs;
  const sourceSpan = seg.sourceOutUs - seg.sourceInUs;
  const sourceUs = outputSpan <= 0
    ? seg.sourceInUs
    : seg.sourceInUs + Math.round(((time - seg.startUs) * sourceSpan) / outputSpan);
  return { segment: seg, sourceUs: Math.min(sourceUs, seg.sourceOutUs), sourceSec: usToSeconds(Math.min(sourceUs, seg.sourceOutUs)) };
}

/** Source microsecond â†’ output microsecond, or null when that source moment is cut/disabled. */
export function sourceUsToOutputUs(timeline, sourceId, sourceUs) {
  const time = Math.round(sourceUs);
  const seg = timeline.segments.find((item) => item.sourceId === sourceId && time >= item.sourceInUs && time <= item.sourceOutUs);
  if (!seg) return null;
  const sourceSpan = seg.sourceOutUs - seg.sourceInUs;
  const outputSpan = seg.endUs - seg.startUs;
  if (sourceSpan <= 0) return seg.startUs;
  return Math.min(seg.endUs, seg.startUs + Math.round(((time - seg.sourceInUs) * outputSpan) / sourceSpan));
}

/** Return all rendered pieces for a source interval, including a source split used more than once. */
export function sourceIntervalToOutputIntervals(timeline, { sourceId, startUs, endUs }) {
  const start = Math.round(startUs);
  const end = Math.round(endUs);
  if (!sourceId || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
  return timeline.segments
    .filter((seg) => seg.sourceId === sourceId && end > seg.sourceInUs && start < seg.sourceOutUs)
    .map((seg) => {
      const clippedStart = Math.max(start, seg.sourceInUs);
      const clippedEnd = Math.min(end, seg.sourceOutUs);
      return {
        sourceId,
        startUs: sourceUsToOutputUs({ segments: [seg] }, sourceId, clippedStart),
        endUs: sourceUsToOutputUs({ segments: [seg] }, sourceId, clippedEnd),
        sourceStartUs: clippedStart,
        sourceEndUs: clippedEnd,
        clipId: seg.clipId,
      };
    })
    .filter((interval) => interval.startUs != null && interval.endUs != null && interval.endUs > interval.startUs);
}

/** Source moment → output frame, or null when that moment is cut/disabled. */
export function sourceToOutputFrame(timeline, sourceId, sourceSec) {
  const seg = timeline.segments.find((s) => s.sourceId === sourceId && sourceSec >= s.inSec && sourceSec < s.outSec);
  if (!seg) return null;
  return Math.min(seg.endFrame - 1, seg.startFrame + Math.round(((sourceSec - seg.inSec) / seg.speed) * timeline.fps));
}

// ───────────────────────────── Validation ─────────────────────────────
/** Structural + semantic validation used before every save. */
export function validateProject(project) {
  const parsed = ProjectSchema.safeParse(project);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.slice(0, 10).map((i) => `${i.path.join('.') || 'project'}: ${i.message}`) };
  }
  const p = parsed.data;
  const errors = [];
  const ids = new Set();
  const dup = (id) => (ids.has(id) ? errors.push(`Duplicate id ${id}`) : ids.add(id));
  const sources = new Map(p.sources.map((s) => (dup(s.id), [s.id, s])));
  const sourceIds = new Set(sources.keys());
  if (p.sourceOrder) {
    const seenOrder = new Set();
    for (const sourceId of p.sourceOrder) {
      if (!sourceIds.has(sourceId)) errors.push(`Source order references unknown source ${sourceId}`);
      else if (seenOrder.has(sourceId)) errors.push(`Source order contains ${sourceId} more than once`);
      seenOrder.add(sourceId);
    }
    if (seenOrder.size !== sourceIds.size) errors.push('Source order must include every source exactly once');
  }
  for (const source of p.sources) {
    const meta = source.meta;
    if ((meta.timebaseNum == null) !== (meta.timebaseDen == null)) {
      errors.push(`Source ${source.id} must include both timebase numerator and denominator`);
    }
  }
  if (p.canvasPolicy) {
    if (p.canvasPolicy.sourceId && !sources.has(p.canvasPolicy.sourceId)) errors.push('Canvas policy references an unknown source');
    if (p.canvasPolicy.preset === 'source' && !p.canvasPolicy.sourceId && p.sources.length) errors.push('Source canvas policy requires a source');
    if (p.canvasPolicy.requiresFitSelection !== (p.sources.length > 1 && p.canvasPolicy.fit == null)) {
      errors.push('Canvas policy fit-selection state is inconsistent with its sources');
    }
  }

  const wordIds = new Set();
  for (const word of p.wordAnchors || []) {
    if (wordIds.has(word.wordId)) errors.push(`Duplicate word anchor ${word.wordId}`);
    wordIds.add(word.wordId);
    const source = sources.get(word.sourceId);
    if (!source) { errors.push(`Word ${word.wordId} references unknown source`); continue; }
    if (word.endUs <= word.startUs) errors.push(`Word ${word.wordId} has an invalid time range`);
    if (word.endUs > secondsToUs(source.meta.durationSec) + 50_000) errors.push(`Word ${word.wordId} ends after its source`);
  }

  const cleanupCandidates = new Map();
  if (p.cleanup) {
    for (const candidate of p.cleanup.candidates) {
      dup(candidate.id);
      cleanupCandidates.set(candidate.id, candidate);
      const source = sources.get(candidate.sourceId);
      if (!source) { errors.push(`Cleanup candidate ${candidate.id} references unknown source`); continue; }
      if (candidate.endUs <= candidate.startUs) errors.push(`Cleanup candidate ${candidate.id} has an invalid time range`);
      if (candidate.endUs > secondsToUs(source.meta.durationSec) + 50_000) errors.push(`Cleanup candidate ${candidate.id} ends after its source`);
      for (const wordId of [...candidate.wordIds, ...candidate.protectedWordIds]) {
        if (!wordIds.has(wordId)) errors.push(`Cleanup candidate ${candidate.id} references unknown word ${wordId}`);
      }
    }
    for (const wordId of p.cleanup.protectedWordIds) {
      if (!wordIds.has(wordId)) errors.push(`Cleanup protection references unknown word ${wordId}`);
    }
  }
  for (const c of p.clips) {
    dup(c.id);
    const src = sources.get(c.sourceId);
    if (!src) { errors.push(`Clip ${c.id} references unknown source`); continue; }
    if (c.outSec - c.inSec < LIMITS.minClipSec - 1e-6) errors.push(`Clip ${c.id} is shorter than ${LIMITS.minClipSec}s`);
    if (c.outSec > src.meta.durationSec + 0.05) errors.push(`Clip ${c.id} ends after its source`);
    for (const candidateId of c.cleanupCandidateIds || []) {
      if (p.cleanup && !cleanupCandidates.has(candidateId)) errors.push(`Clip ${c.id} references unknown cleanup candidate ${candidateId}`);
    }
    if (c.removal) {
      if (c.removal.sourceEndUs <= c.removal.sourceStartUs) errors.push(`Clip ${c.id} has an invalid removal range`);
      if (c.removal.sourceStartUs < secondsToUs(c.inSec) - 1_000 || c.removal.sourceEndUs > secondsToUs(c.outSec) + 1_000) {
        errors.push(`Clip ${c.id} removal range falls outside the clip`);
      }
    }
  }
  for (const o of p.overlays) {
    dup(o.id);
    if (o.anchor && !sources.has(o.anchor.sourceId)) errors.push(`Overlay ${o.id} anchors to unknown source`);
  }
  for (const caption of p.captions) {
    dup(caption.id);
    const source = sources.get(caption.sourceId);
    if (!source) { errors.push(`Caption ${caption.id} references unknown source`); continue; }
    if (caption.sourceEndSec <= caption.sourceStartSec) errors.push(`Caption ${caption.id} has an invalid source range`);
    if (caption.sourceEndSec > source.meta.durationSec + 0.05) errors.push(`Caption ${caption.id} ends after its source`);
    for (const wordId of caption.wordIds || []) if (!wordIds.has(wordId)) errors.push(`Caption ${caption.id} references unknown word ${wordId}`);
  }
  for (const scene of p.scenes || []) {
    dup(scene.id);
    if (scene.endUs <= scene.startUs) errors.push(`Scene ${scene.id} has an invalid output range`);
    for (const wordId of scene.wordIds) if (!wordIds.has(wordId)) errors.push(`Scene ${scene.id} references unknown word ${wordId}`);
  }
  for (const effect of p.effects || []) {
    dup(effect.id);
    if (effect.durationUs <= 0) errors.push(`Effect ${effect.id} must have a positive duration`);
  }
  return errors.length ? { ok: false, errors } : { ok: true, errors: [], project: p };
}

/** Additional constraints that must hold before a render is queued. */
export function validateForExport(project) {
  const base = validateProject(project);
  if (!base.ok) return base;
  const errors = [];
  const tl = buildTimeline(project);
  if (!tl.segments.length) errors.push('Add at least one enabled clip');
  if (tl.durationSec < LIMITS.minOutputSec) errors.push(`Output must be at least ${LIMITS.minOutputSec}s (currently ${tl.durationSec.toFixed(1)}s)`);
  if (tl.durationSec > LIMITS.maxOutputSec + 1e-6) errors.push(`Output must be at most ${LIMITS.maxOutputSec}s (currently ${tl.durationSec.toFixed(1)}s) — trim or remove clips`);
  if (project.sources.length > 1 && project.canvasPolicy?.requiresFitSelection) {
    errors.push('Choose fit or fill for mixed-source footage before export');
  }
  for (const o of project.overlays) {
    if (o.needsReview) errors.push(`Text "${o.text.slice(0, 24)}" lost its footage after an edit — review or delete it`);
    else if (o.startFrame >= tl.totalFrames) errors.push(`Text "${o.text.slice(0, 24)}" starts after the video ends`);
  }
  if (maxSimultaneousOverlays(project.overlays) > LIMITS.maxSimultaneousOverlays) {
    errors.push(`At most ${LIMITS.maxSimultaneousOverlays} text layers may overlap`);
  }
  for (const scene of project.scenes || []) {
    if (scene.endUs > tl.durationUs) errors.push(`Scene ${scene.id} ends after the video`);
  }
  for (const effect of project.effects || []) {
    if (effect.startUs + effect.durationUs > tl.durationUs) errors.push(`Effect ${effect.id} ends after the video`);
  }
  return errors.length ? { ok: false, errors } : { ok: true, errors: [], timeline: tl };
}

export function maxSimultaneousOverlays(overlays) {
  const events = overlays.flatMap((o) => [[o.startFrame, 1], [o.startFrame + o.durationFrames, -1]]);
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0, max = 0;
  for (const [, d] of events) { cur += d; max = Math.max(max, cur); }
  return max;
}

// ───────────────────────────── Overlay evaluation ─────────────────────────────
/**
 * Deterministic overlay state at an output frame. The FFmpeg drawtext
 * expressions in server/reels/renderPlan.js implement the same formulas.
 */
export function overlayStateAt(overlay, frame) {
  const start = overlay.startFrame;
  const end = overlay.startFrame + overlay.durationFrames;
  if (frame < start || frame >= end) return null;
  const d = overlay.animation.durationFrames;
  const kind = overlay.animation.in;
  if (kind === 'none' || d === 0) return { alpha: 1, offsetY: 0 };
  const pIn = clamp((frame - start) / d, 0, 1);
  const pOut = clamp((end - frame) / d, 0, 1);
  const alpha = Math.min(pIn, pOut);
  const offsetY = kind === 'slide-up' ? SLIDE_DISTANCE * (1 - pIn) ** 2 : 0;
  return { alpha, offsetY };
}

// ───────────────────────────── Edit operations ─────────────────────────────
const touch = (p, patch) => ({ ...p, ...patch });

function reconcile(prev, next) {
  return reconcileOverlays(next);
}

/** Re-place source-anchored overlays after timeline changes; flag the ones whose footage was cut. */
export function reconcileOverlays(project) {
  const tl = buildTimeline(project);
  const overlays = project.overlays.map((o) => {
    if (o.anchorMode !== 'source' || !o.anchor) return o;
    const frame = sourceToOutputFrame(tl, o.anchor.sourceId, o.anchor.sourceSec);
    if (frame == null) return o.needsReview ? o : { ...o, needsReview: true };
    return { ...o, startFrame: frame, needsReview: false };
  });
  return { ...project, overlays };
}

export function addSource(project, source) {
  if (!source || project.sources.some((item) => item.id === source.id) || project.sources.length >= LIMITS.maxSources) return project;
  const base = ensureV2ProjectFields(project);
  const clip = createClip(source);
  const sources = [...base.sources, source];
  const sourceOrder = [...base.sourceOrder, source.id];
  const shouldUseDerivedCanvas = base.sources.length === 0 || base.canvasPolicy?.preset === 'source';
  const derived = deriveCanvasForSources(sources, base.canvas);
  const canvasPolicy = shouldUseDerivedCanvas
    ? derived.canvasPolicy
    : { ...base.canvasPolicy, requiresFitSelection: sources.length > 1 && base.canvasPolicy?.fit == null };
  return touch(base, {
    sources,
    sourceOrder,
    clips: [...base.clips, clip],
    canvas: shouldUseDerivedCanvas ? derived.canvas : base.canvas,
    canvasPolicy,
  });
}

export function splitAtFrame(project, frame) {
  const tl = buildTimeline(project);
  const hit = outputFrameToSource(tl, frame);
  if (!hit) return project;
  const { segment, sourceSec } = hit;
  const clip = project.clips[segment.clipIndex];
  const cut = round3(sourceSec);
  if (cut - clip.inSec < LIMITS.minClipSec || clip.outSec - cut < LIMITS.minClipSec) return project;
  const a = { ...clip, outSec: cut, fadeOutSec: 0 };
  const b = { ...clip, id: newId('c'), inSec: cut, fadeInSec: 0 };
  const clips = [...project.clips];
  clips.splice(segment.clipIndex, 1, a, b);
  return reconcile(project, touch(project, { clips }));
}

export function updateClip(project, clipId, patch) {
  const clips = project.clips.map((c) => {
    if (c.id !== clipId) return c;
    const next = { ...c, ...patch };
    const src = project.sources.find((s) => s.id === c.sourceId);
    const maxOut = src ? src.meta.durationSec : next.outSec;
    next.inSec = round3(clamp(next.inSec, 0, maxOut - LIMITS.minClipSec));
    next.outSec = round3(clamp(next.outSec, next.inSec + LIMITS.minClipSec, maxOut));
    next.speed = clamp(next.speed, LIMITS.minSpeed, LIMITS.maxSpeed);
    return next;
  });
  return reconcile(project, touch(project, { clips }));
}

export function moveClip(project, fromIndex, toIndex) {
  if (fromIndex === toIndex || toIndex < 0 || toIndex >= project.clips.length) return project;
  const clips = [...project.clips];
  const [c] = clips.splice(fromIndex, 1);
  clips.splice(toIndex, 0, c);
  return reconcile(project, touch(project, { clips }));
}

export function deleteClip(project, clipId) {
  return reconcile(project, touch(project, { clips: project.clips.filter((c) => c.id !== clipId) }));
}

function intervalToUs(interval) {
  const rawStart = interval?.startUs ?? interval?.sourceStartUs;
  const rawEnd = interval?.endUs ?? interval?.sourceEndUs;
  const startUs = Number.isFinite(rawStart)
    ? Math.round(rawStart)
    : (Number.isFinite(interval?.startSec) ? secondsToUs(interval.startSec) : null);
  const endUs = Number.isFinite(rawEnd)
    ? Math.round(rawEnd)
    : (Number.isFinite(interval?.endSec) ? secondsToUs(interval.endSec) : null);
  if (!interval?.sourceId || startUs == null || endUs == null || endUs <= startUs) return null;
  const candidateIds = [
    ...(Array.isArray(interval.candidateIds) ? interval.candidateIds : []),
    ...(interval.candidateId ? [interval.candidateId] : []),
    ...(interval.id ? [interval.id] : []),
  ].filter((id, index, values) => typeof id === 'string' && values.indexOf(id) === index);
  return { sourceId: interval.sourceId, startUs, endUs, candidateIds };
}

/**
 * Source intervals are canonicalised before every destructive-looking edit.
 * This prevents overlapping AI candidates from duplicating or reversing clip
 * ranges. Returned ranges retain the candidate IDs needed for restore/audit.
 */
export function unionSourceIntervals(intervals, { mergeAdjacentUs = 0 } = {}) {
  const bySource = new Map();
  for (const interval of intervals || []) {
    const normalized = intervalToUs(interval);
    if (!normalized) continue;
    const list = bySource.get(normalized.sourceId) || [];
    list.push(normalized);
    bySource.set(normalized.sourceId, list);
  }
  const unioned = [];
  for (const [sourceId, list] of [...bySource.entries()].sort(([a], [b]) => String(a).localeCompare(String(b)))) {
    list.sort((a, b) => a.startUs - b.startUs || a.endUs - b.endUs);
    let current = null;
    for (const item of list) {
      if (!current || item.startUs > current.endUs + mergeAdjacentUs) {
        if (current) unioned.push(current);
        current = { ...item, candidateIds: [...item.candidateIds] };
        continue;
      }
      current.endUs = Math.max(current.endUs, item.endUs);
      current.candidateIds = [...new Set([...current.candidateIds, ...item.candidateIds])];
    }
    if (current) unioned.push(current);
  }
  return unioned.map((interval) => ({
    ...interval,
    startSec: round6(usToSeconds(interval.startUs)),
    endSec: round6(usToSeconds(interval.endUs)),
  }));
}

/** Alias for callers that use generic interval terminology. */
export const unionIntervals = unionSourceIntervals;

/** Subtract protected source spans from removal candidates without changing source ordering. */
export function subtractSourceIntervals(intervals, protectedIntervals, { minDurationUs = secondsToUs(LIMITS.minClipSec) } = {}) {
  const removals = unionSourceIntervals(intervals);
  const blockersBySource = new Map();
  for (const blocker of unionSourceIntervals(protectedIntervals)) {
    const list = blockersBySource.get(blocker.sourceId) || [];
    list.push(blocker);
    blockersBySource.set(blocker.sourceId, list);
  }
  const output = [];
  for (const removal of removals) {
    let pieces = [removal];
    for (const blocker of blockersBySource.get(removal.sourceId) || []) {
      const next = [];
      for (const piece of pieces) {
        if (blocker.endUs <= piece.startUs || blocker.startUs >= piece.endUs) {
          next.push(piece);
          continue;
        }
        if (blocker.startUs > piece.startUs) {
          next.push({ ...piece, endUs: Math.min(piece.endUs, blocker.startUs) });
        }
        if (blocker.endUs < piece.endUs) {
          next.push({ ...piece, startUs: Math.max(piece.startUs, blocker.endUs) });
        }
      }
      pieces = next;
      if (!pieces.length) break;
    }
    output.push(...pieces.filter((piece) => piece.endUs - piece.startUs >= minDurationUs));
  }
  return unionSourceIntervals(output);
}

/**
 * Build removal spans that never cut across speech evidence. Explicitly
 * accepted semantic candidates may remove their own word IDs, but all other
 * words (including low-confidence/protected words) receive a guard band.
 */
export function speechSafeCleanupIntervals(candidates, wordAnchors, {
  guardUs = 120_000,
  minRemovalUs = secondsToUs(LIMITS.minClipSec),
  protectedWordIds = [],
} = {}) {
  const accepted = (candidates || []).filter((candidate) => candidate?.decision === 'accepted');
  const removableWordIds = new Set(accepted.flatMap((candidate) => candidate.wordIds || []));
  const alwaysProtected = new Set([
    ...protectedWordIds,
    ...accepted.flatMap((candidate) => candidate.protectedWordIds || []),
  ]);
  const blockers = (wordAnchors || [])
    .filter((word) => alwaysProtected.has(word.wordId) || !removableWordIds.has(word.wordId))
    .map((word) => ({
      sourceId: word.sourceId,
      startUs: Math.max(0, Math.round(word.startUs - guardUs)),
      endUs: Math.round(word.endUs + guardUs),
    }));
  return subtractSourceIntervals(accepted, blockers, { minDurationUs: minRemovalUs });
}

export const buildSpeechSafeCleanupIntervals = speechSafeCleanupIntervals;

/**
 * Remove source ranges from enabled clips. Legacy `{ startSec, endSec }`
 * gaps still work, while v2 callers can supply microseconds and candidate IDs.
 * The disabled clips are intentional: they are the exact restoration record.
 */
export function applyGapRemoval(project, gaps, { fadeSec = 0 } = {}) {
  const base = ensureV2ProjectFields(project);
  const removals = unionSourceIntervals(gaps);
  if (!removals.length) return base;
  const clips = [];
  const minClipUs = secondsToUs(LIMITS.minClipSec);
  for (const clip of base.clips) {
    const clipStartUs = secondsToUs(clip.inSec);
    const clipEndUs = secondsToUs(clip.outSec);
    const relevant = removals.filter((gap) => gap.sourceId === clip.sourceId && gap.endUs > clipStartUs && gap.startUs < clipEndUs);
    if (!clip.enabled || !relevant.length) { clips.push(clip); continue; }
    let cursorUs = clipStartUs;
    let first = true;
    const originalOrigin = clip.removal?.originalOrigin || (clip.origin === 'gap-removal' ? 'user' : clip.origin);
    const pushPiece = (startUs, endUs, enabled, removal = null) => {
      if (endUs - startUs < minClipUs) return;
      const candidateIds = removal?.candidateIds || [];
      const afterRemoval = !enabled && fadeSec > 0;
      clips.push({
        ...clip,
        id: first ? clip.id : newId('c'),
        inSec: round6(usToSeconds(startUs)),
        outSec: round6(usToSeconds(endUs)),
        enabled,
        origin: enabled ? originalOrigin : 'gap-removal',
        fadeInSec: first ? clip.fadeInSec : (afterRemoval ? Math.min(fadeSec, (endUs - startUs) / (2 * MICROSECONDS_PER_SECOND)) : 0),
        fadeOutSec: enabled ? clip.fadeOutSec : 0,
        cleanupCandidateIds: enabled ? (clip.cleanupCandidateIds || []) : [...new Set([...(clip.cleanupCandidateIds || []), ...candidateIds])],
        removal: enabled ? null : {
          sourceStartUs: startUs,
          sourceEndUs: endUs,
          candidateIds,
          originalOrigin,
        },
      });
      first = false;
    };
    for (const removal of relevant) {
      const startUs = Math.max(removal.startUs, clipStartUs, cursorUs);
      const endUs = Math.min(removal.endUs, clipEndUs);
      if (endUs <= startUs) continue;
      pushPiece(cursorUs, startUs, true);
      pushPiece(startUs, endUs, false, removal);
      cursorUs = endUs;
    }
    pushPiece(cursorUs, clipEndUs, true);
  }
  return reconcile(base, touch(base, { clips }));
}

/** Apply only explicitly accepted v2 candidates, after word-boundary protection. */
export function applyCleanupCandidates(project, candidates = project?.cleanup?.candidates || [], options = {}) {
  const base = ensureV2ProjectFields(project);
  const cleanup = {
    ...base.cleanup,
    candidates: [...candidates],
    protectedWordIds: options.protectedWordIds || base.cleanup.protectedWordIds,
  };
  const safeIntervals = speechSafeCleanupIntervals(cleanup.candidates, options.wordAnchors || base.wordAnchors, {
    guardUs: options.guardUs,
    minRemovalUs: options.minRemovalUs,
    protectedWordIds: cleanup.protectedWordIds,
  });
  const applied = applyGapRemoval({ ...base, cleanup }, safeIntervals, { fadeSec: options.fadeSec ?? 0.04 });
  return {
    ...applied,
    cleanup: {
      ...cleanup,
      appliedAt: safeIntervals.length ? (options.now || new Date().toISOString()) : cleanup.appliedAt,
    },
  };
}

/** Restore selected ranges from disabled cleanup clips while preserving unselected removals. */
export function restoreSourceSpans(project, spans) {
  const base = ensureV2ProjectFields(project);
  const restores = unionSourceIntervals(spans);
  if (!restores.length) return base;
  const minClipUs = secondsToUs(LIMITS.minClipSec);
  const clips = [];
  for (const clip of base.clips) {
    if (clip.enabled) { clips.push(clip); continue; }
    const clipStartUs = secondsToUs(clip.inSec);
    const clipEndUs = secondsToUs(clip.outSec);
    const relevant = restores.filter((span) => span.sourceId === clip.sourceId && span.endUs > clipStartUs && span.startUs < clipEndUs);
    if (!relevant.length) { clips.push(clip); continue; }
    let cursorUs = clipStartUs;
    let first = true;
    const originalOrigin = clip.removal?.originalOrigin || 'user';
    const pushPiece = (startUs, endUs, enabled) => {
      if (endUs - startUs < minClipUs) return;
      clips.push({
        ...clip,
        id: first ? clip.id : newId('c'),
        inSec: round6(usToSeconds(startUs)),
        outSec: round6(usToSeconds(endUs)),
        enabled,
        origin: enabled ? originalOrigin : 'gap-removal',
        removal: enabled ? null : {
          sourceStartUs: startUs,
          sourceEndUs: endUs,
          candidateIds: clip.removal?.candidateIds || clip.cleanupCandidateIds || [],
          originalOrigin,
        },
      });
      first = false;
    };
    for (const restore of relevant) {
      const startUs = Math.max(restore.startUs, clipStartUs, cursorUs);
      const endUs = Math.min(restore.endUs, clipEndUs);
      if (endUs <= startUs) continue;
      pushPiece(cursorUs, startUs, false);
      pushPiece(startUs, endUs, true);
      cursorUs = endUs;
    }
    pushPiece(cursorUs, clipEndUs, false);
  }
  return reconcile(base, touch(base, { clips }));
}

export function restoreSourceSpan(project, span) {
  return restoreSourceSpans(project, [span]);
}

/** Restore every source span associated with confirmed cleanup candidate IDs. */
export function restoreCleanupCandidates(project, candidateIds) {
  const base = ensureV2ProjectFields(project);
  const ids = new Set(Array.isArray(candidateIds) ? candidateIds : [candidateIds]);
  const candidates = base.cleanup.candidates.filter((candidate) => ids.has(candidate.id));
  if (!candidates.length) return base;
  const restored = restoreSourceSpans(base, candidates.map((candidate) => ({
    sourceId: candidate.sourceId,
    startUs: candidate.startUs,
    endUs: candidate.endUs,
    candidateIds: [candidate.id],
  })));
  return {
    ...restored,
    cleanup: {
      ...restored.cleanup,
      candidates: restored.cleanup.candidates.map((candidate) => ids.has(candidate.id)
        ? { ...candidate, decision: 'restored' }
        : candidate),
    },
  };
}

/**
 * Convert raw silence intervals into removable gap proposals, keeping padding
 * on both sides so word boundaries and breaths are preserved.
 */
export function proposeGaps(silences, { sourceId, minGapSec = 0.6, paddingSec = 0.15 }) {
  return silences
    .map((s, i) => {
      const startSec = round3(s.startSec + paddingSec);
      const endSec = round3(s.endSec - paddingSec);
      return {
        id: `gap${i}`,
        sourceId,
        silenceStartSec: s.startSec,
        silenceEndSec: s.endSec,
        startSec,
        endSec,
        startUs: secondsToUs(startSec),
        endUs: secondsToUs(endSec),
        kind: 'pause',
        decision: 'proposed',
        reason: 'Detected acoustic pause',
        confidence: null,
        wordIds: [],
        protectedWordIds: [],
      };
    })
    .filter((g) => g.endSec - g.startSec >= Math.max(minGapSec - 2 * paddingSec, LIMITS.minClipSec));
}

export function addTextOverlay(project, frame, patch = {}) {
  const tl = buildTimeline(project);
  const hit = outputFrameToSource(tl, frame);
  const overlay = {
    id: newId('t'),
    kind: 'text',
    text: 'Your hook here',
    startFrame: Math.max(0, frame),
    durationFrames: Math.round(tl.fps * 3),
    anchorMode: hit ? 'source' : 'output',
    anchor: hit ? { sourceId: hit.segment.sourceId, sourceSec: round3(hit.sourceSec) } : null,
    needsReview: false,
    style: { x: 0.5, y: 0.22, fontSize: 84, color: '#FFFFFF', boxColor: '#000000', boxOpacity: 0.55, font: 'poppins' },
    animation: { in: 'slide-up', durationFrames: 9 },
    templateId: null,
    templateVersion: null,
    ...patch,
  };
  return touch(project, { overlays: [...project.overlays, brandLayer(overlay, project.brand)] });
}

export function updateOverlay(project, overlayId, patch) {
  const tl = buildTimeline(project);
  const overlays = project.overlays.map((o) => {
    if (o.id !== overlayId) return o;
    const next = { ...o, ...patch, style: { ...o.style, ...(patch.style || {}) }, animation: { ...o.animation, ...(patch.animation || {}) } };
    if (patch.startFrame !== undefined) {
      // Re-anchor to whatever footage is now under the overlay start.
      const hit = outputFrameToSource(tl, next.startFrame);
      next.anchor = hit ? { sourceId: hit.segment.sourceId, sourceSec: round3(hit.sourceSec) } : null;
      next.needsReview = false;
      if (!hit) next.anchorMode = 'output';
    }
    return next;
  });
  return touch(project, { overlays });
}

export function removeOverlay(project, overlayId) {
  return touch(project, { overlays: project.overlays.filter((o) => o.id !== overlayId) });
}
