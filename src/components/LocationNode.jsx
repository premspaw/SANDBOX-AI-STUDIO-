import { memo, useState, useCallback } from 'react';
import { Position } from 'reactflow';
import MagneticHandle from './edges/MagneticHandle';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, Upload, Loader2, Sun, Eye, Maximize2, Focus } from 'lucide-react';
import { useAppStore } from '../store';
import { getApiUrl } from '../config/apiConfig';

export default memo(({ id, data }) => {
    const updateNodeData = useAppStore(s => s.updateNodeData);
    const setCurrentLocation = useAppStore(s => s.setCurrentLocation);
    const edges = useAppStore(s => s.edges);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const isTargetConnected = edges.some(e => e.target === id);
    const isSourceConnected = edges.some(e => e.source === id);

    const handleImageUpload = useCallback(async (file) => {
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const imageData = reader.result;

            // Show preview immediately
            updateNodeData(id, { locationImage: imageData, locationName: file.name });
            setCurrentLocation({ image: imageData, name: file.name });

            setIsAnalyzing(true);
            try {
                const formData = new FormData();
                formData.append('image', file);

                const response = await fetch(getApiUrl('/api/analyze-location'), {
                    method: 'POST',
                    body: formData,
                });
                const result = await response.json();

                if (result.success && result.location) {
                    const loc = result.location;
                    updateNodeData(id, {
                        locationName: loc.name,
                        settingType: loc.settingType,
                        timeOfDay: loc.timeOfDay,
                        lighting: loc.lighting,
                        atmosphere: loc.atmosphere,
                        colorGrade: loc.colorGrade,
                        establishingPrompt: loc.establishingPrompt,
                        backgroundPrompt: loc.backgroundPrompt,
                    });
                    setCurrentLocation({
                        image: imageData,
                        ...loc,
                    });
                }
            } catch (err) {
                console.error('[LocationNode] Analysis error:', err);
                updateNodeData(id, {
                    locationName: 'Location scanned (analysis failed)',
                    establishingPrompt: '',
                    backgroundPrompt: '',
                });
            } finally {
                setIsAnalyzing(false);
            }
        };
        reader.readAsDataURL(file);
    }, [id, updateNodeData, setCurrentLocation]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleImageUpload(file);
    }, [handleImageUpload]);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) handleImageUpload(file);
    };

    const isLocked = !!data.establishingPrompt;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            style={{ zIndex: 1 }}
            className="group relative px-5 py-4 bg-[#0a0a0a]/90 border-2 border-cyan-500/20 rounded-2xl min-w-[260px] max-w-[300px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-cyan-500/50 transition-all"
        >
            {/* Input handle — connect from character/scene */}
            <MagneticHandle
                type="target"
                position={Position.Top}
                color="#22d3ee"
                className={`handle-location ${isTargetConnected ? 'neural-engaged' : ''}`}
            />

            {/* Delete button */}
            <button
                onClick={() => data.onDelete?.(id)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white scale-0 group-hover:scale-100 transition-transform shadow-lg z-50"
            >
                <X size={10} />
            </button>

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-cyan-500/20 rounded-lg">
                        <MapPin size={14} className="text-cyan-400" />
                    </div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                        LOCATION_NODE
                    </span>
                </div>
                {isAnalyzing && <Loader2 size={12} className="text-cyan-400 animate-spin" />}
            </div>

            {/* ── UPLOAD ZONE / PREVIEW ── */}
            {!data.locationImage ? (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById(`location-upload-${id}`)?.click()}
                    className={`relative w-full h-28 rounded-xl border-2 border-dashed 
                        ${dragOver
                            ? 'border-cyan-500 bg-cyan-500/10'
                            : 'border-white/10 bg-black/30'
                        } flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-cyan-500/40`}
                >
                    <Upload size={20} className="text-white/20" />
                    <span className="text-[9px] text-white/30 font-mono text-center px-4 uppercase tracking-wider font-black">Drop location image</span>
                    <span className="text-[7px] text-white/10 font-mono uppercase tracking-[0.2em]">pier · street · rooftop · studio</span>
                    <input
                        id={`location-upload-${id}`}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </div>
            ) : (
                <div className="relative w-full h-28 rounded-xl overflow-hidden mb-2">
                    <img
                        src={data.locationImage}
                        alt="Location"
                        className="w-full h-full object-cover brightness-75"
                    />
                    {/* Name overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                        <span className="text-[8px] text-white font-black uppercase tracking-wider truncate">
                            {data.locationName || 'Location'}
                        </span>
                    </div>
                    {isLocked && (
                        <div className="absolute top-1.5 right-1.5 px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/40 rounded-md">
                            <span className="text-[7px] text-cyan-400 font-mono">LOCKED</span>
                        </div>
                    )}
                </div>
            )}

            {/* ── ANALYSIS RESULTS ── */}
            <AnimatePresence>
                {data.establishingPrompt && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 space-y-2"
                    >
                        {/* Meta tags row */}
                        <div className="flex flex-wrap gap-1">
                            {[data.timeOfDay, data.settingType, data.atmosphere].filter(Boolean).map((tag, i) => (
                                <motion.span
                                    key={i}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.06 }}
                                    className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-md text-[8px] text-cyan-300 font-mono uppercase font-black"
                                >
                                    {tag}
                                </motion.span>
                            ))}
                        </div>

                        {/* Lighting */}
                        {data.lighting && (
                            <div className="flex items-start gap-1.5">
                                <Sun size={9} className="text-cyan-400 mt-0.5 shrink-0" />
                                <p className="text-[8px] text-white/30 font-mono leading-relaxed">
                                    {data.lighting}
                                </p>
                            </div>
                        )}

                        {/* ESTABLISHING PROMPT — wide shot */}
                        <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 p-2">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Maximize2 size={8} className="text-cyan-400" />
                                <span className="text-[7px] text-cyan-400 font-mono uppercase tracking-wider font-black">
                                    WIDE SHOT
                                </span>
                            </div>
                            <p className="text-[8px] text-white/40 font-mono leading-relaxed italic">
                                "{data.establishingPrompt}"
                            </p>
                        </div>

                        {/* BACKGROUND PROMPT — close-up bokeh */}
                        <div className="rounded-lg border border-white/8 bg-white/3 p-2">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Focus size={8} className="text-white/30" />
                                <span className="text-[7px] text-white/25 font-mono uppercase tracking-wider font-black">
                                    CLOSE-UP BOKEH
                                </span>
                            </div>
                            <p className="text-[8px] text-white/30 font-mono leading-relaxed italic">
                                "{data.backgroundPrompt}"
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── FOOTER ── */}
            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
                <span className="text-[6px] font-bold text-white/10 uppercase tracking-[0.4em]">
                    LOC_NODE_V1
                </span>
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-cyan-400">
                    <div className={`w-1.5 h-1.5 rounded-full ${isLocked ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'border border-cyan-500/40'}`} />
                    {isLocked ? 'LOCATION_LOCKED' : 'UPLOAD_REQUIRED'}
                </div>
            </div>

            {/* Output handle — wire to UGC engine */}
            <MagneticHandle
                type="source"
                position={Position.Right}
                color="#22d3ee"
                className={`handle-location ${isSourceConnected ? 'neural-engaged' : ''}`}
            />
        </motion.div>
    );
});
