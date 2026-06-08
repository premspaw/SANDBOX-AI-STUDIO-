import React, { useState, useEffect } from 'react';
import { Camera, Video } from 'lucide-react';

interface UGCProcessingOverlayProps {
  type: 'image' | 'video';
  message?: string;
}

const UGCProcessingOverlay = ({ type, message }: UGCProcessingOverlayProps) => {
  const [step, setStep] = useState(0);
  const steps = type === 'image'
    ? [
        "Setting up Studio Lights...",
        "Calibrating Creator Camera...",
        "Analyzing Product DNA...",
        "Synthesizing Natural Expressions...",
        "Capturing Realistic Frame..."
      ]
    : [
        "Analyzing Script Hooks...",
        "Synthesizing Motion Dynamics...",
        "Calibrating Lip-Sync Precision...",
        "Rendering Realistic Frames...",
        "Finalizing UGC Aesthetic..."
      ];

  const progress = ((step + 1) / steps.length) * 100;

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s: number) => (s + 1) % steps.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl overflow-hidden">
      {/* Scanlines Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(0,255,160,0.06),rgba(0,255,224,0.02),rgba(200,241,53,0.06))] bg-[length:100%_2px,3px_100%]" />

      <div className="relative w-40 h-40 mb-10 flex items-center justify-center">
        <div className="absolute inset-0 border-2 border-[#c8f135]/5 rounded-full animate-ping" style={{ animationDuration: '4s' }} />
        <div className="absolute inset-4 border border-[#00ffe0]/20 rounded-full animate-pulse" />
        <div className="absolute inset-0 border-t-2 border-b-2 border-[#c8f135] rounded-full animate-spin-slow" />
        <div className="absolute inset-2 border-l-2 border-r-2 border-[#00ffe0] rounded-full animate-spin" style={{ animationDuration: '3s' }} />

        <div className="relative z-10 p-6 bg-black/40 backdrop-blur-3xl rounded-full border border-white/10 shadow-2xl">
          {type === 'image' ? (
            <Camera className="text-[#c8f135] w-10 h-10 drop-shadow-[0_0_10px_rgba(200,241,53,0.5)]" />
          ) : (
            <Video className="text-[#c8f135] w-10 h-10 drop-shadow-[0_0_10px_rgba(200,241,53,0.5)]" />
          )}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(255,58,58,0.8)] border-2 border-black" />
        </div>
      </div>

      <div className="text-center space-y-6 max-w-xs px-6 relative z-10">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(255,58,58,0.6)]" />
            <p className="text-[#c8f135] font-black italic text-sm uppercase tracking-[0.25em] drop-shadow-[0_0_8px_rgba(200,241,53,0.4)]">
              {message || steps[step]}
            </p>
          </div>
          <p className="text-gray-500 font-mono text-[9px] uppercase tracking-[0.3em] font-medium">
            {type === 'image' ? 'Frame Synthesis' : 'Motion Engine'}
          </p>
        </div>

        <div className="relative w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-[#00ffe0] to-[#c8f135] transition-all duration-1000 ease-in-out shadow-[0_0_15px_rgba(200,241,53,0.6)]"
            style={{ width: `${message ? 100 : progress}%` }}
          />
        </div>

        <div className="flex justify-between items-center px-1">
          <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Status: Active</span>
          <span className="text-[8px] font-mono text-[#c8f135]">{message ? '100' : Math.round(progress)}%</span>
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 pt-4">
          {["4K", "RAW", "LOG", "UGC"].map(tag => (
            <span key={tag} className="text-[8px] font-bold font-mono border px-2 py-1 rounded transition-all tracking-widest text-white/30 border-white/10 bg-white/5">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UGCProcessingOverlay;
