import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { reelsApi } from '../services/reelsApi.js';
import { validateForExport } from '../core/editPlan.js';

export function ReelsExportModal({ isOpen, onClose, project }) {
  const [job, setJob] = useState(null);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState('export');
  const closeRef = useRef(null);
  const lock = useRef(false);
  const validation = validateForExport(project);
  useEffect(() => {
    if (!isOpen) return;
    let live = true;
    const prior = document.activeElement;
    closeRef.current?.focus();
    setLoading(true); setInfo(null); setJob(null); setError('');
    reelsApi.listRecentExports(project.id).then(async jobs => {
      const existing = jobs.find(j => ['queued', 'running'].includes(j.status)) ||
        jobs.find(j => j.status === 'succeeded' && j.revision === project.revision);
      if (!live || !existing) return;
      setJob(existing);
      if (existing.status === 'succeeded') {
        const output = await reelsApi.getJobDownloadUrl(existing.id);
        if (live) setInfo(output);
      }
    }).catch(e => { if (live) setError(e.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; prior?.focus?.(); };
  }, [isOpen, project.id, project.revision]);
  useEffect(() => {
    if (!isOpen || !job || !['queued', 'running'].includes(job.status)) return;
    let live = true, timer;
    async function poll() {
      try {
        const current = await reelsApi.getJobStatus(job.id);
        if (!live) return;
        if (['succeeded', 'failed', 'cancelled'].includes(current.status)) {
          if (current.status === 'succeeded') {
            const output = await reelsApi.getJobDownloadUrl(current.id);
            if (live) setInfo(output);
          }
          if (live) { setJob(current); if (current.status === 'failed') setError(current.error || 'Rendering failed.'); }
        } else {
          setJob(current);
        }
      } catch (e) {
        if (live) { setError(e.message); timer = setTimeout(poll, 3000); }
      }
    }
    timer = setTimeout(poll, 1500);
    return () => { live = false; clearTimeout(timer); };
  }, [isOpen, job]);
  if (!isOpen) return null;
  const running = job && ['queued', 'running'].includes(job.status);
  async function start() {
    if (lock.current) return;
    lock.current = true; setStarting(true); setError(''); setInfo(null);
    try {
      const next = await reelsApi.startRender(project.id, { profile, revision: project.revision });
      setJob(next);
    } catch (e) { setError(e.message); }
    finally { lock.current = false; setStarting(false); }
  }
  async function cancel() {
    try { setJob(await reelsApi.cancelJob(job.id)); }
    catch (e) { setError(e.message); }
  }
  function keyboard(e) {
    if (e.key === 'Escape') onClose();
    if (e.key !== 'Tab') return;
    const elements = [...e.currentTarget.querySelectorAll('button:not(:disabled),a[href],select:not(:disabled),video[controls]')];
    const first = elements[0], last = elements[elements.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  }
  return <div className="rs-modal-backdrop"><section className="rs-export-dialog" role="dialog" aria-modal="true" aria-labelledby="rs-export-title" onKeyDown={keyboard}>
    <header><div><h2 id="rs-export-title">Export your video</h2><p>{project.canvas.width} × {project.canvas.height} · MP4 · 30 fps · revision {project.revision}</p></div><button ref={closeRef} aria-label="Close export" onClick={onClose}><X size={18} /></button></header>
    {!validation.ok && <div role="alert" className="rs-error">{validation.errors.join(' ')}</div>}
    {error && <div role="alert" className="rs-error">{error}</div>}
    {loading && <p role="status">Finding your saved exports…</p>}
    {job && <div aria-live="polite"><p>{job.status} · {job.stage || 'render'} · revision {job.revision}</p>{running && <><Loader2 className="rs-spin" /><p>You can close this panel; rendering continues on the server.</p><button onClick={cancel}>Cancel render</button></>}</div>}
    {info && <><video src={info.playUrl} controls playsInline preload="metadata" /><a className="rs-export-download" href={info.downloadUrl} download={info.fileName}><Download size={18} />Download MP4</a></>}
    {!running && <><label>Render <select value={profile} disabled={starting} onChange={e => setProfile(e.target.value)}><option value="export">Full video</option><option value="preview">Short 4-second preview</option></select></label><button className="rs-primary" disabled={starting || loading || !validation.ok} onClick={start}>{starting ? 'Starting…' : info ? 'Render again' : 'Render video'}</button></>}
  </section></div>;
}
