import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, Film, Image as ImageIcon, Video, Layers, BookOpen, Clapperboard,
  Upload, Trash2, Check, Zap, Cpu, Code, HelpCircle, RefreshCw, Sliders, Play, Loader2, ChevronDown, Users, Tag, Aperture, FastForward
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getApiUrl } from '../../config/apiConfig';
import { useAppStore } from '../../store';

// Premium Glassmorphic Dropdown Component
const GlassSelect = React.memo(({ value, onChange, options, label, icon: Icon, accent = 'violet', align = 'up' }) => {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(o => String(o.value) === String(value)) || options[0];

  return (
    <div className="relative space-y-1.5 w-full">
      {label && (
        <label className="text-[11px] font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-violet-400" />}
          <span>{label}</span>
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between bg-[#0e0e18]/90 border border-white/15 hover:border-violet-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white backdrop-blur-2xl transition-all shadow-md active:scale-[0.99] cursor-pointer select-none",
          open && "border-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.35)]"
        )}
      >
        <span className="truncate font-semibold flex items-center gap-2">
          {selectedOption.icon && <span>{selectedOption.icon}</span>}
          <span>{selectedOption.label}</span>
        </span>
        <ChevronDown size={14} className={cn("text-gray-400 transition-transform duration-200 shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[140]" onClick={() => setOpen(false)} />
          <div className={cn(
            "absolute left-0 right-0 z-[150] bg-[#0a0a14]/98 border border-white/20 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] backdrop-blur-3xl py-1.5 overflow-hidden max-h-64 overflow-y-auto custom-scrollbar",
            align === 'down' ? "top-full mt-1.5" : "bottom-full mb-1.5"
          )}>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3.5 py-2.5 text-xs font-semibold flex items-center justify-between transition-all border-b border-white/5 last:border-0 cursor-pointer select-none",
                  String(opt.value) === String(value)
                    ? "bg-gradient-to-r from-violet-600/30 to-fuchsia-600/20 text-white font-bold"
                    : "text-gray-300 hover:bg-white/[0.08] hover:text-white"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {opt.icon && <span className="text-sm shrink-0">{opt.icon}</span>}
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{opt.label}</span>
                    {opt.desc && <span className="text-[10px] text-gray-400 font-normal truncate mt-0.5">{opt.desc}</span>}
                  </div>
                </div>
                {String(opt.value) === String(value) && (
                  <Check size={14} className="text-violet-400 shrink-0 ml-2" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
});

export const SidePanel = React.memo(({
  isOpen,
  onClose,
  inlineMode = false,
  activeEngine,
  setActiveEngine,
  activeTab,
  setActiveTab,
  panelTab,
  setPanelTab,
  firstFrameImage,
  firstFramePreview,
  lastFrameImage,
  lastFramePreview,
  setFirstFrameImage,
  setFirstFramePreview,
  setLastFrameImage,
  setLastFramePreview,
  omniFirstFrameImage,
  omniFirstFramePreview,
  omniLastFrameImage,
  omniLastFramePreview,
  omniRefImages = ['', '', '', '', ''],
  omniRefPreviews = ['', '', '', '', ''],
  setOmniRefImages,
  setOmniRefPreviews,
  setOmniFirstFrameImage,
  setOmniFirstFramePreview,
  setOmniLastFrameImage,
  setOmniLastFramePreview,
  omniRefVideoPreview: propOmniRefVideoPreview,
  setOmniRefVideoPreview: propSetOmniRefVideoPreview,
  omniRefVideoDuration = 0,
  setOmniRefVideoDuration,
  handleFileUpload,
  setUploadTarget,
  handleClearRef,
  fileInputRef,
  duration,
  setDuration,
  aspectRatio,
  setAspectRatio,
  resolution,
  setResolution,
  generateAudio,
  setGenerateAudio,
  omniTask,
  setOmniTask,
  showRefBoard,
  setShowRefBoard,
  promptText,
  setPromptText,
  omniPromptText,
  setOmniPromptText,
  handleGenerate,
  isBusy,
  userCredits,
  requiredCredits,
  canGenerate,
  allRefItems = []
}) => {
  const [docsSection, setDocsSection] = useState('omni_flash'); // 'omni_flash' | 'veo_cookbook'

  // Dedicated Video File Input Ref & State for Omni Flash Reference Video
  const videoInputRef = useRef(null);
  const [localVideoPreview, setLocalVideoPreview] = useState(null);
  const [isVideoUploading, setIsVideoUploading] = useState(false);

  const videoPreview = propOmniRefVideoPreview !== undefined ? propOmniRefVideoPreview : localVideoPreview;
  const setVideoPreview = (val) => {
    setLocalVideoPreview(val);
    if (propSetOmniRefVideoPreview) propSetOmniRefVideoPreview(val);
  };

  // Textarea Ref & Local Prompt State for zero input latency
  const textareaRef = useRef(null);
  const [mentionSearch, setMentionSearch] = useState(null);
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const [localPrompt, setLocalPrompt] = useState(promptText || '');

  // Debounce ref to prevent parent re-renders on every keystroke
  const debounceTimerRef = useRef(null);

  // Keep localPrompt synchronized when parent promptText changes externally
  useEffect(() => {
    setLocalPrompt(promptText || '');
  }, [promptText]);

  const isVeoEngine = activeEngine.startsWith('veo-3.1') || activeEngine === 'veo3';
  const isOmniEngine = activeEngine === 'omni' || activeEngine === 'omni-flash' || activeEngine === 'omni-flash-1.1' || activeEngine === 'gemini-omni-1.1-flash-preview';

  const triggerGenerateVeo = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    // Flush local prompt to parent first, then schedule generate on next tick
    // to avoid React state-batching races where handleGenerate reads stale promptText.
    const engineToUse = isVeoEngine ? activeEngine : 'veo-3.1-generate-preview';
    setPromptText(localPrompt);
    setActiveTab('video');
    if (!isVeoEngine) {
      setActiveEngine(engineToUse);
    }
    // Use queueMicrotask so React can commit state before we call handleGenerate.
    queueMicrotask(() => handleGenerate(localPrompt, engineToUse));
  };

  const triggerGenerateOmni = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const engineToUse = isOmniEngine ? activeEngine : 'omni-flash-1.1';
    setPromptText(localPrompt);
    setActiveTab('video');
    if (!isOmniEngine) {
      setActiveEngine(engineToUse);
    }
    queueMicrotask(() => handleGenerate(localPrompt, engineToUse));
  };

  const triggerGenerateMotion = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const engineToUse = activeEngine.includes('motion') ? activeEngine : 'kling-motion';
    setPromptText(localPrompt);
    setActiveTab('video');
    setActiveEngine(engineToUse);
    queueMicrotask(() => handleGenerate(localPrompt, engineToUse));
  };

  const handleVideoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsVideoUploading(true);
    const blobUrl = URL.createObjectURL(file);

    // Validate reference video duration (strict 10s max limit)
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = blobUrl;

    tempVideo.onloadedmetadata = async () => {
      const dur = tempVideo.duration || 0;
      if (dur > 10) {
        setIsVideoUploading(false);
        setVideoPreview(null);
        if (setOmniRefVideoDuration) setOmniRefVideoDuration(0);
        if (videoInputRef.current) videoInputRef.current.value = '';
        URL.revokeObjectURL(blobUrl);

        const showToast = useAppStore.getState().showToast;
        if (showToast) {
          showToast(`Reference video rejected (${Math.round(dur * 10) / 10}s). Video duration must be 10 seconds or shorter.`, "error");
        }
        return;
      }

      if (setOmniRefVideoDuration) setOmniRefVideoDuration(dur);
      setVideoPreview(blobUrl);

      try {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const base64Url = ev.target.result;
          try {
            const resp = await fetch(getApiUrl('/api/save-asset'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageData: base64Url,
                type: 'video',
                fileName: `ref_video_${Date.now()}.mp4`,
                folder: 'reference'
              })
            });
            if (resp.ok) {
              const data = await resp.json();
              const publicUrl = data.url || data.path || base64Url;
              setVideoPreview(publicUrl);
            }
          } catch (_) { /* fallback to blobUrl */ }
          setIsVideoUploading(false);
        };
        reader.onerror = () => setIsVideoUploading(false);
        reader.readAsDataURL(file);
      } catch (err) {
        setIsVideoUploading(false);
      }
    };
  };

  // Build combined list of all available mention items using useMemo
  const availableMentionItems = useMemo(() => {
    const firstPreview = panelTab === 'omni' ? omniFirstFramePreview : firstFramePreview;
    const lastPreview = panelTab === 'omni' ? omniLastFramePreview : lastFramePreview;

    const omniSlots = [
      { name: '<FIRST_FRAME>', category: 'Keyframe 1', imageUrl: firstPreview, isKeyframe: true },
      { name: '<IMAGE_REF_0>', category: 'Reference 1 (Image Ref 1)', imageUrl: omniRefPreviews[0] || omniFirstFramePreview },
      { name: '<IMAGE_REF_1>', category: 'Reference 2 (Image Ref 2)', imageUrl: omniRefPreviews[1] || omniLastFramePreview },
      { name: '<IMAGE_REF_2>', category: 'Reference 3 (Image Ref 3)', imageUrl: omniRefPreviews[2] },
      { name: '<IMAGE_REF_3>', category: 'Reference 4 (Image Ref 4)', imageUrl: omniRefPreviews[3] },
      { name: '<IMAGE_REF_4>', category: 'Reference 5 (Image Ref 5)', imageUrl: omniRefPreviews[4] }
    ];

    return [
      ...(panelTab === 'omni' ? omniSlots : [
        ...(firstPreview ? [{ name: 'FIRST_FRAME', category: 'Keyframe 1', imageUrl: firstPreview, isKeyframe: true }] : []),
        ...(lastPreview ? [{ name: 'LAST_FRAME', category: 'Keyframe 2', imageUrl: lastPreview, isKeyframe: true }] : [])
      ]),
      ...(videoPreview ? [{ name: '<REF_VIDEO>', category: 'Reference Video', isVideo: true, imageUrl: videoPreview, url: videoPreview }] : []),
      ...(allRefItems || [])
    ];
  }, [panelTab, firstFramePreview, lastFramePreview, omniFirstFramePreview, omniLastFramePreview, omniRefPreviews, videoPreview, allRefItems]);

  const handlePromptChange = useCallback((e) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setLocalPrompt(val);

    // Debounced parent update — wrapped in startTransition so it's low priority
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      React.startTransition(() => setPromptText(val));
    }, 300);

    const textBeforeCursor = val.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@([\w_]*)$/);

    if (match) {
      setMentionSearch(match[1]);
      setMentionCursorPos(cursorPos);
    } else {
      setMentionSearch(null);
    }
  }, [setPromptText]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectMention = (item) => {
    const text = localPrompt || '';
    const before = text.slice(0, mentionCursorPos).replace(/@[\w_]*$/, '');
    const after = text.slice(mentionCursorPos);
    const tag = item.name.replace(/\s+/g, '');
    const newText = `${before}@${tag} ${after}`;
    setLocalPrompt(newText);
    setPromptText(newText);
    setMentionSearch(null);
    if (textareaRef.current) textareaRef.current.focus();
  };

  // Extract detected @mentions in prompt text with useMemo
  const detectedMentions = useMemo(() => {
    return (localPrompt || '').match(/@[\w_]+/g) || [];
  }, [localPrompt]);

  // Inline Full-Page Mode rendering
  if (inlineMode) {
    return (
      <div className="w-full h-full flex flex-col bg-[#0a0a12] border-r border-white/15 overflow-hidden text-white relative z-10 font-sans">
        {/* Hidden Dedicated Video File Input */}
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleVideoSelect}
        />

        {/* Solid Header with ZeroLens Branding */}
        <div className="px-5 py-3 border-b border-white/15 bg-[#12121e] flex items-center justify-between relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-xl bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-cyan-400 shadow-md shadow-fuchsia-500/20">
              <div className="w-7 h-7 rounded-[10px] bg-[#0d0d15] flex items-center justify-center">
                <Clapperboard className="w-4 h-4 text-fuchsia-400" />
              </div>
            </div>
            <div>
              <h2 className="text-xs font-black tracking-[0.2em] uppercase bg-gradient-to-r from-white via-violet-200 to-fuchsia-200 bg-clip-text text-transparent leading-none">
                ZeroLens Studio
              </h2>
              <p className="text-[8px] font-bold uppercase tracking-widest text-fuchsia-400/70 leading-none mt-1">
                Engine & Parameter Controls
              </p>
            </div>
          </div>
          <span className="text-[9px] font-mono bg-fuchsia-500/20 text-fuchsia-300 px-2.5 py-1 rounded-lg border border-fuchsia-500/30 font-bold uppercase tracking-widest">
            Studio Page
          </span>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="px-5 pt-3.5 pb-2.5 bg-[#0c0c16] border-b border-white/15 flex items-center gap-2 relative z-10 shrink-0">
          <button
            onClick={() => {
              setPanelTab('veo');
              setActiveTab('video');
              if (!isVeoEngine) setActiveEngine('veo-3.1-generate-preview');
            }}
            className={cn(
              "flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border shadow-lg backdrop-blur-xl cursor-pointer select-none",
              panelTab === 'veo'
                ? "bg-gradient-to-r from-violet-600/30 via-violet-500/20 to-fuchsia-500/20 text-white border-violet-400/50 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                : "bg-white/[0.03] text-gray-400 border-white/10 hover:bg-white/[0.08] hover:text-white"
            )}
          >
            <Film className="w-3.5 h-3.5 text-violet-400" />
            <span>Veo 3.1 Workspace</span>
          </button>

          <button
            onClick={() => {
              setPanelTab('omni');
              setActiveTab('video');
              if (!isOmniEngine) setActiveEngine('omni-flash-1.1');
            }}
            className={cn(
              "flex-1 py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border shadow-lg backdrop-blur-xl cursor-pointer select-none",
              panelTab === 'omni'
                ? "bg-gradient-to-r from-fuchsia-600/30 via-pink-500/20 to-violet-500/20 text-white border-fuchsia-400/50 shadow-[0_0_20px_rgba(217,70,239,0.3)]"
                : "bg-white/[0.03] text-gray-400 border-white/10 hover:bg-white/[0.08] hover:text-white"
            )}
          >
            <Zap className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Omni Flash 1.1</span>
          </button>

          <button
            onClick={() => {
              setPanelTab('motion');
              setActiveTab('video');
              setActiveEngine('kling-motion');
            }}
            className={cn(
              "flex-1 py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border shadow-lg backdrop-blur-xl cursor-pointer select-none",
              panelTab === 'motion'
                ? "bg-gradient-to-r from-orange-600/30 via-amber-500/20 to-yellow-500/20 text-white border-orange-400/50 shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                : "bg-white/[0.03] text-gray-400 border-white/10 hover:bg-white/[0.08] hover:text-white"
            )}
          >
            <Aperture className="w-3.5 h-3.5 text-orange-400" />
            <span>Motion Control</span>
          </button>
        </div>

        {/* Panel Content Scroll Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-6 pb-28 relative z-10 bg-[#0a0a12]">
          {/* TAB 1: VEO 3.1 & OMNI FLASH WORKSPACE */}
          {panelTab === 'veo' && (
            <div className="space-y-6">
              {/* Model Variant Chips */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-300">Model Engine</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'veo-3.1', label: 'Veo 3.1 🎬', desc: 'Google Standard' },
                    { id: 'veo-fast', label: 'Veo Fast ⚡', desc: 'Fast Generation' },
                    { id: 'gemini-omni-1.1-flash-preview', label: 'Omni 1.1 Flash ⚡', desc: '1.1 Multi-Ref & Keyframes' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { setActiveTab('video'); setActiveEngine(m.id); }}
                      className={cn(
                        "py-2 px-1.5 rounded-xl border text-left transition-all cursor-pointer select-none",
                        activeEngine === m.id
                          ? "bg-violet-600/30 border-violet-400 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                          : "bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/[0.06] hover:text-white"
                      )}
                    >
                      <div className="text-[11px] font-bold truncate">{m.label}</div>
                      <div className="text-[8.5px] text-gray-400 mt-0.5 truncate">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Keyframe Conditioning */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-violet-400" />
                    <span>Keyframe Conditioning</span>
                  </h3>
                  <span className="text-[10px] text-violet-400 font-mono font-semibold">First & Last Frame</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-gray-400 block">First Frame</span>
                    {firstFramePreview ? (
                      <div className="relative group rounded-2xl overflow-hidden border border-white/20 aspect-video bg-black/50">
                        <img src={firstFramePreview} className="w-full h-full object-cover" alt="First Frame" />
                        <button onClick={() => { setFirstFrameImage(''); setFirstFramePreview(''); }} className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/70 text-white/80 hover:text-white hover:bg-red-500/80 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setUploadTarget('first'); fileInputRef?.current?.click(); }} className="w-full aspect-video rounded-2xl border border-dashed border-white/20 hover:border-violet-400/60 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-white cursor-pointer"><Upload size={18} /><span className="text-[10px] font-bold uppercase">Upload 1st Frame</span></button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-gray-400 block">Last Frame</span>
                    {lastFramePreview ? (
                      <div className="relative group rounded-2xl overflow-hidden border border-white/20 aspect-video bg-black/50">
                        <img src={lastFramePreview} className="w-full h-full object-cover" alt="Last Frame" />
                        <button onClick={() => { setLastFrameImage(''); setLastFramePreview(''); }} className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/70 text-white/80 hover:text-white hover:bg-red-500/80 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setUploadTarget('last'); fileInputRef?.current?.click(); }} className="w-full aspect-video rounded-2xl border border-dashed border-white/20 hover:border-violet-400/60 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-white cursor-pointer"><Upload size={18} /><span className="text-[10px] font-bold uppercase">Upload Last Frame</span></button>
                    )}
                  </div>
                </div>
              </div>

              {/* Text Prompt */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  <span>Scene Prompt</span>
                </label>
                <textarea
                  value={localPrompt}
                  onChange={(e) => { setLocalPrompt(e.target.value); setPromptText(e.target.value); }}
                  placeholder="Describe your cinematic video scene, camera movements, lighting, and action..."
                  className="w-full h-28 bg-[#0e0e18]/90 border border-white/15 rounded-2xl p-3.5 text-xs text-white placeholder-white/20 outline-none focus:border-violet-400 transition-all resize-none shadow-inner custom-scrollbar font-sans"
                />
              </div>

              {/* Video Specs Grid */}
              <div className="grid grid-cols-2 gap-3">
                <GlassSelect label="Duration" value={duration} onChange={(val) => setDuration(Number(val))} options={[{ value: 4, label: '4 Seconds' }, { value: 6, label: '6 Seconds' }, { value: 8, label: '8 Seconds' }, { value: 10, label: '10 Seconds' }]} />
                <GlassSelect label="Aspect Ratio" value={aspectRatio} onChange={setAspectRatio} options={[{ value: '16:9', label: '16:9 Widescreen' }, { value: '9:16', label: '9:16 Vertical' }, { value: '1:1', label: '1:1 Square' }]} />
                {activeEngine?.includes('omni') || activeEngine?.includes('flash') ? (
                  <>
                    <GlassSelect label="Resolution" value={resolution} onChange={setResolution} options={[{ value: '360p', label: '360p SD' }, { value: '720p', label: '720p HD' }, { value: '1080p', label: '1080p FHD' }, { value: '4k', label: '4K UHD' }]} />
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-300">Audio</label>
                      <button
                        type="button"
                        onClick={() => setGenerateAudio(!generateAudio)}
                        className={cn(
                          "w-full h-[42px] rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                          generateAudio ? "bg-violet-600/25 border-violet-400 text-violet-200" : "bg-white/[0.02] border-white/15 text-gray-400"
                        )}
                      >
                        {generateAudio ? '🔊 Audio On' : '🔇 Audio Off'}
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}

          {/* TAB 2: OMNI FLASH 1.1 WORKSPACE */}
          {panelTab === 'omni' && (
            <div className="space-y-6">
              {/* Model Variant Chips */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-300">Model Engine</label>
                <div className="flex gap-2">
                  {[
                    { id: 'gemini-omni-1.1-flash-preview', label: 'Omni 1.1 Flash ⚡', desc: 'Latest Preview' },
                    { id: 'gemini-omni-flash-preview', label: 'Omni 1.0 Flash', desc: 'Standard Preview' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { setActiveTab('video'); setActiveEngine(m.id); }}
                      className={cn(
                        "flex-1 py-2.5 px-3 rounded-xl border text-left transition-all cursor-pointer select-none",
                        activeEngine === m.id
                          ? "bg-fuchsia-600/30 border-fuchsia-400 text-white shadow-[0_0_15px_rgba(217,70,239,0.3)]"
                          : "bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/[0.06] hover:text-white"
                      )}
                    >
                      <div className="text-xs font-bold">{m.label}</div>
                      <div className="text-[9px] text-gray-400 mt-0.5">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Task Mode Dropdown */}
              <GlassSelect
                label="Omni Flash Task Mode"
                icon={Zap}
                value={omniTask}
                onChange={(val) => { setOmniTask(val); localStorage.setItem('cs_omniTask', val); }}
                align="down"
                options={[
                  { value: 'auto', label: 'Auto Infer', desc: 'Auto-detects task from uploaded inputs', icon: <Sparkles className="w-3.5 h-3.5 text-[#c8f135]" /> },
                  { value: 'text_to_video', label: 'Text-to-Video', desc: 'Generate video directly from text prompt', icon: <Film className="w-3.5 h-3.5 text-violet-400" /> },
                  { value: 'image_to_video', label: 'Image-to-Video', desc: 'Transform static images into videos', icon: <ImageIcon className="w-3.5 h-3.5 text-fuchsia-400" /> },
                  { value: 'reference_to_video', label: 'Reference-to-Video', desc: 'Generate videos from various input media', icon: <Layers className="w-3.5 h-3.5 text-cyan-400" /> },
                  { value: 'edit', label: 'Video Editing', desc: 'Modify an original or previously generated video', icon: <Video className="w-3.5 h-3.5 text-rose-400" /> },
                  { value: 'extension', label: 'Video Extension', desc: 'Extend an original or previously generated video', icon: <FastForward className="w-3.5 h-3.5 text-amber-400" /> }
                ]}
              />

              {/* Media & Reference Inputs Section */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-fuchsia-400" />
                    <span>Media & Reference Inputs</span>
                  </h3>
                  <span className="text-[10px] text-fuchsia-400 font-mono font-semibold">Images & Video Clips</span>
                </div>

                <div className="space-y-3">
                  {/* Progressive Image Reference Slots */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-fuchsia-300 flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-fuchsia-400" /> Reference Images
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-fuchsia-400/80 font-mono">Tag @IMAGE_REF_0..9 (Up to 10)</span>
                        {Math.max(3, Math.min(10, omniRefPreviews.filter(Boolean).length + 1)) < 10 && (
                          <button
                            type="button"
                            onClick={() => {
                              const currentFilled = omniRefPreviews.filter(Boolean).length;
                              const nextSlot = Math.min(9, Math.max(3, currentFilled));
                              setUploadTarget(`omni_ref_${nextSlot}`);
                              fileInputRef?.current?.click();
                            }}
                            className="flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider text-fuchsia-300 hover:text-white bg-fuchsia-500/20 hover:bg-fuchsia-500/30 px-1.5 py-0.5 rounded border border-fuchsia-500/30 transition-all cursor-pointer"
                          >
                            + Add Ref
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      {Array.from({ length: Math.min(10, Math.max(3, omniRefPreviews.filter(Boolean).length + 1)) }).map((_, idx) => {
                        const slotPreview = omniRefPreviews[idx] || (idx === 0 ? omniFirstFramePreview : idx === 1 ? omniLastFramePreview : '');
                        return (
                          <div key={idx} className="p-2 rounded-xl bg-white/[0.02] backdrop-blur-md border border-white/10 hover:border-fuchsia-500/40 transition-all flex flex-col gap-1.5 relative shadow-md">
                            <div className="flex items-center justify-between px-0.5">
                              <span className="text-[9px] font-mono font-bold text-fuchsia-300 flex items-center gap-1">
                                Ref {idx + 1}
                              </span>
                              {slotPreview && (
                                <button
                                  type="button"
                                  onClick={() => handleClearRef(idx)}
                                  className="p-0.5 text-red-400 hover:bg-red-500/20 rounded transition-colors cursor-pointer"
                                  title={`Remove Image Ref ${idx + 1}`}
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </div>

                            {slotPreview ? (
                              <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/60 border border-white/15 relative group">
                                <img src={slotPreview} alt={`Ref ${idx + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUploadTarget(idx === 0 ? 'first' : idx === 1 ? 'last' : `omni_ref_${idx}`);
                                      fileInputRef?.current?.click();
                                    }}
                                    className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-[8px] font-bold uppercase tracking-wider cursor-pointer"
                                  >
                                    Replace
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadTarget(idx === 0 ? 'first' : idx === 1 ? 'last' : `omni_ref_${idx}`);
                                  fileInputRef?.current?.click();
                                }}
                                className="aspect-video w-full rounded-lg border border-dashed border-white/20 bg-white/[0.02] hover:bg-fuchsia-500/10 hover:border-fuchsia-400/50 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-fuchsia-300 transition-all cursor-pointer"
                                title={`Upload Image Ref ${idx + 1}`}
                              >
                                <Upload size={14} className="text-fuchsia-400/70" />
                                <span className="text-[8px] font-bold uppercase tracking-wider">Upload Ref {idx + 1}</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Direct Reference Video Upload Slot */}
                  <div className="p-2 rounded-xl bg-white/[0.02] backdrop-blur-md border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col gap-1.5 relative shadow-md">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[9px] font-mono font-bold text-cyan-300 flex items-center gap-1">
                        <Video className="w-3.5 h-3.5 text-cyan-400" /> Reference Driving Video (10s Max)
                      </span>
                      {videoPreview && (
                        <button type="button" onClick={() => { setVideoPreview(null); if (setOmniRefVideoDuration) setOmniRefVideoDuration(0); }} className="p-0.5 text-red-400 hover:bg-red-500/20 rounded transition-colors cursor-pointer" title="Remove Reference Video">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    {isVideoUploading ? (
                      <div className="aspect-video w-full rounded-lg border border-cyan-400/50 bg-cyan-950/40 backdrop-blur-md flex flex-col items-center justify-center gap-1 text-cyan-300 animate-pulse">
                        <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                        <span className="text-[8px] font-bold uppercase tracking-wider">Uploading Video</span>
                      </div>
                    ) : videoPreview ? (
                      <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/60 border border-white/15 relative group">
                        <video src={videoPreview} controls muted playsInline preload="metadata" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                          <button type="button" onClick={() => videoInputRef.current?.click()} className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-[8px] font-bold uppercase tracking-wider cursor-pointer">Replace Video</button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => videoInputRef.current?.click()} className="aspect-video w-full rounded-lg border border-dashed border-white/20 bg-white/[0.02] hover:bg-cyan-500/10 hover:border-cyan-400/50 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-cyan-300 transition-all cursor-pointer" title="Upload Reference Video (10s max)">
                        <Video size={16} className="text-cyan-400/70" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Upload Driving Reference Video</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Text Prompt */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-fuchsia-300">
                    <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" /> Omni Flash Prompt
                  </span>
                  <span className="text-[9px] text-fuchsia-400/80 font-mono">Use @ to tag references</span>
                </label>
                <textarea
                  value={localPrompt}
                  onChange={(e) => { setLocalPrompt(e.target.value); setOmniPromptText(e.target.value); setPromptText(e.target.value); }}
                  placeholder="Describe scene action, camera movements, style, or tag @IMAGE_REF_0..9 or @video..."
                  className="w-full h-28 bg-[#0e0e18]/90 border border-white/15 rounded-2xl p-3.5 text-xs text-white placeholder-white/20 outline-none focus:border-fuchsia-400 transition-all resize-none shadow-inner custom-scrollbar font-sans"
                />
              </div>

              {/* Video Specs Grid */}
              <div className="grid grid-cols-2 gap-3">
                <GlassSelect label="Duration" value={duration} onChange={(val) => setDuration(Number(val))} options={[{ value: 4, label: '4 Seconds' }, { value: 6, label: '6 Seconds' }, { value: 8, label: '8 Seconds' }, { value: 10, label: '10 Seconds' }]} />
                <GlassSelect label="Aspect Ratio" value={aspectRatio} onChange={setAspectRatio} options={[{ value: '16:9', label: '16:9 Widescreen' }, { value: '9:16', label: '9:16 Vertical' }, { value: '1:1', label: '1:1 Square' }]} />
                <GlassSelect label="Resolution" value={resolution} onChange={setResolution} options={[{ value: '360p', label: '360p SD' }, { value: '720p', label: '720p HD' }, { value: '1080p', label: '1080p FHD' }, { value: '4k', label: '4K UHD' }]} />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-300">Audio</label>
                  <button
                    type="button"
                    onClick={() => setGenerateAudio(!generateAudio)}
                    className={cn(
                      "w-full h-[42px] rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      generateAudio ? "bg-fuchsia-600/25 border-fuchsia-400 text-fuchsia-200" : "bg-white/[0.02] border-white/15 text-gray-400"
                    )}
                  >
                    {generateAudio ? '🔊 Audio On' : '🔇 Audio Off'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MOTION CONTROL WORKSPACE */}
          {panelTab === 'motion' && (
            <div className="space-y-6">
              {/* Motion Engine Selector */}
              <GlassSelect
                label="Motion Transfer Engine"
                icon={Aperture}
                value={activeEngine}
                onChange={(val) => setActiveEngine(val)}
                align="down"
                options={[
                  { value: 'kling-motion', label: 'Kling V3 Motion Transfer', desc: '14⚡/s High Fidelity Video Motion Transfer', icon: <Aperture className="w-3.5 h-3.5 text-orange-400" /> },
                  { value: 'seedance-motion', label: 'Seedance 2.0 Motion Transfer', desc: '12⚡/s Character & Pose Motion Capture', icon: <Zap className="w-3.5 h-3.5 text-yellow-400" /> }
                ]}
              />

              {/* Driving Motion Video & Character Image Upload Slots */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-orange-400" />
                    <span>Motion Conditioning</span>
                  </h3>
                  <span className="text-[10px] text-orange-400 font-mono font-semibold">Video & Subject</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-gray-400 block">Driving Video</span>
                    {videoPreview ? (
                      <div className="relative group rounded-2xl overflow-hidden border border-white/20 aspect-video bg-black/50">
                        <video src={videoPreview} className="w-full h-full object-cover" />
                        <button onClick={() => setVideoPreview(null)} className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/70 text-white/80 hover:text-white hover:bg-red-500/80 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => videoInputRef?.current?.click()} className="w-full aspect-video rounded-2xl border border-dashed border-white/20 hover:border-orange-400/60 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-white cursor-pointer"><Upload size={18} /><span className="text-[10px] font-bold uppercase">Upload Driving Video</span></button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-gray-400 block">Target Character</span>
                    {firstFramePreview ? (
                      <div className="relative group rounded-2xl overflow-hidden border border-white/20 aspect-video bg-black/50">
                        <img src={firstFramePreview} className="w-full h-full object-cover" alt="Character" />
                        <button onClick={() => { setFirstFrameImage(''); setFirstFramePreview(''); }} className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/70 text-white/80 hover:text-white hover:bg-red-500/80 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setUploadTarget('first'); fileInputRef?.current?.click(); }} className="w-full aspect-video rounded-2xl border border-dashed border-white/20 hover:border-orange-400/60 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-white cursor-pointer"><Upload size={18} /><span className="text-[10px] font-bold uppercase">Upload Character</span></button>
                    )}
                  </div>
                </div>
              </div>

              {/* Text Prompt */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                  <span>Motion Scene Prompt</span>
                </label>
                <textarea
                  value={localPrompt}
                  onChange={(e) => { setLocalPrompt(e.target.value); setPromptText(e.target.value); }}
                  placeholder="Describe character motion, camera tracking, and aesthetic style..."
                  className="w-full h-24 bg-[#0e0e18]/90 border border-white/15 rounded-2xl p-3.5 text-xs text-white placeholder-white/20 outline-none focus:border-orange-400 transition-all resize-none shadow-inner custom-scrollbar font-sans"
                />
              </div>

              {/* Video Specs Grid */}
              <div className="grid grid-cols-2 gap-3">
                <GlassSelect label="Duration" value={duration} onChange={(val) => setDuration(Number(val))} options={[{ value: 3, label: '3 Seconds' }, { value: 5, label: '5 Seconds' }, { value: 8, label: '8 Seconds' }, { value: 10, label: '10 Seconds' }]} />
                <GlassSelect label="Aspect Ratio" value={aspectRatio} onChange={setAspectRatio} options={[{ value: '16:9', label: '16:9 Widescreen' }, { value: '9:16', label: '9:16 Vertical' }, { value: '1:1', label: '1:1 Square' }]} />
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Generate Bar */}
        <div className="p-4 bg-[#080810] border-t border-white/20 flex items-center justify-between gap-4 z-20 shrink-0">
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Required</span>
            <span className="text-sm font-black text-[#c8f135]">{requiredCredits} Shorts</span>
          </div>
          <button
            type="button"
            onClick={panelTab === 'motion' ? triggerGenerateMotion : (panelTab === 'omni' ? triggerGenerateOmni : triggerGenerateVeo)}
            disabled={isBusy || !canGenerate}
            className={cn(
              "h-12 py-3 px-6 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_rgba(200,241,53,0.3)] border border-[#d4ff00]/40 shrink-0 active:scale-95 cursor-pointer",
              canGenerate ? "bg-[#c8f135] text-black hover:bg-[#bce628]" : "bg-white/5 text-gray-500 border-white/5 cursor-not-allowed"
            )}
          >
            {isBusy ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>Generating...</span></>) : (<><Sparkles className="w-4 h-4 fill-current" /><span>Generate Video</span></>)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-stretch sm:justify-end">
          {/* Hidden Dedicated Video File Input */}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoSelect}
          />

          {/* Backdrop — full on mobile, transparent on desktop */}
          <div
            className="absolute inset-0 bg-black/60 sm:bg-transparent"
            onClick={onClose}
          />

          {/* Panel — bottom-sheet on mobile, slide-from-right on desktop */}
          <motion.div
            initial={{ y: '100%', x: 0 }}
            animate={{ y: 0, x: 0 }}
            exit={{ y: '100%', x: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="relative w-full sm:hidden bg-[#0a0a12] border-t border-white/20 shadow-[0_-20px_80px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden text-white z-10"
            style={{ height: '88dvh', borderRadius: '24px 24px 0 0' }}
          >
            {/* Mobile Drag Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Mobile Header */}
            <div className="px-4 py-2.5 border-b border-white/15 bg-[#12121e] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Zap size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">Studio Panel</h3>
                  <p className="text-[10px] text-cyan-400 font-mono">Gemini Omni Flash 1.1 Engine</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Mobile Tabs */}
            <div className="px-3 pt-2.5 pb-2 border-b border-white/15 bg-[#0c0c16] flex items-center gap-2 shrink-0">
              {[
                ['veo','veo-3.1-generate-preview','video',<Film key="f" className="w-3.5 h-3.5" />,'Veo 3.1'],
                ['omni','omni-flash-1.1','video',<Zap key="z" className="w-3.5 h-3.5" />,'Omni Flash 1.1']
              ].map(([tab, engine, aTab, icon, label]) => (
                <button
                  key={tab}
                  onClick={() => {
                    setPanelTab(tab);
                    if (aTab) setActiveTab(aTab);
                    if (engine) {
                      if (tab === 'veo' && !isVeoEngine) setActiveEngine(engine);
                      if (tab === 'omni' && !isOmniEngine) setActiveEngine(engine);
                    }
                  }}
                  className={cn(
                    "flex-1 py-2 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all border",
                    panelTab === tab
                      ? tab === 'omni'
                        ? "bg-fuchsia-600/25 text-white border-fuchsia-400/50"
                        : "bg-violet-600/25 text-white border-violet-400/50"
                      : "bg-white/[0.03] text-gray-400 border-white/10"
                  )}
                >
                  {icon}{label}
                </button>
              ))}
            </div>

            {/* Mobile Scroll Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-5 pb-36 bg-[#0a0a12]">
              {/* ── VEO TAB (mobile) ── */}
              {panelTab === 'veo' && (
                <div className="space-y-5">
                  {/* Keyframe Slots — stacked on mobile */}
                  <div className="space-y-2.5">
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-violet-400" /> Keyframe Conditioning
                    </h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* First Frame */}
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-violet-300">First Frame</span>
                          {firstFramePreview && (
                            <button onClick={() => handleClearRef('first')} className="p-0.5 text-red-400"><Trash2 size={10} /></button>
                          )}
                        </div>
                        {firstFramePreview ? (
                          <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/60 border border-white/10">
                            <img src={firstFramePreview} alt="First Frame" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <button
                            onClick={() => { setUploadTarget('first'); fileInputRef?.current?.click(); }}
                            className="aspect-video w-full rounded-lg border border-dashed border-white/20 bg-white/[0.02] flex flex-col items-center justify-center gap-1 text-gray-500"
                          >
                            <Upload size={14} className="text-violet-400/70" />
                            <span className="text-[9px] uppercase tracking-wider">Upload</span>
                          </button>
                        )}
                      </div>
                      {/* Last Frame */}
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-cyan-300">Last Frame</span>
                          {lastFramePreview && (
                            <button onClick={() => handleClearRef('last')} className="p-0.5 text-red-400"><Trash2 size={10} /></button>
                          )}
                        </div>
                        {lastFramePreview ? (
                          <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/60 border border-white/10">
                            <img src={lastFramePreview} alt="Last Frame" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <button
                            onClick={() => { setUploadTarget('last'); fileInputRef?.current?.click(); }}
                            className="aspect-video w-full rounded-lg border border-dashed border-white/20 bg-white/[0.02] flex flex-col items-center justify-center gap-1 text-gray-500"
                          >
                            <Upload size={14} className="text-cyan-400/70" />
                            <span className="text-[9px] uppercase tracking-wider">Upload</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Prompt Textarea */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-violet-300">Veo 3.1 Prompt</label>
                    <textarea
                      value={localPrompt}
                      onChange={handlePromptChange}
                      placeholder="Describe your cinematic scene..."
                      rows={3}
                      className="w-full bg-black/50 border border-white/15 focus:border-violet-400/70 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none resize-none leading-relaxed"
                    />
                  </div>

                  {/* Model Variant — horizontal chips on mobile */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-300">Model Variant</label>
                    <div className="flex gap-2">
                      {[{id:'veo-3.1-lite-generate-preview',label:'Lite'},{id:'veo-3.1-fast-generate-preview',label:'Fast'},{id:'veo-3.1-generate-preview',label:'High'}].map(m => (
                        <button
                          key={m.id}
                          onClick={() => { setActiveTab('video'); setActiveEngine(m.id); }}
                          className={cn(
                            "flex-1 py-2.5 rounded-xl border text-[10px] font-bold transition-all",
                            activeEngine === m.id
                              ? "bg-violet-600/30 border-violet-400 text-white"
                              : "bg-white/[0.02] border-white/10 text-gray-400"
                          )}
                        >{m.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Params — 2-col grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <GlassSelect label="Resolution" value={resolution} onChange={setResolution} options={[
                      {value:'720p',label:'720p HD'},{value:'1080p',label:'1080p FHD'},{value:'4k',label:'4K UHD'}
                    ]} />
                    <GlassSelect label="Duration" value={duration} onChange={v => setDuration(Number(v))} options={[
                      {value:4,label:'4s'},{value:6,label:'6s'},{value:8,label:'8s'},{value:10,label:'10s'}
                    ]} />
                    <GlassSelect label="Aspect" value={aspectRatio} onChange={setAspectRatio} options={[
                      {value:'16:9',label:'16:9'},{value:'9:16',label:'9:16'},{value:'1:1',label:'1:1'}
                    ]} />
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-300">Audio</label>
                      <button
                        onClick={() => setGenerateAudio(!generateAudio)}
                        className={cn(
                          "w-full h-[42px] rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all",
                          generateAudio ? "bg-violet-600/25 border-violet-400 text-violet-200" : "bg-white/[0.02] border-white/15 text-gray-400"
                        )}
                      >{generateAudio ? '🔊 On' : '🔇 Off'}</button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── OMNI TAB (mobile) ── */}
              {panelTab === 'omni' && (
                <div className="space-y-5">
                  <GlassSelect label="Omni Task Mode" icon={Zap} value={omniTask} onChange={v => { setOmniTask(v); localStorage.setItem('cs_omniTask', v); }} align="down" options={[
                    {value:'auto',label:'Auto Infer',desc:'Auto-detects from inputs'},
                    {value:'text_to_video',label:'Text → Video',desc:'Generate dynamic sequences from text'},
                    {value:'image_to_video',label:'Image → Video',desc:'Transform static images into video'},
                    {value:'reference_to_video',label:'Reference → Video',desc:'Multi-asset reference guidance'},
                    {value:'edit',label:'Video Editing',desc:'Modify original or generated clip'},
                    {value:'extension',label:'Video Extension',desc:'Extend original or generated video'}
                  ]} />

                  {/* Reference inputs compact */}
                  <div className="space-y-2.5">
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-gray-300">Media Inputs</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {[{img: omniFirstFramePreview, label: '1st Frame', target: 'first', clearFn: () => { setOmniFirstFrameImage(''); setOmniFirstFramePreview(''); }},
                        {img: omniLastFramePreview,  label: 'Last Frame', target: 'last',  clearFn: () => { setOmniLastFrameImage(''); setOmniLastFramePreview(''); }},
                        {img: videoPreview,          label: 'Ref Video',  target: 'video', clearFn: () => setVideoPreview(null)}
                      ].map(({img, label, target, clearFn}) => (
                        <div key={label} className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
                          {img ? (
                            <div className="aspect-square relative rounded-lg overflow-hidden border border-white/15">
                              {target === 'video'
                                ? <video src={img} className="w-full h-full object-cover" muted playsInline />
                                : <img src={img} className="w-full h-full object-cover" alt={label} />}
                              <button onClick={clearFn} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500/90 flex items-center justify-center">
                                <X size={8} className="text-white" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                if (target === 'video') { videoInputRef.current?.click(); }
                                else { setUploadTarget(target); fileInputRef?.current?.click(); }
                              }}
                              className="aspect-square w-full rounded-lg border border-dashed border-white/20 bg-white/[0.02] flex items-center justify-center text-gray-500"
                            >
                              <Upload size={14} className="text-fuchsia-400/70" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-fuchsia-300">Omni Prompt</label>
                    <textarea
                      value={localPrompt}
                      onChange={handlePromptChange}
                      placeholder="Describe your video..."
                      rows={3}
                      className="w-full bg-black/50 border border-white/15 focus:border-fuchsia-400/70 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none resize-none leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <GlassSelect label="Resolution" value={resolution} onChange={setResolution} options={[
                      {value:'720p',label:'720p'},{value:'1080p',label:'1080p'}
                    ]} />
                    <GlassSelect label="Duration" value={duration} onChange={v => setDuration(Number(v))} options={[
                      {value:4,label:'4s'},{value:6,label:'6s'},{value:8,label:'8s'},{value:10,label:'10s'}
                    ]} />
                    <GlassSelect label="Aspect" value={aspectRatio} onChange={setAspectRatio} options={[
                      {value:'16:9',label:'16:9'},{value:'9:16',label:'9:16'},{value:'1:1',label:'1:1'}
                    ]} />
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-300">Audio</label>
                      <button
                        onClick={() => setGenerateAudio(!generateAudio)}
                        className={cn(
                          "w-full h-[42px] rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all",
                          generateAudio ? "bg-fuchsia-600/25 border-fuchsia-400 text-fuchsia-200" : "bg-white/[0.02] border-white/15 text-gray-400"
                        )}
                      >{generateAudio ? '🔊 On' : '🔇 Off'}</button>
                    </div>
                  </div>
                </div>
              )}


            </div>

            {/* Mobile Footer Generate Button */}
            <div className="shrink-0 px-4 py-3 bg-[#080810] border-t border-white/15 flex flex-col gap-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-400">{panelTab === 'veo' ? 'Veo 3.1' : 'Omni Flash'}</span>
                <span className="text-[#c8f135] font-black">{requiredCredits}⚡ <span className="text-gray-500 font-normal">/ {userCredits}⚡ left</span></span>
              </div>
              <button
                onClick={panelTab === 'omni' ? triggerGenerateOmni : triggerGenerateVeo}
                disabled={isBusy || !canGenerate}
                className={cn(
                  "w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                  canGenerate
                    ? "bg-[#c8f135] text-black"
                    : "bg-white/5 text-gray-500 border border-white/5"
                )}
              >
                {isBusy ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>Generating...</span></>) : (<><Sparkles className="w-4 h-4 fill-current" /><span>Generate Video</span></>)}
              </button>
            </div>
          </motion.div>

          {/* Desktop slide-from-right panel (sm and above) */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="hidden sm:flex relative w-full sm:max-w-xl bg-[#0a0a12] border-l border-white/20 shadow-[-20px_0_60px_rgba(0,0,0,0.95)] flex-col h-full overflow-hidden text-white z-10"
          >

            {/* Solid Header with ZeroLens Branding */}
            <div className="px-5 py-3 border-b border-white/15 bg-[#12121e] flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-1 rounded-xl bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-cyan-400 shadow-md shadow-fuchsia-500/20">
                  <div className="w-7 h-7 rounded-[10px] bg-[#0d0d15] flex items-center justify-center">
                    <Clapperboard className="w-4 h-4 text-fuchsia-400" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xs font-black tracking-[0.2em] uppercase bg-gradient-to-r from-white via-violet-200 to-fuchsia-200 bg-clip-text text-transparent leading-none">
                    ZeroLens
                  </h2>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-fuchsia-400/70 leading-none mt-1">
                    Cinematic Studio
                  </p>
                </div>
              </div>

              {/* Prominent Enlarged Close Button */}
              <button
                onClick={onClose}
                className="w-11 h-11 rounded-2xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 text-gray-300 hover:text-white transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0 shadow-lg group"
                title="Close Studio Panel"
              >
                <X size={24} className="stroke-[2.5] transition-transform group-hover:scale-110" />
              </button>
            </div>

          {/* Navigation Tabs Bar */}
          <div className="px-5 pt-3.5 pb-2.5 bg-[#0c0c16] border-b border-white/15 flex items-center gap-2 relative z-10">
            <button
              onClick={() => {
                setPanelTab('veo');
                setActiveTab('video');
                if (!isVeoEngine) setActiveEngine('veo-3.1-generate-preview');
              }}
              className={cn(
                "flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border shadow-lg backdrop-blur-xl cursor-pointer select-none",
                panelTab === 'veo'
                  ? "bg-gradient-to-r from-violet-600/30 via-violet-500/20 to-fuchsia-500/20 text-white border-violet-400/50 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                  : "bg-white/[0.03] text-gray-400 border-white/10 hover:bg-white/[0.08] hover:text-white"
              )}
            >
              <Film className="w-3.5 h-3.5 text-violet-400" />
              <span>Veo 3.1 Workspace</span>
            </button>

            <button
              onClick={() => {
                setPanelTab('omni');
                setActiveTab('video');
                if (!isOmniEngine) setActiveEngine('omni-flash-1.1');
              }}
              className={cn(
                "flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border shadow-lg backdrop-blur-xl cursor-pointer select-none",
                panelTab === 'omni'
                  ? "bg-gradient-to-r from-fuchsia-600/30 via-pink-500/20 to-violet-500/20 text-white border-fuchsia-400/50 shadow-[0_0_20px_rgba(217,70,239,0.3)]"
                  : "bg-white/[0.03] text-gray-400 border-white/10 hover:bg-white/[0.08] hover:text-white"
              )}
            >
              <Zap className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Omni Flash 1.1</span>
            </button>
          </div>

          {/* Panel Content Scroll Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6 pb-28 relative z-10 bg-[#0a0a12]">
            {/* ────────────────────────────────────────────────────────── */}
            {/* TAB 1: VEO 3.1 VERTEX AI WORKSPACE */}
            {/* ────────────────────────────────────────────────────────── */}
            {panelTab === 'veo' && (
              <div className="space-y-6">
                {/* 1. TOP SECTION: Keyframe Conditioning Upload Slots */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-violet-400" />
                      <span>Keyframe Conditioning</span>
                    </h3>
                    <span className="text-[10px] text-violet-400 font-mono font-semibold">First & Last Frame</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    {/* First Frame Slot */}
                    <div className="p-3.5 rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-violet-500/40 transition-all flex flex-col gap-2.5 relative shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-violet-300 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" /> First Frame
                        </span>
                        {firstFramePreview && (
                          <button
                            onClick={() => handleClearRef('first')}
                            className="p-1 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/30 cursor-pointer"
                            title="Remove First Frame"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>

                      {firstFramePreview ? (
                        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black/60 border border-white/15 relative group shadow-inner">
                          <img src={firstFramePreview} alt="First Frame" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-xs gap-2">
                            <button
                              onClick={() => {
                                setUploadTarget('first');
                                fileInputRef?.current?.click();
                              }}
                              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider border border-white/20 shadow-md backdrop-blur-md cursor-pointer"
                            >
                              Replace
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setUploadTarget('first');
                            fileInputRef?.current?.click();
                          }}
                          className="aspect-video w-full rounded-xl border border-dashed border-white/20 bg-white/[0.02] hover:bg-violet-500/10 hover:border-violet-400/50 flex flex-col items-center justify-center transition-all gap-1.5 text-gray-400 hover:text-violet-300 backdrop-blur-md cursor-pointer"
                        >
                          <Upload size={18} className="text-violet-400/70" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Upload Keyframe 1</span>
                        </button>
                      )}
                    </div>

                    {/* Last Frame Slot */}
                    <div className="p-3.5 rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col gap-2.5 relative shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" /> Last Frame
                        </span>
                        {lastFramePreview && (
                          <button
                            onClick={() => handleClearRef('last')}
                            className="p-1 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/30 cursor-pointer"
                            title="Remove Last Frame"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>

                      {lastFramePreview ? (
                        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black/60 border border-white/15 relative group shadow-inner">
                          <img src={lastFramePreview} alt="Last Frame" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-xs gap-2">
                            <button
                              onClick={() => {
                                setUploadTarget('last');
                                fileInputRef?.current?.click();
                              }}
                              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider border border-white/20 shadow-md backdrop-blur-md cursor-pointer"
                            >
                              Replace
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setUploadTarget('last');
                            fileInputRef?.current?.click();
                          }}
                          className="aspect-video w-full rounded-xl border border-dashed border-white/20 bg-white/[0.02] hover:bg-cyan-500/10 hover:border-cyan-400/50 flex flex-col items-center justify-center transition-all gap-1.5 text-gray-400 hover:text-cyan-300 backdrop-blur-md cursor-pointer"
                        >
                          <Upload size={18} className="text-cyan-400/70" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Upload Keyframe 2</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. SECOND SECTION: Glass Prompt Textarea for Veo 3.1 with @Mention Autocomplete */}
                <div className="space-y-2 relative">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-violet-300">
                      <Film className="w-3.5 h-3.5" /> Veo 3.1 Motion Prompt
                    </span>
                    <span className="text-[10px] text-violet-400/80 font-mono">Type @ to tag references</span>
                  </label>

                  {/* Glass Autocomplete Mention Popover */}
                  {mentionSearch !== null && (
                    <div className="absolute bottom-full mb-2 left-0 right-0 z-[200] bg-[#0a0a14]/98 border border-violet-500/40 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.9)] backdrop-blur-3xl overflow-hidden flex flex-col max-h-56">
                      <div className="px-3 py-2 border-b border-white/10 bg-violet-950/40 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Tag className="w-3 h-3" /> Tag Uploaded Media or Asset
                        </span>
                        <button onClick={() => setMentionSearch(null)} className="text-gray-400 hover:text-white p-1">
                          <X size={12} />
                        </button>
                      </div>
                      <div className="overflow-y-auto custom-scrollbar p-1 divide-y divide-white/5">
                        {availableMentionItems.filter(i => i.name.toLowerCase().includes((mentionSearch || '').toLowerCase())).length > 0 ? (
                          availableMentionItems
                            .filter(i => i.name.toLowerCase().includes((mentionSearch || '').toLowerCase()))
                            .map((item, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => selectMention(item)}
                                className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-violet-600/20 transition-all rounded-xl text-left cursor-pointer"
                              >
                                <div className="w-7 h-7 rounded-lg bg-black/50 border border-white/15 overflow-hidden shrink-0 flex items-center justify-center">
                                  {item.isVideo ? (
                                    <Video className="w-3.5 h-3.5 text-cyan-400" />
                                  ) : item.imageUrl ? (
                                    <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                                  ) : (
                                    <ImageIcon className="w-3.5 h-3.5 text-fuchsia-400" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-white truncate">@{item.name}</p>
                                  <p className="text-[9px] text-gray-400 truncate">{item.category}</p>
                                </div>
                              </button>
                            ))
                        ) : (
                          <div className="p-4 text-center text-xs text-gray-400">No matching references found.</div>
                        )}
                      </div>
                    </div>
                  )}

                  <textarea
                    ref={textareaRef}
                    value={localPrompt}
                    onChange={handlePromptChange}
                    placeholder="Describe your cinematic Veo 3.1 scenario... Type @ to tag uploaded keyframes or references."
                    rows={4}
                    className="w-full bg-black/50 border border-white/15 focus:border-violet-400/70 rounded-2xl p-4 text-xs text-white placeholder-gray-500 outline-none resize-none custom-scrollbar leading-relaxed font-medium backdrop-blur-2xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] transition-all"
                  />

                  {/* Detected Tagged Reference Pills */}
                  {detectedMentions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payload Tags:</span>
                      {detectedMentions.map((tag, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-violet-500/20 text-violet-200 border border-violet-400/40 flex items-center gap-1 backdrop-blur-md">
                          <Tag size={10} className="text-violet-400" /> {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. THIRD SECTION: Veo 3.1 Model Variant Grid */}
                <div className="space-y-2.5">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-300">Veo Model Variant</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'veo-3.1-lite-generate-preview', label: 'Veo 3.1 Lite', desc: 'Fastest draft previews' },
                      { id: 'veo-3.1-fast-generate-preview', label: 'Veo 3.1 Fast', desc: 'Balanced speed & fidelity' },
                      { id: 'veo-3.1-generate-preview', label: 'Veo 3.1 High', desc: 'Highest photorealism & dynamics' }
                    ].map(m => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setActiveTab('video');
                          setActiveEngine(m.id);
                        }}
                        className={cn(
                          "p-3 rounded-2xl border text-left flex flex-col justify-between transition-all backdrop-blur-xl shadow-md cursor-pointer select-none",
                          activeEngine === m.id
                            ? "bg-gradient-to-b from-violet-600/30 to-violet-950/40 border-violet-400 text-white shadow-[0_0_20px_rgba(139,92,246,0.25)]"
                            : "bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/[0.06] hover:text-white"
                        )}
                      >
                        <div className="text-xs font-bold flex items-center justify-between">
                          <span>{m.label}</span>
                          {activeEngine === m.id && <Check className="w-3.5 h-3.5 text-violet-400" />}
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1.5 leading-snug">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. FOURTH SECTION: Video Generation Parameters with Custom Glass Dropdowns */}
                <div className="grid grid-cols-2 gap-3.5">
                  <GlassSelect
                    label="Resolution"
                    value={resolution}
                    onChange={setResolution}
                    options={[
                      { value: '720p', label: '720p HD', desc: 'Standard High Definition' },
                      { value: '1080p', label: '1080p Full HD', desc: 'Full HD Quality' },
                      { value: '4k', label: '4K Ultra HD', desc: 'Maximum Resolution' }
                    ]}
                  />

                  <GlassSelect
                    label="Duration"
                    value={duration}
                    onChange={(val) => setDuration(Number(val))}
                    options={[
                      { value: 4, label: '4 Seconds', desc: 'Short dynamic clip' },
                      { value: 6, label: '6 Seconds', desc: 'Standard video clip' },
                      { value: 8, label: '8 Seconds', desc: 'Extended camera shot' },
                      { value: 10, label: '10 Seconds', desc: 'Maximum video clip' }
                    ]}
                  />

                  <GlassSelect
                    label="Aspect Ratio"
                    value={aspectRatio}
                    onChange={setAspectRatio}
                    options={[
                      { value: '16:9', label: '16:9 Landscape', desc: 'Widescreen cinematic' },
                      { value: '9:16', label: '9:16 Portrait', desc: 'Mobile vertical reel' },
                      { value: '1:1', label: '1:1 Square', desc: 'Social feed post' }
                    ]}
                  />

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-300">Audio Track</label>
                    <button
                      type="button"
                      onClick={() => setGenerateAudio(!generateAudio)}
                      className={cn(
                        "w-full py-2.5 px-3.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all backdrop-blur-xl shadow-md cursor-pointer select-none",
                        generateAudio
                          ? "bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 border-violet-400 text-violet-200"
                          : "bg-[#0e0e18]/90 border-white/15 text-gray-400 hover:text-white"
                      )}
                    >
                      <span>{generateAudio ? 'Audio Enabled' : 'Muted'}</span>
                      {generateAudio && <Check className="w-3.5 h-3.5 text-violet-400" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ────────────────────────────────────────────────────────── */}
            {/* TAB 2: GEMINI OMNI FLASH WORKSPACE */}
            {/* ────────────────────────────────────────────────────────── */}
            {panelTab === 'omni' && (
              <div className="space-y-6">
                {/* 0. OMNI MODEL VARIANT SELECTOR */}
                <div className="space-y-2.5">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-300">Omni Model Variant</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'omni-flash-1.1', label: 'Omni Flash 1.1', desc: '⚡ Latest 1.1 Fast Engine (Vertex AI Global)' },
                      { id: 'omni-flash', label: 'Omni Flash 1.0', desc: '✨ Fast 1.0 Multimodal Engine' },
                      { id: 'omni', label: 'Gemini Omni 1.0', desc: '🎬 Standard Omni Multimodal Engine' }
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setActiveTab('video');
                          setActiveEngine(m.id);
                        }}
                        className={cn(
                          "p-3 rounded-2xl border text-left flex flex-col justify-between transition-all backdrop-blur-xl shadow-md cursor-pointer select-none",
                          activeEngine === m.id || (activeEngine === 'gemini-omni-1.1-flash-preview' && m.id === 'omni-flash-1.1')
                            ? "bg-gradient-to-b from-fuchsia-600/30 to-pink-950/40 border-fuchsia-400 text-white shadow-[0_0_20px_rgba(217,70,239,0.25)]"
                            : "bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/[0.06] hover:text-white"
                        )}
                      >
                        <div className="text-xs font-bold flex items-center justify-between">
                          <span>{m.label}</span>
                          {(activeEngine === m.id || (activeEngine === 'gemini-omni-1.1-flash-preview' && m.id === 'omni-flash-1.1')) && <Check className="w-3.5 h-3.5 text-fuchsia-400" />}
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1.5 leading-snug">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 1. TOP SECTION: Omni Flash Task Selection Custom Glass Dropdown */}
                <GlassSelect
                  label="Omni Flash Task Mode"
                  icon={Zap}
                  value={omniTask}
                  onChange={(val) => {
                    setOmniTask(val);
                    localStorage.setItem('cs_omniTask', val);
                  }}
                  align="down"
                  options={[
                    { value: 'auto', label: 'Auto Infer', desc: 'Auto-detects task from uploaded inputs', icon: <Sparkles className="w-3.5 h-3.5 text-[#c8f135]" /> },
                    { value: 'text_to_video', label: 'Text-to-Video', desc: 'Generate dynamic video sequences directly from text prompts', icon: <Film className="w-3.5 h-3.5 text-violet-400" /> },
                    { value: 'image_to_video', label: 'Image-to-Video', desc: 'Transform static images into videos', icon: <ImageIcon className="w-3.5 h-3.5 text-fuchsia-400" /> },
                    { value: 'reference_to_video', label: 'Reference-to-Video', desc: 'Generate videos from various input media', icon: <Layers className="w-3.5 h-3.5 text-cyan-400" /> },
                    { value: 'edit', label: 'Video Editing', desc: 'Modify an original or previously generated video', icon: <Video className="w-3.5 h-3.5 text-rose-400" /> },
                    { value: 'extension', label: 'Video Extension', desc: 'Extend an original or previously generated video', icon: <FastForward className="w-3.5 h-3.5 text-amber-400" /> }
                  ]}
                />

                {/* 2. SECOND SECTION: Direct Input Upload Placeholders for Images & Videos */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-fuchsia-400" />
                      <span>Media & Reference Inputs</span>
                    </h3>
                    <span className="text-[10px] text-fuchsia-400 font-mono font-semibold">Images & Video Clips</span>
                  </div>

                  <div className="space-y-3">
                    {/* Progressive Image Reference Slots (Default 3 in grid-cols-3, auto-unlocks 4 & 5 progressively) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-fuchsia-300 flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5 text-fuchsia-400" /> Reference Images
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-fuchsia-400/80 font-mono">Tag @IMAGE_REF_0..4</span>
                          {Math.max(3, Math.min(5, (omniRefPreviews.filter(Boolean).length >= 4 ? 5 : omniRefPreviews.filter(Boolean).length >= 3 || omniRefPreviews[2] ? 4 : 3))) < 5 && (
                            <button
                              onClick={() => {
                                // Force reveal next slot by selecting upload target
                                const currentFilled = omniRefPreviews.filter(Boolean).length;
                                const nextSlot = Math.min(4, Math.max(3, currentFilled));
                                setUploadTarget(`omni_ref_${nextSlot}`);
                                fileInputRef?.current?.click();
                              }}
                              className="flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider text-fuchsia-300 hover:text-white bg-fuchsia-500/20 hover:bg-fuchsia-500/30 px-1.5 py-0.5 rounded border border-fuchsia-500/30 transition-all cursor-pointer"
                              title="Add another reference image"
                            >
                              + Add Ref
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        {Array.from({ length: Math.min(5, Math.max(3, omniRefPreviews.filter(Boolean).length >= 4 ? 5 : omniRefPreviews.filter(Boolean).length >= 3 || omniRefPreviews[2] ? 4 : 3)) }).map((_, idx) => {
                          const slotPreview = omniRefPreviews[idx] || (idx === 0 ? omniFirstFramePreview : idx === 1 ? omniLastFramePreview : '');
                          return (
                            <div key={idx} className="p-2 rounded-xl bg-white/[0.02] backdrop-blur-md border border-white/10 hover:border-fuchsia-500/40 transition-all flex flex-col gap-1.5 relative shadow-md">
                              <div className="flex items-center justify-between px-0.5">
                                <span className="text-[9px] font-mono font-bold text-fuchsia-300 flex items-center gap-1">
                                  Ref {idx + 1}
                                </span>
                                {slotPreview && (
                                  <button
                                    onClick={() => handleClearRef(idx)}
                                    className="p-0.5 text-red-400 hover:bg-red-500/20 rounded transition-colors cursor-pointer"
                                    title={`Remove Image Ref ${idx + 1}`}
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                )}
                              </div>

                              {slotPreview ? (
                                <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/60 border border-white/15 relative group">
                                  <img src={slotPreview} alt={`Ref ${idx + 1}`} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                    <button
                                      onClick={() => {
                                        setUploadTarget(idx === 0 ? 'first' : idx === 1 ? 'last' : `omni_ref_${idx}`);
                                        fileInputRef?.current?.click();
                                      }}
                                      className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-[8px] font-bold uppercase tracking-wider cursor-pointer"
                                    >
                                      Replace
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setUploadTarget(idx === 0 ? 'first' : idx === 1 ? 'last' : `omni_ref_${idx}`);
                                    fileInputRef?.current?.click();
                                  }}
                                  className="aspect-video w-full rounded-lg border border-dashed border-white/20 bg-white/[0.02] hover:bg-fuchsia-500/10 hover:border-fuchsia-400/50 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-fuchsia-300 transition-all cursor-pointer"
                                  title={`Upload Image Ref ${idx + 1}`}
                                >
                                  <Upload size={14} className="text-fuchsia-400/70" />
                                  <span className="text-[8px] font-bold uppercase tracking-wider">Upload Ref {idx + 1}</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Direct Reference Video Upload Slot (Square Card) */}
                    <div className="w-28 p-2 rounded-xl bg-white/[0.02] backdrop-blur-md border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col gap-1.5 relative shadow-md">
                      <div className="flex items-center justify-between px-0.5">
                        <span className="text-[8px] font-mono font-bold text-cyan-300 flex items-center gap-1 truncate">
                          <Video className="w-2.5 h-2.5 text-cyan-400" /> Ref Video
                        </span>
                        {videoPreview && (
                          <button onClick={() => { setVideoPreview(null); if (setOmniRefVideoDuration) setOmniRefVideoDuration(0); }} className="p-0.5 text-red-400 hover:bg-red-500/20 rounded transition-colors cursor-pointer" title="Remove Reference Video">
                            <Trash2 size={9} />
                          </button>
                        )}
                      </div>
                      {isVideoUploading ? (
                        <div className="aspect-square w-full rounded-lg border border-cyan-400/50 bg-cyan-950/40 backdrop-blur-md flex flex-col items-center justify-center gap-1 text-cyan-300 animate-pulse">
                          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                          <span className="text-[7px] font-bold uppercase tracking-wider">Uploading</span>
                        </div>
                      ) : videoPreview ? (
                        <div className="aspect-square w-full rounded-lg overflow-hidden bg-black/60 border border-white/15 relative group">
                          <video src={videoPreview} controls muted playsInline preload="metadata" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                            <button onClick={() => videoInputRef.current?.click()} className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 text-white rounded text-[7px] font-bold uppercase tracking-wider cursor-pointer">Replace</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => videoInputRef.current?.click()} className="aspect-square w-full rounded-lg border border-dashed border-white/20 bg-white/[0.02] hover:bg-cyan-500/10 hover:border-cyan-400/50 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-cyan-300 transition-all cursor-pointer" title="Upload Reference Video (10s max)">
                          <Video size={14} className="text-cyan-400/70" />
                          <span className="text-[7px] font-bold uppercase tracking-wider text-center">Ref Video</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. THIRD SECTION: Glass Prompt Textarea for Omni Flash with @Mention Autocomplete */}
                <div className="space-y-2 relative">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-fuchsia-300">
                      <Zap className="w-3.5 h-3.5" /> Omni Flash Prompt & Instructions
                    </span>
                    <span className="text-[10px] text-fuchsia-400/80 font-mono">Type @ to tag references</span>
                  </label>

                  {/* Glass Autocomplete Mention Popover */}
                  {mentionSearch !== null && (
                    <div className="absolute bottom-full mb-2 left-0 right-0 z-[200] bg-[#0a0a14]/98 border border-fuchsia-500/40 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.9)] backdrop-blur-3xl overflow-hidden flex flex-col max-h-56">
                      <div className="px-3 py-2 border-b border-white/10 bg-fuchsia-950/40 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-fuchsia-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Tag className="w-3 h-3" /> Tag Uploaded Media or Asset
                        </span>
                        <button onClick={() => setMentionSearch(null)} className="text-gray-400 hover:text-white p-1">
                          <X size={12} />
                        </button>
                      </div>
                      <div className="overflow-y-auto custom-scrollbar p-1 divide-y divide-white/5">
                        {availableMentionItems.filter(i => i.name.toLowerCase().includes((mentionSearch || '').toLowerCase())).length > 0 ? (
                          availableMentionItems
                            .filter(i => i.name.toLowerCase().includes((mentionSearch || '').toLowerCase()))
                            .map((item, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => selectMention(item)}
                                className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-fuchsia-600/20 transition-all rounded-xl text-left cursor-pointer"
                              >
                                <div className="w-7 h-7 rounded-lg bg-black/50 border border-white/15 overflow-hidden shrink-0 flex items-center justify-center">
                                  {item.isVideo ? (
                                    <Video className="w-3.5 h-3.5 text-cyan-400" />
                                  ) : item.imageUrl ? (
                                    <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                                  ) : (
                                    <ImageIcon className="w-3.5 h-3.5 text-fuchsia-400" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-white truncate">@{item.name}</p>
                                  <p className="text-[9px] text-gray-400 truncate">{item.category}</p>
                                </div>
                              </button>
                            ))
                        ) : (
                          <div className="p-4 text-center text-xs text-gray-400">No matching references found.</div>
                        )}
                      </div>
                    </div>
                  )}

                  <textarea
                    ref={textareaRef}
                    value={localPrompt}
                    onChange={handlePromptChange}
                    placeholder="Describe your video sequence or edit instructions... Type @ to tag uploaded references."
                    rows={4}
                    className="w-full bg-black/50 border border-white/15 focus:border-fuchsia-400/70 rounded-2xl p-4 text-xs text-white placeholder-gray-500 outline-none resize-none custom-scrollbar leading-relaxed font-medium backdrop-blur-2xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] transition-all"
                  />

                  {/* Detected Tagged Reference Pills */}
                  {detectedMentions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payload Tags:</span>
                      {detectedMentions.map((tag, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-400/40 flex items-center gap-1 backdrop-blur-md">
                          <Tag size={10} className="text-fuchsia-400" /> {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. FOURTH SECTION: Omni Flash Video Parameters */}
                <div className="grid grid-cols-2 gap-3.5 pt-3 border-t border-white/10">
                  <GlassSelect
                    label="Resolution"
                    value={resolution}
                    onChange={setResolution}
                    options={[
                      { value: '720p', label: '720p HD', desc: 'Standard High Definition' },
                      { value: '1080p', label: '1080p Full HD', desc: 'Full HD Quality' }
                    ]}
                  />

                  <GlassSelect
                    label="Duration"
                    value={duration}
                    onChange={(val) => setDuration(Number(val))}
                    options={[
                      { value: 4, label: '4 Seconds', desc: 'Short dynamic clip' },
                      { value: 6, label: '6 Seconds', desc: 'Standard video clip' },
                      { value: 8, label: '8 Seconds', desc: 'Extended camera shot' },
                      { value: 10, label: '10 Seconds', desc: 'Maximum Omni Flash clip' }
                    ]}
                  />

                  <GlassSelect
                    label="Aspect Ratio"
                    value={aspectRatio}
                    onChange={setAspectRatio}
                    options={[
                      { value: '16:9', label: '16:9 Landscape', desc: 'Widescreen cinematic' },
                      { value: '9:16', label: '9:16 Portrait', desc: 'Mobile vertical reel' },
                      { value: '1:1', label: '1:1 Square', desc: 'Social feed post' }
                    ]}
                  />

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-300">Audio Track</label>
                    <button
                      type="button"
                      onClick={() => setGenerateAudio(!generateAudio)}
                      className={cn(
                        "w-full py-2.5 px-3.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all backdrop-blur-xl shadow-md cursor-pointer select-none",
                        generateAudio
                          ? "bg-gradient-to-r from-fuchsia-600/30 to-violet-600/30 border-fuchsia-400 text-fuchsia-200"
                          : "bg-[#0e0e18]/90 border-white/15 text-gray-400 hover:text-white"
                      )}
                    >
                      <span>{generateAudio ? 'Audio Enabled' : 'Muted'}</span>
                      {generateAudio && <Check className="w-3.5 h-3.5 text-fuchsia-400" />}
                    </button>
                  </div>
                </div>

                {/* 5. FIFTH SECTION: Gemini Omni 1.1 Flash Capabilities & Use Cases Documentation Card */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-fuchsia-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-fuchsia-400" />
                      <span>Gemini Omni 1.1 Flash Capabilities & Use Cases</span>
                    </h3>
                    <span className="text-[9px] font-mono bg-fuchsia-500/20 text-fuchsia-300 px-2 py-0.5 rounded-md border border-fuchsia-500/30 font-bold">
                      1.1 Docs
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-400 leading-relaxed font-normal">
                    These capabilities are available in the <strong className="text-white">Gemini Omni 1.1 Flash Preview</strong> model:
                  </p>

                  <div className="space-y-2">
                    {[
                      {
                        title: "Text-to-Video",
                        task: "text_to_video",
                        badge: "Prompt → Video",
                        icon: "🎬",
                        color: "from-violet-500/20 to-indigo-500/10 border-violet-500/30 text-violet-300",
                        desc: "Generate dynamic video sequences directly from text prompts."
                      },
                      {
                        title: "Image-to-Video",
                        task: "image_to_video",
                        badge: "Keyframe → Video",
                        icon: "🖼️",
                        color: "from-fuchsia-500/20 to-pink-500/10 border-fuchsia-500/30 text-fuchsia-300",
                        desc: "Transform static images into videos."
                      },
                      {
                        title: "Reference-to-Video",
                        task: "reference_to_video",
                        badge: "Multimodal Inputs",
                        icon: "🎨",
                        color: "from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-300",
                        desc: "Generate videos from various input media."
                      },
                      {
                        title: "Video Editing",
                        task: "edit",
                        badge: "Natural Language Edit",
                        icon: "✂️",
                        color: "from-rose-500/20 to-red-500/10 border-rose-500/30 text-rose-300",
                        desc: "Modify an original or previously generated video."
                      },
                      {
                        title: "Video Extension",
                        task: "extension",
                        badge: "Extend Duration",
                        icon: "⏩",
                        color: "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-300",
                        desc: "Extend an original or previously generated video."
                      }
                    ].map(uc => (
                      <div
                        key={uc.task}
                        onClick={() => {
                          setOmniTask(uc.task);
                          localStorage.setItem('cs_omniTask', uc.task);
                        }}
                        className={cn(
                          "p-3 rounded-xl border bg-gradient-to-r transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] flex flex-col gap-1 shadow-sm",
                          uc.color,
                          omniTask === uc.task && "ring-1 ring-white/50 border-white/60"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold flex items-center gap-1.5 text-white">
                            <span>{uc.icon}</span>
                            <span>{uc.title}</span>
                          </span>
                          <span className="text-[9px] font-mono uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded text-gray-300 border border-white/10">
                            {uc.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-300 leading-snug font-normal">
                          {uc.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}


          </div>

          {/* Spacious Sticky Bottom Solid Footer Bar */}
          <div className="absolute bottom-0 left-0 right-0 py-5 px-6 bg-[#080810] border-t border-white/20 flex items-center justify-between gap-6 z-20 shadow-[0_-20px_50px_rgba(0,0,0,0.98)]">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest truncate">
                  {panelTab === 'veo' ? 'Veo 3.1 Active' : 'Omni Flash Active'}
                </span>
              </div>
              <span className="text-xs font-black text-[#c8f135] flex items-center gap-1.5 mt-1">
                Cost: {requiredCredits} ⚡ <span className="text-[9.5px] font-medium text-gray-400">({userCredits} ⚡ available)</span>
              </span>
            </div>

            <button
              onClick={panelTab === 'omni' ? triggerGenerateOmni : triggerGenerateVeo}
              disabled={isBusy || !canGenerate}
              className={cn(
                "h-13 py-3.5 px-8 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all shadow-[0_0_40px_rgba(200,241,53,0.4)] border border-[#d4ff00]/40 backdrop-blur-2xl shrink-0 active:scale-95",
                canGenerate
                  ? "bg-gradient-to-r from-[#c8f135] via-[#a8e025] to-[#c8f135] hover:shadow-[0_0_50px_rgba(200,241,53,0.7)] text-black cursor-pointer"
                  : "bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed shadow-none"
              )}
            >
              {isBusy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Generate Video Now</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
});

export default SidePanel;
