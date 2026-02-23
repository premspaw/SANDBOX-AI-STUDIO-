import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Play, Loader2, X, Film, User, Type, CheckCircle2, Circle } from 'lucide-react';
import { useAppStore } from '../store';

const PHASES = [
    { id: 'hook', label: 'HOOK_SCRIPT', icon: Zap, color: 'orange' },
    { id: 'avatar', label: 'AVATAR_RENDER', icon: User, color: 'amber' },
    { id: 'caption', label: 'CAPTION_OVERLAY', icon: Type, color: 'yellow' },
];

const statusColors = {
    PENDING: 'text-white/20',
    GENERATING: 'text-orange-400 animate-pulse',
    COMPLETE: 'text-emerald-400',
    ERROR: 'text-red-400',
};

export default memo(({ id, data }) => {
    const updateNodeData = useAppStore(s => s.updateNodeData);
    const activeCharacter = useAppStore(s => s.activeCharacter);
    const [isExecuting, setIsExecuting] = useState(false);
    const [phaseStatus, setPhaseStatus] = useState({
        hook: 'PENDING',
        avatar: 'PENDING',
        caption: 'PENDING',
    });
    const [results, setResults] = useState({});

    const handleExecutePipeline = async () => {
        if (isExecuting) return;
        setIsExecuting(true);

        try {
            // Phase 1: Hook Script
            setPhaseStatus(p => ({ ...p, hook: 'GENERATING' }));
            const hookRes = await fetch('http://localhost:3002/api/ugc/generate-hook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterName: activeCharacter?.name || data.characterName || 'Digital Creator',
                    niche: data.niche || 'lifestyle',
                    hookStyle: data.hookStyle || 'PATTERN_INTERRUPT',
                    script: data.hookScript || ''
                })
            });
            const hookData = await hookRes.json();
            setResults(r => ({ ...r, hook: hookData }));
            setPhaseStatus(p => ({ ...p, hook: hookData.error ? 'ERROR' : 'COMPLETE' }));

            // Phase 2: Avatar Render
            setPhaseStatus(p => ({ ...p, avatar: 'GENERATING' }));
            const avatarRes = await fetch('http://localhost:3002/api/ugc/generate-avatar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterName: activeCharacter?.name || 'Creator',
                    script: hookData.hookScript || data.hookScript || 'Hey, check this out!',
                    style: data.avatarStyle || 'TALKING_HEAD',
                    ratio: '9:16'
                })
            });
            const avatarData = await avatarRes.json();
            setResults(r => ({ ...r, avatar: avatarData }));

            if (avatarData.image) {
                const { saveGeneratedAsset } = await import('../supabaseService');
                saveGeneratedAsset(avatarData.image, 'image', `ugc_avatar_${id}_${Date.now()}.png`);
            }

            setPhaseStatus(p => ({ ...p, avatar: avatarData.error ? 'ERROR' : 'COMPLETE' }));

            // Phase 3: Caption Overlay
            setPhaseStatus(p => ({ ...p, caption: 'GENERATING' }));
            const captionRes = await fetch('http://localhost:3002/api/ugc/generate-captions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    script: hookData.hookScript || data.hookScript || '',
                    style: data.captionStyle || 'KINETIC_BOLD',
                })
            });
            const captionData = await captionRes.json();
            setResults(r => ({ ...r, caption: captionData }));
            setPhaseStatus(p => ({ ...p, caption: captionData.error ? 'ERROR' : 'COMPLETE' }));

            updateNodeData(id, { pipelineComplete: true, results: { hookData, avatarData, captionData } });

        } catch (err) {
            console.error('UGC Pipeline Error:', err);
        } finally {
            setIsExecuting(false);
        }
    };

    const StatusIcon = ({ status }) => {
        if (status === 'COMPLETE') return <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}><CheckCircle2 size={10} className="text-emerald-400" /></motion.div>;
        if (status === 'GENERATING') return <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Loader2 size={10} className="text-orange-400" /></motion.div>;
        if (status === 'ERROR') return <X size={10} className="text-red-400" />;
        return <Circle size={10} className="text-white/20" />;
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ scale: 1.25 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="group relative bg-[#0a0a0a]/95 backdrop-blur-2xl border-2 border-orange-500/20 rounded-2xl min-w-[300px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] hover:border-orange-500/50 transition-all overflow-hidden"
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!w-4 !h-4 !bg-orange-500 !border-4 !border-[#050505] !shadow-[0_0_15px_rgba(249,115,22,0.5)] hover:!scale-125 transition-all"
            />

            <button
                onClick={() => data.onDelete(id)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white scale-0 group-hover:scale-100 transition-transform shadow-lg z-50"
            >
                <X size={10} />
            </button>

            {/* Header */}
            <div className="px-5 py-3 border-b border-orange-500/10 bg-gradient-to-r from-orange-500/10 to-amber-500/5">
                <div className="flex items-center gap-2">
                    <motion.div
                        animate={{ rotate: isExecuting ? [0, 10, -10, 0] : 0 }}
                        transition={{ repeat: isExecuting ? Infinity : 0, duration: 0.5 }}
                        className="p-1.5 bg-orange-500/20 rounded-lg"
                    >
                        <Film size={14} className="text-orange-400" />
                    </motion.div>
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">{data.label || 'UGC_PIPELINE'}</span>
                    <motion.div
                        animate={{ scale: [1, 1.4, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className={`ml-auto w-1.5 h-1.5 rounded-full ${data.pipelineComplete ? 'bg-emerald-500' : 'bg-orange-500'}`}
                    />
                </div>
            </div>

            {/* Pipeline Phases */}
            <div className="px-5 py-4 space-y-2">
                {PHASES.map((phase, i) => (
                    <motion.div
                        key={phase.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-3"
                    >
                        <StatusIcon status={phaseStatus[phase.id]} />
                        <motion.div
                            animate={phaseStatus[phase.id] === 'GENERATING' ? { borderColor: ['rgba(249,115,22,0.2)', 'rgba(249,115,22,0.5)', 'rgba(249,115,22,0.2)'] } : {}}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-2 flex items-center gap-2"
                        >
                            <phase.icon size={10} className={statusColors[phaseStatus[phase.id]]} />
                            <span className={`text-[9px] font-black uppercase tracking-widest ${statusColors[phaseStatus[phase.id]]}`}>
                                {phase.label}
                            </span>
                            <AnimatePresence>
                                {phaseStatus[phase.id] === 'COMPLETE' && results[phase.id] && (
                                    <motion.span
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="ml-auto text-[7px] text-emerald-400/60 font-mono"
                                    >
                                        OK
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                ))}
            </div>

            {/* Hook Script Input */}
            <div className="px-5 pb-3">
                <textarea
                    value={data.hookScript || ''}
                    onChange={(e) => updateNodeData(id, { hookScript: e.target.value })}
                    placeholder="Write your hook script..."
                    className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[10px] text-white/80 font-mono italic resize-none focus:outline-none focus:border-orange-500/40 transition-colors"
                    rows={2}
                />
            </div>

            {/* Execute Button */}
            <div className="px-5 pb-4">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleExecutePipeline}
                    disabled={isExecuting}
                    className="w-full py-2.5 bg-gradient-to-r from-orange-600/30 to-amber-600/30 hover:from-orange-600/50 hover:to-amber-600/50 disabled:opacity-40 rounded-xl border border-orange-500/30 text-[9px] font-black text-white uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                    {isExecuting ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                    {isExecuting ? 'EXECUTING_PIPELINE...' : 'EXECUTE_PIPELINE'}
                </motion.button>
            </div>

            {/* Footer */}
            <div className="px-5 pb-3 flex items-center justify-between border-t border-white/5 pt-2">
                <span className="text-[6px] font-bold text-white/10 uppercase tracking-[0.4em]">UGC_VIRAL_ENGINE_V1</span>
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-orange-400">
                    <Zap size={10} />
                    {data.pipelineComplete ? 'PIPELINE_COMPLETE' : 'AWAITING_EXEC'}
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-4 !h-4 !bg-orange-500 !border-4 !border-[#050505] !shadow-[0_0_15px_rgba(249,115,22,0.5)] hover:!scale-125 transition-all"
            />
        </motion.div>
    );
});
