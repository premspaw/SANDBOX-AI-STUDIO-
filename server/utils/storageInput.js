const bad = message => Object.assign(new Error(message), { status: 400 });
export function storageSegment(value, label, { filename = false } = {}) {
    if (typeof value !== 'string' || value.length > 200 || !value || /[\\/\x00-\x1f\x7f]/.test(value) || value === '.' || value === '..') throw bad(`Invalid ${label}`);
    if (filename && !/\.(?:png|jpe?g|webp|gif|avif|bmp|mp4|webm|mov|m4v|mp3|wav|ogg|aac|m4a)$/i.test(value)) throw bad('Unsupported media filename');
    if (!filename && !/^[A-Za-z0-9_-]+$/.test(value)) throw bad(`Invalid ${label}`);
    return value;
}
export function storageUserId(body, user) {
    const supplied = body.userId || body.user_id;
    if (supplied && !['anon','anonymous','local_user'].includes(supplied) && supplied !== user.id) throw Object.assign(new Error('Cannot write another user’s assets'), { status: 403 });
    return storageSegment(user.id, 'user ID');
}
export function assertSafeMediaContentType(type) {
    const base = (type || '').split(';')[0].trim().toLowerCase();
    if (!/^(?:image\/(?:png|jpe?g|webp|gif|avif|bmp)|video\/(?:mp4|webm|quicktime|x-m4v)|audio\/(?:mpeg|mp3|wav|x-wav|ogg|aac|mp4)|application\/octet-stream)$/.test(base)) throw bad('Unsupported media content type');
}
export function assertOrdinaryAssetType(type) {
    if (!['image','video','audio','reference_upload'].includes(type)) throw bad('Unsupported asset type');
}

export function isLocalAssetUrl(value) {
    if (typeof value !== 'string' || !value.startsWith('/assets/')) return false;
    try {
        const basename = decodeURIComponent(value.slice('/assets/'.length));
        storageSegment(basename, 'filename', { filename: true });
        return !basename.includes('?') && !basename.includes('#');
    } catch { return false; }
}
