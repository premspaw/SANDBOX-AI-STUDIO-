import React, { useEffect, useRef, useState } from 'react';
import { Upload, Film, Sparkles, Check, Loader2, Download, Plus, Undo2, Redo2, ArrowUp, ArrowDown, MessageSquare } from 'lucide-react';
import { reelsApi } from './services/reelsApi.js';
import { useReelsEditor } from './hooks/useReelsEditor.js';
import { ReelsPlayer } from './components/ReelsPlayer.jsx';
import { ReelsExportModal } from './components/ReelsExportModal.jsx';
import { ReelsTimeline } from './components/ReelsTimeline.jsx';
import { ReelsInspector } from './components/ReelsInspector.jsx';
import { SilenceModal } from './components/SilenceModal.jsx';
import { TemplateLibraryModal } from './components/TemplateLibraryModal.jsx';
import { DEFAULT_BRAND, applyBrand } from './core/brand.js';
import { EDIT_STYLES } from './core/editStyles.js';
import { runOneClickEdit } from './services/oneClickEdit.js';
import './reelsStudio.css';

const STAGES = [['cleanup', 'Clean speech', 'Shorten silence and prepare clear audio'],
  ['design', 'Apply your style', 'OpenAI reads the speech and plans visual emphasis'],
  ['render', 'Build your video', 'Render the cuts, audio and animated text'],
  ['done', 'Ready to review', 'Watch your edited video and download']];
const PALETTES = [
  { name: 'Midnight', background: '#101525', surface: '#202B42', text: '#FFFFFF', accent: '#C8F135', secondary: '#9C89FF' },
  { name: 'Paper', background: '#FAF7F0', surface: '#E6DED0', text: '#202020', accent: '#B44928', secondary: '#396A66' },
  { name: 'Ocean', background: '#071E2B', surface: '#12394B', text: '#F0FAFF', accent: '#48D6C0', secondary: '#7DA8FF' },
];
const message = e => e?.message || 'Something went wrong. Please try again.';

export default function ReelsEditorPage() {
  const [projects, setProjects] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    let live = true;
    reelsApi.listProjects().then(async list => {
      if (!live) return;
      setProjects(list);
      if (list.length) {
        const project = await reelsApi.getProject(list[0].id);
        if (live) setActive(project);
      }
    }).catch(e => { if (live) setError(message(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);
  async function open(id) {
    setLoading(true); setError('');
    try { setActive(await reelsApi.getProject(id)); }
    catch (e) { setError(message(e)); }
    finally { setLoading(false); }
  }
  async function create() {
    if (creating) return;
    setCreating(true); setError('');
    try {
      const project = await reelsApi.createProject('Untitled video');
      setProjects(p => [project, ...p]); setActive(project);
    } catch (e) { setError(message(e)); }
    finally { setCreating(false); }
  }
  if (loading) return <div className="reel-studio rs-welcome" role="status"><Loader2 className="rs-spin" /><p>Opening your studio…</p></div>;
  return <div className="reel-studio">
    {error && <div role="alert" className="rs-error">{error}</div>}
    {active ? <Studio key={active.id} initialProject={active} projects={projects} onOpen={open} onNew={create} />
      : <div className="rs-welcome">
        <div className="rs-mark"><Film size={32} /></div>
        <span className="rs-eyebrow">ZEROLENS / VIDEO EDITOR</span>
        <h1>Your footage.<br />Your style. One edit.</h1>
        <p>Upload your clips, choose a template, and let your editor handle the first cut.</p>
        <button className="rs-primary" disabled={creating} onClick={create}><Plus size={18} />Create a video</button>
      </div>}
  </div>;
}

function Studio({ initialProject, projects, onOpen, onNew }) {
  const editor = useReelsEditor(initialProject);
  const { project, timeline } = editor;
  const [style, setStyle] = useState(initialProject.editStyle || 'reference-editor');
  const [tab, setTab] = useState('templates');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploadText, setUploadText] = useState('');
  const [output, setOutput] = useState(null);
  const [view, setView] = useState('draft');
  const [transcript, setTranscript] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [chat, setChat] = useState('');
  const [history, setHistory] = useState([]);
  const [showExport, setShowExport] = useState(false);
  const [showSilence, setShowSilence] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [exportProject, setExportProject] = useState(project);
  const input = useRef(null);
  const lock = useRef(false);
  const controller = useRef(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; controller.current?.abort(); }; }, []);
  const [engine, setEngine] = useState(null);
  useEffect(() => {
    let live = true;
    reelsApi.getAiEngines().then(items => { if (live) setEngine(items.find(x => x.id === 'openai') || { available: false }); })
      .catch(e => { if (live) { setError(message(e)); setEngine({ available: false }); } });
    return () => { live = false; };
  }, []);
  // Existing render jobs remain available after a refresh; never replay paid AI automatically.
  useEffect(() => {
    let live = true;
    reelsApi.listRecentExports(project.id).then(async jobs => {
      const ready = jobs.find(j => j.status === 'succeeded' && j.revision === initialProject.revision);
      const running = jobs.find(j => ['queued', 'running'].includes(j.status));
      if (running && live) setNotice('A render is still running. Open Export to check your saved jobs before starting another edit.');
      if (ready) {
        const info = await reelsApi.getJobDownloadUrl(ready.id);
        if (live) setOutput({ ...info, revision: ready.revision });
      }
    }).catch(() => {});
    return () => { live = false; };
  }, [project.id]);
  const brand = { ...DEFAULT_BRAND, ...project.brand };
  const selected = EDIT_STYLES.find(s => s.id === style);
  const stale = output && (output.revision !== project.revision || editor.isSaving);
  const hasVideo = project.sources.length > 0;
  async function guarded(work) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    editor.setIsPlaying(false);
    try { await work(); }
    catch (e) { if (alive.current) setError(message(e)); }
    finally { lock.current = false; if (alive.current) { setBusy(false); setUploadText(''); } }
  }
  async function upload(files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    await guarded(async () => {
      if (project.sources.length + list.length > 8) throw new Error('Use up to eight source videos in one project.');
      await editor.flushSave();
      const warnings = [];
      for (let i = 0; i < list.length; i++) {
        if (!alive.current) return;
        const file = list[i];
        if (file.size > 250 * 1024 * 1024) throw new Error(file.name + ' exceeds 250 MB.');
        const result = await reelsApi.uploadSource(project.id, file, {
          onProgress: p => { if (alive.current) setUploadText('Uploading ' + (i + 1) + '/' + list.length + ' · ' + p + '%'); },
        });
        if (!alive.current) return;
        editor.replaceProject(result.project);
        warnings.push(...(result.warnings || []));
      }
      setNotice(warnings.join(' ') || 'Footage uploaded. Choose your template, then click Edit Video.');
      setView('draft'); setStage('');
    });
  }
  async function edit(refinement = false) {
    await guarded(async () => {
      if (!engine?.available) throw new Error('Configure OPENAI_API_KEY on the server to enable editing.');
      if (refinement && !chat.trim()) return;
      await editor.flushSave();
      const saved = await reelsApi.getProject(project.id);
      controller.current = new AbortController();
      const request = chat.trim();
      const result = await runOneClickEdit({
        api: reelsApi, project: saved, style,
        cleanup: !refinement,
        userPrompt: refinement ? 'Refine only the requested visual layers; return other existing layers unchanged. User request: ' + request : '',
        signal: controller.current.signal,
        onStage: value => { if (alive.current) setStage(value); },
        onProject: value => { if (alive.current) editor.replaceProject(value); },
      });
      if (!alive.current) return;
      setOutput({ ...result.output, revision: result.project.revision });
      setTranscript(result.transcript); setView('rendered');
      setNotice(result.summary || 'Your edited video is ready.');
      if (refinement) { setHistory(h => [...h, { request, result: result.summary }]); setChat(''); }
    });
  }
  async function openExport() {
    await guarded(async () => {
      await editor.flushSave();
      setExportProject(await reelsApi.getProject(project.id));
      setShowExport(true);
    });
  }
  async function switchProject(id) { await guarded(async () => { await editor.flushSave(); await onOpen(id); }); }
  const setBrand = patch => editor.mutate(p => applyBrand(p, patch));
  return <>
    <header className="rs-header">
      <div className="rs-title"><div className="rs-mark"><Film size={20} /></div><div><strong>Video Editor</strong><small>From raw footage to your first cut</small></div></div>
      <div className="rs-header-actions">
        <select aria-label="Project" disabled={busy} value={project.id} onChange={e => switchProject(e.target.value)}>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button disabled={busy} onClick={() => guarded(async () => { await editor.flushSave(); await onNew(); })}><Plus size={16} /><span>New</span></button>
        <button disabled={busy || !editor.canUndo} onClick={editor.undo} aria-label="Undo"><Undo2 size={17} /></button>
        <button disabled={busy || !editor.canRedo} onClick={editor.redo} aria-label="Redo"><Redo2 size={17} /></button>
        <button disabled={busy || !hasVideo} onClick={openExport}><Download size={16} />Export</button>
      </div>
    </header>
    <div className="rs-subheader"><span>1 Upload <span aria-hidden="true">/</span> 2 Choose a template <span aria-hidden="true">/</span> 3 Edit Video</span><span role="status">{editor.saveError ? 'Save failed' : editor.isSaving ? 'Saving…' : 'Saved'}</span></div>
    {(error || editor.saveError) && <div className="rs-error" role="alert">{error || editor.saveError}</div>}
    {notice && <div className="rs-notice" role="status">{notice}</div>}
    <div className="rs-layout">
      <aside className="rs-sidebar">
        <fieldset disabled={busy} className="rs-controls">
          <input ref={input} type="file" multiple accept="video/*" className="rs-file-input" aria-label="Upload videos" onChange={e => { upload(e.target.files); e.target.value = ''; }} />
          <button className="rs-upload" onClick={() => input.current?.click()}
            onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); upload(e.dataTransfer.files); }}>
            <Upload size={22} /><strong>{hasVideo ? 'Add footage' : 'Upload your videos'}</strong><small>Drop clips here · up to 250 MB each</small>
          </button>
          <div className="rs-tabs" role="tablist" aria-label="Editing settings">
            {['templates', 'media', 'brand'].map(t => <button key={t} role="tab" aria-selected={tab === t} aria-controls={'rs-panel-' + t} id={'rs-tab-' + t} onClick={() => setTab(t)}>{t}</button>)}
          </div>
          <div role="tabpanel" id={'rs-panel-' + tab} aria-labelledby={'rs-tab-' + tab}>
            {tab === 'templates' && <div className="rs-template-list">
              <p className="rs-muted">Pick a visual direction. Your footage and voice stay yours.</p>
              {EDIT_STYLES.map(s => <button key={s.id} aria-pressed={style === s.id} className={'rs-template ' + (style === s.id ? 'is-selected' : '')} onClick={() => { setStyle(s.id); editor.mutate(p => ({ ...p, editStyle: s.id })); }}>
                <div className={'rs-template-art art-' + s.id} style={{ background: brand.background, color: brand.text, '--template-accent': brand.accent }}>
                  <span className="rs-art-tag">{s.id === 'reference-editor' ? 'STORY + MOTION' : 'TEXT LAYOUT'}</span>
                  <strong>{s.sample}</strong><i />
                </div>
                <div className="rs-template-title"><strong>{s.name}</strong>{style === s.id && <Check size={16} />}</div>
                <small>{s.description}</small>
              </button>)}
            </div>}
            {tab === 'media' && <div className="rs-media">
              <p className="rs-muted">Clips play in timeline order. Uploading does not start an AI edit.</p>
              {!hasVideo && <p>No clips yet.</p>}
              {project.sources.map((s, i) => <div className="rs-source" key={s.id}><Film size={20} /><div><strong>{i + 1}. {s.filename}</strong><small>{s.meta.durationSec.toFixed(1)}s · {s.meta.width}×{s.meta.height}</small></div></div>)}
              {project.clips.filter(c => c.enabled).map(c => {
                const i = project.clips.findIndex(x => x.id === c.id);
                return <div className="rs-clip-order" key={c.id}><span>{project.sources.find(s => s.id === c.sourceId)?.filename} · {c.inSec.toFixed(1)}–{c.outSec.toFixed(1)}s</span>
                  <button aria-label="Move clip earlier" disabled={i === 0} onClick={() => editor.reorderClip(i, i - 1)}><ArrowUp size={14} /></button>
                  <button aria-label="Move clip later" disabled={i === project.clips.length - 1} onClick={() => editor.reorderClip(i, i + 1)}><ArrowDown size={14} /></button>
                </div>;
              })}
              <details><summary>Restore removed gaps</summary>
                {project.clips.filter(c => !c.enabled && c.origin === 'gap-removal').map(c => <button className="rs-restore" key={c.id} onClick={() => editor.updateClipProps(c.id, { enabled: true })}>Restore {c.inSec.toFixed(2)}–{c.outSec.toFixed(2)}s · {project.sources.find(s => s.id === c.sourceId)?.filename}</button>)}
              </details>
            </div>}
            {tab === 'brand' && <div className="rs-brand">
              <h3>Make it yours</h3>
              <div className="rs-palettes">{PALETTES.map(p => <button key={p.name} onClick={() => { const { name, ...colors } = p; setBrand(colors); }}><span>{[p.background, p.text, p.accent].map(c => <i key={c} style={{ background: c }} />)}</span>{p.name}</button>)}</div>
              {['background', 'surface', 'text', 'accent', 'secondary'].map(k => <label key={k}>{k}<input type="color" value={brand[k]} onChange={e => setBrand({ [k]: e.target.value })} /></label>)}
              <label>Font<select value={brand.font} onChange={e => setBrand({ font: e.target.value })}><option value="poppins">Poppins Bold</option><option value="noto-kannada">Noto Sans Kannada</option></select></label>
              <label>Motion<select value={brand.animation} onChange={e => setBrand({ animation: e.target.value })}><option value="slide-up">Slide up</option><option value="fade">Fade</option><option value="none">None</option></select></label>
              <label>Output size<select value={project.canvas.width + 'x' + project.canvas.height} onChange={e => { const [width, height] = e.target.value.split('x').map(Number); editor.mutate(p => ({ ...p, canvas: { ...p.canvas, width, height } })); }}>
                {[...new Set([project.canvas.width + 'x' + project.canvas.height, ...(project.sources[0] ? [Math.round(project.sources[0].meta.width / 2) * 2 + 'x' + Math.round(project.sources[0].meta.height / 2) * 2] : []), '1080x1920', '1920x1080', '1080x1080', '720x1280'])].map(size => <option key={size}>{size}</option>)}
              </select></label>
            </div>}
          </div>
        </fieldset>
        <div className="rs-action">
          <span className="rs-muted">Selected: {selected?.name}</span>
          <button className="rs-primary" disabled={busy || !hasVideo || !engine?.available} onClick={() => edit(false)}>
            {busy ? <Loader2 className="rs-spin" size={18} /> : <Sparkles size={18} />}{busy ? (uploadText || 'Editing…') : 'Edit Video'}
          </button>
          <small>Silence cleanup · light denoise · animated text · MP4</small>
          <small>{engine === null ? 'Checking OpenAI connection…' : engine.available ? 'OpenAI · ' + engine.defaultModel : 'OpenAI is not configured on the server.'}</small>
        </div>
      </aside>
      <main className="rs-main">
        <div className="rs-preview-header"><div><span className="rs-eyebrow">YOUR CANVAS</span><h2>{hasVideo ? 'See your story take shape' : 'Start with your footage'}</h2></div>
          <div className="rs-preview-tabs"><button aria-pressed={view === 'draft'} onClick={() => setView('draft')}>Draft</button><button disabled={!output} aria-pressed={view === 'rendered'} onClick={() => { editor.setIsPlaying(false); setView('rendered'); }}>Rendered</button></div>
        </div>
        <div className="rs-preview">
          {view === 'rendered' && output ? <video key={output.playUrl} src={output.playUrl} controls playsInline preload="metadata" className="rs-rendered-video" />
            : hasVideo ? <ReelsPlayer project={project} timeline={timeline} currentFrame={editor.currentFrame} setCurrentFrame={editor.setCurrentFrame} isPlaying={editor.isPlaying} setIsPlaying={editor.setIsPlaying} sourceUrls={editor.sourceUrls} selectedOverlayId={editor.selectedOverlayId} setSelectedOverlayId={editor.setSelectedOverlayId} onUpdateOverlay={busy ? () => {} : editor.updateText} />
            : <div className="rs-empty-preview"><Film size={42} /><h3>Your video belongs here</h3><p>Upload a clip and choose a template.<br />One button handles the first edit.</p><button onClick={() => input.current?.click()} disabled={busy}><Upload size={16} />Choose videos</button></div>}
        </div>
        <div className="rs-preview-note"><span>{view === 'rendered' ? stale ? 'Earlier render — rebuild to include your latest changes.' : 'Rendered video · processed audio included' : 'Draft preview · processed audio is available after rendering'}</span>{output && <a href={output.downloadUrl} download={output.fileName}><Download size={15} />Download{stale ? ' earlier render' : ' MP4'}</a>}</div>
        {stage && <section className="rs-progress" aria-live="polite" aria-label="Editing progress">{STAGES.map(([id, title, detail], i) => {
          const active = stage === id;
          const complete = STAGES.findIndex(s => s[0] === stage) > i || stage === 'done';
          return <div key={id} className={active ? 'is-active' : ''}><span>{complete ? <Check size={15} /> : active && busy ? <Loader2 size={15} className="rs-spin" /> : i + 1}</span><div><strong>{title}</strong><small>{detail}</small></div></div>;
        })}</section>}
        <div className="rs-refine-header"><button disabled={!hasVideo} onClick={() => setShowChat(s => !s)}><MessageSquare size={17} />Make changes</button><span className="rs-muted">Optional. Start with Edit Video above.</span></div>
        {showChat && <section className="rs-chat">
          {history.map((h, i) => <div key={i}><strong>{h.request}</strong><p>{h.result}</p></div>)}
          <p className="rs-muted">Ask for text, layout or timing changes. Restore removed speech in Media.</p>
          <form onSubmit={e => { e.preventDefault(); edit(true); }}><textarea aria-label="Editing request" value={chat} disabled={busy} onChange={e => setChat(e.target.value)} placeholder="Make the title smaller, or change the callout near 00:10…" maxLength={4000} /><button className="rs-primary" disabled={busy || !chat.trim() || !engine?.available}>Apply changes</button></form>
        </section>}
        {transcript && <details className="rs-details"><summary>View transcript</summary><p className="rs-muted">Speech reference. Exact word timing is not available in this version.</p><p className="rs-transcript">{transcript}</p></details>}
        {hasVideo && <details className="rs-details"><summary>Timeline & precise controls</summary><fieldset disabled={busy} className="rs-controls">
          <ReelsTimeline project={project} timeline={timeline} currentFrame={editor.currentFrame} onSeek={editor.seekToFrame} selectedClipId={editor.selectedClipId} onSelectClip={editor.setSelectedClipId} selectedOverlayId={editor.selectedOverlayId} onSelectOverlay={editor.setSelectedOverlayId} onSplit={editor.splitClipAtPlayhead} onUpdateClip={editor.updateClipProps} onMoveClip={editor.reorderClip} onDeleteClip={editor.removeClip} onAddText={editor.addText} onOpenTemplates={() => setShowTemplates(true)} onOpenSilenceModal={() => setShowSilence(true)} />
          <ReelsInspector project={project} selectedClipId={editor.selectedClipId} onUpdateClip={editor.updateClipProps} onDeleteClip={editor.removeClip} selectedOverlayId={editor.selectedOverlayId} onUpdateOverlay={editor.updateText} onDeleteOverlay={editor.removeText} onOpenTemplates={() => setShowTemplates(true)} onSetAudioDenoise={editor.setAudioDenoise} onSetAudioNormalize={editor.setAudioNormalize} />
        </fieldset></details>}
        <p className="rs-capability-note">Current templates use animated text and cards. Cleanup removes acoustic silence; word-level stumble removal and arbitrary image animations are not yet supported.</p>
      </main>
    </div>
    <ReelsExportModal isOpen={showExport} onClose={() => setShowExport(false)} project={exportProject} />
    <SilenceModal isOpen={showSilence} onClose={() => setShowSilence(false)} projectId={project.id} sources={project.sources} onApplyGaps={editor.applyGaps} />
    <TemplateLibraryModal isOpen={showTemplates} onClose={() => setShowTemplates(false)} onApplyTemplate={editor.applyTemplate} />
  </>;
}
