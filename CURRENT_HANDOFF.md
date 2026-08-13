# Current handoff

## Current branch and SHA

- Worktree: `C:\Users\moizk\Music\prooflens\prooflens-canonical-phase0`
- Branch: `phase-0-bootstrap`
- Phase 3 completion is recorded by the current local `HEAD`.
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
- GitHub Actions installs the `package.json` pnpm version, uses `--frozen-lockfile`, installs Chromium for `@contentauth/c2pa-web` verification, runs `pnpm check`, verifies imported history, and keeps the existing site-file sanity job.
- Phase 3 passed and is recorded in `docs/planning/SprintPlan.md`.
- `@prooflens/c2pa-node` generates clearly labeled development/test C2PA Generator Product credentials that are distinct from non-extractable creator identity keys and are not a production trust root.
- Canonical C2PA signing uses `@contentauth/c2pa-node` with a ProofLens `org.prooflens.claim` assertion that carries the compact embedded claim and omits the final-file digest.
- Node Reader and `@contentauth/c2pa-web` in Chromium both confirm CAI claim/asset integrity for JPEG, PNG, and WebP. Development credentials are `valid-untrusted`; C2PA evidence never authenticates the human creator.
- `pnpm check`, `git diff --check`, and `node scripts/verify-phase0-history.mjs` pass locally.

## In progress

- No implementation is in progress.
- Phase 4 is the active milestone and has not started.

## Known blockers

- The ordinary Windows `python` command resolves to an unusable Store shim in this environment. `pnpm check` passes when `PROOFLENS_PYTHON` points to a usable Python 3.12 runtime.
- Nested `pnpm` script invocations are not on PATH when the workspace is driven through `corepack pnpm`; root scripts call `corepack pnpm` for recursive checks. GitHub Actions installs pnpm onto PATH.
- Chromium for `@contentauth/c2pa-web` verification is installed locally/CI via `playwright install chromium`; it is not a production C2PA trust root.
- No blocker remains for the completed Phase 3 scope.
- Publishing the branch or changing canonical remote state requires explicit authorization.

## Next three tasks

1. When explicitly starting Phase 4, ship the framework-neutral verifier, React components/hooks, auto-attach bundle, Node CLI, and Python ProofLens interoperability without collapsing ProofLens and C2PA evidence.
2. Keep canonical C2PA signing Node-based; browser signing covers only the ProofLens creator identity layer.
3. Keep infrastructure blocked until the Phase 5 core acceptance gate passes.
