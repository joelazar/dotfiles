import {
  completeSimple,
  type Api,
  type Model,
  type UserMessage,
} from "@mariozechner/pi-ai";
import { BorderedLoader } from "@mariozechner/pi-coding-agent";
import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";

const commitStyleInstructions = `**IMPORTANT**: Before creating commit messages:
1. Examine the recent commits to understand the commit message style and conventions used in this repository
2. Follow the EXACT same format, emoji usage, capitalization, and structure as the recent commits
3. Use appropriate gitmoji or emoji prefix if the repository uses them (e.g., :sparkles:, :wrench:, :bug:, :fire:, :recycle:)
4. If the changes are non-trivial (e.g., multiple files changed, complex logic changes, refactors, or anything that benefits from explanation), include a commit body separated by a blank line from the subject. The body should briefly explain **what** changed and **why**.
5. **Commit body readability**: Wrap body lines at ~72 characters. Structure the body with bullet points (- or *) — one per logical change or noteworthy detail. Avoid prose paragraphs; prefer a scannable list. Keep it concise — a few bullets is ideal, not a wall of text.`;

const COMMIT_MESSAGE_SYSTEM_PROMPT = `You are a git commit message generator.

Output ONLY the raw commit message text. No markdown formatting, no code fences, no preamble, no explanation.

Follow the repository's existing commit style from recent commits.

${commitStyleInstructions}`;

const HAIKU_MODEL_ID = "claude-haiku-4-5";
const GEMINI_FLASH_MODEL_ID = "gemini-3-flash-preview";

const MODEL_CANDIDATES: Array<{ provider: string; modelId: string }> = [
  { provider: "anthropic", modelId: HAIKU_MODEL_ID },
  { provider: "google-gemini-cli", modelId: GEMINI_FLASH_MODEL_ID },
];

type GitExecResult = { stdout: string; stderr: string; code: number };

async function runGit(
  pi: ExtensionAPI,
  args: string[],
  signal?: AbortSignal,
): Promise<GitExecResult> {
  return pi.exec("git", args, { signal, timeout: 15000 });
}

function report(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  message: string,
  level: "info" | "error" = "info",
) {
  if (ctx.hasUI) {
    ctx.ui.notify(message, level);
    return;
  }

  pi.sendUserMessage(message);
}

async function ensureGitRepo(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
): Promise<boolean> {
  const check = await runGit(pi, ["rev-parse", "--is-inside-work-tree"]);
  if (check.code !== 0 || check.stdout.trim() !== "true") {
    report(pi, ctx, "Not in a git repository", "error");
    return false;
  }

  return true;
}

async function getGitContext(pi: ExtensionAPI) {
  const [status, diff, branch, log] = await Promise.all([
    runGit(pi, ["status"]),
    runGit(pi, ["diff", "HEAD"]),
    runGit(pi, ["branch", "--show-current"]),
    runGit(pi, ["log", "--pretty=format:%s", "-20"]),
  ]);

  return { status, diff, branch, log };
}

function buildCommitUserMessage(
  context: {
    status: string;
    diff: string;
    branch: string;
    log: string;
  },
  additionalInstructions: string,
): string {
  let message = `## Context

`;
  message += `- Current git status:\n\`\`\`\n${context.status.trim()}\n\`\`\`\n\n`;
  message += `- Current git diff (staged and unstaged changes):\n\`\`\`\n${context.diff.trim()}\n\`\`\`\n\n`;
  message += `- Current branch: ${context.branch.trim()}\n\n`;
  message += `- Recent commits for style reference:\n\`\`\`\n${context.log.trim()}\n\`\`\``;

  if (additionalInstructions.trim()) {
    message += `\n\n## Additional instructions\n${additionalInstructions.trim()}`;
  }

  message +=
    "\n\n## Your task\nBased on the above changes, create a single git commit message.";

  return message;
}

function extractText(
  content: ReadonlyArray<{ type: string; text?: string }>,
): string {
  return content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text)
    .join("\n")
    .trim();
}

async function selectCommitModel(
  ctx: ExtensionContext,
): Promise<Model<Api> | null> {
  if (!ctx.model) {
    return null;
  }

  for (const candidate of MODEL_CANDIDATES) {
    const model = ctx.modelRegistry.find(candidate.provider, candidate.modelId);
    if (!model) {
      continue;
    }

    const apiKey = await ctx.modelRegistry.getApiKey(model);
    if (apiKey) {
      return model;
    }
  }

  return ctx.model;
}

async function generateCommitMessage(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  model: Model<Api>,
  userMessageText: string,
): Promise<string | null> {
  const apiKey = await ctx.modelRegistry.getApiKey(model);

  const userMessage: UserMessage = {
    role: "user",
    content: [{ type: "text", text: userMessageText }],
    timestamp: Date.now(),
  };

  if (!ctx.hasUI) {
    const response = await completeSimple(
      model,
      {
        systemPrompt: COMMIT_MESSAGE_SYSTEM_PROMPT,
        messages: [userMessage],
      },
      { apiKey, reasoning: "medium" },
    );

    if (response.stopReason === "aborted") {
      return null;
    }

    const text = extractText(response.content);
    return text || null;
  }

  return ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
    const loader = new BorderedLoader(
      tui,
      theme,
      `Generating commit message using ${model.id}...`,
    );

    loader.onAbort = () => done(null);

    const doGenerate = async () => {
      const response = await completeSimple(
        model,
        {
          systemPrompt: COMMIT_MESSAGE_SYSTEM_PROMPT,
          messages: [userMessage],
        },
        {
          apiKey,
          signal: loader.signal,
          reasoning: "medium",
        },
      );

      if (response.stopReason === "aborted") {
        return null;
      }

      const text = extractText(response.content);
      return text || null;
    };

    doGenerate()
      .then(done)
      .catch((err) => {
        report(
          pi,
          ctx,
          `Generation failed: ${err instanceof Error ? err.message : String(err)}`,
          "error",
        );
        done(null);
      });

    return loader;
  });
}

function buildCommitArgs(commitMessage: string): string[] {
  const normalized = commitMessage.replace(/\r\n/g, "\n").trim();
  const lines = normalized.split("\n");
  const subject = (lines[0] || "").trim();
  const body = lines.slice(1).join("\n").trim();

  const args = ["commit", "-m", subject];
  if (body) {
    args.push("-m", body);
  }

  return args;
}

async function doCommit(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  additionalInstructions: string,
) {
  if (!(await ensureGitRepo(pi, ctx))) {
    return;
  }

  const [statusResult, diffResult, branchResult, logResult, porcelainResult] =
    await Promise.all([
      runGit(pi, ["status"]),
      runGit(pi, ["diff", "HEAD"]),
      runGit(pi, ["branch", "--show-current"]),
      runGit(pi, ["log", "--pretty=format:%s", "-20"]),
      runGit(pi, ["status", "--porcelain"]),
    ]);

  if (
    statusResult.code !== 0 ||
    diffResult.code !== 0 ||
    branchResult.code !== 0 ||
    logResult.code !== 0 ||
    porcelainResult.code !== 0
  ) {
    report(pi, ctx, "Failed to gather git context", "error");
    return;
  }

  if (!porcelainResult.stdout.trim()) {
    report(pi, ctx, "No changes to commit", "info");
    return;
  }

  const model = await selectCommitModel(ctx);
  if (!model) {
    report(pi, ctx, "No model selected", "error");
    return;
  }

  const commitMessage = await generateCommitMessage(
    pi,
    ctx,
    model,
    buildCommitUserMessage(
      {
        status: statusResult.stdout,
        diff: diffResult.stdout,
        branch: branchResult.stdout,
        log: logResult.stdout,
      },
      additionalInstructions,
    ),
  );

  if (!commitMessage) {
    report(pi, ctx, "Cancelled", "info");
    return;
  }

  const addResult = await runGit(pi, ["add", "-A"]);
  if (addResult.code !== 0) {
    report(
      pi,
      ctx,
      `git add failed: ${addResult.stderr || addResult.stdout}`,
      "error",
    );
    return;
  }

  const commitArgs = buildCommitArgs(commitMessage);
  if (commitArgs[2] === "") {
    report(pi, ctx, "Generated empty commit message", "error");
    return;
  }

  const commitResult = await runGit(pi, commitArgs);
  if (commitResult.code !== 0) {
    report(
      pi,
      ctx,
      `git commit failed: ${commitResult.stderr || commitResult.stdout}`,
      "error",
    );
    return;
  }

  const firstLine = commitResult.stdout.split("\n")[0] || "";
  const match = firstLine.match(/^\[(\S+)\s+([a-f0-9]+)\]\s+(.*)$/);
  const summary = match
    ? `✓ ${match[1]} ${match[2]} — ${match[3]}`
    : firstLine || "Committed!";

  report(pi, ctx, summary, "info");
}

async function doAtomicCommit(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  additionalInstructions: string,
) {
  if (!(await ensureGitRepo(pi, ctx))) {
    return;
  }

  const { status, diff, branch, log } = await getGitContext(pi);
  if (
    status.code !== 0 ||
    diff.code !== 0 ||
    branch.code !== 0 ||
    log.code !== 0
  ) {
    report(pi, ctx, "Failed to gather git context", "error");
    return;
  }

  const currentBranch = branch.stdout.trim();
  const hasUncommittedChanges = diff.stdout.trim().length > 0;
  const additionalSection = additionalInstructions.trim()
    ? `\n\n## Additional instructions\n${additionalInstructions.trim()}`
    : "";

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

${commitStyleInstructions}${additionalSection}

Do not use any other tools or do anything else besides staging and committing. Do not send any other text or messages besides these tool calls.`;

    pi.sendUserMessage(prompt);
  } else {
    // Mode 2: Restructure existing branch commits into atomic commits
    // Find the base branch (main or master)
    const mainCheck = await runGit(pi, ["rev-parse", "--verify", "main"]);
    const masterCheck = await runGit(pi, ["rev-parse", "--verify", "master"]);
    const baseBranch =
      mainCheck.code === 0 ? "main" : masterCheck.code === 0 ? "master" : null;

    if (!baseBranch) {
      report(
        pi,
        ctx,
        "Could not find a base branch (main or master). Cannot restructure commits.",
        "error",
      );
      return;
    }

    if (currentBranch === baseBranch) {
      report(
        pi,
        ctx,
        "You are on the base branch. Switch to a feature/dev branch first to restructure commits.",
        "error",
      );
      return;
    }

    // Get the commits on this branch vs base
    const branchCommits = await runGit(pi, [
      "log",
      `${baseBranch}..HEAD`,
      "--pretty=format:%H %s",
    ]);

    if (!branchCommits.stdout.trim()) {
      report(
        pi,
        ctx,
        `No commits found on \`${currentBranch}\` ahead of \`${baseBranch}\`. Nothing to restructure.`,
        "info",
      );
      return;
    }

    // Get the full diff of all branch changes
    const branchDiff = await runGit(pi, ["diff", `${baseBranch}...HEAD`]);

    // Get individual commit diffs for context
    const commitLog = await runGit(pi, [
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

${commitStyleInstructions}${additionalSection}

Do not use any other tools or do anything else besides resetting, staging and committing. Do not send any other text or messages besides these tool calls.`;

    pi.sendUserMessage(prompt);
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("commit", {
    description: "Create a git commit",
    handler: async (args, ctx) => {
      await doCommit(pi, ctx, args);
    },
  });

  pi.registerCommand("atomic-commit", {
    description: "Create atomic commits (split changes or restructure branch)",
    handler: async (args, ctx) => {
      await doAtomicCommit(pi, ctx, args);
    },
  });

  pi.registerShortcut("ctrl+shift+c", {
    description: "Create a git commit",
    handler: async (ctx) => {
      await doCommit(pi, ctx, "");
    },
  });

  pi.registerShortcut("ctrl+shift+a", {
    description: "Create atomic commits",
    handler: async (ctx) => {
      await doAtomicCommit(pi, ctx, "");
    },
  });
}
