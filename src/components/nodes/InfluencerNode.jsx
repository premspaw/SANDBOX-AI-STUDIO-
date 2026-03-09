import React, { memo } from 'react';
import { Position } from 'reactflow';
import { motion } from 'framer-motion';
import { X, ShieldCheck, Activity } from 'lucide-react';
import { useAppStore } from '../../store';
import MagneticHandle from '../edges/MagneticHandle';

export default memo(({ id, data }) => {
    const edges = useAppStore(s => s.edges);
    const identity = data?.identityProfile;
    const anchorImg = identity?.anchors?.side || data.image || '';
    const fullImg = identity?.anchors?.full || '';
    const poseCount = identity?.poses?.length || 0;
    const isLocked = identity?.identityLock || false;

    const isTargetConnected = edges.some(e => e.target === id);
    const isSourceConnected = edges.some(e => e.source === id);

    return (
        <div className="relative group" style={{ zIndex: 1 }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="px-4 py-3 bg-[#0a0a0a]/90 border-2 border-[#bef264]/20 rounded-2xl min-w-[200px] max-w-[220px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-[#bef264]/50 transition-all font-sans"
            >
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
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">IDENTITY</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Activity size={7} className="text-[#bef264] animate-pulse" />
                        <span className={`text-[7px] font-bold ${isLocked ? 'text-[#bef264]' : 'text-yellow-400'}`}>
                            {isLocked ? 'LOCKED' : 'OPEN'}
                        </span>
                    </div>
                </div>

                {/* Identity Anchors */}
                {identity?.anchors ? (
                    <div className="flex flex-col gap-2 p-3">
                        {anchorImg && (
                            <div className="relative w-full h-24 rounded-xl overflow-hidden bg-black/40 border border-white/5">
                                <img
                                    src={anchorImg}
                                    className="h-full w-full object-cover"
                                    alt="Side Anchor"
                                />
                                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 rounded-md">
                                    <span className="text-[6px] text-[#bef264] font-mono">SIDE</span>
                                </div>
                            </div>
                        )}
                        {fullImg && (
                            <div className="relative w-full h-24 rounded-xl overflow-hidden bg-black/40 border border-white/5">
                                <img
                                    src={fullImg}
                                    className="h-full w-full object-cover"
                                    alt="Full Body Anchor"
                                />
                                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 rounded-md">
                                    <span className="text-[6px] text-[#bef264] font-mono">FULL</span>
                                </div>
                            </div>
                        )}

                        <div className="text-[8px] font-bold uppercase text-[#bef264] mt-2">
                            {poseCount} Poses Stored
                        </div>
                    </div>
                ) : (
                    <div className="relative w-full h-28 rounded-xl overflow-hidden mb-2 bg-black/40 border border-white/5">
                        {data.image ? (
                            <img src={data.image} alt="Anchor" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <span className="text-[8px] text-white/20 font-mono">NO ANCHOR</span>
                            </div>
                        )}
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 rounded-md">
                            <span className="text-[6px] text-[#bef264] font-mono">ANCHOR</span>
                        </div>
                    </div>
                )}

                {/* Character name */}
                <p className="text-[10px] font-black text-white/70 uppercase tracking-tight truncate mb-2">
                    {data.label || 'AGENT_CORE'}
                </p>

                {/* Footer */}
                <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2">
                    <span className="text-[6px] font-bold text-white/10 uppercase tracking-[0.4em]">IDENTITY_LOC</span>
                    <div className="flex items-center gap-1.5 text-[8px] font-bold text-[#bef264]">
                        <div className={`w-1.5 h-1.5 rounded-full ${isLocked ? 'bg-[#bef264]' : 'border border-[#bef264]/40'}`} />
                        {isLocked ? 'KIT_LOCKED' : 'UPLOAD_REQ'}
                    </div>
                </div>
            </motion.div>

            {/* Neural Magnetic Handles - Moved OUTSIDE scaling container for stability */}
            <MagneticHandle type="target" position={Position.Left}
                color="#bef264"
                className={`handle-character ${isTargetConnected ? 'neural-engaged' : ''}`}
            />
            <MagneticHandle type="source" position={Position.Right}
                color="#bef264"
                className={`handle-character ${isSourceConnected ? 'neural-engaged' : ''}`}
            />
        </div>
    );
});
