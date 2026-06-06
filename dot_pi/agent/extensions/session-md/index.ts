import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type Block =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string }
  | { type: "image"; mimeType: string }
  | { type: "toolCall"; id: string; name: string; arguments: Record<string, unknown> };

type Content = string | Block[];

const fence = (lang: string, body: string) => "```" + lang + "\n" + body.replace(/\n+$/, "") + "\n```";

const details = (summary: string, body: string) =>
  `<details>\n<summary>${summary}</summary>\n\n${body}\n\n</details>`;

const time = (ts: number | string | undefined) => {
  if (ts === undefined) return "";
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().replace("T", " ").slice(0, 19);
};

function renderContent(content: Content): string {
  if (typeof content === "string") return content.trim();
  const parts: string[] = [];
  for (const block of content) {
    switch (block.type) {
      case "text":
        if (block.text.trim()) parts.push(block.text.trim());
        break;
      case "thinking":
        if (block.thinking.trim()) parts.push(details("💭 Thinking", block.thinking.trim()));
        break;
      case "image":
        parts.push(`*(image: ${block.mimeType})*`);
        break;
      case "toolCall":
        parts.push(
          details(
            `🔧 ${block.name}`,
            fence("json", JSON.stringify(block.arguments, null, 2)),
          ),
        );
        break;
    }
  }
  return parts.join("\n\n");
}

function renderEntry(entry: any): string | null {
  const msg = entry.message;
  if (entry.type === "message" && msg) {
    switch (msg.role) {
      case "user": {
        const body = renderContent(msg.content);
        if (!body) return null;
        return `## 👤 User · ${time(msg.timestamp)}\n\n${body}`;
      }
      case "assistant": {
        const body = renderContent(msg.content);
        if (!body) return null;
        const model = [msg.provider, msg.model].filter(Boolean).join("/");
        return `## 🤖 Assistant${model ? ` (${model})` : ""} · ${time(msg.timestamp)}\n\n${body}`;
      }
      case "toolResult": {
        const body = renderContent(msg.content);
        const tag = msg.isError ? "❌" : "✅";
        return details(
          `${tag} result · ${msg.toolName}`,
          body ? fence("", body) : "*(empty)*",
        );
      }
      case "bashExecution": {
        const out = (msg.output ?? "").trim();
        const code = msg.exitCode ?? "?";
        return details(
          `💻 bash (exit ${code})`,
          `${fence("bash", msg.command)}\n\n${out ? fence("", out) : "*(no output)*"}`,
        );
      }
      case "custom": {
        if (!msg.display) return null;
        const body = renderContent(msg.content);
        return body ? `> **${msg.customType}:** ${body}` : null;
      }
    }
    return null;
  }
  if (entry.type === "compaction") {
    return details(`📦 Compaction (${entry.tokensBefore} tokens)`, entry.summary ?? "");
  }
  if (entry.type === "branch_summary") {
    return details("🌿 Branch summary", entry.summary ?? "");
  }
  return null;
}

function buildMarkdown(ctx: any): string {
  const sm = ctx.sessionManager;
  const name = sm.getSessionName?.() ?? "Session";
  const cwd = sm.getCwd?.() ?? ctx.cwd;
  const lines = [`# ${name}`, "", `\`${cwd}\``, ""];
  for (const entry of sm.getBranch()) {
    const rendered = renderEntry(entry);
    if (rendered) lines.push(rendered, "\n---\n");
  }
  return lines.join("\n");
}

function openInEditor(ctx: any, file: string): Promise<void> {
  const editor = process.env.EDITOR || process.env.VISUAL || "nvim";
  return ctx.ui.custom(
    (tui: any, _theme: any, _kb: any, done: (val: number | null) => void) => {
      tui.stop();
      process.stdout.write("\x1b[2J\x1b[H");
      const [cmd, ...rest] = editor.split(" ");
      const result = spawnSync(cmd, [...rest, file], {
        stdio: "inherit",
        env: process.env,
        cwd: ctx.cwd,
      });
      tui.start();
      tui.requestRender(true);
      done(result.status);
      return { render: () => [], invalidate: () => {} };
    },
  );
}

async function run(ctx: any): Promise<void> {
  if (!ctx.hasUI) {
    ctx.ui.notify("Requires interactive mode", "error");
    return;
  }
  const entries = ctx.sessionManager.getBranch();
  if (!entries.length) {
    ctx.ui.notify("Session is empty", "info");
    return;
  }
  const md = buildMarkdown(ctx);
  const base =
    ctx.sessionManager
      .getSessionFile?.()
      ?.split("/")
      .pop()
      ?.replace(/\.jsonl$/, "") ?? `session-${Date.now()}`;
  const file = join(tmpdir(), `pi-${base}.md`);
  writeFileSync(file, md, "utf8");
  await openInEditor(ctx, file);
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("md", {
    description: "Export current session to markdown and open in $EDITOR",
    handler: async (_args, ctx) => {
      await run(ctx);
    },
  });

  pi.registerShortcut("ctrl+shift+m", {
    description: "Export session to markdown",
    handler: async (ctx) => {
      await run(ctx);
    },
  });
}
