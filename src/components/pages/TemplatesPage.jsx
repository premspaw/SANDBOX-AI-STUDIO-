import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Flame, 
  Cake, 
  Heart, 
  Megaphone, 
  Zap, 
  Search, 
  Upload, 
  Play, 
  Pause, 
  X, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  Plus, 
  SlidersHorizontal, 
  Tag, 
  Film, 
  Wand2, 
  ShieldCheck, 
  RefreshCw, 
  Layers,
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { resolveUrl, getApiUrl } from '../../config/apiConfig';

// Curated default 9:16 vertical video templates
const SEED_TEMPLATES = [
  // ── TRENDING ──
  {
    id: 'seed_trend_1',
    title: 'Cyber Kinetic Fashion Walk',
    category: 'trending',
    video_url: 'https://cdn.zerolens.in/landing/assets/uploaded_1783857951560.mp4',
    prompt: 'Transfer high-fashion confident street runway motion to subject with neon cyberpunk city lights, anamorphic lens flare and crisp 4K lighting',
    aspect_ratio: '9:16',
    duration: '6s',
    remix_count: 2480,
    badge: 'VIRAL'
  },
  {
    id: 'seed_trend_2',
    title: 'Glow Reveal Transformation',
    category: 'trending',
    video_url: 'https://cdn.zerolens.in/landing/assets/uploaded_1783622460440.mp4',
    prompt: 'Cinematic slow-motion aesthetic model turn, golden rim lighting, luxury editorial styling with subtle particle dust',
    aspect_ratio: '9:16',
    duration: '5s',
    remix_count: 1890,
    badge: 'TRENDING'
  },

  // ── HAPPY BIRTHDAY ──
  {
    id: 'seed_bday_1',
    title: 'Neon Birthday Confetti Party',
    category: 'birthday',
    video_url: 'https://cdn.zerolens.in/landing/assets/uploaded_1783615271525.mp4',
    prompt: 'Subject celebrating with vibrant holographic birthday confetti explosion, warm celebratory bokeh, beaming smile, golden glow atmosphere',
    aspect_ratio: '9:16',
    duration: '5s',
    remix_count: 3120,
    badge: 'POPULAR'
  },
  {
    id: 'seed_bday_2',
    title: 'Sparkler Candle Glow Birthday',
    category: 'birthday',
    video_url: 'https://cdn.zerolens.in/landing-assets/IMG_5525.MP4',
    prompt: 'Intimate birthday celebration, subject laughing softly holding glowing sparklers, floating pastel balloons in background, cinematic shallow depth of field',
    aspect_ratio: '9:16',
    duration: '6s',
    remix_count: 1450,
    badge: 'HOT'
  },
  {
    id: 'seed_bday_3',
    title: 'VIP Birthday Toast Reveal',
    category: 'birthday',
    video_url: 'https://cdn.zerolens.in/landing-assets/0302.mp4',
    prompt: 'High energy birthday champagne pop celebration, golden streamers, euphoric party lighting, 4k hyper-realistic motion transfer',
    aspect_ratio: '9:16',
    duration: '7s',
    remix_count: 980,
    badge: 'NEW'
  },

  // ── WEDDING & ROMANCE ──
  {
    id: 'seed_wed_1',
    title: 'Royal Wedding Veil Slow-Mo',
    category: 'wedding',
    video_url: 'https://cdn.zerolens.in/landing/assets/uploaded_1783879918655.mp4',
    prompt: 'Emotional royal wedding ceremony entrance, floating embroidered bridal veil, soft golden hour sunlight, floral archway, hyper-detailed jewelry shimmer',
    aspect_ratio: '9:16',
    duration: '6s',
    remix_count: 4210,
    badge: 'FEATURED'
  },
  {
    id: 'seed_wed_2',
    title: 'Golden Hour Couple Romance',
    category: 'wedding',
    video_url: 'https://cdn.zerolens.in/landing-assets/IMG_5265.MP4',
    prompt: 'Breathtaking romantic couple sunset embrace, gentle breeze through hair, warm cinematic amber backlight, 35mm film grain aesthetic',
    aspect_ratio: '9:16',
    duration: '5s',
    remix_count: 2750,
    badge: 'CLASSIC'
  },
  {
    id: 'seed_wed_3',
    title: 'Luxury Sangeet Dance Spin',
    category: 'wedding',
    video_url: 'https://cdn.zerolens.in/landing/assets/uploaded_1783622487836.mp4',
    prompt: 'Grand traditional wedding dance twirl with glittering silk lehenga, warm fairy lights, royal palace architecture, dynamic fluid movement',
    aspect_ratio: '9:16',
    duration: '7s',
    remix_count: 1830,
    badge: 'VIRAL'
  },

  // ── MARKETING & ADS ──
  {
    id: 'seed_mkt_1',
    title: 'UGC Skincare Hook & Glow',
    category: 'marketing',
    video_url: 'https://cdn.zerolens.in/landing/assets/uploaded_1783860587721.mp4',
    prompt: 'Engaging UGC creator close-up testing skincare serum, dewy natural glass skin, ring-light illumination, high-retention viral TikTok format',
    aspect_ratio: '9:16',
    duration: '5s',
    remix_count: 5320,
    badge: 'TOP AD'
  },
  {
    id: 'seed_mkt_2',
    title: 'Sneaker & Product Macro Drop',
    category: 'marketing',
    video_url: 'https://cdn.zerolens.in/landing/assets/uploaded_1783874575574.mp4',
    prompt: 'High energy product unboxing and 360 rotation, dramatic studio spotlights, clean minimalist podium, crisp commercial e-commerce grade detail',
    aspect_ratio: '9:16',
    duration: '6s',
    remix_count: 3640,
    badge: 'HIGH ROI'
  },
  {
    id: 'seed_mkt_3',
    title: 'Gourmet Food & Beverage Splash',
    category: 'marketing',
    video_url: 'https://cdn.zerolens.in/landing/assets/uploaded_1783874669798.mp4',
    prompt: 'Mouth-watering commercial food hero shot, macro slow-motion steam, golden glistening texture, restaurant quality advertisement lighting',
    aspect_ratio: '9:16',
    duration: '5s',
    remix_count: 1990,
    badge: 'HOOK'
  },

  // ── VIRAL & REELS ──
  {
    id: 'seed_viral_1',
    title: 'Cinematic Lifestyle Vlog Pass',
    category: 'viral',
    video_url: 'https://cdn.zerolens.in/landing/assets/uploaded_1783875397189.mp4',
    prompt: 'Aesthetic travel influencer POV walking through cafe street, natural sunlight, organic hand-held motion, modern TikTok viral grading',
    aspect_ratio: '9:16',
    duration: '5s',
    remix_count: 4120,
    badge: '1.2M VIEWS'
  },
  {
    id: 'seed_viral_2',
    title: 'Futuristic Studio Hologram',
    category: 'viral',
    video_url: 'https://cdn.zerolens.in/landing/assets/uploaded_1783622589711.mp4',
    prompt: 'Sci-fi cinematic subject turning toward camera with subtle holographic light reflections, ultra-sharp 8k studio backdrop, moody contrast',
    aspect_ratio: '9:16',
    duration: '6s',
    remix_count: 2210,
    badge: 'TRENDING'
  }
];

const CATEGORIES = [
  { id: 'all', label: 'All Templates', icon: Flame, color: 'text-[#c8f135]' },
  { id: 'trending', label: 'Trending', icon: TrendingUp, color: 'text-amber-400' },
  { id: 'birthday', label: 'Happy Birthday', icon: Cake, color: 'text-pink-400' },
  { id: 'wedding', label: 'Wedding & Romance', icon: Heart, color: 'text-rose-400' },
  { id: 'marketing', label: 'Marketing & Ads', icon: Megaphone, color: 'text-cyan-400' },
  { id: 'viral', label: 'Viral & Reels', icon: Zap, color: 'text-purple-400' }
];

export default function TemplatesPage() {
  const setActiveTabGlobal = useAppStore(state => state.setActiveTab);
  const setRemixInitialData = useAppStore(state => state.setRemixInitialData);
  const userProfile = useAppStore(state => state.userProfile);
  const showToast = useAppStore(state => state.showToast);

  const [authUser, setAuthUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState(SEED_TEMPLATES);
  const [isLoading, setIsLoading] = useState(false);

  // Preview Modal
  const [activePreview, setActivePreview] = useState(null);
  const [previewMuted, setPreviewMuted] = useState(true);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Admin Upload Modal
  const [showAdminUpload, setShowAdminUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('trending');
  const [uploadPrompt, setUploadPrompt] = useState('');
  const [uploadVideoUrl, setUploadVideoUrl] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState('');
  const [uploadDuration, setUploadDuration] = useState('5s');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Check Admin
  const isAdmin = Boolean(
    userProfile?.email === 'premspaw@gmail.com' || 
    authUser?.email === 'premspaw@gmail.com' ||
    useAppStore.getState().isAdmin
  );

  // Load auth user
  useEffect(() => {
    supabase?.auth?.getUser().then(({ data }) => {
      if (data?.user) setAuthUser(data.user);
    });
  }, []);

  // Fetch templates from API and merge with seeds + localStorage
  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      // 1. Local storage custom templates
      let localTemplates = [];
      try {
        const saved = localStorage.getItem('custom_remix_templates');
        if (saved) localTemplates = JSON.parse(saved);
      } catch (e) {
        console.debug('[Templates] local storage read:', e);
      }

      // 2. Fetch from backend API /api/remix/templates (handles DB fallback seamlessly without 404s)
      let apiTemplates = [];
      try {
        const res = await fetch(getApiUrl('/api/remix/templates'));
        if (res.ok) {
          const json = await res.json();
          if (json?.success && Array.isArray(json.templates)) {
            apiTemplates = json.templates;
          }
        }
      } catch (apiErr) {
        console.debug('[Templates] API fetch fallback:', apiErr);
      }

      // Merge: API/DB templates first, then local, then seeds (deduped by ID)
      const map = new Map();
      [...apiTemplates, ...localTemplates, ...SEED_TEMPLATES].forEach(item => {
        if (item && item.id && !map.has(item.id)) {
          map.set(item.id, item);
        }
      });
      setTemplates(Array.from(map.values()));
    } catch (err) {
      console.warn('[TemplatesPage] Fallback to seeds:', err);
      setTemplates(SEED_TEMPLATES);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Handle direct Remix button click
  const handleRemix = (template, e) => {
    if (e) e.stopPropagation();
    if (!template?.video_url) return;

    // Send pre-population data to Remix Studio
    setRemixInitialData({
      videoUrl: template.video_url,
      prompt: template.prompt || '',
      templateTitle: template.title || 'Template',
      templateId: template.id,
      duration: template.duration || '5s'
    });

    if (showToast) {
      showToast(`Selected "${template.title}". Redirecting to Remix Studio...`, 'info');
    }

    // Direct user to Remix Studio
    setActiveTabGlobal('remix');
  };

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(item => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = !searchQuery.trim() || 
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.prompt?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [templates, selectedCategory, searchQuery]);

  // Handle file pick for Admin upload
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      const url = URL.createObjectURL(file);
      setUploadPreview(url);

      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => {
        if (v.duration && !isNaN(v.duration)) {
          const sec = Math.max(1, Math.round(v.duration));
          setUploadDuration(`${sec}s`);
        }
      };
      v.src = url;

      if (!uploadTitle) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setUploadTitle(nameWithoutExt.charAt(0).toUpperCase() + nameWithoutExt.slice(1));
      }
    }
  };

  // Admin template upload submit
  const handleAdminUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      alert('Please enter a template title.');
      return;
    }
    if (!uploadFile && !uploadVideoUrl.trim()) {
      alert('Please upload a video file or enter a video URL.');
      return;
    }

    setIsUploading(true);
    let finalVideoUrl = uploadVideoUrl.trim();

    try {
      // 1. If file selected, upload directly to Cloudflare R2 bucket via backend
      if (uploadFile) {
        const formData = new FormData();
        formData.append('file', uploadFile);

        const uploadRes = await fetch(getApiUrl('/api/remix/templates/upload'), {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to upload video to Cloudflare R2 bucket.');
        }

        const uploadData = await uploadRes.json();
        if (!uploadData?.url) {
          throw new Error('Cloudflare R2 returned an empty URL.');
        }

        finalVideoUrl = uploadData.url;
      }

      if (!finalVideoUrl) {
        throw new Error('Could not resolve video URL.');
      }

      const newTemplate = {
        id: `tpl_${Date.now()}`,
        title: uploadTitle.trim(),
        category: uploadCategory,
        video_url: finalVideoUrl,
        prompt: uploadPrompt.trim() || 'Transform subject with cinematic lighting and flawless motion transfer',
        aspect_ratio: '9:16',
        duration: uploadDuration || '5s',
        remix_count: 1,
        created_by: userProfile?.email || authUser?.email || 'admin',
        created_at: new Date().toISOString()
      };

      // Save to Backend API / Supabase DB
      try {
        await fetch(getApiUrl('/api/remix/templates'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTemplate)
        });
      } catch (apiSaveErr) {
        console.warn('[API template save warning]:', apiSaveErr);
      }

      // Save to localStorage for instant local availability
      try {
        const existing = JSON.parse(localStorage.getItem('custom_remix_templates') || '[]');
        localStorage.setItem('custom_remix_templates', JSON.stringify([newTemplate, ...existing]));
      } catch (e) {
        console.debug('[Templates] local storage write:', e);
      }

      // Prepend to current state
      setTemplates(prev => [newTemplate, ...prev]);

      if (showToast) {
        showToast('Template published successfully!', 'success');
      }

      // Reset form
      setUploadTitle('');
      setUploadPrompt('');
      setUploadVideoUrl('');
      setUploadFile(null);
      setUploadPreview('');
      setShowAdminUpload(false);
    } catch (err) {
      console.error('[Upload error]:', err);
      alert(`Failed to save template: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const copyPromptText = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="w-full h-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#050508] text-white relative select-none font-sans">
      
      {/* Ambient Cyber Neon Background Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[600px] max-w-full h-[350px] bg-gradient-to-b from-[#c8f135]/10 via-emerald-500/5 to-transparent blur-[140px]" />
        <div className="absolute top-1/2 right-0 w-[450px] max-w-full h-[450px] bg-purple-600/10 blur-[150px]" />
      </div>

      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-28 relative z-10 space-y-3.5 sm:space-y-6">

        {/* 1. TOP HEADER & SEARCH / ADMIN UPLOAD BAR */}
        <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/[0.05] via-[#0b0b12] to-black border border-white/10 p-3.5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-[#c8f135]/10 to-transparent pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-6 relative z-10">
            {/* Title & Description */}
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] sm:text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-[#c8f135]/15 text-[#c8f135] border border-[#c8f135]/30 flex items-center gap-1">
                  <Flame size={11} className="fill-[#c8f135]" />
                  9:16 VERTICAL VIRAL HUB
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10">
                  {filteredTemplates.length} Templates Live
                </span>
                {isAdmin && (
                  <span className="text-[9px] sm:text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1 shadow-[0_0_12px_rgba(239,68,68,0.2)]">
                    <ShieldCheck size={11} className="text-red-400" />
                    ADMIN UPLOADER ACTIVE
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight uppercase">
                Viral Video <span className="text-[#c8f135]">Templates</span>
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-400 max-w-2xl leading-relaxed">
                Pick any trending 9:16 video, tap <strong className="text-white">Remix</strong>, and upload your photo to recreate it in seconds.
              </p>
            </div>

            {/* Search & Admin Upload Action Button */}
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full pl-9 pr-3 py-2 sm:py-2.5 rounded-xl bg-black/60 border border-white/10 text-white placeholder-zinc-500 text-xs font-medium focus:outline-none focus:border-[#c8f135]/60 transition-colors"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Admin "+ Upload Template" Button */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowAdminUpload(true)}
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#c8f135] hover:bg-[#d8ff43] text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(200,241,53,0.35)] active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  title="Upload New 9:16 Template"
                >
                  <Plus size={15} className="stroke-[3]" />
                  <span>Add Template</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. HORIZONTAL CATEGORY FOLDERS BAR (Smooth Touch Scroll on Mobile) */}
        <div className="flex items-center overflow-x-auto no-scrollbar gap-1.5 sm:gap-2 p-1 sm:p-1.5 bg-[#0a0a12]/90 border border-white/[0.08] rounded-xl sm:rounded-2xl shrink-0">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            const count = cat.id === 'all' 
              ? templates.length 
              : templates.filter(t => t.category === cat.id).length;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer select-none active:scale-95 shrink-0 whitespace-nowrap",
                  isSelected
                    ? "bg-[#c8f135] text-black shadow-[0_0_20px_rgba(200,241,53,0.3)] font-black"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon size={14} className={isSelected ? "text-black" : cat.color} />
                <span>{cat.label}</span>
                <span className={cn(
                  "text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md",
                  isSelected ? "bg-black/20 text-black font-extrabold" : "bg-white/10 text-zinc-300"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 3. DENSE 9:16 TEMPLATES GRID (2 columns on mobile so multiple templates are visible at once!) */}
        {filteredTemplates.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white/[0.02] border border-dashed border-white/10 space-y-3">
            <Film className="w-12 h-12 text-zinc-600 mx-auto" />
            <h3 className="text-base font-bold text-white uppercase">No Templates Found</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              No templates match your selected category or search filter. Try selecting "All Templates" or reset your search.
            </p>
            <button
              onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase transition-all"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3.5">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onRemix={(customTemplate, e) => handleRemix(customTemplate || template, e)}
                onPreview={() => setActivePreview(template)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 4. FULL-SCREEN 9:16 VIDEO PREVIEW MODAL */}
      <AnimatePresence>
        {activePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActivePreview(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm sm:max-w-md bg-[#0a0a12] border border-white/15 rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col max-h-[92vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3.5 border-b border-white/10 bg-black/40">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#c8f135]/15 text-[#c8f135] border border-[#c8f135]/30">
                    9:16 Preview
                  </span>
                  <h4 className="text-xs font-black uppercase text-white truncate">{activePreview.title}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePreview(null)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* 9:16 Video Player Container */}
              <div className="relative aspect-[9/16] max-h-[58vh] bg-black overflow-hidden flex items-center justify-center">
                <video
                  src={resolveUrl(activePreview.video_url)}
                  autoPlay
                  loop
                  playsInline
                  muted={previewMuted}
                  onLoadedMetadata={(e) => {
                    if (e.currentTarget?.duration && !isNaN(e.currentTarget.duration)) {
                      const durSec = Math.max(1, Math.round(e.currentTarget.duration));
                      if (!activePreview.duration || activePreview.duration === '5s') {
                        setActivePreview(prev => prev ? ({ ...prev, duration: `${durSec}s` }) : null);
                      }
                    }
                  }}
                  className="w-full h-full object-cover"
                />

                {/* Sound Toggle Button */}
                <button
                  type="button"
                  onClick={() => setPreviewMuted(prev => !prev)}
                  className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/15 transition-all cursor-pointer shadow-lg"
                  title={previewMuted ? "Unmute" : "Mute"}
                >
                  {previewMuted ? <VolumeX size={14} /> : <Volume2 size={14} className="text-[#c8f135]" />}
                </button>

                {/* Badge */}
                {activePreview.badge && (
                  <span className="absolute top-3 left-3 text-[9px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#c8f135] text-black shadow-md">
                    {activePreview.badge}
                  </span>
                )}
              </div>

              {/* Prompt & Remix Action Drawer */}
              <div className="p-3.5 sm:p-4 bg-gradient-to-t from-black via-[#0a0a12] to-transparent space-y-3">
                {/* Prompt box */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span className="flex items-center gap-1 text-[#c8f135]">
                      <Wand2 size={11} /> Universal Remix Prompt
                    </span>
                    <button
                      type="button"
                      onClick={() => copyPromptText(activePreview.prompt)}
                      className="text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedPrompt ? <Check size={11} className="text-[#c8f135]" /> : <Copy size={11} />}
                      <span>{copiedPrompt ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="p-2 rounded-xl bg-black/50 border border-white/5 text-[11px] text-zinc-300 font-medium leading-relaxed max-h-20 overflow-y-auto custom-scrollbar">
                    {activePreview.prompt}
                  </p>
                </div>

                {/* Big Remix CTA Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    handleRemix(activePreview, e);
                    setActivePreview(null);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#c8f135] hover:bg-[#d8ff43] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(200,241,53,0.4)] active:scale-95 transition-all cursor-pointer"
                >
                  <Wand2 size={15} className="fill-black text-black" />
                  <span>Use This Template (Remix)</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. ADMIN UPLOAD MODAL (Mobile-Optimized for Instant Video & Prompt Publishing) */}
      <AnimatePresence>
        {showAdminUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAdminUpload(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-[#0c0c16] border border-white/15 rounded-3xl p-4 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.95)] space-y-4 my-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#c8f135]/15 border border-[#c8f135]/30 flex items-center justify-center text-[#c8f135]">
                    <Upload size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black uppercase text-white tracking-tight">
                      Upload 9:16 Video Template
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      Add a new template to the public viral library
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdminUpload(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAdminUploadSubmit} className="space-y-3.5">
                
                {/* Video Picker (File or URL) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block">
                    1. Video File or Direct URL (9:16 Vertical)
                  </label>
                  
                  {/* File Upload Box */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/15 hover:border-[#c8f135]/50 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-black/40 hover:bg-black/60 relative overflow-hidden"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {uploadPreview ? (
                      <div className="relative aspect-[9/16] max-h-48 mx-auto rounded-xl overflow-hidden bg-black">
                        <video 
                          src={uploadPreview.startsWith('blob:') ? uploadPreview : resolveUrl(uploadPreview)} 
                          autoPlay 
                          loop 
                          muted 
                          playsInline 
                          className="w-full h-full object-cover" 
                        />
                        <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-mono bg-black/70 px-2 py-0.5 rounded text-[#c8f135]">
                          Tap to replace
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5 py-2">
                        <Upload size={24} className="text-[#c8f135] mx-auto animate-bounce" />
                        <p className="text-xs font-bold text-white">Tap to upload video from phone / PC</p>
                        <p className="text-[10px] font-mono text-zinc-500">MP4, MOV, WebM (Recommended: 9:16 ratio)</p>
                      </div>
                    )}
                  </div>

                  {/* Or Direct URL Input */}
                  <div className="pt-1">
                    <input
                      type="url"
                      value={uploadVideoUrl}
                      onChange={(e) => {
                        setUploadVideoUrl(e.target.value);
                        if (e.target.value) setUploadPreview(e.target.value);
                      }}
                      placeholder="Or paste direct video URL (https://...)"
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-[#c8f135]/60 transition-colors"
                    />
                  </div>
                </div>

                {/* Template Title */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block">
                    2. Template Title
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Neon Birthday Sparkle, Wedding Sunset Walk"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#c8f135]/60 transition-colors"
                  />
                </div>

                {/* Category Radio Chips */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block">
                    3. Folder / Category
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                      const Icon = cat.icon;
                      const isSelected = uploadCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setUploadCategory(cat.id)}
                          className={cn(
                            "py-2 px-2 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                            isSelected
                              ? "bg-[#c8f135] text-black border-[#c8f135] font-extrabold shadow-sm"
                              : "bg-black/40 border-white/10 text-zinc-400 hover:text-white"
                          )}
                        >
                          <Icon size={12} className={isSelected ? "text-black" : cat.color} />
                          <span className="truncate">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Universal Prompt Input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block">
                      4. Universal Remix Prompt
                    </label>
                    <span className="text-[9px] font-mono text-[#c8f135]">
                      Pre-populates in Remix box
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={uploadPrompt}
                    onChange={(e) => setUploadPrompt(e.target.value)}
                    placeholder="Enter the prompt that guides the AI when a user remixes this template (e.g. 'Transform subject from Image 1 with cinematic lighting and dynamic motion...')"
                    className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#c8f135]/60 transition-colors resize-none leading-relaxed"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full py-3 px-4 rounded-xl bg-[#c8f135] hover:bg-[#d8ff43] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(200,241,53,0.35)] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw size={15} className="animate-spin text-black" />
                        <span>Publishing Template...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={15} className="text-black" />
                        <span>Publish Template to Library</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button for Mobile Admin */}
      {isAdmin && (
        <div className="sm:hidden fixed bottom-16 right-4 z-40">
          <button
            type="button"
            onClick={() => setShowAdminUpload(true)}
            className="w-12 h-12 rounded-full bg-[#c8f135] text-black font-black flex items-center justify-center shadow-[0_0_25px_rgba(200,241,53,0.6)] active:scale-95 cursor-pointer"
            title="Upload Template"
          >
            <Plus size={22} className="stroke-[3]" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── 9:16 VERTICAL TEMPLATE CARD COMPONENT ──
function TemplateCard({ template, onRemix, onPreview }) {
  const [isHovered, setIsHovered] = useState(false);
  const [liveDuration, setLiveDuration] = useState(template.duration || '');
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isHovered) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isHovered]);

  return (
    <div
      onClick={onPreview}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 hover:border-[#c8f135]/60 bg-black cursor-pointer transition-all duration-300 flex flex-col justify-between shadow-lg hover:shadow-[0_0_25px_rgba(200,241,53,0.2)]"
    >
      {/* 9:16 Aspect Ratio Container */}
      <div className="relative w-full aspect-[9/16] overflow-hidden bg-zinc-950 flex flex-col justify-between">
        
        {/* Background Video */}
        <video
          ref={videoRef}
          src={resolveUrl(template.video_url)}
          loop
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => {
            if (e.currentTarget?.duration && !isNaN(e.currentTarget.duration)) {
              setLiveDuration(`${Math.max(1, Math.round(e.currentTarget.duration))}s`);
            }
          }}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Ambient Overlay Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60 pointer-events-none" />

        {/* Top Badges Row */}
        <div className="relative z-10 p-2 sm:p-2.5 flex items-center justify-between gap-1">
          {template.badge ? (
            <span className="text-[8px] sm:text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded-md bg-[#c8f135] text-black shadow-md">
              {template.badge}
            </span>
          ) : (
            <span className="text-[8px] sm:text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-md bg-black/60 text-zinc-300 border border-white/10">
              {template.category}
            </span>
          )}

          <span className="text-[8px] sm:text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-black/60 text-zinc-300 border border-white/10 flex items-center gap-1">
            <Zap size={9} className="text-[#c8f135]" />
            <span>{liveDuration || template.duration || '5s'}</span>
          </span>
        </div>

        {/* Center Play Icon Overlay (Visible when not playing or hovered) */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none",
          isHovered ? "opacity-0" : "opacity-70 sm:opacity-80"
        )}>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl">
            <Play size={14} className="fill-white translate-x-0.5" />
          </div>
        </div>

        {/* Bottom Details & Direct REMIX Action */}
        <div className="relative z-10 p-2 sm:p-3 space-y-1.5 bg-gradient-to-t from-black via-black/90 to-transparent">
          <div>
            <h4 className="text-[11px] sm:text-xs font-black text-white uppercase tracking-tight line-clamp-1 group-hover:text-[#c8f135] transition-colors">
              {template.title}
            </h4>
            <p className="text-[9px] sm:text-[10px] text-zinc-400 font-mono line-clamp-1">
              {template.remix_count ? `${template.remix_count.toLocaleString()} remixes` : 'New template'}
            </p>
          </div>

          {/* Action Button: REMIX */}
          <button
            type="button"
            onClick={(e) => onRemix({ ...template, duration: liveDuration || template.duration || '5s' }, e)}
            className="w-full py-1.5 sm:py-2 px-2 rounded-lg sm:rounded-xl bg-[#c8f135] hover:bg-[#d8ff43] text-black font-black text-[10px] sm:text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-[0_0_15px_rgba(200,241,53,0.3)] active:scale-95 transition-all cursor-pointer"
            title="Use this template in Remix Studio"
          >
            <Wand2 size={12} className="fill-black text-black" />
            <span>Remix</span>
          </button>
        </div>
      </div>
    </div>
  );
}
