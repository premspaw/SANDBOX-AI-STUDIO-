import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowsClockwise, 
  Sparkle, 
  VideoCamera, 
  UploadSimple, 
  Play, 
  Pause, 
  SlidersHorizontal, 
  Lightning, 
  Coins, 
  CheckCircle, 
  WarningCircle, 
  Info, 
  DownloadSimple, 
  ShareNetwork,
  FilmSlate,
  Clock,
  GearSix,
  Plus,
  Trash,
  LinkSimple,
  Copy,
  ArrowSquareOut,
  Image as ImageIcon,
  FolderOpen,
  MusicNotes,
  FilmStrip,
  X,
  Tag as TagIcon
} from '@phosphor-icons/react';
import { useAppStore } from '../../store';
import { useShorts } from '../../hooks/useShorts';
import { SHORTS_COST } from '../../config/shortsConfig';
import { AssetsLibrary } from '../panels/AssetsLibrary';

const STYLE_PRESETS = [
  { id: 'cyberpunk', label: '⚡ Cyberpunk Neon', prompt: 'Transform subject from Image 1 in cyberpunk aesthetic, glowing neon lights, holographic reflections, dark chromatic atmosphere' },
  { id: 'anime', label: '🌸 Anime Studio', prompt: 'Transform subject from Image 1 in Studio Ghibli / Makoto Shinkai anime style, vibrant painted colors, soft cinematic cel shading' },
  { id: 'noir', label: '🎬 Cinematic Noir', prompt: 'Transform subject from Image 1 in 1940s film noir, high contrast black and white lighting, deep dramatic shadows' },
  { id: 'claymation', label: '🧱 Claymation', prompt: 'Transform subject from Image 1 into Aardman style handcrafted stop-motion claymation, detailed plasticine texture' },
  { id: '3d_pixar', label: '✨ 3D Animation', prompt: 'Transform subject from Image 1 into high-end stylized 3D animation, Pixar style character shading, warm subsurface scattering' },
  { id: 'vintage_vhs', label: '📼 Retro 80s VHS', prompt: 'Transform subject from Image 1 into vintage 1980s VHS tape aesthetic, analog tape grain, subtle chromatic aberration' }
];

export default function RemixStudio() {
  const [prompt, setPrompt] = useState('Transform the subject from Image 1 with cinematic lighting, dynamic styling and high-end aesthetic fidelity while preserving the exact motion from driving video');
  const [negativePrompt, setNegativePrompt] = useState('low quality, blurry, distorted artifacts, stuttering');
  const [resolution, setResolution] = useState('720p');
  
  // Media State
  const [videoInputMode, setVideoInputMode] = useState('upload'); // 'upload' | 'url'
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');

  const [imageInputMode, setImageInputMode] = useState('upload'); // 'upload' | 'url'
  const [imageUrlInput, setImageUrlInput] = useState('');
  // Array of { id, url, tag: 'Image 1', token: '@image1', name: string }
  const [referenceImages, setReferenceImages] = useState([]); 

  // Additional Media (Audio Track, Start Frame, End Frame)
  const [audioUrl, setAudioUrl] = useState('');
  const [startFrameUrl, setStartFrameUrl] = useState('');
  const [endFrameUrl, setEndFrameUrl] = useState('');

  // Plus Menu & Gallery Picker State
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState('image'); // 'image' | 'video' | 'audio' | 'startFrame' | 'endFrame'

  // Generation & Progress State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedResult, setGeneratedResult] = useState(null);
  const [remixHistory, setRemixHistory] = useState([]);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const fileInputVideoRef = useRef(null);
  const fileInputImageRef = useRef(null);
  const fileInputAudioRef = useRef(null);
  const fileInputStartFrameRef = useRef(null);
  const fileInputEndFrameRef = useRef(null);
  const plusMenuRef = useRef(null);
  const promptTextareaRef = useRef(null);

  const { shorts, spend, refund, canAfford } = useShorts();
  const userProfile = useAppStore(state => state.userProfile);

  const costKey = `remix_motion_transfer_${resolution}`;
  const costAmount = SHORTS_COST[costKey] || 8;

  // Close plus menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target)) {
        setShowPlusMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Convert File to Base64 Data URL
  const fileToDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const dataUrl = await fileToDataUrl(file);
      setVideoPreview(dataUrl);
      setErrorMessage('');
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const dataUrl = await fileToDataUrl(file);
      setAudioUrl(dataUrl);
      setErrorMessage('');
    }
  };

  const handleStartFrameUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const dataUrl = await fileToDataUrl(file);
      setStartFrameUrl(dataUrl);
      setErrorMessage('');
    }
  };

  const handleEndFrameUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const dataUrl = await fileToDataUrl(file);
      setEndFrameUrl(dataUrl);
      setErrorMessage('');
    }
  };

  const handleApplyVideoUrl = () => {
    if (videoUrlInput.trim()) {
      setVideoPreview(videoUrlInput.trim());
      setVideoFile(null);
      setErrorMessage('');
    }
  };

  // Add references with strict sequential tagging: Image 1, Image 2, etc.
  const addImagesWithTags = (urls) => {
    setReferenceImages(prev => {
      const newRefs = [...prev];
      for (const item of urls) {
        if (newRefs.length >= 8) break;
        const currentIdx = newRefs.length + 1;
        const urlStr = typeof item === 'string' ? item : item.url;
        newRefs.push({
          id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          url: urlStr,
          tag: `Image ${currentIdx}`,
          token: `@image${currentIdx}`,
          name: typeof item === 'object' && item.name ? item.name : `Image ${currentIdx}`
        });
      }
      return newRefs;
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (referenceImages.length + files.length > 8) {
        setErrorMessage('Maximum 8 reference images allowed.');
        return;
      }
      const dataUrls = await Promise.all(files.map(fileToDataUrl));
      addImagesWithTags(dataUrls);
      setErrorMessage('');
    }
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      if (referenceImages.length >= 8) {
        setErrorMessage('Maximum 8 reference images allowed.');
        return;
      }
      addImagesWithTags([imageUrlInput.trim()]);
      setImageUrlInput('');
      setErrorMessage('');
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setReferenceImages(prev => {
      const filtered = prev.filter((_, idx) => idx !== indexToRemove);
      // Re-index tags so Image 1, Image 2 remain cleanly contiguous
      return filtered.map((img, idx) => ({
        ...img,
        tag: `Image ${idx + 1}`,
        token: `@image${idx + 1}`
      }));
    });
  };

  // Autocomplete Mentions Query State (@image1, @video1, etc.)
  const [mentionSearch, setMentionSearch] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionCursorPos, setMentionCursorPos] = useState(0);

  // Active mention slots (strictly uploaded / active inputs in this studio session only - no history items)
  const activeMentionSlots = useMemo(() => {
    const slots = [];
    referenceImages.forEach((img, idx) => {
      slots.push({
        id: img.id || `ref_${idx}`,
        name: `image${idx + 1}`,
        token: `@image${idx + 1}`,
        tag: `Image ${idx + 1}`,
        label: `Image ${idx + 1}`,
        desc: img.name || `Reference Image ${idx + 1}`,
        url: img.url,
        type: 'image'
      });
    });
    if (videoPreview) {
      slots.push({
        id: 'slot_driving_video',
        name: 'video1',
        token: '@video1',
        tag: 'Driving Video',
        label: 'Driving Video',
        desc: 'Source Motion Video',
        url: videoPreview,
        type: 'video'
      });
    }
    if (audioUrl) {
      slots.push({
        id: 'slot_audio',
        name: 'audio1',
        token: '@audio1',
        tag: 'Audio Track',
        label: 'Audio Track',
        desc: 'Synced Audio Track',
        url: audioUrl,
        type: 'audio'
      });
    }
    if (startFrameUrl) {
      slots.push({
        id: 'slot_start_frame',
        name: 'start_frame',
        token: '@start_frame',
        tag: 'Start Frame',
        label: 'Start Frame',
        desc: 'Anchor Start Frame',
        url: startFrameUrl,
        type: 'image'
      });
    }
    if (endFrameUrl) {
      slots.push({
        id: 'slot_end_frame',
        name: 'end_frame',
        token: '@end_frame',
        tag: 'End Frame',
        label: 'End Frame',
        desc: 'Anchor End Frame',
        url: endFrameUrl,
        type: 'image'
      });
    }
    return slots;
  }, [referenceImages, videoPreview, audioUrl, startFrameUrl, endFrameUrl]);

  const filteredMentionSlots = useMemo(() => {
    if (mentionSearch === null) return [];
    const q = mentionSearch.trim().toLowerCase();
    if (!q) return activeMentionSlots;
    return activeMentionSlots.filter(s => 
      s.token.toLowerCase().includes(q) || 
      s.name.toLowerCase().includes(q) || 
      s.tag.toLowerCase().includes(q)
    );
  }, [activeMentionSlots, mentionSearch]);

  const handlePromptChange = (e) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart || 0;
    setPrompt(val);

    const match = val.slice(0, cursor).match(/@([\w_]*)$/);
    if (match) {
      setMentionSearch(match[1].toLowerCase());
      setMentionCursorPos(cursor);
      setMentionIndex(0);
    } else {
      setMentionSearch(null);
    }
  };

  const selectMentionSlot = (slot) => {
    const textarea = promptTextareaRef.current;
    const text = prompt;
    const cursor = mentionCursorPos || (textarea ? textarea.selectionStart : text.length);
    const before = text.slice(0, cursor).replace(/@[\w_]*$/, '');
    const after = text.slice(cursor);
    const tagText = `${slot.tag} `;
    const newText = `${before}${tagText}${after}`;
    const nextCursor = before.length + tagText.length;

    setPrompt(newText);
    setMentionSearch(null);

    setTimeout(() => {
      if (promptTextareaRef.current) {
        promptTextareaRef.current.focus();
        promptTextareaRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    }, 50);
  };

  const handlePromptKeyDown = (e) => {
    if (mentionSearch !== null && filteredMentionSlots.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredMentionSlots.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredMentionSlots.length) % filteredMentionSlots.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectMentionSlot(filteredMentionSlots[mentionIndex] || filteredMentionSlots[0]);
      } else if (e.key === 'Escape') {
        setMentionSearch(null);
      }
    }
  };

  // Insert tag into prompt at cursor
  const insertTagIntoPrompt = (tagStr) => {
    const textarea = promptTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart || prompt.length;
      const end = textarea.selectionEnd || prompt.length;
      const newPrompt = prompt.substring(0, start) + ` ${tagStr} ` + prompt.substring(end);
      setPrompt(newPrompt.replace(/\s+/g, ' '));
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tagStr.length + 2, start + tagStr.length + 2);
      }, 50);
    } else {
      setPrompt(prev => `${prev} ${tagStr}`.trim());
    }
  };

  const handleSelectPreset = (presetPrompt) => {
    setPrompt(presetPrompt);
  };

  // Handle Gallery Modal Pick
  const handleGallerySelect = (url, item) => {
    if (galleryTarget === 'video') {
      setVideoPreview(url);
      setVideoFile(null);
    } else if (galleryTarget === 'audio') {
      setAudioUrl(url);
    } else if (galleryTarget === 'startFrame') {
      setStartFrameUrl(url);
    } else if (galleryTarget === 'endFrame') {
      setEndFrameUrl(url);
    } else {
      // Default: Image reference
      addImagesWithTags([{ url, name: item?.name || 'Gallery Asset' }]);
    }
    setShowGalleryModal(false);
    setErrorMessage('');
  };

  const handleStartRemix = async () => {
    if (isGenerating) return;
    setErrorMessage('');

    const sourceVideo = videoPreview;
    if (!sourceVideo) {
      setErrorMessage('Please upload or specify a source video.');
      return;
    }

    if (referenceImages.length === 0) {
      setErrorMessage('Please provide at least one reference style/character image (Image 1).');
      return;
    }

    // Check Credits
    if (!canAfford(costKey)) {
      setErrorMessage(`Insufficient Shorts balance. You need ${costAmount} Shorts for ${resolution} generation.`);
      return;
    }

    // Deduct credits
    const spendRes = await spend(costKey);
    if (!spendRes.success) {
      setErrorMessage('Failed to deduct credits. Please check your Shorts balance.');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(10);
    setStatusMessage('Initiating Genjutsu Motion Transfer Engine...');

    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 92) return 92;
        if (prev < 30) setStatusMessage('Uploading & Analyzing Source Motion DNA...');
        else if (prev < 60) setStatusMessage('Mapping Character References (Image 1, Image 2)...');
        else setStatusMessage('Synthesizing Neural Motion Transfer Layers...');
        return prev + Math.floor(Math.random() * 8 + 4);
      });
    }, 1800);

    try {
      const response = await fetch('/api/remix/motion-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userProfile?.id || 'anonymous'
        },
        body: JSON.stringify({
          prompt,
          video_url: sourceVideo,
          image_urls: referenceImages.map(img => img.url),
          referenceImages: referenceImages.map(img => ({ tag: img.tag, token: img.token, url: img.url })),
          audio_url: audioUrl || undefined,
          start_frame_url: startFrameUrl || undefined,
          end_frame_url: endFrameUrl || undefined,
          resolution,
          userId: userProfile?.id
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete Motion Transfer.');
      }

      clearInterval(progressInterval);
      setGenerationProgress(100);
      setStatusMessage('Motion Transfer Complete!');

      const newItem = {
        id: data.requestId || `remix-${Date.now()}`,
        prompt,
        resolution,
        url: data.videoUrl || data.originalUrl,
        zipUrl: data.zipUrl,
        movUrl: data.movUrl,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setGeneratedResult(newItem);
      setRemixHistory(prev => [newItem, ...prev]);
      setIsGenerating(false);

    } catch (err) {
      console.error('[RemixStudio] Generation error:', err);
      clearInterval(progressInterval);
      setIsGenerating(false);
      setErrorMessage(err.message || 'Generation failed on Higgsfield engine.');
      // Refund credits
      await refund(costKey);
    }
  };

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="flex-1 h-full w-full bg-[#08080c] text-white flex flex-col overflow-hidden relative font-sans">
      {/* Dynamic Background Ambience */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Header */}
      <div className="h-16 border-b border-white/10 px-6 flex items-center justify-between bg-black/40 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]">
            <ArrowsClockwise size={20} weight="bold" className={isGenerating ? "animate-spin" : ""} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-wider uppercase text-white">Remix Studio</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 border border-amber-400/30 text-amber-300">
                GENJUTSU MOTION TRANSFER
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Transform video footage using character references while preserving exact motion & timing</p>
          </div>
        </div>

        {/* Credit & Status Pill */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-zinc-300">
            <Coins size={16} className="text-amber-400" />
            <span>Shorts Balance:</span>
            <span className="font-bold text-white">{shorts ?? 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium">Higgsfield Engine Live</span>
          </div>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden z-10">
        
        {/* Left Controls & Parameters Sidebar */}
        <div className="w-full lg:w-[440px] xl:w-[480px] border-r border-white/10 bg-black/60 backdrop-blur-2xl flex flex-col min-h-0 overflow-y-auto custom-scrollbar p-5 space-y-5 shrink-0">
          
          {/* Quick Media Attach Plus Bar */}
          <div className="relative" ref={plusMenuRef}>
            <div className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-2xl p-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPlusMenu(!showPlusMenu)}
                  className="w-8 h-8 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black flex items-center justify-center font-bold shadow-[0_0_15px_rgba(251,191,36,0.35)] transition-all active:scale-95"
                  title="Add Media / Reference Options"
                >
                  <Plus size={18} weight="bold" />
                </button>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Quick Attach Media</span>
                  <span className="text-[10px] text-zinc-400">Add character images (Image 1, 2), video, or audio</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => { setGalleryTarget('image'); setShowGalleryModal(true); }}
                  className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-zinc-300 font-semibold flex items-center gap-1.5 transition-all"
                >
                  <FolderOpen size={14} className="text-purple-400" />
                  <span>Gallery</span>
                </button>
              </div>
            </div>

            {/* Plus Quick Action Dropdown Menu */}
            <AnimatePresence>
              {showPlusMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-2 z-50 bg-zinc-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-2 shadow-[0_15px_35px_rgba(0,0,0,0.8)] grid grid-cols-2 gap-1.5"
                >
                  <button
                    type="button"
                    onClick={() => { setShowPlusMenu(false); fileInputImageRef.current?.click(); }}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/10 text-left transition-all group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                      <ImageIcon size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-amber-300">Upload Image</div>
                      <div className="text-[9px] text-zinc-400">From computer (Image 1, 2)</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setShowPlusMenu(false); setGalleryTarget('image'); setShowGalleryModal(true); }}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/10 text-left transition-all group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <FolderOpen size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-amber-300">Image from Gallery</div>
                      <div className="text-[9px] text-zinc-400">Pick from Studio Library</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setShowPlusMenu(false); fileInputVideoRef.current?.click(); }}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/10 text-left transition-all group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <VideoCamera size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-amber-300">Upload Driving Video</div>
                      <div className="text-[9px] text-zinc-400">From computer</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setShowPlusMenu(false); setGalleryTarget('video'); setShowGalleryModal(true); }}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/10 text-left transition-all group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <FilmStrip size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-amber-300">Video from Gallery</div>
                      <div className="text-[9px] text-zinc-400">Pick saved video</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setShowPlusMenu(false); fileInputAudioRef.current?.click(); }}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/10 text-left transition-all group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                      <MusicNotes size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-amber-300">Upload Audio Track</div>
                      <div className="text-[9px] text-zinc-400">MP3, WAV audio sync</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setShowPlusMenu(false); fileInputStartFrameRef.current?.click(); }}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/10 text-left transition-all group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                      <FilmSlate size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-amber-300">Start / End Frame</div>
                      <div className="text-[9px] text-zinc-400">Anchor frame control</div>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Hidden Inputs */}
          <input type="file" accept="audio/*" ref={fileInputAudioRef} onChange={handleAudioUpload} className="hidden" />
          <input type="file" accept="image/*" ref={fileInputStartFrameRef} onChange={handleStartFrameUpload} className="hidden" />
          <input type="file" accept="image/*" ref={fileInputEndFrameRef} onChange={handleEndFrameUpload} className="hidden" />
          <input type="file" accept="video/*" ref={fileInputVideoRef} onChange={handleVideoUpload} className="hidden" />
          <input type="file" accept="image/*" multiple ref={fileInputImageRef} onChange={handleImageUpload} className="hidden" />
          
          {/* Source Video Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
                <VideoCamera size={14} className="text-amber-400" />
                <span>1. Source Motion Video (Required)</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => { setGalleryTarget('video'); setShowGalleryModal(true); }}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-zinc-300 font-semibold"
                >
                  From Gallery
                </button>
                <div className="flex gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setVideoInputMode('upload')}
                    className={`px-2 py-0.5 rounded ${videoInputMode === 'upload' ? 'bg-amber-400 text-black font-bold' : 'text-zinc-400'}`}
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoInputMode('url')}
                    className={`px-2 py-0.5 rounded ${videoInputMode === 'url' ? 'bg-amber-400 text-black font-bold' : 'text-zinc-400'}`}
                  >
                    URL
                  </button>
                </div>
              </div>
            </div>

            {videoInputMode === 'upload' ? (
              <div>
                <div 
                  onClick={() => fileInputVideoRef.current?.click()}
                  className="relative flex flex-col items-center justify-center h-32 rounded-2xl border-2 border-dashed border-white/15 hover:border-amber-500/50 bg-white/[0.02] hover:bg-amber-500/[0.03] transition-all cursor-pointer overflow-hidden group"
                >
                  {videoPreview ? (
                    <>
                      <video src={videoPreview} className="w-full h-full object-cover" muted loop autoPlay />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-semibold text-amber-300 transition-opacity">
                        Replace Video
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-center p-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 group-hover:bg-amber-500/20 flex items-center justify-center text-zinc-400 group-hover:text-amber-400 transition-colors">
                        <UploadSimple size={18} />
                      </div>
                      <span className="text-[11px] font-semibold text-zinc-200">Click to Upload Video or Pick from Gallery</span>
                      <span className="text-[9px] text-zinc-500">MP4, MOV (Motion & Timing will be transferred)</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/motion-video.mp4"
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                />
                <button
                  type="button"
                  onClick={handleApplyVideoUrl}
                  className="px-3 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Reference Image(s) Section with Auto-Tagging: Image 1, Image 2 */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
                <Sparkle size={14} className="text-purple-400" />
                <span>2. Character / Style References ({referenceImages.length}/8)</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => { setGalleryTarget('image'); setShowGalleryModal(true); }}
                  className="px-2 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-[10px] text-purple-300 font-semibold"
                >
                  + From Gallery
                </button>
                <div className="flex gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setImageInputMode('upload')}
                    className={`px-2 py-0.5 rounded ${imageInputMode === 'upload' ? 'bg-purple-400 text-black font-bold' : 'text-zinc-400'}`}
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputMode('url')}
                    className={`px-2 py-0.5 rounded ${imageInputMode === 'url' ? 'bg-purple-400 text-black font-bold' : 'text-zinc-400'}`}
                  >
                    URL
                  </button>
                </div>
              </div>
            </div>

            {imageInputMode === 'upload' ? (
              <div>
                <div 
                  onClick={() => fileInputImageRef.current?.click()}
                  className="relative flex flex-col items-center justify-center h-20 rounded-2xl border-2 border-dashed border-white/15 hover:border-purple-500/50 bg-white/[0.02] hover:bg-purple-500/[0.03] transition-all cursor-pointer overflow-hidden group"
                >
                  <div className="flex flex-col items-center gap-1 text-center p-2">
                    <div className="w-6 h-6 rounded-lg bg-white/5 group-hover:bg-purple-500/20 flex items-center justify-center text-zinc-400 group-hover:text-purple-400 transition-colors">
                      <Plus size={14} />
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-200">Upload Reference (Auto-tagged as Image 1, 2...)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/character-ref.jpg"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500/60"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-2 rounded-xl bg-purple-400 text-black text-xs font-bold hover:bg-purple-300"
                >
                  Add
                </button>
              </div>
            )}

            {/* Thumbnail Grid of Reference Images with Glowing Sequential Tag Badges */}
            {referenceImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {referenceImages.map((img, idx) => (
                  <div key={img.id || idx} className="relative group rounded-xl overflow-hidden border border-purple-500/30 bg-black aspect-square shadow-lg">
                    <img src={img.url} alt={img.tag} className="w-full h-full object-cover" />
                    
                    {/* Tag Badge */}
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-purple-600/90 text-white font-black text-[9px] uppercase tracking-wider shadow-md backdrop-blur-sm border border-purple-400/40">
                      {img.tag}
                    </div>

                    {/* Quick Insert Tag Action */}
                    <button
                      type="button"
                      onClick={() => insertTagIntoPrompt(img.tag)}
                      className="absolute bottom-1 left-1 right-1 py-1 rounded bg-black/80 hover:bg-purple-500 text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1"
                      title="Insert tag into prompt"
                    >
                      <TagIcon size={10} />
                      <span>Tag</span>
                    </button>

                    {/* Remove Action */}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Style Presets */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Style Presets</label>
            <div className="grid grid-cols-2 gap-1.5">
              {STYLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.prompt)}
                  className="px-2.5 py-1.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/10 hover:border-amber-400/40 text-[11px] text-zinc-300 text-left transition-all truncate"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Transformation Prompt Section with Tag Quick-Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
                <span>3. Transformation Prompt</span>
              </label>
              <span className="text-[10px] text-amber-400">Reference: Image 1, Image 2</span>
            </div>

            {/* Reference Tags Helper Chips */}
            {referenceImages.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-white/[0.02] border border-white/10">
                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider pl-1">Insert Tags:</span>
                {referenceImages.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => insertTagIntoPrompt(img.tag)}
                    className="px-2 py-0.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/40 border border-purple-500/40 text-[10px] font-bold text-purple-300 transition-all flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>{img.tag}</span>
                  </button>
                ))}
                {videoPreview && (
                  <button
                    type="button"
                    onClick={() => insertTagIntoPrompt('driving video')}
                    className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/40 text-[10px] font-bold text-amber-300 transition-all flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>driving video</span>
                  </button>
                )}
              </div>
            )}

            <div className="relative">
              {/* Autocomplete mention popover */}
              <AnimatePresence>
                {mentionSearch !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="absolute bottom-full mb-2 left-0 right-0 z-50 bg-[#0d0f15]/95 backdrop-blur-2xl border-2 border-amber-400/80 rounded-2xl shadow-[0_-15px_45px_rgba(251,191,36,0.25)] overflow-hidden flex flex-col max-h-[260px]"
                  >
                    <div className="p-2.5 border-b border-white/10 bg-amber-400/10 flex items-center justify-between">
                      <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
                        <TagIcon size={12} weight="bold" />
                        <span>Tag Active Studio Media</span>
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setMentionSearch(null)} 
                        className="text-zinc-400 hover:text-white p-0.5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <div className="overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                      {filteredMentionSlots.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-[11px] text-zinc-400 font-medium">No uploaded slot matches &quot;@{mentionSearch}&quot;</p>
                          <p className="text-[9px] text-zinc-500 mt-1">Upload images (Image 1, 2) or source video to tag them</p>
                        </div>
                      ) : (
                        filteredMentionSlots.map((slot, idx) => (
                          <button
                            key={slot.id || idx}
                            type="button"
                            onClick={() => selectMentionSlot(slot)}
                            className={`w-full p-2 rounded-xl flex items-center gap-2.5 text-left transition-all group ${
                              idx === mentionIndex 
                                ? 'bg-amber-400 text-black font-bold shadow-md' 
                                : 'hover:bg-white/10 text-white'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/60 border border-white/15 shrink-0 flex items-center justify-center">
                              {slot.type === 'video' ? (
                                <video src={slot.url} className="w-full h-full object-cover" muted />
                              ) : slot.type === 'audio' ? (
                                <MusicNotes size={14} className={idx === mentionIndex ? "text-black" : "text-rose-400"} />
                              ) : (
                                <img src={slot.url} alt={slot.label} className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black truncate">{slot.tag}</span>
                                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${idx === mentionIndex ? 'bg-black/20 text-black' : 'bg-amber-400/20 text-amber-300'}`}>
                                  {slot.token}
                                </span>
                              </div>
                              <p className={`text-[9px] truncate ${idx === mentionIndex ? 'text-black/80 font-medium' : 'text-zinc-400'}`}>
                                {slot.desc}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <textarea
                ref={promptTextareaRef}
                value={prompt}
                onChange={handlePromptChange}
                onKeyDown={handlePromptKeyDown}
                rows={3}
                placeholder="e.g. Extract the character from Image 1 and clothing styling from Image 2 while preserving exact motion... Type @ to tag media"
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all resize-none font-sans"
              />
            </div>
          </div>

          {/* Resolution Options with Credit Cost */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center justify-between">
              <span>Resolution Quality</span>
              <span className="text-xs font-bold text-amber-400">{costAmount} Shorts</span>
            </label>
            <div className="grid grid-cols-3 gap-2 bg-white/[0.02] p-1 rounded-xl border border-white/10">
              {[
                { id: '480p', label: '480p SD', cost: '5 Shorts' },
                { id: '720p', label: '720p HD', cost: '8 Shorts' },
                { id: '1080p', label: '1080p FHD', cost: '12 Shorts' },
              ].map((res) => (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => setResolution(res.id)}
                  className={`py-2 px-1 text-center rounded-lg transition-all ${
                    resolution === res.id
                      ? 'bg-amber-400 text-black font-black shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs leading-none">{res.label}</div>
                  <div className={`text-[9px] mt-0.5 ${resolution === res.id ? 'text-black/80 font-bold' : 'text-zinc-500'}`}>{res.cost}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2 text-xs text-red-300">
              <WarningCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Synthesize Button */}
          <div className="pt-2">
            <button
              onClick={handleStartRemix}
              disabled={isGenerating}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2.5 transition-all ${
                isGenerating
                  ? 'bg-amber-500/30 text-amber-200 cursor-not-allowed border border-amber-500/40'
                  : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-black shadow-[0_0_25px_rgba(251,191,36,0.4)] active:scale-[0.98]'
              }`}
            >
              {isGenerating ? (
                <>
                  <ArrowsClockwise size={20} className="animate-spin" />
                  <span>Processing Motion Transfer ({generationProgress}%)</span>
                </>
              ) : (
                <>
                  <Lightning size={20} weight="fill" />
                  <span>Generate Motion Remix ({costAmount} Shorts)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Viewport: Real-time Player & Generation Canvas */}
        <div className="flex-1 flex flex-col min-h-0 bg-black/40 overflow-y-auto custom-scrollbar p-6 space-y-6">
          
          {/* Main Display Stage */}
          <div className="w-full flex-1 min-h-[440px] rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl relative overflow-hidden flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.8)]">
            
            {isGenerating ? (
              <div className="flex flex-col items-center gap-4 text-center p-6 z-10">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full border-4 border-amber-500/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-amber-400">
                    {generationProgress}%
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">{statusMessage}</h3>
                  <p className="text-xs text-zinc-400 mt-1">Preserving actor motion, camera trajectory, and frame timing...</p>
                </div>
              </div>
            ) : generatedResult ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
                <video
                  src={generatedResult.url}
                  className="w-full h-full object-contain max-h-[580px] rounded-2xl shadow-2xl"
                  controls
                  autoPlay
                  loop
                />
                
                {/* Overlay Action Bar */}
                <div className="absolute top-6 right-6 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(generatedResult.url)}
                    className="p-2.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Copy size={16} />
                    <span>{copiedUrl ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                  <a
                    href={generatedResult.url}
                    download="remix-motion-transfer.mp4"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-amber-400 text-black font-bold hover:bg-amber-300 transition-all flex items-center gap-1.5 text-xs"
                  >
                    <DownloadSimple size={16} weight="bold" />
                    <span>Download MP4</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center p-6 text-zinc-500 max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-zinc-600">
                  <FilmSlate size={32} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Ready for Motion Transfer Synthesis</h3>
                  <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                    Upload your source video on the left, add 1-8 reference images of your desired character or art style, and click Generate Motion Remix.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* History / Recent Remixes Carousel */}
          {remixHistory.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Clock size={16} />
                <span>Recent Motion Transfer Generations ({remixHistory.length})</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {remixHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setGeneratedResult(item)}
                    className="group relative rounded-2xl border border-white/10 hover:border-amber-400/50 bg-white/[0.02] p-2.5 cursor-pointer transition-all overflow-hidden"
                  >
                    <div className="w-full h-28 rounded-xl bg-black overflow-hidden relative">
                      <video src={item.url} className="w-full h-full object-cover" muted />
                      <div className="absolute inset-0 bg-black/40 group-hover:opacity-0 transition-opacity flex items-center justify-center">
                        <Play size={22} className="text-white opacity-80" />
                      </div>
                    </div>
                    <div className="p-1 mt-1">
                      <p className="text-[11px] text-zinc-200 truncate font-medium">{item.prompt}</p>
                      <div className="flex items-center justify-between text-[9px] text-zinc-500 mt-0.5">
                        <span>{item.createdAt}</span>
                        <span className="font-bold text-amber-400/80">{item.resolution}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gallery Modal Picker */}
      <AnimatePresence>
        {showGalleryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-4xl max-h-[85vh] bg-zinc-900 border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative"
            >
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center">
                    <FolderOpen size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Select Asset from Studio Library ({galleryTarget === 'video' ? 'Driving Video' : galleryTarget === 'audio' ? 'Audio Track' : galleryTarget === 'startFrame' ? 'Start Frame' : galleryTarget === 'endFrame' ? 'End Frame' : 'Reference Image'})
                    </h3>
                    <p className="text-[11px] text-zinc-400">Click any media item to select and attach to your motion remix</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGalleryModal(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <AssetsLibrary
                  compact={true}
                  defaultTab={galleryTarget === 'video' ? 'videos' : 'images'}
                  onSelectReference={handleGallerySelect}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

