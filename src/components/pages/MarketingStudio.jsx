import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Upload, Wand2, Code, X, Building, Utensils, Stethoscope, Briefcase, ChevronRight, ChevronLeft, Loader2, Play, Plus, Check, Link, Trash2, ZoomIn, ExternalLink, HardDrive, Pencil, Layers, Sparkles, Video, Expand, LayoutGrid, ChevronUp, Clock, Zap, Sliders } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../../lib/utils';
import { useShorts } from '../../hooks/useShorts';
import { useAppStore } from '../../store';
import { InpaintEditor } from '../common/InpaintEditor';
import { getApiUrl, resolveUrl } from '../../config/apiConfig';
import { buildSeedanceContentArray } from '../cinemaStudio/SeedanceEngine';
import { AddTemplateModal } from './AddTemplateModal';

const ENGINES = [
  { id: 'veo-3.1-generate-preview',      label: 'Veo 3.1 Standard', icon: '🎬', desc: 'Google Standard — 5⚡/s (9⚡/s audio)', cost: 5 },
  { id: 'veo-3.1-fast-generate-preview', label: 'Veo 3.1 Fast',     icon: '⚡', desc: 'Google Fast — 3⚡/s (5⚡/s audio)',         cost: 3 },
  { id: 'veo-3.1-lite-generate-preview', label: 'Veo 3.1 Lite',     icon: '🍃', desc: 'Google Lite — 2⚡/s (3⚡/s audio)',           cost: 2 },
  { id: 'seedance-fast',                 label: 'Seedance Fast',    icon: '🚀', desc: 'ByteDance — 12⚡/s (480p/1080p)',          cost: 12 },
  { id: 'seedace',                       label: 'Seedance 2.0',     icon: '🎯', desc: 'ByteDance — 16⚡/s (480p/1080p)', cost: 16 },
];

const IMAGE_ENGINES = [
  { id: 'nano-banana-2',   label: 'Nano Banana 2',   icon: '🎨', desc: 'Google highest-fidelity photo gen — 2⚡ flat rate', cost: 2 },
  { id: 'nano-banana-pro', label: 'Nano Banana Pro', icon: '💎', desc: 'Google maximum fidelity image engine — 5⚡ flat rate', cost: 5 },
  { id: 'gpt-image-2',     label: 'GPT Image Pro',   icon: '🤖', desc: 'OpenAI layout & text design — 2⚡ to 5⚡ variable rate',        cost: 3 },
];

const DURATION_OPTIONS = [
  { value: 5,  label: '5 Seconds',  desc: 'Quick burst — ideal for ads' },
  { value: 8,  label: '8 Seconds',  desc: 'Standard — cinematic shots' },
  { value: 10, label: '10 Seconds', desc: 'Extended — full scenes' },
];

const SEEDANCE_DURATION_OPTIONS = [
  { value: 5,  label: '5 Seconds',  desc: 'Quick burst — ideal for ads' },
  { value: 10, label: '10 Seconds', desc: 'Standard narrative length' },
  { value: 15, label: '15 Seconds', desc: 'Extended scene — maximum duration' },
];

const VEO_DURATION_OPTIONS = [
  { value: 4,  label: '4 Seconds',  desc: 'Quick cut — fast-paced narrative' },
  { value: 6,  label: '6 Seconds',  desc: 'Standard — balanced movement' },
  { value: 8,  label: '8 Seconds',  desc: 'Extended — maximum duration' },
];

const SIZE_OPTIONS = [
  { value: 'auto',      label: 'Auto',      desc: 'Auto-adjust aspect ratio', w: 12, h: 12, ratio: 'Auto' },
  { value: '1024x1792', label: 'Story',     desc: '9:16 vertical video/story', w: 9, h: 16, ratio: '9:16' },
  { value: '1024x1536', label: 'Portrait',  desc: '2:3 portrait banner', w: 10, h: 15, ratio: '2:3' },
  { value: '1024x1024', label: 'Square',    desc: '1:1 social post', w: 12, h: 12, ratio: '1:1' },
  { value: '1536x1024', label: 'Landscape', desc: '3:2 standard landscape', w: 15, h: 10, ratio: '3:2' },
  { value: '1792x1024', label: 'Wide',      desc: '16:9 widescreen', w: 16, h: 9, ratio: '16:9' },
  { value: '1536x2048', label: 'Poster',    desc: '3:4 high-impact print', w: 9, h: 12, ratio: '3:4' },
];


const QUALITY_OPTIONS = [
  { value: 'low',    label: 'Fast', desc: 'Quick rendering, standard quality' },
  { value: 'medium', label: 'HD',   desc: 'High definition details' },
  { value: 'high',   label: 'Max',  desc: 'Maximum quality, premium finish' },
];

function UpwardDropdown({ children, icon, label, badge, accentColor = 'fuchsia' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ bottom: 0, left: 0 });
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const openDropdown = () => {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({
        bottom: window.innerHeight - r.top + 8,
        left: r.left + r.width / 2,
      });
    }
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    
    const handleResize = () => {
      setOpen(false);
    };

    document.addEventListener('mousedown', handler);
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('resize', handleResize);
    };
  }, [open]);

  const colorMap = {
    fuchsia: { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/25', text: 'text-fuchsia-400', hoverBorder: 'hover:border-fuchsia-500/30', ring: 'shadow-fuchsia-500/10' },
    lime:    { bg: 'bg-[#c8f135]/10',    border: 'border-[#c8f135]/25',   text: 'text-[#c8f135]',   hoverBorder: 'hover:border-[#c8f135]/30', ring: 'shadow-[#c8f135]/10' },
    cyan:    { bg: 'bg-cyan-500/10',     border: 'border-cyan-500/25',    text: 'text-cyan-400',    hoverBorder: 'hover:border-cyan-500/30', ring: 'shadow-cyan-500/10' },
    violet:  { bg: 'bg-violet-500/10',   border: 'border-violet-500/25',  text: 'text-violet-400',  hoverBorder: 'hover:border-violet-500/30', ring: 'shadow-violet-500/10' },
  };
  const c = colorMap[accentColor] || colorMap.fuchsia;

  return (
    <>
      <motion.button
        ref={triggerRef}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 500, damping: 22 }}
        onClick={openDropdown}
        type="button"
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest border backdrop-blur-xl transition-colors shrink-0 origin-bottom",
          open
            ? `${c.bg} ${c.border} ${c.text}`
            : "bg-black/60 border-white/10 text-gray-500 hover:text-white"
        )}
      >
        {icon}
        <span className="whitespace-nowrap">{label}</span>
        {badge && <span className={cn("text-[6px] px-1 py-0.5 rounded border ml-0.5", open ? `${c.border} ${c.text}` : "border-white/5 text-gray-600")}>{badge}</span>}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="ml-0.5"
        >
          <ChevronUp size={7} />
        </motion.span>
      </motion.button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{
                position: 'fixed',
                bottom: pos.bottom,
                left: pos.left,
                transform: 'translateX(-50%)',
                zIndex: 9999,
              }}
              className={cn(
                "min-w-[260px] max-w-[320px] max-h-[340px] overflow-y-auto custom-scrollbar",
                "bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl",
                `shadow-lg ${c.ring}`
              )}
            >
              {typeof children === 'function' ? children(() => setOpen(false)) : children}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

const LOADING_MESSAGES_DEFAULT = [
    "✨ Crafting your culinary masterpiece…",
    "🍽️ Plating the perfect shot…",
    "🎨 Mixing colors and flavors…",
    "📸 Setting up the studio lighting…",
    "🌿 Adding the final garnish…",
    "🔥 Turning up the heat on your brand…",
    "💫 Sprinkling some magic…",
    "🍜 Your dish is almost camera-ready…",
    "🖌️ Painting with pixels…",
    "⚡ GPT Image 2 is cooking something special…",
    "🌟 Composing the perfect frame…",
    "🍣 Slicing, plating, perfecting…",
];

const LOADING_MESSAGES_REALESTATE = [
    "🏠 Staging your dream property…",
    "📐 Measuring the perfect angle…",
    "🌇 Setting up the golden hour lighting…",
    "🏡 Polishing every corner…",
    "🪟 Framing the perfect view…",
    "✨ Adding the finishing touches…",
    "🛋️ Furnishing with pixels…",
    "🌳 Landscaping the surroundings…",
    "📸 Capturing kerb appeal…",
    "🔑 Your listing is almost ready…",
];

const LOADING_MESSAGES = LOADING_MESSAGES_DEFAULT;

function CyclingLoadingText({ messages = LOADING_MESSAGES_DEFAULT }) {
    const [idx, setIdx] = React.useState(0);
    const [visible, setVisible] = React.useState(true);
    React.useEffect(() => {
        setIdx(0);
        const interval = setInterval(() => {
            setVisible(false);
            setTimeout(() => { setIdx(i => (i + 1) % messages.length); setVisible(true); }, 400);
        }, 3000);
        return () => clearInterval(interval);
    }, [messages]);
    return (
        <p style={{ transition: 'opacity 0.4s', opacity: visible ? 1 : 0 }}
            className="text-white/60 text-sm font-semibold tracking-wide text-center max-w-xs">
            {messages[idx]}
        </p>
    );
}

const CATEGORIES = [
    { id: 'food', label: 'Food & Beverage', icon: Utensils, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { id: 'realestate', label: 'Real Estate', icon: Building, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { id: 'medical', label: 'Medical', icon: Stethoscope, color: 'text-teal-400', bg: 'bg-teal-400/10' },
    { id: 'other', label: 'Others', icon: Briefcase, color: 'text-purple-400', bg: 'bg-purple-400/10' },
];

// GPT Image 2 cost in ₹ with 50% margin
const USD_TO_INR = 84;
const getGenerateCostINR = (quality, size) => {
    const isSquare = size === '1024x1024' || size === '2048x2048' || size === 'auto';
    let usd = 0.041;
    if (quality === 'low') {
        usd = isSquare ? 0.006 : 0.005;
    } else if (quality === 'medium') {
        usd = isSquare ? 0.053 : 0.041;
    } else if (quality === 'high') {
        usd = isSquare ? 0.211 : 0.165;
    }
    const usdWithMargin = usd * 1.5;
    return (usdWithMargin * USD_TO_INR).toFixed(2);
};

const TEMPLATES = { food: [], restaurant: [], realestate: [], medical: [], other: [] };

const VIDEO_CATEGORIES = [
    { id: 'product', label: 'Product', icon: Sparkles, color: 'text-lime-400' },
    { id: 'food', label: 'Food', icon: Utensils, color: 'text-orange-400' },
    { id: 'realestate', label: 'Real Estate', icon: Building, color: 'text-blue-400' },
    { id: 'brand', label: 'Brand', icon: Briefcase, color: 'text-purple-400' },
    { id: 'other', label: 'Others', icon: Video, color: 'text-pink-400' },
];

const VIDEO_TEMPLATES = {
    product: [
        { id: 'vt_product_1', name: 'Product Reveal', imageUrl: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400', prompt: 'Cinematic product reveal video. Slow motion camera push-in. Product rotates gracefully on a dark studio background. Dramatic lighting, volumetric fog, 4K quality.', aspect: '9/16' },
        { id: 'vt_product_2', name: 'Lifestyle Showcase', imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', prompt: 'Lifestyle product video. Person using the product in a natural setting. Shallow depth of field, warm golden hour lighting, smooth tracking shot.', aspect: '16/9' },
    ],
    food: [
        { id: 'vt_food_1', name: 'Food Sizzle Reel', imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400', prompt: 'Mouthwatering food video. Slow motion pour, steam rising, sizzle sounds. Close-up macro shots transitioning to full dish reveal. Warm studio lighting, 4K cinematic.', aspect: '9/16' },
        { id: 'vt_food_2', name: 'Chef Plating', imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400', prompt: 'Chef plating video. Hands carefully arranging dish. Top-down and side angle shots. Restaurant ambiance lighting, elegant and professional.', aspect: '1/1' },
    ],
    realestate: [
        { id: 'vt_re_1', name: 'Property Tour', imageUrl: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400', prompt: 'Luxury property tour video. Smooth drone flyover transitioning to interior walkthrough. Golden hour exterior, warm interior lighting. Professional real estate cinematic.', aspect: '16/9' },
        { id: 'vt_re_2', name: 'Aerial Showcase', imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400', prompt: 'Aerial real estate showcase. Sweeping drone shot around property. Sunrise lighting, ultra-wide angle, slow smooth movement. 4K cinematic quality.', aspect: '16/9' },
    ],
    brand: [
        { id: 'vt_brand_1', name: 'Brand Intro', imageUrl: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400', prompt: 'Dynamic brand intro video. Logo reveal with particle effects. Bold colors, modern typography animation, energetic camera movement. Corporate cinematic style.', aspect: '16/9' },
        { id: 'vt_brand_2', name: 'Social Story', imageUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400', prompt: 'Instagram story style brand video. Vertical format, trendy transitions, vibrant colors. Quick cuts, bold text overlays, modern social media aesthetic.', aspect: '9/16' },
    ],
    other: [],
};

const LS_KEY = 'marketing_custom_templates';

export default function MarketingStudio() {
    const userProfile = useAppStore(state => state.userProfile);
    const currentUserId = userProfile?.id || null;
    const userShorts = useAppStore(state => state.userShorts);
    const userCredits = userShorts ?? 0;
    const isAdmin = userProfile?.email === 'premspaw@gmail.com';
    const [activeCategory, setActiveCategory] = useState('food');
    const [templateTab, setTemplateTab] = useState('image'); // 'image' | 'video'
    const [activeVideoCategory, setActiveVideoCategory] = useState('product');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [referenceImage, setReferenceImage] = useState(null);
    const [referenceImageBase64, setReferenceImageBase64] = useState(null);
    const [logoImage, setLogoImage] = useState(null);
    const [isPostProcessing, setIsPostProcessing] = useState(false);
    const [editInstruction, setEditInstruction] = useState('');
    const [showEditBar, setShowEditBar] = useState(false);
    const [generateMode, setGenerateMode] = useState('image');
    const [imageEngine, setImageEngine] = useState('gpt-image-2');
    const [videoEngine, setVideoEngine] = useState('veo-3.1-fast-generate-preview');
    const [videoDuration, setVideoDuration] = useState(8);
    const [generateAudio, setGenerateAudio] = useState(false);
    const [imageFormat, setImageFormat] = useState('png'); // 'png' | 'jpeg' | 'webp'
    const [imageCompression, setImageCompression] = useState(80); // 0-100
    const [imageBackground, setImageBackground] = useState('auto'); // 'auto' | 'opaque'
    const [pollMsg, setPollMsg] = useState('');
    const [firstFrame, setFirstFrame] = useState(null);
    const [lastFrame, setLastFrame] = useState(null);
    const firstFrameRef = useRef(null);
    const lastFrameRef = useRef(null);
    const [previewTemplateIdx, setPreviewTemplateIdx] = useState(null);
    const [showPropertyDetails, setShowPropertyDetails] = useState(false); // 'image' | 'video'
    const logoInputRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState(null);
    const fileInputRef = useRef(null);
    const [promptText, setPromptText] = useState('');
    const [selectedStyle, setSelectedStyle] = useState('premium marketing');
    const [brandColors, setBrandColors] = useState(['#FF0000', '#000000']);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [brandLogoPreview, setBrandLogoPreview] = useState(null);
    const [zoomedImage, setZoomedImage] = useState(null);
    const [zoomedIndex, setZoomedIndex] = useState(null);
    const [inpaintOpen, setInpaintOpen] = useState(false);
    const [upscalingItems, setUpscalingItems] = useState({});
    const [showTemplatePanel, setShowTemplatePanel] = useState(true);
    const [customTemplates, setCustomTemplates] = useState({ food: [], restaurant: [], realestate: [], medical: [], other: [] });
    const [showAddModal, setShowAddModal] = useState(false);
    const [templatesLoading, setTemplatesLoading] = useState(true);
    const [recipeData, setRecipeData] = useState({
        dish_name: '',
        dish_presentation: '',
        ingredients: [],
        steps: [],
        meta: { calories: '', time: '', servings: 4 }
    });
    const [quality, setQuality] = useState('medium');
    const [imageSize, setImageSize] = useState('1024x1024');
    const [specialIngredients, setSpecialIngredients] = useState([]);
    const [ingredientInput, setIngredientInput] = useState('');
    const [realEstateData, setRealEstateData] = useState({
        property_name: '',
        property_type: 'apartment',
        location: '',
        price: '',
        bedrooms: '',
        bathrooms: '',
        area: '',
        features: '',
        tagline: '',
        agent_name: '',
    });
    const [medicalData, setMedicalData] = useState({
        clinic_name: '',
        doctor_name: '',
        specialization: '',
        phone: '',
        address: '',
        services: '',
        tagline: '',
        timings: '',
    });
    const [referenceImageMeta, setReferenceImageMeta] = useState(null);
    const [generationHistory, setGenerationHistory] = useState(() => {
        try {
            const saved = localStorage.getItem('marketing_generation_history');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    const [gallerySearch, setGallerySearch] = useState('');
    const [activeTag, setActiveTag] = useState(null);
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

    const { spend, refund, canAfford, refresh: refreshShorts } = useShorts();

    const getApiKey = () => {
        return localStorage.getItem('GOOGLE_API_KEY') || window.aistudio?.apiKey || import.meta.env.VITE_GOOGLE_API_KEY || '';
    };

    const getAI = () => {
        const key = getApiKey();
        if (!key) throw new Error("No API Key detected. Please provide a Gemini API Key.");
        return new GoogleGenAI({ apiKey: key });
    };

    const cleanErrorMessage = (msg) => {
        if (!msg || typeof msg !== 'string') return '';
        let cleaned = msg;
        if (cleaned.toLowerCase().includes('real person') || cleaned.toLowerCase().includes('realperson')) {
            return "Real-Person Policy Flagged: Volcano/BytePlus Ark safety filters restrict generating video from reference images that resemble real people. Recommendations: 1) Switch to Veo 3.1 or 2) Use a more stylized or cartoonish/drawn reference image.";
        }
        if (cleaned.includes('SAFETY_REFUSAL') || cleaned.toLowerCase().includes('safety filter')) {
            return "Safety Filter Blocked: The prompt or input image triggered the model's safety filters. Please refine your prompt text or try a different reference image.";
        }
        return cleaned;
    };
    const pollSeedanceTask = async (taskId, activePrompt, activeRatio, engine, folder = 'marketing') => {
        const engineLabel = engine.includes('fast') ? 'Seedance Fast' : 'Seedance 2.0';

        for (let i = 0; i < 120; i++) {
            await new Promise(r => setTimeout(r, 6000));
            const elapsed = (i + 1) * 6;
            setPollMsg(`Rendering video... (${elapsed}s)`);

            try {
                const res = await fetch(getApiUrl(`/api/seedance/status/${taskId}?userId=${currentUserId}&aspectRatio=${activeRatio}&engine=${engine}&folder=${folder}`));
                const json = await res.json();
                const st = json.status;

                if (st === 'completed') {
                    const url = json.url;
                    if (url) {
                        setGenerationHistory(prev => {
                            const next = [{ url, ts: Date.now(), size: imageSize, type: 'video' }, ...prev].slice(0, 50);
                            try { localStorage.setItem('marketing_generation_history', JSON.stringify(next)); } catch (_) { /* ignore */ }
                            return next;
                        });
                        refreshShorts();
                        return;
                    }
                }

                if (st === 'failed' || st === 'error') {
                    const cleanErr = cleanErrorMessage(json.error || json.message || `${engineLabel} generation failed.`);
                    throw new Error(cleanErr);
                }
            } catch (pollErr) {
                console.warn('[Seedance Poll Error]:', pollErr.message);
                if (pollErr.message.includes('Volcano') || pollErr.message.includes('safety') || pollErr.message.includes('failed')) {
                    throw pollErr;
                }
                continue;
            }
        }
        throw new Error(`${engineLabel} compilation timed out.`);
    };

    const getRequiredCredits = (engineId, customDuration) => {
        const duration = customDuration ?? videoDuration;
        if (generateMode === 'image') {
            if (engineId === 'gpt-image-2') {
                if (quality === 'low') return 2;
                if (quality === 'high') return 5;
                return 3; // default medium
            }
            return IMAGE_ENGINES.find(e => e.id === engineId)?.cost || 2;
        }
        if (engineId.startsWith('veo-3.1') || engineId === 'veo3') {
            let costPerSec = 10;
            const modelId = engineId === 'veo3' ? 'veo-3.1-generate-preview' : engineId;
            if (modelId === 'veo-3.1-generate-preview') {
                costPerSec = generateAudio ? 54 : 30;
            } else if (modelId === 'veo-3.1-fast-generate-preview') {
                costPerSec = generateAudio ? 15 : 12;
            } else if (modelId === 'veo-3.1-lite-generate-preview') {
                costPerSec = generateAudio ? 10 : 6;
            }
            return costPerSec * duration;
        }
        if (engineId === 'seedance-fast') {
            return 12 * duration;
        }
        if (engineId === 'seedace' || engineId === 'seedance2') {
            return 16 * duration;
        }
        return (ENGINES.find(e => e.id === engineId)?.cost || 4) * duration;
    };

    useEffect(() => {
        const isSeed = videoEngine === 'seedance-fast' || videoEngine === 'seedace';
        const isVeo3 = videoEngine.startsWith('veo-3.1');
        
        if (isVeo3) {
            if (![4, 6, 8].includes(videoDuration)) {
                if (videoDuration < 5) setVideoDuration(4);
                else if (videoDuration < 8) setVideoDuration(6);
                else setVideoDuration(8);
            }
        } else if (isSeed) {
            if (![5, 10, 15].includes(videoDuration)) {
                if (videoDuration <= 7) setVideoDuration(5);
                else if (videoDuration <= 12) setVideoDuration(10);
                else setVideoDuration(15);
            }
        } else {
            if (![5, 8, 10].includes(videoDuration)) {
                if (videoDuration <= 6) setVideoDuration(5);
                else if (videoDuration <= 9) setVideoDuration(8);
                else setVideoDuration(10);
            }
        }
    }, [videoEngine, videoDuration]);

    useEffect(() => {
        if (generateMode === 'image' && imageEngine === 'gpt-image-2') {
            const validValues = ['1024x1024', '1536x1024', '1024x1536', '2048x2048', '2048x1152', '3840x2160', '2160x3840'];
            if (!validValues.includes(imageSize)) {
                setImageSize('1024x1024');
            }
        }
    }, [imageEngine, generateMode, imageSize]);

    const getAvailableSizes = () => {
        if (generateMode === 'image' && imageEngine === 'gpt-image-2') {
            return [
                { value: '1024x1024', label: 'Square',    desc: '1:1 social post', w: 12, h: 12, ratio: '1:1' },
                { value: '1536x1024', label: 'Landscape', desc: '3:2 standard landscape', w: 15, h: 10, ratio: '3:2' },
                { value: '1024x1536', label: 'Portrait',  desc: '2:3 portrait banner', w: 10, h: 15, ratio: '2:3' },
                { value: '2048x2048', label: '2K Square', desc: 'High-res square banner', w: 12, h: 12, ratio: '1:1' },
                { value: '2048x1152', label: '2K Landscape', desc: '2K widescreen presentation', w: 16, h: 9, ratio: '16:9' },
                { value: '3840x2160', label: '4K Landscape', desc: 'Ultra-HD widescreen', w: 16, h: 9, ratio: '16:9' },
                { value: '2160x3840', label: '4K Portrait',  desc: 'Ultra-HD vertical display', w: 9, h: 16, ratio: '9:16' }
            ];
        }
        return SIZE_OPTIONS;
    };
    // Load persisted custom templates — DB first, localStorage fallback
    useEffect(() => {
        // Load from localStorage immediately so UI isn't blank
        // but strip any stale localhost proxy URLs
        try {
            const cached = localStorage.getItem(LS_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                Object.values(parsed).forEach(arr => arr.forEach(t => {
                    const m = (t.imageUrl || '').match(/proxy-image\?url=(.+)$/);
                    if (m) t.imageUrl = decodeURIComponent(m[1]);
                }));
                setCustomTemplates(parsed);
            }
        } catch (_) {
            /* ignore */
        }

        fetch(getApiUrl('/api/marketing/templates'))
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(rows => {
                if (!Array.isArray(rows)) return;
                const grouped = { food: [], restaurant: [], realestate: [], medical: [], other: [] };
                rows.forEach(row => {
                    const cat = row.category || 'other';
                    if (!grouped[cat]) grouped[cat] = [];
                    // Strip old localhost proxy wrapper if present → use direct R2 URL
                    let imageUrl = row.image_url || '';
                    const proxyMatch = imageUrl.match(/proxy-image\?url=(.+)$/);
                    if (proxyMatch) imageUrl = decodeURIComponent(proxyMatch[1]);
                    grouped[cat].push({
                        id: row.id,
                        name: row.name,
                        imageUrl,
                        prompt: row.prompt,
                        aspect: row.aspect,
                        isCustom: true,
                    });
                });
                setCustomTemplates(grouped);
                try { localStorage.setItem(LS_KEY, JSON.stringify(grouped)); } catch (_) { /* ignore */ }
            })
            .catch(err => console.warn('[Templates] DB unavailable, using localStorage cache:', err))
            .finally(() => setTemplatesLoading(false));
    }, []);

    const handleAddTemplate = async (tpl) => {
        const updated = (prev) => ({
            ...prev,
            [activeCategory]: [...(prev[activeCategory] || []), tpl]
        });
        setCustomTemplates(prev => {
            const next = updated(prev);
            try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch (_) { /* ignore */ }
            return next;
        });
        fetch(getApiUrl('/api/marketing/templates'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: tpl.id, name: tpl.name, image_url: tpl.imageUrl,
                prompt: tpl.prompt, aspect: tpl.aspect,
                category: activeCategory, user_id: currentUserId,
            })
        }).catch(() => {}); // localStorage is source of truth; DB sync is best-effort
    };

    const handleDeleteCustom = async (tplId) => {
        setCustomTemplates(prev => {
            const next = { ...prev, [activeCategory]: prev[activeCategory].filter(t => t.id !== tplId) };
            try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch (_) { /* ignore */ }
            return next;
        });
        fetch(getApiUrl(`/api/marketing/templates/${tplId}`), { method: 'DELETE' }).catch(() => {}); // best-effort
    };

    const allTemplates = [
        ...(TEMPLATES[activeCategory] || []),
        ...(customTemplates[activeCategory] || [])
    ];
    console.log('[GALLERY] Custom templates for', activeCategory, ':', customTemplates[activeCategory]?.map(t => ({ name: t.name, url: t.imageUrl?.slice(0, 60) })));

    const allTags = [...new Set(allTemplates.flatMap(t => t.tags || []))];
    const filteredTemplates = allTemplates.filter(t => {
        const matchSearch = !gallerySearch || t.name.toLowerCase().includes(gallerySearch.toLowerCase());
        const matchTag = !activeTag || (t.tags || []).includes(activeTag);
        return matchSearch && matchTag;
    });

    // ── Zoom/Lightbox helpers ──────────────────────────────────────────────
    const openZoom = (url, idx = null) => {
        setZoomedImage(url);
        setZoomedIndex(idx);
    };
    const closeZoom = () => {
        setZoomedImage(null);
        setZoomedIndex(null);
    };

    const getGeminiAspectRatio = (size) => {
        if (!size) return '1:1';
        if (size.includes('1536x1024') || size.includes('2048x1152') || size.includes('3840x2160') || size.includes('1792x1024')) return '16:9';
        if (size.includes('1024x1536') || size.includes('2160x3840') || size.includes('1024x1792')) return '9:16';
        return '1:1';
    };

    const handleUpscale = async (item, targetRes, e) => {
        if (e) e.stopPropagation();
        
        const showToast = useAppStore.getState().showToast;
        
        const isVideo = item.type === 'video' || item.url?.includes('.mp4');
        if (isVideo) {
            if (showToast) showToast("Only images can be upscaled.", "error");
            return;
        }

        setUpscalingItems(prev => ({ ...prev, [item.url]: targetRes }));
        closeZoom();
        setIsGenerating(true);
        
        const costKey = 'image_upscale_4k';
        const requiredCredits = targetRes === '4K' ? 5 : 2;

        try {
            // Check if user can afford
            if (!canAfford(costKey, requiredCredits)) {
                throw new Error(`Insufficient Shorts! You need ${requiredCredits}⚡ to upscale.`);
            }

            // Deduct credits
            const spendResult = await spend(costKey, requiredCredits);
            if (!spendResult.success) {
                throw new Error(spendResult.reason || 'Failed to authorize credit deduction.');
            }

            if (showToast) showToast(`Initiating ${targetRes} refinement using Nano Banana...`, "info");

            const prompt = `REFINE TO ${targetRes}: Upscale this image to high resolution. 
STRICT RULE: Maintain 100% pixel-perfect fidelity to the original subject, lighting, and composition. 
DO NOT add new objects or change the scene. Enhance only.
Any written text, characters, letters, numbers, and labels inside the image must be corrected, rendered with clear typography, and made perfectly sharp, legible, and clearly visible.`;

            // Derive aspect ratio from item size
            const aspect = getGeminiAspectRatio(item.size);

            const payload = {
                model: targetRes === '4K' ? 'gemini-3-pro-image-preview' : 'gemini-3.1-flash-image-preview', // Call premium Pro model for 4K upscaling/text correction
                prompt,
                aspect_ratio: aspect,
                quality: targetRes,
                imageSize: targetRes,
                resolution: targetRes,
                referenceImages: [item.url], // Pass URL directly — let backend download
                userId: currentUserId,
                folder: 'marketing'
            };

            const resp = await fetch(getApiUrl('/api/generate-image'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || data.message || 'Upscale request failed.');

            if (data.url) {
                const newItem = {
                    url: data.url,
                    ts: Date.now(),
                    size: targetRes === '4K' ? '3840x2160' : '2048x1152', // high res sizes
                    engine: `Gemini (${targetRes})`
                };

                // Add the new upscaled image to the top of the history
                setGenerationHistory(prev => {
                    const next = [newItem, ...prev].slice(0, 50);
                    try { localStorage.setItem('marketing_generation_history', JSON.stringify(next)); } catch (_) { /* ignore */ }
                    return next;
                });
                
                setGeneratedImage(data.url);
                
                if (showToast) showToast(`Image successfully upscaled to ${targetRes}!`, "success");
            } else {
                throw new Error("Upscale API returned no URL.");
            }
        } catch (err) {
            console.error("[Upscale Error]:", err);
            // Refund credits on failure
            await refund(costKey, requiredCredits);
            if (showToast) showToast(`Upscale failed: ${err.message}`, "error");
        } finally {
            setIsGenerating(false);
            setUpscalingItems(prev => {
                const next = { ...prev };
                delete next[item.url];
                return next;
            });
            refreshShorts();
        }
    };

    // ── Download helper (blob fetch to force save-as on cross-origin URLs) ─
    const downloadAsset = async (url, type = 'image') => {
        const ext = type === 'video' ? 'mp4' : 'png';
        const filename = `marketing-asset-${Date.now()}.${ext}`;

        // Step 1: Try proxying through our backend (same-origin) so the
        // browser's `download` attribute works on cross-origin CDN URLs.
        try {
            const proxyUrl = getApiUrl(`/api/proxy-image?url=${encodeURIComponent(url)}`);
            const resp = await fetch(proxyUrl);
            if (!resp.ok) throw new Error(`Proxy fetch failed: ${resp.status}`);
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);
            return;
        } catch (proxyErr) {
            console.warn('[downloadAsset] Proxy failed, trying direct fetch:', proxyErr.message);
        }

        // Step 2: Direct fetch (works if CDN has permissive CORS headers).
        try {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error('Direct fetch failed');
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);
            return;
        } catch (directErr) {
            console.warn('[downloadAsset] Direct fetch failed, opening new tab:', directErr.message);
        }

        // Step 3: Open in new tab — NEVER replace the current app page.
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    // Derive CSS aspect-ratio string from a WxH size string (e.g. '1536x1024' → '1536/1024')
    const getAspectRatio = (size) => {
        if (!size || size === 'auto') return '9/16';
        const parts = size.split('x');
        if (parts.length !== 2) return '9/16';
        const [w, h] = parts.map(Number);
        if (!w || !h) return '9/16';
        return `${w}/${h}`;
    };

    const addIngredient = () => {
        const val = ingredientInput.trim();
        if (val && !specialIngredients.includes(val)) {
            setSpecialIngredients(prev => [...prev, val]);
        }
        setIngredientInput('');
    };
    const removeIngredient = (idx) => setSpecialIngredients(prev => prev.filter((_, i) => i !== idx));
    // Helper to convert image prompt to video cinematic prompt
    const toVideoPrompt = (imgPrompt, templateName) => {
        if (!imgPrompt) return `Cinematic product video for ${templateName || 'marketing'}. Dynamic camera movement, professional lighting, slow motion reveal, photorealistic, 4K quality.`;
        // Extract key elements from image prompt
        const base = imgPrompt.replace(/photorealistic|high resolution|no watermarks?|no logos?/gi, '').trim();
        return `Cinematic video: ${base}. Dynamic camera movement, smooth pan and dolly shots, professional lighting, shallow depth of field, motion blur, slow motion reveal, photorealistic, 4K quality, no watermarks.`;
    };

    const handleTemplateSelect = (template) => {
        setSelectedTemplate(template);
        // Set prompt based on current mode
        if (generateMode === 'video') {
            setPromptText(toVideoPrompt(template.prompt, template.name));
        } else {
            setPromptText(template.prompt);
        }
        setGeneratedImage(null);
    };

    // Update prompt when switching between Image/Video modes
    useEffect(() => {
        if (!selectedTemplate) return;
        if (generateMode === 'video') {
            setPromptText(toVideoPrompt(selectedTemplate.prompt, selectedTemplate.name));
        } else {
            setPromptText(selectedTemplate.prompt);
        }
    }, [generateMode, selectedTemplate]);


    const saveGeneratedAsTemplate = async () => {
        if (!generatedImage) return;
        const name = window.prompt('Name this template:', `${selectedTemplate?.name || 'Generated'} Variant`);
        if (!name) return;
        const tpl = {
            id: `custom_${Date.now()}`,
            name: name.trim(),
            imageUrl: generatedImage,
            prompt: promptText || selectedTemplate?.prompt || '',
            aspect: selectedTemplate?.aspect || '16/9',
            tags: ['ai-generated'],
            isCustom: true,
        };
        handleAddTemplate(tpl);
    };

    const handleGeneratePrompt = async () => {
        setIsGeneratingPrompt(true);
        try {
            const resp = await fetch(getApiUrl('/api/marketing/generate-prompt'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: activeCategory,
                    recipeData,
                    medicalData,
                    specialIngredients,
                    brandColors,
                    selectedStyle,
                    referenceImage
                })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || 'Prompt generation failed');
            // Merge AI-generated prompt into the existing finalPrompt structure
            const aiPrompt = data.prompt;
            const merged = {
                goal: aiPrompt.goal || `Create a professional marketing asset`,
                mode: aiPrompt.mode || (selectedStyle === 'infographic' ? 'detailed_infographic' : 'premium_product_ad'),
                scene: aiPrompt.scene || `Minimalist modern ${selectedStyle} aesthetic, soft diffused lighting.`,
                subject: aiPrompt.subject || (recipeData.dish_name || medicalData.clinic_name || promptText),
                details: {
                    composition: aiPrompt.details?.composition || 'Centered subject with balanced negative space',
                    visual_quality: aiPrompt.details?.visual_quality || '8K resolution, ultra-sharp, photorealistic, cinematic lighting',
                    ...(activeCategory === 'medical' ? {
                        medical_context: {
                            clinic_name: medicalData.clinic_name,
                            doctor: medicalData.doctor_name,
                            specialization: medicalData.specialization,
                            phone: medicalData.phone,
                            address: medicalData.address,
                            services: medicalData.services,
                            tagline: medicalData.tagline,
                            timings: medicalData.timings,
                        }
                    } : {
                        recipe_context: recipeData.dish_name ? {
                            dish: recipeData.dish_name,
                            presentation: recipeData.dish_presentation || 'Modern editorial plating',
                            nutrition: recipeData.meta,
                            ingredients: recipeData.ingredients,
                            steps: recipeData.steps
                        } : null
                    })
                },
                special_ingredients: (activeCategory !== 'medical' && specialIngredients.length > 0) ? specialIngredients : undefined,
                constraints: aiPrompt.constraints || [
                    'No watermarks',
                    'No generic placeholder text',
                    ...(brandLogoPreview ? ['Include the uploaded brand logo prominently'] : []),
                    `Preserve brand colors: ${brandColors.join(', ')}`,
                    'High contrast for readability'
                ]
            };
            setPromptText(JSON.stringify(merged, null, 2));
        } catch (err) {
            console.error('Prompt gen failed:', err);
            alert('Prompt generation failed: ' + err.message);
        } finally {
            setIsGeneratingPrompt(false);
        }
    };

    // Normalize any image format (AVIF, BMP, TIFF, HEIC, etc.) to PNG via Canvas.
    // OpenAI images API only accepts: png, jpeg, gif, webp.
    const normalizeImageForOpenAI = (dataUrl) => new Promise((resolve) => {
        const SUPPORTED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
        const mime = dataUrl.match(/data:([^;]+)/)?.[1];
        if (mime && SUPPORTED.includes(mime.toLowerCase())) {
            resolve(dataUrl);
            return;
        }
        
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                try {
                    const pngDataUrl = canvas.toDataURL('image/png');
                    resolve(pngDataUrl);
                } catch (err) {
                    console.error('Canvas conversion error:', err);
                    resolve(dataUrl);
                }
            } else {
                resolve(dataUrl);
            }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const rawBase64 = event.target.result;
            const base64 = await normalizeImageForOpenAI(rawBase64);
            setReferenceImage(base64); // preview immediately
            setReferenceImageBase64(base64); // keep original base64 for Gemini analysis
            // Only set food default prompt for food categories — not real estate / medical
            if (activeCategory !== 'realestate' && activeCategory !== 'medical') setPromptText(`Ultra-clean modern recipe infographic. Showcase the attached food image in a visually appealing finished form—sliced, plated, or portioned—floating slightly in perspective or angled view. Arrange ingredients, steps, and tips around the dish in a dynamic editorial layout, not restricted to top-down. Ingredients Section: Include icons or mini illustrations for each ingredient with quantities. Arrange them in clusters, lists, or circular flows connected visually to the dish. Steps Section: Show preparation steps with numbered panels, arrows, or lines, forming a logical flow around the main dish. Include small cooking icons (knife, pan, oven, timer) where helpful. Additional Info: Total calories, prep/cook time, servings, spice level—displayed as clean bubbles or badges near the dish. Visual Style: Editorial infographic meets lifestyle food photography. Vibrant, natural food colors, subtle drop shadows, clean vector icons, modern typography, soft gradients for step panels. Composition: Finished meal as hero visual in perspective or angled view. Ingredients and steps flow dynamically around the dish. Clear visual hierarchy: dish > steps > ingredients > optional stats. Enough negative space to keep design airy and readable. Soft natural studio lighting, minimal textured or gradient background. Output: 1080x1080, ultra-crisp, social-feed optimized, no watermarks.`);
            setIsAnalyzing(true);
            try {
                // Upload to GCS marketing bucket + analyze in parallel
                const [uploadResp, analyzeResp] = await Promise.all([
                    fetch(getApiUrl('/api/marketing/upload-reference'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image: base64, userId: currentUserId })
                    }),
                    fetch(getApiUrl('/api/marketing/analyze-image'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image: base64 })
                    })
                ]);

                const uploadData = await uploadResp.json();
                if (uploadData.url) {
                    setReferenceImage(uploadData.url); // swap base64 preview → GCS URL
                    setReferenceImageMeta({ url: uploadData.url, bucket: uploadData.bucket, storage: uploadData.storage });
                }

                const analyzeData = await analyzeResp.json();
                if (analyzeData.dish_name) {
                    setRecipeData(analyzeData);
                    setPromptText(`Ultra-clean modern recipe infographic. Showcase the attached food image in a visually appealing finished form—sliced, plated, or portioned—floating slightly in perspective or angled view. Arrange ingredients, steps, and tips around the dish in a dynamic editorial layout, not restricted to top-down. Ingredients Section: Include icons or mini illustrations for each ingredient with quantities. Arrange them in clusters, lists, or circular flows connected visually to the dish. Steps Section: Show preparation steps with numbered panels, arrows, or lines, forming a logical flow around the main dish. Include small cooking icons (knife, pan, oven, timer) where helpful. Additional Info: Total calories, prep/cook time, servings, spice level—displayed as clean bubbles or badges near the dish. Visual Style: Editorial infographic meets lifestyle food photography. Vibrant, natural food colors, subtle drop shadows, clean vector icons, modern typography, soft gradients for step panels. Composition: Finished meal as hero visual in perspective or angled view. Ingredients and steps flow dynamically around the dish. Clear visual hierarchy: dish > steps > ingredients > optional stats. Enough negative space to keep design airy and readable. Soft natural studio lighting, minimal textured or gradient background. Output: 1080x1080, ultra-crisp, social-feed optimized, no watermarks.`);
                }
            } catch (err) {
                console.error("Upload/Analysis failed:", err);
            } finally {
                setIsAnalyzing(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleBrandImage = async () => {
        if (!generatedImage || !logoImage) return;
        setIsPostProcessing(true);
        try {
            const payload = {
                model: 'gpt-image-2',
                prompt: 'Add the logo from the second image to the top-right corner of the first image. Keep it clean, proportional, and subtle. Preserve all food content and colors exactly.',
                quality,
                size: imageSize,
                userId: currentUserId,
                image: generatedImage,
                secondImage: logoImage,
                format: imageFormat,
                output_compression: imageCompression,
                background: imageBackground,
                folder: 'marketing'
            };
            const resp = await fetch(getApiUrl('/api/generate-image'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await resp.json();
            if (data.url || data.imageUrl) setGeneratedImage(data.url || data.imageUrl);
            else throw new Error(data.error || 'Branding failed');
        } catch (err) {
            alert('Branding failed: ' + err.message);
        } finally {
            setIsPostProcessing(false);
        }
    };

    const handleEditImage = async () => {
        if (!generatedImage || !editInstruction.trim()) return;
        setIsPostProcessing(true);
        try {
            const payload = {
                model: 'gpt-image-2',
                prompt: editInstruction.trim(),
                quality,
                size: imageSize,
                userId: currentUserId,
                image: generatedImage,
                format: imageFormat,
                output_compression: imageCompression,
                background: imageBackground,
                folder: 'marketing'
            };
            const resp = await fetch(getApiUrl('/api/generate-image'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await resp.json();
            if (data.url || data.imageUrl) { setGeneratedImage(data.url || data.imageUrl); setEditInstruction(''); setShowEditBar(false); }
            else throw new Error(data.error || 'Edit failed');
        } catch (err) {
            alert('Edit failed: ' + err.message);
        } finally {
            setIsPostProcessing(false);
        }
    };

    const handleGenerate = async () => {
        if (!selectedTemplate) return;

        const requiredCredits = getRequiredCredits(generateMode === 'image' ? imageEngine : videoEngine);
        const costKey = generateMode === 'image' ? imageEngine : videoEngine;

        if (!canAfford(costKey, requiredCredits)) {
            alert(`Insufficient Shorts! You need ${requiredCredits}⚡, but you only have ${userCredits}⚡.`);
            return;
        }

        setIsGenerating(true);
        setPollMsg('');

        // Deduct credits
        try {
            const spendResult = await spend(costKey, requiredCredits);
            if (!spendResult.success) {
                throw new Error(spendResult.reason || 'Failed to authorize credit deduction.');
            }
        } catch (err) {
            setIsGenerating(false);
            alert(err.message || 'Credit deduction failed.');
            return;
        }

        if (generateMode === 'video') {
            try {
                const isSeed = videoEngine === 'seedance-fast' || videoEngine === 'seedace';
                
                if (isSeed) {
                    // Seedance video generation path
                    const modelParam = videoEngine === 'seedance-fast'
                        ? 'dreamina-seedance-2-0-fast-260128'
                        : 'dreamina-seedance-2-0-260128';

                    const seedanceContentArray = buildSeedanceContentArray(promptText || 'Cinematic product video', [], firstFrame, lastFrame);

                    const resp = await fetch(getApiUrl('/api/seedance/generate'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            engine: videoEngine,
                            model: modelParam,
                            seedanceContentArray,
                            duration: videoDuration,
                            aspectRatio: '9:16', // default aspect
                            resolution: '1080p',
                            userId: currentUserId,
                            generateAudio,
                            folder: 'marketing'
                        })
                    });

                    const json = await resp.json();
                    if (!resp.ok) throw new Error(json.error || 'Seedance task initialization failed.');

                    const taskId = json.requestId;
                    if (!taskId) throw new Error('No task ID returned from backend.');

                    // Poll Seedance
                    await pollSeedanceTask(taskId, promptText || 'Cinematic product video', '9:16', json.engine || videoEngine, 'marketing');
                } else {
                    // Veo video generation path
                    const ai = getAI();

                    // Get active image (firstFrame, reference, or uploaded)
                    const activeImage = firstFrame || referenceImageBase64 || referenceImage || null;
                    if (!activeImage) { 
                        throw new Error('Please upload a First Frame image for video generation.'); 
                    }

                    // Prepare image payload
                    let imagePayload = null;
                    if (activeImage) {
                        let base64 = '';
                        let mimeType = 'image/jpeg';
                        if (activeImage.startsWith('http')) {
                            const res = await fetch(activeImage);
                            const blob = await res.blob();
                            base64 = await new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || '');
                                reader.readAsDataURL(blob);
                            });
                        } else if (activeImage.startsWith('data:')) {
                            base64 = activeImage.split(',')[1];
                            mimeType = activeImage.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
                        }
                        imagePayload = { imageBytes: base64, mimeType };
                    }

                    // Map aspect ratio
                    const aspectMap = {
                        '1536x1024': '16:9',
                        '1024x1536': '9:16',
                        '1024x1024': '9:16', // Veo doesn't support 1:1, use 9:16
                        '1024x1792': '9:16',
                        '1792x1024': '16:9'
                    };

                    let targetModel = videoEngine;
                    if (videoEngine === 'veo3') {
                        targetModel = 'veo-3.1-generate-preview';
                    }

                    const videoRequest = {
                        model: targetModel,
                        prompt: promptText || 'Cinematic product video',
                        config: {
                            numberOfVideos: 1,
                            resolution: '1080p',
                            aspectRatio: aspectMap[imageSize] || '9:16',
                            durationSeconds: videoDuration,
                        }
                    };

                    if (imagePayload) {
                        videoRequest.image = imagePayload;
                    }

                    console.log('[Marketing] Generating video with Veo:', { model: videoRequest.model, hasImage: !!imagePayload });

                    let operation = await ai.models.generateVideos(videoRequest);

                    // Poll for completion
                    let pollCount = 0;
                    while (!operation.done) {
                        setPollMsg(`Veo is rendering... (~${pollCount * 10}s)`);
                        await new Promise(resolve => setTimeout(resolve, 10000));
                        pollCount++;
                        operation = await ai.operations.getVideosOperation({ operation });
                    }

                    const generateVideoResponse = operation.response?.generateVideoResponse;
                    const raiFiltered = generateVideoResponse?.raiMediaFilteredCount || 0;

                    if (raiFiltered > 0) {
                        const reason = generateVideoResponse?.raiMediaFilteredReasons?.[0] || 'Prompt conflicted with safety policies.';
                        throw new Error(`Video blocked by safety filter: ${reason}`);
                    }

                    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
                    if (!downloadLink) throw new Error('No video URL in response');

                    const apiKey = getApiKey();
                    // Play direct Google GenAI streaming URL instantly
                    const directUrl = `${downloadLink}${downloadLink.includes('?') ? '&' : '?'}key=${apiKey}`;

                    setGenerationHistory(prev => {
                        const next = [{ url: directUrl, ts: Date.now(), size: imageSize, type: 'video' }, ...prev].slice(0, 50);
                        try { localStorage.setItem('marketing_generation_history', JSON.stringify(next)); } catch (_) { /* ignore */ }
                        return next;
                    });

                    // Download video and upload to permanent GCS storage in the background asynchronously
                    const runBackgroundArchiving = async () => {
                        try {
                            const bgResponse = await fetch(downloadLink, {
                                method: 'GET',
                                headers: { 'x-goog-api-key': apiKey },
                            });
                            if (!bgResponse.ok) throw new Error(`Background download failed: ${bgResponse.status}`);
                            const blob = await bgResponse.blob();

                            // Convert to base64
                            const reader = new FileReader();
                            const base64 = await new Promise((resolve) => {
                                reader.onloadend = () => resolve(reader.result);
                                reader.readAsDataURL(blob);
                            });

                            // Upload to universal upload-asset
                            const aspectMap = {
                                '1536x1024': '16:9',
                                '1024x1536': '9:16',
                                '1024x1024': '9:16',
                                '1024x1792': '9:16',
                                '1792x1024': '16:9'
                            };
                            const aspect = aspectMap[imageSize] || '9:16';
                            const uploadResp = await fetch(getApiUrl('/api/upload-asset'), {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    data: base64,
                                    type: 'video',
                                    userId: currentUserId,
                                    aspect,
                                    folder: 'marketing'
                                })
                            });
                            if (!uploadResp.ok) throw new Error(`Upload failed: ${uploadResp.statusText}`);
                            const { url: publicUrl } = await uploadResp.json();
                            if (publicUrl) {
                                console.log('[Marketing] Background archiving complete:', publicUrl);
                                setGenerationHistory(prev => {
                                    const next = prev.map(item => item.url === directUrl ? { ...item, url: publicUrl } : item);
                                    try { localStorage.setItem('marketing_generation_history', JSON.stringify(next)); } catch (_) { /* ignore */ }
                                    return next;
                                });
                            }
                        } catch (bgErr) {
                            console.error('[Marketing] Background archiving failed:', bgErr);
                        }
                    };

                    runBackgroundArchiving();
                }
                
                refreshShorts();
            } catch (err) {
                // Refund credits on failure
                await refund(costKey, requiredCredits);
                refreshShorts();
                alert('Video generation failed: ' + (err?.message || 'Unknown error'));
            } finally {
                setIsGenerating(false);
                setPollMsg('');
            }
            return;
        }

        // Image Mode
        try {
            const isMedical = activeCategory === 'medical';
            const isRealEstate = activeCategory === 'realestate';

            // Convert JSON template → clean English prompt if needed
            let templateEnglish = '';
            let userInstruction = '';
            if (promptText && promptText.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(promptText);
                    const ep = parsed?.image_edit_prompt || parsed;
                    
                    // Dynamically map and overwrite aspect_ratio based on active user choice
                    const sizeOpt = getAvailableSizes().find(s => s.value === imageSize);
                    const currentRatio = sizeOpt ? sizeOpt.ratio : 'Auto';
                    if (ep.output_format) {
                        ep.output_format.aspect_ratio = `Match user requested ratio: ${currentRatio}`;
                    } else {
                        ep.output_format = { aspect_ratio: `Match user requested ratio: ${currentRatio}` };
                    }

                    // Extract every meaningful field and write as plain English
                    const parts = [];
                    if (ep.goal) parts.push(ep.goal);
                    if (ep.type) parts.push(`Visual type: ${ep.type}.`);
                    if (ep.drawing_rules) {
                        const dr = ep.drawing_rules;
                        parts.push(`Drawing style: ${dr.line_style || 'thin hand-drawn lines'}, ${dr.stroke_quality || 'loose sketchy strokes'}.`);
                        if (dr.connectors?.length) parts.push(`Use ${dr.connectors.join(', ')} as connectors between annotations.`);
                        if (dr.outline_visible_objects) parts.push(`Outline every visible food object with white ink.`);
                    }
                    if (ep.text_rules) {
                        const tr = ep.text_rules;
                        parts.push(`Add handwritten ${tr.language || 'English'} annotations in ${tr.font_style || 'casual diary'} style with a ${tr.tone || 'cozy emotional'} tone.`);
                        if (tr.examples?.length) parts.push(`Example annotation phrases: "${tr.examples.slice(0,3).join('", "')}".`);
                    }
                    if (ep.comment_generation?.food) parts.push(`For each food element describe: ${ep.comment_generation.food}.`);
                    if (ep.decorations?.elements?.length) parts.push(`Add decorative elements: ${ep.decorations.elements.join(', ')}. Density: ${ep.decorations.density || 'minimal'}.`);
                    if (ep.visual_style) {
                        const vs = ep.visual_style;
                        parts.push(`Overall mood: ${vs.mood || 'lifestyle food journal'}.`);
                        if (vs.inspiration?.length) parts.push(`Inspired by: ${vs.inspiration.join(', ')}.`);
                        if (vs.annotation_color) parts.push(`All annotation ink color: ${vs.annotation_color}.`);
                        if (vs.preserve_original_food_colors) parts.push(`Preserve the original food colors exactly.`);
                    }
                    if (ep.composition) {
                        const c = ep.composition;
                        parts.push(`Layout: ${c.layout || 'dynamic free-flow'}. ${c.visual_hierarchy || ''}. ${c.negative_space || ''}.`);
                    }
                    if (ep.output) parts.push(`No watermarks. High resolution social media optimized output.`);
                    
                    // New detailed format fields
                    if (ep.instruction) parts.push(ep.instruction);
                    if (ep.style) {
                        const s = ep.style;
                        if (s.theme) parts.push(`Theme: ${s.theme}.`);
                        if (s.background) parts.push(`Background: ${s.background}.`);
                        if (s.view) parts.push(`View: ${s.view}.`);
                        if (s.design_style) parts.push(`Design style: ${s.design_style}.`);
                        if (s.lighting) parts.push(`Lighting: ${s.lighting}.`);
                        if (s.graphics) parts.push(`Graphics: ${s.graphics}.`);
                        if (s.typography) parts.push(`Typography: ${s.typography}.`);
                        if (s.negative_space) parts.push(`Negative space: ${s.negative_space}.`);
                    }
                    if (ep.ingredients_section) {
                        const ing = ep.ingredients_section;
                        if (ing.instruction) parts.push(`Ingredients section: ${ing.instruction}`);
                        if (ing.layout) parts.push(`Ingredients layout: ${ing.layout}.`);
                    }
                    if (ep.process_flow) {
                        const pf = ep.process_flow;
                        if (pf.instruction) parts.push(`Process flow steps: ${pf.instruction}`);
                        if (pf.layout) parts.push(`Process flow layout: ${pf.layout} with ${pf.connector_style || 'connectors'}.`);
                    }
                    if (ep.final_presentation) {
                        const fp = ep.final_presentation;
                        if (fp.dish) parts.push(`Hero presentation: ${fp.dish}.`);
                        if (fp.presentation_style) parts.push(`Presentation style: ${fp.presentation_style}.`);
                        if (fp.position) parts.push(`Hero position: ${fp.position}.`);
                        if (fp.shadow) parts.push(`Hero shadow: ${fp.shadow}.`);
                    }
                    if (ep.creative_enhancements) {
                        const active = Object.entries(ep.creative_enhancements)
                            .filter(([_, val]) => val === true)
                            .map(([key]) => key.replace(/_/g, ' '))
                            .join(', ');
                        if (active) parts.push(`Creative enhancements: ${active}.`);
                    }
                    if (ep.output_format) {
                        const of = ep.output_format;
                        if (of.quality) parts.push(`Quality: ${of.quality}.`);
                        if (of.resolution_style) parts.push(`Resolution style: ${of.resolution_style}.`);
                    }

                    templateEnglish = parts.filter(Boolean).join(' ');
                } catch (_) {
                    /* ignore */
                }
            } else {
                userInstruction = promptText?.trim() || '';
            }

            // Build the final image natural language prompt
            let textPrompt = '';
            if (isRealEstate) {
                const re = realEstateData;
                const isCustomPrompt = !!(userInstruction || templateEnglish);
                textPrompt = [
                    userInstruction || templateEnglish || `Create a stunning real estate marketing visual for this property.`,
                    re.property_name ? `Property: ${re.property_name}.` : '',
                    re.property_type ? `Type: ${re.property_type}.` : '',
                    re.location ? `Location: ${re.location}.` : '',
                    re.price ? `Price: ${re.price}.` : '',
                    re.bedrooms ? `${re.bedrooms} BHK.` : '',
                    re.area ? `Area: ${re.area}.` : '',
                    re.features ? `Key features: ${re.features}.` : '',
                    re.tagline ? `Tagline: "${re.tagline}".` : '',
                    re.agent_name ? `Agent: ${re.agent_name}.` : '',
                    !isCustomPrompt
                        ? (referenceImage ? `Use the uploaded property photo as the main visual. Enhance lighting and composition.` : `Show a premium exterior or interior shot of a ${re.property_type || 'modern property'}.`)
                        : (referenceImage && !userInstruction.toLowerCase().includes('photo') && !userInstruction.toLowerCase().includes('image') ? `Use the uploaded property photo as the main visual.` : ''),
                    !isCustomPrompt ? `Luxury real estate aesthetic, golden hour or bright daylight, architectural photography style, photorealistic. No watermarks.` : `Photorealistic, high resolution. No watermarks.`
                ].filter(Boolean).join(' ');
            } else if (isMedical) {
                const isCustomPrompt = !!(userInstruction || templateEnglish);
                textPrompt = [
                    userInstruction || templateEnglish || `Create a professional medical clinic marketing poster.`,
                    medicalData.clinic_name ? `Clinic name: ${medicalData.clinic_name}.` : '',
                    medicalData.doctor_name ? `Doctor: ${medicalData.doctor_name}.` : '',
                    medicalData.specialization ? `Specialization: ${medicalData.specialization}.` : '',
                    medicalData.tagline ? `Tagline: "${medicalData.tagline}".` : '',
                    medicalData.services ? `Services offered: ${medicalData.services}.` : '',
                    !isCustomPrompt ? `Clean, trustworthy, professional healthcare aesthetic. White and teal tones. No watermarks.` : `Photorealistic, high resolution. No watermarks.`
                ].filter(Boolean).join(' ');
            } else if (!isMedical) {
                const isCustomPrompt = !!(userInstruction || templateEnglish);
                const dishDesc = recipeData.dish_name
                    ? `a dish called "${recipeData.dish_name}"`
                    : referenceImage ? 'the food shown in the reference photo' : 'a gourmet food dish';

                const baseInstruction = userInstruction
                    || (templateEnglish
                        ? (referenceImage
                            ? `Take the food from the reference photo (${dishDesc}) and apply this visual treatment: ${templateEnglish}`
                            : `Create an image of ${dishDesc}. ${templateEnglish}`)
                        : (referenceImage
                            ? `Recreate ${dishDesc} as a stunning premium food marketing image with ${selectedStyle} editorial style, soft studio lighting, shallow depth of field.`
                            : `Create a stunning premium food marketing image of ${dishDesc} with ${selectedStyle} editorial style, soft studio lighting, shallow depth of field.`));

                textPrompt = [
                    baseInstruction,
                    referenceImage && !isCustomPrompt ? `Match the dish appearance, plating, colors and ingredients from the reference photo exactly.` : '',
                    specialIngredients.length > 0 ? `Prominently feature: ${specialIngredients.join(', ')}.` : '',
                    `Color palette: ${brandColors[0]} and ${brandColors[1]}.`,
                    `Photorealistic, high resolution, no watermarks, no logos.`
                ].filter(Boolean).join(' ');
            }

            // Use base64 if available, otherwise fall back to URL.
            // Logo: if there's a reference image, logo goes as secondImage for multi-image edit.
            // If there's NO reference image but there IS a logo, use the logo as the primary image
            // so gpt-image-2 can use it in edit mode (incorporating it into the design).
            const imageToSend = referenceImageBase64 || referenceImage || (logoImage ? logoImage : undefined);
            const secondImageToSend = (imageToSend && logoImage && (referenceImageBase64 || referenceImage))
                ? logoImage
                : undefined;
            const payload = {
                model: imageEngine,
                prompt: textPrompt,
                quality,
                size: imageSize,
                userId: currentUserId,
                image: imageToSend,
                secondImage: secondImageToSend,
                folder: 'marketing',
                ...(imageEngine === 'gpt-image-2' ? {
                    format: imageFormat,
                    output_compression: imageCompression,
                    background: imageBackground
                } : {})
            };

            const resp = await fetch(getApiUrl('/api/generate-image'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            let data;
            try { data = await resp.json(); }
            catch { throw new Error(`Server returned non-JSON (status ${resp.status})`); }

            if (!resp.ok) throw new Error(data?.error || data?.message || `Server error ${resp.status}`);

            const newUrl = data.url || data.imageUrl;
            if (!newUrl) throw new Error('No image URL in response: ' + JSON.stringify(data));
            
            setGeneratedImage(newUrl);
            setGenerationHistory(prev => {
                const next = [{ url: newUrl, ts: Date.now(), size: imageSize }, ...prev].slice(0, 50);
                try { localStorage.setItem('marketing_generation_history', JSON.stringify(next)); } catch (_) { /* ignore */ }
                return next;
            });
            
            refreshShorts();
        } catch (error) {
            // Refund credits on failure
            await refund(costKey, requiredCredits);
            refreshShorts();
            console.error('Generation failed:', error?.message || error);
            alert('Generation failed: ' + (error?.message || 'Unknown error — check console'));
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
        {/* Hidden file inputs — at root so pointer-events/stacking context never blocks them */}
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
        <input type="file" ref={logoInputRef} className="hidden" accept="image/*"
            onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = async ev => { const norm = await normalizeImageForOpenAI(ev.target.result); setLogoImage(norm); }; r.readAsDataURL(f); }} />
        <input type="file" ref={firstFrameRef} className="hidden" accept="image/*"
            onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = async ev => { const norm = await normalizeImageForOpenAI(ev.target.result); setFirstFrame(norm); }; r.readAsDataURL(f); }} />
        <input type="file" ref={lastFrameRef} className="hidden" accept="image/*"
            onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = async ev => { const norm = await normalizeImageForOpenAI(ev.target.result); setLastFrame(norm); }; r.readAsDataURL(f); }} />
        <div className="h-full flex flex-col bg-[#0a0a0a] text-white overflow-hidden relative font-sans">
            {/* Header */}
            <div className="flex-none py-2 px-4 border-b border-white/10 flex items-center gap-3 z-10 bg-black/40 backdrop-blur-md">
                <div className="flex items-baseline gap-2 flex-shrink-0">
                    <h1 className="text-base font-black italic uppercase tracking-tighter bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent whitespace-nowrap">
                        Marketing Studio
                    </h1>
                </div>
                <div className="w-px h-5 bg-white/10 flex-shrink-0" />
                {/* Filter Tabs */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap text-[10px] font-black uppercase tracking-wider transition-all flex-shrink-0",
                                activeCategory === cat.id
                                    ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                                    : "text-white/40 hover:text-white/80 hover:bg-white/5 border border-white/10"
                            )}
                        >
                            <cat.icon className={cn("w-2.5 h-2.5", activeCategory === cat.id ? "text-black" : cat.color)} />
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Panel: Categories & Templates */}
                <div className={cn(
                    "border-r border-white/10 flex flex-col bg-black/20 transition-all duration-300 overflow-hidden flex-shrink-0",
                    showTemplatePanel ? "w-1/3 min-w-[280px] max-w-[400px]" : "w-0 min-w-0 border-r-0"
                )}>


                    {/* Image / Video tab switcher */}
                    <div className="flex gap-1 p-2 border-b border-white/8 bg-black/20">
                        <button
                            onClick={() => setTemplateTab('image')}
                            className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
                                templateTab === 'image' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'text-white/30 hover:text-white/60 hover:bg-white/5')}>
                            <ImageIcon className="w-3 h-3" /> Image
                        </button>
                        <button
                            onClick={() => { setTemplateTab('video'); setGenerateMode('video'); }}
                            className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
                                templateTab === 'video' ? 'bg-lime-500/20 text-lime-300 border border-lime-500/30' : 'text-white/30 hover:text-white/60 hover:bg-white/5')}>
                            <Video className="w-3 h-3" /> Video
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {templateTab === 'video' ? (
                            <>
                                {/* Video category chips */}
                                <div className="flex gap-1 flex-wrap mb-3">
                                    {VIDEO_CATEGORIES.map(cat => (
                                        <button key={cat.id} onClick={() => setActiveVideoCategory(cat.id)}
                                            className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all flex-shrink-0',
                                                activeVideoCategory === cat.id ? 'bg-white text-black' : 'text-white/40 hover:text-white/70 border border-white/10 hover:bg-white/5')}>
                                            <cat.icon className={cn('w-2 h-2', activeVideoCategory === cat.id ? 'text-black' : cat.color)} />
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                                {/* Video template grid */}
                                <div className="columns-2 gap-3 space-y-3">
                                    {(VIDEO_TEMPLATES[activeVideoCategory] || []).map(template => (
                                        <motion.div
                                            key={template.id}
                                            whileHover={{ scale: 1.02, y: -4 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleTemplateSelect(template)}
                                            className={cn(
                                                'break-inside-avoid cursor-pointer rounded-xl overflow-hidden border transition-all duration-500 relative group',
                                                selectedTemplate?.id === template.id
                                                    ? 'border-lime-500 shadow-[0_0_20px_rgba(132,204,22,0.2)]'
                                                    : 'border-white/5 hover:border-white/20'
                                            )}
                                        >
                                            <div className={cn('w-full relative', template.aspect === '9/16' ? 'aspect-[9/16]' : template.aspect === '1/1' ? 'aspect-square' : 'aspect-[16/9]')}>
                                                <img src={template.imageUrl} alt={template.name}
                                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                                {selectedTemplate?.id === template.id && (
                                                    <div className="absolute top-2 right-2 bg-lime-500 text-black p-1 rounded-full shadow-xl">
                                                        <Check className="w-2.5 h-2.5" />
                                                    </div>
                                                )}
                                                {/* Video badge */}
                                                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded-md">
                                                    <Video className="w-2.5 h-2.5 text-lime-400" />
                                                    <span className="text-[8px] text-lime-300 font-black uppercase">Video</span>
                                                </div>
                                            </div>
                                            <div className="px-2 py-1.5 bg-black/40">
                                                <p className="text-[10px] font-black text-white/80 truncate">{template.name}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                    {(VIDEO_TEMPLATES[activeVideoCategory] || []).length === 0 && (
                                        <div className="col-span-2 py-10 text-center text-white/20 text-xs">No video templates yet</div>
                                    )}
                                </div>
                            </>
                        ) : (
                        <>
                        {/* Gallery header */}
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Templates Gallery</h3>
                            {isAdmin && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-orange-400 hover:text-orange-300 bg-orange-400/10 hover:bg-orange-400/20 px-2 py-1 rounded-lg transition-all"
                            >
                                <Plus className="w-3 h-3" /> Add
                            </button>
                            )}
                        </div>

                        {/* Search bar */}
                        <div className="relative mb-2">
                            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/25" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                            <input
                                value={gallerySearch}
                                onChange={(e) => setGallerySearch(e.target.value)}
                                placeholder="Search templates..."
                                className="w-full bg-white/5 border border-white/8 rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-white/70 focus:border-white/20 outline-none placeholder:text-white/20 transition-all"
                            />
                            {gallerySearch && (
                                <button onClick={() => setGallerySearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* Tag filter chips */}
                        {allTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                                <button
                                    onClick={() => setActiveTag(null)}
                                    className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full transition-all ${ !activeTag ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60 border border-white/10' }`}
                                >All</button>
                                {allTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                                        className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full transition-all ${ activeTag === tag ? 'bg-orange-500/30 text-orange-300 border border-orange-500/40' : 'text-white/30 hover:text-orange-300/60 border border-white/10' }`}
                                    >#{tag}</button>
                                ))}
                            </div>
                        )}

                        {templatesLoading && (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                            </div>
                        )}
                        <div className="columns-2 gap-3 space-y-3">
                            {filteredTemplates.map(template => (
                                <motion.div
                                    key={template.id}
                                    whileHover={{ scale: 1.02, y: -4 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleTemplateSelect(template)}
                                    className={cn(
                                        "break-inside-avoid cursor-pointer rounded-xl overflow-hidden border transition-all duration-500 relative group",
                                        selectedTemplate?.id === template.id
                                            ? "border-lime-500 shadow-[0_0_20px_rgba(132,204,22,0.2)]"
                                            : "border-white/5 hover:border-white/20"
                                    )}
                                >
                                    <div className={cn(
                                        "w-full relative",
                                        template.aspect === '9/16' ? "aspect-[9/16]" : template.aspect === '1/1' ? "aspect-square" : "aspect-[4/5]"
                                    )}>
                                        <img
                                            src={template.imageUrl}
                                            alt={template.name}
                                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                            onError={(e) => { console.error('[IMG FAIL]', template.name, template.imageUrl?.slice(0, 80)); e.target.style.opacity = '0.3'; }}
                                        />
                                        {selectedTemplate?.id === template.id && (
                                            <div className="absolute top-2 right-2 bg-lime-500 text-black p-1 rounded-full shadow-xl">
                                                <Check className="w-2.5 h-2.5" />
                                            </div>
                                        )}
                                        {/* Expand preview button */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setPreviewTemplateIdx(filteredTemplates.indexOf(template)); }}
                                            className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10 flex items-center gap-1">
                                            <Expand className="w-3 h-3 text-white" />
                                            <span className="text-[9px] text-white font-bold">Expand</span>
                                        </button>

                                        {template.isCustom && isAdmin && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(`Delete "${template.name}"? This cannot be undone.`)) {
                                                        handleDeleteCustom(template.id);
                                                    }
                                                }}
                                                title="Delete template"
                                                className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/70 border border-red-500/40 opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all duration-200 z-10"
                                            >
                                                <Trash2 className="w-3 h-3 text-red-400 group-hover:text-white" />
                                                <span className="text-[9px] font-black uppercase tracking-wider text-red-400 hover:text-white">Delete</span>
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                        </>
                        )}
                    </div>
                </div>

                {/* Right Panel: ChatGPT-style Asset Configuration */}
                <div className="flex-1 flex flex-col bg-[#0f0f11] relative">
                    {/* Toggle button — sticks to left edge */}
                    <button
                        onClick={() => setShowTemplatePanel(v => !v)}
                        title={showTemplatePanel ? 'Hide Templates' : 'Show Templates'}
                        className={cn(
                            "absolute left-0 top-1/2 -translate-y-1/2 z-20 w-5 h-14 rounded-r-lg flex items-center justify-center transition-all group",
                            showTemplatePanel
                                ? "bg-[#111113] border border-[#c8f135]/20 border-l-0 text-[#c8f135]/60 hover:text-[#c8f135] hover:border-[#c8f135]/60 hover:bg-[#c8f135]/5 shadow-[0_0_8px_rgba(200,241,53,0.1)] hover:w-6"
                                : "bg-[#c8f135] border border-[#c8f135] border-l-0 text-black hover:bg-[#d4f545] animate-pulse shadow-[0_0_15px_rgba(200,241,53,0.65)] hover:w-6"
                        )}
                    >
                        <ChevronRight className={cn("w-3.5 h-3.5 transition-transform duration-300", showTemplatePanel ? "text-[#c8f135]/60 group-hover:text-[#c8f135]" : "text-black rotate-180")} />
                    </button>
                    {selectedTemplate ? (
                        <div className="flex-1 flex flex-col h-full overflow-hidden relative">

                            {/* ── UGC-STYLE FIXED GRID ── */}
                            <div className="flex-1 overflow-y-auto bg-[#0a0a0a] custom-scrollbar" style={{paddingBottom:'80px', minHeight:0}}>
                                {isGenerating && generationHistory.length === 0 ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 min-h-[300px]">
                                        <div className="relative w-16 h-16">
                                            <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                                            <div className="absolute inset-0 rounded-full border-4 border-t-[#c8f135] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                                            <Wand2 className="absolute inset-0 m-auto w-6 h-6 text-[#c8f135]" />
                                        </div>
                                        <CyclingLoadingText messages={activeCategory === 'realestate' ? LOADING_MESSAGES_REALESTATE : LOADING_MESSAGES_DEFAULT} />
                                    </div>
                                ) : generationHistory.length > 0 ? (
                                    <div className="p-2 grid gap-2" style={{gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))'}}>
                                        {/* Generating spinner tile */}
                                        {isGenerating && (
                                            <div className="w-full rounded-lg border border-[#c8f135]/20 bg-[#0d0d0d] flex flex-col items-center justify-center gap-2 relative overflow-hidden" 
                                                style={{aspectRatio: (Object.keys(upscalingItems).length > 0 && generationHistory.find(i => upscalingItems[i.url])) ? getAspectRatio(generationHistory.find(i => upscalingItems[i.url])?.size) : getAspectRatio(imageSize)}}>
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" style={{animation:'shimmer 1.8s infinite', transform:'translateX(-100%)'}} />
                                                <div className="relative w-8 h-8">
                                                    <div className="absolute inset-0 rounded-full border-2 border-[#c8f135]/20" />
                                                    <div className="absolute inset-0 rounded-full border-2 border-t-[#c8f135] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                                                    <Wand2 className="absolute inset-0 m-auto w-3.5 h-3.5 text-[#c8f135]" />
                                                </div>
                                                <span className="text-[7px] text-[#c8f135] font-bold uppercase tracking-widest animate-pulse">Generating…</span>
                                            </div>
                                        )}
                                        {generationHistory.map((item, idx) => (
                                            <motion.div key={item.ts}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ duration: 0.3 }}
                                                className="relative group rounded-lg overflow-hidden cursor-pointer w-full"
                                                style={{ aspectRatio: getAspectRatio(item.size) }}
                                                onClick={() => openZoom(item.url)}
                                            >
                                                {item.type === 'video'
                                                    ? <div className="w-full h-full relative bg-black/60 flex items-center justify-center">
                                                        <video src={item.url} className="w-full h-full object-cover" preload="metadata" playsInline muted />
                                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity duration-200">
                                                            <div className="w-10 h-10 rounded-full bg-black/70 border border-white/30 flex items-center justify-center shadow-lg">
                                                                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                                                            </div>
                                                        </div>
                                                        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded-md pointer-events-none">
                                                            <Video className="w-2.5 h-2.5 text-[#c8f135]" />
                                                            <span className="text-[7px] text-[#c8f135] font-black uppercase">Video</span>
                                                        </div>
                                                      </div>
                                                    : <div className="w-full h-full relative bg-black/60 overflow-hidden">
                                                        <img src={item.url} alt={`gen-${idx}`} className="w-full h-full object-cover" />
                                                      </div>
                                                }
                                                {/* NEW badge */}
                                                {idx === 0 && (
                                                    <span className="absolute top-1.5 left-1.5 text-[7px] bg-[#c8f135] text-black font-black px-1 py-0.5 rounded uppercase tracking-wider z-10">New</span>
                                                )}
                                                {/* Hover overlay */}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-10">
                                                    <div className="flex gap-1.5">
                                                        {item.type === 'video' && (
                                                            <button title="Play" onClick={e => { e.stopPropagation(); openZoom(item.url); }}
                                                                className="w-9 h-9 flex items-center justify-center bg-[#c8f135] hover:bg-[#b0d62a] text-black rounded-xl transition-all shadow-lg hover:scale-105 active:scale-95">
                                                                <Play className="w-3.5 h-3.5 fill-black" />
                                                            </button>
                                                        )}
                                                        <button title="Zoom" onClick={e => { e.stopPropagation(); openZoom(item.url); }}
                                                            className="w-9 h-9 flex items-center justify-center bg-black/80 hover:bg-white/25 rounded-xl text-white border border-white/20 transition-all shadow-lg">
                                                            <ZoomIn className="w-4 h-4" />
                                                        </button>
                                                        <button title="Download" onClick={e => { e.stopPropagation(); downloadAsset(item.url, item.type || 'image'); }}
                                                            className="w-9 h-9 flex items-center justify-center bg-black/80 hover:bg-white/25 rounded-xl text-white border border-white/20 transition-all shadow-lg">
                                                            <span className="text-sm font-black">↓</span>
                                                        </button>
                                                    </div>
                                                    {item.type !== 'video' && (
                                                        <div className="flex gap-1.5">
                                                            <button title="Edit" onClick={e => { e.stopPropagation(); setGeneratedImage(item.url); setInpaintOpen(true); }}
                                                                className="w-9 h-9 flex items-center justify-center bg-purple-600/90 hover:bg-purple-500 rounded-xl text-white border border-purple-400/40 transition-all shadow-lg">
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <button title="Set as First Frame" onClick={e => { e.stopPropagation(); setFirstFrame(item.url); }}
                                                                className="w-9 h-9 flex items-center justify-center bg-blue-600/80 hover:bg-blue-500 rounded-xl text-white text-[9px] font-black border border-blue-400/40 transition-all shadow-lg">
                                                                FF
                                                            </button>
                                                            <button title="Set as Last Frame" onClick={e => { e.stopPropagation(); setLastFrame(item.url); }}
                                                                className="w-9 h-9 flex items-center justify-center bg-indigo-600/80 hover:bg-indigo-500 rounded-xl text-white text-[9px] font-black border border-indigo-400/40 transition-all shadow-lg">
                                                                LF
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 select-none min-h-[300px]">
                                        <div className="w-14 h-14 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center">
                                            <ImageIcon className="w-7 h-7 text-white/15" />
                                        </div>
                                        <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Generated assets appear here</p>
                                        <p className="text-[8px] text-white/10 font-mono">{selectedTemplate?.name} · hit Generate to start</p>
                                    </div>
                                )}
                            </div>

                            {/* ── BOTTOM: HigsFields-style floating input bar ── */}
                            <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center pb-4 pt-10 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none">
                            <div className="pointer-events-auto w-full max-w-4xl px-4">

                                {/* Real Estate property details panel (collapsible, above bar) */}
                                {activeCategory === 'realestate' && (
                                    <div className="mb-2 bg-[#1a1a1e]/95 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl" style={{marginLeft:'calc(2.5rem + 8px)'}}>
                                        <button onClick={() => setShowPropertyDetails(p => !p)}
                                            className="w-full px-3 py-1.5 flex items-center justify-between text-[9px] font-black text-blue-400/60 uppercase tracking-widest hover:text-blue-300/80 transition-colors">
                                            <span className="flex items-center gap-1"><Building className="w-3 h-3" /> Property Details</span>
                                            <ChevronRight className={cn("w-3 h-3 transition-transform", showPropertyDetails ? "rotate-90" : "")} />
                                        </button>
                                        {showPropertyDetails && <div className="px-3 pb-3 grid grid-cols-2 gap-2 border-t border-white/8 pt-2">
                                            <input value={realEstateData.property_name} onChange={e => setRealEstateData(p => ({...p, property_name: e.target.value}))}
                                                placeholder="Property name" className="col-span-2 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-blue-400/40" />
                                            <select value={realEstateData.property_type} onChange={e => setRealEstateData(p => ({...p, property_type: e.target.value}))}
                                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/60 outline-none focus:border-blue-400/40">
                                                <option value="apartment">Apartment</option>
                                                <option value="villa">Villa</option>
                                                <option value="plot">Plot / Land</option>
                                                <option value="commercial">Commercial</option>
                                                <option value="penthouse">Penthouse</option>
                                                <option value="bungalow">Bungalow</option>
                                            </select>
                                            <input value={realEstateData.location} onChange={e => setRealEstateData(p => ({...p, location: e.target.value}))}
                                                placeholder="Location / Area" className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-blue-400/40" />
                                            <input value={realEstateData.price} onChange={e => setRealEstateData(p => ({...p, price: e.target.value}))}
                                                placeholder="Price (e.g. ₹45L)" className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-blue-400/40" />
                                            <input value={realEstateData.bedrooms} onChange={e => setRealEstateData(p => ({...p, bedrooms: e.target.value}))}
                                                placeholder="BHK (e.g. 3)" className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-blue-400/40" />
                                            <input value={realEstateData.area} onChange={e => setRealEstateData(p => ({...p, area: e.target.value}))}
                                                placeholder="Area (e.g. 1200 sqft)" className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-blue-400/40" />
                                            <input value={realEstateData.features} onChange={e => setRealEstateData(p => ({...p, features: e.target.value}))}
                                                placeholder="Features (pool, gym…)" className="col-span-2 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-blue-400/40" />
                                            <input value={realEstateData.tagline} onChange={e => setRealEstateData(p => ({...p, tagline: e.target.value}))}
                                                placeholder='Tagline' className="col-span-2 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-blue-400/40" />
                                            <input value={realEstateData.agent_name} onChange={e => setRealEstateData(p => ({...p, agent_name: e.target.value}))}
                                                placeholder="Agent / Developer name" className="col-span-2 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-blue-400/40" />
                                        </div>}
                                    </div>
                                )}

                                {/* ── Bottom row: tabs LEFT + input pill RIGHT ── */}
                                <div className="flex items-stretch gap-2">
                                    {/* Image / Video vertical tabs on left — full height of pill */}
                                    <div className="flex-none flex flex-col rounded-xl border border-white/10 overflow-hidden">
                                        <button onClick={() => setGenerateMode('image')}
                                            className={cn("flex-1 flex flex-col items-center justify-center gap-0.5 px-2.5 text-[9px] font-black transition-all",
                                                generateMode === 'image' ? "bg-white text-black" : "bg-[#1c1c21]/95 text-white/40 hover:text-white/70 hover:bg-white/10")}>
                                            <ImageIcon className="w-3.5 h-3.5" />
                                            Image
                                        </button>
                                        <button onClick={() => setGenerateMode('video')}
                                            className={cn("flex-1 flex flex-col items-center justify-center gap-0.5 px-2.5 text-[9px] font-black transition-all border-t border-white/10",
                                                generateMode === 'video' ? "bg-pink-500 text-white" : "bg-[#1c1c21]/95 text-white/40 hover:text-white/70 hover:bg-white/10")}>
                                            <Video className="w-3.5 h-3.5" />
                                            Video
                                        </button>
                                    </div>

                                {/* ── Main bar ── */}
                                <div className="flex-1 bg-[#1c1c21]/95 backdrop-blur-xl border border-white/12 rounded-2xl shadow-2xl overflow-hidden">

                                    {/* First / Last frame uploads — video mode only */}
                                    {generateMode === 'video' && (
                                        <div className="flex items-center gap-2 px-3 pt-2.5">
                                            {/* First frame */}
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[7px] text-white/30 font-black uppercase tracking-widest">First</span>
                                                <button onClick={() => firstFrameRef.current?.click()}
                                                    className={cn("w-10 h-10 rounded-lg border-2 border-dashed flex items-center justify-center transition-all overflow-hidden",
                                                        firstFrame ? "border-blue-400/60" : "border-white/15 hover:border-white/30")}>
                                                    {firstFrame
                                                        ? <img src={resolveUrl(firstFrame)} className="w-full h-full object-cover rounded" alt="first" />
                                                        : <span className="text-white/25 text-lg font-black">+</span>}
                                                </button>
                                            </div>
                                            {/* Last frame */}
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[7px] text-white/30 font-black uppercase tracking-widest">Last</span>
                                                <button onClick={() => lastFrameRef.current?.click()}
                                                    className={cn("w-10 h-10 rounded-lg border-2 border-dashed flex items-center justify-center transition-all overflow-hidden",
                                                        lastFrame ? "border-blue-400/60" : "border-white/15 hover:border-white/30")}>
                                                    {lastFrame
                                                        ? <img src={resolveUrl(lastFrame)} className="w-full h-full object-cover rounded" alt="last" />
                                                        : <span className="text-white/25 text-lg font-black">+</span>}
                                                </button>
                                            </div>
                                            <div className="flex flex-col justify-end pb-1">
                                                <span className="text-[8px] text-white/20">Upload start &amp; end frames</span>
                                                <span className="text-[7px] text-blue-400/50">Veo 3 interpolation</span>
                                            </div>
                                        </div>
                                    )}
                                    {/* Uploaded thumbnails row (only when images present) */}
                                    {(referenceImage || logoImage) && (
                                        <div className="flex items-center gap-2 px-3 pt-2.5">
                                            {referenceImage && (
                                                <div className="relative group w-9 h-9 rounded-lg overflow-hidden border border-lime-500/40 flex-shrink-0">
                                                    <img src={resolveUrl(referenceImage)} className="w-full h-full object-cover" alt="ref" />
                                                    <button onClick={() => { setReferenceImage(null); setReferenceImageMeta(null); setReferenceImageBase64(null); }}
                                                        className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <X className="w-3 h-3 text-white" />
                                                    </button>
                                                </div>
                                            )}
                                            {logoImage && (
                                                <div className="relative group w-9 h-9 rounded-lg overflow-hidden border border-orange-500/40 bg-white/5 flex-shrink-0">
                                                    <img src={logoImage} className="w-full h-full object-contain p-0.5" alt="logo" />
                                                    <button onClick={() => setLogoImage(null)}
                                                        className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <X className="w-3 h-3 text-white" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Textarea */}
                                    <textarea
                                        value={promptText}
                                        onChange={e => setPromptText(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !isGenerating) { e.preventDefault(); handleGenerate(); } }}
                                        placeholder={activeCategory === 'realestate' ? "Describe the property visual… (Shift+Enter for new line)" : referenceImage ? "Add extra instructions… or just hit Generate" : "Describe what you want to create… (Shift+Enter for new line)"}
                                        rows={2}
                                        className="w-full bg-transparent text-sm text-white/80 placeholder:text-white/25 outline-none resize-none px-4 pt-3 pb-1 leading-relaxed"
                                    />

                                    {/* Bottom toolbar row */}
                                    <div className="flex items-center gap-1.5 px-3 pb-2.5 pt-1">
                                        {/* Upload photo */}
                                        <button onClick={() => fileInputRef.current?.click()}
                                            className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
                                                referenceImage ? "text-lime-400 bg-lime-500/10 border border-lime-500/30" : "text-white/30 hover:text-white/60 hover:bg-white/5 border border-transparent")}>
                                            <Upload className="w-3 h-3" />
                                            {referenceImage ? 'Photo ✓' : 'Photo'}
                                        </button>

                                        {/* Size */}
                                         <UpwardDropdown
                                             icon={<LayoutGrid size={8} />}
                                             label={`Size: ${getAvailableSizes().find(s => s.value === imageSize)?.label || 'Auto'}`}
                                             accentColor="fuchsia"
                                         >
                                             {(close) => (
                                                 <div className="space-y-0.5">
                                                     {getAvailableSizes().map((opt, i) => (
                                                         <motion.button
                                                             key={opt.value}
                                                             initial={{ opacity: 0, y: 8 }}
                                                             animate={{ opacity: 1, y: 0 }}
                                                             transition={{ delay: i * 0.04, type: 'spring', stiffness: 350, damping: 22 }}
                                                             onClick={() => { setImageSize(opt.value); close(); }}
                                                             className={cn(
                                                                 "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all",
                                                                 imageSize === opt.value
                                                                     ? "bg-fuchsia-500/10 border border-fuchsia-500/25"
                                                                     : "border border-transparent hover:bg-white/[0.04] hover:border-white/5"
                                                             )}
                                                         >
                                                             {/* Aspect visual */}
                                                             <div className={cn(
                                                                 "rounded border flex items-center justify-center shrink-0 transition-all",
                                                                 imageSize === opt.value ? "border-fuchsia-500 bg-fuchsia-500/10" : "border-gray-700 bg-white/5"
                                                             )}
                                                                 style={{ width: `${opt.w * 1.5}px`, height: `${opt.h * 1.5}px` }}
                                                             >
                                                                 <span className={cn(
                                                                     "text-[5px] font-black scale-90",
                                                                     imageSize === opt.value ? "text-fuchsia-400" : "text-gray-500"
                                                                 )}>{opt.ratio}</span>
                                                             </div>
                                                             <div className="flex-1 min-w-0">
                                                                 <p className={cn(
                                                                     "text-[10px] font-black uppercase tracking-wider truncate",
                                                                     imageSize === opt.value ? "text-fuchsia-400" : "text-white/70"
                                                                 )}>{opt.label}</p>
                                                                 <p className="text-[7.5px] text-gray-600 truncate">{opt.desc}</p>
                                                             </div>
                                                             {imageSize === opt.value && (
                                                                 <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full bg-fuchsia-400 flex items-center justify-center shrink-0">
                                                                     <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                                 </motion.div>
                                                             )}
                                                         </motion.button>
                                                     ))}
                                                 </div>
                                             )}
                                         </UpwardDropdown>

                                         {/* Quality (only in image mode) */}
                                         {generateMode === 'image' && (
                                             <UpwardDropdown
                                                 icon={<Sparkles size={8} />}
                                                 label={`Quality: ${QUALITY_OPTIONS.find(q => q.value === quality)?.label || 'HD'}`}
                                                 accentColor="violet"
                                             >
                                                 {(close) => (
                                                     <div className="space-y-0.5">
                                                         {QUALITY_OPTIONS.map((opt, i) => (
                                                             <motion.button
                                                                 key={opt.value}
                                                                 initial={{ opacity: 0, y: 8 }}
                                                                 animate={{ opacity: 1, y: 0 }}
                                                                 transition={{ delay: i * 0.04, type: 'spring', stiffness: 350, damping: 22 }}
                                                                 onClick={() => { setQuality(opt.value); close(); }}
                                                                 className={cn(
                                                                     "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all",
                                                                     quality === opt.value
                                                                         ? "bg-violet-500/10 border border-violet-500/25"
                                                                         : "border border-transparent hover:bg-white/[0.04] hover:border-white/5"
                                                                 )}
                                                             >
                                                                 <div className={cn(
                                                                     "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] shrink-0 transition-all",
                                                                     quality === opt.value ? "bg-violet-500/20 text-violet-400" : "bg-white/5 text-gray-500"
                                                                 )}>
                                                                     <Sparkles size={10} />
                                                                 </div>
                                                                 <div className="flex-1 min-w-0">
                                                                     <p className={cn(
                                                                         "text-[10px] font-black uppercase tracking-wider truncate",
                                                                         quality === opt.value ? "text-violet-400" : "text-white/70"
                                                                     )}>{opt.label}</p>
                                                                     <p className="text-[7.5px] text-gray-600 truncate">
                                                                         {opt.desc} {imageEngine === 'gpt-image-2' && `· ₹${getGenerateCostINR(opt.value, imageSize)}`}
                                                                     </p>
                                                                 </div>
                                                                 {quality === opt.value && (
                                                                     <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full bg-violet-400 flex items-center justify-center shrink-0">
                                                                         <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                                     </motion.div>
                                                                 )}
                                                             </motion.button>
                                                         ))}
                                                     </div>
                                                 )}
                                             </UpwardDropdown>
                                         )}

                                          {/* GPT-2 Custom Output Settings (only when imageEngine === 'gpt-image-2' in image mode) */}
                                          {generateMode === 'image' && imageEngine === 'gpt-image-2' && (
                                              <UpwardDropdown
                                                  icon={<Sliders size={8} />}
                                                  label={`Output: ${imageFormat.toUpperCase()} (${imageBackground === 'auto' ? 'Auto BG' : 'Opaque BG'})`}
                                                  accentColor="cyan"
                                              >
                                                  {(close) => (
                                                      <div className="space-y-4 p-2 text-white">
                                                          <div>
                                                              <h4 className="text-[10px] font-black text-white/50 uppercase tracking-wider mb-2">GPT-2 Output Settings</h4>
                                                          </div>
                                                          
                                                          {/* Format Selection */}
                                                          <div className="space-y-1.5">
                                                              <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Format</label>
                                                              <div className="grid grid-cols-3 gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
                                                                  {['png', 'jpeg', 'webp'].map(fmt => (
                                                                      <button
                                                                          key={fmt}
                                                                          type="button"
                                                                          onClick={() => setImageFormat(fmt)}
                                                                          className={cn("py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all",
                                                                              imageFormat === fmt ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/10" : "text-white/40 hover:text-white/80")}
                                                                      >
                                                                          {fmt}
                                                                      </button>
                                                                  ))}
                                                              </div>
                                                          </div>

                                                          {/* Background Selection */}
                                                          <div className="space-y-1.5">
                                                              <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Background</label>
                                                              <div className="grid grid-cols-2 gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
                                                                  {['auto', 'opaque'].map(bg => (
                                                                      <button
                                                                          key={bg}
                                                                          type="button"
                                                                          onClick={() => setImageBackground(bg)}
                                                                          className={cn("py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all",
                                                                              imageBackground === bg ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/10" : "text-white/40 hover:text-white/80")}
                                                                      >
                                                                          {bg}
                                                                      </button>
                                                                  ))}
                                                              </div>
                                                          </div>

                                                          {/* Compression Selection (only if jpeg or webp) */}
                                                          {(imageFormat === 'jpeg' || imageFormat === 'webp') && (
                                                              <div className="space-y-1.5">
                                                                  <div className="flex justify-between items-baseline">
                                                                      <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Compression</label>
                                                                      <span className="text-[9px] font-bold text-cyan-400">{imageCompression}%</span>
                                                                  </div>
                                                                  <input
                                                                      type="range"
                                                                      min="0"
                                                                      max="100"
                                                                      value={imageCompression}
                                                                      onChange={e => setImageCompression(Number(e.target.value))}
                                                                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500 outline-none"
                                                                  />
                                                              </div>
                                                          )}

                                                          {/* Close Button */}
                                                          <button
                                                              type="button"
                                                              onClick={close}
                                                              className="w-full py-1.5 mt-2 text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all text-white/60 hover:text-white"
                                                          >
                                                              Done
                                                          </button>
                                                      </div>
                                                  )}
                                              </UpwardDropdown>
                                          )}

                                         {/* Engine */}
                                         <UpwardDropdown
                                             icon={<Zap size={8} />}
                                             label={generateMode === 'image' 
                                                 ? `Engine: ${IMAGE_ENGINES.find(e => e.id === imageEngine)?.label || 'GPT Pro'}`
                                                 : `Engine: ${ENGINES.find(e => e.id === videoEngine)?.label || 'Veo Fast'}`}
                                             accentColor="lime"
                                         >
                                             {(close) => (
                                                 <div className="space-y-0.5">
                                                     {generateMode === 'image' ? (
                                                         IMAGE_ENGINES.map((eng, i) => (
                                                             <motion.button
                                                                 key={eng.id}
                                                                 initial={{ opacity: 0, x: -10 }}
                                                                 animate={{ opacity: 1, x: 0 }}
                                                                 transition={{ delay: i * 0.03, type: 'spring', stiffness: 400, damping: 25 }}
                                                                 onClick={() => { setImageEngine(eng.id); close(); }}
                                                                 className={cn(
                                                                     "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all",
                                                                     imageEngine === eng.id
                                                                         ? "bg-lime-500/10 border border-lime-500/25"
                                                                         : "border border-transparent hover:bg-white/[0.04] hover:border-white/5"
                                                                 )}
                                                             >
                                                                 <div className={cn(
                                                                     "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] shrink-0 transition-all",
                                                                     imageEngine === eng.id ? "bg-lime-500/20 text-[#c8f135]" : "bg-white/5 text-gray-500"
                                                                 )}>
                                                                     <span className="text-[10px]">{eng.icon}</span>
                                                                 </div>
                                                                 <div className="flex-1 min-w-0">
                                                                     <p className={cn(
                                                                         "text-[10px] font-black uppercase tracking-wider truncate",
                                                                         imageEngine === eng.id ? "text-[#c8f135]" : "text-white/70"
                                                                     )}>{eng.label}</p>
                                                                     <p className="text-[7.5px] text-gray-600 truncate">{eng.desc}</p>
                                                                 </div>
                                                                 <div className="flex items-center gap-1.5 shrink-0">
                                                                     <span className={cn(
                                                                         "text-[7px] font-black px-1.5 py-0.5 rounded-md border",
                                                                         imageEngine === eng.id
                                                                             ? "bg-[#c8f135]/10 border-[#c8f135]/20 text-[#c8f135]"
                                                                             : "bg-white/5 border-white/5 text-gray-600"
                                                                     )}>
                                                                         {getRequiredCredits(eng.id)} ⚡
                                                                     </span>
                                                                     {imageEngine === eng.id && (
                                                                         <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full bg-[#c8f135] flex items-center justify-center shrink-0">
                                                                             <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                                         </motion.div>
                                                                     )}
                                                                 </div>
                                                             </motion.button>
                                                         ))
                                                     ) : (
                                                         ENGINES.map((eng, i) => (
                                                             <motion.button
                                                                 key={eng.id}
                                                                 initial={{ opacity: 0, x: -10 }}
                                                                 animate={{ opacity: 1, x: 0 }}
                                                                 transition={{ delay: i * 0.03, type: 'spring', stiffness: 400, damping: 25 }}
                                                                 onClick={() => { setVideoEngine(eng.id); close(); }}
                                                                 className={cn(
                                                                     "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all",
                                                                     videoEngine === eng.id
                                                                         ? "bg-lime-500/10 border border-lime-500/25"
                                                                         : "border border-transparent hover:bg-white/[0.04] hover:border-white/5"
                                                                 )}
                                                             >
                                                                 <div className={cn(
                                                                     "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] shrink-0 transition-all",
                                                                     videoEngine === eng.id ? "bg-lime-500/20 text-[#c8f135]" : "bg-white/5 text-gray-500"
                                                                 )}>
                                                                     <span className="text-[10px]">{eng.icon}</span>
                                                                 </div>
                                                                 <div className="flex-1 min-w-0">
                                                                     <p className={cn(
                                                                         "text-[10px] font-black uppercase tracking-wider truncate",
                                                                         videoEngine === eng.id ? "text-[#c8f135]" : "text-white/70"
                                                                     )}>{eng.label}</p>
                                                                     <p className="text-[7.5px] text-gray-600 truncate">{eng.desc}</p>
                                                                 </div>
                                                                 <div className="flex items-center gap-1.5 shrink-0">
                                                                     <span className={cn(
                                                                         "text-[7px] font-black px-1.5 py-0.5 rounded-md border",
                                                                         videoEngine === eng.id
                                                                             ? "bg-[#c8f135]/10 border-[#c8f135]/20 text-[#c8f135]"
                                                                             : "bg-white/5 border-white/5 text-gray-600"
                                                                     )}>
                                                                         {getRequiredCredits(eng.id)} ⚡
                                                                     </span>
                                                                     {videoEngine === eng.id && (
                                                                         <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full bg-[#c8f135] flex items-center justify-center shrink-0">
                                                                             <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                                         </motion.div>
                                                                     )}
                                                                 </div>
                                                             </motion.button>
                                                         ))
                                                     )}
                                                 </div>
                                             )}
                                         </UpwardDropdown>

                                         {/* Duration/Time (only in video mode) */}
                                         {generateMode === 'video' && (
                                             <UpwardDropdown
                                                 icon={<Clock size={8} />}
                                                 label={`Time: ${videoDuration}s`}
                                                 accentColor="cyan"
                                             >
                                                 {(close) => {
                                                     const isSeed = videoEngine === 'seedance-fast' || videoEngine === 'seedace';
                                                     const isVeo3 = videoEngine.startsWith('veo-3.1') || videoEngine === 'veo3';
                                                     const opts = isVeo3 
                                                         ? VEO_DURATION_OPTIONS 
                                                         : isSeed 
                                                             ? SEEDANCE_DURATION_OPTIONS 
                                                             : DURATION_OPTIONS;
                                                     const maxOptValue = Math.max(...opts.map(o => o.value));
                                                     
                                                     return (
                                                         <div className="space-y-0.5">
                                                             {opts.map((opt, i) => (
                                                                 <motion.button
                                                                     key={opt.value}
                                                                     initial={{ opacity: 0, y: 8 }}
                                                                     animate={{ opacity: 1, y: 0 }}
                                                                     transition={{ delay: i * 0.04, type: 'spring', stiffness: 350, damping: 22 }}
                                                                     onClick={() => { setVideoDuration(opt.value); close(); }}
                                                                     className={cn(
                                                                         "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                                                                         videoDuration === opt.value
                                                                             ? "bg-cyan-500/10 border border-cyan-500/25"
                                                                             : "border border-transparent hover:bg-white/[0.04] hover:border-white/5"
                                                                     )}
                                                                 >
                                                                     {/* Duration bar visual */}
                                                                     <div className="w-10 h-2 bg-white/5 rounded-full overflow-hidden shrink-0">
                                                                         <motion.div
                                                                             className="h-full rounded-full"
                                                                             style={{ background: videoDuration === opt.value ? '#22d3ee' : '#333' }}
                                                                             initial={{ width: 0 }}
                                                                             animate={{ width: `${(opt.value / maxOptValue) * 100}%` }}
                                                                             transition={{ type: 'spring', stiffness: 200, damping: 20, delay: i * 0.05 }}
                                                                         />
                                                                     </div>
                                                                     <div className="flex-1 min-w-0">
                                                                         <p className={cn(
                                                                             "text-[10px] font-black uppercase tracking-wider truncate",
                                                                             videoDuration === opt.value ? "text-cyan-400" : "text-white/70"
                                                                         )}>{opt.label}</p>
                                                                         <p className="text-[7.5px] text-gray-600 truncate">{opt.desc}</p>
                                                                     </div>
                                                                     <div className="flex items-center gap-1.5 shrink-0">
                                                                         <span className={cn(
                                                                             "text-[7px] font-black px-1.5 py-0.5 rounded-md border",
                                                                             videoDuration === opt.value
                                                                                 ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                                                                                 : "bg-white/5 border-white/5 text-gray-600"
                                                                         )}>
                                                                             {getRequiredCredits(videoEngine, opt.value)} ⚡
                                                                         </span>
                                                                         {videoDuration === opt.value && (
                                                                             <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center shrink-0">
                                                                                 <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                                             </motion.div>
                                                                         )}
                                                                     </div>
                                                                 </motion.button>
                                                             ))}
                                                         </div>
                                                     );
                                                 }}
                                             </UpwardDropdown>
                                         )}

                                         {/* Audio toggle (only in video mode) */}
                                         {generateMode === 'video' && (
                                             <motion.button
                                                 type="button"
                                                 whileHover={{ scale: 1.05 }}
                                                 whileTap={{ scale: 0.95 }}
                                                 onClick={() => setGenerateAudio(!generateAudio)}
                                                 className={cn(
                                                     "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest border transition-colors shrink-0",
                                                     generateAudio
                                                         ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                                                         : "bg-black/60 border-white/10 text-gray-500 hover:text-white"
                                                 )}
                                             >
                                                 <span>🎵 Audio: {generateAudio ? "ON" : "OFF"}</span>
                                             </motion.button>
                                         )}

                                        {/* Generate */}
                                        <button onClick={handleGenerate} disabled={isGenerating}
                                            className={cn(
                                                "ml-auto flex items-center gap-2 px-4 py-1.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                                                isGenerating ? "bg-white/5 text-white/30 cursor-not-allowed" : "bg-gradient-to-r from-lime-400 to-emerald-500 text-black hover:scale-105 shadow-[0_0_16px_rgba(132,204,22,0.3)]"
                                            )}>
                                            {isGenerating
                                                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                                                : <>{generateMode === 'video' ? <Video className="w-3.5 h-3.5" /> : <Wand2 className="w-3.5 h-3.5" />}
                                                   {generateMode === 'video' ? 'Make Video' : 'Generate'}
                                                   <span className="opacity-40 ml-1">|</span>
                                                   <span className="font-mono text-[9px] ml-1">{getRequiredCredits(generateMode === 'image' ? imageEngine : videoEngine)}⚡</span>
                                                </>
                                            }
                                        </button>
                                    </div>
                                </div>{/* end main bar */}
                                </div>{/* end bottom row */}
                            </div>{/* end pointer-events-auto */}
                            </div>{/* end floating gradient wrapper */}

                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-white/30 h-full p-8 text-center">
                            <Wand2 className="w-20 h-20 mb-6 opacity-20" />
                            <h2 className="text-2xl font-black uppercase tracking-widest mb-2">Select a Template</h2>
                            <p className="max-w-md text-sm">Choose a base template from the left panel to begin crafting your high-converting marketing asset.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Zoom Lightbox */}
        <AnimatePresence>
            {zoomedImage && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
                    onClick={closeZoom}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') closeZoom();
                        if (e.key === 'ArrowRight' && zoomedIndex !== null) {
                            const next = (zoomedIndex + 1) % allTemplates.length;
                            openZoom(allTemplates[next].imageUrl, next);
                        }
                        if (e.key === 'ArrowLeft' && zoomedIndex !== null) {
                            const prev = (zoomedIndex - 1 + allTemplates.length) % allTemplates.length;
                            openZoom(allTemplates[prev].imageUrl, prev);
                        }
                    }}
                    tabIndex={0}
                    ref={el => el && el.focus()}
                >
                    <motion.div
                        initial={{ scale: 0.85, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.85, y: 20 }}
                        className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Left Arrow */}
                        {zoomedIndex !== null && allTemplates.length > 1 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); const prev = (zoomedIndex - 1 + allTemplates.length) % allTemplates.length; openZoom(allTemplates[prev].imageUrl, prev); }}
                                className="absolute left-[-56px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 flex items-center justify-center transition-all hover:scale-110 z-10"
                            >
                                <ChevronRight className="w-5 h-5 text-white rotate-180" />
                            </button>
                        )}

                        {generationHistory.find(i => i.url === zoomedImage)?.type === 'video'
                            ? <video
                                key={zoomedImage}
                                src={zoomedImage}
                                controls
                                autoPlay
                                playsInline
                                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl border border-white/10 bg-black"
                              />
                            : <img
                                key={zoomedImage}
                                src={zoomedImage}
                                alt="Zoomed Asset"
                                className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/10"
                              />
                        }

                        {/* Right Arrow */}
                        {zoomedIndex !== null && allTemplates.length > 1 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); const next = (zoomedIndex + 1) % allTemplates.length; openZoom(allTemplates[next].imageUrl, next); }}
                                className="absolute right-[-56px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 flex items-center justify-center transition-all hover:scale-110 z-10"
                            >
                                <ChevronRight className="w-5 h-5 text-white" />
                            </button>
                        )}

                        <button
                            onClick={closeZoom}
                            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 hover:bg-red-500/80 flex items-center justify-center transition-colors border border-white/10"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>

                        {zoomedIndex !== null && (
                            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-[10px] text-white/40 font-bold uppercase tracking-widest">
                                {zoomedIndex + 1} / {allTemplates.length}
                            </div>
                        )}

                        {/* Action bar at bottom of lightbox */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
                            {generationHistory.find(i => i.url === zoomedImage)?.type !== 'video' && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setGeneratedImage(zoomedImage); setInpaintOpen(true); closeZoom(); }}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600/90 hover:bg-purple-500 rounded-xl text-[11px] font-black text-white border border-purple-400/40 transition-all shadow-xl shadow-purple-900/30 whitespace-nowrap"
                                >
                                    <Pencil className="w-3 h-3" /> Edit
                                </button>
                                <button
                                    disabled={!!upscalingItems[zoomedImage]}
                                    onClick={(e) => {
                                        const item = generationHistory.find(i => i.url === zoomedImage) || { url: zoomedImage, size: '1024x1024' };
                                        handleUpscale(item, '2K', e);
                                    }}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600/90 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-[11px] font-black text-white border border-blue-400/40 transition-all shadow-xl shadow-blue-900/30 whitespace-nowrap"
                                >
                                    {upscalingItems[zoomedImage] === '2K' ? (
                                        <>
                                            <Loader2 className="w-3 h-3 animate-spin" /> 2K…
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-3 h-3 fill-amber-400/20 text-amber-400" /> 2K (2⚡)
                                        </>
                                    )}
                                </button>
                                <button
                                    disabled={!!upscalingItems[zoomedImage]}
                                    onClick={(e) => {
                                        const item = generationHistory.find(i => i.url === zoomedImage) || { url: zoomedImage, size: '1024x1024' };
                                        handleUpscale(item, '4K', e);
                                    }}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600/90 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-[11px] font-black text-white border border-indigo-400/40 transition-all shadow-xl shadow-indigo-900/30 whitespace-nowrap"
                                >
                                    {upscalingItems[zoomedImage] === '4K' ? (
                                        <>
                                            <Loader2 className="w-3 h-3 animate-spin" /> 4K…
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-3 h-3 fill-amber-400/20 text-amber-400" /> 4K (5⚡)
                                        </>
                                    )}
                                </button>
                            </>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); const isVid = zoomedImage?.startsWith('blob:') || generationHistory.find(i => i.url === zoomedImage)?.type === 'video'; downloadAsset(zoomedImage, isVid ? 'video' : 'image'); }}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-black/70 hover:bg-white/10 rounded-xl text-[11px] font-black text-white/80 border border-white/15 transition-all whitespace-nowrap"
                            >
                                ↓ Save
                            </button>
                            <a
                                href={zoomedImage}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-black/70 hover:bg-white/10 rounded-xl text-[11px] font-black text-white/80 border border-white/15 transition-all whitespace-nowrap"
                            >
                                <ExternalLink className="w-3 h-3" /> Open
                            </a>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Template Preview Lightbox */}
        <AnimatePresence>
            {previewTemplateIdx !== null && filteredTemplates[previewTemplateIdx] && (() => {
                const tpl = filteredTemplates[previewTemplateIdx];
                const total = filteredTemplates.length;
                const goPrev = () => setPreviewTemplateIdx((previewTemplateIdx - 1 + total) % total);
                const goNext = () => setPreviewTemplateIdx((previewTemplateIdx + 1) % total);
                return (
                    <motion.div key="tpl-preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/92 backdrop-blur-md"
                        onClick={() => setPreviewTemplateIdx(null)}
                        onKeyDown={e => { if (e.key === 'Escape') setPreviewTemplateIdx(null); if (e.key === 'ArrowRight') goNext(); if (e.key === 'ArrowLeft') goPrev(); }}
                        tabIndex={0} ref={el => el && el.focus()}>
                            {/* Fixed Left arrow */}
                        {total > 1 && <button onClick={e => { e.stopPropagation(); goPrev(); }}
                            className="fixed left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 flex items-center justify-center transition-all hover:scale-110 z-[120]">
                            <ChevronLeft className="w-6 h-6 text-white" />
                        </button>}
                        {/* Fixed Right arrow */}
                        {total > 1 && <button onClick={e => { e.stopPropagation(); goNext(); }}
                            className="fixed right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 flex items-center justify-center transition-all hover:scale-110 z-[120]">
                            <ChevronRight className="w-6 h-6 text-white" />
                        </button>}
                        {/* Fixed Close */}
                        <button onClick={() => setPreviewTemplateIdx(null)}
                            className="fixed top-5 right-5 w-10 h-10 rounded-full bg-black/70 hover:bg-red-500/80 flex items-center justify-center border border-white/10 transition-colors z-[120]">
                            <X className="w-5 h-5 text-white" />
                        </button>
                        <motion.div initial={{ scale: 0.88, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 24 }}
                            className="flex flex-col items-center gap-4"
                            onClick={e => e.stopPropagation()}>
                            {/* Image */}
                            <img src={tpl.imageUrl} alt={tpl.name}
                                className="max-h-[75vh] max-w-[75vw] rounded-2xl object-contain shadow-2xl border border-white/10" />
                            {/* Name + counter + select */}
                            <div className="flex items-center gap-4">
                                <span className="text-white/60 text-xs font-bold uppercase tracking-widest">{tpl.name}</span>
                                <span className="text-white/25 text-[10px]">{previewTemplateIdx + 1} / {total}</span>
                                <button onClick={() => { handleTemplateSelect(tpl); setPreviewTemplateIdx(null); }}
                                    className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-lime-400 to-emerald-500 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-all">
                                    <Check className="w-3 h-3" /> Use Template
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                );
            })()}
        </AnimatePresence>

        {/* Brush Inpaint Editor */}
        {inpaintOpen && generatedImage && (
            <InpaintEditor
                imageUrl={generatedImage}
                userId={currentUserId}
                onClose={() => setInpaintOpen(false)}
                onDone={(newUrl) => {
                    setGeneratedImage(newUrl);
                    setGenerationHistory(prev => {
                        const next = [{ url: newUrl, ts: Date.now() }, ...prev].slice(0, 50);
                        try { localStorage.setItem('marketing_generation_history', JSON.stringify(next)); } catch (_) { /* ignore */ }
                        return next;
                    });
                    setInpaintOpen(false);
                }}
            />
        )}

        {/* Add Template Modal */}
        {showAddModal && (
            <AddTemplateModal
                category={CATEGORIES.find(c => c.id === activeCategory)?.label || activeCategory}
                userId={currentUserId}
                userEmail={userProfile?.email}
                onClose={() => setShowAddModal(false)}
                onSave={handleAddTemplate}
            />
        )}
        </>
    );
}
