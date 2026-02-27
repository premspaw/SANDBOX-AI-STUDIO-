import { Position, useUpdateNodeInternals } from 'reactflow';
import React, { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, X, Activity, Loader2, Clock, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store';
import { getApiUrl } from '../../config/apiConfig';
import MagneticHandle from '../edges/MagneticHandle';

export default memo(({ id, data }) => {
    const updateNodeInternals = useUpdateNodeInternals();
    const updateNodeData = useAppStore(s => s.updateNodeData);
    const edges = useAppStore(s => s.edges);

    useEffect(() => {
        updateNodeInternals(id);
    }, [id, updateNodeInternals]);

    const [isGenerating, setIsGenerating] = useState(false);
    const [scoreData, setScoreData] = useState(null);

    const isTargetConnected = edges.some(e => e.target === id);
    const isSourceConnected = edges.some(e => e.source === id);

    const styles = [
        'SYNTHWAVE_DRIVE', 'ORCHESTRAL_FURY', 'LOFI_NEURAL_BEATS', 'GLITCH_HOP_CHASE',
        'SOLO_CELLO_DIRGE', 'AMBIENT_VOID', 'EPIC_TRAILER', 'JAZZ_NOIR',
    ];

    const durations = [5, 10, 15, 30, 60];

    const handleGenerateScore = async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        try {
            const response = await fetch(getApiUrl('/api/music/generate'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: data.prompt || `Generate a ${data.style || 'SYNTHWAVE_DRIVE'} score`,
                    style: data.style || 'SYNTHWAVE_DRIVE',
                    duration: data.duration || 10
                })
            });
            const result = await response.json();
            if (result.error) throw new Error(result.error);

            setScoreData(result.score);
            updateNodeData(id, { scoreGenerated: true, scoreData: result.score });
        } catch (err) {
            console.error('Music generation error:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="relative group" style={{ zIndex: 1 }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="px-5 py-4 bg-[#0a0a0a]/90 border-2 border-pink-500/20 rounded-2xl min-w-[250px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-pink-500/50 transition-all font-sans"
            >
                <button
                    onClick={() => data.onDelete(id)}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white scale-0 group-hover:scale-100 transition-transform shadow-lg z-50"
                >
                    <X size={10} />
                </button>

                <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                        <motion.div
                            animate={isGenerating ? { rotate: [0, 10, -10, 0] } : {}}
                            transition={{ repeat: isGenerating ? Infinity : 0, duration: 0.4 }}
                            className="p-1.5 bg-pink-500/20 rounded-lg"
                        >
                            <Music size={14} className="text-pink-400" />
                        </motion.div>
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{data.label || 'MUSIC_CORE'}</span>
                    </div>
                    <motion.div
                        animate={{ scale: [1, 1.4, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className={`w-1.5 h-1.5 rounded-full ${scoreData ? 'bg-emerald-500' : 'bg-pink-500'}`}
                    />
                </div>

                {/* Style Selector */}
                <select
                    value={data.style || 'SYNTHWAVE_DRIVE'}
                    onChange={(e) => updateNodeData(id, { style: e.target.value })}
                    className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 text-[10px] text-white/80 font-mono focus:outline-none focus:border-pink-500/40 transition-colors appearance-none mb-2"
                >
                    {styles.map(st => (
                        <option key={st} value={st}>{st}</option>
                    ))}
                </select>

                {/* Prompt Input */}
                <textarea
                    value={data.prompt || ''}
                    onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
                    placeholder="Describe the mood, tempo, energy..."
                    className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 text-[10px] text-white/70 font-mono italic resize-none focus:outline-none focus:border-pink-500/40 transition-colors mb-2"
                    rows={2}
                />

                {/* Duration & Generate Row */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-1">
                        <Clock size={10} className="text-pink-400/40" />
                        <select
                            value={data.duration || 10}
                            onChange={(e) => updateNodeData(id, { duration: parseInt(e.target.value) })}
                            className="flex-1 bg-black/30 border border-white/5 rounded-lg p-1.5 text-[9px] text-white/60 font-mono focus:outline-none appearance-none"
                        >
                            {durations.map(d => (
                                <option key={d} value={d}>{d}s</option>
                            ))}
                        </select>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={handleGenerateScore}
                        disabled={isGenerating}
                        className="flex-1 py-2 bg-pink-600/20 hover:bg-pink-600/40 disabled:opacity-40 rounded-xl border border-pink-500/30 text-[9px] font-black text-white uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                    >
                        {isGenerating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                        {isGenerating ? 'COMPOSING...' : 'GENERATE_SCORE'}
                    </motion.button>
                </div>

                {/* Score Display */}
                <AnimatePresence>
                    {scoreData && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, y: -10 }}
                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="bg-pink-500/5 border border-pink-500/20 rounded-xl p-3 mb-2 space-y-1.5 overflow-hidden"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black text-pink-400 uppercase">{scoreData.title}</span>
                                <span className="text-[8px] text-white/30 font-mono">{scoreData.bpm} BPM • {scoreData.key}</span>
                            </div>
                            <p className="text-[8px] text-white/50 italic leading-relaxed">{scoreData.description}</p>
                            {scoreData.instruments && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {scoreData.instruments.slice(0, 5).map((inst, i) => (
                                        <motion.span
                                            key={i}
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: i * 0.08 }}
                                            className="text-[7px] px-1.5 py-0.5 bg-pink-500/10 border border-pink-500/20 rounded-full text-pink-300 font-mono"
                                        >
                                            {inst}
                                        </motion.span>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex items-center justify-between">
                    <span className="text-[7px] font-bold text-white/10 uppercase tracking-[0.4em]">MUS_FX_V5</span>
                    <div className="flex items-center gap-1.5 text-[8px] font-bold text-pink-400">
                        <Activity size={10} />
                        {scoreData ? 'SCORE_READY' : 'SONIC_SYNC'}
                    </div>
                </div>
            </motion.div>

            <MagneticHandle type="target" position={Position.Left} color="#ec4899" className={`handle-story ${isTargetConnected ? 'neural-engaged' : ''}`} />
            <MagneticHandle type="source" position={Position.Right} color="#ec4899" className={`handle-story ${isSourceConnected ? 'neural-engaged' : ''}`} />
        </div>
    );
});
