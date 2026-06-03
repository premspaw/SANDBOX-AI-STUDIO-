import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Loader2, Pencil } from 'lucide-react';
import { getApiUrl, resolveUrl } from '../../config/apiConfig';

interface InpaintEditorProps {
  imageUrl: string;
  userId?: string | null;
  onClose: () => void;
  onDone: (url: string) => void;
}

export function InpaintEditor({ imageUrl, userId, onClose, onDone }: InpaintEditorProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [tool, setTool] = React.useState<'brush' | 'eraser'>('brush');
  const [brushSize, setBrushSize] = React.useState(32);
  const [instruction, setInstruction] = React.useState('');
  const [model, setModel] = React.useState<'gemini' | 'gpt'>('gemini');
  const [isEditing, setIsEditing] = React.useState(false);
  const [history, setHistory] = React.useState<string[]>([]);
  const lastPos = React.useRef<{ x: number; y: number } | null>(null);
  const [refImage, setRefImage] = React.useState<string | null>(null);
  const refInputRef = React.useRef<HTMLInputElement>(null);

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setRefImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHistory(prev => [...prev.slice(-10), canvas.toDataURL()]);
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    saveHistory();
  };

  const undo = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length < 2) return;
    const prev = history[history.length - 2];
    const i = new window.Image();
    i.onload = () => {
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(i, 0, 0);
    };
    i.src = prev;
    setHistory(h => h.slice(0, -1));
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
  };

  const getPos = (e: any, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const draw = (e: any) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e, canvas);
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = 'rgba(168,85,247,0.85)';
    ctx.lineWidth = brushSize * (canvas.width / canvas.getBoundingClientRect().width);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.current?.x ?? pos.x, lastPos.current?.y ?? pos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const startDraw = (e: any) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current!;
    lastPos.current = getPos(e, canvas);
    draw(e);
  };

  const stopDraw = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveHistory();
    }
    lastPos.current = null;
  };

  const getMaskBase64 = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const mask = document.createElement('canvas');
    mask.width = canvas.width;
    mask.height = canvas.height;
    const mctx = mask.getContext('2d')!;
    mctx.fillStyle = 'black';
    mctx.fillRect(0, 0, mask.width, mask.height);
    const paintData = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
    const out = mctx.getImageData(0, 0, mask.width, mask.height);
    for (let i = 0; i < paintData.data.length; i += 4) {
      if (paintData.data[i + 3] > 10) {
        out.data[i] = 255;
        out.data[i + 1] = 255;
        out.data[i + 2] = 255;
        out.data[i + 3] = 255;
      }
    }
    mctx.putImageData(out, 0, 0);
    return mask.toDataURL('image/png');
  };

  const handleEdit = async () => {
    if (!instruction.trim()) {
      alert('Describe what to change in the painted area.');
      return;
    }
    const maskBase64 = getMaskBase64();
    if (!maskBase64) return;
    setIsEditing(true);
    try {
      let resultUrl: string | null = null;
      if (model === 'gemini') {
        const resp = await fetch(getApiUrl('/api/edit-image'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: imageUrl,
            maskBase64,
            prompt: instruction + (refImage ? ' Reference image provided for style guidance.' : ''),
            referenceImage: refImage || undefined,
            userId
          })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Edit failed');
        resultUrl = data.url || data.imageUrl || data.dataUrl;
      } else {
        const editPrompt = `Edit the image as follows: ${instruction}.${refImage ? ' Use the reference image as a style/content guide for the marked area.' : ''} Focus changes ONLY on the highlighted/masked region. Keep everything else exactly the same.`;
        const resp = await fetch(getApiUrl('/api/generate-image'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-image-2',
            prompt: editPrompt,
            image: imageUrl,
            secondImage: refImage || undefined,
            size: '1024x1024',
            quality: 'medium',
            userId
          })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'GPT edit failed');
        resultUrl = data.url || data.imageUrl;
      }
      if (resultUrl) {
        onDone(resultUrl);
        onClose();
      } else {
        throw new Error('No image returned');
      }
    } catch (err: any) {
      alert('Edit failed: ' + err.message);
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.93, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.93, y: 20 }}
          className="relative w-full max-w-4xl bg-[#0e0e11] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl max-h-[95vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#0e0e11] flex-none">
            <div className="flex items-center gap-3">
              <Pencil className="w-4 h-4 text-purple-400" />
              <span className="font-black text-white text-sm uppercase tracking-wider">Brush Edit</span>
              <span className="text-[10px] text-white/30 uppercase tracking-widest">
                Paint the area · describe the change · hit Edit
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Canvas area */}
            <div className="flex-1 relative overflow-auto flex items-center justify-center bg-black/40 p-3">
              <div className="relative inline-block">
                <img
                  ref={imgRef}
                  src={resolveUrl(imageUrl)}
                  alt="edit base"
                  onLoad={initCanvas}
                  crossOrigin="anonymous"
                  className="block rounded-xl max-w-full max-h-[70vh] object-contain"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 rounded-xl"
                  style={{ width: '100%', height: '100%', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
                  onMouseDown={startDraw}
                  onMouseMove={e => isDrawing && draw(e)}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={e => isDrawing && draw(e)}
                  onTouchEnd={stopDraw}
                />
              </div>
            </div>

            {/* Right controls */}
            <div className="w-60 flex-none border-l border-white/10 bg-[#111114] flex flex-col p-4 gap-4 overflow-y-auto">
              {/* Tools */}
              <div className="space-y-2">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Tool</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTool('brush')}
                    className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                      tool === 'brush' ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    🖌 Brush
                  </button>
                  <button
                    onClick={() => setTool('eraser')}
                    className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                      tool === 'eraser' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    ◻ Erase
                  </button>
                </div>
              </div>

              {/* Brush size */}
              <div className="space-y-2">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Brush Size: {brushSize}px</p>
                <input
                  type="range"
                  min={8}
                  max={120}
                  value={brushSize}
                  onChange={e => setBrushSize(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              {/* Undo / Clear */}
              <div className="flex gap-2">
                <button
                  onClick={undo}
                  disabled={history.length < 2}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 text-white/40 hover:bg-white/10 disabled:opacity-30 transition-all"
                >
                  ↩ Undo
                </button>
                <button
                  onClick={clearMask}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 text-white/40 hover:bg-white/10 transition-all"
                >
                  ✕ Clear
                </button>
              </div>

              {/* Reference Image */}
              <div className="space-y-2">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                  Reference Image <span className="font-normal normal-case text-white/20">(optional)</span>
                </p>
                {refImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-lime-500/30 bg-white/5">
                    <img src={refImage} alt="ref" className="w-full max-h-24 object-cover" />
                    <button
                      onClick={() => setRefImage(null)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-red-500/80 flex items-center justify-center transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                    <span className="absolute bottom-1 left-1 text-[8px] text-lime-300 bg-black/60 px-1.5 py-0.5 rounded font-bold uppercase">
                      Ref ✓
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => refInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-white/15 hover:border-lime-400/40 rounded-xl py-3 flex items-center justify-center gap-2 text-[10px] text-white/30 hover:text-white/60 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Reference
                  </button>
                )}
                <input ref={refInputRef} type="file" accept="image/*" className="hidden" onChange={handleRefUpload} />
                <p className="text-[8px] text-white/15 leading-relaxed">
                  Sent alongside image to guide AI on what to draw in marked area.
                </p>
              </div>

              {/* Model */}
              <div className="space-y-2">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">AI Model</p>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => setModel('gemini')}
                    className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-left px-3 ${
                      model === 'gemini'
                        ? 'bg-blue-500/20 border border-blue-400/40 text-blue-300'
                        : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    ✦ Gemini (NB2)
                    <br />
                    <span className="text-[8px] font-normal normal-case opacity-60">
                      Precise mask-based inpainting
                    </span>
                  </button>
                  <button
                    onClick={() => setModel('gpt')}
                    className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-left px-3 ${
                      model === 'gpt'
                        ? 'bg-purple-500/20 border border-purple-400/40 text-purple-300'
                        : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    ◈ GPT Image 2<br />
                    <span className="text-[8px] font-normal normal-case opacity-60">
                      Instruction-based regeneration
                    </span>
                  </button>
                </div>
              </div>

              {/* Instruction */}
              <div className="space-y-2">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">What to change</p>
                <textarea
                  value={instruction}
                  onChange={e => setInstruction(e.target.value)}
                  placeholder="e.g. Replace wall with brick texture, Change color to blue…"
                  rows={4}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-purple-400/50 resize-none"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleEdit}
                disabled={isEditing || !instruction.trim()}
                className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${
                  isEditing || !instruction.trim()
                    ? 'bg-white/5 text-white/20 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-[1.02] shadow-lg shadow-purple-500/20'
                }`}
              >
                {isEditing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Editing…
                  </span>
                ) : (
                  '✦ Apply Edit'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
