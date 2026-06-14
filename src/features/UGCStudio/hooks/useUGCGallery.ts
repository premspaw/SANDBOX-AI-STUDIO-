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
  createdAt?: number;
}

// ── Helper to resolve item timestamps for sorting ──────────────────────────────
const getTimestamp = (item: GalleryItem): number => {
  if (item.createdAt) return item.createdAt;
  if (item.id) {
    if (item.id.startsWith('local_')) {
      const parts = item.id.split('_');
      if (parts[1]) {
        const t = parseInt(parts[1]);
        if (!isNaN(t)) return t;
      }
    }
    if (item.id.startsWith('img-pending-') || item.id.startsWith('img-pending-') || item.id.startsWith('img-pending-')) {
      const parts = item.id.split('-');
      if (parts[2]) {
        const t = parseInt(parts[2]);
        if (!isNaN(t)) return t;
      }
    }
    const num = parseInt(item.id);
    if (!isNaN(num)) {
      return num;
    }
  }
  return 0;
};

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
        return getTimestamp(b) - getTimestamp(a);
      });
      setGallery(prev => {
        const existingIds = new Set(prev.map(i => i.id));
        const extras = sorted.filter(i => !existingIds.has(i.id) && i.url);
        const combined = [...extras, ...prev];
        return combined.sort((a, b) => getTimestamp(b) - getTimestamp(a));
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
            createdAt: a.created_at ? new Date(a.created_at).getTime() : (a.id.startsWith('local_') ? parseInt(a.id.split('_')[1]) : parseInt(a.id) || Date.now()),
          }));
        setGallery(prev => {
          // De-duplicate by both ID and URL (in case IndexedDB has placeholder IDs for same URL)
          const existingIds = new Set(prev.map(i => i.id));
          const existingUrls = new Set(prev.map(i => i.url));

          // Map/update placeholder items in prev to match DB details if URLs match
          const updatedPrev = prev.map(item => {
            const dbMatch = dbItems.find(dbItem => dbItem.url === item.url);
            if (dbMatch && (item.id.startsWith('img-pending-') || item.id.startsWith('local_') || !isNaN(Number(item.id)) !== !isNaN(Number(dbMatch.id)))) {
              return {
                ...item,
                id: dbMatch.id,
                createdAt: dbMatch.createdAt
              };
            }
            return item;
          });

          // Recompute existingIds with mapped state to avoid duplicate DB items insertion
          const finalExistingIds = new Set(updatedPrev.map(i => i.id));
          const fresh = dbItems.filter(i => !finalExistingIds.has(i.id));

          const combined = [...updatedPrev, ...fresh];
          return combined.sort((a, b) => getTimestamp(b) - getTimestamp(a));
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
      const itemWithTime = {
        ...item,
        createdAt: item.createdAt || Date.now()
      };
      const next = [itemWithTime, ...prev].slice(0, 100);
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
