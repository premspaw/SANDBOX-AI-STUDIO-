import { memo, useState, useCallback, useEffect } from 'react';
import { Position, useUpdateNodeInternals } from 'reactflow';
import MagneticHandle from '../edges/MagneticHandle';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, Upload, Loader2, Sun, Maximize2, Focus } from 'lucide-react';
import { useAppStore } from '../../store';
import { getApiUrl } from '../../config/apiConfig';

// ─── Intelligence Layer ─────────────────────────────────────────────
// Auto-detects cinematic behavior from location analysis results.
// Auto Story reads these flags to decide shot distribution & grading.
const enrichLocationProfile = (loc) => {
    const cinematicTimes = ['sunset', 'night', 'golden hour', 'sunrise', 'dusk', 'dawn', 'blue hour'];
    const dramaticAtmospheres = ['foggy', 'moody', 'stormy', 'noir', 'dark', 'neon'];

    const timeStr = (loc.timeOfDay || '').toLowerCase();
    const atmosStr = (loc.atmosphere || '').toLowerCase();
    const settingStr = (loc.settingType || '').toLowerCase();

    // Depth detection — tells AI if camera has room to move
    const hasBackgroundDepth = ['beach', 'mountain', 'street', 'desert', 'rooftop', 'field']
        .some(k => settingStr.includes(k));
    const isConfined = ['elevator', 'car_interior', 'small_room', 'closet', 'office_cubicle']
        .some(k => settingStr.includes(k));

    return {
        depthType: settingStr === 'indoor' || settingStr === 'studio' || settingStr === 'interior'
            ? 'controlled'
            : 'wide',
        cinematicBoost: cinematicTimes.some(t => timeStr.includes(t)),
        dramaticLighting: dramaticAtmospheres.some(a => atmosStr.includes(a)),
        depth: isConfined ? 'CONFINED' : hasBackgroundDepth ? 'DEEP' : 'STANDARD',
        hasBackgroundDepth,
        isConfined
    };
};

export default memo(({ id, data }) => {
    const updateNodeInternals = useUpdateNodeInternals();
    const updateNodeData = useAppStore(s => s.updateNodeData);
    const setCurrentLocation = useAppStore(s => s.setCurrentLocation);
    const edges = useAppStore(s => s.edges);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const isTargetConnected = edges.some(e => e.target === id);
    const isSourceConnected = edges.some(e => e.source === id);

    // Safe defaults — always read from locationProfile
    const profile = data?.locationProfile;
    const locationImage = profile?.image;
    const locationName = profile?.name;
    const isLocked = !!profile?.consistencyLock && !!profile?.establishingPrompt;

    useEffect(() => {
        updateNodeInternals(id);
    }, [id, updateNodeInternals]);

    const handleImageUpload = useCallback(async (file) => {
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const imageData = reader.result;

            // Show preview immediately — store inside locationProfile
            updateNodeData(id, {
                locationProfile: { image: imageData, name: file.name, consistencyLock: false },
                status: 'ANALYZING'
            });
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

                    // Run intelligence layer
                    const intelligence = enrichLocationProfile(loc);

                    // Build ONE structured locationProfile
                    const locationProfile = {
                        image: imageData,
                        name: loc.name,
                        settingType: loc.settingType,
                        timeOfDay: loc.timeOfDay,
                        lighting: loc.lighting,
                        atmosphere: loc.atmosphere,
                        colorGrade: loc.colorGrade,
                        establishingPrompt: loc.establishingPrompt,
                        backgroundPrompt: loc.backgroundPrompt,
                        // Intelligence flags
                        depthType: intelligence.depthType,
                        cinematicBoost: intelligence.cinematicBoost,
                        dramaticLighting: intelligence.dramaticLighting,
                        depth: intelligence.depth,
                        hasBackgroundDepth: intelligence.hasBackgroundDepth,
                        isConfined: intelligence.isConfined,
                        moodStrength: 'cinematic',
                        consistencyLock: true
                    };

                    updateNodeData(id, { locationProfile, status: 'READY' });
                    setCurrentLocation(locationProfile);
                } else if (result.error) {
                    updateNodeData(id, {
                        locationProfile: { image: imageData, name: result.error, consistencyLock: false },
                        status: 'READY'
                    });
                }
            } catch (err) {
                console.error('[LocationNode] Analysis error:', err);
                updateNodeData(id, {
                    locationProfile: {
                        image: imageData,
                        name: 'Location scanned (analysis failed)',
                        consistencyLock: false
                    },
                    status: 'READY'
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

    return (
        <div className="relative group" style={{ zIndex: 1 }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="px-4 py-3 bg-[#0a0a0a]/90 border-2 border-cyan-500/20 rounded-2xl min-w-[210px] max-w-[240px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-cyan-500/50 transition-all font-sans"
            >

                {/* Delete button */}
                <button
                    onClick={() => data.onDelete?.(id)}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white scale-0 group-hover:scale-100 transition-transform shadow-lg z-50"
                >
                    <X size={10} />
                </button>

                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-cyan-500/20 rounded-lg">
                            <MapPin size={12} className="text-cyan-400" />
                        </div>
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">LOCATION</span>
                    </div>
                    {isAnalyzing && <Loader2 size={12} className="text-cyan-400 animate-spin" />}
                </div>

                {/* Upload Zone / Preview */}
                {!locationImage ? (
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById(`location-upload-${id}`)?.click()}
                        className={`relative w-full h-24 rounded-xl border-2 border-dashed 
                        ${dragOver ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/10 bg-black/30'} 
                        flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all hover:border-cyan-500/40`}
                    >
                        <Upload size={16} className="text-white/20" />
                        <span className="text-[8px] text-white/30 font-mono uppercase font-black">Drop Location</span>
                        <input
                            id={`location-upload-${id}`}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>
                ) : (
                    <div className="relative w-full h-24 rounded-xl overflow-hidden mb-1">
                        <img
                            src={locationImage}
                            alt="Location"
                            className="w-full h-full object-cover brightness-75"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                            <span className="text-[7px] text-white font-black uppercase tracking-wider truncate">
                                {locationName || 'Location'}
                            </span>
                        </div>
                        {isLocked && (
                            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-cyan-500/20 border border-cyan-500/40 rounded-md">
                                <span className="text-[6px] text-cyan-400 font-mono">LOCKED</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Analysis Results — all read from locationProfile */}
                <AnimatePresence>
                    {profile?.establishingPrompt && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-1.5 space-y-1.5 overflow-hidden"
                        >
                            {/* Meta tags */}
                            <div className="flex flex-wrap gap-1">
                                {[profile.timeOfDay, profile.settingType, profile.atmosphere].filter(Boolean).map((tag, i) => (
                                    <motion.span
                                        key={i}
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.06 }}
                                        className="px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded text-[7px] text-cyan-300 font-mono uppercase font-bold"
                                    >
                                        {tag}
                                    </motion.span>
                                ))}
                            </div>

                            {/* Lighting */}
                            {profile.lighting && (
                                <div className="flex items-start gap-1.5">
                                    <Sun size={8} className="text-cyan-400 mt-0.5 shrink-0" />
                                    <p className="text-[7px] text-white/30 font-mono leading-relaxed">{profile.lighting}</p>
                                </div>
                            )}

                            {/* Establishing prompt — wide shot */}
                            <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 p-1.5">
                                <div className="flex items-center gap-1 mb-0.5">
                                    <Maximize2 size={7} className="text-cyan-400" />
                                    <span className="text-[6px] text-cyan-400 font-mono uppercase font-black">WIDE SHOT</span>
                                </div>
                                <p className="text-[7px] text-white/40 font-mono leading-relaxed italic">
                                    "{profile.establishingPrompt}"
                                </p>
                            </div>

                            {/* Background prompt — bokeh */}
                            {profile.backgroundPrompt && (
                                <div className="rounded-lg border border-white/8 bg-white/3 p-1.5">
                                    <div className="flex items-center gap-1 mb-0.5">
                                        <Focus size={7} className="text-white/30" />
                                        <span className="text-[6px] text-white/25 font-mono uppercase font-black">BOKEH BG</span>
                                    </div>
                                    <p className="text-[7px] text-white/30 font-mono leading-relaxed italic">
                                        "{profile.backgroundPrompt}"
                                    </p>
                                </div>
                            )}

                            {/* Intelligence Flags — Director logic */}
                            {profile.consistencyLock && (
                                <div className="flex flex-wrap gap-1">
                                    {profile.depthType === 'wide' && (
                                        <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[6px] text-emerald-300 font-mono">WIDE_24mm</span>
                                    )}
                                    {profile.depthType === 'controlled' && (
                                        <span className="px-1.5 py-0.5 bg-sky-500/10 border border-sky-500/20 rounded text-[6px] text-sky-300 font-mono">STUDIO</span>
                                    )}
                                    {profile.cinematicBoost && (
                                        <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[6px] text-amber-300 font-mono">CINEMATIC</span>
                                    )}
                                    {profile.dramaticLighting && (
                                        <span className="px-1.5 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded text-[6px] text-violet-300 font-mono">DRAMATIC</span>
                                    )}
                                    {profile.depth && (
                                        <span className={`px-1.5 py-0.5 rounded text-[6px] font-mono border ${profile.depth === 'CONFINED' ? 'bg-red-500/10 border-red-500/20 text-red-300' :
                                            profile.depth === 'DEEP' ? 'bg-teal-500/10 border-teal-500/20 text-teal-300' :
                                                'bg-zinc-500/10 border-zinc-500/20 text-zinc-300'
                                            }`}>{profile.depth}</span>
                                    )}
                                    <span className="px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded text-[6px] text-cyan-300 font-mono">LOCKED</span>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Neural Magnetic Handles */}
            <MagneticHandle
                type="target"
                position={Position.Left}
                color="#22d3ee"
                className={`handle-location ${isTargetConnected ? 'neural-engaged' : ''}`}
            />
            <MagneticHandle
                type="source"
                position={Position.Right}
                color="#22d3ee"
                className={`handle-location ${isSourceConnected ? 'neural-engaged' : ''}`}
            />
        </div>
    );
});
