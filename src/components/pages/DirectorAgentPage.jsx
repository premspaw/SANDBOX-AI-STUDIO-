import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    Film, Sparkles, User, MapPin, Box, Play, Plus, X, Copy, Check, 
    Camera, Sun, Sliders, Trash2, Loader2, Download, ArrowRight, 
    Layers, RefreshCw, Eye, FastForward, Clock, Wand2, Monitor, 
    ChevronDown, ChevronUp, Image as ImageIcon, Volume2, ShieldCheck,
    Video, Sparkle, Split, CornerDownRight, RotateCcw, Clapperboard,
    Maximize2, UploadCloud, MessageSquare, Send, Bot, FileText, Settings2, SlidersHorizontal,
    Shirt, Package, LayoutGrid, Tag, Bookmark
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getApiUrl, resolveUrl } from '../../config/apiConfig';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import { AssetsLibrary } from '../panels/AssetsLibrary';
import { useShorts } from '../../hooks/useShorts';

const HERMES_API = 'http://localhost:8642';

// Supported Director Personas
const DIRECTORS = [
    { name: 'Christopher Nolan', focus: 'Structure & Scale', mood: 'Epic, Practical, Grand' },
    { name: 'Denis Villeneuve', focus: 'Atmosphere & Minimalism', mood: 'Monumental, Brutalist, Serene' },
    { name: 'David Fincher', focus: 'Precision & Low-Key', mood: 'Clinical, Calculated, High Contrast' },
    { name: 'Roger Deakins', focus: 'Natural Light & Composition', mood: 'Organic, Soft Golden, Realistic' },
    { name: 'Wong Kar-wai', focus: 'Color & Melancholy', mood: 'Step-printed, Saturated, Romantic' },
];

// Visual Art & Film Aesthetic Presets (Photorealistic, Ultra Realistic, Anime, Anime 3D, Claymation, Cyberpunk, Cartoon/Pixar 3D, etc.)
const VISUAL_STYLES = [
    {
        id: 'ultra-realistic',
        name: 'Ultra Realistic',
        badge: '8K IMAX RAW',
        icon: '📸',
        desc: 'Hyper-detailed 8K ultra realistic, natural skin pores, IMAX 70mm lens, authentic lighting',
        promptTokens: '8K ultra-realistic photograph, IMAX 70mm lens, authentic skin texture with microscopic pores, natural volumetric lighting, cinematic depth of field, RAW uncompressed clarity, zero AI plastic smoothing, hyper-detailed optical fidelity'
    },
    {
        id: 'photorealistic',
        name: 'Photorealistic Cinema',
        badge: 'Arri Alexa 35',
        icon: '🎬',
        desc: 'ARRI Alexa 35 cinema camera, Master Prime lenses, naturalistic cinematic lighting',
        promptTokens: 'Photorealistic cinematic feature film, shot on ARRI Alexa 35 with Master Prime lenses, organic film grain, naturalistic lighting ratios, authentic color science, 24fps motion cadence, lifelike human features'
    },
    {
        id: 'cinematic-film',
        name: '35mm Vintage Film',
        badge: 'Kodak Vision3',
        icon: '🎞️',
        desc: '35mm anamorphic film, Kodak Vision3 500T, subtle halation, warm analog grain',
        promptTokens: '35mm anamorphic film, Kodak Vision3 500T 5219 film stock, subtle halation around highlights, gentle film gate weave, warm rich shadows, authentic analog grain texture, Panavision C-series lenses'
    },
    {
        id: 'anime-2d',
        name: 'Anime 2D',
        badge: 'Studio Ghibli',
        icon: '🌸',
        desc: 'Hand-drawn Japanese anime, Makoto Shinkai / Studio Ghibli, luminous watercolor backgrounds',
        promptTokens: 'Hand-drawn Japanese anime aesthetic, Studio Ghibli and Makoto Shinkai visual style, luminous painterly skies, delicate linework, vibrant watercolor atmospheric backgrounds, emotional anime lighting'
    },
    {
        id: 'anime-3d',
        name: 'Anime 3D / CGI',
        badge: 'Arcane & Octane',
        icon: '⚡',
        desc: 'Stylized 3D anime CGI, Arcane / Spider-Verse cel-shading, dynamic octane render',
        promptTokens: 'Stylized 3D anime CGI, Arcane League of Legends and Spider-Verse aesthetic, hand-painted texture mapping over 3D models, dynamic cel-shading, high-energy lighting accents, octane render'
    },
    {
        id: 'cyberpunk',
        name: 'Cyberpunk & Neon',
        badge: 'Blade Runner',
        icon: '🌆',
        desc: 'Cyberpunk neon aesthetic, wet reflective asphalt, volumetric haze, futuristic tech',
        promptTokens: 'Cyberpunk neon aesthetic, Blade Runner 2049 visual style, wet reflective asphalt, volumetric atmospheric fog, vibrant cyan and magenta holographic glow, high-tech dystopian urban architecture'
    },
    {
        id: 'claymation',
        name: 'Claymation / Stop Motion',
        badge: 'Aardman & Laika',
        icon: '🏺',
        desc: 'Handmade plasticine clay, artisan fingerprint textures, tactile stop-motion lighting',
        promptTokens: 'Authentic handmade claymation stop-motion animation, plasticine clay surface textures with visible artisan fingerprint indentations, miniature studio lighting, 12fps tactile physical stop-motion charm, Laika studio aesthetic'
    },
    {
        id: 'pixar-3d',
        name: 'Cartoon / Pixar 3D',
        badge: 'Pixar & Disney',
        icon: '🧸',
        desc: 'Pixar / Disney 3D animation, expressive cartoon proportions, subsurface scattering, vibrant',
        promptTokens: 'Pixar Disney 3D animation style, expressive cartoon facial anatomy, subsurface scattering skin and fur, glossy vibrant lighting, charming tactile materials, Renderman studio quality'
    },
    {
        id: 'dark-fantasy',
        name: 'Dark Fantasy / Gothic',
        badge: 'Elden Ring',
        icon: '🗡️',
        desc: 'Gothic dark fantasy, Guillermo del Toro / Elden Ring mood, dramatic chiaroscuro',
        promptTokens: 'Dark fantasy gothic aesthetic, Guillermo del Toro and Elden Ring mood, dramatic chiaroscuro lighting, brooding mist, ornate baroque armor and stonework, oil painting texture, rich muted earth tones'
    },
    {
        id: 'retro-synthwave',
        name: 'Retro Synthwave 80s',
        badge: 'VHS Analog',
        icon: '📼',
        desc: '1980s retro synthwave, scanlines, analog VHS distortion, magenta/cyan laser glow',
        promptTokens: '1980s retro synthwave aesthetic, CRT scanlines, subtle analog VHS chromatic aberration, neon wireframe grids, sunset laser beams, Outrun aesthetic, nostalgic magenta glow'
    },
    {
        id: 'vintage-film',
        name: '1970s Technicolor',
        badge: 'Vintage 70s',
        icon: '🌻',
        desc: '1970s Technicolor cinema, warm amber hues, retro Panavision flare, nostalgic grain',
        promptTokens: '1970s Technicolor vintage cinema, warm saturated hues, golden brown and amber palettes, classic Panavision flare, retro wardrobe styling, authentic nostalgic film patina'
    },
    {
        id: 'minimalist-editorial',
        name: 'Minimalist Editorial',
        badge: 'Vogue & Luxury',
        icon: '🏛️',
        desc: 'Vogue high-fashion editorial, clean brutalist geometry, high-contrast studio softbox',
        promptTokens: 'Minimalist high-fashion editorial, clean brutalist architectural composition, stark negative space, high-contrast studio softbox lighting, monochromatic luxury palette, crisp geometric silhouettes'
    },
    {
        id: 'watercolor',
        name: 'Watercolor & Ink',
        badge: 'Traditional Art',
        icon: '🎨',
        desc: 'Expressive watercolor & sumi-e ink wash, textured cotton paper, soft pigment bleed',
        promptTokens: 'Expressive traditional watercolor and Japanese sumi-e ink wash, wet-on-wet pigment bleeding, textured cold-press cotton paper, soft ethereal color transitions, fine calligraphic line accents'
    },
    {
        id: 'comic-noir',
        name: 'Graphic Novel Noir',
        badge: 'Sin City Noir',
        icon: '🦇',
        desc: 'High-contrast graphic novel noir, Frank Miller Sin City, deep inky shadows, stark white',
        promptTokens: 'High-contrast graphic novel noir, Frank Miller Sin City style, deep inky black shadows, sharp stark white highlights, selective single-color accents, gritty cross-hatch ink details'
    }
];

// AI Story & Director Intelligence Reasoning Engines
const AI_DIRECTOR_MODELS = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', badge: 'Ultra Fast & Sharp', provider: 'Google', desc: 'Next-gen multimodal reasoning, zero lag, precise script breakdown' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', badge: 'Deep Narrative', provider: 'Google', desc: 'Complex storytelling, subtext, high cinematic intelligence' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', badge: 'Fast & Reliable', provider: 'Google', desc: 'Solid multimodal speed and structured JSON output' },
    { id: 'gpt-6-astra', name: 'Astra AI Director', badge: 'ChatGPT 6 Cinema', provider: 'Astra Neural', desc: 'Experiential Labs flagship director agent with autonomous memory' },
    { id: 'gpt-4o', name: 'OpenAI GPT-4o', badge: 'Omni Vision', provider: 'OpenAI', desc: 'High visual prompt refinement and dialogue rhythm' },
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', badge: 'Screenplay Master', provider: 'Anthropic', desc: 'Nuanced dialogue, pacing, and human character depth' },
];

const COMMERCIAL_PRESETS = [
    {
        title: '60s Luxury Timepiece Ad',
        duration: '60 sec',
        aspectRatio: '16:9',
        visualStyle: 'ultra-realistic',
        goal: 'Commercial',
        charName: 'Alex Vance',
        locName: 'Rainy Tokyo Alley',
        wardrobeName: 'Cyber Black Trench Coat',
        wardrobeTraits: 'Tailored matte-black heavy cotton, high lapel, rain droplets on shoulders',
        propName: 'ChronoMaster Swiss Watch',
        propTraits: 'Brushed titanium case, emerald luminous dial, submerged in water',
        script: `A 60-second cinematic commercial for ChronoMaster Swiss watch.
Opening with macro detail of watch dial (@prop_chronomaster_swiss_watch) submerged in water, water drops beading on sapphire glass.
Cut to a sharp-dressed protagonist (@char_alex_vance) in trench coat (@wardrobe_cyber_black_trench_coat) walking through a rain-slicked Tokyo street (@loc_rainy_tokyo_alley).
He raises his wrist under glowing neon lights, checking the time. A subtle reflection in a puddle reveals a sleek sports car waiting.
Camera slowly pushes in as emerald luminous hands tick with absolute precision. Final hero product close-up.`
    },
    {
        title: '30s Cyberpunk Action Teaser',
        duration: '30 sec',
        aspectRatio: '16:9',
        visualStyle: 'cyberpunk',
        goal: 'Cinematic Movie',
        charName: 'Kaelen',
        locName: 'Neon Megacity Rooftop',
        wardrobeName: 'Tactical Leather Duster',
        wardrobeTraits: 'Dark distressed leather, reinforced shoulder armor, cybernetic seams',
        propName: 'Holo Wrist Gauntlet',
        propTraits: 'Emitting pulsating blue holographic data matrix in mid-air',
        script: `A 30-second teaser for a sci-fi thriller.
Establishing wide shot of neon skyscrapers in a foggy cyberpunk metropolis (@loc_neon_megacity_rooftop).
The camera swoops down to rooftop level where our protagonist (@char_kaelen) stands in a tactical duster (@wardrobe_tactical_leather_duster).
As sirens wail in the distance, he ignites his wrist device (@prop_holo_wrist_gauntlet).
Cut to intense close-up of his eyes reflecting blue holographic data. Camera orbits as high-speed drones pass overhead.`
    },
    {
        title: '30s Luxury Fragrance Commercial',
        duration: '30 sec',
        aspectRatio: '9:16',
        visualStyle: 'minimalist-editorial',
        goal: 'Commercial',
        charName: 'Elena Rostova',
        locName: 'Sunlit Minimalist Penthouse',
        wardrobeName: 'Silk Champagne Gown',
        wardrobeTraits: 'Flowing satin champagne silk, open back, catching golden warm light',
        propName: 'Crystal Aura Flacon',
        propTraits: 'Faceted prismatic crystal perfume bottle with golden mist diffuser',
        script: `A 30-second luxury fragrance commercial formatted for mobile reels.
Golden hour sunlight streaming through floor-to-ceiling windows in a minimalist modern penthouse (@loc_sunlit_minimalist_penthouse).
An elegant crystal perfume bottle (@prop_crystal_aura_flacon) on marble pedestal catching sunlight.
Protagonist (@char_elena_rostova) in champagne gown (@wardrobe_silk_champagne_gown) spritzes the mist in slow-motion, delicate droplets suspended in golden light.
Cinematic camera slow push-in with soft focus bokeh and ethereal light flare.`
    },
    {
        title: '15s High-Energy Tech Reveal',
        duration: '15 sec',
        aspectRatio: '16:9',
        visualStyle: 'ultra-realistic',
        goal: 'Commercial',
        charName: 'Dev',
        locName: 'Dark Infinity Studio',
        wardrobeName: 'Minimalist Matte Hoodie',
        wardrobeTraits: 'Seamless charcoal technical weave fabric with clean architectural lines',
        propName: 'Titanium Blade Laptop',
        propTraits: 'Ultra-thin matte titanium chassis with iridescent edge illumination',
        script: `A 15-second ultra-crisp hardware reveal.
Camera starts in complete blackness, suddenly edge rim light illuminates an ultra-thin matte titanium laptop (@prop_titanium_blade_laptop).
Protagonist (@char_dev) in matte hoodie (@wardrobe_minimalist_matte_hoodie) opens the screen with one finger. A burst of vibrant color waves emanates from the display.
Dynamic fast push-in to keyboard tactile motion, ending on hero angled silhouette.`
    }
];

// Helper to capture a screenshot/frame from a video element or video URL
async function captureVideoLastFrame(videoSource, timeOffsetSeconds = 0.5) {
    return new Promise((resolve) => {
        try {
            if (videoSource instanceof HTMLVideoElement) {
                const canvas = document.createElement('canvas');
                canvas.width = videoSource.videoWidth || 1280;
                canvas.height = videoSource.videoHeight || 720;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(videoSource, 0, 0, canvas.width, canvas.height);
                try {
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                    resolve(dataUrl);
                    return;
                } catch (canvasErr) {
                    console.warn('[FrameCapture] Canvas read error (CORS):', canvasErr);
                    resolve(videoSource.src || null);
                    return;
                }
            }

            if (typeof videoSource === 'string') {
                const video = document.createElement('video');
                video.crossOrigin = 'anonymous';
                video.src = resolveUrl(videoSource);
                video.muted = true;
                video.playsInline = true;

                video.onloadedmetadata = () => {
                    const seekTime = Math.max(0, (video.duration || 5) - timeOffsetSeconds);
                    video.currentTime = seekTime;
                };

                video.onseeked = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = video.videoWidth || 1280;
                        canvas.height = video.videoHeight || 720;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                        resolve(dataUrl);
                    } catch (e) {
                        console.warn('[FrameCapture] Canvas tainted, returning URL fallback:', e);
                        resolve(videoSource);
                    }
                };

                video.onerror = () => {
                    console.warn('[FrameCapture] Video element error, using URL fallback');
                    resolve(videoSource);
                };

                video.load();
                return;
            }
            resolve(null);
        } catch (err) {
            console.error('[FrameCapture] Unexpected error:', err);
            resolve(null);
        }
    });
}

export default function DirectorAgentPage() {
    const userProfile = useAppStore(state => state.userProfile);
    const userId = userProfile?.id;
    const { refresh: refreshShorts } = useShorts() || { refresh: () => {} };

    const getApiKey = () => {
        if (userProfile?.role === 'admin' || userProfile?.email === 'premspaw@gmail.com') {
            return window.__ADMIN_GOOGLE_API_KEY__ || import.meta.env.VITE_ADMIN_GOOGLE_API_KEY || localStorage.getItem('GOOGLE_API_KEY') || window.aistudio?.apiKey || import.meta.env.VITE_GOOGLE_API_KEY || '';
        }
        return localStorage.getItem('GOOGLE_API_KEY') || window.aistudio?.apiKey || import.meta.env.VITE_GOOGLE_API_KEY || '';
    };

    // --- State: Project Setup ---
    const [projectName, setProjectName] = useState('Director Cut: Untitled Commercial');
    const [videoDuration, setVideoDuration] = useState('60 sec');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [resolution, setResolution] = useState('1080p'); // '720p', '1080p', '4K'
    const [visualStyle, setVisualStyle] = useState('ultra-realistic'); // 'ultra-realistic', 'photorealistic', 'anime-2d', 'anime-3d', 'claymation', 'cyberpunk', 'pixar-3d', etc.
    const [videoGoal, setVideoGoal] = useState('Commercial');
    const [selectedDirector, setSelectedDirector] = useState(DIRECTORS[0].name);
    const [scriptText, setScriptText] = useState(COMMERCIAL_PRESETS[0].script);
    const [dialogueText, setDialogueText] = useState('');
    const [scriptTab, setScriptTab] = useState('screenplay'); // 'screenplay' | 'dialogues' | 'combined'
    const [isAutoExtracting, setIsAutoExtracting] = useState(false);

    // Default video render engine: Gemini Omni Flash 1.1 / Seedance 2.0
    const [selectedEngine, setSelectedEngine] = useState('omni-flash');

    // Selected AI Director & Story Reasoning Model (Gemini 2.5 Flash / Gemini 2.5 Pro / Astra / Claude / GPT-4o)
    const [selectedAiModel, setSelectedAiModel] = useState('gemini-2.5-flash');

    // --- State: Visual Assets & Concept Art Sheets (Character Sheets, Location Sheets, Prop Sheets, Moodboards) ---
    const [mainViewMode, setMainViewMode] = useState('storyboard'); // 'storyboard' | 'concept_sheets'
    const [conceptCategoryFilter, setConceptCategoryFilter] = useState('all'); // 'all' | 'character' | 'location' | 'prop' | 'moodboard'
    const [selectedImageEngine, setSelectedImageEngine] = useState('nano-banana-2-open'); // 'nano-banana-2-open' | 'gpt-image-2' | 'imagen-3.0-generate-002'
    const [isBatchGeneratingSheets, setIsBatchGeneratingSheets] = useState(false);
    const [activeLightboxImage, setActiveLightboxImage] = useState(null);
    const [conceptSheets, setConceptSheets] = useState([
        {
            id: 'sheet_char_1',
            type: 'character',
            title: 'Lead Character Turnaround Sheet',
            name: 'Actor 1',
            tag: '@char_actor_1',
            traits: 'Cinematic protagonist',
            prompt: 'Cinematic character design turnaround sheet for Actor 1 (@char_actor_1). 3-angle turnaround model sheet: front full-body view, 3/4 dynamic perspective, profile view, and multiple facial expressions. Detailed costume breakdown. Photorealistic 8K concept art, volumetric studio lighting, clean solid backdrop.',
            aspectRatio: '16:9',
            referenceImage: null,
            imageUrl: null,
            status: 'idle',
            progressMsg: '',
            errorMsg: ''
        },
        {
            id: 'sheet_loc_1',
            type: 'location',
            title: 'Location & Environment Setting Sheet',
            name: 'Film Setting',
            tag: '@loc_setting',
            traits: 'Atmospheric cinematic environment',
            prompt: 'Cinematic environment concept art sheet for Film Setting (@loc_setting). 3 camera perspectives: wide panoramic establishing shot, atmospheric interior perspective, and macro architectural detail. Cinematic lighting and atmospheric haze, photorealistic 8k matte painting.',
            aspectRatio: '16:9',
            referenceImage: null,
            imageUrl: null,
            status: 'idle',
            progressMsg: '',
            errorMsg: ''
        },
        {
            id: 'sheet_mood_1',
            type: 'moodboard',
            title: 'Director Moodboard & Color Keys',
            name: 'Cinematic Aesthetic Palette',
            tag: '@mood_color_keys',
            traits: 'Epic, Practical, Grand',
            prompt: 'Cinematic movie moodboard and color palette keyframes in the style of Christopher Nolan (Structure & Scale, Epic, Practical, Grand). Visual tone, lighting ratios, cinematic color swatches, 4 keyframe lighting compositions. Photorealistic 35mm film grading.',
            aspectRatio: '16:9',
            referenceImage: null,
            imageUrl: null,
            status: 'idle',
            progressMsg: '',
            errorMsg: ''
        }
    ]);

    // --- State: Vibe Directing Co-Pilot (Astra gpt-6-astra) ---
    const [showVibeDirector, setShowVibeDirector] = useState(false);
    const [vibeMessages, setVibeMessages] = useState([
        {
            id: 'intro',
            sender: 'astra',
            text: "Hello! I am Astra (ChatGPT 6), your Lead AI Co-Director. You can direct me in natural language to adjust anything in real time: change aspect ratio (16:9, 9:16, 1:1, 2.39:1), switch resolution (720p, 1080p, 4K), change lighting, tweak camera moves, or add/modify storyboard shots.",
            suggestedNextSteps: ["Switch all to 9:16 Reels", "Upgrade resolution to 4K Cinema", "Add dramatic golden hour lighting"]
        }
    ]);
    const [vibeInput, setVibeInput] = useState('');
    const [isVibeDirecting, setIsVibeDirecting] = useState(false);
    const [polishingShotIndex, setPolishingShotIndex] = useState(null);

    // --- State: Script Generator & File Loader ---
    const [showScriptModal, setShowScriptModal] = useState(false);
    const [scriptIdeaInput, setScriptIdeaInput] = useState('');
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const scriptFileInputRef = useRef(null);
    const vibeChatEndRef = useRef(null);

    // --- State: Assets & Continuity Anchors ---
    const [characters, setCharacters] = useState([
        {
            id: 'char_1',
            name: 'Actor 1',
            tag: '@char_actor_1',
            image: null,
            traits: ''
        }
    ]);
    const [activeCharacterIndex, setActiveCharacterIndex] = useState(0);

    // Multi-character helpers
    const handleAddCharacter = () => {
        const nextNum = characters.length + 1;
        const newChar = {
            id: `char_${Date.now()}`,
            name: `Actor ${nextNum}`,
            tag: `@char_actor_${nextNum}`,
            image: null,
            traits: ''
        };
        setCharacters(prev => [...prev, newChar]);
        setActiveCharacterIndex(characters.length);
    };

    const handleRemoveCharacter = (idxToRemove) => {
        if (characters.length <= 1) return;
        setCharacters(prev => prev.filter((_, i) => i !== idxToRemove));
        setActiveCharacterIndex(prev => Math.max(0, prev >= idxToRemove ? prev - 1 : prev));
    };

    const handleUpdateCharacter = (idxToUpdate, field, value) => {
        setCharacters(prev => prev.map((c, i) => {
            if (i !== idxToUpdate) return c;
            const updated = { ...c, [field]: value };
            if (field === 'name') {
                const cleanTag = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
                updated.tag = `@char_${cleanTag || 'actor'}`;
            }
            return updated;
        }));
    };

    const [wardrobeRef, setWardrobeRef] = useState({
        name: '',
        tag: '',
        image: null,
        traits: ''
    });

    const [propRef, setPropRef] = useState({
        name: '',
        tag: '',
        image: null,
        traits: ''
    });

    const [locationRef, setLocationRef] = useState({
        name: 'Film Location',
        tag: '@loc_film_location',
        image: null,
        traits: ''
    });

    const [firstFrameRef, setFirstFrameRef] = useState({
        image: null,
        description: 'Opening visual establishing frame'
    });

    const [galleryPickerType, setGalleryPickerType] = useState(null); // 'character' | 'location' | 'wardrobe' | 'prop' | 'first_frame' | null

    // Reset all anchors to clean state
    const handleClearAnchors = () => {
        setCharacters([
            {
                id: 'char_1',
                name: 'Actor 1',
                tag: '@char_actor_1',
                image: null,
                traits: ''
            }
        ]);
        setActiveCharacterIndex(0);
        setWardrobeRef({ name: '', tag: '', image: null, traits: '' });
        setPropRef({ name: '', tag: '', image: null, traits: '' });
        setLocationRef({ name: 'Film Location', tag: '@loc_film_location', image: null, traits: '' });
    };

    // Auto-detect characters, dialogues & locations from the loaded script
    const handleAutoExtractFromScript = (customScript = null, customDialogue = null) => {
        const textToAnalyze = (customScript !== null ? customScript : scriptText) + '\n' + (customDialogue !== null ? customDialogue : dialogueText);
        if (!textToAnalyze.trim()) return;
        
        setIsAutoExtracting(true);
        try {
            // Extract character names from dialogue cues (e.g. "ALEX:" or "JOHN:") or tags (@char_...)
            const dialogueSpeakerMatches = textToAnalyze.match(/^[A-Z][A-Za-z0-9_\s]{1,18}(?=:)/gm) || [];
            const tagMatches = textToAnalyze.match(/@char_([a-zA-Z0-9_]+)/g) || [];
            
            const discoveredNames = new Set();
            dialogueSpeakerMatches.forEach(name => {
                const clean = name.trim();
                if (clean && clean.length > 1 && !['SCENE', 'SHOT', 'ACT', 'INT', 'EXT', 'CUT', 'TITLE', 'NOTE', 'AUDIO'].includes(clean.toUpperCase())) {
                    discoveredNames.add(clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase());
                }
            });
            tagMatches.forEach(tag => {
                const clean = tag.replace('@char_', '').replace(/_/g, ' ');
                discoveredNames.add(clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
            });

            if (discoveredNames.size > 0) {
                const newChars = Array.from(discoveredNames).slice(0, 4).map((name, i) => ({
                    id: `char_${Date.now()}_${i}`,
                    name,
                    tag: `@char_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
                    image: characters[i]?.image || null,
                    traits: `Character ${name} in script`
                }));
                setCharacters(newChars);
                setActiveCharacterIndex(0);
            }

            // Extract location cues (e.g. "INT. TOKYO ALLEY" or "@loc_...")
            const locTagMatch = textToAnalyze.match(/@loc_([a-zA-Z0-9_]+)/);
            const sceneHeaderMatch = textToAnalyze.match(/(?:INT\.|EXT\.|INT\/EXT\.)\s+([^\n\-–—]+)/i);
            if (locTagMatch) {
                const locName = locTagMatch[1].replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                setLocationRef(prev => ({
                    ...prev,
                    name: locName,
                    tag: `@loc_${locTagMatch[1]}`,
                    traits: `Environment from script: ${locName}`
                }));
            } else if (sceneHeaderMatch) {
                const locName = sceneHeaderMatch[1].trim();
                setLocationRef(prev => ({
                    ...prev,
                    name: locName,
                    tag: `@loc_${locName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
                    traits: `Setting from script header: ${locName}`
                }));
            }

            // Extract wardrobe if explicitly tagged with @wardrobe_
            const wardrobeMatch = textToAnalyze.match(/@wardrobe_([a-zA-Z0-9_]+)/);
            if (wardrobeMatch) {
                const wName = wardrobeMatch[1].replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                setWardrobeRef(prev => ({
                    ...prev,
                    name: wName,
                    tag: `@wardrobe_${wardrobeMatch[1]}`,
                    traits: `Wardrobe from script: ${wName}`
                }));
            }

            // Extract prop if explicitly tagged with @prop_
            const propMatch = textToAnalyze.match(/@prop_([a-zA-Z0-9_]+)/);
            if (propMatch) {
                const pName = propMatch[1].replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                setPropRef(prev => ({
                    ...prev,
                    name: pName,
                    tag: `@prop_${propMatch[1]}`,
                    traits: `Hero prop from script: ${pName}`
                }));
            }
        } catch (e) {
            console.warn('[DirectorAgent] Auto-extract warning:', e);
        } finally {
            setIsAutoExtracting(false);
        }
    };

    // --- State: Interactive Scenes & Storyboard ---
    const [scenes, setScenes] = useState([
        {
            sceneNumber: 1,
            title: 'Scene 1: Opening Hook & Reveal',
            locationTag: '@loc_rainy_tokyo_alley',
            characterTag: '@char_alex_vance',
            wardrobeTag: '',
            propTag: '',
            beat: 'Submerged macro watch dial beads water, cutting to protagonist stepping into neon Tokyo rain.'
        },
        {
            sceneNumber: 2,
            title: 'Scene 2: Precision Climax & Payoff',
            locationTag: '@loc_rainy_tokyo_alley',
            characterTag: '@char_alex_vance',
            wardrobeTag: '',
            propTag: '',
            beat: 'Wrist raise under rain-slicked city lights reveals precise emerald ticking hands and waiting sports car.'
        }
    ]);
    const [activeSceneTab, setActiveSceneTab] = useState(1); // 1, 2, ... or 'all'

    // --- State: Multi-Agent Crew & Storyboard ---
    const [isOrchestrating, setIsOrchestrating] = useState(false);
    const [orchestratorStep, setOrchestratorStep] = useState(null); // 'vision' | 'screenplay' | 'continuity' | 'cinematographer' | 'complete'
    const [shots, setShots] = useState([]);
    const [activeShotIndex, setActiveShotIndex] = useState(0);

    // --- State: Unified Sequence Player ---
    const [isPlayingSequence, setIsPlayingSequence] = useState(false);
    const [sequenceIndex, setSequenceIndex] = useState(0);
    const sequenceVideoRef = useRef(null);

    // --- State: Visual Memory Drawer ---
    const [memory, setMemory] = useState([]);
    const [showMemoryPanel, setShowMemoryPanel] = useState(false);
    const [newMemoryNote, setNewMemoryNote] = useState('');

    // Director Studio Readiness
    const [sessionReady, setSessionReady] = useState(true);

    // Load saved memory for user
    useEffect(() => {
        if (!userId) return;
        fetch(getApiUrl(`/api/agent/memory?userId=${userId}`))
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data.memories) && data.memories.length > 0) {
                    setMemory(data.memories);
                }
            })
            .catch(() => {});
    }, [userId]);

    const saveMemoryToBackend = async (updatedMemories) => {
        setMemory(updatedMemories);
        if (!userId) return;
        try {
            await fetch(getApiUrl('/api/agent/memory'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, memories: updatedMemories })
            });
        } catch (err) {
            console.warn('[DirectorAgent] Failed to persist memory:', err);
        }
    };

    const handleAddMemory = () => {
        if (!newMemoryNote.trim()) return;
        const updated = [...memory, newMemoryNote.trim()];
        saveMemoryToBackend(updated);
        setNewMemoryNote('');
    };

    const handleDeleteMemory = (idx) => {
        const updated = memory.filter((_, i) => i !== idx);
        saveMemoryToBackend(updated);
    };

    // Preset selector
    const handleApplyPreset = (preset) => {
        setProjectName(preset.title);
        setVideoDuration(preset.duration);
        setAspectRatio(preset.aspectRatio);
        if (preset.visualStyle) setVisualStyle(preset.visualStyle);
        setVideoGoal(preset.goal);
        setScriptText(preset.script);
        setCharacters(prev => {
            const first = prev[0] || { id: 'char_1', image: null, traits: '' };
            return [{
                ...first,
                name: preset.charName,
                tag: `@char_${preset.charName.toLowerCase().replace(/\s+/g, '_')}`
            }, ...prev.slice(1)];
        });
        setLocationRef(prev => ({
            ...prev,
            name: preset.locName,
            tag: `@loc_${preset.locName.toLowerCase().replace(/\s+/g, '_')}`
        }));
        if (preset.wardrobeName) {
            setWardrobeRef(prev => ({
                ...prev,
                name: preset.wardrobeName,
                tag: `@wardrobe_${preset.wardrobeName.toLowerCase().replace(/\s+/g, '_')}`,
                traits: preset.wardrobeTraits || prev.traits
            }));
        }
        if (preset.propName) {
            setPropRef(prev => ({
                ...prev,
                name: preset.propName,
                tag: `@prop_${preset.propName.toLowerCase().replace(/\s+/g, '_')}`,
                traits: preset.propTraits || prev.traits
            }));
        }
    };

    // --- Vision Analysis State for Character & Location Anchors ---
    const [isAnalyzingVision, setIsAnalyzingVision] = useState({
        character: false,
        location: false,
        wardrobe: false,
        prop: false
    });

    // AI Vision Analyzer for Character, Location, Wardrobe, Prop References
    const analyzeAnchorImageWithVision = async (type, dataUrl, targetIndex = activeCharacterIndex) => {
        if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return;

        setIsAnalyzingVision(prev => ({ ...prev, [type]: true }));
        try {
            const mimeType = dataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
            const base64Data = dataUrl.split(',')[1];

            let systemPrompt = '';
            let userPrompt = '';

            if (type === 'character') {
                systemPrompt = `You are an expert AI casting director and cinematic visual continuity architect.
Analyze this character/actor reference photo.
Extract:
1. Suggested fictional character name (1-2 words) matching their appearance and vibe.
2. High-density traits: gender, estimated age range, hairstyle and color, distinctive facial features, skin tone/look, expression, and styling.

Return ONLY a valid JSON object without markdown fences or code blocks:
{
  "name": "Character Name",
  "traits": "High-density physical & styling traits"
}`;
                userPrompt = "Analyze this actor face / headshot for film casting.";
            } else if (type === 'wardrobe') {
                systemPrompt = `You are an expert costume designer and cinematic wardrobe architect.
Analyze this clothing/outfit reference photo.
Extract:
1. Outfit name / style (e.g. "Tailored Velvet Tuxedo", "Cyberpunk Trench Coat").
2. Exact fabric textures, colors, cuts, silhouettes, patterns, and signature wardrobe details.

Return ONLY a valid JSON object:
{
  "name": "Costume Name",
  "traits": "Specific fabrics, colors, textures, cut details"
}`;
                userPrompt = "Analyze this wardrobe and costume reference image.";
            } else if (type === 'prop') {
                systemPrompt = `You are an expert film prop master and cinematic object continuity supervisor.
Analyze this prop/item reference photo.
Extract:
1. Hero prop name (e.g. "Vintage Chronograph Watch", "Prismatic Crystal Flask").
2. Materials, surface finishes (brushed titanium, sapphire glass, polished chrome), lighting reflections, markings, and distinct tactile features.

Return ONLY a valid JSON object:
{
  "name": "Hero Prop Name",
  "traits": "Specific materials, finishes, mechanisms, lighting reflections"
}`;
                userPrompt = "Analyze this hero prop reference image.";
            } else if (type === 'location') {
                systemPrompt = `You are an expert production designer and cinematic location scout.
Analyze this location/environment reference photo.
Extract:
1. Setting / Location name (e.g. "Neon Rain-slicked Tokyo Alley", "Brutalist Concrete Penthouse").
2. Architecture, practical lighting sources, atmosphere (haze, reflections, sunlight), textures, and color palette.

Return ONLY a valid JSON object:
{
  "name": "Location Name",
  "traits": "Architecture, practical light sources, atmosphere, materials, mood"
}`;
                userPrompt = "Analyze this film location reference image.";
            }

            const apiKey = getApiKey();
            if (apiKey) {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: `${systemPrompt}\n\n${userPrompt}` },
                                {
                                    inline_data: {
                                        mime_type: mimeType,
                                        data: base64Data
                                    }
                                }
                            ]
                        }],
                        generationConfig: {
                            response_mime_type: 'application/json',
                            temperature: 0.2
                        }
                    })
                });

                if (resp.ok) {
                    const data = await resp.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        try {
                            const parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
                            if (type === 'character') {
                                setCharacters(prev => prev.map((c, i) => i === targetIndex ? {
                                    ...c,
                                    name: parsed.name || c.name,
                                    tag: `@char_${(parsed.name || c.name).toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
                                    traits: parsed.traits || c.traits
                                } : c));
                            } else if (type === 'wardrobe') {
                                setWardrobeRef(prev => ({
                                    ...prev,
                                    name: parsed.name || prev.name,
                                    tag: `@wardrobe_${(parsed.name || prev.name).toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
                                    traits: parsed.traits || prev.traits
                                }));
                            } else if (type === 'prop') {
                                setPropRef(prev => ({
                                    ...prev,
                                    name: parsed.name || prev.name,
                                    tag: `@prop_${(parsed.name || prev.name).toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
                                    traits: parsed.traits || prev.traits
                                }));
                            } else if (type === 'location') {
                                setLocationRef(prev => ({
                                    ...prev,
                                    name: parsed.name || prev.name,
                                    tag: `@loc_${(parsed.name || prev.name).toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
                                    traits: parsed.traits || prev.traits
                                }));
                            }
                        } catch (parseErr) {
                            console.warn('[DirectorAgent] Vision JSON parse error:', parseErr);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[DirectorAgent] Vision analysis failed:', err);
        } finally {
            setIsAnalyzingVision(prev => ({ ...prev, [type]: false }));
        }
    };

    // --- Image Upload Handlers with Automatic Vision Analysis ---
    const handleImageUpload = (type, file, targetIndex = activeCharacterIndex) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            if (type === 'character') {
                setCharacters(prev => prev.map((c, i) => i === targetIndex ? { ...c, image: dataUrl } : c));
                analyzeAnchorImageWithVision('character', dataUrl, targetIndex);
            } else if (type === 'wardrobe') {
                setWardrobeRef(prev => ({ ...prev, image: dataUrl }));
                analyzeAnchorImageWithVision('wardrobe', dataUrl);
            } else if (type === 'prop') {
                setPropRef(prev => ({ ...prev, image: dataUrl }));
                analyzeAnchorImageWithVision('prop', dataUrl);
            } else if (type === 'location') {
                setLocationRef(prev => ({ ...prev, image: dataUrl }));
                analyzeAnchorImageWithVision('location', dataUrl);
            } else if (type === 'first_frame') {
                setFirstFrameRef(prev => ({ ...prev, image: dataUrl }));
            }
        };
        reader.readAsDataURL(file);
    };

    // --- VISUAL CONCEPT ART & ASSET SHEETS (Auto-Extracted from Story) ---
    const syncConceptSheetsFromStory = useCallback((optScript = null, optDialogue = null) => {
        const activeScript = typeof optScript === 'string' ? optScript : scriptText;
        const activeDialogue = typeof optDialogue === 'string' ? optDialogue : dialogueText;
        const directorInfo = DIRECTORS.find(d => d.name === selectedDirector) || DIRECTORS[0];
        const activeStyle = VISUAL_STYLES.find(s => s.id === visualStyle) || VISUAL_STYLES[0];

        // 1. Extract Character Design Sheets for each cast actor
        const charSheets = characters.map((c, i) => {
            const charName = c.name || `Actor ${i + 1}`;
            const charTag = c.tag || `@char_actor_${i + 1}`;
            const wardrobeDetail = wardrobeRef.name ? ` wearing ${wardrobeRef.name} (${wardrobeRef.tag || ''})` : '';
            return {
                id: `sheet_char_${c.id || i + 1}`,
                type: 'character',
                title: `${charName} — Turnaround Design Sheet`,
                name: charName,
                tag: charTag,
                traits: c.traits || 'Lead character in production',
                prompt: `Character design model sheet for ${charName} (${charTag}), ${c.traits || 'cinematic actor'}${wardrobeDetail}. 3-angle turnaround model sheet: front full-body view, 3/4 dynamic perspective angle, side profile, and 4 facial emotion expressions. Detailed costume breakdown. Visual style: ${activeStyle.name} (${activeStyle.promptTokens}), volumetric studio lighting, clean solid backdrop, sharp fine textures.`,
                aspectRatio: '16:9',
                referenceImage: c.image || null,
                imageUrl: null,
                status: 'idle',
                progressMsg: '',
                errorMsg: ''
            };
        });

        // 2. Extract Location Concept Sheets (Primary + any unique scene locations)
        const rawLocations = [{ name: locationRef.name || 'Primary Location Setting', tag: locationRef.tag || '@loc_setting', traits: locationRef.traits, image: locationRef.image }];
        scenes.forEach((sc, sIdx) => {
            if (sc.locationTag && sc.locationTag !== locationRef.tag && !rawLocations.some(l => l.tag === sc.locationTag)) {
                const locCleanName = sc.locationTag.replace('@loc_', '').replace(/_/g, ' ');
                rawLocations.push({
                    name: `Location ${sIdx + 1}: ${locCleanName.charAt(0).toUpperCase() + locCleanName.slice(1)}`,
                    tag: sc.locationTag,
                    traits: sc.beat || 'Atmospheric set environment',
                    image: null
                });
            }
        });

        const locSheets = rawLocations.map((loc, lIdx) => ({
            id: `sheet_loc_${loc.tag.replace(/[^a-z0-9]/gi, '_') || lIdx}`,
            type: 'location',
            title: `${loc.name} — Environment Setting Sheet`,
            name: loc.name,
            tag: loc.tag,
            traits: loc.traits || 'Cinematic environment',
            prompt: `Environment concept art sheet for ${loc.name} (${loc.tag}), ${loc.traits || 'cinematic setting'}. 3 visual camera perspectives: wide panoramic establishing shot, atmospheric interior perspective, and macro architectural detail. Art style: ${activeStyle.name} (${activeStyle.promptTokens}). Lighting: ${directorInfo.mood} atmosphere, signature color grade.`,
            aspectRatio: '16:9',
            referenceImage: loc.image || null,
            imageUrl: null,
            status: 'idle',
            progressMsg: '',
            errorMsg: ''
        }));

        // 3. Extract Hero Prop Sheet
        const propSheets = [];
        const propName = propRef.name || 'Hero Prop';
        propSheets.push({
            id: `sheet_prop_${propRef.tag.replace(/[^a-z0-9]/gi, '_') || 'hero_item'}`,
            type: 'prop',
            title: `${propName} — Hero Prop & Asset Sheet`,
            name: propName,
            tag: propRef.tag || '@prop_item',
            traits: propRef.traits || 'Cinematic hero prop item',
            prompt: `Hero prop orthographic design sheet for ${propName} (${propRef.tag || '@prop_item'}), ${propRef.traits || 'cinematic hero prop'}. 3-angle isolated studio render: front elevation, 3D perspective angle, and exploded macro mechanical detail. Style: ${activeStyle.name} (${activeStyle.promptTokens}), studio key and rim lighting, clean dark background.`,
            aspectRatio: '16:9',
            referenceImage: propRef.image || null,
            imageUrl: null,
            status: 'idle',
            progressMsg: '',
            errorMsg: ''
        });

        // 4. Director Moodboard & Color Key Sheet
        const moodSheet = {
            id: 'sheet_moodboard_master',
            type: 'moodboard',
            title: `Director Moodboard & Color Keys (${selectedDirector})`,
            name: `${selectedDirector} Vision Palette`,
            tag: '@mood_color_keys',
            traits: `${directorInfo.focus} • ${directorInfo.mood}`,
            prompt: `Moodboard and color palette keyframes in the style of ${selectedDirector} (${directorInfo.focus}, ${directorInfo.mood}). Visual style: ${activeStyle.name} (${activeStyle.promptTokens}). Visual tone, lighting ratios, color swatches, 4 keyframe lighting compositions for story: "${(activeScript || '').slice(0, 160)}".`,
            aspectRatio: '16:9',
            referenceImage: null,
            imageUrl: null,
            status: 'idle',
            progressMsg: '',
            errorMsg: ''
        };

        const newGeneratedList = [...charSheets, ...locSheets, ...propSheets, moodSheet];

        setConceptSheets(prev => {
            return newGeneratedList.map(newS => {
                const existing = prev.find(p => p.id === newS.id || (p.tag && p.tag === newS.tag && p.type === newS.type));
                if (existing) {
                    return {
                        ...newS,
                        imageUrl: existing.imageUrl || newS.imageUrl,
                        status: existing.imageUrl ? 'completed' : existing.status,
                        referenceImage: existing.referenceImage || newS.referenceImage,
                        aspectRatio: existing.aspectRatio || newS.aspectRatio
                    };
                }
                return newS;
            });
        });
    }, [characters, scenes, locationRef, wardrobeRef, propRef, selectedDirector, visualStyle, scriptText, dialogueText]);

    // Generate individual Concept Art Sheet
    const handleGenerateConceptSheet = async (sheetId) => {
        const sheet = conceptSheets.find(s => s.id === sheetId);
        if (!sheet) return;

        const engineLabel = selectedImageEngine.includes('gpt') ? 'ChatGPT / DALL-E' : 'Nano Banana 2';
        setConceptSheets(prev => prev.map(s => s.id === sheetId ? { ...s, status: 'generating', progressMsg: `${engineLabel}: Rendering concept sheet...`, errorMsg: '' } : s));

        try {
            const headers = { 'Content-Type': 'application/json' };
            const adminKey = getApiKey();
            if (adminKey && typeof adminKey === 'string' && adminKey.startsWith('AIza')) {
                headers['x-admin-trial-key'] = adminKey;
            }

            const resp = await fetch(getApiUrl('/api/generate-image'), {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    prompt: sheet.prompt,
                    model: selectedImageEngine,
                    aspectRatio: sheet.aspectRatio || '16:9',
                    referenceImage: sheet.referenceImage || undefined,
                    userId,
                    creditReason: 'concept_sheet_generation'
                })
            });

            const json = await resp.json();
            if (!resp.ok) throw new Error(json.error || 'Image generation failed');
            if (!json.url) throw new Error('No image URL returned from generator');

            setConceptSheets(prev => prev.map(s => s.id === sheetId ? {
                ...s,
                imageUrl: json.url,
                status: 'completed',
                progressMsg: ''
            } : s));

            refreshShorts();
        } catch (err) {
            console.error('[DirectorAgent] Concept sheet generation failed:', err);
            setConceptSheets(prev => prev.map(s => s.id === sheetId ? {
                ...s,
                status: 'error',
                errorMsg: err.message || 'Generation failed',
                progressMsg: ''
            } : s));
        }
    };

    // Batch generate all unrendered concept sheets
    const handleBatchGenerateSheets = async () => {
        const unrendered = conceptSheets.filter(s => !s.imageUrl);
        if (unrendered.length === 0) return;
        setIsBatchGeneratingSheets(true);
        for (const sheet of unrendered) {
            await handleGenerateConceptSheet(sheet.id);
        }
        setIsBatchGeneratingSheets(false);
    };

    // Upload Reference Image for specific sheet card
    const handleSheetImageUpload = (sheetId, file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            setConceptSheets(prev => prev.map(s => s.id === sheetId ? { ...s, referenceImage: dataUrl } : s));
        };
        reader.readAsDataURL(file);
    };

    // Update specific property on sheet
    const handleUpdateSheet = (sheetId, field, value) => {
        setConceptSheets(prev => prev.map(s => s.id === sheetId ? { ...s, [field]: value } : s));
    };

    // Remove sheet
    const handleRemoveSheet = (sheetId) => {
        setConceptSheets(prev => prev.filter(s => s.id !== sheetId));
    };

    // Add manual custom sheet
    const handleAddCustomSheet = (type = 'character') => {
        const id = `sheet_custom_${Date.now()}`;
        const newSheet = {
            id,
            type,
            title: type === 'character' ? 'New Character Turnaround' : type === 'location' ? 'New Environment Sheet' : type === 'prop' ? 'New Prop Sheet' : 'New Moodboard Sheet',
            name: type === 'character' ? 'New Actor' : type === 'location' ? 'New Location' : type === 'prop' ? 'Hero Prop' : 'Visual Moodboard',
            tag: type === 'character' ? `@char_custom_${Date.now().toString().slice(-4)}` : type === 'location' ? `@loc_custom_${Date.now().toString().slice(-4)}` : `@prop_custom_${Date.now().toString().slice(-4)}`,
            traits: 'Cinematic visual asset',
            prompt: `Cinematic ${type} sheet design. 8K high resolution, photorealistic concept art, studio lighting, detailed views.`,
            aspectRatio: '16:9',
            referenceImage: null,
            imageUrl: null,
            status: 'idle',
            progressMsg: '',
            errorMsg: ''
        };
        setConceptSheets(prev => [newSheet, ...prev]);
    };

    // Apply generated concept sheet as continuity anchor in left panel
    const handleApplySheetAsAnchor = (sheet, targetType) => {
        if (!sheet.imageUrl) return;
        const effectiveType = targetType || sheet.type;
        if (effectiveType === 'character') {
            const idx = characters.findIndex(c => c.tag === sheet.tag);
            if (idx >= 0) {
                setCharacters(prev => prev.map((c, i) => i === idx ? { ...c, image: sheet.imageUrl, name: sheet.name || c.name } : c));
            } else {
                setCharacters(prev => [{ ...prev[0], image: sheet.imageUrl, name: sheet.name, tag: sheet.tag }, ...prev.slice(1)]);
            }
        } else if (effectiveType === 'location') {
            setLocationRef(prev => ({ ...prev, image: sheet.imageUrl, name: sheet.name || prev.name, tag: sheet.tag || prev.tag }));
        } else if (effectiveType === 'wardrobe') {
            setWardrobeRef(prev => ({ ...prev, image: sheet.imageUrl, name: sheet.name || prev.name, tag: sheet.tag || prev.tag }));
        } else if (effectiveType === 'prop') {
            setPropRef(prev => ({ ...prev, image: sheet.imageUrl, name: sheet.name || prev.name, tag: sheet.tag || prev.tag }));
        } else if (effectiveType === 'first_frame') {
            setFirstFrameRef(prev => ({ ...prev, image: sheet.imageUrl }));
        }
    };



    // --- Script Upload Handler (.txt, .md, .doc, .docx, .pdf, .json, text files) ---
    const handleScriptFileUpload = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            if (typeof content === 'string' && content.trim()) {
                const trimmed = content.trim();
                
                // If file is JSON
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(trimmed);
                        const sText = parsed.script || parsed.screenplay || parsed.story || '';
                        const dText = parsed.dialogue || parsed.dialogues || parsed.lines || '';
                        if (sText) setScriptText(sText);
                        if (dText) setDialogueText(dText);
                        handleAutoExtractFromScript(sText || trimmed, dText);
                        return;
                    } catch (err) {
                        console.warn('[DirectorAgent] JSON parse error in script file upload:', err);
                    }
                }

                // Check if text has dialogue lines (e.g. "CHARACTER: ...")
                const hasDialogue = /^[A-Z][A-Za-z0-9_\s]{1,18}:/m.test(trimmed);
                if (hasDialogue) {
                    const lines = trimmed.split('\n');
                    const dialogues = [];
                    lines.forEach(line => {
                        if (/^[A-Z][A-Za-z0-9_\s]{1,18}:/.test(line.trim())) {
                            dialogues.push(line.trim());
                        }
                    });
                    if (dialogues.length > 0) {
                        setDialogueText(dialogues.join('\n'));
                    }
                }
                
                setScriptText(trimmed);
                handleAutoExtractFromScript(trimmed, dialogueText);
            }
        };
        reader.readAsText(file);
    };

    // --- Interactive Script Generator (Multi-Model: Gemini 2.5 Flash / Pro, Astra, GPT-4o) ---
    const handleGenerateScriptWithAstra = async () => {
        if (!scriptIdeaInput.trim()) return;
        setIsGeneratingScript(true);
        try {
            const visualStyleInfo = VISUAL_STYLES.find(s => s.id === visualStyle) || VISUAL_STYLES[0];
            const charactersSummary = characters.map((c, i) => `${c.name} (${c.tag}, ${c.traits || 'Actor in production'})`).join('; ');
            const resp = await fetch(getApiUrl('/api/forge/director/generate-script'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idea: scriptIdeaInput.trim(),
                    duration: videoDuration,
                    genre: videoGoal,
                    directorStyle: selectedDirector,
                    visualStyle: visualStyleInfo.name,
                    visualTokens: visualStyleInfo.promptTokens,
                    character: charactersSummary,
                    location: `${locationRef.name} (${locationRef.traits || ''})`,
                    aiModel: selectedAiModel
                })
            });
            if (resp.ok) {
                const data = await resp.json();
                if (data.script) {
                    setScriptText(data.script);
                    setShowScriptModal(false);
                    setScriptIdeaInput('');
                    handleAutoExtractFromScript(data.script, dialogueText);
                    setIsGeneratingScript(false);
                    return;
                }
            }

            // Direct Gemini Client-Side Fallback if Backend Offline
            const apiKey = getApiKey();
            if (apiKey) {
                const candidateModel = selectedAiModel.startsWith('gemini') ? selectedAiModel : 'gemini-2.5-flash';
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${apiKey}`;
                const geminiResp = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `You are the Lead Screenwriter & Director of ZeroLens AI Cinema Studio.
Write a formatted, industry-standard shooting script for: "${scriptIdeaInput.trim()}".
Total Duration: ${videoDuration}, Director Persona: ${selectedDirector}, Visual Art Style: ${visualStyleInfo.name} (${visualStyleInfo.promptTokens}), Characters: ${charactersSummary}, Location: ${locationRef.name}.
CRITICAL: Design with clean cinematic shot cuts tailored to the ${visualStyleInfo.name} aesthetic. STRICTLY PROHIBIT morphing, object melting, rubbery deformations, or face blending. Zero AI slop, pure 24fps continuity.`
                            }]
                        }]
                    })
                });
                if (geminiResp.ok) {
                    const gData = await geminiResp.json();
                    const gScript = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                    if (gScript) {
                        setScriptText(gScript);
                        setShowScriptModal(false);
                        setScriptIdeaInput('');
                        handleAutoExtractFromScript(gScript, dialogueText);
                    }
                }
            }
        } catch (err) {
            console.error('[DirectorAgent] Failed to generate script:', err);
        } finally {
            setIsGeneratingScript(false);
        }
    };

    // --- Live Vibe Directing Co-Pilot (Astra / Gemini Chat) ---
    const handleSendVibeMessage = async (customText = null) => {
        const userMsg = (customText || vibeInput).trim();
        if (!userMsg || isVibeDirecting) return;

        setVibeMessages(prev => [...prev, { id: `user_${Date.now()}`, sender: 'user', text: userMsg }]);
        if (!customText) setVibeInput('');
        setIsVibeDirecting(true);

        // Check if user requested a visual style change in natural language
        const lowerMsg = userMsg.toLowerCase();
        const matchedStyle = VISUAL_STYLES.find(s => 
            lowerMsg.includes(s.name.toLowerCase()) || 
            lowerMsg.includes(s.id.toLowerCase()) ||
            (s.id === 'ultra-realistic' && (lowerMsg.includes('ultra realistic') || lowerMsg.includes('ultra-real') || lowerMsg.includes('8k raw'))) ||
            (s.id === 'photorealistic' && lowerMsg.includes('photoreal')) ||
            (s.id === 'anime-2d' && (lowerMsg.includes('anime 2d') || lowerMsg.includes('ghibli') || lowerMsg.includes('2d anime'))) ||
            (s.id === 'anime-3d' && (lowerMsg.includes('anime 3d') || lowerMsg.includes('arcane') || lowerMsg.includes('3d anime'))) ||
            (s.id === 'claymation' && (lowerMsg.includes('clay') || lowerMsg.includes('claymation') || lowerMsg.includes('stop motion'))) ||
            (s.id === 'cyberpunk' && lowerMsg.includes('cyberpunk')) ||
            (s.id === 'pixar-3d' && (lowerMsg.includes('pixar') || lowerMsg.includes('cartoon') || lowerMsg.includes('disney'))) ||
            (s.id === 'dark-fantasy' && (lowerMsg.includes('dark fantasy') || lowerMsg.includes('gothic') || lowerMsg.includes('elden ring'))) ||
            (s.id === 'retro-synthwave' && (lowerMsg.includes('synthwave') || lowerMsg.includes('retro 80s') || lowerMsg.includes('outrun'))) ||
            (s.id === 'watercolor' && lowerMsg.includes('watercolor')) ||
            (s.id === 'comic-noir' && (lowerMsg.includes('noir') || lowerMsg.includes('comic noir') || lowerMsg.includes('sin city')))
        );
        if (matchedStyle) {
            setVisualStyle(matchedStyle.id);
        }

        try {
            const activeShot = shots[activeShotIndex] || null;
            const resp = await fetch(getApiUrl('/api/forge/director/chat'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    currentShots: shots,
                    activeScene: activeSceneTab,
                    activeShotIndex: activeShotIndex,
                    activeShot: activeShot,
                    aiModel: selectedAiModel,
                    currentSettings: {
                        aspectRatio,
                        resolution,
                        visualStyle,
                        visualStyleName: (matchedStyle || VISUAL_STYLES.find(s => s.id === visualStyle) || VISUAL_STYLES[0]).name,
                        videoDuration,
                        selectedDirector,
                        selectedEngine,
                        selectedAiModel,
                        characters: characters.map(c => ({ name: c.name, tag: c.tag, traits: c.traits })),
                        location: locationRef.name
                    },
                    scriptText: `${scriptText}\n\n${dialogueText}`
                })
            });

            if (resp.ok) {
                const data = await resp.json();
                if (data.reply) {
                    setVibeMessages(prev => [...prev, {
                        id: `ai_${Date.now()}`,
                        sender: 'astra',
                        text: data.reply,
                        suggestedNextSteps: data.suggestedNextSteps || []
                    }]);
                }
                if (data.updatedSettings) {
                    if (data.updatedSettings.aspectRatio) setAspectRatio(data.updatedSettings.aspectRatio);
                    if (data.updatedSettings.resolution) setResolution(data.updatedSettings.resolution);
                    if (data.updatedSettings.videoDuration) setVideoDuration(data.updatedSettings.videoDuration);
                    if (data.updatedSettings.visualStyle) setVisualStyle(data.updatedSettings.visualStyle);
                }
                if (Array.isArray(data.updatedShots) && data.updatedShots.length > 0) {
                    setShots(data.updatedShots);
                }
            }
        } catch (err) {
            console.error('[DirectorAgent] Vibe directing failed:', err);
            setVibeMessages(prev => [...prev, {
                id: `err_${Date.now()}`,
                sender: 'astra',
                text: "I encountered a minor bump connecting to the director node, but your instructions are noted. You can re-try or adjust shot prompts directly."
            }]);
        } finally {
            setIsVibeDirecting(false);
        }
    };

    // --- Per-Shot Prompt Polish with AI Model ---
    const handlePolishShotWithAstra = async (shotIndex) => {
        const shot = shots[shotIndex];
        if (!shot) return;
        setPolishingShotIndex(shotIndex);
        try {
            const visualStyleInfo = VISUAL_STYLES.find(s => s.id === visualStyle) || VISUAL_STYLES[0];
            const shotChar = characters.find(c => c.tag === shot.characterTag) || characters[0];
            const resp = await fetch(getApiUrl('/api/forge/write-prompt'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: shot.omniPrompt,
                    scenario: `Shot ${shot.shotNumber}: ${shot.title} (${shot.shotType}, ${shot.cameraMotion})${shot.dialogueLine ? ` - Dialogue: ${shot.dialogueLine}` : ''}`,
                    type: 'video',
                    style: `${selectedDirector} (${visualStyleInfo.name} - ${visualStyleInfo.promptTokens})`,
                    character: shotChar ? `${shotChar.name} (${shotChar.tag})` : characters.map(c => c.tag).join(', '),
                    location: locationRef.tag,
                    aiModel: selectedAiModel
                })
            });
            if (resp.ok) {
                const data = await resp.json();
                if (data.refinedPrompt) {
                    setShots(prev => prev.map((s, i) => i === shotIndex ? {
                        ...s,
                        omniPrompt: data.refinedPrompt,
                        cameraMotion: data.cameraMotion || s.cameraMotion,
                        audioBeat: data.audioCue || s.audioBeat
                    } : s));
                }
            }
        } catch (err) {
            console.error('[DirectorAgent] Polish shot failed:', err);
        } finally {
            setPolishingShotIndex(null);
        }
    };

    // --- Per-Shot Camera Motion Override ---
    const handleShotMotionChange = (shotIndex, newMotion) => {
        setShots(prev => prev.map((s, i) => i === shotIndex ? {
            ...s,
            cameraMotion: newMotion,
            omniPrompt: s.omniPrompt.includes('Camera executes') 
                ? s.omniPrompt.replace(/Camera executes [^.]+/, `Camera executes ${newMotion}`)
                : `${s.omniPrompt}. Camera executes ${newMotion}.`
        } : s));
    };

    // --- MULTI-AGENT STORYBOARD & DIALOGUE ORCHESTRATOR ---
    const handleOrchestrate = async () => {
        const fullScriptContext = (scriptText.trim() + (dialogueText.trim() ? `\n\nSPOKEN DIALOGUES & LINES:\n${dialogueText.trim()}` : '')).trim();
        if (!fullScriptContext) return;

        setIsOrchestrating(true);
        setOrchestratorStep('vision'); // Visual analysis of characters & location

        const durNum = parseInt(videoDuration, 10) || 60;
        // Gemini Omni Flash 1.1 / Veo strictly provide 10-second segments
        const shotDuration = 10;
        const targetShotsCount = Math.max(1, Math.round(durNum / shotDuration));

        // Format all characters details
        const charactersBlock = characters.map((c, i) => 
            `- Actor ${i + 1}: ${c.name} (Tag: ${c.tag}, Likeness/Traits: ${c.traits || 'Actor in role'}, Photo Uploaded: ${c.image ? 'Yes' : 'No'})`
        ).join('\n');

        const primaryCharTag = characters[0]?.tag || '@char_1';
        const allCharTags = characters.map(c => c.tag).join(', ');
        const directorInfo = DIRECTORS.find(d => d.name === selectedDirector) || DIRECTORS[0];
        const visualStyleInfo = VISUAL_STYLES.find(s => s.id === visualStyle) || VISUAL_STYLES[0];

        // Prompt for the LLM
        const prompt = `You are the Lead Director & Storyboard Architect of ZeroLens AI Cinema Studio.
Analyze the following project setup, screenplay script, and spoken character dialogues.
Deconstruct this story strictly into exactly ${targetShotsCount} sequential cinematic shots (each exactly ${shotDuration}s continuous clip) for a ${durNum}-second film across ${Math.min(3, Math.max(1, Math.ceil(targetShotsCount / 2)))} distinct dramatic SCENES.

CRITICAL DIRECTING & ANTI-MORPHING INSTRUCTIONS:
1. Ground every shot strictly in the provided SCRIPT and SPOKEN DIALOGUES. Do NOT invent random placeholder templates, costumes, or wardrobes.
2. ZERO MORPHING: Human faces, bodies, clothing, and objects must NEVER melt, warp, or morph.
3. CLEAN CINEMATIC CUTS: If camera perspective or scene changes between shots, use sharp cinematic cut markers (e.g. "[Cut to: Close-Up]", "[Cut to: Wide Tracking]") — strictly prohibit soft warping or morphing transitions.
4. ZERO AI SLOP: Ban plastic/waxy skin, extra fingers/limbs, distorted geometry, background soup, cheap CGI halo/glow, and floating text.
5. If spoken dialogue is provided, assign the exact dialogue line and vocal emotion to the corresponding 10-second shot.
6. Incorporate the requested Aspect Ratio (${aspectRatio}), Visual Art Style (${visualStyleInfo.name}: ${visualStyleInfo.promptTokens}), and Director Persona style (${selectedDirector}: ${directorInfo.mood}) into every prompt.
7. Keep character tags (${allCharTags}) and location tag (${locationRef.tag}) consistent.
${wardrobeRef.name ? `8. Wardrobe tag: ${wardrobeRef.tag} (${wardrobeRef.name})` : '8. No specific wardrobe required unless described in the script.'}
${propRef.name ? `9. Hero Prop tag: ${propRef.tag} (${propRef.name})` : '9. No specific prop required unless described in the script.'}

PROJECT SETUP:
- Title: ${projectName}
- Total Duration: ${videoDuration} (${targetShotsCount} sequential shots, ${shotDuration}s each)
- Aspect Ratio: ${aspectRatio}
- Visual Art Style: ${visualStyleInfo.name} (${visualStyleInfo.promptTokens})
- Director Style: ${selectedDirector} (${directorInfo.focus}, ${directorInfo.mood})
- Commercial Goal: ${videoGoal}
- AI Reasoning Engine: ${selectedAiModel}
- Video Render Engine: Gemini Omni Flash 1.1 (${shotDuration}s continuous clips)

CAST & CHARACTERS:
${charactersBlock}

LOCATION ANCHOR:
- Location: ${locationRef.name} (Tag: ${locationRef.tag}, Details: ${locationRef.traits || 'Atmospheric setting'}, Photo Uploaded: ${locationRef.image ? 'Yes' : 'No'})

${wardrobeRef.name ? `WARDROBE ANCHOR:\n- Wardrobe: ${wardrobeRef.name} (Tag: ${wardrobeRef.tag}, Details: ${wardrobeRef.traits || 'Costume'})` : ''}
${propRef.name ? `PROP ANCHOR:\n- Prop: ${propRef.name} (Tag: ${propRef.tag}, Details: ${propRef.traits || 'Hero item'})` : ''}

STORY SCREENPLAY:
"""
${scriptText}
"""

${dialogueText.trim() ? `SPOKEN DIALOGUES & LINES:\n"""\n${dialogueText.trim()}\n"""` : ''}

OUTPUT FORMAT REQUIREMENTS:
Return ONLY a valid JSON array containing exactly ${targetShotsCount} shot objects grouped into scenes. No markdown formatting, no commentary, just the JSON array:
[
  {
    "sceneNumber": 1,
    "sceneTitle": "Short descriptive scene title",
    "shotNumber": 1,
    "title": "Short descriptive title",
    "shotType": "Wide Establishing | Close-Up | Macro Detail | Dolly Tracking | Crane Tilt | Over-the-Shoulder",
    "cameraMotion": "Slow push-in dolly / Pan left / Static lock / Orbit / Tracking run",
    "duration": ${shotDuration},
    "mode": "i2v",
    "characterTag": "${primaryCharTag}",
    "locationTag": "${locationRef.tag}",
    "wardrobeTag": "${wardrobeRef.tag || ''}",
    "propTag": "${propRef.tag || ''}",
    "dialogueLine": "Exact spoken line from script or dialogue (or None)",
    "omniPrompt": "[0-${shotDuration}s] ${visualStyleInfo.name}, ${visualStyleInfo.promptTokens}, ${aspectRatio} aspect ratio, ${directorInfo.mood} atmosphere. Describe visual beat, camera move, lighting, character action from script, dialogue delivery, tag character (${allCharTags}), location (${locationRef.tag}). Clean cinematic cut framing, zero morphing, zero visual warping, natural physical motion, 24fps shutter.",
    "audioBeat": "Spoken dialogue / environmental sound effect and musical cue"
  }
]`;

        try {
            let jsonText = null;

            // Step 1: Visual Grounding & Vision Analysis of Characters & Location
            await new Promise(r => setTimeout(r, 400));
            setOrchestratorStep('vision');

            // Step 2: Screenplay & Scenario Architecture with Selected AI Model
            await new Promise(r => setTimeout(r, 350));
            setOrchestratorStep('screenplay');

            // Tier 1: Backend API Call (Gemini / Astra)
            try {
                console.log(`[DirectorAgent] Orchestrating screenplay via backend (${selectedAiModel})...`);
                const astraResp = await fetch(getApiUrl('/api/forge/refine-narrative'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: prompt,
                        type: 'director_storyboard',
                        scenario: fullScriptContext,
                        format: 'video',
                        aiModel: selectedAiModel
                    })
                });

                if (astraResp.ok) {
                    const astraData = await astraResp.json();
                    jsonText = astraData.narrative || astraData.refined;
                }
            } catch (astraErr) {
                console.warn('[DirectorAgent] Backend orchestration call failed, attempting Tier 2 client Gemini:', astraErr);
            }

            // Step 3: Continuity Agent
            await new Promise(r => setTimeout(r, 350));
            setOrchestratorStep('continuity');

            // Step 4: Cinematographer Agent
            await new Promise(r => setTimeout(r, 350));
            setOrchestratorStep('cinematographer');

            // Parse output
            let parsedShots = [];
            if (jsonText) {
                try {
                    const match = jsonText.match(/\[\s*\{[\s\S]*\}\s*\]/);
                    const cleanJson = match ? match[0] : jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
                    parsedShots = JSON.parse(cleanJson);
                } catch (parseErr) {
                    console.warn('[DirectorAgent] JSON parse error, checking fallbacks:', parseErr);
                }
            }

            // Tier 2: Client-side Gemini fallback if backend was unavailable
            if (!Array.isArray(parsedShots) || parsedShots.length === 0) {
                try {
                    const apiKey = getApiKey();
                    if (apiKey) {
                        const targetModel = selectedAiModel.startsWith('gemini') ? selectedAiModel : 'gemini-2.5-flash';
                        console.log(`[DirectorAgent] Executing Tier 2 client-side Gemini breakdown (${targetModel})...`);
                        const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
                        const geminiResp = await fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: `${prompt}\n\nReturn strict JSON array only.` }] }]
                            })
                        });
                        if (geminiResp.ok) {
                            const geminiData = await geminiResp.json();
                            const gText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
                            const match = gText.match(/\[\s*\{[\s\S]*\}\s*\]/);
                            if (match) {
                                parsedShots = JSON.parse(match[0]);
                            }
                        }
                    }
                } catch (cErr) {
                    console.warn('[DirectorAgent] Client-side Gemini fallback failed:', cErr);
                }
            }

            // Tier 3: Deterministic Script & Dialogue Slicer (Guaranteed Accurate, Zero Hallucinations)
            if (!Array.isArray(parsedShots) || parsedShots.length === 0) {
                console.log('[DirectorAgent] Building deterministic script & dialogue breakdown with Anti-Morphing guarantees...');
                
                const scriptSentences = scriptText
                    .split(/(?<=[.!?\n])\s+/)
                    .map(s => s.trim())
                    .filter(s => s.length > 0);

                const dialogueLines = dialogueText
                    .split('\n')
                    .map(l => l.trim())
                    .filter(l => l.length > 0);

                parsedShots = Array.from({ length: targetShotsCount }, (_, i) => {
                    const shotNum = i + 1;
                    const isFirst = shotNum === 1;
                    const isLast = shotNum === targetShotsCount;
                    const sNum = shotNum <= Math.ceil(targetShotsCount / 2) ? 1 : 2;
                    
                    const shotType = isFirst 
                        ? 'Wide Establishing Shot' 
                        : isLast 
                            ? 'Hero Emotional Close-Up' 
                            : shotNum % 3 === 0 
                                ? 'Dynamic Dolly Tracking' 
                                : shotNum % 2 === 0 
                                    ? 'Medium Character Profile' 
                                    : 'Atmospheric Macro Detail';

                    const cameraMotion = isFirst 
                        ? 'Slow cinematic push-in dolly' 
                        : isLast 
                            ? 'Gentle orbit ending in locked hero composition' 
                            : shotNum % 2 === 0 
                                ? 'Smooth lateral dolly tracking subject movement' 
                                : 'Handheld organic drift with subtle tilt';

                    // Map sentence / action beat
                    const beatIndex = Math.floor((i / targetShotsCount) * Math.max(1, scriptSentences.length));
                    const currentBeat = scriptSentences[beatIndex] || `Scene action beat ${shotNum} in ${locationRef.name}`;
                    
                    // Map dialogue line
                    const dialogueIndex = Math.floor((i / targetShotsCount) * Math.max(1, dialogueLines.length));
                    const currentDialogue = dialogueLines.length > 0 ? (dialogueLines[dialogueIndex] || dialogueLines[i % dialogueLines.length]) : '';

                    const charObj = characters[i % characters.length] || characters[0];
                    const charName = charObj?.name || 'Actor';
                    const charTag = charObj?.tag || primaryCharTag;

                    const wardrobePart = wardrobeRef.name ? ` wearing ${wardrobeRef.name} (${wardrobeRef.tag})` : '';
                    const propPart = propRef.name ? ` featuring ${propRef.name} (${propRef.tag})` : '';
                    const dialoguePart = currentDialogue ? ` Spoken dialogue: ${currentDialogue}.` : '';

                    const promptBeat = `[0-${shotDuration}s] ${visualStyleInfo.name}, ${visualStyleInfo.promptTokens}, ${aspectRatio} aspect ratio, ${directorInfo.mood} atmosphere. ${shotType} in ${locationRef.name} (${locationRef.tag}). Camera executes ${cameraMotion}. ${charName} (${charTag})${wardrobePart}${propPart}. Action: ${currentBeat}.${dialoguePart} Clean cinematic cut framing, zero morphing, zero visual warping, natural physical motion, 24fps shutter.`;

                    return {
                        sceneNumber: sNum,
                        sceneTitle: sNum === 1 ? 'Scene 1: Opening Hook & Narrative Intro' : 'Scene 2: Climax & Resolution',
                        shotNumber: shotNum,
                        title: isFirst ? 'Opening Beat' : isLast ? 'Dramatic Climax' : `Narrative Beat ${shotNum}`,
                        shotType,
                        cameraMotion,
                        duration: shotDuration,
                        mode: isFirst ? 'i2v' : 'extend',
                        characterTag: charTag,
                        locationTag: locationRef.tag,
                        wardrobeTag: wardrobeRef.tag || '',
                        propTag: propRef.tag || '',
                        dialogueLine: currentDialogue || 'None',
                        omniPrompt: promptBeat,
                        audioBeat: currentDialogue ? `Spoken dialogue: "${currentDialogue}"` : `${directorInfo.mood} atmospheric cinematic score, subtle foley`
                    };
                });
            }

            // Extract distinct scenes from the shots
            const extractedScenes = [];
            const sceneMap = new Map();
            parsedShots.forEach((s) => {
                const sNum = s.sceneNumber || 1;
                if (!sceneMap.has(sNum)) {
                    const scObj = {
                        sceneNumber: sNum,
                        title: s.sceneTitle || `Scene ${sNum}: ${s.title || 'Cinematic Beat'}`,
                        characterTag: s.characterTag || primaryCharTag,
                        locationTag: s.locationTag || locationRef.tag,
                        wardrobeTag: s.wardrobeTag || wardrobeRef.tag || '',
                        propTag: s.propTag || propRef.tag || '',
                        beat: s.title || `Scene beat ${sNum}`
                    };
                    sceneMap.set(sNum, scObj);
                    extractedScenes.push(scObj);
                }
            });

            if (extractedScenes.length > 0) {
                setScenes(extractedScenes);
                setActiveSceneTab(extractedScenes[0].sceneNumber);
            }

            // Initialize shots with runtime state
            const initializedShots = parsedShots.map((s, idx) => ({
                ...s,
                id: `shot_${Date.now()}_${idx}`,
                status: 'idle', // 'idle' | 'generating' | 'completed' | 'error'
                videoUrl: null,
                startFrame: idx === 0 ? (firstFrameRef.image || characters[0]?.image || locationRef.image) : null,
                endFrame: null,
                progressMsg: '',
                errorMsg: ''
            }));

            setShots(initializedShots);
            setActiveShotIndex(0);
            setOrchestratorStep('complete');

            // Save Continuity Anchors into memory
            const initialMemories = [
                ...characters.map(c => `Character Profile: ${c.name} (${c.tag}) - ${c.traits || 'Actor'}`),
                ...(wardrobeRef.name ? [`Wardrobe Profile: ${wardrobeRef.name} (${wardrobeRef.tag}) - ${wardrobeRef.traits || 'Costume'}`] : []),
                ...(propRef.name ? [`Prop Profile: ${propRef.name} (${propRef.tag}) - ${propRef.traits || 'Hero Asset'}`] : []),
                `Location Profile: ${locationRef.name} (${locationRef.tag}) - ${locationRef.traits || 'Set'}`,
                `Director Style: ${selectedDirector} (${directorInfo.mood}) - Aspect Ratio: ${aspectRatio}`
            ];
            saveMemoryToBackend(Array.from(new Set([...memory, ...initialMemories])));

        } catch (err) {
            console.error('[DirectorAgent] Orchestration failed:', err);
        } finally {
            setIsOrchestrating(false);
            setOrchestratorStep(null);
        }
    };

    // --- Scene Management Handlers ---
    const handleAddScene = () => {
        const nextSceneNum = scenes.length + 1;
        const defaultCharTag = characters[0]?.tag || '@char_actor';
        const newScene = {
            sceneNumber: nextSceneNum,
            title: `Scene ${nextSceneNum}: Fresh Location & Beat`,
            locationTag: locationRef.tag,
            characterTag: defaultCharTag,
            wardrobeTag: wardrobeRef.tag,
            propTag: propRef.tag,
            beat: 'New dramatic scene beat in fresh environment'
        };
        setScenes(prev => [...prev, newScene]);
        setActiveSceneTab(nextSceneNum);

        // Add a default 10s shot for the new scene
        const nextShotNum = shots.length + 1;
        const newShot = {
            id: `shot_${Date.now()}`,
            sceneNumber: nextSceneNum,
            shotNumber: nextShotNum,
            title: `Scene ${nextSceneNum} Opening Establishing`,
            shotType: 'Wide Establishing',
            cameraMotion: 'Slow push-in dolly',
            duration: 10,
            mode: 'i2v',
            characterTag: defaultCharTag,
            locationTag: locationRef.tag,
            wardrobeTag: wardrobeRef.tag,
            propTag: propRef.tag,
            omniPrompt: `[0-10s] 8K IMAX cinema. Establishing wide shot for Scene ${nextSceneNum}. Camera executes slow push-in dolly. Featuring ${characters[0]?.name || 'Actor'} (${defaultCharTag}) in ${wardrobeRef.name} (${wardrobeRef.tag}). Photorealistic 24fps motion.`,
            audioBeat: 'Atmospheric room tone and subtle ambient resonance',
            status: 'idle',
            videoUrl: null,
            progressMsg: '',
            errorMsg: ''
        };
        setShots(prev => [...prev, newShot]);
    };

    const handleAddShotToActiveScene = () => {
        const targetSceneNum = activeSceneTab === 'all' ? (scenes[0]?.sceneNumber || 1) : activeSceneTab;
        handleAddShotToScene(targetSceneNum);
    };

    const handleAddShotToScene = (sceneNum) => {
        const currentScene = scenes.find(s => s.sceneNumber === sceneNum);
        const sceneShots = shots.filter(s => s.sceneNumber === sceneNum);
        const nextShotNum = sceneShots.length + 1;
        const defaultCharTag = characters[0]?.tag || '@char_actor_1';

        const newShot = {
            id: `shot_${Date.now()}`,
            sceneNumber: sceneNum,
            shotNumber: nextShotNum,
            title: `Shot ${nextShotNum}: Detail Beat`,
            shotType: 'Medium Dynamic Coverage',
            cameraMotion: 'Subtle lateral dolly track with steady focal framing',
            duration: 10,
            aspectRatio: aspectRatio || '16:9',
            resolution: resolution || '1080p',
            mode: 'i2v',
            characterTag: defaultCharTag,
            locationTag: currentScene?.locationTag || locationRef.tag || '@loc_setting',
            wardrobeTag: wardrobeRef.tag || '',
            propTag: propRef.tag || '',
            dialogueLine: '',
            startFrame: null,
            endFrame: null,
            omniPrompt: `[0-10s] 8K IMAX cinema in ${currentScene?.locationTag || locationRef.name}. Dynamic medium tracking shot. Featuring ${characters[0]?.name || 'Actor'} (${defaultCharTag}). Clean discrete cut, zero morphing, photorealistic 24fps motion.`,
            audioBeat: 'Dynamic cinematic foley and ambient atmosphere',
            status: 'idle',
            videoUrl: null,
            progressMsg: '',
            errorMsg: ''
        };
        setShots(prev => [...prev, newShot]);
    };

    const handleUpdateScene = (sceneNum, field, value) => {
        setScenes(prev => prev.map(s => s.sceneNumber === sceneNum ? { ...s, [field]: value } : s));
    };

    // --- VIDEO GENERATION PER SHOT (GEMINI OMNI FLASH 1.1 / SEEDANCE 2.0) ---
    const handleGenerateShot = async (shotIndex) => {
        const shot = shots[shotIndex];
        if (!shot) return;

        // Target render resolution & aspect ratio
        const targetResolution = shot.resolution || resolution || '1080p';
        const targetAspectRatio = shot.aspectRatio || aspectRatio || '16:9';

        // Update shot status to generating
        setShots(prev => prev.map((s, i) => i === shotIndex ? { ...s, status: 'generating', progressMsg: `Submitting (${targetResolution})...`, errorMsg: '' } : s));

        try {
            const isOmni = selectedEngine === 'omni-flash';
            const headers = { 'Content-Type': 'application/json' };
            const adminKey = getApiKey();
            if (adminKey && typeof adminKey === 'string' && adminKey.startsWith('AIza')) {
                headers['x-admin-trial-key'] = adminKey;
            }

            // Resolve reference image for start frame
            let firstFrameImage = shot.startFrame;
            if (!firstFrameImage && shot.mode === 'i2v') {
                const shotChar = characters.find(c => c.tag === shot.characterTag) || characters[0];
                firstFrameImage = shotChar?.image || locationRef.image || firstFrameRef.image;
            }

            const refImages = [];
            characters.forEach(c => {
                if (c.image) refImages.push({ url: c.image, tag: c.tag });
            });
            if (wardrobeRef?.image) refImages.push({ url: wardrobeRef.image });
            if (propRef?.image) refImages.push({ url: propRef.image });
            if (locationRef.image) refImages.push({ url: locationRef.image });
            if (firstFrameRef.image) refImages.push({ url: firstFrameRef.image });

            if (isOmni) {
                // Submit to Gemini Omni Flash (/api/omni-i2v)
                setShots(prev => prev.map((s, i) => i === shotIndex ? { ...s, progressMsg: `Omni Flash 1.1 (${targetResolution}): Synthesizing photorealistic scene...` } : s));

                const resp = await fetch(getApiUrl('/api/omni-i2v'), {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        image: firstFrameImage || undefined,
                        firstFrameImage: firstFrameImage || undefined,
                        lastFrameImage: shot.endFrame || undefined,
                        motionPrompt: shot.omniPrompt,
                        duration: shot.duration || 5,
                        aspectRatio: targetAspectRatio,
                        resolution: targetResolution,
                        model: 'gemini-omni-flash-preview',
                        ref_images: refImages,
                        userId,
                        generateAudio: true,
                        creditReason: 'cinematic_video_generation'
                    })
                });

                const json = await resp.json();
                if (!resp.ok) throw new Error(json.error || 'Gemini Omni Flash task failed.');
                if (!json.videoUrl) throw new Error('Omni returned no video URL.');

                // Update shot with generated video
                setShots(prev => prev.map((s, i) => i === shotIndex ? {
                    ...s,
                    status: 'completed',
                    videoUrl: json.videoUrl,
                    progressMsg: ''
                } : s));

                refreshShorts();
                return;
            }

            // Seedance 2.0 / Seedance Fast
            const is1080p = targetResolution === '1080p' || targetResolution === '4K';
            const seedanceEngine = is1080p ? 'seedace' : 'seedance-fast';
            const seedanceModel = is1080p ? 'dreamina-seedance-2-0-260128' : 'dreamina-seedance-2-0-fast-260128';

            setShots(prev => prev.map((s, i) => i === shotIndex ? { ...s, progressMsg: `Seedance 2.0 (${targetResolution}): Initializing render...` } : s));

            const resp = await fetch(getApiUrl('/api/seedance/generate'), {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    engine: seedanceEngine,
                    model: seedanceModel,
                    seedanceContentArray: [
                        { type: 'text', text: shot.omniPrompt },
                        ...(firstFrameImage ? [{ type: 'image_url', image_url: { url: firstFrameImage }, role: 'reference_image' }] : [])
                    ],
                    duration: shot.duration || 5,
                    aspectRatio: targetAspectRatio,
                    resolution: targetResolution === '4K' ? '1080p' : (targetResolution === '720p' ? '720p' : '1080p'),
                    userId,
                    generateAudio: true,
                    creditReason: 'cinematic_video_generation'
                })
            });

            const json = await resp.json();
            if (!resp.ok) throw new Error(json.error || 'Seedance initialization failed.');
            const taskId = json.requestId;
            if (!taskId) throw new Error('No task ID returned.');
            const returnedEngine = json.engine || seedanceEngine;

            // Poll task
            for (let p = 0; p < 120; p++) {
                await new Promise(r => setTimeout(r, 5000));
                const statusResp = await fetch(getApiUrl(`/api/seedance/status/${taskId}?userId=${userId}&aspectRatio=${targetAspectRatio}&engine=${returnedEngine}`));
                const statusJson = await statusResp.json();
                if (statusJson.status === 'completed' && statusJson.url) {
                    setShots(prev => prev.map((s, i) => i === shotIndex ? { ...s, status: 'completed', videoUrl: statusJson.url, progressMsg: '' } : s));
                    refreshShorts();
                    return;
                }
                if (statusJson.status === 'failed' || statusJson.status === 'error') {
                    throw new Error(statusJson.error || 'Seedance generation failed.');
                }
                setShots(prev => prev.map((s, i) => i === shotIndex ? { ...s, progressMsg: `Rendering frame sequence (${(p + 1) * 5}s)...` } : s));
            }
            throw new Error('Video generation timed out.');

        } catch (err) {
            console.error(`[DirectorAgent] Shot ${shotIndex + 1} generation failed:`, err);
            setShots(prev => prev.map((s, i) => i === shotIndex ? {
                ...s,
                status: 'error',
                errorMsg: err.message || 'Generation failed.',
                progressMsg: ''
            } : s));
        }
    };

    // --- SHOT EXTENSION VIA LAST FRAME SCREENSHOT (KEY USER REQUIREMENT) ---
    const handleExtendShot = async (sourceShotIndex, extendDuration = 5) => {
        const sourceShot = shots[sourceShotIndex];
        if (!sourceShot || !sourceShot.videoUrl) return;

        // Visual notification
        setShots(prev => prev.map((s, i) => i === sourceShotIndex ? { ...s, progressMsg: 'Capturing final keyframe to extend...' } : s));

        try {
            // Grab screenshot of the last frame from source video
            const lastFrameScreenshot = await captureVideoLastFrame(sourceShot.videoUrl, 0.4);

            // Construct new extended shot
            const newShot = {
                id: `shot_ext_${Date.now()}`,
                sceneNumber: sourceShot.sceneNumber,
                shotNumber: sourceShot.shotNumber + 0.1,
                title: `${sourceShot.title} (Extended +${extendDuration}s)`,
                shotType: 'Continuous Motion Extension',
                cameraMotion: 'Seamless continuation of camera inertia and subject action',
                duration: extendDuration,
                mode: 'extend',
                characterTag: sourceShot.characterTag,
                locationTag: sourceShot.locationTag,
                startFrame: lastFrameScreenshot || sourceShot.startFrame,
                endFrame: null,
                omniPrompt: `[0-${extendDuration}s] Continuous shot continuing seamlessly from the start frame. Maintain complete identity, hair, wardrobe, and environment lighting matching the previous frame. Camera continues forward momentum. Photorealistic 24fps motion.`,
                audioBeat: 'Natural ambient continuation and room tone',
                status: 'idle',
                videoUrl: null,
                progressMsg: '',
                errorMsg: ''
            };

            // Insert immediately after the source shot
            const nextShots = [...shots];
            nextShots.splice(sourceShotIndex + 1, 0, newShot);
            setShots(nextShots);
            setActiveShotIndex(sourceShotIndex + 1);

            // Clear progress msg on source
            setShots(prev => prev.map((s, i) => i === sourceShotIndex ? { ...s, progressMsg: '' } : s));

        } catch (err) {
            console.error('[DirectorAgent] Extend shot failed:', err);
            setShots(prev => prev.map((s, i) => i === sourceShotIndex ? { ...s, progressMsg: '', errorMsg: 'Failed to capture frame for extension.' } : s));
        }
    };

    // --- UNIFIED SEQUENCE MOVIE PLAYER ---
    const generatedClips = shots.filter(s => s.status === 'completed' && s.videoUrl);

    const handlePlaySequence = () => {
        if (generatedClips.length === 0) return;
        setSequenceIndex(0);
        setIsPlayingSequence(true);
    };

    const handleSequenceEnded = () => {
        if (sequenceIndex < generatedClips.length - 1) {
            setSequenceIndex(prev => prev + 1);
        } else {
            setIsPlayingSequence(false);
            setSequenceIndex(0);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#06060c] text-white overflow-hidden select-none font-sans">
            
            {/* ================= TOP BAR ================= */}
            <header className="h-14 shrink-0 px-5 border-b border-white/[0.06] bg-[#090913]/80 backdrop-blur-xl flex items-center justify-between z-30">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/30 border border-violet-400/30">
                        <Film className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black tracking-widest uppercase bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                                Director Agent
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[8px] font-black uppercase tracking-wider">
                                Director Mode
                            </span>
                        </div>
                        <input
                            type="text"
                            value={projectName}
                            onChange={e => setProjectName(e.target.value)}
                            className="bg-transparent text-[11px] text-white/70 font-semibold tracking-wide hover:text-white focus:text-white outline-none w-64 truncate"
                        />
                    </div>
                </div>

                {/* CENTER: Primary View Switcher (Storyboard Deck vs Visual Concept Sheets) & Navigation */}
                <div className="flex items-center gap-2.5 overflow-x-auto custom-scrollbar max-w-2xl px-2">
                    {/* Primary Switcher Tabs */}
                    <div className="flex items-center bg-black/60 p-1 rounded-2xl border border-white/10 shrink-0 gap-1 shadow-inner">
                        <button
                            type="button"
                            onClick={() => setMainViewMode('storyboard')}
                            className={cn(
                                "px-3 py-1 rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                                mainViewMode === 'storyboard'
                                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-950/50"
                                    : "text-white/50 hover:text-white"
                            )}
                        >
                            <Clapperboard className="w-3 h-3 text-cyan-300" />
                            <span>Storyboard</span>
                            <span className="px-1.5 py-0.2 rounded-md bg-black/40 text-[8px] font-mono text-cyan-200">{shots.length}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMainViewMode('concept_sheets')}
                            className={cn(
                                "px-3 py-1 rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                                mainViewMode === 'concept_sheets'
                                    ? "bg-gradient-to-r from-cyan-600 to-emerald-600 text-white shadow-md shadow-cyan-950/50"
                                    : "text-white/50 hover:text-white"
                            )}
                        >
                            <ImageIcon className="w-3 h-3 text-emerald-300" />
                            <span>Visual Concept Sheets</span>
                            <span className="px-1.5 py-0.2 rounded-md bg-black/40 text-[8px] font-mono text-emerald-200">{conceptSheets.length}</span>
                        </button>
                    </div>

                    {/* Sub-navigation based on active view */}
                    {mainViewMode === 'storyboard' ? (
                        <div className="flex items-center gap-1.5 border-l border-white/10 pl-2.5">
                            {scenes.map((sc) => {
                                const isCurrent = activeSceneTab === sc.sceneNumber;
                                const sceneShotCount = shots.filter(s => (s.sceneNumber || 1) === sc.sceneNumber).length;
                                return (
                                    <button
                                        key={sc.sceneNumber}
                                        onClick={() => setActiveSceneTab(sc.sceneNumber)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 border cursor-pointer",
                                            isCurrent
                                                ? "bg-gradient-to-r from-violet-600/40 to-indigo-600/40 text-white border-violet-500/60 shadow-lg shadow-violet-950/40"
                                                : "bg-white/[0.02] hover:bg-white/[0.06] text-white/50 hover:text-white border-white/5"
                                        )}
                                    >
                                        <Film className={cn("w-3 h-3", isCurrent ? "text-violet-400" : "text-white/30")} />
                                        <span>Scene {sc.sceneNumber}</span>
                                        <span className={cn("text-[8px] px-1.5 py-0.2 rounded-md font-mono", isCurrent ? "bg-violet-500/30 text-violet-200" : "bg-white/5 text-white/40")}>
                                            {sceneShotCount}
                                        </span>
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => setActiveSceneTab('all')}
                                className={cn(
                                    "px-2 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all shrink-0 border cursor-pointer",
                                    activeSceneTab === 'all'
                                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-950/30"
                                        : "bg-white/[0.02] hover:bg-white/[0.06] text-white/40 hover:text-white border-white/5"
                                )}
                            >
                                All ({shots.length})
                            </button>

                            <button
                                onClick={handleAddScene}
                                className="px-2 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 transition-all shrink-0 flex items-center gap-1 hover:border-violet-400 cursor-pointer"
                                title="Add New Scene"
                            >
                                <Plus className="w-3 h-3" />
                                <span>Scene</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 border-l border-white/10 pl-2.5">
                            {[
                                { id: 'all', label: 'All', count: conceptSheets.length },
                                { id: 'character', label: 'Cast', count: conceptSheets.filter(s => s.type === 'character').length },
                                { id: 'location', label: 'Locations', count: conceptSheets.filter(s => s.type === 'location').length },
                                { id: 'prop', label: 'Props', count: conceptSheets.filter(s => s.type === 'prop').length },
                                { id: 'moodboard', label: 'Moodboard', count: conceptSheets.filter(s => s.type === 'moodboard').length }
                            ].map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setConceptCategoryFilter(cat.id)}
                                    className={cn(
                                        "px-2 py-1 rounded-xl text-[8.5px] font-bold uppercase tracking-wider transition-all shrink-0 border flex items-center gap-1 cursor-pointer",
                                        conceptCategoryFilter === cat.id
                                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-950/30"
                                            : "bg-white/[0.02] text-white/40 hover:text-white border-white/5"
                                    )}
                                >
                                    <span>{cat.label}</span>
                                    <span className="text-[7.5px] opacity-60 font-mono">({cat.count})</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT: AI Model Selector, Direct with AI & Memory Controls */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* AI Story & Director Model Dropdown */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/50 border border-cyan-500/30 text-[9px] font-mono shadow-sm">
                        <Bot className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="text-[8px] uppercase tracking-wider text-white/40 hidden xl:inline font-bold">AI Brain:</span>
                        <select
                            value={selectedAiModel}
                            onChange={e => setSelectedAiModel(e.target.value)}
                            className="bg-transparent text-cyan-300 font-black outline-none cursor-pointer text-[9px]"
                            title="AI Story, Scriptwriting & Storyboard Breakdown Engine"
                        >
                            {AI_DIRECTOR_MODELS.map(m => (
                                <option key={m.id} value={m.id} className="bg-[#0c0c16] text-white">
                                    {m.name} ({m.badge})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Sequence Movie Playback Trigger */}
                    {generatedClips.length > 0 && (
                        <button
                            onClick={handlePlaySequence}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black font-black text-[9.5px] uppercase tracking-wider shadow-lg shadow-emerald-950/40 transition-all"
                        >
                            <Play className="w-3 h-3 fill-black" />
                            <span>Play Reel ({generatedClips.length})</span>
                        </button>
                    )}

                    {/* Vibe Directing Co-Pilot Toggle */}
                    <button
                        onClick={() => setShowVibeDirector(!showVibeDirector)}
                        className={cn(
                            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all shadow-md group",
                            showVibeDirector 
                                ? "bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 border-cyan-400 text-white shadow-violet-900/40 ring-1 ring-cyan-400/50" 
                                : "bg-violet-600/15 border-violet-500/30 text-violet-300 hover:bg-violet-600/25 hover:border-violet-400 hover:text-white"
                        )}
                        title="Open AI Co-Director chat to tweak storyboard, individual shots, lighting, and camera moves live"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-cyan-300 group-hover:rotate-12 transition-transform" />
                        <span>Direct with AI</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    </button>

                    {/* Memory Drawer Toggle */}
                    <button
                        onClick={() => setShowMemoryPanel(!showMemoryPanel)}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[9.5px] font-bold uppercase tracking-wider transition-all",
                            showMemoryPanel ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "bg-white/[0.03] border-white/5 text-white/50 hover:text-white"
                        )}
                        title="Continuity Memory Anchor Logs"
                    >
                        <Layers className="w-3 h-3" /> ({memory.length})
                    </button>
                </div>
            </header>

            {/* ================= MAIN SPLIT WORKSPACE ================= */}
            <div className="flex-1 flex min-h-0 overflow-hidden relative">
                
                {/* ----------------- LEFT PANEL: PRODUCTION DECK & CONTINUITY LOCKS ----------------- */}
                <aside className="w-84 lg:w-96 shrink-0 border-r border-white/[0.06] bg-[#080812]/95 flex flex-col min-h-0 relative z-20">
                    
                    {/* FIXED TOP SECTION: Creative Script, Dialogues, Director Vision & Orchestrate Action */}
                    <div className="p-4 border-b border-white/[0.08] bg-[#090915] space-y-3 shrink-0 shadow-lg shadow-black/40">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
                                <span className="text-[10px] font-black uppercase tracking-wider text-white/90 font-mono">Script & Dialogues</span>
                            </div>
                            
                            {/* Director Persona dropdown */}
                            <select
                                value={selectedDirector}
                                onChange={e => setSelectedDirector(e.target.value)}
                                className="bg-black/60 border border-white/15 rounded-lg px-2 py-1 text-[8.5px] font-bold text-violet-300 outline-none hover:border-violet-500/40 cursor-pointer"
                                title="Select Director Persona"
                            >
                                {DIRECTORS.map(d => (
                                    <option key={d.name} value={d.name} className="bg-[#0c0c16] text-white">{d.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Script / Dialogue View Tabs */}
                        <div className="flex items-center bg-black/50 p-0.5 rounded-xl border border-white/10 gap-1">
                            <button
                                type="button"
                                onClick={() => setScriptTab('screenplay')}
                                className={cn(
                                    "flex-1 py-1 rounded-lg text-[9px] font-bold transition-all text-center",
                                    scriptTab === 'screenplay' ? "bg-violet-600/40 text-white shadow" : "text-white/40 hover:text-white"
                                )}
                            >
                                Screenplay
                            </button>
                            <button
                                type="button"
                                onClick={() => setScriptTab('dialogues')}
                                className={cn(
                                    "flex-1 py-1 rounded-lg text-[9px] font-bold transition-all text-center flex items-center justify-center gap-1",
                                    scriptTab === 'dialogues' ? "bg-cyan-600/40 text-cyan-200 shadow" : "text-white/40 hover:text-white"
                                )}
                            >
                                <span>Dialogues</span>
                                {dialogueText.trim() && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setScriptTab('combined')}
                                className={cn(
                                    "flex-1 py-1 rounded-lg text-[9px] font-bold transition-all text-center",
                                    scriptTab === 'combined' ? "bg-indigo-600/40 text-white shadow" : "text-white/40 hover:text-white"
                                )}
                            >
                                Combined
                            </button>
                        </div>

                        {/* Interactive Script Actions: Load File, Auto-Extract & Write with Astra */}
                        <div className="grid grid-cols-3 gap-1.5">
                            <input
                                ref={scriptFileInputRef}
                                type="file"
                                accept=".txt,.md,.doc,.docx,.pdf,.json,text/plain"
                                className="hidden"
                                onChange={e => handleScriptFileUpload(e.target.files?.[0])}
                            />
                            <button
                                type="button"
                                onClick={() => scriptFileInputRef.current?.click()}
                                className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-[9px] font-bold text-white/70 hover:text-white transition-all group"
                                title="Upload script from computer (.txt, .md, .pdf, .json)"
                            >
                                <UploadCloud className="w-3 h-3 text-cyan-400 group-hover:scale-110 transition-transform" />
                                <span className="truncate">Load File</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleAutoExtractFromScript()}
                                disabled={isAutoExtracting || (!scriptText.trim() && !dialogueText.trim())}
                                className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-[9px] font-bold text-emerald-300 hover:text-white transition-all disabled:opacity-40 group"
                                title="Auto-detect Characters, Dialogues & Settings from your loaded script"
                            >
                                <Sparkles className="w-3 h-3 text-emerald-400 group-hover:rotate-12 transition-transform" />
                                <span className="truncate">Auto-Detect</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowScriptModal(true)}
                                className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 text-[9px] font-bold text-violet-300 hover:text-white transition-all group"
                                title="Generate a shooting script from an idea with Astra (ChatGPT 6)"
                            >
                                <Wand2 className="w-3 h-3 text-violet-400 group-hover:scale-110 transition-transform" />
                                <span className="truncate">AI Writer</span>
                            </button>
                        </div>

                        {/* Dual Mode Textareas */}
                        {scriptTab === 'screenplay' && (
                            <div className="space-y-1">
                                <textarea
                                    value={scriptText}
                                    onChange={e => setScriptText(e.target.value)}
                                    placeholder="Paste or write your scene actions, environment beats, and visual directions here..."
                                    rows={4}
                                    className="w-full bg-black/50 border border-white/10 rounded-2xl p-2.5 text-[11px] text-white placeholder-white/20 outline-none focus:border-violet-500/50 resize-none font-sans leading-relaxed custom-scrollbar"
                                />
                                <div className="flex items-center justify-between text-[8px] font-mono text-white/40 px-1">
                                    <span>{scriptText.trim().split(/\s+/).filter(Boolean).length} words</span>
                                    <span>Screenplay Actions</span>
                                </div>
                            </div>
                        )}

                        {scriptTab === 'dialogues' && (
                            <div className="space-y-1">
                                <textarea
                                    value={dialogueText}
                                    onChange={e => setDialogueText(e.target.value)}
                                    placeholder="Paste spoken dialogues (e.g. ALEX: &quot;We have 10 seconds.&quot; / ELENA: &quot;Make every second count.&quot;)..."
                                    rows={4}
                                    className="w-full bg-black/50 border border-cyan-500/20 rounded-2xl p-2.5 text-[11px] text-cyan-200 placeholder-cyan-400/20 outline-none focus:border-cyan-500/50 resize-none font-mono leading-relaxed custom-scrollbar"
                                />
                                <div className="flex items-center justify-between text-[8px] font-mono text-cyan-400/60 px-1">
                                    <span>{dialogueText.trim().split('\n').filter(Boolean).length} dialogue lines</span>
                                    <span>Spoken Lines & Audio Beats</span>
                                </div>
                            </div>
                        )}

                        {scriptTab === 'combined' && (
                            <div className="space-y-2">
                                <div className="p-2 rounded-xl bg-black/40 border border-white/10 max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar text-[10px]">
                                    <div>
                                        <p className="text-[8px] uppercase font-bold text-violet-400 font-mono">Screenplay Beat:</p>
                                        <p className="text-white/80 leading-relaxed">{scriptText || 'No screenplay actions loaded'}</p>
                                    </div>
                                    {dialogueText && (
                                        <div className="pt-1 border-t border-white/10">
                                            <p className="text-[8px] uppercase font-bold text-cyan-400 font-mono">Spoken Dialogues:</p>
                                            <p className="text-cyan-200 font-mono leading-relaxed whitespace-pre-line">{dialogueText}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-between text-[8px] font-mono text-white/40 px-1">
                                    <span>Combined Orchestration Context</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SCROLLABLE CONTINUITY ANCHORS & STYLE SECTION */}
                    {/* Order: Visual Art Style -> Character Cast -> Location Setting -> Wardrobe / Outfit -> Hero Prop / Asset -> First Frame */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
                        
                        {/* 0. Visual Style & Art Direction Card */}
                        {(() => {
                            const activeStyleObj = VISUAL_STYLES.find(s => s.id === visualStyle) || VISUAL_STYLES[0];
                            return (
                                <div className="p-3 rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-950/20 via-black/40 to-[#0d0d1a] space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                                            <span className="text-[10px] font-bold text-white uppercase tracking-wider font-mono">Visual Art Style</span>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-300 text-[8px] font-mono font-bold">
                                            {activeStyleObj.badge}
                                        </span>
                                    </div>

                                    {/* Main Style Dropdown Selector */}
                                    <div className="relative">
                                        <select
                                            value={visualStyle}
                                            onChange={e => {
                                                setVisualStyle(e.target.value);
                                                syncConceptSheetsFromStory(scriptText, dialogueText);
                                            }}
                                            className="w-full bg-black/70 border border-pink-500/30 rounded-xl px-2.5 py-1.5 text-[10.5px] font-bold text-pink-200 outline-none hover:border-pink-400 focus:border-pink-400 transition-colors cursor-pointer font-sans"
                                        >
                                            {VISUAL_STYLES.map(s => (
                                                <option key={s.id} value={s.id} className="bg-[#0e0e1a] text-white">
                                                    {s.icon} {s.name} — {s.badge}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <p className="text-[8.5px] text-white/60 leading-relaxed italic">
                                        {activeStyleObj.desc}
                                    </p>

                                    {/* Quick Preset Style Chips */}
                                    <div className="pt-1 border-t border-white/5 space-y-1">
                                        <span className="text-[7.5px] uppercase font-mono font-bold text-white/40 block">Quick Aesthetics:</span>
                                        <div className="flex flex-wrap gap-1">
                                            {[
                                                { id: 'ultra-realistic', label: '📸 Ultra Realistic' },
                                                { id: 'photorealistic', label: '🎬 Photoreal' },
                                                { id: 'anime-2d', label: '🌸 Anime 2D' },
                                                { id: 'anime-3d', label: '⚡ Anime 3D' },
                                                { id: 'claymation', label: '🏺 Claymation' },
                                                { id: 'cyberpunk', label: '🌆 Cyberpunk' },
                                                { id: 'pixar-3d', label: '🧸 Pixar 3D' },
                                                { id: 'cinematic-film', label: '🎞️ 35mm Film' }
                                            ].map(chip => (
                                                <button
                                                    key={chip.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setVisualStyle(chip.id);
                                                        syncConceptSheetsFromStory(scriptText, dialogueText);
                                                    }}
                                                    className={cn(
                                                        "px-2 py-0.5 rounded-lg text-[8px] font-mono font-semibold transition-all border cursor-pointer",
                                                        visualStyle === chip.id
                                                            ? "bg-pink-600/30 border-pink-500/60 text-pink-200 shadow-sm shadow-pink-900/40"
                                                            : "bg-white/[0.03] border-white/5 text-white/50 hover:text-white/90 hover:bg-white/[0.06]"
                                                    )}
                                                >
                                                    {chip.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="flex items-center justify-between pb-1">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                                <span className="text-[10px] font-black uppercase tracking-wider text-white/80 font-mono">Continuity Anchors</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleClearAnchors}
                                    className="text-[8px] font-mono text-white/40 hover:text-pink-300 uppercase underline transition-colors cursor-pointer"
                                    title="Clear preset wardrobe and props to run on pure script"
                                >
                                    Clear Defaults
                                </button>
                                <span className="text-[8px] font-mono text-white/30 uppercase">Locks Faces & World</span>
                            </div>
                        </div>

                        {/* 1. Multiple Characters & Cast Lock Card */}
                        <div className="p-3 rounded-2xl border border-white/[0.06] bg-black/30 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <User className="w-3.5 h-3.5 text-violet-400" />
                                    <span className="text-[10px] font-bold text-white">Cast & Characters ({characters.length})</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={handleAddCharacter}
                                        className="px-2 py-0.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 text-[8px] font-mono font-bold flex items-center gap-1 border border-violet-500/20 transition-all cursor-pointer"
                                        title="Add another actor to the cast"
                                    >
                                        <Plus className="w-2.5 h-2.5" />
                                        <span>Add Actor</span>
                                    </button>
                                </div>
                            </div>

                            {/* Character Selector Pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                                {characters.map((char, cIdx) => (
                                    <button
                                        key={char.id || cIdx}
                                        type="button"
                                        onClick={() => setActiveCharacterIndex(cIdx)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-lg text-[9px] font-bold font-mono transition-all shrink-0 flex items-center gap-1.5 border cursor-pointer",
                                            activeCharacterIndex === cIdx
                                                ? "bg-violet-600/30 border-violet-500/50 text-white shadow-sm shadow-violet-900/40"
                                                : "bg-white/[0.03] border-white/5 text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
                                        )}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                                        <span className="truncate max-w-[85px]">{char.name || `Actor ${cIdx + 1}`}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Active Character Editor */}
                            {(() => {
                                const activeChar = characters[activeCharacterIndex] || characters[0];
                                if (!activeChar) return null;
                                const isScanning = isAnalyzingVision?.character;
                                return (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 text-[8px] font-mono font-bold">
                                                {activeChar.tag || `@char_actor_${activeCharacterIndex + 1}`}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                {activeChar.image && (
                                                    <button
                                                        type="button"
                                                        onClick={() => analyzeAnchorImageWithVision('character', activeChar.image, activeCharacterIndex)}
                                                        disabled={isScanning}
                                                        className="text-[7.5px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 hover:bg-violet-500/25 text-violet-300 border border-violet-500/20 flex items-center gap-1 transition-all cursor-pointer"
                                                        title="Re-analyze actor photo with AI Vision"
                                                    >
                                                        {isScanning ? <Loader2 className="w-2 h-2 animate-spin" /> : <Sparkles className="w-2 h-2 text-violet-400" />}
                                                        <span>{isScanning ? 'Scanning...' : 'AI Scan'}</span>
                                                    </button>
                                                )}
                                                {characters.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveCharacter(activeCharacterIndex)}
                                                        className="text-red-400/50 hover:text-red-400 p-0.5 rounded transition-all cursor-pointer"
                                                        title="Remove this actor"
                                                    >
                                                        <Trash2 className="w-2.5 h-2.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="relative w-14 h-14 rounded-xl border border-dashed border-white/20 hover:border-violet-400 bg-white/[0.02] flex items-center justify-center cursor-pointer overflow-hidden group shrink-0">
                                                {activeChar.image ? (
                                                    <>
                                                        <img src={activeChar.image} alt={activeChar.name} className="w-full h-full object-cover" />
                                                        {isScanning && (
                                                            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-0.5 z-10 backdrop-blur-[1px]">
                                                                <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                                                                <span className="text-[5.5px] font-mono font-bold text-violet-200">Analyzing</span>
                                                            </div>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUpdateCharacter(activeCharacterIndex, 'image', null);
                                                            }}
                                                            className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/80 text-white/70 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                                            title="Remove image"
                                                        >
                                                            <X className="w-2.5 h-2.5" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                                        <Plus className="w-4 h-4 mx-auto text-white/30 group-hover:text-violet-400" />
                                                        <span className="text-[6.5px] uppercase font-bold text-white/30 block mt-0.5">Photo</span>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={e => handleImageUpload('character', e.target.files?.[0])}
                                                        />
                                                    </label>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0 space-y-1">
                                                <input
                                                    type="text"
                                                    value={activeChar.name}
                                                    onChange={e => handleUpdateCharacter(activeCharacterIndex, 'name', e.target.value)}
                                                    placeholder="Character Name (e.g. Maya Lin)"
                                                    className="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-[10px] font-bold text-white outline-none focus:border-violet-500/40"
                                                />
                                                <input
                                                    type="text"
                                                    value={activeChar.traits}
                                                    onChange={e => handleUpdateCharacter(activeCharacterIndex, 'traits', e.target.value)}
                                                    placeholder="Traits (auto-detected from photo or manual)"
                                                    className="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-[8.5px] text-white/60 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* 2. Location Setting Card */}
                        <div className="p-3 rounded-2xl border border-white/[0.06] bg-black/30 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-3 h-3 text-emerald-400" />
                                    <span className="text-[10px] font-bold text-white">Location Setting</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[8px] font-mono font-bold">
                                        {locationRef.tag || '@loc_setting'}
                                    </span>
                                    {locationRef.image && (
                                        <button
                                            type="button"
                                            onClick={() => analyzeAnchorImageWithVision('location', locationRef.image)}
                                            disabled={isAnalyzingVision?.location}
                                            className="text-[7.5px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/20 flex items-center gap-1 transition-all cursor-pointer"
                                            title="Re-analyze location photo with AI Vision"
                                        >
                                            {isAnalyzingVision?.location ? <Loader2 className="w-2 h-2 animate-spin" /> : <Sparkles className="w-2 h-2 text-emerald-400" />}
                                            <span>{isAnalyzingVision?.location ? 'Scanning...' : 'AI Scan'}</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="relative w-14 h-14 rounded-xl border border-dashed border-white/20 hover:border-emerald-400 bg-white/[0.02] flex items-center justify-center cursor-pointer overflow-hidden group shrink-0">
                                    {locationRef.image ? (
                                        <>
                                            <img src={locationRef.image} alt="Location" className="w-full h-full object-cover" />
                                            {isAnalyzingVision?.location && (
                                                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-0.5 z-10 backdrop-blur-[1px]">
                                                    <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                                                    <span className="text-[5.5px] font-mono font-bold text-emerald-200">Analyzing</span>
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setLocationRef(prev => ({ ...prev, image: null }));
                                                }}
                                                className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/80 text-white/70 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                                title="Remove image"
                                            >
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </>
                                    ) : (
                                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                            <Plus className="w-4 h-4 mx-auto text-white/30 group-hover:text-emerald-400" />
                                            <span className="text-[6.5px] uppercase font-bold text-white/30 block mt-0.5">Env</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload('location', e.target.files?.[0])} />
                                        </label>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0 space-y-1">
                                    <input
                                        type="text"
                                        value={locationRef.name}
                                        onChange={e => {
                                            const name = e.target.value;
                                            const cleanTag = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
                                            setLocationRef(prev => ({
                                                ...prev,
                                                name,
                                                tag: `@loc_${cleanTag || 'setting'}`
                                            }));
                                        }}
                                        placeholder="Location Name (e.g. Glass Greenhouse)"
                                        className="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-[10px] font-bold text-white outline-none focus:border-emerald-500/40"
                                    />
                                    <input
                                        type="text"
                                        value={locationRef.traits}
                                        onChange={e => setLocationRef(prev => ({ ...prev, traits: e.target.value }))}
                                        placeholder="Lighting, architecture, time of day, atmosphere"
                                        className="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-[8.5px] text-white/60 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. Wardrobe & Outfit Card */}
                        <div className="p-3 rounded-2xl border border-white/[0.06] bg-black/30 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Shirt className="w-3 h-3 text-pink-400" />
                                    <span className="text-[10px] font-bold text-white">Wardrobe / Outfit</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 text-[8px] font-mono font-bold">
                                        {wardrobeRef.tag || '@wardrobe_outfit'}
                                    </span>
                                    {wardrobeRef.image && (
                                        <button
                                            type="button"
                                            onClick={() => analyzeAnchorImageWithVision('wardrobe', wardrobeRef.image)}
                                            disabled={isAnalyzingVision?.wardrobe}
                                            className="text-[7.5px] font-mono px-1.5 py-0.5 rounded bg-pink-500/10 hover:bg-pink-500/25 text-pink-300 border border-pink-500/20 flex items-center gap-1 transition-all cursor-pointer"
                                            title="Re-analyze wardrobe photo with AI Vision"
                                        >
                                            {isAnalyzingVision?.wardrobe ? <Loader2 className="w-2 h-2 animate-spin" /> : <Sparkles className="w-2 h-2 text-pink-400" />}
                                            <span>{isAnalyzingVision?.wardrobe ? 'Scanning...' : 'AI Scan'}</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="relative w-14 h-14 rounded-xl border border-dashed border-white/20 hover:border-pink-400 bg-white/[0.02] flex items-center justify-center cursor-pointer overflow-hidden group shrink-0">
                                    {wardrobeRef.image ? (
                                        <>
                                            <img src={wardrobeRef.image} alt="Wardrobe" className="w-full h-full object-cover" />
                                            {isAnalyzingVision?.wardrobe && (
                                                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-0.5 z-10 backdrop-blur-[1px]">
                                                    <Loader2 className="w-3.5 h-3.5 text-pink-400 animate-spin" />
                                                    <span className="text-[5.5px] font-mono font-bold text-pink-200">Analyzing</span>
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setWardrobeRef(prev => ({ ...prev, image: null }));
                                                }}
                                                className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/80 text-white/70 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                                title="Remove image"
                                            >
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </>
                                    ) : (
                                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                            <Plus className="w-4 h-4 mx-auto text-white/30 group-hover:text-pink-400" />
                                            <span className="text-[6.5px] uppercase font-bold text-white/30 block mt-0.5">Outfit</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload('wardrobe', e.target.files?.[0])} />
                                        </label>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0 space-y-1">
                                    <input
                                        type="text"
                                        value={wardrobeRef.name}
                                        onChange={e => {
                                            const name = e.target.value;
                                            const cleanTag = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
                                            setWardrobeRef(prev => ({
                                                ...prev,
                                                name,
                                                tag: `@wardrobe_${cleanTag || 'outfit'}`
                                            }));
                                        }}
                                        placeholder="Costume / Outfit Name (e.g. Velvet Blazer)"
                                        className="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-[10px] font-bold text-white outline-none focus:border-pink-500/40"
                                    />
                                    <input
                                        type="text"
                                        value={wardrobeRef.traits}
                                        onChange={e => setWardrobeRef(prev => ({ ...prev, traits: e.target.value }))}
                                        placeholder="Fabrics, colors, silhouette (e.g. navy velvet, gold buttons)"
                                        className="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-[8.5px] text-white/60 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 4. Hero Prop & Asset Card */}
                        <div className="p-3 rounded-2xl border border-white/[0.06] bg-black/30 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Package className="w-3 h-3 text-amber-400" />
                                    <span className="text-[10px] font-bold text-white">Hero Prop / Asset</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[8px] font-mono font-bold">
                                        {propRef.tag || '@prop_item'}
                                    </span>
                                    {propRef.image && (
                                        <button
                                            type="button"
                                            onClick={() => analyzeAnchorImageWithVision('prop', propRef.image)}
                                            disabled={isAnalyzingVision?.prop}
                                            className="text-[7.5px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/20 flex items-center gap-1 transition-all cursor-pointer"
                                            title="Re-analyze prop photo with AI Vision"
                                        >
                                            {isAnalyzingVision?.prop ? <Loader2 className="w-2 h-2 animate-spin" /> : <Sparkles className="w-2 h-2 text-amber-400" />}
                                            <span>{isAnalyzingVision?.prop ? 'Scanning...' : 'AI Scan'}</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="relative w-14 h-14 rounded-xl border border-dashed border-white/20 hover:border-amber-400 bg-white/[0.02] flex items-center justify-center cursor-pointer overflow-hidden group shrink-0">
                                    {propRef.image ? (
                                        <>
                                            <img src={propRef.image} alt="Prop" className="w-full h-full object-cover" />
                                            {isAnalyzingVision?.prop && (
                                                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-0.5 z-10 backdrop-blur-[1px]">
                                                    <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                                                    <span className="text-[5.5px] font-mono font-bold text-amber-200">Analyzing</span>
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPropRef(prev => ({ ...prev, image: null }));
                                                }}
                                                className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/80 text-white/70 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                                title="Remove image"
                                            >
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </>
                                    ) : (
                                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                            <Plus className="w-4 h-4 mx-auto text-white/30 group-hover:text-amber-400" />
                                            <span className="text-[6.5px] uppercase font-bold text-white/30 block mt-0.5">Prop</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload('prop', e.target.files?.[0])} />
                                        </label>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0 space-y-1">
                                    <input
                                        type="text"
                                        value={propRef.name}
                                        onChange={e => {
                                            const name = e.target.value;
                                            const cleanTag = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
                                            setPropRef(prev => ({
                                                ...prev,
                                                name,
                                                tag: `@prop_${cleanTag || 'item'}`
                                            }));
                                        }}
                                        placeholder="Prop Name (e.g. Ancient Compass)"
                                        className="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-[10px] font-bold text-white outline-none focus:border-amber-500/40"
                                    />
                                    <input
                                        type="text"
                                        value={propRef.traits}
                                        onChange={e => setPropRef(prev => ({ ...prev, traits: e.target.value }))}
                                        placeholder="Materials, textures (e.g. tarnished brass, engraved dial)"
                                        className="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-[8.5px] text-white/60 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 5. First Frame Keyframe (Optional) */}
                        <div className="p-3 rounded-2xl border border-white/[0.06] bg-black/30 flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-xl border border-dashed border-white/20 hover:border-cyan-400 bg-white/[0.02] flex items-center justify-center cursor-pointer overflow-hidden group shrink-0">
                                {firstFrameRef.image ? (
                                    <>
                                        <img src={firstFrameRef.image} alt="First Frame" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFirstFrameRef(prev => ({ ...prev, image: null }));
                                            }}
                                            className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/80 text-white/70 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                            title="Remove image"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </>
                                ) : (
                                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                        <ImageIcon className="w-3.5 h-3.5 mx-auto text-white/30 group-hover:text-cyan-400" />
                                        <span className="text-[6px] uppercase font-bold text-white/30 block mt-0.5">Start</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload('first_frame', e.target.files?.[0])} />
                                    </label>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[9.5px] font-bold text-white">First Frame Keyframe</p>
                                <p className="text-[8px] text-white/40 leading-tight mt-0.5">Visual anchor for Shot #1 start position</p>
                            </div>
                        </div>
                    </div>

                    {/* FIXED BOTTOM FOOTER: Engine, Visual Style, Resolution, Ratio, Duration & Orchestrate Button */}
                    <div className="p-3.5 border-t border-white/[0.08] bg-[#090915]/98 backdrop-blur-md shrink-0 space-y-2.5 shadow-[0_-10px_30px_rgba(0,0,0,0.7)] z-30">
                        {/* Timing, Style & Specs Summary Pill */}
                        {(() => {
                            const activeStyleObj = VISUAL_STYLES.find(s => s.id === visualStyle) || VISUAL_STYLES[0];
                            return (
                                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-violet-950/30 border border-violet-500/20 text-[8.5px] font-mono">
                                    <span className="text-violet-300 font-bold truncate max-w-[140px] flex items-center gap-1">
                                        <span>⏱️ {Math.max(1, Math.round((parseInt(videoDuration, 10) || 60) / 10))} Shots</span>
                                        <span className="text-pink-300">• {activeStyleObj.icon} {activeStyleObj.name}</span>
                                    </span>
                                    <span className="text-cyan-300 font-bold shrink-0">
                                        {aspectRatio} • {resolution}
                                    </span>
                                </div>
                            );
                        })()}

                        {/* Quick Production Settings Bar inside Fixed Footer */}
                        <div className="space-y-1.5">
                            {/* Row 1: Visual Art Style & Render Engine */}
                            <div className="grid grid-cols-2 gap-1.5">
                                <select
                                    value={visualStyle}
                                    onChange={e => {
                                        setVisualStyle(e.target.value);
                                        syncConceptSheetsFromStory(scriptText, dialogueText);
                                    }}
                                    className="bg-black/60 border border-pink-500/30 hover:border-pink-400/60 rounded-lg px-2 py-1.5 text-[8.5px] font-bold text-pink-300 outline-none cursor-pointer truncate font-sans"
                                    title="Visual Art Style (Ultra Realistic, Anime, Claymation, Cyberpunk, etc.)"
                                >
                                    {VISUAL_STYLES.map(s => (
                                        <option key={s.id} value={s.id} className="bg-[#0c0c16] text-white">
                                            {s.icon} {s.name} ({s.badge})
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={selectedEngine}
                                    onChange={e => setSelectedEngine(e.target.value)}
                                    className="bg-black/50 border border-white/10 hover:border-emerald-500/40 rounded-lg px-1.5 py-1.5 text-[8px] font-bold text-emerald-400 outline-none cursor-pointer truncate"
                                    title="AI Generation Engine"
                                >
                                    <option value="omni-flash" className="bg-[#0c0c16] text-emerald-400">⚡ Omni Flash 1.1</option>
                                    <option value="seedance" className="bg-[#0c0c16] text-white">Seedance 2.0</option>
                                </select>
                            </div>

                            {/* Row 2: Resolution, Aspect Ratio, Duration */}
                            <div className="grid grid-cols-3 gap-1.5">
                                <select
                                    value={resolution}
                                    onChange={e => setResolution(e.target.value)}
                                    className="bg-black/50 border border-white/10 hover:border-cyan-500/40 rounded-lg px-1.5 py-1.5 text-[8px] font-bold text-cyan-300 outline-none cursor-pointer"
                                    title="Render Resolution"
                                >
                                    <option value="720p" className="bg-[#0c0c16]">720p HD</option>
                                    <option value="1080p" className="bg-[#0c0c16]">1080p FHD</option>
                                    <option value="4K" className="bg-[#0c0c16]">4K Cinema</option>
                                </select>

                                <select
                                    value={aspectRatio}
                                    onChange={e => setAspectRatio(e.target.value)}
                                    className="bg-black/50 border border-white/10 hover:border-violet-500/40 rounded-lg px-1.5 py-1.5 text-[8px] font-bold text-violet-300 outline-none cursor-pointer"
                                    title="Aspect Ratio"
                                >
                                    <option value="16:9" className="bg-[#0c0c16]">16:9 Horiz</option>
                                    <option value="9:16" className="bg-[#0c0c16]">9:16 Reels</option>
                                    <option value="1:1" className="bg-[#0c0c16]">1:1 Square</option>
                                    <option value="2.39:1" className="bg-[#0c0c16]">2.39:1 Cinema</option>
                                    <option value="4:3" className="bg-[#0c0c16]">4:3 Classic</option>
                                </select>

                                <select
                                    value={videoDuration}
                                    onChange={e => setVideoDuration(e.target.value)}
                                    className="bg-black/50 border border-white/10 hover:border-amber-500/40 rounded-lg px-1.5 py-1.5 text-[8px] font-bold text-amber-300 outline-none cursor-pointer"
                                    title="Target Story Duration & Shots Division"
                                >
                                    <option value="10 sec" className="bg-[#0c0c16]">10s (1 shot)</option>
                                    <option value="20 sec" className="bg-[#0c0c16]">20s (2 shots)</option>
                                    <option value="30 sec" className="bg-[#0c0c16]">30s (3 shots)</option>
                                    <option value="45 sec" className="bg-[#0c0c16]">45s (5 shots)</option>
                                    <option value="60 sec" className="bg-[#0c0c16]">60s (6 shots)</option>
                                    <option value="90 sec" className="bg-[#0c0c16]">90s (9 shots)</option>
                                    <option value="120 sec" className="bg-[#0c0c16]">120s (12 shots)</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleOrchestrate}
                            disabled={isOrchestrating || (!scriptText.trim() && !dialogueText.trim())}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-black text-[10.5px] uppercase tracking-widest shadow-xl shadow-violet-950/40 disabled:opacity-40 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {isOrchestrating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Orchestrating ({
                                        orchestratorStep === 'vision' ? 'Analyzing Script & Set' :
                                        orchestratorStep === 'screenplay' ? 'Slicing 10s Shots' :
                                        orchestratorStep === 'continuity' ? 'Locking Continuity & Dialogues' :
                                        orchestratorStep === 'cinematographer' ? 'IMAX Cinematography' : 'Thinking'
                                    })...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 text-cyan-200" />
                                    <span>Orchestrate Director Queue</span>
                                </>
                            )}
                        </button>
                    </div>
                </aside>

                {/* ----------------- CENTER/RIGHT: STORYBOARD TIMELINE & MOVIE PLAYER OR CONCEPT ART SHEETS ----------------- */}
                <main className="flex-1 flex flex-col min-w-0 bg-[#06060e] relative overflow-hidden">
                    {mainViewMode === 'concept_sheets' ? (
                        /* ========================================================================= */
                        /* 🎨 VISUAL ASSET & CONCEPT ART SHEETS STUDIO (Character, Location, Prop, Moodboard) */
                        /* ========================================================================= */
                        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                            {/* Concept Sheets Studio Header Toolbar */}
                            <div className="px-6 py-4 border-b border-white/[0.08] bg-[#0c0c18]/90 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 z-10">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 via-purple-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-purple-950/50">
                                            <ImageIcon className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-sm font-black uppercase tracking-wider bg-gradient-to-r from-pink-300 via-purple-200 to-cyan-300 bg-clip-text text-transparent">
                                                    Visual Concept Art & Asset Sheets
                                                </h2>
                                                <span className="px-2 py-0.5 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-300 text-[9px] font-mono font-bold">
                                                    {conceptSheets.length} Sheets
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-white/40 font-mono">
                                                Character Turnarounds • Location Sets • Hero Props • Lighting Moodboards
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Controls: Style Selector + Engine Selector + Add Sheet + Batch Generate */}
                                <div className="flex flex-wrap items-center gap-2.5">
                                    {/* Visual Style Selector */}
                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-black/50 border border-pink-500/20 hover:border-pink-500/40 transition-colors">
                                        <span className="text-[9px] font-mono uppercase text-pink-400 font-bold">Style:</span>
                                        <select
                                            value={visualStyle}
                                            onChange={(e) => {
                                                setVisualStyle(e.target.value);
                                                syncConceptSheetsFromStory(scriptText, dialogueText);
                                            }}
                                            className="bg-transparent text-pink-300 text-[10px] font-bold outline-none cursor-pointer"
                                            title="Visual Art Style & Aesthetic"
                                        >
                                            {VISUAL_STYLES.map(s => (
                                                <option key={s.id} value={s.id} className="bg-[#0e0e1a] text-white">
                                                    {s.icon} {s.name} ({s.badge})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Image Generation Engine Selector */}
                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-black/50 border border-white/10">
                                        <span className="text-[9px] font-mono uppercase text-white/40 font-bold">Engine:</span>
                                        <select
                                            value={selectedImageEngine}
                                            onChange={(e) => setSelectedImageEngine(e.target.value)}
                                            className="bg-transparent text-cyan-300 text-[10px] font-bold outline-none cursor-pointer font-mono"
                                        >
                                            <option value="nano-banana-2-open" className="bg-[#0e0e1a] text-white">Nano Banana 2 (Gemini / Imagen 3)</option>
                                            <option value="gpt-image-2" className="bg-[#0e0e1a] text-white">ChatGPT Image 2 (DALL-E 3)</option>
                                            <option value="imagen-3.0-generate-002" className="bg-[#0e0e1a] text-white">Google Imagen 3.0 Ultra</option>
                                        </select>
                                    </div>

                                    {/* Auto-Extract / Re-Sync from Script */}
                                    <button
                                        onClick={() => syncConceptSheetsFromStory(scriptText, dialogueText)}
                                        className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-[10px] font-bold text-white/70 hover:text-white transition-all flex items-center gap-1.5"
                                        title="Auto-analyze screenplay and update prompt sheets"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                                        <span>Re-Sync from Script</span>
                                    </button>

                                    {/* Add Custom Sheet Menu */}
                                    <div className="relative group">
                                        <button className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-[10px] font-bold text-white transition-all flex items-center gap-1.5">
                                            <Plus className="w-3.5 h-3.5 text-pink-400" />
                                            <span>Add Sheet</span>
                                            <ChevronDown className="w-3 h-3 opacity-60" />
                                        </button>
                                        <div className="absolute right-0 mt-1 w-48 py-1.5 bg-[#0e0e1c] border border-white/10 rounded-2xl shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-50">
                                            <button onClick={() => handleAddCustomSheet('character')} className="w-full px-3 py-1.5 text-left text-[10px] font-bold text-white/80 hover:text-white hover:bg-white/5 flex items-center gap-2">
                                                <User className="w-3.5 h-3.5 text-violet-400" /> + Character Turnaround
                                            </button>
                                            <button onClick={() => handleAddCustomSheet('location')} className="w-full px-3 py-1.5 text-left text-[10px] font-bold text-white/80 hover:text-white hover:bg-white/5 flex items-center gap-2">
                                                <MapPin className="w-3.5 h-3.5 text-cyan-400" /> + Location Setting
                                            </button>
                                            <button onClick={() => handleAddCustomSheet('prop')} className="w-full px-3 py-1.5 text-left text-[10px] font-bold text-white/80 hover:text-white hover:bg-white/5 flex items-center gap-2">
                                                <Box className="w-3.5 h-3.5 text-amber-400" /> + Hero Prop Sheet
                                            </button>
                                            <button onClick={() => handleAddCustomSheet('moodboard')} className="w-full px-3 py-1.5 text-left text-[10px] font-bold text-white/80 hover:text-white hover:bg-white/5 flex items-center gap-2">
                                                <Layers className="w-3.5 h-3.5 text-pink-400" /> + Director Moodboard
                                            </button>
                                        </div>
                                    </div>

                                    {/* Batch Generate Visible Sheets */}
                                    <button
                                        onClick={handleBatchGenerateSheets}
                                        disabled={isBatchGeneratingSheets || conceptSheets.length === 0}
                                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-500 hover:from-pink-500 hover:to-cyan-400 text-white font-black text-[10px] uppercase tracking-wider shadow-lg shadow-purple-950/40 disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                        {isBatchGeneratingSheets ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                <span>Rendering Batch...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                                                <span>Generate Visible Sheets</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Category Filter Tabs Bar */}
                            <div className="px-6 py-2.5 border-b border-white/[0.04] bg-black/40 flex items-center gap-2 overflow-x-auto custom-scrollbar">
                                {[
                                    { id: 'all', label: 'All Visual Assets', icon: LayoutGrid, count: conceptSheets.length },
                                    { id: 'character', label: 'Characters', icon: User, count: conceptSheets.filter(s => s.type === 'character').length },
                                    { id: 'location', label: 'Locations', icon: MapPin, count: conceptSheets.filter(s => s.type === 'location').length },
                                    { id: 'prop', label: 'Hero Props', icon: Box, count: conceptSheets.filter(s => s.type === 'prop').length },
                                    { id: 'moodboard', label: 'Moodboards', icon: Layers, count: conceptSheets.filter(s => s.type === 'moodboard').length },
                                ].map((cat) => {
                                    const Icon = cat.icon;
                                    const isActive = conceptCategoryFilter === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setConceptCategoryFilter(cat.id)}
                                            className={cn(
                                                "px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap",
                                                isActive
                                                    ? "bg-gradient-to-r from-pink-600/30 to-purple-600/30 text-white border border-pink-500/40 shadow-sm"
                                                    : "bg-white/[0.02] hover:bg-white/[0.06] text-white/50 hover:text-white border border-transparent"
                                            )}
                                        >
                                            <Icon className={cn("w-3 h-3", isActive ? "text-pink-300" : "text-white/40")} />
                                            <span>{cat.label}</span>
                                            <span className={cn(
                                                "px-1.5 py-0.2 rounded-full text-[8.5px] font-mono",
                                                isActive ? "bg-pink-500/40 text-pink-200" : "bg-white/10 text-white/40"
                                            )}>
                                                {cat.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Concept Sheets Cards Grid */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                {conceptSheets.filter(s => conceptCategoryFilter === 'all' || s.type === conceptCategoryFilter).length === 0 ? (
                                    /* Empty State */
                                    <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto space-y-4">
                                        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-pink-600/20 to-cyan-600/20 border border-white/10 flex items-center justify-center">
                                            <ImageIcon className="w-8 h-8 text-pink-400/80 animate-pulse" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-base font-black uppercase text-white">No {conceptCategoryFilter === 'all' ? 'Concept' : conceptCategoryFilter} Sheets Found</h3>
                                            <p className="text-xs text-white/40 leading-relaxed">
                                                Write your screenplay or click the button below to auto-generate character turnaround sheets, location views, and hero props.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => syncConceptSheetsFromStory(scriptText, dialogueText)}
                                            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold text-xs shadow-lg shadow-purple-900/40 hover:from-pink-500 hover:to-purple-500 transition-all"
                                        >
                                            Auto-Extract Visual Sheets from Script
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-7xl mx-auto">
                                        {conceptSheets
                                            .filter(s => conceptCategoryFilter === 'all' || s.type === conceptCategoryFilter)
                                            .map((sheet) => {
                                                const isChar = sheet.type === 'character';
                                                const isLoc = sheet.type === 'location';
                                                const isProp = sheet.type === 'prop';
                                                const isMood = sheet.type === 'moodboard';

                                                const badgeColor = isChar 
                                                    ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                                                    : isLoc
                                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                                    : isProp
                                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                                    : 'bg-pink-500/20 text-pink-300 border-pink-500/30';

                                                const IconComponent = isChar ? User : isLoc ? MapPin : isProp ? Box : Layers;

                                                return (
                                                    <div 
                                                        key={sheet.id}
                                                        className="group rounded-3xl border border-white/[0.08] hover:border-white/20 bg-gradient-to-b from-[#101020]/90 to-[#090914]/90 backdrop-blur-xl p-5 shadow-2xl transition-all space-y-4"
                                                    >
                                                        {/* Sheet Header: Type Badge + Title + Tag + Aspect Ratio + Delete */}
                                                        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <span className={cn("px-2.5 py-1 rounded-xl text-[9px] font-mono font-black uppercase tracking-wider border flex items-center gap-1.5 shrink-0", badgeColor)}>
                                                                    <IconComponent className="w-3 h-3" />
                                                                    <span>{sheet.type}</span>
                                                                </span>
                                                                <input
                                                                    type="text"
                                                                    value={sheet.title}
                                                                    onChange={(e) => handleUpdateSheet(sheet.id, 'title', e.target.value)}
                                                                    className="bg-transparent font-bold text-xs text-white outline-none focus:border-b focus:border-pink-400 truncate flex-1"
                                                                    placeholder="Sheet title..."
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <select
                                                                    value={sheet.aspectRatio || '16:9'}
                                                                    onChange={(e) => handleUpdateSheet(sheet.id, 'aspectRatio', e.target.value)}
                                                                    className="bg-black/50 border border-white/10 rounded-lg px-2 py-0.5 text-[9px] font-mono text-white/70 outline-none cursor-pointer"
                                                                >
                                                                    <option value="16:9">16:9 Landscape</option>
                                                                    <option value="1:1">1:1 Square</option>
                                                                    <option value="9:16">9:16 Portrait</option>
                                                                    <option value="3:2">3:2 Cinematic</option>
                                                                </select>
                                                                <button
                                                                    onClick={() => handleRemoveSheet(sheet.id)}
                                                                    className="p-1 rounded-lg text-white/30 hover:text-red-400 hover:bg-white/5 transition-all"
                                                                    title="Remove Sheet"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Main Card Content: Left Image Box & Right Prompt / Reference Info */}
                                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                                                            {/* Image Preview Box (5 cols) */}
                                                            <div className="md:col-span-5 space-y-2">
                                                                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/80 aspect-video flex items-center justify-center group/img shadow-inner">
                                                                    {sheet.imageUrl ? (
                                                                        <>
                                                                            <img
                                                                                src={resolveUrl(sheet.imageUrl)}
                                                                                alt={sheet.title}
                                                                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                                                                                onClick={() => setActiveLightboxImage(sheet.imageUrl)}
                                                                            />
                                                                            {/* Hover overlay controls */}
                                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 pointer-events-none group-hover/img:pointer-events-auto backdrop-blur-xs">
                                                                                <button
                                                                                    onClick={() => setActiveLightboxImage(sheet.imageUrl)}
                                                                                    className="px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[9.5px] font-bold flex items-center gap-1.5 backdrop-blur-md transition-all"
                                                                                >
                                                                                    <Maximize2 className="w-3 h-3" />
                                                                                    <span>Zoom Lightbox</span>
                                                                                </button>
                                                                                <a
                                                                                    href={resolveUrl(sheet.imageUrl)}
                                                                                    download={`${sheet.title.replace(/\s+/g, '_')}.png`}
                                                                                    className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[9.5px] font-bold flex items-center gap-1.5 transition-all"
                                                                                >
                                                                                    <Download className="w-3 h-3" />
                                                                                    <span>Download</span>
                                                                                </a>
                                                                            </div>
                                                                        </>
                                                                    ) : sheet.status === 'generating' ? (
                                                                        <div className="p-4 text-center space-y-2">
                                                                            <Loader2 className="w-7 h-7 text-pink-400 animate-spin mx-auto" />
                                                                            <span className="text-[10px] font-bold text-white block">
                                                                                {sheet.progressMsg || 'Rendering Multi-Angle Sheet...'}
                                                                            </span>
                                                                            <span className="text-[8px] font-mono text-cyan-300 block">
                                                                                Engine: {selectedImageEngine}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="p-4 text-center space-y-1.5">
                                                                            <ImageIcon className="w-8 h-8 text-white/20 mx-auto" />
                                                                            <span className="text-[10px] font-bold text-white/40 block">Ready to Generate</span>
                                                                            <span className="text-[8px] font-mono text-white/25 block">Click 'Generate Sheet' below</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Quick Continuity Hook Actions if Image exists */}
                                                                {sheet.imageUrl && (
                                                                    <div className="space-y-1 pt-1">
                                                                        <span className="text-[8px] font-mono uppercase text-white/40 font-bold block">Apply to Video Studio:</span>
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {isChar && (
                                                                                <button
                                                                                    onClick={() => handleApplySheetAsAnchor(sheet, 'character')}
                                                                                    className="px-2 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-[8.5px] font-bold text-violet-300 transition-all flex items-center gap-1"
                                                                                    title="Set this sheet as Lead Actor reference for video generation"
                                                                                >
                                                                                    <User className="w-2.5 h-2.5" />
                                                                                    <span>Set as Actor Anchor</span>
                                                                                </button>
                                                                            )}
                                                                            {isLoc && (
                                                                                <button
                                                                                    onClick={() => handleApplySheetAsAnchor(sheet, 'location')}
                                                                                    className="px-2 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/30 text-[8.5px] font-bold text-cyan-300 transition-all flex items-center gap-1"
                                                                                    title="Set this sheet as Location reference for video generation"
                                                                                >
                                                                                    <MapPin className="w-2.5 h-2.5" />
                                                                                    <span>Set as Location Anchor</span>
                                                                                </button>
                                                                            )}
                                                                            {isProp && (
                                                                                <button
                                                                                    onClick={() => handleApplySheetAsAnchor(sheet, 'prop')}
                                                                                    className="px-2 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/30 text-[8.5px] font-bold text-amber-300 transition-all flex items-center gap-1"
                                                                                    title="Set this sheet as Hero Prop reference"
                                                                                >
                                                                                    <Box className="w-2.5 h-2.5" />
                                                                                    <span>Set as Prop Anchor</span>
                                                                                </button>
                                                                            )}
                                                                            <button
                                                                                onClick={() => handleApplySheetAsAnchor(sheet, 'start_frame')}
                                                                                className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-[8.5px] font-bold text-emerald-300 transition-all flex items-center gap-1"
                                                                                title="Set as First Frame anchor for Shot 1 video generation"
                                                                            >
                                                                                <Clapperboard className="w-2.5 h-2.5" />
                                                                                <span>Set as Shot 1 Start Frame</span>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Prompt & External Reference Settings (7 cols) */}
                                                            <div className="md:col-span-7 space-y-3">
                                                                {/* Reference Image Attachment Row */}
                                                                <div className="p-2.5 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-[8.5px] font-mono uppercase text-white/50 font-bold flex items-center gap-1">
                                                                            <UploadCloud className="w-3 h-3 text-pink-400" />
                                                                            <span>External Face / Style Reference:</span>
                                                                        </span>
                                                                        {sheet.referenceImage && (
                                                                            <button
                                                                                onClick={() => handleUpdateSheet(sheet.id, 'referenceImage', null)}
                                                                                className="text-[8px] font-mono text-red-400 hover:text-red-300"
                                                                            >
                                                                                Clear Ref
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        {sheet.referenceImage ? (
                                                                            <div className="flex items-center gap-2 flex-1 min-w-0 bg-white/[0.02] p-1 rounded-xl border border-white/10">
                                                                                <img 
                                                                                    src={resolveUrl(sheet.referenceImage)} 
                                                                                    alt="Ref" 
                                                                                    className="w-8 h-8 rounded-lg object-cover border border-white/20"
                                                                                />
                                                                                <span className="text-[9px] text-emerald-300 font-mono font-bold truncate">
                                                                                    Reference Attached
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-[9px] text-white/30 font-sans italic flex-1">
                                                                                Optional: Attach real face photo, actor model, or location photo
                                                                            </span>
                                                                        )}

                                                                        <label className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[9px] font-bold text-white/70 hover:text-white cursor-pointer transition-all shrink-0">
                                                                            <span>Upload Photo</span>
                                                                            <input 
                                                                                type="file" 
                                                                                accept="image/*" 
                                                                                className="hidden" 
                                                                                onChange={(e) => {
                                                                                    const file = e.target.files?.[0];
                                                                                    if (file) handleSheetImageUpload(sheet.id, file);
                                                                                }}
                                                                            />
                                                                        </label>
                                                                    </div>
                                                                </div>

                                                                {/* Multi-Angle Sheet Prompt Textarea */}
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-[8.5px] font-mono uppercase text-white/40 font-bold">
                                                                            Concept Art & Multi-Angle Sheet Prompt:
                                                                        </span>
                                                                        <span className="text-[8px] font-mono text-cyan-300 font-bold">
                                                                            {sheet.tag || ''}
                                                                        </span>
                                                                    </div>
                                                                    <textarea
                                                                        value={sheet.prompt}
                                                                        onChange={(e) => handleUpdateSheet(sheet.id, 'prompt', e.target.value)}
                                                                        rows={3}
                                                                        className="w-full bg-black/60 border border-white/10 rounded-2xl p-2.5 text-[10px] text-white/90 placeholder-white/25 outline-none focus:border-pink-500/40 resize-none font-sans leading-relaxed"
                                                                        placeholder="Multi-angle prompt description..."
                                                                    />
                                                                </div>

                                                                {/* Card Actions Footer: Error message + Generate Button */}
                                                                <div className="flex items-center justify-between pt-1 gap-2">
                                                                    {sheet.errorMsg ? (
                                                                        <span className="text-[8.5px] text-red-400 font-mono truncate max-w-[200px]">
                                                                            {sheet.errorMsg}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[8.5px] text-white/30 font-mono">
                                                                            1 Credit • {selectedImageEngine === 'nano-banana-2-open' ? 'Nano Banana 2' : selectedImageEngine === 'gpt-image-2' ? 'ChatGPT Image 2' : 'Imagen 3'}
                                                                        </span>
                                                                    )}

                                                                    <button
                                                                        onClick={() => handleGenerateConceptSheet(sheet.id)}
                                                                        disabled={sheet.status === 'generating'}
                                                                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-500 hover:from-pink-500 hover:to-cyan-400 text-white font-black text-[9.5px] uppercase tracking-wider shadow-lg shadow-purple-950/40 disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                                                                    >
                                                                        {sheet.status === 'generating' ? (
                                                                            <>
                                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                                <span>Generating...</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Sparkles className="w-3 h-3 text-cyan-200" />
                                                                                <span>{sheet.imageUrl ? 'Re-Generate Sheet' : 'Generate Sheet'}</span>
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* ========================================================================= */
                        /* 🎬 STORYBOARD TIMELINE & MOVIE PLAYER */
                        /* ========================================================================= */
                        <>
                            {/* Master Sequence Modal Player */}
                            {isPlayingSequence && generatedClips.length > 0 && (
                                <div className="p-4 border-b border-white/[0.08] bg-[#0c0c1a]/95 flex flex-col items-center justify-center animate-fade-in relative z-20">
                                    <button 
                                        onClick={() => setIsPlayingSequence(false)} 
                                        className="absolute top-4 right-4 text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                    <div className="w-full max-w-2xl space-y-2">
                                        <div className="flex items-center justify-between text-[10px] font-bold">
                                            <span className="text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <Play className="w-3 h-3" /> Playing Movie Sequence • Clip {sequenceIndex + 1} of {generatedClips.length}
                                            </span>
                                            <span className="font-mono text-white/50">{generatedClips[sequenceIndex]?.title}</span>
                                        </div>
                                        <div className="rounded-2xl overflow-hidden border border-white/10 bg-black aspect-video max-h-[360px] mx-auto shadow-2xl">
                                            <video
                                                ref={sequenceVideoRef}
                                                src={resolveUrl(generatedClips[sequenceIndex]?.videoUrl)}
                                                autoPlay
                                                controls
                                                onEnded={handleSequenceEnded}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        {/* Timeline scrub markers */}
                                        <div className="flex gap-1 pt-1">
                                            {generatedClips.map((c, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setSequenceIndex(i)}
                                                    className={cn(
                                                        "flex-1 h-1.5 rounded-full transition-all",
                                                        i === sequenceIndex ? "bg-emerald-400" : i < sequenceIndex ? "bg-white/40" : "bg-white/10"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Storyboard Shots Grid / List */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                {shots.length === 0 ? (
                                    /* Empty State / Welcome to Director Mode */
                                    <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto space-y-5">
                                        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/30 flex items-center justify-center shadow-xl shadow-violet-950/50">
                                            <Clapperboard className="w-8 h-8 text-violet-400 animate-pulse" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-black italic uppercase tracking-tight bg-gradient-to-r from-violet-300 via-indigo-200 to-cyan-300 bg-clip-text text-transparent">
                                                OpenArt Director Mode
                                            </h3>
                                            <p className="text-xs text-white/40 leading-relaxed font-medium">
                                                Upload your Character & Location anchors on the left, paste your rough script, and click <strong className="text-violet-300 font-bold">Orchestrate Director Crew</strong>.
                                                The multi-agent crew will break down your film into continuous shots, generate multimodal Gemini Omni Flash 1.1 prompts, and allow seamless shot-by-shot extending via last-frame capture!
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2 justify-center pt-2">
                                            {COMMERCIAL_PRESETS.map((p, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => { handleApplyPreset(p); }}
                                                    className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] text-[10px] font-bold text-white/70 hover:text-white transition-all"
                                                >
                                                    Try: {p.title}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    /* Active Shots Deck */
                                    <div className="space-y-6 max-w-5xl mx-auto">
                                        {/* Active Scene Overview & Continuity Anchors Bar */}
                                        {activeSceneTab !== 'all' && (() => {
                                            const currentScene = scenes.find(s => s.sceneNumber === activeSceneTab) || scenes[0];
                                            return currentScene ? (
                                                <div className="p-4 rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-950/20 via-indigo-950/10 to-[#0c0c18] backdrop-blur-md space-y-3">
                                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="px-2.5 py-1 rounded-xl bg-violet-600/30 text-violet-300 font-mono font-black text-xs border border-violet-500/40">
                                                                SCENE {currentScene.sceneNumber}
                                                            </span>
                                                            <input
                                                                type="text"
                                                                value={currentScene.title}
                                                                onChange={(e) => handleUpdateScene(currentScene.sceneNumber, 'title', e.target.value)}
                                                                className="bg-transparent text-sm font-black text-white focus:outline-none focus:border-b border-violet-400 max-w-md"
                                                                placeholder="Scene Title..."
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={handleAddShotToActiveScene}
                                                            className="px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                            <span>Add Shot to Scene {currentScene.sceneNumber}</span>
                                                        </button>
                                                    </div>

                                                    {/* Dramatic Beat */}
                                                    <div className="flex items-center gap-2 text-[11px] text-white/60">
                                                        <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                                        <input
                                                            type="text"
                                                            value={currentScene.beat || ''}
                                                            onChange={(e) => handleUpdateScene(currentScene.sceneNumber, 'beat', e.target.value)}
                                                            className="bg-black/20 px-3 py-1 rounded-lg border border-white/5 text-white/80 focus:outline-none w-full text-[10px]"
                                                            placeholder="Dramatic beat, mood, or context for this scene..."
                                                        />
                                                    </div>

                                                    {/* Per-Scene Continuity Anchors */}
                                                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5 text-[9px] font-mono">
                                                        <span className="text-white/30 uppercase tracking-wider">Scene Anchors:</span>
                                                        <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-cyan-300">
                                                            Actor: {currentScene.characterTag || characters[0]?.tag || '@char_1'}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-pink-300">
                                                            Wardrobe: {currentScene.wardrobeTag || wardrobeRef.tag}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-amber-300">
                                                            Prop: {currentScene.propTag || propRef.tag}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-emerald-300">
                                                            Location: {currentScene.locationTag || locationRef.tag}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : null;
                                        })()}

                                {(activeSceneTab === 'all' 
                                    ? shots 
                                    : shots.filter(s => (s.sceneNumber || 1) === activeSceneTab)
                                ).map((shot, index) => {
                                    const actualIndex = shots.findIndex(s => s.id === shot.id);
                                    const isGenerated = shot.status === 'completed' && shot.videoUrl;
                                    const isGenerating = shot.status === 'generating';

                                    return (
                                        <div
                                            key={shot.id}
                                            className={cn(
                                                "glass-card rounded-3xl border transition-all duration-300 overflow-hidden text-left relative",
                                                activeShotIndex === index
                                                    ? "border-violet-500/40 bg-gradient-to-b from-[#0e0e1e]/90 to-[#080812]/90 shadow-2xl shadow-violet-950/30"
                                                    : "border-white/[0.06] bg-[#0a0a14]/60 hover:border-white/15"
                                            )}
                                            onClick={() => setActiveShotIndex(index)}
                                        >
                                            {/* Shot Header */}
                                            <div className="px-5 py-3.5 border-b border-white/[0.04] bg-black/20 flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 rounded-lg bg-violet-600/30 border border-violet-500/40 text-violet-300 font-black text-[11px] flex items-center justify-center font-mono">
                                                        {index + 1}
                                                    </span>
                                                    <div>
                                                        <h4 className="text-xs font-black text-white tracking-wide">{shot.title}</h4>
                                                        <p className="text-[8.5px] font-mono text-white/40 uppercase tracking-widest mt-0.5">
                                                            {shot.shotType} • {shot.cameraMotion} • {shot.duration}s
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Shot Settings, Motion & Engine Tags */}
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {/* Interactive Camera Motion Selector */}
                                                    <select
                                                        value={shot.cameraMotion || 'Slow push-in dolly'}
                                                        onChange={e => handleShotMotionChange(actualIndex, e.target.value)}
                                                        className="bg-black/50 border border-white/10 rounded-lg px-2 py-0.5 text-[8.5px] font-bold text-violet-300 outline-none cursor-pointer hover:border-violet-500/40"
                                                        title="Change camera movement for this shot"
                                                    >
                                                        <option value="Slow push-in dolly">🎥 Slow push-in dolly</option>
                                                        <option value="Gentle orbit ending in lock">🔄 Gentle orbit</option>
                                                        <option value="Pan left">⬅️ Pan left</option>
                                                        <option value="Pan right">➡️ Pan right</option>
                                                        <option value="Low-angle tilt up">⬆️ Low-angle tilt up</option>
                                                        <option value="FPV drone dive">🚁 FPV drone dive</option>
                                                        <option value="Tracking lateral movement">🏃 Tracking lateral</option>
                                                        <option value="Static locked off">🔒 Static lock</option>
                                                    </select>

                                                    <span className="px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-white/70 text-[8px] font-mono font-bold uppercase">
                                                        {shot.aspectRatio || aspectRatio}
                                                    </span>
                                                    <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[8px] font-mono font-bold uppercase">
                                                        {shot.resolution || resolution}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[8px] font-bold uppercase tracking-wider">
                                                        {shot.mode === 'extend' ? '⛓️ Extension' : shot.mode === 'i2v' ? '🖼️ I2V' : '✍️ T2V'}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-mono uppercase">
                                                        ⚡ {selectedEngine === 'seedance' ? 'Seedance 2.0' : 'Omni Flash 1.1'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Shot Content Split */}
                                            <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
                                                
                                                {/* Left: Prompt & Directorial Blueprint (7 cols) */}
                                                <div className="lg:col-span-7 space-y-3">
                                                    {/* Anchors in this shot */}
                                                    <div className="flex flex-wrap gap-1.5 items-center">
                                                        <span className="text-[8px] font-black uppercase text-white/30 font-mono tracking-wider">Locks:</span>
                                                        <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 text-[8.5px] font-bold border border-violet-500/20">
                                                            {shot.characterTag}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[8.5px] font-bold border border-emerald-500/20">
                                                            {shot.locationTag}
                                                        </span>
                                                        {shot.audioBeat && (
                                                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[8.5px] font-mono border border-amber-500/20 truncate max-w-[200px]">
                                                                🔊 {shot.audioBeat}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Prompt Editor */}
                                                    <div>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <label className="text-[8.5px] font-black uppercase tracking-wider text-white/40 font-mono">
                                                                Multimodal Prompt Blueprint
                                                            </label>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); handlePolishShotWithAstra(actualIndex); }}
                                                                disabled={polishingShotIndex === actualIndex}
                                                                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-[8px] font-bold text-violet-300 hover:text-white transition-all disabled:opacity-50"
                                                                title="Use Astra AI (ChatGPT 6) to enhance this shot's camera action and cinematic realism"
                                                            >
                                                                {polishingShotIndex === actualIndex ? (
                                                                    <>
                                                                        <Loader2 className="w-2.5 h-2.5 animate-spin text-cyan-300" />
                                                                        <span>Polishing...</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Sparkles className="w-2.5 h-2.5 text-cyan-300" />
                                                                        <span>Astra Polish</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                        <textarea
                                                            value={shot.omniPrompt}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                setShots(prev => prev.map((s, i) => i === actualIndex ? { ...s, omniPrompt: val } : s));
                                                            }}
                                                            rows={4}
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[11px] text-white/90 placeholder-white/20 outline-none focus:border-violet-500/50 resize-none font-mono leading-relaxed"
                                                        />
                                                    </div>

                                                    {/* Shot Action Controls */}
                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        <button
                                                            onClick={() => handleGenerateShot(actualIndex)}
                                                            disabled={isGenerating}
                                                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-[10px] uppercase tracking-wider shadow-md shadow-violet-950/30 disabled:opacity-40 transition-all flex items-center gap-1.5"
                                                        >
                                                            {isGenerating ? (
                                                                <>
                                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                    <span>Generating...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                                                                    <span>{isGenerated ? 'Re-Shoot Clip' : 'Generate with Omni Flash'}</span>
                                                                </>
                                                            )}
                                                        </button>

                                                        {/* EXTEND SHOT BUTTON (CRITICAL FEATURE) */}
                                                        {isGenerated && (
                                                            <button
                                                                onClick={() => handleExtendShot(actualIndex, 5)}
                                                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-black text-[10px] uppercase tracking-wider shadow-md shadow-cyan-950/30 transition-all flex items-center gap-1.5 group"
                                                                title="Captures the screenshot of the last frame and chains into a new continuous shot"
                                                            >
                                                                <FastForward className="w-3.5 h-3.5 text-cyan-200 group-hover:translate-x-0.5 transition-transform" />
                                                                <span>Extend Scene (+5s / +10s)</span>
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => {
                                                                setShots(prev => prev.filter((_, i) => i !== actualIndex));
                                                            }}
                                                            className="p-2 rounded-xl border border-white/5 hover:border-red-500/30 text-white/30 hover:text-red-400 transition-all ml-auto"
                                                            title="Delete Shot"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    {shot.errorMsg && (
                                                        <div className="p-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-[10px]">
                                                            {shot.errorMsg}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right: Keyframes & Video Output Stage (5 cols) */}
                                                <div className="lg:col-span-5 flex flex-col justify-center">
                                                    {isGenerated ? (
                                                        /* Generated Video Player */
                                                        <div className="space-y-2">
                                                            <div className="rounded-2xl overflow-hidden border border-white/10 bg-black aspect-video relative shadow-inner">
                                                                <video
                                                                    src={resolveUrl(shot.videoUrl)}
                                                                    controls
                                                                    loop
                                                                    className="w-full h-full object-contain"
                                                                />
                                                            </div>
                                                            <div className="flex gap-2 justify-end">
                                                                <a
                                                                    href={shot.videoUrl}
                                                                    download={`shot-${shot.shotNumber || actualIndex + 1}-omniflash.mp4`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1"
                                                                >
                                                                    <Download className="w-3 h-3" /> Download MP4
                                                                </a>
                                                            </div>
                                                        </div>
                                                    ) : isGenerating ? (
                                                        /* Generating Pulse State */
                                                        <div className="rounded-2xl border border-violet-500/30 bg-black/40 aspect-video flex flex-col items-center justify-center p-4 text-center space-y-3">
                                                            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                                                            <div>
                                                                <p className="text-[11px] font-bold text-white/90">{shot.progressMsg || 'Rendering Omni Flash...'}</p>
                                                                <p className="text-[8px] font-mono text-white/30 uppercase tracking-widest mt-1">Vertex AI Multimodal Node</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        /* Idle Keyframe Preview */
                                                        <div className="rounded-2xl border border-dashed border-white/10 bg-black/30 aspect-video flex flex-col items-center justify-center p-3 relative overflow-hidden group">
                                                            {shot.startFrame ? (
                                                                <>
                                                                    <img src={shot.startFrame} alt="Start frame" className="w-full h-full object-cover rounded-xl opacity-70 group-hover:opacity-100 transition-opacity" />
                                                                    <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-white/80 text-[7.5px] font-mono uppercase tracking-wider backdrop-blur-sm">
                                                                        Start Keyframe
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <div className="text-center space-y-1">
                                                                    <ImageIcon className="w-6 h-6 text-white/20 mx-auto" />
                                                                    <span className="text-[9px] font-bold text-white/40 block">Ready to Generate</span>
                                                                    <span className="text-[8px] text-white/20 font-mono block">Will use character/location anchor</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Add Custom Scene Button */}
                                <button
                                    onClick={handleAddShotToActiveScene}
                                    className="w-full py-3.5 rounded-2xl border border-dashed border-violet-500/20 hover:border-violet-500/50 bg-violet-950/10 hover:bg-violet-950/20 text-violet-300 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Shot to {activeSceneTab === 'all' ? 'Story' : `Scene ${activeSceneTab}`}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </main>

                {/* ----------------- VIBE DIRECTING CO-PILOT SLIDE-OUT DRAWER ----------------- */}
                {showVibeDirector && (
                    <aside className="w-88 sm:w-96 shrink-0 border-l border-white/[0.08] bg-[#090914]/95 backdrop-blur-2xl flex flex-col z-40 animate-fade-in shadow-2xl">
                        {/* Header */}
                        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between bg-black/40">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-900/30">
                                    <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-black text-white uppercase tracking-wider">Astra AI Co-Director</span>
                                        <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[7.5px] font-mono font-bold">gpt-6-astra</span>
                                    </div>
                                    <p className="text-[8.5px] text-white/40 font-mono">Live Natural Language Studio Director</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowVibeDirector(false)} 
                                className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Live Project & Active Target Bar */}
                        <div className="px-4 py-2 border-b border-white/[0.04] bg-white/[0.01] flex flex-col gap-1.5 text-[9px] font-mono text-white/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded bg-violet-600/30 text-violet-300 font-bold border border-violet-500/40">
                                        {activeSceneTab === 'all' ? 'ALL SCENES' : `SCENE ${activeSceneTab}`}
                                    </span>
                                    {shots[activeShotIndex] && (
                                        <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 truncate max-w-[140px]">
                                            TARGET: Shot {shots[activeShotIndex].shotNumber || activeShotIndex + 1} ({shots[activeShotIndex].title})
                                        </span>
                                    )}
                                </div>
                                <span className="text-[8px] text-white/30">{shots.length} Shots</span>
                            </div>
                            <div className="flex items-center gap-2 text-[8px] text-white/40">
                                <span>RATIO: <strong className="text-violet-300">{aspectRatio}</strong></span>
                                <span>•</span>
                                <span>RES: <strong className="text-cyan-300">{resolution}</strong></span>
                                <span>•</span>
                                <span>DUR: <strong className="text-emerald-300">{videoDuration}</strong></span>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar text-left">
                            {vibeMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "space-y-1.5 max-w-[90%]",
                                        msg.sender === 'user' ? "ml-auto text-right" : "mr-auto text-left"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "p-3 rounded-2xl text-[10.5px] leading-relaxed",
                                            msg.sender === 'user'
                                                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-br-none shadow-md shadow-violet-950/40 font-medium"
                                                : "bg-black/50 border border-white/10 text-white/90 rounded-bl-none shadow-inner font-sans"
                                        )}
                                    >
                                        {msg.text}
                                    </div>

                                    {/* Astra Suggested Action Chips */}
                                    {msg.suggestedNextSteps && msg.suggestedNextSteps.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pt-1">
                                            {msg.suggestedNextSteps.map((chip, ci) => (
                                                <button
                                                    key={ci}
                                                    onClick={() => handleSendVibeMessage(chip)}
                                                    className="text-[8px] px-2 py-0.5 rounded-full bg-violet-600/10 hover:bg-violet-600/20 text-violet-300 border border-violet-500/20 hover:border-violet-500/40 transition-all font-mono"
                                                >
                                                    + {chip}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {isVibeDirecting && (
                                <div className="flex items-center gap-2 p-3 rounded-2xl bg-black/40 border border-white/10 text-white/60 text-[10px] w-fit">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                                    <span>Astra is analyzing direction & updating storyboard...</span>
                                </div>
                            )}
                            <div ref={vibeChatEndRef} />
                        </div>

                        {/* Quick Suggestion Chips */}
                        <div className="p-2.5 border-t border-white/[0.04] bg-black/20 flex flex-wrap gap-1.5">
                            {[
                                'Switch all to 9:16 Reels',
                                'Upgrade resolution to 4K',
                                'Golden hour lighting',
                                'Fast dynamic camera moves',
                                'Add dramatic macro close-up'
                            ].map((chip, ci) => (
                                <button
                                    key={ci}
                                    onClick={() => handleSendVibeMessage(chip)}
                                    disabled={isVibeDirecting}
                                    className="text-[8px] px-2 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-white/60 hover:text-white border border-white/5 transition-all font-mono"
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>

                        {/* Chat Input */}
                        <div className="p-3 border-t border-white/[0.08] bg-black/50">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSendVibeMessage(); }}
                                className="flex items-center gap-2"
                            >
                                <input
                                    type="text"
                                    value={vibeInput}
                                    onChange={e => setVibeInput(e.target.value)}
                                    placeholder="Direct Astra (e.g. 'Make shot 2 more suspenseful')..."
                                    disabled={isVibeDirecting}
                                    className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-[10.5px] text-white placeholder-white/30 outline-none focus:border-violet-500/50"
                                />
                                <button
                                    type="submit"
                                    disabled={!vibeInput.trim() || isVibeDirecting}
                                    className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 transition-all"
                                    title="Send direction to Astra"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            </form>
                        </div>
                    </aside>
                )}

                {/* ----------------- VISUAL MEMORY SLIDE-OUT DRAWER ----------------- */}
                {showMemoryPanel && (
                    <aside className="w-80 shrink-0 border-l border-white/[0.08] bg-[#0a0a14]/95 backdrop-blur-2xl flex flex-col p-5 space-y-4 z-40 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                            <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-violet-400" />
                                <span className="text-xs font-black uppercase tracking-wider text-white">Director's Memory</span>
                            </div>
                            <button onClick={() => setShowMemoryPanel(false)} className="text-white/40 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-[9px] text-white/40 leading-relaxed">
                            Visual memories anchor character appearance, lighting continuity, and brand rules across all scene prompts and shot extensions.
                        </p>

                        <div className="space-y-2">
                            <textarea
                                value={newMemoryNote}
                                onChange={e => setNewMemoryNote(e.target.value)}
                                placeholder="Add continuity note (e.g. Always keep emerald watch hands glowing in shadows)..."
                                rows={2}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-[10px] text-white placeholder-white/20 outline-none focus:border-violet-500/40 resize-none font-sans"
                            />
                            <button
                                onClick={handleAddMemory}
                                disabled={!newMemoryNote.trim()}
                                className="w-full py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-[9px] uppercase tracking-wider disabled:opacity-40 transition-all"
                            >
                                + Save Memory Anchor
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                            {memory.length === 0 ? (
                                <p className="text-[9px] text-white/25 italic p-3 text-center">No visual memories saved yet.</p>
                            ) : (
                                memory.map((m, idx) => (
                                    <div key={idx} className="group relative p-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-[9px] text-white/70 leading-relaxed">
                                        <span>{m}</span>
                                        <button
                                            onClick={() => handleDeleteMemory(idx)}
                                            className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 p-0.5 transition-all"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </aside>
                )}
            </div>

            {/* Modal: AI Script Generator */}
            {showScriptModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-fade-in">
                    <div className="w-full max-w-xl bg-[#0d0d1a] border border-white/15 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-900/40">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase text-white tracking-wide">Write Script with AI</h3>
                                    <p className="text-[9px] text-cyan-300 font-mono">
                                        Powered by {AI_DIRECTOR_MODELS.find(m => m.id === selectedAiModel)?.name || 'Gemini 2.5 Flash'} & Cinema Engine
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowScriptModal(false)} className="text-white/40 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Model & Persona Selection Row */}
                        <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <label className="text-[8px] font-mono uppercase text-white/40 font-bold block mb-1">AI Story & Script Model</label>
                                <select
                                    value={selectedAiModel}
                                    onChange={e => setSelectedAiModel(e.target.value)}
                                    className="w-full bg-black/60 border border-white/15 rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-cyan-300 outline-none hover:border-cyan-500/50 cursor-pointer font-mono"
                                >
                                    {AI_DIRECTOR_MODELS.map(m => (
                                        <option key={m.id} value={m.id} className="bg-[#0c0c16] text-white">
                                            {m.name} — {m.badge} ({m.provider})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1 min-w-0">
                                <label className="text-[8px] font-mono uppercase text-white/40 font-bold block mb-1">Director Persona</label>
                                <select
                                    value={selectedDirector}
                                    onChange={e => setSelectedDirector(e.target.value)}
                                    className="w-full bg-black/60 border border-white/15 rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-violet-300 outline-none hover:border-violet-500/50 cursor-pointer"
                                >
                                    {DIRECTORS.map(d => (
                                        <option key={d.name} value={d.name} className="bg-[#0c0c16] text-white">{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <p className="text-[11px] text-white/60 leading-relaxed">
                            Describe your commercial concept, movie logline, or product pitch. The selected AI model will construct an industry-standard shooting script with clean camera cuts, natural dialogue, and zero visual morphing.
                        </p>

                        <textarea
                            value={scriptIdeaInput}
                            onChange={e => setScriptIdeaInput(e.target.value)}
                            placeholder="E.g. A 60-second cinematic commercial for a futuristic titanium watch. Protagonist walks through rain-slicked Tokyo streets under glowing neon reflections..."
                            rows={4}
                            className="w-full bg-black/50 border border-white/10 rounded-2xl p-3 text-[11.5px] text-white placeholder-white/30 outline-none focus:border-violet-500/50 resize-none font-sans leading-relaxed"
                        />

                        {/* Quick Idea Starters */}
                        <div className="space-y-1.5">
                            <span className="text-[8.5px] font-mono font-bold uppercase text-white/40">Quick Starters:</span>
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    "Futuristic titanium cyber-watch in Tokyo neon rain",
                                    "Luxury velvet fragrance commercial at golden hour",
                                    "Autonomous electric hypercar speeding across alpine switchbacks",
                                    "Sci-Fi thriller teaser on a foggy megacity rooftop"
                                ].map((starter, si) => (
                                    <button
                                        key={si}
                                        type="button"
                                        onClick={() => setScriptIdeaInput(starter)}
                                        className="text-[9px] px-2.5 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/5 transition-all text-left"
                                    >
                                        {starter}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Settings snapshot */}
                        <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-[9px] font-mono text-white/50">
                            <span>Duration: <strong className="text-violet-300">{videoDuration}</strong></span>
                            <span>Model: <strong className="text-cyan-300">{AI_DIRECTOR_MODELS.find(m => m.id === selectedAiModel)?.name || selectedAiModel}</strong></span>
                            <span>Ratio: <strong className="text-emerald-300">{aspectRatio}</strong></span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowScriptModal(false)}
                                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleGenerateScriptWithAstra}
                                disabled={isGeneratingScript || !scriptIdeaInput.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-black text-[10px] uppercase tracking-wider shadow-lg shadow-violet-900/40 disabled:opacity-40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isGeneratingScript ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>AI Writing Script...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                                        <span>Generate Script</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assets Gallery Picker Modal if user wants to pick from Studio Library */}
            {galleryPickerType && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-6">
                    <div className="w-full max-w-2xl bg-[#0e0e1a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase text-white">Select from Asset Library</span>
                            <button onClick={() => setGalleryPickerType(null)} className="text-white/40 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="h-96 overflow-y-auto">
                            <AssetsLibrary onSelectAsset={(item) => {
                                const url = item.url || item.imageUrl;
                                if (galleryPickerType === 'character') {
                                    setCharacters(prev => prev.map((c, idx) => idx === activeCharacterIndex ? { ...c, image: url } : c));
                                } else if (galleryPickerType === 'wardrobe') {
                                    setWardrobeRef(prev => ({ ...prev, image: url }));
                                } else if (galleryPickerType === 'prop') {
                                    setPropRef(prev => ({ ...prev, image: url }));
                                } else if (galleryPickerType === 'location') {
                                    setLocationRef(prev => ({ ...prev, image: url }));
                                } else if (galleryPickerType === 'first_frame') {
                                    setFirstFrameRef(prev => ({ ...prev, image: url }));
                                }
                                setGalleryPickerType(null);
                            }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Concept Sheet High-Res Lightbox Modal */}
            {activeLightboxImage && (
                <div 
                    className="fixed inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center z-[99999] p-4 sm:p-8 animate-fade-in"
                    onClick={() => setActiveLightboxImage(null)}
                >
                    <div 
                        className="relative max-w-5xl w-full max-h-[90vh] bg-[#0c0c18] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Lightbox Header Bar */}
                        <div className="px-5 py-3.5 border-b border-white/[0.08] bg-black/60 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <ImageIcon className="w-4 h-4 text-pink-400" />
                                <span className="text-xs font-black uppercase tracking-wider text-white">
                                    Visual Concept Art Preview
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={resolveUrl(activeLightboxImage)}
                                    download="concept_sheet_art.png"
                                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold flex items-center gap-1.5 transition-all"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download Original</span>
                                </a>
                                <button
                                    onClick={() => setActiveLightboxImage(null)}
                                    className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Image Viewer Area */}
                        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/90 min-h-[400px]">
                            <img
                                src={resolveUrl(activeLightboxImage)}
                                alt="High-Res Concept Sheet"
                                className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-2xl border border-white/5"
                            />
                        </div>

                        {/* Lightbox Footer Actions: Quick Hook to Anchors */}
                        <div className="px-5 py-3 border-t border-white/[0.08] bg-black/60 flex flex-wrap items-center justify-between gap-3">
                            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest font-bold">
                                Quick Apply as Video Continuity Reference:
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={() => {
                                        setCharacters(prev => prev.map((c, idx) => idx === 0 ? { ...c, image: activeLightboxImage } : c));
                                        setActiveLightboxImage(null);
                                    }}
                                    className="px-2.5 py-1 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-[9px] font-bold text-violet-200 transition-all flex items-center gap-1"
                                >
                                    <User className="w-3 h-3" />
                                    <span>Set as Lead Actor</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setLocationRef(prev => ({ ...prev, image: activeLightboxImage }));
                                        setActiveLightboxImage(null);
                                    }}
                                    className="px-2.5 py-1 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-[9px] font-bold text-cyan-200 transition-all flex items-center gap-1"
                                >
                                    <MapPin className="w-3 h-3" />
                                    <span>Set as Location</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setPropRef(prev => ({ ...prev, image: activeLightboxImage }));
                                        setActiveLightboxImage(null);
                                    }}
                                    className="px-2.5 py-1 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-[9px] font-bold text-amber-200 transition-all flex items-center gap-1"
                                >
                                    <Box className="w-3 h-3" />
                                    <span>Set as Prop</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setFirstFrameRef(prev => ({ ...prev, image: activeLightboxImage }));
                                        setActiveLightboxImage(null);
                                    }}
                                    className="px-2.5 py-1 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-[9px] font-bold text-emerald-200 transition-all flex items-center gap-1"
                                >
                                    <Clapperboard className="w-3 h-3" />
                                    <span>Set as Shot 1 Start Frame</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
