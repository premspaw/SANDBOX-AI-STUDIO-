## 2026-05-26 - Zustand Subscription Anti-pattern
**Learning:** Subscribing to the entire Zustand store (e.g., `const store = useAppStore()`) causes a component to re-render whenever *any* part of the store changes. In a state-heavy app like ZeroLens, this leads to significant performance degradation in global UI components like `SonicDock`.
**Action:** Always use granular selectors (e.g., `const value = useAppStore(state => state.value)`) or a stable selector object to minimize re-renders. Combine with `React.memo` for child components to ensure a lean render tree.
