import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Play, Pause, RotateCcw, RotateCw, AlertCircle } from 'lucide-react';
import { outputFrameToSource, overlayStateAt, FONTS } from '../core/editPlan.js';
import { templatePanels } from '../core/brand.js';

function formatSimpleTime(frame, fps) {
  const totalSeconds = Math.max(0, Math.floor(frame / fps));
  const mm = Math.floor(totalSeconds / 60);
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

let sfxCtx = null;
function playProceduralSfx(type) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!sfxCtx) sfxCtx = new AudioContextClass();
    if (sfxCtx.state === 'suspended') sfxCtx.resume();
    const now = sfxCtx.currentTime;

    if (type === 'POP') {
      const osc = sfxCtx.createOscillator();
      const gain = sfxCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.09);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(sfxCtx.destination);
      osc.start(now);
      osc.stop(now + 0.095);
    } else if (type === 'WHOOSH') {
      const bufSize = Math.floor(sfxCtx.sampleRate * 0.22);
      const buf = sfxCtx.createBuffer(1, bufSize, sfxCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = sfxCtx.createBufferSource();
      noise.buffer = buf;
      const filter = sfxCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 2.0;
      filter.frequency.setValueAtTime(320, now);
      filter.frequency.exponentialRampToValueAtTime(1800, now + 0.11);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.22);
      const gain = sfxCtx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(sfxCtx.destination);
      noise.start(now);
      noise.stop(now + 0.23);
    }
  } catch (err) {
    console.warn('SFX audio error:', err);
  }
}

export function GuidedPlayerPanel({
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
  const [viewportWidth, setViewportWidth] = useState(320);
  const lastClipIndexRef = useRef(-1);
  const firedOverlayIdsRef = useRef(new Set());

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (entry?.contentRect?.width) setViewportWidth(entry.contentRect.width);
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const fps = timeline.fps || 30;

  const currentMapping = useMemo(() => {
    return outputFrameToSource(timeline, currentFrame);
  }, [timeline, currentFrame]);

  const activeSegment = currentMapping?.segment || null;
  const activeClip = activeSegment ? project.clips[activeSegment.clipIndex] : null;
  const activeSourceId = activeSegment?.sourceId || null;
  const activeStreamUrl = activeSourceId ? sourceUrls[activeSourceId] : null;

  const currentMappingRef = useRef(currentMapping);
  currentMappingRef.current = currentMapping;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Segment change seek + WHOOSH sound effect
  useEffect(() => {
    const video = videoRef.current;
    const mapping = currentMappingRef.current;
    if (!video || !mapping) return;
    video.currentTime = mapping.sourceSec;
    if (isPlayingRef.current) {
      if (activeSegment && lastClipIndexRef.current !== -1 && activeSegment.clipIndex !== lastClipIndexRef.current) {
        playProceduralSfx('WHOOSH');
      }
      video.play().catch(() => setIsPlaying(false));
    }
    if (activeSegment) {
      lastClipIndexRef.current = activeSegment.clipIndex;
    }
  }, [activeSegment?.clipId, activeStreamUrl, setIsPlaying, activeSegment]);

  // Overlay POP sound trigger
  useEffect(() => {
    if (!isPlaying) {
      firedOverlayIdsRef.current.clear();
      return;
    }
    if (project?.overlays) {
      project.overlays.forEach((o) => {
        if (
          currentFrame >= o.startFrame &&
          currentFrame < o.startFrame + 4 &&
          !firedOverlayIdsRef.current.has(o.id)
        ) {
          firedOverlayIdsRef.current.add(o.id);
          playProceduralSfx('POP');
        }
      });
    }
  }, [isPlaying, currentFrame, project?.overlays]);

  // Playhead frame loop
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

        if (currentSrcSec >= activeSegment.outSec) {
          const nextFrame = activeSegment.endFrame;
          if (nextFrame >= timeline.totalFrames) {
            setIsPlaying(false);
            setCurrentFrame(0);
            return;
          } else {
            setCurrentFrame(nextFrame);
          }
        } else {
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

  // Sync seek on pause
  useEffect(() => {
    if (!isPlaying && videoRef.current && currentMapping) {
      const targetSec = currentMapping.sourceSec;
      if (Math.abs(videoRef.current.currentTime - targetSec) > 0.04) {
        videoRef.current.currentTime = targetSec;
      }
    }
  }, [currentFrame, currentMapping, isPlaying]);

  const togglePlay = () => {
    if (currentFrame >= timeline.totalFrames - 1) {
      setCurrentFrame(0);
    }
    setIsPlaying(!isPlaying);
  };

  const jumpSeconds = (seconds) => {
    const deltaFrames = Math.round(seconds * fps);
    setCurrentFrame((prev) => Math.max(0, Math.min(timeline.totalFrames - 1, prev + deltaFrames)));
  };

  return (
    <div className="flex flex-col items-center justify-start w-full max-w-[340px] shrink-0 select-none">
      {/* 9:16 Video Canvas Viewport */}
      <div
        ref={containerRef}
        onClick={togglePlay}
        style={{
          aspectRatio: '9/16',
          backgroundColor: project.brand?.background || '#000000',
        }}
        className="relative w-full max-h-[58vh] min-h-[380px] bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 group cursor-pointer"
      >
        {activeStreamUrl ? (
          <video
            ref={videoRef}
            src={activeStreamUrl}
            playsInline
            preload="auto"
            className="w-full h-full pointer-events-none object-cover"
            onLoadedMetadata={() => {
              if (videoRef.current && currentMapping) videoRef.current.currentTime = currentMapping.sourceSec;
              if (isPlaying) videoRef.current?.play().catch(() => setIsPlaying(false));
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 bg-zinc-950 p-4 text-center">
            <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs font-mono">No video clip active</p>
          </div>
        )}

        {/* Dynamic Overlays */}
        {project.overlays.map((overlay) => {
          const state = overlayStateAt(overlay, currentFrame);
          if (!state || overlay.needsReview) return null;
          const fontConfig = FONTS[overlay.style.font] || FONTS.poppins;

          const leftPercent = overlay.style.x * 100;
          const topPercent = overlay.style.y * 100;
          const containerWidth = viewportWidth || 320;
          const scaleFactor = containerWidth / project.canvas.width;
          const scaledFontSize = overlay.style.fontSize * scaleFactor;
          const boxPaddingPx = Math.round(overlay.style.fontSize * 0.28) * scaleFactor;

          return (
            <React.Fragment key={overlay.id}>
              {templatePanels(overlay, project.brand, project.canvas.width, project.canvas.height).map((r, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    pointerEvents: 'none',
                    left: `${(r.x / project.canvas.width) * 100}%`,
                    top: `${(r.y / project.canvas.height) * 100}%`,
                    width: `${(r.width / project.canvas.width) * 100}%`,
                    height: `${(r.height / project.canvas.height) * 100}%`,
                    backgroundColor: r.color,
                  }}
                />
              ))}
              <div
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
                  padding: overlay.style.boxOpacity > 0 ? `${boxPaddingPx}px` : 0,
                  borderRadius: '6px',
                  textAlign: 'center',
                  whiteSpace: 'pre-line',
                  lineHeight: '1.25',
                  pointerEvents: 'none',
                }}
              >
                {overlay.text}
              </div>
            </React.Fragment>
          );
        })}

        {/* Hover play button indicator */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
            <div className="w-12 h-12 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[#c8f135] flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 ml-0.5 fill-current" />
            </div>
          </div>
        )}
      </div>

      {/* Primary Video Controls: [-5s] [Play/Pause] [+5s] [0:05 / 0:43] */}
      <div className="w-full flex items-center justify-between gap-2 mt-3 px-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => jumpSeconds(-5)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
            title="Rewind 5 seconds"
          >
            -5s
          </button>

          <button
            onClick={togglePlay}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition-all flex items-center gap-1.5"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            onClick={() => jumpSeconds(5)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
            title="Forward 5 seconds"
          >
            +5s
          </button>
        </div>

        {/* Timecode 0:05 / 0:43 */}
        <div className="font-mono text-xs text-zinc-400 font-semibold tracking-wider">
          <span className="text-white font-bold">{formatSimpleTime(currentFrame, fps)}</span>
          <span className="text-zinc-600 mx-1">/</span>
          <span>{formatSimpleTime(timeline.totalFrames, fps)}</span>
        </div>
      </div>

      {/* Subtle guide note under controls matching reference image */}
      <div className="w-full mt-2 text-left px-1">
        <p className="text-[11px] text-zinc-500 font-medium">
          Quick preview <span className="text-zinc-600">•</span> Timing is a guide
        </p>
      </div>
    </div>
  );
}
