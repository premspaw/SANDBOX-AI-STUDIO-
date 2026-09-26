import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowsClockwise, 
  Sparkle, 
  VideoCamera, 
  UploadSimple, 
  Play, 
  Pause, 
  Lightning, 
  Coins, 
  CheckCircle, 
  WarningCircle, 
  Info, 
  DownloadSimple, 
  ShareNetwork,
  FilmSlate,
  Clock,
  Plus,
  Trash,
  LinkSimple,
  Copy,
  MagicWand,
  Package,
  Watch,
  Cube,
  Tag as TagIcon,
  Image as ImageIcon,
  FolderOpen,
  MusicNotes,
  FilmStrip,
  X,
  CaretDown,
  PencilSimple
} from '@phosphor-icons/react';
import { useAppStore } from '../../store';
import { useShorts } from '../../hooks/useShorts';
import { SHORTS_COST } from '../../config/shortsConfig';
import { AssetsLibrary } from '../panels/AssetsLibrary';

export default function RemixStudio({ initialMode = 'motion-transfer' }) {
  // Mode: 'motion-transfer' | 'object-swap'
  const [activeMode, setActiveMode] = useState(initialMode);

  const defaultMotionPrompt = 'Transform the subject from Image 1 with cinematic lighting, dynamic styling and high-end aesthetic fidelity while preserving the exact motion from driving video';
  const defaultSwapPrompt = 'Swap the target object in the video with the reference item from Image 1, preserving flawless lighting, depth, and motion dynamics.';

  const [prompt, setPrompt] = useState(initialMode === 'object-swap' ? defaultSwapPrompt : defaultMotionPrompt);
  const [resolution, setResolution] = useState('720p');
  
  // Media State
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');

  // Array of { id, url, tag: 'Image 1', token: '@image1', name: string }
  const [referenceImages, setReferenceImages] = useState([]); 

  // Additional Media
  const [audioUrl, setAudioUrl] = useState('');
  const [startFrameUrl, setStartFrameUrl] = useState('');
  const [endFrameUrl, setEndFrameUrl] = useState('');

  // Gallery Picker State
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState('image'); // 'image' | 'video'

  // Autocomplete Mentions Query State (@image1, @video1, etc.)
  const [mentionSearch, setMentionSearch] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionCursorPos, setMentionCursorPos] = useState(0);

  // Generation & Progress State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedResult, setGeneratedResult] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [videoDuration, setVideoDuration] = useState(5);

  const fileInputVideoRef = useRef(null);
  const fileInputImageRef = useRef(null);
  const promptTextareaRef = useRef(null);

  const { shorts, spend, refund, canAfford } = useShorts();
  const userProfile = useAppStore(state => state.userProfile);

  const isSwapMode = activeMode === 'object-swap';
  const ratePerSec = resolution === '480p' ? 5 : resolution === '1080p' ? 12 : 8;
  const effectiveDuration = Math.max(1, Math.round(videoDuration || 5));
  const costAmount = ratePerSec * effectiveDuration;
  const costKey = isSwapMode ? `object_swap_${resolution}` : `remix_motion_transfer_${resolution}`;

  // Switch Mode handler
  const handleModeChange = (mode) => {
    setActiveMode(mode);
    setErrorMessage('');
    if (mode === 'object-swap') {
      if (prompt === defaultMotionPrompt || !prompt.trim()) {
        setPrompt(defaultSwapPrompt);
      }
    } else {
      if (prompt === defaultSwapPrompt || !prompt.trim()) {
        setPrompt(defaultMotionPrompt);
      }
    }
  };

  // Convert File to Base64 Data URL
  const fileToDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Probe Video Duration in seconds
  const probeVideoDuration = (dataUrlOrBlob) => {
    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => {
        const dur = v.duration && !isNaN(v.duration) ? Math.round(v.duration) : 5;
        resolve(Math.max(1, dur));
      };
      v.onerror = () => resolve(5);
      v.src = dataUrlOrBlob;
    });
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const dataUrl = await fileToDataUrl(file);
      setVideoPreview(dataUrl);
      const dur = await probeVideoDuration(dataUrl);
      setVideoDuration(dur);
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

  const handleRemoveImage = (indexToRemove) => {
    setReferenceImages(prev => {
      const filtered = prev.filter((_, idx) => idx !== indexToRemove);
      // Re-index tags so Image 1, Image 2 remain contiguous
      return filtered.map((img, idx) => ({
        ...img,
        tag: `Image ${idx + 1}`,
        token: `@image${idx + 1}`
      }));
    });
  };

  // Active mention slots (strictly uploaded / active inputs in this studio session only - no history pollution)
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
        id: 'slot_video',
        name: 'video1',
        token: '@video1',
        tag: isSwapMode ? 'Scene Video' : 'Driving Video',
        label: isSwapMode ? 'Scene Video' : 'Driving Video',
        desc: isSwapMode ? 'Source Scene Video' : 'Source Motion Video',
        url: videoPreview,
        type: 'video'
      });
    }
    return slots;
  }, [referenceImages, videoPreview, isSwapMode]);

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

  const handlePromptInput = (e) => {
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(Math.max(target.scrollHeight, 72), 240)}px`;
    handlePromptChange(e);
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

  // Handle Gallery Modal Pick
  const handleGallerySelect = async (url, item) => {
    if (galleryTarget === 'video') {
      setVideoPreview(url);
      setVideoFile(null);
      const dur = item?.duration ? Math.round(Number(item.duration)) : await probeVideoDuration(url);
      setVideoDuration(dur || 5);
    } else {
      // Default: Image reference
      addImagesWithTags([{ url, name: item?.name || 'Gallery Asset' }]);
    }
    setShowGalleryModal(false);
    setErrorMessage('');
  };

  const handleStartGeneration = async () => {
    if (isGenerating) return;
    setErrorMessage('');

    const sourceVideo = videoPreview;
    if (!sourceVideo) {
      setErrorMessage(`Please add a reference video.`);
      return;
    }

    if (referenceImages.length === 0) {
      setErrorMessage(`Please add at least 1 character, product, or style reference image.`);
      return;
    }

    // Check Credits (Per-Second Dynamic Cost)
    if (!canAfford(costKey, costAmount)) {
      setErrorMessage(`Insufficient Shorts balance. You need ${costAmount} Shorts (${ratePerSec} Shorts/s × ${effectiveDuration}s) for ${resolution} ${isSwapMode ? 'Object Swap' : 'Motion Remix'}.`);
      return;
    }

    // Deduct credits
    const spendRes = await spend(costKey, costAmount);
    if (!spendRes.success) {
      setErrorMessage('Failed to deduct credits. Please check your Shorts balance.');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(10);
    setStatusMessage(isSwapMode ? 'Initiating Genjutsu Object Swap Engine...' : 'Initiating Genjutsu Motion Transfer Engine...');

    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 92) return 92;
        if (isSwapMode) {
          if (prev < 30) setStatusMessage('Analyzing Scene Geometry & Tracking Objects...');
          else if (prev < 55) setStatusMessage('Segmenting Target Items & Boundaries (Image 1, Image 2)...');
          else if (prev < 78) setStatusMessage('Neural Inpainting & Object Material Swap...');
          else setStatusMessage('Synthesizing Motion Consistency & Reflections...');
        } else {
          if (prev < 30) setStatusMessage('Uploading & Analyzing Source Motion DNA...');
          else if (prev < 60) setStatusMessage('Mapping Character References (Image 1, Image 2)...');
          else setStatusMessage('Synthesizing Neural Motion Transfer Layers...');
        }
        return prev + Math.floor(Math.random() * 8 + 4);
      });
    }, 1800);

    const endpoint = isSwapMode ? '/api/remix/object-swap' : '/api/remix/motion-transfer';

    try {
      const response = await fetch(endpoint, {
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
          resolution,
          userId: userProfile?.id
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Failed to complete ${isSwapMode ? 'Object Swap' : 'Motion Remix'}.`);
      }

      clearInterval(progressInterval);
      setGenerationProgress(100);
      setStatusMessage(`${isSwapMode ? 'Object Swap' : 'Motion Remix'} Synthesis Complete!`);

      const newItem = {
        id: data.requestId || `${isSwapMode ? 'swap' : 'remix'}-${Date.now()}`,
        mode: activeMode,
        prompt,
        resolution,
        url: data.videoUrl || data.originalUrl,
        zipUrl: data.zipUrl,
        movUrl: data.movUrl,
        jsxUrl: data.jsxUrl,
        fbxUrl: data.fbxUrl,
        plyUrl: data.plyUrl,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setGeneratedResult(newItem);
      setHistoryList(prev => [newItem, ...prev]);
      setIsGenerating(false);

    } catch (err) {
      console.error(`[RemixStudio] ${isSwapMode ? 'Object Swap' : 'Motion Remix'} error:`, err);
      clearInterval(progressInterval);
      setIsGenerating(false);
      setErrorMessage(err.message || `Generation failed on engine.`);
      // Refund credits
      await refund(costKey, costAmount);
    }
  };

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="flex-1 h-full w-full bg-[#0a0c10] text-white flex flex-col overflow-hidden relative font-sans">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-white/10 px-6 flex items-center justify-between bg-black/40 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white tracking-wide">Create Video</span>
            <span className="text-xs text-zinc-500 font-medium hover:text-zinc-300 cursor-pointer transition-colors">Edit Video</span>
            <span className="text-xs text-zinc-500 font-medium hover:text-zinc-300 cursor-pointer transition-colors">Motion Control</span>
          </div>
        </div>

        {/* Credit Pill */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-zinc-300">
            <Coins size={15} className="text-[#D4FF00]" />
            <span>Shorts Balance:</span>
            <span className="font-bold text-white">{shorts ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden z-10">
        
        {/* Left Controls Column */}
        <div className="w-full lg:w-[380px] xl:w-[420px] border-r border-white/10 bg-[#0d0f14] flex flex-col min-h-0 overflow-y-auto custom-scrollbar p-3.5 space-y-3 shrink-0">
          
          {/* Mode Pill Toggle (Motion Transfer vs Objects Swap) */}
          <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => handleModeChange('motion-transfer')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                !isSwapMode
                  ? 'bg-zinc-800 text-white border border-white/20 shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ArrowsClockwise size={15} weight={!isSwapMode ? "bold" : "regular"} className={!isSwapMode ? "text-[#D4FF00]" : ""} />
              <span>Motion transfer</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('object-swap')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                isSwapMode
                  ? 'bg-zinc-800 text-white border border-white/20 shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Cube size={15} weight={isSwapMode ? "bold" : "regular"} className={isSwapMode ? "text-[#D4FF00]" : ""} />
              <span>Objects swap</span>
            </button>
          </div>

          {/* Hidden File Inputs */}
          <input type="file" accept="video/*" ref={fileInputVideoRef} onChange={handleVideoUpload} className="hidden" />
          <input type="file" accept="image/*" multiple ref={fileInputImageRef} onChange={handleImageUpload} className="hidden" />

          {/* Card 1: Reference Video Input */}
          <div 
            onClick={() => !videoPreview && fileInputVideoRef.current?.click()}
            className="relative rounded-2xl border border-white/10 hover:border-white/25 bg-black/30 hover:bg-white/[0.02] p-3.5 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[120px] group overflow-hidden"
          >
            {videoPreview ? (
              <div className="relative w-full h-28 rounded-xl overflow-hidden bg-black">
                <video src={videoPreview} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/70 border border-white/20 text-[9px] font-mono font-bold text-[#D4FF00]">
                  {effectiveDuration}s
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); fileInputVideoRef.current?.click(); }}
                    className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-xs font-bold text-white transition-all"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setGalleryTarget('video'); setShowGalleryModal(true); }}
                    className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-xs font-bold text-white transition-all"
                  >
                    Gallery
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setVideoPreview(''); setVideoFile(null); }}
                    className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition-all"
                  >
                    <Trash size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-9 h-9 rounded-full bg-zinc-800/80 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:text-white group-hover:bg-zinc-700 transition-all">
                  <VideoCamera size={18} weight="fill" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    {isSwapMode ? 'Add a video to swap objects' : 'Add a reference video to extract motion'}
                  </h3>
                  <p className="text-[10.5px] text-zinc-400 mt-0.5">Video duration: 3–30 seconds</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); fileInputVideoRef.current?.click(); }}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-zinc-300 font-medium transition-all"
                  >
                    From Computer
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setGalleryTarget('video'); setShowGalleryModal(true); }}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-zinc-300 font-medium transition-all"
                  >
                    From Gallery
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Reference Characters, Products, or Clothes */}
          <div className="relative rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3">
            <div 
              onClick={() => fileInputImageRef.current?.click()}
              className="flex flex-col items-center justify-center text-center p-3 rounded-xl border border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.02] cursor-pointer transition-all group"
            >
              {/* Top Icons Row */}
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-300">
                  <ImageIcon size={15} />
                </div>
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-300">
                  <Package size={15} />
                </div>
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-300">
                  <Cube size={15} />
                </div>
              </div>

              <h3 className="text-xs font-bold text-white">
                Add your characters, products, or clothes
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Up to 8 images ({referenceImages.length}/8 added)</p>

              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); fileInputImageRef.current?.click(); }}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-zinc-300 font-medium transition-all"
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setGalleryTarget('image'); setShowGalleryModal(true); }}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-zinc-300 font-medium transition-all"
                >
                  Pick from Gallery
                </button>
              </div>
            </div>

            {/* Thumbnail Grid with Sequential Badges */}
            {referenceImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2 pt-1">
                {referenceImages.map((img, idx) => (
                  <div key={img.id || idx} className="relative group rounded-xl overflow-hidden border border-white/15 bg-black aspect-square shadow-md">
                    <img src={img.url} alt={img.tag} className="w-full h-full object-cover" />
                    
                    {/* Sequential Tag Badge */}
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/80 text-[#D4FF00] font-black text-[8px] uppercase tracking-wider border border-[#D4FF00]/40">
                      {img.tag}
                    </div>

                    {/* Quick Insert Tag Action */}
                    <button
                      type="button"
                      onClick={() => insertTagIntoPrompt(img.tag)}
                      className="absolute bottom-1 left-1 right-1 py-1 rounded bg-black/80 hover:bg-[#D4FF00] hover:text-black text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1"
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
                      <Trash size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transformation Prompt Section with Auto-Expanding Height & Inline @ Autocomplete */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Prompt Instructions
              </label>
              <span className="text-[10px] text-zinc-400">Type @ to tag references</span>
            </div>

            {/* Reference Tags Helper Chips */}
            {referenceImages.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-white/[0.02] border border-white/10">
                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider pl-1">Tags:</span>
                {referenceImages.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => insertTagIntoPrompt(img.tag)}
                    className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-bold text-[#D4FF00] transition-all flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>{img.tag}</span>
                  </button>
                ))}
                {videoPreview && (
                  <button
                    type="button"
                    onClick={() => insertTagIntoPrompt(isSwapMode ? 'scene video' : 'driving video')}
                    className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-bold text-white transition-all flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>{isSwapMode ? 'scene video' : 'driving video'}</span>
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
                    className="absolute bottom-full mb-2 left-0 right-0 z-50 bg-[#0d0f15]/95 backdrop-blur-2xl border border-[#D4FF00]/80 rounded-2xl shadow-[0_-15px_45px_rgba(212,255,0,0.25)] overflow-hidden flex flex-col max-h-[260px]"
                  >
                    <div className="p-2.5 border-b border-white/10 bg-[#D4FF00]/10 flex items-center justify-between">
                      <span className="text-[10px] font-black text-[#D4FF00] uppercase tracking-widest flex items-center gap-1.5">
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
                          <p className="text-[9px] text-zinc-500 mt-1">Upload images or video to tag them</p>
                        </div>
                      ) : (
                        filteredMentionSlots.map((slot, idx) => (
                          <button
                            key={slot.id || idx}
                            type="button"
                            onClick={() => selectMentionSlot(slot)}
                            className={`w-full p-2 rounded-xl flex items-center gap-2.5 text-left transition-all group ${
                              idx === mentionIndex 
                                ? 'bg-[#D4FF00] text-black font-bold shadow-md' 
                                : 'hover:bg-white/10 text-white'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/60 border border-white/15 shrink-0 flex items-center justify-center">
                              {slot.type === 'video' ? (
                                <video src={slot.url} className="w-full h-full object-cover" muted />
                              ) : (
                                <img src={slot.url} alt={slot.label} className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black truncate">{slot.tag}</span>
                                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${idx === mentionIndex ? 'bg-black/20 text-black' : 'bg-[#D4FF00]/20 text-[#D4FF00]'}`}>
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
                onInput={handlePromptInput}
                onKeyDown={handlePromptKeyDown}
                rows={3}
                placeholder={isSwapMode 
                  ? "Describe which object to replace and how Image 1 should be integrated... Type @ to tag media" 
                  : "e.g. Extract the character from Image 1 and clothing styling from Image 2 while preserving exact motion... Type @ to tag media"}
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#D4FF00]/80 focus:ring-1 focus:ring-[#D4FF00]/30 transition-all resize-none font-sans custom-scrollbar min-h-[72px] max-h-[240px]"
              />
            </div>
          </div>

          {/* Resolution Dropdown Quality Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Quality & Resolution ({ratePerSec} Shorts/s)
              </label>
              <span className="text-xs font-bold text-[#D4FF00]">{costAmount} Shorts ({effectiveDuration}s)</span>
            </div>

            <div className="relative">
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full appearance-none bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-[#D4FF00]/80 cursor-pointer transition-colors"
              >
                <option value="480p" className="bg-zinc-900 text-white">480p SD · Fast (5 Shorts/s · {5 * effectiveDuration} total)</option>
                <option value="720p" className="bg-zinc-900 text-white">720p HD · Standard (8 Shorts/s · {8 * effectiveDuration} total)</option>
                <option value="1080p" className="bg-zinc-900 text-white">1080p Full HD · Master (12 Shorts/s · {12 * effectiveDuration} total)</option>
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                <CaretDown size={14} weight="bold" />
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2 text-xs text-red-300">
              <WarningCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Bottom High-Visibility Generate Button */}
          <div className="pt-1">
            <button
              onClick={handleStartGeneration}
              disabled={isGenerating}
              className={`w-full py-3.5 rounded-2xl font-black uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                isGenerating
                  ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed border border-white/10'
                  : 'bg-[#D4FF00] hover:bg-[#bce400] text-black shadow-[0_0_30px_rgba(212,255,0,0.35)] active:scale-[0.98]'
              }`}
            >
              {isGenerating ? (
                <>
                  <ArrowsClockwise size={18} className="animate-spin text-[#D4FF00]" />
                  <span>Processing ({generationProgress}%)</span>
                </>
              ) : (
                <>
                  <span>Generate • {costAmount} Shorts ({effectiveDuration}s)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Viewport: Real-time Player & Preview Canvas */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#07080c] overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-3">
          
          {/* Main Display Stage */}
          <div className="w-full flex-1 min-h-[360px] sm:min-h-[460px] rounded-2xl border border-white/10 bg-black/90 backdrop-blur-xl relative overflow-hidden flex items-center justify-center shadow-2xl">
            
            {isGenerating ? (
              <div className="flex flex-col items-center gap-4 text-center p-6 z-10">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-[#D4FF00] border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-[#D4FF00]">
                    {generationProgress}%
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">{statusMessage}</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    {isSwapMode 
                      ? 'Replacing object geometry while preserving lighting & reflections...' 
                      : 'Preserving actor motion, camera trajectory, and frame timing...'}
                  </p>
                </div>
              </div>
            ) : generatedResult ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center p-2">
                <video
                  src={generatedResult.url}
                  className="w-full h-full object-contain max-h-[75vh] rounded-xl shadow-2xl"
                  controls
                  autoPlay
                  loop
                />
                
                {/* Overlay Action Bar */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(generatedResult.url)}
                    className="p-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Copy size={15} />
                    <span>{copiedUrl ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                  <a
                    href={generatedResult.url}
                    download={isSwapMode ? "genjutsu-object-swap.mp4" : "remix-motion-transfer.mp4"}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-[#D4FF00] text-black font-bold hover:bg-[#bce400] transition-all flex items-center gap-1.5 text-xs"
                  >
                    <DownloadSimple size={15} weight="bold" />
                    <span>Download MP4</span>
                  </a>
                </div>
              </div>
            ) : videoPreview ? (
              /* Active Reference Video Player Stage */
              <div className="relative w-full h-full flex flex-col items-center justify-center p-2">
                <video
                  src={videoPreview}
                  className="w-full h-full object-contain max-h-[75vh] rounded-xl shadow-2xl"
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                />
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <div className="px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-[#D4FF00]/40 text-[#D4FF00] text-xs font-bold flex items-center gap-1.5">
                    <VideoCamera size={14} weight="fill" />
                    <span>Reference Video Loaded ({effectiveDuration}s)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center p-6 text-zinc-500 max-w-md">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-zinc-600">
                  {isSwapMode ? (
                    <Cube size={28} />
                  ) : (
                    <FilmSlate size={28} />
                  )}
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-300 uppercase tracking-wider">
                    Ready for {isSwapMode ? 'Object Swap Synthesis' : 'Motion Transfer Synthesis'}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                    {isSwapMode 
                      ? 'Upload your scene video on the left, add reference images of your desired replacement object, and click Generate.' 
                      : 'Upload your source video on the left, add reference images of your desired character or style, and click Generate.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* History / Recent Generations Carousel */}
          {historyList.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Clock size={16} />
                <span>Recent Studio Generations ({historyList.length})</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {historyList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setGeneratedResult(item)}
                    className="group relative rounded-2xl border border-white/10 hover:border-[#D4FF00]/50 bg-white/[0.02] p-2.5 cursor-pointer transition-all overflow-hidden"
                  >
                    <div className="w-full h-28 rounded-xl bg-black overflow-hidden relative">
                      <video src={item.url} className="w-full h-full object-cover" muted />
                      <div className="absolute inset-0 bg-black/40 group-hover:opacity-0 transition-opacity flex items-center justify-center">
                        <Play size={22} className="text-white opacity-80" />
                      </div>
                      <div className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${item.mode === 'object-swap' ? 'bg-cyan-400 text-black' : 'bg-[#D4FF00] text-black'}`}>
                        {item.mode === 'object-swap' ? 'Swap' : 'Remix'}
                      </div>
                    </div>
                    <div className="p-1 mt-1">
                      <p className="text-[11px] text-zinc-200 truncate font-medium">{item.prompt}</p>
                      <div className="flex items-center justify-between text-[9px] text-zinc-500 mt-0.5">
                        <span>{item.createdAt}</span>
                        <span className="font-bold text-[#D4FF00]">{item.resolution}</span>
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
                  <div className="w-8 h-8 rounded-xl bg-[#D4FF00]/20 text-[#D4FF00] flex items-center justify-center">
                    <FolderOpen size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Select Asset from Studio Library ({galleryTarget === 'video' ? 'Reference Video' : 'Reference Image'})
                    </h3>
                    <p className="text-[11px] text-zinc-400">Click any media item to select and attach to your studio synthesis</p>
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
