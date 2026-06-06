## 2026-06-06 - Optimize SonicDock performance and fix state
**Learning:** Selecting the entire Zustand store with `const store = useAppStore()` in a large component like `SonicDock` causes unnecessary re-renders whenever any part of the store updates. Using `useShallow` with granular selectors prevents these re-renders. Also, missing local state (`narrative`) can lead to runtime reference errors and linting failures.
**Action:** Always use granular selectors and `useShallow` for Zustand store access, and ensure all required local state is defined before use.
