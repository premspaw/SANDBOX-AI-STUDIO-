import React, { memo, useState, useCallback } from 'react';
import { Position } from 'reactflow';
import MagneticHandle from './edges/MagneticHandle';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, X, Upload, Eye, Loader2, Tag } from 'lucide-react';
import { useAppStore } from '../store';
import { getApiUrl } from '../config/apiConfig';

export default memo(({ id, data }) => {
    const updateNodeData = useAppStore(s => s.updateNodeData);
    const setCurrentProduct = useAppStore(s => s.setCurrentProduct);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const handleImageUpload = useCallback(async (file) => {
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const imageData = reader.result;
            updateNodeData(id, { productImage: imageData, productName: file.name });
            setCurrentProduct({ image: imageData, description: '', labels: [] });

            // Auto-analyze with Vision API
            setIsAnalyzing(true);
            try {
                const response = await fetch(getApiUrl('/api/ugc/analyze-product'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: imageData })
                });
                const result = await response.json();
                if (result.labels) {
                    updateNodeData(id, {
                        productLabels: result.labels,
                        productDescription: result.description,
                        productColors: result.colors || []
                    });
                    setCurrentProduct({
                        image: imageData,
                        description: result.description,
                        labels: result.labels,
                        colors: result.colors || []
                    });
                }
            } catch (err) {
                console.error('Product analysis error:', err);
                const fallback = 'Product scan complete (Analysis failed — click to retry)';
                updateNodeData(id, { productDescription: fallback });
                setCurrentProduct({
                    image: imageData,
                    description: fallback,
                    labels: ['product'],
                    colors: ['#888888']
                });
            } finally {
                setIsAnalyzing(false);
            }
        };
        reader.readAsDataURL(file);
    }, [id, updateNodeData, setCurrentProduct]);

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
        <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ scale: 1.25 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            style={{ zIndex: 1 }}
            className="group relative px-5 py-4 bg-[#0a0a0a]/90 border-2 border-amber-500/20 rounded-2xl min-w-[250px] max-w-[280px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-amber-500/50 transition-all"
        >
            <MagneticHandle
                type="target"
                position={Position.Left}
                color="#f59e0b"
                className={`handle-product ${useAppStore.getState().edges.some(e => e.target === id) ? 'neural-engaged' : ''}`}
            />

            <button
                onClick={() => data.onDelete(id)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white scale-0 group-hover:scale-100 transition-transform shadow-lg z-50"
            >
                <X size={10} />
            </button>

            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-500/20 rounded-lg">
                        <Package size={14} className="text-amber-400" />
                    </div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">PRODUCT_SCAN</span>
                </div>
                {isAnalyzing && <Loader2 size={12} className="text-amber-400 animate-spin" />}
            </div>

            {/* Dropzone / Preview */}
            {!data.productImage ? (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`relative w-full h-28 rounded-xl border-2 border-dashed ${dragOver ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 bg-black/30'} flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-amber-500/40`}
                    onClick={() => document.getElementById(`product-upload-${id}`)?.click()}
                >
                    <Upload size={20} className="text-white/20" />
                    <span className="text-[9px] text-white/30 font-mono">DROP PRODUCT IMAGE</span>
                    <input
                        id={`product-upload-${id}`}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </div>
            ) : (
                <div className="relative w-full h-28 rounded-xl overflow-hidden mb-2">
                    <img
                        src={data.productImage}
                        alt="Product"
                        className="w-full h-full object-contain bg-black/40"
                    />
                    <div className="absolute bottom-1 right-1 px-2 py-0.5 bg-black/60 rounded-md">
                        <span className="text-[7px] text-amber-400 font-mono">SCANNED</span>
                    </div>
                </div>
            )}

            {/* Vision Analysis Results */}
            <AnimatePresence>
                {data.productLabels && data.productLabels.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2"
                    >
                        <div className="flex items-center gap-1.5 mb-1">
                            <Eye size={10} className="text-amber-400" />
                            <span className="text-[8px] text-white/30 font-mono uppercase">VISION_OUTPUT</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {data.productLabels.slice(0, 6).map((label, i) => (
                                <motion.span
                                    key={i}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.06 }}
                                    className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md text-[8px] text-amber-300 font-mono"
                                >
                                    <Tag size={8} className="inline mr-1" />{label}
                                </motion.span>
                            ))}
                        </div>
                        {data.productDescription && (
                            <p className="mt-1.5 text-[9px] text-white/40 font-mono leading-relaxed">
                                {data.productDescription}
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Product Colors */}
            {data.productColors && data.productColors.length > 0 && (
                <div className="mt-2 flex items-center gap-1">
                    {data.productColors.slice(0, 5).map((color, i) => (
                        <div key={i} className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: color }} />
                    ))}
                </div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
                <span className="text-[6px] font-bold text-white/10 uppercase tracking-[0.4em]">PROD_SCAN_V1</span>
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-amber-400">
                    <div className={`w-1.5 h-1.5 rounded-full ${data.productImage ? 'bg-amber-500' : 'border border-amber-500/40'}`} />
                    {data.productImage ? 'PRODUCT_LOCKED' : 'UPLOAD_REQUIRED'}
                </div>
            </div>

            <MagneticHandle
                type="source"
                position={Position.Right}
                color="#f59e0b"
                className={`handle-product ${useAppStore.getState().edges.some(e => e.source === id) ? 'neural-engaged' : ''}`}
            />
        </motion.div>
    );
});
