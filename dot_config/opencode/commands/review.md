---
description: "Review changes. Args: (empty)=uncommitted, branch <base>, commit <sha>, pr <n>, folder <paths>"
agent: reviewer
---
Review target: `$ARGUMENTS`

Interpret it:
- empty or `uncommitted`: staged, unstaged and untracked changes against HEAD
- `branch <base>`: `git diff $(git merge-base HEAD <base>)`
- `commit <sha>`: `git show <sha>`
- `pr <number|url>`: `gh pr view` for title, body and comments (PR context, not spec beyond its description), `gh pr diff` for the change
- `folder <paths...>`: snapshot review, read every file, no diff
- anything after `--extra` is an additional instruction for this review

Validate the target first: the ref must resolve and the diff must be non-empty (folder paths must exist). If it fails, stop with one line saying why.

Current state for orientation:
- Branch: !`git branch --show-current`
- Status: !`git status --short`

Follow your review guidelines and output format exactly.
