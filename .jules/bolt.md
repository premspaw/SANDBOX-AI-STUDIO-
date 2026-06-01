## 2026-06-01 - [Zustand Granular Selectors & Store Cleanup]
**Learning:** Selecting the entire store in React components causes unnecessary re-renders on every state change. Using granular selectors and 'useShallow' for multiple values significantly improves rendering performance, especially in complex components like 'NanoBananaNode' and 'SonicDock'. Also, duplicate/shadowed action definitions in the store can lead to maintenance overhead and potential bugs.
**Action:** Always use granular selectors (e.g., 'useAppStore(state => state.value)') and 'useShallow' for object-based selectors. Audit the store regularly for duplicate keys.
## 2026-06-01 - [Smoke Test Port Mismatch & Missing Dependencies]
**Learning:** The 'smoke_test.js' was hardcoded to a different port than the actual server (3009 vs 3002). Also, the server required 'uuid' and 'ws' which were missing from 'package.json'.
**Action:** Always verify port configurations between tests and server. Ensure all 'imported' packages are present in 'package.json'.
