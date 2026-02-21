import { useState } from 'react'
import { Layout } from './components/Layout'
import { PromptGenerator } from './components/PromptGenerator'
import { AssetsLibrary } from './components/AssetsLibrary'
import { Home } from './components/Home'
import { InfluencerStudio } from './components/InfluencerStudio'
import { ForgeView } from './components/ForgeView'
import { PlaygroundCanvas } from './components/PlaygroundCanvas'

function App() {
  const [activeTab, setActiveTab] = useState('home')

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className={activeTab === 'home' || activeTab === 'prompt' || activeTab === 'influencer' || activeTab === 'forge' || activeTab === 'playground' || activeTab === 'creator' || activeTab === 'directors-cut' ? "h-full" : "p-4"}>
        {activeTab === 'home' && <Home setActiveTab={setActiveTab} />}
        {activeTab === 'prompt' && <PromptGenerator />}
        {activeTab === 'influencer' && <InfluencerStudio setActiveTab={setActiveTab} />}
        {activeTab === 'assets' && (
          <AssetsLibrary
            setActiveTab={setActiveTab}
            onSelectReference={(url) => {
              setActiveTab('influencer');
            }}
          />
        )}
        {activeTab === 'creator' && <ForgeView onComplete={() => setActiveTab('directors-cut')} />}
        {activeTab === 'directors-cut' && <PlaygroundCanvas />}
        {activeTab === 'forge' && <ForgeView onComplete={() => setActiveTab('directors-cut')} />}
        {activeTab === 'playground' && <PlaygroundCanvas />}
      </div>
    </Layout>
  )
}

export default App
