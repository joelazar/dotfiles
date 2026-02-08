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
  writeFileSync,
} from "node:fs";
import {
  basename,
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
import {
  DynamicBorder,
  getSettingsListTheme,
} from "@mariozechner/pi-coding-agent";
import {
  Container,
  type SettingItem,
  SettingsList,
  Text,
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

const EXTENSION_FILE_EXTENSIONS = new Set([".ts", ".js"]);
const INDEX_ENTRY_FILES = ["index.ts", "index.js"];

interface PiManifest {
  extensions?: string[];
}

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
    const resolvedPaths = (() => {
      if (!existsSync(absPath)) return [absPath];
      const maybeEntries = resolveExtensionEntries(absPath);
      return maybeEntries.length > 0 ? maybeEntries : [absPath];
    })();

    for (const resolvedPath of resolvedPaths) {
      if (kind === "+") include.add(resolvedPath);
      if (kind === "-") exclude.add(resolvedPath);
    }
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

  const legacyDirAbsolute = INDEX_ENTRY_FILES.includes(basename(extensionPath))
    ? dirname(extensionPath)
    : undefined;
  const legacyDirRelative = legacyDirAbsolute
    ? toRelativeOrAbsolute(legacyDirAbsolute, baseDir)
    : undefined;

  const filtered = current.filter((value) => {
    if (
      value === plusRelative ||
      value === minusRelative ||
      value === plusAbsolute ||
      value === minusAbsolute
    ) {
      return false;
    }

    if (!legacyDirAbsolute || !legacyDirRelative) {
      return true;
    }

    return (
      value !== `+${legacyDirAbsolute}` &&
      value !== `-${legacyDirAbsolute}` &&
      value !== `+${legacyDirRelative}` &&
      value !== `-${legacyDirRelative}`
    );
  });

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

function resolveExtensionEntries(dir: string): string[] {
  const packageJsonPath = join(dir, "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const content = readFileSync(packageJsonPath, "utf-8");
      const pkg = JSON.parse(content) as { pi?: PiManifest };
      const entries = pkg?.pi?.extensions;
      if (Array.isArray(entries) && entries.length > 0) {
        return entries
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => resolve(dir, entry))
          .filter((entryPath) => existsSync(entryPath));
      }
    } catch {
      // ignore malformed package.json; fall back to index file discovery
    }
  }

  for (const file of INDEX_ENTRY_FILES) {
    const indexPath = join(dir, file);
    if (existsSync(indexPath)) {
      return [indexPath];
    }
  }

  return [];
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
      result.push(...resolveExtensionEntries(fullPath));
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
  let shortName =
    relativePath && !relativePath.startsWith("..") ? relativePath : path;

  const base = basename(shortName);
  if (INDEX_ENTRY_FILES.includes(base)) {
    shortName = dirname(shortName);
  }

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

      ctx.ui.notify(
        "Extension settings updated. Run /reload to apply.",
        "info",
      );
    },
  });
}
