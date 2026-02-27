import React, { useMemo } from 'react';
import { getSimpleBezierPath, BaseEdge } from 'reactflow';

export const WaveformEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    sourceHandleId,
    targetHandleId,
    selected
}) => {
    const [edgePath] = getSimpleBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    // Dynamic color based on semantic target handle
    const edgeColor = useMemo(() => {
        if (targetHandleId === 'character') return '#bef264';
        if (targetHandleId === 'wardrobe') return '#f43f5e';
        if (targetHandleId === 'product') return '#f59e0b';
        if (targetHandleId === 'location') return '#22d3ee';
        if (targetHandleId === 'story') return '#8b5cf6';
        return '#bef264'; // Default neon
    }, [targetHandleId]);

    return (
        <>
            <defs>
                <filter id="neural-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Outer Glow Path */}
            <path
                id={id + '_glow'}
                d={edgePath}
                fill="none"
                stroke={edgeColor}
                strokeWidth={selected ? 12 : 8}
                className="opacity-20 transition-all duration-500"
                style={{ filter: 'url(#neural-glow)', zIndex: 1000 }}
            />

            {/* Core Neural Path */}
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                className="react-flow__edge-path"
                style={{
                    ...style,
                    stroke: edgeColor,
                    strokeWidth: selected ? 4 : 2.5,
                    opacity: selected ? 1 : 0.8,
                    strokeDasharray: '6, 4',
                    strokeLinecap: 'round',
                    zIndex: 1000
                }}
            />

            {/* Traveling Neural Pulse */}
            <circle r="3.5" fill={edgeColor} className="shadow-lg" style={{ zIndex: 1001 }}>
                <animateMotion
                    dur={selected ? "1.2s" : "2s"}
                    repeatCount="indefinite"
                    path={edgePath}
                    rotate="auto"
                />
            </circle>

            {/* Secondary Pulse (Lagged) */}
            <circle r="2" fill={edgeColor} opacity="0.4" style={{ zIndex: 1001 }}>
                <animateMotion
                    dur={selected ? "1.2s" : "2s"}
                    begin="0.6s"
                    repeatCount="indefinite"
                    path={edgePath}
                    rotate="auto"
                />
            </circle>
        </>
    );
};
