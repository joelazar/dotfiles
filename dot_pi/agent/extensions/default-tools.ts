/**
 * Enable All Built-in Tools
 *
 * Activates grep (rg) and find (fd) tools on session start,
 * in addition to the default read, bash, edit, write.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function defaultTools(pi: ExtensionAPI) {
  pi.on("session_start", () => {
    const current = new Set(pi.getActiveTools());
    current.add("grep");
    current.add("find");

    pi.setActiveTools(Array.from(current));
  });
}
