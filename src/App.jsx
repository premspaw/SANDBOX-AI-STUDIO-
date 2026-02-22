import { useState } from 'react'
import { Layout } from './components/Layout'
import { PromptGenerator } from './components/PromptGenerator'
import { AssetsLibrary } from './components/AssetsLibrary'
import { Home } from './components/Home'
import { InfluencerStudio } from './components/InfluencerStudio'
import { ForgeView } from './components/ForgeView'
import { PlaygroundCanvas } from './components/PlaygroundCanvas'

const FULL_HEIGHT_TABS = new Set([
  'home',
  'prompt',
  'influencer',
  'forge',
  'playground',
  'creator',
  'directors-cut',
])

function App() {
  const [activeTab, setActiveTab] = useState('home')

  const tabComponents = {
    home: <Home setActiveTab={setActiveTab} />,
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
    forge: <ForgeView onComplete={() => setActiveTab('directors-cut')} />,
    playground: <PlaygroundCanvas />,
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
