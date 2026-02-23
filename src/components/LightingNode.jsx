import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { Sun, X } from 'lucide-react';
import { useAppStore } from '../store';

const FlareIcon = ({ size, className }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M19.07 4.93l-1.41 1.41M6.34 17.66l-1.41 1.41M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41" />
    </svg>
);

export default memo(({ id, data }) => {
    const updateNodeData = useAppStore(s => s.updateNodeData);

    const atmospheres = [
        'NEURAL_GLOW',
        'VOLUMETRIC_HAZE',
        'NEON_NOIR',
        'CYBER_PUNK',
        'STARK_ANIMAL',
        'GOLDEN_HOUR',
        'MOONLIGHT_SILVER'
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ scale: 1.25 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="group relative px-5 py-4 bg-[#0a0a0a]/90 backdrop-blur-2xl border-2 border-orange-500/20 rounded-2xl min-w-[220px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-orange-500/50 transition-all"
        >
            <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-orange-500 !border-2 !border-black" />

            <button
                onClick={() => data.onDelete(id)}
                className="absolute -top-2 -right-2 p-1 bg-red-400 rounded-full text-white scale-0 group-hover:scale-100 transition-transform shadow-lg z-50"
            >
                <X size={10} />
            </button>

            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-orange-500/20 rounded-lg">
                        <Sun size={14} className="text-orange-400" />
                    </div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{data.label || 'ATMOSPHERE_FX'}</span>
                </div>
            </div>

            <select
                value={data.lighting || 'NEURAL_GLOW'}
                onChange={(e) => updateNodeData(id, { lighting: e.target.value })}
                className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] text-white/80 font-mono focus:outline-none focus:border-orange-500/40 transition-colors appearance-none"
            >
                {atmospheres.map(atm => (
                    <option key={atm} value={atm}>{atm}</option>
                ))}
            </select>

            <div className="mt-3 flex items-center justify-between">
                <span className="text-[7px] font-bold text-white/10 uppercase tracking-[0.4em]">LIGHT_CORE_A1</span>
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-orange-400">
                    <FlareIcon size={10} />
                    PHOTON_SYNC
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-orange-500 !border-2 !border-black" />
        </motion.div >
    );
});
