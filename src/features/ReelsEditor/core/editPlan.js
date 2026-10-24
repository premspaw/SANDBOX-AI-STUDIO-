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

export const SCHEMA_VERSION = 1;
export const RENDERER = Object.freeze({ name: 'zerolens-ffmpeg', version: '1.0.0' });

export const LIMITS = Object.freeze({
  minOutputSec: 5,
  maxOutputSec: 60,
  maxSourceSec: 120,
  maxSources: 8,
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
  poppins: { label: 'Poppins Bold', file: 'Poppins-Bold.ttf', family: 'ZL Poppins Bold' },
  'noto-kannada': { label: 'Noto Sans Kannada', file: 'NotoSansKannada.ttf', family: 'ZL Noto Kannada' },
});

export const ANIMATIONS = Object.freeze(['none', 'fade', 'slide-up']);
/** Pixel distance (at 1080-wide canvas) of the slide-up entrance. */
export const SLIDE_DISTANCE = 80;

// ───────────────────────────── Schema ─────────────────────────────
const Id = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, 'Invalid id');
const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colour must be #RRGGBB');
const Unit = z.number().min(0).max(1);
const Int = z.number().int();

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
});

const Audio = z.strictObject({
  denoise: z.strictObject({ enabled: z.boolean(), strength: z.enum(['light', 'medium']) }),
  normalize: z.strictObject({ enabled: z.boolean(), targetLufs: z.number().min(-24).max(-9) }),
});

export const ProjectSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: Id,
  ownerId: z.string().min(1).max(80),
  revision: Int.min(0),
  name: z.string().min(1).max(120),
  canvas: z.strictObject({
    width: z.literal(1080),
    height: z.literal(1920),
    fps: z.strictObject({ num: z.literal(30), den: z.literal(1) }),
  }),
  sources: z.array(Source).max(LIMITS.maxSources),
  clips: z.array(Clip).max(LIMITS.maxClips),
  overlays: z.array(Overlay).max(LIMITS.maxOverlays),
  captions: z.array(Caption).max(1000),
  audio: Audio,
  renderer: z.strictObject({ name: z.literal(RENDERER.name), version: z.string().max(20) }),
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40),
});

// ───────────────────────────── Factories ─────────────────────────────
export const newId = (prefix = '') =>
  `${prefix}${(globalThis.crypto?.randomUUID?.() || `${Date.now()}${Math.random()}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 20)}`;

export function createEmptyProject({ id, ownerId, name = 'Untitled reel', now = new Date().toISOString() }) {
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    ownerId,
    revision: 0,
    name,
    canvas: { width: 1080, height: 1920, fps: { num: 30, den: 1 } },
    sources: [],
    clips: [],
    overlays: [],
    captions: [],
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
    outSec: round3(Math.min(source.meta.durationSec, LIMITS.maxOutputSec)),
    speed: 1,
    audioPolicy: 'preserve-pitch',
    enabled: true,
    origin: 'user',
    volume: 1,
    muted: false,
    fadeInSec: 0,
    fadeOutSec: 0,
    crop: { mode: 'fill', focusX: 0.5, focusY: 0.5, zoom: 1 },
    ...overrides,
  };
}

// ───────────────────────────── Timeline ─────────────────────────────
export const round3 = (n) => Math.round(n * 1000) / 1000;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

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
    segments.push({
      clipId: clip.id,
      clipIndex: index,
      sourceId: clip.sourceId,
      inSec: clip.inSec,
      outSec: clip.outSec,
      speed: clip.speed,
      startFrame: cursor,
      endFrame: cursor + frames,
    });
    cursor += frames;
  });
  return { fps, segments, totalFrames: cursor, durationSec: cursor / fps };
}

/** Output frame → { segment, sourceSec }, or null outside the timeline. */
export function outputFrameToSource(timeline, frame) {
  const seg = timeline.segments.find((s) => frame >= s.startFrame && frame < s.endFrame);
  if (!seg) return null;
  const sourceSec = seg.inSec + ((frame - seg.startFrame) / timeline.fps) * seg.speed;
  return { segment: seg, sourceSec: Math.min(sourceSec, seg.outSec) };
}

/** Source moment → output frame, or null when that moment is cut/disabled. */
export function sourceToOutputFrame(timeline, sourceId, sourceSec) {
  const seg = timeline.segments.find((s) => s.sourceId === sourceId && sourceSec >= s.inSec && sourceSec < s.outSec);
  if (!seg) return null;
  return seg.startFrame + Math.round(((sourceSec - seg.inSec) / seg.speed) * timeline.fps);
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
  for (const c of p.clips) {
    dup(c.id);
    const src = sources.get(c.sourceId);
    if (!src) { errors.push(`Clip ${c.id} references unknown source`); continue; }
    if (c.outSec - c.inSec < LIMITS.minClipSec - 1e-6) errors.push(`Clip ${c.id} is shorter than ${LIMITS.minClipSec}s`);
    if (c.outSec > src.meta.durationSec + 0.05) errors.push(`Clip ${c.id} ends after its source`);
  }
  for (const o of p.overlays) {
    dup(o.id);
    if (o.anchor && !sources.has(o.anchor.sourceId)) errors.push(`Overlay ${o.id} anchors to unknown source`);
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
  for (const o of project.overlays) {
    if (o.needsReview) errors.push(`Text "${o.text.slice(0, 24)}" lost its footage after an edit — review or delete it`);
    else if (o.startFrame >= tl.totalFrames) errors.push(`Text "${o.text.slice(0, 24)}" starts after the video ends`);
  }
  if (maxSimultaneousOverlays(project.overlays) > LIMITS.maxSimultaneousOverlays) {
    errors.push(`At most ${LIMITS.maxSimultaneousOverlays} text layers may overlap`);
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
  const clip = createClip(source);
  return touch(project, { sources: [...project.sources, source], clips: [...project.clips, clip] });
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

/**
 * Remove accepted gaps (source ranges) from enabled clips. Removed ranges are
 * kept as disabled clips in place so they can be restored individually.
 */
export function applyGapRemoval(project, gaps) {
  const clips = [];
  for (const clip of project.clips) {
    const relevant = gaps
      .filter((g) => g.sourceId === clip.sourceId && g.endSec > clip.inSec && g.startSec < clip.outSec)
      .sort((a, b) => a.startSec - b.startSec);
    if (!clip.enabled || !relevant.length) { clips.push(clip); continue; }
    let cursor = clip.inSec;
    let first = true;
    const pushPiece = (inSec, outSec, enabled) => {
      if (outSec - inSec < LIMITS.minClipSec) return;
      clips.push({
        ...clip,
        id: first ? clip.id : newId('c'),
        inSec: round3(inSec),
        outSec: round3(outSec),
        enabled,
        origin: enabled ? clip.origin : 'gap-removal',
        fadeInSec: first ? clip.fadeInSec : 0,
        fadeOutSec: 0,
      });
      first = false;
    };
    for (const g of relevant) {
      const s = Math.max(g.startSec, clip.inSec);
      const e = Math.min(g.endSec, clip.outSec);
      pushPiece(cursor, s, true);
      pushPiece(s, e, false);
      cursor = e;
    }
    pushPiece(cursor, clip.outSec, true);
  }
  return reconcile(project, touch(project, { clips }));
}

/**
 * Convert raw silence intervals into removable gap proposals, keeping padding
 * on both sides so word boundaries and breaths are preserved.
 */
export function proposeGaps(silences, { sourceId, minGapSec = 0.6, paddingSec = 0.15 }) {
  return silences
    .map((s, i) => ({
      id: `gap${i}`,
      sourceId,
      silenceStartSec: s.startSec,
      silenceEndSec: s.endSec,
      startSec: round3(s.startSec + paddingSec),
      endSec: round3(s.endSec - paddingSec),
    }))
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
  return touch(project, { overlays: [...project.overlays, overlay] });
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
