import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { Shirt, X, Palette } from 'lucide-react';
import { useAppStore } from '../store';

const COLOR_PRESETS = [
    '#000000', '#1a1a2e', '#16213e', '#0f3460',
    '#e94560', '#f5f5f5', '#a8dadc', '#457b9d',
    '#2d6a4f', '#b7e4c7', '#ffd166', '#ef476f',
    '#8338ec', '#ff6b6b', '#4ecdc4', '#ffe66d',
];

export default memo(({ id, data }) => {
    const updateNodeData = useAppStore(s => s.updateNodeData);
    const setCurrentWardrobe = useAppStore(s => s.setCurrentWardrobe);
    const [showColors, setShowColors] = useState(false);

    const handleTextChange = (e) => {
        const text = e.target.value;
        updateNodeData(id, { outfitDescription: text });
        setCurrentWardrobe(text);
    };

    const handleColorSelect = (color) => {
        const current = data.outfitDescription || '';
        const colorName = color;
        const updated = current ? `${current}, primary color: ${colorName}` : `Primary color: ${colorName}`;
        updateNodeData(id, { outfitDescription: updated, primaryColor: color });
        setCurrentWardrobe(updated);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ scale: 1.25 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="group relative px-5 py-4 bg-[#0a0a0a]/90 backdrop-blur-2xl border-2 border-rose-500/20 rounded-2xl min-w-[240px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-rose-500/50 transition-all"
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!w-4 !h-4 !bg-rose-500 !border-4 !border-[#050505] !shadow-[0_0_15px_rgba(244,63,94,0.5)] hover:!scale-125 transition-all"
            />

            <button
                onClick={() => data.onDelete(id)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white scale-0 group-hover:scale-100 transition-transform shadow-lg z-50"
            >
                <X size={10} />
            </button>

            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-rose-500/20 rounded-lg">
                        <Shirt size={14} className="text-rose-400" />
                    </div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">WARDROBE_LOCK</span>
                </div>
                <button
                    onClick={() => setShowColors(!showColors)}
                    className="p-1 bg-white/5 rounded-md hover:bg-white/10 transition-colors"
                >
                    <Palette size={12} className="text-rose-400" />
                </button>
            </div>

            {/* Color Swatches */}
            <motion.div
                initial={false}
                animate={{ height: showColors ? 'auto' : 0, opacity: showColors ? 1 : 0 }}
                className="overflow-hidden mb-2"
            >
                <div className="grid grid-cols-8 gap-1 p-2 bg-black/40 rounded-lg border border-white/5">
                    {COLOR_PRESETS.map(color => (
                        <button
                            key={color}
                            onClick={() => handleColorSelect(color)}
                            className="w-5 h-5 rounded-md border border-white/10 hover:scale-125 transition-transform"
                            style={{ backgroundColor: color }}
                        />
                    ))}
                </div>
            </motion.div>

            {/* Outfit Description */}
            <textarea
                value={data.outfitDescription || ''}
                onChange={handleTextChange}
                placeholder="Black sports bra, grey yoga pants, white sneakers..."
                className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] text-white/80 font-mono resize-none focus:outline-none focus:border-rose-500/40 transition-colors"
                rows={3}
            />

            {/* Active Color */}
            {data.primaryColor && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 flex items-center gap-2"
                >
                    <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: data.primaryColor }} />
                    <span className="text-[8px] text-white/30 font-mono uppercase">PRIMARY_LOCKED</span>
                </motion.div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
                <span className="text-[6px] font-bold text-white/10 uppercase tracking-[0.4em]">WARD_LOCK_V1</span>
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-rose-400">
                    <div className={`w-1.5 h-1.5 rounded-full ${data.outfitDescription ? 'bg-rose-500' : 'border border-rose-500/40'}`} />
                    {data.outfitDescription ? 'OUTFIT_SET' : 'AWAITING_INPUT'}
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-4 !h-4 !bg-rose-500 !border-4 !border-[#050505] !shadow-[0_0_15px_rgba(244,63,94,0.5)] hover:!scale-125 transition-all"
            />
        </motion.div>
    );
});
