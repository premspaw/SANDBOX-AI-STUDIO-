import React from 'react';
import { Loader2 } from 'lucide-react';

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
