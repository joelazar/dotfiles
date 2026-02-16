/**
 * Lazygit extension - open lazygit with /lazygit command or ctrl+g shortcut
 *
 * Suspends pi's TUI, gives lazygit full terminal control,
 * and restores pi when lazygit exits.
 */

import { spawnSync } from "node:child_process";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

function runLazygit(ctx: {
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

      const result = spawnSync("lazygit", {
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
  pi.registerCommand("lazygit", {
    description: "Open lazygit",
    handler: async (_args, ctx) => {
      await runLazygit(ctx);
    },
  });

  pi.registerShortcut("ctrl+shift+g", {
    description: "Open lazygit",
    handler: async (ctx) => {
      await runLazygit(ctx);
    },
  });
}
