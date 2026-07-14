---
name: simplify
description: Use when the user wants recently modified code simplified without changing behavior. Apply the repository's current standards, improve clarity, remove unnecessary complexity, and keep the work scoped to code touched in the current session unless the user asks for a broader pass.
---

# Simplify

Use this skill to refine recently changed code without expanding scope.

Default rules:

- work on code touched in the current task
- preserve behavior exactly
- prefer readability over shorter code
- follow the active `AGENTS.md` and local conventions

Priorities:

1. Remove unnecessary branching, nesting, abstraction, and duplication.
2. Prefer explicit names and straightforward control flow.
3. Consolidate related logic when that makes the code easier to read.
4. Remove comments that restate the code.
5. Avoid dense one-liners and nested ternaries.

Process:

1. Identify the changed files or hunks.
2. Read enough surrounding code to understand the local pattern.
3. Make the smallest forward-only change that improves clarity.
4. Re-run relevant validation after edits.
5. Summarize only meaningful simplifications.

Do not widen the pass into untouched areas unless the user asks for it.
