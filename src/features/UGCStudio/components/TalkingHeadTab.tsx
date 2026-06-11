import React from 'react';
import { Loader2, Film } from 'lucide-react';
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
    getCurrentCost
  } = useUGC();

  return (
    <div className="p-4 space-y-3">
      {/* Script textarea */}
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

      {/* Settings row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-[7px] font-black text-white/25 uppercase tracking-widest">Engine</span>
          {([['veo_lite', '🍃 Lite'], ['veo_fast', '⚡ Fast'], ['veo3', '🎬 HQ']] as const).map(([val, lbl]) => (
            <button
              key={val}
              type="button"
              onClick={() => setThEngine(val)}
              className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${thEngine === val ? 'bg-[#c8f135] text-black border-[#c8f135]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
            >
              {lbl}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-[7px] font-black text-white/25 uppercase tracking-widest">Ratio</span>
          {(['9:16', '16:9'] as const).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setThAspectRatio(r)}
              className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${thAspectRatio === r ? 'bg-[#c8f135] text-black border-[#c8f135]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[7px] font-black text-white/25 uppercase tracking-widest">Dur</span>
          {(['4', '6', '8'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setThDuration(s)}
              className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${thDuration === s ? 'bg-[#c8f135] text-black border-[#c8f135]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
            >
              {s}s
            </button>
          ))}
        </div>
      </div>

      {/* Warning if no image yet */}
      {!thGeneratedImg && (
        <p className="text-[8px] text-amber-400/70 font-mono uppercase tracking-widest text-center">
          ⚠️ Generate the reference image first (Image tab → sidebar)
        </p>
      )}

      {/* Generate button */}
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
    </div>
  );
};
