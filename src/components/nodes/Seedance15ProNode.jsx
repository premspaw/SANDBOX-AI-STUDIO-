import { memo, useState, useRef } from 'react'
import { Handle, Position } from 'reactflow'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Zap, X, Plus, Loader2, ChevronDown, Film, Upload } from 'lucide-react'
import { cn } from '../../lib/utils'
import { AssetsLibrary } from '../panels/AssetsLibrary'
import { supabase } from '../../lib/supabase'
import { getApiUrl } from '../../config/apiConfig'

// ── Slot Row sub-component ──────────────────────────────────
function SlotRow({ label, max, items, color, onAdd, onRemove }) {
    return (
        <div className="flex items-center gap-1.5">
            <span className={cn('text-[8px] font-black uppercase w-6 shrink-0', color)}>
                {label}
            </span>
            <div className="flex items-center gap-1 flex-wrap flex-1">
                {items.map((item, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white/8 border border-white/10 rounded-md group/pill"
                    >
                        {item.url && (
                            <img
                                src={item.url}
                                className="w-4 h-4 rounded object-cover shrink-0"
                                onError={(e) => { e.target.style.display = 'none' }}
                            />
                        )}
                        <span className="text-[8px] font-mono text-white/50">{item.tag}</span>
                        <button
                            onClick={() => onRemove(i)}
                            className="opacity-0 group-hover/pill:opacity-100 transition-opacity ml-0.5"
                        >
                            <X size={8} className="text-white/40 hover:text-red-400" />
                        </button>
                    </div>
                ))}
                {items.length < max && (
                    <button
                        onClick={onAdd}
                        className="w-5 h-5 flex items-center justify-center bg-white/5 border border-white/10 border-dashed rounded-md hover:bg-white/10 transition-colors"
                    >
                        <Plus size={9} className="text-white/30" />
                    </button>
                )}
            </div>
            <span className="text-[7px] text-white/15 shrink-0">{items.length}/{max}</span>
        </div>
    )
}

// ── Main Seedance15ProNode ──────────────────────────────────────
export const Seedance15ProNode = memo(({ id, data }) => {
    const [prompt, setPrompt]             = useState('')
    const [images, setImages]             = useState([])  // [{ url, tag }]
    const [mode, setMode]                 = useState('pro') // 'pro' | 'lite-multi'
    const [ratio, setRatio]               = useState('16:9')
    const [duration, setDuration]         = useState(5)
    const [resolution, setResolution]     = useState('1080p')
    const [cameraFixed, setCameraFixed]   = useState(false)
    const [generateAudio, setGenerateAudio] = useState(true)
    const [status, setStatus]             = useState('idle')
    const [errorMsg, setErrorMsg]         = useState('')
    const [outputUrl, setOutputUrl]       = useState(null)
    const [showGallery, setShowGallery]   = useState(false)
    const [showRatio, setShowRatio]       = useState(false)
    const [isUploading, setIsUploading]   = useState(false)
    const fileInputRef                    = useRef(null)

    const isBusy = status === 'generating' || status === 'polling'
    const maxImages = mode === 'pro' ? 2 : 4;

    // ── Open gallery for specific slot type ──
    const openGallery = () => {
        setShowGallery(true)
    }

    // ── Called when user picks from gallery ──
    const handleGalleryPick = (url) => {
        setShowGallery(false)
        if (!url) return

        if (images.length < maxImages) {
            const idx = images.length + 1
            const tag = mode === 'lite-multi' ? `[Image ${idx}]` : (idx === 1 ? 'first_frame' : 'last_frame')
            setImages(prev => [...prev, { url, tag }])
            
            if (mode === 'lite-multi') {
                if (!prompt.includes(tag)) setPrompt(p => p ? `${p} ${tag}` : tag)
            }
        }
    }

    // ── Direct File Upload to Supabase ──
    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0]
        if (!file || !supabase) return

        setIsUploading(true)
        try {
            const ext = file.name.split('.').pop()
            const path = `vault/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

            const { data, error } = await supabase.storage
                .from('assets') 
                .upload(path, file)

            if (error) throw error

            const { data: { publicUrl } } = supabase.storage
                .from('assets')
                .getPublicUrl(path)

            handleGalleryPick(publicUrl)
        } catch (err) {
            console.error('Seedance15ProNode: Upload failed', err)
            window.toast?.('Upload failed - check connection', 'error')
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // ── Remove a slot item ──
    const removeItem = (idx) => {
        setImages(prev => prev.filter((_, i) => i !== idx))
    }

    // ── Poll ModelArk API ──
    const poll = async (taskId, engine) => {
        setStatus('polling')
        for (let i = 0; i < 60; i++) {
            await new Promise(r => setTimeout(r, 10000)) // Byteplus advises 10s backoff
            try {
                const statusUrl = getApiUrl(`/api/seedance/status/${encodeURIComponent(taskId)}?engine=${encodeURIComponent(engine)}&aspectRatio=${encodeURIComponent(ratio)}`)
                const res = await fetch(statusUrl)
                const json = await res.json()
                if (json.status === 'completed') {
                    const url = json.url
                    setOutputUrl(url)
                    setStatus('done')
                    // Fire event → PromptGenerator filmstrip picks it up
                    window.dispatchEvent(new CustomEvent('zerolens:addFrame', {
                        detail: { url, type: 'video', model: mode === 'pro' ? 'Seedance 1.5 Pro' : 'Seedance 1.0 Lite' }
                    }))
                    return
                }
                if (json.status === 'failed' || json.status === 'error') {
                    const failReason = json.error || json.message || 'Generation failed';
                    setErrorMsg(failReason.toLowerCase().includes('real person') ? 'Real-Person Policy Flagged: Volcano/BytePlus Ark safety filters restrict generating video from reference images that resemble real people.' : failReason);
                    setStatus('error');
                    return;
                }
            } catch (_) { continue }
        }
        setErrorMsg('Task compilation timed out.');
        setStatus('error');
    }

    // ── Generate ──
    const generate = async () => {
        if (isBusy || !prompt.trim()) return
        setStatus('generating')
        setErrorMsg('')
        setOutputUrl(null)

        const contentBlocks = [{ type: 'text', text: prompt.trim() }]
        
        if (mode === 'lite-multi') {
            images.forEach(img => {
                contentBlocks.push({
                    type: 'image_url',
                    image_url: { url: img.url },
                    role: 'reference_image'
                })
            })
        } else {
            // mode = 'pro'
            if (images.length > 0) {
                contentBlocks.push({
                    type: 'image_url',
                    image_url: { url: images[0].url },
                    role: 'first_frame'
                })
                if (images.length > 1) {
                    contentBlocks.push({
                        type: 'image_url',
                        image_url: { url: images[1].url },
                        role: 'last_frame'
                    })
                }
            }
        }

        try {
            const model = mode === 'lite-multi' ? 'seedance-1-0-lite-i2v-250428' : 'seedance-1-5-pro-251215'
            const res = await fetch(getApiUrl('/api/seedance/generate'), {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    engine: 'seedace',
                    model,
                    prompt: prompt.trim(),
                    seedanceContentArray: contentBlocks,
                    generateAudio,
                    aspectRatio: ratio,
                    duration,
                    camera_fixed: cameraFixed,
                    ...(mode === 'pro' ? { resolution } : {}),
                    watermark: false
                })
            })
            const json = await res.json()
            if (!res.ok || !json.requestId) throw new Error(json.error || 'No task ID returned')
            await poll(json.requestId, json.engine || 'seedace-ark')
        } catch (err) {
            console.error(err)
            let rawMsg = err.message || 'Generation failed'
            if (rawMsg.toLowerCase().includes('real person') || rawMsg.toLowerCase().includes('realperson')) {
                rawMsg = 'Real-Person Policy Flagged: Volcano/BytePlus Ark safety filters restrict generating video from reference images that resemble real people.'
            }
            setErrorMsg(rawMsg)
            setStatus('error')
        }
    }

    const getEstCost = () => {
        if (mode === 'pro') {
            // Seedance 1.5 Pro (30% margin included)
            const rate = resolution === '1080p'
                ? (generateAudio ? 0.151 : 0.075)
                : resolution === '720p'
                ? (generateAudio ? 0.068 : 0.034)
                : (generateAudio ? 0.031 : 0.016);
            return (duration * rate).toFixed(2);
        } else {
            // Seedance 1.0 Lite (30% margin included)
            const rate = resolution === '1080p' ? 0.159 : resolution === '720p' ? 0.068 : 0.031;
            return (duration * rate).toFixed(2);
        }
    };
    const estCost = getEstCost();

    return (
        <>
            <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="group relative w-64 bg-[#0a0a0a] border border-[#00F0FF]/25 rounded-xl shadow-[0_0_30px_rgba(0,240,255,0.06)] overflow-visible text-[10px] font-sans"
            >
                {/* Top glow line */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00F0FF]/40 to-transparent" />

                {/* Delete button */}
                <button
                    onClick={() => data.onDelete?.(id)}
                    className="absolute top-2 right-2 p-1 bg-red-500/0 hover:bg-red-500/20 rounded-lg transition-colors z-50 opacity-0 group-hover:opacity-100"
                >
                    <X size={11} className="text-red-400" />
                </button>

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5 bg-[#00F0FF]/5">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-[#00F0FF]/10 rounded-lg border border-[#00F0FF]/20">
                            <Sparkles size={12} className="text-[#00F0FF]" />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-[#00F0FF] uppercase tracking-widest">
                                Seedance 1.5 Pro
                            </div>
                            <div className="text-[7px] font-mono text-white/30">Ark API v3</div>
                        </div>
                    </div>
                    <div className={cn(
                        'w-2 h-2 rounded-full transition-all',
                        isBusy      ? 'bg-[#00F0FF] animate-pulse shadow-[0_0_6px_rgba(0,240,255,0.8)]'
                        : status === 'done'  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                        : status === 'error' ? 'bg-red-500'
                        : 'bg-white/15'
                    )} />
                </div>

                <div className="p-2.5 space-y-2">
                    {/* ── Slot rows ── */}
                    <div className="bg-white/[0.02] p-1.5 rounded-lg border border-white/5 space-y-1">
                       <div className="flex items-center justify-between mb-1 px-1">
                           <span className="text-[8px] font-black uppercase text-white/40">Model Mode</span>
                           <button 
                               onClick={() => { setMode(m => m === 'pro' ? 'lite-multi' : 'pro'); setImages([]); }}
                               className={cn(
                                   "px-1.5 py-0.5 rounded text-[7px] font-black tracking-wider transition-colors border",
                                   mode === 'pro' ? "bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/25" : "bg-pink-500/10 text-pink-400 border-pink-500/25"
                               )}
                           >
                               {mode === 'pro' ? '1.5 PRO (KEYFRAMES)' : '1.0 LITE (MULTI-REF)'}
                           </button>
                       </div>
                       <SlotRow 
                          label={mode === 'pro' ? "FRAMES" : "REFS"} 
                          max={maxImages} 
                          items={images} 
                          color={mode === 'pro' ? "text-pink-400" : "text-violet-400"}
                          onAdd={openGallery} 
                          onRemove={removeItem} 
                       />
                       <div className="px-1 text-[6.5px] font-mono text-white/30 uppercase mt-1">
                          {mode === 'pro' 
                              ? 'Slot 1: First Frame | Slot 2: Last Frame' 
                              : `Use tags like [Image 1], [Image 2] in your prompt`}
                       </div>
                    </div>

                    {/* ── Prompt ── */}
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="A girl holding a fox, the girl opens her eyes..."
                        rows={2}
                        className="w-full bg-black/60 border border-white/8 rounded-lg px-2 py-1.5 text-[10px] text-white/80 placeholder:text-white/15 resize-none focus:outline-none focus:border-[#00F0FF]/30 font-mono leading-relaxed transition-colors"
                    />

                    {/* ── Controls row ── */}
                    <div className="flex items-center gap-1.5">
                        {/* Ratio */}
                        <div className="relative">
                            <button
                                onClick={() => setShowRatio(!showRatio)}
                                className="flex items-center gap-0.5 px-1.5 py-1 bg-white/5 border border-white/10 rounded-md text-white/60 hover:text-white transition-colors text-[9px] font-bold"
                            >
                                {ratio}
                                <ChevronDown size={8} />
                            </button>
                            {showRatio && (
                                <div className="absolute bottom-full left-0 mb-1 bg-[#111] border border-white/10 rounded-lg overflow-hidden z-50 w-16">
                                    {['16:9', '9:16', '1:1', '4:3', '3:4', '21:9', 'adaptive'].map(r => (
                                        <button key={r}
                                            onClick={() => { setRatio(r); setShowRatio(false) }}
                                            className={cn(
                                                'w-full px-2 py-1.5 text-[9px] font-bold text-left transition-colors',
                                                ratio === r ? 'bg-[#00F0FF] text-black' : 'text-white/60 hover:bg-white/5'
                                            )}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Duration */}
                        <select
                            value={duration}
                            onChange={e => setDuration(Number(e.target.value))}
                            className="flex-1 bg-white/5 border border-white/10 rounded-md px-1 py-1 text-[9px] text-white/60 focus:outline-none focus:border-[#00F0FF]/30"
                        >
                            {[4, 5, 6, 8, 10, 12].map(d => (
                                <option key={d} value={d} className="bg-[#111]">{d}s</option>
                            ))}
                        </select>

                        {/* Resolution toggle */}
                        <button
                            onClick={() => setResolution(q => q === '1080p' ? '720p' : q === '720p' ? '480p' : '1080p')}
                            className={cn(
                                'px-1.5 py-1 rounded-md border text-[9px] font-black uppercase transition-all',
                                resolution === '1080p'
                                    ? 'bg-[#00F0FF]/15 border-[#00F0FF]/30 text-[#00F0FF]'
                                    : 'bg-white/5 border-white/10 text-white/40'
                            )}
                        >
                            {resolution}
                        </button>
                    </div>

                    {/* ── Advanced Toggles ── */}
                    <div className="flex items-center gap-2 px-1">
                        <button 
                            onClick={() => setCameraFixed(!cameraFixed)}
                            className={cn(
                                "flex items-center gap-1 text-[8px] font-bold uppercase transition-colors px-1.5 py-0.5 rounded border",
                                cameraFixed ? "text-violet-400 border-violet-500/30 bg-violet-500/10" : "text-white/20 border-white/5 bg-white/5"
                            )}
                        >
                            <Film size={8} /> {cameraFixed ? 'Fixed Cam' : 'Free Cam'}
                        </button>
                        <button 
                            onClick={() => setGenerateAudio(!generateAudio)}
                            className={cn(
                                "flex items-center gap-1 text-[8px] font-bold uppercase transition-colors px-1.5 py-0.5 rounded border",
                                generateAudio ? "text-orange-400 border-orange-500/30 bg-orange-500/10" : "text-white/20 border-white/5 bg-white/5"
                            )}
                        >
                            <Zap size={8} /> {generateAudio ? 'Audio ON' : 'Audio OFF'}
                        </button>
                    </div>

                    {/* ── Generate button ── */}
                    <button
                        onClick={generate}
                        disabled={isBusy || !prompt.trim()}
                        className={cn(
                            'w-full py-2 rounded-lg font-black text-[10px] uppercase tracking-widest',
                            'flex items-center justify-center gap-1.5 transition-all',
                            isBusy
                                ? 'bg-white/5 text-white/20 cursor-wait'
                                : !prompt.trim()
                                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                : 'bg-[#00F0FF] text-black hover:bg-white active:scale-95'
                        )}
                    >
                        {isBusy
                            ? <><Loader2 size={10} className="animate-spin" /> {status}...</>
                            : <><Zap size={10} /> Generate · ${estCost}</>
                        }
                    </button>

                    {/* ── Output thumbnail ── */}
                    <AnimatePresence>
                        {outputUrl && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="relative rounded-lg overflow-hidden bg-black aspect-video group/vid border border-[#00F0FF]/20"
                            >
                                <video src={outputUrl} muted autoPlay loop controls={false}
                                    className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/vid:opacity-100 transition-all flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => window.dispatchEvent(new CustomEvent('zerolens:addFrame', {
                                            detail: { url: outputUrl, type: 'video', model: 'Seedance 1.5 Pro' }
                                        }))}
                                        className="px-2.5 py-1.5 bg-[#00F0FF] text-black text-[8px] font-black rounded-md uppercase shadow-lg"
                                    >
                                        → Strip
                                    </button>
                                    <button
                                        onClick={() => window.open(outputUrl, '_blank')}
                                        className="px-2.5 py-1.5 bg-white/10 text-white text-[8px] font-black rounded-md uppercase"
                                    >
                                        Open
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {status === 'error' && (
                        <p className="text-[8px] text-red-400 text-center py-1 font-bold">
                            ⚠ {errorMsg || 'Task failed or timed out — retry'}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-3 pb-2.5 flex items-center justify-between border-t border-white/5 pt-2">
                    <span className="text-[7px] font-bold text-white/15 uppercase tracking-[0.3em] font-mono">
                        SEEDANCE 1.5 · {ratio}
                    </span>
                    <span className={cn(
                        'text-[7px] font-bold uppercase',
                        status === 'done' ? 'text-emerald-400' : status === 'error' ? 'text-red-400' : isBusy ? 'text-[#00F0FF]' : 'text-white/20'
                    )}>
                        {status === 'done' ? 'RENDERED' : status === 'error' ? 'FAILED' : isBusy ? status.toUpperCase() : 'IDLE'}
                    </span>
                </div>
            </motion.div>

            {/* ── Sidecar Gallery Panel (Opens beside the node) ── */}
            <AnimatePresence mode="wait">
                {showGallery && (
                    <motion.div
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, scale: 0.95 }}
                        className="absolute left-[calc(100%+16px)] top-0 z-[100] w-[500px] h-[600px] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse" />
                                <span className="text-[11px] font-black text-white uppercase tracking-widest">
                                    Image Reference Vault
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00F0FF]/10 border border-[#00F0FF]/20 rounded-lg text-[#00F0FF] text-[9px] font-black uppercase hover:bg-[#00F0FF]/20 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isUploading ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                                    Upload Local
                                </button>
                                
                                <input 
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept={'image/*'}
                                    onChange={handleFileUpload}
                                />

                                <button
                                    onClick={() => setShowGallery(false)}
                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X size={16} className="text-white/40" />
                                </button>
                            </div>
                        </div>

                        {/* Gallery Content */}
                        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                            <AssetsLibrary
                                compact={true}
                                defaultTab={'images'}
                                onSelectReference={(url) => handleGalleryPick(url)}
                            />
                        </div>
                        
                        {/* Footer decorative line */}
                        <div className="h-1 bg-gradient-to-r from-transparent via-[#00F0FF]/20 to-transparent" />
                    </motion.div>
                )}
            </AnimatePresence>

            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
        </>
    )
})

export default Seedance15ProNode
