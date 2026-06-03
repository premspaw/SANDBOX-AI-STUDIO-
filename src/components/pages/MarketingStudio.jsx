import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Upload, Wand2, Code, X, Building, Utensils, Stethoscope, Briefcase, ChevronRight, ChevronLeft, Loader2, Play, Plus, Check, Link, Trash2, ZoomIn, ExternalLink, HardDrive, Pencil, Layers, Sparkles, Video, Expand, LayoutGrid } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../../lib/utils';
import { useShorts } from '../../hooks/useShorts';
import { useAppStore } from '../../store';
import { InpaintEditor } from '../common/InpaintEditor';
import { getApiUrl } from '../../config/apiConfig';

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

// GPT Image 2 cost in ₹ with 50% margin (size: 1024x1536)
const USD_TO_INR = 84;
const OPENAI_COST = { low: 0.005, medium: 0.041, high: 0.165 };
const getGenerateCostINR = (quality) => {
    const usd = (OPENAI_COST[quality] || OPENAI_COST.medium) * 1.5;
    return (usd * USD_TO_INR).toFixed(2);
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

// ── Add-Template Modal ──────────────────────────────────────────────────────
function AddTemplateModal({ category, onClose, onSave, userId, userEmail }) {
    const [name, setName]         = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [previewSrc, setPreviewSrc] = useState('');
    const [prompt, setPrompt]     = useState('');
    const [aspect, setAspect]     = useState('16/9');
    const [tab, setTab]           = useState('url'); // 'url' | 'upload'
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedBucket, setUploadedBucket] = useState(null);
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const uploadRef = useRef(null);
    const finalUrlRef = useRef(''); // always holds latest R2/proxy URL

    const addTag = (v) => { const t = v.trim().toLowerCase(); if (t && !tags.includes(t)) setTags(prev => [...prev, t]); setTagInput(''); };
    const removeTag = (i) => setTags(prev => prev.filter((_, idx) => idx !== i));

    const handleFileRead = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const base64 = ev.target.result;
            setPreviewSrc(base64); // show preview immediately
            setImageUrl(base64);   // temp until R2 URL comes back
            setIsUploading(true);
            setUploadedBucket(null);
            try {
                const resp = await fetch(getApiUrl('/api/marketing/upload-reference'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64, userId, userEmail, isTemplate: true })
                });
                const data = await resp.json();
                if (data.url) {
                    setImageUrl(data.url);
                    setPreviewSrc(data.url); // swap base64 preview → proxy URL
                    finalUrlRef.current = data.url;
                    setUploadedBucket(data.bucket);
                }
            } catch (err) {
                console.error('[AddTemplate] R2 upload failed:', err);
            } finally {
                setIsUploading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleUrlChange = (v) => { setImageUrl(v); setPreviewSrc(v); finalUrlRef.current = v; setUploadedBucket(null); };

    const canSave = name.trim() && imageUrl.trim() && prompt.trim() && !isUploading;

    const save = () => {
        const resolvedUrl = finalUrlRef.current || imageUrl;
        console.log('[DEBUG] Saving template with URL:', resolvedUrl?.slice(0, 100));
        onSave({
            id: `custom_${Date.now()}`,
            name: name.trim(),
            imageUrl: resolvedUrl,
            prompt: prompt.trim(),
            aspect,
            tags,
            isCustom: true,
        });
        onClose();
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ scale: 0.92, y: 30 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.92, y: 30 }}
                    className="w-full max-w-lg bg-[#111114] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                        <div>
                            <h3 className="font-black text-white uppercase tracking-wider text-sm">Add New Template</h3>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">{category} category</p>
                        </div>
                        <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                            <X className="w-4 h-4 text-white/60" />
                        </button>
                    </div>

                    <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                        {/* Name */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Template Name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Spicy Ramen Bowl"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/90 focus:border-orange-500/50 outline-none"
                            />
                        </div>

                        {/* Aspect */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Aspect Ratio</label>
                            <div className="flex gap-2">
                                {['16/9', '9/16', '1/1'].map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setAspect(r)}
                                        className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                            aspect === r ? 'bg-orange-500 text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'
                                        }`}
                                    >{r}</button>
                                ))}
                            </div>
                        </div>

                        {/* Image Source Tabs */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Image Source</label>
                            <div className="flex gap-1 bg-black/30 p-1 rounded-xl">
                                <button onClick={() => setTab('url')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase transition-all ${ tab === 'url' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60' }`}>
                                    <Link className="w-3 h-3" /> URL
                                </button>
                                <button onClick={() => setTab('upload')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase transition-all ${ tab === 'upload' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60' }`}>
                                    <Upload className="w-3 h-3" /> Upload
                                </button>
                            </div>

                            {tab === 'url' ? (
                                <input
                                    value={imageUrl}
                                    onChange={(e) => handleUrlChange(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/90 focus:border-orange-500/50 outline-none"
                                />
                            ) : (
                                <button
                                    onClick={() => uploadRef.current?.click()}
                                    className="w-full border-2 border-dashed border-white/20 hover:border-orange-400/50 rounded-xl py-4 flex items-center justify-center gap-2 text-sm text-white/50 hover:text-white/80 transition-all"
                                >
                                    <Upload className="w-4 h-4" />
                                    {previewSrc && tab === 'upload' ? 'Change Image' : 'Click to Upload'}
                                </button>
                            )}
                            <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleFileRead} />

                            {/* Preview */}
                            {previewSrc && (
                                <div className="relative rounded-xl overflow-hidden bg-black/30 border border-white/10 max-h-40">
                                    <img src={previewSrc} alt="preview" className="w-full h-full object-cover max-h-40" />
                                    <button
                                        onClick={() => { setPreviewSrc(''); setImageUrl(''); setUploadedBucket(null); }}
                                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-500/80 transition-colors"
                                    ><X className="w-3 h-3 text-white" /></button>
                                    {isUploading ? (
                                        <span className="absolute bottom-2 left-2 flex items-center gap-1 text-[9px] text-yellow-300 bg-black/60 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest">
                                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Uploading to R2…
                                        </span>
                                    ) : uploadedBucket ? (
                                        <span className="absolute bottom-2 left-2 flex items-center gap-1 text-[9px] text-lime-300 bg-black/60 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest">
                                            <HardDrive className="w-2.5 h-2.5" /> R2 · {uploadedBucket}
                                        </span>
                                    ) : (
                                        <span className="absolute bottom-2 left-2 text-[9px] text-white/60 bg-black/50 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest">Preview only</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Tags */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Tags <span className="text-white/20 normal-case font-normal">(for filtering)</span></label>
                            <div className="flex gap-2">
                                <input
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); } }}
                                    placeholder="e.g. promo, sale, festive..."
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 focus:border-orange-500/40 outline-none placeholder:text-white/20"
                                />
                                <button onClick={() => addTag(tagInput)} className="px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-xl text-orange-400 text-xs font-bold uppercase transition-colors">
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {tags.map((t, i) => (
                                        <span key={i} onClick={() => removeTag(i)} className="inline-flex items-center gap-1 text-[10px] bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full text-orange-300 font-bold cursor-pointer hover:bg-red-500/20 hover:text-red-300 transition-colors">
                                            #{t} <X className="w-2.5 h-2.5" />
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Prompt */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Generation Prompt</label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe your desired marketing asset in detail..."
                                rows={4}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/90 focus:border-orange-500/50 outline-none resize-none"
                            />
                        </div>
                    </div>

                    {/* Footer - sticky at bottom */}
                    <div className="px-6 pb-6 pt-3 flex gap-3 border-t border-white/10 bg-[#111114] flex-none">
                        <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 font-bold text-sm uppercase tracking-wider transition-all">Cancel</button>
                        <button
                            onClick={save}
                            disabled={!canSave}
                            className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${
                                canSave ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-black hover:scale-[1.02] shadow-lg' : 'bg-white/5 text-white/20 cursor-not-allowed'
                            }`}
                        >
                            Save Template
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
// ────────────────────────────────────────────────────────────────────────────

// ── InpaintEditor ────────────────────────────────────────────────────────────

export default function MarketingStudio() {
    const userProfile = useAppStore(state => state.userProfile);
    const currentUserId = userProfile?.id || null;
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
    const [videoEngine, setVideoEngine] = useState('veo3');
    const [videoDuration, setVideoDuration] = useState(8);
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
    const [showTemplatePanel, setShowTemplatePanel] = useState(true);

    const openZoom = (img, idx) => { setZoomedImage(img); setZoomedIndex(idx ?? null); };
    const closeZoom = () => { setZoomedImage(null); setZoomedIndex(null); };

    // Custom templates: { [categoryId]: Template[] }
    const [customTemplates, setCustomTemplates] = useState({ food: [], restaurant: [], realestate: [], medical: [], other: [] });
    const [showAddModal, setShowAddModal] = useState(false);
    const [templatesLoading, setTemplatesLoading] = useState(true);

    // Recipe Infographic State
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

    // Real Estate data state
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

    // Medical / Clinic data state
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
    const GH_KEY = 'marketing_generation_history';
    const [generationHistory, setGenerationHistory] = useState(() => {
        try {
            const saved = localStorage.getItem('marketing_generation_history');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    const [gallerySearch, setGallerySearch] = useState('');
    const [activeTag, setActiveTag] = useState(null);

    const LS_KEY = 'marketing_custom_templates';

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
        } catch (_) {}

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
                // Merge server templates with browser localStorage to protect saved templates on port changes
                const hasRows = Object.values(grouped).some(arr => arr.length > 0);
                if (hasRows) {
                    let localCached = { food: [], restaurant: [], realestate: [], medical: [], other: [] };
                    try {
                        const cached = localStorage.getItem(LS_KEY);
                        if (cached) {
                            const parsed = JSON.parse(cached);
                            if (parsed && typeof parsed === 'object') {
                                localCached = parsed;
                            }
                        }
                    } catch (_) {}

                    const merged = { food: [], restaurant: [], realestate: [], medical: [], other: [] };
                    const categories = ['food', 'restaurant', 'realestate', 'medical', 'other'];
                    
                    categories.forEach(cat => {
                        const dbTemplates = grouped[cat] || [];
                        const localTemplates = localCached[cat] || [];
                        
                        const uniqueTemplates = [];
                        const seenUrls = new Set();
                        
                        // DB templates take priority
                        dbTemplates.forEach(t => {
                            if (t.imageUrl && !seenUrls.has(t.imageUrl)) {
                                seenUrls.add(t.imageUrl);
                                uniqueTemplates.push(t);
                            }
                        });
                        
                        // Merge with local templates, retaining original prompts and names
                        localTemplates.forEach(t => {
                            if (t.imageUrl && !seenUrls.has(t.imageUrl)) {
                                seenUrls.add(t.imageUrl);
                                uniqueTemplates.push(t);
                            }
                        });
                        
                        merged[cat] = uniqueTemplates;
                    });

                    setCustomTemplates(merged);
                    localStorage.setItem(LS_KEY, JSON.stringify(merged));
                }
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
            try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch (_) {}
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
            try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch (_) {}
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

    const addIngredient = () => {
        const val = ingredientInput.trim();
        if (val && !specialIngredients.includes(val)) {
            setSpecialIngredients(prev => [...prev, val]);
        }
        setIngredientInput('');
    };
    const removeIngredient = (idx) => setSpecialIngredients(prev => prev.filter((_, i) => i !== idx));

    const shortsHook = useShorts() || {};
    const deductShorts = typeof shortsHook.deductShorts === 'function' ? shortsHook.deductShorts : async () => true;

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

    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

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

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target.result;
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
                secondImage: logoImage
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
                image: generatedImage
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
        if (generateMode === 'video') {
            setIsGenerating(true);
            try {
                const ai = getAI();

                // Get active image (firstFrame, reference, or uploaded)
                const activeImage = firstFrame || referenceImageBase64 || referenceImage || null;
                if (!activeImage) { alert('Please upload a First Frame image for video generation.'); setIsGenerating(false); return; }

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

                const videoRequest = {
                    model: videoEngine === 'veo3' ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview',
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

                // Download video using API key
                const apiKey = getApiKey();
                const response = await fetch(downloadLink, {
                    method: 'GET',
                    headers: { 'x-goog-api-key': apiKey },
                });
                if (!response.ok) throw new Error(`Download failed: ${response.status}`);

                const blob = await response.blob();
                const videoUrl = URL.createObjectURL(blob);

                setGenerationHistory(prev => {
                    const next = [{ url: videoUrl, ts: Date.now(), size: imageSize, type: 'video' }, ...prev].slice(0, 50);
                    try { localStorage.setItem('marketing_generation_history', JSON.stringify(next)); } catch (_) {}
                    return next;
                });
            } catch (err) {
                alert('Video generation failed: ' + (err?.message || 'Unknown error'));
            } finally {
                setIsGenerating(false);
            }
            return;
        }
        setIsGenerating(true);
        try {
            const success = await deductShorts(3, 'marketing_image_generation');
            if (!success) throw new Error("Insufficient Shorts");

            const isMedical = activeCategory === 'medical';
            const isRealEstate = activeCategory === 'realestate';

            // Convert JSON template → clean English prompt if needed
            let templateEnglish = '';
            let userInstruction = '';
            if (promptText && promptText.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(promptText);
                    const ep = parsed?.image_edit_prompt || parsed;
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
                    templateEnglish = parts.filter(Boolean).join(' ');
                } catch (_) {}
            } else {
                userInstruction = promptText?.trim() || '';
            }

            // Build the final GPT Image 2 natural language prompt
            let textPrompt = '';
            if (isRealEstate) {
                const re = realEstateData;
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
                    referenceImage ? `Use the uploaded property photo as the main visual. Enhance lighting and composition.` : `Show a premium exterior or interior shot of a ${re.property_type || 'modern property'}.`,
                    !(userInstruction || templateEnglish) ? `Luxury real estate aesthetic, golden hour or bright daylight, architectural photography style, photorealistic. No watermarks.` : `Photorealistic, high resolution. No watermarks.`
                ].filter(Boolean).join(' ');
            } else if (isMedical) {
                textPrompt = [
                    userInstruction || templateEnglish || `Create a professional medical clinic marketing poster.`,
                    medicalData.clinic_name ? `Clinic name: ${medicalData.clinic_name}.` : '',
                    medicalData.doctor_name ? `Doctor: ${medicalData.doctor_name}.` : '',
                    medicalData.specialization ? `Specialization: ${medicalData.specialization}.` : '',
                    medicalData.tagline ? `Tagline: "${medicalData.tagline}".` : '',
                    medicalData.services ? `Services offered: ${medicalData.services}.` : '',
                    `Clean, trustworthy, professional healthcare aesthetic. White and teal tones. No watermarks.`
                ].filter(Boolean).join(' ');
            } else if (!isMedical) {
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
                    referenceImage && !userInstruction && !templateEnglish ? `Match the dish appearance, plating, colors and ingredients from the reference photo exactly.` : '',
                    specialIngredients.length > 0 ? `Prominently feature: ${specialIngredients.join(', ')}.` : '',
                    `Color palette: ${brandColors[0]} and ${brandColors[1]}.`,
                    `Photorealistic, high resolution, no watermarks, no logos.`
                ].filter(Boolean).join(' ');
            }

            // Use base64 if available, otherwise fall back to URL (server can fetch GCS URLs)
            const imageToSend = referenceImageBase64 || referenceImage || undefined;
            const payload = {
                model: imageEngine,
                prompt: textPrompt,
                quality,
                size: imageSize,
                userId: currentUserId,
                image: imageToSend,
                secondImage: logoImage || undefined
            };

            console.log('[Marketing] PAYLOAD DEBUG:', {
                hasReferenceImageBase64: !!referenceImageBase64,
                hasReferenceImage: !!referenceImage,
                imageInPayload: !!payload.image,
                imageType: imageToSend?.startsWith('data:') ? 'base64' : imageToSend?.startsWith('http') ? 'url' : 'none'
            });

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
                try { localStorage.setItem('marketing_generation_history', JSON.stringify(next)); } catch (_) {}
                return next;
            });

        } catch (error) {
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
            onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setLogoImage(ev.target.result); r.readAsDataURL(f); }} />
        <input type="file" ref={firstFrameRef} className="hidden" accept="image/*"
            onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setFirstFrame(ev.target.result); r.readAsDataURL(f); }} />
        <input type="file" ref={lastFrameRef} className="hidden" accept="image/*"
            onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setLastFrame(ev.target.result); r.readAsDataURL(f); }} />
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
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-5 h-14 bg-white/5 hover:bg-white/10 border border-white/10 border-l-0 rounded-r-lg flex items-center justify-center transition-all hover:w-6 group"
                    >
                        <ChevronRight className={cn("w-3 h-3 text-white/40 group-hover:text-white/70 transition-transform duration-300", showTemplatePanel ? "" : "rotate-180")} />
                    </button>
                    {selectedTemplate ? (
                        <div className="flex-1 flex flex-col h-full overflow-hidden relative">

                            {/* ── MASONRY GALLERY (Higgsfield style) ── */}
                            <div className="flex-1 overflow-y-auto bg-[#0a0a0a] custom-scrollbar" style={{paddingBottom:'80px'}}>
                                {isGenerating && generationHistory.length === 0 ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 min-h-[300px]">
                                        <div className="relative w-20 h-20">
                                            <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                                            <div className="absolute inset-0 rounded-full border-4 border-t-lime-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                                            <Wand2 className="absolute inset-0 m-auto w-7 h-7 text-lime-400" />
                                        </div>
                                        <CyclingLoadingText messages={activeCategory === 'realestate' ? LOADING_MESSAGES_REALESTATE : LOADING_MESSAGES_DEFAULT} />
                                    </div>
                                ) : generationHistory.length > 0 ? (
                                    <div className="p-2" style={{columns:'3', columnGap:'6px'}}>
                                        {/* Generating spinner tile */}
                                        {isGenerating && (
                                            <div className="break-inside-avoid mb-1.5 rounded-lg border border-white/10 bg-white/3 flex flex-col items-center justify-center gap-2"
                                                style={{aspectRatio: (() => { const s = imageSize; if (!s || s==='auto') return '4/5'; const [w,h]=s.split('x'); return `${w}/${h}`; })()}}>
                                                <div className="relative w-7 h-7">
                                                    <div className="absolute inset-0 rounded-full border-[2px] border-t-lime-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                                                    <Wand2 className="absolute inset-0 m-auto w-3 h-3 text-lime-400" />
                                                </div>
                                                <span className="text-[7px] text-white/30 font-bold uppercase tracking-widest">Generating…</span>
                                            </div>
                                        )}
                                        {generationHistory.map((item, idx) => (
                                            <motion.div key={item.ts}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ duration: 0.3 }}
                                                className="break-inside-avoid mb-1.5 relative group rounded-lg overflow-hidden cursor-pointer"
                                                onClick={() => openZoom(item.url)}
                                            >
                                                {item.type === 'video'
                                                    ? <div className="w-full relative bg-black/60 aspect-[9/16] flex items-center justify-center">
                                                        <video src={item.url} className="w-full h-full object-cover" preload="metadata" playsInline />
                                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                            <div className="w-10 h-10 rounded-full bg-black/70 border border-white/30 flex items-center justify-center shadow-lg">
                                                                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                                                            </div>
                                                        </div>
                                                        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded-md pointer-events-none">
                                                            <Video className="w-2.5 h-2.5 text-lime-400" />
                                                            <span className="text-[8px] text-lime-300 font-black uppercase">Video</span>
                                                        </div>
                                                      </div>
                                                    : <img src={item.url} alt={`gen-${idx}`} className="w-full block" />}
                                                {/* NEW badge */}
                                                {idx === 0 && (
                                                    <span className="absolute top-1.5 left-1.5 text-[7px] bg-lime-400 text-black font-black px-1 py-0.5 rounded uppercase tracking-wider z-10">New</span>
                                                )}
                                                {/* Hover overlay */}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                                                    <div className="flex gap-1.5">
                                                        <button title="Zoom" onClick={e => { e.stopPropagation(); openZoom(item.url); }}
                                                            className="w-9 h-9 flex items-center justify-center bg-black/80 hover:bg-white/25 rounded-xl text-white border border-white/20 transition-all shadow-lg">
                                                            <ZoomIn className="w-4 h-4" />
                                                        </button>
                                                        <button title="Save" onClick={e => { e.stopPropagation(); const ext = item.type === 'video' ? 'mp4' : 'png'; const a = document.createElement('a'); a.href = item.url; a.download = `asset-${item.ts}.${ext}`; document.body.appendChild(a); a.click(); document.body.removeChild(a); }}
                                                            className="w-9 h-9 flex items-center justify-center bg-black/80 hover:bg-white/25 rounded-xl text-white text-sm font-black border border-white/20 transition-all shadow-lg">
                                                            ↓
                                                        </button>
                                                        {item.type !== 'video' && (
                                                        <button title="Edit" onClick={e => { e.stopPropagation(); setGeneratedImage(item.url); setInpaintOpen(true); }}
                                                            className="w-9 h-9 flex items-center justify-center bg-purple-600/90 hover:bg-purple-500 rounded-xl text-white border border-purple-400/40 transition-all shadow-lg">
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        )}
                                                        {/* FF / LF — only for images */}
                                                        {item.type !== 'video' && (
                                                            <>
                                                                <button title="Set as First Frame" onClick={e => { e.stopPropagation(); setFirstFrame(item.url); }}
                                                                    className="w-9 h-9 flex items-center justify-center bg-blue-600/80 hover:bg-blue-500 rounded-xl text-white text-[9px] font-black border border-blue-400/40 transition-all shadow-lg">
                                                                    FF
                                                                </button>
                                                                <button title="Set as Last Frame" onClick={e => { e.stopPropagation(); setLastFrame(item.url); }}
                                                                    className="w-9 h-9 flex items-center justify-center bg-indigo-600/80 hover:bg-indigo-500 rounded-xl text-white text-[9px] font-black border border-indigo-400/40 transition-all shadow-lg">
                                                                    LF
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 select-none min-h-[300px]">
                                        <div className="relative rounded-2xl border-2 border-dashed border-white/10 bg-white/2 flex flex-col items-center justify-center gap-4"
                                            style={{ width: 'min(320px, 80%)', aspectRatio: '4/5', maxHeight: '55vh' }}>
                                            <img src={selectedTemplate.imageUrl} alt={selectedTemplate.name}
                                                className="absolute inset-0 w-full h-full object-cover rounded-2xl opacity-15" />
                                            <div className="relative z-10 flex flex-col items-center gap-2 px-6 text-center">
                                                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                                    <ImageIcon className="w-7 h-7 text-white/20" />
                                                </div>
                                                <p className="text-white/30 text-xs font-bold uppercase tracking-widest">Generated images appear here</p>
                                                <p className="text-white/15 text-[10px]">{selectedTemplate.name} · {selectedTemplate.aspect}</p>
                                            </div>
                                        </div>
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
                                                        ? <img src={firstFrame} className="w-full h-full object-cover rounded" alt="first" />
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
                                                        ? <img src={lastFrame} className="w-full h-full object-cover rounded" alt="last" />
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
                                                    <img src={referenceImage} className="w-full h-full object-cover" alt="ref" />
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

                                        {/* Upload logo */}
                                        <button onClick={() => logoInputRef.current?.click()}
                                            className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
                                                logoImage ? "text-orange-400 bg-orange-500/10 border border-orange-500/30" : "text-white/30 hover:text-white/60 hover:bg-white/5 border border-transparent")}>
                                            <Layers className="w-3 h-3" />
                                            {logoImage ? 'Logo ✓' : 'Logo'}
                                        </button>

                                        {/* Size */}
                                        <select value={imageSize} onChange={e => setImageSize(e.target.value)}
                                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white/40 outline-none hover:border-white/20 transition-all">
                                            <option value="auto">Auto</option>
                                            <option value="1024x1792">Story</option>
                                            <option value="1024x1536">Portrait</option>
                                            <option value="1024x1024">Square</option>
                                            <option value="1536x1024">Landscape</option>
                                            <option value="1792x1024">Wide</option>
                                            <option value="1536x2048">Poster</option>
                                        </select>

                                        {/* Quality */}
                                        <select value={quality} onChange={e => setQuality(e.target.value)}
                                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white/40 outline-none hover:border-white/20 transition-all">
                                            <option value="low">Fast</option>
                                            <option value="medium">HD</option>
                                            <option value="high">Max</option>
                                        </select>

                                        {/* Engine dropdown — always visible, options change by mode */}
                                        {generateMode === 'image' ? (
                                            <select value={imageEngine} onChange={e => setImageEngine(e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white/60 outline-none hover:border-white/20 transition-all">
                                                <option value="gpt-image-2">GPT-2</option>
                                                <option value="nano-banana-2">NB2</option>
                                            </select>
                                        ) : (
                                            <>
                                            <select value={videoEngine} onChange={e => setVideoEngine(e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white/60 outline-none hover:border-white/20 transition-all">
                                                <option value="veo3">Veo 3</option>
                                                <option value="seedance2">Seedance 2</option>
                                            </select>
                                            <select value={videoDuration} onChange={e => setVideoDuration(Number(e.target.value))}
                                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white/60 outline-none hover:border-white/20 transition-all">
                                                <option value={4}>4s</option>
                                                <option value={6}>6s</option>
                                                <option value={8}>8s</option>
                                            </select>
                                            </>
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
                                                   <span className="bg-black/20 rounded px-1 py-0.5 text-[9px] font-black normal-case tracking-normal">✦ 3</span>
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
                            <button
                                onClick={(e) => { e.stopPropagation(); setGeneratedImage(zoomedImage); setInpaintOpen(true); closeZoom(); }}
                                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600/90 hover:bg-purple-500 rounded-xl text-xs font-black text-white border border-purple-400/40 transition-all shadow-xl shadow-purple-900/30"
                            >
                                <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); const isVid = zoomedImage?.startsWith('blob:') || generationHistory.find(i => i.url === zoomedImage)?.type === 'video'; const ext = isVid ? 'mp4' : 'png'; const a = document.createElement('a'); a.href = zoomedImage; a.download = `asset-${Date.now()}.${ext}`; document.body.appendChild(a); a.click(); document.body.removeChild(a); }}
                                className="flex items-center gap-1.5 px-4 py-2 bg-black/70 hover:bg-white/10 rounded-xl text-xs font-black text-white/80 border border-white/15 transition-all"
                            >
                                ↓ Save
                            </button>
                            <a
                                href={zoomedImage}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 px-4 py-2 bg-black/70 hover:bg-white/10 rounded-xl text-xs font-black text-white/80 border border-white/15 transition-all"
                            >
                                <ExternalLink className="w-3.5 h-3.5" /> Open
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
                        try { localStorage.setItem('marketing_generation_history', JSON.stringify(next)); } catch (_) {}
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
