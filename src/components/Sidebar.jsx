import { Bot, Clapperboard, History, Settings, Maximize2, ChevronLeft, ChevronRight, Menu, Camera, FolderOpen, Palette, LayoutDashboard, UserCircle, Users } from 'lucide-react'

import { cn } from '../lib/utils'
import { useEffect } from 'react'

export function Sidebar({ activeTab, setActiveTab, isCollapsed, toggleCollapse }) {
    // Auto-hide sidebar in Director's Cut after 5 seconds
    useEffect(() => {
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
                        <button onClick={() => setActiveTab('home')} className="text-left hover:opacity-80 transition-opacity focus:outline-none group">
                            <h1 className="text-lg font-bold text-metallic transition-all tracking-tight">
                                AI CinemaStudio
                            </h1>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Creative Suite</p>
                        </button>
                    </div>
                )}
                {isCollapsed && (
                    <div className="w-full flex justify-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600" />
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

                <button className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors",
                    isCollapsed && "justify-center"
                )}>
                    <Settings className="w-4 h-4" />
                    {!isCollapsed && <span className="font-bold uppercase tracking-wider">Settings</span>}
                </button>
            </div>
        </aside>
    )
}
