# ProofLens — Repository Instructions

## Purpose and sources

ProofLens is a history-preserving provenance system for portable creator claims, identity trust, metadata discovery, and independently evaluated C2PA evidence.

- Architecture and acceptance criteria: `docs/planning/IMPLEMENTATION_PLAN.md`
- Milestone sequencing: `docs/planning/Roadmap.md`
- Active milestone: `docs/planning/SprintPlan.md`
- Transient work state: `CURRENT_HANDOFF.md`

Work only within the active phase unless the user explicitly changes scope. Inspect relevant code, history, and tests before editing.

## Architecture

- Keep creator identity keys separate from C2PA Generator Product signing keys.
- Report ProofLens claim binding, creator-signature validity, ProofLens identity trust, and C2PA validity/trust as separate evidence.
- Allow exact final-file SHA-256 binding only for detached claims; embedded provenance uses non-recursive C2PA claim/manifest binding.
- Keep `demo-1` read-only legacy integrity; it can never establish trusted identity.
- Use Node for initial canonical C2PA signing and the browser for C2PA verification only.
- Keep infrastructure blocked until the Phase 5 core acceptance gate passes.

## Authority and releases

- Prefer narrow local branches and coherent commits; preserve unrelated work and imported history.
- Do not cross phase boundaries or silently redesign around repository conflicts.
- Do not push, force-push, merge, tag, release, deploy, provision infrastructure, archive repositories, or change external state without explicit user authorization.

## Verification

- Make deterministic, test-backed changes and verify version-sensitive behavior against primary documentation.
- Run targeted checks first, then proportional broader checks, static/type/syntax checks, and `git diff --check`.
- Validate against the active phase exit criteria and report what is proven, what remains untested, and any genuine blocker.
