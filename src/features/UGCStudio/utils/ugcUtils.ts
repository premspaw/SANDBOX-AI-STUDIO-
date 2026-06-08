export const uint8ArrayToBase64 = (uint8Array: Uint8Array): string => {
  const CHUNK_SIZE = 0x8000; // 32KB chunks
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

export const ensureDataUri = (str: string | null | undefined): string => {
  if (!str) return '';
  if (str.startsWith('http') || str.startsWith('data:') || str.startsWith('blob:') || str.length < 50) return str;
  return `data:image/jpeg;base64,${str}`;
};

export const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const resizeImage = (file: File | Blob, maxDim = 1024): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const withTimeout = <T extends unknown>(promise: Promise<T>, timeoutMs: number, errorMessage = "Operation timed out"): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
};

export const safeJsonParse = (text: string | undefined) => {
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {
        console.error("Failed to parse extracted JSON", e2);
      }
    }
    console.error("JSON parse failed", e, text);
    return {};
  }
};

export const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const getVirtualCreatorPrompt = (details: string, tags: string[]) => {
  const lowerDetails = details.toLowerCase();
  const allTags = tags.join(' ').toLowerCase();
  
  if (lowerDetails.includes('beauty') || lowerDetails.includes('skin') || allTags.includes('skincare') || allTags.includes('makeup')) {
    return "A young, charismatic female beauty influencer with flawless skin, natural makeup, and a friendly smile. She is relatable and authentic.";
  } else if (lowerDetails.includes('tech') || lowerDetails.includes('gadget') || allTags.includes('tech') || allTags.includes('electronics')) {
    return "A tech-savvy, energetic young adult creator with a modern, clean look. They are enthusiastic and knowledgeable about gadgets.";
  } else if (lowerDetails.includes('fitness') || lowerDetails.includes('gym') || allTags.includes('fitness') || allTags.includes('sport')) {
    return "A fit, athletic creator in high-quality activewear. They look healthy, motivated, and are in a bright, modern gym or home workout space.";
  } else if (lowerDetails.includes('fashion') || lowerDetails.includes('clothing') || allTags.includes('fashion') || allTags.includes('style')) {
    return "A stylish, trendy fashion creator with a great sense of personal style. They look confident and are in a chic, well-lit urban or indoor setting.";
  } else if (lowerDetails.includes('food') || lowerDetails.includes('kitchen') || allTags.includes('cooking') || allTags.includes('drink')) {
    return "A warm, approachable home cook or foodie creator in a clean, modern kitchen. They look passionate about food and have a welcoming vibe.";
  }
  
  return "A relatable, charismatic young adult UGC creator with a natural, authentic look. They are friendly, energetic, and talk directly to the camera.";
};

export const createWavUrl = (base64Data: string) => {
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const float32Data = new Float32Array(bytes.length / 2);
  const dataView = new DataView(bytes.buffer);
  for (let i = 0; i < float32Data.length; i++) {
    float32Data[i] = dataView.getInt16(i * 2, true) / 32768.0;
  }

  const buffer = new ArrayBuffer(44 + float32Data.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + float32Data.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 24000, true);
  view.setUint32(28, 24000 * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, float32Data.length * 2, true);

  let offset = 44;
  for (let i = 0; i < float32Data.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32Data[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  const blob = new Blob([view], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};

export const playPcm = async (base64Data: string) => {
  try {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const float32Data = new Float32Array(bytes.length / 2);
    const dataView = new DataView(bytes.buffer);
    for (let i = 0; i < float32Data.length; i++) {
      float32Data[i] = dataView.getInt16(i * 2, true) / 32768.0;
    }

    const buffer = audioCtx.createBuffer(1, float32Data.length, 24000);
    buffer.getChannelData(0).set(float32Data);

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start();
  } catch (err) {
    console.error("Failed to play audio", err);
  }
};
