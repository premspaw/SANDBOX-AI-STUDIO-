import { Position, useUpdateNodeInternals } from 'reactflow';
import React, { memo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, X } from 'lucide-react';
import { useAppStore } from '../../store';
import MagneticHandle from '../edges/MagneticHandle';

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
    const updateNodeInternals = useUpdateNodeInternals();
    const updateNodeData = useAppStore(s => s.updateNodeData);
    const edges = useAppStore(s => s.edges);

    useEffect(() => {
        updateNodeInternals(id);
    }, [id, updateNodeInternals]);
    const isTargetConnected = edges.some(e => e.target === id);
    const isSourceConnected = edges.some(e => e.source === id);

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
        <div className="relative group" style={{ zIndex: 1 }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="px-5 py-4 bg-[#0a0a0a]/90 border-2 border-orange-500/20 rounded-2xl min-w-[220px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-orange-500/50 transition-all font-sans"
            >

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
            </motion.div>

            <MagneticHandle type="target" position={Position.Left} color="#f97316" className={`handle-location ${isTargetConnected ? 'neural-engaged' : ''}`} />
            <MagneticHandle type="source" position={Position.Right} color="#f97316" className={`handle-location ${isSourceConnected ? 'neural-engaged' : ''}`} />
        </div>
    );
});
