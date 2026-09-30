import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  X, Loader2, Zap, Grid, Video, Image as ImageIcon, Pencil, Download, Trash2,
  Palette, Sparkles, Film, ChevronRight, Camera, Copy, Play, Maximize2, Layers,
  FolderOpen
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
  handleUseAsRemixVideo,
  setMotionRefVideo,
  setMotionRefVideoPreview,
  setRemixEngine,
  omniRefImages,
  setOmniRefImages,
  omniRefPreviews,
  setOmniRefPreviews,
  setPromptText,
  setOmniPromptText,
  setPanelTab,
  handleExtendVideo,
  setShowSidePanel,
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

  // Extend Video using Omni Flash Extension (+4s / +8s)
  const handleExtendScene = () => {
    // 1. Immediately sync source video into global store
    try {
      useAppStore.getState().setExtensionSourceVideo?.(lightboxItem);
    } catch (_) {
      // Ignore store write fallback
    }

    // 2. Call parent callback if provided
    if (handleExtendVideo) {
      handleExtendVideo(lightboxItem);
    }

    // 3. Switch panel tab to dedicated multi-reference / extension mode
    if (setPanelTab) {
      setPanelTab('omni-multi');
    }

    // 4. Ensure SidePanel drawer is open
    if (setShowSidePanel) {
      setShowSidePanel(true);
    }

    const showToast = useAppStore.getState().showToast;
    if (showToast) {
      showToast("Loaded clip into Extension Panel (+4s / +8s)", "info");
    }
    setLightboxItem(null);
  };

  // Remix & Edit Video with Omni 1.1 / Jitsu
  const handleRemixScene = () => {
    if (handleUseAsRemixVideo) {
      handleUseAsRemixVideo(lightboxItem);
    } else {
      if (setMotionRefVideo) setMotionRefVideo(lightboxItem.url);
      if (setMotionRefVideoPreview) setMotionRefVideoPreview(lightboxItem.url);
      if (setOmniRefVideoPreview) setOmniRefVideoPreview(lightboxItem.url);
      if (setRemixEngine) setRemixEngine('omni');
      try {
        useAppStore.getState().setRemixEngine?.('omni');
      } catch (_) {
        void 0;
      }
      if (setPanelTab) setPanelTab('remix');
      if (setShowSidePanel) setShowSidePanel(true);
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast("Loaded video into Omni 1.1 Video Edit (@video1)!", "success");
    }
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
                preload="auto"
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
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[9px] font-black text-white/60 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles size={11} className="text-fuchsia-400" /> Studio Controls & AI Suites
              </span>
              <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40">
                HD Studio Suite
              </span>
            </div>

            {/* COMPACT SIDE-BY-SIDE BUTTON GRID */}
            {(() => {
              const isAlreadyUpscaled = Boolean(
                lightboxItem.resolution === '1080p' ||
                lightboxItem.resolution === '2K' ||
                lightboxItem.resolution === '4K' ||
                lightboxItem.quality === '1080p Full HD' ||
                lightboxItem.quality === '2K QHD' ||
                lightboxItem.quality === '4K UHD' ||
                lightboxItem.engine === '1080p HD Upscaler' ||
                lightboxItem.engine === 'HD Upscaler' ||
                lightboxItem.isUpscaled === true ||
                lightboxItem.prompt?.includes('[1080p HD') ||
                lightboxItem.prompt?.includes('(1080p HD') ||
                lightboxItem.prompt?.includes('(2K Upscaled)') ||
                lightboxItem.prompt?.includes('(Upscaled)')
              );

              return (
                <div className="grid grid-cols-2 gap-2">
                  
                  {/* 1. HERO UPSCALE TO HD (FOR VIDEO) - ONLY IF NOT ALREADY UPSCALED */}
                  {lightboxItem.type !== 'image' && (
                    isAlreadyUpscaled ? (
                      <div className="col-span-2 flex items-center justify-between px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md text-emerald-300 select-none">
                        <div className="flex items-center gap-2">
                          <Sparkles size={13} className="text-emerald-400 shrink-0" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white">1080p Full HD Master</span>
                        </div>
                        <span className="text-[8px] font-mono text-emerald-300 font-bold">Ready</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          let dur = 5;
                          if (videoElRef.current && videoElRef.current.duration) {
                            dur = Math.round(videoElRef.current.duration);
                          }
                          handleUpscale({ ...lightboxItem, duration: dur });
                          setLightboxItem(null);
                        }}
                        disabled={upscalingItems[lightboxItem.id]}
                        className={cn(
                          "col-span-2 flex items-center justify-between px-3 py-1.5 rounded-lg border transition-all cursor-pointer group select-none backdrop-blur-md",
                          upscalingItems[lightboxItem.id]
                            ? "bg-fuchsia-600/30 border-fuchsia-400/50 shadow-[0_0_15px_rgba(217,70,239,0.3)] animate-pulse text-fuchsia-300"
                            : "bg-fuchsia-600/15 hover:bg-fuchsia-600/25 border-fuchsia-500/35 hover:border-fuchsia-400/70 shadow-sm text-fuchsia-200 hover:text-white active:scale-[0.98]"
                        )}
                        title="Upscale video to 1080p Full HD"
                      >
                        <div className="flex items-center gap-2">
                          {upscalingItems[lightboxItem.id] ? (
                            <Loader2 size={13} className="animate-spin text-fuchsia-300 shrink-0" />
                          ) : (
                            <Zap size={13} className="fill-fuchsia-400 text-fuchsia-300 shrink-0" />
                          )}
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                            {upscalingItems[lightboxItem.id] ? 'Refining to HD...' : '✨ Upscale to 1080p'}
                          </span>
                        </div>
                        <span className="text-[8.5px] font-mono font-bold text-fuchsia-300">
                          {Math.max(1, Math.round(Number(lightboxItem.duration) || 5)) * 5} Shorts
                        </span>
                      </button>
                    )
                  )}

                  {/* 2. VIDEO EXTENSION */}
                  {lightboxItem.type !== 'image' && (
                    <button
                      type="button"
                      onClick={handleExtendScene}
                      className="col-span-2 flex items-center justify-between px-3 py-1.5 rounded-lg border border-[#c8f135]/35 bg-[#c8f135]/10 hover:bg-[#c8f135]/20 backdrop-blur-md text-[#c8f135] transition-all group cursor-pointer shadow-sm active:scale-[0.98]"
                      title="Extend this scene (+4s / +5s)"
                    >
                      <div className="flex items-center gap-2">
                        <Zap size={13} className="fill-[#c8f135] text-[#c8f135] shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white">⚡ Video Extension</span>
                      </div>
                      <span className="text-[8.5px] font-mono font-bold text-[#c8f135]">
                        +4s / +5s
                      </span>
                    </button>
                  )}

                  {/* 3. SCREENSHOT */}
                  {lightboxItem.type !== 'image' && (
                    <button
                      type="button"
                      onClick={handleExtractScreenshotToGallery}
                      className="col-span-2 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-sky-500/35 bg-sky-600/10 hover:bg-sky-600/20 backdrop-blur-md text-sky-200 hover:text-white transition-all group cursor-pointer shadow-sm active:scale-[0.98]"
                      title="Save current video frame screenshot"
                    >
                      <Camera size={13} className="text-sky-300 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white">📸 Screenshot</span>
                    </button>
                  )}

                  {/* 4. EDIT / REMIX SCENE */}
                  {lightboxItem.type !== 'image' && (
                    <button
                      type="button"
                      onClick={handleRemixScene}
                      className="col-span-2 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-purple-500/35 bg-purple-600/15 hover:bg-purple-600/25 backdrop-blur-md text-purple-200 hover:text-white transition-all group cursor-pointer shadow-sm active:scale-[0.98]"
                      title="Edit & Remix scene"
                    >
                      <Sparkles size={13} className="text-purple-300 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white">🎨 Edit & Remix</span>
                    </button>
                  )}

                  {/* 5. DIRECTOR TIMELINE SETUP (SIDE-BY-SIDE: FF & LF) */}
                  <button
                    type="button"
                    onClick={handleSetAsStartFrame}
                    className="col-span-1 flex items-center gap-2 p-2 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-fuchsia-500/15 hover:border-fuchsia-500/40 backdrop-blur-md text-white/80 hover:text-white transition-all group shadow-sm cursor-pointer active:scale-95"
                    title={lightboxItem.type === 'image' ? "Set as Start Keyframe" : "Extract Current Frame and Set as Start Keyframe"}
                  >
                    <div className="p-1 rounded-md bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 group-hover:scale-110 transition-transform">
                      <Video size={12} />
                    </div>
                    <div className="text-left">
                      <span className="text-[8.5px] font-black uppercase tracking-wider block">Set as FF</span>
                      <span className="text-[6.5px] text-white/40 block">Start Frame</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleSetAsEndFrame}
                    className="col-span-1 flex items-center gap-2 p-2 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-cyan-500/15 hover:border-cyan-500/40 backdrop-blur-md text-white/80 hover:text-white transition-all group shadow-sm cursor-pointer active:scale-95"
                    title={lightboxItem.type === 'image' ? "Set as End Keyframe" : "Extract Current Frame and Set as End Keyframe"}
                  >
                    <div className="p-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
                      <Video size={12} />
                    </div>
                    <div className="text-left">
                      <span className="text-[8.5px] font-black uppercase tracking-wider block">Set as LF</span>
                      <span className="text-[6.5px] text-white/40 block">End Frame</span>
                    </div>
                  </button>

                  {/* 6. REFERENCE VIDEO & MOTION PATTERN (SIDE-BY-SIDE) */}
                  {lightboxItem.type !== 'image' && (
                    <>
                      <button
                        type="button"
                        onClick={handleUseAsOmniRefVideo}
                        className="col-span-1 flex items-center gap-2 p-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/20 backdrop-blur-md text-emerald-300 transition-all group cursor-pointer active:scale-95"
                        title="Use video as driving reference for motion generation"
                      >
                        <Film size={12} className="text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                        <div className="text-left">
                          <span className="text-[8.5px] font-black uppercase tracking-wider block leading-tight">Ref Video</span>
                          <span className="text-[6.5px] text-emerald-300/70 block">Driving Ref</span>
                        </div>
                      </button>

                      {handleUseAsMotionVideo && (
                        <button
                          type="button"
                          onClick={async () => {
                            let dur = 5;
                            if (videoElRef.current && videoElRef.current.duration) {
                              dur = Math.round(videoElRef.current.duration);
                            }
                            await handleUseAsMotionVideo(lightboxItem, dur);
                            setLightboxItem(null);
                          }}
                          className="col-span-1 flex items-center gap-2 p-2 rounded-lg border border-[#c8f135]/25 bg-[#c8f135]/10 hover:bg-[#c8f135]/20 backdrop-blur-md text-[#c8f135] transition-all group cursor-pointer active:scale-95"
                          title="Use this video as the driving motion pattern (3s-30s)"
                        >
                          <Film size={12} className="text-[#c8f135] group-hover:scale-110 transition-transform shrink-0" />
                          <div className="text-left">
                            <span className="text-[8.5px] font-black uppercase tracking-wider block leading-tight">Motion Pattern</span>
                            <span className="text-[6.5px] text-[#c8f135]/70 block">Drive Motion</span>
                          </div>
                        </button>
                      )}

                      {/* Frame → Slot & Motion Subject */}
                      <button
                        type="button"
                        onClick={async () => {
                          const frame = await captureFrameFromVideo();
                          if (frame && handleUseAsMultiRefImage) {
                            handleUseAsMultiRefImage({ url: frame, type: 'image' });
                            setLightboxItem(null);
                          }
                        }}
                        className="col-span-1 flex items-center gap-2 p-2 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-[#c8f135]/15 hover:border-[#c8f135]/40 backdrop-blur-md text-white/80 hover:text-[#c8f135] transition-all group cursor-pointer active:scale-95"
                        title="Extract video frame screenshot and load into next Multi-Ref @image slot"
                      >
                        <Layers size={12} className="text-gray-400 group-hover:text-[#c8f135] transition-colors shrink-0" />
                        <div className="text-left">
                          <span className="text-[8.5px] font-black uppercase tracking-wider block leading-tight">Frame → Slot</span>
                          <span className="text-[6.5px] text-white/40 block">Load to @image</span>
                        </div>
                      </button>

                      {handleUseAsMotionSubject && (
                        <button
                          type="button"
                          onClick={async () => {
                            const frame = await captureFrameFromVideo();
                            if (frame) {
                              await handleUseAsMotionSubject({ url: frame, type: 'image' });
                              setLightboxItem(null);
                            }
                          }}
                          className="col-span-1 flex items-center gap-2 p-2 rounded-lg border border-[#c8f135]/20 bg-[#c8f135]/5 hover:bg-[#c8f135]/15 backdrop-blur-md text-[#c8f135] transition-all group cursor-pointer active:scale-95"
                          title="Extract current frame and set as Motion Subject Image"
                        >
                          <Sparkles size={12} className="text-[#c8f135] group-hover:scale-110 transition-transform shrink-0" />
                          <div className="text-left">
                            <span className="text-[8.5px] font-black uppercase tracking-wider block leading-tight">Motion Subject</span>
                            <span className="text-[6.5px] text-[#c8f135]/60 block">Extract Frame</span>
                          </div>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleAddPromptToStudio}
                        className="col-span-2 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-blue-500/15 hover:border-blue-500/40 backdrop-blur-md text-white/80 hover:text-white transition-all group cursor-pointer active:scale-95"
                        title="Load this generation prompt into the Studio prompt input"
                      >
                        <Copy size={12} className="text-gray-400 group-hover:text-blue-400 transition-colors shrink-0" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Copy Prompt to Studio</span>
                      </button>

                      {/* Send to Multi-Ref Video Slot (@video1..3) */}
                      <div className="col-span-2 flex flex-col gap-1.5 p-2.5 rounded-xl border border-cyan-500/25 bg-cyan-500/5 backdrop-blur-md">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-black uppercase text-cyan-300 flex items-center gap-1.5">
                            <Layers size={11} className="text-cyan-400" /> Send to Multi-Ref Video
                          </span>
                          <span className="text-[7.5px] font-mono text-cyan-400/60">Max 10s</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[0, 1, 2].map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={async () => {
                                if (handleUseAsMultiRefVideo) await handleUseAsMultiRefVideo(lightboxItem, slot);
                                setLightboxItem(null);
                              }}
                              className="py-1.5 px-2 rounded-lg bg-black/60 hover:bg-cyan-400 text-cyan-300 hover:text-black border border-cyan-400/30 text-[8.5px] font-mono font-bold transition-all text-center cursor-pointer shadow-sm active:scale-95"
                            >
                              @video{slot + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* 4. IMAGE-SPECIFIC WORKFLOWS (SIDE-BY-SIDE PAIRS) */}
                  {lightboxItem.type === 'image' && (
                    <>
                      {/* Pair: Upscale or Master Badge & 9-Angles Sheet */}
                      {!isAlreadyUpscaled && (
                        <button
                          type="button"
                          onClick={() => handleUpscale(lightboxItem)}
                          disabled={upscalingItems[lightboxItem.id]}
                          className={cn(
                            "col-span-1 flex items-center gap-2 p-2.5 rounded-xl text-[8px] font-black uppercase border backdrop-blur-md transition-all cursor-pointer active:scale-95 shadow-sm",
                            upscalingItems[lightboxItem.id]
                              ? "bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300 animate-pulse"
                              : "bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border-fuchsia-500/30 text-fuchsia-300 hover:text-white"
                          )}
                        >
                          {upscalingItems[lightboxItem.id] ? (
                            <><Loader2 size={13} className="animate-spin text-fuchsia-400 shrink-0" /><span className="leading-tight">Refining...</span></>
                          ) : (
                            <>
                              <Zap size={13} className="fill-fuchsia-400 text-fuchsia-400 shrink-0" />
                              <div className="text-left">
                                <span className="block leading-tight">Upscale to HD</span>
                                <span className="text-[6.5px] text-fuchsia-300/70 font-mono block">2 Shorts</span>
                              </div>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleGenerateAnglesGrid(lightboxItem)}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-xl text-[8px] font-black uppercase bg-[#c8f135]/10 hover:bg-[#c8f135]/20 border border-[#c8f135]/30 text-[#c8f135] backdrop-blur-md transition-all cursor-pointer active:scale-95 shadow-sm",
                          isAlreadyUpscaled ? "col-span-2" : "col-span-1"
                        )}
                      >
                        <Grid size={13} className="shrink-0" />
                        <div className="text-left">
                          <span className="block leading-tight">9-Angles Sheet</span>
                          <span className="text-[6.5px] text-[#c8f135]/70 block">Multi-View Grid</span>
                        </div>
                      </button>

                      {/* Pair: Style Reference & Motion Subject */}
                      <button
                        type="button"
                        onClick={handleUseAsStyleReference}
                        className="col-span-1 flex items-center gap-2 p-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-[#c8f135]/15 hover:border-[#c8f135]/40 backdrop-blur-md text-white/80 hover:text-white transition-all group shadow-sm cursor-pointer active:scale-95"
                        title="Use as Style Reference Image"
                      >
                        <ImageIcon size={13} className="text-[#c8f135] group-hover:scale-110 transition-transform shrink-0" />
                        <div className="text-left">
                          <span className="text-[8px] font-black uppercase tracking-wider block leading-tight">Style Ref</span>
                          <span className="text-[6.5px] text-white/40 block">Visual Style</span>
                        </div>
                      </button>

                      {handleUseAsMotionSubject && (
                        <button
                          type="button"
                          onClick={async () => {
                            await handleUseAsMotionSubject(lightboxItem);
                            setLightboxItem(null);
                          }}
                          className="col-span-1 flex items-center gap-2 p-2.5 rounded-xl border border-[#c8f135]/25 bg-[#c8f135]/10 hover:bg-[#c8f135]/20 backdrop-blur-md text-[#c8f135] transition-all group cursor-pointer active:scale-95"
                          title="Set this image as the Motion Subject reference"
                        >
                          <Sparkles size={13} className="text-[#c8f135] group-hover:scale-110 transition-transform shrink-0" />
                          <div className="text-left">
                            <span className="text-[8px] font-black uppercase tracking-wider block leading-tight">Motion Subject</span>
                            <span className="text-[6.5px] text-[#c8f135]/70 block">Animate Image</span>
                          </div>
                        </button>
                      )}

                      {/* Pair: Copy Prompt to Studio */}
                      <button
                        type="button"
                        onClick={handleAddPromptToStudio}
                        className="col-span-2 flex items-center justify-center gap-2 p-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-blue-500/15 hover:border-blue-500/40 backdrop-blur-md text-white/80 hover:text-white transition-all group cursor-pointer active:scale-95"
                        title="Load this generation prompt into the Studio prompt input"
                      >
                        <Copy size={12} className="text-gray-400 group-hover:text-blue-400 transition-colors" />
                        <span className="text-[8px] font-black uppercase tracking-wider">Copy Prompt to Studio</span>
                      </button>

                      {/* Send Image to Multi-Ref Image Slot (@image1..4) */}
                      <div className="col-span-2 flex flex-col gap-1.5 p-2.5 rounded-xl border border-[#c8f135]/25 bg-[#c8f135]/5 backdrop-blur-md">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-black uppercase text-[#c8f135] flex items-center gap-1.5">
                            <Layers size={11} className="text-[#c8f135]" /> Send to Multi-Ref Image
                          </span>
                          <span className="text-[7.5px] font-mono text-zinc-400">Pick slot</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[0, 1, 2, 3].map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => {
                                if (handleUseAsMultiRefImage) handleUseAsMultiRefImage(lightboxItem, slot);
                                setLightboxItem(null);
                              }}
                              className="py-1.5 px-2 rounded-lg bg-black/60 hover:bg-[#c8f135] text-[#c8f135] hover:text-black border border-[#c8f135]/30 text-[8.5px] font-mono font-bold transition-all text-center cursor-pointer shadow-sm active:scale-95"
                            >
                              @image{slot + 1}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Production Suites (Storyboard, Narrative Edit, Brush Editor) */}
                      <div className="col-span-2 grid grid-cols-3 gap-1.5 mt-0.5">
                        <button
                          type="button"
                          onClick={() => setShowStoryboard(true)}
                          className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-emerald-500/15 hover:border-emerald-500/40 backdrop-blur-md text-emerald-400/80 hover:text-emerald-300 transition-all group cursor-pointer active:scale-95"
                        >
                          <Film size={14} className="mb-1 text-emerald-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[7px] font-black uppercase text-center leading-tight">Storyboard</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setStoryEditInstruction(''); setShowEditStoryModal(true); }}
                          className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-blue-500/15 hover:border-blue-500/40 backdrop-blur-md text-blue-400/80 hover:text-blue-300 transition-all group cursor-pointer active:scale-95"
                        >
                          <Palette size={14} className="mb-1 text-blue-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[7px] font-black uppercase text-center leading-tight">Narrative Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowInpaint(true)}
                          className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-purple-500/15 hover:border-purple-500/40 backdrop-blur-md text-purple-400/80 hover:text-purple-300 transition-all group cursor-pointer active:scale-95"
                        >
                          <Pencil size={14} className="mb-1 text-purple-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[7px] font-black uppercase text-center leading-tight">Brush Editor</span>
                        </button>
                      </div>
                    </>
                  )}

                  {/* 5. UNIVERSAL PROJECT BOX QUICK SAVER */}
                  <div className="col-span-2 p-2.5 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-cyan-900/20 to-cyan-950/40 backdrop-blur-md flex flex-col gap-2 shadow-[0_0_20px_rgba(6,182,212,0.12)]">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase text-cyan-300 flex items-center gap-1.5">
                        <FolderOpen size={12} className="text-cyan-400" /> Save to Project Box
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          useAppStore.getState().openProjectVault();
                          setLightboxItem(null);
                        }}
                        className="text-[7.5px] text-cyan-400 hover:text-cyan-200 underline font-mono cursor-pointer transition-colors"
                      >
                        Open Box ↗
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: 'Char', cat: 'character' },
                        { label: 'Prop', cat: 'prop' },
                        { label: 'Loc', cat: 'location' },
                        { label: 'Wardrobe', cat: 'wardrobe' }
                      ].map(({ label, cat }) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            const showToast = useAppStore.getState().showToast;
                            useAppStore.getState().addProjectAsset({
                              type: lightboxItem.type === 'video' ? 'video' : 'image',
                              category: cat,
                              url: lightboxItem.url,
                              name: lightboxItem.prompt?.slice(0, 30) || `${label} Asset`,
                              prompt: lightboxItem.prompt,
                              aspect: lightboxItem.aspect
                            });
                            if (showToast) showToast(`Saved to Project Box as ${label}!`, 'success');
                          }}
                          className="py-1.5 px-2 rounded-lg bg-black/60 hover:bg-cyan-400 text-cyan-300 hover:text-black border border-cyan-500/30 hover:border-cyan-300 text-[8px] font-black uppercase transition-all text-center cursor-pointer active:scale-95 shadow-sm"
                        >
                          +{label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 6. BOTTOM UTILITIES (SIDE-BY-SIDE: DOWNLOAD & DELETE) */}
                  <div className="col-span-2 grid grid-cols-2 gap-2 mt-1 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => handleDownload(resolveUrl(lightboxItem.url), lightboxItem.type, lightboxItem.id)}
                      className="flex items-center justify-center gap-2 p-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 backdrop-blur-md text-white/90 hover:text-white transition-all cursor-pointer active:scale-95 shadow-sm"
                      title="Direct download to your computer or phone"
                    >
                      <Download size={12} /> Download
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        handleDeleteItem(lightboxItem.id, e);
                        setLightboxItem(null);
                      }}
                      className="flex items-center justify-center gap-2 p-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 backdrop-blur-md text-red-400 hover:text-red-300 transition-all cursor-pointer active:scale-95 shadow-sm"
                      title="Delete asset from gallery"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              );
            })()}
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
