import React from 'react';
import { Shirt, Palette, UploadCloud, Trash2, Image, Sparkles } from 'lucide-react';

const PRESET_COLORS = [
  { hex: '#C8F135', name: 'Neon Lime' },
  { hex: '#FF5E3A', name: 'Cyber Orange' },
  { hex: '#9D4EDD', name: 'Synth Purple' },
  { hex: '#D90429', name: 'Crimson' },
  { hex: '#00F5D4', name: 'Teal Glare' },
  { hex: '#FFFFFF', name: 'Pure Pearl' },
  { hex: '#1A1A1A', name: 'Matte Jet' }
];

const ACCESSORY_OPTIONS = [
  'Sunglasses',
  'Cyberpunk Visor',
  'Gold Chain',
  'Leather Gloves',
  'Beanie / Hat',
  'Stud Earrings',
  'Tech Backpack',
  'Tactical Scarf'
];

export default function CostumeForm({
  costumeStyle,
  setCostumeStyle,
  primaryColor,
  setPrimaryColor,
  accessories = [],
  toggleAccessory,
  costumePreview,
  uploadCostume,
  uploadingCostume
}) {
  const hasCostumePhoto = !!costumePreview;

  return (
    <div className="space-y-4">
      {/* 1. Costume Reference Image Upload Section */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-1.5">
          <Image className="w-3.5 h-3.5 text-white/40" />
          Costume Reference Image
        </label>

        {!hasCostumePhoto ? (
          <label className="flex items-center justify-center gap-3 border border-dashed border-white/10 hover:border-[#C8F135]/40 rounded-2xl py-5 px-4 cursor-pointer bg-zinc-950/40 hover:bg-zinc-950 transition-all text-center group">
            <UploadCloud className="w-5 h-5 text-white/20 group-hover:text-[#C8F135] transition-colors shrink-0" />
            <div className="text-left">
              <span className="text-[10px] font-black uppercase text-white/60 tracking-wider block">
                Upload Custom Costume Photo
              </span>
              <span className="text-[9px] text-white/30 font-medium leading-tight block mt-0.5">
                AI will match the uploaded outfit's design, style, and patterns
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => uploadCostume(e.target.files?.[0])}
              className="hidden"
              disabled={uploadingCostume}
            />
          </label>
        ) : (
          <div className="flex items-center gap-4 bg-zinc-950 border border-white/5 rounded-2xl p-3 relative">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 overflow-hidden border border-white/10 flex items-center justify-center shrink-0">
              <img src={costumePreview} alt="Costume Preview" className="w-full h-full object-cover" />
            </div>
            
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-white uppercase tracking-tight truncate">
                Outfit Pattern Primed
              </p>
              <p className="text-[9px] text-[#C8F135]/90 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-[#C8F135]" />
                Costume Sync Active
              </p>
            </div>

            <button
              onClick={() => uploadCostume(null)}
              className="p-1.5 rounded-lg bg-red-950/20 hover:bg-red-950/40 border border-red-500/10 hover:border-red-500/20 text-red-400 transition-all active:scale-95 ml-auto"
              title="Remove Costume"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Costume Style Description Input */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-1.5">
          <Shirt className="w-3.5 h-3.5 text-[#C8F135]" />
          Costume Style Description
        </label>
        <input
          type="text"
          value={costumeStyle}
          onChange={(e) => setCostumeStyle(e.target.value)}
          placeholder="e.g. Cyberpunk Techwear, Retro Suit, Sherwani"
          className="w-full bg-zinc-950 border border-white/5 focus:border-[#C8F135] text-white rounded-xl px-4 py-3 text-sm placeholder-white/20 outline-none transition-all font-sans font-medium"
        />
      </div>

      {/* 3. Primary Color Picker */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-white/40" />
          Primary Theme Color
        </label>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          {PRESET_COLORS.map((color) => {
            const isSelected = primaryColor.toLowerCase() === color.hex.toLowerCase();
            return (
              <button
                type="button"
                key={color.hex}
                onClick={() => setPrimaryColor(color.hex)}
                title={color.name}
                className={`w-7 h-7 rounded-full transition-all duration-300 relative border flex items-center justify-center ${
                  isSelected ? 'border-white scale-110 shadow-lg shadow-white/10' : 'border-white/10 hover:scale-105'
                }`}
                style={{ backgroundColor: color.hex }}
              >
                {isSelected && (
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: color.hex === '#FFFFFF' ? '#000000' : '#FFFFFF' }}
                  />
                )}
              </button>
            );
          })}

          {/* Color Picker Input & Custom Hex */}
          <div className="flex items-center gap-2 bg-zinc-950 border border-white/5 rounded-xl px-2.5 py-1.5 ml-auto">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-5 h-5 bg-transparent border-0 cursor-pointer p-0"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#ffffff"
              maxLength={7}
              className="w-16 bg-transparent text-white/80 text-[11px] font-mono uppercase border-0 outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4. Accessories Pill Selection */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
          Wearable Accessories
        </label>
        <div className="flex flex-wrap gap-1.5">
          {ACCESSORY_OPTIONS.map((acc) => {
            const isSelected = accessories.includes(acc);
            return (
              <button
                type="button"
                key={acc}
                onClick={() => toggleAccessory(acc)}
                className={`text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-xl transition-all duration-200 border ${
                  isSelected
                    ? 'border-[#C8F135] bg-[#C8F135]/10 text-[#C8F135] shadow-sm shadow-[#C8F135]/5'
                    : 'border-white/5 bg-zinc-900/30 text-white/55 hover:border-white/10 hover:text-white'
                }`}
              >
                {acc}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
