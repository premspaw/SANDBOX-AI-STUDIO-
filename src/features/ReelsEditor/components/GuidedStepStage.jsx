import React, { useState } from 'react';
import {
  Check,
  Sparkles,
  Upload,
  Volume2,
  VolumeX,
  Scissors,
  Wand2,
  Film,
  Download,
  Loader2,
  MessageSquare,
  Mic,
  Maximize2,
  Layers,
} from 'lucide-react';
import {
  COLOUR_PALETTES,
  FONT_PAIRINGS,
  HOOK_STYLES,
  CAPTION_STYLES,
  EXTRAS_PRESETS,
} from '../core/guidedPresets.js';
import { applyBrand } from '../core/brand.js';
import { getTemplateById, instantiateTemplate } from '../core/templates.js';
import { applyGapRemoval } from '../core/editPlan.js';
import { reelsApi } from '../services/reelsApi.js';

export function GuidedStepStage({
  currentStepIndex,
  project,
  editor,
  activeStreamUrl,
  onOpenSilenceModal,
  onOpenExportModal,
  onOpenAiModal,
  fileInputRef,
  onUploadFile,
}) {
  const [hookInputText, setHookInputText] = useState(
    project.overlays.find((o) => o.templateId === 'viral-hook')?.text ||
      'Quit your job?\nthe part nobody says\nthis was the dream'
  );
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiExecuting, setIsAiExecuting] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Helper to apply a colour palette
  const handleSelectPalette = (palette) => {
    editor.mutate((p) =>
      applyBrand(p, {
        background: palette.background,
        surface: palette.surface,
        text: palette.text,
        accent: palette.accent,
        secondary: palette.secondary,
      })
    );
  };

  // Helper to apply a font pairing
  const handleSelectFontPair = (fontPair) => {
    editor.mutate((p) => {
      // Set brand font
      const updatedBrand = { ...p.brand, font: fontPair.fontKey };
      // Update all existing text overlays to use this font
      const updatedOverlays = p.overlays.map((o) => ({
        ...o,
        style: { ...o.style, font: fontPair.fontKey },
      }));
      return { ...p, brand: updatedBrand, overlays: updatedOverlays };
    });
  };

  // Helper to apply a hook style
  const handleSelectHookStyle = (hook) => {
    editor.mutate((p) => {
      const template = getTemplateById('viral-hook');
      const textToUse = hookInputText || hook.defaultText;
      // Check if there is an existing hook overlay in first 3 seconds
      const existingIdx = p.overlays.findIndex((o) => o.startFrame === 0);
      const newOverlay = {
        kind: 'text',
        text: textToUse,
        startFrame: 0,
        durationFrames: 90, // 3s
        anchorMode: 'output',
        anchor: null,
        needsReview: false,
        templateId: 'viral-hook',
        templateVersion: '1.0.0',
        style: {
          x: hook.style.x,
          y: hook.style.y,
          fontSize: hook.style.fontSize,
          color: p.brand?.text || '#FFFFFF',
          boxColor: p.brand?.surface || '#000000',
          boxOpacity: hook.style.boxOpacity,
          font: p.brand?.font || 'poppins',
        },
        animation: { ...hook.animation },
      };

      let newOverlays = [...p.overlays];
      if (existingIdx >= 0) {
        newOverlays[existingIdx] = { ...newOverlays[existingIdx], ...newOverlay, id: newOverlays[existingIdx].id };
      } else {
        newOverlays.unshift({ ...newOverlay, id: `hook_${Date.now()}` });
      }
      return { ...p, overlays: newOverlays };
    });
  };

  // Helper to apply a caption style
  const handleSelectCaptionStyle = (caption) => {
    editor.mutate((p) => {
      // Find spoken caption overlay or add one
      const existing = p.overlays.filter((o) => o.templateId !== 'viral-hook');
      if (existing.length === 0) {
        // Add sample caption
        const newCap = {
          id: `caption_${Date.now()}`,
          kind: 'text',
          text: caption.sampleText,
          startFrame: 90,
          durationFrames: 75,
          anchorMode: 'output',
          anchor: null,
          needsReview: false,
          templateId: caption.templateId,
          templateVersion: '1.0.0',
          style: {
            x: 0.5,
            y: caption.y,
            fontSize: caption.fontSize,
            color: caption.color,
            boxColor: caption.boxColor,
            boxOpacity: caption.boxOpacity,
            font: p.brand?.font || 'poppins',
          },
          animation: { in: 'none', durationFrames: 0 },
        };
        return { ...p, overlays: [...p.overlays, newCap] };
      } else {
        // Update all caption overlays
        return {
          ...p,
          overlays: p.overlays.map((o) => {
            if (o.startFrame === 0) return o; // keep hook untouched
            return {
              ...o,
              templateId: caption.templateId,
              style: {
                ...o.style,
                fontSize: caption.fontSize,
                color: caption.color,
                boxColor: caption.boxColor,
                boxOpacity: caption.boxOpacity,
              },
            };
          }),
        };
      }
    });
  };

  // Helper to toggle an Extra
  const handleToggleExtra = async (extra) => {
    if (extra.type === 'silence') {
      onOpenSilenceModal();
    } else if (extra.type === 'audio') {
      const isEnabled = project.audio?.denoise?.enabled;
      editor.setAudioDenoise(!isEnabled, 'light');
      editor.setAudioNormalize(!isEnabled, -14);
    } else if (extra.type === 'template') {
      const exists = project.overlays.some((o) => o.templateId === extra.templateId);
      if (exists) {
        // Remove it
        editor.mutate((p) => ({
          ...p,
          overlays: p.overlays.filter((o) => o.templateId !== extra.templateId),
        }));
      } else {
        // Add it
        const t = getTemplateById(extra.templateId);
        if (t) {
          editor.applyTemplate(t, Math.round(project.canvas.fps * 3));
        }
      }
    }
  };

  // Direct AI Director Edit command
  const handleRunAiDirector = async () => {
    if (!aiPrompt.trim() || isAiExecuting) return;
    setIsAiExecuting(true);
    try {
      await editor.flushSave();
      const res = await reelsApi.aiEdit(project.id, {
        command: aiPrompt,
        model: 'gemini',
      });
      if (res?.project) {
        editor.replaceProject(res.project);
        setAiPrompt('');
      }
    } catch (err) {
      alert(`AI Edit error: ${err.message || 'Failed to apply'}`);
    } finally {
      setIsAiExecuting(false);
    }
  };

  // Voice dictation toggle
  const handleToggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your prompt.');
      return;
    }
    if (isListening) {
      setIsListening(false);
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (e) => {
        const text = e.results?.[0]?.[0]?.transcript;
        if (text) setAiPrompt((prev) => (prev ? `${prev} ${text}` : text));
      };
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* ── STEP 0: START ── */}
      {currentStepIndex === 0 && (
        <div className="space-y-6 max-w-4xl">
          <div>
            <h2 className="text-xl font-bold text-white">Project & Footage Overview</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Check your source video, manage audio cleanup, or upload new footage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Raw Footage Card */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#c8f135] bg-[#c8f135]/10 px-2.5 py-1 rounded-full border border-[#c8f135]/20">
                Active Source
              </span>
              <h3 className="text-base font-bold text-white truncate">
                {project.sources?.[0]?.meta?.width ? `${project.sources[0].meta.width} × ${project.sources[0].meta.height}` : 'HD 1080 × 1920'}
              </h3>
              <p className="text-xs text-zinc-400">
                Duration: {(project.timeline?.totalFrames / (project.canvas?.fps || 30)).toFixed(1)}s • {project.clips?.length || 1} segments
              </p>
              <div className="pt-2">
                <button
                  onClick={() => fileInputRef?.current?.click()}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition-all flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Replace or Add Clip</span>
                </button>
              </div>
            </div>

            {/* Smart Silence & Audio Prep */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-full border border-cyan-400/20">
                Smart Processing
              </span>
              <h3 className="text-base font-bold text-white">Acoustic Audio & Gaps</h3>
              <p className="text-xs text-zinc-400">
                Silence auto-cut removes awkward pauses while protecting speech and breath boundaries.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={onOpenSilenceModal}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-bold text-cyan-300 transition-all flex items-center gap-2"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Inspect Silence Gaps</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 1: COLOURS ── */}
      {currentStepIndex === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {COLOUR_PALETTES.map((palette, idx) => {
              const isSelected =
                project.brand?.accent?.toLowerCase() === palette.accent.toLowerCase() &&
                project.brand?.background?.toLowerCase() === palette.background.toLowerCase();

              return (
                <div
                  key={palette.id}
                  onClick={() => handleSelectPalette(palette)}
                  className={`group relative rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all border ${
                    isSelected
                      ? 'border-[#c8f135] bg-zinc-900 shadow-[0_0_20px_rgba(200,241,53,0.15)] ring-1 ring-[#c8f135]'
                      : 'border-white/10 bg-zinc-950/70 hover:border-white/30 hover:bg-zinc-900/40'
                  }`}
                  style={{ minHeight: '260px' }}
                >
                  {/* Top Badge: Number */}
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-black/60 border border-white/20 text-white font-mono text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-bold text-[#c8f135] bg-[#c8f135]/15 px-2 py-0.5 rounded-full border border-[#c8f135]/30 flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>

                  {/* Visual simulated palette mockup */}
                  <div
                    className="my-3 flex-1 rounded-xl p-3 flex flex-col justify-center items-center text-center shadow-inner relative overflow-hidden"
                    style={{ backgroundColor: palette.background }}
                  >
                    <div
                      className="px-3 py-1.5 rounded-lg border text-xs font-black tracking-tight mb-2"
                      style={{
                        backgroundColor: palette.surface,
                        borderColor: `${palette.accent}40`,
                        color: palette.text,
                      }}
                    >
                      Quit your job?
                    </div>
                    <div
                      className="text-[11px] font-semibold"
                      style={{ color: palette.accent }}
                    >
                      the part nobody says
                    </div>
                    <div
                      className="text-[10px] font-bold mt-1"
                      style={{ color: palette.secondary }}
                    >
                      this was the dream
                    </div>
                  </div>

                  {/* Footer Labels */}
                  <div className="pt-2 border-t border-white/5">
                    <h4 className="text-sm font-bold text-white group-hover:text-[#c8f135] transition-colors truncate">
                      {palette.name}
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{palette.vibe}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STEP 2: FONTS (Exact match to reference photo!) ── */}
      {currentStepIndex === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {FONT_PAIRINGS.map((fontPair, idx) => {
              const isSelected = project.brand?.font === fontPair.fontKey;

              return (
                <div
                  key={fontPair.id}
                  onClick={() => handleSelectFontPair(fontPair)}
                  className={`group relative rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all border ${
                    isSelected
                      ? 'border-[#c8f135] bg-zinc-900 shadow-[0_0_20px_rgba(200,241,53,0.15)] ring-1 ring-[#c8f135]'
                      : 'border-white/10 bg-zinc-950/70 hover:border-white/30 hover:bg-zinc-900/40'
                  }`}
                  style={{ minHeight: '300px' }}
                >
                  {/* Top Badge: 1, 2, 3, etc. */}
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-black/60 border border-white/20 text-white font-mono text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-bold text-[#c8f135] bg-[#c8f135]/15 px-2 py-0.5 rounded-full border border-[#c8f135]/30 flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>

                  {/* 9:16 Video preview container with stylized text exactly matching reference photo */}
                  <div className="my-3 flex-1 rounded-xl p-3 flex flex-col justify-center items-center text-center bg-black/70 border border-white/5 relative overflow-hidden group-hover:scale-[1.02] transition-transform">
                    {activeStreamUrl && (
                      <video
                        src={activeStreamUrl}
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
                      />
                    )}

                    {/* Styled Sample Text in Font Pairing */}
                    <div className="relative z-10 space-y-1">
                      <div
                        style={{ fontFamily: fontPair.titleFont }}
                        className="text-base md:text-lg font-black text-white leading-tight drop-shadow-md"
                      >
                        {fontPair.sampleTitle}
                      </div>
                      <div
                        style={{ fontFamily: fontPair.scriptFont }}
                        className="text-xs md:text-sm font-semibold text-amber-300 drop-shadow-sm"
                      >
                        {fontPair.sampleSubtitle}
                      </div>
                      <div
                        style={{ fontFamily: fontPair.scriptFont }}
                        className="text-xs md:text-sm font-bold text-white drop-shadow-sm italic"
                      >
                        {fontPair.sampleScript}
                      </div>
                    </div>
                  </div>

                  {/* Footer Label */}
                  <div className="pt-2 border-t border-white/5">
                    <h4 className="text-sm font-bold text-white group-hover:text-[#c8f135] transition-colors truncate">
                      {fontPair.name}
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{fontPair.vibe}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STEP 3: HOOK ── */}
      {currentStepIndex === 3 && (
        <div className="space-y-5">
          {/* Editable Hook Input Bar */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-2.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <span>Your Hook Copy</span>
              <span className="text-[11px] text-zinc-500 font-normal">(displayed in first 3 seconds)</span>
            </label>
            <input
              type="text"
              value={hookInputText}
              onChange={(e) => setHookInputText(e.target.value)}
              placeholder="e.g. Quit your job? The part nobody says..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 focus:border-[#c8f135] text-sm text-white outline-none font-medium transition-colors"
            />
            {/* Quick Inspiration Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mr-1">
                Try:
              </span>
              {[
                'Quit your job?',
                'Stop scrolling 🛑',
                'The 1 secret nobody told you',
                'Why everything you know is wrong',
                'How I got 100k views in 30 days',
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setHookInputText(chip)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] text-zinc-300 hover:text-white transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of 6 Hook Style Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {HOOK_STYLES.map((hook, idx) => (
              <div
                key={hook.id}
                onClick={() => handleSelectHookStyle(hook)}
                className="group relative rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all border border-white/10 bg-zinc-950/70 hover:border-white/30 hover:bg-zinc-900/40"
                style={{ minHeight: '260px' }}
              >
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-full bg-black/60 border border-white/20 text-white font-mono text-xs flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                </div>

                <div className="my-3 flex-1 rounded-xl p-3 flex flex-col justify-center items-center text-center bg-black/70 border border-white/5 relative overflow-hidden">
                  <p className="text-xs font-bold text-white whitespace-pre-line leading-snug">
                    {hookInputText || hook.defaultText}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/5">
                  <h4 className="text-sm font-bold text-white group-hover:text-[#c8f135] transition-colors truncate">
                    {hook.name}
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{hook.vibe}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 4: CAPTIONS ── */}
      {currentStepIndex === 4 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {CAPTION_STYLES.map((caption, idx) => (
              <div
                key={caption.id}
                onClick={() => handleSelectCaptionStyle(caption)}
                className="group relative rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all border border-white/10 bg-zinc-950/70 hover:border-white/30 hover:bg-zinc-900/40"
                style={{ minHeight: '260px' }}
              >
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-full bg-black/60 border border-white/20 text-white font-mono text-xs flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                </div>

                <div className="my-3 flex-1 rounded-xl p-3 flex flex-col justify-center items-center text-center bg-black/70 border border-white/5 relative overflow-hidden">
                  <div
                    className="px-2.5 py-1 rounded text-xs font-black uppercase tracking-tight text-center whitespace-pre-line"
                    style={{
                      backgroundColor: caption.boxColor,
                      color: caption.color,
                    }}
                  >
                    {caption.sampleText}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5">
                  <h4 className="text-sm font-bold text-white group-hover:text-[#c8f135] transition-colors truncate">
                    {caption.name}
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{caption.vibe}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 5: EXTRAS ── */}
      {currentStepIndex === 5 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXTRAS_PRESETS.map((extra) => {
              let isEnabled = false;
              if (extra.type === 'silence') {
                isEnabled = true; // silence gap removal active in timeline
              } else if (extra.type === 'audio') {
                isEnabled = Boolean(project.audio?.denoise?.enabled);
              } else if (extra.type === 'template') {
                isEnabled = project.overlays.some((o) => o.templateId === extra.templateId);
              }

              return (
                <div
                  key={extra.id}
                  onClick={() => handleToggleExtra(extra)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isEnabled
                      ? 'border-[#c8f135]/40 bg-zinc-900/90 shadow-md'
                      : 'border-white/10 bg-zinc-950/70 hover:border-white/20'
                  }`}
                  style={{ minHeight: '140px' }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{extra.name}</h4>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{extra.vibe}</p>
                    </div>
                    {/* Toggle Switch */}
                    <div
                      className={`w-11 h-6 rounded-full transition-colors flex items-center p-0.5 shrink-0 ml-3 ${
                        isEnabled ? 'bg-[#c8f135]' : 'bg-zinc-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-black transition-transform ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-[11px] font-mono">
                    <span className={isEnabled ? 'text-[#c8f135] font-bold' : 'text-zinc-500'}>
                      {isEnabled ? 'Enabled' : 'Click to add'}
                    </span>
                    {extra.type === 'silence' && (
                      <span className="text-cyan-400">Configure gaps →</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STEP 6: WATCH & EXPORT ── */}
      {currentStepIndex === 6 && (
        <div className="space-y-6 max-w-3xl">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Export Ready Reel</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  1080 × 1920 (9:16 Portrait) • 30 FPS • H.264 AAC
                </p>
              </div>
              <button
                onClick={onOpenExportModal}
                className="px-6 py-3 rounded-xl bg-[#c8f135] text-black font-black text-sm uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#c8f135]/25 flex items-center gap-2"
              >
                <Film className="w-4 h-4 fill-current" />
                <span>Export Reel MP4</span>
              </button>
            </div>
          </div>

          {/* AI Director Command Bar */}
          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Sparkles className="w-4 h-4 text-[#c8f135]" />
              <span>Ask Gemini 4 Argon for any custom edit</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunAiDirector()}
                placeholder="e.g. 'Make the hook text larger and change palette to sunset'..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-black border border-white/10 focus:border-[#c8f135] text-xs text-white outline-none"
              />
              <button
                onClick={handleToggleVoice}
                className={`p-2.5 rounded-xl border transition-colors ${
                  isListening
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border-white/10'
                }`}
                title="Voice Dictate Prompt"
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                onClick={handleRunAiDirector}
                disabled={isAiExecuting || !aiPrompt.trim()}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 border border-white/15 text-xs font-bold text-white transition-all flex items-center gap-1.5"
              >
                {isAiExecuting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
                <span>Apply</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
