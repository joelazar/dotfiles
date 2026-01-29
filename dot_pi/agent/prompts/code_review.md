---
description: Run a code review sub-agent
---
Spawn yourself as a sub-agent via bash to do a code review: $@

Use `pi --print` with appropriate arguments. If the user specifies a model,
use `--provider` and `--model` accordingly.

Pass the following prompt to the sub-agent:

---

Provide a code review.

To do this, follow these steps precisely:

1. Check if the pull request (a) is closed, (b) is a draft, (c) does not need a code review (eg. because it is an automated pull request, or is very simple and obviously ok). If so, do not proceed.
2. Get a list of file paths to (but not the contents of) any relevant AGENTS.md or CLAUDE.md files from the codebase: the root file (if one exists), as well as any such files in the directories whose files the pull request modified
3. View the pull request and create a summary of the change
4. Then, independently code review the change focusing on these areas, returning a list of issues and the reason each issue was flagged (eg. AGENTS.md adherence, bug, historical git context, etc.):
   a. Audit the changes to make sure they comply with the AGENTS.md/CLAUDE.md. Note that these files are guidance for AI as it writes code, so not all instructions will be applicable during code review.
   b. Read the file changes in the pull request, then do a shallow scan for obvious bugs. Avoid reading extra context beyond the changes, focusing just on the changes themselves. Focus on large bugs, and avoid small issues and nitpicks. Ignore likely false positives.
   c. Read the git blame and history of the code modified, to identify any bugs in light of that historical context
   d. Read previous pull requests that touched these files, and check for any comments on those pull requests that may also apply to the current pull request.
   e. Read code comments in the modified files, and make sure the changes in the pull request comply with any guidance in the comments.
5. For each issue found, score it on a scale from 0-100, indicating level of confidence:
   a. 0: Not confident at all. This is a false positive that doesn't stand up to light scrutiny, or is a pre-existing issue.
   b. 25: Somewhat confident. This might be a real issue, but may also be a false positive. Unable to verify that it's a real issue. If the issue is stylistic, it is one that was not explicitly called out in the relevant AGENTS.md/CLAUDE.md.
   c. 50: Moderately confident. Verified this is a real issue, but it might be a nitpick or not happen very often in practice. Relative to the rest of the PR, it's not very important.
   d. 75: Highly confident. Double checked the issue, and verified that it is very likely a real issue that will be hit in practice. The existing approach in the PR is insufficient. The issue is very important and will directly impact the code's functionality, or it is an issue that is directly mentioned in the relevant AGENTS.md/CLAUDE.md.
   e. 100: Absolutely certain. Double checked the issue, and confirmed that it is definitely a real issue, that will happen frequently in practice. The evidence directly confirms this.
6. Filter out any issues with a score less than 80. If there are no issues that meet this criteria, report that no significant issues were found.

Examples of false positives:

- Pre-existing issues
- Something that looks like a bug but is not actually a bug
- Pedantic nitpicks that a senior engineer wouldn't call out
- Issues that a linter, typechecker, or compiler would catch (eg. missing or incorrect imports, type errors, broken tests, formatting issues, pedantic style issues like newlines). No need to run these build steps yourself -- it is safe to assume that they will be run separately as part of CI.
- General code quality issues (eg. lack of test coverage, general security issues, poor documentation), unless explicitly required in AGENTS.md/CLAUDE.md
- Issues that are called out in AGENTS.md/CLAUDE.md, but explicitly silenced in the code (eg. due to a lint ignore comment)
- Changes in functionality that are likely intentional or are directly related to the broader change
- Real issues, but on lines that the user did not modify in their pull request

Notes:

- Do not check build signal or attempt to build or typecheck the app. These will run separately, and are not relevant to your code review.
- Use `gh` to interact with Github (eg. to fetch a pull request), rather than web fetch
- Make a todo list first
- You must cite and link each bug (eg. if referring to an AGENTS.md, you must link it)
- For your final output, follow the following format precisely (assuming for this example that you found 3 issues):

### Code review

Found 3 issues:

1. <brief description of bug> (AGENTS.md says "<...>")

<link to file and line with full sha1 + line range for context, eg. https://github.com/owner/repo/blob/1d54823877c4de72b2316a64032a54afc404e619/README.md#L13-L17>

2. <brief description of bug> (some/other/AGENTS.md says "<...>")

<link to file and line with full sha1 + line range for context>

3. <brief description of bug> (bug due to <file and code snippet>)

<link to file and line with full sha1 + line range for context>

- Or, if you found no issues:

### Code review

No issues found. Checked for bugs and AGENTS.md compliance.

- When linking to code, follow the following format precisely: https://github.com/owner/repo/blob/c21d3c10bc8e898b7ac1a2d745bdc9bc4e423afe/package.json#L10-L15
  - Requires full git sha
  - Repo name must match the repo you're code reviewing
  - # sign after the file name
  - Line range format is L[start]-L[end]
  - Provide at least 1 line of context before and after, centered on the line you are commenting about (eg. if you are commenting about lines 5-6, you should link to `L4-7`)

---

Do not read the code yourself. Let the sub-agent do that.

Report the sub-agent's findings.
