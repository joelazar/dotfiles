/**
 * /pr-create extension
 *
 * Interactive front-end for ~/.local/bin/pr-create that uses pi's built-in
 * UI dialogs (select/input/confirm/editor) instead of gum prompts.
 *
 * Same script, two front-ends:
 *   - Run `pr-create` directly in a terminal -> gum prompts
 *   - Run `/pr-create` inside pi             -> this extension's dialogs
 *
 * The extension always invokes the script with --yes plus explicit flags,
 * so the script never tries to prompt over a non-interactive stdin.
 */

import { homedir } from "node:os";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";

const SCRIPT = join(homedir(), ".local/bin/pr-create");

const ALLOWED_TYPES = [
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "perf",
  "test",
  "build",
  "ci",
  "chore",
  "revert",
  "deps",
] as const;

const TYPE_HELP: Record<(typeof ALLOWED_TYPES)[number], string> = {
  feat: "user-facing new functionality",
  fix: "bug fix",
  docs: "documentation only",
  style: "formatting/whitespace, no behavior change",
  refactor: "code change that doesn't add features or fix bugs",
  perf: "performance improvement",
  test: "add or fix tests",
  build: "build system, packaging, tooling",
  ci: "CI config and scripts",
  chore: "maintenance, configs, dotfiles",
  revert: "revert a previous commit",
  deps: "dependency bumps",
};

const TITLE_RE =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|deps)(\([^)]+\))?!?: .+/;

const TITLE_HINT =
  "format: <type>[(scope)][!]: <subject>  (e.g. feat: add login, fix(api)!: drop v1)";

async function pickTitle(
  ctx: ExtensionCommandContext,
  initial: string,
): Promise<string | undefined> {
  let title = initial.trim();

  // If the user passed something that already validates, accept it.
  if (title && TITLE_RE.test(title)) return title;

  // Otherwise, help them pick a type, then a subject.
  const typeChoices = ALLOWED_TYPES.map((t) => `${t}  —  ${TYPE_HELP[t]}`);
  const typePick = await ctx.ui.select(
    "Conventional commit type",
    typeChoices,
  );
  if (!typePick) return undefined;
  const type = typePick.split(" ")[0] as (typeof ALLOWED_TYPES)[number];

  const scope = await ctx.ui.input(
    `Scope for ${type} (optional, e.g. api, ui)`,
    "",
  );
  if (scope === undefined) return undefined;

  const breaking = await ctx.ui.confirm(
    "Breaking change?",
    "Append `!` to mark a breaking change.",
  );

  // Pre-fill subject with whatever the user originally typed (sans any prefix).
  const initialSubject = title.replace(TITLE_RE, "").trim() || title;
  const subject = await ctx.ui.input(
    `Subject (imperative, lowercase, ≤72 chars)`,
    initialSubject,
  );
  if (subject === undefined) return undefined;
  const subjectTrim = subject.trim();
  if (!subjectTrim) {
    ctx.ui.notify("Subject is required", "error");
    return undefined;
  }

  const scopePart = scope.trim() ? `(${scope.trim()})` : "";
  const bang = breaking ? "!" : "";
  const built = `${type}${scopePart}${bang}: ${subjectTrim}`;

  if (!TITLE_RE.test(built)) {
    ctx.ui.notify(`Invalid title: ${built}`, "error");
    return undefined;
  }
  return built;
}

async function collectLinearLinks(
  ctx: ExtensionCommandContext,
): Promise<string[]> {
  const links: string[] = [];
  const first = await ctx.ui.confirm(
    "Linear tickets?",
    "Link any Linear tickets to this PR?",
  );
  if (!first) return links;

  for (;;) {
    const ticket = await ctx.ui.input("Ticket ID (e.g. ABC-123)", "");
    if (ticket === undefined) break;
    const id = ticket.trim();
    if (!id) break;

    const rel = await ctx.ui.select(`Relation for ${id}`, ["Closes", "Ref"]);
    if (!rel) break;
    links.push(`${rel} ${id}`);

    const more = await ctx.ui.confirm("Add another?", "Another Linear ticket?");
    if (!more) break;
  }
  return links;
}

async function generatePrBody(
  ctx: ExtensionCommandContext,
  pi: ExtensionAPI,
): Promise<string | undefined> {
  ctx.ui.setStatus("pr-create", "Generating PR description with pi…");
  try {
    const prompt = [
      "Use the humanizer skill. Generate a short GitHub pull request description for the current branch.",
      "",
      "Requirements:",
      "- Keep it concise and natural.",
      "- Summarize actual code/config changes in this PR.",
      "- Prefer 2-4 bullets.",
      "- Do not invent details.",
      "- Do not include Linear ticket lines.",
      "- Output only the PR description body.",
    ].join("\n");

    const result = await pi.exec(
      "pi",
      [
        "-p",
        "--no-session",
        "--model",
        "openai-codex/gpt-5.5",
        "--thinking",
        "low",
        prompt,
      ],
      { signal: ctx.signal, timeout: 120_000 },
    );
    if (result.code !== 0) {
      ctx.ui.notify(
        `Description generation failed (exit ${result.code}): ${result.stderr.slice(0, 200)}`,
        "error",
      );
      return undefined;
    }
    return result.stdout.trim();
  } finally {
    ctx.ui.setStatus("pr-create", undefined);
  }
}

function writeTempBody(body: string): string {
  const dir = mkdtempSync(join(tmpdir(), "pr-description-"));
  const path = join(dir, "body.md");
  writeFileSync(path, body, "utf8");
  return path;
}

async function runPrCreate(args: string[], pi: ExtensionAPI, ctx: ExtensionCommandContext) {
  ctx.ui.setStatus("pr-create", "Creating PR…");
  try {
    const result = await pi.exec(SCRIPT, args, {
      signal: ctx.signal,
      timeout: 120_000,
    });
    return result;
  } finally {
    ctx.ui.setStatus("pr-create", undefined);
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("pr-create", {
    description:
      "Create a GitHub PR via ~/.local/bin/pr-create using interactive pi dialogs",
    handler: async (rawArgs, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("/pr-create requires interactive mode", "error");
        return;
      }

      // 1. Title
      const title = await pickTitle(ctx, rawArgs ?? "");
      if (!title) {
        ctx.ui.notify("Cancelled", "info");
        return;
      }

      // 2. Base branch
      const baseRaw = await ctx.ui.input(
        "Base branch (empty = repo default)",
        "",
      );
      if (baseRaw === undefined) {
        ctx.ui.notify("Cancelled", "info");
        return;
      }
      const base = baseRaw.trim();

      // 3. Draft?
      const draft = await ctx.ui.confirm(
        "Draft PR?",
        "Create as a draft pull request?",
      );

      // 4. Reviewers
      const reviewerPick = await ctx.ui.select("Reviewers", [
        "Default (none added)",
        "CNS (peterbornerup, farhadh, jdejnek)",
      ]);
      if (!reviewerPick) {
        ctx.ui.notify("Cancelled", "info");
        return;
      }
      const reviewers = reviewerPick.startsWith("CNS") ? "cns" : "default";

      // 5. Description
      const genDesc = await ctx.ui.confirm(
        "Generate description?",
        "Have pi draft a PR description from the diff?",
      );

      let bodyPath: string | undefined;
      if (genDesc) {
        const body = await generatePrBody(ctx, pi);
        if (body === undefined) {
          ctx.ui.notify("Cancelled (no description generated)", "info");
          return;
        }
        // Optional inline edit before submission.
        const edit = await ctx.ui.confirm(
          "Edit description?",
          "Open the generated description in the editor before creating the PR?",
        );
        const finalBody = edit
          ? ((await ctx.ui.editor("PR description", body)) ?? body)
          : body;
        bodyPath = writeTempBody(finalBody);
      }

      // 6. Linear links
      const linear = await collectLinearLinks(ctx);

      // 7. Push confirmation up-front so the script doesn't have to prompt.
      const autoPush = await ctx.ui.confirm(
        "Auto-push?",
        "Push the branch automatically if it has no upstream or unpushed commits?",
      );

      // Build script args.
      const args: string[] = [
        "--yes",
        "--title",
        title,
        "--reviewers",
        reviewers,
        draft ? "--draft" : "--no-draft",
        autoPush ? "--push" : "--no-push",
        "--no-edit", // we already edited above if requested
      ];
      if (base) args.push("--base", base);
      if (bodyPath) {
        args.push("--body-file", bodyPath, "--no-generate-description");
      } else {
        args.push("--no-generate-description");
      }
      for (const link of linear) args.push("--linear", link);

      const result = await runPrCreate(args, pi, ctx);

      if (result.code !== 0) {
        ctx.ui.notify(
          `pr-create failed (exit ${result.code}): ${result.stderr.trim().slice(0, 300)}`,
          "error",
        );
        return;
      }

      const url = result.stdout.trim().split("\n").pop() ?? "";
      ctx.ui.notify(`PR created: ${url}`, "info");

      // Surface the URL in the conversation too.
      pi.sendMessage(
        {
          customType: "pr-create",
          content: [
            `Created pull request: ${url}`,
            `Title: ${title}`,
            base ? `Base: ${base}` : undefined,
            `Reviewers: ${reviewers}`,
            draft ? "Draft: yes" : undefined,
            linear.length ? `Linear: ${linear.join(", ")}` : undefined,
          ]
            .filter(Boolean)
            .join("\n"),
          display: true,
        },
        { triggerTurn: false },
      );
    },
  });
}
