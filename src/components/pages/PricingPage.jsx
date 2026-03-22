import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Shield, Zap, Sparkles, Coins, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import { getApiUrl } from '../../config/apiConfig';

const PricingPage = () => {
    const [isYearly, setIsYearly] = useState(true);
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
            description: "An affordable kickstart with a 6-Month setup value layout!",
            features: [
                "250 Main Credits / month",
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
            monthlyPrice: 799,
            yearlyPrice: 639,
            description: "The choice for professional creators and growing visual brands.",
            features: [
                "600 Main Credits / month",
                "3 AI Character Creations",
                "4 Concurrent Jobs",
                "100 Kling 720p Videos (5s) OR",
                "5 Veo 1080p Videos (8s)",
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
            monthlyPrice: 2500,
            yearlyPrice: 1999,
            description: "Maximum cinematic horsepower for Agencies and Power Users.",
            features: [
                "2000 Main Credits / month",
                "10 AI Character Creations",
                "8 Concurrent Jobs",
                "200 Kling 720p Videos (5s) OR",
                "18 Veo 1080p Videos (8s)",
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
            monthlyPrice: 5000,
            yearlyPrice: 3999,
            description: "Enterprise scalability for Commercial workflows and large volumes.",
            features: [
                "5000 Main Credits / month",
                "Unlimited AI Characters",
                "16 Concurrent Jobs",
                "500 Kling 720p Videos (5s) OR",
                "40 Veo 1080p Videos (8s)",
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
        <div className="min-h-screen bg-[#030303] text-white p-6 flex flex-col relative overflow-y-auto font-sans pb-12">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-[#D4FF00]/15 to-transparent blur-[120px] -z-10 opacity-70" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] -z-10" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -z-10" />

            {/* Premium Header Bar */}
            <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 backdrop-blur-md p-2 rounded-xl mb-3 shrink-0 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.01] to-transparent animate-shimmer" />
                <div className="flex items-center gap-4">
                    <div className="px-3 py-1 bg-gradient-to-r from-[#D4FF00]/10 to-transparent border border-[#D4FF00]/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-[#D4FF00] flex items-center gap-1.5 shadow-[0_0_20px_rgba(212,255,0,0.1)]">
                        <Zap size={12} strokeWidth={2.5} className="animate-pulse" /> Production Fuel
                    </div>
                    <h1 className="text-2xl font-black italic uppercase tracking-tight text-white/90">
                        Elevate <span className="text-[#D4FF00]">Production</span>
                    </h1>
                </div>

                {/* Toggle - Premium */}
                <div className="flex items-center gap-3">
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest transition-colors duration-300", !isYearly ? "text-white" : "text-white/30")}>Monthly</span>
                    <button onClick={() => setIsYearly(!isYearly)} className="relative w-12 h-6 bg-white/5 rounded-full border border-white/10 p-0.5 flex items-center transition-all duration-500 hover:border-[#D4FF00]/50 shadow-inner group">
                        <motion.div animate={{ x: isYearly ? 24 : 0 }} className="w-5 h-5 bg-[#D4FF00] rounded-full shadow-[0_0_15px_rgba(212,255,0,0.8)] flex items-center justify-center group-hover:scale-105 transition-transform" />
                    </button>
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest transition-colors duration-300", isYearly ? "text-white" : "text-white/30")}>Yearly</span>
                    <div className="px-2 py-0.5 bg-[#D4FF00]/20 border border-[#D4FF00]/40 rounded-lg text-[9px] font-black text-[#D4FF00] uppercase tracking-wider animate-pulse shadow-[0_0_15px_rgba(212,255,0,0.1)]">Save 20%</div>
                </div>
            </div>

            {/* Main Content Layout Grid - Stagger Layouts */}
            <div className="flex-1 grid grid-cols-4 gap-4 overflow-hidden pb-2">
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
                                "backdrop-blur-xl border flex-1 h-full flex flex-col justify-between",
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

                            <div className="space-y-1 mb-5 shrink-0 pb-4 border-b border-white/5">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black italic tracking-tighter text-white">₹{currentPrice}</span>
                                    <span className="text-white/40 text-xs font-bold uppercase">/mo</span>
                                </div>
                                {isYearly && <p className="text-[9px] text-[#D4FF00]/80 font-bold uppercase tracking-widest leading-none">Billed ₹{(plan.yearlyPrice * 12).toLocaleString()} annually</p>}
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
            <div className="mt-5 bg-white/[0.01] border border-white/5 rounded-2xl p-4 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-2 mb-3">
                    <Coins size={16} className="text-[#D4FF00]" />
                    <h2 className="text-xs font-black uppercase tracking-widest text-white/80">Need a Quick Top-Up? <span className="text-white/30">(One-time Credits)</span></h2>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { price: 300, credits: "300 Credits", desc: "Starter Boost", link: "https://rzp.io/rzp/3EWkwPb3" },
                        { price: 900, credits: "1000 Credits", desc: "Popular top-up", link: "https://rzp.io/rzp/G31rlOC", popular: true },
                        { price: 2000, credits: "2500 Credits", desc: "Agency bundle", link: "https://rzp.io/rzp/3jqnUqY" }
                    ].map((topup) => (
                        <div key={topup.price} className={cn(
                            "p-3 rounded-xl border flex items-center justify-between transition-all duration-300 hover:scale-[1.02]",
                            topup.popular ? "bg-[#D4FF00]/[0.03] border-[#D4FF00]/30" : "bg-white/[0.02] border-white/5"
                        )}>
                            <div>
                                <div className="text-white font-black italic text-base tracking-tight">₹{topup.price}</div>
                                <div className="text-[10px] text-zinc-500 font-medium">{topup.desc}</div>
                            </div>
                            
                            <div className="text-right">
                                <div className="text-[#D4FF00] font-black text-sm tracking-tight">{topup.credits}</div>
                                <button 
                                    onClick={() => {
                                        const userIdLink = userProfile?.id ? `?client_id=${userProfile.id}` : "";
                                        window.open(`${topup.link}${userIdLink}`, "_blank");
                                    }}
                                    className={cn(
                                        "text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-md mt-1 transition-all",
                                        topup.popular ? "bg-[#D4FF00] text-black shadow-[0_0_10px_rgba(212,255,0,0.2)]" : "bg-white/10 text-white hover:bg-white/20"
                                    )}
                                >
                                    Buy Now
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PricingPage;
