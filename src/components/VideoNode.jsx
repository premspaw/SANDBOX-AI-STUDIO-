import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Video, Play, Trash2, Cpu, Sparkles, MessageSquare, Star, ChevronRight, X } from 'lucide-react';

const VideoNode = ({ id, data }) => {
    const { videoUrl, label, onDelete, aspectRatio } = data;
    const { setFocusMode } = useAppStore();
    const [isCritiquing, setIsCritiquing] = useState(false);
    const [critique, setCritique] = useState(null);
    const bible = useAppStore(state => state.universeBible);

    const handleCritique = async () => {
        if (!videoUrl || isCritiquing) return;
        setIsCritiquing(true);
        try {
            const { analyzeSceneMultimodal } = await import('../../geminiService');
            const feedback = await analyzeSceneMultimodal(videoUrl, bible);
            setCritique(feedback);
        } catch (err) {
            console.error("Critique failed:", err);
        } finally {
            setIsCritiquing(false);
        }
    };

    const nodeWidth = 320;
    const defaultHeight = 192;

    // Parse ratio strings like "16:9" or "9:16"
    const getRatio = (r) => {
        if (!r || typeof r !== 'string' || !r.includes(':')) return 16 / 9;
        const [w, h] = r.split(':').map(Number);
        return w / h;
    };

    const ratioValue = getRatio(aspectRatio);
    const calculatedHeight = nodeWidth / ratioValue;

    return (
        <motion.div
            whileHover={{ scale: 1.25 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="relative group"
            style={{ width: `${nodeWidth}px`, height: `${calculatedHeight}px` }}
        >
            <div className="w-full h-full rounded-3xl bg-black/40 backdrop-blur-3xl border border-white/10 overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between bg-black/20">
                    <div className="flex items-center gap-2">
                        <Video className="w-3.5 h-3.5 text-[#bef264]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{label || "VIDEO_SEQUENCE"}</span>
                    </div>
                    <button onClick={() => onDelete(id)} className="p-1 hover:bg-red-500/20 rounded-lg transition-colors group/del">
                        <Trash2 className="w-3.5 h-3.5 text-white/20 group-hover/del:text-red-400" />
                    </button>
                </div>

                {/* Player Area */}
                <div className="flex-1 relative bg-black/40 group/player">
                    {videoUrl ? (
                        <>
                            <motion.div
                                layoutId={`media-${id}`}
                                className="w-full h-full"
                            >
                                <video src={videoUrl} className="w-full h-full object-cover" loop muted playsInline autoPlay />
                            </motion.div>

                            {/* Focus Overlay Action */}
                            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover/player:opacity-100 transition-opacity flex justify-end">
                                <button
                                    onClick={() => setFocusMode(id)}
                                    className="p-2 bg-[#bef264] text-black rounded-lg shadow-xl hover:scale-110 active:scale-95 transition-all"
                                    title="Deep Focus"
                                >
                                    <Maximize2 size={12} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-20">
                            <Video className="w-8 h-8 text-white" />
                            <span className="text-[10px] font-mono uppercase tracking-widest">Awaiting Render...</span>
                        </div>
                    )}

                    {/* Critique Overlay */}
                    <AnimatePresence>
                        {critique && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute inset-0 z-20 bg-black/90 backdrop-blur-md p-4 flex flex-col"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-[#bef264]/20 rounded-lg">
                                            <Cpu className="w-4 h-4 text-[#bef264]" />
                                        </div>
                                        <div>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-[#bef264]">Director's Review</div>
                                            <div className="text-[8px] text-white/40 font-mono italic">Sequence ID: {Math.random().toString(36).substring(7).toUpperCase()}</div>
                                        </div>
                                    </div>
                                    <div className="text-xl font-black italic text-[#bef264]">{critique.score}%</div>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-3">
                                    <p className="text-[10px] text-white/80 leading-relaxed italic mb-4">"{critique.critique}"</p>

                                    <div className="space-y-2">
                                        <div className="text-[8px] font-black uppercase tracking-widest text-white/20">Recommendations</div>
                                        {critique.recommendations?.map((rec, i) => (
                                            <div key={i} className="flex items-start gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                                                <ChevronRight className="w-3 h-3 text-[#bef264] flex-shrink-0 mt-0.5" />
                                                <span className="text-[9px] text-white/60">{rec}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => setCritique(null)}
                                    className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5"
                                >
                                    Dismiss Review
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-[#bef264] !border-none" />
            <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-[#bef264] !border-none" />
        </motion.div>
    );
};

export default VideoNode;
