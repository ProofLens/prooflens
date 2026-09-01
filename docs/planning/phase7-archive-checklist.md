# Phase 7 archive checklist

Signed off 2026-08-29 against `docs/planning/IMPLEMENTATION_PLAN.md` §2
"Archive gate". Evidence for each item is in
`docs/history/phase7-migration.md` unless noted otherwise. Archiving
`ProofLens/prooflens-signer` and `ProofLens/prooflens-verify-widget` requires
all five items to PASS, plus explicit user authorization for the archive
action itself (`AGENTS.md`: archiving is an external-state change).

| # | Gate criterion | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Canonical monorepo deployment is healthy | **PASS** | Phase 7 migration record §5: live `/api/health` 200 on preview and production, full `apps/web/acceptance/online.mjs` suite passes against both, 2026-08-29 |
| 2 | Legacy package and documentation links redirect or resolve correctly | **PASS** | Phase 7 migration record §2: all checked README/CI-badge/CDN links resolve 200; README.md and pilot-guide.md updated to canonical monorepo paths and replacement CLI/package instructions instead of pointing at the standalone repos as current locations |
| 3 | Standalone tags and representative commits are reachable from the monorepo | **PASS** | `node scripts/verify-phase0-history.mjs`: 18/18 checks pass (final-commit reachability, representative-commit reachability, rollback-tag resolution, namespaced tag preservation, `legacy/*` path/history, LICENSE/README byte-identity) for both `signer` and `verify-widget`, re-run 2026-08-29 |
| 4 | Published migration instructions identify replacement package paths and CLI commands | **PASS** | `README.md` "Related repos" section and `pilot-guide.md` now name `@prooflens/cli` (`prooflens identity generate`/`identity sign`/`c2pa sign`/`verify`) as the signer replacement and `@prooflens/verifier` (`pnpm --filter @prooflens/verifier build`) plus `@prooflens/react` as the verify-widget replacement |
| 5 | A rollback reference to each final standalone commit has been recorded | **PASS** | Already recorded at Phase 0 in `docs/history/standalone-imports.md` and re-verified live 2026-08-29: `refs/tags/rollback/signer/final-standalone` → `20e248ac2de56bc49a60478c315ba6baf378fd4f`; `refs/tags/rollback/verify-widget/final-standalone` → `46bb79519fddc925fee6f856b98e987f444d819e`; both match the current `ProofLens/prooflens-signer`/`prooflens-verify-widget` default-branch HEADs, confirmed via `gh api` |

## Overall result: PASS

All five archive-gate criteria pass. Per `AGENTS.md` and this phase's
explicit instructions, archiving `ProofLens/prooflens-signer` and
`ProofLens/prooflens-verify-widget` is authorized to proceed **only after**
this checklist is reported to and explicitly authorized by the user.
Archiving is allowed; deletion is not, and no repository content, ref, or
history is removed by archiving.
