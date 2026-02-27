import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Camera, Sun, Music, Zap, Wind, MessageSquare, Film, Layers } from 'lucide-react';
import { useAppStore } from '../../store';

const NODE_CONFIG = {
    camera: { icon: Camera, color: 'blue', label: 'CAMERA', fields: ['movement', 'duration', 'easing', 'intensity'] },
    lighting: { icon: Sun, color: 'orange', label: 'LIGHTING', fields: ['lighting'] },
    music: { icon: Music, color: 'pink', label: 'MUSIC', fields: ['style', 'prompt', 'duration'] },
    sfx: { icon: Zap, color: 'yellow', label: 'SFX', fields: ['effect'] },
    ambient: { icon: Wind, color: 'emerald', label: 'AMBIENT', fields: ['atmosphere'] },
    dialogue: { icon: MessageSquare, color: 'purple', label: 'VOICE', fields: ['voiceId', 'script'] },
    video: { icon: Film, color: 'cyan', label: 'VIDEO', fields: ['label'] },
    ugcPipeline: { icon: Layers, color: 'orange', label: 'UGC', fields: ['hookScript', 'niche', 'hookStyle'] },
    wardrobe: { icon: Camera, color: 'rose', label: 'WARDROBE', fields: ['outfitDescription'] },
    identity: { icon: Camera, color: 'emerald', label: 'IDENTITY', fields: ['label'] },
    product: { icon: Layers, color: 'amber', label: 'PRODUCT_SCAN', fields: ['productDescription', 'productLabels'] },
    autoStoryboard: { icon: Film, color: 'purple', label: 'STORYBOARD', fields: ['storyboardPrompt'] },
    veoI2V: { icon: Zap, color: 'cyan', label: 'VEO_I2V', fields: ['motionPrompt'] },
};

const colorMap = {
    blue: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    orange: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    pink: 'text-pink-400 border-pink-500/30 bg-pink-500/10',
    yellow: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    emerald: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    purple: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    cyan: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    rose: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    amber: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
};

export default function PromptBuilder() {
    const nodes = useAppStore(s => s.nodes);
    const edges = useAppStore(s => s.edges);
    const activeNodeId = useAppStore(s => s.activeNodeId);
    const activeCharacter = useAppStore(s => s.activeCharacter);
    const currentWardrobe = useAppStore(s => s.currentWardrobe);
    const currentProduct = useAppStore(s => s.currentProduct);
    const [isVisible, setIsVisible] = React.useState(true);

    // Find the active node itself
    const activeNode = useMemo(() => nodes.find(n => n.id === activeNodeId), [nodes, activeNodeId]);

    // Find all nodes connected to the active node (via edges)
    const connectedNodes = useMemo(() => {
        if (!activeNodeId) return [];
        const connectedIds = new Set();
        connectedIds.add(activeNodeId);

        edges.forEach(edge => {
            if (edge.source === activeNodeId) connectedIds.add(edge.target);
            if (edge.target === activeNodeId) connectedIds.add(edge.source);
        });

        return nodes.filter(n => connectedIds.has(n.id) && NODE_CONFIG[n.type]);
    }, [nodes, edges, activeNodeId]);

    // Build the assembled prompt from connected nodes
    const assembledPrompt = useMemo(() => {
        const sections = [];

        // 1. Identity (Active Character or Connected Identity Node)
        if (activeCharacter) {
            sections.push({
                type: 'identity',
                color: 'emerald',
                label: 'IDENTITY',
                content: `SUBJECT: ${activeCharacter.name} | STYLE: ${activeCharacter.visualStyle || 'Cinematic'}`
            });
        }

        // 2. Global State Injectors
        if (currentWardrobe) {
            sections.push({
                type: 'wardrobe-global',
                color: 'rose',
                label: 'WARDROBE (LOCKED)',
                content: `OUTFIT: ${currentWardrobe}`
            });
        }

        if (currentProduct?.description) {
            sections.push({
                type: 'product-global',
                color: 'amber',
                label: 'PRODUCT (LOCKED)',
                content: `PRODUCT: ${currentProduct.description}${currentProduct.labels?.length ? ' | TAGS: ' + currentProduct.labels.slice(0, 3).join(', ') : ''}`
            });
        }

        // 3. Connected Nodes
        connectedNodes.forEach(node => {
            // Deduplicate
            if (node.id === activeNodeId && node.type === 'autoStoryboard') return; // Handled as narrative override
            if (node.type === 'product' && currentProduct?.description) return;
            if (node.type === 'influencer' && activeCharacter) return;
            if (node.type === 'identity' && activeCharacter) return;

            const config = NODE_CONFIG[node.type];
            if (!config) return;

            const parts = [];
            config.fields.forEach(field => {
                const val = node.data?.[field];
                if (val && val !== '') {
                    const fieldLabel = field.replace('product', '').replace('Description', '').replace('Prompt', '').toUpperCase() || 'DATA';
                    if (Array.isArray(val)) {
                        if (val.length > 0) parts.push(`${fieldLabel}: ${val.slice(0, 3).join(', ')}`);
                    } else {
                        parts.push(`${fieldLabel}: ${val}`);
                    }
                }
            });

            if (parts.length > 0) {
                sections.push({
                    type: node.type,
                    id: node.id,
                    color: config.color,
                    label: config.label,
                    content: parts.join(' | ')
                });
            }
        });

        return sections;
    }, [connectedNodes, activeCharacter, currentWardrobe, currentProduct, activeNodeId]);

    if (!activeCharacter || connectedNodes.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-6 left-6 z-40 max-w-[420px]"
        >
            {/* Toggle */}
            <button
                onClick={() => setIsVisible(!isVisible)}
                className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-white/10 rounded-full text-[8px] font-black text-white/40 uppercase tracking-widest hover:text-white/80 hover:border-white/30 transition-all backdrop-blur-xl"
            >
                {isVisible ? <EyeOff size={10} /> : <Eye size={10} />}
                PROMPT_BUILDER
            </button>

            <AnimatePresence>
                {isVisible && assembledPrompt && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#bef264] animate-pulse" />
                                <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">ASSEMBLED_PROMPT</span>
                            </div>
                            <span className="text-[8px] text-white/20 font-mono">{connectedNodes.length} nodes</span>
                        </div>

                        {/* Prompt Sections */}
                        <div className="p-3 space-y-1.5 max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                            {assembledPrompt.map((section, i) => {
                                const colors = colorMap[section.color] || colorMap.cyan;
                                return (
                                    <motion.div
                                        key={`${section.type}-${i}`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className={`px-3 py-2 rounded-lg border ${colors}`}
                                    >
                                        <span className="text-[7px] font-black uppercase tracking-widest opacity-60">{section.label}</span>
                                        <p className="text-[9px] font-mono mt-0.5 opacity-80 leading-relaxed break-all">{section.content}</p>
                                    </motion.div>
                                );
                            })}
                        </div>

                        <div className="px-4 py-3 border-t border-white/5 bg-black/20">
                            <span className="text-[7px] font-black text-white/20 uppercase tracking-widest block mb-1">BRAIN_TRANSLATION_PREVIEW</span>
                            <p className="text-[10px] text-[#bef264]/90 font-mono leading-relaxed italic">
                                "{(() => {
                                    // 1. Check for manual override from active node (Storyboard)
                                    const override = activeNode?.data?.userPrompt || activeNode?.data?.storyboardPrompt;
                                    if (override) return override;

                                    // 2. Assemble from connected data
                                    const char = activeCharacter?.name || 'The subject';
                                    const prodNode = connectedNodes.find(n => n.type === 'product');
                                    const productDesc = currentProduct?.description || prodNode?.data?.productDescription || '';
                                    const cleanProd = productDesc.split(',')[0].replace(/showcased on a teal mannequin/i, '').trim();
                                    const style = activeCharacter?.visualStyle || 'Cinematic';

                                    // Dynamic interaction logic
                                    const labels = (currentProduct?.labels || prodNode?.data?.productLabels || []).map(l => l.toLowerCase());
                                    const isWearable = labels.some(l =>
                                        ['clothing', 'shirt', 'dress', 'hat', 'shoes', 'jewelry', 'garment', 'apparel', 'outfit'].includes(l)
                                    );

                                    const verb = isWearable ? 'gracefully wearing' : 'presenting';
                                    const subjectAction = cleanProd ? `${verb} ${cleanProd}` : 'in a professional showcase';

                                    return `${style} shot of ${char} ${subjectAction}.`;
                                })()}"
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
