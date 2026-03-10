import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ImagePlus, Zap, Image as ImageIcon, Download, Settings, Upload, X, Map, Users, Smartphone, Package, Palette, FastForward, Maximize2, Layers, Split, Film, ChevronRight, Save } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import { getApiUrl } from '../../config/apiConfig';
// Use your existing shorts hook & config
import { useShorts } from '../../hooks/useShorts';
import { SHORTS_COST } from '../../config/shortsConfig';

export const StoryboardView = ({
    activeFrame, frames, setFrames, setActiveFrameId, setMode, setSelections,
    storyboardSlots, setStoryboardSlots, activeSlotId, setActiveSlotId, runAiUpscale, upscaling
}) => {
    // ─────────────────────────────────────────────
    // STATE
    // ─────────────────────────────────────────────
    const { token, updateShortsRaw, userProfile } = useAppStore();
    const { spend } = useShorts();

    // The user's uploaded/selected images for the scene
    const [sceneSettings, setSceneSettings] = useState({
        productImage: null,
        characterRef: null,
        styleRef: null,
    });

    const [sceneBrief, setSceneBrief] = useState("");
    const [shotTimings, setShotTimings] = useState("1.0, 1.5, 0.5, 2.0");

    const [isGenerating, setIsGenerating] = useState(false);

    // Active slot for preview/editing
    const activeSlot = storyboardSlots.find(s => s.id === activeSlotId);

    const fileInputRef = useRef(null);
    const [uploadTarget, setUploadTarget] = useState(null);

    // ─────────────────────────────────────────────
    // AUTO-FILL FROM EXISTING SELECTIONS (Optional)
    // ─────────────────────────────────────────────
    // If the user already generated an image/video, carry it over as a product or char ref
    useEffect(() => {
        if (activeFrame?.url) {
            // Suggest the active frame as a product/char ref if empty
            if (!sceneSettings.productImage) {
                setSceneSettings(p => ({ ...p, productImage: activeFrame.url }));
            }
        }
    }, [activeFrame]);


    // ─────────────────────────────────────────────
    // HANDLERS
    // ─────────────────────────────────────────────
    const triggerUpload = (target) => {
        setUploadTarget(target);
        fileInputRef.current?.click();
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file || !uploadTarget) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setSceneSettings(p => ({ ...p, [uploadTarget]: reader.result }));
            // Optional: Also auto-add to the main Pinboard/RefBoard if you want cross-persistence
        };
        reader.readAsDataURL(file);
    };

    const generateStoryboard = async () => {
        if (!sceneSettings.productImage && !sceneBrief) {
            alert("Please provide at least a Hero/Product image or a brief description.");
            return;
        }

        // Cost check BEFORE generation
        const res = await spend('storyboard_gen');
        if (!res || (!res.success && res.reason !== 'unauthenticated')) {
            alert("Not enough shorts or " + (res?.reason || "error"));
            return;
        } else if (res && !res.success && res.reason === 'unauthenticated') {
            console.warn("Generating in unauthenticated local mode without deducting Shorts.");
        }

        setIsGenerating(true);

        // Set all slots to loading
        setStoryboardSlots(slots => slots.map(s => ({ ...s, loading: true, url: null })));

        try {
            // NOTE: In a real app, you'd send `sceneSettings` and `sceneBrief` to your backend
            // which would return 4 (or N) distinct images and prompts.
            // For now, we simulate calling the standard image generator 4 times (or using a dedicated SB endpoint).

            // Generate a 3x3 grid using the multishot prompt technique
            let promptText = `A single composite image containing exactly 9 distinct cinematic photographs arranged in a flawless 3x3 layout. High-end production value, dramatic lighting, full color.\n\n`;
            if (sceneSettings.productImage || sceneSettings.characterRef) {
                promptText += `Take the subject and visual identity from the attached reference image exactly as-is.\n\nPlace that exact subject into this scene: ${sceneBrief}\n\n`;
            } else {
                promptText += `Scene Brief: ${sceneBrief}\n\n`;
            }
            promptText += `STRICT VISUAL REQUIREMENT: Generate 9 distinct borderless frames within the single picture. Show scene progression. Photorealistic quality.\nEXTREMELY IMPORTANT NEGATIVE CONSTRAINTS: DO NOT generate any text, letters, camera angles, shot types, abbreviations, labels, or captions. DO NOT write words like C.U., L.S., or any scene descriptions inside the image. Just output the pure cinematic photographs.`;

            const payload = {
                prompt: promptText,
                model: 'nano-banana-2',
                aspect_ratio: '16:9',
                product_image: sceneSettings.productImage,
                identity_images: [sceneSettings.characterRef].filter(Boolean),
                references: [sceneSettings.styleRef].filter(Boolean)
            };

            const res = await fetch(getApiUrl('/api/generate-image'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Storyboard generation failed");
            const result = await res.json();

            // We only need one slot now representing the grid, but we keep the structure flexible
            // For now, we'll store the grid in the first slot and clear the others
            setStoryboardSlots([{
                id: 'slot-1',
                time: 0,
                duration: 'All Shots',
                prompt: `Auto-generated 3x3 storyboard grid`,
                loading: false,
                url: result.url || null,
                error: result.error,
                isGrid: true
            }]);

            // Also add these to the main film roll so they don't disappear
            if (result.url) {
                const newFrame = {
                    id: `sb-frame-${Date.now()}`,
                    url: result.url,
                    type: 'multishot',
                    model: 'storyboard',
                    loading: false,
                    prompt: `Storyboard 3x3 Grid`
                };
                setFrames(prev => [...prev, newFrame]);
            }

        } catch (error) {
            console.error("Storyboard generation error:", error);
            alert("Failed to generate storyboard. Check console.");
            setStoryboardSlots(slots => slots.map(s => ({ ...s, loading: false })));
        } finally {
            setIsGenerating(false);
        }
    };


    const sendToVideo = (slot) => {
        if (!slot.url) return;
        // Populate standard video settings
        setSelections(p => ({
            ...p,
            firstFrame: slot.url,
            subject: slot.prompt || sceneBrief
        }));
        // Switch tab
        setMode('video');
    };


    // ─────────────────────────────────────────────
    // GRID INTERACTION LOGIC
    // ─────────────────────────────────────────────
    const gridImgRef = React.useRef(null);

    const handleCellClick = (row, col) => {
        const img = gridImgRef.current;
        if (!img) return;
        const cellW = img.naturalWidth / 3;
        const cellH = img.naturalHeight / 3;
        const canvas = document.createElement('canvas');
        canvas.width = cellW;
        canvas.height = cellH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, col * cellW, row * cellH, cellW, cellH, 0, 0, cellW, cellH);

        const croppedUrl = canvas.toDataURL('image/jpeg', 0.9);
        const shotNumber = (row * 3) + col + 1;

        // Add the extracted shot to the timeline and main film roll
        const newSlot = {
            id: `sb-shot-${Date.now()}`,
            time: 0,
            duration: '1.0s',
            prompt: `Shot ${shotNumber} from grid`,
            loading: false,
            url: croppedUrl,
            error: false,
            isGrid: false
        };

        setStoryboardSlots(prev => [...prev, newSlot]);
        setActiveSlotId(newSlot.id);

        setFrames(prev => [...prev, {
            id: `sb-frame-crop-${Date.now()}`,
            url: croppedUrl,
            type: 'image',
            model: 'storyboard',
            loading: false,
            prompt: `Storyboard Shot ${shotNumber}`
        }]);
    };

    // ─────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────
    return (
        <div className="flex-1 flex flex-col lg:flex-row gap-2 h-full overflow-hidden">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />

            {/* ── LEFT COLUMN: Setup & Brief ── */}
            <div className="w-full lg:w-1/3 min-w-[300px] flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1">

                <div className="surface-glass rounded-2xl p-4 flex flex-col gap-4 border border-white/5">
                    <h3 className="text-xs font-black text-white uppercase flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#D4FF00]" />
                        Concept & Refs
                    </h3>

                    {/* Reference Slots */}
                    <div className="grid grid-cols-3 gap-1.5">
                        {[
                            { id: 'productImage', label: 'HERO', icon: Package },
                            { id: 'characterRef', label: 'CHAR', icon: Users },
                            { id: 'styleRef', label: 'STYLE', icon: Palette },
                        ].map(ref => (
                            <div key={ref.id} className="relative group aspect-square rounded-lg overflow-hidden border border-dashed border-white/10 hover:border-white/30 transition-all cursor-pointer bg-black/40">
                                {sceneSettings[ref.id] ? (
                                    <>
                                        <img src={sceneSettings[ref.id]} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button onClick={() => triggerUpload(ref.id)} className="p-1.5 bg-white/20 hover:bg-white/40 rounded-md"><Upload className="w-3 h-3 text-white" /></button>
                                            <button onClick={() => setSceneSettings(p => ({ ...p, [ref.id]: null }))} className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-md"><X className="w-3 h-3 text-white" /></button>
                                        </div>
                                    </>
                                ) : (
                                    <div onClick={() => triggerUpload(ref.id)} className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                        <ref.icon className="w-4 h-4" />
                                        <span className="text-[8px] font-bold uppercase tracking-widest">{ref.label}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Scene Brief / Script</label>
                        <textarea
                            value={sceneBrief}
                            onChange={e => setSceneBrief(e.target.value)}
                            placeholder="Describe the overall narrative or paste a script snippet..."
                            className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white resize-none focus:border-[#D4FF00]/50 outline-none"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Shot Timings (Seconds)</label>
                        <input
                            type="text"
                            value={shotTimings}
                            onChange={e => setShotTimings(e.target.value)}
                            placeholder="e.g. 1.0, 1.5, 2.0"
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none"
                        />
                    </div>

                    <button
                        onClick={generateStoryboard}
                        disabled={isGenerating}
                        className={cn("w-full py-4 rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-wider shadow-2xl transition-all",
                            isGenerating ? "bg-white/10 text-white/50 cursor-not-allowed" : "bg-[#D4FF00] hover:bg-white text-black")}
                    >
                        {isGenerating ? <Zap className="w-4 h-4 animate-pulse" /> : <Split className="w-4 h-4" />}
                        {isGenerating ? 'Drafting 9-Shot Grid...' : 'Draft 3x3 Storyboard Grid'}
                    </button>
                    {(SHORTS_COST.image_grid_multishot || 2) > 0 && (
                        <div className="text-center text-[9px] font-bold text-white/30 uppercase mt-[-8px]">
                            Costs {SHORTS_COST.image_grid_multishot || 2} Shorts
                        </div>
                    )}
                </div>
            </div>


            {/* ── RIGHT COLUMN: Spline / Preview Area ── */}
            <div className="flex-1 flex flex-col gap-2 min-h-0">

                {/* Active View / Main Editing */}
                <div className="flex-[2] surface-glass rounded-2xl border flex flex-col overflow-hidden relative"
                    style={{ borderColor: activeSlot?.url ? '#D4FF00' : 'rgba(255,255,255,0.05)' }}>

                    <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                        <span className="text-[10px] font-black text-[#D4FF00] uppercase tracking-wider">
                            {activeSlot?.isGrid ? '3x3 Master Grid' : `Shot ${storyboardSlots.indexOf(activeSlot)}`}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-[9px] text-white/50">{activeSlot?.duration || '1.0s'}</span>
                    </div>

                    {activeSlot?.url ? (
                        <>
                            <div className="relative w-full h-full flex items-center justify-center">
                                <img src={activeSlot.url} ref={activeSlot.isGrid ? gridImgRef : null} className="w-full h-full object-contain bg-black/40" crossOrigin="anonymous" />

                                {/* 3x3 Overlay for Master Grid Selection */}
                                {activeSlot.isGrid && (
                                    <div className="absolute inset-0 flex items-center justify-center z-10">
                                        <div className="w-full h-full grid grid-cols-3 grid-rows-3" style={{ pointerEvents: 'auto' }}>
                                            {[...Array(9)].map((_, i) => (
                                                <div key={i} onClick={() => handleCellClick(Math.floor(i / 3), i % 3)}
                                                    className="cursor-pointer border border-white/5 transition-all flex items-center justify-center group/cell hover:bg-white/[0.15]"
                                                    onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.15)'}
                                                    onMouseLeave={e => e.target.style.background = 'transparent'}>
                                                    <span className="text-[8px] font-black text-white/0 group-hover/cell:text-[#D4FF00]/80 uppercase tracking-widest px-2 py-1 rounded group-hover/cell:scale-110 transition-transform">
                                                        Extract Shot {i + 1}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="absolute right-4 top-4 flex flex-col gap-2 z-20">
                                {!activeSlot.isGrid && (
                                    <button onClick={() => sendToVideo(activeSlot)} className="p-3 bg-[#D4FF00]/90 hover:bg-[#D4FF00] rounded-xl text-black shadow-xl group flex items-center gap-2 transition-all">
                                        <Film className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase w-0 overflow-hidden group-hover:w-auto transition-all whitespace-nowrap">Send to Video</span>
                                    </button>
                                )}
                                <button onClick={() => downloadImage(activeSlot.url)} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white transition-all">
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Prompt overlay */}
                            {!activeSlot.isGrid && (
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 pt-12 z-20 pointer-events-none">
                                    <input
                                        value={activeSlot.prompt}
                                        style={{ pointerEvents: 'auto' }}
                                        onChange={(e) => {
                                            setStoryboardSlots(slots => slots.map(s => s.id === activeSlotId ? { ...s, prompt: e.target.value } : s));
                                        }}
                                        className="w-full bg-transparent text-white text-sm border-b border-white/10 pb-1 focus:border-[#D4FF00] outline-none placeholder:text-white/20 transition-colors"
                                        placeholder="Enter specific prompt for this shot..."
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 opacity-20">
                            {activeSlot?.loading ? (
                                <>
                                    <Sparkles className="w-10 h-10 text-[#D4FF00] animate-spin" />
                                    <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Drafting 3x3 Grid...</p>
                                </>
                            ) : (
                                <>
                                    <Split className="w-10 h-10 text-white" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Awaiting Generation</p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Timeline / Slidertray */}
                <div className="h-40 shrink-0 surface-glass rounded-2xl border border-white/5 p-3 flex flex-col">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Timeline Sequence</span>
                        <div className="flex gap-1">
                            <button className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-md text-[8px] font-bold text-white uppercase">+ Add Shot</button>
                        </div>
                    </div>

                    <div className="flex-1 flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                        {storyboardSlots.map((slot, idx) => (
                            <div key={slot.id}
                                onClick={() => setActiveSlotId(slot.id)}
                                className={cn("shrink-0 h-full aspect-video rounded-xl overflow-hidden cursor-pointer relative border-2 transition-all group",
                                    activeSlotId === slot.id ? "border-[#D4FF00] shadow-[0_0_15px_rgba(212,255,0,0.15)]" : "border-white/5 hover:border-white/20")}>
                                {slot.loading ? (
                                    <div className="w-full h-full bg-black/40 flex items-center justify-center">
                                        <Zap className="w-4 h-4 text-[#D4FF00] animate-pulse" />
                                    </div>
                                ) : slot.url ? (
                                    <>
                                        <img src={slot.url} className="w-full h-full object-cover" />

                                        {/* Hover Actions */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            {!slot.isGrid && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        runAiUpscale(slot.url, slot.prompt);
                                                    }}
                                                    className="p-2 bg-[#D4FF00] rounded-lg text-black hover:scale-110 transition-transform shadow-lg"
                                                    title="Upscale to 4K"
                                                >
                                                    <Sparkles className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full bg-black/40 flex flex-col items-center justify-center gap-1 opacity-50">
                                        <span className="text-lg font-black text-white/20">{idx + 1}</span>
                                    </div>
                                )}

                                <div className="absolute inset-x-0 bottom-0 bg-black/80 px-2 py-1 flex items-center justify-between backdrop-blur-sm">
                                    <span className="text-[8px] font-black text-[#D4FF00]">S{idx + 1}</span>
                                    <span className="text-[8px] font-bold text-white/60">{slot.duration}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};
