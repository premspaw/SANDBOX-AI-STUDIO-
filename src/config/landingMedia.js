// HEVC originals play audio-only in browsers without an HEVC decoder.
// These exact-source replacements also cover the runtime landing asset config.
const compatibleVideos = new Map([
    ['https://cdn.zerolens.in/landing-assets/IMG_5525.MP4', '/media/landing/brand-story-h264.mp4'],
    ['https://cdn.zerolens.in/landing/assets/uploaded_1783622383095.mp4', '/media/landing/skin-care-h264.mp4'],
]);
export function compatibleLandingVideo(url) {
    return compatibleVideos.get(url) || null;
}

const galleryPosters = new Map([
    ["https://cdn.zerolens.in/landing/assets/uploaded_1783622460440.mp4", "/media/landing/gallery-0-poster.jpg"],
    ["https://cdn.zerolens.in/landing/assets/uploaded_1783622487836.mp4", "/media/landing/gallery-1-poster.jpg"],
    ["https://cdn.zerolens.in/landing/assets/uploaded_1783622589711.mp4", "/media/landing/gallery-2-poster.jpg"],
    ["https://cdn.zerolens.in/landing/assets/uploaded_1783860814681.mp4", "/media/landing/gallery-3-poster.jpg"],
    ["https://cdn.zerolens.in/landing/assets/uploaded_1783860851501.mp4", "/media/landing/gallery-4-poster.jpg"],
    ["https://cdn.zerolens.in/landing/assets/uploaded_1783860835485.mp4", "/media/landing/gallery-5-poster.jpg"],
    ["https://cdn.zerolens.in/landing/assets/uploaded_1783876275036.mp4", "/media/landing/gallery-6-poster.jpg"],
    ["https://cdn.zerolens.in/landing/assets/uploaded_1783879817633.mp4", "/media/landing/gallery-7-poster.jpg"],
]);

export function landingVideoPoster(url) {
    if (url === "/media/landing/brand-story-h264.mp4") return "/media/landing/brand-story-poster.jpg";
    if (url === "/media/landing/skin-care-h264.mp4") return "/media/landing/skin-care-poster.jpg";
    return galleryPosters.get(url);
}
