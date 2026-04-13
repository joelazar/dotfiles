import { Result, TaggedError } from "better-result";
import { getAgentDir } from "@mariozechner/pi-coding-agent";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	FeatureStateParseError,
	FeatureStateReadError,
	FeatureStateWriteError,
	FinderOperationError,
	type FeatureStateLoadError,
	type GrepSearchError,
	type PathResolutionError,
} from "./errors.ts";
import { formatGrepError, formatPathResolutionError } from "./error-format.ts";
import { formatCandidateLines, resolutionSummary, type FindFilesResponse, type GrepSearchResponse, type HealthCheck, type ResolvedPath, type RuntimeMetadata } from "./fff.ts";

export const STATUS_KEY = "pi-fff";
export const RESULT_WIDGET_KEY = "pi-fff-results";
const GLOBAL_FEATURES_PATH = join(getAgentDir(), "extensions", "pi-fff.json");
export const CUSTOM_TOOL_NAMES = ["find_files", "resolve_file", "related_files", "fff_grep", "fff_multi_grep"] as const;
export const FFF_RUNTIME_NOT_READY_TEXT = "FFF runtime is not ready.";
export const PROMPT_GUIDANCE_TEXT =
	"pi-fff is active. Prefer read/grep and the FFF-backed tools over bash for repo discovery. Use grep for code content and bare identifiers, find_files when exploring which files exist for a topic, and resolve_file when you want to turn an approximate path into one file before reading or editing. Keep grep queries simple: prefer plain text over regex unless regex is truly needed, search one identifier at a time, and use fff_multi_grep when you need multiple naming variants in one pass. Use broad constraints like '*.ts query' or 'src/ query' instead of mixing many words into the pattern. After one or two good greps, read the best file instead of repeatedly grepping similar patterns. If grep returns nothing, simplify the query rather than making it more complex. When custom FFF search tools return a cursor, reuse that cursor to continue the same search instead of starting over.";

export type FeatureKey = "autocomplete" | "builtInToolEnhancements" | "agentTools" | "promptGuidance" | "statusUI";

export type FeatureDefinition = {
	id: FeatureKey;
	label: string;
	description: string;
};

type FeatureState = {
	enabledFeatures: FeatureKey[];
};

export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
	{ id: "autocomplete", label: "Autocomplete", description: "Use FFF for @... editor autocomplete" },
	{ id: "builtInToolEnhancements", label: "Built-in tool enhancements", description: "Use FFF to improve built-in read and grep" },
	{ id: "agentTools", label: "Agent tools", description: "Enable find_files / resolve_file / related_files / fff_grep / fff_multi_grep" },
	{ id: "promptGuidance", label: "Prompt guidance", description: "Inject FFF usage guidance into the system prompt" },
	{ id: "statusUI", label: "Status UI", description: "Show footer status, result widgets, and startup notices" },
];
export const ALL_FEATURE_KEYS = FEATURE_DEFINITIONS.map((feature) => feature.id);

function isMissingFileError(value: unknown): value is NodeJS.ErrnoException {
	return typeof value === "object" && value !== null && "code" in value && (value as NodeJS.ErrnoException).code === "ENOENT";
}

export function buildReadFailureMessage(action: string, query: string, error: PathResolutionError): string {
	return formatPathResolutionError(action, query, error);
}

export function buildRelatedFilesFailureMessage(query: string, error: PathResolutionError | FinderOperationError): string {
	return buildReadFailureMessage("related-files", query, error);
}

export function buildGrepFailureMessage(error: GrepSearchError, pathQuery?: string): string {
	return formatGrepError(error, pathQuery);
}

export function formatResolvedPathResult(resolution: ResolvedPath, limit: number): string {
	return [
		resolutionSummary(resolution),
		...(resolution.candidates.length > 1 ? ["Other candidates:", ...formatCandidateLines(resolution.candidates.slice(1), Math.max(0, limit - 1))] : []),
	].join("\n");
}

export function locationToReadParams(resolution: ResolvedPath, offset: number | undefined, limit: number | undefined) {
	if (offset !== undefined || !resolution.location) return { offset, limit };
	if (resolution.location.type === "line") {
		return { offset: resolution.location.line, limit: limit ?? 80 };
	}
	if (resolution.location.type === "position") {
		return { offset: resolution.location.line, limit: limit ?? 80 };
	}
	const rangeSize = Math.max(1, resolution.location.end.line - resolution.location.start.line + 1);
	return { offset: resolution.location.start.line, limit: limit ?? Math.max(rangeSize, 20) };
}

export function grepNeedsBuiltinFallback(params: {
	pattern: string;
	ignoreCase?: boolean;
	literal?: boolean;
}): boolean {
	if (params.ignoreCase === false && params.pattern.toLowerCase() === params.pattern) return true;
	if (params.ignoreCase === true && !params.literal) return true;
	return false;
}

export function normalizeMode(mode: string | undefined): "plain" | "regex" | "fuzzy" {
	if (mode === "regex" || mode === "fuzzy") return mode;
	return "plain";
}

export function normalizeOutputMode(mode: string | undefined): "content" | "files_with_matches" | "count" | "usage" | undefined {
	if (mode === "files_with_matches" || mode === "count" || mode === "usage" || mode === "content") return mode;
	return undefined;
}

export function looksLikeRegexPattern(pattern: string): boolean {
	return /\\[AbBdDsSwWZz0-9]/.test(pattern)
		|| /\[[^\]]+\]/.test(pattern)
		|| /\([^)]*[|)][^)]*\)/.test(pattern)
		|| /[{}|^$]/.test(pattern)
		|| /\.([*+?])/.test(pattern)
		|| /(^|[^\\])[+?*]($|\s)/.test(pattern);
}

export function inferFffGrepMode(params: { pattern: string; literal?: boolean }): "plain" | "regex" {
	if (params.literal) return "plain";
	return looksLikeRegexPattern(params.pattern) ? "regex" : "plain";
}

export function buildErrorDetails(error?: { message: string } | null) {
	if (!error) {
		return {
			error: null,
			errorTag: null,
			errorData: null,
		};
	}

	const errorData = Object.fromEntries(
		Object.entries(error).filter(([key]) => key !== "message" && key !== "name" && key !== "stack"),
	);
	return {
		error: error.message,
		errorTag: TaggedError.is(error) ? error._tag : null,
		errorData: Object.keys(errorData).length > 0 ? errorData : null,
	};
}

export function buildGrepDetails(result?: GrepSearchResponse, disabledFeature?: FeatureKey, error?: { message: string } | null) {
	return {
		truncation: result?.truncation,
		matchLimitReached: result?.matchLimitReached,
		linesTruncated: result?.linesTruncated ?? false,
		regexFallbackError: result?.regexFallbackError,
		resolvedScope: result?.scope?.relativePath,
		nextCursor: result?.nextCursor ?? null,
		constraints: result?.constraintQuery ?? null,
		suggestedReadPath: result?.suggestedReadPath ?? null,
		...buildErrorDetails(error),
		disabled: disabledFeature !== undefined,
		feature: disabledFeature ?? null,
	};
}

export function buildFindFilesDetails(result?: FindFilesResponse, disabledFeature?: FeatureKey, error?: { message: string } | null) {
	return {
		nextCursor: result?.nextCursor ?? null,
		totalMatched: result?.totalMatched ?? null,
		totalFiles: result?.totalFiles ?? null,
		...buildErrorDetails(error),
		disabled: disabledFeature !== undefined,
		feature: disabledFeature ?? null,
	};
}

export function widgetLinesForSearch(title: string, body: string): string[] {
	return [title, ...body.split("\n").slice(0, 20)];
}

export function buildStatusReport(args: {
	status: { state: string; indexedFiles?: number; error?: string };
	health?: HealthCheck;
	metadata: RuntimeMetadata;
	features: Array<{ label: string; enabled: boolean }>;
	healthError?: { message: string } | null;
}) {
	const lines = [
		`state: ${args.status.state}`,
		`indexed files: ${args.status.indexedFiles ?? "unknown"}`,
		`cwd: ${args.metadata.cwd}`,
		`project root: ${args.metadata.projectRoot}`,
		`index base path: ${args.health?.filePicker.basePath ?? args.metadata.projectRoot}`,
		`git repository: ${args.health?.git.repositoryFound ? "yes" : "no"}`,
		`frecency db: ${args.metadata.frecencyDbPath}`,
		`history db: ${args.metadata.historyDbPath}`,
		`frecency tracking: ${args.health?.frecency.initialized ? "on" : "off"}`,
		`query history: ${args.health?.queryTracker.initialized ? "on" : "off"}`,
		`definition classification: ${args.metadata.definitionClassification}`,
		...args.features.map((feature) => `${feature.label}: ${feature.enabled ? "on" : "off"}`),
	];
	if (args.status.error) lines.push(`error: ${args.status.error}`);
	if (args.healthError) lines.push(`health: ${args.healthError.message}`);
	return lines.join("\n");
}

function isFeatureKey(value: string): value is FeatureKey {
	return ALL_FEATURE_KEYS.includes(value as FeatureKey);
}

export async function loadGlobalFeatureState() {
	const contentResult = await Result.tryPromise({
		try: () => readFile(GLOBAL_FEATURES_PATH, "utf8"),
		catch: (cause) => new FeatureStateReadError({ path: GLOBAL_FEATURES_PATH, cause }),
	});
	if (contentResult.isErr()) {
		if (isMissingFileError(contentResult.error.cause)) return Result.ok<FeatureKey[] | undefined>(undefined);
		return contentResult;
	}

	return Result.try<FeatureKey[] | undefined, FeatureStateLoadError>({
		try: () => {
			const parsed = JSON.parse(contentResult.value) as FeatureState | undefined;
			if (!Array.isArray(parsed?.enabledFeatures)) return undefined;
			const enabled = parsed.enabledFeatures.filter(isFeatureKey);
			return enabled.length > 0 ? enabled : [];
		},
		catch: (cause) => new FeatureStateParseError({ path: GLOBAL_FEATURES_PATH, cause }),
	});
}

export async function saveGlobalFeatureState(enabledFeatures: Set<FeatureKey>) {
	const parentDir = join(getAgentDir(), "extensions");
	const mkdirResult = await Result.tryPromise({
		try: () => mkdir(parentDir, { recursive: true }),
		catch: (cause) => new FeatureStateWriteError({ path: parentDir, cause }),
	});
	if (mkdirResult.isErr()) return mkdirResult;

	return Result.tryPromise({
		try: () =>
			writeFile(
				GLOBAL_FEATURES_PATH,
				`${JSON.stringify({ enabledFeatures: Array.from(enabledFeatures) satisfies FeatureKey[] }, null, 2)}\n`,
				"utf8",
			),
		catch: (cause) => new FeatureStateWriteError({ path: GLOBAL_FEATURES_PATH, cause }),
	});
}
