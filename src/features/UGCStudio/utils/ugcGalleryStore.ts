import { GalleryItem } from './types';

const IDB_NAME = 'ugc_studio';
const IDB_STORE = 'gallery';

export const openIDB = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const req = indexedDB.open(IDB_NAME, 1);
  req.onupgradeneeded = () => {
    req.result.createObjectStore(IDB_STORE, { keyPath: 'id' });
  };
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
  } catch {
    return [];
  }
};
