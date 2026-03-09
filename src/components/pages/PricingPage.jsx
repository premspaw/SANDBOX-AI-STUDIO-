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
    const { fetchUserProfile } = useAppStore();


    const modelPricing = [
        {
            category: "Video Generation",
            models: [
                { name: "Kling 3.0 (720p/1080p)", cost: "6-7 credits/5s" },
                { name: "Veo 3.1 (720p/1080p)", cost: "3-6 credits/5s" },
                { name: "Veo 3.1 4K", cost: "12 credits/5s" },
                { name: "Kling Omni 3 Image Ref", cost: "5 credits/5s" }
            ]
        }
    ];

    const plans = [
        {
            name: "Influencer",
            monthlyPrice: 299,
            yearlyPrice: 239,
            description: "Perfect for exploring AI cinematography for the first time.",
            features: [
                "150 Main Credits / month",
                "1 AI Character Creation",
                "2 Concurrent Jobs",
                "25 Kling 720p Videos (5s) OR",
                "2 Veo 1080p Videos (8s)",
                "25,000 Nano Banana Images",
                "720p Export Resolution",
                "Standard Support"
            ],
            icon: Shield,
            color: "from-blue-500/10 to-blue-600/5",
            borderColor: "border-blue-500/20",
            iconColor: "text-blue-400",
            buttonText: "Start Exploring",
            popular: false
        },
        {
            name: "Director",
            monthlyPrice: 999,
            yearlyPrice: 799,
            description: "The choice of professional creators and social media influencers.",
            features: [
                "600 Main Credits / month",
                "3 AI Character Creations",
                "4 Concurrent Jobs",
                "100 Kling 720p Videos (5s) OR",
                "7 Veo 1080p Videos (8s)",
                "80,000 Nano Banana Images",
                "1080p Export Resolution",
                "Batch Mode Support",
                "Priority Support"
            ],
            icon: Zap,
            color: "from-[#D4FF00]/10 to-[#D4FF00]/5",
            borderColor: "border-[#D4FF00]/40",
            iconColor: "text-[#D4FF00]",
            buttonText: "Go Professional",
            popular: true
        },
        {
            name: "Business",
            monthlyPrice: 1499,
            yearlyPrice: 1199,
            description: "Maximum power for agencies and power users requiring high volume.",
            features: [
                "1200 Main Credits / month",
                "10 AI Character Creations",
                "8 Concurrent Jobs",
                "200 Kling 720p Videos (5s) OR",
                "15 Veo 1080p Videos (8s)",
                "Unlimited Nano Banana Images",
                "4K Export Resolution",
                "Advanced Batch Processing",
                "24/7 Dedicated Support"
            ],
            icon: Sparkles,
            color: "from-purple-500/10 to-purple-600/5",
            borderColor: "border-purple-500/20",
            iconColor: "text-purple-400",
            buttonText: "Join Elite",
            popular: false
        }
    ];

    return (
        <div className="min-h-screen bg-[#080808] text-white p-8 pb-20 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-[#D4FF00]/10 to-transparent blur-[120px] -z-10 opacity-50" />
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -z-10" />
            <div className="absolute bottom-0 -right-24 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] -z-10" />

            <div className="max-w-6xl mx-auto space-y-12">
                {/* Header */}
                <div className="text-center space-y-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-[#D4FF00]"
                    >
                        <Coins size={12} />
                        Subscription Plans
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl md:text-6xl font-black italic tracking-tighter uppercase leading-[0.9] text-metallic"
                    >
                        Elevate Your Production
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-white/40 max-w-xl mx-auto text-sm font-medium tracking-tight"
                    >
                        Flexible, high-octane plans designed for the next generation of AI cinematographers.
                        Get 50% more value than any other studio platform.
                    </motion.p>
                </div>

                {/* Toggle */}
                <div className="flex justify-center items-center gap-4 py-4">
                    <span className={cn("text-xs font-black uppercase tracking-widest transition-colors", !isYearly ? "text-white" : "text-white/20")}>Monthly</span>
                    <button
                        onClick={() => setIsYearly(!isYearly)}
                        className="relative w-14 h-7 bg-white/5 rounded-full border border-white/10 p-1 flex items-center transition-all hover:border-[#D4FF00]/40 shadow-inner"
                    >
                        <motion.div
                            animate={{ x: isYearly ? 28 : 0 }}
                            className="w-5 h-5 bg-[#D4FF00] rounded-full shadow-[0_0_15px_rgba(212,255,0,0.6)]"
                        />
                    </button>
                    <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-black uppercase tracking-widest transition-colors", isYearly ? "text-white" : "text-white/20")}>Yearly</span>
                        <div className="px-2 py-0.5 bg-[#D4FF00]/10 border border-[#D4FF00]/20 rounded-lg">
                            <span className="text-[9px] font-black text-[#D4FF00] uppercase">Save 20%</span>
                        </div>
                    </div>
                </div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    {plans.map((plan, idx) => {
                        const currentPrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
                        return (
                            <motion.div
                                key={plan.name}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * (idx + 3) }}
                                className={cn(
                                    "relative group flex flex-col p-8 rounded-[2rem] transition-all duration-500 overflow-hidden",
                                    "backdrop-blur-xl border-l-[1px] border-t-[1px]",
                                    plan.popular
                                        ? "bg-white/[0.04] scale-105 border-[#D4FF00]/40 shadow-[0_0_40px_rgba(212,255,0,0.05)]"
                                        : "bg-white/[0.02] hover:bg-white/[0.04] border-white/10 shadow-xl"
                                )}
                            >
                                {plan.popular && (
                                    <div className="absolute top-6 right-6">
                                        <div className="px-3 py-1 bg-[#D4FF00] rounded-full text-[9px] font-black text-black uppercase tracking-wider shadow-[0_0_20px_rgba(212,255,0,0.4)]">
                                            Most Popular
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-6 flex-1">
                                    <div className={cn("inline-flex p-3 rounded-2xl bg-white/5 border border-white/10", plan.iconColor)}>
                                        <plan.icon size={24} />
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter italic text-metallic">{plan.name}</h3>
                                        <p className="text-white/40 text-xs mt-1 leading-relaxed font-bold uppercase tracking-tighter">{plan.description}</p>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-black italic tracking-tighter text-white">₹{currentPrice}</span>
                                            <span className="text-white/20 text-sm font-bold uppercase">/month</span>
                                        </div>
                                        {isYearly && (
                                            <p className="text-[9px] text-[#D4FF00]/60 font-black uppercase tracking-widest">
                                                Billed ₹{(plan.yearlyPrice * 12).toLocaleString()} annually
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-3 pt-6 border-t border-white/10">
                                        {plan.features.map((feature, fIdx) => (
                                            <div key={fIdx} className="flex items-center gap-3 group/feature">
                                                <div className={cn("p-1 rounded-full bg-white/5 border border-white/10", plan.popular ? "text-[#D4FF00]" : "text-white/40")}>
                                                    <Check size={10} strokeWidth={4} />
                                                </div>
                                                <span className="text-xs font-bold text-white/60 group-hover/feature:text-white transition-colors">
                                                    {feature}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handlePurchase(plan.name)}
                                    disabled={loadingPlan !== null}
                                    className={cn(
                                        "mt-12 w-full py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group/btn",
                                        plan.popular
                                            ? "bg-[#D4FF00] text-black hover:shadow-[0_0_40px_rgba(212,255,0,0.4)]"
                                            : "bg-white/10 text-white hover:bg-white/20 border border-white/10",
                                        loadingPlan === plan.name && "opacity-70 cursor-wait"
                                    )}>
                                    {loadingPlan === plan.name ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <>
                                            {plan.buttonText}
                                            <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>

                            </motion.div>
                        );
                    })}
                </div>

                {/* Model Pricing Detail Section */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="space-y-8 pt-12"
                >
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-metallic">Model Credit Costs</h2>
                        <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-black">Detailed breakdown of AI computation costs</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {modelPricing.map((section, sidx) => (
                            <div key={sidx} className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/10 backdrop-blur-md space-y-6 shadow-2xl">
                                <h3 className="text-[11px] font-black text-[#D4FF00] uppercase tracking-[0.3em] pl-2 border-l-2 border-[#D4FF00]">{section.category}</h3>
                                <div className="space-y-4">
                                    {section.models.map((model, midx) => (
                                        <div key={midx} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0 group/row">
                                            <span className="text-[11px] font-bold text-white/40 group-hover/row:text-white transition-colors uppercase italic tracking-tight">{model.name}</span>
                                            <span className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-black text-[#D4FF00] border border-[#D4FF00]/10 uppercase tracking-tighter shadow-[0_0_15px_rgba(212,255,0,0.05)]">{model.cost}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* FAQ / Trust Segment */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/10 backdrop-blur-3xl flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4FF00]/5 rounded-full blur-[80px] -z-10" />
                    <div className="space-y-4 text-center md:text-left relative z-10">
                        <div className="space-y-1">
                            <h4 className="text-2xl font-black uppercase italic tracking-tighter text-metallic">Need a custom plan?</h4>
                            <p className="text-white/40 text-[11px] font-bold uppercase tracking-tighter max-w-md">
                                For movie studios, advertising agencies, and corporate workflows, we offer tailored pipeline integration.
                            </p>
                        </div>
                    </div>
                    <button className="px-10 py-5 bg-white text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-[#D4FF00] hover:text-black transition-all shadow-xl hover:shadow-[0_0_30px_rgba(212,255,0,0.3)] whitespace-nowrap relative z-10">
                        Contact Enterprise
                    </button>
                </motion.div>

                {/* Terms and Conditions Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.0 }}
                    className="pt-12 text-center space-y-4 border-t border-white/5"
                >
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest max-w-3xl mx-auto leading-relaxed">
                        Terms & Conditions: Prices are listed in INR (₹). Yearly plans are billed annually and include a 20% discount.
                        "Batch Mode Support" indicates tasks may be processed over a 24-hour window to ensure optimal pricing.
                        Unused monthly credits do not roll over to the next billing cycle.
                        Model credit costs are subject to change based on underlying provider pricing (Google Vertex AI, Higgsfield).
                    </p>
                    <div className="flex justify-center items-center gap-6 pt-4">
                        <a href="#" className="text-[10px] text-white/20 hover:text-white/60 font-bold uppercase tracking-[0.2em] transition-colors">Privacy Policy</a>
                        <span className="w-1 h-1 rounded-full bg-white/10" />
                        <a href="#" className="text-[10px] text-white/20 hover:text-white/60 font-bold uppercase tracking-[0.2em] transition-colors">Terms of Service</a>
                        <span className="w-1 h-1 rounded-full bg-white/10" />
                        <a href="#" className="text-[10px] text-white/20 hover:text-white/60 font-bold uppercase tracking-[0.2em] transition-colors">Billing Policy</a>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default PricingPage;
