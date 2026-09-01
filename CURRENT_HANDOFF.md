# Current handoff

## Current branch and SHA

- Worktree: `C:\Users\moizk\Music\prooflens\prooflens-canonical-phase0`
- Canonical `main`: `ae73da4546d26a4f17735c8579097e65e73ea863` (PR #4 merge commit).
- Local working branch: `phase-7-public-docs`, created from canonical `main`
  after the merge, for the post-merge public-doc cleanup below. Not pushed.

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
- Phase 6 passed on 2026-08-29. The unified Cloudflare Worker application from
  ADR 0002 (React/Vite static assets plus `/api/*` Worker routes, one D1
  binding per environment) is deployed and verified live.
- Phase 7 (migration and archive readiness) completed its local scope on
  2026-08-29 and was published as PR #4, merged into canonical `main` at
  `ae73da4546d26a4f17735c8579097e65e73ea863` with all four required checks
  green (`site`, `history`, `Phase 5 core acceptance`,
  `Dependency and secret scanning`). See "Phase 7 migration and archive
  record" and "PR #4 merge and post-merge public-doc cleanup" below. A
  public-documentation gap was found in the merged `README.md` after PR #4
  landed (stale Netlify links and pre-Phase-0 architecture description) and
  is fixed on the unpushed `phase-7-public-docs` branch. Phase 7 is not
  marked complete and neither standalone repository is archived; archiving
  is authorized only after this cleanup is also reviewed on canonical `main`
  and the user gives explicit final authorization for that specific
  external action.

## Phase 6 deployment record

- Preview: `https://prooflens-preview.prooflens-web.workers.dev`
  (D1 `prooflens-registry-preview`, id `13cf151e-dba5-4e19-90f5-58b3c5624bd5`).
- Production: `https://prooflens-production.prooflens-web.workers.dev`
  (D1 `prooflens-registry-production`, id `0058ebcc-397b-4d25-84af-10e0869fb385`).
- Both are generated `*.workers.dev` hostnames only; no Pages project, R2,
  custom domain, Access, Email Service, or auth/session surface exists.
- Migration `migrations/0001_registry.sql` and the reviewed golden-vector seed
  `seeds/phase6-reviewed.sql` are applied in both databases independently
  (1 identity record, 1 manifest each), confirmed by direct remote D1 queries.
- The full online acceptance suite (`apps/web/acceptance/online.mjs`) passes
  against both environments: health/version, static demo serving, SPA
  fallback, `/api/*` routing precedence over assets, identity lookup,
  revocation lookup, digest-addressed manifest lookup, conditional
  (`If-None-Match`) revalidation, immutable manifest caching, bounded/malformed
  input handling (oversized/non-HTTPS/missing kid, malformed digest, 404/400),
  method restriction (405 with `Allow` header), CORS preflight, and no
  mutation route.
- Revocation-propagation and preview/production D1 isolation were verified
  directly: `acceptance/revoke-preview.sql` flipped the preview identity to
  `revoked` and the change was visible immediately through
  `/api/v1/identities` and `/api/v1/revocations`, while production's copy of
  the same `kid` remained `trusted` throughout. Preview was restored with
  `acceptance/restore-preview.sql` and re-verified.
- Rollback was validated on the preview Worker using `wrangler rollback`:
  rolling back to the prior version reproduced the pre-fix behavior exactly
  (concrete evidence the rollback changed running code), D1 row counts were
  unchanged by the rollback (1 identity, 1 manifest, confirmed by remote
  query), and rolling forward restored the fixed version. Production was not
  rolled back and was reverified unaffected throughout.
- The demo page was loaded in a real browser against the live preview
  deployment and rendered live registry status (service available,
  environment `preview`, identity `trusted`) with no console errors.

## Phase 7 migration and archive record

Full detail: `docs/history/phase7-migration.md` and
`docs/planning/phase7-archive-checklist.md`.

- `README.md` and `pilot-guide.md` no longer point at
  `github.com/ProofLens/prooflens-signer` /
  `prooflens-verify-widget` as live code locations. They now name the
  canonical `legacy/signer` and `legacy/verify-widget` history paths and the
  concrete replacements: `@prooflens/cli` (`prooflens identity
  generate`/`identity sign`/`c2pa sign`/`verify`) for the signer, and
  `@prooflens/verifier`'s auto-attach bundle
  (`pnpm --filter @prooflens/verifier build`) plus `@prooflens/react` for the
  verify widget.
- Live-checked 2026-08-29 via `gh api`: both `ProofLens/prooflens-signer` and
  `ProofLens/prooflens-verify-widget` are unarchived, have 0 open
  issues/PRs, 0 webhooks, non-bypassable branch protection only (no admin
  override, no force-push/deletion), and default-branch HEADs
  (`20e248ac...`, `46bb795...`) and `v0.1.0` tags identical to the commits
  recorded at Phase 0 import — neither repository changed since import.
  LICENSE blobs on both are byte-identical and match the imported
  `legacy/*/LICENSE` SHA-256 recorded in `docs/history/standalone-imports.md`.
- `node scripts/verify-phase0-history.mjs` re-run and passes (18/18): final
  and representative commit reachability, rollback-tag resolution,
  namespaced tag preservation, and byte-identical LICENSE/README snapshots
  for both imported histories.
- Canonical deployment reverified healthy without any redeploy: `GET
  /api/health` 200 on both `prooflens-preview` and `prooflens-production`,
  and the full `apps/web/acceptance/online.mjs` suite passes against both.
- Legacy links checked live: standalone repo pages, their CI badges, and the
  widget's jsdelivr CDN URL all resolve 200. (GitHub archiving does not
  break jsdelivr/raw access to a repo's existing refs — the CDN link was
  still replaced in `pilot-guide.md` because instructing pilot users to load
  a live `@main` script from a soon-to-be-archived, no-longer-maintained
  repository is not acceptable guidance regardless of current resolvability.)
- Archive checklist (`docs/planning/phase7-archive-checklist.md`): all five
  `IMPLEMENTATION_PLAN.md` archive-gate criteria PASS.
- Nothing was pushed, archived, or otherwise changed externally.
  `apps/web/worker-startup.cpuprofile`, a stray local Wrangler profiling
  artifact from a prior `wrangler dev` run, was deleted and `*.cpuprofile`
  added to `.gitignore` (same treatment as the existing generated-artifact
  exclusions) so the worktree is clean.
- A single narrow local commit
  (`docs+chore: Phase 7 migration references and archive checklist`, exact
  SHA reported alongside this handoff) captures the doc/gitignore changes
  above as the pre-archive checkpoint. It was not pushed.

## PR #4 merge and post-merge public-doc cleanup

- PR #4 (`phase-0-bootstrap` → `main`) was merged with a normal merge commit
  at `ae73da4546d26a4f17735c8579097e65e73ea863`. Post-merge GitHub Actions on
  canonical `main` is fully green: `site`, `history`,
  `Phase 5 core acceptance`, `Dependency and secret scanning`.
- After the merge, a narrow final Phase 7 public-doc gap was found: the root
  `README.md` still linked the pre-Phase-0 Netlify site
  (`prooflens.netlify.app/demo-embed.html`, `/verify.html`, and the bare
  site root) and its opening sections/quickstart still described the old
  static `demo-1`-style integration (a separate unsigned `.manifest.json`
  plus a Netlify-hosted `prooflens-verify-lite.js`) as if it were the
  current product, instead of the ES256 creator-signing, C2PA
  Generator-Product, and registry-trust architecture actually shipped in
  Phases 1-6.
- Fixed on the local, unpushed `phase-7-public-docs` branch (created from
  canonical `main` after the merge): the opening pitch and "Why it matters"
  now state the four separate trust facts and that C2PA does not
  authenticate the human creator; the three Netlify links are replaced by
  the one live production route
  (`https://prooflens-production.prooflens-web.workers.dev`) since the app
  has no other routes (confirmed by inspecting `apps/web/src/main.tsx`,
  which renders a single page, and the Worker's `/api/*` routing table);
  "What's inside" now lists the real top-level layout
  (`apps/web/`, `packages/`, `fixtures/`, `docs/`, `legacy/`); and the
  quickstart was replaced with a `@prooflens/cli` sequence (identity
  generate/sign, detached verify, C2PA sign, embedded verify) that was
  actually run end-to-end against a generated fixture before being written
  down. The already-correct "Related repos"/replacements section from PR #4
  was left unchanged — no defect found there. `pilot-guide.md` and
  `docs/history/phase7-migration.md` were re-checked against the same
  standard: no stale references found (the phase7-migration.md jsdelivr/
  Netlify mentions are an accurately dated historical record of what was
  checked on 2026-08-29, not current-state claims).
- This cleanup is one narrow local commit on `phase-7-public-docs`, not yet
  pushed, not merged. Phase 7 remains not-fully-complete and neither
  standalone repository is archived.

## Fix made during Phase 6 completion

- `apps/web/worker/index.ts`: `If-None-Match` revalidation compared the
  incoming header against the strong `ETag` with exact string equality.
  Cloudflare's edge automatically weakens a strong `ETag` to `W/"..."` when it
  compresses a JSON response for any client sending `Accept-Encoding: gzip`
  (i.e. virtually all real clients, including Node's `fetch` and browsers;
  `curl` only worked because it does not request compression by default). The
  exact-match comparison therefore never matched and every conditional GET
  fell through to 200 instead of 304. Fixed by implementing the weak
  comparison required for `If-None-Match` per RFC 7232 §2.3.2 (a `W/` prefix
  on either side is stripped before comparing). Verified live: `curl` masked
  the bug; `node acceptance/online.mjs` (uses `fetch`) reproduces it before
  the fix and passes after. Redeployed to both environments.
- `.gitignore` / `eslint.config.js`: `apps/web/worker-configuration.d.ts` is
  Wrangler-generated boilerplate (regenerated via `pnpm --filter @prooflens/web
  types`) that fails the repo's zero-trailing-whitespace formatting invariant
  and would otherwise fail lint. Added to the same generated-artifact
  exclusions already used for `dist/`, `.wrangler/`, and `.wrangler-config/`
  rather than hand-editing generated content.

## Known blockers

- The ordinary Windows `python` command resolves to an unusable Store shim in this environment. `pnpm check` passes when `PROOFLENS_PYTHON` points to a usable Python 3.12 runtime.
- Nested `pnpm` script invocations are not on PATH when the workspace is driven through `corepack pnpm`; root scripts call `corepack pnpm` for recursive checks. GitHub Actions installs pnpm onto PATH.
- Chromium, Firefox, and WebKit for Phase 4 acceptance are installed locally/CI via `playwright install --with-deps chromium firefox webkit`. They are not a production C2PA trust root.
- No blocker remains for the completed Phase 4 scope.
- Firefox cannot spawn its Playwright tab subprocess inside the local sandbox;
  the identical isolated test and full 30-test browser matrix pass outside the
  sandbox. This is an execution-environment restriction, not a product failure.
- No blocker remains for the completed Phase 5 scope.
- No blocker remains for the completed Phase 6 scope. `pnpm check`'s
  `test:python` and `test:browser` legs were not re-run for this Phase 6 pass
  (they exercise Phase 3/4 C2PA and browser-verification code untouched by the
  Worker fix, and carry the pre-existing Python-shim and Firefox-sandbox
  blockers above); format, lint, schema, typecheck, unit tests across all nine
  TypeScript workspace projects including `apps/web`, build, dependency audit,
  and Phase 0 history verification were all re-run and pass.
- Publishing the branch or changing canonical remote state requires explicit authorization.

## Next three tasks

1. Await explicit authorization to push `phase-7-public-docs` and open a PR
   into canonical `main` for the public-doc cleanup; do not push or open a
   PR without that authorization.
2. Once that PR merges and CI is green on `main`, re-verify the archive
   gate against the merged public docs (not just the local branch), then
   await separate explicit user authorization to archive
   `ProofLens/prooflens-signer` and `ProofLens/prooflens-verify-widget`. Do
   not archive without that authorization, and only archive — never delete.
3. If authorized, archive both repositories via `gh api` (`PATCH
   repos/{owner}/{repo}` with `archived: true`), record the action and
   timestamp in `docs/history/phase7-migration.md` and this handoff, and
   only then update `docs/planning/SprintPlan.md`/`Roadmap.md` to mark
   Phase 7 fully complete.
