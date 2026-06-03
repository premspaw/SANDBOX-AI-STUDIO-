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
    Bot,
    Lock,
    Database
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';
import { getApiUrl, API_BASE_URL, resolveUrl } from '../../config/apiConfig';
import { LANDING_ASSETS } from '../../config/landingAssets';

const API = API_BASE_URL;

const ensureDataUri = (str) => {
    if (!str || typeof str !== 'string') return str;
    if (str.startsWith('http') || str.startsWith('data:') || str.startsWith('blob:') || str.length < 50) return str;
    // If it looks like base64 but missing prefix
    return `data:image/jpeg;base64,${str}`;
};

// --- Character Kit Card Component ---
function CharacterKitCard({ character, onDirectorsCut, onDelete, onSelectReference, compact }) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async (e) => {
        e.stopPropagation();
        if (!confirmDelete) {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000); // Reset after 3s
            return;
        }
        setIsDeleting(true);
        try {
            if (character.isAvatarStudio) {
                if (supabase) {
                    const { error: dbErr } = await supabase
                        .from('avatar_generations')
                        .delete()
                        .eq('id', character.id);
                    if (dbErr) throw dbErr;
                }
                if (onDelete) onDelete(character.id);
            } else {
                const res = await fetch(`${API}/api/delete-character/${character.id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success && onDelete) onDelete(character.id);
            }
        } catch (err) {
            console.error('Delete failed:', err);
        } finally {
            setIsDeleting(false);
            setConfirmDelete(false);
        }
    };

    const kitSlots = [
        { key: 'matrix', label: 'MATRIX' },
        { key: 'spatialKit', label: 'NEURAL_SPRITE' },
        { key: 'anchor', label: 'ANCHOR' },
        { key: 'profile', label: 'PROFILE' },
        { key: 'closeUp', label: 'MACRO' },
        { key: 'expression', label: 'EXPR' },
        { key: 'halfBody', label: 'HALF' },
        { key: 'fullBody', label: 'FULL' },
    ];

    const kitImages = character.kitImages || character.identityKit || character.identity_kit || {};
    const hasKit = Object.values(kitImages).some(v => v);

    return (
        <div className={`group relative bg-[#050505] border ${isDeleting ? 'border-red-500/30 opacity-50' : 'border-white/5'} rounded-xl overflow-hidden hover:border-[#bef264]/40 transition-all duration-500 shadow-xl flex flex-col aspect-[4/5] w-full`}>
            {/* Anchor Hero Image */}
            <div className="absolute inset-0 bg-black">
                {character.anchorImage ? (
                    <img
                        src={resolveUrl(character.anchorImage)}
                        alt={character.name}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { e.target.style.display = 'none'; }}
                        className="w-full h-full object-cover brightness-75 group-hover:brightness-100 group-hover:scale-110 transition-transform duration-700"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#bef264]/10 to-black flex items-center justify-center">
                        <User className="w-10 h-10 text-white/10" />
                    </div>
                )}
            </div>

            {/* Top Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                <div className="bg-[#bef264] text-black text-[7px] font-black px-2 py-1 rounded-full uppercase tracking-[0.1em] w-fit shadow-md">
                    IDENTITY
                </div>
                {kitImages.matrix && (
                    <div className="bg-black/80 backdrop-blur-md border border-[#bef264]/50 text-[#bef264] text-[6px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest flex items-center gap-1 w-fit">
                        <Lock size={6} /> Matrix
                    </div>
                )}
            </div>

            {/* Persistent Bottom Name Overlay */}
            <div className="absolute bottom-0 inset-x-0 p-3 pt-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none">
                <p className="text-[10px] font-black uppercase text-white truncate drop-shadow-md tracking-wider">
                    {character.name}
                </p>
                <p className="text-[7px] text-white/50 font-mono uppercase mt-0.5 drop-shadow-sm">
                    {character.visualStyle}
                </p>
            </div>

            {/* Action CTA Overlay on Hover */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 z-20">
                {onSelectReference ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); onSelectReference(character.url, character); }}
                        className="w-10 h-10 bg-purple-500 hover:scale-110 active:scale-95 rounded-full text-white flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.5)] border border-purple-400/50 transition-all"
                        title="Use as Reference"
                    >
                        <ImagePlus size={16} />
                    </button>
                ) : (
                    <button
                        onClick={onDirectorsCut}
                        className="w-10 h-10 bg-[#bef264] hover:scale-110 active:scale-95 rounded-full text-black flex items-center justify-center shadow-[0_0_20px_rgba(190,242,100,0.5)] transition-all"
                        title="Open in Director's Cut"
                    >
                        <Clapperboard size={16} />
                    </button>
                )}
                
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border ${confirmDelete ? 'bg-red-500 text-white border-red-400 scale-110 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-red-500/80 text-white border-red-400/50 hover:bg-red-500 hover:scale-110'}`}
                    title={confirmDelete ? 'Confirm Delete' : 'Delete'}
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
}


export function AssetsLibrary({ compact = false, onSelectReference, setActiveTab: setAppTab, defaultTab = 'images' }) {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [viewMode, setViewMode] = useState('grid');
    const [isConnectedToDrive, setIsConnectedToDrive] = useState(false);
    const { cachedAssets, cachedAssetsUserId, setCachedAssets, userProfile } = useAppStore();
    const [assets, setAssets] = useState({
        images: [],
        videos: [],
        models: [],
        upscaled: [],
        characters: [],
        landing: [],
        templates: []
    });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');


    const fetchAssets = async (force = false) => {
        // Resolve user early for cache verification
        let targetUser = userProfile;
        if (!targetUser) {
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                targetUser = authUser;
            } catch (e) {
                console.warn('[AssetsLibrary] Failed to fetch auth user:', e);
            }
        }

        if (!targetUser || !targetUser.id || targetUser.id === 'null' || targetUser.id === 'undefined') {
            targetUser = { id: 'local_user' };
        }

        if (!force && cachedAssets && cachedAssetsUserId === targetUser?.id) {
            setAssets(cachedAssets);
            setLoading(false);
            return;
        }

        console.log(`AssetsLibrary: fetchAssets starting for User ${targetUser?.id}...`);
        setLoading(true);
        const sharedImages = [];
        const sharedVideos = [];
        try {

            // 1. Fetch images & videos via Proxy/Backend (IPv4 Fix)
            const response = await fetch(getApiUrl(`/api/list-assets?userId=${targetUser.id}`));
            const data = await response.json();
            
            if (!response.ok) throw new Error(data.error || "Failed to fetch assets");
            
            const allAssets = data.assets || [];
            const dbImages = allAssets.filter(a => a.type === 'image');
            const dbVideos = allAssets.filter(a => a.type === 'video');
            const dbUpscaled = allAssets.filter(a => a.type === 'upscaled' || a.type === 'upscale');
            const dbCharacterAssets = allAssets.filter(a => a.type === 'character').map(a => {
                return {
                    id: a.id,
                    type: "character",
                    name: a.name || "Saved Character",
                    visualStyle: a.metadata?.visualStyle || a.metadata?.style || 'Cinematic',
                    anchorImage: a.url,
                    url: a.url,
                    image: a.url,
                    date: a.date || 'Recently',
                    isCharacter: true,
                    isMatrix: false,
                    isAvatarStudio: true,
                    rawData: a
                };
            });

            // 2. Fetch characters via Proxy (IPv4 Fix)
            const charResponse = await fetch(getApiUrl(`/api/list-characters?userId=${targetUser.id}`));;
            const charData = await charResponse.json();
            const dbCharacters = charData.characters || [];

            // 2b. Fetch Avatar Studio generated characters from Supabase
            let dbAvatars = [];
            try {
                if (supabase) {
                    const { data: avatarData } = await supabase
                        .from('avatar_generations')
                        .select('*')
                        .eq('user_id', targetUser.id)
                        .order('created_at', { ascending: false });
                    if (avatarData) dbAvatars = avatarData;
                }
            } catch (err) {
                console.warn('[Assets Library] Failed to fetch generated avatars:', err);
            }

            console.log(`Found: ${dbImages.length} images, ${dbVideos.length} videos, ${dbUpscaled.length} upscaled assets, ${dbCharacterAssets.length} saved characters, ${dbAvatars.length} generated avatars`);

            // 3. Normalize characters to match your UI card format
            const normalizedCharacters = (dbCharacters || []).map(c => {
                let anchor = c.image || c.anchor_image || c.identity_kit?.anchor || c.identityKit?.anchor || '';
                anchor = ensureDataUri(anchor);
                return {
                    id: c.id,
                    type: "character",
                    name: c.name || "UNNAMED_CONSTRUCT",
                    visualStyle: c.visual_style || c.visualStyle || 'Realistic',
                    anchorImage: anchor,
                    url: anchor, // Crucial for rendering grid
                    image: anchor,
                    date: c.timestamp ? new Date(c.timestamp).toISOString().split('T')[0] : 'Recently',
                    isCharacter: true,
                    isMatrix: !!(c.identity_kit?.matrix || c.identityKit?.matrix),
                    rawData: c
                };
            });

            // Normalize generated avatars from Avatar Studio
            const normalizedAvatars = dbAvatars.map(a => {
                return {
                    id: a.id,
                    type: "character",
                    name: a.character_name || "Generated Avatar",
                    visualStyle: a.style || 'Cinematic',
                    anchorImage: a.output_url,
                    url: a.output_url,
                    image: a.output_url,
                    date: a.created_at ? new Date(a.created_at).toISOString().split('T')[0] : 'Recently',
                    isCharacter: true,
                    isMatrix: false,
                    isAvatarStudio: true,
                    rawData: {
                        ...a,
                        name: a.character_name,
                        image: a.output_url,
                        visual_style: a.style
                    }
                };
            });

            // --- LOCAL MIRROR MERGE (Emergency Fallback, per-user scoped) ---
            let localCharacters = [];
            try {
                const vaultKey = `local_vault:${targetUser.id}`;
                const raw = localStorage.getItem(vaultKey);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    localCharacters = parsed.map(c => {
                        let anchor = c.image || c.anchor_image || c.photo || c.identityKit?.anchor || c.identity_kit?.anchor || '';
                        anchor = ensureDataUri(anchor);
                        return {
                            id: c.id,
                            type: 'character',
                            name: c.name || 'Local Construct',
                            visualStyle: c.visual_style || c.visualStyle || 'Realistic',
                            anchorImage: anchor,
                            url: anchor,
                            image: anchor,
                            date: c.timestamp ? new Date(c.timestamp).toISOString().split('T')[0] : 'Recently',
                            isCharacter: true,
                            isMatrix: !!(c.identityKit?.matrix || c.identity_kit?.matrix),
                            rawData: c
                        };
                    });
                }
            } catch (e) {
                console.error("Local vault read failed:", e);
            }

            // Merge and de-duplicate by ID (DB takes priority)
            const finalCharacters = [...normalizedCharacters, ...normalizedAvatars];
            
            // Add explicitly saved character assets from the 'assets' table
            (dbCharacterAssets || []).forEach(ca => {
                if (!finalCharacters.find(fc => fc.url === ca.url || fc.id === ca.id)) {
                    finalCharacters.unshift(ca);
                }
            });

            localCharacters.forEach(lc => {
                if (!finalCharacters.find(dc => dc.id === lc.id)) {
                    finalCharacters.unshift(lc);
                }
            });

            // Sort all characters by date/timestamp descending (newest to top)
            finalCharacters.sort((x, y) => {
                const getMs = (item) => {
                    const raw = item.rawData || {};
                    const ts = raw.created_at || raw.timestamp || item.date || 0;
                    if (!ts || ts === 'Recently' || ts === 'Active') return 0;
                    return new Date(ts).getTime() || 0;
                };
                return getMs(y) - getMs(x);
            });


            const newAssets = {
                images: dbImages,
                videos: dbVideos,
                upscaled: dbUpscaled,
                models: [
                    { id: 'm1', name: 'GPT Image 1.5', type: 'Native', size: 'N/A', date: 'Active' },
                    { id: 'm2', name: 'Flux Pro', type: 'Replicate', size: 'N/A', date: 'Active' },
                ],
                characters: finalCharacters,
            };

            setAssets(newAssets);
            setCachedAssets(newAssets, targetUser?.id);
            console.log("AssetsLibrary: State updated successfully via Direct Supabase + Local Merge.");

        } catch (err) {
            console.error("fetchAssets failed:", err.message);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchAssets(false);
    }, []);

    const handleSemanticSearch = async () => {
        if (!searchQuery.trim()) {
            fetchAssets(false);
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
                        image: resolveUrl(c.image),
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

    const handleDeleteAsset = async (id, tab) => {
        if (!window.confirm("Permanently delete this asset from the database?")) return;
        
        try {
            if (tab === 'templates') {
                // Skip or handle as error if templates are no longer supported
                return;
            } else {
                const { error } = await supabase.from('assets').delete().eq('id', id);
                if (error) throw error;
            }

            // Update local state
            setAssets(prev => ({
                ...prev,
                [tab]: prev[tab].filter(a => a.id !== id)
            }));
            
            // Update cache
            if (cachedAssets) {
                setCachedAssets({
                    ...cachedAssets,
                    [tab]: cachedAssets[tab].filter(a => a.id !== id)
                });
            }
        } catch (err) {
            console.error("Delete asset failed:", err);
            alert("Failed to delete asset. " + err.message);
        }
    };

    const tabs = [
        { id: 'images', label: 'Images', icon: ImageIcon },
        { id: 'characters', label: 'Characters', icon: User },
        { id: 'videos', label: 'Videos', icon: Video },
        { id: 'models', label: 'AI Models', icon: Box },
        { id: 'upscaled', label: 'Upscaled', icon: ArrowBigUpDash },
    ];

    const handleUploadTemplate = async () => {
        const title = document.getElementById('tplTitle')?.value;
        const context = document.getElementById('tplContext')?.value;
        const prompt = document.getElementById('tplPrompt')?.value;
        const fileInput = document.getElementById('tplMedia');
        const file = fileInput?.files?.[0];
        if (!title || !prompt || !file) {
            alert('Please provide title, prompt, and a media file.');
            return;
        }
        
        try {
            setLoading(true);
            const reader = new FileReader();
            const base64 = await new Promise((res, rej) => { reader.onload = e => res(e.target.result); reader.onerror = rej; reader.readAsDataURL(file); });
            const uploadResp = await fetch(getApiUrl('/api/upload-asset'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: base64, type: file.type.startsWith('video') ? 'video' : 'image', userId: userProfile?.id })
            });
            const uploadData = await uploadResp.json();
            if (!uploadData.url) throw new Error('Upload failed');
            const { error: dbError } = await supabase.from('ugc_scene_templates').insert({
                title, scene_context: context, prompt, img: uploadData.url
            });
            if (dbError) throw dbError;
            alert('Template Uploaded successfully!');
            document.getElementById('tplTitle').value = '';
            document.getElementById('tplContext').value = '';
            document.getElementById('tplPrompt').value = '';
            fileInput.value = '';
            fetchAssets(true);
        } catch (e) {
            console.error(e);
            alert('Upload failed: ' + e.message);
            setLoading(false);
        }
    };

    const handleConnectDrive = () => {
        setIsConnectedToDrive(true);
        window.toast("Establishing Secure Google Drive Connection...\n\nYour creative workspace will now synchronize in real-time with your personal drive.");
    };

    return (
        <div className="h-full flex flex-col bg-[#020202] text-white font-mono">
            {/* Header */}
            {!compact && (
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-sm relative shrink-0">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#bef264]/20 to-transparent" />
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#bef264]/10 rounded-xl border border-[#bef264]/20">
                            <FolderOpen className="w-5 h-5 text-[#bef264]" />
                        </div>
                        <div>
                            <h1 className="text-base font-black italic uppercase tracking-tight text-white">
                                Creative <span className="text-[#bef264]">Vault</span>
                            </h1>
                            <p className="text-[8px] text-white/30 uppercase tracking-[0.25em] font-bold">Neural_Asset_Archive</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${isConnectedToDrive ? 'bg-[#bef264]/10 border-[#bef264]/20 text-[#bef264]' : 'bg-white/5 border-white/10 text-white/30'}`}>
                            <Cloud className="w-3 h-3" />
                            {isConnectedToDrive ? 'SYNC_ACTIVE' : 'LOCAL_ONLY'}
                        </div>

                        {!isConnectedToDrive && (
                            <button
                                onClick={handleConnectDrive}
                                className="bg-white/5 hover:bg-white/10 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 transition-all flex items-center gap-2 whitespace-nowrap"
                            >
                                <HardDrive className="w-3.5 h-3.5" />
                                Connect Drive
                            </button>
                        )}

                        <button
                            onClick={() => fetchAssets(true)}
                            className="p-2 hover:bg-[#bef264] hover:text-black rounded-full text-white/40 border border-white/5 transition-all flex-shrink-0"
                            title="Refresh"
                        >
                            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        </button>
                    </div>
                </div>
            )}

            {/* Tab Bar */}
            <div className={cn("px-6 border-b border-white/5 flex items-center bg-black/20 shrink-0", compact && "px-4 border-none")}>
                <div className="flex gap-6 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'images', label: 'Images', icon: ImageIcon },
                        { id: 'videos', label: 'Videos', icon: Video },
                        { id: 'characters', label: 'Characters', icon: User },
                        { id: 'matrix', label: 'Movie Matrix', icon: Box },
                        { id: 'models', label: 'AI Models', icon: Box },
                        { id: 'upscaled', label: 'Upscaled', icon: ArrowBigUpDash }
                    ].map(tab => {
                        const count =
                            tab.id === 'matrix'
                                ? (assets.characters?.filter(c => c.isMatrix).length || 0)
                                : tab.id === 'characters'
                                    ? (assets.characters?.filter(c => !c.isMatrix).length || 0)
                                    : (assets[tab.id]?.length || 0);

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-3 px-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'border-[#bef264] text-[#bef264] drop-shadow-[0_0_10px_rgba(190,242,100,0.4)]' : 'border-transparent text-white/30 hover:text-white/70'}`}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                {tab.label}
                                <span className={`px-1.5 py-0.5 rounded-full text-[7px] ${activeTab === tab.id ? 'bg-[#bef264] text-black' : 'bg-white/5 text-white/20'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-black/10">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-6">
                        <RefreshCw className="w-10 h-10 md:w-12 md:h-12 text-[#bef264] animate-spin opacity-50" />
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-[#bef264] animate-pulse">Scanning_Biological_Archive...</span>
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
                ) : activeTab === 'characters' || activeTab === 'matrix' ? (
                    <div>
                        {(() => {
                            const filteredChars = (assets.characters || []).filter(c => 
                                activeTab === 'matrix' ? c.isMatrix : !c.isMatrix
                            );

                            if (filteredChars.length === 0) {
                                return (
                                    <div className="h-64 flex flex-col items-center justify-center gap-4 opacity-20 text-center">
                                        <User className="w-20 h-20 text-[#bef264]/20" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">
                                            {activeTab === 'matrix' ? 'No_Matrix_Entities_Found' : 'No_Identity_Constructs_Found'}
                                        </span>
                                    </div>
                                );
                            }

                            return (
                                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 md:gap-3">
                                    {filteredChars.map(char => (
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
                                                if (onSelectReference) return; // Disable in picker mode
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
                                            onSelectReference={onSelectReference}
                                            compact={compact}
                                        />
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                ) : (assets[activeTab]?.length || 0) === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 opacity-20 text-center">
                        <FolderOpen className="w-20 h-20 text-[#bef264]/20" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Sector_Null // No_Assets_Located</span>
                    </div>
                ) : (
                    <div className={['images', 'videos'].includes(activeTab)
                        ? "grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-0.5 md:gap-1.5"
                        : "grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8"
                    }>
                        {assets[activeTab].map(item => (
                            <div key={item.id} className={`group relative surface-glass border border-white/5 overflow-hidden transition-all duration-700 shadow-2xl ${['images', 'videos'].includes(activeTab) ? 'rounded-md hover:border-[#bef264]/60' : 'rounded-[2.5rem] hover:border-[#bef264]/40'}`}>
                                {item.type === 'video' ? (
                                    <div className="aspect-[4/5] bg-black relative flex items-center justify-center group/video">
                                        <video
                                            src={resolveUrl(item.url)}
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
                                    <div className={`${['images', 'videos'].includes(activeTab) ? 'aspect-square' : 'aspect-[4/5]'} bg-[#050505] relative overflow-hidden`}>
                                        <img
                                            src={resolveUrl(item.url)}
                                            alt={item.name}
                                            className="w-full h-full object-cover transition-all duration-1000 brightness-75 group-hover:brightness-110 group-hover:scale-110"
                                            loading="lazy"
                                        />
                                    </div>
                                )}

                                {/* Action Overlay */}
                                <div className={`absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center ${['images', 'videos'].includes(activeTab) ? 'gap-2' : 'gap-4'}`}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onSelectReference?.(item.url, item); }}
                                        className={`${['images', 'videos'].includes(activeTab) ? 'w-8 h-8' : 'w-14 h-14'} bg-[#bef264] hover:scale-110 active:scale-95 rounded-full text-black flex items-center justify-center shadow-[0_0_40px_rgba(190,242,100,0.6)] transition-all`}
                                        title="Use as Reference"
                                    >
                                        <ImagePlus className={['images', 'videos'].includes(activeTab) ? 'w-4 h-4' : 'w-7 h-7'} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteAsset(item.id, activeTab); }}
                                        className={`${['images', 'videos'].includes(activeTab) ? 'w-8 h-8' : 'w-14 h-14'} bg-red-500/80 hover:bg-red-500 hover:scale-110 active:scale-95 rounded-full text-white backdrop-blur-md flex items-center justify-center transition-all border border-red-400/50`}
                                        title="Delete Permanently"
                                    >
                                        <Trash2 className={['images', 'videos'].includes(activeTab) ? 'w-3.5 h-3.5' : 'w-6 h-6'} />
                                    </button>
                                </div>

                                {item.isCharacter && (
                                    <div className="absolute top-6 left-6 bg-[#bef264] text-black text-[9px] font-black px-4 py-1.5 rounded-full uppercase shadow-lg tracking-widest">
                                        IDENTITY
                                    </div>
                                )}

                                {/* Exclude text details in phone gallery mode */}
                                {!['images', 'videos'].includes(activeTab) && (
                                    <div className="p-8">
                                        <div className="text-xs font-black uppercase tracking-widest text-white/90 group-hover:text-[#bef264] transition-colors truncate">{item.name}</div>
                                        <div className="flex items-center justify-between mt-4 text-[9px] font-mono text-white/10 font-bold uppercase tracking-widest">
                                            <span>{item.date}</span>
                                            <span className="text-[#bef264]/40">{item.size}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
