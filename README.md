<h1 align="center">ProofLens — Invisible Proof for Images</h1>

<p align="center">
  <a href="https://github.com/ProofLens/prooflens/actions/workflows/ci.yml">
    <img src="https://github.com/ProofLens/prooflens/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
</p>

**Add a tiny verified credit-line — click to see creator and verify file integrity.
No on-image overlays. Paste two lines.**

[Live demo](https://prooflens.netlify.app/demo-embed.html) •
[Verify tool](https://prooflens.netlify.app/verify.html) •
[Site](https://prooflens.netlify.app)

---

## Why it matters
- **Credit that travels** — creators get visible attribution (caption chip) without changing editor workflow.
- **Integrity you can click** — SHA-256 of the *exact* file; if bytes change, it fails.
- **Zero-step for editors** — one-time header install; auto-link manifests (plugin/edge planned).

## What’s inside
- `site/` — Netlify demo pages (caption-mode, header-only)
- `docs/` — architecture, manifest schema, security, roadmap
- `examples/` — 2-line snippets + sample manifest

**Related repos**

`prooflens-signer` and `prooflens-verify-widget` were migrated into this
monorepo with full history preserved and are being retired in favor of it
(archiving pending final authorization). Their final tagged states remain
reachable here:

- Signer history: [`legacy/signer`](legacy/signer) (final standalone commit
  `20e248ac2de56bc49a60478c315ba6baf378fd4f`, tag
  [`standalone/signer/v0.1.0`](../../tags/standalone/signer/v0.1.0), rollback
  ref `refs/tags/rollback/signer/final-standalone`)
- Verify-widget history: [`legacy/verify-widget`](legacy/verify-widget)
  (final standalone commit
  `46bb79519fddc925fee6f856b98e987f444d819e`, tag
  [`standalone/verify-widget/v0.1.0`](../../tags/standalone/verify-widget/v0.1.0),
  rollback ref `refs/tags/rollback/verify-widget/final-standalone`)

Replacements in this monorepo:

- Signer CLI (Python) → `@prooflens/cli` Node package
  ([`packages/cli`](packages/cli)), installed via the workspace and run as
  `prooflens identity generate --out <dir>`,
  `prooflens identity sign --key <private.jwk.json> --asset <file> --kid <https-kid> --name <name> --credit <credit> --out <envelope.json>`,
  and `prooflens verify --asset <file> [--envelope <file>] [--registry <file>] [--html <file>] [--legacy <file>]`.
  C2PA Generator Product signing moved to `prooflens c2pa sign --asset <file> --claim <envelope-or-claim.json> --out <file>`.
- Verify widget (browser) → [`packages/verifier`](packages/verifier)'s
  auto-attach bundle, built from source with
  `pnpm --filter @prooflens/verifier build` (outputs
  `packages/verifier/dist/prooflens-verify.js` and `.min.js`), plus
  [`packages/react`](packages/react) component/hook bindings. See
  `docs/history/standalone-imports.md` and
  `docs/history/phase7-migration.md` for full migration detail.

## 1-minute quickstart
```html
<!-- caption-mode (no overlay) -->
<script src="https://prooflens.netlify.app/assets/prooflens-verify-lite.js"></script>

<figure>
  <img src="/path/photo.jpg"
       data-manifest-url="/path/photo.jpg.manifest.json"
       alt="">
  <figcaption class="credit">Photo: Your Name</figcaption>
</figure>
How it works
A small *.manifest.json stores sha256, creator, and created_at.

The browser (WebCrypto) hashes the displayed image and compares to the manifest.

Match ⇒ ✓ verified; mismatch ⇒ check failed.

Roadmap
WordPress Auto-CR (one-time install; auto-manifests on upload)

Edge auto-manifest (Netlify/Cloudflare) with Link: rel="content-credentials"

Trust dashboard + DMCA evidence bundle

License
MIT
