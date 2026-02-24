import React, { memo, useState } from 'react';
import { Position } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, X, Loader2, Clapperboard, Clock, Camera, Maximize2, Cpu } from 'lucide-react';
import { useAppStore } from '../store';
import { generateCharacterImage, buildConsistencyRefs, expandPrompt } from '../../geminiService';
import { NICHE_STYLES } from '../storyboardConfig';
import { getApiUrl } from '../config/apiConfig';
import MagneticHandle from './edges/MagneticHandle';

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
    const [selectedModel, setSelectedModel] = useState('imagen-3.0-generate-001'); // Default

    // --- Graph-Aware Extraction ---
    const getConnectedInputs = () => {
        const connectedEdges = store.edges.filter(e => e.target === id);
        const sourceIds = connectedEdges.map(e => e.source);
        const sourceNodes = store.nodes.filter(n => sourceIds.includes(n.id));

        const inputs = {
            character: store.activeCharacter?.name || '',
            wardrobe: store.currentWardrobe || '',
            wardrobeDetails: [],
            product: store.currentProduct?.description || '',
            productImage: store.currentProduct?.image || null,
            location: '',
            locationDetails: null,
            kit: store.activeCharacter?.identity_kit || {}
        };

        // Prioritize data from connected nodes
        connectedEdges.forEach(edge => {
            const node = sourceNodes.find(n => n.id === edge.source);
            if (!node) return;

            const handleId = edge.targetHandle;

            // Route data based on handle ID first, then fallback to node type
            if (handleId === 'character' || node.type === 'influencer' || node.type === 'identity') {
                inputs.character = node.data.label || node.data.name || inputs.character;
                if (node.data.kit) inputs.kit = node.data.kit;
            }

            if (handleId === 'wardrobe' || node.type === 'wardrobe') {
                inputs.wardrobe = node.data.outfitDescription || inputs.wardrobe;
                inputs.wardrobeDetails = node.data.items || [];
            }

            if (handleId === 'product' || node.type === 'product') {
                inputs.product = node.data.productDescription || node.data.description || inputs.product;
                inputs.productImage = node.data.productImage || inputs.productImage;
            }

            if (handleId === 'location' || node.type === 'location' || node.type === 'ambient' || node.type === 'lighting') {
                if (node.type === 'location') {
                    inputs.location = node.data.locationName || inputs.location;
                    inputs.locationDetails = node.data;
                } else {
                    const locVal = node.data.atmosphere || node.data.lighting || '';
                    inputs.location = inputs.location ? `${inputs.location}, ${locVal}` : locVal;
                }
            }
        });

        return inputs;
    };

    const activeInputs = getConnectedInputs();
    const durConfig = DURATIONS.find(d => d.value === sceneDuration);
    const dynamicSummary = `${selectedNiche} Style | ${sceneDuration}s Narrative | ${aspectRatio} Composition`;

    const handleGenerateStoryboard = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch(getApiUrl('/api/ugc/generate-storyboard'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: userPrompt,
                    duration: sceneDuration,
                    niche: selectedNiche,
                    inputs: activeInputs
                })
            });
            const result = await response.json();
            if (result.scenes) {
                updateNodeData(id, { scenes: result.scenes, script: result.fullScript });

                // Spawn sequence nodes
                const sequencePos = { x: store.nodes.find(n => n.id === id).position.x + 400, y: store.nodes.find(n => n.id === id).position.y };
                result.scenes.forEach(async (scene, i) => {
                    const sceneNodeId = store.addVideoNode('', `Rendering Shot ${i + 1}...`, {
                        x: sequencePos.x,
                        y: sequencePos.y + (i * 150)
                    });

                    // Trigger visual generation for this shot immediately
                    try {
                        const finalPrompt = scene.visualPrompt;
                        const modelEngine = selectedModel;

                        const imageUrl = await generateCharacterImage(
                            finalPrompt,
                            activeInputs.kit,
                            activeInputs.productImage,
                            {
                                aspectRatio: aspectRatio.replace(':', '_'),
                                modelEngine
                            }
                        );

                        if (imageUrl) {
                            store.updateNodeData(sceneNodeId, {
                                videoUrl: imageUrl, // Reusing for placeholder
                                moviePoster: imageUrl,
                                isOptimistic: false,
                                label: `Shot ${i + 1}: ${scene.shotType}`
                            });
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
            style={{ minWidth: 280, maxWidth: 300, zIndex: 1 }}
            className="group relative px-4 py-3.5 bg-[#0a0a0a]/95 border-2 border-violet-500/20 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.6)] hover:border-violet-500/50 transition-all"
        >
            {/* Semantic Input Handles with Magnetic Snap + Neural Feedback */}
            {[
                { id: 'character', label: 'CHAR', color: '#bef264', cssClass: 'handle-character', top: '22%' },
                { id: 'wardrobe', label: 'WARB', color: '#f43f5e', cssClass: 'handle-wardrobe', top: '42%' },
                { id: 'product', label: 'PROD', color: '#f59e0b', cssClass: 'handle-product', top: '62%' },
                { id: 'location', label: 'LOC', color: '#22d3ee', cssClass: 'handle-location', top: '82%' }
            ].map((handle) => {
                const isConnected = store.edges.some(e => e.target === id && e.targetHandle === handle.id);
                return (
                    <div key={handle.id} className="group/handle">
                        <MagneticHandle
                            type="target"
                            position={Position.Left}
                            id={handle.id}
                            color={handle.color}
                            className={`!absolute !-left-2 z-50 ${handle.cssClass} ${isConnected ? 'neural-engaged' : ''}`}
                            style={{ top: handle.top, position: 'absolute' }}
                        />
                        <span
                            className="absolute pointer-events-none text-[7px] font-black text-white/20 uppercase tracking-tighter group-hover/handle:text-white/60 transition-colors z-40 w-12 text-right -left-[3.2rem]"
                            style={{ top: `calc(${handle.top} - 4px)` }}
                        >
                            {handle.label}
                        </span>
                    </div>
                );
            })}

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

            {/* AI Engine Selector */}
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-1.5">
                    <Cpu size={10} className="text-violet-400" />
                    <span className="text-[7px] font-black text-white/40 uppercase">AI ENGINE</span>
                </div>
                <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/5 rounded-lg py-1 px-2 text-[8px] text-violet-300 font-mono focus:outline-none focus:border-violet-500/40 appearance-none text-center font-black"
                >
                    <option value="imagen-3.0-generate-001">Imagen 3 (Default)</option>
                    <option value="nano-banana-pro">Nano Banana Pro (Exp)</option>
                    <option value="flux-1.1-pro">Flux 1.1 Pro (Replicate)</option>
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
                className="!w-4 !h-4 !bg-violet-500 !border-4 !border-[#050505] !shadow-lg hover:!scale-125 transition-all handle-story font-black"
            />
        </motion.div>
    );
});
