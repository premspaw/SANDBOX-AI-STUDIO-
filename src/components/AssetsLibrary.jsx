import React, { useState } from 'react';
import {
    Image as ImageIcon,
    Video,
    Box,
    ArrowBigUpDash,
    FolderOpen,
    Cloud,
    HardDrive,
    MoreVertical,
    Download,
    Trash2,
    Share2,
    ImagePlus,
    User,
    RefreshCw,
    Maximize2,
    Clapperboard,
    CheckCircle2,
    ChevronRight,
    Film,
    Bot
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store';

const API = 'http://localhost:3002';

// --- Character Kit Card Component ---
function CharacterKitCard({ character, onDirectorsCut, onDelete }) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const resolveUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:'))
            return url;
        return `${API}${url}`;
    };

    const handleDelete = async (e) => {
        e.stopPropagation();
        if (!confirmDelete) {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000); // Reset after 3s
            return;
        }
        setIsDeleting(true);
        try {
            const res = await fetch(`${API}/api/delete-character/${character.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success && onDelete) onDelete(character.id);
        } catch (err) {
            console.error('Delete failed:', err);
        } finally {
            setIsDeleting(false);
            setConfirmDelete(false);
        }
    };

    const kitSlots = [
        { key: 'anchor', label: 'ANCHOR' },
        { key: 'profile', label: 'PROFILE' },
        { key: 'closeUp', label: 'MACRO' },
        { key: 'expression', label: 'EXPR' },
        { key: 'halfBody', label: 'HALF' },
        { key: 'fullBody', label: 'FULL' },
        { key: 'spatialKit', label: 'NEURAL_SPRITE' },
    ];

    const kitImages = character.kitImages || character.identityKit || character.identity_kit || {};
    const hasKit = Object.values(kitImages).some(v => v);

    return (
        <div className={`group relative bg-[#050505] border ${isDeleting ? 'border-red-500/30 opacity-50' : 'border-white/5'} rounded-[2rem] overflow-hidden hover:border-[#bef264]/30 transition-all duration-700 shadow-2xl flex flex-col`}>
            {/* Anchor Hero Image */}
            <div className="relative aspect-[3/4] overflow-hidden bg-black">
                {character.anchorImage ? (
                    <img
                        src={resolveUrl(character.anchorImage)}
                        alt={character.name}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { e.target.style.display = 'none'; }}
                        className="w-full h-full object-cover brightness-75 group-hover:brightness-100 group-hover:scale-105 transition-all duration-1000"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#bef264]/10 to-black flex items-center justify-center">
                        <User className="w-20 h-20 text-white/10" />
                    </div>
                )}

                {/* IDENTITY badge */}
                <div className="absolute top-4 left-4 bg-[#bef264] text-black text-[8px] font-black px-3 py-1.5 rounded-full uppercase tracking-[0.2em]">
                    IDENTITY_KIT
                </div>

                {/* DELETE button */}
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur-xl transition-all duration-300 z-10 ${confirmDelete
                        ? 'bg-red-500 text-white scale-110 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                        : 'bg-black/50 text-white/40 opacity-0 group-hover:opacity-100 hover:bg-red-500/80 hover:text-white'
                        }`}
                    title={confirmDelete ? 'Click again to confirm delete' : 'Delete character'}
                >
                    <Trash2 size={14} />
                </button>
                {confirmDelete && (
                    <div className="absolute top-14 right-2 bg-red-500 text-white text-[7px] font-black px-2 py-1 rounded-lg uppercase tracking-wider z-10 animate-pulse">
                        TAP AGAIN TO CONFIRM
                    </div>
                )}

                {/* Hover CTA overlay */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center gap-4 p-6">
                    <p className="text-[8px] text-white/40 uppercase tracking-widest font-black text-center">Open in Director's Cut</p>
                    <button
                        onClick={onDirectorsCut}
                        className="bg-[#bef264] text-black py-3 px-8 rounded-full font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(190,242,100,0.5)]"
                    >
                        <Clapperboard size={14} />
                        DIRECT
                    </button>
                </div>
            </div>

            {/* Identity Kit Mini-Strip */}
            {hasKit && (
                <div className="grid grid-cols-6 gap-0.5 p-1.5 bg-black/40">
                    {kitSlots.map(slot => (
                        kitImages[slot.key] ? (
                            <div key={slot.key} className="relative aspect-square overflow-hidden rounded-md group/slot">
                                <img
                                    src={resolveUrl(kitImages[slot.key])}
                                    alt={slot.label}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity"
                                />
                                <div className="absolute inset-0 flex items-end justify-center pb-0.5 opacity-0 group-hover/slot:opacity-100 transition-opacity">
                                    <span className="text-[5px] text-white/70 font-mono font-black uppercase">{slot.label}</span>
                                </div>
                            </div>
                        ) : (
                            <div key={slot.key} className="aspect-square rounded-md bg-white/5 border border-white/5 flex items-center justify-center">
                                <span className="text-[6px] text-white/10 font-mono uppercase">{slot.label}</span>
                            </div>
                        )
                    ))}
                </div>
            )}

            {/* Footer - Character Name */}
            <div className="p-5 flex items-center justify-between bg-black/20">
                <div className="overflow-hidden flex-1">
                    <p className="text-[11px] font-black uppercase tracking-widest text-white/80 group-hover:text-[#bef264] transition-colors truncate">{character.name}</p>
                    <p className="text-[8px] text-white/20 font-mono uppercase mt-1">{character.visualStyle} · {character.date}</p>
                </div>
                <button
                    onClick={onDirectorsCut}
                    className="ml-4 shrink-0 w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/30 hover:bg-[#bef264] hover:text-black hover:border-[#bef264] transition-all"
                    title="Open in Director's Cut"
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}


export function AssetsLibrary({ compact = false, onSelectReference, setActiveTab: setAppTab }) {
    const [activeTab, setActiveTab] = useState('images');
    const [viewMode, setViewMode] = useState('grid');
    const [isConnectedToDrive, setIsConnectedToDrive] = useState(false);
    const [assets, setAssets] = useState({
        images: [],
        videos: [],
        models: [],
        upscaled: [],
        characters: []
    });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isNeuralSearch, setIsNeuralSearch] = useState(false);

    const fetchAssets = async () => {
        console.log("AssetsLibrary: fetchAssets starting [PARALLEL_PROXY_MODE]...");
        setLoading(true);
        try {
            // FIX 1 — Run BOTH fetches in PARALLEL
            const [assetResp, charResp] = await Promise.all([
                fetch(`${API}/api/list-assets`).catch(() => null),
                fetch(`${API}/api/list-characters`).catch(() => null),
            ]);

            const assetData = assetResp ? await assetResp.json() : {};
            const charData = charResp ? await charResp.json() : {};

            const dbImages = assetData.images || [];
            const rawChars = charData.characters || [];

            console.log("AssetsLibrary: Found characters:", rawChars.length);

            // FIX 2 — MAP character fields correctly (snake_case → camelCase)
            const dbCharacters = rawChars.map(c => ({
                id: c.id,
                name: c.name || c.character_name || 'Anonymous Identity',
                anchorImage: c.anchor_image   // ← snake_case from DB
                    || c.anchorImage
                    || c.image_url
                    || c.image
                    || c.photo
                    || null,
                visualStyle: c.visual_style || c.visualStyle || 'Realistic',
                date: c.created_at || c.timestamp
                    ? new Date(c.created_at || c.timestamp).toLocaleDateString()
                    : 'Recently',
                kitImages: c.identity_kit || c.identityKit || c.kitImages || c.kit_images || {},
                rawData: c,
            }));

            setAssets({
                images: dbImages,
                videos: assetData.videos || [],
                characters: dbCharacters,
                models: [
                    { id: 'm1', name: 'GPT Image 1.5', type: 'Native', size: 'N/A', date: 'Active' },
                    { id: 'm2', name: 'Flux Pro', type: 'Replicate', size: 'N/A', date: 'Active' },
                ],
                upscaled: []
            });
            console.log("AssetsLibrary: State updated successfully via Parallel Proxy.");
        } catch (e) {
            console.error("AssetsLibrary: Critical Fetch Assets Error:", e);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchAssets();
    }, []);

    const handleSemanticSearch = async () => {
        if (!searchQuery.trim()) {
            fetchAssets();
            return;
        }
        setLoading(true);
        try {
            const resp = await fetch(`${API}/api/influencer/semantic-search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: searchQuery })
            });
            const data = await resp.json();
            if (data.results) {
                setAssets(prev => ({
                    ...prev,
                    characters: data.results.map(c => ({
                        id: c.id,
                        name: c.name,
                        image: c.image,
                        visualStyle: c.visual_style,
                        date: 'Semantic Match',
                        rawData: c
                    }))
                }));
                setActiveTab('characters');
            }
        } catch (e) {
            console.error("Semantic search failed:", e);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'images', label: 'Images', icon: ImageIcon },
        { id: 'characters', label: 'Characters', icon: User },
        { id: 'videos', label: 'Videos', icon: Video },
        { id: 'models', label: 'AI Models', icon: Box },
        { id: 'upscaled', label: 'Upscaled', icon: ArrowBigUpDash },
    ];

    const handleConnectDrive = () => {
        setIsConnectedToDrive(true);
        alert("Establishing Secure Google Drive Connection...\n\nYour creative workspace will now synchronize in real-time with your personal drive.");
    };

    return (
        <div className="h-full flex flex-col bg-[#020202] text-white font-mono">
            {/* Header */}
            {!compact && (
                <div className="p-8 border-b border-white/5 flex items-center justify-between backdrop-blur-3xl bg-black/40 relative overflow-hidden shrink-0">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#bef264]/20 to-transparent" />
                    <div className="relative z-10 flex items-center gap-6">
                        <div className="p-3 bg-[#bef264]/10 rounded-2xl border border-[#bef264]/20 shadow-[0_0_30px_rgba(190,242,100,0.1)]">
                            <FolderOpen className="w-8 h-8 text-[#bef264]" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-metallic">
                                Creative <span className="text-[#bef264]">Vault</span>
                            </h1>
                            <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] mt-1 font-bold">Secure_Neural_Asset_Management</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 relative z-10">
                        <div className={`flex items-center gap-3 px-5 py-2.5 rounded-full border backdrop-blur-md ${isConnectedToDrive ? 'bg-[#bef264]/10 border-[#bef264]/20 text-[#bef264]' : 'bg-white/5 border-white/10 text-white/30'}`}>
                            <Cloud className="w-4 h-4" />
                            <span className="text-[9px] font-black uppercase tracking-widest">
                                {isConnectedToDrive ? 'SYNC_ACTIVE' : 'LOCAL_ONLY'}
                            </span>
                        </div>

                        {!isConnectedToDrive && (
                            <button
                                onClick={handleConnectDrive}
                                className="bg-white/5 hover:bg-white/10 text-white px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 transition-all flex items-center gap-3"
                            >
                                <HardDrive className="w-4 h-4" />
                                CONNECT_DRIVE
                            </button>
                        )}

                        <button
                            onClick={fetchAssets}
                            className="p-3 hover:bg-[#bef264] hover:text-black rounded-full text-white/40 border border-white/5 transition-all shadow-xl"
                            title="Refresh Archive"
                        >
                            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                        </button>
                    </div>
                </div>
            )}

            <div className={cn("px-8 pt-4 border-b border-white/5 flex items-center justify-between bg-black/20 shrink-0", compact && "pt-2")}>
                <div className="flex gap-8">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-4 px-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-3 ${activeTab === tab.id ? 'border-[#bef264] text-[#bef264] drop-shadow-[0_0_10px_rgba(190,242,100,0.4)]' : 'border-transparent text-white/30 hover:text-white'}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            <span className={`px-2 py-0.5 rounded-full text-[8px] ${activeTab === tab.id ? 'bg-[#bef264] text-black' : 'bg-white/5 text-white/20'}`}>
                                {assets[tab.id]?.length || 0}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Neural Search Input */}
                <div className="flex items-center gap-3 pb-4">
                    <div className="relative group/search">
                        <input
                            type="text"
                            placeholder={isNeuralSearch ? "Search by vibe (e.g. 'Cyberpunk with neon glitch')..." : "Search assets..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (isNeuralSearch ? handleSemanticSearch() : null)}
                            className="bg-white/5 border border-white/10 rounded-full px-5 py-2 text-[10px] font-bold w-64 md:w-80 focus:outline-none focus:border-[#bef264]/40 transition-all text-white placeholder-white/20"
                        />
                        <button
                            onClick={() => isNeuralSearch ? handleSemanticSearch() : null}
                            className="absolute right-2 top-1.5 p-1 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <CheckCircle2 className="w-4 h-4 text-[#bef264]/60" />
                        </button>
                    </div>
                    <button
                        onClick={() => setIsNeuralSearch(!isNeuralSearch)}
                        className={`px-4 py-2 rounded-full border text-[9px] font-black transition-all flex items-center gap-2 ${isNeuralSearch ? 'bg-[#bef264]/10 border-[#bef264]/40 text-[#bef264]' : 'bg-white/5 border-white/10 text-white/30'}`}
                    >
                        <Bot className="w-3.5 h-3.5" />
                        {isNeuralSearch ? 'NEURAL_ON' : 'NEURAL_OFF'}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-black/10">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-6">
                        <RefreshCw className="w-12 h-12 text-[#bef264] animate-spin opacity-50" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#bef264] animate-pulse">Scanning_Biological_Archive...</span>
                    </div>
                ) : activeTab === 'models' ? (
                    <div className="surface-glass rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
                        <table className="w-full text-left">
                            <thead className="bg-black/60 border-b border-white/5">
                                <tr className="text-[10px] font-black uppercase tracking-widest text-white/40 font-mono">
                                    <th className="p-6">Entity_Name</th>
                                    <th className="p-6">Generation_Type</th>
                                    <th className="p-6">Spectral_Size</th>
                                    <th className="p-6">Stasis_Period</th>
                                    <th className="p-6 text-right">Access</th>
                                </tr>
                            </thead>
                            <tbody className="text-[11px] font-bold">
                                {assets.models.map(model => (
                                    <tr key={model.id} className="border-t border-white/5 hover:bg-white/5 transition-all">
                                        <td className="p-6 text-white flex items-center gap-4">
                                            <Box className="w-5 h-5 text-[#bef264]" />
                                            {model.name}
                                        </td>
                                        <td className="p-6"><span className="bg-[#bef264]/10 text-[#bef264] px-3 py-1 rounded-full border border-[#bef264]/20">{model.type}</span></td>
                                        <td className="p-6 text-white/40 font-mono">{model.size}</td>
                                        <td className="p-6 text-white/20 uppercase tracking-widest">{model.date}</td>
                                        <td className="p-6 text-right">
                                            <button className="text-white/20 hover:text-[#bef264] p-2 transition-colors">
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : activeTab === 'characters' ? (
                    <div>
                        {assets.characters.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center gap-4 opacity-20 text-center">
                                <User className="w-20 h-20 text-[#bef264]/20" />
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">No_Identity_Constructs_Found</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {assets.characters.map(char => (
                                    <CharacterKitCard
                                        key={char.id}
                                        character={char}
                                        onDelete={(deletedId) => {
                                            setAssets(prev => ({
                                                ...prev,
                                                characters: prev.characters.filter(c => c.id !== deletedId)
                                            }));
                                        }}
                                        onDirectorsCut={() => {
                                            const store = useAppStore.getState();
                                            store.setActiveCharacter(char.rawData);
                                            store.addNode(
                                                char.anchorImage,
                                                char.name,
                                                false,
                                                { x: 300 + Math.random() * 200, y: 300 + Math.random() * 200 }
                                            );
                                            setAppTab?.('directors-cut');
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : assets[activeTab].length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 opacity-20 text-center">
                        <FolderOpen className="w-20 h-20 text-[#bef264]/20" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Sector_Null // No_Assets_Located</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                        {assets[activeTab].map(item => (
                            <div key={item.id} className="group relative surface-glass rounded-[2.5rem] border border-white/5 overflow-hidden hover:border-[#bef264]/40 transition-all duration-700 shadow-2xl">
                                {item.type === 'video' ? (
                                    <div className="aspect-[4/5] bg-black relative flex items-center justify-center group/video">
                                        <video
                                            src={item.url?.startsWith('http') || item.url?.startsWith('data:') ? item.url : `${API}${item.url}`}
                                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                            muted
                                            loop
                                            onMouseEnter={(e) => e.target.play()}
                                            onMouseLeave={(e) => e.target.pause()}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
                                            <Film className="w-12 h-12 text-white/20" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="aspect-[4/5] bg-[#050505] relative overflow-hidden">
                                        <img
                                            src={item.url?.startsWith('http') || item.url?.startsWith('data:') ? item.url : `${API}${item.url}`}
                                            alt={item.name}
                                            className="w-full h-full object-cover transition-all duration-1000 brightness-75 group-hover:brightness-110 group-hover:scale-110"
                                        />
                                    </div>
                                )}

                                {/* Action Overlay */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex items-center justify-center gap-4">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onSelectReference?.(item.url); }}
                                        className="w-14 h-14 bg-[#bef264] hover:scale-110 active:scale-95 rounded-full text-black flex items-center justify-center shadow-[0_0_40px_rgba(190,242,100,0.6)] transition-all"
                                        title="Set as Neural Anchor"
                                    >
                                        <ImagePlus className="w-7 h-7" />
                                    </button>
                                    <button className="w-14 h-14 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md flex items-center justify-center transition-all border border-white/10" title="Archive">
                                        <Download className="w-7 h-7" />
                                    </button>
                                </div>

                                {item.isCharacter && (
                                    <div className="absolute top-6 left-6 bg-[#bef264] text-black text-[9px] font-black px-4 py-1.5 rounded-full uppercase shadow-lg tracking-widest">
                                        IDENTITY
                                    </div>
                                )}

                                <div className="p-8">
                                    <div className="text-xs font-black uppercase tracking-widest text-white/90 group-hover:text-[#bef264] transition-colors truncate">{item.name}</div>
                                    <div className="flex items-center justify-between mt-4 text-[9px] font-mono text-white/10 font-bold uppercase tracking-widest">
                                        <span>{item.date}</span>
                                        <span className="text-[#bef264]/40">{item.size}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div >
    );
}
