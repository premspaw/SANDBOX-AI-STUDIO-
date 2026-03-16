import { useState, useEffect } from 'react'
import { Layout } from './components/pages/Layout'
import { PromptGenerator } from './components/panels/PromptGenerator'
import { AssetsLibrary } from './components/panels/AssetsLibrary'
import LandingPage from './components/pages/LandingPage'
import AuthPage from './components/pages/AuthPage'
import DirectorStudio from './components/pages/DirectorStudio'
import UGC from './components/pages/UGC'
import { InfluencerStudio } from './components/panels/InfluencerStudio'
import { ForgeView } from './components/panels/ForgeView'
import { PlaygroundCanvas } from './components/canvas/PlaygroundCanvas'
import { AssetManager } from './components/panels/AssetManager'
import SettingsPage from './components/pages/SettingsPage'
import PricingPage from './components/pages/PricingPage'
import { supabase } from './lib/supabase'
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
  'director-studio',
  'ugc',
  'admin',
  'auth',
  'settings',
  'pricing',
])

function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const userProfile = useAppStore(state => state.userProfile)
  const isAdmin = userProfile?.role === 'admin'

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
          setUser(session?.user || null)
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

  const isShowingAuthModal = useAppStore(state => state.isShowingAuthModal);
  const setShowingAuthModal = useAppStore(state => state.setShowingAuthModal);

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
    'director-studio': <DirectorStudio />,
    ugc: <UGC />,
    forge: <ForgeView onComplete={() => setActiveTab('directors-cut')} />,
    playground: <PlaygroundCanvas />,
    admin: <AssetManager />,
    settings: <SettingsPage />,
    pricing: <PricingPage />,
  }

  const containerClassName = FULL_HEIGHT_TABS.has(activeTab) ? 'h-full' : 'p-4'

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className={containerClassName}>
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
