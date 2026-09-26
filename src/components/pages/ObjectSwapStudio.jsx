import React, { useState, useRef } from 'react';
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
  MagicWand,
  Package,
  Watch,
  Cube,
  Tag
} from '@phosphor-icons/react';
import { useAppStore } from '../../store';
import { useShorts } from '../../hooks/useShorts';
import { SHORTS_COST } from '../../config/shortsConfig';

const OBJECT_SWAP_PRESETS = [
  { 
    id: 'outfit_swap', 
    label: '🥋 Tactical Sci-Fi Outfit', 
    icon: Sparkle,
    prompt: 'Swap the character clothing and outfit with a high-tech sleek cyberpunk carbon-fiber tactical jacket with neon cyan illuminated seams and metallic accents.' 
  },
  { 
    id: 'prop_swap', 
    label: '🗡️ Neon Katana / Prop', 
    icon: MagicWand,
    prompt: 'Replace the handheld item/prop with an ultra-detailed glowing energy blade katana with subtle electric particle sparks and specular highlights.' 
  },
  { 
    id: 'product_placement', 
    label: '🥤 Luxury Product Can', 
    icon: Package,
    prompt: 'Replace the held drink container with the reference premium matte energy drink can, maintaining realistic lighting, hand grip reflection and shadows.' 
  },
  { 
    id: 'watch_accessory', 
    label: '⌚ Luxury Chronograph', 
    icon: Watch,
    prompt: 'Swap the wrist accessory with the reference luxury Swiss sapphire crystal chronograph watch, matching natural wrist movement, glare and skin occlusion.' 
  },
  { 
    id: 'vehicle_swap', 
    label: '🏎️ Cyber Hypercar', 
    icon: Cube,
    prompt: 'Replace the vehicle in the background with the sleek reference matte black hypercar with glowing taillights and realistic road reflections.' 
  },
  { 
    id: 'sneaker_swap', 
    label: '👟 Futuristic Sneakers', 
    icon: Tag,
    prompt: 'Swap the footwear with the reference futuristic limited-edition athletic sneakers, preserving foot placement, creases and floor contact shadows.' 
  }
];

export default function ObjectSwapStudio() {
  const [prompt, setPrompt] = useState('Swap the target object in the video with the provided reference item, preserving flawless lighting, depth, and motion dynamics.');
  const [resolution, setResolution] = useState('720p');
  
  // Media State
  const [videoInputMode, setVideoInputMode] = useState('upload'); // 'upload' | 'url'
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');

  const [imageInputMode, setImageInputMode] = useState('upload'); // 'upload' | 'url'
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [referenceImages, setReferenceImages] = useState([]); // array of { url: string, isDataUrl: boolean }

  // Generation & Progress State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedResult, setGeneratedResult] = useState(null);
  const [swapHistory, setSwapHistory] = useState([]);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const fileInputVideoRef = useRef(null);
  const fileInputImageRef = useRef(null);

  const { shorts, spend, refund, canAfford } = useShorts();
  const userProfile = useAppStore(state => state.userProfile);

  const costKey = `object_swap_${resolution}`;
  const costAmount = SHORTS_COST[costKey] || 8;

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

  const handleApplyVideoUrl = () => {
    if (videoUrlInput.trim()) {
      setVideoPreview(videoUrlInput.trim());
      setVideoFile(null);
      setErrorMessage('');
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (referenceImages.length + files.length > 8) {
        setErrorMessage('Maximum 8 replacement reference images allowed.');
        return;
      }
      const dataUrls = await Promise.all(files.map(fileToDataUrl));
      setReferenceImages(prev => [...prev, ...dataUrls.map(url => ({ url, isDataUrl: true }))]);
      setErrorMessage('');
    }
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      if (referenceImages.length >= 8) {
        setErrorMessage('Maximum 8 replacement reference images allowed.');
        return;
      }
      setReferenceImages(prev => [...prev, { url: imageUrlInput.trim(), isDataUrl: false }]);
      setImageUrlInput('');
      setErrorMessage('');
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setReferenceImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSelectPreset = (presetPrompt) => {
    setPrompt(presetPrompt);
  };

  const handleStartObjectSwap = async () => {
    if (isGenerating) return;
    setErrorMessage('');

    const sourceVideo = videoPreview;
    if (!sourceVideo) {
      setErrorMessage('Please upload or specify a source video.');
      return;
    }

    if (referenceImages.length === 0) {
      setErrorMessage('Please provide at least one reference image for the replacement object.');
      return;
    }

    // Check Credits
    if (!canAfford(costKey)) {
      setErrorMessage(`Insufficient Shorts balance. You need ${costAmount} Shorts for ${resolution} Object Swap.`);
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
    setStatusMessage('Initiating Genjutsu Object Swap Engine...');

    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 92) return 92;
        if (prev < 30) setStatusMessage('Analyzing Scene Geometry & Tracking Objects...');
        else if (prev < 55) setStatusMessage('Segmenting Target Items & Boundaries...');
        else if (prev < 78) setStatusMessage('Neural Inpainting & Object Material Swap...');
        else setStatusMessage('Synthesizing Motion Consistency & Reflections...');
        return prev + Math.floor(Math.random() * 8 + 4);
      });
    }, 1900);

    try {
      const response = await fetch('/api/remix/object-swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userProfile?.id || 'anonymous'
        },
        body: JSON.stringify({
          prompt,
          video_url: sourceVideo,
          image_urls: referenceImages.map(img => img.url),
          resolution,
          userId: userProfile?.id
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete Object Swap.');
      }

      clearInterval(progressInterval);
      setGenerationProgress(100);
      setStatusMessage('Object Swap Synthesis Complete!');

      const newItem = {
        id: data.requestId || `object-swap-${Date.now()}`,
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
      setSwapHistory(prev => [newItem, ...prev]);
      setIsGenerating(false);

    } catch (err) {
      console.error('[ObjectSwapStudio] Generation error:', err);
      clearInterval(progressInterval);
      setIsGenerating(false);
      setErrorMessage(err.message || 'Generation failed on Higgsfield Object Swap engine.');
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
    <div className="flex-1 h-full w-full bg-[#07090e] text-white flex flex-col overflow-hidden relative font-sans">
      {/* Dynamic Ambient Glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-[600px] h-[600px] bg-teal-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Header Bar */}
      <div className="h-16 border-b border-white/10 px-6 flex items-center justify-between bg-black/40 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <MagicWand size={20} weight="bold" className={isGenerating ? "animate-spin" : ""} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-wider uppercase text-white">Object Swap Studio</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-400/10 border border-cyan-400/30 text-cyan-300">
                GENJUTSU OBJECT SWAP
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Swap props, outfits, products & items seamlessly in any video with reference images</p>
          </div>
        </div>

        {/* Credit & Status Pill */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-zinc-300">
            <Coins size={16} className="text-cyan-400" />
            <span>Shorts Balance:</span>
            <span className="font-bold text-white">{shorts ?? 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-medium">Higgsfield Engine Live</span>
          </div>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden z-10">
        
        {/* Left Controls & Parameters Sidebar */}
        <div className="w-full lg:w-[440px] xl:w-[480px] border-r border-white/10 bg-black/60 backdrop-blur-2xl flex flex-col min-h-0 overflow-y-auto custom-scrollbar p-5 space-y-5 shrink-0">
          
          {/* Source Video Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
                <VideoCamera size={14} className="text-cyan-400" />
                <span>1. Source Video (Required)</span>
              </label>
              <div className="flex gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10 text-[10px]">
                <button
                  type="button"
                  onClick={() => setVideoInputMode('upload')}
                  className={`px-2 py-0.5 rounded ${videoInputMode === 'upload' ? 'bg-cyan-400 text-black font-bold' : 'text-zinc-400'}`}
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setVideoInputMode('url')}
                  className={`px-2 py-0.5 rounded ${videoInputMode === 'url' ? 'bg-cyan-400 text-black font-bold' : 'text-zinc-400'}`}
                >
                  URL
                </button>
              </div>
            </div>

            {videoInputMode === 'upload' ? (
              <div>
                <input 
                  type="file" 
                  accept="video/*" 
                  ref={fileInputVideoRef}
                  onChange={handleVideoUpload} 
                  className="hidden" 
                />
                <div 
                  onClick={() => fileInputVideoRef.current?.click()}
                  className="relative flex flex-col items-center justify-center h-32 rounded-2xl border-2 border-dashed border-white/15 hover:border-cyan-500/50 bg-white/[0.02] hover:bg-cyan-500/[0.03] transition-all cursor-pointer overflow-hidden group"
                >
                  {videoPreview ? (
                    <>
                      <video src={videoPreview} className="w-full h-full object-cover" muted loop autoPlay />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-semibold text-cyan-300 transition-opacity">
                        Replace Video
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-center p-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 group-hover:bg-cyan-500/20 flex items-center justify-center text-zinc-400 group-hover:text-cyan-400 transition-colors">
                        <UploadSimple size={18} />
                      </div>
                      <span className="text-[11px] font-semibold text-zinc-200">Click to Upload Footage</span>
                      <span className="text-[9px] text-zinc-500">MP4, MOV (The scene containing the object to swap)</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/scene-video.mp4"
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/60"
                />
                <button
                  type="button"
                  onClick={handleApplyVideoUrl}
                  className="px-3 py-2 rounded-xl bg-cyan-400 text-black text-xs font-bold hover:bg-cyan-300"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Replacement Object/Item Reference Images Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
                <Package size={14} className="text-emerald-400" />
                <span>2. Replacement Object Reference (1-8 Images)</span>
              </label>
              <div className="flex gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10 text-[10px]">
                <button
                  type="button"
                  onClick={() => setImageInputMode('upload')}
                  className={`px-2 py-0.5 rounded ${imageInputMode === 'upload' ? 'bg-emerald-400 text-black font-bold' : 'text-zinc-400'}`}
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setImageInputMode('url')}
                  className={`px-2 py-0.5 rounded ${imageInputMode === 'url' ? 'bg-emerald-400 text-black font-bold' : 'text-zinc-400'}`}
                >
                  URL
                </button>
              </div>
            </div>

            {imageInputMode === 'upload' ? (
              <div>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  ref={fileInputImageRef}
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
                <div 
                  onClick={() => fileInputImageRef.current?.click()}
                  className="relative flex flex-col items-center justify-center h-24 rounded-2xl border-2 border-dashed border-white/15 hover:border-emerald-500/50 bg-white/[0.02] hover:bg-emerald-500/[0.03] transition-all cursor-pointer overflow-hidden group"
                >
                  <div className="flex flex-col items-center gap-1 text-center p-2">
                    <div className="w-7 h-7 rounded-lg bg-white/5 group-hover:bg-emerald-500/20 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 transition-colors">
                      <Plus size={16} />
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-200">Add Object / Product Photos</span>
                    <span className="text-[9px] text-zinc-500">PNG, JPG (Upload angles of the replacement object)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/replacement-item.jpg"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-2 rounded-xl bg-emerald-400 text-black text-xs font-bold hover:bg-emerald-300"
                >
                  Add
                </button>
              </div>
            )}

            {/* Thumbnail Grid of Reference Images */}
            {referenceImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2 pt-1">
                {referenceImages.map((img, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-white/10 bg-black aspect-square">
                    <img src={img.url} alt={`Object Ref ${idx + 1}`} className="w-full h-full object-cover" />
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

          {/* Quick Swap Presets */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Object Swap Presets</label>
            <div className="grid grid-cols-2 gap-1.5">
              {OBJECT_SWAP_PRESETS.map((preset) => {
                const IconComponent = preset.icon;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.prompt)}
                    className="px-2.5 py-2 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/10 hover:border-cyan-400/40 text-[11px] text-zinc-300 text-left transition-all truncate flex items-center gap-1.5"
                  >
                    <IconComponent size={14} className="text-cyan-400 shrink-0" />
                    <span className="truncate">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Object Swap Prompt */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center justify-between">
              <span>3. Swap Instructions / Prompt</span>
              <span className="text-[10px] text-cyan-400">Specify Target Item</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Describe which object to replace and how the replacement should integrate..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all resize-none"
            />
          </div>

          {/* Resolution Options with Credit Cost */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center justify-between">
              <span>Resolution Quality</span>
              <span className="text-xs font-bold text-cyan-400">{costAmount} Shorts</span>
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
                      ? 'bg-cyan-400 text-black font-black shadow-[0_0_12px_rgba(6,182,212,0.35)]'
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
              onClick={handleStartObjectSwap}
              disabled={isGenerating}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2.5 transition-all ${
                isGenerating
                  ? 'bg-cyan-500/30 text-cyan-200 cursor-not-allowed border border-cyan-500/40'
                  : 'bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-black shadow-[0_0_25px_rgba(6,182,212,0.4)] active:scale-[0.98]'
              }`}
            >
              {isGenerating ? (
                <>
                  <ArrowsClockwise size={20} className="animate-spin" />
                  <span>Executing Object Swap ({generationProgress}%)</span>
                </>
              ) : (
                <>
                  <MagicWand size={20} weight="fill" />
                  <span>Synthesize Object Swap ({costAmount} Shorts)</span>
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
                  <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-cyan-400">
                    {generationProgress}%
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">{statusMessage}</h3>
                  <p className="text-xs text-zinc-400 mt-1">Replacing object geometry while preserving lighting & reflections...</p>
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
                    download="genjutsu-object-swap.mp4"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-cyan-400 text-black font-bold hover:bg-cyan-300 transition-all flex items-center gap-1.5 text-xs"
                  >
                    <DownloadSimple size={16} weight="bold" />
                    <span>Download MP4</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center p-6 text-zinc-500 max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-zinc-600">
                  <Cube size={32} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Ready for Object Swap Synthesis</h3>
                  <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                    Upload your source video, supply 1-8 reference images of the replacement object, prop, product, or outfit, and synthesize your video.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* History / Recent Object Swaps Carousel */}
          {swapHistory.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Clock size={16} />
                <span>Recent Object Swaps ({swapHistory.length})</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {swapHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setGeneratedResult(item)}
                    className="group relative rounded-2xl border border-white/10 hover:border-cyan-400/50 bg-white/[0.02] p-2.5 cursor-pointer transition-all overflow-hidden"
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
                        <span className="font-bold text-cyan-400/80">{item.resolution}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
