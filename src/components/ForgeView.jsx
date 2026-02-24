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
    UploadCloud
} from 'lucide-react';
import { useAppStore } from '../store';
import { getIdentityPrompts } from '../utils/identityPrompts';
import { uploadAsset, saveCharacterToDb } from '../supabaseService';
import { getApiUrl, API_BASE_URL } from '../config/apiConfig';

const API = API_BASE_URL;

function KitCard({ label, image, loading, aspect = "square" }) {
    const aspectClass = aspect === 'wide' ? 'aspect-[2/1] w-full h-full' : aspect === 'portrait' ? 'aspect-[3/4] w-full h-full' : 'aspect-square w-full h-full';

    return (
        <div className={`relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden ${aspectClass} group transition-all hover:border-[#bef264]/30`}>
            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[9px] font-mono text-[#bef264]/90 z-10 border border-white/5 uppercase tracking-widest font-bold flex items-center gap-2">
                <Scan size={10} /> {label}
            </div>
            {loading ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0a]">
                    <Activity className="text-[#bef264] animate-pulse mb-2" size={24} />
                    <span className="text-[8px] text-[#bef264]/40 font-mono animate-pulse">SYNTHESIZING...</span>

                    <motion.div
                        className="absolute inset-x-0 h-0.5 bg-[#bef264]/50 shadow-[0_0_15px_#bef264]"
                        animate={{ top: ['0%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
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
    const [kit, setKit] = useState({
        anchor: '',
        profile: '',
        expression: '',
        halfBody: '',
        fullBody: '',
        closeUp: ''
    });
    const [isForging, setIsForging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [name, setName] = useState(store.name || "UNNAMED_CONSTRUCT");
    const [style, setStyle] = useState('Realistic');

    const fileRef = useRef(null);

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setOrigin(reader.result);
                store.setAnchorImage(reader.result);
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

            const newCharacter = {
                id: characterId,
                name: name,
                age: store.age || 'Unknown',
                origin: store.origin || 'Unknown Sector',
                backstory: store.backstory || 'Identity synthesized from visual anchor.',
                visualStyle: style,
                personality: store.personality,
                voiceDescription: store.voiceDescription,
                catchphrases: store.catchphrases,
                language: store.selectedLanguage,
                image: anchorUrl || kit.anchor,
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

            await saveCharacterToDb(newCharacter);
            await store.saveCharacter(newCharacter);
            await store.setActiveCharacter(newCharacter);

            onComplete();
        } catch (err) {
            console.error("Confirmation failed:", err);
            onComplete();
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full h-full bg-[#050505] p-4 lg:p-10 flex flex-col items-center overflow-hidden">

            <div className="text-center mb-6 space-y-1">
                <h1 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-[#bef264] to-emerald-400 tracking-tighter uppercase">
                    Identity Forge
                </h1>
                <div className="flex items-center justify-center gap-3 opacity-40">
                    <Activity size={12} className="text-[#bef264]" />
                    <p className="font-mono text-[9px] tracking-[0.5em] text-[#bef264]">NANO BANANA PROTOCOL: 5-POINT ANCHORING SYSTEM</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl h-[70vh]">

                <div className="lg:w-1/3 flex flex-col gap-6 h-full">
                    <div
                        onClick={() => fileRef.current?.click()}
                        className="flex-1 bg-[#0a0a0a] border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center relative overflow-hidden group hover:border-[#bef264]/40 transition-all cursor-pointer"
                    >
                        {origin ? (
                            <>
                                <img src={origin} alt="Origin" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                                <div className="absolute bottom-4 left-0 right-0 text-center">
                                    <p className="text-[#bef264] text-[8px] font-black uppercase tracking-[0.3em]">Origin Signal Locked</p>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
                                <div className="p-4 bg-white/5 rounded-full border border-white/10 group-hover:scale-110 transition-transform">
                                    <Upload size={24} className="text-[#bef264]" />
                                </div>
                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white text-center px-4 leading-tight">Inject Biological Anchor</span>
                            </div>
                        )}
                        <input type="file" ref={fileRef} className="hidden" onChange={handleFileUpload} accept="image/*" />
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                        <div className="space-y-1">
                            <label className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Construct Designation</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs font-black text-white uppercase tracking-wider focus:border-[#bef264] outline-none transition-colors"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Visual Matrix</label>
                            <div className="relative">
                                <select
                                    value={style}
                                    onChange={(e) => setStyle(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs font-black text-white uppercase tracking-wider focus:border-[#bef264] outline-none transition-colors appearance-none cursor-pointer hover:bg-black/60"
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
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                                    ▼
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleForge}
                        disabled={!origin || isForging}
                        className="bg-[#bef264] text-black font-black text-[10px] uppercase tracking-[0.3em] py-5 rounded-[1.5rem] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 disabled:scale-100 shadow-[0_0_30px_rgba(190,242,100,0.15)] flex items-center justify-center gap-3"
                    >
                        {isForging ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} fill="currentColor" />}
                        {isForging ? "Synthesizing DNA..." : "Initialize Construct"}
                    </button>
                </div>

                <div className="lg:w-2/3 grid grid-cols-3 grid-rows-2 gap-4 h-full">
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
            </div>

            <AnimatePresence>
                {kit.fullBody && !isForging && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-8 z-50"
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
    );
}
