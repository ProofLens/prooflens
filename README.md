<h1 align="center">ProofLens — Invisible Proof for Images</h1>

<p align="center">
  <a href="https://github.com/ProofLens/prooflens/actions/workflows/ci.yml">
    <img src="https://github.com/ProofLens/prooflens/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
</p>

**Portable, independently verifiable creator credit for images.** ProofLens
reports claim binding, creator signature validity, reviewed ProofLens
identity trust, and C2PA Content Credential validity/trust as four separate
facts — never collapsed into one verdict.

[Live registry](https://prooflens-production.prooflens-web.workers.dev)

---

## Why it matters
- **Separate evidence, never merged** — ProofLens claim binding, creator
  ES256 signature validity, reviewed/revoked/expired ProofLens identity
  trust, and independent C2PA Content Credential validity/trust are each
  reported on their own.
- **C2PA does not authenticate the human creator** — the C2PA Content
  Credential is signed by the ProofLens Generator Product, not the creator.
  A cryptographically valid credential is `valid-untrusted` unless an
  ecosystem independently trusts it.
- **Exact-file integrity** — detached envelopes bind the signed file's
  SHA-256 and byte length; embedded provenance binds through the C2PA
  manifest/claim instead of a recursive final-file digest.

## What’s inside
- `apps/web/` — the React/Vite app plus the read-focused `/api/*` registry
  Worker, deployed to isolated preview/production Cloudflare Workers with a
  D1-backed registry (see [`docs/adr/0002-unified-cloudflare-worker-deployment.md`](docs/adr/0002-unified-cloudflare-worker-deployment.md))
- `packages/` — `claim`, `identity`, `metadata`, `c2pa-node`, `verifier`,
  `react`, `cli`, `python`: creator claims, identity/trust, metadata
  discovery, C2PA Generator Product signing, verification, the `prooflens`
  CLI, and Python interoperability
- `fixtures/` — deterministic JPEG/PNG/WebP generation used by tests
- `docs/` — architecture decision records, planning (roadmap, sprint plan,
  implementation plan), and history (imported-repository and migration
  records)
- `legacy/` — complete, frozen, read-only imported histories of the former
  `prooflens-signer` and `prooflens-verify-widget` repositories

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

## Quickstart

From this workspace, using `@prooflens/cli` (see the CLI usage above for
the full flag reference):

```bash
prooflens identity generate --out ./keys
prooflens identity sign --key ./keys/creator.private.jwk.json --asset photo.jpg \
  --kid https://your-registry.example/v1/keys/you --name "Your Name" \
  --credit "Photo: Your Name" --out photo.jpg.envelope.json

# Detached: verify the creator-signed envelope against the exact original file
prooflens verify --asset photo.jpg --envelope photo.jpg.envelope.json

# Embedded: add a C2PA Generator Product credential, then verify the C2PA-signed file
prooflens c2pa sign --asset photo.jpg --claim photo.jpg.envelope.json --out photo.c2pa.jpg
prooflens verify --asset photo.c2pa.jpg
```

Both `verify` calls report `state: "valid-untrusted"` here because no
registry was configured; the second also reports that C2PA authenticates
the ProofLens Generator Product, not the human creator.
[`packages/react`](packages/react) ships components/hooks for rendering
this verification in the browser; the live registry linked above is the
read-only public API these envelopes/claims resolve identities and
manifests against.

## Roadmap

See [`docs/planning/Roadmap.md`](docs/planning/Roadmap.md).

## License

MIT
