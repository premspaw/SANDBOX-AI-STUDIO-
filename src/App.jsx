import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Bot, X } from 'lucide-react';
import { Layout } from './components/pages/Layout';
import LandingPage from './components/pages/LandingPage';
import { supabase } from './lib/supabase';
import { initFaviconAnimation } from './utils/favicon';
import { Toast } from './components/common/Toast';
import { useAppStore } from './store';

// Lazy imports of panels and inner studio pages
const AuthPage = lazy(() => import('./components/pages/AuthPage'));
const AssetsLibrary = lazy(() => import('./components/panels/AssetsLibrary').then(m => ({ default: m.AssetsLibrary })));
const UGC = lazy(() => import('./features/UGCStudio/UGC'));
const PlaygroundCanvas = lazy(() => import('./components/canvas/PlaygroundCanvas').then(m => ({ default: m.PlaygroundCanvas })));
const AssetManager = lazy(() => import('./components/panels/AssetManager').then(m => ({ default: m.AssetManager })));
const MarketingStudio = lazy(() => import('./components/pages/MarketingStudio'));
const CarouselStudio = lazy(() => import('./components/pages/CarouselStudio'));
const SettingsPage = lazy(() => import('./components/pages/SettingsPage'));
const PricingPage = lazy(() => import('./components/pages/PricingPage'));
const BrandVoicePage = lazy(() => import('./components/pages/BrandVoicePage'));
const AgentPage = lazy(() => import('./components/pages/AgentPage'));
const AvatarStudio = lazy(() => import('./components/pages/AvatarStudio'));
const LivingAvatar = lazy(() => import('./components/pages/LivingAvatar'));
const CinematicStudio = lazy(() => import('./components/cinemaStudio/CinematicStudio'));
const YourVoice = lazy(() => import('./components/pages/YourVoice'));


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

// Sleek, futuristic dark loader fallback for lazy components
function StudioLoader() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-[#050505] text-white p-6 relative font-sans overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#c8f135]/5 rounded-full blur-[80px] pointer-events-none -z-10" />
      <div className="text-center space-y-4">
        <div className="relative w-12 h-12 mx-auto">
          <div className="absolute inset-0 rounded-full border border-white/5" />
          <div className="absolute inset-0 rounded-full border-t-2 border-l-2 border-[#c8f135] animate-spin" />
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#c8f135]/80">Loading Studio</p>
          <p className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Initializing parameter state...</p>
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
  'yourvoice',
  'design',
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

  // 1. Sync URL path -> activeTab on mount (initial load)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname.toLowerCase();
    
    let tab = 'home';
    if (path === '/avatar-studio' || path === '/avatarstudio' || path === '/avatar') {
      tab = 'avatar';
    } else if (path !== '/') {
      tab = path.slice(1);
    }

    if (FULL_HEIGHT_TABS.has(tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab('home');
    }
  }, [setActiveTab]);

  // 2. Sync activeTab -> URL path on tab change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentPath = window.location.pathname.toLowerCase();
    
    let expectedPath = '/';
    if (activeTab === 'avatar') {
      expectedPath = '/avatar-studio';
    } else if (activeTab !== 'home') {
      expectedPath = `/${activeTab}`;
    }

    if (currentPath !== expectedPath) {
      window.history.pushState({ tab: activeTab }, '', expectedPath);
    }
  }, [activeTab]);

  // 3. Handle browser Back/Forward navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      let tab = 'home';
      if (path === '/avatar-studio' || path === '/avatarstudio' || path === '/avatar') {
        tab = 'avatar';
      } else if (path !== '/') {
        tab = path.slice(1);
      }

      if (FULL_HEIGHT_TABS.has(tab)) {
        setActiveTab(tab);
      } else {
        setActiveTab('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveTab]);

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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return <LandingPage onEnter={handleEnterStudio} onPricing={() => setActiveTab('pricing')} />;
      case 'auth':
        return <AuthPage onAuthSuccess={handleAuthSuccess} />;
      case 'assets':
        return (
          <AssetsLibrary
            setActiveTab={setActiveTab}
            onSelectReference={() => setActiveTab('avatar')}
          />
        );
      case 'avatar':
        return <AvatarStudio />;
      case 'living-avatar':
        return <LivingAvatar />;
      case 'directors-cut':
        return <PlaygroundCanvas />;
      case 'marketing':
        return <MarketingStudio />;
      case 'carousel':
        return <CarouselStudio userId={userProfile?.id} />;
      case 'ugc':
        return <UGC />;
      case 'admin':
        return <AssetManager />;
      case 'settings':
        return <SettingsPage />;
      case 'pricing':
        return <PricingPage />;
      case 'brand-voice':
        return <BrandVoicePage />;
      case 'agent':
        return <AgentPage />;
      case 'cinematic-studio':
        return <CinematicStudio />;
      case 'yourvoice':
        return <YourVoice />;
      case 'design':
        return null;
      default:
        return null;
    }
  };


  const getContainerClass = () => {
    if (activeTab === 'settings' || activeTab === 'pricing' || activeTab === 'brand-voice' || activeTab === 'auth') {
      return 'h-full w-full overflow-y-auto'
    }
    return FULL_HEIGHT_TABS.has(activeTab) ? 'h-full' : 'p-4'
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className={getContainerClass()}>
        <Suspense fallback={<StudioLoader />}>
          {renderTabContent()}
        </Suspense>
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
