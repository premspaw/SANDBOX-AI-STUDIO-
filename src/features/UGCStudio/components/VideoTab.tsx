import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Zap, Layout, Clock, FileText, Sparkles, Loader2, Film, X } from 'lucide-react';
import { useUGC } from '../context/UGCContext';
import { resolveUrl } from '../../../config/apiConfig';
import DropUpPortal from './DropUpPortal';

export default function VideoTab() {
  const {
    videoPrompt,
    setVideoPrompt,
    videoGenMode,
    setVideoGenMode,
    videoResolution,
    setVideoResolution,
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
    generateAllSceneVideos,
    multiShotPrompt,
    setMultiShotPrompt,
    setShowTemplates,
    isGeneratingSplitPrompt,
    generateSplitScenePrompt,
    generateGeneralVideoPrompt,
    isGeneratingGeneralPrompt,
    attachedRefImage,
    setAttachedRefImage,
    attachedRefImages,
    setAttachedRefImages,
  } = useUGC();

  const presetsBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="px-3 pt-3 pb-2">
      {/* Chat box + Generate button */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch">

        {/* Professional Chat Input */}
        <div className="flex-1 flex flex-col border border-white/[0.08] focus-within:border-[#c8f135]/30 rounded-2xl transition-all duration-200 bg-[#0d0d0f] relative z-10">
          {/* Textarea */}
          <textarea
            value={videoPrompt}
            onChange={e => {
              const val = e.target.value;
              setVideoPrompt(val);
              if (splitScenes.length > 0) {
                setSplitScenes((prev: any[]) =>
                  prev.map((s, idx) => (multiShotPrompt ? { ...s, prompt: val } : (idx === activeSplitTab ? { ...s, prompt: val } : s)))
                );
              }
            }}
            rows={2}
            className="w-full bg-transparent border-0 text-[11px] text-white/80 placeholder-white/20 focus:outline-none resize-none leading-relaxed px-3 pt-3 pb-1 min-h-[52px] font-sans rounded-t-2xl"
            placeholder="Describe your video scene — Gemini Omni Flash 1.1 generates up to a 10-sec clip…"
          />

          {/* Attached Reference Images Row */}
          {(() => {
            const refs = splitScenes.length > 0
              ? (splitScenes[activeSplitTab]?.refImages || [])
              : attachedRefImages;

            if (!refs || refs.length === 0) return null;

            return (
              <div className="flex flex-wrap gap-2 items-center px-3 py-1.5 bg-white/[0.01] border-t border-white/[0.04]">
                <span className="text-[7.5px] font-black uppercase tracking-wider text-white/30 mr-1">Refs ({refs.length}/3):</span>
                {refs.map((refUrl, idx) => (
                  <div key={refUrl} className="relative group/att">
                    <img
                      src={resolveUrl(refUrl)}
                      alt={`ref-${idx}`}
                      className="w-10 h-10 rounded-lg object-cover border border-[#c8f135]/30 shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (splitScenes.length > 0) {
                          setSplitScenes((prev: any[]) =>
                            prev.map((s, i) => {
                              if (i !== activeSplitTab) return s;
                              const updatedRefs = (s.refImages || []).filter((r: string) => r !== refUrl);
                              return { ...s, refImage: updatedRefs[0] || null, refImages: updatedRefs };
                            })
                          );
                        } else {
                          setAttachedRefImages(prev => prev.filter((_, i) => i !== idx));
                        }
                      }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity shadow-lg"
                    >
                      <X size={8} />
                    </button>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Bottom Toolbar inside Chat Box */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-t border-white/[0.04] bg-white/[0.015] rounded-b-2xl overflow-x-auto no-scrollbar select-none" style={{ scrollbarWidth: 'none' }}>
            {/* Engine Pill */}
            <div className="relative flex-shrink-0">
              <select
                value={videoGenMode}
                onChange={e => setVideoGenMode(e.target.value as any)}
                className="appearance-none bg-cyan-500/[0.08] hover:bg-cyan-500/[0.14] border border-cyan-500/30 rounded-lg pl-5 pr-4 py-1 text-[8.5px] font-bold uppercase tracking-wider text-cyan-300 hover:text-white cursor-pointer transition-all font-sans"
              >
                <option value="omni-flash-1.1" className="bg-[#0c0c0c] text-white">⚡ OMNI FLASH 1.1</option>
              </select>
              <Zap size={8} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none" />
              <ChevronDown size={8} className="absolute right-1 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>

            {/* Resolution Pill */}
            <div className="relative flex-shrink-0">
              <select
                value={videoResolution}
                onChange={e => setVideoResolution(e.target.value as any)}
                className="appearance-none bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 rounded-lg pl-5 pr-4 py-1 text-[8.5px] font-bold uppercase tracking-wider text-white/70 hover:text-white cursor-pointer transition-all font-sans"
              >
                <option value="720p" className="bg-[#0c0c0c] text-white">720P (HD)</option>
                <option value="1080p" className="bg-[#0c0c0c] text-white">1080P (FHD)</option>
              </select>
              <Film size={8} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none" />
              <ChevronDown size={8} className="absolute right-1 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>

            {/* Aspect Ratio Pill */}
            <div className="relative flex-shrink-0">
              <select
                value={aspectRatio}
                onChange={e => setAspectRatio(e.target.value as any)}
                className="appearance-none bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 rounded-lg pl-5 pr-4 py-1 text-[8.5px] font-bold uppercase tracking-wider text-white/60 hover:text-white cursor-pointer transition-all font-sans"
              >
                <option value="9:16" className="bg-[#0c0c0c] text-white">9:16</option>
                <option value="16:9" className="bg-[#0c0c0c] text-white">16:9</option>
                <option value="1:1" className="bg-[#0c0c0c] text-white">1:1</option>
              </select>
              <Layout size={8} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[#c8f135] pointer-events-none" />
              <ChevronDown size={8} className="absolute right-1 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>

            {/* Shot Duration Pill */}
            <div className="relative flex-shrink-0">
              <select
                value={durationSeconds}
                onChange={e => setDurationSeconds(e.target.value as any)}
                className="appearance-none bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 rounded-lg pl-5 pr-4 py-1 text-[8.5px] font-bold uppercase tracking-wider text-white/60 hover:text-white cursor-pointer transition-all font-sans"
              >
                <option value="4" className="bg-[#0c0c0c] text-white">4 SEC</option>
                <option value="6" className="bg-[#0c0c0c] text-white">6 SEC</option>
                <option value="8" className="bg-[#0c0c0c] text-white">8 SEC</option>
                <option value="10" className="bg-[#0c0c0c] text-white">10 SEC</option>
              </select>
              <Clock size={8} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[#c8f135] pointer-events-none" />
              <ChevronDown size={8} className="absolute right-1 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>

            {/* Subtle Divider (Desktop only) */}
            <div className="hidden sm:block w-[1px] h-3 bg-white/10 shrink-0 mx-0.5" />

            {/* From Script Shortcut */}
            {script && (
              <button
                type="button"
                onClick={() => setVideoPrompt(script.replace(/\[[^\]]+\]/g, '').replace(/HOOK:|PAYOFF:|Scene \d+:/gi, '').trim())}
                className="hidden sm:flex px-2 py-1 rounded-lg border border-white/[0.08] hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white transition-all items-center gap-1 flex-shrink-0 text-[8.5px] font-bold uppercase tracking-wider"
              >
                <FileText size={8} className="text-[#c8f135]" />
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
                <div className="hidden sm:block relative flex-shrink-0">
                  <button
                    ref={presetsBtnRef}
                    type="button"
                    onClick={() => setShowPromptDropdown(!showPromptDropdown)}
                    className={`px-2 py-1 rounded-lg border transition-all flex items-center gap-1 flex-shrink-0 text-[8.5px] font-bold uppercase tracking-wider cursor-pointer ${
                      showPromptDropdown
                        ? 'border-[#c8f135]/40 bg-[#c8f135]/10 text-[#c8f135]'
                        : 'border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white'
                    }`}
                  >
                    <Sparkles size={8} />
                    <span>Presets</span>
                    <ChevronDown size={8} className={`transition-transform duration-200 ${showPromptDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  <DropUpPortal
                    triggerRef={presetsBtnRef}
                    isOpen={showPromptDropdown}
                    onClose={() => setShowPromptDropdown(false)}
                    width={230}
                  >
                    <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
                      <span className="text-[7.5px] font-black text-white/40 uppercase tracking-[0.2em]">Prebuilt Prompts</span>
                      <span className="text-[6.5px] text-[#c8f135] font-mono">Drop Up</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1 custom-scrollbar">
                      {PROMPT_CHIPS.map(chip => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => { setVideoPrompt(chip.prompt); setShowPromptDropdown(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#c8f135]/10 hover:text-white transition-all group"
                        >
                          <span className="text-[12px] flex-shrink-0">{chip.emoji}</span>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/70 group-hover:text-[#c8f135] transition-colors">{chip.label}</p>
                            <p className="text-[7.5px] text-white/30 font-mono leading-snug truncate">{chip.prompt.substring(0, 50)}…</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </DropUpPortal>
                </div>
              );
            })()}

            {/* AI Prompt Pill — only shown in single-shot mode on desktop */}
            {splitScenes.length === 0 && (script || videoPrompt) && (
              <button
                type="button"
                onClick={() => {
                  if (splitScenes.length > 0) {
                    generateSplitScenePrompt(activeSplitTab);
                  } else {
                    generateGeneralVideoPrompt();
                  }
                }}
                disabled={isGeneratingSplitPrompt || isGeneratingGeneralPrompt}
                className={`hidden sm:flex px-2 py-1 rounded-lg border transition-all items-center gap-1 flex-shrink-0 text-[8.5px] font-bold uppercase tracking-wider ${
                  (isGeneratingSplitPrompt || isGeneratingGeneralPrompt)
                    ? 'border-white/[0.08] bg-white/[0.04] text-white/20 cursor-not-allowed'
                    : 'border-[#c8f135]/40 bg-[#c8f135]/10 text-[#c8f135] hover:bg-[#c8f135]/20'
                }`}
              >
                {(isGeneratingSplitPrompt || isGeneratingGeneralPrompt) ? (
                  <Loader2 size={8} className="animate-spin" />
                ) : (
                  <Sparkles size={8} />
                )}
                <span>AI Prompt</span>
              </button>
            )}

            {/* Multi-Shot Toggle */}
            {splitScenes.length === 0 && (
              <button
                type="button"
                onClick={() => setMultiShotPrompt(!multiShotPrompt)}
                title={multiShotPrompt ? 'Multi-Shot Prompt: ON' : 'Multi-Shot Prompt: OFF'}
                className={`hidden sm:flex px-2 py-1 rounded-lg border transition-all items-center gap-1 flex-shrink-0 text-[8.5px] font-bold uppercase tracking-wider ${
                  multiShotPrompt
                    ? 'border-[#c8f135]/40 bg-[#c8f135]/10 text-[#c8f135]'
                    : 'border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white'
                }`}
              >
                <Film size={8} />
                <span>Multi-Shot</span>
              </button>
            )}

            {/* Template Pill */}
            {splitScenes.length === 0 && (
              <button
                type="button"
                onClick={() => setShowTemplates(true)}
                className="hidden sm:flex px-2 py-1 rounded-lg border border-white/[0.08] hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white transition-all items-center gap-1 flex-shrink-0 text-[8.5px] font-bold uppercase tracking-wider"
              >
                <Layout size={8} />
                <span>Template</span>
              </button>
            )}
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={splitScenes.length > 0 ? generateAllSceneVideos : () => generateVideo(videoPrompt || undefined)}
          disabled={isGeneratingVideo}
          className="w-full sm:w-24 h-11 sm:h-auto rounded-2xl flex flex-row sm:flex-col items-center justify-center gap-1.5 sm:gap-1 transition-all shrink-0 py-2 sm:py-0"
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
                (⚡ {getCurrentCost(false) * (splitScenes.length > 0 ? splitScenes.length : 1)})
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
