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

export const buildSeedance2Payload = ({
    compiledPrompt,
    taggedItems,
    firstFrameImage,
    lastFrameImage,
    aspectRatio,
    duration,
    resolution,
    generateAudio,
    nsfwChecker,
    returnLastFrame
}) => {
    const input = {
        prompt: compiledPrompt?.trim() || '',
        aspect_ratio: (aspectRatio || '16:9').replace(':', '/'),
        duration: Number(duration) || 5,
        generate_audio: generateAudio !== false,
        web_search: false
    };

    if (nsfwChecker) input.nsfw_checker = true;
    if (resolution) input.resolution = resolution;
    if (firstFrameImage) input.first_frame_url = firstFrameImage;
    if (lastFrameImage) input.last_frame_url = lastFrameImage;
    if (returnLastFrame) input.return_last_frame = true;

    const refImages = [];
    const refVideos = [];
    const refAudios = [];

    if (taggedItems && taggedItems.length > 0) {
        taggedItems.forEach(item => {
            if (!item.imageUrl) return;
            const url = item.imageUrl.startsWith('asset://') ? item.imageUrl : item.imageUrl;
            if (isVideo(url)) {
                refVideos.push(url);
            } else if (isAudio(url)) {
                refAudios.push(url);
            } else {
                refImages.push(url);
            }
        });
    }

    if (refImages.length > 0) input.reference_image_urls = refImages;
    if (refVideos.length > 0) input.reference_video_urls = refVideos;
    if (refAudios.length > 0) input.reference_audio_urls = refAudios;

    return input;
};
