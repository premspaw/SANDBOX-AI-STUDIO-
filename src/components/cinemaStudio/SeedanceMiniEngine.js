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

export const buildSeedanceMiniPayload = ({
    compiledPrompt,
    taggedItems,
    firstFrameImage,
    lastFrameImage,
    aspectRatio,
    duration,
    resolution,
    generateAudio,
    nsfwChecker,
    seedanceRefs
}) => {
    const input = {
        prompt: compiledPrompt?.trim() || '',
        aspect_ratio: (aspectRatio || '16:9').replace(':', '/'),
        duration: Number(duration) || 5,
        generate_audio: generateAudio !== false,
        web_search: false
    };

    if (nsfwChecker) input.nsfw_checker = true;
    if (resolution) input.resolution = resolution === '4k' ? '720p' : resolution;
    if (firstFrameImage) input.first_frame_url = firstFrameImage;
    if (lastFrameImage) input.last_frame_url = lastFrameImage;

    const refImages = [];
    const refVideos = [];
    const refAudios = [];

    if (taggedItems && taggedItems.length > 0) {
        taggedItems.forEach(item => {
            const url = item.imageUrl || item.url;
            if (!url) return;
            const cleanUrl = url.startsWith('asset://') ? url : url;
            if (isVideo(item)) {
                if (!refVideos.includes(cleanUrl)) refVideos.push(cleanUrl);
            } else if (isAudio(item)) {
                if (!refAudios.includes(cleanUrl)) refAudios.push(cleanUrl);
            } else {
                if (!refImages.includes(cleanUrl)) refImages.push(cleanUrl);
            }
        });
    }

    if (refImages.length > 0) input.reference_image_urls = refImages;
    if (refVideos.length > 0) input.reference_video_urls = refVideos;
    if (refAudios.length > 0) input.reference_audio_urls = refAudios;

    return input;
};
