import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ImagePlus, Zap, Image as ImageIcon, Download, Settings, Upload, X, Map, Users, Smartphone, Package, Palette, FastForward, Maximize2, Layers, Split, Film, ChevronRight, Save, Grid } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import { getApiUrl } from '../../config/apiConfig';
import { useShorts } from '../../hooks/useShorts';
import { SHORTS_COST } from '../../config/shortsConfig';

export const MultiShotView = ({
    activeFrame, frames, setFrames, setActiveFrameId, setMode, selections, setSelections,
    shotSlots, setShotSlots, activeSlotId, setActiveSlotId, runAiUpscale, upscaling, selectedModel
}) => {
    const { token } = useAppStore();
    const { spend } = useShorts();

    const [sceneSettings, setSceneSettings] = useState({
        productImage: null,
        characterRef: null,
        styleRef: null,
    });

    const [subject, setSubject] = useState("");
    const [activePreset, setActivePreset] = useState("cinematic_arc");
    const [isGenerating, setIsGenerating] = useState(false);

    const activeSlot = shotSlots.find(s => s.id === activeSlotId);

    const fileInputRef = useRef(null);
    const [uploadTarget, setUploadTarget] = useState(null);
    const gridImgRef = useRef(null);
    const gridContainerRef = useRef(null);

    // Calculate the actual rendered image bounds inside the object-contain container
    const getRenderedImageBounds = () => {
        const img = gridImgRef.current;
        const container = gridContainerRef.current;
        if (!img || !container) return null;
        const containerW = container.clientWidth;
        const containerH = container.clientHeight;
        const natW = img.naturalWidth;
        const natH = img.naturalHeight;
        if (!natW || !natH) return null;
        const scale = Math.min(containerW / natW, containerH / natH);
        const renderedW = natW * scale;
        const renderedH = natH * scale;
        const offsetX = (containerW - renderedW) / 2;
        const offsetY = (containerH - renderedH) / 2;
        return { offsetX, offsetY, renderedW, renderedH };
    };

    useEffect(() => {
        if (activeFrame?.url) {
            if (!sceneSettings.productImage) {
                setSceneSettings(p => ({ ...p, productImage: activeFrame.url }));
            }
        }
    }, [activeFrame]);

    useEffect(() => {
        if (selections?.referenceImage) {
            if (!sceneSettings.productImage) {
                setSceneSettings(p => ({ ...p, productImage: selections.referenceImage }));
            }
        }
    }, [selections?.referenceImage]);

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
        if (isGenerating) return;

        console.log("[MULTISHOT] Clicked generateMultiShot top handler.");
        console.log("[MULTISHOT] State:", { productImage: sceneSettings.productImage, subject: subject });

        if (!sceneSettings.productImage && !subject) {
            alert("Please provide at least a Hero image or a subject description.");
            return;
        }

        // Set Loading Immediately for Instance Response Time!
        setIsGenerating(true);
        setShotSlots(slots => slots.map(s => ({ ...s, loading: true, url: null })));

        const res = await spend('image_grid_multishot');

        if (!res || !res.success) {
            // Restore loading if spend fails
            setIsGenerating(false);
            setShotSlots(slots => slots.map(s => ({ ...s, loading: false })));
            
            if (res?.reason === 'unauthenticated') {
                useAppStore.getState().setShowingAuthModal(true);
            } else if (res?.reason === 'insufficient_funds' || useAppStore.getState().userShorts <= 0) {
                useAppStore.getState().setActiveTab('pricing');
            } else {
                alert("Multi-Shot generation could not proceed: " + (res?.reason || "error"));
            }
            return;
        }

        try {
            const ANGLE_PRESETS = {
                person: [
                    '1. Extreme close-up of face, dramatic side lighting',
                    '2. Wide shot, golden hour environment',
                    '3. Low angle looking up, urban background',
                    '4. Overhead bird\'s eye view',
                    '5. Medium shot, nature environment',
                    '6. Side profile silhouette against sunset',
                    '7. Dutch angle, neon city night scene',
                    '8. Over-the-shoulder POV shot',
                    '9. Full body wide, minimalist studio'
                ],
                car: [
                    '1. Front 3/4 angle, studio dramatic lighting',
                    '2. Rear 3/4 angle, golden hour road',
                    '3. Side profile, motion blur highway',
                    '4. Low angle front grille, wide lens',
                    '5. Overhead drone shot, mountain road',
                    '6. Interior cockpit driver POV',
                    '7. Wheel close-up, wet road reflection',
                    '8. Rear light close-up, night neon',
                    '9. Full wide, desert landscape epic'
                ],
                product: [
                    '1. Hero shot straight on, white studio',
                    '2. 45 degree angle, soft shadow',
                    '3. Extreme close-up texture detail',
                    '4. Flat lay overhead, lifestyle props',
                    '5. Side profile, gradient background',
                    '6. In-hand lifestyle use shot',
                    '7. Backlit silhouette, dramatic rim light',
                    '8. Macro detail shot, shallow DOF',
                    '9. Full environment lifestyle wide shot'
                ],
                food: [
                    '1. Overhead flat lay, full spread',
                    '2. Side angle 45 degrees, steam rising',
                    '3. Extreme macro, texture close-up',
                    '4. Fork/spoon action shot mid-bite',
                    '5. Full table setting wide shot',
                    '6. Backlit golden hour window light',
                    '7. Cross-section cut-through detail',
                    '8. Hand holding, lifestyle casual',
                    '9. Night mood, candlelight ambiance'
                ],
                fashion: [
                    'FRAME 1: BEAUTY CLOSE-UP — Face fills frame, studio beauty lighting, catch lights in eyes',
                    'FRAME 2: WALKING TOWARDS — Subject walks toward camera, motion blur on feet, sharp face',
                    'FRAME 3: FABRIC MACRO — Extreme close-up on clothing texture/pattern, no face',
                    'FRAME 4: BACK SHOT — Camera behind subject, facing away, environment ahead',
                    'FRAME 5: MIRROR REFLECTION — Subject reflected in mirror, double composition',
                    'FRAME 6: SITTING POSE — Ground level, subject seated, architectural framing',
                    'FRAME 7: HAND/ACCESSORY DETAIL — Extreme close-up on hands, jewelry, bag, shoes only',
                    'FRAME 8: ENVIRONMENTAL WIDE — Subject tiny in massive environment, fashion editorial scale',
                    'FRAME 9: STRAIGHT TO CAMERA — Direct eye contact, medium shot, neutral power pose'
                ],
                thriller: [
                    'FRAME 1: SHADOWED ENTRY — Subject partially hidden in doorway shadow, half face visible',
                    'FRAME 2: OVER SHOULDER STALK — Camera follows from behind, subject unaware',
                    'FRAME 3: REFLECTION IN GLASS — Subject seen through window/mirror distortion',
                    'FRAME 4: LOW ANGLE THREAT — Extreme low angle, subject looms, sky behind',
                    'FRAME 5: EXTREME ISOLATION — Subject tiny in massive empty space, alone',
                    'FRAME 6: CLOSE-UP EYES ONLY — Crop to eyes only, extreme tension, sweat/detail visible',
                    'FRAME 7: HANDS IN ACTION — Close-up on hands doing something, face out of frame',
                    'FRAME 8: DUTCH ANGLE RUN — Tilted camera, subject in motion, urgency',
                    'FRAME 9: FINAL WIDE REVEAL — Pull back wide, full context of situation visible'
                ]
            };

            const detectSubjectType = (text) => {
                if (!text) return 'person';
                const t = text.toLowerCase();
                if (t.match(/fashion|model|runway|editorial|outfit|lookbook/)) return 'fashion';
                if (t.match(/thriller|suspense|dark|noir|mystery|chase|danger/)) return 'thriller';
                if (t.match(/car|vehicle|suv|truck|bike|motorcycle|ferrari|bmw|mercedes/)) return 'car';
                if (t.match(/food|burger|pizza|drink|coffee|cake|dish|meal/)) return 'food';
                if (t.match(/product|bottle|box|bag|shoe|watch|phone|gadget/)) return 'product';
                return 'person';
            };

            const buildMultiShotPrompt = (subjectText, hasRefImage) => {
                if (activePreset === 'cinematic_arc') {
                     return `### [HEADER: THE LAYOUT LOCK]
A high-end 3x3 cinematic contact sheet. 9 distinct borderless photographs in one single composite image. 35mm anamorphic lens style.

### [BODY: THE SUBJECT ANCHOR]
CRITICAL INSTRUCTION: Use the provided reference image as the EXACT IDENTITY for the subject. 
Maintain 100% consistency in facial features, hair, and clothing across all 9 frames. 
Maintain the EXACT SAME environment and background location across all 9 frames from the reference.
The subject from the reference image is now placed into these 9 specific camera setups:

FRAME 1 (Top-Left):    EXTREME CLOSE-UP — Macro lens on face only. Eyes and jewelry fill entire frame. Zero background visible. Heavy bokeh.
FRAME 2 (Top-Center):  WIDE ESTABLISHING — Full courtyard visible, subject small in frame, architecture dominates 80% of image.
FRAME 3 (Top-Right):   MACRO DETAIL — Ultra-tight on saree fabric/jewelry only. No face visible. Pure textile/gold texture fills frame.
FRAME 4 (Mid-Left):    LOW ANGLE HEROIC — Camera at ground level shooting upward. Subject towers above, sky/ceiling behind. Extreme perspective distortion.
FRAME 5 (Mid-Center):  OVERHEAD DRONE — Camera pointing straight down from above. Subject seen from top, floor pattern visible around them.
FRAME 6 (Mid-Right):   MEDIUM SHOT — Waist up only. Diffused ring-light. Saree texture and jewelry detail visible.
FRAME 7 (Bot-Left):    DRAMATIC RIM LIGHT — Near-dark environment, single strong edge light outlining subject from behind, face and front still visible.
FRAME 8 (Bot-Center):  POV FIRST PERSON — Camera IS the subject's eyes looking forward. Hands visible in foreground, environment ahead.
FRAME 9 (Bot-Right):   FULL BODY VERTICAL — Head to toe, straight on, neutral ambient light, full saree visible from top to bottom.

CRITICAL ENFORCEMENT: Each frame MUST look completely different from every other frame.
If Frame 1 is a close-up, Frame 2 MUST NOT be a close-up.
If Frame 2 is wide, Frame 3 MUST NOT be wide.
Maximum visual diversity and dynamic frame-to-frame contrast is mandatory.

### [FOOTER: THE CLEANLINESS RULE]
STRICT NEGATIVE CONSTRAINTS:
- 100% NO TEXT. No labels like "1", "Shot A", "Urban", or "Neon". No captions, no letters, no watermark.
- ABSOLUTELY NO BORDER LINES, NO GRID LINES, NO DIVIDER LINES, AND NO BLACK/WHITE FRAMES DIVIDING THE 9 SHOTS.
- The 9 photographs must sit seamless and edge-to-edge with each other in the 3x3 frame.
- Output ONLY the 9 raw visual photographs seamless in a 3x3 contact layout.`;
                }

                const subjectType = detectSubjectType(subjectText);
                const angles = ANGLE_PRESETS[subjectType].join('\n');

                const header = hasRefImage
                    ? `Take the subject and visual identity from the attached reference image exactly as-is.
Maintain 100% subject consistency across all 9 frames.
Place that exact subject into these 9 completely different scenarios:`
                    : `Subject: ${subjectText || 'the subject'}
Place this subject into these 9 completely different scenarios:`;

                const footer = `
STRICT VISUAL REQUIREMENT: Generate exactly 9 distinct borderless cinematic photographs
in a single 3x3 composite grid. Each frame MUST show a dramatically different camera angle,
environment, and lighting. Maximum visual diversity across all 9 panels.

CRITICAL: NO TEXT, NO LABELS, NO CAPTIONS, NO LETTERS anywhere on any frame.
Output only raw visual photographs.`;

                return `${header}\n${angles}\n${footer}`;
            };

            const payload = {
                prompt: buildMultiShotPrompt(
                    subject, 
                    !!sceneSettings.productImage || !!sceneSettings.characterRef
                ),
                model: selectedModel || 'nano-banana-2',
                aspect_ratio: '16:9',
                image: sceneSettings.productImage || sceneSettings.characterRef || null,
                identity_images: [
                    sceneSettings.characterRef, 
                    sceneSettings.productImage
                ].filter(Boolean),
                references: [sceneSettings.styleRef].filter(Boolean),
                quality: '2k'
            };

            const response = await fetch(getApiUrl('/api/generate-image'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || errData.error || "Multi-Shot generation failed");
            }
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

    // Recompute overlay position on image load and window resize
    const [overlayStyle, setOverlayStyle] = useState({});
    const updateOverlay = () => {
        const bounds = getRenderedImageBounds();
        if (bounds) {
            setOverlayStyle({
                position: 'absolute',
                left: `${bounds.offsetX}px`,
                top: `${bounds.offsetY}px`,
                width: `${bounds.renderedW}px`,
                height: `${bounds.renderedH}px`,
            });
        }
    };
    useEffect(() => {
        window.addEventListener('resize', updateOverlay);
        return () => window.removeEventListener('resize', updateOverlay);
    }, []);


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

            <div className="w-full lg:w-[28%] min-w-[280px] flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1">
                <div className="surface-glass rounded-2xl p-4 flex flex-col gap-4 border border-white/5 flex-1">
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
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Grid Template</label>
                        <select value={activePreset} onChange={e => setActivePreset(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none">
                            <option value="cinematic_arc">Cinematic Arc (Default)</option>
                            <option value="dynamic">Dynamic (Auto-detect)</option>
                            <option value="fashion">Fashion Editorial</option>
                            <option value="thriller">Cinematic Thriller</option>
                            <option value="car">Car Showcase</option>
                            <option value="food">Food Photography</option>
                            <option value="product">Product Shots</option>
                            <option value="person">Standard Portrait</option>
                        </select>
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

                    {/* Spacer to push button to bottom */}
                    <div className="flex-1" />

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
                            <div ref={gridContainerRef} className="relative w-full h-full flex items-center justify-center">
                                <img
                                    src={activeSlot.url}
                                    ref={activeSlot.isGrid ? gridImgRef : null}
                                    className="w-full h-full object-contain bg-black/40"
                                    crossOrigin="anonymous"
                                    onLoad={updateOverlay}
                                />
                                {activeSlot.isGrid && overlayStyle.width && (
                                    <div style={overlayStyle} className="z-10">
                                        <div className="w-full h-full grid grid-cols-3 grid-rows-3" style={{ pointerEvents: 'auto' }}>
                                            {[...Array(9)].map((_, i) => (
                                                <div key={i} onClick={() => handleCellClick(Math.floor(i / 3), i % 3)}
                                                    className="cursor-pointer border border-white/5 transition-all flex items-center justify-center group/cell hover:bg-white/[0.15] active:bg-[#D4FF00]/20">
                                                    <span className="text-[8px] font-black text-[#D4FF00]/60 md:text-white/0 md:group-hover/cell:text-[#D4FF00]/80 uppercase tracking-widest px-1 py-0.5 rounded group-hover/cell:scale-110 transition-transform">
                                                        {i + 1}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="absolute right-4 top-4 flex flex-col gap-2 z-20">
                                {!activeSlot.isGrid && (
                                    <>
                                        <button onClick={() => runAiUpscale(activeSlot.url, activeSlot.prompt || '', '2k')} disabled={upscaling} className={cn("p-3 bg-fuchsia-600/90 hover:bg-fuchsia-600 rounded-xl text-white shadow-xl group flex items-center gap-2 transition-all", upscaling && "opacity-50 cursor-not-allowed")}>
                                            <Zap className={cn("w-4 h-4 md:w-5 md:h-5", upscaling && "animate-pulse")} />
                                            <span className="text-[10px] font-black uppercase md:w-0 overflow-hidden md:group-hover:w-auto transition-all whitespace-nowrap">{upscaling ? 'Upscaling...' : 'Upscale 2K'}</span>
                                        </button>
                                        <button onClick={() => sendToVideo(activeSlot)} className="p-3 bg-[#D4FF00]/90 hover:bg-[#D4FF00] rounded-xl text-black shadow-xl group flex items-center gap-2 transition-all">
                                            <Film className="w-4 h-4 md:w-5 md:h-5" />
                                            <span className="text-[10px] font-black uppercase md:w-0 overflow-hidden md:group-hover:w-auto transition-all whitespace-nowrap">Send to Video</span>
                                        </button>
                                    </>
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

                <div className="h-32 md:h-40 shrink-0 surface-glass rounded-2xl border border-white/5 p-2 md:p-3 flex flex-col">
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
                                                <>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        runAiUpscale(slot.url, slot.prompt, '2k');
                                                    }}
                                                    className="p-2 bg-[#D4FF00] rounded-lg text-black hover:scale-110 transition-transform shadow-lg"
                                                    title="Upscale to 2K"
                                                >
                                                    <Sparkles className="w-4 h-4" />
                                                </button>
                                                    <button onClick={(e) => { e.stopPropagation(); downloadImage(slot.url); }} className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg text-white hover:scale-110 transition-transform shadow-lg" title="Download Image"><Download className="w-4 h-4" /></button>
                                                </>
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
