import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const SNIPPETS: Record<string, string> = {
  ["23"]: "give me 2-3 options",
  brief: "keep it brief: bullet points, focus on the why, no preamble",
  fix: "identify the root cause, explain it, then provide the fix with a brief justification",
  kiss: "keep it simple: pick the most straightforward approach, we can improve later if needed",
  pat: "look at how similar things are already done in this codebase and follow that pattern",
  tdd: "use red/green TDD: write a failing test first, then the minimal code to make it pass, then refactor",
};

export default function (pi: ExtensionAPI) {
  pi.registerShortcut("alt+s", {
    description: "Expand snippet trigger (e.g. `tdd` → full instruction)",
    handler: async (ctx) => {
      const text = ctx.ui.getEditorText();

      // Find the last word (the trigger candidate)
      const match = text.match(/(\S+)$/);
      if (!match) return;

      const trigger = match[1];
      const expansion = SNIPPETS[trigger];
      if (!expansion) return;

      // Replace the trigger with the expanded text
      const before = text.slice(0, text.length - trigger.length);
      ctx.ui.setEditorText(before + expansion);
    },
  });
}
