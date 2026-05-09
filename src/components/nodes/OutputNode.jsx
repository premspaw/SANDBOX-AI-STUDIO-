import React, { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position, useUpdateNodeInternals } from 'reactflow';
import { motion } from 'framer-motion';
import { Image as ImageIcon, X, Download, Film, AlertTriangle } from 'lucide-react';

// Ratio → numeric aspect ratio
const RATIO_TO_NUM = {
    '1:1': 1, '3:2': 1.5, '2:3': 0.667, '3:4': 0.75, '4:3': 1.333,
    '4:5': 0.8, '5:4': 1.25, '9:16': 0.5625, '16:9': 1.778,
    '21:9': 2.333, '1:4': 0.25, '4:1': 4, '1:8': 0.125, '8:1': 8,
}

// Clamp output node width so extreme ratios don't blow out the canvas
const NODE_BASE = 224 // px — matches w-56
const MAX_HEIGHT = 420
const MIN_HEIGHT = 80

export const OutputNode = memo(({ id, data }) => {
    const [imgError, setImgError] = useState(false)
    const [loaded, setLoaded] = useState(false)
    const nodeRef = useRef(null)
    const updateNodeInternals = useUpdateNodeInternals()

    useEffect(() => {
        if (!nodeRef.current) return
        const observer = new ResizeObserver(() => updateNodeInternals(id))
        observer.observe(nodeRef.current)
        return () => observer.disconnect()
    }, [id, updateNodeInternals])

    // Reset image state when URL changes
    useEffect(() => {
        if (data.url) {
            setImgError(false)
            setLoaded(false)
        }
    }, [data.url])

    const handleSendToFilmstrip = () => {
        window.dispatchEvent(new CustomEvent('zerolens:addFrame', {
            detail: { url: data.url, type: 'image', model: data.model || 'Nano Banana' }
        }))
    }

    // Calculate image box height from ratio
    const ratio = data.ratio || '1:1'
    const ratioNum = RATIO_TO_NUM[ratio] || 1
    const rawHeight = Math.round(NODE_BASE / ratioNum)
    const imageHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, rawHeight))

    const isLoading = data.loading === true
    const isError = data.error === true
    const hasImage = !!data.url && !isLoading

    return (
        <div
            className="relative group/output-wrapper"
            ref={nodeRef}
            style={{ background: 'transparent' }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.85, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                style={{
                    boxShadow: isLoading
                        ? '0 0 0 1px rgba(245,158,11,0.5), 0 0 30px rgba(245,158,11,0.15)'
                        : isError
                        ? '0 0 0 1px rgba(239,68,68,0.4), 0 20px 60px rgba(0,0,0,0.8)'
                        : '0 0 0 1px rgba(245,158,11,0.3), 0 20px 60px rgba(0,0,0,0.8)',
                    width: NODE_BASE,
                }}
                className="relative bg-[#0c0c0c] border border-amber-500/20 rounded-2xl overflow-hidden group/output"
            >
                {/* Loading top bar pulse */}
                {isLoading && (
                    <motion.div
                        className="absolute top-0 inset-x-0 h-0.5 bg-amber-500 z-20 origin-left"
                        animate={{ scaleX: [0, 0.6, 0.8, 0.95] }}
                        transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }}
                    />
                )}

                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 bg-amber-500/5 border-b border-amber-500/10">
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                            isLoading ? 'bg-amber-500 animate-pulse' :
                            isError ? 'bg-red-400' :
                            loaded ? 'bg-emerald-400' : 'bg-white/20'
                        }`} />
                        <span className="text-[9px] font-black text-amber-400/80 tracking-widest uppercase">
                            {isLoading ? 'Generating...' : data.model || 'GEN_OUTPUT'}
                        </span>
                        {ratio && (
                            <span className="text-[7px] font-mono text-white/20 bg-white/5 px-1.5 py-0.5 rounded">
                                {ratio}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => data.onDelete?.(id)}
                        className="p-1 hover:bg-white/10 rounded-md transition-colors opacity-0 group-hover/output:opacity-100"
                    >
                        <X size={11} className="text-white/30 hover:text-red-400" />
                    </button>
                </div>

                {/* Image area — sized to ratio */}
                <div
                    className="relative bg-[#050505]"
                    style={{ height: imageHeight }}
                >
                    {/* LOADING STATE */}
                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            {/* Animated ratio placeholder skeleton */}
                            <motion.div
                                className="rounded-lg bg-amber-500/10 border border-amber-500/20"
                                style={{
                                    width: ratioNum >= 1
                                        ? Math.min(120, imageHeight * ratioNum)
                                        : imageHeight * ratioNum * 0.7,
                                    height: ratioNum >= 1
                                        ? Math.min(120, imageHeight * ratioNum) / ratioNum
                                        : imageHeight * 0.7,
                                }}
                                animate={{ opacity: [0.3, 0.7, 0.3] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                            />
                            <div className="flex flex-col items-center gap-1">
                                <div className="flex gap-1">
                                    {[0, 1, 2].map(i => (
                                        <motion.div
                                            key={i}
                                            className="w-1 h-1 rounded-full bg-amber-500/60"
                                            animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
                                            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                                        />
                                    ))}
                                </div>
                                <span className="text-[7px] font-mono text-amber-500/50 uppercase tracking-widest">
                                    Rendering {ratio}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* ERROR STATE */}
                    {isError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3">
                            <AlertTriangle size={20} className="text-red-400/60" />
                            <span className="text-[8px] text-red-400/60 font-mono text-center">
                                {data.errorMessage || 'Generation failed'}
                            </span>
                        </div>
                    )}

                    {/* IMAGE */}
                    {hasImage && !isError && (
                        <>
                            {!loaded && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                                </div>
                            )}
                            <img
                                src={data.url}
                                alt="Generated output"
                                className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                                onLoad={() => setLoaded(true)}
                                onError={() => { setImgError(true); setLoaded(true) }}
                                crossOrigin="anonymous"
                            />

                            {/* Hover overlay — only when image loaded */}
                            {loaded && (
                                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/output:opacity-100 transition-all duration-200 flex items-center justify-center gap-2">
                                    <button
                                        onClick={handleSendToFilmstrip}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-black text-[8px] font-black rounded-lg uppercase hover:bg-amber-400 transition-colors shadow-lg"
                                    >
                                        <Film size={10} /> Filmstrip
                                    </button>
                                    <a
                                        href={data.url}
                                        download
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                                    >
                                        <Download size={10} className="text-white/60" />
                                    </a>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-3 py-1.5 bg-white/[0.02]">
                    <p className="text-[7px] text-white/20 font-mono truncate">
                        {isLoading
                            ? 'Awaiting Gemini response...'
                            : isError
                            ? 'Error — node can be deleted'
                            : data.url?.split('?')[0]?.split('/').pop() || 'output.png'
                        }
                    </p>
                </div>
            </motion.div>

            {/* Handle — outside motion div, centered */}
            <Handle
                type="target"
                position={Position.Left}
                style={{
                    top: '50%',
                    left: -5,
                    transform: 'translateY(-50%)',
                    background: '#f59e0b',
                    border: '2px solid #0c0c0c',
                    width: 10,
                    height: 10,
                }}
            />
        </div>
    )
})

export default OutputNode
