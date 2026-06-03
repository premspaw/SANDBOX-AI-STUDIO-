import React, { useState } from 'react';
import { X, Film, Sparkles, Download, ArrowUpRight, Clock, User } from 'lucide-react';

export default function AvatarGallery({
  isOpen,
  onClose,
  gallery = [],
  onLoadGeneration
}) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'sheet' | 'scene'

  if (!isOpen) return null;

  const filteredGallery = gallery.filter(item => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleDownloadDirect = async (e, url, name) => {
    e.stopPropagation();
    const filename = `zerolens-${name || 'avatar'}.png`;
    
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Response was not OK');
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('[AvatarGallery] Blob download failed, falling back to direct link:', err);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn"
      />

      {/* Slide-over Content Container */}
      <div className="relative w-full max-w-md bg-[#0D0F0A] border-l border-white/5 h-full flex flex-col shadow-2xl animate-slideIn">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-zinc-950/40">
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#C8F135]">
              Avatar History
            </h3>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
              {gallery.length} Saved Generations
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 border border-white/5 text-white/50 hover:text-white hover:border-white/10 transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Navigation */}
        <div className="px-6 py-3.5 border-b border-white/5 flex gap-1.5 bg-zinc-950/20">
          {[
            { id: 'all', label: 'All' },
            { id: 'sheet', label: 'Sheets' },
            { id: 'scene', label: 'Scenes' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 border ${
                filterType === tab.id
                  ? 'border-[#C8F135] bg-[#C8F135]/10 text-[#C8F135]'
                  : 'border-white/5 bg-zinc-900/20 text-white/40 hover:border-white/10 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
          {filteredGallery.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20">
              <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-white/5 flex items-center justify-center text-white/20">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-wider text-white/60">
                  No records found
                </p>
                <p className="text-[10px] text-white/30 max-w-[200px]">
                  {filterType === 'all'
                    ? 'Generate your first cinematic character profile to start saving.'
                    : `No generations under style filter "${filterType}".`}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredGallery.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onLoadGeneration(item);
                    onClose();
                  }}
                  className="group bg-zinc-950 border border-white/5 hover:border-white/10 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-lg flex flex-col"
                >
                  {/* Thumbnail */}
                  <div className="aspect-square bg-zinc-900 overflow-hidden relative border-b border-white/5 flex items-center justify-center">
                    <img
                      src={item.output_url}
                      alt={item.character_name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    
                    {/* Floating Indicators */}
                    <div className="absolute top-2 left-2 flex gap-1">
                      <span className="bg-black/85 backdrop-blur-sm border border-white/10 text-white/80 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1">
                        {item.type === 'sheet' ? (
                          <Sparkles className="w-2.5 h-2.5 text-[#C8F135]" />
                        ) : (
                          <Film className="w-2.5 h-2.5 text-[#C8F135]" />
                        )}
                        {item.type}
                      </span>
                    </div>

                    {/* Action Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                      <div className="p-2 rounded-xl bg-zinc-900 border border-white/15 text-white hover:text-[#C8F135] transition-all">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                      <button
                        onClick={(e) => handleDownloadDirect(e, item.output_url, item.character_name)}
                        className="p-2 rounded-xl bg-zinc-900 border border-white/15 text-white hover:text-[#C8F135] transition-all"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-3 space-y-1.5">
                    <h4 className="text-[11px] font-black uppercase tracking-tight text-white line-clamp-1 flex items-center gap-1">
                      <User className="w-3 h-3 text-[#C8F135] shrink-0" />
                      {item.character_name}
                    </h4>
                    <div className="flex justify-between items-center text-[9px] text-white/35 font-bold uppercase tracking-wider">
                      <span>{item.style}</span>
                      <span className="text-right text-[8px] font-medium">{formatDate(item.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
