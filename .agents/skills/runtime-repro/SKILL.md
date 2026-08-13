---
name: runtime-repro
description: Reproduce and classify a runtime failure from an exact repository state. Use for flaky tests, environment-dependent behavior, CI/local mismatches, fixture failures, or runtime bug diagnosis.
---

1. Record the exact commit SHA, working-tree state, runtime versions, command, inputs, and relevant environment without exposing secrets.
2. Reproduce in isolation and retain concise raw evidence: exit status, logs, output, or artifacts.
3. Classify the failure as environment, fixture/data, harness/tooling, or implementation; state uncertainty when evidence overlaps.
4. Identify the smallest causal mechanism that explains the evidence.
5. Apply no product fix unless authorized. If a fix is in scope, make the smallest causal change.
6. Rerun from fresh state and repeat the original command plus the narrow regression check.
7. Report exact reproduction conditions, classification, causal evidence, and fresh-state result.
