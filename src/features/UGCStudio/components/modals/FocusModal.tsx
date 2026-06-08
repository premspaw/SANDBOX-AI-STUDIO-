import React from 'react';
import { Maximize, X, Camera, Loader2, Sparkles, Wand2, Download } from 'lucide-react';
import { useUGC } from '../../context/UGCContext';
import { resolveUrl } from '../../../../config/apiConfig';

export default function FocusModal() {
  const {
    isExpandModalOpen,
    setIsExpandModalOpen,
    renderMode,
    generatedImg,
    isRegeneratingImage,
    isRefinementOpen,
    setIsRefinementOpen,
    imageEditPrompt,
    setImageEditPrompt,
    regenerateImage,
    generatedVideo
  } = useUGC();

  if (!isExpandModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/98 backdrop-blur-3xl p-4 lg:p-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8 max-w-[1600px] mx-auto w-full">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#c8f135]/10 rounded-2xl border border-[#c8f135]/30 shadow-[0_0_20px_rgba(200,241,53,0.15)]">
            <Maximize className="w-6 h-6 text-[#c8f135]" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Studio Focus</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c8f135] animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#c8f135]">AI Upscaling Active</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => { setIsExpandModalOpen(false); setIsRefinementOpen(false); }}
          className="p-4 bg-white/5 hover:bg-[#ff3a3a] hover:text-black rounded-2xl border border-white/10 transition-all group cursor-pointer shadow-xl active:scale-90"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-10 min-h-0 max-w-[1600px] mx-auto w-full">
        <div className="flex-1 bg-black rounded-3xl border border-white/5 overflow-hidden relative group shadow-[0_0_50px_rgba(0,0,0,0.5)] min-h-[300px]">
          {renderMode === 'image' ? (
            <>
              {generatedImg ? (
                <img src={resolveUrl(generatedImg)} className="w-full h-full object-contain" alt="Focus" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 min-h-[300px]">
                  <div className="w-14 h-14 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center">
                    <Camera size={22} className="text-white/15" />
                  </div>
                  <p className="text-[10px] text-white/15 font-black uppercase tracking-widest">No image generated yet</p>
                </div>
              )}
              {isRegeneratingImage && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                  <Loader2 className="w-12 h-12 text-[#c8f135] animate-spin mb-4" />
                  <span className="text-white font-mono text-[10px] tracking-widest uppercase animate-pulse">Refining Image...</span>
                </div>
              )}
              {isRefinementOpen && !isRegeneratingImage && (
                <div className="absolute bottom-0 inset-x-0 p-6 lg:p-10 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-4 animate-in slide-in-from-bottom-5">
                  <div className="flex gap-3 max-w-2xl mx-auto w-full relative">
                    <input
                      type="text"
                      value={imageEditPrompt}
                      onChange={(e) => setImageEditPrompt(e.target.value)}
                      placeholder="How should we edit this image? (e.g. 'Make it evening', 'Add a neon glow')"
                      className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white placeholder-white/40 focus:outline-none focus:border-[#c8f135] transition-all text-sm backdrop-blur-md pr-16"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && imageEditPrompt && !isRegeneratingImage) {
                          regenerateImage();
                        }
                      }}
                    />
                    <button
                      onClick={regenerateImage}
                      disabled={!imageEditPrompt || isRegeneratingImage}
                      className="absolute right-2 top-2 bottom-2 w-12 bg-[#c8f135] text-black rounded-xl flex items-center justify-center hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                      <Sparkles size={18} />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <video src={resolveUrl(generatedVideo) || ''} className="w-full h-full object-contain" controls autoPlay />
          )}
        </div>

        <div className="w-full lg:w-36 flex lg:flex-col gap-4 lg:gap-6 items-center justify-center lg:pt-10 pb-6 lg:pb-0">
          {renderMode === 'image' ? (
            <>
              <button
                onClick={() => setIsRefinementOpen(!isRefinementOpen)}
                className="group flex flex-col items-center gap-3"
              >
                <div className={`w-14 h-14 lg:w-16 lg:h-16 backdrop-blur-xl border rounded-2xl flex items-center justify-center transition-all duration-500 cursor-pointer shadow-xl group-hover:-translate-y-1 ${isRefinementOpen ? 'bg-[#c8f135] text-black border-[#c8f135]' : 'bg-white/5 text-white border-white/10 hover:bg-[#c8f135] hover:text-black'}`}>
                  <Wand2 size={24} className="lg:size-[28px]" />
                </div>
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">{isRefinementOpen ? 'Cancel' : 'Edit'}</span>
              </button>
              <button
                onClick={async () => {
                  try {
                    if (!generatedImg) return;
                    const response = await fetch(resolveUrl(generatedImg));
                    const blob = await response.blob();
                    const dUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = dUrl;
                    a.download = `ugc_image_${Date.now()}.png`;
                    document.body.appendChild(a); a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(dUrl);
                  } catch (err) { console.error(err); }
                }}
                className="group flex flex-col items-center gap-3"
              >
                <div className="w-14 h-14 lg:w-16 lg:h-16 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center text-white hover:bg-[#c8f135] hover:text-black transition-all duration-500 cursor-pointer shadow-xl group-hover:-translate-y-1">
                  <Download size={24} className="lg:size-[28px]" />
                </div>
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Save PNG</span>
              </button>
            </>
          ) : (
            /* Video mode — download only, no edit */
            <div className="flex flex-col items-center gap-6 w-full">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-2 h-2 rounded-full bg-[#c8f135] animate-pulse" />
                <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-[#c8f135]">Video Ready</span>
              </div>
              <button
                onClick={async () => {
                  try {
                    if (!generatedVideo) return;
                    const response = await fetch(resolveUrl(generatedVideo));
                    const blob = await response.blob();
                    const dUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = dUrl;
                    a.download = `ugc_video_${Date.now()}.mp4`;
                    document.body.appendChild(a); a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(dUrl);
                  } catch (err) { console.error(err); }
                }}
                className="group flex flex-col items-center gap-3 w-full"
              >
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-[#c8f135]/10 backdrop-blur-xl border-2 border-[#c8f135]/40 rounded-3xl flex items-center justify-center text-[#c8f135] hover:bg-[#c8f135] hover:text-black transition-all duration-500 cursor-pointer shadow-[0_0_30px_rgba(200,241,53,0.15)] group-hover:shadow-[0_0_40px_rgba(200,241,53,0.4)] group-hover:-translate-y-1">
                  <Download size={28} className="lg:size-[32px]" />
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest group-hover:text-[#c8f135] transition-colors">Download</span>
                  <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">MP4 · Full Quality</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
