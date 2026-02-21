import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { MessageSquare, X, Mic2, Play, Loader2, Music2 } from 'lucide-react';
import { useAppStore } from '../store';

export default memo(({ id, data }) => {
    const updateNodeData = useAppStore(s => s.updateNodeData);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);

    const voices = [
        // English
        { id: 'en-US-Journey-F', label: '🇺🇸 JOURNEY_FEMALE' },
        { id: 'en-US-Journey-D', label: '🇺🇸 JOURNEY_MALE' },
        { id: 'en-US-Studio-O', label: '🇺🇸 STUDIO_NARRATOR' },
        { id: 'en-GB-Neural2-B', label: '🇬🇧 NEURAL_BRITISH' },
        // Hindi
        { id: 'hi-IN-Neural2-A', label: '🇮🇳 HINDI_FEMALE' },
        { id: 'hi-IN-Neural2-B', label: '🇮🇳 HINDI_MALE' },
        { id: 'hi-IN-Neural2-D', label: '🇮🇳 HINDI_MALE_2' },
        // Tamil
        { id: 'ta-IN-Standard-A', label: '🇮🇳 TAMIL_FEMALE' },
        { id: 'ta-IN-Standard-B', label: '🇮🇳 TAMIL_MALE' },
        // Telugu
        { id: 'te-IN-Standard-A', label: '🇮🇳 TELUGU_FEMALE' },
        { id: 'te-IN-Standard-B', label: '🇮🇳 TELUGU_MALE' },
        // Kannada
        { id: 'kn-IN-Standard-A', label: '🇮🇳 KANNADA_FEMALE' },
        { id: 'kn-IN-Standard-B', label: '🇮🇳 KANNADA_MALE' },
        // Malayalam
        { id: 'ml-IN-Standard-A', label: '🇮🇳 MALAYALAM_FEMALE' },
        { id: 'ml-IN-Standard-B', label: '🇮🇳 MALAYALAM_MALE' },
    ];

    const handleSynthesize = async () => {
        if (!data.script || isSynthesizing) return;
        setIsSynthesizing(true);
        try {
            const response = await fetch('http://localhost:3001/api/proxy/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: data.script,
                    voiceId: data.voiceId || 'en-US-Journey-F'
                })
            });
            const result = await response.json();
            if (result.audioContent) {
                const blob = new Blob(
                    [Uint8Array.from(atob(result.audioContent), c => c.charCodeAt(0))],
                    { type: 'audio/mp3' }
                );
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                updateNodeData(id, { audioUrl: url });
            }
        } catch (err) {
            console.error("Synthesis error:", err);
        } finally {
            setIsSynthesizing(false);
        }
    };

    const playAudio = () => {
        if (audioUrl) {
            const audio = new Audio(audioUrl);
            audio.play();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="group relative px-5 py-4 bg-[#0a0a0a]/90 backdrop-blur-2xl border-2 border-[#bef264]/20 rounded-2xl min-w-[250px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-[#bef264]/50 transition-all">
            <Handle
                type="target"
                position={Position.Top}
                className="!w-4 !h-4 !bg-purple-500 !border-4 !border-[#050505] !shadow-[0_0_15px_rgba(168,85,247,0.5)] hover:!scale-125 transition-all"
            />

            <button
                onClick={() => data.onDelete(id)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white scale-0 group-hover:scale-100 transition-transform shadow-lg z-50"
            >
                <X size={10} />
            </button>

            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-500/20 rounded-lg">
                        <Mic2 size={14} className="text-purple-400" />
                    </div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{data.label || 'VOICE_TRACK'}</span>
                </div>
                <div className="flex gap-1">
                    <div className={`w-1 h-1 rounded-full ${audioUrl ? 'bg-emerald-500' : 'bg-purple-500'} animate-pulse`} />
                </div>
            </div>

            <select
                value={data.voiceId || 'en-US-Journey-F'}
                onChange={(e) => updateNodeData(id, { voiceId: e.target.value })}
                className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-[9px] text-white/60 font-mono mb-2 focus:outline-none focus:border-purple-500/40"
            >
                {voices.map(v => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                ))}
            </select>

            <textarea
                value={data.script}
                onChange={(e) => updateNodeData(id, { script: e.target.value })}
                placeholder="SYNTHESIZE_SCRIPT..."
                className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] text-white/80 font-mono italic resize-none focus:outline-none focus:border-purple-500/40 transition-colors"
                rows={3}
            />

            <div className="mt-4 flex items-center justify-between gap-2">
                <button
                    onClick={handleSynthesize}
                    disabled={isSynthesizing || !data.script}
                    className="flex-1 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 disabled:opacity-50 rounded-lg border border-purple-500/30 text-[9px] font-bold text-white transition-all flex items-center justify-center gap-2"
                >
                    {isSynthesizing ? <Loader2 size={10} className="animate-spin" /> : <Music2 size={10} />}
                    {isSynthesizing ? 'SYNTHESIZING...' : 'GENERATE_VOICE'}
                </button>
                {audioUrl && (
                    <button
                        onClick={playAudio}
                        className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 rounded-lg border border-emerald-500/30 text-emerald-400 transition-all"
                    >
                        <Play size={12} fill="currentColor" />
                    </button>
                )}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
                <span className="text-[6px] font-bold text-white/10 uppercase tracking-[0.4em]">Node_Alpha_Ref_02</span>
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-purple-400">
                    <div className="w-1.5 h-1.5 rounded-full border border-purple-500/40" />
                    {audioUrl ? 'VOICE_READY' : 'SYNC_AWAITING'}
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-4 !h-4 !bg-purple-500 !border-4 !border-[#050505] !shadow-[0_0_15px_rgba(168,85,247,0.5)] hover:!scale-125 transition-all"
            />
        </motion.div>
    );
});
