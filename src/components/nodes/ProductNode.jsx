import React, { memo, useState, useCallback, useEffect } from 'react';
import { Position, useUpdateNodeInternals } from 'reactflow';
import MagneticHandle from '../edges/MagneticHandle';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, X, Upload, Eye, Loader2, Tag, Activity } from 'lucide-react';
import { useAppStore } from '../../store';
import { getApiUrl } from '../../config/apiConfig';
import { useWebSocket } from '../../hooks/useWebSocket';
import { compressImageToMax1024 } from '../../services/geminiService';

// Intelligence Layer — auto-detects product shot requirements from vision labels
const enrichProductProfile = (labels = []) => {
    const lower = labels.map(l => l.toLowerCase());

    const macroKeywords = ["watch", "jewelry", "ring", "bracelet", "necklace", "texture"];
    const heroKeywords = ["bottle", "box", "electronics", "phone", "laptop", "device"];
    const cleanKeywords = ["cosmetic", "makeup", "skincare", "perfume"];

    const macroRequired = lower.some(label =>
        macroKeywords.some(keyword => label.includes(keyword))
    );

    const heroRequired = lower.some(label =>
        heroKeywords.some(keyword => label.includes(keyword))
    );

    const cleanBackgroundPreferred = lower.some(label =>
        cleanKeywords.some(keyword => label.includes(keyword))
    );

    // Scale detection — prevents wide shots of tiny objects
    const isMicro = ["ring", "jewelry", "earring", "chip", "screw"].some(k =>
        lower.some(l => l.includes(k))
    );
    const isHandheld = ["watch", "phone", "bottle", "glass", "camera"].some(k =>
        lower.some(l => l.includes(k))
    );
    const isLarge = ["car", "furniture", "sofa", "building", "sculpture"].some(k =>
        lower.some(l => l.includes(k))
    );

    return {
        macroRequired,
        heroRequired,
        cleanBackgroundPreferred,
        scale: isMicro ? 'MICRO' : isLarge ? 'LARGE' : 'HANDHELD',
        isMicro,
        isHandheld,
        isLarge
    };
};

export default memo(({ id, data }) => {
    const updateNodeInternals = useUpdateNodeInternals();
    const updateNodeData = useAppStore(s => s.updateNodeData);
    const setCurrentProduct = useAppStore(s => s.setCurrentProduct);
    const edges = useAppStore(s => s.edges);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const { tasks } = useWebSocket();
    const currentTask = tasks[`product-analysis-${id}`];

    const isTargetConnected = edges.some(e => e.target === id);
    const isSourceConnected = edges.some(e => e.source === id);

    // Safe defaults
    const profile = data?.productProfile;
    const productImage = profile?.image;
    const productLabels = profile?.labels || [];
    const productDescription = profile?.description;
    const productColors = profile?.colors || [];

    useEffect(() => {
        updateNodeInternals(id);
    }, [id, updateNodeInternals]);

    const handleImageUpload = useCallback(async (file) => {
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const imageData = reader.result;

            // Immediately set productProfile with upload data
            updateNodeData(id, {
                productProfile: {
                    image: imageData,
                    name: file.name,
                    description: '',
                    labels: [],
                    colors: [],
                    heroRequired: true,
                    macroRequired: false,
                    cleanBackgroundPreferred: false,
                    scale: 'HANDHELD',
                    isMicro: false,
                    isHandheld: true,
                    isLarge: false,
                    consistencyLock: true
                },
                status: 'ANALYZING'
            });
            setCurrentProduct({ image: imageData, description: '', labels: [], colors: [] });

            // Compress for API
            const compressedImage = await compressImageToMax1024(imageData);

            try {
                setIsAnalyzing(true);
                setErrorMessage(null);

                const response = await fetch(getApiUrl('/api/ugc/analyze-product'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: compressedImage, nodeId: id })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`API returned ${response.status}: ${errorText}`);
                }

                const result = await response.json();

                if (result.labels) {
                    const intelligence = enrichProductProfile(result.labels);

                    const updatedProductProfile = {
                        image: imageData,
                        name: file.name,
                        description: result.description,
                        labels: result.labels,
                        colors: result.colors || [],
                        macroRequired: intelligence.macroRequired,
                        heroRequired: intelligence.heroRequired || true,
                        cleanBackgroundPreferred: intelligence.cleanBackgroundPreferred,
                        scale: intelligence.scale,
                        isMicro: intelligence.isMicro,
                        isHandheld: intelligence.isHandheld,
                        isLarge: intelligence.isLarge,
                        consistencyLock: true
                    };

                    updateNodeData(id, {
                        productProfile: updatedProductProfile,
                        status: 'READY'
                    });
                    setCurrentProduct({ ...updatedProductProfile });
                } else if (result.error) {
                    throw new Error(result.error);
                }
            } catch (err) {
                console.error('Product analysis error:', err);
                setErrorMessage(err.message);

                const fallback = `Scan complete (Analysis failed: ${err.message.substring(0, 30)}...)`;
                const fallbackProfile = {
                    image: imageData,
                    name: file.name,
                    description: fallback,
                    labels: ['product'],
                    colors: ['#888888'],
                    heroRequired: true,
                    macroRequired: false,
                    cleanBackgroundPreferred: false,
                    scale: 'HANDHELD',
                    isMicro: false,
                    isHandheld: true,
                    isLarge: false,
                    consistencyLock: false
                };
                updateNodeData(id, { productProfile: fallbackProfile, status: 'ERROR' });
                setCurrentProduct({ ...fallbackProfile });
            } finally {
                setIsAnalyzing(false);
            }
        };
        reader.readAsDataURL(file);
    }, [id, data, updateNodeData, setCurrentProduct]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleImageUpload(file);
    }, [handleImageUpload]);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) handleImageUpload(file);
    };

    const handleRetryAnalysis = useCallback(async () => {
        if (!profile?.image) return;

        setIsAnalyzing(true);
        setErrorMessage(null);

        try {
            const compressedImage = await compressImageToMax1024(profile.image);

            const response = await fetch(getApiUrl('/api/ugc/analyze-product'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: compressedImage, nodeId: id })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API returned ${response.status}: ${errorText}`);
            }

            const result = await response.json();

            if (result.labels) {
                const intelligence = enrichProductProfile(result.labels);
                const updatedProfile = {
                    ...profile,
                    description: result.description,
                    labels: result.labels,
                    colors: result.colors || [],
                    macroRequired: intelligence.macroRequired,
                    heroRequired: intelligence.heroRequired || true,
                    cleanBackgroundPreferred: intelligence.cleanBackgroundPreferred,
                    scale: intelligence.scale,
                    isMicro: intelligence.isMicro,
                    isHandheld: intelligence.isHandheld,
                    isLarge: intelligence.isLarge,
                    consistencyLock: true
                };

                updateNodeData(id, {
                    productProfile: updatedProfile,
                    status: 'READY'
                });
                setCurrentProduct({ ...updatedProfile });
            }
        } catch (err) {
            console.error('Retry analysis failed:', err);
            setErrorMessage(err.message);
            updateNodeData(id, { status: 'ERROR' });
        } finally {
            setIsAnalyzing(false);
        }
    }, [id, profile, updateNodeData, setCurrentProduct]);

    return (
        <div className="relative group" style={{ zIndex: 1 }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="px-5 py-4 bg-[#0a0a0a]/90 border-2 border-amber-500/20 rounded-2xl min-w-[250px] max-w-[280px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-amber-500/50 transition-all"
            >
                {/* Delete button */}
                <button
                    onClick={() => data.onDelete?.(id)}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white scale-0 group-hover:scale-100 transition-transform shadow-lg z-50"
                >
                    <X size={10} />
                </button>

                <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-amber-500/20 rounded-lg">
                            <Package size={14} className="text-amber-400" />
                        </div>
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">PRODUCT_SCAN</span>
                    </div>
                    {isAnalyzing && (
                        <div className="flex items-center gap-2">
                            <span className="text-[8px] text-amber-500/60 font-mono animate-pulse uppercase">
                                {currentTask?.message || 'SCANNING...'}
                            </span>
                            <Loader2 size={12} className="text-amber-400 animate-spin" />
                        </div>
                    )}
                </div>

                {/* Dropzone / Preview */}
                {!productImage ? (
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className={`relative w-full h-28 rounded-xl border-2 border-dashed ${dragOver ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 bg-black/30'} flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-amber-500/40`}
                        onClick={() => document.getElementById(`product-upload-${id}`)?.click()}
                    >
                        <Upload size={20} className="text-white/20" />
                        <span className="text-[9px] text-white/30 font-mono">DROP PRODUCT IMAGE</span>
                        <input
                            id={`product-upload-${id}`}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>
                ) : (
                    <div className="relative w-full h-28 rounded-xl overflow-hidden mb-2">
                        <img
                            src={productImage}
                            alt="Product"
                            className="w-full h-full object-contain bg-black/40"
                        />
                        <div className="absolute bottom-1 right-1 px-2 py-0.5 bg-black/60 rounded-md">
                            <span className="text-[7px] text-amber-400 font-mono uppercase">SCANNED</span>
                        </div>
                        {profile?.consistencyLock && (
                            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/40 rounded-md">
                                <span className="text-[6px] text-amber-400 font-mono">LOCKED</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Error State UI */}
                {errorMessage && (
                    <div className="mb-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Activity size={10} className="text-red-400" />
                            <p className="text-[7px] text-red-400 font-mono uppercase tracking-wider">Analysis Failed</p>
                        </div>
                        <p className="text-[8px] text-red-300/60 leading-relaxed italic line-clamp-2">
                            {errorMessage}
                        </p>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRetryAnalysis(); }}
                            className="w-full py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-[7px] text-red-400 font-bold uppercase tracking-widest transition-all"
                        >
                            Retry Intelligence Scan
                        </button>
                    </div>
                )}

                {/* Vision Analysis Results */}
                <AnimatePresence>
                    {productLabels.length > 0 && (
                        <motion.div
                            key="vision-div"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2"
                        >
                            <div key="vision-header" className="flex items-center gap-1.5 mb-1">
                                <Eye size={10} className="text-amber-400" />
                                <span className="text-[8px] text-white/30 font-mono uppercase">VISION_OUTPUT</span>
                            </div>
                            <div key="vision-tags" className="flex flex-wrap gap-1">
                                {productLabels.slice(0, 6).map((label, i) => (
                                    <motion.span
                                        key={`tag-${i}`}
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.06 }}
                                        className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md text-[8px] text-amber-300 font-mono"
                                    >
                                        <Tag size={8} className="inline mr-1" />{label}
                                    </motion.span>
                                ))}
                            </div>
                            {productDescription && (
                                <p key="vision-desc" className="mt-1.5 text-[9px] text-white/40 font-mono leading-relaxed">
                                    {productDescription}
                                </p>
                            )}
                        </motion.div>
                    )}

                    {/* Product Colors */}
                    {productColors.length > 0 && (
                        <div key="vision-colors" className="mt-2 flex items-center gap-1">
                            {productColors.slice(0, 5).map((color, i) => (
                                <div key={`color-${i}`} className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: color }} />
                            ))}
                        </div>
                    )}

                    {/* Intelligence Flags */}
                    {profile?.consistencyLock && productLabels.length > 0 && (
                        <div key="intel-flags" className="mt-2 flex flex-wrap gap-1">
                            {profile.macroRequired && (
                                <span key="flag-macro" className="px-1.5 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded text-[7px] text-violet-300 font-mono">MACRO</span>
                            )}
                            {profile.heroRequired && (
                                <span key="flag-hero" className="px-1.5 py-0.5 bg-sky-500/10 border border-sky-500/20 rounded text-[7px] text-sky-300 font-mono">HERO</span>
                            )}
                            {profile.cleanBackgroundPreferred && (
                                <span key="flag-clean" className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[7px] text-emerald-300 font-mono">CLEAN_BG</span>
                            )}
                            {profile.scale && (
                                <span key="flag-scale" className={`px-1.5 py-0.5 rounded text-[7px] font-mono border ${profile.scale === 'MICRO' ? 'bg-pink-500/10 border-pink-500/20 text-pink-300' :
                                    profile.scale === 'LARGE' ? 'bg-orange-500/10 border-orange-500/20 text-orange-300' :
                                        'bg-teal-500/10 border-teal-500/20 text-teal-300'
                                    }`}>{profile.scale}</span>
                            )}
                        </div>
                    )}
                </AnimatePresence>
            </motion.div>

            <MagneticHandle
                type="target"
                position={Position.Left}
                color="#f59e0b"
                className={`handle-product ${isTargetConnected ? 'neural-engaged' : ''}`}
            />
            <MagneticHandle
                type="source"
                position={Position.Right}
                color="#f59e0b"
                className={`handle-product ${isSourceConnected ? 'neural-engaged' : ''}`}
            />
        </div>
    );
});
