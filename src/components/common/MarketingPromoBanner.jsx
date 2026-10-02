import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Zap, Flame, Tag } from 'lucide-react';
import { useAppStore } from '../../store';

export default function MarketingPromoBanner({ onCtaClick, className = '' }) {
  const setActiveTab = useAppStore(state => state.setActiveTab);

  const handleClick = () => {
    if (onCtaClick) {
      onCtaClick();
    } else {
      const topUpSection = document.getElementById('top-up');
      if (topUpSection) {
        topUpSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        setActiveTab('pricing');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      onClick={handleClick}
      className={`relative w-full overflow-hidden rounded-2xl border border-[#D4FF00]/40 bg-[#070709] shadow-[0_0_50px_rgba(212,255,0,0.18)] hover:shadow-[0_0_70px_rgba(212,255,0,0.3)] transition-all duration-300 cursor-pointer group ${className}`}
    >
      {/* Banner Graphic Image Container */}
      <div className="relative w-full aspect-[1536/900] sm:aspect-[1536/860] max-h-[460px] overflow-hidden bg-black">
        <img
          src="/pricing/season-discount-banner.jpg"
          alt="ZeroLens AI Studio - Viral UGC Ads at ₹30 - 30% OFF Season Sale"
          className="w-full h-full object-cover object-center transform transition-transform duration-700 ease-out group-hover:scale-[1.015]"
          loading="eager"
        />

        {/* Subtle Ambient Border Glow */}
        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-[#D4FF00]/30 pointer-events-none group-hover:ring-[#D4FF00]/60 transition-all" />

        {/* Top-Right Floating Season Badge */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D4FF00] text-black font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(212,255,0,0.6)]">
            <Flame className="w-3.5 h-3.5 fill-black text-black" />
            Season Special Active
          </span>
        </div>

        {/* Bottom CTA Overlay Bar on Hover/Default */}
        <div className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-gradient-to-r from-[#D4FF00] to-yellow-400 hover:from-[#e6ff00] hover:to-yellow-300 text-black font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_35px_rgba(212,255,0,0.6)] hover:shadow-[0_0_50px_rgba(212,255,0,0.85)] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-black" />
            <span>Claim 30% Discount</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      {/* Feature Highlights Quick Bar */}
      <div className="bg-[#0b0b0f] border-t border-white/10 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-[10px] sm:text-xs">
        <div className="flex items-center gap-3 sm:gap-5 flex-wrap text-white/75 font-medium">
          <span className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#D4FF00]" />
            <span>Single UGC Video: <strong className="text-white font-bold">₹30</strong></span>
          </span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Complete Ready-to-Post Ad: <strong className="text-white font-bold">₹50</strong></span>
          </span>
          <span className="text-white/20 hidden sm:inline">•</span>
          <span className="hidden sm:inline text-white/60">
            ⚡ Save 99% vs Traditional Agency Shoots (₹15,000+)
          </span>
        </div>

        <div className="text-[10px] sm:text-xs font-bold text-[#D4FF00] hover:underline flex items-center gap-1 ml-auto">
          <span>Get Started Now</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </motion.div>
  );
}
