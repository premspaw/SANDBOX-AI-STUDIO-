import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, Upload, Wand2, X, Download, ZoomIn, Check, 
    ArrowLeft, Layers, RefreshCw, Sliders, Image as ImageIcon, 
    Video, Film, AlertCircle, Info, ExternalLink, Trash2, Eye
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useShorts } from '../../hooks/useShorts';
import { useAppStore } from '../../store';
import { getApiUrl } from '../../config/apiConfig';
import { InpaintEditor } from '../common/InpaintEditor';

const WORKFLOW_ENGINES = [
    {
        id: 'higgsfield/ads-studio/v1.0',
        name: 'Higgsfield Ads Studio v1.0',
        badge: 'Official Workflow',
        icon: '⚡',
        cost: 3,
        desc: 'Official brief-to-ad commercial workflow. Composes product references with marketing layout priors.'
    },
    {
        id: 'openai-2.5-sunburst',
        name: 'OpenAI 2.5 Sunburst',
        badge: 'Billboard Pro',
        icon: '☀️',
        cost: 2.5,
        desc: 'Ultra high-fidelity commercial advertising design with crisp typography separation.'
    },
    {
        id: 'openai-2.5-flare',
        name: 'OpenAI 2.5 Flare',
        badge: 'Ultra Fast',
        icon: '✨',
        cost: 1.5,
        desc: 'Fast, vibrant social feed commercial ads optimized for engagement.'
    },
    {
        id: 'nano-banana-pro',
        name: 'Google Nano Banana Pro',
        badge: '4K Studio',
        icon: '💎',
        cost: 1,
        desc: 'Maximum studio photorealism and dynamic lighting with ultra-low token cost.'
    }
];

const NICHES = [
    'Beauty & Skincare',
    'Tech & Electronics',
    'Fashion & Apparel',
    'Food & Beverage',
    'Fitness & Wellness',
    'Luxury Goods & Watches',
    'Home & Furniture',
    'SaaS & Digital Apps'
];

const TARGET_AUDIENCES = [
    'Gen Z Trendsetters',
    'Busy Working Professionals',
    'High-Net-Worth Executives',
    'Fitness & Gym Enthusiasts',
    'Eco-Conscious Shoppers',
    'Moms & Families'
];

const ASPECT_RATIOS = [
    { id: '1:1', label: '1:1 Square', sub: 'Instagram Feed / Post', aspect: '1/1' },
    { id: '4:5', label: '4:5 Portrait', sub: 'High-Converting Feed', aspect: '4/5' },
    { id: '9:16', label: '9:16 Vertical', sub: 'Stories, Reels & TikTok', aspect: '9/16' },
    { id: '16:9', label: '16:9 Banner', sub: 'Website & YouTube Ads', aspect: '16/9' },
    { id: '3:4', label: '3:4 Editorial', sub: 'Magazine Commercial', aspect: '3/4' },
    { id: '21:9', label: '21:9 Cinema', sub: 'Panoramic Billboard', aspect: '21/9' },
];

const PROMPT_PRESETS = [
    {
        label: 'Luxury Minimalist',
        prompt: 'Minimalist luxury hero advertisement. The product floats elegantly over polished dark slate and soft water ripples. Dramatic volumetric rim lighting, subtle morning mist, ultra-clean commercial composition.'
    },
    {
        label: 'Viral Social Pop',
        prompt: 'Bold vibrant Gen-Z commercial ad. Punchy candy-colored pastel background with high contrast shadows. Dynamic floating elements, energetic studio strobe lights, crisp billboard clarity.'
    },
    {
        label: 'Organic Lifestyle',
        prompt: 'Warm golden hour lifestyle advertisement. The product placed naturally on a raw light oak wooden surface next to fresh botanical flora. Soft sun flare, organic textures, editorial magazine aesthetic.'
    },
    {
        label: 'Futuristic Cyber',
        prompt: 'Futuristic commercial visual with sleek neon cyber accents. Dark reflective obsidian surface, moody anamorphic blue and violet backlight, ultra-sharp reflections, 8K commercial product showcase.'
    }
];

export default function AdsStudio({ onBackToMarketing }) {
    const userProfile = useAppStore(state => state.userProfile);
    const currentUserId = userProfile?.id || null;
    const { shorts, refresh: refreshShorts, canAfford, spend, refund } = useShorts();
    const userCredits = shorts ?? 0;

    // Form state
    const [engine, setEngine] = useState('higgsfield/ads-studio/v1.0');
    const [prompt, setPrompt] = useState('');
    const [niche, setNiche] = useState('Beauty & Skincare');
    const [customNiche, setCustomNiche] = useState('');
    const [targetAudience, setTargetAudience] = useState('Gen Z Trendsetters');
    const [customAudience, setCustomAudience] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [batchSize, setBatchSize] = useState(1);
    const [language, setLanguage] = useState('en');

    // Reference images (up to 10 product images)
    const [referenceImages, setReferenceImages] = useState([]);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = useRef(null);

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [pollMsg, setPollMsg] = useState('');
    const [generatedResults, setGeneratedResults] = useState([]);
    const [activeHeroImage, setActiveHeroImage] = useState(null);

    // Lightbox / Inpainting
    const [zoomedImage, setZoomedImage] = useState(null);
    const [inpaintOpen, setInpaintOpen] = useState(false);
    const [inpaintTarget, setInpaintTarget] = useState(null);

    // User History Key
    const adsHistoryKey = currentUserId ? `ads_studio_history_${currentUserId}` : 'ads_studio_history_guest';
    const [history, setHistory] = useState([]);

    // Load History
    useEffect(() => {
        try {
            const saved = localStorage.getItem(adsHistoryKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                setHistory(parsed);
                if (parsed.length > 0 && !activeHeroImage) {
                    setActiveHeroImage(parsed[0].url);
                }
            }
        } catch (_) {}
    }, [adsHistoryKey]);

    const activeEngineObj = WORKFLOW_ENGINES.find(e => e.id === engine) || WORKFLOW_ENGINES[0];
    const totalCreditsRequired = (activeEngineObj?.cost || 3) * batchSize;

    // Handle Image Upload
    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const availableSlots = 10 - referenceImages.length;
        if (availableSlots <= 0) {
            alert('Maximum 10 reference images allowed.');
            return;
        }

        const toUpload = files.slice(0, availableSlots);
        setIsUploadingImage(true);

        try {
            for (const file of toUpload) {
                const formData = new FormData();
                formData.append('image', file);
                formData.append('userId', currentUserId || 'anonymous');

                const resp = await fetch(getApiUrl('/api/ads-studio/upload-asset'), {
                    method: 'POST',
                    body: formData
                });

                const data = await resp.json();
                if (data.url) {
                    setReferenceImages(prev => [...prev, data.url]);
                }
            }
        } catch (err) {
            console.error('[AdsStudio] Upload failed:', err);
            alert('Failed to upload product image: ' + err.message);
        } finally {
            setIsUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeReferenceImage = (idx) => {
        setReferenceImages(prev => prev.filter((_, i) => i !== idx));
    };

    // Trigger Ad Generation
    const handleGenerate = async () => {
        if (!prompt.trim()) {
            alert('Please describe your creative brief or ad vision first.');
            return;
        }

        if (userCredits < totalCreditsRequired) {
            alert(`Insufficient Shorts! You need ${totalCreditsRequired}⚡, but you have ${userCredits}⚡. Please top up your credits.`);
            useAppStore.getState().setActiveTab('pricing');
            return;
        }

        setIsGenerating(true);
        setPollMsg('Submitting brief to Ads Studio workflow...');

        const finalNiche = customNiche.trim() || niche;
        const finalAudience = customAudience.trim() || targetAudience;

        try {
            const resp = await fetch(getApiUrl('/api/ads-studio/generate'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': currentUserId || 'anonymous'
                },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    niche: finalNiche,
                    target_audience: finalAudience,
                    language,
                    aspect_ratio: aspectRatio,
                    batch_size: batchSize,
                    image_urls: referenceImages,
                    engine,
                    sync: true
                })
            });

            const data = await resp.json();
            if (!resp.ok || !data.success) {
                throw new Error(data.error || 'Ad generation failed.');
            }

            const images = data.images || [];
            if (images.length === 0) {
                throw new Error('No images returned by Ads Studio.');
            }

            setGeneratedResults(images);
            setActiveHeroImage(images[0].url);

            // Save to Unified Assets & History
            const newHistoryItems = images.map((img, i) => {
                const asset = {
                    url: img.url,
                    ts: Date.now() + i,
                    aspect: aspectRatio,
                    type: 'image',
                    folder: 'marketing-ads',
                    prompt: prompt.trim(),
                    niche: finalNiche,
                    target_audience: finalAudience,
                    engine
                };
                useAppStore.getState().addUnifiedAsset(asset);
                return asset;
            });

            setHistory(prev => {
                const updated = [...newHistoryItems, ...prev].slice(0, 50);
                try { localStorage.setItem(adsHistoryKey, JSON.stringify(updated)); } catch (_) {}
                return updated;
            });

            refreshShorts();
        } catch (err) {
            console.error('[AdsStudio] Generation failed:', err);
            alert('Generation failed: ' + (err.message || 'Unknown error'));
        } finally {
            setIsGenerating(false);
            setPollMsg('');
        }
    };

    // Download Asset Helper
    const downloadAsset = async (url) => {
        try {
            const filename = `ads-studio-${Date.now()}.png`;
            const proxyUrl = getApiUrl(`/api/proxy-image?url=${encodeURIComponent(url)}`);
            const resp = await fetch(proxyUrl);
            if (!resp.ok) throw new Error('Proxy failed');
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);
        } catch (_) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    // Send Image to Seedance Video Motion
    const handleAnimateWithSeedance = (imageUrl) => {
        useAppStore.getState().setActiveTab('cinematic-studio');
        const showToast = useAppStore.getState().showToast;
        if (showToast) showToast('Opening Cinema Studio with Ad Creative as keyframe!', 'info');
    };

    return (
        <div className="h-full w-full flex flex-col bg-[#070709] text-white font-sans overflow-hidden select-none">
            {/* Hidden file input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept="image/*" 
                multiple 
            />

            {/* Top Workspace Header */}
            <header className="h-14 border-b border-white/10 bg-[#0c0c12]/80 backdrop-blur-xl px-5 flex items-center justify-between shrink-0 z-20">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBackToMarketing || (() => useAppStore.getState().setActiveTab('marketing'))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-bold transition-all group"
                        title="Return to Marketing Studio"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                        <span>Marketing Studio</span>
                    </button>

                    <div className="h-4 w-px bg-white/10 mx-1" />

                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500/20 via-pink-500/20 to-[#c8f135]/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                            <Sparkles size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm font-black uppercase tracking-wider text-white">Ads Studio</h1>
                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400">
                                    Brief-to-Ad Workflow
                                </span>
                            </div>
                            <p className="text-[10px] text-white/40 font-medium">Bring your product, describe your vision, generate ready-to-use ads</p>
                        </div>
                    </div>
                </div>

                {/* Right controls: Shorts Balance & Docs */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#c8f135]/10 border border-[#c8f135]/30 text-[#c8f135] text-xs font-mono font-bold">
                        <span>⚡</span>
                        <span>{userCredits.toLocaleString()} Shorts</span>
                    </div>

                    <a 
                        href="https://console.higgsfield.ai/models/higgsfield/ads-studio/v1.0" 
                        target="_blank" 
                        rel="noreferrer"
                        className="hidden sm:flex items-center gap-1 text-[11px] text-white/40 hover:text-white/80 transition-colors"
                    >
                        <span>Workflow API Specs</span>
                        <ExternalLink size={11} />
                    </a>
                </div>
            </header>

            {/* Main Content: Split Studio */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Controls Panel */}
                <aside className="w-[440px] border-r border-white/10 bg-[#0a0a0f] flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
                    <div className="p-5 space-y-6">
                        {/* 1. Workflow Engine Selector */}
                        <div>
                            <label className="text-[11px] font-black uppercase tracking-wider text-white/50 mb-2 flex items-center justify-between">
                                <span>1. Select Creative Engine</span>
                                <span className="text-[10px] text-[#c8f135] font-mono">Cost: {activeEngineObj?.cost}⚡ / ad</span>
                            </label>

                            <div className="grid grid-cols-2 gap-2">
                                {WORKFLOW_ENGINES.map((eng) => {
                                    const isSel = engine === eng.id;
                                    return (
                                        <button
                                            key={eng.id}
                                            onClick={() => setEngine(eng.id)}
                                            className={cn(
                                                "p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer",
                                                isSel 
                                                    ? "bg-[#c8f135]/10 border-[#c8f135] shadow-[0_0_15px_rgba(200,241,53,0.15)]" 
                                                    : "bg-[#111118] border-white/10 hover:border-white/20 text-white/70"
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-1 mb-1">
                                                <span className="text-base">{eng.icon}</span>
                                                <span className={cn(
                                                    "text-[8px] font-black uppercase px-1.5 py-0.5 rounded border",
                                                    isSel ? "bg-[#c8f135]/20 text-[#c8f135] border-[#c8f135]/40" : "bg-white/5 text-white/40 border-white/10"
                                                )}>
                                                    {eng.badge}
                                                </span>
                                            </div>
                                            <div>
                                                <p className={cn("text-xs font-bold truncate", isSel ? "text-white" : "text-white/80")}>
                                                    {eng.name}
                                                </p>
                                                <p className="text-[9px] text-white/40 font-mono mt-0.5">
                                                    ⚡ {eng.cost} Shorts
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Creative Brief / Prompt */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[11px] font-black uppercase tracking-wider text-white/50">
                                    2. Creative Brief / Vision
                                </label>
                                <span className="text-[10px] text-white/30 font-mono">{prompt.length}/8000</span>
                            </div>

                            <div className="relative">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Describe your ad concept (e.g. A luxury perfume bottle resting on black volcanic sand at golden hour, rim lighting, sleek mist...)"
                                    rows={4}
                                    className="w-full bg-[#111118] border border-white/15 focus:border-[#c8f135] rounded-xl p-3 text-xs text-white placeholder-white/25 outline-none resize-none transition-all leading-relaxed"
                                />
                            </div>

                            {/* Preset Pills */}
                            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Presets:</span>
                                {PROMPT_PRESETS.map((p, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setPrompt(p.prompt)}
                                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all font-medium"
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 3. Product Reference Images (Up to 10) */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[11px] font-black uppercase tracking-wider text-white/50">
                                    3. Product Reference Images
                                </label>
                                <span className="text-[10px] text-[#c8f135] font-mono">
                                    {referenceImages.length} / 10 images
                                </span>
                            </div>

                            {/* Dropzone */}
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border border-dashed border-white/20 hover:border-[#c8f135]/60 hover:bg-[#c8f135]/5 rounded-xl p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 bg-[#111118]"
                            >
                                <Upload size={18} className="text-white/40 group-hover:text-[#c8f135]" />
                                <span className="text-xs font-bold text-white/80">Click or Drag Product Photos</span>
                                <span className="text-[9px] text-white/40">Upload clean packshots, angles, or bottles (max 10)</span>
                            </div>

                            {/* Thumbnails strip */}
                            {referenceImages.length > 0 && (
                                <div className="mt-2.5 grid grid-cols-5 gap-2">
                                    {referenceImages.map((imgUrl, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-white/20 group">
                                            <img src={imgUrl} alt="Product Ref" className="w-full h-full object-cover" />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeReferenceImage(idx); }}
                                                className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 hover:bg-red-500 text-white transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 4. Industry Niche */}
                        <div>
                            <label className="text-[11px] font-black uppercase tracking-wider text-white/50 mb-2 block">
                                4. Industry Niche
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {NICHES.map((n) => {
                                    const isSel = niche === n && !customNiche;
                                    return (
                                        <button
                                            key={n}
                                            onClick={() => { setNiche(n); setCustomNiche(''); }}
                                            className={cn(
                                                "text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer",
                                                isSel 
                                                    ? "bg-[#c8f135]/15 border-[#c8f135] text-[#c8f135]" 
                                                    : "bg-[#111118] border-white/10 hover:border-white/25 text-white/70"
                                            )}
                                        >
                                            {n}
                                        </button>
                                    );
                                })}
                            </div>
                            <input
                                type="text"
                                value={customNiche}
                                onChange={(e) => setCustomNiche(e.target.value)}
                                placeholder="Or enter custom niche (e.g. Artisanal Candle Maker)..."
                                className="mt-2 w-full bg-[#111118] border border-white/10 focus:border-[#c8f135] rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/25 outline-none"
                            />
                        </div>

                        {/* 5. Target Audience */}
                        <div>
                            <label className="text-[11px] font-black uppercase tracking-wider text-white/50 mb-2 block">
                                5. Target Audience
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {TARGET_AUDIENCES.map((aud) => {
                                    const isSel = targetAudience === aud && !customAudience;
                                    return (
                                        <button
                                            key={aud}
                                            onClick={() => { setTargetAudience(aud); setCustomAudience(''); }}
                                            className={cn(
                                                "text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer",
                                                isSel 
                                                    ? "bg-[#c8f135]/15 border-[#c8f135] text-[#c8f135]" 
                                                    : "bg-[#111118] border-white/10 hover:border-white/25 text-white/70"
                                            )}
                                        >
                                            {aud}
                                        </button>
                                    );
                                })}
                            </div>
                            <input
                                type="text"
                                value={customAudience}
                                onChange={(e) => setCustomAudience(e.target.value)}
                                placeholder="Or custom audience (e.g. Coffee lovers in urban cities)..."
                                className="mt-2 w-full bg-[#111118] border border-white/10 focus:border-[#c8f135] rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/25 outline-none"
                            />
                        </div>

                        {/* 6. Aspect Ratio */}
                        <div>
                            <label className="text-[11px] font-black uppercase tracking-wider text-white/50 mb-2 block">
                                6. Aspect Ratio
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {ASPECT_RATIOS.map((ar) => {
                                    const isSel = aspectRatio === ar.id;
                                    return (
                                        <button
                                            key={ar.id}
                                            onClick={() => setAspectRatio(ar.id)}
                                            className={cn(
                                                "p-2.5 rounded-xl border text-center transition-all cursor-pointer",
                                                isSel 
                                                    ? "bg-[#c8f135]/15 border-[#c8f135] text-white" 
                                                    : "bg-[#111118] border-white/10 hover:border-white/20 text-white/70"
                                            )}
                                        >
                                            <p className={cn("text-xs font-bold", isSel ? "text-[#c8f135]" : "text-white")}>
                                                {ar.id}
                                            </p>
                                            <p className="text-[9px] text-white/40 truncate mt-0.5">{ar.sub}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 7. Batch Size (1 to 8 variations) */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[11px] font-black uppercase tracking-wider text-white/50">
                                    7. Batch Size (Variations)
                                </label>
                                <span className="text-xs font-mono font-bold text-[#c8f135]">
                                    {batchSize} {batchSize === 1 ? 'Ad Creative' : 'Ad Creatives'}
                                </span>
                            </div>
                            <input
                                type="range"
                                min={1}
                                max={8}
                                value={batchSize}
                                onChange={(e) => setBatchSize(Number(e.target.value))}
                                className="w-full accent-[#c8f135] cursor-pointer"
                            />
                            <div className="flex justify-between text-[9px] text-white/30 font-mono mt-1">
                                <span>1</span>
                                <span>2</span>
                                <span>4</span>
                                <span>6</span>
                                <span>8 Ads</span>
                            </div>
                        </div>

                        {/* Generate Action Button */}
                        <div className="pt-2 sticky bottom-0 bg-[#0a0a0f] pb-3 z-10">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !prompt.trim()}
                                className={cn(
                                    "w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer",
                                    isGenerating || !prompt.trim()
                                        ? "bg-white/10 text-white/30 cursor-not-allowed"
                                        : "bg-gradient-to-r from-[#c8f135] via-emerald-400 to-[#c8f135] text-black hover:scale-[1.02] active:scale-[0.98] shadow-[#c8f135]/20 hover:shadow-[#c8f135]/40"
                                )}
                            >
                                {isGenerating ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        <span>{pollMsg || 'Generating Ads...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <Wand2 size={16} />
                                        <span>Generate {batchSize} Ad{batchSize > 1 ? 's' : ''} ({totalCreditsRequired}⚡ Shorts)</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Right Visual Workspace */}
                <main className="flex-1 bg-[#070709] flex flex-col overflow-hidden relative">
                    {/* Background subtle glow */}
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-500/5 rounded-full blur-[140px] pointer-events-none -z-10" />

                    {/* Hero Preview & Results */}
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col items-center">
                        {activeHeroImage ? (
                            <div className="max-w-4xl w-full flex flex-col items-center gap-4">
                                {/* Hero Active Image */}
                                <div className="relative group rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl max-h-[65vh] flex items-center justify-center">
                                    <img 
                                        src={activeHeroImage} 
                                        alt="Generated Ad" 
                                        className="max-h-[65vh] w-auto object-contain rounded-2xl"
                                    />

                                    {/* Overlay Quick Action Bar */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0c0c12]/90 backdrop-blur-xl border border-white/15 px-3 py-1.5 rounded-2xl flex items-center gap-2 shadow-2xl opacity-0 group-hover:opacity-100 transition-all">
                                        <button 
                                            onClick={() => setZoomedImage(activeHeroImage)}
                                            className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                                            title="Zoom Fullscreen"
                                        >
                                            <ZoomIn size={16} />
                                        </button>
                                        <button 
                                            onClick={() => downloadAsset(activeHeroImage)}
                                            className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                                            title="Download HD Image"
                                        >
                                            <Download size={16} />
                                        </button>
                                        <button 
                                            onClick={() => { setInpaintTarget(activeHeroImage); setInpaintOpen(true); }}
                                            className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                                            title="Inpaint / Edit Area"
                                        >
                                            <Sliders size={16} />
                                        </button>
                                        <div className="h-4 w-px bg-white/20" />
                                        <button 
                                            onClick={() => handleAnimateWithSeedance(activeHeroImage)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white text-xs font-black uppercase tracking-wider hover:scale-105 transition-all shadow-lg shadow-fuchsia-500/20"
                                            title="Animate into Video Ad using Seedance"
                                        >
                                            <Film size={14} />
                                            <span>Animate to Video</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Batch Grid if multiple generated */}
                                {generatedResults.length > 1 && (
                                    <div className="w-full">
                                        <p className="text-[11px] font-black uppercase tracking-wider text-white/40 mb-2">
                                            Batch Variations ({generatedResults.length})
                                        </p>
                                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                                            {generatedResults.map((res, i) => {
                                                const isHero = activeHeroImage === res.url;
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => setActiveHeroImage(res.url)}
                                                        className={cn(
                                                            "relative aspect-square rounded-xl overflow-hidden border transition-all cursor-pointer group",
                                                            isHero ? "border-[#c8f135] ring-2 ring-[#c8f135]/40" : "border-white/10 hover:border-white/30"
                                                        )}
                                                    >
                                                        <img src={res.url} alt={`Var ${i + 1}`} className="w-full h-full object-cover" />
                                                        <span className="absolute bottom-1 right-1 text-[8px] font-mono px-1 rounded bg-black/60 text-white/80">
                                                            #{i + 1}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md p-6">
                                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-rose-500/20 via-pink-500/10 to-[#c8f135]/20 border border-white/10 flex items-center justify-center text-rose-400 mb-4 shadow-xl">
                                    <Sparkles size={28} />
                                </div>
                                <h3 className="text-lg font-black uppercase tracking-wide text-white">Ads Studio Canvas</h3>
                                <p className="text-xs text-white/40 mt-1 leading-relaxed">
                                    Fill in your brief on the left, add optional product photos, and choose your preferred engine to generate high-converting commercial creatives.
                                </p>
                            </div>
                        )}

                        {/* Recent History Bar */}
                        {history.length > 0 && (
                            <div className="w-full max-w-4xl mt-8 pt-4 border-t border-white/10">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-[11px] font-black uppercase tracking-wider text-white/40">Recent Ads Studio History</h4>
                                    <span className="text-[10px] text-white/30 font-mono">{history.length} creatives</span>
                                </div>
                                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                                    {history.slice(0, 8).map((item, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => setActiveHeroImage(item.url)}
                                            className="relative aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-[#c8f135] transition-all cursor-pointer group"
                                        >
                                            <img src={item.url} alt="History" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Eye size={16} className="text-white" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Lightbox Modal */}
            <AnimatePresence>
                {zoomedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setZoomedImage(null)}
                        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6"
                    >
                        <button
                            onClick={() => setZoomedImage(null)}
                            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                        >
                            <X size={20} />
                        </button>
                        <img 
                            src={zoomedImage} 
                            alt="Fullscreen Ad" 
                            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl border border-white/15"
                            onClick={(e) => e.stopPropagation()} 
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Inpaint Editor */}
            {inpaintOpen && inpaintTarget && (
                <InpaintEditor
                    imageUrl={inpaintTarget}
                    userId={currentUserId}
                    onClose={() => setInpaintOpen(false)}
                    onDone={(newUrl) => {
                        setActiveHeroImage(newUrl);
                        setInpaintOpen(false);
                    }}
                />
            )}
        </div>
    );
}
