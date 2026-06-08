import React from 'react';
import { useUGC } from '../../context/UGCContext';
import { Camera, Download, X } from 'lucide-react';

export default function MontageImgLightbox() {
  const {
    montageImgExpanded,
    setMontageImgExpanded,
    montageGeneratedImg
  } = useUGC();

  if (!montageImgExpanded || !montageGeneratedImg) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/92 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => setMontageImgExpanded(false)}
    >
      <div
        className="relative max-w-3xl w-full flex flex-col items-center"
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="w-full flex items-center justify-between px-1 py-2 mb-2">
          <span className="text-[9px] font-mono text-[#c8f135] uppercase tracking-widest flex items-center gap-1.5">
            <Camera size={11} />
            Character + Product Reference
          </span>
          <div className="flex items-center gap-2">
            <a
              href={montageGeneratedImg}
              download="montage-reference.png"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/15 rounded-lg text-[9px] font-black uppercase tracking-widest text-white hover:bg-[#c8f135]/20 hover:text-[#c8f135] hover:border-[#c8f135]/40 transition-all"
              onClick={e => e.stopPropagation()}
            >
              <Download size={11} />
              Save PNG
            </a>
            <button
              onClick={() => setMontageImgExpanded(false)}
              className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center hover:bg-red-500/70 transition-colors"
            >
              <X size={13} className="text-white" />
            </button>
          </div>
        </div>
        {/* Image */}
        <div className="rounded-xl overflow-hidden border border-[#c8f135]/20 shadow-[0_0_60px_rgba(200,241,53,0.08)] w-full">
          <img
            src={montageGeneratedImg}
            alt="Montage Reference Full Size"
            className="w-full h-auto max-h-[82vh] object-contain"
          />
        </div>
        <p className="mt-2 text-[8px] font-mono text-gray-600 uppercase tracking-widest">Click outside to close</p>
      </div>
    </div>
  );
}
