import React, { useState } from 'react';
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
  GearSix
} from '@phosphor-icons/react';
import { useAppStore } from '../../store';
import { useShorts } from '../../hooks/useShorts';

export default function RemixStudio() {
  const [prompt, setPrompt] = useState('A cinematic remix with dynamic lighting and surreal visual rhythm');
  const [negativePrompt, setNegativePrompt] = useState('low quality, blurry, distorted artifacts, stuttering');
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState('720p');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [referenceVideo, setReferenceVideo] = useState(null);
  const [referenceVideoPreview, setReferenceVideoPreview] = useState(null);
  const [referenceImage, setReferenceImage] = useState(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [generatedResult, setGeneratedResult] = useState(null);
  const [remixHistory, setRemixHistory] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const { shorts } = useShorts();
  const userProfile = useAppStore(state => state.userProfile);

  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setReferenceVideo(file);
      const url = URL.createObjectURL(file);
      setReferenceVideoPreview(url);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setReferenceImage(file);
      const url = URL.createObjectURL(file);
      setReferenceImagePreview(url);
    }
  };

  const handleStartRemix = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenerationProgress(5);
    setStatusMessage('Initiating Remix Engine...');

    try {
      // Placeholder generation lifecycle simulation ready for backend connection
      const interval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          if (prev < 30) setStatusMessage('Analyzing Source Video & Motion DNA...');
          else if (prev < 60) setStatusMessage('Synthesizing Multimodal Frames...');
          else setStatusMessage('Applying Neural Post-Processing & Audio Sync...');
          return prev + 15;
        });
      }, 1200);

      // Simulation timeout until API code is connected
      setTimeout(() => {
        clearInterval(interval);
        setGenerationProgress(100);
        setStatusMessage('Remix Generation Complete!');
        setIsGenerating(false);

        const mockItem = {
          id: `remix-${Date.now()}`,
          prompt,
          duration,
          resolution,
          aspectRatio,
          url: 'https://d3u0tzju9qaucj.cloudfront.net/9ab8d5b3-dac2-4e52-8ced-759ba2cc3bc6/ac295d16-604a-4fa9-a105-4141314edde7.mp4',
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setGeneratedResult(mockItem);
        setRemixHistory(prev => [mockItem, ...prev]);
      }, 7000);
    } catch (err) {
      console.error(err);
      setStatusMessage('Generation Error');
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 h-full w-full bg-[#08080c] text-white flex flex-col overflow-hidden relative font-sans">
      {/* Background Ambience / Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

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
                PRO ENGINE
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Reimagine, transform, and re-synthesize video footage with AI</p>
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
            <span className="font-medium">Engine Ready</span>
          </div>
        </div>
      </div>

      {/* Main Studio Body: Left Controls + Right Viewport */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden z-10">
        {/* Left Sidebar: Controls & Parameters */}
        <div className="w-full lg:w-[420px] xl:w-[460px] border-r border-white/10 bg-black/60 backdrop-blur-2xl flex flex-col min-h-0 overflow-y-auto custom-scrollbar p-5 space-y-6 shrink-0">
          
          {/* Source Video / Image Upload Cards */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center justify-between">
              <span>Source Media</span>
              <span className="text-[10px] font-normal text-zinc-500">Video or Image</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              {/* Reference Video Upload */}
              <label className="relative flex flex-col items-center justify-center h-36 rounded-2xl border-2 border-dashed border-white/10 hover:border-amber-500/50 bg-white/[0.02] hover:bg-amber-500/[0.03] transition-all cursor-pointer overflow-hidden group">
                <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                {referenceVideoPreview ? (
                  <video src={referenceVideoPreview} className="w-full h-full object-cover" muted loop autoPlay />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center p-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 group-hover:bg-amber-500/20 flex items-center justify-center text-zinc-400 group-hover:text-amber-400 transition-colors">
                      <VideoCamera size={20} />
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-300">Upload Video</span>
                    <span className="text-[9px] text-zinc-500">MP4, MOV (Max 15s)</span>
                  </div>
                )}
                {referenceVideoPreview && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-semibold text-amber-300 transition-opacity">
                    Change Video
                  </div>
                )}
              </label>

              {/* Reference Style Image Upload */}
              <label className="relative flex flex-col items-center justify-center h-36 rounded-2xl border-2 border-dashed border-white/10 hover:border-purple-500/50 bg-white/[0.02] hover:bg-purple-500/[0.03] transition-all cursor-pointer overflow-hidden group">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                {referenceImagePreview ? (
                  <img src={referenceImagePreview} alt="Reference" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center p-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 group-hover:bg-purple-500/20 flex items-center justify-center text-zinc-400 group-hover:text-purple-400 transition-colors">
                      <Sparkle size={20} />
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-300">Style / Subject Ref</span>
                    <span className="text-[9px] text-zinc-500">PNG, JPG (Optional)</span>
                  </div>
                )}
                {referenceImagePreview && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-semibold text-purple-300 transition-opacity">
                    Change Image
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Remix Prompt Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center justify-between">
              <span>Remix Prompt</span>
              <span className="text-[10px] text-amber-400">Describe transformation</span>
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Describe how the scene, style, lighting, or motion should be remixed..."
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all resize-none"
              />
            </div>
          </div>

          {/* Negative Prompt */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>Negative Prompt</span>
              <span className="text-[10px] text-zinc-500">Elements to avoid</span>
            </label>
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="low quality, artifacts, blur..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Aspect Ratio & Resolution Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Aspect Ratio */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">Aspect Ratio</label>
              <div className="grid grid-cols-3 gap-1.5 bg-white/[0.02] p-1 rounded-xl border border-white/10">
                {['16:9', '9:16', '1:1'].map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      aspectRatio === ratio
                        ? 'bg-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">Resolution</label>
              <div className="grid grid-cols-2 gap-1.5 bg-white/[0.02] p-1 rounded-xl border border-white/10">
                {['720p', '1080p'].map((res) => (
                  <button
                    key={res}
                    type="button"
                    onClick={() => setResolution(res)}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      resolution === res
                        ? 'bg-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Duration Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">Duration</label>
              <span className="text-xs font-bold text-amber-400">{duration} Seconds</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[4, 5, 8, 10].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setDuration(sec)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    duration === sec
                      ? 'bg-amber-400/10 border-amber-400 text-amber-300'
                      : 'border-white/10 bg-white/[0.02] text-zinc-400 hover:text-white'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Action Trigger Button */}
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
                  <span>Processing Remix ({generationProgress}%)</span>
                </>
              ) : (
                <>
                  <Lightning size={20} weight="fill" />
                  <span>Synthesize Remix</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Viewport: Live Preview & Canvas */}
        <div className="flex-1 flex flex-col min-h-0 bg-black/40 overflow-y-auto custom-scrollbar p-6 space-y-6">
          
          {/* Main Video Stage */}
          <div className="w-full flex-1 min-h-[420px] rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl relative overflow-hidden flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.8)]">
            
            {isGenerating ? (
              <div className="flex flex-col items-center gap-4 text-center p-6 z-10">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-4 border-amber-500/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-amber-400">
                    {generationProgress}%
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">{statusMessage}</h3>
                  <p className="text-xs text-zinc-400 mt-1">Transforming video neural layers...</p>
                </div>
              </div>
            ) : generatedResult ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  src={generatedResult.url}
                  className="w-full h-full object-contain max-h-[600px]"
                  controls
                  autoPlay
                  loop
                />
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <a
                    href={generatedResult.url}
                    download="remix-render.mp4"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all"
                  >
                    <DownloadSimple size={18} />
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center p-6 text-zinc-500">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-zinc-600">
                  <FilmSlate size={32} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-300">Ready for Remix Synthesis</h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                    Upload your source video or image, configure your transformation prompt, and click Synthesize Remix.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* History / Recent Remixes Bar */}
          {remixHistory.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Clock size={16} />
                <span>Recent Remix Generations</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {remixHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setGeneratedResult(item)}
                    className="group relative rounded-2xl border border-white/10 hover:border-amber-400/50 bg-white/[0.02] p-2 cursor-pointer transition-all overflow-hidden"
                  >
                    <div className="w-full h-24 rounded-xl bg-black overflow-hidden relative">
                      <video src={item.url} className="w-full h-full object-cover" muted />
                      <div className="absolute inset-0 bg-black/40 group-hover:opacity-0 transition-opacity flex items-center justify-center">
                        <Play size={20} className="text-white opacity-80" />
                      </div>
                    </div>
                    <div className="p-1 mt-1">
                      <p className="text-[10px] text-zinc-300 truncate font-medium">{item.prompt}</p>
                      <span className="text-[9px] text-zinc-500">{item.createdAt} • {item.resolution}</span>
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
