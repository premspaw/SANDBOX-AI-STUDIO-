import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sidebar } from './Sidebar'

export function Layout({ children, activeTab, setActiveTab }) {
    const [isCollapsed, setIsCollapsed] = useState(false)

    return (
        <div className="flex h-screen bg-black text-white overflow-hidden">
            <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isCollapsed={isCollapsed}
                toggleCollapse={() => setIsCollapsed(!isCollapsed)}
            />
            <main className={`flex-1 relative transition-all duration-300 ${(activeTab === 'home' || activeTab === 'prompt' || activeTab === 'influencer' || activeTab === 'forge' || activeTab === 'playground' || activeTab === 'creator' || activeTab === 'directors-cut') ? 'p-0 overflow-hidden' : 'p-8 overflow-auto'}`}>

                <div className="absolute inset-0 bg-black -z-10 pointer-events-none" />
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={
                        (activeTab === 'home' || activeTab === 'prompt' || activeTab === 'influencer' || activeTab === 'forge' || activeTab === 'playground' || activeTab === 'creator' || activeTab === 'directors-cut')
                            ? "w-full h-full"
                            : (isCollapsed ? "max-w-[95%] mx-auto" : "max-w-6xl mx-auto")
                    }
                >

                    {children}
                </motion.div>
            </main>
        </div>
    )
}
