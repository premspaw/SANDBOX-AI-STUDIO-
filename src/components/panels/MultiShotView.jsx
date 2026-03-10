import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ImagePlus, Zap, Image as ImageIcon, Download, Settings, Upload, X, Map, Users, Smartphone, Package, Palette, FastForward, Maximize2, Layers, Split, Film, ChevronRight, Save, Grid } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import { getApiUrl } from '../../config/apiConfig';
import { useShorts } from '../../hooks/useShorts';
import { SHORTS_COST } from '../../config/shortsConfig';

export const MultiShotView = ({
    activeFrame, frames, setFrames, setActiveFrameId, setMode, setSelections,
    shotSlots, setShotSlots, activeSlotId, setActiveSlotId, runAiUpscale, upscaling
}) => {
    const { token } = useAppStore();
    const { spend } = useShorts();

    const [sceneSettings, setSceneSettings] = useState({
        productImage: null,
        characterRef: null,
        styleRef: null,
    });

    const [subject, setSubject] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    const activeSlot = shotSlots.find(s => s.id === activeSlotId);

    const fileInputRef = useRef(null);
    const [uploadTarget, setUploadTarget] = useState(null);
    const gridImgRef = useRef(null);

    useEffect(() => {
        if (activeFrame?.url) {
            if (!sceneSettings.productImage) {
                setSceneSettings(p => ({ ...p, productImage: activeFrame.url }));
            }
        }
    }, [activeFrame]);

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
        };
        reader.readAsDataURL(file);
    };

    const generateMultiShot = async () => {
        if (!sceneSettings.productImage && !subject) {
            alert("Please provide at least a Hero image or a subject description.");
            return;
        }

        const res = await spend('image_grid_multishot');
        if (!res || (!res.success && res.reason !== 'unauthenticated')) {
            alert("Not enough shorts or " + (res?.reason || "error"));
            return;
        }

        setIsGenerating(true);
        setShotSlots(slots => slots.map(s => ({ ...s, loading: true, url: null })));

        try {
            let promptText = `A single composite image containing exactly 9 distinct cinematic photographs of the same subject from 9 different camera angles, arranged in a flawless 3x3 layout. High-end production value, dramatic lighting, full color.\n\n`;

            if (sceneSettings.productImage || sceneSettings.characterRef) {
                promptText += `Take the subject and visual identity from the attached reference image exactly as-is. Maintain 100% subject consistency across all 9 frames.\n\nPlace that exact subject into these diverse angles: ${subject}\n\n`;
            } else {
                promptText += `Subject: ${subject}\n\n`;
            }

            promptText += `STRICT VISUAL REQUIREMENT: Generate 9 distinct borderless frames within the single picture. Each frame must be a different camera angle (Close-up, Wide, Low-angle, Profile, etc.) of the EXACT SAME SUBJECT. Photorealistic quality.\nEXTREMELY IMPORTANT NEGATIVE CONSTRAINTS: DO NOT generate any text, letters, camera angles, shot types, abbreviations, labels, or captions. DO NOT write words like C.U., L.S., or any scene descriptions inside the image. Just output the pure cinematic photographs.`;

            const payload = {
                prompt: promptText,
                model: 'nano-banana-2',
                aspect_ratio: '16:9',
                product_image: sceneSettings.productImage,
                identity_images: [sceneSettings.characterRef].filter(Boolean),
                references: [sceneSettings.styleRef].filter(Boolean)
            };

            const response = await fetch(getApiUrl('/api/generate-image'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Multi-Shot generation failed");
            const result = await response.json();

            setShotSlots([{
                id: 'slot-1',
                prompt: `Multi-Angle Grid: ${subject}`,
                loading: false,
                url: result.url || null,
                isGrid: true
            }]);

            if (result.url) {
                const newFrame = {
                    id: `ms-frame-${Date.now()}`,
                    url: result.url,
                    type: 'multishot',
                    model: 'nano-banana-2',
                    loading: false,
                    prompt: `Multi-Angle 3x3 Grid: ${subject}`
                };
                setFrames(prev => [...prev, newFrame]);
            }

        } catch (error) {
            console.error("Multi-Shot generation error:", error);
            alert("Failed to generate Multi-Shot grid.");
            setShotSlots(slots => slots.map(s => ({ ...s, loading: false })));
        } finally {
            setIsGenerating(false);
        }
    };

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

        const newSlot = {
            id: `ms-angle-${Date.now()}`,
            prompt: `Angle ${shotNumber} extracted from grid`,
            loading: false,
            url: croppedUrl,
            isGrid: false
        };

        setShotSlots(prev => [...prev, newSlot]);
        setActiveSlotId(newSlot.id);

        setFrames(prev => [...prev, {
            id: `ms-frame-crop-${Date.now()}`,
            url: croppedUrl,
            type: 'image',
            model: 'multishot-crop',
            loading: false,
            prompt: `Extracted Angle ${shotNumber}`
        }]);
    };

    const sendToVideo = (slot) => {
        if (!slot.url) return;
        setSelections(p => ({
            ...p,
            firstFrame: slot.url,
            subject: subject
        }));
        setMode('video');
    };

    const downloadImage = (url) => {
        if (!url) return;
        const link = document.createElement('a');
        link.href = url;
        link.download = `multishot-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex-1 flex flex-col lg:flex-row gap-2 h-full overflow-hidden">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />

            <div className="w-full lg:w-1/3 min-w-[300px] flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1">
                <div className="surface-glass rounded-2xl p-4 flex flex-col gap-4 border border-white/5">
                    <h3 className="text-xs font-black text-white uppercase flex items-center gap-2">
                        <Grid className="w-4 h-4 text-[#D4FF00]" />
                        Multi-Angle Setup
                    </h3>

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
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Subject Description</label>
                        <textarea
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            placeholder="Describe the subject for multi-angle generation..."
                            className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white resize-none focus:border-[#D4FF00]/50 outline-none"
                        />
                    </div>

                    <button
                        onClick={generateMultiShot}
                        disabled={isGenerating}
                        className={cn("w-full py-4 rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-wider shadow-2xl transition-all",
                            isGenerating ? "bg-white/10 text-white/50 cursor-not-allowed" : "bg-[#D4FF00] hover:bg-white text-black")}
                    >
                        {isGenerating ? <Zap className="w-4 h-4 animate-pulse" /> : <Grid className="w-4 h-4" />}
                        {isGenerating ? 'Drafting 9-Angle Grid...' : 'Draft 3x3 Multi-Angle Grid'}
                    </button>
                    {(SHORTS_COST.image_grid_multishot || 2) > 0 && (
                        <div className="text-center text-[9px] font-bold text-white/30 uppercase mt-[-8px]">
                            Costs {SHORTS_COST.image_grid_multishot || 2} Shorts
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-2 min-h-0">
                <div className="flex-[2] surface-glass rounded-2xl border flex flex-col overflow-hidden relative"
                    style={{ borderColor: activeSlot?.url ? '#D4FF00' : 'rgba(255,255,255,0.05)' }}>

                    <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                        <span className="text-[10px] font-black text-[#D4FF00] uppercase tracking-wider">
                            {activeSlot?.isGrid ? '3x3 Master Grid' : `Angle ${shotSlots.indexOf(activeSlot)}`}
                        </span>
                    </div>

                    {activeSlot?.url ? (
                        <>
                            <div className="relative w-full h-full flex items-center justify-center">
                                <img src={activeSlot.url} ref={activeSlot.isGrid ? gridImgRef : null} className="w-full h-full object-contain bg-black/40" crossOrigin="anonymous" />
                                {activeSlot.isGrid && (
                                    <div className="absolute inset-0 flex items-center justify-center z-10">
                                        <div className="w-full h-full grid grid-cols-3 grid-rows-3" style={{ pointerEvents: 'auto' }}>
                                            {[...Array(9)].map((_, i) => (
                                                <div key={i} onClick={() => handleCellClick(Math.floor(i / 3), i % 3)}
                                                    className="cursor-pointer border border-white/5 transition-all flex items-center justify-center group/cell hover:bg-white/[0.15]"
                                                    onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.15)'}
                                                    onMouseLeave={e => e.target.style.background = 'transparent'}>
                                                    <span className="text-[8px] font-black text-white/0 group-hover/cell:text-[#D4FF00]/80 uppercase tracking-widest px-2 py-1 rounded group-hover/cell:scale-110 transition-transform">
                                                        Extract Angle {i + 1}
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
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 opacity-20">
                            {activeSlot?.loading ? (
                                <>
                                    <Sparkles className="w-10 h-10 text-[#D4FF00] animate-spin" />
                                    <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Drafting Multi-Angles...</p>
                                </>
                            ) : (
                                <>
                                    <Grid className="w-10 h-10 text-white" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Awaiting Generation</p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="h-40 shrink-0 surface-glass rounded-2xl border border-white/5 p-3 flex flex-col">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Angle Collection</span>
                    </div>

                    <div className="flex-1 flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                        {shotSlots.map((slot, idx) => (
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
                                    <span className="text-[8px] font-black text-[#D4FF00]">A{idx + 1}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
