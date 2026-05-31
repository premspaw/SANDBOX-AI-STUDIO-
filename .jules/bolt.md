## 2025-05-31 - Optimized Zustand State Subscriptions and Node Rendering

**Learning:** In React Flow applications, subscribing to the entire `edges` array in custom nodes causes O(N) re-renders (where N is the number of nodes) whenever ANY edge changes. Moving connectivity checks (`edges.some(...)`) directly into the Zustand selector reduces re-renders to only the affected nodes. Similarly, using granular selectors instead of `useAppStore()` prevents UI-heavy panels like `SonicDock` or `DirectorHUD` from re-rendering on every store update (like background balance syncs or toast messages).

**Action:** Always use granular selectors (e.g., `useAppStore(state => state.value)`) and `useShallow` for object selectors. Move array filtering/searching logic inside selectors to minimize component re-subscriptions.
