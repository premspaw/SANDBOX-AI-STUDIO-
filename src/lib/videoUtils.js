import { getApiUrl, resolveUrl } from '../config/apiConfig';

/**
 * Extracts a frame from a video URL at a specific timestamp as a high-quality PNG data URL.
 * Automatically uses CORS proxy if the video is cross-origin to prevent canvas taint.
 */
export const extractVideoFrame = (videoSrc, atTime = 0) => {
  return new Promise((resolve, reject) => {
    if (!videoSrc) {
      return reject(new Error("No video source provided"));
    }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const cleanSrc = resolveUrl(videoSrc);
    const isRemote = cleanSrc.startsWith('http') && !cleanSrc.includes(window.location.host);
    const targetSrc = isRemote 
      ? getApiUrl(`/api/proxy-image?url=${encodeURIComponent(cleanSrc)}&cors=1`)
      : cleanSrc;

    video.src = targetSrc;

    const timeout = setTimeout(() => {
      video.src = '';
      reject(new Error("Video frame extraction timed out after 15s"));
    }, 15000);

    video.onloadedmetadata = () => {
      const duration = video.duration || 1;
      const targetTime = Math.min(Math.max(0, atTime), Math.max(0, duration - 0.05));
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        video.src = '';
        resolve(dataUrl);
      } catch (err) {
        console.warn("[videoUtils] Direct canvas extraction failed:", err);
        video.src = '';
        reject(err);
      }
    };

    video.onerror = (e) => {
      clearTimeout(timeout);
      console.error("[videoUtils] Video load error during frame extraction:", e);
      video.src = '';
      reject(new Error("Failed to load video for frame extraction"));
    };

    video.load();
  });
};

/**
 * Downloads a media asset directly to the user's PC/Mobile device without navigating or opening a new tab.
 */
export const downloadDirect = async (url, filename = 'zerolens-asset.mp4') => {
  if (!url) return false;

  const resolved = resolveUrl(url);

  // 1. Try direct fetch as blob
  try {
    const resp = await fetch(resolved, { mode: 'cors' });
    if (resp.ok) {
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
      return true;
    }
  } catch (corsErr) {
    console.debug("[videoUtils] Direct fetch blocked by CORS, trying proxy fetch:", corsErr);
  }

  // 2. Fetch via backend proxy as blob
  try {
    const proxyUrl = getApiUrl(`/api/proxy-image?url=${encodeURIComponent(resolved)}&cors=1`);
    const resp2 = await fetch(proxyUrl);
    if (resp2.ok) {
      const blob2 = await resp2.blob();
      const blobUrl2 = URL.createObjectURL(blob2);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl2;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl2), 30000);
      return true;
    }
  } catch (proxyErr) {
    console.debug("[videoUtils] Proxy blob fetch failed, falling back to attachment query:", proxyErr);
  }

  // 3. Fallback: Trigger proxy with Content-Disposition attachment query
  try {
    const downloadProxyUrl = getApiUrl(`/api/proxy-image?url=${encodeURIComponent(resolved)}&download=${encodeURIComponent(filename)}`);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = downloadProxyUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch (finalErr) {
    console.error("[videoUtils] All download methods failed:", finalErr);
    return false;
  }
};

/**
 * Asynchronously checks a video's duration in seconds.
 */
export const getVideoDuration = (videoSrc) => {
  return new Promise((resolve) => {
    if (!videoSrc) return resolve(0);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = resolveUrl(videoSrc);
    video.onloadedmetadata = () => {
      const dur = video.duration || 0;
      video.src = '';
      resolve(dur);
    };
    video.onerror = () => {
      video.src = '';
      resolve(0);
    };
  });
};
