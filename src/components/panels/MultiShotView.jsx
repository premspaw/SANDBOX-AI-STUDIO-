import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ImagePlus, Zap, Image as ImageIcon, Download, Settings, Upload, X, Map, Users, Smartphone, Package, Palette, FastForward, Maximize2, Layers, Split, Film, ChevronRight, Save, Grid, RefreshCw, Play, Flag, Square } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import { getApiUrl } from '../../config/apiConfig';
import { useShorts } from '../../hooks/useShorts';
import { SHORTS_COST } from '../../config/shortsConfig';

let savedScrollPosition = 0;

const ANGLE_PRESETS = {
    person: [
        "Extreme close-up macro of face and eyes",
        "Full body wide shot from low angle",
        "High angle bird's eye view",
        "Side profile 90 degree view",
        "Medium shot waist up with soft bokeh",
        "Close-up of hands and accessories",
        "Back view full body",
        "Dramatic rim lighting silhouette",
        "Upper body portrait with direct gaze"
    ],
    product: [
        "Macro close-up of product logo and texture",
        "High angle flat-lay arrangement",
        "Hero shot from 45 degree angle",
        "Bottom-up heroic view",
        "Side profile clean studio shot",
        "Lifestyle action shot with product in use",
        "Top-down 90 degree view",
        "Deep depth of field focus stacking",
        "Floating/levitating product shot"
    ],
    car: [
        "Macro detail of headlight/badge",
        "Low wide-angle front 3/4 view",
        "Aerial top-down view",
        "Interior dashboard/steering detail",
        "Direct side profile shot",
        "Dynamic motion blur tracking shot",
        "Rear 3/4 angle showing taillights",
        "Wheel and tire close-up",
        "Ground-level dramatic front view"
    ],
    fashion: [
        "Headshot with editorial lighting",
        "Full body walking stride",
        "Detail of jewelry/fabric texture",
        "Low angle dynamic pose",
        "Overhead artistic perspective",
        "Candid-style street photography",
        "Back profile showing garment flow",
        "Seated dramatic pose",
        "Three-quarter length portrait"
    ],
    food: [
        "Macro close-up of ingredient texture",
        "Top-down flat lay table setting",
        "The 'hero' bite/fork-pull shot",
        "45-degree rustic platter view",
        "Action shot (pouring/sprinkling)",
        "Side profile cross-section",
        "Atmospheric dim lighting mood shot",
        "Bright airy overhead view",
        "Close-up of garnish detail"
    ],
    thriller: [
        "Chiaroscuro high-contrast face",
        "Extreme high angle looking down",
        "Slightly tilted Dutch angle wide",
        "Submerged/water reflection shot",
        "Silhouette in a dark doorway",
        "Prying POV through a gap",
        "Harsh flickering light profile",
        "Long shot through fog/smoke",
        "Over-the-shoulder stalking view"
    ]
};

const CINEMATIC_ARC_DESC = [
    "[FRAME 1: THE PORTRAIT] Extreme close-up. Face and eyes only. Macro lens. Heavy bokeh.",
    "[FRAME 2: THE WIDE] Long shot. Full environment scale. Subject is small. Epic architecture.",
    "[FRAME 3: THE TEXTURE] Macro detail. Extreme tight on clothing/fabric/saree only.",
    "[FRAME 4: THE LOW ANGLE] Ground level looking up. Heroic, powerful perspective.",
    "[FRAME 5: THE DRONE] Bird's eye view. Looking straight down from above.",
    "[FRAME 6: THE MEDIUM] Waist up. Soft side lighting. 50mm lens aesthetics.",
    "[FRAME 7: THE SILHOUETTE] Dramatic rim lighting. Near-dark atmosphere.",
    "[FRAME 8: THE POV] Action first-person view. Subject's hands visible in foreground.",
    "[FRAME 9: THE FULL SHOT] Head to toe. Frontal vertical composition."
];

const detectSubjectType = (text = "") => {
    const t = (text || "").toLowerCase();
    if (t.includes('car') || t.includes('vehicle') || t.includes('automotive')) return 'car';
    if (t.includes('product') || t.includes('bottle') || t.includes('watch')) return 'product';
    if (t.includes('food') || t.includes('dish') || t.includes('plate') || t.includes('drink')) return 'food';
    if (t.includes('fashion') || t.includes('model') || t.includes('outfit') || t.includes('clothes')) return 'fashion';
    if (t.includes('thriller') || t.includes('dark') || t.includes('mystery') || t.includes('noir')) return 'thriller';
    return 'person'; // default
};

export const MultiShotView = ({
    activeFrame, frames, setFrames, setActiveFrameId, setMode, selections, setSelections,
    shotSlots, setShotSlots, activeSlotId, setActiveSlotId, runAiUpscale, upscaling, selectedModel,
    refBoard = { characters: [], locations: [], wardrobes: [], props: [], moods: [] }
}) => {
    const { token } = useAppStore();
    const { spend } = useShorts();

    const [sceneSettings, setSceneSettings] = useState({
        productImage: null,
        characterRef: null,
        styleRef: null,
    });

    const [subject, setSubject] = useState(selections?.subject || "");
    const [activePreset, setActivePreset] = useState(selections?.activePreset || "cinematic_arc");
    const [isGenerating, setIsGenerating] = useState(false);

    const handleSubjectChange = (val) => {
        setSubject(val);
        setSelections(prev => ({ ...prev, subject: val }));
    };

    const handlePresetChange = (val) => {
        setActivePreset(val);
        setSelections(prev => ({ ...prev, activePreset: val }));
    };

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

    const scrollContainerRef = useRef(null);

    // Restore scroll position on mount
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = savedScrollPosition;
        }
    }, []);

    // Save scroll position on update
    const handleScroll = (e) => {
        savedScrollPosition = e.target.scrollLeft;
    };

    // Sync HERO/Product reference with global selections
    useEffect(() => {
        if (selections?.referenceImage) {
            setSceneSettings(p => ({ ...p, productImage: selections.referenceImage }));
        }
    }, [selections?.referenceImage]);

    // Sync Character/Style references with global selections or refBoard
    useEffect(() => {
        // From selections (direct slot overrides)
        if (selections?.characterRef) setSceneSettings(p => ({ ...p, characterRef: selections.characterRef }));
        if (selections?.styleRef) setSceneSettings(p => ({ ...p, styleRef: selections.styleRef }));

        // Auto-pick from Ref Board if local slots are empty
        if (!sceneSettings.characterRef && refBoard.characters?.length > 0) {
            setSceneSettings(p => ({ ...p, characterRef: refBoard.characters[0].imageUrl }));
        }
        if (!sceneSettings.styleRef && refBoard.moods?.length > 0) {
            setSceneSettings(p => ({ ...p, styleRef: refBoard.moods[0].imageUrl }));
        }
    }, [selections?.characterRef, selections?.styleRef, refBoard.characters, refBoard.moods]);

    // Initialize from active frame ONLY once on mount
    useEffect(() => {
        if (
            activeFrame?.url &&
            !sceneSettings.productImage &&
            activeFrame.type !== 'multishot' &&
            activeFrame.type !== 'storyboard'
        ) {
            setSceneSettings(p => ({ ...p, productImage: activeFrame.url }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

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

    const pollJobForUrl = async (jobId) => {
        const maxAttempts = 30; // ~60 seconds total polling time
        console.log(`[MULTISHOT_POLL] Starting poll for jobId: ${jobId}`);
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(r => setTimeout(r, 2000));
            try {
                let res;
                try {
                    res = await fetch(getApiUrl(`/api/job-status/${jobId}`));
                } catch (fetchErr) {
                    console.warn(`[MULTISHOT_POLL] Network/Fetch failed (Attempt ${i+1}/${maxAttempts}):`, fetchErr.message);
                    continue; 
                }

                if (!res.ok) {
                    console.warn(`[MULTISHOT_POLL] Server responded with ${res.status} (Attempt ${i+1}/${maxAttempts})`);
                    continue; 
                }

                const data = await res.json();
                const state = data.status || data.state;
                
                if (state === 'completed' && data.url) {
                    console.log(`[MULTISHOT_POLL] Job ${jobId} completed successfully.`);
                    return data.url;
                }
                
                if (state === 'failed') {
                    console.error(`[MULTISHOT_POLL] Job ${jobId} failed on server:`, data.error);
                    throw new Error(data.error || 'Generation failed in queue');
                }
                
                if (i % 5 === 0) {
                    console.log(`[MULTISHOT_POLL] Job ${jobId} still ${state}... (${i+1}/${maxAttempts})`);
                }
            } catch (e) {
                if (e.message.includes('failed in queue')) throw e;
                console.warn(`[MULTISHOT_POLL] Polling error (Attempt ${i+1}/${maxAttempts}):`, e.message);
            }
        }
        throw new Error('Multi-Angle generation timed out after 60 seconds. Please try again or check server logs.');
    };

    const handleDeleteSlot = (id, e) => {
        e.stopPropagation();
        const prevSlots = [...shotSlots];
        setShotSlots(slots => slots.filter(s => s.id !== id));
        if (activeSlotId === id) {
            const remaining = prevSlots.filter(s => s.id !== id);
            setActiveSlotId(remaining.length > 0 ? remaining[0].id : null);
        }
    };

    const generateMultiShot = async () => {
        if (isGenerating) return;

        console.log("[MULTISHOT] Clicked generateMultiShot top handler.");
        console.log("[MULTISHOT] State:", { productImage: sceneSettings.productImage, subject: subject });

        if (!sceneSettings.productImage && !subject) {
            alert("Please provide at least a Hero image or a subject description.");
            return;
        }

        // Set Loading Immediately for Instant UI Feedback
        setIsGenerating(true);
        const newSlots = [
            { id: 'master-grid', loading: true, url: null, isGrid: true },
            ...shotSlots.filter(s => !s.isGrid && s.id !== 'master-grid')
        ];
        setShotSlots(newSlots);
        setActiveSlotId('master-grid'); // ⚡ SELECT the drafting grid immediately so it shows up

        const res = await spend('image_grid_multishot');

        if (!res || !res.success) {
            // Restore loading if spend fails
            setIsGenerating(false);
            setShotSlots(slots => slots.filter(s => s.url || s.loading === true && s.id !== 'master-grid')); // Remove the failed master-grid
            
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
            const buildMultiShotPrompt = (subjectText, hasRefImage) => {
                if (activePreset === 'cinematic_arc') {
                     return `### 9-FRAME CINEMATIC GRID DIRECTIVE
Create a tight 3x3 contact sheet of 9 high-end cinematic photographs. In a single composite, no borders. 

### THE SUBJECT: ${subjectText || 'The subject from reference'}
- IDENTITY: Match the EXACT facial features, clothing, and textures from the provided reference.
- LOCATION: Maintain the environmental context from the reference across all frames.

### THE 9 UNIQUE CAMERA SETUPS (RADICAL DIVERSITY REQUIRED):
[FRAME 1: THE PORTRAIT] Extreme close-up. Face and eyes only. Macro lens. Heavy bokeh.
[FRAME 2: THE WIDE] Long shot. Full environment scale. Subject is small. Epic architecture.
[FRAME 3: THE TEXTURE] Macro detail. Extreme tight on clothing/fabric/saree only. No face.
[FRAME 4: THE LOW ANGLE] Ground level looking up. Heroic, powerful perspective. Sky behind.
[FRAME 5: THE DRONE] Bird's eye view. Looking straight down from above. Overhead pattern.
[FRAME 6: THE MEDIUM] Waist up. Soft side lighting. 50mm lens aesthetics.
[FRAME 7: THE SILHOUETTE] Dramatic rim lighting. Near-dark atmosphere. Strong edge light.
[FRAME 8: THE POV] Action first-person view. Subject's hands visible in foreground.
[FRAME 9: THE FULL SHOT] Head to toe. Frontal vertical composition. Full outfit visible.

### MANDATORY VARIATION RULE:
Each frame must be a SHOCKING contrast from its neighbors. Never repeat a focal length. Never repeat a camera height. The environment lighting must shift according to the specific frame directive (e.g. near-dark for Frame 7). No text, labels, or grid lines.`;
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

            // IMPORTANT: Always use an image model, never the active video model.
            const IMAGE_MODEL = 'nano-banana-2';

            const payload = {
                prompt: buildMultiShotPrompt(
                    subject, 
                    !!sceneSettings.productImage || !!sceneSettings.characterRef
                ),
                model: IMAGE_MODEL,
                aspect_ratio: '16:9',
                image: sceneSettings.productImage || sceneSettings.characterRef || null,
                identity_images: [
                    sceneSettings.characterRef, 
                    sceneSettings.productImage,
                    ...(refBoard.characters || []).map(c => c.imageUrl)
                ].filter(Boolean).slice(0, 14),
                references: [
                    sceneSettings.styleRef,
                    ...(refBoard.moods || []).map(m => m.imageUrl)
                ].filter(Boolean).slice(0, 5),
                quality: '1k', // 1k works for nano-banana-2; avoids pro-model size check
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
            const rawResult = await response.json();

            // Handle async job queue response (when Redis/BullMQ is active on the server)
            let result;
            if (rawResult.jobId) {
                console.log(`[MULTISHOT] Server returned jobId: ${rawResult.jobId}. Polling...`);
                const url = await pollJobForUrl(rawResult.jobId);
                result = { url };
            } else {
                result = rawResult;
            }

            if (!result.url) {
                throw new Error('Server returned no image URL and no jobId.');
            }

            setShotSlots(prev => [
                {
                    id: 'master-grid',
                    prompt: `Multi-Angle Grid: ${subject}`,
                    loading: false,
                    url: result.url || null,
                    isGrid: true
                },
                ...prev.filter(s => !s.isGrid && s.id !== 'master-grid')
            ]);
            setActiveSlotId('master-grid');

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
            setShotSlots(slots => slots.filter(s => s.url || s.loading === true)); // Cleanup any lingering empty slots
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
        
        // Slightly inset the crop to avoid black border artifacts (approx 1% of cell)
        const insetX = cellW * 0.01;
        const insetY = cellH * 0.01;
        const targetW = cellW - (insetX * 2);
        const targetH = cellH - (insetY * 2);

        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, (col * cellW) + insetX, (row * cellH) + insetY, targetW, targetH, 0, 0, targetW, targetH);

        const croppedUrl = canvas.toDataURL('image/jpeg', 0.9);
        const shotNumber = (row * 3) + col + 1;
        const type = detectSubjectType(subject);
        const angleDesc = activePreset === 'cinematic_arc' 
            ? CINEMATIC_ARC_DESC[shotNumber - 1] 
            : ANGLE_PRESETS[type][shotNumber - 1];

        const newSlot = {
            id: `ms-angle-${Date.now()}`,
            prompt: subject ? `${subject}. Perspective: ${angleDesc}` : `${angleDesc} extracted from grid`,
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
        if (activeSlot?.url) {
            // Give a tiny timeout to ensure ref is attached if newly rendered
            const timer = setTimeout(updateOverlay, 100);
            return () => clearTimeout(timer);
        }
    }, [activeSlotId, activeSlot?.url]);

    useEffect(() => {
        window.addEventListener('resize', updateOverlay);
        return () => window.removeEventListener('resize', updateOverlay);
    }, []);


    const sendToVideo = (slot, type = 'first') => {
        if (!slot.url) return;
        setSelections(p => ({
            ...p,
            [type === 'first' ? 'firstFrame' : 'lastFrame']: slot.url,
            subject: subject
        }));
        setMode('video');
    };

    const downloadImage = (url) => {
        if (!url) return;
        window.open(url, '_blank');
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
                        <select value={activePreset} onChange={e => handlePresetChange(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none">
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
                            onChange={e => handleSubjectChange(e.target.value)}
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
                                        <button 
                                            onClick={() => runAiUpscale(activeSlot.url, activeSlot.prompt || '', 'multishot')} 
                                            disabled={upscaling || activeSlot.loading} 
                                            className={cn("p-3 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl text-white shadow-xl group flex items-center justify-center gap-2 transition-all", (upscaling || activeSlot.loading) && "opacity-50 cursor-not-allowed")}
                                        >
                                            <Sparkles className={cn("w-4 h-4 md:w-5 md:h-5", (upscaling || activeSlot.loading) && "animate-pulse")} />
                                            <span className="text-[10px] font-black uppercase md:w-0 overflow-hidden md:group-hover:w-auto transition-all whitespace-nowrap">{(upscaling || activeSlot.loading) ? 'Upscaling...' : 'Upscale 2K (2 Credits)'}</span>
                                        </button>
                                        <button onClick={() => sendToVideo(activeSlot, 'first')} className="p-3 bg-cyan-500 hover:bg-cyan-400 rounded-xl text-white shadow-xl group flex items-center justify-center gap-2 transition-all">
                                            <Play className="w-4 h-4 md:w-5 md:h-5" />
                                            <span className="text-[10px] font-black uppercase md:w-0 overflow-hidden md:group-hover:w-auto transition-all whitespace-nowrap">Start Frame</span>
                                        </button>
                                        <button onClick={() => sendToVideo(activeSlot, 'last')} className="p-3 bg-orange-500 hover:bg-orange-400 rounded-xl text-white shadow-xl group flex items-center justify-center gap-2 transition-all">
                                            <Square className="w-4 h-4 md:w-5 md:h-5" />
                                            <span className="text-[10px] font-black uppercase md:w-0 overflow-hidden md:group-hover:w-auto transition-all whitespace-nowrap">End Frame</span>
                                        </button>
                                    </>
                                )}
                                <button onClick={() => downloadImage(activeSlot.url)} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white transition-all">
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                            {activeSlot?.loading ? (
                                <>
                                    <div className="relative">
                                        <Sparkles className="w-12 h-12 text-[#D4FF00] animate-spin" />
                                        <Zap className="w-5 h-5 text-fuchsia-500 absolute -top-1 -right-1 animate-bounce" />
                                    </div>
                                    <p className="text-sm font-black uppercase tracking-[0.3em] text-[#D4FF00] animate-pulse">
                                        {activeSlot?.jobType === 'upscale' ? 'Enhancing to 2K...' : 'Drafting Multi-Angles...'}
                                    </p>
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

                    <div 
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 flex gap-2 overflow-x-auto custom-scrollbar pb-1"
                    >
                        {shotSlots.map((slot, idx) => (
                            <div key={slot.id}
                                onClick={() => setActiveSlotId(slot.id)}
                                className={cn("shrink-0 h-full aspect-video rounded-xl overflow-hidden cursor-pointer relative border-2 transition-all group",
                                    activeSlotId === slot.id ? "border-[#D4FF00] shadow-[0_0_15px_rgba(212,255,0,0.15)]" : "border-white/5 hover:border-white/20")}>
                                {slot.loading ? (
                                    <div className="w-full h-full bg-black/60 flex flex-col items-center justify-center gap-2">
                                        <div className="relative">
                                            <Sparkles className="w-5 h-5 text-fuchsia-400 animate-pulse" />
                                            <Zap className="w-3 h-3 text-[#D4FF00] absolute -top-1 -right-1 animate-bounce" />
                                        </div>
                                        <span className="text-[7px] font-black text-[#D4FF00] uppercase tracking-[0.2em] animate-pulse">
                                            {slot.jobType === 'upscale' ? 'Upscaling...' : 'Drafting...'}
                                        </span>
                                    </div>
                                ) : slot.url ? (
                                    <>
                                        <img src={slot.thumb || slot.url} className="w-full h-full object-cover" />
                                        

                                        {/* Corner Delete Button */}
                                        <button 
                                            onClick={(e) => handleDeleteSlot(slot.id, e)}
                                            className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-500 backdrop-blur-md rounded text-white opacity-0 group-hover:opacity-100 hover:scale-110 transition-all shadow-lg z-10"
                                            title="Remove Frame"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="w-full h-full bg-black/40 flex flex-col items-center justify-center gap-1 opacity-50">
                                        <span className="text-lg font-black text-white/20">{idx + 1}</span>
                                        {/* Corner Delete Button for empty slots */}
                                        <button 
                                            onClick={(e) => handleDeleteSlot(slot.id, e)}
                                            className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-500 backdrop-blur-md rounded text-white opacity-0 group-hover:opacity-100 hover:scale-110 transition-all shadow-lg z-10"
                                            title="Remove Empty Slot"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-black/80 px-2 py-1 flex items-center justify-between backdrop-blur-sm">
                                    <span className="text-[8px] font-black text-[#D4FF00]">{slot.isGrid ? 'GRID' : `A${shotSlots.filter(s => !s.isGrid).indexOf(slot) + 1}`}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
