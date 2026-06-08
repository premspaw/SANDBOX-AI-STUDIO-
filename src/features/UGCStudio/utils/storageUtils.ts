import { getApiUrl } from '../../../config/apiConfig';
import type { GalleryItem } from '../context/UGCContext';

export const IDB_NAME = 'ugc_studio';
export const IDB_STORE = 'gallery';

export const openIDB = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const req = indexedDB.open(IDB_NAME, 1);
  req.onupgradeneeded = () => { req.result.createObjectStore(IDB_STORE, { keyPath: 'id' }); };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

export const saveGalleryToIDB = async (items: GalleryItem[]) => {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.clear();
    items.forEach(item => store.put(item));
  } catch {}
};

export const loadGalleryFromIDB = async (): Promise<GalleryItem[]> => {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => resolve((req.result as GalleryItem[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch { return []; }
};

export const uploadToSupabase = async (blob: Blob, type: 'image' | 'video', promptText: string, userId?: string | null) => {
  try {
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    const res = await fetch(getApiUrl('/api/upload-asset'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: base64, type, prompt: promptText, userId })
    });

    if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
    const { url } = await res.json();
    console.log('[GCS] Asset uploaded:', url);
    return url;
  } catch (error) {
    console.error('[GCS] Upload error:', error);
    return null;
  }
};
