import React, { useState, useEffect } from 'react';
import { Bot } from 'lucide-react'
import { Layout } from './components/pages/Layout'
import { AssetsLibrary } from './components/panels/AssetsLibrary'
import LandingPage from './components/pages/LandingPage'
import AuthPage from './components/pages/AuthPage'
import UGC from './features/UGCStudio/UGC'
import { PlaygroundCanvas } from './components/canvas/PlaygroundCanvas'
import { AssetManager } from './components/panels/AssetManager'
import MarketingStudio from './components/pages/MarketingStudio'
import CarouselStudio from './components/pages/CarouselStudio'
import SettingsPage from './components/pages/SettingsPage'
import PricingPage from './components/pages/PricingPage'
import BrandVoicePage from './components/pages/BrandVoicePage'
import AgentPage from './components/pages/AgentPage'
import AvatarStudio from './components/pages/AvatarStudio'
import LivingAvatar from './components/pages/LivingAvatar'
import CinematicStudio from './components/cinemaStudio/CinematicStudio'
import { supabase } from './lib/supabase'
import { initFaviconAnimation } from './utils/favicon'
import { Toast } from './components/common/Toast'
import { useAppStore } from './store'
import { X } from 'lucide-react'

// Beautiful, futuristic stand-by placeholder for the new Avatar Studio
function AvatarPlaceholder() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-[#0a0a0a] text-white p-6 relative font-sans overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      
      <div className="max-w-md w-full text-center space-y-6 z-10">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-950/50 animate-pulse">
          <Bot className="w-10 h-10 text-white" />
        </div>
        
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full">
            System Standby
          </span>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent mt-2">
            Avatar Studio
          </h2>
          <p className="text-white/40 text-xs leading-relaxed max-w-sm mx-auto font-medium">
            ForgeView has been successfully deleted. The system is fully primed and waiting for your command to create the new Avatar and Character Creator!
          </p>
        </div>
        
        {/* Futuristic Status Bar */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex items-center justify-between text-left">
          <div>
            <p className="text-[9px] font-black uppercase text-white/20 tracking-wider">Awaiting Directives</p>
            <p className="text-[11px] font-bold text-white/60 mt-0.5">Ready to execute blueprint</p>
          </div>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
      </div>
    </div>
  );
}

const FULL_HEIGHT_TABS = new Set([
  'home',
  'playground',
  'avatar',
  'living-avatar',
  'directors-cut',
  'marketing',
  'carousel',
  'ugc',
  'assets',
  'admin',
  'auth',
  'settings',
  'pricing',
  'brand-voice',
  'agent',
  'cinematic-studio',
])

function App() {
  const activeTab = useAppStore(state => state.activeTab)
  const setActiveTab = useAppStore(state => state.setActiveTab)
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const userProfile = useAppStore(state => state.userProfile)
  const isAdmin = userProfile?.role === 'admin'
  const isShowingAuthModal = useAppStore(state => state.isShowingAuthModal);
  const setShowingAuthModal = useAppStore(state => state.setShowingAuthModal);

  // Check for existing session on mount
  useEffect(() => {
    initFaviconAnimation()
  }, [])

  useEffect(() => {
    const checkSession = async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          // ✅ CRITICAL: Ensure profile is loaded into Store for persistence to work
          useAppStore.getState().fetchUserProfile(session.user.id);
        }
      }
      setAuthChecked(true)
    }
    checkSession()

    // Listen for auth state changes
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (event === 'PASSWORD_RECOVERY') {
            setIsRecoveringPassword(true);
          }
          
          const currentUserId = useAppStore.getState().userProfile?.id || null
          const nextUserId = session?.user?.id || null

          if (!session || (currentUserId && nextUserId && currentUserId !== nextUserId)) {
            useAppStore.getState().clearSession()
          }
          
          if (session?.user) {
            setUser(session.user)
            // ✅ CRITICAL: Ensure profile is loaded into Store on auth change
            useAppStore.getState().fetchUserProfile(session.user.id);
          } else {
            setUser(null)
          }
        }
      )
      return () => subscription.unsubscribe()
    }
  }, [])

  const handleEnterStudio = () => {
    if (user) {
      // Already logged in, go directly to avatar creator (or cinema studio on mobile)
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      setActiveTab(isMobile ? 'cinematic-studio' : 'avatar')
    } else {
      // Not logged in, show auth page
      setActiveTab('auth')
    }
  }

  const handleAuthSuccess = (authUser) => {
    setUser(authUser)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    setActiveTab(isMobile ? 'cinematic-studio' : 'avatar')
  }

  if (!authChecked) return null; // wait for session check

  const tabComponents = {
    home: <LandingPage onEnter={handleEnterStudio} onPricing={() => setActiveTab('pricing')} />,
    auth: <AuthPage onAuthSuccess={handleAuthSuccess} />,
    assets: (
      <AssetsLibrary
        setActiveTab={setActiveTab}
        onSelectReference={() => setActiveTab('avatar')}
      />
    ),
    avatar: <AvatarStudio />,
    'living-avatar': <LivingAvatar />,
    'directors-cut': <PlaygroundCanvas />,
    marketing: <MarketingStudio />,
    carousel: <CarouselStudio userId={userProfile?.id} />,
    ugc: <UGC />,
    admin: <AssetManager />,
    settings: <SettingsPage />,
    pricing: <PricingPage />,
    'brand-voice': <BrandVoicePage />,
    'agent': <AgentPage />,
    'cinematic-studio': <CinematicStudio />,
  }


  const getContainerClass = () => {
    if (activeTab === 'settings' || activeTab === 'pricing' || activeTab === 'brand-voice' || activeTab === 'auth') {
      return 'h-full w-full overflow-y-auto'
    }
    return FULL_HEIGHT_TABS.has(activeTab) ? 'h-full' : 'p-4'
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className={getContainerClass()}>
        {tabComponents[activeTab] ?? null}
      </div>

      {isRecoveringPassword && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999]">
          <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm text-center shadow-2xl">
            <h3 className="text-xl font-bold bg-gradient-to-r from-lime-400 to-emerald-400 bg-clip-text text-transparent mb-2">Reset Password</h3>
            <p className="text-xs text-zinc-400 mb-5">Choose a new password for your account.</p>
            <input 
               type="password" 
               placeholder="Enter new password" 
               value={newPassword}
               onChange={(e) => setNewPassword(e.target.value)}
               className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-sm outline-none mb-4 focus:border-lime-500 transition-colors"
            />
            <button 
               onClick={async () => {
                   if (!newPassword || newPassword.length < 6) {
                       alert("Password must be at least 6 characters!");
                       return;
                   }
                   const { error } = await supabase.auth.updateUser({ password: newPassword });
                   if (error) { 
                       alert(error.message); 
                   } else { 
                       alert("Password updated successfully!"); 
                       setIsRecoveringPassword(false);
                       setNewPassword('');
                   }
               }}
               className="w-full bg-lime-400 text-black font-bold p-3 rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-lime-500/20"
            >
               Save New Password
            </button>
            <button 
               onClick={() => setIsRecoveringPassword(false)}
               className="text-[10px] text-zinc-500 hover:text-white mt-4 transition-colors"
            >
               Skip for now
            </button>
          </div>
        </div>
      )}

      {isShowingAuthModal && !user && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[99999]">
          <div className="relative bg-zinc-950 border border-white/5 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl p-2 flex flex-col items-center">
            
            <button 
              onClick={() => setShowingAuthModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-[100]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-full flex-1 overflow-y-auto max-h-[85vh]">
              <AuthPage onAuthSuccess={(u) => { setShowingAuthModal(false); setUser(u); }} isModal={true} />
            </div>

          </div>
        </div>
      )}

      <Toast />
    </Layout>
  )
}

export default App
