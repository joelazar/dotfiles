import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  const commitStyleInstructions = `**IMPORTANT**: Before creating commit messages:
1. Examine the recent commits to understand the commit message style and conventions used in this repository
2. Follow the EXACT same format, emoji usage, capitalization, and structure as the recent commits
3. Use appropriate gitmoji or emoji prefix if the repository uses them (e.g., :sparkles:, :wrench:, :bug:, :fire:, :recycle:)
4. If the changes are non-trivial (e.g., multiple files changed, complex logic changes, refactors, or anything that benefits from explanation), include a commit body separated by a blank line from the subject. The body should briefly explain **what** changed and **why**. Use \`git commit -m "subject" -m "body"\` for this. For simple, self-explanatory changes (typo fixes, single-line tweaks), a subject-only commit is fine.
5. **Commit body readability**: Wrap body lines at ~72 characters. Structure the body with bullet points (- or *) — one per logical change or noteworthy detail. Avoid prose paragraphs; prefer a scannable list. Keep it concise — a few bullets is ideal, not a wall of text.`;

  async function getGitContext() {
    const [status, diff, branch, log] = await Promise.all([
      pi.exec("git", ["status"]),
      pi.exec("git", ["diff", "HEAD"]),
      pi.exec("git", ["branch", "--show-current"]),
      pi.exec("git", ["log", "--pretty=format:%s", "-20"]),
    ]);
    return { status, diff, branch, log };
  }

  async function doCommit() {
    const { status, diff, branch, log } = await getGitContext();

    const prompt = `## Context

- Current git status:
\`\`\`
${status.stdout.trim()}
\`\`\`

- Current git diff (staged and unstaged changes):
\`\`\`
${diff.stdout.trim()}
\`\`\`

- Current branch: ${branch.stdout.trim()}

- Recent commits for style reference:
\`\`\`
${log.stdout.trim()}
\`\`\`

## Your task

Based on the above changes, create a single git commit.

${commitStyleInstructions}

You have the capability to call multiple tools in a single response. Stage and create the commit using a single message (or message + body). Do not use any other tools or do anything else. Do not send any other text or messages besides these tool calls.`;

    pi.sendUserMessage(prompt);
  }

  async function doAtomicCommit() {
    const { status, diff, branch, log } = await getGitContext();
    const currentBranch = branch.stdout.trim();
    const hasUncommittedChanges = diff.stdout.trim().length > 0;

    if (hasUncommittedChanges) {
      // Mode 1: Split uncommitted changes into multiple atomic commits
      const prompt = `## Context

- Current git status:
\`\`\`
${status.stdout.trim()}
\`\`\`

- Current git diff (staged and unstaged changes):
\`\`\`
${diff.stdout.trim()}
\`\`\`

- Current branch: ${currentBranch}

- Recent commits for style reference:
\`\`\`
${log.stdout.trim()}
\`\`\`

## Your task: Create atomic commits

Analyze the changes above and split them into multiple **atomic commits**. Each atomic commit should:
- Contain exactly ONE logical change (one feature, one fix, one refactor, one config change, etc.)
- Be self-contained and not break the build if applied independently
- Be ordered logically (infrastructure/config first, then features, then cleanup)

**Workflow:**
1. First, analyze the diff and identify the distinct logical changes
2. For each logical change, in order:
   a. Stage ONLY the files (or hunks with \`git add -p\` if needed) belonging to that logical change using \`git add\`
   b. Create the commit with an appropriate message
3. Repeat until all changes are committed

**Use \`git add -p\` (patch mode) when a single file contains changes belonging to different logical commits.** In that case, you'll need to use bash with stdin input to answer the interactive prompts (y/n/s for split, etc.). Alternatively, you can use \`git add --patch\` with specific hunks.

**Simpler approach when files cleanly separate:** If each file belongs to exactly one logical change, just use \`git add <file1> <file2>\` for each group.

${commitStyleInstructions}

Do not use any other tools or do anything else besides staging and committing. Do not send any other text or messages besides these tool calls.`;

      pi.sendUserMessage(prompt);
    } else {
      // Mode 2: Restructure existing branch commits into atomic commits
      // Find the base branch (main or master)
      const mainCheck = await pi.exec("git", ["rev-parse", "--verify", "main"]);
      const masterCheck = await pi.exec("git", ["rev-parse", "--verify", "master"]);
      const baseBranch = mainCheck.code === 0 ? "main" : masterCheck.code === 0 ? "master" : null;

      if (!baseBranch) {
        pi.sendUserMessage("Could not find a base branch (main or master). Cannot restructure commits.");
        return;
      }

      if (currentBranch === baseBranch) {
        pi.sendUserMessage("You are on the base branch. Switch to a feature/dev branch first to restructure its commits.");
        return;
      }

      // Get the commits on this branch vs base
      const branchCommits = await pi.exec("git", [
        "log",
        `${baseBranch}..HEAD`,
        "--pretty=format:%H %s",
      ]);

      if (!branchCommits.stdout.trim()) {
        pi.sendUserMessage(`No commits found on \`${currentBranch}\` ahead of \`${baseBranch}\`. Nothing to restructure.`);
        return;
      }

      // Get the full diff of all branch changes
      const branchDiff = await pi.exec("git", ["diff", `${baseBranch}...HEAD`]);

      // Get individual commit diffs for context
      const commitLog = await pi.exec("git", [
        "log",
        `${baseBranch}..HEAD`,
        "--pretty=format:--- COMMIT %H ---%nSubject: %s%nBody: %b",
        "-p",
      ]);

      const prompt = `## Context

- Current branch: ${currentBranch}
- Base branch: ${baseBranch}

- Commits on this branch (oldest first):
\`\`\`
${branchCommits.stdout.trim()}
\`\`\`

- Full diff of all branch changes vs ${baseBranch}:
\`\`\`
${branchDiff.stdout.trim()}
\`\`\`

- Detailed commit log with patches:
\`\`\`
${commitLog.stdout.trim()}
\`\`\`

- Recent commits on ${baseBranch} for style reference:
\`\`\`
${log.stdout.trim()}
\`\`\`

## Your task: Restructure into atomic commits

The existing commits on this branch need to be reorganized into clean, atomic commits. Each atomic commit should:
- Contain exactly ONE logical change (one feature, one fix, one refactor, one config change, etc.)
- Be self-contained and not break the build if applied independently
- Be ordered logically (infrastructure/config first, then features, then cleanup)

**Workflow:**
1. First, analyze ALL the changes across all commits and identify the distinct logical changes (these may differ from the current commits!)
2. Soft-reset all branch commits: \`git reset --soft ${baseBranch}\` — this unstages all changes but keeps them in the working tree as staged
3. Then unstage everything: \`git reset HEAD\`
4. For each logical change, in order:
   a. Stage ONLY the files (or hunks with \`git add -p\` if needed) belonging to that logical change
   b. Create the commit with an appropriate message
5. Repeat until all changes are committed

**Use \`git add -p\` (patch mode) when a single file contains changes belonging to different logical commits.** In that case, you'll need to use bash with stdin input to answer the interactive prompts (y/n/s for split, etc.). Alternatively, stage specific hunks or use line-level staging.

**Simpler approach when files cleanly separate:** If each file belongs to exactly one logical change, just use \`git add <file1> <file2>\` for each group.

${commitStyleInstructions}

Do not use any other tools or do anything else besides resetting, staging and committing. Do not send any other text or messages besides these tool calls.`;

      pi.sendUserMessage(prompt);
    }
  }

  pi.registerCommand("commit", {
    description: "Create a git commit",
    handler: async (_args, _ctx) => {
      await doCommit();
    },
  });

  pi.registerCommand("atomic-commit", {
    description: "Create atomic commits (split changes or restructure branch)",
    handler: async (_args, _ctx) => {
      await doAtomicCommit();
    },
  });

  pi.registerShortcut("ctrl+shift+c", {
    description: "Create a git commit",
    handler: async (_ctx) => {
      await doCommit();
    },
  });

  pi.registerShortcut("ctrl+shift+a", {
    description: "Create atomic commits",
    handler: async (_ctx) => {
      await doAtomicCommit();
    },
  });
}
