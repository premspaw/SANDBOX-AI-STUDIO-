import React from 'react';
import { X, Download } from 'lucide-react';
import { useUGC } from '../../context/UGCContext';
import { resolveUrl } from '../../../../config/apiConfig';

export default function GalleryExpandModal() {
  const { galleryExpandItem, setGalleryExpandItem } = useUGC();

  if (!galleryExpandItem) return null;

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
          <video
            src={resolveUrl(galleryExpandItem.url)}
            className="w-full max-h-[80vh] object-contain bg-black"
            controls
            autoPlay
            playsInline
          />
        ) : (
          <img
            src={resolveUrl(galleryExpandItem.url)}
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
                const res = await fetch(resolveUrl(galleryExpandItem.url));
                const blob = await res.blob();
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = `ugc-${galleryExpandItem.id}.${ext}`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
              } catch {
                const a = document.createElement('a');
                a.href = resolveUrl(galleryExpandItem.url);
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
