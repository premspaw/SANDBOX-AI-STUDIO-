import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Upload, Wand2, Code, X, Building, Utensils, Stethoscope, Briefcase, ChevronRight, Loader2, Play, Plus, Check, Link, Trash2, ZoomIn, ExternalLink, HardDrive } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useShorts } from '../../hooks/useShorts';
import { useAppStore } from '../../store';

const CATEGORIES = [
    { id: 'food', label: 'Food & Beverage', icon: Utensils, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { id: 'restaurant', label: 'Restaurant', icon: Utensils, color: 'text-red-400', bg: 'bg-red-400/10' },
    { id: 'realestate', label: 'Real Estate', icon: Building, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { id: 'medical', label: 'Medical', icon: Stethoscope, color: 'text-teal-400', bg: 'bg-teal-400/10' },
    { id: 'other', label: 'Others', icon: Briefcase, color: 'text-purple-400', bg: 'bg-purple-400/10' },
];

const TEMPLATES = { food: [], restaurant: [], realestate: [], medical: [], other: [] };

// ── Add-Template Modal ──────────────────────────────────────────────────────
function AddTemplateModal({ category, onClose, onSave }) {
    const [name, setName]         = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [previewSrc, setPreviewSrc] = useState('');
    const [prompt, setPrompt]     = useState('');
    const [aspect, setAspect]     = useState('16/9');
    const [tab, setTab]           = useState('url'); // 'url' | 'upload'
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedBucket, setUploadedBucket] = useState(null);
    const uploadRef = useRef(null);
    const finalUrlRef = useRef(''); // always holds latest R2/proxy URL

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
                const resp = await fetch('http://localhost:3002/api/marketing/upload-reference', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64, userId: 'user_sandbox' })
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

export default function MarketingStudio() {
    const [activeCategory, setActiveCategory] = useState('food');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [referenceImage, setReferenceImage] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState(null);
    const fileInputRef = useRef(null);
    const [promptText, setPromptText] = useState('');
    const [selectedStyle, setSelectedStyle] = useState('premium marketing');
    const [brandColors, setBrandColors] = useState(['#FF0000', '#000000']);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [zoomedImage, setZoomedImage] = useState(null);
    const [zoomedIndex, setZoomedIndex] = useState(null);

    const openZoom = (img, idx) => { setZoomedImage(img); setZoomedIndex(idx ?? null); };
    const closeZoom = () => { setZoomedImage(null); setZoomedIndex(null); };

    // Custom templates: { [categoryId]: Template[] }
    const [customTemplates, setCustomTemplates] = useState({ food: [], restaurant: [], realestate: [], medical: [], other: [] });
    const [showAddModal, setShowAddModal] = useState(false);
    const [templatesLoading, setTemplatesLoading] = useState(true);

    const LS_KEY = 'marketing_custom_templates';

    // Load persisted custom templates — DB first, localStorage fallback
    useEffect(() => {
        // Load from localStorage immediately so UI isn't blank
        try {
            const cached = localStorage.getItem(LS_KEY);
            if (cached) setCustomTemplates(JSON.parse(cached));
        } catch (_) {}

        fetch('http://localhost:3002/api/marketing/templates')
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(rows => {
                if (!Array.isArray(rows)) return;
                const grouped = { food: [], restaurant: [], realestate: [], medical: [], other: [] };
                rows.forEach(row => {
                    const cat = row.category || 'other';
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push({
                        id: row.id,
                        name: row.name,
                        imageUrl: row.image_url,
                        prompt: row.prompt,
                        aspect: row.aspect,
                        isCustom: true,
                    });
                });
                // Only overwrite if DB actually has rows — don't wipe localStorage with empty data
                const hasRows = Object.values(grouped).some(arr => arr.length > 0);
                if (hasRows) {
                    setCustomTemplates(grouped);
                    localStorage.setItem(LS_KEY, JSON.stringify(grouped));
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
        fetch('http://localhost:3002/api/marketing/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: tpl.id, name: tpl.name, image_url: tpl.imageUrl,
                prompt: tpl.prompt, aspect: tpl.aspect,
                category: activeCategory, user_id: 'user_sandbox',
            })
        }).catch(() => {}); // localStorage is source of truth; DB sync is best-effort
    };

    const handleDeleteCustom = async (tplId) => {
        setCustomTemplates(prev => {
            const next = { ...prev, [activeCategory]: prev[activeCategory].filter(t => t.id !== tplId) };
            try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch (_) {}
            return next;
        });
        fetch(`http://localhost:3002/api/marketing/templates/${tplId}`, { method: 'DELETE' }).catch(() => {}); // best-effort
    };

    const allTemplates = [
        ...(TEMPLATES[activeCategory] || []),
        ...(customTemplates[activeCategory] || [])
    ];
    console.log('[GALLERY] Custom templates for', activeCategory, ':', customTemplates[activeCategory]?.map(t => ({ name: t.name, url: t.imageUrl?.slice(0, 60) })));
    
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

    const addIngredient = () => {
        const val = ingredientInput.trim();
        if (val && !specialIngredients.includes(val)) {
            setSpecialIngredients(prev => [...prev, val]);
        }
        setIngredientInput('');
    };
    const removeIngredient = (idx) => setSpecialIngredients(prev => prev.filter((_, i) => i !== idx));

    const { deductShorts } = useShorts();

    const handleTemplateSelect = (template) => {
        setSelectedTemplate(template);
        setPromptText(template.prompt);
        setGeneratedImage(null);
    };

    const [referenceImageMeta, setReferenceImageMeta] = useState(null); // { url, bucket, storage }

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target.result;
            setReferenceImage(base64); // preview immediately
            setIsAnalyzing(true);
            try {
                // Upload to GCS marketing bucket + analyze in parallel
                const [uploadResp, analyzeResp] = await Promise.all([
                    fetch('http://localhost:3002/api/marketing/upload-reference', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image: base64, userId: 'user_sandbox' })
                    }),
                    fetch('http://localhost:3002/api/marketing/analyze-image', {
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
                    setPromptText(`Cinematic recipe infographic for ${analyzeData.dish_name}`);
                }
            } catch (err) {
                console.error("Upload/Analysis failed:", err);
            } finally {
                setIsAnalyzing(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        if (!selectedTemplate) return;
        setIsGenerating(true);
        try {
            // Deduct shorts for image generation
            const success = await deductShorts(15, 'marketing_image_generation');
            if (!success) throw new Error("Insufficient Shorts");

            // Construct the final complex payload for the API
            const finalPrompt = {
                goal: "Create a professional marketing asset",
                mode: selectedStyle === 'infographic' ? "detailed_infographic" : "premium_product_ad",
                scene: `Minimalist modern ${selectedStyle} aesthetic, Scandinavian design language, editorial layout. Background: Soft neutral beige/cream. Lighting: Soft diffused.`,
                subject: recipeData.dish_name ? `Traditional ${recipeData.dish_name} dish` : promptText,
                details: {
                    composition: "Centered subject with balanced negative space",
                    visual_quality: "8K resolution, ultra-sharp, photorealistic candidate photograph, 35mm film, 50mm lens, natural lighting, macro detail, cinematic bokeh",
                    recipe_context: recipeData.dish_name ? {
                        dish: recipeData.dish_name,
                        presentation: recipeData.dish_presentation || "Modern editorial plating",
                        nutrition: recipeData.meta,
                        ingredients: recipeData.ingredients,
                        steps: recipeData.steps
                    } : null
                },
                special_ingredients: specialIngredients.length > 0 ? specialIngredients : undefined,
                constraints: [
                    "No watermarks",
                    "No generic placeholder text",
                    "No logos unless requested",
                    "Preserve brand colors: " + brandColors.join(', '),
                    "High contrast for readability",
                    ...(specialIngredients.length > 0 ? [`Must prominently feature these special ingredients: ${specialIngredients.join(', ')}`] : [])
                ]
            };

            const payload = {
                model: "gpt-image-2-2026-04-21",
                prompt: JSON.stringify(finalPrompt),
                quality: quality,
                size: imageSize,
                userId: "user_sandbox"
            };
            
            console.log("Generating with real payload:", payload);

            const resp = await fetch('http://localhost:3002/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || "Generation failed");

            setGeneratedImage(data.url || data.imageUrl);

            
        } catch (error) {
            console.error("Generation failed:", error);
            alert("Generation failed: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
        <div className="h-full flex flex-col bg-[#0a0a0a] text-white overflow-hidden relative font-sans">
            {/* Header */}
            <div className="flex-none py-3 px-6 border-b border-white/10 flex items-center justify-between z-10 bg-black/40 backdrop-blur-md">
                <div>
                    <h1 className="text-2xl font-black italic uppercase tracking-tighter bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent drop-shadow-sm">
                        Marketing Studio
                    </h1>
                    <p className="text-[10px] text-white/50 font-medium uppercase tracking-widest">Premium Assets</p>
                </div>

                {/* Filter Tabs in Header */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-[65%]">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-xs font-black uppercase tracking-wider transition-all",
                                activeCategory === cat.id 
                                    ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                                    : "text-white/40 hover:text-white/80 hover:bg-white/5 border border-white/10"
                            )}
                        >
                            <cat.icon className={cn("w-3 h-3", activeCategory === cat.id ? "" : cat.color)} />
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Categories & Templates */}
                <div className="w-1/3 min-w-[320px] max-w-[400px] border-r border-white/10 flex flex-col bg-black/20">


                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Templates Gallery</h3>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-orange-400 hover:text-orange-300 bg-orange-400/10 hover:bg-orange-400/20 px-2 py-1 rounded-lg transition-all"
                            >
                                <Plus className="w-3 h-3" /> Add
                            </button>
                        </div>
                        {templatesLoading && (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                            </div>
                        )}
                        <div className="columns-2 gap-3 space-y-3">
                            {allTemplates.map(template => (
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

                                        {template.isCustom && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteCustom(template.id); }}
                                                className="absolute top-2 left-2 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/80 transition-all"
                                            >
                                                <Trash2 className="w-2.5 h-2.5 text-white" />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Editor & Preview */}
                <div className="flex-1 flex flex-col bg-[#0f0f11] relative overflow-y-auto custom-scrollbar">
                    {selectedTemplate ? (
                        <div className="p-8 max-w-5xl mx-auto w-full space-y-8 pb-32">

                            {/* Expanded Template Preview */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 cursor-pointer group"
                                onClick={() => openZoom(selectedTemplate.imageUrl, allTemplates.findIndex(t => t.id === selectedTemplate.id))}
                            >
                                <div className="w-full flex items-center justify-center py-4">
                                    <img src={selectedTemplate.imageUrl} alt={selectedTemplate.name} className="max-w-full max-h-[320px] object-contain rounded-lg" />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                                        <ZoomIn className="w-4 h-4 text-lime-400" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-white">Expand</span>
                                    </div>
                                </div>
                                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                                    <div>
                                        <h3 className="text-sm font-black text-white uppercase tracking-wider drop-shadow-lg">{selectedTemplate.name}</h3>
                                        <span className="text-[9px] text-white/50 uppercase tracking-widest">{selectedTemplate.aspect} · {selectedTemplate.isCustom ? 'Custom' : 'Built-in'}</span>
                                    </div>
                                    <span className="text-[9px] bg-lime-500/20 text-lime-300 px-2 py-1 rounded-md font-black uppercase border border-lime-500/30">Selected</span>
                                </div>
                            </motion.div>
                            
                            {/* Editor Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                
                                {/* Image References */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-white/70">
                                        <ImageIcon className="w-5 h-5 text-lime-400" />
                                        <h2 className="text-lg font-bold">Reference Imagery</h2>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 h-[280px]">
                                        <div className="rounded-2xl overflow-hidden border border-white/10 relative group flex items-center justify-center bg-black/30">
                                            <img src={selectedTemplate.imageUrl} alt="Template" className="max-w-full max-h-full object-contain p-2" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-xs font-bold uppercase tracking-wider">Template Base</span>
                                            </div>
                                        </div>
                                        
                                        <div className="rounded-2xl border-2 border-dashed border-white/20 hover:border-lime-400/50 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-3 relative overflow-hidden group">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="absolute inset-0 w-full h-full z-10"
                                            />
                                            {referenceImage ? (
                                                <>
                                                    <img src={referenceImage} alt="Reference" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                                                    <div className="z-20 flex flex-col items-center pointer-events-none">
                                                        <Upload className="w-6 h-6 text-white mb-2" />
                                                        <span className="text-xs font-bold uppercase">Change Image</span>
                                                    </div>
                                                    <div className="absolute bottom-2 left-0 right-0 flex justify-center z-20 pointer-events-none">
                                                        {referenceImageMeta ? (
                                                            <span className="flex items-center gap-1 text-[9px] text-lime-300 bg-black/70 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                                <HardDrive className="w-2.5 h-2.5" /> GCS · {referenceImageMeta.bucket}
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-[9px] text-yellow-300 bg-black/70 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                                <Loader2 className="w-2.5 h-2.5 animate-spin" /> Uploading to cloud…
                                                            </span>
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform pointer-events-none">
                                                        <Plus className="w-5 h-5 text-white/60" />
                                                    </div>
                                                    <div className="text-center px-4 pointer-events-none">
                                                        <span className="text-sm font-bold block text-white/80">Upload Brand Image</span>
                                                        <span className="text-[10px] text-white/40 uppercase tracking-widest mt-1 block">Logo / Product</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                                    </div>
                                </div>

                                {/* Modern Form UI */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-white/70">
                                        <div className="flex items-center gap-2">
                                            <Wand2 className="w-5 h-5 text-purple-400" />
                                            <h2 className="text-lg font-bold">Asset Configuration</h2>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6 h-[300px] overflow-y-auto custom-scrollbar">
                                        {/* Prompt Input — hidden, value retained for generation */}
                                        <textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} className="hidden" />

                                        {/* Recipe Info Grid */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-white/30 uppercase tracking-widest block px-1">Dish Name</label>
                                                <input 
                                                    value={recipeData.dish_name}
                                                    onChange={(e) => setRecipeData({...recipeData, dish_name: e.target.value})}
                                                    className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs text-white/80 focus:border-purple-500/50 outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-white/30 uppercase tracking-widest block px-1">Calories</label>
                                                <input 
                                                    value={recipeData.meta.calories}
                                                    onChange={(e) => setRecipeData({...recipeData, meta: {...recipeData.meta, calories: e.target.value}})}
                                                    className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs text-white/80 focus:border-purple-500/50 outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-white/30 uppercase tracking-widest block px-1">Time</label>
                                                <input 
                                                    value={recipeData.meta.time}
                                                    onChange={(e) => setRecipeData({...recipeData, meta: {...recipeData.meta, time: e.target.value}})}
                                                    className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs text-white/80 focus:border-purple-500/50 outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Ingredients List */}
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-white/30 uppercase tracking-widest block px-1">Ingredients (Auto-extracted)</label>
                                            <div className="flex flex-wrap gap-2 p-2 bg-black/20 rounded-xl min-h-[40px]">
                                                {recipeData.ingredients.map((ing, i) => (
                                                    <span key={i} className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded-md text-white/70">
                                                        {ing.name} ({ing.quantity})
                                                    </span>
                                                ))}
                                                {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin text-purple-400 m-auto" />}
                                            </div>
                                        </div>

                                        {/* Special Ingredients — User Inject */}
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-orange-400/70 uppercase tracking-widest block px-1">Special Ingredients (Inject)</label>
                                            <div className="flex gap-2">
                                                <input
                                                    value={ingredientInput}
                                                    onChange={(e) => setIngredientInput(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIngredient(); } }}
                                                    placeholder="e.g. Gold Leaf, Truffle Oil, Saffron..."
                                                    className="flex-1 bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-xs text-white/80 focus:border-orange-500/50 outline-none placeholder:text-white/20"
                                                />
                                                <button
                                                    onClick={addIngredient}
                                                    className="px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg text-orange-400 text-xs font-bold uppercase transition-colors"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            {specialIngredients.length > 0 && (
                                                <div className="flex flex-wrap gap-2 p-2 bg-orange-500/5 border border-orange-500/10 rounded-xl">
                                                    {specialIngredients.map((ing, i) => (
                                                        <span
                                                            key={i}
                                                            className="inline-flex items-center gap-1 text-[10px] bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-md text-orange-300 font-bold uppercase tracking-wider group cursor-pointer hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-300 transition-colors"
                                                            onClick={() => removeIngredient(i)}
                                                        >
                                                            {ing}
                                                            <X className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" />
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Steps List */}
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-white/30 uppercase tracking-widest block px-1">Cooking Steps</label>
                                            <div className="space-y-1">
                                                {recipeData.steps.slice(0, 3).map((step, i) => (
                                                    <div key={i} className="text-[10px] text-white/50 flex gap-2">
                                                        <span className="text-purple-400 font-bold">{i+1}.</span>
                                                        <span className="truncate">{step}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Output Size — Platform Dropdown */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-blue-400/70 uppercase tracking-widest block px-1">Output Size / Platform</label>
                                            <select
                                                value={imageSize}
                                                onChange={(e) => setImageSize(e.target.value)}
                                                className="w-full bg-black/40 border border-blue-500/20 rounded-xl p-3 text-xs text-white/80 focus:border-blue-500/50 outline-none"
                                            >
                                                <optgroup label="Standard">
                                                    <option value="1024x1024">⬛ Square — 1:1 (1024×1024)</option>
                                                    <option value="1536x1024">▬ Landscape — 3:2 (1536×1024)</option>
                                                    <option value="1024x1536">▮ Portrait — 2:3 (1024×1536)</option>
                                                </optgroup>
                                                <optgroup label="Social Media">
                                                    <option value="1024x1280">📷 Instagram Post — 4:5 (1024×1280)</option>
                                                    <option value="1080x1920">📱 Instagram Story — 9:16 (1080×1920)</option>
                                                    <option value="1080x1920">📱 Facebook Story — 9:16 (1080×1920)</option>
                                                    <option value="1200x628">🔵 Facebook Post — 1.91:1 (1200×628)</option>
                                                    <option value="1080x1080">🟣 TikTok Cover — 1:1 (1080×1080)</option>
                                                </optgroup>
                                                <optgroup label="Video Platforms">
                                                    <option value="1920x1080">▶️ YouTube Thumbnail — 16:9 (1920×1080)</option>
                                                    <option value="1280x720">▶️ YouTube Banner — 16:9 (1280×720)</option>
                                                </optgroup>
                                                <optgroup label="Print / Other">
                                                    <option value="1240x1748">🖨️ A4 Portrait (1240×1748)</option>
                                                    <option value="1748x1240">🖨️ A4 Landscape (1748×1240)</option>
                                                </optgroup>
                                            </select>
                                        </div>

                                        {/* Style, Quality & Colors Row */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block px-1">Style</label>
                                                <select 
                                                    value={selectedStyle}
                                                    onChange={(e) => setSelectedStyle(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs text-white/80 focus:border-purple-500/50 outline-none"
                                                >
                                                    <option value="premium marketing">Premium</option>
                                                    <option value="infographic">Infographic</option>
                                                    <option value="minimalist">Minimalist</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block px-1">Quality</label>
                                                <select 
                                                    value={quality}
                                                    onChange={(e) => setQuality(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs text-white/80 focus:border-lime-500/50 outline-none"
                                                >
                                                    <option value="low">Fast (Low)</option>
                                                    <option value="medium">Standard</option>
                                                    <option value="high">Premium (High)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block px-1">Colors</label>
                                                <div className="flex gap-1 p-1 bg-black/20 rounded-lg">
                                                    {brandColors.slice(0, 2).map((color, idx) => (
                                                        <input 
                                                            key={idx}
                                                            type="color"
                                                            value={color}
                                                            onChange={(e) => {
                                                                const newColors = [...brandColors];
                                                                newColors[idx] = e.target.value;
                                                                setBrandColors(newColors);
                                                            }}
                                                            className="w-8 h-8 rounded-md overflow-hidden bg-transparent border-none cursor-pointer"
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Generate Button */}
                            <div className="flex justify-center mt-8">
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className={cn(
                                        "group relative flex items-center gap-3 px-8 py-4 rounded-full font-black text-lg uppercase tracking-widest transition-all duration-300",
                                        isGenerating 
                                            ? "bg-white/10 text-white/50 cursor-not-allowed"
                                            : "bg-gradient-to-r from-lime-400 to-emerald-500 text-black hover:scale-105 shadow-[0_0_40px_rgba(132,204,22,0.3)] hover:shadow-[0_0_60px_rgba(132,204,22,0.5)]"
                                    )}
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="w-6 h-6" />
                                            Generate Asset
                                            <div className="absolute inset-0 rounded-full border-2 border-white/20 scale-105 group-hover:scale-110 transition-transform opacity-0 group-hover:opacity-100" />
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Result Area */}
                            <AnimatePresence>
                                {generatedImage && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 40 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-12 space-y-4"
                                    >
                                        <div className="flex items-center gap-2 text-white/70">
                                            <Play className="w-5 h-5 text-emerald-400 fill-emerald-400" />
                                            <h2 className="text-xl font-bold">Generated Asset</h2>
                                        </div>
                                        <div className={cn(
                                            "mx-auto rounded-3xl overflow-hidden border border-white/10 bg-black/40 relative shadow-2xl transition-all duration-700",
                                            selectedTemplate.aspect === '9/16' ? "aspect-[9/16] h-[450px]" : "aspect-video w-full max-w-2xl"
                                        )}>
                                            <img src={generatedImage} alt="Generated Asset" className="w-full h-full object-cover" />
                                            <div className="absolute top-4 right-4">
                                                <button
                                                    onClick={() => openZoom(generatedImage)}
                                                    className="flex items-center gap-2 px-3 py-2 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-lg font-bold text-xs text-white transition-all hover:scale-105 border border-white/10"
                                                >
                                                    <ZoomIn className="w-4 h-4 text-lime-400" /> Open in Zoom
                                                </button>
                                            </div>
                                            <div className="absolute bottom-4 right-4 flex gap-2">
                                                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg font-bold text-sm transition-colors">
                                                    Download
                                                </button>
                                                <button className="px-4 py-2 bg-emerald-500 text-black hover:bg-emerald-400 rounded-lg font-bold text-sm transition-colors shadow-lg">
                                                    Publish
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

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

                        <img
                            key={zoomedImage}
                            src={zoomedImage}
                            alt="Zoomed Asset"
                            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/10"
                        />

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
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-white/40 font-bold uppercase tracking-widest">
                                {zoomedIndex + 1} / {allTemplates.length}
                            </div>
                        )}

                        <a
                            href={zoomedImage}
                            target="_blank"
                            rel="noreferrer"
                            className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-2 bg-black/70 hover:bg-white/10 rounded-lg text-xs font-bold text-white/70 transition-colors border border-white/10"
                        >
                            <ExternalLink className="w-3.5 h-3.5" /> Open in new tab
                        </a>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Add Template Modal */}
        {showAddModal && (
            <AddTemplateModal
                category={CATEGORIES.find(c => c.id === activeCategory)?.label || activeCategory}
                onClose={() => setShowAddModal(false)}
                onSave={handleAddTemplate}
            />
        )}
        </>
    );
}
