import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Zap, Flame, CheckCircle2, Tag } from 'lucide-react';
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
      className={`relative w-full overflow-hidden rounded-2xl border border-[#D4FF00]/40 bg-[#070709] shadow-[0_0_40px_rgba(212,255,0,0.15)] group ${className}`}
    >
      {/* Visual Banner Media Container */}
      <div className="relative w-full overflow-hidden">
        {/* Banner Graphic Image */}
        <div className="relative w-full h-[180px] sm:h-[220px] md:h-[260px] lg:h-[290px] overflow-hidden">
          <img
            src="/pricing/season-discount-banner.jpg"
            alt="30% OFF Special Season AI Video Studio Discount Banner"
            className="w-full h-full object-cover object-center transform transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            loading="eager"
          />

          {/* Gradients overlay to blend with content and dark theme */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-black/40 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070709]/90 via-[#070709]/40 to-transparent pointer-events-none" />

          {/* Top Left Floating Pill */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4FF00] text-black font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(212,255,0,0.4)]">
              <Flame className="w-3.5 h-3.5 fill-black text-black" />
              Limited Time Season Offer • 30% OFF
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-white/90 font-mono text-[10px] font-bold">
              <CheckCircle2 className="w-3 h-3 text-[#D4FF00]" />
              Instant Delivery
            </span>
          </div>

          {/* Bottom Overlay Content */}
          <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-5 sm:right-5 z-10 flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div className="space-y-1 sm:space-y-1.5 max-w-xl">
              <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-md leading-tight">
                High-Converting UGC Videos for <span className="text-[#D4FF00] drop-shadow-[0_0_12px_rgba(212,255,0,0.6)]">₹30</span>
              </h2>
              <p className="text-[11px] sm:text-xs md:text-sm text-white/80 font-medium leading-relaxed drop-shadow">
                Complete ready-to-post ad visuals from just <span className="text-emerald-400 font-bold">₹50 to ₹100</span>. Stop paying ₹15,000+ for camera shoots and models.
              </p>
            </div>

            {/* Quick Action Button */}
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={handleClick}
                className="w-full sm:w-auto px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-[#D4FF00] to-yellow-400 hover:from-[#e6ff00] hover:to-yellow-300 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_rgba(212,255,0,0.5)] hover:shadow-[0_0_45px_rgba(212,255,0,0.7)] active:scale-[0.98] cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>Claim 30% Discount</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Feature Highlights Strip Under Banner */}
        <div className="bg-[#0c0c10] border-t border-white/10 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-[10px] sm:text-[11px]">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-white/70">
            <span className="flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-[#D4FF00]" />
              <span>1 UGC Video = <strong className="text-white">30 Shorts (₹30)</strong></span>
            </span>
            <span className="hidden xs:inline text-white/20">•</span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Full Video Ad = <strong className="text-white">50 Shorts (₹50)</strong></span>
            </span>
            <span className="hidden md:inline text-white/20">•</span>
            <span className="hidden md:flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-blue-400" />
              <span>No Subscriptions • One-time top-ups never expire</span>
            </span>
          </div>

          <button
            type="button"
            onClick={handleClick}
            className="text-[10px] sm:text-xs font-bold text-[#D4FF00] hover:underline flex items-center gap-1 ml-auto cursor-pointer"
          >
            <span>View Discounted Packs</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
