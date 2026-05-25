## 2025-05-14 - Granular Zustand Selectors in SonicDock
**Learning:** Subscribing to the entire Zustand store using `const store = useAppStore()` causes the component to re-render on *every* store change, even if the accessed properties haven't changed. This is particularly impactful in UI-heavy components like `SonicDock` that are always visible.
**Action:** Always use granular selectors (e.g., `useAppStore(state => state.value)`) to ensure the component only re-renders when the specific tracked state or action changes.
