import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import {
	ALL_FEATURE_KEYS,
	CUSTOM_TOOL_NAMES,
	loadGlobalFeatureState,
	saveGlobalFeatureState,
	type FeatureKey,
} from "./extension-common.ts";
import { enableAutocompletePatching } from "./editor.ts";
import { FffRuntime } from "./fff.ts";
import { registerCommands } from "./register-commands.ts";
import { registerTools } from "./register-tools.ts";

export default function (pi: ExtensionAPI) {
	let runtime: FffRuntime | null = null;
	let enabledFeatures = new Set<FeatureKey>(ALL_FEATURE_KEYS);
	const isFeatureEnabled = (feature: FeatureKey) => enabledFeatures.has(feature);
	const getRuntime = () => runtime;
	const getEnabledFeatures = () => new Set(enabledFeatures);
	const setEnabledFeatures = (next: Set<FeatureKey>) => {
		enabledFeatures = new Set(next);
	};

	const syncCustomToolActivation = () => {
		const activeTools = new Set(pi.getActiveTools());
		for (const toolName of CUSTOM_TOOL_NAMES) {
			if (isFeatureEnabled("agentTools")) activeTools.add(toolName);
			else activeTools.delete(toolName);
		}
		pi.setActiveTools(Array.from(activeTools));
	};

	const applyUiConfiguration = (_ctx: ExtensionContext) => {
		enableAutocompletePatching(
			isFeatureEnabled("autocomplete") ? runtime : null,
			isFeatureEnabled("autocomplete"),
		);

		syncCustomToolActivation();
	};

	const persistFeatures = async () => {
		const saved = await saveGlobalFeatureState(enabledFeatures);
		if (saved.isErr()) {
			console.error("Failed to save pi-fff feature state:", saved.error);
		}
	};

	const restoreFeatures = async () => {
		const restored = await loadGlobalFeatureState();
		if (restored.isOk()) {
			enabledFeatures = new Set(restored.value ?? ALL_FEATURE_KEYS);
		} else {
			console.warn("Failed to restore pi-fff feature state:", restored.error);
			enabledFeatures = new Set(ALL_FEATURE_KEYS);
		}
		syncCustomToolActivation();
	};

	const agentToolsDisabledText = () => 'pi-fff feature "agent tools" is disabled. Use /fff-features to re-enable it.';

	registerTools(pi, {
		getRuntime,
		isFeatureEnabled,
		agentToolsDisabledText,
	});

	registerCommands(pi, {
		getRuntime,
		isFeatureEnabled,
		getEnabledFeatures,
		setEnabledFeatures,
		persistFeatures,
		applyUiConfiguration,
	});

	pi.on("session_start", async (_event, ctx) => {
		runtime?.dispose();
		runtime = new FffRuntime(ctx.cwd);
		await restoreFeatures();
		applyUiConfiguration(ctx);

		void (async () => {
			const activeRuntime = runtime;
			if (!activeRuntime) return;
			const warmed = await activeRuntime.warm(1500);
			if (runtime !== activeRuntime) return;
			if (warmed.isErr()) {
				if (isFeatureEnabled("statusUI")) {
					ctx.ui.notify(`fff unavailable: ${warmed.error.message}`, "warning");
				}
				return;
			}
			const indexed = warmed.value.indexedFiles ? ` (${warmed.value.indexedFiles} files)` : "";
			if (isFeatureEnabled("statusUI")) {
				ctx.ui.notify(`fff path + grep mode enabled${indexed}`, "info");
			}
		})();
	});

	pi.on("session_shutdown", async () => {
		enableAutocompletePatching(null, false);
		runtime?.dispose();
		runtime = null;
	});
}
