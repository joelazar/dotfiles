/**
 * Delta Diff Extension - Uses delta (https://github.com/dandavison/delta) to
 * colorize and highlight diffs shown for the edit tool.
 *
 * Overrides the built-in edit tool, delegates execution to the original
 * implementation, then pipes the diff through delta for rendering.
 *
 * Requires: delta installed and on PATH
 */

import type {
  ExtensionAPI,
  EditToolDetails,
  ToolRenderResultOptions,
  AgentToolResult,
} from "@mariozechner/pi-coding-agent";
import { createEditTool } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import type { Theme } from "@mariozechner/pi-tui";
import { execFileSync } from "node:child_process";

type DeltaDetails = EditToolDetails & { __deltaOutput?: string };

/**
 * Convert pi's custom diff format to standard unified diff.
 *
 * Pi format uses a 3-character prefix field:
 *   ` - 443  old line`   (removed)
 *   ` + 443  new line`   (added)
 *   `   443  context`    (context)
 *   `       ...`         (ellipsis, no line number)
 *
 * Standard unified diff:
 *   `-old line` / `+new line` / ` context`
 */
function piDiffToUnified(piDiff: string, filePath?: string): string {
  const lines = piDiff.split("\n");
  let removals = 0;
  let additions = 0;
  let startLine = 1;
  let foundStart = false;
  const body: string[] = [];

  for (const line of lines) {
    // 3-char prefix: ` + `, ` - `, or `   `, then optional line number, then content
    const match = line.match(/^( [+-] |   )(\d+)?(.*)$/);
    if (!match) {
      body.push(line);
      continue;
    }
    const [, prefixField, lineNumStr, content] = match;
    const prefix = prefixField.trim(); // "+", "-", or ""
    const lineNum = lineNumStr ? parseInt(lineNumStr, 10) : undefined;

    if (!foundStart && lineNum !== undefined) {
      startLine = lineNum;
      foundStart = true;
    }

    if (prefix === "+") {
      additions++;
      body.push(`+${content}`);
    } else if (prefix === "-") {
      removals++;
      body.push(`-${content}`);
    } else {
      removals++;
      additions++;
      body.push(` ${content}`);
    }
  }

  const file = filePath ?? "file";
  return [
    `--- a/${file}`,
    `+++ b/${file}`,
    `@@ -${startLine},${removals} +${startLine},${additions} @@`,
    ...body,
  ].join("\n");
}

/** Read the user's delta syntax-theme from gitconfig, if set. */
function getDeltaSyntaxTheme(): string | null {
  try {
    return execFileSync("git", ["config", "--get", "delta.syntax-theme"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim() || null;
  } catch {
    return null;
  }
}

const deltaSyntaxTheme = getDeltaSyntaxTheme();

function runDelta(unifiedDiff: string): string | null {
  try {
    const args = [
      "--color-only",
      "--no-gitconfig",
      "--paging=never",
      "--file-style=omit",
      "--hunk-header-style=omit",
    ];
    if (deltaSyntaxTheme) {
      args.push(`--syntax-theme=${deltaSyntaxTheme}`);
    }

    const result = execFileSync("delta", args,
      {
        encoding: "utf-8",
        input: unifiedDiff,
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 5000,
      },
    );

    // Strip "Erase in Line" sequences (\x1b[0K, \x1b[1K, \x1b[2K)
    // that delta emits on added/removed lines. These fill the rest of
    // the terminal line with the active background color, causing
    // colored blocks in the TUI.
    return result.replace(/\x1b\[\d*K/g, "");
  } catch {
    return null;
  }
}

function isDeltaAvailable(): boolean {
  try {
    execFileSync("delta", ["--version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

export default function (pi: ExtensionAPI) {
  if (!isDeltaAvailable()) {
    pi.on("session_start", async (_event, ctx) => {
      ctx.ui.notify(
        "delta-diff: 'delta' not found on PATH, extension disabled",
        "warning",
      );
    });
    return;
  }

  // Grab schema from a reference instance — only used for description & parameters
  const referenceEdit = createEditTool(process.cwd());

  pi.registerTool({
    name: "edit",
    label: "edit",
    description: referenceEdit.description,
    parameters: referenceEdit.parameters,

    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const tool = createEditTool(ctx.cwd);
      const result = await tool.execute(toolCallId, params, signal, onUpdate);
      const details = result.details as DeltaDetails | undefined;

      if (details?.diff) {
        const unified = piDiffToUnified(details.diff, params.path);
        const deltaOutput = runDelta(unified);
        if (deltaOutput) {
          details.__deltaOutput = deltaOutput;
        }
      }

      return result;
    },

    renderCall(args: { path: string; oldText: string; newText: string }, theme: Theme) {
      let text = theme.fg("toolTitle", theme.bold("edit "));
      text += theme.fg("muted", args.path);
      return new Text(text, 0, 0);
    },

    renderResult(
      result: AgentToolResult<DeltaDetails>,
      _options: ToolRenderResultOptions,
      theme: Theme,
    ) {
      const details = result.details;

      if (!details?.diff) {
        const text =
          result.content?.map((c) => ("text" in c ? c.text : "")).join("") ??
          "Unknown error";
        return new Text(theme.fg("error", text), 0, 0);
      }

      if (details.__deltaOutput) {
        return new Text(details.__deltaOutput, 0, 0);
      }

      // Fallback: show raw diff if delta failed
      return new Text(details.diff, 0, 0);
    },
  });
}
