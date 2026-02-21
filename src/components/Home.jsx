import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import {
    Play,
    Plus,
    Search,
    Filter,
    Download,
    Share2,
    MoreVertical,
    Maximize2,
    Lock,
    Zap,
    Box,
    AlertTriangle
} from 'lucide-react';
import { useAppStore } from '../store';

const API = 'http://localhost:3001';

const CATEGORIES = [
    { id: 'all', label: 'ALL' },
    { id: 'characters', label: 'MY CHARACTERS' },
    { id: 'cinematic', label: 'CINEMATIC REELS' },
    { id: 'lifestyle', label: 'LIFESTYLE SHOTS' },
    { id: 'commercial', label: 'COMMERCIALS' }
];

export function Home({ setActiveTab }) {
    const [media, setMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchMedia = async () => {
        console.log("Home: fetchMedia starting [PROXY_SERVER_MODE]...");
        setLoading(true);
        try {
            let dbImages = [];
            let dbCharacters = [];

            // 1. Fetch Assets via Proxy
            try {
                const assetResp = await fetch(`${API}/api/list-assets`);
                const assetData = await assetResp.json();
                dbImages = assetData.images || [];
            } catch (e) {
                console.error("Home: Proxy Assets Fetch Error", e);
            }

            // 2. Fetch Characters via Proxy
            try {
                const charResp = await fetch(`${API}/api/list-characters`);
                const charData = await charResp.json();
                dbCharacters = charData.characters || [];
            } catch (e) {
                console.error("Home: Proxy Characters Fetch Error", e);
            }

            // If proxy failed or returned nothing, and we have direct access (rare if DNS failing),
            // then only then try direct fallback.
            if (dbImages.length === 0 && dbCharacters.length === 0 && supabase) {
                console.log("Home: Proxy returned no data, attempting direct Supabase fallback...");
                // Note: We skip complex timing and just try if we have the client
                try {
                    const { data: assetData } = await supabase.from('assets').select('*').limit(20);
                    const { data: charData } = await supabase.from('characters').select('*').limit(10);
                    if (assetData) dbImages = assetData.filter(a => a.type === 'image');
                    if (charData) dbCharacters = charData;
                } catch (fallbackErr) {
                    console.warn("Home: Direct fallback failed:", fallbackErr);
                }
            }

            const formattedAssets = (dbImages || []).map((a, i) => ({
                id: a.id,
                type: a.type || 'image',
                url: a.url,
                name: a.name || 'UNNAMED_CONSTRUCT',
                date: a.date || 'RECENT',
                category: ['cinematic', 'lifestyle', 'commercial'][i % 3],
                author: "ALPHA_GEN",
                format: a.type === 'video' ? '4K_REEL' : 'HD_FRAME'
            }));

            const formattedCharacters = (dbCharacters || []).map(c => ({
                id: c.id,
                type: 'image',
                url: c.anchorImage || c.image || '',
                name: c.name || 'ANONYMOUS',
                date: c.date || 'RECENT',
                category: 'characters',
                author: "IDENTITY_FORGE",
                format: "PROFILE_GEN",
                isCharacter: true,
                origin: c.origin || 'UNKNOWN_ORIGIN',
                age: c.rawData?.age || '??'
            }));

            const merged = [...formattedCharacters, ...formattedAssets].sort((a, b) =>
                new Date(b.date) - new Date(a.date)
            );

            setMedia(merged);
            console.log("Home: Media state updated via Proxy.");
        } catch (e) {
            console.error("Home: Critical Fetch Error", e);
            const mockMedia = Array.from({ length: 12 }).map((_, i) => ({
                id: `mock-${i}`,
                type: i % 3 === 0 ? 'video' : 'image',
                url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800",
                name: `CONSTRUCT_0${i}`,
                date: '02.20.2026',
                category: CATEGORIES[1 + (i % 4)].id,
                author: "SYS_NULL",
                format: i % 3 === 0 ? '4K' : 'RAW'
            }));
            setMedia(mockMedia);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMedia();
    }, []);

    const filteredMedia = media.filter(m =>
        (filter === 'all' || m.category === filter) &&
        (m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white pb-20 font-mono selection:bg-[#bef264] selection:text-black">
            {/* HERO ACTION HEADER */}
            <header className="pt-32 pb-12 px-6 lg:px-12 relative overflow-hidden">
                {/* Background Glows (Anti-Gravity) */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#bef264]/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00f2ff]/5 blur-[120px] rounded-full pointer-events-none" />

                <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row items-end justify-between gap-8 relative z-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-[#bef264] shadow-[0_0_20px_#bef264]" />
                            <h2 className="text-[10px] font-black tracking-[0.5em] text-[#bef264] uppercase animate-pulse">Neural_Global_Archive // v3.1</h2>
                        </div>
                        <h1 className="text-7xl md:text-9xl font-black italic tracking-tighter leading-[0.85] uppercase">
                            Global <br /> <span className="text-transparent border-t-2 border-b-2 border-white/5 px-4 bg-clip-text bg-gradient-to-r from-white via-white/40 to-white/10">Archive</span>
                        </h1>
                    </div>

                    <div className="flex flex-col items-end gap-6">
                        <button
                            onClick={() => setActiveTab('creator')}
                            className="group relative px-12 py-7 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_80px_rgba(255,255,255,0.15)] overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-[#bef264] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                            <div className="relative flex items-center gap-4">
                                <Plus size={24} strokeWidth={4} className="group-hover:rotate-90 transition-transform duration-500" />
                                <span className="text-xs font-black uppercase tracking-[0.25em] relative block">
                                    [ INITIALIZE NEW CONSTRUCT ]
                                </span>
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* CATEGORY FILTERS & SEARCH */}
            <div className="sticky top-20 z-40 px-6 lg:px-12 py-8 pointer-events-none">
                <div className="max-w-screen-2xl mx-auto flex flex-wrap items-center justify-center gap-4 pointer-events-auto">
                    <div className="flex p-2 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl surface-glass">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setFilter(cat.id)}
                                className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filter === cat.id ? 'bg-[#bef264] text-black shadow-[0_0_30px_rgba(190,242,100,0.5)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="QUERY_ARCHIVE..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-full px-8 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:border-[#bef264] w-56 focus:w-80 transition-all surface-glass"
                        />
                        <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-[#bef264] transition-colors" size={16} />
                    </div>
                </div>
            </div>

            {/* MASONRY MEDIA GRID */}
            <main className="max-w-screen-2xl mx-auto px-6 lg:px-12 pb-32">
                {loading ? (
                    <div className="h-[50vh] flex flex-col items-center justify-center gap-8">
                        <div className="w-20 h-20 border-2 border-[#bef264]/10 border-t-[#bef264] rounded-full animate-spin shadow-[0_0_40px_rgba(190,242,100,0.2)]" />
                        <span className="text-[11px] uppercase font-black tracking-[0.5em] text-[#bef264] animate-pulse">Syncing_Neural_Frequencies...</span>
                    </div>
                ) : filteredMedia.length === 0 ? (
                    /* EMPTY STATE */
                    <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-10">
                        <div className="relative w-40 h-40">
                            <motion.div
                                animate={{ rotateX: 360, rotateZ: 360 }}
                                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                className="w-full h-full border-2 border-white/5 relative preserve-3d"
                            >
                                <div className="absolute inset-0 border border-[#bef264]/30" />
                                <div className="absolute inset-0 border border-[#00f2ff]/20 rotate-45 scale-75" />
                                <Box className="absolute inset-0 m-auto text-[#bef264]/40" size={64} />
                            </motion.div>
                            <div className="absolute inset-0 blur-[60px] bg-[#bef264]/10 rounded-full animate-pulse" />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white/80">Vault_Uninitialized</h3>
                            <p className="text-white/20 text-[11px] tracking-[0.3em] uppercase">No active identities or assets detected in primary sector.</p>
                        </div>
                        <button
                            onClick={() => setActiveTab('creator')}
                            className="bg-[#bef264]/5 border border-[#bef264]/20 px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-[#bef264] hover:text-black transition-all shadow-[0_0_40px_rgba(190,242,100,0.1)]"
                        >
                            EXECUTE_FIRST_INITIALIZER
                        </button>
                    </div>
                ) : (
                    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-8 space-y-8">
                        {filteredMedia.map((item, i) => (
                            <MemoryCrystal key={item.id} item={item} />
                        ))}
                    </div>
                )}
            </main>

            {/* CUSTON NANO SCROLLBAR STYLES */}
            <style>{`
                ::-webkit-scrollbar {
                  width: 2px;
                }
                ::-webkit-scrollbar-track {
                  background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                  background: #bef26430;
                  border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb:hover {
                  background: #bef26460;
                }
            `}</style>
        </div>
    );
}

function MemoryCrystal({ item }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="break-inside-avoid group relative rounded-[2rem] overflow-hidden bg-[#0a0a0a] border border-white/5 hover:border-[#bef264]/40 transition-all duration-700 cursor-pointer surface-glass shadow-2xl"
        >
            {/* Visual content */}
            <div className="relative aspect-[4/5] overflow-hidden">
                {item.type === 'video' ? (
                    <video
                        src={item.url}
                        muted
                        loop
                        autoPlay={isHovered}
                        className="w-full h-full object-cover transition-all duration-1000 brightness-[0.8] group-hover:brightness-110 group-hover:scale-110"
                    />
                ) : (
                    <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-cover transition-all duration-1000 brightness-[0.8] group-hover:brightness-110 group-hover:scale-110"
                    />
                )}

                {/* Cyber Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-transparent opacity-80" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                {/* Badges (Glassmorphism) */}
                <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
                    <div className={`px-3 py-1 text-[8px] font-black uppercase rounded-full tracking-[0.2em] backdrop-blur-md border ${item.isCharacter
                        ? 'bg-[#bef264]/20 border-[#bef264]/20 text-[#bef264]'
                        : 'bg-white/10 border-white/10 text-white/70'
                        }`}>
                        {item.category}
                    </div>
                </div>

                {/* Performance Stats/Format */}
                <div className="absolute top-6 right-6 z-20">
                    <div className="px-2 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg text-[7px] font-mono text-white/40 group-hover:text-[#bef264] transition-colors">
                        {item.format}
                    </div>
                </div>

                {/* Centered Action Button */}
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.3)] z-30"
                        >
                            <Maximize2 size={24} strokeWidth={2.5} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Metadata Footer */}
            <div className="p-6 space-y-4 relative z-10">
                <div className="flex justify-between items-start">
                    <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black uppercase tracking-[0.1em] text-white/90 group-hover:text-[#bef264] transition-colors truncate">
                                {item.name}
                            </h4>
                            {item.isCharacter && <Zap size={10} className="text-[#bef264] animate-pulse" />}
                        </div>

                        {item.isCharacter ? (
                            <div className="flex items-center gap-3 text-[9px] text-white/30 font-bold tracking-widest uppercase">
                                <span>{item.origin}</span>
                                <div className="w-1 h-1 bg-white/20 rounded-full" />
                                <span>{item.age} Earth Yrs</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Box size={10} className="text-white/20" />
                                <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">{item.author}</span>
                            </div>
                        )}
                    </div>
                    <span className="text-[9px] font-mono text-white/10 mt-1">{item.date}</span>
                </div>

                {/* Interaction Strip */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5 group-hover:border-[#bef264]/10 transition-colors">
                    <div className="flex gap-4">
                        <Download size={16} className="text-white/20 hover:text-white transition-colors" />
                        <Share2 size={16} className="text-white/20 hover:text-white transition-colors" />
                    </div>
                    <MoreVertical size={16} className="text-white/10 hover:text-white transition-colors" />
                </div>
            </div>

            {/* Hover Glow Edge */}
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#bef264]/0 to-transparent group-hover:via-[#bef264]/50 transition-all duration-700" />
        </motion.div>
    );
}
