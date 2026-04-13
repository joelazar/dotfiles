import { FileFinder } from "@ff-labs/fff-node";
import { Result } from "better-result";
import { getAgentDir } from "@mariozechner/pi-coding-agent";
import { mkdir, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import {
	AmbiguousPathError,
	EmptyFileQueryError,
	EmptyPathQueryError,
	FinderOperationError,
	GrepCursorMismatchError,
	InvalidFindFilesCursorError,
	InvalidGrepCursorError,
	MissingPathError,
	RuntimeInitializationError,
} from "./errors.ts";
import { formatPathResolutionError } from "./error-format.ts";
import { buildGrepText, cropMatchLine, formatFindFilesText } from "./fff-format.ts";
import { getProjectDatabasePaths, resolveProjectRoot } from "./runtime-paths.ts";
import {
	AUTO_EXPAND_AFTER_CONTEXT,
	DEFAULT_FILE_CANDIDATE_LIMIT,
	DEFAULT_FIND_FILES_LIMIT,
	DEFAULT_GREP_LIMIT,
	FIND_FILES_CURSOR_PREFIX,
	GREP_CURSOR_PREFIX,
	MAX_GREP_CURSOR_STATES,
	MAX_MATCHES_PER_FILE,
	type EngineResult,
	type FileCursorPayload,
	type FileItem,
	type FindFilesRequest,
	type FindFilesResult,
	type FffFileCandidate,
	type GrepCursor,
	type GrepMatch,
	type GrepOutputMode,
	type GrepResult,
	type GrepSearchRequest,
	type GrepSearchResult,
	type GrepSearchResponse,
	type HealthCheck,
	type MultiGrepRequest,
	type PathResolution,
	type RelatedFilesResponse,
	type RelatedFilesResult,
	type ResolvedPath,
	type RuntimeMetadata,
	type RuntimeOptions,
	type Score,
	type SingleGrepRequest,
	type StoredGrepContinuation,
} from "./fff-types.ts";
import { errResult, propagateError, toVoidResult, type AppResult } from "./result-utils.ts";

async function getPathType(path: string): Promise<"file" | "directory" | null> {
	try {
		const info = await stat(path);
		if (info.isFile()) return "file";
		if (info.isDirectory()) return "directory";
		return null;
	} catch {
		return null;
	}
}

function normalizeSlashes(value: string): string {
	return value.replace(/\\/g, "/");
}

function stripQuotes(value: string): string {
	if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
		return value.slice(1, -1);
	}
	if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
		return value.slice(1, -1);
	}
	return value;
}

function normalizePathQuery(value: string): string {
	let normalized = value.trim();
	if (normalized.startsWith("@")) normalized = normalized.slice(1);
	return normalizeSlashes(stripQuotes(normalized.trim()));
}

function relativeFrom(basePath: string, targetPath: string): string {
	const rel = normalizeSlashes(relative(basePath, targetPath));
	return rel === "" ? "." : rel;
}

function normalizeCandidate(item: FileItem, score: Score | undefined): FffFileCandidate {
	return { item, score };
}

function scoreTotal(score: Score | undefined): number {
	return score?.total ?? Number.NEGATIVE_INFINITY;
}

function shouldAutoResolve(candidate: FffFileCandidate | undefined, nextCandidate: FffFileCandidate | undefined): boolean {
	if (!candidate) return false;
	if (candidate.score?.exactMatch || candidate.score?.matchType === "exact") return true;
	if (!nextCandidate) return true;
	return scoreTotal(candidate.score) > scoreTotal(nextCandidate.score) * 2;
}

function stripPathLocation(query: string): string {
	return query
		.replace(/:(\d+):(\d+)-(\d+):(\d+)$/, "")
		.replace(/:(\d+):(\d+)$/, "")
		.replace(/:(\d+)$/, "");
}

function shortenWaterfallQuery(query: string): string | null {
	const words = query.split(/\s+/).filter((word) => word.length > 0);
	if (words.length < 3) return null;
	return words.slice(0, 2).join(" ");
}

function broadenGrepPattern(pattern: string): string | null {
	const words = pattern.split(/\s+/).filter((word) => word.length > 0);
	if (words.length < 2) return null;
	return words.slice(1).join(" ");
}

function cleanupFuzzyQuery(value: string): string {
	let cleaned = "";
	for (const char of value) {
		if (char === ":" || char === "-" || char === "_") continue;
		cleaned += char.toLowerCase();
	}
	return cleaned;
}

function isStrongPathCandidate(candidate: FffFileCandidate | undefined, query: string): boolean {
	if (!candidate?.score) return false;
	if (candidate.score.exactMatch || candidate.score.matchType === "exact" || candidate.score.matchType === "prefix") return true;
	return candidate.score.baseScore > query.length * 10;
}

function globToRegExp(glob: string): RegExp | null {
	const normalized = normalizeSlashes(glob.trim());
	if (!normalized) return null;
	let pattern = "^";
	for (let i = 0; i < normalized.length; i += 1) {
		const char = normalized[i] ?? "";
		const next = normalized[i + 1] ?? "";
		if (char === "*" && next === "*") {
			pattern += ".*";
			i += 1;
			continue;
		}
		if (char === "*") {
			pattern += "[^/]*";
			continue;
		}
		if (char === "?") {
			pattern += "[^/]";
			continue;
		}
		pattern += /[\\^$+?.()|{}\[\]]/.test(char) ? `\\${char}` : char;
	}
	pattern += "$";
	try {
		return new RegExp(pattern);
	} catch {
		return null;
	}
}

function matchesScope(match: GrepMatch, scope: ResolvedPath | undefined): boolean {
	if (!scope) return true;
	const matchPath = normalizeSlashes(match.relativePath);
	const scopePath = normalizeSlashes(scope.relativePath).replace(/\/$/, "");
	if (scope.pathType === "file") return matchPath === scopePath;
	return matchPath === scopePath || matchPath.startsWith(`${scopePath}/`);
}

function matchesGlob(match: GrepMatch, globRegex: RegExp | null): boolean {
	if (!globRegex) return true;
	return globRegex.test(normalizeSlashes(match.relativePath));
}

function encodeJsonCursor(prefix: string, payload: unknown): string {
	return `${prefix}${Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")}`;
}

function decodeJsonCursor<T>(cursor: string | undefined, prefix: string): T | null {
	if (!cursor?.startsWith(prefix)) return null;
	try {
		const decoded = Buffer.from(cursor.slice(prefix.length), "base64url").toString("utf8");
		return JSON.parse(decoded) as T;
	} catch {
		return null;
	}
}

function trimCursorStore(map: Map<string, StoredGrepContinuation>) {
	while (map.size > MAX_GREP_CURSOR_STATES) {
		const firstKey = map.keys().next().value;
		if (!firstKey) break;
		map.delete(firstKey);
	}
}

function buildSingleGrepQuery(pattern: string, constraintQuery: string | undefined): string {
	return constraintQuery ? `${constraintQuery} ${pattern}` : pattern;
}

function shouldUseMultiForSinglePlainPattern(pattern: string): boolean {
	return /[/{}/]/.test(pattern);
}

function grepRequestKey(request: SingleGrepRequest | MultiGrepRequest, constraintQuery: string | undefined): string {
	return JSON.stringify({
		kind: request.kind,
		pattern: request.kind === "single" ? request.pattern : undefined,
		patterns: request.kind === "multi" ? request.patterns : undefined,
		mode: request.kind === "single" ? request.mode : undefined,
		constraintQuery: constraintQuery ?? null,
		context: request.context,
		includeCursorHint: request.includeCursorHint ?? false,
		outputMode: request.outputMode ?? "content",
	});
}

function finderFailure(operation: string, reason: string, cause?: unknown): FinderOperationError {
	return new FinderOperationError({ operation, reason, cause });
}

function safeFinderCall<T>(operation: string, run: () => EngineResult<T>): AppResult<T, FinderOperationError> {
	const attempted = Result.try({
		try: run,
		catch: (cause) => finderFailure(operation, cause instanceof Error ? cause.message : String(cause), cause),
	});
	if (attempted.isErr()) return errResult(attempted.error);
	return attempted.value.ok ? Result.ok(attempted.value.value) : errResult(finderFailure(operation, attempted.value.error));
}

export class FffRuntime {
	public readonly cwd: string;
	private readonly options: RuntimeOptions;
	private basePath: string;
	private finder: FileFinder | null = null;
	private initPromise: Promise<AppResult<FileFinder, RuntimeInitializationError>> | null = null;
	private loadError: RuntimeInitializationError | null = null;
	private grepCursorCounter = 0;
	private readonly grepContinuations = new Map<string, StoredGrepContinuation>();

	constructor(cwd: string, options: RuntimeOptions = {}) {
		this.cwd = cwd;
		this.options = options;
		this.basePath = options.projectRoot ?? cwd;
		if (options.finder) this.finder = options.finder;
	}

	async ensure(): Promise<AppResult<FileFinder, RuntimeInitializationError>> {
		if (this.finder) return Result.ok(this.finder);
		if (this.loadError) return errResult(this.loadError);
		if (!this.initPromise) this.initPromise = this.initialize();
		const initialized = await this.initPromise;
		if (initialized.isErr()) {
			this.loadError = initialized.error;
			return initialized;
		}
		this.loadError = null;
		this.finder = initialized.value;
		return initialized;
	}

	dispose(): void {
		void Result.try({
			try: () => {
				if (this.finder && this.finder !== this.options.finder) this.finder.destroy();
			},
			catch: (cause) => finderFailure("destroy", cause instanceof Error ? cause.message : String(cause), cause),
		});
		this.finder = this.options.finder ?? null;
		this.initPromise = null;
		this.grepContinuations.clear();
	}

	async getMetadata(): Promise<RuntimeMetadata> {
		const projectRoot = this.options.projectRoot ?? (this.basePath !== this.cwd ? this.basePath : await resolveProjectRoot(this.cwd));
		this.basePath = projectRoot;
		const root = resolve(getAgentDir(), "pi-fff");
		const paths = getProjectDatabasePaths(root, projectRoot);
		return {
			cwd: this.cwd,
			projectRoot,
			dbDir: paths.dbDir,
			frecencyDbPath: paths.frecencyDbPath,
			historyDbPath: paths.historyDbPath,
			definitionClassification: "heuristic",
		};
	}

	async warm(timeoutMs = 1000): Promise<AppResult<{ ready: boolean; indexedFiles?: number; error?: string }, RuntimeInitializationError | FinderOperationError>> {
		const finderResult = await this.ensure();
		if (finderResult.isErr()) return propagateError(finderResult);
		const waitedResult = await Result.tryPromise({
			try: () => finderResult.value.waitForScan(timeoutMs),
			catch: (cause) => finderFailure("waitForScan", cause instanceof Error ? cause.message : String(cause), cause),
		});
		if (waitedResult.isErr()) return propagateError(waitedResult);
		const health = finderResult.value.healthCheck();
		return Result.ok({
			ready: waitedResult.value.ok ? waitedResult.value.value : false,
			indexedFiles: health.ok ? health.value.filePicker.indexedFiles : undefined,
			error: waitedResult.value.ok ? undefined : waitedResult.value.error,
		});
	}

	async reindex(): Promise<AppResult<void, RuntimeInitializationError | FinderOperationError>> {
		const finderResult = await this.ensure();
		if (finderResult.isErr()) return propagateError(finderResult);
		return toVoidResult(safeFinderCall("scanFiles", () => finderResult.value.scanFiles()));
	}

	async getStatus(): Promise<AppResult<{ state: string; indexedFiles?: number; error?: string }, RuntimeInitializationError>> {
		const finderResult = await this.ensure();
		if (finderResult.isErr()) return propagateError(finderResult);
		const health = finderResult.value.healthCheck();
		const progress = finderResult.value.getScanProgress();
		return Result.ok({
			state: progress.ok && progress.value.isScanning ? "indexing" : "ready",
			indexedFiles: health.ok ? health.value.filePicker.indexedFiles : undefined,
			error: health.ok ? undefined : health.error,
		});
	}

	async healthCheck(): Promise<AppResult<HealthCheck, RuntimeInitializationError | FinderOperationError>> {
		const finderResult = await this.ensure();
		if (finderResult.isErr()) return propagateError(finderResult);
		const health = finderResult.value.healthCheck();
		return health.ok ? Result.ok(health.value) : errResult(finderFailure("healthCheck", health.error));
	}

	async trackQuery(query: string, selectedPath: string): Promise<AppResult<void, RuntimeInitializationError | FinderOperationError>> {
		const finderResult = await this.ensure();
		if (finderResult.isErr()) return propagateError(finderResult);
		return toVoidResult(safeFinderCall("trackQuery", () => finderResult.value.trackQuery(normalizePathQuery(query), normalizeSlashes(selectedPath))));
	}

	async searchFileCandidates(query: string, limit = DEFAULT_FILE_CANDIDATE_LIMIT): Promise<AppResult<FffFileCandidate[], RuntimeInitializationError | FinderOperationError>> {
		const finderResult = await this.ensure();
		if (finderResult.isErr()) return propagateError(finderResult);
		const normalizedQuery = normalizePathQuery(query);
		if (!normalizedQuery) return Result.ok([]);
		const search = safeFinderCall("fileSearch", () => finderResult.value.fileSearch(normalizedQuery, { pageSize: Math.max(limit, DEFAULT_FILE_CANDIDATE_LIMIT) }));
		if (search.isErr()) return propagateError(search);
		return Result.ok(search.value.items.slice(0, limit).map((item, index) => normalizeCandidate(item, search.value.scores[index])));
	}

	async findFiles(request: FindFilesRequest): Promise<FindFilesResult> {
		const finderResult = await this.ensure();
		if (finderResult.isErr()) return propagateError(finderResult);
		const normalizedQuery = normalizePathQuery(request.query);
		if (!normalizedQuery) {
			return errResult(new EmptyFileQueryError({ query: request.query }));
		}

		const pageSize = Math.max(1, request.limit ?? DEFAULT_FIND_FILES_LIMIT);
		let pageIndex = 0;
		let searchQuery = normalizedQuery;
		if (request.cursor) {
			const payload = decodeJsonCursor<FileCursorPayload>(request.cursor, FIND_FILES_CURSOR_PREFIX);
			if (!payload || payload.query !== normalizedQuery || payload.pageSize !== pageSize) {
				return errResult(new InvalidFindFilesCursorError({ query: normalizedQuery, cursor: request.cursor }));
			}
			pageIndex = payload.pageIndex;
			searchQuery = payload.searchQuery ?? payload.query;
		}

		let search = safeFinderCall("fileSearch", () => finderResult.value.fileSearch(searchQuery, { pageIndex, pageSize }));
		if (pageIndex === 0 && search.isOk() && search.value.items.length === 0) {
			const shorterQuery = shortenWaterfallQuery(normalizedQuery);
			if (shorterQuery) {
				searchQuery = shorterQuery;
				search = safeFinderCall("fileSearch", () => finderResult.value.fileSearch(searchQuery, { pageIndex, pageSize }));
			}
		}
		if (search.isErr()) return propagateError(search);

		const items = search.value.items.map((item, index) => normalizeCandidate(item, search.value.scores[index]));
		const nextOffset = (pageIndex + 1) * pageSize;
		const nextCursor = nextOffset < search.value.totalMatched
			? encodeJsonCursor(FIND_FILES_CURSOR_PREFIX, {
				query: normalizedQuery,
				searchQuery,
				pageIndex: pageIndex + 1,
				pageSize,
			} satisfies FileCursorPayload)
			: undefined;

		return Result.ok({
			items,
			formatted: formatFindFilesText(normalizedQuery, items, {
				totalMatched: search.value.totalMatched,
				totalFiles: search.value.totalFiles,
				nextCursor,
				pageIndex,
				pageSize,
			}),
			nextCursor,
			totalMatched: search.value.totalMatched,
			totalFiles: search.value.totalFiles,
		});
	}

	async resolvePath(query: string, options?: { limit?: number; allowDirectory?: boolean }): Promise<PathResolution> {
		const normalizedQuery = normalizePathQuery(query);
		if (!normalizedQuery) {
			return errResult(new EmptyPathQueryError({ query }));
		}

		const pathOnlyQuery = stripPathLocation(normalizedQuery);
		if (pathOnlyQuery === normalizedQuery) {
			const direct = await this.resolveExistingPath(pathOnlyQuery, options?.allowDirectory ?? true);
			if (direct) {
				return Result.ok({
					kind: "resolved",
					query,
					absolutePath: direct.absolutePath,
					relativePath: direct.relativePath,
					pathType: direct.pathType,
					candidates: [],
				});
			}
		}

		const finderResult = await this.ensure();
		if (finderResult.isErr()) return propagateError(finderResult);
		const limit = Math.max(1, options?.limit ?? DEFAULT_FILE_CANDIDATE_LIMIT);
		const search = safeFinderCall("fileSearch", () => finderResult.value.fileSearch(normalizedQuery, { pageSize: Math.max(limit, DEFAULT_FILE_CANDIDATE_LIMIT) }));
		if (search.isErr()) return propagateError(search);
		const candidates = search.value.items.slice(0, limit).map((item, index) => normalizeCandidate(item, search.value.scores[index]));
		const filtered = candidates.filter((candidate) => options?.allowDirectory !== false || !candidate.item.relativePath.endsWith("/"));

		const direct = await this.resolveExistingPath(pathOnlyQuery, options?.allowDirectory ?? true);
		if (direct) {
			return Result.ok({
				kind: "resolved",
				query,
				absolutePath: direct.absolutePath,
				relativePath: direct.relativePath,
				pathType: direct.pathType,
				location: search.value.location,
				candidates: filtered,
			});
		}

		const top = filtered[0];
		if (!top) {
			return errResult(new MissingPathError({ query: normalizedQuery, reason: `No files matched \"${normalizedQuery}\".` }));
		}
		if (!shouldAutoResolve(top, filtered[1])) {
			return errResult(new AmbiguousPathError({ query, candidates: filtered }));
		}

		const absolutePath = isAbsolute(top.item.path) ? top.item.path : resolve(this.basePath, top.item.relativePath);
		const pathType = (await getPathType(absolutePath)) ?? "file";
		return Result.ok({
			kind: "resolved",
			query,
			absolutePath,
			relativePath: normalizeSlashes(top.item.relativePath),
			pathType,
			location: search.value.location,
			candidates: filtered,
		});
	}

	async relatedFiles(query: string, limit = 8): Promise<RelatedFilesResult> {
		const baseResult = await this.resolvePath(query, { allowDirectory: false, limit: 8 });
		if (baseResult.isErr()) return propagateError(baseResult);
		const base = baseResult.value;
		const basename = normalizeSlashes(base.relativePath).split("/").pop() ?? base.relativePath;
		const stem = basename
			.replace(/\.(test|spec|stories)\./g, ".")
			.replace(/\.d\./g, ".")
			.replace(/\.module\./g, ".")
			.replace(/\.[^.]+$/, "");
		const candidatesResult = await this.searchFileCandidates(stem, Math.max(limit * 3, 20));
		if (candidatesResult.isErr()) return propagateError(candidatesResult);
		const filtered = candidatesResult.value
			.filter((candidate) => candidate.item.relativePath !== base.relativePath)
			.filter((candidate) => {
				const candidatePath = normalizeSlashes(candidate.item.relativePath);
				const candidateBase = candidatePath.split("/").pop() ?? candidatePath;
				return candidateBase.includes(stem) || candidatePath.includes(`${dirname(base.relativePath)}/${stem}`);
			})
			.slice(0, limit);
		return Result.ok({ base, items: filtered } satisfies RelatedFilesResponse);
	}

	async grepSearch(request: GrepSearchRequest): Promise<GrepSearchResult> {
		return this.runGrep({
			kind: "single",
			pattern: request.pattern,
			mode: request.mode ?? "plain",
			pathQuery: request.pathQuery,
			glob: request.glob,
			constraints: request.constraints,
			context: request.context ?? 0,
			limit: request.limit ?? DEFAULT_GREP_LIMIT,
			cursor: request.cursor,
			includeCursorHint: request.includeCursorHint,
			outputMode: request.outputMode,
		});
	}

	async multiGrepSearch(request: { patterns: string[]; pathQuery?: string; glob?: string; constraints?: string; context?: number; limit?: number; cursor?: string; includeCursorHint?: boolean; outputMode?: GrepOutputMode }): Promise<GrepSearchResult> {
		return this.runGrep({
			kind: "multi",
			patterns: request.patterns,
			pathQuery: request.pathQuery,
			glob: request.glob,
			constraints: request.constraints,
			context: request.context ?? 0,
			limit: request.limit ?? DEFAULT_GREP_LIMIT,
			cursor: request.cursor,
			includeCursorHint: request.includeCursorHint,
			outputMode: request.outputMode,
		});
	}

	private storeGrepContinuation(state: StoredGrepContinuation): string {
		const cursor = `${GREP_CURSOR_PREFIX}${++this.grepCursorCounter}`;
		this.grepContinuations.set(cursor, state);
		trimCursorStore(this.grepContinuations);
		return cursor;
	}

	private getGrepContinuation(cursor: string | undefined): StoredGrepContinuation | null {
		if (!cursor?.startsWith(GREP_CURSOR_PREFIX)) return null;
		return this.grepContinuations.get(cursor) ?? null;
	}

	private filterMatches(items: GrepMatch[], scope: ResolvedPath | undefined, globRegex: RegExp | null, limit: number): GrepMatch[] {
		const filtered: GrepMatch[] = [];
		for (const item of items) {
			if (!matchesScope(item, scope)) continue;
			if (!matchesGlob(item, globRegex)) continue;
			filtered.push(item);
			if (filtered.length >= limit) break;
		}
		return filtered;
	}

	private buildApproximateMatchText(items: GrepMatch[]): string {
		const lines = [`0 exact matches. ${items.length} approximate:`];
		let currentFile = "";
		for (const item of items.slice(0, 3)) {
			if (item.relativePath !== currentFile) {
				currentFile = item.relativePath;
				lines.push(currentFile);
			}
			lines.push(` ${item.lineNumber}: ${cropMatchLine(item.lineContent, item.matchRanges).text}`);
		}
		return lines.join("\n");
	}

	private runFinderGrep(finder: FileFinder, request: SingleGrepRequest | MultiGrepRequest, constraintQuery: string | undefined, engineCursor: GrepCursor | null): AppResult<GrepResult, FinderOperationError> {
		if (request.kind === "single") {
			if (request.mode === "plain" && shouldUseMultiForSinglePlainPattern(request.pattern)) {
				return safeFinderCall("multiGrep", () =>
					finder.multiGrep({
						patterns: [request.pattern],
						constraints: constraintQuery,
						cursor: engineCursor,
						beforeContext: request.context,
						afterContext: request.context > 0 ? request.context : AUTO_EXPAND_AFTER_CONTEXT,
						maxMatchesPerFile: MAX_MATCHES_PER_FILE,
					}),
				);
			}
			return safeFinderCall("grep", () =>
				finder.grep(buildSingleGrepQuery(request.pattern, constraintQuery), {
					mode: request.mode,
					cursor: engineCursor,
					beforeContext: request.context,
					afterContext: request.context > 0 ? request.context : AUTO_EXPAND_AFTER_CONTEXT,
					maxMatchesPerFile: MAX_MATCHES_PER_FILE,
				}),
			);
		}
		return safeFinderCall("multiGrep", () =>
			finder.multiGrep({
				patterns: request.patterns,
				constraints: constraintQuery,
				cursor: engineCursor,
				beforeContext: request.context,
				afterContext: request.context > 0 ? request.context : AUTO_EXPAND_AFTER_CONTEXT,
				maxMatchesPerFile: MAX_MATCHES_PER_FILE,
			}),
		);
	}

	private async buildNoMatchFallback(
		finder: FileFinder,
		request: SingleGrepRequest,
		constraintQuery: string | undefined,
		resolvedScope: ResolvedPath | undefined,
		postFilterScope: ResolvedPath | undefined,
		postFilterGlob: RegExp | null,
	): Promise<GrepSearchResponse | null> {
		const broadened = broadenGrepPattern(request.pattern);
		if (broadened) {
			const broadenedResult = this.runFinderGrep(finder, { ...request, pattern: broadened }, constraintQuery, null);
			if (broadenedResult.isErr()) return null;
			const broadenedItems = this.filterMatches(broadenedResult.value.items, postFilterScope, postFilterGlob, request.limit);
			if (broadenedItems.length > 0) {
				const built = buildGrepText(broadenedItems, {
					limit: request.limit,
					requestedContext: request.context,
					includeCursorHint: false,
					regexFallbackError: broadenedResult.value.regexFallbackError,
					outputMode: request.outputMode,
				});
				return {
					items: broadenedItems,
					formatted: `0 matches for "${request.pattern}". Auto-broadened to "${broadened}":\n${built.text}`,
					truncation: built.truncation,
					matchLimitReached: built.matchLimitReached,
					linesTruncated: built.linesTruncated,
					regexFallbackError: broadenedResult.value.regexFallbackError,
					scope: resolvedScope,
					constraintQuery,
					suggestedReadPath: built.suggestedReadPath,
				};
			}
		}

		if (request.mode !== "fuzzy") {
			const fuzzyPattern = cleanupFuzzyQuery(request.pattern);
			if (fuzzyPattern) {
				const fuzzyResult = this.runFinderGrep(finder, { ...request, pattern: fuzzyPattern, mode: "fuzzy" }, constraintQuery, null);
				if (fuzzyResult.isOk()) {
					const fuzzyItems = this.filterMatches(fuzzyResult.value.items, postFilterScope, postFilterGlob, request.limit);
					if (fuzzyItems.length > 0) {
						return {
							items: fuzzyItems,
							formatted: this.buildApproximateMatchText(fuzzyItems),
							linesTruncated: false,
							scope: resolvedScope,
							constraintQuery,
						};
					}
				}
			}
		}

		if (request.pattern.includes("/")) {
			const pathCandidates = await this.searchFileCandidates(request.pattern, 1);
			if (pathCandidates.isOk() && isStrongPathCandidate(pathCandidates.value[0], request.pattern)) {
				return {
					items: [],
					formatted: `0 content matches. But there is a relevant file path: ${pathCandidates.value[0]?.item.relativePath}`,
					linesTruncated: false,
					scope: resolvedScope,
					constraintQuery,
					suggestedReadPath: pathCandidates.value[0]?.item.relativePath,
				};
			}
		}

		return null;
	}

	private async buildMultiNoMatchFallback(
		finder: FileFinder,
		request: MultiGrepRequest,
		constraintQuery: string | undefined,
		resolvedScope: ResolvedPath | undefined,
		postFilterScope: ResolvedPath | undefined,
		postFilterGlob: RegExp | null,
	): Promise<GrepSearchResponse | null> {
		for (const pattern of request.patterns) {
			const fallbackResult = this.runFinderGrep(finder, {
				kind: "single",
				pattern,
				mode: "plain",
				pathQuery: request.pathQuery,
				glob: request.glob,
				constraints: request.constraints,
				context: request.context,
				limit: request.limit,
				cursor: undefined,
				includeCursorHint: false,
				outputMode: request.outputMode,
			}, constraintQuery, null);
			if (fallbackResult.isErr()) continue;
			const fallbackItems = this.filterMatches(fallbackResult.value.items, postFilterScope, postFilterGlob, request.limit);
			if (fallbackItems.length === 0) continue;
			const built = buildGrepText(fallbackItems, {
				limit: request.limit,
				requestedContext: request.context,
				includeCursorHint: false,
				regexFallbackError: fallbackResult.value.regexFallbackError,
				outputMode: request.outputMode,
			});
			return {
				items: fallbackItems,
				formatted: `0 multi-pattern matches. Plain grep fallback for "${pattern}":\n${built.text}`,
				truncation: built.truncation,
				matchLimitReached: built.matchLimitReached,
				linesTruncated: built.linesTruncated,
				regexFallbackError: fallbackResult.value.regexFallbackError,
				scope: resolvedScope,
				constraintQuery,
				suggestedReadPath: built.suggestedReadPath,
			};
		}
		return null;
	}

	private async runGrep(request: SingleGrepRequest | MultiGrepRequest): Promise<GrepSearchResult> {
		const finderResult = await this.ensure();
		if (finderResult.isErr()) return propagateError(finderResult);
		const finder = finderResult.value;

		const scopeResult = request.pathQuery ? await this.resolvePath(request.pathQuery, { allowDirectory: true, limit: DEFAULT_FILE_CANDIDATE_LIMIT }) : undefined;
		if (scopeResult?.isErr()) {
			if (
				AmbiguousPathError.is(scopeResult.error)
				|| EmptyPathQueryError.is(scopeResult.error)
				|| MissingPathError.is(scopeResult.error)
			) {
				return Result.ok({
					items: [],
					formatted: formatPathResolutionError("grep scope", request.pathQuery ?? "", scopeResult.error),
					linesTruncated: false,
				});
			}
			return propagateError(scopeResult);
		}

		const resolvedScope = scopeResult && scopeResult.isOk() ? scopeResult.value : undefined;
		const constraintQuery = request.constraints?.trim() ? request.constraints.trim() : undefined;
		const postFilterScope = resolvedScope;
		const postFilterGlob = request.glob ? globToRegExp(request.glob) : null;
		const requestKey = grepRequestKey(request, constraintQuery);

		const continuation = this.getGrepContinuation(request.cursor);
		if (request.cursor && !continuation && request.cursor.startsWith(GREP_CURSOR_PREFIX)) {
			return errResult(new InvalidGrepCursorError({ cursor: request.cursor }));
		}
		if (continuation && continuation.requestKey !== requestKey) {
			return errResult(new GrepCursorMismatchError({ cursor: request.cursor ?? "" }));
		}

		let engineCursor = continuation?.engineCursor ?? null;
		const remainingItems = continuation ? [...continuation.remainingItems] : [];
		const items: GrepMatch[] = [];
		let regexFallbackError = continuation?.regexFallbackError;

		const takeFromRemaining = () => {
			while (remainingItems.length > 0 && items.length < request.limit) {
				const item = remainingItems.shift();
				if (!item) continue;
				if (!matchesScope(item, postFilterScope)) continue;
				if (!matchesGlob(item, postFilterGlob)) continue;
				items.push(item);
			}
		};
		takeFromRemaining();

		while (items.length < request.limit) {
			if (items.length > 0 && engineCursor === null && remainingItems.length === 0) break;
			if (continuation && engineCursor === null && remainingItems.length === 0) break;

			const result = this.runFinderGrep(finder, request, constraintQuery, engineCursor);
			if (result.isErr()) return propagateError(result);

			regexFallbackError = result.value.regexFallbackError ?? regexFallbackError;
			engineCursor = result.value.nextCursor;
			remainingItems.push(...result.value.items);
			takeFromRemaining();
			if (!engineCursor && remainingItems.length === 0) break;
		}

		if (items.length === 0 && !request.cursor) {
			if (request.kind === "single") {
				const fallback = await this.buildNoMatchFallback(finder, request, constraintQuery, resolvedScope, postFilterScope, postFilterGlob);
				if (fallback) return Result.ok(fallback);
			} else {
				const fallback = await this.buildMultiNoMatchFallback(finder, request, constraintQuery, resolvedScope, postFilterScope, postFilterGlob);
				if (fallback) return Result.ok(fallback);
			}
		}

		const hasMore = remainingItems.length > 0 || engineCursor !== null;
		const nextCursor = hasMore
			? this.storeGrepContinuation({
				requestKey,
				remainingItems,
				engineCursor,
				regexFallbackError,
			})
			: undefined;

		const built = buildGrepText(items.slice(0, request.limit), {
			limit: request.limit,
			requestedContext: request.context,
			includeCursorHint: request.includeCursorHint ?? false,
			nextCursor,
			regexFallbackError,
			outputMode: request.outputMode,
		});
		return Result.ok({
			items: items.slice(0, request.limit),
			formatted: built.text,
			truncation: built.truncation,
			matchLimitReached: built.matchLimitReached,
			linesTruncated: built.linesTruncated,
			regexFallbackError,
			scope: resolvedScope,
			nextCursor,
			constraintQuery,
			suggestedReadPath: built.suggestedReadPath,
		} satisfies GrepSearchResponse);
	}

	private async resolveExistingPath(query: string, allowDirectory: boolean): Promise<Pick<ResolvedPath, "absolutePath" | "relativePath" | "pathType"> | null> {
		const candidates = isAbsolute(query)
			? [query]
			: query.startsWith("./") || query.startsWith("../")
				? [resolve(this.cwd, query)]
				: this.basePath === this.cwd
					? [resolve(this.cwd, query)]
					: [resolve(this.basePath, query), resolve(this.cwd, query)];
		for (const directPath of candidates) {
			const pathType = await getPathType(directPath);
			if (!pathType) continue;
			if (pathType === "directory" && !allowDirectory) continue;
			return {
				absolutePath: directPath,
				relativePath: relativeFrom(this.basePath, directPath),
				pathType,
			};
		}
		return null;
	}

	private async initialize(): Promise<AppResult<FileFinder, RuntimeInitializationError>> {
		const root = resolve(getAgentDir(), "pi-fff");
		const rootResult = await Result.tryPromise({
			try: () => mkdir(root, { recursive: true }),
			catch: (cause) => new RuntimeInitializationError({ cwd: this.cwd, step: "create runtime directory", cause }),
		});
		if (rootResult.isErr()) return propagateError(rootResult);

		const projectRoot = this.options.projectRoot ?? await resolveProjectRoot(this.cwd);
		this.basePath = projectRoot;
		const paths = getProjectDatabasePaths(root, projectRoot);
		const dbDir = paths.dbDir;
		const dbResult = await Result.tryPromise({
			try: () => mkdir(dbDir, { recursive: true }),
			catch: (cause) => new RuntimeInitializationError({ cwd: this.cwd, step: "create database directory", cause }),
		});
		if (dbResult.isErr()) return propagateError(dbResult);

		const created = Result.try({
			try: () =>
				FileFinder.create({
					basePath: projectRoot,
					aiMode: true,
					frecencyDbPath: paths.frecencyDbPath,
					historyDbPath: paths.historyDbPath,
				}),
			catch: (cause) => new RuntimeInitializationError({ cwd: this.cwd, step: "create file finder", cause }),
		});
		if (created.isErr()) return propagateError(created);
		if (!created.value.ok) {
			return errResult(new RuntimeInitializationError({ cwd: this.cwd, step: "create file finder", cause: created.value.error }));
		}

		const finder = created.value.value;
		void await Result.tryPromise({
			try: () => finder.waitForScan(500),
			catch: (cause) => finderFailure("waitForScan", cause instanceof Error ? cause.message : String(cause), cause),
		});
		return Result.ok(finder);
	}
}
