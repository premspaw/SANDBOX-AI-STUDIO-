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

// ── URL Normalization Helper ──────────────────────────────────────────────────
const getNormalizedPath = (url: string | undefined | null): string => {
  if (!url || typeof url !== 'string') return '';
  let target = url;
  if (target.includes('/api/proxy-image')) {
    try {
      const u = new URL(target.startsWith('http') ? target : `http://localhost${target}`);
      const decoded = u.searchParams.get('url');
      if (decoded) {
        target = decoded;
      }
    } catch (_) {
      // Ignore URL parsing errors for proxy queries
    }
  }
  try {
    if (target.startsWith('http://') || target.startsWith('https://')) {
      return new URL(target).pathname;
    }
  } catch (_) {
    // Ignore URL parsing errors for absolute paths
  }
  if (target.startsWith('/')) {
    return target;
  }
  if (!target.includes(':') && !target.startsWith('data:') && !target.startsWith('blob:')) {
    return '/' + target;
  }
  return target;
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt?: string;
  loading?: boolean;
  createdAt?: number;
}

// ── Resolve numeric timestamp for sorting ─────────────────────────────────────
const getTimestamp = (item: GalleryItem): number => {
  if (item.createdAt) return item.createdAt;
  if (item.id) {
    if (item.id.startsWith('local_')) {
      const t = parseInt(item.id.split('_')[1]);
      if (!isNaN(t)) return t;
    }
    if (item.id.startsWith('img-pending-')) {
      const t = parseInt(item.id.split('-')[2]);
      if (!isNaN(t)) return t;
    }
    const num = parseInt(item.id);
    // Only treat purely numeric ids as timestamps when they look like ms epoch values
    if (!isNaN(num) && num > 1_000_000_000_000) return num;
  }
  return 0;
};

// ── Priority: higher id score = prefer this entry when two items share a URL ──
// DB short/string id > temp Date.now() id > local_ id
const idScore = (id: string): number => {
  if (!id) return 0;
  if (id.startsWith('local_')) return 1;
  const n = Number(id);
  if (!isNaN(n) && n > 1_000_000_000_000) return 2; // temp numeric id
  return 3;                                            // stable DB id
};

// ── Deduplicate array: keep best entry per URL path, sort newest-first ─────────
// "Best" = higher idScore (prefer stable DB id over temp id),
//          or if tied, keep the one with a non-blob URL.
const dedup = (items: GalleryItem[]): GalleryItem[] => {
  const byPath = new Map<string, GalleryItem>();
  for (const item of items) {
    if (!item?.url) continue;
    const path = getNormalizedPath(item.url);
    const existing = byPath.get(path);
    if (!existing) {
      byPath.set(path, item);
    } else {
      const newScore = idScore(item.id);
      const oldScore = idScore(existing.id);
      if (
        newScore > oldScore ||
        // same score but new has a stable URL
        (newScore === oldScore && !item.url.startsWith('blob:') && existing.url.startsWith('blob:'))
      ) {
        // Merge: keep the better id/createdAt but retain all other fields
        byPath.set(path, { ...existing, ...item });
      }
    }
  }
  return [...byPath.values()].sort((a, b) => getTimestamp(b) - getTimestamp(a));
};

// ── Filter: remove junk and optionally dead blob URLs ────────────────────────
const isValidItem = (item: any, allowBlob = true): boolean => {
  if (!item?.url) return false;
  if (item.type === 'marketing_template' || item.type === 'reference_upload') return false;
  // Allow generated marketing assets (like those from Cinematic Studio) but exclude templates
  if (item.url.includes('/marketing/templates/') || item.url.includes('marketing_template')) return false;
  // Only exclude items stored in /uploads/ or /reference/ folders (not by filename prefix)
  const isRefFolder = item.url.includes('/uploads/') || item.url.includes('/reference/');
  if (isRefFolder) return false;
  if (!allowBlob && item.url.startsWith('blob:')) return false;
  return true;
};

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
const IDB_NAME = 'ugc_studio';
const IDB_STORE = 'gallery';

const openIDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 2); // bumped version to create per-user store if needed
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

// Never save blob: URLs to IDB — they die on refresh
const saveGalleryToIDB = async (items: GalleryItem[]) => {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.clear();
    items
      .filter(i => i.url && !i.loading && !i.url.startsWith('blob:'))
      .forEach(item => store.put(item));
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
  } catch { return []; }
};

// ── Persist only https items to localStorage ──────────────────────────────────
const getLSKey = (userId: string) =>
  userId && userId !== 'anon' ? `ugc_generation_history_${userId}` : null;

const persistToLS = (items: GalleryItem[], userId: string) => {
  const key = getLSKey(userId);
  if (!key) return; // Don't persist for anonymous / unidentified users
  try {
    const safe = items.filter(i => i.url && !i.loading && !i.url.startsWith('data:') && !i.url.startsWith('blob:'));
    localStorage.setItem(key, JSON.stringify(safe));
  } catch { /* ignore quota */ }
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useUGCGallery(currentUserId: string) {
  const lsKey = getLSKey(currentUserId);

  const [gallery, setGallery] = useState<GalleryItem[]>(() => {
    // Start empty for unidentified/anon users — server fetch will populate.
    if (!lsKey) return [];
    try {
      const saved = localStorage.getItem(lsKey);
      const parsed: any[] = saved ? JSON.parse(saved) : [];
      // On cold start: drop blobs (they're dead) and deduplicate
      const valid = parsed.filter(i => isValidItem(i, false));
      if (valid.length !== parsed.length) {
        try { localStorage.setItem(lsKey, JSON.stringify(valid)); } catch { /* ignore */ }
      }
      return dedup(valid);
    } catch { return []; }
  });

  const [galleryTab, setGalleryTab] = useState<'all' | 'image' | 'video'>('all');
  const [galleryExpandItem, setGalleryExpandItem] = useState<GalleryItem | null>(null);

  // ── Load from IDB on mount (merges with localStorage seed) ──────────────
  useEffect(() => {
    loadGalleryFromIDB().then(idbItems => {
      const valid = idbItems.filter(i => isValidItem(i, false));
      if (valid.length !== idbItems.length) saveGalleryToIDB(valid);
      setGallery(prev => dedup([...prev, ...valid]));
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
          .filter((a: any) => isValidItem(a, false))
          .map((a: any) => ({
            id: String(a.id),
            type: (a.type === 'video' ? 'video' : 'image') as 'image' | 'video',
            url: a.url,
            prompt: a.prompt || '',
            createdAt: a.created_at
              ? new Date(a.created_at).getTime()
              : (a.id?.startsWith?.('local_') ? parseInt(a.id.split('_')[1]) : parseInt(a.id) || Date.now()),
          }));

        setGallery(prev => {
          // Replace any temp-id entry whose URL path is found in DB with the stable DB id
          const dbByPath = new Map<string, GalleryItem>(dbItems.map(i => [getNormalizedPath(i.url), i]));
          const updatedPrev = prev.map(item => {
            const dbMatch = dbByPath.get(getNormalizedPath(item.url));
            if (dbMatch) {
              return { ...item, id: dbMatch.id, createdAt: item.createdAt || dbMatch.createdAt };
            }
            return item;
          });
          // Merge and deduplicate across both arrays
          return dedup([...updatedPrev, ...dbItems]);
        });
      })
      .catch(err => console.error('[Gallery Assets Load Error]', err));
  }, [currentUserId]);

  // ── addToGallery ─────────────────────────────────────────────────────────
  // If an item with the same URL already exists, update it in place instead of
  // prepending a duplicate.
  const addToGallery = useCallback((item: GalleryItem) => {
    setGallery(prev => {
      const itemWithTime: GalleryItem = { ...item, createdAt: item.createdAt || Date.now() };
      const existingIdx = prev.findIndex(i => !i.loading && i.url && getNormalizedPath(i.url) === getNormalizedPath(item.url));
      let next: GalleryItem[];
      if (existingIdx !== -1) {
        // Update in-place (e.g. blob URL re-submitted after failure)
        next = prev.map((i, idx) => idx === existingIdx ? { ...i, ...itemWithTime } : i);
      } else {
        next = [itemWithTime, ...prev];
      }
      const deduped = dedup(next).slice(0, 100);
      persistToLS(deduped, currentUserId);
      saveGalleryToIDB(deduped);
      return deduped;
    });
  }, [currentUserId]);

  // ── updateGalleryItem ─────────────────────────────────────────────────────
  // After updating (e.g. blob→https URL swap), re-dedup to remove any URL twin.
  const updateGalleryItem = useCallback((id: string, updates: Partial<GalleryItem>) => {
    setGallery(prev => {
      const next = prev.map(item => item.id === id ? { ...item, ...updates } : item);
      const deduped = dedup(next);
      persistToLS(deduped, currentUserId);
      saveGalleryToIDB(deduped);
      return deduped;
    });
  }, [currentUserId]);

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
