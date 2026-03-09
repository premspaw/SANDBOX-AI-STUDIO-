import { Position, useUpdateNodeInternals } from 'reactflow';
import React, { memo, useState, useRef, useEffect } from 'react';
import MagneticHandle from '../edges/MagneticHandle';
import { motion, AnimatePresence } from 'framer-motion';
import { Shirt, X, Upload, Loader2, Watch, Glasses, ShoppingBag, GraduationCap, Footprints, Gem, Layers, Eye, Tag } from 'lucide-react';
import { useAppStore } from '../../store';
import { getApiUrl } from '../../config/apiConfig';

const CATEGORIES = [
    { id: 'eyewear', label: 'Eyewear', icon: Glasses },
    { id: 'watch', label: 'Watch', icon: Watch },
    { id: 'belt', label: 'Belt', icon: Layers },
    { id: 'jacket', label: 'Jacket', icon: Shirt },
    { id: 'shoes', label: 'Shoes', icon: Footprints },
    { id: 'jewelry', label: 'Jewelry', icon: Gem },
    { id: 'bag', label: 'Bag', icon: ShoppingBag },
    { id: 'hat', label: 'Hat', icon: GraduationCap },
    { id: 'top', label: 'Top', icon: Shirt },
    { id: 'bottom', label: 'Bottom', icon: Shirt },
];

// Intelligence Layer — auto-detects macro/texture/motion needs from wardrobe items
const buildWardrobeProfile = (items) => {
    const macroCategories = ['watch', 'jewelry', 'belt', 'eyewear'];

    const macroFocusItems = items
        .filter(item => macroCategories.includes(item.category))
        .map(item => item.category);

    const textureRich = items.some(item =>
        item.wearPrompt?.toLowerCase().includes('silk') ||
        item.wearPrompt?.toLowerCase().includes('leather') ||
        item.wearPrompt?.toLowerCase().includes('metal') ||
        item.wearPrompt?.toLowerCase().includes('velvet') ||
        item.wearPrompt?.toLowerCase().includes('satin')
    );

    // Motion detection — critical for AI video (Sora/Runway/Luma)
    const flowyMaterials = ['silk', 'chiffon', 'linen', 'dress', 'scarf', 'gown'];
    const rigidMaterials = ['leather', 'denim', 'suit', 'jacket', 'armor', 'heavy_wool'];

    const isFlowy = items.some(item =>
        flowyMaterials.includes(item.category) ||
        item.name?.toLowerCase().includes('silk') ||
        item.wearPrompt?.toLowerCase().includes('chiffon') ||
        item.wearPrompt?.toLowerCase().includes('flowy')
    );
    const isRigid = items.some(item =>
        rigidMaterials.includes(item.category) ||
        item.name?.toLowerCase().includes('leather') ||
        item.wearPrompt?.toLowerCase().includes('structured')
    );

    return {
        items,
        fullOutfitPrompt: items.map(i => i.wearPrompt).join(' AND '),
        macroFocusItems,
        accessoryCount: items.length,
        textureRich,
        motionStyle: isFlowy ? 'FLOWY' : isRigid ? 'RIGID' : 'NEUTRAL',
        isFlowy,
        isRigid,
        consistencyLock: true
    };
};

export default memo(({ id, data }) => {
    const updateNodeInternals = useUpdateNodeInternals();
    const updateNodeData = useAppStore(s => s.updateNodeData);
    const setCurrentWardrobe = useAppStore(s => s.setCurrentWardrobe);
    const edges = useAppStore(s => s.edges);

    useEffect(() => {
        updateNodeInternals(id);
    }, [id, updateNodeInternals]);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('eyewear');
    const [errorMessage, setErrorMessage] = useState(null);
    const fileInputRef = useRef(null);

    const isTargetConnected = edges.some(e => e.target === id);
    const isSourceConnected = edges.some(e => e.source === id);

    // Safe defaults — read from wardrobeProfile
    const profile = data?.wardrobeProfile;
    const items = profile?.items || [];

    const onFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            analyzeFile(file, reader.result);
        };
        reader.readAsDataURL(file);
    };

    const analyzeFile = async (file, previewData) => {
        setIsAnalyzing(true);
        setErrorMessage(null);
        updateNodeData(id, { status: 'ANALYZING' });

        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('category', selectedCategory);

            const resp = await fetch(getApiUrl('/api/wardrobe/analyze'), {
                method: 'POST',
                body: formData,
            });

            if (!resp.ok) {
                const errorText = await resp.text();
                throw new Error(`API returned ${resp.status}: ${errorText}`);
            }

            const result = await resp.json();

            if (result.success && result.item) {
                const newItem = {
                    ...result.item,
                    image: previewData // Attach local preview since server doesn't return it
                };
                const updatedItems = [...items, newItem];
                const wardrobeProfile = buildWardrobeProfile(updatedItems);

                updateNodeData(id, {
                    wardrobeProfile,
                    status: 'READY'
                });
                setCurrentWardrobe(wardrobeProfile);
            } else {
                throw new Error(result.error || 'Failed to analyze item');
            }
        } catch (error) {
            console.error('Wardrobe analysis failed:', error);
            setErrorMessage(error.message);
            updateNodeData(id, { status: 'ERROR' });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const removeItem = (index) => {
        const updatedItems = items.filter((_, i) => i !== index);
        const wardrobeProfile = buildWardrobeProfile(updatedItems);

        updateNodeData(id, {
            wardrobeProfile: updatedItems.length > 0 ? wardrobeProfile : null,
            status: updatedItems.length > 0 ? 'READY' : 'IDLE'
        });
        setCurrentWardrobe(updatedItems.length > 0 ? wardrobeProfile : '');
    };

    return (
        <div className="relative group" style={{ zIndex: 1 }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="px-4 py-3 bg-[#0a0a0a]/90 border-2 border-rose-500/20 rounded-2xl min-w-[210px] max-w-[240px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-rose-500/50 transition-all font-sans"
            >

                <button onClick={() => data.onDelete(id)}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white scale-0 group-hover:scale-100 transition-transform shadow-lg z-50">
                    <X size={10} />
                </button>

                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-rose-500/20 rounded-lg">
                            <Shirt size={12} className="text-rose-400" />
                        </div>
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">WARDROBE</span>
                    </div>
                    {items.length > 0 && (
                        <span className="text-[7px] font-bold text-rose-400">{items.length} ITEMS</span>
                    )}
                </div>

                {/* Compact Category Selector — 2 rows of 5 */}
                <div className="grid grid-cols-5 gap-1 mb-2">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${selectedCategory === cat.id
                                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                                : 'bg-white/5 border-white/5 text-white/15 hover:text-white/30'}`}
                            title={cat.label}
                        >
                            <cat.icon size={10} />
                        </button>
                    ))}
                </div>

                {/* Upload Area — compact */}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file && file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                analyzeFile(file, reader.result);
                            };
                            reader.readAsDataURL(file);
                        }
                    }}
                    className="relative cursor-pointer"
                >
                    <div className="w-full h-16 bg-black/40 border border-dashed border-white/10 rounded-xl flex items-center justify-center gap-2 hover:border-rose-500/40 hover:bg-rose-500/5 transition-all">
                        {isAnalyzing ? (
                            <>
                                <Loader2 size={14} className="text-rose-500 animate-spin" />
                                <span className="text-[7px] font-black text-rose-400 animate-pulse">ANALYZING...</span>
                            </>
                        ) : (
                            <>
                                <Upload size={14} className="text-white/20" />
                                <span className="text-[7px] font-black text-white/20 uppercase">Drop {selectedCategory}</span>
                            </>
                        )}
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={onFileChange}
                    />
                </div>

                {/* Compact Item List */}
                <AnimatePresence>
                    {items.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-2"
                        >
                            <div className="flex items-center gap-1.5 mb-1">
                                <Eye size={8} className="text-rose-400" />
                                <span className="text-[7px] text-white/30 font-mono uppercase">OUTFIT_KIT</span>
                            </div>

                            <div className="space-y-1.5">
                                {items.map((item, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="relative flex flex-col gap-1 px-2 py-2 bg-white/5 border border-white/5 rounded-xl group/item"
                                    >
                                        <div className="flex items-center justify-between min-w-0">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                {item.image && (
                                                    <div className="w-6 h-6 rounded-md overflow-hidden bg-black/40 border border-white/5 shrink-0">
                                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[6px] font-black text-rose-400 uppercase tracking-tighter">
                                                        {item.category}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-white/50 truncate leading-tight">
                                                        {item.name}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeItem(idx)}
                                                className="p-1 text-white/10 hover:text-red-500 transition-colors opacity-0 group-hover/item:opacity-100 shrink-0"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                        {item.wearPrompt && (
                                            <p className="text-[6px] text-white/20 font-mono italic leading-tight truncate">
                                                "{item.wearPrompt}"
                                            </p>
                                        )}
                                    </motion.div>
                                ))}
                            </div>

                            {/* Intelligence Flags */}
                            {profile?.consistencyLock && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                    {profile.textureRich && (
                                        <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[6px] text-amber-300 font-mono">TEXTURE</span>
                                    )}
                                    {profile.macroFocusItems?.length > 0 && (
                                        <span className="px-1.5 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded text-[6px] text-violet-300 font-mono">MACRO</span>
                                    )}
                                    {profile.motionStyle && profile.motionStyle !== 'NEUTRAL' && (
                                        <span className={`px-1.5 py-0.5 rounded text-[6px] font-mono border ${profile.motionStyle === 'FLOWY' ? 'bg-pink-500/10 border-pink-500/20 text-pink-300' :
                                            'bg-orange-500/10 border-orange-500/20 text-orange-300'
                                            }`}>{profile.motionStyle}</span>
                                    )}
                                    <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[6px] text-emerald-300 font-mono">LOCKED</span>
                                </div>
                            )}
                        </motion.div>
                    )}
                    {/* Error State UI */}
                    {errorMessage && (
                        <div className="mt-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <Activity size={10} className="text-red-400" />
                                <p className="text-[7px] text-red-400 font-mono uppercase tracking-wider">Analysis Failed</p>
                            </div>
                            <p className="text-[8px] text-red-300/60 leading-tight italic line-clamp-2">
                                {errorMessage}
                            </p>
                        </div>
                    )}
                </AnimatePresence>

                {items.length === 0 && !isAnalyzing && (
                    <div className="mt-2 py-3 border border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center opacity-20">
                        <Layers size={14} className="mb-1" />
                        <span className="text-[7px] font-black uppercase tracking-widest">No Assets</span>
                    </div>
                )}
            </motion.div>

            <MagneticHandle type="target" position={Position.Left}
                color="#f43f5e"
                className={`handle-wardrobe ${isTargetConnected ? 'neural-engaged' : ''}`}
            />
            <MagneticHandle type="source" position={Position.Right}
                color="#f43f5e"
                className={`handle-wardrobe ${isSourceConnected ? 'neural-engaged' : ''}`}
            />
        </div>
    );
});
