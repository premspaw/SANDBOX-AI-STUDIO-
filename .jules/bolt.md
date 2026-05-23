## 2025-05-15 - Initial Performance Boost: Code Splitting
**Learning:** The application had a monolithic initial bundle of ~2.3MB, largely due to heavy studio components being imported statically in `App.jsx`. By applying `React.lazy` and `Suspense`, we reduced the initial entry chunk to ~288kB.
**Action:** Always prefer code splitting for route-level components or heavy third-party integrations that are not required for the initial landing experience.

**Learning:** When using `React.lazy` with named exports, the standard `lazy(() => import('./module'))` fails as it expects a `default` export.
**Action:** Use `lazy(() => import('./module').then(m => ({ default: m.ExportName })))` for modules that only provide named exports.
