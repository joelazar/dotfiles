import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";

// RTK pi extension — rewrites bash commands to use rtk for token savings.
// Requires: rtk >= 0.23.0 in PATH.
//
// All rewrite logic lives in `rtk rewrite` (Rust binary).
// This extension intercepts bash tool calls and rewrites commands transparently.

export default function (pi: ExtensionAPI) {
  // Check if rtk is available at startup
  let rtkAvailable = true;

  pi.on("session_start", async (_event, ctx) => {
    try {
      const result = await pi.exec("rtk", ["--version"], { timeout: 3000 });
      if (result.code !== 0) {
        rtkAvailable = false;
        ctx.ui.notify("[rtk] rtk binary not found — extension disabled", "warning");
      }
    } catch {
      rtkAvailable = false;
      ctx.ui.notify("[rtk] rtk binary not found — extension disabled", "warning");
    }
  });

  pi.on("tool_call", async (event, _ctx) => {
    if (!rtkAvailable) return;
    if (!isToolCallEventType("bash", event)) return;

    const command = event.input.command;
    if (!command) return;

    try {
      const result = await pi.exec("rtk", ["rewrite", command], { timeout: 3000 });
      const rewritten = result.stdout.trim();

      if (rewritten && rewritten !== command && result.code === 0) {
        event.input.command = rewritten;
      }
    } catch {
      // rtk rewrite failed — pass through unchanged
    }
  });
}
