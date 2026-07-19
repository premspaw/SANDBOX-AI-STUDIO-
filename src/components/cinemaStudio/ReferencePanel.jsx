import React, { useRef } from 'react';
import { Sparkles, X, Upload, ImagePlus, Save, Video, Music, Film, Info, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AssetsLibrary } from '../panels/AssetsLibrary';
import { REF_CATEGORIES, SEEDANCE_REF_CATEGORIES, OMNI_REF_CATEGORIES } from './constants';
import { resolveUrl } from '../../config/apiConfig';

export const ReferencePanel = ({
    showRefBoard,
    setShowRefBoard,
    stagedRefBoard,
    setStagedRefBoard,
    removeRefItem,
    handleSaveRefBoard,
    handleCancelRefBoard,
    refUploadInputRef,
    handleRefUpload,
    showLibPicker,
    setShowLibPicker,
    libPickerTarget,
    setLibPickerTarget,
    addRefItem,
    setActiveRefUploadCategory,
    isSeedance = false,
    isOmni = false,
    seedanceRefs = { ref_images: [], ref_videos: [], ref_audios: [] },
    onSeedanceRefUpload,
    onRemoveSeedanceRef,
}) => {
    // Local file input refs for each category type
    const seedanceFileRefs = {
        ref_images: useRef(null),
        ref_videos: useRef(null),
        ref_audios: useRef(null),
    };
    const omniFileRefs = {
        ref_images: useRef(null),
        ref_videos: useRef(null),
    };

    if (!showRefBoard) return null;

    const handleSeedanceFileSelect = (categoryId) => (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (onSeedanceRefUpload) {
            onSeedanceRefUpload(file, categoryId);
        }
        e.target.value = '';
    };

    // Helper to render preview for different file types
    const renderSeedancePreview = (item, catId) => {
        const url = resolveUrl(item.url || item.imageUrl);
        if (catId === 'ref_videos') {
            return (
                <div className="w-full h-full bg-black/40 flex items-center justify-center">
                    <Video className="w-4 h-4 text-rose-400/70" />
                </div>
            );
        }
        if (catId === 'ref_audios') {
            return (
                <div className="w-full h-full bg-black/40 flex items-center justify-center">
                    <Music className="w-4 h-4 text-amber-400/70" />
                </div>
            );
        }
        return (
            <img
                src={url}
                alt={item.name || 'ref'}
                className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
            />
        );
    };

    // ── OMNI FLASH REFERENCE BOARD ─────────────────────────────────────────────
    const OmniRefBoard = () => (
        <div className="space-y-3">
            {/* Omni Flash header pill */}
            <div className="flex items-center gap-2 mb-1">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
                <span className="text-[8px] font-black text-violet-400 uppercase tracking-[0.2em] shrink-0 flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> Omni Flash References
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
            </div>

            {/* Explainer box */}
            <div className="bg-violet-500/5 border border-violet-500/15 rounded-xl p-2.5 flex gap-2">
                <Info className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-[8px] font-bold text-violet-300 leading-relaxed">
                        Omni Flash uses <span className="text-[#c8f135]">&lt;FIRST_FRAME&gt;</span> and <span className="text-[#c8f135]">&lt;IMAGE_REF_N&gt;</span> tag syntax.
                    </p>
                    <p className="text-[7px] text-white/30 leading-relaxed">
                        Reference images are numbered in order (ref_0, ref_1…). Use "@image" in your prompt to auto-inject all references. Tag specific ones with &lt;IMAGE_REF_0&gt; etc.
                    </p>
                </div>
            </div>

            {/* Omni categories */}
            {OMNI_REF_CATEGORIES.map(cat => {
                const items = seedanceRefs[cat.id] || [];
                const atLimit = items.length >= cat.maxItems;
                const CatIcon = cat.icon;
                const isVideo = cat.id === 'ref_videos';

                return (
                    <div key={cat.id} className={cn(
                        "border rounded-xl p-2.5",
                        isVideo
                            ? "bg-violet-500/[0.03] border-violet-500/15"
                            : "bg-cyan-500/[0.03] border-cyan-500/15"
                    )}>
                        <div className="flex items-start justify-between border-b border-white/5 pb-2 gap-2">
                            <div className="flex items-start gap-1.5 min-w-0">
                                <CatIcon className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", cat.color)} />
                                <div className="min-w-0">
                                    <h4 className="text-[9px] font-black text-white uppercase tracking-widest leading-none">{cat.label}</h4>
                                    <span className="text-[7px] text-white/30 font-bold mt-0.5 block">
                                        {cat.desc} · {items.length}/{cat.maxItems}
                                    </span>
                                    {/* Omni-specific notes */}
                                    {isVideo && (
                                        <span className="text-[6.5px] text-violet-400/80 font-bold block mt-1 leading-none">
                                            ⚡ Uploaded via Google File API (not inline). Max 3s recommended.
                                        </span>
                                    )}
                                    {!isVideo && (
                                        <span className="text-[6.5px] text-cyan-400/80 font-bold block mt-1 leading-none">
                                            ✦ Order matters: 1st image = &lt;IMAGE_REF_0&gt;, 2nd = &lt;IMAGE_REF_1&gt;…
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    onClick={() => omniFileRefs[cat.id]?.current?.click()}
                                    disabled={atLimit}
                                    className={cn(
                                        "flex items-center gap-1 px-2 py-1 h-6 rounded-md border transition-all text-[8px] font-bold uppercase",
                                        atLimit
                                            ? "border-white/5 text-white/20 cursor-not-allowed"
                                            : isVideo
                                                ? "border-violet-500/25 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400"
                                                : "border-cyan-500/25 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400"
                                    )}
                                >
                                    <Upload className="w-2.5 h-2.5" /> {atLimit ? 'Full' : 'Upload'}
                                </button>
                                {!isVideo && !atLimit && (
                                    <button
                                        onClick={() => { setLibPickerTarget(cat.id); setShowLibPicker(true); }}
                                        className="flex items-center gap-1 px-2 py-1 h-6 rounded-md border border-[#c8f135]/25 bg-[#c8f135]/10 hover:bg-[#c8f135]/20 text-[#c8f135] transition-all text-[8px] font-bold uppercase"
                                    >
                                        <ImagePlus className="w-2.5 h-2.5" /> Library
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="mt-2">
                            {items.length === 0 ? (
                                <p className="text-[8px] text-white/20 italic">
                                    {isVideo ? 'No motion reference clip attached.' : 'No reference images added yet.'}
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                    {items.map((item, idx) => (
                                        <div key={item.id} className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/10 group bg-black/20 shrink-0">
                                            {isVideo ? (
                                                <div className="w-full h-full bg-violet-900/30 flex items-center justify-center">
                                                    <Video className="w-4 h-4 text-violet-400/70" />
                                                </div>
                                            ) : (
                                                <img
                                                    src={resolveUrl(item.url || item.imageUrl)}
                                                    alt={item.name || 'ref'}
                                                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                                                />
                                            )}
                                            <div className="absolute inset-x-0 bottom-0 bg-black/80 px-1 py-0.5 backdrop-blur-sm border-t border-white/5">
                                                <p className={cn("text-[5.5px] font-black uppercase truncate text-center", cat.color)}>
                                                    {isVideo ? 'VID' : `REF_${idx}`}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => onRemoveSeedanceRef && onRemoveSeedanceRef(item.id, cat.id)}
                                                className="absolute top-0.5 right-0.5 p-0.5 bg-red-500/80 rounded border border-red-400 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Hidden file input for this Omni category */}
                        <input
                            type="file"
                            ref={omniFileRefs[cat.id]}
                            className="hidden"
                            accept={cat.accept}
                            onChange={handleSeedanceFileSelect(cat.id)}
                        />
                    </div>
                );
            })}

            {/* Audio — unsupported note */}
            <div className="bg-red-500/[0.04] border border-red-500/10 rounded-xl p-2.5 flex gap-2 opacity-50">
                <Music className="w-3.5 h-3.5 text-red-400/60 shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-[9px] font-black text-red-300/50 uppercase tracking-widest">Audio References</h4>
                    <p className="text-[7px] text-red-400/50 mt-0.5">Not supported by Omni Flash API. Use prompt text to describe audio.</p>
                </div>
            </div>
        </div>
    );

    // ── SEEDANCE REFERENCE BOARD ───────────────────────────────────────────────
    const SeedanceRefBoard = () => (
        <div className="mb-1">
            <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-fuchsia-500/30 to-transparent" />
                <span className="text-[8px] font-black text-fuchsia-400 uppercase tracking-[0.2em] shrink-0 flex items-center gap-1">
                    <Film className="w-3 h-3" /> Seedance References
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-fuchsia-500/30 to-transparent" />
            </div>

            {SEEDANCE_REF_CATEGORIES.map(cat => {
                const items = seedanceRefs[cat.id] || [];
                const atLimit = items.length >= cat.maxItems;
                const CatIcon = cat.icon;

                return (
                    <div key={cat.id} className="bg-white/[0.01] border border-white/5 rounded-xl p-2.5 mb-2">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <div className="text-left flex items-center gap-1.5">
                                <CatIcon className={cn("w-3 h-3", cat.color)} />
                                <div>
                                    <h4 className="text-[9px] font-black text-white uppercase tracking-widest leading-none">{cat.label}</h4>
                                    <span className="text-[7px] text-white/30 font-bold uppercase tracking-widest mt-0.5 block">
                                        {cat.desc} · {items.length}/{cat.maxItems}
                                    </span>
                                    {cat.id === 'ref_videos' && (
                                        <span className="text-[6.5px] text-rose-400/80 font-bold uppercase tracking-wider block mt-1 leading-none">
                                            ⚠️ Min Res: 409,600 pixels (min 640x640 / 854x480)
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    onClick={() => seedanceFileRefs[cat.id]?.current?.click()}
                                    disabled={atLimit}
                                    className={cn(
                                        "flex items-center gap-1 px-2 py-1 h-6 rounded-md border transition-all text-[8px] font-bold uppercase",
                                        atLimit
                                            ? "border-white/5 text-white/20 cursor-not-allowed"
                                            : "border-fuchsia-500/25 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400"
                                    )}
                                >
                                    <Upload className="w-2.5 h-2.5" /> {atLimit ? 'Full' : 'Upload'}
                                </button>
                                {cat.id === 'ref_images' && !atLimit && (
                                    <button
                                        onClick={() => { setLibPickerTarget(cat.id); setShowLibPicker(true); }}
                                        className="flex items-center gap-1 px-2 py-1 h-6 rounded-md border border-[#c8f135]/25 bg-[#c8f135]/10 hover:bg-[#c8f135]/20 text-[#c8f135] transition-all text-[8px] font-bold uppercase"
                                    >
                                        <ImagePlus className="w-2.5 h-2.5" /> Library
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="mt-1.5">
                            {items.length === 0 ? (
                                <p className="text-[8px] text-white/20 italic mt-0.5">
                                    No {cat.id === 'ref_images' ? 'images' : cat.id === 'ref_videos' ? 'videos' : 'audio'} attached.
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {items.map(item => (
                                        <div key={item.id} className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/10 group bg-black/20 shrink-0">
                                            {renderSeedancePreview(item, cat.id)}
                                            <div className="absolute inset-x-0 bottom-0 bg-black/80 px-1 py-0.5 backdrop-blur-sm border-t border-white/5">
                                                <p className={cn("text-[5.5px] font-black uppercase truncate text-center", cat.color)}>
                                                    {item.name || (cat.id === 'ref_images' ? 'IMG' : cat.id === 'ref_videos' ? 'VID' : 'AUD')}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => onRemoveSeedanceRef && onRemoveSeedanceRef(item.id, cat.id)}
                                                className="absolute top-0.5 right-0.5 p-0.5 bg-red-500/80 rounded border border-red-400 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Hidden file input for this Seedance category */}
                        <input
                            type="file"
                            ref={seedanceFileRefs[cat.id]}
                            className="hidden"
                            accept={cat.accept}
                            onChange={handleSeedanceFileSelect(cat.id)}
                        />
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div onClick={handleCancelRefBoard} className="absolute inset-0 bg-black/85 backdrop-blur-md" />
            <div className="relative z-10 w-full max-w-[440px] max-h-[75vh] h-auto bg-[#0c0c0e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col font-mono">
                {/* Header */}
                <div className={cn(
                    "px-4 py-2.5 border-b border-white/5 flex items-center justify-between shrink-0",
                    isOmni ? "bg-violet-950/40" : "bg-black/40"
                )}>
                    <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                        {isOmni ? (
                            <>
                                <Zap className="w-3.5 h-3.5 text-violet-400" />
                                Omni Flash · Reference Board
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-3.5 h-3.5 text-[#c8f135]" />
                                Reference Board
                            </>
                        )}
                    </h3>
                    <button onClick={handleCancelRefBoard} className="p-1 hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-lg transition-colors shrink-0">
                        <X className="w-3.5 h-3.5 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-2.5">

                    {/* ── OMNI FLASH SPECIFIC SECTION ── */}
                    {isOmni && <OmniRefBoard />}

                    {/* ── SEEDANCE-ONLY SECTION ── */}
                    {isSeedance && !isOmni && <SeedanceRefBoard />}

                    {/* ── STANDARD REFERENCE CATEGORIES (Character / Location / Wardrobe / Props / Mood) ── */}
                    {/* Show always for standard engines, and as secondary refs for Seedance/Omni */}
                    {(isSeedance || isOmni) && (
                        <div className="flex items-center gap-2 mb-1 mt-1">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                            <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] shrink-0 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Prompt References
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        </div>
                    )}
                    {REF_CATEGORIES.map(category => (
                        <div key={category.id} className="bg-white/[0.01] border border-white/5 rounded-xl p-2.5">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                <div className="text-left">
                                    <h4 className="text-[9px] font-black text-white uppercase tracking-widest leading-none">{category.label}</h4>
                                    <span className="text-[7px] text-white/30 font-bold uppercase tracking-widest mt-1 block">{category.desc}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        onClick={() => { setActiveRefUploadCategory(category.id); refUploadInputRef.current?.click(); }}
                                        className="flex items-center gap-1 px-2 py-1 h-6 rounded-md border border-white/10 hover:bg-white/5 text-white transition-all text-[8px] font-bold uppercase"
                                    >
                                        <Upload className="w-2.5 h-2.5" /> Upload
                                    </button>
                                    <button
                                        onClick={() => { setLibPickerTarget(category.id); setShowLibPicker(true); }}
                                        className="flex items-center gap-1 px-2 py-1 h-6 rounded-md border border-[#c8f135]/25 bg-[#c8f135]/10 hover:bg-[#c8f135]/20 text-[#c8f135] transition-all text-[8px] font-bold uppercase"
                                    >
                                        <ImagePlus className="w-2.5 h-2.5" /> Library
                                    </button>
                                </div>
                            </div>

                            <div className="mt-1.5">
                                {!stagedRefBoard[category.id] || stagedRefBoard[category.id].length === 0 ? (
                                    <p className="text-[8px] text-white/20 italic mt-0.5">Nothing staged yet.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {stagedRefBoard[category.id].map(item => (
                                            <div key={item.id} className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/10 group bg-black/20 shrink-0">
                                                <img src={resolveUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                                <div className="absolute inset-x-0 bottom-0 bg-black/80 px-1 py-0.5 backdrop-blur-sm border-t border-white/5">
                                                    <p className="text-[5.5px] font-black text-[#D4FF00] uppercase truncate text-center">@{item.name}</p>
                                                </div>
                                                <button onClick={() => removeRefItem(item.id)} className="absolute top-0.5 right-0.5 p-0.5 bg-red-500/80 rounded border border-red-400 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Actions */}
                <div className="p-2 border-t border-white/5 bg-black/40 flex gap-2 shrink-0 justify-end">
                    <button
                        onClick={handleCancelRefBoard}
                        className="px-3.5 py-1.5 h-7 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/45 font-bold uppercase text-[8px] tracking-widest active:scale-95 transition-all shrink-0"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveRefBoard}
                        className={cn(
                            "px-4 py-1.5 h-7 rounded-lg font-black uppercase text-[8.5px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-1 shadow-md shrink-0",
                            isOmni
                                ? "bg-violet-500 hover:bg-violet-400 text-white shadow-violet-500/20"
                                : "bg-[#c8f135] hover:bg-[#bef264] text-black shadow-[#c8f135]/10"
                        )}
                    >
                        <Save className="w-3 h-3" /> Save Changes
                    </button>
                </div>

                <input type="file" ref={refUploadInputRef} className="hidden" accept="image/*,video/mp4,audio/mp3" onChange={handleRefUpload} />
            </div>

            {showLibPicker && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                    <div onClick={() => setShowLibPicker(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
                    <div className="relative w-full max-w-2xl bg-[#0e0e0e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <h4 className="text-sm font-bold text-white uppercase tracking-widest">Select {libPickerTarget?.toUpperCase() || 'Reference'}</h4>
                            <button onClick={() => setShowLibPicker(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
                        </div>
                        <div className="flex-1 overflow-hidden min-h-0 flex flex-col p-4">
                            <AssetsLibrary compact={true} defaultTab={libPickerTarget === 'characters' ? 'matrix' : 'images'} onSelectReference={(url, item) => {
                                let cleanName = item.name || 'Reference';
                                if (cleanName.toUpperCase().startsWith('NAME:')) {
                                    const parts = cleanName.split(',');
                                    cleanName = parts[0].substring(5).trim();
                                }
                                if (cleanName.includes(' — ')) {
                                    cleanName = cleanName.split(' — ')[0].trim();
                                }
                                const name = cleanName.replace(/[^\w]/g, '');

                                // Route Omni or Seedance ref_images to seedance handler
                                if (libPickerTarget === 'ref_images' && onSeedanceRefUpload) {
                                    onSeedanceRefUpload(url, 'ref_images', true);
                                    setShowLibPicker(false);
                                    return;
                                }

                                const category = libPickerTarget?.replace(/s$/, '') || item.category || (item.isCharacter ? 'character' : 'mood');
                                addRefItem({
                                    id: crypto.randomUUID(),
                                    name,
                                    category,
                                    imageUrl: url,
                                    isMatrix: !!(item.isMatrix || item.identity_kit?.matrix)
                                });
                                setShowLibPicker(false);
                            }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReferencePanel;
