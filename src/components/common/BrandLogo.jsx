import React from 'react';
import { motion } from 'framer-motion';

const BrandLogo = ({ className = 'w-8 h-8', size = 32 }) => {
    const lime = '#c8f135';

    // Circle path (starting state: lens)
    const circlePath = "M 20,50 C 20,33.4 33.4,20 50,20 C 66.6,20 80,33.4 80,50 C 80,66.6 66.6,80 50,80 C 33.4,80 20,66.6 20,50 Z";

    // Infinity path (end state: loop)
    // Simplified infinity: two loops meeting at 50,50
    const infinityPath = "M 50,50 C 30,30 20,40 20,50 C 20,60 30,70 50,50 C 70,30 80,40 80,50 C 80,60 70,70 50,50 Z";

    return (
        <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
            <svg
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: '100%', height: '100%' }}
            >
                {/* Glow effect */}
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Morphing Path */}
                <motion.path
                    d={circlePath}
                    stroke={lime}
                    strokeWidth="6"
                    strokeLinecap="round"
                    filter="url(#glow)"
                    animate={{
                        rotate: [0, 180, 360],
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />

                {/* Center dot (Lens element) */}
                <motion.circle
                    cx="50"
                    cy="50"
                    r="4"
                    fill={lime}
                    animate={{
                        scale: [1, 0, 1],
                        opacity: [1, 0, 1],
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </svg>
        </div>
    );
};

export default BrandLogo;
