# Phase 7 migration record

Recorded 2026-08-29 from the `phase-0-bootstrap` worktree at commit
`6e57a087f9f5583ab2360d70629580e21458110e` (Phase 6 completion). All checks
below were read-only against GitHub and the deployed Workers; neither
standalone repository was changed.

## 1. Public documentation updated to canonical monorepo references

- `README.md`: the "Related repos" section pointed directly at
  `https://github.com/ProofLens/prooflens-signer` and
  `https://github.com/ProofLens/prooflens-verify-widget` as if they were the
  current locations of that code. Replaced with the canonical monorepo paths
  (`legacy/signer`, `legacy/verify-widget`), their final standalone
  commits/tags/rollback refs, and the concrete replacement package paths and
  CLI commands (`@prooflens/cli`'s `prooflens` binary; `@prooflens/verifier`'s
  auto-attach bundle build; `@prooflens/react`).
- `pilot-guide.md`: the quick-start script tag pulled
  `prooflens-verify-widget` directly from a GitHub-backed jsdelivr CDN URL
  (`cdn.jsdelivr.net/gh/prooflens/prooflens-verify-widget@main/...`). Replaced
  with the build command that produces the equivalent bundle from the
  canonical monorepo (`pnpm --filter @prooflens/verifier build`) and
  instructions to self-host the output, since no npm/CDN publish exists for
  either legacy package.
- No other tracked file outside `legacy/` references either standalone repo
  by URL (verified by full-repository search); the imported
  `legacy/signer/README.md` and `legacy/verify-widget/README.md` are frozen
  historical snapshots checked byte-for-byte against the final standalone
  commit by `scripts/verify-phase0-history.mjs` and were intentionally left
  unmodified.

## 2. Legacy link and redirect validation

Checked live against GitHub and the previously migrated site content on
2026-08-29:

| Link | Result |
| --- | --- |
| `https://github.com/ProofLens/prooflens-signer` (README/CI badge) | 200, repo present, unarchived at check time |
| `https://github.com/ProofLens/prooflens-verify-widget` (README/CI badge) | 200, repo present, unarchived at check time |
| `https://github.com/ProofLens/prooflens-signer/actions/workflows/ci.yml/badge.svg` | 200 |
| `https://github.com/ProofLens/prooflens-verify-widget/actions/workflows/ci.yml/badge.svg` | 200 |
| `https://cdn.jsdelivr.net/gh/prooflens/prooflens-verify-widget@main/dist/prooflens-verify.min.js` | 200 |

GitHub archiving a repository does not delete it, unpublish its refs, or
break `raw.githubusercontent.com`/jsdelivr access to its default branch and
tags — it only blocks new pushes, issues, and PRs. The jsdelivr link above
will therefore keep resolving after archiving; it was still replaced in
`pilot-guide.md` because depending on an archived repository's `@main` ref
for a live embed script is not an acceptable long-term instruction to give
pilot users, independent of whether the URL currently 200s.

## 3. Standalone repository state (verified live via `gh api`, 2026-08-29)

| Repository | `isArchived` | default branch HEAD | tags | LICENSE blob SHA | open issues/PRs | branch protection | webhooks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ProofLens/prooflens-signer` | `false` | `20e248ac2de56bc49a60478c315ba6baf378fd4f` | `v0.1.0` | `e2bac400a8451dd6d812e77362a4593c4b2e0000` | 0 | PR-review only, no admin bypass, no force-push/deletion | 0 |
| `ProofLens/prooflens-verify-widget` | `false` | `46bb79519fddc925fee6f856b98e987f444d819e` | `v0.1.0` | `e2bac400a8451dd6d812e77362a4593c4b2e0000` | 0 | PR-review only, no admin bypass, no force-push/deletion | 0 |

Both default-branch HEADs and tags match the commits recorded at import time
in `docs/history/standalone-imports.md` — neither standalone repository has
received new commits since Phase 0 import, so no re-import is required.
Both LICENSE blobs are identical to each other and their SHA-256
(`5639963e2ba5c4c9c5233dff729cad06775fab625fb1510cec4ebe850b4493d0`) matches
`legacy/signer/LICENSE` and `legacy/verify-widget/LICENSE` in this worktree
byte-for-byte. Zero open issues/PRs and zero webhooks on either repository
means archiving has no pending-work or integration side effects.

## 4. Imported-history reachability

`node scripts/verify-phase0-history.mjs` (unchanged since Phase 0, re-run at
Phase 7) passed all 18 checks: final-commit reachability, representative
root-commit reachability, rollback-tag resolution, namespaced release-tag
preservation, `legacy/*` path existence and canonical path history, and
byte-identical `LICENSE`/`README.md` snapshots, for both `signer` and
`verify-widget`.

## 5. Canonical deployment health

Re-verified live on 2026-08-29 against both Phase 6 Worker deployments
(`https://prooflens-preview.prooflens-web.workers.dev`,
`https://prooflens-production.prooflens-web.workers.dev`):

- `GET /api/health` on both: `200`, `ok: true`, correct `environment`, a
  live Worker version id.
- `apps/web/acceptance/online.mjs` (the full Phase 6 online acceptance
  suite: health/version, static demo serving, SPA fallback, `/api/*` routing
  precedence, identity/revocation/manifest lookup, conditional
  `If-None-Match` revalidation, immutable manifest caching, bounded/malformed
  input handling, method restriction, CORS preflight) passed against both
  environments with no changes to `apps/web`.

No infrastructure was provisioned, changed, or redeployed for Phase 7; this
is read-only confirmation that the Phase 6 state remains healthy.
