# Current handoff

## Current branch and SHA

- Worktree: `C:\Users\moizk\Music\prooflens\prooflens-canonical-phase0`
- Branch: `phase-0-bootstrap`
- Baseline SHA before this handoff commit: `173cac68b66d8a2a1f674636b0a918cd8ee9c1eb`
- Upstream comparison: 21 commits ahead of `canonical/main`; nothing has been pushed.

## Finished

- Phase 0 passed and is recorded in `docs/planning/SprintPlan.md`.
- The complete signer and verify-widget histories are imported under `legacy/`, with rollback refs, namespaced release tags, licenses, and traceability preserved.
- Planning sources, ADR 0001, the superseded-monorepo gap audit, root repository instructions, the `prooflens-phase` skill, and deterministic Phase 0 history verification are present.
- `node scripts/verify-phase0-history.mjs` passed from the committed Phase 0 state.

## In progress

- No product implementation is in progress.
- The active milestone is Phase 1: ProofLens claim and identity core. No Phase 1 product code has been started.
- This commit only refreshes durable agent instructions, adds generic local workflow skills, and records this handoff.

## Known blockers

- No blocker prevents local Phase 1 implementation.
- Publishing the Phase 0 branch or changing canonical remote state requires explicit authorization.
- The referenced `career-ops` skill and user-layer files (`cv.md`, profile, portals, applications tracker) do not exist in this ProofLens repository and are outside its approved architecture; none were created or removed.

## Next three tasks

1. Establish the minimal pnpm/strict-TypeScript Phase 1 workspace and package boundaries from the approved target layout, without porting superseded infrastructure or trust assumptions.
2. Implement strict v1 claim and registry schemas, RFC 8785 canonicalization, detached exact-file hashing, ES256 creator signing/verification, expiry/revocation semantics, and isolated read-only `demo-1` verification.
3. Add shared TypeScript/Node/Python golden vectors and deterministic adversarial tests covering every Phase 1 exit-criteria mutation and legacy conflict.
