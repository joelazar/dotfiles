/**
 * Custom commands converted from Claude Code commands
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  // Address PR comments
  pi.registerCommand("address-comments", {
    description: "Get GitHub PR and address all non-resolved comments",
    handler: async (_args, ctx) => {
      pi.sendUserMessage(
        `Get the GitHub pull request of the actual branch and address all non-resolved comments on the pull request.

After this, wait for my confirmation, and if I confirm, commit and push the changes.`,
      );
    },
  });

  // Catchup - read changed code
  pi.registerCommand("catchup", {
    description:
      "Read all changed code in current branch compared to default branch",
    handler: async (_args, ctx) => {
      pi.sendUserMessage(
        `Read all changed code in the current branch compared to default branch.`,
      );
    },
  });

  // Double-check work
  pi.registerCommand("double-check", {
    description: "Double-check recent work and look for edge cases",
    handler: async (_args, ctx) => {
      pi.sendUserMessage(
        `Can you double-check the work you just did and look for edge cases?`,
      );
    },
  });

  // Explain codebase
  pi.registerCommand("explain-codebase", {
    description: "Scan and explain the whole codebase",
    handler: async (_args, ctx) => {
      pi.sendUserMessage(
        `Scan the whole codebase and explain it to me in an easy way that allows me to understand how it functions and how everything is connected.`,
      );
    },
  });

  // Search web
  pi.registerCommand("search-web", {
    description: "Search the web for given query",
    handler: async (args, ctx) => {
      if (!args || args.trim() === "") {
        ctx.ui.notify("Usage: /search-web <query>", "error");
        return;
      }
      pi.sendUserMessage(
        `Search the web for this: ${args} and get the most relevant information that answers my queries.`,
      );
    },
  });

  // Clean gone branches
  pi.registerCommand("clean-gone", {
    description: "Clean up git branches marked as [gone] (deleted on remote)",
    handler: async (_args, ctx) => {
      pi.sendUserMessage(
        `## Your Task

You need to execute the following bash commands to clean up stale local branches that have been deleted from the remote repository.

## Commands to Execute

1. **First, list branches to identify any with [gone] status**
   Execute this command:
   \`\`\`bash
   git branch -v
   \`\`\`

   Note: Branches with a '+' prefix have associated worktrees and must have their worktrees removed before deletion.

2. **Next, identify worktrees that need to be removed for [gone] branches**
   Execute this command:
   \`\`\`bash
   git worktree list
   \`\`\`

3. **Finally, remove worktrees and delete [gone] branches (handles both regular and worktree branches)**
   Execute this command:
   \`\`\`bash
   # Process all [gone] branches, removing '+' prefix if present
   git branch -v | grep '\\[gone\\]' | sed 's/^[+* ]//' | awk '{print $1}' | while read branch; do
     echo "Processing branch: $branch"
     # Find and remove worktree if it exists
     worktree=$(git worktree list | grep "\\\\[$branch\\\\]" | awk '{print $1}')
     if [ ! -z "$worktree" ] && [ "$worktree" != "$(git rev-parse --show-toplevel)" ]; then
       echo "  Removing worktree: $worktree"
       git worktree remove --force "$worktree"
     fi
     # Delete the branch
     echo "  Deleting branch: $branch"
     git branch -D "$branch"
   done
   \`\`\`

## Expected Behavior

After executing these commands, you will:

- See a list of all local branches with their status
- Identify and remove any worktrees associated with [gone] branches
- Delete all branches marked as [gone]
- Provide feedback on which worktrees and branches were removed

If no branches are marked as [gone], report that no cleanup was needed.`,
      );
    },
  });

  // Commit, push, and create PR
  pi.registerCommand("commit-push-pr", {
    description: "Commit, push, and open a PR",
    handler: async (_args, ctx) => {
      pi.sendUserMessage(
        `## Context

- Current git status: \`git status\`
- Current git diff (staged and unstaged changes): \`git diff HEAD\`
- Current branch: \`git branch --show-current\`

## Your task

Based on the above changes:

1. Create a new branch if on main
2. Create a single commit with an appropriate message
3. Push the branch to origin
4. Create a pull request using \`gh pr create\`
5. You have the capability to call multiple tools in a single response. You MUST do all of the above in a single message. Do not use any other tools or do anything else. Do not send any other text or messages besides these tool calls.`,
      );
    },
  });

  // Commit
  pi.registerCommand("commit", {
    description: "Create a git commit",
    handler: async (_args, ctx) => {
      pi.sendUserMessage(
        `## Context

- Current git status: \`git status\`
- Current git diff (staged and unstaged changes): \`git diff HEAD\`
- Current branch: \`git branch --show-current\`
- Recent commits: \`git log --oneline -10\`

## Your task

Based on the above changes, create a single git commit.

You have the capability to call multiple tools in a single response. Stage and create the commit using a single message. Do not use any other tools or do anything else. Do not send any other text or messages besides these tool calls.`,
      );
    },
  });

  // Code review
  pi.registerCommand("code-review", {
    description: "Code review a pull request",
    handler: async (args, ctx) => {
      const prArg = args?.trim() ? ` for PR ${args.trim()}` : "";
      pi.sendUserMessage(
        `Provide a code review${prArg}.

To do this, follow these steps precisely:

1. Check if the pull request (a) is closed, (b) is a draft, (c) does not need a code review (eg. because it is an automated pull request, or is very simple and obviously ok), or (d) already has a code review from you from earlier. If so, do not proceed.
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
6. Filter out any issues with a score less than 80. If there are no issues that meet this criteria, do not proceed.
7. Repeat the eligibility check from #1, to make sure that the pull request is still eligible for code review.
8. Finally, use the gh bash command to comment back on the pull request with the result. When writing your comment, keep in mind to:
   a. Keep your output brief
   b. Avoid emojis
   c. Link and cite relevant code, files, and URLs

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
- Use \`gh\` to interact with Github (eg. to fetch a pull request, or to create inline comments), rather than web fetch
- Make a todo list first
- You must cite and link each bug (eg. if referring to an AGENTS.md, you must link it)
- For your final comment, follow the following format precisely (assuming for this example that you found 3 issues):

---

### Code review

Found 3 issues:

1. <brief description of bug> (AGENTS.md says "<...>")

<link to file and line with full sha1 + line range for context, note that you MUST provide the full sha and not use bash here, eg. https://github.com/owner/repo/blob/1d54823877c4de72b2316a64032a54afc404e619/README.md#L13-L17>

2. <brief description of bug> (some/other/AGENTS.md says "<...>")

<link to file and line with full sha1 + line range for context>

3. <brief description of bug> (bug due to <file and code snippet>)

<link to file and line with full sha1 + line range for context>

---

- Or, if you found no issues:

---

### Code review

No issues found. Checked for bugs and AGENTS.md compliance.

---

- When linking to code, follow the following format precisely, otherwise the Markdown preview won't render correctly: https://github.com/owner/repo/blob/c21d3c10bc8e898b7ac1a2d745bdc9bc4e423afe/package.json#L10-L15
  - Requires full git sha
  - You must provide the full sha. Commands like \`https://github.com/owner/repo/blob/$(git rev-parse HEAD)/foo/bar\` will not work, since your comment will be directly rendered in Markdown.
  - Repo name must match the repo you're code reviewing
  - # sign after the file name
  - Line range format is L[start]-L[end]
  - Provide at least 1 line of context before and after, centered on the line you are commenting about (eg. if you are commenting about lines 5-6, you should link to \`L4-7\`)`,
      );
    },
  });
}
