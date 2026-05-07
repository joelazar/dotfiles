/**
 * Editor with Context - see the last agent response when composing prompts
 *
 * Opens an external editor pre-filled with the last assistant response as
 * read-only context above a separator. Only text below the separator is sent
 * as your prompt.
 *
 * Usage: /ctx-editor
 *
 * Write your reply below the separator, save and close to send.
 */

import type { ExtensionAPI, SessionEntry } from "@earendil-works/pi-coding-agent";

const SEPARATOR = "--- YOUR RESPONSE BELOW (only this part will be sent) ---";
const SEPARATOR_RE = /^-{2,}\s*YOUR RESPONSE BELOW.*-{2,}\s*$/im;

function getLastAssistantText(entries: SessionEntry[]): string | undefined {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i]!;
    if (entry.type !== "message") continue;
    if (entry.message.role !== "assistant") continue;

    const parts: string[] = [];
    const content = entry.message.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "text" && typeof block.text === "string") {
          parts.push(block.text);
        }
      }
    }

    const text = parts.join("\n").trim();
    if (text.length > 0) return text;
  }
  return undefined;
}

function buildEditorContent(lastResponse: string | undefined): string {
  if (!lastResponse) {
    return `--- No previous response ---\n\n${SEPARATOR}\n\n`;
  }
  return `--- Last agent response (read-only, will not be sent) ---\n\n${lastResponse}\n\n${SEPARATOR}\n\n`;
}

function extractUserText(
  editorContent: string | undefined,
): string | undefined {
  if (!editorContent) return undefined;

  // Try exact match first, then fuzzy regex (handles editor mangling)
  let idx = editorContent.indexOf(SEPARATOR);
  let sepLen = SEPARATOR.length;

  if (idx === -1) {
    const match = SEPARATOR_RE.exec(editorContent);
    if (match) {
      idx = match.index;
      sepLen = match[0].length;
    }
  }

  if (idx === -1) {
    // Still no separator — refuse to send to avoid leaking context
    return undefined;
  }

  const text = editorContent.substring(idx + sepLen).trim();
  return text || undefined;
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("ctx-editor", {
    description: "Open external editor with last agent response as context",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("Requires interactive mode", "error");
        return;
      }

      const branch = ctx.sessionManager.getBranch();
      const lastResponse = getLastAssistantText(branch);
      const prefill = buildEditorContent(lastResponse);

      const result = await ctx.ui.editor("Reply with context", prefill);
      const userText = extractUserText(result);

      if (!userText) {
        ctx.ui.notify("No response entered", "info");
        return;
      }

      if (!ctx.isIdle()) {
        pi.sendUserMessage(userText, { deliverAs: "followUp" });
      } else {
        pi.sendUserMessage(userText);
      }
    },
  });
}
