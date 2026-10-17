// Presentation-only mapping. Product prices, credits and checkout IDs are unchanged.
const artwork = new Map([
    ['/pricing/influencer.png', '/pricing/optimized/influencer-480.webp'],
    ['/pricing/director.png', '/pricing/optimized/director-480.webp'],
    ['/pricing/enterprise.png', '/pricing/optimized/enterprise-480.webp'],
]);
export function optimizedPricingArtwork(src) {
    return artwork.get(src) || src;
}
