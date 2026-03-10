import { Bot, Clapperboard, Settings, ChevronLeft, ChevronRight, Camera, FolderOpen, Users, Shield, Video, Sparkles, Coins, CreditCard, LayoutDashboard } from 'lucide-react'
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

    const distance = useTransform(mouseY, (val) => {
        const bounds = ref.current?.getBoundingClientRect() ?? { y: 0, height: 0 };
        return val - bounds.y - bounds.height / 2;
    });

    const scaleSync = useTransform(distance, [-100, 0, 100], [1, isCollapsed ? 1.6 : 1.15, 1]);
    const scale = useSpring(scaleSync, { mass: 0.1, stiffness: 150, damping: 14 });

    const zIndexSync = useTransform(distance, [-100, 0, 100], [1, 10, 1]);
    const zIndex = useSpring(zIndexSync, { mass: 0.1, stiffness: 150, damping: 14 });
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
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-300 border-[1px] border-transparent group/navitem overflow-hidden relative",
                isActive
                    ? `bg-white/5 border-white/20 ${item.glow}`
                    : "text-white/40 hover:text-white",
                isCollapsed && "justify-center"
            )}
            title={isCollapsed ? item.label : ''}
        >
            <div className={cn(
                "absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none",
                isActive ? "opacity-20" : "group-hover/navitem:opacity-10",
                item.bgColor
            )} />

            <item.icon className={cn(
                "w-4.5 h-4.5 min-w-[18px] transition-all duration-300 z-10 shrink-0",
                isActive ? item.color : `group-hover/navitem:rotate-12 ${item.hoverColor}`
            )} />

            {!isCollapsed && (
                <span className={cn(
                    "text-[11px] font-bold uppercase tracking-wider transition-colors duration-300 z-10",
                    isActive ? item.color : item.hoverColor
                )}>
                    {item.label}
                </span>
            )}
        </motion.button>
    );
}

export function Sidebar({ activeTab, setActiveTab, isCollapsed, toggleCollapse }) {
    const mouseY = useMotionValue(Infinity);
    const { runtimeMode, apiKey, setApiKey, checkRuntimeMode } = useAppStore();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
        { id: 'prompt', label: 'Prompt Builder', icon: Bot, color: 'text-purple-400', bgColor: 'bg-purple-400', hoverColor: 'group-hover/navitem:text-purple-400', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.1)]' },
        { id: 'creator', label: 'Creator', icon: Camera, color: 'text-emerald-400', bgColor: 'bg-emerald-400', hoverColor: 'group-hover/navitem:text-emerald-400', glow: 'shadow-[0_0_15px_rgba(52,211,153,0.1)]' },
        { id: 'influencer', label: 'AI Influencer', icon: Users, color: 'text-[#bef264]', bgColor: 'bg-[#bef264]', hoverColor: 'group-hover/navitem:text-[#bef264]', glow: 'shadow-[0_0_15px_rgba(190,242,100,0.1)]' },
        { id: 'directors-cut', label: "Director's Cut", icon: Clapperboard, color: 'text-cyan-400', bgColor: 'bg-cyan-400', hoverColor: 'group-hover/navitem:text-cyan-400', glow: 'shadow-[0_0_15px_rgba(34,211,238,0.1)]' },
        { id: 'director-studio', label: "Director Studio", icon: Video, color: 'text-orange-400', bgColor: 'bg-orange-400', hoverColor: 'group-hover/navitem:text-orange-400', glow: 'shadow-[0_0_15px_rgba(251,146,60,0.1)]' },
        { id: 'ugc', label: 'UGC Engine', icon: Sparkles, color: 'text-amber-400', bgColor: 'bg-amber-400', hoverColor: 'group-hover/navitem:text-amber-400', glow: 'shadow-[0_0_15px_rgba(251,191,36,0.1)]' },
        { id: 'assets', label: 'Assets Library', icon: FolderOpen, color: 'text-blue-400', bgColor: 'bg-blue-400', hoverColor: 'group-hover/navitem:text-blue-400', glow: 'shadow-[0_0_15px_rgba(96,165,250,0.1)]' },
        { id: 'settings', label: 'Settings', icon: Settings, color: 'text-neutral-300', bgColor: 'bg-neutral-300', hoverColor: 'group-hover/navitem:text-neutral-300', glow: 'shadow-[0_0_15px_rgba(163,163,163,0.4)]' },
        { id: 'admin', label: 'Admin', icon: Shield, color: 'text-red-500', bgColor: 'bg-red-500', hoverColor: 'group-hover/navitem:text-red-500', glow: 'shadow-[0_0_15px_rgba(248,113,113,0.1)]' },
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
                "border-r border-white/10 surface-glass flex flex-col transition-all duration-300 z-50 relative",
                isCollapsed ? "w-14" : "w-52"
            )}>
            <div className="p-3 flex items-center justify-between">
                {!isCollapsed && (
                    <div>
                        <button onClick={() => setActiveTab('home')} className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none group">
                            <BrandLogo className="w-8 h-8 drop-shadow-[0_0_8px_rgba(212,255,0,0.3)]" />
                            <div className="flex flex-col items-start mt-1">
                                <h1 className="text-[20px] font-black text-metallic transition-all tracking-tighter uppercase italic leading-none">
                                    ZEROLENS
                                </h1>
                                <p className="text-[9px] text-white/20 font-mono mt-0.5 uppercase tracking-widest font-bold">Creative Suite</p>
                            </div>
                        </button>
                    </div>
                )}
                {isCollapsed && (
                    <button onClick={() => setActiveTab('home')} className="w-full flex justify-center hover:opacity-80 transition-opacity focus:outline-none cursor-pointer">
                        <BrandLogo className="w-8 h-8 drop-shadow-[0_0_8px_rgba(212,255,0,0.3)]" />
                    </button>
                )}
            </div>

            <nav className="flex-1 px-2.5 space-y-1 relative" onMouseLeave={() => mouseY.set(Infinity)}>
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

            <div className="p-3 border-t border-border space-y-1">
                <button
                    onClick={toggleCollapse}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg transition-colors justify-center"
                >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : (
                        <div className="flex items-center gap-2 w-full">
                            <ChevronLeft className="w-4 h-4" />
                            <span className="font-bold uppercase tracking-wider">Collapse</span>
                        </div>
                    )}
                </button>

                <div className="px-3 py-2 space-y-2">
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-2 bg-[#D4FF00]/10 border border-[#D4FF00]/30 rounded-xl transition-all",
                        isCollapsed ? "justify-center px-0" : ""
                    )}>
                        {isCollapsed ? (
                            <span className="text-sm">🎞</span>
                        ) : (
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm">🎞</span>
                                    <span className="text-[13px] font-black text-[#D4FF00]">{shorts}</span>
                                    <span className="text-[9px] text-[#555] font-bold tracking-widest leading-none mt-0.5">SHORTS</span>
                                </div>
                                <button
                                    onClick={() => {/* navigate to top up */ }}
                                    className="text-[8px] font-bold text-[#D4FF00] hover:text-white bg-transparent border-none cursor-pointer tracking-wider"
                                >
                                    + TOP UP
                                </button>
                            </div>
                        )}
                    </div>

                    {!isCollapsed && (
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/20">System Status</span>
                            <div className={cn(
                                "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider",
                                runtimeMode === 'SERVER' ? "bg-lime-500/10 text-lime-400" : "bg-orange-500/10 text-orange-400"
                            )}>
                                <span className={cn("w-1 h-1 rounded-full", runtimeMode === 'SERVER' ? "bg-lime-400 animate-pulse" : "bg-orange-400")} />
                                {runtimeMode}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors rounded-lg",
                            isSettingsOpen && "bg-white/5 text-white"
                        )}
                    >
                        <Settings className={cn("w-4 h-4", isSettingsOpen && "animate-spin-slow")} />
                        {!isCollapsed && <span className="font-bold uppercase tracking-wider">System Config</span>}
                    </button>

                    {!isCollapsed && isSettingsOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-black/20 rounded-xl p-3 border border-white/5 space-y-3 mt-2"
                        >
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1">
                                    <Shield size={10} className="text-lime-500" />
                                    Google API Key
                                </label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Enter AI Studio Key..."
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[9px] text-white focus:outline-none focus:border-lime-500/50 transition-all"
                                />
                                <p className="text-[7px] text-white/20 leading-tight">Required for Standalone mode if no backend server is detected.</p>
                            </div>

                            <button
                                onClick={() => checkRuntimeMode()}
                                className="w-full py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[8px] font-black text-white/40 uppercase tracking-widest transition-all"
                            >
                                Re-check connection
                            </button>
                        </motion.div>
                    )}
                </div>
            </div>
        </aside>
    )
}
