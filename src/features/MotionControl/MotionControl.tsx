import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, Upload, Play, Loader2, HelpCircle, AlertCircle, 
  Trash2, Settings, Coins, Aperture, Film, ChevronDown, Video, 
  Zap, Info, Check, Image as ImageIcon, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAppStore } from '../../store';
import { useShorts } from '../../hooks/useShorts';
import { useUGCGallery } from '../UGCStudio/hooks/useUGCGallery';
import { UGCContext } from '../UGCStudio/context/UGCContext';
import GalleryGrid from '../UGCStudio/components/GalleryGrid';
import GalleryExpandModal from '../UGCStudio/components/modals/GalleryExpandModal';
import { getApiUrl } from '../../config/apiConfig';

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export default function MotionControl() {
  const { userProfile, showToast } = useAppStore();
  const { shorts, refresh: refreshShorts } = useShorts();
  const userId = userProfile?.id || 'local_user';

  // Gallery grid hooks
  const { 
    gallery, 
    setGallery, 
    galleryTab, 
    setGalleryTab, 
    galleryExpandItem, 
    setGalleryExpandItem,
    addToGallery
  } = useUGCGallery(userId);

  // Engine & Parameters States
  const [engine, setEngine] = useState<'kling' | 'seedance'>('kling');
  const [prompt, setPrompt] = useState('');
  
  // Files States
  const [refImage, setRefImage] = useState<{ file: File; url: string } | null>(null);
  const [motionVideo, setMotionVideo] = useState<{ file: File; url: string; duration?: number } | null>(null);
  
  // Upload progress/states
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  // Kling Parameters
  const [klingMode, setKlingMode] = useState<'std' | 'pro'>('std');
  const [characterOrientation, setCharacterOrientation] = useState<'video' | 'image'>('video');
  const [backgroundSource, setBackgroundSource] = useState<'input_video' | 'input_image'>('input_video');

  // Seedance Parameters
  const [seedanceResolution, setSeedanceResolution] = useState<'720p' | '1080p'>('720p');
  const [duration, setDuration] = useState<number>(5);

  // Generation & Polling States
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [showParams, setShowParams] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Refs for file inputs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Calculate Credit Cost
  const getCreditCost = () => {
    if (engine === 'kling') {
      const rate = klingMode === 'pro' ? 18 : 14;
      const seconds = motionVideo?.duration || 5;
      return Math.ceil(rate * seconds);
    } else {
      // Seedance 2.0 Pro is 16 credits/second base
      return 16 * duration;
    }
  };

  // Upload Reference Image handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match('image/jpeg') && !file.type.match('image/png') && !file.type.match('image/jpg')) {
      showToast('Subject image must be in JPEG, JPG or PNG format', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Subject image exceeds 10MB limit', 'error');
      return;
    }

    setIsUploadingImage(true);
    try {
      const url = URL.createObjectURL(file);
      setRefImage({ file, url });
      showToast('Subject reference image loaded locally', 'success');
    } catch (err: any) {
      showToast('Failed to read subject image: ' + err.message, 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Upload Motion Video handler
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match('video/mp4') && !file.type.match('video/quicktime') && !file.name.endsWith('.mov')) {
      showToast('Motion video must be in MP4 or QuickTime format', 'error');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      showToast('Motion video exceeds 100MB limit', 'error');
      return;
    }

    setIsUploadingVideo(true);
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        if (video.duration < 3 || video.duration > 30) {
          showToast('Motion video must be between 3 and 30 seconds', 'error');
          setIsUploadingVideo(false);
          return;
        }
        const url = URL.createObjectURL(file);
        setMotionVideo({ file, url, duration: video.duration });
        showToast('Motion reference video loaded locally', 'success');
        setIsUploadingVideo(false);
      };
      video.src = URL.createObjectURL(file);
    } catch (err: any) {
      showToast('Failed to parse motion video: ' + err.message, 'error');
      setIsUploadingVideo(false);
    }
  };

  // Helper to upload base64 file to storage
  const uploadToStorage = async (file: File, type: 'image' | 'video') => {
    const base64 = await fileToBase64(file);
    const res = await fetch(getApiUrl('/api/upload-asset'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: base64,
        type,
        userId,
        folder: 'uploads' // Excluded from main gallery
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'File upload failed');
    }
    const data = await res.json();
    return data.url;
  };

  // Trigger Generation
  const handleGenerate = async () => {
    if (!refImage) {
      showToast('Please upload a subject reference image first', 'error');
      return;
    }
    if (!motionVideo) {
      showToast('Please upload a motion reference video first', 'error');
      return;
    }

    const cost = getCreditCost();
    if (shorts < cost) {
      showToast(`Insufficient Credits: You need ${cost} Shorts, but only have ${shorts}.`, 'error');
      return;
    }

    setIsGenerating(true);
    setStatusMsg('Uploading subject image to cloud storage...');

    let tempId = 'mc_' + Date.now();
    let imgPublicUrl = '';
    let vidPublicUrl = '';

    try {
      // 1. Upload assets to GCS
      imgPublicUrl = await uploadToStorage(refImage.file, 'image');
      setStatusMsg('Uploading motion video to cloud storage...');
      vidPublicUrl = await uploadToStorage(motionVideo.file, 'video');

      // 2. Add placeholder in gallery
      const tempItem = {
        id: tempId,
        type: 'video' as const,
        url: '',
        loading: true,
        prompt: prompt || 'Motion Control Video',
        createdAt: Date.now()
      };
      setGallery(prev => [tempItem, ...prev]);
      refreshShorts();

      // 3. Initiate job
      if (engine === 'kling') {
        setStatusMsg('Creating task on Kling Engine...');
        const resp = await fetch(getApiUrl('/api/kling/motion-control'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            input_url: imgPublicUrl,
            video_url: vidPublicUrl,
            mode: klingMode,
            character_orientation: characterOrientation,
            background_source: backgroundSource,
            duration: motionVideo?.duration || 5,
            userId
          })
        });

        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Failed to start Kling task');

        pollTask(data.requestId, 'kling', tempId);
      } else {
        setStatusMsg('Creating task on Seedance Engine...');
        // Format seedance content array
        const seedanceContentArray = [
          { type: 'image_url', image_url: { url: imgPublicUrl }, role: 'reference_image' },
          { type: 'video_url', video_url: { url: vidPublicUrl }, role: 'reference_video' }
        ];
        if (prompt.trim()) {
          seedanceContentArray.push({ type: 'text', text: prompt } as any);
        }

        const resp = await fetch(getApiUrl('/api/seedance/generate'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            engine: 'seedace',
            model: 'dreamina-seedance-2-0-260128',
            seedanceContentArray,
            duration,
            aspectRatio: '16:9',
            resolution: seedanceResolution,
            userId,
            generateAudio: false,
            creditReason: 'seedance_motion_control'
          })
        });

        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Failed to start Seedance task');

        pollTask(data.requestId, 'seedance', tempId);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Generation failed', 'error');
      // Remove temporary placeholder
      setGallery(prev => prev.filter(item => item.id !== tempId));
      setIsGenerating(false);
      setStatusMsg('');
      refreshShorts();
    }
  };

  // Poll Task Status
  const pollTask = async (taskId: string, type: 'kling' | 'seedance', tempId: string) => {
    const maxAttempts = 100;
    const intervalMs = 6000;
    let attempt = 0;
    const engineLabel = type === 'kling' ? 'Kling 3.0' : 'Seedance 2.0';

    const interval = setInterval(async () => {
      attempt++;
      const elapsed = attempt * 6;
      setStatusMsg(`Rendering video... (${elapsed}s)`);

      try {
        const url = type === 'kling' 
          ? `/api/kling/status/${taskId}?userId=${userId}&aspectRatio=16:9`
          : `/api/seedance/status/${taskId}?userId=${userId}&aspectRatio=16:9&engine=seedace`;

        const res = await fetch(getApiUrl(url));
        const data = await res.json();

        if (data.status === 'completed' && data.url) {
          clearInterval(interval);
          
          const finishedItem = {
            id: Date.now().toString(),
            type: 'video' as const,
            url: data.url,
            prompt: prompt || 'Motion Control Output',
            createdAt: Date.now()
          };

          setGallery(prev => {
            if (prev.some(item => item.id === tempId)) {
              return prev.map(item => item.id === tempId ? finishedItem : item);
            }
            return [finishedItem, ...prev];
          });

          showToast(`${engineLabel} Motion Transfer Completed!`, 'success');
          setIsGenerating(false);
          setStatusMsg('');
          refreshShorts();
        } else if (data.status === 'failed' || data.status === 'error') {
          clearInterval(interval);
          throw new Error(data.error || 'Generation failed');
        }
      } catch (err: any) {
        clearInterval(interval);
        showToast(`${engineLabel} generation error: ${err.message}`, 'error');
        setGallery(prev => prev.filter(item => item.id !== tempId));
        setIsGenerating(false);
        setStatusMsg('');
        refreshShorts();
      }

      if (attempt >= maxAttempts) {
        clearInterval(interval);
        showToast(`${engineLabel} generation timed out.`, 'error');
        setGallery(prev => prev.filter(item => item.id !== tempId));
        setIsGenerating(false);
        setStatusMsg('');
        refreshShorts();
      }
    }, intervalMs);
  };

  return (
    <UGCContext.Provider value={{
      gallery,
      galleryTab,
      setGalleryTab,
      setGalleryExpandItem,
      galleryExpandItem,
      isGeneratingVideo: isGenerating,
      videoProgressMsg: statusMsg,
      isGeneratingImage: false,
      imageProgressMsg: '',
      thIsGeneratingImg: false,
      isGeneratingMontageImg: false,
      montageImgProgressMsg: '',
      isRegeneratingImage: false,
      setInpaintImg: () => {},
      splitScenes: [],
      setSplitScenes: () => {},
      activeSplitTab: 0,
      attachedRefImage: null,
      setAttachedRefImage: () => {},
      showToast
    } as any}>
      <div className="h-full flex flex-col bg-[#050507] text-white overflow-hidden relative font-sans">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse" />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />

        {/* Header */}
        <header className="px-6 py-4 border-b border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
                <Aperture className="w-5 h-5 animate-spin-slow" />
              </span>
              <div>
                <h1 className="text-xl font-black italic uppercase tracking-tighter bg-gradient-to-r from-orange-400 via-amber-400 to-[#c8f135] bg-clip-text text-transparent">
                  Motion Control Studio
                </h1>
                <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold mt-0.5">
                  Advanced Video-to-Video Motion Mapping
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Engine switcher */}
            <div className="bg-[#111115] border border-white/5 p-1 rounded-xl flex items-center">
              <button
                onClick={() => setEngine('kling')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                  engine === 'kling' 
                    ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20' 
                    : 'text-white/40 hover:text-white'
                }`}
              >
                Kling 3.0
              </button>
              <button
                onClick={() => setEngine('seedance')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                  engine === 'seedance' 
                    ? 'bg-[#c8f135] text-black shadow-md shadow-[#c8f135]/20' 
                    : 'text-white/40 hover:text-white'
                }`}
              >
                Seedance 2.0
              </button>
            </div>

            {/* Shorts tracker */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
              <Coins className="w-4 h-4 text-amber-400" />
              <div className="flex items-center gap-1">
                <span className="text-[12px] font-black text-white">{shorts}</span>
                <span className="text-[8px] text-white/30 font-bold uppercase tracking-wider">SHORTS</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Left panel wrapper with drawer toggle */}
          <div className="relative flex shrink-0 h-full z-[45]">
            <motion.div
              animate={{ width: isSidebarOpen ? 380 : 0, opacity: isSidebarOpen ? 1 : 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="h-full border-r border-white/5 bg-[#09090c]/80 backdrop-blur-md flex flex-col overflow-hidden"
            >
              {/* Scrollable inputs panel */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 w-[380px] shrink-0">
                {/* Subject Image Input Zone */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/60 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-orange-400" /> Subject Reference Image
                    </label>
                    {refImage && (
                      <button 
                        onClick={() => setRefImage(null)} 
                        className="text-[9px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 uppercase tracking-wider"
                      >
                        <Trash2 size={10} /> Clear
                      </button>
                    )}
                  </div>

                  {!refImage ? (
                    <div 
                      onClick={() => imageInputRef.current?.click()}
                      className="group relative flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-orange-500/40 bg-white/[0.01] hover:bg-white/[0.03] rounded-2xl p-6 cursor-pointer transition-all duration-300 min-h-[120px]"
                    >
                      <input 
                        type="file" 
                        ref={imageInputRef} 
                        onChange={handleImageUpload} 
                        accept="image/jpeg,image/png,image/jpg" 
                        className="hidden" 
                      />
                      {isUploadingImage ? (
                        <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                      ) : (
                        <Upload className="w-6 h-6 text-white/20 group-hover:text-orange-400 transition-colors" />
                      )}
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-3 group-hover:text-white/60 transition-colors">
                        Upload Subject Image
                      </span>
                      <span className="text-[8px] text-white/20 font-medium mt-1 text-center max-w-[240px]">
                        JPEG, PNG or JPG (Max 10MB). Best with clear head, shoulders and torso.
                      </span>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden border border-white/10 group aspect-video bg-black flex items-center justify-center">
                      <img src={refImage.url} alt="Subject Reference" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          onClick={() => imageInputRef.current?.click()}
                          className="px-4 py-2 rounded-xl bg-white text-black text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                        >
                          Change Image
                        </button>
                        <input 
                          type="file" 
                          ref={imageInputRef} 
                          onChange={handleImageUpload} 
                          accept="image/jpeg,image/png,image/jpg" 
                          className="hidden" 
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Motion Video Input Zone */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/60 flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-orange-400" /> Motion Pattern Video
                    </label>
                    {motionVideo && (
                      <button 
                        onClick={() => setMotionVideo(null)} 
                        className="text-[9px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 uppercase tracking-wider"
                      >
                        <Trash2 size={10} /> Clear
                      </button>
                    )}
                  </div>

                  {!motionVideo ? (
                    <div 
                      onClick={() => videoInputRef.current?.click()}
                      className="group relative flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-orange-500/40 bg-white/[0.01] hover:bg-white/[0.03] rounded-2xl p-6 cursor-pointer transition-all duration-300 min-h-[120px]"
                    >
                      <input 
                        type="file" 
                        ref={videoInputRef} 
                        onChange={handleVideoUpload} 
                        accept="video/mp4,video/quicktime,video/x-matroska" 
                        className="hidden" 
                      />
                      {isUploadingVideo ? (
                        <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                      ) : (
                        <Upload className="w-6 h-6 text-white/20 group-hover:text-orange-400 transition-colors" />
                      )}
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-3 group-hover:text-white/60 transition-colors">
                        Upload Motion Video
                      </span>
                      <span className="text-[8px] text-white/20 font-medium mt-1 text-center max-w-[240px]">
                        MP4 or QuickTime (Max 100MB, 3-30s). Needs subject matching the image layout.
                      </span>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden border border-white/10 group aspect-video bg-black flex items-center justify-center">
                      <video src={motionVideo.url} className="w-full h-full object-contain" controls />
                      <div className="absolute top-3 right-3 bg-black/60 border border-white/10 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-mono text-white/80">
                        {motionVideo.duration ? `${motionVideo.duration.toFixed(1)}s` : 'Video Loaded'}
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <button 
                          onClick={() => videoInputRef.current?.click()}
                          className="px-4 py-2 rounded-xl bg-white text-black text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg pointer-events-auto"
                        >
                          Change Video
                        </button>
                        <input 
                          type="file" 
                          ref={videoInputRef} 
                          onChange={handleVideoUpload} 
                          accept="video/mp4,video/quicktime" 
                          className="hidden" 
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Prompt Guidance Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/60">
                    Text Prompt Guidance (Optional)
                  </label>
                  <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Describe subject motion details or guidelines to steer generation content (e.g. energetic expressions, sunset lighting)..."
                    className="w-full h-20 bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-xs text-white/90 placeholder-white/20 focus:outline-none focus:border-orange-500/40 transition-colors resize-none leading-relaxed"
                  />
                </div>

                {/* Advanced Parameter Toggle */}
                <div className="border-t border-white/5 pt-4">
                  <button 
                    onClick={() => setShowParams(!showParams)}
                    className="flex items-center justify-between w-full text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-1.5"><Settings size={12} /> Advanced parameters</span>
                    <ChevronDown size={12} className={`transition-transform duration-200 ${showParams ? 'rotate-180' : ''}`} />
                  </button>

                  {showParams && (
                    <div className="mt-4 p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
                      {engine === 'kling' ? (
                        <>
                          {/* Kling Quality Mode */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Video Quality Mode</label>
                              <span title="std is faster, pro is higher fidelity">
                                <HelpCircle size={10} className="text-white/20" />
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setKlingMode('std')}
                                className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                  klingMode === 'std' 
                                    ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' 
                                    : 'border-white/5 bg-transparent text-white/40 hover:text-white'
                                }`}
                              >
                                Standard (720p)
                              </button>
                              <button
                                onClick={() => setKlingMode('pro')}
                                className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                  klingMode === 'pro' 
                                    ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' 
                                    : 'border-white/5 bg-transparent text-white/40 hover:text-white'
                                }`}
                              >
                                Professional (1080p)
                              </button>
                            </div>
                          </div>

                          {/* Character Orientation Reference */}
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Character Orientation Reference</label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setCharacterOrientation('video')}
                                className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                  characterOrientation === 'video' 
                                    ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' 
                                    : 'border-white/5 bg-transparent text-white/40 hover:text-white'
                                }`}
                              >
                                Video (Recommended)
                              </button>
                              <button
                                onClick={() => setCharacterOrientation('image')}
                                className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                  characterOrientation === 'image' 
                                    ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' 
                                    : 'border-white/5 bg-transparent text-white/40 hover:text-white'
                                }`}
                              >
                                Image
                              </button>
                            </div>
                          </div>

                          {/* Background Source */}
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Background Source</label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setBackgroundSource('input_video')}
                                className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                  backgroundSource === 'input_video' 
                                    ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' 
                                    : 'border-white/5 bg-transparent text-white/40 hover:text-white'
                                }`}
                              >
                                Video Background
                              </button>
                              <button
                                onClick={() => setBackgroundSource('input_image')}
                                className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                  backgroundSource === 'input_image' 
                                    ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' 
                                    : 'border-white/5 bg-transparent text-white/40 hover:text-white'
                                }`}
                              >
                                Image Background
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Seedance Resolution */}
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Resolution</label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setSeedanceResolution('720p')}
                                className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                  seedanceResolution === '720p' 
                                    ? 'bg-[#c8f135]/10 border-[#c8f135]/50 text-[#c8f135]' 
                                    : 'border-white/5 bg-transparent text-white/40 hover:text-white'
                                }`}
                              >
                                720p
                              </button>
                              <button
                                onClick={() => setSeedanceResolution('1080p')}
                                className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                  seedanceResolution === '1080p' 
                                    ? 'bg-[#c8f135]/10 border-[#c8f135]/50 text-[#c8f135]' 
                                    : 'border-white/5 bg-transparent text-white/40 hover:text-white'
                                }`}
                              >
                                1080p
                              </button>
                            </div>
                          </div>

                          {/* Seedance Duration */}
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Duration</label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setDuration(5)}
                                className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                  duration === 5 
                                    ? 'bg-[#c8f135]/10 border-[#c8f135]/50 text-[#c8f135]' 
                                    : 'border-white/5 bg-transparent text-white/40 hover:text-white'
                                }`}
                              >
                                5 Seconds
                              </button>
                              <button
                                onClick={() => setDuration(10)}
                                className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                  duration === 10 
                                    ? 'bg-[#c8f135]/10 border-[#c8f135]/50 text-[#c8f135]' 
                                    : 'border-white/5 bg-transparent text-white/40 hover:text-white'
                                }`}
                              >
                                10 Seconds
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Generate Action Button */}
              <div className="pt-2 p-6 shrink-0">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || isUploadingImage || isUploadingVideo}
                  className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border shadow-lg ${
                    isGenerating 
                      ? 'bg-white/5 border-white/10 text-white/40' 
                      : engine === 'kling'
                        ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-400 hover:to-orange-500 text-black border-orange-400/20 shadow-[0_4px_25px_rgba(249,115,22,0.25)] hover:shadow-[0_4px_30px_rgba(249,115,22,0.4)] hover:scale-[1.01] active:scale-[0.99]'
                        : 'bg-gradient-to-r from-[#c8f135] via-[#d4f545] to-[#a8d31a] hover:from-[#d4f545] hover:to-[#c8f135] text-black border-[#c8f135]/20 shadow-[0_4px_25px_rgba(200,241,53,0.25)] hover:shadow-[0_4px_30px_rgba(200,241,53,0.4)] hover:scale-[1.01] active:scale-[0.99]'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{statusMsg || 'Generating Video...'}</span>
                    </>
                  ) : (
                    <>
                      <span>Generate Motion Transfer</span>
                      <span className="opacity-40 font-mono text-[9px] ml-1">({getCreditCost()} SHORTS)</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>

            {/* Drawer toggle button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`absolute -right-5 md:-right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-16 md:w-6 md:h-12 flex items-center justify-center rounded-r-xl transition-all shadow-lg
                ${isSidebarOpen
                  ? engine === 'kling'
                    ? 'bg-[#111113] border border-orange-500/20 text-orange-400 hover:text-orange-300 hover:border-orange-500/60 hover:bg-orange-500/5 shadow-[0_0_8px_rgba(249,115,22,0.1)]'
                    : 'bg-[#111113] border border-[#c8f135]/20 text-[#c8f135]/60 hover:text-[#c8f135] hover:border-[#c8f135]/60 hover:bg-[#c8f135]/5 shadow-[0_0_8px_rgba(200,241,53,0.1)]'
                  : engine === 'kling'
                    ? 'bg-orange-500 border border-orange-500 text-black hover:bg-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.7)] animate-pulse'
                    : 'bg-[#c8f135] border border-[#c8f135] text-black hover:bg-[#d4f545] shadow-[0_0_12px_rgba(200,241,53,0.7)] animate-pulse'
                }`}
              title={isSidebarOpen ? 'Hide parameters' : 'Show parameters'}
            >
              {isSidebarOpen ? (
                <ChevronLeft className="w-5 h-5 md:w-3 md:h-3" />
              ) : (
                <ChevronRight className="w-5 h-5 md:w-3 md:h-3" />
              )}
            </button>
          </div>

          {/* Right panel: Creation Gallery */}
          <div className="flex-1 bg-black/40 flex flex-col overflow-hidden pl-6 pb-6 pt-0 pr-0">
            <GalleryGrid />
          </div>

        </div>

        {/* Gallery Expand Modal */}
        <GalleryExpandModal />
      </div>
    </UGCContext.Provider>
  );
}
