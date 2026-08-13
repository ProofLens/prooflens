# ProofLens Corrected Implementation Plan

Status: approved architecture revision; infrastructure provisioning is blocked until Phase 6.

## 1. Outcomes and non-goals

ProofLens will become a history-preserving React and TypeScript monorepo in the existing `ProofLens/prooflens` GitHub repository. Its trust model will keep four facts separate:

1. ProofLens manifest or claim binding to the asset.
2. Validity of the creator's ProofLens ES256 signature.
3. ProofLens-reviewed creator identity, including expiry and revocation.
4. C2PA Content Credential validity and external trust, independently of ProofLens identity.

The initial release will not claim that C2PA authenticates the human creator. The C2PA signer represents the ProofLens Generator Product. Human identity remains in the ProofLens identity layer. CAWG-compatible identity assertions, browser-local C2PA signing, a production C2PA CA, authentication services, administrative web APIs, R2, Email Service, Access, and custom domains are later milestones.

Unsigned `demo-1` manifests remain read-only and can produce only `legacy-integrity` or `invalid`.

## 2. Repository consolidation

### Canonical repository

- Clone or fetch `ProofLens/prooflens` into a clean local worktree and verify its remote and default branch before changing files.
- Tag the final standalone states of `ProofLens/prooflens-signer` and `ProofLens/prooflens-verify-widget`.
- Import both complete histories into the canonical repository with subtree/history-preserving merges under `legacy/signer` and `legacy/verify-widget`, or equivalent stable paths chosen before import.
- Do not import `prooflens-site` as a third standalone repository unless the canonical repository history proves it is required. Migrate current public-site content as files with traceable attribution instead.
- Verify imported commit reachability, tags, file ancestry, and license preservation with scripted checks.
- Create the pnpm workspace and port only corrected code from the superseded `prooflens-monorepo`; do not merge its incorrect trust, key, binding, or infrastructure assumptions wholesale.

### Archive gate

Archive `prooflens-signer` and `prooflens-verify-widget` only after all of the following pass:

- Canonical monorepo deployment is healthy.
- Legacy package and documentation links redirect or resolve correctly.
- Standalone tags and representative commits are reachable from the monorepo.
- Published migration instructions identify replacement package paths and CLI commands.
- A rollback reference to each final standalone commit has been recorded.

Archiving is allowed; deletion is not.

## 3. Target workspace

Use pnpm, strict TypeScript, React, Vite, Vitest, Playwright, ESLint, and generated shared types.

Proposed layout:

```text
apps/
  web/                 React signer/verifier and public demo
  registry-worker/     Read-focused public registry Worker
packages/
  claim/               ProofLens schemas, JCS, validation, golden vectors
  identity/            Creator keys, signatures, trust/revocation semantics
  metadata/            HTML and XMP discovery/carriage
  verifier/            Framework-neutral browser/Node verification
  react/               Components and hooks
  c2pa-node/           Canonical Generator Product signing adapter
  cli/                 Node CLI orchestration
  python/              Supported ProofLens interoperability CLI
fixtures/              Deterministic JPEG, PNG, and WebP generation
legacy/
  signer/
  verify-widget/
```

One versioned verifier package will publish React components/hooks, a framework-neutral API, and a small auto-attach bundle. Copied and minified source files will not be maintained independently.

## 4. Corrected provenance and key model

### Creator identity key

- Generate an ES256/P-256 creator identity key locally with WebCrypto or the CLI.
- Keep the browser working key non-extractable.
- Permit a one-time passphrase-encrypted backup during initial key creation; importing the backup creates a new non-extractable working key.
- Submit only the public JWK and review evidence to the registry process.
- Registry records map `kid` to the public key, reviewed identity, status, validity interval, and revocation data.
- A valid signature proves control of the creator identity key. A `trusted` result additionally requires a reviewed, current, non-revoked registry identity.

### C2PA Generator Product key

- Use a separate C2PA claim-signing key and development/test certificate controlled by the ProofLens Generator Product.
- Never reuse the creator identity key for C2PA signing.
- Use `@contentauth/c2pa-node` as the canonical signer for the initial release.
- Use `@contentauth/c2pa-web` for browser verification only.
- Clearly label development/test C2PA credentials. A cryptographically valid development credential is `valid-untrusted` unless the validating ecosystem independently trusts it.
- Do not create or advertise a production ProofLens C2PA root yet.
- Add CAWG-compatible creator identity assertions only in a later interoperability phase, after the base separation is stable and conformant.

## 5. Claims and asset binding

### ProofLens detached envelope

The strict v1 creator envelope contains version, claim ID, issue time, creator `kid`, asset MIME/size/name, creator credit and caption, edits, and locators. Canonicalize the payload with RFC 8785 and sign it with the creator identity key using ES256.

For a detached sidecar, exact-file binding may include the SHA-256 and byte length of the complete target file because the digest is outside that file.

### Embedded ProofLens provenance

Do not embed the SHA-256 of the complete final file inside metadata in that same file. Embedded ProofLens provenance will instead be carried as a C2PA assertion or be referenced by a C2PA manifest/claim binding. The C2PA claim's asset hashing/exclusion model supplies the embedded binding.

The embedded ProofLens assertion should carry the creator-signed identity claim or a canonical digest/locator for it, plus the fields necessary to compare the visible caption. It must not introduce a recursive final-file digest.

### HTML and XMP

- HTML may associate a compact creator-signed envelope with a figure through a non-executing `application/prooflens+json` block and explicit manifest/claim locators.
- Standard IPTC/XMP creator, credit, and description fields remain descriptive metadata, not cryptographic proof.
- A ProofLens XMP namespace may carry non-recursive locators, claim IDs, C2PA manifest references, and the compact creator claim where size permits.
- `xmpRights:WebStatement` is used only for an actual rights statement.
- Writers preserve pixels and unrelated metadata and reject malformed/unsupported files instead of transcoding.

### Discovery order

1. Embedded C2PA manifest and ProofLens assertion.
2. Embedded ProofLens XMP locator/creator claim.
3. HTML-associated creator claim.
4. Digest-bound detached manifest.
5. Explicit legacy `data-manifest-url` for `demo-1`.

Higher-priority and lower-priority claims must be compared. Conflicts produce `invalid`; they are never silently merged.

## 6. Minimal registry and deployment boundary

Infrastructure work starts only after the core acceptance suite passes locally and in CI.

### Initial Cloudflare scope

- One Pages application for the React build.
- One minimal TypeScript Worker.
- Separate preview and production D1 databases only when deployment begins.
- No R2 in the initial deployment. Store small canonical detached manifests in D1, or resolve immutable manifests from versioned static assets when appropriate.

### Initial D1 data

- Public creator identity/key records.
- Reviewed/pending/revoked/expired status and validity dates.
- Revocation records.
- Canonical detached manifests and their SHA-256 identifiers/locators.
- Minimal append-only operational audit entries only if required for manual registry changes.

### Initial public API

- Resolve a creator key by `kid`.
- Read identity/key status and validity.
- Read revocation state.
- Resolve a digest-addressed detached manifest.
- Health/version endpoint.

Registry mutation is initially an offline, operator-run CLI/migration workflow. There are no magic links, sessions, email sending, Access-protected administration endpoints, browser enrollment writes, certificate issuance endpoints, or R2 objects in this phase.

Worker implementation still uses prepared D1 statements, tracked migrations, generated binding types, structured logs, current compatibility settings, bounded inputs, and explicit cache policy.

### Deferred infrastructure

- Magic-link authentication and user sessions.
- Cloudflare Email Service.
- Cloudflare Access administration.
- R2 sidecar/object storage.
- Online enrollment approval and certificate workflows.
- Custom domains.

Pages and Worker deployments use platform-generated hostnames until ownership and DNS configuration are confirmed. No `prooflens.org` hostname is hard-coded into schemas, trust decisions, fixtures, or architecture.

## 7. Acceptance-first implementation phases

### Phase 0 — Baseline and history safety

- Establish the canonical `ProofLens/prooflens` worktree.
- Record all remotes, final commits, tags, licenses, public URLs, and package links.
- Import signer and widget histories and verify ancestry.
- Add an architecture decision record for key separation and binding semantics.

Exit: history verification script passes and both standalone repositories remain unchanged and unarchived.

### Phase 1 — ProofLens claim and identity core

- Implement strict schema, RFC 8785 canonicalization, ES256 creator signing, detached exact-file hashing, registry record validation, expiry/revocation, and `demo-1` read-only verification.
- Produce shared TypeScript/Node/Python golden vectors.

Exit: altered files, captions, claims, algorithms, fields, keys, timestamps, registry records, revocations, and legacy conflicts all have deterministic expected results.

### Phase 2 — Deterministic fixtures and metadata

- Generate deterministic JPEG, PNG, and WebP fixtures in CI from source pixels.
- Round-trip standard IPTC/XMP and ProofLens locators while asserting identical decoded pixel hashes and preservation of unrelated metadata.
- Add an optional real photographic example that is not a reproducibility dependency.

Exit: all three generated formats pass preservation, malformed-input, stripped-metadata, and detached-binding tests.

### Phase 3 — C2PA Generator Product integration

- Create clearly labeled development/test C2PA credentials separate from creator identity keys.
- Sign with `@contentauth/c2pa-node` and include the ProofLens assertion/locator.
- Verify with Node and `@contentauth/c2pa-web`.
- Present C2PA signature validity and ecosystem trust separately; development credentials remain externally untrusted.

Exit: CAI validation confirms claim/asset integrity for all supported fixtures; no UI calls the human creator C2PA-authenticated.

### Phase 4 — React, packages, CLI, and Python

- Deliver browser verifier, React components/hooks, auto-attach bundle, Node signer/verifier CLI, and Python ProofLens interoperability.
- Browser signing covers only the ProofLens creator identity layer. Canonical C2PA signing remains Node-based.
- Surface `trusted`, `valid-untrusted`, `legacy-integrity`, `revoked`, `expired`, and `invalid` without collapsing ProofLens and C2PA evidence.

Exit: Chromium, Firefox, and WebKit pass keyboard/focus, live-region, CORS, currentSrc, offline, unavailable-registry, and conflict scenarios.

### Phase 5 — Core acceptance gate

Required before Cloudflare provisioning:

- Newly created detached claims verify exact final-file SHA-256 offline.
- Embedded ProofLens provenance verifies through the C2PA manifest/claim binding without a recursive final-file digest.
- Creator and C2PA keys are demonstrably distinct.
- Revoked and expired ProofLens identities never produce `trusted`.
- Development C2PA credentials never appear ecosystem-trusted.
- JPEG, PNG, and WebP retain pixels and unrelated metadata.
- Type-checking, linting, schema checks, unit/integration/browser tests, CAI validation, Python interoperability, builds, and dependency scanning pass in blocking CI.

### Phase 6 — Minimal Cloudflare deployment

- Provision Pages, Worker, and preview/production D1 only.
- Apply migrations and populate manually reviewed public identity records and test manifests through the offline operator workflow.
- Deploy to generated Cloudflare hostnames and run online lookup/revocation/manifest tests.

Exit: deployment passes health, caching, unavailable-registry, revocation propagation, rollback, and public-demo checks.

### Phase 7 — Migration and archive

- Update public pages and documentation to canonical monorepo URLs.
- Validate legacy redirects/links and imported history.
- Record final standalone tags and replacement instructions.
- Archive `prooflens-signer` and `prooflens-verify-widget`.

Exit: archive checklist is signed off; repositories remain readable and their histories are reachable from the monorepo.

## 8. CI matrix

Blocking jobs:

- Workspace formatting/lint/type-check/schema validation.
- ProofLens unit and adversarial vectors.
- TypeScript/Node/Python interoperability.
- Deterministic JPEG/PNG/WebP generation and metadata round trips.
- C2PA Node signing and Node/browser CAI verification with development credentials.
- Chromium, Firefox, and WebKit accessibility/behavior tests.
- Production builds and package export checks.
- Dependency and secret scanning.
- History-import verification until the old repositories are archived.

Development C2PA private material used by CI must be test-only, visibly labeled, scoped to fixtures, and incapable of being confused with a production trust root.

## 9. Decisions recorded

- Canonical repository: existing `ProofLens/prooflens`.
- Imported histories: `prooflens-signer` and `prooflens-verify-widget`.
- Archive after validation: yes.
- Deterministic generated fixtures: yes.
- Python interoperability: yes.
- Creator identity and C2PA Generator Product keys: separate.
- Canonical C2PA signer: Node SDK.
- Browser C2PA role initially: verification only.
- Production ProofLens C2PA CA: deferred.
- Cloudflare initial scope: Pages + minimal Worker/D1 only.
- Custom domains: deferred pending confirmed ownership/configuration.

## 10. Immediate next action

Do not provision infrastructure. First create a clean local checkout of `ProofLens/prooflens`, import and verify the two standalone histories, then perform a gap audit of the superseded monorepo commit. Port corrected modules phase-by-phase behind the Phase 5 acceptance gate.

