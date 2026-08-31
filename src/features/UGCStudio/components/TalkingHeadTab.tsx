import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Zap, Layout, Clock, Sparkles, Loader2, Film, Camera, Activity, X } from 'lucide-react';
import { useUGC } from '../context/UGCContext';
import { TALKING_HEAD_TEMPLATES, TalkingHeadTemplate } from '../constants/sceneTemplates';
import { analyzeTalkingHeadMotion } from '../constants/prompts';
import DropUpPortal from './DropUpPortal';

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

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('fast_pace');
  const [isMultiShot, setIsMultiShot] = useState<boolean>(true);
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState<boolean>(false);
  const [showMotionPopover, setShowMotionPopover] = useState<boolean>(false);

  const tplBtnRef = useRef<HTMLButtonElement>(null);
  const motionBtnRef = useRef<HTMLButtonElement>(null);

  const activeTemplate = useMemo(() => {
    return TALKING_HEAD_TEMPLATES.find(t => t.id === selectedTemplateId) || TALKING_HEAD_TEMPLATES[0];
  }, [selectedTemplateId]);

  // Dynamic Motion & Animation analysis computed directly from current script and template category
  const motionAnalysis = useMemo(() => {
    return analyzeTalkingHeadMotion(thScript, activeTemplate.category);
  }, [thScript, activeTemplate]);

  const handleSelectTemplate = (tpl: TalkingHeadTemplate) => {
    setSelectedTemplateId(tpl.id);
    if (!thScript.trim()) {
      setThScript(tpl.prompt);
    }
    setShowTemplatesDropdown(false);
  };

  return (
    <div className="px-3 pt-3 pb-2">
      {/* ── Main Side-by-Side Flex Layout ── */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch">

        {/* ── Chat Input Box Container (overflow-visible to prevent clipping) ── */}
        <div className="flex-1 flex flex-col border border-white/[0.08] focus-within:border-[#c8f135]/30 rounded-2xl transition-all duration-200 bg-[#0d0d0f] relative z-10">
          
          {/* Script Textarea */}
          <textarea
            value={thScript}
            onChange={e => setThScript(e.target.value)}
            rows={2}
            className="w-full bg-transparent border-0 text-[11px] text-white/80 placeholder-white/20 focus:outline-none resize-none leading-relaxed px-3 pt-3 pb-1 min-h-[52px] font-sans rounded-t-2xl"
            placeholder="Write what the creator says to camera — hook first, then sell... or pick a Creator Template below."
          />

          {/* Active Camera Angles Micro-Badges */}
          <div className="px-3 py-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-white/[0.03]">
            <span className="text-[7.5px] font-bold text-white/30 uppercase tracking-wider shrink-0">Framing:</span>
            {activeTemplate.cameraAngles.map((angle, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[7.5px] text-white/60 font-mono shrink-0"
              >
                🎥 {angle}
              </span>
            ))}
          </div>

          {/* Bottom Pills Toolbar */}
          <div className="flex items-center gap-1.5 flex-wrap px-2 pb-2 pt-1 border-t border-white/[0.05]">
            
            {/* 1. Creator Scenario Templates Dropdown Pill */}
            <div className="relative flex-shrink-0">
              <button
                ref={tplBtnRef}
                type="button"
                onClick={() => setShowTemplatesDropdown(!showTemplatesDropdown)}
                className={`px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 flex-shrink-0 text-[8px] font-bold uppercase tracking-widest cursor-pointer ${
                  showTemplatesDropdown
                    ? 'border-[#c8f135]/40 bg-[#c8f135]/10 text-[#c8f135]'
                    : 'border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white/80'
                }`}
              >
                <Camera size={7} className="text-[#c8f135]" />
                <span>{activeTemplate.title}</span>
                <ChevronDown size={7} className={`transition-transform duration-200 ${showTemplatesDropdown ? 'rotate-180' : ''}`} />
              </button>

              <DropUpPortal
                triggerRef={tplBtnRef}
                isOpen={showTemplatesDropdown}
                onClose={() => setShowTemplatesDropdown(false)}
                width={260}
              >
                <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[7.5px] font-black text-white/40 uppercase tracking-[0.2em]">Creator Scenarios</span>
                  <span className="text-[6.5px] text-[#c8f135] font-mono">Drop Up</span>
                </div>
                <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
                  {TALKING_HEAD_TEMPLATES.map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-[#c8f135]/10 transition-colors group ${
                        tpl.id === selectedTemplateId ? 'bg-[#c8f135]/10 text-[#c8f135]' : 'text-white/70'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black uppercase tracking-wider group-hover:text-[#c8f135] transition-colors">{tpl.title}</p>
                        <p className="text-[7.5px] text-white/30 font-sans truncate">{tpl.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </DropUpPortal>
            </div>

            {/* 2. Motion & Animation Directives Dropdown Pill */}
            <div className="relative flex-shrink-0">
              <button
                ref={motionBtnRef}
                type="button"
                onClick={() => setShowMotionPopover(!showMotionPopover)}
                className={`px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 flex-shrink-0 text-[8px] font-bold uppercase tracking-widest cursor-pointer ${
                  showMotionPopover
                    ? 'border-[#c8f135]/40 bg-[#c8f135]/10 text-[#c8f135]'
                    : 'border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white/80'
                }`}
              >
                <Activity size={7} className="text-[#c8f135]" />
                <span>Motion Analysis</span>
                <ChevronDown size={7} className={`transition-transform duration-200 ${showMotionPopover ? 'rotate-180' : ''}`} />
              </button>

              <DropUpPortal
                triggerRef={motionBtnRef}
                isOpen={showMotionPopover}
                onClose={() => setShowMotionPopover(false)}
                width={280}
              >
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-[7.5px] font-black text-white/40 uppercase tracking-wider">Script Motion Directives</span>
                    <button onClick={() => setShowMotionPopover(false)} className="text-white/30 hover:text-white"><X size={10} /></button>
                  </div>
                  <div className="space-y-1.5 text-[8.5px]">
                    <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
                      <span className="text-[#c8f135] font-black uppercase text-[7px]">🎥 Camera Movement:</span>
                      <p className="text-white/80 font-mono text-[8px] mt-0.5">{motionAnalysis.cameraMotion}</p>
                    </div>
                    <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
                      <span className="text-[#c8f135] font-black uppercase text-[7px]">🎭 Character Animation:</span>
                      <p className="text-white/80 font-mono text-[8px] mt-0.5">{motionAnalysis.characterAnimation}</p>
                    </div>
                    <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
                      <span className="text-[#c8f135] font-black uppercase text-[7px]">🎬 Angle Cut Style:</span>
                      <p className="text-white/80 font-mono text-[8px] mt-0.5">{motionAnalysis.cameraCutStyle}</p>
                    </div>
                  </div>
                </div>
              </DropUpPortal>
            </div>

            {/* 3. Engine Dropdown Pill */}
            <div className="relative flex-shrink-0">
              <select
                value={thEngine}
                onChange={e => setThEngine(e.target.value as any)}
                className="appearance-none bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg pl-5 pr-4 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white/50 hover:text-white/80 cursor-pointer transition-all font-sans"
              >
                <option value="veo_lite" className="bg-[#0c0c0c] text-white">🍃 VEO LITE</option>
                <option value="veo_fast" className="bg-[#0c0c0c] text-white">⚡ VEO FAST</option>
                <option value="veo3" className="bg-[#0c0c0c] text-white">🎬 VEO 3 HQ</option>
                <option value="omni-flash-1.1" className="bg-[#0c0c0c] text-white">⚡ OMNI FLASH 1.1</option>
                <option value="omni-flash" className="bg-[#0c0c0c] text-white">✨ OMNI FLASH 1.0</option>
              </select>
              {thEngine === 'veo_lite' ? (
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] pointer-events-none leading-none">🍃</span>
              ) : thEngine === 'veo3' ? (
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] pointer-events-none leading-none">🎬</span>
              ) : thEngine === 'omni-flash-1.1' ? (
                <Zap size={7} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none" />
              ) : thEngine === 'omni-flash' ? (
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] pointer-events-none leading-none">✨</span>
              ) : (
                <Zap size={7} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[#c8f135] pointer-events-none" />
              )}
              <ChevronDown size={7} className="absolute right-1 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>

            {/* 4. Aspect Ratio Pill */}
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

            {/* 5. Shot Duration Pill */}
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

            {/* 6. Multi-Shot Toggle Pill */}
            <button
              type="button"
              onClick={() => setIsMultiShot(!isMultiShot)}
              className={`px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 flex-shrink-0 text-[8px] font-bold uppercase tracking-widest ${
                isMultiShot
                  ? 'border-[#c8f135]/40 bg-[#c8f135]/10 text-[#c8f135]'
                  : 'border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/70'
              }`}
            >
              <Film size={7} />
              <span>Multi-Shot: {isMultiShot ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* ── Generate Button ── */}
        <button
          onClick={generateTalkingHeadVideo}
          disabled={thIsGeneratingVideo || !thGeneratedImg || !thScript.trim()}
          className="w-full sm:w-24 h-11 sm:h-auto rounded-2xl flex flex-row sm:flex-col items-center justify-center gap-1.5 sm:gap-1 transition-all shrink-0 py-2 sm:py-0"
          style={{
            backgroundColor: (thIsGeneratingVideo || !thGeneratedImg || !thScript.trim()) ? 'rgba(255,255,255,0.04)' : '#c8f135',
            color: (thIsGeneratingVideo || !thGeneratedImg || !thScript.trim()) ? 'rgba(255,255,255,0.2)' : 'black',
            border: (thIsGeneratingVideo || !thGeneratedImg || !thScript.trim()) ? '1px solid rgba(255,255,255,0.08)' : 'none'
          }}
        >
          {thIsGeneratingVideo ? (
            <>
              <Loader2 size={13} className="animate-spin text-white/40" />
              <span className="text-[7px] text-white/40 font-mono tracking-wider text-center px-1">{thVideoProgress || 'Generating…'}</span>
            </>
          ) : (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
              <span className="text-[10px] font-black tracking-widest text-center leading-tight">
                Generate
              </span>
              <span className="text-[7px] opacity-50 font-mono tracking-wider">
                (⚡ {getCurrentCost(false)})
              </span>
            </>
          )}
        </button>
      </div>

      {/* Warning line if reference image is missing */}
      {!thGeneratedImg && (
        <p className="text-[7.5px] text-amber-400/80 font-mono uppercase tracking-widest text-center mt-1.5">
          ⚠️ Generate reference creator image first (Image tab → sidebar)
        </p>
      )}
    </div>
  );
};
