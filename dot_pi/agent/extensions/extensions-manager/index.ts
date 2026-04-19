/**
 * Extensions Manager
 *
 * Provides a /extensions command to enable/disable all discovered extensions —
 * top-level (auto-discovered from .pi/extensions or ~/.pi/agent/extensions,
 * plus local paths listed in settings.extensions) and package-installed
 * (npm:/git:/local directories listed in settings.packages).
 *
 * Writes exact-path +/- patterns into the right settings scope:
 *   - Top-level: settings.extensions (project or global)
 *   - Package:   settings.packages[i].extensions filter on the owning package
 *
 * NOTE: Changes take effect after `/reload`.
 */

import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import type {
  ExtensionAPI,
  ExtensionCommandContext,
  PackageSource,
  ResolvedResource,
} from "@mariozechner/pi-coding-agent";
import {
  DefaultPackageManager,
  DynamicBorder,
  SettingsManager,
  getSettingsListTheme,
} from "@mariozechner/pi-coding-agent";
import {
  Container,
  type SettingItem,
  SettingsList,
  Text,
} from "@mariozechner/pi-tui";

interface EntryState {
  id: string;
  displayName: string;
  enabled: boolean;
  resource: ResolvedResource;
}

function resolveAgentDir(): string {
  const configured = process.env.PI_CODING_AGENT_DIR;
  if (!configured) return join(homedir(), ".pi", "agent");
  if (configured.startsWith("~/")) return join(homedir(), configured.slice(2));
  return resolve(configured);
}

function buildDisplayName(res: ResolvedResource): string {
  const { path, metadata } = res;
  const fileName = basename(path);
  const parent = basename(dirname(path));
  const short =
    parent && parent !== "extensions" && parent !== "."
      ? `${parent}/${fileName}`
      : fileName;

  const scopeTag = `[${metadata.scope}]`;
  if (metadata.origin === "package") {
    return `${scopeTag} ${metadata.source} · ${short}`;
  }
  if (metadata.source === "auto") {
    return `${scopeTag} ${short}`;
  }
  return `${scopeTag} ${metadata.source} · ${short}`;
}

function getTopLevelBaseDir(
  scope: "user" | "project" | "temporary",
  cwd: string,
  agentDir: string,
): string {
  return scope === "project" ? join(cwd, ".pi") : agentDir;
}

function computePattern(
  res: ResolvedResource,
  cwd: string,
  agentDir: string,
): string {
  if (res.metadata.origin === "package") {
    const base = res.metadata.baseDir ?? dirname(res.path);
    return relative(base, res.path);
  }
  const base = getTopLevelBaseDir(res.metadata.scope, cwd, agentDir);
  return relative(base, res.path);
}

function stripPrefix(p: string): string {
  return p.startsWith("!") || p.startsWith("+") || p.startsWith("-")
    ? p.slice(1)
    : p;
}

function toggleTopLevel(
  settingsManager: SettingsManager,
  res: ResolvedResource,
  enabled: boolean,
  pattern: string,
): void {
  const scope = res.metadata.scope;
  const settings =
    scope === "project"
      ? settingsManager.getProjectSettings()
      : settingsManager.getGlobalSettings();
  const current = (settings.extensions ?? []) as string[];
  const updated = current.filter((p) => stripPrefix(p) !== pattern);
  updated.push(enabled ? `+${pattern}` : `-${pattern}`);

  if (scope === "project") {
    settingsManager.setProjectExtensionPaths(updated);
  } else {
    settingsManager.setExtensionPaths(updated);
  }
}

function togglePackage(
  settingsManager: SettingsManager,
  res: ResolvedResource,
  enabled: boolean,
  pattern: string,
): void {
  const scope = res.metadata.scope;
  const settings =
    scope === "project"
      ? settingsManager.getProjectSettings()
      : settingsManager.getGlobalSettings();
  const packages: PackageSource[] = [
    ...((settings.packages ?? []) as PackageSource[]),
  ];

  const idx = packages.findIndex((pkg) => {
    const source = typeof pkg === "string" ? pkg : pkg.source;
    return source === res.metadata.source;
  });
  if (idx === -1) return;

  let pkg = packages[idx];
  if (typeof pkg === "string") {
    pkg = { source: pkg };
    packages[idx] = pkg;
  }

  const current = (pkg.extensions ?? []) as string[];
  const updated = current.filter((p) => stripPrefix(p) !== pattern);
  updated.push(enabled ? `+${pattern}` : `-${pattern}`);

  pkg.extensions = updated.length > 0 ? updated : undefined;

  const hasFilters = (
    ["extensions", "skills", "prompts", "themes"] as const
  ).some((k) => pkg![k] !== undefined);
  if (!hasFilters) {
    packages[idx] = pkg.source;
  }

  if (scope === "project") {
    settingsManager.setProjectPackages(packages);
  } else {
    settingsManager.setPackages(packages);
  }
}

function toggleEntry(
  settingsManager: SettingsManager,
  res: ResolvedResource,
  enabled: boolean,
  cwd: string,
  agentDir: string,
): void {
  const pattern = computePattern(res, cwd, agentDir);
  if (!pattern) return;
  if (res.metadata.origin === "package") {
    togglePackage(settingsManager, res, enabled, pattern);
  } else {
    toggleTopLevel(settingsManager, res, enabled, pattern);
  }
}

async function loadEntries(ctx: ExtensionCommandContext): Promise<{
  entries: EntryState[];
  settingsManager: SettingsManager;
  agentDir: string;
}> {
  const agentDir = resolveAgentDir();
  const settingsManager = SettingsManager.create(ctx.cwd, agentDir);
  const pm = new DefaultPackageManager({
    cwd: ctx.cwd,
    agentDir,
    settingsManager,
  });

  // Skip any missing/uninstalled sources rather than prompting in a TUI.
  const resolved = await pm.resolve(async () => "skip");

  const entries: EntryState[] = resolved.extensions
    .map((res, i) => ({
      id: `${res.metadata.origin}:${res.metadata.scope}:${res.metadata.source}:${res.path}:${i}`,
      displayName: buildDisplayName(res),
      enabled: res.enabled,
      resource: res,
    }))
    .sort((a, b) => {
      const ao = a.resource.metadata.origin;
      const bo = b.resource.metadata.origin;
      if (ao !== bo) return ao === "package" ? -1 : 1;
      if (a.resource.metadata.scope !== b.resource.metadata.scope) {
        return a.resource.metadata.scope === "user" ? -1 : 1;
      }
      return a.displayName.localeCompare(b.displayName);
    });

  return { entries, settingsManager, agentDir };
}

export default function extensionsManager(pi: ExtensionAPI) {
  pi.registerCommand("extensions", {
    description: "Enable/disable extensions (apply with /reload)",
    handler: async (_args, ctx) => {
      const { entries, settingsManager, agentDir } = await loadEntries(ctx);

      if (entries.length === 0) {
        ctx.ui.notify(
          "No extensions discovered (check .pi/extensions, ~/.pi/agent/extensions, and settings.packages)",
          "warning",
        );
        return;
      }

      await ctx.ui.custom((tui, theme, _kb, done) => {
        const items: SettingItem[] = entries.map((entry) => ({
          id: entry.id,
          label: entry.displayName,
          currentValue: entry.enabled ? "enabled" : "disabled",
          values: ["enabled", "disabled"],
        }));

        const container = new Container();
        container.addChild(
          new DynamicBorder((s: string) => theme.fg("accent", s)),
        );
        container.addChild(
          new Text(theme.fg("accent", theme.bold("Extension Manager")), 1, 0),
        );
        container.addChild(
          new Text(theme.fg("muted", "Apply changes with /reload"), 1, 0),
        );

        const settingsList = new SettingsList(
          items,
          Math.min(items.length, 14),
          getSettingsListTheme(),
          (id, newValue) => {
            const entry = entries.find((item) => item.id === id);
            if (!entry) return;
            const enabled = newValue === "enabled";
            toggleEntry(
              settingsManager,
              entry.resource,
              enabled,
              ctx.cwd,
              agentDir,
            );
            entry.enabled = enabled;
          },
          () => {
            done(undefined);
          },
          { enableSearch: true },
        );

        container.addChild(settingsList);
        container.addChild(
          new Text(
            theme.fg("dim", "Enter/Space toggle • / search • Esc close"),
            1,
            0,
          ),
        );
        container.addChild(
          new DynamicBorder((s: string) => theme.fg("accent", s)),
        );

        return {
          render(width: number) {
            return container.render(width);
          },
          invalidate() {
            container.invalidate();
          },
          handleInput(data: string) {
            settingsList.handleInput?.(data);
            tui.requestRender();
          },
        };
      });

      try {
        await settingsManager.flush();
      } catch (err) {
        ctx.ui.notify(
          `Failed to persist settings: ${(err as Error).message}`,
          "error",
        );
        return;
      }

      ctx.ui.notify(
        "Extension settings updated. Run /reload to apply.",
        "info",
      );
    },
  });
}
