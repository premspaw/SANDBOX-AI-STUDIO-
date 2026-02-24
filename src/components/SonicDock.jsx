import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Mic2, Music, Volume2, Zap, ChevronUp, ChevronDown, Sparkles, UserCheck, Loader2, Wand2, Users, Cloud, Camera, Clapperboard, MapPin } from 'lucide-react';
import { useAppStore } from '../store';

function DockItem({ tool, mouseX }) {
    const ref = useRef(null);

    const distance = useTransform(mouseX, (val) => {
        const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
        return val - bounds.x - bounds.width / 2;
    });

    const widthSync = useTransform(distance, [-150, 0, 150], [60, 120, 60]);
    const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });

    return (
        <motion.button
            ref={ref}
            style={{ width }}
            whileTap={{ scale: 0.95 }}
            onClick={tool.action}
            className={`h-14 flex items-center justify-center gap-3 rounded-2xl border border-white/5 transition-all group/tool relative overflow-hidden`}
        >
            <div className={`absolute inset-0 ${tool.bgColor} opacity-30 group-hover/tool:opacity-100 transition-opacity`} />
            <tool.icon size={18} className={`${tool.color} transition-transform group-hover/tool:rotate-12 z-10 shrink-0`} />
            <motion.div
                style={{ opacity: useTransform(width, [60, 100], [0, 1]) }}
                className="flex flex-col items-start z-10 text-left overflow-hidden whitespace-nowrap"
            >
                <span className={`text-[9px] font-black uppercase tracking-widest ${tool.color}`}>{tool.label}</span>
                <span className="text-[6px] text-white/40 font-bold uppercase tracking-widest">{tool.desc}</span>
            </motion.div>
        </motion.button>
    );
}

export const SonicDock = () => {
    const store = useAppStore();
    const [isRetracted, setIsRetracted] = useState(true);
    const [isRendering, setIsRendering] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const mouseX = useMotionValue(Infinity);

    const handleSyncGrid = async () => {
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
                const image = targetNode.data.image || targetNode.data.anchorImage;
                if (!image) continue;
                const videoNodeId = store.addVideoNode('', 'Synthesizing_LipSync...', {
                    x: targetNode.position.x + 400,
                    y: targetNode.position.y
                });
                import('../../geminiService').then(async (m) => {
                    try {
                        const videoUrl = await m.generateLipSyncVideo(image, dialogueNode.data.script, store.universeBible);
                        if (videoUrl) store.updateNodeData(videoNodeId, { videoUrl, isOptimistic: false, label: 'Lip-Sync Render Output' });
                    } catch (err) {
                        console.error("LipSync synthesis error:", err);
                    }
                });
            }
        }
        setTimeout(() => setIsRendering(false), 2000);
    };

    const [narrative, setNarrative] = useState('');
    const [isAutoDirecting, setIsAutoDirecting] = useState(false);

    const tools = [
        { id: 'voice', icon: Mic2, label: 'VOICE', desc: 'Dialogue', color: 'text-purple-400', bgColor: 'bg-purple-400/10', action: () => store.addDialogueNode() },
        { id: 'influencer', icon: UserCheck, label: 'CONSISTENCY', desc: 'Influencer', color: 'text-[#bef264]', bgColor: 'bg-[#bef264]/10', action: () => store.addInfluencerNode() },
        { id: 'music', icon: Music, label: 'MUSIC', desc: 'Ambient', color: 'text-cyan-400', bgColor: 'bg-cyan-400/10', action: () => store.addMusicNode() },
        { id: 'sfx', icon: Volume2, label: 'SFX', desc: 'Atmosphere', color: 'text-amber-400', bgColor: 'bg-amber-400/10', action: () => store.addSFXNode() },
        { id: 'outfit', icon: Sparkles, label: 'OUTFIT', desc: 'Wardrobe', color: 'text-violet-400', bgColor: 'bg-violet-400/10', action: () => store.addWardrobeNode() },
        { id: 'product', icon: Camera, label: 'PRODUCT', desc: 'Asset', color: 'text-emerald-400', bgColor: 'bg-emerald-400/10', action: () => store.addProductNode() },
        { id: 'location', icon: MapPin, label: 'LOCATION', desc: 'Environment', color: 'text-cyan-400', bgColor: 'bg-cyan-400/10', action: () => store.addLocationNode() },
        { id: 'story', icon: Clapperboard, label: 'STORY', desc: 'Storyboard', color: 'text-blue-400', bgColor: 'bg-blue-400/10', action: () => store.addAutoStoryboardNode() },
        { id: 'veo', icon: Zap, label: 'VEO I2V', desc: 'Video Gen', color: 'text-orange-400', bgColor: 'bg-orange-400/10', action: () => store.addVeoI2VNode() },
    ];

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4">
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="p-5 rounded-[2rem] bg-black/40 backdrop-blur-3xl border border-white/10 shadow-2xl flex flex-col gap-5 w-[500px]"
                    >
                        <textarea
                            value={narrative}
                            onChange={(e) => setNarrative(e.target.value)}
                            placeholder="Enter cinematic narrative..."
                            className="bg-transparent border-none outline-none text-xs text-white p-4 resize-none h-24"
                        />
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="self-end text-[10px] text-white/40 uppercase font-black"
                        >Close</button>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                onMouseMove={(e) => {
                    mouseX.set(e.pageX);
                    if (isRetracted) setIsRetracted(false);
                }}
                onMouseLeave={() => {
                    mouseX.set(Infinity);
                    setIsRetracted(true);
                }}
                animate={{
                    height: isRetracted ? '40px' : '72px',
                    padding: isRetracted ? '0px 12px' : '8px 16px',
                    borderRadius: isRetracted ? '20px' : '36px',
                    gap: isRetracted ? '8px' : '16px',
                    opacity: isRetracted ? 0.4 : 1
                }}
                className="bg-[#050505]/80 backdrop-blur-3xl border border-white/10 flex items-center shadow-2xl overflow-hidden transition-all duration-300"
            >
                <div className="flex gap-2 items-center h-full">
                    {tools.map((tool) => (
                        <DockItem key={tool.id} tool={tool} mouseX={mouseX} />
                    ))}
                </div>

                {!isRetracted && <div className="w-px h-8 bg-white/10 mx-2" />}

                <div className="flex items-center gap-2">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        onClick={handleSyncGrid}
                        className={`p-3 rounded-full ${isRendering ? 'bg-orange-500' : 'bg-[#bef264]'} text-black transition-all shadow-lg`}
                    >
                        {isRendering ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="currentColor" />}
                    </motion.button>
                    {!isRetracted && (
                        <>
                            <button onClick={() => setIsExpanded(true)} className="p-2.5 bg-white/5 rounded-full text-white/40 hover:text-[#bef264] border border-white/5">
                                <Sparkles size={16} />
                            </button>
                            <button onClick={() => setIsRetracted(true)} className="p-2 text-white/20 hover:text-white">
                                <ChevronDown size={18} />
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
