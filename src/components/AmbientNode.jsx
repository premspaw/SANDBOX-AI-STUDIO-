import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { Wind, X, Waves } from 'lucide-react';
import { useAppStore } from '../store';

export default memo(({ id, data }) => {
    const updateNodeData = useAppStore(s => s.updateNodeData);

    const atmospheres = [
        'CYBERPUNK_CITY',
        'DEEP_SPACE_VOID',
        'RAINSTORM_REVERIE',
        'NEURAL_LAB_HUM',
        'ANCIENT_FOREST'
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="group relative px-5 py-4 bg-[#0a0a0a]/90 backdrop-blur-2xl border-2 border-emerald-500/20 rounded-2xl min-w-[220px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-emerald-500/50 transition-all"
        >
            <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-black" />

            <button
                onClick={() => data.onDelete(id)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white scale-0 group-hover:scale-100 transition-transform shadow-lg z-50"
            >
                <X size={10} />
            </button>

            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                        <Wind size={14} className="text-emerald-400" />
                    </div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{data.label || 'AMBIENT_LAYER'}</span>
                </div>
            </div>

            <select
                value={data.atmosphere || 'CYBERPUNK_CITY'}
                onChange={(e) => updateNodeData(id, { atmosphere: e.target.value })}
                className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] text-white/80 font-mono focus:outline-none focus:border-emerald-500/40 transition-colors appearance-none"
            >
                {atmospheres.map(atm => (
                    <option key={atm} value={atm}>{atm}</option>
                ))}
            </select>

            <div className="mt-3 flex items-center justify-between">
                <span className="text-[7px] font-bold text-white/10 uppercase tracking-[0.4em]">AMB_GEN_V2</span>
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-emerald-400">
                    <Waves size={10} />
                    LOOP_ACTIVE
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-black" />
        </motion.div>
    );
});
