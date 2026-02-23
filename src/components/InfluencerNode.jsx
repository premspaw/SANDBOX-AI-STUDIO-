import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { User, Activity, X, ShieldCheck } from 'lucide-react';

export default memo(({ id, data }) => (
    <motion.div
        whileHover={{ scale: 1.25 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="group relative p-1 bg-gradient-to-br from-[#bef264]/40 via-white/5 to-[#bef264]/40 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all"
    >
        <Handle type="target" position={Position.Top} className="!bg-[#bef264] !border-2 !border-black" />

        <button
            onClick={() => data.onDelete(id)}
            className="absolute -top-2 -right-2 p-1.5 bg-red-500 rounded-full text-white scale-0 group-hover:scale-100 transition-transform shadow-lg z-50"
        >
            <X size={10} />
        </button>

        <div className="bg-[#0a0a0a] rounded-[2.4rem] p-3 pl-3 pr-6 flex items-center gap-4 border border-white/5">
            <div className="relative w-12 h-12 rounded-full bg-zinc-800 border-2 border-[#bef264]/20 overflow-hidden shrink-0 shadow-inner">
                {data.image ? (
                    <img src={data.image} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white/20">
                        <User size={24} />
                    </div>
                )}
                {/* CONSISTENCY_BADGE */}
                <div className="absolute top-0 right-0 p-0.5 bg-[#bef264] rounded-full border border-black shadow-lg">
                    <ShieldCheck size={8} className="text-black" />
                </div>
            </div>

            <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-white uppercase tracking-tighter">{data.label || 'AGENT_CORE'}</span>
                    <div className="px-1.5 py-0.5 bg-[#bef264]/10 rounded border border-[#bef264]/20">
                        <span className="text-[7px] font-black text-[#bef264]">PRO</span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="relative">
                        <Activity size={10} className="text-[#bef264] animate-pulse" />
                        <div className="absolute inset-0 bg-[#bef264] blur-sm animate-pulse opacity-40" />
                    </div>
                    <span className="text-[8px] font-bold text-[#bef264]/60 uppercase tracking-[0.2em]">Neural_Link_Stable</span>
                </div>
            </div>
        </div>

        <Handle type="source" position={Position.Bottom} className="!bg-[#bef264] !border-2 !border-black" />
    </motion.div>
));
