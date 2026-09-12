import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  X, Loader2, Zap, Grid, Video, Image as ImageIcon, Pencil, Download, Trash2,
  Palette, Sparkles, Film, ChevronRight, Camera, Copy, Play, Maximize2, Layers
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import { resolveUrl, getApiUrl } from '../../config/apiConfig';
import { extractVideoFrame } from '../../lib/videoUtils';

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
  setOmniFirstFrameImage,
  setOmniFirstFramePreview,
  setOmniLastFrameImage,
  setOmniLastFramePreview,
  setOmniRefVideoPreview,
  setOmniMultiVideos,
  omniMultiVideos,
  omniMultiImages,
  setOmniMultiImages,
  handleUseAsMultiRefImage,
  handleUseAsMultiRefVideo,
  handleUseAsMotionSubject,
  handleUseAsMotionVideo,
  omniRefImages,
  setOmniRefImages,
  omniRefPreviews,
  setOmniRefPreviews,
  setPromptText,
  setOmniPromptText,
  setPanelTab,
  userId
}) {
  // 3x3 Grid Overlay & Crop Interactive States
  const gridImgRef = useRef(null);
  const gridContainerRef = useRef(null);
  const videoElRef = useRef(null);
  const [isExtractingFrame, setIsExtractingFrame] = useState(false);
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

  // Keyboard listener for Escape key to quickly close lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLightboxItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setLightboxItem]);

  // Frame Capture Helper from Video element (direct or CORS proxy)
  const captureFrameFromVideo = async (atTime) => {
    setIsExtractingFrame(true);
    const showToast = useAppStore.getState().showToast;
    try {
      let dataUrl = null;
      const videoEl = videoElRef.current;
      if (videoEl && videoEl.videoWidth > 0) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = videoEl.videoWidth || 1280;
          canvas.height = videoEl.videoHeight || 720;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          dataUrl = canvas.toDataURL('image/png');
        } catch (canvasErr) {
          console.warn("[Lightbox] Direct canvas capture tainted, falling back to proxy frame extraction:", canvasErr);
        }
      }

      if (!dataUrl) {
        const timeToSeek = atTime !== undefined ? atTime : (videoEl?.currentTime || 0);
        dataUrl = await extractVideoFrame(lightboxItem.url, timeToSeek);
      }

      setIsExtractingFrame(false);
      return dataUrl;
    } catch (err) {
      setIsExtractingFrame(false);
      console.error("[Lightbox] Frame capture failed:", err);
      if (showToast) showToast("Could not capture video frame screenshot.", "error");
      return null;
    }
  };

  // Set as Start Frame (FF)
  const handleSetAsStartFrame = async () => {
    const showToast = useAppStore.getState().showToast;
    if (lightboxItem.type === 'image') {
      if (setFirstFrameImage) setFirstFrameImage(lightboxItem.url);
      if (setFirstFramePreview) setFirstFramePreview(lightboxItem.url);
      if (setOmniFirstFrameImage) setOmniFirstFrameImage(lightboxItem.url);
      if (setOmniFirstFramePreview) setOmniFirstFramePreview(lightboxItem.url);
      if (showToast) showToast("Set as First Frame (FF)!", "success");
      setLightboxItem(null);
      return;
    }

    if (showToast) showToast("Extracting video frame screenshot...", "info");
    const frame = await captureFrameFromVideo();
    if (!frame) return;

    if (setFirstFrameImage) setFirstFrameImage(frame);
    if (setFirstFramePreview) setFirstFramePreview(frame);
    if (setOmniFirstFrameImage) setOmniFirstFrameImage(frame);
    if (setOmniFirstFramePreview) setOmniFirstFramePreview(frame);
    if (showToast) showToast("Captured frame set as First Frame (FF)!", "success");
    setLightboxItem(null);
  };

  // Set as End Frame (LF)
  const handleSetAsEndFrame = async () => {
    const showToast = useAppStore.getState().showToast;
    if (lightboxItem.type === 'image') {
      if (setLastFrameImage) setLastFrameImage(lightboxItem.url);
      if (setLastFramePreview) setLastFramePreview(lightboxItem.url);
      if (setOmniLastFrameImage) setOmniLastFrameImage(lightboxItem.url);
      if (setOmniLastFramePreview) setOmniLastFramePreview(lightboxItem.url);
      if (showToast) showToast("Set as Last Frame (LF)!", "success");
      setLightboxItem(null);
      return;
    }

    if (showToast) showToast("Extracting video frame screenshot...", "info");
    const frame = await captureFrameFromVideo();
    if (!frame) return;

    if (setLastFrameImage) setLastFrameImage(frame);
    if (setLastFramePreview) setLastFramePreview(frame);
    if (setOmniLastFrameImage) setOmniLastFrameImage(frame);
    if (setOmniLastFramePreview) setOmniLastFramePreview(frame);
    if (showToast) showToast("Captured frame set as Last Frame (LF)!", "success");
    setLightboxItem(null);
  };

  // Extract Screenshot to Gallery as a Standalone Image
  const handleExtractScreenshotToGallery = async () => {
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast("Capturing full-resolution screenshot...", "info");
    const frame = await captureFrameFromVideo();
    if (!frame) return;

    const newId = 'frame_' + Date.now();
    const cleanPrompt = lightboxItem.prompt ? lightboxItem.prompt.replace(/^Screenshot:\s*/i, '').trim() : 'Studio Video Screenshot';
    const newImageItem = {
      id: newId,
      type: 'image',
      url: frame,
      prompt: cleanPrompt,
      engine: 'Screenshot',
      aspect: lightboxItem.aspect || '16:9',
      ts: Date.now(),
      timestamp: Date.now()
    };

    setGallery(prev => [newImageItem, ...prev]);
    if (showToast) showToast("Screenshot added to your Studio Gallery!", "success");

    // Persist via save-asset in background
    try {
      fetch(getApiUrl('/api/save-asset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: frame,
          fileName: `screenshot_${Date.now()}.png`,
          userId: userId,
          type: 'image',
          aspect: lightboxItem.aspect || '16:9',
          prompt: cleanPrompt,
          engine: 'Screenshot'
        })
      }).then(r => r.json()).then(data => {
        if (data.url || data.path) {
          setGallery(prev => prev.map(item => item.id === newId ? { ...item, url: data.url || data.path } : item));
        }
      }).catch(err => console.debug("[Lightbox] Cloud save fallback:", err));
    } catch (saveErr) {
      console.debug("[Lightbox] Cloud save error:", saveErr);
    }
  };

  // Resend / Inject into Omni Reference Driving Video Payload
  const handleUseAsOmniRefVideo = () => {
    const showToast = useAppStore.getState().showToast;
    if (setOmniRefVideoPreview) {
      setOmniRefVideoPreview(lightboxItem.url);
    }
    if (setOmniMultiVideos) {
      setOmniMultiVideos(prev => {
        const next = Array.isArray(prev) ? [...prev] : ['', '', ''];
        next[0] = lightboxItem.url;
        return next;
      });
    }
    if (setPanelTab) {
      setPanelTab('omni');
    }
    if (showToast) showToast("Video loaded into Omni Reference Driving Video payload!", "success");
    setLightboxItem(null);
  };

  // Add Generation Prompt to Studio Input Textarea
  const handleAddPromptToStudio = () => {
    const showToast = useAppStore.getState().showToast;
    const textToAdd = lightboxItem.prompt || '';
    if (!textToAdd) return;

    if (setPromptText) {
      setPromptText(textToAdd);
    }
    if (setOmniPromptText) {
      setOmniPromptText(textToAdd);
    }
    if (showToast) showToast("Prompt copied to Studio input!", "success");
    setLightboxItem(null);
  };

  // Use as Style Reference (sets omniRefImages slot 0)
  const handleUseAsStyleReference = async () => {
    const showToast = useAppStore.getState().showToast;
    if (lightboxItem.type === 'image') {
      if (setFirstFrameImage) setFirstFrameImage(lightboxItem.url);
      if (setFirstFramePreview) setFirstFramePreview(lightboxItem.url);
      if (setOmniRefImages) {
        setOmniRefImages(prev => {
          const next = Array.isArray(prev) ? [...prev] : ['', '', '', '', ''];
          next[0] = lightboxItem.url;
          return next;
        });
      }
      if (setOmniRefPreviews) {
        setOmniRefPreviews(prev => {
          const next = Array.isArray(prev) ? [...prev] : ['', '', '', '', ''];
          next[0] = lightboxItem.url;
          return next;
        });
      }
      if (showToast) showToast("Set as Style Reference Image!", "success");
      setLightboxItem(null);
      return;
    }

    if (showToast) showToast("Extracting video frame...", "info");
    const frame = await captureFrameFromVideo();
    if (!frame) return;

    if (setOmniRefImages) {
      setOmniRefImages(prev => {
        const next = Array.isArray(prev) ? [...prev] : ['', '', '', '', ''];
        next[0] = frame;
        return next;
      });
    }
    if (setOmniRefPreviews) {
      setOmniRefPreviews(prev => {
        const next = Array.isArray(prev) ? [...prev] : ['', '', '', '', ''];
        next[0] = frame;
        return next;
      });
    }
    if (showToast) showToast("Extracted frame set as Style Reference Image!", "success");
    setLightboxItem(null);
  };

  if (!lightboxItem) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4"
      onClick={() => setLightboxItem(null)}
    >
      {/* Desktop Viewport Close Button */}
      <button
        onClick={() => setLightboxItem(null)}
        className="hidden sm:flex fixed top-4 right-5 z-[100005] items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900/95 hover:bg-white text-white hover:text-black border border-white/20 hover:border-white rounded-full shadow-[0_4px_30px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-all cursor-pointer font-sans select-none group"
        title="Close Lightbox (Esc)"
        aria-label="Close"
      >
        <span className="text-[11px] font-black uppercase tracking-wider">Close</span>
        <X size={14} className="transition-transform group-hover:rotate-90 duration-200" />
      </button>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative max-w-6xl w-full max-h-[96vh] md:max-h-[92vh] flex flex-col md:flex-row bg-zinc-950 border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl animate-glass-glow"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header Close Button */}
        <button
          onClick={() => setLightboxItem(null)}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 w-8 h-8 sm:w-9 sm:h-9 bg-zinc-900/90 hover:bg-white border border-white/20 hover:border-white rounded-full flex items-center justify-center text-white hover:text-black transition-all shadow-xl cursor-pointer"
          title="Close (Esc)"
        >
          <X size={15} />
        </button>

        {/* Media Content Area (Left) */}
        <div className="flex-1 bg-black flex items-center justify-center overflow-hidden relative min-h-[220px] sm:min-h-[340px] md:min-h-[520px]">
          {lightboxItem.type === 'image' ? (
            <div ref={gridContainerRef} className="relative w-full h-full flex items-center justify-center p-4">
              <img
                src={resolveUrl(lightboxItem.url)}
                alt={lightboxItem.prompt}
                ref={gridImgRef}
                onLoad={updateOverlay}
                className={cn(
                  "max-h-[82vh] object-contain shadow-2xl rounded-2xl bg-black/40",
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
                ref={videoElRef}
                src={resolveUrl(lightboxItem.url)}
                controls
                autoPlay
                loop
                playsInline
                crossOrigin="anonymous"
                className={cn(
                  "max-h-[82vh] object-contain shadow-2xl rounded-2xl",
                  lightboxItem.aspect === '9:16' ? 'aspect-[9/16] h-full' : lightboxItem.aspect === '1:1' ? 'aspect-square h-full' : 'aspect-video w-full'
                )}
              />
              {isExtractingFrame && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-30 flex flex-col items-center justify-center space-y-2">
                  <Loader2 size={28} className="text-[#c8f135] animate-spin" />
                  <span className="text-xs font-black uppercase tracking-wider text-[#c8f135]">Capturing Frame Screenshot...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Meta & Right-side controls panel (Right) */}
        <div className="w-full md:w-[340px] shrink-0 p-4 sm:p-5 border-t md:border-t-0 md:border-l border-white/5 bg-zinc-950 flex flex-col justify-between overflow-y-auto custom-scrollbar gap-4 sm:gap-5 max-h-[45vh] md:max-h-none">
          <div className="space-y-4">
            {/* Top Tags */}
            <div className="flex items-center gap-2 flex-wrap">
              {lightboxItem.engine && 
               !lightboxItem.engine.toLowerCase().includes('preview') && 
               !lightboxItem.engine.toLowerCase().includes('omni') && 
               !lightboxItem.engine.toLowerCase().includes('frame extract') && 
               lightboxItem.engine !== 'Screenshot' && (
                <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-fuchsia-500/10 border border-fuchsia-500/25 text-fuchsia-400">
                  {lightboxItem.engine}
                </span>
              )}
              {(lightboxItem.engine === 'Screenshot' || lightboxItem.engine === 'ZeroLens Frame Extract' || String(lightboxItem.id || '').startsWith('frame_')) && (
                <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-amber-500/10 border border-amber-500/25 text-amber-300">
                  Screenshot
                </span>
              )}
              {(lightboxItem.engine?.toLowerCase().includes('sequence') || lightboxItem.type === 'sequence') && (
                <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/25 text-cyan-300">
                  Sequence
                </span>
              )}
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
                "{(lightboxItem.prompt || '').replace(/^Screenshot:\s*/i, '').replace(/ZeroLens Frame Extract/i, '').replace(/ZeroLens extracted frame/i, '').trim()}"
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
              
              {/* 1. DIRECTOR TIMELINE SETUP (WORKS FOR BOTH IMAGE & VIDEO) */}
              <button
                onClick={handleSetAsStartFrame}
                className="col-span-1 flex flex-col items-center justify-center p-2 rounded-lg border border-white/5 bg-zinc-900/40 hover:bg-fuchsia-500/10 hover:border-fuchsia-500/30 text-white/70 hover:text-white transition-all group"
                title={lightboxItem.type === 'image' ? "Set as Start Keyframe" : "Extract Current Frame and Set as Start Keyframe"}
              >
                <Video size={11} className="mb-0.5 text-gray-400 group-hover:text-fuchsia-400" />
                <span className="text-[7.5px] font-black uppercase tracking-wider">Set as FF</span>
              </button>

              <button
                onClick={handleSetAsEndFrame}
                className="col-span-1 flex flex-col items-center justify-center p-2 rounded-lg border border-white/5 bg-zinc-900/40 hover:bg-cyan-500/10 hover:border-cyan-500/30 text-white/70 hover:text-white transition-all group"
                title={lightboxItem.type === 'image' ? "Set as End Keyframe" : "Extract Current Frame and Set as End Keyframe"}
              >
                <Video size={11} className="mb-0.5 text-gray-400 group-hover:text-cyan-400" />
                <span className="text-[7.5px] font-black uppercase tracking-wider">Set as LF</span>
              </button>

              <button
                onClick={handleUseAsStyleReference}
                className="col-span-2 flex items-center justify-center gap-1.5 p-2 rounded-lg border border-white/5 bg-zinc-900/40 hover:bg-[#c8f135]/10 hover:border-[#c8f135]/30 text-white/70 hover:text-white transition-all group"
                title="Use as Style Reference Image"
              >
                <ImageIcon size={11} className="text-gray-400 group-hover:text-[#c8f135]" />
                <span className="text-[7.5px] font-black uppercase tracking-wider">Use as Style Reference</span>
              </button>

              {/* 2. VIDEO-SPECIFIC WORKFLOWS (MULTI-REF VIDEO, EXTRACT SCREENSHOT, OMNI DRIVING VIDEO, ADD TO PROMPT) */}
              {lightboxItem.type !== 'image' && (
                <>
                  {/* Send to Multi-Ref Video Slot (@video1..3) with 10s validation */}
                  <div className="col-span-2 flex flex-col gap-1 p-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[7.5px] font-black uppercase text-cyan-300 flex items-center gap-1">
                        <Layers size={10} className="text-cyan-400" /> Send to Multi-Ref Video
                      </span>
                      <span className="text-[7px] font-mono text-cyan-400/60">Max 10s</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[0, 1, 2].map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={async () => {
                            if (handleUseAsMultiRefVideo) await handleUseAsMultiRefVideo(lightboxItem, slot);
                            setLightboxItem(null);
                          }}
                          className="py-1 px-1 rounded bg-black/60 hover:bg-cyan-400 text-cyan-300 hover:text-black border border-cyan-400/30 text-[8px] font-mono font-bold transition-all text-center cursor-pointer"
                        >
                          @video{slot + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleUseAsOmniRefVideo}
                    className="col-span-2 flex items-center justify-center gap-1.5 p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-all group cursor-pointer"
                    title="Send video into Omni driving reference video payload for multi-ref motion generation"
                  >
                    <Film size={11} className="text-emerald-400" />
                    <span className="text-[7.5px] font-black uppercase tracking-wider">Use as Omni Reference Video</span>
                  </button>

                  {/* Motion Pattern Driving Video */}
                  {handleUseAsMotionVideo && (
                    <button
                      onClick={async () => {
                        let dur = 5;
                        if (videoElRef.current && videoElRef.current.duration) {
                          dur = Math.round(videoElRef.current.duration);
                        }
                        await handleUseAsMotionVideo(lightboxItem, dur);
                        setLightboxItem(null);
                      }}
                      className="col-span-2 flex items-center justify-center gap-1.5 p-2 rounded-lg border border-[#c8f135]/25 bg-[#c8f135]/10 hover:bg-[#c8f135]/20 text-[#c8f135] transition-all group cursor-pointer"
                      title="Use this video as the driving motion pattern (3s-30s)"
                    >
                      <Film size={11} className="text-[#c8f135]" />
                      <span className="text-[7.5px] font-black uppercase tracking-wider">Use as Motion Video</span>
                    </button>
                  )}

                  <button
                    onClick={handleExtractScreenshotToGallery}
                    className="col-span-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border border-white/5 bg-zinc-900/40 hover:bg-[#c8f135]/10 hover:border-[#c8f135]/30 text-white/70 hover:text-white transition-all group cursor-pointer"
                    title="Extract current video frame as high-res screenshot image to gallery"
                  >
                    <Camera size={11} className="text-gray-400 group-hover:text-[#c8f135]" />
                    <span className="text-[7.5px] font-black uppercase tracking-wider">Screenshot Frame</span>
                  </button>

                  {/* Extract frame directly into Multi-Ref @image slot */}
                  <button
                    onClick={async () => {
                      const frame = await captureFrameFromVideo();
                      if (frame && handleUseAsMultiRefImage) {
                        handleUseAsMultiRefImage({ url: frame, type: 'image' });
                        setLightboxItem(null);
                      }
                    }}
                    className="col-span-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border border-white/5 bg-zinc-900/40 hover:bg-[#c8f135]/10 hover:border-[#c8f135]/30 text-white/70 hover:text-[#c8f135] transition-all group cursor-pointer"
                    title="Extract video frame screenshot and load into next Multi-Ref @image slot"
                  >
                    <Layers size={11} className="text-gray-400 group-hover:text-[#c8f135]" />
                    <span className="text-[7.5px] font-black uppercase tracking-wider">Frame → @image</span>
                  </button>

                  {/* Extract frame directly into Motion Subject */}
                  {handleUseAsMotionSubject && (
                    <button
                      onClick={async () => {
                        const frame = await captureFrameFromVideo();
                        if (frame) {
                          await handleUseAsMotionSubject({ url: frame, type: 'image' });
                          setLightboxItem(null);
                        }
                      }}
                      className="col-span-2 flex items-center justify-center gap-1.5 p-2 rounded-lg border border-[#c8f135]/20 bg-[#c8f135]/5 hover:bg-[#c8f135]/15 text-[#c8f135] transition-all group cursor-pointer"
                      title="Extract current frame and set as Motion Subject Image"
                    >
                      <Sparkles size={11} className="text-[#c8f135]" />
                      <span className="text-[7.5px] font-black uppercase tracking-wider">Extract Frame → Motion Subject</span>
                    </button>
                  )}

                  <button
                    onClick={handleAddPromptToStudio}
                    className="col-span-2 flex items-center justify-center gap-1.5 p-2 rounded-lg border border-white/5 bg-zinc-900/40 hover:bg-blue-500/10 hover:border-blue-500/30 text-white/70 hover:text-white transition-all group cursor-pointer"
                    title="Load this generation prompt into the Studio prompt input"
                  >
                    <Copy size={11} className="text-gray-400 group-hover:text-blue-400" />
                    <span className="text-[7.5px] font-black uppercase tracking-wider">Add to Prompt</span>
                  </button>
                </>
              )}

              {/* 3. GENERATIVE REFINEMENTS & MULTI-REF FOR IMAGES */}
              {lightboxItem.type === 'image' && (
                <>
                  {/* Send Image to Multi-Ref Image Slot (@image1..4) */}
                  <div className="col-span-2 flex flex-col gap-1 p-2 rounded-lg border border-[#c8f135]/20 bg-[#c8f135]/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[7.5px] font-black uppercase text-[#c8f135] flex items-center gap-1">
                        <Layers size={10} className="text-[#c8f135]" /> Send to Multi-Ref Image
                      </span>
                      <span className="text-[7px] font-mono text-zinc-400">Pick slot</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[0, 1, 2, 3].map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => {
                            if (handleUseAsMultiRefImage) handleUseAsMultiRefImage(lightboxItem, slot);
                            setLightboxItem(null);
                          }}
                          className="py-1 px-1 rounded bg-black/60 hover:bg-[#c8f135] text-[#c8f135] hover:text-black border border-[#c8f135]/30 text-[8px] font-mono font-bold transition-all text-center cursor-pointer"
                        >
                          @image{slot + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Send Image to Motion Subject */}
                  {handleUseAsMotionSubject && (
                    <button
                      onClick={async () => {
                        await handleUseAsMotionSubject(lightboxItem);
                        setLightboxItem(null);
                      }}
                      className="col-span-2 flex items-center justify-center gap-1.5 p-2 rounded-lg border border-[#c8f135]/25 bg-[#c8f135]/10 hover:bg-[#c8f135]/20 text-[#c8f135] transition-all group cursor-pointer"
                      title="Set this image as the Motion Subject reference"
                    >
                      <Sparkles size={11} className="text-[#c8f135]" />
                      <span className="text-[7.5px] font-black uppercase tracking-wider">Use as Motion Subject</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleUpscale(lightboxItem)}
                    disabled={upscalingItems[lightboxItem.id]}
                    className={cn(
                      "col-span-1 flex items-center justify-center gap-1.5 p-2 rounded-lg text-[7.5px] font-black uppercase border transition-all cursor-pointer",
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
                    className="col-span-1 flex items-center justify-center gap-1.5 p-2 rounded-lg text-[7.5px] font-black uppercase bg-[#c8f135]/5 hover:bg-[#c8f135]/15 border border-[#c8f135]/20 text-[#c8f135] transition-all cursor-pointer"
                  >
                    <Grid size={10} /> 9-Angles
                  </button>

                  <button
                    onClick={handleAddPromptToStudio}
                    className="col-span-2 flex items-center justify-center gap-1.5 p-2 rounded-lg border border-white/5 bg-zinc-900/40 hover:bg-blue-500/10 hover:border-blue-500/30 text-white/70 hover:text-white transition-all group cursor-pointer"
                    title="Load this generation prompt into the Studio prompt input"
                  >
                    <Copy size={11} className="text-gray-400 group-hover:text-blue-400" />
                    <span className="text-[7.5px] font-black uppercase tracking-wider">Add to Prompt</span>
                  </button>
                </>
              )}

              {/* 4. ADVANCED PRODUCTION SUITES FOR IMAGES */}
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

              {/* 5. FILE UTILITIES (DIRECT DOWNLOAD & IMMEDIATE CLEAN DELETE) */}
              <div className="col-span-2 grid grid-cols-2 gap-1.5 mt-1 pt-1.5 border-t border-white/5">
                <button
                  onClick={() => handleDownload(resolveUrl(lightboxItem.url), lightboxItem.type, lightboxItem.id)}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-lg text-[7.5px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
                  title="Direct download to your computer or phone"
                >
                  <Download size={10} /> Download
                </button>
                <button
                  onClick={(e) => {
                    handleDeleteItem(lightboxItem.id, e);
                    setLightboxItem(null);
                  }}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-lg text-[7.5px] font-black uppercase tracking-widest bg-red-500/5 hover:bg-red-500/15 border border-red-500/20 text-red-400 hover:text-red-300 transition-all cursor-pointer"
                  title="Delete asset from gallery"
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
