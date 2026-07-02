import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Shield, Zap, Sparkles, Coins, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import { getApiUrl } from '../../config/apiConfig';

const PricingPage = () => {
    const [isYearly, setIsYearly] = useState(false);
    const [loadingPlan, setLoadingPlan] = useState(null);
    const { fetchUserProfile, userProfile } = useAppStore();


    const modelPricing = [
        {
            category: "Image Production",
            models: [
                { name: "Nano Banana Standard", cost: "1 credit" },
                { name: "Nano Banana 2 / Flash", cost: "2 credits" },
                { name: "Nano Banana Pro", cost: "3 credits" },
                { name: "Multi-Shot 9-Grid Matrix", cost: "2 credits" },
                { name: "4K AI Upscaling Master", cost: "2 credits" }
            ]
        },
        {
            category: "Video Production",
            models: [
                { name: "Veo 3.1 Fast Preview", cost: "10 credits" },
                { name: "Veo 3.1 High Fidelity", cost: "40 credits" },
                { name: "Seedance 2.0 Fast", cost: "50 credits" },
                { name: "Seedance 2.0 Pro", cost: "60 credits" }
            ]
        },
        {
            category: "Workflows & Scenarios",
            models: [
                { name: "Storyboard 9-Frame Setup", cost: "5 credits" },
                { name: "UGC Script Narrative Generation", cost: "1 credit" },
                { name: "UGC Scene Single Render", cost: "5 credits" },
                { name: "UGC Full Compilation Production", cost: "10 credits" }
            ]
        },
        {
            category: "Commercial & Forge",
            models: [
                { name: "Product Shoot Context (Single)", cost: "3 credits" },
                { name: "Product Pack (5 Scenes Bundle)", cost: "6 credits" },
                { name: "360 Rotating Turn Showcase", cost: "4 credits" },
                { name: "AI Character Identity Kit", cost: "7 credits" },
                { name: "Movie Matrix Grid Embeddings", cost: "5 credits" }
            ]
        }
    ];

     const plans = [
        {
            name: "Starter",
            monthlyPrice: 399,
            yearlyPrice: 319,
            period: "/3mo",
            yearlyText: "One-time · No renewal",
            description: "An affordable kickstart with a 6-Month setup value layout!",
            image: "https://jdepbrbujambxvtdiwla.supabase.co/storage/v1/object/public/templates/2a3c4c1e-fd65-4909-bfee-36190c085d94.png",
            features: [
                "400 High-Speed Renders (Credits)",
                "Up to 200 Standard Images",
                "Up to 8 8s Video Renders",
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
            period: "/3mo",
            yearlyText: "One-time · No renewal",
            description: "The choice for professional creators and growing visual brands.",
            image: "/pricing/influencer.png",
            features: [
                "2,500 High-Speed Renders (Credits)",
                "Up to 1,250 Standard Images",
                "Up to 52 8s Video Renders",
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
            period: "/6mo",
            yearlyText: "One-time · No renewal",
            description: "Advanced horsepower for Agencies and Power Users.",
            image: "/pricing/director.png",
            features: [
                "5,500 High-Speed Renders (Credits)",
                "Up to 2,750 Standard Images",
                "Up to 114 8s Video Renders",
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
                "Unlimited Nano Banana Images (All) for 7 Days",
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
            period: "/6mo",
            yearlyText: "One-time · No renewal",
            description: "Maximum cinematic Enterprise Tier for Commercial workflows and large volumes.",
            image: "/pricing/enterprise.png",
            features: [
                "11,000 High-Speed Renders (Credits)",
                "Up to 5,500 Standard Images",
                "Up to 229 8s Video Renders",
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

    return (
        <div className="h-full bg-[#030303] text-white p-4 md:p-6 flex flex-col relative overflow-y-auto font-sans pb-12 custom-scrollbar">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-[#D4FF00]/15 to-transparent blur-[120px] -z-10 opacity-70" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] -z-10" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -z-10" />

            {/* Premium Header Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0 bg-white/[0.02] border border-white/5 backdrop-blur-md p-4 md:p-3 rounded-xl mb-3 shrink-0 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.01] to-transparent animate-shimmer" />
                <div className="flex items-center gap-4">
                    <div className="px-3 py-1 bg-gradient-to-r from-[#D4FF00]/10 to-transparent border border-[#D4FF00]/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-[#D4FF00] flex items-center gap-1.5 shadow-[0_0_20px_rgba(212,255,0,0.1)]">
                        <Zap size={12} strokeWidth={2.5} className="animate-pulse" /> Production Fuel
                    </div>
                    <h1 className="text-2xl font-black italic uppercase tracking-tight text-white/90">
                        Elevate <span className="text-[#D4FF00]">Production</span>
                    </h1>
                </div>

                <div className="flex items-center bg-[#D4FF00]/5 border border-[#D4FF00]/20 px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider text-[#D4FF00] shadow-[0_0_15px_rgba(212,255,0,0.05)]">
                    ⚡ One-Time Payments Only • No Auto-Renewal Subscriptions
                </div>
            </div>

            {/* Main Content Layout Grid - Stagger Layouts */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-6 shrink-0">
                {plans.map((plan, idx) => {
                    const currentPrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
                    return (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -5, borderColor: plan.popular ? 'rgba(212,255,0,0.5)' : 'rgba(255,255,255,0.15)', boxShadow: plan.popular ? '0 10px 40px rgba(212,255,0,0.1)' : '0 10px 40px rgba(255,255,255,0.02)' }}
                            transition={{ delay: 0.08 * idx, type: "spring", stiffness: 300, damping: 20 }}
                            className={cn(
                                "relative flex flex-col p-6 rounded-2xl transition-all duration-300 overflow-hidden",
                                "backdrop-blur-xl border flex-1 h-full min-h-[400px] flex flex-col justify-between",
                                plan.popular
                                    ? "bg-[#D4FF00]/[0.02] border-[#D4FF00]/20 shadow-[0_0_30px_rgba(212,255,0,0.03)]"
                                    : "bg-white/[0.01] border-white/5"
                            )}
                        >
                            {/* Card Shimmer on popular */}
                            {plan.popular && <div className="absolute inset-0 bg-gradient-to-b from-[#D4FF00]/[0.03] via-transparent to-transparent -z-10" />}

                            {plan.popular && (
                                <div className="absolute top-5 right-5 px-3 py-1 bg-gradient-to-r from-[#D4FF00] to-yellow-400 rounded-full text-[8px] font-black text-black uppercase tracking-wider shadow-lg">
                                    Most Popular
                                </div>
                            )}

                            <div className="flex items-center gap-3 mb-5 shrink-0">
                                <div className={cn("inline-flex p-3 rounded-xl bg-white/5 border border-white/10 shadow-md", plan.iconColor)}>
                                    <plan.icon size={22} strokeWidth={2} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-tight text-white mb-0.5">{plan.name} TIER</h3>
                                    <p className="text-white/50 text-[10px] font-medium leading-tight max-w-[180px]">{plan.description}</p>
                                </div>
                            </div>

                            {plan.image && (
                                <div className="mb-5 rounded-xl overflow-hidden aspect-[16/10] bg-white/[0.03] border border-white/5 relative group flex items-center justify-center">
                                    <img 
                                        src={plan.image} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                        alt={plan.name}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.parentElement.classList.add('bg-gradient-to-br', 'from-white/[0.05]', 'to-transparent');
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

                            <div className="space-y-1 mb-5 shrink-0 pb-4 border-b border-white/5">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black italic tracking-tighter text-white">₹{currentPrice}</span>
                                    <span className="text-white/40 text-xs font-bold uppercase">{plan.period || "/mo"}</span>
                                </div>
                                {isYearly && <p className="text-[9px] text-[#D4FF00]/80 font-bold uppercase tracking-widest leading-none">{plan.yearlyText || `Billed ₹${(plan.yearlyPrice * 12).toLocaleString()} annually`}</p>}
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 space-y-2.5">
                                {plan.features.map((feature, fIdx) => (
                                    <div key={fIdx} className="flex items-start gap-3 group/feat">
                                        <div className={cn("p-1 rounded-full mt-0.5 border flex-shrink-0 transition-colors", plan.popular ? "text-[#D4FF00] border-[#D4FF00]/20 bg-[#D4FF00]/5" : "text-white/40 border-white/10 bg-white/[0.02]")}>
                                            <Check size={9} strokeWidth={4} />
                                        </div>
                                        <span className="text-[11px] font-medium text-white/70 group-hover/feat:text-white transition-colors leading-snug">
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
                                                                    <strong className="text-black bg-gradient-to-r from-[#D4FF00] to-emerald-400 font-black px-2 py-0.5 rounded text-[10px] mr-1.5 inline-block shadow-[0_0_15px_rgba(212,255,0,0.4)]">
                                                                        {credits}
                                                                    </strong>
                                                                    <span>
                                                                        {rest.split(/(Seedance|Motion Control|Cinematic|Realistic UGC|UGC|No Prompting|Preloaded Templates|Commercial Ads|Reference Board|Soul Images & Video|Soul Images|Soul Video|AI Agent|Consistent Character|Consistent Characters|Storyboard in a click|Storyboard|Angles in a click|Camera Angles|Angles)/gi).map((part, idx) => {
                                                                            if (/(Seedance|Motion Control|Cinematic|Realistic UGC|UGC|No Prompting|Preloaded Templates|Commercial Ads|Reference Board|Soul Images & Video|Soul Images|Soul Video|AI Agent|Consistent Character|Consistent Characters|Storyboard in a click|Storyboard|Angles in a click|Camera Angles|Angles)/i.test(part)) {
                                                                                return (
                                                                                    <strong key={idx} className="text-[#D4FF00] font-black bg-gradient-to-r from-[#D4FF00]/10 to-emerald-500/10 border border-[#D4FF00]/30 px-2 py-0.5 rounded text-[9px] mx-0.5 inline-block shadow-[0_0_10px_rgba(212,255,0,0.15)] uppercase tracking-wider">
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
                                                    {feature.split(/(Seedance|Motion Control|Cinematic|Realistic UGC|UGC|No Prompting|Preloaded Templates|Commercial Ads|Reference Board|Soul Images & Video|Soul Images|Soul Video|AI Agent|Consistent Character|Consistent Characters|Storyboard in a click|Storyboard|Angles in a click|Camera Angles|Angles)/gi).map((part, idx) => {
                                                        if (/(Seedance|Motion Control|Cinematic|Realistic UGC|UGC|No Prompting|Preloaded Templates|Commercial Ads|Reference Board|Soul Images & Video|Soul Images|Soul Video|AI Agent|Consistent Character|Consistent Characters|Storyboard in a click|Storyboard|Angles in a click|Camera Angles|Angles)/i.test(part)) {
                                                            return (
                                                                <strong key={idx} className="text-[#D4FF00] font-black bg-gradient-to-r from-[#D4FF00]/10 to-emerald-500/10 border border-[#D4FF00]/30 px-2 py-0.5 rounded text-[9px] mx-0.5 inline-block shadow-[0_0_10px_rgba(212,255,0,0.15)] uppercase tracking-wider">
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
                                    "mt-5 w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shrink-0 group/btn",
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
            <div id="top-up" className="mt-5 bg-white/[0.01] border border-white/5 rounded-2xl p-4 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-[11px] md:text-xs font-black uppercase tracking-widest text-white/80">Need a Quick Top-Up? <span className="text-white/30">(One-time Credits)</span></h2>
                </div>
                
                <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto md:overflow-x-visible no-scrollbar snap-x snap-mandatory py-1">
                    {[
                        { price: 2000, credits: "2000 Credits", desc: "Standard Top-Up", link: "https://rzp.io/rzp/4U0cJGRV" },
                        { price: 4000, originalCredits: "4000", credits: "4200 Credits", desc: "+5% Bonus Credits", link: "https://rzp.io/rzp/bcCR05bt", popular: true },
                        { price: 9000, originalCredits: "9000", credits: "9900 Credits", desc: "+10% Bonus Credits", link: "https://rzp.io/rzp/fLdtNkEx" }
                    ].map((topup) => (
                        <div key={topup.credits} className={cn(
                            "min-w-[280px] md:min-w-0 p-4 rounded-xl border flex items-center justify-between transition-all duration-300 snap-center",
                            topup.popular ? "bg-[#D4FF00]/[0.05] border-[#D4FF00]/40 shadow-[0_0_20px_rgba(212,255,0,0.05)]" : "bg-white/[0.02] border-white/5"
                        )}>
                            <div className="flex flex-col gap-1">
                                <div className="text-white font-black italic text-lg md:text-base tracking-tight leading-none">₹{topup.price}</div>
                                <div className="flex items-center gap-1.5">
                                    <div className="text-[#D4FF00] font-black text-sm md:text-base tracking-tight uppercase">{topup.credits}</div>
                                    {topup.originalCredits && <div className="text-zinc-500 font-medium italic text-xs line-through uppercase">{topup.originalCredits}</div>}
                                </div>
                                <div className="mt-0.5">
                                    {topup.desc.includes('Bonus') ? (
                                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-[#D4FF00] to-yellow-500 text-black font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded shadow-[0_0_10px_rgba(212,255,0,0.4)]">
                                            <Sparkles size={10} /> {topup.desc}
                                        </span>
                                    ) : (
                                        <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">{topup.desc}</span>
                                    )}
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => {
                                    const userIdLink = userProfile?.id ? `?client_id=${userProfile.id}` : "";
                                    window.open(`${topup.link}${userIdLink}`, "_blank");
                                }}
                                className={cn(
                                    "text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-lg transition-all",
                                    topup.popular ? "bg-[#D4FF00] text-black shadow-[0_0_15px_rgba(212,255,0,0.3)]" : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                                )}
                            >
                                Buy Now
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PricingPage;
