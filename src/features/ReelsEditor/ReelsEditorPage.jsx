import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Film,
  Plus,
  Undo2,
  Redo2,
  Save,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  ChevronDown,
  FolderOpen,
  Wand2,
  LayoutTemplate,
} from 'lucide-react';
import { reelsApi } from './services/reelsApi.js';
import { useReelsEditor } from './hooks/useReelsEditor.js';
import { ReelsPlayer } from './components/ReelsPlayer.jsx';
import { ReelsTimeline } from './components/ReelsTimeline.jsx';
import { ReelsInspector } from './components/ReelsInspector.jsx';
import { SilenceModal } from './components/SilenceModal.jsx';
import { ReelsExportModal } from './components/ReelsExportModal.jsx';
import { TemplateLibraryModal } from './components/TemplateLibraryModal.jsx';
import { AiSmartEditModal } from './components/AiSmartEditModal.jsx';
import { AiDirectorChatBar } from './components/AiDirectorChatBar.jsx';

export default function ReelsEditorPage() {
  const [projectsList, setProjectsList] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeProjectData, setActiveProjectData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [showSilenceModal, setShowSilenceModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const fileInputRef = useRef(null);

  // Load existing projects on mount
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const list = await reelsApi.listProjects();
        setProjectsList(list);
        if (list.length > 0) {
          const full = await reelsApi.getProject(list[0].id);
          setActiveProjectId(full.id);
          setActiveProjectData(full);
        }
      } catch (err) {
        console.warn('Failed to load reels projects:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // When activeProjectId changes, fetch full project
  const handleSelectProject = async (id) => {
    setShowProjectDropdown(false);
    setIsLoading(true);
    try {
      const full = await reelsApi.getProject(id);
      setActiveProjectId(full.id);
      setActiveProjectData(full);
    } catch (err) {
      console.error('Failed to select project:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewProject = async () => {
    setShowProjectDropdown(false);
    setIsLoading(true);
    try {
      const created = await reelsApi.createProject(`Reel #${projectsList.length + 1}`);
      setProjectsList((prev) => [created, ...prev]);
      setActiveProjectId(created.id);
      setActiveProjectData(created);
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploadProgress(0);

    try {
      let targetProjectId = activeProjectId;
      if (!targetProjectId) {
        const newProj = await reelsApi.createProject(file.name.replace(/\.[^/.]+$/, ''));
        targetProjectId = newProj.id;
        setActiveProjectId(newProj.id);
      }

      const res = await reelsApi.uploadSource(targetProjectId, file, {
        onProgress: (p) => setUploadProgress(p),
      });

      setActiveProjectData(res.project);
      setUploadProgress(null);
      // Refresh projects list
      reelsApi.listProjects().then(setProjectsList).catch(() => {});
    } catch (err) {
      setUploadError(err.message || 'Failed to upload video');
      setUploadProgress(null);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white p-6">
        <Loader2 className="w-8 h-8 animate-spin text-[#c8f135] mb-3" />
        <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest">
          Loading Reels Studio...
        </p>
      </div>
    );
  }

  // If no project or current project has no footage yet, show upload welcome view
  if (!activeProjectData || activeProjectData.sources.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white p-6 relative select-none">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#c8f135]/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-md w-full text-center space-y-6 z-10">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#c8f135] to-emerald-500 flex items-center justify-center shadow-2xl shadow-[#c8f135]/20">
            <Film className="w-10 h-10 text-black" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] bg-[#c8f135]/15 border border-[#c8f135]/30 text-[#c8f135] px-3 py-1 rounded-full">
              AI Reels Editor
            </span>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent mt-2">
              Transform Raw Footage
            </h1>
            <p className="text-zinc-400 text-xs leading-relaxed max-w-sm mx-auto font-medium">
              Upload raw video footage to edit cuts, remove silence gaps, enhance audio, add animated text, and export portrait Reels.
            </p>
          </div>

          {/* Upload Drop Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-8 rounded-3xl border-2 border-dashed border-white/10 hover:border-[#c8f135]/60 bg-zinc-950/80 hover:bg-zinc-900/40 cursor-pointer transition-all space-y-3 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleUploadFile}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-white/5 group-hover:bg-[#c8f135]/20 flex items-center justify-center mx-auto text-zinc-400 group-hover:text-[#c8f135] transition-colors">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-sm text-white group-hover:text-[#c8f135] transition-colors">
                Choose or drag raw footage
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                MP4, MOV, WebM • Up to 250 MB • Up to 120s
              </p>
            </div>
          </div>

          {uploadProgress !== null && (
            <div className="space-y-2 p-4 rounded-2xl bg-zinc-900 border border-white/10 text-xs">
              <div className="flex justify-between font-mono text-zinc-400">
                <span>Uploading footage...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-[#c8f135] transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {uploadError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {uploadError}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <EditorWorkspace
      key={activeProjectData.id}
      initialProject={activeProjectData}
      projectsList={projectsList}
      onSelectProject={handleSelectProject}
      onCreateNewProject={handleCreateNewProject}
      onUploadNewSource={handleUploadFile}
      fileInputRef={fileInputRef}
    />
  );
}

// Inner workspace with active project state
function EditorWorkspace({
  initialProject,
  projectsList,
  onSelectProject,
  onCreateNewProject,
  onUploadNewSource,
  fileInputRef,
}) {
  const [showSilenceModal, setShowSilenceModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showAiEditModal, setShowAiEditModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const editor = useReelsEditor(initialProject);
  const { project, timeline } = editor;

  return (
    <div className="flex flex-col h-screen w-full bg-black text-white select-none overflow-hidden">
      {/* ── Top Navigation Bar ── */}
      <header className="h-14 border-b border-white/10 bg-zinc-950 px-4 flex items-center justify-between z-40 shrink-0">
        {/* Left: Project Selector & Name */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-white transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#c8f135]" />
              <span className="max-w-[140px] truncate">{project.name}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {/* Dropdown list */}
            {showDropdown && (
              <div className="absolute top-full left-0 mt-1.5 w-60 rounded-2xl bg-zinc-950 border border-white/10 shadow-2xl p-1.5 z-50">
                <button
                  onClick={onCreateNewProject}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-bold text-[#c8f135] hover:bg-white/5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start New Reel</span>
                </button>
                <div className="my-1 border-t border-white/5" />
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {projectsList.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onSelectProject(p.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium truncate transition-colors ${
                        p.id === project.id
                          ? 'bg-[#c8f135]/15 text-[#c8f135] font-bold'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Editable project name input */}
          <input
            type="text"
            value={project.name}
            onChange={(e) => editor.setProject({ ...project, name: e.target.value })}
            className="bg-transparent border border-transparent hover:border-white/10 focus:border-[#c8f135] rounded-lg px-2 py-1 text-xs text-white font-semibold outline-none max-w-[200px] transition-colors"
          />

          {/* Revision & Auto-save status */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 pl-2">
            <span>Rev #{project.revision}</span>
            {editor.isSaving ? (
              <span className="flex items-center gap-1 text-amber-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Saving...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400">
                <Check className="w-3 h-3" />
                <span>Saved</span>
              </span>
            )}
          </div>
        </div>

        {/* Center: Undo / Redo */}
        <div className="flex items-center gap-1 bg-zinc-900/60 p-1 rounded-xl border border-white/5">
          <button
            onClick={editor.undo}
            disabled={!editor.canUndo}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={editor.redo}
            disabled={!editor.canRedo}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
            title="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* AI Magic Reel Multi-Model Auto-Editor */}
          <button
            onClick={() => setShowAiEditModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-[#c8f135] text-black font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg shadow-purple-500/25 flex items-center gap-1.5 group"
            title="Auto-Edit Reel with Gemini, GPT-4o, or Claude"
          >
            <Wand2 className="w-3.5 h-3.5 text-white group-hover:rotate-12 transition-transform" />
            <span className="text-white font-black tracking-tight">AI Magic Reel</span>
          </button>

          {/* Templates Library Launcher */}
          <button
            onClick={() => setShowTemplatesModal(true)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
            title="Cinematic Templates Library"
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-[#c8f135]" />
            <span>Templates</span>
          </button>

          {/* Add more footage button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
          >
            <Upload className="w-3.5 h-3.5 inline mr-1" />
            <span>Add Clip</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={onUploadNewSource}
            className="hidden"
          />

          {/* Export Button */}
          <button
            onClick={() => setShowExportModal(true)}
            className="px-5 py-2 rounded-xl bg-[#c8f135] text-black font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#c8f135]/25 flex items-center gap-1.5"
          >
            <Film className="w-3.5 h-3.5 fill-current" />
            <span>Export Reel</span>
          </button>
        </div>
      </header>

      {/* ── Main Middle Layout: Player + Inspector ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Player Canvas Area */}
        <div className="flex-1 flex items-center justify-center bg-[#070707] relative overflow-hidden">
          <ReelsPlayer
            project={project}
            timeline={timeline}
            currentFrame={editor.currentFrame}
            setCurrentFrame={editor.setCurrentFrame}
            isPlaying={editor.isPlaying}
            setIsPlaying={editor.setIsPlaying}
            sourceUrls={editor.sourceUrls}
            selectedOverlayId={editor.selectedOverlayId}
            setSelectedOverlayId={editor.setSelectedOverlayId}
            onUpdateOverlay={editor.updateText}
          />
        </div>

        {/* Right Inspector Panel */}
        <ReelsInspector
          project={project}
          selectedClipId={editor.selectedClipId}
          onUpdateClip={editor.updateClipProps}
          onDeleteClip={editor.removeClip}
          selectedOverlayId={editor.selectedOverlayId}
          onUpdateOverlay={editor.updateText}
          onDeleteOverlay={editor.removeText}
          onOpenTemplates={() => setShowTemplatesModal(true)}
          onSetAudioDenoise={editor.setAudioDenoise}
          onSetAudioNormalize={editor.setAudioNormalize}
        />
      </div>

      {/* ── AI Director Command & Dictation Chat Bar (Powered by Gemini 4 Argon) ── */}
      <AiDirectorChatBar
        projectId={project.id}
        onProjectUpdated={editor.replaceProject}
        onOpenFullModal={() => setShowAiEditModal(true)}
      />

      {/* ── Bottom Timeline ── */}
      <ReelsTimeline
        project={project}
        timeline={timeline}
        currentFrame={editor.currentFrame}
        onSeek={editor.seekToFrame}
        selectedClipId={editor.selectedClipId}
        onSelectClip={editor.setSelectedClipId}
        selectedOverlayId={editor.selectedOverlayId}
        onSelectOverlay={editor.setSelectedOverlayId}
        onSplit={editor.splitClipAtPlayhead}
        onUpdateClip={editor.updateClipProps}
        onMoveClip={editor.reorderClip}
        onDeleteClip={editor.removeClip}
        onAddText={editor.addText}
        onOpenTemplates={() => setShowTemplatesModal(true)}
        onOpenSilenceModal={() => setShowSilenceModal(true)}
      />

      {/* Templates Library Modal */}
      <TemplateLibraryModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onApplyTemplate={editor.applyTemplate}
        selectedOverlay={project.overlays.find((o) => o.id === editor.selectedOverlayId)}
      />

      {/* AI Smart Edit / Auto-Director Modal */}
      <AiSmartEditModal
        isOpen={showAiEditModal}
        onClose={() => setShowAiEditModal(false)}
        projectId={project.id}
        onProjectUpdated={editor.replaceProject}
      />

      {/* Silence Cleanup Modal */}
      <SilenceModal
        isOpen={showSilenceModal}
        onClose={() => setShowSilenceModal(false)}
        projectId={project.id}
        sources={project.sources}
        onApplyGaps={editor.applyGaps}
      />

      {/* Export & Render Modal */}
      <ReelsExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        project={project}
      />
    </div>
  );
}
