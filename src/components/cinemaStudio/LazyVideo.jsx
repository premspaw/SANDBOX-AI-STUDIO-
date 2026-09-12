import React, { useRef, useState, useEffect, useCallback } from 'react';
import { resolveUrl } from '../../config/apiConfig';
import { Play, Pause } from 'lucide-react';

export function LazyVideo({ src, aspect, onOpenLightbox }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          setHasLoaded(true);
        } else {
          setInView(false);
          if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        }
      },
      { rootMargin: '100px', threshold: 0.05 }
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
      const p = video.play();
      if (p !== undefined) {
        p.then(() => setIsPlaying(true)).catch(() => {});
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    const video = videoRef.current;
    if (!video || !hasLoaded) return;
    const p = video.play();
    if (p !== undefined) {
      p.then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [hasLoaded]);

  const handleMouseLeave = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setIsPlaying(false);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full overflow-hidden bg-black select-none"
    >
      <video
        ref={videoRef}
        crossOrigin="anonymous"
        src={hasLoaded ? resolveUrl(src) : undefined}
        muted
        loop
        playsInline
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="w-full h-full object-cover"
        style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.2s' }}
      />

      {/* Persistent / Hover Play Indicator Button */}
      <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1 pointer-events-auto">
        <button
          type="button"
          onClick={togglePlay}
          className="w-6 h-6 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 hover:border-[#c8f135] text-white hover:text-[#c8f135] flex items-center justify-center backdrop-blur-md transition-all shadow-md active:scale-95"
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
}

export default LazyVideo;
