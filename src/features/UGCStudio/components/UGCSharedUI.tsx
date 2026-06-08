import React, { useState, useEffect } from 'react';
import { Loader2, ChevronDown, Camera, Video, HelpCircle } from 'lucide-react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  id?: string;
}

export const Button = ({ children, onClick, disabled, loading, variant = 'primary', className = '', id }: ButtonProps) => {
  const baseStyle = "relative font-sans text-[10px] font-black uppercase tracking-widest py-2.5 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden cursor-pointer active:scale-95 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[#c8f135] text-black hover:brightness-110 shadow-[0_0_20px_rgba(200,241,53,0.3)] hover:shadow-[0_0_30px_rgba(200,241,53,0.5)] disabled:bg-[#222] disabled:text-[#555] disabled:shadow-none",
    secondary: "bg-transparent border border-white/20 text-white hover:bg-white/5 hover:border-[#c8f135] hover:text-[#c8f135] shadow-lg disabled:border-[#222] disabled:text-[#555]",
    ghost: "bg-transparent text-[#999] hover:text-white hover:bg-white/10"
  };

  return (
    <button
      id={id}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : children}
    </button>
  );
};

interface DropdownProps {
  label?: string;
  value: string;
  options: string[];
  onChange: (val: any) => void;
  icon?: any;
  className?: string;
  direction?: 'up' | 'down';
}

export const Dropdown = ({ label, value, options, onChange, icon: Icon, className = "", direction = "down" }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${label ? 'flex flex-col gap-1.5' : ''} ${className}`}>
      {label && (
        <label className="text-gray-500 font-mono text-[8.5px] font-bold uppercase tracking-[0.2em] pl-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-6 flex items-center justify-between bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-lg px-2.5 text-white font-mono text-[8px] uppercase tracking-widest hover:border-white/30 hover:bg-gray-800/60 transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            {Icon && <Icon size={11} className="text-[#c8f135]" />}
            <span className="truncate font-medium">{value}</span>
          </div>
          <ChevronDown size={11} className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className={`absolute ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-full bg-black/90 border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden backdrop-blur-2xl ring-1 ring-white/5`}>
              <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                {options.map((opt: string, optIdx: number) => (
                  <button
                    key={optIdx}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 text-[9px] font-mono uppercase tracking-widest transition-all rounded-md hover:bg-[#c8f135]/10 hover:text-[#c8f135] cursor-pointer ${value === opt ? 'bg-[#c8f135]/5 text-[#c8f135] font-bold' : 'text-gray-400'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const UGCProcessingOverlay = ({ type, message }: { type: 'image' | 'video', message?: string }) => {
  const [step, setStep] = useState(0);
  const steps = type === 'image'
    ? ["Setting up Studio Lights...", "Calibrating Creator Camera...", "Analyzing Product DNA...", "Synthesizing Natural Expressions...", "Capturing Realistic Frame..."]
    : ["Analyzing Script Hooks...", "Synthesizing Motion Dynamics...", "Calibrating Lip-Sync Precision...", "Rendering Realistic Frames...", "Finalizing UGC Aesthetic..."];

  const progress = ((step + 1) / steps.length) * 100;

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s: number) => (s + 1) % steps.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl overflow-hidden">
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

interface CardProps {
  title: string;
  icon?: any;
  action?: React.ReactNode;
  tooltip?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export const Card = ({ title, icon: Icon, action, tooltip, children, className = '', contentClassName = 'p-4 gap-4' }: CardProps) => (
  <div className={`bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden flex flex-col shadow-2xl transition-all duration-300 hover:border-white/20 hover:bg-gray-800/60 group/card ${className}`}>
    <div className={`flex items-center flex-wrap gap-2 ${!title ? 'px-1 py-2' : 'px-2.5 py-3'} border-b border-white/5 bg-gradient-to-r from-white/[0.04] to-transparent ${!title ? '' : 'justify-between'}`} style={!title ? { display: 'grid', gridTemplateColumns: '1fr auto 1fr' } : undefined}>
      {title ? (
        <div className="flex items-center gap-3 text-white font-sans font-black text-[10.5px] uppercase tracking-[0.15em]">
          {Icon && <Icon size={17} className="text-[#c8f135] drop-shadow-[0_0_5px_rgba(200,241,53,0.3)]" />}
          <span className="flex items-center gap-2.5">
            {title}
            {tooltip && (
              <div className="group relative flex items-center">
                <HelpCircle size={15} className="text-[#555] group-hover:text-[#c8f135] transition-colors cursor-help" />
                <div className="absolute left-7 top-1/2 -translate-y-1/2 w-64 p-3 bg-black/95 backdrop-blur-xl border border-white/15 text-gray-300 text-[11px] font-medium leading-relaxed normal-case tracking-normal rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-2xl pointer-events-none ring-1 ring-white/10">
                  {tooltip}
                </div>
              </div>
            )}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-start">
          {Icon && <Icon size={17} className="text-[#c8f135] drop-shadow-[0_0_5px_rgba(200,241,53,0.3)]" />}
        </div>
      )}
      {action && <div className="flex items-center justify-center">{action}</div>}
      {!title && <div />}
    </div>
    <div className={`flex-1 flex flex-col ${contentClassName}`}>
      {children}
    </div>
  </div>
);
