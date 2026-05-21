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
                { name: "Nano Banana Pro", cost: "5 credits" },
                { name: "Multi-Shot 9-Grid Matrix", cost: "2 credits" },
                { name: "4K AI Upscaling Master", cost: "3 credits" }
            ]
        },
        {
            category: "Video Production",
            models: [
                { name: "Veo 3.1 Fast Preview (5s)", cost: "10 credits" },
                { name: "Veo 3.1 High Fidelity (5s)", cost: "20 credits" },
                { name: "Kling 3.0 Action (5s)", cost: "10 credits" }
            ]
        },
        {
            category: "Workflows & Scenarios",
            models: [
                { name: "Storyboard 9-Frame Setup", cost: "5 credits" },
                { name: "UGC Script Narrative Generation", cost: "1 credit" },
                { name: "UGC Scene Single Render", cost: "10 credits" },
                { name: "UGC Full Compilation Production", cost: "20 credits" }
            ]
        },
        {
            category: "Commercial & Forge",
            models: [
                { name: "Product Shoot Context (Single)", cost: "3 credits" },
                { name: "Product Pack (5 Scenes Bundle)", cost: "12 credits" },
                { name: "360 Rotating Turn Showcase", cost: "8 credits" },
                { name: "AI Character Identity Kit", cost: "15 credits" },
                { name: "Movie Matrix Grid Embeddings", cost: "10 credits" }
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
                "399 Credits · Valid 3 Months",
                "Starter Character Creation",
                "2 Concurrent Jobs",
                "Kling 720p Access (5s)",
                "Basic Storyboard builder",
                "Standard Support"
            ],
            icon: Shield,
            color: "from-gray-500/10 to-gray-600/5",
            borderColor: "border-gray-500/20",
            iconColor: "text-gray-400",
            buttonText: "Get Started",
            popular: false,
            link: "https://rzp.io/rzp/vPs9Yvib"
        },
        {
            name: "Influencer",
            monthlyPrice: 1999,
            yearlyPrice: 1599,
            period: "/3mo",
            yearlyText: "One-time · No renewal",
            description: "The choice for professional creators and growing visual brands.",
            image: "/pricing/influencer.png",
            features: [
                "1,999 Credits · Valid 3 Months",
                "3 AI Character Creations",
                "4 Concurrent Jobs",
                "32 Kling 720p Videos (5s) OR",
                "21 Veo 1080p Videos (8s)",
                "Batch Mode Support",
                "Priority Support"
            ],
            icon: Zap,
            color: "from-blue-500/10 to-blue-600/5",
            borderColor: "border-blue-500/20",
            iconColor: "text-blue-400",
            buttonText: "Start Exploring",
            popular: false,
            link: "https://rzp.io/rzp/xCEhb7Nl"
        },
        {
            name: "Director",
            monthlyPrice: 4999,
            yearlyPrice: 3999,
            period: "/6mo",
            yearlyText: "One-time · No renewal",
            description: "Maximum cinematic horsepower for Agencies and Power Users.",
            image: "/pricing/director.png",
            features: [
                "4,999 Credits · Valid 6 Months",
                "10 AI Character Creations",
                "8 Concurrent Jobs",
                "80 Kling 720p Videos (5s) OR",
                "53 Veo 1080p Videos (8s)",
                "Unlimited Nano Banana Images",
                "4K Export Support",
                "24/7 Dedicated Support"
            ],
            icon: Sparkles,
            color: "from-[#D4FF00]/10 to-[#D4FF00]/5",
            borderColor: "border-[#D4FF00]/40",
            iconColor: "text-[#D4FF00]",
            buttonText: "Go Professional",
            popular: true,
            link: "https://rzp.io/rzp/xjMjFsMo"
        },
        {
            name: "Enterprise",
            monthlyPrice: 9999,
            yearlyPrice: 7999,
            period: "/1yr",
            yearlyText: "One-time · No renewal",
            description: "Enterprise scalability for Commercial workflows and large volumes.",
            image: "/pricing/enterprise.png",
            features: [
                "9,999 Credits · Valid 1 Year",
                "Unlimited AI Characters",
                "16 Concurrent Jobs",
                "161 Kling 720p Videos (5s) OR",
                "107 Veo 1080p Videos (8s)",
                "Multi-node Sync renders",
                "Raw Source Assets exports",
                "Custom visual model training"
            ],
            icon: Coins,
            color: "from-purple-500/10 to-purple-600/5",
            borderColor: "border-purple-500/20",
            iconColor: "text-purple-400",
            buttonText: "Get Enterprise",
            popular: false,
            link: "https://rzp.io/rzp/UCU5bwCC"
        }
    ];

    return (
        <div className="h-full bg-[#030303] text-white p-4 md:p-6 flex flex-col relative overflow-y-auto font-sans pb-12 custom-scrollbar">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-[#D4FF00]/15 to-transparent blur-[120px] -z-10 opacity-70" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] -z-10" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -z-10" />

            {/* Premium Header Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0 bg-white/[0.02] border border-white/5 backdrop-blur-md p-4 md:p-2 rounded-xl mb-3 shrink-0 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.01] to-transparent animate-shimmer" />
                <div className="flex items-center gap-4">
                    <div className="px-3 py-1 bg-gradient-to-r from-[#D4FF00]/10 to-transparent border border-[#D4FF00]/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-[#D4FF00] flex items-center gap-1.5 shadow-[0_0_20px_rgba(212,255,0,0.1)]">
                        <Zap size={12} strokeWidth={2.5} className="animate-pulse" /> Production Fuel
                    </div>
                    <h1 className="text-2xl font-black italic uppercase tracking-tight text-white/90">
                        Elevate <span className="text-[#D4FF00]">Production</span>
                    </h1>
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
                                            {feature}
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
                        { price: 300, credits: "300 Credits", desc: "Starter Boost", link: "https://rzp.io/rzp/3EWkwPb3" },
                        { price: 900, credits: "1000 Credits", desc: "Popular top-up", link: "https://rzp.io/rzp/G31rlOC", popular: true },
                        { price: 2000, credits: "2500 Credits", desc: "Agency bundle", link: "https://rzp.io/rzp/3jqnUqY" }
                    ].map((topup) => (
                        <div key={topup.price} className={cn(
                            "min-w-[280px] md:min-w-0 p-4 rounded-xl border flex items-center justify-between transition-all duration-300 snap-center",
                            topup.popular ? "bg-[#D4FF00]/[0.05] border-[#D4FF00]/40 shadow-[0_0_20px_rgba(212,255,0,0.05)]" : "bg-white/[0.02] border-white/5"
                        )}>
                            <div className="flex flex-col gap-0.5">
                                <div className="text-white font-black italic text-lg md:text-base tracking-tight leading-none">₹{topup.price}</div>
                                <div className="text-[#D4FF00] font-black text-xs tracking-tight uppercase">{topup.credits}</div>
                                <div className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">{topup.desc}</div>
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
