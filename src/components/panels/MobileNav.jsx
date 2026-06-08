import React from 'react';
import { 
  FilmSlate, Megaphone, UsersThree, GearSix, FolderOpen 
} from '@phosphor-icons/react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

export function MobileNav({ activeTab, setActiveTab }) {
    const mainNavItems = [
        { id: 'ugc', label: 'UGC', icon: UsersThree, color: 'text-amber-400', glow: 'rgba(251,191,36,0.15)' },
        { id: 'cinematic-studio', label: 'Cinema', icon: FilmSlate, color: 'text-fuchsia-400', glow: 'rgba(232,121,249,0.2)' },
        { id: 'marketing', label: 'Marketing', icon: Megaphone, color: 'text-rose-400', glow: 'rgba(251,113,133,0.15)' },
        { id: 'assets', label: 'Assets', icon: FolderOpen, color: 'text-[#AADD00]', glow: 'rgba(170,221,0,0.15)' },
        { id: 'settings', label: 'Settings', icon: GearSix, color: 'text-neutral-300', glow: 'rgba(163,163,163,0.2)' },
    ];

    return (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-[100] bg-black/60 backdrop-blur-2xl border-t border-white/10 px-2 py-1 pb-safe shadow-[0_-10px_35px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-around relative">
                {mainNavItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className="flex flex-col items-center justify-center gap-1.5 p-2 transition-all duration-300 relative select-none cursor-pointer group"
                        >
                            <div className={cn(
                                "p-1 rounded-xl transition-all duration-300 relative",
                                isActive ? cn("bg-white/5", item.color) : "text-white/35 group-hover:text-white"
                            )}
                                 style={isActive ? { boxShadow: `0 0 20px ${item.glow}` } : {}}
                            >
                                <item.icon 
                                    weight="duotone"
                                    className={cn("w-5 h-5 transition-transform duration-300", isActive && "scale-110")} 
                                />
                            </div>
                            <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest transition-all duration-300",
                                isActive ? "text-white" : "text-white/35 group-hover:text-white/60"
                            )}>
                                {item.label}
                            </span>
                            {isActive && (
                                <motion.div
                                    layoutId="mobileNavActiveDot"
                                    className="absolute bottom-0 w-1 h-1 bg-[#D4FF00] rounded-full shadow-[0_0_8px_#D4FF00]"
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
