import React, { memo, useState } from 'react';
import { Handle, Position, useStore as useReactFlowStore } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, X, Loader2, Play, Image, Zap } from 'lucide-react';
import { useAppStore } from '../store';

const MOTION_PRESETS = [
    { id: 'breathing', label: 'NATURAL_BREATH', prompt: 'Subtle natural breathing, soft micro-movements, cinematic' },
    { id: 'talking', label: 'TALKING_CAM', prompt: 'Person talking to camera, natural head movements, engaging expression' },
    { id: 'walking', label: 'WALK_FORWARD', prompt: 'Walking forward confidently, smooth steady movement' },
    { id: 'action', label: 'ACTION_SHOT', prompt: 'Dynamic action movement, athletic motion, energetic' },
    { id: 'pan', label: 'SLOW_PAN', prompt: 'Slow cinematic camera pan, smooth tracking shot' },
    { id: 'reveal', label: 'PRODUCT_REVEAL', prompt: 'Slow reveal of product, dramatic lighting, close-up focus' },
];

export default memo(({ id, data }) => {
    const updateNodeData = useAppStore(s => s.updateNodeData);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState(MOTION_PRESETS[0]);
    const [customMotion, setCustomMotion] = useState('');
    const [duration, setDuration] = useState(5);

    // Check if there's a connected image (from keyframe/scene node)
    const edges = useAppStore(s => s.edges);
    const nodes = useAppStore(s => s.nodes);
    const sourceEdge = edges.find(e => e.target === id);
    const sourceNode = sourceEdge ? nodes.find(n => n.id === sourceEdge.source) : null;
    const inputImage = sourceNode?.data?.image || data.inputImage;

    const handleGenerate = async () => {
        if (!inputImage || isGenerating) return;

        setIsGenerating(true);
        const motionPrompt = customMotion || selectedPreset.prompt;

        try {
            const response = await fetch('http://localhost:3001/api/ugc/veo-i2v', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: inputImage,
                    motionPrompt,
                    duration
                })
            });
            const result = await response.json();

            if (result.videoUrl) {
                updateNodeData(id, { videoUrl: result.videoUrl, motionPrompt });
            }
        } catch (err) {
            console.error('Veo I2V Error:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="group relative px-5 py-4 bg-[#0a0a0a]/90 backdrop-blur-2xl border-2 border-cyan-500/20 rounded-2xl min-w-[260px] max-w-[300px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-cyan-500/50 transition-all"
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!w-4 !h-4 !bg-cyan-500 !border-4 !border-[#050505] !shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:!scale-125 transition-all"
            />

            <button
                onClick={() => data.onDelete(id)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white scale-0 group-hover:scale-100 transition-transform shadow-lg z-50"
            >
                <X size={10} />
            </button>

            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-cyan-500/20 rounded-lg">
                        <Video size={14} className="text-cyan-400" />
                    </div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">VEO_I2V_ENGINE</span>
                </div>
                <span className="text-[8px] text-white/20 font-mono">{duration}s</span>
            </div>

            {/* Input Image Preview */}
            <div className={`w-full h-24 rounded-xl overflow-hidden mb-3 border-2 border-dashed ${inputImage ? 'border-cyan-500/30' : 'border-white/10'} bg-black/30 flex items-center justify-center`}>
                {inputImage ? (
                    <img src={inputImage} alt="Keyframe" className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center">
                        <Image size={20} className="text-white/15 mx-auto mb-1" />
                        <span className="text-[8px] text-white/20 font-mono">CONNECT KEYFRAME IMAGE</span>
                    </div>
                )}
            </div>

            {/* Duration */}
            <div className="flex gap-1.5 mb-3">
                {[3, 5, 8].map(d => (
                    <button
                        key={d}
                        onClick={() => setDuration(d)}
                        className={`flex-1 py-1 rounded-lg text-[9px] font-black transition-all ${duration === d
                            ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                            : 'bg-white/5 text-white/30 border border-white/5 hover:bg-white/10'
                            }`}
                    >
                        {d}s
                    </button>
                ))}
            </div>

            {/* Motion Presets */}
            <div className="grid grid-cols-2 gap-1 mb-3">
                {MOTION_PRESETS.map(preset => (
                    <button
                        key={preset.id}
                        onClick={() => { setSelectedPreset(preset); setCustomMotion(''); }}
                        className={`py-1.5 px-2 rounded-lg text-[7px] font-black uppercase transition-all ${selectedPreset.id === preset.id && !customMotion
                            ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                            : 'bg-white/5 text-white/30 border border-white/5 hover:bg-white/10'
                            }`}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            {/* Custom Motion */}
            <input
                value={customMotion}
                onChange={(e) => setCustomMotion(e.target.value)}
                placeholder="Custom motion: slow zoom in, gentle sway..."
                className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-[9px] text-white/60 font-mono mb-3 focus:outline-none focus:border-cyan-500/40 transition-colors"
            />

            {/* Generate Button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGenerate}
                disabled={!inputImage || isGenerating}
                className="w-full py-3 bg-cyan-600/20 hover:bg-cyan-600/40 disabled:opacity-30 rounded-xl border border-cyan-500/30 text-[10px] font-black text-white uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
                {isGenerating ? (
                    <><Loader2 size={12} className="animate-spin" /> ANIMATING...</>
                ) : (
                    <><Zap size={12} /> ANIMATE_KEYFRAME</>
                )}
            </motion.button>

            {/* Video Preview */}
            <AnimatePresence>
                {data.videoUrl && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3"
                    >
                        <video
                            src={data.videoUrl}
                            controls
                            className="w-full rounded-lg border border-cyan-500/20"
                            style={{ maxHeight: '150px' }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
                <span className="text-[6px] font-bold text-white/10 uppercase tracking-[0.4em]">VEO_3.1_I2V</span>
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-cyan-400">
                    <div className={`w-1.5 h-1.5 rounded-full ${data.videoUrl ? 'bg-emerald-500' : inputImage ? 'bg-cyan-500' : 'border border-cyan-500/40'}`} />
                    {data.videoUrl ? 'VIDEO_READY' : inputImage ? 'KEYFRAME_LOCKED' : 'AWAITING_INPUT'}
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-4 !h-4 !bg-cyan-500 !border-4 !border-[#050505] !shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:!scale-125 transition-all"
            />
        </motion.div>
    );
});
