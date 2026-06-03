import React, { useState, useRef, memo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Zap, ChevronDown, Sparkles, UserCheck, Clapperboard, Image as ImageIcon } from 'lucide-react';
import { useAppStore } from '../../store';
import { useShallow } from 'zustand/react/shallow';

const DockItem = memo(({ tool, mouseX }) => {
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
});
DockItem.displayName = 'DockItem';

export const SonicDock = memo(() => {
    const {
        addInfluencerNode,
        addSeedanceNode,
        addSeedance15ProNode,
        addNanoBananaNode
    } = useAppStore(useShallow(s => ({
        addInfluencerNode: s.addInfluencerNode,
        addSeedanceNode: s.addSeedanceNode,
        addSeedance15ProNode: s.addSeedance15ProNode,
        addNanoBananaNode: s.addNanoBananaNode
    })));

    const [isRetracted, setIsRetracted] = useState(true);
    const [narrative, setNarrative] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const mouseX = useMotionValue(Infinity);

    const tools = [
        { id: 'influencer', icon: UserCheck, label: 'CONSISTENCY', desc: 'Influencer', color: 'text-[#bef264]', bgColor: 'bg-[#bef264]/10', action: () => addInfluencerNode() },
        { id: 'seedance', icon: Sparkles, label: 'SEEDANCE 2.0', desc: 'Omni-Ref', color: 'text-[#D4FF00]', bgColor: 'bg-[#D4FF00]/10', action: () => addSeedanceNode() },
        { id: 'seedance15pro', icon: Clapperboard, label: 'SEEDANCE 1.5 PRO', desc: 'First/Last Frame', color: 'text-[#00F0FF]', bgColor: 'bg-[#00F0FF]/10', action: () => addSeedance15ProNode() },
        { id: 'nano_banana', icon: ImageIcon, label: 'NANO BANANA 2', desc: 'Reasoning Image', color: 'text-[#F59E0B]', bgColor: 'bg-[#F59E0B]/10', action: () => addNanoBananaNode() },
    ];

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4">
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="p-4 md:p-5 rounded-[2rem] bg-black/40 backdrop-blur-3xl border border-white/10 shadow-2xl flex flex-col gap-5 w-[calc(100vw-32px)] md:w-[500px]"
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
                className="max-w-[calc(100vw-32px)] bg-[#050505]/80 backdrop-blur-3xl border border-white/10 flex items-center shadow-2xl overflow-hidden transition-all duration-300"
            >
                <div className="flex gap-2 items-center h-full overflow-x-auto no-scrollbar px-2">
                    {tools.map((tool) => (
                        <DockItem key={tool.id} tool={tool} mouseX={mouseX} />
                    ))}
                </div>

                {!isRetracted && <div className="w-px h-8 bg-white/10 mx-2" />}

                <div className="flex items-center gap-2">
                    {!isRetracted && (
                        <button onClick={() => setIsRetracted(true)} className="p-2 text-white/20 hover:text-white transition-colors">
                            <ChevronDown size={18} />
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
});

SonicDock.displayName = 'SonicDock';
