import { Robot, FilmSlate, GearSix, CaretLeft, CaretRight, FolderOpen, Users, ShieldCheck, VideoCamera, Coins, SquaresFour, Aperture, Megaphone, UserFocus, MicrophoneStage, UsersThree, ChatCircle, Microphone, Palette, Cpu, Kanban } from '@phosphor-icons/react'

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
            onClick={() => item.onClick ? item.onClick() : setActiveTab(item.id)}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, isCollapsed, toggleCollapse, checkRuntimeMode]);

    const navItems = [
        { id: 'avatar', label: 'Avatar Studio', icon: UserFocus, color: 'text-emerald-400', bgColor: 'bg-emerald-400', hoverColor: 'group-hover/navitem:text-emerald-400', glow: 'shadow-[0_0_15px_rgba(52,211,153,0.1)]' },
        { id: 'living-avatar', label: 'Living Avatar', icon: ChatCircle, color: 'text-[#00FFFF]', bgColor: 'bg-[#00FFFF]', hoverColor: 'group-hover/navitem:text-[#00FFFF]', glow: 'shadow-[0_0_15px_rgba(0,255,255,0.15)]' },
        { id: 'marketing', label: 'Marketing', icon: Megaphone, color: 'text-rose-400', bgColor: 'bg-rose-400', hoverColor: 'group-hover/navitem:text-rose-400', glow: 'shadow-[0_0_15px_rgba(251,113,133,0.1)]' },
        { id: 'cinematic-studio', label: 'Cinema Studio', icon: FilmSlate, color: 'text-fuchsia-400', bgColor: 'bg-fuchsia-400', hoverColor: 'group-hover/navitem:text-fuchsia-400', glow: 'shadow-[0_0_15px_rgba(232,121,249,0.15)]' },
        { id: 'studio', label: 'Studio', icon: VideoCamera, color: 'text-violet-400', bgColor: 'bg-violet-400', hoverColor: 'group-hover/navitem:text-violet-400', glow: 'shadow-[0_0_15px_rgba(167,139,250,0.25)]' },
        { id: 'carousel', label: 'Carousel Studio', icon: SquaresFour, color: 'text-pink-400', bgColor: 'bg-pink-400', hoverColor: 'group-hover/navitem:text-pink-400', glow: 'shadow-[0_0_15px_rgba(236,72,153,0.15)]' },
        { id: 'ugc', label: 'UGC Engine', icon: UsersThree, color: 'text-amber-400', bgColor: 'bg-amber-400', hoverColor: 'group-hover/navitem:text-amber-400', glow: 'shadow-[0_0_15px_rgba(251,191,36,0.1)]' },
        { id: 'storyboard', label: 'Storyboard', icon: Kanban, color: 'text-amber-400', bgColor: 'bg-amber-400', hoverColor: 'group-hover/navitem:text-amber-400', glow: 'shadow-[0_0_15px_rgba(251,191,36,0.25)]' },
        { id: 'mcp-connection', label: 'MCP Connection', icon: Cpu, color: 'text-[#c8f135]', bgColor: 'bg-[#c8f135]', hoverColor: 'group-hover/navitem:text-[#c8f135]', glow: 'shadow-[0_0_15px_rgba(200,241,53,0.25)]' },
        { id: 'brand-voice', label: 'Brand Voice', icon: MicrophoneStage, color: 'text-[#D4FF00]', bgColor: 'bg-[#D4FF00]', hoverColor: 'group-hover/navitem:text-[#D4FF00]', glow: 'shadow-[0_0_15px_rgba(212,255,0,0.15)]' },
        { id: 'yourvoice', label: 'Your Voice', icon: Microphone, color: 'text-[#c8f135]', bgColor: 'bg-[#c8f135]', hoverColor: 'group-hover/navitem:text-[#c8f135]', glow: 'shadow-[0_0_15px_rgba(200,241,53,0.3)] sidebar-glow-pulse' },
        { id: 'assets', label: 'Assets Library', icon: FolderOpen, color: 'text-[#AADD00]', bgColor: 'bg-[#AADD00]', hoverColor: 'group-hover/navitem:text-[#AADD00]', glow: 'shadow-[0_0_15px_rgba(96,165,250,0.1)]' },
        { id: 'design', label: 'Design', icon: Palette, color: 'text-purple-400', bgColor: 'bg-purple-400', hoverColor: 'group-hover/navitem:text-purple-400', glow: 'shadow-[0_0_15px_rgba(192,132,252,0.25)]', onClick: () => window.open('http://127.0.0.1:7456', '_blank') },
        { id: 'agent', label: 'Director Agent', icon: Robot, color: 'text-violet-400', bgColor: 'bg-violet-400', hoverColor: 'group-hover/navitem:text-violet-400', glow: 'shadow-[0_0_15px_rgba(167,139,250,0.2)]' },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // intentionally run once on mount only

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
                {navItems.filter(item => {
                    if (isAdmin) return true;
                    const hiddenForRegular = new Set(['admin', 'design', 'mcp-connection', 'storyboard', 'carousel']);
                    return !hiddenForRegular.has(item.id);
                }).map((item) => (
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

            {/* Footer — Profile Card, Shorts Balance & Collapse Button */}
            <div className={cn("border-t border-white/[0.08] space-y-2 shrink-0 bg-[#06060a]/90 backdrop-blur-xl", isCollapsed ? "p-1.5" : "p-2.5")}>
                {/* Collapse Toggle */}
                <button
                    onClick={toggleCollapse}
                    className={cn(
                        "w-full relative flex items-center gap-2 px-2.5 py-2 text-[10px] text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors justify-center min-h-[36px] cursor-pointer",
                        isCollapsed && "sidebar-glow-pulse border border-[#c8f135]/40 text-[#c8f135]"
                    )}
                >
                    <CaretRight weight="bold" className={cn(
                        "w-4.5 h-4.5 absolute transition-all duration-300",
                        isCollapsed ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-0 rotate-180"
                    )} />

                    <div className={cn(
                        "flex items-center gap-1.5 overflow-hidden transition-all",
                        isCollapsed
                            ? "opacity-0 w-0 -translate-x-2 duration-150 delay-0"
                            : "opacity-100 w-full translate-x-0 duration-200 delay-[220ms]"
                    )}>
                        <CaretLeft weight="bold" className="w-4.5 h-4.5 shrink-0" />
                        <span className="font-black uppercase tracking-widest whitespace-nowrap text-[9.5px]">Collapse</span>
                    </div>
                </button>

                {/* Profile Card & Shorts Widget */}
                {isCollapsed ? (
                    <div className="flex flex-col items-center gap-1.5 py-1">
                        <button
                            type="button"
                            onClick={() => setActiveTab('settings')}
                            className={cn(
                                "relative w-8 h-8 rounded-xl bg-gradient-to-br from-[#c8f135] via-emerald-500 to-teal-600 p-[1px] transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-md",
                                activeTab === 'settings' && "ring-2 ring-[#c8f135] shadow-[0_0_15px_rgba(200,241,53,0.4)]"
                            )}
                            title={`${userProfile?.full_name || userProfile?.name || 'Account'} (${userProfile?.tier || 'FREE'}) - Open Settings`}
                        >
                            <div className="w-full h-full rounded-[11px] bg-black flex items-center justify-center overflow-hidden">
                                {userProfile?.avatar_url ? (
                                    <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-[11px] font-black text-[#c8f135] uppercase">
                                        {(userProfile?.full_name || userProfile?.name || userProfile?.email || 'U').charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#c8f135] border border-black animate-pulse" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('pricing')}
                            className="w-8 h-7 rounded-lg bg-[#D4FF00]/10 hover:bg-[#D4FF00]/20 border border-[#D4FF00]/30 text-[#D4FF00] flex items-center justify-center transition-all cursor-pointer"
                            title={`${shorts} Shorts - Click to Top Up`}
                        >
                            <Coins weight="duotone" className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        {/* Interactive Profile Card */}
                        <div
                            onClick={() => setActiveTab('settings')}
                            className={cn(
                                "w-full flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer group/prof select-none",
                                activeTab === 'settings'
                                    ? "bg-[#c8f135]/10 border-[#c8f135]/40 shadow-[0_0_15px_rgba(200,241,53,0.15)]"
                                    : "bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.06] hover:border-white/15"
                            )}
                            title="Open Account & Settings"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="relative shrink-0">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#c8f135] via-emerald-500 to-teal-600 p-[1px] shadow-sm">
                                        <div className="w-full h-full rounded-[7px] bg-black flex items-center justify-center overflow-hidden">
                                            {userProfile?.avatar_url ? (
                                                <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-[10px] font-black text-[#c8f135] uppercase">
                                                    {(userProfile?.full_name || userProfile?.name || userProfile?.email || 'U').charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#c8f135] border border-black animate-pulse" />
                                </div>
                                
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10.5px] font-black text-white truncate max-w-[72px] group-hover/prof:text-[#c8f135] transition-colors">
                                            {userProfile?.full_name || userProfile?.name || (userProfile?.email ? userProfile.email.split('@')[0] : 'Creator')}
                                        </span>
                                        <span className="text-[7px] font-mono font-extrabold px-1 py-0.2 rounded bg-white/10 text-[#c8f135] border border-white/10 shrink-0">
                                            {userProfile?.tier || 'PRO'}
                                        </span>
                                    </div>
                                    <span className="text-[8px] text-zinc-400 font-mono truncate">
                                        {userProfile?.email || 'Settings & Profile'}
                                    </span>
                                </div>
                            </div>

                            <GearSix
                                weight="duotone"
                                className={cn(
                                    "w-3.5 h-3.5 text-zinc-500 group-hover/prof:text-white group-hover/prof:rotate-45 transition-all shrink-0",
                                    activeTab === 'settings' && "text-[#c8f135]"
                                )}
                            />
                        </div>

                        {/* Shorts Credit Capsule */}
                        <div className="flex items-center justify-between bg-gradient-to-r from-[#D4FF00]/15 via-[#D4FF00]/10 to-transparent border border-[#D4FF00]/25 rounded-xl h-7.5 px-2.5">
                            <div className="flex items-center gap-1.5 shrink-0">
                                <Coins weight="duotone" className="w-3.5 h-3.5 text-[#D4FF00]" />
                                <span className="text-[11px] font-black text-[#D4FF00]">{shorts}</span>
                                <span className="text-[7.5px] text-zinc-400 font-bold tracking-wider">SHORTS</span>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab('pricing');
                                }}
                                className="text-[7.5px] font-black text-black bg-[#D4FF00] hover:bg-[#e0ff33] px-1.5 py-0.5 rounded-md transition-all active:scale-95 cursor-pointer shadow-[0_0_8px_rgba(212,255,0,0.3)] uppercase tracking-wider"
                            >
                                + TOP UP
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    )
}
