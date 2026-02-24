import { Handle, useStore } from 'reactflow';

/**
 * MagneticHandle — a reactflow Handle that visually "wakes up"
 * (grows + brightens) when a connection drag is near it.
 * Compatible with ReactFlow v11.x
 *
 * Props:
 *  - type        'source' | 'target'
 *  - position    Position.Left | Position.Right | Position.Top | Position.Bottom
 *  - id          optional handle id (for multi-handle nodes)
 *  - color       hex/css color for the dot (defaults to lime #bef264)
 *  - className   extra classes (e.g. animation classes like handle-character)
 *  - style       extra inline styles merged on top
 */
export default function MagneticHandle({
    type,
    position,
    id,
    color = '#bef264',
    className = '',
    style = {},
}) {
    // In ReactFlow v11, connectionNodeId is set while a drag is in progress
    const isConnecting = useStore(s => !!s.connectionNodeId);

    const baseStyle = {
        width: isConnecting ? 20 : 14,
        height: isConnecting ? 20 : 14,
        background: color,
        border: `3px solid #050505`,
        boxShadow: isConnecting
            ? `0 0 0 4px ${color}55, 0 0 24px ${color}88`
            : `0 0 10px ${color}55`,
        transition: 'all 0.15s ease',
        cursor: 'crosshair',
        zIndex: 9999,
        ...style,
    };

    return (
        <Handle
            type={type}
            position={position}
            id={id}
            className={className}
            style={baseStyle}
        />
    );
}
