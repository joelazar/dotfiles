/**
 * Per-line background highlighting for edit tool diffs.
 *
 * Overrides the built-in edit tool renderer to apply Tokyo Night-style
 * line backgrounds: darkened green for added, darkened red for removed.
 * Intra-line word highlights use subtle tinted backgrounds instead of inverse.
 * Syntax highlighting is applied to diff output using the file's language.
 * Matches Tokyo Night nvim's DiffAdd/DiffDelete/DiffText highlighting.
 */

import type {
  ExtensionAPI,
  EditToolDetails,
} from "@mariozechner/pi-coding-agent";
import {
  createEditTool,
  highlightCode,
  getLanguageFromPath,
  type Theme,
} from "@mariozechner/pi-coding-agent";
import { Text, visibleWidth, truncateToWidth } from "@mariozechner/pi-tui";
import * as Diff from "diff";
import { homedir } from "os";

// darken(color, factor, base) where base = #1a1b26
const ADDED_LINE_BG = "\x1b[48;2;50;59;50m"; // darken(#9ece6a, 0.18)
const REMOVED_LINE_BG = "\x1b[48;2;66;43;57m"; // darken(#f7768e, 0.18)
const ADDED_WORD_BG = "\x1b[48;2;75;93;63m"; // darken(#9ece6a, 0.37)
const REMOVED_WORD_BG = "\x1b[48;2;108;61;76m"; // darken(#f7768e, 0.37)

const STRIP_ANSI = /\x1b\[[0-9;]*m/g;

function parseDiffLine(line: string) {
  const match = line.match(/^([+-\s])(\s*\d*)\s(.*)$/);
  if (!match) return null;
  return { prefix: match[1], lineNum: match[2], content: match[3] };
}

function collectLines(lines: string[], i: number, prefix: string) {
  const collected: { lineNum: string; content: string }[] = [];
  while (i < lines.length) {
    const p = parseDiffLine(lines[i]);
    if (!p || p.prefix !== prefix) break;
    collected.push({ lineNum: p.lineNum, content: p.content });
    i++;
  }
  return { collected, i };
}

/**
 * Apply a background ANSI escape to a range of visible characters in an
 * ANSI-styled string, then restore the previous background afterward.
 */
function applyBgToRange(
  ansiStr: string,
  start: number,
  end: number,
  bg: string,
  restoreBg: string,
): string {
  if (!ansiStr || start >= end || end <= 0) return ansiStr;

  const rangeStart = Math.max(0, start);
  const rangeEnd = Math.max(rangeStart, end);

  let result = "";
  let visIdx = 0;
  let i = 0;
  let inRange = false;
  while (i < ansiStr.length) {
    // Pass through ANSI escapes without counting
    if (ansiStr[i] === "\x1b") {
      const escEnd = ansiStr.indexOf("m", i);
      if (escEnd !== -1) {
        result += ansiStr.slice(i, escEnd + 1);
        i = escEnd + 1;
        continue;
      }
    }
    if (visIdx === rangeStart && !inRange) {
      result += bg;
      inRange = true;
    }
    if (visIdx === rangeEnd && inRange) {
      result += restoreBg;
      inRange = false;
    }
    result += ansiStr[i];
    visIdx++;
    i++;
  }
  if (inRange) result += restoreBg;
  return result;
}

/**
 * Highlight a single line of code. Each line gets a fresh tokenizer state,
 * which avoids issues with partial code fragments confusing the highlighter.
 * Only runs once per edit (result is cached by DiffText).
 */
function highlightLine(content: string, lang?: string): string {
  if (!lang) return content;
  const lines = highlightCode(content, lang);
  return lines[0] ?? content;
}

/**
 * Compute word diff on plain text, then apply word-highlight backgrounds
 * onto the syntax-highlighted versions of those lines.
 */
function renderIntraLineDiff(
  oldPlain: string,
  newPlain: string,
  oldHighlighted: string,
  newHighlighted: string,
  removedWordBg: string,
  addedWordBg: string,
  removedLineBg: string,
  addedLineBg: string,
) {
  const parts = Diff.diffWords(oldPlain, newPlain);
  let oldPos = 0;
  let newPos = 0;
  let removedLine = oldHighlighted;
  let addedLine = newHighlighted;

  // Collect ranges to highlight, applied in reverse order to preserve positions
  const removedRanges: { start: number; end: number }[] = [];
  const addedRanges: { start: number; end: number }[] = [];

  const addChangedRange = (
    ranges: { start: number; end: number }[],
    pos: number,
    value: string,
    skipLeadingWhitespace: boolean,
  ) => {
    const len = value.length;
    const wsLen = skipLeadingWhitespace
      ? (value.match(/^(\s*)/)?.[1] || "").length
      : 0;
    if (len > wsLen) {
      ranges.push({ start: pos + wsLen, end: pos + len });
    }
    return pos + len;
  };

  for (const part of parts) {
    const isFirstChangedPart =
      removedRanges.length === 0 && addedRanges.length === 0;

    if (part.removed) {
      oldPos = addChangedRange(
        removedRanges,
        oldPos,
        part.value,
        isFirstChangedPart,
      );
    } else if (part.added) {
      newPos = addChangedRange(
        addedRanges,
        newPos,
        part.value,
        isFirstChangedPart,
      );
    } else {
      oldPos += part.value.length;
      newPos += part.value.length;
    }
  }

  // Apply ranges in reverse so positions stay valid
  for (let r = removedRanges.length - 1; r >= 0; r--) {
    removedLine = applyBgToRange(
      removedLine,
      removedRanges[r].start,
      removedRanges[r].end,
      removedWordBg,
      removedLineBg,
    );
  }
  for (let r = addedRanges.length - 1; r >= 0; r--) {
    addedLine = applyBgToRange(
      addedLine,
      addedRanges[r].start,
      addedRanges[r].end,
      addedWordBg,
      addedLineBg,
    );
  }

  return { removedLine, addedLine };
}

function fmtLine(
  theme: Theme,
  color: "toolDiffRemoved" | "toolDiffAdded" | "toolDiffContext",
  prefix: string,
  lineNum: string,
  content: string,
) {
  return theme.fg(color, `${prefix}${lineNum} `) + content;
}

function renderDiff(diffText: string, theme: Theme, lang?: string): string {
  const lines = diffText.split("\n");
  const tabs = (s: string) => s.replace(/\t/g, "   ");

  const hl = (plain: string) => highlightLine(plain, lang);
  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const parsed = parseDiffLine(lines[i]);
    if (!parsed) {
      result.push(theme.fg("toolDiffContext", lines[i]));
      i++;
      continue;
    }
    if (parsed.prefix === "-") {
      const rem = collectLines(lines, i, "-");
      const add = collectLines(lines, rem.i, "+");
      i = add.i;

      if (rem.collected.length === 1 && add.collected.length === 1) {
        const r = rem.collected[0],
          a = add.collected[0];
        const rPlain = tabs(r.content),
          aPlain = tabs(a.content);
        const { removedLine, addedLine } = renderIntraLineDiff(
          rPlain,
          aPlain,
          hl(rPlain),
          hl(aPlain),
          REMOVED_WORD_BG,
          ADDED_WORD_BG,
          REMOVED_LINE_BG,
          ADDED_LINE_BG,
        );
        result.push(
          fmtLine(theme, "toolDiffRemoved", "-", r.lineNum, removedLine),
        );
        result.push(fmtLine(theme, "toolDiffAdded", "+", a.lineNum, addedLine));
      } else {
        for (const r of rem.collected)
          result.push(
            fmtLine(
              theme,
              "toolDiffRemoved",
              "-",
              r.lineNum,
              hl(tabs(r.content)),
            ),
          );
        for (const a of add.collected)
          result.push(
            fmtLine(
              theme,
              "toolDiffAdded",
              "+",
              a.lineNum,
              hl(tabs(a.content)),
            ),
          );
      }
    } else if (parsed.prefix === "+") {
      result.push(
        fmtLine(
          theme,
          "toolDiffAdded",
          "+",
          parsed.lineNum,
          hl(tabs(parsed.content)),
        ),
      );
      i++;
    } else {
      result.push(
        fmtLine(
          theme,
          "toolDiffContext",
          " ",
          parsed.lineNum,
          hl(tabs(parsed.content)),
        ),
      );
      i++;
    }
  }
  return result.join("\n");
}

class DiffText {
  private text: string;
  private boxBg: string;
  private borderAnsi: string;
  private cachedWidth: number | undefined;
  private cachedLines: string[] | undefined;
  constructor(text: string, boxBg: string, borderAnsi: string) {
    this.text = text;
    this.boxBg = boxBg;
    this.borderAnsi = borderAnsi;
  }
  invalidate() {
    this.cachedWidth = undefined;
    this.cachedLines = undefined;
  }
  render(width: number): string[] {
    if (this.cachedLines && this.cachedWidth === width) {
      return this.cachedLines;
    }
    const sep = this.borderAnsi + "─".repeat(width) + "\x1b[39m";
    const lines = this.text.split("\n").map((line) => {
      const raw = line.replace(STRIP_ANSI, "");
      if (raw.startsWith("+") || raw.startsWith("-")) {
        const bg = raw.startsWith("+") ? ADDED_LINE_BG : REMOVED_LINE_BG;
        const truncated = truncateToWidth(line, width);
        const pad = Math.max(0, width - visibleWidth(truncated));
        return `${bg}${truncated}${" ".repeat(pad)}${this.boxBg}`;
      }
      return truncateToWidth(line, width);
    });
    this.cachedWidth = width;
    this.cachedLines = [sep, ...lines, sep];
    return this.cachedLines;
  }
}

function shortenPath(path: string): string {
  const home = homedir();
  return path.startsWith(home) ? `~${path.slice(home.length)}` : path;
}

export default function (pi: ExtensionAPI) {
  const builtinEdit = createEditTool(process.cwd());

  // Shared between renderCall and renderResult within a single
  // synchronous updateDisplay() cycle.
  let lastEditPath: string | undefined;

  pi.registerTool({
    name: "edit",
    label: builtinEdit.label,
    description: builtinEdit.description,
    parameters: builtinEdit.parameters,

    execute(toolCallId, params, signal, onUpdate, ctx) {
      const tool = createEditTool(ctx.cwd);
      return tool.execute(toolCallId, params, signal, onUpdate);
    },

    renderCall(args, theme) {
      const rawPath = args?.path as string | undefined;
      lastEditPath = rawPath;
      const path = rawPath ? shortenPath(rawPath.replace(/^@/, "")) : "...";
      const display = rawPath
        ? theme.fg("accent", path)
        : theme.fg("toolOutput", "...");
      const title = `${theme.fg("toolTitle", theme.bold("edit"))} ${display}`;
      return {
        invalidate() {},
        render(_width: number) {
          return [title];
        },
      } as any;
    },

    renderResult(result, { isPartial }, theme) {
      const { details, isError } = result as {
        details?: EditToolDetails;
        isError?: boolean;
      };

      if (isPartial) return new Text(theme.fg("warning", "Editing..."), 0, 0);

      const text =
        result.content
          ?.filter((c: any) => c.type === "text")
          .map((c: any) => c.text)
          .join("\n") ?? "";

      if (isError || !details?.diff) {
        return new Text(isError ? theme.fg("error", text) : text, 0, 0);
      }

      const lang = lastEditPath
        ? getLanguageFromPath(lastEditPath.replace(/^@/, ""))
        : undefined;

      const rendered = renderDiff(details.diff, theme, lang);
      const boxBg = theme.getBgAnsi("toolSuccessBg");
      const borderAnsi = theme.getFgAnsi("borderMuted");
      return new DiffText(rendered, boxBg, borderAnsi) as any;
    },
  });
}
