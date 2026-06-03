import React from 'react';
import { User, Calendar, Globe, Dumbbell } from 'lucide-react';

const AGE_RANGES = [
  'Child 5-12',
  'Teenager 13-19',
  'Young Adult 20-29',
  'Adult 30-45',
  'Mature Adult 46-60',
  'Elderly 60+'
];

const GENDER_EXPRESSIONS = [
  'Masculine',
  'Feminine',
  'Androgynous',
  'Non-Binary'
];

const ETHNICITIES = [
  'South Asian',
  'East Asian',
  'Middle Eastern',
  'African / Black',
  'Hispanic / Latino',
  'Caucasian / White',
  'Indigenous'
];

const BODY_TYPES = [
  'Athletic',
  'Slim / Lean',
  'Average',
  'Muscular / Bulky',
  'Curvy / Plus-size'
];

export default function CharacterForm({
  characterName,
  setCharacterName,
  ageRange,
  setAgeRange,
  genderExpression,
  setGenderExpression,
  ethnicity,
  setEthnicity,
  bodyType,
  setBodyType
}) {
  return (
    <div className="space-y-4">
      {/* Character Name Input */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#C8F135]" />
            Character Name
          </label>
          <span className="text-[9px] font-bold text-white/30 uppercase">Unique Identity</span>
        </div>
        <input
          type="text"
          value={characterName}
          onChange={(e) => setCharacterName(e.target.value)}
          placeholder="e.g. Vikram Malhotra, Anya Roy"
          className="w-full bg-zinc-950 border border-white/5 focus:border-[#C8F135] text-white rounded-xl px-4 py-3 text-sm placeholder-white/20 outline-none transition-all shadow-inner focus:shadow-md focus:shadow-[#C8F135]/5 font-sans font-medium"
        />
      </div>

      {/* Grid of Dropdowns */}
      <div className="grid grid-cols-2 gap-4">
        {/* Age Range */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-white/40" />
            Age Range
          </label>
          <select
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value)}
            className="w-full bg-zinc-950 border border-white/5 focus:border-[#C8F135] text-white rounded-xl px-3.5 py-3 text-xs outline-none transition-all font-sans font-medium cursor-pointer"
          >
            {AGE_RANGES.map(opt => (
              <option key={opt} value={opt} className="bg-zinc-950 text-white py-2">
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Gender Expression */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-white/40" />
            Gender Expression
          </label>
          <select
            value={genderExpression}
            onChange={(e) => setGenderExpression(e.target.value)}
            className="w-full bg-zinc-950 border border-white/5 focus:border-[#C8F135] text-white rounded-xl px-3.5 py-3 text-xs outline-none transition-all font-sans font-medium cursor-pointer"
          >
            {GENDER_EXPRESSIONS.map(opt => (
              <option key={opt} value={opt} className="bg-zinc-950 text-white py-2">
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Ethnicity */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-white/40" />
            Ethnicity
          </label>
          <select
            value={ethnicity}
            onChange={(e) => setEthnicity(e.target.value)}
            className="w-full bg-zinc-950 border border-white/5 focus:border-[#C8F135] text-white rounded-xl px-3.5 py-3 text-xs outline-none transition-all font-sans font-medium cursor-pointer"
          >
            {ETHNICITIES.map(opt => (
              <option key={opt} value={opt} className="bg-zinc-950 text-white py-2">
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Body Type */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5 text-white/40" />
            Body Type
          </label>
          <select
            value={bodyType}
            onChange={(e) => setBodyType(e.target.value)}
            className="w-full bg-zinc-950 border border-white/5 focus:border-[#C8F135] text-white rounded-xl px-3.5 py-3 text-xs outline-none transition-all font-sans font-medium cursor-pointer"
          >
            {BODY_TYPES.map(opt => (
              <option key={opt} value={opt} className="bg-zinc-950 text-white py-2">
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
