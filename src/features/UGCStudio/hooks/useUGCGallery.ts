// ─── useUGCGallery ────────────────────────────────────────────────────────────
// Manages gallery state with dual persistence:
//   • IndexedDB (primary, unlimited, survives refresh)
//   • localStorage (secondary, persisted https URLs only, like MarketingStudio)
//   • Supabase (server-side merge on login)
//
// USAGE:
//   const { gallery, addToGallery, galleryTab, setGalleryTab, ... } = useUGCGallery(currentUserId);

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { getApiUrl } from '../../../config/apiConfig';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt?: string;
  loading?: boolean;
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
const IDB_NAME = 'ugc_studio';
const IDB_STORE = 'gallery';

const openIDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const saveGalleryToIDB = async (items: GalleryItem[]) => {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.clear();
    items.forEach(item => store.put(item));
  } catch { /* silently ignore */ }
};

const loadGalleryFromIDB = async (): Promise<GalleryItem[]> => {
  try {
    const db = await openIDB();
    return new Promise(resolve => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => resolve((req.result as GalleryItem[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useUGCGallery(currentUserId: string) {
  const [gallery, setGallery] = useState<GalleryItem[]>(() => {
    try {
      const saved = localStorage.getItem('ugc_generation_history');
      const parsed = saved ? JSON.parse(saved) : [];
      const filtered = parsed.filter((item: any) => {
        if (!item) return false;
        if (item.type === 'marketing_template') return false;
        if (item.url && (item.url.includes('/marketing/') || item.url.includes('marketing_template'))) return false;
        // Blob URLs are session-specific — dead on refresh
        if (item.url && item.url.startsWith('blob:')) return false;
        return true;
      });
      if (filtered.length !== parsed.length) {
        try {
          localStorage.setItem('ugc_generation_history', JSON.stringify(filtered));
        } catch {
          // ignore quota
        }
      }
      return filtered;
    } catch {
      return [];
    }
  });

  const [galleryTab, setGalleryTab] = useState<'all' | 'image' | 'video'>('all');
  const [galleryExpandItem, setGalleryExpandItem] = useState<GalleryItem | null>(null);

  // ── Load from IDB on mount (merges with localStorage seed) ──────────────
  useEffect(() => {
    loadGalleryFromIDB().then(idbItems => {
      const filtered = idbItems.filter(item => {
        if (!item) return false;
        if ((item.type as string) === 'marketing_template') return false;
        if (item.url && (item.url.includes('/marketing/') || item.url.includes('marketing_template'))) return false;
        // Blob URLs are session-specific — they expire on page refresh, drop them
        if (item.url && item.url.startsWith('blob:')) return false;
        return true;
      });
      if (filtered.length !== idbItems.length) {
        saveGalleryToIDB(filtered);
      }
      const sorted = [...filtered].sort((a, b) => {
        const aNum = parseInt(a.id) || 0;
        const bNum = parseInt(b.id) || 0;
        return bNum - aNum;
      });
      setGallery(prev => {
        const existingIds = new Set(prev.map(i => i.id));
        const extras = sorted.filter(i => !existingIds.has(i.id) && i.url);
        return extras.length ? [...extras, ...prev] : prev;
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Merge user assets from REST API on login ─────────────────────────────
  useEffect(() => {
    if (!currentUserId) return;
    fetch(getApiUrl(`/api/ugc/assets/${currentUserId}`))
      .then(async r => {
        if (!r.ok) {
          const errText = await r.text().catch(() => r.statusText);
          throw new Error(`Failed to load gallery assets (${r.status}): ${errText}`);
        }
        return r.json();
      })
      .then(({ assets }) => {
        if (!Array.isArray(assets) || assets.length === 0) return;
        const dbItems: GalleryItem[] = assets
          .filter((a: any) => a.url && a.type !== 'marketing_template' && !(a.url && (a.url.includes('/marketing/') || a.url.includes('marketing_template'))))
          .map((a: any) => ({
            id: String(a.id),
            type: (a.type === 'video' ? 'video' : 'image') as 'image' | 'video',
            url: a.url,
            prompt: a.prompt || '',
          }));
        setGallery(prev => {
          const existingIds = new Set(prev.map(i => i.id));
          const fresh = dbItems.filter(i => !existingIds.has(i.id));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
      })
      .catch(err => {
        console.error('[Gallery Assets Load Error]', err);
        if (typeof window !== 'undefined' && (window as any).toast) {
          (window as any).toast(`Failed to load gallery assets: ${err.message || err}`, 'error');
        }
      });
  }, [currentUserId]);



  // ── addToGallery — mirrors MarketingStudio persistence pattern ────────────
  const addToGallery = useCallback((item: GalleryItem) => {
    setGallery(prev => {
      const next = [item, ...prev].slice(0, 100);
      // Only persist real (non-loading) items with stable URLs
      const persistable = next.filter(i => i.url && !i.loading && !i.url.startsWith('data:') && !i.url.startsWith('blob:'));
      try { localStorage.setItem('ugc_generation_history', JSON.stringify(persistable)); } catch { /* ignore quota */ }
      // Save everything except blob: and loading placeholders to IDB
      saveGalleryToIDB(next.filter(i => i.url && !i.loading && !i.url.startsWith('blob:')));
      return next;
    });
  }, []);

  // ── updateGalleryItem — updates an item in the gallery and updates cache ──
  const updateGalleryItem = useCallback((id: string, updates: Partial<GalleryItem>) => {
    setGallery(prev => {
      const next = prev.map(item => item.id === id ? { ...item, ...updates } : item);
      const persistable = next.filter(i => i.url && !i.url.startsWith('data:') && !i.url.startsWith('blob:'));
      try { localStorage.setItem('ugc_generation_history', JSON.stringify(persistable)); } catch { /* ignore quota */ }
      saveGalleryToIDB(next.filter(i => i.url && !i.url.startsWith('blob:')));
      return next;
    });
  }, []);

  return {
    gallery,
    setGallery,
    galleryTab,
    setGalleryTab,
    galleryExpandItem,
    setGalleryExpandItem,
    addToGallery,
    updateGalleryItem,
  };
}
