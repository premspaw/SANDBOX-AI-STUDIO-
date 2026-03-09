import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Eraser, PenTool, Check } from 'lucide-react';
import { getApiUrl } from '../../config/apiConfig';
import { useAppStore } from '../../store';

const ImageEditorModal = ({ imageUrl, onClose, onSubmitSuccess }) => {
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(40);
    const [editPrompt, setEditPrompt] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const imageRef = useRef(null);
    const displayCanvasRef = useRef(null);
    const hiddenCanvasRef = useRef(null);

    const user = useAppStore(state => state.user);

    // Initialize canvas dimensions to match the image exact resolution
    const handleImageLoad = () => {
        if (!imageRef.current || !displayCanvasRef.current || !hiddenCanvasRef.current) return;

        const { naturalWidth, naturalHeight } = imageRef.current;

        // Display Canvas (for glowing green strokes)
        displayCanvasRef.current.width = naturalWidth;
        displayCanvasRef.current.height = naturalHeight;

        // Hidden Canvas (for pure black & white mask extraction)
        hiddenCanvasRef.current.width = naturalWidth;
        hiddenCanvasRef.current.height = naturalHeight;

        // Initialize hidden mask as pure black
        const hCtx = hiddenCanvasRef.current.getContext('2d');
        hCtx.fillStyle = 'black';
        hCtx.fillRect(0, 0, naturalWidth, naturalHeight);
    };

    const getMousePos = (e) => {
        const rect = displayCanvasRef.current.getBoundingClientRect();
        const scaleX = displayCanvasRef.current.width / rect.width;
        const scaleY = displayCanvasRef.current.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e) => {
        setIsDrawing(true);
        const { x, y } = getMousePos(e);
        const dCtx = displayCanvasRef.current.getContext('2d');
        const hCtx = hiddenCanvasRef.current.getContext('2d');

        dCtx.beginPath();
        dCtx.moveTo(x, y);
        hCtx.beginPath();
        hCtx.moveTo(x, y);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const { x, y } = getMousePos(e);
        const dCtx = displayCanvasRef.current.getContext('2d');
        const hCtx = hiddenCanvasRef.current.getContext('2d');

        // Draw neon green on display
        dCtx.lineTo(x, y);
        dCtx.strokeStyle = 'rgba(212, 255, 0, 0.4)';
        dCtx.lineWidth = brushSize;
        dCtx.lineCap = 'round';
        dCtx.lineJoin = 'round';
        dCtx.stroke();

        // Draw pure white on hidden mask (white = area to edit)
        hCtx.lineTo(x, y);
        hCtx.strokeStyle = 'white';
        hCtx.lineWidth = brushSize;
        hCtx.lineCap = 'round';
        hCtx.lineJoin = 'round';
        hCtx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearMask = () => {
        const dCtx = displayCanvasRef.current?.getContext('2d');
        const hCtx = hiddenCanvasRef.current?.getContext('2d');
        if (dCtx && hCtx) {
            dCtx.clearRect(0, 0, displayCanvasRef.current.width, displayCanvasRef.current.height);
            hCtx.fillStyle = 'black';
            hCtx.fillRect(0, 0, hiddenCanvasRef.current.width, hiddenCanvasRef.current.height);
        }
    };

    const submitEdit = async () => {
        if (!editPrompt.trim()) {
            window.toast("Please describe what you want to change in the highlighted area.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Get base64 representation
            const imgCanvas = document.createElement('canvas');
            imgCanvas.width = imageRef.current.naturalWidth;
            imgCanvas.height = imageRef.current.naturalHeight;
            const ctx = imgCanvas.getContext('2d');
            ctx.drawImage(imageRef.current, 0, 0);

            const imageBase64 = imgCanvas.toDataURL('image/jpeg', 0.9);
            const maskBase64 = hiddenCanvasRef.current.toDataURL('image/png'); // Use PNG for mask to prevent JPEG artifacts 

            const response = await fetch(getApiUrl('/api/edit-image'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64,
                    maskBase64,
                    prompt: editPrompt,
                    userId: user?.id
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Edit failed');

            if (data.url) {
                onSubmitSuccess(data.url);
                onClose();
            }
        } catch (err) {
            console.error(err);
            window.toast("Vertex AI Edit failed: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-8">
            <button onClick={onClose} disabled={isSubmitting} className="absolute top-8 right-8 text-white/50 hover:text-white transition">
                <X className="w-8 h-8" />
            </button>

            <div className="relative flex-1 min-h-0 flex flex-col items-center justify-center w-full max-w-5xl">
                {/* Canvas Container */}
                <div className="relative inline-block border border-white/20 rounded-xl overflow-hidden shadow-2xl cursor-crosshair">
                    {/* Original Image Layer */}
                    <img
                        ref={imageRef}
                        src={imageUrl}
                        alt="To Edit"
                        onLoad={handleImageLoad}
                        className="block max-w-full max-h-[70vh] object-contain pointer-events-none"
                    />
                    {/* Display Drawing Layer */}
                    <canvas
                        ref={displayCanvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        className="absolute inset-0 w-full h-full z-10 touch-none"
                    />
                    {/* Hidden Mask Layer */}
                    <canvas ref={hiddenCanvasRef} className="hidden" />
                </div>
            </div>

            {/* Editing Controls */}
            <div className="mt-6 bg-[#111] border border-white/10 rounded-2xl p-4 flex gap-4 items-center max-w-3xl w-full shadow-lg">
                <div className="flex flex-col gap-1 w-32 border-r border-white/10 pr-4">
                    <label className="text-[9px] font-bold uppercase text-gray-500 flex items-center gap-1">
                        <PenTool className="w-3 h-3" /> Brush Size
                    </label>
                    <input
                        type="range"
                        min="10"
                        max="150"
                        value={brushSize}
                        onChange={e => setBrushSize(parseInt(e.target.value))}
                        className="w-full accent-[#D4FF00]"
                    />
                </div>

                <button onClick={clearMask} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition" title="Clear Mask">
                    <Eraser className="w-4 h-4" />
                </button>

                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="What should we add or change in the highlighted area?"
                        value={editPrompt}
                        onChange={e => setEditPrompt(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && submitEdit()}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#D4FF00]/50 transition"
                    />
                </div>

                <button
                    onClick={submitEdit}
                    disabled={isSubmitting}
                    className="bg-[#D4FF00] text-black px-6 py-2.5 rounded-xl font-black uppercase text-xs flex items-center gap-2 hover:bg-white transition disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <Sparkles className="w-4 h-4 animate-spin" />
                    ) : (
                        <Check className="w-4 h-4" />
                    )}
                    Generate Edit
                </button>
            </div>
        </div>
    );
};

export default ImageEditorModal;
