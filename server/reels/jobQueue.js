/**
 * Durable, bounded job queue for Reels rendering and analysis.
 *
 * - Jobs persist as JSON records (queued → running → succeeded/failed/cancelled).
 * - One worker loop per deployment (instance 0 only under PM2 cluster mode);
 *   concurrency defaults to 1 render at a time — raise only after benchmarking.
 * - FFmpeg runs as a child process with its own thread cap and timeout, so a
 *   render never executes inside an HTTP request.
 * - Heartbeats + startup recovery requeue jobs interrupted by a restart;
 *   deterministic failures (bad graph, invalid media) are NOT retried.
 */
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import { readFileSync } from 'fs';
import * as store from './store.js';
import { buildRenderPlan } from './renderPlan.js';
import { FFMPEG, runProcess, probeMedia, detectSilence } from './media.js';
import { validateForExport, proposeGaps } from '../../src/features/ReelsEditor/core/editPlan.js';
import { executeAiEdit } from './aiEditor.js';

const CONCURRENCY = Math.min(2, Math.max(1, Number(process.env.REELS_WORKER_CONCURRENCY) || 1));
const JOB_TIMEOUT_MS = Number(process.env.REELS_JOB_TIMEOUT_MS) || 15 * 60 * 1000;
const STALE_MS = 60 * 1000;
const TERMINAL = new Set(['succeeded', 'failed', 'cancelled']);

const running = new Map(); // jobId -> AbortController
let started = false;
const WORKER_ID = `${os.hostname()}:${process.pid}`;

export const isTerminal = (status) => TERMINAL.has(status);

export async function enqueue(job) {
  const pending = await store.listJobs(j => !TERMINAL.has(j.status));
  if (pending.length >= 20 || pending.filter(j => j.ownerId === job.ownerId).length >= 2) throw Object.assign(new Error('Render queue full; wait for your current jobs'), {status:429});
  const now = new Date().toISOString();
  const record = {
    status: 'queued', stage: 'queued', progress: null, attempts: 0, maxAttempts: 2,
    createdAt: now, startedAt: null, heartbeatAt: null, finishedAt: null,
    error: null, output: null, result: null, metrics: null, cancelRequested: false,
    ...job,
  };
  await store.putJob(record);
  setImmediate(tick);
  return record;
}

export async function cancelJob(job) {
  if (isTerminal(job.status)) return job;
  if (job.status === 'queued') {
    return store.updateJob(job.id, { status: 'cancelled', stage: 'cancelled', finishedAt: new Date().toISOString() });
  }
  const ctl = running.get(job.id);
  if (ctl) ctl.abort();
  return store.updateJob(job.id, { cancelRequested: true });
}

export function startWorker({ log = console } = {}) {
  if (started) return;
  const instance = process.env.NODE_APP_INSTANCE ?? process.env.pm_id;
  if (process.env.REELS_WORKER === 'off' || (instance !== undefined && String(instance) !== '0')) {
    log.log?.('[REELS] Worker disabled in this process');
    return;
  }
  started = true;
  store.ensureDirs()
    .then(recover)
    .then(expireOutputs)
    .then(() => {
      setInterval(() => tick().catch((e) => log.error?.('[REELS] tick', e)), 1000).unref();
      setInterval(() => recoverStale().catch(() => {}), 30000).unref();
      setInterval(() => expireOutputs().catch(e => log.error?.('[REELS] expiry',e)), 3600000).unref();
      log.log?.(`[REELS] Render worker ready (concurrency ${CONCURRENCY})`);
    })
    .catch((e) => log.error?.('[REELS] Worker failed to start', e));
}

/** On startup, any job left "running" was interrupted by a restart. */
async function recover() {
  const stuck = await store.listJobs((j) => j.status === 'running');
  for (const j of stuck) await requeueOrFail(j, 'Interrupted by a worker restart');
}

async function recoverStale() {
  const now = Date.now();
  const stale = await store.listJobs((j) => j.status === 'running' && !running.has(j.id)
    && now - Date.parse(j.heartbeatAt || j.startedAt || 0) > STALE_MS);
  for (const j of stale) await requeueOrFail(j, 'Worker heartbeat lost');
}

async function requeueOrFail(job, reason) {
  if (job.attempts < job.maxAttempts && !job.cancelRequested) {
    await store.updateJob(job.id, { status: 'queued', stage: 'queued', progress: null, note: reason });
  } else {
    await store.updateJob(job.id, {
      status: job.cancelRequested ? 'cancelled' : 'failed', stage: 'failed',
      error: job.cancelRequested ? null : reason, finishedAt: new Date().toISOString(),
    });
  }
}

let ticking = false;
async function tick() {
  if (!started || ticking || running.size >= CONCURRENCY) return;
  ticking = true;
  try {
    const [next] = await store.listJobs((j) => j.status === 'queued');
    if (!next) return;
    const claimed = await store.updateJob(next.id, (j) => (j.status !== 'queued' ? {} : {
      status: 'running', stage: 'starting', attempts: j.attempts + 1, worker: WORKER_ID,
      startedAt: new Date().toISOString(), heartbeatAt: new Date().toISOString(),
    }));
    if (claimed?.status !== 'running' || claimed.worker !== WORKER_ID) return;
    const ctl = new AbortController();
    running.set(claimed.id, ctl);
    execute(claimed, ctl).finally(() => { running.delete(claimed.id); setImmediate(tick); });
  } finally {
    ticking = false;
  }
}

async function execute(job, ctl) {
  const t0 = Date.now();
  let progress = { stage: 'starting', progress: null };
  const setStage = (stage, value = null) => { progress = { stage, progress: value }; };
  const heartbeat = setInterval(() => {
    store.updateJob(job.id, { heartbeatAt: new Date().toISOString(), ...progress }).catch(() => {});
  }, 1500);
  const workDir = store.paths.work(job.id);
  try {
    await fsp.rm(workDir, { recursive: true, force: true });
    await fsp.mkdir(workDir, { recursive: true });
    let patch;
    if (job.type === 'render') patch = await runRender(job, workDir, ctl.signal, setStage);
    else if (job.type === 'silence') patch = await runSilence(job, ctl.signal, setStage);
    else if (job.type === 'auto_edit') patch = await runAutoEdit(job, ctl.signal, setStage);
    else throw Object.assign(new Error(`Unknown job type ${job.type}`), { deterministic: true });
    clearInterval(heartbeat);
    await store.updateJob(job.id, {
      ...patch, status: 'succeeded', stage: 'done', progress: 1, error: null,
      finishedAt: new Date().toISOString(),
      metrics: { ...(patch.metrics || {}), elapsedMs: Date.now() - t0, queueMs: Date.parse(job.startedAt) - Date.parse(job.createdAt) },
    });
  } catch (err) {
    clearInterval(heartbeat);
    const cancelled = err.code === 'ECANCELLED';
    const transient = Boolean(err.transient);
    const latest = await store.getJob(job.id);
    if (!cancelled && transient && latest.attempts < latest.maxAttempts) {
      await store.updateJob(job.id, { status: 'queued', stage: 'queued', note: `Retrying after: ${err.message}` });
    } else {
      await store.updateJob(job.id, {
        status: cancelled ? 'cancelled' : 'failed',
        stage: cancelled ? 'cancelled' : 'failed',
        error: cancelled ? null : summariseError(err),
        finishedAt: new Date().toISOString(),
        metrics: { elapsedMs: Date.now() - t0 },
      });
    }
    if (process.env.NODE_ENV !== 'production' && err.stderr) console.error('[REELS] ffmpeg stderr:\n', err.stderr);
  } finally {
    await fsp.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

function summariseError(err) {
  const tail = String(err.stderr || '').split(/\r?\n/).filter(Boolean).slice(-2).join(' | ');
  return (tail ? `${err.message}: ${tail}` : err.message).slice(0, 500);
}

/** Best-effort peak RSS of a child (Linux only; null elsewhere — not guessed). */
function peakRssKb(pid) {
  try {
    const m = readFileSync(`/proc/${pid}/status`, 'utf8').match(/VmHWM:\s+(\d+)/);
    return m ? Number(m[1]) : null;
  } catch { return null; }
}

async function runRender(job, workDir, signal, setStage) {
  setStage('compose');
  const project = job.snapshot;
  const check = validateForExport(project);
  if (!check.ok) throw Object.assign(new Error(check.errors.join('; ')), { deterministic: true });

  const sourcePaths = new Map();
  for (const s of project.sources) {
    const p = store.paths.media(job.ownerId, s.id);
    if (store.fileExists(p)) sourcePaths.set(s.id, p);
  }
  const plan = buildRenderPlan(project, { sourcePaths, profile: job.params.profile, range: job.params.range || null });
  await fsp.writeFile(path.join(workDir, 'graph.txt'), plan.filterScript, 'utf8');
  for (const t of plan.textFiles) await fsp.writeFile(path.join(workDir, t.name), t.content, 'utf8');
  for (const f of plan.fonts) await fsp.copyFile(path.join(store.paths.fonts(), f), path.join(workDir, f));

  setStage('encode', 0);
  const totalUs = plan.durationSec * 1e6;
  let peak = null;
  let pid = null;
  const sampler = setInterval(() => { if (pid) { const v = peakRssKb(pid); if (v) peak = Math.max(peak || 0, v); } }, 500);
  try {
    await runProcess(FFMPEG, plan.args, {
      cwd: workDir,
      timeoutMs: JOB_TIMEOUT_MS,
      signal,
      onSpawn: (p) => { pid = p; },
      onStdout: (chunk) => {
        const m = chunk.match(/out_time_us=(\d+)/g);
        if (m) setStage('encode', Math.min(0.99, Number(m[m.length - 1].split('=')[1]) / totalUs));
      },
    });
  } finally {
    clearInterval(sampler);
  }

  setStage('validate');
  const outTmp = path.join(workDir, 'out.mp4');
  const probe = await probeMedia(outTmp);
  const frameTol = 2 / plan.fps + 0.05;
  const problems = [];
  if (!probe.hasVideo) problems.push('no video stream');
  else {
    if (probe.width !== plan.width || probe.height !== plan.height) problems.push(`dimensions ${probe.width}x${probe.height}`);
    if (probe.videoCodec !== 'h264') problems.push(`codec ${probe.videoCodec}`);
    if (Math.abs(probe.durationSec - plan.durationSec) > frameTol + 0.05) problems.push(`duration ${probe.durationSec.toFixed(3)}s vs ${plan.durationSec.toFixed(3)}s`);
    if (plan.hasAudio && probe.audioCodec !== 'aac') problems.push('missing AAC audio');
  }
  if (problems.length) throw Object.assign(new Error(`Output validation failed: ${problems.join(', ')}`), { deterministic: true });
  // Decode check: a full decode pass catches corrupt output that ffprobe headers miss.
  await runProcess(FFMPEG, ['-v', 'error', '-i', outTmp, '-f', 'null', '-'], { timeoutMs: 120000, signal });

  const finalPath = store.paths.export(job.ownerId, job.id);
  await fsp.mkdir(path.dirname(finalPath), { recursive: true });
  await fsp.rename(outTmp, finalPath).catch(async () => { await fsp.copyFile(outTmp, finalPath); });
  return {
    output: {
      bytes: probe.sizeBytes, durationSec: probe.durationSec, width: probe.width, height: probe.height,
      videoCodec: probe.videoCodec, audioCodec: probe.audioCodec, revision: project.revision, profile: job.params.profile,
    },
    metrics: { peakRssKb: peak, inputBytes: project.sources.reduce((a, s) => a + s.bytes, 0), outputBytes: probe.sizeBytes },
  };
}

async function runSilence(job, signal, setStage) {
  setStage('analyze');
  const { sourceId, noiseDb, minSilenceSec, paddingSec } = job.params;
  const src = job.snapshot.sources.find((s) => s.id === sourceId);
  if (!src) throw Object.assign(new Error('Source not found'), { deterministic: true });
  if (!src.meta.hasAudio) return { result: { sourceId, silences: [], gaps: [], note: 'This clip has no audio track.' } };
  const silences = await detectSilence(store.paths.media(job.ownerId, sourceId), {
    noiseDb, minSilenceSec, durationSec: src.meta.durationSec, signal,
  });
  const gaps = proposeGaps(silences, { sourceId, minGapSec: minSilenceSec, paddingSec });
  return { result: { sourceId, silences, gaps, settings: { noiseDb, minSilenceSec, paddingSec } } };
}

/** The model proposes only a validated edit plan; FFmpeg remains responsible
 * for rendering the saved revision later through the normal render job. */
async function runAutoEdit(job, signal, setStage) {
  if (signal.aborted) throw Object.assign(new Error('Cancelled'), { code: 'ECANCELLED' });
  setStage('transcribe', 0.1);
  const result = await executeAiEdit({
    project: job.snapshot,
    ownerId: job.ownerId,
    engine: job.params.provider,
    model: job.params.model,
    removeGaps: Boolean(job.params.removeGaps),
    userPrompt: job.params.userPrompt || '',
    scriptText: job.params.scriptText || '',
    referenceNotes: job.params.referenceNotes || '',
  });
  if (signal.aborted) throw Object.assign(new Error('Cancelled'), { code: 'ECANCELLED' });
  setStage('apply_revision', 0.8);
  const project = await store.saveRevision(job.ownerId, job.projectId, {
    baseRevision: job.revision,
    mutate: () => result.project,
  });
  return {
    result: {
      project,
      engineUsed: result.engineUsed,
      overlaysCount: result.overlaysCount,
      silenceRemoved: result.silenceRemoved,
      paperEditSummary: result.paperEditSummary,
    },
  };
}

/** Only disposable finished render outputs expire; sources and project revisions are preserved. */
async function expireOutputs() {
  const days = Math.max(1, Number(process.env.REELS_EXPORT_RETENTION_DAYS) || 7);
  const cutoff = Date.now() - days * 86400000;
  const jobs = await store.listJobs(j => TERMINAL.has(j.status) && j.finishedAt && Date.parse(j.finishedAt) < cutoff && j.output);
  for(const job of jobs){
    await fsp.rm(store.paths.export(job.ownerId,job.id),{force:true});
    await store.updateJob(job.id,{output:null,note:'Export expired; render again from your saved project.'});
  }
}
