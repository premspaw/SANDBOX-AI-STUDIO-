import React from 'react';
import { motion } from 'framer-motion';

const BrandLogo = ({ className = 'w-8 h-8', size = 32 }) => {
    const lime = '#AADD00';

    return (
        <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
            <svg
                width="160"
                height="160"
                viewBox="0 0 160 160"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: '100%', height: '100%' }}
            >
                <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <clipPath id="outerClip"><circle cx="80" cy="80" r="72"/></clipPath>
                </defs>

                {/* Outer aperture ring with glow */}
                <circle cx="80" cy="80" r="72" fill="none" stroke={lime} strokeWidth="5" filter="url(#glow)"/>
                
                {/* Aperture blade tick marks (8 blades) */}
                <g stroke={lime} strokeWidth="1.5" opacity="0.35">
                    <line x1="80" y1="8" x2="80" y2="20"/>
                    <line x1="80" y1="140" x2="80" y2="152"/>
                    <line x1="8" y1="80" x2="20" y2="80"/>
                    <line x1="140" y1="80" x2="152" y2="80"/>
                    <line x1="30.7" y1="30.7" x2="39.2" y2="39.2"/>
                    <line x1="120.8" y1="120.8" x2="129.3" y2="129.3"/>
                    <line x1="129.3" y1="30.7" x2="120.8" y2="39.2"/>
                    <line x1="39.2" y1="120.8" x2="30.7" y2="129.3"/>
                </g>

                {/* Inner aperture ring (subtle) */}
                <circle cx="80" cy="80" r="56" fill="none" stroke={lime} strokeWidth="1" opacity="0.2"/>

                {/* Aperture blade arcs — 6 blades creating hexagonal opening spinning perpetually */}
                <motion.g 
                    fill="none" 
                    stroke={lime} 
                    strokeWidth="1" 
                    opacity="0.18"
                    animate={{ rotate: [0, 360] }}
                    transition={{
                        duration: 15,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    style={{ transformOrigin: '80px 80px' }}
                >
                    <path d="M80 24 A56 56 0 0 1 128.5 52"/>
                    <path d="M128.5 52 A56 56 0 0 1 128.5 108"/>
                    <path d="M128.5 108 A56 56 0 0 1 80 136"/>
                    <path d="M80 136 A56 56 0 0 1 31.5 108"/>
                    <path d="M31.5 108 A56 56 0 0 1 31.5 52"/>
                    <path d="M31.5 52 A56 56 0 0 1 80 24"/>
                </motion.g>

                {/* Z letterform — bold, centered, inscribed with rotation for animation */}
                <motion.g
                    initial={{ rotate: 0 }}
                    animate={{ rotate: [0, 5, 0, -5, 0] }}
                    transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    style={{ transformOrigin: '80px 80px' }}
                >
                    {/* Top bar */}
                    <line x1="50" y1="56" x2="110" y2="56" stroke={lime} strokeWidth="8" strokeLinecap="round"/>
                    {/* Diagonal */}
                    <line x1="110" y1="56" x2="50" y2="104" stroke={lime} strokeWidth="8" strokeLinecap="round"/>
                    {/* Bottom bar */}
                    <line x1="50" y1="104" x2="110" y2="104" stroke={lime} strokeWidth="8" strokeLinecap="round"/>
                </motion.g>

                {/* Lens glint dot top-right */}
                <circle cx="116" cy="54" r="4.5" fill={lime} opacity="0.55"/>
            </svg>
        </div>
    );
};

export default BrandLogo;
