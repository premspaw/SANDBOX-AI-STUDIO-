import React, { useState } from 'react';
import { 
  Zap, 
  X, 
  Film, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Clock, 
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const VideoExtensionPanel = ({
  sourceVideo, // { url, prompt, aspect } or string URL
  onCancel,
  extensionDuration = 4,
  setExtensionDuration,
  extensionPrompt = '',
  setExtensionPrompt,
  generateAudio = true,
  setGenerateAudio,
  resolution = '720p',
  setResolution,
  onGenerate,
  isGenerating = false,
  requiredCredits = 20
}) => {
  const [showContinuityInfo, setShowContinuityInfo] = useState(false);

  const videoUrl = typeof sourceVideo === 'string' ? sourceVideo : sourceVideo?.url;
  const originalPrompt = typeof sourceVideo === 'object' ? sourceVideo?.prompt : '';
  const videoAspect = typeof sourceVideo === 'object' ? sourceVideo?.aspect : '16:9';

  const quickContinuationSuggestions = [
    "Continue camera moving forward smoothly",
    "Character turns and begins speaking with natural gestures",
    "Camera pans 90 degrees to reveal surrounding environment",
    "Dramatic slow-motion continuation with volumetric lighting"
  ];

  return (
    <div className="space-y-3 p-3 rounded-2xl bg-black/50 border border-[#c8f135]/30 backdrop-blur-xl shadow-2xl relative overflow-hidden animate-fadeIn">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#c8f135]/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#c8f135]/15 border border-[#c8f135]/40 flex items-center justify-center shadow-[0_0_10px_rgba(200,241,53,0.2)]">
            <Zap size={13} className="text-[#c8f135] fill-current" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              <span>Scene Extension Mode</span>
              <span className="text-[8px] font-mono px-1.5 py-0.2 rounded-full bg-[#c8f135]/20 text-[#c8f135] border border-[#c8f135]/30">
                Omni 1.1 Flash
              </span>
            </h3>
            <p className="text-[9px] text-zinc-400 font-mono">
              Extending scene seamlessly from the exact final frame
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer"
          title="Exit Extension Mode"
        >
          <X size={11} />
          <span>Cancel</span>
        </button>
      </div>

      {/* Source Video Preview Card */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400">
          <span className="flex items-center gap-1 text-zinc-300 font-bold uppercase tracking-wider">
            <Film size={10} className="text-[#c8f135]" />
            Source Video to Extend
          </span>
          <span className="text-[8px] text-zinc-500">End frame locked</span>
        </div>

        <div className={cn(
          "w-full rounded-xl overflow-hidden bg-black/80 border border-[#c8f135]/40 relative group shadow-lg flex items-center justify-center",
          videoAspect === '9:16' ? 'aspect-[9/16] max-h-[220px]' : videoAspect === '1:1' ? 'aspect-square max-h-[180px]' : 'aspect-video'
        )}>
          {videoUrl ? (
            <video
              src={videoUrl}
              className="w-full h-full object-cover"
              controls
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <div className="p-4 text-center text-zinc-500 text-xs">No video loaded</div>
          )}

          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-[#c8f135]/40 text-[8.5px] font-mono font-bold text-[#c8f135] shadow">
            @source_clip
          </div>

          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 text-[8px] font-mono text-zinc-300 flex items-center gap-1">
            <Clock size={9} className="text-[#c8f135]" />
            <span>Continuity Active</span>
          </div>
        </div>

        {originalPrompt && (
          <p className="text-[8.5px] text-zinc-400 font-mono line-clamp-1 italic px-1" title={originalPrompt}>
            Scene: "{originalPrompt}"
          </p>
        )}
      </div>

      {/* Extension Duration Selector (+4s or +8s) */}
      <div className="space-y-1.5 pt-1">
        <label className="text-[9.5px] font-black uppercase tracking-wider text-zinc-300 flex items-center justify-between">
          <span>Extension Length</span>
          <span className="text-[8.5px] font-mono text-[#c8f135]">{requiredCredits}⚡ Shorts</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setExtensionDuration(4)}
            className={cn(
              "py-2 px-3 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer active:scale-95",
              extensionDuration === 4
                ? "bg-[#c8f135]/20 border-[#c8f135] text-[#c8f135] shadow-[0_0_15px_rgba(200,241,53,0.2)]"
                : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
            )}
          >
            <span className="flex items-center gap-1.5">
              <Zap size={11} className={extensionDuration === 4 ? "fill-current" : ""} />
              <span>+4 Seconds</span>
            </span>
            <span className="text-[9px] font-mono font-bold">20⚡</span>
          </button>

          <button
            type="button"
            onClick={() => setExtensionDuration(8)}
            className={cn(
              "py-2 px-3 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer active:scale-95",
              extensionDuration === 8
                ? "bg-[#c8f135]/20 border-[#c8f135] text-[#c8f135] shadow-[0_0_15px_rgba(200,241,53,0.2)]"
                : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
            )}
          >
            <span className="flex items-center gap-1.5">
              <Zap size={11} className={extensionDuration === 8 ? "fill-current" : ""} />
              <span>+8 Seconds</span>
            </span>
            <span className="text-[9px] font-mono font-bold">40⚡</span>
          </button>
        </div>
      </div>

      {/* Continuation Prompt Input */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between">
          <label className="text-[9.5px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1">
            <span>Next Action & Camera Motion</span>
            <span className="text-[8px] font-mono text-zinc-500 font-normal">(Optional)</span>
          </label>
          <button
            type="button"
            onClick={() => setShowContinuityInfo(!showContinuityInfo)}
            className="text-[8px] text-[#c8f135] font-mono flex items-center gap-1 hover:underline cursor-pointer"
          >
            <ShieldCheck size={10} />
            <span>Preloaded Continuity Active</span>
          </button>
        </div>

        {showContinuityInfo && (
          <div className="p-2 rounded-lg bg-[#c8f135]/10 border border-[#c8f135]/30 text-[8px] text-zinc-300 leading-relaxed space-y-1 animate-fadeIn">
            <div className="flex items-center gap-1 font-bold text-[#c8f135] uppercase tracking-wider">
              <CheckCircle2 size={10} /> Strict Background Continuity Directive
            </div>
            <p>
              The payload automatically enforces identical character identity, facial features, costumes, wardrobe textures, location geometry, color grade, time of day, and physical dynamics without visual drift.
            </p>
          </div>
        )}

        <div className="relative rounded-xl bg-black/60 border border-white/10 focus-within:border-[#c8f135]/70 transition-all p-2.5 space-y-2">
          <textarea
            value={extensionPrompt}
            onChange={(e) => setExtensionPrompt(e.target.value)}
            placeholder="Describe what happens next (e.g. 'Camera zooms in slowly as character begins speaking with subtle hand gestures'). Leave blank to naturally continue motion."
            rows={3}
            className="w-full bg-transparent text-xs text-white placeholder-zinc-500 outline-none resize-none leading-relaxed font-medium caret-[#c8f135] custom-scrollbar"
          />

          {/* Quick Suggestions Chips */}
          <div className="pt-1.5 border-t border-white/5 flex flex-wrap gap-1">
            {quickContinuationSuggestions.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setExtensionPrompt(sug)}
                className="text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-white/[0.04] hover:bg-[#c8f135]/15 border border-white/5 hover:border-[#c8f135]/30 text-zinc-400 hover:text-white transition-all truncate max-w-[200px] cursor-pointer"
                title={sug}
              >
                + {sug}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resolution & Audio Settings Row */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        {/* Audio Toggle */}
        <button
          type="button"
          onClick={() => setGenerateAudio(!generateAudio)}
          className={cn(
            "py-1.5 px-2.5 rounded-xl border text-[9.5px] font-bold flex items-center justify-between transition-all cursor-pointer",
            generateAudio
              ? "bg-[#c8f135]/10 border-[#c8f135]/40 text-[#c8f135]"
              : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white"
          )}
        >
          <span className="flex items-center gap-1.5">
            {generateAudio ? <Volume2 size={12} className="text-[#c8f135]" /> : <VolumeX size={12} />}
            <span>Sound Effects</span>
          </span>
          <span className="text-[8px] font-mono uppercase font-black">{generateAudio ? 'ON' : 'OFF'}</span>
        </button>

        {/* Resolution Selector */}
        <div className="flex items-center rounded-xl bg-black/60 border border-white/10 p-0.5 text-[9px] font-bold">
          {['720p', '1080p'].map((res) => (
            <button
              key={res}
              type="button"
              onClick={() => setResolution(res)}
              className={cn(
                "flex-1 py-1 rounded-lg text-center transition-all cursor-pointer uppercase font-mono",
                resolution === res
                  ? "bg-[#c8f135] text-black font-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              {res}
            </button>
          ))}
        </div>
      </div>

      {/* Execute Extension Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating || !videoUrl}
          className={cn(
            "w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
            "bg-[#c8f135] hover:bg-[#d8ff43] text-black shadow-[0_0_25px_rgba(200,241,53,0.3)]"
          )}
        >
          {isGenerating ? (
            <>
              <RefreshCw size={13} className="animate-spin" />
              <span>Extending Scene (+{extensionDuration}s)...</span>
            </>
          ) : (
            <>
              <Zap size={13} className="fill-current" />
              <span>Extend Video (+{extensionDuration}s) • {requiredCredits}⚡</span>
              <ArrowRight size={13} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default VideoExtensionPanel;
