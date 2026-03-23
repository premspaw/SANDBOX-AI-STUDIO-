/**
 * Favicon Animation Utility
 * Dynamically updates the browser favicon with the official brand logo.
 */

const LIME = '#AADD00';
const DARK_BG = '#0a0a0a';
const RED_REC = '#FF3333';

export const initFaviconAnimation = () => {
    const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    if (!link.parentNode) document.head.appendChild(link);

    const brandLogoSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
            <!-- Solid background for visibility on all tab bar themes -->
            <circle cx="80" cy="80" r="80" fill="${DARK_BG}"/>
            
            <!-- Outer aperture ring -->
            <circle cx="80" cy="80" r="72" fill="none" stroke="${LIME}" stroke-width="5"/>
            
            <!-- Aperture blade tick marks -->
            <g stroke="${LIME}" stroke-width="1.5" opacity="0.35">
                <line x1="80" y1="8" x2="80" y2="20"/>
                <line x1="80" y1="140" x2="80" y2="152"/>
                <line x1="8" y1="80" x2="20" y2="80"/>
                <line x1="140" y1="80" x2="152" y2="80"/>
                <line x1="30.7" y1="30.7" x2="39.2" y2="39.2"/>
                <line x1="120.8" y1="120.8" x2="129.3" y2="129.3"/>
                <line x1="129.3" y1="30.7" x2="120.8" y2="39.2"/>
                <line x1="39.2" y1="120.8" x2="30.7" y2="129.3"/>
            </g>

            <!-- Aperture blade arcs -->
            <g fill="none" stroke="${LIME}" stroke-width="1.2" opacity="0.2">
                <path d="M80 24 A56 56 0 0 1 128.5 52"/>
                <path d="M128.5 52 A56 56 0 0 1 128.5 108"/>
                <path d="M128.5 108 A56 56 0 0 1 80 136"/>
                <path d="M80 136 A56 56 0 0 1 31.5 108"/>
                <path d="M31.5 108 A56 56 0 0 1 31.5 52"/>
                <path d="M31.5 52 A56 56 0 0 1 80 24"/>
            </g>

            <!-- Z letterform -->
            <g stroke="${LIME}" stroke-width="9" stroke-linecap="round">
                <line x1="50" y1="52" x2="110" y2="52" />
                <line x1="110" y1="52" x2="50" y2="108" />
                <line x1="50" y1="108" x2="110" y2="108" />
            </g>

            <!-- Pulse recording dot -->
            <circle cx="116" cy="50" r="6" fill="${RED_REC}">
                <animate 
                    attributeName="opacity" 
                    values="1;0.2;1" 
                    dur="2s" 
                    repeatCount="indefinite" 
                />
            </circle>
        </svg>
    `.trim();

    const blob = new Blob([brandLogoSvg], { type: 'image/svg+xml' });
    link.href = URL.createObjectURL(blob);
};

