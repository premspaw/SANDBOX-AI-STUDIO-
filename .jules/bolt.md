## 2026-06-04 - [Zustand Granular Selectors]
**Learning:** Using `const store = useAppStore()` causes full component re-renders on every state change (e.g., node movement, toast updates). Granular selectors or `useShallow` significantly reduce re-render frequency in complex UI components like `DirectorHUD` and `SonicDock`.
**Action:** Always use granular selectors for individual values or `useShallow` for object-based selection to ensure components only re-render when relevant state changes.
