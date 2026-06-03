import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { useAvatarStudio } from '../../hooks/useAvatarStudio';
import {
  History, Sparkles, UploadCloud, Trash2, Camera, Film,
  ShieldAlert, ChevronRight, ChevronDown, User, MapPin, Box, Bone, PersonStanding
} from 'lucide-react';
import { motion } from 'framer-motion';

import AvatarOutputArea from '../avatar/AvatarOutputArea';
import AvatarGallery from '../avatar/AvatarGallery';

const BOARDS = [
  {
    id: 'CHARACTER',
    label: 'Character Board',
    desc: 'Full-body views, expressions, outfit flat-lays.',
    icon: User
  },
  {
    id: 'POSE',
    label: 'Pose Board',
    desc: 'Action poses, animation reference coverage.',
    icon: PersonStanding
  },
  {
    id: 'SHOT',
    label: 'Shot Board',
    desc: 'Full 12-shot cinematic sequence breakdown.',
    icon: Film
  },
  {
    id: 'LOCATION',
    label: 'Location Board',
    desc: 'Environment views, time of day, weather moods.',
    icon: MapPin
  },
  {
    id: 'OBJECT',
    label: 'Object Board',
    desc: 'Product design, details, and lighting studies.',
    icon: Box
  },
  {
    id: 'CREATURE',
    label: 'Creature Board',
    desc: 'Anatomy, scale, behavior, and texture macros.',
    icon: Bone
  }
];

// Dynamic input fields per board type
const BOARD_FIELDS = {
  CHARACTER: [
    { key: 'name',        label: 'Character Name',    placeholder: 'e.g. Aria, Marcus, Zara…',          required: true },
    { key: 'age',         label: 'Age',               placeholder: 'e.g. 25' },
    { key: 'gender',      label: 'Gender',            placeholder: 'e.g. Female, Male, Non-binary…' },
    { key: 'ethnicity',   label: 'Ethnicity / Skin',  placeholder: 'e.g. South Asian, Fair complexion…' },
    { key: 'build',       label: 'Body Build',        placeholder: 'e.g. Athletic, Slim, Muscular…' },
    { key: 'outfit',      label: 'Outfit Style',      placeholder: 'e.g. Streetwear, Victorian, Sci-fi…' },
    { key: 'hair',        label: 'Hair',              placeholder: 'e.g. Long dark wavy hair…' },
    { key: 'personality', label: 'Personality / Vibe', placeholder: 'e.g. Bold, mysterious, cheerful…' },
    { key: 'style',       label: 'Render Style',      placeholder: 'Select Render Style...', type: 'dropdown', options: ['Realistic', 'Ultra Realistic', '3D', 'Anime'] },
  ],
  POSE: [
    { key: 'name',    label: 'Character Name',  placeholder: 'e.g. Aria…' },
    { key: 'action',  label: 'Action / Pose',   placeholder: 'e.g. Running, Leaping, Drawing sword…', required: true },
    { key: 'emotion', label: 'Emotion / Mood',  placeholder: 'e.g. Determined, Fearful, Joyful…' },
  ],
  SHOT: [
    { key: 'name',               label: 'Scene Name',           placeholder: 'e.g. Act 1 Opening Chase…', required: true },
    { key: 'genre',              label: 'Genre',                placeholder: 'e.g. Sci-fi thriller, Romance…' },
    { key: 'cinematographyStyle', label: 'Cinematography Style', placeholder: 'e.g. Roger Deakins, Kubrickian…' },
  ],
  LOCATION: [
    { key: 'name',      label: 'Location Name',    placeholder: 'e.g. Neo Tokyo Market, Dark Forest…', required: true },
    { key: 'setting',   label: 'Setting Type',     placeholder: 'e.g. Urban, Forest, Space Station…' },
    { key: 'timeOfDay', label: 'Time of Day',      placeholder: 'e.g. Golden hour, Midnight, Dusk…' },
    { key: 'weather',   label: 'Weather / Mood',   placeholder: 'e.g. Rainy, Foggy, Clear sunny…' },
    { key: 'era',       label: 'Era / Time Period', placeholder: 'e.g. Futuristic 2150, 1920s, Medieval…' },
  ],
  OBJECT: [
    { key: 'name',        label: 'Product / Object Name', placeholder: 'e.g. Quantum Watch, Arc Sneaker…', required: true },
    { key: 'material',    label: 'Material',              placeholder: 'e.g. Carbon fiber, Brushed titanium…' },
    { key: 'colorPalette', label: 'Color Palette',        placeholder: 'e.g. Matte black, Neon accents…' },
    { key: 'brandStyle',  label: 'Brand / Design Style',  placeholder: 'e.g. Minimalist luxury, Cyberpunk…' },
  ],
  CREATURE: [
    { key: 'name',  label: 'Creature Name',    placeholder: 'e.g. Vortex Serpent, Ember Drake…', required: true },
    { key: 'type',  label: 'Taxonomy / Type',  placeholder: 'e.g. Reptilian, Arachnid, Elemental…' },
    { key: 'size',  label: 'Size / Scale',     placeholder: 'e.g. Giant (30m tall), Wolf-sized…' },
    { key: 'biome', label: 'Biome / Habitat',  placeholder: 'e.g. Deep ocean, Volcanic lava fields…' },
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

  // Restore past generation from gallery
  const handleLoadGeneration = (item) => {
    studio.setGeneratedImage(item.output_url);
    studio.setActivePrompt(item.prompt);
    
    // Attempt loading metadata
    if (item.metadata) {
      if (item.metadata.boardType) studio.setActiveBoard(item.metadata.boardType);
      if (item.metadata.additionalContext) studio.setAdditionalContext(item.metadata.additionalContext);
      
      // Restore all 3 reference photos if they were saved in metadata
      if (studio.setRefImageUrl) {
        studio.setRefImageUrl(item.metadata.refImageUrl || item.ref_image_url || '');
        studio.setRefPreview(item.metadata.refImageUrl || item.ref_image_url || '');
        
        studio.setWardrobeRefUrl(item.metadata.wardrobeRefUrl || '');
        studio.setWardrobeRefPreview(item.metadata.wardrobeRefUrl || '');
        
        studio.setPropRefUrl(item.metadata.propRefUrl || '');
        studio.setPropRefPreview(item.metadata.propRefUrl || '');
      }
    }
  };

  const handleGenerate = () => {
    studio.generateBoard();
  };

  const hasReference = !!studio.refPreview || !!studio.wardrobeRefPreview || !!studio.propRefPreview;
  const requiredCredits = studio.activeModel === 'banana' ? 2 : 3;
  const canGenerate = hasReference && userCredits >= requiredCredits && !studio.generating;

  return (
    <div className="h-full flex flex-col bg-[#0D0F0A] text-white overflow-hidden relative font-sans">
      
      {/* Top Banner / Studio Navbar */}
      <header className="border-b border-white/5 px-6 py-2.5 flex items-center justify-between shrink-0 bg-zinc-950/40 backdrop-blur-md z-20">
        <div className="space-y-0.5">
          <h1 className="text-lg font-black italic uppercase tracking-tighter bg-gradient-to-r from-[#C8F135] to-emerald-400 bg-clip-text text-transparent">
            Reference Boards
          </h1>

        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          {/* Credit Display */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/5 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#C8F135]" />
            <span className="text-white/60">Credits:</span>
            <span className="text-[#C8F135]">{userCredits}</span>
          </div>

          {/* History Drawer Trigger */}
          <button
            onClick={() => setIsGalleryOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-white/10 text-xs font-black uppercase tracking-wider transition-all"
          >
            <History className="w-3.5 h-3.5 text-white/50" />
            <span>History</span>
            {studio.gallery.length > 0 && (
              <span className="bg-[#C8F135]/15 border border-[#C8F135]/35 text-[#C8F135] text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                {studio.gallery.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Studio Body Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left Side: Parameters Form Panel */}
        <aside className="w-[430px] border-r border-white/5 bg-zinc-950/20 flex flex-col min-h-0 overflow-y-auto shrink-0 select-none custom-scrollbar">
          
          <div className="p-6 space-y-8 flex-1">
            
            {/* 1. Reference Upload Card */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#C8F135]" />
                  Source of Truth Deck
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {/* SLOT 1: Character Likeness */}
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase tracking-wider text-white/40 mb-1.5 text-center">Likeness</span>
                  {!studio.refPreview ? (
                    <label className="flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-[#C8F135]/40 rounded-xl h-28 cursor-pointer bg-zinc-950/40 hover:bg-zinc-950 transition-all text-center group">
                      <User className="w-5 h-5 text-white/20 group-hover:text-[#C8F135] transition-colors mb-1.5" />
                      <span className="text-[8px] font-black uppercase text-white/60 tracking-wider">
                        Upload
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => studio.uploadRef(e.target.files?.[0], 'character')}
                        className="hidden"
                        disabled={studio.uploadingRef}
                      />
                    </label>
                  ) : (
                    <div className="relative h-28 rounded-xl overflow-hidden border border-white/10 group bg-zinc-950">
                      <img src={studio.refPreview} alt="Likeness" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => studio.uploadRef(null, 'character')}
                          className="p-1.5 rounded-lg bg-red-950/80 border border-red-500/30 text-red-400 hover:bg-red-900 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                  {studio.uploadingRef && (
                    <div className="text-[7px] text-[#C8F135] font-black uppercase tracking-widest text-center mt-1 animate-pulse">
                      Uploading...
                    </div>
                  )}
                </div>

                {/* SLOT 2: Wardrobe & Outfit */}
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase tracking-wider text-white/40 mb-1.5 text-center">Wardrobe</span>
                  {!studio.wardrobeRefPreview ? (
                    <label className="flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-[#C8F135]/40 rounded-xl h-28 cursor-pointer bg-zinc-950/40 hover:bg-zinc-950 transition-all text-center group">
                      <PersonStanding className="w-5 h-5 text-white/20 group-hover:text-[#C8F135] transition-colors mb-1.5" />
                      <span className="text-[8px] font-black uppercase text-white/60 tracking-wider">
                        Upload
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => studio.uploadRef(e.target.files?.[0], 'wardrobe')}
                        className="hidden"
                        disabled={studio.uploadingWardrobe}
                      />
                    </label>
                  ) : (
                    <div className="relative h-28 rounded-xl overflow-hidden border border-white/10 group bg-zinc-950">
                      <img src={studio.wardrobeRefPreview} alt="Wardrobe" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => studio.uploadRef(null, 'wardrobe')}
                          className="p-1.5 rounded-lg bg-red-950/80 border border-red-500/30 text-red-400 hover:bg-red-900 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                  {studio.uploadingWardrobe && (
                    <div className="text-[7px] text-[#C8F135] font-black uppercase tracking-widest text-center mt-1 animate-pulse">
                      Uploading...
                    </div>
                  )}
                </div>

                {/* SLOT 3: Prop & Accessory */}
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase tracking-wider text-white/40 mb-1.5 text-center">Prop / Item</span>
                  {!studio.propRefPreview ? (
                    <label className="flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-[#C8F135]/40 rounded-xl h-28 cursor-pointer bg-zinc-950/40 hover:bg-zinc-950 transition-all text-center group">
                      <Box className="w-5 h-5 text-white/20 group-hover:text-[#C8F135] transition-colors mb-1.5" />
                      <span className="text-[8px] font-black uppercase text-white/60 tracking-wider">
                        Upload
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => studio.uploadRef(e.target.files?.[0], 'prop')}
                        className="hidden"
                        disabled={studio.uploadingProp}
                      />
                    </label>
                  ) : (
                    <div className="relative h-28 rounded-xl overflow-hidden border border-white/10 group bg-zinc-950">
                      <img src={studio.propRefPreview} alt="Prop" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => studio.uploadRef(null, 'prop')}
                          className="p-1.5 rounded-lg bg-red-950/80 border border-red-500/30 text-red-400 hover:bg-red-900 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                  {studio.uploadingProp && (
                    <div className="text-[7px] text-[#C8F135] font-black uppercase tracking-widest text-center mt-1 animate-pulse">
                      Uploading...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Visual Engine Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C8F135]" />
                  Visual Engine
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => studio.setActiveModel('gpt2')}
                  className={`p-3 rounded-xl border text-left transition-all duration-300 ${
                    studio.activeModel === 'gpt2'
                      ? 'border-[#C8F135] bg-[#C8F135]/10 shadow-[0_0_15px_rgba(200,241,53,0.1)]'
                      : 'border-white/5 bg-zinc-950 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${
                      studio.activeModel === 'gpt2' ? 'text-[#C8F135]' : 'text-white/80'
                    }`}>
                      GPT Image 2
                    </span>
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded border uppercase ${
                      studio.activeModel === 'gpt2' ? 'bg-[#C8F135]/20 border-[#C8F135]/40 text-[#C8F135]' : 'bg-white/5 border-white/5 text-white/40'
                    }`}>
                      3 Credits
                    </span>
                  </div>
                  <p className="text-[8px] text-white/40 leading-tight">
                    Ultra premium, photo-realistic DALL-E 3 engine.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => studio.setActiveModel('banana')}
                  className={`p-3 rounded-xl border text-left transition-all duration-300 ${
                    studio.activeModel === 'banana'
                      ? 'border-[#C8F135] bg-[#C8F135]/10 shadow-[0_0_15px_rgba(200,241,53,0.1)]'
                      : 'border-white/5 bg-zinc-950 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${
                      studio.activeModel === 'banana' ? 'text-[#C8F135]' : 'text-white/80'
                    }`}>
                      Nano Banana 2
                    </span>
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded border uppercase ${
                      studio.activeModel === 'banana' ? 'bg-[#C8F135]/20 border-[#C8F135]/40 text-[#C8F135]' : 'bg-white/5 border-white/5 text-white/40'
                    }`}>
                      2 Credits
                    </span>
                  </div>
                  <p className="text-[8px] text-white/40 leading-tight">
                    Standard, blazing-fast Gemini multimodal image generator.
                  </p>
                </button>
              </div>
            </div>

            {/* Aspect Ratio Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-[#C8F135]" />
                  Aspect Ratio
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: '9:16', label: '9:16 Portrait', desc: 'Vertical Mobile' },
                  { value: '16:9', label: '16:9 Wide', desc: 'Cinematic Widescreen' },
                  { value: '1:1', label: '1:1 Square', desc: 'Default Square' }
                ].map((ratio) => (
                  <button
                    key={ratio.value}
                    type="button"
                    onClick={() => studio.setAspectRatio(ratio.value)}
                    className={`p-2.5 rounded-xl border text-center transition-all duration-300 ${
                      studio.aspectRatio === ratio.value
                        ? 'border-[#C8F135] bg-[#C8F135]/10 shadow-[0_0_15px_rgba(200,241,53,0.1)]'
                        : 'border-white/5 bg-zinc-950 hover:bg-white/5'
                    }`}
                  >
                    <span className={`text-[10px] font-black uppercase tracking-wider block ${
                      studio.aspectRatio === ratio.value ? 'text-[#C8F135]' : 'text-white/80'
                    }`}>
                      {ratio.value}
                    </span>
                    <span className="text-[7px] text-white/30 block mt-0.5 tracking-tight font-medium">
                      {ratio.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Board Selection */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-1.5">
                Board Layout Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {BOARDS.map((board) => (
                  <button
                    key={board.id}
                    onClick={() => studio.setActiveBoard(board.id)}
                    className={`p-3 rounded-xl border text-left transition-all duration-300 ${
                      studio.activeBoard === board.id
                        ? 'border-[#C8F135] bg-[#C8F135]/10 shadow-[0_0_15px_rgba(200,241,53,0.1)]'
                        : 'border-white/5 bg-zinc-950 hover:bg-white/5'
                    }`}
                  >
                    <board.icon className={`w-5 h-5 mb-2 ${studio.activeBoard === board.id ? 'text-[#C8F135]' : 'text-white/30'}`} />
                    <h3 className={`text-[10px] font-black uppercase tracking-wider mb-1 ${studio.activeBoard === board.id ? 'text-[#C8F135]' : 'text-white/80'}`}>
                      {board.label}
                    </h3>
                    <p className="text-[8px] text-white/40 leading-tight">
                      {board.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Board-Specific Dynamic Inputs */}
            {(() => {
              const fields = BOARD_FIELDS[studio.activeBoard] || [];
              if (!fields.length) return null;
              return (
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-[#C8F135]" />
                    {BOARDS.find(b => b.id === studio.activeBoard)?.label} Details
                  </label>
                  <div className="space-y-2.5">
                    {fields.map(field => (
                      <div key={field.key} className="relative">
                        <label className={`block text-[8px] font-black uppercase tracking-widest mb-1.5 ${
                          field.required ? 'text-[#C8F135]/70' : 'text-white/30'
                        }`}>
                          {field.label}{field.required && <span className="text-[#C8F135] ml-0.5">*</span>}
                        </label>
                        {field.type === 'dropdown' ? (
                          <div className="relative">
                            <select
                              value={studio.boardMeta[field.key] || ''}
                              onChange={(e) => studio.setBoardMetaField(field.key, e.target.value)}
                              className="w-full bg-zinc-950 border border-white/5 focus:border-[#C8F135]/50 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none font-medium transition-colors cursor-pointer appearance-none pr-10"
                            >
                              <option value="" className="text-white/30">{field.placeholder}</option>
                              {field.options.map(opt => (
                                <option key={opt} value={opt} className="bg-zinc-950 text-white">{opt}</option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-white/40">
                              <ChevronDown className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={studio.boardMeta[field.key] || ''}
                            onChange={(e) => studio.setBoardMetaField(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full bg-zinc-950 border border-white/5 focus:border-[#C8F135]/50 text-white rounded-xl px-3.5 py-2.5 text-xs placeholder-white/15 outline-none font-medium transition-colors"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* 4. Optional Extra Notes */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                Extra Notes (Optional)
              </label>
              <textarea
                value={studio.additionalContext}
                onChange={(e) => studio.setAdditionalContext(e.target.value)}
                placeholder="Additional lore, color palette override, or special instructions..."
                rows={2}
                className="w-full bg-zinc-950 border border-white/5 focus:border-[#C8F135]/30 text-white rounded-xl px-4 py-3 text-xs placeholder-white/15 outline-none resize-none font-medium leading-relaxed custom-scrollbar"
              />
            </div>

          </div>

          {/* Action Trigger section pinned to form bottom */}
          <div className="p-6 border-t border-white/5 bg-zinc-950/40 space-y-3 shrink-0">
            {userCredits < requiredCredits && (
              <div className="flex gap-2 p-3 bg-red-950/15 border border-red-500/25 text-red-300 rounded-xl text-[10px] leading-snug">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Insufficient Balance:</strong> Generating reference boards on this engine requires <strong>{requiredCredits} {requiredCredits === 1 ? 'credit' : 'credits'}</strong>. Please upgrade.
                </p>
              </div>
            )}
            
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={`w-full flex items-center justify-between py-4 px-6 rounded-2xl font-black uppercase tracking-wider text-xs transition-all duration-300 ${
                canGenerate
                  ? 'bg-[#C8F135] text-black hover:scale-[1.01] hover:shadow-lg hover:shadow-[#C8F135]/15 active:scale-95 cursor-pointer'
                  : 'bg-zinc-900 border border-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              <span>
                Generate {BOARDS.find(b => b.id === studio.activeBoard)?.label || 'Board'}
              </span>
              
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                  canGenerate ? 'bg-black/10 border-black/10 text-black' : 'bg-white/5 border-white/5 text-white/20'
                }`}>
                  {requiredCredits} {requiredCredits === 1 ? 'Credit' : 'Credits'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </aside>

        {/* Right/Center Side: Output Area Viewer Workspace */}
        <main className="flex-1 flex flex-col bg-[#080905] p-8 min-w-0 overflow-y-auto">
          <AvatarOutputArea
            generating={studio.generating}
            generatedImage={studio.generatedImage}
            activePrompt={studio.activePrompt}
            error={studio.error}
            downloadImage={studio.downloadImage}
            saveToGallery={studio.saveToGallery}
            saving={studio.saving}
            savedOk={studio.savedOk}
            type="board"
            userId={userId}
            setGeneratedImage={studio.setGeneratedImage}
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
