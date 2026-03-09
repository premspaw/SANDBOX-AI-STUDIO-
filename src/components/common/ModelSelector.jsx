import { useState } from "react";

const MODELS = [
    {
        id: "gemini-2.5-flash-image",
        name: "Nano Banana",
        tag: "FAST",
        tagColor: "#888",
        credits: "1 credit",
        speed: "⚡⚡⚡",
        quality: "●●○○○",
        res: "1K max",
        desc: "High-speed, high-volume. Best for drafts and quick iterations.",
        accent: "#555555",
    },
    {
        id: "gemini-3.1-flash-image-preview",
        name: "Nano Banana 2",
        tag: "RECOMMENDED",
        tagColor: "#84CC16",
        credits: "2 credits",
        speed: "⚡⚡○",
        quality: "●●●●○",
        res: "4K max",
        desc: "Best balance of speed, quality and cost. Default for ZeroLens.",
        accent: "#84CC16",
    },
    {
        id: "gemini-3-pro-image-preview",
        name: "Nano Banana Pro",
        tag: "MAX QUALITY",
        tagColor: "#D4AF37",
        credits: "5 credits",
        speed: "⚡○○",
        quality: "●●●●●",
        res: "4K max",
        desc: "Professional asset production. Thinking mode + Google Search grounding.",
        accent: "#D4AF37",
    },
];

export default function ModelSelector({ selected, onSelect }) {
    const [hovered, setHovered] = useState(null);

    return (
        <div style={{
            display: "flex", gap: 12, width: "100%",
            fontFamily: "'JetBrains Mono', monospace",
        }}>
            {MODELS.map((m) => {
                const isActive = selected === m.id;
                const isHov = hovered === m.id;
                return (
                    <div
                        key={m.id}
                        onClick={() => onSelect(m.id)}
                        onMouseEnter={() => setHovered(m.id)}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                            flex: 1, cursor: "pointer", padding: "14px 16px",
                            background: isActive ? `${m.accent}12` : "#0f0f0f",
                            border: `1px solid ${isActive ? m.accent : isHov ? "#333" : "#1a1a1a"}`,
                            borderRadius: 6, transition: "all 0.2s",
                            boxShadow: isActive ? `0 0 16px ${m.accent}22` : "none",
                            position: "relative",
                        }}
                    >
                        {/* Tag */}
                        <div style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: 2,
                            color: m.tagColor, marginBottom: 8,
                        }}>
                            {m.tag}
                        </div>

                        {/* Name */}
                        <div style={{
                            fontSize: 13, fontWeight: 700,
                            color: isActive ? m.accent : "#ccc",
                            marginBottom: 6, letterSpacing: 0.5,
                        }}>
                            {m.name}
                        </div>

                        {/* Speed / Quality */}
                        <div style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>
                            SPEED {m.speed}
                        </div>
                        <div style={{ fontSize: 10, color: "#555", marginBottom: 10 }}>
                            QUAL &nbsp;{m.quality}
                        </div>

                        {/* Desc */}
                        <div style={{
                            fontSize: 10, color: "#666", lineHeight: 1.5, marginBottom: 10,
                        }}>
                            {m.desc}
                        </div>

                        {/* Footer */}
                        <div style={{
                            display: "flex", justifyContent: "space-between",
                            fontSize: 9, color: "#444",
                        }}>
                            <span>{m.res}</span>
                            <span style={{ color: isActive ? m.accent : "#444" }}>{m.credits}</span>
                        </div>

                        {/* Active dot */}
                        {isActive && (
                            <div style={{
                                position: "absolute", top: 12, right: 12,
                                width: 6, height: 6, borderRadius: "50%",
                                background: m.accent,
                                boxShadow: `0 0 8px ${m.accent}`,
                            }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
