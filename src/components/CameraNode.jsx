import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { Camera, X, Move, Clock, Waves, Gauge } from 'lucide-react';
import { useAppStore } from '../store';

export default memo(({ id, data }) => {
    const updateNodeData = useAppStore(s => s.updateNodeData);

    const movements = [
        'PHASE_SHIFT', 'ZOOM_IN', 'ZOOM_OUT', 'PAN_LEFT', 'PAN_RIGHT',
        'DOLLY_IN', 'DOLLY_OUT', 'ORBIT_360', 'CRANE_UP', 'CRANE_DOWN',
        'DUTCH_TILT', 'WHIP_PAN',
    ];

    const easings = ['LINEAR', 'EASE_IN', 'EASE_OUT', 'EASE_IN_OUT', 'CUBIC_BEZIER'];

    const movementGradients = {
        ZOOM_IN: 'from-blue-500/20 to-cyan-500/10',
        ZOOM_OUT: 'from-cyan-500/20 to-blue-500/10',
        PAN_LEFT: 'from-blue-400/20 to-indigo-500/10',
        PAN_RIGHT: 'from-indigo-500/20 to-blue-400/10',
        DOLLY_IN: 'from-sky-500/20 to-blue-600/10',
        DOLLY_OUT: 'from-blue-600/20 to-sky-500/10',
        ORBIT_360: 'from-violet-500/20 to-blue-500/10',
        CRANE_UP: 'from-blue-300/20 to-sky-500/10',
        CRANE_DOWN: 'from-sky-500/20 to-blue-300/10',
        DUTCH_TILT: 'from-purple-500/20 to-blue-500/10',
        WHIP_PAN: 'from-red-500/20 to-orange-500/10',
        PHASE_SHIFT: 'from-blue-500/10 to-transparent',
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ scale: 1.25 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="group relative px-5 py-4 bg-[#0a0a0a]/90 backdrop-blur-2xl border-2 border-blue-500/20 rounded-2xl min-w-[250px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-blue-500/50 transition-all overflow-hidden"
        >
            {/* Movement gradient indicator */}
            <motion.div
                key={data.movement}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ duration: 0.6 }}
                className={`absolute inset-0 bg-gradient-to-br ${movementGradients[data.movement] || movementGradients.PHASE_SHIFT} pointer-events-none`}
            />

            <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-black" />

            <button
                onClick={() => data.onDelete(id)}
                className="absolute -top-2 -right-2 p-1 bg-red-400 rounded-full text-white scale-0 group-hover:scale-100 transition-transform shadow-lg z-50"
            >
                <X size={10} />
            </button>

            <div className="relative z-10">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                        <motion.div
                            whileHover={{ rotate: 15 }}
                            className="p-1.5 bg-blue-500/20 rounded-lg"
                        >
                            <Camera size={14} className="text-blue-400" />
                        </motion.div>
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{data.label || 'CINEMA_CAM'}</span>
                    </div>
                </div>

                {/* Movement Selector */}
                <select
                    value={data.movement || 'PHASE_SHIFT'}
                    onChange={(e) => updateNodeData(id, { movement: e.target.value })}
                    className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 text-[10px] text-white/80 font-mono focus:outline-none focus:border-blue-500/40 transition-colors appearance-none mb-2"
                >
                    {movements.map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>

                {/* Duration & Intensity Row */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="grid grid-cols-2 gap-2 mb-2"
                >
                    <div>
                        <div className="flex items-center gap-1 mb-1">
                            <Clock size={8} className="text-blue-400/60" />
                            <span className="text-[7px] font-bold text-white/30 uppercase tracking-widest">Duration</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="range" min="1" max="10" step="0.5"
                                value={data.duration || 3}
                                onChange={(e) => updateNodeData(id, { duration: parseFloat(e.target.value) })}
                                className="flex-1 h-1 accent-blue-500 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:appearance-none"
                            />
                            <span className="text-[9px] font-mono text-blue-400 w-6 text-right">{data.duration || 3}s</span>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-1 mb-1">
                            <Gauge size={8} className="text-blue-400/60" />
                            <span className="text-[7px] font-bold text-white/30 uppercase tracking-widest">Intensity</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="range" min="0.1" max="2.0" step="0.1"
                                value={data.intensity || 1.0}
                                onChange={(e) => updateNodeData(id, { intensity: parseFloat(e.target.value) })}
                                className="flex-1 h-1 accent-blue-500 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:appearance-none"
                            />
                            <span className="text-[9px] font-mono text-blue-400 w-6 text-right">{data.intensity || 1.0}x</span>
                        </div>
                    </div>
                </motion.div>

                {/* Easing Selector */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="flex items-center gap-2 mb-2"
                >
                    <Waves size={10} className="text-blue-400/40" />
                    <select
                        value={data.easing || 'EASE_IN_OUT'}
                        onChange={(e) => updateNodeData(id, { easing: e.target.value })}
                        className="flex-1 bg-black/30 border border-white/5 rounded-lg p-1.5 text-[9px] text-white/60 font-mono focus:outline-none focus:border-blue-500/40 appearance-none"
                    >
                        {easings.map(e => (
                            <option key={e} value={e}>{e}</option>
                        ))}
                    </select>
                </motion.div>

                <div className="flex items-center justify-between">
                    <span className="text-[7px] font-bold text-white/10 uppercase tracking-[0.4em]">OPTIC_GEAR_V5</span>
                    <div className="flex items-center gap-1.5 text-[8px] font-bold text-blue-400">
                        <Move size={10} />
                        MOTION_LOCKED
                    </div>
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-black" />
        </motion.div>
    );
});
