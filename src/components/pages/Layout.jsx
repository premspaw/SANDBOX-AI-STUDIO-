import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sidebar } from '../panels/Sidebar'
import { MobileNav } from '../panels/MobileNav'

const FULL_BLEED_TABS = new Set([
    'home',
    'prompt',
    'influencer',
    'forge',
    'playground',
    'creator',
    'directors-cut',
    'creative-studio',
    'marketing',
    'ugc',
    'assets',
    'admin',
    'auth',
    'settings',
    'pricing',
    'brand-voice',
]);

export function Layout({ children, activeTab, setActiveTab }) {
    const [isCollapsed, setIsCollapsed] = useState(false)

    return (
        <div className="flex flex-col md:flex-row h-screen bg-black text-white overflow-hidden relative">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <Sidebar
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isCollapsed={isCollapsed}
                    toggleCollapse={() => setIsCollapsed(!isCollapsed)}
                />
            </div>

            <main className={`flex-1 relative transition-all duration-300 ${FULL_BLEED_TABS.has(activeTab) ? 'p-0 overflow-hidden' : 'p-4 md:p-8 overflow-auto'} pb-20 md:pb-0`}>
                <div className="absolute inset-0 bg-black -z-10 pointer-events-none" />
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={
                        FULL_BLEED_TABS.has(activeTab)
                            ? "w-full h-full"
                            : (isCollapsed ? "max-w-[95%] mx-auto" : "max-w-6xl mx-auto")
                    }
                >
                    {children}
                </motion.div>
            </main>

            {/* Mobile Navigation */}
            <div className="md:hidden">
                <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
        </div>
    )
}
