import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, X, Loader2, Clapperboard, ChevronRight, Clock, Package } from 'lucide-react';
import { useAppStore } from '../store';
import { generateCharacterImage } from '../../geminiService';

const TEMPLATES = [
    { id: 'gym_ugc', label: 'GYM UGC AD', icon: '🏋️', prompt: 'gym influencer workout ad' },
    { id: 'skincare', label: 'SKINCARE', icon: '🧴', prompt: 'skincare routine review' },
    { id: 'food', label: 'FOOD REVIEW', icon: '🍕', prompt: 'food product tasting review' },
    { id: 'tech', label: 'TECH UNBOX', icon: '📱', prompt: 'tech product unboxing' },
    { id: 'fashion', label: 'FASHION', icon: '👗', prompt: 'fashion lookbook showcase' },
    { id: 'custom', label: 'CUSTOM', icon: '✨', prompt: '' },
];

export default memo(({ id, data }) => {
    const store = useAppStore();
    const updateNodeData = useAppStore(s => s.updateNodeData);
    const [isGenerating, setIsGenerating] = useState(false);
    const [userPrompt, setUserPrompt] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [sceneDuration, setSceneDuration] = useState(30);

    const handleGenerateStoryboard = async () => {
        const finalPrompt = selectedTemplate?.id === 'custom'
            ? userPrompt
            : `${selectedTemplate?.prompt || ''} ${userPrompt}`.trim();

        if (!finalPrompt || isGenerating) return;

        setIsGenerating(true);
        try {
            const characterName = store.activeCharacter?.name || 'the influencer';
            const wardrobe = store.currentWardrobe || '';
            const product = store.currentProduct?.description || '';

            const response = await fetch('http://localhost:3001/api/ugc/auto-storyboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: finalPrompt,
                    characterName,
                    wardrobe,
                    product,
                    duration: sceneDuration
                })
            });
            const result = await response.json();

            if (result.scenes && result.scenes.length > 0) {
                updateNodeData(id, { scenes: result.scenes, storyboardPrompt: finalPrompt });

                // Auto-spawn scene nodes on the canvas
                const baseX = store.nodes.find(n => n.id === id)?.position?.x || 400;
                const baseY = (store.nodes.find(n => n.id === id)?.position?.y || 300) + 200;

                // Auto-generate images for each scene
                result.scenes.forEach(async (scene, i) => {
                    const sceneNodeId = store.addNode(
                        '',
                        `SCENE_${i + 1}: ${scene.shotType}`,
                        true,
                        { x: baseX + (i * 280), y: baseY }
                    );

                    store.updateNodeData(sceneNodeId, {
                        sceneIndex: i,
                        timeRange: scene.timeRange,
                        shotType: scene.shotType,
                        action: scene.action,
                        hasProduct: scene.hasProduct,
                        prompt: scene.prompt,
                        label: `SCENE_${i + 1}`
                    });

                    // Connect storyboard to each scene
                    store.setState(s => ({
                        ...s,
                        edges: [...s.edges, {
                            id: `edge-story-${id}-${sceneNodeId}`,
                            source: id,
                            target: sceneNodeId,
                            animated: true,
                            style: { stroke: '#8b5cf6', opacity: 0.3 }
                        }]
                    }));

                    // Trigger actual image generation for this scene
                    try {
                        const sceneImageUrl = await generateCharacterImage(scene.prompt, 'Cinematic');
                        if (sceneImageUrl) {
                            store.updateNodeData(sceneNodeId, {
                                image: sceneImageUrl,
                                isOptimistic: false
                            });
                        }
                    } catch (err) {
                        console.error(`Failed to generate image for scene ${i + 1}:`, err);
                        store.updateNodeData(sceneNodeId, {
                            isOptimistic: false,
                            error: 'Generation failed'
                        });
                    }
                });
            }
        } catch (err) {
            console.error('Storyboard generation error:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="group relative px-5 py-4 bg-[#0a0a0a]/90 backdrop-blur-2xl border-2 border-violet-500/20 rounded-2xl min-w-[300px] max-w-[320px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-violet-500/50 transition-all"
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!w-4 !h-4 !bg-violet-500 !border-4 !border-[#050505] !shadow-[0_0_15px_rgba(139,92,246,0.5)] hover:!scale-125 transition-all"
            />

            <button
                onClick={() => data.onDelete(id)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white scale-0 group-hover:scale-100 transition-transform shadow-lg z-50"
            >
                <X size={10} />
            </button>

            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-violet-500/20 rounded-lg">
                        <Clapperboard size={14} className="text-violet-400" />
                    </div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">AUTO_STORYBOARD</span>
                </div>
                <div className="flex items-center gap-1 text-[8px] text-white/20 font-mono">
                    <Clock size={9} /> {sceneDuration}s
                </div>
            </div>

            {/* Duration Selector */}
            <div className="flex gap-1.5 mb-3">
                {[15, 30, 45, 60].map(dur => (
                    <button
                        key={dur}
                        onClick={() => setSceneDuration(dur)}
                        className={`flex-1 py-1 rounded-lg text-[8px] font-black transition-all ${sceneDuration === dur
                            ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40'
                            : 'bg-white/5 text-white/30 border border-white/5 hover:bg-white/10'
                            }`}
                    >
                        {dur}s
                    </button>
                ))}
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-3 gap-1.5 mb-3">
                {TEMPLATES.map(tmpl => (
                    <button
                        key={tmpl.id}
                        onClick={() => setSelectedTemplate(tmpl)}
                        className={`py-2 rounded-lg text-[7px] font-black uppercase transition-all ${selectedTemplate?.id === tmpl.id
                            ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40'
                            : 'bg-white/5 text-white/30 border border-white/5 hover:bg-white/10'
                            }`}
                    >
                        <span className="text-sm block">{tmpl.icon}</span>
                        {tmpl.label}
                    </button>
                ))}
            </div>

            {/* Prompt Input */}
            <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="30s UGC video of Alex in cyberpunk gym reviewing pre-workout..."
                className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] text-white/80 font-mono resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
                rows={2}
            />

            {/* Generate Button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGenerateStoryboard}
                disabled={isGenerating || (!userPrompt && !selectedTemplate)}
                className="w-full mt-3 py-3 bg-violet-600/20 hover:bg-violet-600/40 disabled:opacity-30 rounded-xl border border-violet-500/30 text-[10px] font-black text-white uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
                {isGenerating ? (
                    <><Loader2 size={12} className="animate-spin" /> GENERATING_SCENES...</>
                ) : (
                    <><Film size={12} /> GENERATE_STORYBOARD</>
                )}
            </motion.button>

            {/* Scene Preview */}
            <AnimatePresence>
                {data.scenes && data.scenes.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 space-y-1"
                    >
                        <span className="text-[8px] text-white/20 font-mono uppercase">TIMELINE</span>
                        {data.scenes.map((scene, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="flex items-center gap-2 px-2 py-1.5 bg-violet-500/5 rounded-lg border border-violet-500/10"
                            >
                                <span className="text-[8px] text-violet-400 font-black w-6">{scene.timeRange?.split('-')[0] || `${i * 5}s`}</span>
                                <ChevronRight size={8} className="text-white/10" />
                                <span className="text-[8px] text-white/50 font-mono flex-1 truncate">{scene.shotType}: {scene.action}</span>
                                {scene.hasProduct && <Package size={8} className="text-amber-400" />}
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
                <span className="text-[6px] font-bold text-white/10 uppercase tracking-[0.4em]">STORY_GEN_V1</span>
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-violet-400">
                    <div className={`w-1.5 h-1.5 rounded-full ${data.scenes?.length ? 'bg-violet-500' : 'border border-violet-500/40'}`} />
                    {data.scenes?.length ? `${data.scenes.length}_SCENES` : 'READY'}
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-4 !h-4 !bg-violet-500 !border-4 !border-[#050505] !shadow-[0_0_15px_rgba(139,92,246,0.5)] hover:!scale-125 transition-all"
            />
        </motion.div>
    );
});

