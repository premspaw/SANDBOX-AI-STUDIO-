import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Sparkles, ChevronLeft, ChevronRight, Flame, ArrowRight, ShieldCheck, Tag, Gift, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';

export const PROMO_SLIDES = [
    {
        id: 'promo_creator_33',
        tag: '⚡ FLASH SALE · 33% OFF',
        tagColor: 'bg-[#c8f135] text-black shadow-[0_0_20px_rgba(200,241,53,0.5)]',
        title: 'Creator Pro Turbo Pack',
        subtitle: 'Our #1 creator choice for viral UGC video ads & 4K cinematic shots',
        credits: '1,000 Shorts ⚡',
        price: '₹999',
        originalPrice: '₹1,499',
        discountBadge: 'Save ₹500',
        perCredit: '₹1.00 / Short · Best Value',
        deliverables: ['~33 UGC Video Ads', '2,000 AI Photos', 'Remix & Object Swap', 'Never Expires'],
        bgGradient: 'from-black via-[#0d1607] to-black',
        accentColor: '#c8f135',
        borderGlow: 'border-[#c8f135]/40 hover:border-[#c8f135]/80 shadow-[0_0_35px_rgba(200,241,53,0.15)]',
        link: 'https://rzp.io/rzp/4U0cJGRV',
        ctaText: 'Claim 1,000 Shorts (₹999)'
    },
    {
        id: 'promo_starter_mini',
        tag: '🔥 MINI POCKET PACK · 25% OFF',
        tagColor: 'bg-cyan-400 text-black shadow-[0_0_20px_rgba(34,211,238,0.5)]',
        title: 'Starter Fuel Pocket Pack',
        subtitle: 'Quick test run for fast rendering without breaking the bank',
        credits: '250 Shorts ⚡',
        price: '₹299',
        originalPrice: '₹399',
        discountBadge: 'Save ₹100',
        perCredit: '₹1.20 / Short · Instant Top-Up',
        deliverables: ['~8 UGC Video Ads', '500 AI Photos', 'GPT 2.5 Editing', 'Instant Activation'],
        bgGradient: 'from-black via-[#04141e] to-black',
        accentColor: '#38bdf8',
        borderGlow: 'border-cyan-500/40 hover:border-cyan-400/80 shadow-[0_0_35px_rgba(56,189,248,0.15)]',
        link: 'https://rzp.io/rzp/WhaNtMa',
        ctaText: 'Get Starter Pack (₹299)'
    },
    {
        id: 'promo_studio_bonus',
        tag: '🚀 PRO STUDIO · +100 BONUS SHORTS',
        tagColor: 'bg-purple-400 text-black shadow-[0_0_20px_rgba(192,132,252,0.5)]',
        title: 'Studio Master Power Suite',
        subtitle: 'Massive capacity + 7 Days Unlimited Nano Banana Lite included FREE',
        credits: '2,600 Shorts ⚡',
        price: '₹2,499',
        originalPrice: '₹3,499',
        discountBadge: '29% OFF + 100 BONUS',
        perCredit: '₹0.96 / Short · Pro Tier',
        deliverables: ['~86 UGC Video Ads', '7-Day Unlimited Lite', '5,200 AI Photos', '+100 Extra Bonus'],
        bgGradient: 'from-black via-[#160624] to-black',
        accentColor: '#c084fc',
        borderGlow: 'border-purple-500/40 hover:border-purple-400/80 shadow-[0_0_35px_rgba(192,132,252,0.15)]',
        link: 'https://rzp.io/rzp/nM3CK28p',
        ctaText: 'Claim 2,600 Shorts (₹2,499)'
    },
    {
        id: 'promo_enterprise_bulk',
        tag: '💎 ENTERPRISE VIP · +500 BONUS SHORTS',
        tagColor: 'bg-amber-400 text-black shadow-[0_0_20px_rgba(251,191,36,0.5)]',
        title: 'Enterprise Bulk Power Pass',
        subtitle: 'Maximum agency horsepower with VIP priority GPU queues',
        credits: '5,500 Shorts ⚡',
        price: '₹4,999',
        originalPrice: '₹6,999',
        discountBadge: 'Save ₹2,000 + 500 BONUS',
        perCredit: '₹0.91 / Short · Agency Rate',
        deliverables: ['~183 UGC Video Ads', '11,000 AI Photos', 'Dedicated GPU Lanes', '+500 Extra Bonus'],
        bgGradient: 'from-black via-[#1f1304] to-black',
        accentColor: '#fbbf24',
        borderGlow: 'border-amber-500/40 hover:border-amber-400/80 shadow-[0_0_35px_rgba(251,191,36,0.15)]',
        link: 'https://rzp.io/rzp/bcCR05bt',
        ctaText: 'Claim 5,500 Shorts (₹4,999)'
    }
];

export function PromoCarousel({ className = '', onSelectPack }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [direction, setDirection] = useState(1);
    const userProfile = useAppStore(state => state.userProfile);
    const timerRef = useRef(null);

    const totalSlides = PROMO_SLIDES.length;

    const nextSlide = useCallback(() => {
        setDirection(1);
        setCurrentIndex(prev => (prev + 1) % totalSlides);
    }, [totalSlides]);

    const prevSlide = useCallback(() => {
        setDirection(-1);
        setCurrentIndex(prev => (prev - 1 + totalSlides) % totalSlides);
    }, [totalSlides]);

    // Auto-advance carousel every 4.5s unless hovered/paused
    useEffect(() => {
        if (isPaused) return;
        timerRef.current = setInterval(nextSlide, 4500);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPaused, nextSlide]);

    const currentSlide = PROMO_SLIDES[currentIndex];

    const handleCta = (e, slide) => {
        e.stopPropagation();
        if (onSelectPack) {
            onSelectPack(slide);
            return;
        }
        if (slide.link) {
            const clientIdParam = userProfile?.id ? `?client_id=${userProfile.id}` : '';
            window.open(`${slide.link}${clientIdParam}`, '_blank');
        } else {
            const topUpEl = document.getElementById('topup-packs');
            if (topUpEl) topUpEl.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Slide transition variants
    const slideVariants = {
        enter: (dir) => ({
            x: dir > 0 ? 100 : -100,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (dir) => ({
            x: dir > 0 ? -100 : 100,
            opacity: 0
        })
    };

    return (
        <div 
            className={cn(
                "relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border bg-black select-none group transition-all duration-300",
                currentSlide.borderGlow,
                className
            )}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
        >
            {/* 16:9 Aspect Ratio Container on Mobile & Desktop */}
            <div className="relative w-full aspect-[16/9] min-h-[220px] max-h-[380px] sm:max-h-[420px] overflow-hidden flex flex-col justify-between">
                
                {/* Background ambient lighting */}
                <div 
                    className={cn(
                        "absolute inset-0 bg-gradient-to-br transition-all duration-700 pointer-events-none opacity-90",
                        currentSlide.bgGradient
                    )}
                />
                
                {/* Subtle cyber grid overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                {/* Animated Glow Spot */}
                <div 
                    className="absolute -top-12 -right-12 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-30 transition-colors duration-700"
                    style={{ backgroundColor: currentSlide.accentColor }}
                />

                {/* Content Overlay */}
                <div className="relative z-10 w-full h-full p-3.5 sm:p-6 flex flex-col justify-between">
                    
                    {/* Top Row: Promo Badge & Timer */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className={cn(
                                "text-[9px] sm:text-[11px] font-black uppercase tracking-wider px-2 sm:px-3 py-1 rounded-full flex items-center gap-1 shrink-0",
                                currentSlide.tagColor
                            )}>
                                <Flame className="w-3 h-3 fill-current" />
                                <span>{currentSlide.tag}</span>
                            </span>
                            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3 text-[#c8f135]" />
                                <span>Limited Window</span>
                            </span>
                        </div>

                        {/* Slide Indicator Count */}
                        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono text-zinc-300">
                            <span className="font-bold text-[#c8f135]">{currentIndex + 1}</span>
                            <span className="text-zinc-600">/</span>
                            <span>{totalSlides}</span>
                        </div>
                    </div>

                    {/* Middle Section: Offer Content with Animated Keying */}
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={currentSlide.id}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.35, ease: 'easeInOut' }}
                            className="flex flex-col justify-center my-auto py-1 space-y-1 sm:space-y-2"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4">
                                <div className="space-y-0.5">
                                    <h4 className="text-base sm:text-2xl md:text-3xl font-black text-white tracking-tight uppercase line-clamp-1 drop-shadow-md">
                                        {currentSlide.title}
                                    </h4>
                                    <p className="text-[10px] sm:text-xs text-zinc-300 font-medium line-clamp-1 max-w-xl">
                                        {currentSlide.subtitle}
                                    </p>
                                </div>

                                {/* Price Box */}
                                <div className="flex items-baseline gap-1.5 sm:gap-2 shrink-0">
                                    <span className="text-xl sm:text-3xl font-black italic text-white tracking-tight">
                                        {currentSlide.price}
                                    </span>
                                    <span className="text-[11px] sm:text-xs text-zinc-500 line-through font-mono">
                                        {currentSlide.originalPrice}
                                    </span>
                                    <span className="text-[8.5px] sm:text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                                        {currentSlide.discountBadge}
                                    </span>
                                </div>
                            </div>

                            {/* Shorts & Value Highlight Pills */}
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pt-0.5">
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-lg bg-[#c8f135]/15 border border-[#c8f135]/40 text-[#c8f135] font-black text-xs sm:text-sm">
                                    <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
                                    <span>{currentSlide.credits}</span>
                                </div>
                                <span className="text-[9px] sm:text-[11px] font-mono text-zinc-300 bg-white/5 border border-white/10 px-2 py-0.5 sm:py-1 rounded-md">
                                    {currentSlide.perCredit}
                                </span>
                            </div>

                            {/* Deliverables tags */}
                            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap pt-0.5">
                                {currentSlide.deliverables.map((item, idx) => (
                                    <span 
                                        key={idx}
                                        className="text-[8.5px] sm:text-[10px] font-bold text-zinc-300 bg-black/50 border border-white/10 px-1.5 sm:px-2 py-0.5 rounded-md flex items-center gap-1"
                                    >
                                        <Sparkles className="w-2.5 h-2.5 text-[#c8f135]" />
                                        <span>{item}</span>
                                    </span>
                                ))}
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Bottom Row: CTA Button + Navigation Dots */}
                    <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/10">
                        
                        {/* Slide Indicators / Dots */}
                        <div className="flex items-center gap-1.5">
                            {PROMO_SLIDES.map((slide, idx) => (
                                <button
                                    key={slide.id}
                                    type="button"
                                    onClick={() => {
                                        setDirection(idx > currentIndex ? 1 : -1);
                                        setCurrentIndex(idx);
                                    }}
                                    className={cn(
                                        "h-1.5 rounded-full transition-all cursor-pointer",
                                        idx === currentIndex
                                            ? "w-6 sm:w-8 bg-[#c8f135] shadow-[0_0_10px_rgba(200,241,53,0.8)]"
                                            : "w-1.5 sm:w-2 bg-white/20 hover:bg-white/40"
                                    )}
                                    aria-label={`Go to slide ${idx + 1}`}
                                />
                            ))}
                        </div>

                        {/* Action CTA */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={(e) => handleCta(e, currentSlide)}
                                className="px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-[#c8f135] hover:bg-[#d8ff43] text-black font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_25px_rgba(200,241,53,0.4)] active:scale-95 transition-all cursor-pointer shrink-0"
                            >
                                <Zap className="w-3.5 h-3.5 fill-black text-black" />
                                <span>{currentSlide.ctaText}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-black" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Left & Right Navigation Arrows */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        prevSlide();
                    }}
                    className="absolute left-1.5 sm:left-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-black/60 hover:bg-black/90 border border-white/15 text-white flex items-center justify-center opacity-70 hover:opacity-100 transition-all cursor-pointer shadow-md active:scale-90"
                    aria-label="Previous promo slide"
                >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        nextSlide();
                    }}
                    className="absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-black/60 hover:bg-black/90 border border-white/15 text-white flex items-center justify-center opacity-70 hover:opacity-100 transition-all cursor-pointer shadow-md active:scale-90"
                    aria-label="Next promo slide"
                >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </button>
            </div>
        </div>
    );
}

export default PromoCarousel;
