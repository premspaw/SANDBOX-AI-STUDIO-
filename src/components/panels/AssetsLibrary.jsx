import React, { useState, useMemo } from 'react';
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
    Database,
    Play,
    Plus,
    X,
    Layers,
    Sliders
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAppStore, inferStudioFolder } from '../../store';
import { getApiUrl, API_BASE_URL, resolveUrl } from '../../config/apiConfig';
import { LANDING_ASSETS } from '../../config/landingAssets';

const getStudioBadge = (item) => {
    const s = item?.studio || inferStudioFolder(item);
    if (s === 'marketing') return { label: 'Marketing', icon: '🚀', color: 'bg-lime-500/20 text-lime-300 border-lime-500/40 shadow-sm' };
    if (s === 'ugc') return { label: 'UGC Studio', icon: '📱', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm' };
    if (s === 'remix') return { label: 'Remix', icon: '🔄', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm' };
    if (s === 'avatar') return { label: 'Avatar', icon: '👤', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm' };
    return { label: 'Cinema', icon: '🎬', color: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40 shadow-sm' };
};

const API = API_BASE_URL;

const ensureDataUri = (str) => {
    if (!str || typeof str !== 'string') return str;
    if (str.startsWith('http') || str.startsWith('data:') || str.startsWith('blob:') || str.length < 50) return str;
    // If it looks like base64 but missing prefix
    return `data:image/jpeg;base64,${str}`;
};

const parseNameAndAgeFromPrompt = (prompt) => {
    if (!prompt || typeof prompt !== 'string') return null;
    
    let name = '';
    let age = '';
    
    // Match NAME:, NAME/SPECIES:, or SCENE: followed by double quotes, single quotes, or unquoted text
    const nameMatch = prompt.match(/(?:NAME|NAME\/SPECIES|SCENE):\s*"([^"]+)"/i) || 
                      prompt.match(/(?:NAME|NAME\/SPECIES|SCENE):\s*'([^']+)'/i) ||
                      prompt.match(/(?:NAME|NAME\/SPECIES|SCENE):\s*([^·,]+)/i);
                      
    const ageMatch = prompt.match(/AGE:\s*"([^"]+)"/i) || 
                     prompt.match(/AGE:\s*'([^']+)'/i) ||
                     prompt.match(/AGE:\s*([^·,]+)/i);
                     
    if (nameMatch) {
        name = nameMatch[1].split('·')[0].trim();
        name = name.replace(/^["']|["']$/g, '').trim();
        // Remove trailing species parenthetical type from NAME/SPECIES (e.g., "Vortex Serpent (Reptilian)" -> "Vortex Serpent")
        name = name.replace(/\s*\([^)]+\)$/, '').trim();
    }
    
    if (ageMatch) {
        age = ageMatch[1].split('·')[0].trim();
        age = age.replace(/^["']|["']$/g, '').trim();
    }
    
    if (name) {
        const cleanName = name.replace(/[^a-zA-Z0-9\s_-]/g, '').toUpperCase().trim();
        if (
            cleanName === 'CHARACTER' || 
            cleanName === 'OBJECT' || 
            cleanName === 'LOCATION' || 
            cleanName === 'POSE' || 
            cleanName === 'CREATURE' || 
            cleanName === 'SHOT' ||
            cleanName === 'PROP OBJECT' ||
            cleanName === 'SCENIC LOCATION' ||
            cleanName === 'UNTITLED SCENE'
        ) {
            return null;
        }
        
        let cleanAge = '';
        if (age) {
            cleanAge = age.replace(/[^0-9]/g, '').trim();
            if (!cleanAge) {
                cleanAge = age.toUpperCase().trim();
            }
        }
        
        return { name: cleanName, age: cleanAge };
    }
    
    return null;
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
        <div className={`group relative bg-[#050505] border ${isDeleting ? 'border-red-500/30 opacity-50' : 'border-white/5'} rounded-xl overflow-hidden hover:border-[#bef264]/40 transition-all duration-500 shadow-xl flex flex-col aspect-square w-full`}>
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


function VideoThumbnail({ url, className }) {
    if (!url) return null;
    const resolvedUrl = resolveUrl(url);
    return (
        <div className={`relative w-full h-full ${className || ''}`}>
            <video
                src={`${resolvedUrl}#t=0.5`}
                className="w-full h-full object-cover"
                preload="metadata"
                playsInline
                muted
            />
        </div>
    );
}

function MarketingGalleryGrid({ items, onSelectReference, onDelete, compact, onPreview }) {
    const [tab, setTab] = useState('all'); // 'all', 'image', 'video'

    const filtered = items.filter(item => {
        if (tab === 'all') return true;
        return item.type === tab;
    });

    return (
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
            {/* Inner category tabs */}
            <div className="flex gap-2 mb-4">
                {['all', 'image', 'video'].map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${
                            tab === t
                                ? 'bg-[#bef264] text-black'
                                : 'text-white/30 border border-white/10 hover:text-white/60'
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4 opacity-20 text-center select-none">
                    <FolderOpen className="w-20 h-20 text-[#bef264]/20" />
                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">No_Marketing_Assets_Found</span>
                </div>
            ) : (
                <div className={compact
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4"
                    : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6"
                }>
                    {filtered.map((item, idx) => (
                        <div
                            key={item.id}
                            className="relative group rounded-xl overflow-hidden cursor-pointer w-full aspect-[9/16] surface-glass border border-white/5 hover:border-[#bef264]/60 transition-all duration-500 shadow-2xl"
                            onClick={() => onPreview(item)}
                        >
                            {item.type === 'video' ? (
                                <div className="w-full h-full relative bg-black/60 flex items-center justify-center">
                                    <VideoThumbnail url={item.url} className="w-full h-full" />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity duration-200">
                                        <div className="w-10 h-10 rounded-full bg-black/70 border border-white/30 flex items-center justify-center shadow-lg">
                                            <Play size={14} className="text-white fill-white ml-0.5" />
                                        </div>
                                    </div>
                                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded-md pointer-events-none">
                                        <Video size={9} className="text-[#bef264]" />
                                        <span className="text-[7px] text-[#bef264] font-black uppercase">Video</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full relative bg-black/60 flex items-center justify-center overflow-hidden">
                                    <img src={resolveUrl(item.url)} alt={`marketing-gen-${idx}`} className="w-full h-full object-cover transition-all duration-1000 brightness-75 group-hover:brightness-110 group-hover:scale-110" loading="lazy" />
                                </div>
                            )}

                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2.5 z-10">
                                <div className="flex gap-2">
                                    <button
                                        title="Preview"
                                        onClick={e => {
                                            e.stopPropagation();
                                            onPreview(item);
                                        }}
                                        className="w-9 h-9 flex items-center justify-center bg-[#bef264] hover:bg-[#a3d94b] text-black rounded-xl transition-all shadow-lg hover:scale-105 active:scale-95"
                                    >
                                        <Play size={14} className={item.type === 'video' ? "fill-black ml-0.5" : "text-black"} />
                                    </button>
                                    <button
                                        title="Download"
                                        onClick={async e => {
                                            e.stopPropagation();
                                            const ext = item.type === 'video' ? 'mp4' : 'png';
                                            try {
                                                const res = await fetch(resolveUrl(item.url));
                                                const blob = await res.blob();
                                                const blobUrl = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = blobUrl;
                                                a.download = `marketing-${item.id}.${ext}`;
                                                document.body.appendChild(a);
                                                a.click();
                                                document.body.removeChild(a);
                                                URL.revokeObjectURL(blobUrl);
                                            } catch {
                                                const a = document.createElement('a');
                                                a.href = resolveUrl(item.url);
                                                a.download = `marketing-${item.id}.${ext}`;
                                                document.body.appendChild(a);
                                                a.click();
                                                document.body.removeChild(a);
                                            }
                                        }}
                                        className="w-9 h-9 flex items-center justify-center bg-black/80 hover:bg-white/25 rounded-xl text-white text-sm font-black border border-white/20 transition-all shadow-lg"
                                    >
                                        <Download size={14} />
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        title="Use as Reference"
                                        onClick={e => {
                                            e.stopPropagation();
                                            onSelectReference?.(item.url, item);
                                        }}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl border bg-black/80 hover:bg-[#bef264] hover:text-black hover:border-[#bef264] border-white/20 text-white transition-all shadow-lg text-[8px] font-black uppercase tracking-wider"
                                    >
                                        <Plus size={10} /> Use Reference
                                    </button>
                                    <button
                                        title="Delete"
                                        onClick={e => {
                                            e.stopPropagation();
                                            onDelete(item.id);
                                        }}
                                        className="w-9 h-9 flex items-center justify-center bg-red-500/80 hover:bg-red-500 rounded-xl text-white border border-red-400/50 transition-all shadow-lg"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function Lightbox({ item, onClose }) {
    if (!item) return null;
    const resolvedUrl = item.url.startsWith('http') || item.url.startsWith('data:') || item.url.startsWith('blob:') ? item.url : resolveUrl(item.url);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4" onClick={onClose}>
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white transition-all z-50"
            >
                <X size={20} />
            </button>
            <div className="relative max-w-full max-h-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                {item.type === 'video' ? (
                    <video 
                        src={resolvedUrl}
                        controls
                        autoPlay
                        className="max-w-[95vw] max-h-[85vh] rounded-lg shadow-2xl object-contain border border-white/10"
                    />
                ) : (
                    <img 
                        src={resolvedUrl}
                        alt="marketing-preview"
                        className="max-w-[95vw] max-h-[85vh] rounded-lg shadow-2xl object-contain border border-white/10"
                    />
                )}
                {item.prompt && (
                    <div className="mt-4 max-w-2xl text-center bg-black/60 border border-white/5 rounded-xl px-4 py-3">
                        <p className="text-[10px] text-white/50 font-mono uppercase tracking-widest mb-1">Generated Prompt</p>
                        <p className="text-xs text-white/80 font-mono leading-relaxed">{item.prompt}</p>
                    </div>
                )}
            </div>
        </div>
    );
}


export function AssetsLibrary({ compact = false, onSelectReference, setActiveTab: setAppTab, defaultTab = 'all' }) {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [selectedStudio, setSelectedStudio] = useState('all'); // 'all' | 'cinema' | 'ugc' | 'marketing' | 'remix' | 'avatar'
    const [viewMode, setViewMode] = useState('grid');
    const [isConnectedToDrive, setIsConnectedToDrive] = useState(false);
    const { cachedAssets, cachedAssetsUserId, setCachedAssets, userProfile, unifiedGallery } = useAppStore();
    const [assets, setAssets] = useState({
        all: [],
        images: [],
        videos: [],
        models: [],
        upscaled: [],
        characters: [],
        landing: [],
        templates: [],
        marketing: []
    });

    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [lightboxItem, setLightboxItem] = useState(null);

    const [loadedGroups, setLoadedGroups] = useState({
        standard: false, // images, videos, upscaled
        characters: false // characters, matrix
    });

    const getTargetUser = async () => {
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
        return targetUser;
    };

    const fetchStandardAssets = async (force = false) => {
        const targetUser = await getTargetUser();
        
        // Cache check
        if (!force && loadedGroups.standard && cachedAssets && cachedAssetsUserId === targetUser?.id) {
            setLoading(false);
            return;
        }

        console.log(`AssetsLibrary: fetchStandardAssets starting for User ${targetUser?.id}...`);
        setLoading(true);
        try {
            const response = await fetch(getApiUrl(`/api/list-assets?userId=${targetUser.id}`));
            const data = await response.json();
            
            const deletedSet = (() => {
                try {
                    return new Set(JSON.parse(localStorage.getItem('zerolens_deleted_assets_v1') || '[]'));
                } catch (_) {
                    return new Set();
                }
            })();
            const allAssets = (data.assets || []).filter(a => {
                if (!a) return false;
                if (a.is_deleted || a.metadata?.is_deleted || a.metadata?.deleted_by_user) return false;
                if (deletedSet.has(a.url) || deletedSet.has(String(a.id))) return false;
                return true;
            });

            const dbImages = allAssets.filter(a => a.type === 'image').map(a => {
                let displayName = a.name;
                if (!displayName || displayName === 'CHARACTER Target' || displayName.toUpperCase().endsWith(' TARGET')) {
                    const boardType = a.metadata?.boardType || 'Image';
                    const extracted = parseNameAndAgeFromPrompt(a.metadata?.prompt || a.prompt);
                    if (extracted) {
                        displayName = `${extracted.name} — ${boardType} Board`;
                    } else {
                        displayName = boardType ? `${boardType} Board` : 'Generated Board';
                    }
                }
                return {
                    ...a,
                    name: displayName,
                    studio: inferStudioFolder(a)
                };
            });
            const dbVideos = allAssets.filter(a => a.type === 'video').map(a => ({
                ...a,
                studio: inferStudioFolder(a)
            }));
            const dbUpscaled = allAssets.filter(a => (a.type === 'upscaled' || a.type === 'upscale')).map(a => ({
                ...a,
                studio: inferStudioFolder(a)
            }));
            const dbMarketing = allAssets.filter(a => inferStudioFolder(a) === 'marketing').map(a => ({
                ...a,
                studio: 'marketing'
            }));

            let avatarStudioImages = [];
            try {
                if (supabase) {
                    const { data: avatarData } = await supabase
                        .from('avatar_generations')
                        .select('*')
                        .eq('user_id', targetUser.id)
                        .order('created_at', { ascending: false });
                    if (avatarData) {
                        avatarStudioImages = avatarData
                            .filter(a => a.type?.toUpperCase() !== 'CHARACTER')
                            .map(a => {
                                let displayName = a.character_name;
                                if (!displayName || displayName === 'CHARACTER Target' || displayName.toUpperCase().endsWith(' TARGET')) {
                                    const extracted = parseNameAndAgeFromPrompt(a.prompt);
                                    if (extracted) {
                                        displayName = `${extracted.name} — ${a.type} Board`;
                                    } else {
                                        displayName = `${a.type} Board`;
                                    }
                                }
                                return {
                                    id: a.id,
                                    type: 'image',
                                    name: displayName || 'Generated Board',
                                    url: a.output_url,
                                    image: a.output_url,
                                    date: a.created_at ? new Date(a.created_at).toISOString().split('T')[0] : 'Recently',
                                    size: 'N/A',
                                    isAvatarStudio: true,
                                    studio: 'avatar',
                                    rawData: a
                                };
                            });
                    }
                }
            } catch (err) {
                console.warn('[Assets Library] Failed to fetch generated avatars for standard assets:', err);
            }

            const allCombined = [...avatarStudioImages, ...dbImages, ...dbVideos, ...dbUpscaled];
            const seenUrls = new Set();
            const dedupedAll = [];
            allCombined.forEach(item => {
                if (!item?.url || seenUrls.has(item.url)) return;
                seenUrls.add(item.url);
                dedupedAll.push(item);
            });

            setAssets(prev => {
                const updated = {
                    ...prev,
                    all: dedupedAll,
                    images: [...avatarStudioImages, ...dbImages],
                    videos: dbVideos,
                    upscaled: dbUpscaled,
                    marketing: dbMarketing
                };
                setTimeout(() => setCachedAssets(updated, targetUser?.id), 0);
                return updated;
            });

            setLoadedGroups(prev => ({ ...prev, standard: true }));
        } catch (err) {
            console.error("fetchStandardAssets failed:", err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchCharacterAssets = async (force = false) => {
        const targetUser = await getTargetUser();
        
        // Cache check
        if (!force && loadedGroups.characters && cachedAssets && cachedAssetsUserId === targetUser?.id) {
            setLoading(false);
            return;
        }

        console.log(`AssetsLibrary: fetchCharacterAssets starting for User ${targetUser?.id}...`);
        setLoading(true);
        try {
            const response = await fetch(getApiUrl(`/api/list-assets?userId=${targetUser.id}`));
            const data = await response.json();
            
            let dbCharacterAssets = [];
            if (response.ok && data.assets) {
                dbCharacterAssets = data.assets.filter(a => a.type === 'character').map(a => {
                    let displayName = a.name;
                    if (!displayName || displayName === 'CHARACTER Target' || displayName.toUpperCase() === 'CHARACTER TARGET') {
                        const extracted = parseNameAndAgeFromPrompt(a.metadata?.prompt);
                        if (extracted) {
                            displayName = extracted.age ? `NAME: ${extracted.name}, AGE: ${extracted.age}` : `NAME: ${extracted.name}`;
                        }
                    }
                    return {
                        id: a.id,
                        type: "character",
                        name: displayName || "Saved Character",
                        visualStyle: a.metadata?.visualStyle || a.metadata?.style || 'Cinematic',
                        anchorImage: a.url,
                        url: a.url,
                        image: a.url,
                        date: a.date || 'Recently',
                        isCharacter: true,
                        isAvatarStudio: true,
                        rawData: a
                    };
                });
            }

            const charResponse = await fetch(getApiUrl(`/api/list-characters?userId=${targetUser.id}`));
            const charData = await charResponse.json();
            const dbCharacters = charData.characters || [];

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
                console.warn('[Assets Library] Failed to fetch generated avatars for character assets:', err);
            }

            const normalizedCharacters = (dbCharacters || []).map(c => {
                let anchor = c.image || c.anchor_image || c.identity_kit?.anchor || c.identityKit?.anchor || '';
                anchor = ensureDataUri(anchor);
                return {
                    id: c.id,
                    type: "character",
                    name: c.name || "UNNAMED_CONSTRUCT",
                    visualStyle: c.visual_style || c.visualStyle || 'Realistic',
                    anchorImage: anchor,
                    url: anchor,
                    image: anchor,
                    date: c.timestamp ? new Date(c.timestamp).toISOString().split('T')[0] : 'Recently',
                    isCharacter: true,
                    isMatrix: !!(c.identity_kit?.matrix || c.identityKit?.matrix),
                    rawData: c
                };
            });

            const normalizedAvatars = dbAvatars
                .filter(a => a.type?.toUpperCase() === 'CHARACTER')
                .map(a => {
                    let displayName = a.character_name;
                    if (!displayName || displayName === 'CHARACTER Target' || displayName.toUpperCase() === 'CHARACTER TARGET') {
                        const extracted = parseNameAndAgeFromPrompt(a.prompt);
                        if (extracted) {
                            displayName = extracted.age ? `NAME: ${extracted.name}, AGE: ${extracted.age}` : `NAME: ${extracted.name}`;
                        }
                    }
                    return {
                        id: a.id,
                        type: "character",
                        name: displayName || "Generated Avatar",
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
                            name: displayName,
                            image: a.output_url,
                            visual_style: a.style
                        }
                    };
                });

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

            const finalCharacters = [...normalizedCharacters, ...normalizedAvatars];
            
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

            finalCharacters.sort((x, y) => {
                const getMs = (item) => {
                    const raw = item.rawData || {};
                    const ts = raw.created_at || raw.timestamp || item.date || 0;
                    if (!ts || ts === 'Recently' || ts === 'Active') return 0;
                    return new Date(ts).getTime() || 0;
                };
                return getMs(y) - getMs(x);
            });

            setAssets(prev => {
                const updated = {
                    ...prev,
                    characters: finalCharacters
                };
                setTimeout(() => setCachedAssets(updated, targetUser?.id), 0);
                return updated;
            });

            setLoadedGroups(prev => ({ ...prev, characters: true }));
        } catch (err) {
            console.error("fetchCharacterAssets failed:", err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchAssets = async (force = false) => {
        const isCharTab = activeTab === 'characters' || activeTab === 'matrix';
        const isModelsTab = activeTab === 'models';
        
        if (isModelsTab) {
            setLoading(false);
            return;
        }

        if (force) {
            if (isCharTab) {
                setLoadedGroups(prev => ({ ...prev, characters: false }));
                await fetchCharacterAssets(true);
            } else {
                setLoadedGroups(prev => ({ ...prev, standard: false }));
                await fetchStandardAssets(true);
            }
        } else {
            if (isCharTab) {
                await fetchCharacterAssets(false);
            } else {
                await fetchStandardAssets(false);
            }
        }
    };

    React.useEffect(() => {
        fetchAssets(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

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
        if (!window.confirm("Remove this asset from your creative gallery?")) return;
        
        try {
            const targetAsset = (assets[tab] || assets.all || []).find(a => a.id === id);
            const targetUrl = targetAsset?.url;
            const idStr = String(id || '');

            // 1. Record in global persistent deleted storage so it never comes back
            try {
                const deleted = JSON.parse(localStorage.getItem('zerolens_deleted_assets_v1') || '[]');
                if (targetUrl && !deleted.includes(targetUrl)) deleted.push(targetUrl);
                if (idStr && !deleted.includes(idStr)) deleted.push(idStr);
                localStorage.setItem('zerolens_deleted_assets_v1', JSON.stringify(deleted.slice(-500)));
            } catch (_) {
                void 0;
            }

            // 2. Remove from unified gallery store
            try {
                useAppStore.getState().removeUnifiedAsset(idStr, targetUrl);
            } catch (_) {
                void 0;
            }

            // 3. Notify backend /api/delete-asset to update local_assets.json & DB
            try {
                fetch(getApiUrl(`/api/delete-asset/${encodeURIComponent(idStr)}?url=${encodeURIComponent(targetUrl || '')}`), {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: idStr, url: targetUrl })
                }).catch(err => console.warn('[AssetsLibrary] API delete warning:', err.message));
            } catch (_) {
                void 0;
            }

            // 4. Update Supabase: soft-delete to retain audit logs while hiding from gallery
            if (supabase) {
                if (!isNaN(Number(id))) {
                    await supabase.from('assets').update({
                        metadata: { ...(targetAsset?.metadata || {}), is_deleted: true, deleted_by_user: true, deleted_at: new Date().toISOString() }
                    }).eq('id', Number(id)).catch(() => {});
                }
                if (targetUrl) {
                    await supabase.from('assets').update({
                        metadata: { ...(targetAsset?.metadata || {}), is_deleted: true, deleted_by_user: true, deleted_at: new Date().toISOString() }
                    }).eq('url', targetUrl).catch(() => {});
                }
            }

            // 5. Update local state across all tabs
            setAssets(prev => {
                const next = { ...prev };
                ['all', 'images', 'videos', 'marketing', 'upscaled', 'characters'].forEach(k => {
                    if (Array.isArray(next[k])) {
                        next[k] = next[k].filter(a => a.id !== id && (!targetUrl || a.url !== targetUrl));
                    }
                });
                return next;
            });
            
            // 6. Update cache
            if (cachedAssets) {
                const updatedCached = { ...cachedAssets };
                ['all', 'images', 'videos', 'marketing', 'upscaled', 'characters'].forEach(k => {
                    if (Array.isArray(updatedCached[k])) {
                        updatedCached[k] = updatedCached[k].filter(a => a.id !== id && (!targetUrl || a.url !== targetUrl));
                    }
                });
                setCachedAssets(updatedCached);
            }
        } catch (err) {
            console.error("Delete asset failed:", err);
            alert("Failed to delete asset. " + err.message);
        }
    };

    const activeMediaItems = useMemo(() => {
        let baseList = [];
        if (activeTab === 'all') {
            baseList = assets.all || [];
        } else if (activeTab === 'images') {
            baseList = assets.images || [];
        } else if (activeTab === 'videos') {
            baseList = assets.videos || [];
        } else if (activeTab === 'marketing') {
            baseList = assets.marketing || [];
        } else if (activeTab === 'upscaled') {
            baseList = assets.upscaled || [];
        } else {
            baseList = assets[activeTab] || [];
        }

        // Merge any live generations from unifiedGallery not already present
        if (Array.isArray(unifiedGallery) && unifiedGallery.length > 0) {
            const knownUrls = new Set(baseList.map(b => b.url || b.image));
            const extra = [];
            unifiedGallery.forEach(ug => {
                if (!ug || !ug.url) return;
                if (knownUrls.has(ug.url)) return;
                const ugStudio = ug.studio || inferStudioFolder(ug);
                const ugType = ug.type || (ug.url.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image');
                
                if (activeTab === 'all') {
                    extra.push({ ...ug, studio: ugStudio, type: ugType });
                } else if (activeTab === 'images' && ugType === 'image') {
                    extra.push({ ...ug, studio: ugStudio, type: 'image' });
                } else if (activeTab === 'videos' && ugType === 'video') {
                    extra.push({ ...ug, studio: ugStudio, type: 'video' });
                } else if (activeTab === 'marketing' && ugStudio === 'marketing') {
                    extra.push({ ...ug, studio: 'marketing', type: ugType });
                }
            });
            if (extra.length > 0) {
                baseList = [...extra, ...baseList];
            }
        }

        return baseList;
    }, [activeTab, assets, unifiedGallery]);

    const studioCounts = useMemo(() => {
        const counts = { all: activeMediaItems.length, cinema: 0, marketing: 0, ugc: 0, remix: 0, avatar: 0 };
        activeMediaItems.forEach(item => {
            const s = item.studio || inferStudioFolder(item);
            if (counts[s] !== undefined) counts[s]++;
        });
        return counts;
    }, [activeMediaItems]);

    const displayedItems = useMemo(() => {
        if (selectedStudio === 'all') return activeMediaItems;
        return activeMediaItems.filter(item => {
            const s = item.studio || inferStudioFolder(item);
            return s === selectedStudio;
        });
    }, [activeMediaItems, selectedStudio]);

    const tabs = [
        { id: 'all', label: 'All Media', icon: Layers },
        { id: 'images', label: 'Images', icon: ImageIcon },
        { id: 'videos', label: 'Videos', icon: Video },
        { id: 'characters', label: 'Characters', icon: User },
        { id: 'marketing', label: 'Marketing', icon: Bot },
        { id: 'matrix', label: 'Movie Matrix', icon: Box },
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
        <div className="h-full flex flex-col bg-[#020202] text-white font-mono min-h-0 flex-1">
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

            {/* 90-Day Retention Notice */}
            <div className="mx-6 mt-3 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <span>
                        <strong className="text-amber-200">Storage Retention Notice:</strong> Generated media is retained for <strong>90 days</strong> and then automatically deleted. Please download creations to your local drive. (Reminder alerts shown within 15 days of auto-cleanup).
                    </span>
                </div>
            </div>

            {/* Tab Bar */}
            <div className={cn("px-6 border-b border-white/5 flex items-center bg-black/20 shrink-0", compact && "px-4 border-none")}>
                <div className="flex gap-6 overflow-x-auto no-scrollbar">
                    {tabs.map(tab => {
                        const count =
                            tab.id === 'all'
                                ? (assets.all?.length || 0)
                                : tab.id === 'matrix'
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

            {/* Studio Filter Bar */}
            {['all', 'images', 'videos', 'upscaled'].includes(activeTab) && (
                <div className={cn("px-6 py-2.5 border-b border-white/5 bg-black/40 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0", compact && "px-4")}>
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-white/40 mr-2 shrink-0">
                        <Sliders className="w-3 h-3 text-[#bef264]" />
                        <span>Studio:</span>
                    </div>
                    {[
                        { id: 'all', label: 'All Studios', icon: '🌌' },
                        { id: 'cinema', label: 'Cinema Studio', icon: '🎬' },
                        { id: 'marketing', label: 'Marketing Studio', icon: '🚀' },
                        { id: 'ugc', label: 'UGC Studio', icon: '📱' },
                        { id: 'remix', label: 'Remix Studio', icon: '🔄' },
                        { id: 'avatar', label: 'Avatar Studio', icon: '👤' },
                    ].map(st => {
                        const isSel = selectedStudio === st.id;
                        const cnt = studioCounts[st.id] ?? 0;
                        return (
                            <button
                                key={st.id}
                                onClick={() => setSelectedStudio(st.id)}
                                className={cn(
                                    "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap border shrink-0",
                                    isSel
                                        ? "bg-[#bef264] text-black border-[#bef264] shadow-[0_0_12px_rgba(190,242,100,0.35)]"
                                        : "bg-white/5 text-white/40 border-white/10 hover:text-white/80 hover:border-white/20"
                                )}
                            >
                                <span>{st.icon}</span>
                                <span>{st.label}</span>
                                <span className={cn(
                                    "px-1.5 py-0.2 rounded-full text-[7.5px] font-mono",
                                    isSel ? "bg-black/20 text-black font-black" : "bg-white/5 text-white/30"
                                )}>
                                    {cnt}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

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
                ) : activeTab === 'marketing' ? (
                    <MarketingGalleryGrid
                        items={assets.marketing || []}
                        onSelectReference={onSelectReference}
                        onDelete={(id) => handleDeleteAsset(id, 'marketing')}
                        compact={compact}
                        onPreview={setLightboxItem}
                    />
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
                                <div className={compact
                                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4"
                                    : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6"
                                }>
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
                ) : (displayedItems?.length || 0) === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 opacity-20 text-center">
                        <FolderOpen className="w-20 h-20 text-[#bef264]/20" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Sector_Null // No_Assets_Located</span>
                    </div>
                ) : (
                    <div className={['all', 'images', 'videos'].includes(activeTab)
                        ? (compact 
                            ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3"
                            : "grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 md:gap-4")
                        : (compact
                            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4"
                            : "grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8")
                    }>
                        {displayedItems.map(item => (
                            <div 
                                key={item.id || item.url} 
                                onClick={() => setLightboxItem(item)}
                                className="group relative surface-glass border border-white/5 overflow-hidden transition-all duration-700 shadow-2xl rounded-xl hover:border-[#bef264]/60 aspect-[9/16] cursor-pointer"
                            >
                                {/* Studio Origin Badge */}
                                {(() => {
                                    const badge = getStudioBadge(item);
                                    return (
                                        <div className={cn(
                                            "absolute top-2 left-2 z-20 px-2 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-wider border backdrop-blur-md flex items-center gap-1 pointer-events-none transition-transform duration-300 group-hover:scale-105",
                                            badge.color
                                        )}>
                                            <span>{badge.icon}</span>
                                            <span>{badge.label}</span>
                                        </div>
                                    );
                                })()}

                                {item.type === 'video' ? (
                                    <div className="w-full h-full bg-black relative flex items-center justify-center group/video">
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
                                        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded-md pointer-events-none z-10">
                                            <Video size={9} className="text-[#bef264]" />
                                            <span className="text-[7px] text-[#bef264] font-black uppercase">Video</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full h-full bg-[#050505] relative overflow-hidden">
                                        <img
                                            src={resolveUrl(item.url)}
                                            alt={item.name}
                                            className="w-full h-full object-cover transition-all duration-1000 brightness-75 group-hover:brightness-110 group-hover:scale-110"
                                            loading="lazy"
                                        />
                                    </div>
                                )}

                                {item.name && item.name !== 'Generated Board' && !item.name.startsWith('http') && (
                                    <div className="absolute bottom-0 inset-x-0 p-3 pt-6 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10 pointer-events-none">
                                        <p className="text-[9px] font-black uppercase text-white truncate drop-shadow-md tracking-wider">
                                            {item.name}
                                        </p>
                                    </div>
                                )}

                                {/* Action Overlay */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2.5 z-30">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onSelectReference?.(item.url, item); }}
                                        className="w-9 h-9 bg-[#bef264] hover:scale-110 active:scale-95 rounded-full text-black flex items-center justify-center shadow-[0_0_20px_rgba(190,242,100,0.5)] transition-all"
                                        title="Use as Reference"
                                    >
                                        <ImagePlus size={15} />
                                    </button>
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            const ext = item.type === 'video' ? 'mp4' : 'png';
                                            try {
                                                const res = await fetch(resolveUrl(item.url));
                                                const blob = await res.blob();
                                                const blobUrl = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = blobUrl;
                                                a.download = `asset-${item.id || 'export'}.${ext}`;
                                                document.body.appendChild(a);
                                                a.click();
                                                document.body.removeChild(a);
                                                URL.revokeObjectURL(blobUrl);
                                            } catch {
                                                const a = document.createElement('a');
                                                a.href = resolveUrl(item.url);
                                                a.download = `asset-${item.id || 'export'}.${ext}`;
                                                document.body.appendChild(a);
                                                a.click();
                                                document.body.removeChild(a);
                                            }
                                        }}
                                        className="w-9 h-9 bg-black/80 hover:bg-white/25 rounded-full text-white backdrop-blur-md flex items-center justify-center transition-all border border-white/20"
                                        title="Download"
                                    >
                                        <Download size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteAsset(item.id, activeTab); }}
                                        className="w-9 h-9 bg-red-500/80 hover:bg-red-500 hover:scale-110 active:scale-95 rounded-full text-white backdrop-blur-md flex items-center justify-center transition-all border border-red-400/50"
                                        title="Delete Permanently"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                {item.isCharacter && (
                                    <div className="absolute top-6 left-6 bg-[#bef264] text-black text-[9px] font-black px-4 py-1.5 rounded-full uppercase shadow-lg tracking-widest">
                                        IDENTITY
                                    </div>
                                )}

                                {/* Exclude text details in phone gallery mode */}
                                {!['all', 'images', 'videos'].includes(activeTab) && (
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
                )
            }</div>
            {lightboxItem && (
                <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />
            )}
        </div>
    );
}
