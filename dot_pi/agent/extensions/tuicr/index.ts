/**
 * tuicr extension - review pi's changes in tuicr, then feed the comments back
 *
 * `/tuicr` (or ctrl+shift+r) suspends pi's TUI and opens tuicr on the working
 * tree. When tuicr exits, any comments written during that session are
 * formatted and prefilled into the editor, so you can read them over and press
 * enter when you want pi to act on them.
 */

import { execFileSync, spawnSync } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type Session = {
  slug: string;
  kind: string;
  updated_at: string;
  active: boolean;
};

type Comment = {
  id: string;
  location?: string;
  path?: string;
  comment_type?: string;
  content: string;
};

function tuicrJson<T>(args: string[], cwd: string): T[] {
  try {
    const out = execFileSync("tuicr", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const parsed = JSON.parse(out);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function localSessions(cwd: string): Session[] {
  return tuicrJson<Session>(["review", "list", "--repo", cwd], cwd)
    .filter((s) => s.kind === "local")
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

function commentsFor(slug: string, cwd: string): Comment[] {
  return tuicrJson<Comment>(
    ["review", "comments", "--repo", cwd, "--session", slug],
    cwd,
  );
}

function format(comments: Comment[]): string {
  const lines = comments.map((c, i) => {
    const anchor = c.location ?? c.path;
    const type = c.comment_type && c.comment_type !== "none"
      ? ` [${c.comment_type.toUpperCase()}]`
      : "";
    const body = c.content.trim().replace(/\n+/g, " ");
    return anchor
      ? `${i + 1}. \`${anchor}\`${type} - ${body}`
      : `${i + 1}.${type} - ${body}`;
  });

  return [
    "I reviewed your changes in tuicr. Please address these comments:",
    "",
    ...lines,
  ].join("\n");
}

async function runTuicr(ctx: {
  hasUI: boolean;
  cwd: string;
  ui: any;
}): Promise<void> {
  if (!ctx.hasUI) {
    ctx.ui.notify("Requires interactive mode", "error");
    return;
  }

  // Comments that already existed, so only this session's feedback comes back.
  const seen = new Set(
    localSessions(ctx.cwd).flatMap((s) =>
      commentsFor(s.slug, ctx.cwd).map((c) => c.id),
    ),
  );

  const status: number | null = await ctx.ui.custom(
    (tui: any, _theme: any, _kb: any, done: (val: number | null) => void) => {
      tui.stop();
      process.stdout.write("\x1b[2J\x1b[H");

      const result = spawnSync("tuicr", ["-w"], {
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

  if (status !== 0 && status !== null) {
    ctx.ui.notify("tuicr exited with an error", "error");
    return;
  }

  const fresh = localSessions(ctx.cwd)
    .flatMap((s) => commentsFor(s.slug, ctx.cwd))
    .filter((c) => !seen.has(c.id));

  if (fresh.length === 0) {
    ctx.ui.notify("No new review comments", "info");
    return;
  }

  ctx.ui.setEditorText(format(fresh));
  ctx.ui.notify(
    `${fresh.length} review comment${fresh.length === 1 ? "" : "s"} ready - press enter to send`,
    "info",
  );
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("tuicr", {
    description: "Review working tree in tuicr, then load comments",
    handler: async (_args, ctx) => {
      await runTuicr(ctx);
    },
  });

  pi.registerShortcut("ctrl+shift+r", {
    description: "Review working tree in tuicr",
    handler: async (ctx) => {
      await runTuicr(ctx);
    },
  });
}
