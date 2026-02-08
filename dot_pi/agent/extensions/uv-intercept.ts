import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

type BlockKind = "pip" | "poetry" | "python-pip" | "python-venv";

interface BlockMatch {
  kind: BlockKind;
  executable: string;
}

const COMMAND_SEPARATORS = new Set(["&&", "||", ";", "|", "&"]);
const WRAPPER_COMMANDS = new Set(["sudo", "command", "env", "nohup", "time"]);

function tokenizeShell(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | "`" | null = null;

  const pushCurrent = () => {
    if (current.length > 0) {
      tokens.push(current);
      current = "";
    }
  };

  for (let i = 0; i < command.length; i++) {
    const char = command[i];
    const next = i + 1 < command.length ? command[i + 1] : "";

    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === " " || char === "\t" || char === "\n") {
      pushCurrent();
      continue;
    }

    if ((char === "&" || char === "|") && next === char) {
      pushCurrent();
      tokens.push(`${char}${char}`);
      i++;
      continue;
    }

    if (char === ";" || char === "|" || char === "&") {
      pushCurrent();
      tokens.push(char);
      continue;
    }

    current += char;
  }

  pushCurrent();
  return tokens;
}

function splitIntoSegments(tokens: string[]): string[][] {
  const segments: string[][] = [];
  let current: string[] = [];

  for (const token of tokens) {
    if (COMMAND_SEPARATORS.has(token)) {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
      continue;
    }
    current.push(token);
  }

  if (current.length > 0) {
    segments.push(current);
  }

  return segments;
}

function extractExecutableName(token: string): string {
  const normalized = token.replaceAll("\\", "/");
  const parts = normalized.split("/");
  return (parts[parts.length - 1] || normalized).toLowerCase();
}

function normalizeModuleName(token: string): string {
  return token.trim().toLowerCase();
}

function isEnvAssignment(token: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*=.*/.test(token);
}

function detectBlockedUsage(segmentTokens: string[]): BlockMatch | null {
  if (segmentTokens.length === 0) return null;

  let index = 0;
  while (
    index < segmentTokens.length &&
    isEnvAssignment(segmentTokens[index])
  ) {
    index++;
  }
  while (
    index < segmentTokens.length &&
    WRAPPER_COMMANDS.has(extractExecutableName(segmentTokens[index]))
  ) {
    index++;
  }
  if (index >= segmentTokens.length) return null;

  const executable = extractExecutableName(segmentTokens[index]);

  if (executable === "pip" || executable === "pip3") {
    return { kind: "pip", executable };
  }
  if (executable === "poetry") {
    return { kind: "poetry", executable };
  }
  if (executable !== "python" && executable !== "python3") {
    return null;
  }

  for (let i = index + 1; i < segmentTokens.length; i++) {
    const token = segmentTokens[i];

    if (token === "-m" && i + 1 < segmentTokens.length) {
      const moduleName = normalizeModuleName(segmentTokens[i + 1]);
      if (moduleName === "pip" || moduleName === "pip3") {
        return { kind: "python-pip", executable };
      }
      if (moduleName === "venv") {
        return { kind: "python-venv", executable };
      }
    }

    if (token.startsWith("-m") && token.length > 2) {
      const moduleName = normalizeModuleName(token.slice(2));
      if (moduleName === "pip" || moduleName === "pip3") {
        return { kind: "python-pip", executable };
      }
      if (moduleName === "venv") {
        return { kind: "python-venv", executable };
      }
    }
  }

  return null;
}

function getBlockMessage(match: BlockMatch): string {
  switch (match.kind) {
    case "pip":
      return `${match.executable} is disabled. Use uv instead:\n\n- Install for script: uv run --with PACKAGE python script.py\n- Add dependency: uv add PACKAGE`;
    case "poetry":
      return "poetry is disabled. Use uv instead (uv init, uv add, uv sync, uv run).";
    case "python-pip":
      return `${match.executable} -m pip is disabled. Use uv instead:\n\n- Install for script: uv run --with PACKAGE python script.py\n- Add dependency: uv add PACKAGE`;
    case "python-venv":
      return `${match.executable} -m venv is disabled. Use uv venv instead.`;
  }
}

function extractBashCommand(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const command = (input as Record<string, unknown>).command;
  return typeof command === "string" ? command : undefined;
}

export default function uvInterceptExtension(pi: ExtensionAPI) {
  pi.on("tool_call", async (event, _ctx) => {
    if (event.toolName !== "bash") return undefined;

    const command = extractBashCommand(event.input);
    if (!command) return undefined;

    const tokens = tokenizeShell(command);
    const segments = splitIntoSegments(tokens);

    for (const segment of segments) {
      const match = detectBlockedUsage(segment);
      if (!match) continue;
      return {
        block: true,
        reason: getBlockMessage(match),
      };
    }

    return undefined;
  });

  pi.registerCommand("uv-intercept", {
    description: "Show UV interception status",
    handler: async (_args, ctx) => {
      const lines = [
        "UV Interception",
        "enabled: true",
        "mode: bash tool_call guard (extension-controlled)",
      ];
      ctx.ui.notify(lines.join("\n"), "info");
    },
  });
}
