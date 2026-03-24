/**
 * Nvim Git extension - open nvim with git changed files picker
 *
 * Suspends pi's TUI, gives nvim full terminal control with
 * Snacks.picker.git_status() open, and restores pi when nvim exits.
 */

import { spawnSync } from "node:child_process";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

function runNvimGit(ctx: {
  hasUI: boolean;
  cwd: string;
  ui: any;
}): Promise<void> {
  if (!ctx.hasUI) {
    ctx.ui.notify("Requires interactive mode", "error");
    return Promise.resolve();
  }

  return ctx.ui.custom<number | null>(
    (tui: any, _theme: any, _kb: any, done: (val: number | null) => void) => {
      tui.stop();
      process.stdout.write("\x1b[2J\x1b[H");

      const result = spawnSync(
        "nvim",
        ["-c", "lua Snacks.picker.git_status()"],
        {
          stdio: "inherit",
          env: process.env,
          cwd: ctx.cwd,
        },
      );

      tui.start();
      tui.requestRender(true);
      done(result.status);
      return { render: () => [], invalidate: () => {} };
    },
  );
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("nvim-git", {
    description: "Open nvim with git changed files picker",
    handler: async (_args, ctx) => {
      await runNvimGit(ctx);
    },
  });

  pi.registerShortcut("ctrl+shift+e", {
    description: "Open nvim with git changed files picker",
    handler: async (ctx) => {
      await runNvimGit(ctx);
    },
  });
}
