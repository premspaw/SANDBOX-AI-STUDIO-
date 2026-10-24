import React, { useState } from 'react';
import {
  Check,
  Sparkles,
  Upload,
  Scissors,
  Wand2,
  Film,
  Loader2,
  Mic,
  Cpu,
  Palette,
  Type,
  HelpCircle,
  Volume2,
  FileText,
  Flame,
  Target,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
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
import { reelsApi } from '../services/reelsApi.js';

export function GuidedStepStage({
  currentStepIndex,
  project,
  editor,
  activeStreamUrl,
  onOpenSilenceModal,
  onOpenExportModal,
  fileInputRef,
  onUploadFile,
}) {
  const [selectedEngine, setSelectedEngine] = useState('gemini'); // Default: Gemini 4 Argon
  const [aiTopicPrompt, setAiTopicPrompt] = useState('');
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [aiEditSummary, setAiEditSummary] = useState(null);
  const [isListening, setIsListening] = useState(false);

  // Script & Hook analysis states
  const [scriptText, setScriptText] = useState('');
  const [isExtractingScript, setIsExtractingScript] = useState(false);
  const [isAnalyzingHooks, setIsAnalyzingHooks] = useState(false);
  const [suggestedHooks, setSuggestedHooks] = useState(null);
  const [appliedHookId, setAppliedHookId] = useState(null);

  const [hookInputText, setHookInputText] = useState(
    project.overlays.find((o) => o.templateId === 'viral-hook')?.text ||
      'Quit your job?\nthe part nobody says\nthis was the dream'
  );

  // Current brand colors
  const brandText = project.brand?.text || '#FFFFFF'; // Font Color
  const brandBg = project.brand?.background || '#0A0A0A'; // Background Color
  const brandAccent = project.brand?.accent || '#C8F135'; // Brand Accent Color
  const brandSurface = project.brand?.surface || '#18181B'; // Surface/Pill Color

  // Helper to update specific brand color
  const updateBrandColor = (key, hex) => {
    editor.mutate((p) =>
      applyBrand(p, {
        [key]: hex,
      })
    );
  };

  // Helper to apply full palette
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

  // Helper to apply font pairing
  const handleSelectFontPair = (fontPair) => {
    editor.mutate((p) => {
      const updatedBrand = { ...p.brand, font: fontPair.fontKey };
      const updatedOverlays = p.overlays.map((o) => ({
        ...o,
        style: { ...o.style, font: fontPair.fontKey },
      }));
      return { ...p, brand: updatedBrand, overlays: updatedOverlays };
    });
  };

  // Helper to apply hook style
  const handleSelectHookStyle = (hook) => {
    editor.mutate((p) => {
      const textToUse = hookInputText || hook.defaultText;
      const existingIdx = p.overlays.findIndex((o) => o.startFrame === 0);
      const newOverlay = {
        kind: 'text',
        text: textToUse,
        startFrame: 0,
        durationFrames: 90,
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

  // Helper to apply caption style
  const handleSelectCaptionStyle = (caption) => {
    editor.mutate((p) => {
      const existing = p.overlays.filter((o) => o.templateId !== 'viral-hook');
      if (existing.length === 0) {
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
        return {
          ...p,
          overlays: p.overlays.map((o) => {
            if (o.startFrame === 0) return o;
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
        editor.mutate((p) => ({
          ...p,
          overlays: p.overlays.filter((o) => o.templateId !== extra.templateId),
        }));
      } else {
        const t = getTemplateById(extra.templateId);
        if (t) {
          editor.applyTemplate(t, Math.round(project.canvas.fps * 3));
        }
      }
    }
  };

  // ── CORE: Execute AI Video Editor ──
  const handleRunAiDirector = async (customPrompt = null) => {
    const promptToUse = customPrompt || aiTopicPrompt;
    setIsAiEditing(true);
    setAiEditSummary(null);

    try {
      await editor.flushSave();
      const res = await reelsApi.applyAiEdit(project.id, {
        engine: selectedEngine,
        userPrompt: promptToUse,
        scriptText: scriptText,
        style: project.brand?.templateId || 'viral-hook',
        removeGaps: true,
      });

      if (res?.project) {
        editor.replaceProject(res.project);
        setAiEditSummary({
          engine: res.engineUsed || selectedEngine,
          summary: res.paperEditSummary || 'AI analyzed footage and created viral hook, captions, and brand styling.',
          overlaysCount: res.overlaysCount || res.project.overlays?.length || 0,
        });
        // Reset playhead and auto-play to show results live
        editor.setCurrentFrame(0);
        editor.setIsPlaying(true);
      }
    } catch (err) {
      alert(`AI Video Editor error: ${err.message || 'Failed to edit with AI'}`);
    } finally {
      setIsAiEditing(false);
    }
  };

  // ── Script Extraction & Hook Generation Handlers ──
  const handleExtractScript = async () => {
    if (!project.sources?.length) {
      alert('Please upload a video clip first in Step 1.');
      return;
    }
    setIsExtractingScript(true);
    try {
      const res = await reelsApi.extractScript(project.id, { engine: selectedEngine });
      if (res?.transcript) {
        setScriptText(res.transcript);
        // Automatically analyze hooks with the extracted script
        handleAnalyzeHooks(res.transcript);
      } else {
        alert('No clear speech was extracted from the audio. You can paste your script or talking points directly in the box below.');
      }
    } catch (err) {
      alert(`Script extraction error: ${err.message || 'Failed to transcribe'}`);
    } finally {
      setIsExtractingScript(false);
    }
  };

  const handleAnalyzeHooks = async (textOverride = null) => {
    const textToUse = textOverride !== null ? textOverride : scriptText;
    setIsAnalyzingHooks(true);
    try {
      const res = await reelsApi.analyzeHooks(project.id, {
        scriptText: textToUse,
        userPrompt: aiTopicPrompt,
        engine: selectedEngine,
      });
      if (res?.hooks?.length) {
        setSuggestedHooks(res.hooks);
        if (res.transcript && !scriptText) {
          setScriptText(res.transcript);
        }
      }
    } catch (err) {
      alert(`Hook generation error: ${err.message || 'Failed to generate hooks'}`);
    } finally {
      setIsAnalyzingHooks(false);
    }
  };

  const handleApplySuggestedHook = (hook) => {
    setHookInputText(hook.headline);
    setAppliedHookId(hook.id);
    editor.mutate((p) => {
      const existingIdx = p.overlays.findIndex((o) => o.startFrame === 0);
      const newOverlay = {
        kind: 'text',
        text: hook.headline,
        startFrame: 0,
        durationFrames: 90,
        anchorMode: 'output',
        anchor: null,
        needsReview: false,
        templateId: 'viral-hook',
        templateVersion: '1.0.0',
        style: {
          x: 0.5,
          y: hook.style?.y || 0.28,
          fontSize: hook.style?.fontSize || 84,
          color: p.brand?.text || '#FFFFFF',
          boxColor: p.brand?.surface || '#000000',
          boxOpacity: hook.style?.boxOpacity || 0.88,
          font: p.brand?.font || 'poppins',
        },
        animation: {
          in: hook.animation?.in || 'slide-up',
          durationFrames: hook.animation?.durationFrames || 10,
        },
      };

      let newOverlays = [...p.overlays];
      if (existingIdx >= 0) {
        newOverlays[existingIdx] = { ...newOverlays[existingIdx], ...newOverlay, id: newOverlays[existingIdx].id };
      } else {
        newOverlays.unshift({ ...newOverlay, id: `hook_${Date.now()}` });
      }
      return { ...p, overlays: newOverlays };
    });
    editor.setCurrentFrame(0);
    editor.setIsPlaying(true);
  };

  const handleAutoGenerateCaptions = () => {
    const text = (scriptText || hookInputText || '').trim();
    if (!text) {
      alert('Please paste or extract a script first to generate captions.');
      return;
    }
    const words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return;

    // Group into 3-word chunks
    const chunks = [];
    for (let i = 0; i < words.length; i += 3) {
      chunks.push(words.slice(i, i + 3).join(' ').toUpperCase());
    }

    const fps = project.canvas?.fps || 30;
    const totalFrames = project.timeline?.totalFrames || 300;
    const chunkDurFrames = Math.min(75, Math.max(30, Math.round(2.2 * fps)));

    editor.mutate((p) => {
      const otherOverlays = p.overlays.filter((o) => o.startFrame === 0);

      const generatedOverlays = chunks.slice(0, 8).map((chunk, idx) => {
        const startFrame = 90 + idx * chunkDurFrames;
        if (startFrame >= totalFrames - 15) return null;
        const dur = Math.min(chunkDurFrames, totalFrames - startFrame);

        return {
          id: `cap_${Date.now()}_${idx}`,
          kind: 'text',
          text: chunk,
          startFrame,
          durationFrames: dur,
          anchorMode: 'output',
          anchor: null,
          needsReview: false,
          templateId: 'hormozi-caption',
          templateVersion: '1.0.0',
          style: {
            x: 0.5,
            y: 0.68,
            fontSize: 78,
            color: p.brand?.accent || '#FFE600',
            boxColor: '#000000',
            boxOpacity: 0.95,
            font: p.brand?.font || 'poppins',
          },
          animation: { in: 'pop-in', durationFrames: 6 },
        };
      }).filter(Boolean);

      return {
        ...p,
        overlays: [...otherOverlays, ...generatedOverlays],
      };
    });

    editor.setCurrentFrame(90);
    editor.setIsPlaying(true);
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
        if (text) setAiTopicPrompt((prev) => (prev ? `${prev} ${text}` : text));
      };
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      {/* ── AI DIRECTOR TOP COMMAND STRIP (Always available & prominent) ── */}
      <div className="p-3 md:p-4 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md shrink-0 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* AI Model Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#c8f135]" />
              <span>AI Editor:</span>
            </span>

            {/* Model Pills */}
            <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setSelectedEngine('gemini')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedEngine === 'gemini'
                    ? 'bg-[#c8f135] text-black shadow-md shadow-[#c8f135]/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Google Gemini 4 Argon on Vertex AI (Default, Connected)"
              >
                <span>⚡ Gemini 4 Argon</span>
                <span className="text-[9px] bg-black/20 text-black px-1.5 py-0.2 rounded font-black">
                  CONNECTED
                </span>
              </button>

              <button
                onClick={() => setSelectedEngine('claude')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  selectedEngine === 'claude'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Claude 3.5 Sonnet / Opus Editor Skills"
              >
                <span>🧠 Claude 3.5 / Opus</span>
              </button>

              <button
                onClick={() => setSelectedEngine('openai')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  selectedEngine === 'openai'
                    ? 'bg-cyan-400 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="OpenAI GPT-4o / Astra 6"
              >
                <span>🌌 GPT-4o / Astra 6</span>
              </button>
            </div>
          </div>

          {/* Quick Skill Action Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: '⚡ Full Viral Edit', prompt: 'Turn this raw video into a viral reel with a killer hook headline, 3 kinetic subtitles and clean pauses' },
              { label: '✂️ Silence Cut & Pace', prompt: 'Cut acoustic silence gaps, speed up transitions, and add punchy captions' },
              { label: '📊 3-Point Value List', prompt: 'Extract 3 key takeaways from the video and display a 3-point animated list' },
              { label: '🔥 Contrarian Hook', prompt: 'Create a contrarian scroll-stopping hook: Why everything you know is wrong' },
            ].map((skill) => (
              <button
                key={skill.label}
                onClick={() => {
                  setAiTopicPrompt(skill.prompt);
                  handleRunAiDirector(skill.prompt);
                }}
                disabled={isAiEditing}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 border border-white/5 text-[11px] font-semibold text-zinc-300 hover:text-white transition-colors"
              >
                {skill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Input + Execute Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={aiTopicPrompt}
              onChange={(e) => setAiTopicPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRunAiDirector()}
              placeholder="Tell AI what to edit or enter a topic (e.g. 'Viral hook on quitting 9-5, kinetic subtitles, and 3 key takeaways')..."
              className="w-full pl-3.5 pr-10 py-2 rounded-xl bg-black border border-white/15 focus:border-[#c8f135] text-xs text-white outline-none font-medium placeholder:text-zinc-600 transition-colors"
            />
            <button
              onClick={handleToggleVoice}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                isListening
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                  : 'text-zinc-500 hover:text-white'
              }`}
              title="Voice Dictation"
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => handleRunAiDirector()}
            disabled={isAiEditing}
            className="px-4 py-2 rounded-xl bg-[#c8f135] text-black font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-[#c8f135]/20 flex items-center gap-1.5 shrink-0"
          >
            {isAiEditing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>AI Editing…</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5 fill-current" />
                <span>Auto-Edit with AI</span>
              </>
            )}
          </button>
        </div>

        {/* AI Director Result Summary Banner */}
        {aiEditSummary && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
            <Sparkles className="w-4 h-4 text-[#c8f135] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-white capitalize mr-1.5">
                {aiEditSummary.engine === 'gemini' ? 'Gemini 4 Argon' : aiEditSummary.engine} Edited Your Reel:
              </span>
              <span>{aiEditSummary.summary}</span>
              <span className="text-zinc-400 ml-2 font-mono text-[10px]">
                ({aiEditSummary.overlaysCount} layers placed)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── STEP CONTENT AREA ── */}
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
              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#c8f135] bg-[#c8f135]/10 px-2.5 py-1 rounded-full border border-[#c8f135]/20">
                  Active Source
                </span>
                <h3 className="text-base font-bold text-white truncate">
                  {project.sources?.[0]?.meta?.width
                    ? `${project.sources[0].meta.width} × ${project.sources[0].meta.height}`
                    : 'HD 1080 × 1920'}
                </h3>
                <p className="text-xs text-zinc-400">
                  Duration: {(project.timeline?.totalFrames / (project.canvas?.fps || 30)).toFixed(1)}s •{' '}
                  {project.clips?.length || 1} segments
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

        {/* ── STEP 1: COLOURS (Brand Studio: Font Color, Background Color, Brand Accent) ── */}
        {currentStepIndex === 1 && (
          <div className="space-y-6">
            {/* Direct Brand Color Controls (Font Color, Background Color, Brand Color) */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[#c8f135]" />
                    <span>Brand Colors (Font Color & Background Color)</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Configure your exact font color, video background, and brand accent.
                  </p>
                </div>

                {/* Live Swatch Pill */}
                <div
                  className="px-3.5 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold"
                  style={{ backgroundColor: brandBg, borderColor: brandAccent, color: brandText }}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: brandAccent }} />
                  <span>Preview Copy</span>
                </div>
              </div>

              {/* 4 Core Color Fields */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* 1. Font Color (Text Color) */}
                <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-2">
                  <label className="text-[11px] font-bold text-zinc-300 flex items-center justify-between">
                    <span>Font Color (Text)</span>
                    <span className="font-mono text-zinc-500">{brandText}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandText}
                      onChange={(e) => updateBrandColor('text', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <div className="flex gap-1">
                      {['#FFFFFF', '#FFE600', '#C8F135', '#F6F4EE', '#38BDF8'].map((c) => (
                        <button
                          key={c}
                          onClick={() => updateBrandColor('text', c)}
                          style={{ backgroundColor: c }}
                          className="w-5 h-5 rounded-md border border-white/20 hover:scale-110 transition-transform"
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Background Color */}
                <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-2">
                  <label className="text-[11px] font-bold text-zinc-300 flex items-center justify-between">
                    <span>Background Color</span>
                    <span className="font-mono text-zinc-500">{brandBg}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandBg}
                      onChange={(e) => updateBrandColor('background', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <div className="flex gap-1">
                      {['#000000', '#0A0A0A', '#18181B', '#0B132B', '#1C1917'].map((c) => (
                        <button
                          key={c}
                          onClick={() => updateBrandColor('background', c)}
                          style={{ backgroundColor: c }}
                          className="w-5 h-5 rounded-md border border-white/20 hover:scale-110 transition-transform"
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Brand Accent Color */}
                <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-2">
                  <label className="text-[11px] font-bold text-zinc-300 flex items-center justify-between">
                    <span>Brand Accent Color</span>
                    <span className="font-mono text-zinc-500">{brandAccent}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandAccent}
                      onChange={(e) => updateBrandColor('accent', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <div className="flex gap-1">
                      {['#C8F135', '#06B6D4', '#F97316', '#D4AF37', '#EC4899'].map((c) => (
                        <button
                          key={c}
                          onClick={() => updateBrandColor('accent', c)}
                          style={{ backgroundColor: c }}
                          className="w-5 h-5 rounded-md border border-white/20 hover:scale-110 transition-transform"
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Surface Color (Card / Pill) */}
                <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-2">
                  <label className="text-[11px] font-bold text-zinc-300 flex items-center justify-between">
                    <span>Surface Card / Pill</span>
                    <span className="font-mono text-zinc-500">{brandSurface}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandSurface}
                      onChange={(e) => updateBrandColor('surface', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <div className="flex gap-1">
                      {['#18181B', '#202B42', '#27272A', '#000000', '#1F2937'].map((c) => (
                        <button
                          key={c}
                          onClick={() => updateBrandColor('surface', c)}
                          style={{ backgroundColor: c }}
                          className="w-5 h-5 rounded-md border border-white/20 hover:scale-110 transition-transform"
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 6 Curated Brand Palette Presets */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Or Pick a Curated 1-Click Brand Palette
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {COLOUR_PALETTES.map((palette, idx) => {
                  const isSelected =
                    brandAccent.toLowerCase() === palette.accent.toLowerCase() &&
                    brandBg.toLowerCase() === palette.background.toLowerCase();

                  return (
                    <div
                      key={palette.id}
                      onClick={() => handleSelectPalette(palette)}
                      className={`group relative rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition-all border ${
                        isSelected
                          ? 'border-[#c8f135] bg-zinc-900 shadow-md ring-1 ring-[#c8f135]'
                          : 'border-white/10 bg-zinc-950/70 hover:border-white/30 hover:bg-zinc-900/40'
                      }`}
                      style={{ minHeight: '180px' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-5 h-5 rounded-full bg-black/60 border border-white/20 text-white font-mono text-[10px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#c8f135] stroke-[2.5]" />}
                      </div>

                      {/* Mockup Card */}
                      <div
                        className="my-2 rounded-xl p-2.5 flex flex-col justify-center items-center text-center shadow-inner"
                        style={{ backgroundColor: palette.background }}
                      >
                        <div
                          className="px-2 py-0.5 rounded text-[10px] font-black tracking-tight mb-1"
                          style={{ backgroundColor: palette.surface, color: palette.text }}
                        >
                          Quit job?
                        </div>
                        <div className="text-[9px] font-bold" style={{ color: palette.accent }}>
                          nobody says
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-[#c8f135] transition-colors truncate">
                          {palette.name}
                        </h4>
                        <p className="text-[10px] text-zinc-500 truncate">{palette.vibe}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: FONTS ── */}
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

                    <div className="my-3 flex-1 rounded-xl p-3 flex flex-col justify-center items-center text-center bg-black/70 border border-white/5 relative overflow-hidden group-hover:scale-[1.02] transition-transform">
                      {activeStreamUrl && (
                        <video
                          src={activeStreamUrl}
                          playsInline
                          muted
                          className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
                        />
                      )}
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
          <div className="space-y-6">
            {/* Explainer Banner */}
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  What is a Hook?
                </h4>
                <p className="text-xs text-purple-200 mt-0.5 leading-relaxed">
                  The Hook is the scroll-stopping title that appears in the first 3 seconds (0:00 - 0:03). It grabs viewers before they swipe away on Instagram Reels, TikTok, and YouTube Shorts.
                </p>
              </div>
            </div>

            {/* ── 1. SCRIPT & VIDEO ANALYSIS HUB ── */}
            <div className="p-4 md:p-5 rounded-2xl bg-zinc-900/70 border border-white/10 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#c8f135]" />
                    <span>1. Video Script & Speech Extraction</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Extract the exact words spoken in your video, or paste your script to generate tailored viral hooks.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExtractScript}
                    disabled={isExtractingScript || isAnalyzingHooks}
                    className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-xs font-bold text-purple-300 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    title="Transcribes audio from your video clip using AI"
                  >
                    {isExtractingScript ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Transcribing…</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                        <span>✨ Analyze Video</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleAnalyzeHooks()}
                    disabled={isExtractingScript || isAnalyzingHooks}
                    className="px-3.5 py-1.5 rounded-xl bg-[#c8f135] hover:bg-[#d4fa4b] text-black text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-[#c8f135]/20"
                  >
                    {isAnalyzingHooks ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                        <span>Analyzing…</span>
                      </>
                    ) : (
                      <>
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        <span>Generate 3 Hooks</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Script Textarea */}
              <div className="space-y-1.5">
                <textarea
                  rows={2}
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder="Paste your video script or talking points here (e.g. 'This is a hook. Here is the secret to getting 100k views...'), or click '✨ Analyze Video' above to extract it from the footage..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 focus:border-[#c8f135] text-xs text-white outline-none font-medium transition-colors resize-none placeholder:text-zinc-600"
                />
                {scriptText && (
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1">
                    <span>{scriptText.split(/\s+/).filter(Boolean).length} spoken words detected</span>
                    <button
                      onClick={() => handleAnalyzeHooks(scriptText)}
                      className="text-[#c8f135] font-bold hover:underline"
                    >
                      Regenerate Hooks from this Script →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── 2. TAILORED HOOK CHOICES (3 Options: Curiosity, Question, Contrarian) ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-amber-400" />
                    <span>2. Choose Your Best Hook (Tailored to Video)</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Select the hook formula that best fits your video topic. Click to apply directly to the reel frame.
                  </p>
                </div>

                {!suggestedHooks && (
                  <button
                    onClick={() => handleAnalyzeHooks()}
                    className="text-xs font-bold text-[#c8f135] hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Options</span>
                  </button>
                )}
              </div>

              {suggestedHooks?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {suggestedHooks.map((hook) => {
                    const isApplied = appliedHookId === hook.id || hookInputText === hook.headline;

                    return (
                      <div
                        key={hook.id}
                        className={`rounded-2xl p-4 flex flex-col justify-between transition-all border ${
                          isApplied
                            ? 'border-[#c8f135] bg-zinc-900 shadow-md ring-1 ring-[#c8f135]'
                            : 'border-white/10 bg-zinc-950/80 hover:border-white/25 hover:bg-zinc-900/50'
                        }`}
                        style={{ minHeight: '190px' }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white">
                            {hook.badge || hook.type}
                          </span>
                          {isApplied && (
                            <span className="text-[10px] font-bold text-[#c8f135] bg-[#c8f135]/15 px-2 py-0.5 rounded-full border border-[#c8f135]/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          )}
                        </div>

                        <div className="my-2.5 space-y-1.5">
                          <p className="text-sm font-black text-white whitespace-pre-line leading-tight">
                            {hook.headline}
                          </p>
                          {hook.whyItWorks && (
                            <p className="text-[10px] text-zinc-400 italic leading-snug">
                              💡 {hook.whyItWorks}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleApplySuggestedHook(hook)}
                          className={`w-full py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                            isApplied
                              ? 'bg-[#c8f135] text-black font-black'
                              : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                          }`}
                        >
                          {isApplied ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Applied to Frame 0</span>
                            </>
                          ) : (
                            <>
                              <span>Apply to Reel</span>
                              <ArrowRight className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Default 3 Quick Starter Hooks */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'curiosity',
                      badge: '🎯 Curiosity Gap',
                      headline: 'THIS IS A HOOK 🛑\nWatch How To Double Retention',
                      whyItWorks: 'Opens an immediate curiosity loop to keep viewers watching past 3s.',
                    },
                    {
                      id: 'question',
                      badge: '❓ Viral Question',
                      headline: 'CAN 1 HOOK DOUBLE\nYour Video Views?',
                      whyItWorks: 'Questions trigger an involuntary mental reflex to find the answer.',
                    },
                    {
                      id: 'contrarian',
                      badge: '🛑 Contrarian Truth',
                      headline: 'STOP MAKING HOOKS\nThat People Skip ⚡',
                      whyItWorks: 'Pattern interrupts break the mindless thumb scrolling habit.',
                    },
                  ].map((hook) => (
                    <div
                      key={hook.id}
                      onClick={() => handleApplySuggestedHook(hook)}
                      className="rounded-2xl p-4 border border-white/10 bg-zinc-950/70 hover:border-white/30 hover:bg-zinc-900/40 cursor-pointer transition-all flex flex-col justify-between"
                      style={{ minHeight: '170px' }}
                    >
                      <span className="text-[10px] font-bold text-zinc-300">{hook.badge}</span>
                      <p className="text-xs font-bold text-white whitespace-pre-line my-2">
                        {hook.headline}
                      </p>
                      <button className="text-[11px] font-bold text-[#c8f135] flex items-center gap-1">
                        <span>Click to Apply</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── 3. EDITABLE HEADLINE BAR & CHIPS ── */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-2.5">
              <label className="text-xs font-bold text-zinc-300">
                Fine-Tune Hook Headline Text
              </label>
              <input
                type="text"
                value={hookInputText}
                onChange={(e) => setHookInputText(e.target.value)}
                placeholder="e.g. Quit your job? The part nobody says this was the dream..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 focus:border-[#c8f135] text-sm text-white outline-none font-medium transition-colors"
              />
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mr-1">
                  Try:
                </span>
                {[
                  'This is a hook 🛑',
                  'Stop scrolling 🛑',
                  'The 1 secret nobody told you',
                  'Why everything you know is wrong',
                  'Watch till the end ⚡',
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => {
                      setHookInputText(chip);
                      handleSelectHookStyle({ style: { x: 0.5, y: 0.28, fontSize: 84, boxOpacity: 0.85 }, animation: { in: 'slide-up', durationFrames: 10 }, defaultText: chip });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] text-zinc-300 hover:text-white transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* ── 4. HOOK TYPOGRAPHY & ANIMATION PRESETS ── */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                3. Choose Hook Typography & Animation Preset
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {HOOK_STYLES.map((hook, idx) => (
                  <div
                    key={hook.id}
                    onClick={() => handleSelectHookStyle(hook)}
                    className="group relative rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition-all border border-white/10 bg-zinc-950/70 hover:border-white/30 hover:bg-zinc-900/40"
                    style={{ minHeight: '200px' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-5 h-5 rounded-full bg-black/60 border border-white/20 text-white font-mono text-[10px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                    </div>

                    <div className="my-2 flex-1 rounded-xl p-2.5 flex flex-col justify-center items-center text-center bg-black/70 border border-white/5 relative overflow-hidden">
                      <p className="text-[11px] font-bold text-white whitespace-pre-line leading-snug">
                        {hookInputText || hook.defaultText}
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-white/5">
                      <h4 className="text-xs font-bold text-white group-hover:text-[#c8f135] transition-colors truncate">
                        {hook.name}
                      </h4>
                      <p className="text-[10px] text-zinc-400 truncate">{hook.vibe}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: CAPTIONS ── */}
        {currentStepIndex === 4 && (
          <div className="space-y-5">
            {/* Auto-Generate Captions from Script Banner */}
            <div className="p-4 md:p-5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-400/10 px-2.5 py-0.5 rounded-full border border-cyan-400/20">
                  ⚡ 1-Click Speech Captions
                </span>
                <h4 className="text-sm font-bold text-white">
                  Auto-Generate Subtitles from Video Speech
                </h4>
                <p className="text-xs text-zinc-400">
                  {scriptText
                    ? `Create kinetic subtitle pills matching: "${scriptText.slice(0, 60)}..."`
                    : 'Transcribe your video or use your script to create kinetic subtitle pills across the timeline.'}
                </p>
              </div>

              <button
                onClick={handleAutoGenerateCaptions}
                className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 shadow-md shadow-cyan-400/20"
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>Generate Captions</span>
              </button>
            </div>

            {/* Explainer Banner */}
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  What are Kinetic Captions?
                </h4>
                <p className="text-xs text-cyan-200 mt-0.5 leading-relaxed">
                  Dynamic animated subtitles that highlight speech word-by-word. Over 80% of viewers watch Reels on mute, so kinetic captions are essential for retention.
                </p>
              </div>
            </div>

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
                  isEnabled = true;
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
                    1080 × 1920 (9:16 Portrait) • 30 FPS • H.264 AAC Audio
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

            {/* Overlays Summary */}
            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-3">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Layers in this Reel ({project.overlays?.length || 0})
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {project.overlays.map((o, i) => (
                  <div
                    key={o.id || i}
                    className="p-2.5 rounded-xl bg-black/60 border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-[#c8f135] bg-[#c8f135]/10 px-1.5 py-0.5 rounded">
                        {o.templateId || 'overlay'}
                      </span>
                      <span className="text-white font-medium truncate max-w-[280px]">
                        {o.text.replace(/\n/g, ' ')}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {(o.startFrame / (project.canvas?.fps || 30)).toFixed(1)}s
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
