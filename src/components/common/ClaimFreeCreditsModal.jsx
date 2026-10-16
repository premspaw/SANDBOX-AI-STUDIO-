import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Video, Image as ImageIcon, Sparkles, X, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAppStore } from '../../store';

export default function ClaimFreeCreditsModal() {
  const show = useAppStore(state => state.showClaimCreditsModal);
  const setShow = useAppStore(state => state.setShowClaimCreditsModal);
  const setActiveTab = useAppStore(state => state.setActiveTab);

  if (!show) return null;

  const handleClaim = () => {
    setShow(false);
    const setShowingAuthModal = useAppStore.getState().setShowingAuthModal;
    if (setShowingAuthModal) {
      setShowingAuthModal(true);
    } else if (setActiveTab) {
      setActiveTab('auth');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShow(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', duration: 0.45, bounce: 0.15 }}
          className="relative w-full max-w-md my-auto bg-[#0c0d12] border border-[#c8f135]/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(200,241,53,0.15)] overflow-hidden text-left z-10"
        >
          {/* Ambient Glow Accents */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#c8f135]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={() => setShow(false)}
            aria-label="Close modal"
            className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all border border-white/5 active:scale-90"
          >
            <X size={16} />
          </button>

          {/* Top Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c8f135]/10 border border-[#c8f135]/30 text-[#c8f135] text-[10px] font-black uppercase tracking-wider mb-4">
            <Sparkles size={11} className="animate-pulse" />
            <span>Complimentary Creator Grant</span>
          </div>

          {/* Heading */}
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-2">
            Claim Your <span className="text-[#c8f135]">60 Free Shorts</span> ⚡
          </h2>

          <p className="text-xs sm:text-sm text-gray-400 mb-5 leading-relaxed">
            Create a free account or sign in to start generating immediately. Your welcome balance includes:
          </p>

          {/* Feature Breakdown Cards */}
          <div className="space-y-2.5 mb-5">
            {/* Video Card */}
            <div className="flex items-center gap-3.5 p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <Video size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-white tracking-wide">1 Full AI Video</h4>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    50 ⚡
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">
                  ByteDance Seedance 2.5 or Google Veo / Omni video.
                </p>
              </div>
            </div>

            {/* Image Card */}
            <div className="flex items-center gap-3.5 p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#c8f135]/10 border border-[#c8f135]/20 flex items-center justify-center text-[#c8f135] shrink-0">
                <ImageIcon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-white tracking-wide">Image Generations</h4>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#c8f135]/15 text-[#c8f135] border border-[#c8f135]/30">
                    10 ⚡
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">
                  10-20 images on Nano Banana + 2 free GPT trials.
                </p>
              </div>
            </div>
          </div>

          {/* Guarantee Pills */}
          <div className="flex items-center justify-center gap-4 text-[10.5px] font-medium text-gray-400 mb-6 py-1">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck size={12} /> No Card Required
            </span>
            <span className="text-gray-600">•</span>
            <span>Instant Crediting</span>
            <span className="text-gray-600">•</span>
            <span>100% Free</span>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={handleClaim}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#c8f135] hover:bg-[#b5dc28] active:scale-[0.98] text-black font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg shadow-[#c8f135]/25 flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Claim 60 Free Shorts & Sign In</span>
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Secondary Dismiss */}
          <button
            onClick={() => setShow(false)}
            className="w-full mt-2.5 py-2 text-center text-[11px] font-semibold text-gray-500 hover:text-gray-300 transition-colors"
          >
            Maybe later
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
