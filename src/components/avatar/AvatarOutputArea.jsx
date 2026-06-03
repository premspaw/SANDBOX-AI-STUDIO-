import React, { useState } from 'react';
import { Download, Bookmark, Sparkles, AlertCircle, Copy, Check, ChevronDown, ChevronUp, Pencil, Maximize2, X, CheckCircle2, Loader2 } from 'lucide-react';
import { InpaintEditor } from '../common/InpaintEditor';

const LOADING_STATUSES = [
  'Awakening the character\'s cinematic soul and visual depth...',
  'Breathing life into the posture, expression, and story traits...',
  'Sculpting the atmosphere, lights, and geographic details...',
  'Painting the environment moods, shadows, and color chemistry...',
  'Weaving your reference vision onto the final storyboard canvas...',
  'Polishing the canvas details to secure your finished masterpiece...'
];

export default function AvatarOutputArea({
  generating,
  generatedImage,
  activePrompt,
  error,
  downloadImage,
  saveToGallery,
  saving = false,
  savedOk = false,
  type = 'sheet',
  userId,
  setGeneratedImage
}) {
  const [promptOpen, setPromptOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [inpaintOpen, setInpaintOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Rotate through loading status messages
  React.useEffect(() => {
    let interval;
    if (generating) {
      setStatusIndex(0);
      interval = setInterval(() => {
        setStatusIndex((prev) => (prev + 1) % LOADING_STATUSES.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [generating]);

  const copyPrompt = () => {
    if (!activePrompt) return;
    navigator.clipboard.writeText(activePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0D0F0A] border border-white/5 rounded-3xl overflow-hidden relative min-h-[500px]">
      
      {/* Top Bar / Metadata */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between bg-zinc-950/40 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C8F135] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C8F135]"></span>
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C8F135]">
            Cinematic Viewport
          </span>
        </div>
        
        {generatedImage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/5 hover:border-white/10 bg-zinc-900/40 text-white/70 hover:text-white transition-all text-[10px] font-black uppercase tracking-wider"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#C8F135]" />
              Expand
            </button>
            <button
              onClick={() => setInpaintOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-500/30 hover:border-purple-500/50 bg-purple-950/20 text-purple-300 hover:text-purple-200 hover:bg-purple-950/40 transition-all text-[10px] font-black uppercase tracking-wider"
            >
              <Pencil className="w-3.5 h-3.5 text-purple-400" />
              Brush Edit
            </button>
            <button
              onClick={saveToGallery}
              disabled={saving || savedOk}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-wider disabled:opacity-70 ${
                savedOk
                  ? 'border-[#C8F135]/40 bg-[#C8F135]/10 text-[#C8F135]'
                  : 'border-white/5 hover:border-white/10 bg-zinc-900/40 text-white/70 hover:text-white'
              }`}
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : savedOk ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Bookmark className="w-3.5 h-3.5" />
              )}
              {savedOk ? 'Saved!' : 'Save to Library'}
            </button>
            <button
              onClick={downloadImage}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#C8F135] text-black hover:scale-[1.02] active:scale-95 transition-all text-[10px] font-black uppercase tracking-wider shadow-lg shadow-[#C8F135]/15"
            >
              <Download className="w-3.5 h-3.5" />
              Download PNG
            </button>
          </div>
        )}
      </div>

      {/* Main Canvas Viewport */}
      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        
        {/* Decorative backgrounds */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#C8F135]/5 rounded-full blur-[100px] pointer-events-none -z-0" />

        {/* 1. Generating / Loading State */}
        {generating && (
          <div className="text-center space-y-6 z-10 max-w-sm">
            <div className="w-16 h-16 mx-auto relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-[#C8F135]/20 animate-pulse"></div>
              <div className="absolute inset-0 rounded-full border-t-2 border-[#C8F135] animate-spin"></div>
              <Sparkles className="w-6 h-6 text-[#C8F135]" />
            </div>
            
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase text-[#C8F135] tracking-[0.25em] animate-pulse">
                Synthesizing Creation
              </p>
              <p className="text-xs text-white/50 font-medium font-sans">
                {LOADING_STATUSES[statusIndex]}
              </p>
            </div>
          </div>
        )}

        {/* 2. Success / Display State */}
        {!generating && generatedImage && (
          <div className="flex flex-col gap-4 items-center z-10 w-full max-w-[500px]">
            <div className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group flex items-center justify-center bg-zinc-950">
              <img
                src={generatedImage}
                alt="Generated Avatar Studio Output"
                className="w-full h-auto object-contain object-center transition-all duration-700 hover:scale-[1.02]"
              />
              {/* Floating Expand/Maximize Button */}
              <button
                onClick={() => setIsExpanded(true)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white text-black hover:bg-white/90 hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-lg border border-white/10 z-20 group/btn"
                title="Expand Viewport"
              >
                <Maximize2 className="w-4.5 h-4.5 transition-transform group-hover/btn:scale-110" />
              </button>
              {/* Tag indicator */}
              <span className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md border border-white/10 text-white/70 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider">
                {type === 'board' ? 'Reference Board' : 'Scene Composition'}
              </span>
            </div>
            
            {/* LARGE ACTION BUTTONS DIRECTLY BELOW IMAGE (DOWN) */}
            <div className="w-full flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/5 hover:border-white/10 bg-zinc-900/40 text-white/70 hover:text-white transition-all text-xs font-black uppercase tracking-wider active:scale-95"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#C8F135]" />
                <span>Expand</span>
              </button>

              <button
                type="button"
                onClick={() => setInpaintOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-purple-500/20 hover:border-purple-500/40 bg-purple-950/15 text-purple-300 hover:text-purple-200 hover:bg-purple-950/30 transition-all text-xs font-black uppercase tracking-wider active:scale-95"
              >
                <Pencil className="w-3.5 h-3.5 text-purple-400" />
                <span>Brush Edit</span>
              </button>
              
              <button
                type="button"
                onClick={saveToGallery}
                disabled={saving || savedOk}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border transition-all text-xs font-black uppercase tracking-wider active:scale-95 disabled:opacity-70 ${
                  savedOk
                    ? 'border-[#C8F135]/50 bg-[#C8F135]/15 text-[#C8F135] animate-none'
                    : 'border-[#C8F135]/25 hover:border-[#C8F135]/40 bg-[#C8F135]/5 text-[#C8F135] hover:text-white hover:bg-[#C8F135]/15 animate-pulse hover:animate-none'
                }`}
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : savedOk ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5" />
                )}
                <span>{saving ? 'Saving...' : savedOk ? 'Saved to Assets!' : 'Save to Assets'}</span>
              </button>
              
              <button
                type="button"
                onClick={downloadImage}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#C8F135] text-black hover:bg-[#b0d62d] transition-all text-xs font-black uppercase tracking-wider active:scale-95 shadow-lg shadow-[#C8F135]/10"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. Empty / Placeholder State */}
        {!generating && !generatedImage && (
          <div className="text-center space-y-5 z-10 max-w-md">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-center text-white/30 shadow-inner">
              <Sparkles className="w-7 h-7" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-sm font-black uppercase tracking-[0.15em] text-white">
                Studio Viewport Primed
              </h3>
              <p className="text-[11px] text-white/35 max-w-xs mx-auto leading-relaxed">
                Provide character demographics, select costume and angles, and hit generate to watch your vision come to life.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Elegant Collapsible Error Banner */}
      {error && (
        <div className="mx-6 mb-4 p-3.5 bg-red-950/20 border border-red-500/30 text-red-300 rounded-2xl flex items-start gap-3 z-10">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider">Execution Interrupted</p>
            <p className="text-[11px] font-medium leading-relaxed opacity-85">{error}</p>
          </div>
        </div>
      )}

      {/* 4. Collapsible Compiled Prompt Footer */}
      {!generating && activePrompt && (
        <div className="border-t border-white/5 bg-zinc-950/60 z-10">
          <button
            onClick={() => setPromptOpen(!promptOpen)}
            className="w-full flex items-center justify-between px-6 py-3.5 text-[10px] font-black uppercase tracking-wider text-white/55 hover:text-white transition-colors"
          >
            <span>Compiled Prompt Inspector</span>
            {promptOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {promptOpen && (
            <div className="px-6 pb-5 pt-1 space-y-3">
              <div className="relative bg-black/80 border border-white/5 rounded-2xl p-4 flex justify-between items-start">
                <p className="text-white/60 font-mono text-[10px] leading-relaxed select-all pr-8 whitespace-pre-line">
                  {activePrompt}
                </p>
                
                <button
                  onClick={copyPrompt}
                  className="absolute right-3 top-3 p-2 rounded-lg bg-zinc-900 border border-white/5 text-white/60 hover:text-white hover:border-white/10 transition-all active:scale-95"
                  title="Copy prompt"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#C8F135]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[9px] font-bold text-white/30 uppercase">
                Generated using GPT-Image-2 (DALL-E 3) engine
              </p>
            </div>
          )}
        </div>
      )}

      {/* Inpaint Editor overlay modal */}
      {inpaintOpen && (
        <InpaintEditor
          imageUrl={generatedImage}
          userId={userId}
          onClose={() => setInpaintOpen(false)}
          onDone={(newUrl) => {
            if (setGeneratedImage) setGeneratedImage(newUrl);
          }}
        />
      )}

      {/* Fullscreen Lightbox Modal */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsExpanded(false)}
        >
          {/* Top right close button */}
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition-all active:scale-95 z-30"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div 
            className="relative max-w-5xl max-h-[85vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-950 flex items-center justify-center p-1 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={generatedImage}
              alt="Expanded Board Output"
              className="max-w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
