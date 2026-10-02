import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Shield, Zap, Sparkles, Coins, ArrowRight, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import MarketingPromoBanner from '../common/MarketingPromoBanner';

const PricingPage = () => {
    const [isYearly] = useState(false);
    const { userProfile } = useAppStore();
    const [expandedPlans, setExpandedPlans] = useState({});
    const [expandedPacks, setExpandedPacks] = useState({});

    const togglePlan = (name) => {
        setExpandedPlans(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const togglePack = (id) => {
        setExpandedPacks(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const plans = [
        {
            name: "Starter",
            monthlyPrice: 399,
            yearlyPrice: 319,
            originalPrice: 799,
            discount: "50% OFF",
            period: "/3mo",
            yearlyText: "One-time · No renewal",
            creditsSummary: "400 Shorts Credits",
            description: "An affordable kickstart with a 6-Month setup value layout!",
            image: "https://jdepbrbujambxvtdiwla.supabase.co/storage/v1/object/public/templates/2a3c4c1e-fd65-4909-bfee-36190c085d94.png",
            outputSummary: [
                { label: "10s UGC Video Ads", count: "~13 Ads", icon: "📱", color: "text-amber-400 bg-amber-500/10 border-amber-500/25" },
                { label: "Commercial Video Ads", count: "~8 HD Ads", icon: "🎬", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/25" },
                { label: "AI Master Photos", count: "~400 Photos", icon: "📸", color: "text-[#D4FF00] bg-[#D4FF00]/10 border-[#D4FF00]/25" }
            ],
            features: [
                "400 High-Speed Renders (Credits)",
                "Up to 13 UGC Video Ads (10s)",
                "Up to 400 Nano Banana Images",
                "Highest Quality Editing Images (GPT 2.5)",
                "Remix Studio (Remix any video or style)",
                "Object Swap Studio (AI Object replacement)",
                "Standard Text-to-Speech (TTS)",
                "Seedance Video Mode Access",
                "Standard Motion Control (Presets)",
                "Marketing Mode Standard Renders",
                "UGC Script Builder (No Prompting)",
                "Preloaded Templates Ready to Use",
                "Standard Reference Board",
                "Storyboard in a click",
                "Angles in a click",
                "Starter Consistent Character",
                "2 Concurrent Jobs",
                "Standard Support"
            ],
            icon: Shield,
            color: "from-gray-500/10 to-gray-600/5",
            borderColor: "border-gray-500/20",
            iconColor: "text-gray-400",
            buttonText: "Get Started",
            popular: false,
            link: "https://rzp.io/rzp/WhaNtMa"
        },
        {
            name: "Influencer",
            monthlyPrice: 2499,
            yearlyPrice: 1999,
            originalPrice: 4999,
            discount: "50% OFF",
            period: "/3mo",
            yearlyText: "One-time · No renewal",
            creditsSummary: "2,600 Shorts Credits",
            description: "The choice for professional creators and growing visual brands.",
            image: "/pricing/influencer.png",
            outputSummary: [
                { label: "10s UGC Video Ads", count: "~86 Ads", icon: "📱", color: "text-amber-400 bg-amber-500/10 border-amber-500/25" },
                { label: "Commercial Video Ads", count: "~52 HD Ads", icon: "🎬", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/25" },
                { label: "AI Master Photos", count: "~2,600 Photos", icon: "📸", color: "text-[#D4FF00] bg-[#D4FF00]/10 border-[#D4FF00]/25" }
            ],
            features: [
                "2,600 High-Speed Renders (Credits)",
                "Up to 86 UGC Video Ads (10s)",
                "Up to 2,600 Nano Banana Images",
                "Highest Quality Editing Images (GPT 2.5)",
                "Remix Studio (Remix any video or scene)",
                "Object Swap Studio (AI Object replacement)",
                "Premium TTS Voice Output",
                "Standard Motion Control & Presets",
                "Influencer Seedance Video Mode",
                "Marketing Mode Product Shoots",
                "Realistic UGC Scene Renders (No Prompting)",
                "Preloaded Templates Ready to Use",
                "Commercial Ads Creator",
                "Reference Board for Cinematic",
                "Standard Soul Images & Video",
                "Storyboard in a click",
                "Angles in a click (Standard)",
                "3 Consistent Characters",
                "4 Concurrent Jobs",
                "Priority Support"
            ],
            icon: Zap,
            color: "from-blue-500/10 to-blue-600/5",
            borderColor: "border-blue-500/20",
            iconColor: "text-blue-400",
            buttonText: "Start Exploring",
            popular: false,
            link: "https://rzp.io/rzp/nM3CK28p"
        },
        {
            name: "Director",
            monthlyPrice: 4999,
            yearlyPrice: 3999,
            originalPrice: 9999,
            discount: "50% OFF",
            period: "/6mo",
            yearlyText: "One-time · No renewal",
            creditsSummary: "5,500 Shorts Credits",
            description: "Advanced horsepower for Agencies and Power Users.",
            image: "/pricing/director.png",
            outputSummary: [
                { label: "10s UGC Video Ads", count: "~183 Ads", icon: "📱", color: "text-amber-400 bg-amber-500/10 border-amber-500/25" },
                { label: "Commercial Video Ads", count: "~114 HD Ads", icon: "🎬", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/25" },
                { label: "AI Master Photos", count: "~5,500 Photos", icon: "📸", color: "text-[#D4FF00] bg-[#D4FF00]/10 border-[#D4FF00]/25" }
            ],
            features: [
                "5,500 High-Speed Renders (Credits)",
                "Unlimited Nano Banana Lite Images for 7 Days",
                "Up to 183 UGC Video Ads (10s)",
                "Highest Quality Editing Images (GPT 2.5)",
                "Remix Studio (Remix any video or style)",
                "Object Swap Studio (AI Object replacement)",
                "Voice Cloning & Custom TTS Profiles",
                "Advanced Motion Control & Emotions",
                "Director Seedance & Cinematic Modes",
                "Marketing Mode Brand Voices",
                "Realistic UGC Multi-Scene Compilations",
                "Premium Preloaded Templates",
                "Commercial Ads Bulk Renders",
                "Director Reference Board for Cinematic",
                "Director Soul Images & Video",
                "Collab Storyboard in a click",
                "Camera Angles in a click (All)",
                "AI Agent Autopilot Mode (1 Agent)",
                "10 Consistent Characters",
                "8 Concurrent Jobs",
                "24/7 Dedicated Support"
            ],
            icon: Sparkles,
            color: "from-[#D4FF00]/10 to-[#D4FF00]/5",
            borderColor: "border-[#D4FF00]/40",
            iconColor: "text-[#D4FF00]",
            buttonText: "Go Professional",
            popular: true,
            link: "https://rzp.io/rzp/bFVSdvM9"
        },
        {
            name: "Enterprise",
            monthlyPrice: 9999,
            yearlyPrice: 7999,
            originalPrice: 19999,
            discount: "50% OFF",
            period: "/6mo",
            yearlyText: "One-time · No renewal",
            creditsSummary: "11,000 Shorts Credits",
            description: "Maximum cinematic Enterprise Tier for Commercial workflows and large volumes.",
            image: "/pricing/enterprise.png",
            outputSummary: [
                { label: "10s UGC Video Ads", count: "~366 Ads", icon: "📱", color: "text-amber-400 bg-amber-500/10 border-amber-500/25" },
                { label: "Commercial Video Ads", count: "~229 HD Ads", icon: "🎬", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/25" },
                { label: "AI Master Photos", count: "~11,000 Photos", icon: "📸", color: "text-[#D4FF00] bg-[#D4FF00]/10 border-[#D4FF00]/25" }
            ],
            features: [
                "11,000 High-Speed Renders (Credits)",
                "Unlimited Nano Banana Lite Images for 7 Days",
                "Up to 366 UGC Video Ads (10s)",
                "Highest Quality Editing Images (GPT 2.5)",
                "Remix Studio (Full Remix Engine)",
                "Object Swap Studio (AI Object replacement)",
                "Unlimited Custom TTS & Voice Cloning",
                "Full Motion Control & Emotion Syncing",
                "Seedance & Cinematic 4K Video Production",
                "Marketing Mode Bulk Turnarounds",
                "Enterprise UGC Autopilot Renders (No Prompting)",
                "Enterprise Preloaded Templates",
                "Unlimited Commercial Ads Production",
                "Collab Reference Board for Cinematic",
                "Studio Soul Images & Video Unlimited",
                "Enterprise Storyboard in a click",
                "Bulk Angles in a click (Unlimited)",
                "AI Agent Team Collaboration (All Agents)",
                "Unlimited Consistent Characters",
                "16 Concurrent Jobs",
                "Multi-node Sync renders"
            ],
            icon: Coins,
            color: "from-purple-500/10 to-purple-600/5",
            borderColor: "border-purple-500/20",
            iconColor: "text-purple-400",
            buttonText: "Get Enterprise",
            popular: false,
            link: "https://rzp.io/rzp/bK6mnEe"
        }
    ];

    const topupPacks = [
        {
            id: 'pack_starter',
            name: 'Starter Fuel',
            price: '₹299',
            originalPrice: '₹399',
            discount: '25% OFF',
            credits: 250,
            originalCredits: null,
            desc: 'Quick Boost · 250 Shorts',
            link: 'https://rzp.io/rzp/WhaNtMa',
            popular: false,
            badge: 'Quick Boost',
            deliverables: [
                { icon: '📱', label: '10s UGC Video Ads', value: '~8 Ads' },
                { icon: '📸', label: 'AI Master Images', value: '~250 - 500 Photos' },
                { icon: '✨', label: 'Remix Studio', value: 'Remix Any Video or Style' },
                { icon: '🔄', label: 'Object Swap Studio', value: 'Instant Object Replacement' },
                { icon: '🎨', label: 'Highest Quality Editing', value: 'GPT 2.5 Available' },
                { icon: '⚡', label: 'Credits Validity', value: 'Never Expires' }
            ]
        },
        {
            id: 'pack_creator',
            name: 'Creator Pro',
            price: '₹999',
            originalPrice: '₹1,499',
            discount: '33% OFF',
            credits: 1000,
            originalCredits: null,
            desc: '1:1 Standard · 1,000 Shorts',
            link: 'https://rzp.io/rzp/4U0cJGRV',
            popular: true,
            badge: 'MOST POPULAR',
            deliverables: [
                { icon: '📱', label: '10s UGC Video Ads', value: '~33 Ads' },
                { icon: '📸', label: 'AI Master Images', value: '~1,000 - 2,000 Photos' },
                { icon: '✨', label: 'Remix Studio', value: 'Remix Any Video or Style' },
                { icon: '🔄', label: 'Object Swap Studio', value: 'Instant Object Replacement' },
                { icon: '🎨', label: 'Highest Quality Editing', value: 'GPT 2.5 Available' },
                { icon: '⚡', label: 'Credits Validity', value: 'Never Expires' }
            ]
        },
        {
            id: 'pack_studio',
            name: 'Studio Master',
            price: '₹2,499',
            originalPrice: '₹3,499',
            discount: '29% OFF',
            credits: 2600,
            originalCredits: 2500,
            desc: '+100 Bonus Shorts (2,600 Total)',
            bonus: '+100 BONUS',
            link: 'https://rzp.io/rzp/nM3CK28p',
            popular: false,
            badge: 'PRO STUDIO · 2,600 SHORTS',
            deliverables: [
                { icon: '📱', label: '10s UGC Video Ads', value: '~86 Ads' },
                { icon: '🎁', label: 'Nano Banana Lite', value: 'UNLIMITED 7 Days', highlight: true },
                { icon: '📸', label: 'AI Master Images', value: '~2,600 - 5,200 Photos' },
                { icon: '✨', label: 'Remix Studio', value: 'Remix Any Video or Scene' },
                { icon: '🔄', label: 'Object Swap Studio', value: 'AI Object Replacement' },
                { icon: '🎨', label: 'Highest Quality Editing', value: 'GPT 2.5 Available' },
                { icon: '⚡', label: 'Bonus Shorts', value: '+100 Extra Included' }
            ]
        },
        {
            id: 'pack_enterprise',
            name: 'Enterprise Bulk',
            price: '₹4,999',
            originalPrice: '₹6,999',
            discount: '29% OFF',
            credits: 5500,
            originalCredits: 5000,
            desc: '+500 Bonus Shorts (5,500 Total)',
            bonus: '+500 BONUS',
            link: 'https://rzp.io/rzp/bcCR05bt',
            popular: false,
            badge: 'BEST VALUE · +500 BONUS',
            deliverables: [
                { icon: '📱', label: '10s UGC Video Ads', value: '~183 Ads' },
                { icon: '🎁', label: 'Nano Banana Lite', value: 'UNLIMITED 7 Days', highlight: true },
                { icon: '📸', label: 'AI Master Images', value: '~5,500 - 11,000 Photos' },
                { icon: '✨', label: 'Remix Studio', value: 'Full Remix Engine' },
                { icon: '🔄', label: 'Object Swap Studio', value: 'Full Object Replacement' },
                { icon: '🎨', label: 'Highest Quality Editing', value: 'GPT 2.5 Available' },
                { icon: '⚡', label: 'Bonus Shorts', value: '+500 Extra Included' }
            ]
        },
        {
            id: 'pack_agency',
            name: 'Agency Max',
            price: '₹9,999',
            originalPrice: '₹14,999',
            discount: '33% OFF',
            credits: 11000,
            originalCredits: 10000,
            desc: '+1,000 Bonus Shorts (11k Total)',
            bonus: '+1,000 BONUS',
            link: 'https://rzp.io/rzp/fLdtNkEx',
            popular: false,
            badge: 'MAX VOLUME · +1,000 BONUS',
            deliverables: [
                { icon: '📱', label: '10s UGC Video Ads', value: '~366 Ads' },
                { icon: '🎁', label: 'Nano Banana Lite', value: 'UNLIMITED 7 Days', highlight: true },
                { icon: '📸', label: 'AI Master Images', value: '~11,000 - 22,000 Photos' },
                { icon: '✨', label: 'Remix Studio', value: 'Agency Remix Engine' },
                { icon: '🔄', label: 'Object Swap Studio', value: 'Agency Object Swap' },
                { icon: '🎨', label: 'Highest Quality Editing', value: 'GPT 2.5 Available' },
                { icon: '⚡', label: 'Bonus Shorts', value: '+1,000 Extra Included' }
            ]
        }
    ];

    return (
        <div className="h-full w-full max-w-full bg-[#030303] text-white p-3 sm:p-4 md:p-6 flex flex-col relative overflow-y-auto overflow-x-hidden font-sans pb-24 md:pb-12 custom-scrollbar overscroll-x-none touch-pan-y box-border">
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[320px] md:w-[600px] h-[300px] bg-gradient-to-b from-[#D4FF00]/15 to-transparent blur-[80px] md:blur-[120px] opacity-70" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-purple-500/10 rounded-full blur-[80px] md:blur-[100px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-blue-500/10 rounded-full blur-[80px] md:blur-[100px]" />
            </div>

            {/* Header Title Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-4 shrink-0">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/30 text-[#D4FF00] font-mono text-[9px] font-black uppercase tracking-wider">
                            ⚡ ZeroLens Studio Packs
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">1 Short ≈ ₹1</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                        Studio Production Plans
                    </h1>
                </div>

                <div className="flex items-center justify-center text-center w-full md:w-auto bg-[#D4FF00]/5 border border-[#D4FF00]/20 px-3 py-1.5 rounded-xl text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider text-[#D4FF00] shadow-[0_0_15px_rgba(212,255,0,0.05)]">
                    ⚡ One-Time Payments Only • No Auto-Renewal Subscriptions
                </div>
            </div>

            {/* Special Season Promotional Marketing Banner */}
            <MarketingPromoBanner
                className="mb-5 shrink-0"
                onCtaClick={() => document.getElementById('top-up')?.scrollIntoView({ behavior: 'smooth' })}
            />

            {/* Main Content Layout Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-6 shrink-0 w-full max-w-full box-border">
                {plans.map((plan, idx) => {
                    const currentPrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
                    const isPlanExpanded = !!expandedPlans[plan.name];

                    return (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -5, borderColor: plan.popular ? 'rgba(212,255,0,0.5)' : 'rgba(255,255,255,0.15)', boxShadow: plan.popular ? '0 10px 40px rgba(212,255,0,0.1)' : '0 10px 40px rgba(255,255,255,0.02)' }}
                            transition={{ delay: 0.08 * idx, type: "spring", stiffness: 300, damping: 20 }}
                            className={cn(
                                "relative flex flex-col p-4 sm:p-5 md:p-6 rounded-2xl transition-all duration-300 overflow-hidden shadow-2xl w-full max-w-full min-w-0 box-border",
                                "backdrop-blur-2xl border flex-1 flex flex-col",
                                plan.popular
                                    ? "bg-gradient-to-b from-[#D4FF00]/[0.05] via-white/[0.02] to-black/80 border-[#D4FF00]/40 shadow-[0_0_40px_rgba(212,255,0,0.08)]"
                                    : "bg-gradient-to-b from-white/[0.03] via-white/[0.01] to-black/80 border-white/10 hover:border-white/20"
                            )}
                        >
                            {/* Card Shimmer on popular */}
                            {plan.popular && <div className="absolute inset-0 bg-gradient-to-b from-[#D4FF00]/[0.03] via-transparent to-transparent -z-10" />}

                            {plan.popular && (
                                <div className="absolute top-4 right-4 sm:top-5 sm:right-5 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-gradient-to-r from-[#D4FF00] to-yellow-400 rounded-full text-[7.5px] sm:text-[8px] font-black text-black uppercase tracking-wider shadow-lg">
                                    Most Popular
                                </div>
                            )}

                            <div className="flex items-center gap-3 mb-4 sm:mb-5 shrink-0 min-w-0">
                                <div className={cn("inline-flex p-2.5 sm:p-3 rounded-xl bg-white/5 border border-white/10 shadow-md shrink-0", plan.iconColor)}>
                                    <plan.icon size={20} strokeWidth={2} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-black uppercase tracking-tight text-white mb-0.5 truncate">{plan.name} TIER</h3>
                                    <p className="text-white/50 text-[10px] font-medium leading-tight max-w-[180px] truncate sm:whitespace-normal">{plan.description}</p>
                                </div>
                            </div>

                            {plan.image && (
                                <div className="mb-4 sm:mb-5 rounded-xl overflow-hidden aspect-[16/10] bg-white/[0.03] border border-white/5 relative group flex items-center justify-center w-full">
                                    <img 
                                        src={plan.image} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                        alt={plan.name}
                                        onError={(e) => {
                                            const target = e.target;
                                            target.style.display = 'none';
                                            if (target.parentElement) {
                                                target.parentElement.classList.add('bg-gradient-to-br', 'from-white/[0.05]', 'to-transparent');
                                            }
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-[8px] font-black uppercase tracking-widest text-white/60">
                                            Preview
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5 mb-4 sm:mb-5 shrink-0 pb-3 sm:pb-4 border-b border-white/5">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                    <span className="text-3xl sm:text-4xl font-black italic tracking-tighter text-white">₹{currentPrice}</span>
                                    {plan.originalPrice && (
                                        <span className="text-sm sm:text-base text-zinc-500 line-through font-mono font-medium">
                                            ₹{plan.originalPrice}
                                        </span>
                                    )}
                                    {plan.discount && (
                                        <span className="text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.2)]">
                                            {plan.discount}
                                        </span>
                                    )}
                                    <span className="text-white/40 text-xs font-bold uppercase">{plan.period || "/mo"}</span>
                                </div>
                                {plan.creditsSummary && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-[#D4FF00] font-black uppercase tracking-wider">
                                        <Zap size={11} className="fill-current" />
                                        <span>Includes {plan.creditsSummary}</span>
                                    </div>
                                )}
                                {isYearly && <p className="text-[9px] text-[#D4FF00]/80 font-bold uppercase tracking-widest leading-none">{plan.yearlyText || `Billed ₹${(plan.yearlyPrice * 12).toLocaleString()} annually`}</p>}
                            </div>

                            {/* Glassmorphic Deliverables Matrix Box */}
                            {plan.outputSummary && (
                                <div className="mb-4 p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent border border-white/10 backdrop-blur-xl shadow-inner space-y-2 relative overflow-hidden group/box shrink-0 w-full box-border">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover/box:translate-x-full transition-transform duration-1000 pointer-events-none" />
                                    
                                    <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[#D4FF00] flex items-center gap-1.5">
                                            <Sparkles size={10} className="text-[#D4FF00] animate-pulse" /> Included Production Output
                                        </span>
                                        <span className="text-[8px] font-mono font-bold text-white/40 uppercase">Estimate</span>
                                    </div>

                                    <div className="space-y-1.5 pt-0.5">
                                        {plan.outputSummary.map((item, oIdx) => (
                                             <div key={oIdx} className="flex items-center justify-between px-2 sm:px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/5 hover:border-white/20 transition-all gap-2">
                                                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                                    <span className="text-xs shrink-0">{item.icon}</span>
                                                    <span className="text-[9.5px] sm:text-[10px] font-bold text-white/90 truncate">{item.label}</span>
                                                </div>
                                                <span className={cn("text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-md border shrink-0 shadow-sm", item.color)}>
                                                    {item.count}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Desktop Features Header */}
                            <div className="hidden sm:flex items-center justify-between pb-1 border-b border-white/10 mb-2 text-[10px] font-bold text-[#D4FF00]">
                                <span className="flex items-center gap-1.5">
                                    <Sparkles size={11} className="text-[#D4FF00]" />
                                    <span>Included Features</span>
                                </span>
                                <span className="text-[9px] font-mono text-zinc-400 font-normal">
                                    {plan.features.length} features
                                </span>
                            </div>

                            {/* Mobile Dropdown Toggle Button for Features List */}
                            <button
                                type="button"
                                onClick={() => togglePlan(plan.name)}
                                className={cn(
                                    "sm:hidden w-full py-2.5 px-3 rounded-xl border text-[11px] font-black flex items-center justify-between mb-3 transition-all cursor-pointer shadow-md active:scale-98",
                                    isPlanExpanded
                                        ? "bg-[#D4FF00]/15 border-[#D4FF00]/50 text-white shadow-[0_0_15px_rgba(212,255,0,0.15)]"
                                        : "bg-white/5 hover:bg-white/10 border-[#D4FF00]/30 text-white"
                                )}
                            >
                                <span className="flex items-center gap-2 text-[#D4FF00]">
                                    <Sparkles size={13} className="text-[#D4FF00]" />
                                    <span>{isPlanExpanded ? "Hide What You Get" : `What You Get (${plan.features.length} Features)`}</span>
                                </span>
                                <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                                    <span>{isPlanExpanded ? "Close" : "View"}</span>
                                    {isPlanExpanded ? <ChevronUp size={15} className="text-[#D4FF00]" /> : <ChevronDown size={15} className="text-[#D4FF00]" />}
                                </span>
                            </button>

                            {/* Feature List (Always visible on Desktop; toggled on Mobile) */}
                            <div className={cn("flex-1 pr-1 space-y-2", !isPlanExpanded && "hidden sm:block")}>
                                {plan.features.map((feature, fIdx) => (
                                    <div key={fIdx} className="flex items-start gap-2.5 group/feat min-w-0">
                                        <div className={cn("p-1 rounded-full mt-0.5 border shrink-0 transition-colors", plan.popular ? "text-[#D4FF00] border-[#D4FF00]/20 bg-[#D4FF00]/5" : "text-white/40 border-white/10 bg-white/[0.02]")}>
                                            <Check size={9} strokeWidth={4} />
                                        </div>
                                        <span className="text-[10.5px] sm:text-[11px] font-medium text-white/70 group-hover/feat:text-white transition-colors leading-snug break-words">
                                            {/unlimited/i.test(feature) ? (
                                                <>
                                                    {feature.split(/(unlimited)/gi).map((part, pIdx) => 
                                                        /unlimited/i.test(part) ? (
                                                            <strong key={pIdx} className="text-black bg-[#D4FF00] font-black tracking-wider uppercase px-1 py-0.5 rounded text-[8px] mr-1 inline-block shadow-[0_0_10px_rgba(212,255,0,0.25)]">
                                                                {part}
                                                            </strong>
                                                        ) : part
                                                    )}
                                                </>
                                            ) : /High-Speed Renders/i.test(feature) ? (
                                                <>
                                                    {(() => {
                                                        const match = feature.match(/^([\d,]+)\s+(.*)$/);
                                                        if (match) {
                                                            const [_, credits, rest] = match;
                                                            return (
                                                                <>
                                                                    <strong className="text-black bg-gradient-to-r from-[#D4FF00] to-emerald-400 font-black px-1.5 py-0.5 rounded text-[9.5px] sm:text-[10px] mr-1 inline-block shadow-[0_0_15px_rgba(212,255,0,0.4)]">
                                                                        {credits}
                                                                    </strong>
                                                                    <span>
                                                                        {rest.split(/(Seedance|Motion Control|Cinematic|Realistic UGC|UGC|No Prompting|Preloaded Templates|Commercial Ads|Reference Board|Soul Images & Video|Soul Images|Soul Video|AI Agent|Consistent Character|Consistent Characters|Storyboard in a click|Storyboard|Angles in a click|Camera Angles|Angles|Nano Banana Images|Nano Banana|Remix Studio|Object Swap|GPT 2.5)/gi).map((part, idx) => {
                                                                            if (/(Seedance|Motion Control|Cinematic|Realistic UGC|UGC|No Prompting|Preloaded Templates|Commercial Ads|Reference Board|Soul Images & Video|Soul Images|Soul Video|AI Agent|Consistent Character|Consistent Characters|Storyboard in a click|Storyboard|Angles in a click|Camera Angles|Angles|Nano Banana Images|Nano Banana|Remix Studio|Object Swap|GPT 2.5)/i.test(part)) {
                                                                                return (
                                                                                    <strong key={idx} className="text-[#D4FF00] font-black bg-gradient-to-r from-[#D4FF00]/10 to-emerald-500/10 border border-[#D4FF00]/30 px-1.5 py-0.5 rounded text-[8.5px] sm:text-[9px] mx-0.5 inline-block shadow-[0_0_10px_rgba(212,255,0,0.15)] uppercase tracking-wider">
                                                                                        {part}
                                                                                    </strong>
                                                                                );
                                                                            }
                                                                            return part;
                                                                        })}
                                                                    </span>
                                                                </>
                                                            );
                                                        }
                                                        return feature;
                                                    })()}
                                                </>
                                            ) : (
                                                <>
                                                     {feature.split(/(Seedance|Motion Control|Cinematic|Realistic UGC|UGC|No Prompting|Preloaded Templates|Commercial Ads|Reference Board|Soul Images & Video|Soul Images|Soul Video|AI Agent|Consistent Character|Consistent Characters|Storyboard in a click|Storyboard|Angles in a click|Camera Angles|Angles|Nano Banana Images|Nano Banana|Remix Studio|Object Swap|GPT 2.5)/gi).map((part, idx) => {
                                                         if (/(Seedance|Motion Control|Cinematic|Realistic UGC|UGC|No Prompting|Preloaded Templates|Commercial Ads|Reference Board|Soul Images & Video|Soul Images|Soul Video|AI Agent|Consistent Character|Consistent Characters|Storyboard in a click|Storyboard|Angles in a click|Camera Angles|Angles|Nano Banana Images|Nano Banana|Remix Studio|Object Swap|GPT 2.5)/i.test(part)) {
                                                             return (
                                                                <strong key={idx} className="text-[#D4FF00] font-black bg-gradient-to-r from-[#D4FF00]/10 to-emerald-500/10 border border-[#D4FF00]/30 px-1.5 py-0.5 rounded text-[8.5px] sm:text-[9px] mx-0.5 inline-block shadow-[0_0_10px_rgba(212,255,0,0.15)] uppercase tracking-wider">
                                                                    {part}
                                                                </strong>
                                                            );
                                                        }
                                                        return part;
                                                    })}
                                                </>
                                            )}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <button 
                                onClick={() => {
                                    if (plan.link) {
                                        const userIdLink = userProfile?.id ? `?client_id=${userProfile.id}` : "";
                                        window.open(`${plan.link}${userIdLink}`, "_blank");
                                    } else {
                                        alert("Purchasing: " + plan.name);
                                    }
                                }} 
                                className={cn(
                                    "mt-4 sm:mt-5 w-full py-3 sm:py-3.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shrink-0 group/btn cursor-pointer",
                                    plan.popular 
                                        ? "bg-[#D4FF00] text-black hover:bg-[#e6ff00] hover:shadow-[0_0_25px_rgba(212,255,0,0.4)]" 
                                        : "bg-white/5 text-white hover:bg-white/10 border border-white/10 hover:border-white/20"
                                )}
                            >
                                {plan.buttonText} <ArrowRight size={13} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </motion.div>
                    )
                })}
            </div>

            {/* Top-Up Credits Section */}
            <div id="top-up" className="mt-2 sm:mt-4 bg-white/[0.01] border border-white/5 rounded-2xl p-3.5 sm:p-5 backdrop-blur-md shrink-0 w-full max-w-full box-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
                    <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-[#D4FF00]" />
                        <h2 className="text-xs md:text-sm font-black uppercase tracking-widest text-white/90">Instant Shorts Top-Up Packs <span className="text-white/40 font-mono text-[10px]">(One-time · Never Expire)</span></h2>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">1 Short ⚡ ≈ ₹1 Base Ratio + Volume Bonuses</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 w-full max-w-full py-1 box-border">
                    {topupPacks.map((topup) => {
                        const isExpanded = !!expandedPacks[topup.id];

                        return (
                            <div key={topup.id} className={cn(
                                "w-full max-w-full p-3.5 sm:p-4 rounded-xl border flex flex-col justify-between transition-all duration-300 box-border gap-3 group hover:scale-[1.02]",
                                topup.popular ? "bg-[#D4FF00]/[0.06] border-[#D4FF00]/50 shadow-[0_0_25px_rgba(212,255,0,0.08)]" : "bg-white/[0.02] border-white/10 hover:border-white/20"
                            )}>
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{topup.name}</span>
                                        <span className={cn(
                                            "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full",
                                            topup.popular ? "bg-[#D4FF00] text-black" : "bg-white/10 text-zinc-300"
                                        )}>
                                            {topup.badge}
                                        </span>
                                    </div>

                                    <div className="space-y-1.5">
                                        {/* AMOUNT - BIGGER SIZE */}
                                        <div className="flex items-baseline gap-2 flex-wrap">
                                            <span className="text-2xl sm:text-3xl font-black italic tracking-tight text-white">{topup.price}</span>
                                            {topup.originalPrice && (
                                                <span className="text-xs sm:text-sm text-zinc-500 line-through font-mono font-medium">
                                                    {topup.originalPrice}
                                                </span>
                                            )}
                                            {topup.discount && (
                                                <span className="text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.15)]">
                                                    {topup.discount}
                                                </span>
                                            )}
                                        </div>

                                        {/* SHORTS - SMALLER SIZE */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#D4FF00]/10 border border-[#D4FF00]/25 text-[#D4FF00] font-black text-xs sm:text-sm">
                                                <Zap size={11} className="fill-current" />
                                                <span>{topup.credits.toLocaleString()} Shorts</span>
                                            </div>
                                            {topup.bonus && (
                                                <span className="text-[8.5px] font-mono font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                                                    {topup.bonus}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-zinc-400 font-medium">
                                        {topup.desc}
                                    </p>

                                    {/* Desktop Deliverables Header */}
                                    <div className="hidden sm:flex items-center justify-between pt-2 border-t border-white/10 text-[10px] font-bold text-[#D4FF00]">
                                        <span className="flex items-center gap-1.5">
                                            <Sparkles size={11} className="text-[#D4FF00]" />
                                            <span>What You Get</span>
                                        </span>
                                        <span className="text-[9px] font-mono text-zinc-400 font-normal">
                                            {topup.deliverables.length} items
                                        </span>
                                    </div>

                                    {/* Mobile Dropdown Toggle Button */}
                                    <button
                                        type="button"
                                        onClick={() => togglePack(topup.id)}
                                        className={cn(
                                            "sm:hidden w-full py-2 px-3 rounded-lg border text-[11px] font-bold flex items-center justify-between transition-all cursor-pointer shadow-sm active:scale-98",
                                            isExpanded
                                                ? "bg-[#D4FF00]/15 border-[#D4FF00]/50 text-white shadow-[0_0_12px_rgba(212,255,0,0.15)]"
                                                : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                                        )}
                                    >
                                        <span className="flex items-center gap-1.5 text-[#D4FF00]">
                                            <Sparkles size={12} className="text-[#D4FF00]" />
                                            <span>{isExpanded ? "Hide Deliverables" : `What You Get (${topup.deliverables.length} Items)`}</span>
                                        </span>
                                        <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                                            <span>{isExpanded ? "Close" : "View"}</span>
                                            {isExpanded ? <ChevronUp size={14} className="text-[#D4FF00]" /> : <ChevronDown size={14} className="text-[#D4FF00]" />}
                                        </span>
                                    </button>

                                    {/* Deliverables List: Always visible length-by-length on Desktop; Toggled on Mobile */}
                                    <div className={cn("space-y-1.5 pt-1", !isExpanded && "hidden sm:block")}>
                                        {topup.deliverables.map((item, dIdx) => (
                                            <div
                                                key={dIdx}
                                                className={cn(
                                                    "flex items-center justify-between p-1.5 rounded-md text-[9.5px] border gap-1.5",
                                                    item.highlight
                                                        ? "bg-[#D4FF00]/10 border-[#D4FF00]/30 text-white"
                                                        : "bg-black/40 border-white/5 text-zinc-300"
                                                )}
                                            >
                                                <span className="flex items-center gap-1 min-w-0 font-medium truncate">
                                                    <span>{item.icon}</span>
                                                    <span className="truncate">{item.label}</span>
                                                </span>
                                                <span className={cn(
                                                    "font-bold shrink-0 text-[9px] uppercase",
                                                    item.highlight ? "text-[#D4FF00] font-black" : "text-white"
                                                )}>
                                                    {item.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => {
                                        if (topup.link) {
                                            const userIdLink = userProfile?.id ? `?client_id=${userProfile.id}` : "";
                                            window.open(`${topup.link}${userIdLink}`, "_blank");
                                        } else {
                                            alert("Purchasing: " + topup.name);
                                        }
                                    }}
                                    className={cn(
                                        "w-full text-[10px] font-black uppercase tracking-widest py-2 rounded-lg transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1 active:scale-95",
                                        topup.popular 
                                            ? "bg-[#D4FF00] text-black hover:bg-[#e6ff00] shadow-[0_0_15px_rgba(212,255,0,0.3)]" 
                                            : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                                    )}
                                >
                                    <Zap size={11} className="fill-current" />
                                    <span>Get {topup.credits.toLocaleString()}⚡</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default PricingPage;
