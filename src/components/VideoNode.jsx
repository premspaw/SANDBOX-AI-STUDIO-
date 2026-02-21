import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Video, Play, Trash2, Cpu, Sparkles, MessageSquare, Star, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store';

const VideoNode = ({ id, data }) => {
    const { videoUrl, label, onDelete } = data;
    const [isCritiquing, setIsCritiquing] = useState(false);
    const [critique, setCritique] = useState(null);
    const bible = useAppStore(state => state.universeBible);

    const handleCritique = async () => {
        if (!videoUrl || isCritiquing) return;
        setIsCritiquing(true);
        try {
            const { analyzeSceneMultimodal } = await import('../../geminiService');
            // In a real production app, we would ideally extract a base64 frame from the video element here.
            // For now, we'll pass the videoUrl and let the service handle it or mock the visual extraction.
            const feedback = await analyzeSceneMultimodal(videoUrl, bible);
            setCritique(feedback);
        } catch (err) {
            console.error("Critique failed:", err);
        } finally {
            setIsCritiquing(false);
        }
    };

    return (
        <div className="relative group">
            <div className="w-80 h-48 rounded-3xl bg-black/40 backdrop-blur-3xl border border-white/10 overflow-hidden flex flex-col shadow-2xl">
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
                            <video src={videoUrl} className="w-full h-full object-cover" loop muted playsInline autoPlay />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/player:opacity-100 transition-opacity">
                                <button className="p-4 bg-[#bef264] rounded-full shadow-[0_0_20px_rgba(190,242,100,0.5)] transform hover:scale-110 transition-transform">
                                    <Play className="w-6 h-6 text-black fill-black" />
                                </button>
                            </div>

                            {/* AI Critique Button */}
                            <button
                                onClick={handleCritique}
                                disabled={isCritiquing}
                                className="absolute top-2 right-2 px-3 py-1.5 bg-black/60 backdrop-blur border border-white/10 rounded-xl flex items-center gap-2 hover:bg-white/10 transition-all z-10"
                            >
                                <Sparkles className={`w-3 h-3 ${isCritiquing ? 'text-[#bef264] animate-spin' : 'text-[#bef264]'}`} />
                                <span className="text-[9px] font-black uppercase tracking-widest text-white">AI Critique</span>
                            </button>
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
        </div>
    );
};

export default VideoNode;
