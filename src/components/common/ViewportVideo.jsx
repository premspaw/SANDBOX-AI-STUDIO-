import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { syncPreviewPlayback } from '../../lib/previewPlayback';
import { landingVideoPoster } from '../../config/landingMedia';
import { observePreviewSlot } from '../../lib/previewBudget';

/** Warm metadata near the viewport, but decode/play only while actually visible. */
export default function ViewportVideo({ src, muted = true, loop = true, style, poster, playbackGroup, autoPlay = true, playOnHover = false, ...props }) {
    const ref = useRef(null);
    const slotGrantedRef = useRef(false);
    const nearView = useInView(ref, { once: true, margin: '200px' });
    const inView = useInView(ref, { margin: '0px' });
    const reducedMotion = useReducedMotion();
    const [pageVisible, setPageVisible] = useState(() => !document.hidden);
    const [failed, setFailed] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [hasSlot, setHasSlot] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const previewPoster = poster || landingVideoPoster(src);
    const eligible = inView && pageVisible && !reducedMotion && !failed && (autoPlay || (playOnHover && hovered));
    const shouldPlay = eligible && (!playbackGroup || hasSlot);

    useEffect(() => { setFailed(false); setHasStarted(false); }, [src]);
    useEffect(() => observePreviewSlot({
        group: playbackGroup, element: ref.current, source: src, eligible,
        onChange(active) {
            slotGrantedRef.current = active;
            // Pause synchronously before handing a budget slot to another player.
            if (!active) syncPreviewPlayback(ref.current, false);
            setHasSlot(active);
            if (active) setHasStarted(true);
        },
    }), [playbackGroup, src, eligible]);

    useEffect(() => {
        const onVisibility = () => setPageVisible(!document.hidden);
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);
    useEffect(() => {
        const video = ref.current;
        syncPreviewPlayback(video, shouldPlay && (!playbackGroup || slotGrantedRef.current));
        return () => syncPreviewPlayback(video, false);
    }, [src, nearView, shouldPlay, playbackGroup]);

    return <>
        <video
            {...props}
            ref={ref}
            src={nearView && (!playbackGroup || hasSlot || hasStarted || !previewPoster) ? src : undefined}
            poster={previewPoster}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            muted={muted}
            loop={loop}
            playsInline
            preload="metadata"
            onCanPlay={() => syncPreviewPlayback(ref.current, shouldPlay && (!playbackGroup || slotGrantedRef.current))}
            onError={() => setFailed(true)}
            style={style}
        />
        {failed && <span role="status" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#aaa', background: '#111', fontSize: 12 }}>Preview unavailable</span>}
    </>;
}
