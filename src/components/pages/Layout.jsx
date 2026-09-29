import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sidebar } from '../panels/Sidebar'
import { MobileNav } from '../panels/MobileNav'
import { useAppStore } from '../../store'
import AdminLoginModal from '../../features/UGCStudio/components/modals/AdminLoginModal'
import { ProjectVaultModal } from '../common/ProjectVaultModal'

const FULL_BLEED_TABS = new Set([
    'home',
    'forge',
    'playground',
    'avatar',
    'living-avatar',
    'directors-cut',
    'marketing',
    'carousel',
    'ugc',
    'motion-control',
    'assets',
    'admin',
    'auth',
    'settings',
    'pricing',
    'brand-voice',
    'agent',
    'cinematic-studio',
    'studio',
    'yourvoice',
    'mcp-connection',
    'storyboard',
    'remix',
    'object-swap',
]);

export function Layout({ children, activeTab, setActiveTab }) {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const isAdmin = useAppStore(state => state.isAdmin);
    const setIsAdmin = useAppStore(state => state.setIsAdmin);
    const setShowAdminLogin = useAppStore(state => state.setShowAdminLogin);

    useEffect(() => {
        const handler = (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                e.preventDefault();
                if (isAdmin) {
                    setIsAdmin(false);
                    const userProfile = useAppStore.getState().userProfile;
                    if (userProfile?.id) {
                        useAppStore.getState().fetchBalance(userProfile.id);
                    }
                    alert('Admin mode OFF');
                } else {
                    setShowAdminLogin(true);
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isAdmin, setIsAdmin, setShowAdminLogin]);

    return (
        <div className="flex flex-col md:flex-row h-screen bg-black text-white overflow-hidden relative">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <Sidebar
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isCollapsed={isCollapsed}
                    toggleCollapse={() => setIsCollapsed(prev => !prev)}
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

            {/* Global Liquid Glass Project Vault Floating Trigger */}
            <button
                onClick={() => useAppStore.getState().openProjectVault('character')}
                className="fixed top-3.5 right-4 z-[999] px-3 py-1.5 rounded-full bg-[#0a0a12]/80 hover:bg-[#12121e]/90 backdrop-blur-2xl border border-white/15 hover:border-purple-400/50 text-white flex items-center gap-2 shadow-[0_4px_25px_rgba(0,0,0,0.8)] hover:shadow-[0_0_25px_rgba(168,85,247,0.35)] transition-all duration-300 group cursor-pointer"
                title="Open Project Vault / Asset Box"
            >
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider text-white/90 group-hover:text-purple-200">
                    Project Box
                </span>
            </button>

            {/* Admin Security Portal */}
            <AdminLoginModal />

            {/* Universal Project Vault Lightbox */}
            <ProjectVaultModal />
        </div>
    )
}
