import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize2, Shield, Eye, AlertCircle } from 'lucide-react';
import { outputFrameToSource, overlayStateAt, FONTS, SLIDE_DISTANCE } from '../core/editPlan.js';

function formatTimecode(frame, fps) {
  const totalSeconds = Math.floor(frame / fps);
  const ff = String(frame % fps).padStart(2, '0');
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}:${ff}`;
}

export function ReelsPlayer({
  project,
  timeline,
  currentFrame,
  setCurrentFrame,
  isPlaying,
  setIsPlaying,
  sourceUrls,
  selectedOverlayId,
  setSelectedOverlayId,
  onUpdateOverlay,
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);
  const [isMuted, setIsMuted] = useState(false);

  const fps = timeline.fps || 30;

  // Determine current active segment and source time for the playhead frame
  const currentMapping = useMemo(() => {
    return outputFrameToSource(timeline, currentFrame);
  }, [timeline, currentFrame]);

  const activeSegment = currentMapping?.segment || null;
  const activeSourceId = activeSegment?.sourceId || null;
  const activeStreamUrl = activeSourceId ? sourceUrls[activeSourceId] : null;

  // Track playback frame loop
  useEffect(() => {
    let animId;
    if (isPlaying) {
      const v = videoRef.current;
      if (v && v.paused) {
        v.play().catch(() => setIsPlaying(false));
      }

      const tick = () => {
        if (!videoRef.current || !activeSegment) return;
        const v = videoRef.current;
        const currentSrcSec = v.currentTime;

        // Has the current clip ended?
        if (currentSrcSec >= activeSegment.outSec) {
          // Find next segment or stop
          const nextFrame = activeSegment.endFrame;
          if (nextFrame >= timeline.totalFrames) {
            setIsPlaying(false);
            setCurrentFrame(0);
            return;
          } else {
            setCurrentFrame(nextFrame);
          }
        } else {
          // Calculate frame on timeline
          const relSec = Math.max(0, currentSrcSec - activeSegment.inSec);
          const computedFrame = activeSegment.startFrame + Math.round((relSec / activeSegment.speed) * fps);
          if (computedFrame !== currentFrame) {
            setCurrentFrame(Math.min(timeline.totalFrames - 1, computedFrame));
          }
        }
        animId = requestAnimationFrame(tick);
      };
      animId = requestAnimationFrame(tick);
    } else {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, activeSegment, timeline.totalFrames, fps, currentFrame, setCurrentFrame, setIsPlaying]);

  // Sync video element seek when currentFrame changes while paused
  useEffect(() => {
    if (!isPlaying && videoRef.current && currentMapping) {
      const targetSec = currentMapping.sourceSec;
      if (Math.abs(videoRef.current.currentTime - targetSec) > 0.04) {
        videoRef.current.currentTime = targetSec;
      }
    }
  }, [currentFrame, currentMapping, isPlaying]);

  // Handle active video speed and volume changes
  useEffect(() => {
    if (videoRef.current && activeSegment) {
      const clip = project.clips[activeSegment.clipIndex];
      if (clip) {
        videoRef.current.playbackRate = clip.speed;
        videoRef.current.volume = clip.muted ? 0 : clip.volume;
      }
    }
  }, [activeSegment, project.clips]);

  const togglePlay = () => {
    if (currentFrame >= timeline.totalFrames - 1) {
      setCurrentFrame(0);
    }
    setIsPlaying(!isPlaying);
  };

  const stepFrame = (delta) => {
    setIsPlaying(false);
    setCurrentFrame((prev) => Math.max(0, Math.min(timeline.totalFrames - 1, prev + delta)));
  };

  // Dragging / Moving text overlays inside canvas preview
  const handleOverlayPointerDown = (e, overlay) => {
    e.stopPropagation();
    setSelectedOverlayId(overlay.id);
    const rect = containerRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = overlay.style.x;
    const initY = overlay.style.y;

    const handlePointerMove = (moveEvent) => {
      const deltaX = (moveEvent.clientX - startX) / rect.width;
      const deltaY = (moveEvent.clientY - startY) / rect.height;
      const newX = Math.max(0.1, Math.min(0.9, initX + deltaX));
      const newY = Math.max(0.08, Math.min(0.92, initY + deltaY));
      onUpdateOverlay(overlay.id, {
        style: { ...overlay.style, x: Number(newX.toFixed(4)), y: Number(newY.toFixed(4)) },
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-2 select-none">
      {/* 9:16 Canvas Viewport Container */}
      <div
        ref={containerRef}
        onClick={() => setSelectedOverlayId(null)}
        className="relative aspect-[9/16] w-auto h-[60vh] md:h-[68vh] max-h-[720px] bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 group"
      >
        {/* Source Video Tag */}
        {activeStreamUrl ? (
          <video
            ref={videoRef}
            src={activeStreamUrl}
            playsInline
            muted={isMuted}
            preload="auto"
            className="w-full h-full object-cover pointer-events-none"
            onEnded={() => {
              if (isPlaying) {
                const nextFrame = activeSegment ? activeSegment.endFrame : currentFrame;
                if (nextFrame >= timeline.totalFrames) {
                  setIsPlaying(false);
                  setCurrentFrame(0);
                } else {
                  setCurrentFrame(nextFrame);
                }
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 bg-zinc-950 p-4 text-center">
            <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs font-mono">No clip active at this frame</p>
          </div>
        )}

        {/* Dynamic Text Overlays on Canvas */}
        {project.overlays.map((overlay) => {
          const state = overlayStateAt(overlay, currentFrame);
          if (!state) return null; // not active at this frame
          const isSelected = selectedOverlayId === overlay.id;
          const fontConfig = FONTS[overlay.style.font] || FONTS.poppins;

          // Convert normalized 1080px base coordinates to % and scaling
          const leftPercent = overlay.style.x * 100;
          const topPercent = overlay.style.y * 100;
          // Scale font proportional to container (1080 -> 100%)
          const containerWidth = containerRef.current?.clientWidth || 360;
          const scaleFactor = containerWidth / 1080;
          const scaledFontSize = Math.max(12, Math.round(overlay.style.fontSize * scaleFactor));
          const boxPaddingPx = Math.round(scaledFontSize * 0.28);

          return (
            <div
              key={overlay.id}
              onPointerDown={(e) => handleOverlayPointerDown(e, overlay)}
              style={{
                position: 'absolute',
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                transform: `translate(-50%, calc(-50% + ${state.offsetY * scaleFactor}px))`,
                opacity: state.alpha,
                fontFamily: fontConfig.family,
                fontSize: `${scaledFontSize}px`,
                color: overlay.style.color,
                backgroundColor:
                  overlay.style.boxOpacity > 0
                    ? `${overlay.style.boxColor}${Math.round(overlay.style.boxOpacity * 255)
                        .toString(16)
                        .padStart(2, '0')}`
                    : 'transparent',
                padding: overlay.style.boxOpacity > 0 ? `${boxPaddingPx * 0.6}px ${boxPaddingPx}px` : 0,
                borderRadius: '6px',
                textAlign: 'center',
                whiteSpace: 'pre-wrap',
                cursor: 'grab',
                zIndex: isSelected ? 40 : 20,
              }}
              className={`transition-shadow leading-tight ${
                isSelected
                  ? 'ring-2 ring-[#c8f135] shadow-[0_0_15px_rgba(200,241,53,0.4)]'
                  : 'hover:ring-1 hover:ring-white/40'
              }`}
            >
              {overlay.text}
              {overlay.needsReview && (
                <span className="absolute -top-3 -right-3 bg-rose-500 text-white rounded-full p-0.5 text-[10px] animate-pulse">
                  !
                </span>
              )}
            </div>
          );
        })}

        {/* 9:16 Social Safe-Zones Guide Overlay */}
        {showSafeZones && (
          <div className="absolute inset-0 pointer-events-none z-30 border-2 border-dashed border-cyan-400/40">
            {/* Top header safe margin */}
            <div className="absolute top-0 inset-x-0 h-[12%] bg-cyan-500/10 border-b border-cyan-400/30 flex items-center justify-center">
              <span className="text-[9px] font-mono uppercase tracking-widest text-cyan-300">
                Top UI Header Zone
              </span>
            </div>
            {/* Right side interaction buttons safe margin */}
            <div className="absolute right-0 top-[12%] bottom-[25%] w-[18%] bg-cyan-500/10 border-l border-cyan-400/30 flex items-center justify-center">
              <span className="text-[8px] font-mono uppercase tracking-widest text-cyan-300 rotate-90">
                Action Icons
              </span>
            </div>
            {/* Bottom captions / audio title safe margin */}
            <div className="absolute bottom-0 inset-x-0 h-[22%] bg-cyan-500/10 border-t border-cyan-400/30 flex items-center justify-center">
              <span className="text-[9px] font-mono uppercase tracking-widest text-cyan-300">
                Caption & Audio Info Zone
              </span>
            </div>
          </div>
        )}

        {/* Center Hover Play button */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            aria-label="Play"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[#c8f135] flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 z-40"
          >
            <Play className="w-6 h-6 ml-0.5 fill-current" />
          </button>
        )}
      </div>

      {/* Control Strip */}
      <div className="flex items-center justify-between w-full max-w-[420px] mt-3 px-2 py-1.5 rounded-xl bg-zinc-900/90 border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => stepFrame(-1)}
            aria-label="Step back 1 frame"
            title="Step Back 1 Frame"
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="p-2 rounded-lg bg-[#c8f135] text-black font-bold hover:scale-105 active:scale-95 transition-all shadow-md shadow-[#c8f135]/20"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
          </button>
          <button
            onClick={() => stepFrame(1)}
            aria-label="Step forward 1 frame"
            title="Step Forward 1 Frame"
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Timecode display */}
        <div className="font-mono text-xs text-zinc-300 font-semibold tracking-wider">
          <span>{formatTimecode(currentFrame, fps)}</span>
          <span className="text-zinc-500 mx-1">/</span>
          <span className="text-zinc-500">{formatTimecode(timeline.totalFrames, fps)}</span>
        </div>

        {/* Tool buttons: Safe-zone guides toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSafeZones(!showSafeZones)}
            aria-label="Toggle safe guides"
            title="Toggle Social Safe Guides"
            className={`p-1.5 rounded-lg transition-colors ${
              showSafeZones ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
