import { useState, useEffect, lazy, Suspense } from 'react'
import { Layout } from './components/pages/Layout'
import { supabase } from './lib/supabase'

// Lazy load heavy studio components to improve initial load performance
const PromptGenerator = lazy(() => import('./components/panels/PromptGenerator').then(m => ({ default: m.PromptGenerator })));
const AssetsLibrary = lazy(() => import('./components/panels/AssetsLibrary').then(m => ({ default: m.AssetsLibrary })));
const LandingPage = lazy(() => import('./components/pages/LandingPage'));
const AuthPage = lazy(() => import('./components/pages/AuthPage'));
const DirectorStudio = lazy(() => import('./components/pages/DirectorStudio'));
const UGC = lazy(() => import('./components/pages/UGC'));
const InfluencerStudio = lazy(() => import('./components/panels/InfluencerStudio').then(m => ({ default: m.InfluencerStudio })));
const ForgeView = lazy(() => import('./components/panels/ForgeView').then(m => ({ default: m.ForgeView })));
const PlaygroundCanvas = lazy(() => import('./components/canvas/PlaygroundCanvas').then(m => ({ default: m.PlaygroundCanvas })));
const AssetManager = lazy(() => import('./components/panels/AssetManager').then(m => ({ default: m.AssetManager })));
const MarketingStudio = lazy(() => import('./components/pages/MarketingStudio'));
const SettingsPage = lazy(() => import('./components/pages/SettingsPage'));
const PricingPage = lazy(() => import('./components/pages/PricingPage'));
const BrandVoicePage = lazy(() => import('./components/pages/BrandVoicePage'));
const AgentPage = lazy(() => import('./components/pages/AgentPage'));
import { initFaviconAnimation } from './utils/favicon'
import { Toast } from './components/common/Toast'
import { useAppStore } from './store'
import { X } from 'lucide-react'

const FULL_HEIGHT_TABS = new Set([
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
  'admin',
  'auth',
  'settings',
  'pricing',
  'brand-voice',
  'agent',
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
      // Already logged in, go directly to creator
      setActiveTab('creator')
    } else {
      // Not logged in, show auth page
      setActiveTab('auth')
    }
  }

  const handleAuthSuccess = (authUser) => {
    setUser(authUser)
    setActiveTab('creator')
  }

  if (!authChecked) return null; // wait for session check

  const tabComponents = {
    home: <LandingPage onEnter={handleEnterStudio} onPricing={() => setActiveTab('pricing')} />,
    auth: <AuthPage onAuthSuccess={handleAuthSuccess} />,
    prompt: <PromptGenerator />,
    influencer: <InfluencerStudio setActiveTab={setActiveTab} />,
    assets: (
      <AssetsLibrary
        setActiveTab={setActiveTab}
        onSelectReference={() => setActiveTab('influencer')}
      />
    ),
    creator: <ForgeView onComplete={() => setActiveTab('directors-cut')} />,
    'directors-cut': <PlaygroundCanvas />,
    'creative-studio': <DirectorStudio />,
    marketing: <MarketingStudio />,
    ugc: <UGC />,
    forge: <ForgeView onComplete={() => setActiveTab('directors-cut')} />,
    playground: <PlaygroundCanvas />,
    admin: <AssetManager />,
    settings: <SettingsPage />,
    pricing: <PricingPage />,
    'brand-voice': <BrandVoicePage />,
    'agent': <AgentPage />,
  }

  const getContainerClass = () => {
    if (activeTab === 'settings' || activeTab === 'pricing' || activeTab === 'brand-voice') {
      return 'h-full w-full overflow-y-auto'
    }
    return FULL_HEIGHT_TABS.has(activeTab) ? 'h-full' : 'p-4'
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className={getContainerClass()}>
        <Suspense fallback={
          <div className="h-full w-full flex flex-col items-center justify-center bg-black gap-4">
            <div className="w-12 h-12 border-4 border-lime-400/20 border-t-lime-400 rounded-full animate-spin" />
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-lime-400/60 animate-pulse">Initializing Studio...</div>
          </div>
        }>
          {tabComponents[activeTab] ?? null}
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
          <div className="relative bg-zinc-950 border border-white/5 rounded-3xl w-full max-w-lg aspect-auto shadow-2xl p-2 flex flex-col items-center">
            
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
