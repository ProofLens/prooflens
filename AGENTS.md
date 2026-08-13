# ProofLens — Codex Instructions

## Sources of truth

- Architecture and acceptance criteria: `docs/planning/IMPLEMENTATION_PLAN.md`
- Active milestone: `docs/planning/SprintPlan.md`
- High-level sequencing: `docs/planning/Roadmap.md`

Work only on the active phase unless the user explicitly changes scope.
Read only the plan sections needed for the current task; do not eagerly load later phases.

## Architecture invariants

- ProofLens creator identity keys and C2PA Generator Product signing keys are separate.
- Exact final-file SHA-256 binding is allowed for detached claims only.
- Embedded provenance must use non-recursive C2PA claim/manifest binding.
- `demo-1` is read-only legacy integrity and must never become trusted identity.
- Initial C2PA signing is Node-based; browser C2PA is verification-only.
- Infrastructure remains blocked until the Phase 5 core acceptance gate passes.

## Working boundaries

- Inspect existing code, git state, history, and relevant tests before editing.
- Prefer the smallest coherent, deterministic, test-backed change.
- Safe local edits and validation do not require confirmation.
- Do not push, archive/delete repositories, provision cloud resources, or otherwise modify external state without explicit user authorization.
- Do not cross a phase boundary until its exit criteria pass.
- If repository reality conflicts with the approved architecture, report the conflict instead of silently changing the architecture.
- For version-sensitive dependencies or standards, verify against current primary/official documentation rather than guessing.

## Completion

Validate the work against the active phase's exit criteria.

Keep the final report concise:
- material changes
- validation performed and results
- exit-criteria status
- genuine blockers or next action
