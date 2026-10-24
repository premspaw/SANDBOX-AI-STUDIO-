/**
 * Reels editor persistence (file-backed repository).
 *
 * Layout under REELS_DATA_DIR (default server/data/reels):
 *   projects/<ownerKey>/<projectId>.json           current revision
 *   revisions/<ownerKey>/<projectId>/<rev>.json    immutable revision history
 *   media/<ownerKey>/<sourceId>.media              private, read-only sources
 *   exports/<ownerKey>/<jobId>.mp4                 validated outputs
 *   jobs/<jobId>.json                              durable job records
 *   work/<jobId>/                                  per-job scratch dirs
 *
 * Tenant isolation: every path is derived from a hash of the authenticated
 * owner id plus a validated id — never from client-supplied paths. Media blobs
 * never go into JSON. The interface is small so it can be swapped for the
 * Supabase tables in supabase/migrations/20261023_reels_editor.sql.
 */
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { validateProject } from '../../src/features/ReelsEditor/core/editPlan.js';

export const DATA_ROOT = path.resolve(process.env.REELS_DATA_DIR || path.join(process.cwd(), 'server', 'data', 'reels'));
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export const ownerKey = (ownerId) => crypto.createHash('sha256').update(`reels-owner:${ownerId}`).digest('hex').slice(0, 24);

export function assertId(id, label = 'id') {
  if (typeof id !== 'string' || !ID_RE.test(id)) throw Object.assign(new Error(`Invalid ${label}`), { status: 400 });
  return id;
}

const dir = (...parts) => path.join(DATA_ROOT, ...parts);

export const paths = {
  project: (owner, id) => dir('projects', ownerKey(owner), `${assertId(id)}.json`),
  revision: (owner, id, rev) => dir('revisions', ownerKey(owner), assertId(id), `${Number(rev)}.json`),
  media: (owner, sourceId) => dir('media', ownerKey(owner), `${assertId(sourceId, 'source')}.media`),
  export: (owner, jobId) => dir('exports', ownerKey(owner), `${assertId(jobId, 'job')}.mp4`),
  job: (jobId) => dir('jobs', `${assertId(jobId, 'job')}.json`),
  work: (jobId) => dir('work', assertId(jobId, 'job')),
  uploadTmp: () => dir('uploads-tmp'),
  fonts: () => path.join(process.cwd(), 'server', 'reels', 'assets', 'fonts'),
};

export async function ensureDirs() {
  for (const d of ['projects', 'revisions', 'media', 'exports', 'jobs', 'work', 'uploads-tmp']) {
    await fsp.mkdir(dir(d), { recursive: true });
  }
}

async function readJson(file) {
  try { return JSON.parse(await fsp.readFile(file, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}

/** Atomic write: temp file + rename, with Windows EPERM/EBUSY fallback. */
export async function writeJsonAtomic(file, value) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(value), 'utf8');
  try {
    await fsp.rename(tmp, file);
  } catch (err) {
    if (['EPERM', 'EEXIST', 'EBUSY', 'EACCES'].includes(err.code)) {
      await fsp.copyFile(tmp, file);
      await fsp.rm(tmp, { force: true }).catch(() => {});
    } else {
      await fsp.rm(tmp, { force: true }).catch(() => {});
      throw err;
    }
  }
}

// Per-project serialisation of writes inside this process.
const locks = new Map();
function withLock(key, fn) {
  const prev = locks.get(key) || Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(key, next.catch(() => {}));
  return next;
}

// ───────────────────────────── Projects ─────────────────────────────
export async function getProject(ownerId, projectId) {
  const p = await readJson(paths.project(ownerId, projectId));
  // Defence in depth: the path is owner-scoped AND the record must match.
  if (!p || p.ownerId !== ownerId) return null;
  return p;
}

export async function listProjects(ownerId) {
  const d = dir('projects', ownerKey(ownerId));
  let files = [];
  try { files = await fsp.readdir(d); } catch { return []; }
  const out = [];
  for (const f of files.filter((x) => x.endsWith('.json'))) {
    const p = await readJson(path.join(d, f));
    if (p?.ownerId !== ownerId) continue;
    out.push({
      id: p.id, name: p.name, revision: p.revision, updatedAt: p.updatedAt, createdAt: p.createdAt,
      sources: p.sources.length, clips: p.clips.filter((c) => c.enabled).length,
    });
  }
  return out.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export async function createProject(ownerId, project) {
  const v = validateProject(project);
  if (!v.ok) throw Object.assign(new Error(v.errors.join('; ')), { status: 422 });
  await writeJsonAtomic(paths.revision(ownerId, project.id, 0), project);
  await writeJsonAtomic(paths.project(ownerId, project.id), project);
  return project;
}

/**
 * Save a new revision with optimistic concurrency. `mutate` receives the
 * current stored project and returns the next state (server-side edits), or
 * pass `incoming` + `baseRevision` for client edits.
 */
export function saveRevision(ownerId, projectId, { baseRevision, incoming, mutate }) {
  return withLock(`${ownerId}:${projectId}`, async () => {
    const current = await getProject(ownerId, projectId);
    if (!current) throw Object.assign(new Error('Project not found'), { status: 404 });
    if (baseRevision !== undefined && baseRevision !== current.revision) {
      throw Object.assign(new Error('Project changed elsewhere — reload to continue'), { status: 409, current });
    }
    const draft = mutate ? await mutate(current) : incoming;
    const next = {
      ...draft,
      // Fields the client may never change:
      id: current.id,
      ownerId: current.ownerId,
      createdAt: current.createdAt,
      sources: mutate ? draft.sources : current.sources,
      schemaVersion: current.schemaVersion,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
    };
    const v = validateProject(next);
    if (!v.ok) throw Object.assign(new Error(v.errors.join('; ')), { status: 422, errors: v.errors });
    await writeJsonAtomic(paths.revision(ownerId, projectId, next.revision), next);
    await writeJsonAtomic(paths.project(ownerId, projectId), next);
    return next;
  });
}

export async function getRevision(ownerId, projectId, revision) {
  const p = await readJson(paths.revision(ownerId, projectId, revision));
  return p && p.ownerId === ownerId ? p : null;
}

export async function deleteProject(ownerId, projectId) {
  const p = await getProject(ownerId, projectId);
  if (!p) return false;
  for (const s of p.sources) await fsp.rm(paths.media(ownerId, s.id), { force: true });
  await fsp.rm(dir('revisions', ownerKey(ownerId), assertId(projectId)), { recursive: true, force: true });
  await fsp.rm(paths.project(ownerId, projectId), { force: true });
  return true;
}

// ───────────────────────────── Jobs ─────────────────────────────
export const getJob = (jobId) => readJson(paths.job(jobId));
export const putJob = (job) => writeJsonAtomic(paths.job(job.id), job);

export async function updateJob(jobId, patch) {
  return withLock(`job:${jobId}`, async () => {
    const job = await getJob(jobId);
    if (!job) return null;
    const next = { ...job, ...(typeof patch === 'function' ? patch(job) : patch) };
    await putJob(next);
    return next;
  });
}

export async function listJobs(filter = () => true) {
  let files = [];
  try { files = await fsp.readdir(dir('jobs')); } catch { return []; }
  const jobs = [];
  for (const f of files.filter((x) => x.endsWith('.json'))) {
    const j = await readJson(dir('jobs', f));
    if (j && filter(j)) jobs.push(j);
  }
  return jobs.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

export const fileExists = (p) => fs.existsSync(p);
