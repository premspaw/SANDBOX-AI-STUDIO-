import React from 'react';
import { Eye } from 'lucide-react';

const POSE_OPTIONS = [
  'Front View',
  'Side Profile',
  '3/4 Angle',
  'Back View',
  'Close-up Portrait',
  'Action Pose',
  'Sitting View',
  'Low Angle Hero Shot'
];

export default function PosePicker({ poses = [], togglePose }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-white/40" />
          Camera Poses & Angles
        </label>
        <span className="text-[9px] font-bold text-white/30 uppercase">Select Multiple</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {POSE_OPTIONS.map((pos) => {
          const isSelected = poses.includes(pos);
          return (
            <button
              type="button"
              key={pos}
              onClick={() => togglePose(pos)}
              className={`text-[10px] font-bold uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition-all duration-200 border ${
                isSelected
                  ? 'border-[#C8F135] bg-[#C8F135]/10 text-[#C8F135] shadow-sm shadow-[#C8F135]/5 scale-[1.02]'
                  : 'border-white/5 bg-zinc-900/30 text-white/55 hover:border-white/10 hover:text-white'
              }`}
            >
              {pos}
            </button>
          );
        })}
      </div>
    </div>
  );
}
