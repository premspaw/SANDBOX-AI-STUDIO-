import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { Maximize2, Loader2, Search, X, Zap, ScanLine } from 'lucide-react';

import { useAppStore } from '../store';

export default memo(({ id, data }) => {
    const { setFocusMode } = useAppStore();
    return (
        <motion.div
            whileHover={{ scale: 1.25 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="relative group"
        >
            <Handle type="target" position={Position.Left} className="opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Delete button */}
            <div className="absolute -top-4 -left-4 z-[50] opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
                <button
                    onClick={(e) => { e.stopPropagation(); data.onDelete(id); }}
                    className="p-3 bg-red-600/90 backdrop-blur-xl text-white rounded-2xl shadow-[0_10px_20px_rgba(220,38,38,0.4)] hover:bg-red-500 hover:scale-110 active:scale-90 transition-all border border-red-500/20"
                >
                    <X size={16} strokeWidth={3} />
                </button>
            </div>

            <motion.div
                layoutId={`node-frame-${id}`}
                className={`w-48 h-60 bg-[#0a0a0a] backdrop-blur-3xl border rounded-[1.5rem] overflow-hidden shadow-2xl transition-all duration-500 ${data.isOptimistic
                    ? 'border-cyan-400/30 shadow-[0_0_25px_rgba(34,211,238,0.12)]'
                    : data.analysisData
                        ? 'border-[#bef264]/40 shadow-[0_0_25px_rgba(190,242,100,0.15)]'
                        : 'border-white/10 group-hover:border-[#bef264]/30 shadow-black/80 shadow-2xl'
                    }`}
            >
                {data.isOptimistic ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-cyan-400/5 relative overflow-hidden">
                        <motion.div
                            initial={{ y: -150 }}
                            animate={{ y: 300 }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-x-0 h-[2px] bg-cyan-400 shadow-[0_0_15px_#22d3ee] z-10"
                        />

                        <div className="relative">
                            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin opacity-40" />
                            <Search className="w-6 h-6 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
                        </div>

                        <div className="flex flex-col items-center gap-1 text-center px-4">
                            <span className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.3em] animate-pulse">Compiling_Neural_State</span>
                            <span className="text-[7px] font-bold text-cyan-400/30 uppercase tracking-widest leading-tight">{data.label}</span>
                        </div>
                    </div>
                ) : data.analysisData ? (
                    <div className="w-full h-full relative bg-black flex flex-col">
                        <div className="absolute inset-0 opacity-20">
                            <img src={data.image} alt="Background" className="w-full h-full object-cover grayscale blur-sm" />
                        </div>
                        <div className="absolute inset-0 bg-[#bef264]/5 z-10" />

                        <div className="relative z-20 p-4 flex flex-col h-full">
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#bef264]/20">
                                <ScanLine size={12} className="text-[#bef264]" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-[#bef264]">IDENTITY_KERNEL</span>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                <p className="text-[7px] font-mono text-[#bef264]/80 leading-relaxed whitespace-pre-wrap">
                                    {data.analysisData}
                                </p>
                            </div>
                            <div className="mt-3 pt-3 border-t border-[#bef264]/20 flex justify-between items-center">
                                <span className="text-[7px] font-bold text-[#bef264]/50 uppercase tracking-widest">ANALYSIS_COMPLETE</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-[#bef264] animate-pulse" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full relative">
                        <motion.img
                            layoutId={`media-${id}`}
                            src={data.image}
                            alt={data.label}
                            className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500 ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />

                        <div className="absolute top-4 left-4 flex gap-2">
                            {data.resolution && data.resolution !== '1K' && (
                                <div className="px-2 py-0.5 bg-[#bef264] text-black text-[8px] font-black rounded uppercase tracking-widest shadow-lg">
                                    {data.resolution}
                                </div>
                            )}
                        </div>

                        <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all transform scale-50 group-hover:scale-100 origin-top-right">
                            {data.resolution !== '4K' && data.onUpscale && (
                                <div className="flex flex-col gap-1 items-end">
                                    <span className="text-[7px] font-black uppercase text-white/50 tracking-widest mb-1">ENHANCE</span>
                                    {data.resolution === '1K' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); data.onUpscale(id, '2K'); }}
                                            className="px-3 py-2 bg-cyan-500/20 border border-cyan-500/50 backdrop-blur-md text-cyan-400 rounded-lg shadow-xl hover:bg-cyan-400 hover:text-black hover:scale-105 active:scale-90 transition-all font-black text-[9px] uppercase tracking-wider w-full text-right"
                                            title="Upscale to 2K"
                                        >
                                            Upscale 2K
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); data.onUpscale(id, '4K'); }}
                                        className="px-3 py-2 bg-purple-500/20 border border-purple-500/50 backdrop-blur-md text-purple-400 rounded-lg shadow-xl hover:bg-purple-400 hover:text-black hover:scale-105 active:scale-90 transition-all font-black text-[9px] uppercase tracking-wider w-full text-right"
                                        title="Upscale to 4K"
                                    >
                                        Upscale 4K
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={() => setFocusMode(id)}
                                className="p-3 bg-[#bef264] text-black rounded-xl shadow-xl hover:scale-110 active:scale-90 transition-all mt-2"
                                title="Focus View"
                            >
                                <Maximize2 size={16} />
                            </button>
                        </div>

                        <div className="absolute bottom-4 left-4 right-4">
                            <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-[#bef264] italic">Active_Construct</span>
                                <Zap size={8} className="text-[#bef264]/40" />
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 block border-t border-white/5 pt-1 truncate">{data.label}</span>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Neural Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-4 !h-4 !bg-[#bef264] !border-4 !border-[#050505] !shadow-[0_0_15px_rgba(190,242,100,0.5)] hover:!scale-125 transition-all"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="!w-4 !h-4 !bg-[#bef264] !border-4 !border-[#050505] !shadow-[0_0_15px_rgba(190,242,100,0.5)] hover:!scale-125 transition-all"
            />
        </motion.div>
    );
});
