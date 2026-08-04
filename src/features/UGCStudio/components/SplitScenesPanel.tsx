import React, { useRef, useState } from 'react';
import { X, ChevronDown, Sparkles, Camera, Check, Loader2, Film, Clock, Image as ImageIcon } from 'lucide-react';
import { useUGC, SplitScene } from '../context/UGCContext';
import { SCENE_STYLES, MULTI_SHOT_PRESETS, BROLL_PRESETS } from '../constants/videoStyles';
import { buildScenePrompt, validateScenePrompt, detectUgcCategory } from '../constants/ugcPromptTemplates';
import { getApiUrl, resolveUrl } from '../../../config/apiConfig';
import { fileToBase64 } from '../utils/imageUtils';
import HooksLibraryModal from './HooksLibraryModal';
import { HookTemplate } from '../constants/hooksLibrary';

const SPEECH_TAGS = [
  { label: '🤫 Whisper', value: '[whisper]' },
  { label: '😮 Gasp', value: '[gasp]' },
  { label: '💨 Sigh', value: '[sigh]' },
  { label: '😂 Laughs', value: '[laughter]' },
  { label: '⏳ Pause', value: '[pause]' }
];

export default function SplitScenesPanel() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedBRollPreset, setSelectedBRollPreset] = useState('broll_auto');
  const [isHookModalOpen, setIsHookModalOpen] = useState(false);
  const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState(false);
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
    generateVideoWithMotionRef,
    isGeneratingMotionRef,
    refVideoFile,
    gallery,
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
    
    // Also append the tag to the video prompt so Omni Flash uses it visually
    const newPrompt = sc.prompt ? `${sc.prompt} ${tag}` : tag;
    
    setSplitScenes((prev: SplitScene[]) =>
      prev.map((s: SplitScene, idx: number) =>
        idx === activeSplitTab ? { ...s, dialog: newDialog, prompt: newPrompt } : s
      )
    );
    
    // Update the local state for video prompt if we are on the active tab
    if (activeSplitTab === splitScenes.findIndex(s => s === sc)) {
      setVideoPrompt(newPrompt);
    }

    setTimeout(() => {
      textarea.focus();
      const pos = start + tag.length;
      textarea.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleBalanceScript = () => {
    setSplitScenes((prev: SplitScene[]) => {
      const allText = prev.map(s => s.dialog || '').join(' ');
      const words = allText.trim().split(/\s+/).filter(Boolean);
      const N = prev.length;
      if (N === 0) return prev;
      
      const baseWords = Math.floor(words.length / N);
      const remainder = words.length % N;
      
      let currentIndex = 0;
      const updated = prev.map((s, i) => {
        const wordsForThisScene = baseWords + (i < remainder ? 1 : 0);
        const end = currentIndex + wordsForThisScene;
        const sceneDialog = words.slice(currentIndex, end).join(' ');
        currentIndex = end;
        
        let newPrompt = s.prompt || '';
        if (newPrompt && sceneDialog.trim() !== '') {
          if (/The creator is saying:\s*/i.test(newPrompt)) {
            newPrompt = newPrompt.replace(/(The creator is saying:\s*)(.*?)(?=\s*Visual style preset details:|$)/is, `$1${sceneDialog}`);
          } else if (/omit any sentence or phrase:\n"/i.test(newPrompt)) {
            newPrompt = newPrompt.replace(/(omit any sentence or phrase:\n")(.*?)(")/is, `$1${sceneDialog}$3`);
          } else if (/DIALOGUE THIS SCENE \(say EVERY word\):\n"/i.test(newPrompt)) {
            newPrompt = newPrompt.replace(/(DIALOGUE THIS SCENE \(say EVERY word\):\n")(.*?)(")/is, `$1${sceneDialog}$3`);
          } else if (/Use any provided script text \("/i.test(newPrompt)) {
            newPrompt = newPrompt.replace(/(Use any provided script text \(")(.*?)("\) purely as thematic inspiration)/is, `$1${sceneDialog}$3`);
          } else if (s.dialog && newPrompt.includes(`"${s.dialog}"`)) {
            newPrompt = newPrompt.replace(`"${s.dialog}"`, `"${sceneDialog}"`);
          }
        }
        
        return { ...s, dialog: sceneDialog, prompt: newPrompt };
      });
      setSpokenDialog(updated.map((s: SplitScene) => s.dialog || '').join(' '));
      return updated;
    });
    showToast('Script & AI prompts balanced across all scenes', 'success');
  };

  const customRef = sc?.refImage;
  const fallbackRef = activeTab === 'talking-head' ? thGeneratedImg : (characterImg?.url || '');
  const effectiveRefImage = customRef || fallbackRef;

  const handleGenerateAllScenePrompts = async (isBRollMontage: boolean = false) => {
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

        const currentSceneRefParts = [];
        const firstFrameRefTag = '<FIRST_FRAME>';
        const sceneCharRefTag = '<IMAGE_REF_0>';
        const sceneProdRefTag = '<IMAGE_REF_1>';
        const sceneLocRefTag = '<IMAGE_REF_2>';

        const sceneCustomRefs = scene.refImages || (scene.refImage ? [scene.refImage] : []);
        const startFrameUrl = sceneCustomRefs[0] || (idx === 0 ? effectiveRefImage : null);
        if (startFrameUrl) {
          const part = await urlToGenerativePart(startFrameUrl);
          if (part) {
            currentSceneRefParts.push(part);
          }
        }

        // Add Fallback Sidebar Assets:
        // Image 1 (<IMAGE_REF_0>): Person / Character identity reference
        if (hasCharacterRef && characterImg?.url) {
          const part = await urlToGenerativePart(characterImg.url);
          if (part) {
            currentSceneRefParts.push(part);
          }
        }
        // Image 2 (<IMAGE_REF_1>): Product reference
        if (hasProductRef && productImg?.url) {
          const part = await urlToGenerativePart(productImg.url);
          if (part) {
            currentSceneRefParts.push(part);
          }
        }
        // Image 3 (<IMAGE_REF_2>): Stage / Location reference
        if (hasLocationRef && locationImg?.url) {
          const part = await urlToGenerativePart(locationImg.url);
          if (part) {
            currentSceneRefParts.push(part);
          }
        }

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
          hasFirstFrame: !!startFrameUrl,
          characterRefTag: sceneCharRefTag,
          productRefTag: sceneProdRefTag,
          locationRefTag: sceneLocRefTag,
          firstFrameRefTag,
          isBRollMontage,
          bRollType: selectedBRollPreset === 'broll_auto' ? '' : BROLL_PRESETS.find(p => p.id === selectedBRollPreset)?.label || '',
          multiShotPreset: selectedMultiShotPreset,
          productAnalysis: productAnalysis ? (typeof productAnalysis === 'string' ? productAnalysis : JSON.stringify(productAnalysis)) : undefined
        });

        const parts = [...currentSceneRefParts, { text: metaPrompt }];

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

  const handleSelectHook = (hook: HookTemplate) => {
    // Create a new SplitScene for the hook
    const hookScene: SplitScene = {
      label: `Hook: ${hook.name}`,
      dialog: hook.exampleDialogue,
      prompt: hook.visualPrompt.replace(/^Length:.*?\n+/im, ''),
      refImage: effectiveRefImage || characterImg?.url || productImg?.url || null,
      duration: 4
    };
    
    setSplitScenes((prev) => {
      const newScenes = [hookScene, ...prev];
      // Renumber labels for non-hook scenes if they were auto-generated 'Scene X'
      return newScenes.map((s, i) => {
        if (s.label.startsWith('Scene ')) {
          return { ...s, label: `Scene ${i + 1}` };
        }
        return s;
      });
    });
    
    // Set focus to the new hook scene tab
    setActiveSplitTab(0);
    setActiveSceneIndex(0);
    setVideoPrompt(hookScene.prompt);
    setSpokenDialog(hookScene.dialog);
  };

  const handleRemoveScene = (e: React.MouseEvent, indexToRemove: number) => {
    e.stopPropagation();
    const remaining = splitScenes.filter((_, idx) => idx !== indexToRemove);

    // Renumber Scene X labels
    const renumbered = remaining.map((s, i) => {
      if (s.label.startsWith('Scene ')) {
        return { ...s, label: `Scene ${i + 1}` };
      }
      return s;
    });

    setSplitScenes(renumbered);

    if (renumbered.length === 0) {
      setActiveSplitTab(0);
      setActiveSceneIndex(0);
      setVideoPrompt('');
      return;
    }

    let newActive = activeSplitTab;
    if (activeSplitTab === indexToRemove) {
      newActive = Math.max(0, indexToRemove - 1);
    } else if (activeSplitTab > indexToRemove) {
      newActive = activeSplitTab - 1;
    }

    setActiveSplitTab(newActive);
    setActiveSceneIndex(newActive);
    setVideoPrompt(renumbered[newActive]?.prompt || '');
  };

  return (
    <div className="mx-4 mt-2 bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-xl">
      {/* Tab headers */}
      <div className="flex border-b border-white/10 overflow-x-auto no-scrollbar" style={{ scrollbarWidth: 'none' }}>
        <button 
          onClick={() => setIsHookModalOpen(true)}
          className="min-w-[90px] py-2 px-2.5 flex items-center justify-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-[#c8f135] bg-[#c8f135]/5 hover:bg-[#c8f135]/15 transition-all border-r border-white/10 shrink-0"
          title="Add a high-retention AI Visual Hook to the beginning of your script"
        >
          <Sparkles size={10} /> Add Hook
        </button>
        {splitScenes.map((sc, i) => (
          <div
            key={i}
            onClick={() => {
              setActiveSplitTab(i);
              setActiveSceneIndex(i);
              setSelectedPromptVariant(0);
              setVideoPrompt(splitScenes[i]?.prompt || '');
            }}
            className={`min-w-[90px] sm:flex-1 py-2 px-2.5 flex items-center justify-between gap-1.5 text-[8px] font-black uppercase tracking-widest cursor-pointer transition-all border-r border-white/5 shrink-0 select-none ${
              activeSplitTab === i 
                ? 'bg-[#c8f135]/15 text-[#c8f135] border-b-2 border-[#c8f135]' 
                : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
            }`}
          >
            <span className="truncate max-w-[130px]" title={sc.label}>{sc.label}</span>
            <button
              type="button"
              onClick={(e) => handleRemoveScene(e, i)}
              title={`Remove ${sc.label}`}
              className="p-0.5 rounded-full hover:bg-white/10 text-white/30 hover:text-red-400 transition-all shrink-0 ml-1"
            >
              <X size={9} />
            </button>
          </div>
        ))}
        <button 
          onClick={() => { setSplitScenes([]); setSpokenDialog(''); }} 
          className="px-3 text-white/20 hover:text-white/50 transition-colors shrink-0 ml-auto border-l border-white/10"
          title="Clear all scenes"
        >
          <X size={9} />
        </button>
      </div>

      {/* Active scene body */}
      <div className="p-3 space-y-2.5 relative">

        {/* Single control row: compact pills fitting gracefully on one row */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 whitespace-nowrap">

          {/* Multi-Shot Director Preset Dropdown — shown when Multi-Shot mode is ON */}
          {multiShotPrompt ? (
            <div className="relative shrink-0">
              <select
                value={selectedMultiShotPreset}
                onChange={e => setSelectedMultiShotPreset(e.target.value)}
                className="appearance-none bg-[#c8f135]/10 border border-[#c8f135]/30 hover:border-[#c8f135]/60 rounded-lg pl-5 pr-5 py-1 text-[7.5px] font-mono text-[#c8f135] uppercase tracking-wider cursor-pointer transition-all focus:outline-none"
              >
                {MULTI_SHOT_PRESETS.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#0c0c0c] text-white/90">{p.emoji} {p.label}</option>
                ))}
              </select>
              <Sparkles size={7} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[#c8f135] pointer-events-none" />
              <ChevronDown size={7} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#c8f135]/60 pointer-events-none" />
            </div>
          ) : (
            /* Scene Style Dropdown — shown when in single-scene / standard mode */
            <div className="relative w-36 shrink-0">
              <select
                value={selectedSceneStyle}
                onChange={e => setSelectedSceneStyle(e.target.value)}
                className="w-full appearance-none bg-black/30 border border-white/5 hover:border-white/10 rounded-lg pl-6 pr-5 py-1 text-[7.5px] font-mono text-white/80 uppercase tracking-wider cursor-pointer transition-all focus:outline-none focus:border-[#c8f135]/30 truncate"
              >
                <optgroup label="🎙️ Talking" className="bg-[#0c0c0c] text-white/90">
                  <option value="normal_talking">🎙️ Normal Talking</option>
                  <option value="walk_talk">🚶 Walk &amp; Talk</option>
                  <option value="street_interview">🎤 Street Interview</option>
                  <option value="reaction_shot">😲 Reaction Shot</option>
                  <option value="mirror_selfie">🪞 Mirror Selfie</option>
                  <option value="car_vlog">🚗 Car Vlog</option>
                  <option value="grwm_talk">💄 GRWM Talking</option>
                </optgroup>
                <optgroup label="✂️ Camera Cuts" className="bg-[#0c0c0c] text-white/90">
                  <option value="fast_cut">✂️ Fast Cut</option>
                  <option value="dramatic_zoom">🔍 Dramatic Zoom</option>
                  <option value="pov_shot">👆 POV Shot</option>
                  <option value="whip_pan">🌀 Whip Pan</option>
                  <option value="360_orbit">🔄 360° Orbit</option>
                </optgroup>
                <optgroup label="🎥 Product Focus" className="bg-[#0c0c0c] text-white/90">
                  <option value="cinematic_b_roll">🎥 Cinematic B-Roll</option>
                  <option value="close_up_detail">🔬 Close-Up Detail</option>
                  <option value="unboxing">📦 Unboxing</option>
                  <option value="before_after">🔄 Before &amp; After</option>
                  <option value="hands_in_frame">🤲 Hands-on Demo</option>
                  <option value="floating_hero">✨ Floating Hero</option>
                </optgroup>
                <optgroup label="👗 Fashion &amp; Styling" className="bg-[#0c0c0c] text-white/90">
                  <option value="runway_walk">👠 Runway / OOTD</option>
                  <option value="outfit_change_transition">✨ Snap Outfit</option>
                  <option value="fabric_macro">🧶 Fabric Detail</option>
                  <option value="mirror_outfit_check">🪞 Mirror Fit</option>
                  <option value="editorial_pose">📸 Editorial</option>
                </optgroup>
                <optgroup label="🎓 Educational" className="bg-[#0c0c0c] text-white/90">
                  <option value="tutorial_step">🎓 Tutorial</option>
                  <option value="dynamic_action">⚡ Action</option>
                </optgroup>
              </select>
              <Sparkles size={7} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[#c8f135] pointer-events-none" />
              <ChevronDown size={7} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            </div>
          )}

          {/* AI Prompt pill — single scene */}
          <button
            type="button"
            onClick={() => handleGeneratePrompt(false)}
            disabled={isGeneratingSplitPrompt}
            title="Generate prompt for this scene only"
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[7.5px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
              isGeneratingSplitPrompt
                ? 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'
                : multiShotPrompt
                  ? 'bg-white/[0.03] border-white/[0.06] text-white/25 hover:bg-white/[0.07] hover:text-white/50'
                  : 'bg-[#c8f135]/10 border-[#c8f135]/40 text-[#c8f135] hover:bg-[#c8f135]/20 hover:border-[#c8f135]/70'
            }`}
          >
            {isGeneratingSplitPrompt && !multiShotPrompt
              ? <><Loader2 size={7} className="animate-spin" /><span>Gen…</span></>
              : <><Sparkles size={7} /><span>AI Prompt</span></>
            }
          </button>

          {/* Multi-Shot Mode Toggle */}
          <button
            type="button"
            title={multiShotPrompt ? 'Multi-Shot Mode: ON' : 'Multi-Shot Mode: OFF'}
            onClick={() => {
              setMultiShotPrompt(!multiShotPrompt);
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[7.5px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
              multiShotPrompt
                ? 'bg-[#c8f135]/20 border-[#c8f135]/60 text-[#c8f135] shadow-[0_0_8px_rgba(200,241,53,0.15)]'
                : 'bg-white/3 border-white/8 text-white/40 hover:text-white/70 hover:border-white/20'
            }`}
          >
            <Film size={7} className={multiShotPrompt ? 'text-[#c8f135]' : ''} />
            <span>Multi-Shot {multiShotPrompt ? 'ON' : 'OFF'}</span>
          </button>

          {/* Generate All Scenes Button — shown when Multi-Shot mode is ON */}
          {multiShotPrompt && (
            <button
              type="button"
              onClick={() => handleGenerateAllScenePrompts(false)}
              disabled={isGeneratingSplitPrompt}
              title="Generate multi-shot prompts for all scenes"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[7.5px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                isGeneratingSplitPrompt
                  ? 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'
                  : 'bg-[#c8f135] border-[#c8f135] text-black hover:bg-[#b8e125] shadow-[0_0_10px_rgba(200,241,53,0.25)]'
              }`}
            >
              {isGeneratingSplitPrompt ? (
                <><Loader2 size={7} className="animate-spin text-black" /><span>Generating…</span></>
              ) : (
                <><Sparkles size={7} className="text-black" /><span>✨ Generate All</span></>
              )}
            </button>
          )}

          {/* B-Roll Template Dropdown */}
          <div className="relative shrink-0">
            <select
              value={selectedBRollPreset}
              onChange={e => setSelectedBRollPreset(e.target.value)}
              className="appearance-none bg-blue-500/5 border border-blue-500/20 hover:border-blue-500/40 rounded-lg pl-5 pr-5 py-1 text-[7.5px] font-mono text-blue-300 uppercase tracking-wider cursor-pointer transition-all focus:outline-none"
            >
              {BROLL_PRESETS.map(p => (
                <option key={p.id} value={p.id} className="bg-[#0c0c0c] text-white/90">{p.emoji} {p.label}</option>
              ))}
            </select>
            <Film size={7} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
            <ChevronDown size={7} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          </div>

          {/* B-Roll / Montage button */}
          <button
            type="button"
            title="Generate a dynamic B-roll montage for all scenes"
            onClick={() => handleGenerateAllScenePrompts(true)}
            disabled={isGeneratingSplitPrompt}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[7.5px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
              isGeneratingSplitPrompt
                ? 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'
                : 'bg-blue-500/10 border-blue-500/40 text-blue-300 hover:bg-blue-500/20 hover:border-blue-500/70'
            }`}
          >
            {isGeneratingSplitPrompt ? (
              <><Loader2 size={7} className="animate-spin" /><span>Gen…</span></>
            ) : (
              <><Film size={7} /><span>B-Roll</span></>
            )}
          </button>

          {/* 🎬 Motion Match button — only shown when a ref video is uploaded */}
          {refVideoFile && (
            <button
              type="button"
              onClick={() => generateVideoWithMotionRef(activeSplitTab)}
              disabled={isGeneratingMotionRef}
              title="Generate video by matching motion from the reference video, swapping your character & product"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all shrink-0 cursor-pointer ${
                isGeneratingMotionRef
                  ? 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'
                  : 'bg-purple-500/10 border-purple-500/40 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/60 hover:shadow-[0_0_12px_rgba(168,85,247,0.2)]'
              }`}
            >
              {isGeneratingMotionRef
                ? <><Loader2 size={8} className="animate-spin" /><span>Matching…</span></>
                : <><Film size={8} /><span>🎬 Motion Match</span></>
              }
            </button>
          )}
        </div>

        {/* 🎬 Match All Scenes — Omni Flash motion-match for every split scene */}
        {refVideoFile && (
          <div className="pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={async () => {
                for (let i = 0; i < splitScenes.length; i++) {
                  await generateVideoWithMotionRef(i);
                }
              }}
              disabled={isGeneratingMotionRef}
              className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                isGeneratingMotionRef
                  ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                  : 'bg-purple-500/10 border border-purple-500/40 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/60 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]'
              }`}
            >
              {isGeneratingMotionRef
                ? <><Loader2 size={10} className="animate-spin" /><span>Matching All Scenes…</span></>
                : <><Film size={10} /><span>🎬 Match All Scenes · Omni Flash</span></>
              }
            </button>
          </div>
        )}

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
            <div className="flex flex-wrap gap-1.5 mt-1.5 items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
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
              <button
                type="button"
                onClick={handleBalanceScript}
                className="px-2 py-1 bg-white/5 border border-white/10 hover:border-[#c8f135]/40 text-white/60 hover:text-[#c8f135] hover:bg-[#c8f135]/5 rounded-md text-[8px] font-mono transition-all uppercase cursor-pointer flex items-center gap-1 shrink-0"
                title="Auto-adjust and evenly balance the script across all scenes"
              >
                <Sparkles size={8} /> Balance Script
              </button>
            </div>
          </div>

          {/* Right: References + Approve */}
          <div className="flex flex-col items-end gap-3 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t border-white/5 md:border-t-0">

            {/* Reference images list (up to 3) */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {(() => {
                const currentRefs = sc?.refImages || (sc?.refImage ? [sc.refImage] : []);

                return currentRefs.map((refUrl, idx) => {
                  const tagBadge = `<IMAGE_REF_${idx}>`;

                  return (
                    <div key={refUrl} className="relative group/att bg-[#111113] border border-[#c8f135]/30 rounded-xl p-1 shrink-0 shadow-lg flex flex-col items-center">
                      <img
                        src={resolveUrl(refUrl)}
                        alt={`Scene Ref ${idx + 1}`}
                        className="w-14 h-14 rounded-lg object-cover border border-white/10 shadow-md shrink-0"
                      />
                      <span className="mt-1 text-[6px] font-mono font-bold text-[#c8f135] bg-black/80 px-1 py-0.5 rounded border border-[#c8f135]/30 leading-none">
                        {tagBadge}
                      </span>
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
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-lg cursor-pointer shrink-0 opacity-0 group-hover/att:opacity-100 border border-black/20 z-20"
                        title={`Remove ${tagBadge}`}
                      >
                        <X size={7} className="text-white" />
                      </button>
                    </div>
                  );
                });
              })()}

              {/* Add Ref slot — Upload file */}
              {(() => {
                const currentRefs = sc?.refImages || (sc?.refImage ? [sc.refImage] : []);
                if (currentRefs.length >= 3) return null;
                const nextTagIndex = currentRefs.length;

                return (
                  <label className="flex flex-col items-center justify-center w-14 h-14 bg-white/3 border border-dashed border-white/15 hover:border-[#c8f135]/60 hover:bg-[#c8f135]/5 rounded-xl cursor-pointer transition-all text-center group">
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
                    <Camera size={14} className="text-white/40 group-hover:text-[#c8f135] transition-colors mb-0.5" />
                    <span className="text-[6.5px] font-black uppercase tracking-wider text-white/50 group-hover:text-[#c8f135]">Upload</span>
                    <span className="text-[5.5px] font-mono text-[#c8f135]/80 uppercase tracking-tighter leading-none mt-0.5">&lt;REF_{nextTagIndex}&gt;</span>
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

      <HooksLibraryModal 
        isOpen={isHookModalOpen} 
        onClose={() => setIsHookModalOpen(false)} 
        onSelectHook={handleSelectHook} 
      />
    </div>
  );
}
