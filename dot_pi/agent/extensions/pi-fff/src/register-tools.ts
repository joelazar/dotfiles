import { homedir } from "node:os";
import { resolve } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createGrepTool, createReadTool } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { FinderOperationError, RuntimeInitializationError } from "./errors.ts";
import {
	buildFindFilesDetails,
	buildGrepDetails,
	buildGrepFailureMessage,
	buildReadFailureMessage,
	FFF_RUNTIME_NOT_READY_TEXT,
	grepNeedsBuiltinFallback,
	inferFffGrepMode,
	locationToReadParams,
	normalizeMode,
	normalizeOutputMode,
	type FeatureKey,
} from "./extension-common.ts";
import { FffRuntime } from "./fff.ts";

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

function expandTilde(value: string): string {
	if (value === "~") return homedir();
	if (value.startsWith("~/") || value.startsWith("~\\")) return homedir() + value.slice(1);
	return value;
}

function isOutsideProject(path: string | undefined, projectRoot: string, cwd: string): boolean {
	if (!path) return false;
	const expanded = expandTilde(path.trim());
	const resolved = resolve(cwd, expanded);
	const normalizedRoot = projectRoot.endsWith("/") ? projectRoot : `${projectRoot}/`;
	return !resolved.startsWith(normalizedRoot) && resolved !== projectRoot;
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

	const grepSchema = Type.Object({
		pattern: Type.String({ description: "Search pattern" }),
		mode: Type.Optional(Type.String({ description: "Search mode: plain, regex, or fuzzy" })),
		path: Type.Optional(Type.String({ description: "Optional exact or fuzzy file/folder scope" })),
		glob: Type.Optional(Type.String({ description: "Optional glob filter such as *.ts" })),
		constraints: Type.Optional(Type.String({ description: "Optional native FFF constraints such as *.ts !tests/ src/" })),
		ignoreCase: Type.Optional(Type.Boolean({ description: "Case-insensitive search (default: smart case)" })),
		literal: Type.Optional(Type.Boolean({ description: "Treat pattern as literal string instead of regex" })),
		context: Type.Optional(Type.Number({ description: "Context lines before and after each match" })),
		limit: Type.Optional(Type.Number({ description: "Maximum number of matches to return (default: 100)" })),
		cursor: Type.Optional(Type.String({ description: "Cursor from a previous grep result" })),
		outputMode: Type.Optional(Type.String({ description: "Output mode: content, files_with_matches, count, or usage" })),
	});

	pi.registerTool({
		name: "grep",
		label: "grep",
		description: `${grepTemplate.description} Uses fff for content search and can resolve approximate file or folder scopes.`,
		promptSnippet: "Search file contents (FFF-backed) with optional path/glob scope.",
		promptGuidelines: [
			"Prefer simple literal patterns over complex regex when possible.",
			"Use path/glob/constraints to narrow scope before trying another grep.",
			"Use outputMode=files_with_matches when content output is too noisy.",
			"After one or two good greps, read the best matching file.",
		],
		parameters: grepSchema,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const original = createGrepTool(ctx.cwd);
			const runtime = deps.getRuntime();
			const builtinParams = {
				pattern: params.pattern,
				path: params.path,
				glob: params.glob,
				ignoreCase: params.ignoreCase,
				literal: params.literal,
				context: params.context,
				limit: params.limit,
			};
			const explicitMode = normalizeMode(params.mode);
			const fallbackLiteral = params.literal ?? (params.mode ? explicitMode !== "regex" : undefined);
			if (
				!runtime
				|| !deps.isFeatureEnabled("builtInToolEnhancements")
				|| grepNeedsBuiltinFallback({ pattern: params.pattern, ignoreCase: params.ignoreCase, literal: fallbackLiteral })
				|| isOutsideProject(params.path, runtime.getProjectRoot(), ctx.cwd)
			) {
				return original.execute(toolCallId, builtinParams, signal, onUpdate);
			}

			const pattern = params.ignoreCase === true ? params.pattern.toLowerCase() : params.pattern;
			const result = await runtime.grepSearch({
				pattern,
				mode: params.mode ? explicitMode : inferFffGrepMode(params.literal),
				pathQuery: params.path,
				glob: params.glob,
				constraints: params.constraints,
				context: params.context,
				limit: params.limit,
				cursor: params.cursor,
				includeCursorHint: false,
				outputMode: normalizeOutputMode(params.outputMode),
			});
			return result.match({
				err: async (error) => {
					if (RuntimeInitializationError.is(error) || FinderOperationError.is(error)) {
						return original.execute(toolCallId, builtinParams, signal, onUpdate);
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
			limit: Type.Optional(Type.Number({ description: "Maximum number of matches to return (default: 60)" })),
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
				limit: params.limit ?? 60,
				cursor: params.cursor,
				includeCursorHint: false,
				outputMode: normalizeOutputMode(params.outputMode) ?? "files_with_matches",
			});
			return result.match({
				err: (error) => textResult(buildGrepFailureMessage(error, params.path), buildGrepDetails(undefined, undefined, error)),
				ok: (value) => textResult(value.formatted, buildGrepDetails(value)),
			});
		},
	});
}
