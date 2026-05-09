// Source: mitsuhiko/agent-stuff (https://github.com/mitsuhiko/agent-stuff)
//   Path: extensions/context.ts
/**
 * /context
 *
 * Small TUI view showing what's loaded/available:
 * - extensions (best-effort from registered extension slash commands)
 * - skills
 * - project context files (AGENTS.md / CLAUDE.md)
 * - current context window usage + session totals (tokens/cost)
 */

import type {
  BeforeAgentStartEvent,
  BuildSystemPromptOptions,
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
  Skill,
  ToolResultEvent,
} from "@earendil-works/pi-coding-agent";
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import {
  Container,
  Key,
  Text,
  matchesKey,
  type Component,
  type TUI,
} from "@earendil-works/pi-tui";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";

function formatUsd(cost: number): string {
  if (!Number.isFinite(cost) || cost <= 0) return "$0.00";
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(4)}`;
}

function estimateTokens(text: string): number {
  // Deliberately fuzzy (good enough for “how big-ish is this”).
  return Math.max(0, Math.ceil(text.length / 4));
}

function normalizeReadPath(inputPath: string, cwd: string): string {
  // Similar to pi's resolveToCwd/resolveReadPath, but simplified.
  let p = inputPath;
  if (p.startsWith("@")) p = p.slice(1);
  if (p === "~") p = os.homedir();
  else if (p.startsWith("~/")) p = path.join(os.homedir(), p.slice(2));
  if (!path.isAbsolute(p)) p = path.resolve(cwd, p);
  return path.resolve(p);
}

function getAgentDir(): string {
  // Mirrors pi's behavior reasonably well.
  const envCandidates = ["PI_CODING_AGENT_DIR", "TAU_CODING_AGENT_DIR"];
  let envDir: string | undefined;
  for (const k of envCandidates) {
    if (process.env[k]) {
      envDir = process.env[k];
      break;
    }
  }
  if (!envDir) {
    for (const [k, v] of Object.entries(process.env)) {
      if (k.endsWith("_CODING_AGENT_DIR") && v) {
        envDir = v;
        break;
      }
    }
  }

  if (envDir) {
    if (envDir === "~") return os.homedir();
    if (envDir.startsWith("~/"))
      return path.join(os.homedir(), envDir.slice(2));
    return envDir;
  }
  return path.join(os.homedir(), ".pi", "agent");
}

async function readFileIfExists(
  filePath: string,
): Promise<{ path: string; content: string; bytes: number } | null> {
  if (!existsSync(filePath)) return null;
  try {
    const buf = await fs.readFile(filePath);
    return {
      path: filePath,
      content: buf.toString("utf8"),
      bytes: buf.byteLength,
    };
  } catch {
    return null;
  }
}

async function loadProjectContextFiles(
  cwd: string,
): Promise<Array<{ path: string; tokens: number; bytes: number }>> {
  const out: Array<{ path: string; tokens: number; bytes: number }> = [];
  const seen = new Set<string>();

  const loadFromDir = async (dir: string) => {
    for (const name of ["AGENTS.md", "CLAUDE.md"]) {
      const p = path.join(dir, name);
      const f = await readFileIfExists(p);
      if (f && !seen.has(f.path)) {
        seen.add(f.path);
        out.push({
          path: f.path,
          tokens: estimateTokens(f.content),
          bytes: f.bytes,
        });
        // pi loads at most one of those per dir
        return;
      }
    }
  };

  await loadFromDir(getAgentDir());

  // Ancestors: root → cwd (same order as pi)
  const stack: string[] = [];
  let current = path.resolve(cwd);
  while (true) {
    stack.push(current);
    const parent = path.resolve(current, "..");
    if (parent === current) break;
    current = parent;
  }
  stack.reverse();
  for (const dir of stack) await loadFromDir(dir);

  return out;
}

function parseDisableModelInvocationFromFrontmatter(
  content: string,
): boolean {
  // Minimal YAML scan: look for `disable-model-invocation: true` inside the
  // leading `---` ... `---` block. Avoids pulling in a YAML parser.
  if (!content.startsWith("---")) return false;
  const end = content.indexOf("\n---", 3);
  if (end < 0) return false;
  const fm = content.slice(3, end);
  for (const raw of fm.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^disable-model-invocation\s*:\s*(\S+)/i);
    if (m) return m[1].toLowerCase() === "true";
  }
  return false;
}

async function readDisableModelInvocation(
  filePath: string,
): Promise<boolean> {
  if (!filePath || !existsSync(filePath)) return false;
  try {
    // Frontmatter sits at the top; read a small slice instead of the full file.
    const fh = await fs.open(filePath, "r");
    try {
      const buf = Buffer.alloc(4096);
      const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
      return parseDisableModelInvocationFromFrontmatter(
        buf.slice(0, bytesRead).toString("utf8"),
      );
    } finally {
      await fh.close();
    }
  } catch {
    return false;
  }
}

function normalizeSkillName(name: string): string {
  return name.startsWith("skill:") ? name.slice("skill:".length) : name;
}

type SkillIndexEntry = {
  name: string;
  skillFilePath: string;
  skillDir: string;
};

function buildSkillIndex(pi: ExtensionAPI, cwd: string): SkillIndexEntry[] {
  return pi
    .getCommands()
    .filter((c) => c.source === "skill")
    .map((c) => {
      const p = c.sourceInfo?.path
        ? normalizeReadPath(c.sourceInfo.path, cwd)
        : "";
      return {
        name: normalizeSkillName(c.name),
        skillFilePath: p,
        skillDir: p ? path.dirname(p) : "",
      };
    })
    .filter((x) => x.name && x.skillDir);
}

function skillIndexFromPromptOptions(
  skills: Skill[] | undefined,
): SkillIndexEntry[] {
  if (!skills?.length) return [];
  return skills.map((s) => ({
    name: normalizeSkillName(s.name),
    skillFilePath: path.resolve(s.filePath),
    skillDir: path.resolve(s.baseDir),
  }));
}

const SKILL_LOADED_ENTRY = "context:skill_loaded";

type SkillLoadedEntryData = {
  name: string;
  path: string;
};

function getLoadedSkillsFromSession(ctx: ExtensionContext): Set<string> {
  const out = new Set<string>();
  for (const e of ctx.sessionManager.getEntries()) {
    if ((e as any)?.type !== "custom") continue;
    if ((e as any)?.customType !== SKILL_LOADED_ENTRY) continue;
    const data = (e as any)?.data as SkillLoadedEntryData | undefined;
    if (data?.name) out.add(data.name);
  }
  return out;
}

function extractCostTotal(usage: any): number {
  if (!usage) return 0;
  const c = usage?.cost;
  if (typeof c === "number") return Number.isFinite(c) ? c : 0;
  if (typeof c === "string") {
    const n = Number(c);
    return Number.isFinite(n) ? n : 0;
  }
  const t = c?.total;
  if (typeof t === "number") return Number.isFinite(t) ? t : 0;
  if (typeof t === "string") {
    const n = Number(t);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function sumSessionUsage(ctx: ExtensionCommandContext): {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  totalCost: number;
} {
  let input = 0;
  let output = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  let totalCost = 0;

  for (const entry of ctx.sessionManager.getEntries()) {
    if ((entry as any)?.type !== "message") continue;
    const msg = (entry as any)?.message;
    if (!msg || msg.role !== "assistant") continue;
    const usage = msg.usage;
    if (!usage) continue;
    input += Number(usage.inputTokens ?? 0) || 0;
    output += Number(usage.outputTokens ?? 0) || 0;
    cacheRead += Number(usage.cacheRead ?? 0) || 0;
    cacheWrite += Number(usage.cacheWrite ?? 0) || 0;
    totalCost += extractCostTotal(usage);
  }

  return {
    input,
    output,
    cacheRead,
    cacheWrite,
    totalTokens: input + output + cacheRead + cacheWrite,
    totalCost,
  };
}

function shortenPath(p: string, cwd: string): string {
  const rp = path.resolve(p);
  const rc = path.resolve(cwd);
  if (rp === rc) return ".";
  if (rp.startsWith(rc + path.sep)) return "./" + rp.slice(rc.length + 1);
  return rp;
}

function shortenHome(p: string): string {
  if (!p) return p;
  const rp = path.resolve(p);
  const home = os.homedir();
  if (rp === home) return "~";
  if (rp.startsWith(home + path.sep)) return "~/" + rp.slice(home.length + 1);
  return rp;
}

function shortenExtensionPath(p: string): string {
  if (!p || p === "<unknown>") return p;
  const dir = path.basename(path.dirname(p));
  const base = path.basename(p);
  return dir && dir !== "." ? `${dir}/${base}` : base;
}

function renderUsageBar(
  theme: any,
  parts: { system: number; tools: number; convo: number; remaining: number },
  total: number,
  width: number,
): string {
  const w = Math.max(10, width);
  if (total <= 0) return "";

  const toCols = (n: number) => Math.round((n / total) * w);
  let sys = toCols(parts.system);
  let tools = toCols(parts.tools);
  let con = toCols(parts.convo);
  let rem = w - sys - tools - con;
  if (rem < 0) rem = 0;
  // adjust rounding drift
  while (sys + tools + con + rem < w) rem++;
  while (sys + tools + con + rem > w && rem > 0) rem--;

  const block = "█";
  const sysStr = theme.fg("accent", block.repeat(sys));
  const toolsStr = theme.fg("warning", block.repeat(tools));
  const conStr = theme.fg("success", block.repeat(con));
  const remStr = theme.fg("dim", block.repeat(rem));
  return `${sysStr}${toolsStr}${conStr}${remStr}`;
}

function buildSystemPromptBreakdown(
  options: BuildSystemPromptOptions | null,
  fullSystemPrompt: string,
  agentTokens: number,
  skillsCount: number,
): Array<{ label: string; tokens: number }> {
  const out: Array<{ label: string; tokens: number }> = [];
  if (!fullSystemPrompt) return out;

  const total = estimateTokens(fullSystemPrompt);
  const appendTokens = estimateTokens(options?.appendSystemPrompt ?? "");
  const customTokens = estimateTokens(options?.customPrompt ?? "");
  const skillsMarker = "<available_skills>";
  const skillsTokens = fullSystemPrompt.includes(skillsMarker)
    ? estimateTokens(
        fullSystemPrompt.slice(fullSystemPrompt.indexOf(skillsMarker)),
      )
    : 0;
  const cwdDateMatch = fullSystemPrompt.match(
    /\nCurrent date: .*\nCurrent working directory: .*$/s,
  );
  const cwdDateTokens = estimateTokens(cwdDateMatch?.[0] ?? "");

  if (customTokens > 0)
    out.push({ label: "custom prompt", tokens: customTokens });
  else {
    const baseTokens = Math.max(
      0,
      total - appendTokens - agentTokens - skillsTokens - cwdDateTokens,
    );
    out.push({ label: "pi base prompt/docs/guidelines", tokens: baseTokens });
  }
  if (appendTokens > 0)
    out.push({ label: "appendSystemPrompt", tokens: appendTokens });
  if (agentTokens > 0)
    out.push({ label: "AGENTS/context files", tokens: agentTokens });
  if (skillsTokens > 0)
    out.push({ label: `skills index (${skillsCount})`, tokens: skillsTokens });
  if (cwdDateTokens > 0)
    out.push({ label: "date + cwd", tokens: cwdDateTokens });

  const accounted = out.reduce((a, x) => a + x.tokens, 0);
  const drift = total - accounted;
  if (Math.abs(drift) > 10)
    out.push({ label: "unclassified/rounding", tokens: drift });
  return out;
}

function escapeXmlForPrompt(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSkillPromptBreakdown(
  skills: Skill[] | undefined,
): Array<{ name: string; tokens: number }> {
  if (!skills?.length) return [];
  return skills
    .filter((s) => !s.disableModelInvocation)
    .map((s) => {
      const entry = [
        "  <skill>",
        `    <name>${escapeXmlForPrompt(s.name)}</name>`,
        `    <description>${escapeXmlForPrompt(s.description)}</description>`,
        `    <location>${escapeXmlForPrompt(s.filePath)}</location>`,
        "  </skill>",
      ].join("\n");
      return {
        name: normalizeSkillName(s.name),
        tokens: estimateTokens(entry),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildSkillPromptBreakdownFromCommands(
  commands: ReturnType<ExtensionAPI["getCommands"]>,
  cwd: string,
  userInvokedByName?: Map<string, boolean>,
): Array<{ name: string; tokens: number }> {
  return commands
    .filter((c) => c.source === "skill")
    .filter((c) => !userInvokedByName?.get(normalizeSkillName(c.name)))
    .map((c) => {
      const name = normalizeSkillName(c.name);
      const filePath = c.sourceInfo?.path
        ? normalizeReadPath(c.sourceInfo.path, cwd)
        : "";
      const entry = [
        "  <skill>",
        `    <name>${escapeXmlForPrompt(name)}</name>`,
        `    <description>${escapeXmlForPrompt(c.description ?? "")}</description>`,
        `    <location>${escapeXmlForPrompt(filePath)}</location>`,
        "  </skill>",
      ].join("\n");
      return { name, tokens: estimateTokens(entry) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function joinComma(items: string[]): string {
  return items.join(", ");
}

type ContextViewData = {
  usage: {
    // message-based context usage estimate from ctx.getContextUsage()
    messageTokens: number;
    contextWindow: number;
    // effective usage incl. a rough tool-definition estimate
    effectiveTokens: number;
    percent: number;
    remainingTokens: number;
    systemPromptTokens: number;
    agentTokens: number;
    toolsTokens: number;
    activeTools: number;
  } | null;
  agentFiles: Array<{ path: string; tokens: number }>;
  systemBreakdown: Array<{ label: string; tokens: number }>;
  skillBreakdown: Array<{ name: string; tokens: number; source?: string }>;
  toolBreakdown: Array<{ name: string; tokens: number }>;
  extensions: string[];
  skills: Array<{ name: string; source?: string; userInvoked?: boolean }>;
  loadedSkills: string[];
  session: { totalTokens: number; totalCost: number };
};

class ContextView implements Component {
  private tui: TUI;
  private theme: any;
  private onDone: () => void;
  private data: ContextViewData;
  private container: Container;
  private body: Text;
  private cachedWidth?: number;

  constructor(tui: TUI, theme: any, data: ContextViewData, onDone: () => void) {
    this.tui = tui;
    this.theme = theme;
    this.data = data;
    this.onDone = onDone;

    this.container = new Container();
    this.container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));
    this.container.addChild(
      new Text(
        theme.fg("accent", theme.bold("Context")) +
          theme.fg("dim", "  (Esc/q/Enter to close)"),
        1,
        0,
      ),
    );
    this.container.addChild(new Text("", 1, 0));

    this.body = new Text("", 1, 0);
    this.container.addChild(this.body);

    this.container.addChild(new Text("", 1, 0));
    this.container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));
  }

  private rebuild(width: number): void {
    const muted = (s: string) => this.theme.fg("muted", s);
    const dim = (s: string) => this.theme.fg("dim", s);
    const text = (s: string) => this.theme.fg("text", s);

    const lines: string[] = [];

    // Window + bar
    if (!this.data.usage) {
      lines.push(muted("Window: ") + dim("(unknown)"));
    } else {
      const u = this.data.usage;
      lines.push(
        muted("Window: ") +
          text(
            `~${u.effectiveTokens.toLocaleString()} / ${u.contextWindow.toLocaleString()}`,
          ) +
          muted(
            `  (${u.percent.toFixed(1)}% used, ~${u.remainingTokens.toLocaleString()} left)`,
          ),
      );

      // bar width tries to fit within the viewport
      const barWidth = Math.max(10, Math.min(36, width - 10));

      // Prorate system prompt into current message context estimate, then add tools estimate.
      const sysInMessages = Math.min(u.systemPromptTokens, u.messageTokens);
      const convoInMessages = Math.max(0, u.messageTokens - sysInMessages);
      const bar =
        renderUsageBar(
          this.theme,
          {
            system: sysInMessages,
            tools: u.toolsTokens,
            convo: convoInMessages,
            remaining: u.remainingTokens,
          },
          u.contextWindow,
          barWidth,
        ) +
        " " +
        dim("sys") +
        this.theme.fg("accent", "█") +
        " " +
        dim("tools") +
        this.theme.fg("warning", "█") +
        " " +
        dim("convo") +
        this.theme.fg("success", "█") +
        " " +
        dim("free") +
        this.theme.fg("dim", "█");
      lines.push(bar);
    }

    lines.push("");

    // System prompt + tools totals (approx)
    if (this.data.usage) {
      const u = this.data.usage;

      lines.push(this.theme.fg("accent", this.theme.bold("Prompt")));
      lines.push(
        muted("System: ") +
          text(`~${u.systemPromptTokens.toLocaleString()} tok`),
      );
      if (this.data.systemBreakdown.length > 0) {
        lines.push(muted("  breakdown:"));
        for (const x of this.data.systemBreakdown) {
          lines.push(
            muted("    - ") +
              text(x.label) +
              muted(` ~${x.tokens.toLocaleString()} tok`),
          );
        }
      }
      lines.push(
        muted("Tools: ") +
          text(`~${u.toolsTokens.toLocaleString()} tok`) +
          muted(` (${u.activeTools} active)`),
      );
      if (this.data.toolBreakdown.length > 0) {
        lines.push(muted("  active:"));
        for (const x of this.data.toolBreakdown) {
          lines.push(
            muted("    - ") +
              text(x.name) +
              muted(` ~${x.tokens.toLocaleString()} tok`),
          );
        }
      }

      lines.push("");
      lines.push(this.theme.fg("accent", this.theme.bold("Project")));
    }

    lines.push(muted(`AGENTS (${this.data.agentFiles.length}):`));
    if (this.data.agentFiles.length === 0) {
      lines.push(muted("  - ") + dim("(none)"));
    } else {
      for (const f of this.data.agentFiles) {
        lines.push(
          muted("  - ") +
            text(f.path) +
            muted(` ~${f.tokens.toLocaleString()} tok`),
        );
      }
    }
    lines.push("");

    lines.push(this.theme.fg("accent", this.theme.bold("Extensions")));
    lines.push(muted(`Loaded (${this.data.extensions.length}):`));
    if (this.data.extensions.length === 0) {
      lines.push(muted("  - ") + dim("(none)"));
    } else {
      for (const e of this.data.extensions) {
        lines.push(muted("  - ") + text(e));
      }
    }

    const loaded = new Set(this.data.loadedSkills);
    lines.push("");
    lines.push(this.theme.fg("accent", this.theme.bold("Skills")));
    lines.push(muted(`Available (${this.data.skills.length}):`));
    if (this.data.skills.length === 0) {
      lines.push(muted("  - ") + dim("(none)"));
    } else {
      const tokensByName = new Map(
        this.data.skillBreakdown.map((x) => [x.name, x.tokens] as const),
      );
      const sortedSkills = [...this.data.skills].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      for (const s of sortedSkills) {
        const nameStyled = s.userInvoked
          ? this.theme.fg("warning", s.name)
          : loaded.has(s.name)
            ? this.theme.fg("success", s.name)
            : text(s.name);
        const tok = tokensByName.get(s.name);
        const tokStr =
          tok != null ? muted(` ~${tok.toLocaleString()} tok`) : "";
        const tagStr = s.userInvoked ? dim(" [user-invoked]") : "";
        const srcStr = s.source ? dim(`  (${s.source})`) : "";
        lines.push(muted("  - ") + nameStyled + tokStr + tagStr + srcStr);
      }
    }
    lines.push("");
    lines.push(
      muted("Session: ") +
        text(`${this.data.session.totalTokens.toLocaleString()} tokens`) +
        muted(" · ") +
        text(formatUsd(this.data.session.totalCost)),
    );

    this.body.setText(lines.join("\n"));
    this.cachedWidth = width;
  }

  handleInput(data: string): void {
    if (
      matchesKey(data, Key.escape) ||
      matchesKey(data, Key.ctrl("c")) ||
      data.toLowerCase() === "q" ||
      data === "\r"
    ) {
      this.onDone();
      return;
    }
  }

  invalidate(): void {
    this.container.invalidate();
    this.cachedWidth = undefined;
  }

  render(width: number): string[] {
    if (this.cachedWidth !== width) this.rebuild(width);
    return this.container.render(width);
  }
}

export default function contextExtension(pi: ExtensionAPI) {
  // Track which skills were actually pulled in via read tool calls.
  let lastSessionId: string | null = null;
  let cachedLoadedSkills = new Set<string>();
  let cachedSkillIndex: SkillIndexEntry[] = [];
  // Snapshot of the structured prompt options used on the most recent
  // before_agent_start — lets /context report what pi actually loaded
  // instead of re-scanning cwd.
  let lastPromptOptions: BuildSystemPromptOptions | null = null;

  const ensureCaches = (ctx: ExtensionContext) => {
    const sid = ctx.sessionManager.getSessionId();
    if (sid !== lastSessionId) {
      lastSessionId = sid;
      cachedLoadedSkills = getLoadedSkillsFromSession(ctx);
      cachedSkillIndex = [];
      lastPromptOptions = null;
    }
    // Prefer skill index from last prompt snapshot; fall back to command
    // registry when no agent turn has run yet this session.
    const snapshotIndex = skillIndexFromPromptOptions(
      lastPromptOptions?.skills,
    );
    if (snapshotIndex.length > 0) {
      cachedSkillIndex = snapshotIndex;
    } else if (cachedSkillIndex.length === 0) {
      cachedSkillIndex = buildSkillIndex(pi, ctx.cwd);
    }
  };

  pi.on("before_agent_start", (event: BeforeAgentStartEvent) => {
    if (event.systemPromptOptions) {
      lastPromptOptions = event.systemPromptOptions;
    }
  });

  const matchSkillForPath = (absPath: string): string | null => {
    let best: SkillIndexEntry | null = null;
    for (const s of cachedSkillIndex) {
      if (!s.skillDir) continue;
      if (
        absPath === s.skillFilePath ||
        absPath.startsWith(s.skillDir + path.sep)
      ) {
        if (!best || s.skillDir.length > best.skillDir.length) best = s;
      }
    }
    return best?.name ?? null;
  };

  pi.on("tool_result", (event: ToolResultEvent, ctx: ExtensionContext) => {
    // Only count successful reads.
    if ((event as any).toolName !== "read") return;
    if ((event as any).isError) return;

    const input = (event as any).input as { path?: unknown } | undefined;
    const p = typeof input?.path === "string" ? input.path : "";
    if (!p) return;

    ensureCaches(ctx);
    const abs = normalizeReadPath(p, ctx.cwd);
    const skillName = matchSkillForPath(abs);
    if (!skillName) return;

    if (!cachedLoadedSkills.has(skillName)) {
      cachedLoadedSkills.add(skillName);
      pi.appendEntry<SkillLoadedEntryData>(SKILL_LOADED_ENTRY, {
        name: skillName,
        path: abs,
      });
    }
  });

  pi.registerCommand("context", {
    description: "Show loaded context overview",
    handler: async (_args, ctx: ExtensionCommandContext) => {
      const commands = pi.getCommands();
      const extensionCmds = commands.filter((c) => c.source === "extension");
      const skillCmds = commands.filter((c) => c.source === "skill");

      const extensionsByPath = new Map<string, string[]>();
      for (const c of extensionCmds) {
        const p = c.sourceInfo?.path ?? "<unknown>";
        const arr = extensionsByPath.get(p) ?? [];
        arr.push(c.name);
        extensionsByPath.set(p, arr);
      }
      const extensionFiles = [...extensionsByPath.keys()]
        .map((p) => shortenExtensionPath(p))
        .sort((a, b) => a.localeCompare(b));

      // Build a name -> source dir map from the skill index so we can
      // show users where each skill is loaded from.
      ensureCaches(ctx as unknown as ExtensionContext);
      const skillSourceByName = new Map<string, string>();
      for (const s of cachedSkillIndex) {
        if (s.name && s.skillDir) skillSourceByName.set(s.name, s.skillDir);
      }
      // Also fold in directly-known sources from the prompt snapshot.
      if (lastPromptOptions?.skills?.length) {
        for (const s of lastPromptOptions.skills) {
          const n = normalizeSkillName(s.name);
          if (n && s.baseDir && !skillSourceByName.has(n)) {
            skillSourceByName.set(n, path.resolve(s.baseDir));
          }
        }
      }

      // Prefer skills from last prompt snapshot (the set pi actually
      // formatted into the system prompt) over the command registry.
      // Track which ones are user-invoked only (disableModelInvocation):
      // those don't appear in the system prompt but can still be triggered
      // via /skill:name.
      const userInvokedByName = new Map<string, boolean>();
      if (lastPromptOptions?.skills?.length) {
        for (const s of lastPromptOptions.skills) {
          userInvokedByName.set(
            normalizeSkillName(s.name),
            !!s.disableModelInvocation,
          );
        }
      }
      // Fill in any skills we don't have a snapshot flag for by reading
      // the SKILL.md frontmatter directly. This covers the common case of
      // /context being invoked before any agent turn has run, when
      // `lastPromptOptions` is still null.
      const skillFileByName = new Map<string, string>();
      for (const c of skillCmds) {
        const n = normalizeSkillName(c.name);
        const p = c.sourceInfo?.path
          ? normalizeReadPath(c.sourceInfo.path, ctx.cwd)
          : "";
        if (n && p && !skillFileByName.has(n)) skillFileByName.set(n, p);
      }
      if (lastPromptOptions?.skills?.length) {
        for (const s of lastPromptOptions.skills) {
          const n = normalizeSkillName(s.name);
          if (n && s.filePath && !skillFileByName.has(n)) {
            skillFileByName.set(n, path.resolve(s.filePath));
          }
        }
      }
      await Promise.all(
        [...skillFileByName.entries()].map(async ([n, p]) => {
          if (userInvokedByName.has(n)) return;
          userInvokedByName.set(n, await readDisableModelInvocation(p));
        }),
      );
      const skillNames = (
        lastPromptOptions?.skills?.length
          ? lastPromptOptions.skills.map((s) => normalizeSkillName(s.name))
          : skillCmds.map((c) => normalizeSkillName(c.name))
      ).sort((a, b) => a.localeCompare(b));
      const skills = skillNames.map((name) => ({
        name,
        source: skillSourceByName.get(name)
          ? shortenHome(skillSourceByName.get(name)!)
          : undefined,
        userInvoked: userInvokedByName.get(name) ?? false,
      }));

      // Prefer context files from last prompt snapshot — that's exactly
      // what pi loaded into the system prompt. Fall back to disk scan if
      // no agent turn has run yet this session.
      const agentFiles =
        lastPromptOptions?.contextFiles?.map((f) => ({
          path: f.path,
          tokens: estimateTokens(f.content),
          bytes: Buffer.byteLength(f.content, "utf8"),
        })) ?? (await loadProjectContextFiles(ctx.cwd));
      const agentFilesShown = agentFiles.map((f) => ({
        path: shortenPath(f.path, ctx.cwd),
        tokens: f.tokens,
      }));
      const agentTokens = agentFiles.reduce((a, f) => a + f.tokens, 0);

      const systemPrompt = ctx.getSystemPrompt();
      const systemPromptTokens = systemPrompt
        ? estimateTokens(systemPrompt)
        : 0;
      const systemBreakdown = buildSystemPromptBreakdown(
        lastPromptOptions,
        systemPrompt,
        agentTokens,
        skills.length,
      );
      const skillBreakdownRaw = lastPromptOptions?.skills?.length
        ? buildSkillPromptBreakdown(lastPromptOptions.skills)
        : buildSkillPromptBreakdownFromCommands(
            commands,
            ctx.cwd,
            userInvokedByName,
          );
      const skillBreakdown = skillBreakdownRaw.map((x) => ({
        ...x,
        source: skillSourceByName.get(x.name)
          ? shortenHome(skillSourceByName.get(x.name)!)
          : undefined,
      }));

      const usage = ctx.getContextUsage();
      const messageTokens = usage?.tokens ?? 0;
      const ctxWindow = usage?.contextWindow ?? 0;

      // Tool definitions are not part of ctx.getContextUsage() (it estimates message tokens).
      // We approximate their token impact from tool name + description, and apply a fudge
      // factor to account for parameters/schema/formatting.
      const TOOL_FUDGE = 1.5;
      const activeToolNames = pi.getActiveTools();
      const toolInfoByName = new Map(
        pi.getAllTools().map((t) => [t.name, t] as const),
      );
      let toolsTokens = 0;
      const toolBreakdown: Array<{ name: string; tokens: number }> = [];
      for (const name of activeToolNames) {
        const info = toolInfoByName.get(name);
        const blob = `${name}\n${info?.description ?? ""}`;
        const tokens = Math.round(estimateTokens(blob) * TOOL_FUDGE);
        toolsTokens += tokens;
        toolBreakdown.push({ name, tokens });
      }
      toolBreakdown.sort(
        (a, b) => b.tokens - a.tokens || a.name.localeCompare(b.name),
      );

      const effectiveTokens = messageTokens + toolsTokens;
      const percent = ctxWindow > 0 ? (effectiveTokens / ctxWindow) * 100 : 0;
      const remainingTokens =
        ctxWindow > 0 ? Math.max(0, ctxWindow - effectiveTokens) : 0;

      const sessionUsage = sumSessionUsage(ctx);

      const makePlainText = () => {
        const lines: string[] = [];
        lines.push("Context");
        if (usage) {
          lines.push(
            `Window: ~${effectiveTokens.toLocaleString()} / ${ctxWindow.toLocaleString()} (${percent.toFixed(1)}% used, ~${remainingTokens.toLocaleString()} left)`,
          );
        } else {
          lines.push("Window: (unknown)");
        }
        lines.push("Prompt");
        lines.push(
          `  System: ~${systemPromptTokens.toLocaleString()} tok`,
        );
        if (systemBreakdown.length > 0) {
          lines.push("  System breakdown:");
          for (const x of systemBreakdown) {
            lines.push(`    - ${x.label} ~${x.tokens.toLocaleString()} tok`);
          }
        }
        lines.push(
          `  Tools: ~${toolsTokens.toLocaleString()} tok (${activeToolNames.length} active)`,
        );
        if (toolBreakdown.length > 0) {
          lines.push("  Active tools:");
          for (const x of toolBreakdown) {
            lines.push(`    - ${x.name} ~${x.tokens.toLocaleString()} tok`);
          }
        }
        lines.push("Project");
        lines.push(`  AGENTS (${agentFilesShown.length}):`);
        if (agentFilesShown.length === 0) {
          lines.push("    - (none)");
        } else {
          for (const f of agentFilesShown) {
            lines.push(`    - ${f.path} ~${f.tokens.toLocaleString()} tok`);
          }
        }
        lines.push("Extensions");
        lines.push(`  Loaded (${extensionFiles.length}):`);
        if (extensionFiles.length === 0) {
          lines.push("    - (none)");
        } else {
          for (const e of extensionFiles) {
            lines.push(`    - ${e}`);
          }
        }
        lines.push("Skills");
        lines.push(`  Available (${skills.length}):`);
        if (skills.length === 0) {
          lines.push("    - (none)");
        } else {
          const tokensByName = new Map(
            skillBreakdown.map((x) => [x.name, x.tokens] as const),
          );
          const sortedSkills = [...skills].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
          for (const s of sortedSkills) {
            const tok = tokensByName.get(s.name);
            const tokStr = tok != null ? ` ~${tok.toLocaleString()} tok` : "";
            const tagStr = s.userInvoked ? " [user-invoked]" : "";
            const srcStr = s.source ? `  (${s.source})` : "";
            lines.push(`    - ${s.name}${tokStr}${tagStr}${srcStr}`);
          }
        }
        lines.push(
          `Session: ${sessionUsage.totalTokens.toLocaleString()} tokens · ${formatUsd(sessionUsage.totalCost)}`,
        );
        return lines.join("\n");
      };

      if (!ctx.hasUI) {
        pi.sendMessage(
          { customType: "context", content: makePlainText(), display: true },
          { triggerTurn: false },
        );
        return;
      }

      const loadedSkills = Array.from(getLoadedSkillsFromSession(ctx)).sort(
        (a, b) => a.localeCompare(b),
      );

      const viewData: ContextViewData = {
        usage: usage
          ? {
              messageTokens,
              contextWindow: ctxWindow,
              effectiveTokens,
              percent,
              remainingTokens,
              systemPromptTokens,
              agentTokens,
              toolsTokens,
              activeTools: activeToolNames.length,
            }
          : null,
        agentFiles: agentFilesShown,
        systemBreakdown,
        skillBreakdown,
        toolBreakdown,
        extensions: extensionFiles,
        skills,
        loadedSkills,
        session: {
          totalTokens: sessionUsage.totalTokens,
          totalCost: sessionUsage.totalCost,
        },
      };

      await ctx.ui.custom<void>((tui, theme, _kb, done) => {
        return new ContextView(tui, theme, viewData, done);
      });
    },
  });
}
