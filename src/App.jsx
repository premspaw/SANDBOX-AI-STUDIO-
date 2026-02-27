import { useState } from 'react'
import { Layout } from './components/pages/Layout'
import { PromptGenerator } from './components/panels/PromptGenerator'
import { AssetsLibrary } from './components/panels/AssetsLibrary'
import LandingPage from './components/pages/LandingPage'
import DirectorStudio from './components/pages/DirectorStudio'
import UGC from './components/pages/UGC'
import { InfluencerStudio } from './components/panels/InfluencerStudio'
import { ForgeView } from './components/panels/ForgeView'
import { PlaygroundCanvas } from './components/canvas/PlaygroundCanvas'

import { AssetManager } from './components/panels/AssetManager'

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
])

function App() {
  const [activeTab, setActiveTab] = useState('home')

  const tabComponents = {
    home: <LandingPage onEnter={() => setActiveTab('creator')} />,
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
  }

  const containerClassName = FULL_HEIGHT_TABS.has(activeTab) ? 'h-full' : 'p-4'

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className={containerClassName}>
        {tabComponents[activeTab] ?? null}
      </div>
    </Layout>
  )
}

export default App
