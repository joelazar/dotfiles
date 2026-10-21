---
description: Rework every code comment across the whole codebase
argument-hint: "[path]"
---
Rework every code comment across `${1:-the whole repository}`. Keep the comments a future reader (human or agent) needs, rewrite each one that misses the bar below, and delete the rest. Edit comments only; code behaviour stays identical.

## Scope

0. Read the project's AGENTS.md or CONTRIBUTING for comment conventions. Where they differ from this prompt, follow them.
1. Check `git status`. If the tree is dirty, stop and ask me to commit or stash first, so this cleanup stays its own diff.
2. Files: `git ls-files ${1:-.}`. Skip generated, vendored, lock, and fixture files.
3. Work one top-level directory at a time. Finish a directory before starting the next, and keep a running list of which ones are done.

## Keep

A comment earns its place when it carries what the code cannot show:

- **Why**: the reason for a non-obvious choice, the alternative that was tried and failed, the bug or ticket it works around (keep links).
- **Invariant or contract**: units, ranges, nullability, ordering, thread-safety, ownership, what callers may rely on.
- **Gotcha or checklist**: "if you change X, also update Y", ordering that matters, a trap the next editor will step in.
- **Boundary**: what this module is responsible for, so new logic lands in the right layer.
- **Domain knowledge**: a protocol rule, spec section, or formula the reader needs to follow the code.
- **Test intent**: the requirement a test case guards and why it matters to the system.
- **Definitions**: a doc comment that pins down a term beyond its name ("delivered means acked").
- **Debt with a condition**: `TODO`/`shortcut:` that names the limit and when to fix it.
- **Tool directives**: `eslint-disable`, `noqa`, `//go:build`, `# shellcheck`, type-ignore, license headers. Leave these exactly as they are.

## Rewrite

Read every kept comment against the code it sits on and hold it to the bar. A comment that misses any point gets rewritten with the humanizer skill in embedded mode:

- **Accurate**: matches the code as it is now. Check every fact against the code.
- **Point first**: the first clause carries the fact or the reason.
- **Plain**: literal words, no figurative phrases ("load-bearing", "permanent home of"), no humanizer tells.
- **Tight**: the shortest wording that keeps every claim; one line where one line holds it.
- **Present tense**: describes what the code does, in the language's doc-comment convention.

You may merge adjacent comments that make one point, and move a comment onto the line it explains.

A rewrite keeps every claim of the original, including a contrast between two plausible outcomes ("unknown, not unauthorised"). Re-wrap a rewritten block to the width of the comments around it.

## Delete

- Comments that restate the code, or doc comments that only expand the identifier name.
- History: "added", "changed", "fixed", "new", "now uses", "previously". Git holds history.
- Commented-out code.
- Banners and dividers that label obvious sections.
- Comments the code contradicts. If the stale comment hid a real why, rewrite it to match the code; otherwise delete it.
- TODOs with no condition or owner.

## Finish

1. Every directory in scope is marked done, and every comment in it is classified keep, rewrite, or delete.
2. `git diff` shows comment-only changes. Run the project's formatter or linter if one exists.
3. Report: counts per directory (kept / rewritten / deleted) and up to 5 notable rewrites as before → after. List every comment whose claims changed (fact added, corrected, or dropped) with `file:line`. List any spot where you found missing context the code needs but could not infer; leave those for me.
