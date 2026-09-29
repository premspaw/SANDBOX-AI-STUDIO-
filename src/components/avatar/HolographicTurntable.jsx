import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, RotateCw, Pause, Play, Compass, Eye, Maximize2,
  Wand2, Download, CheckCircle2, Loader2, Copy, Check, ChevronDown,
  ChevronUp, RefreshCw, ShieldCheck, Zap
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
  onApplyPreset,
  userId = 'anon'
}) {
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(0.35); // degrees per frame
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inpaintOpen, setInpaintOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);

  // Tilt state for generated image
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const animFrameRef = useRef(null);

  // Auto-rotation engine
  useEffect(() => {
    let lastTime = performance.now();
    const loop = (currentTime) => {
      const delta = (currentTime - lastTime) / 16.666;
      lastTime = currentTime;
      if (isAutoRotating && !generating) {
        setRotationAngle((prev) => (prev + rotationSpeed * delta) % 360);
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isAutoRotating, rotationSpeed, generating]);

  // Loading text cycler
  useEffect(() => {
    if (!generating) return;
    setStatusIndex(0);
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % LOADING_STATUSES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [generating]);

  const snapToCard = (index) => {
    setActiveCardIndex(index);
    const cardAngle = (index * (360 / SHOWCASE_CHARACTERS.length));
    setRotationAngle(360 - cardAngle);
  };

  const snapToAngle = (deg) => {
    setRotationAngle(deg);
  };

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

  const cardRadius = 340; // Distance of cards from center in 3D space
  const cardCount = SHOWCASE_CHARACTERS.length;

  return (
    <div className="flex-1 flex flex-col bg-[#07090D] border border-white/10 rounded-2xl overflow-hidden relative min-h-[520px] shadow-[0_20px_80px_rgba(0,0,0,0.8)] select-none">
      
      {/* ── Main Viewport Area (Zero bulky top headers, tight padding) ─────────── */}
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
          
          {/* Subtle Corner Brackets */}
          <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-white/10 pointer-events-none" />
          <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-white/10 pointer-events-none" />
          <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-white/10 pointer-events-none" />
          <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-white/10 pointer-events-none" />
        </div>

        {/* ── Floating Controls at Top Right ──────────────────────────────────── */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
          {generatedImage && (
            <button
              onClick={() => setGeneratedImage('')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/10 hover:border-white/20 bg-black/60 hover:bg-white/10 text-[9px] font-bold uppercase tracking-wider text-white/70 hover:text-white transition-all shadow-md"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Show Samples</span>
            </button>
          )}

          <div className="flex items-center bg-black/60 border border-white/10 rounded-lg p-0.5 gap-0.5 shadow-md">
            <button
              onClick={() => setIsAutoRotating(!isAutoRotating)}
              className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase flex items-center gap-1 transition-all ${
                isAutoRotating
                  ? 'bg-[#C8F135] text-black shadow-[0_0_10px_rgba(200,241,53,0.3)]'
                  : 'bg-white/5 text-white/60 hover:text-white'
              }`}
              title={isAutoRotating ? 'Pause Turntable' : 'Play Rotation'}
            >
              {isAutoRotating ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
              <span>{isAutoRotating ? 'Orbit' : 'Paused'}</span>
            </button>

            <button
              onClick={() => setRotationSpeed(rotationSpeed === 0.35 ? 0.9 : 0.35)}
              className={`px-1.5 py-1 rounded-md text-[8px] font-bold uppercase transition-all ${
                rotationSpeed > 0.5
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-white/40 hover:text-white/80'
              }`}
              title="Toggle Speed"
            >
              {rotationSpeed > 0.5 ? '2x' : '1x'}
            </button>
          </div>
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
                <span>Generating Character Sheet</span>
              </div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                Synthesizing 3-Panel Turnaround
              </h4>
              <p className="text-xs text-white/50 font-mono leading-relaxed h-8 flex items-center justify-center">
                {LOADING_STATUSES[statusIndex]}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full space-y-1.5 pt-2 border-t border-white/10">
              <div className="flex justify-between text-[8px] font-mono uppercase text-white/40">
                <span>Progress</span>
                <span className="text-[#C8F135]">Close-up • Front • Back</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-400 via-[#C8F135] to-emerald-400 rounded-full animate-pulse"
                  style={{ width: `${((statusIndex + 1) / LOADING_STATUSES.length) * 100}%`, transition: 'width 0.8s ease' }}
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
                alt="Synthesized Character Sheet"
                className="max-w-full max-h-[58vh] w-auto h-auto object-contain object-center transition-transform duration-700 group-hover:scale-[1.01]"
              />

              {/* Tag overlay */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/80 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C8F135] shadow-[0_0_8px_#C8F135]" />
                <span className="text-[8px] font-black uppercase tracking-wider text-white">
                  3-Panel Character Sheet
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
            <div className="w-full max-w-xl flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-white/10 bg-black/60 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg"
              >
                <Maximize2 className="w-3 h-3 text-[#C8F135]" />
                <span>Full View</span>
              </button>

              <button
                type="button"
                onClick={() => setInpaintOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-purple-500/30 bg-purple-950/20 hover:bg-purple-900/40 text-purple-200 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg"
              >
                <Wand2 className="w-3 h-3 text-purple-400" />
                <span>Brush Inpaint</span>
              </button>

              <button
                type="button"
                onClick={saveToGallery}
                disabled={saving || savedOk}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border transition-all text-[10px] font-black uppercase tracking-wider active:scale-95 shadow-lg ${
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
                <span>{savedOk ? 'Saved!' : 'Save Sheet'}</span>
              </button>

              <button
                type="button"
                onClick={downloadImage}
                className="flex items-center justify-center p-2.5 rounded-xl border border-white/10 bg-black/60 hover:bg-white/10 text-white hover:text-[#C8F135] transition-all active:scale-95 shadow-lg"
                title="Download Sheet PNG"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── STATE 3: 3D REVOLVING CHARACTER STAGE (STANDBY MODE) ─────────── */}
        {!generating && !generatedImage && (
          <div className="relative w-full h-[470px] flex items-center justify-center">
            
            {/* 3D Revolving Turntable Cylinder */}
            <div 
              className="relative w-full h-full flex items-center justify-center"
              style={{
                transformStyle: 'preserve-3d',
                transform: 'rotateX(-6deg)'
              }}
            >
              {/* Central Glowing Cybernetic Hologram Pedestal Base */}
              <div 
                className="absolute bottom-4 w-[420px] h-[150px] rounded-[100%] border-2 border-[#C8F135]/30 pointer-events-none flex items-center justify-center shadow-[0_0_80px_rgba(200,241,53,0.15)]"
                style={{
                  transform: 'rotateX(75deg) translateZ(-60px)',
                  background: 'radial-gradient(circle, rgba(200,241,53,0.15) 0%, rgba(6,182,212,0.05) 50%, transparent 80%)'
                }}
              >
                {/* Concentric rotating radar rings */}
                <div 
                  className="w-[320px] h-[320px] rounded-full border border-dashed border-[#C8F135]/50 animate-spin"
                  style={{ animationDuration: '24s' }}
                />
                <div 
                  className="absolute w-[220px] h-[220px] rounded-full border border-dotted border-cyan-400/40 animate-spin"
                  style={{ animationDuration: '14s', animationDirection: 'reverse' }}
                />
                <div className="absolute w-24 h-24 rounded-full bg-[#C8F135]/20 blur-md" />
              </div>

              {/* 3D Orbiting Cards Container */}
              <div 
                className="relative w-0 h-0 flex items-center justify-center transition-transform duration-100 ease-out"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `rotateY(${rotationAngle}deg)`
                }}
              >
                {SHOWCASE_CHARACTERS.map((char, index) => {
                  const cardAngle = index * (360 / cardCount);
                  // Calculate if this card is currently in front
                  const relativeAngle = (cardAngle + rotationAngle) % 360;
                  const normalizedAngle = relativeAngle < 0 ? relativeAngle + 360 : relativeAngle;
                  const isFront = normalizedAngle > 315 || normalizedAngle < 45;

                  return (
                    <div
                      key={char.id}
                      onClick={() => snapToCard(index)}
                      className={`absolute w-[360px] md:w-[380px] h-[220px] rounded-xl cursor-pointer transition-all duration-300 group overflow-hidden border backdrop-blur-md shadow-2xl ${
                        isFront
                          ? 'border-[#C8F135] ring-2 ring-[#C8F135]/50 shadow-[0_10px_40px_rgba(200,241,53,0.3)] z-30'
                          : 'border-white/10 bg-black/85 hover:border-white/30 opacity-75 hover:opacity-100'
                      }`}
                      style={{
                        transform: `rotateY(${cardAngle}deg) translateZ(${cardRadius}px)`,
                        transformStyle: 'preserve-3d',
                        backfaceVisibility: 'hidden'
                      }}
                    >
                      {/* Character Sheet 3-Panel Image */}
                      <div className="relative w-full h-[170px] overflow-hidden bg-zinc-950">
                        <img
                          src={char.image}
                          alt={char.name}
                          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />
                        
                        {/* Live Angle Tag */}
                        <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/75 border border-white/15 backdrop-blur-md">
                          <Compass className="w-2.5 h-2.5 text-[#C8F135]" />
                          <span className="text-[8px] font-mono font-bold text-white/90">
                            {Math.round(cardAngle)}°
                          </span>
                        </div>

                        {/* Preset Archetype Badge */}
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[#C8F135]/20 border border-[#C8F135]/40 text-[#C8F135] text-[8px] font-black uppercase tracking-wider">
                          {char.archetype}
                        </div>
                      </div>

                      {/* Character Details Footer Strip */}
                      <div className="p-2.5 bg-zinc-950/95 border-t border-white/10 flex items-center justify-between h-[50px]">
                        <div className="min-w-0 pr-2">
                          <h4 className="text-xs font-black text-white tracking-wide truncate">
                            {char.name}
                          </h4>
                          <p className="text-[9px] text-white/50 truncate">
                            {char.role}
                          </p>
                        </div>

                        {/* Format Indicator */}
                        <span className="shrink-0 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[8px] font-mono uppercase text-[#C8F135]">
                          STUDIO SHEET
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Below Angle HUD Bar (Kept as requested by user) ────────────────── */}
            <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-2 z-20 pointer-events-auto">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 border border-white/10 backdrop-blur-xl shadow-2xl">
                <span className="text-[8px] font-mono uppercase text-white/40 mr-1 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-[#C8F135]" /> Angle:
                </span>
                {[
                  { label: '0° Front', deg: 0 },
                  { label: '60° 3/4 R', deg: 300 },
                  { label: '120° Profile', deg: 240 },
                  { label: '180° Rear', deg: 180 },
                  { label: '240° Left', deg: 120 },
                  { label: '300° 3/4 L', deg: 60 }
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => snapToAngle(item.deg)}
                    className="px-2 py-0.5 rounded-md text-[8px] font-mono uppercase transition-all bg-white/5 hover:bg-[#C8F135]/20 hover:text-[#C8F135] text-white/70"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
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
