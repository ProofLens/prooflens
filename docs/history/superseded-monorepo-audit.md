# Superseded monorepo gap audit

Audited local ref `refs/heads/superseded-monorepo` at `6b95fea1921223363157bfbccaa87820d13fc7f1`. No code was ported during Phase 0.

Potential later-phase reference material includes the pnpm/TypeScript workspace configuration, strict claim parsing and canonicalization, ES256 helpers and adversarial tests, metadata readers/writers, framework-neutral verifier and React API shape, CLI/Python interoperability work, browser test setup, and CI structure. Each item requires phase-specific review against the approved plan before reuse.

Do not port the superseded registry/deployment implementation wholesale. It includes authentication, sessions, enrollment writes, Email Service, R2, administration APIs, hard-coded `prooflens.org` origins, and production-style trust-root/CA assumptions that the approved plan defers or rejects. Its embedded metadata and C2PA code must also be re-audited for non-recursive binding and strict separation of creator identity keys from Generator Product signing keys.
