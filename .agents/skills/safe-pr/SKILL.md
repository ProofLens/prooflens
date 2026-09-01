---
name: safe-pr
description: Prepare or publish a narrow pull request safely. Use when committing for review, checking PR readiness, pushing an authorized branch, or opening/updating a pull request.
---

1. Verify repository, remote, base branch, head branch, HEAD commit, worktree status, and upstream relationship.
2. Fetch immediately before any authorized push, then confirm the intended base/head and inspect their tree and commit range.
3. Inspect all changed paths and exclude unrelated, generated, secret, or accidental files.
4. Run and record verification evidence appropriate to the diff.
5. Create a narrow intentional commit on the intended branch only.
6. Before pushing, recheck status, diff, commits, and destination. Push only with explicit authorization.
7. Do not force-push, merge, tag, release, deploy, or mutate repository settings unless each action is explicitly authorized.
8. Report branch/base, changed scope, verification, commit, and any action intentionally not taken.
