import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link, Upload, Loader2, HardDrive, Plus } from 'lucide-react';
import { getApiUrl } from '../../config/apiConfig';

export function AddTemplateModal({ category, onClose, onSave, userId, userEmail }) {
    const [name, setName]         = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [previewSrc, setPreviewSrc] = useState('');
    const [prompt, setPrompt]     = useState('');
    const [aspect, setAspect]     = useState('16/9');
    const [tab, setTab]           = useState('url'); // 'url' | 'upload'
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedBucket, setUploadedBucket] = useState(null);
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const uploadRef = useRef(null);
    const finalUrlRef = useRef(''); // always holds latest R2/proxy URL

    const addTag = (v) => { 
        const t = v.trim().toLowerCase(); 
        if (t && !tags.includes(t)) setTags(prev => [...prev, t]); 
        setTagInput(''); 
    };
    const removeTag = (i) => setTags(prev => prev.filter((_, idx) => idx !== i));

    const handleFileRead = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const base64 = ev.target.result;
            setPreviewSrc(base64); // show preview immediately
            setImageUrl(base64);   // temp until R2 URL comes back
            setIsUploading(true);
            setUploadedBucket(null);
            try {
                const resp = await fetch(getApiUrl('/api/marketing/upload-reference'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64, userId, userEmail, isTemplate: true })
                });
                const data = await resp.json();
                if (data.url) {
                    setImageUrl(data.url);
                    setPreviewSrc(data.url); // swap base64 preview → proxy URL
                    finalUrlRef.current = data.url;
                    setUploadedBucket(data.bucket);
                }
            } catch (err) {
                console.error('[AddTemplate] R2 upload failed:', err);
            } finally {
                setIsUploading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleUrlChange = (v) => { 
        setImageUrl(v); 
        setPreviewSrc(v); 
        finalUrlRef.current = v; 
        setUploadedBucket(null); 
    };

    const canSave = name.trim() && imageUrl.trim() && prompt.trim() && !isUploading;

    const save = () => {
        const resolvedUrl = finalUrlRef.current || imageUrl;
        console.log('[DEBUG] Saving template with URL:', resolvedUrl?.slice(0, 100));
        onSave({
            id: `custom_${Date.now()}`,
            name: name.trim(),
            imageUrl: resolvedUrl,
            prompt: prompt.trim(),
            aspect,
            tags,
            isCustom: true,
        });
        onClose();
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ scale: 0.92, y: 30 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.92, y: 30 }}
                    className="w-full max-w-lg bg-[#111114] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                        <div>
                            <h3 className="font-black text-white uppercase tracking-wider text-sm">Add New Template</h3>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">{category} category</p>
                        </div>
                        <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                            <X className="w-4 h-4 text-white/60" />
                        </button>
                    </div>

                    <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                        {/* Name */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Template Name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Spicy Ramen Bowl"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/90 focus:border-orange-500/50 outline-none"
                            />
                        </div>

                        {/* Aspect */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Aspect Ratio</label>
                            <div className="flex gap-2">
                                {['16/9', '9/16', '1/1'].map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setAspect(r)}
                                        className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                            aspect === r ? 'bg-orange-500 text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'
                                        }`}
                                    >{r}</button>
                                ))}
                            </div>
                        </div>

                        {/* Image Source Tabs */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Image Source</label>
                            <div className="flex gap-1 bg-black/30 p-1 rounded-xl">
                                <button onClick={() => setTab('url')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase transition-all ${ tab === 'url' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60' }`}>
                                    <Link className="w-3 h-3" /> URL
                                </button>
                                <button onClick={() => setTab('upload')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase transition-all ${ tab === 'upload' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60' }`}>
                                    <Upload className="w-3 h-3" /> Upload
                                </button>
                            </div>

                            {tab === 'url' ? (
                                <input
                                    value={imageUrl}
                                    onChange={(e) => handleUrlChange(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/90 focus:border-orange-500/50 outline-none"
                                />
                            ) : (
                                <button
                                    onClick={() => uploadRef.current?.click()}
                                    className="w-full border-2 border-dashed border-white/20 hover:border-orange-400/50 rounded-xl py-4 flex items-center justify-center gap-2 text-sm text-white/50 hover:text-white/80 transition-all"
                                >
                                    <Upload className="w-4 h-4" />
                                    {previewSrc && tab === 'upload' ? 'Change Image' : 'Click to Upload'}
                                </button>
                            )}
                            <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleFileRead} />

                            {/* Preview */}
                            {previewSrc && (
                                <div className="relative rounded-xl overflow-hidden bg-black/30 border border-white/10 max-h-40">
                                    <img src={previewSrc} alt="preview" className="w-full h-full object-cover max-h-40" />
                                    <button
                                        onClick={() => { setPreviewSrc(''); setImageUrl(''); setUploadedBucket(null); }}
                                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-500/80 transition-colors"
                                    ><X className="w-3 h-3 text-white" /></button>
                                    {isUploading ? (
                                        <span className="absolute bottom-2 left-2 flex items-center gap-1 text-[9px] text-yellow-300 bg-black/60 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest">
                                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Uploading to R2…
                                        </span>
                                    ) : uploadedBucket ? (
                                        <span className="absolute bottom-2 left-2 flex items-center gap-1 text-[9px] text-lime-300 bg-black/60 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest">
                                            <HardDrive className="w-2.5 h-2.5" /> R2 · {uploadedBucket}
                                        </span>
                                    ) : (
                                        <span className="absolute bottom-2 left-2 text-[9px] text-white/60 bg-black/50 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest">Preview only</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Tags */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Tags <span className="text-white/20 normal-case font-normal">(for filtering)</span></label>
                            <div className="flex gap-2">
                                <input
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); } }}
                                    placeholder="e.g. promo, sale, festive..."
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 focus:border-orange-500/40 outline-none placeholder:text-white/20"
                                />
                                <button onClick={() => addTag(tagInput)} className="px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-xl text-orange-400 text-xs font-bold uppercase transition-colors">
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {tags.map((t, i) => (
                                        <span key={i} onClick={() => removeTag(i)} className="inline-flex items-center gap-1 text-[10px] bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full text-orange-300 font-bold cursor-pointer hover:bg-red-500/20 hover:text-red-300 transition-colors">
                                            #{t} <X className="w-2.5 h-2.5" />
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Prompt */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Generation Prompt</label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe your desired marketing asset in detail..."
                                rows={4}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/90 focus:border-orange-500/50 outline-none resize-none"
                            />
                        </div>
                    </div>

                    {/* Footer - sticky at bottom */}
                    <div className="px-6 pb-6 pt-3 flex gap-3 border-t border-white/10 bg-[#111114] flex-none">
                        <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 font-bold text-sm uppercase tracking-wider transition-all">Cancel</button>
                        <button
                            onClick={save}
                            disabled={!canSave}
                            className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${
                                canSave ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-black hover:scale-[1.02] shadow-lg' : 'bg-white/5 text-white/20 cursor-not-allowed'
                            }`}
                        >
                            Save Template
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
