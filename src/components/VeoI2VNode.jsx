import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, X, Loader2, Play, ImageIcon, Zap, MessageSquare, AlignLeft, Maximize2, Film } from 'lucide-react';
import { useAppStore } from '../store';
import { useWebSocket } from '../hooks/useWebSocket';

const ASPECT_RATIOS = [
    { id: '16:9', label: '16:9', desc: 'Landscape' },
    { id: '9:16', label: '9:16', desc: 'Portrait' },
    { id: '1:1', label: '1:1', desc: 'Square' },
];

const CAMERA_MOVES = [
    { id: 'dolly_in', label: '🎬 DOLLY IN', prompt: 'slow dolly in, camera slowly pushing forward, cinematic depth' },
    { id: 'dolly_out', label: '🎬 DOLLY OUT', prompt: 'slow dolly out, camera pulling back dramatically, revealing scene' },
    { id: 'pan_left', label: '↔ PAN LEFT', prompt: 'smooth camera pan left, steady horizontal movement, cinematic' },
    { id: 'pan_right', label: '↔ PAN RIGHT', prompt: 'smooth camera pan right, steady horizontal movement, cinematic' },
    { id: 'tilt_up', label: '↕ TILT UP', prompt: 'slow tilt up, camera tilting upward revealing scene above' },
    { id: 'orbit', label: '🔄 ORBIT', prompt: 'slow orbital camera movement, circling 90 degrees around subject' },
    { id: 'handheld', label: '📷 HANDHELD', prompt: 'subtle handheld camera shake, documentary style, naturalistic' },
    { id: 'static_lock', label: '🔒 LOCKED', prompt: 'static locked-off camera, perfectly still tripod shot, stable' },
    { id: 'aerial_push', label: '🚁 AERIAL', prompt: 'aerial drone shot slowly pushing forward, high angle cinematic' },
];

const DURATION_OPTIONS = [4, 6, 8];

export default memo(({ id, data }) => {
    const { updateNodeData, setFocusMode } = useAppStore();
    const edges = useAppStore(s => s.edges);
    const nodes = useAppStore(s => s.nodes);

    // WebSocket / Progress
    const { tasks } = useWebSocket();
    const currentTask = tasks[`veo-${id}`];

    // State
    const [isGenerating, setIsGenerating] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [selectedCamera, setSelectedCamera] = useState(CAMERA_MOVES[0]);
    const [customPrompt, setCustomPrompt] = useState('');
    const [duration, setDuration] = useState(8);
    const [aspectRatio, setAspectRatio] = useState('16:9');

    // ── Gather all connected source nodes ───────────────────────────────
    const incomingEdges = edges.filter(e => e.target === id);
    const sourceNodes = incomingEdges.map(e => nodes.find(n => n.id === e.source)).filter(Boolean);

    // Image input — from any connected node that has an `image` field
    const inputImage = sourceNodes.map(n => n.data?.image).find(Boolean) || data.inputImage;

    // Dialogue / script — from DialogueNode or any node with a `script` field
    const inputDialogue = sourceNodes.map(n => n.data?.script).find(Boolean) || data.dialogue || '';

    // Text scene description — from AutoStoryboardNode or any node with a `description` field
    const inputText = sourceNodes.map(n => n.data?.description || n.data?.sceneDescription).find(Boolean) || data.sceneDescription || '';

    // ── Build the final Veo 3.1 prompt ──────────────────────────────────
    const buildPrompt = () => {
        const parts = [];

        // 1. Scene description (text input)
        if (inputText) parts.push(inputText);

        // 2. Camera movement
        const camPrompt = customPrompt || selectedCamera.prompt;
        parts.push(camPrompt);

        // 3. Dialogue cues (Veo 3 natively supports audio/dialogue in prompt)
        if (inputDialogue) {
            parts.push(`The character says: "${inputDialogue}"`);
        }

        // 4. Always cinematic quality suffix
        parts.push('Cinematic 8K quality. Photorealistic. Professional film production.');

        return parts.join('. ');
    };

    // ── Generate ────────────────────────────────────────────────────────
    const handleGenerate = async () => {
        if (isGenerating) return;
        const prompt = buildPrompt();
        if (!prompt.trim()) return;

        setIsGenerating(true);
        setStatusMsg('Connecting...');

        try {
            const response = await fetch('http://localhost:3001/api/ugc/veo-i2v', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: inputImage || null,
                    motionPrompt: prompt,
                    duration,
                    aspectRatio,
                    nodeId: id
                })
            });

            const result = await response.json();

            if (result.videoUrl) {
                updateNodeData(id, { videoUrl: result.videoUrl, motionPrompt: prompt });

                // --- AUTO SPAWN OUTPUT NODE ---
                const { addVideoNode, nodes } = useAppStore.getState();
                const currentNode = nodes.find(n => n.id === id);
                const spawnPos = currentNode
                    ? { x: currentNode.position.x + 380, y: currentNode.position.y }
                    : { x: 600, y: 300 };

                addVideoNode(result.videoUrl, `VEO_OUT_${aspectRatio}`, aspectRatio, spawnPos);

                setStatusMsg('');
                try {
                    const { saveGeneratedAsset } = await import('../supabaseService');
                    saveGeneratedAsset(result.videoUrl, 'video', `veo_${id}_${Date.now()}.mp4`);
                } catch (_) { }
            } else {
                setStatusMsg('');
                alert(`Video Failed: ${result.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Veo I2V Error:', err);
            setStatusMsg('');
            alert('Connection error — make sure the local server is running on port 3001.');
        } finally {
            setIsGenerating(false);
        }
    };

    const hasAnyInput = !!(inputImage || inputText || inputDialogue || customPrompt);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="group relative bg-[#060a10] backdrop-blur-2xl border border-cyan-500/20 rounded-2xl w-[320px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] hover:border-cyan-500/40 transition-all overflow-hidden"
        >
            {/* Glow accent */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />

            {/* THREE input handles — Left side stacked */}
            {/* Image input (top-left) */}
            <Handle
                type="target"
                id="image"
                position={Position.Left}
                style={{ top: '22%' }}
                className="!w-3.5 !h-3.5 !bg-violet-500 !border-2 !border-[#060a10] !shadow-[0_0_10px_rgba(139,92,246,0.6)]"
                title="Connect image"
            />
            {/* Text / scene description (middle-left) */}
            <Handle
                type="target"
                id="text"
                position={Position.Left}
                style={{ top: '50%' }}
                className="!w-3.5 !h-3.5 !bg-emerald-400 !border-2 !border-[#060a10] !shadow-[0_0_10px_rgba(52,211,153,0.6)]"
                title="Connect scene text"
            />
            {/* Dialogue input (bottom-left) */}
            <Handle
                type="target"
                id="dialogue"
                position={Position.Left}
                style={{ top: '78%' }}
                className="!w-3.5 !h-3.5 !bg-amber-400 !border-2 !border-[#060a10] !shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                title="Connect dialogue"
            />

            {/* Video output — right side */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-4 !h-4 !bg-cyan-500 !border-3 !border-[#060a10] !shadow-[0_0_15px_rgba(6,182,212,0.7)]"
            />

            {/* Delete button */}
            <button
                onClick={() => data.onDelete?.(id)}
                className="absolute top-2 right-2 p-1 bg-red-500/0 hover:bg-red-500/20 rounded-lg transition-colors z-50 opacity-0 group-hover:opacity-100"
            >
                <X size={11} className="text-red-400" />
            </button>

            {/* ── HEADER ── */}
            <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-cyan-500/15 rounded-lg border border-cyan-500/20">
                        <Film size={13} className="text-cyan-400" />
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em]">VEO 3.1 ENGINE</div>
                        <div className="text-[8px] font-mono text-cyan-400/50">IMAGE · TEXT · DIALOGUE → VIDEO</div>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-3">

                {/* ── INPUT STATUS PILLS ── */}
                <div className="flex gap-1.5">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase border transition-all ${inputImage ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-white/3 border-white/5 text-white/20'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${inputImage ? 'bg-violet-400' : 'border border-white/15'}`} />
                        IMG
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase border transition-all ${inputText ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-white/3 border-white/5 text-white/20'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${inputText ? 'bg-emerald-400' : 'border border-white/15'}`} />
                        TEXT
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase border transition-all ${inputDialogue ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-white/3 border-white/5 text-white/20'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${inputDialogue ? 'bg-amber-400' : 'border border-white/15'}`} />
                        DIALOGUE
                    </div>
                </div>

                {/* ── IMAGE PREVIEW ── */}
                <div className={`w-full h-20 rounded-xl overflow-hidden border border-dashed ${inputImage ? 'border-violet-500/30' : 'border-white/8'} bg-black/20 flex items-center justify-center`}>
                    {inputImage ? (
                        <img src={inputImage} alt="Input frame" className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-center">
                            <ImageIcon size={16} className="text-white/12 mx-auto mb-1" />
                            <span className="text-[7px] text-white/15 font-mono">CONNECT SCENE IMAGE</span>
                        </div>
                    )}
                </div>

                {/* ── Dialogue preview ── */}
                {inputDialogue && (
                    <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/15 rounded-lg px-2.5 py-2">
                        <MessageSquare size={10} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <span className="text-[8px] text-amber-300/70 font-mono italic line-clamp-2">"{inputDialogue}"</span>
                    </div>
                )}


                {/* ── ASPECT RATIO ── */}
                <div>
                    <div className="text-[7px] font-black text-white/20 uppercase tracking-widest mb-1.5">Aspect Ratio</div>
                    <div className="flex gap-1.5">
                        {ASPECT_RATIOS.map(ar => (
                            <button
                                key={ar.id}
                                onClick={() => setAspectRatio(ar.id)}
                                className={`flex-1 py-1.5 rounded-lg text-[8px] font-black transition-all ${aspectRatio === ar.id
                                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                                    : 'bg-white/4 text-white/25 border border-white/5 hover:bg-white/8'}`}
                            >
                                {ar.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── DURATION ── */}
                <div>
                    <div className="text-[7px] font-black text-white/20 uppercase tracking-widest mb-1.5">Duration</div>
                    <div className="flex gap-1.5">
                        {DURATION_OPTIONS.map(d => (
                            <button
                                key={d}
                                onClick={() => setDuration(d)}
                                className={`flex-1 py-1.5 rounded-lg text-[8px] font-black transition-all ${duration === d
                                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                                    : 'bg-white/4 text-white/25 border border-white/5 hover:bg-white/8'}`}
                            >
                                {d}s
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── CAMERA MOVEMENT ── */}
                <div>
                    <div className="text-[7px] font-black text-white/20 uppercase tracking-widest mb-1.5">Camera Movement</div>
                    <div className="grid grid-cols-3 gap-1">
                        {CAMERA_MOVES.map(cam => (
                            <button
                                key={cam.id}
                                onClick={() => { setSelectedCamera(cam); setCustomPrompt(''); }}
                                className={`py-1.5 px-1 rounded-lg text-[6.5px] font-black uppercase text-center leading-tight transition-all ${selectedCamera.id === cam.id && !customPrompt
                                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                                    : 'bg-white/4 text-white/25 border border-white/5 hover:bg-white/8'}`}
                            >
                                {cam.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── CUSTOM PROMPT OVERRIDE ── */}
                <div>
                    <div className="text-[7px] font-black text-white/20 uppercase tracking-widest mb-1.5">Custom Direction (optional)</div>
                    <textarea
                        value={customPrompt}
                        onChange={e => setCustomPrompt(e.target.value)}
                        placeholder="e.g. Subject walks slowly toward camera, wind blowing hair, golden hour..."
                        rows={2}
                        className="w-full bg-black/30 border border-white/5 rounded-lg p-2 text-[8px] text-white/50 font-mono focus:outline-none focus:border-cyan-500/30 transition-colors resize-none"
                    />
                </div>

                {/* ── GENERATE BUTTON ── */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleGenerate}
                    disabled={!hasAnyInput || isGenerating}
                    className={`w-full py-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${hasAnyInput && !isGenerating
                        ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/50 hover:to-blue-600/50 border-cyan-500/40 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                        : 'bg-white/3 border-white/5 text-white/20 cursor-not-allowed'}`}
                >
                    {isGenerating ? (
                        <>
                            <Loader2 size={12} className="animate-spin" />
                            {currentTask?.message || statusMsg || 'GENERATING...'}
                            {currentTask?.step && <span className="text-[8px] opacity-50 ml-1">[{currentTask.step}/3]</span>}
                        </>
                    ) : (
                        <><Zap size={12} /> RENDER VIDEO</>
                    )}
                </motion.button>


                {/* ── VIDEO OUTPUT PREVIEW ── */}
                <AnimatePresence>
                    {data.videoUrl && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="relative group/vid rounded-xl overflow-hidden border border-cyan-500/20"
                        >
                            <video
                                src={data.videoUrl}
                                loop muted autoPlay playsInline
                                className={`w-full ${aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-video'}`}
                                style={{ maxHeight: '280px', objectFit: 'contain', background: '#000' }}
                            />
                            {/* Overlay controls */}
                            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover/vid:opacity-100 transition-opacity flex items-center justify-between">
                                <span className="text-[7px] font-black text-cyan-400 uppercase tracking-widest">✓ VEO OUTPUT</span>
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => setFocusMode(id)}
                                        className="p-1.5 bg-cyan-500 text-black rounded-lg shadow-xl hover:scale-110 active:scale-95 transition-all"
                                        title="Full screen"
                                    >
                                        <Maximize2 size={9} />
                                    </button>
                                    <a
                                        href={data.videoUrl}
                                        download={`veo_${id}.mp4`}
                                        className="p-1.5 bg-white/10 text-white rounded-lg shadow hover:scale-110 active:scale-95 transition-all text-[8px] font-black"
                                    >
                                        ↓
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── FOOTER STATUS ── */}
            <div className="px-4 pb-3 flex items-center justify-between border-t border-white/5 pt-2">
                <span className="text-[6px] font-bold text-white/10 uppercase tracking-[0.4em]">VEO 3.1 · {aspectRatio} · {duration}s</span>
                <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full transition-colors ${data.videoUrl ? 'bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : isGenerating ? 'bg-cyan-500 animate-pulse' : hasAnyInput ? 'bg-cyan-500/40' : 'border border-white/10'}`} />
                    <span className="text-[7px] font-bold text-cyan-400/60 uppercase">
                        {data.videoUrl ? 'RENDERED' : isGenerating ? 'PROCESSING' : hasAnyInput ? 'READY' : 'AWAITING INPUT'}
                    </span>
                </div>
            </div>
        </motion.div>
    );
});
