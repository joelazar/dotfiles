---
description: Clean up code comments added or changed on the current branch
argument-hint: "[base-ref]"
---
Clean up the code comments this branch adds or changes. Keep the comments a future reader (human or agent) needs, rewrite them plainly, and delete the rest. Edit comments only; code behaviour stays identical.

## Scope

0. Read the project's AGENTS.md or CONTRIBUTING for comment conventions. Where they differ from this prompt, follow them.
1. Base: the merge-base of `HEAD` and `origin/HEAD` (fall back to `main` or `master`) (or `$ARGUMENTS` if given).
2. Files: `git diff --name-only <base>...HEAD` plus uncommitted changes. Skip generated, vendored, and lock files.
3. Comments in scope: every comment on a line the branch added or changed, including docstrings. Read the surrounding function to judge each one.

## Keep (then rewrite)

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

Leave a clear, accurate comment byte-for-byte unchanged. Rewrite only comments that are stale, unclear, or read like AI output, using the humanizer skill in embedded mode: plain, specific, present tense, describing the code as it is now.

A rewrite keeps every claim of the original, including a contrast between two plausible outcomes ("unknown, not unauthorised"). Check any fact you add or correct against the code first. Re-wrap a rewritten block to the width of the comments around it.

## Delete

- Comments that restate the code, or doc comments that only expand the identifier name.
- History: "added", "changed", "fixed", "new", "now uses", "previously". Git holds history.
- Commented-out code.
- Banners and dividers that label obvious sections.
- Comments the code contradicts. If the stale comment hid a real why, rewrite it to match the code; otherwise delete it.
- TODOs with no condition or owner.

## Finish

1. Every in-scope comment is classified keep, rewrite, or delete.
2. `git diff` shows comment-only changes. Run the project's formatter or linter if one exists.
3. Report: counts (kept / rewritten / deleted) and up to 5 notable rewrites as before → after. List every comment whose claims changed (fact added, corrected, or dropped) with `file:line`. List any spot where you found missing context the code needs but could not infer; leave those for me.
