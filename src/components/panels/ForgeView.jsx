import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Scan,
    CheckCircle2,
    RefreshCw,
    Upload,
    Fingerprint,
    Activity,
    Zap,
    ChevronRight,
    Layers,
    UploadCloud,
    User
} from 'lucide-react';
import { useAppStore } from '../../store';
import { getIdentityPrompts } from '../../utils/identityPrompts';
import { uploadAsset, saveCharacterToDb } from '../../services/supabaseService';
import { getApiUrl, API_BASE_URL } from '../../config/apiConfig';
import { supabase } from '../../lib/supabase';

const API = API_BASE_URL;

function ScanningRing({ active }) {
    return (
        <div className="absolute inset-0 pointer-events-none">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className={`absolute inset-[-10px] border border-dashed rounded-full transition-opacity duration-300 ${active ? 'border-[#bef264]/40 opacity-100' : 'border-white/5 opacity-0'}`}
            />
            <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                className={`absolute inset-[-20px] border border-dotted rounded-full transition-opacity duration-300 ${active ? 'border-[#bef264]/20 opacity-100' : 'border-white/5 opacity-0'}`}
            />
            {/* Corner Brackets */}
            <div className={`absolute -top-4 -left-4 w-4 h-4 border-t-2 border-l-2 transition-colors ${active ? 'border-[#bef264]' : 'border-white/10'}`} />
            <div className={`absolute -top-4 -right-4 w-4 h-4 border-t-2 border-r-2 transition-colors ${active ? 'border-[#bef264]' : 'border-white/10'}`} />
            <div className={`absolute -bottom-4 -left-4 w-4 h-4 border-b-2 border-l-2 transition-colors ${active ? 'border-[#bef264]' : 'border-white/10'}`} />
            <div className={`absolute -bottom-4 -right-4 w-4 h-4 border-b-2 border-r-2 transition-colors ${active ? 'border-[#bef264]' : 'border-white/10'}`} />
        </div>
    );
}

function DiagnosticBar({ label, value, color = "#bef264" }) {
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[7px] font-mono tracking-widest uppercase mb-1">
                <span className="text-white/40">{label}</span>
                <span style={{ color }}>{value}%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    style={{ backgroundColor: color }}
                    className="h-full shadow-[0_0_10px_rgba(190,242,100,0.5)]"
                />
            </div>
        </div>
    );
}

function MatrixOverlay() {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-50 z-0">
            {/* Vercel-style subtle grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />
            {/* Scanning line */}
            <motion.div
                animate={{ top: ['-10%', '110%'] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-x-0 h-[20vh] bg-gradient-to-b from-transparent via-[#bef264]/5 to-transparent blur-3xl"
            />
            {/* Background Vibe */}
            <div className="absolute inset-0 bg-radial-at-t from-[#bef264]/5 via-transparent to-transparent opacity-50" />
        </div>
    );
}

function KitCard({ label, image, loading, aspect = "square" }) {
    const aspectClass = aspect === 'wide' ? 'aspect-[2/1] w-full h-full' : aspect === 'portrait' ? 'aspect-[3/4] w-full h-full' : 'aspect-square w-full h-full';

    return (
        <div className={`relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden ${aspectClass} group transition-all hover:border-[#bef264]/30`}>
            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[9px] font-mono text-[#bef264]/90 z-10 border border-white/5 uppercase tracking-widest font-bold flex items-center gap-2">
                <Scan size={10} /> {label}
            </div>
            {loading ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#050505] relative">
                    <div className="absolute inset-0 border border-[#bef264]/10 rounded-full scale-75 animate-pulse" />
                    <Activity className="text-[#bef264] animate-pulse mb-2 relative z-10" size={24} />
                    <span className="text-[8px] text-[#bef264]/40 font-mono animate-pulse relative z-10">RECONSTRUCTING...</span>

                    <motion.div
                        className="absolute inset-x-0 h-0.5 bg-[#bef264]/30 shadow-[0_0_15px_#bef264]"
                        animate={{ top: ['0%', '100%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                </div>
            ) : image ? (
                <>
                    <img src={image} alt={label} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <CheckCircle2 size={16} className="text-[#bef264]" />
                    </div>
                </>
            ) : (
                <div className="w-full h-full bg-[#030304] flex items-center justify-center opacity-20">
                    <Fingerprint size={32} />
                </div>
            )}
        </div>
    );
}

const safeUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export function ForgeView({ onComplete }) {
    const store = useAppStore();
    const [origin, setOrigin] = useState(null);
    const [faceAnchor, setFaceAnchor] = useState(null);
    const [costumeRef, setCostumeRef] = useState(null);
    const [forgeTab, setForgeTab] = useState('matrix'); // 'matrix' or 'kit'
    const [kit, setKit] = useState({
        anchor: '',
        profile: '',
        expression: '',
        halfBody: '',
        fullBody: '',
        closeUp: ''
    });
    const [matrixUrl, setMatrixUrl] = useState('');
    const [isForging, setIsForging] = useState(false);
    const [isForgingMatrix, setIsForgingMatrix] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [name, setName] = useState(store.name || "UNNAMED_CONSTRUCT");
    const [style, setStyle] = useState('Ultra Realistic');
    const [isLocked, setIsLocked] = useState(false);

    const fileRef = useRef(null);
    const faceRef = useRef(null);
    const costumeRef_fileRef = useRef(null);

    const handleFileUpload = (e, target = 'origin') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result;
                if (target === 'origin') {
                    setOrigin(result);
                    store.setAnchorImage(result);
                } else if (target === 'face') {
                    setFaceAnchor(result);
                } else if (target === 'costume') {
                    setCostumeRef(result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleForge = async () => {
        if (!origin) return;
        setIsForging(true);
        setKit({ anchor: '', profile: '', expression: '', halfBody: '', fullBody: '', closeUp: '' });

        try {
            const prompts = getIdentityPrompts(style);

            const generatePart = async (part, prompt, aspect) => {
                try {
                    const response = await fetch(`${API}/api/forge/generate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt, references: [origin], aspect_ratio: aspect })
                    });
                    const data = await response.json();
                    if (data.url) {
                        setKit(prev => ({ ...prev, [part]: data.url }));
                    }
                } catch (e) {
                    console.error(`Failed to generate ${part}`, e);
                }
            };

            const analysisPromise = fetch(`${API}/api/forge/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: origin })
            })
                .then(res => res.json())
                .then(data => {
                    const analysis = data.analysis || "Identity analysis failed.";
                    store.setImageAnalysis(analysis);
                    store.setDetailMatrix(null);
                })
                .catch(err => console.error("Identity Analysis Error:", err));

            await Promise.all([
                generatePart('anchor', prompts.anchor, '1:1'),
                generatePart('profile', prompts.profile, '1:1'),
                generatePart('expression', prompts.expression, '1:1'),
                generatePart('halfBody', prompts.halfBody, '3:4'),
                generatePart('fullBody', prompts.fullBody, '9:16'),
                generatePart('closeUp', prompts.closeUp, '1:1'),
                analysisPromise
            ]);

        } catch (error) {
            console.error("Forge Failure:", error);
        } finally {
            setIsForging(false);
        }
    };

    const handleForgeMatrix = async () => {
        if (!faceAnchor && !costumeRef && !origin) return;
        setIsForgingMatrix(true);
        setMatrixUrl('');

        try {
            const prompts = getIdentityPrompts(style);
            // Use v2 Dual-Anchor logic if both images are present, fallback to origin
            const references = (faceAnchor && costumeRef) ? [faceAnchor, costumeRef] : [origin || faceAnchor || costumeRef];

            const systemInstruction = (faceAnchor && costumeRef)
                ? "You are a character consistency engine for film production. Image 1 is the SOLE FACE AUTHORITY. Image 2 is COSTUME AND BODY REFERENCE ONLY. You must generate exactly 7 panels in a (4 Top + 3 Bottom) layout at 2K resolution. Row 1 (4 panels): Front, Left Profile (nose points left), Right Profile (nose points right), Back. Row 2 (3 panels): Face Front Closeup, Face Left Profile (nose points left), Face Right Profile (nose points right). Identity match: 100%."
                : undefined;

            const matrixPrompt = (faceAnchor && costumeRef)
                ? "IMAGE 1 = FACE IDENTITY. IMAGE 2 = BODY + COSTUME ONLY. Generate an exact 7-panel character sheet (4 top row, 3 bottom row) in 2K resolution on white seamless background. TOP ROW: Front, Side-Left (nose points left), Side-Right (nose points right), Back. BOTTOM ROW: Face Front Closeup, Face Left Profile (nose points left), Face Right Profile (nose points right). SKIN: Ultra-raw, visible pores, professional detail. Match face Image 1 and costume Image 2 exactly."
                : prompts.matrix;

            const response = await fetch(`${API}/api/forge/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: matrixPrompt,
                    system_instruction: systemInstruction,
                    references: references,
                    aspect_ratio: '16:9',
                    modelEngine: 'nano-banana-pro',
                    quality: '2k'
                })
            });
            const data = await response.json();
            if (data.url) {
                setMatrixUrl(data.url);
            }
        } catch (error) {
            console.error("Matrix Forge Failure:", error);
        } finally {
            setIsForgingMatrix(false);
        }
    };

    const handleConfirm = async () => {
        if (!kit.anchor || !kit.fullBody) {
            console.warn("Cannot confirm: Incomplete Kit");
            return;
        }

        setIsUploading(true);

        try {
            const characterId = safeUUID();

            console.log("Uploading Identity Matrix...");

            const [anchorUrl, profileUrl, exprUrl, halfUrl, fullUrl, closeUpUrl] = await Promise.all([
                uploadAsset(kit.anchor, characterId, 'anchor'),
                uploadAsset(kit.profile, characterId, 'profile'),
                uploadAsset(kit.expression, characterId, 'expression'),
                uploadAsset(kit.halfBody, characterId, 'half_body'),
                uploadAsset(kit.fullBody, characterId, 'full_body'),
                uploadAsset(kit.closeUp, characterId, 'close_up')
            ]);

            const { data } = await supabase.auth.getUser();
            const user = data?.user;

            const newCharacter = {
                id: characterId,
                name: name,
                user_id: user?.id,
                userId: user?.id, // Send both for compatibility with current backend extractor
                age: store.age || 'Unknown',
                origin: store.origin || 'Unknown Sector',
                backstory: store.backstory || 'Identity synthesized from visual anchor.',
                visualStyle: style,
                personality: store.personality,
                voiceDescription: store.voiceDescription,
                catchphrases: store.catchphrases,
                language: store.selectedLanguage,
                image: anchorUrl || kit.anchor,
                anchor_image: anchorUrl || kit.anchor,
                identityKit: {
                    anchor: anchorUrl || kit.anchor,
                    profile: profileUrl || kit.profile,
                    expression: exprUrl || kit.expression,
                    halfBody: halfUrl || kit.halfBody,
                    fullBody: fullUrl || kit.fullBody,
                    closeUp: closeUpUrl || kit.closeUp
                },
                timestamp: new Date().toISOString(),
                isPreset: false,
                sessionState: {
                    messages: [],
                    currentAction: 'Construct Initialized',
                    cameraSettings: store.camera
                }
            };

            // Save to Database and Local Store
            const savedChar = await saveCharacterToDb(newCharacter);
            await store.saveCharacter(savedChar || newCharacter);
            await store.setActiveCharacter(savedChar || newCharacter);

            onComplete();
        } catch (err) {
            console.error("Confirmation failed:", err);
            onComplete();
        } finally {
            setIsUploading(false);
        }
    };

    const handleConfirmMatrix = async () => {
        if (!matrixUrl) return;
        setIsUploading(true);

        try {
            const characterId = safeUUID();
            console.log("Uploading Movie Matrix...");
            const uploadedMatrixUrl = await uploadAsset(matrixUrl, characterId, 'matrix');

            const rawFaceImage = faceAnchor || origin;
            let uploadedFaceUrl = rawFaceImage;
            if (rawFaceImage && rawFaceImage.startsWith('data:')) {
                uploadedFaceUrl = await uploadAsset(rawFaceImage, characterId, 'anchor');
            }

            const { data } = await supabase.auth.getUser();
            const user = data?.user;

            const newCharacter = {
                id: characterId,
                name: name,
                user_id: user?.id,
                userId: user?.id,
                age: store.age || 'Unknown',
                origin: store.origin || 'Unknown Sector',
                backstory: store.backstory || 'Identity synthesized from visual matrix.',
                visualStyle: style,
                personality: store.personality,
                voiceDescription: store.voiceDescription,
                catchphrases: store.catchphrases,
                language: store.selectedLanguage,
                image: uploadedFaceUrl || uploadedMatrixUrl || matrixUrl,
                anchor_image: uploadedFaceUrl || uploadedMatrixUrl || matrixUrl,
                gcs_uri: null, // Will be populated by background sync if needed
                identityKit: {
                    anchor: uploadedFaceUrl || uploadedMatrixUrl || matrixUrl,
                    matrix: uploadedMatrixUrl || matrixUrl
                },
                timestamp: new Date().toISOString(),
                isPreset: false,
                sessionState: {
                    messages: [],
                    currentAction: 'Construct Initialized',
                    cameraSettings: store.camera
                }
            };

            // Save to Database and Local Store
            const savedChar = await saveCharacterToDb(newCharacter);
            await store.saveCharacter(savedChar || newCharacter);
            await store.setActiveCharacter(savedChar || newCharacter);

            setIsLocked(true);
            setTimeout(() => {
                onComplete();
            }, 3000); // 3 second delay to show the locked success state
        } catch (err) {
            console.error("Matrix Confirmation failed:", err);
            onComplete();
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full h-full bg-[#030303] p-4 lg:p-10 flex flex-col items-center overflow-hidden relative">
            <MatrixOverlay />

            <div className="text-center mb-6 space-y-1">
                <h1 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-white via-[#bef264] to-emerald-400 tracking-tighter uppercase whitespace-nowrap">
                    Create your character identity
                </h1>
                <div className="flex items-center justify-center gap-3 opacity-40">
                    <Activity size={12} className="text-[#bef264]" />
                    <p className="font-mono text-[9px] tracking-[0.2em] text-[#bef264] uppercase">Tell the AI who you are — and watch your character come alive.</p>
                </div>
            </div>

            <div className="flex gap-4 mb-6 z-10">
                <button
                    onClick={() => setForgeTab('matrix')}
                    className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${forgeTab === 'matrix' ? 'bg-[#bef264]/10 border-[#bef264] text-[#bef264]' : 'bg-transparent border-white/10 text-white/40 hover:text-white hover:border-white/30'}`}
                >
                    MOVIE MATRIX
                </button>
                <button
                    onClick={() => setForgeTab('kit')}
                    className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${forgeTab === 'kit' ? 'bg-[#bef264]/10 border-[#bef264] text-[#bef264]' : 'bg-transparent border-white/10 text-white/40 hover:text-white hover:border-white/30'}`}
                >
                    IDENTITY KIT
                </button>
            </div>

            <div className="flex flex-col gap-6 w-full max-w-5xl h-[65vh] mx-auto">

                {/* Center Main View */}
                <div className="flex-1 min-h-0 flex items-center justify-center relative w-full">
                    {forgeTab === 'kit' ? (
                        (!kit.anchor && !isForging) ? (
                            <div className="w-full h-full flex flex-col items-center justify-center relative">
                                <div
                                    onClick={() => fileRef.current?.click()}
                                    className="w-[400px] h-[400px] bg-[#0a0a0a] border-2 border-dashed border-[#bef264]/30 rounded-[2rem] flex flex-col items-center justify-center relative overflow-hidden group transition-all cursor-pointer hover:border-[#bef264]"
                                >
                                    {origin ? (
                                        <>
                                            <img src={origin} alt="Origin" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                                            <div className="absolute bottom-8 left-0 right-0 text-center">
                                                <p className="text-[#bef264] text-[12px] font-black uppercase tracking-[0.3em]">Origin Signal Locked</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-6 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <div className="p-8 bg-white/5 rounded-full border border-white/10 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(190,242,100,0.1)]">
                                                <Upload size={48} className="text-[#bef264]" />
                                            </div>
                                            <span className="text-[14px] font-black uppercase tracking-[0.3em] text-[#bef264] text-center px-4 leading-tight">Inject Biological<br />Anchor</span>
                                        </div>
                                    )}
                                </div>
                                <input type="file" ref={fileRef} className="hidden" onChange={(e) => handleFileUpload(e, 'origin')} accept="image/*" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 grid-rows-2 gap-4 h-full w-full relative">
                                <div className="absolute -top-10 right-0 z-10">
                                    <button onClick={() => fileRef.current?.click()} className="px-4 py-2 bg-black/60 border border-white/10 rounded-full text-[9px] font-bold tracking-widest uppercase text-white/50 hover:text-white flex items-center gap-2 transition-colors">
                                        <RefreshCw size={12} /> Change Origin
                                    </button>
                                    <input type="file" ref={fileRef} className="hidden" onChange={(e) => handleFileUpload(e, 'origin')} accept="image/*" />
                                </div>
                                <div className="col-span-1 border border-white/5 rounded-2xl overflow-hidden h-full">
                                    <KitCard label="ANCHOR (1:1)" image={kit.anchor} loading={isForging && !kit.anchor} />
                                </div>
                                <div className="col-span-1 border border-white/5 rounded-2xl overflow-hidden h-full">
                                    <KitCard label="PROFILE (SIDE)" image={kit.profile} loading={isForging && !kit.profile} />
                                </div>
                                <div className="col-span-1 border border-white/5 rounded-2xl overflow-hidden h-full">
                                    <KitCard label="CLOSE-UP (MACRO)" image={kit.closeUp} loading={isForging && !kit.closeUp} />
                                </div>
                                <div className="col-span-1 border border-white/5 rounded-2xl overflow-hidden h-full">
                                    <KitCard label="EXPRESSION" image={kit.expression} loading={isForging && !kit.expression} />
                                </div>
                                <div className="col-span-1 border border-white/5 rounded-2xl overflow-hidden h-full">
                                    <KitCard label="HALF-BODY" image={kit.halfBody} loading={isForging && !kit.halfBody} aspect="portrait" />
                                </div>
                                <div className="col-span-1 border border-white/5 rounded-2xl overflow-hidden h-full">
                                    <KitCard label="FULL-BODY" image={kit.fullBody} loading={isForging && !kit.fullBody} aspect="portrait" />
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center relative">
                            <div className="flex-1 flex flex-col lg:flex-row items-center justify-center p-4 w-full gap-16">
                                {!matrixUrl && !isForgingMatrix ? (
                                    <div className="flex gap-16 items-center justify-center relative w-full lg:w-auto">
                                        {/* Connector Line */}
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-px bg-gradient-to-r from-transparent via-[#bef264]/20 to-transparent pointer-events-none" />

                                        <div className="flex flex-col items-center gap-6 z-10">
                                            <div
                                                onClick={() => faceRef.current?.click()}
                                                className="w-48 h-48 rounded-full bg-[#050505] border-2 border-dashed border-[#bef264]/20 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#bef264]/60 group transition-all relative"
                                            >
                                                <ScanningRing active={!!faceAnchor} />
                                                {faceAnchor ? (
                                                    <img src={faceAnchor} className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700" alt="Face" />
                                                ) : (
                                                    <motion.div
                                                        animate={{ opacity: [0.2, 0.5, 0.2] }}
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                        className="flex flex-col items-center gap-2"
                                                    >
                                                        <User size={40} className="text-[#bef264]" />
                                                        <span className="text-[7px] font-black uppercase tracking-[0.4em]">Face Anchor</span>
                                                    </motion.div>
                                                )}
                                                <input type="file" ref={faceRef} className="hidden" onChange={(e) => handleFileUpload(e, 'face')} />
                                                <input type="file" ref={fileRef} className="hidden" onChange={(e) => handleFileUpload(e, 'origin')} accept="image/*" />
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-[#bef264] text-[10px] font-black uppercase tracking-[0.3em] mb-1">SYNC</h3>
                                                <div className="flex items-center gap-2 justify-center opacity-30 text-[7px] font-mono">
                                                    <span>LATENCY: &lt;3s</span>
                                                    <span className="w-1 h-1 rounded-full bg-[#bef264]" />
                                                    <span>STATUS: READY</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="relative group">
                                            <div className="w-12 h-12 flex items-center justify-center">
                                                <div className="absolute inset-0 border border-[#bef264]/20 rounded-full group-hover:scale-125 transition-transform duration-500" />
                                                <Zap size={16} className="text-[#bef264] relative z-10 group-hover:scale-110" />
                                            </div>
                                            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[6px] font-mono text-white/20 uppercase whitespace-nowrap tracking-widest">linkage_protocol</span>
                                        </div>

                                        <div className="flex flex-col items-center gap-6 z-10">
                                            <div
                                                onClick={() => costumeRef_fileRef.current?.click()}
                                                className="w-48 h-48 rounded-full bg-[#050505] border-2 border-dashed border-[#bef264]/20 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#bef264]/60 group transition-all relative"
                                            >
                                                <ScanningRing active={!!costumeRef} />
                                                {costumeRef ? (
                                                    <img src={costumeRef} className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700" alt="Costume" />
                                                ) : (
                                                    <motion.div
                                                        animate={{ opacity: [0.2, 0.5, 0.2] }}
                                                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                                        className="flex flex-col items-center gap-2"
                                                    >
                                                        <Layers size={40} className="text-[#bef264]" />
                                                        <span className="text-[7px] font-black uppercase tracking-[0.4em]">Outfit DNA</span>
                                                    </motion.div>
                                                )}
                                                <input type="file" ref={costumeRef_fileRef} className="hidden" onChange={(e) => handleFileUpload(e, 'costume')} />
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-[#bef264] text-[10px] font-black uppercase tracking-[0.3em] mb-1">Asset_Module_Prime</h3>
                                                <div className="flex items-center gap-2 justify-center opacity-30 text-[7px] font-mono">
                                                    <span>SIZE: UHD+</span>
                                                    <span className="w-1 h-1 rounded-full bg-[#bef264]" />
                                                    <span>MODE: SYNC</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 w-full max-w-2xl h-full border border-white/10 rounded-3xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] bg-[#050505] relative group">
                                        <KitCard
                                            label={isLocked ? "Identity Secured [100.0%]" : "Neural Matrix [Output]"}
                                            image={isLocked ? (faceAnchor || origin) : matrixUrl}
                                            loading={isForgingMatrix}
                                            aspect={isLocked ? "square" : "wide"}
                                        />
                                        {isLocked && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="absolute inset-0 bg-gradient-to-t from-[#bef264]/20 to-transparent pointer-events-none"
                                            />
                                        )}
                                    </div>
                                )}

                                {/* High-Tech Diagnostic Table */}
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`w-full max-w-[420px] bg-black/40 border ${isLocked ? 'border-[#bef264]/40 shadow-[0_0_50px_rgba(190,242,100,0.1)]' : 'border-white/5'} rounded-3xl p-6 backdrop-blur-3xl relative overflow-hidden group hover:border-[#bef264]/20 transition-all shadow-2xl shrink-0`}
                                >
                                    <div className="absolute top-0 right-0 p-3 opacity-10 font-mono text-[6px] pointer-events-none">
                                        SYSTEM_VERSION_3.12.8<br />
                                        DIAG_PROTOCOL: ACTIVE
                                    </div>

                                    {(matrixUrl || isLocked) && !isForgingMatrix ? (
                                        <div className="flex flex-col items-center justify-center h-full space-y-6 text-center py-6">
                                            <div className={`w-16 h-16 rounded-full ${isLocked ? 'bg-[#bef264] text-black' : 'bg-[#bef264]/10 text-[#bef264]'} flex items-center justify-center border border-[#bef264]/30 shadow-[0_0_40px_rgba(190,242,100,0.2)] transition-colors duration-500`}>
                                                <CheckCircle2 size={32} />
                                            </div>
                                            <div>
                                                <h3 className="text-[#bef264] text-[14px] font-black uppercase tracking-[0.3em] drop-shadow-md">Character Created & Locked</h3>
                                                <p className="text-[9px] font-mono text-[#bef264]/60 uppercase tracking-widest mt-4 max-w-[280px] mx-auto">
                                                    {isLocked
                                                        ? "IDENTITY MATRIX SECURED. YOU CAN NOW USE THIS ASSET CONTINUOUSLY ACROSS ANY CLIP."
                                                        : "Identity Matrix generated. Please confirm to secure the character identity."
                                                    }
                                                </p>
                                            </div>

                                            {!isLocked && (
                                                <button
                                                    onClick={handleConfirmMatrix}
                                                    disabled={isUploading}
                                                    className="w-full mt-6 px-4 py-4 bg-[#bef264] text-black rounded-xl hover:bg-[#bef264]/90 transition-all font-black tracking-[0.2em] text-[10px] uppercase shadow-[0_0_20px_rgba(190,242,100,0.3)] flex justify-center items-center gap-3 disabled:opacity-50"
                                                >
                                                    {isUploading ? <UploadCloud className="animate-bounce" size={16} /> : <Layers size={16} />}
                                                    {isUploading ? "UPLOADING TO SATELLITE..." : "CONFIRM MOVIE MATRIX & ENTER"}
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3 mb-6 w-full">
                                                <Activity size={12} className={isForgingMatrix ? "text-[#bef264] animate-spin shrink-0" : "text-[#bef264] shrink-0"} />
                                                <h2 className="text-[9px] font-black uppercase tracking-[0.4em] text-[#bef264]/80 break-words leading-relaxed">{isForgingMatrix ? "YOUR CHARACTER IS GETTING READY..." : "YOU CAN NOW CREATE CONSISTENT CHARACTER IN ANY SCENE"}</h2>
                                                <div className="flex-1 h-px bg-white/5 min-w-[20px]" />
                                                <span className="text-[7px] font-mono text-[#bef264]/60">ID-LOCK: 99.2%</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-x-8 gap-y-6 animate-pulse" style={{ animationDuration: isForgingMatrix ? '1s' : '0s' }}>
                                                <DiagnosticBar label="Face Identity Fidelity" value={isForgingMatrix ? 85 : 95} />
                                                <DiagnosticBar label="Outfit Pattern Lock" value={isForgingMatrix ? 89 : 98} color="#bef264" />
                                                <DiagnosticBar label="Surface Consistency" value={isForgingMatrix ? 80 : 94} color="#64d2f2" />
                                                <DiagnosticBar label="Temporal Stability" value={(faceAnchor && costumeRef) && !isForgingMatrix ? 100 : 88} color="#f26464" />
                                            </div>

                                            <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-1.5 grayscale opacity-30">
                                                        <div className="w-1 h-1 rounded-full bg-white" />
                                                        <span className="text-[6px] font-mono tracking-tighter uppercase">Single Image Mode</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#bef264] shadow-[0_0_5px_#bef264]" />
                                                        <span className="text-[7px] font-black tracking-widest uppercase text-[#bef264]">Dual-Lock Enhanced</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-40">
                                                    <Scan size={10} className="text-[#bef264]" />
                                                    <span className="text-[6px] font-mono uppercase tracking-widest">Success probability: {isForgingMatrix ? "CALCULATING..." : "99.2%"}</span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Control Bar */}
                <div className="bg-black/40 border border-white/10 rounded-3xl p-5 flex items-center justify-between gap-6 backdrop-blur-3xl z-20 w-full shrink-0 mt-4 shadow-2xl relative">
                    <div className="flex-1 space-y-1 max-w-sm">
                        <label className="text-[8px] font-black text-[#bef264]/40 uppercase tracking-[0.4em] ml-1">Choose your Character's name</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="ENTER NAME..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-black text-white uppercase tracking-widest focus:border-[#bef264] outline-none transition-all placeholder:text-white/10"
                            />
                            <button
                                onClick={() => {
                                    const prefixes = ['AEON', 'NOVA', 'PRIME', 'CORE', 'NANO', 'XEN', 'VEO'];
                                    const suffixes = ['Z-1', 'ALPHA', 'BETA', 'O-9', 'MAX', 'ULTRA'];
                                    setName(`${prefixes[Math.floor(Math.random() * prefixes.length)]}_${suffixes[Math.floor(Math.random() * suffixes.length)]}_${Math.floor(Math.random() * 999)}`);
                                }}
                                className="p-3 bg-white/5 border border-white/10 rounded-xl text-[#bef264] hover:bg-[#bef264]/10 transition-colors shrink-0"
                                title="Generate Random Name"
                            >
                                <RefreshCw size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="h-12 w-px bg-white/10 shrink-0" />

                    <div className="w-64 space-y-1 shrink-0">
                        <label className="text-[8px] font-bold text-[#bef264]/40 uppercase tracking-[0.4em] ml-1">Visual Matrix</label>
                        <div className="relative">
                            <select
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[11px] font-black text-white uppercase tracking-wider focus:border-[#bef264] outline-none transition-colors appearance-none cursor-pointer hover:bg-black/60"
                            >
                                <option value="Realistic">Realistic</option>
                                <option value="Ultra Realistic">Ultra Realistic (Raw)</option>
                                <option value="iPhone">iPhone (Shot on iPhone)</option>
                                <option value="Cinematic">Cinematic</option>
                                <option value="Anime">Anime</option>
                                <option value="Cartoon">Cartoon</option>
                                <option value="Cyberpunk">Cyberpunk</option>
                                <option value="Ethereal">Ethereal</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#bef264]/50">
                                ▼
                            </div>
                        </div>
                    </div>

                    <div className="h-12 w-px bg-white/10 shrink-0" />

                    <div className="shrink-0 pt-3">
                        {forgeTab === 'kit' ? (
                            <button
                                onClick={handleForge}
                                disabled={!origin || isForging}
                                className="px-10 py-3 bg-[#bef264] text-black font-black text-[12px] uppercase tracking-[0.3em] rounded-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 disabled:scale-100 shadow-[0_0_20px_rgba(190,242,100,0.15)] flex items-center justify-center gap-3 whitespace-nowrap"
                            >
                                {isForging ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} fill="currentColor" />}
                                {isForging ? "SYNTHESIZING..." : "INITIALIZE"}
                            </button>
                        ) : (
                            <button
                                onClick={handleForgeMatrix}
                                disabled={(!origin && !faceAnchor) || isForgingMatrix}
                                className="px-10 py-3 bg-[#bef264] text-black font-black text-[12px] uppercase tracking-[0.3em] rounded-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 disabled:scale-100 shadow-[0_0_20px_rgba(190,242,100,0.15)] flex items-center justify-center gap-3 whitespace-nowrap"
                            >
                                {isForgingMatrix ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} fill="currentColor" />}
                                {isForgingMatrix ? "GENERATING..." : "GENERATE MATRIX"}
                            </button>
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {forgeTab === 'kit' && kit.fullBody && !isForging && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute bottom-32 z-50 self-center"
                        >
                            <button
                                onClick={handleConfirm}
                                disabled={isUploading}
                                className="px-12 py-5 bg-[#0a0a0a] border border-[#bef264] text-[#bef264] rounded-full hover:bg-[#bef264] hover:text-black transition-all font-black tracking-[0.3em] text-[10px] uppercase shadow-2xl flex items-center gap-4 group disabled:opacity-50"
                            >
                                {isUploading ? <UploadCloud className="animate-bounce" size={16} /> : <Layers size={16} className="group-hover:rotate-12 transition-transform" />}
                                {isUploading ? "UPLOADING TO SATELLITE..." : "CONFIRM IDENTITY KIT & ENTER STUDIO"}
                                {!isUploading && <ChevronRight size={16} />}
                            </button>
                        </motion.div>
                    )}


                </AnimatePresence>
            </div>
        </div>
    );
}
