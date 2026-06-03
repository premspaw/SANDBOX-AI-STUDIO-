import React from 'react';
import { Smile } from 'lucide-react';

const EXPRESSION_OPTIONS = [
  'Neutral',
  'Happy / Smiling',
  'Angry / Intense',
  'Laughing',
  'Determined / Fierce',
  'Skeptical / Smirk',
  'Shocked / Surprised',
  'Thoughtful / Pensive'
];

export default function ExpressionPicker({ expressions = [], toggleExpression }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-1.5">
          <Smile className="w-3.5 h-3.5 text-white/40" />
          Character Expressions
        </label>
        <span className="text-[9px] font-bold text-white/30 uppercase">Select Multiple</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {EXPRESSION_OPTIONS.map((exp) => {
          const isSelected = expressions.includes(exp);
          return (
            <button
              type="button"
              key={exp}
              onClick={() => toggleExpression(exp)}
              className={`text-[10px] font-bold uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition-all duration-200 border ${
                isSelected
                  ? 'border-[#C8F135] bg-[#C8F135]/10 text-[#C8F135] shadow-sm shadow-[#C8F135]/5 scale-[1.02]'
                  : 'border-white/5 bg-zinc-900/30 text-white/55 hover:border-white/10 hover:text-white'
              }`}
            >
              {exp}
            </button>
          );
        })}
      </div>
    </div>
  );
}
