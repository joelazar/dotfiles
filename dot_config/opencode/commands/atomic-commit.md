---
description: Split uncommitted changes into atomic commits in the repo's style
---
<!-- Ported from pi-extensions/extensions/commit. Regenerate from there if it changes. -->

## Context

- Status:
!`git status --short`

- Diff stat (staged and unstaged):
!`git diff HEAD --stat`

- Diff (staged and unstaged):
!`git diff HEAD`

- Branch: !`git branch --show-current`

- Recent commit subjects for style reference (casing, tense, prefix/gitmoji usage):
!`git log -20 --format=%s`

## Your task: create atomic commits

Split the changes above into multiple **atomic commits**. Each one:
- Contains exactly ONE logical change (one feature, fix, refactor, config change)
- Is self-contained and doesn't break the build on its own
- Is ordered logically (infrastructure/config first, then features, then cleanup)

Workflow:
1. Identify the distinct logical changes. Untracked files are in the status above; read them directly.
2. For each change in order: stage ONLY its files with `git add <files>` (use `git add -p` with stdin answers when one file mixes changes), then `git commit -F -` with the message on stdin.
3. Repeat until `git status --short` is clean of the changes you meant to commit.

Never pass `--no-verify`. Do nothing besides staging and committing. Finish with `git log --oneline -<n>` for the commits you made.

**IMPORTANT**: Before creating commit messages:
1. Examine the recent commit subjects to understand the repository's subject *format*: gitmoji vs conventional commits vs plain, capitalization, tense, prefix/scope style, subject length.
2. Match that format exactly — if the repo never uses gitmoji, do not introduce it; if it always uses `type(scope):`, use it — but DO NOT just copy the most-frequent gitmoji. Pick the gitmoji that genuinely fits THIS change. The recent log is for *style*, not for emoji selection.
3. **Gitmoji selection** (only if the repo uses gitmoji). Pick the single best fit for the dominant change:
   - :sparkles: new feature / new file added for a feature
   - :bug: bug fix
   - :recycle: refactor (no behavior change)
   - :art: code structure / formatting / readability
   - :zap: performance
   - :fire: remove code or files
   - :truck: move / rename files
   - :memo: docs (README, comments, markdown)
   - :lipstick: UI / styling / theme
   - :wrench: configuration files (settings, configs, dotfiles tweaks)
   - :hammer: dev scripts / tooling
   - :arrow_up: dependency upgrades
   - :heavy_plus_sign: add a dependency
   - :heavy_minus_sign: remove a dependency
   - :lock: security
   - :rotating_light: lint/warning fixes
   - :white_check_mark: tests
   - :construction: WIP
   - :rewind: revert
   - :tada: initial commit / project setup
   Default to :wrench: ONLY for genuine config tweaks. For everything else, pick the matching emoji above.
4. **Subject — name the concrete change, not the file**:
   - Say WHAT changed (the thing added/removed/renamed/fixed), not just "update config" or "tweak settings". `add git-standup and orion cask` beats `update brewfile`; `enable claude-fable-5 model` beats `update enabled models configuration`.
   - Lowercase, imperative, ~50 chars, one change.
   - **Avoid "and" in the subject.** Needing "and" to fit two things in means the diff has more than one logical change — either pick the dominant one for the subject and put the rest in the body, or (better) suggest the user run `atomic-commit` instead. Never cram two unrelated changes into one subject.
5. **Body — include by default for multi-change commits**:
   - A body IS required when: the diff touches 2+ files for distinct concerns, OR contains 2+ logical changes, OR a teammate reading just the subject still wouldn't know what actually changed.
   - A body is optional only for: a single logical change obvious from the subject (one-file rename, one version bump, one one-line fix, one config toggle).
   - **When in doubt, include the body.** A short, accurate body is always better than a vague subject with no detail. Do not omit just because the files are "only configs" — distinct config changes are exactly when a body helps.
6. **Body format**: wrap at ~72 chars, use `-` bullets, one per logical change. Name the concrete delta on each line (what was added/removed/changed, ideally with the file or scope), not "update X". Max 3-5 bullets; if there are more, group related ones. No prose paragraphs, no wall of text.

**Writing style for commit messages — keep it human and concise:**
- Write like a human developer, not a press release. Be direct and specific.
- Avoid AI-isms: don't use words like "enhance", "leverage", "crucial", "streamline", "comprehensive", "robust", "utilize", "facilitate", "foster", "delve", "landscape", "tapestry", "testament", "underscore", "pivotal", "garner", "showcase".
- Don't inflate importance. "Fix null check in parser" beats "Address critical issue in parsing infrastructure".
- No promotional tone, no vague superlatives ("significant improvement", "major enhancement").
- No rule-of-three padding. Don't force three items when one or two suffice.
- No negative parallelisms ("not just X, but Y").
- No filler phrases ("in order to", "it is important to note").
- Keep the subject line short (~50 chars). If a body is needed, use terse bullet points, not prose paragraphs.
- Prefer simple verbs: "fix", "add", "remove", "update", "rename", "move", "split", "drop" over fancy synonyms.

## Additional instructions

$ARGUMENTS
