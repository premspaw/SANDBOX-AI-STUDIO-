import React, { useState } from 'react';
import { Bot, Camera, Users, FolderOpen, Settings, MoreHorizontal, X, LogOut, Shield, Zap, Sparkles, Clapperboard, Video, Megaphone } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useShorts } from '../../hooks/useShorts';
import { useAppStore } from '../../store';

export function MobileNav({ activeTab, setActiveTab }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { shorts } = useShorts();
    const { runtimeMode, userProfile } = useAppStore();
    const isAdmin = userProfile?.role === 'admin';

    const mainNavItems = [
        { id: 'creative-studio', label: 'Studio', icon: Video },
        { id: 'marketing', label: 'Marketing', icon: Megaphone },
        { id: 'ugc', label: 'UGC', icon: Sparkles },
        ...(isAdmin ? [{ id: 'influencer', label: 'Influencer', icon: Users }] : []),
        { id: 'prompt', label: 'Prompt', icon: Bot },
    ];

    const moreNavItems = [
        ...(isAdmin ? [{ id: 'directors-cut', label: "Director's Cut", icon: Clapperboard }] : []),
        { id: 'assets', label: 'Assets', icon: FolderOpen },
        { id: 'creator', label: 'Creator Engine', icon: Camera },
        { id: 'settings', label: 'Settings', icon: Settings },
        ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: Shield, color: 'text-red-500' }] : []),
    ];

    return (
        <>
            {/* Bottom Nav Bar */}
            <div className="md:hidden fixed bottom-0 inset-x-0 z-[100] bg-black/80 backdrop-blur-xl border-t border-white/10 px-2 py-1 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-around">
                    {mainNavItems.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={cn(
                                    "flex flex-col items-center gap-1 p-2 transition-all duration-300",
                                    isActive ? "text-[#bef264]" : "text-white/40"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5", isActive && "scale-110")} />
                                <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="mobileNavActive"
                                        className="absolute -bottom-1 w-1 h-1 bg-[#bef264] rounded-full"
                                    />
                                )}
                            </button>
                        );
                    })}
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className={cn(
                            "flex flex-col items-center gap-1 p-2 text-white/40",
                            isMenuOpen && "text-[#bef264]"
                        )}
                    >
                        <MoreHorizontal className="w-5 h-5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">More</span>
                    </button>
                </div>
            </div>

            {/* Slide-up Full Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: '100%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: '100%' }}
                        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                        className="fixed inset-0 z-[110] bg-black flex flex-col pt-safe"
                    >
                        <div className="p-6 flex items-center justify-between border-b border-white/5 bg-white/5">
                            <div>
                                <h2 className="text-xl font-black italic text-[#bef264] uppercase tracking-tighter">ZEROLENS</h2>
                                <p className="text-[8px] text-white/20 font-bold uppercase tracking-[0.3em]">Neural_Creative_Suite</p>
                            </div>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Shorts Status */}
                            <div className="bg-[#bef264]/10 border border-[#bef264]/30 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-[#bef264]/20 rounded-lg">
                                        <Zap className="text-[#bef264] w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-[#bef264]/60 font-black uppercase tracking-widest">Available Credits</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-black text-[#bef264]">{shorts}</span>
                                            <span className="text-[9px] text-[#bef264]/40 font-bold uppercase tracking-[0.2em] mt-1">Shorts</span>
                                        </div>
                                    </div>
                                </div>
                                <button className="px-4 py-2 bg-[#bef264] text-black text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg">
                                    + Top Up
                                </button>
                            </div>

                            {/* Extended Menu Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                {moreNavItems.map((item) => {
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                setActiveTab(item.id);
                                                setIsMenuOpen(false);
                                            }}
                                            className={cn(
                                                "flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border transition-all duration-300",
                                                isActive
                                                    ? "bg-[#bef264]/10 border-[#bef264]/30 text-[#bef264]"
                                                    : "bg-white/5 border-white/5 text-white/40"
                                            )}
                                        >
                                            <item.icon className={cn("w-8 h-8", isActive ? "text-[#bef264]" : item.color || "text-white/20")} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* System Vitals */}
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-4">
                                <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">System Vitals</h3>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-white/40 uppercase font-black">Runtime Mode</span>
                                    <div className={cn(
                                        "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase",
                                        runtimeMode === 'SERVER' ? "bg-lime-500/10 text-lime-400" : "bg-orange-500/10 text-orange-400"
                                    )}>
                                        {runtimeMode}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/5 bg-white/5">
                            <button className="w-full py-4 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                                <LogOut size={16} />
                                Terminate Session
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
