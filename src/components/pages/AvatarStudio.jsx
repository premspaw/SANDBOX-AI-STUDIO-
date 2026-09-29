import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { useAvatarStudio } from '../../hooks/useAvatarStudio';
import { useShorts } from '../../hooks/useShorts';
import {
  History, Sparkles, UploadCloud, Trash2, Camera,
  CheckCircle2, Sliders, ArrowRight, Zap, RefreshCw,
  Image as ImageIcon, Check, SlidersHorizontal, User,
  Ruler, Calendar, Shirt, Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import HolographicTurntable from '../avatar/HolographicTurntable';
import AvatarGallery from '../avatar/AvatarGallery';

export default function AvatarStudio() {
  const userProfile = useAppStore(state => state.userProfile);
  const userShorts = useAppStore(state => state.userShorts);
  const isAdmin = useAppStore(state => state.isAdmin || state.userProfile?.role === 'admin');
  const { shorts, canAfford, refresh: refreshShorts } = useShorts();
  const userCredits = shorts ?? userShorts ?? 0;
  const userId = userProfile?.id || 'anon';

  // Instantiate master hook
  const studio = useAvatarStudio(userId);

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Form State according to user requirements:
  // - Front Profile (handled by studio.refPreview / studio.uploadRef(file, 'character'))
  // - Side Profile (handled by studio.leftProfileRefPreview / studio.uploadRef(file, 'left_profile'))
  // - Wardrobe (handled by studio.wardrobeRefPreview / studio.uploadRef(file, 'wardrobe'))
  // - Name, Age, Height
  // - Engine: Nano Banana 2 Pro or ChatGPT Image 2.5
  const [characterName, setCharacterName] = useState('Rohan Mehra');
  const [characterAge, setCharacterAge] = useState('26');
  const [characterHeight, setCharacterHeight] = useState("5'9\"");
  const [wardrobeNotes, setWardrobeNotes] = useState('White ribbed tank top, black pleated wide trousers, sneakers, silver pendant chain');

  // Engine selection: 'banana' = Nano Banana 2 Pro, 'gpt2' = ChatGPT Image 2.5
  const [selectedEngine, setSelectedEngine] = useState('banana'); // 'banana' | 'gpt2'

  const requiredCredits = selectedEngine === 'banana' ? 5 : 3;
  const isUploading = !!(studio.uploadingRef || studio.uploadingLeftProfile || studio.uploadingWardrobe);
  const hasUploadedPhoto = !!(studio.refPreview || studio.refImageUrl);
  const hasCredits = isAdmin || userCredits >= requiredCredits;
  const canGenerate = !studio.generating && !isUploading;

  // Generate 16:9 3-Panel Character Sheet
  const handleGenerate = () => {
    if (studio.generating || isUploading) return;

    if (!hasUploadedPhoto) {
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast('Please upload at least a Front face photo first.', 'warning');
      return;
    }

    if (!hasCredits) {
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast(`Insufficient Credits: Need ${requiredCredits} Shorts (Balance: ${userCredits}).`, 'error');
      return;
    }

    studio.setActiveBoard('CHARACTER');
    studio.setAspectRatio('16:9'); // 16:9 widescreen rectangle sheet
    studio.setActiveModel(selectedEngine);

    const name = characterName.trim() || 'Character';
    const age = characterAge.trim() || '26';
    const height = characterHeight.trim() || "5'9\"";
    const outfit = wardrobeNotes.trim() || 'Neutral studio outfit';

    studio.setBoardMetaField('name', name);
    studio.setBoardMetaField('age', age);
    studio.setBoardMetaField('height', height);
    studio.setBoardMetaField('outfit', outfit);
    studio.setBoardMetaField('style', 'Ultra Realistic');

    // Master 16:9 rectangular 3-panel turnaround prompt
    const masterTurnaroundContext = `Three clean vertical panels on a seamless neutral light gray studio background. 16:9 rectangular format.
Panel 1 (Left, Close-up): Large extreme close-up headshot portrait looking directly at the camera with a neutral, relaxed expression. Natural authentic skin texture, realistic facial features, and soft flattering studio lighting.
Panel 2 (Center, Front View): Full-body front view of the character (${name}, Age ${age}, Height ${height}) standing upright in a neutral relaxed pose with hands at sides or relaxed in pockets. Full body from head to footwear, showing full ${outfit}.
Panel 3 (Right, Back View): Full-body back view of the character standing upright facing away from the camera, showing back of hairstyle, posture, and the complete back of the outfit, trousers, and shoes.
Real · Raw · Original studio photography. 8K resolution, 85mm portrait lens, photorealistic studio lighting, identical character identity across all three views. No watermarks, no logos, clean seamless light gray studio backdrop.`;

    studio.setAdditionalContext(masterTurnaroundContext);
    studio.generateBoard();
  };

  return (
    <div className="h-full flex flex-col bg-[#050608] text-white overflow-hidden relative font-sans">
      
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-gradient-to-b from-[#C8F135]/5 via-cyan-500/5 to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* ── Lightweight Top Header (Clean, slim, lightweight) ────────────────── */}
      <header className="border-b border-white/10 px-6 py-2.5 flex items-center justify-between shrink-0 bg-black/60 backdrop-blur-xl z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#C8F135] flex items-center justify-center shadow-[0_0_15px_rgba(200,241,53,0.3)]">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider uppercase flex items-center gap-2 text-white">
              Avatar Studio
              <span className="text-[9px] font-bold text-[#C8F135] bg-[#C8F135]/15 border border-[#C8F135]/30 px-1.5 py-0.2 rounded">
                16:9 Character Sheet
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
        
        {/* Left Side: Streamlined Side Panel */}
        <aside className="w-[430px] border-r border-white/10 bg-black/50 backdrop-blur-xl flex flex-col min-h-0 shrink-0 select-none">
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
            
            {/* 1. Photo Placeholders (Front Profile, Side Profile, Wardrobe) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center justify-between">
                <span>Identity & Wardrobe Placeholders</span>
                <span className="text-[8px] font-mono text-white/40">ATTACH PHOTOS</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                {/* Placeholder 1: Front Profile */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-white/70 flex items-center justify-between">
                    <span>Front Profile</span>
                    {studio.refPreview && <CheckCircle2 className="w-2.5 h-2.5 text-[#C8F135]" />}
                  </span>

                  {studio.refPreview ? (
                    <div className="relative w-full h-28 rounded-xl border border-[#C8F135] bg-black overflow-hidden group">
                      <img 
                        src={studio.refPreview} 
                        alt="Front Profile" 
                        className="w-full h-full object-cover" 
                      />
                      <button
                        type="button"
                        onClick={() => studio.uploadRef(null, 'character')}
                        className="absolute top-1 right-1 p-1 rounded-md bg-black/80 hover:bg-red-500/80 text-white/70 hover:text-white transition-all"
                        title="Remove"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full h-28 border border-dashed border-white/20 hover:border-[#C8F135]/60 bg-zinc-950/60 hover:bg-[#C8F135]/5 rounded-xl flex flex-col items-center justify-center p-2 cursor-pointer transition-all text-center group">
                      <UploadCloud className="w-5 h-5 text-white/30 group-hover:text-[#C8F135] transition-colors mb-1" />
                      <span className="text-[9px] font-bold text-white/70 group-hover:text-white">
                        Upload Front
                      </span>
                      <span className="text-[7px] text-white/30 font-mono mt-0.5">Face Close-up</span>
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

                {/* Placeholder 2: Side Profile */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-white/70 flex items-center justify-between">
                    <span>Side Profile</span>
                    {studio.leftProfileRefPreview && <CheckCircle2 className="w-2.5 h-2.5 text-[#C8F135]" />}
                  </span>

                  {studio.leftProfileRefPreview ? (
                    <div className="relative w-full h-28 rounded-xl border border-[#C8F135] bg-black overflow-hidden group">
                      <img 
                        src={studio.leftProfileRefPreview} 
                        alt="Side Profile" 
                        className="w-full h-full object-cover" 
                      />
                      <button
                        type="button"
                        onClick={() => studio.uploadRef(null, 'left_profile')}
                        className="absolute top-1 right-1 p-1 rounded-md bg-black/80 hover:bg-red-500/80 text-white/70 hover:text-white transition-all"
                        title="Remove"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full h-28 border border-dashed border-white/20 hover:border-[#C8F135]/60 bg-zinc-950/60 hover:bg-[#C8F135]/5 rounded-xl flex flex-col items-center justify-center p-2 cursor-pointer transition-all text-center group">
                      <UploadCloud className="w-5 h-5 text-white/30 group-hover:text-[#C8F135] transition-colors mb-1" />
                      <span className="text-[9px] font-bold text-white/70 group-hover:text-white">
                        Upload Side
                      </span>
                      <span className="text-[7px] text-white/30 font-mono mt-0.5">90° Profile</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) studio.uploadRef(file, 'left_profile');
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Placeholder 3: Wardrobe */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-white/70 flex items-center justify-between">
                    <span>Wardrobe</span>
                    {studio.wardrobeRefPreview && <CheckCircle2 className="w-2.5 h-2.5 text-[#C8F135]" />}
                  </span>

                  {studio.wardrobeRefPreview ? (
                    <div className="relative w-full h-28 rounded-xl border border-[#C8F135] bg-black overflow-hidden group">
                      <img 
                        src={studio.wardrobeRefPreview} 
                        alt="Wardrobe" 
                        className="w-full h-full object-cover" 
                      />
                      <button
                        type="button"
                        onClick={() => studio.uploadRef(null, 'wardrobe')}
                        className="absolute top-1 right-1 p-1 rounded-md bg-black/80 hover:bg-red-500/80 text-white/70 hover:text-white transition-all"
                        title="Remove"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full h-28 border border-dashed border-white/20 hover:border-[#C8F135]/60 bg-zinc-950/60 hover:bg-[#C8F135]/5 rounded-xl flex flex-col items-center justify-center p-2 cursor-pointer transition-all text-center group">
                      <Shirt className="w-5 h-5 text-white/30 group-hover:text-[#C8F135] transition-colors mb-1" />
                      <span className="text-[9px] font-bold text-white/70 group-hover:text-white">
                        Upload Outfit
                      </span>
                      <span className="text-[7px] text-white/30 font-mono mt-0.5">Clothes / Style</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) studio.uploadRef(file, 'wardrobe');
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Character Details (Name, Age, Height) */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                Character Specs
              </label>

              <div className="grid grid-cols-3 gap-2.5">
                {/* Name */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-white/60 flex items-center gap-1">
                    <User className="w-2.5 h-2.5 text-[#C8F135]" /> Name
                  </span>
                  <input
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    placeholder="e.g. Rohan Mehra"
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#C8F135]/60 focus:ring-1 focus:ring-[#C8F135]/40 transition-all font-medium"
                  />
                </div>

                {/* Age */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-white/60 flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5 text-[#C8F135]" /> Age
                  </span>
                  <input
                    type="text"
                    value={characterAge}
                    onChange={(e) => setCharacterAge(e.target.value)}
                    placeholder="e.g. 26"
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#C8F135]/60 focus:ring-1 focus:ring-[#C8F135]/40 transition-all font-medium"
                  />
                </div>

                {/* Height */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-white/60 flex items-center gap-1">
                    <Ruler className="w-2.5 h-2.5 text-[#C8F135]" /> Height
                  </span>
                  <input
                    type="text"
                    value={characterHeight}
                    onChange={(e) => setCharacterHeight(e.target.value)}
                    placeholder="e.g. 5'9&quot; / 175cm"
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#C8F135]/60 focus:ring-1 focus:ring-[#C8F135]/40 transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            {/* 4. Wardrobe & Appearance Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                  Wardrobe & Style Details
                </label>
                <button
                  type="button"
                  onClick={() => setWardrobeNotes('')}
                  className="text-[9px] text-white/40 hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>

              <textarea
                value={wardrobeNotes}
                onChange={(e) => setWardrobeNotes(e.target.value)}
                placeholder="Describe clothing, shoes, hairstyle, or accessory specifics (e.g. White ribbed tank top, black pleated wide trousers, skate sneakers)..."
                rows={3}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#C8F135]/60 focus:ring-1 focus:ring-[#C8F135]/40 transition-all resize-none leading-relaxed font-sans"
              />

              <div className="flex flex-wrap gap-1 pt-0.5">
                {[
                  'White Tank Top',
                  'Burgundy Dress',
                  'Plaid Flannel',
                  'Wide Black Trousers',
                  'Sneakers'
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setWardrobeNotes(prev => prev ? `${prev.trim()}, ${tag}` : tag);
                    }}
                    className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/5 hover:bg-[#C8F135]/15 hover:text-[#C8F135] text-white/60 border border-white/5 hover:border-[#C8F135]/30 transition-all"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Sheet Format Specs Summary */}
            <div className="p-3 rounded-xl border border-white/10 bg-zinc-950/60 flex items-center justify-between text-[9px] font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C8F135] animate-pulse" />
                <span className="text-white/80 font-bold uppercase">Format: 16:9 Rectangle Sheet</span>
              </div>
              <span className="text-white/40">Close-up · Front · Back</span>
            </div>

          </div>

          {/* Sticky Bottom Action Trigger & Compact Engine Selector */}
          <div className="p-3.5 border-t border-white/10 bg-black/80 backdrop-blur-xl space-y-2">
            
            {/* Small Compact Engine Selector */}
            <div className="flex items-center justify-between bg-zinc-950 border border-white/10 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => setSelectedEngine('banana')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] transition-all ${
                  selectedEngine === 'banana'
                    ? 'bg-[#C8F135] text-black shadow-sm font-black'
                    : 'text-white/60 hover:text-white hover:bg-white/5 font-semibold'
                }`}
              >
                <Cpu className="w-3 h-3" />
                <span>Nano Banana 2 Pro</span>
                <span className={`text-[8px] font-mono px-1 py-0.2 rounded font-black ${
                  selectedEngine === 'banana' ? 'bg-black/20 text-black' : 'bg-white/10 text-[#C8F135]'
                }`}>
                  5 cr
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedEngine('gpt2')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] transition-all ${
                  selectedEngine === 'gpt2'
                    ? 'bg-[#C8F135] text-black shadow-sm font-black'
                    : 'text-white/60 hover:text-white hover:bg-white/5 font-semibold'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>ChatGPT 2.5</span>
                <span className={`text-[8px] font-mono px-1 py-0.2 rounded font-black ${
                  selectedEngine === 'gpt2' ? 'bg-black/20 text-black' : 'bg-white/10 text-cyan-400'
                }`}>
                  3 cr
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={studio.generating || isUploading}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden shadow-xl active:scale-[0.98] ${
                studio.generating || isUploading
                  ? 'bg-zinc-900 border border-white/10 text-white/30 cursor-not-allowed'
                  : hasUploadedPhoto
                    ? 'bg-[#C8F135] hover:bg-[#b8e028] text-black shadow-[0_0_25px_rgba(200,241,53,0.3)] cursor-pointer'
                    : 'bg-white/10 hover:bg-white/15 text-white/80 border border-white/15 cursor-pointer'
              }`}
            >
              {studio.generating ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  <span>Synthesizing Character Sheet...</span>
                </>
              ) : isUploading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Uploading Reference Photo...</span>
                </>
              ) : (
                <>
                  <Sparkles className={`w-4 h-4 ${hasUploadedPhoto ? 'text-black' : 'text-[#C8F135]'}`} />
                  <span>{hasUploadedPhoto ? 'Generate Character Sheet' : 'Upload Front Photo to Generate'}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider ml-1 ${
                    hasUploadedPhoto ? 'bg-black/20 text-black' : 'bg-white/10 text-white/80'
                  }`}>
                    {requiredCredits} Credits
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
          setIsGalleryOpen(false);
        }}
      />
    </div>
  );
}
