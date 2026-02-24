import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Cpu,
    Sparkles,
    Play,
    CheckCircle2,
    AlertCircle,
    Trash2,
    Layout,
    Type,
    Video,
    Zap,
    Download,
    Film,
    Loader2
} from 'lucide-react';
import { useAppStore } from '../store';
import { rankHooks, getTrainingContext } from '../services/narrativeTrainer';
import { getApiUrl } from '../config/apiConfig';

const UGCEngineNode = ({ id, data }) => {
    const [directive, setDirective] = useState('');
    const [status, setStatus] = useState(data.status || 'IDLE');
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState({
        synergy: data.synergy,
        script: data.script,
        scenes: data.scenes || []
    });
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [previewVideo, setPreviewVideo] = useState(null);
    const [keyframeImage, setKeyframeImage] = useState(null);
    const [videoStatus, setVideoStatus] = useState('');
    const [aspectRatio, setAspectRatio] = useState('9:16');
    const [duration, setDuration] = useState(6);
    const [isCompiling, setIsCompiling] = useState(false);
    const [finalAdUrl, setFinalAdUrl] = useState(null);

    const { tasks } = useWebSocket();
    const videoTask = tasks[`ugc-preview-${id}`];
    const exportTask = tasks[`ugc-export-${id}`];

    const nodes = useAppStore(s => s.nodes);
    const edges = useAppStore(s => s.edges);
    const globalAnchorImage = useAppStore(s => s.anchorImage);

    // Find connected source nodes based on specific handles
    const identityEdges = edges.filter(e => e.target === id && e.targetHandle === 'identity-input');
    const productEdges = edges.filter(e => e.target === id && e.targetHandle === 'product-input');

    const connectedIdentity = nodes.find(n => n.id === identityEdges[0]?.source);
    const connectedProduct = nodes.find(n => n.id === productEdges[0]?.source);

    const productImage = connectedProduct?.data?.image || connectedProduct?.data?.productImage;
    const productMetadata = {
        description: connectedProduct?.data?.productDescription,
        labels: connectedProduct?.data?.productLabels
    };

    const characterImage = connectedIdentity?.data?.image || connectedIdentity?.data?.anchorImage || globalAnchorImage;
    const characterMetadata = {
        name: connectedIdentity?.data?.label,
        analysis: connectedIdentity?.data?.analysisData
    };

    const handleExecute = async () => {
        if (!characterImage || !productImage) {
            alert("Connection Mapping Required:\n1. Connect Identity to TOP handle\n2. Connect Product to BOTTOM handle");
            return;
        }

        try {
            // STEP 1: Analyze Synergy & Generate Hooks Batch
            setStatus('ANALYZING');
            setProgress(30);

            // Get initial synergy
            const synergyResp = await fetch(getApiUrl('/api/ugc/ad-engine'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterImage,
                    productImage,
                    characterMetadata,
                    productMetadata,
                    directive: directive,
                    niche: 'lifestyle',
                    tone: 'energetic',
                    trainingContext: "" // Don't send context yet for synergy
                })
            });

            if (!synergyResp.ok) throw new Error("Synergy analysis failed");
            const synergyResult = await synergyResp.json();
            const synergy = synergyResult.synergy;

            // STEP 2: Generate 5 hooks for ranking
            setStatus('GENERATING_HOOKS');
            setProgress(50);

            const hooksResp = await fetch(getApiUrl('/api/ugc/generate-hooks-batch'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    synergy,
                    niche: 'lifestyle',
                    tone: 'energetic',
                    directive: directive
                })
            });

            if (!hooksResp.ok) throw new Error("Hook batch generation failed");
            const { hooks } = await hooksResp.json();

            // STEP 3: Local Ranking via Narrative Trainer
            console.log(`[UGC_ENGINE] Ranking ${hooks.length} hooks locally...`);
            const rankedHooks = await rankHooks(hooks);
            const bestHook = rankedHooks[0].hook;
            const trainingContext = getTrainingContext();

            console.log(`[UGC_ENGINE] Selected #1 Hook: "${bestHook}" | Training Context Active: ${!!trainingContext}`);

            // STEP 4: Finalize Script with best hook + training context
            setStatus('FINALIZING_SCRIPT');
            setProgress(80);

            const finalResp = await fetch(getApiUrl('/api/ugc/ad-engine'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterImage,
                    productImage,
                    characterMetadata,
                    productMetadata,
                    directive: bestHook, // Use best hook as directive
                    niche: 'lifestyle',
                    tone: 'energetic',
                    trainingContext: trainingContext // Inject user preference style
                })
            });

            if (!finalResp.ok) throw new Error("Script finalization failed");
            const finalResult = await finalResp.json();

            setResults({
                synergy: finalResult.synergy,
                script: finalResult.script, // This script is now built around the top-ranked hook
                scenes: finalResult.script.scenes
            });

            setProgress(100);
            setStatus('COMPLETE');
        } catch (error) {
            console.error("UGC Engine Error:", error);
            setStatus('ERROR');
        }
    };

    const handlePreviewVideo = async (sceneIndex = 0) => {
        if (!characterImage || !productImage) {
            alert('Character and Product images are required to generate a preview.');
            return;
        }

        const targetScene = results.scenes[sceneIndex];
        if (!targetScene) {
            alert('Target scene not found.');
            return;
        }

        setIsGeneratingVideo(true);
        setVideoStatus(`Rendering Scene ${sceneIndex + 1}...`);

        try {
            const resp = await fetch(getApiUrl('/api/ugc/preview-scene'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterImage,
                    productImage,
                    scene: targetScene,
                    analysis: {
                        synergy: results.synergy?.synergy,
                        characterTraits: results.synergy?.characterTraits,
                        suggestedTone: results.synergy?.suggestedTone,
                        productSellingPoints: results.synergy?.productSellingPoints
                    },
                    aspectRatio: aspectRatio,
                    duration: duration,
                    nodeId: id
                })
            });
            if (!resp.ok) {
                const err = await resp.json();
                throw new Error(err.error || 'Preview pipeline failed');
            }
            const result = await resp.json();

            // Spawn new node instead of local preview
            const me = nodes.find(n => n.id === id);
            const pos = me?.position || { x: 0, y: 0 };

            const videoNodeId = useAppStore.getState().addVideoNode(
                result.videoUrl,
                `UGC_${aspectRatio === '9:16' ? 'REEL' : 'AD'}_0${sceneIndex + 1}`,
                aspectRatio,
                { x: pos.x + 350, y: pos.y + (sceneIndex * 150) - 100 }
            );

            // AUTO-CONNECT
            useAppStore.getState().onConnect({
                source: id,
                target: videoNodeId
            });

            // Store URL in state for compiler
            setResults(prev => {
                const newScenes = [...prev.scenes];
                newScenes[sceneIndex] = { ...newScenes[sceneIndex], videoUrl: result.videoUrl };
                return { ...prev, scenes: newScenes };
            });

            setVideoStatus('Spawned!');
        } catch (error) {
            console.error('Preview Video Error:', error);
            const isQuotaError = error.message.toLowerCase().includes('quota') || error.message.includes('429');
            setVideoStatus(isQuotaError ?
                'API Quota Exceeded. Please check Google AI Studio.' :
                `Error: ${error.message}`
            );
        } finally {
            setIsGeneratingVideo(false);
        }
    };

    const handleCompileAd = async () => {
        const renderedScenes = results.scenes.filter(s => s.videoUrl);
        if (renderedScenes.length === 0) {
            alert("Protocol Violation: No rendered sequences found. Render at least one scene first.");
            return;
        }

        setIsCompiling(true);
        setFinalAdUrl(null);
        try {
            const resp = await fetch(getApiUrl('/api/ugc/compile-ad'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    script: results.script,
                    sceneVideos: renderedScenes.map(s => s.videoUrl),
                    nodeId: id
                })
            });
            if (!resp.ok) throw new Error("Compilation launch failed");

            // Task status will be handled by useWebSocket
        } catch (error) {
            console.error('Compile Error:', error);
            alert(`Compilation Failed: ${error.message}`);
            setIsCompiling(false);
        }
    };

    // Watch for export task completion
    useEffect(() => {
        if (exportTask?.status === 'complete' && exportTask.data?.url) {
            setFinalAdUrl(exportTask.data.url);
            setIsCompiling(false);
        } else if (exportTask?.status === 'error') {
            setIsCompiling(false);
        }
    }, [exportTask]);

    const handleExportAd = () => {
        const adPackage = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            synergy: results.synergy,
            characterTraits: results.characterTraits,
            productSellingPoints: results.productSellingPoints,
            recommendedNiche: results.recommendedNiche,
            suggestedTone: results.suggestedTone,
            script: results.script,
            previewKeyframe: keyframeImage || null,
            previewVideoUrl: previewVideo || null,
        };
        const blob = new Blob([JSON.stringify(adPackage, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ugc_ad_package_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const StatusBadge = ({ currentStatus }) => {
        const config = {
            IDLE: { icon: Play, color: 'text-zinc-400', label: 'READY' },
            ANALYZING: { icon: Cpu, color: 'text-blue-400 animate-pulse', label: 'SYNERGY' },
            GENERATING_HOOKS: { icon: Zap, color: 'text-orange-400 animate-pulse', label: 'RANKING' },
            FINALIZING_SCRIPT: { icon: Sparkles, color: 'text-purple-400 animate-pulse', label: 'SCRIPTING' },
            COMPLETE: { icon: CheckCircle2, color: 'text-[#bef264]', label: 'COMPLETE' },
            ERROR: { icon: AlertCircle, color: 'text-red-400', label: 'ERROR' }
        };
        const { icon: Icon, color, label } = config[currentStatus] || config.IDLE;
        return (
            <div className={`flex items-center gap-2 px-2 py-1 rounded-full bg-white/5 border border-white/10 ${color}`}>
                <Icon size={10} />
                <span className="text-[8px] font-black uppercase tracking-wider">{label}</span>
            </div>
        );
    };

    return (
        <div className="relative group">
            {/* DELETE BUTTON */}
            <button
                onClick={() => data.onDelete(id)}
                className="absolute -top-10 -right-2 p-2 bg-red-500 hover:bg-red-400 text-white border border-red-500/30 rounded-xl shadow-lg transition-all z-50 backdrop-blur-xl scale-100 active:scale-95"
                title="Delete Engine Node"
            >
                <Trash2 size={12} />
            </button>

            <div className="w-[320px] bg-zinc-950/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-2xl">
                {/* HEADER */}
                <div className="p-4 border-b border-white/5 bg-gradient-to-r from-[#bef264]/10 to-transparent flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#bef264] flex items-center justify-center shadow-[0_0_20px_rgba(190,242,100,0.3)]">
                            <Zap size={16} className="text-black" />
                        </div>
                        <div>
                            <h3 className="text-[10px] font-black text-white uppercase tracking-widest">UGC_AD_ENGINE</h3>
                            <p className="text-[8px] text-white/40 font-medium italic">Neural Multi-Modal Pipeline</p>
                        </div>
                    </div>
                    <StatusBadge currentStatus={status} />
                </div>

                <div className="p-4 space-y-4">
                    {/* PROGRESS BAR */}
                    {status !== 'IDLE' && status !== 'COMPLETE' && (
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className="h-full bg-[#bef264] shadow-[0_0_10px_#bef264]"
                            />
                        </div>
                    )}

                    {/* INPUT PREVIEW */}
                    {status === 'IDLE' && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="aspect-square rounded-xl border border-white/5 overflow-hidden relative group">
                                    {characterImage ? (
                                        <img src={characterImage} alt="Influencer" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/5">
                                            <Cpu size={12} className="text-white/20" />
                                            <span className="text-[7px] text-zinc-500 font-bold uppercase tracking-tighter text-center px-2">IDENTITY_REQUIRED</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 p-2 bg-black/60 backdrop-blur-md text-[7px] text-white/40 font-black uppercase tracking-widest">CHARACTER</div>
                                </div>
                                <div className="aspect-square rounded-xl border border-white/5 overflow-hidden relative group">
                                    {productImage ? (
                                        <img src={productImage} alt="Product" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/5">
                                            <Layout size={12} className="text-white/20" />
                                            <span className="text-[7px] text-zinc-500 font-bold uppercase tracking-tighter text-center px-2">PRODUCT_REQUIRED</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 p-2 bg-black/60 backdrop-blur-md text-[7px] text-white/40 font-black uppercase tracking-widest">PRODUCT</div>
                                </div>
                            </div>

                            {/* VIDEO SETTINGS */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Layout size={10} className="text-[#bef264]" />
                                        <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Dimension</span>
                                    </div>
                                    <select
                                        value={aspectRatio}
                                        onChange={(e) => setAspectRatio(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-[9px] text-white/70 outline-none focus:border-[#bef264]/40 transition-all font-bold"
                                    >
                                        <option value="9:16">Vertical (9:16)</option>
                                        <option value="16:9">Landscape (16:9)</option>
                                        <option value="1:1">Square (1:1)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Zap size={10} className="text-[#bef264]" />
                                        <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Duration</span>
                                    </div>
                                    <select
                                        value={duration}
                                        onChange={(e) => setDuration(Number(e.target.value))}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-[9px] text-white/70 outline-none focus:border-[#bef264]/40 transition-all font-bold"
                                    >
                                        <option value={6}>6 Seconds</option>
                                        <option value={10}>10 Seconds</option>
                                    </select>
                                </div>
                            </div>

                            {/* MARKETING DIRECTIVE */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Type size={10} className="text-[#bef264]" />
                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Global_Directive</span>
                                </div>
                                <textarea
                                    value={directive}
                                    onChange={(e) => setDirective(e.target.value)}
                                    placeholder="e.g., Make it high energy, focus on the texture of the product..."
                                    className="w-full h-20 bg-black/40 border border-white/10 rounded-xl p-3 text-[9px] text-white/70 outline-none focus:border-[#bef264]/40 transition-all resize-none font-medium placeholder:text-white/10"
                                />
                            </div>
                        </>
                    )}

                    {/* RESULTS: SYNERGY */}
                    <AnimatePresence>
                        {results.synergy && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap size={10} className="text-blue-400" />
                                    <span className="text-[8px] font-black text-blue-400 uppercase tracking-wider">Synergy_Point</span>
                                </div>
                                <p className="text-[9px] text-white/70 italic leading-relaxed">
                                    "{results.synergy.synergy}"
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* RESULTS: STORYBOARD */}
                    <AnimatePresence>
                        {results.scenes.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-2"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Video size={10} className="text-[#bef264]" />
                                        <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Viral_Storyboard</span>
                                    </div>
                                    <span className="text-[8px] text-white/20">{results.scenes.length} Scenes</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {results.scenes.map((scene, i) => (
                                        <div key={i} className="p-2 rounded-lg bg-white/5 border border-white/10 space-y-1 group/scene relative overflow-hidden">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[7px] font-black text-[#bef264]">SCENE_0{i + 1}</span>
                                                <span className="text-[7px] text-white/30">{scene.time}</span>
                                            </div>
                                            <p className="text-[7px] text-white/60 line-clamp-2 leading-tight mb-1">{scene.action}</p>

                                            <button
                                                onClick={() => handlePreviewVideo(i)}
                                                disabled={isGeneratingVideo}
                                                className={`w-full py-1 border rounded-md flex items-center justify-center gap-1 transition-all ${results.scenes[i]?.videoUrl
                                                    ? 'bg-[#bef264]/20 border-[#bef264]/40 text-[#bef264]'
                                                    : 'bg-[#bef264]/10 border-[#bef264]/20 text-[#bef264]/70 hover:bg-[#bef264]/20'
                                                    }`}
                                            >
                                                {results.scenes[i]?.videoUrl ? <CheckCircle2 size={8} /> : <Film size={8} />}
                                                <span className="text-[7px] font-bold uppercase">
                                                    {results.scenes[i]?.videoUrl ? 'Re-Render' : 'Render Sequence'}
                                                </span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ACTION BUTTON */}
                    {status === 'IDLE' && (
                        <button
                            onClick={handleExecute}
                            className="w-full py-3 bg-[#bef264] hover:bg-[#a8d658] text-black rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(190,242,100,0.2)]"
                        >
                            <Play size={12} fill="currentColor" />
                            Materialize Ad Sequence
                        </button>
                    )}

                    {status === 'COMPLETE' && (
                        <div className="space-y-3">
                            {/* VIDEO RENDERING STATUS */}
                            {isGeneratingVideo && (
                                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Loader2 size={10} className="text-purple-400 animate-spin" />
                                        <span className="text-[8px] font-black text-purple-400 uppercase tracking-wider">
                                            {videoTask?.message || videoStatus || 'Rendering...'}
                                        </span>
                                    </div>
                                    {videoTask && (
                                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(videoTask.step / videoTask.total) * 100}%` }}
                                                className="h-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* AD COMPILATION STATUS */}
                            {isCompiling && (
                                <div className="p-2 rounded-xl bg-[#bef264]/10 border border-[#bef264]/20">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Loader2 size={10} className="text-[#bef264] animate-spin" />
                                        <span className="text-[8px] font-black text-[#bef264] uppercase tracking-wider">
                                            {exportTask?.message || 'Compiling Master Ad...'}
                                        </span>
                                    </div>
                                    {exportTask && (
                                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(exportTask.step / exportTask.total) * 100}%` }}
                                                className="h-full bg-[#bef264] shadow-[0_0_8px_rgba(190,242,100,0.6)]"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* FINAL AD PREVIEW (MINI) */}
                            {finalAdUrl && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-3 rounded-xl bg-gradient-to-br from-[#bef264]/20 to-transparent border border-[#bef264]/30"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 size={12} className="text-[#bef264]" />
                                            <span className="text-[8px] font-black text-white uppercase tracking-widest">Master_Ad_Ready</span>
                                        </div>
                                        <a
                                            href={finalAdUrl}
                                            download="final_ugc_commercial.mp4"
                                            className="text-[8px] font-bold text-[#bef264] underline uppercase"
                                        >Download</a>
                                    </div>
                                    <video
                                        src={finalAdUrl}
                                        controls
                                        className="w-full rounded-lg border border-white/10 aspect-video object-cover"
                                    />
                                </motion.div>
                            )}

                            {/* ACTION BUTTONS */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCompileAd}
                                    disabled={isCompiling || results.scenes.filter(s => s.videoUrl).length === 0}
                                    className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${isCompiling || results.scenes.filter(s => s.videoUrl).length === 0
                                        ? 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                                        : 'bg-[#bef264] hover:bg-[#a8d658] text-black shadow-[0_0_15px_rgba(190,242,100,0.3)]'
                                        }`}
                                >
                                    {isCompiling ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
                                    {isCompiling ? 'Compiling...' : 'Master Export'}
                                </button>
                                <button
                                    onClick={handleExportAd}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                                >
                                    <Download size={10} />
                                    MetaData
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* BOTTOM STATUS */}
                <div className="p-2 bg-white/5 flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-[#bef264]" />
                        <span className="text-[7px] text-white/30 font-bold tracking-tighter uppercase">Gemini-2.0-Flash</span>
                    </div>
                </div>
            </div>

            {/* HANDLES */}
            <Handle
                type="target"
                position={Position.Left}
                id="identity-input"
                style={{ top: '40%' }}
                className="!w-3 !h-3 !bg-[#bef264] !border-zinc-950 shadow-[0_0_10px_rgba(190,242,100,0.5)]"
            />
            <Handle
                type="target"
                position={Position.Left}
                id="product-input"
                style={{ top: '60%' }}
                className="!w-3 !h-3 !bg-amber-500 !border-zinc-950 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="!w-2 !h-2 !bg-[#bef264] !border-zinc-950"
            />
        </div>
    );
};

export default UGCEngineNode;
