export const MEDIA_PAGE_SIZE = 48;
export function paginateMedia(items, requestedPage, pageSize = MEDIA_PAGE_SIZE) {
    const size = Math.max(1, Math.floor(Number(pageSize) || MEDIA_PAGE_SIZE));
    const pageCount = Math.max(1, Math.ceil(items.length / size));
    const page = Math.min(pageCount, Math.max(1, Math.floor(Number(requestedPage) || 1)));
    return { page, pageCount, items: items.slice((page - 1) * size, page * size) };
}
