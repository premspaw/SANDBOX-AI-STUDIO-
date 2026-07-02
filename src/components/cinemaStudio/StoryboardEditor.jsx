import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Sparkles, Film } from 'lucide-react';
import { useAppStore } from '../../store';
import { resolveUrl, getApiUrl } from '../../config/apiConfig';

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

  const getCreditCost = () => {
    if (engine === 'gemini-3.1-flash-lite') return 1;
    return engine === 'gpt-image-2' ? 3 : 2;
  };

  // Storyboard Preloaded Blueprints Map
  const STORY_TEMPLATES = {
    story1: {
      label: "Story 1: Netflix Cinematic Story Sheet",
      prompt: `You are generating a SINGLE vertical poster image that functions as a professional Netflix-style multi-panel storyboard. All panels must be seamlessly merged into one cohesive vertical composition.

CRITICAL — CHARACTER CONSISTENCY: Preserve the exact face structure, facial features, skin tone, hair color, hairstyle, eye shape, outfit, and body proportions from the reference image across ALL panels. Do not alter or reinterpret the character in any frame.

PANEL LAYOUT: Arrange 6–8 cinematic frames divided by thin matte-black film strip borders into a single vertical poster. Each panel must have a distinct camera angle:
Panel 1 — Wide establishing shot of environment, character entering frame
Panel 2 — Medium waist-up shot, character aware, scanning surroundings
Panel 3 — Close-up of face, micro-expression of tension or curiosity
Panel 4 — Action beat — movement, dynamic angle, motion blur on edges
Panel 5 — Over-the-shoulder shot revealing what the character sees
Panel 6 — Low-angle hero shot, character standing resolute
Panel 7 — Emotional peak — extreme close-up of eyes, depth of field bokeh
Panel 8 — Wide cinematic outro, character small against grand environment

VISUAL STYLE: Netflix cinematic color grading, teal-orange LUT, volumetric lighting, 35mm film grain, anamorphic lens flares, shallow depth of field, photorealistic skin detail, 8K resolution quality, masterpiece composition. All panels must share identical lighting logic and color palette.

OUTPUT: One single seamless vertical image. No white space. No text. No watermarks.`
    },
    story2: {
      label: "Story 2: High-Octane Action Blockbuster",
      prompt: `You are generating a SINGLE vertical action storyboard poster — 6–8 panels fused into one seamless vertical image, styled like a premium Hollywood action blockbuster concept sheet.

CRITICAL — CHARACTER CONSISTENCY: Lock the exact face, hair, skin tone, physique, and costume from the reference image across every single panel. No variation allowed. Same person, same outfit, different angles and moments.

PANEL SEQUENCE — must flow chronologically as one unbroken action beat:
Panel 1 — Tight close-up of character's eyes: intense focus, brow slightly furrowed, dramatic rim light
Panel 2 — Medium shot: body tensed, weight shifting, preparing for movement — environment reflects incoming threat
Panel 3 — Full-body sprint: low tracking angle, camera slightly tilted, motion blur on legs, dust kicking up
Panel 4 — Mid-air suspension frame: character in dramatic leap, frozen at apex, debris or sparks passing by
Panel 5 — Impact frame: landing or collision moment, shockwave energy ripple, environmental destruction
Panel 6 — Counter-attack close shot: arm or hand in powerful extension motion, face side-lit dramatically
Panel 7 — Recovery beat: character straightening up, smoke/particle debris settling, wide shoulders confident
Panel 8 — Cinematic final frame: wide shot, character centered in destroyed environment, camera low, sky dramatic

VISUAL STYLE: IMAX action film color grade, deep navy and burning orange palette, smoke particles, lens flare bursts, volumetric god rays, motion blur, cinematic grain, Dolby Vision HDR contrast, hyper-realistic detail, 8K quality. Thin dark panel borders separating frames.

OUTPUT: One single seamless vertical image. No text labels. No watermarks.`
    },
    story3: {
      label: "Story 3: Cyberpunk Neon Odyssey",
      prompt: `You are generating a SINGLE vertical sci-fi cyberpunk storyboard poster — 6–8 panels fused into one seamless vertical image. The style references Blade Runner 2049, Ghost in the Shell, and Akira — maximum world density.

CRITICAL — CHARACTER CONSISTENCY: Maintain the exact face geometry, skin tone, hair, and outfit from the reference image in every panel. The character may have subtle cybernetic enhancements but the core identity must remain identical throughout.

PANEL SEQUENCE — one complete cyberpunk narrative arc:
Panel 1 — Extreme wide shot: character tiny against a towering neon megacity at night, rain falling, holographic billboards
Panel 2 — Street level medium shot: character walking through rain-soaked alley, neon signs reflecting in puddles underfoot
Panel 3 — Close-up: character's face lit by a floating holographic interface, green data streams reflecting in eyes
Panel 4 — Over-the-shoulder: character looking at a massive glowing data vault or encrypted door, teal and purple light
Panel 5 — Tension beat: character crouching behind cover, scanning, shadows dramatic, heat shimmer from ground vents
Panel 6 — System activation: cybernetic circuit lines glowing along character's skin/clothing, energy radiating outward
Panel 7 — Confrontation: face-to-face with a threat or figure, both silhouetted against intense purple-white backlight
Panel 8 — Departure: character walking away into the neon fog, lone figure, city humming, atmospheric and cinematic

VISUAL STYLE: Cyberpunk color grade — deep teal shadows, magenta and cyan neon, amber street glow, heavy volumetric fog, rain streaks, holographic HUD overlays in panels 3 and 6, film grain, anamorphic bokeh on background neon, Unreal Engine 5 photorealism quality. Thin holographic-blue panel dividers.

OUTPUT: One single seamless vertical image. No text labels. No watermarks.`
    },
    story4: {
      label: "Story 4: Custom Director's Cut (Your Angle + Brief)",
      prompt: `You are a senior Hollywood storyboard artist. Generate a SINGLE vertical storyboard poster containing 6–8 cinematic panels fused seamlessly into one image, based entirely on the director's brief and chosen angle provided below.

CRITICAL — CHARACTER CONSISTENCY: Copy the exact face structure, skin tone, hair color, hairstyle, eye shape, outfit, and body proportions from the reference image into EVERY panel without any deviation. Same person. Same clothes. Only camera angle and scene context changes.

DIRECTOR'S ANGLE & BRIEF:
[USER STORY SCENARIO BRIEF: {storyBrief}]

PANEL CONSTRUCTION RULES:
- Read the user brief carefully and extract the core narrative arc
- Divide the story into 6–8 distinct beats: setup → tension → action → peak → resolution
- Assign a unique camera angle to each panel — no two panels should use the same framing
- Camera angles to choose from: extreme wide, wide, medium, close-up, extreme close-up, low-angle, high-angle, bird's-eye, Dutch tilt, over-the-shoulder, POV, two-shot
- Each panel must advance the story — no repeated moments or filler frames
- Panels must read top-to-bottom as a coherent visual narrative

VISUAL STYLE RULES:
- Match the color grade and mood to the tone of the user's brief:
  → Drama/emotion: warm amber + deep shadow, 35mm grain, shallow depth of field
  → Action/thriller: high contrast blue-orange, motion blur, lens flares
  → Sci-fi/fantasy: teal-magenta neon, volumetric fog, glowing practical lights
  → Horror/dark: desaturated + single harsh practical light, heavy vignette
  → Romance/character: soft golden hour, bokeh, intimate framing
- Photorealistic, 8K quality, anamorphic lens aesthetics
- Thin matte-black panel dividers between frames
- All panels share the same lighting logic and color palette

OUTPUT: One single seamless vertical image. No text overlays. No watermarks. No captions.`
    },
    story5: {
      label: "Story 5: Universal Cinematic Storyboard",
      prompt: `INPUT

Reference Images
Use the uploaded image(s) as the ONLY identity reference.
If multiple images are uploaded, treat them as different angles of the SAME PERSON.

User Story Prompt
{storyBrief}

⸻

DIRECTOR MODE
You are an Oscar-winning cinematographer, film director, storyboard artist, and concept designer.
Convert the user’s prompt into a cinematic visual sequence.
Do not simply create nine random camera angles.
Create a continuous visual story.
Every frame should naturally lead into the next.
Think like a real movie.

⸻

CHARACTER LOCK
Use the uploaded reference images as the only source of truth.
Analyze every uploaded image before generation.
Preserve exactly:
• face shape
• skull structure
• forehead
• eyebrows
• eyes
• eyelids
• iris spacing
• nose
• lips
• jawline
• chin
• ears
• hairstyle
• hairline
• facial hair
• skin tone
• body proportions
• height
• physique
• clothing
• accessories
Identity Accuracy: 100%
Character Consistency: Maximum
Never redesign the face.
Never beautify.
Never replace the person.
Never generate another identity.

⸻

STORY CONTINUITY
All nine images belong to the SAME scene.
Same character.
Same clothing.
Same hairstyle.
Same lighting.
Same weather.
Same time of day.
Same location unless the user’s prompt explicitly changes location.
Each frame should continue naturally from the previous frame.
The character should move naturally through the environment.

⸻

AUTOMATIC SHOT PLANNING
Without user instruction, automatically create cinematic coverage such as:
Frame 1: Establishing Shot
Frame 2: Wide Shot
Frame 3: Medium Wide
Frame 4: Medium Shot
Frame 5: Close-up Emotional Shot
Frame 6: Over-the-Shoulder
Frame 7: Profile / Side Shot
Frame 8: Dynamic Hero Angle
Frame 9: Final Cinematic Ending Frame
Choose the best composition based on the story.
Do NOT repeat similar compositions.
Every frame should reveal new visual information.

⸻

CINEMATIC LANGUAGE
Use realistic filmmaking techniques:
Establishing Shot, Master Shot, Wide Shot, Medium Shot, Cowboy Shot, Close-up, Extreme Close-up, Over-the-Shoulder, POV Shot, Tracking Shot, Dolly Shot, Push-in, Pull-back, Low Angle, High Angle, Dutch Angle (only if dramatically justified), Crane Shot, Drone Shot, Foreground Framing, Rack Focus, Natural Blocking, Visual Storytelling.

⸻

CAMERA
ARRI Alexa 65, Sony Venice 2, RED V-Raptor, Cooke Anamorphic Lens, Zeiss Supreme Prime.
Natural depth of field, professional composition, Hollywood framing, real lens compression, film-quality perspective.

⸻

LIGHTING
Physically accurate lighting, soft cinematic shadows, natural skin rendering, global illumination, volumetric lighting, real reflections, HDR, film color science.

⸻

VISUAL STYLE
Hollywood Feature Film, Netflix Original, AAA Game Cinematic, Luxury Editorial, IMAX, Photorealistic, Ultra Detailed, 8K, Film Still, Movie Frame, Production Quality.

⸻

OUTPUT
Generate a premium 3×3 storyboard grid.
Nine connected cinematic frames.
The storyboard must tell one continuous visual story from beginning to end.
Each frame should have a different camera angle, composition, focal length, and emotional purpose while maintaining perfect character and environment continuity.

⸻

NEGATIVE PROMPT
identity drift, different face, different hairstyle, different clothing, different body proportions, different environment, different lighting, different weather, face swap, beauty filter, cartoon, anime, illustration, CGI look, duplicate character, duplicate pose, repeated camera angle, cropped body, missing limbs, extra fingers, blurry, noisy, watermark, logo, text, labels, artifacts, oversaturated colors, unrealistic anatomy, inconsistent scene continuity.`
    }
  };

  // Storyboard Generation Handler using Gemini / GPT
  const handleGenerateStoryboard = async () => {
    if (!storyBrief.trim() || !lightboxItem?.url) return;
    setIsGeneratingStoryboard(true);
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast("Drafting multi-frame storyboard panel...", "info");

    try {
      const credits = getCreditCost();
      const spendResult = await useAppStore.getState().spendShorts(userId, credits, 'image_grid_multishot'); // deduct credits based on engine
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
      let combinedPrompt = '';
      if (selectedStoryTemplate === 'story4') {
        combinedPrompt = STORY_TEMPLATES.story4.prompt.replace('{storyBrief}', storyBrief);
      } else if (selectedStoryTemplate === 'story5') {
        combinedPrompt = STORY_TEMPLATES.story5.prompt.replace('{storyBrief}', storyBrief);
      } else {
        combinedPrompt = `${STORY_TEMPLATES[selectedStoryTemplate]?.prompt || ''}

[USER STORY SCENARIO BRIEF: Describe the specific actions or narrative detail to embed within the storyboard frames: "${storyBrief}"]`;
      }

      const referenceAspect = lightboxItem.aspect || '16:9';

      const payload = {
        model: engine,
        prompt: combinedPrompt,
        aspect_ratio: referenceAspect,
        referenceImages: [lightboxItem.url],
        userId,
        creditReason: 'image_grid_multishot',
        ...(selectedStoryTemplate === 'story5' && {
          negativePrompt: "identity drift, different face, different hairstyle, different clothing, different body proportions, different environment, different lighting, different weather, face swap, beauty filter, cartoon, anime, illustration, CGI look, duplicate character, duplicate pose, repeated camera angle, cropped body, missing limbs, extra fingers, blurry, noisy, watermark, logo, text, labels, artifacts, oversaturated colors, unrealistic anatomy, inconsistent scene continuity."
        })
      };

      const resp = await fetch(getApiUrl('/api/generate-image'), {
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
          engine: `${engine === 'gpt-image-2' ? 'GPT-2' : engine === 'gemini-3.1-flash-lite' ? 'NB2 Lite' : 'Nano Banana 2'} (Storyboard)`,
          aspect: referenceAspect,
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
                <option value="gemini-3.1-flash-lite" className="bg-[#111] text-white">Nano Banana 2 Lite (NB2 Lite)</option>
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
                  <Sparkles className="w-3.5 h-3.5" /> Generate Storyboard ({getCreditCost()}⚡)
                </span>
              )}
            </button>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
