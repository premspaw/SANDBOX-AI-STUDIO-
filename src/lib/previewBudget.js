/** Pure selection policy: nearest visible previews, one player per media source. */
export function selectPreviewPlayers(candidates, limit) {
    const selected = new Set();
    const sources = new Set();
    for (const item of [...candidates].filter(item => item.eligible).sort((a, b) => a.distance - b.distance)) {
        if (selected.size >= Math.max(0, limit)) break;
        if (sources.has(item.source)) continue;
        selected.add(item.id);
        sources.add(item.source);
    }
    return selected;
}

export function createPreviewBudget(getLimit) {
    const players = new Map();
    let active = new Set();
    function refresh() {
        const next = selectPreviewPlayers([...players].map(([id, player]) => ({ id, ...player.measure() })), getLimit());
        // Revoke first so a replacement never overlaps the previous winner.
        for (const id of active) if (!next.has(id)) players.get(id)?.onChange(false);
        for (const id of next) if (!active.has(id)) players.get(id)?.onChange(true);
        active = next;
    }
    return {
        refresh,
        register(id, player) {
            players.set(id, player);
            refresh();
            return () => {
                if (active.has(id)) player.onChange(false);
                active.delete(id);
                players.delete(id);
                refresh();
            };
        },
        get size() { return players.size; },
    };
}

const groups = new Map();
export function observePreviewSlot({ group, element, source, eligible, onChange }) {
    if (!group || !element) return () => {};
    let entry = groups.get(group);
    if (!entry) {
        const budget = createPreviewBudget(() => window.innerWidth < 768 ? 1 : 3);
        let frame = null;
        const refresh = () => {
            if (frame !== null) return;
            frame = requestAnimationFrame(() => { frame = null; budget.refresh(); });
        };
        document.addEventListener('scroll', refresh, { capture: true, passive: true });
        window.addEventListener('resize', refresh, { passive: true });
        // The gallery moves with a CSS animation even when no scroll event fires.
        const timer = setInterval(refresh, 1000);
        entry = { budget, cleanup() {
            document.removeEventListener('scroll', refresh, true);
            window.removeEventListener('resize', refresh);
            clearInterval(timer);
            if (frame !== null) cancelAnimationFrame(frame);
        } };
        groups.set(group, entry);
    }
    const unregister = entry.budget.register(Symbol(), {
        onChange,
        measure() {
            const rect = element.getBoundingClientRect();
            return {
                source,
                eligible: eligible && !document.hidden && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth,
                distance: Math.hypot((rect.left + rect.right - window.innerWidth) / 2, (rect.top + rect.bottom - window.innerHeight) / 2),
            };
        },
    });
    return () => {
        unregister();
        if (!entry.budget.size) { entry.cleanup(); groups.delete(group); }
    };
}
