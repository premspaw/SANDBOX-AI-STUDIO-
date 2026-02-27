import React, { useState } from 'react';
import { LANDING_ASSETS as INITIAL_ASSETS } from '../../config/landingAssets';
import { getApiUrl } from '../../config/apiConfig';

export const AssetManager = () => {
    const [assets, setAssets] = useState(INITIAL_ASSETS);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSaving, setIsSaving] = useState(false);

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
        <div className="p-6 max-w-4xl mx-auto bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-white/10 text-white min-h-[80vh]">
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
                            <input
                                type="text"
                                value={assets.heroBackground || ''}
                                onChange={(e) => handleInputChange('heroBackground', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition-colors"
                                placeholder="https://..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-zinc-400 block">Foreground Subject (Optional Image/Video URL)</label>
                            <input
                                type="text"
                                value={assets.foregroundSubject || ''}
                                onChange={(e) => handleInputChange('foregroundSubject', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition-colors"
                                placeholder="null or https://..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-zinc-400 block">Pipeline Demo Video URL</label>
                            <input
                                type="text"
                                value={assets.pipelineDemo || ''}
                                onChange={(e) => handleInputChange('pipelineDemo', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition-colors"
                                placeholder="https://..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-zinc-400 block">Background Music URL (mp3)</label>
                            <input
                                type="text"
                                value={assets.backgroundMusic || ''}
                                onChange={(e) => handleInputChange('backgroundMusic', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition-colors"
                                placeholder="https://...mp3"
                            />
                        </div>
                    </div>
                </section>

                {/* Gallery Items */}
                <section>
                    <h3 className="text-lg font-semibold mb-4 text-purple-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                        Output Gallery
                    </h3>
                    <div className="space-y-6">
                        {assets.gallery.map((item, index) => (
                            <div key={index} className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Item #{index + 1}</span>
                                    <span className="text-xs text-zinc-400">{item.name}</span>
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
                                <div className="space-y-1">
                                    <label className="text-xs text-zinc-500 uppercase">Video URL (src)</label>
                                    <input
                                        type="text"
                                        value={item.src}
                                        onChange={(e) => handleGalleryChange(index, 'src', e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 rounded-md p-2 text-xs outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

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
