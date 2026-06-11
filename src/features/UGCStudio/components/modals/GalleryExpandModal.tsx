import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { useUGC } from '../../context/UGCContext';
import { resolveUrl } from '../../../../config/apiConfig';

// Helper to resolve video URLs without proxying external URLs, enabling browser range requests for buffering/seeking
const resolveVideoUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  return resolveUrl(url);
};

export default function GalleryExpandModal() {
  const { galleryExpandItem, setGalleryExpandItem } = useUGC();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Reset buffering state whenever a new item is opened
  useEffect(() => {
    if (galleryExpandItem?.type === 'video') {
      setIsBuffering(true);
      setHasError(false);
    }
  }, [galleryExpandItem?.id]);

  if (!galleryExpandItem) return null;

  const resolvedUrl = galleryExpandItem.type === 'video'
    ? resolveVideoUrl(galleryExpandItem.url)
    : resolveUrl(galleryExpandItem.url);

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
      onClick={() => setGalleryExpandItem(null)}
    >
      <div
        className="relative max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={() => setGalleryExpandItem(null)}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/70 border border-white/20 text-white hover:bg-white/20 transition-all"
        >
          <X size={14} />
        </button>

        {galleryExpandItem.type === 'video' ? (
          <div className="relative w-full bg-black">
            {/* Buffering overlay — shown until canplay fires */}
            {isBuffering && !hasError && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80">
                <Loader2 size={32} className="text-[#c8f135] animate-spin" />
                <span className="text-[9px] text-white/50 font-mono uppercase tracking-widest">
                  Buffering…
                </span>
              </div>
            )}
            {hasError && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/90 p-6 text-center">
                <span className="text-[10px] text-red-400 font-mono">
                  Video could not load. It may have expired.
                </span>
                <span className="text-[8px] text-white/30 font-mono">
                  Download it before it expires, or regenerate.
                </span>
              </div>
            )}
            <video
              ref={videoRef}
              key={resolvedUrl}
              src={resolvedUrl}
              className="w-full max-h-[80vh] object-contain bg-black"
              controls
              autoPlay
              playsInline
              preload="auto"
              onCanPlay={() => {
                // Start playing as soon as any data is ready — don't wait for full download
                setIsBuffering(false);
                videoRef.current?.play().catch(() => {});
              }}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onError={() => {
                setIsBuffering(false);
                setHasError(true);
              }}
            />
          </div>
        ) : (
          <img
            src={resolvedUrl}
            alt="expanded"
            className="w-full max-h-[80vh] object-contain bg-black"
          />
        )}

        {/* Download bar */}
        <div className="bg-black/80 border-t border-white/10 px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-[9px] text-white/40 font-mono uppercase tracking-widest">
            {galleryExpandItem.type === 'video' ? 'MP4 Video' : 'PNG Image'}
          </span>
          <button
            onClick={async () => {
              const ext = galleryExpandItem.type === 'video' ? 'mp4' : 'png';
              try {
                const res = await fetch(resolvedUrl);
                const blob = await res.blob();
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = `ugc-${galleryExpandItem.id}.${ext}`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
              } catch {
                const a = document.createElement('a');
                a.href = resolvedUrl;
                a.download = `ugc-${galleryExpandItem.id}.${ext}`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#c8f135] text-black text-[9px] font-black uppercase tracking-widest hover:bg-[#d4f545] transition-all"
          >
            <Download size={12} /> Download {galleryExpandItem.type === 'video' ? 'MP4' : 'PNG'}
          </button>
        </div>
      </div>
    </div>
  );
}
