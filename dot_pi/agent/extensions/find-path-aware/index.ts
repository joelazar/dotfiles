import { existsSync, statSync } from "node:fs";
import path from "node:path";
import type { ExtensionAPI, FindToolInput } from "@mariozechner/pi-coding-agent";
import {
  createFindToolDefinition,
  DEFAULT_MAX_BYTES,
  formatSize,
  truncateHead,
} from "@mariozechner/pi-coding-agent";

const DEFAULT_LIMIT = 1000;

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

function normalizeSearchPath(value?: string): string {
  if (!value) return ".";
  return value.startsWith("@") ? value.slice(1) : value;
}

function normalizePattern(pattern: string): string {
  return pattern.replace(/\\/g, "/").replace(/^\.\//, "");
}

function isPathAwarePattern(pattern: string): boolean {
  return pattern.includes("/");
}

function needsRecursivePrefix(pattern: string): boolean {
  return !pattern.startsWith("**/") && !pattern.startsWith("/");
}

function buildPatternVariants(pattern: string): string[] {
  const normalized = normalizePattern(pattern);
  if (!isPathAwarePattern(normalized)) {
    return [normalized];
  }

  if (needsRecursivePrefix(normalized)) {
    return [normalized, `**/${normalized}`];
  }

  return [normalized];
}

async function runFd(
  pi: ExtensionAPI,
  pattern: string,
  searchPath: string,
  limit: number,
  signal?: AbortSignal,
): Promise<string[]> {
  const args = [
    "--glob",
    "--color=never",
    "--hidden",
    "--exclude",
    ".git",
    "--exclude",
    "node_modules",
    "--max-results",
    String(limit),
  ];

  if (isPathAwarePattern(pattern)) {
    args.push("--full-path");
  }

  args.push(pattern, searchPath);

  const result = await pi.exec("fd", args, { signal });
  const output = result.stdout?.trim() ?? "";

  if (result.code !== 0 && !output) {
    const error = result.stderr?.trim() || `fd exited with code ${result.code}`;
    throw new Error(error);
  }

  if (!output) {
    return [];
  }

  return output
    .split("\n")
    .map((line) => line.replace(/\r$/, "").trim())
    .filter(Boolean);
}

function relativizeResults(searchPath: string, matches: string[]): string[] {
  return matches.map((match) => {
    let relativePath = match.startsWith(searchPath)
      ? match.slice(searchPath.length + 1)
      : path.relative(searchPath, match);

    relativePath = relativePath.replace(/^[.][\\/]/, "");
    return toPosixPath(relativePath);
  });
}

export default function findPathAware(pi: ExtensionAPI): void {
  const base = createFindToolDefinition(process.cwd());

  pi.registerTool({
    ...base,
    description:
      "Search for files by glob pattern. Returns matching file paths relative to the search directory. Respects .gitignore. Path-aware glob patterns like 'internal/utils/*.go' and '**/utils/**' are supported.",

    async execute(_toolCallId, params: FindToolInput, signal, _onUpdate, ctx) {
      const rawSearchPath = normalizeSearchPath(params.path);
      const searchPath = path.resolve(ctx.cwd, rawSearchPath);
      const effectiveLimit = params.limit ?? DEFAULT_LIMIT;

      if (!existsSync(searchPath)) {
        throw new Error(`Path not found: ${searchPath}`);
      }

      const stats = statSync(searchPath);
      const searchRoot = stats.isDirectory() ? searchPath : path.dirname(searchPath);
      const variants = buildPatternVariants(params.pattern);
      const seen = new Set<string>();

      for (const variant of variants) {
        const matches = await runFd(pi, variant, searchRoot, effectiveLimit, signal);
        for (const match of relativizeResults(searchRoot, matches)) {
          seen.add(match);
          if (seen.size >= effectiveLimit) {
            break;
          }
        }
        if (seen.size >= effectiveLimit || seen.size > 0) {
          break;
        }
      }

      if (seen.size === 0) {
        return {
          content: [{ type: "text", text: "No files found matching pattern" }],
          details: undefined,
        };
      }

      const results = Array.from(seen);
      const rawOutput = results.join("\n");
      const truncation = truncateHead(rawOutput, { maxLines: Number.MAX_SAFE_INTEGER });
      let resultOutput = truncation.content;
      const details: { resultLimitReached?: number; truncation?: typeof truncation } = {};
      const notices: string[] = [];

      if (results.length >= effectiveLimit) {
        notices.push(
          `${effectiveLimit} results limit reached. Use limit=${effectiveLimit * 2} for more, or refine pattern`,
        );
        details.resultLimitReached = effectiveLimit;
      }

      if (truncation.truncated) {
        notices.push(`${formatSize(DEFAULT_MAX_BYTES)} limit reached`);
        details.truncation = truncation;
      }

      if (notices.length > 0) {
        resultOutput += `\n\n[${notices.join(". ")}]`;
      }

      return {
        content: [{ type: "text", text: resultOutput }],
        details: Object.keys(details).length > 0 ? details : undefined,
      };
    },
  });
}
