import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Zap, Grid, Video, Image as ImageIcon, Pencil, Download, Trash2, Palette, Sparkles, Film, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import { resolveUrl, getApiUrl } from '../../config/apiConfig';

export function CinematicLightbox({
  lightboxItem,
  setLightboxItem,
  setGallery,
  handleUpscale,
  handleGenerateAnglesGrid,
  handleDownload,
  handleDeleteItem,
  setShowInpaint,
  setShowStoryboard,
  upscalingItems,
  setUpscalingItems,
  setFirstFrameImage,
  setFirstFramePreview,
  setLastFrameImage,
  setLastFramePreview,
  userId
}) {
  // 3x3 Grid Overlay & Crop Interactive States
  const gridImgRef = useRef(null);
  const gridContainerRef = useRef(null);
  const [overlayStyle, setOverlayStyle] = useState({});

  const isGridActive = lightboxItem && (
    lightboxItem.isGrid ||
    lightboxItem.prompt?.toLowerCase().includes('grid') ||
    lightboxItem.engine?.toLowerCase().includes('grid') ||
    lightboxItem.prompt?.toLowerCase().includes('storyboard') ||
    lightboxItem.engine?.toLowerCase().includes('storyboard') ||
    lightboxItem.prompt?.toLowerCase().includes('contact sheet') ||
    lightboxItem.prompt?.toLowerCase().includes('9-frame') ||
    lightboxItem.prompt?.toLowerCase().includes('3x3')
  );

  // Edit Story States
  const [showEditStoryModal, setShowEditStoryModal] = useState(false);
  const [storyEditInstruction, setStoryEditInstruction] = useState('');
  const [isEditingStory, setIsEditingStory] = useState(false);

  const handleEditStory = async () => {
    if (!storyEditInstruction.trim() || !lightboxItem?.url) return;
    setIsEditingStory(true);
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast("Initiating narrative edit using Gemini...", "info");

    try {
      const spendResult = await useAppStore.getState().spendShorts(userId, 2, 'image_upscale_4k'); // deduct 2 credits for edit
      if (!spendResult.success) {
        setIsEditingStory(false);
        setShowEditStoryModal(false);
        if (spendResult.reason === 'unauthenticated') {
          useAppStore.getState().setShowingAuthModal(true);
        } else {
          useAppStore.getState().setActiveTab('pricing');
        }
        return;
      }

      const draftId = Date.now();
      const draftItem = {
        id: draftId,
        type: 'image',
        url: lightboxItem.url,
        prompt: `${lightboxItem.prompt || 'Subject'} (Editing: "${storyEditInstruction}")`,
        engine: `${lightboxItem.engine || 'Nano Banana 2'} (Editing...)`,
        aspect: lightboxItem.aspect || "16:9",
        ts: draftId,
        isDraft: true
      };

      // Add draft placeholder to the gallery and trigger the loading overlay
      setGallery(prev => [draftItem, ...prev]);
      if (setUpscalingItems) {
        setUpscalingItems(prev => ({ ...prev, [draftId]: true }));
      }

      // Close the modal, lightbox, and clear inputs immediately to keep UI active
      const activeInstruction = storyEditInstruction;
      setShowEditStoryModal(false);
      setStoryEditInstruction('');
      setLightboxItem(null);
      setIsEditingStory(false);

      const prompt = `REGENERATE / EDIT IMAGE:
Edit this image according to this brief/instruction: "${activeInstruction}".
STRICT RULE: Keep the exact same subject identity, scene structure, lighting, and composition. Only apply the requested change. 
[Subject and Context: ${lightboxItem.prompt || 'Cinematic photo'}]`;

      const payload = {
        model: 'gemini-3.1-flash-image',
        prompt: prompt,
        aspect_ratio: lightboxItem.aspect || '16:9',
        referenceImages: [lightboxItem.url],
        userId,
        creditReason: 'image_upscale_4k'
      };

      // Perform fetch request in the background
      fetch(getApiUrl('/api/generate-image'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(async (resp) => {
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.message || errData.error || "Regeneration failed");
        }
        return resp.json();
      })
      .then((data) => {
        if (data.url) {
          const newItem = {
            id: Date.now(),
            type: 'image',
            url: data.url,
            prompt: `${lightboxItem.prompt || 'Subject'} (Edited: ${activeInstruction})`,
            engine: `${lightboxItem.engine || 'Nano Banana 2'} (Edited)`,
            aspect: lightboxItem.aspect || "16:9",
            ts: Date.now()
          };

          // Swap placeholder draft with finished item, remove loading overlay, and focus lightbox on it
          setGallery(prev => [newItem, ...prev.filter(i => i.id !== draftId)]);
          if (setUpscalingItems) {
            setUpscalingItems(prev => ({ ...prev, [draftId]: false }));
          }
          setLightboxItem(newItem);
          if (showToast) showToast("Image successfully edited & saved to gallery!", "success");
        } else {
          throw new Error("No URL returned from server.");
        }
      })
      .catch((err) => {
        console.error("Background regeneration failed:", err);
        setGallery(prev => prev.filter(i => i.id !== draftId));
        if (setUpscalingItems) {
          setUpscalingItems(prev => ({ ...prev, [draftId]: false }));
        }
        if (showToast) showToast(`Edit failed: ${err.message}`, "error");
      });

    } catch (err) {
      console.error("Regeneration trigger failed:", err);
      setIsEditingStory(false);
      if (showToast) showToast(`Edit trigger failed: ${err.message}`, "error");
    }
  };

  const updateOverlay = useCallback(() => {
    const img = gridImgRef.current;
    const container = gridContainerRef.current;
    if (!img || !container) return;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    if (!natW || !natH) return;
    const scale = Math.min(containerW / natW, containerH / natH);
    const renderedW = natW * scale;
    const renderedH = natH * scale;
    const offsetX = (containerW - renderedW) / 2;
    const offsetY = (containerH - renderedH) / 2;

    setOverlayStyle({
      position: 'absolute',
      left: `${offsetX}px`,
      top: `${offsetY}px`,
      width: `${renderedW}px`,
      height: `${renderedH}px`,
    });
  }, []);

  useEffect(() => {
    if (lightboxItem && lightboxItem.type === 'image') {
      const timer = setTimeout(updateOverlay, 150);
      return () => clearTimeout(timer);
    }
  }, [lightboxItem, updateOverlay]);

  useEffect(() => {
    window.addEventListener('resize', updateOverlay);
    return () => window.removeEventListener('resize', updateOverlay);
  }, [updateOverlay]);

  const handleCellClick = async (row, col) => {
    const shotNumber = (row * 3) + col + 1;
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast(`Extracting Angle ${shotNumber}...`, "info");

    // Clean prompt and engine to remove any "Grid" or "Storyboard" markers so that the extracted single image
    // does not trigger the interactive grid overlay UI.
    let cleanPrompt = lightboxItem.prompt || 'Subject';
    cleanPrompt = cleanPrompt
      .replace(/Multi-Angle 3x3 Grid:\s*/gi, '')
      .replace(/\s*-?\s*Grid/gi, '')
      .replace(/^Storyboard:\s*/gi, '')
      .replace(/\s*-?\s*Storyboard/gi, '')
      .split('.')[0];
    if (!cleanPrompt.trim()) cleanPrompt = 'Subject';
    
    let cleanEngine = (lightboxItem.engine || 'Nano Banana 2')
      .replace(/\s*\(Grid\)/gi, '')
      .replace(/\s*\(Storyboard\)/gi, '');

    // Load secure CORS-safe proxied version in background to avoid browser canvas taint
    const loadProxiedImage = () => {
      return new Promise((resolve, reject) => {
        const tempImg = new window.Image();
        tempImg.crossOrigin = "anonymous";
        tempImg.onload = () => resolve(tempImg);
        tempImg.onerror = (err) => reject(new Error("Failed to load secure proxy image."));
        tempImg.src = resolveUrl(lightboxItem.url);
      });
    };

    try {
      const img = await loadProxiedImage();
      const cellW = img.naturalWidth / 3;
      const cellH = img.naturalHeight / 3;
      const canvas = document.createElement('canvas');
      
      // Slightly inset the crop to avoid black border artifacts
      const insetX = cellW * 0.01;
      const insetY = cellH * 0.01;
      const targetW = cellW - (insetX * 2);
      const targetH = cellH - (insetY * 2);

      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, (col * cellW) + insetX, (row * cellH) + insetY, targetW, targetH, 0, 0, targetW, targetH);
      const croppedUrlBase64 = canvas.toDataURL('image/jpeg', 0.9);

      const resp = await fetch(getApiUrl('/api/save-asset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageData: croppedUrlBase64, 
          fileName: `crop_${Date.now()}.png`,
          userId: userId,
          type: 'image',
          aspect: lightboxItem.aspect || '16:9',
          prompt: `${cleanPrompt} - Extracted Angle ${shotNumber}`,
          engine: `${cleanEngine} (Angle ${shotNumber})`,
          isGrid: false
        })
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || `Save failed: ${resp.statusText}`);
      }
      const data = await resp.json();
      const url = data.url || data.path || croppedUrlBase64;
      
      const newItem = {
        id: Date.now(),
        type: 'image',
        url: url,
        prompt: `${cleanPrompt} - Extracted Angle ${shotNumber}`,
        engine: `${cleanEngine} (Angle ${shotNumber})`,
        aspect: lightboxItem.aspect || "16:9",
        ts: Date.now(),
        isGrid: false
      };

      setGallery(prev => [newItem, ...prev]);
      setLightboxItem(null);
      if (showToast) showToast(`Angle ${shotNumber} successfully saved to gallery!`, "success");

      // Auto-trigger 2K upscale / refinement immediately as a new image!
      setTimeout(() => {
        handleUpscale(newItem);
      }, 300);
    } catch (err) {
      console.error("Crop save failed:", err);
      if (showToast) showToast(`Cloud save failed (${err.message}). Falling back to local browser storage.`, "info");
      // Fallback: try to crop from current DOM image directly
      try {
        const img = gridImgRef.current;
        if (!img) throw new Error("Reference image not loaded.");
        const cellW = img.naturalWidth / 3;
        const cellH = img.naturalHeight / 3;
        const canvas = document.createElement('canvas');
        canvas.width = cellW;
        canvas.height = cellH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, col * cellW, row * cellH, cellW, cellH, 0, 0, cellW, cellH);
        const croppedUrlBase64 = canvas.toDataURL('image/jpeg', 0.9);

        const newItem = {
          id: Date.now(),
          type: 'image',
          url: croppedUrlBase64,
          prompt: `${cleanPrompt} - Extracted Angle ${shotNumber}`,
          engine: `${cleanEngine} (Angle ${shotNumber})`,
          aspect: lightboxItem.aspect || "16:9",
          ts: Date.now(),
          isGrid: false
        };
        setGallery(prev => [newItem, ...prev]);
        setLightboxItem(null);
        if (showToast) showToast(`Angle ${shotNumber} extracted to gallery (session fallback).`, "success");

        // Auto-trigger 2K upscale / refinement immediately as a new image on fallback!
        setTimeout(() => {
          handleUpscale(newItem);
        }, 300);
      } catch (fallbackErr) {
        console.error("Fallback crop failed:", fallbackErr);
        if (showToast) showToast("Extraction failed.", "error");
      }
    }
  };

  if (!lightboxItem) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
      onClick={() => setLightboxItem(null)}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative max-w-5xl w-full max-h-[90vh] flex flex-col md:flex-row bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-glass-glow"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={() => setLightboxItem(null)}
          className="absolute top-3 right-3 z-50 w-8 h-8 bg-black/60 border border-white/10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>

        {/* Media Content Area (Left) */}
        <div className="flex-1 bg-black flex items-center justify-center overflow-hidden relative min-h-[320px] md:min-h-[500px]">
          {lightboxItem.type === 'image' ? (
            <div ref={gridContainerRef} className="relative w-full h-full flex items-center justify-center p-4">
              <img
                src={resolveUrl(lightboxItem.url)}
                alt={lightboxItem.prompt}
                ref={gridImgRef}
                onLoad={updateOverlay}
                className={cn(
                  "max-h-[75vh] object-contain shadow-2xl rounded-2xl bg-black/40",
                  lightboxItem.aspect === '9:16' ? 'aspect-[9/16]' : lightboxItem.aspect === '1:1' ? 'aspect-square' : 'aspect-video w-full'
                )}
              />
              {isGridActive && overlayStyle.width && (
                <div style={overlayStyle} className="z-10 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(200,241,53,0.15)]">
                  <div className="w-full h-full grid grid-cols-3 grid-rows-3" style={{ pointerEvents: 'auto' }}>
                    {[...Array(9)].map((_, i) => (
                      <div key={i} onClick={() => handleCellClick(Math.floor(i / 3), i % 3)}
                        className="cursor-pointer border border-white/5 transition-all flex items-center justify-center group/cell hover:bg-[#c8f135]/15 active:bg-[#c8f135]/30">
                        <span className="text-[8px] font-black text-[#c8f135]/60 md:text-white/0 md:group-hover/cell:text-[#c8f135]/90 uppercase tracking-widest px-1.5 py-0.5 rounded bg-black/60 md:bg-transparent group-hover/cell:scale-110 transition-transform">
                          {i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {upscalingItems[lightboxItem.id] && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex flex-col items-center justify-center space-y-4 animate-fade-in">
                  <Loader2 size={32} className="text-fuchsia-400 animate-spin" />
                  <span className="text-sm font-black uppercase tracking-[0.3em] text-fuchsia-400 animate-pulse">Upscaling to 2K...</span>
                  <span className="text-[10px] text-white/40 font-medium">Re-sketching fine photographic details & micro-textures</span>
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <video
                src={resolveUrl(lightboxItem.url)}
                controls
                autoPlay
                loop
                playsInline
                className={cn(
                  "max-h-[75vh] object-contain shadow-2xl rounded-2xl",
                  lightboxItem.aspect === '9:16' ? 'aspect-[9/16] h-full' : lightboxItem.aspect === '1:1' ? 'aspect-square h-full' : 'aspect-video w-full'
                )}
              />
            </div>
          )}
        </div>

        {/* Meta & Right-side controls panel (Right) */}
        <div className="w-full md:w-[340px] shrink-0 p-5 border-t md:border-t-0 md:border-l border-white/5 bg-zinc-950 flex flex-col justify-between overflow-y-auto custom-scrollbar gap-5">
          <div className="space-y-4">
            {/* Top Tags */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-fuchsia-500/10 border border-fuchsia-500/25 text-fuchsia-400">
                {lightboxItem.engine}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[8px] font-mono bg-white/5 border border-white/5 text-white/40">
                {lightboxItem.aspect}
              </span>
              <span className="text-[8px] font-mono text-gray-600 ml-auto">
                {new Date(lightboxItem.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Prompt Text display */}
            <div className="space-y-1">
              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Generation Prompt</label>
              <p className="text-[10px] text-white/70 leading-relaxed font-medium bg-black/40 border border-white/5 p-3 rounded-xl select-all font-mono">
                "{lightboxItem.prompt}"
              </p>
            </div>

            {/* Interactive hint for 3x3 sheets */}
            {isGridActive && (
              <div className="p-3 bg-[#c8f135]/5 border border-[#c8f135]/15 rounded-xl text-[9px] leading-relaxed text-[#c8f135]/90 animate-pulse">
                <span className="font-black uppercase tracking-wider block mb-0.5">💡 Interactive Extraction</span>
                This is a 3x3 multi-angle grid. Click directly on any of the 9 cells on the left to extract it as a standalone high-fidelity image in your gallery.
              </div>
            )}
          </div>

          {/* Actions Button List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-1">
              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest block">Studio Controls</span>
              <span className="text-[8px] font-mono text-white/20">Production Suite v1.2</span>
            </div>

            {/* COMPACT BUTTON GRID */}
            <div className="grid grid-cols-2 gap-1.5">
              
              {/* DIRECTOR TIMELINE SETUP */}
              {lightboxItem.type === 'image' && (
                <>
                  <button
                    onClick={() => {
                      setFirstFrameImage(lightboxItem.url);
                      setFirstFramePreview(lightboxItem.url);
                      setLightboxItem(null);
                      const showToast = useAppStore.getState().showToast;
                      if (showToast) showToast("Set as First Frame (FF)!", "success");
                    }}
                    className="col-span-1 flex flex-col items-center justify-center p-2 rounded-lg border border-white/5 bg-zinc-900/40 hover:bg-fuchsia-500/10 hover:border-fuchsia-500/30 text-white/70 hover:text-white transition-all group"
                  >
                    <Video size={11} className="mb-0.5 text-gray-400 group-hover:text-fuchsia-400" />
                    <span className="text-[7.5px] font-black uppercase tracking-wider">Set as FF</span>
                  </button>
                  <button
                    onClick={() => {
                      setLastFrameImage(lightboxItem.url);
                      setLastFramePreview(lightboxItem.url);
                      setLightboxItem(null);
                      const showToast = useAppStore.getState().showToast;
                      if (showToast) showToast("Set as Last Frame (LF)!", "success");
                    }}
                    className="col-span-1 flex flex-col items-center justify-center p-2 rounded-lg border border-white/5 bg-zinc-900/40 hover:bg-cyan-500/10 hover:border-cyan-500/30 text-white/70 hover:text-white transition-all group"
                  >
                    <Video size={11} className="mb-0.5 text-gray-400 group-hover:text-cyan-400" />
                    <span className="text-[7.5px] font-black uppercase tracking-wider">Set as LF</span>
                  </button>
                  <button
                    onClick={() => {
                      setFirstFrameImage(lightboxItem.url);
                      setFirstFramePreview(lightboxItem.url);
                      setLightboxItem(null);
                      const showToast = useAppStore.getState().showToast;
                      if (showToast) showToast("Set as Reference Style Guided Image!", "success");
                    }}
                    className="col-span-2 flex items-center justify-center gap-1.5 p-2 rounded-lg border border-white/5 bg-zinc-900/40 hover:bg-[#c8f135]/10 hover:border-[#c8f135]/30 text-white/70 hover:text-white transition-all group"
                  >
                    <ImageIcon size={11} className="text-gray-400 group-hover:text-[#c8f135]" />
                    <span className="text-[7.5px] font-black uppercase tracking-wider">Use as Style Reference</span>
                  </button>
                </>
              )}

              {/* GENERATIVE REFINEMENTS */}
              {lightboxItem.type === 'image' && (
                <>
                  <button
                    onClick={() => handleUpscale(lightboxItem)}
                    disabled={upscalingItems[lightboxItem.id]}
                    className={cn(
                      "col-span-1 flex items-center justify-center gap-1.5 p-2 rounded-lg text-[7.5px] font-black uppercase border transition-all",
                      upscalingItems[lightboxItem.id]
                        ? "bg-fuchsia-500/10 border-fuchsia-500/25 text-fuchsia-400 animate-pulse"
                        : "bg-fuchsia-500/5 hover:bg-fuchsia-500/15 border-fuchsia-500/20 text-fuchsia-300 hover:text-fuchsia-200"
                    )}
                  >
                    {upscalingItems[lightboxItem.id] ? (
                      <><Loader2 size={10} className="animate-spin text-fuchsia-400" /> Refining...</>
                    ) : (
                      <><Zap size={10} className="fill-fuchsia-400/20" /> Upscale 2K</>
                    )}
                  </button>
                  <button
                    onClick={() => handleGenerateAnglesGrid(lightboxItem)}
                    className="col-span-1 flex items-center justify-center gap-1.5 p-2 rounded-lg text-[7.5px] font-black uppercase bg-[#c8f135]/5 hover:bg-[#c8f135]/15 border border-[#c8f135]/20 text-[#c8f135] transition-all"
                  >
                    <Grid size={10} /> 9-Angles
                  </button>
                </>
              )}

              {/* ADVANCED PRODUCTION SUITES */}
              {lightboxItem.type === 'image' && (
                <div className="col-span-2 grid grid-cols-3 gap-1.5 mt-1 pt-1.5 border-t border-white/5">
                  <button
                    onClick={() => setShowStoryboard(true)}
                    className="flex flex-col items-center justify-center p-2 rounded-lg border border-white/5 bg-zinc-900/30 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-emerald-400/70 hover:text-emerald-400 transition-all group"
                  >
                    <Film size={12} className="mb-1" />
                    <span className="text-[6.5px] font-black uppercase text-center leading-tight">Storyboard</span>
                  </button>
                  <button
                    onClick={() => { setStoryEditInstruction(''); setShowEditStoryModal(true); }}
                    className="flex flex-col items-center justify-center p-2 rounded-lg border border-white/5 bg-zinc-900/30 hover:bg-blue-500/10 hover:border-blue-500/30 text-blue-400/70 hover:text-blue-400 transition-all group"
                  >
                    <Palette size={12} className="mb-1" />
                    <span className="text-[6.5px] font-black uppercase text-center leading-tight">Narrative Edit</span>
                  </button>
                  <button
                    onClick={() => setShowInpaint(true)}
                    className="flex flex-col items-center justify-center p-2 rounded-lg border border-white/5 bg-zinc-900/30 hover:bg-purple-500/10 hover:border-purple-500/30 text-purple-400/70 hover:text-purple-400 transition-all group"
                  >
                    <Pencil size={12} className="mb-1" />
                    <span className="text-[6.5px] font-black uppercase text-center leading-tight">Brush Editor</span>
                  </button>
                </div>
              )}

              {/* FILE UTILITIES */}
              <div className="col-span-2 grid grid-cols-2 gap-1.5 mt-1 pt-1.5 border-t border-white/5">
                <button
                  onClick={() => handleDownload(resolveUrl(lightboxItem.url), lightboxItem.type, lightboxItem.id)}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-lg text-[7.5px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all"
                >
                  <Download size={10} /> Download
                </button>
                <button
                  onClick={(e) => handleDeleteItem(lightboxItem.id, e)}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-lg text-[7.5px] font-black uppercase tracking-widest bg-red-500/5 hover:bg-red-500/15 border border-red-500/20 text-red-400 hover:text-red-300 transition-all"
                >
                  <Trash2 size={10} /> Delete
                </button>
              </div>

            </div>
          </div>
        </div>
      </motion.div>

      {/* EDIT PANEL INSTRUCTION MODAL */}
      {showEditStoryModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          <div onClick={() => setShowEditStoryModal(false)} className="absolute inset-0 bg-black/85 backdrop-blur-md" />
          <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col z-[100001] animate-glass-glow" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <h3 className="text-[10px] font-black text-white flex items-center gap-1.5 uppercase tracking-widest">
                <Palette className="w-3.5 h-3.5 text-blue-400" /> Edit Story Panel
              </h3>
              <button onClick={() => setShowEditStoryModal(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <X size={14} className="text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="p-2.5 bg-blue-500/5 border border-blue-500/15 rounded-xl text-[9px] leading-relaxed text-white/70">
                <span className="font-black text-blue-400 uppercase tracking-wider block mb-0.5">ℹ Narrative Regeneration</span>
                Describe the specific change you want to apply to this shot (e.g., "Make it rain heavily", "Change shirt color to red", or "Add a glowing drone in the sky"). Gemini will regenerate this panel keeping character identity identical.
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Editing Instructions / Brief</label>
                <textarea
                  value={storyEditInstruction}
                  onChange={e => setStoryEditInstruction(e.target.value)}
                  placeholder="Describe the changes you want to apply..."
                  rows={4}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-[#D4FF00]/50 resize-none"
                />
              </div>
            </div>

            <div className="px-4 py-3 bg-white/[0.01] border-t border-white/5 flex justify-end gap-2">
              <button
                onClick={() => setShowEditStoryModal(false)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleEditStory}
                disabled={isEditingStory || !storyEditInstruction.trim()}
                className="px-3 py-1.5 bg-blue-500 hover:bg-white disabled:bg-white/10 disabled:text-white/20 text-black text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5"
              >
                {isEditingStory ? (
                  <>
                    <Loader2 size={10} className="animate-spin text-black" />
                    <span>Regenerating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={10} className="text-black" />
                    <span>Apply Edit (2⚡)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
