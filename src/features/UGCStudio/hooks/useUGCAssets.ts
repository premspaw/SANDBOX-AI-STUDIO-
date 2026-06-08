// ─── useUGCAssets ─────────────────────────────────────────────────────────────
// Manages all reference-image upload state for the UGC Studio:
//   • Character (creator face)
//   • Product
//   • Location / background
//   • Talking-head person, product, location
//   • Podcast host images
//
// USAGE:
//   const { characterImg, setCharacterImg, ... } = useUGCAssets();

import { useState } from 'react';

export interface ImageAsset {
  url: string;
  file: File;
}

export function useUGCAssets() {
  // ── Main UGC assets ────────────────────────────────────────────────────────
  const [characterImg, setCharacterImg] = useState<ImageAsset | null>(null);
  const [productImg, setProductImg] = useState<ImageAsset | null>(null);
  const [locationImg, setLocationImg] = useState<ImageAsset | null>(null);

  // ── Talking-head assets ────────────────────────────────────────────────────
  const [thPersonImg, setThPersonImg] = useState<ImageAsset | null>(null);
  const [thProductImg, setThProductImg] = useState<ImageAsset | null>(null);
  const [thLocationImg, setThLocationImg] = useState<ImageAsset | null>(null);

  // ── Podcast assets ────────────────────────────────────────────────────────
  const [podcastHost1Img, setPodcastHost1Img] = useState<ImageAsset | null>(null);
  const [podcastHost2Img, setPodcastHost2Img] = useState<ImageAsset | null>(null);
  const [podcastProductImg, setPodcastProductImg] = useState<ImageAsset | null>(null);

  // ── Source video (for video-to-video analysis) ─────────────────────────────
  const [sourceVideo, setSourceVideo] = useState<{ url: string; file: File } | null>(null);

  return {
    // Main UGC
    characterImg, setCharacterImg,
    productImg, setProductImg,
    locationImg, setLocationImg,
    // Talking head
    thPersonImg, setThPersonImg,
    thProductImg, setThProductImg,
    thLocationImg, setThLocationImg,
    // Podcast
    podcastHost1Img, setPodcastHost1Img,
    podcastHost2Img, setPodcastHost2Img,
    podcastProductImg, setPodcastProductImg,
    // Video source
    sourceVideo, setSourceVideo,
  };
}
