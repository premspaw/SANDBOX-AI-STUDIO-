import { Bot, Clapperboard, History, Settings, Maximize2, ChevronLeft, ChevronRight, Menu, Camera, FolderOpen, Palette, LayoutDashboard, UserCircle, Users } from 'lucide-react'

import { cn } from '../lib/utils'

export function Sidebar({ activeTab, setActiveTab, isCollapsed, toggleCollapse }) {
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
            isCollapsed ? "w-20" : "w-64"
        )}>
            <div className="p-6 flex items-center justify-between">
                {!isCollapsed && (
                    <div>
                        <button onClick={() => setActiveTab('home')} className="text-left hover:opacity-80 transition-opacity focus:outline-none group">
                            <h1 className="text-2xl font-bold text-metallic transition-all tracking-tight">
                                AI CinemaStudio
                            </h1>
                            <p className="text-xs text-muted-foreground mt-1">Creative Suite</p>
                        </button>
                    </div>
                )}
                {isCollapsed && (
                    <div className="w-full flex justify-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600" />
                    </div>
                )}
            </div>

            <nav className="flex-1 px-4 space-y-2">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 border-l-[1px] border-transparent",
                            activeTab === item.id
                                ? "bg-white/5 glow-text-lime border-[#D4FF00] shadow-[0_0_15px_rgba(212,255,0,0.1)]"
                                : "text-white/40 hover:bg-white/5 hover:text-white/80",
                            isCollapsed && "justify-center"
                        )}
                        title={isCollapsed ? item.label : ''}
                    >
                        <item.icon className={cn("w-5 h-5 min-w-[20px]", activeTab === item.id && "drop-shadow-[0_0_8px_rgba(212,255,0,0.5)]")} />
                        {!isCollapsed && <span className="text-[13px] font-bold uppercase tracking-wider">{item.label}</span>}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-border space-y-2">
                <button
                    onClick={toggleCollapse}
                    className="w-full flex items-center gap-3 px-4 py-2 text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg transition-colors justify-center"
                >
                    {isCollapsed ? <ChevronRight className="w-5 h-5" /> : (
                        <div className="flex items-center gap-2 w-full">
                            <ChevronLeft className="w-5 h-5" />
                            <span className="text-sm">Collapse Sidebar</span>
                        </div>
                    )}
                </button>

                <button className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground transition-colors",
                    isCollapsed && "justify-center"
                )}>
                    <Settings className="w-5 h-5" />
                    {!isCollapsed && <span>Settings</span>}
                </button>
            </div>
        </aside>
    )
}
