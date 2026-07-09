import React from 'react';
import { Loader2, Film, Clock, ChevronDown, Layout } from 'lucide-react';
import { useUGC } from '../context/UGCContext';

export const TalkingHeadTab: React.FC = () => {
  const {
    thScript,
    setThScript,
    thEngine,
    setThEngine,
    thAspectRatio,
    setThAspectRatio,
    thDuration,
    setThDuration,
    thGeneratedImg,
    thIsGeneratingVideo,
    thVideoProgress,
    generateTalkingHeadVideo,
    getCurrentCost,
    splitScenes
  } = useUGC();

  return (
    <div className="p-4 space-y-3">
      {/* Script textarea (only shown if not in split scenes mode) */}
      {splitScenes.length === 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Hook / Script</p>
            <span className="text-[7px] text-white/20 font-mono">
              {thScript.length}/400 · under 60 words = best lip sync
            </span>
          </div>
          <textarea
            value={thScript}
            onChange={e => setThScript(e.target.value)}
            placeholder="Write what the creator says to camera — hook first, then sell. Keep it punchy."
            rows={3}
            className="w-full bg-white/5 border border-[#1e1e24] rounded-xl px-3 py-2.5 text-[11px] text-white/90 placeholder-white/20 focus:outline-none focus:border-[#c8f135]/40 resize-none leading-relaxed"
          />
        </div>
      )}

      {/* Settings row */}
      <div className="flex items-center gap-1.5 flex-wrap px-2 pb-2 pt-1 border-t border-white/[0.05]">
        {/* Engine Dropdown */}
        <div className="relative flex-shrink-0">
          <select
            value={thEngine}
            onChange={e => setThEngine(e.target.value as any)}
            className="appearance-none bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg pl-5 pr-4 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white/50 hover:text-white/80 cursor-pointer transition-all font-sans"
          >
            <option value="veo_lite" className="bg-[#0c0c0c] text-white">🍃 VEO LITE</option>
            <option value="veo_fast" className="bg-[#0c0c0c] text-white">⚡ VEO FAST</option>
            <option value="veo3" className="bg-[#0c0c0c] text-white">🎬 VEO 3 HQ</option>
            <option value="omni-flash" className="bg-[#0c0c0c] text-white">✨ OMNI FLASH</option>
          </select>
          {thEngine === 'veo_lite' ? (
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] pointer-events-none leading-none">🍃</span>
          ) : thEngine === 'veo3' ? (
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] pointer-events-none leading-none">🎬</span>
          ) : thEngine === 'omni-flash' ? (
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] pointer-events-none leading-none">✨</span>
          ) : (
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] pointer-events-none leading-none">⚡</span>
          )}
          <ChevronDown size={7} className="absolute right-1 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        </div>

        {/* Aspect Ratio Dropdown */}
        <div className="relative flex-shrink-0">
          <select
            value={thAspectRatio}
            onChange={e => setThAspectRatio(e.target.value as any)}
            className="appearance-none bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg pl-5 pr-4 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white/50 hover:text-white/80 cursor-pointer transition-all font-sans"
          >
            <option value="9:16" className="bg-[#0c0c0c] text-white">9:16</option>
            <option value="16:9" className="bg-[#0c0c0c] text-white">16:9</option>
          </select>
          <Layout size={7} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[#c8f135] pointer-events-none" />
          <ChevronDown size={7} className="absolute right-1 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        </div>

        {/* Shot Duration Dropdown */}
        <div className="relative flex-shrink-0">
          <select
            value={thDuration}
            onChange={e => setThDuration(e.target.value as any)}
            className="appearance-none bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg pl-5 pr-4 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white/50 hover:text-white/80 cursor-pointer transition-all font-sans"
          >
            <option value="4" className="bg-[#0c0c0c] text-white">4 SEC</option>
            <option value="6" className="bg-[#0c0c0c] text-white">6 SEC</option>
            <option value="8" className="bg-[#0c0c0c] text-white">8 SEC</option>
            {thEngine === 'omni-flash' && (
              <>
                <option value="10" className="bg-[#0c0c0c] text-white">10 SEC</option>
                <option value="20" className="bg-[#0c0c0c] text-white">20 SEC</option>
                <option value="30" className="bg-[#0c0c0c] text-white">30 SEC</option>
                <option value="40" className="bg-[#0c0c0c] text-white">40 SEC</option>
                <option value="50" className="bg-[#0c0c0c] text-white">50 SEC</option>
                <option value="60" className="bg-[#0c0c0c] text-white">60 SEC</option>
              </>
            )}
          </select>
          <Clock size={7} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[#c8f135] pointer-events-none" />
          <ChevronDown size={7} className="absolute right-1 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        </div>
      </div>

      {/* Warning if no image yet */}
      {splitScenes.length === 0 && !thGeneratedImg && (
        <p className="text-[8px] text-amber-400/70 font-mono uppercase tracking-widest text-center">
          ⚠️ Generate the reference image first (Image tab → sidebar)
        </p>
      )}

      {/* Generate button */}
      {splitScenes.length === 0 && (
        <button
          onClick={generateTalkingHeadVideo}
          disabled={thIsGeneratingVideo || !thGeneratedImg || !thScript.trim()}
          className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
            thIsGeneratingVideo ? 'bg-white/5 text-white/20 cursor-not-allowed' :
            (!thGeneratedImg || !thScript.trim()) ? 'bg-white/5 text-white/10 cursor-not-allowed border border-white/5' :
            'bg-[#c8f135] text-black hover:bg-[#d4ff3a] shadow-[0_4px_16px_rgba(200,241,53,0.3)]'
          }`}
        >
          {thIsGeneratingVideo ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              <span>{thVideoProgress || 'Generating…'}</span>
            </>
          ) : (
            <>
              <Film size={12} />
              <span>Generate Talking Head Video · ⚡ {getCurrentCost(false)}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
