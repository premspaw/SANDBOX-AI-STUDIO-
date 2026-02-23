import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Camera, Scissors, Wand2, Download, Layers } from 'lucide-react';
import { useAppStore } from '../store';

export const FocusOverlay = () => {
    const { viewMode, focusedNodeId, nodes, setOrbitMode } = useAppStore();
    const focusedNode = nodes.find(n => n.id === focusedNodeId);

    const [isSurgeryMode, setIsSurgeryMode] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(20);

    // ✅ RULE: Hooks MUST be defined before any early returns
    useEffect(() => {
        if (isSurgeryMode && canvasRef.current) {
            const imgElement = document.getElementById(`focused-image-${focusedNodeId}`);
            if (imgElement) {
                canvasRef.current.width = imgElement.clientWidth;
                canvasRef.current.height = imgElement.clientHeight;
            }
        }
    }, [isSurgeryMode, focusedNodeId]);

    // Now safe to return early
    if (viewMode !== 'FOCUS' || !focusedNode) return null;

    const mediaUrl = focusedNode.data?.image || focusedNode.data?.videoUrl;
    const isVideo = !!focusedNode.data?.videoUrl;

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
            } else {
                videoRef.current.play().catch(e => console.error("Video play failed:", e));
                setIsPlaying(true);
            }
        }
    };

    const handleExport = () => {
        if (!mediaUrl) return;
        const link = document.createElement('a');
        link.href = mediaUrl;
        link.download = isVideo ? `cinema_studio_render_${focusedNodeId}.mp4` : `cinema_studio_render_${focusedNodeId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleEnhance = async () => {
        if (focusedNodeId) {
            useAppStore.getState().upscaleNodeImage(focusedNodeId, '4K');
        }
    };

    const handleRemap = async () => {
        if (focusedNodeId && !isVideo) {
            const store = useAppStore.getState();
            const node = store.nodes.find(n => n.id === focusedNodeId);
            if (!node || !store.activeCharacter) return;

            store.updateNodeData(focusedNodeId, { isOptimistic: true, label: 'REMAPPING_IDENTITY...' });

            try {
                const { generateCharacterImage, buildConsistencyRefs, expandPrompt } = await import('../../geminiService');

                // 1. Expand prompt for the variation
                const expandedPrompt = await expandPrompt({
                    subject: store.activeCharacter.name,
                    subjectDescription: store.activeCharacter.metadata?.imageAnalysis?.description || store.activeCharacter.personality || 'the subject',
                    productDetails: store.currentProduct?.description || 'the scene context',
                    userAction: store.actionScript || 'A different cinematic angle and expression of the subject',
                    visualStyle: 'Cinematic',
                    duration: 30
                });

                // 2. Build references
                const references = await buildConsistencyRefs({
                    kit: store.activeCharacter.identity_kit || store.detailMatrix,
                    anchor: store.anchorImage,
                    wardrobe: store.wardrobeImage,
                    pose: store.poseImage,
                });

                const result = await generateCharacterImage({
                    prompt: expandedPrompt,
                    identity_images: references,
                    product_image: store.currentProduct?.image,
                    aspectRatio: store.camera.ratio,
                    resolution: store.camera.resolution,
                    bible: store.universeBible
                });

                if (result) {
                    store.updateNodeData(focusedNodeId, {
                        image: result,
                        isOptimistic: false,
                        label: 'REMAPPED_OUTPUT',
                        expandedPrompt: expandedPrompt
                    });

                    const { saveGeneratedAsset } = await import('../supabaseService');
                    saveGeneratedAsset(result, 'image', `remap_${focusedNodeId}_${Date.now()}.png`);
                } else {
                    store.updateNodeData(focusedNodeId, { isOptimistic: false });
                }
            } catch (err) {
                console.error("Remap failed:", err);
                store.updateNodeData(focusedNodeId, { isOptimistic: false });
            }
        }
    };

    const handleExecuteRepair = async (repairPrompt) => {
        if (!focusedNodeId || isVideo) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const store = useAppStore.getState();
        store.updateNodeData(focusedNodeId, { isOptimistic: true, label: 'EXECUTING_SURGERY...' });

        try {
            const { generateSurgicalRepair } = await import('../../geminiService');
            const maskData = canvas.toDataURL('image/png');
            const result = await generateSurgicalRepair(focusedNode.data.image, maskData, repairPrompt);

            if (result) {
                store.updateNodeData(focusedNodeId, {
                    image: result,
                    isOptimistic: false,
                    label: 'SURGERY_SUCCESS'
                });

                const { saveGeneratedAsset } = await import('../supabaseService');
                saveGeneratedAsset(result, 'image', `surgery_${focusedNodeId}_${Date.now()}.png`);
                setIsSurgeryMode(false);
            } else {
                store.updateNodeData(focusedNodeId, { isOptimistic: false });
            }
        } catch (err) {
            console.error("Surgery failed:", err);
            store.updateNodeData(focusedNodeId, { isOptimistic: false });
        }
    };

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing || !isSurgeryMode) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearMask = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-3xl"
        >
            <div className="absolute inset-0" onClick={setOrbitMode} />

            <button
                onClick={setOrbitMode}
                className="absolute top-8 right-8 p-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white rounded-full transition-all z-[210] group"
            >
                <X size={24} className="group-hover:rotate-90 transition-transform" />
            </button>

            <div className="relative w-full h-full flex items-center justify-center p-20 pointer-events-none">
                <div className="relative max-w-full max-h-full pointer-events-auto shadow-[0_50px_100px_rgba(0,0,0,0.8)] rounded-3xl overflow-hidden border border-white/10 bg-zinc-900">
                    {isVideo ? (
                        <motion.video
                            ref={videoRef}
                            layoutId={`media-${focusedNodeId}`}
                            src={mediaUrl}
                            className="max-w-full max-h-[80vh] object-contain cursor-pointer"
                            autoPlay
                            loop
                            muted
                            onClick={togglePlay}
                        />
                    ) : (
                        <div className="relative">
                            <motion.img
                                id={`focused-image-${focusedNodeId}`}
                                layoutId={`media-${focusedNodeId}`}
                                src={mediaUrl}
                                className="max-w-full max-h-[85vh] object-contain"
                                onLoad={() => {
                                    if (isSurgeryMode && canvasRef.current) {
                                        const imgElement = document.getElementById(`focused-image-${focusedNodeId}`);
                                        if (imgElement) {
                                            canvasRef.current.width = imgElement.clientWidth;
                                            canvasRef.current.height = imgElement.clientHeight;
                                        }
                                    }
                                }}
                            />

                            {isSurgeryMode && (
                                <canvas
                                    ref={canvasRef}
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-crosshair z-30 touch-none"
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                />
                            )}
                        </div>
                    )}

                    {isVideo && (
                        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between opacity-0 hover:opacity-100 transition-opacity">
                            <button onClick={togglePlay} className="p-3 bg-[#bef264] text-black rounded-lg">
                                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                            </button>
                            <div className="flex-1 mx-6 h-1 bg-white/20 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-[#bef264]"
                                    initial={{ width: 0 }}
                                    animate={{ width: '60%' }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-[210]">
                <div className="p-2 bg-black/60 border border-white/10 backdrop-blur-2xl rounded-3xl flex flex-col gap-2">
                    <ToolbarButton icon={<Download size={18} />} label="EXPORT" onClick={handleExport} />
                    <div className="w-full h-px bg-white/5 my-1" />
                    {!isVideo && (
                        <ToolbarButton
                            icon={<Scissors size={18} />}
                            label="SURGERY"
                            active={isSurgeryMode}
                            onClick={() => setIsSurgeryMode(!isSurgeryMode)}
                        />
                    )}
                    <ToolbarButton icon={<Wand2 size={18} />} label="ENHANCE" onClick={handleEnhance} />
                    <ToolbarButton icon={<Layers size={18} />} label="REMAP" onClick={handleRemap} />
                </div>

                {isSurgeryMode && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-6 bg-[#bef264] text-black rounded-3xl flex flex-col gap-4 w-64 shadow-2xl"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Camera size={16} />
                            <span className="text-[10px] font-black uppercase tracking-wider">Neural_Mask_v1</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[9px] font-bold">
                                <span>BRUSH_SIZE</span>
                                <span>{brushSize}px</span>
                            </div>
                            <input
                                type="range"
                                min="5"
                                max="100"
                                value={brushSize}
                                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                className="w-full accent-black"
                            />
                        </div>
                        <textarea
                            id="repair-prompt-input"
                            placeholder="REPAIR_PROMPT: (e.g. fix eye details, remove reflections)"
                            className="w-full h-24 bg-black/10 border border-black/10 rounded-xl p-3 text-[10px] font-mono placeholder:text-black/30 resize-none focus:outline-none"
                        />
                        <button
                            className="w-full py-3 bg-black text-[#bef264] text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-xl"
                            onClick={() => {
                                const prompt = document.getElementById('repair-prompt-input')?.value;
                                if (!prompt) {
                                    alert("Please describe the repair needed.");
                                    return;
                                }
                                handleExecuteRepair(prompt);
                            }}
                        >
                            EXECUTE_REPAIR
                        </button>
                        <button
                            onClick={clearMask}
                            className="w-full py-2 border border-black/20 text-black/60 text-[8px] font-bold uppercase tracking-widest rounded-xl"
                        >
                            CLEAR_MASK
                        </button>
                    </motion.div>
                )}
            </div>

            <div className="absolute bottom-8 left-8 flex flex-col gap-1 z-[210]">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#bef264]" />
                    <span className="text-[11px] font-black text-white uppercase tracking-[0.3em]">FOCUS_ACTIVE</span>
                </div>
                <span className="text-[9px] text-white/40 font-mono italic">NODE_UID: {focusedNodeId}</span>
            </div>
        </motion.div>
    );
};

const ToolbarButton = ({ icon, label, onClick, active = false }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl transition-all ${active
            ? 'bg-[#bef264] text-black shadow-[0_0_20px_rgba(190,242,100,0.3)]'
            : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
    >
        {icon}
        <span className="text-[7px] font-black tracking-widest uppercase">{label}</span>
    </button>
);
