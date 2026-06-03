import React from 'react';
import { MapPin, Building, Trees, Landmark, Rocket, Waves, Flame, Camera } from 'lucide-react';

const CATEGORIES = [
  { id: 'urban', label: 'Urban', icon: Building },
  { id: 'nature', label: 'Nature', icon: Trees },
  { id: 'historical', label: 'Historical', icon: Landmark },
  { id: 'scifi', label: 'Sci-Fi', icon: Rocket },
  { id: 'coastal', label: 'Coastal', icon: Waves },
  { id: 'action', label: 'Action', icon: Flame },
  { id: 'studio', label: 'Studio', icon: Camera }
];

const PRESETS = {
  urban: [
    { title: 'Rainy Mumbai', text: 'Rain-soaked Mumbai street at night, neon signs reflecting on wet asphalt' },
    { title: 'Tokyo Crossing', text: 'Bustling Tokyo Shibuya crossing during rush hour, colorful billboard glow' },
    { title: 'NYC Steps', text: 'New York City brownstone steps on a sunny autumn morning, golden fallen leaves' }
  ],
  nature: [
    { title: 'Munnar Tea Hills', text: 'Lush green tea gardens of Munnar, misty mountains in the background, soft morning dew' },
    { title: 'Snowy Himalayas', text: 'Snowy Himalayan valley, pine forest, sun peaking through majestic peaks' },
    { title: 'Redwood Forest', text: 'Ancient forest with giant redwood trees, sunbeams breaking through the tall canopy' }
  ],
  historical: [
    { title: 'Rajasthan Fort', text: 'Grand courtyard of a Rajasthan fort, sand dunes visible in the distance, warm ancient stone' },
    { title: 'Gothic Cathedral', text: 'Gothic medieval cathedral interior, sunlight streaming through stained glass windows' },
    { title: 'Hampi Ruins', text: 'Ancient ruins of Hampi, warm sunset glow over stone pillars and monolithic sculptures' }
  ],
  scifi: [
    { title: 'Cyberpunk City', text: 'Futuristic cyberpunk skyline, flying vehicles, neon holographic ads, high-tech skyscrapers' },
    { title: 'Spaceship Bridge', text: 'Control room of an interstellar spaceship, starlight shining through the giant bay window' },
    { title: 'Bioluminescent Jungle', text: 'Bio-luminescent alien jungle with strange floating plants under triple glowing moons' }
  ],
  coastal: [
    { title: 'Goa Horizon', text: 'Sunny beach of Goa, coconut trees, gentle waves crashing, clear azure sky' },
    { title: 'Stormy Cliff', text: 'Rocky cliffside overlooking a turbulent turquoise ocean during a dramatic sunset storm' },
    { title: 'Kerala Backwaters', text: 'Kerala backwaters houseboat cruising through calm palm-fringed waters at serene sunrise' }
  ],
  action: [
    { title: 'Highway Chase', text: 'High-octane highway car chase at high speed, smoke and sparks in the cinematic background' },
    { title: 'Warehouse Escape', text: 'Explosive industrial warehouse escape, glowing fire, flying debris, and dramatic shadows' },
    { title: 'Skyscraper Storm', text: 'Top of a wind-swept skyscraper rooftop, lightning flashing in a dark purple storm sky' }
  ],
  studio: [
    { title: 'Volumetric Studio', text: 'Minimalist studio backdrop with warm volumetric spot lighting, high fashion editorial style' },
    { title: 'Concrete Loft', text: 'Dark concrete loft with soft side-key lighting, moody atmospheric haze, cinematic backdrop' },
    { title: 'White Cyclorama', text: 'Clean white cyclorama studio wall with soft shadow casting, perfect portrait setup' }
  ]
};

export default function LocationPicker({
  locationCategory = 'urban',
  setLocationCategory,
  locationDescription = '',
  setLocationDescription
}) {
  const currentPresets = PRESETS[locationCategory] || [];

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#C8F135]" />
          Select Scene Location Theme
        </label>
        
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = locationCategory === cat.id;
            return (
              <button
                type="button"
                key={cat.id}
                onClick={() => setLocationCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 shrink-0 border ${
                  isActive
                    ? 'border-[#C8F135] bg-[#C8F135]/10 text-[#C8F135]'
                    : 'border-white/5 bg-zinc-900/30 text-white/50 hover:border-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Cards Grid */}
      <div className="space-y-2">
        <label className="text-[9px] font-black uppercase tracking-[0.15em] text-white/30">
          Environment Presets
        </label>
        <div className="grid grid-cols-3 gap-2">
          {currentPresets.map((preset, idx) => {
            const isActive = locationDescription === preset.text;
            return (
              <button
                type="button"
                key={idx}
                onClick={() => setLocationDescription(preset.text)}
                className={`text-left p-2.5 rounded-xl border transition-all duration-200 flex flex-col justify-between aspect-[16/10] ${
                  isActive
                    ? 'border-[#C8F135] bg-[#C8F135]/5 text-[#C8F135]'
                    : 'border-white/5 bg-zinc-950 hover:border-white/10 hover:bg-zinc-900/50'
                }`}
              >
                <span className="text-[10px] font-black tracking-tight uppercase line-clamp-1">
                  {preset.title}
                </span>
                <span className="text-[9px] text-white/35 leading-tight line-clamp-2 mt-1">
                  {preset.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Text Area */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
            Customize Location Prompt
          </label>
          <span className="text-[9px] font-bold text-white/30 uppercase">Natural Language</span>
        </div>
        <textarea
          value={locationDescription}
          onChange={(e) => setLocationDescription(e.target.value)}
          placeholder="Describe your scene context in rich detail..."
          rows={3}
          className="w-full bg-zinc-950 border border-white/5 focus:border-[#C8F135] text-white rounded-xl px-4 py-3.5 text-xs placeholder-white/20 outline-none transition-all resize-none font-sans font-medium leading-relaxed"
        />
      </div>
    </div>
  );
}
