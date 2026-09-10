import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Film, Image as ImageIcon, Video, Layers, BookOpen, Clapperboard,
  Upload, Trash2, Check, Zap, Cpu, Code, HelpCircle, RefreshCw, Sliders, Play, Loader2,
  ChevronDown, ChevronLeft, ChevronRight, Users, Tag, Eye, Download, Maximize2, Wand2, Shield, AlertCircle, Camera,
  Volume2, VolumeX, Copy, CheckCheck
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getApiUrl } from '../../config/apiConfig';
import { useAppStore } from '../../store';
import { extractVideoFrame, downloadDirect, getVideoDuration } from '../../lib/videoUtils';
import { SidePanel } from '../cinemaStudio/SidePanel';
import { ReferencePanel } from '../cinemaStudio/ReferencePanel';
import { CinematicLightbox } from '../cinemaStudio/CinematicLightbox';
import { InpaintEditor } from '../common/InpaintEditor';
import { StoryboardEditor } from '../cinemaStudio/StoryboardEditor';

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diffSec = Math.floor((now - Number(timestamp)) / 1000);
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
  onRetry
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);

  const isVideo = item.type === 'video' || item.url?.includes('.mp4');
  const isScreenshot = item.engine === 'Screenshot' ||
                       item.engine === 'ZeroLens Frame Extract' ||
                       (typeof item.id === 'string' && item.id.startsWith('frame_')) ||
                       (item.prompt && item.prompt.toLowerCase().startsWith('screenshot'));
  const isSequence = item.engine?.toLowerCase().includes('sequence') ||
                     (item.prompt && item.prompt.toLowerCase().includes('sequence')) ||
                     item.type === 'sequence';

  const cleanPromptText = (item.prompt || 'Cinematic Asset')
    .replace(/^Screenshot:\s*/i, '')
    .replace(/ZeroLens Frame Extract/i, '')
    .replace(/ZeroLens extracted frame/i, '')
    .trim();

  const handleMouseEnter = () => {
    if (videoRef.current && isVideo) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current && isVideo) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
      setProgress(0);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      if (total > 0) {
        setProgress((current / total) * 100);
      }
    }
  };

  const toggleAudio = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsAudioMuted(videoRef.current.muted);
    }
  };

  const rawAspect = (item.aspectRatio || item.aspect || '16:9').trim();
  const isPortrait = rawAspect === '9:16';
  const isSquare = rawAspect === '1:1';
  const isLandscape = rawAspect === '16:9' || rawAspect === '21:9' || rawAspect === '4:3';

  // Aspect ratio styling
  const getAspectClass = () => {
    if (layout === 'cinematic' || layout === 'uniform') {
      return 'aspect-[16/9]';
    }
    if (rawAspect === '9:16') return 'aspect-[9/16]';
    if (rawAspect === '1:1') return 'aspect-square';
    if (rawAspect === '4:3') return 'aspect-[4/3]';
    if (rawAspect === '21:9') return 'aspect-[21/9]';
    return 'aspect-[16/9]';
  };

  const isCinematicPillarbox = (layout === 'cinematic' || layout === 'uniform') && isPortrait;

  if (item.status === 'generating') {
    return (
      <div
        className={cn(
          "w-full rounded-2xl border border-[#c8f135]/40 bg-[#0c0c14] relative overflow-hidden shadow-[0_0_30px_rgba(200,241,53,0.2)] flex flex-col justify-between p-4.5 text-center group min-h-[220px]",
          getAspectClass()
        )}
      >
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c8f135]/15 to-transparent pointer-events-none"
          style={{ animation: 'shimmer 1.8s infinite', transform: 'translateX(-100%)' }}
        />
        
        {/* Top Badges */}
        <div className="w-full flex items-center justify-between z-10">
          <span className="px-2 py-0.5 rounded-full bg-[#c8f135]/15 text-[#c8f135] border border-[#c8f135]/30 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c8f135] animate-ping" />
            <span>{item.engine || 'Rendering Video'}</span>
          </span>
          <span className="text-[9px] font-mono text-zinc-400 font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
            {rawAspect} · {item.duration || 5}s
          </span>
        </div>

        {/* Center Spinner */}
        <div className="relative z-10 flex flex-col items-center gap-2.5 my-auto py-2">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-[#c8f135]/20 animate-ping" />
            <div className="absolute inset-0 rounded-full border-2 border-t-[#c8f135] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            <Film className="absolute inset-0 m-auto w-5 h-5 text-[#c8f135]" />
          </div>
          <div className="space-y-1 max-w-xs px-2">
            <p className="text-xs font-bold text-white tracking-wide">
              Rendering Video Clip...
            </p>
            <p className="text-[10px] text-zinc-400 font-mono line-clamp-2">
              "{cleanPromptText}"
            </p>
          </div>
        </div>

        {/* Bottom Status & Cancel */}
        <div className="w-full flex items-center justify-between pt-2 border-t border-white/5 z-10">
          <span className="text-[9px] font-mono text-[#c8f135]/80 animate-pulse">
            Processing job in background...
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id, e); }}
            className="text-[9px] text-zinc-500 hover:text-white transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-white/10"
            title="Cancel / Dismiss"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (item.status === 'failed') {
    const isPolicyViolation = item.error?.includes('Responsible AI') || 
                              item.error?.includes('celebrities') || 
                              item.error?.includes('policy') ||
                              item.error?.includes('prohibited') ||
                              item.error?.includes('prominent individuals') ||
                              item.error?.includes('recognizable');
    return (
      <div className={cn(
        "w-full rounded-2xl flex flex-col items-center justify-between p-4 relative overflow-hidden shadow-xl min-h-[220px]",
        isPolicyViolation 
          ? "border-2 border-amber-500/50 bg-gradient-to-b from-[#1c1408] to-[#0f0b04]" 
          : "border border-red-500/30 bg-[#160b0c]"
      )}>
        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-center w-full">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            isPolicyViolation ? "bg-amber-500/20 text-amber-400" : "bg-red-500/10 text-red-400"
          )}>
            <AlertCircle size={20} />
          </div>
          <span className={cn(
            "text-[10px] font-black uppercase tracking-wider",
            isPolicyViolation ? "text-amber-400" : "text-red-400"
          )}>
            {isPolicyViolation ? "Google Policy Restriction" : "Generation Failed"}
          </span>
          <p className="text-[10px] text-white/80 leading-relaxed font-sans max-h-24 overflow-y-auto px-1 custom-scrollbar">
            {item.error || 'Server error or quota depleted'}
          </p>
          {isPolicyViolation && (
            <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full mt-1">
              ✓ Shorts credits refunded automatically
            </span>
          )}
        </div>
        <div className="w-full flex gap-2 pt-2 border-t border-white/5 mt-2">
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id, e); }}
            className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
          >
            Dismiss
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRetry && onRetry(item); }}
            className="flex-1 py-1.5 rounded-lg bg-[#c8f135]/20 hover:bg-[#c8f135]/30 text-[#c8f135] text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
          >
            {isPolicyViolation ? "Change Media" : "Retry"}
          </button>
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Media Layer */}
      {isCinematicPillarbox ? (
        // Cinematic Theater Pillarbox for Portrait items in 16:9 widescreen frame
        <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
          {/* Ambient blurred backdrop */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {isVideo ? (
              <video
                src={item.url}
                className="w-full h-full object-cover blur-2xl opacity-30 scale-125"
                muted
                loop
                playsInline
              />
            ) : (
              <img
                src={item.url}
                className="w-full h-full object-cover blur-2xl opacity-30 scale-125"
                alt=""
              />
            )}
          </div>
          {/* Centered crisp portrait frame */}
          <div className="h-full aspect-[9/16] relative z-10 mx-auto shadow-2xl overflow-hidden bg-black">
            {isVideo ? (
              <video
                ref={videoRef}
                src={item.url}
                className="w-full h-full object-cover"
                playsInline
                muted={isAudioMuted}
                loop
                preload="metadata"
                onTimeUpdate={handleTimeUpdate}
              />
            ) : (
              <img
                src={item.url}
                alt={cleanPromptText}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            )}
          </div>
        </div>
      ) : isVideo ? (
        <div className="w-full h-full relative bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            src={item.url}
            className="w-full h-full object-cover"
            playsInline
            muted={isAudioMuted}
            loop
            preload="metadata"
            onTimeUpdate={handleTimeUpdate}
          />
        </div>
      ) : (
        <img
          src={item.url}
          alt={cleanPromptText}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      )}

      {/* Center Play Button Overlay when paused */}
      {isVideo && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:scale-110 transition-transform duration-200 z-10">
          <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
            <Play size={18} className="text-white fill-white ml-0.5" />
          </div>
        </div>
      )}

      {/* Video Progress Scrubber Bar on Hover */}
      {isVideo && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
          <div
            className="h-full bg-[#c8f135] shadow-[0_0_8px_#c8f135] transition-[width] duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Badges Top-Left */}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-20 pointer-events-none">
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
        ) : item.duration ? (
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
        {/* Audio Toggle (Video Only) - Visible on both mobile & desktop */}
        {isVideo && (
          <button
            onClick={toggleAudio}
            className={cn(
              "p-1 sm:p-2 rounded-lg sm:rounded-xl border backdrop-blur-md transition-all shadow-lg cursor-pointer",
              !isAudioMuted
                ? "bg-[#c8f135] text-black border-[#c8f135] shadow-[0_0_10px_rgba(200,241,53,0.4)]"
                : "bg-black/80 hover:bg-white/20 text-white border-white/20"
            )}
            title={isAudioMuted ? "Unmute Preview Audio" : "Mute Preview Audio"}
          >
            {isAudioMuted ? <VolumeX size={11} className="sm:w-[13px] sm:h-[13px]" /> : <Volume2 size={11} className="sm:w-[13px] sm:h-[13px]" />}
          </button>
        )}

        {/* Use as Omni Reference */}
        <button
          onClick={(e) => onUseAsOmniRef(item, e)}
          className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-black/80 hover:bg-[#c8f135] text-white hover:text-black border border-white/20 backdrop-blur-md transition-all shadow-lg cursor-pointer flex items-center justify-center"
          title={item.type === 'image' ? "Use as Omni Reference Image" : "Use as Omni Reference Video"}
        >
          <Layers size={11} className="sm:w-[13px] sm:h-[13px]" />
        </button>

        {/* Download */}
        <button
          onClick={() => onDownload(item.url, item.type, item.id)}
          className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-black/80 hover:bg-[#c8f135] text-white hover:text-black border border-white/20 backdrop-blur-md transition-all shadow-lg cursor-pointer flex items-center justify-center"
          title="Download Directly to Device"
        >
          <Download size={11} className="sm:w-[13px] sm:h-[13px]" />
        </button>

        {/* Expand / Lightbox - Visible on both mobile & desktop */}
        <button
          onClick={() => onOpenLightbox(item)}
          className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-black/80 hover:bg-[#c8f135] text-white hover:text-black border border-white/20 backdrop-blur-md transition-all shadow-lg cursor-pointer flex items-center justify-center"
          title="Expand View / Production Suite"
        >
          <Maximize2 size={11} className="sm:w-[13px] sm:h-[13px]" />
        </button>

        {/* Delete - Visible on both mobile & desktop */}
        <button
          onClick={(e) => onDeleteItem(item.id, e)}
          className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-black/80 hover:bg-red-500 text-white border border-white/20 backdrop-blur-md transition-all shadow-lg cursor-pointer flex items-center justify-center"
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
  const { userProfile, updateShortsBalance } = useAppStore();
  const setShowingAuthModal = useAppStore(state => state.setShowingAuthModal);
  const userId = userProfile?.id || null;
  const userCredits = userProfile?.shorts_balance ?? 100;

  const checkAuthAndRun = useCallback((fn) => {
    if (!userId) {
      if (setShowingAuthModal) setShowingAuthModal(true);
      return;
    }
    fn();
  }, [userId, setShowingAuthModal]);

  // Active Engine & Mode State
  const [activeEngine, setActiveEngine] = useState('gemini-omni-1.1-flash-preview');
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

  // Projects State
  const [projects, setProjects] = useState([{ id: 'proj_default', name: 'Default Project' }]);
  const [activeProjectId, setActiveProjectId] = useState('proj_default');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  // Common Unified Gallery Loader across UGC, Marketing, Cinema Studio, and Studio
  const loadMergedGallery = useCallback(() => {
    try {
      const userKey = userId && userId !== 'anon' ? `cinematic_studio_gallery_${userId}` : null;
      const userG = userKey ? JSON.parse(localStorage.getItem(userKey) || '[]') : [];
      const studioG = JSON.parse(localStorage.getItem('cs_studio_gallery') || '[]');
      const csG = JSON.parse(localStorage.getItem('cs_gallery') || '[]');
      const ugcG = JSON.parse(localStorage.getItem('ugc_video_gallery') || '[]');
      const marketingG = JSON.parse(localStorage.getItem('marketing_gallery') || '[]');

      const map = new Map();
      [...userG, ...studioG, ...csG, ...ugcG, ...marketingG].forEach(item => {
        if (!item) return;
        const key = item.id || item.url || item.timestamp;
        if (key && !map.has(key)) {
          map.set(key, item);
        }
      });

      return Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch {
      return [];
    }
  }, [userId]);

  const [gallery, setGallery] = useState(loadMergedGallery);
  const activeJobs = useMemo(() => gallery.filter(i => i && i.status === 'generating'), [gallery]);
  const activeJobsCount = activeJobs.length;

  const maxConcurrent = useMemo(() => {
    const tier = (userProfile?.tier || 'CREATOR').toUpperCase();
    if (tier === 'ENTERPRISE') return 16;
    if (tier === 'STUDIO') return 8;
    if (tier === 'PRO' || tier === 'CREATOR') return 4;
    return 2;
  }, [userProfile?.tier]);

  const isMaxConcurrentReached = activeJobsCount >= maxConcurrent;
  const isBusy = isMaxConcurrentReached;
  const [lightboxItem, setLightboxItem] = useState(null);
  const [showInpaint, setShowInpaint] = useState(false);
  const [showStoryboard, setShowStoryboard] = useState(false);
  const [showAnglesModal, setShowAnglesModal] = useState(false);
  const [angle, setAngle] = useState('eye-level');
  const [upscalingItems, setUpscalingItems] = useState(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [mobileTab, setMobileTab] = useState('controls'); // 'controls' | 'gallery'
  const [galleryFilter, setGalleryFilter] = useState('all');
  const [aspectFilter, setAspectFilter] = useState('all'); // 'all' (All Ratio default)
  const [galleryLayout, setGalleryLayout] = useState('masonry'); // 'masonry' (Masonry default)
  const [galleryDensity, setGalleryDensity] = useState('compact'); // 'compact' (Compact default)

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setWindowWidth(w);
      const mobile = w < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getAspectClass = useCallback((ratio) => {
    if (ratio === '9:16') return 'aspect-[9/16]';
    if (ratio === '1:1') return 'aspect-square';
    if (ratio === '4:3') return 'aspect-[4/3]';
    if (ratio === '21:9') return 'aspect-[21/9]';
    return 'aspect-[16/9]';
  }, []);

  const filteredGallery = useMemo(() => {
    return gallery.filter(item => {
      if (!item) return false;
      if (galleryFilter === 'video') {
        const isVid = item.type === 'video' || item.url?.includes('.mp4');
        if (!isVid) return false;
      } else if (galleryFilter === 'image') {
        const isVid = item.type === 'video' || item.url?.includes('.mp4');
        if (isVid) return false;
      }

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
  }, [gallery, galleryFilter, aspectFilter]);

  // Dynamic Tight-Gap Shortest-Column Masonry Balancer (2 cols on mobile, 3-5 cols on desktop)
  const masonryColumns = useMemo(() => {
    const isCompact = galleryDensity === 'compact';
    const count = isMobile
      ? 2
      : (isCompact
          ? (windowWidth >= 1600 ? 5 : windowWidth >= 1200 ? 4 : 3)
          : (windowWidth >= 1200 ? 3 : 2));
    const cols = Array.from({ length: count }, () => []);
    const heights = Array.from({ length: count }, () => 0);

    filteredGallery.forEach((item) => {
      let minCol = 0;
      for (let c = 1; c < count; c++) {
        if (heights[c] < heights[minCol]) {
          minCol = c;
        }
      }
      cols[minCol].push(item);
      const raw = (item.aspectRatio || item.aspect || '16:9').trim();
      const mult = (raw === '9:16') ? 1.7778 : (raw === '1:1' ? 1.0 : (raw === '4:3' ? 0.75 : 0.5625));
      heights[minCol] += mult;
    });

    return cols;
  }, [filteredGallery, isMobile, windowWidth, galleryDensity]);

  // Safe gallery persistence with payload sanitization and quota protection
  useEffect(() => {
    if (!Array.isArray(gallery) || gallery.length === 0) return;

    const sanitizeItem = (item) => {
      if (!item) return null;
      const rawUrl = item.url || '';
      // Strip oversized base64 data URLs to protect localStorage 5MB quota
      const safeUrl = (typeof rawUrl === 'string' && rawUrl.length > 5000 && rawUrl.startsWith('data:'))
        ? null
        : rawUrl;

      return {
        id: item.id,
        type: item.type || 'video',
        url: safeUrl,
        prompt: (item.prompt || '').slice(0, 300),
        engine: item.engine,
        duration: item.duration,
        aspectRatio: item.aspectRatio,
        resolution: item.resolution,
        timestamp: item.timestamp,
        status: item.status,
        projectId: item.projectId
      };
    };

    const tryPersist = (items) => {
      try {
        const sanitized = items.map(sanitizeItem).filter(i => i && i.url);
        const data = JSON.stringify(sanitized);

        const userKey = userId && userId !== 'anon' ? `cinematic_studio_gallery_${userId}` : null;
        if (userKey) {
          try {
            localStorage.setItem(userKey, data);
          } catch (_) {
            void 0;
          }
        }
        try {
          localStorage.setItem('cs_studio_gallery', data);
        } catch (_) {
          void 0;
        }

        // Clean up duplicate heavy legacy keys to free origin quota
        try {
          localStorage.removeItem('cs_gallery');
          localStorage.removeItem('zerolens_unified_gallery');
        } catch (_) {
          void 0;
        }
      } catch (_) {
        void 0;
      }
    };

    try {
      tryPersist(gallery.slice(0, 30));
    } catch (_) {
      try {
        localStorage.removeItem('cs_gallery');
        localStorage.removeItem('zerolens_unified_gallery');
        localStorage.removeItem('ugc_video_gallery');
        tryPersist(gallery.slice(0, 10));
      } catch (_) {
        void 0;
      }
    }
  }, [gallery, userId]);

  // Helper to ensure blob: URLs are converted to Base64 before sending to backend
  const resolveBlobToBase64 = async (url) => {
    if (!url || typeof url !== 'string' || !url.startsWith('blob:')) return url;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (_) {
      return null;
    }
  };

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

  // Handle Generation
  const handleGenerate = async (customPrompt, customEngine, customOptions = {}) => {
    const engineToUse = customEngine || activeEngine;
    const isMotion = panelTab === 'motion' || engineToUse.includes('motion') || engineToUse.includes('kling');
    const isOmni = !isMotion && (panelTab === 'omni' || panelTab === 'omni-multi' || engineToUse.includes('omni') || engineToUse.includes('flash'));
    const promptToUse = customPrompt || (isMotion ? (promptText || '') : (isOmni ? omniPromptText : promptText));
    const activeDuration = customOptions?.duration !== undefined ? customOptions.duration : duration;
    const activeRatio = customOptions?.aspectRatio !== undefined ? customOptions.aspectRatio : aspectRatio;
    const activeResolution = customOptions?.resolution !== undefined ? customOptions.resolution : (resolution || '720p').toLowerCase();

    // Validation
    const showToast = useAppStore.getState().showToast;
    if (isMotion) {
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
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setMobileTab('gallery');
      }
      const tempId = 'gen_' + Date.now();
      const newClip = {
        id: tempId,
        type: 'video',
        prompt: promptToUse || (isMotion ? 'Kling 3.0 Motion Control' : 'Cinematic Video'),
        engine: isMotion ? `Kling 3.0 (${motionMode === 'pro' ? 'Pro 1080p' : 'Std 720p'})` : (isOmni ? 'Omni' : engineToUse),
        duration: isMotion ? Math.ceil(motionRefVideoDuration || 5) : activeDuration,
        aspectRatio: activeRatio,
        resolution: isMotion ? (motionMode === 'pro' ? '1080p' : '720p') : activeResolution,
        timestamp: Date.now(),
        status: 'generating',
        url: null
      };

      setGallery(prev => [newClip, ...prev]);

      try {
        if (isMotion) {
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

          setGallery(prev => prev.map(item => item.id === tempId ? {
            ...item,
            status: 'completed',
            url: completedUrl
          } : item));

          const spentCredits = (motionMode === 'pro' ? 9 : 7) * motionDur;
          if (typeof updateShortsBalance === 'function') {
            updateShortsBalance(Math.max(0, userCredits - spentCredits));
          }
          if (showToast) showToast('Kling 3.0 Motion Control video rendered!', 'success');
          return;
        }

        let endpoint = getApiUrl('/api/veo-i2v');
        let payload = {};

        if (isOmni) {
          endpoint = getApiUrl('/api/omni-i2v');
          const rawMultiImages = (omniMultiImages || []).filter(Boolean);
          const rawMultiVideos = (omniMultiVideos || []).filter(Boolean);
          const resolvedMultiImages = (await Promise.all(rawMultiImages.map(img => resolveBlobToBase64(img)))).filter(Boolean);
          const resolvedMultiVideos = (await Promise.all(rawMultiVideos.map(v => resolveBlobToBase64(v)))).filter(Boolean);
          const rawPrimary = panelTab === 'omni-multi' 
            ? (resolvedMultiImages[0] || null)
            : (customOptions?.firstFrame || firstFrameImage || omniFirstFrameImage || resolvedMultiImages[0] || null);
          const rawSecondary = panelTab === 'omni-multi'
            ? null
            : (customOptions?.lastFrame || lastFrameImage || omniLastFrameImage || null);
          const primaryImg = await resolveBlobToBase64(rawPrimary);
          const secondaryImg = await resolveBlobToBase64(rawSecondary);
          const resolvedOmniRefImages = (await Promise.all((omniRefImages || []).filter(Boolean).map(img => resolveBlobToBase64(img)))).filter(Boolean);
          const resolvedOmniRefVideo = omniRefVideoPreview ? await resolveBlobToBase64(omniRefVideoPreview) : null;

          let directedPrompt = promptToUse;
          if (primaryImg && secondaryImg) {
            directedPrompt = `[Start Frame: initial starting image at 0s] [End Frame: final ending image at ${activeDuration}s]. The video MUST begin directly at the first frame at 0s, animate smoothly through: ${promptToUse}, and conclude seamlessly matching the last frame at ${activeDuration}s. Single continuous shot.`;
          } else if (primaryImg) {
            directedPrompt = `[Start Frame: initial starting image at 0s]. The video MUST begin directly at this first frame at 0s and animate smoothly through: ${promptToUse}.`;
          } else if (secondaryImg) {
            directedPrompt = `[End Frame: final ending image at ${activeDuration}s]. The video MUST animate through: ${promptToUse}, and conclude seamlessly matching this last frame at ${activeDuration}s.`;
          }

          const hasMultiRefs = resolvedMultiImages.length > 1 || resolvedMultiVideos.length > 0 || resolvedOmniRefImages.length > 0 || !!resolvedOmniRefVideo;
          const taskToUse = (primaryImg && secondaryImg) ? 'reference_to_video' : (hasMultiRefs ? 'reference_to_video' : (omniTask || 'image_to_video'));

          const finalRefImages = resolvedMultiImages.length > 0 ? resolvedMultiImages : resolvedOmniRefImages;
          const finalRefVideos = resolvedMultiVideos.length > 0 ? resolvedMultiVideos : (resolvedOmniRefVideo ? [resolvedOmniRefVideo] : []);

          payload = {
            prompt: directedPrompt,
            motionPrompt: directedPrompt,
            model: 'gemini-omni-1.1-flash-preview',
            task: taskToUse,
            duration: activeDuration,
            aspectRatio: activeRatio,
            resolution: activeResolution,
            generateAudio,
            image: primaryImg,
            firstFrame: primaryImg,
            firstFrameImage: primaryImg,
            lastFrame: secondaryImg,
            lastFrameImage: secondaryImg,
            imageEnd: secondaryImg,
            refImages: finalRefImages,
            ref_images: finalRefImages,
            refVideos: finalRefVideos,
            ref_videos: finalRefVideos,
            refVideo: finalRefVideos[0] || undefined,
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
            generateAudio,
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

        setGallery(prev => prev.map(item => item.id === tempId ? {
          ...item,
          status: 'completed',
          url: videoUrl
        } : item));

        if (data.newCredits !== undefined && typeof updateShortsBalance === 'function') {
          updateShortsBalance(data.newCredits);
        }
      } catch (err) {
        console.error("Generation error:", err);
        setGallery(prev => prev.map(item => item.id === tempId ? {
          ...item,
          status: 'failed',
          error: err.message
        } : item));
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
    setGallery(prev => {
      const next = prev.filter(item => item.id !== id);
      try {
        localStorage.setItem('cs_studio_gallery', JSON.stringify(next));
      } catch (err) {
        console.debug('[StudioPage] localStorage sync failed:', err);
      }
      return next;
    });
    if (lightboxItem && lightboxItem.id === id) {
      setLightboxItem(null);
    }
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast("Asset removed from gallery.", "info");
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
      setPanelTab('omni');
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
    setPanelTab('omni');
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
      const newImageItem = {
        id: newId,
        type: 'image',
        url: frameDataUrl,
        prompt: cleanPrompt,
        engine: 'Screenshot',
        aspect: item.aspectRatio || item.aspect || '16:9',
        timestamp: Date.now()
      };
      setGallery(prev => [newImageItem, ...prev]);
      if (showToast) showToast("Screenshot added to gallery!", "success");

      fetch(getApiUrl('/api/save-asset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: frameDataUrl,
          fileName: `screenshot_${Date.now()}.png`,
          userId: userId,
          type: 'image',
          aspect: item.aspectRatio || item.aspect || '16:9',
          prompt: cleanPrompt,
          engine: 'Screenshot'
        })
      }).then(r => r.json()).then(data => {
        if (data.url || data.path) {
          setGallery(prev => prev.map(i => i.id === newId ? { ...i, url: data.url || data.path } : i));
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

  const handleUpscale = (item) => {
    setUpscalingItems(prev => new Set(prev).add(item.id));
    setTimeout(() => {
      setUpscalingItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 3000);
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
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="h-full w-full border-r border-white/[0.08] bg-[#07070b] flex flex-col overflow-hidden"
          style={{ minWidth: 0 }}
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
        {/* Gallery Top Navigation / Minimal Header */}
        <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b border-white/[0.08] bg-[#09090e]/95 backdrop-blur-xl flex items-center justify-between z-20 shrink-0 gap-2.5">
          {/* Left: Studio Gallery Title & Total Count */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#c8f135]/10 border border-[#c8f135]/30 flex items-center justify-center text-[#c8f135] shadow-[0_0_12px_rgba(200,241,53,0.15)]">
              <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white">Studio Gallery</h2>
                <span className="text-[8px] sm:text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#c8f135]">
                  {gallery.length}
                </span>
              </div>
              <p className="text-[9px] text-zinc-400 font-mono hidden sm:block">ZeroLens Studio Generations</p>
            </div>
          </div>

          {/* Right: Credits & Clear */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 bg-[#c8f135]/10 border border-[#c8f135]/30 rounded-xl">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#c8f135]" />
              <span className="text-[11px] sm:text-xs font-black text-[#c8f135]">{userCredits}</span>
              <span className="text-[8px] sm:text-[9px] font-mono text-zinc-400 uppercase hidden sm:inline">Shorts</span>
            </div>

            {gallery.length > 0 && (
              <button
                onClick={handleClearGallery}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 transition-all cursor-pointer"
                title="Clear Gallery"
              >
                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Gallery Grid Area — Dynamic Tight-Gap Masonry Flow */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 sm:p-2.5 bg-[#07070a]" style={{ minHeight: 0 }}>
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
              {masonryColumns.map((colItems, colIdx) => (
                <div key={colIdx} className="flex-1 flex flex-col gap-1.5 sm:gap-2 min-w-0">
                  {colItems.map((item) => (
                    <StudioGalleryCard
                      key={item.id}
                      item={item}
                      layout="masonry"
                      onOpenLightbox={setLightboxItem}
                      onDownload={handleDownload}
                      onDeleteItem={handleDeleteItem}
                      onUseAsOmniRef={handleUseAsOmniRef}
                      onRetry={(failedItem) => {
                        handleDeleteItem(failedItem.id);
                        if (failedItem.prompt) {
                          if (panelTab === 'omni') setOmniPromptText(failedItem.prompt);
                          else setPromptText(failedItem.prompt);
                          handleGenerate();
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
            className="md:hidden fixed bottom-6 right-5 z-40 px-4 py-2.5 rounded-full bg-[#c8f135] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(200,241,53,0.5)] border border-[#d4ff00] flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
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
            omniRefImages={omniRefImages}
            setOmniRefImages={setOmniRefImages}
            omniRefPreviews={omniRefPreviews}
            setOmniRefPreviews={setOmniRefPreviews}
            setPromptText={setPromptText}
            setOmniPromptText={setOmniPromptText}
            setPanelTab={setPanelTab}
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
    </div>
  );
}
