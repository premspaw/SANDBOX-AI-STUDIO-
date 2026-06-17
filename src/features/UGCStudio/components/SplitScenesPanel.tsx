import React from 'react';
import { X, ChevronDown, Sparkles, Camera, Check, Loader2, Film } from 'lucide-react';
import { useUGC, SplitScene } from '../context/UGCContext';
import { SCENE_STYLES, VIDEO_STYLES } from '../constants/videoStyles';
import { getApiUrl, resolveUrl } from '../../../config/apiConfig';
import { fileToBase64 } from '../utils/imageUtils';

export default function SplitScenesPanel() {
  const {
    splitScenes,
    setSplitScenes,
    activeSplitTab,
    setActiveSplitTab,
    setActiveSceneIndex,
    characterImg,
    activeTab,
    scenes,
    videoPrompt,
    setVideoPrompt,
    selectedSceneStyle,
    setSelectedSceneStyle,
    selectedPromptVariant,
    setSelectedPromptVariant,
    isGeneratingSplitPrompt,
    setIsGeneratingSplitPrompt,
    fetchImageAsBlob,
    productDetails,
    currentUserId,
    generateVideo,
    isGeneratingVideo,
    videoProgressMsg,
    generateAllSceneVideos,
    getCurrentCost,
    setSpokenDialog,
    setChatTab,
    showToast,
    handleApiError,
    thGeneratedImg
  } = useUGC();

  if (splitScenes.length === 0) return null;

  const sc = splitScenes[activeSplitTab];
  const customRef = sc?.refImage;
  const fallbackRef = activeTab === 'talking-head' ? thGeneratedImg : (characterImg?.url || '');
  const effectiveRefImage = customRef || fallbackRef;
  const isCustomRef = !!customRef;

  return (
    <div className="mx-4 mt-2 bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-xl">
      {/* Tab headers */}
      <div className="flex border-b border-white/10">
        {splitScenes.map((sc, i) => (
          <button key={i} onClick={() => { 
            setActiveSplitTab(i); 
            setActiveSceneIndex(i);
            setSelectedPromptVariant(0); 
            setVideoPrompt(splitScenes[i]?.prompt || '');
          }}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all ${
              activeSplitTab === i ? 'bg-[#c8f135]/15 text-[#c8f135] border-b-2 border-[#c8f135]' : 'text-white/30 hover:text-white/60'
            }`}>
            {sc.label}
          </button>
        ))}
        <button onClick={() => { setSplitScenes([]); setSpokenDialog(''); }} className="px-2 text-white/20 hover:text-white/50 transition-colors"><X size={9} /></button>
      </div>
      {/* Active scene: Dialogue + Controls */}
      <div className="p-3 space-y-2.5 relative">

        {/* Row 1: AI Style Selector + Generate Prompt → writes into bottom chat box */}
        <div className="flex items-center gap-2">
          {/* Style Dropdown Selector */}
          <div className="flex-1 relative">
            <select
              value={selectedSceneStyle}
              onChange={e => setSelectedSceneStyle(e.target.value)}
              className="w-full appearance-none bg-black/30 border border-white/5 hover:border-white/10 rounded-xl pl-7.5 pr-8 py-2 text-[8.5px] font-mono text-white/80 uppercase tracking-wider cursor-pointer transition-all focus:outline-none focus:border-[#c8f135]/30"
            >
              <optgroup label="🎙️ Talking" className="bg-[#0c0c0c] text-white/90">
                <option value="normal_talking">🎙️ Normal Talking</option>
                <option value="walk_talk">🚶 Walk & Talk</option>
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
                <option value="before_after">🔄 Before & After</option>
              </optgroup>
              <optgroup label="🎓 Educational" className="bg-[#0c0c0c] text-white/90">
                <option value="tutorial_step">🎓 Tutorial Step</option>
                <option value="dynamic_action">⚡ Dynamic Action</option>
              </optgroup>
            </select>
            <Sparkles size={9} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#c8f135] pointer-events-none" />
            <ChevronDown size={9} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          </div>

          {/* AI Button */}
          <button
            type="button"
            onClick={async () => {
              if (!sc) return;
              setIsGeneratingSplitPrompt(true);
              try {
                const styleInfo = SCENE_STYLES[selectedSceneStyle];
                const styleName = styleInfo?.name || 'Normal Talking';
                const styleModifier = styleInfo?.promptModifier || '';
                
                const urlToGenerativePart = async (url: string) => {
                  try {
                    const blob = await fetchImageAsBlob(url);
                    const base64 = await fileToBase64(blob);
                    const match = base64.match(/^data:([^;]+);base64,(.+)$/);
                    if (match) {
                      return {
                        inlineData: {
                          data: match[2],
                          mimeType: match[1]
                        }
                      };
                    }
                  } catch (err) {
                    console.error('Failed to convert reference image to generative part:', err);
                  }
                  return null;
                };

                const parts = [];
                let imgPart = null;
                if (effectiveRefImage) {
                  imgPart = await urlToGenerativePart(effectiveRefImage);
                }

                if (imgPart) {
                  parts.push(imgPart);
                }

                const aiPrompt = effectiveRefImage
                  ? `You are a Veo 3.1 image-to-video motion prompt engineer.
We are converting a static reference image into video.
DIALOGUE: "${sc.dialog}"
PRODUCT / BRAND: ${productDetails || 'a consumer product'}
VISUAL STYLE: ${styleName} — ${styleModifier}

Write ONE motion prompt (max 80 words) for a Veo 3.1 video. Follow these rules strictly:
1. DO NOT describe the environment, setting, background, location, lighting, outdoor/indoor scenes, or objects (e.g. do not say "living room", "field", "desk", "sunlit", "outdoor", "nature", "home office").
2. DO NOT describe the person's appearance, gender, hair, face type, clothing, or age (e.g. do not say "young adult", "woman", "brown hair", "orange sweater", "creator (20s-30s)").
3. Start the video directly from the static state of the provided reference image.
4. Focus 100% ONLY on camera motion and actions: describe the camera panning, zooming, cuts/switches, the person speaking the dialogue with realistic lip-syncing/mouth movements, facial expression changes, and hand gestures or performance actions.
5. Incorporate the visual characteristics of "${styleName}": "${styleModifier}".
6. Return ONLY the final motion prompt text. No introductory or explanatory text.`
                  : `You are a Veo 3.1 video prompt engineer for UGC ads.
DIALOGUE: "${sc.dialog}"
PRODUCT / BRAND: ${productDetails || 'a consumer product'}
VISUAL STYLE: ${styleName} — ${styleModifier}

Write ONE visual prompt (max 80 words) for a UGC creator scene that:
1. Matches the exact dialogue and performance style above.
2. Describes the environment, camera angle, creator action/expression.
3. The creator speaks the dialogue naturally to camera (if style allows).
4. Incorporates the visual characteristics of "${styleName}": "${styleModifier}".
5. Avoids: 85mm lens, heavy bokeh, cinematic/fashion aesthetics.
Return ONLY the prompt text, no preamble.`;

                parts.push({ text: aiPrompt });

                const response = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ parts, model: 'gemini-2.5-flash', userId: currentUserId })
                });

                if (!response.ok) {
                  const errText = await response.text().catch(() => response.statusText);
                  throw new Error(`AI prompt generation failed (${response.status}): ${errText}`);
                }
                const data = await response.json();
                const newPrompt = (data.text || '').trim();
                if (newPrompt) {
                  setVideoPrompt(newPrompt);
                  setSplitScenes((prev: SplitScene[]) =>
                    prev.map((s, idx) => (idx === activeSplitTab ? { ...s, prompt: newPrompt } : s))
                  );
                }
              } catch (e) {
                handleApiError(e, 'AI Prompt Generation');
              }
              setIsGeneratingSplitPrompt(false);
            }}
            disabled={isGeneratingSplitPrompt}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all shrink-0 cursor-pointer ${
              isGeneratingSplitPrompt
                ? 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'
                : 'bg-[#c8f135]/10 border-[#c8f135]/40 text-[#c8f135] hover:bg-[#c8f135]/20 hover:border-[#c8f135]/70 hover:shadow-[0_0_12px_rgba(200,241,53,0.15)]'
            }`}
          >
            {isGeneratingSplitPrompt
              ? <><Loader2 size={9} className="animate-spin" /><span>Generating…</span></>
              : <><Sparkles size={9} /><span>AI Prompt</span></>
            }
          </button>
        </div>

        {/* Row 2: Dialogue + Reference + Approve container */}
        <div className="flex gap-4 items-center justify-between bg-black/40 border border-white/5 rounded-xl p-3">
          {/* Left: Dialogue (Editable) */}
          <div className="flex-1 text-left pr-2">
            <textarea
              value={sc?.dialog || ''}
              onChange={(e) => {
                const newDialog = e.target.value;
                setSplitScenes((prev: SplitScene[]) =>
                  prev.map((s: SplitScene, idx: number) =>
                    idx === activeSplitTab ? { ...s, dialog: newDialog } : s
                  )
                );
              }}
              rows={3}
              className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-[10.5px] text-white/90 leading-relaxed font-mono resize-none focus:outline-none focus:border-[#c8f135]/40 transition-all scrollbar-thin scrollbar-thumb-white/10"
              placeholder="Edit dialogue..."
            />
          </div>

          {/* Right: Controls (Reference slot + Approve button) */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Reference Image Slot */}
            {isCustomRef ? (
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#c8f135]/5 border border-[#c8f135]/20 rounded-xl relative animate-in fade-in duration-200">
                <img
                  src={resolveUrl(customRef)}
                  alt="Scene Ref"
                  className="w-9 h-9 rounded-lg object-cover border border-[#c8f135]/40 shadow-md shrink-0"
                />
                <div className="flex flex-col text-left">
                  <span className="text-[7.5px] font-black uppercase tracking-wider text-[#c8f135]">
                    Reference
                  </span>
                  <span className="text-[6px] font-mono uppercase tracking-tighter text-[#c8f135]/50">
                    Attached ✓
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSplitScenes((prev: SplitScene[]) => prev.map((s: SplitScene, idx: number) => idx === activeSplitTab ? { ...s, refImage: null } : s));
                  }}
                  className="w-4 h-4 bg-red-500/80 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors shadow-lg cursor-pointer shrink-0 ml-0.5"
                  title="Remove Custom Reference"
                >
                  <X size={7} className="text-white" />
                </button>
              </div>
            ) : (
              <div className="flex gap-1.5 items-stretch">
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
                        setSplitScenes((prev: SplitScene[]) => prev.map((s: SplitScene, idx: number) => idx === activeSplitTab ? { ...s, refImage: dataUrl } : s));
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
              </div>
            )}

            {/* Approve & Make Video Button */}
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
                  // Use the bottom chat box videoPrompt as the single source of truth
                  finalPrompt = [videoPrompt, sc.dialog].filter(Boolean).join(' ');
                }

                generateVideo(finalPrompt, effectiveRefImage || undefined);
              }}
              disabled={isGeneratingVideo}
              className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer flex items-center gap-2 ${
                isGeneratingVideo
                  ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                  : 'bg-[#c8f135]/10 border border-[#c8f135]/40 text-[#c8f135] hover:bg-[#c8f135]/20 hover:border-[#c8f135]/70 hover:shadow-[0_0_20px_rgba(200,241,53,0.15)] active:scale-[0.98]'
              }`}
            >
              {isGeneratingVideo ? (
                <>
                  <Loader2 size={11} className="animate-spin text-white/50" />
                  <span className="text-white/40">{videoProgressMsg || 'Rendering…'}</span>
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
