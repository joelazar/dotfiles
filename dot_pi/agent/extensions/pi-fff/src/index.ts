import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import {
	ALL_FEATURE_KEYS,
	CUSTOM_TOOL_NAMES,
	loadGlobalFeatureState,
	PROMPT_GUIDANCE_TEXT,
	RESULT_WIDGET_KEY,
	saveGlobalFeatureState,
	STATUS_KEY,
	widgetLinesForSearch,
	type FeatureKey,
} from "./extension-common.ts";
import { enableAutocompletePatching } from "./editor.ts";
import { FffRuntime } from "./fff.ts";
import { registerCommands } from "./register-commands.ts";
import { registerTools } from "./register-tools.ts";

export default function (pi: ExtensionAPI) {
	let runtime: FffRuntime | null = null;
	let enabledFeatures = new Set<FeatureKey>(ALL_FEATURE_KEYS);
	let statusText = "";

	const isFeatureEnabled = (feature: FeatureKey) => enabledFeatures.has(feature);
	const getRuntime = () => runtime;
	const getEnabledFeatures = () => new Set(enabledFeatures);
	const setEnabledFeatures = (next: Set<FeatureKey>) => {
		enabledFeatures = new Set(next);
	};

	const setStatus = (ctx: ExtensionContext, nextStatus: string) => {
		statusText = nextStatus;
		ctx.ui.setStatus(STATUS_KEY, isFeatureEnabled("statusUI") ? nextStatus : "");
	};

	const setWidget = (ctx: ExtensionContext, title: string, body: string) => {
		if (!isFeatureEnabled("statusUI")) return;
		ctx.ui.setWidget(RESULT_WIDGET_KEY, widgetLinesForSearch(title, body));
	};

	const clearWidget = (ctx: ExtensionContext) => {
		ctx.ui.setWidget(RESULT_WIDGET_KEY, undefined);
	};

	const syncCustomToolActivation = () => {
		const activeTools = new Set(pi.getActiveTools());
		for (const toolName of CUSTOM_TOOL_NAMES) {
			if (isFeatureEnabled("agentTools")) activeTools.add(toolName);
			else activeTools.delete(toolName);
		}
		pi.setActiveTools(Array.from(activeTools));
	};

	const applyUiConfiguration = (ctx: ExtensionContext) => {
		enableAutocompletePatching(
			isFeatureEnabled("autocomplete") ? runtime : null,
			isFeatureEnabled("autocomplete"),
		);

		ctx.ui.setStatus(STATUS_KEY, isFeatureEnabled("statusUI") ? statusText : "");
		if (!isFeatureEnabled("statusUI")) clearWidget(ctx);
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
		setWidget,
		setStatus,
		getEnabledFeatures,
		setEnabledFeatures,
		persistFeatures,
		applyUiConfiguration,
	});

	pi.on("before_agent_start", async (event) => {
		if (!isFeatureEnabled("promptGuidance")) return;
		return {
			systemPrompt: `${event.systemPrompt}\n\n${PROMPT_GUIDANCE_TEXT}`,
		};
	});

	pi.on("session_start", async (_event, ctx) => {
		runtime?.dispose();
		runtime = new FffRuntime(ctx.cwd);
		await restoreFeatures();
		setStatus(ctx, "fff: indexing");
		applyUiConfiguration(ctx);

		const warmed = await runtime.warm(1500);
		if (warmed.isErr()) {
			setStatus(ctx, "fff: unavailable");
			if (isFeatureEnabled("statusUI")) {
				ctx.ui.notify(`fff unavailable: ${warmed.error.message}`, "warning");
			}
			return;
		}
		const indexed = warmed.value.indexedFiles ? ` (${warmed.value.indexedFiles} files)` : "";
		setStatus(ctx, warmed.value.ready ? `fff: ready${indexed}` : `fff: indexing${indexed}`);
		if (isFeatureEnabled("statusUI")) {
			ctx.ui.notify(`fff path + grep mode enabled${indexed}`, "info");
		}
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		ctx.ui.setStatus(STATUS_KEY, "");
		clearWidget(ctx);
		enableAutocompletePatching(null, false);
		runtime?.dispose();
		runtime = null;
	});
}
