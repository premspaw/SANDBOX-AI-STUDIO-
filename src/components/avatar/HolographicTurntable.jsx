import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, RotateCw, Pause, Play, Compass, Eye, Maximize2,
  Wand2, Download, CheckCircle2, Loader2, Copy, Check, ChevronDown,
  ChevronUp, RefreshCw, ShieldCheck, Zap, History, Images,
  LayoutGrid, Layers, ChevronLeft, ChevronRight, Film, Monitor
} from 'lucide-react';
import { InpaintEditor } from '../common/InpaintEditor';
import { resolveUrl } from '../../config/apiConfig';

// Real sample character turnaround sheets (16:9 3-panel: close-up, front, back on grey background)
const SHOWCASE_CHARACTERS = [
  {
    id: 'sheet-1',
    name: 'Character Sheet · Minimalist',
    role: 'Real · Raw Minimalist (Tank Top)',
    archetype: '3-PANEL',
    image: '/assets/characters/sheet_male_tank.jpg'
  },
  {
    id: 'sheet-2',
    name: 'Character Sheet · Casual',
    role: 'Night · Ambient (Plaid Flannel)',
    archetype: '3-PANEL',
    image: '/assets/characters/sheet_male_plaid.jpg'
  },
  {
    id: 'sheet-3',
    name: 'Character Sheet · Formal',
    role: 'Real · Raw Studio (Cocktail Dress)',
    archetype: '3-PANEL',
    image: '/assets/characters/sheet_female_maroon.jpg'
  },
  {
    id: 'sheet-4',
    name: 'Character Matrix',
    role: 'Multi-View Studio Turnarounds',
    archetype: '3-PANEL',
    image: '/assets/characters/sheet_pets_costumes.png'
  }
];

const LOADING_STATUSES = [
  'Initializing Studio Character Generator...',
  'Aligning 3-panel turnaround perspectives (Close-up, Front, Back)...',
  'Rendering photorealistic skin texture and studio lighting...',
  'Finalizing high-definition character sheet...'
];

const LOCATION_LOADING_STATUSES = [
  'Initializing Cinematic Location Scout...',
  'Composing panoramic widescreen depth & architectural perspective...',
  'Balancing volumetric lighting, atmosphere & empty scene purity...',
  'Finalizing establishing shot (Strictly No Humans)...'
];

const PROP_LOADING_STATUSES = [
  'Initializing Studio Prop Generator...',
  'Setting up seamless neutral turntable isolation...',
  'Rendering surface textures, micro-materials & physical finishes...',
  'Finalizing isolated studio prop render...'
];

export default function HolographicTurntable({
  generating,
  generatedImage,
  activePrompt,
  error,
  downloadImage,
  saveToGallery,
  saving,
  savedOk,
  setGeneratedImage,
  setActivePrompt,
  onApplyPreset,
  userId = 'anon',
  activeMode = 'character',
  gallery = [],
  onOpenGallery
}) {
  // Gallery display mode: 'spatial' (3D Depth Deck) | 'wall' (Cinema Lightbox Wall) | 'spotlight' (Soundstage Spotlight)
  const [stageView, setStageView] = useState('spatial');
  const [orbitSource, setOrbitSource] = useState('gallery'); // 'gallery' | 'samples'
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inpaintOpen, setInpaintOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);

  // Tilt state for generated image
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const activeStatuses = activeMode === 'location'
    ? LOCATION_LOADING_STATUSES
    : activeMode === 'prop'
    ? PROP_LOADING_STATUSES
    : LOADING_STATUSES;

  // Loading text cycler
  useEffect(() => {
    if (!generating) return;
    setStatusIndex(0);
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % activeStatuses.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [generating, activeStatuses]);

  const userGalleryItems = (gallery && gallery.length > 0)
    ? gallery.map((item, idx) => ({
        id: item.id || `gallery-item-${idx}`,
        name: item.character_name || (item.type === 'location' ? 'Cinematic Location' : item.type === 'prop' ? 'Studio Prop' : 'Character Sheet'),
        role: item.style || (item.type === 'location' ? '16:9 Establishing Shot' : item.type === 'prop' ? 'Isolated Studio Finish' : '3-Panel Turnaround'),
        archetype: (item.type || 'SHEET').toUpperCase(),
        image: resolveUrl(item.output_url),
        prompt: item.prompt || '',
        isUserGen: true
      }))
    : [];

  const activeOrbitCards = (orbitSource === 'gallery' && userGalleryItems.length > 0)
    ? userGalleryItems.slice(0, 8)
    : SHOWCASE_CHARACTERS;

  const cardCount = activeOrbitCards.length || 4;

  const handlePrevCard = () => {
    setActiveCardIndex((prev) => (prev > 0 ? prev - 1 : cardCount - 1));
  };

  const handleNextCard = () => {
    setActiveCardIndex((prev) => (prev < cardCount - 1 ? prev + 1 : 0));
  };

  // Keyboard navigation for 3D stage
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (generatedImage || generating) return;
      if (e.key === 'ArrowLeft') {
        setActiveCardIndex((prev) => (prev > 0 ? prev - 1 : cardCount - 1));
      }
      if (e.key === 'ArrowRight') {
        setActiveCardIndex((prev) => (prev < cardCount - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cardCount, generatedImage, generating]);

  const copyPrompt = () => {
    if (!activePrompt) return;
    navigator.clipboard.writeText(activePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMouseMove = (e) => {
    if (!generatedImage) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -12;
    setTilt({ x, y });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#07090D] border border-white/10 rounded-2xl overflow-hidden relative min-h-[520px] shadow-[0_20px_80px_rgba(0,0,0,0.8)] select-none">
      
      {/* ── Main Viewport Area ──────────────────────────────────────────────── */}
      <div 
        className="flex-1 flex flex-col items-center justify-center relative overflow-hidden p-2 perspective-[1400px]"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Animated Cybernetic Ambient Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Subtle Grid */}
          <div 
            className="absolute inset-0 opacity-[0.03]" 
            style={{
              backgroundImage: 'linear-gradient(to right, #C8F135 1px, transparent 1px), linear-gradient(to bottom, #C8F135 1px, transparent 1px)',
              backgroundSize: '48px 48px'
            }}
          />
          {/* Central Radial Energy Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-[#C8F135]/5 via-cyan-500/5 to-purple-500/5 rounded-full blur-[140px]" />
          
          {/* Corner Brackets */}
          <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-white/10 pointer-events-none" />
          <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-white/10 pointer-events-none" />
          <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-white/10 pointer-events-none" />
          <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-white/10 pointer-events-none" />
        </div>

        {/* ── Floating Controls at Top Right ──────────────────────────────────── */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
          {generatedImage ? (
            <button
              type="button"
              onClick={() => setGeneratedImage('')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-black/70 hover:bg-white/10 text-[9px] font-black uppercase tracking-wider text-white/80 hover:text-white transition-all shadow-md cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 text-[#C8F135]" />
              <span>Back to Stage</span>
            </button>
          ) : (
            <>
              {/* Gallery View Mode Switcher: 3D Spatial Deck | Cinema Wall | Spotlight */}
              <div className="flex items-center bg-black/80 border border-white/15 rounded-xl p-0.5 gap-0.5 shadow-lg backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setStageView('spatial')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    stageView === 'spatial'
                      ? 'bg-[#C8F135] text-black shadow-[0_0_12px_rgba(200,241,53,0.3)]'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                  title="3D Spatial Horizon Deck"
                >
                  <Layers className="w-3 h-3" />
                  <span>3D Deck</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStageView('wall')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    stageView === 'wall'
                      ? 'bg-[#C8F135] text-black shadow-[0_0_12px_rgba(200,241,53,0.3)]'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                  title="Cinema Lightbox Wall"
                >
                  <LayoutGrid className="w-3 h-3" />
                  <span>Cinema Wall</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStageView('spotlight')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    stageView === 'spotlight'
                      ? 'bg-[#C8F135] text-black shadow-[0_0_12px_rgba(200,241,53,0.3)]'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                  title="Virtual Soundstage Spotlight"
                >
                  <Monitor className="w-3 h-3" />
                  <span>Spotlight</span>
                </button>
              </div>

              {/* Source Toggle: My Creations vs Samples */}
              {userGalleryItems.length > 0 && (
                <div className="flex items-center bg-black/80 border border-[#C8F135]/30 rounded-xl p-0.5 gap-0.5 shadow-lg backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => setOrbitSource('gallery')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      orbitSource === 'gallery'
                        ? 'bg-[#C8F135] text-black shadow-[0_0_12px_rgba(200,241,53,0.3)]'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                    title="View Your Generated Creations"
                  >
                    <Images className="w-2.5 h-2.5" />
                    <span>Creations ({userGalleryItems.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrbitSource('samples')}
                    className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      orbitSource === 'samples'
                        ? 'bg-[#C8F135] text-black shadow-[0_0_12px_rgba(200,241,53,0.3)]'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                    title="View Showcase Samples"
                  >
                    <span>Samples</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Quick History Button in Floating Viewport */}
          {onOpenGallery && (
            <button
              type="button"
              onClick={onOpenGallery}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#C8F135]/40 hover:border-[#C8F135] bg-black/70 hover:bg-[#C8F135]/15 text-[#C8F135] text-[9px] font-black uppercase tracking-wider transition-all shadow-md cursor-pointer group"
              title="Open Generation History Drawer"
            >
              <History className="w-3 h-3 text-[#C8F135] group-hover:rotate-[-30deg] transition-transform" />
              <span>History</span>
              {gallery?.length > 0 && (
                <span className="text-[8.5px] font-mono px-1.5 py-0.2 rounded-full bg-[#C8F135] text-black font-black">
                  {gallery.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* ── STATE 1: ACTIVE GENERATION IN PROGRESS ─────────────────────────── */}
        {generating && (
          <div className="z-30 flex flex-col items-center justify-center space-y-5 max-w-md text-center p-8 bg-black/80 border border-[#C8F135]/30 rounded-3xl backdrop-blur-2xl shadow-[0_0_60px_rgba(200,241,53,0.15)] animate-pulse">
            
            {/* Spinning Holographic Core */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div 
                className="absolute inset-0 rounded-full border-2 border-dashed border-[#C8F135]/40 animate-spin"
                style={{ animationDuration: '4s' }}
              />
              <div 
                className="absolute inset-2 rounded-full border-2 border-t-transparent border-b-transparent border-[#C8F135] animate-spin"
                style={{ animationDuration: '1.2s', animationDirection: 'reverse' }}
              />
              <div className="w-10 h-10 rounded-full bg-[#C8F135]/20 border border-[#C8F135] flex items-center justify-center shadow-[0_0_30px_#C8F135]">
                <Zap className="w-5 h-5 text-[#C8F135] animate-bounce" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8F135]/15 border border-[#C8F135]/40 text-[#C8F135] text-[9px] font-black uppercase tracking-[0.2em]">
                <Sparkles className="w-3 h-3 animate-spin" />
                <span>
                  {activeMode === 'location'
                    ? 'Scouting Cinematic Location'
                    : activeMode === 'prop'
                    ? 'Synthesizing Studio Prop'
                    : 'Generating Character Sheet'}
                </span>
              </div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                {activeMode === 'location'
                  ? 'Rendering Pure Cinematic Environment'
                  : activeMode === 'prop'
                  ? 'Synthesizing Isolated Studio Prop'
                  : 'Synthesizing 3-Panel Turnaround'}
              </h4>
              <p className="text-xs text-white/50 font-mono leading-relaxed h-8 flex items-center justify-center">
                {activeStatuses[statusIndex]}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full space-y-1.5 pt-2 border-t border-white/10">
              <div className="flex justify-between text-[8px] font-mono uppercase text-white/40">
                <span>Progress</span>
                <span className="text-[#C8F135]">
                  {activeMode === 'location'
                    ? 'Widescreen 16:9 • Strictly No Humans'
                    : activeMode === 'prop'
                    ? 'Seamless Gray Studio Backdrop • Isolated'
                    : 'Close-up • Front • Back'}
                </span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-400 via-[#C8F135] to-emerald-400 rounded-full animate-pulse"
                  style={{ width: `${((statusIndex + 1) / activeStatuses.length) * 100}%`, transition: 'width 0.8s ease' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STATE 2: FINISHED GENERATED CHARACTER BOARD ───────────────────── */}
        {!generating && generatedImage && (
          <div className="z-20 w-full max-w-4xl flex flex-col items-center gap-3">
            {/* Holographic Frame with Mouse 3D Tilt */}
            <div 
              className="relative w-full max-h-[58vh] rounded-2xl overflow-hidden border-2 border-[#C8F135]/40 shadow-[0_20px_70px_rgba(200,241,53,0.15)] bg-black/90 group flex items-center justify-center transition-transform duration-200 ease-out"
              style={{
                transform: `rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
                transformStyle: 'preserve-3d'
              }}
            >
              {/* Laser Scanning Line Sweep effect */}
              <div 
                className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#C8F135] to-transparent pointer-events-none opacity-40 shadow-[0_0_15px_#C8F135]"
                style={{
                  animation: 'scanSweep 4s ease-in-out infinite'
                }}
              />

              <img
                src={resolveUrl(generatedImage)}
                alt={
                  activeMode === 'location'
                    ? 'Synthesized Cinematic Location'
                    : activeMode === 'prop'
                    ? 'Synthesized Studio Prop'
                    : 'Synthesized Character Sheet'
                }
                className="max-w-full max-h-[58vh] w-auto h-auto object-contain object-center transition-transform duration-700 group-hover:scale-[1.01]"
              />

              {/* Tag overlay */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/80 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C8F135] shadow-[0_0_8px_#C8F135]" />
                <span className="text-[8px] font-black uppercase tracking-wider text-white">
                  {activeMode === 'location'
                    ? 'Cinematic Location Establishing Shot'
                    : activeMode === 'prop'
                    ? 'Isolated Studio Prop'
                    : '3-Panel Character Sheet'}
                </span>
              </div>

              {/* Fullscreen Button */}
              <button
                onClick={() => setIsExpanded(true)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/80 hover:bg-[#C8F135] text-white hover:text-black hover:scale-110 active:scale-95 transition-all flex items-center justify-center border border-white/20 shadow-xl"
                title="Expand View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Action Toolbar */}
            <div className="w-full max-w-2xl flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-white/10 bg-black/60 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg cursor-pointer"
              >
                <Maximize2 className="w-3 h-3 text-[#C8F135]" />
                <span>Full View</span>
              </button>

              <button
                type="button"
                onClick={() => setInpaintOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-purple-500/30 bg-purple-950/20 hover:bg-purple-900/40 text-purple-200 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg cursor-pointer"
              >
                <Wand2 className="w-3 h-3 text-purple-400" />
                <span>Brush Inpaint</span>
              </button>

              {/* Save Location / Save Prop / Save Sheet */}
              <button
                type="button"
                onClick={saveToGallery}
                disabled={saving || savedOk}
                className={`flex-[1.2] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border transition-all text-[10px] font-black uppercase tracking-wider active:scale-95 shadow-lg cursor-pointer ${
                  savedOk
                    ? 'border-[#C8F135] bg-[#C8F135]/20 text-[#C8F135]'
                    : 'border-[#C8F135]/40 bg-[#C8F135]/10 hover:bg-[#C8F135]/20 text-[#C8F135]'
                }`}
              >
                {saving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : savedOk ? (
                  <CheckCircle2 className="w-3 h-3 text-[#C8F135]" />
                ) : (
                  <ShieldCheck className="w-3 h-3 text-[#C8F135]" />
                )}
                <span>
                  {savedOk
                    ? 'Saved!'
                    : activeMode === 'location'
                    ? 'Save Location'
                    : activeMode === 'prop'
                    ? 'Save Prop'
                    : 'Save Sheet'}
                </span>
              </button>

              {/* History Button right near Save button as requested! */}
              {onOpenGallery && (
                <button
                  type="button"
                  onClick={onOpenGallery}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl border border-[#C8F135]/40 hover:border-[#C8F135] bg-[#C8F135]/10 hover:bg-[#C8F135]/20 text-[#C8F135] text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-[0_0_15px_rgba(200,241,53,0.12)] cursor-pointer group"
                  title="View History and Past Generations"
                >
                  <History className="w-3.5 h-3.5 text-[#C8F135] group-hover:rotate-[-30deg] transition-transform" />
                  <span>History ({gallery?.length || 0})</span>
                </button>
              )}

              <button
                type="button"
                onClick={downloadImage}
                className="flex items-center justify-center p-2.5 rounded-xl border border-white/10 bg-black/60 hover:bg-white/10 text-white hover:text-[#C8F135] transition-all active:scale-95 shadow-lg cursor-pointer"
                title={
                  activeMode === 'location'
                    ? 'Download Location PNG'
                    : activeMode === 'prop'
                    ? 'Download Prop PNG'
                    : 'Download Sheet PNG'
                }
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── STATE 3: CINEMATIC STAGE & GALLERY (3D DECK | CINEMA WALL | SPOTLIGHT) ── */}
        {!generating && !generatedImage && (
          <div className="relative w-full h-[510px] flex flex-col items-center justify-center overflow-hidden">
            
            {/* VIEW 1: 3D SPATIAL HORIZON DECK (Curved 3D perspective fanning) */}
            {stageView === 'spatial' && (
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                {/* 3D Depth Stage Container */}
                <div 
                  className="relative w-full h-[390px] flex items-center justify-center overflow-hidden"
                  style={{ perspective: '1200px' }}
                >
                  {/* Left Navigation Chevron */}
                  <button
                    type="button"
                    onClick={handlePrevCard}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-black/75 hover:bg-[#C8F135] text-white hover:text-black border border-white/20 hover:border-[#C8F135] flex items-center justify-center transition-all shadow-2xl active:scale-95 cursor-pointer backdrop-blur-md"
                    title="Previous Asset (Arrow Left)"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {/* Right Navigation Chevron */}
                  <button
                    type="button"
                    onClick={handleNextCard}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-black/75 hover:bg-[#C8F135] text-white hover:text-black border border-white/20 hover:border-[#C8F135] flex items-center justify-center transition-all shadow-2xl active:scale-95 cursor-pointer backdrop-blur-md"
                    title="Next Asset (Arrow Right)"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* 3D Fanned Cards Container */}
                  <div className="relative w-0 h-0 flex items-center justify-center">
                    {activeOrbitCards.map((char, index) => {
                      let diff = index - activeCardIndex;
                      if (diff < -Math.floor(cardCount / 2)) diff += cardCount;
                      if (diff > Math.floor(cardCount / 2)) diff -= cardCount;

                      // Hide distant cards for clarity
                      if (Math.abs(diff) > 2) return null;

                      const isHero = diff === 0;
                      const translateX = diff * 290;
                      const translateZ = -Math.abs(diff) * 160;
                      const rotateY = diff * -22;
                      const scale = 1 - Math.abs(diff) * 0.12;
                      const opacity = isHero ? 1 : Math.max(0.35, 0.75 - Math.abs(diff) * 0.25);
                      const zIndex = 30 - Math.abs(diff) * 10;

                      return (
                        <div
                          key={char.id}
                          onClick={() => {
                            if (isHero && char.image) {
                              setGeneratedImage(char.image);
                              if (char.prompt && setActivePrompt) setActivePrompt(char.prompt);
                            } else {
                              setActiveCardIndex(index);
                            }
                          }}
                          className={`absolute w-[360px] md:w-[410px] h-[240px] rounded-2xl cursor-pointer transition-all duration-500 ease-out group overflow-hidden border backdrop-blur-xl shadow-2xl ${
                            isHero
                              ? 'border-[#C8F135] ring-2 ring-[#C8F135]/40 shadow-[0_20px_60px_rgba(200,241,53,0.25)]'
                              : 'border-white/10 bg-black/85 hover:border-white/30'
                          }`}
                          style={{
                            transform: `translate3d(${translateX}px, 0px, ${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                            zIndex,
                            opacity,
                            transformStyle: 'preserve-3d'
                          }}
                        >
                          {/* Image preview */}
                          <div className="relative w-full h-[185px] overflow-hidden bg-zinc-950">
                            <img
                              src={char.image}
                              alt={char.name}
                              className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />

                            {/* Perspective Badge */}
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/80 border border-white/15 backdrop-blur-md">
                              <Film className="w-2.5 h-2.5 text-[#C8F135]" />
                              <span className="text-[8px] font-mono font-bold text-white/90">
                                0{index + 1} / 0{cardCount}
                              </span>
                            </div>

                            <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-[#C8F135]/20 border border-[#C8F135]/40 text-[#C8F135] text-[8px] font-black uppercase tracking-wider">
                              {char.isUserGen ? 'YOUR CREATION' : char.archetype}
                            </div>
                          </div>

                          {/* Details footer */}
                          <div className="p-3 bg-zinc-950/95 border-t border-white/10 flex items-center justify-between h-[55px]">
                            <div className="min-w-0 pr-2 flex-1">
                              <h4 className="text-xs font-black text-white tracking-wide truncate">
                                {char.name}
                              </h4>
                              <p className="text-[9px] text-white/50 truncate font-mono">
                                {char.role}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (char.image) {
                                    setGeneratedImage(char.image);
                                    if (char.prompt && setActivePrompt) setActivePrompt(char.prompt);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#C8F135] hover:bg-[#d8ff44] text-black text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-[0_0_12px_rgba(200,241,53,0.35)] cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Load on Stage</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pagination Dots & Navigation HUD */}
                <div className="w-full flex items-center justify-center gap-3 py-2 z-30">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 border border-white/10 backdrop-blur-xl">
                    {activeOrbitCards.map((c, i) => (
                      <button
                        key={c.id || i}
                        type="button"
                        onClick={() => setActiveCardIndex(i)}
                        className={`transition-all rounded-full cursor-pointer ${
                          activeCardIndex === i
                            ? 'w-6 h-1.5 bg-[#C8F135] shadow-[0_0_8px_#C8F135]'
                            : 'w-1.5 h-1.5 bg-white/25 hover:bg-white/60'
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>

                  {onOpenGallery && (
                    <button
                      type="button"
                      onClick={onOpenGallery}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/80 border border-[#C8F135]/40 hover:border-[#C8F135] text-[#C8F135] hover:bg-[#C8F135]/15 text-[8.5px] font-black uppercase tracking-wider backdrop-blur-xl transition-all cursor-pointer group shadow-md"
                    >
                      <History className="w-3 h-3 text-[#C8F135] group-hover:rotate-[-30deg] transition-transform" />
                      <span>All History ({gallery?.length || 0})</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2: CINEMATIC STUDIO LIGHTBOX WALL (Modern Asymmetrical Film Gallery) */}
            {stageView === 'wall' && (
              <div className="w-full h-full p-4 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center">
                <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-2 gap-3.5 my-auto">
                  {activeOrbitCards.slice(0, 4).map((char, index) => (
                    <div
                      key={char.id}
                      onClick={() => {
                        if (char.image) {
                          setGeneratedImage(char.image);
                          if (char.prompt && setActivePrompt) setActivePrompt(char.prompt);
                        }
                      }}
                      className="group relative bg-zinc-950/80 border border-white/10 hover:border-[#C8F135] rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.015] hover:shadow-[0_12px_40px_rgba(200,241,53,0.2)] cursor-pointer flex flex-col shadow-xl"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-black">
                        <img
                          src={char.image}
                          alt={char.name}
                          className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />

                        {/* Top tag */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/10 text-[8px] font-mono font-bold text-white/90">
                          <Film className="w-2.5 h-2.5 text-[#C8F135]" />
                          <span>0{index + 1}</span>
                        </div>

                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[#C8F135]/20 border border-[#C8F135]/40 text-[#C8F135] text-[8px] font-black uppercase tracking-wider">
                          {char.isUserGen ? 'YOUR CREATION' : char.archetype}
                        </div>

                        {/* Hover Overlay with instant load button */}
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <span className="px-3 py-1.5 rounded-lg bg-[#C8F135] text-black text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(200,241,53,0.4)]">
                            <Eye className="w-3 h-3" />
                            <span>Load into Studio</span>
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-zinc-950/90 border-t border-white/10 flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <h4 className="text-[11px] font-black text-white truncate">
                            {char.name}
                          </h4>
                          <p className="text-[8.5px] text-white/50 truncate font-mono">
                            {char.role}
                          </p>
                        </div>
                        <span className="text-[8px] font-mono text-[#C8F135] uppercase px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                          16:9
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 3: VIRTUAL SOUNDSTAGE SPOTLIGHT (Hero Focus + Filmstrip) */}
            {stageView === 'spotlight' && (
              <div className="w-full h-full flex flex-col items-center justify-between p-4">
                {/* Hero Showcase Display */}
                {activeOrbitCards[activeCardIndex] && (
                  <div className="relative w-full max-w-3xl flex-1 max-h-[340px] rounded-2xl overflow-hidden border-2 border-[#C8F135]/40 bg-black shadow-[0_20px_70px_rgba(200,241,53,0.18)] group flex items-center justify-center">
                    <img
                      src={activeOrbitCards[activeCardIndex].image}
                      alt={activeOrbitCards[activeCardIndex].name}
                      className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-102"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 pointer-events-none" />

                    {/* Film Slate Overlay */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/80 backdrop-blur-md border border-white/15 px-3 py-1 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-[#C8F135] shadow-[0_0_8px_#C8F135]" />
                      <span className="text-[9px] font-black uppercase tracking-wider text-white">
                        {activeOrbitCards[activeCardIndex].name}
                      </span>
                      <span className="text-[8px] font-mono text-white/40">
                        ({activeOrbitCards[activeCardIndex].role})
                      </span>
                    </div>

                    {/* Quick Stage Load Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const cur = activeOrbitCards[activeCardIndex];
                        if (cur?.image) {
                          setGeneratedImage(cur.image);
                          if (cur.prompt && setActivePrompt) setActivePrompt(cur.prompt);
                        }
                      }}
                      className="absolute bottom-3 right-3 px-3.5 py-1.5 rounded-xl bg-[#C8F135] hover:bg-[#d8ff44] text-black text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_20px_rgba(200,241,53,0.4)] transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Open in Studio Editor</span>
                    </button>
                  </div>
                )}

                {/* Horizontal Filmstrip Selector */}
                <div className="w-full max-w-3xl flex items-center justify-center gap-2 pt-3">
                  <div className="flex items-center gap-2 overflow-x-auto p-1 custom-scrollbar">
                    {activeOrbitCards.map((char, index) => {
                      const isSelected = activeCardIndex === index;
                      return (
                        <button
                          key={char.id || index}
                          type="button"
                          onClick={() => setActiveCardIndex(index)}
                          className={`relative w-24 h-14 rounded-lg overflow-hidden border transition-all cursor-pointer shrink-0 ${
                            isSelected
                              ? 'border-[#C8F135] ring-2 ring-[#C8F135]/50 scale-105 shadow-[0_0_15px_rgba(200,241,53,0.3)]'
                              : 'border-white/15 opacity-60 hover:opacity-100 hover:border-white/40'
                          }`}
                        >
                          <img
                            src={char.image}
                            alt={char.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          <span className="absolute bottom-0.5 left-1 text-[7.5px] font-bold text-white truncate max-w-[85px]">
                            {char.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Error Banner ────────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-4 mb-3 p-3 bg-red-950/40 border border-red-500/40 text-red-200 rounded-xl flex items-start gap-2.5 z-30 shadow-2xl">
          <div className="w-2 h-2 rounded-full bg-red-400 mt-1 shrink-0 animate-ping" />
          <div className="space-y-0.5 flex-1">
            <p className="text-[9px] font-black uppercase tracking-wider text-red-300">Notice</p>
            <p className="text-xs font-medium leading-relaxed opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* ── Collapsible Compiled Prompt Footer ───────────────────────────────── */}
      {!generating && activePrompt && (
        <div className="border-t border-white/10 bg-black/80 backdrop-blur-xl z-20">
          <button
            onClick={() => setPromptOpen(!promptOpen)}
            className="w-full flex items-center justify-between px-5 py-2.5 text-[9px] font-black uppercase tracking-wider text-white/60 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#C8F135]" />
              <span>Prompt Used</span>
            </div>
            {promptOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          
          {promptOpen && (
            <div className="px-5 pb-3 pt-0.5 space-y-2">
              <div className="relative bg-zinc-950/80 border border-white/10 rounded-xl p-3 flex justify-between items-start">
                <p className="text-white/70 font-mono text-[9px] leading-relaxed select-all pr-8 whitespace-pre-line">
                  {activePrompt}
                </p>
                <button
                  type="button"
                  onClick={copyPrompt}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all border border-white/5"
                  title="Copy Prompt"
                >
                  {copied ? <Check className="w-3 h-3 text-[#C8F135]" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modal 1: Full-Screen Master Canvas Inspection ─────────────────────── */}
      <AnimatePresence>
        {isExpanded && generatedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 lg:p-12 overflow-hidden"
          >
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-[#C8F135] text-white hover:text-black flex items-center justify-center transition-all z-50 border border-white/20 shadow-2xl"
              title="Close Fullscreen"
            >
              <Maximize2 className="w-4 h-4 rotate-180" />
            </button>

            <div className="relative max-w-7xl max-h-full flex items-center justify-center">
              <img
                src={resolveUrl(generatedImage)}
                alt="Full resolution generated character sheet"
                className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-2xl border border-white/20 shadow-[0_0_100px_rgba(200,241,53,0.15)]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal 2: Inpaint Brush Editor ────────────────────────────────────── */}
      {inpaintOpen && generatedImage && (
        <InpaintEditor
          isOpen={inpaintOpen}
          onClose={() => setInpaintOpen(false)}
          imageUrl={generatedImage}
          userId={userId}
          onSave={(newImgUrl) => {
            setGeneratedImage(newImgUrl);
            setInpaintOpen(false);
          }}
        />
      )}

      {/* CSS Keyframes for Scan Sweep */}
      <style>{`
        @keyframes scanSweep {
          0% { top: 0%; opacity: 0; }
          20% { opacity: 0.6; }
          80% { opacity: 0.6; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
