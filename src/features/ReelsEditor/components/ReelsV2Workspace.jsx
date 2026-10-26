import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  AlertCircle,
  Clock3,
  Download,
  Film,
  Loader2,
  MessageSquareText,
  Play,
  Plus,
  RefreshCw,
  Scissors,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';
import { useReelsEditor } from '../hooks/useReelsEditor.js';
import { reelsApi } from '../services/reelsApi.js';
import {
  setCanvasPolicy as applyCanvasPolicy,
  setSourceOrder as applySourceOrder,
  sourceUsToOutputUs,
} from '../core/editPlan.js';

const STEPS = [
  { id: 'sources', label: 'Sources', icon: Upload },
  { id: 'clean', label: 'Clean', icon: Scissors },
  { id: 'style', label: 'Style', icon: Sparkles },
  { id: 'preview', label: 'Preview & export', icon: Play },
];

const CLEANUP_COPY = {
  natural: 'Natural keeps 200–300 ms between phrases and only considers pauses above 600 ms.',
  tight: 'Tight keeps 120–200 ms between phrases and only considers pauses above 400 ms.',
  manual: 'Manual creates proposals but changes nothing until you choose each one.',
};

const terminalStatuses = new Set(['succeeded', 'failed', 'cancelled']);

function JobBadge({ job }) {
  if (!job) return null;
  const tone = job.status === 'succeeded'
    ? 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10'
    : job.status === 'failed' || job.status === 'cancelled'
      ? 'text-rose-300 border-rose-400/30 bg-rose-400/10'
      : 'text-[#c8f135] border-[#c8f135]/30 bg-[#c8f135]/10';
  return (
    <div className={`rounded-xl border px-3 py-2 text-xs ${tone}`}>
      <div className="flex items-center gap-2 font-semibold">
        {!terminalStatuses.has(job.status) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        <span>{job.stage || job.status}</span>
        {typeof job.progress === 'number' && <span className="ml-auto">{Math.round(job.progress * 100)}%</span>}
      </div>
      {job.note && <p className="mt-1 text-[11px] opacity-80">{job.note}</p>}
      {job.error && <p className="mt-1 text-[11px] text-rose-200">{job.error}</p>}
    </div>
  );
}

function SourceMeta({ source }) {
  const meta = source.meta || {};
  return (
    <span className="text-[10px] text-zinc-500">
      {Number(meta.durationSec || 0).toFixed(1)}s · {meta.width || '?'}×{meta.height || '?'} · {meta.hasAudio ? 'audio' : 'silent'}
    </span>
  );
}

function StageTitle({ title, detail, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-black tracking-tight text-white">{title}</h2>
        {detail && <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400">{detail}</p>}
      </div>
      {children}
    </div>
  );
}

function primaryButton(disabled = false) {
  return `inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition ${disabled
    ? 'cursor-not-allowed bg-zinc-800 text-zinc-500'
    : 'bg-[#c8f135] text-black hover:bg-[#d8ff4f]'}`;
}

/**
 * The V2 editor is deliberately job-driven. Browser state is useful for quick
 * inspection, but every AI edit and final render is tied to an immutable saved
 * revision on the server.
 */
export function ReelsV2Workspace({ initialProject, projectsList = [], onCreateProject, onSelectProject, onUploadFiles }) {
  const editor = useReelsEditor(initialProject);
  const { project } = editor;
  const [step, setStep] = useState('sources');
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('');
  const [engines, setEngines] = useState([]);
  const [cleanupProfile, setCleanupProfile] = useState('natural');
  const [job, setJob] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revisionRequest, setRevisionRequest] = useState('');
  const [isSubmittingPatch, setIsSubmittingPatch] = useState(false);
  const [candidateDecisions, setCandidateDecisions] = useState({});
  const uploadInputRef = useRef(null);

  const sources = project.sources || [];
  const sourceOrder = project.sourceOrder?.length ? project.sourceOrder : sources.map((source) => source.id);
  const words = project.wordAnchors || project.words || project.transcript?.words || [];
  const candidates = project.cleanup?.candidates || project.cleanupCandidates || [];
  const activeSourceId = sourceOrder[0] || sources[0]?.id;
  const activeSourceUrl = activeSourceId ? editor.sourceUrls[activeSourceId] : '';
  const chosenEngine = engines.find((engine) => engine.id === provider);
  const canStartEdit = sources.length > 0 && !job?.status?.match(/queued|running/);

  useEffect(() => {
    reelsApi.getAiEngines()
      .then((items) => {
        setEngines(items);
        const configured = items.find((item) => item.available && item.id === provider) || items.find((item) => item.available);
        if (configured) {
          setProvider(configured.id);
          setModel(configured.defaultModel || '');
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!job?.id || terminalStatuses.has(job.status)) return undefined;
    const timer = window.setInterval(async () => {
      try {
        const latest = await reelsApi.getJobStatus(job.id);
        setJob(latest);
        if (latest.status === 'succeeded' && latest.result?.project) {
          editor.replaceProject(latest.result.project);
          setStep('preview');
          setNotice('Your AI edit is ready. Rendering an edited 5-second preview now.');
          try {
            const renderJob = await reelsApi.startRender(latest.result.project.id, {
              profile: 'preview',
              revision: latest.result.project.revision,
              startFrame: 0,
              durationSec: 5,
              idempotencyKey: `ai-preview-${latest.result.project.id}-${latest.result.project.revision}`,
            });
            setPreview(renderJob);
          } catch (renderError) {
            setError(renderError.message || 'The edit was saved, but its preview could not start.');
          }
        }
      } catch (err) {
        setError(err.message || 'Could not refresh editing progress.');
      }
    }, 1400);
    return () => window.clearInterval(timer);
  }, [editor, job?.id, job?.status]);

  useEffect(() => {
    if (!preview?.id || terminalStatuses.has(preview.status)) return undefined;
    const timer = window.setInterval(async () => {
      try {
        const latest = await reelsApi.getJobStatus(preview.id);
        setPreview(latest);
        if (latest.status === 'succeeded') {
          const urls = await reelsApi.getJobDownloadUrl(latest.id);
          setPreviewUrl(urls.playUrl || '');
        }
      } catch (err) {
        setError(err.message || 'Could not refresh preview status.');
      }
    }, 1400);
    return () => window.clearInterval(timer);
  }, [preview?.id, preview?.status]);

  const orderedSources = useMemo(() => sourceOrder
    .map((id) => sources.find((source) => source.id === id))
    .filter(Boolean), [sourceOrder, sources]);

  const moveSource = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= sourceOrder.length) return;
    editor.mutate((current) => {
      const order = [...(current.sourceOrder?.length ? current.sourceOrder : current.sources.map((source) => source.id))];
      const [moved] = order.splice(index, 1);
      order.splice(nextIndex, 0, moved);
      const rank = new Map(order.map((id, position) => [id, position]));
      return {
        ...current,
        sourceOrder: order,
        sources: [...current.sources].sort((a, b) => rank.get(a.id) - rank.get(b.id)),
        clips: [...current.clips].sort((a, b) => rank.get(a.sourceId) - rank.get(b.sourceId)),
      };
    }, 'reorderSources');
  };

  const setCanvasPolicy = (value) => {
    const policies = {
      'source-native': { preset: 'source', fit: 'fill' },
      'vertical-fill': { preset: 'portrait', fit: 'fill' },
      'vertical-fit': { preset: 'portrait', fit: 'fit' },
      square: { preset: 'square', fit: 'fit' },
      landscape: { preset: 'landscape', fit: 'fit' },
    };
    editor.mutate((current) => applyCanvasPolicy(current, {
      ...(policies[value] || policies['source-native']),
      sourceId: value === 'source-native' ? (current.sourceOrder?.[0] || current.sources[0]?.id || null) : null,
    }), 'setCanvasPolicy');
  };

  const selectedCanvasPolicy = (() => {
    const policy = project.canvasPolicy || {};
    if (policy.preset === 'source') return 'source-native';
    if (policy.preset === 'portrait') return policy.fit === 'fit' ? 'vertical-fit' : 'vertical-fill';
    return policy.preset === 'square' || policy.preset === 'landscape' ? policy.preset : 'source-native';
  })();

  const startAutoEdit = async () => {
    setError('');
    setNotice('');
    try {
      await editor.flushSave();
      const started = await reelsApi.startAutoEdit(project.id, {
        expectedRevision: project.revision,
        sourceOrder,
        provider,
        model: model || chosenEngine?.defaultModel || null,
        cleanupProfile,
        canvasPolicy: project.canvasPolicy || null,
        brand: project.brand || null,
        templateId: project.brand?.templateId || null,
        autoPalette: false,
      });
      setJob(started);
      setStep('clean');
    } catch (err) {
      setError(err.message || 'The edit could not be started. Your existing revision was not changed.');
    }
  };

  const applyCandidateDecisions = async () => {
    const decisions = Object.entries(candidateDecisions).map(([candidateId, decision]) => ({ candidateId, decision }));
    if (!decisions.length) return;
    setError('');
    try {
      const response = await reelsApi.applyRevisionPatch(project.id, {
        expectedRevision: project.revision,
        timeContext: { outputFrame: editor.currentFrame, revision: project.revision },
        patch: { type: 'setCleanupDecisions', decisions },
      });
      if (response.project) editor.replaceProject(response.project);
      if (response.job) setJob(response.job);
      setNotice('Cleanup decisions were saved as a new revision.');
    } catch (err) {
      setError(err.message || 'Cleanup decisions could not be saved.');
    }
  };

  const submitRevisionRequest = async (event) => {
    event.preventDefault();
    const request = revisionRequest.trim();
    if (!request) return;
    setIsSubmittingPatch(true);
    setError('');
    try {
      const response = await reelsApi.applyRevisionPatch(project.id, {
        expectedRevision: project.revision,
        timeContext: { outputFrame: editor.currentFrame, revision: project.revision },
        patch: { type: 'naturalLanguageCorrection', request },
      });
      if (response.project) editor.replaceProject(response.project);
      if (response.job) setJob(response.job);
      setRevisionRequest('');
      setNotice(response.previewRequired ? 'A short preview is being generated for this correction.' : 'Correction saved as a new revision.');
    } catch (err) {
      setError(err.message || 'This correction could not be applied.');
    } finally {
      setIsSubmittingPatch(false);
    }
  };

  const requestPreview = async (profile = 'preview') => {
    setError('');
    try {
      await editor.flushSave();
      const renderJob = await reelsApi.startRender(project.id, {
        profile,
        revision: project.revision,
        startFrame: editor.currentFrame,
        durationSec: profile === 'preview' ? 5 : undefined,
        idempotencyKey: `${profile}-${project.id}-${project.revision}-${profile === 'preview' ? editor.currentFrame : 'all'}`,
      });
      setPreview(renderJob);
      if (profile === 'export') setNotice('Export started. You can keep editing while it renders this saved revision.');
    } catch (err) {
      setError(err.message || 'The render could not be started.');
    }
  };

  const applyBrandPatch = (patch) => editor.mutate((current) => ({
    ...current,
    brand: { ...(current.brand || {}), ...patch },
  }), 'style');

  const renderSources = () => (
    <section className="space-y-4">
      <StageTitle
        title="Original footage"
        detail="Add one to three clips. Their files are never replaced; the editor only stores restorable source spans."
      >
        <button className={primaryButton(sources.length >= 3)} disabled={sources.length >= 3} onClick={() => uploadInputRef.current?.click()}>
          <Plus className="h-4 w-4" /> Add footage
        </button>
      </StageTitle>
      <input
        ref={uploadInputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(event) => {
          onUploadFiles?.(event);
          event.currentTarget.value = '';
        }}
      />
      <div className="space-y-2">
        {orderedSources.map((source, index) => (
          <div key={source.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/70 p-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-xs font-black text-[#c8f135]">{index + 1}</div>
            <Film className="h-4 w-4 shrink-0 text-zinc-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-zinc-100">{source.filename}</p>
              <SourceMeta source={source} />
            </div>
            <div className="flex gap-1">
              <button aria-label="Move source earlier" className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 disabled:opacity-30" disabled={index === 0} onClick={() => moveSource(index, -1)}><ArrowUp className="h-4 w-4" /></button>
              <button aria-label="Move source later" className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 disabled:opacity-30" disabled={index === orderedSources.length - 1} onClick={() => moveSource(index, 1)}><ArrowDown className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      {!sources.length && (
        <button onClick={() => uploadInputRef.current?.click()} className="flex min-h-48 w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-white/15 bg-zinc-950/60 text-zinc-400 hover:border-[#c8f135]/60 hover:text-[#c8f135]">
          <Upload className="h-8 w-8" />
          <span className="text-xs font-semibold">Choose up to three videos</span>
          <span className="text-[10px] text-zinc-500">MP4, MOV or WebM · 250 MB each</span>
        </button>
      )}
      <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
        <label className="text-xs font-bold text-zinc-200" htmlFor="canvas-policy">Output canvas</label>
        <select
          id="canvas-policy"
          className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-2.5 text-xs text-white"
          value={selectedCanvasPolicy}
          onChange={(event) => setCanvasPolicy(event.target.value)}
        >
          <option value="source-native">Match first source</option>
          <option value="vertical-fill">Reel 9:16 · fill</option>
          <option value="vertical-fit">Reel 9:16 · fit</option>
          <option value="square">Square 1:1 · fit</option>
          <option value="landscape">Landscape 16:9 · fit</option>
        </select>
        <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">Use “fit” to keep the whole video visible. “fill” intentionally crops the outer edges to fill a Reel frame.</p>
      </div>
      <button disabled={!canStartEdit} onClick={startAutoEdit} className={primaryButton(!canStartEdit)}>
        <Wand2 className="h-4 w-4" /> Analyze and prepare edit
      </button>
    </section>
  );

  const renderClean = () => (
    <section className="space-y-4">
      <StageTitle title="Speech-safe cleanup" detail="Every proposed cut remains tied to original footage. Uncertain speech stays in the timeline for your review." />
      <div className="grid gap-2 sm:grid-cols-3">
        {Object.entries(CLEANUP_COPY).map(([id, copy]) => (
          <button key={id} onClick={() => setCleanupProfile(id)} className={`rounded-2xl border p-3 text-left transition ${cleanupProfile === id ? 'border-[#c8f135]/70 bg-[#c8f135]/10' : 'border-white/10 bg-zinc-950/70 hover:border-white/25'}`}>
            <p className="text-xs font-bold capitalize text-white">{id}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">{copy}</p>
          </button>
        ))}
      </div>
      <JobBadge job={job} />
      <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
        <div className="mb-3 flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-[#c8f135]" /><h3 className="text-xs font-bold text-white">Transcript evidence</h3></div>
        {words.length ? (
          <div className="flex max-h-36 flex-wrap gap-1 overflow-y-auto text-xs leading-7">
            {words.map((word) => (
              <button key={word.wordId || `${word.sourceId}-${word.startUs}-${word.text}`} onClick={() => editor.seekToTime((word.outputStartUs ?? word.startUs ?? 0) / 1e6)} className={`rounded-md px-1.5 ${word.alignmentQuality === 'low' ? 'bg-amber-400/15 text-amber-200 underline decoration-dotted' : 'bg-white/5 text-zinc-200 hover:bg-white/10'}`} title={`${word.sourceId || 'source'} · ${((word.startUs || 0) / 1e6).toFixed(2)}s`}>
                {word.text}
              </button>
            ))}
          </div>
        ) : <p className="text-xs text-zinc-500">Transcript words appear here after the alignment stage completes.</p>}
      </div>
      <div className="space-y-2">
        {candidates.map((candidate) => {
          const decision = candidateDecisions[candidate.id] || candidate.decision || 'review';
          const removable = !candidate.protected && candidate.alignmentQuality !== 'low';
          return (
            <div key={candidate.id} className="rounded-2xl border border-white/10 bg-zinc-950/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-zinc-100">{candidate.reason || 'Potential pause or repeated phrase'}</p>
                  <p className="mt-1 text-[10px] text-zinc-500">{candidate.sourceId} · {((candidate.startUs || 0) / 1e6).toFixed(2)}s–{((candidate.endUs || 0) / 1e6).toFixed(2)}s</p>
                </div>
                <select disabled={!removable} value={decision} onChange={(event) => setCandidateDecisions((current) => ({ ...current, [candidate.id]: event.target.value }))} className="rounded-lg border border-white/10 bg-black px-2 py-1.5 text-[11px] text-white disabled:opacity-40">
                  <option value="review">Review</option>
                  <option value="keep">Keep</option>
                  <option value="remove">Remove</option>
                </select>
              </div>
              {!removable && <p className="mt-2 text-[10px] text-amber-200">Protected or low-confidence speech cannot be auto-removed.</p>}
            </div>
          );
        })}
        {!candidates.length && <div className="rounded-2xl border border-dashed border-white/10 p-4 text-xs text-zinc-400"><p>No automatic cuts were proposed. Your words and footage stay untouched.</p><button onClick={() => setStep('style')} className="mt-3 text-xs font-bold text-[#c8f135]">Skip cleanup and continue to style <ChevronRight className="inline h-3.5 w-3.5" /></button></div>}
      </div>
      <button onClick={applyCandidateDecisions} className={primaryButton(!Object.keys(candidateDecisions).length)} disabled={!Object.keys(candidateDecisions).length}><Check className="h-4 w-4" /> Save cleanup choices</button>
    </section>
  );

  const renderStyle = () => (
    <section className="space-y-4">
      <StageTitle title="Optional style" detail="Brand controls affect the saved project; AI cannot override them unless you explicitly enable that option." />
      <button type="button" onClick={() => applyBrandPatch({ templateId: 'raw-footage-motion-editor' })} className={`w-full rounded-2xl border p-4 text-left transition ${project.brand?.templateId === 'raw-footage-motion-editor' ? 'border-[#c8f135] bg-[#c8f135]/10' : 'border-white/10 bg-zinc-950/70 hover:border-white/25'}`}>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c8f135]">Raw Footage Motion Editor · v1</p>
        <p className="mt-2 text-sm font-bold text-white">Content-aware motion graphics</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">Speaker and original voice remain primary. The planner can use only registered process-flow, comparison, speaker-inset, highlight, caption, and graphic components when transcript evidence supports them.</p>
      </button>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ['text', 'Text'], ['background', 'Background'], ['surface', 'Surface'], ['accent', 'Accent'],
        ].map(([key, label]) => (
          <label key={key} className="rounded-2xl border border-white/10 bg-zinc-950/70 p-3 text-xs font-semibold text-zinc-200">
            <span>{label}</span>
            <div className="mt-2 flex items-center gap-2">
              <input aria-label={`${label} color`} type="color" value={project.brand?.[key] || '#ffffff'} onChange={(event) => applyBrandPatch({ [key]: event.target.value })} className="h-8 w-10 rounded border-0 bg-transparent" />
              <span className="font-mono text-[10px] text-zinc-500">{project.brand?.[key] || '#ffffff'}</span>
            </div>
          </label>
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
        <p className="text-xs font-bold text-white">Scenes and captions</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">The planner adds only supported, editable scene components. Captions remain anchored to the retained words, separate from explanatory graphics.</p>
        <button onClick={() => setStep('preview')} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#c8f135]">Review preview <ChevronRight className="h-4 w-4" /></button>
      </div>
    </section>
  );

  const renderPreview = () => (
    <section className="space-y-4">
      <StageTitle title="Preview and export" detail="Renders are pinned to the saved revision shown here. A browser timing guide is never presented as the final export." />
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-black">
        <div className="aspect-[9/16] max-h-[55vh] w-full bg-zinc-950">
          {previewUrl || activeSourceUrl ? <video className="h-full w-full object-contain" controls src={previewUrl || activeSourceUrl} /> : <div className="grid h-full place-items-center text-xs text-zinc-500">Preview becomes available after footage is uploaded.</div>}
        </div>
      </div>
      <JobBadge job={preview} />
      <div className="flex flex-wrap gap-2">
        <button onClick={() => requestPreview('preview')} className={primaryButton(false)}><RefreshCw className="h-4 w-4" /> Render 5-second preview</button>
        <button onClick={() => requestPreview('export')} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#c8f135]/50 px-4 text-xs font-bold text-[#c8f135] hover:bg-[#c8f135]/10"><Download className="h-4 w-4" /> Export MP4</button>
      </div>
      {preview?.status === 'succeeded' && <button onClick={() => reelsApi.getJobDownloadUrl(preview.id).then((urls) => window.open(urls.downloadUrl, '_blank', 'noopener'))} className="text-xs font-bold text-[#c8f135] underline">Download rendered file</button>}
      <form onSubmit={submitRevisionRequest} className="rounded-2xl border border-white/10 bg-zinc-950/70 p-3">
        <label htmlFor="revision-request" className="text-xs font-bold text-white">Make a precise correction</label>
        <p className="mt-1 text-[10px] text-zinc-500">Example: “restore video at 00:10”</p>
        <div className="mt-2 flex gap-2">
          <input id="revision-request" value={revisionRequest} onChange={(event) => setRevisionRequest(event.target.value)} placeholder="Describe one correction…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black px-3 py-2 text-xs text-white placeholder:text-zinc-600" />
          <button disabled={isSubmittingPatch} className={primaryButton(isSubmittingPatch)}>{isSubmittingPatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />} Apply</button>
        </div>
      </form>
    </section>
  );

  const activePanel = { sources: renderSources, clean: renderClean, style: renderStyle, preview: renderPreview }[step] || renderSources;
  return (
    <div className="min-h-full bg-black text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/95 px-3 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c8f135]">ZeroLens Reel Editor v2</p><h1 className="truncate text-sm font-bold text-white">{project.name}</h1></div>
          <div className="flex gap-2">
            <select aria-label="Project" value={project.id} onChange={(event) => onSelectProject?.(event.target.value)} className="max-w-36 rounded-lg border border-white/10 bg-zinc-950 px-2 py-1.5 text-[11px] text-white">
              <option value={project.id}>{project.name}</option>
              {projectsList.filter((item) => item.id !== project.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <button onClick={onCreateProject} className="rounded-lg border border-white/10 p-2 text-zinc-300 hover:bg-white/10" aria-label="New reel"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-5 p-3 pb-24 sm:p-6 lg:grid-cols-[190px_minmax(0,1fr)]">
        <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/70 p-1 lg:flex-col lg:overflow-visible">
          {STEPS.map((item) => {
            const Icon = item.icon;
            const selected = item.id === step;
            return <button key={item.id} onClick={() => setStep(item.id)} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-left text-xs font-bold ${selected ? 'bg-[#c8f135] text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}><Icon className="h-4 w-4" /> {item.label}</button>;
          })}
        </nav>
        <div className="min-w-0 rounded-3xl border border-white/10 bg-zinc-900/30 p-4 sm:p-6">
          {error && <div className="mb-4 flex gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-100"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
          {notice && <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-xs text-emerald-100">{notice}</div>}
          {activePanel()}
        </div>
      </main>
    </div>
  );
}
