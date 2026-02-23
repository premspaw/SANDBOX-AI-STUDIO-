import { Bot, Clapperboard, Settings, ChevronLeft, ChevronRight, Camera, FolderOpen, Users, Shield } from 'lucide-react'
import logo from '../assets/acs-icon.svg'
import { cn } from '../lib/utils'
import { useEffect, useState } from 'react'
import { useAppStore } from '../store'
import { motion } from 'framer-motion'

export function Sidebar({ activeTab, setActiveTab, isCollapsed, toggleCollapse }) {
    const { runtimeMode, apiKey, setApiKey, checkRuntimeMode } = useAppStore();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Auto-hide sidebar in Director's Cut after 5 seconds
    useEffect(() => {
        checkRuntimeMode();
        if (activeTab === 'directors-cut' && !isCollapsed) {
            const timer = setTimeout(() => {
                toggleCollapse();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [activeTab, isCollapsed, toggleCollapse]);

    const navItems = [
        { id: 'prompt', label: 'Prompt Builder', icon: Bot },
        { id: 'creator', label: 'Creator', icon: Camera },
        { id: 'influencer', label: 'AI Influencer', icon: Users },
        { id: 'directors-cut', label: "Director's Cut", icon: Clapperboard },
        { id: 'assets', label: 'Assets Library', icon: FolderOpen },
    ]

    return (
        <aside className={cn(
            "border-r border-white/10 surface-glass flex flex-col transition-all duration-300",
            isCollapsed ? "w-14" : "w-52"
        )}>
            <div className="p-3 flex items-center justify-between">
                {!isCollapsed && (
                    <div>
                        <button onClick={() => setActiveTab('home')} className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none group">
                            <img src={logo} alt="ACS Logo" className="w-8 h-8 drop-shadow-[0_0_8px_rgba(212,255,0,0.3)]" />
                            <div>
                                <h1 className="text-sm font-black text-metallic transition-all tracking-tighter uppercase italic leading-none">
                                    AI CinemaStudio
                                </h1>
                                <p className="text-[9px] text-white/20 font-mono mt-0.5 uppercase tracking-widest font-bold">Creative Suite</p>
                            </div>
                        </button>
                    </div>
                )}
                {isCollapsed && (
                    <div className="w-full flex justify-center">
                        <img src={logo} alt="ACS Logo" className="w-8 h-8 drop-shadow-[0_0_8px_rgba(212,255,0,0.3)]" />
                    </div>
                )}
            </div>

            <nav className="flex-1 px-2.5 space-y-1">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 border-l-[1px] border-transparent",
                            activeTab === item.id
                                ? "bg-white/5 glow-text-lime border-[#D4FF00] shadow-[0_0_15px_rgba(212,255,0,0.1)]"
                                : "text-white/40 hover:bg-white/5 hover:text-white/80",
                            isCollapsed && "justify-center"
                        )}
                        title={isCollapsed ? item.label : ''}
                    >
                        <item.icon className={cn("w-4.5 h-4.5 min-w-[18px]", activeTab === item.id && "drop-shadow-[0_0_8px_rgba(212,255,0,0.5)]")} />
                        {!isCollapsed && <span className="text-[11px] font-bold uppercase tracking-wider">{item.label}</span>}
                    </button>
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
