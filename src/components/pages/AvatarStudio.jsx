import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store';
import { useAvatarStudio } from '../../hooks/useAvatarStudio';
import { useShorts } from '../../hooks/useShorts';
import {
  History, Sparkles, UploadCloud, Trash2, Camera,
  CheckCircle2, Sliders, ArrowRight, Zap, RefreshCw,
  Image as ImageIcon, Check, SlidersHorizontal, User,
  Ruler, Calendar, Shirt, Cpu, FolderKanban, Compass,
  Sword, Film, Palette, Sun, Eye, Layers, ChevronDown, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFreeImagesRemaining } from '../../utils/freeTierTracker';

import HolographicTurntable from '../avatar/HolographicTurntable';
import AvatarGallery from '../avatar/AvatarGallery';

const LOCATION_PRESET_GROUPS = [
  {
    category: 'Sci-Fi & Cyberpunk',
    options: [
      { id: 'neotokyo', label: 'Neo-Tokyo Rain Alley', desc: 'Rain-soaked asphalt, high-contrast neon signs, steaming street vents, reflective puddles, layered holographic billboards' },
      { id: 'megastructure', label: 'Sci-Fi Megastructure Bay', desc: 'Immense titanium hangar bay, blue atmospheric energy conduits, monumental scale, glowing overhead gantry cranes' },
      { id: 'orbital', label: 'Orbital Biosphere Dome', desc: 'Futuristic curved glass geodesic dome overlooking Earth horizon, lush zero-gravity hydroponics, clean minimalist architecture' },
      { id: 'cyber_bazaar', label: 'Cyber Underbelly Market', desc: 'Dense layered cyber bazaar, tangled neon cables, narrow wet alleyways, flickering halogen lanterns, street food steam' }
    ]
  },
  {
    category: 'Cinematic Noir & Urban Thriller',
    options: [
      { id: 'midnight_diner', label: 'Midnight Neon Diner', desc: '1980s retro American diner interior, chrome counter, red leather booths, rain streaked panoramic windows, neon reflection' },
      { id: 'brutalist_hall', label: 'Brutalist Concrete Hall', desc: 'Monumental raw concrete monoliths, dramatic raking light cutting through dusty air, geometric angular architecture' },
      { id: 'rainy_soho', label: 'SoHo Cobblestone Rain', desc: 'Wet dark cobblestones reflecting warm streetlamps, cast-iron building facades, foggy midnight mist, moody urban solitude' },
      { id: 'underground_metro', label: 'Derelict Metro Station', desc: 'Subway tiled walls with faded vintage posters, wet tracks receding into dark tunnel, flickering industrial fluorescents' }
    ]
  },
  {
    category: 'Horror & Dark Mystery',
    options: [
      { id: 'blackwood', label: 'Fog-Shrouded Blackwood Forest', desc: 'Gnarled bare pine trees emerging from heavy white ground fog, cold moonlight piercing damp mist, eerie stillness' },
      { id: 'gothic_cathedral', label: 'Ruined Gothic Cathedral Crypt', desc: 'Crumbling pointed stone arches, mossy gargoyles, fractured stained glass windows casting crimson shadows' },
      { id: 'sanatorium', label: 'Abandoned Victorian Sanatorium', desc: 'Peeling lead paint on long vaulted corridor, tilted rusted gurneys, dust motes in cold shafts of moonlight' },
      { id: 'isolated_cabin', label: 'Isolated Lakeside Cabin', desc: 'Weather-beaten dark timber cabin at the edge of a black motionless mountain lake, ominous fog rolling over water' }
    ]
  },
  {
    category: 'Action & Adventure',
    options: [
      { id: 'sahara_dunes', label: 'Golden Hour Sahara Dunes', desc: 'Endless rippling desert sand ridges, low raking warm sunlight, fine blowing dust particles, vast dramatic horizon' },
      { id: 'glacial_ridge', label: 'Alpine Glacial Ridge', desc: 'Pristine mirror reflections, snow-dusted jagged mountain peaks, crystal glacial waters, sharp biting wind' },
      { id: 'jungle_temple', label: 'Overgrown Jungle Temple Ruins', desc: 'Ancient stepped stone ziggurat enveloped in thick vines, sunbeams filtering through dense misty rainforest canopy' },
      { id: 'carrier_deck', label: 'Stormy Sea Carrier Deck', desc: 'Wet steel flight deck, crashing ocean spray, turbulent dark gray thunderclouds, yellow warning stripes' }
    ]
  },
  {
    category: 'Romance & Atmospheric Drama',
    options: [
      { id: 'tuscany', label: 'Tuscan Sunset Vineyard Terrace', desc: 'Rolling golden hills, cypress trees silhouetted against warm violet-peach sunset, rustic stone terrace with lantern glow' },
      { id: 'kyoto_grove', label: 'Rainy Kyoto Bamboo Grove', desc: 'Towering green bamboo stalks, stone lantern path glistening with fresh rain, soft tranquil mist, emerald tranquility' },
      { id: 'amalfi', label: 'Amalfi Coastal Cliffside', desc: 'Pastel cliffside villas cascading into deep sapphire Mediterranean sea, golden afternoon sun, gentle sea breeze' },
      { id: 'autumn_avenue', label: 'Central Park Autumn Promenade', desc: 'Golden yellow elm trees forming a vibrant canopy, fallen amber leaves, wet park benches, soft romantic light' }
    ]
  }
];

const FILM_GRAIN_METADATA = [
  {
    id: 'none',
    label: 'None (Clean Digital Sensor / Zero Grain)',
    bestFor: 'Modern architectural interiors, sci-fi megastructures, clean tech spaces, pristine renders',
    characteristics: 'Ultra-clean digital sensor, no grain noise, pristine sharp edge definition, maximum clarity'
  },
  {
    id: 'kodak35',
    label: '35mm Kodak Vision3 500T (Fine Organic Grain, Warm Shadow Roll-off)',
    bestFor: 'Night streets, city alleys, moody interiors, neon diners, classic cinematic movies',
    characteristics: 'Hollywood gold standard; authentic organic fine grain, warm gentle highlight halation, rich shadow depth'
  },
  {
    id: 'imax70',
    label: '70mm IMAX 15-perf (Monumental Crisp Dynamic Range, Ultra-Detailed)',
    bestFor: 'Vast outdoor landscapes, epic mountain ranges, desert dunes, grand brutalist architecture',
    characteristics: 'Gigantic canvas resolution, microscopic micro-detail, razor-sharp edge contrast, virtually imperceptible grain'
  },
  {
    id: 'anamorphic',
    label: 'Panavision C-Series Anamorphic (Gentle Oval Bokeh, Subtle Blue Streak Flare)',
    bestFor: 'Widescreen cinematic vistas, cyberpunk highways, action establishing shots, sunsets',
    characteristics: '2.39:1 widescreen optical personality, oval light bokeh, gentle horizontal blue lens flares, subtle optical barrel distortion'
  },
  {
    id: 'ektachrome16',
    label: '16mm Vintage Kodak Ektachrome (Textured Organic Grain, Saturated Roll-off)',
    bestFor: 'Retro 70s/80s locations, sun-drenched beaches, vintage motel courtyards, indie music video vibes',
    characteristics: 'Reversal film look; prominent organic grain texture, high vibrancy, punchy saturated colors, warm nostalgic roll-off'
  },
  {
    id: 'arri_alexa',
    label: 'Arri Alexa RAW LogC3 (Velvety Smooth Contrast, Industry Feature Standard)',
    bestFor: 'Prestige drama locations, foggy forests, rainy European streets, museum galleries',
    characteristics: 'The most popular modern film sensor; velvety soft highlight rolloff, smooth shadow transitions, natural filmic softness'
  },
  {
    id: 'trix16',
    label: '16mm Kodak Tri-X B&W (Punchy High-Contrast Analog Monochrome Texture)',
    bestFor: 'Film Noir crime scenes, dramatic brutalist ruins, gritty industrial warehouses, abandoned sanatoriums',
    characteristics: 'Iconic monochrome silver-gelatin emulsion; heavy tactile grain, deep inky blacks, stark white highlights'
  },
  {
    id: 'fuji_eterna',
    label: 'Fujifilm Eterna 250D (Subtle Pastel Tones, Soft Highlight Roll-off)',
    bestFor: 'Misty bamboo groves, overcast coastal cliffs, dreamlike pastel landscapes, Japanese cinema',
    characteristics: 'Subdued, gentle Japanese film aesthetic; muted low-contrast shadows, soft pastel colors, ethereal atmospheric haze'
  },
  {
    id: 'technicolor',
    label: 'Technicolor 3-Strip (Hyper-Stylized Vintage 1950s Color Saturation)',
    bestFor: 'Golden Hollywood sets, fairy-tale enchanted gardens, retro diners, hyper-vibrant fantasy realms',
    characteristics: 'Historical 3-strip dye transfer process; extreme rich saturation in reds and greens, deep glossy blacks, vivid hyper-reality'
  }
];

const FILM_GRAIN_OPTIONS = FILM_GRAIN_METADATA.map(s => s.label);

const LIGHTING_OPTIONS_GROUPED = [
  {
    category: 'Natural & Time of Day',
    options: [
      'None (Natural Ambient Scene Lighting)',
      'Golden Hour Sunset (Low warm raking light, long cinematic shadows)',
      'Blue Hour / Twilight (Crisp pre-dawn cool ambient luminance, deep azure)',
      'Overcast Daylight (Soft shadowless studio diffusion, ultra-even tones)',
      'Harsh Midday Desert Sun (Blinding high-noon heat shimmer, crisp hard shadows)',
      'Moonlit Night (Soft cool silvery illumination, deep obsidian shadow pockets)'
    ]
  },
  {
    category: 'Dramatic & High Contrast',
    options: [
      'Volumetric Fog & Sunbeams (Dramatic atmospheric God rays through haze)',
      'Moody Midnight Noir (Chiaroscuro high-contrast hard key light, silhouette edge)',
      'Rim-Lit Silhouette (Powerful golden backlighting, halo edge glow, darkened core)',
      'Thunderstorm Lightning Flash (Momentary high-voltage stark flash against darkness)'
    ]
  },
  {
    category: 'Horror & Suspense Lighting',
    options: [
      'Sickly Fluorescent (Flickering industrial green-tinted institutional tube lights)',
      'Ominous Crimson Emergency Beacon (Slow pulsating ruby red warning wash)',
      'Single Overhead Spotlight (Harsh interrogation downlight, black void surround)',
      'Flashlight Cone in Darkness (Narrow harsh beam cutting through dense particulate)'
    ]
  },
  {
    category: 'Stylized, Neon & Practical',
    options: [
      'Cyber Neon Glow & Wet Reflections (Vibrant localized cyan & magenta bounce)',
      'Warm Candlelight & Fireplace (Intimate romantic amber flickering glow, soft shadows)',
      'Sodium-Vapor Streetlamp (Moody 1970s yellow-orange urban nocturnal glow)',
      'Bioluminescent Ethereal Glow (Alien luminescent blue-teal organic light)'
    ]
  }
];

const CINEMATIC_COLOR_GRADES = [
  {
    category: 'Default / Natural',
    grades: [
      { id: 'none', label: 'None (Natural Unprocessed Grade)', colors: ['#71717A', '#A1A1AA'], mood: 'Pure, true-to-life sensor color balance with zero stylized tint' }
    ]
  },
  {
    category: 'Director & Auteur Aesthetics',
    grades: [
      { id: 'fincher', label: 'David Fincher Noir (Fight Club / Mindhunter)', colors: ['#475569', '#556B2F'], mood: 'Desaturated olive-green tint, clinical cold precision, crushed shadow blacks' },
      { id: 'nolan', label: 'Christopher Nolan Realism (Oppenheimer / Inception)', colors: ['#38BDF8', '#334155'], mood: 'Cool steel-cyan wash, deep textured shadows, muted filmic earth tones' },
      { id: 'villeneuve', label: 'Denis Villeneuve & Deakins (Dune / Blade Runner 2049)', colors: ['#F59E0B', '#78350F'], mood: 'Warm ochre & amber haze, desaturated high-contrast minimalist scale' },
      { id: 'wes_anderson', label: 'Wes Anderson Pastel (Grand Budapest Hotel)', colors: ['#FDE047', '#F472B6'], mood: 'Symmetrical warm custard yellow, dusty rose pink, whimsical vintage saturation' },
      { id: 'tarantino', label: 'Quentin Tarantino 70s (Once Upon a Time / Pulp Fiction)', colors: ['#EAB308', '#DC2626'], mood: 'Sun-drenched golden warmth, punchy saturated reds, organic Kodak film look' },
      { id: 'wong_kar_wai', label: 'Wong Kar-wai Melancholy (In the Mood for Love)', colors: ['#059669', '#E11D48'], mood: 'Sultry neon emerald greens, deep romantic ruby red, smoky nostalgic haze' },
      { id: 'matrix', label: 'Wachowskis Matrix Code (The Matrix)', colors: ['#22C55E', '#064E3B'], mood: 'Stylized monochromatic lime-green tint, crushed midtones, heavy contrast' },
      { id: 'del_toro', label: "Guillermo del Toro Fairy Tale (Pan's Labyrinth / Shape of Water)", colors: ['#D97706', '#0891B2'], mood: 'Burnished antique gold paired with deep bioluminescent cyan shadows' },
      { id: 'michael_bay', label: 'Michael Bay Blockbuster (Bad Boys / Transformers)', colors: ['#06B6D4', '#EA580C'], mood: 'Extreme blockbuster cyan shadows and hyper-saturated warm skin tones' }
    ]
  },
  {
    category: 'Horror & Psychological Thriller',
    grades: [
      { id: 'horror_cold', label: 'Horror: Chilling Cold Desaturation', colors: ['#94A3B8', '#0F172A'], mood: 'Muted pale skin tones, eerie ice-blue wash, crushed obsidian blacks' },
      { id: 'horror_giallo', label: 'Horror: 1970s Italian Giallo', colors: ['#DC2626', '#4338CA'], mood: 'Saturated blood crimson, electric cobalt blue gels, high-contrast nightmare' },
      { id: 'horror_vhs', label: 'Horror: Found Footage VHS Decay', colors: ['#84CC16', '#1E293B'], mood: 'Greenish phosphor glow, lifted milky blacks, subtle analog video grain' },
      { id: 'horror_gothic', label: 'Horror: Bleak Gothic Monochrome', colors: ['#E2E8F0', '#020617'], mood: 'Stark silver-black tonal range, mist-veiled highlights, ominous decay' }
    ]
  },
  {
    category: 'Romance & Emotional Drama',
    grades: [
      { id: 'romance_golden', label: 'Romance: Golden Hour Amber Glow', colors: ['#FBBF24', '#FB7185'], mood: 'Dreamy warm diffusion, peachy skin tones, creamy honey highlights' },
      { id: 'romance_paris', label: 'Romance: Parisian Lavender Melancholy', colors: ['#A78BFA', '#64748B'], mood: 'Soft lavender mist, dusky rose accents, muted cool slate shadows' },
      { id: 'romance_super8', label: 'Romance: Nostalgic Faded Super-8', colors: ['#FDE68A', '#FCA5A5'], mood: 'Creamy pastel tones, lifted warm blacks, gentle grain halation' },
      { id: 'romance_midnight', label: 'Romance: Midnight Blue & Champagne', colors: ['#1D4ED8', '#FEF08A'], mood: 'Intimate royal blue ambient with glowing champagne-tinted practicals' }
    ]
  },
  {
    category: 'Action & High-Octane Thriller',
    grades: [
      { id: 'action_teal_orange', label: 'Action: Modern Blockbuster Teal & Orange', colors: ['#06B6D4', '#F97316'], mood: 'Punchy high-contrast cyan shadows paired with warm radiant skin' },
      { id: 'action_bleach', label: 'Action: Bleach Bypass Silver Halide', colors: ['#CBD5E1', '#334155'], mood: 'Harsh gritty contrast, silver-rich retention, desaturated visceral tones' },
      { id: 'action_desert', label: 'Action: Sun-Baked Desert Warfare', colors: ['#D97706', '#78350F'], mood: 'High-contrast golden sand, tobacco shadows, blinding heat shimmer' },
      { id: 'action_cyber', label: 'Action: High-Voltage Cyberpunk', colors: ['#00FFFF', '#EC4899'], mood: 'Electric magenta, hyper-saturated cyan & deep obsidian night reflections' }
    ]
  },
  {
    category: 'Adventure & Epic Fantasy',
    grades: [
      { id: 'adventure_natgeo', label: 'Adventure: Majestic Naturalist', colors: ['#10B981', '#0284C7'], mood: 'Vibrant emerald vegetation, deep sapphire skies, rich earthen soil' },
      { id: 'adventure_mythic', label: 'Adventure: Ancient Mythic Gold', colors: ['#F59E0B', '#92400E'], mood: 'Burnished bronze highlights, aged parchment midtones, regal warm shadows' },
      { id: 'adventure_arctic', label: 'Adventure: Arctic Glacial Frost', colors: ['#E0F2FE', '#0369A1'], mood: 'Pure crisp white snow, pale cyan glacial ice, desaturated granite rocks' }
    ]
  },
  {
    category: 'Classic Cinema & Heritage',
    grades: [
      { id: 'noir_classic', label: 'Classic Film Noir (1940s Chiaroscuro)', colors: ['#F8FAFC', '#0F172A'], mood: 'Velvety deep ink blacks, crisp silver highlights, high-contrast shadows' },
      { id: 'technicolor', label: '1950s 3-Strip Technicolor', colors: ['#EF4444', '#10B981'], mood: 'Hyper-saturated primary colors, vivid scarlet and emerald hues' },
      { id: 'vintage_sepia', label: 'Vintage Daguerreotype Sepia', colors: ['#D4A373', '#583101'], mood: 'Rich antique brown tonal wash, soft vignette, warm nostalgic roll-off' }
    ]
  }
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
  const isGlobalAdmin = useAppStore(state => state.isAdmin);
  const isAdmin = isGlobalAdmin || userProfile?.role === 'admin' || userProfile?.email === 'premspaw@gmail.com';
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

  // Location Form State
  const [locationName, setLocationName] = useState('Neo-Tokyo Rain Alley');
  const [locationDesc, setLocationDesc] = useState('Rain-soaked asphalt, high-contrast neon signs, steaming street vents, reflective puddles, layered holographic billboards');
  const [selectedLocationPreset, setSelectedLocationPreset] = useState('neotokyo');
  const [locationFilmGrain, setLocationFilmGrain] = useState(FILM_GRAIN_OPTIONS[1]); // Default to 35mm Kodak Vision3 500T
  const [locationLighting, setLocationLighting] = useState(LIGHTING_OPTIONS_GROUPED[0].options[0]); // 'None (Natural Ambient Scene Lighting)'
  const [locationPalette, setLocationPalette] = useState(CINEMATIC_COLOR_GRADES[0].grades[0].label); // 'None (Natural Unprocessed Grade)'
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

    const lightingPrompt = locationLighting && !locationLighting.toLowerCase().startsWith('none')
      ? `Atmospheric Lighting & Mood: ${locationLighting}.\n`
      : '';
    const filmStockPrompt = locationFilmGrain && !locationFilmGrain.toLowerCase().startsWith('none')
      ? `Film Stock & Grain: ${locationFilmGrain}.\n`
      : '';
    const colorGradePrompt = locationPalette && !locationPalette.toLowerCase().startsWith('none')
      ? `Color Palette & Cinematic Grade: ${locationPalette}.\n`
      : '';

    const masterLocationPrompt = `Real · Raw · 8K cinematic widescreen establishing location photography.
Master wide panoramic view of ${name}: ${desc}.
${lightingPrompt}${filmStockPrompt}${colorGradePrompt}Hyperrealistic architectural scale, rich atmospheric depth, fine cinematic grain, photorealistic materials and textures. Single unified cinematic widescreen composition.
STRICT NEGATIVE/EXCLUSIONS: Absolutely NO people, NO characters, NO humans, NO person present, NO crowds, NO pedestrians, completely empty and deserted cinematic location. NO text, NO watermarks, NO logos, NO character turnaround sheet, NO split panels.`;

    studio.generateBoard({
      boardType: 'LOCATION',
      model: selectedEngine,
      aspectRatio: '16:9',
      isFreeTier: isFreeEligible,
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

                {/* 1. Cinematic Location Concept Dropdown */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Compass className="w-3 h-3 text-[#C8F135]" />
                      <span>Cinematic Location Presets</span>
                    </span>
                    <span className="text-[8px] font-mono text-[#C8F135]">QUICK SELECT</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedLocationPreset}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedLocationPreset(id);
                        const allPresets = LOCATION_PRESET_GROUPS.flatMap(g => g.options);
                        const p = allPresets.find(x => x.id === id);
                        if (p) {
                          setLocationName(p.label);
                          setLocationDesc(p.desc);
                        }
                      }}
                      className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white outline-none focus:border-[#C8F135]/60 appearance-none cursor-pointer font-medium"
                    >
                      <option value="" className="bg-zinc-950 text-white/50">-- Select a Curated Location Concept --</option>
                      {LOCATION_PRESET_GROUPS.map((group) => (
                        <optgroup key={group.category} label={`── ${group.category} ──`} className="bg-zinc-900 text-[#C8F135] font-bold">
                          {group.options.map((opt) => (
                            <option key={opt.id} value={opt.id} className="bg-zinc-950 text-white font-normal">
                              {opt.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 2. Atmosphere & Film Grain Dropdown */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Film className="w-3 h-3 text-[#C8F135]" />
                      <span>Film Stock & Grain</span>
                    </span>
                    <span className="text-[8px] font-mono text-[#C8F135]">AUTHENTIC EMULSION</span>
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

                  {/* Live Film Stock Guide & Best-For Location Badge */}
                  {(() => {
                    const activeStock = FILM_GRAIN_METADATA.find(s => s.label === locationFilmGrain) || FILM_GRAIN_METADATA[1];
                    return (
                      <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-[#C8F135] uppercase tracking-wider">
                            Best For Location:
                          </span>
                          <span className="text-[8px] font-mono text-white/40">OPTICAL CHARACTER</span>
                        </div>
                        <p className="text-[10px] text-white/90 font-medium leading-tight">
                          {activeStock.bestFor}
                        </p>
                        <p className="text-[8px] text-white/45 leading-tight italic">
                          {activeStock.characteristics}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* 3. Atmospheric Lighting & Mood Dropdown */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sun className="w-3 h-3 text-[#C8F135]" />
                      <span>Atmospheric Lighting & Mood</span>
                    </span>
                    <span className="text-[8px] font-mono text-white/40">DEFAULT: NONE</span>
                  </label>
                  <div className="relative">
                    <select
                      value={locationLighting}
                      onChange={(e) => setLocationLighting(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white outline-none focus:border-[#C8F135]/60 appearance-none cursor-pointer font-medium"
                    >
                      {LIGHTING_OPTIONS_GROUPED.map((group) => (
                        <optgroup key={group.category} label={`── ${group.category} ──`} className="bg-zinc-900 text-[#C8F135] font-bold">
                          {group.options.map((opt) => (
                            <option key={opt} value={opt} className="bg-zinc-950 text-white font-normal">
                              {opt}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 4. Cinematic Color Grade & Film Style Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Palette className="w-3 h-3 text-[#C8F135]" />
                      <span>Cinematic Color Grade & Film Style</span>
                    </span>
                    <span className="text-[8px] font-mono text-white/40">DEFAULT: NONE</span>
                  </label>
                  <div className="relative">
                    <select
                      value={locationPalette}
                      onChange={(e) => setLocationPalette(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white outline-none focus:border-[#C8F135]/60 appearance-none cursor-pointer font-medium"
                    >
                      {CINEMATIC_COLOR_GRADES.map((group) => (
                        <optgroup key={group.category} label={`── ${group.category} ──`} className="bg-zinc-900 text-[#C8F135] font-bold">
                          {group.grades.map((grade) => (
                            <option key={grade.id} value={grade.label} className="bg-zinc-950 text-white font-normal">
                              {grade.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Live Visual Palette Preview Badge */}
                  {(() => {
                    const allGrades = CINEMATIC_COLOR_GRADES.flatMap(g => g.grades);
                    const activeGrade = allGrades.find(g => g.label === locationPalette) || allGrades[0];
                    return (
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.04] border border-white/10">
                        <div className="flex -space-x-1 shrink-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/50 shadow-sm"
                            style={{ backgroundColor: activeGrade.colors[0] }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/50 shadow-sm"
                            style={{ backgroundColor: activeGrade.colors[1] }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-white/90 font-bold block truncate">
                            {activeGrade.label}
                          </span>
                          <span className="text-[8px] text-white/45 block truncate">
                            {activeGrade.mood}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
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
