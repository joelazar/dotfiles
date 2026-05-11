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
  pi: ExtensionAPI,
  initial: string,
): Promise<string | undefined> {
  let title = initial.trim();

  // If the user passed something that already validates, accept it.
  if (title && TITLE_RE.test(title)) return title;

  // Try to auto-derive a title suggestion from the last commit message subject.
  let suggestion = title;
  if (!suggestion) {
    try {
      const r = await pi.exec("git", ["log", "-1", "--pretty=%s"], {
        signal: ctx.signal,
        timeout: 5_000,
      });
      if (r.code === 0) {
        const s = r.stdout.trim();
        if (s && TITLE_RE.test(s)) suggestion = s;
      }
    } catch {
      // ignore
    }
  }

  // Otherwise, help them pick a type, then a subject.
  const typeChoices = ALLOWED_TYPES.map((t) => `${t}  —  ${TYPE_HELP[t]}`);
  // Preselect the type from the suggestion if possible.
  const suggestedType = suggestion.match(TITLE_RE)?.[1];
  const orderedTypes = suggestedType
    ? [suggestedType, ...ALLOWED_TYPES.filter((t) => t !== suggestedType)]
    : ALLOWED_TYPES;
  const orderedChoices = orderedTypes.map(
    (t) => `${t}  —  ${TYPE_HELP[t as (typeof ALLOWED_TYPES)[number]]}`,
  );
  const typePick = await ctx.ui.select(
    "Conventional commit type",
    orderedChoices,
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

  // Pre-fill subject with whatever the user originally typed (sans any prefix),
  // or with the auto-derived suggestion's subject.
  const initialSubject =
    title.replace(TITLE_RE, "").trim() ||
    suggestion.replace(TITLE_RE, "").trim() ||
    title;

  // Loop until we get a valid subject or the user cancels (Esc).
  for (;;) {
    const subject = await ctx.ui.input(
      `Subject (imperative, lowercase, ≤72 chars)`,
      initialSubject,
    );
    if (subject === undefined) return undefined; // Esc -> cancel
    const subjectTrim = subject.trim();
    if (!subjectTrim) {
      ctx.ui.notify("Subject is required — try again or press Esc to cancel", "warn");
      continue;
    }
    const scopePart = scope.trim() ? `(${scope.trim()})` : "";
    const bang = breaking ? "!" : "";
    const built = `${type}${scopePart}${bang}: ${subjectTrim}`;
    if (!TITLE_RE.test(built)) {
      ctx.ui.notify(`Invalid title: ${built}`, "error");
      continue;
    }
    return built;
  }
}

async function autoTitle(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  initial: string,
): Promise<string | undefined> {
  const t = initial.trim();
  if (t && TITLE_RE.test(t)) return t;
  try {
    const r = await pi.exec("git", ["log", "-1", "--pretty=%s"], {
      signal: ctx.signal,
      timeout: 5_000,
    });
    if (r.code === 0) {
      const s = r.stdout.trim();
      if (s && TITLE_RE.test(s)) return s;
    }
  } catch {
    // ignore
  }
  return undefined;
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

// Models to try, in order, when generating a PR description.
const DESCRIPTION_MODELS: string[] = [
  "anthropic/claude-sonnet-4-6",
  "openai-codex/gpt-5.5",
];

async function generatePrBody(
  ctx: ExtensionCommandContext,
  pi: ExtensionAPI,
): Promise<string | undefined> {
  const prompt = [
    "Use the humanizer skill. Generate a short GitHub pull request description for the current branch.",
    "",
    "Requirements:",
    "- Keep it concise and natural.",
    "- Summarize actual code/config changes in this PR.",
    "- Prefer 2-4 bullets.",
    "- Do not invent details.",
    "- Do not include Linear ticket lines.",
    "",
    "Output rules (strict):",
    "- Output ONLY the raw PR description body as plain markdown.",
    "- Do NOT include any preamble like 'Here is the PR description', 'Sure', 'Of course', etc.",
    "- Do NOT include any closing remarks or sign-offs.",
    "- Do NOT wrap the body in code fences, blockquotes, or horizontal rules (---).",
    "- Do NOT add a title/heading line; start directly with the summary paragraph or bullets.",
    "- The first character of your reply must be the first character of the body.",
  ].join("\n");

  const errors: string[] = [];
  for (const model of DESCRIPTION_MODELS) {
    ctx.ui.setStatus("pr-create", `Generating PR description (${model})…`);
    try {
      const result = await pi.exec(
        "pi",
        [
          "-p",
          "--no-session",
          "--model",
          model,
          "--thinking",
          "low",
          prompt,
        ],
        { signal: ctx.signal, timeout: 120_000 },
      );
      if (result.code === 0) {
        const out = sanitizePrBody(result.stdout);
        if (out) {
          ctx.ui.setStatus("pr-create", undefined);
          return out;
        }
        errors.push(`${model}: empty output`);
      } else {
        errors.push(
          `${model} (exit ${result.code}): ${(result.stderr || result.stdout).trim().slice(0, 200)}`,
        );
      }
    } catch (err) {
      errors.push(`${model}: ${(err as Error).message}`);
    }
  }
  ctx.ui.setStatus("pr-create", undefined);
  ctx.ui.notify(
    `Description generation failed:\n${errors.join("\n")}`,
    "warn",
  );
  return undefined;
}

// Strip common LLM preambles, code fences, leading horizontal rules, etc.
function sanitizePrBody(raw: string): string {
  let body = raw.replace(/\r\n/g, "\n").trim();

  // Strip an outer ```...``` fence if the entire body is wrapped in one.
  const fence = body.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```\s*$/);
  if (fence) body = fence[1].trim();

  const preambleRe =
    /^(here(?:'|\u2019)?s|here is|below is|sure[,!.]?|of course[,!.]?|certainly[,!.]?|okay[,!.]?|ok[,!.]?)\b[^\n]*?:?\s*$/i;

  // Drop leading blank lines, preamble lines, and leading horizontal rules.
  const lines = body.split("\n");
  while (lines.length) {
    const first = lines[0].trim();
    if (first === "") {
      lines.shift();
      continue;
    }
    if (/^[-*_]{3,}$/.test(first)) {
      lines.shift();
      continue;
    }
    if (preambleRe.test(first)) {
      lines.shift();
      continue;
    }
    break;
  }

  // Drop trailing blank lines and trailing horizontal rules.
  while (lines.length) {
    const last = lines[lines.length - 1].trim();
    if (last === "" || /^[-*_]{3,}$/.test(last)) {
      lines.pop();
      continue;
    }
    break;
  }

  return lines.join("\n").trim();
}

// ---------- Auto-suggestion helpers (interactive mode) ----------

async function detectDefaultBranch(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
): Promise<string | undefined> {
  // Try the symbolic-ref of origin/HEAD first (no network).
  try {
    const r = await pi.exec(
      "git",
      ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"],
      { signal: ctx.signal, timeout: 5_000 },
    );
    if (r.code === 0) {
      const s = r.stdout.trim().replace(/^origin\//, "");
      if (s) return s;
    }
  } catch {
    // ignore
  }
  // Fall back to gh repo view.
  try {
    const r = await pi.exec(
      "gh",
      ["repo", "view", "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name"],
      { signal: ctx.signal, timeout: 10_000 },
    );
    if (r.code === 0) {
      const s = r.stdout.trim();
      if (s) return s;
    }
  } catch {
    // ignore
  }
  return undefined;
}

async function detectLinearFromBranch(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
): Promise<string[]> {
  try {
    const r = await pi.exec("git", ["branch", "--show-current"], {
      signal: ctx.signal,
      timeout: 5_000,
    });
    if (r.code !== 0) return [];
    const branch = r.stdout.trim();
    const ids = new Set<string>();
    for (const m of branch.matchAll(/\b([A-Z][A-Z0-9]{1,9}-\d+)\b/g)) {
      ids.add(m[1]);
    }
    return [...ids];
  } catch {
    return [];
  }
}

/**
 * Show a select with an "Auto" choice on top, plus "Enter manually" and an
 * optional "Skip" choice. Returns the chosen value, or `undefined` if the
 * user cancels (Esc).
 */
async function pickStringWithAuto(
  ctx: ExtensionCommandContext,
  label: string,
  autoValue: string | undefined,
  opts: { allowSkip?: boolean; skipLabel?: string; placeholder?: string } = {},
): Promise<string | undefined> {
  const { allowSkip = true, skipLabel = "Skip / use default", placeholder = "" } = opts;
  const choices: string[] = [];
  if (autoValue !== undefined && autoValue !== "") {
    choices.push(`Auto: ${autoValue}`);
  }
  choices.push("Enter manually");
  if (allowSkip) choices.push(skipLabel);
  const pick = await ctx.ui.select(label, choices);
  if (!pick) return undefined;
  if (pick.startsWith("Auto:")) return autoValue ?? "";
  if (pick === skipLabel) return "";
  const v = await ctx.ui.input(label, autoValue ?? placeholder);
  if (v === undefined) return undefined;
  return v.trim();
}

async function pickBoolWithAuto(
  ctx: ExtensionCommandContext,
  label: string,
  autoValue: boolean,
): Promise<boolean | undefined> {
  const pick = await ctx.ui.select(label, [
    `Auto: ${autoValue ? "Yes" : "No"}`,
    "Yes",
    "No",
  ]);
  if (!pick) return undefined;
  if (pick.startsWith("Auto:")) return autoValue;
  return pick === "Yes";
}

async function collectLinearLinksInteractive(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
): Promise<string[] | undefined> {
  const detected = await detectLinearFromBranch(pi, ctx);
  const choices: string[] = [];
  if (detected.length) {
    choices.push(`Auto: Closes ${detected.join(", Closes ")}`);
  }
  choices.push("Add manually");
  choices.push("None");
  const pick = await ctx.ui.select("Linear tickets", choices);
  if (!pick) return undefined;
  if (pick === "None") return [];
  if (pick.startsWith("Auto:")) return detected.map((id) => `Closes ${id}`);
  return collectLinearLinks(ctx);
}

async function pickTitleWithAuto(
  ctx: ExtensionCommandContext,
  pi: ExtensionAPI,
  rawArgs: string,
): Promise<string | undefined> {
  const auto = await autoTitle(pi, ctx, rawArgs);
  if (auto) {
    const pick = await ctx.ui.select("Title", [
      `Auto: ${auto}`,
      "Enter directly (one line)",
      "Build step-by-step (type → scope → subject)",
    ]);
    if (!pick) return undefined;
    if (pick.startsWith("Auto:")) return auto;
    if (pick.startsWith("Enter directly")) {
      for (;;) {
        const t = await ctx.ui.input(`Title (${TITLE_HINT})`, auto);
        if (t === undefined) return undefined;
        const trimmed = t.trim();
        if (!trimmed) {
          ctx.ui.notify("Title is required — try again or press Esc to cancel", "warn");
          continue;
        }
        if (!TITLE_RE.test(trimmed)) {
          ctx.ui.notify(`Invalid title: ${trimmed}`, "error");
          continue;
        }
        return trimmed;
      }
    }
    // Fall through to step-by-step builder.
  }
  return pickTitle(ctx, pi, rawArgs);
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

      // 0. Mode: automatic vs interactive
      const modePick = await ctx.ui.select("Mode", [
        "Automatic (sensible defaults, no prompts)",
        "Interactive (ask for every field)",
      ]);
      if (!modePick) {
        ctx.ui.notify("Cancelled", "info");
        return;
      }
      const automatic = modePick.startsWith("Automatic");

      let title: string | undefined;
      let base = "";
      let draft = false;
      let reviewers: "default" | "cns" = "default";
      let bodyPath: string | undefined;
      let linear: string[] = [];
      let autoPush = true;

      if (automatic) {
        // Title: from args or last commit; otherwise fall back to interactive picker.
        title = await autoTitle(pi, ctx, rawArgs ?? "");
        if (!title) {
          ctx.ui.notify(
            "Could not auto-derive a title — falling back to interactive picker",
            "info",
          );
          title = await pickTitle(ctx, pi, rawArgs ?? "");
          if (!title) {
            ctx.ui.notify("Cancelled", "info");
            return;
          }
        }
        // Best-effort description generation; on failure, continue without one.
        const body = await generatePrBody(ctx, pi);
        if (body) bodyPath = writeTempBody(body);
      } else {
        // 1. Title (with auto-suggested option)
        title = await pickTitleWithAuto(ctx, pi, rawArgs ?? "");
        if (!title) {
          ctx.ui.notify("Cancelled", "info");
          return;
        }

        // 2. Base branch (auto = repo default branch)
        const detectedBase = await detectDefaultBranch(pi, ctx);
        const basePick = await ctx.ui.select("Base branch", [
          detectedBase
            ? `Auto: ${detectedBase} (repo default)`
            : "Auto: repo default",
          "Enter manually",
        ]);
        if (!basePick) {
          ctx.ui.notify("Cancelled", "info");
          return;
        }
        if (basePick.startsWith("Auto:")) {
          base = ""; // empty = let the script use repo default
        } else {
          const baseRaw = await ctx.ui.input(
            "Base branch (empty = repo default)",
            detectedBase ?? "",
          );
          base = (baseRaw ?? "").trim();
        }

        // 3. Draft? (auto = No)
        const draftPick = await pickBoolWithAuto(ctx, "Draft PR?", false);
        if (draftPick === undefined) {
          ctx.ui.notify("Cancelled", "info");
          return;
        }
        draft = draftPick;

        // 4. Reviewers (auto = Default)
        const reviewerPick = await ctx.ui.select("Reviewers", [
          "Auto: Default (none added)",
          "Default (none added)",
          "CNS (peterbornerup, farhadh, jdejnek)",
        ]);
        if (!reviewerPick) {
          ctx.ui.notify("Cancelled", "info");
          return;
        }
        reviewers = reviewerPick.includes("CNS") ? "cns" : "default";

        // 5. Description (auto = generate)
        const descPick = await ctx.ui.select("PR description", [
          "Auto: generate with pi",
          "Write manually in the editor",
          "Skip (no description)",
        ]);
        if (!descPick) {
          ctx.ui.notify("Cancelled", "info");
          return;
        }
        const genDesc = descPick.startsWith("Auto:");
        const writeManual = descPick.startsWith("Write");
        if (writeManual) {
          const manual = await ctx.ui.editor("PR description", "");
          if (manual && manual.trim()) bodyPath = writeTempBody(manual);
        }
        if (genDesc) {
          const body = await generatePrBody(ctx, pi);
          if (body !== undefined) {
            const edit = await ctx.ui.confirm(
              "Edit description?",
              "Open the generated description in the editor before creating the PR?",
            );
            const finalBody = edit
              ? ((await ctx.ui.editor("PR description", body)) ?? body)
              : body;
            bodyPath = writeTempBody(finalBody);
          } else {
            // Generation failed — offer manual edit / continue without.
            const next = await ctx.ui.select(
              "Description generation failed — what now?",
              [
                "Continue without a description",
                "Write one manually in the editor",
                "Cancel",
              ],
            );
            if (!next || next.startsWith("Cancel")) {
              ctx.ui.notify("Cancelled", "info");
              return;
            }
            if (next.startsWith("Write")) {
              const manual = await ctx.ui.editor("PR description", "");
              if (manual && manual.trim()) {
                bodyPath = writeTempBody(manual);
              }
            }
          }
        }

        // 6. Linear links (auto = parsed from branch name)
        const linearPick = await collectLinearLinksInteractive(pi, ctx);
        if (linearPick === undefined) {
          ctx.ui.notify("Cancelled", "info");
          return;
        }
        linear = linearPick;

        // 7. Push confirmation up-front so the script doesn't have to prompt.
        const pushPick = await pickBoolWithAuto(ctx, "Auto-push branch?", true);
        if (pushPick === undefined) {
          ctx.ui.notify("Cancelled", "info");
          return;
        }
        autoPush = pushPick;
      }

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
