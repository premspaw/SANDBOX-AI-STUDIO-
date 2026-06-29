import React, { useRef } from 'react';
import { Sparkles, X, Upload, ImagePlus, Save, Video, Music, Film } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AssetsLibrary } from '../panels/AssetsLibrary';
import { REF_CATEGORIES, SEEDANCE_REF_CATEGORIES } from './constants';
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
    seedanceRefs = { ref_images: [], ref_videos: [], ref_audios: [] },
    onSeedanceRefUpload,
    onRemoveSeedanceRef,
}) => {
    // Local file input refs for each Seedance ref type
    const seedanceFileRefs = {
        ref_images: useRef(null),
        ref_videos: useRef(null),
        ref_audios: useRef(null),
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

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div onClick={handleCancelRefBoard} className="absolute inset-0 bg-black/85 backdrop-blur-md" />
            <div className="relative z-10 w-full max-w-[420px] max-h-[70vh] h-auto bg-[#0c0c0e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col font-mono">
                {/* Header */}
                <div className="px-4 py-2.5 border-b border-white/5 bg-black/40 flex items-center justify-between shrink-0">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#c8f135]" /> Reference Board
                    </h3>
                    <button onClick={handleCancelRefBoard} className="p-1 hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-lg transition-colors shrink-0">
                        <X className="w-3.5 h-3.5 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-2.5">
                    {REF_CATEGORIES.map(category => (
                        <div key={category.id} className="bg-white/[0.01] border border-white/5 rounded-xl p-2.5">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                <div className="text-left">
                                    <h4 className="text-[9px] font-black text-white uppercase tracking-widest leading-none">{category.label}</h4>
                                    <span className="text-[7px] text-white/30 font-bold uppercase tracking-widest mt-1 block">{category.desc}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        onClick={() => { setActiveRefUploadCategory(category.id); refUploadInputRef.current?.click() }}
                                        className="flex items-center gap-1 px-2 py-1 h-6 rounded-md border border-white/10 hover:bg-white/5 text-white transition-all text-[8px] font-bold uppercase"
                                    >
                                        <Upload className="w-2.5 h-2.5" /> Upload
                                    </button>
                                    <button
                                        onClick={() => { setLibPickerTarget(category.id); setShowLibPicker(true) }}
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

                    {/* ── SEEDANCE REFERENCES SECTION ── */}
                    {isSeedance && (
                        <div className="mt-1">
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
                                                </div>
                                            </div>
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

                                        {/* Hidden file input for this category */}
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
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-2 border-t border-white/5 bg-black/40 flex gap-2 shrink-0 justify-end">
                    <button
                        onClick={handleCancelRefBoard}
                        className="px-3.5 py-1.5 h-7.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/45 font-bold uppercase text-[8px] tracking-widest active:scale-95 transition-all shrink-0"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveRefBoard}
                        className="px-4 py-1.5 h-7.5 bg-[#c8f135] hover:bg-[#bef264] text-black rounded-lg font-black uppercase text-[8.5px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-1 shadow-md shadow-[#c8f135]/10 shrink-0"
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
                                // Parse and clean name to make it a valid @mention identifier
                                let cleanName = item.name || 'Reference';
                                if (cleanName.toUpperCase().startsWith('NAME:')) {
                                    const parts = cleanName.split(',');
                                    cleanName = parts[0].substring(5).trim();
                                }
                                if (cleanName.includes(' — ')) {
                                    cleanName = cleanName.split(' — ')[0].trim();
                                }
                                const name = cleanName.replace(/[^\w]/g, '');

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
