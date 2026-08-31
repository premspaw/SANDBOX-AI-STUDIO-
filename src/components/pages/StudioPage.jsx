import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Film, Image as ImageIcon, Video, Layers, BookOpen, Clapperboard,
  Upload, Trash2, Check, Zap, Cpu, Code, HelpCircle, RefreshCw, Sliders, Play, Loader2,
  ChevronDown, Users, Tag, Eye, Download, Maximize2, Wand2, Shield, AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getApiUrl } from '../../config/apiConfig';
import { useAppStore } from '../../store';
import { SidePanel } from '../cinemaStudio/SidePanel';
import { ReferencePanel } from '../cinemaStudio/ReferencePanel';
import { CinematicLightbox } from '../cinemaStudio/CinematicLightbox';
import { InpaintEditor } from '../common/InpaintEditor';
import { StoryboardEditor } from '../cinemaStudio/StoryboardEditor';

export default function StudioPage() {
  const { userProfile, updateShortsBalance, checkAuthAndRun } = useAppStore();
  const userId = userProfile?.id || null;
  const userCredits = userProfile?.shorts_balance ?? 100;

  // Active Engine & Mode State
  const [activeEngine, setActiveEngine] = useState('veo-3.1-generate-preview');
  const [activeTab, setActiveTab] = useState('video');
  const [panelTab, setPanelTab] = useState('veo'); // 'veo' | 'omni'

  // Input & Parameter States
  const [promptText, setPromptText] = useState('');
  const [omniPromptText, setOmniPromptText] = useState('');
  const [duration, setDuration] = useState(4);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('720p');
  const [generateAudio, setGenerateAudio] = useState(true);
  const [omniTask, setOmniTask] = useState('auto');

  // Keyframe Conditioning States
  const [firstFrameImage, setFirstFrameImage] = useState('');
  const [firstFramePreview, setFirstFramePreview] = useState('');
  const [lastFrameImage, setLastFrameImage] = useState('');
  const [lastFramePreview, setLastFramePreview] = useState('');

  // Omni Flash Specific Conditioning
  const [omniFirstFrameImage, setOmniFirstFrameImage] = useState('');
  const [omniFirstFramePreview, setOmniFirstFramePreview] = useState('');
  const [omniLastFrameImage, setOmniLastFrameImage] = useState('');
  const [omniLastFramePreview, setOmniLastFramePreview] = useState('');
  const [omniRefImages, setOmniRefImages] = useState(['', '', '', '', '']);
  const [omniRefPreviews, setOmniRefPreviews] = useState(['', '', '', '', '']);
  const [omniRefVideoPreview, setOmniRefVideoPreview] = useState('');
  const [omniRefVideoDuration, setOmniRefVideoDuration] = useState(0);

  // Upload Reference Target
  const [uploadTarget, setUploadTarget] = useState(null);
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  // Reference Board States
  const [showRefBoard, setShowRefBoard] = useState(false);
  const [stagedRefBoard, setStagedRefBoard] = useState([]);
  const [showLibPicker, setShowLibPicker] = useState(false);
  const [libPickerTarget, setLibPickerTarget] = useState(null);
  const [activeRefUploadCategory, setActiveRefUploadCategory] = useState(null);
  const refUploadInputRef = useRef(null);
  const [seedanceRefs, setSeedanceRefs] = useState([]);

  // Projects State
  const [projects, setProjects] = useState([{ id: 'proj_default', name: 'Default Project' }]);
  const [activeProjectId, setActiveProjectId] = useState('proj_default');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  // Common Unified Gallery Loader across UGC, Marketing, Cinema Studio, and Studio
  const loadMergedGallery = useCallback(() => {
    try {
      const studioG = JSON.parse(localStorage.getItem('cs_studio_gallery') || '[]');
      const csG = JSON.parse(localStorage.getItem('cs_gallery') || '[]');
      const ugcG = JSON.parse(localStorage.getItem('ugc_video_gallery') || '[]');
      const marketingG = JSON.parse(localStorage.getItem('marketing_gallery') || '[]');

      const map = new Map();
      [...studioG, ...csG, ...ugcG, ...marketingG].forEach(item => {
        if (!item) return;
        const key = item.id || item.url || item.timestamp;
        if (key && !map.has(key)) {
          map.set(key, item);
        }
      });

      return Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch {
      return [];
    }
  }, []);

  const [gallery, setGallery] = useState(loadMergedGallery);
  const [isBusy, setIsBusy] = useState(false);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [showInpaint, setShowInpaint] = useState(false);
  const [showStoryboard, setShowStoryboard] = useState(false);
  const [showAnglesModal, setShowAnglesModal] = useState(false);
  const [angle, setAngle] = useState('eye-level');
  const [upscalingItems, setUpscalingItems] = useState(new Set());

  // Sync gallery updates across all common app storage keys
  useEffect(() => {
    try {
      const data = JSON.stringify(gallery);
      localStorage.setItem('cs_studio_gallery', data);
      localStorage.setItem('cs_gallery', data);
      localStorage.setItem('ugc_video_gallery', data);
      localStorage.setItem('marketing_gallery', data);
      localStorage.setItem('zerolens_unified_gallery', data);
    } catch (err) {
      console.warn("Failed to persist common unified gallery:", err);
    }
  }, [gallery]);

  // Handle File Uploads
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const blobUrl = URL.createObjectURL(file);
      if (uploadTarget === 'first') {
        setFirstFrameImage(blobUrl);
        setFirstFramePreview(blobUrl);
      } else if (uploadTarget === 'last') {
        setLastFrameImage(blobUrl);
        setLastFramePreview(blobUrl);
      }
    } catch (err) {
      console.error("File upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearRef = (type) => {
    if (type === 'first') {
      setFirstFrameImage('');
      setFirstFramePreview('');
    } else if (type === 'last') {
      setLastFrameImage('');
      setLastFramePreview('');
    }
  };

  // Credit calculation
  const requiredCredits = useMemo(() => {
    if (panelTab === 'motion' || activeEngine.includes('motion')) {
      const rate = activeEngine.includes('kling') ? 14 : 12;
      return Math.round(duration * rate);
    }
    if (panelTab === 'omni' || activeEngine.includes('omni')) {
      return Math.round(duration * 1.6 * (generateAudio ? 1.5 : 1));
    }
    const rate = activeEngine.includes('fast') ? 1.5 : activeEngine.includes('lite') ? 1.0 : 2.5;
    return Math.round(duration * rate * (generateAudio ? 1.5 : 1));
  }, [panelTab, activeEngine, duration, generateAudio]);

  const canGenerate = userCredits >= requiredCredits;

  // Handle Generation
  const handleGenerate = async (customPrompt, customEngine) => {
    const promptToUse = customPrompt || (panelTab === 'omni' ? omniPromptText : promptText);
    const engineToUse = customEngine || activeEngine;

    if (!promptToUse.trim()) return;

    checkAuthAndRun(async () => {
      setIsBusy(true);
      const tempId = 'gen_' + Date.now();
      const newClip = {
        id: tempId,
        type: 'video',
        prompt: promptToUse,
        engine: engineToUse,
        duration,
        aspectRatio,
        timestamp: Date.now(),
        status: 'generating',
        url: null
      };

      setGallery(prev => [newClip, ...prev]);

      try {
        let endpoint = `${getApiUrl()}/api/veo/generate-video`;
        let payload = {};

        if (panelTab === 'motion' || engineToUse.includes('motion')) {
          endpoint = `${getApiUrl()}/api/veo/generate-video`;
          payload = {
            prompt: promptToUse,
            engine: engineToUse.includes('kling') ? 'kling/v3-turbo-image-to-video' : 'seedance-fast',
            duration,
            aspectRatio,
            firstFrame: firstFrameImage || omniFirstFrameImage || null,
            motionVideo: omniRefVideoPreview || null,
            userId
          };
        } else if (panelTab === 'omni' || engineToUse.includes('omni') || engineToUse.includes('flash')) {
          endpoint = `${getApiUrl()}/api/omni/generate`;
          payload = {
            prompt: promptToUse,
            model: engineToUse,
            task: omniTask || 'image_to_video',
            duration,
            aspectRatio,
            resolution,
            generateAudio,
            firstFrame: firstFrameImage || omniFirstFrameImage || null,
            lastFrame: lastFrameImage || omniLastFrameImage || null,
            refImages: omniRefImages.filter(Boolean),
            refVideo: omniRefVideoPreview || null,
            userId
          };
        } else {
          payload = {
            prompt: promptToUse,
            engine: engineToUse,
            duration,
            aspectRatio,
            generateAudio,
            firstFrame: firstFrameImage || null,
            lastFrame: lastFrameImage || null,
            userId
          };
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const videoUrl = data.videoUrl || data.url || data.result;

        setGallery(prev => prev.map(item => item.id === tempId ? {
          ...item,
          status: 'completed',
          url: videoUrl
        } : item));

        if (data.newCredits !== undefined) {
          updateShortsBalance(data.newCredits);
        }
      } catch (err) {
        console.error("Generation error:", err);
        setGallery(prev => prev.map(item => item.id === tempId ? {
          ...item,
          status: 'failed',
          error: err.message
        } : item));
      } finally {
        setIsBusy(false);
      }
    });
  };

  const handleClearGallery = () => {
    if (window.confirm("Are you sure you want to clear your studio video gallery?")) {
      setGallery([]);
    }
  };

  const handleDeleteItem = (id) => {
    setGallery(prev => prev.filter(item => item.id !== id));
  };

  const handleDownload = (url, name) => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = name || 'zerolens-studio-video.mp4';
    a.click();
  };

  const handleUpscale = (item) => {
    setUpscalingItems(prev => new Set(prev).add(item.id));
    setTimeout(() => {
      setUpscalingItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 3000);
  };

  const handleGenerateAnglesGrid = () => {
    setShowAnglesModal(true);
  };

  return (
    <div className="h-full w-full flex flex-col lg:flex-row bg-[#020202] text-white overflow-hidden relative font-sans">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
        disabled={isUploading}
      />

      {/* ── LEFT COLUMN: DEDICATED STUDIO CONTROL PANEL ── */}
      <div className="w-full lg:w-[420px] xl:w-[460px] h-[50vh] lg:h-full shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#0a0a12] z-20 flex flex-col overflow-hidden">
        <SidePanel
          isOpen={true}
          inlineMode={true}
          onClose={() => {}}
          activeEngine={activeEngine}
          setActiveEngine={setActiveEngine}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          panelTab={panelTab}
          setPanelTab={setPanelTab}
          firstFrameImage={firstFrameImage}
          firstFramePreview={firstFramePreview}
          lastFrameImage={lastFrameImage}
          lastFramePreview={lastFramePreview}
          setFirstFrameImage={setFirstFrameImage}
          setFirstFramePreview={setFirstFramePreview}
          setLastFrameImage={setLastFrameImage}
          setLastFramePreview={setLastFramePreview}
          omniFirstFrameImage={omniFirstFrameImage}
          omniFirstFramePreview={omniFirstFramePreview}
          omniLastFrameImage={omniLastFrameImage}
          omniLastFramePreview={omniLastFramePreview}
          omniRefImages={omniRefImages}
          omniRefPreviews={omniRefPreviews}
          setOmniRefImages={setOmniRefImages}
          setOmniRefPreviews={setOmniRefPreviews}
          setOmniFirstFrameImage={setOmniFirstFrameImage}
          setOmniFirstFramePreview={setOmniFirstFramePreview}
          setOmniLastFrameImage={setOmniLastFrameImage}
          setOmniLastFramePreview={setOmniLastFramePreview}
          omniRefVideoPreview={omniRefVideoPreview}
          setOmniRefVideoPreview={setOmniRefVideoPreview}
          omniRefVideoDuration={omniRefVideoDuration}
          setOmniRefVideoDuration={setOmniRefVideoDuration}
          handleFileUpload={handleFileUpload}
          setUploadTarget={setUploadTarget}
          handleClearRef={handleClearRef}
          fileInputRef={fileInputRef}
          duration={duration}
          setDuration={setDuration}
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          resolution={resolution}
          setResolution={setResolution}
          generateAudio={generateAudio}
          setGenerateAudio={setGenerateAudio}
          omniTask={omniTask}
          setOmniTask={setOmniTask}
          showRefBoard={showRefBoard}
          setShowRefBoard={setShowRefBoard}
          promptText={panelTab === 'omni' ? omniPromptText : promptText}
          setPromptText={panelTab === 'omni' ? setOmniPromptText : setPromptText}
          omniPromptText={omniPromptText}
          setOmniPromptText={setOmniPromptText}
          handleGenerate={handleGenerate}
          isBusy={isBusy}
          userCredits={userCredits}
          requiredCredits={requiredCredits}
          canGenerate={canGenerate}
          allRefItems={stagedRefBoard}
        />
      </div>

      {/* ── RIGHT COLUMN: LIVE VIDEO OUTPUT CANVAS & GENERATIONS FEED ── */}
      <div className="flex-1 h-[50vh] lg:h-full min-w-0 flex flex-col overflow-hidden bg-[#050508] relative">
        {/* Header Bar */}
        <div className="px-5 py-3 border-b border-white/10 bg-[#080810]/80 backdrop-blur-xl flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-white">Studio Generations</h2>
              <p className="text-[9px] text-gray-400 font-mono">Live Video Output & Previs Feed</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Credit Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#c8f135]/10 border border-[#c8f135]/30 rounded-xl">
              <Sparkles className="w-3.5 h-3.5 text-[#c8f135]" />
              <span className="text-xs font-black text-[#c8f135]">{userCredits}</span>
              <span className="text-[9px] font-mono text-gray-400 uppercase">Shorts</span>
            </div>

            {gallery.length > 0 && (
              <button
                onClick={handleClearGallery}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Gallery</span>
              </button>
            )}
          </div>
        </div>

        {/* Gallery Feed / Video Canvas */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {gallery.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-cyan-500/20 border border-white/15 flex items-center justify-center mb-4 text-violet-400 shadow-xl">
                <Clapperboard className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white mb-1">Your Studio Gallery is Empty</h3>
              <p className="text-xs text-gray-400 max-w-sm leading-relaxed mb-6 font-medium">
                Enter your prompt and configuration in the left panel to generate high-fidelity Veo 3.1 & Gemini Omni 1.1 Flash videos!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {gallery.map(item => (
                <div key={item.id} className="group relative bg-[#0b0b14] border border-white/10 hover:border-violet-500/50 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 flex flex-col">
                  {/* Video Viewport */}
                  <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                    {item.status === 'generating' ? (
                      <div className="flex flex-col items-center gap-3 p-6 text-center">
                        <Loader2 className="w-8 h-8 text-[#c8f135] animate-spin" />
                        <span className="text-xs font-bold text-gray-300">Rendering Video...</span>
                      </div>
                    ) : item.status === 'failed' ? (
                      <div className="flex flex-col items-center gap-2 p-6 text-center text-rose-400">
                        <AlertCircle className="w-8 h-8" />
                        <span className="text-xs font-bold">Generation Failed</span>
                        <p className="text-[10px] text-gray-400 max-w-xs truncate">{item.error || 'API Error'}</p>
                      </div>
                    ) : (
                      <>
                        <video src={item.url} controls className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setLightboxItem(item)} className="p-1.5 rounded-xl bg-black/70 hover:bg-violet-600 text-white backdrop-blur-md transition-colors"><Maximize2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDownload(item.url, `studio-${item.id}.mp4`)} className="p-1.5 rounded-xl bg-black/70 hover:bg-cyan-600 text-white backdrop-blur-md transition-colors"><Download className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 rounded-xl bg-black/70 hover:bg-red-600 text-white backdrop-blur-md transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Info Card */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <p className="text-xs text-white/90 font-medium line-clamp-2 leading-relaxed">{item.prompt}</p>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono border-t border-white/5 pt-2">
                      <span className="bg-white/5 px-2 py-0.5 rounded-lg border border-white/5 font-semibold uppercase">{item.engine}</span>
                      <span>{item.duration}s • {item.aspectRatio}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxItem && (
          <CinematicLightbox
            lightboxItem={lightboxItem}
            setLightboxItem={setLightboxItem}
            setGallery={setGallery}
            handleUpscale={handleUpscale}
            handleGenerateAnglesGrid={handleGenerateAnglesGrid}
            handleDownload={handleDownload}
            handleDeleteItem={handleDeleteItem}
            setShowInpaint={setShowInpaint}
            setShowStoryboard={setShowStoryboard}
            upscalingItems={upscalingItems}
            setUpscalingItems={setUpscalingItems}
            setFirstFrameImage={setFirstFrameImage}
            setFirstFramePreview={setFirstFramePreview}
            setLastFrameImage={setLastFrameImage}
            setLastFramePreview={setLastFramePreview}
            userId={userId}
          />
        )}
      </AnimatePresence>

      {/* Reference Panel Modal */}
      <ReferencePanel
        showRefBoard={showRefBoard}
        setShowRefBoard={setShowRefBoard}
        stagedRefBoard={stagedRefBoard}
        setStagedRefBoard={setStagedRefBoard}
        removeRefItem={(id) => setStagedRefBoard(prev => prev.filter(i => i.id !== id))}
        handleSaveRefBoard={() => setShowRefBoard(false)}
        handleCancelRefBoard={() => setShowRefBoard(false)}
        refUploadInputRef={refUploadInputRef}
        handleRefUpload={handleFileUpload}
        showLibPicker={showLibPicker}
        setShowLibPicker={setShowLibPicker}
        libPickerTarget={libPickerTarget}
        setLibPickerTarget={setLibPickerTarget}
        addRefItem={(item) => setStagedRefBoard(prev => [...prev, item])}
        setActiveRefUploadCategory={setActiveRefUploadCategory}
        isSeedance={false}
        isOmni={panelTab === 'omni'}
        seedanceRefs={seedanceRefs}
        onSeedanceRefUpload={() => {}}
        onRemoveSeedanceRef={() => {}}
      />

      {/* Inpaint Canvas Editor */}
      {showInpaint && lightboxItem && (
        <InpaintEditor
          imageUrl={lightboxItem.url}
          userId={userId}
          onClose={() => setShowInpaint(false)}
          onDone={() => setShowInpaint(false)}
        />
      )}

      {/* Storyboard Editor */}
      {showStoryboard && lightboxItem && (
        <StoryboardEditor
          lightboxItem={lightboxItem}
          userId={userId}
          onClose={() => setShowStoryboard(false)}
          setGallery={setGallery}
          setLightboxItem={setLightboxItem}
        />
      )}
    </div>
  );
}
