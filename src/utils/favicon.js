/**
 * Favicon Animation Utility
 * Dynamically updates the browser favicon with an animated SVG path.
 */

const LIME = '#c8f135';
const CIRCLE_PATH = "M 20,50 C 20,33.4 33.4,20 50,20 C 66.6,20 80,33.4 80,50 C 80,66.6 66.6,80 50,80 C 33.4,80 20,66.6 20,50 Z";
const INFINITY_PATH = "M 50,50 C 30,30 20,40 20,50 C 20,60 30,70 50,50 C 70,30 80,40 80,50 C 80,60 70,70 50,50 Z";

export const initFaviconAnimation = () => {
    const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    if (!link.parentNode) document.head.appendChild(link);

    let startTime = null;

    const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = (timestamp - startTime) % 4000; // 4s cycle
        const t = progress / 4000;

        // Simple interpolation between circle and infinity
        // For a true morph we'd need a path interpolation library, 
        // but for a favicon, switching or simple SVG animation is better.
        // Let's use an animated SVG string directly.

        const svgString = `
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <path d="${CIRCLE_PATH}" stroke="${LIME}" stroke-width="8" fill="none" stroke-linecap="round">
                    <animate 
                        attributeName="d" 
                        values="${CIRCLE_PATH};${INFINITY_PATH};${CIRCLE_PATH}" 
                        dur="4s" 
                        repeatCount="indefinite" 
                    />
                    <animateTransform 
                        attributeName="transform" 
                        type="rotate" 
                        from="0 50 50" 
                        to="360 50 50" 
                        dur="4s" 
                        repeatCount="indefinite" 
                    />
                </path>
                <circle cx="50" cy="50" r="5" fill="${LIME}">
                    <animate attributeName="opacity" values="1;0;1" dur="4s" repeatCount="indefinite" />
                </circle>
            </svg>
        `.trim();

        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const oldUrl = link.href;
        link.href = url;

        // Clean up old object URLs to avoid memory leaks
        if (oldUrl.startsWith('blob:')) {
            setTimeout(() => URL.revokeObjectURL(oldUrl), 100);
        }
    };

    // Note: Chrome and Firefox support SVGs with <animate> tags directly in favicons!
    // We don't even need RFA if we just set the SVG once.

    const staticAnimatedSvg = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="${CIRCLE_PATH}" stroke="${LIME}" stroke-width="12" fill="none" stroke-linecap="round">
                <animate 
                    attributeName="d" 
                    values="${CIRCLE_PATH};${INFINITY_PATH};${CIRCLE_PATH}" 
                    dur="4s" 
                    repeatCount="indefinite" 
                />
                <animateTransform 
                    attributeName="transform" 
                    type="rotate" 
                    from="0 50 50" 
                    to="360 50 50" 
                    dur="4s" 
                    repeatCount="indefinite" 
                />
            </path>
            <circle cx="50" cy="50" r="6" fill="${LIME}">
                <animate attributeName="opacity" values="1;0;1" dur="4s" repeatCount="indefinite" />
            </circle>
        </svg>
    `.trim();

    const blob = new Blob([staticAnimatedSvg], { type: 'image/svg+xml' });
    link.href = URL.createObjectURL(blob);
};
