import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useUGC } from '../context/UGCContext';
import { motion } from 'motion/react';
import { Play, Video, Download, Wand2, Plus, Film, Clock, AlertCircle, Trash2, X, RotateCcw, CheckCircle2, ShieldAlert } from 'lucide-react';
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
// Lazy-loads video preview natively with IntersectionObserver to keep mobile gallery at 60 FPS
function VideoThumbnail({ url, className }: { url: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const resolved = resolveVideoUrl(url);
  const videoSrc = resolved.startsWith('blob:') || resolved.startsWith('data:') ? resolved : `${resolved}#t=0.5`;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin: '200px 0px', threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full h-full bg-[#111113] overflow-hidden ${className || ''}`}>
      {isVisible ? (
        <video
          key={videoSrc}
          src={videoSrc}
          className="w-full h-full object-cover"
          preload="metadata"
          playsInline
          muted
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-white/[0.02]">
          <div className="w-4 h-4 rounded-full bg-white/5 animate-pulse" />
        </div>
      )}
    </div>
  );
}

interface GalleryGridProps {
  onSetStartFrame?: (img: { url: string; file?: File } | null) => void;
  startFrameUrl?: string;
  onSetRealtor?: (img: { url: string; file?: File } | null) => void;
  realtorUrl?: string;
}

export default function GalleryGrid({ onSetStartFrame, startFrameUrl, onSetRealtor, realtorUrl }: GalleryGridProps) {
  const {
    gallery,
    setGallery,
    galleryTab,
    setGalleryTab,
    setGalleryExpandItem,
    isGeneratingVideo,
    videoProgressMsg,
    generateVideo,
    isGeneratingImage,
    imageProgressMsg,
    generateImage,
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
    attachedRefImages,
    setAttachedRefImages,
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

  // Separate loading placeholders, failed items, and real items
  const loadingItems = gallery.filter(item => item.loading && (galleryTab === 'all' || item.type === galleryTab));
  const failedItems = gallery.filter(item => !item.loading && item.error && (galleryTab === 'all' || item.type === galleryTab));
  const realItems = gallery
    .filter(item => !item.loading && !item.error && item.url && !brokenIds.has(item.id))
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
        {(isGeneratingVideo || isGeneratingImg) && realItems.length === 0 && loadingItems.length === 0 && failedItems.length === 0 ? (
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
        ) : realItems.length === 0 && loadingItems.length === 0 && failedItems.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center gap-3 min-h-[300px] select-none">
            <div className="w-14 h-14 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center">
              <Film size={22} className="text-white/15" />
            </div>
            <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Generated assets appear here</p>
            <p className="text-[8px] text-white/10 font-mono">Generate an image or video to get started</p>
          </div>
        ) : (
          <div className="p-2 grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {/* Failed generation tiles */}
            {failedItems.map(item => {
              const isVideo = item.type === 'video';
              const isPolicy = Boolean(
                item.error?.includes('Responsible AI') ||
                item.error?.includes('policy') ||
                item.error?.includes('Policy') ||
                item.error?.includes('prohibited') ||
                item.error?.includes('recognizable') ||
                item.error?.includes('content_blocked') ||
                item.error?.includes('prominent individuals')
              );

              return (
                <div
                  key={item.id}
                  className={`w-full rounded-2xl flex flex-col items-center justify-between p-3 aspect-[9/16] relative overflow-hidden shadow-xl group transition-all ${
                    isPolicy
                      ? 'border-2 border-amber-500/50 bg-gradient-to-b from-[#1c1408] to-[#0f0b04]'
                      : 'border-2 border-red-500/40 bg-gradient-to-b from-[#180b0c] to-[#0d0506]'
                  }`}
                >
                  {/* Top-Right Direct Dismiss / X Button */}
                  <button
                    onClick={() => {
                      setGallery(prev => prev.filter(i => i.id !== item.id));
                    }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 hover:bg-red-500 text-white/70 hover:text-white transition-all cursor-pointer z-20 flex items-center justify-center border border-white/10 shadow-md"
                    title="Dismiss Card"
                  >
                    <X size={11} />
                  </button>

                  <div className="w-full flex flex-col items-center justify-center flex-1 gap-1.5 text-center my-auto px-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isPolicy ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      <AlertCircle size={16} />
                    </div>

                    <span className={`text-[9.5px] font-black uppercase tracking-wider ${
                      isPolicy ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {isPolicy ? 'Google Policy Restriction' : (isVideo ? 'Video Generation Failed' : 'Image Generation Failed')}
                    </span>

                    <div className="w-full bg-black/50 rounded-lg p-2 border border-white/5 my-0.5">
                      <p className="text-[8px] text-white/80 leading-relaxed font-sans max-h-20 overflow-y-auto px-1 custom-scrollbar text-center">
                        {item.error || 'Server error or generation interrupted.'}
                      </p>
                    </div>

                    {isPolicy && (
                      <span className="text-[7.5px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={8} />
                        ✓ Shorts credits refunded
                      </span>
                    )}
                  </div>

                  <div className="w-full flex gap-1.5 pt-2 border-t border-white/10 shrink-0 z-10">
                    <button
                      onClick={() => {
                        setGallery(prev => prev.filter(i => i.id !== item.id));
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[8.5px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>Dismiss</span>
                    </button>
                    <button
                      onClick={() => {
                        setGallery(prev => prev.filter(i => i.id !== item.id));
                        if (isVideo) {
                          generateVideo(item.prompt);
                        } else {
                          generateImage(item.prompt);
                        }
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-[#c8f135] hover:bg-[#d8ff43] text-black text-[8.5px] font-black uppercase tracking-widest transition-all shadow-md cursor-pointer flex items-center justify-center gap-1"
                    >
                      <RotateCcw size={9} />
                      <span>Retry</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Loading placeholder tiles — injected into gallery at generation start */}
            {loadingItems.map(item => {
              const isVideo = item.type === 'video';
              const progressMsg = isVideo ? (videoProgressMsg || 'Generating Video...') : (imageMsg || 'Generating Image...');
              return (
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
                    {isVideo ? (
                      <Film className="absolute inset-0 m-auto w-3.5 h-3.5 text-[#c8f135]" />
                    ) : (
                      <Wand2 className="absolute inset-0 m-auto w-3.5 h-3.5 text-[#c8f135]" />
                    )}
                  </div>
                  <span className="text-[8px] text-[#c8f135] font-black uppercase tracking-widest text-center px-2 animate-pulse">
                    {progressMsg}
                  </span>
                </div>
              );
            })}
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
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-opacity duration-200"
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
                    {item.type === 'image' && (
                      <div className="flex flex-col gap-1 w-[90%] px-1 relative z-25">
                        {/* Start Frame / Outfit Lock Button */}
                        {onSetStartFrame && (
                          <button
                            title={startFrameUrl === item.url ? 'Start Frame Locked' : 'Set as Start Frame / Outfit Lock'}
                            onClick={e => {
                              e.stopPropagation();
                              if (startFrameUrl === item.url) {
                                onSetStartFrame(null);
                                showToast('Removed from Start Frame', 'info');
                              } else {
                                onSetStartFrame({ url: item.url });
                                showToast('Set as Start Frame / Outfit Lock!', 'success');
                              }
                            }}
                            className={`w-full flex items-center justify-center gap-1 py-1 rounded-lg border transition-all text-[7.5px] font-black uppercase tracking-wider ${
                              startFrameUrl === item.url
                                ? 'bg-[#c8f135] text-black border-[#c8f135]'
                                : 'bg-black/80 hover:bg-[#c8f135]/20 hover:border-[#c8f135]/50 text-white hover:text-[#c8f135] border-white/20'
                            }`}
                          >
                            <Film size={8} /> {startFrameUrl === item.url ? 'Start Frame Set' : 'Use as Start Frame'}
                          </button>
                        )}

                        {/* Agent / Face Reference Button */}
                        {onSetRealtor && (
                          <button
                            title={realtorUrl === item.url ? 'Agent Face Locked' : 'Set as Agent / Face Reference'}
                            onClick={e => {
                              e.stopPropagation();
                              if (realtorUrl === item.url) {
                                onSetRealtor(null);
                                showToast('Removed from Agent Reference', 'info');
                              } else {
                                onSetRealtor({ url: item.url });
                                showToast('Set as Agent / Face Reference!', 'success');
                              }
                            }}
                            className={`w-full flex items-center justify-center gap-1 py-1 rounded-lg border transition-all text-[7.5px] font-black uppercase tracking-wider ${
                              realtorUrl === item.url
                                ? 'bg-[#c8f135] text-black border-[#c8f135]'
                                : 'bg-black/80 hover:bg-[#c8f135]/20 hover:border-[#c8f135]/50 text-white hover:text-[#c8f135] border-white/20'
                            }`}
                          >
                            <Plus size={8} /> {realtorUrl === item.url ? 'Agent Set' : 'Use as Agent'}
                          </button>
                        )}

                        {/* Existing Attach reference button */}
                        {(() => {
                          const activeSceneRefs: string[] = splitScenes.length > 0
                            ? (splitScenes[activeSplitTab]?.refImages || (splitScenes[activeSplitTab]?.refImage ? [splitScenes[activeSplitTab].refImage as string] : []))
                            : [];
                          const isAttachedToActiveScene = splitScenes.length > 0 && activeSceneRefs.includes(item.url);
                          const isAttachedToGlobal = splitScenes.length === 0 && (attachedRefImages || []).includes(item.url);
                          const isAdded = isAttachedToActiveScene || isAttachedToGlobal;
                          const isFull = splitScenes.length > 0 ? activeSceneRefs.length >= 3 : (attachedRefImages || []).length >= 3;

                          return (
                            <button
                              title={isAdded ? 'Remove reference' : isFull ? 'Max 3 refs' : 'Attach for video'}
                              onClick={e => {
                                e.stopPropagation();
                                if (splitScenes.length > 0) {
                                  setSplitScenes((prev: any[]) =>
                                    prev.map((s, idx) => {
                                      if (idx !== activeSplitTab) return s;
                                      const currentRefs: string[] = s.refImages || (s.refImage ? [s.refImage] : []);
                                      let newRefs: string[];
                                      if (currentRefs.includes(item.url)) {
                                        newRefs = currentRefs.filter((r: string) => r !== item.url);
                                      } else if (currentRefs.length < 3) {
                                        newRefs = [...currentRefs, item.url];
                                      } else {
                                        showToast('Max 3 reference images per scene', 'error');
                                        return s;
                                      }
                                      return { ...s, refImage: newRefs[0] || null, refImages: newRefs };
                                    })
                                  );
                                  showToast(isAdded ? 'Reference removed' : 'Image attached to active scene!', isAdded ? 'info' : 'success');
                                } else {
                                  const currentGlobalRefs = attachedRefImages || [];
                                  let newGlobalRefs: string[];
                                  if (currentGlobalRefs.includes(item.url)) {
                                    newGlobalRefs = currentGlobalRefs.filter((r: string) => r !== item.url);
                                  } else if (currentGlobalRefs.length < 3) {
                                    newGlobalRefs = [...currentGlobalRefs, item.url];
                                  } else {
                                    showToast('Max 3 reference images', 'error');
                                    return;
                                  }
                                  setAttachedRefImages(newGlobalRefs);
                                  setAttachedRefImage(newGlobalRefs[0] || null);
                                  showToast(isAttachedToGlobal ? 'Reference removed' : 'Image attached — ready to make a video!', isAttachedToGlobal ? 'info' : 'success');
                                }
                              }}
                              className={`w-full flex items-center justify-center gap-1 py-1 rounded-lg border transition-all text-[7.5px] font-black uppercase tracking-wider ${
                                isAdded
                                  ? 'bg-[#c8f135] text-black border-[#c8f135]'
                                  : isFull
                                  ? 'bg-black/40 text-white/20 border-white/10 cursor-not-allowed'
                                  : 'bg-black/80 hover:bg-[#c8f135]/20 hover:border-[#c8f135]/50 text-white hover:text-[#c8f135] border-white/20'
                              }`}
                            >
                              <Plus size={8} /> {isAdded ? 'Added to Refs' : isFull ? 'Refs Full' : 'Use as Scene Ref'}
                            </button>
                          );
                        })()}
                      </div>
                    )}
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
