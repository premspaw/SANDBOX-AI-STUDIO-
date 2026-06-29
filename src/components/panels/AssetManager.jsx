import React, { useState } from 'react';
import { LANDING_ASSETS as INITIAL_ASSETS } from '../../config/landingAssets';
import { getApiUrl } from '../../config/apiConfig';
import { AssetsLibrary } from './AssetsLibrary';
import { Search, Database, Image as ImageIcon, Video, Music, X, Upload, Trash2, CheckCircle2, Brain } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const AssetManager = () => {
    const [assets, setAssets] = useState(INITIAL_ASSETS);
    const [library, setLibrary] = useState([]);
    const [activeTab, setActiveTab] = useState('config'); // 'config' or 'library'
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [pickerConfig, setPickerConfig] = useState(null); // { field, index (optional), type }
    const [isUploading, setIsUploading] = useState(false);

    const fetchLibrary = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers = {};
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
            const response = await fetch(getApiUrl('/api/landing-assets-library'), { headers });
            const data = await response.json();
            setLibrary(data.assets || []);
        } catch (err) {
            console.warn("[AssetManager] Failed to fetch library:", err);
        }
    };

    React.useEffect(() => {
        const load = async () => {
            // 1. Fetch Active Config
            try {
                const response = await fetch(getApiUrl(`/api/get-landing-assets?t=${Date.now()}`));
                const data = await response.json();
                if (data && Object.keys(data).length > 0) {
                    setAssets(prev => ({
                        ...prev,
                        ...data,
                        // Ensure newly added sections are initialized if missing from DB
                        ugcAssets: data.ugcAssets || prev.ugcAssets,
                        productAssets: data.productAssets || prev.productAssets,
                        cinemaAssets: data.cinemaAssets || prev.cinemaAssets
                    }));
                }
            } catch (err) {
                console.warn("[AssetManager] Failed to fetch assets:", err);
            }
            // 2. Fetch Library
            await fetchLibrary();
        };
        load();
    }, []);

    const handleInputChange = (field, value) => {
        setAssets(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleArrayChange = (arrayName, index, field, value) => {
        const newArray = [...(assets[arrayName] || [])];
        newArray[index] = { ...newArray[index], [field]: value };
        setAssets(prev => ({
            ...prev,
            [arrayName]: newArray
        }));
    };

    const openPicker = (field, type, index = null, arrayName = null) => {
        setPickerConfig({ field, type, index, arrayName });
        setIsLibraryOpen(true);
    };

    const handleSelectFromLibrary = (url) => {
        if (!pickerConfig) return;
        const { field, index, arrayName } = pickerConfig;

        if (arrayName && index !== null) {
            handleArrayChange(arrayName, index, field, url);
        } else if (index !== null) {
            handleArrayChange('gallery', index, field, url);
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
            const { data: { session } } = await supabase.auth.getSession();
            const headers = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
            const response = await fetch(getApiUrl('/api/update-landing-assets'), {
                method: 'POST',
                headers,
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

    const handleFileUpload = async (e, category = 'gallery', targetField = null, targetIndex = null) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setStatus({ type: 'info', message: `Uploading ${file.name}...` });

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = reader.result;
                const { data: { session } } = await supabase.auth.getSession();
                const headers = { 'Content-Type': 'application/json' };
                if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }
                const response = await fetch(getApiUrl('/api/landing-assets-upload'), {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        fileName: file.name,
                        category,
                        type: file.type.startsWith('video') ? 'video' : 'image',
                        base64
                    })
                });
                const data = await response.json();
                if (data.success) {
                    setStatus({ type: 'success', message: `${file.name} uploaded to library!` });
                    await fetchLibrary(); // Refresh library
                    
                    // If target provided, auto-fill it
                    if (targetField) {
                        if (targetIndex !== null) {
                            handleArrayChange(category === 'gallery' ? 'gallery' : category, targetIndex, targetField, data.url);
                        } else {
                            handleInputChange(targetField, data.url);
                        }
                    }
                } else {
                    throw new Error(data.error || 'Upload failed');
                }
                setIsUploading(false);
            };
        } catch (error) {
            console.error('Upload error:', error);
            setStatus({ type: 'error', message: error.message });
            setIsUploading(false);
        }
    };

    const deleteFromLibrary = async (id) => {
        if (!window.confirm("Remove this asset from library? (It won't break live site if used)")) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers = {};
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
            const response = await fetch(getApiUrl(`/api/admin/landing-assets/library/${id}`), {
                method: 'DELETE',
                headers
            });
            if (response.ok) {
                setLibrary(prev => prev.filter(item => item.id !== id));
            }
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-white/10 text-white min-h-[80vh] relative">
            <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-[#AADD00] to-purple-400 bg-clip-text text-transparent italic tracking-tighter uppercase">
                        Landing Admin
                    </h2>
                    <div className="flex gap-4 mt-2">
                        <button 
                            onClick={() => setActiveTab('config')}
                            className={`text-xs font-bold tracking-widest uppercase pb-1 border-b-2 transition-all ${activeTab === 'config' ? 'border-[#AADD00] text-[#AADD00]' : 'border-transparent text-zinc-500 hover:text-white'}`}
                        >
                            Configuration
                        </button>
                        <button 
                            onClick={() => setActiveTab('library')}
                            className={`text-xs font-bold tracking-widest uppercase pb-1 border-b-2 transition-all ${activeTab === 'library' ? 'border-purple-500 text-purple-400' : 'border-transparent text-zinc-500 hover:text-white'}`}
                        >
                            Asset Library (DB)
                        </button>
                        <button 
                            onClick={() => setActiveTab('templates')}
                            className={`text-xs font-bold tracking-widest uppercase pb-1 border-b-2 transition-all ${activeTab === 'templates' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-white'}`}
                        >
                            Scene Templates
                        </button>
                        <button 
                            onClick={() => setActiveTab('hermes')}
                            className={`text-xs font-bold tracking-widest uppercase pb-1 border-b-2 transition-all ${activeTab === 'hermes' ? 'border-blue-500 text-blue-400' : 'border-transparent text-zinc-500 hover:text-white'}`}
                        >
                            Hermes Skills
                        </button>
                    </div>
                </div>
                <button
                    onClick={saveChanges}
                    disabled={isSaving}
                    className={`px-6 py-2 rounded-full font-semibold transition-all ${isSaving
                        ? 'bg-zinc-700 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#AADD00] to-purple-600 hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/20'
                        }`}
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {status.message && (
                <div className={`mb-6 p-4 rounded-xl border ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' :
                    status.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-400' :
                        'bg-[#AADD00]/10 border-[#AADD00]/50 text-[#AADD00]'
                    }`}>
                    {status.message}
                </div>
            )}

            <div className="space-y-8 h-[calc(80vh-220px)] overflow-y-auto pr-4 custom-scrollbar">
                {activeTab === 'config' ? (
                    <>
                        {/* Main Hero Assets */}
                        <section>
                            <h3 className="text-lg font-semibold mb-4 text-[#AADD00] flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#AADD00]"></span>
                                Hero & Brand
                            </h3>
                            <div className="grid gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm text-zinc-400 block uppercase tracking-wider text-[10px]">Hero Background Loop (Mobile)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={assets.heroBackground || ''}
                                            onChange={(e) => handleInputChange('heroBackground', e.target.value)}
                                            className="flex-1 bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:border-[#AADD00] outline-none transition-colors font-mono"
                                            placeholder="https://..."
                                        />
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => openPicker('heroBackground', 'videos')}
                                                className="px-4 bg-[#AADD00]/10 hover:bg-[#AADD00]/20 border border-[#AADD00]/30 rounded-lg text-[#AADD00] flex items-center gap-2 text-[10px] font-black transition-all"
                                            >
                                                <Database size={14} /> PICK
                                            </button>
                                            <label className="px-4 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-white flex items-center gap-2 text-[10px] font-black cursor-pointer transition-all">
                                                <Upload size={14} /> UPLOAD
                                                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'hero', 'heroBackground')} accept="video/*" />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-zinc-400 block uppercase tracking-wider text-[10px]">Hero Background Loop (Desktop)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={assets.heroBackgroundDesktop || ''}
                                            onChange={(e) => handleInputChange('heroBackgroundDesktop', e.target.value)}
                                            className="flex-1 bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:border-[#AADD00] outline-none transition-colors font-mono"
                                            placeholder="https://..."
                                        />
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => openPicker('heroBackgroundDesktop', 'videos')}
                                                className="px-4 bg-[#AADD00]/10 hover:bg-[#AADD00]/20 border border-[#AADD00]/30 rounded-lg text-[#AADD00] flex items-center gap-2 text-[10px] font-black transition-all"
                                            >
                                                <Database size={14} /> PICK
                                            </button>
                                            <label className="px-4 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-white flex items-center gap-2 text-[10px] font-black cursor-pointer transition-all">
                                                <Upload size={14} /> UPLOAD
                                                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'hero', 'heroBackgroundDesktop')} accept="video/*" />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-zinc-400 block uppercase tracking-wider text-[10px]">Foreground Overlay (Veo/Subject)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={assets.foregroundSubject || ''}
                                            onChange={(e) => handleInputChange('foregroundSubject', e.target.value)}
                                            className="flex-1 bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:border-[#AADD00] outline-none transition-colors font-mono"
                                            placeholder="null or https://..."
                                        />
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => openPicker('foregroundSubject', 'video')}
                                                className="px-4 bg-[#AADD00]/10 hover:bg-[#AADD00]/20 border border-[#AADD00]/30 rounded-lg text-[#AADD00] flex items-center gap-2 text-[10px] font-black transition-all"
                                            >
                                                <ImageIcon size={14} /> PICK
                                            </button>
                                            <label className="px-4 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-white flex items-center gap-2 text-[10px] font-black cursor-pointer transition-all">
                                                <Upload size={14} /> UPLOAD
                                                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'subject', 'foregroundSubject')} accept="video/*,image/*" />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-zinc-400 block uppercase tracking-wider text-[10px]">Pipeline Flow Video</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={assets.pipelineDemo || ''}
                                            onChange={(e) => handleInputChange('pipelineDemo', e.target.value)}
                                            className="flex-1 bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:border-[#AADD00] outline-none transition-colors font-mono"
                                            placeholder="https://..."
                                        />
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => openPicker('pipelineDemo', 'videos')}
                                                className="px-4 bg-[#AADD00]/10 hover:bg-[#AADD00]/20 border border-[#AADD00]/30 rounded-lg text-[#AADD00] flex items-center gap-2 text-[10px] font-black transition-all"
                                            >
                                                <Video size={14} /> PICK
                                            </button>
                                            <label className="px-4 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-white flex items-center gap-2 text-[10px] font-black cursor-pointer transition-all">
                                                <Upload size={14} /> UPLOAD
                                                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'pipeline', 'pipelineDemo')} accept="video/*" />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* UGC Factory Segment */}
                        <section className="border-t border-white/5 pt-8">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                    UGC Factory (4 Slots)
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(assets.ugcAssets || []).map((item, index) => (
                                    <div key={index} className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest">SLOT #{index + 1}</span>
                                            <input
                                                type="text"
                                                value={item.tag}
                                                onChange={(e) => handleArrayChange('ugcAssets', index, 'tag', e.target.value)}
                                                className="bg-transparent border-none text-[10px] text-right font-black text-emerald-400 outline-none w-24 uppercase"
                                                placeholder="TAG"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex gap-1">
                                                <input
                                                    type="text"
                                                    value={item.src}
                                                    onChange={(e) => handleArrayChange('ugcAssets', index, 'src', e.target.value)}
                                                    className="flex-1 bg-black/40 border border-white/5 rounded-lg p-2 text-xs outline-none focus:border-emerald-500 font-mono"
                                                    placeholder="Video URL"
                                                />
                                                <button
                                                    onClick={() => openPicker('src', 'videos', index, 'ugcAssets')}
                                                    className="p-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/30 rounded-lg text-emerald-400 transition-all"
                                                >
                                                    <Database size={14} />
                                                </button>
                                                <label className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-white cursor-pointer transition-all">
                                                    <Upload size={14} />
                                                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'ugcAssets', 'src', index)} accept="video/*" />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Product Studio Segment */}
                        <section className="border-t border-white/5 pt-8">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                    Product Studio (3 Slots)
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {(assets.productAssets || []).map((item, index) => (
                                    <div key={index} className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-blue-500/50 uppercase tracking-widest">SLOT #{index + 1}</span>
                                            <input
                                                type="text"
                                                value={item.tag}
                                                onChange={(e) => handleArrayChange('productAssets', index, 'tag', e.target.value)}
                                                className="bg-transparent border-none text-[10px] text-right font-black text-blue-400 outline-none w-20 uppercase"
                                                placeholder="TAG"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex gap-1">
                                                <input
                                                    type="text"
                                                    value={item.src}
                                                    onChange={(e) => handleArrayChange('productAssets', index, 'src', e.target.value)}
                                                    className="flex-1 bg-black/40 border border-white/5 rounded-lg p-2 text-xs outline-none focus:border-blue-500 font-mono"
                                                    placeholder="URL"
                                                />
                                                <button
                                                    onClick={() => openPicker('src', 'videos', index, 'productAssets')}
                                                    className="p-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 rounded-lg text-blue-400"
                                                >
                                                    <Database size={12} />
                                                </button>
                                                <label className="p-1.5 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-white cursor-pointer transition-all">
                                                    <Upload size={12} />
                                                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'productAssets', 'src', index)} accept="video/*" />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Cinema Segment */}
                        <section className="border-t border-white/5 pt-8">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-rose-400 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                                    Camera Director (Cinema)
                                </h3>
                            </div>
                            <div className="p-6 bg-rose-500/5 rounded-2xl border border-rose-500/10 space-y-4">
                                <div className="flex gap-4 items-center">
                                    <div className="flex-1 space-y-2">
                                        <label className="text-[10px] font-black text-rose-500/50 uppercase tracking-widest">Cinematic Highlight Video</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={assets.cinemaAssets?.[0]?.src || ''}
                                                onChange={(e) => handleArrayChange('cinemaAssets', 0, 'src', e.target.value)}
                                                className="flex-1 bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:border-rose-500 outline-none transition-colors font-mono"
                                                placeholder="https://..."
                                            />
                                            <button
                                                onClick={() => openPicker('src', 'videos', 0, 'cinemaAssets')}
                                                className="px-4 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-600/30 rounded-lg text-rose-400 flex items-center gap-2 text-[10px] font-black transition-all"
                                            >
                                                <Database size={14} /> PICK
                                            </button>
                                            <label className="px-4 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-white flex items-center gap-2 text-[10px] font-black cursor-pointer transition-all">
                                                <Upload size={14} /> UPLOAD
                                                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'cinemaAssets', 'src', 0)} accept="video/*" />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Gallery Items */}
                        <section className="border-t border-white/5 pt-8">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                                    Output Gallery (Multi-Column)
                                </h3>
                                <button
                                    onClick={addGalleryItem}
                                    className="text-[10px] bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 px-4 py-2 rounded-full border border-purple-600/30 transition-all font-black uppercase"
                                >
                                    + ADD TO GALLERY
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {assets.gallery.map((item, index) => (
                                    <div key={index} className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4 relative group">
                                        <button
                                            onClick={() => removeGalleryItem(index)}
                                            className="absolute top-4 right-4 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remove Item"
                                        >
                                            <X size={16} />
                                        </button>
                                        <div className="flex justify-between items-center bg-black/40 -mx-4 -mt-4 p-3 rounded-t-2xl border-b border-white/5">
                                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">GALLERY ITEM #{index + 1}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-zinc-500 uppercase font-black">Tag</label>
                                                <input
                                                    type="text"
                                                    value={item.tag}
                                                    onChange={(e) => handleArrayChange('gallery', index, 'tag', e.target.value)}
                                                    className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs outline-none focus:border-purple-500"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-zinc-500 uppercase font-black">Title</label>
                                                <input
                                                    type="text"
                                                    value={item.name}
                                                    onChange={(e) => handleArrayChange('gallery', index, 'name', e.target.value)}
                                                    className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs outline-none focus:border-purple-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-zinc-500 uppercase font-black">Source URL</label>
                                            <div className="flex gap-1">
                                                <input
                                                    type="text"
                                                    value={item.src}
                                                    onChange={(e) => handleArrayChange('gallery', index, 'src', e.target.value)}
                                                    className="flex-1 bg-black/40 border border-white/5 rounded-lg p-2 text-xs outline-none focus:border-purple-500 font-mono"
                                                />
                                                <button
                                                    onClick={() => openPicker('src', 'videos', index, 'gallery')}
                                                    className="p-2 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-600/30 rounded-lg text-purple-400 transition-all"
                                                >
                                                    <Database size={14} />
                                                </button>
                                                <label className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-white cursor-pointer transition-all">
                                                    <Upload size={14} />
                                                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'gallery', 'src', index)} accept="video/*" />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </>
                ) : activeTab === 'templates' ? (
                    <section className="h-full">
                        <AssetsLibrary compact={true} />
                    </section>
                ) : activeTab === 'hermes' ? (
                    <section className="h-full overflow-y-auto pr-2 custom-scrollbar">
                        <HermesSkillsManager setStatus={setStatus} />
                    </section>
                ) : (
                    <section className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-purple-400 italic">Asset Library</h3>
                                <p className="text-xs text-zinc-500">Persistent inventory stored in `landing_video_assets` table.</p>
                            </div>
                            <label className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-full text-white font-bold text-xs cursor-pointer flex items-center gap-2 transition-all shadow-lg shadow-purple-900/40">
                                <Upload size={16} /> UPLOAD TO LIBRARY
                                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e)} accept="video/*,image/*" />
                            </label>
                        </div>

                        <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-white/5 text-zinc-500 uppercase font-black">
                                    <tr>
                                        <th className="p-4">Preview</th>
                                        <th className="p-4">Title / ID</th>
                                        <th className="p-4">Category</th>
                                        <th className="p-4">Created</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {library.map((asset) => (
                                        <tr key={asset.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-4">
                                                <div className="w-20 aspect-video bg-zinc-800 rounded-lg overflow-hidden border border-white/10 relative">
                                                    <video src={asset.url} className="w-full h-full object-cover" />
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-white">{asset.title}</div>
                                                <div className="text-[10px] text-zinc-600 font-mono truncate w-32">{asset.id}</div>
                                            </td>
                                            <td className="p-4 uppercase tracking-widest text-[#AADD00]">{asset.category}</td>
                                            <td className="p-4 text-zinc-500">{new Date(asset.created_at).toLocaleDateString()}</td>
                                            <td className="p-4 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <button 
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(asset.url);
                                                            setStatus({ type: 'success', message: 'URL copied!' });
                                                        }}
                                                        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all"
                                                        title="Copy URL"
                                                    >
                                                        <Search size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={() => deleteFromLibrary(asset.id)}
                                                        className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-600 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                                                        title="Delete from Library"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {library.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="p-12 text-center text-zinc-500 italic">No assets in library. Start uploading!</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
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
                        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                            <AssetsLibrary
                                compact={true}
                                onSelectReference={handleSelectFromLibrary}
                            />
                        </div>
                    </div>
                </div>
            )}

            <style>{`
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

const HermesSkillsManager = ({ setStatus }) => {
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingSkill, setEditingSkill] = useState(null);
    const [showForm, setShowForm] = useState(false);
    
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [systemInstructions, setSystemInstructions] = useState('');
    const [isActive, setIsActive] = useState(true);

    const fetchSkills = React.useCallback(async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers = {};
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
            const response = await fetch(getApiUrl('/api/admin/hermes-skills'), { headers });
            const data = await response.json();
            setSkills(data.skills || []);
        } catch (err) {
            console.error("Failed to fetch Hermes skills:", err);
            setStatus({ type: 'error', message: 'Failed to fetch Hermes skills.' });
        } finally {
            setLoading(false);
        }
    }, [setStatus]);

    React.useEffect(() => {
        fetchSkills();
    }, [fetchSkills]);

    const handleEdit = (skill) => {
        setEditingSkill(skill);
        setName(skill.name);
        setDescription(skill.description || '');
        setSystemInstructions(skill.system_instructions);
        setIsActive(skill.is_active);
        setShowForm(true);
    };

    const handleCreate = () => {
        setEditingSkill(null);
        setName('');
        setDescription('');
        setSystemInstructions('');
        setIsActive(true);
        setShowForm(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!name.trim() || !systemInstructions.trim()) {
            setStatus({ type: 'error', message: 'Name and System Instructions are required.' });
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const payload = {
                id: editingSkill?.id || undefined,
                name: name.trim(),
                description: description.trim(),
                system_instructions: systemInstructions.trim(),
                is_active: isActive
            };

            const response = await fetch(getApiUrl('/api/admin/hermes-skills'), {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });
            const resData = await response.json();

            if (resData.success) {
                setStatus({ type: 'success', message: `Skill "${name}" successfully saved!` });
                setShowForm(false);
                fetchSkills();
            } else {
                throw new Error(resData.error || 'Failed to save Hermes skill');
            }
        } catch (err) {
            console.error(err);
            setStatus({ type: 'error', message: err.message });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this Hermes skill?")) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers = {};
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const response = await fetch(getApiUrl(`/api/admin/hermes-skills/${id}`), {
                method: 'DELETE',
                headers
            });

            if (response.ok) {
                setStatus({ type: 'success', message: 'Hermes skill deleted.' });
                fetchSkills();
            } else {
                const resData = await response.json();
                throw new Error(resData.error || 'Failed to delete skill');
            }
        } catch (err) {
            console.error(err);
            setStatus({ type: 'error', message: err.message });
        }
    };

    return (
        <div className="space-y-6 pb-12">
            {showForm ? (
                <form onSubmit={handleSave} className="space-y-4 bg-black/40 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-blue-400 italic">
                        {editingSkill ? 'Edit Hermes Skill' : 'Create New Hermes Skill'}
                    </h3>
                    
                    <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400 uppercase tracking-widest block">Skill Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. AIDA Copywriting, Hook Optimizer..."
                            className="w-full bg-black/60 border border-white/10 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition-colors"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400 uppercase tracking-widest block">Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief summary of what this skill does"
                            className="w-full bg-black/60 border border-white/10 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition-colors"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400 uppercase tracking-widest block">System Prompt / Instructions</label>
                        <textarea
                            value={systemInstructions}
                            onChange={(e) => setSystemInstructions(e.target.value)}
                            rows={8}
                            placeholder="Provide the exact rules, constraints, and instructions that Hermes should follow when this skill is active..."
                            className="w-full bg-black/60 border border-white/10 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition-colors font-mono"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-900"
                        />
                        <label htmlFor="isActive" className="text-xs text-zinc-300">Skill is Active (Hermes will automatically adopt these instructions)</label>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="submit"
                            className="px-6 py-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-semibold text-xs transition-all"
                        >
                            Save Skill
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="px-6 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-semibold text-xs transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-blue-400 italic">Hermes Skills Manager</h3>
                            <p className="text-xs text-zinc-500">Inject custom storytelling, reel writing, or copy templates directly into Hermes agent prompts.</p>
                        </div>
                        <button
                            onClick={handleCreate}
                            className="text-[10px] bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-4 py-2 rounded-full border border-blue-600/30 transition-all font-black uppercase"
                        >
                            + ADD NEW SKILL
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-zinc-500 italic py-6 text-center">Loading Hermes skills from database...</div>
                    ) : (
                        <div className="grid gap-4">
                            {skills.map((skill) => (
                                <div key={skill.id} className="p-5 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-start gap-4">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-white text-sm">{skill.name}</h4>
                                            <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${skill.is_active ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' : 'bg-zinc-800 border border-white/5 text-zinc-500'}`}>
                                                {skill.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        {skill.description && (
                                            <p className="text-xs text-zinc-400 leading-relaxed">{skill.description}</p>
                                        )}
                                        <details className="cursor-pointer text-[10px] text-zinc-500 hover:text-white transition-colors">
                                            <summary className="font-semibold select-none outline-none">Show prompt instructions</summary>
                                            <pre className="mt-2 p-3 bg-black/50 border border-white/5 rounded-lg font-mono text-[9px] text-zinc-400 whitespace-pre-wrap leading-relaxed">
                                                {skill.system_instructions}
                                            </pre>
                                        </details>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(skill)}
                                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition-all"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(skill.id)}
                                            className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-950/30 rounded-lg text-xs font-semibold transition-all"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {skills.length === 0 && (
                                <div className="p-12 text-center text-zinc-500 italic border border-white/5 bg-white/[0.01] rounded-2xl">
                                    No custom skills created yet. Click "Add New Skill" to begin training Hermes!
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
