import React, { useRef, useState, useEffect } from 'react';
import { resolveUrl } from '../../config/apiConfig';

export function LazyVideo({ src, aspect }) {
  const videoRef = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
        } else {
          setInView(false);
          if (videoRef.current) {
            videoRef.current.pause();
          }
        }
      },
      { rootMargin: '150px', threshold: 0.01 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (inView) {
      // Trigger play asynchronously to allow browsers to allocate decoding hardware smoothly
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } else {
      video.pause();
    }
  }, [inView]);

  return (
    <video
      ref={videoRef}
      src={inView ? resolveUrl(src) : undefined}
      muted
      loop
      playsInline
      preload="none"
      className="w-full h-full object-cover"
      style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.3s' }}
    />
  );
}
