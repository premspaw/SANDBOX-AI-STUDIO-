import { Robot, FilmSlate, GearSix, CaretLeft, CaretRight, FolderOpen, Users, ShieldCheck, VideoCamera, Coins, SquaresFour, Aperture, Megaphone, UserFocus, MicrophoneStage, UsersThree, ChatCircle, Microphone } from '@phosphor-icons/react'

import logo from '../../assets/acs-icon.svg'
import BrandLogo from '../common/BrandLogo'
import { cn } from '../../lib/utils'
import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '../../store'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useShorts } from '../../hooks/useShorts'

function SidebarNavItem({ item, activeTab, setActiveTab, isCollapsed, mouseY }) {
    const ref = useRef(null);
    const isCollapsedRef = useRef(isCollapsed);
    useEffect(() => {
        isCollapsedRef.current = isCollapsed;
    }, [isCollapsed]);

    const scaleSync = useTransform(mouseY, (val) => {
        if (!ref.current || val === Infinity) return 1;
        const bounds = ref.current.getBoundingClientRect();
        const center = bounds.y + bounds.height / 2;
        const dist = Math.abs(val - center);
        const t = Math.max(0, 1 - dist / 100); // 100px falloff range
        const power = 1 - (1 - t) ** 2;
        return 1 + (isCollapsedRef.current ? 0.75 : 0.22) * power;
    });

    const scale = useSpring(scaleSync, { mass: 0.1, stiffness: 200, damping: 20 });

    const zIndexSync = useTransform(mouseY, (val) => {
        if (!ref.current || val === Infinity) return 1;
        const bounds = ref.current.getBoundingClientRect();
        const center = bounds.y + bounds.height / 2;
        const dist = Math.abs(val - center);
        return dist < 50 ? 20 : 1;
    });
    const zIndex = useSpring(zIndexSync, { mass: 0.1, stiffness: 400, damping: 30 });
    const zIndexRounded = useTransform(zIndex, Math.round);

    const isActive = activeTab === item.id;

    return (
        <motion.button
            ref={ref}
            whileTap={{ scale: 0.95 }}
            style={{
                scale,
                zIndex: zIndexRounded,
                transformOrigin: isCollapsed ? 'center' : 'left center',
                position: 'relative'
            }}
            onClick={() => setActiveTab(item.id)}
            className={cn(
                "w-full flex items-center py-2.5 rounded-xl border-[1px] border-transparent group/navitem overflow-visible relative transition-[background-color,border-color,color,opacity] duration-300",
                isActive
                    ? `bg-white/5 border-white/20 ${item.glow}`
                    : "text-white/40 hover:text-white",
                isCollapsed ? "justify-center px-0 gap-0" : "px-2 gap-2"
            )}
            title={isCollapsed ? item.label : ''}
        >
            {/* Remove colored overlay as it is not aligned correctly */}

            <item.icon 
                weight="duotone"
                className={cn(
                    "w-4.5 h-4.5 min-w-[18px] transition-all duration-300 z-10 shrink-0",
                    isActive ? item.color : `group-hover/navitem:rotate-12 ${item.hoverColor}`
                )} 
            />

            <span className={cn(
                "text-[11px] font-bold uppercase tracking-wider transition-all z-10 whitespace-nowrap",
                isActive ? item.color : item.hoverColor,
                isCollapsed
                    ? "opacity-0 -translate-x-2 pointer-events-none duration-150 delay-0 w-0 overflow-hidden"
                    : "opacity-100 translate-x-0 duration-200 delay-[220ms] ml-2"
            )}>
                {item.label}
            </span>
        </motion.button>
    );
}

export function Sidebar({ activeTab, setActiveTab, isCollapsed, toggleCollapse }) {
    const mouseY = useMotionValue(Infinity);
    const { runtimeMode, apiKey, setApiKey, checkRuntimeMode, userProfile } = useAppStore();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const isAdmin = userProfile?.role === 'admin';

    // Auto-hide sidebar on all pages after 5 seconds
    useEffect(() => {
        checkRuntimeMode();
        if (!isCollapsed) {
            const timer = setTimeout(() => {
                toggleCollapse();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [activeTab, isCollapsed, toggleCollapse]);

    const navItems = [
        { id: 'avatar', label: 'Avatar Studio', icon: UserFocus, color: 'text-emerald-400', bgColor: 'bg-emerald-400', hoverColor: 'group-hover/navitem:text-emerald-400', glow: 'shadow-[0_0_15px_rgba(52,211,153,0.1)]' },
        { id: 'living-avatar', label: 'Living Avatar', icon: ChatCircle, color: 'text-[#00FFFF]', bgColor: 'bg-[#00FFFF]', hoverColor: 'group-hover/navitem:text-[#00FFFF]', glow: 'shadow-[0_0_15px_rgba(0,255,255,0.15)]' },
        { id: 'marketing', label: 'Marketing', icon: Megaphone, color: 'text-rose-400', bgColor: 'bg-rose-400', hoverColor: 'group-hover/navitem:text-rose-400', glow: 'shadow-[0_0_15px_rgba(251,113,133,0.1)]' },
        { id: 'cinematic-studio', label: 'Cinema Studio', icon: FilmSlate, color: 'text-fuchsia-400', bgColor: 'bg-fuchsia-400', hoverColor: 'group-hover/navitem:text-fuchsia-400', glow: 'shadow-[0_0_15px_rgba(232,121,249,0.15)]' },
        { id: 'carousel', label: 'Carousel Studio', icon: SquaresFour, color: 'text-pink-400', bgColor: 'bg-pink-400', hoverColor: 'group-hover/navitem:text-pink-400', glow: 'shadow-[0_0_15px_rgba(236,72,153,0.15)]' },
        { id: 'ugc', label: 'UGC Engine', icon: UsersThree, color: 'text-amber-400', bgColor: 'bg-amber-400', hoverColor: 'group-hover/navitem:text-amber-400', glow: 'shadow-[0_0_15px_rgba(251,191,36,0.1)]' },
        { id: 'brand-voice', label: 'Brand Voice', icon: MicrophoneStage, color: 'text-[#D4FF00]', bgColor: 'bg-[#D4FF00]', hoverColor: 'group-hover/navitem:text-[#D4FF00]', glow: 'shadow-[0_0_15px_rgba(212,255,0,0.15)]' },
        { id: 'yourvoice', label: 'Your Voice', icon: Microphone, color: 'text-[#c8f135]', bgColor: 'bg-[#c8f135]', hoverColor: 'group-hover/navitem:text-[#c8f135]', glow: 'shadow-[0_0_15px_rgba(200,241,53,0.3)] sidebar-glow-pulse' },
        { id: 'assets', label: 'Assets Library', icon: FolderOpen, color: 'text-[#AADD00]', bgColor: 'bg-[#AADD00]', hoverColor: 'group-hover/navitem:text-[#AADD00]', glow: 'shadow-[0_0_15px_rgba(96,165,250,0.1)]' },
        { id: 'settings', label: 'Settings', icon: GearSix, color: 'text-neutral-300', bgColor: 'bg-neutral-300', hoverColor: 'group-hover/navitem:text-neutral-300', glow: 'shadow-[0_0_15px_rgba(163,163,163,0.4)]' },
        { id: 'agent', label: 'ZeroLens AI', icon: Robot, color: 'text-violet-400', bgColor: 'bg-violet-400', hoverColor: 'group-hover/navitem:text-violet-400', glow: 'shadow-[0_0_15px_rgba(167,139,250,0.2)]' },
        { id: 'directors-cut', label: "Director's Cut", icon: FilmSlate, color: 'text-cyan-400', bgColor: 'bg-cyan-400', hoverColor: 'group-hover/navitem:text-cyan-400', glow: 'shadow-[0_0_15px_rgba(34,211,238,0.1)]' },
        { id: 'admin', label: 'Admin', icon: ShieldCheck, color: 'text-red-500', bgColor: 'bg-red-500', hoverColor: 'group-hover/navitem:text-red-500', glow: 'shadow-[0_0_15px_rgba(248,113,113,0.1)]' },
    ]

    const { shorts, refresh } = useShorts()
    const fetchUserProfile = useAppStore(state => state.fetchUserProfile)

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                await fetchUserProfile(user.id)
                refresh()
            }
        }
        checkUser()
    }, [])

    return (
        <aside
            onMouseMove={(e) => mouseY.set(e.clientY)}
            onMouseLeave={() => mouseY.set(Infinity)}
            className={cn(
                "border-r border-white/10 surface-glass flex flex-col z-50 relative h-full min-h-0 overflow-hidden transition-[width] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
                isCollapsed ? "w-12" : "w-48"
            )}>

            {/* Header — shrink-0 so it never compresses */}
            <div className={cn(
                "pt-1.5 pb-1 px-4 flex items-center transition-all duration-300 shrink-0",
                isCollapsed ? "justify-center" : "justify-between"
            )}>
                <button onClick={() => setActiveTab('home')} className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none group">
                    <BrandLogo
                        size={isCollapsed ? 28 : 42}
                        className={cn("transition-all duration-300 drop-shadow-[0_0_12px_rgba(212,255,0,0.4)]", isCollapsed ? "w-7 h-7" : "w-11 h-11")}
                    />

                    <div className={cn(
                        "flex flex-col items-start mt-1 transition-all overflow-hidden",
                        isCollapsed
                            ? "opacity-0 w-0 -translate-x-2 duration-150 delay-0"
                            : "opacity-100 w-auto ml-2 translate-x-0 duration-200 delay-[220ms]"
                    )}>
                        <h1 className="text-[18px] font-black text-metallic tracking-tighter uppercase italic leading-none whitespace-nowrap">
                            ZEROLENS
                        </h1>
                        <p className="text-[7.5px] text-white/25 font-semibold mt-0.5 tracking-wide whitespace-nowrap">Direct without a camera.</p>
                    </div>
                </button>
            </div>

            {/* Nav — flex-1 + min-h-0 lets it scroll when content overflows */}
            <nav
                className="flex-1 min-h-0 px-2 space-y-2 relative overflow-y-auto overflow-x-hidden custom-scrollbar"
                onMouseLeave={() => mouseY.set(Infinity)}
            >
                {navItems.map((item) => (
                    <SidebarNavItem
                        key={item.id}
                        item={item}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        isCollapsed={isCollapsed}
                        mouseY={mouseY}
                    />
                ))}
            </nav>

            {/* Footer — shrink-0 so it never compresses or disappears */}
            <div className={cn("border-t border-border space-y-1 shrink-0", isCollapsed ? "p-1" : "p-3")}>
                <button
                    onClick={toggleCollapse}
                    className={cn(
                        "w-full relative flex items-center gap-2 px-3 py-2 text-[11px] text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg transition-colors justify-center min-h-[36px]",
                        isCollapsed && "sidebar-glow-pulse border border-[#c8f135]/40 text-[#c8f135]"
                    )}
                >
                    <CaretRight weight="bold" className={cn(
                        "w-5 h-5 absolute transition-all duration-300",
                        isCollapsed ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-0 rotate-180"
                    )} />

                    <div className={cn(
                        "flex items-center gap-2 overflow-hidden transition-all",
                        isCollapsed
                            ? "opacity-0 w-0 -translate-x-2 duration-150 delay-0"
                            : "opacity-100 w-full translate-x-0 duration-200 delay-[220ms]"
                    )}>
                        <CaretLeft weight="bold" className="w-5 h-5 shrink-0" />
                        <span className="font-bold uppercase tracking-wider whitespace-nowrap">Collapse</span>
                    </div>
                </button>

                <div className={cn("space-y-2", isCollapsed ? "px-0.5 py-1" : "px-3 py-2")}>
                    <div className={cn(
                        "flex items-center gap-2 bg-[#D4FF00]/10 border border-[#D4FF00]/30 rounded-xl transition-all h-9 px-3",
                        isCollapsed ? "justify-center" : "justify-between"
                    )}>
                        <div className="flex items-center gap-2 shrink-0">
                            <Coins weight="duotone" className="w-4 h-4 text-[#D4FF00]" />
                            <div className={cn(
                                "flex items-center gap-1.5 transition-all overflow-hidden",
                                isCollapsed
                                    ? "opacity-0 w-0 -translate-x-2 duration-150 delay-0"
                                    : "opacity-100 w-auto translate-x-0 duration-200 delay-[220ms]"
                            )}>
                                <span className="text-[13px] font-black text-[#D4FF00]">{shorts}</span>
                                <span className="text-[9px] text-[#555] font-bold tracking-widest mt-0.5">SHORTS</span>
                            </div>
                        </div>

                        {!isCollapsed && (
                            <button
                                onClick={() => { }}
                                className="text-[8px] font-bold text-[#D4FF00] hover:text-white transition-all duration-200 delay-[250ms] whitespace-nowrap"
                            >
                                + TOP UP
                            </button>
                        )}
                    </div>




                </div>
            </div>
        </aside>
    )
}
