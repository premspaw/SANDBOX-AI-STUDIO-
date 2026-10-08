import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Film, Image as ImageIcon, Video, Layers, BookOpen, Clapperboard,
  Upload, Trash2, Check, Zap, Cpu, Code, HelpCircle, RefreshCw, Sliders, Play, Loader2,
  ChevronDown, ChevronLeft, ChevronRight, Users, Tag, Eye, Download, Maximize2, Wand2, Shield, AlertCircle, Camera,
  Volume2, VolumeX, Copy, CheckCheck, FolderOpen, X, Plus
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getApiUrl, resolveUrl } from '../../config/apiConfig';
import { SHORTS_COST } from '../../config/shortsConfig';
import { useAppStore } from '../../store';
import { extractVideoFrame, downloadDirect, getVideoDuration } from '../../lib/videoUtils';
import { SidePanel } from '../cinemaStudio/SidePanel';
import { ReferencePanel } from '../cinemaStudio/ReferencePanel';
import { CinematicLightbox } from '../cinemaStudio/CinematicLightbox';
import { InpaintEditor } from '../common/InpaintEditor';
import { StoryboardEditor } from '../cinemaStudio/StoryboardEditor';
import { LazyVideo } from '../cinemaStudio/LazyVideo';

/* ─── URL NORMALIZATION & DEDUPLICATION HELPERS ─────────────────── */
const getNormalizedPath = (url) => {
  if (!url || typeof url !== 'string') return '';
  let target = url;
  if (target.includes('/api/proxy-image')) {
    try {
      const u = new URL(target.startsWith('http') ? target : `http://localhost${target}`);
      const decoded = u.searchParams.get('url');
      if (decoded) {
        target = decoded;
      }
    } catch (_) {
      /* ignore */
    }
  }
  try {
    if (target.startsWith('http://') || target.startsWith('https://')) {
      return new URL(target).pathname;
    }
  } catch (_) {
    /* ignore */
  }
  if (target.startsWith('/')) {
    return target;
  }
  if (!target.includes(':') && !target.startsWith('data:') && !target.startsWith('blob:')) {
    return '/' + target;
  }
  return target;
};

const deduplicateGallery = (items) => {
  if (!Array.isArray(items)) return [];
  const seenPaths = new Set();
  const seenIds = new Set();
  const result = [];
  for (const item of items) {
    if (!item) continue;
    // Always preserve generating or loading items
    if (item.status === 'generating' || item.loading) {
      result.push(item);
      continue;
    }
    if (!item.url) continue;
    const path = getNormalizedPath(item.url);
    const idStr = String(item.id || '');
    if (idStr && seenIds.has(idStr)) continue;
    if (path && seenPaths.has(path)) {
      const existingIdx = result.findIndex(r => getNormalizedPath(r.url) === path);
      if (existingIdx !== -1) {
        result[existingIdx] = { ...result[existingIdx], ...item };
      }
      continue;
    }
    if (path) seenPaths.add(path);
    if (idStr) seenIds.add(idStr);
    result.push(item);
  }
  return result;
};

const extractItemTimestamp = (asset) => {
  if (!asset) return 0;
  if (asset.loading || asset.status === 'generating' || asset.isLoader) return Date.now() + 10000000;
  if (asset.created_at) {
    const t = new Date(asset.created_at).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (asset.createdAt) {
    const t = typeof asset.createdAt === 'number' ? asset.createdAt : new Date(asset.createdAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  const idMatch = String(asset.id || '').match(/(\d{13})/);
  if (idMatch) {
    const t = Number(idMatch[1]);
    if (!isNaN(t) && t > 1000000000000) return t;
  }
  const strMatch = String(asset.url || asset.name || '').match(/(\d{13})/);
  if (strMatch) {
    const t = Number(strMatch[1]);
    if (!isNaN(t) && t > 1000000000000) return t;
  }
  if (asset.date && asset.date !== 'Recently') {
    const t = new Date(asset.date).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (typeof asset.timestamp === 'number' && asset.timestamp > 0) return asset.timestamp;
  if (typeof asset.ts === 'number' && asset.ts > 0) return asset.ts;
  return 0;
};

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const tsNum = Number(timestamp);
  if (tsNum > now + 60000) return 'Generating...';
  const diffSec = Math.max(0, Math.floor((now - tsNum) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function StudioGalleryCard({
  item,
  layout = 'masonry',
  onOpenLightbox,
  onDownload,
  onDeleteItem,
  onUseAsOmniRef,
  onExtendVideo,
  onRetry,
  onUpscale
}) {
  const isVideo = item.type === 'video' || item.url?.includes('.mp4');
  const isScreenshot = item.engine === 'Screenshot' ||
                       item.engine === 'ZeroLens Frame Extract' ||
                       (typeof item.id === 'string' && item.id.startsWith('frame_')) ||
                       (item.prompt && item.prompt.toLowerCase().startsWith('screenshot'));
  const isSequence = item.type === 'sequence' ||
                     item.engine === 'Sequence' ||
                     item.engine === 'Video Sequence';

  const cleanPromptText = (item.prompt || 'Cinematic Asset')
    .replace(/^Screenshot:\s*/i, '')
    .replace(/ZeroLens Frame Extract/i, '')
    .replace(/ZeroLens extracted frame/i, '')
    .trim();

  const rawAspect = (item.aspectRatio || item.aspect || '16:9').trim();

  // Natural aspect ratio styling matching Cinema Studio — never force pillarbox!
  const getAspectClass = () => {
    if (rawAspect === '9:16') return 'aspect-[9/16]';
    if (rawAspect === '1:1') return 'aspect-square';
    if (rawAspect === '4:3') return 'aspect-[4/3]';
    if (rawAspect === '21:9') return 'aspect-[21/9]';
    return 'aspect-video';
  };

  if (item.status === 'generating') {
    return (
      <div
        className={cn(
          "w-full rounded-2xl border border-[#c8f135]/40 bg-[#0c0c14] relative overflow-hidden shadow-[0_0_30px_rgba(200,241,53,0.2)] flex flex-col justify-between p-3 sm:p-3.5 text-center group",
          getAspectClass()
        )}
      >
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c8f135]/15 to-transparent pointer-events-none"
          style={{ animation: 'shimmer 1.8s infinite', transform: 'translateX(-100%)' }}
        />
        
        {/* Top Badges */}
        <div className="w-full flex items-center justify-between z-10 shrink-0">
          <span className="px-2 py-0.5 rounded-full bg-[#c8f135]/15 text-[#c8f135] border border-[#c8f135]/30 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c8f135] animate-ping" />
            <span className="truncate max-w-[130px] sm:max-w-[160px]">{item.engine || 'Rendering Video'}</span>
          </span>
          <span className="text-[9px] font-mono text-zinc-400 font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 shrink-0">
            {rawAspect} · {item.duration || 5}s
          </span>
        </div>

        {/* Center Spinner */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-1 sm:gap-1.5 my-auto py-0.5">
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 shrink-0">
            <div className="absolute inset-0 rounded-full border-2 border-[#c8f135]/20 animate-ping" />
            <div className="absolute inset-0 rounded-full border-2 border-t-[#c8f135] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            <Film className="absolute inset-0 m-auto w-4 h-4 text-[#c8f135]" />
          </div>
          <div className="space-y-0.5 max-w-[90%] px-1">
            <p className="text-[11px] sm:text-xs font-bold text-white tracking-wide truncate">
              Rendering Video Clip...
            </p>
            <p className="text-[9px] sm:text-[9.5px] text-zinc-400 font-mono line-clamp-1">
              "{cleanPromptText}"
            </p>
          </div>
        </div>

        {/* Bottom Status & Cancel */}
        <div className="w-full flex items-center justify-between pt-1 border-t border-white/5 z-10 shrink-0">
          <span className="text-[9px] font-mono text-[#c8f135]/80 animate-pulse truncate max-w-[75%] text-left">
            Processing job in background...
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id, e); }}
            className="text-[9px] text-zinc-500 hover:text-white transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-white/10 shrink-0"
            title="Cancel / Dismiss"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (item.status === 'failed' || item.status === 'error') {
    const isPolicyViolation = item.error?.includes('Responsible AI') || 
                              item.error?.includes('celebrities') || 
                              item.error?.includes('policy') ||
                              item.error?.includes('Policy') ||
                              item.error?.includes('prohibited') ||
                              item.error?.includes('prominent individuals') ||
                              item.error?.includes('recognizable') ||
                              item.error?.includes('content_blocked') ||
                              item.error?.includes('Content Safety') ||
                              item.error?.includes('violates Google');
    return (
      <div className={cn(
        "w-full rounded-2xl flex flex-col items-center justify-between p-3 sm:p-3.5 relative overflow-hidden shadow-xl group",
        getAspectClass(),
        isPolicyViolation 
          ? "border-2 border-amber-500/50 bg-gradient-to-b from-[#1c1408] to-[#0f0b04]" 
          : "border border-red-500/30 bg-[#160b0c]"
      )}>
        {/* Top-Right Direct Delete / Dismiss Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteItem(item.id, e);
            try {
              window.dispatchEvent(new CustomEvent('zerolens_reset_cooldown'));
            } catch (err) {
              console.debug(err);
            }
          }}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-red-500 text-white/70 hover:text-white transition-all cursor-pointer z-20 flex items-center justify-center border border-white/10 shadow-md"
          title="Delete / Dismiss Card"
        >
          <Trash2 size={11} />
        </button>

        <div className="flex flex-col items-center justify-center flex-1 gap-1.5 text-center w-full my-auto px-1">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
            isPolicyViolation ? "bg-amber-500/20 text-amber-400" : "bg-red-500/10 text-red-400"
          )}>
            <AlertCircle size={18} />
          </div>
          <span className={cn(
            "text-[10px] font-black uppercase tracking-wider",
            isPolicyViolation ? "text-amber-400" : "text-red-400"
          )}>
            {isPolicyViolation ? "Google Policy Restriction" : "Generation Failed"}
          </span>
          <p className="text-[9.5px] text-white/80 leading-relaxed font-sans max-h-16 overflow-y-auto px-1 custom-scrollbar">
            {item.error || 'Server error or quota depleted'}
          </p>
          {isPolicyViolation && (
            <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              ✓ Shorts credits refunded automatically
            </span>
          )}
        </div>
        <div className="w-full flex flex-col gap-1 pt-1.5 border-t border-white/5 shrink-0 z-10">
          {isPolicyViolation ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onRetry && onRetry(item, 'seedance'); }}
                className="w-full py-1 rounded-lg bg-gradient-to-r from-amber-400 to-[#c8f135] text-black text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md hover:brightness-110 flex items-center justify-center gap-1 active:scale-95"
              >
                <Sparkles size={10} className="fill-black text-black" />
                <span>Try with Seedance 2.0</span>
              </button>
              <div className="flex gap-1.5 w-full">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteItem(item.id, e);
                    try {
                      window.dispatchEvent(new CustomEvent('zerolens_reset_cooldown'));
                    } catch (err) {
                      console.debug(err);
                    }
                  }}
                  className="flex-1 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/35 text-red-300 hover:text-red-100 border border-red-500/30 text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm active:scale-95"
                  title="Delete card immediately"
                >
                  <Trash2 size={9} />
                  <span>Delete</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteItem(item.id, e);
                    try {
                      window.dispatchEvent(new CustomEvent('zerolens_reset_cooldown'));
                    } catch (err) {
                      console.debug(err);
                    }
                  }}
                  className="flex-1 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[8.5px] font-black uppercase tracking-widest transition-all cursor-pointer"
                  title="Dismiss card"
                >
                  Dismiss
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onRetry && onRetry(item, 'edit'); }}
                  className="flex-1 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Change Media
                </button>
              </div>
            </>
          ) : (
            <div className="flex gap-1.5 w-full">
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id, e); }}
                className="flex-1 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/35 text-red-300 hover:text-red-100 border border-red-500/30 text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm active:scale-95"
                title="Delete card immediately"
              >
                <Trash2 size={9} />
                <span>Delete</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id, e); }}
                className="flex-1 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[8.5px] font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRetry && onRetry(item); }}
                className="flex-1 py-1 rounded-lg bg-[#c8f135]/20 hover:bg-[#c8f135]/30 text-[#c8f135] text-[8.5px] font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative w-full rounded-2xl bg-[#09090f] border border-white/10 hover:border-[#c8f135]/70 overflow-hidden shadow-xl hover:shadow-[0_0_35px_rgba(200,241,53,0.22)] transition-all duration-300 flex flex-col cursor-pointer select-none",
        getAspectClass()
      )}
      onClick={() => onOpenLightbox(item)}
    >
      {/* Media Layer */}
      <div className="w-full h-full relative bg-black overflow-hidden flex items-center justify-center">
        {isVideo ? (
          <LazyVideo src={item.url} aspect={rawAspect} onOpenLightbox={() => onOpenLightbox(item)} />
        ) : (
          <img
            src={resolveUrl(item.url)}
            alt={cleanPromptText}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            decoding="async"
          />
        )}
      </div>

      {/* Badges Top-Left */}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-20 pointer-events-none">
        {/* 1080p HD Upscaled Badge */}
        {(item.resolution === '1080p' || item.quality?.includes('1080p') || item.prompt?.includes('1080p') || item.engine?.includes('1080p')) && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-fuchsia-500/90 text-white text-[9px] font-black tracking-wider uppercase backdrop-blur-md border border-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.5)]">
            <Zap size={9} className="fill-white" />
            1080p HD
          </span>
        )}

        {/* Aspect Ratio Pill */}
        <span className={cn(
          "px-1.5 py-0.5 rounded-md text-[9px] font-mono font-black tracking-wider backdrop-blur-md shadow-md border",
          rawAspect === '16:9' || rawAspect === '21:9'
            ? "bg-black/85 text-[#c8f135] border-[#c8f135]/50 shadow-[0_0_8px_rgba(200,241,53,0.15)]"
            : rawAspect === '9:16'
            ? "bg-black/85 text-violet-300 border-violet-400/50"
            : "bg-black/85 text-cyan-300 border-cyan-400/50"
        )}>
          {rawAspect}
        </span>

        {/* Duration / Screenshot / Sequence */}
        {isScreenshot ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-amber-400/40 text-amber-300 text-[9px] font-semibold tracking-wide shadow-md">
            <Camera size={10} />
            Screenshot
          </span>
        ) : isSequence ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-cyan-400/40 text-cyan-300 text-[9px] font-semibold tracking-wide shadow-md">
            <Film size={10} />
            Sequence
          </span>
        ) : (isVideo && item.duration) ? (
          <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/20 text-white/90 text-[9px] font-mono font-medium shadow-md">
            {item.duration}s
          </span>
        ) : null}
      </div>

      {/* Floating Action Buttons Top-Right */}
      <div
        className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex items-center gap-1 sm:gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 z-20"
        onClick={e => e.stopPropagation()}
      >

        {/* Use as Omni Reference (Desktop Hover or Lightbox on Mobile) */}
        <button
          onClick={(e) => onUseAsOmniRef(item, e)}
          className="hidden sm:flex p-1 sm:p-2 rounded-lg sm:rounded-xl bg-black/80 hover:bg-[#c8f135] text-white hover:text-black border border-white/20 backdrop-blur-md transition-all shadow-lg cursor-pointer items-center justify-center"
          title={item.type === 'image' ? "Use as Omni Reference Image" : "Use as Omni Reference Video"}
        >
          <Layers size={11} className="sm:w-[13px] sm:h-[13px]" />
        </button>

        {/* Extend Video with Omni Flash (+4s / +8s) */}
        {isVideo && onExtendVideo && (
          <button
            onClick={(e) => { e.stopPropagation(); onExtendVideo(item); }}
            className="hidden sm:flex p-1 sm:p-2 rounded-lg sm:rounded-xl bg-black/80 hover:bg-[#c8f135] text-[#c8f135] hover:text-black border border-[#c8f135]/40 backdrop-blur-md transition-all shadow-[0_0_12px_rgba(200,241,53,0.2)] cursor-pointer items-center justify-center"
            title="Extend Video (+4s with Omni Flash)"
          >
            <Sparkles size={11} className="sm:w-[13px] sm:h-[13px]" />
          </button>
        )}

        {/* Upscale (1080p HD / 2K) */}
        {onUpscale && !item.loading && item.status !== 'generating' && (
          <button
            onClick={(e) => { e.stopPropagation(); onUpscale(item, e); }}
            className="hidden sm:flex p-1 sm:p-2 rounded-lg sm:rounded-xl bg-black/80 hover:bg-fuchsia-500 text-fuchsia-400 hover:text-white border border-fuchsia-500/30 backdrop-blur-md transition-all shadow-lg cursor-pointer items-center justify-center"
            title={isVideo ? "Upscale Video to 1080p HD" : "Upscale Image to 2K"}
          >
            <Zap size={11} className="sm:w-[13px] sm:h-[13px]" />
          </button>
        )}

        {/* Download */}
        <button
          onClick={() => onDownload(item.url, item.type, item.id)}
          className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-black/80 hover:bg-[#c8f135] text-white hover:text-black border border-white/20 backdrop-blur-md transition-all shadow-lg cursor-pointer flex items-center justify-center"
          title="Download Directly to Device"
        >
          <Download size={11} className="sm:w-[13px] sm:h-[13px]" />
        </button>

        {/* Expand / Lightbox */}
        <button
          onClick={() => onOpenLightbox(item)}
          className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-black/80 hover:bg-[#c8f135] text-white hover:text-black border border-white/20 backdrop-blur-md transition-all shadow-lg cursor-pointer flex items-center justify-center"
          title="Expand View / Production Suite"
        >
          <Maximize2 size={11} className="sm:w-[13px] sm:h-[13px]" />
        </button>

        {/* Delete (Desktop Hover or Lightbox on Mobile) */}
        <button
          onClick={(e) => onDeleteItem(item.id, e)}
          className="hidden sm:flex p-1 sm:p-2 rounded-lg sm:rounded-xl bg-black/80 hover:bg-red-500 text-white border border-white/20 backdrop-blur-md transition-all shadow-lg cursor-pointer items-center justify-center"
          title="Delete Asset"
        >
          <Trash2 size={11} className="sm:w-[13px] sm:h-[13px]" />
        </button>
      </div>

      {/* Bottom Metadata & Prompt Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-3 pt-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between gap-3 pointer-events-none z-10">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-white/95 truncate drop-shadow-md leading-tight" title={cleanPromptText}>
            {cleanPromptText}
          </p>
          {item.timestamp && (
            <span className="text-[8px] font-mono text-white/50 block mt-0.5">
              {formatRelativeTime(item.timestamp)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {item.resolution && (
            <span className="px-1.5 py-0.5 rounded bg-black/70 border border-white/15 text-[#c8f135] font-black uppercase text-[8px] font-mono backdrop-blur-sm shadow-sm">
              {item.resolution}
            </span>
          )}
          {!isScreenshot && !isSequence && (
            <span className="px-1.5 py-0.5 rounded bg-black/70 border border-white/10 text-white/70 text-[8px] font-bold uppercase font-mono backdrop-blur-sm shadow-sm">
              {item.engine?.toLowerCase().includes('omni') ? 'Omni' : (item.engine?.includes('kling') ? 'Kling' : (item.engine || 'VEO'))}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudioPage() {
  const { userProfile, updateShortsBalance, fetchUnifiedGallery } = useAppStore();
  const setShowingAuthModal = useAppStore(state => state.setShowingAuthModal);
  const userId = userProfile?.id || null;
  const userCredits = useAppStore(state => state.userShorts) ?? 100;
  const spendShorts = useAppStore(state => state.spendShorts);
  const refreshShorts = useAppStore(state => state.fetchBalance);

  // Video Extension States for Gemini Omni 1.1 Flash
  const storeExtensionSourceVideo = useAppStore(state => state.extensionSourceVideo);
  const storeSetExtensionSourceVideo = useAppStore(state => state.setExtensionSourceVideo);
  const [localExtensionSourceVideo, setLocalExtensionSourceVideo] = useState(null);
  const extensionSourceVideo = storeExtensionSourceVideo || localExtensionSourceVideo;
  const setExtensionSourceVideo = useCallback((video) => {
    setLocalExtensionSourceVideo(video);
    if (storeSetExtensionSourceVideo) storeSetExtensionSourceVideo(video);
  }, [storeSetExtensionSourceVideo]);

  const [extensionDuration, setExtensionDuration] = useState(4);
  const [extensionPrompt, setExtensionPrompt] = useState('');

  const checkAuthAndRun = useCallback((fn) => {
    if (!userId) {
      if (setShowingAuthModal) setShowingAuthModal(true);
      return;
    }
    fn();
  }, [userId, setShowingAuthModal]);

  // Active Engine & Mode State
  const [activeEngine, setActiveEngine] = useState('gemini-omni-1.1-flash');
  const [activeTab, setActiveTab] = useState('video');
  const [panelTab, setPanelTab] = useState('omni'); // 'omni' | 'omni-multi' | 'motion'

  // Input & Parameter States
  const [promptText, setPromptText] = useState('');
  const [omniPromptText, setOmniPromptText] = useState('');
  const [duration, setDuration] = useState(4);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('720p');
  const [generateAudio, setGenerateAudio] = useState(true);
  const [omniTask, setOmniTask] = useState('auto');

  // Keyframe Conditioning States
  const [firstFrameImage, setFirstFrameImage] = useState('');
  const [firstFramePreview, setFirstFramePreview] = useState('');
  const [lastFrameImage, setLastFrameImage] = useState('');
  const [lastFramePreview, setLastFramePreview] = useState('');

  // Omni Flash Specific Conditioning
  const [omniFirstFrameImage, setOmniFirstFrameImage] = useState('');
  const [omniFirstFramePreview, setOmniFirstFramePreview] = useState('');
  const [omniLastFrameImage, setOmniLastFrameImage] = useState('');
  const [omniLastFramePreview, setOmniLastFramePreview] = useState('');
  const [omniRefImages, setOmniRefImages] = useState(['', '', '', '', '']);
  const [omniRefPreviews, setOmniRefPreviews] = useState(['', '', '', '', '']);
  const [omniMultiImages, setOmniMultiImages] = useState(['', '', '', '']);
  const [omniMultiVideos, setOmniMultiVideos] = useState(['', '', '']);
  const [omniRefVideoPreview, setOmniRefVideoPreview] = useState('');
  const [omniRefVideoDuration, setOmniRefVideoDuration] = useState(0);
  const lastGenerateTimestampRef = useRef(0);

  // Kling 3.0 Motion Control Conditioning States
  const [motionSubjectImage, setMotionSubjectImage] = useState('');
  const [motionSubjectPreview, setMotionSubjectPreview] = useState('');
  const [motionRefVideo, setMotionRefVideo] = useState('');
  const [motionRefVideoPreview, setMotionRefVideoPreview] = useState('');
  const [motionRefVideoDuration, setMotionRefVideoDuration] = useState(5);
  const [motionMode, setMotionMode] = useState('720p');
  const [characterOrientation, setCharacterOrientation] = useState('video');
  const [backgroundSource, setBackgroundSource] = useState('input_video');

  // Upload Reference Target
  const [uploadTarget, setUploadTarget] = useState(null);
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  // Reference Board States
  const [showRefBoard, setShowRefBoard] = useState(false);
  const [stagedRefBoard, setStagedRefBoard] = useState([]);
  const [showLibPicker, setShowLibPicker] = useState(false);
  const [libPickerTarget, setLibPickerTarget] = useState(null);
  const [activeRefUploadCategory, setActiveRefUploadCategory] = useState(null);
  const refUploadInputRef = useRef(null);
  const [seedanceRefs, setSeedanceRefs] = useState([]);

  // Projects / Folders State from useAppStore
  const projects = useAppStore(state => state.projects || [{ id: 'default', name: 'Default Project' }]);
  const setProjects = useAppStore(state => state.setProjects);
  const activeProjectId = useAppStore(state => state.activeProjectId || 'default');
  const setActiveProjectId = useAppStore(state => state.setActiveProjectId);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // ─── GALLERY STATE (IDENTICAL TO CINEMA STUDIO) ───────────────────
  const galleryLSKey = userId && userId !== 'anon'
    ? `cinematic_studio_gallery_${userId}`
    : 'cs_studio_gallery';

  const [gallery, setGallery] = useState(() => {
    try {
      const cached = (galleryLSKey && localStorage.getItem(galleryLSKey)) ||
                     localStorage.getItem('cs_studio_gallery') ||
                     localStorage.getItem('cs_gallery');
      const parsed = cached ? JSON.parse(cached) : [];
      const filtered = (Array.isArray(parsed) ? parsed : []).filter(item => {
        if (!item || !item.url) return false;
        if (item.status === 'failed' || item.status === 'error') return false;
        const itemId = String(item.id || '');
        const itemUrl = String(item.url || '');
        if (item.type === 'reference_upload') return false;
        const isRefFolder = itemUrl.includes('/uploads/') || itemUrl.includes('/reference/');
        return !itemId.startsWith('default_') && !itemUrl.includes('landing-assets') && !isRefFolder;
      });
      return deduplicateGallery(filtered);
    } catch {
      return [];
    }
  });

  // Dismissed/deleted item IDs — prevents failed/policy cards from being re-added by
  // background polling or zerolens_gallery_updated re-syncs after the user dismisses them.
  const dismissedIdsRef = useRef((() => {
    try { return new Set(JSON.parse(localStorage.getItem('zl_studio_dismissed_ids') || '[]').map(String)); }
    catch { return new Set(); }
  })());
  useEffect(() => {
    const dismissed = dismissedIdsRef.current;
    if (dismissed.size && gallery.some(i => i && dismissed.has(String(i.id)))) {
      setGallery(prev => prev.filter(i => !i || !dismissed.has(String(i.id))));
    }
  }, [gallery]);

  // Debounced gallery persistence to localStorage — guarantees generated videos NEVER disappear
  useEffect(() => {
    if (!galleryLSKey) return;
    const timer = setTimeout(() => {
      try {
        const persistable = gallery.filter(item => item && !item.loading && item.status !== 'generating' && item.status !== 'failed' && item.status !== 'error' && item.url && !item.url.startsWith('blob:'));
        const json = JSON.stringify(persistable.slice(0, 100));
        localStorage.setItem(galleryLSKey, json);
        localStorage.setItem('cs_studio_gallery', json);
        localStorage.setItem('cs_gallery', json);
      } catch (_) {
        /* ignore */
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [gallery, galleryLSKey]);

  // Instant local cache hydration when userId is resolved
  useEffect(() => {
    if (!galleryLSKey) return;
    try {
      const cached = localStorage.getItem(galleryLSKey) || localStorage.getItem('cs_studio_gallery');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const deduped = deduplicateGallery(parsed);
          setGallery(prev => {
            if (prev.length === 0) return deduped;
            const existingUrls = new Set(prev.map(i => getNormalizedPath(i.url)).filter(Boolean));
            const existingIds = new Set(prev.map(i => String(i.id)));
            const extra = deduped.filter(i => !existingIds.has(String(i.id)) && (!i.url || !existingUrls.has(getNormalizedPath(i.url))));
            return deduplicateGallery([...prev, ...extra]);
          });
        }
      }
    } catch (_) {
      /* ignore */
    }
  }, [galleryLSKey]);

  // Fetch previously generated assets from server on mount & userId change
  const [isGalleryLoading, setIsGalleryLoading] = useState(false);
  const fetchAssets = useCallback(async () => {
    if (!userId || userId === 'anon') return;
    setIsGalleryLoading(true);
    try {
      if (typeof fetchUnifiedGallery === 'function') {
        fetchUnifiedGallery(userId, true);
      }
      let resp = await fetch(getApiUrl(`/api/list-assets?userId=${userId}`));
      if (!resp.ok) {
        resp = await fetch(getApiUrl(`/api/ugc/assets/${userId}`));
      }
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.assets && Array.isArray(data.assets)) {
        const loadedAssets = data.assets
          .filter(asset => {
            if (asset.type === 'reference_upload') return false;
            const url = asset.url || '';
            return !url.includes('/uploads/') && !url.includes('/reference/');
          })
          .map(asset => {
            const isVid = asset.type === 'video' || (typeof asset.url === 'string' && (asset.url.includes('.mp4') || asset.url.includes('.webm') || asset.url.includes('.mov')));
            return {
              id: asset.id,
              type: isVid ? 'video' : 'image',
              url: asset.url,
              prompt: asset.prompt || asset.name || '',
              engine: asset.engine || (isVid ? 'Veo 3.1' : 'Nano Banana 2'),
              aspect: asset.aspect || asset.aspectRatio || '16:9',
              aspectRatio: asset.aspect || asset.aspectRatio || '16:9',
              timestamp: extractItemTimestamp(asset),
              ts: extractItemTimestamp(asset),
              projectId: asset.projectId || 'default',
              status: 'completed'
            };
          });

        if (loadedAssets.length > 0) {
          setGallery(prev => {
            const existingUrls = new Set(prev.map(item => getNormalizedPath(item.url)).filter(Boolean));
            const existingIds = new Set(prev.map(item => String(item.id)));
            const newFromServer = loadedAssets.filter(asset => {
              const normPath = getNormalizedPath(asset.url);
              return !existingIds.has(String(asset.id)) && (!normPath || !existingUrls.has(normPath));
            });
            return deduplicateGallery([...prev, ...newFromServer]);
          });
        }
      }
    } catch (err) {
      console.error("[StudioPage] Failed to fetch assets for gallery:", err);
    } finally {
      setIsGalleryLoading(false);
    }
  }, [userId, fetchUnifiedGallery]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Listen to cross-studio real-time gallery updates
  useEffect(() => {
    const handleGalleryUpdate = (e) => {
      if (e?.detail) {
        const item = e.detail;
        if (item && item.url) {
          setGallery(prev => {
            const normPath = getNormalizedPath(item.url);
            const exists = prev.some(p => String(p.id) === String(item.id) || (normPath && getNormalizedPath(p.url) === normPath));
            if (!exists) {
              return deduplicateGallery([item, ...prev]);
            }
            return prev;
          });
        }
      }
    };
    window.addEventListener('zerolens_gallery_updated', handleGalleryUpdate);
    return () => window.removeEventListener('zerolens_gallery_updated', handleGalleryUpdate);
  }, []);

  const activeJobs = useMemo(() => gallery.filter(i => i && (i.status === 'generating' || i.status === 'polling') && i.status !== 'failed' && i.status !== 'error' && i.status !== 'completed'), [gallery]);
  const activeJobsCount = activeJobs.length;

  const maxConcurrent = useMemo(() => {
    const tier = (userProfile?.tier || 'CREATOR').toUpperCase();
    if (tier === 'ENTERPRISE') return 16;
    if (tier === 'STUDIO') return 8;
    if (tier === 'PRO' || tier === 'CREATOR') return 4;
    return 2;
  }, [userProfile?.tier]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMaxConcurrentReached = activeJobsCount >= maxConcurrent;
  const isBusy = isSubmitting || isMaxConcurrentReached;
  const [lightboxItem, setLightboxItem] = useState(null);
  const [showInpaint, setShowInpaint] = useState(false);
  const [showStoryboard, setShowStoryboard] = useState(false);
  const [showAnglesModal, setShowAnglesModal] = useState(false);
  const [angle, setAngle] = useState('eye-level');
  const [upscalingItems, setUpscalingItems] = useState({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [mobileTab, setMobileTab] = useState('controls'); // 'controls' | 'gallery'
  const [galleryFilter, setGalleryFilter] = useState('all'); // 'all' | 'video' | 'image'
  const [folderFilter, setFolderFilter] = useState('all'); // 'all' | 'studio' | 'ugc' | 'marketing' | 'avatar' | 'project_vault'
  const [aspectFilter, setAspectFilter] = useState('all'); // 'all' (All Ratio default)
  const [galleryLayout, setGalleryLayout] = useState('masonry'); // 'masonry' (Masonry default)
  const [galleryDensity, setGalleryDensity] = useState('compact'); // 'compact' (Compact default)

  useEffect(() => {
    let timer = null;
    let lastW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const handleResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const w = window.innerWidth;
        if (Math.abs(w - lastW) > 8) {
          lastW = w;
          setWindowWidth(w);
          const mobile = w < 768;
          setIsMobile(prev => (prev !== mobile ? mobile : prev));
          if (!mobile) {
            setIsSidebarOpen(true);
          }
        }
      }, 80);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const getAspectClass = useCallback((ratio) => {
    if (ratio === '9:16') return 'aspect-[9/16]';
    if (ratio === '1:1') return 'aspect-square';
    if (ratio === '4:3') return 'aspect-[4/3]';
    if (ratio === '21:9') return 'aspect-[21/9]';
    return 'aspect-[16/9]';
  }, []);

  const projectAssets = useAppStore(state => state.projectAssets);

  // Items belonging to current project (before media type or aspect ratio filters)
  const currentProjectItems = useMemo(() => {
    const dismissed = dismissedIdsRef.current;
    const assets = projectAssets || {};
    const baseItems = gallery.filter(item => {
      if (!item) return false;
      if (dismissed && dismissed.has(String(item.id))) return false;

      // Always show generating items
      if (item.status === 'generating' || item.loading) return true;

      // Project / Folder Filter
      if (activeProjectId && activeProjectId !== 'all') {
        const itemProj = item.projectId || item.folder || 'default';
        if (activeProjectId === 'default') {
          if (item.projectId && item.projectId !== 'default' && item.projectId !== 'proj_default') return false;
        } else {
          if (itemProj !== activeProjectId && item.projectId !== activeProjectId) return false;
        }
      }

      return true;
    });

    // Also pull assets from the active project in Project Box
    const activeProjectAssetList = activeProjectId === 'all'
      ? (Array.isArray(assets) ? assets : Object.values(assets).flat())
      : (Array.isArray(assets)
          ? assets.filter(a => (a.projectId || 'default') === activeProjectId)
          : (Array.isArray(assets[activeProjectId]) ? assets[activeProjectId] : []));

    const boxItems = activeProjectAssetList.map(a => {
      const aTs = extractItemTimestamp(a);
      return {
        id: a.id,
        type: a.type || 'video',
        url: a.url,
        prompt: a.prompt || a.name || 'Project Asset',
        engine: a.engine || (a.boardType ? `${a.boardType} Sheet` : 'Project Asset'),
        aspectRatio: a.aspect || a.aspectRatio || '16:9',
        aspect: a.aspect || a.aspectRatio || '16:9',
        timestamp: aTs,
        ts: aTs,
        status: 'completed',
        projectId: a.projectId || (activeProjectId === 'all' ? 'default' : activeProjectId)
      };
    });

    const seenUrls = new Set(baseItems.map(i => getNormalizedPath(i.url) || i.url).filter(Boolean));
    const seenIds = new Set(baseItems.map(i => String(i.id)));
    const merged = [...baseItems];
    boxItems.forEach(b => {
      if (dismissed && dismissed.has(String(b.id))) return;
      const normB = getNormalizedPath(b.url) || b.url;
      if (b.url && !seenUrls.has(normB) && !seenIds.has(String(b.id))) {
        merged.push(b);
        if (normB) seenUrls.add(normB);
        seenIds.add(String(b.id));
      }
    });

    return merged;
  }, [gallery, activeProjectId, projectAssets]);

  const galleryCounts = useMemo(() => {
    let all = 0;
    let video = 0;
    let image = 0;

    currentProjectItems.forEach(item => {
      if (!item) return;
      all++;
      const isVid = item.type === 'video' || (typeof item.url === 'string' && (item.url.includes('.mp4') || item.url.includes('.webm') || item.url.includes('.mov') || item.url.includes('/video/')));
      if (isVid) video++;
      else image++;
    });

    return { all, video, image };
  }, [currentProjectItems]);

  const filteredGallery = useMemo(() => {
    return currentProjectItems.filter(item => {
      if (!item) return false;

      // Always show generating items
      if (item.status === 'generating' || item.loading) return true;

      // 1. Media Type Filter (All / Video / Image)
      const isVid = item.type === 'video' || (typeof item.url === 'string' && (item.url.includes('.mp4') || item.url.includes('.webm') || item.url.includes('.mov') || item.url.includes('/video/')));
      if (galleryFilter === 'video') {
        if (!isVid) return false;
      } else if (galleryFilter === 'image') {
        if (isVid) return false;
      }

      // 2. Aspect Ratio Filter
      if (aspectFilter !== 'all') {
        const raw = (item.aspectRatio || item.aspect || '16:9').trim();
        if (aspectFilter === '16:9') {
          if (raw !== '16:9' && raw !== '21:9') return false;
        } else if (aspectFilter === '9:16') {
          if (raw !== '9:16') return false;
        } else if (aspectFilter === '1:1') {
          if (raw !== '1:1' && raw !== '4:3') return false;
        }
      }

      return true;
    });
  }, [currentProjectItems, galleryFilter, aspectFilter]);

  // Stable newest-first sequence: loading/generating items strictly float to the top
  const displayGalleryItems = useMemo(() => {
    return [...filteredGallery].sort((a, b) => {
      const aLoading = a.loading || a.status === 'generating' || a.isLoader;
      const bLoading = b.loading || b.status === 'generating' || b.isLoader;
      if (aLoading !== bLoading) return aLoading ? -1 : 1;
      return extractItemTimestamp(b) - extractItemTimestamp(a);
    });
  }, [filteredGallery]);

  // Dynamic Tight-Gap Shortest-Column Masonry Balancer (prevents vertical row gaps between 16:9 and 9:16)
  const masonryColumns = useMemo(() => {
    let count;
    if (isMobile) {
      count = windowWidth < 480 ? 1 : 2;
    } else if (galleryDensity === 'compact') {
      count = windowWidth >= 1600 ? 4 : (windowWidth >= 1024 ? 3 : 2);
    } else {
      count = windowWidth >= 1400 ? 3 : 2;
    }

    const cols = Array.from({ length: count }, () => []);
    const heights = Array.from({ length: count }, () => 0);

    displayGalleryItems.forEach((item, idx) => {
      let targetCol;
      if (item.loading || item.status === 'generating' || item.isLoader) {
        targetCol = 0;
      } else if (idx < count) {
        targetCol = idx;
      } else {
        let minCol = 0;
        for (let c = 1; c < count; c++) {
          if (heights[c] < heights[minCol]) {
            minCol = c;
          }
        }
        targetCol = minCol;
      }
      cols[targetCol].push(item);
      const raw = (item.aspectRatio || item.aspect || '16:9').trim();
      const mult = (raw === '9:16') ? 1.7778 : (raw === '1:1' ? 1.0 : (raw === '4:3' ? 0.75 : 0.5625));
      heights[targetCol] += mult;
    });

    return cols;
  }, [displayGalleryItems, isMobile, windowWidth, galleryDensity]);

  // Helper to ensure media URLs (blob, relative, or cloud) are resolved to Base64 before sending to backend
  // Remote URLs (http/https/CDN) and data URLs do not need browser fetch; the backend handles remote fetching without CORS
  const resolveBlobToBase64 = useCallback(async (urlOrItem) => {
    if (!urlOrItem) return null;
    let url = urlOrItem;
    while (url && typeof url === 'object') {
      url = url.url || url.data || url.dataUrl || url.imageUrl || url.videoUrl || '';
    }
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('data:') || !url.startsWith('blob:')) return url;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(url);
        reader.readAsDataURL(blob);
      });
    } catch (_) {
      return url;
    }
  }, []);

  // Handle File Uploads
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const blobUrl = URL.createObjectURL(file);
      if (uploadTarget === 'first') {
        setFirstFramePreview(blobUrl);
        setOmniFirstFramePreview(blobUrl);
      } else if (uploadTarget === 'last') {
        setLastFramePreview(blobUrl);
        setOmniLastFramePreview(blobUrl);
      }

      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result;
        if (uploadTarget === 'first') {
          setFirstFrameImage(dataUrl);
          setOmniFirstFrameImage(dataUrl);
        } else if (uploadTarget === 'last') {
          setLastFrameImage(dataUrl);
          setOmniLastFrameImage(dataUrl);
        }

        try {
          const resp = await fetch(getApiUrl('/api/save-asset'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageData: dataUrl,
              type: 'reference_upload',
              fileName: `frame_${Date.now()}.png`,
              folder: 'reference'
            })
          });
          if (resp.ok) {
            const data = await resp.json();
            const publicUrl = data.url || data.path || dataUrl;
            if (uploadTarget === 'first') {
              setFirstFrameImage(publicUrl);
              setOmniFirstFrameImage(publicUrl);
            } else if (uploadTarget === 'last') {
              setLastFrameImage(publicUrl);
              setOmniLastFrameImage(publicUrl);
            }
          }
        } catch (saveErr) {
          console.debug('[StudioPage] Asset save fallback:', saveErr);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("File upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearRef = (type) => {
    if (type === 'first') {
      setFirstFrameImage('');
      setFirstFramePreview('');
      setOmniFirstFrameImage('');
      setOmniFirstFramePreview('');
    } else if (type === 'last') {
      setLastFrameImage('');
      setLastFramePreview('');
      setOmniLastFrameImage('');
      setOmniLastFramePreview('');
    }
  };

  // Credit calculation (aligned with omniRoutes.js and videoRoutes.js backend)
  const requiredCredits = useMemo(() => {
    if (panelTab === 'motion' || activeEngine.includes('motion') || activeEngine.includes('kling')) {
      const rate = motionMode === 'pro' ? 9 : 7;
      const dur = Math.ceil(motionRefVideoDuration || duration || 5);
      return Math.round(dur * rate);
    }
    if (panelTab === 'transition') {
      if (activeEngine.includes('omni') || activeEngine.includes('flash')) {
        let costPerSec = 5;
        const resLower = (resolution || '720p').toLowerCase();
        if (resLower === '4k') costPerSec = generateAudio ? 19 : 15;
        else if (resLower === '1080p') costPerSec = generateAudio ? 8 : 6;
        else if (resLower === '360p') costPerSec = generateAudio ? 5 : 4;
        else costPerSec = generateAudio ? 6 : 5;
        return Math.ceil(costPerSec * 1.1 * duration);
      }
      const resLower = (resolution || '720p').toLowerCase();
      const isMini = activeEngine === 'seedance-mini';
      const costPerSec = isMini
        ? (resLower === '480p' ? 10 : 15)
        : (resLower === '1080p' ? 70 : (resLower === '480p' ? 15 : 30));
      return Math.ceil(costPerSec * (Number(duration) || 5));
    }
    if (panelTab === 'remix' || activeEngine.includes('remix') || activeEngine.includes('motion-transfer')) {
      const resLower = (resolution || '720p').toLowerCase();
      if (resLower === '1080p') return 12;
      if (resLower === '480p') return 5;
      return 8;
    }
    if (panelTab === 'seedance-2.5' || activeEngine === 'seedance-2.5') {
      const resLower = (resolution || '720p').toLowerCase();
      const costPerSec = resLower === '1080p' ? 70 : (resLower === '480p' ? 15 : 30);
      return Math.ceil(costPerSec * (Number(duration) || 5));
    }
    if (panelTab === 'seedance' || activeEngine.startsWith('seedan') || activeEngine === 'seedace') {
      const resLower = (resolution || '720p').toLowerCase();
      const costPerSec = (activeEngine === 'seedace') ? (resLower === '4k' ? 140 : (resLower === '1080p' ? 70 : (resLower === '480p' ? 15 : 30))) : (activeEngine === 'seedance-mini' ? (resLower === '480p' ? 10 : 15) : (resLower === '480p' ? 15 : 25));
      return Math.ceil(costPerSec * (Number(duration) || 5));
    }
    if (panelTab === 'omni' || panelTab === 'omni-multi' || activeEngine.includes('omni')) {
      let costPerSec = 5;
      const resLower = (resolution || '720p').toLowerCase();
      if (resLower === '4k') costPerSec = generateAudio ? 19 : 15;
      else if (resLower === '1080p') costPerSec = generateAudio ? 8 : 6;
      else if (resLower === '360p') costPerSec = generateAudio ? 5 : 4;
      else costPerSec = generateAudio ? 6 : 5; // 720p
      return Math.ceil(costPerSec * 1.1 * duration);
    }
    return Math.round(duration * 2.5 * (generateAudio ? 1.5 : 1));
  }, [panelTab, activeEngine, resolution, generateAudio, duration, motionMode, motionRefVideoDuration]);

  const canGenerate = userCredits >= requiredCredits;

  // Poll Seedance generation task until completed
  const pollSeedanceTask = async (taskId, activePrompt, activeRatio, engine, tempId) => {
    const engineLabel = engine.includes('fast') ? 'Seedance Fast' : engine.includes('mini') ? 'Seedance Mini' : engine.includes('2.5') ? 'Seedance 2.5 Pro' : 'Seedance 2.0 Pro';
    const targetProj = (activeProjectId === 'all' || !activeProjectId) ? 'default' : activeProjectId;

    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const res = await fetch(getApiUrl(`/api/seedance/status/${taskId}?userId=${userId || ''}&aspectRatio=${encodeURIComponent(activeRatio)}&engine=${encodeURIComponent(engine)}&projectId=${encodeURIComponent(targetProj)}&prompt=${encodeURIComponent(activePrompt || '')}`));
        if (!res.ok) continue;
        const json = await res.json();
        const st = json.status;

        if (st === 'completed') {
          const url = json.url || json.videoUrl || json.video_url || json.resultUrl || json.data?.url;
          if (url) {
            const completedAsset = {
              id: tempId || `asset_${Date.now()}`,
              type: 'video',
              url: url,
              prompt: activePrompt || 'Seedance Video',
              name: activePrompt?.slice(0, 30) || `${engineLabel} Video`,
              engine: engineLabel,
              aspectRatio: activeRatio,
              aspect: activeRatio,
              timestamp: Date.now(),
              createdAt: Date.now(),
              status: 'completed',
              folder: 'studio',
              category: 'generation',
              projectId: targetProj
            };

            // Update in React gallery state
            setGallery(prev => prev.map(item => item.id === tempId ? completedAsset : item));

            // Save to database assets table so it persists across reloads/sessions
            try {
              fetch(getApiUrl('/api/save-asset'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url: completedAsset.url,
                  type: 'video',
                  prompt: completedAsset.prompt,
                  engine: completedAsset.engine,
                  aspect: completedAsset.aspectRatio,
                  projectId: targetProj,
                  userId
                })
              }).catch(e => console.debug('[StudioPage] Save asset fallback:', e));
            } catch (saveErr) {
              console.warn('[StudioPage] Save asset error:', saveErr);
            }

            // Sync with global Project Assets & Universal Gallery store
            try {
              useAppStore.getState().addProjectAsset(completedAsset, targetProj);
            } catch (_) {
              /* ignore */
            }
            try {
              useAppStore.getState().addUnifiedAsset(completedAsset);
            } catch (_) {
              /* ignore */
            }

            const showToast = useAppStore.getState().showToast;
            if (showToast) showToast(`${engineLabel} video rendered!`, 'success');
            return;
          }
        }

        if (st === 'failed' || st === 'error') {
          throw new Error(json.error || json.message || `${engineLabel} generation failed.`);
        }
      } catch (pollErr) {
        if (pollErr.message && !pollErr.message.includes('fetch')) {
          throw pollErr;
        }
      }
    }
    throw new Error(`${engineLabel} generation timed out.`);
  };

  // Omni Flash Video Extension Handler (+4s = 20⚡, +6s = 30⚡, +8s = 40⚡, +10s = 50⚡)
  const handleExtensionGenerate = useCallback(async (overrideOpts = {}) => {
    const targetSource = overrideOpts?.sourceVideo || extensionSourceVideo || useAppStore.getState().extensionSourceVideo;
    if (!targetSource) {
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast("Please select a source video to extend.", "error");
      return;
    }

    const rawVideo = typeof targetSource === 'string'
      ? targetSource
      : (targetSource?.url || targetSource?.videoUrl || targetSource?.data || targetSource?.imageUrl);

    if (!rawVideo) {
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast("Source video URL not found.", "error");
      return;
    }

    const resolvedVideoSrc = resolveUrl(rawVideo);
    const durSec = Number(overrideOpts?.duration || extensionDuration) || 4;
    const reqCredits = durSec * 5;

    if (userCredits < reqCredits) {
      const showToast = useAppStore.getState().showToast;
      if (showToast) {
        showToast(`Insufficient credits. Extension requires ${reqCredits}⚡.`, "error", {
          label: "⚡ Top Up Credits",
          onClick: () => {
            const setTab = useAppStore.getState().setActiveTab;
            if (setTab) setTab('pricing');
          }
        });
      }
      return;
    }

    const finalPrompt = (overrideOpts?.prompt !== undefined ? overrideOpts.prompt : (extensionPrompt || omniPromptText || promptText || ''))?.trim();
    const tempId = `temp-extension-${Date.now()}`;
    const tempItem = {
      id: tempId,
      type: 'video',
      status: 'generating',
      loading: true,
      prompt: finalPrompt ? `Extension (+${durSec}s): ${finalPrompt}` : `Extension (+${durSec}s) Continuous Scene`,
      aspect: targetSource?.aspect || targetSource?.aspectRatio || aspectRatio || '16:9',
      aspectRatio: targetSource?.aspect || targetSource?.aspectRatio || aspectRatio || '16:9',
      timestamp: Date.now(),
      projectId: activeProjectId
    };
    setGallery(prev => [tempItem, ...prev]);

    try {
      const spendResult = await spendShorts(userId, reqCredits, 'omni_video_extension');
      if (!spendResult?.success) {
        throw new Error('Failed to authorize credit deduction.');
      }

      let cleanVideoUrl = rawVideo || resolvedVideoSrc;
      if (typeof cleanVideoUrl === 'string' && cleanVideoUrl.includes('proxy-image?url=')) {
        const match = cleanVideoUrl.match(/[?&]url=([^&]+)/);
        if (match) cleanVideoUrl = decodeURIComponent(match[1]);
      }
      const resolvedVideo = await resolveBlobToBase64(cleanVideoUrl);
      if (!resolvedVideo) {
        throw new Error('Failed to resolve source video file for extension.');
      }

      const rawImgs = (overrideOpts?.images && overrideOpts.images.some(Boolean))
        ? overrideOpts.images
        : (omniMultiImages && omniMultiImages.some(Boolean))
        ? omniMultiImages
        : (omniRefImages && omniRefImages.some(Boolean))
        ? omniRefImages
        : [];
      const resolvedOmniImgs = (await Promise.all(
        (rawImgs || []).filter(Boolean).map(img => resolveBlobToBase64(img))
      )).filter(Boolean);

      const resp = await fetch(getApiUrl('/api/omni-i2v'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video: resolvedVideo,
          sourceVideo: resolvedVideo,
          task: 'extend',
          duration: durSec,
          prompt: finalPrompt,
          motionPrompt: finalPrompt,
          ref_images: resolvedOmniImgs,
          resolution: resolution === '4k' ? '1080p' : resolution,
          generateAudio: generateAudio,
          model: 'gemini-omni-1.1-flash',
          userId,
          projectId: activeProjectId,
          creditReason: 'omni_video_extension'
        })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        let parsedError = `Extension failed (${resp.status})`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed.error) parsedError = parsed.error;
        } catch (_) {
          // Ignore non-JSON response body
        }
        throw new Error(parsedError);
      }

      const data = await resp.json();
      if (!data.videoUrl) throw new Error('Omni Extension returned no videoUrl.');

      const finishedItem = {
        id: Date.now() + Math.random(),
        type: 'video',
        status: 'completed',
        url: data.videoUrl,
        prompt: finalPrompt ? `Extended (+${durSec}s): ${finalPrompt}` : `Extended Scene (+${durSec}s)`,
        engine: 'Omni Flash Extension',
        aspect: targetSource?.aspect || targetSource?.aspectRatio || aspectRatio || '16:9',
        aspectRatio: targetSource?.aspect || targetSource?.aspectRatio || aspectRatio || '16:9',
        timestamp: Date.now(),
        projectId: activeProjectId
      };

      setGallery(prev => prev.map(item => item.id === tempId ? finishedItem : item));
      // Extensions are returned as a public file by Omni but are not recorded
      // by the Omni route, so save a gallery asset for reload/cloud sync.
      fetch(getApiUrl('/api/save-asset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: finishedItem.url,
          type: 'video',
          prompt: finishedItem.prompt,
          engine: finishedItem.engine,
          aspect: finishedItem.aspectRatio,
          projectId: activeProjectId,
          userId
        })
      }).catch(err => console.debug('[StudioPage] Extension gallery persistence fallback:', err));

      try {
        useAppStore.getState().addProjectAsset(finishedItem, activeProjectId);
      } catch (_) {
        /* ignore */
      }
      try {
        useAppStore.getState().addUnifiedAsset(finishedItem);
      } catch (_) {
        /* ignore */
      }

      setExtensionSourceVideo(finishedItem);
      if (refreshShorts) refreshShorts();
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast(`Video successfully extended by +${durSec}s!`, "success");
    } catch (err) {
      console.error('[StudioPage] Extension error:', err);
      setGallery(prev => prev.filter(item => item.id !== tempId));
      const cleanErr = err.message || 'Video extension failed.';
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast(cleanErr, "error");
    }
  }, [
    extensionSourceVideo,
    extensionDuration,
    extensionPrompt,
    omniPromptText,
    promptText,
    aspectRatio,
    activeProjectId,
    userId,
    userCredits,
    spendShorts,
    resolveBlobToBase64,
    omniMultiImages,
    omniRefImages,
    resolution,
    generateAudio,
    setExtensionSourceVideo,
    setGallery,
    refreshShorts
  ]);

  // Omni Flash Video Edit Handler (Gemini Omni Flash 1.1 Preview - task: 'edit')
  const handleOmniEditGenerate = useCallback(async (overrideOpts = {}) => {
    const targetSource = overrideOpts?.sourceVideo || motionRefVideo || motionRefVideoPreview;
    if (!targetSource) {
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast("Please select a source video to edit.", "error");
      return;
    }

    const rawVideo = typeof targetSource === 'string'
      ? targetSource
      : (targetSource?.url || targetSource?.videoUrl || targetSource?.data || targetSource?.imageUrl);

    if (!rawVideo) {
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast("Source video URL not found.", "error");
      return;
    }

    const durSec = Number(overrideOpts?.duration || duration || 5);
    const reqCredits = durSec * 5;

    if (userCredits < reqCredits) {
      const showToast = useAppStore.getState().showToast;
      if (showToast) {
        showToast(`Insufficient credits. Video Edit requires ${reqCredits}⚡.`, "error", {
          label: "⚡ Top Up Credits",
          onClick: () => {
            const setTab = useAppStore.getState().setActiveTab;
            if (setTab) setTab('pricing');
          }
        });
      }
      return;
    }

    const finalPrompt = (overrideOpts?.prompt !== undefined ? overrideOpts.prompt : promptText)?.trim();
    if (!finalPrompt) {
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast("Please describe what to edit or replace in the video.", "error");
      return;
    }

    const tempId = `temp-edit-${Date.now()}`;
    const tempItem = {
      id: tempId,
      type: 'video',
      status: 'generating',
      loading: true,
      prompt: `Omni 1.1 Edit: ${finalPrompt}`,
      aspect: targetSource?.aspect || targetSource?.aspectRatio || aspectRatio || '16:9',
      aspectRatio: targetSource?.aspect || targetSource?.aspectRatio || aspectRatio || '16:9',
      timestamp: Date.now(),
      projectId: activeProjectId
    };

    setGallery(prev => [tempItem, ...prev]);

    try {
      const spendResult = await useAppStore.getState().spendShorts(userId, reqCredits, 'omni_video_edit');
      if (!spendResult?.success) {
        throw new Error('Failed to authorize credit deduction.');
      }

      const resolvedVideo = await resolveBlobToBase64(rawVideo);
      if (!resolvedVideo) {
        throw new Error('Failed to resolve source video file for editing.');
      }

      const rawImgs = overrideOpts?.images || [];
      const resolvedOmniImgs = (await Promise.all(
        (rawImgs || []).filter(Boolean).map(img => resolveBlobToBase64(img))
      )).filter(Boolean);

      const resp = await fetch(getApiUrl('/api/omni-i2v'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video: resolvedVideo,
          sourceVideo: resolvedVideo,
          task: 'edit',
          duration: durSec,
          prompt: finalPrompt,
          motionPrompt: finalPrompt,
          ref_images: resolvedOmniImgs,
          resolution: resolution === '4k' ? '1080p' : resolution,
          generateAudio: generateAudio,
          model: 'gemini-omni-1.1-flash',
          userId,
          projectId: activeProjectId,
          creditReason: 'omni_video_edit'
        })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        let parsedError = `Video Edit failed (${resp.status})`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed.error) parsedError = parsed.error;
        } catch (_) {
          // Ignore
        }
        throw new Error(parsedError);
      }

      const data = await resp.json();
      if (!data.videoUrl) throw new Error('Omni Video Edit returned no videoUrl.');

      const finishedItem = {
        ...tempItem,
        id: data.videoId || tempId,
        url: data.videoUrl,
        videoUrl: data.videoUrl,
        status: 'completed',
        loading: false
      };

      setGallery(prev => prev.map(item => item.id === tempId ? finishedItem : item));

      // Save to Supabase assets
      try {
        fetch(getApiUrl('/api/save-asset'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: data.videoUrl,
            type: 'video',
            prompt: finalPrompt,
            aspect: tempItem.aspectRatio,
            engine: 'gemini-omni-1.1-flash',
            userId,
            projectId: activeProjectId
          })
        }).catch(e => console.debug('[StudioPage] Save asset fallback:', e));
      } catch (saveErr) {
        console.warn('[StudioPage] Save asset error:', saveErr);
      }

      try {
        useAppStore.getState().addProjectAsset(finishedItem, activeProjectId);
      } catch (_) {
        /* ignore */
      }
      try {
        useAppStore.getState().addUnifiedAsset(finishedItem);
      } catch (_) {
        /* ignore */
      }

      if (refreshShorts) refreshShorts();
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast("Omni 1.1 Video Edit finished successfully!", "success");
    } catch (err) {
      console.error('[StudioPage] Video Edit error:', err);
      if (refreshShorts) refreshShorts();
      setGallery(prev => prev.filter(item => item.id !== tempId));
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast(`Video Edit failed: ${err.message}`, "error");
    }
  }, [
    motionRefVideo,
    motionRefVideoPreview,
    duration,
    userCredits,
    promptText,
    aspectRatio,
    activeProjectId,
    userId,
    refreshShorts,
    resolveBlobToBase64,
    resolution,
    generateAudio,
    setGallery
  ]);

  // Handle Generation
  const handleGenerate = async (customPrompt, customEngine, customOptions = {}) => {
    const now = Date.now();
    if (now - lastGenerateTimestampRef.current < 4000) {
      console.warn("[Studio] Duplicate generate call ignored (debounce window active)");
      return;
    }
    lastGenerateTimestampRef.current = now;

    if (customOptions?.task === 'edit' || (panelTab === 'remix' && customOptions?.engine === 'omni')) {
      console.log('[StudioPage] Video edit task detected — delegating generation to handleOmniEditGenerate');
      return handleOmniEditGenerate(customOptions);
    }

    // Video Extension delegation
    const activeExtSource = customOptions?.extensionSourceVideo 
      || customOptions?.sourceVideo 
      || extensionSourceVideo 
      || useAppStore.getState().extensionSourceVideo;

    if (activeExtSource && (panelTab === 'omni-multi' || panelTab === 'omni' || activeEngine.includes('omni') || activeEngine.includes('flash'))) {
      console.log('[StudioPage] Video extension source detected — delegating generation to handleExtensionGenerate');
      const basePrompt = (customPrompt !== undefined && customPrompt !== '')
        ? customPrompt.trim()
        : (extensionPrompt || omniPromptText || promptText || '').trim();
      return handleExtensionGenerate({
        sourceVideo: activeExtSource,
        prompt: basePrompt,
        duration: customOptions?.duration || extensionDuration || 4,
        images: customOptions?.omniMultiImages || omniMultiImages || []
      });
    }

    const engineToUse = customEngine || activeEngine;
    const isRemix = panelTab === 'remix' || engineToUse.includes('remix') || engineToUse.includes('genjutsu') || engineToUse.includes('motion-transfer');
    const isMotion = !isRemix && (panelTab === 'motion' || engineToUse.includes('motion') || engineToUse.includes('kling'));
    const isOmni = !isRemix && !isMotion && (
      engineToUse.includes('omni') || 
      engineToUse.includes('flash') || 
      panelTab === 'omni' || 
      panelTab === 'omni-multi'
    );
    const isSeedance = !isRemix && !isMotion && !isOmni && (
      panelTab === 'transition' || 
      panelTab === 'seedance' || 
      panelTab === 'seedance-2.5' || 
      engineToUse.startsWith('seedan') || 
      engineToUse === 'seedace'
    );
    const promptToUse = customPrompt || (isRemix ? (promptText || '') : isMotion ? (promptText || '') : (isOmni ? omniPromptText : promptText));
    const activeDuration = customOptions?.duration !== undefined ? customOptions.duration : duration;
    const activeRatio = customOptions?.aspectRatio !== undefined ? customOptions.aspectRatio : aspectRatio;
    const activeResolution = customOptions?.resolution !== undefined ? customOptions.resolution : (resolution || '720p').toLowerCase();
    const activeAudio = customOptions?.generateAudio !== undefined ? customOptions.generateAudio : generateAudio;

    // Validation
    const showToast = useAppStore.getState().showToast;
    if (isRemix) {
      const videoUrl = customOptions?.video_url || motionRefVideo || motionRefVideoPreview;
      const imageUrls = customOptions?.image_urls || (motionSubjectImage ? [motionSubjectImage] : [motionSubjectPreview]);
      if (!videoUrl) {
        const errMsg = "Please upload or select a Driving Source Motion Video for Remix.";
        if (showToast) showToast(errMsg, "error");
        else alert(errMsg);
        return;
      }
      if (!imageUrls || imageUrls.length === 0 || !imageUrls[0]) {
        const errMsg = "Please upload or select at least 1 Character / Style Reference Image for Remix.";
        if (showToast) showToast(errMsg, "error");
        else alert(errMsg);
        return;
      }
    } else if (isMotion) {
      const subjectUrl = customOptions?.input_url || motionSubjectImage || motionSubjectPreview;
      const videoUrl = customOptions?.video_url || motionRefVideo || motionRefVideoPreview;
      if (!subjectUrl) {
        const errMsg = "Please upload or select a Subject Reference Image for Motion Control.";
        if (showToast) showToast(errMsg, "error");
        else alert(errMsg);
        return;
      }
      if (!videoUrl) {
        const errMsg = "Please upload or select a Motion Reference Video (3s-30s) for Motion Control.";
        if (showToast) showToast(errMsg, "error");
        else alert(errMsg);
        return;
      }
    } else if (isSeedance) {
      // Seedance allows prompt or reference content
      const hasContent = promptToUse?.trim() || customOptions?.seedanceContentArray?.length > 0 || customOptions?.firstFrame || firstFrameImage || customOptions?.reference_image_urls?.length > 0;
      if (!hasContent) {
        const errMsg = "Please enter prompt text or attach reference assets for Seedance.";
        if (showToast) showToast(errMsg, "error");
        else alert(errMsg);
        return;
      }
    } else {
      if (!promptToUse.trim()) return;
    }

    if (isMaxConcurrentReached) {
      const msg = `Maximum concurrent generation limit reached (${maxConcurrent} jobs). Please wait for an active job to complete.`;
      if (showToast) showToast(msg, "warning");
      else alert(msg);
      return;
    }

    checkAuthAndRun(async () => {
      setIsSubmitting(true);
      const targetProj = (activeProjectId === 'all' || !activeProjectId) ? 'default' : activeProjectId;
      const tempId = 'gen_' + Date.now();
      const isKlingMotion = isMotion && (engineToUse === 'kling-motion' || customOptions?.motionEngine === 'kling');
      const engineDisplayLabel = isRemix
        ? 'Genjutsu Motion Transfer'
        : isMotion 
        ? (isKlingMotion ? `Kling 3.0 (${motionMode === 'pro' ? 'Pro 1080p' : 'Std 720p'})` : 'Motion Control Easy (10s)')
        : isOmni 
        ? 'Omni Flash 1.1'
        : isSeedance 
        ? (engineToUse.includes('fast') ? 'Seedance Fast' : engineToUse.includes('mini') ? 'Seedance Mini' : engineToUse.includes('2.5') ? 'Seedance 2.5 Pro' : 'Seedance 2.0')
        : engineToUse;

      const newClip = {
        id: tempId,
        type: 'video',
        prompt: promptToUse || (isRemix ? 'Genjutsu Motion Transfer' : isMotion ? (isKlingMotion ? 'Kling 3.0 Motion Control' : 'Motion Control Performance Transfer') : isSeedance ? 'Seedance Video' : 'Cinematic Video'),
        engine: engineDisplayLabel,
        duration: isMotion ? (isKlingMotion ? Math.ceil(motionRefVideoDuration || 5) : 10) : activeDuration,
        aspectRatio: activeRatio,
        aspect: activeRatio,
        resolution: isMotion ? (motionMode === 'pro' ? '1080p' : '720p') : activeResolution,
        timestamp: Date.now() + 10000000,
        ts: Date.now() + 10000000,
        status: 'generating',
        loading: true,
        url: null,
        projectId: targetProj
      };

      setGallery(prev => [newClip, ...prev]);

      // Release the submit lock after a short cooldown so a 2nd concurrent job can be queued
      // while this one keeps polling in the background. Concurrency is still capped by
      // activeJobsCount >= maxConcurrent (placeholder above has status 'generating').
      const submitLockTimer = setTimeout(() => setIsSubmitting(false), 8000);

      try {
        if (isRemix) {
          const videoUrl = customOptions?.video_url || motionRefVideo || motionRefVideoPreview;
          const rawImages = customOptions?.image_urls || (motionSubjectImage ? [motionSubjectImage] : [motionSubjectPreview]);

          const resolvedVideo = await resolveBlobToBase64(videoUrl);
          const resolvedImages = await Promise.all((rawImages || []).filter(Boolean).map(img => resolveBlobToBase64(img)));

          const resp = await fetch(getApiUrl('/api/remix/motion-transfer'), {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-user-id': userId || 'anon'
            },
            body: JSON.stringify({
              prompt: promptToUse || '',
              video_url: resolvedVideo || videoUrl,
              image_urls: resolvedImages.filter(Boolean),
              resolution: activeResolution || '720p',
              userId
            })
          });

          if (!resp.ok) {
            const errJson = await resp.json().catch(() => ({}));
            throw new Error(errJson.error || `Motion Transfer failed (${resp.status})`);
          }

          const data = await resp.json();
          const finalUrl = data.videoUrl || data.originalUrl;
          if (!finalUrl) throw new Error(data.error || "No video URL returned from Remix Engine");

          const finishedRemixItem = {
            id: tempId,
            type: 'video',
            status: 'completed',
            url: finalUrl,
            prompt: promptToUse || 'Genjutsu Motion Transfer',
            engine: 'Genjutsu Motion Transfer',
            aspectRatio: activeRatio,
            aspect: activeRatio,
            timestamp: Date.now(),
            projectId: targetProj
          };

          setGallery(prev => prev.map(item => item.id === tempId ? finishedRemixItem : item));

          try {
            fetch(getApiUrl('/api/save-asset'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: finalUrl,
                type: 'video',
                prompt: finishedRemixItem.prompt,
                engine: finishedRemixItem.engine,
                aspect: finishedRemixItem.aspectRatio,
                projectId: targetProj,
                userId
              })
            }).catch(e => console.debug('[StudioPage] Save asset fallback:', e));
          } catch (saveErr) {
            console.warn('[StudioPage] Save asset error:', saveErr);
          }

          try {
            useAppStore.getState().addProjectAsset(finishedRemixItem, targetProj);
          } catch (_) {
            /* ignore */
          }
          try {
            useAppStore.getState().addUnifiedAsset(finishedRemixItem);
          } catch (_) {
            /* ignore */
          }

          if (showToast) showToast("Genjutsu Motion Transfer video rendered!", "success");
          return;
        }

        if (isMotion) {
          const isKlingMotion = engineToUse === 'kling-motion' || customOptions?.motionEngine === 'kling';

          if (isKlingMotion) {
            const subjectUrl = customOptions?.input_url || motionSubjectImage || motionSubjectPreview;
            const videoUrl = customOptions?.video_url || motionRefVideo || motionRefVideoPreview;
            const motionDur = Math.ceil(motionRefVideoDuration || 5);

            const resolvedSubject = await resolveBlobToBase64(subjectUrl);
            const resolvedVideo = await resolveBlobToBase64(videoUrl);

            const motionPayload = {
              prompt: promptToUse || '',
              input_url: resolvedSubject || subjectUrl,
              video_url: resolvedVideo || videoUrl,
              mode: (motionMode === 'pro' || motionMode === '1080p') ? '1080p' : '720p',
              character_orientation: (characterOrientation === 'image') ? 'image' : 'video',
              duration: motionDur,
              aspectRatio: activeRatio,
              userId
            };

            const resp = await fetch(getApiUrl('/api/kling/motion-control'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(motionPayload)
            });

            if (!resp.ok) {
              const errText = await resp.text();
              let parsedError = `Motion Control failed (${resp.status})`;
              try {
                const parsed = JSON.parse(errText);
                if (parsed.error) parsedError = parsed.error;
              } catch (_) {
                if (errText && errText.length < 200 && !errText.startsWith('<')) parsedError = errText;
              }
              throw new Error(parsedError);
            }

            const data = await resp.json();
            const taskId = data.requestId;
            if (!taskId) throw new Error(data.error || "No task ID returned from Kling Motion Control API");

            // Poll Kling task status
            const maxPolls = 120;
            let pollCount = 0;
            let completedUrl = null;

            while (pollCount < maxPolls) {
              await new Promise(r => setTimeout(r, 4500));
              pollCount++;

              try {
                const pollResp = await fetch(getApiUrl(`/api/kling/status/${taskId}?userId=${userId || ''}&aspectRatio=${encodeURIComponent(activeRatio)}`));
                if (pollResp.ok) {
                  const pollData = await pollResp.json();
                  if (pollData.status === 'completed' && pollData.url) {
                    completedUrl = pollData.url;
                    break;
                  } else if (pollData.status === 'failed' || pollData.status === 'error') {
                    throw new Error(pollData.error || 'Kling motion control processing failed');
                  }
                }
              } catch (pollErr) {
                if (pollErr.message && !pollErr.message.includes('fetch')) {
                  throw pollErr;
                }
              }
            }

            if (!completedUrl) {
              throw new Error('Kling motion control timed out after 9 minutes. The task may complete in background.');
            }

            const finishedKlingItem = {
              id: tempId,
              type: 'video',
              status: 'completed',
              url: completedUrl,
              prompt: promptToUse || 'Kling 3.0 Motion Control',
              engine: `Kling 3.0 (${motionMode === 'pro' ? 'Pro 1080p' : 'Std 720p'})`,
              aspectRatio: activeRatio,
              aspect: activeRatio,
              timestamp: Date.now(),
              projectId: targetProj
            };

            setGallery(prev => prev.map(item => item.id === tempId ? finishedKlingItem : item));

            try {
              fetch(getApiUrl('/api/save-asset'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url: completedUrl,
                  type: 'video',
                  prompt: finishedKlingItem.prompt,
                  engine: finishedKlingItem.engine,
                  aspect: finishedKlingItem.aspectRatio,
                  projectId: targetProj,
                  userId
                })
              }).catch(e => console.debug('[StudioPage] Save asset fallback:', e));
            } catch (saveErr) {
              console.warn('[StudioPage] Save asset error:', saveErr);
            }

            try {
              useAppStore.getState().addProjectAsset(finishedKlingItem, targetProj);
            } catch (_) {
              /* ignore */
            }
            try {
              useAppStore.getState().addUnifiedAsset(finishedKlingItem);
            } catch (_) {
              /* ignore */
            }

            const spentCredits = (motionMode === 'pro' ? 9 : 7) * motionDur;
            if (typeof updateShortsBalance === 'function') {
              updateShortsBalance(Math.max(0, userCredits - spentCredits));
            }
            if (showToast) showToast('Kling 3.0 Motion Control video rendered!', 'success');
            return;
          } else {
            // Motion Control Easy -> Gemini Omni Flash 1.1 (/api/omni-i2v)
            const subjectUrl = customOptions?.input_url || customOptions?.image || motionSubjectImage || motionSubjectPreview || firstFrameImage;
            const videoUrl = customOptions?.video_url || customOptions?.refVideo || motionRefVideo || motionRefVideoPreview;

            const [resolvedSubject, resolvedVideo] = await Promise.all([
              subjectUrl ? resolveBlobToBase64(subjectUrl) : null,
              videoUrl ? resolveBlobToBase64(videoUrl) : null
            ]);

            if (!resolvedSubject || !resolvedVideo) {
              throw new Error("Motion Control Easy requires both a Subject Image and a 10s Motion Reference Video.");
            }

            const baseMotionDirective = "Motion control: Retarget the exact motion and kinematics from the driving video. The subject's exact face, facial structure, features, eyes, and identity must strictly match the attached subject image with 100% facial preservation and character consistency.";
            const userExtraPrompt = promptToUse?.trim() || '';
            const combinedMotionPrompt = userExtraPrompt
              ? `${baseMotionDirective} Additional user direction: ${userExtraPrompt}`
              : baseMotionDirective;

            const validRes = (motionMode === 'pro' || motionMode === '1080p' || activeResolution === '1080p') ? '1080p' : '720p';

            const resp = await fetch(getApiUrl('/api/omni-i2v'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                image: resolvedSubject,
                firstFrame: resolvedSubject,
                refVideo: resolvedVideo,
                ref_videos: [resolvedVideo],
                task: 'motion_control',
                prompt: combinedMotionPrompt,
                motionPrompt: combinedMotionPrompt,
                duration: 10,
                resolution: validRes,
                aspectRatio: activeRatio,
                generateAudio: !!activeAudio,
                model: 'gemini-omni-1.1-flash',
                userId,
                projectId: targetProj
              })
            });

            if (!resp.ok) {
              const errText = await resp.text();
              let parsedError = `Motion Control failed (${resp.status})`;
              try {
                const parsed = JSON.parse(errText);
                if (parsed.error) parsedError = parsed.error;
              } catch (_) {
                if (errText && errText.length < 200 && !errText.startsWith('<')) parsedError = errText;
              }
              throw new Error(parsedError);
            }

            const data = await resp.json();
            const finalUrl = data.videoUrl || data.url;
            if (!finalUrl) throw new Error("Motion Control returned no video URL.");

            const finishedEasyItem = {
              id: tempId,
              type: 'video',
              status: 'completed',
              url: finalUrl,
              engine: 'Motion Control Easy',
              prompt: userExtraPrompt || 'Motion Control Performance Transfer',
              aspectRatio: activeRatio,
              aspect: activeRatio,
              duration: 10,
              timestamp: Date.now(),
              projectId: targetProj
            };

            setGallery(prev => prev.map(item => item.id === tempId ? finishedEasyItem : item));

            try {
              fetch(getApiUrl('/api/save-asset'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url: finalUrl,
                  type: 'video',
                  prompt: finishedEasyItem.prompt,
                  engine: finishedEasyItem.engine,
                  aspect: finishedEasyItem.aspectRatio,
                  projectId: targetProj,
                  userId
                })
              }).catch(e => console.debug('[StudioPage] Save asset fallback:', e));
            } catch (saveErr) {
              console.warn('[StudioPage] Save asset error:', saveErr);
            }

            try {
              useAppStore.getState().addProjectAsset(finishedEasyItem, targetProj);
            } catch (_) {
              /* ignore */
            }
            try {
              useAppStore.getState().addUnifiedAsset(finishedEasyItem);
            } catch (_) {
              /* ignore */
            }

            if (showToast) showToast("Motion Control Easy video rendered successfully!", "success");
            return;
          }
        }

        if (isSeedance) {
          const rawStart = customOptions?.firstFrame || firstFrameImage || omniFirstFrameImage;
          const rawEnd = customOptions?.lastFrame || lastFrameImage || omniLastFrameImage;
          const [resolvedStart, resolvedEnd] = await Promise.all([
            rawStart ? resolveBlobToBase64(rawStart) : null,
            rawEnd ? resolveBlobToBase64(rawEnd) : null
          ]);

          const rawRefImgs = [
            ...(customOptions?.reference_image_urls || []),
            ...(seedanceRefs?.ref_images || []),
            ...(customOptions?.omniRefImages || omniRefImages || []).filter(Boolean),
            ...(customOptions?.omniMultiImages || omniMultiImages || []).filter(Boolean)
          ];
          const resolvedRefImgs = Array.from(new Set((await Promise.all(rawRefImgs.map(img => resolveBlobToBase64(img)))).filter(Boolean)));

          const rawRefVids = [
            ...(customOptions?.reference_video_urls || []),
            ...(seedanceRefs?.ref_videos || []),
            ...(customOptions?.omniRefVideoPreview ? [customOptions.omniRefVideoPreview] : (omniRefVideoPreview ? [omniRefVideoPreview] : [])),
            ...(customOptions?.omniMultiVideos || omniMultiVideos || []).map(v => typeof v === 'string' ? v : v?.url).filter(Boolean)
          ];
          const resolvedRefVids = Array.from(new Set((await Promise.all(rawRefVids.map(vid => resolveBlobToBase64(vid)))).filter(Boolean)));

          const rawRefAuds = [
            ...(customOptions?.reference_audio_urls || []),
            ...(seedanceRefs?.ref_audios || [])
          ];
          const resolvedRefAuds = Array.from(new Set((await Promise.all(rawRefAuds.map(aud => resolveBlobToBase64(aud)))).filter(Boolean)));

          let contentArray = customOptions?.seedanceContentArray;
          if (!contentArray || contentArray.length === 0) {
            contentArray = [];
            if (promptToUse?.trim()) {
              contentArray.push({ type: "text", text: promptToUse.trim() });
            }
            if (resolvedStart) {
              contentArray.push({ type: "image_url", image_url: { url: resolvedStart }, role: "first_frame" });
            }
            if (resolvedEnd) {
              contentArray.push({ type: "image_url", image_url: { url: resolvedEnd }, role: "last_frame" });
            }
            resolvedRefImgs.forEach((img) => {
              contentArray.push({ type: "image_url", image_url: { url: img }, role: "reference_image" });
            });
            resolvedRefVids.forEach((vid) => {
              contentArray.push({ type: "video_url", video_url: { url: vid }, role: "reference_video" });
            });
            resolvedRefAuds.forEach((aud) => {
              contentArray.push({ type: "audio_url", audio_url: { url: aud }, role: "reference_audio" });
            });
          }

          const modelParam = (engineToUse === 'seedance-2.5' || (panelTab === 'transition' && engineToUse !== 'seedance-mini') || panelTab === 'seedance-2.5')
            ? 'bytedance/seedance-2-5'
            : (engineToUse === 'seedance-mini')
            ? 'bytedance/seedance-2-mini'
            : engineToUse === 'seedance-fast'
            ? 'dreamina-seedance-2-0-fast-260128'
            : 'dreamina-seedance-2-0-260128';

          const resp = await fetch(getApiUrl('/api/seedance/generate'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              engine: engineToUse,
              model: modelParam,
              seedanceContentArray: contentArray,
              firstFrame: resolvedStart || undefined,
              lastFrame: resolvedEnd || undefined,
              first_frame_url: resolvedStart || undefined,
              last_frame_url: resolvedEnd || undefined,
              reference_image_urls: resolvedRefImgs,
              reference_video_urls: resolvedRefVids,
              reference_audio_urls: resolvedRefAuds,
              duration: activeDuration,
              aspectRatio: activeRatio,
              resolution: activeResolution,
              userId,
              projectId: activeProjectId,
              generateAudio: activeAudio,
              output_format: 'mp4',
              web_search: false,
              nsfw_checker: true,
              provider: localStorage.getItem('cs_seedance_provider') || 'auto',
              creditReason: 'studio_seedance_generation'
            })
          });

          if (!resp.ok) {
            const errText = await resp.text();
            let parsedError = `Seedance failed (${resp.status})`;
            try {
              const parsed = JSON.parse(errText);
              if (parsed.error) parsedError = parsed.error;
            } catch (_) {
              if (errText && errText.length < 200 && !errText.startsWith('<')) parsedError = errText;
            }
            throw new Error(parsedError);
          }

          const data = await resp.json();

          // If backend completed synchronously (e.g. Higgsfield withPolling: true)
          if (data.status === 'completed' && (data.videoUrl || data.url)) {
            const finalUrl = data.videoUrl || data.url;
            const completedAsset = {
              id: data.requestId || tempId || `gen_${Date.now()}`,
              type: 'video',
              url: finalUrl,
              prompt: promptToUse,
              name: promptToUse?.slice(0, 30) || 'Studio Video',
              engine: data.engine || engineToUse,
              aspectRatio: activeRatio,
              aspect: activeRatio,
              timestamp: Date.now(),
              createdAt: Date.now(),
              status: 'completed',
              folder: 'studio',
              category: 'generation',
              projectId: targetProj
            };

            setGallery(prev => prev.map(item => item.id === tempId ? completedAsset : item));

            try {
              fetch(getApiUrl('/api/save-asset'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url: completedAsset.url,
                  type: 'video',
                  prompt: completedAsset.prompt,
                  engine: completedAsset.engine,
                  aspect: completedAsset.aspectRatio,
                  projectId: targetProj,
                  userId
                })
              }).catch(e => console.debug('[StudioPage] Save asset fallback:', e));
            } catch (saveErr) {
              console.warn('[StudioPage] Save asset error:', saveErr);
            }

            try {
              useAppStore.getState().addProjectAsset(completedAsset, targetProj);
            } catch (_) {
              /* ignore */
            }
            try {
              useAppStore.getState().addUnifiedAsset(completedAsset);
            } catch (_) {
              /* ignore */
            }

            const showToast = useAppStore.getState().showToast;
            if (showToast) showToast("Seedance 2.5 video generated successfully!", "success");
            return;
          }

          const taskId = data.requestId;
          if (!taskId) throw new Error(data.error || "No task ID returned from Seedance API");

          await pollSeedanceTask(taskId, promptToUse, activeRatio, data.engine || engineToUse, tempId);
          return;
        }

        let endpoint = getApiUrl('/api/veo-i2v');
        let payload = {};

        if (isOmni) {
          endpoint = getApiUrl('/api/omni-i2v');
          const isMultiReference = customOptions?.multiReferenceMode === true || panelTab === 'omni-multi';
          const rawMultiSlotSource = customOptions?.multiImageSlots || (customOptions?.omniMultiImages || omniMultiImages || [])
            .map((url, slot) => url ? { slot, tag: `@image${slot + 1}`, url } : null)
            .filter(Boolean);
          const multiImageSlots = await Promise.all(
            rawMultiSlotSource.map(async (slotItem) => {
              if (!slotItem) return null;
              const slotIdx = (typeof slotItem === 'object' && Number.isInteger(slotItem.slot)) ? slotItem.slot : 0;
              const rawUrl = typeof slotItem === 'string' ? slotItem : (slotItem.url || slotItem.imageUrl || slotItem.data);
              if (!rawUrl) return null;
              const resolvedUrl = await resolveBlobToBase64(rawUrl);
              return resolvedUrl ? { slot: slotIdx, tag: slotItem.tag || `@image${slotIdx + 1}`, url: resolvedUrl } : null;
            })
          ).then(arr => arr.filter(Boolean));

          const rawMultiImages = [
            ...multiImageSlots.map(s => s.url),
            ...(customOptions?.omniMultiImages || []),
            ...(customOptions?.reference_image_urls || []),
            ...(omniMultiImages || [])
          ].filter(Boolean);
          const resolvedMultiImages = Array.from(new Set((await Promise.all(rawMultiImages.map(img => resolveBlobToBase64(img)))).filter(Boolean)));
          // 3-slot reference video mapping for @video1, @video2, @video3
          const multiVidSlotSource = (customOptions?.multiVideoSlots || customOptions?.omniMultiVideos || omniMultiVideos || []);
          const resolvedMultiVideoSlots = await Promise.all([0, 1, 2].map(async (slotIdx) => {
            let item = null;
            if (Array.isArray(multiVidSlotSource)) {
              item = multiVidSlotSource.find(v => v && typeof v === 'object' && v.slot === slotIdx) || multiVidSlotSource[slotIdx];
            }
            if (!item) return null;
            const url = typeof item === 'string' ? item : (item.url || item.imageUrl || item.data);
            if (!url) return null;
            const resolvedUrl = await resolveBlobToBase64(url);
            return resolvedUrl ? { slot: slotIdx, tag: `@video${slotIdx + 1}`, url: resolvedUrl, duration: item?.duration || 10 } : null;
          }));

          const activeRefVideoItems = resolvedMultiVideoSlots.filter(Boolean);
          const rawMultiVideos = [
            ...activeRefVideoItems.map(v => v.url),
            ...(customOptions?.reference_video_urls || []),
            ...(customOptions?.refVideos || []),
            ...(customOptions?.ref_videos || [])
          ].filter(Boolean);
          const resolvedMultiVideos = Array.from(new Set(rawMultiVideos));
          
          // MultiRef images are all visual references. Do not silently promote
          // Image 1 to a start frame; only the regular Omni tab uses keyframes.
          const rawPrimary = isMultiReference
            ? null
            : (customOptions?.firstFrame || firstFrameImage || omniFirstFrameImage || resolvedMultiImages[0] || null);
          const rawSecondary = isMultiReference
            ? null
            : (customOptions?.lastFrame || lastFrameImage || omniLastFrameImage || null);
          const primaryImg = await resolveBlobToBase64(rawPrimary);
          const secondaryImg = await resolveBlobToBase64(rawSecondary);
          const resolvedOmniRefImages = Array.from(new Set((await Promise.all([
            ...(customOptions?.omniRefImages || omniRefImages || []),
            ...resolvedMultiImages
          ].filter(Boolean).map(img => resolveBlobToBase64(img)))).filter(Boolean)));
          const refVidRaw = customOptions?.omniRefVideoPreview || omniRefVideoPreview || customOptions?.refVideo || resolvedMultiVideos[0] || null;
          const resolvedOmniRefVideo = refVidRaw ? await resolveBlobToBase64(refVidRaw) : null;

          let directedPrompt = promptToUse;
          if (primaryImg && secondaryImg) {
            directedPrompt = `[Start Frame: initial starting image at 0s] [End Frame: final ending image at ${activeDuration}s]. The video MUST begin directly at the first frame at 0s, animate smoothly through: ${promptToUse}, and conclude seamlessly matching the last frame at ${activeDuration}s. Single continuous shot.`;
          } else if (primaryImg) {
            directedPrompt = `[Start Frame: initial starting image at 0s]. The video MUST begin directly at this first frame at 0s and animate smoothly through: ${promptToUse}.`;
          } else if (secondaryImg) {
            directedPrompt = `[End Frame: final ending image at ${activeDuration}s]. The video MUST animate through: ${promptToUse}, and conclude seamlessly matching this last frame at ${activeDuration}s.`;
          }

          const hasMultiRefs = multiImageSlots.length > 0 || resolvedMultiVideos.length > 0 || resolvedOmniRefImages.length > 0 || !!resolvedOmniRefVideo;
          const taskToUse = (primaryImg && secondaryImg) ? 'reference_to_video' : (hasMultiRefs ? 'reference_to_video' : (omniTask || 'image_to_video'));

          const finalRefImages = resolvedMultiImages.length > 0 ? resolvedMultiImages : resolvedOmniRefImages;
          const finalRefVideos = resolvedMultiVideos.length > 0 ? resolvedMultiVideos : (resolvedOmniRefVideo ? [resolvedOmniRefVideo] : []);

          console.log('[StudioPage] Omni payload packaged:', {
            hasMultiRefs,
            taskToUse,
            refVideosCount: finalRefVideos.length,
            refImagesCount: finalRefImages.length,
            activeRefVideoItemsCount: activeRefVideoItems.length
          });

          payload = {
            prompt: directedPrompt,
            motionPrompt: directedPrompt,
            model: 'gemini-omni-1.1-flash',
            task: taskToUse,
            duration: activeDuration,
            aspectRatio: activeRatio,
            resolution: activeResolution,
            generateAudio: activeAudio,
            image: primaryImg,
            firstFrame: primaryImg,
            firstFrameImage: primaryImg,
            lastFrame: secondaryImg,
            lastFrameImage: secondaryImg,
            imageEnd: secondaryImg,
            refImages: finalRefImages,
            ref_images: finalRefImages,
            multiImageSlots,
            multiReferenceMode: isMultiReference,
            refVideos: finalRefVideos,
            ref_videos: finalRefVideos,
            reference_video_urls: finalRefVideos,
            multiVideoSlots: resolvedMultiVideoSlots,
            omniMultiVideos: resolvedMultiVideoSlots,
            refVideo: finalRefVideos[0] || undefined,
            video: finalRefVideos[0] || undefined,
            sourceVideo: finalRefVideos[0] || undefined,
            userId
          };
        } else {
          endpoint = getApiUrl('/api/veo-i2v');
          const rawPrimary = customOptions?.firstFrame || firstFrameImage || omniFirstFrameImage || null;
          const rawSecondary = customOptions?.lastFrame || lastFrameImage || omniLastFrameImage || null;
          const primaryImg = await resolveBlobToBase64(rawPrimary);
          const secondaryImg = await resolveBlobToBase64(rawSecondary);

          let directedPrompt = promptToUse;
          if (primaryImg && secondaryImg) {
            directedPrompt = `[Start Frame: initial starting image at 0s] [End Frame: final ending image at ${activeDuration}s]. The video MUST begin directly at the first frame at 0s, animate smoothly through: ${promptToUse}, and conclude seamlessly matching the last frame at ${activeDuration}s.`;
          } else if (primaryImg) {
            directedPrompt = `[Start Frame: initial starting image at 0s]. The video starts directly from this first frame: ${promptToUse}.`;
          } else if (secondaryImg) {
            directedPrompt = `[End Frame: final ending image at ${activeDuration}s]. The video concludes seamlessly matching this last frame: ${promptToUse}.`;
          }

          payload = {
            prompt: directedPrompt,
            motionPrompt: directedPrompt,
            model: engineToUse,
            engine: engineToUse,
            duration: activeDuration,
            aspectRatio: activeRatio,
            resolution: activeResolution,
            generateAudio: activeAudio,
            image: primaryImg,
            firstFrame: primaryImg,
            firstFrameImage: primaryImg,
            lastFrame: secondaryImg,
            lastFrameImage: secondaryImg,
            imageEnd: secondaryImg,
            userId
          };
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errText = await res.text();
          let parsedError = `Server responded with status ${res.status}`;
          try {
            const parsed = JSON.parse(errText);
            if (parsed.error) parsedError = parsed.error;
          } catch (_) {
            if (errText && errText.length < 200 && !errText.startsWith('<')) {
              parsedError = errText;
            }
          }
          throw new Error(parsedError);
        }

        let data;
        try {
          data = await res.json();
        } catch (_) {
          throw new Error(`Invalid JSON response from server (${res.status})`);
        }
        if (data.error) throw new Error(data.error);

        const videoUrl = data.videoUrl || data.url || data.result;

        const finishedMainItem = {
          id: tempId,
          type: 'video',
          status: 'completed',
          url: videoUrl,
          prompt: promptToUse || 'Cinematic Video',
          engine: engineDisplayLabel,
          aspectRatio: activeRatio,
          aspect: activeRatio,
          timestamp: Date.now(),
          projectId: targetProj
        };

        setGallery(prev => prev.map(item => item.id === tempId ? finishedMainItem : item));

        if (videoUrl) {
          try {
            fetch(getApiUrl('/api/save-asset'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: videoUrl,
                type: 'video',
                prompt: promptToUse,
                engine: engineToUse,
                aspect: activeRatio,
                projectId: targetProj,
                userId
              })
            }).catch(err => console.debug('[StudioPage] Gallery persistence fallback:', err));
          } catch (saveErr) {
            console.warn('[StudioPage] Save asset error:', saveErr);
          }
        }

        try {
          useAppStore.getState().addProjectAsset(finishedMainItem, targetProj);
        } catch (_) {
          /* ignore */
        }
        try {
          useAppStore.getState().addUnifiedAsset(finishedMainItem);
        } catch (_) {
          /* ignore */
        }

        if (data.newCredits !== undefined && typeof updateShortsBalance === 'function') {
          updateShortsBalance(data.newCredits);
        }
      } catch (err) {
        console.error("Generation error:", err);
        const errMsg = err.message || 'Video generation failed';
        const isPolicy = errMsg.includes('Responsible AI') || 
                         errMsg.includes('celebrities') || 
                         errMsg.includes('policy') ||
                         errMsg.includes('Policy') ||
                         errMsg.includes('prohibited') ||
                         errMsg.includes('prominent individuals') ||
                         errMsg.includes('recognizable') ||
                         errMsg.includes('content_blocked') ||
                         errMsg.includes('Content Safety') ||
                         errMsg.includes('violates Google');

        setGallery(prev => prev.map(item => item.id === tempId ? {
          ...item,
          status: 'failed',
          loading: false,
          error: errMsg
        } : item));

        // Immediately reset any active cooldown in SidePanel
        try {
          window.dispatchEvent(new CustomEvent('zerolens_reset_cooldown'));
        } catch (err) {
          console.debug(err);
        }

        const showToast = useAppStore.getState().showToast;
        if (showToast) {
          if (isPolicy) {
            showToast(
              "⚠️ Google Policy Restriction: Blocked by Responsible AI. Credits refunded (100%). Use Seedance 2.0 to bypass.",
              "policy",
              {
                label: "Try Seedance 2.0",
                onClick: () => {
                  setPanelTab('seedance');
                  setActiveEngine('seedance-fast');
                }
              }
            );
          } else {
            showToast(errMsg, "error");
          }
        }
      } finally {
        clearTimeout(submitLockTimer);
        setIsSubmitting(false);
      }
    });
  };

  const handleClearGallery = () => {
    if (window.confirm("Are you sure you want to clear your studio video gallery?")) {
      setGallery([]);
    }
  };

  const handleDeleteItem = (id, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const idStr = String(id);
    try {
      dismissedIdsRef.current.add(idStr);
      localStorage.setItem('zl_studio_dismissed_ids', JSON.stringify([...dismissedIdsRef.current].slice(-500)));
    } catch (err) {
      console.debug(err);
    }
    setGallery(prev => {
      const next = prev.filter(item => String(item?.id) !== idStr);
      try {
        const cleanForStorage = next.filter(item => item && !item.loading && item.status !== 'generating' && item.status !== 'failed' && item.status !== 'error' && item.url && !item.url.startsWith('blob:')).slice(0, 100);
        const json = JSON.stringify(cleanForStorage);
        localStorage.setItem('cs_studio_gallery', json);
        if (galleryLSKey) localStorage.setItem(galleryLSKey, json);
        localStorage.setItem('cs_gallery', json);
      } catch (err) {
        console.debug('[StudioPage] localStorage sync failed:', err);
      }
      return next;
    });
    if (lightboxItem && String(lightboxItem.id) === idStr) {
      setLightboxItem(null);
    }
    // Purge from backend database if it was a saved asset
    try {
      if (id && /^\d+$/.test(idStr)) {
        fetch(getApiUrl(`/api/delete-asset/${id}`), { method: 'DELETE' }).catch((fetchErr) => {
          console.debug(fetchErr);
        });
      }
    } catch (err) {
      console.debug(err);
    }
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast("Card removed from gallery.", "info");
  };

  const handleDownload = async (url, nameOrType, maybeId) => {
    if (!url) return;
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast("Downloading asset to your device...", "info");

    let filename = 'zerolens-video.mp4';
    if (typeof nameOrType === 'string' && nameOrType.includes('.')) {
      filename = nameOrType;
    } else {
      const isImg = (nameOrType === 'image' || url.match(/\.(png|jpg|jpeg|webp)($|\?)/i));
      filename = `zerolens-${maybeId || Date.now()}.${isImg ? 'png' : 'mp4'}`;
    }

    const success = await downloadDirect(url, filename);
    if (success) {
      if (showToast) showToast("Download saved to your device!", "success");
    } else {
      if (showToast) showToast("Could not download asset.", "error");
    }
  };

  // Extract video frame screenshot and set as Keyframe (First Frame)
  const handleUseAsKeyframe = async (item, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const showToast = useAppStore.getState().showToast;

    if (item.type === 'image' || (!item.type && !item.url?.includes('.mp4'))) {
      setFirstFrameImage(item.url);
      setFirstFramePreview(item.url);
      setOmniFirstFrameImage(item.url);
      setOmniFirstFramePreview(item.url);
      if (showToast) showToast("Image set as Start Frame (FF)!", "success");
      return;
    }

    // Video: Extract keyframe screenshot
    if (showToast) showToast("Extracting video keyframe screenshot...", "info");
    try {
      const frameDataUrl = await extractVideoFrame(item.url, 0);
      setFirstFrameImage(frameDataUrl);
      setFirstFramePreview(frameDataUrl);
      setOmniFirstFrameImage(frameDataUrl);
      setOmniFirstFramePreview(frameDataUrl);
      if (showToast) showToast("Video frame captured and set as Start Frame!", "success");
    } catch (err) {
      console.error("[StudioPage] Frame extraction error:", err);
      setOmniRefVideoPreview(item.url);
      setPanelTab('omni');
      if (showToast) showToast("Loaded as Omni Reference Video.", "info");
    }
  };

  // Send item (Image or Video) to Omni Reference payload
  const handleUseAsOmniRef = (item, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const showToast = useAppStore.getState().showToast;

    const isVid = item.type === 'video' || item.url?.includes('.mp4');

    if (!isVid) {
      // It's an image: set as Omni First Frame / Reference Image & Slot 1
      setOmniFirstFrameImage(item.url);
      setOmniFirstFramePreview(item.url);
      setFirstFrameImage(item.url);
      setFirstFramePreview(item.url);
      setOmniMultiImages(prev => {
        const next = Array.isArray(prev) ? [...prev] : ['', '', '', ''];
        next[0] = item.url;
        return next;
      });
      setPanelTab('omni-multi');
      if (showToast) showToast("Image loaded as Omni Reference!", "success");
      return;
    }

    // It's a video: set as Omni Driving Reference Video & Slot 1
    setOmniRefVideoPreview(item.url);
    setOmniMultiVideos(prev => {
      const next = Array.isArray(prev) ? [...prev] : ['', '', ''];
      next[0] = item.url;
      return next;
    });
    setPanelTab('omni-multi');
    if (showToast) showToast("Video loaded into Omni Reference Driving Video payload!", "success");
  };

  // Extract screenshot directly from gallery card
  const handleExtractScreenshotToGallery = async (item, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast("Capturing video frame screenshot...", "info");
    try {
      const frameDataUrl = await extractVideoFrame(item.url, 0);
      const newId = 'frame_' + Date.now();
      const cleanPrompt = item.prompt ? item.prompt.replace(/^Screenshot:\s*/i, '').trim() : 'Studio Video Screenshot';
      const activeProj = item.projectId || activeProjectId || 'default';
      const activeUserId = userId || useAppStore.getState().userProfile?.id || 'anon';
      const newImageItem = {
        id: newId,
        type: 'image',
        url: frameDataUrl,
        prompt: cleanPrompt,
        engine: 'Screenshot',
        aspect: item.aspectRatio || item.aspect || '16:9',
        timestamp: Date.now(),
        ts: Date.now(),
        projectId: activeProj
      };
      setGallery(prev => [newImageItem, ...prev]);

      // Sync across local storage keys
      try {
        if (activeUserId && activeUserId !== 'anon') {
          const csUserKey = `cinematic_studio_gallery_${activeUserId}`;
          const existing = JSON.parse(localStorage.getItem(csUserKey) || '[]');
          localStorage.setItem(csUserKey, JSON.stringify([newImageItem, ...existing]));
        }
        const csStudioG = JSON.parse(localStorage.getItem('cs_studio_gallery') || '[]');
        localStorage.setItem('cs_studio_gallery', JSON.stringify([newImageItem, ...csStudioG]));
      } catch (storageErr) {
        console.debug('[StudioPage] localStorage sync fallback:', storageErr);
      }

      if (showToast) showToast("Screenshot added to gallery!", "success");

      fetch(getApiUrl('/api/save-asset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: frameDataUrl,
          fileName: `screenshot_${Date.now()}.png`,
          userId: activeUserId,
          type: 'image',
          aspect: item.aspectRatio || item.aspect || '16:9',
          prompt: cleanPrompt,
          engine: 'Screenshot',
          projectId: activeProj,
          metadata: {
            aspect: item.aspectRatio || item.aspect || '16:9',
            projectId: activeProj,
            engine: 'Screenshot',
            prompt: cleanPrompt
          }
        })
      }).then(r => r.json()).then(data => {
        const savedUrl = data.url || data.path;
        if (savedUrl) {
          setGallery(prev => prev.map(i => i.id === newId ? { ...i, url: savedUrl } : i));
          try {
            if (activeUserId && activeUserId !== 'anon') {
              const csUserKey = `cinematic_studio_gallery_${activeUserId}`;
              const existing = JSON.parse(localStorage.getItem(csUserKey) || '[]');
              localStorage.setItem(csUserKey, JSON.stringify(existing.map(i => i.id === newId ? { ...i, url: savedUrl } : i)));
            }
          } catch (csErr) {
            console.debug('[StudioPage] csUserKey update fallback:', csErr);
          }
        }
      }).catch(err => console.debug("[StudioPage] Save asset fallback:", err));
    } catch (err) {
      console.error("[StudioPage] Frame capture error:", err);
      if (showToast) showToast("Could not capture screenshot.", "error");
    }
  };

  // Send Image or Extracted Video Frame to Multi-Ref Image Slot (@image1..@image4)
  const handleUseAsMultiRefImage = async (item, slotIdx = null, e = null) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const showToast = useAppStore.getState().showToast;
    let targetImgUrl = item.url;

    // If item is video, extract screenshot frame first
    if (item.type === 'video' || (item.url && item.url.includes('.mp4'))) {
      if (showToast) showToast("Extracting video frame screenshot...", "info");
      try {
        targetImgUrl = await extractVideoFrame(item.url, 0);
      } catch (err) {
        console.error("[StudioPage] Frame extraction error:", err);
        if (showToast) showToast("Could not extract frame from video.", "error");
        return;
      }
    }

    // Determine slot index: if specified, use it; otherwise first empty slot or 0
    let targetIdx = slotIdx;
    if (targetIdx === null || targetIdx < 0 || targetIdx > 3) {
      const emptyIdx = omniMultiImages.findIndex(img => !img);
      targetIdx = emptyIdx !== -1 ? emptyIdx : 0;
    }

    setOmniMultiImages(prev => {
      const next = Array.isArray(prev) ? [...prev] : ['', '', '', ''];
      next[targetIdx] = targetImgUrl;
      return next;
    });
    setPanelTab('omni-multi');

    // Auto-insert tag in prompt if missing
    const tag = `@image${targetIdx + 1}`;
    if (omniPromptText && !omniPromptText.includes(tag)) {
      setOmniPromptText(prev => prev.trim() ? `${prev.trim()} ${tag}` : tag);
    }

    if (showToast) showToast(`Assigned to Multi-Ref ${tag}!`, "success");
  };

  // Send Video to Multi-Ref Video Slot (@video1..@video3) with strict 10s max duration check
  const handleUseAsMultiRefVideo = async (item, slotIdx = null, e = null) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const showToast = useAppStore.getState().showToast;

    if (item.type === 'image' || (!item.type && !item.url?.includes('.mp4'))) {
      if (showToast) showToast("This asset is an image. Use 'Send to Image Reference' instead.", "info");
      return;
    }

    // Strict 10-second duration validation
    let dur = Number(item.duration) || 0;
    if (!dur || dur <= 0) {
      dur = await getVideoDuration(item.url);
    }

    if (dur > 10.05) {
      const formattedDur = Math.round(dur * 10) / 10;
      const errMsg = `Video reference exceeds 10s limit (${formattedDur}s detected). Only clips up to 10s are allowed.`;
      if (showToast) showToast(errMsg, "error");
      else alert(errMsg);
      return;
    }

    // Determine target slot (0..2)
    let targetIdx = slotIdx;
    if (targetIdx === null || targetIdx < 0 || targetIdx > 2) {
      const emptyIdx = omniMultiVideos.findIndex(v => !v);
      targetIdx = emptyIdx !== -1 ? emptyIdx : 0;
    }

    setOmniMultiVideos(prev => {
      const next = Array.isArray(prev) ? [...prev] : ['', '', ''];
      next[targetIdx] = item.url;
      return next;
    });
    setPanelTab('omni-multi');

    // Auto-insert tag in prompt if missing
    const tag = `@video${targetIdx + 1}`;
    if (omniPromptText && !omniPromptText.includes(tag)) {
      setOmniPromptText(prev => prev.trim() ? `${prev.trim()} ${tag}` : tag);
    }

    if (showToast) showToast(`Assigned to Multi-Ref ${tag}!`, "success");
  };

  // Video Extension handler for Omni 1.1 Flash
  const handleExtendVideo = (item) => {
    if (!item) return;
    useAppStore.getState().setExtensionSourceVideo?.(item);
    setPanelTab('omni-multi');
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast("Loaded clip into Extension Panel (+4s / +8s)", "info");
  };

  // Send Image or Extracted Video Frame to Kling Motion Subject
  const handleUseAsMotionSubject = async (item, e = null) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const showToast = useAppStore.getState().showToast;
    let targetImgUrl = item.url;

    if (item.type === 'video' || (item.url && item.url.includes('.mp4'))) {
      if (showToast) showToast("Extracting video frame as Motion Subject...", "info");
      try {
        targetImgUrl = await extractVideoFrame(item.url, 0);
      } catch (err) {
        console.error("[StudioPage] Frame extraction error:", err);
        if (showToast) showToast("Could not extract frame from video.", "error");
        return;
      }
    }

    setMotionSubjectImage(targetImgUrl);
    setMotionSubjectPreview(targetImgUrl);
    setPanelTab('motion');
    if (showToast) showToast("Set as Kling Motion Subject Image!", "success");
  };

  // Send Video to Kling Motion Driving Video (3s-30s)
  const handleUseAsMotionVideo = async (item, e = null) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const showToast = useAppStore.getState().showToast;

    if (item.type === 'image' || (!item.type && !item.url?.includes('.mp4'))) {
      if (showToast) showToast("Please select a video file for Motion Pattern.", "info");
      return;
    }

    let dur = Number(item.duration) || 0;
    if (!dur || dur <= 0) {
      dur = await getVideoDuration(item.url);
    }

    if (dur > 30.5) {
      const errMsg = `Motion reference video exceeds 30s limit (${Math.round(dur)}s). Max allowed is 30s.`;
      if (showToast) showToast(errMsg, "error");
      return;
    }

    if (dur < 2.8) {
      const errMsg = `Motion reference video is too short (${Math.round(dur)}s). Min required is 3s.`;
      if (showToast) showToast(errMsg, "error");
      return;
    }

    const roundedDur = Math.max(3, Math.min(30, Math.round(dur)));
    setMotionRefVideo(item.url);
    setMotionRefVideoPreview(item.url);
    setMotionRefVideoDuration(roundedDur);
    setPanelTab('motion');
    if (showToast) showToast(`Set as Motion Reference Video (${roundedDur}s)!`, "success");
  };

  const handleUpscale = async (item) => {
    const showToast = useAppStore.getState().showToast;
    const user = useAppStore.getState().user;
    const userId = user?.id;
    const spendShorts = useAppStore.getState().spendShorts;

    setUpscalingItems(prev => ({ ...prev, [item.id]: true }));
    
    try {
      if (item.type === 'video') {
        const durationSec = Math.max(1, Math.round(Number(item.duration) || 5));
        const creditCost = durationSec * (SHORTS_COST.video_upscale_per_second || 5);

        if (spendShorts && userId) {
          const spendResult = await spendShorts(userId, creditCost, 'video_upscale_1080p');
          if (!spendResult.success) {
            if (showToast) showToast(`Insufficient Shorts! Video upscale requires ${creditCost} Shorts.`, "error");
            return;
          }
        }

        const tempId = `upscale_${Date.now()}`;
        const placeholderItem = {
          id: tempId,
          status: 'generating',
          loading: true,
          type: 'video',
          resolution: '1080p',
          prompt: `${item.prompt || 'Cinematic video'} [1080p HD Upscaling]`,
          engine: '1080p HD Upscaler',
          aspect: item.aspect || '16:9',
          duration: durationSec,
          ts: Date.now(),
          projectId: activeProjectId
        };

        // Insert new generating card at top of gallery immediately
        setGallery(prev => [placeholderItem, ...prev]);

        if (showToast) showToast(`Compiling 1080p HD video in gallery (${durationSec}s · ${creditCost} Shorts)...`, "info");

        const resp = await fetch(getApiUrl('/api/video/upscale'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoUrl: item.url,
            video: item.url,
            duration: durationSec,
            aspectRatio: item.aspect || '16:9',
            resolution: '1080p',
            prompt: item.prompt || 'Cinematic video',
            userId,
            creditReason: 'video_upscale_1080p'
          })
        });

        const data = await resp.json();
        if (!resp.ok) {
          setGallery(prev => prev.filter(g => g.id !== tempId));
          throw new Error(data.error || 'Video upscale request failed.');
        }

        const upscaledUrl = data.url || data.videoUrl;
        if (upscaledUrl) {
          const newItem = {
            id: tempId,
            status: 'completed',
            loading: false,
            type: 'video',
            url: upscaledUrl,
            resolution: '1080p',
            quality: '1080p Full HD',
            prompt: `${item.prompt || 'Cinematic video'} (1080p HD Upscaled)`,
            engine: '1080p HD Upscaler',
            aspect: item.aspect || "16:9",
            duration: durationSec,
            ts: Date.now(),
            projectId: activeProjectId
          };

          setGallery(prev => prev.map(g => g.id === tempId ? newItem : g));
          if (showToast) showToast("1080p HD Upscaled video ready in gallery!", "success");
        } else {
          setGallery(prev => prev.filter(g => g.id !== tempId));
          throw new Error("Video upscale API returned no URL.");
        }
      } else {
        if (spendShorts && userId) {
          const spendResult = await spendShorts(userId, 2, 'image_upscale_4k');
          if (!spendResult.success) {
            if (showToast) showToast("Insufficient Shorts for 2K upscale.", "error");
            return;
          }
        }
        if (showToast) showToast("Initiating 2K image refinement...", "info");

        const resp = await fetch(getApiUrl('/api/generate-image'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gemini-3.1-flash-image',
            prompt: `REFINE TO 2K: Upscale this image to high resolution. [Semantic Context: ${item.prompt || 'Cinematic portrait'}]`,
            aspect_ratio: item.aspect || '16:9',
            quality: '2k',
            imageSize: '2K',
            resolution: '2K',
            referenceImages: [item.url],
            userId,
            creditReason: 'image_upscale_4k'
          })
        });

        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Upscale request failed.');

        if (data.url) {
          const newItem = {
            id: Date.now(),
            type: 'image',
            url: data.url,
            prompt: `${item.prompt || 'Generated image'} (2K Upscaled)`,
            engine: `${item.engine || 'Image'} (2K)`,
            aspect: item.aspect || "16:9",
            ts: Date.now(),
            projectId: activeProjectId
          };

          setGallery(prev => [newItem, ...prev]);
          setLightboxItem(newItem);
          if (showToast) showToast("Image successfully upscaled to 2K!", "success");
        }
      }
    } catch (err) {
      console.error("[Upscale Error]:", err);
      if (showToast) showToast(`Upscale failed: ${err.message}`, "error");
    } finally {
      setUpscalingItems(prev => ({ ...prev, [item.id]: false }));
    }
  };

  const handleGenerateAnglesGrid = () => {
    setShowAnglesModal(true);
  };

  return (
    <div className="h-full w-full flex flex-col md:flex-row bg-[#020202] text-white overflow-hidden relative font-sans select-none">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
        disabled={isUploading}
      />

      {/* ── MOBILE VIEW TAB SWITCHER (VISIBLE ON MOBILE ONLY) ── */}
      {isMobile && (
        <div className="flex md:hidden items-center justify-between px-3 py-2 bg-[#08080c] border-b border-white/[0.08] shrink-0 z-30">
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 w-full">
            <button
              type="button"
              onClick={() => setMobileTab('controls')}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                mobileTab === 'controls'
                  ? "bg-[#c8f135] text-black shadow-md shadow-[#c8f135]/25"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Studio Controls</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('gallery')}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer relative",
                mobileTab === 'gallery'
                  ? "bg-[#c8f135] text-black shadow-md shadow-[#c8f135]/25"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Gallery</span>
              <span className={cn(
                "text-[9px] font-mono px-1.5 py-0.2 rounded-full ml-1",
                mobileTab === 'gallery' ? "bg-black/25 text-black font-extrabold" : "bg-white/10 text-white/70"
              )}>
                {gallery.length}
              </span>
              {isBusy && (
                <span className="w-2 h-2 rounded-full bg-[#c8f135] animate-ping ml-1" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── LEFT COLUMN: DEDICATED STUDIO CONTROL PANEL (COLLAPSIBLE ON DESKTOP, TABBED ON MOBILE) ── */}
      <div className={cn(
        "relative shrink-0 z-20",
        isMobile ? (mobileTab === 'controls' ? "flex flex-1 w-full h-full min-h-0" : "hidden") : "flex"
      )}>
        <motion.div
          animate={{
            width: isMobile ? '100%' : (isSidebarOpen ? (typeof window !== 'undefined' && window.innerWidth >= 1280 ? 360 : 330) : 0),
            opacity: isMobile ? 1 : (isSidebarOpen ? 1 : 0)
          }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className="h-full w-full border-r border-white/[0.08] bg-[#07070b] flex flex-col overflow-hidden"
          style={{ minWidth: 0, willChange: 'width, opacity', transform: 'translateZ(0)' }}
        >
          <SidePanel
            isOpen={true}
            inlineMode={true}
            onClose={() => {
              if (isMobile) {
                setMobileTab('gallery');
              } else {
                setIsSidebarOpen(false);
              }
            }}
            activeEngine={activeEngine}
            setActiveEngine={setActiveEngine}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            panelTab={panelTab}
            setPanelTab={setPanelTab}
            firstFrameImage={firstFrameImage}
            firstFramePreview={firstFramePreview}
            lastFrameImage={lastFrameImage}
            lastFramePreview={lastFramePreview}
            setFirstFrameImage={setFirstFrameImage}
            setFirstFramePreview={setFirstFramePreview}
            setLastFrameImage={setLastFrameImage}
            setLastFramePreview={setLastFramePreview}
            omniFirstFrameImage={omniFirstFrameImage}
            omniFirstFramePreview={omniFirstFramePreview}
            omniLastFrameImage={omniLastFrameImage}
            omniLastFramePreview={omniLastFramePreview}
            omniRefImages={omniRefImages}
            omniRefPreviews={omniRefPreviews}
            setOmniRefImages={setOmniRefImages}
            setOmniRefPreviews={setOmniRefPreviews}
            omniMultiImages={omniMultiImages}
            setOmniMultiImages={setOmniMultiImages}
            omniMultiVideos={omniMultiVideos}
            setOmniMultiVideos={setOmniMultiVideos}
            setOmniFirstFrameImage={setOmniFirstFrameImage}
            setOmniFirstFramePreview={setOmniFirstFramePreview}
            setOmniLastFrameImage={setOmniLastFrameImage}
            setOmniLastFramePreview={setOmniLastFramePreview}
            omniRefVideoPreview={omniRefVideoPreview}
            setOmniRefVideoPreview={setOmniRefVideoPreview}
            omniRefVideoDuration={omniRefVideoDuration}
            setOmniRefVideoDuration={setOmniRefVideoDuration}
            handleFileUpload={handleFileUpload}
            setUploadTarget={setUploadTarget}
            handleClearRef={handleClearRef}
            fileInputRef={fileInputRef}
            duration={duration}
            setDuration={setDuration}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            resolution={resolution}
            setResolution={setResolution}
            generateAudio={generateAudio}
            setGenerateAudio={setGenerateAudio}
            omniTask={omniTask}
            setOmniTask={setOmniTask}
            showRefBoard={showRefBoard}
            setShowRefBoard={setShowRefBoard}
            promptText={panelTab === 'omni' || panelTab === 'omni-multi' ? omniPromptText : promptText}
            setPromptText={panelTab === 'omni' || panelTab === 'omni-multi' ? setOmniPromptText : setPromptText}
            omniPromptText={omniPromptText}
            setOmniPromptText={setOmniPromptText}
            handleGenerate={handleGenerate}
            extensionSourceVideo={extensionSourceVideo}
            setExtensionSourceVideo={setExtensionSourceVideo}
            extensionDuration={extensionDuration}
            setExtensionDuration={setExtensionDuration}
            extensionPrompt={extensionPrompt}
            setExtensionPrompt={setExtensionPrompt}
            handleExtensionGenerate={handleExtensionGenerate}
            handleOmniEditGenerate={handleOmniEditGenerate}
            isBusy={isBusy}
            activeJobsCount={activeJobsCount}
            maxConcurrent={maxConcurrent}
            userCredits={userCredits}
            requiredCredits={requiredCredits}
            canGenerate={canGenerate}
            allRefItems={stagedRefBoard}
            gallery={gallery}
            handleUseAsMultiRefImage={handleUseAsMultiRefImage}
            handleUseAsMultiRefVideo={handleUseAsMultiRefVideo}
            motionSubjectImage={motionSubjectImage}
            setMotionSubjectImage={setMotionSubjectImage}
            motionSubjectPreview={motionSubjectPreview}
            setMotionSubjectPreview={setMotionSubjectPreview}
            motionRefVideo={motionRefVideo}
            setMotionRefVideo={setMotionRefVideo}
            motionRefVideoPreview={motionRefVideoPreview}
            setMotionRefVideoPreview={setMotionRefVideoPreview}
            motionRefVideoDuration={motionRefVideoDuration}
            setMotionRefVideoDuration={setMotionRefVideoDuration}
            motionMode={motionMode}
            setMotionMode={setMotionMode}
            characterOrientation={characterOrientation}
            setCharacterOrientation={setCharacterOrientation}
            backgroundSource={backgroundSource}
            setBackgroundSource={setBackgroundSource}
          />
        </motion.div>

        {/* Drawer toggle button — Desktop */}
        {!isMobile && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 z-40 w-7 h-14 flex items-center justify-center rounded-r-2xl transition-all shadow-2xl cursor-pointer select-none",
              isSidebarOpen
                ? "right-[-28px] bg-[#111113] border border-[#c8f135]/40 text-[#c8f135] hover:border-[#c8f135]/80 hover:bg-[#c8f135]/10 shadow-[0_0_12px_rgba(200,241,53,0.25)]"
                : "right-[-28px] bg-[#c8f135] border-2 border-[#c8f135] text-black hover:bg-[#d8ff43] shadow-[0_0_25px_rgba(200,241,53,0.85)] scale-105 active:scale-95"
            )}
            title={isSidebarOpen ? 'Hide Studio Panel' : 'Show Studio Panel'}
          >
            {isSidebarOpen ? (
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>
        )}
      </div>

      {/* Floating Drawer Button for Mobile when in Gallery mode */}
      {isMobile && mobileTab === 'gallery' && (
        <button
          type="button"
          onClick={() => setMobileTab('controls')}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-[60] w-11 h-16 flex items-center justify-center rounded-r-2xl bg-[#c8f135] border-2 border-[#c8f135] text-black shadow-[0_0_25px_rgba(200,241,53,0.85)] cursor-pointer select-none active:scale-95 transition-all"
          title="Open Studio Controls"
        >
          <div className="flex flex-col items-center justify-center gap-0.5">
            <Sliders className="w-4 h-4" />
            <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
          </div>
        </button>
      )}

      {/* ── RIGHT COLUMN: STUDIO MEDIA GALLERY (UGC STYLE) ── */}
      <div className={cn(
        "min-w-0 flex flex-col h-full overflow-hidden bg-[#07070a] relative",
        isMobile ? (mobileTab === 'gallery' ? "flex flex-1 w-full h-full min-h-0" : "hidden") : "flex-1"
      )}>
        {/* Gallery Top Navigation / Header */}
        <div className="px-3 sm:px-5 py-2 sm:py-2.5 border-b border-white/[0.08] bg-[#09090e]/98 md:backdrop-blur-xl flex flex-col gap-2 z-30 shrink-0 relative">
          <div className="flex items-center justify-between gap-2.5 relative z-40">
            {/* Left: Studio Gallery Title, Total Count & Refresh */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#c8f135]/10 border border-[#c8f135]/30 flex items-center justify-center text-[#c8f135] shadow-[0_0_12px_rgba(200,241,53,0.15)]">
                <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h2 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white">Universal Gallery</h2>
                  <span className="text-[8px] sm:text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#c8f135]">
                    {gallery.length}
                  </span>
                  <button
                    onClick={() => fetchAssets()}
                    disabled={isGalleryLoading}
                    className="p-1 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white transition-all cursor-pointer"
                    title="Refresh Gallery from Cloud"
                  >
                    <RefreshCw className={cn("w-3 h-3", isGalleryLoading && "animate-spin text-[#c8f135]")} />
                  </button>
                </div>
                <p className="text-[9px] text-zinc-400 font-mono hidden sm:block">Studio, UGC, Marketing & Project Box Media</p>
              </div>
            </div>

            {/* Right: Folder / Project Dropdown, Project Box, Credits & Clear */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 relative z-50">
              {/* Folder / Project Selector Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProjectDropdown(prev => !prev)}
                  className="flex items-center gap-1.5 bg-[#0f0f15]/95 border border-white/10 rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-lg shadow-black/40 hover:bg-white/[0.03] active:scale-95 transition-all text-white text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider cursor-pointer select-none"
                  title="Filter Gallery by Folder / Project"
                >
                  <FolderOpen size={11} className="text-[#c8f135]" />
                  <span className="max-w-[110px] sm:max-w-[160px] truncate">
                    {activeProjectId === 'all' ? 'All Folders' : (projects.find(p => p.id === activeProjectId)?.name || 'Default Project')}
                  </span>
                  <ChevronDown size={10} className={cn("text-gray-400 transition-transform duration-200", showProjectDropdown && "rotate-180")} />
                </button>

                {showProjectDropdown && (
                  <>
                    <div className="fixed inset-0 z-[99]" onClick={() => setShowProjectDropdown(false)} />
                    <div className="absolute right-0 mt-1.5 w-56 bg-[#0c0c12] border border-white/15 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.95)] py-1 z-[100] overflow-hidden backdrop-blur-2xl">
                      <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveProjectId('all');
                            setShowProjectDropdown(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-[8.5px] font-black uppercase tracking-wider transition-colors flex items-center justify-between",
                            activeProjectId === 'all'
                              ? "text-[#c8f135] bg-[#c8f135]/5 font-black"
                              : "text-white/60 hover:text-white hover:bg-white/[0.02]"
                          )}
                        >
                          <span>📁 All Folders / Projects</span>
                          {activeProjectId === 'all' && <span className="text-[#c8f135] text-[10px]">✓</span>}
                        </button>
                        {projects.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setActiveProjectId(p.id);
                              setShowProjectDropdown(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 text-[8.5px] font-black uppercase tracking-wider transition-colors flex items-center justify-between",
                              p.id === activeProjectId
                                ? "text-[#c8f135] bg-[#c8f135]/5 font-black"
                                : "text-white/60 hover:text-white hover:bg-white/[0.02]"
                            )}
                          >
                            <span className="truncate">{p.name}</span>
                            {p.id === activeProjectId && <span className="text-[#c8f135] text-[10px]">✓</span>}
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-white/5 mt-1 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowProjectDropdown(false);
                            setNewProjectName('');
                            setShowNewProjectModal(true);
                          }}
                          className="w-full text-left px-3 py-2 text-[8.5px] font-black uppercase tracking-wider text-[#c8f135] hover:bg-[#c8f135]/10 transition-colors flex items-center gap-1.5"
                        >
                          <Plus size={11} />
                          <span>+ New Folder / Project...</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => useAppStore.getState().openProjectVault('character')}
                className="flex items-center gap-1.5 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-300 rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-[0_0_15px_rgba(6,182,212,0.15)] active:scale-95 transition-all text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider cursor-pointer select-none"
                title="Open Universal Project Box (Characters, Props, Locations, Wardrobe)"
              >
                <FolderOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" />
                <span>Project Box</span>
              </button>

              <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 bg-[#c8f135]/10 border border-[#c8f135]/30 rounded-xl">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#c8f135]" />
                <span className="text-[11px] sm:text-xs font-black text-[#c8f135]">{userCredits}</span>
                <span className="text-[8px] sm:text-[9px] font-mono text-zinc-400 uppercase hidden sm:inline">Shorts</span>
              </div>

              {gallery.length > 0 && (
                <button
                  onClick={handleClearGallery}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 transition-all cursor-pointer"
                  title="Clear Local Gallery Cache"
                >
                  <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: Media Filter Pills & Aspect Controls */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.04] overflow-x-auto custom-scrollbar relative z-10">
            {/* Media Type (All / Video / Image) */}
            <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setGalleryFilter('all')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                  galleryFilter === 'all' ? "bg-white/20 text-white font-black" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                All ({galleryCounts.all})
              </button>
              <button
                type="button"
                onClick={() => setGalleryFilter('video')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1",
                  galleryFilter === 'video' ? "bg-white/20 text-white font-black" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Video size={10} /> Videos ({galleryCounts.video})
              </button>
              <button
                type="button"
                onClick={() => setGalleryFilter('image')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1",
                  galleryFilter === 'image' ? "bg-white/20 text-white font-black" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <ImageIcon size={10} /> Images ({galleryCounts.image})
              </button>
            </div>

            {/* Right: Aspect Ratio Filter */}
            <div className="flex items-center gap-1.5 shrink-0">
              <select
                value={aspectFilter}
                onChange={(e) => setAspectFilter(e.target.value)}
                className="bg-black/40 text-zinc-300 border border-white/[0.08] rounded-lg text-[8.5px] font-mono font-bold px-2 py-1 outline-none cursor-pointer hover:border-white/20"
              >
                <option value="all">All Ratios</option>
                <option value="16:9">16:9 Wide</option>
                <option value="9:16">9:16 Reel</option>
                <option value="1:1">1:1 Square</option>
              </select>
            </div>
          </div>
        </div>

        {/* Gallery Grid Area — Dynamic Tight-Gap Masonry Flow */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1 sm:p-2 bg-[#07070a]" style={{ minHeight: 0 }}>
          {gallery.length === 0 && !isBusy ? (
            <div className="h-full min-h-[220px] sm:min-h-[280px] flex flex-col items-center justify-center text-center p-4 sm:p-6 border-2 border-dashed border-white/[0.08] rounded-2xl sm:rounded-3xl bg-white/[0.01]">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#c8f135]/20 via-violet-500/10 to-transparent border border-[#c8f135]/30 flex items-center justify-center mb-3 text-[#c8f135] shadow-[0_0_20px_rgba(200,241,53,0.15)]">
                <Clapperboard className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white mb-1">Your Studio Gallery is Empty</h3>
              <p className="text-[10.5px] sm:text-xs text-zinc-400 max-w-sm leading-relaxed mb-4 font-medium">
                Enter your prompt and configuration in the studio controls to generate high-fidelity cinematic videos!
              </p>
              {isMobile && (
                <button
                  type="button"
                  onClick={() => setMobileTab('controls')}
                  className="px-4 py-2 rounded-xl bg-[#c8f135] text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-[#c8f135]/20 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-current text-black" />
                  <span>Open Studio Controls</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex gap-1.5 sm:gap-2 items-start w-full">
              {masonryColumns.map((col, colIdx) => (
                <div key={colIdx} className="flex-1 flex flex-col gap-1.5 sm:gap-2 min-w-0">
                  {col.map((item) => (
                    <StudioGalleryCard
                      key={item.id}
                      item={item}
                      layout="masonry"
                      onOpenLightbox={setLightboxItem}
                      onDownload={handleDownload}
                      onDeleteItem={handleDeleteItem}
                      onUseAsOmniRef={handleUseAsOmniRef}
                      onExtendVideo={handleExtendVideo}
                      onUpscale={handleUpscale}
                      onRetry={(failedItem, targetAction) => {
                        handleDeleteItem(failedItem.id);
                        if (targetAction === 'seedance') {
                          setPanelTab('seedance');
                          setActiveEngine('seedance-fast');
                          if (failedItem.prompt) setPromptText(failedItem.prompt);
                          if (isMobile) setMobileTab('controls');
                          else setIsSidebarOpen(true);
                        } else if (targetAction === 'edit') {
                          if (failedItem.prompt) {
                            if (panelTab === 'omni' || panelTab === 'omni-multi') setOmniPromptText(failedItem.prompt);
                            else setPromptText(failedItem.prompt);
                          }
                          if (isMobile) setMobileTab('controls');
                          else setIsSidebarOpen(true);
                        } else {
                          if (failedItem.prompt) {
                            if (panelTab === 'omni' || panelTab === 'omni-multi') setOmniPromptText(failedItem.prompt);
                            else setPromptText(failedItem.prompt);
                            handleGenerate();
                          }
                        }
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Floating "Create Video" Action Button */}
        {isMobile && mobileTab === 'gallery' && (
          <button
            type="button"
            onClick={() => setMobileTab('controls')}
            className="md:hidden fixed bottom-24 right-4 z-40 px-4 py-2.5 rounded-full bg-[#c8f135] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(200,241,53,0.5)] border border-[#d4ff00] flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-current text-black" />
            <span>Create Video</span>
          </button>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxItem && (
          <CinematicLightbox
            lightboxItem={lightboxItem}
            setLightboxItem={setLightboxItem}
            setGallery={setGallery}
            handleUpscale={handleUpscale}
            handleGenerateAnglesGrid={handleGenerateAnglesGrid}
            handleDownload={handleDownload}
            handleDeleteItem={handleDeleteItem}
            setShowInpaint={setShowInpaint}
            setShowStoryboard={setShowStoryboard}
            upscalingItems={upscalingItems}
            setUpscalingItems={setUpscalingItems}
            setFirstFrameImage={setFirstFrameImage}
            setFirstFramePreview={setFirstFramePreview}
            setLastFrameImage={setLastFrameImage}
            setLastFramePreview={setLastFramePreview}
            setOmniFirstFrameImage={setOmniFirstFrameImage}
            setOmniFirstFramePreview={setOmniFirstFramePreview}
            setOmniLastFrameImage={setOmniLastFrameImage}
            setOmniLastFramePreview={setOmniLastFramePreview}
            setOmniRefVideoPreview={setOmniRefVideoPreview}
            setOmniMultiVideos={setOmniMultiVideos}
            omniMultiVideos={omniMultiVideos}
            omniMultiImages={omniMultiImages}
            setOmniMultiImages={setOmniMultiImages}
            handleUseAsMultiRefImage={handleUseAsMultiRefImage}
            handleUseAsMultiRefVideo={handleUseAsMultiRefVideo}
            handleUseAsMotionSubject={handleUseAsMotionSubject}
            handleUseAsMotionVideo={handleUseAsMotionVideo}
            setMotionRefVideo={setMotionRefVideo}
            setMotionRefVideoPreview={setMotionRefVideoPreview}
            omniRefImages={omniRefImages}
            setOmniRefImages={setOmniRefImages}
            omniRefPreviews={omniRefPreviews}
            setOmniRefPreviews={setOmniRefPreviews}
            setPromptText={setPromptText}
            setOmniPromptText={setOmniPromptText}
            setPanelTab={setPanelTab}
            handleExtendVideo={handleExtendVideo}
            userId={userId}
          />
        )}
      </AnimatePresence>

      {/* Reference Panel Modal */}
      <ReferencePanel
        showRefBoard={showRefBoard}
        setShowRefBoard={setShowRefBoard}
        stagedRefBoard={stagedRefBoard}
        setStagedRefBoard={setStagedRefBoard}
        removeRefItem={(id) => setStagedRefBoard(prev => prev.filter(i => i.id !== id))}
        handleSaveRefBoard={() => setShowRefBoard(false)}
        handleCancelRefBoard={() => setShowRefBoard(false)}
        refUploadInputRef={refUploadInputRef}
        handleRefUpload={handleFileUpload}
        showLibPicker={showLibPicker}
        setShowLibPicker={setShowLibPicker}
        libPickerTarget={libPickerTarget}
        setLibPickerTarget={setLibPickerTarget}
        addRefItem={(item) => setStagedRefBoard(prev => [...prev, item])}
        setActiveRefUploadCategory={setActiveRefUploadCategory}
        isSeedance={false}
        isOmni={panelTab === 'omni'}
        seedanceRefs={seedanceRefs}
        onSeedanceRefUpload={() => {}}
        onRemoveSeedanceRef={() => {}}
      />

      {/* Inpaint Canvas Editor */}
      {showInpaint && lightboxItem && (
        <InpaintEditor
          imageUrl={lightboxItem.url}
          userId={userId}
          onClose={() => setShowInpaint(false)}
          onDone={() => setShowInpaint(false)}
        />
      )}

      {/* Storyboard Editor */}
      {showStoryboard && lightboxItem && (
        <StoryboardEditor
          lightboxItem={lightboxItem}
          userId={userId}
          onClose={() => setShowStoryboard(false)}
          setGallery={setGallery}
          setLightboxItem={setLightboxItem}
        />
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0b0b0e] border border-white/10 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                <FolderOpen size={14} className="text-[#c8f135]" />
                Create New Folder / Project
              </h3>
              <button
                type="button"
                onClick={() => setShowNewProjectModal(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Folder / Project Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Summer Campaign, Neon Tokyo..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-[11px] font-bold outline-none focus:border-[#c8f135] focus:bg-white/[0.05] transition-all mt-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newProjectName.trim()) {
                      const name = newProjectName.trim();
                      const newProj = { id: 'proj_' + Date.now(), name };
                      setProjects(prev => Array.isArray(prev) ? [...prev, newProj] : [newProj]);
                      setActiveProjectId(newProj.id);
                      setShowNewProjectModal(false);
                    }
                  }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-[9px] font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newProjectName.trim()}
                  onClick={() => {
                    if (newProjectName.trim()) {
                      const name = newProjectName.trim();
                      const newProj = { id: 'proj_' + Date.now(), name };
                      setProjects(prev => Array.isArray(prev) ? [...prev, newProj] : [newProj]);
                      setActiveProjectId(newProj.id);
                      setShowNewProjectModal(false);
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-[#c8f135] disabled:bg-zinc-800 disabled:text-white/20 text-black font-black text-[9px] uppercase tracking-widest hover:bg-[#bce628] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#c8f135]/20 flex items-center gap-1 cursor-pointer"
                >
                  Create Folder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
