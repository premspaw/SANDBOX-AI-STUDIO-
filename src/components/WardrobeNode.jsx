import React, { memo, useState, useRef } from 'react';
import { Position } from 'reactflow';
import MagneticHandle from './edges/MagneticHandle';
import { motion, AnimatePresence } from 'framer-motion';
import { Shirt, X, Palette, Upload, Loader2, Watch, Glasses, ShoppingBag, GraduationCap, Footprints, Gem, Layers, Eye, Tag } from 'lucide-react';
import { useAppStore } from '../store';
import { getApiUrl } from '../config/apiConfig';

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

export default memo(({ id, data }) => {
    const updateNodeData = useAppStore(s => s.updateNodeData);
    const setCurrentWardrobe = useAppStore(s => s.setCurrentWardrobe);
    const edges = useAppStore(s => s.edges);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('eyewear');
    const fileInputRef = useRef(null);

    const isTargetConnected = edges.some(e => e.target === id);
    const isSourceConnected = edges.some(e => e.source === id);
    const items = data.items || [];

    const onFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        analyzeFile(file);
    };

    const analyzeFile = async (file) => {
        setIsAnalyzing(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('category', selectedCategory);

            const resp = await fetch(getApiUrl('/api/wardrobe/analyze'), {
                method: 'POST',
                body: formData,
            });
            const result = await resp.json();

            if (result.success && result.item) {
                const newItem = result.item;
                const updatedItems = [...items, newItem];

                // Concatenate prompts
                const fullDescription = updatedItems
                    .map(item => item.wearPrompt)
                    .join(' AND ');

                updateNodeData(id, {
                    items: updatedItems,
                    outfitDescription: fullDescription
                });
                setCurrentWardrobe(fullDescription);
            }
        } catch (error) {
            console.error('Wardrobe analysis failed:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const removeItem = (index) => {
        const updatedItems = items.filter((_, i) => i !== index);
        const fullDescription = updatedItems
            .map(item => item.wearPrompt)
            .join(' AND ');

        updateNodeData(id, {
            items: updatedItems,
            outfitDescription: fullDescription
        });
        setCurrentWardrobe(fullDescription);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            style={{ zIndex: 1 }}
            className="group relative px-5 py-4 bg-[#0a0a0a]/90 border-2 border-rose-500/20 rounded-2xl min-w-[280px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-rose-500/50 transition-all"
        >
            <MagneticHandle type="target" position={Position.Left}
                color="#f43f5e"
                className={`handle-wardrobe ${isTargetConnected ? 'neural-engaged' : ''}`}
            />

            <button onClick={() => data.onDelete(id)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white scale-0 group-hover:scale-100 transition-transform shadow-lg z-50">
                <X size={10} />
            </button>

            <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-rose-500/20 rounded-lg">
                        <Shirt size={13} className="text-rose-400" />
                    </div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">WARDROBE_LOCK</span>
                </div>
            </div>

            {/* Category Selector */}
            <div className="grid grid-cols-5 gap-1.5 mb-4">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`p-2 rounded-lg border transition-all flex flex-col items-center gap-1 ${selectedCategory === cat.id
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                            : 'bg-white/5 border-white/5 text-white/20 hover:bg-white/10 hover:text-white/40'}`}
                        title={cat.label}
                    >
                        <cat.icon size={12} />
                        <span className="text-[6px] font-black uppercase text-center truncate w-full">{cat.id}</span>
                    </button>
                ))}
            </div>

            {/* Upload Area */}
            <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) analyzeFile(file);
                }}
                className="relative cursor-pointer group/upload"
            >
                <div className="w-full aspect-video bg-black/40 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-rose-500/40 hover:bg-rose-500/5 transition-all overflow-hidden">
                    {isAnalyzing ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 size={24} className="text-rose-500 animate-spin" />
                            <span className="text-[8px] font-black text-rose-400 animate-pulse">ANALYZING_MULTIMODAL...</span>
                        </div>
                    ) : (
                        <>
                            <Upload size={20} className="text-white/20 group-hover/upload:text-rose-500 transition-colors" />
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Drop wardrobe image</span>
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

            {/* Vision Analysis Results (Matching ProductNode style) */}
            <AnimatePresence>
                {items.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4"
                    >
                        <div className="flex items-center gap-1.5 mb-2">
                            <Eye size={10} className="text-rose-400" />
                            <span className="text-[8px] text-white/30 font-mono uppercase">OUTFIT_ANALYTICS</span>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-3 bg-white/5 border border-white/5 rounded-xl group/item relative"
                                >
                                    <button
                                        onClick={() => removeItem(idx)}
                                        className="absolute top-2 right-2 p-1 text-white/10 hover:text-red-500 transition-colors opacity-0 group-hover/item:opacity-100"
                                    >
                                        <X size={10} />
                                    </button>

                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded-md text-[7px] text-rose-300 font-black uppercase">
                                            <Tag size={7} className="inline mr-1" />{item.category}
                                        </div>
                                        <span className="text-[8px] font-black text-white/70 uppercase truncate">{item.name}</span>
                                    </div>

                                    <p className="text-[9px] text-white/40 font-mono leading-relaxed italic">
                                        "{item.wearPrompt}"
                                    </p>

                                    {item.closeUpPrompt && (
                                        <div className="mt-2 pl-2 border-l border-rose-500/30">
                                            <span className="text-[6px] text-rose-400/50 font-black uppercase block mb-0.5">Macro Detail</span>
                                            <p className="text-[8px] text-white/20 font-mono leading-tight">
                                                {item.closeUpPrompt}
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {items.length === 0 && !isAnalyzing && (
                <div className="mt-4 py-8 border border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center opacity-20">
                    <Layers size={20} className="mb-2" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-center">No Assets Analyzed</span>
                </div>
            )}

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-[6px] font-bold text-white/10 uppercase tracking-[0.4em]">SYNC_READY</span>
                    {items.length > 0 && (
                        <span className="text-[8px] font-black text-rose-500/60 uppercase">{items.length} ITEM{items.length > 1 ? 'S' : ''} ACTIVE</span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-rose-400">
                    <div className={`w-1.5 h-1.5 rounded-full ${items.length > 0 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'border border-rose-500/40'}`} />
                    {items.length > 0 ? 'LOCKED' : 'AWAITING_INPUT'}
                </div>
            </div>

            <MagneticHandle type="source" position={Position.Right}
                color="#f43f5e"
                className={`handle-wardrobe ${isSourceConnected ? 'neural-engaged' : ''}`}
            />
        </motion.div>
    );
});
