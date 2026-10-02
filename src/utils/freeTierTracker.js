// Centralized Tracker for Free Tier (3 Nano Banana 2 Images & 1 UGC 10s Video)
const MAX_FREE_IMAGES = 3;
const FREE_IMAGE_KEY_PREFIX = 'zerolens_free_images_used_';
const FREE_VIDEO_KEY_PREFIX = 'zerolens_free_video_used_';

export const FREE_IMAGE_MODELS = new Set([
  'banana2',
  'banana-2',
  'nb2',
  'nb2-lite',
  'nano-banana-2',
  'nano-banana-2-lite',
]);

const getStorageKey = (prefix, userId) => {
  const cleanId = (userId && userId !== 'anon') ? userId : 'local_guest';
  return `${prefix}${cleanId}`;
};

export const getFreeImagesUsed = (userId) => {
  try {
    const raw = localStorage.getItem(getStorageKey(FREE_IMAGE_KEY_PREFIX, userId));
    const val = parseInt(raw || '0', 10);
    return isNaN(val) ? 0 : Math.max(0, val);
  } catch {
    return 0;
  }
};

export const getFreeImagesRemaining = (userId) => {
  const used = getFreeImagesUsed(userId);
  return Math.max(0, MAX_FREE_IMAGES - used);
};

export const consumeFreeImage = (userId) => {
  try {
    const used = getFreeImagesUsed(userId);
    const next = Math.min(MAX_FREE_IMAGES, used + 1);
    localStorage.setItem(getStorageKey(FREE_IMAGE_KEY_PREFIX, userId), String(next));
    window.dispatchEvent(new CustomEvent('zerolens_freetier_updated', { detail: { type: 'image', used: next } }));
    return Math.max(0, MAX_FREE_IMAGES - next);
  } catch {
    return 0;
  }
};

export const hasFreeVideoAvailable = (userId) => {
  try {
    const raw = localStorage.getItem(getStorageKey(FREE_VIDEO_KEY_PREFIX, userId));
    return raw !== 'true' && raw !== '1';
  } catch {
    return true;
  }
};

export const consumeFreeVideo = (userId) => {
  try {
    localStorage.setItem(getStorageKey(FREE_VIDEO_KEY_PREFIX, userId), 'true');
    window.dispatchEvent(new CustomEvent('zerolens_freetier_updated', { detail: { type: 'video', used: true } }));
    return false;
  } catch {
    return false;
  }
};

export const isGptImageModel = (model) => {
  if (!model) return false;
  const m = String(model).toLowerCase();
  return m.includes('gpt') || m.includes('chatgpt') || m.includes('sunburst') || m.includes('flare');
};

export const isFreeImageModelAllowed = (model) => {
  if (!model) return false;
  const m = String(model).toLowerCase();
  return (
    m === 'banana2' ||
    m === 'banana-2' ||
    m === 'nb2' ||
    m === 'nb2-lite' ||
    m.includes('nano-banana-2') ||
    m.includes('nano-banana-2-lite')
  );
};
