import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Camera, Sun, MapPin, Aperture,
    User, Image as ImageIcon, Wand2, Ratio,
    Film, X, ChevronRight, Zap, Settings2, Sliders, Layers, CheckCircle2,
    Monitor, Sparkles, Loader2, Save, LayoutGrid, Scissors, PersonStanding,
    Armchair, Move, Sword, Lock, Check, Trash2, Clapperboard,
    Maximize, Terminal, Music, Volume2, Mic2
} from "lucide-react";
import { useAppStore } from "../store";
import { generateCharacterImage, analyzeIdentity, generateDynamicAngles } from "../../geminiService";
import { saveStoryboardItem } from "../supabaseService";
import { HUD_CONFIG } from "../hudConfig";
import { useWebSocket } from "../hooks/useWebSocket";

// --- DATA CONSTANTS ---

const POSE_LIBRARY = [
    { id: 'stand_01', label: 'HERO STAND', icon: User, category: 'Static' },
    { id: 'sit_02', label: 'CAFE SIT', icon: Armchair, category: 'Sitting' },
    { id: 'run_03', label: 'SPRINT', icon: Move, category: 'Action' },
    { id: 'fight_04', label: 'COMBAT', icon: Sword, category: 'Action' },
    { id: 'cinematic_01', label: 'WALK AWAY', icon: PersonStanding, category: 'Cinematic' },
    { id: 'cinematic_02', label: 'OVER SHOULDER', icon: PersonStanding, category: 'Cinematic' },
];

// --- SUB-COMPONENTS ---

function HUDSection({ title, icon: Icon, children }) {
    return (
        <div className="space-y-3">
            <h3 className="text-white/40 text-[10px] font-mono tracking-[0.3em] flex items-center gap-2 uppercase italic font-bold">
                <Icon size={12} className="text-[#bef264]" /> {title}
            </h3>
            {children}
        </div>
    );
}

function ControlSelect({ label, icon: Icon, value, options, onChange }) {
    return (
        <div className="relative group">
            <span className="absolute -top-2 left-2 bg-[#050505] px-1 text-[8px] text-white/20 font-mono z-10 group-hover:text-[#bef264] transition-colors uppercase font-bold">
                {label}
            </span>
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-white transition-colors">
                    <Icon size={14} />
                </div>
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-9 pr-2 text-[10px] text-white font-mono uppercase appearance-none focus:outline-none focus:border-[#bef264]/50 cursor-pointer hover:bg-white/10 transition-colors"
                >
                    {options.map((opt) => (
                        <option key={opt} value={opt} className="bg-[#0a0a0a] text-gray-300">
                            {opt}
                        </option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] text-white/20 group-hover:text-[#bef264]">
                    ▼
                </div>
            </div>
        </div>
    );
}

// --- MAIN DIRECTOR HUD ---

export default function DirectorHUD() {
    const store = useAppStore();
    const [activeTab, setActiveTab] = useState('VISUAL');
    const [selectedPoseId, setSelectedPoseId] = useState(null);
    const [narrativeArc, setNarrativeArc] = useState('');
    const wardrobeRef = useRef(null);
    const poseRef = useRef(null);
    const [ugcNiche, setUgcNiche] = useState('lifestyle');
    const [ugcHookStyle, setUgcHookStyle] = useState('PATTERN_INTERRUPT');
    const { isConnected, tasks } = useWebSocket();

    if (!store.activeCharacter) return null;

    const updateCamera = (key, value) =>
        store.setState(s => ({ ...s, camera: { ...s.camera, [key]: value } }));

    const handleUpload = (type) => (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'wardrobe') store.setWardrobeImage(reader.result);
                else {
                    store.setPoseImage(reader.result);
                    setSelectedPoseId(null);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleStoryboardArc = async () => {
        if (!narrativeArc) return;
        await store.generateStoryboard(narrativeArc);
        setNarrativeArc('');
    };

    const handleMaterialize = async () => {
        const { activeCharacter, actionScript, camera, wardrobeImage, poseImage, anchorImage } = store;
        if (!activeCharacter) return;

        store.setState((s) => ({ ...s, isRendering: true }));
        const tempId = store.addNode('', `Compiling_State...`, true);

        try {
            const references = [anchorImage || '', wardrobeImage || '', poseImage || ''].filter(Boolean);
            const prompt = `SUBJECT: ${activeCharacter.name}. STYLE: ${activeCharacter.visualStyle}. ACTION: ${actionScript || 'Cinematic Portrait'}. OPTICS: ${camera.lens}. PHOTOMETRY: ${camera.lighting}. Highly detailed character photography. ${selectedPoseId ? `Pose Context: ${selectedPoseId}` : ''}`;

            // Update last generated prompt for UI visibility
            store.setState(s => ({ ...s, lastGeneratedPrompt: prompt }));

            const result = await generateCharacterImage(
                prompt,
                references,
                camera.ratio,
                camera.resolution
            );

            if (result) {
                store.updateNodeData(tempId, {
                    image: result,
                    isOptimistic: false,
                    label: actionScript || 'Scene_Output',
                    resolution: camera.resolution
                });
                saveStoryboardItem(activeCharacter.id, result, store.nodes.length);
                store.syncCurrentSession();
            } else {
                store.deleteNode(tempId);
            }
        } catch (err) {
            console.error("Materialize failed:", err);
            store.deleteNode(tempId);
        } finally {
            store.setState((s) => ({ ...s, isRendering: false }));
        }
    };

    const handleMatrixRender = async () => {
        const { activeCharacter, anchorImage, wardrobeImage, actionScript, camera } = store;
        if (!activeCharacter || !anchorImage) return;

        store.setMode('ORBIT');
        store.setState((s) => ({ ...s, isRendering: true }));

        let centerNodeId = store.activeNodeId;

        try {
            if (!centerNodeId || !store.nodes.find(n => n.id === centerNodeId)) {
                centerNodeId = store.addNode(anchorImage, "DIRECTOR_ANALYSIS...", true, { x: 500, y: 500 });
            }

            const dynamicAngles = await generateDynamicAngles(anchorImage, activeCharacter.name);

            const analysisSummary = dynamicAngles.map((a) => `> ${a.label}`).join('\n');
            store.updateNodeData(centerNodeId, {
                label: "DIRECTOR_BRAIN",
                isOptimistic: false,
                analysisData: `DIRECTORIAL_STRATEGY:\n${analysisSummary}\n\nORIGIN_LOCK: ${activeCharacter.origin}`
            });

            const angles = [0, 60, 120, 180, 240, 300];
            const ghostNodeIds = [];
            const center = store.nodes.find(n => n.id === centerNodeId)?.position || { x: 500, y: 500 };
            const radius = 450;

            dynamicAngles.forEach((angleConfig, i) => {
                if (i >= 6) return;
                const angle = angles[i];
                const x = center.x + radius * Math.cos(angle * (Math.PI / 180));
                const y = center.y + radius * Math.sin(angle * (Math.PI / 180));

                const id = store.addNode('', `RENDER_${angleConfig.label}`, true, { x, y });
                ghostNodeIds.push(id);

                if (centerNodeId) {
                    store.setState(s => ({
                        ...s,
                        edges: [...s.edges, { id: `edge-${id}`, source: centerNodeId, target: id, animated: true, style: { stroke: '#bef264', opacity: 0.15 } }]
                    }));
                }
            });

            const renderTasks = ghostNodeIds.map(async (id, i) => {
                const config = dynamicAngles[i];

                const prompt = `
          TASK: ${config.label}.
          DIRECTOR_NOTE: ${config.prompt}
          
          SUBJECT IDENTITY: ${activeCharacter.name}.
          STYLE: ${activeCharacter.visualStyle}
          
          CONTEXT_LOCK:
          - Location: ${activeCharacter.origin} (STRICT LOCATION CONSISTENCY)
          - Action: ${actionScript || 'Natural interaction with environment'}
          - Lighting: ${camera.lighting}
        `;

                const result = await generateCharacterImage(
                    prompt,
                    [anchorImage || '', wardrobeImage || ''].filter(Boolean),
                    '1:1',
                    camera.resolution
                );

                if (result) {
                    store.updateNodeData(id, { image: result, isOptimistic: false, label: config.label, resolution: camera.resolution });
                    saveStoryboardItem(activeCharacter.id, result, store.nodes.length + i);
                } else {
                    store.deleteNode(id);
                }
            });

            await Promise.all(renderTasks);
            store.syncCurrentSession();

        } catch (err) {
            console.error("Matrix render failed:", err);
        } finally {
            store.setState((s) => ({ ...s, isRendering: false }));
        }
    };

    return (
        <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            className="fixed right-0 top-0 h-screen w-[380px] bg-[#050505]/95 backdrop-blur-3xl border-l border-white/10 shadow-[-50px_0_100px_rgba(0,0,0,0.8)] z-50 flex flex-col overflow-hidden"
        >

            <div className="flex items-center justify-between p-6 border-b border-white/5">
                <div>
                    <h2 className="text-white font-black tracking-[0.3em] text-[11px] flex items-center gap-2 italic uppercase font-bold">
                        <Film className="text-[#bef264]" size={16} />
                        DIRECTOR_CORE_V3
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#bef264] animate-pulse" />
                        <p className="text-white/20 text-[9px] font-mono uppercase tracking-widest font-bold">NEURAL_LINK_ESTABLISHED</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        if (window.confirm("PURGE SESSION: This will clear local working memory and return to Forge mode. Character data synced to Supabase will remain safe in The Vault.")) {
                            store.purgeVault();
                        }
                    }}
                    className="p-2 bg-red-500/5 border border-red-500/20 rounded-lg cursor-pointer hover:bg-red-500 hover:text-white transition-all group"
                    title="PURGE SESSION"
                >
                    <Trash2 size={16} className="text-red-500 group-hover:text-white" />
                </button>
            </div>

            <div className="flex bg-black/40 border-b border-white/5">
                {['VISUAL', 'STORYBOARD', 'UGC', 'QUEUE'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-4 text-[9px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === tab ? (tab === 'QUEUE' ? 'border-cyan-400 text-cyan-400' : tab === 'UGC' ? 'border-orange-400 text-orange-400' : 'border-[#bef264] text-[#bef264]') : 'border-transparent text-white/20 hover:text-white'}`}
                    >
                        {tab === 'VISUAL' ? 'Visual' : tab === 'STORYBOARD' ? 'Story' : tab === 'UGC' ? 'UGC' : `Queue (${Object.keys(tasks).length})`}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-7 space-y-10 custom-scrollbar">

                {activeTab === 'VISUAL' && (
                    <>
                        <HUDSection title="01 // IDENTITY_ANCHOR" icon={User}>
                            <div className="group relative bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 transition-all">
                                <div className="relative shrink-0">
                                    <img src={store.anchorImage || store.activeCharacter.image} className="w-14 h-14 rounded-xl object-cover border border-[#bef264]/30 grayscale group-hover:grayscale-0 transition-all duration-700" />
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#bef264] rounded-full flex items-center justify-center border-2 border-black">
                                        <CheckCircle2 size={10} className="text-black" />
                                    </div>
                                </div>
                                <div className="overflow-hidden">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-white/80 truncate italic">{store.activeCharacter.name}</h4>
                                    <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest mt-0.5">{store.activeCharacter.visualStyle} ARCHETYPE</p>
                                </div>
                            </div>
                        </HUDSection>

                        <HUDSection title="02 // ASSET_ANCHORS" icon={Layers}>
                            <div className="grid grid-cols-2 gap-3">
                                <div
                                    onClick={() => wardrobeRef.current?.click()}
                                    className={`h-24 bg-white/5 border border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-white/10 group ${store.wardrobeImage ? 'border-[#bef264] bg-[#bef264]/5' : 'border-white/10'}`}
                                >
                                    {store.wardrobeImage ? (
                                        <img src={store.wardrobeImage} className="w-full h-full object-cover rounded-2xl p-1" />
                                    ) : (
                                        <>
                                            <ImageIcon size={18} className="text-white/20 group-hover:text-[#bef264] transition-colors" />
                                            <span className="text-[8px] font-black uppercase tracking-widest text-white/20">WARDROBE</span>
                                        </>
                                    )}
                                    <input type="file" ref={wardrobeRef} className="hidden" onChange={handleUpload('wardrobe')} />
                                </div>
                                <div
                                    onClick={() => poseRef.current?.click()}
                                    className={`h-24 bg-white/5 border border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-white/10 group ${store.poseImage ? 'border-cyan-400 bg-cyan-400/5' : 'border-white/10'}`}
                                >
                                    {store.poseImage ? (
                                        <img src={store.poseImage} className="w-full h-full object-cover rounded-2xl p-1" />
                                    ) : (
                                        <>
                                            <PersonStanding size={18} className="text-white/20 group-hover:text-cyan-400 transition-colors" />
                                            <span className="text-[8px] font-black uppercase tracking-widest text-white/20">POSE_LOCK</span>
                                        </>
                                    )}
                                    <input type="file" ref={poseRef} className="hidden" onChange={handleUpload('pose')} />
                                </div>
                            </div>
                        </HUDSection>

                        <HUDSection title="03 // POSE_LIBRARY" icon={PersonStanding}>
                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                                {POSE_LIBRARY.map((pose) => (
                                    <button
                                        key={pose.id}
                                        onClick={() => {
                                            setSelectedPoseId(prev => prev === pose.id ? null : pose.id);
                                            if (store.poseImage) store.setPoseImage(null);
                                        }}
                                        className={`shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl border transition-all ${selectedPoseId === pose.id ? 'bg-[#bef264]/20 border-[#bef264] text-[#bef264]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                                    >
                                        <pose.icon size={16} />
                                        <span className="text-[6px] font-black uppercase tracking-tighter mt-1 text-center leading-tight">{pose.label}</span>
                                    </button>
                                ))}
                            </div>
                        </HUDSection>

                        <HUDSection title="04 // ACTION_MANIFEST" icon={Sliders}>
                            <div className="relative">
                                <textarea
                                    value={store.actionScript}
                                    onChange={(e) => store.setState((s) => ({ ...s, actionScript: e.target.value }))}
                                    placeholder="Describe the cinematic moment..."
                                    className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-5 text-xs text-white/80 focus:border-[#bef264]/50 outline-none resize-none font-medium placeholder:text-white/10 transition-all shadow-inner"
                                />
                                <button className="absolute bottom-4 right-4 text-[9px] bg-white/10 hover:bg-[#bef264] hover:text-black text-white px-3 py-1.5 rounded-full flex items-center gap-2 transition-all font-black uppercase tracking-widest shadow-xl">
                                    <Sparkles size={12} /> ENHANCE
                                </button>
                            </div>
                        </HUDSection>

                        <HUDSection title="05 // NEURAL_OPTICS" icon={Camera}>
                            <div className="grid grid-cols-2 gap-4">
                                <ControlSelect label="LENS" icon={Aperture} value={store.camera.lens} options={HUD_CONFIG.lenses} onChange={(v) => updateCamera('lens', v)} />
                                <ControlSelect label="LIGHT" icon={Sun} value={store.camera.lighting} options={HUD_CONFIG.lighting} onChange={(v) => updateCamera('lighting', v)} />
                                <ControlSelect label="ANGLE" icon={MapPin} value={store.camera.angle} options={HUD_CONFIG.angles} onChange={(v) => updateCamera('angle', v)} />
                                <ControlSelect label="RATIO" icon={Ratio} value={store.camera.ratio} options={HUD_CONFIG.ratios} onChange={(v) => updateCamera('ratio', v)} />
                                <ControlSelect label="RES" icon={Maximize} value={store.camera.resolution} options={HUD_CONFIG.resolutions} onChange={(v) => updateCamera('resolution', v)} />
                            </div>
                        </HUDSection>

                        {store.lastGeneratedPrompt && (
                            <HUDSection title="06 // NEURAL_PROMPT_PREVIEW" icon={Terminal}>
                                <div className="bg-[#bef264]/5 border border-[#bef264]/20 rounded-2xl p-4 font-mono">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1 h-1 rounded-full bg-[#bef264] animate-pulse" />
                                        <span className="text-[7px] text-[#bef264]/60 uppercase tracking-widest font-black">ACTIVE_GEN_PROMPT</span>
                                    </div>
                                    <p className="text-[8px] text-[#bef264] leading-relaxed break-words opacity-80 italic">
                                        {store.lastGeneratedPrompt}
                                    </p>
                                </div>
                            </HUDSection>
                        )}
                    </>
                )}

                {activeTab === 'STORYBOARD' && (
                    <div className="space-y-8">
                        <HUDSection title="NARRATIVE_ARC_SEQUENCER" icon={Clapperboard}>
                            <textarea
                                value={narrativeArc}
                                onChange={(e) => setNarrativeArc(e.target.value)}
                                placeholder="Example: Character enters a neon bar, orders a synthetic drink, looks at the door waiting for someone..."
                                className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl p-5 text-xs text-white/80 focus:border-[#bef264]/50 outline-none resize-none font-medium placeholder:text-white/10 transition-all shadow-inner"
                            />
                            <button
                                onClick={handleStoryboardArc}
                                disabled={store.isRendering || !narrativeArc}
                                className="w-full py-4 bg-[#bef264] text-black font-black uppercase text-[10px] tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                {store.isRendering ? <Loader2 size={16} className="animate-spin" /> : <Clapperboard size={16} />}
                                GENERATE_STORYBOARD_ARC
                            </button>
                        </HUDSection>

                        <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                            <p className="text-[8px] text-white/20 font-bold uppercase tracking-widest italic">Note: Sequential generation decomposes narrative into 4 cinematic beats.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'UGC' && (
                    <div className="space-y-8">
                        <HUDSection title="UGC_VIRAL_PIPELINE" icon={Film}>
                            <p className="text-[9px] text-white/30 italic mb-4">Spawn a UGC Pipeline node on the canvas. Configure hook style, niche, and execute the full pipeline (Hook → Avatar → Caption).</p>

                            <div className="space-y-3">
                                <ControlSelect label="HOOK TYPE" icon={Zap} value={ugcHookStyle} options={['PATTERN_INTERRUPT', 'QUESTION', 'SHOCKING_STAT', 'STORY_OPENER']} onChange={setUgcHookStyle} />
                                <ControlSelect label="NICHE" icon={User} value={ugcNiche} options={['lifestyle', 'tech', 'fitness', 'fashion', 'food', 'travel', 'finance', 'comedy']} onChange={setUgcNiche} />
                            </div>

                            <button
                                onClick={() => {
                                    const nodeId = store.addUGCPipelineNode({ x: 300, y: 200 });
                                    store.updateNodeData(nodeId, { hookStyle: ugcHookStyle, niche: ugcNiche, characterName: store.activeCharacter?.name });
                                }}
                                className="w-full py-4 mt-4 bg-gradient-to-r from-orange-600/30 to-amber-600/30 hover:from-orange-600/50 hover:to-amber-600/50 border border-orange-500/30 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <Zap size={16} /> SPAWN_UGC_PIPELINE
                            </button>
                        </HUDSection>
                    </div>
                )}

                {activeTab === 'QUEUE' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                            <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">{isConnected ? 'WS_CONNECTED' : 'WS_DISCONNECTED'}</span>
                        </div>

                        {Object.keys(tasks).length === 0 ? (
                            <div className="text-center py-16">
                                <div className="text-white/10 text-[40px] mb-4">⚡</div>
                                <p className="text-[10px] text-white/20 font-mono uppercase tracking-widest">No active generation tasks</p>
                                <p className="text-[8px] text-white/10 font-mono mt-1">Tasks will appear here in real-time</p>
                            </div>
                        ) : (
                            Object.entries(tasks).map(([taskId, task]) => (
                                <div key={taskId} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">{taskId}</span>
                                        <span className="text-[8px] text-white/30 font-mono">{task.step}/{task.total}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-cyan-400 to-[#bef264] rounded-full transition-all duration-500"
                                            style={{ width: `${(task.step / task.total) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-[8px] text-white/40 font-mono italic">{task.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                )}

            </div>

            <div className="p-7 border-t border-white/5 bg-[#050505] space-y-4">
                {activeTab === 'VISUAL' && (
                    <>
                        {/* Node Spawn Strip */}
                        <div className="flex gap-2 flex-wrap">
                            {[
                                { label: 'CAM', icon: Camera, fn: () => store.addCameraNode() },
                                { label: 'LIGHT', icon: Sun, fn: () => store.addLightingNode() },
                                { label: 'MUSIC', icon: Music, fn: () => store.addMusicNode() },
                                { label: 'SFX', icon: Volume2, fn: () => store.addSFXNode() },
                                { label: 'VOICE', icon: Mic2, fn: () => store.addDialogueNode() },
                            ].map(btn => (
                                <button
                                    key={btn.label}
                                    onClick={btn.fn}
                                    className="flex-1 py-2 bg-white/5 border border-white/10 rounded-xl text-[8px] font-black text-white/40 uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-white/10 hover:text-white/80 transition-all active:scale-95"
                                >
                                    <btn.icon size={11} /> {btn.label}
                                </button>
                            ))}
                        </div>

                        {/* UGC Studio Nodes */}
                        <div className="flex gap-2 flex-wrap">
                            {[
                                { label: 'OUTFIT', icon: Sparkles, fn: () => store.addWardrobeNode() },
                                { label: 'PRODUCT', icon: Camera, fn: () => store.addProductNode() },
                                { label: 'STORY', icon: Clapperboard, fn: () => store.addAutoStoryboardNode() },
                                { label: 'VEO I2V', icon: Zap, fn: () => store.addVeoI2VNode() },
                            ].map(btn => (
                                <button
                                    key={btn.label}
                                    onClick={btn.fn}
                                    className="flex-1 py-2 bg-violet-500/5 border border-violet-500/10 rounded-xl text-[8px] font-black text-violet-400/60 uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-violet-500/15 hover:text-violet-300 transition-all active:scale-95"
                                >
                                    <btn.icon size={11} /> {btn.label}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleMatrixRender}
                            disabled={store.isRendering}
                            className="w-full py-4 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 hover:bg-cyan-400 hover:text-black transition-all group relative overflow-hidden active:scale-95 disabled:opacity-30"
                        >
                            <div className="absolute inset-0 bg-cyan-400/10 -translate-x-full group-hover:translate-x-full transition-transform duration-[1.5s]" />
                            <LayoutGrid size={16} /> Matrix_Render (Smart Director)
                        </button>

                        <div className="flex gap-3">
                            <button
                                onClick={() => store.setRepairSession({ active: true })}
                                className="flex-1 py-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all active:scale-95"
                            >
                                <Scissors size={14} /> Surgery
                            </button>
                            <button
                                onClick={() => store.syncCurrentSession()}
                                disabled={store.isSyncing}
                                className="flex-1 py-4 bg-white/5 border border-white/10 text-white/40 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-white/10 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                            >
                                {store.isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                {store.isSyncing ? 'SYNCING...' : 'SYNC_STATE'}
                            </button>
                        </div>

                        <button
                            onClick={handleMaterialize}
                            disabled={store.isRendering}
                            className="w-full group relative py-5 bg-[#bef264] text-black font-black uppercase text-[11px] tracking-[0.3em] rounded-[2.5rem] shadow-2xl shadow-[#bef264]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {store.isRendering ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                            MATERIALIZE_CONSTRUCT
                        </button>
                    </>
                )}
            </div>
        </motion.div>
    );
}
