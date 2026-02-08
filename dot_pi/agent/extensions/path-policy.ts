/**
 * Path Policy Extension
 *
 * Blocks read/edit/write access for selected path patterns without enabling
 * full OS-level sandboxing.
 *
 * Config files (merged, project takes precedence):
 * - ~/.pi/agent/path-policy.json (global)
 * - <cwd>/.pi/path-policy.json (project-local)
 *
 * Example .pi/path-policy.json:
 * {
 *   "enabled": true,
 *   "blockedPaths": [".env", ".env.*", "secrets/", "config/private.json"],
 *   "blockedTools": ["read", "edit", "write"],
 *   "guardBash": true,
 *   "audit": true
 * }
 */

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, resolve } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

type BlockedTool = "read" | "edit" | "write";
type PolicyDecision = {
  blocked: boolean;
  rule?: string;
  normalizedPath: string;
};

interface PathPolicyConfig {
  enabled: boolean;
  blockedPaths: string[];
  blockedTools: BlockedTool[];
  guardBash: boolean;
  audit: boolean;
}

interface CompiledRule {
  raw: string;
  normalized: string;
  kind: "exact" | "prefix" | "glob";
  regex?: RegExp;
}

const BLOCKED_TOOL_VALUES: readonly BlockedTool[] = ["read", "edit", "write"];
const LOG_FILE = join(homedir(), ".pi", "agent", "path-policy.log");

const DEFAULT_CONFIG: PathPolicyConfig = {
  enabled: true,
  blockedPaths: [".env", ".env.*", "secrets/"],
  blockedTools: ["read", "edit", "write"],
  guardBash: false,
  audit: false,
};

const BASH_FILE_OP_HINT =
  /\b(cat|less|more|head|tail|grep|rg|sed|awk|tee|cp|mv|rm|touch|truncate|nano|vim|vi)\b|>>?|<</;

function normalizePath(value: string): string {
  let normalized = value.trim().replaceAll("\\", "/");
  while (normalized.includes("//")) {
    normalized = normalized.replaceAll("//", "/");
  }
  if (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileRule(pattern: string): CompiledRule | null {
  const raw = pattern.trim();
  if (!raw) return null;

  const normalized = normalizePath(raw);
  if (!normalized) return null;

  if (normalized.includes("*")) {
    const regexSource = normalized.split("*").map(escapeRegExp).join(".*");
    return {
      raw,
      normalized,
      kind: "glob",
      regex: new RegExp(`^${regexSource}$`),
    };
  }

  if (raw.endsWith("/")) {
    return { raw, normalized, kind: "prefix" };
  }

  return { raw, normalized, kind: "exact" };
}

function matchesRule(rule: CompiledRule, candidate: string): boolean {
  switch (rule.kind) {
    case "exact":
      return candidate === rule.normalized;
    case "prefix":
      return (
        candidate === rule.normalized ||
        candidate.startsWith(`${rule.normalized}/`)
      );
    case "glob":
      return rule.regex?.test(candidate) ?? false;
  }
}

function isBlockedTool(value: string): value is BlockedTool {
  return BLOCKED_TOOL_VALUES.includes(value as BlockedTool);
}

function parseStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim());
  return result.length > 0 ? result : [];
}

function parseBlockedTools(value: unknown): BlockedTool[] | undefined {
  const values = parseStringArray(value);
  if (values === undefined) return undefined;
  const tools = values.filter((tool): tool is BlockedTool =>
    isBlockedTool(tool),
  );
  return tools.length > 0 ? tools : [];
}

function parseConfig(raw: unknown): Partial<PathPolicyConfig> {
  if (!raw || typeof raw !== "object") return {};

  const obj = raw as Record<string, unknown>;
  const blockedPaths = parseStringArray(obj.blockedPaths);
  const blockedTools = parseBlockedTools(obj.blockedTools);

  return {
    enabled: typeof obj.enabled === "boolean" ? obj.enabled : undefined,
    blockedPaths,
    blockedTools,
    guardBash: typeof obj.guardBash === "boolean" ? obj.guardBash : undefined,
    audit: typeof obj.audit === "boolean" ? obj.audit : undefined,
  };
}

function mergeConfig(
  base: PathPolicyConfig,
  overrides: Partial<PathPolicyConfig>,
): PathPolicyConfig {
  return {
    enabled: overrides.enabled ?? base.enabled,
    blockedPaths: overrides.blockedPaths ?? base.blockedPaths,
    blockedTools: overrides.blockedTools ?? base.blockedTools,
    guardBash: overrides.guardBash ?? base.guardBash,
    audit: overrides.audit ?? base.audit,
  };
}

function loadConfig(cwd: string): PathPolicyConfig {
  const globalPath = join(homedir(), ".pi", "agent", "path-policy.json");
  const projectPath = join(cwd, ".pi", "path-policy.json");

  let globalConfig: Partial<PathPolicyConfig> = {};
  let projectConfig: Partial<PathPolicyConfig> = {};

  if (existsSync(globalPath)) {
    try {
      globalConfig = parseConfig(JSON.parse(readFileSync(globalPath, "utf-8")));
    } catch (error) {
      console.error(`Warning: failed to parse ${globalPath}: ${error}`);
    }
  }

  if (existsSync(projectPath)) {
    try {
      projectConfig = parseConfig(
        JSON.parse(readFileSync(projectPath, "utf-8")),
      );
    } catch (error) {
      console.error(`Warning: failed to parse ${projectPath}: ${error}`);
    }
  }

  return mergeConfig(mergeConfig(DEFAULT_CONFIG, globalConfig), projectConfig);
}

function resolveCandidates(cwd: string, inputPath: string): string[] {
  const absolute = normalizePath(resolve(cwd, inputPath));
  const rel = normalizePath(relative(cwd, absolute));

  const candidates = new Set<string>();
  candidates.add(absolute);

  const isOutsideWorkspace =
    rel === ".." ||
    rel.startsWith("../") ||
    rel === "" ||
    rel.startsWith("..\\") ||
    rel === ".";
  if (!isOutsideWorkspace) {
    candidates.add(rel);
  }

  return Array.from(candidates);
}

function evaluatePath(
  path: string,
  cwd: string,
  rules: CompiledRule[],
): PolicyDecision {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) {
    return { blocked: false, normalizedPath };
  }

  const candidates = resolveCandidates(cwd, path);

  for (const rule of rules) {
    for (const candidate of candidates) {
      if (matchesRule(rule, candidate)) {
        return {
          blocked: true,
          rule: rule.raw,
          normalizedPath: candidate,
        };
      }
    }
  }

  return { blocked: false, normalizedPath };
}

function logDecision(
  toolName: string,
  path: string,
  allowed: boolean,
  reason?: string,
) {
  const timestamp = new Date().toISOString();
  const status = allowed ? "ALLOWED" : "BLOCKED";
  const reasonSuffix = reason ? ` (${reason})` : "";
  const line = `[${timestamp}] ${status} ${toolName}: ${path}${reasonSuffix}\n`;

  try {
    appendFileSync(LOG_FILE, line);
  } catch {
    // Best-effort logging only.
  }
}

function extractPathFromInput(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const maybePath = (input as Record<string, unknown>).path;
  return typeof maybePath === "string" ? maybePath : undefined;
}

function extractCommandFromInput(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const maybeCommand = (input as Record<string, unknown>).command;
  return typeof maybeCommand === "string" ? maybeCommand : undefined;
}

function tokenizeShellCommand(command: string): string[] {
  const matches = command.match(/"[^"]*"|'[^']*'|`[^`]*`|\S+/g) ?? [];
  return matches.map((token) => {
    if (token.length >= 2) {
      const first = token[0];
      const last = token[token.length - 1];
      if (
        (first === '"' && last === '"') ||
        (first === "'" && last === "'") ||
        (first === "`" && last === "`")
      ) {
        return token.slice(1, -1);
      }
    }
    return token;
  });
}

function extractPossiblePathsFromCommand(command: string): string[] {
  const shellMetas = new Set(["|", "||", "&&", ";", "(", ")"]);
  const tokens = tokenizeShellCommand(command);
  const paths: string[] = [];

  for (const token of tokens) {
    if (!token || shellMetas.has(token) || token.startsWith("-")) {
      continue;
    }

    if (token.startsWith(">") || token.startsWith("<")) {
      const redirected = token.slice(1);
      if (redirected) paths.push(redirected);
      continue;
    }

    const equalsIndex = token.indexOf("=");
    if (equalsIndex > 0 && equalsIndex < token.length - 1) {
      const rhs = token.slice(equalsIndex + 1);
      if (rhs.includes("/") || rhs.startsWith(".") || rhs.includes(".")) {
        paths.push(rhs);
      }
      continue;
    }

    if (token.includes("/") || token.startsWith(".") || token.includes(".")) {
      paths.push(token);
    }
  }

  return paths;
}

export default function pathPolicyExtension(pi: ExtensionAPI) {
  let config: PathPolicyConfig = DEFAULT_CONFIG;
  let rules: CompiledRule[] = DEFAULT_CONFIG.blockedPaths
    .map(compileRule)
    .filter((rule): rule is CompiledRule => rule !== null);

  pi.on("session_start", async (_event, ctx) => {
    config = loadConfig(ctx.cwd);
    rules = config.blockedPaths
      .map(compileRule)
      .filter((rule): rule is CompiledRule => rule !== null);
  });

  pi.on("tool_call", async (event, ctx) => {
    if (!config.enabled) return undefined;

    if (
      isBlockedTool(event.toolName) &&
      config.blockedTools.includes(event.toolName)
    ) {
      const path = extractPathFromInput(event.input);
      if (!path) return undefined;

      const decision = evaluatePath(path, ctx.cwd, rules);
      if (!decision.blocked) {
        if (config.audit)
          logDecision(event.toolName, decision.normalizedPath || path, true);
        return undefined;
      }

      const reason = `Path "${path}" matches blocked rule "${decision.rule}"`;
      if (config.audit)
        logDecision(
          event.toolName,
          decision.normalizedPath || path,
          false,
          reason,
        );
      if (ctx.hasUI) {
        ctx.ui.notify(`Blocked ${event.toolName}: ${path}`, "warning");
      }
      return { block: true, reason };
    }

    if (config.guardBash && event.toolName === "bash") {
      const command = extractCommandFromInput(event.input);
      if (!command || !BASH_FILE_OP_HINT.test(command)) return undefined;

      const candidatePaths = extractPossiblePathsFromCommand(command);
      for (const candidatePath of candidatePaths) {
        const decision = evaluatePath(candidatePath, ctx.cwd, rules);
        if (!decision.blocked) continue;

        const reason = `bash command touches blocked path "${candidatePath}" (rule "${decision.rule}")`;
        if (config.audit) logDecision("bash", candidatePath, false, reason);
        if (ctx.hasUI) {
          ctx.ui.notify(
            `Blocked bash path access: ${candidatePath}`,
            "warning",
          );
        }
        return { block: true, reason };
      }

      if (config.audit) logDecision("bash", "(no blocked paths)", true);
    }

    return undefined;
  });

  pi.registerCommand("path-policy", {
    description: "Show active path-policy configuration",
    handler: async (_args, ctx) => {
      const tools = config.blockedTools.join(", ") || "(none)";
      const sortedPaths = [...config.blockedPaths].sort((a, b) =>
        a.localeCompare(b),
      );
      const pathLines =
        sortedPaths.length > 0
          ? sortedPaths.map((path) => `  - ${path}`)
          : ["  (none)"];

      const lines = [
        "Path Policy",
        `enabled: ${config.enabled}`,
        `blockedTools: ${tools}`,
        "blockedPaths:",
        ...pathLines,
        `guardBash: ${config.guardBash}`,
        `audit: ${config.audit}`,
      ];
      ctx.ui.notify(lines.join("\n"), "info");
    },
  });

  pi.registerCommand("path-policy-test", {
    description:
      "Test whether a path is blocked (usage: /path-policy-test <path>)",
    handler: async (args, ctx) => {
      const path = args.trim();
      if (!path) {
        ctx.ui.notify("Usage: /path-policy-test <path>", "warning");
        return;
      }

      const decision = evaluatePath(path, ctx.cwd, rules);
      if (decision.blocked) {
        ctx.ui.notify(`BLOCKED: ${path} (rule: ${decision.rule})`, "warning");
        return;
      }

      ctx.ui.notify(`ALLOWED: ${path}`, "info");
    },
  });
}
