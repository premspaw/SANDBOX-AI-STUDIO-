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
        (_event, session) => {
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
      <Toast />
    </Layout>
  )
}

export default App
