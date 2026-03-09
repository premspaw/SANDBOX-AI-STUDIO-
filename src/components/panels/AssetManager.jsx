import React, { useState } from 'react';
import { LANDING_ASSETS as INITIAL_ASSETS } from '../../config/landingAssets';
import { getApiUrl } from '../../config/apiConfig';
import { AssetsLibrary } from './AssetsLibrary';
import { Search, Database, Image as ImageIcon, Video, Music, X } from 'lucide-react';

export const AssetManager = () => {
    const [assets, setAssets] = useState(INITIAL_ASSETS);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [pickerConfig, setPickerConfig] = useState(null); // { field, index (optional), type }

    React.useEffect(() => {
        const fetchAssets = async () => {
            try {
                const response = await fetch(getApiUrl('/api/get-landing-assets'));
                const data = await response.json();
                if (data && Object.keys(data).length > 0) {
                    setAssets(data);
                }
            } catch (err) {
                console.warn("[AssetManager] Failed to fetch assets:", err);
            }
        };
        fetchAssets();
    }, []);

    const handleInputChange = (field, value) => {
        setAssets(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleGalleryChange = (index, field, value) => {
        const newGallery = [...assets.gallery];
        newGallery[index] = { ...newGallery[index], [field]: value };
        setAssets(prev => ({
            ...prev,
            gallery: newGallery
        }));
    };

    const openPicker = (field, type, index = null) => {
        setPickerConfig({ field, type, index });
        setIsLibraryOpen(true);
    };

    const handleSelectFromLibrary = (url) => {
        if (!pickerConfig) return;
        const { field, index } = pickerConfig;

        if (index !== null) {
            handleGalleryChange(index, field, url);
        } else {
            handleInputChange(field, url);
        }
        setIsLibraryOpen(false);
        setPickerConfig(null);
    };

    const addGalleryItem = () => {
        const newItem = {
            tag: "NEW VIDEO",
            name: "New Entry",
            meta: "AI GENERATED",
            src: "",
            big: false
        };
        setAssets(prev => ({
            ...prev,
            gallery: [...prev.gallery, newItem]
        }));
    };

    const removeGalleryItem = (index) => {
        const newGallery = assets.gallery.filter((_, i) => i !== index);
        setAssets(prev => ({
            ...prev,
            gallery: newGallery
        }));
    };

    const saveChanges = async () => {
        setIsSaving(true);
        setStatus({ type: 'info', message: 'Saving changes...' });
        try {
            const response = await fetch(getApiUrl('/api/update-landing-assets'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assets })
            });
            const data = await response.json();
            if (data.success) {
                setStatus({ type: 'success', message: 'Assets updated! Refresh the page to see changes.' });
            } else {
                throw new Error(data.error || 'Failed to update assets');
            }
        } catch (error) {
            console.error('Save error:', error);
            setStatus({ type: 'error', message: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-white/10 text-white min-h-[80vh] relative">
            <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Landing Asset Manager
                    </h2>
                    <p className="text-zinc-400 text-sm mt-1">Update URLs for the landing page videos and gallery.</p>
                </div>
                <button
                    onClick={saveChanges}
                    disabled={isSaving}
                    className={`px-6 py-2 rounded-full font-semibold transition-all ${isSaving
                        ? 'bg-zinc-700 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/20'
                        }`}
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {status.message && (
                <div className={`mb-6 p-4 rounded-xl border ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' :
                    status.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-400' :
                        'bg-blue-500/10 border-blue-500/50 text-blue-400'
                    }`}>
                    {status.message}
                </div>
            )}

            <div className="space-y-8 h-[calc(80vh-200px)] overflow-y-auto pr-4 custom-scrollbar">
                {/* Main Hero Assets */}
                <section>
                    <h3 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        Main Hero & Pipeline
                    </h3>
                    <div className="grid gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-zinc-400 block">Hero Background Video URL</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={assets.heroBackground || ''}
                                    onChange={(e) => handleInputChange('heroBackground', e.target.value)}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition-colors"
                                    placeholder="https://..."
                                />
                                <button
                                    onClick={() => openPicker('heroBackground', 'videos')}
                                    className="px-4 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-600/30 rounded-lg text-blue-400 flex items-center gap-2 text-xs font-bold transition-all"
                                >
                                    <Database size={14} /> PICK
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-zinc-400 block">Foreground Subject (Optional Image/Video URL)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={assets.foregroundSubject || ''}
                                    onChange={(e) => handleInputChange('foregroundSubject', e.target.value)}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition-colors"
                                    placeholder="null or https://..."
                                />
                                <button
                                    onClick={() => openPicker('foregroundSubject', 'images')}
                                    className="px-4 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-600/30 rounded-lg text-blue-400 flex items-center gap-2 text-xs font-bold transition-all"
                                >
                                    <ImageIcon size={14} /> PICK
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-zinc-400 block">Pipeline Demo Video URL</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={assets.pipelineDemo || ''}
                                    onChange={(e) => handleInputChange('pipelineDemo', e.target.value)}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition-colors"
                                    placeholder="https://..."
                                />
                                <button
                                    onClick={() => openPicker('pipelineDemo', 'videos')}
                                    className="px-4 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-600/30 rounded-lg text-blue-400 flex items-center gap-2 text-xs font-bold transition-all"
                                >
                                    <Video size={14} /> PICK
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-zinc-400 block">Background Music URL (mp3)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={assets.backgroundMusic || ''}
                                    onChange={(e) => handleInputChange('backgroundMusic', e.target.value)}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition-colors"
                                    placeholder="https://...mp3"
                                />
                                <button
                                    className="px-4 bg-zinc-800 border border-white/5 rounded-lg text-zinc-500 flex items-center gap-2 text-xs font-bold opacity-50 cursor-not-allowed"
                                >
                                    <Music size={14} /> LIB
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Gallery Items */}
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                            Output Gallery
                        </h3>
                        <button
                            onClick={addGalleryItem}
                            className="text-xs bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 px-3 py-1 rounded-full border border-purple-600/30 transition-all font-bold"
                        >
                            + ADD NEW VIDEO
                        </button>
                    </div>
                    <div className="space-y-6">
                        {assets.gallery.map((item, index) => (
                            <div key={index} className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-4 relative group">
                                <button
                                    onClick={() => removeGalleryItem(index)}
                                    className="absolute top-4 right-4 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Remove Item"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                                        <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
                                    </svg>
                                </button>
                                <div className="flex justify-between">
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Item #{index + 1}</span>
                                    <span className="text-xs text-zinc-400 mr-8">{item.name}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-zinc-500 uppercase">Tag</label>
                                        <input
                                            type="text"
                                            value={item.tag}
                                            onChange={(e) => handleGalleryChange(index, 'tag', e.target.value)}
                                            className="w-full bg-black/40 border border-white/5 rounded-md p-2 text-xs outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-zinc-500 uppercase">Name</label>
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => handleGalleryChange(index, 'name', e.target.value)}
                                            className="w-full bg-black/40 border border-white/5 rounded-md p-2 text-xs outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-zinc-500 uppercase">Meta</label>
                                        <input
                                            type="text"
                                            value={item.meta}
                                            onChange={(e) => handleGalleryChange(index, 'meta', e.target.value)}
                                            className="w-full bg-black/40 border border-white/5 rounded-md p-2 text-xs outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 pt-6">
                                        <input
                                            type="checkbox"
                                            checked={item.big}
                                            onChange={(e) => handleGalleryChange(index, 'big', e.target.checked)}
                                            className="accent-purple-500"
                                        />
                                        <label className="text-xs text-zinc-500 uppercase">Feature (Big Cell)</label>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-zinc-500 uppercase">Video URL (src)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={item.src}
                                            onChange={(e) => handleGalleryChange(index, 'src', e.target.value)}
                                            className="flex-1 bg-black/40 border border-white/5 rounded-md p-2 text-xs outline-none focus:border-purple-500"
                                        />
                                        <button
                                            onClick={() => openPicker('src', 'videos', index)}
                                            className="px-4 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-600/30 rounded-md text-purple-400 flex items-center gap-2 text-xs font-bold transition-all"
                                        >
                                            <Search size={14} /> PICK
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* ASSET LIBRARY MODAL */}
            {isLibraryOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        onClick={() => setIsLibraryOpen(false)}
                    />
                    <div className="relative w-full max-w-5xl h-[85vh] bg-[#050505] rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter italic">
                                    Select <span className="text-[#bef264]">Asset</span>
                                </h3>
                                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">
                                    Picking for: {pickerConfig?.field} {pickerConfig?.index !== null ? `(Item #${pickerConfig.index + 1})` : ''}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsLibraryOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <AssetsLibrary
                                compact={true}
                                onSelectReference={handleSelectFromLibrary}
                            />
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
};
