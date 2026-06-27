import React from 'react';
import { useUGC } from '../context/UGCContext';
import { Film, Volume2, User, Loader2, Wand2, MapPin } from 'lucide-react';

export default function Header() {
  const {
    activeTab,
    setActiveTab,
    setRenderMode,
    isAnalyzing,
    isGeneratingVideo,
    videoProgressMsg,
    isGeneratingScript,
  } = useUGC();

  return (
    <div className="flex-none py-2 px-4 border-b border-white/10 flex items-center gap-3 z-10 bg-black/40 backdrop-blur-md shrink-0">
      <div className="flex items-baseline gap-2 flex-shrink-0">
        <h1 className="text-base font-black italic uppercase tracking-tighter bg-gradient-to-r from-[#c8f135] via-lime-300 to-emerald-400 bg-clip-text text-transparent whitespace-nowrap">
          Influencer Studio
        </h1>
      </div>
      <div className="w-px h-5 bg-white/10 flex-shrink-0" />
      {/* Mode Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar max-w-[calc(100vw-160px)] md:max-w-none py-1 select-none shrink-0" style={{ scrollbarWidth: 'none' }}>
        {[
          { id: 'ugc', label: 'UGC', icon: Film },
          { id: 'podcast', label: 'Podcast', icon: Volume2 },
          { id: 'talking-head', label: 'Talking Head', icon: User },
          { id: 'home-tour', label: 'Home Tour', icon: MapPin },
          { id: 'edit', label: 'Edit', icon: Wand2 },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'talking-head') {
                  setRenderMode('video');
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#c8f135]/15 border border-[#c8f135]/40 text-[#c8f135]'
                  : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon size={10} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Global Progress Indicators */}
      <div className="flex items-center gap-3 ml-auto shrink-0">
        {isAnalyzing && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <Loader2 size={9} className="animate-spin text-white/50" />
            <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Scanning Product…</span>
          </div>
        )}
        {isGeneratingVideo && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#c8f135]/10 border border-[#c8f135]/20">
            <Loader2 size={9} className="animate-spin text-[#c8f135]" />
            <span className="text-[8px] font-black text-[#c8f135] uppercase tracking-widest">{videoProgressMsg || 'Generating…'}</span>
          </div>
        )}
        {isGeneratingScript && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <Loader2 size={9} className="animate-spin text-white/50" />
            <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Writing Script…</span>
          </div>
        )}
      </div>
    </div>
  );
}
