import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, Film, Image as ImageIcon, Video, Layers, BookOpen, Clapperboard,
  Upload, Trash2, Check, Zap, Cpu, Code, HelpCircle, RefreshCw, Sliders, Play, Loader2, ChevronDown, Users, Tag
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
  const isOmniEngine = activeEngine === 'omni' || activeEngine === 'omni-flash';

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
    const engineToUse = isOmniEngine ? activeEngine : 'omni-flash';
    setPromptText(localPrompt);
    setActiveTab('video');
    if (!isOmniEngine) {
      setActiveEngine(engineToUse);
    }
    queueMicrotask(() => handleGenerate(localPrompt, engineToUse));
  };

  const handleVideoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsVideoUploading(true);
      const blobUrl = URL.createObjectURL(file);
      setVideoPreview(blobUrl);

      // Check reference video duration
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = blobUrl;
      tempVideo.onloadedmetadata = () => {
        const dur = tempVideo.duration || 0;
        if (setOmniRefVideoDuration) setOmniRefVideoDuration(dur);
        if (dur > 10) {
          const showToast = useAppStore.getState().showToast;
          if (showToast) {
            showToast(`Reference video is ${Math.round(dur * 10) / 10}s long. Omni Flash accepts max 10s (auto-trimmed to 10s).`, "info");
          }
        }
      };

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
    }
  };

  // Build combined list of all available mention items using useMemo
  const availableMentionItems = useMemo(() => {
    const firstPreview = panelTab === 'omni' ? omniFirstFramePreview : firstFramePreview;
    const lastPreview = panelTab === 'omni' ? omniLastFramePreview : lastFramePreview;
    return [
      ...(firstPreview ? [{ name: 'FIRST_FRAME', category: 'Keyframe 1', imageUrl: firstPreview, isKeyframe: true }] : []),
      ...(lastPreview ? [{ name: 'LAST_FRAME', category: 'Keyframe 2', imageUrl: lastPreview, isKeyframe: true }] : []),
      ...(videoPreview ? [{ name: 'REF_VIDEO', category: 'Reference Video', isVideo: true, imageUrl: videoPreview, url: videoPreview }] : []),
      ...(allRefItems || [])
    ];
  }, [panelTab, firstFramePreview, lastFramePreview, omniFirstFramePreview, omniLastFramePreview, videoPreview, allRefItems]);

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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex justify-end pointer-events-none">
          {/* Hidden Dedicated Video File Input */}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoSelect}
          />

          {/* Slide-over Glassmorphic Drawer (Slides from Right) */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="relative w-full max-w-xl bg-[#08080f]/95 border-l border-white/15 shadow-[0_0_80px_rgba(139,92,246,0.3)] flex flex-col h-full overflow-hidden backdrop-blur-3xl text-white z-10 pointer-events-auto"
          >
            {/* Background Ambient Gradient Orbs */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-20 left-0 w-80 h-80 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 right-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Glass Header with ZeroLens Branding */}
            <div className="px-5 py-3 border-b border-white/10 bg-gradient-to-r from-violet-950/40 via-fuchsia-950/30 to-black/40 backdrop-blur-2xl flex items-center justify-between relative z-10">
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

          {/* Glass Navigation Tabs Bar */}
          <div className="px-5 pt-3.5 pb-2.5 bg-black/40 border-b border-white/10 backdrop-blur-2xl flex items-center gap-2 relative z-10">
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
                if (!isOmniEngine) setActiveEngine('omni-flash');
              }}
              className={cn(
                "flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border shadow-lg backdrop-blur-xl cursor-pointer select-none",
                panelTab === 'omni'
                  ? "bg-gradient-to-r from-fuchsia-600/30 via-pink-500/20 to-violet-500/20 text-white border-fuchsia-400/50 shadow-[0_0_20px_rgba(217,70,239,0.3)]"
                  : "bg-white/[0.03] text-gray-400 border-white/10 hover:bg-white/[0.08] hover:text-white"
              )}
            >
              <Zap className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Omni Flash</span>
            </button>
          </div>

          {/* Panel Content Scroll Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 pb-36 relative z-10">
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
                    { value: 'auto', label: 'Auto Infer', desc: 'Auto-detects task from uploaded inputs', icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" /> },
                    { value: 'text_to_video', label: 'Text-to-Video', desc: 'Generate video directly from text prompt', icon: <Film className="w-3.5 h-3.5 text-violet-400" /> },
                    { value: 'image_to_video', label: 'Image-to-Video', desc: 'Animate reference keyframe image', icon: <ImageIcon className="w-3.5 h-3.5 text-fuchsia-400" /> },
                    { value: 'reference_to_video', label: 'Reference-to-Video', desc: 'Multi-asset image & video reference guidance', icon: <Layers className="w-3.5 h-3.5 text-cyan-400" /> },
                    { value: 'edit', label: 'Video Edit', desc: 'Upload clip and apply natural language edit', icon: <Video className="w-3.5 h-3.5 text-rose-400" /> }
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

                  <div className="grid grid-cols-2 gap-3.5">
                    {/* Dynamic Image Reference Slots (up to 3) */}
                    <div className="col-span-2 grid grid-cols-3 gap-2.5">
                      {/* Slot 1: First Frame / Keyframe 1 */}
                      <div className="p-3 rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-fuchsia-500/40 transition-all flex flex-col gap-2 relative shadow-md">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-fuchsia-300 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" /> Image Ref 1
                          </span>
                          {omniFirstFramePreview && (
                            <button onClick={() => handleClearRef('first')} className="p-0.5 text-red-400 hover:bg-red-500/20 rounded-md transition-colors cursor-pointer">
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                        {omniFirstFramePreview ? (
                          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black/60 border border-white/15 relative group">
                            <img src={omniFirstFramePreview} alt="Image Ref 1" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                              <button onClick={() => { setUploadTarget('first'); fileInputRef?.current?.click(); }} className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-[8px] font-bold uppercase tracking-wider cursor-pointer">Replace</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setUploadTarget('first'); fileInputRef?.current?.click(); }} className="aspect-video w-full rounded-xl border border-dashed border-white/20 bg-white/[0.02] hover:bg-fuchsia-500/10 hover:border-fuchsia-400/50 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-fuchsia-300 transition-all cursor-pointer">
                            <Upload size={14} className="text-fuchsia-400/70" />
                            <span className="text-[9px] font-bold uppercase">Upload Image 1</span>
                          </button>
                        )}
                      </div>

                      {/* Slot 2: Last Frame / Keyframe 2 (Visible if first is filled) */}
                      {omniFirstFramePreview ? (
                        <div className="p-3 rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-fuchsia-500/40 transition-all flex flex-col gap-2 relative shadow-md">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-fuchsia-300 flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" /> Image Ref 2
                            </span>
                            {omniLastFramePreview && (
                              <button onClick={() => handleClearRef('last')} className="p-0.5 text-red-400 hover:bg-red-500/20 rounded-md transition-colors cursor-pointer">
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                          {omniLastFramePreview ? (
                            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black/60 border border-white/15 relative group">
                              <img src={omniLastFramePreview} alt="Image Ref 2" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                <button onClick={() => { setUploadTarget('last'); fileInputRef?.current?.click(); }} className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-[8px] font-bold uppercase tracking-wider cursor-pointer">Replace</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => { setUploadTarget('last'); fileInputRef?.current?.click(); }} className="aspect-video w-full rounded-xl border border-dashed border-white/20 bg-white/[0.02] hover:bg-fuchsia-500/10 hover:border-fuchsia-400/50 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-fuchsia-300 transition-all cursor-pointer">
                              <Upload size={14} className="text-fuchsia-400/70" />
                              <span className="text-[9px] font-bold uppercase">Upload Image 2</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 rounded-2xl bg-white/[0.01] border border-white/5 opacity-40 flex flex-col items-center justify-center text-center">
                          <ImageIcon size={14} className="text-gray-600 mb-1" />
                          <span className="text-[8px] font-bold uppercase tracking-widest text-gray-500">Slot 2 Lock</span>
                        </div>
                      )}

                      {/* Slot 3: Reference Image 3 (Visible if second is filled) */}
                      {omniFirstFramePreview && omniLastFramePreview ? (
                        <div className="p-3 rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-fuchsia-500/40 transition-all flex flex-col gap-2 relative shadow-md">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-fuchsia-300 flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" /> Image Ref 3
                            </span>
                            {allRefItems.find(i => i.category === 'ref_images') && (
                              <button
                                onClick={() => {
                                  // Clear third reference image if it exists in allRefItems
                                  const thirdImg = allRefItems.find(i => i.category === 'ref_images');
                                  if (thirdImg) {
                                    handleClearRef('third');
                                  }
                                }}
                                className="p-0.5 text-red-400 hover:bg-red-500/20 rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                          {allRefItems.find(i => i.category === 'ref_images') ? (
                            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black/60 border border-white/15 relative group">
                              <img src={allRefItems.find(i => i.category === 'ref_images')?.imageUrl} alt="Image Ref 3" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                <button onClick={() => { setUploadTarget('ref_images'); fileInputRef?.current?.click(); }} className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-[8px] font-bold uppercase tracking-wider cursor-pointer">Replace</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => { setUploadTarget('ref_images'); fileInputRef?.current?.click(); }} className="aspect-video w-full rounded-xl border border-dashed border-white/20 bg-white/[0.02] hover:bg-fuchsia-500/10 hover:border-fuchsia-400/50 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-fuchsia-300 transition-all cursor-pointer">
                              <Upload size={14} className="text-fuchsia-400/70" />
                              <span className="text-[9px] font-bold uppercase">Upload Image 3</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 rounded-2xl bg-white/[0.01] border border-white/5 opacity-40 flex flex-col items-center justify-center text-center">
                          <ImageIcon size={14} className="text-gray-600 mb-1" />
                          <span className="text-[8px] font-bold uppercase tracking-widest text-gray-500">Slot 3 Lock</span>
                        </div>
                      )}
                    </div>

                    {/* Direct Reference Video Upload Slot */}
                    <div className="p-3.5 rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col gap-2.5 relative shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                          <Video className="w-3 h-3" /> Reference Video
                        </span>
                        {videoPreview && (
                          <div className="flex items-center gap-1.5">
                            {omniRefVideoDuration > 0 && (
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono border ${
                                omniRefVideoDuration > 10
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              }`}>
                                {omniRefVideoDuration > 10
                                  ? `✂️ ${Math.round(omniRefVideoDuration)}s → 10s max`
                                  : `⏱️ ${Math.round(omniRefVideoDuration * 10) / 10}s`}
                              </span>
                            )}
                            <button onClick={() => { setVideoPreview(null); if (setOmniRefVideoDuration) setOmniRefVideoDuration(0); }} className="p-1 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      {isVideoUploading ? (
                        <div className="aspect-video w-full rounded-xl border border-cyan-400/50 bg-cyan-950/40 backdrop-blur-md flex flex-col items-center justify-center gap-2 text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.35)] animate-pulse">
                          <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                          <span className="text-[10px] font-black uppercase tracking-wider">Uploading Ref Video...</span>
                          <span className="text-[8px] text-cyan-300/70 font-mono">Preparing Cloudflare R2 Upload</span>
                        </div>
                      ) : videoPreview ? (
                        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black/60 border border-white/15 relative group shadow-inner">
                          <video src={videoPreview} controls muted playsInline preload="metadata" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-xs">
                            <button onClick={() => videoInputRef.current?.click()} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider border border-white/20 shadow-md backdrop-blur-md cursor-pointer">Replace Video</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => videoInputRef.current?.click()} className="aspect-video w-full rounded-xl border border-dashed border-white/20 bg-white/[0.02] hover:bg-cyan-500/10 hover:border-cyan-400/50 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-cyan-300 transition-all cursor-pointer">
                          <Video size={18} className="text-cyan-400/70" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Upload Ref Video</span>
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
              </div>
            )}

            {/* ────────────────────────────────────────────────────────── */}
            {/* TAB 3: API SPECS & COOKBOOK DOCUMENTATION VIEWER */}
            {/* ────────────────────────────────────────────────────────── */}
            {panelTab === 'docs' && (
              <div className="space-y-5">
                {/* Docs Sub-navigation Tabs */}
                <div className="flex border-b border-white/10 gap-4">
                  <button
                    onClick={() => setDocsSection('omni_flash')}
                    className={cn(
                      "pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer",
                      docsSection === 'omni_flash'
                        ? "border-fuchsia-500 text-fuchsia-300"
                        : "border-transparent text-gray-400 hover:text-white"
                    )}
                  >
                    Gemini Omni Flash Docs
                  </button>
                  <button
                    onClick={() => setDocsSection('veo_cookbook')}
                    className={cn(
                      "pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer",
                      docsSection === 'veo_cookbook'
                        ? "border-cyan-500 text-cyan-300"
                        : "border-transparent text-gray-400 hover:text-white"
                    )}
                  >
                    Veo 3.1 & Gemini Cookbook
                  </button>
                </div>

                {docsSection === 'omni_flash' ? (
                  <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
                    <div className="p-4 rounded-2xl bg-fuchsia-950/20 border border-fuchsia-500/30 backdrop-blur-xl">
                      <h4 className="font-bold text-fuchsia-200 text-xs uppercase tracking-wider">Gemini Omni Flash Overview</h4>
                      <p className="text-[11px] text-fuchsia-300/80 mt-1">
                        High-performance multimodal model designed for real-time video generation, editing, and natural conversational guidance via the Vertex AI Interactions API.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-bold text-white uppercase text-[10px] tracking-wider">Supported Tasks</h5>
                      <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
                          <strong className="text-fuchsia-300">Text-to-Video:</strong> Generate videos from text prompts.
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
                          <strong className="text-fuchsia-300">Image-to-Video:</strong> Animate static keyframe images.
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
                          <strong className="text-fuchsia-300">Reference-to-Video:</strong> Multi-subject asset boards.
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
                          <strong className="text-fuchsia-300">Video Edit:</strong> Natural language video edits.
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-bold text-white uppercase text-[10px] tracking-wider">Vertex AI Interactions Payload</h5>
                      <pre className="p-3.5 rounded-2xl bg-black/60 border border-white/10 text-[10px] font-mono text-cyan-300 overflow-x-auto shadow-inner">
{`POST https://aiplatform.googleapis.com/v1beta1/projects/PROJECT_ID/locations/global/interactions
{
  "model": "gemini-omni-flash-preview",
  "input": [
    {
      "type": "user_input",
      "content": [
        { "type": "document", "uri": "gs://bucket/motion-ref.mp4" },
        { "type": "text", "text": "Apply cinematic lighting edit..." }
      ]
    }
  ],
  "generation_config": {
    "video_config": { "task": "reference_to_video" }
  }
}`}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
                    <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 backdrop-blur-xl">
                      <h4 className="font-bold text-cyan-200 text-xs uppercase tracking-wider">Veo 3.1 & Gemini 3.1 Era Specs</h4>
                      <p className="text-[11px] text-cyan-300/80 mt-1">
                        Definitive specifications for Google Veo 3.1 video generation, dual keyframe conditioning, and Gemini 3.1 multimodal reasoning.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-bold text-white uppercase text-[10px] tracking-wider">Veo 3.1 Dual Frame Conditioning</h5>
                      <p className="text-[11px] text-gray-400">
                        Veo 3.1 accepts both <span className="text-cyan-300 font-semibold">firstFrame</span> (Image 1) and <span className="text-cyan-300 font-semibold">lastFrame</span> (Image 2) in the Vertex AI `:predictLongRunning` payload.
                      </p>
                      <pre className="p-3.5 rounded-2xl bg-black/60 border border-white/10 text-[10px] font-mono text-violet-300 overflow-x-auto shadow-inner">
{`POST https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/veo-3.1-generate-001:predictLongRunning
{
  "instances": [
    {
      "prompt": "Smooth dolly shot from start frame to end frame...",
      "image": { "bytesBase64Encoded": "...", "mimeType": "image/png" },
      "lastImage": { "bytesBase64Encoded": "...", "mimeType": "image/png" }
    }
  ],
  "parameters": {
    "aspectRatio": "16:9",
    "durationSeconds": 8,
    "resolution": "1080p"
  }
}`}
                      </pre>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-bold text-white uppercase text-[10px] tracking-wider">Model Matrix</h5>
                      <div className="overflow-x-auto rounded-xl border border-white/10 shadow-lg">
                        <table className="w-full text-[10px] text-left border-collapse">
                          <thead className="bg-white/5 text-gray-300">
                            <tr>
                              <th className="p-2.5 border-b border-white/10">Model ID</th>
                              <th className="p-2.5 border-b border-white/10">Modality</th>
                              <th className="p-2.5 border-b border-white/10">Capabilities</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-gray-400">
                            <tr>
                              <td className="p-2.5 font-mono text-cyan-300">gemini-omni-flash-preview</td>
                              <td className="p-2.5">Video & Audio</td>
                              <td className="p-2.5">Text/Image/Ref/Edit to Video</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 font-mono text-violet-300">veo-3.1-generate-001</td>
                              <td className="p-2.5">Video</td>
                              <td className="p-2.5">Cinematic 4K/1080p I2V & Dual Frames</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 font-mono text-violet-300">veo-3.1-fast-generate-001</td>
                              <td className="p-2.5">Video</td>
                              <td className="p-2.5">Fast draft video previews</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Spacious Sticky Bottom Glassmorphic Footer Bar */}
          <div className="absolute bottom-0 left-0 right-0 py-5 px-6 bg-[#06060c]/98 border-t border-white/20 backdrop-blur-3xl flex items-center justify-between gap-6 z-20 shadow-[0_-20px_50px_rgba(0,0,0,0.95)]">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest truncate">
                  {panelTab === 'veo' ? 'Veo 3.1 Active' : panelTab === 'omni' ? 'Omni Flash Active' : 'Docs Mode'}
                </span>
              </div>
              <span className="text-xs font-black text-[#c8f135] flex items-center gap-1.5 mt-1">
                Cost: {requiredCredits} ⚡ <span className="text-[9.5px] font-medium text-gray-400">({userCredits} ⚡ available)</span>
              </span>
            </div>

            <button
              onClick={panelTab === 'docs' ? undefined : panelTab === 'omni' ? triggerGenerateOmni : triggerGenerateVeo}
              disabled={isBusy || !canGenerate || panelTab === 'docs'}
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
