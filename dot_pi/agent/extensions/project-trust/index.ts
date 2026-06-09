import os from "node:os";
import path from "node:path";
import type {
  ExtensionAPI,
  ProjectTrustEventResult,
} from "@earendil-works/pi-coding-agent";

const trustedRoots = [
  path.join(os.homedir(), "Code/onomondo"),
  path.join(os.homedir(), "Code/joelazar"),
  path.join(os.homedir(), ".local/share/chezmoi"),
].map((root) => path.resolve(root));

function isTrustedPath(cwd: string): boolean {
  const resolved = path.resolve(cwd);
  return trustedRoots.some(
    (root) => resolved === root || resolved.startsWith(`${root}${path.sep}`),
  );
}

export default function (pi: ExtensionAPI) {
  pi.on("project_trust", async (event): Promise<ProjectTrustEventResult> => {
    if (!isTrustedPath(event.cwd)) return { trusted: "undecided" };
    return { trusted: "yes", remember: true };
  });
}
