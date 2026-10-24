# Application security review — 24 October 2026

## Scope and assurance

Reviewed the existing application, not just Reels: HTTP route registration, authentication, authorization, OAuth/MCP, media ingestion/rendering, browser secret references, billing handlers, WebSocket subscriptions, committed SQL policies and production dependencies. The source inventory covered 482 tracked text files and 178 route registrations before this report was added.

This is a source review with regression tests, not a penetration test or a certificate that the complete application is secure. Production environment values, live database policies, bucket ACLs, infrastructure, deployed browser bundles and historical access logs were not available. Git history, the committed plugin ZIP and external services were not comprehensively scanned.

## Fixes in this change

| Severity | Finding | Correction |
| --- | --- | --- |
| Critical | MCP accepted user IDs/emails as credentials and assigned anonymous callers a shared account | Verified bearer authentication only; unauthenticated calls fail closed |
| Critical | OAuth had known fallback signing/client secrets and reviewer passwords | Removed bypasses; explicit private signing secret; real Supabase sign-in through a separate client |
| High | OAuth redirects, grants and refresh tokens were insufficiently bound | Exact HTTPS callback allowlist, registered clients, S256 PKCE, signed CSRF form, short-lived access tokens, single-use codes and rotating refresh tokens |
| Critical | Motion, Ads and Remix operations could invoke paid services without verified identity | Authentication before work/upload; owner comes from the verified session; Remix charges through the server billing helper |
| High | Omni accepted client admin flags and credit amounts | Stored admin role and server-calculated charge; removed browser-controlled overrides |
| High | Cross-user job/assets/status access and unauthenticated WebSocket subscriptions | Owner-scoped queries, authenticated sockets, subscription checks, immutable job ownership and session limits |
| High | Widget interpolated untrusted HTML/URLs and polled status anonymously | Escaped passive HTML, HTTPS media URLs, CSP, authenticated status access |
| High | Client-facing refund requests could create credits without proof of a failed job | Client-initiated refunds disabled; server failure handling remains |
| High | A claimed prepayment could be reused because an update affecting zero rows counted as success | Conditional claim must return exactly one row; broader ledger risks below remain |
| High | User media URLs reached unrestricted fetch helpers; native fetch ignored the DNS-pinning agent | Node-fetch pinned connections, redirect/network validation, allowlisted hosts, timeouts and byte limits in inspected user-input helpers |
| High | Uploaded manifests could cause FFmpeg/FFprobe to read other resources | Local protocols and a container-format allowlist in Reels inspection, analysis, speech extraction and rendering; upload dimension limit |
| High | Browser code referenced admin/provider secrets from VITE environment values | Removed these fallbacks; browser SDKs use explicitly user-supplied keys only |
| High | UGC added a hardcoded admin password and credentials to arbitrary URLs containing an API path | Removed the interceptor; shared authentication attaches sessions only to configured first-party destinations; admin verification requires a verified stored admin role and explicitly configured private password |
| High | Public/overly broad SQL policies and editable profile privilege/balance fields | Prepared and tested restrictive owner policies, profile privilege trigger and revocation of browser billing/catalog writes |
| Medium | Predictable Reels signing-secret fallback | Private configured secret or random per-process secret |
| Medium | Large parser limits, loopback rate-limit bypass, unbounded socket sessions | Smaller parsers after rate limiting; socket size/auth/time/message limits |

Provider error messages and diagnostics across all legacy routes were not standardized. Some service-returned media downloads still use provider-specific fetch paths; network isolation remains necessary.

## Required rollout steps

1. Apply `supabase/migrations/20261024_security_boundaries.sql` in staging, verify account creation/settings/billing and then apply it to production. **It has not been applied to the live database.** The migration was exercised against disposable PostgreSQL fixtures with permissive starting policies, including cross-user reads, privilege changes, credit injection and valid settings updates.
2. Profiles must be provisioned by the existing trusted server/auth trigger. Browser profile creation/deletion is intentionally blocked. Legacy assets tables without a `user_id` column lose browser access until ownership is backfilled. Check these deployment prerequisites.
3. Set `ZEROLENS_MCP_SECRET` to at least 32 cryptographically random bytes; set `MCP_REDIRECT_URIS` to exact callback URL(s), comma-separated. Set `OPENAI_APP_CLIENT_ID`; optionally set `OPENAI_APP_CLIENT_SECRET` for a confidential client. Configure `SUPABASE_URL` and `SUPABASE_ANON_KEY` for OAuth password verification. Use `PUBLIC_APP_URL` for the public origin.
4. Existing MCP connections must reauthorize. Anonymous/user-ID connections and old fallback-signed tokens no longer work. OAuth requires HTTPS callbacks and secure cookies.
5. Set a stable private `REELS_MEDIA_SECRET`, configure provider keys on the server, and run one application process. Do not scale replicas with the current file store/in-memory grants.
6. If a provider key was ever included in a VITE build or exposed in logs, rotate it and replace the deployed bundle. Removing source references does not revoke an already exposed credential.
7. Three signed asset URLs were removed from the migration script. Supply fresh URLs through `MIGRATION_ASSETS_JSON`, configure `GCS_BUCKET_NAME`, and use Application Default Credentials. Prior commits still contain the old URLs: revoke/replace access if those assets should be private. No provider key/private key/service-role token was detected by the tracked-source pattern scan; that does not establish that historical deployments never leaked a secret.

Use explicit `PROXY_ALLOWED_HOSTS` entries for required media hosts that are not already allowed. Never add `*` or private-network destinations to make a failed download work.

## Remaining security and reliability risks

### High priority before public paid rollout

- **Billing settlement is not fully transactional.** Several legacy balance reads/updates/refunds can race, and the older prepayment fallback can match a differently priced recent spend. Move charges, exact-price prepayment claims and refunds into a database transaction with an immutable job/payment ID and idempotency constraint. Reels AI calls also need an explicit billing/quota policy. This change does not claim to solve the entire billing ledger.
- **Storage privacy is not established.** Existing generated-media buckets/CDNs may be public. Row-level security cannot revoke direct public URLs. Verify bucket policies, use private objects and signed URLs for private projects, and inspect whether previously shared assets need revocation.
- **Historical credentials need operational review.** Scan full Git history, archives, old frontend bundles, logs and deployment variables. The current source scan cannot revoke leaked credentials.
- **Per-account quotas and worker isolation remain incomplete.** Reels bounds jobs and export retention, but original uploads persist. Add byte/project quotas, a dedicated media worker with restricted network and filesystem access, and storage/CPU/memory monitoring before public scale.

### Dependency audit

The compatible patch update reduced production audit findings from 77 (3 critical, 44 high, 29 moderate, 1 low) to **34 (0 critical, 29 high, 5 moderate)**. Multer is pinned to at least 2.5.0 and the direct Zod dependency to at least 4.6.7.

Most remaining high reports propagate through Jimp's Zod 3 dependency tree (GHSA-mrhx-c7xc-m3w5); moderate reports include Google Cloud Storage's transitive dependencies. These remain open. No incompatible major upgrade or forced override was applied. Review actual reachability and replace/upgrade those dependencies with provider/image compatibility tests; do not equate “zero critical” with “no vulnerabilities.”

### Other limitations

- OAuth grants/registered dynamic clients are bounded but process-local. Restarts revoke grants; multiple workers need a shared transactional store.
- Legacy browser-only SDK features require a user-provided key or migration to an authenticated backend adapter. Company keys must never be restored to browser environment variables.
- Authenticated rate limits are not a complete abuse/spend-control system. Public proxy bandwidth, account creation abuse and provider quotas need deployment controls.
- Live provider requests, payment webhooks, storage permissions, real multi-user sessions, backup/restore and deployment rollback have not been exercised with production credentials.

## Reproducible checks

- `npm run test:security`
- `npm run test:reels`
- `npm run build`
- `npm run smoke:reels`
- `node scripts/security-inventory.mjs` (locations/categories only; never prints matched secrets)
- `npm audit --omit=dev`
- The CI workflow creates disposable PostgreSQL fixtures, applies the migration, and tests authorization boundaries. Never run `scripts/security-schema-fixture.sql` against a deployed database.

The changes are reviewable in the Reels workflow pull request. Merging source does not apply database migrations, rotate credentials, change storage ACLs or verify the running production deployment.
