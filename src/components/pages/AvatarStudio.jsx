import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { useAvatarStudio } from '../../hooks/useAvatarStudio';
import { resolveUrl } from '../../config/apiConfig';
import {
  History, Sparkles, UploadCloud, Trash2, Camera, Film,
  ShieldAlert, ChevronRight, ChevronDown, User, MapPin, Box, Bone, PersonStanding,
  Layers, CheckCircle2, Sliders, HelpCircle, ArrowRight, Sparkle,
  SlidersHorizontal, FileText, UserCheck, Zap, Disc3, Eye, Compass, Wand2, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import HolographicTurntable from '../avatar/HolographicTurntable';
import AvatarGallery from '../avatar/AvatarGallery';

const BOARDS = [
  {
    id: 'CHARACTER',
    label: 'Character Board',
    tagline: 'Multi-angle turnarounds, expressions & wardrobe',
    icon: User,
    color: '#C8F135'
  },
  {
    id: 'POSE',
    label: 'Pose Board',
    tagline: 'Dynamic action poses & animation angles',
    icon: PersonStanding,
    color: '#06B6D4'
  },
  {
    id: 'SHOT',
    label: 'Shot Board',
    tagline: 'Full 12-shot cinematic sequence breakdown',
    icon: Film,
    color: '#A855F7'
  },
  {
    id: 'LOCATION',
    label: 'Location Biome',
    tagline: 'Atmospheric environments, lighting & weather moods',
    icon: MapPin,
    color: '#10B981'
  },
  {
    id: 'OBJECT',
    label: 'Object / Prop',
    tagline: 'Product ergonomics, macros & industrial design',
    icon: Box,
    color: '#F59E0B'
  },
  {
    id: 'CREATURE',
    label: 'Creature Morph',
    tagline: 'Anatomy, scale, behavior & mythical beasts',
    icon: Bone,
    color: '#EC4899'
  }
];

const STYLE_PRESETS = [
  {
    label: 'Cyberpunk Neon',
    icon: '⚡',
    style: 'Ultra Realistic',
    outfit: 'Techwear tactical harness, holographic visor, glowing fiber-optic jacket',
    palette: 'Neon cyan, electric magenta, rain-slicked asphalt'
  },
  {
    label: 'Cinematic Noir',
    icon: '🎬',
    style: 'Realistic',
    outfit: 'Tailored trench coat, fedora silhouette, charcoal leather gloves',
    palette: 'Chiaroscuro shadows, amber streetlamps, smoky blue'
  },
  {
    label: 'Anime Ghibli',
    icon: '🌸',
    style: 'Anime',
    outfit: 'Handcrafted linen vest, vintage aviator goggles, brass compass',
    palette: 'Lush watercolor green, cerulean sky, warm terracotta'
  },
  {
    label: 'Dark Fantasy',
    icon: '⚔️',
    style: 'Realistic',
    outfit: 'Ornate engraved plate armor, runic fur cloak, raven feathers',
    palette: 'Deep obsidian, crimson ember, tarnished gold'
  },
  {
    label: 'Hyper-Real Fashion',
    icon: '💎',
    style: 'Ultra Realistic',
    outfit: 'Avant-garde metallic silk gown, sculptural chrome jewelry',
    palette: 'Studio editorial lighting, champagne titanium, cream'
  },
  {
    label: 'Sci-Fi Mecha',
    icon: '🛸',
    style: '3D',
    outfit: 'Carbon-fiber exoskeleton, pressurized pilot bodysuit',
    palette: 'Matte white armor, hazard yellow accents, HUD glow'
  }
];

// Dynamic input fields per board type
const BOARD_FIELDS = {
  CHARACTER: [
    { 
      key: 'name', label: 'Character Name', placeholder: 'e.g. Aria Vance, Marcus Chen, Zara…', required: true,
      suggestions: ['Aria Vance', 'Marcus Chen', 'Kaelen Void', 'Zara Lin', 'Soren Drake']
    },
    { 
      key: 'age', label: 'Age', placeholder: 'e.g. 24', required: true,
      suggestions: ['19', '24', '28', '35', '50']
    },
    { 
      key: 'gender', label: 'Gender', placeholder: 'e.g. Female, Male, Non-binary…',
      suggestions: ['Female', 'Male', 'Non-binary', 'Android']
    },
    { 
      key: 'build', label: 'Body Build', placeholder: 'e.g. Athletic, Slim model, Cybernetic…',
      suggestions: ['Athletic', 'Slim Model', 'Muscular', 'Cybernetic Augmented', 'Petite']
    },
    { 
      key: 'outfit', label: 'Outfit & Wardrobe', placeholder: 'e.g. Cyberpunk techwear jacket, high collar…',
      suggestions: ['Tactical Techwear', 'Leather Trench Coat', 'Minimalist Suit', 'Heavy Armor']
    },
    { 
      key: 'hair', label: 'Hair Styling', placeholder: 'e.g. Asymmetrical neon blue bob, undercut…',
      suggestions: ['Neon Cyber Undercut', 'Flowing Silver Waves', 'Messy Dark Bob', 'Braided Topknot']
    },
    { 
      key: 'personality', label: 'Vibe / Expression', placeholder: 'e.g. Stoic, piercing gaze, confident smirk…',
      suggestions: ['Stoic & Lethal', 'Confident Smirk', 'Enigmatic & Calm', 'Fierce & Defiant']
    },
    { 
      key: 'style', label: 'Render Aesthetics', placeholder: 'Select Render Style...', type: 'dropdown', 
      options: ['Ultra Realistic', 'Realistic', '3D', 'Anime'] 
    },
  ],
  POSE: [
    { key: 'name', label: 'Character Name', placeholder: 'e.g. Aria…', required: true, suggestions: ['Aria', 'Kael', 'Ren'] },
    { key: 'action', label: 'Action Pose Sequence', placeholder: 'e.g. Mid-air sword slash, wall-run slide, drawing bow…', required: true, suggestions: ['Mid-air Combat Leap', 'Defensive Guard Stance', 'Drawing Twin Daggers', 'Full Sprint Slide'] },
    { key: 'emotion', label: 'Facial Intensity', placeholder: 'e.g. Determined battle cry, focused stoic…', suggestions: ['Fierce Determination', 'Cold Analytical Focus', 'Victorious Smirk'] },
  ],
  SHOT: [
    { key: 'name', label: 'Scene Title', placeholder: 'e.g. Act 1 Rooftop Extraction…', required: true, suggestions: ['Rooftop Extraction', 'Neon Alley Ambush', 'Orbital Bridge Duel'] },
    { key: 'genre', label: 'Cinematic Genre', placeholder: 'e.g. Cyberpunk neo-noir thriller…', suggestions: ['Cyberpunk Neo-Noir', 'Space Opera', 'Dark Fantasy Epic'] },
    { key: 'cinematographyStyle', label: 'Director / Camera Style', placeholder: 'e.g. Roger Deakins, Blade Runner 2049, Anamorphic lens…', suggestions: ['Roger Deakins 35mm', 'Blade Runner 2049 Anamorphic', 'Denis Villeneuve Ultra-Wide'] },
  ],
  LOCATION: [
    { key: 'name', label: 'Biome / Location Name', placeholder: 'e.g. Neo-Shinjuku Underground Market…', required: true, suggestions: ['Neo-Shinjuku Sub-Level 4', 'Orbital Skyport Deck', 'Ancient Sunken Temple'] },
    { key: 'setting', label: 'Environment Type', placeholder: 'e.g. High-tech urban, overgrown ruin…', suggestions: ['Cyberpunk Megacity', 'Bioluminescent Jungle', 'Deep Space Foundry'] },
    { key: 'timeOfDay', label: 'Atmosphere & Time', placeholder: 'e.g. Rain-slicked twilight, solar flare noon…', suggestions: ['Rainy Midnight', 'Golden Hour Dusks', 'Blue Hour Dawn'] },
  ],
  OBJECT: [
    { key: 'name', label: 'Object / Weapon Name', placeholder: 'e.g. Pulse-Arc Katana, Quantum Chrono-Deck…', required: true, suggestions: ['Pulse-Arc Katana', 'Chrono-Drive Core', 'Tactical HUD Helmet'] },
    { key: 'material', label: 'Materials & Finish', placeholder: 'e.g. Damascus titanium, forged carbon fiber…', suggestions: ['Forged Carbon & Brass', 'Brushed Aerospace Titanium', 'Obsidian Crystal'] },
    { key: 'brandStyle', label: 'Design Language', placeholder: 'e.g. Minimalist Scandinavian luxury, Brutalist industrial…', suggestions: ['Cyberpunk Industrial', 'Minimalist Luxury', 'Military Spec-Ops'] },
  ],
  CREATURE: [
    { key: 'name', label: 'Entity / Creature Name', placeholder: 'e.g. Abyssal Leviathan, Cyber-Wyrm…', required: true, suggestions: ['Abyssal Chimera', 'Neon-Spined Drake', 'Celestial Stalker'] },
    { key: 'type', label: 'Taxonomy Class', placeholder: 'e.g. Reptilian apex predator, bio-synthetic…', suggestions: ['Apex Bio-Synthetic', 'Reptilian Draconic', 'Spectral Elemental'] },
    { key: 'biome', label: 'Native Habitat', placeholder: 'e.g. Volcanic subterranean fissures…', suggestions: ['Deep Abyssal Trench', 'Toxic Neon Slums', 'Astral Nebula Void'] },
  ],
};

export default function AvatarStudio() {
  const userProfile = useAppStore(state => state.userProfile);
  const userShorts = useAppStore(state => state.userShorts);
  const userCredits = userShorts ?? 0;
  const userId = userProfile?.id || 'anon';

  // Instantiate master hook
  const studio = useAvatarStudio(userId);

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'details' | 'reference'

  // Restore past generation from gallery
  const handleLoadGeneration = (item) => {
    studio.setGeneratedImage(item.output_url);
    studio.setActivePrompt(item.prompt);
    
    if (item.metadata) {
      if (item.metadata.boardType) studio.setActiveBoard(item.metadata.boardType);
      if (item.metadata.additionalContext) studio.setAdditionalContext(item.metadata.additionalContext);
      
      if (studio.setRefImageUrl) {
        studio.setRefImageUrl(item.metadata.refImageUrl || item.ref_image_url || '');
        studio.setRefPreview(item.metadata.refImageUrl || item.ref_image_url || '');
        studio.setLeftProfileRefUrl?.(item.metadata.leftProfileRefUrl || '');
        studio.setLeftProfileRefPreview?.(item.metadata.leftProfileRefUrl || '');
        studio.setRightProfileRefUrl?.(item.metadata.rightProfileRefUrl || '');
        studio.setRightProfileRefPreview?.(item.metadata.rightProfileRefUrl || '');
        studio.setWardrobeRefUrl(item.metadata.wardrobeRefUrl || '');
        studio.setWardrobeRefPreview(item.metadata.wardrobeRefUrl || '');
        studio.setPropRefUrl(item.metadata.propRefUrl || '');
        studio.setPropRefPreview(item.metadata.propRefUrl || '');
      }
    }
  };

  const handleApplyPreset = (preset) => {
    if (preset.name) studio.setBoardMetaField('name', preset.name);
    if (preset.age) studio.setBoardMetaField('age', preset.age);
    if (preset.outfit) studio.setBoardMetaField('outfit', preset.outfit);
    if (preset.style) studio.setBoardMetaField('style', preset.style);
    if (preset.additionalContext) studio.setAdditionalContext(preset.additionalContext);
    setActiveTab('details');
  };

  const handleGenerate = () => {
    const fields = BOARD_FIELDS[studio.activeBoard] || [];
    for (const field of fields) {
      if (field.required && (!studio.boardMeta[field.key] || !studio.boardMeta[field.key].toString().trim())) {
        studio.setError(`${field.label} is required.`);
        setActiveTab('details');
        return;
      }
    }
    studio.generateBoard();
  };

  const hasReference = !!studio.refPreview || !!studio.leftProfileRefPreview || !!studio.rightProfileRefPreview || !!studio.wardrobeRefPreview || !!studio.propRefPreview;
  const requiredCredits = studio.activeModel === 'banana' ? 5 : 3;

  const fields = BOARD_FIELDS[studio.activeBoard] || [];
  const requiredFieldsFilled = fields.every(field => {
    if (!field.required) return true;
    const val = studio.boardMeta[field.key];
    return val !== undefined && val !== null && val.toString().trim() !== '';
  });

  const canGenerate = requiredFieldsFilled && userCredits >= requiredCredits && !studio.generating;

  const countUploadedRefs = () => {
    let count = 0;
    if (studio.refPreview) count++;
    if (studio.leftProfileRefPreview) count++;
    if (studio.rightProfileRefPreview) count++;
    if (studio.wardrobeRefPreview) count++;
    if (studio.propRefPreview) count++;
    return count;
  };

  return (
    <div className="h-full flex flex-col bg-[#050608] text-white overflow-hidden relative font-sans">
      
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 right-1/4 w-[700px] h-[350px] bg-gradient-to-b from-[#C8F135]/5 via-cyan-500/5 to-transparent rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[300px] bg-purple-500/5 rounded-full blur-[160px] pointer-events-none -z-10" />

      {/* ── Studio Top Command Bar ─────────────────────────────────────────── */}
      <header className="border-b border-white/10 px-8 py-3.5 flex items-center justify-between shrink-0 bg-black/70 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#C8F135] to-emerald-500 flex items-center justify-center shadow-[0_0_25px_rgba(200,241,53,0.3)]">
            <Sparkles className="w-5 h-5 text-black" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-[0.08em] uppercase flex items-center gap-2 text-white">
                Avatar Studio <span className="text-[9px] font-black bg-[#C8F135]/20 border border-[#C8F135]/40 text-[#C8F135] px-2 py-0.5 rounded-full tracking-widest uppercase">Hologram 3D v2.5</span>
              </h1>
            </div>
            <p className="text-[10px] text-white/45 font-mono">Quantum Character Turnarounds • 2K Resolution • Identity Locked</p>
          </div>
        </div>

        {/* Global Controls & Balance */}
        <div className="flex items-center gap-3">
          {/* Quick Style Inspiration Dropdown */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
            <span className="text-[9px] font-black uppercase text-white/40 mr-1">Preset Style:</span>
            {STYLE_PRESETS.slice(0, 3).map(preset => (
              <button
                key={preset.label}
                onClick={() => {
                  studio.setBoardMetaField('style', preset.style);
                  studio.setBoardMetaField('outfit', preset.outfit);
                  studio.setAdditionalContext(`${preset.label}, ${preset.palette}, cinematic lighting, 2K character sheet`);
                  setActiveTab('details');
                }}
                className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-white/5 hover:bg-[#C8F135]/20 hover:text-[#C8F135] text-white/70 transition-all border border-transparent hover:border-[#C8F135]/30"
              >
                {preset.icon} {preset.label}
              </button>
            ))}
          </div>

          {/* Credit Display */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-xs font-bold shadow-inner">
            <Zap className="w-3.5 h-3.5 text-[#C8F135] animate-pulse" />
            <span className="text-white/40 uppercase tracking-wider text-[9px]">Credits:</span>
            <span className="text-[#C8F135] font-black text-sm">{userCredits}</span>
          </div>

          {/* History Drawer Trigger */}
          <button
            onClick={() => setIsGalleryOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C8F135]/10 hover:bg-[#C8F135]/20 border border-[#C8F135]/30 text-xs font-black uppercase tracking-wider text-[#C8F135] transition-all duration-300 shadow-[0_0_15px_rgba(200,241,53,0.1)] active:scale-95"
          >
            <History className="w-3.5 h-3.5" />
            <span>Archive</span>
            {studio.gallery.length > 0 && (
              <span className="bg-[#C8F135] text-black text-[9px] px-1.5 py-0.2 rounded-full font-black">
                {studio.gallery.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Studio Body ───────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left Side: Parameters Command Deck */}
        <aside className="w-[470px] border-r border-white/10 bg-black/40 backdrop-blur-2xl flex flex-col min-h-0 shrink-0 select-none">
          
          {/* Tab Navigation header */}
          <div className="grid grid-cols-3 border-b border-white/10 p-2.5 bg-black/50 gap-2">
            <button
              onClick={() => setActiveTab('config')}
              className={`group flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl transition-all duration-300 relative border ${
                activeTab === 'config'
                  ? 'bg-[#C8F135]/15 border-[#C8F135]/50 text-[#C8F135] shadow-[0_0_25px_rgba(200,241,53,0.15)]'
                  : 'bg-zinc-950/40 border-white/5 text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
              }`}
            >
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                activeTab === 'config' ? 'bg-[#C8F135] text-black' : 'bg-white/5 text-white/50'
              }`}>
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider">1. Engine & Board</span>
            </button>

            <button
              onClick={() => setActiveTab('details')}
              className={`group flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl transition-all duration-300 relative border ${
                activeTab === 'details'
                  ? 'bg-[#C8F135]/15 border-[#C8F135]/50 text-[#C8F135] shadow-[0_0_25px_rgba(200,241,53,0.15)]'
                  : 'bg-zinc-950/40 border-white/5 text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
              }`}
            >
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                activeTab === 'details' ? 'bg-[#C8F135] text-black' : 'bg-white/5 text-white/50'
              }`}>
                <FileText className="w-3.5 h-3.5" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider">2. Character DNA</span>
              {requiredFieldsFilled && (
                <span className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C8F135] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C8F135]" />
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('reference')}
              className={`group flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl transition-all duration-300 relative border ${
                activeTab === 'reference'
                  ? 'bg-[#C8F135]/15 border-[#C8F135]/50 text-[#C8F135] shadow-[0_0_25px_rgba(200,241,53,0.15)]'
                  : 'bg-zinc-950/40 border-white/5 text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
              }`}
            >
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                activeTab === 'reference' ? 'bg-[#C8F135] text-black' : 'bg-white/5 text-white/50'
              }`}>
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider">3. Biometrics</span>
              {countUploadedRefs() > 0 && (
                <span className="absolute top-2 right-2 bg-[#C8F135] text-black text-[8px] h-4 w-4 flex items-center justify-center rounded-full font-black shadow-[0_0_10px_#C8F135]">
                  {countUploadedRefs()}
                </span>
              )}
            </button>
          </div>

          {/* Form Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            <AnimatePresence mode="wait">
              
              {/* TAB 1: ENGINE & BOARD ARCHETYPE */}
              {activeTab === 'config' && (
                <motion.div
                  key="config-tab"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Visual Engine Selection */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#C8F135]" />
                        Neural Generation Engine
                      </span>
                      <span className="text-[8px] font-mono text-[#C8F135]">PRIMARY: VERTEX AI</span>
                    </label>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {/* Option 1: Vertex AI (Banana / Nano Banana 2 Pro) */}
                      <button
                        type="button"
                        onClick={() => studio.setActiveModel('banana')}
                        className={`p-4 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden group ${
                          studio.activeModel === 'banana'
                            ? 'border-[#C8F135] bg-[#C8F135]/10 shadow-[0_0_30px_rgba(200,241,53,0.15)] ring-1 ring-[#C8F135]/50'
                            : 'border-white/10 bg-zinc-950/60 hover:border-white/20 hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-black uppercase tracking-wider ${
                            studio.activeModel === 'banana' ? 'text-[#C8F135]' : 'text-white'
                          }`}>
                            Vertex AI Pro
                          </span>
                          <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-[#C8F135] text-black uppercase tracking-wider shadow-[0_0_10px_#C8F135]">
                            2K Ultra-HD
                          </span>
                        </div>
                        <p className="text-[9px] text-white/60 leading-relaxed font-medium">
                          Google Nano Banana 2 in global cluster. 2048px master character sheets.
                        </p>
                        <div className="mt-2.5 flex items-center gap-2 text-[8px] font-mono text-white/40">
                          <span className="text-[#C8F135] font-bold">5 Credits</span> • 100% Likeness Lock
                        </div>
                      </button>

                      {/* Option 2: GPT Image 2 (OpenAI) */}
                      <button
                        type="button"
                        onClick={() => studio.setActiveModel('gpt2')}
                        className={`p-4 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden group ${
                          studio.activeModel === 'gpt2'
                            ? 'border-[#C8F135] bg-[#C8F135]/10 shadow-[0_0_30px_rgba(200,241,53,0.15)] ring-1 ring-[#C8F135]/50'
                            : 'border-white/10 bg-zinc-950/60 hover:border-white/20 hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-black uppercase tracking-wider ${
                            studio.activeModel === 'gpt2' ? 'text-[#C8F135]' : 'text-white'
                          }`}>
                            GPT Image 2
                          </span>
                          <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/80 uppercase">
                            DALL-E 3
                          </span>
                        </div>
                        <p className="text-[9px] text-white/60 leading-relaxed font-medium">
                          Creative conceptual generator with stylized interpretation.
                        </p>
                        <div className="mt-2.5 flex items-center gap-2 text-[8px] font-mono text-white/40">
                          <span className="text-[#C8F135] font-bold">3 Credits</span> • Creative Flair
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Aspect Ratio Selection */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50 flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-[#C8F135]" />
                      Master Canvas Aspect Ratio
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { value: '16:9', label: '16:9 Widescreen', desc: 'Cinema / Desktop' },
                        { value: '9:16', label: '9:16 Story', desc: 'Mobile / Reels' },
                        { value: '1:1', label: '1:1 Square', desc: 'Standard Matrix' }
                      ].map((ratio) => (
                        <button
                          key={ratio.value}
                          type="button"
                          onClick={() => studio.setAspectRatio(ratio.value)}
                          className={`p-3 rounded-2xl border text-center transition-all duration-300 relative group ${
                            studio.aspectRatio === ratio.value
                              ? 'border-[#C8F135] bg-[#C8F135]/10 shadow-[0_0_20px_rgba(200,241,53,0.1)]'
                              : 'border-white/10 bg-zinc-950/60 hover:border-white/20 hover:bg-white/[0.02]'
                          }`}
                        >
                          <span className={`text-xs font-black uppercase tracking-wider block ${
                            studio.aspectRatio === ratio.value ? 'text-[#C8F135]' : 'text-white'
                          }`}>
                            {ratio.value}
                          </span>
                          <span className="text-[8px] text-white/40 block mt-0.5 tracking-tight font-medium uppercase group-hover:text-white/60">
                            {ratio.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Board Selection */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#C8F135]" />
                      Reference Board Structure
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {BOARDS.map((board) => {
                        const isSelected = studio.activeBoard === board.id;
                        return (
                          <button
                            key={board.id}
                            type="button"
                            onClick={() => studio.setActiveBoard(board.id)}
                            className={`p-4 rounded-2xl border text-left transition-all duration-300 group relative overflow-hidden ${
                              isSelected
                                ? 'border-[#C8F135] bg-[#C8F135]/10 shadow-[0_0_25px_rgba(200,241,53,0.1)] ring-1 ring-[#C8F135]/40'
                                : 'border-white/10 bg-zinc-950/60 hover:border-white/25 hover:bg-white/[0.03]'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <board.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${
                                isSelected ? 'text-[#C8F135]' : 'text-white/40'
                              }`} />
                              {isSelected && (
                                <span className="w-2 h-2 rounded-full bg-[#C8F135] shadow-[0_0_8px_#C8F135]" />
                              )}
                            </div>
                            <h3 className={`text-xs font-black uppercase tracking-wider mb-1 ${
                              isSelected ? 'text-[#C8F135]' : 'text-white'
                            }`}>
                              {board.label}
                            </h3>
                            <p className="text-[9px] text-white/50 leading-relaxed font-medium">
                              {board.tagline}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: CHARACTER DNA & PARAMETERS */}
              {activeTab === 'details' && (
                <motion.div
                  key="details-tab"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50 flex items-center gap-1.5">
                        <ChevronRight className="w-3.5 h-3.5 text-[#C8F135]" />
                        {BOARDS.find(b => b.id === studio.activeBoard)?.label} Attributes
                      </label>
                      <span className="text-[8px] font-mono text-[#C8F135] uppercase">Click tags to auto-fill</span>
                    </div>

                    <div className="space-y-4">
                      {fields.map(field => (
                        <div key={field.key} className="space-y-1.5">
                          <label className={`flex text-[9px] font-black uppercase tracking-widest items-center justify-between ${
                            field.required ? 'text-[#C8F135]' : 'text-white/40'
                          }`}>
                            <span>{field.label} {field.required && <span className="text-[#C8F135] ml-0.5">*</span>}</span>
                            {field.required && !studio.boardMeta[field.key] && (
                              <span className="text-[7px] text-[#C8F135]/60 normal-case font-bold">Required</span>
                            )}
                          </label>

                          {field.type === 'dropdown' ? (
                            <div className="relative">
                              <select
                                value={studio.boardMeta[field.key] || ''}
                                onChange={(e) => studio.setBoardMetaField(field.key, e.target.value)}
                                className="w-full bg-zinc-950/80 border border-white/10 focus:border-[#C8F135] text-white rounded-2xl px-4 py-3 text-xs outline-none font-medium transition-all cursor-pointer appearance-none pr-10 focus:ring-1 focus:ring-[#C8F135]/30 hover:border-white/20 shadow-inner"
                              >
                                <option value="" className="text-white/30">{field.placeholder}</option>
                                {field.options.map(opt => (
                                  <option key={opt} value={opt} className="bg-zinc-950 text-white">{opt}</option>
                                ))}
                              </select>
                              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-white/40">
                                <ChevronDown className="w-4 h-4" />
                              </div>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={studio.boardMeta[field.key] || ''}
                              onChange={(e) => studio.setBoardMetaField(field.key, e.target.value)}
                              placeholder={field.placeholder}
                              className="w-full bg-zinc-950/80 border border-white/10 focus:border-[#C8F135] text-white rounded-2xl px-4 py-3 text-xs placeholder-white/20 outline-none font-medium transition-all focus:ring-1 focus:ring-[#C8F135]/30 hover:border-white/20 shadow-inner"
                            />
                          )}

                          {/* Quick suggestion tags under field */}
                          {field.suggestions && field.suggestions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {field.suggestions.map(sug => (
                                <button
                                  key={sug}
                                  type="button"
                                  onClick={() => studio.setBoardMetaField(field.key, sug)}
                                  className={`px-2 py-0.5 rounded-lg text-[8px] font-mono transition-all border ${
                                    studio.boardMeta[field.key] === sug
                                      ? 'bg-[#C8F135] text-black border-[#C8F135] font-bold shadow-[0_0_8px_rgba(200,241,53,0.3)]'
                                      : 'bg-white/5 border-white/5 text-white/50 hover:text-white hover:bg-white/10'
                                  }`}
                                >
                                  {sug}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Extra Creative Directives */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50 flex items-center gap-1.5">
                      <Sparkle className="w-3.5 h-3.5 text-[#C8F135]" />
                      Custom Creative Context & Mood
                    </label>
                    <textarea
                      value={studio.additionalContext}
                      onChange={(e) => studio.setAdditionalContext(e.target.value)}
                      placeholder="e.g. Dramatic low-key cinematic lighting, anamorphic lens flare, rain sheen on leather coat, cyan and amber color grade, 2K character turnaround..."
                      rows={3}
                      className="w-full bg-zinc-950/80 border border-white/10 focus:border-[#C8F135] text-white rounded-2xl px-4 py-3 text-xs placeholder-white/20 outline-none resize-none font-medium leading-relaxed custom-scrollbar transition-all focus:ring-1 focus:ring-[#C8F135]/30 hover:border-white/20 shadow-inner"
                    />
                  </div>
                </motion.div>
              )}

              {/* TAB 3: BIOMETRIC SCANNER & MULTI-ANGLE PHOTOS */}
              {activeTab === 'reference' && (
                <motion.div
                  key="reference-tab"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Status Banner */}
                  <div className="p-4 bg-gradient-to-r from-black/80 to-zinc-950 border border-white/10 rounded-2xl space-y-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${hasReference ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]' : 'bg-[#C8F135] shadow-[0_0_10px_#C8F135]'}`} />
                      <span className="text-[10px] font-black uppercase tracking-wider text-white">
                        {hasReference ? 'Biometric Face-Lock Grounding Active' : 'Pure Generative Prompt Mode'}
                      </span>
                    </div>
                    <p className="text-[9px] text-white/50 leading-relaxed font-medium">
                      {hasReference 
                        ? 'Vertex AI synthesizes facial likeness from uploaded angles while building turnaround panels.' 
                        : 'No photos uploaded. Characters generated from description and style parameters.'}
                    </p>
                  </div>

                  {/* Biometric Upload Pods */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C8F135] flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5" />
                      Multi-Angle Face Likeness Pods
                    </label>

                    <div className="grid grid-cols-3 gap-3">
                      {/* SLOT 1: Front Face */}
                      <div className="flex flex-col">
                        <span className="text-[8px] font-mono uppercase text-white/40 mb-1.5 text-center">0° Front</span>
                        {!studio.refPreview ? (
                          <label className="flex flex-col items-center justify-center border border-dashed border-white/15 hover:border-[#C8F135] rounded-2xl h-32 cursor-pointer bg-zinc-950/60 hover:bg-zinc-950 transition-all text-center group">
                            <User className="w-6 h-6 text-white/30 group-hover:text-[#C8F135] transition-colors mb-1.5" />
                            <span className="text-[8px] font-black uppercase text-white/70 tracking-wider">Upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => studio.uploadRef(e.target.files?.[0], 'character')}
                              className="hidden"
                              disabled={studio.uploadingRef}
                            />
                          </label>
                        ) : (
                          <div className="relative h-32 rounded-2xl overflow-hidden border border-[#C8F135]/50 group bg-zinc-950 shadow-[0_0_20px_rgba(200,241,53,0.15)]">
                            <img src={resolveUrl(studio.refPreview)} alt="Front Likeness" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => studio.uploadRef(null, 'character')}
                                className="p-2 rounded-xl bg-red-950 border border-red-500 text-red-400 hover:bg-red-900 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                        {studio.uploadingRef && (
                          <div className="text-[7px] text-[#C8F135] font-mono font-bold uppercase tracking-widest text-center mt-1 animate-pulse">Syncing R2...</div>
                        )}
                      </div>

                      {/* SLOT 2: Left 90 Profile */}
                      <div className="flex flex-col">
                        <span className="text-[8px] font-mono uppercase text-white/40 mb-1.5 text-center">90° Left</span>
                        {!studio.leftProfileRefPreview ? (
                          <label className="flex flex-col items-center justify-center border border-dashed border-white/15 hover:border-[#C8F135] rounded-2xl h-32 cursor-pointer bg-zinc-950/60 hover:bg-zinc-950 transition-all text-center group">
                            <User className="w-6 h-6 text-white/30 group-hover:text-[#C8F135] transition-colors mb-1.5 -scale-x-100" />
                            <span className="text-[8px] font-black uppercase text-white/70 tracking-wider">Upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => studio.uploadRef(e.target.files?.[0], 'left_profile')}
                              className="hidden"
                              disabled={studio.uploadingLeftProfile}
                            />
                          </label>
                        ) : (
                          <div className="relative h-32 rounded-2xl overflow-hidden border border-[#C8F135]/50 group bg-zinc-950 shadow-[0_0_20px_rgba(200,241,53,0.15)]">
                            <img src={resolveUrl(studio.leftProfileRefPreview)} alt="Left Profile" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => studio.uploadRef(null, 'left_profile')}
                                className="p-2 rounded-xl bg-red-950 border border-red-500 text-red-400 hover:bg-red-900 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                        {studio.uploadingLeftProfile && (
                          <div className="text-[7px] text-[#C8F135] font-mono font-bold uppercase tracking-widest text-center mt-1 animate-pulse">Syncing R2...</div>
                        )}
                      </div>

                      {/* SLOT 3: Right 90 Profile */}
                      <div className="flex flex-col">
                        <span className="text-[8px] font-mono uppercase text-white/40 mb-1.5 text-center">90° Right</span>
                        {!studio.rightProfileRefPreview ? (
                          <label className="flex flex-col items-center justify-center border border-dashed border-white/15 hover:border-[#C8F135] rounded-2xl h-32 cursor-pointer bg-zinc-950/60 hover:bg-zinc-950 transition-all text-center group">
                            <User className="w-6 h-6 text-white/30 group-hover:text-[#C8F135] transition-colors mb-1.5" />
                            <span className="text-[8px] font-black uppercase text-white/70 tracking-wider">Upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => studio.uploadRef(e.target.files?.[0], 'right_profile')}
                              className="hidden"
                              disabled={studio.uploadingRightProfile}
                            />
                          </label>
                        ) : (
                          <div className="relative h-32 rounded-2xl overflow-hidden border border-[#C8F135]/50 group bg-zinc-950 shadow-[0_0_20px_rgba(200,241,53,0.15)]">
                            <img src={resolveUrl(studio.rightProfileRefPreview)} alt="Right Profile" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => studio.uploadRef(null, 'right_profile')}
                                className="p-2 rounded-xl bg-red-950 border border-red-500 text-red-400 hover:bg-red-900 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                        {studio.uploadingRightProfile && (
                          <div className="text-[7px] text-[#C8F135] font-mono font-bold uppercase tracking-widest text-center mt-1 animate-pulse">Syncing R2...</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Secondary Pods: Wardrobe & Prop */}
                  <div className="space-y-3 pt-3 border-t border-white/10">
                    <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50 flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5 text-[#C8F135]" />
                      Wardrobe Fabric & Signature Gear
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Wardrobe */}
                      <div className="flex flex-col">
                        <span className="text-[8px] font-mono uppercase text-white/40 mb-1.5 text-center">Wardrobe Fabric</span>
                        {!studio.wardrobeRefPreview ? (
                          <label className="flex flex-col items-center justify-center border border-dashed border-white/15 hover:border-[#C8F135] rounded-2xl h-28 cursor-pointer bg-zinc-950/60 hover:bg-zinc-950 transition-all text-center group">
                            <Layers className="w-5 h-5 text-white/30 group-hover:text-[#C8F135] transition-colors mb-1" />
                            <span className="text-[8px] font-black uppercase text-white/70 tracking-wider">Upload Fabric</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => studio.uploadRef(e.target.files?.[0], 'wardrobe')}
                              className="hidden"
                              disabled={studio.uploadingWardrobe}
                            />
                          </label>
                        ) : (
                          <div className="relative h-28 rounded-2xl overflow-hidden border border-white/15 group bg-zinc-950">
                            <img src={resolveUrl(studio.wardrobeRefPreview)} alt="Wardrobe" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => studio.uploadRef(null, 'wardrobe')}
                                className="p-2 rounded-xl bg-red-950 border border-red-500 text-red-400 hover:bg-red-900 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Prop / Gear */}
                      <div className="flex flex-col">
                        <span className="text-[8px] font-mono uppercase text-white/40 mb-1.5 text-center">Signature Prop</span>
                        {!studio.propRefPreview ? (
                          <label className="flex flex-col items-center justify-center border border-dashed border-white/15 hover:border-[#C8F135] rounded-2xl h-28 cursor-pointer bg-zinc-950/60 hover:bg-zinc-950 transition-all text-center group">
                            <Box className="w-5 h-5 text-white/30 group-hover:text-[#C8F135] transition-colors mb-1" />
                            <span className="text-[8px] font-black uppercase text-white/70 tracking-wider">Upload Gear</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => studio.uploadRef(e.target.files?.[0], 'prop')}
                              className="hidden"
                              disabled={studio.uploadingProp}
                            />
                          </label>
                        ) : (
                          <div className="relative h-28 rounded-2xl overflow-hidden border border-white/15 group bg-zinc-950">
                            <img src={resolveUrl(studio.propRefPreview)} alt="Prop" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => studio.uploadRef(null, 'prop')}
                                className="p-2 rounded-xl bg-red-950 border border-red-500 text-red-400 hover:bg-red-900 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Trigger pinned to bottom */}
          <div className="p-6 border-t border-white/10 bg-black/70 backdrop-blur-xl space-y-3 shrink-0">
            {userCredits < requiredCredits && (
              <div className="flex gap-2.5 p-3.5 bg-red-950/30 border border-red-500/30 text-red-300 rounded-2xl text-[10px] leading-relaxed shadow-lg">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Insufficient Balance:</strong> Synthesis requires <strong>{requiredCredits} credits</strong>. Please <span className="underline cursor-pointer font-bold text-red-400 hover:text-red-300" onClick={() => useAppStore.getState().setActiveTab('pricing')}>recharge here</span>.
                </p>
              </div>
            )}

            {!requiredFieldsFilled && (
              <div className="flex gap-2.5 p-3 bg-[#C8F135]/10 border border-[#C8F135]/30 text-white/80 rounded-2xl text-[10px] leading-relaxed">
                <HelpCircle className="w-4 h-4 text-[#C8F135] shrink-0 mt-0.5" />
                <p>
                  Fill out required fields in the <strong className="text-[#C8F135] cursor-pointer" onClick={() => setActiveTab('details')}>Character DNA Tab</strong> to unlock generation.
                </p>
              </div>
            )}
            
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={`w-full flex items-center justify-between py-4 px-6 rounded-2xl font-black uppercase tracking-wider text-xs transition-all duration-300 shadow-2xl relative overflow-hidden group ${
                canGenerate
                  ? 'bg-gradient-to-r from-[#C8F135] to-emerald-400 text-black hover:scale-[1.01] hover:shadow-[0_0_35px_rgba(200,241,53,0.35)] active:scale-95 cursor-pointer'
                  : 'bg-white/[0.03] border border-white/5 text-white/30 cursor-not-allowed'
              }`}
            >
              <span className="flex items-center gap-2 font-black text-xs">
                <Sparkles className={`w-4 h-4 ${canGenerate ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
                <span>Synthesize {BOARDS.find(b => b.id === studio.activeBoard)?.label || 'Board'}</span>
                {hasReference ? (
                  <span className="text-[8px] font-black tracking-widest bg-black/20 text-black px-2 py-0.5 rounded-full border border-black/20">Biometric Locked</span>
                ) : (
                  <span className="text-[8px] font-black tracking-widest bg-black/10 text-black/80 px-2 py-0.5 rounded-full">Prompt Mode</span>
                )}
              </span>
              
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border uppercase transition-all ${
                  canGenerate ? 'bg-black text-[#C8F135] border-black/30' : 'bg-white/5 border-white/5 text-white/20'
                }`}>
                  {requiredCredits} Credits
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        </aside>

        {/* Right/Center Side: Holographic 3D Turntable Stage */}
        <main className="flex-1 flex flex-col bg-[#050608] p-6 lg:p-8 min-w-0 overflow-hidden relative">
          <HolographicTurntable
            generating={studio.generating}
            generatedImage={studio.generatedImage}
            activePrompt={studio.activePrompt}
            error={studio.error}
            downloadImage={studio.downloadImage}
            saveToGallery={studio.saveToGallery}
            saving={studio.saving}
            savedOk={studio.savedOk}
            type="board"
            setGeneratedImage={studio.setGeneratedImage}
            onApplyPreset={handleApplyPreset}
            activeModel={studio.activeModel}
            aspectRatio={studio.aspectRatio}
          />
        </main>
      </div>

      {/* History Slide-out Drawer */}
      <AvatarGallery
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        gallery={studio.gallery}
        onLoadGeneration={handleLoadGeneration}
      />
    </div>
  );
}
