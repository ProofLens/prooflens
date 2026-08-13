# Current handoff

## Current branch and SHA

- Worktree: `C:\Users\moizk\Music\prooflens\prooflens-canonical-phase0`
- Branch: `phase-0-bootstrap`
- Phase 2 completion is recorded by the current local `HEAD`.
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
- Discovery compares XMP, HTML, detached, and legacy `demo-1` sources; conflicts are `invalid` and are not merged. C2PA remains absent until Phase 3.
- GitHub Actions now installs the `package.json` pnpm version, uses `--frozen-lockfile`, runs `pnpm check`, verifies imported history, and keeps the existing site-file sanity job.
- `pnpm check`, `git diff --check`, and `node scripts/verify-phase0-history.mjs` pass locally.

## In progress

- No implementation is in progress.
- Phase 3 is the next milestone and has not started.

## Known blockers

- The ordinary Windows `python` command resolves to an unusable Store shim in this environment. `pnpm check` passes when `PROOFLENS_PYTHON` points to a usable Python 3.12 runtime.
- Nested `pnpm` script invocations are not on PATH when the workspace is driven through `corepack pnpm`; root scripts call `corepack pnpm` for recursive checks. GitHub Actions installs pnpm onto PATH.
- No blocker remains for the completed Phase 2 scope.
- Publishing the branch or changing canonical remote state requires explicit authorization.

## Next three tasks

1. When explicitly starting Phase 3, create clearly labeled development/test C2PA credentials separate from creator identity keys.
2. Sign with `@contentauth/c2pa-node`, include the ProofLens assertion/locator, and verify with Node and `@contentauth/c2pa-web` without collapsing C2PA and ProofLens evidence.
3. Keep infrastructure blocked until the Phase 5 core acceptance gate passes.
