/**
 * Chezmoi Auto-Apply Extension
 *
 * Automatically runs `chezmoi apply` after edit/write tool calls.
 * Eliminates the need for the agent to manually run chezmoi apply
 * after every file change.
 *
 * Project-local extension — only loads when working in this repo.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function chezmoiAutoApply(pi: ExtensionAPI) {
  pi.on("tool_result", async (event) => {
    if (event.isError) return;
    if (event.toolName !== "edit" && event.toolName !== "write") return;

    try {
      const result = await pi.exec("chezmoi", ["apply"], { timeout: 30000 });
      if (result.code !== 0) {
        const errorText = (result.stderr || result.stdout).trim();
        event.content.push({
          type: "text",
          text: `\n⚠️ chezmoi apply failed: ${errorText}`,
        });
      }
    } catch {
      // Silently ignore - don't break the agent flow
    }
  });
}
