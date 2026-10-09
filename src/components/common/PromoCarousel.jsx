import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ChevronLeft, ChevronRight, Flame, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';

const PROMO_SLIDES = [
    {
        id: 'promo_creator_33',
        badge: '⚡ FLASH SALE · 33% OFF',
        badgeColor: 'bg-[#c8f135] text-black shadow-[0_0_15px_rgba(200,241,53,0.4)]',
        dealHighlight: '1,000 Shorts',
        price: '₹999',
        originalPrice: '₹1,499',
        tagline: 'Creator Pro · Daily UGC Video Ads & 4K Cinema',
        accentColor: '#c8f135',
        bgGradient: 'from-black via-[#0d1607] to-black',
        borderGlow: 'border-[#c8f135]/40 hover:border-[#c8f135]/80 shadow-[0_0_25px_rgba(200,241,53,0.15)]',
        link: 'https://rzp.io/rzp/4U0cJGRV',
        ctaText: 'Claim ₹999 Deal'
    },
    {
        id: 'promo_starter_mini',
        badge: '🔥 25% OFF · POCKET PACK',
        badgeColor: 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]',
        dealHighlight: '250 Shorts',
        price: '₹299',
        originalPrice: '₹399',
        tagline: 'Starter Fuel · Quick AI Video & Image Test Boost',
        accentColor: '#38bdf8',
        bgGradient: 'from-black via-[#04141e] to-black',
        borderGlow: 'border-cyan-500/40 hover:border-cyan-400/80 shadow-[0_0_25px_rgba(56,189,248,0.15)]',
        link: 'https://rzp.io/rzp/WhaNtMa',
        ctaText: 'Claim ₹299 Deal'
    },
    {
        id: 'promo_studio_bonus',
        badge: '🚀 +100 BONUS SHORTS · 29% OFF',
        badgeColor: 'bg-purple-400 text-black shadow-[0_0_15px_rgba(192,132,252,0.4)]',
        dealHighlight: '2,600 Shorts',
        price: '₹2,499',
        originalPrice: '₹3,499',
        tagline: 'Studio Master · Unlimited Lite & High Capacity',
        accentColor: '#c084fc',
        bgGradient: 'from-black via-[#160624] to-black',
        borderGlow: 'border-purple-500/40 hover:border-purple-400/80 shadow-[0_0_25px_rgba(192,132,252,0.15)]',
        link: 'https://rzp.io/rzp/nM3CK28p',
        ctaText: 'Claim ₹2,499 Deal'
    },
    {
        id: 'promo_enterprise_bulk',
        badge: '💎 +500 BONUS SHORTS · 40% OFF',
        badgeColor: 'bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.4)]',
        dealHighlight: '5,500 Shorts',
        price: '₹4,999',
        originalPrice: '₹6,999',
        tagline: 'VIP Agency Pass · Dedicated GPU Priority Lanes',
        accentColor: '#fbbf24',
        bgGradient: 'from-black via-[#1f1304] to-black',
        borderGlow: 'border-amber-500/40 hover:border-amber-400/80 shadow-[0_0_25px_rgba(251,191,36,0.15)]',
        link: 'https://rzp.io/rzp/bcCR05bt',
        ctaText: 'Claim ₹4,999 Deal'
    }
];

export function PromoCarousel({ className = '', onSelectPack }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [direction, setDirection] = useState(1);
    const userProfile = useAppStore(state => state.userProfile);
    const timerRef = useRef(null);
    const touchStartXRef = useRef(0);
    const touchEndXRef = useRef(0);

    const totalSlides = PROMO_SLIDES.length;

    const nextSlide = useCallback(() => {
        setDirection(1);
        setCurrentIndex(prev => (prev + 1) % totalSlides);
    }, [totalSlides]);

    const prevSlide = useCallback(() => {
        setDirection(-1);
        setCurrentIndex(prev => (prev - 1 + totalSlides) % totalSlides);
    }, [totalSlides]);

    // Auto-advance carousel every 5s unless hovered/paused
    useEffect(() => {
        if (isPaused) return;
        timerRef.current = setInterval(nextSlide, 5000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPaused, nextSlide]);

    const handleTouchStart = (e) => {
        setIsPaused(true);
        if (e.touches && e.touches[0]) {
            touchStartXRef.current = e.touches[0].clientX;
            touchEndXRef.current = e.touches[0].clientX;
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches && e.touches[0]) {
            touchEndXRef.current = e.touches[0].clientX;
        }
    };

    const handleTouchEnd = () => {
        setIsPaused(false);
        const startX = touchStartXRef.current;
        const endX = touchEndXRef.current;
        if (startX && endX) {
            const diff = startX - endX;
            if (diff > 40) {
                nextSlide();
            } else if (diff < -40) {
                prevSlide();
            }
        }
        touchStartXRef.current = 0;
        touchEndXRef.current = 0;
    };

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

    const slideVariants = {
        enter: (dir) => ({
            x: dir > 0 ? 60 : -60,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (dir) => ({
            x: dir > 0 ? -60 : 60,
            opacity: 0
        })
    };

    return (
        <div 
            className={cn(
                "relative w-full rounded-2xl overflow-hidden border bg-black select-none group transition-all duration-300",
                currentSlide.borderGlow,
                className
            )}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Ambient Lighting & Cyber Pattern */}
            <div 
                className={cn(
                    "absolute inset-0 bg-gradient-to-r transition-all duration-700 pointer-events-none opacity-90",
                    currentSlide.bgGradient
                )}
            />
            <div 
                className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-25 transition-colors duration-700"
                style={{ backgroundColor: currentSlide.accentColor }}
            />

            {/* Slide Content Banner */}
            <div className="relative z-10 w-full px-4 sm:px-6 py-3.5 sm:py-4">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentSlide.id}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6"
                    >
                        {/* Left: Offer highlight */}
                        <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0",
                                    currentSlide.badgeColor
                                )}>
                                    <Flame className="w-3 h-3 fill-current" />
                                    <span>{currentSlide.badge}</span>
                                </span>
                                <span className="text-[9px] font-mono text-zinc-400">
                                    {currentIndex + 1} / {totalSlides}
                                </span>
                            </div>

                            <div className="flex items-baseline gap-2.5 flex-wrap">
                                <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                    {currentSlide.dealHighlight}
                                </span>
                                <span className="text-lg sm:text-xl font-black text-[#c8f135]">
                                    {currentSlide.price}
                                </span>
                                <span className="text-xs text-zinc-500 line-through font-mono">
                                    {currentSlide.originalPrice}
                                </span>
                            </div>

                            <p className="text-[11px] text-zinc-300 font-medium truncate max-w-lg">
                                {currentSlide.tagline}
                            </p>
                        </div>

                        {/* Right: One Click CTA Button */}
                        <div className="shrink-0 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={(e) => handleCta(e, currentSlide)}
                                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#c8f135] hover:bg-[#d8ff43] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(200,241,53,0.35)] active:scale-95 transition-all cursor-pointer"
                            >
                                <Zap className="w-3.5 h-3.5 fill-black text-black" />
                                <span>{currentSlide.ctaText}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-black" />
                            </button>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Bottom Dots Navigation */}
                <div className="flex items-center justify-center gap-1.5 mt-2.5">
                    {PROMO_SLIDES.map((slide, idx) => (
                        <button
                            key={slide.id}
                            type="button"
                            onClick={() => {
                                setDirection(idx > currentIndex ? 1 : -1);
                                setCurrentIndex(idx);
                            }}
                            className={cn(
                                "h-1 rounded-full transition-all cursor-pointer",
                                idx === currentIndex
                                    ? "w-6 bg-[#c8f135] shadow-[0_0_8px_rgba(200,241,53,0.8)]"
                                    : "w-2 bg-white/20 hover:bg-white/40"
                            )}
                            aria-label={`Go to slide ${idx + 1}`}
                        />
                    ))}
                </div>
            </div>

            {/* Left & Right Arrow controls (visible on hover) */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    prevSlide();
                }}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/70 hover:bg-black border border-white/10 text-white flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity cursor-pointer active:scale-90"
                aria-label="Previous promo slide"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    nextSlide();
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/70 hover:bg-black border border-white/10 text-white flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity cursor-pointer active:scale-90"
                aria-label="Next promo slide"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
}

export default PromoCarousel;
