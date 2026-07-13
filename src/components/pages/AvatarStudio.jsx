import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { useAvatarStudio } from '../../hooks/useAvatarStudio';
import { resolveUrl } from '../../config/apiConfig';
import {
  History, Sparkles, UploadCloud, Trash2, Camera, Film,
  ShieldAlert, ChevronRight, ChevronDown, User, MapPin, Box, Bone, PersonStanding,
  Layers, CheckCircle2, Sliders, HelpCircle, ArrowRight, Sparkle,
  SlidersHorizontal, FileText, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    { key: 'age',         label: 'Age',               placeholder: 'e.g. 25',                           required: true },
    { key: 'gender',      label: 'Gender',            placeholder: 'e.g. Female, Male, Non-binary…' },
    { key: 'ethnicity',   label: 'Ethnicity / Skin',  placeholder: 'e.g. South Asian, Fair complexion…' },
    { key: 'build',       label: 'Body Build',        placeholder: 'e.g. Athletic, Slim, Muscular…' },
    { key: 'outfit',      label: 'Outfit Style',      placeholder: 'e.g. Streetwear, Victorian, Sci-fi…' },
    { key: 'hair',        label: 'Hair',              placeholder: 'e.g. Long dark wavy hair…' },
    { key: 'personality', label: 'Personality / Vibe', placeholder: 'e.g. Bold, mysterious, cheerful…' },
    { key: 'style',       label: 'Render Style',      placeholder: 'Select Render Style...', type: 'dropdown', options: ['Realistic', 'Ultra Realistic', '3D', 'Anime'] },
  ],
  POSE: [
    { key: 'name',    label: 'Character Name',  placeholder: 'e.g. Aria…', required: true },
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
  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'details' | 'reference'

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

  const handleGenerate = () => {
    // Validate required fields
    const fields = BOARD_FIELDS[studio.activeBoard] || [];
    for (const field of fields) {
      if (field.required && (!studio.boardMeta[field.key] || !studio.boardMeta[field.key].toString().trim())) {
        studio.setError(`${field.label} is required.`);
        // Switch tab to details so they see the error
        setActiveTab('details');
        return;
      }
    }
    studio.generateBoard();
  };

  const hasReference = !!studio.refPreview || !!studio.leftProfileRefPreview || !!studio.rightProfileRefPreview || !!studio.wardrobeRefPreview || !!studio.propRefPreview;
  const requiredCredits = studio.activeModel === 'banana' ? 5 : 3;

  // Validation checking for all required fields
  const fields = BOARD_FIELDS[studio.activeBoard] || [];
  const requiredFieldsFilled = fields.every(field => {
    if (!field.required) return true;
    const val = studio.boardMeta[field.key];
    return val !== undefined && val !== null && val.toString().trim() !== '';
  });

  const canGenerate = requiredFieldsFilled && userCredits >= requiredCredits && !studio.generating;

  // Calculate status badges for tabs
  const countUploadedRefs = () => {
    let count = 0;
    if (studio.refPreview) count++;
    if (studio.leftProfileRefPreview) count++;
    if (studio.rightProfileRefPreview) count++;
    if (studio.wardrobeRefPreview) count++;
    if (studio.propRefPreview) count++;
    return count;
  };

  const isDetailsComplete = () => {
    return requiredFieldsFilled;
  };

  return (
    <div className="h-full flex flex-col bg-[#050608] text-white overflow-hidden relative font-sans">
      
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[300px] bg-[#C8F135]/5 rounded-full blur-[150px] pointer-events-none -z-10" />

      {/* Top Banner / Studio Navbar */}
      <header className="border-b border-white/5 px-8 py-3.5 flex items-center justify-between shrink-0 bg-black/40 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C8F135] to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Sparkle className="w-4.5 h-4.5 text-black" />
          </div>
          <div>
            <h1 className="text-md font-black tracking-[0.05em] uppercase flex items-center gap-2">
              Avatar Studio <span className="text-[9px] font-bold bg-[#C8F135]/15 border border-[#C8F135]/30 text-[#C8F135] px-2 py-0.5 rounded-full tracking-wider uppercase">v2.0 Pro</span>
            </h1>
            <p className="text-[10px] text-white/40 font-medium">Generate premium cinematic character sheets and design guides</p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-4">
          {/* Credit Display */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-bold transition-all hover:bg-white/[0.04]">
            <Sparkles className="w-3.5 h-3.5 text-[#C8F135]" />
            <span className="text-white/40">Credits:</span>
            <span className="text-[#C8F135] font-black">{userCredits}</span>
          </div>

          {/* History Drawer Trigger */}
          <button
            onClick={() => setIsGalleryOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 text-xs font-bold transition-all duration-300"
          >
            <History className="w-3.5 h-3.5 text-white/50" />
            <span>History</span>
            {studio.gallery.length > 0 && (
              <span className="bg-[#C8F135] text-black text-[9px] px-1.5 py-0.2 rounded-full font-black">
                {studio.gallery.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Studio Body Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left Side: Parameters Form Panel */}
        <aside className="w-[450px] border-r border-white/5 bg-black/20 flex flex-col min-h-0 shrink-0 select-none">
          
          {/* Tab Navigation header */}
          <div className="grid grid-cols-3 border-b border-white/5 p-2 bg-black/40 gap-1.5">
            <button
              onClick={() => setActiveTab('config')}
              className={`group flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-300 relative border ${
                activeTab === 'config'
                  ? 'bg-[#C8F135]/10 border-[#C8F135]/35 text-[#C8F135] shadow-[0_0_20px_rgba(200,241,53,0.08)]'
                  : 'bg-transparent border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.02] hover:border-white/5'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                activeTab === 'config'
                  ? 'bg-[#C8F135]/15 text-[#C8F135]'
                  : 'bg-white/5 text-white/45 group-hover:text-white/70 group-hover:bg-white/10'
              }`}>
                <SlidersHorizontal className="w-4 h-4 transition-transform group-hover:scale-110" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider">1. Engine & Board</span>
            </button>

            <button
              onClick={() => setActiveTab('details')}
              className={`group flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-300 relative border ${
                activeTab === 'details'
                  ? 'bg-[#C8F135]/10 border-[#C8F135]/35 text-[#C8F135] shadow-[0_0_20px_rgba(200,241,53,0.08)]'
                  : 'bg-transparent border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.02] hover:border-white/5'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                activeTab === 'details'
                  ? 'bg-[#C8F135]/15 text-[#C8F135]'
                  : 'bg-white/5 text-white/45 group-hover:text-white/70 group-hover:bg-white/10'
              }`}>
                <FileText className="w-4 h-4 transition-transform group-hover:scale-110" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider">2. Description</span>
              {isDetailsComplete() && (
                <span className="absolute top-1.5 right-1.5 flex h-1.5 w-1.5">
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#C8F135] shadow-[0_0_8px_#C8F135]"></span>
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('reference')}
              className={`group flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-300 relative border ${
                activeTab === 'reference'
                  ? 'bg-[#C8F135]/10 border-[#C8F135]/35 text-[#C8F135] shadow-[0_0_20px_rgba(200,241,53,0.08)]'
                  : 'bg-transparent border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.02] hover:border-white/5'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                activeTab === 'reference'
                  ? 'bg-[#C8F135]/15 text-[#C8F135]'
                  : 'bg-white/5 text-white/45 group-hover:text-white/70 group-hover:bg-white/10'
              }`}>
                <UserCheck className="w-4 h-4 transition-transform group-hover:scale-110" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider">3. Photos (Opt)</span>
              {countUploadedRefs() > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-[#C8F135] text-black text-[8px] h-3.5 w-3.5 flex items-center justify-center rounded-full font-black scale-90 shadow-[0_0_8px_#C8F135]">
                  {countUploadedRefs()}
                </span>
              )}
            </button>
          </div>

          {/* Form Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            <AnimatePresence mode="wait">
              {activeTab === 'config' && (
                <motion.div
                  key="config-tab"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Visual Engine Selection */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#C8F135]" />
                      Creative Visual Engine
                    </label>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => studio.setActiveModel('gpt2')}
                        className={`p-3.5 rounded-xl border text-left transition-all duration-300 relative overflow-hidden group ${
                          studio.activeModel === 'gpt2'
                            ? 'border-[#C8F135] bg-[#C8F135]/5 shadow-[0_0_20px_rgba(200,241,53,0.05)]'
                            : 'border-white/5 bg-zinc-950/40 hover:border-white/10 hover:bg-white/[0.02]'
                        }`}
                      >
                        {studio.activeModel === 'gpt2' && (
                          <div className="absolute top-0 right-0 w-8 h-8 bg-[#C8F135]/10 rounded-bl-full flex items-center justify-end pr-1.5 pt-1.5 pointer-events-none">
                            <div className="w-1.5 h-1.5 bg-[#C8F135] rounded-full animate-ping" />
                          </div>
                        )}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${
                            studio.activeModel === 'gpt2' ? 'text-[#C8F135]' : 'text-white/80'
                          }`}>
                            GPT Image 2
                          </span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${
                            studio.activeModel === 'gpt2'
                              ? 'bg-[#C8F135]/20 border-[#C8F135]/40 text-[#C8F135]'
                              : 'bg-white/5 border-white/5 text-white/30'
                          }`}>
                            3 Credits
                          </span>
                        </div>
                        <p className="text-[8px] text-white/40 leading-relaxed font-medium group-hover:text-white/60 transition-colors">
                          Ultra photo-realistic DALL-E 3 visual generator. Ideal for high details.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => studio.setActiveModel('banana')}
                        className={`p-3.5 rounded-xl border text-left transition-all duration-300 relative overflow-hidden group ${
                          studio.activeModel === 'banana'
                            ? 'border-[#C8F135] bg-[#C8F135]/5 shadow-[0_0_20px_rgba(200,241,53,0.05)]'
                            : 'border-white/5 bg-zinc-950/40 hover:border-white/10 hover:bg-white/[0.02]'
                        }`}
                      >
                        {studio.activeModel === 'banana' && (
                          <div className="absolute top-0 right-0 w-8 h-8 bg-[#C8F135]/10 rounded-bl-full flex items-center justify-end pr-1.5 pt-1.5 pointer-events-none">
                            <div className="w-1.5 h-1.5 bg-[#C8F135] rounded-full animate-ping" />
                          </div>
                        )}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${
                            studio.activeModel === 'banana' ? 'text-[#C8F135]' : 'text-white/80'
                          }`}>
                            Imagen Pro
                          </span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${
                            studio.activeModel === 'banana'
                              ? 'bg-[#C8F135]/20 border-[#C8F135]/40 text-[#C8F135]'
                              : 'bg-white/5 border-white/5 text-white/30'
                          }`}>
                            5 Credits
                          </span>
                        </div>
                        <p className="text-[8px] text-white/40 leading-relaxed font-medium group-hover:text-white/60 transition-colors">
                          Google maximum-fidelity image synthesis. Supporting up to 2K.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Aspect Ratio Selection */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40 flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-[#C8F135]" />
                      Output Aspect Ratio
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { value: '9:16', label: '9:16 Portrait', desc: 'Mobile / Story' },
                        { value: '16:9', label: '16:9 Widescreen', desc: 'Desktop / Cinema' },
                        { value: '1:1', label: '1:1 Square', desc: 'Default Square' }
                      ].map((ratio) => (
                        <button
                          key={ratio.value}
                          type="button"
                          onClick={() => studio.setAspectRatio(ratio.value)}
                          className={`p-3 rounded-xl border text-center transition-all duration-300 relative group ${
                            studio.aspectRatio === ratio.value
                              ? 'border-[#C8F135] bg-[#C8F135]/5 shadow-inner'
                              : 'border-white/5 bg-zinc-950/40 hover:border-white/10 hover:bg-white/[0.02]'
                          }`}
                        >
                          <span className={`text-[10px] font-black uppercase tracking-wider block ${
                            studio.aspectRatio === ratio.value ? 'text-[#C8F135]' : 'text-white/80'
                          }`}>
                            {ratio.value}
                          </span>
                          <span className="text-[7px] text-white/30 block mt-0.5 tracking-tight font-medium uppercase group-hover:text-white/50 transition-colors">
                            {ratio.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Board Selection */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#C8F135]" />
                      Reference Board Structure
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {BOARDS.map((board) => (
                        <button
                          key={board.id}
                          onClick={() => studio.setActiveBoard(board.id)}
                          className={`p-3.5 rounded-xl border text-left transition-all duration-300 group ${
                            studio.activeBoard === board.id
                              ? 'border-[#C8F135] bg-[#C8F135]/5 shadow-[0_0_20px_rgba(200,241,53,0.05)]'
                              : 'border-white/5 bg-zinc-950/40 hover:border-white/10 hover:bg-white/[0.02]'
                          }`}
                        >
                          <board.icon className={`w-5 h-5 mb-2.5 transition-transform duration-300 group-hover:scale-110 ${
                            studio.activeBoard === board.id ? 'text-[#C8F135]' : 'text-white/35'
                          }`} />
                          <h3 className={`text-[10px] font-black uppercase tracking-wider mb-1 ${
                            studio.activeBoard === board.id ? 'text-[#C8F135]' : 'text-white/80'
                          }`}>
                            {board.label}
                          </h3>
                          <p className="text-[8px] text-white/40 leading-relaxed font-medium group-hover:text-white/60 transition-colors">
                            {board.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'details' && (
                <motion.div
                  key="details-tab"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Board-Specific Dynamic Inputs */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40 flex items-center gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-[#C8F135]" />
                      {BOARDS.find(b => b.id === studio.activeBoard)?.label} Parameters
                    </label>
                    
                    <div className="space-y-3.5">
                      {fields.map(field => (
                        <div key={field.key} className="relative">
                          <label className={`flex text-[9px] font-black uppercase tracking-widest mb-1.5 items-center justify-between ${
                            field.required ? 'text-[#C8F135]' : 'text-white/30'
                          }`}>
                            <span>{field.label} {field.required && <span className="text-[#C8F135]/60 ml-0.5">*</span>}</span>
                            {field.required && !studio.boardMeta[field.key] && (
                              <span className="text-[7px] text-[#C8F135]/50 normal-case font-bold">Required</span>
                            )}
                          </label>
                          {field.type === 'dropdown' ? (
                            <div className="relative">
                              <select
                                value={studio.boardMeta[field.key] || ''}
                                onChange={(e) => studio.setBoardMetaField(field.key, e.target.value)}
                                className="w-full bg-zinc-950/60 border border-white/5 focus:border-[#C8F135]/50 text-white rounded-xl px-4 py-3 text-xs outline-none font-medium transition-all duration-300 cursor-pointer appearance-none pr-10 focus:ring-1 focus:ring-[#C8F135]/25 hover:border-white/10"
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
                              className="w-full bg-zinc-950/60 border border-white/5 focus:border-[#C8F135]/50 text-white rounded-xl px-4 py-3 text-xs placeholder-white/20 outline-none font-medium transition-all duration-300 focus:ring-1 focus:ring-[#C8F135]/25 hover:border-white/10"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Optional Extra Notes */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30">
                      Additional Creative Context / Instructions
                    </label>
                    <textarea
                      value={studio.additionalContext}
                      onChange={(e) => studio.setAdditionalContext(e.target.value)}
                      placeholder="e.g. dramatic low-key lighting, cyan and amber color scheme, wearing dynamic cyberpunk glasses, detailed leather vest texture..."
                      rows={4}
                      className="w-full bg-zinc-950/60 border border-white/5 focus:border-[#C8F135]/30 text-white rounded-xl px-4 py-3.5 text-xs placeholder-white/20 outline-none resize-none font-medium leading-relaxed custom-scrollbar transition-all duration-300 focus:ring-1 focus:ring-[#C8F135]/25 hover:border-white/10"
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === 'reference' && (
                <motion.div
                  key="reference-tab"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Guided Upload System Description Banner */}
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${hasReference ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'bg-[#C8F135] shadow-[0_0_8px_rgba(200,241,53,0.5)]'}`} />
                      <span className="text-[9px] font-black uppercase tracking-wider text-white">
                        {hasReference ? '📸 Image-Guided Mode' : '🔮 Prompt-Only Mode'}
                      </span>
                    </div>
                    <p className="text-[8px] text-white/40 leading-relaxed font-medium">
                      {hasReference 
                        ? 'Using uploaded references as visual grounding structure. AI will synthesize likeness and outfit.' 
                        : 'No photos uploaded. Characters and details will be generated purely from description prompts.'}
                    </p>
                  </div>

                  {/* 1. Reference Upload Card */}
                  <div className="space-y-5">
                    {/* Face Likeness Profiles Sub-Group */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.15em] text-[#C8F135] flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        Face Likeness Angles (Optional)
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {/* SLOT 1: Front Face */}
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-white/30 mb-2 text-center">Front Likeness</span>
                          {!studio.refPreview ? (
                            <label className="flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-[#C8F135]/40 rounded-xl h-28 cursor-pointer bg-zinc-950/60 hover:bg-zinc-950/90 transition-all text-center group">
                              <User className="w-5 h-5 text-white/20 group-hover:text-[#C8F135] transition-colors mb-1.5" />
                              <span className="text-[8px] font-black uppercase text-white/60 tracking-wider">Upload</span>
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
                              <img src={resolveUrl(studio.refPreview)} alt="Likeness" className="w-full h-full object-cover" />
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
                            <div className="text-[7px] text-[#C8F135] font-black uppercase tracking-widest text-center mt-1 animate-pulse">Uploading...</div>
                          )}
                        </div>

                        {/* SLOT 1B: Left Profile Face */}
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-white/30 mb-2 text-center">Left Profile</span>
                          {!studio.leftProfileRefPreview ? (
                            <label className="flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-[#C8F135]/40 rounded-xl h-28 cursor-pointer bg-zinc-950/60 hover:bg-zinc-950/90 transition-all text-center group">
                              <User className="w-5 h-5 text-white/20 group-hover:text-[#C8F135] transition-colors mb-1.5 -scale-x-100" />
                              <span className="text-[8px] font-black uppercase text-white/60 tracking-wider">Upload</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => studio.uploadRef(e.target.files?.[0], 'left_profile')}
                                className="hidden"
                                disabled={studio.uploadingLeftProfile}
                              />
                            </label>
                          ) : (
                            <div className="relative h-28 rounded-xl overflow-hidden border border-white/10 group bg-zinc-950">
                              <img src={resolveUrl(studio.leftProfileRefPreview)} alt="Left Profile" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => studio.uploadRef(null, 'left_profile')}
                                  className="p-1.5 rounded-lg bg-red-950/80 border border-red-500/30 text-red-400 hover:bg-red-900 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                          {studio.uploadingLeftProfile && (
                            <div className="text-[7px] text-[#C8F135] font-black uppercase tracking-widest text-center mt-1 animate-pulse">Uploading...</div>
                          )}
                        </div>

                        {/* SLOT 1C: Right Profile Face */}
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-white/30 mb-2 text-center">Right Profile</span>
                          {!studio.rightProfileRefPreview ? (
                            <label className="flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-[#C8F135]/40 rounded-xl h-28 cursor-pointer bg-zinc-950/60 hover:bg-zinc-950/90 transition-all text-center group">
                              <User className="w-5 h-5 text-white/20 group-hover:text-[#C8F135] transition-colors mb-1.5" />
                              <span className="text-[8px] font-black uppercase text-white/60 tracking-wider">Upload</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => studio.uploadRef(e.target.files?.[0], 'right_profile')}
                                className="hidden"
                                disabled={studio.uploadingRightProfile}
                              />
                            </label>
                          ) : (
                            <div className="relative h-28 rounded-xl overflow-hidden border border-white/10 group bg-zinc-950">
                              <img src={resolveUrl(studio.rightProfileRefPreview)} alt="Right Profile" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => studio.uploadRef(null, 'right_profile')}
                                  className="p-1.5 rounded-lg bg-red-950/80 border border-red-500/30 text-red-400 hover:bg-red-900 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                          {studio.uploadingRightProfile && (
                            <div className="text-[7px] text-[#C8F135] font-black uppercase tracking-widest text-center mt-1 animate-pulse">Uploading...</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Styling & Accessory Sub-Group */}
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <label className="text-[10px] font-black uppercase tracking-[0.15em] text-[#C8F135] flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" />
                        Costume & Object Anchors (Optional)
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        {/* SLOT 2: Wardrobe & Outfit */}
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-white/30 mb-2 text-center">Outfit / Costume</span>
                          {!studio.wardrobeRefPreview ? (
                            <label className="flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-[#C8F135]/40 rounded-xl h-28 cursor-pointer bg-zinc-950/60 hover:bg-zinc-950/90 transition-all text-center group">
                              <PersonStanding className="w-5 h-5 text-white/20 group-hover:text-[#C8F135] transition-colors mb-1.5" />
                              <span className="text-[8px] font-black uppercase text-white/60 tracking-wider">Upload</span>
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
                              <img src={resolveUrl(studio.wardrobeRefPreview)} alt="Wardrobe" className="w-full h-full object-cover" />
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
                            <div className="text-[7px] text-[#C8F135] font-black uppercase tracking-widest text-center mt-1 animate-pulse">Uploading...</div>
                          )}
                        </div>

                        {/* SLOT 3: Prop & Accessory */}
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-white/30 mb-2 text-center">Prop / Item</span>
                          {!studio.propRefPreview ? (
                            <label className="flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-[#C8F135]/40 rounded-xl h-28 cursor-pointer bg-zinc-950/60 hover:bg-zinc-950/90 transition-all text-center group">
                              <Box className="w-5 h-5 text-white/20 group-hover:text-[#C8F135] transition-colors mb-1.5" />
                              <span className="text-[8px] font-black uppercase text-white/60 tracking-wider">Upload</span>
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
                              <img src={resolveUrl(studio.propRefPreview)} alt="Prop" className="w-full h-full object-cover" />
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
                            <div className="text-[7px] text-[#C8F135] font-black uppercase tracking-widest text-center mt-1.5 animate-pulse">Uploading...</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Trigger section pinned to form bottom */}
          <div className="p-6 border-t border-white/5 bg-zinc-950/40 space-y-3.5 shrink-0">
            {userCredits < requiredCredits && (
              <div className="flex gap-2.5 p-3.5 bg-red-950/15 border border-red-500/25 text-red-300 rounded-xl text-[10px] leading-relaxed">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Insufficient Balance:</strong> Generating reference boards requires <strong>{requiredCredits} credits</strong>. Please <span className="underline cursor-pointer font-bold text-red-400 hover:text-red-300" onClick={() => useAppStore.getState().setActiveTab('pricing')}>upgrade here</span>.
                </p>
              </div>
            )}

            {!requiredFieldsFilled && (
              <div className="flex gap-2.5 p-3.5 bg-[#C8F135]/5 border border-[#C8F135]/20 text-white/70 rounded-xl text-[10px] leading-relaxed">
                <HelpCircle className="w-4 h-4 text-[#C8F135] shrink-0 mt-0.5" />
                <p>
                  Fill out required fields in the <strong className="text-[#C8F135] cursor-pointer" onClick={() => setActiveTab('details')}>Description Tab</strong> to unlock generation.
                </p>
              </div>
            )}
            
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={`w-full flex items-center justify-between py-4 px-6 rounded-2xl font-black uppercase tracking-wider text-xs transition-all duration-300 cursor-pointer ${
                canGenerate
                  ? 'bg-[#C8F135] text-black hover:scale-[1.01] hover:shadow-[0_0_25px_rgba(200,241,53,0.25)] active:scale-95'
                  : 'bg-white/[0.02] border border-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              <span className="flex items-center gap-2">
                Generate {BOARDS.find(b => b.id === studio.activeBoard)?.label || 'Board'}
                {hasReference ? (
                  <span className="text-[7px] font-black tracking-widest bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-400/20">Guided</span>
                ) : (
                  <span className="text-[7px] font-black tracking-widest bg-[#C8F135]/20 text-[#C8F135] px-1.5 py-0.5 rounded border border-[#C8F135]/20">Prompt Only</span>
                )}
              </span>
              
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase transition-colors duration-300 ${
                  canGenerate ? 'bg-black/10 border-black/10 text-black' : 'bg-white/5 border-white/5 text-white/20'
                }`}>
                  {requiredCredits} Credits
                </span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </aside>

        {/* Right/Center Side: Output Area Viewer Workspace */}
        <main className="flex-1 flex flex-col bg-[#050608] p-8 min-w-0 overflow-y-auto">
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
