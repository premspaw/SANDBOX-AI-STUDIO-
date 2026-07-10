import React, { useRef } from 'react';
import { X, ChevronDown, Sparkles, Camera, Check, Loader2, Film } from 'lucide-react';
import { useUGC, SplitScene } from '../context/UGCContext';
import { SCENE_STYLES, MULTI_SHOT_PRESETS } from '../constants/videoStyles';
import { buildScenePrompt, validateScenePrompt, detectUgcCategory } from '../constants/ugcPromptTemplates';
import { getApiUrl, resolveUrl } from '../../../config/apiConfig';
import { fileToBase64 } from '../utils/imageUtils';

const SPEECH_TAGS = [
  { label: '🤫 Whisper', value: '[whisper]' },
  { label: '😮 Gasp', value: '[gasp]' },
  { label: '💨 Sigh', value: '[sigh]' },
  { label: '😂 Laughs', value: '[laughter]' },
  { label: '⏳ Pause', value: '[pause]' }
];

export default function SplitScenesPanel() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    splitScenes,
    setSplitScenes,
    activeSplitTab,
    setActiveSplitTab,
    setActiveSceneIndex,
    activeTab,
    scenes,
    videoPrompt,
    setVideoPrompt,
    selectedSceneStyle,
    setSelectedSceneStyle,
    selectedPromptVariant,
    setSelectedPromptVariant,
    isGeneratingSplitPrompt,
    generateSplitScenePrompt,
    generateAllSplitPrompts,
    generateVideo,
    isGeneratingVideo,
    videoProgressMsg,
    getCurrentCost,
    setSpokenDialog,
    showToast,
    thGeneratedImg,
    characterImg,
    multiShotPrompt,
    setMultiShotPrompt,
    selectedMultiShotPreset,
    setSelectedMultiShotPreset,
    productAnalysis,
    productDetails,
    productImg,
    locationImg,
    durationSeconds,
    fetchImageAsBlob,
    handleApiError,
    generateAllSceneVideos,
    setIsGeneratingSplitPrompt,
    currentUserId,
  } = useUGC();

  if (splitScenes.length === 0) return null;

  const sc = splitScenes[activeSplitTab];

  const injectSpeechTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea || !sc) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = sc.dialog || '';
    const newDialog = `${text.substring(0, start)}${tag}${text.substring(end)}`;
    setSplitScenes((prev: SplitScene[]) =>
      prev.map((s: SplitScene, idx: number) =>
        idx === activeSplitTab ? { ...s, dialog: newDialog } : s
      )
    );
    setTimeout(() => {
      textarea.focus();
      const pos = start + tag.length;
      textarea.setSelectionRange(pos, pos);
    }, 0);
  };

  const customRef = sc?.refImage;
  const fallbackRef = activeTab === 'talking-head' ? thGeneratedImg : (characterImg?.url || '');
  const effectiveRefImage = customRef || fallbackRef;

  const handleGenerateAllScenePrompts = async () => {
    setIsGeneratingSplitPrompt(true);
    try {
      const category = detectUgcCategory(
        productAnalysis?.productName,
        productAnalysis?.description,
        productDetails || ''
      );

      const hasCharacterRef = !!characterImg;
      const hasProductRef = !!productImg;
      const hasLocationRef = !!locationImg;

      let refIdx = 0;
      const characterRefTag = hasCharacterRef ? `<IMAGE_REF_${refIdx++}>` : '';
      const productRefTag = hasProductRef ? `<IMAGE_REF_${refIdx++}>` : '';
      const locationRefTag = hasLocationRef ? `<IMAGE_REF_${refIdx++}>` : '';

      const urlToGenerativePart = async (url: string) => {
        try {
          const blob = await fetchImageAsBlob(url);
          const base64 = await fileToBase64(blob);
          const match = base64.match(/^data:([^;]+);base64,(.+)$/);
          if (match) return { inlineData: { data: match[2], mimeType: match[1] } };
        } catch (err) {
          console.error('Failed to convert reference image:', err);
        }
        return null;
      };

      // Reference image parts — same for every scene call
      const refParts = [];
      if (characterImg?.url) {
        const part = await urlToGenerativePart(characterImg.url);
        if (part) refParts.push(part);
      }
      if (productImg?.url) {
        const part = await urlToGenerativePart(productImg.url);
        if (part) refParts.push(part);
      }
      if (locationImg?.url) {
        const part = await urlToGenerativePart(locationImg.url);
        if (part) refParts.push(part);
      }

      const perSceneDuration = parseInt(durationSeconds || '10') || 10;
      const totalScenes = splitScenes.length;
      const totalDuration = perSceneDuration * totalScenes;

      const updatedScenes = [...splitScenes];
      const warnings: string[] = [];

      for (let idx = 0; idx < totalScenes; idx++) {
        const scene = splitScenes[idx];
        // Switch active tab so user sees progress
        setActiveSplitTab(idx);

        const metaPrompt = buildScenePrompt({
          dialog: scene.dialog,
          sceneIdx: idx,
          totalScenes,
          sceneDurationSec: perSceneDuration,
          totalDurationSec: totalDuration,
          productDetails: productDetails || '',
          category,
          hasCharacterRef,
          hasProductRef,
          hasLocationRef,
          hasFirstFrame: idx === 0 && !!(scene.refImage || effectiveRefImage),
          characterRefTag,
          productRefTag,
          locationRefTag,
        });

        const parts = [...refParts, { text: metaPrompt }];

        const response = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parts, model: 'gemini-2.5-flash', userId: currentUserId })
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => response.statusText);
          throw new Error(`Scene ${idx + 1} prompt generation failed (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const newPrompt = (data.text || '').trim();

        if (newPrompt) {
          const check = validateScenePrompt(newPrompt, hasCharacterRef, characterRefTag, hasProductRef, productRefTag);
          if (!check.valid) warnings.push(`Scene ${idx + 1}: missing ${check.missing.join(', ')}`);
          updatedScenes[idx] = { ...updatedScenes[idx], prompt: newPrompt };
        }
      }

      setSplitScenes(updatedScenes);
      setActiveSplitTab(0);
      setVideoPrompt(updatedScenes[0]?.prompt || '');

      if (warnings.length > 0) {
        showToast(`⚠️ ${warnings.join(' | ')}`, 'error');
      } else {
        showToast(`✓ Generated ${totalScenes} continuous scene prompts (${totalDuration}s total)`, 'success');
      }
    } catch (e) {
      handleApiError(e, 'Multi-Shot Prompt Generation');
    }
    setIsGeneratingSplitPrompt(false);
  };

  const handleGeneratePrompt = async (useMultiShot: boolean) => {
    if (useMultiShot) {
      await handleGenerateAllScenePrompts();
    } else {
      await generateSplitScenePrompt(activeSplitTab);
    }
  };

  return (
    <div className="mx-4 mt-2 bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-xl">
      {/* Tab headers */}
      <div className="flex border-b border-white/10 overflow-x-auto no-scrollbar" style={{ scrollbarWidth: 'none' }}>
        {splitScenes.map((sc, i) => (
          <button key={i} onClick={() => {
            setActiveSplitTab(i);
            setActiveSceneIndex(i);
            setSelectedPromptVariant(0);
            setVideoPrompt(splitScenes[i]?.prompt || '');
          }}
            className={`min-w-[90px] sm:flex-1 py-2 text-[8px] font-black uppercase tracking-widest transition-all ${
              activeSplitTab === i ? 'bg-[#c8f135]/15 text-[#c8f135] border-b-2 border-[#c8f135]' : 'text-white/30 hover:text-white/60'
            }`}>
            {sc.label}
          </button>
        ))}
        <button onClick={() => { setSplitScenes([]); setSpokenDialog(''); }} className="px-3 text-white/20 hover:text-white/50 transition-colors shrink-0 ml-auto border-l border-white/10"><X size={9} /></button>
      </div>

      {/* Active scene body */}
      <div className="p-3 space-y-2.5 relative">

        {/* Single control row: Preset ▼  |  Style ▼  |  AI Prompt  |  Multi-Shot */}
        <div className="flex items-center gap-1.5 flex-wrap">

          {/* Preset Dropdown */}
          <div className="relative shrink-0">
            <select
              value={selectedMultiShotPreset}
              onChange={e => setSelectedMultiShotPreset(e.target.value)}
              className="appearance-none bg-black/30 border border-white/5 hover:border-white/10 rounded-xl pl-6 pr-6 py-1.5 text-[8px] font-mono text-white/80 uppercase tracking-wider cursor-pointer transition-all focus:outline-none focus:border-[#c8f135]/30"
            >
              {MULTI_SHOT_PRESETS.map(p => (
                <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>
              ))}
            </select>
            <Sparkles size={8} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#c8f135]/60 pointer-events-none" />
            <ChevronDown size={8} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          </div>

          {/* Style Dropdown — narrow */}
          <div className="relative w-40 shrink-0">
            <select
              value={selectedSceneStyle}
              onChange={e => setSelectedSceneStyle(e.target.value)}
              className="w-full appearance-none bg-black/30 border border-white/5 hover:border-white/10 rounded-xl pl-7 pr-6 py-1.5 text-[8px] font-mono text-white/80 uppercase tracking-wider cursor-pointer transition-all focus:outline-none focus:border-[#c8f135]/30"
            >
              <optgroup label="🎙️ Talking" className="bg-[#0c0c0c] text-white/90">
                <option value="normal_talking">🎙️ Normal Talking</option>
                <option value="walk_talk">🚶 Walk &amp; Talk</option>
                <option value="reaction_shot">😲 Reaction Shot</option>
                <option value="mirror_selfie">🪞 Mirror Selfie</option>
              </optgroup>
              <optgroup label="✂️ Camera Cuts" className="bg-[#0c0c0c] text-white/90">
                <option value="fast_cut">✂️ Fast Cut</option>
                <option value="dramatic_zoom">🔍 Dramatic Zoom</option>
                <option value="pov_shot">👆 POV Shot</option>
              </optgroup>
              <optgroup label="🎥 Product Focus" className="bg-[#0c0c0c] text-white/90">
                <option value="cinematic_b_roll">🎥 Cinematic B-Roll</option>
                <option value="close_up_detail">🔬 Close-Up Detail</option>
                <option value="unboxing">📦 Unboxing</option>
                <option value="before_after">🔄 Before &amp; After</option>
              </optgroup>
              <optgroup label="🎓 Educational" className="bg-[#0c0c0c] text-white/90">
                <option value="tutorial_step">🎓 Tutorial Step</option>
                <option value="dynamic_action">⚡ Dynamic Action</option>
              </optgroup>
            </select>
            <Sparkles size={8} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#c8f135] pointer-events-none" />
            <ChevronDown size={8} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          </div>

          {/* AI Prompt pill — single scene. Dim when Multi-Shot mode is active */}
          <button
            type="button"
            onClick={() => handleGeneratePrompt(false)}
            disabled={isGeneratingSplitPrompt}
            title="Generate prompt for this scene only"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all shrink-0 cursor-pointer ${
              isGeneratingSplitPrompt
                ? 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'
                : multiShotPrompt
                  ? 'bg-white/[0.03] border-white/[0.06] text-white/25 hover:bg-white/[0.07] hover:text-white/50'
                  : 'bg-[#c8f135]/10 border-[#c8f135]/40 text-[#c8f135] hover:bg-[#c8f135]/20 hover:border-[#c8f135]/70'
            }`}
          >
            {isGeneratingSplitPrompt && !multiShotPrompt
              ? <><Loader2 size={8} className="animate-spin" /><span>Generating…</span></>
              : <><Sparkles size={8} /><span>AI Prompt</span></>
            }
          </button>

          {/* Multi-Shot pill — all scenes. Dim when inactive, bright yellow when ON */}
          <button
            type="button"
            title={multiShotPrompt ? 'Multi-Shot Prompt: ON (generates a continuous prompt per scene, covering the full script)' : 'Multi-Shot Prompt: OFF'}
            onClick={() => {
              const nextVal = !multiShotPrompt;
              setMultiShotPrompt(nextVal);
              if (nextVal) {
                handleGenerateAllScenePrompts();
              } else {
                handleGeneratePrompt(false);
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all shrink-0 cursor-pointer ${
              multiShotPrompt
                ? 'bg-[#c8f135]/20 border-[#c8f135]/60 text-[#c8f135] shadow-[0_0_10px_rgba(200,241,53,0.15)]'
                : 'bg-white/3 border-white/8 text-white/30 hover:text-white/60 hover:border-white/20'
            }`}
          >
            {isGeneratingSplitPrompt && multiShotPrompt ? (
              <><Loader2 size={8} className="animate-spin" /><span>All Scenes…</span></>
            ) : (
              <><Film size={8} className={multiShotPrompt ? 'text-[#c8f135]' : ''} /><span>Multi-Shot</span></>
            )}
          </button>
        </div>

        {/* Row 2: Dialogue + Reference + Approve */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center justify-between bg-black/40 border border-white/5 rounded-xl p-3">

          {/* Left: Dialogue textarea */}
          <div className="flex-1 text-left w-full">
            <textarea
              ref={textareaRef}
              value={sc?.dialog || ''}
              onChange={(e) => {
                const newDialog = e.target.value;
                setSplitScenes((prev: SplitScene[]) => {
                  const updated = prev.map((s: SplitScene, idx: number) =>
                    idx === activeSplitTab ? { ...s, dialog: newDialog } : s
                  );
                  setSpokenDialog(updated.map((s: SplitScene) => s.dialog || '').join(' '));
                  return updated;
                });
              }}
              rows={3}
              className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-[10.5px] text-white/90 leading-relaxed font-mono resize-none focus:outline-none focus:border-[#c8f135]/40 transition-all scrollbar-thin scrollbar-thumb-white/10"
              placeholder="Edit dialogue..."
            />
            {/* Speech tag injectors */}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {SPEECH_TAGS.map((tag) => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => injectSpeechTag(tag.value)}
                  className="px-2 py-0.5 bg-white/3 border border-white/8 hover:border-[#c8f135]/40 hover:bg-[#c8f135]/5 text-white/40 hover:text-[#c8f135] rounded-md text-[8px] font-mono transition-all uppercase cursor-pointer"
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: References + Approve */}
          <div className="flex flex-row items-center gap-3 w-full md:w-auto justify-between md:justify-end shrink-0 pt-2 md:pt-0 border-t border-white/5 md:border-t-0">

            {/* Reference images list (up to 3) */}
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              {(() => {
                const currentRefs = sc?.refImages || (sc?.refImage ? [sc.refImage] : []);
                return currentRefs.map((refUrl, idx) => (
                  <div key={refUrl} className="flex items-center gap-2 px-2 py-1 bg-[#c8f135]/5 border border-[#c8f135]/20 rounded-xl relative animate-in fade-in duration-200 shrink-0 group/att shadow-inner">
                    <img
                      src={resolveUrl(refUrl)}
                      alt={`Scene Ref ${idx + 1}`}
                      className="w-9 h-9 rounded-lg object-cover border border-[#c8f135]/40 shadow-md shrink-0"
                    />
                    <div className="flex flex-col text-left">
                      <span className="text-[7px] font-black uppercase tracking-wider text-[#c8f135]">Reference</span>
                      <span className="text-[5px] font-mono uppercase tracking-tighter text-[#c8f135]/50">Attached ✓</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSplitScenes((prev: SplitScene[]) =>
                          prev.map((s, sIdx) => {
                            if (sIdx !== activeSplitTab) return s;
                            const updatedRefs = (s.refImages || []).filter((r) => r !== refUrl);
                            return { ...s, refImage: updatedRefs[0] || null, refImages: updatedRefs };
                          })
                        );
                      }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-lg cursor-pointer shrink-0 opacity-0 group-hover/att:opacity-100 border border-black/20"
                      title="Remove Reference"
                    >
                      <X size={7} className="text-white" />
                    </button>
                  </div>
                ));
              })()}

              {/* Add Ref slot — shown if < 3 refs */}
              {(() => {
                const currentRefs = sc?.refImages || (sc?.refImage ? [sc.refImage] : []);
                if (currentRefs.length >= 3) return null;
                return (
                  <label className="flex items-center gap-2 px-2.5 py-1.5 bg-white/3 border border-dashed border-white/10 hover:border-[#c8f135]/40 hover:bg-[#c8f135]/5 rounded-xl cursor-pointer transition-all text-left">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const base64 = await fileToBase64(file);
                          const dataUrl = `data:${file.type};base64,${base64}`;
                          setSplitScenes((prev: SplitScene[]) =>
                            prev.map((s, idx) => {
                              if (idx !== activeSplitTab) return s;
                              const updatedRefs = [...(s.refImages || []), dataUrl];
                              return { ...s, refImage: updatedRefs[0] || null, refImages: updatedRefs };
                            })
                          );
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                    />
                    <Camera size={11} className="text-white/30 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[7.5px] font-black uppercase tracking-wider text-white/40">Add Ref</span>
                      <span className="text-[6px] font-mono text-white/20 uppercase tracking-tighter">Upload</span>
                    </div>
                  </label>
                );
              })()}
            </div>

            {/* Approve & Make Video */}
            <button
              onClick={() => {
                if (!sc) return;
                let finalPrompt = '';
                if (activeTab === 'podcast') {
                  const sceneIdx = activeSplitTab;
                  const baseVisual = scenes[sceneIdx]?.visualCue || 'Two-host podcast setup with Host 1 and Host 2 at microphones, natural studio lighting.';
                  const variants = [
                    `Wide two-shot: ${baseVisual} Both hosts visible, relaxed posture, natural conversation. The hosts are speaking: "${sc.dialog}"`,
                    `Medium close-up on HOST 1: ${baseVisual} HOST 1 is speaking, HOST 2 slightly blurred in background, eye contact with camera. The hosts are speaking: "${sc.dialog}"`,
                    `Over-shoulder shot from behind HOST 2 looking at HOST 1: ${baseVisual} Dynamic conversational angle, product visible on desk. The hosts are speaking: "${sc.dialog}"`
                  ];
                  finalPrompt = variants[selectedPromptVariant] || variants[0];
                } else {
                  finalPrompt = [videoPrompt, sc.dialog].filter(Boolean).join(' ');
                }
                generateVideo(finalPrompt, effectiveRefImage || undefined);
              }}
              disabled={isGeneratingVideo}
              className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${
                isGeneratingVideo
                  ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                  : 'bg-[#c8f135]/10 border border-[#c8f135]/40 text-[#c8f135] hover:bg-[#c8f135]/20 hover:border-[#c8f135]/70 hover:shadow-[0_0_20px_rgba(200,241,53,0.15)] active:scale-[0.98]'
              }`}
            >
              {isGeneratingVideo ? (
                <>
                  <Loader2 size={11} className="animate-spin text-white/50" />
                  <span className="text-white/40 text-[8.5px]">{videoProgressMsg || 'Rendering…'}</span>
                </>
              ) : (
                <>
                  <Check size={11} className="text-[#c8f135]" />
                  <span>Approve &amp; Make Video (⚡ {getCurrentCost(false)})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Camera Angle picker for podcast tab */}
        {activeTab === 'podcast' && (() => {
          const sceneIdx = activeSplitTab;
          const baseVisual = scenes[sceneIdx]?.visualCue || 'Two-host podcast setup with Host 1 and Host 2 at microphones, natural studio lighting.';
          const sc = splitScenes[activeSplitTab];
          const dialogue = sc?.dialog || '';
          const variants = [
            { label: '🎥 Wide Shot', prompt: `Wide two-shot: ${baseVisual} Both hosts visible, relaxed posture, natural conversation. The hosts are speaking: "${dialogue}"` },
            { label: '🎙️ Host 1 Close-up', prompt: `Medium close-up on HOST 1: ${baseVisual} HOST 1 is speaking, HOST 2 slightly blurred in background, eye contact with camera. The hosts are speaking: "${dialogue}"` },
            { label: '📐 Over-Shoulder', prompt: `Over-shoulder shot from behind HOST 2 looking at HOST 1: ${baseVisual} Dynamic conversational angle, product visible on desk. The hosts are speaking: "${dialogue}"` },
          ];
          return (
            <div className="space-y-1.5 pt-1.5 border-t border-white/5">
              <p className="text-[7px] text-white/30 font-black uppercase tracking-widest text-left">Pick Camera Angle</p>
              <div className="grid grid-cols-3 gap-2">
                {variants.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedPromptVariant(i)}
                    className={`text-left px-2.5 py-2 rounded-lg text-[8px] font-mono leading-tight transition-all border cursor-pointer ${
                      selectedPromptVariant === i
                        ? 'bg-[#c8f135]/15 border-[#c8f135]/50 text-[#c8f135]'
                        : 'bg-white/3 border-white/8 text-white/40 hover:text-white/70 hover:border-white/20'
                    }`}
                  >
                    <span className="font-black block mb-0.5">{v.label}</span>
                    <span className="opacity-60 block truncate">{v.prompt.substring(0, 45)}…</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
