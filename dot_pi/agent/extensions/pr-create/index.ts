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

function normalizeTitleCandidate(raw: string): string {
  const withoutLeadingEmoji = raw
    .trim()
    // Allow gitmoji-style commit subjects like `:recycle: refactor: ...`.
    .replace(/^(:[a-z0-9_+-]+:\s*)+/i, "")
    // Also allow leading unicode emoji like `♻️ refactor: ...`.
    .replace(/^(?:\p{Extended_Pictographic}\ufe0f?\s*)+/u, "")
    .trim();

  // Allow `:recycle: refactor deployment...` by inserting the missing colon.
  return withoutLeadingEmoji.replace(
    /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|deps)(\([^)]+\))?(!)?\s+(.+)/,
    (_match, type, scope = "", bang = "", subject) =>
      `${type}${scope}${bang}: ${subject}`,
  );
}

async function pickTitle(
  ctx: ExtensionCommandContext,
  pi: ExtensionAPI,
  initial: string,
): Promise<string | undefined> {
  let title = initial.trim();
  const normalizedTitle = normalizeTitleCandidate(title);

  // If the user passed something that already validates, accept it.
  if (title && TITLE_RE.test(title)) return title;
  if (normalizedTitle && TITLE_RE.test(normalizedTitle)) return normalizedTitle;

  // Try to auto-derive a title suggestion from the last commit message subject.
  let suggestion = title;
  if (!suggestion) {
    try {
      const r = await pi.exec("git", ["log", "-1", "--pretty=%s"], {
        signal: ctx.signal,
        timeout: 5_000,
      });
      if (r.code === 0) {
        const s = normalizeTitleCandidate(r.stdout);
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
      ctx.ui.notify(
        "Subject is required — try again or press Esc to cancel",
        "warning",
      );
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
  const normalized = normalizeTitleCandidate(t);
  if (t && TITLE_RE.test(t)) return t;
  if (normalized && TITLE_RE.test(normalized)) return normalized;
  try {
    const r = await pi.exec("git", ["log", "-1", "--pretty=%s"], {
      signal: ctx.signal,
      timeout: 5_000,
    });
    if (r.code === 0) {
      const s = normalizeTitleCandidate(r.stdout);
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
  "anthropic-extra/claude-opus-4-8",
  "anthropic/claude-opus-4-8",
];

/**
 * Resolve the ref to diff against. Prefers the remote tracking ref so the
 * comparison matches what GitHub will show, falling back to the local branch.
 */
async function resolveBaseRef(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  base: string,
): Promise<string | undefined> {
  const candidate = base.trim() || (await detectDefaultBranch(pi, ctx));
  if (!candidate) return undefined;
  const bare = candidate.replace(/^origin\//, "");
  for (const ref of [`origin/${bare}`, bare]) {
    try {
      const r = await pi.exec(
        "git",
        ["rev-parse", "--verify", "--quiet", ref],
        {
          signal: ctx.signal,
          timeout: 5_000,
        },
      );
      if (r.code === 0 && r.stdout.trim()) return ref;
    } catch {
      // ignore
    }
  }
  return undefined;
}

/**
 * Compute the diff that the PR will actually introduce using the three-dot
 * range (merge-base of base and HEAD .. HEAD). This excludes any commits added
 * to the base branch after this branch was created, so an outdated/updated base
 * never leaks unrelated changes into the description.
 */
async function computeBranchDiff(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  baseRef: string,
): Promise<{ stat: string; diff: string; commits: string } | undefined> {
  const range = `${baseRef}...HEAD`;
  try {
    const [stat, diff, commits] = await Promise.all([
      pi.exec("git", ["diff", "--stat", range], {
        signal: ctx.signal,
        timeout: 15_000,
      }),
      pi.exec("git", ["diff", range], { signal: ctx.signal, timeout: 15_000 }),
      pi.exec(
        "git",
        ["log", "--no-merges", "--pretty=%s", `${baseRef}..HEAD`],
        {
          signal: ctx.signal,
          timeout: 15_000,
        },
      ),
    ]);
    if (stat.code !== 0 || diff.code !== 0) return undefined;
    return {
      stat: stat.stdout.trim(),
      diff: diff.stdout,
      commits: commits.code === 0 ? commits.stdout.trim() : "",
    };
  } catch {
    return undefined;
  }
}

async function generatePrBody(
  ctx: ExtensionCommandContext,
  pi: ExtensionAPI,
  base: string,
): Promise<string | undefined> {
  const baseRef = await resolveBaseRef(pi, ctx, base);
  const changes = baseRef
    ? await computeBranchDiff(pi, ctx, baseRef)
    : undefined;

  if (!changes) {
    ctx.ui.notify(
      "Could not compute the branch diff against the base — skipping description generation",
      "warning",
    );
    return undefined;
  }

  // Cap the diff to keep the prompt within a sane size.
  const MAX_DIFF_CHARS = 100_000;
  const diffText =
    changes.diff.length > MAX_DIFF_CHARS
      ? `${changes.diff.slice(0, MAX_DIFF_CHARS)}\n\n[diff truncated]`
      : changes.diff;

  const prompt = [
    "Use the humanizer skill. Generate a short GitHub pull request description.",
    "",
    "The exact changes introduced by this PR are provided below as a git diff",
    `against ${baseRef}. Base ONLY your description on this diff. Do NOT run any`,
    "git commands and do NOT consider any changes outside of the provided diff.",
    "",
    "Requirements:",
    "- Keep it concise and natural.",
    "- Summarize only the actual code/config changes shown in the diff.",
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
    "",
    "Commit subjects:",
    changes.commits || "(none)",
    "",
    "Diff stat:",
    changes.stat || "(empty)",
    "",
    "Diff:",
    diffText,
  ].join("\n");

  const errors: string[] = [];
  for (const model of DESCRIPTION_MODELS) {
    ctx.ui.setStatus("pr-create", `Generating PR description (${model})…`);
    try {
      const result = await pi.exec(
        "pi",
        ["-p", "--no-session", "--model", model, "--thinking", "off", prompt],
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
    "warning",
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
      [
        "repo",
        "view",
        "--json",
        "defaultBranchRef",
        "--jq",
        ".defaultBranchRef.name",
      ],
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
          ctx.ui.notify(
            "Title is required — try again or press Esc to cancel",
            "warning",
          );
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

async function runPrCreate(
  args: string[],
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
) {
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

      const cancel = () => ctx.ui.notify("Cancelled", "info");

      // 0. Mode: automatic vs interactive
      const modePick = await ctx.ui.select("Mode", [
        "Automatic (sensible defaults, no prompts)",
        "Interactive (ask for every field)",
      ]);
      if (!modePick) return cancel();
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
          if (!title) return cancel();
        }
        // Best-effort description generation; on failure, continue without one.
        const body = await generatePrBody(ctx, pi, base);
        if (body) bodyPath = writeTempBody(body);
      } else {
        // 1. Title (with auto-suggested option)
        title = await pickTitleWithAuto(ctx, pi, rawArgs ?? "");
        if (!title) return cancel();

        // 2. Base branch (auto = repo default branch)
        const detectedBase = await detectDefaultBranch(pi, ctx);
        const basePick = await ctx.ui.select("Base branch", [
          detectedBase
            ? `Auto: ${detectedBase} (repo default)`
            : "Auto: repo default",
          "Enter manually",
        ]);
        if (!basePick) return cancel();
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
        if (draftPick === undefined) return cancel();
        draft = draftPick;

        // 4. Reviewers (auto = Default)
        const reviewerPick = await ctx.ui.select("Reviewers", [
          "Auto: Default (none added)",
          "Default (none added)",
          "CNS (peterbornerup, farhadh, jdejnek, finoutlook, befe-oh-no)",
        ]);
        if (!reviewerPick) return cancel();
        reviewers = reviewerPick.includes("CNS") ? "cns" : "default";

        // 5. Description (auto = generate)
        const descPick = await ctx.ui.select("PR description", [
          "Auto: generate with pi",
          "Write manually in the editor",
          "Skip (no description)",
        ]);
        if (!descPick) return cancel();
        const genDesc = descPick.startsWith("Auto:");
        const writeManual = descPick.startsWith("Write");
        if (writeManual) {
          const manual = await ctx.ui.editor("PR description", "");
          if (manual && manual.trim()) bodyPath = writeTempBody(manual);
        }
        if (genDesc) {
          const body = await generatePrBody(ctx, pi, base);
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
            if (!next || next.startsWith("Cancel")) return cancel();
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
        if (linearPick === undefined) return cancel();
        linear = linearPick;

        // 7. Push confirmation up-front so the script doesn't have to prompt.
        const pushPick = await pickBoolWithAuto(ctx, "Auto-push branch?", true);
        if (pushPick === undefined) return cancel();
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
      if (bodyPath) args.push("--body-file", bodyPath);
      args.push("--no-generate-description");
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
