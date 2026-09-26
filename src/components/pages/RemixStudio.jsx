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

  const fileInputVideoRef = useRef(null);
  const fileInputImageRef = useRef(null);
  const promptTextareaRef = useRef(null);

  const { shorts, spend, refund, canAfford } = useShorts();
  const userProfile = useAppStore(state => state.userProfile);

  const isSwapMode = activeMode === 'object-swap';
  const costKey = isSwapMode ? `object_swap_${resolution}` : `remix_motion_transfer_${resolution}`;
  const costAmount = SHORTS_COST[costKey] || 8;

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

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const dataUrl = await fileToDataUrl(file);
      setVideoPreview(dataUrl);
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
  const handleGallerySelect = (url, item) => {
    if (galleryTarget === 'video') {
      setVideoPreview(url);
      setVideoFile(null);
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

    // Check Credits
    if (!canAfford(costKey)) {
      setErrorMessage(`Insufficient Shorts balance. You need ${costAmount} Shorts for ${resolution} ${isSwapMode ? 'Object Swap' : 'Motion Remix'}.`);
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
      setErrorMessage(err.message || `Generation failed on Higgsfield engine.`);
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
    <div className="flex-1 h-full w-full bg-[#0a0c10] text-white flex flex-col overflow-hidden relative font-sans">
      {/* Top Header Bar */}
      <div className="h-12 sm:h-14 border-b border-white/10 px-3 sm:px-6 flex items-center justify-between bg-black/40 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs sm:text-sm font-bold text-white tracking-wide px-2.5 py-1 rounded-lg bg-white/10 border border-white/10">Create Video</span>
            <span className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded-lg transition-colors cursor-pointer hidden sm:inline-block">Edit Video</span>
            <span className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded-lg transition-colors cursor-pointer hidden sm:inline-block">Motion Control</span>
          </div>
        </div>

        {/* Credit Pill */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] sm:text-xs text-zinc-300">
            <Coins size={14} className="text-[#D4FF00]" />
            <span className="hidden sm:inline">Shorts Balance:</span>
            <span className="font-bold text-white">{shorts ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden z-10">
        
        {/* Left Controls Column (Compact, Adjacent, Low-Padding) */}
        <div className="w-full lg:w-[390px] xl:w-[430px] border-r border-white/10 bg-[#0d0f14] flex flex-col min-h-0 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-2.5 sm:space-y-3 shrink-0">
          
          {/* Mode Pill Toggle (Motion Transfer vs Objects Swap) */}
          <div className="grid grid-cols-2 gap-1 bg-black/50 p-1 rounded-xl border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => handleModeChange('motion-transfer')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                !isSwapMode
                  ? 'bg-zinc-800 text-white border border-white/20 shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ArrowsClockwise size={14} weight={!isSwapMode ? "bold" : "regular"} className={!isSwapMode ? "text-[#D4FF00]" : ""} />
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
              <Cube size={14} weight={isSwapMode ? "bold" : "regular"} className={isSwapMode ? "text-[#D4FF00]" : ""} />
              <span>Objects swap</span>
            </button>
          </div>

          {/* Hidden File Inputs */}
          <input type="file" accept="video/*" ref={fileInputVideoRef} onChange={handleVideoUpload} className="hidden" />
          <input type="file" accept="image/*" multiple ref={fileInputImageRef} onChange={handleImageUpload} className="hidden" />

          {/* Combined Adjacent Media Setup Box */}
          <div className="rounded-xl border border-white/10 bg-black/30 divide-y divide-white/10 overflow-hidden shrink-0">
            {/* Card 1: Reference Video Input */}
            <div 
              onClick={() => !videoPreview && fileInputVideoRef.current?.click()}
              className="p-3 hover:bg-white/[0.02] transition-all cursor-pointer group"
            >
              {videoPreview ? (
                <div className="relative w-full h-28 rounded-lg overflow-hidden bg-black">
                  <video src={videoPreview} className="w-full h-full object-cover" muted loop autoPlay />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); fileInputVideoRef.current?.click(); }}
                      className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-[11px] font-bold text-white transition-all"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setGalleryTarget('video'); setShowGalleryModal(true); }}
                      className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-[11px] font-bold text-white transition-all"
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
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:text-white group-hover:bg-zinc-700 shrink-0 transition-all">
                    <VideoCamera size={18} weight="fill" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-white truncate">
                      {isSwapMode ? 'Add a video to swap objects' : 'Add reference video for motion'}
                    </h3>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Duration: 4–30 seconds</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); fileInputVideoRef.current?.click(); }}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] text-zinc-200 font-semibold transition-all"
                    >
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setGalleryTarget('video'); setShowGalleryModal(true); }}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] text-zinc-200 font-semibold transition-all"
                    >
                      Gallery
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Reference Characters, Products, or Clothes */}
            <div className="p-3 space-y-2">
              <div 
                onClick={() => fileInputImageRef.current?.click()}
                className="flex items-center justify-between p-2 rounded-lg border border-dashed border-white/15 hover:border-white/30 hover:bg-white/[0.02] cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex items-center -space-x-1 shrink-0">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 border border-white/15 flex items-center justify-center text-zinc-300">
                      <ImageIcon size={12} />
                    </div>
                    <div className="w-6 h-6 rounded-full bg-zinc-800 border border-white/15 flex items-center justify-center text-zinc-300">
                      <Package size={12} />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-bold text-white truncate">Add characters, products or clothes</h4>
                    <span className="text-[10px] text-zinc-400">Max 8 images ({referenceImages.length}/8)</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); fileInputImageRef.current?.click(); }}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] text-zinc-200 font-semibold transition-all"
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setGalleryTarget('image'); setShowGalleryModal(true); }}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] text-zinc-200 font-semibold transition-all"
                  >
                    Gallery
                  </button>
                </div>
              </div>

              {/* Thumbnail Grid with Sequential Badges */}
              {referenceImages.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                  {referenceImages.map((img, idx) => (
                    <div key={img.id || idx} className="relative group rounded-lg overflow-hidden border border-white/15 bg-black aspect-square shadow-sm">
                      <img src={img.url} alt={img.tag} className="w-full h-full object-cover" />
                      
                      {/* Sequential Tag Badge */}
                      <div className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/80 text-[#D4FF00] font-black text-[8px] uppercase tracking-wider border border-[#D4FF00]/40">
                        {img.tag}
                      </div>

                      {/* Quick Insert Tag Action */}
                      <button
                        type="button"
                        onClick={() => insertTagIntoPrompt(img.tag)}
                        className="absolute bottom-1 left-1 right-1 py-0.5 rounded bg-black/80 hover:bg-[#D4FF00] hover:text-black text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1"
                        title="Insert tag into prompt"
                      >
                        <TagIcon size={9} />
                        <span>Tag</span>
                      </button>

                      {/* Remove Action */}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 p-0.5 bg-red-500/80 hover:bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Transformation Prompt Section with Auto-Expanding Height & Inline @ Autocomplete */}
          <div className="space-y-1.5 shrink-0">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                Prompt Instructions
              </label>
              <span className="text-[10px] text-zinc-400">Type @ to tag references</span>
            </div>

            {/* Reference Tags Helper Chips */}
            {referenceImages.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-white/[0.02] border border-white/10">
                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider pl-1">Tags:</span>
                {referenceImages.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => insertTagIntoPrompt(img.tag)}
                    className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[9px] font-bold text-[#D4FF00] transition-all flex items-center gap-0.5"
                  >
                    <span>+</span>
                    <span>{img.tag}</span>
                  </button>
                ))}
                {videoPreview && (
                  <button
                    type="button"
                    onClick={() => insertTagIntoPrompt(isSwapMode ? 'scene video' : 'driving video')}
                    className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[9px] font-bold text-white transition-all flex items-center gap-0.5"
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
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="absolute bottom-full mb-1.5 left-0 right-0 z-50 bg-[#0d0f15]/95 backdrop-blur-2xl border border-[#D4FF00]/80 rounded-xl shadow-[0_-12px_35px_rgba(212,255,0,0.25)] overflow-hidden flex flex-col max-h-[220px]"
                  >
                    <div className="p-2 border-b border-white/10 bg-[#D4FF00]/10 flex items-center justify-between">
                      <span className="text-[10px] font-black text-[#D4FF00] uppercase tracking-widest flex items-center gap-1">
                        <TagIcon size={11} weight="bold" />
                        <span>Tag Active Studio Media</span>
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setMentionSearch(null)} 
                        className="text-zinc-400 hover:text-white p-0.5 rounded hover:bg-white/10 transition-colors"
                      >
                        <X size={11} />
                      </button>
                    </div>

                    <div className="overflow-y-auto custom-scrollbar p-1 space-y-0.5">
                      {filteredMentionSlots.length === 0 ? (
                        <div className="p-3 text-center">
                          <p className="text-[10px] text-zinc-400 font-medium">No slot matches &quot;@{mentionSearch}&quot;</p>
                          <p className="text-[9px] text-zinc-500 mt-0.5">Upload images or video to tag them</p>
                        </div>
                      ) : (
                        filteredMentionSlots.map((slot, idx) => (
                          <button
                            key={slot.id || idx}
                            type="button"
                            onClick={() => selectMentionSlot(slot)}
                            className={`w-full p-1.5 rounded-lg flex items-center gap-2 text-left transition-all group ${
                              idx === mentionIndex 
                                ? 'bg-[#D4FF00] text-black font-bold shadow-sm' 
                                : 'hover:bg-white/10 text-white'
                            }`}
                          >
                            <div className="w-7 h-7 rounded overflow-hidden bg-black/60 border border-white/15 shrink-0 flex items-center justify-center">
                              {slot.type === 'video' ? (
                                <video src={slot.url} className="w-full h-full object-cover" muted />
                              ) : (
                                <img src={slot.url} alt={slot.label} className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black truncate">{slot.tag}</span>
                                <span className={`text-[8px] font-mono px-1 py-0.2 rounded ${idx === mentionIndex ? 'bg-black/20 text-black' : 'bg-[#D4FF00]/20 text-[#D4FF00]'}`}>
                                  {slot.token}
                                </span>
                              </div>
                              <p className={`text-[8px] truncate ${idx === mentionIndex ? 'text-black/80 font-medium' : 'text-zinc-400'}`}>
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
                rows={2}
                placeholder={isSwapMode 
                  ? "Describe which object to replace and how Image 1 should be integrated... Type @ to tag media" 
                  : "e.g. Extract the character from Image 1 and clothing styling from Image 2 while preserving exact motion... Type @ to tag media"}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#D4FF00]/80 focus:ring-1 focus:ring-[#D4FF00]/30 transition-all resize-none font-sans custom-scrollbar min-h-[56px] max-h-[180px]"
              />
            </div>
          </div>

          {/* Resolution Dropdown Quality Selector */}
          <div className="space-y-1 shrink-0">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                Quality & Resolution
              </label>
              <span className="text-[11px] font-bold text-[#D4FF00]">{costAmount} Shorts</span>
            </div>

            <div className="relative">
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full appearance-none bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#D4FF00]/80 cursor-pointer transition-colors"
              >
                <option value="480p" className="bg-zinc-900 text-white">480p SD · Fast Generation (5 Shorts)</option>
                <option value="720p" className="bg-zinc-900 text-white">720p HD · Standard High Quality (8 Shorts)</option>
                <option value="1080p" className="bg-zinc-900 text-white">1080p Full HD · Studio Master (12 Shorts)</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                <CaretDown size={13} weight="bold" />
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2 text-xs text-red-300 shrink-0">
              <WarningCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Bottom High-Visibility Generate Button */}
          <div className="pt-1 shrink-0">
            <button
              onClick={handleStartGeneration}
              disabled={isGenerating}
              className={`w-full py-3 sm:py-3.5 rounded-xl font-black uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                isGenerating
                  ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed border border-white/10'
                  : 'bg-[#D4FF00] hover:bg-[#bce400] text-black shadow-[0_0_25px_rgba(212,255,0,0.3)] active:scale-[0.98]'
              }`}
            >
              {isGenerating ? (
                <>
                  <ArrowsClockwise size={18} className="animate-spin text-[#D4FF00]" />
                  <span>Processing ({generationProgress}%)</span>
                </>
              ) : (
                <>
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Viewport: Real-time Player & Generation Canvas */}
        <div className="flex-1 flex flex-col min-h-0 bg-black/40 overflow-y-auto custom-scrollbar p-3 sm:p-5 space-y-4">
          
          {/* Main Display Stage */}
          <div className="w-full flex-1 min-h-[300px] sm:min-h-[380px] lg:min-h-[440px] rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl relative overflow-hidden flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.8)]">
            
            {isGenerating ? (
              <div className="flex flex-col items-center gap-3 text-center p-4 sm:p-6 z-10">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-[#D4FF00] border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-xs sm:text-sm font-black text-[#D4FF00]">
                    {generationProgress}%
                  </div>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">{statusMessage}</h3>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {isSwapMode 
                      ? 'Replacing object geometry while preserving lighting & reflections...' 
                      : 'Preserving actor motion, camera trajectory, and frame timing...'}
                  </p>
                </div>
              </div>
            ) : generatedResult ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center p-2 sm:p-4">
                <video
                  src={generatedResult.url}
                  className="w-full h-full object-contain max-h-[560px] rounded-xl shadow-2xl"
                  controls
                  autoPlay
                  loop
                />
                
                {/* Overlay Action Bar */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(generatedResult.url)}
                    className="p-2 sm:p-2.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all flex items-center gap-1 text-xs font-semibold"
                  >
                    <Copy size={14} />
                    <span className="hidden sm:inline">{copiedUrl ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                  <a
                    href={generatedResult.url}
                    download={isSwapMode ? "genjutsu-object-swap.mp4" : "remix-motion-transfer.mp4"}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 sm:p-2.5 rounded-lg bg-[#D4FF00] text-black font-bold hover:bg-[#bce400] transition-all flex items-center gap-1 text-xs"
                  >
                    <DownloadSimple size={14} weight="bold" />
                    <span>Download</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5 text-center p-4 sm:p-6 text-zinc-500 max-w-md">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-zinc-600">
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
                  <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
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
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Clock size={14} />
                <span>Recent Studio Generations ({historyList.length})</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {historyList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setGeneratedResult(item)}
                    className="group relative rounded-xl border border-white/10 hover:border-[#D4FF00]/50 bg-white/[0.02] p-2 cursor-pointer transition-all overflow-hidden"
                  >
                    <div className="w-full h-24 rounded-lg bg-black overflow-hidden relative">
                      <video src={item.url} className="w-full h-full object-cover" muted />
                      <div className="absolute inset-0 bg-black/40 group-hover:opacity-0 transition-opacity flex items-center justify-center">
                        <Play size={20} className="text-white opacity-80" />
                      </div>
                      <div className={`absolute top-1 left-1 px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider ${item.mode === 'object-swap' ? 'bg-cyan-400 text-black' : 'bg-[#D4FF00] text-black'}`}>
                        {item.mode === 'object-swap' ? 'Swap' : 'Remix'}
                      </div>
                    </div>
                    <div className="p-0.5 mt-1">
                      <p className="text-[10px] text-zinc-200 truncate font-medium">{item.prompt}</p>
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
