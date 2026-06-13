/**
 * Sandbox Tool Routing Extension
 *
 * Runs pi's built-in tools inside a local Gondolin micro-VM. The host working
 * directory is mounted at /workspace in the guest. File changes under
 * /workspace write through to the host; other guest filesystem changes are
 * isolated to the VM.
 *
 * Autostart is controlled by config.json next to this file:
 *
 *   { "autostart": false }
 *
 * The --sandbox / --no-sandbox CLI flag overrides config.json for a single run.
 * /sandbox toggles the sandbox on or off at runtime. When off, tools run on
 * the host; when on, they run inside the VM.
 *
 * Extra host directories can be mounted into the VM at their own absolute path,
 * either persistently via config.json:
 *
 *   { "autostart": false, "mounts": ["~/Code/shared", "/opt/data"] }
 *
 * or at runtime with `/sandbox mount <dir>` and `/sandbox unmount <dir>`.
 * Adding or removing a mount restarts a running VM so the change takes effect.
 *
 * Requirements:
 *   - Node.js >= 23.6.0 for @earendil-works/gondolin
 *   - QEMU installed (for example, `brew install qemu` on macOS)
 */

import { readFileSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { RealFSProvider, VM } from "@earendil-works/gondolin";
import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import {
  type BashOperations,
  createBashTool,
  createEditTool,
  createReadTool,
  createWriteTool,
  type EditOperations,
  type ReadOperations,
  type WriteOperations,
} from "@earendil-works/pi-coding-agent";

const GUEST_WORKSPACE = "/workspace";

function loadConfig(): { autostart: boolean; mounts: string[] } {
  const configPath = path.join(import.meta.dirname, "config.json");
  try {
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    const mounts = Array.isArray(config.mounts)
      ? config.mounts.filter(
          (entry: unknown): entry is string => typeof entry === "string",
        )
      : [];
    return { autostart: config.autostart === true, mounts };
  } catch {
    return { autostart: false, mounts: [] };
  }
}

function expandHome(input: string): string {
  if (input === "~") return os.homedir();
  if (input.startsWith(`~${path.sep}`) || input.startsWith("~/"))
    return path.join(os.homedir(), input.slice(2));
  return input;
}

/** Resolve a user-supplied directory to its absolute host path and the guest
 * path it is mounted at (the same absolute path, in posix form). */
function resolveMount(input: string): { host: string; guest: string } {
  const host = path.resolve(expandHome(input.trim()));
  return { host, guest: path.posix.resolve("/", toPosix(host)) };
}

function stripAtPrefix(value: string): string {
  return value.startsWith("@") ? value.slice(1) : value;
}

function toPosix(value: string): string {
  return value.split(path.sep).join(path.posix.sep);
}

function isInsideHostPath(root: string, value: string): boolean {
  const relativePath = path.relative(root, value);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

function hostPathToGuest(localCwd: string, hostPath: string): string {
  const relativePath = path.relative(localCwd, hostPath);
  if (!isInsideHostPath(localCwd, hostPath)) return toPosix(hostPath);
  return relativePath
    ? path.posix.join(GUEST_WORKSPACE, toPosix(relativePath))
    : GUEST_WORKSPACE;
}

function toGuestPath(localCwd: string, inputPath: string): string {
  const trimmed = stripAtPrefix(inputPath.trim());
  if (!trimmed) return GUEST_WORKSPACE;
  if (path.isAbsolute(trimmed)) {
    if (isInsideHostPath(localCwd, trimmed))
      return hostPathToGuest(localCwd, trimmed);
    return path.posix.resolve("/", toPosix(trimmed));
  }
  return path.posix.resolve(GUEST_WORKSPACE, toPosix(trimmed));
}

function createGondolinReadOps(vm: VM, localCwd: string): ReadOperations {
  return {
    readFile: async (filePath) =>
      vm.fs.readFile(toGuestPath(localCwd, filePath)),
    access: async (filePath) => {
      await vm.fs.access(toGuestPath(localCwd, filePath));
    },
    detectImageMimeType: async (filePath) => {
      const ext = path.posix
        .extname(toGuestPath(localCwd, filePath))
        .toLowerCase();
      if (ext === ".png") return "image/png";
      if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
      if (ext === ".gif") return "image/gif";
      if (ext === ".webp") return "image/webp";
      return null;
    },
  };
}

function createGondolinWriteOps(vm: VM, localCwd: string): WriteOperations {
  return {
    writeFile: async (filePath, content) => {
      await vm.fs.writeFile(toGuestPath(localCwd, filePath), content, {
        encoding: "utf8",
      });
    },
    mkdir: async (dirPath) => {
      await vm.fs.mkdir(toGuestPath(localCwd, dirPath), { recursive: true });
    },
  };
}

function createGondolinEditOps(vm: VM, localCwd: string): EditOperations {
  const readOps = createGondolinReadOps(vm, localCwd);
  const writeOps = createGondolinWriteOps(vm, localCwd);
  return {
    readFile: readOps.readFile,
    writeFile: writeOps.writeFile,
    access: readOps.access,
  };
}

function sanitizeEnv(
  env: NodeJS.ProcessEnv | undefined,
): Record<string, string> | undefined {
  if (!env) return undefined;
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}

function createGondolinBashOps(
  vm: VM,
  localCwd: string,
  shellPath: string,
): BashOperations {
  return {
    exec: async (command, cwd, { onData, signal, timeout, env }) => {
      if (signal?.aborted) throw new Error("aborted");
      const guestCwd = toGuestPath(localCwd, cwd);
      const controller = new AbortController();
      const onAbort = () => controller.abort();
      signal?.addEventListener("abort", onAbort, { once: true });

      let timedOut = false;
      const timer =
        timeout && timeout > 0
          ? setTimeout(() => {
              timedOut = true;
              controller.abort();
            }, timeout * 1000)
          : undefined;

      try {
        const proc = vm.exec([shellPath, "-lc", command], {
          cwd: guestCwd,
          env: sanitizeEnv(env),
          signal: controller.signal,
          stdout: "pipe",
          stderr: "pipe",
        });
        for await (const chunk of proc.output()) onData(chunk.data);
        const result = await proc;
        return { exitCode: result.exitCode };
      } catch (error) {
        if (signal?.aborted) throw new Error("aborted");
        if (timedOut) throw new Error(`timeout:${timeout}`);
        throw error;
      } finally {
        if (timer) clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      }
    },
  };
}

export default function (pi: ExtensionAPI) {
  const localCwd = process.cwd();
  const localRead = createReadTool(localCwd);
  const localWrite = createWriteTool(localCwd);
  const localEdit = createEditTool(localCwd);
  const localBash = createBashTool(localCwd);

  const config = loadConfig();
  let vm: VM | undefined;
  let vmStarting: Promise<VM> | undefined;
  let shellPath = "/bin/sh";
  let vmShortId = "";
  let starting = false;
  let enabled = config.autostart;
  let ui: ExtensionContext["ui"] | undefined;

  // guest mount path -> host directory, for directories beyond the workspace.
  const extraMounts = new Map<string, string>();
  for (const entry of config.mounts) {
    const { host, guest } = resolveMount(entry);
    if (guest !== GUEST_WORKSPACE) extraMounts.set(guest, host);
  }

  const updateStatus = () => {
    if (!ui) return;
    if (!enabled) return ui.setStatus("sandbox", undefined);
    if (vm) return ui.setStatus("sandbox", ui.theme.fg("accent", `⬢ sandbox ${vmShortId}`));
    if (starting)
      return ui.setStatus("sandbox", ui.theme.fg("warning", "⬢ sandbox starting…"));
    ui.setStatus("sandbox", ui.theme.fg("muted", "⬢ sandbox"));
  };

  pi.registerFlag("sandbox", {
    description: "Autostart the sandbox VM when the session starts",
    type: "boolean",
    default: config.autostart,
  });

  async function startVm(ctx?: ExtensionContext): Promise<VM> {
    starting = true;
    updateStatus();
    const mounts: Record<string, RealFSProvider> = {
      [GUEST_WORKSPACE]: new RealFSProvider(localCwd),
    };
    for (const [guest, host] of extraMounts)
      mounts[guest] = new RealFSProvider(host);
    const created = await VM.create({
      sessionLabel: `pi ${path.basename(localCwd)}`,
      vfs: { mounts },
    });
    const bashProbe = await created.exec([
      "/bin/sh",
      "-lc",
      "command -v bash || true",
    ]);
    shellPath = bashProbe.stdout.trim() || "/bin/sh";
    vm = created;
    vmShortId = created.id.slice(0, 8);
    starting = false;
    updateStatus();
    const extraLine =
      extraMounts.size > 0
        ? ` Extra mounts: ${Array.from(extraMounts.values()).join(", ")}.`
        : "";
    ctx?.ui.notify(
      `Sandbox VM ready. ${localCwd} is mounted at ${GUEST_WORKSPACE}.${extraLine}`,
      "info",
    );
    return created;
  }

  async function ensureVm(ctx?: ExtensionContext): Promise<VM> {
    if (vm) return vm;
    if (!vmStarting) {
      vmStarting = startVm(ctx).finally(() => {
        vmStarting = undefined;
      });
    }
    return vmStarting;
  }

  async function stopVm(): Promise<void> {
    const activeVm = vm;
    vm = undefined;
    vmStarting = undefined;
    starting = false;
    if (activeVm) await activeVm.close();
  }

  // Apply a mount change. Restarts a running VM so the new mount map takes effect.
  async function applyMountChange(ctx: ExtensionContext): Promise<void> {
    if (!enabled || (!vm && !vmStarting)) return;
    await stopVm();
    await ensureVm(ctx);
  }

  function mountList(): string {
    if (extraMounts.size === 0) return "No extra mounts.";
    return Array.from(extraMounts.entries())
      .map(([guest, host]) => `${host} → ${guest}`)
      .join("\n");
  }

  pi.on("session_start", async (_event, ctx) => {
    ui = ctx.ui;
    enabled = pi.getFlag("sandbox");
    if (enabled) await ensureVm(ctx);
    updateStatus();
  });

  pi.on("session_shutdown", async (_event, _ctx) => {
    await stopVm();
    ui = undefined;
  });

  async function toggleSandbox(ctx: ExtensionContext): Promise<void> {
    if (enabled) {
      enabled = false;
      await stopVm();
      updateStatus();
      ctx.ui.notify("Sandbox disabled. Tools now run on the host.", "info");
      return;
    }
    enabled = true;
    const activeVm = await ensureVm(ctx);
    updateStatus();
    ctx.ui.notify(
      [
        "Sandbox enabled.",
        `VM: ${activeVm.id}`,
        `Host workspace: ${localCwd}`,
        `Guest workspace: ${GUEST_WORKSPACE}`,
        extraMounts.size > 0 ? `Extra mounts:\n${mountList()}` : undefined,
        `Shell: ${shellPath}`,
      ]
        .filter(Boolean)
        .join("\n"),
      "info",
    );
  }

  async function mountDir(ctx: ExtensionContext, input: string): Promise<void> {
    if (!input) {
      ctx.ui.notify("Usage: /sandbox mount <dir>", "warning");
      return;
    }
    const { host, guest } = resolveMount(input);
    try {
      if (!statSync(host).isDirectory()) {
        ctx.ui.notify(`Not a directory: ${host}`, "error");
        return;
      }
    } catch {
      ctx.ui.notify(`Directory does not exist: ${host}`, "error");
      return;
    }
    if (guest === GUEST_WORKSPACE || guest.startsWith(`${GUEST_WORKSPACE}/`)) {
      ctx.ui.notify(`${host} is already part of the workspace.`, "warning");
      return;
    }
    if (extraMounts.get(guest) === host) {
      ctx.ui.notify(`Already mounted: ${host}`, "info");
      return;
    }
    extraMounts.set(guest, host);
    await applyMountChange(ctx);
    ctx.ui.notify(`Mounted ${host} at ${guest}.`, "info");
  }

  async function unmountDir(ctx: ExtensionContext, input: string): Promise<void> {
    if (!input) {
      ctx.ui.notify("Usage: /sandbox unmount <dir>", "warning");
      return;
    }
    const { host, guest } = resolveMount(input);
    if (!extraMounts.has(guest)) {
      ctx.ui.notify(`Not mounted: ${host}`, "warning");
      return;
    }
    extraMounts.delete(guest);
    await applyMountChange(ctx);
    ctx.ui.notify(`Unmounted ${host}.`, "info");
  }

  pi.registerCommand("sandbox", {
    description:
      "Toggle the sandbox VM, or manage mounts: mount <dir> | unmount <dir> | list",
    getArgumentCompletions: (prefix) => {
      const sub = ["mount", "unmount", "list"];
      if (!prefix.includes(" "))
        return sub
          .filter((s) => s.startsWith(prefix))
          .map((s) => ({ value: s, label: s }));
      return null;
    },
    handler: async (args, ctx) => {
      ui = ctx.ui;
      const trimmed = args.trim();
      const [sub, ...rest] = trimmed.split(/\s+/);
      const target = rest.join(" ");
      switch (sub) {
        case "":
          return toggleSandbox(ctx);
        case "mount":
          return mountDir(ctx, target);
        case "unmount":
        case "umount":
          return unmountDir(ctx, target);
        case "list":
        case "ls":
          ctx.ui.notify(mountList(), "info");
          return;
        default:
          ctx.ui.notify(
            `Unknown subcommand: ${sub}. Use mount, unmount, or list.`,
            "warning",
          );
      }
    },
  });

  pi.registerTool({
    ...localRead,
    async execute(id, params, signal, onUpdate, ctx) {
      if (!enabled) return localRead.execute(id, params, signal, onUpdate);
      const activeVm = await ensureVm(ctx);
      const tool = createReadTool(GUEST_WORKSPACE, {
        operations: createGondolinReadOps(activeVm, localCwd),
      });
      return tool.execute(id, params, signal, onUpdate);
    },
  });

  pi.registerTool({
    ...localWrite,
    async execute(id, params, signal, onUpdate, ctx) {
      if (!enabled) return localWrite.execute(id, params, signal, onUpdate);
      const activeVm = await ensureVm(ctx);
      const tool = createWriteTool(GUEST_WORKSPACE, {
        operations: createGondolinWriteOps(activeVm, localCwd),
      });
      return tool.execute(id, params, signal, onUpdate);
    },
  });

  pi.registerTool({
    ...localEdit,
    async execute(id, params, signal, onUpdate, ctx) {
      if (!enabled) return localEdit.execute(id, params, signal, onUpdate);
      const activeVm = await ensureVm(ctx);
      const tool = createEditTool(GUEST_WORKSPACE, {
        operations: createGondolinEditOps(activeVm, localCwd),
      });
      return tool.execute(id, params, signal, onUpdate);
    },
  });

  pi.registerTool({
    ...localBash,
    async execute(id, params, signal, onUpdate, ctx) {
      if (!enabled) return localBash.execute(id, params, signal, onUpdate);
      const activeVm = await ensureVm(ctx);
      const tool = createBashTool(GUEST_WORKSPACE, {
        operations: createGondolinBashOps(activeVm, localCwd, shellPath),
      });
      return tool.execute(id, params, signal, onUpdate);
    },
  });

  pi.on("user_bash", async (_event, ctx) => {
    if (!enabled) return;
    const activeVm = await ensureVm(ctx);
    return { operations: createGondolinBashOps(activeVm, localCwd, shellPath) };
  });

  pi.on("before_agent_start", async (event, _ctx) => {
    if (!enabled) return;
    const localLine = `Current working directory: ${localCwd}`;
    const guestLine = `Current working directory: ${GUEST_WORKSPACE} (Gondolin VM; host workspace mounted from ${localCwd})`;
    const systemPrompt = event.systemPrompt.includes(localLine)
      ? event.systemPrompt.replace(localLine, guestLine)
      : `${event.systemPrompt}\n\n${guestLine}`;
    return { systemPrompt };
  });
}
