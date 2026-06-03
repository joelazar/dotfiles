import {
  type ExtensionAPI,
  copyToClipboard,
} from "@earendil-works/pi-coding-agent";

function extractCommands(text: string): string[] {
  const codeBlockRegex = /```(?:\w*)?\n([\s\S]*?)```/g;
  const commands: string[] = [];
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const content = match[1].trim();
    if (content) commands.push(content);
  }
  return commands;
}

function truncate(text: string, max: number): string {
  const firstLine = text.split("\n")[0];
  return firstLine.length > max
    ? firstLine.slice(0, max - 3) + "..."
    : firstLine;
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("copy-command", {
    description:
      "Copy the command from the last assistant message to clipboard",
    handler: async (_args, ctx) => {
      const lastAssistant = ctx.sessionManager
        .getBranch()
        .findLast(
          (e) => e.type === "message" && e.message.role === "assistant",
        );

      const content = lastAssistant?.message.content;
      const commands: string[] = [];
      if (Array.isArray(content)) {
        for (const block of content) {
          if (
            block.type === "tool_use" &&
            block.name === "Bash" &&
            block.input?.command
          ) {
            commands.push(block.input.command);
          } else if (block.type === "text" && block.text) {
            commands.push(...extractCommands(block.text));
          }
        }
      }

      if (commands.length === 0) {
        ctx.ui.notify(
          "No commands found in the last assistant message",
          "warning",
        );
        return;
      }

      let selected = commands[0];
      if (commands.length > 1) {
        const choices = commands.map(
          (cmd, i) => `${i + 1}. ${truncate(cmd, 80)}`,
        );
        const choice = await ctx.ui.select("Which command to copy?", choices);
        if (choice === undefined) {
          ctx.ui.notify("Cancelled", "info");
          return;
        }
        selected = commands[choices.indexOf(choice)];
      }

      try {
        await copyToClipboard(selected);
        ctx.ui.notify(`Copied: ${truncate(selected, 60)}`, "info");
      } catch (e) {
        ctx.ui.notify(`Failed to copy: ${e}`, "error");
      }
    },
  });
}
