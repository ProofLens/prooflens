---
name: verify-change
description: Verify a repository change before handoff or commit. Use for implementation checks, bug-fix validation, diff audits, or requests to prove that a change works.
---

1. Inspect the intended change, relevant diff, and affected behavior before running checks.
2. Run the narrowest deterministic tests that exercise the change.
3. Run proportional broader tests for affected packages or integration boundaries.
4. Run applicable formatting, lint, type, schema, syntax, build, or static checks.
5. Run `git diff --check` and inspect final `git status` and the complete intended diff.
6. Distinguish proven behavior from assumptions and untested surfaces. Never report a skipped or unavailable check as passing.
