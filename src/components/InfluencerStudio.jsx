import React, { useState, useRef, useCallback } from 'react';
import {
    Users, Sparkles, Camera, Instagram, Twitter, Plus, X,
    Image as ImageIcon, Video, Zap, Bot, UserCircle2, Type,
    ArrowRight, Download, RefreshCw, Wand2, Layers, Mic,
    ChevronRight, Shield, Eye, Crosshair, AlertCircle, Check,
    Upload, Brain, Film, Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store';
import { uploadAsset, saveCharacterToDb } from '../supabaseService';

const safeUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const API = 'http://localhost:3002';

// ─── Visual Style Config ──────────────────────────────────────────────────────
const VISUAL_STYLES = [
    { id: 'Realistic', label: 'Realistic', color: '#94a3b8' },
    { id: 'Ultra Realistic', label: 'Ultra Real', color: '#D4FF00' },
    { id: 'Cinematic', label: 'Cinematic', color: '#f59e0b' },
    { id: 'Anime', label: 'Anime', color: '#a78bfa' },
    { id: 'Cyberpunk', label: 'Cyberpunk', color: '#06b6d4' },
    { id: 'Ethereal', label: 'Ethereal', color: '#f472b6' },
];

const POSES = [
    { id: 'portrait', label: 'Selfie/Portrait', icon: UserCircle2 },
    { id: 'fullbody', label: 'Full Body', icon: Users },
    { id: 'action', label: 'Action/Dynamic', icon: Zap },
    { id: 'product', label: 'Product Showcase', icon: ImageIcon },
];

const VOICES = ['Zephyr', 'Orion', 'Nova', 'Autonoe', 'Charon'];
const OUTFITS = ['Casual', 'Cyberpunk', 'Avant-Garde', 'Streetwear', 'Formal', 'Athletic'];

// ─── Identity Kit Panel Layout ────────────────────────────────────────────────
const KIT_SLOTS = [
    { key: 'anchor', label: 'ANCHOR', desc: 'Identity Truth', span: 'col-span-1 row-span-2' },
    { key: 'profile', label: 'PROFILE', desc: 'Side Structure', span: 'col-span-1 row-span-1' },
    { key: 'closeUp', label: 'CLOSE-UP', desc: 'Macro Detail', span: 'col-span-1 row-span-1' },
    { key: 'expression', label: 'EXPR', desc: 'Elasticity', span: 'col-span-1 row-span-1' },
    { key: 'halfBody', label: 'HALF-BODY', desc: 'Torso', span: 'col-span-1 row-span-1' },
    { key: 'fullBody', label: 'FULL-BODY', desc: 'Physics', span: 'col-span-1 row-span-1' },
    { key: 'spatialKit', label: 'SPATIAL KIT', desc: 'Neural Sprite Sheet', span: 'col-span-2 row-span-2' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ text, color = '#D4FF00' }) {
    return (
        <span style={{ color, borderColor: color + '40', background: color + '15' }}
            className="text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest">
            {text}
        </span>
    );
}

function KitSlotCard({ slot, imageUrl, loading }) {
    return (
        <div className={`${slot.span} relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 group`}>
            {loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-[#D4FF00] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[8px] font-mono text-[#D4FF00]/60 uppercase tracking-widest">{slot.label}</span>
                </div>
            ) : imageUrl ? (
                <>
                    <img src={imageUrl} alt={slot.label} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                        <div className="text-[8px] font-black text-[#D4FF00] uppercase tracking-widest">{slot.label}</div>
                        <div className="text-[7px] text-white/50">{slot.desc}</div>
                    </div>
                    <a
                        href={imageUrl}
                        download={`${slot.label.toLowerCase()}.png`}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Download className="w-3 h-3 text-white" />
                    </a>
                </>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-20">
                    <Crosshair className="w-5 h-5 text-white" />
                    <span className="text-[8px] font-mono uppercase tracking-widest">{slot.label}</span>
                </div>
            )}
        </div>
    );
}

// ─── Create Character Modal ───────────────────────────────────────────────────

function CreateCharacterModal({ onClose, onCreate }) {
    const [step, setStep] = useState(1); // 1=details, 2=photo, 3=analyzing
    const [name, setName] = useState('');
    const [niche, setNiche] = useState('Tech & Lifestyle');
    const [photoData, setPhotoData] = useState(null);
    const [analysis, setAnalysis] = useState('');
    const [error, setError] = useState('');
    const fileRef = useRef();

    const niches = [
        'Tech & Lifestyle', 'Fashion & Beauty', 'Fitness & Wellness',
        'Gaming', 'Luxury Lifestyle', 'Travel & Adventure', 'Corporate/Business'
    ];

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setPhotoData(reader.result);
        reader.readAsDataURL(file);
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setPhotoData(reader.result);
        reader.readAsDataURL(file);
    }, []);

    const handleAnalyze = async () => {
        if (!name.trim()) { setError('Character name is required.'); return; }
        if (!photoData) { setError('Please upload a reference photo.'); return; }
        setError('');
        setStep(3);
        try {
            // Call the backend's geminiService.analyzeIdentity equivalent via a general prompt
            const response = await fetch(`${API}/api/influencer/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: photoData })
            });
            const data = await response.json();
            const identityAnalysis = data.analysis || `${name} — A compelling digital influencer in the ${niche} space with a strong visual identity.`;
            setAnalysis(identityAnalysis);
            // Store vision tags if provided
            if (data.tags) {
                setAnalysis(prev => prev + "\n\nVision Profile: " + data.tags.labels.slice(0, 5).join(', '));
            }
            setStep(4); // done
        } catch {
            // Graceful fallback — still create the character
            setAnalysis(`${name} — A compelling digital influencer in the ${niche} space with a strong visual identity.`);
            setStep(4);
        }
    };

    const handleCreate = () => {
        onCreate({
            id: safeUUID(),
            name: name.trim(),
            niche,
            photo: photoData,
            analysis,
            images: 0,
            followers: '0',
        });
        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-lg flex items-center justify-center p-6"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
                {/* Modal Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-black italic flex items-center gap-2">
                            <Brain className="w-5 h-5 text-[#D4FF00]" />
                            NEW CHARACTER PROTOCOL
                        </h2>
                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-0.5">
                            Initialize Digital DNA
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <AnimatePresence mode="wait">
                        {step <= 2 && (
                            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                                {/* Name */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Character Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Luna Veda, Neon Kai..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#D4FF00]/50 transition-all text-white placeholder-white/20"
                                    />
                                </div>

                                {/* Niche */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Content Niche</label>
                                    <div className="flex flex-wrap gap-2">
                                        {niches.map(n => (
                                            <button key={n} onClick={() => setNiche(n)}
                                                className={`px-3 py-1.5 rounded-full border text-[9px] font-bold uppercase transition-all ${niche === n ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'border-white/10 text-white/50 hover:bg-white/5'}`}>
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Photo Upload */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Reference Photo</label>
                                    <div
                                        onClick={() => fileRef.current?.click()}
                                        onDrop={handleDrop}
                                        onDragOver={(e) => e.preventDefault()}
                                        className="relative border-2 border-dashed border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:border-[#D4FF00]/40 transition-all group"
                                        style={{ minHeight: '140px' }}
                                    >
                                        {photoData ? (
                                            <img src={photoData} alt="Reference" className="w-full h-40 object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-36 gap-3 opacity-40 group-hover:opacity-70 transition-opacity">
                                                <Upload className="w-8 h-8 text-white" />
                                                <p className="text-[10px] font-mono uppercase tracking-widest text-center">Drop photo or click to upload<br /><span className="opacity-50">PNG, JPG, WEBP</span></p>
                                            </div>
                                        )}
                                        {photoData && (
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Change Photo</span>
                                            </div>
                                        )}
                                    </div>
                                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 text-red-400 text-xs">
                                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    onClick={handleAnalyze}
                                    className="w-full py-4 bg-[#D4FF00] text-black font-black uppercase tracking-[0.2em] italic rounded-xl flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all shadow-[0_8px_30px_rgba(212,255,0,0.2)]"
                                >
                                    <Brain className="w-4 h-4" />
                                    Analyze & Initialize
                                </button>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-10 gap-5">
                                <div className="w-16 h-16 rounded-full border-2 border-[#D4FF00] border-t-transparent animate-spin shadow-[0_0_20px_rgba(212,255,0,0.4)]" />
                                <div className="text-center">
                                    <p className="font-black italic text-[#D4FF00] mb-1">Analyzing Identity...</p>
                                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Extracting visual DNA markers</p>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                                <div className="flex items-center gap-3 p-4 bg-[#D4FF00]/10 border border-[#D4FF00]/30 rounded-xl">
                                    <Check className="w-5 h-5 text-[#D4FF00] flex-shrink-0" />
                                    <div>
                                        <div className="text-xs font-black text-[#D4FF00] uppercase tracking-widest">Identity Extracted</div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">{analysis.substring(0, 120)}...</div>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCreate}
                                    className="w-full py-4 bg-[#D4FF00] text-black font-black uppercase tracking-[0.2em] italic rounded-xl flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all shadow-[0_8px_30px_rgba(212,255,0,0.2)]"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Create {name}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase';

export function InfluencerStudio({ setActiveTab }) {
    const [studioTab, setStudioTab] = useState('creation');
    const [characters, setCharacters] = useState([]);
    const [selectedChar, setSelectedChar] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const handleCreateNew = () => {
        if (setActiveTab) {
            setActiveTab('forge');
        } else {
            setShowCreateModal(true);
        }
    };

    // Generation state
    const [mode, setMode] = useState('image');   // 'image' | 'video' | 'kit'
    const [style, setStyle] = useState('Realistic');
    const [pose, setPose] = useState('portrait');
    const [environment, setEnvironment] = useState('');
    const [outfit, setOutfit] = useState('Casual');
    const [prompt, setPrompt] = useState('');
    const [script, setScript] = useState('');
    const [voice, setVoice] = useState('Zephyr');

    // Output state
    const [output, setOutput] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('Processing...');

    // Identity Kit state
    const [kit, setKit] = useState({ anchor: null, profile: null, closeUp: null, expression: null, halfBody: null, fullBody: null });
    const [kitLoading, setKitLoading] = useState(false);
    const [kitSlotLoading, setKitSlotLoading] = useState({});

    // ── Handlers ──────────────────────────────────────────────────────────────

    const fetchCharactersFromSupabase = async () => {
        try {
            console.log("InfluencerStudio: Fetching characters via Proxy...");
            setLoading(true);

            const charResp = await fetch(`${API}/api/list-characters`);
            const charData = await charResp.json();
            const proxyChars = charData.characters || [];

            if (proxyChars.length > 0) {
                const formatted = proxyChars.map(c => ({
                    id: c.id,
                    name: c.name || 'ANONYMOUS_ENTITY',
                    niche: 'Digital Entity',
                    photo: c.anchorImage || c.image || '',
                    analysis: c.rawData?.metadata?.analysis || c.rawData?.metadata?.visualStyle || '',
                    images: c.rawData?.metadata?.images || 0,
                    followers: c.rawData?.metadata?.followers || '0',
                    visualStyle: c.visualStyle || 'Realistic',
                    identityKit: c.kitImages || {}
                }));
                setCharacters(formatted);
                if (formatted.length > 0 && !selectedChar) {
                    setSelectedChar(formatted[0]);
                }
            } else if (supabase) {
                // Fallback to direct supabase only if proxy is completely empty
                console.log("InfluencerStudio: Proxy returned no characters, trying direct fallback...");
                const { data } = await supabase.from('characters').select('*').limit(5);
                if (data) {
                    const formatted = data.map(c => ({
                        id: c.id,
                        name: c.name || 'ENTITY',
                        niche: 'Digital Entity',
                        photo: c.identity_kit?.anchor || c.image || '',
                        analysis: '',
                        images: 0,
                        followers: '0'
                    }));
                    setCharacters(formatted);
                }
            }
        } catch (e) {
            console.error("InfluencerStudio: Critical Fetch Error:", e);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchCharactersFromSupabase();
    }, []);

    const handleCreateChar = async (newChar) => {
        // Optimistic UI update
        setCharacters(prev => [newChar, ...prev]);
        setSelectedChar(newChar);

        try {
            let uploadedUrl = null;

            // Only upload if we have a base64 photo
            if (newChar.photo && newChar.photo.startsWith('data:')) {
                console.log(`[InfluencerStudio] Uploading anchor photo for ${newChar.name}...`);
                uploadedUrl = await uploadAsset(newChar.photo, newChar.id, 'anchor');
                if (uploadedUrl) {
                    console.log(`[InfluencerStudio] Upload success: ${uploadedUrl.substring(0, 60)}...`);
                } else {
                    console.warn(`[InfluencerStudio] Upload returned null for ${newChar.name}. Photo will be stored in metadata.`);
                }
            } else if (newChar.photo) {
                // Photo is already a URL
                uploadedUrl = newChar.photo;
            }

            // Prepare final character object for DB
            const charToSave = {
                ...newChar,
                image: uploadedUrl || '',
                photo: uploadedUrl || newChar.photo,
                identityKit: { anchor: uploadedUrl || newChar.photo || '' },
                visualStyle: style || 'Realistic',
                origin: environment || 'Unknown',
                timestamp: new Date().toISOString()
            };

            // Save to Database
            await saveCharacterToDb(charToSave);

            // Update local state with the permanent URL
            setCharacters(prev => prev.map(c => c.id === newChar.id ? { ...charToSave, photo: uploadedUrl || newChar.photo } : c));
            setSelectedChar({ ...charToSave, photo: uploadedUrl || newChar.photo });
        } catch (err) {
            console.error("Failed to persist character:", err);
        }
    };

    const handleSelectChar = (char) => {
        setSelectedChar(char);
        setOutput(null);
        // If it has an identity kit in the DB, we could load it here
        setKit({ anchor: char.photo, profile: null, closeUp: null, expression: null, halfBody: null, fullBody: null });
    };

    const handleGenerate = async () => {
        if (!selectedChar) return;
        setLoading(true);
        const bible = useAppStore.getState().universeBible;

        if (mode === 'image') {
            setLoadingMsg('Rendering influencer...');
            try {
                const res = await fetch(`${API}/api/influencer/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        character: selectedChar,
                        prompt: prompt || '',
                        pose,
                        environment,
                        outfit,
                        style,
                        aspect_ratio: '9:16',
                        bible
                    })
                });
                const data = await res.json();
                if (data.url) {
                    setOutput({ url: data.url, type: 'image', description: data.description || '' });
                    // Increment character generation count
                    setCharacters(prev => prev.map(c => c.id === selectedChar.id ? { ...c, images: c.images + 1 } : c));
                } else {
                    alert(data.message || data.error || 'Generation failed');
                }
            } catch (e) {
                alert('Connection error: ' + e.message);
            }

        } else if (mode === 'video') {
            if (!output?.url || output.type === 'video') {
                alert('Generate a base image first, then switch to UGC Video mode to animate it.');
                setLoading(false);
                return;
            }
            setLoadingMsg('Generating UGC video (this takes ~2 mins)...');
            try {
                const res = await fetch(`${API}/api/ugc/video`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: output.url,
                        script: script || 'Hello! Welcome to my channel.',
                        bible
                    })
                });
                const data = await res.json();
                if (data.url) {
                    setOutput({ url: data.url, type: 'video', description: `UGC Video: "${script.substring(0, 60)}..."` });
                } else {
                    alert(data.error || 'Video generation failed');
                }
            } catch (e) {
                alert('Connection error: ' + e.message);
            }
        }
        setLoading(false);
    };

    const handleGenerateKit = async () => {
        if (!selectedChar) return;
        const originImage = selectedChar.photo;
        if (!originImage) {
            alert('This character has no reference photo. Create a new character with a photo to generate an Identity Kit.');
            return;
        }
        setKitLoading(true);
        setKit({ anchor: null, profile: null, closeUp: null, expression: null, halfBody: null, fullBody: null, spatialKit: null });

        // Trigger all 5 slots individually so the UI fills in progressively
        const slots = KIT_SLOTS.map(s => s.key);
        const loadingState = {};
        slots.forEach(k => loadingState[k] = true);
        setKitSlotLoading(loadingState);

        try {
            const res = await fetch(`${API}/api/influencer/identity-kit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: originImage, style })
            });
            const data = await res.json();
            const kitData = data.kit;
            if (kitData) {
                // Upload each kit slot to Storage
                const uploadPromises = Object.entries(kitData).map(async ([slot, base64]) => {
                    if (base64 && base64.startsWith('data:')) {
                        return { slot, url: await uploadAsset(base64, selectedChar.id, slot.toLowerCase()) };
                    }
                    return { slot, url: base64 };
                });

                const uploadedSlots = await Promise.all(uploadPromises);
                const finalKit = {};
                uploadedSlots.forEach(s => finalKit[s.slot] = s.url);

                const updatedChar = {
                    ...selectedChar,
                    identityKit: finalKit,
                };

                // Update Local State
                setKit(finalKit);
                setCharacters(prev => prev.map(c => c.id === selectedChar.id ? updatedChar : c));
                setSelectedChar(updatedChar);

                // Persist to DB
                await saveCharacterToDb(updatedChar);
            } else {
                // Fallback: generate anchor only
                alert(data.error || 'Identity kit generation failed. Try generating images individually.');
            }
        } catch (e) {
            alert('Connection error: ' + e.message);
        } finally {
            setKitLoading(false);
            setKitSlotLoading({});
        }
    };

    const handleDownload = () => {
        if (!output?.url) return;
        const a = document.createElement('a');
        a.href = output.url;
        a.download = `${selectedChar?.name?.replace(/\s+/g, '_')}_${Date.now()}.${output.type === 'video' ? 'mp4' : 'png'}`;
        a.click();
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="h-full flex flex-col bg-[#050505] text-white overflow-hidden">
            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40 backdrop-blur-xl flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-black italic tracking-tighter flex items-center gap-3">
                        <Users className="w-7 h-7 text-[#D4FF00]" />
                        <span className="text-metallic">AI_INFLUENCER_STUDIO</span>
                    </h1>
                    <p className="text-gray-500 text-[10px] mt-0.5 font-mono tracking-widest uppercase">
                        Cinema AI Studio · Identity Consistency Protocol V3.1
                    </p>
                </div>

                <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                    {['creation', 'kit', 'library'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setStudioTab(tab)}
                            className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${studioTab === tab
                                ? 'bg-[#D4FF00] text-black shadow-[0_0_20px_rgba(212,255,0,0.3)]'
                                : 'hover:bg-white/5 text-gray-500'
                                }`}
                        >
                            {tab === 'kit' ? 'Identity Kit' : tab === 'creation' ? 'Live Stage' : tab === 'library' ? 'Archive' : tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* ── Sidebar ───────────────────────────────────────────────── */}
                <aside className="w-72 border-r border-white/10 bg-black/20 flex flex-col flex-shrink-0">
                    {/* New Sidebar Controls: Create & Playground */}
                    <div className="p-4 border-b border-white/5 space-y-3">
                        <button
                            onClick={handleCreateNew}
                            className="w-full py-3 bg-[#D4FF00] text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(212,255,0,0.15)]"
                        >
                            <Plus className="w-4 h-4" />
                            Create Character
                        </button>

                        <button
                            onClick={() => setStudioTab('creation')}
                            className={`w-full py-3 border text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${studioTab === 'creation'
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'border-white/5 text-gray-500 hover:text-white hover:border-white/20 hover:bg-white/5'
                                }`}
                        >
                            <Film className="w-4 h-4" />
                            Live Stage
                        </button>
                    </div>

                    <div className="px-4 py-3 flex items-center justify-between">
                        <h2 className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">Cast & Talent</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {characters.map((char) => (
                            <button
                                key={char.id}
                                onClick={() => handleSelectChar(char)}
                                className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 group ${selectedChar?.id === char.id
                                    ? 'bg-[#D4FF00]/10 border-[#D4FF00]/30'
                                    : 'bg-white/3 border-white/5 hover:border-white/20'
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-white/5 flex items-center justify-center">
                                    {char.photo ? (
                                        <img src={char.photo} alt={char.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <UserCircle2 className={`w-5 h-5 ${selectedChar?.id === char.id ? 'text-[#D4FF00]' : 'text-gray-600'}`} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={`font-bold text-sm truncate ${selectedChar?.id === char.id ? 'text-white' : 'text-gray-300'}`}>
                                        {char.name}
                                    </div>
                                    <div className="text-[9px] text-gray-500 truncate">{char.niche}</div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className={`text-[9px] font-black ${selectedChar?.id === char.id ? 'text-[#D4FF00]' : 'text-gray-600'}`}>
                                        {char.images}
                                    </div>
                                    <div className="text-[8px] text-gray-600">gens</div>
                                </div>
                            </button>
                        ))}

                        {/* Empty state */}
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="w-full p-4 rounded-xl border border-dashed border-white/10 hover:border-[#D4FF00]/30 transition-all flex flex-col items-center gap-2 text-center group"
                        >
                            <Plus className="w-5 h-5 text-gray-600 group-hover:text-[#D4FF00] transition-colors" />
                            <span className="text-[9px] text-gray-600 group-hover:text-gray-400 font-bold uppercase tracking-widest transition-colors">
                                New Character
                            </span>
                        </button>
                    </div>

                    {/* Engine info */}
                    <div className="p-4 border-t border-white/5">
                        <div className="p-3 rounded-xl bg-white/3 border border-white/5 flex items-start gap-2">
                            <Bot className="w-4 h-4 text-white/20 mt-0.5 flex-shrink-0" />
                            <p className="text-[9px] text-white/30 leading-relaxed">
                                Powered by <span className="text-[#D4FF00]/50 font-bold">Nano Banana Protocol</span> — 6-point identity anchoring via Gemini Vision.
                            </p>
                        </div>
                    </div>
                </aside>

                {/* ── Main Area ──────────────────────────────────────────────── */}
                <main className="flex-1 overflow-y-auto custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {!selectedChar ? (
                            /* Empty State */
                            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center text-center p-10 max-w-md mx-auto">
                                <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-8 relative">
                                    <Users className="w-10 h-10 text-gray-600" />
                                    <div className="absolute -top-2 -right-2 bg-[#D4FF00] p-1.5 rounded-full shadow-[0_0_15px_#D4FF00]">
                                        <Sparkles className="w-3 h-3 text-black" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-black italic mb-3">Select or Create a Character</h3>
                                <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                                    Every AI Influencer begins with a unique digital DNA. Initialize a character from the sidebar to start generating consistent content.
                                </p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="px-8 py-3 bg-[#D4FF00] text-black font-black uppercase tracking-widest text-[10px] rounded-full hover:-translate-y-0.5 transition-all flex items-center gap-2 shadow-[0_8px_30px_rgba(212,255,0,0.2)]"
                                >
                                    <Plus className="w-4 h-4" />
                                    New Character Protocol
                                </button>
                            </motion.div>

                        ) : studioTab === 'creation' ? (
                            /* ── DIRECTOR'S PLAYGROUND (NODE EDITOR) ────────────────────────── */
                            <motion.div key="creation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="w-full h-full flex flex-col relative">

                                {/* Overlay Character Header */}
                                <div className="absolute top-6 left-6 z-50 flex items-center gap-4 p-4 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-2xl pointer-events-none">
                                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#bef264]/20">
                                        <img src={selectedChar.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedChar.name}`} alt={selectedChar.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black italic tracking-tighter uppercase">{selectedChar.name}</h2>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#bef264] animate-pulse" />
                                            <span className="text-[8px] font-bold text-[#bef264]/60 uppercase tracking-[0.2em]">DIRECTOR_PLAYGROUND_ACTIVE</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 w-full h-full">
                                    <PlaygroundCanvas />
                                </div>
                            </motion.div>

                        ) : studioTab === 'kit' ? (
                            /* ── IDENTITY KIT TAB ────────────────────────────── */
                            <motion.div key="kit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                className="w-full h-full flex flex-col">
                                <div className="p-6 overflow-y-auto custom-scrollbar">

                                    <div className="mb-6 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-xl font-black italic flex items-center gap-2">
                                                <Shield className="w-5 h-5 text-[#D4FF00]" />
                                                NANO BANANA IDENTITY KIT
                                            </h2>
                                            <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mt-0.5">
                                                6-Point Anchoring System · Character: {selectedChar.name}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {/* Style selector for kit */}
                                            <select value={style} onChange={(e) => setStyle(e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white uppercase tracking-widest focus:outline-none focus:border-[#D4FF00]/50">
                                                {VISUAL_STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                            </select>
                                            <button onClick={handleGenerateKit} disabled={kitLoading || !selectedChar?.photo}
                                                className="px-5 py-2.5 bg-[#D4FF00] text-black font-black uppercase tracking-widest text-[9px] italic rounded-xl flex items-center gap-2 hover:-translate-y-0.5 transition-all shadow-[0_5px_20px_rgba(212,255,0,0.2)] disabled:opacity-40 disabled:translate-y-0">
                                                {kitLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                                                {kitLoading ? 'Generating...' : 'Generate Kit'}
                                            </button>
                                        </div>
                                    </div>

                                    {!selectedChar?.photo && (
                                        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                                            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-amber-400 text-xs font-bold">Reference Photo Required</p>
                                                <p className="text-amber-400/70 text-[10px] mt-0.5">
                                                    Create a new character and upload a reference photo to generate the Identity Kit. The Nano Banana protocol needs a source image to generate consistent anchors.
                                                </p>
                                                <button onClick={handleCreateNew}
                                                    className="mt-2 text-[9px] font-black text-amber-400 uppercase tracking-widest hover:underline flex items-center gap-1">
                                                    <Plus className="w-3 h-3" /> Create Character With Photo
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* 6-Slot Kit Grid */}
                                    <div className="grid grid-cols-4 grid-rows-2 gap-3" style={{ height: '520px' }}>
                                        {KIT_SLOTS.map((slot) => (
                                            <KitSlotCard
                                                key={slot.key}
                                                slot={slot}
                                                imageUrl={kit[slot.key]}
                                                loading={kitLoading || !!kitSlotLoading[slot.key]}
                                            />
                                        ))}
                                    </div>

                                    {/* Info cards */}
                                    <div className="mt-6 grid grid-cols-5 gap-3">
                                        {KIT_SLOTS.map((slot, i) => (
                                            <div key={slot.key} className="p-3 bg-white/3 border border-white/5 rounded-xl">
                                                <div className="text-[8px] font-black text-[#D4FF00] uppercase tracking-widest mb-1">{slot.label}</div>
                                                <div className="text-[8px] text-gray-500">{slot.desc}</div>
                                                <div className="mt-2 flex items-center gap-1">
                                                    {kit[slot.key] ? (
                                                        <Check className="w-3 h-3 text-[#D4FF00]" />
                                                    ) : (
                                                        <div className="w-3 h-3 rounded-full border border-white/10" />
                                                    )}
                                                    <span className="text-[8px] text-gray-600">{kit[slot.key] ? 'Ready' : 'Pending'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <p className="mt-4 text-center text-[9px] text-gray-600 font-mono">
                                        PROTOCOL: Once generated, use these anchors as reference images in Image mode for maximum consistency.
                                    </p>
                                </div>
                            </motion.div>

                        ) : (
                            /* ── LIBRARY TAB ────────────────────────────────── */
                            <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="w-full h-full flex flex-col items-center justify-center text-center p-6">
                                <Layers className="w-12 h-12 text-gray-700 mb-4" />
                                <h3 className="text-xl font-black italic text-gray-500 mb-2">Content Library</h3>
                                <p className="text-gray-600 text-sm max-w-sm">
                                    All generated images and videos for {selectedChar.name} will appear here. Coming soon.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>

            {/* ── Create Character Modal ────────────────────────────────────── */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateCharacterModal
                        onClose={() => setShowCreateModal(false)}
                        onCreate={handleCreateChar}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
