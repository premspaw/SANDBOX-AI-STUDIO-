import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, Film, Image as ImageIcon, Video, Layers, Upload, Trash2,
  Check, Zap, Cpu, Sliders, Play, Loader2, ChevronDown, ChevronUp,
  Tag, Aperture, FastForward, Volume2, VolumeX, Maximize2, Info,
  Clock, ImagePlus, Wand2, AlertCircle, Music, Plus, Edit3
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getApiUrl } from '../../config/apiConfig';
import { useAppStore } from '../../store';
import { resolveBlobToBase64 } from './SeedanceEngine';

// Modern Higgsfield-style Segmented Chip Selector
const SegmentedControl = React.memo(({ options, value, onChange, label, icon: Icon, badge }) => (
  <div className="space-y-1.5 w-full">
    {label && (
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400 flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-zinc-400" />}
          <span>{label}</span>
        </label>
        {badge && (
          <span className="text-[9px] font-mono font-bold text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
            {badge}
          </span>
        )}
      </div>
    )}
    <div className="grid grid-flow-col auto-cols-fr gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.08] backdrop-blur-xl">
      {options.map((opt) => {
        const isSelected = String(opt.value) === String(value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 relative select-none cursor-pointer",
              isSelected
                ? "bg-white/[0.12] text-white shadow-[0_2px_12px_rgba(0,0,0,0.5)] border border-white/20 font-extrabold"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
            )}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  </div>
));

// Refined Glassmorphic Dropdown for denser menus
const GlassSelect = React.memo(({ value, onChange, options = [], label, icon: Icon, align = 'up', badge }) => {
  const [open, setOpen] = useState(false);
  const selectedOption = (options && options.find(o => String(o.value) === String(value))) || (options && options[0]) || { label: '', value: '' };

  return (
    <div className="relative space-y-1.5 w-full">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400 flex items-center gap-1.5">
            {Icon && <Icon className="w-3.5 h-3.5 text-zinc-400" />}
            <span>{label}</span>
          </label>
          {badge && (
            <span className="text-[9px] font-mono text-zinc-500">{badge}</span>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full h-[38px] flex items-center justify-between bg-black/40 border border-white/[0.08] hover:border-white/20 rounded-xl px-3 text-xs text-white backdrop-blur-xl transition-all select-none cursor-pointer",
          open && "border-[#c8f135]/60 shadow-[0_0_20px_rgba(200,241,53,0.15)]"
        )}
      >
        <span className="truncate font-semibold flex items-center gap-2">
          {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption.label}</span>
        </span>
        <ChevronDown size={14} className={cn("text-zinc-400 transition-transform duration-200 shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[140]" onClick={() => setOpen(false)} />
          <div className={cn(
            "absolute left-0 right-0 z-[150] bg-[#0c0c14]/98 border border-white/15 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] backdrop-blur-3xl py-1 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar",
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
                  "w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between transition-all border-b border-white/[0.04] last:border-0 cursor-pointer select-none",
                  String(opt.value) === String(value)
                    ? "bg-[#c8f135]/15 text-[#c8f135] font-bold"
                    : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {opt.icon && <span className="text-sm shrink-0">{opt.icon}</span>}
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{opt.label}</span>
                    {opt.desc && <span className="text-[10px] text-zinc-500 font-normal truncate mt-0.5">{opt.desc}</span>}
                  </div>
                </div>
                {String(opt.value) === String(value) && (
                  <Check size={14} className="text-[#c8f135] shrink-0 ml-2" />
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
  panelTab = 'omni',
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
  omniMultiImages: propOmniMultiImages,
  setOmniMultiImages: propSetOmniMultiImages,
  omniMultiVideos: propOmniMultiVideos,
  setOmniMultiVideos: propSetOmniMultiVideos,
  omniRefVideoPreview: propOmniRefVideoPreview,
  setOmniRefVideoPreview: propSetOmniRefVideoPreview,
  omniRefVideoDuration = 0,
  setOmniRefVideoDuration,
  handleFileUpload,
  setUploadTarget,
  handleClearRef,
  fileInputRef,
  duration = 6,
  setDuration,
  aspectRatio = '16:9',
  setAspectRatio,
  resolution = '720p',
  setResolution,
  generateAudio = false,
  setGenerateAudio,
  omniTask = 'auto',
  setOmniTask,
  showRefBoard,
  setShowRefBoard,
  promptText = '',
  setPromptText,
  omniPromptText = '',
  setOmniPromptText,
  handleGenerate,
  isBusy = false,
  activeJobsCount = 0,
  maxConcurrent = 4,
  userCredits = 0,
  requiredCredits = 10,
  canGenerate = true,
  allRefItems = [],
  gallery = [],
  // Motion Control Props (Kling 3.0 via Kie.ai)
  motionSubjectImage: propMotionSubjectImage,
  setMotionSubjectImage: propSetMotionSubjectImage,
  motionSubjectPreview: propMotionSubjectPreview,
  setMotionSubjectPreview: propSetMotionSubjectPreview,
  motionRefVideo: propMotionRefVideo,
  setMotionRefVideo: propSetMotionRefVideo,
  motionRefVideoPreview: propMotionRefVideoPreview,
  setMotionRefVideoPreview: propSetMotionRefVideoPreview,
  motionRefVideoDuration: propMotionRefVideoDuration = 5,
  setMotionRefVideoDuration: propSetMotionRefVideoDuration,
  motionMode: propMotionMode = 'std',
  setMotionMode: propSetMotionMode,
  characterOrientation: propCharacterOrientation = 'video',
  setCharacterOrientation: propSetCharacterOrientation,
  backgroundSource: propBackgroundSource = 'input_video',
  setBackgroundSource: propSetBackgroundSource
}) => {
  // Video File Input Ref & State for Omni Flash Reference Video
  const videoInputRef = useRef(null);
  const [localVideoPreview, setLocalVideoPreview] = useState(null);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [galleryPickerSlot, setGalleryPickerSlot] = useState(null); // { type: 'image' | 'video' | 'first' | 'last' | 'motion_subject' | 'motion_video', slotIdx?: number }

  // Kling 3.0 Motion Control Local States & Refs
  const motionImageInputRef = useRef(null);
  const motionVideoInputRef = useRef(null);
  const [isUploadingMotionImage, setIsUploadingMotionImage] = useState(false);
  const [isUploadingMotionVideo, setIsUploadingMotionVideo] = useState(false);

  const [internalMotionSubjectImage, setInternalMotionSubjectImage] = useState('');
  const [internalMotionSubjectPreview, setInternalMotionSubjectPreview] = useState('');
  const [internalMotionRefVideo, setInternalMotionRefVideo] = useState('');
  const [internalMotionRefVideoPreview, setInternalMotionRefVideoPreview] = useState('');
  const [internalMotionRefVideoDuration, setInternalMotionRefVideoDuration] = useState(5);
  const [internalMotionMode, setInternalMotionMode] = useState('720p');
  const [internalCharacterOrientation, setInternalCharacterOrientation] = useState('video');
  const [internalBackgroundSource, setInternalBackgroundSource] = useState('input_video');

  const motionSubjectImage = propMotionSubjectImage !== undefined ? propMotionSubjectImage : internalMotionSubjectImage;
  const setMotionSubjectImage = propSetMotionSubjectImage || setInternalMotionSubjectImage;
  const motionSubjectPreview = propMotionSubjectPreview !== undefined ? propMotionSubjectPreview : internalMotionSubjectPreview;
  const setMotionSubjectPreview = propSetMotionSubjectPreview || setInternalMotionSubjectPreview;
  const motionRefVideo = propMotionRefVideo !== undefined ? propMotionRefVideo : internalMotionRefVideo;
  const setMotionRefVideo = propSetMotionRefVideo || setInternalMotionRefVideo;
  const motionRefVideoPreview = propMotionRefVideoPreview !== undefined ? propMotionRefVideoPreview : internalMotionRefVideoPreview;
  const setMotionRefVideoPreview = propSetMotionRefVideoPreview || setInternalMotionRefVideoPreview;
  const motionRefVideoDuration = propMotionRefVideoDuration !== undefined ? propMotionRefVideoDuration : internalMotionRefVideoDuration;
  const setMotionRefVideoDuration = propSetMotionRefVideoDuration || setInternalMotionRefVideoDuration;
  const motionMode = propMotionMode !== undefined ? propMotionMode : internalMotionMode;
  const setMotionMode = propSetMotionMode || setInternalMotionMode;
  const characterOrientation = propCharacterOrientation !== undefined ? propCharacterOrientation : internalCharacterOrientation;
  const setCharacterOrientation = propSetCharacterOrientation || setInternalCharacterOrientation;
  const backgroundSource = propBackgroundSource !== undefined ? propBackgroundSource : internalBackgroundSource;
  const setBackgroundSource = propSetBackgroundSource || setInternalBackgroundSource;

  // Multi-Reference States for Omni Multi-Ref Mode (4 Image Slots + 3 Video Slots)
  const [internalMultiImages, setInternalMultiImages] = useState(['', '', '', '']);
  const [internalMultiVideos, setInternalMultiVideos] = useState(['', '', '']);
  const omniMultiImages = propOmniMultiImages || internalMultiImages;
  const setOmniMultiImages = propSetOmniMultiImages || setInternalMultiImages;
  const omniMultiVideos = propOmniMultiVideos || internalMultiVideos;
  const setOmniMultiVideos = propSetOmniMultiVideos || setInternalMultiVideos;
  const omniRefVideoPreview = propOmniRefVideoPreview !== undefined ? propOmniRefVideoPreview : localVideoPreview;
  const setOmniRefVideoPreview = propSetOmniRefVideoPreview || setLocalVideoPreview;

  // ── SEEDANCE MULTIMODAL STATES (Supports up to 30 Images, 3 Videos, 3 Audios, First/Last Frame) ──
  const [seedanceSubModel, setSeedanceSubModel] = useState('seedance-fast');
  const [seedanceImages, setSeedanceImages] = useState(Array(30).fill(''));
  const [seedanceVideos, setSeedanceVideos] = useState(['', '', '']);
  const [seedanceAudios, setSeedanceAudios] = useState(['', '', '']);
  const [seedanceFirstFrame, setSeedanceFirstFrame] = useState('');
  const [seedanceLastFrame, setSeedanceLastFrame] = useState('');
  const [seedanceAddMenuOpen, setSeedanceAddMenuOpen] = useState(false);

  const handlePickSeedanceImage = (item, slotIdx) => {
    const next = [...seedanceImages];
    next[slotIdx] = item.url;
    setSeedanceImages(next);
    autoTagIfMissing(`@image${slotIdx + 1}`);
    setGalleryPickerSlot(null);
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast(`Added to @image${slotIdx + 1}!`, "success");
  };

  const handlePickSeedanceVideo = (item, slotIdx) => {
    const dur = Number(item.duration) || 0;
    if (dur > 15.05) {
      const showToast = useAppStore.getState().showToast;
      const msg = `Seedance video reference must be 15s or shorter (${Math.round(dur * 10) / 10}s detected).`;
      if (showToast) showToast(msg, "error");
      else alert(msg);
      return;
    }
    const next = [...seedanceVideos];
    next[slotIdx] = item.url;
    setSeedanceVideos(next);
    autoTagIfMissing(`@video${slotIdx + 1}`);
    setGalleryPickerSlot(null);
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast(`Added to @video${slotIdx + 1}!`, "success");
  };

  const handlePickSeedanceFirstFrame = (item) => {
    setSeedanceFirstFrame(item.url);
    if (setFirstFramePreview) setFirstFramePreview(item.url);
    if (setFirstFrameImage) setFirstFrameImage(item.url);
    autoTagIfMissing('@first_frame');
    setGalleryPickerSlot(null);
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast("Start Frame attached for Seedance!", "success");
  };

  const handlePickSeedanceLastFrame = (item) => {
    setSeedanceLastFrame(item.url);
    if (setLastFramePreview) setLastFramePreview(item.url);
    if (setLastFrameImage) setLastFrameImage(item.url);
    autoTagIfMissing('@last_frame');
    setGalleryPickerSlot(null);
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast("End Frame attached for Seedance!", "success");
  };

  const handlePickGalleryImage = (item, slotIdx) => {
    const next = [...omniMultiImages];
    next[slotIdx] = item.url;
    setOmniMultiImages(next);
    autoTagIfMissing(`@image${slotIdx + 1}`);
    setGalleryPickerSlot(null);
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast(`Added to @image${slotIdx + 1}!`, "success");
  };

  const handlePickGalleryVideo = (item, slotIdx) => {
    const dur = Number(item.duration) || 0;
    if (dur > 10.05) {
      const showToast = useAppStore.getState().showToast;
      const msg = `Video exceeds 10s limit (${Math.round(dur * 10) / 10}s). Please use a clip up to 10 seconds.`;
      if (showToast) showToast(msg, "error");
      else alert(msg);
      return;
    }
    const next = [...omniMultiVideos];
    next[slotIdx] = item.url;
    setOmniMultiVideos(next);
    autoTagIfMissing(`@video${slotIdx + 1}`);
    setGalleryPickerSlot(null);
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast(`Added to @video${slotIdx + 1}!`, "success");
  };

  const handlePickFirstFrame = (item) => {
    if (setOmniFirstFramePreview) setOmniFirstFramePreview(item.url);
    if (setOmniFirstFrameImage) setOmniFirstFrameImage(item.url);
    if (setFirstFramePreview) setFirstFramePreview(item.url);
    if (setFirstFrameImage) setFirstFrameImage(item.url);
    if (setOmniRefPreviews) setOmniRefPreviews(prev => { const n = [...prev]; n[0] = item.url; return n; });
    if (setOmniRefImages) setOmniRefImages(prev => { const n = [...prev]; n[0] = item.url; return n; });
    setGalleryPickerSlot(null);
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast("Start Frame selected from Gallery!", "success");
  };

  const handlePickLastFrame = (item) => {
    if (setOmniLastFramePreview) setOmniLastFramePreview(item.url);
    if (setOmniLastFrameImage) setOmniLastFrameImage(item.url);
    if (setLastFramePreview) setLastFramePreview(item.url);
    if (setLastFrameImage) setLastFrameImage(item.url);
    if (setOmniRefPreviews) setOmniRefPreviews(prev => { const n = [...prev]; n[1] = item.url; return n; });
    if (setOmniRefImages) setOmniRefImages(prev => { const n = [...prev]; n[1] = item.url; return n; });
    setGalleryPickerSlot(null);
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast("End Frame selected from Gallery!", "success");
  };

  const handlePickMotionSubject = (item) => {
    setMotionSubjectImage(item.url);
    setMotionSubjectPreview(item.url);
    setGalleryPickerSlot(null);
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast("Subject image selected for Motion Control!", "success");
  };

  const handlePickMotionVideo = (item) => {
    const dur = Number(item.duration) || 5;
    if (dur > 30.5) {
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast("Video exceeds 30s limit for Motion Control.", "error");
      return;
    }
    setMotionRefVideo(item.url);
    setMotionRefVideoPreview(item.url);
    setMotionRefVideoDuration(Math.round(dur * 10) / 10);
    setGalleryPickerSlot(null);
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast("Motion pattern video selected for Motion Control!", "success");
  };

  // Upload Handlers for Motion Control
  const handleMotionSubjectSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const showToast = useAppStore.getState().showToast;

    if (!file.type.match(/^image\/(jpeg|png|jpg|webp)/i)) {
      if (showToast) showToast("Subject image must be JPEG, PNG, or WebP format.", "error");
      if (motionImageInputRef.current) motionImageInputRef.current.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      if (showToast) showToast("Subject image exceeds 10MB limit (Max: 10MB).", "error");
      if (motionImageInputRef.current) motionImageInputRef.current.value = '';
      return;
    }

    const blobUrl = URL.createObjectURL(file);

    // Probe image resolution (>340px) and aspect ratio (2:5 to 5:2)
    const probeImage = () => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
      img.onerror = () => resolve(null);
      img.src = blobUrl;
    });

    const dims = await probeImage();
    if (dims && dims.width > 0 && dims.height > 0) {
      if (dims.width < 340 || dims.height < 340) {
        URL.revokeObjectURL(blobUrl);
        if (motionImageInputRef.current) motionImageInputRef.current.value = '';
        const msg = `Subject image resolution must be greater than 340px (${dims.width}×${dims.height} detected).`;
        if (showToast) showToast(msg, "error");
        else alert(msg);
        return;
      }
      const ratio = dims.width / dims.height;
      if (ratio < 0.38 || ratio > 2.62) {
        URL.revokeObjectURL(blobUrl);
        if (motionImageInputRef.current) motionImageInputRef.current.value = '';
        const msg = `Subject image aspect ratio must be between 2:5 and 5:2 (detected ${(Math.round(ratio * 10) / 10)}:1).`;
        if (showToast) showToast(msg, "error");
        else alert(msg);
        return;
      }
    }

    setMotionSubjectPreview(blobUrl);
    setMotionSubjectImage(blobUrl);
    setIsUploadingMotionImage(true);

    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result;
        try {
          const res = await fetch(getApiUrl('/api/upload-asset'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: base64,
              type: 'image',
              userId: useAppStore.getState().userProfile?.id || 'anon',
              folder: 'reference'
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.url) {
              setMotionSubjectImage(data.url);
              setMotionSubjectPreview(data.url);
            }
          }
        } catch (err) {
          console.debug('[SidePanel] Upload subject asset fallback:', err);
        } finally {
          setIsUploadingMotionImage(false);
          if (motionImageInputRef.current) motionImageInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsUploadingMotionImage(false);
      if (motionImageInputRef.current) motionImageInputRef.current.value = '';
    }
  };

  const handleMotionVideoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const showToast = useAppStore.getState().showToast;

    if (!file.type.match(/^video\/(mp4|quicktime|webm)/i) && !file.name.match(/\.(mp4|mov|webm)$/i)) {
      if (showToast) showToast("Motion video must be MP4, MOV, or WebM format.", "error");
      if (motionVideoInputRef.current) motionVideoInputRef.current.value = '';
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      if (showToast) showToast("Motion video exceeds 100MB limit.", "error");
      if (motionVideoInputRef.current) motionVideoInputRef.current.value = '';
      return;
    }

    setIsUploadingMotionVideo(true);
    const blobUrl = URL.createObjectURL(file);

    const probeVideo = () => new Promise((resolve) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      let done = false;
      const finish = (d, w, h) => {
        if (!done) {
          done = true;
          v.onloadedmetadata = null;
          v.onerror = null;
          resolve({ duration: d, width: w, height: h });
        }
      };
      v.onloadedmetadata = () => finish(v.duration || 5, v.videoWidth || 0, v.videoHeight || 0);
      v.onerror = () => finish(5, 0, 0);
      setTimeout(() => finish(5, 0, 0), 4000);
      v.src = blobUrl;
      try { v.load(); } catch (_) {
        void 0;
      }
    });

    const meta = await probeVideo();
    const dur = meta.duration;
    if (dur < 3 || dur > 30.5) {
      setIsUploadingMotionVideo(false);
      URL.revokeObjectURL(blobUrl);
      if (motionVideoInputRef.current) motionVideoInputRef.current.value = '';
      const msg = `Motion video duration must be between 3 and 30 seconds (${Math.round(dur * 10) / 10}s detected).`;
      if (showToast) showToast(msg, "error");
      else alert(msg);
      return;
    }

    if (meta.width > 0 && meta.height > 0) {
      if (meta.width < 340 || meta.height < 340) {
        setIsUploadingMotionVideo(false);
        URL.revokeObjectURL(blobUrl);
        if (motionVideoInputRef.current) motionVideoInputRef.current.value = '';
        const msg = `Motion video resolution must be greater than 340px (${meta.width}×${meta.height} detected).`;
        if (showToast) showToast(msg, "error");
        else alert(msg);
        return;
      }
      const ratio = meta.width / meta.height;
      if (ratio < 0.38 || ratio > 2.62) {
        setIsUploadingMotionVideo(false);
        URL.revokeObjectURL(blobUrl);
        if (motionVideoInputRef.current) motionVideoInputRef.current.value = '';
        const msg = `Motion video aspect ratio must be between 2:5 and 5:2 (detected ${(Math.round(ratio * 10) / 10)}:1).`;
        if (showToast) showToast(msg, "error");
        else alert(msg);
        return;
      }
    }

    const cleanDur = Math.round(dur * 10) / 10;
    setMotionRefVideoDuration(cleanDur);
    setMotionRefVideoPreview(blobUrl);
    setMotionRefVideo(blobUrl);

    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result;
        try {
          const res = await fetch(getApiUrl('/api/upload-asset'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: base64,
              type: 'video',
              userId: useAppStore.getState().userProfile?.id || 'anon',
              folder: 'reference'
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.url) {
              setMotionRefVideo(data.url);
              setMotionRefVideoPreview(data.url);
            }
          }
        } catch (err) {
          console.debug('[SidePanel] Upload motion video fallback:', err);
        } finally {
          setIsUploadingMotionVideo(false);
          if (motionVideoInputRef.current) motionVideoInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsUploadingMotionVideo(false);
      if (motionVideoInputRef.current) motionVideoInputRef.current.value = '';
    }
  };

  const handleClearMotionSubject = () => {
    setMotionSubjectImage('');
    setMotionSubjectPreview('');
    if (motionImageInputRef.current) motionImageInputRef.current.value = '';
  };

  const handleClearMotionVideo = () => {
    setMotionRefVideo('');
    setMotionRefVideoPreview('');
    setMotionRefVideoDuration(5);
    if (motionVideoInputRef.current) motionVideoInputRef.current.value = '';
  };

  // File Input Refs for 4 Image Slots and 3 Video Slots
  const multiImgInput0 = useRef(null);
  const multiImgInput1 = useRef(null);
  const multiImgInput2 = useRef(null);
  const multiImgInput3 = useRef(null);
  const multiImageRefs = [multiImgInput0, multiImgInput1, multiImgInput2, multiImgInput3];

  const multiVidInput0 = useRef(null);
  const multiVidInput1 = useRef(null);
  const multiVidInput2 = useRef(null);
  const multiVideoRefs = [multiVidInput0, multiVidInput1, multiVidInput2];

  // Dedicated refs for Start and End keyframes
  const startFrameInputRef = useRef(null);
  const endFrameInputRef = useRef(null);

  // ── SEEDANCE INPUT REFS (30 Image Slots, 3 Video Slots, 3 Audio Slots, First/Last Frame) ──
  const seedanceImageRefs = useMemo(() => Array.from({ length: 30 }, () => ({ current: null })), []);

  const seedanceVidInput0 = useRef(null);
  const seedanceVidInput1 = useRef(null);
  const seedanceVidInput2 = useRef(null);
  const seedanceVideoRefs = useMemo(() => [seedanceVidInput0, seedanceVidInput1, seedanceVidInput2], []);

  const seedanceAudInput0 = useRef(null);
  const seedanceAudInput1 = useRef(null);
  const seedanceAudInput2 = useRef(null);
  const seedanceAudioRefs = useMemo(() => [seedanceAudInput0, seedanceAudInput1, seedanceAudInput2], []);

  const seedanceFirstFrameInputRef = useRef(null);
  const seedanceLastFrameInputRef = useRef(null);

  // ── SEEDANCE UPLOAD & CLEAR HANDLERS ──
  const handleSeedanceImageSelect = (e, slotIdx) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    const next = [...seedanceImages];
    next[slotIdx] = blobUrl;
    setSeedanceImages(next);
    autoTagIfMissing(`@image${slotIdx + 1}`);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setSeedanceImages(prev => {
        const copy = [...prev];
        copy[slotIdx] = dataUrl;
        return copy;
      });

      try {
        const resp = await fetch(getApiUrl('/api/save-asset'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: dataUrl,
            type: 'image',
            fileName: `seedance_ref_img_${slotIdx + 1}_${Date.now()}.png`,
            folder: 'reference'
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.url) {
            setSeedanceImages(prev => {
              const copy = [...prev];
              copy[slotIdx] = data.url;
              return copy;
            });
          }
        }
      } catch (err) {
        console.debug('Seedance image save fallback:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearSeedanceImage = useCallback((slotIdx) => {
    setSeedanceImages(prev => {
      const next = [...prev];
      next[slotIdx] = '';
      return next;
    });
    if (seedanceImageRefs[slotIdx]?.current) {
      seedanceImageRefs[slotIdx].current.value = '';
    }
  }, [seedanceImageRefs]);

  const handleSeedanceVideoSelect = (e, slotIdx) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = blobUrl;
    tempVideo.onloadedmetadata = () => {
      const dur = tempVideo.duration || 0;
      if (dur > 15.05) {
        URL.revokeObjectURL(blobUrl);
        if (seedanceVideoRefs[slotIdx]?.current) seedanceVideoRefs[slotIdx].current.value = '';
        const showToast = useAppStore.getState().showToast;
        const msg = `Seedance video reference must be 15s or shorter (${Math.round(dur * 10) / 10}s detected).`;
        if (showToast) showToast(msg, "error");
        else alert(msg);
        return;
      }
      const next = [...seedanceVideos];
      next[slotIdx] = blobUrl;
      setSeedanceVideos(next);
      autoTagIfMissing(`@video${slotIdx + 1}`);

      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64Data = ev.target.result;
        setSeedanceVideos(prev => {
          const copy = [...prev];
          copy[slotIdx] = base64Data;
          return copy;
        });

        try {
          const resp = await fetch(getApiUrl('/api/save-asset'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageData: base64Data,
              type: 'video',
              fileName: `seedance_ref_vid_${slotIdx + 1}_${Date.now()}.mp4`,
              folder: 'reference'
            })
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data.url) {
              setSeedanceVideos(prev => {
                const copy = [...prev];
                copy[slotIdx] = data.url;
                return copy;
              });
            }
          }
        } catch (err) {
          console.debug('Seedance video save fallback:', err);
        }
      };
      reader.readAsDataURL(file);
    };
  };

  const handleClearSeedanceVideo = useCallback((slotIdx) => {
    setSeedanceVideos(prev => {
      const next = [...prev];
      next[slotIdx] = '';
      return next;
    });
    if (seedanceVideoRefs[slotIdx]?.current) {
      seedanceVideoRefs[slotIdx].current.value = '';
    }
  }, [seedanceVideoRefs]);

  const handleSeedanceAudioSelect = (e, slotIdx) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    const tempAudio = document.createElement('audio');
    tempAudio.preload = 'metadata';
    tempAudio.src = blobUrl;
    tempAudio.onloadedmetadata = () => {
      const dur = tempAudio.duration || 0;
      if (dur > 15.05) {
        URL.revokeObjectURL(blobUrl);
        if (seedanceAudioRefs[slotIdx]?.current) seedanceAudioRefs[slotIdx].current.value = '';
        const showToast = useAppStore.getState().showToast;
        const msg = `Seedance audio reference must be 15s or shorter (${Math.round(dur * 10) / 10}s detected).`;
        if (showToast) showToast(msg, "error");
        else alert(msg);
        return;
      }
      const next = [...seedanceAudios];
      next[slotIdx] = blobUrl;
      setSeedanceAudios(next);
      autoTagIfMissing(`@audio${slotIdx + 1}`);

      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64Data = ev.target.result;
        setSeedanceAudios(prev => {
          const copy = [...prev];
          copy[slotIdx] = base64Data;
          return copy;
        });

        try {
          const resp = await fetch(getApiUrl('/api/save-asset'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageData: base64Data,
              type: 'audio',
              fileName: `seedance_ref_aud_${slotIdx + 1}_${Date.now()}.mp3`,
              folder: 'reference'
            })
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data.url) {
              setSeedanceAudios(prev => {
                const copy = [...prev];
                copy[slotIdx] = data.url;
                return copy;
              });
            }
          }
        } catch (err) {
          console.debug('Seedance audio save fallback:', err);
        }
      };
      reader.readAsDataURL(file);
    };
  };

  const handleClearSeedanceAudio = useCallback((slotIdx) => {
    setSeedanceAudios(prev => {
      const next = [...prev];
      next[slotIdx] = '';
      return next;
    });
    if (seedanceAudioRefs[slotIdx]?.current) {
      seedanceAudioRefs[slotIdx].current.value = '';
    }
  }, [seedanceAudioRefs]);

  const handleSeedanceFirstFrameSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    setSeedanceFirstFrame(blobUrl);
    if (setFirstFramePreview) setFirstFramePreview(blobUrl);
    autoTagIfMissing('@first_frame');

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setSeedanceFirstFrame(dataUrl);
      if (setFirstFrameImage) setFirstFrameImage(dataUrl);
      try {
        const resp = await fetch(getApiUrl('/api/save-asset'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: dataUrl,
            type: 'image',
            fileName: `seedance_first_frame_${Date.now()}.png`,
            folder: 'reference'
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.url) {
            setSeedanceFirstFrame(data.url);
            if (setFirstFrameImage) setFirstFrameImage(data.url);
          }
        }
      } catch (err) {
        console.debug('Seedance first frame save fallback:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearSeedanceFirstFrame = useCallback(() => {
    setSeedanceFirstFrame('');
    if (setFirstFrameImage) setFirstFrameImage('');
    if (setFirstFramePreview) setFirstFramePreview('');
    if (seedanceFirstFrameInputRef.current) seedanceFirstFrameInputRef.current.value = '';
  }, [setFirstFrameImage, setFirstFramePreview]);

  const handleSeedanceLastFrameSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    setSeedanceLastFrame(blobUrl);
    if (setLastFramePreview) setLastFramePreview(blobUrl);
    autoTagIfMissing('@last_frame');

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setSeedanceLastFrame(dataUrl);
      if (setLastFrameImage) setLastFrameImage(dataUrl);
      try {
        const resp = await fetch(getApiUrl('/api/save-asset'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: dataUrl,
            type: 'image',
            fileName: `seedance_last_frame_${Date.now()}.png`,
            folder: 'reference'
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.url) {
            setSeedanceLastFrame(data.url);
            if (setLastFrameImage) setLastFrameImage(data.url);
          }
        }
      } catch (err) {
        console.debug('Seedance last frame save fallback:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearSeedanceLastFrame = useCallback(() => {
    setSeedanceLastFrame('');
    if (setLastFrameImage) setLastFrameImage('');
    if (setLastFramePreview) setLastFramePreview('');
    if (seedanceLastFrameInputRef.current) seedanceLastFrameInputRef.current.value = '';
  }, [setLastFrameImage, setLastFramePreview]);

  // Dynamic active items for Seedance dock (grows as items are added)
  const activeSeedanceItems = useMemo(() => {
    const items = [];
    if (seedanceFirstFrame) {
      items.push({
        id: 'first_frame',
        type: 'first_frame',
        tag: '@first_frame',
        url: seedanceFirstFrame,
        label: 'Start Frame',
        onRemove: handleClearSeedanceFirstFrame
      });
    }
    if (seedanceLastFrame) {
      items.push({
        id: 'last_frame',
        type: 'last_frame',
        tag: '@last_frame',
        url: seedanceLastFrame,
        label: 'End Frame',
        onRemove: handleClearSeedanceLastFrame
      });
    }
    seedanceImages.forEach((url, idx) => {
      if (url) {
        items.push({
          id: `image_${idx}`,
          type: 'image',
          tag: `@image${idx + 1}`,
          url,
          label: `Image ${idx + 1}`,
          onRemove: () => handleClearSeedanceImage(idx)
        });
      }
    });
    seedanceVideos.forEach((url, idx) => {
      if (url) {
        items.push({
          id: `video_${idx}`,
          type: 'video',
          tag: `@video${idx + 1}`,
          url,
          label: `Video ${idx + 1}`,
          onRemove: () => handleClearSeedanceVideo(idx)
        });
      }
    });
    seedanceAudios.forEach((url, idx) => {
      if (url) {
        items.push({
          id: `audio_${idx}`,
          type: 'audio',
          tag: `@audio${idx + 1}`,
          url,
          label: `Audio ${idx + 1}`,
          onRemove: () => handleClearSeedanceAudio(idx)
        });
      }
    });
    return items;
  }, [seedanceFirstFrame, seedanceLastFrame, seedanceImages, seedanceVideos, seedanceAudios, handleClearSeedanceFirstFrame, handleClearSeedanceLastFrame, handleClearSeedanceImage, handleClearSeedanceVideo, handleClearSeedanceAudio]);

  const videoPreview = propOmniRefVideoPreview !== undefined ? propOmniRefVideoPreview : localVideoPreview;
  const setVideoPreview = (val) => {
    setLocalVideoPreview(val);
    if (propSetOmniRefVideoPreview) propSetOmniRefVideoPreview(val);
  };

  const [refVideoList, setRefVideoList] = useState([]);

  useEffect(() => {
    if (videoPreview && refVideoList.length === 0) {
      setRefVideoList([videoPreview]);
    }
  }, [videoPreview, refVideoList.length]);

  const addVideoToList = (url) => {
    setRefVideoList(prev => {
      const updated = [...prev, url].slice(0, 3);
      setTimeout(() => setVideoPreview(updated[0] || null), 0);
      return updated;
    });
  };

  const removeVideoAt = (idx) => {
    setRefVideoList(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      setTimeout(() => {
        setVideoPreview(updated[0] || null);
        if (updated.length === 0 && setOmniRefVideoDuration) setOmniRefVideoDuration(0);
      }, 0);
      return updated;
    });
  };

  // Textarea Ref & Local Prompt State
  const textareaRef = useRef(null);
  const promptBackdropRef = useRef(null);
  const [mentionSearch, setMentionSearch] = useState(null);
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const [localPrompt, setLocalPrompt] = useState(promptText || '');
  const [isAstraWriting, setIsAstraWriting] = useState(false);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    setLocalPrompt(promptText || '');
  }, [promptText]);

  // Astra (ChatGPT 6) Scenario & Prompt Writer (with Vertex AI Gemini MCP Fallback)
  const handleAstraWritePrompt = useCallback(async () => {
    if (isAstraWriting) return;
    setIsAstraWriting(true);
    const showToast = useAppStore.getState().showToast;
    try {
      const scenarioContext = [
        firstFramePreview ? "Start Keyframe loaded" : "",
        lastFramePreview ? "End Keyframe loaded" : "",
        videoPreview ? "Reference Video Motion loaded" : "",
        aspectRatio ? `Aspect: ${aspectRatio}` : "",
        duration ? `Duration: ${duration}s` : "",
        panelTab ? `Mode: ${panelTab}` : ""
      ].filter(Boolean).join(" | ");

      const res = await fetch(getApiUrl('/api/forge/write-prompt'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: localPrompt || '',
          scenario: scenarioContext,
          type: panelTab === 'image' ? 'image' : 'video',
          style: 'Cinematic Cinema'
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.refinedPrompt) {
        setLocalPrompt(data.refinedPrompt);
        setPromptText(data.refinedPrompt);
        const isGemini = data.model && (data.model.toLowerCase().includes('gemini') || data.model.includes('MCP'));
        if (showToast) showToast(isGemini ? `Prompt crafted with ${data.model} (Fallback)!` : "Prompt crafted by Astra (ChatGPT 6)!", "success");
      }
    } catch (err) {
      console.warn('[Astra Prompt Fallback to Gemini MCP]', err);
      try {
        const res = await fetch(getApiUrl('/api/mcp/enhance-prompt'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: localPrompt || 'Cinematic shot of subject in dramatic lighting',
            style: 'Cinematic Cinema Masterwork',
            engine: panelTab === 'image' ? 'imagen-3' : 'seedance',
            aspectRatio: aspectRatio || '16:9'
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.enhancedPrompt) {
            setLocalPrompt(data.enhancedPrompt);
            setPromptText(data.enhancedPrompt);
            if (showToast) showToast("Prompt enhanced with Vertex AI Gemini MCP (Fallback)!", "success");
            return;
          }
        }
      } catch (mcpFallbackErr) {
        console.debug('[MCP Fallback Error]', mcpFallbackErr);
      }
      if (showToast) showToast("Prompt generation failed", "error");
    } finally {
      setIsAstraWriting(false);
    }
  }, [isAstraWriting, firstFramePreview, lastFramePreview, videoPreview, aspectRatio, duration, panelTab, localPrompt, setPromptText]);

  // Vertex AI Gemini MCP Prompt Enhancer
  const [isMcpEnhancing, setIsMcpEnhancing] = useState(false);
  const handleVertexMcpEnhancePrompt = useCallback(async () => {
    if (isMcpEnhancing) return;
    setIsMcpEnhancing(true);
    const showToast = useAppStore.getState().showToast;
    try {
      const res = await fetch(getApiUrl('/api/mcp/enhance-prompt'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: localPrompt || 'Cinematic shot of subject in dramatic lighting',
          style: 'Cinematic Cinema Masterwork',
          engine: panelTab === 'image' ? 'imagen-3' : 'seedance',
          aspectRatio: aspectRatio || '16:9'
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.enhancedPrompt) {
        setLocalPrompt(data.enhancedPrompt);
        setPromptText(data.enhancedPrompt);
        if (showToast) showToast("Prompt enhanced with Vertex AI Gemini MCP!", "success");
      }
    } catch (err) {
      console.error('[MCP Prompt Enhance Error]', err);
      if (showToast) showToast("MCP enhancement failed: " + err.message, "error");
    } finally {
      setIsMcpEnhancing(false);
    }
  }, [isMcpEnhancing, localPrompt, panelTab, aspectRatio, setPromptText]);

  // Cursor tracker to prevent scrolling to top on tag insertion
  const lastCursorRef = useRef({ start: 0, end: 0, scrollTop: 0 });
  const updateCursorState = useCallback((e) => {
    if (e.target) {
      lastCursorRef.current = {
        start: e.target.selectionStart ?? 0,
        end: e.target.selectionEnd ?? 0,
        scrollTop: e.target.scrollTop ?? 0
      };
    }
  }, []);

  // Insert @tag at current cursor position in prompt without scrolling to top
  const insertTagAtCursor = useCallback((tag) => {
    const textarea = textareaRef.current;
    const text = localPrompt || '';
    const start = textarea ? textarea.selectionStart : (lastCursorRef.current.start || text.length);
    const end = textarea ? textarea.selectionEnd : (lastCursorRef.current.end || text.length);
    const textBefore = text.substring(0, start);
    const textAfter = text.substring(end);
    const needSpaceBefore = textBefore.length > 0 && !textBefore.endsWith(' ');
    const tagText = `${needSpaceBefore ? ' ' : ''}${tag} `;
    const updated = `${textBefore}${tagText}${textAfter}`;
    const newPos = textBefore.length + tagText.length;
    const savedScroll = textarea ? textarea.scrollTop : lastCursorRef.current.scrollTop;

    setLocalPrompt(updated);
    setPromptText(updated);

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
        textareaRef.current.scrollTop = savedScroll;
      }
    });
  }, [localPrompt, setPromptText]);

  // Automatically tag placeholder in prompt if not present without resetting scroll position
  const autoTagIfMissing = useCallback((tag) => {
    const current = localPrompt || '';
    if (!current.includes(tag)) {
      const updated = current.trim() ? `${current.trim()} ${tag}` : tag;
      setLocalPrompt(updated);
      if (setPromptText) setPromptText(updated);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        }
      });
    }
  }, [localPrompt, setPromptText]);

  const handleMultiImageSelect = (e, slotIdx) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    const next = [...omniMultiImages];
    next[slotIdx] = blobUrl;
    setOmniMultiImages(next);
    autoTagIfMissing(`@image${slotIdx + 1}`);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setOmniMultiImages(prev => {
        const copy = [...prev];
        copy[slotIdx] = dataUrl;
        return copy;
      });

      try {
        const resp = await fetch(getApiUrl('/api/save-asset'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: dataUrl,
            type: 'image',
            fileName: `ref_image_${slotIdx + 1}_${Date.now()}.png`,
            folder: 'reference'
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.url) {
            setOmniMultiImages(prev => {
              const copy = [...prev];
              copy[slotIdx] = data.url;
              return copy;
            });
          }
        }
      } catch (err) {
        console.debug('Asset save fallback:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearMultiImage = (slotIdx) => {
    const next = [...omniMultiImages];
    next[slotIdx] = '';
    setOmniMultiImages(next);
    if (multiImageRefs[slotIdx]?.current) {
      multiImageRefs[slotIdx].current.value = '';
    }
  };

  const handleMultiVideoSelect = (e, slotIdx) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = blobUrl;
    tempVideo.onloadedmetadata = () => {
      const dur = tempVideo.duration || 0;
      if (dur > 10.05) {
        URL.revokeObjectURL(blobUrl);
        if (multiVideoRefs[slotIdx]?.current) multiVideoRefs[slotIdx].current.value = '';
        const showToast = useAppStore.getState().showToast;
        const msg = `Video reference must be 10 seconds or shorter (${Math.round(dur * 10) / 10}s detected).`;
        if (showToast) {
          showToast(msg, "error");
        } else {
          alert(msg);
        }
        return;
      }
      const next = [...omniMultiVideos];
      next[slotIdx] = blobUrl;
      setOmniMultiVideos(next);
      autoTagIfMissing(`@video${slotIdx + 1}`);

      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64Data = ev.target.result;
        setOmniMultiVideos(prev => {
          const copy = [...prev];
          copy[slotIdx] = base64Data;
          return copy;
        });

        try {
          const resp = await fetch(getApiUrl('/api/save-asset'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageData: base64Data,
              type: 'video',
              fileName: `ref_video_${slotIdx + 1}_${Date.now()}.mp4`,
              folder: 'reference'
            })
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data.url) {
              setOmniMultiVideos(prev => {
                const copy = [...prev];
                copy[slotIdx] = data.url;
                return copy;
              });
            }
          }
        } catch (err) {
          console.debug('Video save fallback:', err);
        }
      };
      reader.readAsDataURL(file);
    };
  };

  const handleClearMultiVideo = (slotIdx) => {
    const next = [...omniMultiVideos];
    next[slotIdx] = '';
    setOmniMultiVideos(next);
    if (multiVideoRefs[slotIdx]?.current) {
      multiVideoRefs[slotIdx].current.value = '';
    }
  };

  const isVeoEngine = activeEngine.startsWith('veo-3.1') || activeEngine === 'veo3';
  const isOmniEngine = activeEngine === 'omni' || activeEngine === 'omni-flash' || activeEngine === 'omni-flash-1.1' || activeEngine === 'gemini-omni-1.1-flash-preview';
  const isSeedanceEngine = activeEngine.startsWith('seedan') || activeEngine === 'seedace';

  // Dynamic Credits calculation aligned with Vertex AI / Omni backend, Seedance 2.0, and Kling Motion Control
  const calculatedCredits = useMemo(() => {
    if (panelTab === 'motion' || activeEngine.includes('motion')) {
      const rate = (motionMode === 'pro' || motionMode === '1080p') ? 9 : 7;
      const dur = motionRefVideoDuration > 0 ? Math.ceil(motionRefVideoDuration) : (duration || 5);
      return rate * dur;
    }
    if (panelTab === 'seedance-2.5' || activeEngine === 'seedance-2.5') {
      const resLower = (resolution || '720p').toLowerCase();
      const costPerSec = resLower === '1080p' ? 70 : (resLower === '480p' ? 15 : 30);
      return Math.ceil(costPerSec * (Number(duration) || 10));
    }
    if (panelTab === 'seedance' || isSeedanceEngine) {
      const resLower = (resolution || '720p').toLowerCase();
      const currentModel = (activeEngine === 'seedace' || seedanceSubModel === 'seedace')
        ? 'seedace'
        : (activeEngine === 'seedance-mini' || seedanceSubModel === 'seedance-mini')
        ? 'seedance-mini'
        : 'seedance-fast';

      let costPerSec = 25;
      if (currentModel === 'seedance-mini') {
        costPerSec = resLower === '480p' ? 10 : 15;
      } else if (currentModel === 'seedace') {
        costPerSec = resLower === '4k' ? 140 : (resLower === '1080p' ? 70 : (resLower === '480p' ? 15 : 30));
      } else {
        // seedance-fast
        costPerSec = resLower === '480p' ? 15 : 25;
      }
      return Math.ceil(costPerSec * (Number(duration) || 5));
    }
    if (panelTab === 'omni' || panelTab === 'omni-multi' || isOmniEngine) {
      let costPerSec = 5;
      const resLower = (resolution || '720p').toLowerCase();
      if (resLower === '4k') costPerSec = generateAudio ? 19 : 15;
      else if (resLower === '1080p') costPerSec = generateAudio ? 8 : 6;
      else if (resLower === '360p') costPerSec = generateAudio ? 5 : 4;
      else costPerSec = generateAudio ? 6 : 5; // 720p
      return Math.ceil(costPerSec * 1.1 * duration);
    }
    return Math.round(duration * 2.5 * (generateAudio ? 1.5 : 1));
  }, [panelTab, activeEngine, seedanceSubModel, motionMode, motionRefVideoDuration, isOmniEngine, isSeedanceEngine, resolution, generateAudio, duration]);

  const triggerGenerateVeo = async () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const engineToUse = isVeoEngine ? activeEngine : 'veo-3.1-generate-preview';
    setPromptText(localPrompt);
    setActiveTab('video');
    if (!isVeoEngine) setActiveEngine(engineToUse);

    const [resolvedStart, resolvedEnd] = await Promise.all([
      resolveBlobToBase64(firstFrameImage || omniFirstFrameImage),
      resolveBlobToBase64(lastFrameImage || omniLastFrameImage)
    ]);

    const resolvedOmniRefs = (await Promise.all(
      (omniRefImages || []).filter(Boolean).map(img => resolveBlobToBase64(img))
    )).filter(Boolean);

    handleGenerate(localPrompt, engineToUse, {
      firstFrame: resolvedStart,
      lastFrame: resolvedEnd,
      reference_image_urls: resolvedOmniRefs,
      omniRefImages: resolvedOmniRefs,
      duration,
      resolution,
      aspectRatio,
      generateAudio
    });
  };

  const triggerGenerateOmni = async () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const engineToUse = 'gemini-omni-1.1-flash-preview';
    setPromptText(localPrompt);
    setActiveTab('video');
    if (!isOmniEngine) setActiveEngine(engineToUse);

    const [resolvedStart, resolvedEnd] = await Promise.all([
      resolveBlobToBase64(omniFirstFrameImage || firstFrameImage),
      resolveBlobToBase64(omniLastFrameImage || lastFrameImage)
    ]);

    const resolvedOmniRefs = (await Promise.all(
      (omniRefImages || []).filter(Boolean).map(img => resolveBlobToBase64(img))
    )).filter(Boolean);

    const resolvedMultiImgs = (await Promise.all(
      (omniMultiImages || []).filter(Boolean).map(img => resolveBlobToBase64(img))
    )).filter(Boolean);

    const resolvedMultiVids = (await Promise.all(
      (omniMultiVideos || []).filter(Boolean).map(async (vid) => {
        const url = typeof vid === 'string' ? vid : (vid.url || vid.imageUrl || vid.data);
        const resolvedUrl = await resolveBlobToBase64(url);
        return resolvedUrl ? { url: resolvedUrl, duration: vid.duration || 10 } : null;
      })
    )).filter(Boolean);

    const resolvedRefVid = omniRefVideoPreview ? await resolveBlobToBase64(omniRefVideoPreview) : null;

    handleGenerate(localPrompt, engineToUse, {
      firstFrame: resolvedStart,
      lastFrame: resolvedEnd,
      reference_image_urls: [...resolvedOmniRefs, ...resolvedMultiImgs],
      omniRefImages: resolvedOmniRefs,
      omniMultiImages: resolvedMultiImgs,
      omniMultiVideos: resolvedMultiVids,
      omniRefVideoPreview: resolvedRefVid,
      duration,
      resolution,
      aspectRatio,
      generateAudio
    });
  };

  const triggerGenerateSeedance = async () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const showToast = useAppStore.getState().showToast;

    const engineToUse = (panelTab === 'seedance-2.5' || activeEngine === 'seedance-2.5')
      ? 'seedance-2.5'
      : (activeEngine === 'seedace' || activeEngine === 'seedance-mini')
      ? activeEngine
      : 'seedance-fast';

    // Resolve any blob URLs to base64 / data URLs before packaging payload
    const rawStart = seedanceFirstFrame || firstFrameImage || omniFirstFrameImage;
    const rawEnd = seedanceLastFrame || lastFrameImage || omniLastFrameImage;

    const [resolvedStartImg, resolvedEndImg] = await Promise.all([
      rawStart ? resolveBlobToBase64(rawStart) : null,
      rawEnd ? resolveBlobToBase64(rawEnd) : null
    ]);

    const resolvedImages = (await Promise.all(
      seedanceImages.filter(Boolean).map(img => resolveBlobToBase64(img))
    )).filter(Boolean);

    const resolvedVideos = (await Promise.all(
      seedanceVideos.filter(Boolean).map(vid => resolveBlobToBase64(vid))
    )).filter(Boolean);

    const resolvedAudios = (await Promise.all(
      seedanceAudios.filter(Boolean).map(aud => resolveBlobToBase64(aud))
    )).filter(Boolean);

    const compiledContent = [];
    if (localPrompt?.trim()) {
      compiledContent.push({
        type: "text",
        text: localPrompt.trim()
      });
    }

    if (resolvedStartImg) {
      compiledContent.push({
        type: "image_url",
        image_url: { url: resolvedStartImg },
        role: "first_frame"
      });
    }

    if (resolvedEndImg) {
      compiledContent.push({
        type: "image_url",
        image_url: { url: resolvedEndImg },
        role: "last_frame"
      });
    }

    resolvedImages.forEach((img) => {
      if (img) {
        compiledContent.push({
          type: "image_url",
          image_url: { url: img },
          role: "reference_image"
        });
      }
    });

    resolvedVideos.forEach((vid) => {
      if (vid) {
        compiledContent.push({
          type: "video_url",
          video_url: { url: vid },
          role: "reference_video"
        });
      }
    });

    resolvedAudios.forEach((aud) => {
      if (aud) {
        compiledContent.push({
          type: "audio_url",
          audio_url: { url: aud },
          role: "reference_audio"
        });
      }
    });

    if (compiledContent.length === 0) {
      const msg = "Please enter prompt text or attach at least one reference element.";
      if (showToast) showToast(msg, "error");
      else alert(msg);
      return;
    }

    setPromptText(localPrompt);
    setActiveTab('video');
    setActiveEngine(engineToUse);

    handleGenerate(localPrompt, engineToUse, {
      seedanceContentArray: compiledContent,
      firstFrame: resolvedStartImg,
      lastFrame: resolvedEndImg,
      reference_image_urls: resolvedImages,
      reference_video_urls: resolvedVideos,
      reference_audio_urls: resolvedAudios,
      duration: Number(duration) || (panelTab === 'seedance-2.5' ? 10 : 5),
      resolution: (panelTab === 'seedance-2.5' && resolution === '4k') ? '1080p' : resolution,
      aspectRatio,
      generateAudio
    });
  };

  const triggerGenerateMotion = async () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const showToast = useAppStore.getState().showToast;

    if (!motionSubjectPreview && !motionSubjectImage) {
      const msg = "Please upload a subject reference image for Motion Control.";
      if (showToast) showToast(msg, "error");
      else alert(msg);
      return;
    }
    if (!motionRefVideoPreview && !motionRefVideo) {
      const msg = "Please upload a motion reference video for Motion Control.";
      if (showToast) showToast(msg, "error");
      else alert(msg);
      return;
    }

    const rawSub = motionSubjectImage || motionSubjectPreview;
    const rawVid = motionRefVideo || motionRefVideoPreview;

    const [resolvedSub, resolvedVid] = await Promise.all([
      rawSub ? resolveBlobToBase64(rawSub) : null,
      rawVid ? resolveBlobToBase64(rawVid) : null
    ]);

    const dur = motionRefVideoDuration > 0 ? Math.ceil(motionRefVideoDuration) : (duration || 5);
    const engineToUse = 'kling-motion';
    setPromptText(localPrompt);
    setActiveTab('video');
    setActiveEngine(engineToUse);
    handleGenerate(localPrompt, engineToUse, {
      input_url: resolvedSub,
      video_url: resolvedVid,
      mode: motionMode,
      character_orientation: characterOrientation,
      background_source: backgroundSource,
      duration: dur,
      aspectRatio
    });
  };

  // Start Frame Upload Handler
  const handleStartFrameSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);

    // Instant UI preview in both Omni and regular state
    if (setOmniFirstFramePreview) setOmniFirstFramePreview(blobUrl);
    if (setFirstFramePreview) setFirstFramePreview(blobUrl);
    if (setOmniRefPreviews) {
      setOmniRefPreviews(prev => { const n = [...prev]; n[0] = blobUrl; return n; });
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      if (setOmniFirstFrameImage) setOmniFirstFrameImage(dataUrl);
      if (setFirstFrameImage) setFirstFrameImage(dataUrl);
      if (setOmniRefImages) {
        setOmniRefImages(prev => { const n = [...prev]; n[0] = dataUrl; return n; });
      }

      try {
        const resp = await fetch(getApiUrl('/api/save-asset'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: dataUrl,
            type: 'reference_upload',
            fileName: `start_frame_${Date.now()}.png`,
            folder: 'reference'
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          const publicUrl = data.url || data.path || dataUrl;
          if (setOmniFirstFrameImage) setOmniFirstFrameImage(publicUrl);
          if (setFirstFrameImage) setFirstFrameImage(publicUrl);
          if (setOmniRefImages) {
            setOmniRefImages(prev => { const n = [...prev]; n[0] = publicUrl; return n; });
          }
        }
      } catch (err) {
        console.debug('[SidePanel] Start frame API save fallback:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  // End Frame Upload Handler
  const handleEndFrameSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);

    // Instant UI preview in both Omni and regular state
    if (setOmniLastFramePreview) setOmniLastFramePreview(blobUrl);
    if (setLastFramePreview) setLastFramePreview(blobUrl);
    if (setOmniRefPreviews) {
      setOmniRefPreviews(prev => { const n = [...prev]; n[1] = blobUrl; return n; });
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      if (setOmniLastFrameImage) setOmniLastFrameImage(dataUrl);
      if (setLastFrameImage) setLastFrameImage(dataUrl);
      if (setOmniRefImages) {
        setOmniRefImages(prev => { const n = [...prev]; n[1] = dataUrl; return n; });
      }

      try {
        const resp = await fetch(getApiUrl('/api/save-asset'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: dataUrl,
            type: 'reference_upload',
            fileName: `end_frame_${Date.now()}.png`,
            folder: 'reference'
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          const publicUrl = data.url || data.path || dataUrl;
          if (setOmniLastFrameImage) setOmniLastFrameImage(publicUrl);
          if (setLastFrameImage) setLastFrameImage(publicUrl);
          if (setOmniRefImages) {
            setOmniRefImages(prev => { const n = [...prev]; n[1] = publicUrl; return n; });
          }
        }
      } catch (err) {
        console.debug('[SidePanel] End frame API save fallback:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearStartFrame = () => {
    if (setOmniFirstFrameImage) setOmniFirstFrameImage('');
    if (setOmniFirstFramePreview) setOmniFirstFramePreview('');
    if (setFirstFrameImage) setFirstFrameImage('');
    if (setFirstFramePreview) setFirstFramePreview('');
    if (setOmniRefImages) setOmniRefImages(prev => { const n = [...prev]; n[0] = ''; return n; });
    if (setOmniRefPreviews) setOmniRefPreviews(prev => { const n = [...prev]; n[0] = ''; return n; });
    if (startFrameInputRef.current) startFrameInputRef.current.value = '';
  };

  const handleClearEndFrame = () => {
    if (setOmniLastFrameImage) setOmniLastFrameImage('');
    if (setOmniLastFramePreview) setOmniLastFramePreview('');
    if (setLastFrameImage) setLastFrameImage('');
    if (setLastFramePreview) setLastFramePreview('');
    if (setOmniRefImages) setOmniRefImages(prev => { const n = [...prev]; n[1] = ''; return n; });
    if (setOmniRefPreviews) setOmniRefPreviews(prev => { const n = [...prev]; n[1] = ''; return n; });
    if (endFrameInputRef.current) endFrameInputRef.current.value = '';
  };

  const handleVideoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (refVideoList.length >= 3) {
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast("Maximum 3 driving reference videos allowed.", "warning");
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }

    setIsVideoUploading(true);
    const blobUrl = URL.createObjectURL(file);

    // Robust duration checker with safety timeout & fallback
    const checkDuration = () => new Promise((resolve) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      let done = false;
      const finish = (dur) => {
        if (!done) {
          done = true;
          v.onloadedmetadata = null;
          v.onerror = null;
          resolve(dur);
        }
      };
      v.onloadedmetadata = () => finish(v.duration || 0);
      v.onerror = () => finish(0); // If browser cannot probe metadata, allow upload
      setTimeout(() => finish(0), 2500); // 2.5s fallback
      v.src = blobUrl;
      try { v.load(); } catch (_) {
        // Fallback if browser media loading fails
      }
    });

    const dur = await checkDuration();
    if (dur > 10.05) {
      setIsVideoUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
      URL.revokeObjectURL(blobUrl);

      const showToast = useAppStore.getState().showToast;
      const msg = `Video reference must be 10 seconds or shorter (${Math.round(dur * 10) / 10}s detected).`;
      if (showToast) {
        showToast(msg, "error");
      } else {
        alert(msg);
      }
      return;
    }

    if (setOmniRefVideoDuration) setOmniRefVideoDuration(dur);
    addVideoToList(blobUrl);

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
            setRefVideoList(prev => {
              const copy = [...prev];
              const lastIdx = copy.indexOf(blobUrl);
              if (lastIdx !== -1) copy[lastIdx] = publicUrl;
              else if (copy.length < 3) copy.push(publicUrl);
              setVideoPreview(copy[0] || null);
              return copy;
            });
            if (propSetOmniRefVideoPreview) propSetOmniRefVideoPreview(publicUrl);
          }
        } catch (e) {
          console.debug('[SidePanel] Video save fallback:', e);
        } finally {
          setIsVideoUploading(false);
          if (videoInputRef.current) videoInputRef.current.value = '';
        }
      };
      reader.onerror = () => {
        setIsVideoUploading(false);
        if (videoInputRef.current) videoInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsVideoUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  // Mention items list (Seedance slots, RefBoard elements, and recent Gallery History assets)
  const availableMentionItems = useMemo(() => {
    const firstPreview = (panelTab === 'omni' ? omniFirstFramePreview : panelTab === 'seedance' ? (seedanceFirstFrame || firstFramePreview) : firstFramePreview) || firstFrameImage || omniFirstFrameImage;
    const lastPreview = (panelTab === 'omni' ? (omniLastFramePreview || omniRefPreviews[1]) : panelTab === 'seedance' ? (seedanceLastFrame || lastFramePreview) : lastFramePreview) || lastFrameImage || omniLastFrameImage;

    const omniSlots = [
      { name: '<FIRST_FRAME>', category: 'First Frame', imageUrl: firstPreview, isKeyframe: true },
      { name: '<LAST_FRAME>', category: 'Last Frame', imageUrl: lastPreview, isKeyframe: true },
      { name: '<IMAGE_REF_0>', category: 'Reference 1', imageUrl: omniRefPreviews[0] || omniFirstFramePreview },
      { name: '<IMAGE_REF_1>', category: 'Reference 2', imageUrl: omniRefPreviews[1] || omniLastFramePreview },
      { name: '<IMAGE_REF_2>', category: 'Reference 3', imageUrl: omniRefPreviews[2] },
      { name: '<IMAGE_REF_3>', category: 'Reference 4', imageUrl: omniRefPreviews[3] },
      { name: '<IMAGE_REF_4>', category: 'Reference 5', imageUrl: omniRefPreviews[4] }
    ];

    const multiSlots = [
      { name: 'image1', category: 'Image Ref 1', imageUrl: omniMultiImages[0] },
      { name: 'image2', category: 'Image Ref 2', imageUrl: omniMultiImages[1] },
      { name: 'image3', category: 'Image Ref 3', imageUrl: omniMultiImages[2] },
      { name: 'image4', category: 'Image Ref 4', imageUrl: omniMultiImages[3] },
      { name: 'video1', category: 'Video Ref 1', isVideo: true, imageUrl: omniMultiVideos[0] },
      { name: 'video2', category: 'Video Ref 2', isVideo: true, imageUrl: omniMultiVideos[1] },
      { name: 'video3', category: 'Video Ref 3', isVideo: true, imageUrl: omniMultiVideos[2] },
    ];

    const seedanceSlots = [
      ...(firstPreview ? [{ name: 'first_frame', category: 'Start Frame', imageUrl: firstPreview, isKeyframe: true }] : []),
      ...(lastPreview ? [{ name: 'last_frame', category: 'End Frame', imageUrl: lastPreview, isKeyframe: true }] : []),
      ...seedanceImages.map((img, idx) => img ? { name: `image${idx + 1}`, category: `Image ${idx + 1}`, imageUrl: img } : null).filter(Boolean),
      ...seedanceVideos.map((vid, idx) => vid ? { name: `video${idx + 1}`, category: `Video ${idx + 1}`, isVideo: true, imageUrl: vid } : null).filter(Boolean),
      ...seedanceAudios.map((aud, idx) => aud ? { name: `audio${idx + 1}`, category: `Audio ${idx + 1}`, isAudio: true, imageUrl: aud } : null).filter(Boolean),
    ];

    const galleryHistoryItems = (gallery || [])
      .filter(item => !item.loading && item.url)
      .slice(0, 20)
      .map((item, idx) => {
        const cleanName = item.prompt ? item.prompt.slice(0, 24).replace(/[^\w]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') : `history_${idx + 1}`;
        return {
          id: item.id || `hist_${idx}`,
          name: cleanName || `history_${idx + 1}`,
          category: item.type === 'video' ? 'History Video' : 'History Image',
          imageUrl: item.url,
          url: item.url,
          isVideo: item.type === 'video',
          isHistory: true
        };
      });

    if (panelTab === 'seedance') {
      return [...seedanceSlots, ...(allRefItems || []), ...galleryHistoryItems];
    }

    if (panelTab === 'omni-multi') {
      return [...multiSlots, ...(allRefItems || []), ...galleryHistoryItems];
    }

    return [
      ...(panelTab === 'omni' ? omniSlots : [
        ...(firstPreview ? [{ name: 'FIRST_FRAME', category: 'First Frame', imageUrl: firstPreview, isKeyframe: true }] : []),
        ...(lastPreview ? [{ name: 'LAST_FRAME', category: 'Last Frame', imageUrl: lastPreview, isKeyframe: true }] : [])
      ]),
      ...(videoPreview ? [{ name: '<REF_VIDEO>', category: 'Reference Video', isVideo: true, imageUrl: videoPreview, url: videoPreview }] : []),
      ...(allRefItems || []),
      ...galleryHistoryItems
    ];
  }, [panelTab, firstFramePreview, lastFramePreview, firstFrameImage, lastFrameImage, omniFirstFramePreview, omniLastFramePreview, omniFirstFrameImage, omniLastFrameImage, omniRefPreviews, videoPreview, omniMultiImages, omniMultiVideos, seedanceFirstFrame, seedanceLastFrame, seedanceImages, seedanceVideos, seedanceAudios, allRefItems, gallery]);

  const handlePromptChange = useCallback((e) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setLocalPrompt(val);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      React.startTransition(() => setPromptText(val));
    }, 250);

    const textBeforeCursor = val.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@([\w_<>]*)$/);

    if (match) {
      setMentionSearch(match[1]);
      setMentionCursorPos(cursorPos);
    } else {
      setMentionSearch(null);
    }
  }, [setPromptText]);

  const selectMention = (item) => {
    const textarea = textareaRef.current;
    const text = localPrompt || '';
    const cursor = mentionCursorPos || (textarea ? textarea.selectionStart : text.length);
    const textBefore = text.slice(0, cursor).replace(/@[\w_<>]*$/, '');
    const textAfter = text.slice(cursor);
    const cleanName = (item.name || '').startsWith('@') ? item.name.slice(1) : (item.name || '');
    const tagText = (cleanName.startsWith('<') || cleanName.startsWith('image') || cleanName.startsWith('video') || cleanName.startsWith('audio') || cleanName.startsWith('first') || cleanName.startsWith('last'))
      ? `@${cleanName} `
      : `@${cleanName} `;
    const updated = `${textBefore}${tagText}${textAfter}`;
    const nextPos = textBefore.length + tagText.length;
    const savedScroll = textarea ? textarea.scrollTop : 0;

    setLocalPrompt(updated);
    setPromptText(updated);
    setMentionSearch(null);

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextPos, nextPos);
        textareaRef.current.scrollTop = savedScroll;
      }
    });
  };

  const detectedMentions = useMemo(() => {
    const matches = (localPrompt || '').match(/@<[\w_-]+>|@[\w_-]+/g) || [];
    return [...new Set(matches)];
  }, [localPrompt]);

  const aspectOptions = useMemo(() => [
    { value: '16:9', label: '16:9 Landscape', desc: '1920×1080 Widescreen' },
    { value: '9:16', label: '9:16 Vertical', desc: '1080×1920 Reels/Shorts' },
    { value: '1:1', label: '1:1 Square', desc: '1080×1080 Feed Post' },
    { value: '4:3', label: '4:3 Standard', desc: 'Classic Cinema format' },
    { value: '3:4', label: '3:4 Portrait', desc: 'Classic Portrait format' },
    { value: '21:9', label: '21:9 Ultrawide', desc: 'Anamorphic Cinema scope' }
  ], []);

  const durationOptions = useMemo(() => [
    { value: 4, label: '4 Seconds', desc: 'Fast preview' },
    { value: 5, label: '5 Seconds', desc: 'Quick burst (5s)' },
    { value: 6, label: '6 Seconds', desc: 'Standard shot (6s)' },
    { value: 8, label: '8 Seconds', desc: 'Extended clip (8s)' },
    { value: 10, label: '10 Seconds', desc: 'Long sequence (10s)' }
  ], []);

  const seedanceDurationOptions = useMemo(() => [
    { value: 4, label: '4 Seconds', desc: '4s Quick shot' },
    { value: 6, label: '6 Seconds', desc: '6s Standard clip' },
    { value: 8, label: '8 Seconds', desc: '8s Extended shot' },
    { value: 12, label: '12 Seconds', desc: '12s Long sequence' },
    { value: 15, label: '15 Seconds', desc: '15s Maximum duration' }
  ], []);

  const seedance25DurationOptions = useMemo(() => [
    { value: 10, label: '10 Seconds', desc: '10s Baseline clip' },
    { value: 15, label: '15 Seconds', desc: '15s Extended shot' },
    { value: 20, label: '20 Seconds', desc: '20s Cinematic scene' },
    { value: 25, label: '25 Seconds', desc: '25s Long sequence' },
    { value: 30, label: '30 Seconds', desc: '30s Maximum duration' }
  ], []);

  const seedanceModelOptions = useMemo(() => [
    { value: 'seedance-fast', label: 'Seedance 2.0 Fast', desc: '480p / 720p · Ultra-fast' },
    { value: 'seedace', label: 'Seedance 2.0 Pro', desc: 'Up to 4K UHD · Master quality' },
    { value: 'seedance-mini', label: 'Seedance Mini', desc: '480p / 720p · Budget-friendly' }
  ], []);

  const seedance25ModelOptions = useMemo(() => [
    { value: 'seedance-2.5', label: 'Seedance 2.5 Pro', desc: 'Up to 30s · 50 references · Native Audio' }
  ], []);

  const resolutionOptions = useMemo(() => {
    if (panelTab === 'seedance-2.5') {
      return [
        { value: '480p', label: '480p SD', desc: '15 cr/s · SD Preview' },
        { value: '720p', label: '720p HD', desc: '30 cr/s · Standard HD' },
        { value: '1080p', label: '1080p FHD', desc: '70 cr/s · High-def cinematic' }
      ];
    }
    if (panelTab === 'seedance') {
      const currentModel = (activeEngine === 'seedace' || seedanceSubModel === 'seedace')
        ? 'seedace'
        : (activeEngine === 'seedance-mini' || seedanceSubModel === 'seedance-mini')
        ? 'seedance-mini'
        : 'seedance-fast';

      if (currentModel === 'seedace') {
        return [
          { value: '480p', label: '480p SD', desc: '15 cr/s · SD Preview' },
          { value: '720p', label: '720p HD', desc: '30 cr/s · Standard HD' },
          { value: '1080p', label: '1080p FHD', desc: '70 cr/s · High-def cinematic' },
          { value: '4k', label: '4K UHD', desc: '140 cr/s · 4K Master' }
        ];
      }
      if (currentModel === 'seedance-mini') {
        return [
          { value: '480p', label: '480p SD', desc: '10 cr/s · Budget preview' },
          { value: '720p', label: '720p HD', desc: '15 cr/s · Standard HD' }
        ];
      }
      // seedance-fast
      return [
        { value: '480p', label: '480p SD', desc: '15 cr/s · Fast preview' },
        { value: '720p', label: '720p HD', desc: '25 cr/s · Standard HD' }
      ];
    }
    if (panelTab === 'omni' || panelTab === 'omni-multi') {
      return [
        { value: '360p', label: '360p SD', desc: 'Fast preview' },
        { value: '720p', label: '720p HD', desc: 'Crisp render' },
        { value: '1080p', label: '1080p FHD', desc: 'High-def master' },
        { value: '4k', label: '4K UHD', desc: 'Cinema quality' }
      ];
    }
    return [
      { value: '720p', label: '720p HD', desc: 'Crisp render' },
      { value: '1080p', label: '1080p FHD', desc: 'High-def master' }
    ];
  }, [panelTab, activeEngine, seedanceSubModel]);

  const renderPromptStudio = (placeholderText) => {
    const promptStr = localPrompt || '';
    const firstPreview = (panelTab === 'omni' ? omniFirstFramePreview : (panelTab === 'seedance' || panelTab === 'seedance-2.5') ? (seedanceFirstFrame || firstFramePreview) : firstFramePreview) || firstFrameImage || omniFirstFrameImage;
    const lastPreview = (panelTab === 'omni' ? (omniLastFramePreview || omniRefPreviews[1]) : (panelTab === 'seedance' || panelTab === 'seedance-2.5') ? (seedanceLastFrame || lastFramePreview) : lastFramePreview) || lastFrameImage || omniLastFrameImage;
    const currentRefVideo = videoPreview || propOmniRefVideoPreview;

    // Compile active payload attached references
    const activePayloadRefs = [];
    if (panelTab === 'seedance' || panelTab === 'seedance-2.5') {
      if (seedanceFirstFrame) {
        const isTagged = promptStr.includes('@first_frame') || promptStr.includes('<FIRST_FRAME>') || promptStr.includes('@FIRST_FRAME');
        activePayloadRefs.push({
          id: 'seedance_first_frame',
          tag: '@first_frame',
          displayTag: '@first_frame',
          label: 'Start Frame',
          imageUrl: seedanceFirstFrame,
          isTagged,
          onInsert: () => insertTagAtCursor('@first_frame'),
          onClear: handleClearSeedanceFirstFrame
        });
      }
      if (seedanceLastFrame) {
        const isTagged = promptStr.includes('@last_frame') || promptStr.includes('<LAST_FRAME>') || promptStr.includes('@LAST_FRAME');
        activePayloadRefs.push({
          id: 'seedance_last_frame',
          tag: '@last_frame',
          displayTag: '@last_frame',
          label: 'End Frame',
          imageUrl: seedanceLastFrame,
          isTagged,
          isLastFrame: true,
          onInsert: () => insertTagAtCursor('@last_frame'),
          onClear: handleClearSeedanceLastFrame
        });
      }
      seedanceImages.forEach((img, idx) => {
        if (img) {
          const tag = `@image${idx + 1}`;
          activePayloadRefs.push({
            id: `seedance_img_${idx}`,
            tag,
            displayTag: tag,
            label: `Image ${idx + 1}`,
            imageUrl: img,
            isTagged: promptStr.includes(tag),
            onInsert: () => insertTagAtCursor(tag),
            onClear: () => handleClearSeedanceImage(idx)
          });
        }
      });
      seedanceVideos.forEach((vid, idx) => {
        if (vid) {
          const tag = `@video${idx + 1}`;
          activePayloadRefs.push({
            id: `seedance_vid_${idx}`,
            tag,
            displayTag: tag,
            label: `Video ${idx + 1}`,
            isVideo: true,
            imageUrl: vid,
            isTagged: promptStr.includes(tag),
            onInsert: () => insertTagAtCursor(tag),
            onClear: () => handleClearSeedanceVideo(idx)
          });
        }
      });
      seedanceAudios.forEach((aud, idx) => {
        if (aud) {
          const tag = `@audio${idx + 1}`;
          activePayloadRefs.push({
            id: `seedance_aud_${idx}`,
            tag,
            displayTag: tag,
            label: `Audio ${idx + 1}`,
            isAudio: true,
            imageUrl: aud,
            isTagged: promptStr.includes(tag),
            onInsert: () => insertTagAtCursor(tag),
            onClear: () => handleClearSeedanceAudio(idx)
          });
        }
      });
    } else {
      if (firstPreview) {
        const isTagged = promptStr.includes('<FIRST_FRAME>') || promptStr.includes('@FIRST_FRAME') || promptStr.includes('@<FIRST_FRAME>');
        activePayloadRefs.push({
          id: 'first_frame',
          tag: '<FIRST_FRAME>',
          displayTag: '@FIRST_FRAME',
          label: 'Start Frame',
          imageUrl: firstPreview,
          isTagged,
          onInsert: () => insertTagAtCursor('<FIRST_FRAME>'),
          onClear: handleClearStartFrame
        });
      }

      if (lastPreview) {
        const isTagged = promptStr.includes('<LAST_FRAME>') || promptStr.includes('@LAST_FRAME') || promptStr.includes('@<LAST_FRAME>');
        activePayloadRefs.push({
          id: 'last_frame',
          tag: '<LAST_FRAME>',
          displayTag: '@LAST_FRAME',
          label: 'End Frame',
          imageUrl: lastPreview,
          isTagged,
          isLastFrame: true,
          onInsert: () => insertTagAtCursor('<LAST_FRAME>'),
          onClear: handleClearEndFrame
        });
      }

      if (panelTab === 'omni-multi') {
        omniMultiImages.forEach((img, idx) => {
          if (img) {
            const tag = `@image${idx + 1}`;
            activePayloadRefs.push({
              id: `multi_img_${idx}`,
              tag,
              displayTag: tag,
              label: `Image Ref ${idx + 1}`,
              imageUrl: img,
              isTagged: promptStr.includes(tag),
              onInsert: () => insertTagAtCursor(tag),
              onClear: () => handleClearMultiImage(idx)
            });
          }
        });

        omniMultiVideos.forEach((vid, idx) => {
          if (vid) {
            const tag = `@video${idx + 1}`;
            activePayloadRefs.push({
              id: `multi_vid_${idx}`,
              tag,
              displayTag: tag,
              label: `Video Ref ${idx + 1}`,
              isVideo: true,
              isTagged: promptStr.includes(tag),
              onInsert: () => insertTagAtCursor(tag),
              onClear: () => handleClearMultiVideo(idx)
            });
          }
        });
      }

      if (currentRefVideo && panelTab === 'omni') {
        const isTagged = promptStr.includes('<REF_VIDEO>') || promptStr.includes('@REF_VIDEO') || promptStr.includes('@<REF_VIDEO>');
        activePayloadRefs.push({
          id: 'ref_video',
          tag: '<REF_VIDEO>',
          displayTag: '@REF_VIDEO',
          label: 'Driving Video',
          isVideo: true,
          isTagged,
          onInsert: () => insertTagAtCursor('<REF_VIDEO>')
        });
      }
    }

    // Missing attachments warnings (tags in prompt with empty slots)
    const missingWarnings = [];
    if (panelTab === 'seedance' || panelTab === 'seedance-2.5') {
      if ((promptStr.includes('@first_frame') || promptStr.includes('<FIRST_FRAME>')) && !seedanceFirstFrame) {
        missingWarnings.push({
          id: 'warn_seedance_first',
          tag: '@first_frame',
          message: '@first_frame tagged in prompt, but Start Frame is not attached!',
          actionLabel: '+ Attach Start Frame',
          onAction: () => seedanceFirstFrameInputRef.current?.click()
        });
      }
      if ((promptStr.includes('@last_frame') || promptStr.includes('<LAST_FRAME>')) && !seedanceLastFrame) {
        missingWarnings.push({
          id: 'warn_seedance_last',
          tag: '@last_frame',
          message: '@last_frame tagged in prompt, but End Frame is not attached!',
          actionLabel: '+ Attach End Frame',
          onAction: () => seedanceLastFrameInputRef.current?.click()
        });
      }
      seedanceImages.forEach((img, idx) => {
        const tag = `@image${idx + 1}`;
        if (promptStr.includes(tag) && !img) {
          missingWarnings.push({
            id: `warn_s_img_${idx}`,
            tag,
            message: `${tag} tagged in prompt, but slot is empty!`,
            actionLabel: `+ Upload Image ${idx + 1}`,
            onAction: () => seedanceImageRefs[idx]?.current?.click()
          });
        }
      });
      [0, 1, 2].forEach(idx => {
        const tag = `@video${idx + 1}`;
        if (promptStr.includes(tag) && !seedanceVideos[idx]) {
          missingWarnings.push({
            id: `warn_s_vid_${idx}`,
            tag,
            message: `${tag} tagged in prompt, but slot is empty!`,
            actionLabel: `+ Upload Video ${idx + 1}`,
            onAction: () => seedanceVideoRefs[idx]?.current?.click()
          });
        }
      });
      [0, 1, 2].forEach(idx => {
        const tag = `@audio${idx + 1}`;
        if (promptStr.includes(tag) && !seedanceAudios[idx]) {
          missingWarnings.push({
            id: `warn_s_aud_${idx}`,
            tag,
            message: `${tag} tagged in prompt, but slot is empty!`,
            actionLabel: `+ Upload Audio ${idx + 1}`,
            onAction: () => seedanceAudioRefs[idx]?.current?.click()
          });
        }
      });
    } else {
      if ((promptStr.includes('<LAST_FRAME>') || promptStr.includes('@LAST_FRAME') || promptStr.includes('@<LAST_FRAME>')) && !lastPreview) {
        missingWarnings.push({
          id: 'warn_last',
          tag: '@LAST_FRAME',
          message: '@LAST_FRAME tagged in prompt, but End Frame image is not attached!',
          actionLabel: '+ Attach End Frame',
          onAction: () => endFrameInputRef.current?.click()
        });
      }
      if ((promptStr.includes('<FIRST_FRAME>') || promptStr.includes('@FIRST_FRAME') || promptStr.includes('@<FIRST_FRAME>')) && !firstPreview) {
        missingWarnings.push({
          id: 'warn_first',
          tag: '@FIRST_FRAME',
          message: '@FIRST_FRAME tagged in prompt, but Start Frame image is not attached!',
          actionLabel: '+ Attach Start Frame',
          onAction: () => startFrameInputRef.current?.click()
        });
      }
      if (panelTab === 'omni-multi') {
        [0, 1, 2, 3].forEach(idx => {
          const tag = `@image${idx + 1}`;
          if (promptStr.includes(tag) && !omniMultiImages[idx]) {
            missingWarnings.push({
              id: `warn_img_${idx}`,
              tag,
              message: `${tag} tagged in prompt, but slot is empty!`,
              actionLabel: `+ Upload Image ${idx + 1}`,
              onAction: () => multiImageRefs[idx]?.current?.click()
            });
          }
        });
      }
    }

    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#c8f135]" />
            <span>Creative Scene Prompt</span>
          </label>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleVertexMcpEnhancePrompt}
              disabled={isMcpEnhancing}
              className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-[#c8f135]/20 to-emerald-500/20 hover:from-[#c8f135]/40 hover:to-emerald-500/40 border border-[#c8f135]/40 text-[#c8f135] hover:text-white text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-[0_0_10px_rgba(200,241,53,0.15)] disabled:opacity-50"
              title="Use Google Cloud Vertex AI Gemini MCP to expand into a production-ready cinematic prompt"
            >
              {isMcpEnhancing ? (
                <>
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-[#c8f135]" />
                  <span>MCP Expanding...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-2.5 h-2.5 text-[#c8f135]" />
                  <span>Gemini MCP</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleAstraWritePrompt}
              disabled={isAstraWriting}
              className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-violet-600/30 to-indigo-600/30 hover:from-violet-600/50 hover:to-indigo-600/50 border border-violet-500/40 text-violet-300 hover:text-white text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-[0_0_10px_rgba(139,92,246,0.2)] disabled:opacity-50"
              title="Use Astra (ChatGPT 6) to understand your complete scenario and write a cinematic prompt"
            >
              {isAstraWriting ? (
                <>
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  <span>Astra Writing...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-2.5 h-2.5 text-cyan-300" />
                  <span>Astra AI Write</span>
                </>
              )}
            </button>
            <span className="text-[9px] font-mono text-zinc-500 hidden sm:inline">
              Type <code className="text-[#c8f135]">@</code> to tag
            </span>
          </div>
        </div>

        {/* Autocomplete Popup */}
        {mentionSearch !== null && (
          <div className="bg-[#0e0e18]/98 border border-white/20 rounded-2xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-3xl max-h-56 overflow-y-auto custom-scrollbar z-30">
            {(() => {
              const query = (mentionSearch || '').trim().toLowerCase();
              const matched = availableMentionItems.filter(item => 
                !query || 
                (item.name && item.name.toLowerCase().includes(query)) || 
                (item.category && item.category.toLowerCase().includes(query))
              );

              if (matched.length === 0) {
                return (
                  <div className="p-3 text-center text-[10px] text-zinc-500 font-mono">
                    No reference items found
                  </div>
                );
              }

              return matched.map((item, idx) => (
                <button
                  key={item.id || idx}
                  type="button"
                  onClick={() => selectMention(item)}
                  className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-semibold flex items-center gap-2 hover:bg-white/[0.08] text-zinc-300 hover:text-white transition-all cursor-pointer"
                >
                  {item.imageUrl ? (
                    <img src={item.imageUrl} className="w-5 h-5 rounded object-cover border border-white/20" alt={item.name} />
                  ) : item.isVideo ? (
                    <Video className="w-4 h-4 text-cyan-400" />
                  ) : item.isAudio ? (
                    <Music className="w-4 h-4 text-amber-400" />
                  ) : null}
                  <span className="text-[#c8f135] font-mono text-[11px]">@{item.name}</span>
                  <span className="text-[9px] text-zinc-500">({item.category})</span>
                </button>
              ));
            })()}
          </div>
        )}

        {/* ── CLEAN RESPONSIVE PROMPT BOX (BIGGER & SPACIOUS) ── */}
        <div className="relative w-full rounded-2xl bg-black/50 border border-white/15 focus-within:border-[#c8f135]/70 transition-all overflow-hidden shadow-inner backdrop-blur-2xl group">
          <textarea
            ref={textareaRef}
            value={localPrompt}
            onChange={handlePromptChange}
            onSelect={updateCursorState}
            onKeyUp={updateCursorState}
            onMouseUp={updateCursorState}
            placeholder={placeholderText}
            rows={8}
            className="w-full bg-transparent p-4 text-xs text-white placeholder-zinc-500 outline-none resize-none custom-scrollbar leading-relaxed font-medium caret-[#c8f135] selection:bg-[#c8f135]/30 selection:text-white min-h-[190px] max-h-[420px]"
          />

          {/* Bottom Reference Status Bar */}
          <div className="px-3.5 py-1.5 bg-black/40 border-t border-white/5 flex items-center justify-between text-[9px] font-mono select-none">
            <div className="flex items-center gap-2 truncate">
              {lastPreview && (
                <span className="flex items-center gap-1 text-[#c8f135] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c8f135] animate-pulse" />
                  <span>End Frame Active</span>
                </span>
              )}
              {firstPreview && (
                <span className="flex items-center gap-1 text-cyan-300 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>Start Frame Active</span>
                </span>
              )}
              {!lastPreview && !firstPreview && (
                <span className="text-zinc-500 font-sans">
                  {panelTab === 'omni-multi' ? "Type @ to reference slots (@image1, @video1...)" : "Write your cinematic scene prompt"}
                </span>
              )}
            </div>
            <span className="text-zinc-500 shrink-0 font-medium">
              {localPrompt.length} chars
            </span>
          </div>
        </div>

        {/* Multi-Reference Quick Tag Helper Chips (Shown ONLY in omni-multi mode) */}
        {panelTab === 'omni-multi' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Quick Tags:</span>
            {[
              { label: '@image1', tag: '@image1', loaded: !!omniMultiImages[0] },
              { label: '@image2', tag: '@image2', loaded: !!omniMultiImages[1] },
              { label: '@image3', tag: '@image3', loaded: !!omniMultiImages[2] },
              { label: '@image4', tag: '@image4', loaded: !!omniMultiImages[3] },
              { label: '@video1', tag: '@video1', loaded: !!omniMultiVideos[0] },
              { label: '@video2', tag: '@video2', loaded: !!omniMultiVideos[1] },
              { label: '@video3', tag: '@video3', loaded: !!omniMultiVideos[2] },
            ].map((chip) => (
              <button
                key={chip.tag}
                type="button"
                onClick={() => insertTagAtCursor(chip.tag)}
                className={cn(
                  "px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold transition-all cursor-pointer border flex items-center gap-1",
                  chip.loaded
                    ? "bg-[#c8f135]/20 text-[#c8f135] border-[#c8f135]/50 hover:bg-[#c8f135]/30 shadow-[0_0_8px_rgba(200,241,53,0.2)]"
                    : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border-white/10"
                )}
              >
                {chip.loaded && <span className="w-1.5 h-1.5 rounded-full bg-[#c8f135] animate-pulse" />}
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const panelContent = (
    <div className={cn(
      "h-full bg-[#07070b]/95 backdrop-blur-3xl flex flex-col z-10 overflow-hidden",
      inlineMode
        ? "w-full border-r border-white/[0.08]"
        : "w-full md:w-[350px] lg:w-[370px] border-r border-white/[0.08] shadow-[20px_0_60px_rgba(0,0,0,0.8)]"
    )}>
      {/* 1. Header with ZeroLens Aesthetic */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-[#c8f135]/20 to-transparent border border-[#c8f135]/30 flex items-center justify-center shadow-[0_0_15px_rgba(200,241,53,0.15)]">
            <Sparkles className="w-3.5 h-3.5 text-[#c8f135]" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-black text-white tracking-tight uppercase flex items-center gap-1.5">
              Studio Generator
              <span className="text-[8.5px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-[#c8f135]/10 text-[#c8f135] border border-[#c8f135]/20">
                PRO
              </span>
            </h2>
            <p className="text-[9.5px] font-semibold text-zinc-400 uppercase tracking-wider">
              ZeroLens Cinema Engine v2.5
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setShowDocs(!showDocs)}
            className={cn(
              "p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white transition-all border border-transparent hover:border-white/10 hover:bg-white/[0.05]",
              showDocs && "bg-white/[0.08] text-[#c8f135] border-white/15"
            )}
            title="Omni 1.1 Docs"
          >
            <Info size={15} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="md:hidden flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/15 text-[#c8f135] text-xs font-black uppercase tracking-wider border border-white/15 cursor-pointer transition-all active:scale-95 min-h-[38px]"
            title="View Gallery"
          >
            <Film size={14} />
            <span>Gallery</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="hidden md:flex p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all border border-transparent hover:border-white/10 cursor-pointer"
            title="Close Panel"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 2. ZeroLens Mode Switcher Tabs (Text-only, scrollable, single-line) */}
      <div className="px-3 sm:px-4 py-2 border-b border-white/[0.08] bg-black/40 shrink-0">
        <div className="flex items-center gap-1 p-1 bg-black/60 rounded-2xl border border-white/[0.06] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setPanelTab('omni');
              setActiveTab('video');
              setActiveEngine('gemini-omni-1.1-flash-preview');
            }}
            className={cn(
              "flex-1 min-w-fit py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all text-center select-none cursor-pointer whitespace-nowrap shrink-0",
              panelTab === 'omni'
                ? "bg-gradient-to-r from-[#c8f135]/20 via-[#c8f135]/15 to-transparent text-[#c8f135] border border-[#c8f135]/40 shadow-[0_0_15px_rgba(200,241,53,0.15)] font-black"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
            )}
          >
            Omni
          </button>

          <button
            type="button"
            onClick={() => {
              setPanelTab('seedance');
              setActiveTab('video');
              const targetEngine = (seedanceSubModel === 'seedace' || seedanceSubModel === 'seedance-mini') ? seedanceSubModel : 'seedance-fast';
              setActiveEngine(targetEngine);
              if (targetEngine !== 'seedace' && (resolution === '1080p' || resolution === '4k')) {
                setResolution('720p');
              }
            }}
            className={cn(
              "flex-1 min-w-fit py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all text-center select-none cursor-pointer whitespace-nowrap shrink-0",
              panelTab === 'seedance'
                ? "bg-gradient-to-r from-[#c8f135]/20 via-[#c8f135]/15 to-transparent text-[#c8f135] border border-[#c8f135]/40 shadow-[0_0_15px_rgba(200,241,53,0.15)] font-black"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
            )}
          >
            Seedance
          </button>

          <button
            type="button"
            onClick={() => {
              setPanelTab('seedance-2.5');
              setActiveTab('video');
              setActiveEngine('seedance-2.5');
              if (duration < 10) setDuration(10);
              if (resolution === '4k') setResolution('1080p');
            }}
            className={cn(
              "flex-1 min-w-fit py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all text-center select-none cursor-pointer whitespace-nowrap shrink-0",
              panelTab === 'seedance-2.5'
                ? "bg-gradient-to-r from-[#c8f135]/20 via-[#c8f135]/15 to-transparent text-[#c8f135] border border-[#c8f135]/40 shadow-[0_0_15px_rgba(200,241,53,0.15)] font-black"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
            )}
          >
            Seedance 2.5
          </button>

          <button
            type="button"
            onClick={() => {
              setPanelTab('omni-multi');
              setActiveTab('video');
              setActiveEngine('gemini-omni-1.1-flash-preview');
            }}
            className={cn(
              "flex-1 min-w-fit py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all text-center select-none cursor-pointer whitespace-nowrap shrink-0",
              panelTab === 'omni-multi'
                ? "bg-gradient-to-r from-[#c8f135]/20 via-[#c8f135]/15 to-transparent text-[#c8f135] border border-[#c8f135]/40 shadow-[0_0_15px_rgba(200,241,53,0.15)] font-black"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
            )}
          >
            Multi-Ref
          </button>

          <button
            type="button"
            onClick={() => {
              setPanelTab('motion');
              setActiveTab('video');
              setActiveEngine('kling-motion');
            }}
            className={cn(
              "flex-1 min-w-fit py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all text-center select-none cursor-pointer whitespace-nowrap shrink-0",
              panelTab === 'motion'
                ? "bg-gradient-to-r from-[#c8f135]/20 via-[#c8f135]/15 to-transparent text-[#c8f135] border border-[#c8f135]/40 shadow-[0_0_15px_rgba(200,241,53,0.15)] font-black"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
            )}
          >
            Motion
          </button>
        </div>
      </div>

      {/* Hidden Inputs for Keyframes & References */}
      <input
        type="file"
        ref={startFrameInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleStartFrameSelect}
      />
      <input
        type="file"
        ref={endFrameInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleEndFrameSelect}
      />
      <input
        type="file"
        ref={videoInputRef}
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={handleVideoSelect}
      />
      <input
        type="file"
        ref={motionImageInputRef}
        accept="image/jpeg,image/png,image/jpg,image/webp"
        className="hidden"
        onChange={handleMotionSubjectSelect}
      />
      <input
        type="file"
        ref={motionVideoInputRef}
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={handleMotionVideoSelect}
      />

      {/* Seedance Dedicated Hidden Inputs */}
      <input
        type="file"
        ref={seedanceFirstFrameInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleSeedanceFirstFrameSelect}
      />
      <input
        type="file"
        ref={seedanceLastFrameInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleSeedanceLastFrameSelect}
      />
      {Array.from({ length: 30 }, (_, idx) => (
        <input
          key={`s_img_inp_${idx}`}
          type="file"
          ref={(el) => { if (seedanceImageRefs[idx]) seedanceImageRefs[idx].current = el; }}
          accept="image/*"
          className="hidden"
          onChange={(e) => handleSeedanceImageSelect(e, idx)}
        />
      ))}
      {[0, 1, 2].map(idx => (
        <input
          key={`s_vid_inp_${idx}`}
          type="file"
          ref={seedanceVideoRefs[idx]}
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => handleSeedanceVideoSelect(e, idx)}
        />
      ))}
      {[0, 1, 2].map(idx => (
        <input
          key={`s_aud_inp_${idx}`}
          type="file"
          ref={seedanceAudioRefs[idx]}
          accept="audio/mp3,audio/wav,audio/aac,audio/m4a,audio/ogg,audio/*"
          className="hidden"
          onChange={(e) => handleSeedanceAudioSelect(e, idx)}
        />
      ))}

            {/* 3. Main Scrollable Controls Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-4 space-y-3.5 pb-28 sm:pb-32">
              
              {/* Optional Collapsible Docs Card */}
              {showDocs && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl space-y-1.5 text-xs text-zinc-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white uppercase tracking-wider text-[10.5px] flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-[#c8f135]" /> Multimodal Video Modes
                    </span>
                    <button onClick={() => setShowDocs(false)} className="text-zinc-500 hover:text-white">
                      <X size={13} />
                    </button>
                  </div>
                  <p className="text-[10.5px] text-zinc-400 leading-relaxed">
                    Trained on multimodal references. You can feed up to 3 driving reference videos, start/end frames, and 5 image references simultaneously.
                  </p>
                  <div className="grid grid-cols-2 gap-1 pt-0.5">
                    <span className="bg-black/40 p-1.5 rounded-lg border border-white/5 font-mono text-[9px]">
                      <strong>Text-to-Video:</strong> Pure prompt
                    </span>
                    <span className="bg-black/40 p-1.5 rounded-lg border border-white/5 font-mono text-[9px]">
                      <strong>Image-to-Video:</strong> Animate 1st frame
                    </span>
                    <span className="bg-black/40 p-1.5 rounded-lg border border-white/5 font-mono text-[9px]">
                      <strong>Reference Video:</strong> Drive motion
                    </span>
                    <span className="bg-black/40 p-1.5 rounded-lg border border-white/5 font-mono text-[9px]">
                      <strong>Video Edit:</strong> Natural language
                    </span>
                  </div>
                </motion.div>
              )}

              {/* SECTION A: MEDIA CONDITIONING & SCENE DIRECTING */}
              <div className="space-y-3">
                {(panelTab === 'seedance' || panelTab === 'seedance-2.5') ? (
                  /* ── SLEEK SEEDANCE 2.0 / 2.5 INTERFACE (Dynamic Multimodal Dock + Direct Prompt Box) ── */
                  <div className="space-y-3.5">
                    {/* Dynamic Reference Gallery Dock (Grows as user adds images/videos/audios/keyframes) */}
                    <div className={cn("space-y-2.5 p-3 rounded-2xl bg-black/40 border border-white/[0.08] backdrop-blur-xl relative transition-all", seedanceAddMenuOpen ? "z-30" : "z-10")}>
                      <div className="flex items-center justify-between pb-1 border-b border-white/5">
                        <span className="text-[9.5px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-[#c8f135]" />
                          <span>{panelTab === 'seedance-2.5' ? 'Seedance 2.5 Multimodal References' : 'Reference Assets'}</span>
                        </span>
                        <span className="text-[8.5px] font-mono text-zinc-500">
                          {activeSeedanceItems.length > 0 ? `${activeSeedanceItems.length} Loaded` : 'Optional'} · Max {panelTab === 'seedance-2.5' ? '30 Images' : '9 Images'}
                        </span>
                      </div>

                      {/* Growing Row of Squircle Thumbnails (Auto-compacts when more items added) */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {activeSeedanceItems.map((item) => {
                          const isCompact = activeSeedanceItems.length > 8;
                          const isMicro = activeSeedanceItems.length > 16;
                          const sizeClass = isMicro
                            ? "w-9 h-9 sm:w-10 sm:h-10 rounded-lg text-[6.5px]"
                            : isCompact
                            ? "w-11 h-11 sm:w-12 sm:h-12 rounded-xl text-[7px]"
                            : "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl text-[7.5px]";

                          return (
                            <div
                              key={item.id}
                              className={cn(
                                "relative group overflow-hidden border border-white/20 bg-black/70 shadow-md flex items-center justify-center shrink-0 cursor-pointer transition-all",
                                sizeClass
                              )}
                              onClick={() => insertTagAtCursor(item.tag)}
                              title={`Click to insert ${item.tag} into prompt`}
                            >
                              {item.type === 'video' ? (
                                <div className="relative w-full h-full">
                                  <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                                  <div className="absolute top-0.5 left-0.5 p-0.5 rounded bg-black/70 text-cyan-400">
                                    <Video size={8} />
                                  </div>
                                </div>
                              ) : item.type === 'audio' ? (
                                <div className="flex flex-col items-center justify-center w-full h-full bg-emerald-950/40 p-1">
                                  <Music size={14} className="text-emerald-400 animate-pulse" />
                                </div>
                              ) : (
                                <img src={item.url} alt={item.label} className="w-full h-full object-cover" />
                              )}

                              {/* Hover Delete Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  item.onRemove();
                                }}
                                className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/85 text-zinc-400 hover:text-white hover:bg-rose-600 transition-all opacity-0 group-hover:opacity-100 z-10 shadow-sm cursor-pointer"
                                title={`Remove ${item.tag}`}
                              >
                                <X size={9} />
                              </button>

                              {/* Tag Pill */}
                              <div className="absolute inset-x-0.5 bottom-0.5 py-0.2 px-0.5 rounded bg-black/80 font-mono font-bold text-center text-[#c8f135] truncate border border-white/10 text-[7px]">
                                {item.tag}
                              </div>
                            </div>
                          );
                        })}

                        {/* The (+) Add Asset Button */}
                        {activeSeedanceItems.length < (panelTab === 'seedance-2.5' ? 38 : 17) && (
                          <div className="relative z-40">
                            <button
                              type="button"
                              onClick={() => setSeedanceAddMenuOpen(!seedanceAddMenuOpen)}
                              className={cn(
                                "border border-dashed border-white/20 hover:border-[#c8f135]/80 bg-white/[0.02] hover:bg-white/[0.06] flex flex-col items-center justify-center gap-0.5 text-zinc-400 hover:text-white transition-all cursor-pointer shrink-0 group",
                                activeSeedanceItems.length > 16
                                  ? "w-9 h-9 sm:w-10 sm:h-10 rounded-lg"
                                  : activeSeedanceItems.length > 8
                                  ? "w-11 h-11 sm:w-12 sm:h-12 rounded-xl"
                                  : "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl"
                              )}
                              title="Add Reference Asset"
                            >
                              <div className="w-5 h-5 rounded-full bg-white/[0.06] group-hover:bg-[#c8f135]/20 border border-white/10 group-hover:border-[#c8f135]/40 flex items-center justify-center transition-all">
                                <Plus size={12} className="text-zinc-400 group-hover:text-[#c8f135]" />
                              </div>
                            </button>

                            {/* Dropdown Menu when (+) is clicked */}
                            {seedanceAddMenuOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setSeedanceAddMenuOpen(false)}
                                />
                                <div className="absolute left-0 top-full mt-2 z-50 w-60 bg-[#0d0d16] border border-white/20 rounded-2xl p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSeedanceAddMenuOpen(false);
                                      const maxImages = panelTab === 'seedance-2.5' ? 30 : 9;
                                      const emptyIdx = seedanceImages.findIndex((img, i) => i < maxImages && !img);
                                      if (emptyIdx !== -1) seedanceImageRefs[emptyIdx]?.current?.click();
                                    }}
                                    className="w-full px-2 py-1.5 rounded-xl text-left text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/[0.08] flex items-center gap-2 transition-all cursor-pointer"
                                  >
                                    <ImageIcon size={13} className="text-amber-400" />
                                    <span>Upload Image ({seedanceImages.filter(Boolean).length}/{panelTab === 'seedance-2.5' ? 30 : 9})</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSeedanceAddMenuOpen(false);
                                      const maxImages = panelTab === 'seedance-2.5' ? 30 : 9;
                                      const emptyIdx = seedanceImages.findIndex((img, i) => i < maxImages && !img);
                                      setGalleryPickerSlot({ type: 'seedance_image', slotIdx: emptyIdx !== -1 ? emptyIdx : 0 });
                                    }}
                                    className="w-full px-2 py-1.5 rounded-xl text-left text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/[0.08] flex items-center gap-2 transition-all cursor-pointer"
                                  >
                                    <Film size={13} className="text-amber-400" />
                                    <span>Image from Gallery</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSeedanceAddMenuOpen(false);
                                      const emptyIdx = seedanceVideos.findIndex(v => !v);
                                      if (emptyIdx !== -1) seedanceVideoRefs[emptyIdx]?.current?.click();
                                    }}
                                    className="w-full px-2 py-1.5 rounded-xl text-left text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/[0.08] flex items-center gap-2 transition-all cursor-pointer"
                                  >
                                    <Video size={13} className="text-cyan-400" />
                                    <span>Upload Driving Video (2-15s)</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSeedanceAddMenuOpen(false);
                                      const emptyIdx = seedanceVideos.findIndex(v => !v);
                                      setGalleryPickerSlot({ type: 'seedance_video', slotIdx: emptyIdx !== -1 ? emptyIdx : 0 });
                                    }}
                                    className="w-full px-2 py-1.5 rounded-xl text-left text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/[0.08] flex items-center gap-2 transition-all cursor-pointer"
                                  >
                                    <Film size={13} className="text-cyan-400" />
                                    <span>Video from Gallery</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSeedanceAddMenuOpen(false);
                                      const emptyIdx = seedanceAudios.findIndex(a => !a);
                                      if (emptyIdx !== -1) seedanceAudioRefs[emptyIdx]?.current?.click();
                                    }}
                                    className="w-full px-2 py-1.5 rounded-xl text-left text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/[0.08] flex items-center gap-2 transition-all cursor-pointer"
                                  >
                                    <Music size={13} className="text-emerald-400" />
                                    <span>Upload Audio Track (2-15s)</span>
                                  </button>
                                  <div className="h-px bg-white/10 my-1" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSeedanceAddMenuOpen(false);
                                      seedanceFirstFrameInputRef.current?.click();
                                    }}
                                    className="w-full px-2 py-1.5 rounded-xl text-left text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/[0.08] flex items-center gap-2 transition-all cursor-pointer"
                                  >
                                    <Upload size={13} className="text-cyan-400" />
                                    <span>Upload Start Frame</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSeedanceAddMenuOpen(false);
                                      seedanceLastFrameInputRef.current?.click();
                                    }}
                                    className="w-full px-2 py-1.5 rounded-xl text-left text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/[0.08] flex items-center gap-2 transition-all cursor-pointer"
                                  >
                                    <Upload size={13} className="text-[#c8f135]" />
                                    <span>Upload End Frame</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Dedicated Expanded Audio References Row */}
                      {seedanceAudios.some(Boolean) && (
                        <div className="pt-2 border-t border-white/5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                              <Music size={11} /> Audio References ({seedanceAudios.filter(Boolean).length}/3)
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {seedanceAudios.map((audUrl, idx) => {
                              if (!audUrl) return null;
                              return (
                                <div key={`audio_preview_${idx}`} className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => insertTagAtCursor(`@audio${idx + 1}`)}
                                      className="px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-mono text-[9px] font-bold cursor-pointer shrink-0"
                                      title="Insert tag into prompt"
                                    >
                                      @audio{idx + 1}
                                    </button>
                                    <span className="text-zinc-300 text-[10px] truncate">Audio Track {idx + 1}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <audio src={audUrl} controls className="h-6 w-32 scale-90" />
                                    <button
                                      type="button"
                                      onClick={() => handleClearSeedanceAudio(idx)}
                                      className="p-1 rounded-lg hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                                      title="Remove Audio"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Dedicated Clean Prompt Box (Matches user screenshot) */}
                    <div className="space-y-2 p-3 rounded-2xl bg-black/40 border border-white/[0.08] backdrop-blur-xl relative z-0">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                          Prompt
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleVertexMcpEnhancePrompt}
                            disabled={isMcpEnhancing}
                            className="px-2 py-0.5 rounded-lg bg-[#c8f135]/15 hover:bg-[#c8f135]/25 border border-[#c8f135]/40 text-[#c8f135] text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                            title="Enhance with Gemini MCP"
                          >
                            <Sparkles size={10} />
                            <span>Gemini MCP</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleAstraWritePrompt}
                            disabled={isAstraWriting}
                            className="px-2 py-0.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/35 border border-violet-500/40 text-violet-300 text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                            title="Craft with Astra AI"
                          >
                            <Wand2 size={10} />
                            <span>Astra AI</span>
                          </button>
                        </div>
                      </div>

                      <div className="relative w-full rounded-xl bg-black/60 border border-white/10 focus-within:border-[#c8f135]/70 transition-all p-3 space-y-2.5">
                        <textarea
                          ref={textareaRef}
                          value={localPrompt}
                          onChange={handlePromptChange}
                          placeholder="Describe your scene in detail. Use @ to reference assets"
                          rows={8}
                          className="w-full bg-transparent text-xs text-white placeholder-zinc-500 outline-none resize-none custom-scrollbar leading-relaxed font-medium caret-[#c8f135] min-h-[190px] max-h-[420px]"
                        />

                        {/* Bottom Inner Prompt Row: [@ Elements] [🔊 Sound Toggle] */}
                        <div className="pt-2 flex items-center justify-between border-t border-white/5 select-none">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => insertTagAtCursor('@')}
                              className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-zinc-300 hover:text-white text-[10px] font-black flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                              title="Insert @ reference tag"
                            >
                              <span className="text-[#c8f135] font-mono font-bold">@</span>
                              <span>Elements</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setGenerateAudio(!generateAudio)}
                              className={cn(
                                "px-2.5 py-1 rounded-xl border text-[10px] font-black flex items-center gap-1.5 cursor-pointer transition-all active:scale-95",
                                generateAudio
                                  ? "bg-[#c8f135]/20 text-[#c8f135] border-[#c8f135]/50 shadow-[0_0_10px_rgba(200,241,53,0.2)]"
                                  : "bg-white/[0.04] text-zinc-400 border-white/10 hover:text-white"
                              )}
                              title={generateAudio ? "Sound Effects ON" : "Sound Effects Muted"}
                            >
                              {generateAudio ? <Volume2 size={12} className="text-[#c8f135]" /> : <VolumeX size={12} />}
                              <span>{generateAudio ? 'On' : 'Off'}</span>
                            </button>
                          </div>

                          <span className="text-[9px] font-mono text-zinc-500">
                            {localPrompt.length} chars
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : panelTab === 'omni-multi' ? (
                  /* DEDICATED MULTI-REFERENCE INTERFACE (4 Image Slots + 3 Video Slots) */
                  <div className="space-y-3">
                    {/* 4 Image Reference Slots - Sleek Single-Row Cards */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[9.5px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                          <ImageIcon className="w-3 h-3 text-[#c8f135]" />
                          <span>Image References (4 Slots)</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                          {gallery.some(i => i.type === 'image' || (!i.type && !i.url?.includes('.mp4'))) && (
                            <button
                              type="button"
                              onClick={() => {
                                const emptySlot = omniMultiImages.findIndex(img => !img);
                                setGalleryPickerSlot({ type: 'image', slotIdx: emptySlot !== -1 ? emptySlot : 0 });
                              }}
                              className="text-[8px] font-bold text-[#c8f135] bg-[#c8f135]/10 hover:bg-[#c8f135]/20 border border-[#c8f135]/25 px-1.5 py-0.2 rounded transition-all cursor-pointer"
                            >
                              + Gallery
                            </button>
                          )}
                          <span className="text-[8.5px] font-mono text-zinc-500">Auto-tagged</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[0, 1, 2, 3].map((slotIdx) => {
                          const imgUrl = omniMultiImages[slotIdx];
                          const tag = `@image${slotIdx + 1}`;
                          return (
                            <div key={slotIdx} className="space-y-0.5">
                              {imgUrl ? (
                                <div className="relative group rounded-xl overflow-hidden border border-[#c8f135]/50 aspect-square bg-black/60 shadow-inner flex items-center justify-center">
                                  <img src={imgUrl} className="w-full h-full object-cover" alt={`Ref ${slotIdx + 1}`} />
                                  <button
                                    type="button"
                                    onClick={() => handleClearMultiImage(slotIdx)}
                                    className="absolute top-0.5 right-0.5 p-0.5 rounded-md bg-black/80 text-zinc-300 hover:text-white hover:bg-rose-600 transition-all cursor-pointer opacity-0 group-hover:opacity-100 z-10 shadow-sm"
                                    title={`Remove ${tag}`}
                                  >
                                    <Trash2 size={9} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => insertTagAtCursor(tag)}
                                    className="absolute bottom-0.5 inset-x-0.5 py-0.2 px-0.5 rounded bg-black/85 text-[#c8f135] hover:bg-[#c8f135] hover:text-black transition-all border border-[#c8f135]/30 text-[7.5px] font-mono font-black text-center truncate cursor-pointer shadow-sm"
                                    title={`Click to insert ${tag} into prompt`}
                                  >
                                    {tag}
                                  </button>
                                </div>
                              ) : (
                                <div className="w-full aspect-square rounded-xl border border-dashed border-white/15 hover:border-[#c8f135]/60 bg-white/[0.02] hover:bg-[#c8f135]/[0.04] transition-all flex flex-col items-center justify-center gap-0.5 text-zinc-500 hover:text-white p-0.5 relative group">
                                  <button
                                    type="button"
                                    onClick={() => multiImageRefs[slotIdx]?.current?.click()}
                                    className="flex flex-col items-center justify-center gap-0.5 w-full h-full cursor-pointer"
                                  >
                                    <div className="w-4 h-4 rounded-md bg-white/[0.04] group-hover:bg-[#c8f135]/15 border border-white/10 group-hover:border-[#c8f135]/30 flex items-center justify-center transition-all">
                                      <Upload size={9} className="text-zinc-400 group-hover:text-[#c8f135]" />
                                    </div>
                                    <span className="text-[7.5px] font-mono font-bold text-zinc-400 group-hover:text-[#c8f135] truncate">
                                      {tag}
                                    </span>
                                  </button>
                                  {gallery.some(i => i.type === 'image' || (!i.type && !i.url?.includes('.mp4'))) && (
                                    <button
                                      type="button"
                                      onClick={() => setGalleryPickerSlot({ type: 'image', slotIdx })}
                                      className="absolute top-0.5 right-0.5 px-0.5 py-0.2 rounded bg-black/80 hover:bg-[#c8f135] text-zinc-400 hover:text-black border border-white/10 text-[6.5px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm"
                                      title="Pick from Studio Gallery"
                                    >
                                      Gal
                                    </button>
                                  )}
                                </div>
                              )}
                              <input
                                type="file"
                                ref={multiImageRefs[slotIdx]}
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleMultiImageSelect(e, slotIdx)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3 Driving Video Reference Slots - Sleek Single-Row Cards */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[9.5px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                          <Video className="w-3 h-3 text-[#c8f135]" />
                          <span>Video References (3 Slots)</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                          {gallery.some(i => i.type === 'video' || i.url?.includes('.mp4')) && (
                            <button
                              type="button"
                              onClick={() => {
                                const emptySlot = omniMultiVideos.findIndex(v => !v);
                                setGalleryPickerSlot({ type: 'video', slotIdx: emptySlot !== -1 ? emptySlot : 0 });
                              }}
                              className="text-[8px] font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 px-1.5 py-0.2 rounded transition-all cursor-pointer"
                            >
                              + Gallery
                            </button>
                          )}
                          <span className="text-[8.5px] font-mono text-zinc-500">Max 10s MP4</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[0, 1, 2].map((slotIdx) => {
                          const vidUrl = omniMultiVideos[slotIdx];
                          const tag = `@video${slotIdx + 1}`;
                          return (
                            <div key={slotIdx} className="space-y-0.5">
                              {vidUrl ? (
                                <div className="relative group rounded-xl overflow-hidden border border-[#c8f135]/50 aspect-[4/3] bg-black/60 shadow-inner flex items-center justify-center">
                                  <video src={vidUrl} className="w-full h-full object-cover" muted loop playsInline />
                                  <button
                                    type="button"
                                    onClick={() => handleClearMultiVideo(slotIdx)}
                                    className="absolute top-0.5 right-0.5 p-0.5 rounded-md bg-black/80 text-white hover:bg-rose-600 transition-all cursor-pointer opacity-0 group-hover:opacity-100 z-10 shadow-sm"
                                    title={`Remove ${tag}`}
                                  >
                                    <Trash2 size={9} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => insertTagAtCursor(tag)}
                                    className="absolute bottom-0.5 inset-x-0.5 py-0.2 px-0.5 rounded bg-black/85 text-[#c8f135] hover:bg-[#c8f135] hover:text-black transition-all border border-[#c8f135]/30 text-[7.5px] font-mono font-black text-center truncate cursor-pointer shadow-sm"
                                    title={`Click to insert ${tag} into prompt`}
                                  >
                                    {tag}
                                  </button>
                                </div>
                              ) : (
                                <div className="w-full aspect-[4/3] rounded-xl border border-dashed border-white/15 hover:border-[#c8f135]/60 bg-white/[0.02] hover:bg-[#c8f135]/[0.04] transition-all flex flex-col items-center justify-center gap-0.5 text-zinc-500 hover:text-white p-0.5 relative group">
                                  <button
                                    type="button"
                                    onClick={() => multiVideoRefs[slotIdx]?.current?.click()}
                                    className="flex flex-col items-center justify-center gap-0.5 w-full h-full cursor-pointer"
                                  >
                                    <div className="w-4 h-4 rounded-md bg-white/[0.04] group-hover:bg-[#c8f135]/15 border border-white/10 group-hover:border-[#c8f135]/30 flex items-center justify-center transition-all">
                                      <Video size={9} className="text-zinc-400 group-hover:text-[#c8f135]" />
                                    </div>
                                    <span className="text-[7.5px] font-mono font-bold text-zinc-400 group-hover:text-[#c8f135] truncate">
                                      {tag}
                                    </span>
                                  </button>
                                  {gallery.some(i => i.type === 'video' || i.url?.includes('.mp4')) && (
                                    <button
                                      type="button"
                                      onClick={() => setGalleryPickerSlot({ type: 'video', slotIdx })}
                                      className="absolute top-0.5 right-0.5 px-0.5 py-0.2 rounded bg-black/80 hover:bg-cyan-400 text-zinc-400 hover:text-black border border-white/10 text-[6.5px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm"
                                      title="Pick from Studio Gallery"
                                    >
                                      Gal
                                    </button>
                                  )}
                                </div>
                              )}
                              <input
                                type="file"
                                ref={multiVideoRefs[slotIdx]}
                                accept="video/mp4,video/webm,video/quicktime"
                                className="hidden"
                                onChange={(e) => handleMultiVideoSelect(e, slotIdx)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Multi-Ref Prompt Studio */}
                    {renderPromptStudio("Direct with references! E.g.: '@image1 character walks past @image2 while matching camera motion of @video1, 4k 60fps'")}
                  </div>
                ) : panelTab === 'motion' ? (
                  /* ── MOTION CONTROL FLOW ── */
                  <div className="space-y-3">
                    {/* Side-by-side Subject Image & Motion Pattern Video */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Left: Subject Reference Image */}
                      <div className="space-y-1 flex flex-col min-w-0">
                        <div className="flex items-center justify-between h-4">
                          <label className="text-[9px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1 truncate">
                            <ImageIcon className="w-2.5 h-2.5 text-[#c8f135] shrink-0" />
                            <span className="truncate">Subject</span>
                          </label>
                          <div className="flex items-center gap-1 shrink-0">
                            {gallery.some(i => i.type === 'image' || (!i.type && !i.url?.includes('.mp4'))) && (
                              <button
                                type="button"
                                onClick={() => setGalleryPickerSlot({ type: 'motion_subject' })}
                                className="text-[7.5px] font-bold text-[#c8f135] bg-[#c8f135]/10 hover:bg-[#c8f135]/20 border border-[#c8f135]/25 px-1 py-0.2 rounded transition-all cursor-pointer"
                                title="Pick from Gallery"
                              >
                                Gal
                              </button>
                            )}
                            {(motionSubjectPreview || motionSubjectImage) && (
                              <button
                                type="button"
                                onClick={handleClearMotionSubject}
                                className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded transition-colors cursor-pointer"
                                title="Remove Subject Image"
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>
                        </div>

                        {(motionSubjectPreview || motionSubjectImage) ? (
                          <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-black/70 border border-[#c8f135]/40 relative group shadow-inner flex items-center justify-center">
                            <img
                              src={motionSubjectPreview || motionSubjectImage}
                              alt="Subject Reference"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all gap-1 backdrop-blur-[2px]">
                              <button
                                type="button"
                                onClick={() => motionImageInputRef.current?.click()}
                                className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 text-white rounded text-[8.5px] font-bold uppercase tracking-wider cursor-pointer"
                              >
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={handleClearMotionSubject}
                                className="px-1.5 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded text-[8.5px] font-bold uppercase tracking-wider cursor-pointer"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => motionImageInputRef.current?.click()}
                            className="aspect-[4/3] w-full rounded-xl border border-dashed border-white/15 hover:border-[#c8f135]/60 bg-white/[0.01] hover:bg-[#c8f135]/[0.04] transition-all flex flex-col items-center justify-center gap-0.5 text-zinc-500 hover:text-[#c8f135] p-1.5 cursor-pointer select-none group"
                          >
                            {isUploadingMotionImage ? (
                              <Loader2 size={14} className="text-[#c8f135] animate-spin" />
                            ) : (
                              <Upload size={14} className="text-zinc-400 group-hover:text-[#c8f135] transition-colors" />
                            )}
                            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-300 group-hover:text-white">Subject Img</span>
                            <span className="text-[7px] text-zinc-500 font-mono">Max 10MB</span>
                          </button>
                        )}
                      </div>

                      {/* Right: Motion Pattern Video (Driver) */}
                      <div className="space-y-1 flex flex-col min-w-0">
                        <div className="flex items-center justify-between h-4">
                          <label className="text-[9px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1 truncate">
                            <Film className="w-2.5 h-2.5 text-[#c8f135] shrink-0" />
                            <span className="truncate">Driver Vid</span>
                          </label>
                          <div className="flex items-center gap-1 shrink-0">
                            {gallery.some(i => i.type === 'video' || i.url?.includes('.mp4')) && (
                              <button
                                type="button"
                                onClick={() => setGalleryPickerSlot({ type: 'motion_video' })}
                                className="text-[7.5px] font-bold text-[#c8f135] bg-[#c8f135]/10 hover:bg-[#c8f135]/20 border border-[#c8f135]/25 px-1 py-0.2 rounded transition-all cursor-pointer"
                                title="Pick from Gallery"
                              >
                                Gal
                              </button>
                            )}
                            {(motionRefVideoPreview || motionRefVideo) && (
                              <button
                                type="button"
                                onClick={handleClearMotionVideo}
                                className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded transition-colors cursor-pointer"
                                title="Remove Motion Video"
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>
                        </div>

                        {(motionRefVideoPreview || motionRefVideo) ? (
                          <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-black/70 border border-[#c8f135]/40 relative group shadow-inner flex items-center justify-center">
                            <video
                              src={motionRefVideoPreview || motionRefVideo}
                              className="w-full h-full object-cover"
                              controls
                              playsInline
                            />
                            <div className="absolute top-1 right-1 bg-black/85 backdrop-blur-md border border-[#c8f135]/30 px-1 py-0.2 rounded text-[7.5px] font-mono text-[#c8f135] font-bold z-10 pointer-events-none shadow-md">
                              {motionRefVideoDuration ? `${motionRefVideoDuration}s` : 'Loaded'}
                            </div>
                            <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all gap-1 backdrop-blur-[2px] pointer-events-none">
                              <button
                                type="button"
                                onClick={() => motionVideoInputRef.current?.click()}
                                className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 text-white rounded text-[8.5px] font-bold uppercase tracking-wider cursor-pointer pointer-events-auto"
                              >
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={handleClearMotionVideo}
                                className="px-1.5 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded text-[8.5px] font-bold uppercase tracking-wider cursor-pointer pointer-events-auto"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => motionVideoInputRef.current?.click()}
                            className="aspect-[4/3] w-full rounded-xl border border-dashed border-white/15 hover:border-[#c8f135]/60 bg-white/[0.01] hover:bg-[#c8f135]/[0.04] transition-all flex flex-col items-center justify-center gap-0.5 text-zinc-500 hover:text-[#c8f135] p-1.5 cursor-pointer select-none group"
                          >
                            {isUploadingMotionVideo ? (
                              <Loader2 size={14} className="text-[#c8f135] animate-spin" />
                            ) : (
                              <Upload size={14} className="text-zinc-400 group-hover:text-[#c8f135] transition-colors" />
                            )}
                            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-300 group-hover:text-white">Driver Vid</span>
                            <span className="text-[7px] text-zinc-500 font-mono">3–30s MP4</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* API File Requirements Spec */}
                    <div className="flex items-center justify-between px-2 py-1 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[8px] text-zinc-400 font-medium select-none">
                      <div className="flex items-center gap-1 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#c8f135] shrink-0" />
                        <span className="truncate">Clear head & torso · Ratio 2:5 to 5:2</span>
                      </div>
                      <span className="text-zinc-500 font-mono shrink-0 pl-1 text-[7.5px]">1 Img + 1 Vid</span>
                    </div>

                    {/* Creative Text Prompt Guidance */}
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-[#c8f135]" />
                        <span>Prompt Guidance (Optional)</span>
                      </label>
                      <textarea
                        value={localPrompt}
                        onChange={handlePromptChange}
                        placeholder="No distortion, the character's movements are consistent with the video."
                        rows={2}
                        className="w-full bg-black/50 border border-white/15 focus:border-[#c8f135]/60 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 outline-none resize-none custom-scrollbar leading-relaxed font-medium backdrop-blur-2xl transition-all"
                      />
                    </div>

                    {/* Motion Parameters */}
                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-2.5">
                      <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                        <span className="text-[9.5px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                          <Sliders className="w-3 h-3 text-[#c8f135]" />
                          <span>Motion Parameters</span>
                        </span>
                      </div>

                      {/* Quality Mode */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[8.5px] font-bold uppercase tracking-wider text-zinc-400">Quality Mode</label>
                          <span className="text-[8px] font-mono text-zinc-500">
                            {(motionMode === 'pro' || motionMode === '1080p') ? '1080p · 9 cr/s' : '720p · 7 cr/s'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setMotionMode('720p')}
                            className={cn(
                              "py-1.5 px-2 rounded-xl text-[9.5px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-1",
                              (motionMode === 'std' || motionMode === '720p')
                                ? "bg-[#c8f135]/15 text-[#c8f135] border-[#c8f135]/50 shadow-[0_0_12px_rgba(200,241,53,0.15)] font-extrabold"
                                : "border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
                            )}
                          >
                            Standard (720p)
                          </button>
                          <button
                            type="button"
                            onClick={() => setMotionMode('1080p')}
                            className={cn(
                              "py-1.5 px-2 rounded-xl text-[9.5px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-1",
                              (motionMode === 'pro' || motionMode === '1080p')
                                ? "bg-[#c8f135]/15 text-[#c8f135] border-[#c8f135]/50 shadow-[0_0_12px_rgba(200,241,53,0.15)] font-extrabold"
                                : "border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
                            )}
                          >
                            Pro (1080p)
                          </button>
                        </div>
                      </div>

                      {/* Character Orientation */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[8.5px] font-bold uppercase tracking-wider text-zinc-400">Orientation</label>
                          <span className="text-[8px] font-mono text-zinc-500">
                            {characterOrientation === 'video' ? 'Driver Match' : 'Image Pose'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setCharacterOrientation('video')}
                            className={cn(
                              "py-1.5 px-2 rounded-xl text-[9.5px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-1",
                              characterOrientation === 'video'
                                ? "bg-[#c8f135]/15 text-[#c8f135] border-[#c8f135]/50 shadow-[0_0_12px_rgba(200,241,53,0.15)] font-extrabold"
                                : "border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
                            )}
                          >
                            Video Match (30s)
                          </button>
                          <button
                            type="button"
                            onClick={() => setCharacterOrientation('image')}
                            className={cn(
                              "py-1.5 px-2 rounded-xl text-[9.5px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-1",
                              characterOrientation === 'image'
                                ? "bg-[#c8f135]/15 text-[#c8f135] border-[#c8f135]/50 shadow-[0_0_12px_rgba(200,241,53,0.15)] font-extrabold"
                                : "border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
                            )}
                          >
                            Image Pose (10s)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* DIRECTING FLOW: Keyframe Conditioning + Prompt Studio + Driving Video Reference */
                  <div className="space-y-3">
                    {/* KEYFRAME CONDITIONING (START FRAME & END FRAME) - OMNI & VEO 3.1 */}
                    {(panelTab === 'omni' || panelTab === 'veo') && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[9.5px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                            <ImageIcon className="w-3 h-3 text-[#c8f135]" />
                            <span>Keyframe Conditioning</span>
                          </label>
                          <span className="text-[8.5px] font-mono text-[#c8f135]/90 bg-[#c8f135]/10 px-1.5 py-0.2 rounded border border-[#c8f135]/20 font-bold">
                            Start (0s) → End ({duration}s)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {/* First Frame (Start Frame) */}
                          <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-violet-500/40 transition-all flex flex-col gap-1.5 relative shadow-md">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-violet-300 flex items-center gap-1 truncate">
                                <ImageIcon size={10} className="text-violet-400 shrink-0" /> Start (0s)
                              </span>
                              <div className="flex items-center gap-1">
                                {gallery.some(i => i.type === 'image' || (!i.type && !i.url?.includes('.mp4'))) && (
                                  <button
                                    type="button"
                                    onClick={() => setGalleryPickerSlot({ type: 'first' })}
                                    className="text-[7.5px] font-bold text-[#c8f135] bg-[#c8f135]/10 hover:bg-[#c8f135]/20 border border-[#c8f135]/25 px-1 py-0.2 rounded transition-all cursor-pointer"
                                    title="Select Start Frame from Studio Gallery"
                                  >
                                    + Gal
                                  </button>
                                )}
                                {(omniFirstFramePreview || firstFramePreview) && (
                                  <button
                                    type="button"
                                    onClick={handleClearStartFrame}
                                    className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded transition-colors cursor-pointer"
                                    title="Remove Start Frame"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {(omniFirstFramePreview || firstFramePreview) ? (
                              <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/60 border border-violet-500/30 relative group shadow-inner">
                                <img
                                  src={omniFirstFramePreview || firstFramePreview}
                                  alt="Start Frame"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all gap-1 backdrop-blur-[2px]">
                                  <button
                                    type="button"
                                    onClick={() => startFrameInputRef.current?.click()}
                                    className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 text-white rounded text-[8.5px] font-bold uppercase tracking-wider cursor-pointer"
                                  >
                                    Replace
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => insertTagAtCursor('<FIRST_FRAME>')}
                                    className="px-1.5 py-0.5 bg-[#c8f135]/20 hover:bg-[#c8f135]/30 text-[#c8f135] rounded text-[8.5px] font-mono font-bold cursor-pointer"
                                    title="Insert <FIRST_FRAME> into prompt"
                                  >
                                    Tag
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startFrameInputRef.current?.click()}
                                className="aspect-video w-full rounded-lg border border-dashed border-white/15 hover:border-violet-400/50 bg-white/[0.01] hover:bg-violet-500/[0.04] transition-all flex flex-col items-center justify-center gap-0.5 text-zinc-500 hover:text-violet-300 cursor-pointer select-none p-1"
                              >
                                <Upload size={12} className="text-violet-400/70" />
                                <span className="text-[8px] font-bold uppercase tracking-wider">Start Frame</span>
                              </button>
                            )}
                          </div>

                          {/* Last Frame (End Frame) */}
                          <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-cyan-500/40 transition-all flex flex-col gap-1.5 relative shadow-md">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-cyan-300 flex items-center gap-1 truncate">
                                <ImageIcon size={10} className="text-cyan-400 shrink-0" /> End ({duration}s)
                              </span>
                              <div className="flex items-center gap-1">
                                {gallery.some(i => i.type === 'image' || (!i.type && !i.url?.includes('.mp4'))) && (
                                  <button
                                    type="button"
                                    onClick={() => setGalleryPickerSlot({ type: 'last' })}
                                    className="text-[7.5px] font-bold text-[#c8f135] bg-[#c8f135]/10 hover:bg-[#c8f135]/20 border border-[#c8f135]/25 px-1 py-0.2 rounded transition-all cursor-pointer"
                                    title="Select End Frame from Studio Gallery"
                                  >
                                    + Gal
                                  </button>
                                )}
                                {(omniLastFramePreview || lastFramePreview) && (
                                  <button
                                    type="button"
                                    onClick={handleClearEndFrame}
                                    className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded transition-colors cursor-pointer"
                                    title="Remove End Frame"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {(omniLastFramePreview || lastFramePreview) ? (
                              <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/60 border border-cyan-500/30 relative group shadow-inner">
                                <img
                                  src={omniLastFramePreview || lastFramePreview}
                                  alt="End Frame"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all gap-1 backdrop-blur-[2px]">
                                  <button
                                    type="button"
                                    onClick={() => endFrameInputRef.current?.click()}
                                    className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 text-white rounded text-[8.5px] font-bold uppercase tracking-wider cursor-pointer"
                                  >
                                    Replace
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => insertTagAtCursor('<LAST_FRAME>')}
                                    className="px-1.5 py-0.5 bg-[#c8f135]/20 hover:bg-[#c8f135]/30 text-[#c8f135] rounded text-[8.5px] font-mono font-bold cursor-pointer"
                                    title="Insert <LAST_FRAME> into prompt"
                                  >
                                    Tag
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => endFrameInputRef.current?.click()}
                                className="aspect-video w-full rounded-lg border border-dashed border-white/15 hover:border-cyan-400/50 bg-white/[0.01] hover:bg-cyan-500/[0.04] transition-all flex flex-col items-center justify-center gap-0.5 text-zinc-500 hover:text-cyan-300 cursor-pointer select-none p-1"
                              >
                                <Upload size={12} className="text-cyan-400/70" />
                                <span className="text-[8px] font-bold uppercase tracking-wider">End Frame</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 1. PROMPT STUDIO */}
                    {renderPromptStudio(
                      panelTab === 'omni'
                        ? "Describe scene composition, dynamic movement, camera transitions, and lighting..."
                        : panelTab === 'veo'
                        ? "Describe cinematic scene, character actions, camera motion, and atmosphere for Veo 3.1..."
                        : "Describe scene action, motion intensity, and cinematic atmosphere..."
                    )}

                    {/* 4. DRIVING REFERENCE VIDEO (Omni 1.1 Only) */}
                    {panelTab === 'omni' && (
                      <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9.5px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                            <Video className="w-3 h-3 text-[#c8f135]" />
                            <span>Driving Video Reference</span>
                          </span>
                          <span className="text-[8.5px] font-mono text-zinc-400 bg-white/[0.04] px-1.5 py-0.2 rounded border border-white/[0.06]">
                            Max 10s MP4
                          </span>
                        </div>

                        {refVideoList.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            {refVideoList.map((vidUrl, idx) => (
                              <div key={idx} className="relative group w-20 h-14 rounded-xl overflow-hidden border border-white/20 bg-black/70 shrink-0">
                                <video src={vidUrl} className="w-full h-full object-cover" muted loop playsInline />
                                <button
                                  type="button"
                                  onClick={() => removeVideoAt(idx)}
                                  className="absolute top-0.5 right-0.5 p-0.5 rounded-md bg-black/80 text-white hover:bg-rose-600 transition-all cursor-pointer"
                                >
                                  <Trash2 size={9} />
                                </button>
                                <span className="absolute bottom-0.5 left-0.5 text-[7.5px] font-mono font-bold bg-black/60 px-1 py-0.2 rounded text-zinc-300">
                                  REF_{idx + 1}
                                </span>
                              </div>
                            ))}
                            {refVideoList.length < 3 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (videoInputRef.current) videoInputRef.current.value = '';
                                  videoInputRef.current?.click();
                                }}
                                className="w-14 h-14 rounded-xl border border-dashed border-white/15 hover:border-[#c8f135]/50 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex flex-col items-center justify-center gap-0.5 text-zinc-500 hover:text-white cursor-pointer"
                              >
                                <Upload size={12} />
                                <span className="text-[7.5px] font-bold">Add</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (videoInputRef.current) videoInputRef.current.value = '';
                              videoInputRef.current?.click();
                            }}
                            disabled={isVideoUploading}
                            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-white/15 hover:border-[#c8f135]/50 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex items-center justify-center gap-1.5 text-zinc-400 hover:text-white cursor-pointer select-none"
                          >
                            {isVideoUploading ? (
                              <>
                                <Loader2 size={13} className="animate-spin text-[#c8f135]" />
                                <span className="text-[9.5px] font-bold uppercase tracking-wider">Uploading video...</span>
                              </>
                            ) : (
                              <>
                                <Upload size={13} className="text-[#c8f135]" />
                                <span className="text-[9.5px] font-bold uppercase tracking-wider">Upload Reference Driving Video</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION B: ZERO-LENS CINEMA PARAMETER CONTROLS */}
              <div className="space-y-3 pt-2.5 border-t border-white/[0.08]">
                {panelTab === 'seedance-2.5' ? (
                  /* Dedicated Bottom Controls for Seedance 2.5 */
                  <div className="space-y-3">
                    {/* Model + Resolution Side by Side */}
                    <div className="grid grid-cols-2 gap-2">
                      <GlassSelect
                        label="Model"
                        icon={Sparkles}
                        value="seedance-2.5"
                        onChange={() => {}}
                        options={seedance25ModelOptions}
                        align="up"
                      />

                      <GlassSelect
                        label="Resolution"
                        value={resolution === '4k' ? '1080p' : resolution}
                        onChange={setResolution}
                        options={resolutionOptions}
                        align="up"
                      />
                    </div>

                    {/* Aspect Ratio + Clip Duration Side by Side */}
                    <div className="grid grid-cols-2 gap-2">
                      <GlassSelect
                        label="Aspect Ratio"
                        value={aspectRatio}
                        onChange={setAspectRatio}
                        options={aspectOptions}
                        align="up"
                      />

                      <GlassSelect
                        label="Clip Duration"
                        value={duration < 10 ? 10 : duration}
                        onChange={(val) => setDuration(Number(val))}
                        options={seedance25DurationOptions}
                        align="up"
                      />
                    </div>
                  </div>
                ) : panelTab === 'seedance' ? (
                  /* Dedicated Bottom Controls for Seedance (Model Selector + Ratio / Duration / Resolution) */
                  <div className="space-y-3">
                    {/* Model + Resolution Side by Side */}
                    <div className="grid grid-cols-2 gap-2">
                      <GlassSelect
                        label="Model"
                        icon={Sparkles}
                        value={(activeEngine === 'seedace' || activeEngine === 'seedance-mini') ? activeEngine : (seedanceSubModel || 'seedance-fast')}
                        onChange={(val) => {
                          setSeedanceSubModel(val);
                          setActiveEngine(val);
                          if (val !== 'seedace' && (resolution === '1080p' || resolution === '4k')) {
                            setResolution('720p');
                          }
                        }}
                        options={seedanceModelOptions}
                        align="up"
                      />

                      <GlassSelect
                        label="Resolution"
                        value={resolution}
                        onChange={setResolution}
                        options={resolutionOptions}
                        align="up"
                      />
                    </div>

                    {/* Aspect Ratio + Clip Duration Side by Side */}
                    <div className="grid grid-cols-2 gap-2">
                      <GlassSelect
                        label="Aspect Ratio"
                        value={aspectRatio}
                        onChange={setAspectRatio}
                        options={aspectOptions}
                        align="up"
                      />

                      <GlassSelect
                        label="Clip Duration"
                        value={duration}
                        onChange={(val) => setDuration(Number(val))}
                        options={seedanceDurationOptions}
                        align="up"
                      />
                    </div>
                  </div>
                ) : panelTab === 'motion' ? (
                  /* ONLY Aspect Ratio for Motion Tab (duration from driving video, resolution from Quality Mode, audio not applicable) */
                  <div className="space-y-1">
                    <GlassSelect
                      label="Aspect Ratio"
                      value={aspectRatio}
                      onChange={setAspectRatio}
                      options={aspectOptions}
                      align="up"
                    />
                  </div>
                ) : (
                  /* Standard 4 Controls for Veo / Omni */
                  <>
                    {/* Aspect Ratio + Clip Duration — same row, sleek glass dropdowns */}
                    <div className="grid grid-cols-2 gap-2">
                      <GlassSelect
                        label="Aspect Ratio"
                        value={aspectRatio}
                        onChange={setAspectRatio}
                        options={aspectOptions}
                        align="up"
                      />

                      <GlassSelect
                        label="Clip Duration"
                        value={duration}
                        onChange={(val) => setDuration(Number(val))}
                        options={durationOptions}
                        align="up"
                      />
                    </div>

                    {/* Resolution & Compact Audio Track Controls */}
                    <div className="grid grid-cols-2 gap-2">
                      <GlassSelect
                        label="Resolution"
                        value={resolution}
                        onChange={setResolution}
                        options={resolutionOptions}
                        align="up"
                      />

                      <div className="space-y-1.5 w-full">
                        <div className="flex items-center justify-between">
                          <label className="text-[9.5px] font-black uppercase tracking-[0.16em] text-zinc-400 flex items-center gap-1">
                            <Volume2 className="w-3 h-3 text-zinc-400" />
                            <span>Sound Effects (SFX)</span>
                          </label>
                          <span className="text-[8.5px] font-mono text-zinc-500">SFX Only</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setGenerateAudio(!generateAudio)}
                          className={cn(
                            "w-full h-[38px] px-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer select-none",
                            generateAudio
                              ? "bg-[#c8f135]/15 border-[#c8f135]/50 text-[#c8f135] shadow-[0_0_15px_rgba(200,241,53,0.15)] font-extrabold"
                              : "bg-black/40 border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/20"
                          )}
                          title={generateAudio ? "Sound Effects ON (Realistic ambient foley & SFX. Music is strictly excluded.)" : "Audio Muted (No audio or music track)"}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {generateAudio ? (
                              <Volume2 size={13} className="text-[#c8f135] shrink-0" />
                            ) : (
                              <VolumeX size={13} className="text-zinc-500 shrink-0" />
                            )}
                            <span className="text-[10.5px] font-bold truncate">{generateAudio ? 'SFX ON' : 'Muted'}</span>
                          </div>
                          <span className={cn(
                            "text-[8.5px] font-mono font-bold px-1 py-0.2 rounded border shrink-0",
                            generateAudio
                              ? "bg-[#c8f135]/20 text-[#c8f135] border-[#c8f135]/30"
                              : "bg-white/[0.04] text-zinc-500 border-white/[0.06]"
                          )}>
                            {generateAudio ? 'SFX ONLY' : 'OFF'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

            </div>

            {/* 4. Sleek Sticky Bottom Action Bar */}
            <div className="absolute bottom-0 left-0 right-0 py-2.5 sm:py-3.5 px-3 sm:px-4 bg-[#06060a]/95 border-t border-white/[0.08] backdrop-blur-2xl flex items-center justify-between gap-2 sm:gap-3 z-20 shadow-[0_-20px_40px_rgba(0,0,0,0.9)] pb-safe">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse shrink-0", (panelTab === 'seedance' || panelTab === 'seedance-2.5') ? "bg-amber-400" : "bg-[#c8f135]")} />
                  <span className="text-[9px] sm:text-[9.5px] font-black text-zinc-300 uppercase tracking-widest truncate">
                    {panelTab === 'seedance-2.5'
                      ? 'Seedance 2.5 Pro Ready'
                      : panelTab === 'seedance'
                      ? `${activeEngine === 'seedace' ? 'Seedance 2.0 Pro' : activeEngine === 'seedance-mini' ? 'Seedance Mini' : 'Seedance Fast'} Ready`
                      : panelTab === 'omni'
                      ? 'Omni Ready'
                      : panelTab === 'omni-multi'
                      ? 'Multi-Ref Ready'
                      : panelTab === 'veo'
                      ? 'Veo 3.1 Ready'
                      : 'Motion Ready'}
                  </span>
                </div>
                <span className="text-[10.5px] sm:text-[11.5px] font-black text-[#c8f135] flex items-center gap-1 mt-0.5 truncate">
                  {calculatedCredits}⚡ Shorts <span className="text-[8.5px] sm:text-[9px] font-semibold text-zinc-500">({userCredits}⚡)</span>
                </span>
              </div>

              <button
                type="button"
                onClick={
                  (panelTab === 'seedance' || panelTab === 'seedance-2.5')
                    ? triggerGenerateSeedance
                    : panelTab === 'omni' || panelTab === 'omni-multi'
                    ? triggerGenerateOmni
                    : panelTab === 'motion'
                    ? triggerGenerateMotion
                    : triggerGenerateVeo
                }
                disabled={isBusy || (panelTab === 'motion' ? (!motionSubjectPreview && !motionSubjectImage) || (!motionRefVideoPreview && !motionRefVideo) : !canGenerate)}
                className={cn(
                  "h-10 sm:h-11 px-3.5 sm:px-5 rounded-xl sm:rounded-2xl text-[10.5px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-[0_0_30px_rgba(200,241,53,0.3)] border shrink-0 active:scale-95 select-none",
                  (panelTab === 'motion' ? (!!(motionSubjectPreview || motionSubjectImage) && !!(motionRefVideoPreview || motionRefVideo)) : canGenerate && !isBusy)
                    ? (panelTab === 'seedance' || panelTab === 'seedance-2.5')
                      ? "bg-gradient-to-r from-amber-400 to-[#c8f135] hover:brightness-110 text-black border-amber-400/60 hover:shadow-[0_0_40px_rgba(251,191,36,0.6)] cursor-pointer"
                      : "bg-[#c8f135] hover:bg-[#d8ff43] text-black border-[#d4ff00]/60 hover:shadow-[0_0_40px_rgba(200,241,53,0.6)] cursor-pointer"
                    : "bg-white/5 text-zinc-500 border-white/5 cursor-not-allowed shadow-none"
                )}
              >
                {isBusy ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                    <span>Queue Full ({activeJobsCount}/{maxConcurrent})</span>
                  </>
                ) : activeJobsCount > 0 ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 fill-current text-black" />
                    <span>+ Generate ({activeJobsCount} Active)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 fill-current text-black" />
                    <span>Generate Video</span>
                  </>
                )}
              </button>
            </div>

            {/* Studio Gallery Direct Reference Picker Modal */}
            <AnimatePresence>
              {galleryPickerSlot && (
                <div className="fixed inset-0 z-[400] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-lg max-h-[80vh] bg-[#0c0c14] border border-white/15 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 overflow-hidden"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                          {(galleryPickerSlot.type === 'image' || galleryPickerSlot.type === 'seedance_image' || galleryPickerSlot.type === 'first' || galleryPickerSlot.type === 'seedance_first' || galleryPickerSlot.type === 'last' || galleryPickerSlot.type === 'seedance_last' || galleryPickerSlot.type === 'motion_subject') ? (
                            <ImageIcon className="w-4 h-4 text-[#c8f135]" />
                          ) : (
                            <Video className="w-4 h-4 text-cyan-400" />
                          )}
                          <span>
                            {galleryPickerSlot.type === 'first' || galleryPickerSlot.type === 'seedance_first'
                              ? 'Select Start Frame (First Frame) from Gallery'
                              : galleryPickerSlot.type === 'last' || galleryPickerSlot.type === 'seedance_last'
                              ? 'Select End Frame (Last Frame) from Gallery'
                              : galleryPickerSlot.type === 'motion_subject'
                              ? 'Select Subject Reference Image'
                              : galleryPickerSlot.type === 'motion_video'
                              ? 'Select Motion Pattern Video'
                              : galleryPickerSlot.type === 'seedance_image'
                              ? `Select Seedance @image${galleryPickerSlot.slotIdx + 1} from Gallery`
                              : galleryPickerSlot.type === 'seedance_video'
                              ? `Select Seedance @video${galleryPickerSlot.slotIdx + 1} from Gallery`
                              : galleryPickerSlot.type === 'image'
                              ? `Select @image${galleryPickerSlot.slotIdx + 1} from Studio Gallery`
                              : `Select @video${galleryPickerSlot.slotIdx + 1} from Studio Gallery`}
                          </span>
                        </h3>
                        <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                          {(galleryPickerSlot.type === 'image' || galleryPickerSlot.type === 'seedance_image' || galleryPickerSlot.type === 'first' || galleryPickerSlot.type === 'seedance_first' || galleryPickerSlot.type === 'last' || galleryPickerSlot.type === 'seedance_last' || galleryPickerSlot.type === 'motion_subject')
                            ? 'Pick any generated image or extracted video frame'
                            : galleryPickerSlot.type === 'motion_video'
                            ? 'Pick a generated driving video (3–30s duration limit)'
                            : galleryPickerSlot.type === 'seedance_video'
                            ? 'Pick a generated video (Max 15s duration limit)'
                            : 'Pick a generated video (Max 10s duration limit)'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGalleryPickerSlot(null)}
                        className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Gallery Grid */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                      {(() => {
                        const isImg = galleryPickerSlot.type === 'image' || galleryPickerSlot.type === 'seedance_image' || galleryPickerSlot.type === 'first' || galleryPickerSlot.type === 'seedance_first' || galleryPickerSlot.type === 'last' || galleryPickerSlot.type === 'seedance_last' || galleryPickerSlot.type === 'motion_subject';
                        const isMotionVideo = galleryPickerSlot.type === 'motion_video';
                        const isSeedanceVid = galleryPickerSlot.type === 'seedance_video';
                        const items = (gallery || []).filter(item => isImg ? (item.type === 'image' || !item.url?.includes('.mp4')) : (item.type === 'video' || item.url?.includes('.mp4')));

                        if (items.length === 0) {
                          return (
                            <div className="py-12 text-center text-zinc-500 text-xs">
                              No {isImg ? 'images or screenshot frames' : 'videos'} found in your Studio Gallery yet.
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-3 gap-2.5">
                            {items.map(item => {
                              const dur = Number(item.duration) || 0;
                              const isTooLong = !isImg && (isMotionVideo ? dur > 30.5 : isSeedanceVid ? dur > 15.05 : dur > 10.05);

                              return (
                                <div
                                  key={item.id}
                                  onClick={() => {
                                    if (isTooLong) {
                                      const showToast = useAppStore.getState().showToast;
                                      const maxLimit = isMotionVideo ? '30s' : isSeedanceVid ? '15s' : '10s';
                                      if (showToast) showToast(`Video exceeds ${maxLimit} limit (${dur}s).`, "error");
                                      return;
                                    }
                                    if (galleryPickerSlot.type === 'first') {
                                      handlePickFirstFrame(item);
                                    } else if (galleryPickerSlot.type === 'last') {
                                      handlePickLastFrame(item);
                                    } else if (galleryPickerSlot.type === 'seedance_first') {
                                      handlePickSeedanceFirstFrame(item);
                                    } else if (galleryPickerSlot.type === 'seedance_last') {
                                      handlePickSeedanceLastFrame(item);
                                    } else if (galleryPickerSlot.type === 'seedance_image') {
                                      handlePickSeedanceImage(item, galleryPickerSlot.slotIdx);
                                    } else if (galleryPickerSlot.type === 'seedance_video') {
                                      handlePickSeedanceVideo(item, galleryPickerSlot.slotIdx);
                                    } else if (galleryPickerSlot.type === 'motion_subject') {
                                      handlePickMotionSubject(item);
                                    } else if (galleryPickerSlot.type === 'motion_video') {
                                      handlePickMotionVideo(item);
                                    } else if (galleryPickerSlot.type === 'image') {
                                      handlePickGalleryImage(item, galleryPickerSlot.slotIdx);
                                    } else {
                                      handlePickGalleryVideo(item, galleryPickerSlot.slotIdx);
                                    }
                                  }}
                                  className={cn(
                                    "relative aspect-video rounded-xl overflow-hidden border transition-all cursor-pointer group bg-black/60",
                                    isTooLong
                                      ? "border-red-500/40 opacity-50 cursor-not-allowed"
                                      : "border-white/10 hover:border-[#c8f135]/80 hover:scale-[1.02]"
                                  )}
                                >
                                  {isImg ? (
                                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                                  )}
                                  
                                  {/* Overlay badge */}
                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1.5 flex items-center justify-between text-[8px] font-mono">
                                    <span className="text-zinc-300 truncate max-w-[70%]">{item.prompt || 'Generated'}</span>
                                    {item.duration && (
                                      <span className={cn("px-1 py-0.2 rounded font-bold", isTooLong ? "bg-red-500/80 text-white" : "bg-black/80 text-[#c8f135]")}>
                                        {item.duration}s
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        );

        if (inlineMode) {
          return panelContent;
        }

        return (
          <AnimatePresence>
            {isOpen && (
              <div className="fixed inset-0 z-50 pointer-events-none flex justify-start">
                {/* Backdrop for mobile */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={onClose}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                />

                {/* SidePanel Drawer Container on the LEFT */}
                <motion.aside
                  initial={{ x: '-100%', opacity: 0.5 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '-100%', opacity: 0 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                  className="pointer-events-auto w-full md:w-[350px] lg:w-[370px] h-full z-10"
                >
                  {panelContent}
                </motion.aside>
              </div>
            )}
          </AnimatePresence>
        );
});

SidePanel.displayName = 'SidePanel';
SegmentedControl.displayName = 'SegmentedControl';
GlassSelect.displayName = 'GlassSelect';

export default SidePanel;
