import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createGrepTool, createReadTool } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { FinderOperationError, RuntimeInitializationError } from "./errors.ts";
import {
	buildErrorDetails,
	buildFindFilesDetails,
	buildGrepDetails,
	buildGrepFailureMessage,
	buildReadFailureMessage,
	buildRelatedFilesFailureMessage,
	FFF_RUNTIME_NOT_READY_TEXT,
	formatResolvedPathResult,
	grepNeedsBuiltinFallback,
	inferFffGrepMode,
	locationToReadParams,
	normalizeMode,
	normalizeOutputMode,
	type FeatureKey,
} from "./extension-common.ts";
import { formatCandidateLines, FffRuntime, type PathResolution, type ResolvedPath } from "./fff.ts";

export type ToolRegistrationDeps = {
	getRuntime(): FffRuntime | null;
	isFeatureEnabled(feature: FeatureKey): boolean;
	agentToolsDisabledText(): string;
};

function textResult<T>(text: string, details: T) {
	return {
		content: [{ type: "text" as const, text }],
		details,
	};
}

function resolveToolDetails(resolution: PathResolution | null, disabled = false, error?: { message: string } | null) {
	return {
		resolution,
		...buildErrorDetails(error),
		disabled,
		feature: disabled ? ("agentTools" as FeatureKey | null) : (null as FeatureKey | null),
	};
}

function relatedFilesDetails(options?: {
	base?: ResolvedPath | null;
	items?: unknown[];
	resolution?: PathResolution | null;
	error?: { message: string } | null;
	disabled?: boolean;
}) {
	const disabled = options?.disabled ?? false;
	return {
		base: options?.base ?? null,
		items: options?.items ?? [],
		resolution: options?.resolution ?? null,
		...buildErrorDetails(options?.error),
		disabled,
		feature: disabled ? ("agentTools" as FeatureKey | null) : (null as FeatureKey | null),
	};
}

export function registerTools(pi: ExtensionAPI, deps: ToolRegistrationDeps): void {
	const readTemplate = createReadTool(process.cwd());
	const grepTemplate = createGrepTool(process.cwd());

	const getAgentRuntime = <T>(disabledDetails: T, unavailableDetails: T) => {
		if (!deps.isFeatureEnabled("agentTools")) {
			return { kind: "disabled" as const, result: textResult(deps.agentToolsDisabledText(), disabledDetails) };
		}
		const runtime = deps.getRuntime();
		if (!runtime) {
			return { kind: "unavailable" as const, result: textResult(FFF_RUNTIME_NOT_READY_TEXT, unavailableDetails) };
		}
		return { kind: "ready" as const, runtime };
	};

	pi.registerTool({
		name: "read",
		label: "read",
		description: `${readTemplate.description} Accepts approximate file paths and resolves them with fff before reading.`,
		parameters: readTemplate.parameters,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const original = createReadTool(ctx.cwd);
			const runtime = deps.getRuntime();
			if (!runtime || !deps.isFeatureEnabled("builtInToolEnhancements")) {
				return original.execute(toolCallId, params, signal, onUpdate);
			}

			const resolution = await runtime.resolvePath(params.path, { allowDirectory: false, limit: 8 });
			return resolution.match({
				err: async (error) => textResult(buildReadFailureMessage("read", params.path, error), { resolution }),
				ok: async (resolved) => {
					void runtime.trackQuery(params.path, resolved.absolutePath);
					const locationParams = locationToReadParams(resolved, params.offset, params.limit);
					return original.execute(
						toolCallId,
						{ ...params, path: resolved.absolutePath, offset: locationParams.offset, limit: locationParams.limit },
						signal,
						onUpdate,
					);
				},
			});
		},
	});

	pi.registerTool({
		name: "grep",
		label: "grep",
		description: `${grepTemplate.description} Uses fff for content search and can resolve approximate file or folder scopes.`,
		parameters: grepTemplate.parameters,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const original = createGrepTool(ctx.cwd);
			const runtime = deps.getRuntime();
			if (!runtime || !deps.isFeatureEnabled("builtInToolEnhancements") || grepNeedsBuiltinFallback(params)) {
				return original.execute(toolCallId, params, signal, onUpdate);
			}

			const pattern = params.ignoreCase === true ? params.pattern.toLowerCase() : params.pattern;
			const result = await runtime.grepSearch({
				pattern,
				mode: inferFffGrepMode({ pattern, literal: params.literal }),
				pathQuery: params.path,
				glob: params.glob,
				context: params.context,
				limit: params.limit,
				includeCursorHint: false,
			});
			return result.match({
				err: async (error) => {
					if (RuntimeInitializationError.is(error) || FinderOperationError.is(error)) {
						return original.execute(toolCallId, params, signal, onUpdate);
					}
					return textResult(buildGrepFailureMessage(error, params.path), buildGrepDetails(undefined, undefined, error));
				},
				ok: async (value) => textResult(value.formatted, buildGrepDetails(value)),
			});
		},
	});

	pi.registerTool({
		name: "find_files",
		label: "Find Files",
		description: "Browse ranked file candidates for a fuzzy query using fff.",
		promptSnippet: "Explore which files exist for a topic before reading one.",
		promptGuidelines: ["Use this tool when you are exploring a topic, looking for a file, or want paginated ranked candidates before reading."],
		parameters: Type.Object({
			query: Type.String({ description: "Fuzzy file query" }),
			limit: Type.Optional(Type.Number({ description: "Maximum number of results to return (default: 20)" })),
			cursor: Type.Optional(Type.String({ description: "Cursor from a previous find_files result" })),
		}),
		async execute(_toolCallId, params) {
			const guarded = getAgentRuntime(buildFindFilesDetails(undefined, "agentTools"), buildFindFilesDetails());
			if (guarded.kind !== "ready") return guarded.result;
			const result = await guarded.runtime.findFiles({ query: params.query, limit: params.limit, cursor: params.cursor });
			return result.match({
				err: (error) => textResult(error.message, buildFindFilesDetails(undefined, undefined, error)),
				ok: (value) => textResult(value.formatted, buildFindFilesDetails(value)),
			});
		},
	});

	pi.registerTool({
		name: "resolve_file",
		label: "Resolve File",
		description: "Resolve an approximate file or folder query to exact project paths using fff fuzzy search.",
		promptSnippet: "Resolve vague file or folder references into exact project paths before reading or editing.",
		promptGuidelines: [
			"Use this tool when the user names a file approximately and you want ranked candidate paths before reading.",
		],
		parameters: Type.Object({
			query: Type.String({ description: "Approximate file or folder query" }),
			limit: Type.Optional(Type.Number({ description: "Maximum number of candidates to return (default: 8)" })),
		}),
		async execute(_toolCallId, params) {
			const guarded = getAgentRuntime(resolveToolDetails(null, true), resolveToolDetails(null));
			if (guarded.kind !== "ready") return guarded.result;
			const resolution = await guarded.runtime.resolvePath(params.query, { allowDirectory: true, limit: params.limit ?? 8 });
			return resolution.match({
				err: (error) => textResult(buildReadFailureMessage("resolve", params.query, error), resolveToolDetails(resolution, false, error)),
				ok: (value) => textResult(formatResolvedPathResult(value, params.limit ?? 8), resolveToolDetails(resolution)),
			});
		},
	});

	pi.registerTool({
		name: "related_files",
		label: "Related Files",
		description: "Find files related to a given file, such as tests, styles, stories, or nearby siblings.",
		promptSnippet: "Find related files for an already known file path.",
		promptGuidelines: ["Use this tool after reading a file when you want tests, styles, stories, or sibling files."],
		parameters: Type.Object({
			path: Type.String({ description: "File path or fuzzy file query" }),
			limit: Type.Optional(Type.Number({ description: "Maximum related files to return (default: 8)" })),
		}),
		async execute(_toolCallId, params) {
			const guarded = getAgentRuntime(relatedFilesDetails({ disabled: true }), relatedFilesDetails());
			if (guarded.kind !== "ready") return guarded.result;
			const result = await guarded.runtime.relatedFiles(params.path, params.limit ?? 8);
			return result.match({
				err: (error) => textResult(buildRelatedFilesFailureMessage(params.path, error), relatedFilesDetails({ error })),
				ok: (value) => {
					const lines = value.items.length > 0 ? formatCandidateLines(value.items, params.limit ?? 8) : ["No related files found."];
					return textResult([`Base: ${value.base.relativePath}`, ...lines].join("\n"), relatedFilesDetails({
						base: value.base,
						items: value.items,
					}));
				},
			});
		},
	});

	pi.registerTool({
		name: "fff_grep",
		label: "FFF Grep",
		description: "Search file contents with fff using plain, regex, or fuzzy matching.",
		promptSnippet: "Run fff-backed content search with optional fuzzy matching and optional path scoping.",
		promptGuidelines: ["Use this tool when you need fuzzy content search or want explicit control over search mode."],
		parameters: Type.Object({
			pattern: Type.String({ description: "Search pattern" }),
			mode: Type.Optional(Type.String({ description: "Search mode: plain, regex, or fuzzy" })),
			path: Type.Optional(Type.String({ description: "Optional exact or fuzzy file/folder scope" })),
			glob: Type.Optional(Type.String({ description: "Optional glob filter such as *.ts" })),
			constraints: Type.Optional(Type.String({ description: "Optional native FFF constraints such as *.ts !tests/ src/" })),
			context: Type.Optional(Type.Number({ description: "Context lines before and after each match" })),
			limit: Type.Optional(Type.Number({ description: "Maximum number of matches to return (default: 100)" })),
			cursor: Type.Optional(Type.String({ description: "Cursor from a previous fff_grep result" })),
			outputMode: Type.Optional(Type.String({ description: "Output mode: content, files_with_matches, count, or usage" })),
		}),
		async execute(_toolCallId, params) {
			const guarded = getAgentRuntime(buildGrepDetails(undefined, "agentTools"), buildGrepDetails());
			if (guarded.kind !== "ready") return guarded.result;
			const result = await guarded.runtime.grepSearch({
				pattern: params.pattern,
				mode: normalizeMode(params.mode),
				pathQuery: params.path,
				glob: params.glob,
				constraints: params.constraints,
				context: params.context,
				limit: params.limit,
				cursor: params.cursor,
				includeCursorHint: true,
				outputMode: normalizeOutputMode(params.outputMode),
			});
			return result.match({
				err: (error) => textResult(buildGrepFailureMessage(error, params.path), buildGrepDetails(undefined, undefined, error)),
				ok: (value) => textResult(value.formatted, buildGrepDetails(value)),
			});
		},
	});

	pi.registerTool({
		name: "fff_multi_grep",
		label: "FFF Multi Grep",
		description: "Search file contents for any of multiple literal patterns using fff multi-grep.",
		promptSnippet: "Search for any of several literals at once using fff multi-grep.",
		promptGuidelines: ["Use this tool when you want to search for multiple aliases or renamed symbols in one pass."],
		parameters: Type.Object({
			patterns: Type.Array(Type.String({ description: "Literal pattern" }), { minItems: 1 }),
			path: Type.Optional(Type.String({ description: "Optional exact or fuzzy file/folder scope" })),
			glob: Type.Optional(Type.String({ description: "Optional glob filter such as *.ts" })),
			constraints: Type.Optional(Type.String({ description: "Optional native FFF constraints such as *.ts !tests/ src/" })),
			context: Type.Optional(Type.Number({ description: "Context lines before and after each match" })),
			limit: Type.Optional(Type.Number({ description: "Maximum number of matches to return (default: 100)" })),
			cursor: Type.Optional(Type.String({ description: "Cursor from a previous fff_multi_grep result" })),
			outputMode: Type.Optional(Type.String({ description: "Output mode: content, files_with_matches, count, or usage" })),
		}),
		async execute(_toolCallId, params) {
			const guarded = getAgentRuntime(buildGrepDetails(undefined, "agentTools"), buildGrepDetails());
			if (guarded.kind !== "ready") return guarded.result;
			const result = await guarded.runtime.multiGrepSearch({
				patterns: params.patterns,
				pathQuery: params.path,
				glob: params.glob,
				constraints: params.constraints,
				context: params.context,
				limit: params.limit,
				cursor: params.cursor,
				includeCursorHint: true,
				outputMode: normalizeOutputMode(params.outputMode),
			});
			return result.match({
				err: (error) => textResult(buildGrepFailureMessage(error, params.path), buildGrepDetails(undefined, undefined, error)),
				ok: (value) => textResult(value.formatted, buildGrepDetails(value)),
			});
		},
	});
}
