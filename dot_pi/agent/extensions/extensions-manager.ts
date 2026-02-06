/**
 * Extensions Manager
 *
 * Provides a /extensions command to enable/disable discovered extensions.
 * Changes are written to settings.json as exact path overrides (+path / -path).
 *
 * NOTE: Changes take effect after `/reload`.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import {
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import { homedir } from "node:os";
import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@mariozechner/pi-coding-agent";
import { getSettingsListTheme } from "@mariozechner/pi-coding-agent";
import {
  Container,
  type SettingItem,
  SettingsList,
} from "@mariozechner/pi-tui";

type Scope = "project" | "global";

interface SettingsFile {
  extensions?: unknown;
  [key: string]: unknown;
}

interface ScopeConfig {
  scope: Scope;
  settingsPath: string;
  baseDir: string;
  extensionsDir: string;
}

interface ExtensionEntry {
  id: string;
  scope: Scope;
  path: string;
  displayName: string;
  enabled: boolean;
}

const EXTENSION_FILE_EXTENSIONS = new Set([".ts", ".js", ".mjs", ".cjs"]);

function resolveAgentDir(): string {
  const configured = process.env.PI_CODING_AGENT_DIR;
  if (!configured) {
    return join(homedir(), ".pi", "agent");
  }
  if (configured.startsWith("~/")) {
    return join(homedir(), configured.slice(2));
  }
  return resolve(configured);
}

function getScopeConfig(ctx: ExtensionCommandContext): ScopeConfig[] {
  const projectBaseDir = join(ctx.cwd, ".pi");
  const globalBaseDir = resolveAgentDir();
  return [
    {
      scope: "project",
      settingsPath: join(projectBaseDir, "settings.json"),
      baseDir: projectBaseDir,
      extensionsDir: join(projectBaseDir, "extensions"),
    },
    {
      scope: "global",
      settingsPath: join(globalBaseDir, "settings.json"),
      baseDir: globalBaseDir,
      extensionsDir: join(globalBaseDir, "extensions"),
    },
  ];
}

function readSettings(path: string): SettingsFile {
  if (!existsSync(path)) {
    return {};
  }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as SettingsFile;
    }
    return {};
  } catch {
    return {};
  }
}

function writeSettings(path: string, settings: SettingsFile): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`, "utf-8");
}

function parseOverrides(
  settings: SettingsFile,
  baseDir: string,
): { include: Set<string>; exclude: Set<string> } {
  const include = new Set<string>();
  const exclude = new Set<string>();
  const entries = Array.isArray(settings.extensions) ? settings.extensions : [];

  for (const entry of entries) {
    if (typeof entry !== "string" || entry.length < 2) continue;
    const kind = entry[0];
    if (kind !== "+" && kind !== "-") continue;

    const target = entry.slice(1);
    if (!target) continue;

    const absPath = isAbsolute(target) ? target : resolve(baseDir, target);
    if (kind === "+") include.add(absPath);
    if (kind === "-") exclude.add(absPath);
  }

  return { include, exclude };
}

function toRelativeOrAbsolute(path: string, baseDir: string): string {
  const rel = relative(baseDir, path);
  if (rel && !rel.startsWith("..") && !isAbsolute(rel)) {
    return rel;
  }
  return path;
}

function setOverride(
  settings: SettingsFile,
  baseDir: string,
  extensionPath: string,
  enabled: boolean,
): SettingsFile {
  const current = Array.isArray(settings.extensions)
    ? settings.extensions.filter(
        (value): value is string => typeof value === "string",
      )
    : [];

  const relativePath = toRelativeOrAbsolute(extensionPath, baseDir);
  const plusRelative = `+${relativePath}`;
  const minusRelative = `-${relativePath}`;
  const plusAbsolute = `+${extensionPath}`;
  const minusAbsolute = `-${extensionPath}`;

  const filtered = current.filter(
    (value) =>
      value !== plusRelative &&
      value !== minusRelative &&
      value !== plusAbsolute &&
      value !== minusAbsolute,
  );

  if (enabled) {
    filtered.push(plusRelative);
  } else {
    filtered.push(minusRelative);
  }

  return {
    ...settings,
    extensions: filtered,
  };
}

function discoverExtensionsInDir(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const result: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isFile() && EXTENSION_FILE_EXTENSIONS.has(extname(entry.name))) {
      result.push(fullPath);
      continue;
    }
    if (entry.isDirectory()) {
      const hasIndex = ["index.ts", "index.js", "index.mjs", "index.cjs"].some(
        (name) => existsSync(join(fullPath, name)),
      );
      const hasPackage = existsSync(join(fullPath, "package.json"));
      if (hasIndex || hasPackage) {
        result.push(fullPath);
      }
    }
  }

  return result;
}

function buildEntryDisplayName(
  path: string,
  scope: Scope,
  config: ScopeConfig,
): string {
  const relativePath = relative(config.extensionsDir, path);
  const shortName =
    relativePath && !relativePath.startsWith("..") ? relativePath : path;
  return `[${scope}] ${shortName}`;
}

function collectEntries(ctx: ExtensionCommandContext): {
  entries: ExtensionEntry[];
  settingsByScope: Map<Scope, SettingsFile>;
  configByScope: Map<Scope, ScopeConfig>;
} {
  const settingsByScope = new Map<Scope, SettingsFile>();
  const configByScope = new Map<Scope, ScopeConfig>();
  const entriesByPath = new Map<string, ExtensionEntry>();

  for (const config of getScopeConfig(ctx)) {
    configByScope.set(config.scope, config);
    const settings = readSettings(config.settingsPath);
    settingsByScope.set(config.scope, settings);

    const { include, exclude } = parseOverrides(settings, config.baseDir);
    const discovered = discoverExtensionsInDir(config.extensionsDir);
    const combined = new Set<string>([...discovered, ...include, ...exclude]);

    for (const fullPath of combined) {
      const key = `${config.scope}:${fullPath}`;
      const enabled = !exclude.has(fullPath);
      entriesByPath.set(key, {
        id: key,
        scope: config.scope,
        path: fullPath,
        displayName: buildEntryDisplayName(fullPath, config.scope, config),
        enabled,
      });
    }
  }

  const entries = Array.from(entriesByPath.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
  return { entries, settingsByScope, configByScope };
}

function updateEntryState(
  entry: ExtensionEntry,
  enabled: boolean,
  settingsByScope: Map<Scope, SettingsFile>,
  configByScope: Map<Scope, ScopeConfig>,
): void {
  const config = configByScope.get(entry.scope);
  const settings = settingsByScope.get(entry.scope);
  if (!config || !settings) return;

  const nextSettings = setOverride(
    settings,
    config.baseDir,
    entry.path,
    enabled,
  );
  settingsByScope.set(entry.scope, nextSettings);
  writeSettings(config.settingsPath, nextSettings);
  entry.enabled = enabled;
}

export default function extensionsManager(pi: ExtensionAPI) {
  pi.registerCommand("extensions", {
    description: "Enable/disable extensions (apply with /reload)",
    handler: async (_args, ctx) => {
      const { entries, settingsByScope, configByScope } = collectEntries(ctx);

      if (entries.length === 0) {
        ctx.ui.notify(
          "No extensions discovered in .pi/extensions or ~/.pi/agent/extensions",
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

        const title = new (class {
          render(_width: number) {
            return [
              theme.fg("accent", theme.bold("Extension Manager")),
              theme.fg("muted", "Apply changes with /reload"),
              "",
            ];
          }
          invalidate() {}
        })();

        const settingsList = new SettingsList(
          items,
          Math.min(items.length + 2, 16),
          getSettingsListTheme(),
          (id, newValue) => {
            const entry = entries.find((item) => item.id === id);
            if (!entry) return;
            updateEntryState(
              entry,
              newValue === "enabled",
              settingsByScope,
              configByScope,
            );
          },
          () => {
            done(undefined);
          },
        );

        const container = new Container();
        container.addChild(title);
        container.addChild(settingsList);

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

      ctx.ui.notify(
        "Extension settings updated. Run /reload to apply.",
        "info",
      );
    },
  });
}
