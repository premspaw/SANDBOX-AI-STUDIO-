## 2026-06-07 - Optimized IdentityNode Re-renders
**Learning:** React Flow nodes like `IdentityNode` that select the entire `edges` array from the Zustand store will re-render whenever any edge in the application is modified, regardless of whether it's connected to that specific node. This leads to O(N) re-renders where N is the number of nodes.
**Action:** Use granular selectors with `useShallow` to move connectivity checks (`edges.some(...)`) into the selector itself. This ensures the component only re-renders when its own connection status changes.
