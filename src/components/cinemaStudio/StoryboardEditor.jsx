import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Sparkles, Film } from 'lucide-react';
import { useAppStore } from '../../store';
import { resolveUrl } from '../../config/apiConfig';

export function StoryboardEditor({
  lightboxItem,
  userId,
  onClose,
  setGallery,
  setLightboxItem
}) {
  const [selectedStoryTemplate, setSelectedStoryTemplate] = useState('story1');
  const [storyBrief, setStoryBrief] = useState('');
  const [engine, setEngine] = useState('gemini-3.1-flash-image-preview');
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);

  // Storyboard Preloaded Blueprints Map
  const STORY_TEMPLATES = {
    story1: {
      label: "Story 1: Netflix Movie Storyboard Sheet",
      prompt: `Create a single cinematic storyboard image based on the attached reference image. The storyboard should contain multiple connected scenes in one frame, showing a complete visual story progression from start to finish. Maintain the exact same character face, hairstyle, outfit, body proportions, environment, lighting, and visual identity from the reference image throughout all panels.

Design the storyboard like a premium movie concept board with 6–8 cinematic frames merged into one composition. Include different camera angles such as close-up, medium shot, wide shot, side profile, low-angle hero shot, over-the-shoulder shot, and dramatic final scene.

The story should flow naturally:
- Introduction scene
- Character preparation scene
- Action/movement scene
- Emotional close-up scene
- Main hero moment
- Cinematic climax
- Wide environmental shot
- Powerful ending frame

Add professional film-style panel divisions, cinematic color grading, realistic shadows, depth of field, movie production storyboard layout, visual continuity between scenes, ultra-realistic details, DSLR photography quality, commercial advertisement style, highly detailed skin texture, dynamic composition, 8K resolution, masterpiece quality.

Make it look like a Netflix movie storyboard sheet, all scenes combined into one premium vertical poster, visually connected and telling a complete cinematic story in a single image.`
    },
    story2: {
      label: "Story 2: High-Octane Action Blockbuster Sequence",
      prompt: `Create a single high-octane cinematic storyboard poster based on the attached reference image. The sheet should merge 6–8 highly dynamic frames into one continuous visual story showing an epic action sequence. Maintain absolute character face, hair, costume, and visual identity consistency from the reference throughout all frames.

The action sequence must flow chronologically:
- Tension rising: character gearing up, focused epic eyes close-up
- Sudden threat: action triggered, low-angle running/sprinting shot
- Mid-air leap: dramatic camera pan following a high-impact stunt
- Defensive maneuver: dodging under volumetric smoke, sparks flying
- Climax confrontation: character landing powerful heroic blow, high-impact lens flare
- Aftermath: standing amidst debris in a wide cinematic landscape shot

Include bold film division lanes, neon orange and deep blue cinematic color grading, rich particles, realistic depth of field, and dynamic IMAX-style compositions. Tell the complete blockbuster scene progression in a single masterpiece poster.`
    },
    story3: {
      label: "Story 3: Sci-Fi Cyberpunk Neon Odyssey",
      prompt: `Create a single futuristic sci-fi storyboard poster based on the attached reference image. Merge 6–8 visually stunning cyberpunk frames into one cohesive vertical poster showing a high-tech visual narrative. Maintain absolute visual identity, face, and clothing consistency from the reference image in all scenes.

The sci-fi odyssey must flow chronologically:
- Cyberpunk city overview: towering neon skyscrapers, hover-vehicles passing
- Glitch interface: character accessing floating green holographic displays, close-up
- Silent stealth: sneaking through rain-soaked dark alleys, neon signs reflecting
- Confrontation: low-angle faceoff under glowing volumetric searchlights
- Tech activation: glowing cybernetic lines on character lighting up, camera push-in
- Final departure: walking away towards a neon horizon, wide atmospheric shot

Add distinct film-strip division borders, cybernetic HUD elements, rich teal and magenta color grading, heavy fog, rain textures, dynamic lighting, and hyper-detailed Unreal Engine 5 concept art quality.`
    }
  };

  // Storyboard Generation Handler using Gemini / GPT
  const handleGenerateStoryboard = async () => {
    if (!storyBrief.trim() || !lightboxItem?.url) return;
    setIsGeneratingStoryboard(true);
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast("Drafting multi-frame storyboard panel...", "info");

    try {
      const spendResult = await useAppStore.getState().spendShorts(userId, 5, 'image_grid_multishot'); // deduct 5 credits
      if (!spendResult.success) {
        setIsGeneratingStoryboard(false);
        onClose();
        if (spendResult.reason === 'unauthenticated') {
          useAppStore.getState().setShowingAuthModal(true);
        } else {
          useAppStore.getState().setActiveTab('pricing');
        }
        return;
      }

      // Dynamic combined prompt payload
      const combinedPrompt = `${STORY_TEMPLATES[selectedStoryTemplate]?.prompt || ''}

[USER STORY SCENARIO BRIEF: Describe the specific actions or narrative detail to embed within the storyboard frames: "${storyBrief}"]`;

      const payload = {
        model: engine,
        prompt: combinedPrompt,
        aspect_ratio: '9:16', // Vertical premium storyboards
        referenceImages: [lightboxItem.url],
        userId
      };

      const resp = await fetch('http://localhost:3002/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || "Storyboard generation failed");
      }
      const data = await resp.json();

      if (data.url) {
        const newItem = {
          id: Date.now(),
          type: 'image',
          url: data.url,
          prompt: `Storyboard: ${storyBrief.split('.')[0]}`,
          engine: `${engine === 'gpt-image-2' ? 'GPT-2' : 'Nano Banana 2'} (Storyboard)`,
          aspect: "9:16",
          ts: Date.now()
        };

        setGallery(prev => [newItem, ...prev]);
        setLightboxItem(newItem);

        if (showToast) showToast("Storyboard generated successfully!", "success");
        onClose();
      } else {
        throw new Error("No URL returned from server.");
      }
    } catch (err) {
      console.error("Storyboard generation failed:", err);
      if (showToast) showToast(`Storyboard failed: ${err.message}`, "error");
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <motion.div
        initial={{ scale: 0.93, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-4xl bg-[#0e0e11] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl max-h-[95vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#0e0e11] flex-none">
          <div className="flex items-center gap-3">
            <Film className="w-4 h-4 text-emerald-400" />
            <span className="font-black text-white text-sm uppercase tracking-wider">Storyboard Console</span>
            <span className="text-[10px] text-white/30 uppercase tracking-widest">
              Choose concept · Brief story · hit compile
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* Left Pane: Reference Image Preview */}
          <div className="flex-1 relative overflow-auto flex items-center justify-center bg-black/40 p-5">
            <img
              src={resolveUrl(lightboxItem.url)}
              alt="storyboard base"
              className="block rounded-xl max-w-full max-h-[65vh] object-contain shadow-2xl border border-white/5"
            />
            <div className="absolute bottom-4 left-4 bg-black/75 px-3 py-1.5 rounded-lg border border-white/10 text-[9px] font-bold text-white/60 uppercase tracking-wider">
              Reference Input Image
            </div>
          </div>

          {/* Right Pane: Controls */}
          <div className="w-full md:w-80 flex-none border-t md:border-t-0 md:border-l border-white/10 bg-[#111114] flex flex-col p-5 gap-4 overflow-y-auto custom-scrollbar">
            
            {/* Note banner */}
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-[9px] leading-relaxed text-white/70">
              <span className="font-black text-emerald-400 uppercase tracking-wider block mb-0.5 animate-pulse">🎬 Multi-Shot Poster</span>
              Generate a premium 6–8 panel connected storyboard layout merged into a single vertical cinematic poster, holding perfect face/hair and visual identity consistency.
            </div>

            {/* Concept Dropdown */}
            <div className="space-y-2">
              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Select Story Concept</p>
              <select
                value={selectedStoryTemplate}
                onChange={e => setSelectedStoryTemplate(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
              >
                {Object.entries(STORY_TEMPLATES).map(([key, val]) => (
                  <option key={key} value={key} className="bg-[#111] text-white text-xs">{val.label}</option>
                ))}
              </select>
            </div>

            {/* Engine Selection Dropdown */}
            <div className="space-y-2">
              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Select Model Engine</p>
              <select
                value={engine}
                onChange={e => setEngine(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
              >
                <option value="gemini-3.1-flash-image-preview" className="bg-[#111] text-white">Nano Banana 2 (Flash)</option>
                <option value="gpt-image-2" className="bg-[#111] text-white">GPT 2 (OpenAI)</option>
              </select>
            </div>

            {/* Story Brief Input */}
            <div className="space-y-2 flex-1 flex flex-col min-h-[160px]">
              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Story Brief / Narrative</p>
              <textarea
                value={storyBrief}
                onChange={e => setStoryBrief(e.target.value)}
                placeholder="Describe what happens in your storyboard panels (e.g., 'A rogue explorer discovers an ancient glowing portal, steps through, and looks back amazed as neon energy swirls around her hairstyle...')"
                className="w-full flex-1 bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-emerald-500 resize-none leading-relaxed custom-scrollbar"
              />
            </div>

            {/* Action button */}
            <button
              onClick={handleGenerateStoryboard}
              disabled={isGeneratingStoryboard || !storyBrief.trim()}
              className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                isGeneratingStoryboard || !storyBrief.trim()
                  ? 'bg-white/5 text-white/20 cursor-not-allowed border border-transparent'
                  : 'bg-emerald-500 text-black hover:scale-[1.02] shadow-lg shadow-emerald-500/20 font-bold'
              }`}
            >
              {isGeneratingStoryboard ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Compiling Storyboard…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Generate Storyboard (5⚡)
                </span>
              )}
            </button>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
