import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, RotateCw, Pause, Play, Compass, Eye, Maximize2,
  Wand2, Download, CheckCircle2, Loader2, Copy, Check, ChevronDown,
  ChevronUp, RefreshCw, Layers, ShieldCheck, Zap, Disc3
} from 'lucide-react';
import { InpaintEditor } from '../common/InpaintEditor';

// Real sample character matrices from public assets
const SHOWCASE_CHARACTERS = [
  {
    id: 'char-1',
    name: 'Aria Vance',
    role: 'Cyberpunk Operative',
    archetype: 'CHARACTER',
    image: '/assets/characters/matrix_d2447ac0_f19e_49a0_a916_70d3c45d50e8_1772822281076.png',
    age: '24',
    build: 'Athletic, tactical jacket',
    style: 'Ultra Realistic',
    palette: 'Neon Cyan & Obsidian'
  },
  {
    id: 'char-2',
    name: 'Marcus Chen',
    role: 'Neo-Tokyo Blade',
    archetype: 'POSE',
    image: '/assets/characters/matrix_68bcb7c4_377a_4070_b1fd_b2c5109ef002_1772824134632.png',
    age: '29',
    build: 'Muscular, high-collar coat',
    style: 'Realistic',
    palette: 'Amber Gold & Slate'
  },
  {
    id: 'char-3',
    name: 'Kaelen Void',
    role: 'Astral Sorcerer',
    archetype: 'CHARACTER',
    image: '/assets/characters/matrix_9318e159_b219_4b8c_9232_2c8aae50eb43_1772823409328.png',
    age: '27',
    build: 'Tall, ceremonial armor',
    style: 'Realistic',
    palette: 'Ether Violet & Chrome'
  },
  {
    id: 'char-4',
    name: 'Zara Lin',
    role: 'Tech Noir Detective',
    archetype: 'SHOT',
    image: '/assets/characters/matrix_f1c097c6_e6ae_488a_8eed_f0d6b1a7af3c_1772823961835.png',
    age: '26',
    build: 'Slim, trench coat',
    style: 'Realistic',
    palette: 'Cobalt & Rain Sheen'
  },
  {
    id: 'char-5',
    name: 'Atlas Mech',
    role: 'Cybernetic Vanguard',
    archetype: 'OBJECT',
    image: '/assets/characters/matrix_f30674dd_ae81_4392_b86d_c4680120ff6e_1772824707293.png',
    age: '32',
    build: 'Titanium-plated exoskeleton',
    style: '3D Octane',
    palette: 'Matte Carbon & Crimson'
  },
  {
    id: 'char-6',
    name: 'Seraphina',
    role: 'Celestial Scout',
    archetype: 'CREATURE',
    image: '/assets/characters/matrix_fc600e4a_e967_4112_a135_376989e74fc4_1772825897222.png',
    age: '22',
    build: 'Fluid kinetic bodysuit',
    style: 'Ultra Realistic',
    palette: 'Prismatic Silver'
  }
];

const LOADING_STATUSES = [
  'Initializing Vertex AI Neural Character Core (2K Resolution)...',
  'Locking facial identity proportions & multi-angle keypoints...',
  'Synthesizing 4-panel turnaround poses & outfit breakdown...',
  'Rendering dynamic cinematic lighting & volumetric subsurface scattering...',
  'Compiling master reference matrix to Cloudflare R2 canvas...'
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
  type = 'board',
  setGeneratedImage,
  onApplyPreset,
  activeModel = 'banana',
  aspectRatio = '16:9'
}) {
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(0.4); // degrees per frame
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inpaintOpen, setInpaintOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [viewMode, setViewMode] = useState('turntable'); // 'turntable' | 'flat'

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
    }, 3200);
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
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 16;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -16;
    setTilt({ x, y });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const cardRadius = 380; // Distance of cards from center in 3D space
  const cardCount = SHOWCASE_CHARACTERS.length;

  return (
    <div className="flex-1 flex flex-col bg-[#07090D] border border-white/10 rounded-3xl overflow-hidden relative min-h-[580px] shadow-[0_20px_80px_rgba(0,0,0,0.8)] select-none">
      
      {/* ── Hologram HUD Top Header ─────────────────────────────────────────── */}
      <div className="border-b border-white/10 px-6 py-3.5 flex items-center justify-between bg-black/60 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-[#C8F135]/10 border border-[#C8F135]/30">
            <Disc3 className={`w-4 h-4 text-[#C8F135] ${isAutoRotating && !generating ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#C8F135] animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black tracking-[0.2em] uppercase text-white">
                Hologram Turntable
              </span>
              <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-[#C8F135]/15 border border-[#C8F135]/30 text-[#C8F135]">
                3D 360° Stage
              </span>
            </div>
            <p className="text-[9px] text-white/40 font-mono tracking-tight">
              IDENTITY LOCK: <span className="text-[#C8F135]">ACTIVE</span> • ORBIT: {Math.round(rotationAngle % 360)}° • ENGINE: {activeModel === 'banana' ? 'VERTEX 2K' : 'GPT 2'}
            </p>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-2">
          {/* Turntable Speed Controls */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 gap-1">
            <button
              onClick={() => setIsAutoRotating(!isAutoRotating)}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1.5 transition-all ${
                isAutoRotating
                  ? 'bg-[#C8F135] text-black shadow-[0_0_12px_rgba(200,241,53,0.3)]'
                  : 'bg-white/5 text-white/60 hover:text-white'
              }`}
              title={isAutoRotating ? 'Pause Turntable' : 'Play 3D Orbit'}
            >
              {isAutoRotating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isAutoRotating ? 'Orbiting' : 'Paused'}</span>
            </button>

            <button
              onClick={() => setRotationSpeed(rotationSpeed === 0.4 ? 1.2 : 0.4)}
              className={`px-2 py-1 rounded-lg text-[8px] font-black tracking-wider uppercase transition-all ${
                rotationSpeed > 0.5
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-white/40 hover:text-white/80'
              }`}
              title="Toggle Orbital Speed"
            >
              {rotationSpeed > 0.5 ? '⚡ 2.5x Spin' : '1x Speed'}
            </button>
          </div>

          {generatedImage && (
            <button
              onClick={() => setGeneratedImage('')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 text-[9px] font-black uppercase tracking-wider text-white/70 hover:text-white transition-all"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Stage</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Main Viewport Area ──────────────────────────────────────────────── */}
      <div 
        className="flex-1 flex flex-col items-center justify-center relative overflow-hidden p-6 perspective-[1400px]"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Animated Cybernetic Ambient Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Subtle Cyber Grid */}
          <div 
            className="absolute inset-0 opacity-[0.04]" 
            style={{
              backgroundImage: 'linear-gradient(to right, #C8F135 1px, transparent 1px), linear-gradient(to bottom, #C8F135 1px, transparent 1px)',
              backgroundSize: '48px 48px'
            }}
          />
          {/* Central Radial Energy Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#C8F135]/5 via-cyan-500/5 to-purple-500/5 rounded-full blur-[140px]" />
          
          {/* Futuristic Crosshairs in corners */}
          <div className="absolute top-6 left-6 w-5 h-5 border-t-2 border-l-2 border-[#C8F135]/30 pointer-events-none" />
          <div className="absolute top-6 right-6 w-5 h-5 border-t-2 border-r-2 border-[#C8F135]/30 pointer-events-none" />
          <div className="absolute bottom-6 left-6 w-5 h-5 border-b-2 border-l-2 border-[#C8F135]/30 pointer-events-none" />
          <div className="absolute bottom-6 right-6 w-5 h-5 border-b-2 border-r-2 border-[#C8F135]/30 pointer-events-none" />
        </div>

        {/* ── STATE 1: ACTIVE GENERATION IN PROGRESS ─────────────────────────── */}
        {generating && (
          <div className="z-30 flex flex-col items-center justify-center space-y-6 max-w-md text-center p-8 bg-black/60 border border-[#C8F135]/30 rounded-3xl backdrop-blur-2xl shadow-[0_0_60px_rgba(200,241,53,0.15)] animate-pulse">
            
            {/* Spinning Holographic Quantum Core */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              {/* Outer Counter-rotating ring */}
              <div 
                className="absolute inset-0 rounded-full border-2 border-dashed border-[#C8F135]/40 animate-spin"
                style={{ animationDuration: '4s' }}
              />
              {/* Middle fast ring */}
              <div 
                className="absolute inset-2 rounded-full border-2 border-t-transparent border-b-transparent border-[#C8F135] animate-spin"
                style={{ animationDuration: '1.2s', animationDirection: 'reverse' }}
              />
              {/* Inner glowing pulse */}
              <div className="w-12 h-12 rounded-full bg-[#C8F135]/20 border border-[#C8F135] flex items-center justify-center shadow-[0_0_30px_#C8F135]">
                <Zap className="w-6 h-6 text-[#C8F135] animate-bounce" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C8F135]/15 border border-[#C8F135]/40 text-[#C8F135] text-[10px] font-black uppercase tracking-[0.25em]">
                <Sparkles className="w-3 h-3 animate-spin" />
                <span>Quantum Synthesis in Progress</span>
              </div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                Synthesizing Master Character Sheet
              </h4>
              <p className="text-xs text-white/50 font-mono leading-relaxed h-10 flex items-center justify-center">
                {LOADING_STATUSES[statusIndex]}
              </p>
            </div>

            {/* Live Progress HUD Meters */}
            <div className="w-full space-y-2 pt-2 border-t border-white/10">
              <div className="flex justify-between text-[9px] font-mono uppercase text-white/40">
                <span>Vertex Pipeline</span>
                <span className="text-[#C8F135]">2048 x 2048 ULTRA-HD</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
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
          <div className="z-20 w-full max-w-4xl flex flex-col items-center gap-4">
            
            {/* Holographic Frame with Mouse 3D Tilt */}
            <div 
              className="relative w-full max-h-[52vh] rounded-3xl overflow-hidden border-2 border-[#C8F135]/40 shadow-[0_20px_70px_rgba(200,241,53,0.15)] bg-black/90 group flex items-center justify-center transition-transform duration-200 ease-out"
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
                src={generatedImage}
                alt="Synthesized Avatar Studio Character Sheet"
                className="max-w-full max-h-[52vh] w-auto h-auto object-contain object-center transition-transform duration-700 group-hover:scale-[1.02]"
              />

              {/* Holographic Tag overlay */}
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-[#C8F135] shadow-[0_0_8px_#C8F135]" />
                <span className="text-[9px] font-black uppercase tracking-wider text-white">
                  Vertex Master Character Sheet • 2K
                </span>
              </div>

              {/* Fullscreen Button */}
              <button
                onClick={() => setIsExpanded(true)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/80 hover:bg-[#C8F135] text-white hover:text-black hover:scale-110 active:scale-95 transition-all flex items-center justify-center border border-white/20 shadow-xl"
                title="Expand View"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Toolbar */}
            <div className="w-full max-w-2xl flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/10 bg-black/60 hover:bg-white/10 text-white text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#C8F135]" />
                <span>Expand 2K</span>
              </button>

              <button
                type="button"
                onClick={() => setInpaintOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-purple-500/30 bg-purple-950/20 hover:bg-purple-900/40 text-purple-200 text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg"
              >
                <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Brush Inpaint</span>
              </button>

              <button
                type="button"
                onClick={saveToGallery}
                disabled={saving || savedOk}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border transition-all text-xs font-black uppercase tracking-wider active:scale-95 shadow-lg ${
                  savedOk
                    ? 'border-[#C8F135] bg-[#C8F135]/20 text-[#C8F135]'
                    : 'border-[#C8F135]/40 bg-[#C8F135]/10 hover:bg-[#C8F135]/20 text-[#C8F135]'
                }`}
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : savedOk ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C8F135]" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-[#C8F135]" />
                )}
                <span>{savedOk ? 'Saved!' : 'Save Asset'}</span>
              </button>

              <button
                type="button"
                onClick={downloadImage}
                className="flex items-center justify-center p-3 rounded-xl border border-white/10 bg-black/60 hover:bg-white/10 text-white hover:text-[#C8F135] transition-all active:scale-95 shadow-lg"
                title="Download 2K PNG"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STATE 3: 3D REVOLVING CHARACTER STAGE (STANDBY MODE) ─────────── */}
        {!generating && !generatedImage && (
          <div className="relative w-full h-[480px] flex items-center justify-center">
            
            {/* 3D Revolving Turntable Cylinder */}
            <div 
              className="relative w-full h-full flex items-center justify-center"
              style={{
                transformStyle: 'preserve-3d',
                transform: 'rotateX(-8deg)'
              }}
            >
              {/* Central Glowing Cybernetic Hologram Pedestal Base */}
              <div 
                className="absolute bottom-6 w-[420px] h-[160px] rounded-[100%] border-2 border-[#C8F135]/30 pointer-events-none flex items-center justify-center shadow-[0_0_80px_rgba(200,241,53,0.15)]"
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
                  // Calculate if this card is currently in front (closest to 0 deg relative to viewer)
                  const relativeAngle = (cardAngle + rotationAngle) % 360;
                  const normalizedAngle = relativeAngle < 0 ? relativeAngle + 360 : relativeAngle;
                  const isFront = normalizedAngle > 330 || normalizedAngle < 30;

                  return (
                    <div
                      key={char.id}
                      onClick={() => snapToCard(index)}
                      className={`absolute w-[240px] h-[330px] rounded-2xl cursor-pointer transition-all duration-300 group overflow-hidden border backdrop-blur-md shadow-2xl ${
                        isFront
                          ? 'border-[#C8F135] ring-2 ring-[#C8F135]/50 shadow-[0_10px_40px_rgba(200,241,53,0.3)] z-30'
                          : 'border-white/10 bg-black/80 hover:border-white/30 opacity-75 hover:opacity-100'
                      }`}
                      style={{
                        transform: `rotateY(${cardAngle}deg) translateZ(${cardRadius}px)`,
                        transformStyle: 'preserve-3d',
                        backfaceVisibility: 'hidden'
                      }}
                    >
                      {/* Character Sheet Matrix Image */}
                      <div className="relative w-full h-[220px] overflow-hidden bg-black">
                        <img
                          src={char.image}
                          alt={char.name}
                          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
                        
                        {/* Live Angle Tag */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/75 border border-white/15 backdrop-blur-md">
                          <Compass className="w-2.5 h-2.5 text-[#C8F135]" />
                          <span className="text-[8px] font-mono font-bold text-white/90">
                            {Math.round(cardAngle)}°
                          </span>
                        </div>

                        {/* Preset Archetype Badge */}
                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-[#C8F135]/20 border border-[#C8F135]/40 text-[#C8F135] text-[8px] font-black uppercase">
                          {char.archetype}
                        </div>
                      </div>

                      {/* Character Details Footer */}
                      <div className="p-3 bg-zinc-950/90 border-t border-white/10 flex flex-col justify-between h-[110px]">
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-white tracking-wide truncate">
                              {char.name}
                            </h4>
                            <span className="text-[8px] font-mono text-[#C8F135]">
                              Age {char.age}
                            </span>
                          </div>
                          <p className="text-[9px] text-white/50 font-medium truncate mt-0.5">
                            {char.role}
                          </p>
                        </div>

                        {/* Quick Action Button on card */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onApplyPreset) {
                              onApplyPreset({
                                name: char.name,
                                age: char.age,
                                outfit: char.build,
                                style: char.style,
                                additionalContext: `${char.role}, ${char.palette}, cinematic lighting, masterpiece 2K character sheet`
                              });
                            }
                          }}
                          className="w-full py-1.5 rounded-lg bg-white/5 hover:bg-[#C8F135] text-white/80 hover:text-black border border-white/10 hover:border-[#C8F135] text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Load Preset</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Floating Turntable Quick-Angle Bar at Bottom */}
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
        <div className="mx-6 mb-4 p-4 bg-red-950/40 border border-red-500/40 text-red-200 rounded-2xl flex items-start gap-3 z-30 shadow-2xl">
          <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0 animate-ping" />
          <div className="space-y-0.5 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-red-300">Synthesis Interrupted</p>
            <p className="text-xs font-medium leading-relaxed opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* ── Collapsible Compiled Prompt Footer ───────────────────────────────── */}
      {!generating && activePrompt && (
        <div className="border-t border-white/10 bg-black/80 backdrop-blur-xl z-20">
          <button
            onClick={() => setPromptOpen(!promptOpen)}
            className="w-full flex items-center justify-between px-6 py-3 text-[10px] font-black uppercase tracking-wider text-white/60 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#C8F135]" />
              <span>Compiled Prompt Matrix</span>
            </div>
            {promptOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {promptOpen && (
            <div className="px-6 pb-4 pt-1 space-y-2">
              <div className="relative bg-zinc-950/80 border border-white/10 rounded-2xl p-4 flex justify-between items-start">
                <p className="text-white/70 font-mono text-[10px] leading-relaxed select-all pr-8 whitespace-pre-line">
                  {activePrompt}
                </p>
                <button
                  type="button"
                  onClick={copyPrompt}
                  className="absolute top-3 right-3 p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all border border-white/5"
                  title="Copy Prompt"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#C8F135]" /> : <Copy className="w-3.5 h-3.5" />}
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
              className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-[#C8F135] text-white hover:text-black flex items-center justify-center transition-all z-50 border border-white/20 shadow-2xl"
              title="Close Fullscreen"
            >
              <Maximize2 className="w-5 h-5 rotate-180" />
            </button>

            <div className="relative max-w-7xl max-h-full flex items-center justify-center">
              <img
                src={generatedImage}
                alt="Full resolution generated character board"
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
