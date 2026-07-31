## 2026-06-06 - [Zustand Over-subscription in Large Panels]
**Learning:** Large UI components (like DirectorHUD) and complex nodes (like NanoBananaNode) using the 'const store = useAppStore()' pattern re-render on every state change, even for unrelated keys (e.g., a node move causing a sidebar re-render).
**Action:** Use granular selectors for individual state keys and actions. Use 'useShallow' for object-based state slices. Access non-reactive data (like the 'nodes' array for positioning calculations) via 'useAppStore.getState()' inside event handlers.
