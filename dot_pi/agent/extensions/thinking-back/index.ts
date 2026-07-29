import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;
type Level = (typeof LEVELS)[number];

/** Mirrors pi-ai getSupportedThinkingLevels(model). */
function supportedLevels(model: { reasoning?: boolean; thinkingLevelMap?: Record<string, unknown> } | undefined): Level[] {
  if (!model?.reasoning) return ["off"];
  return LEVELS.filter((level) => {
    const mapped = model.thinkingLevelMap?.[level];
    if (mapped === null) return false;
    if (level === "xhigh" || level === "max") return mapped !== undefined;
    return true;
  });
}

export default function (pi: ExtensionAPI) {
  pi.registerShortcut("alt+shift+t", {
    description: "Cycle thinking level backwards",
    handler: async (ctx) => {
      const levels = supportedLevels(ctx.model as never);
      if (levels.length < 2) {
        ctx.ui.notify("Current model does not support thinking");
        return;
      }
      const current = pi.getThinkingLevel() as Level;
      const index = levels.indexOf(current);
      const prev = levels[(index <= 0 ? levels.length : index) - 1];
      pi.setThinkingLevel(prev);
      ctx.ui.notify(`Thinking level: ${prev}`);
    },
  });
}
