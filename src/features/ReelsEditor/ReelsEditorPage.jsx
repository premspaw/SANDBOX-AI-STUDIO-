import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Film,
  Plus,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { reelsApi } from './services/reelsApi.js';
import { useReelsEditor } from './hooks/useReelsEditor.js';
import { applyGapRemoval } from './core/editPlan.js';
import { applyBrand } from './core/brand.js';
import { SilenceModal } from './components/SilenceModal.jsx';
import { ReelsExportModal } from './components/ReelsExportModal.jsx';
import { AiSmartEditModal } from './components/AiSmartEditModal.jsx';
import { GuidedStepperHeader } from './components/GuidedStepperHeader.jsx';
import { GuidedPlayerPanel } from './components/GuidedPlayerPanel.jsx';
import { GuidedBottomBar } from './components/GuidedBottomBar.jsx';
import { GuidedStepStage } from './components/GuidedStepStage.jsx';
import { STEPS, COLOUR_PALETTES, FONT_PAIRINGS, HOOK_STYLES, CAPTION_STYLES } from './core/guidedPresets.js';

export default function ReelsEditorPage() {
  const [projectsList, setProjectsList] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeProjectData, setActiveProjectData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('Loading Reel Studio…');
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

  const handleSelectProject = async (id) => {
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
    setLoadingMessage('Uploading raw footage to ZeroLens Studio…');
    setIsLoading(true);

    try {
      let targetProjectId = activeProjectId;
      if (!targetProjectId) {
        const newProj = await reelsApi.createProject(file.name.replace(/\.[^/.]+$/, ''));
        targetProjectId = newProj.id;
        setActiveProjectId(newProj.id);
      }

      const res = await reelsApi.uploadSource(targetProjectId, file, {
        onProgress: (p) => {
          setUploadProgress(p);
          setLoadingMessage(`Uploading raw footage (${p}%)…`);
        },
      });

      let cleaned = res.project;
      if (res.source.meta.hasAudio) {
        setUploadProgress(100);
        setLoadingMessage('Trimming stumbles and dead air (1:1 EDL math rule)…');
        const job = await reelsApi.detectSilence(targetProjectId, { sourceId: res.source.id });
        let status = job;
        const deadline = Date.now() + 15 * 60 * 1000;
        while (!['succeeded', 'failed', 'cancelled'].includes(status.status)) {
          if (Date.now() > deadline) throw new Error('Cleanup timed out.');
          await new Promise((r) => setTimeout(r, 1500));
          status = await reelsApi.getJobStatus(job.id);
        }
        if (status.status !== 'succeeded') throw new Error(status.error || 'Cleanup failed');
        cleaned = applyGapRemoval(cleaned, status.result?.gaps || []);
        cleaned.audio = { denoise: { enabled: true, strength: 'light' }, normalize: { enabled: true, targetLufs: -14 } };
        cleaned = await reelsApi.saveRevision(cleaned.id, res.project.revision, cleaned);
      }

      // ── Auto-Direct with Gemini 4 Argon Skill on upload! ──
      setLoadingMessage('✨ Gemini 4 Argon: Analyzing footage with video editor skill & generating cut…');
      try {
        const aiRes = await reelsApi.applyAiEdit(cleaned.id, {
          engine: 'gemini',
          userPrompt: 'Auto-edit this footage into a viral high-retention reel with scroll-stopping hook and captions',
        });
        if (aiRes?.project) {
          cleaned = aiRes.project;
        }
      } catch (aiErr) {
        console.warn('Argon auto-direct notice:', aiErr.message);
      }

      setActiveProjectData(cleaned);
      setUploadProgress(null);
      reelsApi.listProjects().then(setProjectsList).catch(() => {});
    } catch (err) {
      setUploadError(err.message || 'Failed to upload video');
      setUploadProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full min-h-[600px] flex flex-col items-center justify-center bg-black text-white p-6">
        <Loader2 className="w-8 h-8 animate-spin text-[#c8f135] mb-3" />
        <p className="font-mono text-xs text-zinc-300 uppercase tracking-widest text-center max-w-sm">
          {loadingMessage}
        </p>
      </div>
    );
  }

  // Welcome upload screen if no sources
  if (!activeProjectData || activeProjectData.sources.length === 0) {
    return (
      <div className="w-full h-full min-h-[600px] flex flex-col items-center justify-center bg-black text-white p-6 relative select-none">
        <div className="max-w-md w-full text-center space-y-6 z-10">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#c8f135] to-emerald-500 flex items-center justify-center shadow-2xl shadow-[#c8f135]/20">
            <Film className="w-10 h-10 text-black" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] bg-[#c8f135]/15 border border-[#c8f135]/30 text-[#c8f135] px-3 py-1 rounded-full">
              AI Reels Studio
            </span>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent mt-2">
              Transform Raw Footage
            </h1>
            <p className="text-zinc-400 text-xs leading-relaxed max-w-sm mx-auto font-medium">
              Upload raw video to easily create viral portrait Reels with custom colours, fonts, hooks, and animations.
            </p>
          </div>

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
                Upload raw footage
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                MP4, MOV, WebM • Up to 250 MB
              </p>
            </div>
          </div>

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
    <GuidedEditorWorkspace
      key={`${activeProjectData.id}:${activeProjectData.revision}`}
      initialProject={activeProjectData}
      projectsList={projectsList}
      onSelectProject={handleSelectProject}
      onCreateNewProject={handleCreateNewProject}
      onUploadNewSource={handleUploadFile}
      fileInputRef={fileInputRef}
    />
  );
}

// ── Main Guided Studio Workspace ──
function GuidedEditorWorkspace({
  initialProject,
  projectsList,
  onSelectProject,
  onCreateNewProject,
  onUploadNewSource,
  fileInputRef,
}) {
  // Start on step 2 (Fonts) or step 1 (Colours) matching the user reference photo!
  const [currentStepIndex, setCurrentStepIndex] = useState(2);
  const [completedSteps, setCompletedSteps] = useState(new Set(['colours']));
  const [showSilenceModal, setShowSilenceModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [surpriseToast, setSurpriseToast] = useState(null);
  const [isSurprising, setIsSurprising] = useState(false);

  const editor = useReelsEditor(initialProject);
  const { project, timeline } = editor;

  // Active stream URL for video preview
  const activeSourceId = project.clips?.[0]?.sourceId || project.sources?.[0]?.id;
  const activeStreamUrl = activeSourceId ? editor.sourceUrls[activeSourceId] : null;

  const currentStep = STEPS[currentStepIndex];

  // Step navigation
  const handleSelectStep = (idx) => {
    setCurrentStepIndex(idx);
    if (idx > 0) {
      setCompletedSteps((prev) => new Set([...prev, STEPS[idx - 1].id]));
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCompletedSteps((prev) => new Set([...prev, currentStep.id]));
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setShowExportModal(true);
    }
  };

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  // "Surprise me" feature: Runs Gemini 4 Argon to auto-edit reel with fresh aesthetic & story
  const handleSurpriseMe = async () => {
    setIsSurprising(true);
    const randomPalette = COLOUR_PALETTES[Math.floor(Math.random() * COLOUR_PALETTES.length)];
    const randomFont = FONT_PAIRINGS[Math.floor(Math.random() * FONT_PAIRINGS.length)];

    try {
      await editor.flushSave();
      const res = await reelsApi.applyAiEdit(project.id, {
        engine: 'gemini',
        userPrompt: 'Surprise me with a fresh high-converting viral hook, kinetic captions, and optimal pacing',
      });
      if (res?.project) {
        let updated = applyBrand(res.project, {
          background: randomPalette.background,
          surface: randomPalette.surface,
          text: randomPalette.text,
          accent: randomPalette.accent,
          secondary: randomPalette.secondary,
          font: randomFont.fontKey,
        });
        editor.replaceProject(updated);
        setSurpriseToast(`✨ Gemini 4 Argon auto-edited: ${randomFont.name} + ${randomPalette.name}!`);
        editor.setCurrentFrame(0);
        editor.setIsPlaying(true);
      }
    } catch {
      // Offline / fallback styling
      editor.mutate((p) => {
        let updated = applyBrand(p, {
          background: randomPalette.background,
          surface: randomPalette.surface,
          text: randomPalette.text,
          accent: randomPalette.accent,
          secondary: randomPalette.secondary,
          font: randomFont.fontKey,
        });
        return {
          ...updated,
          overlays: updated.overlays.map((o) => ({
            ...o,
            style: { ...o.style, font: randomFont.fontKey },
          })),
        };
      });
      setSurpriseToast(`✨ Surprise combo applied: ${randomFont.name} + ${randomPalette.name}!`);
    } finally {
      setTimeout(() => {
        setSurpriseToast(null);
        setIsSurprising(false);
      }, 3500);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-black text-white select-none overflow-hidden">
      {/* ── 1. Top Header Navigation (Stepper) ── */}
      <GuidedStepperHeader
        project={project}
        currentStepIndex={currentStepIndex}
        onSelectStep={handleSelectStep}
        completedSteps={completedSteps}
        editor={editor}
        projectsList={projectsList}
        onSelectProject={onSelectProject}
        onCreateNewProject={onCreateNewProject}
        onOpenAiModal={() => setShowAiModal(true)}
        onOpenExportModal={() => setShowExportModal(true)}
      />

      {/* ── 2. Step Subtitle Bar matching reference image ── */}
      <div className="px-6 py-2 border-b border-white/5 bg-zinc-950/60 flex items-center justify-between text-xs text-zinc-400 shrink-0">
        <div className="font-medium text-zinc-500">
          Step adds to the preview
        </div>
        {currentStep.stepNumber > 0 && (
          <div className="font-medium text-zinc-300">
            <span className="text-white font-bold">
              Step {currentStep.stepNumber} of 6. {currentStep.title}.
            </span>{' '}
            <span className="text-zinc-400">{currentStep.description}</span>
          </div>
        )}
      </div>

      {/* Surprise Toast Notification */}
      {surpriseToast && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-2xl bg-[#c8f135] text-black font-bold text-xs shadow-2xl shadow-[#c8f135]/30 animate-bounce">
          {surpriseToast}
        </div>
      )}

      {/* ── 3. Main Split Stage: Left Player (9:16) + Right Step Cards Grid ── */}
      <div className="flex-1 flex overflow-hidden p-4 md:p-6 gap-6">
        {/* Left: 9:16 Portrait Video Preview */}
        <GuidedPlayerPanel
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

        {/* Right: Active Step Preset Cards Grid */}
        <div className="flex-1 rounded-3xl bg-zinc-950/40 border border-white/10 flex flex-col overflow-hidden">
          <GuidedStepStage
            currentStepIndex={currentStepIndex}
            project={project}
            editor={editor}
            activeStreamUrl={activeStreamUrl}
            onOpenSilenceModal={() => setShowSilenceModal(true)}
            onOpenExportModal={() => setShowExportModal(true)}
            onOpenAiModal={() => setShowAiModal(true)}
            fileInputRef={fileInputRef}
            onUploadFile={onUploadNewSource}
          />
        </div>
      </div>

      {/* ── 4. Bottom Navigation Bar matching reference image ── */}
      <GuidedBottomBar
        currentStepIndex={currentStepIndex}
        onPreviousStep={handlePreviousStep}
        onNextStep={handleNextStep}
        onSurpriseMe={handleSurpriseMe}
        isSurprising={isSurprising}
      />

      {/* Silence Modal */}
      <SilenceModal
        isOpen={showSilenceModal}
        onClose={() => setShowSilenceModal(false)}
        projectId={project.id}
        sources={project.sources}
        onApplyGaps={editor.applyGaps}
      />

      {/* Export Modal */}
      <ReelsExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        project={project}
      />

      {/* AI Smart Edit / Auto-Director Modal */}
      <AiSmartEditModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        beforeEdit={editor.flushSave}
        projectId={project.id}
        onProjectUpdated={editor.replaceProject}
      />
    </div>
  );
}
