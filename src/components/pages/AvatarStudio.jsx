import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store';
import { useAvatarStudio } from '../../hooks/useAvatarStudio';
import { useShorts } from '../../hooks/useShorts';
import {
  History, Sparkles, UploadCloud, Trash2, Camera,
  CheckCircle2, Sliders, ArrowRight, Zap, RefreshCw,
  Image as ImageIcon, Check, SlidersHorizontal, User,
  Ruler, Calendar, Shirt, Cpu, FolderKanban, Compass,
  Sword, Film, Palette, Sun, Eye, Layers, ChevronDown, Lock,
  Package, Box
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFreeImagesRemaining } from '../../utils/freeTierTracker';

import HolographicTurntable from '../avatar/HolographicTurntable';
import AvatarGallery from '../avatar/AvatarGallery';

// ── Streamlined Location Presets & Quick Inspirations (Single 1-click preset helper)
const LOCATION_QUICK_INSPIRATIONS = [
  {
    name: 'Neo-Tokyo Rain Alley',
    prompt: 'Rain-soaked asphalt, high-contrast neon signs, steaming street vents, reflective puddles, layered holographic billboards, towering cyberpunk skyscrapers in midnight drizzle'
  },
  {
    name: 'Brutalist Concrete Hall',
    prompt: 'Monumental raw concrete monoliths, dramatic raking light cutting through dusty air, geometric angular architecture, vast empty atrium'
  },
  {
    name: 'Fog-Shrouded Blackwood',
    prompt: 'Gnarled bare pine trees emerging from heavy white ground fog, cold moonlight piercing damp mist, eerie stillness, mossy boulders'
  },
  {
    name: 'Tuscan Sunset Terrace',
    prompt: 'Rolling golden hills, cypress trees silhouetted against warm violet-peach sunset, rustic stone terrace with lantern glow, vast panoramic horizon'
  },
  {
    name: 'Sahara Dunes at Dusk',
    prompt: 'Endless rippling desert sand ridges, low raking warm sunlight, fine blowing dust particles, vast dramatic horizon, complete silence'
  }
];

// ── 3 Clean Location Visual Styles (as requested: cinematic, realistic, period 1970s)
const LOCATION_STYLES = [
  {
    id: 'cinematic',
    label: 'Cinematic 35mm',
    desc: 'Panavision anamorphic film stock, organic fine grain, rich shadows',
    icon: Film
  },
  {
    id: 'realistic',
    label: 'Hyperrealistic',
    desc: 'Ultra-clean digital sensor, razor-sharp architectural clarity',
    icon: Camera
  },
  {
    id: 'period70s',
    label: 'Period / 1970s',
    desc: 'Vintage analog Kodak tone, warm nostalgic roll-off, retro cinema',
    icon: Calendar
  }
];

// ── 4 Streamlined Atmosphere & Lighting Moods (Simple, intuitive pills)
const LOCATION_LIGHTING_CHOICES = [
  { id: 'auto', label: 'Auto (From Prompt)', icon: Sparkles },
  { id: 'golden_hour', label: 'Golden Hour', icon: Sun },
  { id: 'moody_night', label: 'Moody / Night', icon: Eye },
  { id: 'overcast_fog', label: 'Overcast & Fog', icon: Layers }
];

// ── 3 Clean Prop Finishes & Styles
const PROP_STYLES = [
  {
    id: 'studio',
    label: 'Studio Product',
    desc: 'Ultra-clean commercial macro lighting, seamless studio isolation',
    icon: Package
  },
  {
    id: 'cinematic',
    label: 'Movie Prop / Weathered',
    desc: 'Production prop, authentic battle-worn patina & subtle wear',
    icon: Film
  },
  {
    id: 'scifi',
    label: 'Sci-Fi / Modern Tech',
    desc: 'Titanium & carbon composite, glowing LED micro-circuitry',
    icon: Cpu
  }
];

const PROP_SUGGESTIONS = [
  { name: 'Tactical Blaster', material: 'Matte Black Polymer & Carbon Fiber', desc: 'Sleek modular combat sidearm with integrated red targeting laser' },
  { name: 'Vintage 35mm Camera', material: 'Brushed Aluminum & Vulcanite Grip', desc: 'Vintage mechanical rangefinder camera with coated glass 50mm f/1.4 lens' },
  { name: 'Cyber Katana', material: 'Damascus Titanium & G10 Composite', desc: 'Futuristic curved blade with etched micro-circuitry and matte black hilt' },
  { name: 'Antique Pocket Watch', material: 'Engraved 18K Yellow Gold & Enamel Dial', desc: 'Victorian open-face pocket watch with exposed tourbillon escapement mechanism' },
  { name: 'Vintage Cruiser Bicycle', material: 'Chrome Plating, Sage Enamel & Tan Leather', desc: 'Classic 1960s steel-frame city commuter bicycle with leather sprung saddle' },
  { name: 'Sci-Fi Holo-Communicator', material: 'Titanium Casing & Holographic Emitter', desc: 'Handheld holographic disk with glowing blue optical projector array' }
];

export default function AvatarStudio() {
  const userProfile = useAppStore(state => state.userProfile);
  const userShorts = useAppStore(state => state.userShorts);
  const isAdmin = userProfile?.email === 'premspaw@gmail.com';
  const { shorts, canAfford, refresh: refreshShorts } = useShorts();
  const userCredits = shorts ?? userShorts ?? 0;
  const userId = userProfile?.id || 'anon';

  // Free Tier Tracker: 3 Free Images for Regular Users with Nano Banana 2
  const [freeImagesRemaining, setFreeImagesRemaining] = useState(() => getFreeImagesRemaining(userId));

  useEffect(() => {
    const handleUpdate = () => setFreeImagesRemaining(getFreeImagesRemaining(userId));
    window.addEventListener('zerolens_freetier_updated', handleUpdate);
    return () => window.removeEventListener('zerolens_freetier_updated', handleUpdate);
  }, [userId]);

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

  // Streamlined Location State
  const [locationName, setLocationName] = useState('');
  const [locationDesc, setLocationDesc] = useState('');
  const [selectedLocationPreset, setSelectedLocationPreset] = useState('');
  const [locationStyle, setLocationStyle] = useState('cinematic'); // 'cinematic' | 'realistic' | 'period70s'
  const [locationLighting, setLocationLighting] = useState('auto'); // 'auto' | 'golden_hour' | 'moody_night' | 'overcast_fog'
  const [locationRefPreview, setLocationRefPreview] = useState('');
  const [locationRefUrl, setLocationRefUrl] = useState('');
  const [isUploadingLocationRef, setIsUploadingLocationRef] = useState(false);

  // Streamlined Prop State
  const [propName, setPropName] = useState('');
  const [propMaterial, setPropMaterial] = useState('');
  const [propDesc, setPropDesc] = useState('');
  const [selectedPropPreset, setSelectedPropPreset] = useState('');
  const [propStyle, setPropStyle] = useState('studio'); // 'studio' | 'cinematic' | 'scifi'
  const [propRefPreview, setPropRefPreview] = useState('');
  const [propRefUrl, setPropRefUrl] = useState('');
  const [isUploadingPropRef, setIsUploadingPropRef] = useState(false);

  // Engine selection: 'banana' = Nano Banana 2 Pro (5 cr), 'banana2' = Nano Banana 2 (2 cr / FREE for first 3), 'gpt2' = ChatGPT Image 2.5 (3 cr)
  const [selectedEngine, setSelectedEngine] = useState(() => (!isAdmin ? 'banana2' : 'banana'));

  const isFreeEligible = !isAdmin && selectedEngine === 'banana2' && freeImagesRemaining > 0;
  const requiredCredits = isFreeEligible ? 0 : (selectedEngine === 'banana' ? 5 : selectedEngine === 'banana2' ? 2 : 3);
  const isUploading = !!(
    studio.uploadingRef ||
    studio.uploadingLeftProfile ||
    studio.uploadingWardrobe ||
    isUploadingLocationRef ||
    isUploadingPropRef
  );
  const hasUploadedPhoto = !!(studio.refPreview || studio.refImageUrl);
  const hasCredits = isAdmin || isFreeEligible || userCredits >= requiredCredits;
  const canGenerate = !studio.generating && !isUploading;

  const handleSelectEngine = (engine) => {
    if (engine === 'gpt2' && !isAdmin) {
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast('ChatGPT 2.5 is a Pro feature. Upgrade to unlock!', 'info');
      useAppStore.getState().setActiveTab('pricing');
      return;
    }
    setSelectedEngine(engine);
  };

  // Drop-up menu state & outside-click listener
  const [isEngineMenuOpen, setIsEngineMenuOpen] = useState(false);
  const engineMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (engineMenuRef.current && !engineMenuRef.current.contains(e.target)) {
        setIsEngineMenuOpen(false);
      }
    };
    if (isEngineMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEngineMenuOpen]);

  const ENGINES = [
    {
      id: 'banana2',
      name: 'Nano Banana 2',
      shortName: 'Nano Banana 2',
      badge: isFreeEligible ? 'FREE' : '2 cr',
      badgeColor: isFreeEligible
        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
        : 'bg-white/10 text-emerald-400 border-emerald-500/30',
      desc: isFreeEligible
        ? `Free Trial Active (${freeImagesRemaining}/3 left) • 2 cr after`
        : 'Standard photorealistic generation • 2 cr',
      icon: Zap,
      iconColor: 'text-emerald-400'
    },
    {
      id: 'banana',
      name: 'Nano Banana 2 Pro',
      shortName: 'NB2 Pro',
      badge: '5 cr',
      badgeColor: 'bg-[#C8F135]/20 text-[#C8F135] border-[#C8F135]/40',
      desc: '2K Master Quality • Ultra-high fidelity & micro-details',
      icon: Cpu,
      iconColor: 'text-[#C8F135]'
    },
    {
      id: 'gpt2',
      name: 'ChatGPT Image 2.5',
      shortName: 'ChatGPT 2.5',
      badge: !isAdmin ? 'PRO' : '3 cr',
      badgeColor: !isAdmin
        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
        : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
      desc: !isAdmin ? 'Pro feature • Click to unlock upgrade' : 'OpenAI cinematic image synthesis',
      icon: !isAdmin ? Lock : Sparkles,
      iconColor: !isAdmin ? 'text-amber-400' : 'text-cyan-400'
    }
  ];

  const activeEngineObj = ENGINES.find(e => e.id === selectedEngine) || ENGINES[0];

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
      isFreeTier: isFreeEligible,
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

  // 2. Generate Cinematic Location (Location Scout Protocol - Strictly No Humans)
  const handleGenerateLocation = () => {
    if (studio.generating || isUploading) return;

    if (!hasCredits) {
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast(`Insufficient Credits: Need ${requiredCredits} Shorts (Balance: ${userCredits}).`, 'error');
      return;
    }

    const desc = locationDesc.trim();
    if (!desc) {
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast('Please enter a location prompt or select an inspiration preset.', 'warning');
      return;
    }

    const name = locationName.trim() || 'Cinematic Location';

    // Style prompt builder based on 2-3 clean options (as requested)
    let stylePrompt = '';
    if (locationStyle === 'cinematic') {
      stylePrompt = 'Aesthetic: Masterful 35mm Panavision anamorphic cinematography, fine organic film grain, rich shadow roll-off, widescreen panoramic depth.';
    } else if (locationStyle === 'realistic') {
      stylePrompt = 'Aesthetic: Hyperrealistic ultra-high resolution photography, pristine digital medium-format sensor, razor-sharp architectural edge clarity, real-world textures.';
    } else if (locationStyle === 'period70s') {
      stylePrompt = 'Aesthetic: Authentic vintage period film photography (1970s-1980s Kodak cinema aesthetic), warm nostalgic color saturation, analog film softness, subtle halation.';
    }

    let lightingPrompt = '';
    if (locationLighting === 'golden_hour') {
      lightingPrompt = 'Lighting & Atmosphere: Low-angle warm golden hour sunlight, long cinematic shadows, warm atmospheric haze.';
    } else if (locationLighting === 'moody_night') {
      lightingPrompt = 'Lighting & Atmosphere: Moody nocturnal ambiance, deep obsidian shadow pockets, atmospheric wet surface reflections, soft streetlamp/neon glow.';
    } else if (locationLighting === 'overcast_fog') {
      lightingPrompt = 'Lighting & Atmosphere: Soft shadowless overcast diffusion, cool volumetric mist and ground fog, moody stillness.';
    }

    const masterLocationPrompt = `Professional cinematic location scouting photography. 8K resolution, master wide panoramic establishing shot.
Scene & Location Vision: ${desc}.
${stylePrompt ? stylePrompt + '\n' : ''}${lightingPrompt ? lightingPrompt + '\n' : ''}Widescreen 16:9 cinematic composition, hyperrealistic spatial depth, monumental scale, authentic physical materials, photorealistic environment textures.
STRICT NEGATIVE EXCLUSIONS: Absolutely NO people, NO characters, NO humans, NO person present, NO crowds, NO pedestrians, NO silhouettes of people, completely empty, vacant and deserted location scene. Pure cinematic environment only. NO text, NO watermarks, NO logos, NO character turnaround sheet, NO multiple split panels.`;

    studio.generateBoard({
      boardType: 'LOCATION',
      model: selectedEngine,
      aspectRatio: '16:9',
      isFreeTier: isFreeEligible,
      additionalContext: masterLocationPrompt,
      boardMeta: {
        name,
        setting: desc,
        era: locationStyle === 'period70s' ? '1970s Vintage Period' : 'Contemporary Cinematic',
        timeOfDay: locationLighting,
        weather: locationStyle,
        colorPalette: locationStyle
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

    const desc = propDesc.trim();
    if (!desc) {
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast('Please enter a prop prompt or select a popular prop.', 'warning');
      return;
    }

    const name = propName.trim() || 'Production Prop';
    const material = propMaterial.trim();

    let stylePrompt = '';
    if (propStyle === 'studio') {
      stylePrompt = 'Aesthetic: Ultra-clean high-end commercial studio product photography. Pristine finish, soft diffused studio lighting, razor-sharp edge fidelity.';
    } else if (propStyle === 'cinematic') {
      stylePrompt = 'Aesthetic: Movie production prop, authentic battle-worn weathering, realistic patina, subtle surface micro-scratches, tactile physical history.';
    } else if (propStyle === 'scifi') {
      stylePrompt = 'Aesthetic: Futuristic sci-fi hardware, titanium and carbon composite materials, subtle luminescent LED micro-indicators, aerospace ergonomics.';
    }

    const materialText = material ? `Materials & Finish: ${material}.\n` : '';

    const masterPropPrompt = `Photorealistic production studio prop photography. Isolated entirely on a seamless neutral light gray studio background.
${stylePrompt ? stylePrompt + '\n' : ''}${materialText}Prop Specifications & Details: ${desc}.
Lighting: Professional soft 3-point studio lighting with subtle soft ground shadow. Complete profile clearly visible with microscopic surface texture fidelity.
STRICT NEGATIVE EXCLUSIONS: Absolutely NO human hands, NO person holding it, NO people, NO text, NO labels, NO logos, NO watermarks, NO character turnaround, NO multiple panels, clean pristine isolated studio prop asset on seamless neutral light gray background.`;

    studio.generateBoard({
      boardType: 'OBJECT',
      model: selectedEngine,
      aspectRatio: '16:9',
      isFreeTier: isFreeEligible,
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
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-[#C8F135]/40 hover:border-[#C8F135] bg-[#C8F135]/10 hover:bg-[#C8F135]/20 text-[#C8F135] text-xs font-bold transition-all shadow-[0_0_15px_rgba(200,241,53,0.12)] cursor-pointer group"
            title="Open Generation History"
          >
            <History className="w-4 h-4 text-[#C8F135] group-hover:rotate-[-30deg] transition-transform" />
            <span>History</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#C8F135] text-black font-black">
              {studio.gallery.length}
            </span>
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
                {/* 1. Reference Image / Mood Board */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-3 h-3 text-[#C8F135]" />
                      <span>Reference Image / Mood</span>
                    </span>
                    <span className="text-[8px] font-mono text-white/40">OPTIONAL</span>
                  </label>

                  {locationRefPreview ? (
                    <div className="relative w-full h-24 rounded-xl border border-[#C8F135] bg-black overflow-hidden group">
                      <img src={locationRefPreview} alt="Location Mood Reference" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setLocationRefPreview(''); setLocationRefUrl(''); studio.uploadRef(null, 'character'); }}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/80 hover:bg-red-500 text-white transition-all cursor-pointer"
                        title="Remove Reference"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-[8px] font-mono text-[#C8F135]">
                        Mood / Style Reference Attached
                      </div>
                    </div>
                  ) : (
                    <label className="w-full h-20 border border-dashed border-white/20 hover:border-[#C8F135]/60 bg-zinc-950/60 hover:bg-[#C8F135]/5 rounded-xl flex items-center justify-center gap-3 p-3 cursor-pointer transition-all group">
                      <UploadCloud className="w-5 h-5 text-white/30 group-hover:text-[#C8F135] transition-colors" />
                      <div className="text-left">
                        <span className="text-[10px] font-bold text-white/80 group-hover:text-white block">
                          Upload Mood / Reference Image
                        </span>
                        <span className="text-[8px] text-white/35 font-mono">Guide architecture, palette, or lighting atmosphere</span>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLocationRefUpload} />
                    </label>
                  )}
                </div>

                {/* 2. Visual Render Style Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Film className="w-3 h-3 text-[#C8F135]" />
                      <span>Visual Render Style</span>
                    </span>
                    <span className="text-[8px] font-mono text-[#C8F135]">AESTHETIC</span>
                  </label>
                  <div className="relative">
                    <select
                      value={locationStyle}
                      onChange={(e) => setLocationStyle(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2.5 text-xs text-white appearance-none cursor-pointer focus:outline-none focus:border-[#C8F135]/60 transition-all font-medium pr-9"
                    >
                      {LOCATION_STYLES.map((style) => (
                        <option key={style.id} value={style.id} className="bg-zinc-900 text-white">
                          {style.label} — {style.desc}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 3. Atmospheric Lighting Mood Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sun className="w-3 h-3 text-[#C8F135]" />
                      <span>Atmospheric Lighting Mood</span>
                    </span>
                    <span className="text-[8px] font-mono text-white/40">OPTIONAL OVERRIDE</span>
                  </label>
                  <div className="relative">
                    <select
                      value={locationLighting}
                      onChange={(e) => setLocationLighting(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2.5 text-xs text-white appearance-none cursor-pointer focus:outline-none focus:border-[#C8F135]/60 transition-all font-medium pr-9"
                    >
                      {LOCATION_LIGHTING_CHOICES.map((mood) => (
                        <option key={mood.id} value={mood.id} className="bg-zinc-900 text-white">
                          {mood.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 4. Location Inspiration Preset Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Compass className="w-3 h-3 text-[#C8F135]" />
                      <span>Location Preset Inspiration</span>
                    </span>
                    <span className="text-[8px] font-mono text-white/40">QUICK LOAD</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedLocationPreset}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedLocationPreset(val);
                        if (!val) {
                          setLocationDesc('');
                          setLocationName('');
                        } else {
                          const found = LOCATION_QUICK_INSPIRATIONS.find(item => item.name === val);
                          if (found) {
                            // Populate prompt with pure scene description only (never inject or prepend name)
                            setLocationDesc(found.prompt);
                            setLocationName(found.name);
                          }
                        }
                      }}
                      className="w-full bg-zinc-950/80 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2.5 text-xs text-white appearance-none cursor-pointer focus:outline-none focus:border-[#C8F135]/60 transition-all font-medium pr-9"
                    >
                      <option value="" className="bg-zinc-900 text-white/60">
                        Custom Prompt (Blank / Paste from Claude or GPT)
                      </option>
                      {LOCATION_QUICK_INSPIRATIONS.map((item) => (
                        <option key={item.name} value={item.name} className="bg-zinc-900 text-white">
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 5. Hero Prompt Input (Direct from Claude, GPT, or Custom Vision) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-[#C8F135]" />
                      <span>Location Prompt</span>
                      <span className="text-[8px] px-1.5 py-0.2 rounded bg-[#C8F135]/15 text-[#C8F135] font-mono font-bold">
                        CLAUDE / GPT READY
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setLocationDesc('');
                        setSelectedLocationPreset('');
                      }}
                      className="text-[9px] text-white/40 hover:text-white transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>

                  <textarea
                    value={locationDesc}
                    onChange={(e) => {
                      setLocationDesc(e.target.value);
                      if (selectedLocationPreset) setSelectedLocationPreset('');
                    }}
                    placeholder="Paste your location prompt directly from Claude, GPT, or Gemini (e.g. Abandoned Brutalist observatory on a foggy mountain peak at twilight, glowing amber interior lights, rain-soaked concrete)..."
                    rows={4}
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#C8F135]/60 focus:ring-1 focus:ring-[#C8F135]/40 transition-all resize-none leading-relaxed font-sans"
                  />
                </div>

                {/* Optional Location Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                    Location Title / Identifier <span className="text-white/30 font-normal font-mono">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="e.g. Neo-Tokyo Rain Alley"
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#C8F135]/60 transition-all font-medium"
                  />
                </div>

                {/* Strict No-Human Location Scout Guarantee Banner */}
                <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9.5px] font-black text-emerald-300 uppercase tracking-wider">
                      Cinematic Location Scout Protocol Active
                    </span>
                  </div>
                  <p className="text-[8.5px] text-emerald-100/60 leading-relaxed font-mono">
                    Strict Negative Prompt Active: 100% pure cinematic establishing shot. Absolutely NO humans, persons, pedestrians, or silhouettes will be generated.
                  </p>
                </div>
              </div>
            )}

            {/* ═════════ 3. MODE: PRODUCTION PROPS ═════════ */}
            {activeMode === 'prop' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* 1. Prop Reference Photo / Drawing */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-3 h-3 text-[#C8F135]" />
                      <span>Prop Reference Photo / Drawing</span>
                    </span>
                    <span className="text-[8px] font-mono text-white/40">OPTIONAL</span>
                  </label>

                  {propRefPreview ? (
                    <div className="relative w-full h-24 rounded-xl border border-[#C8F135] bg-black overflow-hidden group">
                      <img src={propRefPreview} alt="Prop Reference" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setPropRefPreview(''); setPropRefUrl(''); studio.uploadRef(null, 'prop'); }}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/80 hover:bg-red-500 text-white transition-all cursor-pointer"
                        title="Remove Reference"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-[8px] font-mono text-[#C8F135]">
                        Prop Reference Attached
                      </div>
                    </div>
                  ) : (
                    <label className="w-full h-20 border border-dashed border-white/20 hover:border-[#C8F135]/60 bg-zinc-950/60 hover:bg-[#C8F135]/5 rounded-xl flex items-center justify-center gap-3 p-3 cursor-pointer transition-all group">
                      <UploadCloud className="w-5 h-5 text-white/30 group-hover:text-[#C8F135] transition-colors" />
                      <div className="text-left">
                        <span className="text-[10px] font-bold text-white/80 group-hover:text-white block">
                          Upload Prop Photo / Concept Sketch
                        </span>
                        <span className="text-[8px] text-white/35 font-mono">Guide prop silhouette, blade, bike, camera, or gadget form</span>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handlePropRefUpload} />
                    </label>
                  )}
                </div>

                {/* 2. Prop Finish & Style Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Package className="w-3 h-3 text-[#C8F135]" />
                      <span>Prop Finish & Style</span>
                    </span>
                    <span className="text-[8px] font-mono text-[#C8F135]">FINISH</span>
                  </label>
                  <div className="relative">
                    <select
                      value={propStyle}
                      onChange={(e) => setPropStyle(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2.5 text-xs text-white appearance-none cursor-pointer focus:outline-none focus:border-[#C8F135]/60 transition-all font-medium pr-9"
                    >
                      {PROP_STYLES.map((style) => (
                        <option key={style.id} value={style.id} className="bg-zinc-900 text-white">
                          {style.label} — {style.desc}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 3. Prop Preset Inspiration Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Box className="w-3 h-3 text-[#C8F135]" />
                      <span>Prop Preset Inspiration</span>
                    </span>
                    <span className="text-[8px] font-mono text-white/40">QUICK LOAD</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedPropPreset}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedPropPreset(val);
                        if (!val) {
                          setPropDesc('');
                          setPropName('');
                          setPropMaterial('');
                        } else {
                          const found = PROP_SUGGESTIONS.find(item => item.name === val);
                          if (found) {
                            // Populate prompt with pure description only (never inject or prepend name)
                            setPropName(found.name);
                            setPropMaterial(found.material);
                            setPropDesc(found.desc);
                          }
                        }
                      }}
                      className="w-full bg-zinc-950/80 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2.5 text-xs text-white appearance-none cursor-pointer focus:outline-none focus:border-[#C8F135]/60 transition-all font-medium pr-9"
                    >
                      <option value="" className="bg-zinc-900 text-white/60">
                        Custom Prop Prompt (Blank / Paste from Claude or GPT)
                      </option>
                      {PROP_SUGGESTIONS.map((item) => (
                        <option key={item.name} value={item.name} className="bg-zinc-900 text-white">
                          {item.name} ({item.material})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 4. Hero Prop Prompt & Specifications */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-[#C8F135]" />
                      <span>Prop Prompt & Specifications</span>
                      <span className="text-[8px] px-1.5 py-0.2 rounded bg-[#C8F135]/15 text-[#C8F135] font-mono font-bold">
                        CLAUDE / GPT READY
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setPropDesc('');
                        setSelectedPropPreset('');
                      }}
                      className="text-[9px] text-white/40 hover:text-white transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>

                  <textarea
                    value={propDesc}
                    onChange={(e) => {
                      setPropDesc(e.target.value);
                      if (selectedPropPreset) setSelectedPropPreset('');
                    }}
                    placeholder="Paste prop prompt directly from Claude/GPT or describe specific details, mechanisms, wear, and engravings..."
                    rows={3}
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#C8F135]/60 focus:ring-1 focus:ring-[#C8F135]/40 transition-all resize-none leading-relaxed font-sans"
                  />
                </div>

                {/* 4. Prop Name & Material Specs */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                      Prop Name / Title
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
                      placeholder="e.g. Chrome Plating & Enamel"
                      className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#C8F135]/60 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Studio Isolation Guarantee Banner */}
                <div className="p-3 rounded-xl border border-white/10 bg-zinc-950/80 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#C8F135]" />
                    <span className="text-[9.5px] font-black text-white uppercase tracking-wider">
                      Studio Prop Isolation Protocol Active
                    </span>
                  </div>
                  <p className="text-[8.5px] text-white/50 leading-relaxed font-mono">
                    Seamless Neutral Gray Studio Backdrop · Zero Hands / No Persons · Pure Isolated Prop Photography
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Sticky Bottom Action Trigger & Compact Engine Selector */}
          <div className="p-3.5 border-t border-white/10 bg-black/80 backdrop-blur-xl space-y-2">
            
            {/* Free Tier Announcement Banner for Regular Users */}
            {!isAdmin && (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[10px] shadow-sm">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span>🎁</span>
                  <span>{freeImagesRemaining > 0 ? (
                    <>Free Trial: <strong className="text-white">{freeImagesRemaining}/3 free images</strong> left</>
                  ) : (
                    <span className="text-zinc-300">Free trial completed • 2 cr / image</span>
                  )}</span>
                </span>
                <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">Nano Banana 2</span>
              </div>
            )}

            {/* Drop-up Image Engine Selector */}
            <div className="relative" ref={engineMenuRef}>
              {/* Drop-up Floating Menu */}
              <AnimatePresence>
                {isEngineMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.97 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute bottom-full left-0 right-0 mb-2 p-1.5 rounded-2xl bg-zinc-950/95 border border-white/15 backdrop-blur-2xl shadow-[0_-12px_36px_rgba(0,0,0,0.85)] z-50 space-y-1"
                  >
                    <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-white/10">
                      <span className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3 h-3 text-[#C8F135]" />
                        <span>Select Image Engine</span>
                      </span>
                      <span className="text-[9px] font-mono text-[#C8F135] font-bold">
                        {userCredits} Shorts Avail
                      </span>
                    </div>

                    <div className="space-y-1">
                      {ENGINES.map((eng) => {
                        const isSelected = selectedEngine === eng.id;
                        const IconComp = eng.icon;
                        return (
                          <button
                            key={eng.id}
                            type="button"
                            onClick={() => {
                              handleSelectEngine(eng.id);
                              if (isAdmin || eng.id !== 'gpt2') {
                                setIsEngineMenuOpen(false);
                              }
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white/10 border border-[#C8F135]/50 shadow-sm'
                                : 'hover:bg-white/5 border border-transparent text-white/70 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`p-2 rounded-lg bg-black/60 border border-white/10 shrink-0 ${eng.iconColor}`}>
                                <IconComp className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-white truncate">{eng.name}</span>
                                  {isSelected && (
                                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#C8F135]">
                                      <Check className="w-3 h-3" />
                                      <span className="text-[9px] uppercase font-mono tracking-wider">Active</span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9.5px] text-white/50 truncate leading-tight mt-0.5">
                                  {eng.desc}
                                </p>
                              </div>
                            </div>

                            <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md border shrink-0 ${eng.badgeColor}`}>
                              {eng.badge}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Drop-up Trigger Button */}
              <button
                type="button"
                onClick={() => setIsEngineMenuOpen(prev => !prev)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all cursor-pointer shadow-sm ${
                  isEngineMenuOpen
                    ? 'bg-zinc-900 border-[#C8F135]/60 text-white shadow-[0_0_15px_rgba(200,241,53,0.15)]'
                    : 'bg-zinc-950/90 border-white/10 hover:border-white/25 hover:bg-zinc-900/90 text-white/90'
                }`}
                title="Click to select AI Image Engine (Drop-up menu)"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-1.5 rounded-lg bg-white/5 border border-white/10 shrink-0 ${activeEngineObj.iconColor}`}>
                    <activeEngineObj.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-white/40 font-mono uppercase tracking-wider">Engine:</span>
                      <span className="text-xs font-bold text-white truncate">{activeEngineObj.name}</span>
                    </div>
                    <p className="text-[9px] text-white/40 truncate leading-none mt-0.5">
                      {activeEngineObj.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`text-[9.5px] font-mono font-black px-2 py-0.5 rounded-md border ${activeEngineObj.badgeColor}`}>
                    {activeEngineObj.badge}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform duration-200 ${
                    isEngineMenuOpen ? 'rotate-180 text-[#C8F135]' : ''
                  }`} />
                </div>
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
            setActivePrompt={studio.setActivePrompt}
            userId={userId}
            activeMode={activeMode}
            gallery={studio.gallery}
            onOpenGallery={() => setIsGalleryOpen(true)}
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
