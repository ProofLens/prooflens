# Current Sprint

The active plan is [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

Phase 0 passed on 2026-08-12: the canonical baseline, history-safe imports,
rollback references, architecture decision, and deterministic history
verification are complete.

Phase 1 passed on 2026-08-13: strict v1 claim and registry schemas, RFC 8785
canonicalization, detached exact-file hashing, ES256 creator signatures,
identity validity/revocation semantics, isolated read-only `demo-1`
verification, and deterministic TypeScript/Node/Python golden-vector and
adversarial tests are complete.

Phase 2 passed on 2026-08-13: deterministic JPEG, PNG, and WebP fixtures from
source pixels, IPTC/XMP and ProofLens locator round-trips, pixel-preserving
writers, HTML `application/prooflens+json` carriage, non-recursive embedded
claims, malformed-input, stripped-metadata, and detached-binding tests, and
GitHub Actions coverage of `pnpm check` plus history verification are complete.

Phase 3 passed on 2026-08-13: labeled development/test C2PA Generator Product
credentials, `@contentauth/c2pa-node` signing of JPEG, PNG, and WebP with a
non-recursive ProofLens assertion, Node and `@contentauth/c2pa-web` CAI
validation of claim/asset integrity, and separate reporting of C2PA signature
validity versus ecosystem trust. Development credentials remain
`valid-untrusted` and never authenticate the human creator.

Phase 4 passed on 2026-08-13: framework-neutral verifier, React
components/hooks, auto-attach bundle, Node signer/verifier CLI, and Python
ProofLens interoperability. Browser signing covers only the ProofLens creator
identity layer; canonical C2PA signing remains Node-based. Chromium, Firefox,
and WebKit pass keyboard/focus, live-region, CORS, currentSrc, offline,
unavailable-registry, and conflict scenarios without collapsing ProofLens and
C2PA evidence.

Phase 5 passed on 2026-08-29: newly created detached claims verify exact
final-file SHA-256 offline; embedded ProofLens provenance verifies through C2PA
claim/asset binding without a recursive final-file digest; creator and Generator
Product keys are demonstrably distinct; revoked and expired identities never
produce `trusted`; development C2PA credentials remain ecosystem-untrusted;
JPEG, PNG, and WebP retain pixels and unrelated metadata; and the blocking
format, lint, schema, TypeScript, unit, integration, CAI, browser, Python,
build, dependency, secret, and history checks pass.

Phase 6 passed on 2026-08-29: the unified Cloudflare Worker application
accepted by ADR 0002 (React/Vite static assets plus `/api/*` registry routes,
named preview and production environments, one isolated D1 database per
environment) is deployed to generated `*.workers.dev` hostnames only. Both
databases received the tracked migration and the reviewed golden-vector seed
independently. The full online acceptance suite passes against both
environments, covering health/version, static demo serving, SPA fallback,
`/api/*` routing precedence, identity/revocation/manifest lookup, conditional
revalidation, immutable manifest caching, bounded/malformed-input handling, no
mutation surface, revocation propagation with confirmed preview/production D1
isolation, and Worker version rollback with concrete before/after evidence and
intact D1 state. A conditional-GET (`If-None-Match`) bug found during
acceptance — Cloudflare's edge weakens the Worker's strong `ETag` for
compressed responses, which the exact-match comparison rejected — was fixed to
use the RFC 7232 weak-comparison algorithm and redeployed to both
environments. See `CURRENT_HANDOFF.md` for the full deployment record.

Phase 7 local work passed on 2026-08-29: public documentation (`README.md`,
`pilot-guide.md`) was updated to canonical monorepo paths and to name
`@prooflens/cli` and `@prooflens/verifier`/`@prooflens/react` as the signer
and verify-widget replacements instead of the standalone repositories.
Legacy links, standalone-repo state (unarchived, unchanged since import, 0
open issues/PRs, 0 webhooks), imported-history reachability, and both
`prooflens-preview`/`prooflens-production` deployment health were reverified
live. All five `IMPLEMENTATION_PLAN.md` archive-gate criteria pass — see
`docs/planning/phase7-archive-checklist.md` and
`docs/history/phase7-migration.md`. Archiving
`prooflens-signer`/`prooflens-verify-widget` is authorized only after
explicit user sign-off on that checklist; it has not been performed.
