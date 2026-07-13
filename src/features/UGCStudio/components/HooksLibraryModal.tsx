import React, { useState } from 'react';
import { X, Search, Sparkles, Filter } from 'lucide-react';
import { HOOK_CATEGORIES, HOOK_TEMPLATES, HookTemplate, HookCategory } from '../constants/hooksLibrary';

interface HooksLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHook: (hook: HookTemplate) => void;
}

export default function HooksLibraryModal({ isOpen, onClose, onSelectHook }: HooksLibraryModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previews, setPreviews] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('admin_hook_previews');
        if (stored) {
          setPreviews(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Failed to load hook previews", e);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredHooks = HOOK_TEMPLATES.filter(hook => {
    const matchesCategory = activeCategory === 'all' || hook.categoryId === activeCategory;
    const matchesSearch = hook.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          hook.bestFor.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#c8f135]/20 flex items-center justify-center text-[#c8f135]">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-white/90 font-bold text-sm tracking-wide">AI Visual Hooks Library</h2>
              <p className="text-white/40 text-[10px]">High-retention cinematic openings for UGC</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Categories */}
          <div className="w-64 border-r border-white/5 bg-white/[0.01] overflow-y-auto p-4 custom-scrollbar">
            <div className="mb-4 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input 
                type="text" 
                placeholder="Search hooks..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#c8f135]/50 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <button
                onClick={() => setActiveCategory('all')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  activeCategory === 'all' 
                    ? 'bg-[#c8f135]/10 text-[#c8f135]' 
                    : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                }`}
              >
                <Filter size={14} /> All Hooks
              </button>
              
              {HOOK_CATEGORIES.map(category => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeCategory === category.id 
                      ? 'bg-[#c8f135]/10 text-[#c8f135]' 
                      : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                  }`}
                >
                  <span>{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Main Grid - Hooks */}
          <div className="flex-1 overflow-y-auto p-6 bg-black/20 custom-scrollbar">
            {filteredHooks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                <Sparkles size={32} className="text-white/20 mb-4" />
                <p className="text-white/60 text-sm">No hooks found</p>
                <p className="text-white/40 text-xs mt-1">Try adjusting your search or category filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredHooks.map((hook) => (
                  <div 
                    key={hook.id}
                    onClick={() => {
                      onSelectHook(hook);
                      onClose();
                    }}
                    className="group bg-white/3 border border-white/10 hover:border-[#c8f135]/40 rounded-2xl p-4 cursor-pointer transition-all hover:bg-white/5 hover:shadow-[0_4px_24px_rgba(200,241,53,0.05)] flex flex-col h-full"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-white/90 font-bold text-sm group-hover:text-[#c8f135] transition-colors">{hook.name}</h3>
                        <p className="text-[#c8f135]/60 text-[10px] mt-0.5 font-mono uppercase tracking-wider">{HOOK_CATEGORIES.find(c => c.id === hook.categoryId)?.name || hook.categoryId}</p>
                      </div>
                      <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/60 shrink-0">Hook</span>
                    </div>

                    {/* Visual Preview */}
                    <div className="w-full aspect-[9/16] bg-black/40 rounded-xl mb-3 overflow-hidden border border-white/5 relative flex items-center justify-center">
                      {previews[hook.id] ? (
                        <video 
                          src={previews[hook.id]} 
                          autoPlay 
                          loop 
                          muted 
                          playsInline 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="text-white/20 flex flex-col items-center">
                          <Sparkles size={20} className="mb-2 opacity-50" />
                          <span className="text-[10px] font-medium uppercase tracking-widest opacity-50">No Preview</span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-white/50 mb-4 line-clamp-3 leading-relaxed flex-1">
                      {hook.visualPrompt.replace(/^Length:.*?\n+/im, '')}
                    </div>

                    <div className="mt-auto space-y-2">
                      <div className="bg-black/40 rounded-xl p-2.5 border border-white/5">
                        <p className="text-[9px] text-white/30 uppercase font-bold tracking-wider mb-1">Best For</p>
                        <p className="text-[11px] text-white/70">{hook.bestFor}</p>
                      </div>
                      
                      <div className="bg-[#c8f135]/5 rounded-xl p-2.5 border border-[#c8f135]/10">
                        <p className="text-[9px] text-[#c8f135]/50 uppercase font-bold tracking-wider mb-1">Dialogue</p>
                        <p className="text-[11px] text-[#c8f135] font-medium">"{hook.exampleDialogue}"</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
