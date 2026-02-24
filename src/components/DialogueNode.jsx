import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { MessageSquare, X, Mic2, Play, Loader2, Music2 } from 'lucide-react';
import { useAppStore } from '../store';
import { getApiUrl } from '../config/apiConfig';

export default memo(({ id, data }) => {
    const updateNodeData = useAppStore(s => s.updateNodeData);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);

    const voices = [
        // Gemini Pro TTS (Experimental High Fidelity)
        { id: 'Puck', label: '✨ GEMINI_PRO_PUCK' },
        { id: 'Charon', label: '✨ GEMINI_PRO_CHARON' },
        { id: 'Kore', label: '✨ GEMINI_PRO_KORE' },
        { id: 'Fenrir', label: '✨ GEMINI_PRO_FENRIR' },
        { id: 'Aoede', label: '✨ GEMINI_PRO_AOEDE' },

        // English (Global / India)
        { id: 'en-US-Journey-F', label: '🇺🇸 US_JOURNEY_FEMALE' },
        { id: 'en-US-Journey-D', label: '🇺🇸 US_JOURNEY_MALE' },
        { id: 'en-IN-Neural2-A', label: '🇮🇳 IN_ENGLISH_FEMALE' },
        { id: 'en-IN-Neural2-B', label: '🇮🇳 IN_ENGLISH_MALE' },

        // Tamil (தமிழ்)
        { id: 'ta-IN-Neural2-A', label: '🇮🇳 TAMIL_FEMALE_1' },
        { id: 'ta-IN-Neural2-B', label: '🇮🇳 TAMIL_MALE_1' },
        { id: 'ta-IN-Neural2-C', label: '🇮🇳 TAMIL_FEMALE_2' },
        { id: 'ta-IN-Neural2-D', label: '🇮🇳 TAMIL_MALE_2' },

        // Telugu (తెలుగు)
        { id: 'te-IN-Neural2-A', label: '🇮🇳 TELUGU_FEMALE_1' },
        { id: 'te-IN-Neural2-B', label: '🇮🇳 TELUGU_MALE_1' },
        { id: 'te-IN-Neural2-C', label: '🇮🇳 TELUGU_FEMALE_2' },
        { id: 'te-IN-Neural2-D', label: '🇮🇳 TELUGU_MALE_2' },

        // Kannada (ಕನ್ನಡ)
        { id: 'kn-IN-Neural2-A', label: '🇮🇳 KANNADA_FEMALE_1' },
        { id: 'kn-IN-Neural2-B', label: '🇮🇳 KANNADA_MALE_1' },
        { id: 'kn-IN-Neural2-C', label: '🇮🇳 KANNADA_FEMALE_2' },

        // Malayalam (മലയാളം)
        { id: 'ml-IN-Neural2-A', label: '🇮🇳 MALAYALAM_FEMALE_1' },
        { id: 'ml-IN-Neural2-B', label: '🇮🇳 MALAYALAM_MALE_1' },

        // Hindi (Default / Reference)
        { id: 'hi-IN-Neural2-A', label: '🇮🇳 HINDI_FEMALE' },
        { id: 'hi-IN-Neural2-B', label: '🇮🇳 HINDI_MALE' },
    ];

    const handleSynthesize = async () => {
        if (!data.script || isSynthesizing) return;
        setIsSynthesizing(true);
        try {
            const response = await fetch(getApiUrl('/api/proxy/tts'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: data.script,
                    voiceId: data.voiceId || 'en-US-Journey-F'
                })
            });
            const result = await response.json();
            if (result.audioContent) {
                // Gemini TTS returns raw PCM (L16, 24kHz, mono) — must wrap in WAV header for browser playback
                const pcmData = Uint8Array.from(atob(result.audioContent), c => c.charCodeAt(0));

                // Build WAV header for 24kHz, 16-bit, mono PCM
                const sampleRate = 24000;
                const numChannels = 1;
                const bitsPerSample = 16;
                const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
                const blockAlign = numChannels * (bitsPerSample / 8);
                const dataSize = pcmData.length;
                const buffer = new ArrayBuffer(44 + dataSize);
                const view = new DataView(buffer);
                const writeStr = (v, offset, str) => { for (let i = 0; i < str.length; i++) v.setUint8(offset + i, str.charCodeAt(i)); };
                writeStr(view, 0, 'RIFF');
                view.setUint32(4, 36 + dataSize, true);
                writeStr(view, 8, 'WAVE');
                writeStr(view, 12, 'fmt ');
                view.setUint32(16, 16, true);
                view.setUint16(20, 1, true); // PCM
                view.setUint16(22, numChannels, true);
                view.setUint32(24, sampleRate, true);
                view.setUint32(28, byteRate, true);
                view.setUint16(32, blockAlign, true);
                view.setUint16(34, bitsPerSample, true);
                writeStr(view, 36, 'data');
                view.setUint32(40, dataSize, true);
                new Uint8Array(buffer).set(pcmData, 44);

                const blob = new Blob([buffer], { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                updateNodeData(id, { audioUrl: url });
            } else {
                alert(`Voice Generation Failed: ${result.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error("Synthesis error:", err);
            alert("Connection error: Make sure the local server is running on port 3002.");
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
            whileHover={{ scale: 1.25 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            style={{ zIndex: 1 }}
            className="group relative px-5 py-4 bg-[#0a0a0a]/90 border-2 border-[#bef264]/20 rounded-2xl min-w-[250px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-[#bef264]/50 transition-all">
            <Handle
                type="target"
                position={Position.Left}
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
                position={Position.Right}
                className="!w-4 !h-4 !bg-purple-500 !border-4 !border-[#050505] !shadow-[0_0_15px_rgba(168,85,247,0.5)] hover:!scale-125 transition-all"
            />
        </motion.div>
    );
});
