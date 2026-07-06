/**
 * Commit - AI-powered git commit message generator
 *
 * Generates commit messages that match the repository's existing style
 * and conventions. Examines recent commits for format, emoji usage, and structure.
 */
import {
  completeSimple,
  type Api,
  type Model,
  type UserMessage,
} from "@earendil-works/pi-ai/compat";
import { BorderedLoader } from "@earendil-works/pi-coding-agent";
import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

const commitStyleInstructions = `**IMPORTANT**: Before creating commit messages:
1. Examine the recent commits to understand the commit message *format* (gitmoji vs conventional commits, capitalization, tense, prefix style, line length).
2. Match that format — but DO NOT just copy the most-frequent gitmoji. Pick the gitmoji that genuinely fits THIS change. The recent log is for *style*, not for emoji selection.
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
   - Say WHAT changed (the thing added/removed/renamed/fixed), not just "update config" or "tweak settings". \`add git-standup and orion cask\` beats \`update brewfile\`; \`enable claude-fable-5 model\` beats \`update enabled models configuration\`.
   - Lowercase, imperative, ~50 chars, one change.
   - **Avoid "and" in the subject.** Needing "and" to fit two things in means the diff has more than one logical change — either pick the dominant one for the subject and put the rest in the body, or (better) suggest the user run \`atomic-commit\` instead. Never cram two unrelated changes into one subject.
5. **Body — include by default for multi-change commits**:
   - A body IS required when: the diff touches 2+ files for distinct concerns, OR contains 2+ logical changes, OR a teammate reading just the subject still wouldn't know what actually changed.
   - A body is optional only for: a single logical change obvious from the subject (one-file rename, one version bump, one one-line fix, one config toggle).
   - **When in doubt, include the body.** A short, accurate body is always better than a vague subject with no detail. Do not omit just because the files are "only configs" — distinct config changes are exactly when a body helps.
6. **Body format**: wrap at ~72 chars, use \`\-\` bullets, one per logical change. Name the concrete delta on each line (what was added/removed/changed, ideally with the file or scope), not "update X". Max 3-5 bullets; if there are more, group related ones. No prose paragraphs, no wall of text.`;

const COMMIT_MESSAGE_SYSTEM_PROMPT = `You are a git commit message generator.

Output ONLY the raw commit message text. No markdown formatting, no code fences, no preamble, no explanation.

Follow the repository's existing commit style from recent commits.

${commitStyleInstructions}

**Writing style for commit messages — keep it human and concise:**
- Write like a human developer, not a press release. Be direct and specific.
- Avoid AI-isms: don't use words like "enhance", "leverage", "crucial", "streamline", "comprehensive", "robust", "utilize", "facilitate", "foster", "delve", "landscape", "tapestry", "testament", "underscore", "pivotal", "garner", "showcase".
- Don't inflate importance. "Fix null check in parser" beats "Address critical issue in parsing infrastructure".
- No promotional tone, no vague superlatives ("significant improvement", "major enhancement").
- No rule-of-three padding. Don't force three items when one or two suffice.
- No negative parallelisms ("not just X, but Y").
- No filler phrases ("in order to", "it is important to note").
- Keep the subject line short (~50 chars). If a body is needed, use terse bullet points, not prose paragraphs.
- Prefer simple verbs: "fix", "add", "remove", "update", "rename", "move", "split", "drop" over fancy synonyms.`;

// Cap diff size sent to the model. Huge diffs (theme switches,
// generated files) make Haiku slower without improving the message.
const MAX_DIFF_CHARS = 60_000;

function truncateDiff(diff: string): { text: string; truncated: boolean } {
  if (diff.length <= MAX_DIFF_CHARS) return { text: diff, truncated: false };
  return { text: diff.slice(0, MAX_DIFF_CHARS), truncated: true };
}

// Pathspecs for files whose *contents* shouldn't be sent to the model.
// The diff stat (computed without these exclusions) will still show that
// they changed, so the model can mention them in the message.
const NOISY_PATHSPECS: string[] = [
  // Lockfiles
  ":(exclude,glob)**/package-lock.json",
  ":(exclude,glob)**/yarn.lock",
  ":(exclude,glob)**/pnpm-lock.yaml",
  ":(exclude,glob)**/bun.lock",
  ":(exclude,glob)**/bun.lockb",
  ":(exclude,glob)**/Cargo.lock",
  ":(exclude,glob)**/poetry.lock",
  ":(exclude,glob)**/uv.lock",
  ":(exclude,glob)**/Pipfile.lock",
  ":(exclude,glob)**/Gemfile.lock",
  ":(exclude,glob)**/composer.lock",
  ":(exclude,glob)**/go.sum",
  ":(exclude,glob)**/mix.lock",
  ":(exclude,glob)**/flake.lock",
  ":(exclude,glob)**/pubspec.lock",
  // Minified / generated bundles
  ":(exclude,glob)**/*.min.js",
  ":(exclude,glob)**/*.min.css",
  ":(exclude,glob)**/*.map",
  // Common generated output dirs
  ":(exclude,glob)**/dist/**",
  ":(exclude,glob)**/build/**",
  ":(exclude,glob)**/.next/**",
  ":(exclude,glob)**/node_modules/**",
  ":(exclude,glob)**/__pycache__/**",
  ":(exclude,glob)**/*.generated.*",
  ":(exclude,glob)**/*_generated.*",
  ":(exclude,glob)**/*.pb.go",
  ":(exclude,glob)**/*.pb.ts",
  // Snapshots
  ":(exclude,glob)**/__snapshots__/**",
];

function diffArgsExcludingNoise(base: string[]): string[] {
  // git diff <base...> -- . <pathspecs>
  return [...base, "--", ".", ...NOISY_PATHSPECS];
}

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
    runGit(pi, ["status", "--short", "--branch"]),
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
    diffStat?: string;
    diffTruncated?: boolean;
    branch: string;
    log: string;
    stagedOnly: boolean;
  },
  additionalInstructions: string,
): string {
  const diffLabel = context.stagedOnly
    ? "staged changes only"
    : "staged and unstaged changes";

  let message = `## Context\n\n`;
  message += `- Current git status (short):\n\`\`\`\n${context.status.trim()}\n\`\`\`\n\n`;
  if (context.diffStat) {
    message += `- Diff stat:\n\`\`\`\n${context.diffStat.trim()}\n\`\`\`\n\n`;
  }
  const diffNote = context.diffTruncated
    ? ` — TRUNCATED at ${MAX_DIFF_CHARS} chars; rely on the diff stat above for the full picture`
    : "";
  message += `- Current git diff (${diffLabel}, lockfiles/generated files excluded — see stat above for those)${diffNote}:\n\`\`\`\n${context.diff.trim() || "(no diff content; only excluded files changed)"}\n\`\`\`\n\n`;
  message += `- Current branch: ${context.branch.trim()}\n\n`;
  message += `- Recent commits for style reference (FORMAT only, not for emoji selection):\n\`\`\`\n${context.log.trim()}\n\`\`\``;

  if (context.stagedOnly) {
    message +=
      "\n\n**Note:** Only staged changes are shown above. The commit message should describe ONLY these staged changes, ignoring any unstaged modifications.";
  }

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

function buildCommitUrl(remoteUrl: string, hash: string): string {
  if (!remoteUrl || !hash) return "";

  let url = remoteUrl;

  // SSH → HTTPS: git@github.com:user/repo.git → https://github.com/user/repo
  const sshMatch = url.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
  if (sshMatch) {
    url = `https://${sshMatch[1]}/${sshMatch[2]}`;
  }

  // Strip trailing .git from HTTPS URLs
  url = url.replace(/\.git$/, "");

  // Only support known forges
  if (
    !url.includes("github.com") &&
    !url.includes("gitlab.com") &&
    !url.includes("bitbucket.org")
  ) {
    return "";
  }

  if (url.includes("bitbucket.org")) {
    return `${url}/commits/${hash}`;
  }

  return `${url}/commit/${hash}`;
}

async function selectCommitModel(
  ctx: ExtensionContext,
): Promise<Model<Api> | null> {
  if (!ctx.model) {
    return null;
  }

  const haiku = ctx.modelRegistry.find("anthropic", "claude-haiku-4-5");
  if (haiku) {
    const auth = await ctx.modelRegistry.getApiKeyAndHeaders(haiku);
    if (auth.ok) {
      return haiku;
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
  const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
  if (!auth.ok) throw new Error(auth.error);

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
      { apiKey: auth.apiKey, headers: auth.headers, reasoning: "low" },
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
          apiKey: auth.apiKey,
          headers: auth.headers,
          signal: loader.signal,
          reasoning: "low",
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

  // Phase 1: cheap calls in parallel + start model selection.
  // Defer the (potentially huge) diff to phase 2 once we know which one we need.
  const [statusResult, branchResult, logResult, modelPromise] = await Promise.all([
    runGit(pi, ["status", "--short", "--branch"]),
    runGit(pi, ["branch", "--show-current"]),
    runGit(pi, ["log", "--pretty=format:%s", "-20"]),
    selectCommitModel(ctx),
  ]);

  if (
    statusResult.code !== 0 ||
    branchResult.code !== 0 ||
    logResult.code !== 0
  ) {
    report(pi, ctx, "Failed to gather git context", "error");
    return;
  }

  // Parse short status to detect staged vs unstaged without an extra git call.
  // Lines starting with "## " are the branch header; first column is index/staged.
  const statusLines = statusResult.stdout
    .split("\n")
    .filter((l) => l.length > 0 && !l.startsWith("## "));
  if (statusLines.length === 0) {
    report(pi, ctx, "No changes to commit", "info");
    return;
  }
  const hasStagedChanges = statusLines.some(
    (l) => l[0] !== " " && l[0] !== "?",
  );

  // Phase 2: fetch a full stat (so the model still sees lockfile/generated
  // changes), plus the actual diff with noisy paths excluded.
  const baseArgs = hasStagedChanges ? ["diff", "--cached"] : ["diff", "HEAD"];
  const [diffResult, diffStatResult] = await Promise.all([
    runGit(pi, diffArgsExcludingNoise(baseArgs)),
    runGit(pi, [...baseArgs, "--stat"]),
  ]);

  if (diffResult.code !== 0 || diffStatResult.code !== 0) {
    report(pi, ctx, "Failed to gather git diff", "error");
    return;
  }

  // If the filtered diff is empty but the stat isn't, the changes are entirely
  // noisy files (e.g. just a lockfile bump). Still proceed using the stat.
  if (!diffResult.stdout.trim() && !diffStatResult.stdout.trim()) {
    report(pi, ctx, "No changes to commit", "info");
    return;
  }

  const model = modelPromise;
  if (!model) {
    report(pi, ctx, "No model selected", "error");
    return;
  }

  const { text: diffText, truncated: diffTruncated } = truncateDiff(
    diffResult.stdout,
  );

  const commitMessage = await generateCommitMessage(
    pi,
    ctx,
    model,
    buildCommitUserMessage(
      {
        status: statusResult.stdout,
        diff: diffText,
        diffStat: diffStatResult.stdout,
        diffTruncated,
        branch: branchResult.stdout,
        log: logResult.stdout,
        stagedOnly: hasStagedChanges,
      },
      additionalInstructions,
    ),
  );

  if (!commitMessage) {
    report(pi, ctx, "Cancelled", "info");
    return;
  }

  // Only run `git add -A` if there were no staged changes (commit everything mode)
  if (!hasStagedChanges) {
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

  // Combine post-commit info into one git call: hash on first line, then full body.
  const [postRes, remoteRes] = await Promise.all([
    runGit(pi, ["log", "-1", "--pretty=format:%H%n%B"]),
    runGit(pi, ["remote", "get-url", "origin"]),
  ]);
  let fullHash = "";
  let fullMessage = "";
  if (postRes.code === 0) {
    const out = postRes.stdout;
    const nl = out.indexOf("\n");
    if (nl >= 0) {
      fullHash = out.slice(0, nl).trim();
      fullMessage = out.slice(nl + 1).trim();
    } else {
      fullHash = out.trim();
    }
  }
  const commitUrl =
    remoteRes.code === 0
      ? buildCommitUrl(remoteRes.stdout.trim(), fullHash)
      : "";

  let summary: string;
  if (match) {
    const prefix = `✓ ${match[1]} ${match[2]}`;
    if (fullMessage) {
      summary = `${prefix}\n${fullMessage}`;
    } else {
      summary = `${prefix} — ${match[3]}`;
    }
  } else {
    summary = fullMessage || firstLine || "Committed!";
  }

  if (commitUrl) {
    summary += `\n\n${commitUrl}`;
  }

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
