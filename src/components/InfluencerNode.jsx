import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { X, ShieldCheck, Activity } from 'lucide-react';
import { useAppStore } from '../store';

export default memo(({ id, data }) => {
    const edges = useAppStore(s => s.edges);
    const kit = data.kit || {};
    const anchorImg = kit.anchor || data.image || '';
    const profileImg = kit.profile || kit.angle_1 || '';
    const fullBodyImg = kit.fullBody || kit.full_body || '';
    const lockedCount = [anchorImg, profileImg, fullBodyImg].filter(Boolean).length;

    const isTargetConnected = edges.some(e => e.target === id);
    const isSourceConnected = edges.some(e => e.source === id);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ scale: 1.25 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            style={{ zIndex: 1 }}
            className="group relative px-4 py-3 bg-[#0a0a0a]/90 border-2 border-[#bef264]/20 rounded-2xl min-w-[200px] max-w-[220px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-[#bef264]/50 transition-all"
        >
            <Handle type="target" position={Position.Left}
                className={`!w-4 !h-4 !bg-[#bef264] !border-4 !border-[#050505] !shadow-lg hover:!scale-125 transition-all handle-character ${isTargetConnected ? 'neural-engaged' : ''}`}
            />

            <button
                onClick={() => data.onDelete(id)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white scale-0 group-hover:scale-100 transition-transform shadow-lg z-50"
            >
                <X size={10} />
            </button>

            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#bef264]/15 rounded-lg">
                        <ShieldCheck size={13} className="text-[#bef264]" />
                    </div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">CONSISTENCY</span>
                </div>
                <div className="flex items-center gap-1">
                    <Activity size={7} className="text-[#bef264] animate-pulse" />
                    <span className={`text-[7px] font-bold ${lockedCount === 3 ? 'text-[#bef264]' : 'text-yellow-400'}`}>
                        {lockedCount}/3
                    </span>
                </div>
            </div>

            {/* Anchor image — only visible image */}
            <div className="relative w-full h-28 rounded-xl overflow-hidden mb-2 bg-black/40 border border-white/5">
                {anchorImg ? (
                    <img src={anchorImg} alt="Anchor" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[8px] text-white/20 font-mono">NO ANCHOR</span>
                    </div>
                )}
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 rounded-md">
                    <span className="text-[6px] text-[#bef264] font-mono">ANCHOR</span>
                </div>
            </div>

            {/* Character name */}
            <p className="text-[10px] font-black text-white/70 uppercase tracking-tight truncate mb-2">
                {data.label || 'AGENT_CORE'}
            </p>

            {/* 3-slot kit bar */}
            <div className="flex gap-1.5">
                {[['ANCHOR', anchorImg], ['PROFILE', profileImg], ['FULL BODY', fullBodyImg]].map(([label, img]) => (
                    <div key={label} className="flex-1 flex flex-col gap-0.5 items-center">
                        <div className={`w-full h-1 rounded-full transition-all duration-500
                            ${img ? 'bg-[#bef264] shadow-[0_0_6px_rgba(190,242,100,0.5)]' : 'bg-white/10'}`} />
                        <span className={`text-[5px] font-bold uppercase tracking-wide
                            ${img ? 'text-[#bef264]/50' : 'text-white/15'}`}>
                            {label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2">
                <span className="text-[6px] font-bold text-white/10 uppercase tracking-[0.4em]">IDENTITY_LOC</span>
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-[#bef264]">
                    <div className={`w-1.5 h-1.5 rounded-full ${anchorImg ? 'bg-[#bef264]' : 'border border-[#bef264]/40'}`} />
                    {anchorImg ? 'KIT_LOCKED' : 'UPLOAD_REQ'}
                </div>
            </div>

            <Handle type="source" position={Position.Right}
                className={`!w-4 !h-4 !bg-[#bef264] !border-4 !border-[#050505] !shadow-lg hover:!scale-125 transition-all handle-character ${isSourceConnected ? 'neural-engaged' : ''}`}
            />
        </motion.div>
    );
});
