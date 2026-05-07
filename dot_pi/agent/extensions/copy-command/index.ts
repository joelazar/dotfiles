import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { exec } from "node:child_process";

async function copyToClipboard(text: string): Promise<void> {
  const proc = exec("pbcopy");
  proc.stdin?.write(text);
  proc.stdin?.end();
  await new Promise<void>((resolve, reject) => {
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`pbcopy exited ${code}`))
    );
  });
}

function extractCodeBlockCommands(text: string): string[] {
  const codeBlockRegex = /```(?:\w*)?\n([\s\S]*?)```/g;
  const commands: string[] = [];
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const content = match[1].trim();
    if (content) commands.push(content);
  }
  return commands;
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("copy-command", {
    description: "Copy the command from the last assistant message to clipboard",
    handler: async (_args, ctx) => {
      const entries = ctx.sessionManager.getBranch();
      const commands: string[] = [];

      // Walk backwards to find the last assistant message
      let foundAssistant = false;
      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        if (entry.type !== "message") continue;

        const msg = entry.message;

        if (msg.role === "assistant") {
          if (foundAssistant) break;
          foundAssistant = true;

          if (Array.isArray(msg.content)) {
            for (const block of msg.content) {
              // Extract from Bash tool calls
              if (
                block.type === "tool_use" &&
                block.name === "Bash" &&
                block.input?.command
              ) {
                commands.push(block.input.command);
              }

              // Extract from markdown code blocks in text
              if (block.type === "text" && block.text) {
                commands.push(...extractCodeBlockCommands(block.text));
              }
            }
          }
        }
      }

      if (commands.length === 0) {
        ctx.ui.notify(
          "No commands found in the last assistant message",
          "warning"
        );
        return;
      }

      let selected: string;

      if (commands.length === 1) {
        selected = commands[0];
      } else {
        const displayCommands = commands.map((cmd, i) => {
          const firstLine = cmd.split("\n")[0];
          const truncated =
            firstLine.length > 80 ? firstLine.slice(0, 77) + "..." : firstLine;
          return `${i + 1}. ${truncated}`;
        });

        const choice = await ctx.ui.select(
          "Which command to copy?",
          displayCommands
        );
        if (choice === undefined) {
          ctx.ui.notify("Cancelled", "info");
          return;
        }

        const idx = displayCommands.indexOf(choice);
        selected = commands[idx];
      }

      try {
        await copyToClipboard(selected);
        const preview =
          selected.length > 60 ? selected.slice(0, 57) + "..." : selected;
        ctx.ui.notify(`Copied: ${preview}`, "success");
      } catch (e) {
        ctx.ui.notify(`Failed to copy: ${e}`, "error");
      }
    },
  });
}
