import { getBezierPath, EdgeLabelRenderer, BaseEdge, useReactFlow } from 'reactflow';
import { X } from 'lucide-react';
import { useState, useMemo } from 'react';

export default function NeuralEdge({
    id,
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    selected, markerEnd,
    targetHandleId,
}) {
    const { deleteElements } = useReactFlow();
    const [hovered, setHovered] = useState(false);

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX, sourceY, sourcePosition,
        targetX, targetY, targetPosition,
    });

    const showDelete = selected || hovered;

    // Semantic color based on target handle
    const edgeColor = useMemo(() => {
        if (targetHandleId === 'character') return '#bef264';
        if (targetHandleId === 'wardrobe') return '#f43f5e';
        if (targetHandleId === 'product') return '#f59e0b';
        if (targetHandleId === 'location') return '#22d3ee';
        if (targetHandleId === 'story') return '#8b5cf6';
        return '#c8f135';
    }, [targetHandleId]);

    const handleMouseEnter = () => setHovered(true);
    const handleMouseLeave = () => setHovered(false);

    return (
        <>
            {/* Hidden path for animateMotion reference */}
            <path id={`path-${id}`} d={edgePath} fill="none" stroke="none" />

            {/* SVG Glow Filter */}
            <defs>
                <filter id={`glow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Invisible fat hit area — easy to click/hover */}
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                style={{ cursor: 'pointer' }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            />

            {/* Glow underlay */}
            <path
                d={edgePath}
                fill="none"
                stroke={edgeColor}
                strokeWidth={showDelete ? 10 : 7}
                strokeOpacity={showDelete ? 0.3 : 0.12}
                strokeLinecap="round"
                style={{
                    filter: `url(#glow-${id})`,
                    transition: 'all 0.2s ease',
                    pointerEvents: 'none',
                }}
            />

            {/* Main dashed line */}
            <path
                d={edgePath}
                fill="none"
                stroke={showDelete ? '#ffffff' : edgeColor}
                strokeWidth={showDelete ? 2.5 : 1.8}
                strokeDasharray="6 4"
                strokeLinecap="round"
                style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            />

            {/* Traveling dot */}
            <circle r={3.5} fill={edgeColor} opacity={showDelete ? 0.3 : 1}>
                <animateMotion
                    dur="2s"
                    repeatCount="indefinite"
                    keyPoints="0;1"
                    keyTimes="0;1"
                    calcMode="linear"
                >
                    <mpath href={`#path-${id}`} />
                </animateMotion>
            </circle>

            {/* Stationary Anchor Dots */}
            <circle cx={sourceX} cy={sourceY} r={4.5} fill={edgeColor} style={{ pointerEvents: 'none' }} />
            <circle cx={targetX} cy={targetY} r={4.5} fill={edgeColor} style={{ pointerEvents: 'none' }} />

            {/* Secondary lagged dot */}
            <circle r={2} fill={edgeColor} opacity={showDelete ? 0 : 0.4}>
                <animateMotion
                    dur="2s"
                    begin="0.6s"
                    repeatCount="indefinite"
                    keyPoints="0;1"
                    keyTimes="0;1"
                    calcMode="linear"
                >
                    <mpath href={`#path-${id}`} />
                </animateMotion>
            </circle>

            {/* Delete button — only shown on hover or select */}
            <EdgeLabelRenderer>
                <div
                    className="nodrag nopan"
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px) scale(${showDelete ? 1 : 0.5})`,
                        pointerEvents: 'all',
                        zIndex: 9999,
                        opacity: showDelete ? 1 : 0,
                        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <button
                        onClick={() => deleteElements({ edges: [{ id }] })}
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: '#ff3a3a',
                            border: '2px solid #050505',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 16px rgba(255,58,58,0.6)',
                            transition: 'transform 0.15s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.25)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <X size={12} strokeWidth={3} />
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
