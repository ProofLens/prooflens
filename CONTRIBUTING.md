\# Contributing

\## Setup

\- `pnpm install` (pnpm/TypeScript workspace; see `package.json` for the
  pinned pnpm version and `pnpm-workspace.yaml` for the package list).

\- Python interoperability tests (`packages/python`) need a Python 3.11+
  environment with `cryptography>=44` installed.

\- `pnpm check` runs the full local gate: formatting, lint, schema
  validation, typecheck, unit/integration tests, Python interoperability,
  build, and browser tests.



\## Workflow

1\. Create a branch: `feat/...` or `fix/...`

2\. Commit small, descriptive messages.

3\. Open a PR to `main`. One approval required; CI (`site`, `history`,
   `Phase 5 core acceptance`, `Dependency and secret scanning`) must pass.



\## Code style

\- TypeScript: strict mode, ESLint (`pnpm lint`), 2-space indent.

\## Security

\- No secrets in code. Full-history secret scanning runs in CI (`.gitleaks.toml`).



