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
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type Rule = {
  pattern: RegExp;
  label: string;
};

const CATASTROPHIC_RM_REASON =
  "Blocked by built-in security rule: catastrophic rm target (/, ~, $HOME, ., ..).";

const HOME_DIR = process.env.HOME ? path.resolve(process.env.HOME) : null;

const SAFE_GENERATED_DELETE_BASENAMES = new Set([
  "node_modules",
  ".bin",
  "dist",
  "build",
  "coverage",
  ".cache",
  "session-transcripts",
]);

const DESTRUCTIVE_SQL_PATTERN =
  /\b(?:DROP\s+(?:TABLE|DATABASE|SCHEMA|VIEW|INDEX|ROLE|USER|EXTENSION)\b|TRUNCATE(?:\s+TABLE)?\b|DELETE\s+FROM\b)/i;

const SQL_CLIENT_PATTERN = /\b(psql|pgcli|mysql|mariadb|sqlite3|duckdb|sqlcmd|clickhouse-client)\b/i;

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
  const parsed = parseRmCommand(command);
  if (!parsed) return false;

  const { pathTokens } = parsed;
  if (pathTokens.length === 0) return false;
  return pathTokens.some(isCatastrophicPathTarget);
}

function parseRmCommand(command: string): { optionTokens: string[]; pathTokens: string[] } | null {
  const words = shellSplitWords(command);
  if (words.length === 0) return null;

  if (words[0].toLowerCase() !== "rm") return null;

  const optionTokens: string[] = [];
  const pathTokens: string[] = [];
  let sawDoubleDash = false;

  for (const token of words.slice(1)) {
    if (!sawDoubleDash && token === "--") {
      sawDoubleDash = true;
      continue;
    }

    if (!sawDoubleDash && token.startsWith("-")) {
      optionTokens.push(token);
      continue;
    }

    pathTokens.push(token);
  }

  return { optionTokens, pathTokens };
}

function hasShellGlob(token: string): boolean {
  return /[*?[\]]/.test(token);
}

function resolvePathLikeTokenAbsolute(token: string, cwd: string): string | null {
  const raw = token.trim();
  if (raw.length === 0) return null;

  if (hasShellGlob(raw)) return null;

  if (/\$\{(?!HOME\})[^}]+\}/.test(raw)) return null;
  if (/\$(?!HOME\b)[A-Za-z_][A-Za-z0-9_]*/.test(raw)) return null;

  if (raw.startsWith("${HOME}")) {
    if (!HOME_DIR) return null;
    return path.resolve(HOME_DIR, `.${raw.slice("${HOME}".length)}`);
  }

  if (raw.startsWith("$HOME")) {
    if (!HOME_DIR) return null;
    return path.resolve(HOME_DIR, `.${raw.slice("$HOME".length)}`);
  }

  if (raw === "~" || raw.startsWith("~/")) {
    if (!HOME_DIR) return null;
    return path.resolve(HOME_DIR, `.${raw.slice(1)}`);
  }

  if (path.isAbsolute(raw)) {
    return path.resolve(raw);
  }

  return path.resolve(cwd, raw);
}

function isWithinPath(parent: string, candidate: string): boolean {
  const normalizedParent = path.resolve(parent);
  const normalizedCandidate = path.resolve(candidate);

  if (normalizedParent === normalizedCandidate) return true;

  const relative = path.relative(normalizedParent, normalizedCandidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function isManagedDeletePath(absPath: string): boolean {
  if (!HOME_DIR) return false;

  const managedRoots = [
    path.join(HOME_DIR, ".pi", "agent", "extensions"),
    path.join(HOME_DIR, ".pi", "agent", "git"),
    path.join(HOME_DIR, ".pi", "agent", "skills"),
    path.join(HOME_DIR, ".agents", "skills"),
    path.join(HOME_DIR, ".claude", "commands"),
    path.join(HOME_DIR, ".claude", "skills"),
    path.join(HOME_DIR, ".local", "share", "chezmoi"),
  ];

  return managedRoots.some((root) => absPath !== root && isWithinPath(root, absPath));
}

function isClearlyGeneratedDeletePath(absPath: string): boolean {
  const normalized = path.resolve(absPath);

  if (
    isWithinPath("/tmp", normalized)
    || isWithinPath("/private/tmp", normalized)
    || isWithinPath("/var/folders", normalized)
  ) {
    return true;
  }

  const segments = normalized.split(path.sep).filter(Boolean);
  return segments.some((segment) => SAFE_GENERATED_DELETE_BASENAMES.has(segment));
}

function isRmRecursiveFlag(token: string): boolean {
  if (token === "--recursive") return true;
  return /^-[^-]+$/.test(token) && /[rR]/.test(token);
}

function isRmForceFlag(token: string): boolean {
  if (token === "--force") return true;
  return /^-[^-]+$/.test(token) && token.slice(1).includes("f");
}

function deletesTopLevelProjectPath(absPath: string, cwd: string): boolean {
  if (!isWithinPath(cwd, absPath)) return false;

  const relative = path.relative(path.resolve(cwd), absPath);
  const segments = relative.split(path.sep).filter(Boolean);
  return segments.length <= 1;
}

function isRiskyRmSubcommand(command: string, cwd: string): boolean {
  const parsed = parseRmCommand(command);
  if (!parsed) return false;

  const { optionTokens, pathTokens } = parsed;
  if (pathTokens.length === 0) return false;

  if (pathTokens.some(isCatastrophicPathTarget)) return true;
  if (pathTokens.some(hasShellGlob)) return true;

  const resolvedTargets = pathTokens.map((token) => resolvePathLikeTokenAbsolute(token, cwd));
  if (resolvedTargets.some((target) => !target)) return true;

  const targets = resolvedTargets as string[];
  const allSafeTargets = targets.every(
    (target) => isWithinPath(cwd, target) || isManagedDeletePath(target) || isClearlyGeneratedDeletePath(target),
  );

  if (!allSafeTargets) return true;
  if (pathTokens.length > 8) return true;

  const hasRecursive = optionTokens.some(isRmRecursiveFlag);
  if (
    hasRecursive
    && targets.some((target) => deletesTopLevelProjectPath(target, cwd) && !isClearlyGeneratedDeletePath(target))
  ) {
    return true;
  }

  const hasForce = optionTokens.some(isRmForceFlag);
  return hasForce && pathTokens.length > 5;
}

function isDestructiveSqlSubcommand(command: string): boolean {
  return SQL_CLIENT_PATTERN.test(command) && DESTRUCTIVE_SQL_PATTERN.test(command);
}

function resolveCdTarget(command: string, cwd: string): string | null {
  const words = shellSplitWords(command);
  if (words.length === 0 || words[0].toLowerCase() !== "cd") return null;

  const rawTarget = words[1] ?? "~";
  if (rawTarget === "-") return null;

  return resolvePathLikeTokenAbsolute(rawTarget, cwd);
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

function collectCustomMatches(
  subcommands: string[],
  cwd: string,
): Array<{ label: string; command: string }> {
  const matches: Array<{ label: string; command: string }> = [];
  let effectiveCwd = cwd;

  for (const sub of subcommands) {
    if (isRiskyRmSubcommand(sub, effectiveCwd)) {
      matches.push({ label: "file deletion (rm)", command: sub });
    }

    if (isDestructiveSqlSubcommand(sub)) {
      matches.push({ label: "destructive SQL statement", command: sub });
    }

    const nextCwd = resolveCdTarget(sub, effectiveCwd);
    if (nextCwd) {
      effectiveCwd = nextCwd;
    }
  }

  return matches;
}

export default function (pi: ExtensionAPI) {
  const subcommandDangerRules: Rule[] = [
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
    const customMatches = collectCustomMatches(subcommands, ctx.cwd);
    const fullMatches = fullCommandDangerRules
      .filter(({ pattern }) => pattern.test(command))
      .map(({ label }) => ({ label, command }));

    const allMatches = [...subMatches, ...customMatches, ...fullMatches];
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
