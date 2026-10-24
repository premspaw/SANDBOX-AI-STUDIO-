import React, { useState } from 'react';
import {
  FolderOpen,
  Plus,
  Check,
  Loader2,
  Undo2,
  Redo2,
  ChevronDown,
  Sparkles,
  Film,
  Upload,
} from 'lucide-react';
import { STEPS } from '../core/guidedPresets.js';

export function GuidedStepperHeader({
  project,
  currentStepIndex,
  onSelectStep,
  completedSteps,
  editor,
  projectsList,
  onSelectProject,
  onCreateNewProject,
  onOpenAiModal,
  onOpenExportModal,
  onToggleArgonView,
}) {
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  return (
    <header className="h-16 border-b border-white/10 bg-zinc-950 px-4 md:px-6 flex items-center justify-between z-40 shrink-0 select-none">
      {/* Left: Project Selector & Auto-save */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowProjectDropdown(!showProjectDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-white transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#c8f135]" />
            <span className="max-w-[130px] truncate">{project.name || 'Untitled Reel'}</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {showProjectDropdown && (
            <div className="absolute top-full left-0 mt-1.5 w-60 rounded-2xl bg-zinc-950 border border-white/10 shadow-2xl p-1.5 z-50">
              <button
                onClick={async () => {
                  setShowProjectDropdown(false);
                  try {
                    await editor.flushSave();
                    onCreateNewProject();
                  } catch (err) {
                    console.warn('Failed to start new reel:', err);
                  }
                }}
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
                    onClick={async () => {
                      setShowProjectDropdown(false);
                      try {
                        await editor.flushSave();
                        onSelectProject(p.id);
                      } catch (err) {
                        console.warn('Failed to select project:', err);
                      }
                    }}
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

        {/* Auto-save indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
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

        {/* Undo / Redo */}
        <div className="flex items-center gap-1 bg-zinc-900/60 p-1 rounded-xl border border-white/5 ml-1">
          <button
            onClick={editor.undo}
            disabled={!editor.canUndo}
            className="p-1 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={editor.redo}
            disabled={!editor.canRedo}
            className="p-1 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
            title="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Stepper Nav Tabs */}
      <nav className="flex items-center gap-1 md:gap-2">
        {STEPS.map((step, idx) => {
          const isActive = currentStepIndex === idx;
          const isDone = completedSteps.has(step.id) && !isActive;

          return (
            <button
              key={step.id}
              onClick={() => onSelectStep(idx)}
              className={`relative px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm font-semibold transition-all rounded-lg flex items-center gap-1 ${
                isActive
                  ? 'text-white font-bold'
                  : isDone
                  ? 'text-zinc-300 hover:text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span>{step.label}</span>
              {isDone && <Check className="w-3.5 h-3.5 text-[#c8f135] stroke-[2.5]" />}
              {isActive && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#c8f135] rounded-full shadow-[0_0_8px_#c8f135]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Right: AI Quick Action & Export Trigger */}
      <div className="flex items-center gap-2">
        {onToggleArgonView && (
          <button
            onClick={onToggleArgonView}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/15 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-bold transition-all shadow-sm shadow-emerald-500/10"
            title="Switch to Gemini 4 Argon Autonomous Studio"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">✨ Argon 4 Studio</span>
          </button>
        )}

        <button
          onClick={onOpenAiModal}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-white text-xs font-bold transition-all"
          title="Auto-Direct Reel with Gemini 4 Argon"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>AI Magic</span>
        </button>

        <button
          onClick={onOpenExportModal}
          className="px-4 py-1.5 rounded-xl bg-[#c8f135] text-black font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-md shadow-[#c8f135]/20 flex items-center gap-1.5"
        >
          <Film className="w-3.5 h-3.5 fill-current" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
}
