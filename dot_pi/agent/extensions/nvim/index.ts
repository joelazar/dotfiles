/**
 * Nvim extension - open nvim, using the git changed files picker when there are changes.
 *
 * Suspends pi's TUI, gives nvim full terminal control, restores pi when nvim exits,
 * and if pi-review exported comments for this session, prepares them in pi's input editor.
 */

import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
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

type ExportPayload = {
  version?: number;
  token?: string;
  root?: string;
  text?: string;
};

function readPiReviewExport(exportPath: string, token: string): string | undefined {
  if (!existsSync(exportPath)) {
    return undefined;
  }

  try {
    const raw = readFileSync(exportPath, "utf8");
    if (!raw.trim()) {
      return undefined;
    }
    const payload = JSON.parse(raw) as ExportPayload;
    if (payload.token !== token) {
      return undefined;
    }
    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    return text || undefined;
  } catch {
    return undefined;
  }
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

      const sessionDir = mkdtempSync(join(tmpdir(), "pi-review-"));
      const exportPath = join(sessionDir, "export.json");
      const exportToken = randomUUID();

      let resultStatus: number | null = null;
      let exportedText: string | undefined;
      try {
        const args = shouldOpenGitPicker(ctx.cwd)
          ? ["-c", "lua Snacks.picker.git_status()"]
          : [];

        const result = spawnSync("nvim", args, {
          stdio: "inherit",
          cwd: ctx.cwd,
          env: {
            ...process.env,
            PI_REVIEW_EXPORT_PATH: exportPath,
            PI_REVIEW_EXPORT_TOKEN: exportToken,
            PI_REVIEW_EXPORT_ROOT: ctx.cwd,
          },
        });

        resultStatus = result.status;
        exportedText = readPiReviewExport(exportPath, exportToken);
      } finally {
        rmSync(sessionDir, { recursive: true, force: true });
      }

      tui.start();
      done(resultStatus);

      if (exportedText) {
        setTimeout(() => {
          ctx.ui.setEditorText(exportedText);
          ctx.ui.notify("Loaded pi-review comments into the input editor", "info");
          tui.requestRender(true);
        }, 0);
      } else {
        tui.requestRender(true);
      }
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
