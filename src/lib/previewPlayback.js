/** Keep delayed play promises from restarting an offscreen or hidden preview. */
const previewRequests = new WeakMap();
export function syncPreviewPlayback(video, shouldPlay) {
    if (!video) return;
    const request = { shouldPlay };
    previewRequests.set(video, request);
    if (!shouldPlay) {
        video.pause();
        return;
    }
    const result = video.play();
    if (result?.then) {
        result.then(() => {
            if (!previewRequests.get(video)?.shouldPlay) video.pause();
        }).catch(() => {});
    }
}
