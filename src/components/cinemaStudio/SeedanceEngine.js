/**
 * SeedanceEngine.js
 * Utility for formatting Cinema Studio inputs into Seedance 2.0 Multimodal Payloads.
 */

export const isVideo = (urlOrItem) => {
    if (!urlOrItem) return false;
    if (typeof urlOrItem === 'object') {
        if (urlOrItem.category === 'ref_videos' || urlOrItem.category === 'video ref') return true;
        if (urlOrItem.type?.startsWith('video/')) return true;
        urlOrItem = urlOrItem.url || urlOrItem.imageUrl || '';
    }
    if (typeof urlOrItem !== 'string') return false;
    const lower = urlOrItem.toLowerCase();
    return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm') || lower.endsWith('.m4v') || lower.includes('video/mp4') || lower.includes('/video/') || lower.includes('type=video');
};

export const isAudio = (urlOrItem) => {
    if (!urlOrItem) return false;
    if (typeof urlOrItem === 'object') {
        if (urlOrItem.category === 'ref_audios' || urlOrItem.category === 'audio ref') return true;
        if (urlOrItem.type?.startsWith('audio/')) return true;
        urlOrItem = urlOrItem.url || urlOrItem.imageUrl || '';
    }
    if (typeof urlOrItem !== 'string') return false;
    const lower = urlOrItem.toLowerCase();
    return lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.aac') || lower.endsWith('.m4a') || lower.endsWith('.ogg') || lower.includes('audio/mpeg') || lower.includes('/audio/') || lower.includes('type=audio');
};

export const resolveBlobToBase64 = async (urlOrItem) => {
    if (!urlOrItem) return null;
    let url = urlOrItem;
    while (url && typeof url === 'object') {
        url = url.url || url.data || url.dataUrl || url.imageUrl || '';
    }
    if (!url || typeof url !== 'string') return null;
    if (!url.startsWith('blob:')) return url;
    try {
        const resp = await fetch(url);
        const blob = await resp.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        console.warn('[resolveBlobToBase64] Failed to resolve blob URL:', err);
        return url;
    }
};

/**
 * Builds the exact 'content' array required by the Seedance API.
 * 
 * @param {string} compiledPrompt - The final text prompt.
 * @param {Array} taggedItems - Items from the Refboard tagged in the prompt.
 * @param {string} firstFrameImage - Optional first frame URL.
 * @param {string} lastFrameImage - Optional last frame URL.
 * @param {Object} seedanceRefs - Optional Seedance-specific references { ref_images: [], ref_videos: [], ref_audios: [] }.
 * @returns {Array} Seedance API compatible content array.
 */
export const buildSeedanceContentArray = (compiledPrompt, taggedItems, firstFrameImage, lastFrameImage, seedanceRefs) => {
    const content = [];

    // 1. Add Text Prompt
    if (compiledPrompt?.trim()) {
        content.push({
            type: "text",
            text: compiledPrompt.trim()
        });
    }

    // Deduplicate URLs to prevent API errors
    const usedUrls = new Set();

    // Helper to add visual/audio elements
    const addElement = (urlOrItem, forceRole = null) => {
        if (!urlOrItem) return;
        const url = typeof urlOrItem === 'string' ? urlOrItem : (urlOrItem.url || urlOrItem.imageUrl || urlOrItem.data || urlOrItem.dataUrl);
        if (!url || usedUrls.has(url)) return;
        
        if (isVideo(urlOrItem)) {
            content.push({
                type: "video_url",
                video_url: { url },
                role: forceRole || "reference_video"
            });
        } else if (isAudio(urlOrItem)) {
            content.push({
                type: "audio_url",
                audio_url: { url },
                role: forceRole || "reference_audio"
            });
        } else {
            content.push({
                type: "image_url",
                image_url: { url },
                role: forceRole || "reference_image"
            });
        }
        usedUrls.add(url);
    };

    // 2. Add specific first/last frame controls
    // Note: Seedance supports "first_frame" and "last_frame" roles natively for image_url
    if (firstFrameImage) {
        addElement(firstFrameImage, "first_frame");
    }

    if (lastFrameImage) {
        addElement(lastFrameImage, "last_frame");
    }

    // 3. Add Tagged Reference Items from Refboard (@mention system)
    if (taggedItems && taggedItems.length > 0) {
        taggedItems.forEach(item => {
            const url = item.imageUrl || item.url || item.data;
            if (url) {
                const role = isVideo(item) ? "reference_video" : isAudio(item) ? "reference_audio" : "reference_image";
                addElement(url, role);
            }
        });
    }

    // 4. Add items from seedanceRefs if provided
    if (seedanceRefs) {
        if (Array.isArray(seedanceRefs.ref_images)) {
            seedanceRefs.ref_images.forEach(img => addElement(img, "reference_image"));
        }
        if (Array.isArray(seedanceRefs.ref_videos)) {
            seedanceRefs.ref_videos.forEach(vid => addElement(vid, "reference_video"));
        }
        if (Array.isArray(seedanceRefs.ref_audios)) {
            seedanceRefs.ref_audios.forEach(aud => addElement(aud, "reference_audio"));
        }
        if (Array.isArray(seedanceRefs.images)) {
            seedanceRefs.images.forEach(img => addElement(img, "reference_image"));
        }
        if (Array.isArray(seedanceRefs.videos)) {
            seedanceRefs.videos.forEach(vid => addElement(vid, "reference_video"));
        }
        if (Array.isArray(seedanceRefs.audios)) {
            seedanceRefs.audios.forEach(aud => addElement(aud, "reference_audio"));
        }
    }

    return content;
};
