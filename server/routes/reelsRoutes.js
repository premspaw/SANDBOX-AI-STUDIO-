/**
 * Reels Editor API — /api/reels/*
 *
 * Every project/media/job request is authorised against the authenticated
 * owner; client-supplied owner ids or file paths are never trusted. Renders
 * and analysis are queued — no HTTP request performs a full render.
 */
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import * as store from '../reels/store.js';
import { probeMedia, sha256File, FFMPEG_RUNTIME } from '../reels/media.js';
import { enqueue, cancelJob, startWorker, isTerminal } from '../reels/jobQueue.js';
import { getAvailableEngines, executeAiEdit } from '../reels/aiEditor.js';
import {
  createEmptyProject, addSource, newId, validateForExport, LIMITS, FONTS, RENDERER, buildTimeline,
} from '../../src/features/ReelsEditor/core/editPlan.js';

const MAX_UPLOAD_MB = Number(process.env.REELS_MAX_UPLOAD_MB) || 250;
const MAX_SOURCE_SEC = Number(process.env.REELS_MAX_SOURCE_SEC) || LIMITS.maxSourceSec;
const MEDIA_TTL_SEC = 15 * 60;
const MEDIA_SECRET = process.env.REELS_MEDIA_SECRET && Buffer.byteLength(process.env.REELS_MEDIA_SECRET)>=32
  ? process.env.REELS_MEDIA_SECRET : crypto.randomBytes(32).toString('hex');

const isLoopback = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket?.remoteAddress);

// ───────────────────────── Signed media URLs ─────────────────────────
function signMedia(payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, e: Math.floor(Date.now() / 1000) + MEDIA_TTL_SEC })).toString('base64url');
  const sig = crypto.createHmac('sha256', MEDIA_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verifyMedia(token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', MEDIA_SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  return payload.e > Date.now() / 1000 ? payload : null;
}

function streamFile(req, res, filePath, { contentType, downloadName } = {}) {
  const stat = fs.statSync(filePath);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', contentType || 'video/mp4');
  res.setHeader('Cache-Control', 'private, max-age=600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (downloadName) res.setHeader('Content-Disposition', `attachment; filename="${downloadName.replace(/[^\w.-]+/g, '_')}"`);
  const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if (range) {
    let start = range[1] ? Number(range[1]) : stat.size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : stat.size - 1;
    if (!range[1]) end = stat.size - 1;
    if (start >= stat.size || start > end) {
      res.setHeader('Content-Range', `bytes */${stat.size}`);
      return res.status(416).end();
    }
    end = Math.min(end, stat.size - 1);
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
    res.setHeader('Content-Length', end - start + 1);
    return fs.createReadStream(filePath, { start, end }).pipe(res);
  }
  res.setHeader('Content-Length', stat.size);
  return fs.createReadStream(filePath).pipe(res);
}

const publicJob = (j) => ({
  id: j.id, type: j.type, projectId: j.projectId, revision: j.revision, status: j.status, stage: j.stage,
  progress: j.progress, error: j.error, note: j.note || null, output: j.output, result: j.result,
  metrics: j.metrics, params: j.params, createdAt: j.createdAt, startedAt: j.startedAt, finishedAt: j.finishedAt,
});

export default function createReelsRouter(deps) {
  const router = express.Router();
  startWorker();

  /** Authenticated owner. Local dev without a Supabase session falls back to a fixed dev owner on loopback only. */
  async function getOwner(req) {
    try {
      const user = await deps.requireAuth(req);
      if (user?.id) return String(user.id);
    } catch (err) {
      const noHeader = !req.headers.authorization;
      if (noHeader && process.env.NODE_ENV !== 'production' && process.env.REELS_DEV_AUTH !== 'off' && isLoopback(req)) {
        return 'local-dev-user';
      }
      throw err;
    }
    throw Object.assign(new Error('Sign in required'), { status: 401 });
  }

  const handle = (fn) => async (req, res, next) => {
    try {
      req.ownerId = await getOwner(req);
    } catch (err) {
      return res.status(err.status === 503 ? 503 : 401).json({ error: err.status === 503 ? 'Authentication service unavailable' : 'Sign in required' });
    }
    try {
      await fn(req, res, next);
    } catch (err) {
      const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
      if (status === 500) console.error('[REELS]', err);
      res.status(status).json({
        error: status === 500 ? 'Internal error' : err.message,
        ...(err.errors ? { errors: err.errors } : {}),
        ...(status === 409 && err.current ? { current: err.current } : {}),
      });
    }
  };

  const loadProject = async (req) => {
    const p = await store.getProject(req.ownerId, store.assertId(req.params.id, 'project'));
    if (!p) throw Object.assign(new Error('Project not found'), { status: 404 });
    return p;
  };
  const loadJob = async (req) => {
    const j = await store.getJob(store.assertId(req.params.jobId, 'job'));
    if (!j || j.ownerId !== req.ownerId) throw Object.assign(new Error('Job not found'), { status: 404 });
    return j;
  };

  // ───────────────────────── Capabilities ─────────────────────────
  router.get('/config', handle(async (req, res) => {
    res.json({
      limits: { ...LIMITS, maxUploadMb: MAX_UPLOAD_MB, maxSourceSec: MAX_SOURCE_SEC },
      renderer: { ...RENDERER, available: FFMPEG_RUNTIME.available, error: FFMPEG_RUNTIME.error },
      fonts: Object.entries(FONTS).map(([id, f]) => ({ id, label: f.label, family: f.family, url: `/api/reels/fonts/${f.file}` })),
      capabilities: {
        manualEditing: { available: true },
        silenceDetection: { available: true, note: 'Acoustic silence only — not semantic repetition analysis.' },
        denoise: { available: true, note: 'FFmpeg afftdn; audible in rendered previews/exports only.' },
        normalize: { available: true, note: 'FFmpeg loudnorm (single pass).' },
        speed: { available: true, note: 'Constant speed 0.25×–4×. Slowed footage repeats source frames; no interpolation.' },
        transcription: { available: getAvailableEngines().some(e=>e.available), note: 'Selected provider analyzes compressed speech audio; timing is approximate.' },
        storyPlanning: { available: getAvailableEngines().some(e=>e.available), note: 'Uses speech/transcript and existing timeline context.' },
        templates: { available: true, note: 'Six brand-aware text and card presets.' },
        autoCutout: { available: false, note: 'Requires a segmentation model — not configured.' },
      },
      processing: 'Footage is stored and rendered on the server. AI editing sends transcript and timeline context to the selected provider, plus compressed speech audio when no transcript is supplied.',
    });
  }));

  // Fonts are public, licensed (OFL) assets so the preview uses the exact files the renderer uses.
  router.get('/fonts/:file', (req, res) => {
    const font = Object.values(FONTS).find((f) => f.file === req.params.file);
    if (!font) return res.status(404).end();
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.type('font/ttf').sendFile(path.join(store.paths.fonts(), font.file));
  });

  // ───────────────────────── Projects ─────────────────────────
  router.get('/projects', handle(async (req, res) => {
    res.json({ projects: await store.listProjects(req.ownerId) });
  }));

  router.post('/projects', express.json({ limit: '16kb' }), handle(async (req, res) => {
    const name = String(req.body?.name || 'Untitled reel').trim().slice(0, 120) || 'Untitled reel';
    const project = createEmptyProject({ id: newId('p'), ownerId: req.ownerId, name });
    await store.createProject(req.ownerId, project);
    res.status(201).json({ project });
  }));

  router.get('/projects/:id', handle(async (req, res) => {
    res.json({ project: await loadProject(req) });
  }));

  router.put('/projects/:id', express.json({ limit: '2mb' }), handle(async (req, res) => {
    const { baseRevision, project } = req.body || {};
    if (!Number.isInteger(baseRevision) || !project || typeof project !== 'object') {
      return res.status(400).json({ error: 'baseRevision and project are required' });
    }
    const saved = await store.saveRevision(req.ownerId, store.assertId(req.params.id, 'project'), { baseRevision, incoming: project });
    res.json({ project: saved });
  }));

  router.delete('/projects/:id', handle(async (req, res) => {
    const ok = await store.deleteProject(req.ownerId, store.assertId(req.params.id, 'project'));
    res.status(ok ? 204 : 404).end();
  }));

  // ───────────────────────── AI Auto-Editor & Engines ─────────────────────────
  router.get('/ai-engines', handle(async (req, res) => {
    res.json({ engines: getAvailableEngines() });
  }));

  let activeAi = 0;
  router.post('/projects/:id/ai-edit', express.json({ limit: '64kb' }), handle(async (req, res) => {
    const project = await loadProject(req);
    const {
      engine = 'gemini',
      style = 'viral-hook',
      removeGaps = true,
      userPrompt = '',
      scriptText = '',
      referenceNotes = '',
      proofNotes = '',
    } = req.body || {};
    if(activeAi >= 1) return res.status(429).json({error:'AI editor is busy. Try again shortly.'});
    activeAi++;
    try {
    const result = await executeAiEdit({
      project,
      ownerId: req.ownerId,
      engine,
      style,
      removeGaps: Boolean(removeGaps),
      userPrompt,
      scriptText,
      referenceNotes,
      proofNotes,
    });
    const saved = await store.saveRevision(req.ownerId, project.id, {
      baseRevision: project.revision, incoming: result.project,
    });
    res.json({
      project: saved,
      engineUsed: result.engineUsed,
      overlaysCount: result.overlaysCount,
      silenceRemoved: result.silenceRemoved,
      paperEditSummary: result.paperEditSummary,
    });
    } finally { activeAi--; }
  }));

  // ───────────────────────── Source upload ─────────────────────────
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => fsp.mkdir(store.paths.uploadTmp(), { recursive: true }).then(() => cb(null, store.paths.uploadTmp()), cb),
      filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}.upload`),
    }),
    limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1, fields: 4 },
    fileFilter: (req, file, cb) => cb(null, /^video\//.test(file.mimetype) || file.mimetype === 'application/octet-stream'),
  });

  router.post('/projects/:id/sources', handle(async (req,res,next) => {
    await store.ensureDirs();
    const disk = await fsp.statfs(store.DATA_ROOT);
    if (disk.bavail * disk.bsize < 2 * 1024 ** 3) return res.status(507).json({error:'Media storage is nearly full. Delete unused projects before uploading.'});
    next();
  }), upload.single('file'), handle(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Attach a video file in the "file" field' });
    const tmp = req.file.path;
    try {
      const project = await loadProject(req);
      if (project.sources.length >= LIMITS.maxSources) {
        return res.status(422).json({ error: `At most ${LIMITS.maxSources} source clips per project` });
      }
      let probe;
      try { probe = await probeMedia(tmp); } catch { probe = null; }
      if (!probe?.hasVideo) return res.status(422).json({ error: 'That file is not a readable video' });
      if (!(probe.durationSec > 0)) return res.status(422).json({ error: 'Could not measure the video duration' });
      if (probe.durationSec > MAX_SOURCE_SEC + 0.5) {
        return res.status(422).json({ error: `This clip is ${probe.durationSec.toFixed(1)}s. The current limit is ${MAX_SOURCE_SEC}s per source clip — trim it before uploading.` });
      }
      if(Math.max(probe.width,probe.height)>3840 || probe.width*probe.height>3840*2160)return res.status(422).json({error:'Upload footage up to 4K resolution.'});
      const checksum = await sha256File(tmp);
      const source = {
        id: newId('s'),
        checksum,
        filename: String(req.file.originalname || 'clip').slice(0, 200),
        bytes: req.file.size,
        meta: {
          durationSec: Math.round(probe.durationSec * 1000) / 1000,
          width: probe.width, height: probe.height, rotation: probe.rotation,
          fpsNum: probe.fpsNum, fpsDen: probe.fpsDen, variableFrameRate: probe.variableFrameRate,
          hasAudio: probe.hasAudio, videoCodec: probe.videoCodec, audioCodec: probe.audioCodec,
        },
      };
      const dest = store.paths.media(req.ownerId, source.id);
      await fsp.mkdir(path.dirname(dest), { recursive: true });
      await fsp.rename(tmp, dest).catch(async () => { await fsp.copyFile(tmp, dest); });
      await fsp.chmod(dest, 0o440).catch(() => {});
      const saved = await store.saveRevision(req.ownerId, project.id, { mutate: (cur) => addSource(cur, source) });
      const warnings = [];
      if (probe.durationSec > LIMITS.maxOutputSec) warnings.push(`Clip is ${probe.durationSec.toFixed(1)}s; the first ${LIMITS.maxOutputSec}s were selected. Adjust the trim to choose a different 60s segment.`);
      if (probe.variableFrameRate) warnings.push('Variable frame rate detected — export normalises to constant 30 fps.');
      if (probe.isHdr) warnings.push('HDR footage detected — export is SDR (BT.709) without tone-mapping, so colours may look flat.');
      if (!probe.hasAudio) warnings.push('This clip has no audio track.');
      if (!['h264', 'vp8', 'vp9', 'av1'].includes(probe.videoCodec)) warnings.push(`Codec ${probe.videoCodec} may not play in this browser; export still works.`);
      res.status(201).json({ project: saved, source, warnings });
    } finally {
      await fsp.rm(tmp, { force: true }).catch(() => {});
    }
  }));

  router.get('/projects/:id/sources/:sourceId/url', handle(async (req, res) => {
    const project = await loadProject(req);
    const src = project.sources.find((s) => s.id === req.params.sourceId);
    if (!src) return res.status(404).json({ error: 'Source not found' });
    const token = signMedia({ k: 'src', o: req.ownerId, f: src.id });
    res.json({ url: `/api/reels/media/${token}`, expiresInSec: MEDIA_TTL_SEC });
  }));

  // Token-authorised streaming (video elements cannot send Authorization headers).
  router.get('/media/:token', async (req, res) => {
    const payload = verifyMedia(req.params.token);
    if (!payload) return res.status(403).json({ error: 'Link expired' });
    try {
      if (payload.k === 'src') {
        const p = store.paths.media(payload.o, payload.f);
        if (!store.fileExists(p)) return res.status(404).end();
        return streamFile(req, res, p, { contentType: 'video/mp4' });
      }
      if (payload.k === 'out') {
        const job = await store.getJob(payload.f);
        if (!job || job.ownerId !== payload.o || job.status !== 'succeeded') return res.status(404).end();
        const p = store.paths.export(payload.o, job.id);
        if (!store.fileExists(p)) return res.status(404).end();
        return streamFile(req, res, p, { downloadName: payload.d ? payload.n : undefined });
      }
      res.status(400).end();
    } catch {
      res.status(400).end();
    }
  });

  // ───────────────────────── Jobs ─────────────────────────
  router.post('/projects/:id/analyze/silence', express.json({ limit: '8kb' }), handle(async (req, res) => {
    const project = await loadProject(req);
    const { sourceId } = req.body || {};
    if (!project.sources.some((s) => s.id === sourceId)) return res.status(404).json({ error: 'Source not found' });
    const clampN = (v, lo, hi, d) => (Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Number(v))) : d);
    const job = await enqueue({
      id: newId('j'), ownerId: req.ownerId, projectId: project.id, revision: project.revision, type: 'silence',
      params: {
        sourceId,
        noiseDb: clampN(req.body.noiseDb, -60, -20, -35),
        minSilenceSec: clampN(req.body.minSilenceSec, 0.3, 3, 0.6),
        paddingSec: clampN(req.body.paddingSec, 0, 0.5, 0.15),
      },
      snapshot: project,
    });
    res.status(202).json({ job: publicJob(job) });
  }));

  router.post('/projects/:id/renders', express.json({ limit: '8kb' }), handle(async (req, res) => {
    const project = await loadProject(req);
    if (!FFMPEG_RUNTIME.available) return res.status(503).json({error:FFMPEG_RUNTIME.error});
    const profile = req.body?.profile === 'preview' ? 'preview' : 'export';
    const revision = Number(req.body?.revision);
    // Export renders exactly the requested saved revision.
    const snapshot = Number.isInteger(revision) && revision !== project.revision
      ? await store.getRevision(req.ownerId, project.id, revision)
      : project;
    if (!snapshot) return res.status(404).json({ error: 'Revision not found' });

    const check = validateForExport(snapshot);
    if (!check.ok) return res.status(422).json({ error: check.errors[0], errors: check.errors });

    let range = null;
    if (profile === 'preview') {
      const total = buildTimeline(snapshot).totalFrames;
      const fps = 30;
      const start = Math.max(0, Math.min(total - 1, Math.round(Number(req.body?.startFrame) || 0)));
      const len = Math.round(Math.min(5, Math.max(2, Number(req.body?.durationSec) || 4)) * fps);
      range = { startFrame: start, endFrame: Math.min(total, start + len) };
    }

    const idem = String(req.headers['idempotency-key'] || '').slice(0, 80) || null;
    const mine = await store.listJobs((j) => j.ownerId === req.ownerId && j.type === 'render');
    if (idem) {
      const dupe = mine.find((j) => j.idempotencyKey === idem);
      if (dupe) return res.status(200).json({ job: publicJob(dupe) });
    }
    const active = mine.filter((j) => !isTerminal(j.status) && j.params.profile === profile);
    if (profile === 'export' && active.length >= 1) {
      return res.status(429).json({ error: 'An export is already running. Wait for it or cancel it first.', job: publicJob(active[0]) });
    }
    // Supersede older previews for this project instead of piling them up.
    if (profile === 'preview') for (const j of active.filter((x) => x.projectId === project.id)) await cancelJob(j);

    const job = await enqueue({
      id: newId('j'), ownerId: req.ownerId, projectId: project.id, revision: snapshot.revision, type: 'render',
      idempotencyKey: idem, params: { profile, range }, snapshot,
    });
    res.status(202).json({ job: publicJob(job) });
  }));

  router.get('/projects/:id/jobs', handle(async (req, res) => {
    const project = await loadProject(req);
    const jobs = await store.listJobs((j) => j.ownerId === req.ownerId && j.projectId === project.id && j.type === 'render' && j.params.profile === 'export');
    res.json({ jobs: jobs.slice(-10).reverse().map(publicJob) });
  }));

  router.get('/jobs/:jobId', handle(async (req, res) => {
    res.json({ job: publicJob(await loadJob(req)) });
  }));

  router.post('/jobs/:jobId/cancel', handle(async (req, res) => {
    res.json({ job: publicJob(await cancelJob(await loadJob(req))) });
  }));

  router.get('/jobs/:jobId/url', handle(async (req, res) => {
    const job = await loadJob(req);
    if (job.status !== 'succeeded' || job.type !== 'render') return res.status(409).json({ error: 'Output not ready' });
    const name = `${(job.snapshot?.name || 'reel').slice(0, 60)}-rev${job.revision}${job.params.profile === 'preview' ? '-preview' : ''}.mp4`;
    res.json({
      playUrl: `/api/reels/media/${signMedia({ k: 'out', o: req.ownerId, f: job.id })}`,
      downloadUrl: `/api/reels/media/${signMedia({ k: 'out', o: req.ownerId, f: job.id, d: 1, n: name })}`,
      fileName: name,
      expiresInSec: MEDIA_TTL_SEC,
    });
  }));

  return router;
}
