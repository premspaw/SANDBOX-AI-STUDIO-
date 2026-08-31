import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Upload, X, Camera, Copy, Check, Wand2,
  Image as ImageIcon, Box, Play, Layers, Maximize2, RefreshCw,
  Film, Share2, Tag, ChevronRight, Sliders, ArrowRight, Eye, Grid
} from 'lucide-react';
import { Kanban, FilmSlate, Megaphone, Target, Sparkle } from '@phosphor-icons/react';
import { useAppStore } from '../../store';
import { getApiUrl } from '../../config/apiConfig';

// Marketing Platform Storyboard Presets
const MARKETING_PRESETS = [
  {
    id: 'insta_reel',
    title: '📸 Instagram Reel Commercial (4-Panel Grid)',
    platform: 'Instagram / Reels',
    gridSize: '2x2 (4 Panels)',
    shots: 4,
    brief: 'High-converting Instagram Reel ad: Panel 1 (Eye-catching Hook & Problem), Panel 2 (Unboxing & Product Texture Reveal), Panel 3 (Hands-on Benefit Demo in real setting), Panel 4 (Final Hero Smile & CTA).'
  },
  {
    id: 'tiktok_ugc',
    title: '🎵 TikTok Viral UGC Arc (6-Panel Grid)',
    platform: 'TikTok / Shorts',
    gridSize: '3x2 (6 Panels)',
    shots: 6,
    brief: 'Authentic TikTok UGC arc: Panel 1 (Shocking Hook reaction), Panel 2 (Problem close-up), Panel 3 (Product intro), Panel 4 (Application demo), Panel 5 (Before/After result), Panel 6 (Offer CTA).'
  },
  {
    id: 'cinematic_spot',
    title: '🎬 Luxury Brand Spot (4-Panel Grid)',
    platform: 'YouTube / TV',
    gridSize: '2x2 (4 Panels)',
    shots: 4,
    brief: 'Luxury cinematic commercial: Panel 1 (Moody atmospheric scene), Panel 2 (Macro product material reveal), Panel 3 (Character using product with elegance), Panel 4 (Brand logo & slogan finish).'
  },
  {
    id: 'ecom_demo',
    title: '💻 E-Commerce Tech Showcase (4-Panel Grid)',
    platform: 'E-Commerce / Amazon',
    gridSize: '2x2 (4 Panels)',
    shots: 4,
    brief: 'Clean studio e-commerce showcase: Panel 1 (Clean product hero shot), Panel 2 (Key feature callout closeup), Panel 3 (Lifestyle in-use framing), Panel 4 (Packaging & contents overview).'
  }
];

// AI Storyboard Engines
const ENGINE_OPTIONS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Multimodal Director)', provider: 'Google AI' },
  { id: 'imagen-3', name: 'Imagen 3 (Visual Grid Sheet Renderer)', provider: 'Google DeepMind' },
  { id: 'gpt-4o', name: 'GPT-4o Vision (Marketing Specialist)', provider: 'OpenAI' }
];

export default function StoryboardStudio() {
  const { setActiveTab } = useAppStore();
  const [productImg, setProductImg] = useState(null);
  const [logoImg, setLogoImg] = useState(null);
  const [characterImg, setCharacterImg] = useState(null);
  const [locationImg, setLocationImg] = useState(null);

  const [selectedPreset, setSelectedPreset] = useState(MARKETING_PRESETS[0]);
  const [storyBrief, setStoryBrief] = useState(MARKETING_PRESETS[0].brief);
  const [selectedEngine, setSelectedEngine] = useState('gemini-2.5-flash');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [storyboardGrid, setStoryboardGrid] = useState(null);
  const [gridImageUrl, setGridImageUrl] = useState(null);
  const [isGeneratingGridImg, setIsGeneratingGridImg] = useState(false);
  
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [selectedFrameModal, setSelectedFrameModal] = useState(null);

  // File Upload Handler
  const handleImageUpload = (e, setFn) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFn({ file, url: ev.target.result });
    };
    reader.readAsDataURL(file);
  };

  // Prepare multimodal parts with inline images for Gemini
  const prepareMultimodalParts = async () => {
    const parts = [];
    const imagesToProcess = [
      { tag: '<PRODUCT_REF>', data: productImg, label: 'Product / Item' },
      { tag: '<LOGO_REF>', data: logoImg, label: 'Brand Logo' },
      { tag: '<CHARACTER_REF>', data: characterImg, label: 'Presenter / Character' },
      { tag: '<LOCATION_REF>', data: locationImg, label: 'Environment / Setting' }
    ].filter(item => item.data);

    for (let i = 0; i < imagesToProcess.length; i++) {
      const item = imagesToProcess[i];
      const rawUrl = item.data.url;
      if (rawUrl.startsWith('data:')) {
        const [meta, b64] = rawUrl.split(',');
        const mimeType = meta.split(':')[1]?.split(';')[0] || 'image/png';
        parts.push({
          inlineData: { mimeType, data: b64 }
        });
        parts.push({ text: `Attached reference asset [${item.tag}] (${item.label}) for character identity, product design, and brand lock.` });
      }
    }
    return parts;
  };

  // Generate Storyboard Breakdown & Grid Prompt using Gemini AI
  const handleGenerateStoryboard = async () => {
    if (!storyBrief.trim() && !productImg && !characterImg) {
      alert('Please enter a story brief or upload at least one reference asset.');
      return;
    }
    setIsGenerating(true);
    setGridImageUrl(null);

    try {
      const parts = await prepareMultimodalParts();

      const systemPrompt = `You are an elite marketing director and visual storyboard artist.
Analyze the attached reference images (Product, Character, Logo, Location) and concept brief.
Generate a structured ${selectedPreset.shots}-panel marketing storyboard grid.

MARKETING BRIEF:
"${storyBrief}"

FORMAT REQUIREMENTS:
Target Platform: ${selectedPreset.platform}
Grid Layout: ${selectedPreset.gridSize}
Aspect Ratio: ${aspectRatio}

CRITICAL LOCK RULES:
- Ensure character facial identity (<CHARACTER_REF>), product packaging (<PRODUCT_REF>), and logo placement (<LOGO_REF>) remain 100% consistent across all panels in the grid image.
- Produce a single master Composite Storyboard Grid prompt that describes a multi-panel grid sheet (e.g. 2x2 grid containing 4 distinct sequential scenes).

Output strictly a JSON object with this EXACT structure:
{
  "compositeGridPrompt": "Single high-detail AI image prompt describing a 2x2 grid sheet showing 4 distinct storyboard panels. Panel 1: [Hook description]. Panel 2: [Problem demo]. Panel 3: [Product in use]. Panel 4: [Call to Action]. High resolution storyboard sheet, locked character face <CHARACTER_REF>, consistent product <PRODUCT_REF>.",
  "seedancePrompt": "Seedance 2.0 multimodal prompt: Extract the character from Image 1 and product from Image 2 to generate a continuous video sequence following the 4 storyboard panels...",
  "panels": [
    {
      "panelIndex": 1,
      "panelName": "Panel 1: Attention Hook",
      "shotAngle": "Close-Up Face & Product",
      "visualDescription": "Detailed panel visual description...",
      "dialogue": "Spoken voiceover line for this panel...",
      "actionCue": "Character motion beat..."
    }
  ]
}

Return ONLY raw valid JSON.`;

      parts.push({ text: systemPrompt });

      const res = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts, model: selectedEngine })
      });

      if (!res.ok) throw new Error(`Storyboard generation failed: ${res.status}`);
      const data = await res.json();
      const rawText = data.text || '';

      let parsed = null;
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(rawText);
      }

      setStoryboardGrid(parsed);

      // Auto-trigger visual grid image render
      if (parsed?.compositeGridPrompt) {
        renderCompositeGridImage(parsed.compositeGridPrompt);
      }
    } catch (e) {
      console.error('[Storyboard Error]', e);
      // Fallback storyboard structure
      generateFallbackGrid();
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFallbackGrid = () => {
    const mock = {
      compositeGridPrompt: `A 2x2 storyboard grid sheet depicting a high-impact marketing commercial. Panel 1: Close-up of creator holding product with an surprised expression. Panel 2: Hands unboxing product showing premium material. Panel 3: Creator demonstrating product in real setting. Panel 4: Hero smile holding product with brand logo overlay. Clean cinematic lighting, 8k resolution storyboard sheet.`,
      seedancePrompt: `Extract character from Image 1 and product from Image 2. Generate a 10-second video sequence transitioning through 4 distinct beats: hook reaction, product reveal, application, and final smile with CTA.`,
      panels: [
        { panelIndex: 1, panelName: 'Panel 1: The Viral Hook', shotAngle: 'Medium Close-Up', visualDescription: 'Creator holds product to camera with an intrigued expression, bright studio light.', dialogue: 'If you are still doing it the old way, stop right now!', actionCue: 'Quick push-in to face' },
        { panelIndex: 2, panelName: 'Panel 2: Product Reveal & Texture', shotAngle: 'Macro Close-Up', visualDescription: 'Hands opening product packaging, revealing smooth metallic surface and finish.', dialogue: 'Look at the build quality on this thing.', actionCue: 'Tactile unboxing motion' },
        { panelIndex: 3, panelName: 'Panel 3: Hands-On Application', shotAngle: 'Over-the-Shoulder', visualDescription: 'Creator actively using product in a clean modern kitchen / desk environment.', dialogue: 'It takes literally 5 seconds and works instantly.', actionCue: 'Smooth operating motion' },
        { panelIndex: 4, panelName: 'Panel 4: Hero Payoff & CTA', shotAngle: 'Low Angle Hero', visualDescription: 'Confident smile holding product, brand logo visible on screen with special offer tag.', dialogue: 'Tap the link below to claim yours today!', actionCue: 'Holds product with confident smile' }
      ]
    };
    setStoryboardGrid(mock);
    renderCompositeGridImage(mock.compositeGridPrompt);
  };

  // Render the Composite Storyboard Grid Image via AI Image API
  const renderCompositeGridImage = async (gridPrompt) => {
    setIsGeneratingGridImg(true);
    try {
      const parts = await prepareMultimodalParts();
      parts.push({
        text: `Generate a high quality single composite image showing a multi-panel storyboard grid sheet: ${gridPrompt}. High quality illustration / photo grid sheet.`
      });

      const res = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts, model: 'gemini-2.5-flash' })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url || data.image) {
          setGridImageUrl(data.url || data.image);
        }
      }
    } catch (e) {
      console.error('[Render Grid Img Error]', e);
    } finally {
      setIsGeneratingGridImg(false);
    }
  };

  // Transfer Storyboard Grid + Seedance prompt to UGC / Seedance Video Engine
  const handleFeedToSeedance = () => {
    if (!storyboardGrid) return;
    
    // Format scenes for Seedance 2.0 / UGC split scenes
    const splitScenes = storyboardGrid.panels.map(p => ({
      label: p.panelName,
      dialog: p.dialogue,
      prompt: p.visualDescription,
      refImage: gridImageUrl || (productImg?.url || characterImg?.url || null)
    }));

    try {
      useAppStore.getState().setActiveTab('ugc');
      window.dispatchEvent(new CustomEvent('load_storyboard_scenes', { 
        detail: { 
          splitScenes,
          seedancePrompt: storyboardGrid.seedancePrompt,
          compositeGridImage: gridImageUrl
        } 
      }));
    } catch (e) {
      console.error('[Feed to Seedance Error]', e);
    }
  };

  const handleCopyPrompts = () => {
    if (!storyboardGrid) return;
    const text = `COMPOSITE STORYBOARD GRID PROMPT:\n${storyboardGrid.compositeGridPrompt}\n\nSEEDANCE 2.0 PROMPT:\n${storyboardGrid.seedancePrompt}\n\nPANEL BREAKDOWN:\n` +
      storyboardGrid.panels.map(p => `${p.panelName} [${p.shotAngle}]:\nVISUAL: ${p.visualDescription}\nDIALOGUE: "${p.dialogue}"`).join('\n\n');
    
    navigator.clipboard.writeText(text);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  };

  return (
    <div className="h-full w-full bg-[#050508] text-white flex flex-col font-sans overflow-hidden">
      {/* ── Top Header Bar ── */}
      <header className="h-14 px-6 border-b border-white/10 bg-[#0a0a10]/90 backdrop-blur-xl flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Kanban size={20} className="text-black font-bold" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              ZEROLENS STORYBOARD STUDIO
              <span className="text-[9px] bg-amber-400/10 border border-amber-400/30 text-amber-400 px-2 py-0.5 rounded-full font-mono uppercase tracking-widest">
                AI Composite Grid Sheet Engine
              </span>
            </h1>
            <p className="text-[10px] text-white/40 font-medium">Generate single-image composite storyboard grid sheets with locked face &amp; product identity</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {storyboardGrid && (
            <>
              <button
                onClick={handleCopyPrompts}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-bold transition-all"
              >
                {copiedStatus ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedStatus ? 'Copied All Prompts!' : 'Copy Prompts'}</span>
              </button>

              <button
                onClick={handleFeedToSeedance}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Sparkles size={14} />
                <span>Feed to Seedance 2.0 / Video Engine</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Main Studio Layout ── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* ── Left Control Sidebar ── */}
        <aside className="w-96 border-r border-white/10 bg-[#09090e] p-5 flex flex-col gap-5 overflow-y-auto custom-scrollbar shrink-0">
          {/* 1. Reference Assets Upload */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center justify-between">
              <span>1. Reference Identity Lock Assets</span>
              <span className="text-[9px] text-amber-400 font-mono">Multimodal Sync</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              {/* Product */}
              <div className="relative group h-24 rounded-xl bg-[#12121c] border border-white/10 hover:border-amber-400/50 transition-all flex flex-col items-center justify-center p-2 overflow-hidden">
                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, setProductImg)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                {productImg ? (
                  <>
                    <img src={productImg.url} alt="Product" className="w-full h-full object-cover rounded-lg" />
                    <button onClick={e => { e.stopPropagation(); setProductImg(null); }} className="absolute top-1 right-1 p-1 bg-black/80 text-red-400 rounded-md z-20"><X size={12} /></button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-white/30 group-hover:text-amber-400">
                    <Box size={22} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Product / Item</span>
                  </div>
                )}
              </div>

              {/* Character / Presenter */}
              <div className="relative group h-24 rounded-xl bg-[#12121c] border border-white/10 hover:border-amber-400/50 transition-all flex flex-col items-center justify-center p-2 overflow-hidden">
                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, setCharacterImg)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                {characterImg ? (
                  <>
                    <img src={characterImg.url} alt="Character" className="w-full h-full object-cover rounded-lg" />
                    <button onClick={e => { e.stopPropagation(); setCharacterImg(null); }} className="absolute top-1 right-1 p-1 bg-black/80 text-red-400 rounded-md z-20"><X size={12} /></button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-white/30 group-hover:text-amber-400">
                    <Camera size={22} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Avatar / Presenter</span>
                  </div>
                )}
              </div>

              {/* Brand Logo */}
              <div className="relative group h-20 rounded-xl bg-[#12121c] border border-white/10 hover:border-amber-400/50 transition-all flex flex-col items-center justify-center p-2 overflow-hidden">
                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, setLogoImg)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                {logoImg ? (
                  <>
                    <img src={logoImg.url} alt="Logo" className="w-full h-full object-contain rounded-lg p-1 bg-black/40" />
                    <button onClick={e => { e.stopPropagation(); setLogoImg(null); }} className="absolute top-1 right-1 p-1 bg-black/80 text-red-400 rounded-md z-20"><X size={12} /></button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-white/30 group-hover:text-amber-400">
                    <Tag size={18} />
                    <span className="text-[8px] font-black uppercase tracking-wider">Brand Logo</span>
                  </div>
                )}
              </div>

              {/* Location / Stage */}
              <div className="relative group h-20 rounded-xl bg-[#12121c] border border-white/10 hover:border-amber-400/50 transition-all flex flex-col items-center justify-center p-2 overflow-hidden">
                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, setLocationImg)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                {locationImg ? (
                  <>
                    <img src={locationImg.url} alt="Location" className="w-full h-full object-cover rounded-lg" />
                    <button onClick={e => { e.stopPropagation(); setLocationImg(null); }} className="absolute top-1 right-1 p-1 bg-black/80 text-red-400 rounded-md z-20"><X size={12} /></button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-white/30 group-hover:text-amber-400">
                    <ImageIcon size={18} />
                    <span className="text-[8px] font-black uppercase tracking-wider">Stage / Location</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Marketing Platform Preset */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
              2. Marketing Platform Target
            </label>
            <div className="space-y-1.5">
              {MARKETING_PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPreset(p);
                    setStoryBrief(p.brief);
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all ${selectedPreset.id === p.id ? 'bg-amber-400/10 border-amber-400 text-amber-400' : 'bg-[#12121c] border-white/5 text-white/70 hover:border-white/20'}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider truncate">{p.title}</p>
                    <span className="text-[8px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-white/40">{p.gridSize}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Narrative Brief */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
              3. Concept &amp; Story Brief
            </label>
            <textarea
              value={storyBrief}
              onChange={e => setStoryBrief(e.target.value)}
              placeholder="Describe campaign objective, ad script, or storyboard beats..."
              rows={4}
              className="w-full bg-[#12121a] border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-amber-400/50 resize-none font-sans"
            />
          </div>

          {/* 4. Engine & Parameters */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-[#12121a] border border-white/10">
            <div>
              <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block mb-1">AI Storyboard Engine</label>
              <select
                value={selectedEngine}
                onChange={e => setSelectedEngine(e.target.value)}
                className="w-full bg-[#181824] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none"
              >
                {ENGINE_OPTIONS.map(eng => (
                  <option key={eng.id} value={eng.id}>{eng.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block mb-1">Video Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={e => setAspectRatio(e.target.value)}
                className="w-full bg-[#181824] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none"
              >
                <option value="9:16">9:16 Vertical (Reels / TikTok)</option>
                <option value="16:9">16:9 Landscape (YouTube / Commercial)</option>
                <option value="1:1">1:1 Square (Instagram Feed)</option>
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateStoryboard}
            disabled={isGenerating}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-black font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw size={16} className="animate-spin text-black" />
                <span>Creating Storyboard Grid Sheet...</span>
              </>
            ) : (
              <>
                <Wand2 size={16} className="text-black" />
                <span>Generate Composite Storyboard Grid</span>
              </>
            )}
          </button>
        </aside>

        {/* ── Right Output Workspace (Single Composite Image Sheet + Breakdown Cards) ── */}
        <main className="flex-1 min-w-0 bg-[#050508] p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          {!storyboardGrid ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 text-white/30">
              <div className="w-16 h-16 rounded-3xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                <Grid size={32} />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-white/80">No Active Storyboard Grid</h3>
                <p className="text-xs text-white/40 mt-1">Upload reference assets or choose a marketing preset to generate a single composite Storyboard Grid sheet.</p>
              </div>
            </div>
          ) : (
            /* Storyboard Workspace Content */
            <div className="space-y-6 max-w-5xl mx-auto w-full">
              {/* Composite Storyboard Grid Image Box */}
              <div className="rounded-3xl bg-[#0c0c14] border border-white/10 p-5 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <h2 className="text-xs font-black uppercase tracking-widest text-amber-400">
                      Master Composite Storyboard Grid Sheet ({selectedPreset.gridSize})
                    </h2>
                  </div>

                  <button
                    onClick={() => renderCompositeGridImage(storyboardGrid.compositeGridPrompt)}
                    disabled={isGeneratingGridImg}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all text-amber-400"
                  >
                    {isGeneratingGridImg ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    <span>Re-Render Grid Sheet</span>
                  </button>
                </div>

                {/* Grid Image Display */}
                <div className="relative aspect-video rounded-2xl bg-[#12121e] border border-white/5 overflow-hidden flex items-center justify-center group/master min-h-[320px]">
                  {gridImageUrl ? (
                    <img src={gridImageUrl} alt="Storyboard Grid Sheet" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center p-8 space-y-3">
                      {isGeneratingGridImg ? (
                        <>
                          <RefreshCw size={32} className="mx-auto text-amber-400 animate-spin" />
                          <p className="text-xs font-extrabold uppercase tracking-wider text-amber-400">Rendering AI Composite Grid Sheet...</p>
                        </>
                      ) : (
                        <>
                          <ImageIcon size={32} className="mx-auto text-white/20" />
                          <p className="text-xs text-white/40 font-mono">Composite Grid Prompt Generated</p>
                          <button
                            onClick={() => renderCompositeGridImage(storyboardGrid.compositeGridPrompt)}
                            className="px-4 py-2 rounded-xl bg-amber-400 text-black font-black text-xs uppercase tracking-wider"
                          >
                            Render AI Grid Sheet
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {gridImageUrl && (
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover/master:opacity-100 transition-opacity">
                      <a
                        href={gridImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <Maximize2 size={13} /> Inspect Full Screen
                      </a>
                    </div>
                  )}
                </div>

                {/* Seedance 2.0 Integration Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-400/30 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Sparkles size={14} /> Seedance 2.0 Multimodal Pipeline Ready
                    </p>
                    <p className="text-[10px] text-white/60">
                      Feeds locked identity grid + shot prompts straight into Seedance 2.0 or Video Omni Engine.
                    </p>
                  </div>

                  <button
                    onClick={handleFeedToSeedance}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0"
                  >
                    Feed to Seedance 2.0
                  </button>
                </div>
              </div>

              {/* Panel-by-Panel Breakdown Cards */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-white/50 flex items-center gap-2">
                  <Layers size={14} className="text-amber-400" />
                  Sequential Panel Breakdown ({storyboardGrid.panels.length} Panels)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {storyboardGrid.panels.map((p, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                      className="rounded-2xl bg-[#0c0c14] border border-white/10 p-4 space-y-2 hover:border-amber-400/40 transition-all"
                    >
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-400 text-black font-black text-xs flex items-center justify-center">
                            {p.panelIndex}
                          </span>
                          <span className="text-xs font-black text-white">{p.panelName}</span>
                        </div>
                        <span className="text-[9px] bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded-md font-mono uppercase">
                          {p.shotAngle}
                        </span>
                      </div>

                      <p className="text-xs text-white/80 leading-relaxed font-sans">{p.visualDescription}</p>

                      {p.dialogue && (
                        <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                          <p className="text-[9px] font-bold text-amber-400/80 uppercase tracking-wider">Voiceover / Dialogue</p>
                          <p className="text-xs italic text-amber-200/90 font-medium">"{p.dialogue}"</p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
