import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import { resolveUrl } from '../../config/apiConfig';
import { Play, Pause, Loader2 } from 'lucide-react';

export const LazyVideo = memo(function LazyVideo({ src, aspect, onOpenLightbox }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          setHasLoaded(true);
        } else {
          setInView(false);
          const v = videoRef.current;
          if (v && !v.paused) {
            v.pause();
            setIsPlaying(false);
          }
        }
      },
      { rootMargin: '300px', threshold: 0.01 }
    );

    const el = containerRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
      observer.disconnect();
    };
  }, []);

  const togglePlay = useCallback((e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      setIsBuffering(true);
      const p = video.play();
      if (p !== undefined) {
        p.then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }).catch(() => {
          setIsBuffering(false);
        });
      }
    } else {
      video.pause();
      setIsPlaying(false);
      setIsBuffering(false);
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setIsBuffering(true);
    const p = video.play();
    if (p !== undefined) {
      p.then(() => {
        setIsPlaying(true);
        setIsBuffering(false);
      }).catch(() => {
        setIsBuffering(false);
      });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setIsPlaying(false);
    setIsBuffering(false);
  }, []);

  const videoUrl = src ? resolveUrl(src) : '';
  // Keep video mounted once loaded (never destroy DOM node on offscreen scroll)
  const shouldRenderVideo = (inView || hasLoaded) && !!videoUrl;
  const videoSrc = shouldRenderVideo ? `${videoUrl}#t=0.001` : undefined;

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full overflow-hidden bg-black select-none"
    >
      {videoSrc && (
        <video
          key={videoUrl}
          ref={videoRef}
          src={videoSrc}
          muted
          loop
          playsInline
          preload="metadata"
          onWaiting={() => setIsBuffering(true)}
          onCanPlay={() => setIsBuffering(false)}
          onPlaying={() => { setIsPlaying(true); setIsBuffering(false); }}
          onPause={() => setIsPlaying(false)}
          onError={() => { setHasError(true); setIsBuffering(false); }}
          className="w-full h-full object-cover transition-opacity duration-300"
          style={{ opacity: 1 }}
        />
      )}

      {/* Buffering mini-indicator */}
      {isBuffering && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center pointer-events-none z-10">
          <Loader2 size={16} className="text-[#c8f135] animate-spin" />
        </div>
      )}

      {/* Persistent / Hover Play Indicator Button */}
      <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1 pointer-events-auto">
        <button
          type="button"
          onClick={togglePlay}
          className="w-6 h-6 rounded-full bg-black/70 hover:bg-black/95 border border-white/20 hover:border-[#c8f135] text-white hover:text-[#c8f135] flex items-center justify-center backdrop-blur-md transition-all shadow-md active:scale-95 cursor-pointer"
          title={isPlaying ? "Pause Preview" : "Play Preview"}
        >
          {isPlaying ? (
            <Pause size={10} fill="currentColor" />
          ) : (
            <Play size={10} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </div>
    </div>
  );
});

export default LazyVideo;
