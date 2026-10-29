---
description: Analyze commits for important bugs and check they still exist at HEAD
argument-hint: "<commit-range or commits...>"
---
Commits to analyze: $ARGUMENTS

If that is a range (e.g. `main..HEAD`, `HEAD~10..`), expand it with `git rev-list --reverse`. If empty, use the commits on the current branch not on the default branch.

For each commit c, one at a time:

1. Analyze c (`git show c`) for important bugs: logic errors, data loss, security holes, crashes, broken callers. Skip style nits.
2. For each bug found, validate that it still exists at HEAD: read the current code, not the diff. Drop bugs already fixed later.

Report only bugs that still exist at HEAD, grouped by commit: short sha, `file:line` at HEAD, the bug in one sentence, why it matters, and the fix. End with commits that had no surviving bugs, as one line.
