## 2026-05-27 - Granular Zustand Selectors for High-Traffic UI
**Learning:** Subscribing to the entire Zustand store in complex components like `DirectorHUD` and `SonicDock` causes unnecessary re-renders whenever *any* part of the store updates (e.g., node position changes in the background). Transitioning to granular selectors isolates the component from unrelated state changes.

**Action:** Always use granular selectors (e.g., `useAppStore(state => state.value)`) instead of `const store = useAppStore()` in components that consume only a subset of the store.
