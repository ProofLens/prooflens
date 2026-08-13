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

Next milestone: Phase 3, C2PA Generator Product integration. Phase 3 has not
started.

Infrastructure provisioning is intentionally blocked until the Phase 5 core acceptance gate passes.
