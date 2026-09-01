---
name: prooflens-phase
description: Execute or audit the active ProofLens implementation phase against the approved planning documents. Use when continuing ProofLens, implementing a phase, checking phase acceptance, or auditing current progress. Do not use for unrelated repository work.
---

1. Read `docs/planning/SprintPlan.md` to identify the active phase.
2. From `docs/planning/IMPLEMENTATION_PLAN.md`, read:
   - outcomes/non-goals,
   - recorded decisions,
   - the active phase,
   - its directly relevant architecture sections,
   - and its exit criteria.
   Do not load unrelated later phases unless required to resolve a dependency.
3. Inspect relevant repository state, git history, code, and existing tests before editing.
4. Treat the active phase exit criteria as the completion checklist.
5. Implement the smallest coherent set of changes necessary to satisfy that phase without crossing its boundary.
6. Run narrow deterministic checks while working, then all feasible phase exit checks before completion.
7. Finish all unblocked local work rather than stopping for optional clarification. Respect external-action approval boundaries in `AGENTS.md`.
8. If a dependency is version-sensitive, verify it against current primary/official documentation rather than guessing.
9. Finish with a concise report of changes, validation, exit-criteria status, and any concrete blocker.
