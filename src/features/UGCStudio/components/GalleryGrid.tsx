import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useUGC } from '../context/UGCContext';
import { motion } from 'motion/react';
import { Play, Video, Download, Wand2, Plus, Film, Clock } from 'lucide-react';
import { resolveUrl } from '../../../config/apiConfig';
import type { GalleryItem } from '../context/UGCContext';

// Resolve a numeric timestamp from a gallery item
const getItemTimestamp = (item: GalleryItem): number => {
  if (item.createdAt) return item.createdAt;
  if (item.id) {
    // Handles ids like '1781691096213' (Date.now()) or 'local_1781..._xyz'
    const parts = item.id.replace(/^[a-z\-]+_?/i, '').split('_');
    const t = parseInt(parts[0]);
    if (!isNaN(t) && t > 1_000_000_000_000) return t; // valid ms timestamp
  }
  return 0;
};

// Human-readable relative time label
const relativeTime = (ts: number): string => {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5)   return 'just now';
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// Helper to resolve video URLs without proxying external URLs, enabling browser range requests for thumbnails
const resolveVideoUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  return resolveUrl(url);
};

// ── VideoThumbnail ─────────────────────────────────────────────────────────────
// Displays a preview frame of the video at 0.5s natively without preloading the full video.
function VideoThumbnail({ url, className }: { url: string; className?: string }) {
  const resolved = resolveVideoUrl(url);
  const videoSrc = resolved.startsWith('blob:') || resolved.startsWith('data:') ? resolved : `${resolved}#t=0.5`;
  return (
    <div className={`relative w-full h-full ${className || ''}`}>
      <video
        key={videoSrc}
        src={videoSrc}
        className="w-full h-full object-cover"
        preload="metadata"
        playsInline
        muted
      />
    </div>
  );
}

export default function GalleryGrid() {
  const {
    gallery,
    galleryTab,
    setGalleryTab,
    setGalleryExpandItem,
    isGeneratingVideo,
    videoProgressMsg,
    isGeneratingImage,
    imageProgressMsg,
    thIsGeneratingImg,
    isGeneratingMontageImg,
    montageImgProgressMsg,
    isRegeneratingImage,
    setInpaintImg,
    splitScenes,
    setSplitScenes,
    activeSplitTab,
    attachedRefImage,
    setAttachedRefImage,
    showToast,
  } = useUGC();

  const isGeneratingImg = isGeneratingImage || thIsGeneratingImg || isGeneratingMontageImg || isRegeneratingImage;
  const imageMsg = isRegeneratingImage
    ? 'Regenerating Image...'
    : isGeneratingMontageImg
    ? (montageImgProgressMsg || 'Generating Montage...')
    : thIsGeneratingImg
    ? 'Generating Creator Image...'
    : (imageProgressMsg || 'Generating Image...');

  // Track images that failed to load so we can hide them
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());
  const markBroken = useCallback((id: string) => {
    setBrokenIds(prev => { const next = new Set(prev); next.add(id); return next; });
  }, []);

  // Separate loading placeholders from real items, then sort newest-first by generation time
  const loadingItems = gallery.filter(item => item.loading);
  const realItems = gallery
    .filter(item => !item.loading && item.url && !brokenIds.has(item.id))
    .sort((a, b) => getItemTimestamp(b) - getItemTimestamp(a));

  return (
    <div id="tour-script" className="flex-1 min-w-0 flex flex-col overflow-hidden min-h-0">
      {/* Filter tabs row */}
      {realItems.length > 0 && (
        <div className="flex gap-1 mb-2 px-1">
          {(['all', 'image', 'video'] as const).map(t => (
            <button
              key={t}
              onClick={() => setGalleryTab(t)}
              className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider transition-all ${
                galleryTab === t
                  ? 'bg-[#c8f135] text-black'
                  : 'text-white/30 border border-white/10 hover:text-white/60'
              }`}
            >
              {t}
              {t === 'all' && <span className="ml-1 opacity-60">{realItems.length}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0a0a0a]" style={{ paddingBottom: '120px', minHeight: 0 }}>
        {(isGeneratingVideo || isGeneratingImg) && realItems.length === 0 && loadingItems.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 min-h-[300px]">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-white/5" />
              <div className="absolute inset-0 rounded-full border-4 border-t-[#c8f135] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              {isGeneratingVideo ? (
                <Film className="absolute inset-0 m-auto w-6 h-6 text-[#c8f135]" />
              ) : (
                <Wand2 className="absolute inset-0 m-auto w-6 h-6 text-[#c8f135]" />
              )}
            </div>
            <p className="text-[10px] font-mono text-[#c8f135] uppercase tracking-widest animate-pulse">
              {isGeneratingVideo ? (videoProgressMsg || 'Generating…') : (imageMsg || 'Generating…')}
            </p>
          </div>
        ) : realItems.length === 0 && loadingItems.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center gap-3 min-h-[300px] select-none">
            <div className="w-14 h-14 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center">
              <Film size={22} className="text-white/15" />
            </div>
            <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Generated assets appear here</p>
            <p className="text-[8px] text-white/10 font-mono">Generate an image or video to get started</p>
          </div>
        ) : (
          <div className="p-2 grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {/* Spinner tile while generating next video */}
            {isGeneratingVideo && (
              <div className="w-full rounded-lg border border-white/10 bg-white/3 flex flex-col items-center justify-center gap-2 aspect-[9/16]">
                <div className="relative w-7 h-7">
                  <div className="absolute inset-0 rounded-full border-2 border-t-[#c8f135] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                  <Film className="absolute inset-0 m-auto w-3 h-3 text-[#c8f135]" />
                </div>
                <span className="text-[7px] text-white/30 font-bold uppercase tracking-widest">Generating…</span>
              </div>
            )}
            {/* Loading placeholder tiles — injected into gallery at generation start */}
            {loadingItems.map(item => (
              <div
                key={item.id}
                className="w-full rounded-lg border border-[#c8f135]/20 bg-[#0d0d0d] flex flex-col items-center justify-center gap-2 aspect-[9/16] relative overflow-hidden"
              >
                {/* Shimmer sweep animation */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
                  style={{ animation: 'shimmer 1.8s infinite', transform: 'translateX(-100%)' }}
                />
                <div className="relative w-8 h-8">
                  <div className="absolute inset-0 rounded-full border-2 border-[#c8f135]/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-[#c8f135] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                  <Wand2 className="absolute inset-0 m-auto w-3.5 h-3.5 text-[#c8f135]" />
                </div>
                <span className="text-[7px] text-[#c8f135] font-bold uppercase tracking-widest animate-pulse">
                  {imageMsg || 'Generating…'}
                </span>
              </div>
            ))}
            {realItems
              .filter(item => galleryTab === 'all' || item.type === galleryTab)
              .map((item, idx) => {
                const ts = getItemTimestamp(item);
                const timeLabel = relativeTime(ts);
                return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="relative group rounded-lg overflow-hidden cursor-pointer w-full aspect-[9/16]"
                  onClick={() => setGalleryExpandItem(item)}
                >
                  {item.type === 'video' ? (
                    <div className="w-full h-full relative bg-black/60 flex items-center justify-center">
                      <VideoThumbnail url={item.url} className="w-full h-full" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity duration-200">
                        <div className="w-10 h-10 rounded-full bg-black/70 border border-white/30 flex items-center justify-center shadow-lg">
                          <Play size={14} className="text-white fill-white ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded-md pointer-events-none">
                        <Video size={9} className="text-[#c8f135]" />
                        <span className="text-[7px] text-[#c8f135] font-black uppercase">Video</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full relative bg-black/60 flex items-center justify-center overflow-hidden">
                      <img
                        src={resolveUrl(item.url)}
                        alt={`gen-${idx}`}
                        className="w-full h-full object-cover"
                        onError={() => markBroken(item.id)}
                      />
                    </div>
                  )}
                  {/* NEW badge — always on the freshest item (idx 0 after sort) */}
                  {idx === 0 && (
                    <span className="absolute top-1.5 left-1.5 text-[7px] bg-[#c8f135] text-black font-black px-1 py-0.5 rounded uppercase tracking-wider z-10">
                      New
                    </span>
                  )}
                  {/* Relative timestamp — bottom-left, shown whenever we have a time */}
                  {timeLabel && idx !== 0 && (
                    <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 text-[6.5px] bg-black/70 text-white/50 font-mono px-1 py-0.5 rounded z-10">
                      <Clock size={6} className="shrink-0" />
                      {timeLabel}
                    </span>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-10">
                    <div className="flex gap-1.5">
                      {item.type === 'video' && (
                        <button
                          title="Play"
                          onClick={e => {
                            e.stopPropagation();
                            setGalleryExpandItem(item);
                          }}
                          className="w-9 h-9 flex items-center justify-center bg-[#c8f135] hover:bg-[#b0d62a] text-black rounded-xl transition-all shadow-lg hover:scale-105 active:scale-95"
                        >
                          <Play size={14} className="fill-black ml-0.5" />
                        </button>
                      )}
                      <button
                        title="Save"
                        onClick={async e => {
                          e.stopPropagation();
                          const ext = item.type === 'video' ? 'mp4' : 'png';
                          try {
                            const res = await fetch(resolveUrl(item.url));
                            const blob = await res.blob();
                            const blobUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = `ugc-${item.id}.${ext}`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(blobUrl);
                          } catch {
                            /* fallback */
                            const a = document.createElement('a');
                            a.href = resolveUrl(item.url);
                            a.download = `ugc-${item.id}.${ext}`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }
                        }}
                        className="w-9 h-9 flex items-center justify-center bg-black/80 hover:bg-white/25 rounded-xl text-white text-sm font-black border border-white/20 transition-all shadow-lg"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                    {item.type === 'image' && (() => {
                      const isAttachedToActiveScene =
                        splitScenes.length > 0 && splitScenes[activeSplitTab]?.refImage === item.url;
                      const isAttachedToGlobal = splitScenes.length === 0 && attachedRefImage === item.url;
                      const isAdded = isAttachedToActiveScene || isAttachedToGlobal;

                      return (
                        <button
                          title="Attach for video"
                          onClick={e => {
                            e.stopPropagation();
                            if (splitScenes.length > 0) {
                              setSplitScenes((prev: any[]) =>
                                prev.map((s, idx) => (idx === activeSplitTab ? { ...s, refImage: item.url } : s))
                              );
                              showToast('Image attached to active scene!', 'success');
                            } else {
                              setAttachedRefImage(item.url);
                              showToast('Image attached — ready to make a video!', 'success');
                            }
                          }}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border transition-all shadow-lg text-[8px] font-black uppercase tracking-wider ${
                            isAdded
                              ? 'bg-[#c8f135] text-black border-[#c8f135]'
                              : 'bg-black/80 hover:bg-[#c8f135]/20 hover:border-[#c8f135]/50 text-white hover:text-[#c8f135] border-white/20'
                          }`}
                        >
                          <Plus size={10} /> {isAdded ? 'Added' : 'Use for Video'}
                        </button>
                      );
                    })()}
                  </div>
                </motion.div>
              );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
