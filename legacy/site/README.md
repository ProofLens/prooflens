# Legacy Netlify site (frozen, not served live)

This directory holds the pre-Phase-0 static ProofLens marketing/demo site
(`index.html`, `embed.html`, `signer.html`, `demo-embed.html`,
`verify.html`, `showcase.html`, `pricing.html`, `success.html`, and
`assets/`) and its accompanying flat docs (`docs/arch.md`,
`docs/manifest.md`, `docs/roadmap.md`, `docs/security.md` — superseded by
`docs/adr/`, `docs/planning/IMPLEMENTATION_PLAN.md`, and
`docs/planning/Roadmap.md`), moved here with full history via `git mv`
during the Phase 7 public-site migration.

It is preserved for historical reference only. It is **not** served by the
Netlify deployment (`netlify.toml`'s `publish` directory no longer includes
this path) and must not be treated as a current ProofLens product surface:

- `signer.html` generates unsigned `manifest_version: "demo-1"` /
  `demo-self-signed` manifests — the read-only legacy-integrity tier
  described in `docs/planning/IMPLEMENTATION_PLAN.md`, never `trusted`.
- `embed.html` and `demo-embed.html` reference the retired
  `prooflens.netlify.app/assets/prooflens-verify*.js` widget bundle, not
  the current `@prooflens/verifier`/`@prooflens/react` packages.
- None of these pages implement ES256 creator signing, C2PA Generator
  Product evidence, or ProofLens registry identity trust.

The current ProofLens product is the unified Cloudflare Worker application
under [`apps/web`](../../apps/web) (see
[`docs/adr/0002-unified-cloudflare-worker-deployment.md`](../../docs/adr/0002-unified-cloudflare-worker-deployment.md)),
live at `https://prooflens-production.prooflens-web.workers.dev`. The
retired-site retirement notice at [`public/index.html`](../../public/index.html)
points visitors there.

This is unrelated to [`legacy/signer`](../signer) and
[`legacy/verify-widget`](../verify-widget), which are the complete imported
histories of the former standalone `prooflens-signer` and
`prooflens-verify-widget` GitHub repositories and remain byte-preserved and
independently history-verified by `scripts/verify-phase0-history.mjs`. This
`legacy/site` directory was never a separate repository — it is the
migrated content of this monorepo's own pre-Phase-0 root, per
`docs/planning/IMPLEMENTATION_PLAN.md` §2 ("Migrate current public-site
content as files with traceable attribution instead"), so it carries no
separate rollback tag and is not part of that script's checks.
