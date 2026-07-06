import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { AutocompleteItem } from "@earendil-works/pi-tui";
import { existsSync, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const GHOSTTY_SPLIT_SCRIPT = `on run argv
	set targetCwd to item 1 of argv
	set startupInput to item 2 of argv
	tell application "Ghostty"
		set cfg to new surface configuration
		set initial working directory of cfg to targetCwd
		set initial input of cfg to startupInput
		if (count of windows) > 0 then
			try
				set frontWindow to front window
				set targetTerminal to focused terminal of selected tab of frontWindow
				split targetTerminal direction right with configuration cfg
			on error
				new window with configuration cfg
			end try
		else
			new window with configuration cfg
		end if
		activate
	end tell
end run`;

const GHOSTTY_TAB_SCRIPT = `on run argv
	set targetCwd to item 1 of argv
	set startupInput to item 2 of argv
	tell application "Ghostty"
		set cfg to new surface configuration
		set initial working directory of cfg to targetCwd
		set initial input of cfg to startupInput
		if (count of windows) > 0 then
			new tab in front window with configuration cfg
		else
			new window with configuration cfg
		end if
		activate
	end tell
end run`;

type LaunchMode = "tab" | "split";

function splitMode(input: string): { mode: LaunchMode; rest: string } {
  const match = /^(tab|split)\s+/i.exec(input);
  if (match) {
    return {
      mode: match[1].toLowerCase() as LaunchMode,
      rest: input.slice(match[0].length),
    };
  }
  return { mode: "tab", rest: input };
}

function expandTilde(p: string): string {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/") || p.startsWith("~\\")) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

function resolveDir(base: string, p: string): string {
  const expanded = expandTilde(p);
  return path.isAbsolute(expanded) ? expanded : path.resolve(base, expanded);
}

function shellQuote(value: string): string {
  if (value.length === 0) return "''";
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function getPiInvocationParts(): string[] {
  const currentScript = process.argv[1];
  if (currentScript && existsSync(currentScript)) {
    return [process.execPath, currentScript];
  }
  const execName = path.basename(process.execPath).toLowerCase();
  if (!/^(node|bun)(\.exe)?$/.test(execName)) {
    return [process.execPath];
  }
  return ["pi"];
}

function buildPiStartupInput(): string {
  return `${getPiInvocationParts().map(shellQuote).join(" ")}\n`;
}

async function completeDirectories(
  prefix: string,
): Promise<AutocompleteItem[] | null> {
  const { mode, rest } = splitMode(prefix);
  const modePart = mode === "tab" && !/^(tab|split)\s+/i.test(prefix) ? "" : `${mode} `;
  const lastSlash = rest.lastIndexOf("/");
  const dirPart = lastSlash >= 0 ? rest.slice(0, lastSlash + 1) : "";
  const fragment = lastSlash >= 0 ? rest.slice(lastSlash + 1) : rest;
  const listDir = dirPart === "" ? process.cwd() : resolveDir(process.cwd(), dirPart);

  let entries;
  try {
    entries = await fs.readdir(listDir, { withFileTypes: true });
  } catch {
    return null;
  }

  const fragmentLower = fragment.toLowerCase();
  const showHidden = fragment.startsWith(".");
  const dirs = entries
    .filter((e) => e.isDirectory() || e.isSymbolicLink())
    .filter((e) => showHidden || !e.name.startsWith("."))
    .filter((e) => e.name.toLowerCase().startsWith(fragmentLower))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 50);

  if (dirs.length === 0) return null;

  return dirs.map((e) => ({
    value: `${modePart}${dirPart}${e.name}/`,
    label: `${e.name}/`,
    description: resolveDir(process.cwd(), `${dirPart}${e.name}`),
  }));
}

export default function (pi: ExtensionAPI): void {
  pi.registerCommand("spawn", {
    description:
      "Open a fresh pi in another directory (new Ghostty tab or split). Usage: /spawn [tab|split] <dir>",
    getArgumentCompletions: completeDirectories,
    handler: async (args, ctx) => {
      if (process.platform !== "darwin") {
        ctx.ui.notify(
          "/spawn currently requires macOS (Ghostty AppleScript).",
          "warning",
        );
        return;
      }

      const { mode, rest } = splitMode(args.trim());
      const raw = rest.trim();
      if (!raw) {
        ctx.ui.notify("Usage: /spawn [tab|split] <dir>", "error");
        return;
      }

      const target = resolveDir(ctx.cwd, raw);
      let stat;
      try {
        stat = await fs.stat(target);
      } catch {
        ctx.ui.notify(`Directory not found: ${target}`, "error");
        return;
      }
      if (!stat.isDirectory()) {
        ctx.ui.notify(`Not a directory: ${target}`, "error");
        return;
      }

      const script = mode === "split" ? GHOSTTY_SPLIT_SCRIPT : GHOSTTY_TAB_SCRIPT;
      const result = await pi.exec("osascript", [
        "-e",
        script,
        "--",
        target,
        buildPiStartupInput(),
      ]);

      if (result.code !== 0) {
        const reason =
          result.stderr?.trim() || result.stdout?.trim() || "unknown osascript error";
        ctx.ui.notify(`Failed to launch Ghostty ${mode}: ${reason}`, "error");
        return;
      }

      ctx.ui.notify(`Opened pi in ${target} (new Ghostty ${mode}).`, "info");
    },
  });
}
