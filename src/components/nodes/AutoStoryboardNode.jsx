import { Position, useUpdateNodeInternals } from 'reactflow';
import React, { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, X, Loader2, Clapperboard, Clock, Camera, Maximize2, Cpu, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store';
import { generateCharacterImage, buildConsistencyRefs } from '../../services/geminiService';
import { NICHE_STYLES } from '../../storyboardConfig';
import MagneticHandle from '../edges/MagneticHandle';

// ===== IMPORT ENGINE =====
import {
    DURATIONS,
    buildShotPlan,
    buildPromptFromShot,
    detectContextMode
} from '../../engine/autoStoryEngine';

// Compact film-strip shot card
function ShotCard({ scene, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative bg-black/50 border border-violet-500/15 rounded-lg overflow-hidden group/shot"
        >
            {/* Image Preview */}
            <div className="aspect-video w-full bg-violet-500/5 relative overflow-hidden border-b border-violet-500/10">
                {scene.image ? (
                    <img
                        src={scene.image}
                        alt={`Shot ${index + 1}`}
                        className="w-full h-full object-cover group-hover/shot:scale-110 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Loader2 size={12} className="text-violet-500/20 animate-spin" />
                    </div>
                )}
                {/* Overlay Badge */}
                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[6px] font-black text-violet-400 border border-violet-500/20">
                    S_{index + 1}
                </div>
            </div>

            {/* Shot Meta */}
            <div className="p-1.5 space-y-0.5 bg-gradient-to-b from-transparent to-black/40">
                <span className="block text-[7px] font-black text-violet-300 uppercase truncate">
                    {scene.camera || 'Standard Shot'}
                </span>
                <span className="block text-[6px] text-white/40 font-medium leading-tight line-clamp-2 italic">
                    {scene.action}
                </span>
            </div>
        </motion.div>
    );
}

export default memo(({ id, data }) => {
    const store = useAppStore();
    const updateNodeInternals = useUpdateNodeInternals();
    const updateNodeData = useAppStore(s => s.updateNodeData);

    useEffect(() => {
        updateNodeInternals(id);
    }, [id, updateNodeInternals]);

    const [isGenerating, setIsGenerating] = useState(false);
    const [sceneDuration, setSceneDuration] = useState(15);
    const [selectedNiche, setSelectedNiche] = useState('CUSTOM');
    const [aspectRatio, setAspectRatio] = useState('9:16');
    const [userPrompt, setUserPrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash-image');

    // --- Graph-Aware Extraction ---
    const connectedEdges = store.edges.filter(e => e.target === id);
    const sourceIds = connectedEdges.map(e => e.source);
    const sourceNodes = store.nodes.filter(n => sourceIds.includes(n.id));

    const getConnectedInputs = () => {
        const inputs = {
            character: store?.activeCharacter?.name ?? '',
            wardrobe: store?.currentWardrobe ?? '',
            wardrobeDetails: [],
            product: store?.currentProduct?.description ?? '',
            productImage: store?.currentProduct?.image ?? '',
            location: '',
            locationDetails: null,
            kit: store?.activeCharacter?.identity_kit ?? {}
        };

        const profiles = {
            product: store?.currentProduct || null,
            location: null,
            wardrobe: store?.currentWardrobeProfile || null
        };

        // Prioritize data from connected nodes
        connectedEdges.forEach(edge => {
            const node = sourceNodes.find(n => n.id === edge.source);
            if (!node || !node.data) return;

            const handleId = edge.targetHandle;

            if (handleId === 'character' || node.type === 'influencer' || node.type === 'identity') {
                inputs.character = node.data?.label ?? node.data?.name ?? inputs.character;
                if (node.data?.kit) inputs.kit = node.data.kit;
            }

            if (handleId === 'wardrobe' || node.type === 'wardrobe') {
                inputs.wardrobe = node.data?.outfitDescription ?? inputs.wardrobe;
                inputs.wardrobeDetails = Array.isArray(node.data?.items) ? node.data.items : inputs.wardrobeDetails;
                profiles.wardrobe = node.data?.wardrobeProfile || profiles.wardrobe;
            }

            if (handleId === 'product' || node.type === 'product') {
                const profile = node.data?.productProfile || {};
                inputs.product = profile.description ?? node.data?.description ?? inputs.product;
                inputs.productImage = profile.image ?? inputs.productImage;
                profiles.product = profile;
            }

            if (handleId === 'location' || node.type === 'location' || node.type === 'ambient' || node.type === 'lighting') {
                if (node.type === 'location') {
                    inputs.location = node.data?.locationName ?? inputs.location;
                    inputs.locationDetails = node.data ?? inputs.locationDetails;
                    profiles.location = node.data?.locationProfile || node.data;
                } else {
                    const locVal = node.data?.atmosphere ?? node.data?.lighting ?? '';
                    inputs.location = locVal
                        ? (inputs.location ? `${inputs.location}, ${locVal}` : locVal)
                        : inputs.location;
                }
            }
        });

        return { inputs, profiles };
    };

    const { inputs: activeInputs, profiles: activeProfiles } = getConnectedInputs();
    const contextMode = detectContextMode(activeInputs);
    const durConfig = DURATIONS.find(d => d.value === sceneDuration);
    const dynamicSummary = `${selectedNiche} Style | ${sceneDuration}s | ${aspectRatio} | ${contextMode.replace('_', ' ').toUpperCase()}`;

    // --- Dependency Locks ---
    const analyzingDeps = sourceNodes.filter(node =>
        ['product', 'wardrobe', 'location'].includes(node.type) &&
        (node.data?.status === 'ANALYZING')
    );
    const hasBlockingDependencies = analyzingDeps.length > 0;
    const dependencyMessage = hasBlockingDependencies
        ? `Please wait for ${analyzingDeps.map(n => n.data?.label || n.type.toUpperCase()).join(', ')} analysis to finish.`
        : '';

    const handleGenerateStoryboard = async () => {
        if (hasBlockingDependencies) {
            const blockedNodes = analyzingDeps.map(n => n.data?.label || n.type.toUpperCase()).join(', ');
            console.warn(`[AUTO_STORYBOARD] Blocked: ${blockedNodes} still analyzing.`);
            alert(`⚠️ Please wait for: ${blockedNodes}`);
            return;
        }

        // Validate context mode
        if (contextMode === 'empty') {
            alert('⚠️ Please connect at least a Character or Product node.');
            return;
        }

        setIsGenerating(true);

        try {
            // 1️⃣ Generate session seed for consistency
            const sessionSeed = `SESSION_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

            // 2️⃣ Build shot plan based on duration and inputs
            const shotPlan = buildShotPlan({
                inputs: activeInputs,
                niche: selectedNiche,
                duration: sceneDuration,
                profiles: activeProfiles
            });

            console.log(`[AUTO_STORY] Generating ${shotPlan.length} shots for ${contextMode} mode`);

            // 3️⃣ Build consistency references (Neural Identity + Product Lock)
            const consistencyRefs = await buildConsistencyRefs({
                kit: activeInputs.kit,
                product: activeInputs.productImage
            });

            // 4️⃣ Generate all shots in parallel
            const shotPromises = shotPlan.map(async (shot) => {
                // Build prompt for this specific shot
                const prompt = buildPromptFromShot(
                    activeInputs,
                    shot,
                    selectedNiche,
                    aspectRatio,
                    sessionSeed,
                    activeProfiles
                );

                // Add user's custom prompt if provided
                const finalPrompt = userPrompt
                    ? `${prompt}\n\nAdditional Direction: ${userPrompt}`
                    : prompt;

                console.log(`[SHOT ${shot.shotNumber}] ${shot.camera} | ${shot.action}`);

                // Generate image
                const imageUrl = await generateCharacterImage({
                    prompt: finalPrompt,
                    aspectRatio,
                    modelEngine: selectedModel,
                    consistencyRefs: consistencyRefs,
                    product_image: activeInputs.productImage // Explicitly pass product for high-priority lock
                });

                return {
                    shotNumber: shot.shotNumber,
                    role: shot.role,
                    shotType: shot.role,
                    camera: shot.camera,
                    action: shot.action,
                    prompt: finalPrompt,
                    image: imageUrl,
                    contextMode: shot.contextMode
                };
            });

            const generatedScenes = await Promise.all(shotPromises);

            // 5️⃣ Update node with generated scenes
            updateNodeData(id, {
                scenes: generatedScenes,
                metadata: {
                    niche: selectedNiche,
                    duration: sceneDuration,
                    aspectRatio,
                    contextMode,
                    sessionSeed,
                    timestamp: new Date().toISOString()
                }
            });

            // 6️⃣ Spawn individual shot nodes on the canvas
            console.log(`[AUTO_STORY] Spawning ${generatedScenes.length} individual shot nodes...`);

            const me = store.nodes.find(n => n.id === id);
            const pos = me?.position || { x: 400, y: 200 };

            generatedScenes.forEach((scene, index) => {
                // Calculate position: arranged in a staggered column to the right
                const spawnPos = {
                    x: pos.x + 400,
                    y: pos.y + (index * 260) - ((generatedScenes.length * 260) / 2) + 130
                };

                // Add as an identity node (best for image display and upscaling)
                const shotNodeId = store.addNode(
                    scene.image,
                    `SHOT_${scene.shotNumber}: ${scene.camera}`,
                    false,
                    spawnPos
                );

                // Auto-connect to the story-output handle
                store.onConnect({
                    source: id,
                    sourceHandle: 'story-output',
                    target: shotNodeId,
                    targetHandle: null
                });
            });

            console.log(`[AUTO_STORY] ✅ Generated and spawned ${generatedScenes.length} shots successfully`);

        } catch (err) {
            console.error('[AUTO_STORY] Generation failed:', err);
            alert(`❌ Generation failed: ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="relative group/node">
            {/* DELETE BUTTON */}
            <button
                onClick={() => data.onDelete(id)}
                className="absolute -top-10 -right-2 p-2 bg-red-500 hover:bg-red-400 text-white border border-red-500/30 rounded-xl shadow-lg transition-all z-50 backdrop-blur-xl scale-0 group-hover/node:scale-100 active:scale-95"
                title="Delete Node"
            >
                <Trash2 size={12} />
            </button>

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-[280px] bg-gradient-to-b from-black/90 via-black/85 to-black/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-violet-500/20 overflow-visible"
            >
                {/* Header */}
                <div className="px-3 py-2 border-b border-white/5 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10">
                    <div className="flex items-center gap-2">
                        <Clapperboard size={11} className="text-violet-400" />
                        <span className="text-[9px] font-black text-white/90 uppercase tracking-wider">
                            Auto Story Engine
                        </span>
                    </div>
                </div>

                <div className="p-3 space-y-3">
                    {/* Duration & Aspect Ratio Row */}
                    <div className="grid grid-cols-2 gap-2">
                        {/* Duration */}
                        <div>
                            <div className="flex items-center gap-1 mb-1">
                                <Clock size={9} className="text-violet-400" />
                                <span className="text-[7px] font-black text-white/40 uppercase">Duration</span>
                            </div>
                            <select
                                value={sceneDuration}
                                onChange={e => setSceneDuration(Number(e.target.value))}
                                className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 px-2 text-[9px] text-violet-300 font-mono focus:outline-none focus:border-violet-500/40"
                            >
                                {DURATIONS.map(d => (
                                    <option key={d.value} value={d.value}>
                                        {d.label} ({d.shots} shots)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Aspect Ratio */}
                        <div>
                            <div className="flex items-center gap-1 mb-1">
                                <Maximize2 size={9} className="text-violet-400" />
                                <span className="text-[7px] font-black text-white/40 uppercase">Aspect</span>
                            </div>
                            <div className="flex gap-1">
                                {['9:16', '16:9', '1:1'].map(ratio => (
                                    <button
                                        key={ratio}
                                        onClick={() => setAspectRatio(ratio)}
                                        className={`flex-1 py-1 rounded-lg text-[8px] font-black transition-all border ${aspectRatio === ratio
                                            ? 'bg-violet-500/30 text-violet-300 border-violet-500/40'
                                            : 'bg-white/5 text-white/30 border-white/5 hover:bg-white/10'
                                            }`}
                                    >
                                        {ratio}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* AI Engine Selector */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5">
                            <Cpu size={10} className="text-violet-400" />
                            <span className="text-[7px] font-black text-white/40 uppercase">AI ENGINE</span>
                        </div>
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="flex-1 bg-black/40 border border-white/5 rounded-lg py-1 px-2 text-[8px] text-violet-300 font-mono focus:outline-none focus:border-violet-500/40"
                        >
                            <option value="gemini-2.5-flash-image">Gemini 2.5 Flash</option>
                            <option value="gemini-3-pro-image-preview">Gemini 3 Pro (2K/4K)</option>
                            <option value="flux-1.1-pro">Flux 1.1 Pro</option>
                        </select>
                    </div>

                    {/* Niche Selection Grid */}
                    <div className="grid grid-cols-3 gap-1">
                        {Object.keys(NICHE_STYLES).map(niche => (
                            <button
                                key={niche}
                                onClick={() => setSelectedNiche(niche)}
                                className={`py-1.5 px-0.5 rounded-lg text-[6px] font-black transition-all border ${selectedNiche === niche
                                    ? 'bg-violet-500/30 text-violet-300 border-violet-500/40 shadow-[0_0_10px_rgba(139,92,246,0.2)]'
                                    : 'bg-white/5 text-white/20 border-white/5 hover:bg-white/10'
                                    }`}
                            >
                                {niche.replace(' UGC AD', '')}
                            </button>
                        ))}
                    </div>

                    {/* Dynamic Style Summary */}
                    <div className="px-3 py-2 bg-violet-500/5 border border-violet-500/10 rounded-xl">
                        <p className="text-[7px] font-mono text-violet-300/60 leading-relaxed italic">
                            "{dynamicSummary}"
                        </p>
                    </div>

                    {/* Context Mode Indicator */}
                    <div className="flex gap-1.5 flex-wrap min-h-[16px]">
                        {contextMode === 'product_only' && (
                            <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[7px] font-black text-amber-400">
                                📦 PRODUCT ONLY
                            </span>
                        )}
                        {contextMode === 'character_with_product' && (
                            <>
                                <span className="px-2 py-0.5 bg-[#bef264]/10 border border-[#bef264]/20 rounded-full text-[7px] font-black text-[#bef264] truncate max-w-[110px]">
                                    👤 {activeInputs.character}
                                </span>
                                <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[7px] font-black text-amber-400 truncate max-w-[110px]">
                                    📦 {activeInputs.product.split(',')[0]}
                                </span>
                            </>
                        )}
                        {contextMode === 'character_only' && (
                            <span className="px-2 py-0.5 bg-[#bef264]/10 border border-[#bef264]/20 rounded-full text-[7px] font-black text-[#bef264] truncate max-w-[110px]">
                                👤 {activeInputs.character}
                            </span>
                        )}
                        {contextMode === 'empty' && (
                            <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full text-[7px] font-black text-red-400">
                                ⚠️ Connect nodes
                            </span>
                        )}
                    </div>

                    {/* Prompt input */}
                    <textarea
                        value={userPrompt}
                        onChange={e => setUserPrompt(e.target.value)}
                        placeholder="Additional creative direction (optional)..."
                        className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 text-[10px] text-white/70 font-mono resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
                        rows={2}
                    />

                    {/* Generate Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleGenerateStoryboard}
                        disabled={isGenerating || hasBlockingDependencies || contextMode === 'empty'}
                        className="w-full mt-2.5 py-2.5 bg-violet-600/20 hover:bg-violet-600/40 disabled:opacity-30 rounded-xl border border-violet-500/30 text-[9px] font-black text-white uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    >
                        {isGenerating ? (
                            <><Loader2 size={11} className="animate-spin" /> BUILDING {durConfig?.shots} SHOTS...</>
                        ) : (
                            <><Film size={11} /> GENERATE {durConfig?.shots} SHOTS</>
                        )}
                    </motion.button>

                    {hasBlockingDependencies && (
                        <p className="mt-1 text-[8px] text-amber-300/70 font-mono text-center">
                            {dependencyMessage}
                        </p>
                    )}

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
                </div>
            </motion.div>

            {/* Magnetic Handles */}
            {[
                { id: 'character', label: 'CHAR', color: '#bef264', top: '22%' },
                { id: 'wardrobe', label: 'WARB', color: '#f43f5e', top: '42%' },
                { id: 'product', label: 'PROD', color: '#f59e0b', top: '62%' },
                { id: 'location', label: 'LOC', color: '#22d3ee', top: '82%' }
            ].map((handle) => {
                const isConnected = store.edges.some(e => e.target === id && e.targetHandle === handle.id);
                return (
                    <div key={handle.id} className="group/handle">
                        <MagneticHandle
                            type="target"
                            position={Position.Left}
                            id={handle.id}
                            color={handle.color}
                            className={`!absolute !-left-2 z-50 ${isConnected ? 'neural-engaged' : ''}`}
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

            <div className="absolute inset-0 pointer-events-none">
                <MagneticHandle
                    type="source"
                    position={Position.Right}
                    color="#8b5cf6"
                    id="story-output"
                    className="handle-story"
                    style={{ top: '50%' }}
                />
            </div>
        </div>
    );
});
