import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Zap, Flame, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../store';

export default function MarketingPromoBanner({ onCtaClick, className = '', variant = 'full' }) {
  const setActiveTab = useAppStore(state => state.setActiveTab);

  const handleClick = () => {
    if (onCtaClick) {
      onCtaClick();
    } else {
      setActiveTab('pricing');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`relative w-full overflow-hidden rounded-2xl border border-[#D4FF00]/30 bg-gradient-to-r from-[#D4FF00]/10 via-black/80 to-purple-950/20 backdrop-blur-xl p-3.5 sm:p-4 md:p-5 shadow-[0_0_35px_rgba(212,255,0,0.12)] ${className}`}
    >
      {/* Background Ambient Glow */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#D4FF00]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-44 h-44 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        {/* Left Marketing Narrative */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#D4FF00] text-black font-black text-[9px] uppercase tracking-wider shadow-sm animate-pulse">
              <Flame className="w-3 h-3 fill-black text-black" />
              Special Season Offer • 30% OFF
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[9px] font-bold">
              <CheckCircle2 className="w-2.5 h-2.5" />
              No Studio • No Actors • 60s Delivery
            </span>
          </div>

          <h2 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight leading-tight">
            Get High-Converting UGC Videos for <span className="text-[#D4FF00] underline decoration-[#D4FF00]/40">₹30</span> &amp; Complete UGC Ads for <span className="text-emerald-400 underline decoration-emerald-400/40">₹50</span>
          </h2>

          <p className="text-[11px] sm:text-xs text-white/70 max-w-2xl leading-relaxed">
            Stop spending ₹15,000+ on camera crews, models, and agency shoots. Generate authentic, viral-ready Instagram Reels and TikTok product ads in minutes for just <span className="text-white font-bold">₹50 to ₹100 per ad</span>.
          </p>

          {/* Quick value badges */}
          <div className="flex items-center gap-2 pt-1 flex-wrap text-[10px]">
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/90 font-medium">
              📱 <strong className="text-[#D4FF00]">₹30</strong> / 10s Video
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/90 font-medium">
              🎬 <strong className="text-emerald-400]">₹50</strong> / Script + Visuals Ad
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/90 font-medium">
              ⚡ <strong className="text-amber-400">1 Short ≈ ₹1</strong>
            </span>
          </div>
        </div>

        {/* Right CTA Area */}
        <div className="flex items-center gap-2 shrink-0 pt-1 lg:pt-0">
          <button
            type="button"
            onClick={handleClick}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#D4FF00] hover:bg-[#e6ff00] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(212,255,0,0.35)] hover:shadow-[0_0_35px_rgba(212,255,0,0.5)] active:scale-[0.98] cursor-pointer group"
          >
            <Zap className="w-3.5 h-3.5 fill-black" />
            <span>Claim 30% Off Now</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
