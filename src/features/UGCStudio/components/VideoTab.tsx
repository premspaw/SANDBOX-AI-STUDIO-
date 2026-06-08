import React from 'react';
import { ChevronDown, Zap, Layout, Clock, FileText, Sparkles, Loader2 } from 'lucide-react';
import { useUGC } from '../context/UGCContext';

export default function VideoTab() {
  const {
    videoPrompt,
    setVideoPrompt,
    videoGenMode,
    setVideoGenMode,
    aspectRatio,
    setAspectRatio,
    durationSeconds,
    setDurationSeconds,
    script,
    productDetails,
    showPromptDropdown,
    setShowPromptDropdown,
    generateVideo,
    isGeneratingVideo,
    videoProgressMsg,
    getCurrentCost,
    splitScenes,
    setSplitScenes,
    activeSplitTab,
    generateAllSceneVideos
  } = useUGC();

  return (
    <div className="px-3 pt-3 pb-2">
      {/* Chat box + Generate button */}
      <div className="flex gap-2 items-stretch">

        {/* Professional Chat Input */}
        <div className="flex-1 flex flex-col border border-white/[0.08] focus-within:border-[#c8f135]/30 rounded-2xl transition-all duration-200 overflow-hidden bg-[#0d0d0f]">
          {/* Textarea */}
          <textarea
            value={videoPrompt}
            onChange={e => {
              const val = e.target.value;
              setVideoPrompt(val);
              if (splitScenes.length > 0) {
                setSplitScenes((prev: any[]) =>
                  prev.map((s, idx) => (idx === activeSplitTab ? { ...s, prompt: val } : s))
                );
              }
            }}
            rows={2}
            className="w-full bg-transparent border-0 text-[11px] text-white/80 placeholder-white/20 focus:outline-none resize-none leading-relaxed px-3 pt-3 pb-1 min-h-[52px] font-sans"
            placeholder={videoGenMode === 'veo_fast'
              ? 'Describe your video scene — Veo Fast generates an 8-sec clip…'
              : videoGenMode === 'veo_lite'
              ? 'Describe your video scene — Veo Lite generates a fast clip…'
              : 'Describe your video scene — Veo 3 HQ generates a premium clip…'}
          />
          {/* Pills toolbar — flush to bottom, no extra bg */}
          <div className="flex items-center gap-1.5 flex-wrap px-2 pb-2 pt-1 border-t border-white/[0.05]">
            {/* Mode Pill */}
            <div className="relative flex-shrink-0">
              <select
                value={videoGenMode === 'montage' ? 'veo_fast' : videoGenMode}
                onChange={e => setVideoGenMode(e.target.value as any)}
                className="appearance-none bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg pl-5 pr-4 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white/50 hover:text-white/80 cursor-pointer transition-all font-sans"
              >
                <option value="veo_lite" className="bg-[#0c0c0c] text-white">🍃 VEO LITE</option>
                <option value="veo_fast" className="bg-[#0c0c0c] text-white">⚡ VEO FAST</option>
                <option value="veo3" className="bg-[#0c0c0c] text-white">🎬 VEO 3 HQ</option>
              </select>
              {videoGenMode === 'veo_lite' ? (
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] pointer-events-none leading-none">🍃</span>
              ) : videoGenMode === 'veo3' ? (
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] pointer-events-none leading-none">🎬</span>
              ) : (
                <Zap size={7} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[#c8f135] pointer-events-none" />
              )}
              <ChevronDown size={7} className="absolute right-1 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>

            {/* Aspect Ratio Pill */}
            <div className="relative flex-shrink-0">
              <select
                value={aspectRatio}
                onChange={e => setAspectRatio(e.target.value as any)}
                className="appearance-none bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg pl-5 pr-4 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white/50 hover:text-white/80 cursor-pointer transition-all font-sans"
              >
                <option value="9:16" className="bg-[#0c0c0c] text-white">9:16</option>
                <option value="16:9" className="bg-[#0c0c0c] text-white">16:9</option>
                <option value="1:1" className="bg-[#0c0c0c] text-white">1:1</option>
              </select>
              <Layout size={7} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[#c8f135] pointer-events-none" />
              <ChevronDown size={7} className="absolute right-1 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>

            {/* Shot Duration Pill */}
            <div className="relative flex-shrink-0">
              <select
                value={durationSeconds}
                onChange={e => setDurationSeconds(e.target.value as any)}
                className="appearance-none bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg pl-5 pr-4 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white/50 hover:text-white/80 cursor-pointer transition-all font-sans"
              >
                <option value="4" className="bg-[#0c0c0c] text-white">4 SEC</option>
                <option value="6" className="bg-[#0c0c0c] text-white">6 SEC</option>
                <option value="8" className="bg-[#0c0c0c] text-white">8 SEC</option>
              </select>
              <Clock size={7} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[#c8f135] pointer-events-none" />
              <ChevronDown size={7} className="absolute right-1 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>

            {/* From Script Shortcut */}
            {script && (
              <button
                type="button"
                onClick={() => setVideoPrompt(script.replace(/\[[^\]]+\]/g, '').replace(/HOOK:|PAYOFF:|Scene \d+:/gi, '').trim())}
                className="px-2 py-0.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/70 transition-all flex items-center gap-1 flex-shrink-0 text-[8px] font-bold uppercase tracking-widest"
              >
                <FileText size={7} />
                <span>Script</span>
              </button>
            )}

            {/* Presets Dropdown */}
            {(() => {
              const prod = productDetails ? productDetails.substring(0, 60) : 'the product';
              const PROMPT_CHIPS = [
                { emoji: '🎯', label: 'Hook', prompt: `POV: I've been using ${prod} every day for 30 days. Here's what happened — close-up creator face reacting with genuine surprise, natural home lighting, UGC phone video style.` },
                { emoji: '✨', label: 'Reveal', prompt: `Slow unboxing reveal of ${prod} — hands carefully pulling tissue paper, product emerges from box. Overhead POV shot, warm natural light, satisfying reveal moment.` },
                { emoji: '📱', label: 'Selfie', prompt: `Creator taking a mirror selfie with ${prod}, holding it up proudly. Casual bedroom background, natural light, authentic UGC style, phone visible in reflection.` },
                { emoji: '💬', label: 'Talking', prompt: `Creator talking directly to camera about ${prod}: "This literally changed my routine." Close-up face shot, relatable tone, natural home background, UGC style.` },
                { emoji: '🛁', label: 'Routine', prompt: `Morning routine: creator using ${prod} in bathroom, natural window light, steam visible, authentic skincare/wellness vibe, phone-shot documentary style.` },
                { emoji: '🔬', label: 'Detail', prompt: `Extreme close-up macro shot of ${prod} texture and details — hands slowly turning it, showing every feature. Studio-quality natural light, product-hero shot.` },
                { emoji: '⚡', label: 'Energy', prompt: `High-energy fast-cut: creator grabs ${prod}, uses it, shows result — 3 quick 2-second cuts. Bold natural light, dynamic handheld motion, excited reaction.` },
                { emoji: '🎭', label: 'Before/After', prompt: `Split moment — creator's face before using ${prod} (tired/skeptical), then after (glowing/happy). Close-up emotional transition, natural lighting.` },
                { emoji: '🏃', label: 'On-the-Go', prompt: `Creator walking outside, holds ${prod} up to camera while talking: "I bring this everywhere with me." Handheld vlog style, outdoor daylight, UGC authentic feel.` },
                { emoji: '🎁', label: 'Gift', prompt: `Creator receives ${prod} as a gift, opens it excitedly — genuine surprise reaction, wrapping paper everywhere, warm home lighting, relatable UGC moment.` },
                { emoji: '👆', label: 'Tutorial', prompt: `Step-by-step tutorial: creator demonstrates how to use ${prod}, pointing at it clearly. "Step 1... Step 2..." format, educational framing, natural light.` },
                { emoji: '💪', label: 'Results', prompt: `Creator shows results of using ${prod}: "After 2 weeks, look at this difference." Shows evidence confidently. Close-up product, creator reaction, UGC testimonial style.` },
                { emoji: '🤫', label: 'Secret', prompt: `Creator whispers to camera: "Nobody talks about this but ${prod} is literally the best kept secret." Close-up conspiratorial tone, dark cozy background, intimate UGC vibe.` },
                { emoji: '🌅', label: 'Lifestyle', prompt: `Aspirational lifestyle shot: creator using ${prod} in a beautiful natural setting — morning coffee setup, golden hour light, relaxed aesthetic, premium UGC feel.` },
              ];
              return (
                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowPromptDropdown(!showPromptDropdown)}
                    className={`px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 flex-shrink-0 text-[8px] font-bold uppercase tracking-widest ${
                      showPromptDropdown
                        ? 'border-[#c8f135]/40 bg-[#c8f135]/10 text-[#c8f135]'
                        : 'border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/70'
                    }`}
                  >
                    <Sparkles size={7} />
                    <span>Presets</span>
                    <ChevronDown size={7} className={`transition-transform duration-200 ${showPromptDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showPromptDropdown && (
                    <div className="absolute bottom-full mb-2 left-0 z-50 w-56 bg-[#0e0e10] border border-[#1e1e24] rounded-2xl shadow-2xl overflow-hidden">
                      <div className="px-3 py-2 border-b border-white/5">
                        <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em]">Prebuilt Prompts</span>
                      </div>
                      <div className="max-h-64 overflow-y-auto py-1">
                        {PROMPT_CHIPS.map(chip => (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => { setVideoPrompt(chip.prompt); setShowPromptDropdown(false); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#c8f135]/8 hover:text-white transition-all group"
                          >
                            <span className="text-[12px] flex-shrink-0">{chip.emoji}</span>
                            <div className="min-w-0">
                              <p className="text-[9px] font-black uppercase tracking-widest text-white/70 group-hover:text-[#c8f135] transition-colors">{chip.label}</p>
                              <p className="text-[7px] text-white/25 font-mono leading-snug truncate">{chip.prompt.substring(0, 55)}…</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={splitScenes.length > 0 ? generateAllSceneVideos : () => generateVideo(videoPrompt || undefined)}
          disabled={isGeneratingVideo}
          className="w-24 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all shrink-0"
          style={{
            backgroundColor: isGeneratingVideo ? 'rgba(255,255,255,0.04)' : '#c8f135',
            color: isGeneratingVideo ? 'rgba(255,255,255,0.2)' : 'black',
            border: isGeneratingVideo ? '1px solid rgba(255,255,255,0.08)' : 'none'
          }}
        >
          {isGeneratingVideo ? (
            <>
              <Loader2 size={13} className="animate-spin text-white/40" />
              <span className="text-[7px] text-white/40 font-mono tracking-wider text-center px-1">{videoProgressMsg || 'Generating…'}</span>
            </>
          ) : (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
              <span className="text-[10px] font-black tracking-widest">
                {splitScenes.length > 0 ? 'Gen All' : 'Generate'}
              </span>
              <span className="text-[7px] opacity-50 font-mono tracking-wider">
                ({getCurrentCost(false) * (splitScenes.length > 0 ? splitScenes.length : 1)} S)
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}


