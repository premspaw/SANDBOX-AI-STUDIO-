import React from 'react';
import { Palette, ChevronDown } from 'lucide-react';

const STYLES = [
  { id: 'realistic', name: 'Realistic UGC Style', desc: 'Photorealistic human. Film-grade detail. Perfect for high-converting UGC brand ads.' },
  { id: 'cinematic', name: 'Cinematic Cinema', desc: 'Hollywood film still with dramatic lighting, deep shadows, and cinematic color grading.' },
  { id: 'anime', name: 'Anime & 2D', desc: 'Japanese animation character design. Hand-drawn look with clean lines and highly expressive eyes.' },
  { id: '3d-render', name: '3D CGI Render', desc: 'Pixar or Unreal Engine 3D quality, featuring volumetric lighting, subsurface skin scattering, and detailed hair.' },
  { id: 'ultra-realistic', name: 'Ultra Photographic', desc: 'Hyper-detailed photographic textures, pores, natural skin micro-expressions, and 8K fidelity.' },
  { id: 'comic', name: 'Graphic Comic Book', desc: 'Bold ink outlines, dynamic panel styling, graphic novel illustration lines, and flat color fills.' }
];

export default function StyleSelector({ selectedStyle, setSelectedStyle }) {
  const currentStyle = STYLES.find(s => s.id === selectedStyle) || STYLES[1];

  return (
    <div className="space-y-2">
      {/* Label Headers */}
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-[#C8F135]" />
          Visual Art Style
        </label>
        <span className="text-[9px] font-bold text-[#C8F135] bg-[#C8F135]/10 px-2 py-0.5 rounded border border-[#C8F135]/20 uppercase">
          Required
        </span>
      </div>

      {/* Styled Dropdown Container */}
      <div className="relative">
        <select
          value={selectedStyle}
          onChange={(e) => setSelectedStyle(e.target.value)}
          className="w-full bg-zinc-950 border border-white/5 focus:border-[#C8F135] text-white rounded-xl pl-4 pr-10 py-3.5 text-xs outline-none transition-all cursor-pointer font-sans font-medium appearance-none"
        >
          {STYLES.map((style) => (
            <option key={style.id} value={style.id} className="bg-zinc-950 text-white text-xs">
              {style.name}
            </option>
          ))}
        </select>
        
        {/* Custom Arrow overlay */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {/* Live Description Capsule */}
      <div className="bg-zinc-950/40 border border-white/5 rounded-xl p-3 text-[10px] text-white/40 leading-relaxed font-sans font-medium">
        <strong className="text-[#C8F135]/80 uppercase text-[9px] tracking-wider block mb-0.5">
          Style Description:
        </strong>
        {currentStyle.desc}
      </div>
    </div>
  );
}
