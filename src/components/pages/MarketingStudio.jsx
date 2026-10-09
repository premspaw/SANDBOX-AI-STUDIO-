import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Upload, Wand2, Code, X, Building, Utensils, Stethoscope, Briefcase, ChevronRight, ChevronLeft, Loader2, Play, Plus, Check, Link, Trash2, ZoomIn, ExternalLink, HardDrive, Pencil, Layers, Sparkles, Video, Expand, LayoutGrid, ChevronUp, ChevronDown, Clock, Zap, Sliders } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../../lib/utils';
import { useShorts } from '../../hooks/useShorts';
import { useAppStore, inferStudioFolder } from '../../store';
import { InpaintEditor } from '../common/InpaintEditor';
import { getApiUrl, resolveUrl } from '../../config/apiConfig';
import { buildSeedanceContentArray } from '../cinemaStudio/SeedanceEngine';
import { AddTemplateModal } from './AddTemplateModal';

const ENGINES = [
  { id: 'omni-flash',                    label: 'Omni Flash 1.1',  icon: '✨', desc: 'Google Gemini Omni Flash 1.1 — Multimodal Camera & Voice (5⚡/s)', cost: 5 },
  { id: 'seedance-2.5',                  label: 'Seedance 2.5',    icon: '⚡', desc: 'ByteDance — 8⚡/s (480p) / 10⚡/s (720p)', cost: 10 },
  { id: 'seedance-fast',                 label: 'Seedance Fast',   icon: '🚀', desc: 'ByteDance — 5⚡/s (480p/720p)', cost: 5 },
  { id: 'seedace',                       label: 'Seedance 2.0',    icon: '🎯', desc: 'ByteDance — 15⚡/s (720p) / 35⚡/s (1080p)', cost: 15 },
];

const IMAGE_ENGINES = [
  { id: 'gpt-image-2.5-sunburst', label: 'GPT 2.5 Sunburst', icon: '☀️', desc: 'OpenAI 2.5 — Editing precision & highest quality — 2.5⚡', cost: 2.5 },
  { id: 'gpt-image-2.5-flare',    label: 'GPT 2.5 Flare',    icon: '✨', desc: 'OpenAI 2.5 — Ultra-fast everyday image gen — 1.5⚡',       cost: 1.5 },
  { id: 'nano-banana-2',          label: 'Nano Banana 2',    icon: '🎨', desc: 'Google highest-fidelity photo gen — 1⚡ flat rate',          cost: 1 },
  { id: 'nano-banana-pro',        label: 'Nano Banana Pro',  icon: '💎', desc: 'Google maximum fidelity image engine — 3⚡ flat rate',       cost: 3 },
  { id: 'gpt-image-2',            label: 'GPT Image Pro',    icon: '🤖', desc: 'OpenAI layout & text design — 2⚡ flat rate',                 cost: 2 },
];

const MARKETING_CAMPAIGN_TYPES = [
  {
    id: 'carousel',
    label: 'Instagram Carousel (Viral)',
    icon: '🎠',
    badge: 'Viral Hook',
    desc: 'Trending Instagram carousel slide, hooks viewers, high conversion & saves',
    systemPrompt: 'Think like you are a biggest carousel, trending Instagram carousel maker, and which goes viral. Create a high-converting, visually arresting, scroll-stopping Instagram carousel slide designed to drive viral engagement, high saves, and shares. Ensure clean negative space for typography, modern editorial layout, dynamic visual hierarchy, and stunning commercial aesthetics.',
  },
  {
    id: 'offer',
    label: 'Special Offer / Flash Promo',
    icon: '🏷️',
    badge: 'High Conversion',
    desc: 'High-converting discount, promotional sale, seasonal offer campaign',
    systemPrompt: 'Think like an elite commercial advertising director. Create a high-converting promotional offer marketing visual for a special promotional sale or discount. Include bold commercial visual impact, clear focal space for discount text and call-to-action badges, vibrant promotional energy, and premium brand aesthetics.',
  },
  {
    id: 'product',
    label: 'Hero Product Showcase',
    icon: '📦',
    badge: 'Studio Commercial',
    desc: 'Commercial product photography with premium lighting and studio background',
    systemPrompt: 'Think like a master commercial product photographer and brand advertising specialist. Showcase this product as a hero commercial subject with luxury studio lighting, crisp textures, elegant reflections, volumetric depth, and billboard-grade commercial aesthetics.',
  },
  {
    id: 'brand_story',
    label: 'Brand Story / Social Ad',
    icon: '🚀',
    badge: 'Lifestyle Branding',
    desc: 'Engaging brand lifestyle visual for social feeds and digital ads',
    systemPrompt: 'Think like a creative brand strategist and viral social media marketer. Produce an aspirational, authentic brand lifestyle visual that tells a powerful story, evokes emotion, and positions the brand as premium and culturally relevant.',
  },
  {
    id: 'custom',
    label: 'General Marketing Visual',
    icon: '✨',
    badge: 'Universal',
    desc: 'Standard commercial visual based strictly on your prompt description',
    systemPrompt: 'Think like a professional commercial marketing designer. Create a high-impact, professional advertising visual with refined composition, high contrast, balanced color harmony, and commercial marketing aesthetics.',
  },
];

const DURATION_OPTIONS = [
  { value: 5,  label: '5 Seconds',  desc: 'Quick burst — ideal for ads' },
  { value: 8,  label: '8 Seconds',  desc: 'Standard — cinematic shots' },
  { value: 10, label: '10 Seconds', desc: 'Extended — full scenes' },
  { value: 15, label: '15 Seconds', desc: 'Extended scene — maximum duration' },
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

const OMNI_DURATION_OPTIONS = [
  { value: 4,  label: '4 Seconds',  desc: 'Quick cut — fast-paced narrative' },
  { value: 6,  label: '6 Seconds',  desc: 'Standard — balanced movement' },
  { value: 10, label: '10 Seconds', desc: 'Long sequence — extended motion' },
  { value: 15, label: '15 Seconds', desc: 'Maximum duration — full cinematic action' },
];

const SIZE_OPTIONS = [
  { value: '1024x1024', label: '1:1 Square (Feed)',    desc: '1:1 social post & carousel', ratio: '1:1' },
  { value: '1024x1792', label: '9:16 Story / Reel',     desc: '9:16 vertical video & story', ratio: '9:16' },
  { value: '1792x1024', label: '16:9 Landscape', desc: '16:9 widescreen & website', ratio: '16:9' },
];


const QUALITY_OPTIONS = [
  { value: 'low',    label: 'Fast', desc: 'Quick rendering, standard quality' },
  { value: 'medium', label: 'HD',   desc: 'High definition details' },
  { value: 'high',   label: 'Max',  desc: 'Maximum quality, premium finish' },
];

function DropUpSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  accentColor = "lime",
  className = "",
  minMenuWidth = 220,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ bottom: '0px', left: '0px', width: 'auto', maxHeight: '280px' });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // Normalize options to a standard shape
  const normalizedOptions = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.id !== undefined ? opt.id : opt.value,
        label: opt.label !== undefined ? opt.label : (opt.name !== undefined ? opt.name : String(opt.id || opt.value)),
        icon: opt.icon || null,
        badge: opt.badge || null,
        cost: opt.cost !== undefined ? opt.cost : null,
        desc: opt.desc || null,
      };
    }
    return {
      value: opt,
      label: String(opt),
      icon: null,
      badge: null,
      cost: null,
      desc: null,
    };
  });

  const selected = normalizedOptions.find(o => o.value === value) || normalizedOptions[0];

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = Math.max(minMenuWidth, rect.width);
    const finalWidth = Math.min(menuWidth, window.innerWidth - 20);
    
    let left = rect.left;
    if (left + finalWidth > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - finalWidth - 10);
    }
    if (left < 10) left = 10;

    const availableHeight = rect.top - 16;
    const maxHeight = Math.max(140, Math.min(300, availableHeight));

    setPos({
      bottom: `${Math.max(10, window.innerHeight - rect.top + 6)}px`,
      left: `${left}px`,
      width: `${finalWidth}px`,
      maxHeight: `${maxHeight}px`,
    });
  };

  const toggleDropdown = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(prev => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const colorStyles = {
    lime: {
      activeBorder: 'border-lime-400/60',
      activeText: 'text-lime-400',
      activeBg: 'bg-lime-400/10',
      badge: 'bg-lime-400/15 text-lime-400 border-lime-400/30',
      ring: 'shadow-lime-400/10',
      check: 'text-lime-400',
    },
    fuchsia: {
      activeBorder: 'border-fuchsia-500/60',
      activeText: 'text-fuchsia-400',
      activeBg: 'bg-fuchsia-500/10',
      badge: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
      ring: 'shadow-fuchsia-500/10',
      check: 'text-fuchsia-400',
    },
    pink: {
      activeBorder: 'border-pink-500/60',
      activeText: 'text-pink-400',
      activeBg: 'bg-pink-500/10',
      badge: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
      ring: 'shadow-pink-500/10',
      check: 'text-pink-400',
    },
    cyan: {
      activeBorder: 'border-cyan-400/60',
      activeText: 'text-cyan-400',
      activeBg: 'bg-cyan-400/10',
      badge: 'bg-cyan-400/15 text-cyan-400 border-cyan-400/30',
      ring: 'shadow-cyan-400/10',
      check: 'text-cyan-400',
    },
    blue: {
      activeBorder: 'border-blue-500/60',
      activeText: 'text-blue-400',
      activeBg: 'bg-blue-500/10',
      badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      ring: 'shadow-blue-500/10',
      check: 'text-blue-400',
    },
  };
  const theme = colorStyles[accentColor] || colorStyles.lime;

  return (
    <div className={cn("relative w-full", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleDropdown}
        className={cn(
          "w-full bg-[#141419] border rounded-xl px-2.5 py-2 text-xs font-bold transition-all flex items-center justify-between gap-1.5 cursor-pointer text-left select-none",
          isOpen ? `${theme.activeBorder} ${theme.activeBg} text-white shadow-lg` : "border-white/15 hover:border-white/30 text-white/90"
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
          {selected?.icon && <span className="text-xs shrink-0">{selected.icon}</span>}
          <span className="truncate text-xs font-bold">{selected?.label || placeholder}</span>
          {selected?.badge && (
            <span className={cn("text-[7.5px] font-black px-1.5 py-0.5 rounded border uppercase shrink-0", theme.badge)}>
              {selected.badge}
            </span>
          )}
          {selected?.cost !== undefined && selected?.cost !== null && (
            <span className="text-[8.5px] font-mono px-1 py-0.2 rounded bg-white/5 border border-white/10 text-white/70 shrink-0">
              ⚡{selected.cost}
            </span>
          )}
        </div>
        <ChevronDown
          size={14}
          className={cn(
            "text-white/40 transition-transform duration-200 shrink-0",
            isOpen ? "rotate-180 text-white" : ""
          )}
        />
      </button>

      {isOpen && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              bottom: pos.bottom,
              left: pos.left,
              width: pos.width,
            }}
            className={cn(
              "z-[9999] bg-[#0c0c10]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10 p-1.5 animate-in fade-in zoom-in-95 duration-150",
              theme.ring
            )}
          >
            <div
              style={{ maxHeight: pos.maxHeight }}
              className="overflow-y-auto custom-scrollbar space-y-1"
            >
              {normalizedOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer group",
                      isSelected
                        ? `${theme.activeBg} ${theme.activeText} font-bold border border-white/10`
                        : "hover:bg-white/[0.06] text-white/75 hover:text-white"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {opt.icon && <span className="text-sm shrink-0">{opt.icon}</span>}
                        <span className="text-xs truncate">{opt.label}</span>
                        {opt.badge && (
                          <span className={cn("text-[7.5px] font-black px-1.5 py-0.5 rounded border uppercase shrink-0", theme.badge)}>
                            {opt.badge}
                          </span>
                        )}
                        {opt.cost !== undefined && opt.cost !== null && (
                          <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-white/5 border border-white/10 text-white/60 shrink-0">
                            ⚡{opt.cost}
                          </span>
                        )}
                      </div>
                      {opt.desc && (
                        <p className="text-[8px] text-white/35 font-mono truncate mt-0.5 pl-0.5">
                          {opt.desc}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <Check size={13} className={cn("shrink-0", theme.check)} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
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
    // Per-user localStorage key so admin-generated images never bleed into other users' galleries
    const mktLSKey = currentUserId ? `marketing_generation_history_${currentUserId}` : null;
    const userShorts = useAppStore(state => state.userShorts);
    const userCredits = userShorts ?? 0;
    const isAdmin = userProfile?.email === 'premspaw@gmail.com';
    const [activeCategory, setActiveCategory] = useState('food');
    const [templateTab, setTemplateTab] = useState('image'); // 'image' | 'video'
    const [activeVideoCategory, setActiveVideoCategory] = useState('product');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [referenceImages, setReferenceImages] = useState([]); // Array of { id, url, base64, meta }
    const [logoImage, setLogoImage] = useState(null);
    const [isPostProcessing, setIsPostProcessing] = useState(false);
    const [editInstruction, setEditInstruction] = useState('');
    const [showEditBar, setShowEditBar] = useState(false);
    const [showSidePanel, setShowSidePanel] = useState(false);
    const [panelTab, setPanelTab] = useState('veo');
    const [generateMode, setGenerateMode] = useState('image');
    const [imageEngine, setImageEngine] = useState('gpt-image-2');
    const [videoEngine, setVideoEngine] = useState('veo-3.1-fast-generate-preview');
    const [videoDuration, setVideoDuration] = useState(8);
    const [generateAudio, setGenerateAudio] = useState(false);
    const [omniTask, setOmniTask] = useState('auto');
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
    const [marketingCampaignType, setMarketingCampaignType] = useState('carousel');
    const [showGeneratorPanel, setShowGeneratorPanel] = useState(true);
    const [showTemplatePanel, setShowTemplatePanel] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1280 : false);
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
    // Reset omniTask to auto if firstFrame is cleared
    useEffect(() => {
        if (omniTask === 'image_to_video' && !firstFrame) {
            setOmniTask('auto');
        }
    }, [firstFrame, omniTask]);

    // Meta details are now stored inline within the referenceImages array elements
    const [generationHistory, setGenerationHistory] = useState(() => {
        // Start empty for unidentified users — prevents loading admin's cached images.
        if (!currentUserId) return [];
        try {
            const saved = localStorage.getItem(`marketing_generation_history_${currentUserId}`);
            const parsed = saved ? JSON.parse(saved) : [];
            return (Array.isArray(parsed) ? parsed : []).filter(item => inferStudioFolder(item) === 'marketing');
        } catch { return []; }
    });

    // Hydrate and sync marketing assets from unified gallery so server-persisted marketing assets show
    useEffect(() => {
        if (!currentUserId) return;
        const unified = useAppStore.getState().unifiedGallery || [];
        const mktItems = unified.filter(item => inferStudioFolder(item) === 'marketing');
        if (mktItems.length > 0) {
            setGenerationHistory(prev => {
                const existingUrls = new Set(prev.map(i => i.url));
                const missing = mktItems.filter(m => !existingUrls.has(m.url));
                if (missing.length === 0) return prev;
                const combined = [...prev, ...missing].sort((a, b) => (b.ts || b.timestamp || 0) - (a.ts || a.timestamp || 0));
                return combined.slice(0, 50);
            });
        }
    }, [currentUserId]);
    const [gallerySearch, setGallerySearch] = useState('');
    const [activeTag, setActiveTag] = useState(null);
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

    const { spend, refund, canAfford, refresh: refreshShorts } = useShorts();

    const getApiKey = () => {
        if (userProfile?.role === 'admin' || userProfile?.email === 'premspaw@gmail.com') {
            return localStorage.getItem('GOOGLE_API_KEY') || window.aistudio?.apiKey || import.meta.env.VITE_GOOGLE_API_KEY || '';
        }
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
                        const newAsset = { url, ts: Date.now(), size: imageSize, aspect: activeRatio, type: 'video', folder: 'marketing', prompt: activePrompt };
                        useAppStore.getState().addUnifiedAsset(newAsset);
                        setGenerationHistory(prev => {
                            const next = [newAsset, ...prev.filter(x => x.url !== url)].slice(0, 50);
                            try { if (mktLSKey) localStorage.setItem(mktLSKey, JSON.stringify(next)); } catch (_) { /* ignore */ }
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
                if (quality === 'low') return 1;
                if (quality === 'high') return 5;
                return 3; // default medium (HD)
            }
            return IMAGE_ENGINES.find(e => e.id === engineId)?.cost || 1;
        }
        if (engineId === 'omni-flash') {
            const costPerSec = generateAudio ? 8 : 6; // halved from 15 : 12
            return Math.ceil(costPerSec * 1.1 * duration);
        }
        if (engineId.startsWith('veo-3.1') || engineId === 'veo3') {
            let costPerSec = 5;
            const modelId = engineId === 'veo3' ? 'veo-3.1-generate-preview' : engineId;
            if (modelId === 'veo-3.1-generate-preview') {
                costPerSec = generateAudio ? 27 : 15; // halved from 54 : 30
            } else if (modelId === 'veo-3.1-fast-generate-preview') {
                costPerSec = generateAudio ? 8 : 6; // halved from 15 : 12
            } else if (modelId === 'veo-3.1-lite-generate-preview') {
                costPerSec = generateAudio ? 5 : 3; // halved from 10 : 6
            }
            return costPerSec * duration;
        }
        if (engineId === 'seedance-fast') {
            return 6 * duration; // halved from 12
        }
        if (engineId === 'seedace' || engineId === 'seedance2') {
            return 8 * duration; // halved from 16
        }
        return (ENGINES.find(e => e.id === engineId)?.cost || 4) * duration;
    };

    useEffect(() => {
        const isOmni = videoEngine === 'omni' || videoEngine === 'omni-flash' || videoEngine === 'omni-flash-1.1' || videoEngine === 'gemini-omni-1.1-flash' || videoEngine === 'gemini-omni-1.1-flash-preview';
        const isSeed = videoEngine === 'seedance-fast' || videoEngine === 'seedace';
        const isVeo3 = videoEngine.startsWith('veo-3.1');
        
        if (isOmni) {
            if (![4, 6, 10].includes(videoDuration)) {
                if (videoDuration < 5) setVideoDuration(4);
                else if (videoDuration < 8) setVideoDuration(6);
                else setVideoDuration(10);
            }
        } else if (isVeo3) {
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
            const validValues = ['1024x1024', '2048x1152', '2160x3840'];
            if (!validValues.includes(imageSize)) {
                setImageSize('1024x1024');
            }
        }
    }, [imageEngine, generateMode, imageSize]);

    const getAvailableSizes = () => {
        if (generateMode === 'image' && imageEngine === 'gpt-image-2') {
            return [
                { value: '1024x1024', label: '1:1 Square (Feed)',    desc: '1:1 social post & carousel', ratio: '1:1' },
                { value: '2048x1152', label: '16:9 Landscape', desc: '16:9 widescreen & web', ratio: '16:9' },
                { value: '2160x3840', label: '9:16 Story / Reel',     desc: '9:16 vertical video & story', ratio: '9:16' }
            ];
        }
        return SIZE_OPTIONS;
    };

    const activeDurationOptions = (() => {
        const isOmni = videoEngine === 'omni' || videoEngine === 'omni-flash' || videoEngine === 'omni-flash-1.1' || videoEngine === 'gemini-omni-1.1-flash' || videoEngine === 'gemini-omni-1.1-flash-preview';
        const isSeed = videoEngine === 'seedance-fast' || videoEngine === 'seedace' || videoEngine === 'seedance-2.5';
        const isVeo3 = videoEngine.startsWith('veo-3.1');
        if (isOmni) return OMNI_DURATION_OPTIONS;
        if (isVeo3) return VEO_DURATION_OPTIONS;
        if (isSeed) return [
            { value: 5, label: '5 Seconds', desc: 'Quick cut — fast social hook' },
            { value: 10, label: '10 Seconds', desc: 'Standard narrative flow' },
            { value: 15, label: '15 Seconds', desc: 'Maximum full commercial' },
        ];
        return DURATION_OPTIONS;
    })();
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
                const finalAspect = aspect || getGeminiAspectRatio(item.size);
                const newItem = {
                    url: data.url,
                    ts: Date.now(),
                    size: targetRes === '4K' ? '3840x2160' : '2048x1152',
                    aspect: finalAspect,
                    type: 'image',
                    folder: 'marketing',
                    prompt: prompt,
                    engine: `Gemini (${targetRes})`
                };
                useAppStore.getState().addUnifiedAsset(newItem);

                // Add the new upscaled image to the top of the history
                setGenerationHistory(prev => {
                    const next = [newItem, ...prev.filter(x => x.url !== data.url)].slice(0, 50);
                    try { if (mktLSKey) localStorage.setItem(mktLSKey, JSON.stringify(next)); } catch (_) { /* ignore */ }
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
        // On mobile, automatically close the template panel and reveal generator
        if (window.innerWidth < 768) {
            setShowTemplatePanel(false);
            setShowGeneratorPanel(true);
        }
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
                    referenceImage: referenceImages[0]?.url || null
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
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const remaining = 9 - referenceImages.length;
        if (remaining <= 0) {
            alert("You can upload a maximum of 9 reference images.");
            return;
        }
        const filesToUpload = files.slice(0, remaining);

        filesToUpload.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const rawBase64 = event.target.result;
                const base64 = await normalizeImageForOpenAI(rawBase64);

                const tempId = Math.random().toString();
                const newImg = { id: tempId, url: base64, base64 };
                setReferenceImages(prev => [...prev, newImg]);

                // Run analysis/default prompt only for the first image
                const isFirstImage = index === 0 && referenceImages.length === 0;

                if (selectedTemplate && isFirstImage && activeCategory !== 'realestate' && activeCategory !== 'medical') {
                    setPromptText(`Ultra-clean modern recipe infographic. Showcase the attached food image in a visually appealing finished form—sliced, plated, or portioned—floating slightly in perspective or angled view. Arrange ingredients, steps, and tips around the dish in a dynamic editorial layout, not restricted to top-down. Ingredients Section: Include icons or mini illustrations for each ingredient with quantities. Arrange them in clusters, lists, or circular flows connected visually to the dish. Steps Section: Show preparation steps with numbered panels, arrows, or lines, forming a logical flow around the main dish. Include small cooking icons (knife, pan, oven, timer) where helpful. Additional Info: Total calories, prep/cook time, servings, spice level—displayed as clean bubbles or badges near the dish. Visual Style: Editorial infographic meets lifestyle food photography. Vibrant, natural food colors, subtle drop shadows, clean vector icons, modern typography, soft gradients for step panels. Composition: Finished meal as hero visual in perspective or angled view. Ingredients and steps flow dynamically around the dish. Clear visual hierarchy: dish > steps > ingredients > optional stats. Enough negative space to keep design airy and readable. Soft natural studio lighting, minimal textured or gradient background. Output: 1080x1080, ultra-crisp, social-feed optimized, no watermarks.`);
                }

                setIsAnalyzing(true);
                try {
                    const [uploadResp, analyzeResp] = isFirstImage
                        ? await Promise.all([
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
                          ])
                        : await Promise.all([
                            fetch(getApiUrl('/api/marketing/upload-reference'), {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ image: base64, userId: currentUserId })
                            })
                          ]);

                    const uploadData = await uploadResp.json();
                    if (uploadData.url) {
                        setReferenceImages(prev => prev.map(item =>
                            item.id === tempId
                                ? { ...item, url: uploadData.url, meta: { url: uploadData.url, bucket: uploadData.bucket, storage: uploadData.storage } }
                                : item
                        ));
                    }

                    if (isFirstImage && analyzeResp) {
                        const analyzeData = await analyzeResp.json();
                        if (analyzeData.dish_name) {
                            setRecipeData(analyzeData);
                        }
                    }
                } catch (err) {
                    console.error("Upload/Analysis failed:", err);
                } finally {
                    setIsAnalyzing(false);
                }
            };
            reader.readAsDataURL(file);
        });
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
        if (!selectedTemplate && !promptText.trim() && referenceImages.length === 0) {
            alert('Please select a template, upload an image, or enter a prompt first.');
            return;
        }

        const requiredCredits = getRequiredCredits(generateMode === 'image' ? imageEngine : videoEngine);
        const costKey = generateMode === 'image' ? imageEngine : videoEngine;

        if (!canAfford(costKey, requiredCredits)) {
            alert(`Insufficient Shorts! You need ${requiredCredits}⚡, but you only have ${userCredits}⚡. Redirecting to Pricing...`);
            useAppStore.getState().setActiveTab('pricing');
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
                const isOmni = videoEngine === 'omni' || videoEngine === 'omni-flash' || videoEngine === 'omni-flash-1.1' || videoEngine === 'gemini-omni-1.1-flash' || videoEngine === 'gemini-omni-1.1-flash-preview';
                const isSeed = videoEngine === 'seedance-fast' || videoEngine === 'seedace';
                
                if (isOmni) {
                    setPollMsg('Gemini Omni rendering video...');
                    const aspectMap = {
                        '1536x1024': '16:9',
                        '1024x1536': '9:16',
                        '1024x1024': '16:9',
                        '1024x1792': '9:16',
                        '1792x1024': '16:9'
                    };
                    const targetModel = 'gemini-omni-1.1-flash';

                    // Convert staged reference images to expected structure
                    const ref_images = referenceImages.map(img => ({
                        url: img.url || img.base64
                    }));

                    const _headers = { 'Content-Type': 'application/json' };
                    const customKey = getApiKey();
                    if (customKey) _headers['x-admin-trial-key'] = customKey;

                    const resp = await fetch(getApiUrl('/api/omni-i2v'), {
                        method: 'POST',
                        headers: _headers,
                        body: JSON.stringify({
                            image: firstFrame || referenceImages[0]?.url || referenceImages[0]?.base64 || undefined,
                            firstFrameImage: firstFrame || undefined,
                            lastFrameImage: lastFrame || undefined,
                            imageEnd: lastFrame || undefined,
                            motionPrompt: promptText || 'Cinematic product video',
                            duration: videoDuration,
                            aspectRatio: aspectMap[imageSize] || '9:16',
                            resolution: '1080p',
                            model: targetModel,
                            ref_images,
                            userId: currentUserId,
                            generateAudio,
                            task: omniTask,
                            creditReason: 'marketing_video_generation'
                        })
                    });

                    const data = await resp.json();
                    const aspect = aspectMap[imageSize] || '9:16';
                    const newAsset = { url: data.videoUrl, ts: Date.now(), size: imageSize, aspect, type: 'video', folder: 'marketing', prompt: promptText };
                    useAppStore.getState().addUnifiedAsset(newAsset);

                    setGenerationHistory(prev => {
                        const next = [newAsset, ...prev.filter(x => x.url !== data.videoUrl)].slice(0, 50);
                        try { if (mktLSKey) localStorage.setItem(mktLSKey, JSON.stringify(next)); } catch (_) { /* ignore */ }
                        return next;
                    });
                } else if (isSeed) {
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
                    const activeImage = firstFrame || referenceImages[0]?.base64 || referenceImages[0]?.url || null;
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

                    const aspect = aspectMap[imageSize] || '9:16';
                    const veoAsset = { url: directUrl, ts: Date.now(), size: imageSize, aspect, type: 'video', folder: 'marketing', prompt: promptText };
                    useAppStore.getState().addUnifiedAsset(veoAsset);

                    setGenerationHistory(prev => {
                        const next = [veoAsset, ...prev.filter(x => x.url !== directUrl)].slice(0, 50);
                        try { if (mktLSKey) localStorage.setItem(mktLSKey, JSON.stringify(next)); } catch (_) { /* ignore */ }
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
                                const archivedAsset = { url: publicUrl, ts: Date.now(), size: imageSize, aspect, type: 'video', folder: 'marketing', prompt: promptText };
                                useAppStore.getState().addUnifiedAsset(archivedAsset);
                                setGenerationHistory(prev => {
                                    const next = prev.map(item => item.url === directUrl ? { ...item, url: publicUrl } : item);
                                    try { if (mktLSKey) localStorage.setItem(mktLSKey, JSON.stringify(next)); } catch (_) { /* ignore */ }
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
                        ? (referenceImages.length > 0 ? `Use the uploaded property photos as the main visual. Enhance lighting and composition.` : `Show a premium exterior or interior shot of a ${re.property_type || 'modern property'}.`)
                        : (referenceImages.length > 0 && !userInstruction.toLowerCase().includes('photo') && !userInstruction.toLowerCase().includes('image') ? `Use the uploaded property photos as the main visual.` : ''),
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
                    : referenceImages.length > 0 ? 'the food shown in the reference photos' : 'a gourmet food dish';

                const baseInstruction = userInstruction
                    || (templateEnglish
                        ? (referenceImages.length > 0
                            ? `Take the food from the reference photos (${dishDesc}) and apply this visual treatment: ${templateEnglish}`
                            : `Create an image of ${dishDesc}. ${templateEnglish}`)
                        : (referenceImages.length > 0
                            ? `Recreate ${dishDesc} as a stunning premium food marketing image with ${selectedStyle} editorial style, soft studio lighting, shallow depth of field.`
                            : `Create a stunning premium food marketing image of ${dishDesc} with ${selectedStyle} editorial style, soft studio lighting, shallow depth of field.`));

                textPrompt = [
                    baseInstruction,
                    referenceImages.length > 0 && !isCustomPrompt ? `Match the dish appearance, plating, colors and ingredients from the reference photos exactly.` : '',
                    specialIngredients.length > 0 ? `Prominently feature: ${specialIngredients.join(', ')}.` : '',
                    `Color palette: ${brandColors[0]} and ${brandColors[1]}.`,
                    `Photorealistic, high resolution, no watermarks, no logos.`
                ].filter(Boolean).join(' ');
            }

            // Use base64 if available, otherwise fall back to URL.
            // Logo: if there's reference images, logo goes as secondImage for multi-image edit.
            // If there's NO reference images but there IS a logo, use the logo as the primary image
            // so gpt-image-2 can use it in edit mode (incorporating it into the design).
            const payloadReferenceImages = referenceImages.map(img => img.base64 || img.url);
            const imageToSend = referenceImages[0]?.base64 || referenceImages[0]?.url || (logoImage ? logoImage : undefined);
            const secondImageToSend = (imageToSend && logoImage && referenceImages.length > 0)
                ? logoImage
                : undefined;
            // Enrich prompt with chosen marketing campaign format (Carousel, Offer, etc.)
            const activeCampaign = MARKETING_CAMPAIGN_TYPES.find(c => c.id === marketingCampaignType) || MARKETING_CAMPAIGN_TYPES[0];
            const campaignSystemPrompt = activeCampaign.systemPrompt || '';
            const enrichedPrompt = `${campaignSystemPrompt} ${textPrompt}`.trim();

            const payload = {
                model: imageEngine,
                prompt: enrichedPrompt,
                quality,
                size: imageSize,
                userId: currentUserId,
                image: imageToSend,
                secondImage: secondImageToSend,
                referenceImages: payloadReferenceImages,
                folder: 'marketing',
                campaignType: marketingCampaignType,
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
            const imgAsset = {
                url: newUrl,
                ts: Date.now(),
                size: imageSize,
                aspect: getGeminiAspectRatio(imageSize),
                type: 'image',
                folder: 'marketing',
                prompt: enrichedPrompt,
                campaignType: marketingCampaignType
            };
            useAppStore.getState().addUnifiedAsset(imgAsset);
            setGenerationHistory(prev => {
                const next = [imgAsset, ...prev.filter(x => x.url !== newUrl)].slice(0, 50);
                try { if (mktLSKey) localStorage.setItem(mktLSKey, JSON.stringify(next)); } catch (_) { /* ignore */ }
                return next;
            });
            
            // On mobile, automatically show the gallery so user sees their new image
            if (window.innerWidth < 768) {
                setShowGeneratorPanel(false);
            }
            
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
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" multiple />
        <input type="file" ref={logoInputRef} className="hidden" accept="image/*"
            onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = async ev => { const norm = await normalizeImageForOpenAI(ev.target.result); setLogoImage(norm); }; r.readAsDataURL(f); }} />
        <input type="file" ref={firstFrameRef} className="hidden" accept="image/*"
            onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = async ev => { const norm = await normalizeImageForOpenAI(ev.target.result); setFirstFrame(norm); }; r.readAsDataURL(f); }} />
        <input type="file" ref={lastFrameRef} className="hidden" accept="image/*"
            onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = async ev => { const norm = await normalizeImageForOpenAI(ev.target.result); setLastFrame(norm); }; r.readAsDataURL(f); }} />
        <div className="h-full flex flex-col bg-[#0a0a0a] text-white overflow-hidden relative font-sans">
            {/* Mobile 3-Section Segmented View Switcher */}
            <div className="md:hidden flex items-center bg-black/95 border-b border-white/10 p-1.5 gap-1.5 z-20">
                {/* 1. Marketing (First) */}
                <button
                    type="button"
                    onClick={() => { setShowGeneratorPanel(true); setShowTemplatePanel(false); }}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                        showGeneratorPanel ? "bg-[#c8f135] text-black font-black shadow-[0_0_15px_rgba(200,241,53,0.6)]" : "text-[#c8f135] bg-[#c8f135]/10 border border-[#c8f135]/30"
                    )}
                >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Marketing ⚡</span>
                </button>

                {/* 2. Gallery (Middle) */}
                <button
                    type="button"
                    onClick={() => { setShowTemplatePanel(false); setShowGeneratorPanel(false); }}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                        !showTemplatePanel && !showGeneratorPanel ? "bg-white/20 text-white border border-white/30" : "text-white/40 hover:text-white bg-white/5 border border-white/5"
                    )}
                >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Gallery ({generationHistory.length})</span>
                </button>

                {/* 3. Templates (Last) */}
                <button
                    type="button"
                    onClick={() => { setShowTemplatePanel(true); setShowGeneratorPanel(false); }}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                        showTemplatePanel ? "bg-orange-500/25 text-orange-300 border border-orange-500/40" : "text-white/40 hover:text-white bg-white/5 border border-white/5"
                    )}
                >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Templates</span>
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* ── SECTION 1: Marketing Studio Generator Sidebar (Left) ── */}
                <div className={cn(
                    "border-r border-white/10 bg-[#0c0c10] flex-col h-full transition-all duration-300 relative shrink-0",
                    showGeneratorPanel
                        ? "flex w-full md:w-[360px] lg:w-[390px] xl:w-[410px]"
                        : "hidden"
                )}>

                    {/* Header */}
                    <div className="p-3 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/60 backdrop-blur-md">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#c8f135]/15 border border-[#c8f135]/30 flex items-center justify-center">
                                <Sparkles className="w-3.5 h-3.5 text-[#c8f135]" />
                            </div>
                            <div>
                                <h2 className="text-xs font-black uppercase tracking-wider text-white">Marketing Studio</h2>
                                <p className="text-[8px] text-white/40 font-mono">Viral Marketing Engine</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[10px] font-mono font-bold">
                                <Zap className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span>{userCredits}⚡</span>
                            </div>

                        </div>
                    </div>

                    {/* Image / Video Mode Switcher */}
                    <div className="p-2 border-b border-white/5 bg-black/30 shrink-0">
                        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/5 border border-white/8">
                            <button
                                type="button"
                                onClick={() => setGenerateMode("image")}
                                className={cn(
                                    "flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                    generateMode === "image"
                                        ? "bg-white text-black shadow-md font-black"
                                        : "text-white/50 hover:text-white"
                                )}
                            >
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>Image & Carousels</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setGenerateMode("video")}
                                className={cn(
                                    "flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                    generateMode === "video"
                                        ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md font-black"
                                        : "text-white/50 hover:text-white"
                                )}
                            >
                                <Video className="w-3.5 h-3.5" />
                                <span>Video Studio</span>
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Form Body */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-3.5">
                        {generateMode === "image" ? (
                            <>
                                {/* 1. TOP: Placeholders & Media Uploads */}
                                <div className="space-y-3 p-3 rounded-2xl bg-white/[0.02] border border-white/8">
                                    {/* Product / Reference Photos Slot */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                                                <span>📸</span>
                                                <span>Product & Reference Photos ({referenceImages.length}/9)</span>
                                            </label>
                                            {referenceImages.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setReferenceImages([])}
                                                    className="text-[8px] font-bold text-red-400 hover:text-red-300 uppercase tracking-wider"
                                                >
                                                    Clear All
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-4 gap-2">
                                            {referenceImages.map((img, index) => (
                                                <div key={img.id || index} className="relative group aspect-square rounded-xl overflow-hidden border border-lime-500/40 bg-black/60 shadow-md">
                                                    <img src={resolveUrl(img.url)} alt={`ref-${index}`} className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setReferenceImages(prev => prev.filter((_, i) => i !== index))}
                                                        className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                                    >
                                                        <X className="w-4 h-4 text-white" />
                                                    </button>
                                                </div>
                                            ))}
                                            {referenceImages.length < 9 && (
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="aspect-square rounded-xl border-2 border-dashed border-white/20 hover:border-lime-400/60 bg-white/[0.02] hover:bg-lime-500/5 flex flex-col items-center justify-center gap-1 text-white/40 hover:text-white transition-all cursor-pointer group"
                                                >
                                                    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                    <span className="text-[8px] font-bold uppercase tracking-wider">Add Photo</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Brand Logo Placeholder Slot */}
                                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                                                <span>🏷️</span>
                                                <span>Brand Logo Placeholder (PNG)</span>
                                            </label>
                                            {logoImage && (
                                                <span className="text-[8px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                                                    Active Watermark
                                                </span>
                                            )}
                                        </div>
                                        {logoImage ? (
                                            <div className="relative p-2 rounded-xl border border-orange-500/40 bg-orange-500/5 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-10 h-10 rounded-lg bg-black/80 border border-white/10 p-1 flex items-center justify-center shrink-0">
                                                        <img src={logoImage} alt="Brand Logo" className="w-full h-full object-contain" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-black text-white truncate">Logo Watermark Loaded</p>
                                                        <p className="text-[8px] text-white/40 font-mono">Will be embedded into campaign layout</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setLogoImage(null)}
                                                    className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/30 transition-colors shrink-0"
                                                    title="Remove Logo"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => logoInputRef.current?.click()}
                                                className="w-full py-2.5 px-3 rounded-xl border border-dashed border-white/20 hover:border-orange-400/60 bg-white/[0.02] hover:bg-orange-500/5 flex items-center justify-center gap-2 text-white/50 hover:text-white transition-all cursor-pointer group"
                                            >
                                                <Upload className="w-3.5 h-3.5 text-white/40 group-hover:text-orange-400 transition-colors" />
                                                <span className="text-[10px] font-bold">Upload Brand Logo (Transparent PNG)</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* 2. MIDDLE: Marketing Campaign Objective & Prompt */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-lime-400 flex items-center gap-1.5">
                                            <span>🎯</span>
                                            <span>Marketing Objective & Format</span>
                                        </label>
                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-lime-400/10 text-lime-400 border border-lime-400/30 uppercase">
                                            {MARKETING_CAMPAIGN_TYPES.find(t => t.id === marketingCampaignType)?.badge || "Viral"}
                                        </span>
                                    </div>
                                    <DropUpSelect
                                        value={marketingCampaignType}
                                        onChange={val => setMarketingCampaignType(val)}
                                        options={MARKETING_CAMPAIGN_TYPES}
                                        accentColor="lime"
                                        minMenuWidth={280}
                                    />
                                    <p className="text-[8.5px] text-white/40 leading-relaxed font-mono px-1">
                                        {MARKETING_CAMPAIGN_TYPES.find(t => t.id === marketingCampaignType)?.desc}
                                    </p>
                                </div>

                                {/* Campaign Prompt Box */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-white/60">
                                            Campaign Prompt & Headline
                                        </label>
                                        {selectedTemplate && (
                                            <span className="text-[8px] text-lime-400 truncate max-w-[140px] font-mono">
                                                Tpl: {selectedTemplate.name}
                                            </span>
                                        )}
                                    </div>
                                    <textarea
                                        value={promptText}
                                        onChange={e => setPromptText(e.target.value)}
                                        placeholder="Describe your marketing visual, offer text, headline, style, lighting..."
                                        rows={3}
                                        className="w-full bg-[#141419] border border-white/15 focus:border-[#c8f135] rounded-xl p-3 text-xs text-white placeholder:text-white/25 outline-none resize-none leading-relaxed transition-all"
                                    />
                                    {/* Preset Quick Tags */}
                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                        {[
                                            "🔥 Viral Hook Slide",
                                            "⚡ 50% Off Flash Promo",
                                            "💎 Luxury Minimalist",
                                            "🌟 Limited Edition",
                                            "🚀 New Arrival",
                                        ].map(tag => (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => setPromptText(p => p ? `${p}, ${tag}` : tag)}
                                                className="text-[8px] px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/60 hover:text-white transition-all"
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Real Estate property details if applicable */}
                                {activeCategory === "realestate" && (
                                    <div className="bg-[#141419] border border-blue-500/30 rounded-xl overflow-hidden p-3 space-y-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowPropertyDetails(p => !p)}
                                            className="w-full flex items-center justify-between text-[10px] font-black text-blue-400 uppercase tracking-wider"
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <Building className="w-3.5 h-3.5" /> Property Details
                                            </span>
                                            <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", showPropertyDetails ? "rotate-90" : "")} />
                                        </button>
                                        {showPropertyDetails && (
                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                                                <input
                                                    value={realEstateData.property_name}
                                                    onChange={e => setRealEstateData(p => ({ ...p, property_name: e.target.value }))}
                                                    placeholder="Property name"
                                                    className="col-span-2 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-400"
                                                />
                                                <input
                                                    value={realEstateData.location}
                                                    onChange={e => setRealEstateData(p => ({ ...p, location: e.target.value }))}
                                                    placeholder="Location"
                                                    className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-400"
                                                />
                                                <input
                                                    value={realEstateData.price}
                                                    onChange={e => setRealEstateData(p => ({ ...p, price: e.target.value }))}
                                                    placeholder="Price (e.g. ₹45L)"
                                                    className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-400"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 3. BOTTOM: AI Image Engine & Canvas Aspect Ratio in ONE ROW */}
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                                    <div className="space-y-1 min-w-0">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-lime-400 block truncate">
                                            AI Engine
                                        </label>
                                        <DropUpSelect
                                            value={imageEngine}
                                            onChange={val => setImageEngine(val)}
                                            options={IMAGE_ENGINES}
                                            accentColor="lime"
                                            minMenuWidth={240}
                                        />
                                    </div>

                                    <div className="space-y-1 min-w-0">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-fuchsia-400 block truncate">
                                            Canvas Ratio
                                        </label>
                                        <DropUpSelect
                                            value={imageSize}
                                            onChange={val => setImageSize(val)}
                                            options={getAvailableSizes()}
                                            accentColor="fuchsia"
                                            minMenuWidth={220}
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Video Mode Controls */
                            <>
                                {/* 1. TOP: First / Last Frame Slots */}
                                <div className="space-y-2 p-3 rounded-2xl bg-white/[0.02] border border-white/8">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-white/70 block">
                                        Starting & Ending Frame Reference
                                    </span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <span className="text-[8.5px] font-black uppercase tracking-wider text-white/40">First Frame</span>
                                            <button
                                                type="button"
                                                onClick={() => firstFrameRef.current?.click()}
                                                className={cn(
                                                    "w-full aspect-video rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all",
                                                    firstFrame ? "border-blue-400 bg-black/60 shadow-md" : "border-white/15 bg-white/[0.02] hover:border-white/30"
                                                )}
                                            >
                                                {firstFrame ? (
                                                    <img src={resolveUrl(firstFrame)} alt="first frame" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-[9px] text-white/40 font-bold">+ Start Frame</span>
                                                )}
                                            </button>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[8.5px] font-black uppercase tracking-wider text-white/40">Last Frame</span>
                                            <button
                                                type="button"
                                                onClick={() => lastFrameRef.current?.click()}
                                                className={cn(
                                                    "w-full aspect-video rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all",
                                                    lastFrame ? "border-blue-400 bg-black/60 shadow-md" : "border-white/15 bg-white/[0.02] hover:border-white/30"
                                                )}
                                            >
                                                {lastFrame ? (
                                                    <img src={resolveUrl(lastFrame)} alt="last frame" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-[9px] text-white/40 font-bold">+ End Frame</span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. MIDDLE: Video Prompt Box */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-white/60">
                                        Video Motion Prompt
                                    </label>
                                    <textarea
                                        value={promptText}
                                        onChange={e => setPromptText(e.target.value)}
                                        placeholder="Describe the cinematic camera motion, subject movement, lighting dynamics..."
                                        rows={3}
                                        className="w-full bg-[#141419] border border-white/15 focus:border-pink-500 rounded-xl p-3 text-xs text-white placeholder:text-white/25 outline-none resize-none leading-relaxed transition-all"
                                    />
                                </div>

                                {/* 3. BOTTOM: Video Engine & Duration/Audio in ONE ROW */}
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                                    <div className="space-y-1 min-w-0">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-pink-400 block truncate">
                                            Video Engine
                                        </label>
                                        <DropUpSelect
                                            value={videoEngine}
                                            onChange={val => setVideoEngine(val)}
                                            options={ENGINES.map(eng => ({
                                                ...eng,
                                                badge: `${eng.cost}⚡/s`,
                                            }))}
                                            accentColor="pink"
                                            minMenuWidth={260}
                                        />
                                    </div>

                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-wider text-cyan-400 block truncate">
                                                Duration
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setGenerateAudio(!generateAudio)}
                                                className={cn(
                                                    "text-[8px] font-bold px-1.5 py-0.5 rounded border transition-colors",
                                                    generateAudio ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "bg-white/5 text-gray-500 border-white/10"
                                                )}
                                                title="Toggle Video Audio Track"
                                            >
                                                🎵 {generateAudio ? "ON" : "OFF"}
                                            </button>
                                        </div>
                                        <DropUpSelect
                                            value={videoDuration}
                                            onChange={val => setVideoDuration(Number(val))}
                                            options={activeDurationOptions}
                                            accentColor="cyan"
                                            minMenuWidth={200}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Bottom Fixed Sticky Generate Action — always visible above navigation */}
                    <div className="p-2.5 pb-2 md:pb-2 border-t border-white/10 bg-[#0c0c10]/95 backdrop-blur-xl shrink-0 z-20 shadow-2xl">
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className={cn(
                                "w-full py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer active:scale-95",
                                isGenerating
                                    ? "bg-white/10 text-white/30 cursor-not-allowed"
                                    : generateMode === "video"
                                        ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:scale-[1.02] shadow-pink-900/30"
                                        : "bg-gradient-to-r from-lime-400 to-emerald-500 text-black hover:scale-[1.02] shadow-[0_0_20px_rgba(200,241,53,0.35)]"
                            )}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Rendering {generateMode === "video" ? "Video" : "Asset"}…</span>
                                </>
                            ) : (
                                <>
                                    {generateMode === "video" ? <Video className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
                                    <span>Generate {generateMode === "video" ? "Video" : "Image"}</span>
                                    <span className="opacity-40">|</span>
                                    <span className="font-mono text-xs">{getRequiredCredits(generateMode === "image" ? imageEngine : videoEngine)}⚡</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

{/* ── SECTION 2: Center Gallery / Assets Vault ── */}
                <div className={cn(
                    "flex-1 flex flex-col bg-[#0a0a0a] min-w-0 h-full relative overflow-hidden transition-all duration-300",
                    (showTemplatePanel || showGeneratorPanel) ? "hidden md:flex" : "flex"
                )}>
                    {/* Vault Header Bar */}
                    <div className="h-11 border-b border-white/10 px-4 flex items-center justify-between shrink-0 bg-black/50 backdrop-blur-md">
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-lime-400" />
                            <span className="text-[11px] font-black uppercase tracking-wider text-white">Asset Vault</span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 font-mono">
                                {generationHistory.length} creations
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Mobile button to open Studio */}
                            <button
                                type="button"
                                onClick={() => setShowGeneratorPanel(true)}
                                className="md:hidden flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#c8f135] text-black font-black text-[10px] uppercase tracking-wider shadow-lg"
                            >
                                <Wand2 className="w-3.5 h-3.5" />
                                <span>Create ⚡</span>
                            </button>
                        </div>
                    </div>

                    {/* ── UGC-STYLE FIXED GRID ── */}
                    <div className="flex-1 overflow-y-auto bg-[#0a0a0a] custom-scrollbar p-3 sm:p-4" style={{ minHeight: 0 }}>
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
                                    <div className="p-4 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 items-start">
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
                                                className="relative rounded-lg overflow-hidden w-full bg-black/60 flex items-center justify-center border border-white/10"
                                                style={{ aspectRatio: getAspectRatio(item.size) }}
                                                onClick={() => openZoom(item.url)}
                                            >
                                                {item.type === 'video'
                                                    ? <video src={item.url} className="w-full h-full object-cover" autoPlay loop playsInline muted />
                                                    : <img src={item.url} alt={`gen-${idx}`} className="w-full h-full object-cover" />
                                                }
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 select-none min-h-[300px]">
                                        <div className="w-14 h-14 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center">
                                            <ImageIcon className="w-7 h-7 text-white/15" />
                                        </div>
                                        <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Generated assets appear here</p>
                                        <p className="text-[8px] text-white/10 font-mono">
                                            {selectedTemplate ? `${selectedTemplate.name} · ` : ''}write a prompt or choose a template to start
                                        </p>
                                    </div>
                                )}
                            </div>

                </div>

                {/* ── SECTION 3: Templates Panel (Right) ── */}
                <div className={cn(
                    "border-l border-white/10 flex-col bg-[#0a0a0a] transition-all duration-300 flex-shrink-0 relative h-full",
                    showTemplatePanel 
                        ? "flex w-full md:w-[300px] xl:w-[330px] border-r" 
                        : "hidden"
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

                    <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 custom-scrollbar">
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
                                {/* Video template grid - 2 columns on mobile for compact previews */}
                                <div className="columns-2 sm:columns-2 gap-2 sm:gap-3 space-y-2 sm:space-y-3">
                                    {(VIDEO_TEMPLATES[activeVideoCategory] || []).map(template => (
                                        <motion.div
                                            key={template.id}
                                            whileHover={{ scale: 1.02, y: -4 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleTemplateSelect(template)}
                                            className={cn(
                                                'break-inside-avoid cursor-pointer rounded-lg sm:rounded-xl overflow-hidden border transition-all duration-500 relative group',
                                                selectedTemplate?.id === template.id
                                                    ? 'border-lime-500 shadow-[0_0_20px_rgba(132,204,22,0.2)]'
                                                    : 'border-white/5 hover:border-white/20'
                                            )}
                                        >
                                            <div className={cn('w-full relative', template.aspect === '9/16' ? 'aspect-[9/16]' : template.aspect === '1/1' ? 'aspect-square' : 'aspect-[16/9]')}>
                                                <img src={template.imageUrl} alt={template.name}
                                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                                {selectedTemplate?.id === template.id && (
                                                    <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-lime-500 text-black p-0.5 sm:p-1 rounded-full shadow-xl">
                                                        <Check className="w-2.5 h-2.5" />
                                                    </div>
                                                )}
                                                {/* Video badge */}
                                                <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 flex items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded-md">
                                                    <Video className="w-2.5 h-2.5 text-lime-400" />
                                                    <span className="text-[7.5px] sm:text-[8px] text-lime-300 font-black uppercase">Video</span>
                                                </div>
                                            </div>
                                            <div className="px-1.5 py-1 sm:px-2 sm:py-1.5 bg-black/40">
                                                <p className="text-[9px] sm:text-[10px] font-black text-white/80 truncate">{template.name}</p>
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
                        {/* Gallery header & Category Chips */}
                        <div className="flex items-center justify-between mb-2 px-1">
                            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Templates Category</h3>
                            {isAdmin && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-orange-400 hover:text-orange-300 bg-orange-400/10 hover:bg-orange-400/20 px-2 py-1 rounded-lg transition-all"
                            >
                                <Plus className="w-3 h-3" /> Add
                            </button>
                            )}
                        </div>

                        {/* Image Category Filter Chips */}
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3 pb-1">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => { setActiveCategory(cat.id); setActiveTag(null); }}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap text-[9px] font-black uppercase tracking-wider transition-all shrink-0",
                                        activeCategory === cat.id
                                            ? "bg-white text-black shadow-md font-black"
                                            : "text-white/40 hover:text-white/80 bg-white/5 border border-white/10 hover:bg-white/10"
                                    )}
                                >
                                    <cat.icon className={cn("w-2.5 h-2.5", activeCategory === cat.id ? "text-black" : cat.color)} />
                                    <span>{cat.label}</span>
                                </button>
                            ))}
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
                        {/* Image template grid - 2 columns on mobile for compact previews */}
                        <div className="columns-2 sm:columns-2 gap-2 sm:gap-3 space-y-2 sm:space-y-3">
                            {filteredTemplates.map(template => (
                                <motion.div
                                    key={template.id}
                                    whileHover={{ scale: 1.02, y: -4 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleTemplateSelect(template)}
                                    className={cn(
                                        "break-inside-avoid cursor-pointer rounded-lg sm:rounded-xl overflow-hidden border transition-all duration-500 relative group",
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
                                            <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-lime-500 text-black p-0.5 sm:p-1 rounded-full shadow-xl">
                                                <Check className="w-2.5 h-2.5" />
                                            </div>
                                        )}
                                        {/* Expand preview button */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setPreviewTemplateIdx(filteredTemplates.indexOf(template)); }}
                                            className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 bg-black/70 hover:bg-black/90 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10 flex items-center gap-1">
                                            <Expand className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                                            <span className="text-[8px] sm:text-[9px] text-white font-bold">Expand</span>
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
                                                className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-lg bg-black/70 border border-red-500/40 opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all duration-200 z-10"
                                            >
                                                <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-400 group-hover:text-white" />
                                                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-red-400 hover:text-white">Delete</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="px-1.5 py-1 sm:px-2 sm:py-1.5 bg-black/40">
                                        <p className="text-[9px] sm:text-[10px] font-black text-white/80 truncate">{template.name}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        </>
                        )}
                    </div>
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
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 md:backdrop-blur-md p-4"
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
                        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 md:backdrop-blur-md"
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
                                                    try { if (mktLSKey) localStorage.setItem(mktLSKey, JSON.stringify(next)); } catch (_) { /* ignore */ }
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
