export const SHORTS_COST = {
    // Image Gen
    image_nano_banana: 1,
    image_nano_banana_2: 2,
    image_nano_banana_pro: 3,
    image_upscale_4k: 2,
    image_grid_multishot: 2,

    // UGC
    ugc_product_scan: 0.5,
    ugc_script_gen: 1,
    ugc_video_scene: 5,
    ugc_full_video: 10,

    // Product Shoot
    product_single: 3,
    product_pack_5: 6,
    product_360: 4,

    // Video (Veo & Kling)
    veo_fast: 10,
    veo_full: 40,
    kling: 7,
    kling_motion_std: 7,
    kling_motion_pro: 9,
    video_upscale_per_second: 5,

    // Seedance 2.5 Pro (Higgsfield API Wholesale + 20% margin @ ₹96/USD)
    seedance_25_480p: 17,
    seedance_25_720p: 55,
    seedance_25_1080p: 92,
    seedance_25_multiref_480p: 20,
    seedance_25_multiref_720p: 65,
    seedance_25_multiref_1080p: 110,

    // Seedance 2.0 Fast (Kie / BytePlus Ark - 20% margin)
    seedance_fast: 14.5,
    seedance_fast_video: 8.7,
    seedance_fast_480p: 6.8,
    seedance_fast_480p_video: 4.0,

    // Seedance 2.0 Mini (Kie - 20% margin)
    seedance_mini: 4.8,
    seedance_mini_video: 2.9,
    seedance_mini_480p: 2.2,
    seedance_mini_480p_video: 1.4,

    // Seedance 2.0 Pro / Seedace (Kie - 20% margin)
    seedace_480p: 11,
    seedace_720p: 24,
    seedace_1080p: 59,
    seedace_4k: 120,
    seedace: 24,

    // Storyboard
    storyboard_gen: 5,

    // Identity & Forge
    identity_kit: 7,
    movie_matrix: 5,

    // AI Refinement
    refine_prompt: 1,

    // Remix Studio (Higgsfield Genjutsu Motion Transfer - 15% margin over wholesale @ ₹96/USD, 720p exact middle)
    remix_motion_transfer_480p: 36,
    remix_motion_transfer_720p: 63,
    remix_motion_transfer_1080p: 90,

    // Object Swap Studio (Higgsfield Genjutsu Object Swap - 15% margin over wholesale @ ₹96/USD, 720p exact middle)
    object_swap_480p: 36,
    object_swap_720p: 63,
    object_swap_1080p: 90,

    // AI Influencer (Higgsfield AI Influencer - $0.05 wholesale + 30% margin = ₹6 / 6 Shorts)
    ai_influencer: 6,
};

/**
 * Calculates the exact credit cost for any studio engine based on user parameters
 * (duration, resolution, audio toggle, mode).
 * Guaranteed to keep SidePanel and generation execution in 100% parity.
 */
export function calculateEngineCredits(engineId, options = {}) {
    const {
        duration = 5,
        resolution = '720p',
        generateAudio = true,
        activeTab = 'video',
        panelTab,
        transitionSubTab,
        remixEngine,
        motionEngine,
        motionMode = '720p',
        motionRefVideoDuration,
        extensionSourceVideo,
        extensionDuration,
        seedanceSubModel,
        hasVideoInput,
        hasVideoRef,
        sourceVideo,
        refVideo,
        refVideos
    } = options;

    if (activeTab === 'image') {
        const imgMap = {
            'nano-banana': 1,
            'nano-banana-2': 2,
            'nano-banana-pro': 3,
            'gpt-image-standard': 2,
            'gpt-image-hd': 4,
            'gpt-image': 2,
            'sunburst': 2,
            'flare': 2
        };
        return imgMap[engineId] || 1;
    }

    const dur = Number(duration) || 5;
    const resLower = (resolution || '720p').toLowerCase();
    const engLower = (engineId || '').toLowerCase();

    // 1. Motion Control: Dual Sub-Engines (Motion Easy vs Kling Motion)
    if (panelTab === 'motion' || engLower.includes('motion')) {
        const isKling = motionEngine === 'kling' || engLower.includes('kling');
        if (isKling) {
            const klingDur = Math.max(3, Math.min(30, Math.round(Number(motionRefVideoDuration) || dur || 5)));
            const rate = (resLower === '1080p' || motionMode === 'pro' || motionMode === '1080p') ? 18 : 14;
            return rate * klingDur;
        }
        // Motion Control Easy (Omni Flash 1.1 - 10s fixed)
        const motionDur = 10;
        let costPerSec = 5;
        if (resLower === '1080p' || motionMode === 'pro' || motionMode === '1080p') {
            costPerSec = generateAudio ? 8 : 6;
        } else {
            costPerSec = generateAudio ? 6 : 5; // 720p HD
        }
        return Math.ceil(costPerSec * 1.1 * motionDur);
    }

    // 2. Video Extension (Gemini Omni 1.1 Flash)
    if ((panelTab === 'omni-multi' && extensionSourceVideo) || engLower === 'omni_video_extension') {
        return (Number(extensionDuration) || 4) * 5;
    }

    // 3. Video Transition
    if (panelTab === 'transition') {
        const isOmniKeyframe = transitionSubTab === 'omni-keyframe' || engLower.includes('omni');
        if (isOmniKeyframe) {
            let costPerSec = 5;
            if (resLower === '4k') costPerSec = generateAudio ? 19 : 15;
            else if (resLower === '1080p') costPerSec = generateAudio ? 8 : 6;
            else if (resLower === '360p') costPerSec = generateAudio ? 5 : 4;
            else costPerSec = generateAudio ? 6 : 5;
            return Math.ceil(costPerSec * 1.1 * dur);
        }
        const isMini = engLower.includes('mini') || seedanceSubModel === 'seedance-mini';
        const costPerSec = isMini
            ? (resLower === '480p' ? 2.1 : 4.6)
            : (resLower === '1080p' ? 70 : (resLower === '480p' ? 7 : 14));
        return Math.ceil(costPerSec * dur);
    }

    // 4. Video Edit Studio (Omni 1.1 Video Edit)
    if (engLower.includes('ai-influencer') || engLower.includes('influencer')) {
        return SHORTS_COST.ai_influencer || 6;
    }
    if (panelTab === 'remix' || engLower.includes('remix')) {
        if (remixEngine === 'ai-influencer' || options.mode === 'ai-influencer') {
            return SHORTS_COST.ai_influencer || 6;
        }
        const remixDur = Math.max(4, Math.min(10, Math.round(Number(motionRefVideoDuration) || dur || 5)));
        return remixDur * 5;
    }

    // 5. Gemini Omni Flash (omni-flash, gemini-omni-1.1-flash, omni)
    if (panelTab === 'omni' || panelTab === 'omni-multi' || engLower.includes('omni')) {
        let costPerSec = 5;
        if (resLower === '4k') costPerSec = generateAudio ? 19 : 15;
        else if (resLower === '1080p') costPerSec = generateAudio ? 8 : 6;
        else if (resLower === '360p') costPerSec = generateAudio ? 5 : 4;
        else costPerSec = generateAudio ? 6 : 5; // 720p
        return Math.ceil(costPerSec * 1.1 * dur);
    }

    // 6. Veo 3.1 (veo-3.1-generate-preview, veo-3.1-fast-generate-preview, veo-3.1-lite-generate-preview, veo3)
    if (panelTab === 'veo' || engLower.startsWith('veo')) {
        let costPerSec = 5;
        if (engLower.includes('fast')) {
            if (resLower === '4k') costPerSec = generateAudio ? 19 : 15;
            else if (resLower === '1080p') costPerSec = generateAudio ? 8 : 6;
            else costPerSec = generateAudio ? 6 : 5; // 720p
        } else if (engLower.includes('lite')) {
            if (resLower === '4k' || resLower === '1080p') costPerSec = generateAudio ? 5 : 3;
            else costPerSec = generateAudio ? 3 : 2; // 720p
        } else {
            // standard / full
            if (resLower === '4k') costPerSec = generateAudio ? 40 : 27;
            else costPerSec = generateAudio ? 27 : 15; // 1080p, 720p
        }
        return Math.ceil(costPerSec * dur);
    }

    // 7. Seedance (2.0 Fast / Mini / 2.5 / Pro / Seedace) — 20% margin over wholesale costs
    if (panelTab === 'seedance' || panelTab === 'seedance-2.5' || engLower.includes('seedan') || engLower.includes('seedac')) {
        const isMini = engLower.includes('mini') || seedanceSubModel === 'seedance-mini';
        const is25 = engLower.includes('2.5') || panelTab === 'seedance-2.5';
        const isSeedace = engLower.includes('seedace') || seedanceSubModel === 'seedace' || engLower.includes('seedance-2-pro') || engLower.includes('seedance-pro');

        // Check for attached video references
        const candidateVideos = [
            ...(Array.isArray(options.seedanceVideos) ? options.seedanceVideos : []),
            ...(Array.isArray(options.reference_video_urls) ? options.reference_video_urls : []),
            ...(Array.isArray(options.ref_videos) ? options.ref_videos : []),
            ...(Array.isArray(options.refVideos) ? options.refVideos : []),
            ...(Array.isArray(options.omniMultiVideos) ? options.omniMultiVideos : []),
            options.sourceVideo,
            options.refVideo,
            options.motionRefVideo,
            hasVideoInput ? 'has_video' : null,
            hasVideoRef ? 'has_video' : null
        ].filter(Boolean);

        // Calculate input video duration (KIE bills input video duration + output video duration):
        let inputVideoDuration = 0;
        if (Array.isArray(options.seedanceVideoDurations) && options.seedanceVideoDurations.length > 0) {
            inputVideoDuration = options.seedanceVideoDurations.reduce((sum, d) => sum + (Number(d) || 0), 0);
        } else if (Array.isArray(options.videoDurations) && options.videoDurations.length > 0) {
            inputVideoDuration = options.videoDurations.reduce((sum, d) => sum + (Number(d) || 0), 0);
        } else if (Number(options.inputVideoDuration) > 0) {
            inputVideoDuration = Number(options.inputVideoDuration);
        } else if (Number(options.motionRefVideoDuration) > 0) {
            inputVideoDuration = Number(options.motionRefVideoDuration);
        } else if (candidateVideos.length > 0) {
            // Sensible fallback default of 5 seconds per attached video reference if duration not yet loaded
            inputVideoDuration = Math.max(5, candidateVideos.length * 5);
        }

        const hasVideo = candidateVideos.length > 0 || inputVideoDuration > 0;

        // Count image references: add +1 second extra per image beyond 3 images
        const candidateImages = [
            ...(Array.isArray(options.seedanceImages) ? options.seedanceImages : []),
            ...(Array.isArray(options.reference_image_urls) ? options.reference_image_urls : []),
            ...(Array.isArray(options.identity_images) ? options.identity_images : []),
            ...(Array.isArray(options.images) ? options.images : []),
            options.firstFrame,
            options.lastFrame,
            options.firstFrameImage,
            options.lastFrameImage
        ].filter(Boolean);

        const imageCount = candidateImages.length;
        const extraImageSeconds = imageCount > 3 ? (imageCount - 3) : 0;

        // Effective total billed duration (KIE bills input duration + output duration + extra media penalties)
        const effectiveDuration = (hasVideo ? (dur + inputVideoDuration) : dur) + extraImageSeconds;

        if (isMini) {
            // Seedance Mini (20% margin):
            // with video: 720p=2.9 ⚡/total s, 480p=1.4 ⚡/total s | no video: 720p=4.8 ⚡/s, 480p=2.2 ⚡/s
            const costPerSec = hasVideo
                ? (resLower === '480p' ? 1.4 : 2.9)
                : (resLower === '480p' ? 2.2 : 4.8);
            return Math.ceil(costPerSec * effectiveDuration);
        }

        if (isSeedace) {
            // Seedance 2.0 Pro / Seedace (20% margin):
            // with video: 4K=72/s, 1080p=36/s, 720p=14.5/s, 480p=6.7/s
            // no video:   4K=120/s, 1080p=59/s, 720p=24/s, 480p=11/s
            let costPerSec = 24.0;
            if (hasVideo) {
                costPerSec = resLower === '4k' ? 72.0 : (resLower === '1080p' ? 36.0 : (resLower === '480p' ? 6.7 : 14.5));
            } else {
                costPerSec = resLower === '4k' ? 120.0 : (resLower === '1080p' ? 59.0 : (resLower === '480p' ? 11.0 : 24.0));
            }
            return Math.ceil(costPerSec * effectiveDuration);
        }

        if (is25) {
            const isMultiRef = Boolean(
                options.isMultiRef ||
                candidateImages.length > 1 ||
                candidateVideos.length > 1 ||
                options.multiReferenceMode ||
                options.mode === 'multi-ref'
            );
            // Higgsfield API Wholesale + 20% margin (@ ₹96/USD):
            // Multi-ref: 480p=20 ⚡/s, 720p=65 ⚡/s, 1080p=110 ⚡/s
            // Standard:  480p=17 ⚡/s, 720p=55 ⚡/s, 1080p=92 ⚡/s
            const costPerSec = isMultiRef
                ? (resLower === '1080p' ? 110 : (resLower === '480p' ? 20 : 65))
                : (resLower === '1080p' ? 92 : (resLower === '480p' ? 17 : 55));
            return Math.ceil(costPerSec * effectiveDuration);
        }

        // Seedance 2.0 Fast (20% margin):
        // with video: 720p=8.7/total s, 480p=4.0/total s | no video: 720p=14.5/s, 480p=6.8/s
        const costPerSec = hasVideo
            ? (resLower === '480p' ? 4.0 : 8.7)
            : (resLower === '480p' ? 6.8 : 14.5);
        return Math.ceil(costPerSec * effectiveDuration);
    }

    return Math.round(dur * 2.5 * (generateAudio ? 1.5 : 1));
}


