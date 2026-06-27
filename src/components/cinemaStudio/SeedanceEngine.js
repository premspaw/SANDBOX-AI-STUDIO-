/**
 * SeedanceEngine.js
 * Utility for formatting Cinema Studio inputs into Seedance 2.0 Multimodal Payloads.
 */

export const isVideo = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.includes('video/mp4');
};

export const isAudio = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.includes('audio/mpeg');
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
    const addElement = (url, forceRole = null) => {
        if (!url || usedUrls.has(url)) return;
        
        if (isVideo(url)) {
            content.push({
                type: "video_url",
                video_url: { url },
                role: forceRole || "reference_video"
            });
        } else if (isAudio(url)) {
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
            if (item.imageUrl) {
                // Determine if it's an asset URI or a standard URL
                const url = item.imageUrl.startsWith('asset://') ? item.imageUrl : item.imageUrl;
                addElement(url);
            }
        });
    }

    // 4. Add Seedance-specific reference media (from the Seedance References section)
    if (seedanceRefs) {
        // Reference images (up to 9)
        if (seedanceRefs.ref_images && seedanceRefs.ref_images.length > 0) {
            seedanceRefs.ref_images.forEach(item => {
                const url = item.url || item.imageUrl;
                if (url) addElement(url, "reference_image");
            });
        }

        // Reference videos (up to 3)
        if (seedanceRefs.ref_videos && seedanceRefs.ref_videos.length > 0) {
            seedanceRefs.ref_videos.forEach(item => {
                const url = item.url || item.imageUrl;
                if (url) {
                    if (!usedUrls.has(url)) {
                        content.push({
                            type: "video_url",
                            video_url: { url },
                            role: "reference_video"
                        });
                        usedUrls.add(url);
                    }
                }
            });
        }

        // Reference audio (up to 3)
        if (seedanceRefs.ref_audios && seedanceRefs.ref_audios.length > 0) {
            seedanceRefs.ref_audios.forEach(item => {
                const url = item.url || item.imageUrl;
                if (url) {
                    if (!usedUrls.has(url)) {
                        content.push({
                            type: "audio_url",
                            audio_url: { url },
                            role: "reference_audio"
                        });
                        usedUrls.add(url);
                    }
                }
            });
        }
    }

    return content;
};
