/**
 * Nvim extension - open nvim, using the git changed files picker when there are changes.
 *
 * Suspends pi's TUI, gives nvim full terminal control, and restores pi when nvim exits.
 */

import { spawnSync } from "node:child_process";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

function shouldOpenGitPicker(cwd: string): boolean {
  const isGitRepo = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
    cwd,
    env: process.env,
    encoding: "utf8",
  });

  if (isGitRepo.status !== 0 || isGitRepo.stdout.trim() !== "true") {
    return false;
  }

  const hasHead = spawnSync("git", ["rev-parse", "--verify", "HEAD"], {
    cwd,
    env: process.env,
    stdio: "ignore",
  });

  if (hasHead.status !== 0) {
    return false;
  }

  const status = spawnSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd,
    env: process.env,
    encoding: "utf8",
  });

  return status.status === 0 && status.stdout.trim().length > 0;
}

function runNvim(ctx: {
  hasUI: boolean;
  cwd: string;
  ui: any;
}): Promise<void> {
  if (!ctx.hasUI) {
    ctx.ui.notify("Requires interactive mode", "error");
    return Promise.resolve();
  }

  return ctx.ui.custom(
    (tui: any, _theme: any, _kb: any, done: (val: number | null) => void) => {
      tui.stop();
      process.stdout.write("\x1b[2J\x1b[H");

      const args = shouldOpenGitPicker(ctx.cwd)
        ? ["-c", "lua Snacks.picker.git_status()"]
        : [];

      const result = spawnSync("nvim", args, {
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

export default function (pi: ExtensionAPI) {
  pi.registerCommand("nvim", {
    description: "Open nvim",
    handler: async (_args: any, ctx: any) => {
      await runNvim(ctx);
    },
  });

  pi.registerShortcut("ctrl+shift+e", {
    description: "Open nvim",
    handler: async (ctx: any) => {
      await runNvim(ctx);
    },
  });
}
