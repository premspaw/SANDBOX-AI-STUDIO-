import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { Zap, X, Volume2 } from 'lucide-react';
import { useAppStore } from '../store';

export default memo(({ id, data }) => {
    const updateNodeData = useAppStore(s => s.updateNodeData);

    const effects = [
        'CINEMATIC_BOOM',
        'GLITCH_MORPH',
        'NEURAL_CHIME',
        'DIGITAL_SWOOSH',
        'IMPACT_REVERB'
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ scale: 1.25 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="group relative px-5 py-4 bg-[#0a0a0a]/90 backdrop-blur-2xl border-2 border-yellow-500/20 rounded-2xl min-w-[220px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-yellow-500/50 transition-all">
            <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-yellow-500 !border-2 !border-black" />

            <button
                onClick={() => data.onDelete(id)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white scale-0 group-hover:scale-100 transition-transform shadow-lg z-50"
            >
                <X size={10} />
            </button>

            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-yellow-500/20 rounded-lg">
                        <Zap size={14} className="text-yellow-400" />
                    </div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{data.label || 'SFX_TRIGGER'}</span>
                </div>
            </div>

            <select
                value={data.effect || 'CINEMATIC_BOOM'}
                onChange={(e) => updateNodeData(id, { effect: e.target.value })}
                className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] text-white/80 font-mono focus:outline-none focus:border-yellow-500/40 transition-colors appearance-none"
            >
                {effects.map(fx => (
                    <option key={fx} value={fx}>{fx}</option>
                ))}
            </select>

            <div className="mt-3 flex items-center justify-between">
                <span className="text-[7px] font-bold text-white/10 uppercase tracking-[0.4em]">SFX_UNIT_V1</span>
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-yellow-400">
                    <Volume2 size={10} />
                    READY
                </div>
            </div>

            <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-yellow-500 !border-2 !border-black" />
        </motion.div>
    );
});
