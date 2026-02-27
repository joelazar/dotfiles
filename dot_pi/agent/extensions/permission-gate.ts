/**
 * Permission Gate Extension
 *
 * Prompts for confirmation before running potentially dangerous bash commands.
 *
 * Improvements inspired by Zed's approach:
 *  - Splits shell input into subcommands and evaluates each one.
 *  - Prevents chain bypasses like: `safe && dangerous`.
 *  - Adds hardcoded, non-overridable blocks for catastrophic rm targets.
 */

import path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

type Rule = {
  pattern: RegExp;
  label: string;
};

const CATASTROPHIC_RM_REASON =
  "Blocked by built-in security rule: catastrophic rm target (/, ~, $HOME, ., ..).";

function shellSplitWords(input: string): string[] {
  const words: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (const ch of input) {
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\" && !inSingle) {
      escaped = true;
      continue;
    }

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (!inSingle && !inDouble && /\s/.test(ch)) {
      if (current.length > 0) {
        words.push(current);
        current = "";
      }
      continue;
    }

    current += ch;
  }

  if (escaped) current += "\\";
  if (current.length > 0) words.push(current);
  return words;
}

function splitShellSubcommands(command: string): string[] {
  const commands: string[] = [];
  let current = "";

  let inSingle = false;
  let inDouble = false;
  let escaped = false;
  let subExprDepth = 0;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    const next = command[i + 1];
    const prev = command[i - 1];

    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\" && !inSingle) {
      current += ch;
      escaped = true;
      continue;
    }

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      current += ch;
      continue;
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      current += ch;
      continue;
    }

    if (!inSingle && !inDouble) {
      // Track command/process substitutions so separators inside them don't split.
      if (ch === "(" && (prev === "$" || prev === "<" || prev === ">")) {
        subExprDepth += 1;
        current += ch;
        continue;
      }

      if (ch === ")" && subExprDepth > 0) {
        subExprDepth -= 1;
        current += ch;
        continue;
      }

      if (subExprDepth === 0) {
        const isSingleSep = ch === ";" || ch === "\n";
        const isDoubleSep = (ch === "&" && next === "&") || (ch === "|" && next === "|");
        const isPipeSep = ch === "|";
        const isBackgroundSep = ch === "&";

        if (isSingleSep || isDoubleSep || isPipeSep || isBackgroundSep) {
          const trimmed = current.trim();
          if (trimmed.length > 0) commands.push(trimmed);
          current = "";

          if (isDoubleSep) i += 1;
          continue;
        }
      }
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail.length > 0) commands.push(tail);

  return commands.length > 0 ? commands : [command.trim()].filter(Boolean);
}

function normalizePathLikeToken(token: string): string {
  const raw = token.trim();

  const trimTrailingSlash = (value: string) => {
    if (value === "/") return value;
    return value.replace(/\/+$/, "");
  };

  if (raw.startsWith("${HOME}")) {
    const replaced = `/__HOME__${raw.slice("${HOME}".length)}`;
    const normalized = path.posix.normalize(replaced);
    const mapped = normalized.replace(/^\/__HOME__/, "${HOME}");
    return trimTrailingSlash(mapped || "${HOME}");
  }

  if (raw.startsWith("$HOME")) {
    const replaced = `/__HOME__${raw.slice("$HOME".length)}`;
    const normalized = path.posix.normalize(replaced);
    const mapped = normalized.replace(/^\/__HOME__/, "$HOME");
    return trimTrailingSlash(mapped || "$HOME");
  }

  if (raw === "~" || raw.startsWith("~/")) {
    const replaced = `/__HOME__${raw.slice(1)}`;
    const normalized = path.posix.normalize(replaced);
    const mapped = normalized.replace(/^\/__HOME__/, "~");
    return trimTrailingSlash(mapped || "~");
  }

  const normalized = path.posix.normalize(raw);
  return trimTrailingSlash(normalized || ".");
}

function isCatastrophicPathTarget(token: string): boolean {
  const trimmed = token.trim();
  const normalized = normalizePathLikeToken(trimmed);

  if (/^(\/|~|\$HOME|\$\{HOME\}|\.|\.\.)\/\*$/.test(trimmed)) {
    return true;
  }

  const catastrophicTargets = new Set(["/", "~", "$HOME", "${HOME}", ".", ".."]);
  return catastrophicTargets.has(normalized);
}

function isCatastrophicRm(command: string): boolean {
  const words = shellSplitWords(command);
  if (words.length === 0) return false;

  if (words[0].toLowerCase() !== "rm") return false;

  const pathTokens: string[] = [];
  let sawDoubleDash = false;

  for (const token of words.slice(1)) {
    if (!sawDoubleDash && token === "--") {
      sawDoubleDash = true;
      continue;
    }

    if (!sawDoubleDash && token.startsWith("-")) {
      continue;
    }

    pathTokens.push(token);
  }

  if (pathTokens.length === 0) return false;
  return pathTokens.some(isCatastrophicPathTarget);
}

function collectMatches(subcommands: string[], rules: Rule[]): Array<{ label: string; command: string }> {
  const matches: Array<{ label: string; command: string }> = [];

  for (const sub of subcommands) {
    for (const rule of rules) {
      if (rule.pattern.test(sub)) {
        matches.push({ label: rule.label, command: sub });
      }
    }
  }

  return matches;
}

export default function (pi: ExtensionAPI) {
  const subcommandDangerRules: Rule[] = [
    // File deletion — any rm invocation (with or without flags)
    { pattern: /\brm\s+/i, label: "file deletion (rm)" },

    // Privilege escalation
    { pattern: /\bsudo\b/i, label: "privilege escalation (sudo)" },

    // Dangerous permission changes (777 or world-writable equivalents)
    { pattern: /\b(chmod|chown)\b.*777/i, label: "dangerous permissions (777)" },
    { pattern: /\bchmod\b.*o\+w/i, label: "world-writable permission (o+w)" },

    // Disk / filesystem operations
    { pattern: /\bdd\b.*\bof=/i, label: "disk write (dd)" },
    { pattern: /\b(mkfs|fdisk|parted)\b/i, label: "disk/filesystem operation" },
    { pattern: /\bdiskutil\b.*(erase|format|partition)/i, label: "disk operation (diskutil)" },

    // find-based deletion
    { pattern: /\bfind\b.*-delete\b/i, label: "file deletion (find -delete)" },
    { pattern: /\bfind\b.*-exec\s+rm\b/i, label: "file deletion (find -exec rm)" },

    // Secure / irreversible file wiping
    { pattern: /\bshred\b/i, label: "secure file deletion (shred)" },

    // Git destructive operations
    { pattern: /\bgit\s+clean\b.*-[a-z]*f/i, label: "git clean (removes untracked files)" },
    {
      pattern: /\bgit\s+reset\b.*--hard\b/i,
      label: "git reset --hard (loses uncommitted changes)",
    },

    // Destructive SQL commands
    { pattern: /\b(DROP|TRUNCATE|DELETE\s+FROM)\b/i, label: "destructive SQL statement" },

    // Raw block device writes
    { pattern: />\s*\/dev\/sd[a-z]/i, label: "write to raw block device (/dev/sd*)" },
  ];

  const fullCommandDangerRules: Rule[] = [
    // Remote code execution — piping curl/wget into a shell
    {
      pattern: /\b(curl|wget)\b[^|]*\|\s*(ba)?sh\b/i,
      label: "remote code execution (pipe to shell)",
    },
  ];

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "bash") return undefined;

    const command = String(event.input.command ?? "");
    const subcommands = splitShellSubcommands(command);

    const hardBlockedSubcommand = subcommands.find(isCatastrophicRm);
    if (hardBlockedSubcommand) {
      return {
        block: true,
        reason: `${CATASTROPHIC_RM_REASON} Matched: ${hardBlockedSubcommand}`,
      };
    }

    const subMatches = collectMatches(subcommands, subcommandDangerRules);
    const fullMatches = fullCommandDangerRules
      .filter(({ pattern }) => pattern.test(command))
      .map(({ label }) => ({ label, command }));

    const allMatches = [...subMatches, ...fullMatches];
    if (allMatches.length === 0) return undefined;

    const labels = [...new Set(allMatches.map((m) => m.label))];
    const matchedCommands = [...new Set(allMatches.map((m) => m.command))];

    if (!ctx.hasUI) {
      return {
        block: true,
        reason: `Dangerous command blocked (no UI for confirmation): ${labels.join(", ")}`,
      };
    }

    const matchedPreview = matchedCommands.slice(0, 3).map((cmd) => `  - ${cmd}`).join("\n");
    const extra = matchedCommands.length > 3 ? `\n  - ...and ${matchedCommands.length - 3} more` : "";

    const choice = await ctx.ui.select(
      `⚠️ Potentially dangerous command\n\n  ${command}\n\nReasons:\n  - ${labels.join("\n  - ")}\n\nMatched subcommands:\n${matchedPreview}${extra}\n\nAllow?`,
      ["Yes", "No"],
    );

    if (choice !== "Yes") {
      return { block: true, reason: "Blocked by user" };
    }

    return undefined;
  });
}
