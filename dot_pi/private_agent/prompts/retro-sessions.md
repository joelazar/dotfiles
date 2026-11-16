---
description: Retro on recent agent sessions; propose fixes to the repo's agent environment
argument-hint: "[focus, default: navigation and stale docs]"
---
Focus: $ARGUMENTS
If empty: read my last 20 coding agent sessions in this repo and find ways to make it easier to navigate. Find where agents took too long to find relevant information, or relied on out-of-date docs.

Sessions for this repo live in `~/.pi/agent/sessions/--<cwd without the leading /, other / replaced by ->--/`. Pick the newest 20, skipping the current one. They are JSONL; read them with `jq`/`rg`, do not dump whole files.

For each session, find the struggles: long search chains before the right file, reads of docs that turned out wrong or stale, repeated mistakes, expensive tool calls, information the agent could not reach.

Propose fixes to the environment, not the code. Pick the cheapest fitting one:

- Slow to find a file or fact: a navigation pointer from a file the agent already reads.
- Stale or wrong doc: fix or delete it. Name the doc and what is wrong.
- Mechanical mistake: an automated check (lint, test, hook, CI). If one exists but is not wired up, say that.
- Judgement-call mistake: a rule for the reviewer, not AGENTS.md/CLAUDE.md.
- Lines in AGENTS.md/CLAUDE.md that change nothing: propose deleting them.

Every candidate must cite the session file and the moment it came from. Drop anything you cannot trace. No generic advice.

Report candidates most severe first: the problem, the evidence, the fix, the file to change. Change nothing until I pick one.
