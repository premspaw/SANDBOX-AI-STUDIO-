import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { useAvatarStudio } from '../../hooks/useAvatarStudio';
import {
  History, Sparkles, UploadCloud, Trash2, Camera,
  CheckCircle2, Sliders, ArrowRight, Zap, RefreshCw,
  Image as ImageIcon, Check, SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import HolographicTurntable from '../avatar/HolographicTurntable';
import AvatarGallery from '../avatar/AvatarGallery';

// Clean, simple character sheet presets inspired by real studio turnarounds
const SHEET_PRESETS = [
  {
    id: 'maroon-female',
    name: 'Ananya Sharma',
    tag: 'Real · Raw',
    icon: '👩',
    image: '/assets/characters/sheet_female_maroon.jpg',
    style: 'Real · Raw Studio',
    prompt: 'Young Indian woman with natural wavy dark hair, wearing a fitted burgundy ruched cocktail dress and clean white sneakers. Neutral studio grey background, 3-panel character turnaround sheet with close-up face portrait, full front view, and full back view. Authentic natural lighting.'
  },
  {
    id: 'plaid-male',
    name: 'Kabir Verma',
    tag: 'Night · Ambient',
    icon: '🧔',
    image: '/assets/characters/sheet_male_plaid.jpg',
    style: 'Night · Ambient',
    prompt: 'Young South Asian man with short dark textured hair and trimmed beard, wearing an open green plaid flannel shirt over a black t-shirt, loose black denim pants, and skate shoes. Night studio grey background, 3-panel turnaround sheet with detailed facial close-up, full-length front view, and full-length back view.'
  },
  {
    id: 'tank-male',
    name: 'Rohan Mehra',
    tag: 'Minimalist Raw',
    icon: '💪',
    image: '/assets/characters/sheet_male_tank.jpg',
    style: 'Real · Raw Studio',
    prompt: 'Athletic Indian man with trimmed beard and dark hair, wearing a classic white ribbed tank top, black pleated trousers, and black sneakers. Real raw studio setting, 3-panel character sheet with extreme face portrait close-up, front full body stance, and back full body view.'
  },
  {
    id: 'pets-matrix',
    name: 'Companion Matrix',
    tag: 'Pets & Outfits',
    icon: '🐾',
    image: '/assets/characters/sheet_pets_costumes.png',
    style: 'Character & Pets',
    prompt: 'Studio turnaround sheet for pets and characters, multi-angle rows featuring front view, side view, and back view in creative outfits on a clean neutral grey backdrop.'
  }
];

const STYLE_OPTIONS = [
  { id: 'raw', label: 'Real · Raw Studio', desc: 'Neutral grey studio, authentic skin & 3-panel turnaround', icon: '🏛️' },
  { id: 'night', label: 'Night · Ambient', desc: 'Evening ambient studio lighting, moody shadows', icon: '🌃' },
  { id: 'fashion', label: 'Editorial Fashion', desc: 'High-fashion minimalist studio, pristine lighting', icon: '📸' },
  { id: 'creative', label: 'Creative & Pets', desc: 'Multi-view characters, companions & costumes', icon: '🐾' }
];

const SUGGESTIONS = [
  '+ Burgundy Dress',
  '+ Plaid Flannel',
  '+ White Tank Top',
  '+ Clean Sneakers',
  '+ 3-Panel Turnaround',
  '+ Natural Studio Lighting'
];

export default function AvatarStudio() {
  const userProfile = useAppStore(state => state.userProfile);
  const userShorts = useAppStore(state => state.userShorts);
  const userCredits = userShorts ?? 0;
  const userId = userProfile?.id || 'anon';

  // Instantiate master hook
  const studio = useAvatarStudio(userId);

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [characterPrompt, setCharacterPrompt] = useState(
    'Young Indian woman with natural wavy dark hair, wearing a fitted burgundy ruched cocktail dress and clean white sneakers. Neutral studio grey background, 3-panel character turnaround sheet with close-up face portrait, full front view, and full back view. Authentic natural lighting.'
  );
  const [selectedStyle, setSelectedStyle] = useState('raw');
  const [activePresetId, setActivePresetId] = useState('maroon-female');

  // Apply a preset from cards or turntable
  const handleApplyPreset = (preset) => {
    if (preset.prompt) {
      setCharacterPrompt(preset.prompt);
    } else {
      const parts = [
        preset.name ? `Character: ${preset.name}.` : '',
        preset.outfit ? `Wearing ${preset.outfit}.` : '',
        `Neutral studio grey background, 3-panel character turnaround sheet with close-up face portrait, full front view, and full back view. Real · Raw · Original studio photography.`
      ];
      setCharacterPrompt(parts.filter(Boolean).join(' '));
    }

    if (preset.name) studio.setBoardMetaField('name', preset.name);
    if (preset.age) studio.setBoardMetaField('age', preset.age);
    if (preset.outfit) studio.setBoardMetaField('outfit', preset.outfit);
    studio.setBoardMetaField('style', 'Ultra Realistic');
  };

  const handleSelectPresetCard = (preset) => {
    setActivePresetId(preset.id);
    handleApplyPreset(preset);
  };

  const addSuggestion = (tag) => {
    const cleanTag = tag.replace(/^\+\s*/, '');
    setCharacterPrompt(prev => prev ? `${prev.trim()}, ${cleanTag}` : cleanTag);
  };

  // Generate character sheet
  const handleGenerate = () => {
    if (!characterPrompt.trim()) {
      studio.setError('Please enter a description for your character.');
      return;
    }

    // Set 3-panel character turnaround parameters
    studio.setActiveBoard('CHARACTER');
    studio.setAspectRatio('16:9');
    studio.setActiveModel('banana'); // Always use Vertex 2K Pro

    studio.setBoardMetaField('name', 'Character');
    studio.setBoardMetaField('age', '24');
    studio.setBoardMetaField('style', 'Ultra Realistic');
    studio.setBoardMetaField('outfit', characterPrompt);

    // Build the master context
    const fullContext = `${characterPrompt.trim()} Three clean vertical panels on a seamless light gray studio background. Left Panel: Large close-up portrait (head and shoulders only). Center Panel: Full-body front view. Right Panel: Full-body back view. Real · Raw · Original studio photography.`;
    studio.setAdditionalContext(fullContext);

    studio.generateBoard();
  };

  const requiredCredits = 5;
  const canGenerate = userCredits >= requiredCredits && !studio.generating && characterPrompt.trim().length > 0;

  return (
    <div className="h-full flex flex-col bg-[#050608] text-white overflow-hidden relative font-sans">
      
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-gradient-to-b from-[#C8F135]/5 via-cyan-500/5 to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* ── Lightweight Top Header (Clean, slim, minimal) ────────────────────── */}
      <header className="border-b border-white/10 px-6 py-2.5 flex items-center justify-between shrink-0 bg-black/50 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#C8F135] flex items-center justify-center shadow-[0_0_15px_rgba(200,241,53,0.3)]">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider uppercase flex items-center gap-2 text-white">
              Avatar Studio
              <span className="text-[9px] font-bold text-[#C8F135] bg-[#C8F135]/15 border border-[#C8F135]/30 px-1.5 py-0.2 rounded">
                Character Sheet
              </span>
            </h1>
          </div>
        </div>

        {/* Right side: Credits and Archive */}
        <div className="flex items-center gap-3">
          {/* Credit balance */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/60 border border-white/10 text-xs font-bold">
            <Zap className="w-3.5 h-3.5 text-[#C8F135]" />
            <span className="text-white/40 text-[9px] uppercase">Credits:</span>
            <span className="text-[#C8F135] font-black text-xs">{userCredits}</span>
          </div>

          {/* Archive Trigger */}
          <button
            onClick={() => setIsGalleryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/80 hover:text-white transition-all active:scale-95"
          >
            <History className="w-3.5 h-3.5 text-[#C8F135]" />
            <span>Archive</span>
            {studio.gallery.length > 0 && (
              <span className="bg-[#C8F135] text-black text-[9px] px-1 rounded-full font-black">
                {studio.gallery.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Studio Layout ──────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left Side: Completely Revamped Simple Side Panel */}
        <aside className="w-[420px] border-r border-white/10 bg-black/50 backdrop-blur-xl flex flex-col min-h-0 shrink-0 select-none">
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
            
            {/* 1. Quick Inspiration Presets (matching the uploaded real turnaround sheets) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center justify-between">
                <span>1. Character Presets</span>
                <span className="text-[8px] font-mono text-[#C8F135]">3-PANEL TURNAROUND</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                {SHEET_PRESETS.map((preset) => {
                  const isSelected = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPresetCard(preset)}
                      className={`relative p-2 rounded-xl border text-left transition-all duration-200 overflow-hidden group flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#C8F135] bg-[#C8F135]/10 shadow-[0_0_20px_rgba(200,241,53,0.15)] ring-1 ring-[#C8F135]/40'
                          : 'border-white/10 bg-zinc-950/60 hover:border-white/20 hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-base">{preset.icon}</span>
                        <div className="min-w-0 flex-1">
                          <h4 className={`text-xs font-black truncate ${isSelected ? 'text-[#C8F135]' : 'text-white'}`}>
                            {preset.name}
                          </h4>
                          <span className="text-[8px] font-mono text-white/40 block truncate">
                            {preset.tag}
                          </span>
                        </div>
                      </div>

                      {/* Micro Preview of the 3-panel sheet */}
                      <div className="w-full h-11 rounded-md overflow-hidden bg-black/50 border border-white/5 relative">
                        <img 
                          src={preset.image} 
                          alt={preset.name}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Character Description / Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                  2. Character Description
                </label>
                <button
                  type="button"
                  onClick={() => setCharacterPrompt('')}
                  className="text-[9px] text-white/40 hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>

              <div className="relative">
                <textarea
                  value={characterPrompt}
                  onChange={(e) => setCharacterPrompt(e.target.value)}
                  placeholder="Describe your character, clothing, hairstyle, facial appearance, and accessories..."
                  rows={4}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#C8F135]/60 focus:ring-1 focus:ring-[#C8F135]/40 transition-all resize-none leading-relaxed"
                />
              </div>

              {/* Quick suggestion tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUGGESTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addSuggestion(tag)}
                    className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/5 hover:bg-[#C8F135]/15 hover:text-[#C8F135] text-white/60 border border-white/5 hover:border-[#C8F135]/30 transition-all"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Studio Lighting / Sheet Style */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                3. Studio Style
              </label>

              <div className="grid grid-cols-2 gap-2">
                {STYLE_OPTIONS.map((opt) => {
                  const isSelected = selectedStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedStyle(opt.id);
                        if (opt.id === 'night') {
                          addSuggestion('Night studio ambient lighting');
                        } else if (opt.id === 'fashion') {
                          addSuggestion('High-fashion editorial lighting');
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#C8F135] bg-[#C8F135]/10 text-[#C8F135]'
                          : 'border-white/10 bg-zinc-950/60 hover:border-white/20 text-white/80'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span>{opt.icon}</span>
                        <span className="text-[10px] font-black uppercase truncate">{opt.label}</span>
                      </div>
                      <p className="text-[8px] text-white/40 line-clamp-1 leading-tight">
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Reference Photo (Optional) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center justify-between">
                <span>4. Reference Photo (Optional)</span>
                {studio.refPreview && (
                  <span className="text-[8px] font-mono text-[#C8F135]">PHOTO ATTACHED</span>
                )}
              </label>

              {studio.refPreview ? (
                <div className="relative rounded-xl border border-[#C8F135]/40 bg-zinc-950/80 p-2 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 bg-black shrink-0">
                    <img 
                      src={studio.refPreview} 
                      alt="Reference" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">Face Reference Locked</p>
                    <p className="text-[9px] text-[#C8F135] font-mono">100% Likeness Lock Active</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => studio.uploadRef(null, 'character')}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 border border-white/5 transition-all"
                    title="Remove Photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="border border-dashed border-white/15 hover:border-[#C8F135]/50 bg-zinc-950/40 hover:bg-[#C8F135]/5 rounded-xl p-3.5 flex items-center justify-center gap-3 cursor-pointer transition-all group">
                  <UploadCloud className="w-5 h-5 text-white/40 group-hover:text-[#C8F135] transition-colors" />
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-white group-hover:text-[#C8F135] transition-colors">
                      Drop face or outfit photo
                    </p>
                    <p className="text-[8px] text-white/40 font-mono">
                      JPG or PNG • Locks exact identity
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) studio.uploadRef(file, 'character');
                    }}
                  />
                </label>
              )}
            </div>

          </div>

          {/* 5. Sticky Bottom Action Trigger */}
          <div className="p-4 border-t border-white/10 bg-black/80 backdrop-blur-xl">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden shadow-xl active:scale-[0.98] ${
                canGenerate
                  ? 'bg-[#C8F135] hover:bg-[#b8e028] text-black shadow-[0_0_25px_rgba(200,241,53,0.3)] cursor-pointer'
                  : 'bg-zinc-900 border border-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              {studio.generating ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  <span>Generating Sheet...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>Generate Character Sheet</span>
                  <span className="px-2 py-0.5 rounded-md bg-black/20 text-black text-[9px] font-black tracking-wider ml-1">
                    5 Credits
                  </span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Right Side: Clean 3D Holographic Turntable Stage */}
        <main className="flex-1 flex flex-col min-h-0 bg-[#07090D] p-3 overflow-hidden">
          <HolographicTurntable
            generating={studio.generating}
            generatedImage={studio.generatedImage}
            activePrompt={studio.activePrompt}
            error={studio.error}
            downloadImage={studio.downloadImage}
            saveToGallery={studio.saveToGallery}
            saving={studio.saving}
            savedOk={studio.savedOk}
            setGeneratedImage={studio.setGeneratedImage}
            onApplyPreset={handleApplyPreset}
            userId={userId}
          />
        </main>
      </div>

      {/* ── Slide-Out Gallery / Archive Drawer ───────────────────────────────── */}
      <AvatarGallery
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        gallery={studio.gallery}
        onSelect={(item) => {
          studio.setGeneratedImage(item.output_url);
          studio.setActivePrompt(item.prompt);
          if (item.prompt) setCharacterPrompt(item.prompt);
          setIsGalleryOpen(false);
        }}
      />
    </div>
  );
}
