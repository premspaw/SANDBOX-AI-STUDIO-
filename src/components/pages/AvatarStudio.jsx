import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { useAvatarStudio } from '../../hooks/useAvatarStudio';
import { useShorts } from '../../hooks/useShorts';
import {
  History, Sparkles, UploadCloud, Trash2, Camera,
  CheckCircle2, Sliders, ArrowRight, Zap, RefreshCw,
  Image as ImageIcon, Check, SlidersHorizontal, User,
  Ruler, Calendar, Shirt, Cpu, FolderKanban, Compass,
  Sword, Film, Palette, Sun, Eye, Layers, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import HolographicTurntable from '../avatar/HolographicTurntable';
import AvatarGallery from '../avatar/AvatarGallery';

const LOCATION_PRESETS = [
  { id: 'cyberpunk', label: 'Neo-Tokyo Alley', desc: 'Rain-soaked asphalt, high-contrast neon signs, steaming street vents, reflective puddles' },
  { id: 'forest', label: 'Nordic Pine Forest', desc: 'Dense misty evergreen canopy, mossy boulders, moody atmospheric morning fog, cold crystal air' },
  { id: 'brutalist', label: 'Brutalist Concrete Hall', desc: 'Monumental raw concrete monoliths, dramatic shafts of sunlight cutting through dusty air' },
  { id: 'desert', label: 'Golden Hour Dunes', desc: 'Endless rippling desert sand ridges, low raking warm sunlight, fine blowing dust particles' },
  { id: 'industrial', label: 'Industrial Studio Loft', desc: 'Exposed black steel I-beams, oversized paned windows, polished concrete floors, dramatic afternoon shadows' },
  { id: 'diner', label: 'Midnight Neon Diner', desc: '1980s retro American diner interior, chrome counter, red leather booths, glowing neon sign reflection' },
  { id: 'glacier', label: 'Alpine Glacial Lake', desc: 'Pristine mirror reflections, snow-dusted jagged mountain peaks, crystal glacial waters' },
  { id: 'scifi', label: 'Sci-Fi Megastructure Bay', desc: 'Immense titanium hangar bay, blue atmospheric energy conduits, monumental cinematic scale' }
];

const FILM_GRAIN_OPTIONS = [
  '35mm Kodak Vision3 (Fine Organic Grain)',
  '70mm IMAX (Ultra-sharp, Pristine Dynamic Range)',
  'Panavision Anamorphic (Gentle Oval Bokeh, Blue Streak)',
  '16mm Vintage Film (Textured Organic Grain, Warm Roll-off)',
  'Arri Alexa RAW (Velvety Smooth Contrast, Modern Cinema)'
];

const LIGHTING_OPTIONS = [
  'Golden Hour Sunset (Low warm raking light, long shadows)',
  'Overcast Daylight (Soft shadowless studio diffusion)',
  'Moody Midnight Noir (Deep obsidian shadows, high-contrast key light)',
  'Volumetric Fog & Sunbeams (Dramatic light shafts through haze)',
  'Neon Glow & Wet Reflections (Vibrant localized colored light)'
];

const COLOR_PALETTES = [
  { id: 'cyber', label: 'Cyber Neon', colors: ['#00FFFF', '#FF007F'], desc: 'Cyan & Hot Magenta' },
  { id: 'golden', label: 'Golden Ember', colors: ['#F59E0B', '#B45309'], desc: 'Warm Amber & Ochre' },
  { id: 'nordic', label: 'Nordic Teal', colors: ['#14B8A6', '#475569'], desc: 'Cool Teal & Slate' },
  { id: 'noir', label: 'Classic Noir', colors: ['#E2E8F0', '#0F172A'], desc: 'High-contrast Monochrome' },
  { id: 'emerald', label: 'Deep Emerald', colors: ['#10B981', '#064E3B'], desc: 'Forest Green & Moss' },
  { id: 'crimson', label: 'Crimson Dusk', colors: ['#F43F5E', '#312E81'], desc: 'Burgundy & Deep Indigo' }
];

const PROP_SUGGESTIONS = [
  { name: 'Tactical Blaster', material: 'Matte Black Polymer & Carbon Fiber', desc: 'Sleek modular combat sidearm with integrated red targeting laser' },
  { name: 'Vintage Cruiser Bicycle', material: 'Chrome Plating, Sage Enamel & Tan Leather', desc: 'Classic 1960s steel-frame city commuter bicycle with leather sprung saddle' },
  { name: 'Cyber Katana', material: 'Damascus Titanium & G10 Composite', desc: 'Futuristic curved blade with etched micro-circuitry and matte black hilt' },
  { name: 'Ancient Dragon Statuette', material: 'Verdigris Bronze & Obsidian Inlay', desc: 'Intricately sculpted mythic serpent dragon holding a glowing celestial orb' },
  { name: 'Retro 35mm Rangefinder', material: 'Brushed Aluminum & Vulcanite Grip', desc: 'Vintage mechanical rangefinder camera with coated glass 50mm f/1.4 lens' },
  { name: 'Sci-Fi Holo-Communicator', material: 'Titanium Casing & Holographic Emitter', desc: 'Handheld holographic disk with glowing blue optical projector array' },
  { name: 'Antique Pocket Watch', material: 'Engraved 18K Yellow Gold & Enamel Dial', desc: 'Victorian open-face pocket watch with exposed tourbillon escapement mechanism' }
];

export default function AvatarStudio() {
  const userProfile = useAppStore(state => state.userProfile);
  const userShorts = useAppStore(state => state.userShorts);
  const isAdmin = useAppStore(state => state.isAdmin || state.userProfile?.role === 'admin');
  const { shorts, canAfford, refresh: refreshShorts } = useShorts();
  const userCredits = shorts ?? userShorts ?? 0;
  const userId = userProfile?.id || 'anon';

  // Project Vault / Box state
  const activeProjectId = useAppStore(state => state.activeProjectId || 'default');
  const projectAssets = useAppStore(state => state.projectAssets || {});
  const projectAssetCount = (projectAssets[activeProjectId] || []).length;
  const openProjectVault = useAppStore(state => state.openProjectVault);

  // Active production studio tab: 'character' | 'location' | 'prop'
  const [activeMode, setActiveMode] = useState('character');

  // Master hook
  const studio = useAvatarStudio(userId);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Character Form State
  const [characterName, setCharacterName] = useState('Rohan Mehra');
  const [characterAge, setCharacterAge] = useState('26');
  const [characterHeight, setCharacterHeight] = useState("5'9\"");
  const [wardrobeNotes, setWardrobeNotes] = useState('White ribbed tank top, black pleated wide trousers, sneakers, silver pendant chain');

  // Location Form State
  const [locationName, setLocationName] = useState('Neo-Tokyo Rain Alley');
  const [locationDesc, setLocationDesc] = useState('Rain-soaked asphalt, high-contrast neon signs, steaming street vents, reflective puddles');
  const [locationFilmGrain, setLocationFilmGrain] = useState(FILM_GRAIN_OPTIONS[0]);
  const [locationLighting, setLocationLighting] = useState(LIGHTING_OPTIONS[0]);
  const [locationPalette, setLocationPalette] = useState('Cyber Neon (Cyan & Hot Magenta)');
  const [locationRefPreview, setLocationRefPreview] = useState('');
  const [locationRefUrl, setLocationRefUrl] = useState('');
  const [isUploadingLocationRef, setIsUploadingLocationRef] = useState(false);

  // Prop Form State
  const [propName, setPropName] = useState('Vintage Cruiser Bicycle');
  const [propMaterial, setPropMaterial] = useState('Chrome Plating, Sage Enamel & Tan Leather');
  const [propDesc, setPropDesc] = useState('Classic 1960s steel-frame city commuter bicycle with leather sprung saddle');
  const [propRefPreview, setPropRefPreview] = useState('');
  const [propRefUrl, setPropRefUrl] = useState('');
  const [isUploadingPropRef, setIsUploadingPropRef] = useState(false);

  // Engine selection: 'banana' = Nano Banana 2 Pro (5 cr), 'banana2' = Nano Banana 2 (2 cr), 'gpt2' = ChatGPT Image 2.5 (3 cr)
  const [selectedEngine, setSelectedEngine] = useState('banana'); // 'banana' | 'banana2' | 'gpt2'

  const requiredCredits = selectedEngine === 'banana' ? 5 : selectedEngine === 'banana2' ? 2 : 3;
  const isUploading = !!(
    studio.uploadingRef ||
    studio.uploadingLeftProfile ||
    studio.uploadingWardrobe ||
    isUploadingLocationRef ||
    isUploadingPropRef
  );
  const hasUploadedPhoto = !!(studio.refPreview || studio.refImageUrl);
  const hasCredits = isAdmin || userCredits >= requiredCredits;
  const canGenerate = !studio.generating && !isUploading;

  // Handle Location Reference Upload
  const handleLocationRefUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLocationRef(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result;
      if (b64) {
        setLocationRefPreview(b64);
        setLocationRefUrl(b64);
        studio.uploadRef(file, 'character'); // also sync to studio hook
      }
      setIsUploadingLocationRef(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Prop Reference Upload
  const handlePropRefUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPropRef(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result;
      if (b64) {
        setPropRefPreview(b64);
        setPropRefUrl(b64);
        studio.uploadRef(file, 'prop');
      }
      setIsUploadingPropRef(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 1. Generate Character Sheet
  const handleGenerateCharacter = () => {
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

    const name = characterName.trim() || 'Character';
    const age = characterAge.trim() || '26';
    const height = characterHeight.trim() || "5'9\"";
    const outfit = wardrobeNotes.trim() || 'Neutral studio outfit';

    const masterTurnaroundContext = `Three clean vertical panels on a seamless neutral light gray studio background.
Panel 1 (Left, Close-up): Large extreme close-up headshot portrait looking directly at the camera with a neutral, relaxed expression. Natural authentic skin texture, realistic facial features, and soft flattering studio lighting.
Panel 2 (Center, Front View): Full-body front view of the character (${name}, Age ${age}, Height ${height}) standing upright in a neutral relaxed pose with hands at sides or relaxed in pockets. Full body from head to footwear, showing full ${outfit}.
Panel 3 (Right, Back View): Full-body back view of the character standing upright facing away from the camera, showing back of hairstyle, posture, and the complete back of the outfit, trousers, and shoes.
Real · Raw · Original studio photography. 8K resolution, 85mm portrait lens, photorealistic studio lighting, identical character identity across all three views. No watermarks, no logos, clean seamless light gray studio backdrop.`;

    studio.generateBoard({
      boardType: 'CHARACTER',
      model: selectedEngine,
      aspectRatio: '16:9',
      additionalContext: masterTurnaroundContext,
      boardMeta: {
        name,
        age,
        height,
        outfit,
        style: 'Ultra Realistic'
      },
      refImageUrl: studio.refImageUrl || '',
      leftProfileRefUrl: studio.leftProfileRefUrl || '',
      wardrobeRefUrl: studio.wardrobeRefUrl || '',
      propRefUrl: ''
    });
  };

  // 2. Generate Cinematic Location
  const handleGenerateLocation = () => {
    if (studio.generating || isUploading) return;

    if (!hasCredits) {
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast(`Insufficient Credits: Need ${requiredCredits} Shorts (Balance: ${userCredits}).`, 'error');
      return;
    }

    const name = locationName.trim() || 'Cinematic Location';
    const desc = locationDesc.trim() || 'Establishing shot of cinematic environment';

    const masterLocationPrompt = `Real · Raw · 8K cinematic widescreen establishing location photography.
Master wide panoramic view of ${name}: ${desc}.
Atmospheric Lighting & Mood: ${locationLighting}.
Film Stock & Grain: ${locationFilmGrain}.
Color Palette & Grade: ${locationPalette}.
Hyperrealistic architectural scale, rich atmospheric depth, fine cinematic grain, photorealistic materials and textures. Single unified cinematic widescreen composition.
STRICT NEGATIVE/EXCLUSIONS: Absolutely NO people, NO characters, NO humans, NO person present, NO crowds, NO pedestrians, completely empty and deserted cinematic location. NO text, NO watermarks, NO logos, NO character turnaround sheet, NO split panels.`;

    studio.generateBoard({
      boardType: 'LOCATION',
      model: selectedEngine,
      aspectRatio: '16:9',
      additionalContext: masterLocationPrompt,
      boardMeta: {
        name,
        setting: desc,
        era: 'Cinematic',
        timeOfDay: locationLighting,
        weather: locationFilmGrain,
        colorPalette: locationPalette
      },
      refImageUrl: locationRefUrl || '',
      leftProfileRefUrl: '',
      rightProfileRefUrl: '',
      wardrobeRefUrl: '',
      propRefUrl: ''
    });
  };

  // 3. Generate Isolated Production Prop
  const handleGenerateProp = () => {
    if (studio.generating || isUploading) return;

    if (!hasCredits) {
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast(`Insufficient Credits: Need ${requiredCredits} Shorts (Balance: ${userCredits}).`, 'error');
      return;
    }

    const name = propName.trim() || 'Production Prop';
    const material = propMaterial.trim() || 'High-fidelity production materials';
    const desc = propDesc.trim() || 'Detailed prop asset';

    const masterPropPrompt = `Photorealistic production studio prop photography of ${name}. Isolated entirely on a seamless neutral light gray studio background.
Materials & Finish: ${material}.
Details: ${desc}.
Lighting: Professional soft studio key-light and rim-lighting with soft gentle floor shadow. Complete profile clearly visible with extreme surface micro-texture fidelity.
STRICT NEGATIVE/EXCLUSIONS: Absolutely NO text, NO labels, NO logos, NO watermarks, NO human hands, NO person, NO character turnaround, NO multiple panels, clean pristine isolated studio prop asset on seamless neutral light gray background.`;

    studio.generateBoard({
      boardType: 'OBJECT',
      model: selectedEngine,
      aspectRatio: '16:9',
      additionalContext: masterPropPrompt,
      boardMeta: {
        name,
        material,
        brandStyle: desc
      },
      refImageUrl: '',
      leftProfileRefUrl: '',
      rightProfileRefUrl: '',
      wardrobeRefUrl: '',
      propRefUrl: propRefUrl || ''
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#07090E] text-white overflow-hidden">
      {/* ── Studio Header Bar ────────────────────────────────────────────── */}
      <header className="h-14 border-b border-white/10 px-5 flex items-center justify-between bg-black/40 backdrop-blur-xl shrink-0 z-20">
        <div className="flex items-center gap-3">
          {/* 3 Production Mode Switcher Tabs - Anchored to Left Corner as requested */}
          <div className="flex items-center bg-zinc-950/90 border border-white/10 rounded-xl p-1 gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveMode('character')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'character'
                  ? 'bg-[#C8F135] text-black shadow-md font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5 font-semibold'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Characters</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('location')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'location'
                  ? 'bg-[#C8F135] text-black shadow-md font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5 font-semibold'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Locations</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('prop')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'prop'
                  ? 'bg-[#C8F135] text-black shadow-md font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5 font-semibold'
              }`}
            >
              <Sword className="w-3.5 h-3.5" />
              <span>Props</span>
            </button>
          </div>
        </div>

        {/* Right side actions: Project Box, Gallery, Credit Balance */}
        <div className="flex items-center gap-2.5">
          {/* Project Box Button (Requested by user) */}
          <button
            type="button"
            onClick={() => {
              if (openProjectVault) {
                const targetCat = activeMode === 'character' ? 'avatar' : activeMode === 'location' ? 'location' : 'prop';
                openProjectVault(targetCat);
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-[#C8F135]/50 text-white transition-all cursor-pointer group shadow-sm"
            title="Open Project Box & Asset Vault"
          >
            <FolderKanban className="w-3.5 h-3.5 text-[#C8F135] group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold">Project Box</span>
            <span className="text-[10px] font-mono font-black px-1.5 py-0.2 rounded-md bg-[#C8F135]/20 text-[#C8F135] border border-[#C8F135]/30">
              {projectAssetCount}
            </span>
          </button>

          {/* Studio Gallery Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsGalleryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-zinc-950/80 hover:bg-white/5 text-white/70 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-white/50" />
            <span>History</span>
            {studio.gallery.length > 0 && (
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/10 text-white/60">
                {studio.gallery.length}
              </span>
            )}
          </button>

          {/* Credit balance badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-zinc-950/80">
            <Zap className="w-3.5 h-3.5 text-[#C8F135]" />
            <span className="text-xs font-bold text-white">
              {userCredits} <span className="text-[10px] text-white/40 font-normal">Shorts</span>
            </span>
          </div>
        </div>
      </header>

      {/* ── Main Studio Layout ──────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left Side: Streamlined Side Panel */}
        <aside className="w-[430px] border-r border-white/10 bg-black/50 backdrop-blur-xl flex flex-col min-h-0 shrink-0 select-none">
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
            
            {/* ═════════ 1. MODE: CHARACTER TURNAROUND ═════════ */}
            {activeMode === 'character' && (
              <div className="space-y-5 animate-in fade-in duration-200">
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
                            className="absolute top-1 right-1 p-1 rounded-md bg-black/80 hover:bg-red-500/80 text-white/70 hover:text-white transition-all cursor-pointer"
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
                            className="absolute top-1 right-1 p-1 rounded-md bg-black/80 hover:bg-red-500/80 text-white/70 hover:text-white transition-all cursor-pointer"
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
                            className="absolute top-1 right-1 p-1 rounded-md bg-black/80 hover:bg-red-500/80 text-white/70 hover:text-white transition-all cursor-pointer"
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

                {/* Character Details (Name, Age, Height) */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                    Character Specs
                  </label>

                  <div className="grid grid-cols-3 gap-2.5">
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

                {/* Wardrobe & Appearance Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                      Wardrobe & Style Details
                    </label>
                    <button
                      type="button"
                      onClick={() => setWardrobeNotes('')}
                      className="text-[9px] text-white/40 hover:text-white transition-colors cursor-pointer"
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
                        className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/5 hover:bg-[#C8F135]/15 hover:text-[#C8F135] text-white/60 border border-white/5 hover:border-[#C8F135]/30 transition-all cursor-pointer"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Turnaround Specs Indicator */}
                <div className="p-3 rounded-xl border border-white/10 bg-zinc-950/60 flex items-center justify-between text-[9px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#C8F135] animate-pulse" />
                    <span className="text-white/80 font-bold uppercase tracking-wider">Character Turnaround Sheet</span>
                  </div>
                  <span className="text-white/40 font-mono">Close-up · Front · Back</span>
                </div>
              </div>
            )}

            {/* ═════════ 2. MODE: CINEMATIC LOCATIONS ═════════ */}
            {activeMode === 'location' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Reference Photo for Lighting & Mood */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center justify-between">
                    <span>Lighting & Atmosphere Reference</span>
                    <span className="text-[8px] font-mono text-white/40">OPTIONAL</span>
                  </label>

                  {locationRefPreview ? (
                    <div className="relative w-full h-24 rounded-xl border border-[#C8F135] bg-black overflow-hidden group">
                      <img src={locationRefPreview} alt="Location Ref" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setLocationRefPreview(''); setLocationRefUrl(''); studio.uploadRef(null, 'character'); }}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/80 hover:bg-red-500 text-white transition-all cursor-pointer"
                        title="Remove Reference"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full h-20 border border-dashed border-white/20 hover:border-[#C8F135]/60 bg-zinc-950/60 hover:bg-[#C8F135]/5 rounded-xl flex items-center justify-center gap-3 p-3 cursor-pointer transition-all group">
                      <UploadCloud className="w-5 h-5 text-white/30 group-hover:text-[#C8F135] transition-colors" />
                      <div className="text-left">
                        <span className="text-[10px] font-bold text-white/80 group-hover:text-white block">
                          Upload Mood / Lighting Photo
                        </span>
                        <span className="text-[8px] text-white/30 font-mono">Visual guide for architecture or atmosphere</span>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLocationRefUpload} />
                    </label>
                  )}
                </div>

                {/* Location Presets */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center justify-between">
                    <span>Cinematic Location Presets</span>
                    <span className="text-[8px] font-mono text-[#C8F135]">QUICK SELECT</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {LOCATION_PRESETS.map((p) => {
                      const isSelected = locationDesc === p.desc;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setLocationName(p.label);
                            setLocationDesc(p.desc);
                          }}
                          className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#C8F135]/15 border-[#C8F135] text-white shadow-sm'
                              : 'bg-zinc-950/60 border-white/10 hover:border-white/20 text-white/70 hover:text-white'
                          }`}
                        >
                          <span className={`text-[10px] font-black block truncate ${isSelected ? 'text-[#C8F135]' : 'text-white'}`}>
                            {p.label}
                          </span>
                          <span className="text-[8px] text-white/40 line-clamp-1 mt-0.5">
                            {p.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Atmosphere & Film Grain Dropdown */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                    <Film className="w-3 h-3 text-[#C8F135]" />
                    <span>Film Stock & Grain</span>
                  </label>
                  <div className="relative">
                    <select
                      value={locationFilmGrain}
                      onChange={(e) => setLocationFilmGrain(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white outline-none focus:border-[#C8F135]/60 appearance-none cursor-pointer font-medium"
                    >
                      {FILM_GRAIN_OPTIONS.map((opt) => (
                        <option key={opt} value={opt} className="bg-zinc-950 text-white">
                          {opt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Lighting Mood Dropdown */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                    <Sun className="w-3 h-3 text-[#C8F135]" />
                    <span>Atmospheric Lighting</span>
                  </label>
                  <div className="relative">
                    <select
                      value={locationLighting}
                      onChange={(e) => setLocationLighting(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white outline-none focus:border-[#C8F135]/60 appearance-none cursor-pointer font-medium"
                    >
                      {LIGHTING_OPTIONS.map((opt) => (
                        <option key={opt} value={opt} className="bg-zinc-950 text-white">
                          {opt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Color Palette Swatches */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                    <Palette className="w-3 h-3 text-[#C8F135]" />
                    <span>Cinematic Color Grade Swatches</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {COLOR_PALETTES.map((cp) => {
                      const isSelected = locationPalette.includes(cp.label);
                      return (
                        <button
                          key={cp.id}
                          type="button"
                          onClick={() => setLocationPalette(`${cp.label} (${cp.desc})`)}
                          className={`p-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white/15 border-[#C8F135] text-white shadow-sm'
                              : 'bg-zinc-950/60 border-white/10 hover:border-white/20 text-white/60 hover:text-white'
                          }`}
                        >
                          <div className="flex -space-x-1 shrink-0">
                            <span className="w-2.5 h-2.5 rounded-full border border-black/40" style={{ backgroundColor: cp.colors[0] }} />
                            <span className="w-2.5 h-2.5 rounded-full border border-black/40" style={{ backgroundColor: cp.colors[1] }} />
                          </div>
                          <span className="text-[9px] font-bold truncate">{cp.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Location Name & Detailed Vision Description */}
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                      Location Name
                    </label>
                    <input
                      type="text"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="e.g. Neo-Tokyo Rain Alley"
                      className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#C8F135]/60 transition-all font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                      Cinematic Scene Vision
                    </label>
                    <textarea
                      value={locationDesc}
                      onChange={(e) => setLocationDesc(e.target.value)}
                      placeholder="Describe the environment architecture, weather, and mood..."
                      rows={3}
                      className="w-full bg-zinc-950/80 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#C8F135]/60 transition-all resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ═════════ 3. MODE: PRODUCTION PROPS ═════════ */}
            {activeMode === 'prop' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Prop Reference Photo */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center justify-between">
                    <span>Prop Reference Photo</span>
                    <span className="text-[8px] font-mono text-white/40">OPTIONAL</span>
                  </label>

                  {propRefPreview ? (
                    <div className="relative w-full h-24 rounded-xl border border-[#C8F135] bg-black overflow-hidden group">
                      <img src={propRefPreview} alt="Prop Ref" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setPropRefPreview(''); setPropRefUrl(''); studio.uploadRef(null, 'prop'); }}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/80 hover:bg-red-500 text-white transition-all cursor-pointer"
                        title="Remove Reference"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full h-20 border border-dashed border-white/20 hover:border-[#C8F135]/60 bg-zinc-950/60 hover:bg-[#C8F135]/5 rounded-xl flex items-center justify-center gap-3 p-3 cursor-pointer transition-all group">
                      <UploadCloud className="w-5 h-5 text-white/30 group-hover:text-[#C8F135] transition-colors" />
                      <div className="text-left">
                        <span className="text-[10px] font-bold text-white/80 group-hover:text-white block">
                          Upload Prop Photo / Drawing
                        </span>
                        <span className="text-[8px] text-white/30 font-mono">Reference for shape, blade, bike, or gadget</span>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handlePropRefUpload} />
                    </label>
                  )}
                </div>

                {/* Quick Prop Suggestions */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center justify-between">
                    <span>Popular Production Props</span>
                    <span className="text-[8px] font-mono text-[#C8F135]">+ ONE-CLICK</span>
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {PROP_SUGGESTIONS.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          setPropName(item.name);
                          setPropMaterial(item.material);
                          setPropDesc(item.desc);
                        }}
                        className="text-[9.5px] font-bold px-2 py-1 rounded-lg bg-zinc-950/80 hover:bg-[#C8F135]/15 hover:text-[#C8F135] text-white/70 border border-white/10 hover:border-[#C8F135]/40 transition-all cursor-pointer"
                      >
                        + {item.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prop Name & Material Specs */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                      Prop Name
                    </label>
                    <input
                      type="text"
                      value={propName}
                      onChange={(e) => setPropName(e.target.value)}
                      placeholder="e.g. Vintage Cruiser Bicycle"
                      className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#C8F135]/60 transition-all font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                      Material & Finish
                    </label>
                    <input
                      type="text"
                      value={propMaterial}
                      onChange={(e) => setPropMaterial(e.target.value)}
                      placeholder="e.g. Weathered Steel & Leather"
                      className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#C8F135]/60 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Prop Details Prompt Area */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                    Prop Details & Features
                  </label>
                  <textarea
                    value={propDesc}
                    onChange={(e) => setPropDesc(e.target.value)}
                    placeholder="Describe specific design details, wear, moving parts, engravings, or finishes..."
                    rows={3}
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#C8F135]/60 transition-all resize-none leading-relaxed"
                  />
                </div>

                {/* Default Grey Background Isolation Indicator */}
                <div className="p-3 rounded-xl border border-white/10 bg-zinc-950/80 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">
                      Seamless Gray Studio Background
                    </span>
                  </div>
                  <p className="text-[8.5px] text-white/50 leading-relaxed font-mono">
                    Props are generated fully isolated on a clean neutral grey backdrop with pure studio macro lighting, soft floor shadows, and no text.
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Sticky Bottom Action Trigger & Compact Engine Selector */}
          <div className="p-3.5 border-t border-white/10 bg-black/80 backdrop-blur-xl space-y-2">
            
            {/* Compact 3-Engine Selector */}
            <div className="flex items-center justify-between bg-zinc-950 border border-white/10 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => setSelectedEngine('banana')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-[9.5px] transition-all cursor-pointer ${
                  selectedEngine === 'banana'
                    ? 'bg-[#C8F135] text-black shadow-sm font-black'
                    : 'text-white/60 hover:text-white hover:bg-white/5 font-semibold'
                }`}
                title="Nano Banana 2 Pro (2K Master Quality)"
              >
                <Cpu className="w-3 h-3 shrink-0" />
                <span className="truncate">NB2 Pro</span>
                <span className={`text-[8px] font-mono px-1 py-0.2 rounded font-black ${
                  selectedEngine === 'banana' ? 'bg-black/20 text-black' : 'bg-white/10 text-[#C8F135]'
                }`}>
                  5 cr
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedEngine('banana2')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-[9.5px] transition-all cursor-pointer ${
                  selectedEngine === 'banana2'
                    ? 'bg-[#C8F135] text-black shadow-sm font-black'
                    : 'text-white/60 hover:text-white hover:bg-white/5 font-semibold'
                }`}
                title="Nano Banana 2 (Standard)"
              >
                <Zap className="w-3 h-3 shrink-0" />
                <span className="truncate">Nano Banana 2</span>
                <span className={`text-[8px] font-mono px-1 py-0.2 rounded font-black ${
                  selectedEngine === 'banana2' ? 'bg-black/20 text-black' : 'bg-white/10 text-emerald-400'
                }`}>
                  2 cr
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedEngine('gpt2')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-[9.5px] transition-all cursor-pointer ${
                  selectedEngine === 'gpt2'
                    ? 'bg-[#C8F135] text-black shadow-sm font-black'
                    : 'text-white/60 hover:text-white hover:bg-white/5 font-semibold'
                }`}
                title="ChatGPT 2.5"
              >
                <Sparkles className="w-3 h-3 shrink-0" />
                <span className="truncate">ChatGPT 2.5</span>
                <span className={`text-[8px] font-mono px-1 py-0.2 rounded font-black ${
                  selectedEngine === 'gpt2' ? 'bg-black/20 text-black' : 'bg-white/10 text-cyan-400'
                }`}>
                  3 cr
                </span>
              </button>
            </div>

            {/* Dynamic Mode Generate Button */}
            <button
              type="button"
              onClick={
                activeMode === 'character'
                  ? handleGenerateCharacter
                  : activeMode === 'location'
                  ? handleGenerateLocation
                  : handleGenerateProp
              }
              disabled={studio.generating || isUploading}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden shadow-xl active:scale-[0.98] ${
                studio.generating || isUploading
                  ? 'bg-zinc-900 border border-white/10 text-white/30 cursor-not-allowed'
                  : activeMode === 'character' && !hasUploadedPhoto
                    ? 'bg-white/10 hover:bg-white/15 text-white/80 border border-white/15 cursor-pointer'
                    : 'bg-[#C8F135] hover:bg-[#b8e028] text-black shadow-[0_0_25px_rgba(200,241,53,0.3)] cursor-pointer'
              }`}
            >
              {studio.generating ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  <span>
                    {activeMode === 'character'
                      ? 'Synthesizing Character Sheet...'
                      : activeMode === 'location'
                      ? 'Rendering Cinematic Location...'
                      : 'Synthesizing Studio Prop...'}
                  </span>
                </>
              ) : isUploading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Uploading Reference Photo...</span>
                </>
              ) : (
                <>
                  <Sparkles className={`w-4 h-4 ${
                    activeMode === 'character' && !hasUploadedPhoto ? 'text-[#C8F135]' : 'text-black'
                  }`} />
                  <span>
                    {activeMode === 'character'
                      ? (hasUploadedPhoto ? 'Generate Character Sheet' : 'Upload Front Photo to Generate')
                      : activeMode === 'location'
                      ? 'Generate Cinematic Location'
                      : 'Generate Studio Prop'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider ml-1 ${
                    activeMode === 'character' && !hasUploadedPhoto ? 'bg-white/10 text-white/80' : 'bg-black/20 text-black'
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
