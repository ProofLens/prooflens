# Current handoff

## Current branch and SHA

- Worktree: `C:\Users\moizk\Music\prooflens\prooflens-canonical-phase0`
- Branch: `phase-0-bootstrap`
- Phase 5 completion is recorded by the current local `HEAD`.
- Nothing has been pushed or changed externally.

## Finished

- Phase 0 passed and is recorded in `docs/planning/SprintPlan.md`.
- The complete signer and verify-widget histories are imported under `legacy/`, with rollback refs, namespaced release tags, licenses, and traceability preserved.
- Planning sources, ADR 0001, the superseded-monorepo gap audit, root repository instructions, the `prooflens-phase` skill, and deterministic Phase 0 history verification are present.
- `node scripts/verify-phase0-history.mjs` passed from the committed Phase 0 state.
- Phase 1 passed and is recorded in `docs/planning/SprintPlan.md`.
- The minimal pnpm/strict-TypeScript workspace contains separate `@prooflens/claim` and `@prooflens/identity` packages; no later-phase app or infrastructure package was added.
- Strict runtime validators and JSON Schemas cover the v1 detached creator envelope and public identity registry record.
- RFC 8785 canonicalization, canonical base64url, low-S ES256 creator signing/verification, exact SHA-256 plus byte-length binding, registry validity/review/revocation semantics, and isolated read-only `demo-1` integrity are implemented.
- A reproducible shared ES256 vector is checked by TypeScript/Node and Python. Adversarial tests cover altered files, captions, claims, algorithms, fields, signatures, keys, timestamps, registry records, revocations, and legacy conflicts.
- Phase 2 passed and is recorded in `docs/planning/SprintPlan.md`.
- `@prooflens/fixtures` generates deterministic JPEG, PNG, and WebP from committed `xy-gradient-v1` source pixels. An optional photograph under `fixtures/examples/` is documented and is not a reproducibility dependency.
- `@prooflens/metadata` round-trips standard IPTC/XMP creator, credit, and description fields plus a non-recursive ProofLens XMP namespace (`urn:prooflens:ns:xmp:1.0`) and HTML `application/prooflens+json` carriage.
- Writers splice metadata without transcoding, preserve unrelated metadata, reject malformed/unsupported files, and keep embedded provenance free of the complete final-file digest. Detached exact-file SHA-256 binding remains sidecar-only.
- Discovery compares C2PA, XMP, HTML, detached, and legacy `demo-1` sources; conflicts are `invalid` and are not merged.
- GitHub Actions installs the `package.json` pnpm version, uses `--frozen-lockfile`, installs Chromium, Firefox, and WebKit, runs `pnpm check` (including `test:browser`), verifies imported history, and keeps the existing site-file sanity job.
- Phase 3 passed and is recorded in `docs/planning/SprintPlan.md`.
- `@prooflens/c2pa-node` generates clearly labeled development/test C2PA Generator Product credentials that are distinct from non-extractable creator identity keys and are not a production trust root.
- Canonical C2PA signing uses `@contentauth/c2pa-node` with a ProofLens `org.prooflens.claim` assertion that carries the compact embedded claim and omits the final-file digest.
- Node Reader and `@contentauth/c2pa-web` in Chromium both confirm CAI claim/asset integrity for JPEG, PNG, and WebP. Development credentials are `valid-untrusted`; C2PA evidence never authenticates the human creator.
- Phase 4 passed and is recorded in `docs/planning/SprintPlan.md`.
- `@prooflens/verifier` composes ProofLens and C2PA evidence without collapsing them, including `trusted`, `valid-untrusted`, `legacy-integrity`, `revoked`, `expired`, and `invalid`.
- `@prooflens/react` ships caption-mode components/hooks, keyboard/focus/live-region behavior, and a browser-only creator-identity signing hook. Canonical C2PA signing remains Node-based.
- The auto-attach bundle is generated from verifier source (`dist/prooflens-verify.js` and `.min.js`); copied widget sources are not maintained independently.
- `@prooflens/cli` orchestrates creator-key generation/signing, Generator Product C2PA signing, and verification. It refuses creator identity keys for C2PA signing.
- Python `prooflens-interop` verifies creator envelopes, canonicalizes JSON, and hashes assets; it does not evaluate C2PA.
- Chromium, Firefox, and WebKit pass keyboard/focus, live-region, CORS, currentSrc, offline, unavailable-registry, and conflict scenarios.
- `pnpm check`, `git diff --check`, and `node scripts/verify-phase0-history.mjs` pass locally.
- Phase 5 passed locally on 2026-08-29 from Node 24.16.0, pnpm 11.19.0,
  Python 3.12.13, and `cryptography` 50.0.0.
- The gate now blocks on deterministic formatting invariants, ESLint, four
  compiled JSON Schemas with positive/adversarial fixtures, strict TypeScript,
  unit/integration tests, C2PA Node and browser CAI validation, Python
  interoperability, builds, Chromium/Firefox/WebKit behavior, dependency
  auditing, full-history secret scanning, and imported-history verification.
- C2PA acceptance tests prove JPEG, PNG, and WebP preserve decoded pixels and
  unrelated container/XMP metadata while keeping the embedded ProofLens claim
  free of the final-file digest. Detached envelopes bind the completed signed
  file by SHA-256 and byte length and verify offline.
- Revoked and explicitly or temporally expired creator identities are asserted
  never to return `trusted`; development Generator Product credentials remain
  `valid-untrusted` even when the development root is supplied as a CAI anchor.
- Pinned Gitleaks 8.30.1 scanned all 44 commits. The only initial findings were
  historical public Cloudflare Web Analytics beacon IDs; `.gitleaks.toml`
  narrowly allowlists only `data-cf-beacon` lines, after which the scan passed.
- `.github/workflows/ci.yml` now contains blocking Phase 5 acceptance and
  dependency/full-history secret-scanning jobs. Nothing was run remotely.

## In progress

- No implementation is in progress.
- Phase 5 is complete. Phase 6 has not started.

## Known blockers

- The ordinary Windows `python` command resolves to an unusable Store shim in this environment. `pnpm check` passes when `PROOFLENS_PYTHON` points to a usable Python 3.12 runtime.
- Nested `pnpm` script invocations are not on PATH when the workspace is driven through `corepack pnpm`; root scripts call `corepack pnpm` for recursive checks. GitHub Actions installs pnpm onto PATH.
- Chromium, Firefox, and WebKit for Phase 4 acceptance are installed locally/CI via `playwright install --with-deps chromium firefox webkit`. They are not a production C2PA trust root.
- No blocker remains for the completed Phase 4 scope.
- Firefox cannot spawn its Playwright tab subprocess inside the local sandbox;
  the identical isolated test and full 30-test browser matrix pass outside the
  sandbox. This is an execution-environment restriction, not a product failure.
- No blocker remains for the completed Phase 5 scope.
- Publishing the branch or changing canonical remote state requires explicit authorization.

## Next three tasks

1. Do not start Phase 6 or provision Cloudflare Pages/Worker/D1 without explicit authorization.
2. When Phase 6 is explicitly started, reread its plan section and preserve the
   Phase 5 trust, binding, preservation, and blocking-CI guarantees.
3. Keep the imported standalone repositories unchanged and unarchived until the
   later migration/archive gate is explicitly reached.
