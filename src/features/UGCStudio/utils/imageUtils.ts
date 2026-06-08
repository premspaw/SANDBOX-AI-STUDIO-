// ─── IMAGE UTILITIES ──────────────────────────────────────────────────────────
// Pure browser-safe functions extracted from UGC.tsx.
// No React, no side-effects — safe to import anywhere.

/** Convert a Uint8Array to a base64 string in 32KB chunks (avoids call-stack overflow). */
export const uint8ArrayToBase64 = (uint8Array: Uint8Array): string => {
  const CHUNK_SIZE = 0x8000;
  let index = 0;
  const length = uint8Array.length;
  let result = '';
  while (index < length) {
    const chunk = uint8Array.slice(index, Math.min(index + CHUNK_SIZE, length));
    result += String.fromCharCode.apply(null, chunk as any);
    index += CHUNK_SIZE;
  }
  return btoa(result);
};

/**
 * Ensure a string is a usable image URI.
 * - Passes through http/https, data:, blob: URLs unchanged.
 * - Wraps raw base64 strings in a data URI prefix.
 */
export const ensureDataUri = (str: string | null | undefined): string => {
  if (!str) return '';
  if (
    str.startsWith('http') ||
    str.startsWith('data:') ||
    str.startsWith('blob:') ||
    str.length < 50
  )
    return str;
  return `data:image/jpeg;base64,${str}`;
};

/** Read a File/Blob as a raw base64 string (no data-URI prefix). */
export const fileToBase64 = (file: File | Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/**
 * Resize a File/Blob so its longest dimension is ≤ maxDim pixels,
 * then return as a JPEG base64 string (no data-URI prefix).
 */
export const resizeImage = (file: File | Blob, maxDim = 1024): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) { height *= maxDim / width; width = maxDim; }
        } else {
          if (height > maxDim) { width *= maxDim / height; height = maxDim; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/** Race a promise against a timeout. */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out',
): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs),
    ),
  ]);

/** Safely parse JSON, falling back to null on failure. Supports objects, arrays, and markdown wrappers. */
export const safeJsonParse = (text: string | undefined): any => {
  if (!text?.trim()) return null;
  let cleanText = text.trim();
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  }
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    const arrayMatch = cleanText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try { return JSON.parse(arrayMatch[0]); } catch { /* fall through */ }
    }
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
    }
    console.error("safeJsonParse failed to parse text:", e, text);
    return null;
  }
};

/** Convert a File to a Gemini-compatible inlineData part. */
export const fileToGenerativePart = async (file: File) => {
  const data = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return { inlineData: { data, mimeType: file.type } };
};

/**
 * Return a suitable virtual UGC creator description based on product
 * details and tags (used when no character reference image is uploaded).
 */
export const getVirtualCreatorPrompt = (details: string, tags: string[]): string => {
  const ld = details.toLowerCase();
  const at = tags.join(' ').toLowerCase();

  if (ld.includes('beauty') || ld.includes('skin') || at.includes('skincare') || at.includes('makeup'))
    return 'A young, charismatic female beauty influencer with flawless skin, natural makeup, and a friendly smile. She is relatable and authentic.';
  if (ld.includes('tech') || ld.includes('gadget') || at.includes('tech') || at.includes('electronics'))
    return 'A tech-savvy, energetic young adult creator with a modern, clean look. They are enthusiastic and knowledgeable about gadgets.';
  if (ld.includes('fitness') || ld.includes('gym') || at.includes('fitness') || at.includes('sport'))
    return 'A fit, athletic creator in high-quality activewear. They look healthy, motivated, and are in a bright, modern gym or home workout space.';
  if (ld.includes('fashion') || ld.includes('clothing') || at.includes('fashion') || at.includes('style'))
    return 'A stylish, trendy fashion creator with a great sense of personal style. They look confident and are in a chic, well-lit urban or indoor setting.';
  if (ld.includes('food') || ld.includes('kitchen') || at.includes('cooking') || at.includes('drink'))
    return 'A warm, approachable home cook or foodie creator in a clean, modern kitchen. They look passionate about food and have a welcoming vibe.';

  return 'A relatable, charismatic young adult UGC creator with a natural, authentic look. They are friendly, energetic, and talk directly to the camera.';
};
