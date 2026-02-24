import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, X, Loader2, Clapperboard, Clock, Camera, Maximize2 } from 'lucide-react';
import { useAppStore } from '../store';
import { generateCharacterImage, buildConsistencyRefs, expandPrompt } from '../../geminiService';
import { NICHE_STYLES } from '../storyboardConfig';
import { getApiUrl } from '../config/apiConfig';

// Duration → label and shot count map (mirrors server logic)
const DURATIONS = [
    { value: 10, label: '10s', shots: 4 },
    { value: 15, label: '15s', shots: 6 },
    { value: 30, label: '30s', shots: 8 },
    { value: 45, label: '45s', shots: 10 },
    { value: 60, label: '60s', shots: 12 },
];

// Compact film-strip shot card
function ShotCard({ scene, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative bg-black/50 border border-violet-500/15 rounded-lg overflow-hidden"
        >
            {/* Shot number strip */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-violet-500/10 border-b border-violet-500/10">
                <span className="text-[7px] font-black text-violet-400">#{scene.shotNumber || index + 1}</span>
                <span className="text-[6px] text-white/30 font-mono flex-1 truncate">{scene.timeRange}</span>
                {scene.hasProduct && <span className="text-[5px] text-amber-400 font-black">PROD</span>}
            </div>
            {/* Framing tag */}
            <div className="px-2 py-1.5">
                <span className="block text-[7px] font-black text-violet-300 uppercase mb-0.5 truncate">
                    {scene.shotType}
                </span>
                <span className="block text-[7px] text-white/40 font-mono leading-snug line-clamp-2">
                    {scene.action}
                </span>
            </div>
        </motion.div>
    );
}

export default memo(({ id, data }) => {
    const store = useAppStore();
    const updateNodeData = useAppStore(s => s.updateNodeData);
    const [isGenerating, setIsGenerating] = useState(false);
    const [sceneDuration, setSceneDuration] = useState(15);
    const [selectedNiche, setSelectedNiche] = useState('CUSTOM');
    const [aspectRatio, setAspectRatio] = useState('9:16');
    const [userPrompt, setUserPrompt] = useState('');

    // --- Graph-Aware Extraction ---
    const getConnectedInputs = () => {
        const connectedEdges = store.edges.filter(e => e.target === id);
        const sourceIds = connectedEdges.map(e => e.source);
        const sourceNodes = store.nodes.filter(n => sourceIds.includes(n.id));

        const inputs = {
            character: store.activeCharacter?.name || '',
            wardrobe: store.currentWardrobe || '',
            product: store.currentProduct?.description || '',
            productImage: store.currentProduct?.image || null,
            location: '',
            kit: store.activeCharacter?.identity_kit || {}
        };

        // Prioritize data from connected nodes
        sourceNodes.forEach(node => {
            if (node.type === 'influencer' || node.type === 'identity') {
                inputs.character = node.data.label || node.data.name || inputs.character;
                // ✅ CRITICAL: Extract identity kit for face consistency
                if (node.data.kit) {
                    inputs.kit = node.data.kit;
                }
            } else if (node.type === 'wardrobe') {
                inputs.wardrobe = node.data.outfitDescription || inputs.wardrobe;
            } else if (node.type === 'product') {
                inputs.product = node.data.productDescription || node.data.description || inputs.product;
                inputs.productImage = node.data.productImage || inputs.productImage;
            } else if (node.type === 'ambient' || node.type === 'lighting') {
                const locVal = node.data.atmosphere || node.data.lighting || '';
                inputs.location = inputs.location ? `${inputs.location}, ${locVal}` : locVal;
            }
        });

        return inputs;
    };

    const activeInputs = getConnectedInputs();
    const activeStyle = NICHE_STYLES[selectedNiche] || NICHE_STYLES.CUSTOM;

    // Dynamic Summary Text
    const dynamicSummary = `${activeStyle.vibe.split(',')[0]} featuring ${activeInputs.character || 'a subject'}, characterized by ${activeStyle.camera.split(',')[0]} and ${activeStyle.lighting.split(',')[0]}.`;

    const durConfig = DURATIONS.find(d => d.value === sceneDuration);

    // Auto-populate prompt from connected nodes
    React.useEffect(() => {
        const charName = activeInputs.character;
        const prodDesc = activeInputs.product?.split(',')[0] || '';
        if (charName && prodDesc) {
            setUserPrompt(`${charName} showcasing ${prodDesc}`);
        } else if (charName) {
            setUserPrompt(`${charName} in a cinematic brand scene`);
        }
    }, [activeInputs.character, activeInputs.product]);

    const handleGenerateStoryboard = async () => {
        if (isGenerating) return;
        setIsGenerating(true);

        try {
            // ── Build 4-pillar payload ──
            const payload = {
                duration: sceneDuration,
                inputs: activeInputs,
                selectedNiche,
                aspectRatio,
                // Legacy fields for backward compat
                prompt: userPrompt || `${activeInputs.character} showcasing ${activeInputs.product}`,
                characterName: activeInputs.character,
            };

            const response = await fetch(getApiUrl('/api/ugc/auto-storyboard'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.scenes?.length > 0) {
                updateNodeData(id, { scenes: result.scenes });

                // Auto-spawn scene nodes + generate images
                const baseX = store.nodes.find(n => n.id === id)?.position?.x || 400;
                const baseY = (store.nodes.find(n => n.id === id)?.position?.y || 300) + 220;

                result.scenes.forEach(async (scene, i) => {
                    const sceneNodeId = store.addNode(
                        '',
                        `SHOT_${scene.shotNumber || i + 1}: ${scene.shotType}`,
                        true,
                        { x: baseX + (i * 260), y: baseY }
                    );
                    store.updateNodeData(sceneNodeId, {
                        sceneIndex: i,
                        timeRange: scene.timeRange,
                        shotType: scene.shotType,
                        action: scene.action,
                        hasProduct: scene.hasProduct,
                        prompt: scene.prompt,
                        label: `SHOT_${scene.shotNumber || i + 1}`
                    });
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

                    // Generate scene image with 3-image consistency refs
                    try {
                        const kit = activeInputs.kit || {};
                        const identityImages = [
                            kit.anchor || activeInputs.image, // fallback to main image
                            kit.profile || kit.angle_1,
                            kit.fullBody || kit.full_body
                        ].filter(Boolean).slice(0, 3);

                        const sceneImageUrl = await generateCharacterImage({
                            prompt: scene.prompt,
                            identity_images: identityImages,
                            product_image: activeInputs.productImage || store.currentProduct?.image,
                            aspectRatio: aspectRatio,
                            resolution: '1K',
                            bible: store.universeBible,
                        });

                        if (sceneImageUrl) {
                            store.updateNodeData(sceneNodeId, { image: sceneImageUrl, isOptimistic: false });
                        }
                    } catch (err) {
                        console.error(`Image gen failed for shot ${i + 1}:`, err);
                        store.updateNodeData(sceneNodeId, { isOptimistic: false });
                    }
                });
            }
        } catch (err) {
            console.error('Storyboard gen error:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ scale: 1.04 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="group relative px-4 py-3.5 bg-[#0a0a0a]/90 backdrop-blur-2xl border-2 border-violet-500/20 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-violet-500/50 transition-all"
            style={{ minWidth: 280, maxWidth: 300 }}
        >
            <Handle type="target" position={Position.Left}
                className="!w-4 !h-4 !bg-violet-500 !border-4 !border-[#050505] !shadow-[0_0_15px_rgba(139,92,246,0.5)] hover:!scale-125 transition-all"
            />

            <button onClick={() => data.onDelete(id)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white scale-0 group-hover:scale-100 transition-transform shadow-lg z-50">
                <X size={10} />
            </button>

            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-violet-500/20 rounded-lg">
                        <Clapperboard size={13} className="text-violet-400" />
                    </div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">AUTO_STORYBOARD</span>
                </div>
                <div className="flex items-center gap-1 text-[7px] text-violet-400 font-mono">
                    <Camera size={8} />
                    {durConfig?.shots} SHOTS
                </div>
            </div>

            {/* Duration Selector */}
            <div className="flex gap-1 mb-3">
                {DURATIONS.map(({ value, label, shots }) => (
                    <button
                        key={value}
                        onClick={() => setSceneDuration(value)}
                        className={`flex-1 py-1 rounded-lg text-[7px] font-black transition-all ${sceneDuration === value
                            ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40'
                            : 'bg-white/5 text-white/20 border border-white/5 hover:bg-white/10'}`}
                        title={`${shots} shots`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Aspect Ratio Selector */}
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-1.5">
                    <Maximize2 size={10} className="text-violet-400" />
                    <span className="text-[7px] font-black text-white/40 uppercase">Ratio</span>
                </div>
                <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/5 rounded-lg py-1 px-2 text-[8px] text-white/70 font-mono focus:outline-none focus:border-violet-500/40 appearance-none text-center"
                >
                    <option value="9:16">9:16 (Vertical)</option>
                    <option value="16:9">16:9 (Cinema)</option>
                    <option value="1:1">1:1 (Square)</option>
                </select>
            </div>

            {/* Niche Selection Grid */}
            <div className="grid grid-cols-3 gap-1 mb-3">
                {Object.keys(NICHE_STYLES).map(niche => (
                    <button
                        key={niche}
                        onClick={() => setSelectedNiche(niche)}
                        className={`py-1.5 px-0.5 rounded-lg text-[6px] font-black transition-all border ${selectedNiche === niche
                            ? 'bg-violet-500/30 text-violet-300 border-violet-500/40 shadow-[0_0_10px_rgba(139,92,246,0.2)]'
                            : 'bg-white/5 text-white/20 border-white/5 hover:bg-white/10'}`}
                    >
                        {niche.replace(' UGC AD', '')}
                    </button>
                ))}
            </div>

            {/* Dynamic Style Summary */}
            <div className="px-3 py-2 bg-violet-500/5 border border-violet-500/10 rounded-xl mb-3">
                <p className="text-[7px] font-mono text-violet-300/60 leading-relaxed italic">
                    "{dynamicSummary}"
                </p>
            </div>

            {/* Context pills — show active character/product */}
            <div className="flex gap-1.5 mb-2 flex-wrap min-h-[16px]">
                {activeInputs.character && (
                    <span className="px-2 py-0.5 bg-[#bef264]/10 border border-[#bef264]/20 rounded-full text-[7px] font-black text-[#bef264] truncate max-w-[110px]">
                        👤 {activeInputs.character}
                    </span>
                )}
                {activeInputs.product && (
                    <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[7px] font-black text-amber-400 truncate max-w-[110px]">
                        📦 {activeInputs.product.split(',')[0]}
                    </span>
                )}
            </div>

            {/* Prompt input */}
            <textarea
                value={userPrompt}
                onChange={e => setUserPrompt(e.target.value)}
                placeholder="Describe the scene vision (optional — auto-built from connected nodes)..."
                className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 text-[10px] text-white/70 font-mono resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
                rows={2}
            />

            {/* Generate Button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGenerateStoryboard}
                disabled={isGenerating}
                className="w-full mt-2.5 py-2.5 bg-violet-600/20 hover:bg-violet-600/40 disabled:opacity-30 rounded-xl border border-violet-500/30 text-[9px] font-black text-white uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
                {isGenerating ? (
                    <><Loader2 size={11} className="animate-spin" /> BUILDING {durConfig?.shots} SHOTS...</>
                ) : (
                    <><Film size={11} /> GENERATE {durConfig?.shots}-SHOT LIST</>
                )}
            </motion.button>

            {/* Shot Grid — film contact sheet */}
            <AnimatePresence>
                {data.scenes?.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3"
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[7px] text-white/20 font-mono uppercase">Shot List</span>
                            <span className="text-[7px] text-violet-400 font-black">{data.scenes.length} SHOTS</span>
                        </div>
                        {/* Scrollable 2-column grid */}
                        <div
                            className="grid gap-1.5 overflow-y-auto pr-0.5"
                            style={{ gridTemplateColumns: '1fr 1fr', maxHeight: 220 }}
                        >
                            {data.scenes.map((scene, i) => (
                                <ShotCard key={i} scene={scene} index={i} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer */}
            <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2">
                <span className="text-[6px] font-bold text-white/10 uppercase tracking-[0.4em]">SHOT_LIST_V2</span>
                <div className="flex items-center gap-1.5 text-[7px] font-bold text-violet-400">
                    <div className={`w-1.5 h-1.5 rounded-full ${data.scenes?.length ? 'bg-violet-500' : 'border border-violet-500/40'}`} />
                    {data.scenes?.length ? `${data.scenes.length}_SHOTS` : 'READY'}
                </div>
            </div>

            <Handle type="source" position={Position.Right}
                className="!w-4 !h-4 !bg-violet-500 !border-4 !border-[#050505] !shadow-[0_0_15px_rgba(139,92,246,0.5)] hover:!scale-125 transition-all"
            />
        </motion.div>
    );
});
