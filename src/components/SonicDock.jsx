import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic2, Music, Volume2, Zap, ChevronUp, ChevronDown, Sparkles, UserCheck, Loader2, Wand2, Users, Cloud } from 'lucide-react';
import { useAppStore } from '../store';

export const SonicDock = () => {
    const store = useAppStore();
    const [isRetracted, setIsRetracted] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleAddDialogue = () => {
        store.addDialogueNode();
    };

    const handleAddInfluencer = () => {
        store.addInfluencerNode();
    };

    const handleSyncGrid = async () => {
        // Find edges connecting dialogue to images (identity or influencer)
        const activeDialogueToIdentityEdges = store.edges.filter(edge =>
            edge.source.startsWith('dialogue-') && (edge.target.startsWith('node-') || edge.target.startsWith('influencer-'))
        );

        if (activeDialogueToIdentityEdges.length === 0) {
            alert("Neural Bridge Required: Connect a Dialogue Node to a Character Construct to render.");
            return;
        }

        setIsRendering(true);

        for (const edge of activeDialogueToIdentityEdges) {
            const dialogueNode = store.nodes.find(n => n.id === edge.source);
            const targetNode = store.nodes.find(n => n.id === edge.target);

            if (dialogueNode && targetNode) {
                const script = dialogueNode.data.script;
                // Get image from either identity node or influencer node
                const image = targetNode.data.image || targetNode.data.anchorImage;

                if (!image) continue;

                // Start background generation
                const videoNodeId = store.addVideoNode('', 'Synthesizing_LipSync...', {
                    x: targetNode.position.x + 400,
                    y: targetNode.position.y
                });

                import('../../geminiService').then(async (m) => {
                    try {
                        const videoUrl = await m.generateLipSyncVideo(image, script, store.universeBible);
                        if (videoUrl) {
                            store.updateNodeData(videoNodeId, { videoUrl, isOptimistic: false, label: 'Lip-Sync Render Output' });
                        } else {
                            store.updateNodeData(videoNodeId, { label: 'Render_Output_Empty' });
                        }
                    } catch (err) {
                        console.error("LipSync synthesis error:", err);
                        store.updateNodeData(videoNodeId, { label: 'Render_Failed_Neural_Timeout' });
                    }
                });
            }
        }

        setTimeout(() => setIsRendering(false), 2000);
    };

    const [narrative, setNarrative] = useState('');
    const [isAutoDirecting, setIsAutoDirecting] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = React.useRef(null);
    const audioChunksRef = React.useRef([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result.split(',')[1];
                    try {
                        const response = await fetch('http://localhost:3001/api/proxy/stt', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ audio: base64Audio })
                        });
                        const data = await response.json();
                        if (data.transcription) {
                            setNarrative(prev => prev + ' ' + data.transcription);
                        }
                    } catch (err) {
                        console.error("STT synthesis error:", err);
                    }
                };
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Microphone access denied:", err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const [isImporting, setIsImporting] = useState(false);

    const handleImportDoc = async () => {
        const docId = prompt("Enter Google Doc ID (from the URL):");
        if (!docId) return;

        setIsImporting(true);
        try {
            const response = await fetch('http://localhost:3001/api/workspace/import-doc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ docId })
            });
            const data = await response.json();
            if (data.content) {
                setNarrative(data.content);
            }
        } catch (err) {
            console.error("Workspace Import Error:", err);
        } finally {
            setIsImporting(false);
        }
    };

    const handleAutoDirect = async () => {
        if (!narrative.trim()) return;
        setIsAutoDirecting(true);
        try {
            const { generateDirectorSequence } = await import('../../geminiService');
            const sequenceData = await generateDirectorSequence(narrative, store.universeBible);
            if (sequenceData?.nodes) {
                store.spawnSequence(sequenceData.nodes);
                setNarrative('');
                setIsExpanded(false);
            }
        } catch (err) {
            console.error("Auto-Director Error:", err);
        } finally {
            setIsAutoDirecting(false);
        }
    };

    const tools = [
        {
            id: 'voice',
            icon: Mic2,
            label: 'VOICE',
            desc: 'Dialogue Node',
            color: 'text-purple-400',
            bgColor: 'bg-purple-400/10',
            action: handleAddDialogue
        },
        {
            id: 'influencer',
            icon: UserCheck,
            label: 'CONSISTENCY',
            desc: 'Influencer Node',
            color: 'text-[#bef264]',
            bgColor: 'bg-[#bef264]/10',
            action: handleAddInfluencer
        },
        {
            id: 'music',
            icon: Music,
            label: 'MUSIC',
            desc: 'Ambient Layer',
            color: 'text-cyan-400',
            bgColor: 'bg-cyan-400/10',
            action: () => store.addMusicNode()
        },
        {
            id: 'sfx',
            icon: Volume2,
            label: 'SFX',
            desc: 'Atmosphere',
            color: 'text-amber-400',
            bgColor: 'bg-amber-400/10',
            action: () => store.addSFXNode()
        },
    ];

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4">
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="p-6 rounded-[2.5rem] bg-black/40 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-6 w-[600px]"
                    >
                        {/* Auto-Director Row */}
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#bef264]/20 to-cyan-500/20 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative flex flex-col p-1 bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
                                <div className="flex items-center gap-3">
                                    <Wand2 className={`w-5 h-5 ml-4 ${isAutoDirecting ? 'text-[#bef264] animate-pulse' : 'text-white/40'}`} />
                                    <textarea
                                        value={narrative}
                                        onChange={(e) => setNarrative(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAutoDirect();
                                            }
                                        }}
                                        placeholder="Enter cinematic narrative or use Voice Direct..."
                                        className="flex-1 bg-transparent border-none outline-none text-xs font-medium text-white placeholder-white/20 py-4 resize-none h-20 scrollbar-hide"
                                    />
                                    <div className="flex flex-col gap-2 p-2">
                                        <button
                                            onClick={isRecording ? stopRecording : startRecording}
                                            className={`p-3 rounded-xl transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
                                            title={isRecording ? 'Stop Recording' : 'Voice Direct (STT)'}
                                        >
                                            <Mic2 size={16} />
                                        </button>
                                        <button
                                            onClick={handleImportDoc}
                                            className={`p-3 rounded-xl transition-all ${isImporting ? 'bg-cyan-500 text-white animate-pulse' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
                                            title="Import Script from Google Doc"
                                        >
                                            <Cloud size={16} />
                                        </button>
                                        <button
                                            onClick={handleAutoDirect}
                                            disabled={isAutoDirecting || !narrative.trim()}
                                            className="px-6 py-2 bg-[#bef264] hover:bg-[#d4ff00] disabled:bg-[#bef264]/20 disabled:text-black/30 text-black font-black text-[10px] rounded-xl transition-all uppercase tracking-widest italic"
                                        >
                                            {isAutoDirecting ? 'SYNT...' : 'DIRECT'}
                                        </button>
                                    </div>
                                </div>

                                {/* THOUGHT STREAM LOGS */}
                                <AnimatePresence>
                                    {isAutoDirecting && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="px-4 py-3 bg-[#bef264]/5 border-t border-white/5 flex flex-col gap-2"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-[#bef264] animate-ping" />
                                                <span className="text-[8px] font-black text-[#bef264] uppercase tracking-widest italic">NEURAL_THOUGHT_STREAM</span>
                                            </div>
                                            <p className="text-[9px] text-[#bef264]/60 font-mono">
                                                {'>'} Initializing Gemini 3.0 Flash...<br />
                                                {'>'} Probing narrative vectors...<br />
                                                {'>'} Mapping cinematic nodes...
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Quick Nodes Row */}
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => { store.addInfluencerNode(); setIsExpanded(false); }}
                                    className="group flex flex-col items-center gap-2"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-[#bef264]/20 group-hover:border-[#bef264]/40 transition-all">
                                        <Users className="w-5 h-5 text-white/40 group-hover:text-[#bef264]" />
                                    </div>
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Identity</span>
                                </button>
                                <button
                                    onClick={() => { store.addDialogueNode(); setIsExpanded(false); }}
                                    className="group flex flex-col items-center gap-2"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-purple-400/20 group-hover:border-purple-400/40 transition-all">
                                        <Mic2 className="w-5 h-5 text-white/40 group-hover:text-purple-400" />
                                    </div>
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Dialogue</span>
                                </button>
                                <button
                                    onClick={() => { store.addMusicNode(); setIsExpanded(false); }}
                                    className="group flex flex-col items-center gap-2"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-pink-400/20 group-hover:border-pink-400/40 transition-all">
                                        <Music className="w-5 h-5 text-white/40 group-hover:text-pink-400" />
                                    </div>
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Music</span>
                                </button>
                                <button
                                    onClick={() => { store.addSFXNode(); setIsExpanded(false); }}
                                    className="group flex flex-col items-center gap-2"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-yellow-400/20 group-hover:border-yellow-400/40 transition-all">
                                        <Volume2 className="w-5 h-5 text-white/40 group-hover:text-yellow-400" />
                                    </div>
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">SFX</span>
                                </button>
                                <button
                                    onClick={() => { store.addAmbientNode(); setIsExpanded(false); }}
                                    className="group flex flex-col items-center gap-2"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-emerald-400/20 group-hover:border-emerald-400/40 transition-all">
                                        <Zap className="w-5 h-5 text-white/40 group-hover:text-emerald-400" />
                                    </div>
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Ambient</span>
                                </button>
                            </div>
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="p-2 text-white/20 hover:text-white transition-colors"
                            >
                                <ChevronUp size={20} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {!isRetracted && !isExpanded && ( // Only show this if not retracted AND not expanded
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="px-4 py-1.5 bg-black/40 border border-white/10 rounded-full backdrop-blur-xl mb-2"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#bef264] animate-pulse" />
                                <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] italic">Sonic_Dock_Activated</span>
                            </div>
                            <div className="w-px h-3 bg-white/10" />
                            <div className="flex items-center gap-1.5">
                                <Sparkles size={10} className="text-purple-500" />
                                <span className="text-[7px] font-bold text-white/20 uppercase tracking-[0.3em]">Acoustic_Engine_V3</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                initial={false}
                animate={{
                    width: isRetracted ? '60px' : 'auto',
                    height: isRetracted ? '60px' : '88px',
                    borderRadius: isRetracted ? '30px' : '44px',
                    opacity: isRetracted ? 0.6 : 1,
                    scale: isRetracted ? 0.9 : 1
                }}
                className="bg-[#050505]/80 backdrop-blur-3xl border border-white/10 p-2 flex items-center gap-4 shadow-[0_30px_60px_rgba(0,0,0,0.5)] overflow-hidden"
            >
                {isRetracted ? (
                    <button
                        onClick={() => setIsRetracted(false)}
                        className="w-full h-full flex items-center justify-center text-[#bef264] hover:scale-110 transition-transform"
                    >
                        <ChevronUp size={24} />
                    </button>
                ) : (
                    <>
                        <div className="flex gap-2">
                            {tools.map((tool) => (
                                <motion.button
                                    key={tool.id}
                                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={tool.action}
                                    className={`flex items-center gap-4 px-6 py-4 rounded-[2rem] border border-white/5 transition-all group/tool relative overflow-hidden`}
                                >
                                    <div className={`absolute inset-0 ${tool.bgColor} opacity-50 group-hover/tool:opacity-100 transition-opacity`} />
                                    <tool.icon size={20} className={`${tool.color} transition-transform group-hover/tool:rotate-12 z-10`} />
                                    <div className="flex flex-col items-start z-10">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${tool.color}`}>{tool.label}</span>
                                        <span className="text-[7px] text-white/40 font-bold uppercase tracking-widest">{tool.desc}</span>
                                    </div>
                                </motion.button>
                            ))}
                        </div>

                        <div className="w-px h-12 bg-white/5 mx-2" />

                        <div className="pr-2 flex items-center gap-3">
                            <button
                                onClick={handleSyncGrid}
                                disabled={isRendering}
                                className="group relative p-5 bg-[#bef264] text-black rounded-full transition-all shadow-[0_0_30px_rgba(190,242,100,0.3)] hover:scale-110 active:scale-95 disabled:opacity-50"
                                title="RENDER_SCENE (Lip-Sync Protocol)"
                            >
                                {isRendering ? (
                                    <Loader2 size={24} className="animate-spin" />
                                ) : (
                                    <Zap size={24} fill="currentColor" className="group-hover:rotate-12 transition-transform" />
                                )}
                            </button>
                            <button
                                onClick={() => setIsExpanded(true)}
                                className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-[#bef264] rounded-full transition-all border border-white/5 group-hover:rotate-180 duration-500"
                                title="AUTO_DIRECTOR_ENGINE"
                            >
                                <Sparkles size={20} />
                            </button>
                            <button
                                onClick={() => setIsRetracted(true)}
                                className="p-2 text-white/20 hover:text-white transition-colors"
                            >
                                <ChevronDown size={20} />
                            </button>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
};
