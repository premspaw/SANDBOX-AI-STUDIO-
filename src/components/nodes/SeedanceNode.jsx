import { memo, useState, useRef } from 'react'
import { Handle, Position } from 'reactflow'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, X, Plus, Loader2, ChevronDown, Film, Upload, Mic, Video } from 'lucide-react'
import { cn } from '../../lib/utils'
import { AssetsLibrary } from '../panels/AssetsLibrary'
import { supabase } from '../../lib/supabase'
import { getApiUrl } from '../../config/apiConfig'

// ── Price table (per second) ──────────────────────────────
const PRICE_TABLE = {
    'seedance-2-fast': {
        '720p': { no_video: 0.150, with_video: 0.088 },
        '480p': { no_video: 0.070, with_video: 0.042 },
    },
    'seedance-2': {
        '720p': { no_video: 0.187, with_video: 0.116 },
        '480p': { no_video: 0.088, with_video: 0.055 },
    }
}

const calcCost = (model, resolution, hasVideoInput, duration) => {
    const tier = hasVideoInput ? 'with_video' : 'no_video'
    const rate = PRICE_TABLE[model]?.[resolution]?.[tier] || 0.165
    // with_video: cost = rate × (input_duration + output_duration), assume input ~4s
    const billable = hasVideoInput ? (4 + duration) : duration
    return (rate * billable).toFixed(3)
}

// ── Slot Row ──────────────────────────────────────────────
function SlotRow({ label, max, items, color, onAdd, onRemove }) {
    return (
        <div className="flex items-center gap-1.5 min-h-[22px]">
            <span className={cn('text-[8px] font-black uppercase w-7 shrink-0 tracking-wider', color)}>
                {label}
            </span>
            <div className="flex items-center gap-1 flex-wrap flex-1 min-h-[20px]">
                {items.map((item, i) => (
                    <div key={i}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-md group/pill"
                    >
                        {item.url && (
                            <img src={item.url}
                                className="w-4 h-4 rounded object-cover shrink-0"
                                onError={e => { e.target.style.display = 'none' }}
                            />
                        )}
                        <span className="text-[8px] font-mono text-white/40 max-w-[40px] truncate">{item.tag}</span>
                        <button onClick={() => onRemove(i)}
                            className="opacity-0 group-hover/pill:opacity-100 transition-opacity ml-0.5">
                            <X size={7} className="text-white/30 hover:text-red-400" />
                        </button>
                    </div>
                ))}
                {items.length < max && (
                    <button onClick={onAdd}
                        className="w-5 h-5 flex items-center justify-center bg-white/[0.03] border border-white/10 border-dashed rounded-md hover:bg-white/10 transition-colors group/add">
                        <Plus size={9} className="text-white/20 group-hover/add:text-white/50" />
                    </button>
                )}
            </div>
            <span className="text-[7px] text-white/15 shrink-0 font-mono">{items.length}/{max}</span>
        </div>
    )
}

// ── Main SeedanceNode ─────────────────────────────────────
export const SeedanceNode = memo(({ id, data }) => {
    const [prompt, setPrompt]               = useState('')
    const [images, setImages]               = useState([])   // { url, tag }
    const [videos, setVideos]               = useState([])
    const [audios, setAudios]               = useState([])
    const [firstFrame, setFirstFrame]       = useState(null)  // { url }
    const [lastFrame, setLastFrame]         = useState(null)
    const [model, setModel]                 = useState('seedance-2-fast')
    const [resolution, setResolution]       = useState('720p')
    const [duration, setDuration]           = useState(5)
    const [generateAudio, setGenerateAudio] = useState(false)
    const [ratio, setRatio]                 = useState('9:16')
    const [status, setStatus]               = useState('idle')
    const [outputUrl, setOutputUrl]         = useState(null)
    const [showGallery, setShowGallery]     = useState(false)
    const [galleryTarget, setGalleryTarget] = useState(null)
    const [showRatio, setShowRatio]         = useState(false)
    const [showModel, setShowModel]         = useState(false)
    const [isUploading, setIsUploading]     = useState(false)
    const [pollMsg, setPollMsg]             = useState('')
    const fileInputRef                      = useRef(null)

    const isBusy       = status === 'generating' || status === 'polling'
    const hasVideoInput = videos.length > 0
    const cost         = calcCost(model, resolution, hasVideoInput, duration)

    // ── Gallery open ──
    const openGallery = (type) => { setGalleryTarget(type); setShowGallery(true) }

    // ── Gallery pick ──
    const handleGalleryPick = (url) => {
        setShowGallery(false)
        if (!url) return
        if (galleryTarget === 'firstFrame') { setFirstFrame({ url }); return }
        if (galleryTarget === 'lastFrame')  { setLastFrame({ url });  return }
        if (galleryTarget === 'image' && images.length < 9) {
            const tag = `@img${images.length + 1}`
            setImages(p => [...p, { url, tag }])
            setPrompt(p => p ? `${p} ${tag}` : tag)
        } else if (galleryTarget === 'video' && videos.length < 3) {
            const tag = `@vid${videos.length + 1}`
            setVideos(p => [...p, { url, tag }])
            setPrompt(p => p ? `${p} ${tag}` : tag)
        } else if (galleryTarget === 'audio' && audios.length < 3) {
            const tag = `@aud${audios.length + 1}`
            setAudios(p => [...p, { url, tag }])
        }
    }

    // ── File upload ──
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file || !supabase) return
        setIsUploading(true)
        try {
            const ext  = file.name.split('.').pop()
            const path = `seedance/${Date.now()}.${ext}`
            const { error } = await supabase.storage.from('assets').upload(path, file)
            if (error) throw error
            const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(path)
            handleGalleryPick(publicUrl)
        } catch (err) {
            console.error('[SeedanceNode] Upload failed:', err)
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // ── Poll kie.ai task ──
    const pollTask = async (taskId, engine) => {
        setStatus('polling')
        for (let i = 0; i < 120; i++) {
            await new Promise(r => setTimeout(r, 5000))
            setPollMsg(`Polling... ${Math.round((i + 1) * 5)}s`)
            try {
                const statusUrl = getApiUrl(`/api/seedance/status/${encodeURIComponent(taskId)}?engine=${encodeURIComponent(engine)}&aspectRatio=${encodeURIComponent(ratio)}`)
                const res  = await fetch(statusUrl)
                const json = await res.json()
                const st   = json.status
                if (st === 'completed') {
                    const url = json.url
                    if (url) {
                        setOutputUrl(url)
                        setStatus('done')
                        setPollMsg('')
                        window.dispatchEvent(new CustomEvent('zerolens:addFrame', {
                            detail: { url, type: 'video', model: `Seedance 2.0 (${model})` }
                        }))
                        return
                    }
                }
                if (st === 'failed' || st === 'error') { setStatus('error'); setPollMsg(''); return }
            } catch (_) { continue }
        }
        setStatus('error')
        setPollMsg('Timed out')
    }

    // ── Generate ──
    const generate = async () => {
        if (isBusy || !prompt.trim()) return
        setStatus('generating')
        setOutputUrl(null)
        setPollMsg('')

        try {
            const seedanceContentArray = [{ type: 'text', text: prompt.trim() }]

            // First / Last frame
            if (firstFrame?.url) {
                seedanceContentArray.push({ type: 'image_url', image_url: { url: firstFrame.url }, role: 'first_frame' })
            }
            if (lastFrame?.url)  {
                seedanceContentArray.push({ type: 'image_url', image_url: { url: lastFrame.url }, role: 'last_frame' })
            }

            // Reference images (omni-reference)
            images.forEach(i => {
                seedanceContentArray.push({ type: 'image_url', image_url: { url: i.url }, role: 'reference_image' })
            })

            // Reference videos
            videos.forEach(v => {
                seedanceContentArray.push({ type: 'video_url', video_url: { url: v.url }, role: 'reference_video' })
            })

            // Reference audio
            audios.forEach(a => {
                seedanceContentArray.push({ type: 'audio_url', audio_url: { url: a.url }, role: 'reference_audio' })
            })

            const engine = model === 'seedance-2-fast' ? 'seedance-fast' : 'seedace'
            const body = {
                engine,
                model: `bytedance/${model}`,
                prompt: prompt.trim(),
                seedanceContentArray,
                aspectRatio: ratio,
                duration,
                resolution,
                generateAudio,
            }

            console.log('[SeedanceNode] Payload:', JSON.stringify(body, null, 2))

            const res  = await fetch(getApiUrl('/api/seedance/generate'), {
                method:  'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            })

            const json = await res.json()
            console.log('[SeedanceNode] Response:', json)

            if (!res.ok || !json.success) throw new Error(json.error || 'Task creation failed')

            const taskId = json.requestId
            if (!taskId) throw new Error('No taskId returned')

            await pollTask(taskId, json.engine || engine)

        } catch (err) {
            console.error('[SeedanceNode] Error:', err)
            setStatus('error')
            setPollMsg(err.message)
        }
    }

    const RATIOS  = ['9:16', '16:9', '1:1', '4:3', '3:4', '21:9', 'adaptive']
    const MODELS  = [
        { id: 'seedance-2-fast', label: 'Seedance 2 Fast', sub: 'Faster · Lower cost' },
        { id: 'seedance-2',      label: 'Seedance 2',      sub: 'Higher quality' },
    ]

    return (
        <>
            <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 26 }}
                className="group relative w-64 bg-[#080808] border border-[#D4FF00]/20 rounded-xl overflow-visible text-[10px] font-sans shadow-[0_0_40px_rgba(212,255,0,0.05)]"
            >
                {/* Top glow */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4FF00]/50 to-transparent" />

                {/* Delete */}
                <button onClick={() => data.onDelete?.(id)}
                    className="absolute top-2 right-2 p-1 hover:bg-red-500/20 rounded-lg transition-colors z-50 opacity-0 group-hover:opacity-100">
                    <X size={11} className="text-red-400" />
                </button>

                {/* ── Header ── */}
                <div className="px-3 py-2.5 border-b border-white/5 bg-[#D4FF00]/[0.04] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-[#D4FF00]/10 rounded-lg border border-[#D4FF00]/20">
                            <Film size={12} className="text-[#D4FF00]" />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-[#D4FF00] uppercase tracking-widest leading-none">
                                Seedance 2.0
                            </div>
                            <div className="text-[7px] font-mono text-white/25 mt-0.5">bytedance · kie.ai</div>
                        </div>
                    </div>
                    <div className={cn('w-2 h-2 rounded-full transition-all shrink-0',
                        isBusy      ? 'bg-[#D4FF00] animate-pulse shadow-[0_0_8px_rgba(212,255,0,0.8)]'
                        : status === 'done'  ? 'bg-emerald-400'
                        : status === 'error' ? 'bg-red-500'
                        : 'bg-white/10'
                    )} />
                </div>

                <div className="p-2.5 space-y-2">

                    {/* ── Model selector ── */}
                    <div className="relative">
                        <button onClick={() => setShowModel(!showModel)}
                            className="w-full flex items-center justify-between px-2 py-1.5 bg-white/[0.04] border border-white/10 rounded-lg text-[9px] font-bold text-white/60 hover:border-[#D4FF00]/30 transition-colors">
                            <span>{MODELS.find(m => m.id === model)?.label}</span>
                            <ChevronDown size={9} className="opacity-40" />
                        </button>
                        {showModel && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-[#111] border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl">
                                {MODELS.map(m => (
                                    <button key={m.id}
                                        onClick={() => { setModel(m.id); setShowModel(false) }}
                                        className={cn('w-full px-3 py-2 text-left transition-colors flex flex-col gap-0.5',
                                            model === m.id ? 'bg-[#D4FF00]/10' : 'hover:bg-white/5'
                                        )}>
                                        <span className={cn('text-[9px] font-black uppercase', model === m.id ? 'text-[#D4FF00]' : 'text-white/60')}>{m.label}</span>
                                        <span className="text-[7px] text-white/25 font-mono">{m.sub}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── First / Last frame slots ── */}
                    <div className="grid grid-cols-2 gap-1.5">
                        {[
                            { key: 'firstFrame', label: 'First Frame', val: firstFrame, set: setFirstFrame, color: 'text-lime-400 border-lime-500/20 bg-lime-500/5' },
                            { key: 'lastFrame',  label: 'Last Frame',  val: lastFrame,  set: setLastFrame,  color: 'text-purple-400 border-purple-500/20 bg-purple-500/5' },
                        ].map(({ key, label, val, set, color }) => (
                            <div key={key}
                                className={cn('relative h-14 rounded-lg border border-dashed overflow-hidden cursor-pointer group/frame transition-all', color,
                                    val ? 'border-solid' : ''
                                )}
                                onClick={() => val ? set(null) : openGallery(key)}
                            >
                                {val ? (
                                    <>
                                        <img src={val.url} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/frame:opacity-100 flex items-center justify-center transition-all">
                                            <X size={12} className="text-white" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 opacity-40 group-hover/frame:opacity-70 transition-opacity">
                                        <Plus size={10} className={color.split(' ')[0]} />
                                        <span className={cn('text-[7px] font-black uppercase', color.split(' ')[0])}>{label}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* ── Ref slots ── */}
                    <div className="space-y-1.5 bg-white/[0.02] border border-white/5 rounded-lg p-2">
                        <SlotRow label="IMG" max={9} items={images} color="text-cyan-400"
                            onAdd={() => openGallery('image')}
                            onRemove={i => setImages(p => p.filter((_, idx) => idx !== i))} />
                        <SlotRow label="VID" max={3} items={videos} color="text-purple-400"
                            onAdd={() => openGallery('video')}
                            onRemove={i => setVideos(p => p.filter((_, idx) => idx !== i))} />
                        <SlotRow label="AUD" max={3} items={audios} color="text-orange-400"
                            onAdd={() => openGallery('audio')}
                            onRemove={i => setAudios(p => p.filter((_, idx) => idx !== i))} />
                    </div>

                    {/* ── Prompt ── */}
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="@img1 walks forward toward camera..."
                        rows={2}
                        className="w-full bg-black/60 border border-white/8 rounded-lg px-2 py-1.5 text-[10px] text-white/80 placeholder:text-white/15 resize-none focus:outline-none focus:border-[#D4FF00]/30 font-mono leading-relaxed transition-colors"
                    />

                    {/* ── Controls ── */}
                    <div className="flex items-center gap-1.5">
                        {/* Ratio */}
                        <div className="relative">
                            <button onClick={() => setShowRatio(!showRatio)}
                                className="flex items-center gap-0.5 px-2 py-1.5 bg-white/5 border border-white/10 rounded-md text-white/50 text-[9px] font-bold hover:border-[#D4FF00]/30 transition-colors">
                                {ratio} <ChevronDown size={8} />
                            </button>
                            {showRatio && (
                                <div className="absolute bottom-full left-0 mb-1 bg-[#111] border border-white/10 rounded-xl overflow-hidden z-50 w-20 shadow-2xl">
                                    {RATIOS.map(r => (
                                        <button key={r}
                                            onClick={() => { setRatio(r); setShowRatio(false) }}
                                            className={cn('w-full px-2 py-1.5 text-[9px] font-bold text-left transition-colors',
                                                ratio === r ? 'bg-[#D4FF00] text-black' : 'text-white/50 hover:bg-white/5'
                                            )}>{r}</button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Duration */}
                        <select value={duration} onChange={e => setDuration(Number(e.target.value))}
                            className="flex-1 bg-white/5 border border-white/10 rounded-md px-1 py-1.5 text-[9px] text-white/50 focus:outline-none focus:border-[#D4FF00]/30">
                            {[3, 4, 5, 6, 8, 10, 12, 15].map(d => (
                                <option key={d} value={d} className="bg-[#111]">{d}s</option>
                            ))}
                        </select>

                        {/* Resolution */}
                        <button onClick={() => setResolution(r => r === '720p' ? '480p' : '720p')}
                            className={cn('px-1.5 py-1.5 rounded-md border text-[9px] font-black uppercase transition-all',
                                resolution === '720p'
                                    ? 'bg-[#D4FF00]/10 border-[#D4FF00]/30 text-[#D4FF00]'
                                    : 'bg-white/5 border-white/10 text-white/30'
                            )}>
                            {resolution}
                        </button>

                        {/* Audio toggle */}
                        <button onClick={() => setGenerateAudio(a => !a)}
                            className={cn('p-1.5 rounded-md border transition-all',
                                generateAudio
                                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                                    : 'bg-white/5 border-white/10 text-white/20'
                            )} title="Generate Audio">
                            <Mic size={10} />
                        </button>
                    </div>

                    {/* ── Cost display ── */}
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[7px] font-mono text-white/20 uppercase">
                            {hasVideoInput ? 'with video · ' : 'no video · '}
                            {resolution} · {duration}s
                        </span>
                        <span className="text-[8px] font-black text-[#D4FF00]/60">
                            ~${cost}
                        </span>
                    </div>

                    {/* ── Generate button ── */}
                    <button onClick={generate}
                        disabled={isBusy || !prompt.trim()}
                        className={cn(
                            'w-full py-2 rounded-lg font-black text-[10px] uppercase tracking-widest',
                            'flex items-center justify-center gap-1.5 transition-all',
                            isBusy          ? 'bg-white/5 text-white/20 cursor-wait'
                            : !prompt.trim() ? 'bg-white/5 text-white/20 cursor-not-allowed'
                            : 'bg-[#D4FF00] text-black hover:bg-white active:scale-95 shadow-[0_4px_20px_rgba(212,255,0,0.25)]'
                        )}>
                        {isBusy
                            ? <><Loader2 size={10} className="animate-spin" /> {pollMsg || status}...</>
                            : <><Zap size={10} fill="currentColor" /> Generate · ${cost}</>
                        }
                    </button>

                    {/* ── Output ── */}
                    <AnimatePresence>
                        {outputUrl && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="relative rounded-lg overflow-hidden bg-black group/vid border border-[#D4FF00]/20"
                                style={{ aspectRatio: ratio === '9:16' ? '9/16' : ratio === '16:9' ? '16/9' : '1/1' }}
                            >
                                <video src={outputUrl} muted autoPlay loop playsInline
                                    className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/vid:opacity-100 transition-all flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => window.dispatchEvent(new CustomEvent('zerolens:addFrame', {
                                            detail: { url: outputUrl, type: 'video', model: 'Seedance 2.0' }
                                        }))}
                                        className="px-2.5 py-1.5 bg-[#D4FF00] text-black text-[8px] font-black rounded-md uppercase"
                                    >
                                        → Filmstrip
                                    </button>
                                    <button onClick={() => window.open(outputUrl, '_blank')}
                                        className="px-2.5 py-1.5 bg-white/10 text-white text-[8px] font-black rounded-md uppercase">
                                        Open
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {status === 'error' && (
                        <p className="text-[8px] text-red-400 text-center py-1 font-bold font-mono">
                            ⚠ {pollMsg || 'Generation failed — retry'}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-3 py-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[7px] font-mono text-white/15 uppercase tracking-[0.2em]">
                        {model} · {ratio} · {duration}s
                    </span>
                    <span className={cn('text-[7px] font-black uppercase',
                        status === 'done'  ? 'text-emerald-400'
                        : status === 'error' ? 'text-red-400'
                        : isBusy           ? 'text-[#D4FF00]'
                        : 'text-white/15'
                    )}>
                        {status === 'done' ? 'DONE' : status === 'error' ? 'ERR' : isBusy ? 'WORKING' : 'IDLE'}
                    </span>
                </div>

                {/* Handles */}
                <Handle type="target" position={Position.Left}
                    style={{ top: '50%', left: -5, transform: 'translateY(-50%)',
                        width: 10, height: 10, background: '#D4FF00', border: '2px solid #080808' }} />
                <Handle type="source" position={Position.Right}
                    style={{ top: '50%', right: -5, transform: 'translateY(-50%)',
                        width: 10, height: 10, background: '#84cc16', border: '2px solid #080808' }} />
            </motion.div>

            {/* ── Gallery Sidecar ── */}
            <AnimatePresence>
                {showGallery && (
                    <motion.div
                        initial={{ opacity: 0, x: -16, scale: 0.96 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -16, scale: 0.96 }}
                        className="absolute left-[calc(100%+16px)] top-0 z-[100] w-[500px] h-[580px] bg-[#080808] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02] shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse" />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                    {galleryTarget?.replace(/([A-Z])/g, ' $1')} Vault
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4FF00]/10 border border-[#D4FF00]/20 rounded-lg text-[#D4FF00] text-[9px] font-black uppercase hover:bg-[#D4FF00]/20 transition-all disabled:opacity-50">
                                    {isUploading ? <Loader2 size={9} className="animate-spin" /> : <Upload size={9} />}
                                    Upload
                                </button>
                                <button onClick={() => setShowGallery(false)}
                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                                    <X size={14} className="text-white/30" />
                                </button>
                            </div>
                            <input ref={fileInputRef} type="file" className="hidden"
                                accept={galleryTarget === 'video' ? 'video/*' : galleryTarget === 'audio' ? 'audio/*' : 'image/*'}
                                onChange={handleFileUpload} />
                        </div>
                        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                            <AssetsLibrary
                                compact={true}
                                defaultTab={galleryTarget === 'video' ? 'videos' : 'images'}
                                onSelectReference={url => handleGalleryPick(url)}
                            />
                        </div>
                        <div className="h-0.5 bg-gradient-to-r from-transparent via-[#D4FF00]/20 to-transparent" />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
})

export default SeedanceNode
