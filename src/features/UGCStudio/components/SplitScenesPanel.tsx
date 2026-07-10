import React, { useRef } from 'react';
import { X, ChevronDown, Sparkles, Camera, Check, Loader2, Film } from 'lucide-react';
import { useUGC, SplitScene } from '../context/UGCContext';
import { SCENE_STYLES, VIDEO_STYLES } from '../constants/videoStyles';
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
    characterImg,
    productImg,
    locationImg,
    productAnalysis,
    durationSeconds,
    scriptModel,
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

  const injectSpeechTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea || !sc) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = sc.dialog || '';
    
    // Insert tag at cursor position
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newDialog = `${before}${tag}${after}`;
    
    setSplitScenes((prev: SplitScene[]) =>
      prev.map((s: SplitScene, idx: number) =>
        idx === activeSplitTab ? { ...s, dialog: newDialog } : s
      )
    );

    // Refocus and place cursor after the injected tag
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + tag.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const customRef = sc?.refImage;
  const fallbackRef = activeTab === 'talking-head' ? thGeneratedImg : (characterImg?.url || '');
  const effectiveRefImage = customRef || fallbackRef;
  const isCustomRef = !!customRef;

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

                const isOmni = scriptModel === 'omni';
                const sceneDuration = isOmni ? 10 : 8;
                const durationVal = sceneDuration.toString();
                const numDuration = sceneDuration;
                const step = 3;
                const partitionExamples: string[] = [];
                for (let t = 0; t < numDuration; t += step) {
                  partitionExamples.push(`[${t}-${Math.min(t + step, numDuration)}s]`);
                }
                const exampleString = partitionExamples.join(' ..., ') + ' ...';

                // Build overall full-script context string for continuation awareness
                const fullScript = splitScenes.map((s, i) => `[Scene ${i + 1}]: "${s.dialog || ''}"`).join('\n');
                const totalScenes = splitScenes.length;
                const sceneIdx = activeSplitTab;
                const sceneDialog = sc?.dialog || '';

                // Build detailed Product Scan / analysis context if available
                let productContext = `PRODUCT / BRAND: ${productDetails || 'a consumer product'}`;
                if (productAnalysis) {
                  const analysisInfo = [];
                  if (productAnalysis.productName) {
                    analysisInfo.push(`Product Name: ${productAnalysis.productName}`);
                  }
                  if (productAnalysis.description) {
                    analysisInfo.push(`Scanned Product Description: ${productAnalysis.description}`);
                  }
                  if (productAnalysis.keyBenefits && productAnalysis.keyBenefits.length > 0) {
                    analysisInfo.push(`Key Benefits/Features: ${productAnalysis.keyBenefits.join(', ')}`);
                  }
                  if (productAnalysis.useCases && productAnalysis.useCases.length > 0) {
                    analysisInfo.push(`Typical Use Cases: ${productAnalysis.useCases.join(', ')}`);
                  }
                  if (analysisInfo.length > 0) {
                    productContext += `\nDetailed Product Scan Information:\n- ${analysisInfo.join('\n- ')}`;
                  }
                }

                // Reference images mapping instruction
                const refInstructions: string[] = [];
                let refIdx = 0;
                if (effectiveRefImage) {
                  refInstructions.push(`- The starting frame of the video must begin with the image <FIRST_FRAME>.`);
                }
                if (characterImg) {
                  refInstructions.push(`- The character/creator reference image is mapped to <IMAGE_REF_${refIdx}>.`);
                  refIdx++;
                }
                if (productImg) {
                  refInstructions.push(`- The product reference image is mapped to <IMAGE_REF_${refIdx}>.`);
                  refIdx++;
                }
                if (locationImg) {
                  refInstructions.push(`- The location reference image is mapped to <IMAGE_REF_${refIdx}>.`);
                }

                const prevScenesContext = sceneIdx > 0
                  ? `\nPREVIOUS SCENES ALREADY DESCRIBED:\n${splitScenes.slice(0, sceneIdx).map((s, i) => `[Scene ${i + 1}]: ${s.prompt ? s.prompt.substring(0, 120) + '...' : 'No prompt yet.'}`).join('\n')}`
                  : '';

                const isFirstScene = sceneIdx === 0;

                const aiPrompt = `You are a Veo 3.1 & Gemini Omni Flash multi-shot video prompt engineer writing a CONTINUATION of a multi-scene UGC ad.

OVERALL SCRIPT (all scenes):
${fullScript}

YOU ARE NOW WRITING: Scene ${sceneIdx + 1} of ${totalScenes}
THIS SCENE'S DIALOGUE (must be fully heard in this scene, do NOT skip any word):
"${sceneDialog}"

CRITICAL: Do NOT write visual cues or include spoken dialogue for other scenes (e.g. Scene ${sceneIdx + 2}, Scene ${sceneIdx + 3}, etc.). The visual prompt you generate must cover ONLY the dialogue in "${sceneDialog}" and must fit exactly within ${durationVal} seconds. Do not look ahead and write for subsequent scenes.
${prevScenesContext}

${productContext}

VISUAL STYLE: ${styleName} — ${styleModifier}
TOTAL SCENE DURATION: ${durationVal} seconds

Reference images mapped as follows — use these exact tags:
${refInstructions.join('\n')}

CRITICAL RULES — follow every single one:

AUDIO:
- NO background music of any kind. Absolutely forbidden.
- Use ONLY diegetic sound effects (SFX) and ambient sounds matching the scene (e.g. product packaging crinkle, liquid pour, footstep, ambient room tone).
- This scene's dialogue MUST be fully heard. Do not skip, truncate, or paraphrase any words.
- VOICE RULE:
  * When the creator / character is visibly ON-SCREEN (face visible, talking head, walking): the creator delivers the dialogue with natural lip-sync directly to camera.
  * When the shot is a MONTAGE, B-ROLL, product close-up, detail shot, or any shot WITHOUT the creator's face: the dialogue continues as a VOICE-OVER heard in the background while the visual plays.
- ACTION & SPEECH SEPARATION: Do NOT describe physical mouth actions (like taking a sip, eating, biting, tasting, kissing) simultaneously with lip-syncing dialogue. If the creator is drinking or eating, separate them chronologically inside the segment: e.g., the creator takes a sip first (no dialogue spoken during the sip), then lowers the cup, looks to camera and lip-syncs the dialogue.

CAMERA & REALISM (apply to every creator face / talking-head shot):
- Shot on a smartphone (iPhone or Android rear camera). Handheld, slightly imperfect framing. NOT cinematic.
- The creator's face must look photo-realistic and hyper-real: skin pores visible, natural skin texture, subtle imperfections, no smoothing or beauty filter.
- NO cinematic elements: no 85mm portrait compression, no creamy bokeh, no lens flares, no film grain, no shallow-depth-of-field fashion aesthetic.
- Natural, everyday lighting: bright indoor light, window light, or outdoor ambient — the kind of lighting found in real user-generated content, not a studio.
- For product/montage shots: the same phone-camera aesthetic — handheld, slightly imperfect, real-world textures visible, no professional cinematography look.
- REAL-WORLD PHYSICS: Ensure natural real-world physics, gravity, and material weight in all motions. Liquids must pour, splash, and bubble realistically under gravity. Objects must have solid weight when picked up, touched, or placed down. Clothing, hair, and fabrics must drape, stretch, sway, and fold naturally with body motion. Avoid floaty, dreamlike, or physically impossible movements.

VISUAL CONTINUITY:
- This is Scene ${sceneIdx + 1} of a continuous video. It must flow naturally from the previous scene.${isFirstScene ? '\n- Start from the static state of <FIRST_FRAME> in the very first shot.' : '\n- Do NOT restart from <FIRST_FRAME>. Pick up visually from where the previous scene ended.'}
- Reference the character using the appropriate <IMAGE_REF_N> tag for face/identity consistency on every creator shot.
- Reference the product using the appropriate <IMAGE_REF_N> tag whenever it appears on screen.

TIMECODE STRUCTURE:
- Partition this scene's ${durationVal} seconds into sequential shots using this exact structure: ${exampleString}
- Write each timecode segment as a single, unified, continuous paragraph.
- DO NOT use subheaders like 'Shot:', 'Camera:', 'Dialogue:', or 'Audio:'. They confuse the model.
- You must integrate the visual description, camera movement, dialogue delivery, and sound effects into one single paragraph.
- You MUST specify the exact portion of dialogue spoken in each segment:
  * For visible creator shots: state 'The creator lip-syncs the dialogue: "[dialogue portion]".'
  * For montage/B-roll shots: state 'The creator's voice-over speaks the dialogue: "[dialogue portion]".'
- Include specific sound effects (SFX) and ambient noise inside the paragraph.

Format Example:
[0-3s] Handheld close-up starting from <FIRST_FRAME> of the creator <IMAGE_REF_0> sitting at the table. The creator looks at the camera and lip-syncs the dialogue: "I’m not even joking, I thought I knew coffee." with natural mouth movements. Camera has a slight handheld wobble. Sound: ambient room tone.
[3-6s] Close-up of the traditional brass tumbler <IMAGE_REF_1> as coffee is poured. The creator's voice-over speaks the dialogue: "But this Mysore Canteen filter coffee? No seriously,". Camera tilts down. Sound: liquid pouring, brass cups clinking.

Return ONLY the final prompt text. No preamble, no explanation, no scene label headers.`;

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
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center justify-between bg-black/40 border border-white/5 rounded-xl p-3">
          {/* Left: Dialogue (Editable) */}
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
                  const combinedScript = updated.map((s: SplitScene) => s.dialog || '').join(' ');
                  setSpokenDialog(combinedScript);
                  return updated;
                });
              }}
              rows={3}
              className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-[10.5px] text-white/90 leading-relaxed font-mono resize-none focus:outline-none focus:border-[#c8f135]/40 transition-all scrollbar-thin scrollbar-thumb-white/10"
              placeholder="Edit dialogue..."
            />
            {/* Quick injection speech tags */}
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

          {/* Right: Controls (Reference slot + Approve button) */}
          <div className="flex flex-row items-center gap-3 w-full md:w-auto justify-between md:justify-end shrink-0 pt-2 md:pt-0 border-t border-white/5 md:border-t-0">
            {/* Reference Images List */}
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
                      <span className="text-[7px] font-black uppercase tracking-wider text-[#c8f135]">
                        Reference
                      </span>
                      <span className="text-[5px] font-mono uppercase tracking-tighter text-[#c8f135]/50">
                        Attached ✓
                      </span>
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
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors shadow-lg cursor-pointer shrink-0 ml-0.5 opacity-0 group-hover/att:opacity-100 transition-opacity border border-black/20"
                      title="Remove Reference"
                    >
                      <X size={7} className="text-white" />
                    </button>
                  </div>
                ));
              })()}

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
                  finalPrompt = videoPrompt;
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
