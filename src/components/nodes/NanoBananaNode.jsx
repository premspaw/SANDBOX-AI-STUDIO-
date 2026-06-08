import { memo, useState, useRef, useEffect } from 'react'
import { Handle, Position, useUpdateNodeInternals } from 'reactflow'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Zap, X, Plus, Loader2, ChevronDown, Image as ImageIcon, Type, Camera, Globe } from 'lucide-react'
import { cn } from '../../lib/utils'
import { AssetsLibrary } from '../panels/AssetsLibrary'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store'
import { getApiUrl } from '../../config/apiConfig'

// ── Ratio → aspect-ratio CSS value map ──
const RATIO_TO_CSS = {
    '1:1': 1,
    '3:2': 3/2,
    '2:3': 2/3,
    '3:4': 3/4,
    '4:3': 4/3,
    '4:5': 4/5,
    '5:4': 5/4,
    '9:16': 9/16,
    '16:9': 16/9,
    '21:9': 21/9,
    '1:4': 1/4,
    '4:1': 4/1,
    '1:8': 1/8,
    '8:1': 8/1,
}

function SlotGrid({ items, max, onAdd, onRemove }) {
    return (
        <div className="grid grid-cols-5 gap-1">
            {items.map((item, i) => (
                <div key={i} className="relative aspect-square bg-white/5 border border-white/10 rounded-md overflow-hidden group/slot">
                    <img src={item.url} className="w-full h-full object-cover" />
                    <button
                        onClick={() => onRemove(i)}
                        className="absolute top-0.5 right-0.5 bg-black/60 rounded-md p-0.5 opacity-0 group-hover/slot:opacity-100 transition-opacity"
                    >
                        <X size={8} className="text-red-400" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/40 py-0.5 text-[6px] text-center font-mono opacity-60">
                        R{i+1}
                    </div>
                </div>
            ))}
            {items.length < max && (
                <button
                    onClick={onAdd}
                    className="aspect-square flex flex-col items-center justify-center bg-white/[0.03] border border-white/5 border-dashed rounded-md hover:bg-white/10 transition-colors group/add"
                >
                    <Plus size={10} className="text-white/20 group-hover/add:text-white/50" />
                </button>
            )}
        </div>
    )
}

export const NanoBananaNode = memo(({ id, data }) => {
    const addOutputNode = useAppStore(s => s.addOutputNode)
    const updateNodeData = useAppStore(s => s.updateNodeData)
    const [prompt, setPrompt]           = useState('')
    const [images, setImages]           = useState([])
    const [model, setModel]             = useState('banana2')
    const [ratio, setRatio]             = useState('1:1')
    const [resolution, setResolution]   = useState('1K')
    const [variations, setVariations]   = useState(1)
    const [webSearch, setWebSearch]     = useState(true)
    const [status, setStatus]           = useState('idle') // idle | generating | done | error
    const [showGallery, setShowGallery] = useState(false)
    const [showRatio, setShowRatio]     = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef                  = useRef(null)
    const nodeRef                       = useRef(null)
    const updateNodeInternals           = useUpdateNodeInternals()

    useEffect(() => {
        if (!nodeRef.current) return
        const observer = new ResizeObserver(() => updateNodeInternals(id))
        observer.observe(nodeRef.current)
        return () => observer.disconnect()
    }, [id, updateNodeInternals])

    const isBusy = status === 'generating'
    const maxRefs = 14

    const handleGalleryPick = (url) => {
        setShowGallery(false)
        if (url && images.length < maxRefs) setImages(prev => [...prev, { url }])
    }

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0]
        if (!file || !supabase) return
        setIsUploading(true)
        try {
            const ext = file.name.split('.').pop()
            const path = `vault/banana_${Date.now()}.${ext}`
            const { error } = await supabase.storage.from('assets').upload(path, file)
            if (error) throw error
            const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(path)
            handleGalleryPick(publicUrl)
        } catch (err) {
            console.error('Upload failed', err)
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const pollForResult = async (jobId) => {
        const maxAttempts = 90 // 3 minutes max
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(r => setTimeout(r, 2000))
            const res = await fetch(getApiUrl(`/api/job-status/${jobId}`))
            const data = await res.json()
            if (data.status === 'completed') return data.url
            if (data.status === 'failed') throw new Error(data.error || 'Job failed')
        }
        throw new Error('Generation timed out')
    }

    const generate = async () => {
        if (isBusy || !prompt.trim()) return
        setStatus('generating')

        // ── STEP 1: Spawn output node IMMEDIATELY with loading state ──
        const { nodes } = useAppStore.getState()
        const currentNode = nodes?.find(n => n.id === id)
        const newPos = currentNode
            ? { x: currentNode.position.x + 320, y: currentNode.position.y }
            : { x: 1000, y: 500 }

        const outputId = addOutputNode({
            sourceId: id,
            url: null,         // null = loading state
            loading: true,     // ← tells OutputNode to show spinner
            ratio: ratio,      // ← pass ratio for correct aspect box
            model: model === 'banana2' ? 'Nano Banana 2' : 'Nano Banana Pro',
            position: newPos
        })

        try {
            const { data: { user } } = await supabase.auth.getUser()

            const identity_images = images.map(img => img.url).filter(Boolean)

            const payload = {
                model: model === 'banana2' ? 'nano-banana-2' : 'nano-banana-pro',
                prompt: prompt.trim(),
                aspect_ratio: ratio,
                quality: resolution.toLowerCase(),
                num_outputs: variations,
                identity_images,
                google_search: webSearch,
                userId: user?.id || null
            }

            console.log('[NanoBanana Node] Payload:', payload)

            const response = await fetch(getApiUrl('/api/generate-image'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const resData = await response.json()
            if (!response.ok) throw new Error(resData.error || 'Generation failed')

            let resultUrl = null

            if (resData.jobId) {
                resultUrl = await pollForResult(resData.jobId)
            } else if (resData.url) {
                resultUrl = resData.url
            } else {
                throw new Error('No URL returned from API')
            }

            // ── STEP 2: Update the output node with the real image ──
            updateNodeData(outputId, {
                url: resultUrl,
                loading: false,
                ratio: ratio
            })

            // Also push to filmstrip
            window.dispatchEvent(new CustomEvent('zerolens:addFrame', {
                detail: {
                    url: resultUrl,
                    type: 'image',
                    model: model === 'banana2' ? 'Nano Banana 2' : 'Nano Banana Pro'
                }
            }))

            setStatus('done')

        } catch (err) {
            console.error('[NanoBanana Node] Error:', err)
            // Update output node to error state
            updateNodeData(outputId, {
                url: null,
                loading: false,
                error: true,
                errorMessage: err.message
            })
            setStatus('error')
        }
    }

    const ratios = ['16:9', '9:16', '1:1', '21:9']

    return (
        <>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                ref={nodeRef}
                className="group relative w-72 bg-[#0d0d0d] border border-amber-500/30 rounded-2xl shadow-[0_0_40px_rgba(245,158,11,0.08)] overflow-visible text-[10px] font-sans"
            >
                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-amber-500/5">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-amber-500/20 rounded-xl border border-amber-500/30">
                            <ImageIcon size={14} className="text-amber-400" />
                        </div>
                        <div>
                            <div className="text-[11px] font-black text-amber-400 uppercase tracking-tight">
                                {model === 'banana2' ? 'Nano Banana 2' : 'Nano Banana Pro'}
                            </div>
                            <div className="text-[7px] font-mono text-white/30 tracking-widest uppercase">Gemini Image Engine</div>
                        </div>
                    </div>
                    <button
                        onClick={() => data.onDelete?.(id)}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <X size={12} className="text-white/30 hover:text-red-400" />
                    </button>
                </div>

                <div className="p-3 space-y-3">
                    {/* Reference Images */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[8px] font-black text-white/40 uppercase tracking-wider italic">Reference Visuals</span>
                            <span className="text-[7px] text-amber-500/50 font-bold">{images.length}/{maxRefs} Slots</span>
                        </div>
                        <SlotGrid
                            items={images}
                            max={maxRefs}
                            onAdd={() => setShowGallery(true)}
                            onRemove={(i) => setImages(prev => prev.filter((_, idx) => idx !== i))}
                        />
                    </div>

                    {/* Prompt */}
                    <div className="relative group/prompt">
                        <textarea
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            placeholder="Describe your vision..."
                            className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white/90 placeholder:text-white/20 resize-none focus:outline-none focus:border-amber-500/40 font-mono leading-relaxed min-h-[60px] transition-all"
                        />
                    </div>

                    {/* Toggles */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setModel(m => m === 'banana2' ? 'bananaPro' : 'banana2')}
                            className={cn(
                                "flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase border transition-all",
                                model === 'banana2'
                                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                    : "bg-white/5 border-white/10 text-white/40"
                            )}
                        >
                            {model === 'banana2' ? '⚡ Flash' : '✨ Pro Quality'}
                        </button>
                        <button
                            onClick={() => setWebSearch(!webSearch)}
                            className={cn(
                                "px-2 py-1.5 rounded-lg flex items-center gap-1.5 text-[8px] font-bold border transition-all",
                                webSearch
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                    : "bg-white/5 border-white/10 text-white/20"
                            )}
                        >
                            <Globe size={10} /> {webSearch ? 'Live' : 'Static'}
                        </button>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                            <button
                                onClick={() => setShowRatio(!showRatio)}
                                className="w-full flex items-center justify-between px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-white/60"
                            >
                                {ratio} <ChevronDown size={10} />
                            </button>
                            {showRatio && (
                                <div className="absolute bottom-full left-0 w-full mb-1 bg-[#151515] border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl flex flex-col gap-px p-px">
                                    {ratios.map(r => (
                                        <button key={r}
                                            onClick={() => { setRatio(r); setShowRatio(false) }}
                                            className={cn(
                                                'px-2 py-1.5 text-[8px] font-bold text-center transition-colors',
                                                ratio === r ? 'bg-amber-500 text-black' : 'text-white/40 hover:bg-white/5'
                                            )}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <select
                            value={resolution}
                            onChange={e => setResolution(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[9px] font-bold text-white/60 focus:outline-none flex-1 text-center"
                        >
                            {['1K', '2K', '4K'].map(res => <option key={res} value={res} className="bg-[#151515] text-amber-500 font-bold">{res}</option>)}
                        </select>
                        <select
                            value={variations}
                            onChange={e => setVariations(Number(e.target.value))}
                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[9px] font-bold text-white/60 focus:outline-none flex-1 text-center"
                            title="Number of Variations"
                        >
                            {[1, 2, 3, 4].map(v => <option key={v} value={v} className="bg-[#151515] text-amber-500 font-bold">V{v}</option>)}
                        </select>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={generate}
                        disabled={isBusy || !prompt.trim()}
                        className={cn(
                            "w-full py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                            isBusy ? "bg-white/5 text-white/20 cursor-wait" :
                            !prompt.trim() ? "bg-white/5 text-white/20 cursor-not-allowed" :
                            "bg-amber-500 text-black shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:bg-amber-400"
                        )}
                    >
                        {isBusy
                            ? <><Loader2 size={12} className="animate-spin" /> Generating...</>
                            : <><Zap size={12} fill="currentColor" /> Visualize · {model === 'banana2' ? '1' : '3'} Shorts</>
                        }
                    </button>

                    {/* Status indicator */}
                    {status === 'error' && (
                        <div className="text-[8px] text-red-400 text-center font-bold">
                            Generation failed. Check console.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5 flex items-center justify-between rounded-b-2xl">
                    <div className="flex items-center gap-1.5">
                        <div className={cn(
                            "w-1.5 h-1.5 rounded-full transition-colors",
                            isBusy ? "bg-amber-500 animate-pulse" :
                            status === 'done' ? "bg-emerald-400" :
                            status === 'error' ? "bg-red-400" : "bg-white/10"
                        )} />
                        <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">
                            {status}
                        </span>
                    </div>
                </div>

                {/* Handles */}
                <Handle
                    type="target"
                    position={Position.Left}
                    style={{
                        top: '50%', left: -5, transform: 'translateY(-50%)',
                        width: 10, height: 10,
                        background: '#f59e0b', border: '2px solid #0d0d0d',
                    }}
                />
                <Handle
                    type="source"
                    position={Position.Right}
                    style={{
                        top: '50%', right: -5, transform: 'translateY(-50%)',
                        width: 10, height: 10,
                        background: '#84cc16', border: '2px solid #0d0d0d',
                    }}
                />
            </motion.div>

            {/* Gallery Sidecar */}
            <AnimatePresence>
                {showGallery && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="absolute left-[calc(100%+16px)] top-0 w-[480px] h-[600px] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-3xl overflow-hidden flex flex-col z-[100]"
                    >
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Select Reference</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] font-bold rounded-lg uppercase">
                                    {isUploading ? 'Uploading...' : 'Upload'}
                                </button>
                                <button onClick={() => setShowGallery(false)} className="p-1 hover:bg-white/10 rounded-lg">
                                    <X size={14} className="text-white/40" />
                                </button>
                            </div>
                            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <AssetsLibrary compact={true} onSelectReference={handleGalleryPick} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
})

export default NanoBananaNode
