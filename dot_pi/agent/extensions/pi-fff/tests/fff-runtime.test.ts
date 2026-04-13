import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { FileFinder, GrepCursor, GrepMatch, Result, SearchResult, GrepResult } from "@ff-labs/fff-node";
import { FffRuntime } from "../src/fff.ts";

function ok<T>(value: T): Result<T> {
	return { ok: true, value };
}

function makeMatch(relativePath: string, lineNumber: number, text: string): GrepMatch {
	const matchStart = Math.max(0, text.indexOf("needle"));
	return {
		path: `/repo/${relativePath}`,
		relativePath,
		fileName: relativePath.split("/").pop() ?? relativePath,
		gitStatus: "clean",
		size: 64,
		modified: 0,
		isBinary: false,
		totalFrecencyScore: 0,
		accessFrecencyScore: 0,
		modificationFrecencyScore: 0,
		lineNumber,
		col: matchStart,
		byteOffset: 0,
		lineContent: text,
		matchRanges: matchStart >= 0 ? [[matchStart, matchStart + 6]] : [],
		contextBefore: [],
		contextAfter: [],
	};
}

function createMockFinder(overrides: Partial<FileFinder>): FileFinder {
	return {
		destroy() {},
		fileSearch() {
			throw new Error("fileSearch not implemented");
		},
		grep() {
			throw new Error("grep not implemented");
		},
		multiGrep() {
			throw new Error("multiGrep not implemented");
		},
		scanFiles() {
			return ok(undefined);
		},
		isScanning() {
			return false;
		},
		getScanProgress() {
			return ok({ scannedFilesCount: 0, isScanning: false });
		},
		waitForScan: async () => ok(true),
		reindex() {
			return ok(undefined);
		},
		refreshGitStatus() {
			return ok(0);
		},
		trackQuery() {
			return ok(true);
		},
		getHistoricalQuery() {
			return ok(null);
		},
		healthCheck() {
			return ok({
				version: "test",
				git: { available: true, repositoryFound: false, libgit2Version: "test" },
				filePicker: { initialized: true, indexedFiles: 0 },
				frecency: { initialized: false },
				queryTracker: { initialized: false },
			});
		},
		get isDestroyed() {
			return false;
		},
		...overrides,
	} as unknown as FileFinder;
}

test("findFiles retries 3+ word empty queries with first two words and preserves that across cursor pages", async () => {
	const calls: Array<{ query: string; pageIndex?: number; pageSize?: number }> = [];
	const finder = createMockFinder({
		fileSearch(query, options): Result<SearchResult> {
			calls.push({ query, pageIndex: options?.pageIndex, pageSize: options?.pageSize });
			const pageIndex = options?.pageIndex ?? 0;
			if (query === "alpha beta gamma") {
				return ok({ items: [], scores: [], totalMatched: 0, totalFiles: 10 });
			}
			if (query === "alpha beta") {
				const items = pageIndex === 0
					? [
						{ path: "/repo/src/a.ts", relativePath: "src/a.ts", fileName: "a.ts", size: 1, modified: 0, accessFrecencyScore: 0, modificationFrecencyScore: 0, totalFrecencyScore: 0, gitStatus: "clean" },
						{ path: "/repo/src/b.ts", relativePath: "src/b.ts", fileName: "b.ts", size: 1, modified: 0, accessFrecencyScore: 0, modificationFrecencyScore: 0, totalFrecencyScore: 0, gitStatus: "clean" },
					]
					: [
						{ path: "/repo/src/c.ts", relativePath: "src/c.ts", fileName: "c.ts", size: 1, modified: 0, accessFrecencyScore: 0, modificationFrecencyScore: 0, totalFrecencyScore: 0, gitStatus: "clean" },
					];
				return ok({
					items,
					scores: items.map((_, index) => ({ total: 100 - index, baseScore: 100, filenameBonus: 0, specialFilenameBonus: 0, frecencyBoost: 0, distancePenalty: 0, currentFilePenalty: 0, comboMatchBoost: 0, exactMatch: index === 0 && pageIndex === 0, matchType: index === 0 && pageIndex === 0 ? "exact" : "fuzzy" })),
					totalMatched: 3,
					totalFiles: 10,
				});
			}
			throw new Error(`unexpected query: ${query}`);
		},
	});

	const runtime = new FffRuntime(process.cwd(), { finder });
	const first = await runtime.findFiles({ query: "alpha beta gamma", limit: 2 });
	assert.equal(first.isOk(), true);
	if (first.isErr()) assert.fail(first.error.message);
	assert.equal(first.value.items.length, 2);
	assert.ok(first.value.nextCursor);
	assert.deepEqual(calls.map((call) => `${call.query}@${call.pageIndex ?? 0}`), ["alpha beta gamma@0", "alpha beta@0"]);

	const second = await runtime.findFiles({ query: "alpha beta gamma", limit: 2, cursor: first.value.nextCursor });
	assert.equal(second.isOk(), true);
	if (second.isErr()) assert.fail(second.error.message);
	assert.equal(second.value.items.length, 1);
	assert.equal(second.value.nextCursor, undefined);
	assert.deepEqual(calls.map((call) => `${call.query}@${call.pageIndex ?? 0}`), ["alpha beta gamma@0", "alpha beta@0", "alpha beta@1"]);
});

test("findFiles returns paginated cursor and continues on next page", async () => {
	const calls: Array<{ query: string; pageIndex?: number; pageSize?: number }> = [];
	const finder = createMockFinder({
		fileSearch(query, options): Result<SearchResult> {
			calls.push({ query, pageIndex: options?.pageIndex, pageSize: options?.pageSize });
			const pageIndex = options?.pageIndex ?? 0;
			const items = pageIndex === 0
				? [
					{ path: "/repo/src/a.ts", relativePath: "src/a.ts", fileName: "a.ts", size: 1, modified: 0, accessFrecencyScore: 0, modificationFrecencyScore: 0, totalFrecencyScore: 0, gitStatus: "clean" },
					{ path: "/repo/src/b.ts", relativePath: "src/b.ts", fileName: "b.ts", size: 1, modified: 0, accessFrecencyScore: 0, modificationFrecencyScore: 0, totalFrecencyScore: 0, gitStatus: "clean" },
				]
				: [
					{ path: "/repo/src/c.ts", relativePath: "src/c.ts", fileName: "c.ts", size: 1, modified: 0, accessFrecencyScore: 0, modificationFrecencyScore: 0, totalFrecencyScore: 0, gitStatus: "clean" },
				];
			return ok({
				items,
				scores: items.map((_, index) => ({ total: 100 - index, baseScore: 100, filenameBonus: 0, specialFilenameBonus: 0, frecencyBoost: 0, distancePenalty: 0, currentFilePenalty: 0, comboMatchBoost: 0, exactMatch: index === 0 && pageIndex === 0, matchType: index === 0 && pageIndex === 0 ? "exact" : "fuzzy" })),
				totalMatched: 3,
				totalFiles: 10,
			});
		},
	});

	const runtime = new FffRuntime(process.cwd(), { finder });
	const first = await runtime.findFiles({ query: "src", limit: 2 });
	assert.equal(first.isOk(), true);
	if (first.isErr()) assert.fail(first.error.message);
	assert.equal(first.value.items.length, 2);
	assert.ok(first.value.nextCursor);
	assert.match(first.value.formatted, /cursor:/);

	const second = await runtime.findFiles({ query: "src", limit: 2, cursor: first.value.nextCursor });
	assert.equal(second.isOk(), true);
	if (second.isErr()) assert.fail(second.error.message);
	assert.equal(second.value.items.length, 1);
	assert.equal(second.value.nextCursor, undefined);
	assert.equal(calls.length, 2);
	assert.deepEqual(calls.map((call) => call.pageIndex), [0, 1]);
});

test("resolvePath prefers project-root exact paths while still allowing explicit cwd-relative paths", async () => {
	const root = await mkdtemp(join(tmpdir(), "pi-fff-root-"));
	const repo = join(root, "repo");
	const nested = join(repo, "packages", "app");
	await mkdir(join(repo, ".git"), { recursive: true });
	await mkdir(join(repo, "src"), { recursive: true });
	await mkdir(join(nested, "src"), { recursive: true });
	await writeFile(join(repo, "src", "root.ts"), "export const root = true;\n", "utf8");
	await writeFile(join(nested, "src", "root.ts"), "export const local = true;\n", "utf8");
	await writeFile(join(nested, "local.ts"), "export const nested = true;\n", "utf8");

	const runtime = new FffRuntime(nested, { finder: createMockFinder({}), projectRoot: repo });

	const rootRelative = await runtime.resolvePath("src/root.ts");
	assert.equal(rootRelative.isOk(), true);
	if (rootRelative.isErr()) assert.fail(rootRelative.error.message);
	assert.equal(rootRelative.value.absolutePath, join(repo, "src", "root.ts"));
	assert.equal(rootRelative.value.relativePath, "src/root.ts");

	const explicitCwd = await runtime.resolvePath("./src/root.ts");
	assert.equal(explicitCwd.isOk(), true);
	if (explicitCwd.isErr()) assert.fail(explicitCwd.error.message);
	assert.equal(explicitCwd.value.absolutePath, join(nested, "src", "root.ts"));
	assert.equal(explicitCwd.value.relativePath, "packages/app/src/root.ts");

	const cwdFallback = await runtime.resolvePath("local.ts");
	assert.equal(cwdFallback.isOk(), true);
	if (cwdFallback.isErr()) assert.fail(cwdFallback.error.message);
	assert.equal(cwdFallback.value.absolutePath, join(nested, "local.ts"));
	assert.equal(cwdFallback.value.relativePath, "packages/app/local.ts");
});

test("resolvePath uses MCP-style best-match heuristic", async () => {
	const finder = createMockFinder({
		fileSearch(query): Result<SearchResult> {
			const items = [
				{ path: "/repo/src/a.ts", relativePath: "src/a.ts", fileName: "a.ts", size: 1, modified: 0, accessFrecencyScore: 0, modificationFrecencyScore: 0, totalFrecencyScore: 0, gitStatus: "clean" },
				{ path: "/repo/src/b.ts", relativePath: "src/b.ts", fileName: "b.ts", size: 1, modified: 0, accessFrecencyScore: 0, modificationFrecencyScore: 0, totalFrecencyScore: 0, gitStatus: "clean" },
			];
			const scores = query === "clear"
				? [
					{ total: 100, baseScore: 100, filenameBonus: 0, specialFilenameBonus: 0, frecencyBoost: 0, distancePenalty: 0, currentFilePenalty: 0, comboMatchBoost: 0, exactMatch: false, matchType: "fuzzy" },
					{ total: 40, baseScore: 40, filenameBonus: 0, specialFilenameBonus: 0, frecencyBoost: 0, distancePenalty: 0, currentFilePenalty: 0, comboMatchBoost: 0, exactMatch: false, matchType: "fuzzy" },
				]
				: [
					{ total: 100, baseScore: 100, filenameBonus: 0, specialFilenameBonus: 0, frecencyBoost: 0, distancePenalty: 0, currentFilePenalty: 0, comboMatchBoost: 0, exactMatch: false, matchType: "fuzzy" },
					{ total: 60, baseScore: 60, filenameBonus: 0, specialFilenameBonus: 0, frecencyBoost: 0, distancePenalty: 0, currentFilePenalty: 0, comboMatchBoost: 0, exactMatch: false, matchType: "fuzzy" },
				];
			return ok({ items, scores, totalMatched: items.length, totalFiles: items.length });
		},
	});

	const runtime = new FffRuntime(process.cwd(), { finder });
	const clear = await runtime.resolvePath("clear");
	assert.equal(clear.isOk(), true);
	if (clear.isErr()) assert.fail(clear.error.message);
	assert.equal(clear.value.relativePath, "src/a.ts");

	const close = await runtime.resolvePath("close");
	assert.equal(close.isErr(), true);
	if (close.isOk()) assert.fail("expected ambiguous result");
	assert.equal(close.error._tag, "AmbiguousPathError");
	assert.equal(close.error.candidates.length, 2);
});

test("grepSearch reuses stored cursor items before touching finder again", async () => {
	let grepCalls = 0;
	const finder = createMockFinder({
		grep(): Result<GrepResult> {
			grepCalls += 1;
			return ok({
				items: [
					makeMatch("src/a.ts", 1, "needle one"),
					makeMatch("src/b.ts", 2, "needle two"),
					makeMatch("src/c.ts", 3, "needle three"),
				],
				totalMatched: 3,
				totalFilesSearched: 1,
				totalFiles: 3,
				filteredFileCount: 3,
				nextCursor: null,
			});
		},
	});

	const runtime = new FffRuntime(process.cwd(), { finder });
	const first = await runtime.grepSearch({ pattern: "needle", limit: 2, includeCursorHint: true });
	assert.equal(first.isOk(), true);
	if (first.isErr()) assert.fail(first.error.message);
	assert.equal(first.value.items.length, 2);
	assert.ok(first.value.nextCursor);
	assert.equal(grepCalls, 1);

	const second = await runtime.grepSearch({ pattern: "needle", limit: 2, cursor: first.value.nextCursor, includeCursorHint: true });
	assert.equal(second.isOk(), true);
	if (second.isErr()) assert.fail(second.error.message);
	assert.equal(second.value.items.length, 1);
	assert.equal(second.value.items[0]?.relativePath, "src/c.ts");
	assert.equal(grepCalls, 1);
});

test("grepSearch auto-broadens empty multi-word queries", async () => {
	const calls: string[] = [];
	const finder = createMockFinder({
		grep(query): Result<GrepResult> {
			calls.push(query);
			if (query === "alpha beta") {
				return ok({
					items: [],
					totalMatched: 0,
					totalFilesSearched: 1,
					totalFiles: 2,
					filteredFileCount: 2,
					nextCursor: null,
				});
			}
			if (query === "beta") {
				return ok({
					items: [makeMatch("src/example.ts", 4, "const beta = true;")],
					totalMatched: 1,
					totalFilesSearched: 1,
					totalFiles: 2,
					filteredFileCount: 2,
					nextCursor: null,
				});
			}
			throw new Error(`unexpected query: ${query}`);
		},
	});

	const runtime = new FffRuntime(process.cwd(), { finder });
	const result = await runtime.grepSearch({ pattern: "alpha beta", limit: 5 });
	assert.equal(result.isOk(), true);
	if (result.isErr()) assert.fail(result.error.message);
	assert.deepEqual(calls, ["alpha beta", "beta"]);
	assert.match(result.value.formatted, /Auto-broadened to "beta"/);
	assert.match(result.value.formatted, /src\/example.ts:4: const beta = true;/);
});

test("grepSearch falls back to fuzzy search when exact search finds nothing", async () => {
	const calls: Array<{ query: string; mode: string | undefined }> = [];
	const finder = createMockFinder({
		grep(query, options): Result<GrepResult> {
			calls.push({ query, mode: options?.mode });
			if (options?.mode === "fuzzy") {
				return ok({
					items: [makeMatch("src/example.ts", 8, "const needle = true;")],
					totalMatched: 1,
					totalFilesSearched: 1,
					totalFiles: 2,
					filteredFileCount: 2,
					nextCursor: null,
				});
			}
			return ok({
				items: [],
				totalMatched: 0,
				totalFilesSearched: 1,
				totalFiles: 2,
				filteredFileCount: 2,
				nextCursor: null,
			});
		},
	});

	const runtime = new FffRuntime(process.cwd(), { finder });
	const result = await runtime.grepSearch({ pattern: "neddle", limit: 5 });
	assert.equal(result.isOk(), true);
	if (result.isErr()) assert.fail(result.error.message);
	assert.deepEqual(calls, [
		{ query: "neddle", mode: "plain" },
		{ query: "neddle", mode: "fuzzy" },
	]);
	assert.match(result.value.formatted, /0 exact matches\. 1 approximate:/);
	assert.match(result.value.formatted, /src\/example.ts/);
});

test("grepSearch suggests a relevant file path when content search is empty", async () => {
	const finder = createMockFinder({
		grep(): Result<GrepResult> {
			return ok({
				items: [],
				totalMatched: 0,
				totalFilesSearched: 1,
				totalFiles: 2,
				filteredFileCount: 2,
				nextCursor: null,
			});
		},
		multiGrep(): Result<GrepResult> {
			return ok({
				items: [],
				totalMatched: 0,
				totalFilesSearched: 1,
				totalFiles: 2,
				filteredFileCount: 2,
				nextCursor: null,
			});
		},
		fileSearch(query): Result<SearchResult> {
			assert.equal(query, "src/components/button.ts");
			const items = [
				{ path: "/repo/src/components/button.ts", relativePath: "src/components/button.ts", fileName: "button.ts", size: 1, modified: 0, accessFrecencyScore: 0, modificationFrecencyScore: 0, totalFrecencyScore: 200, gitStatus: "modified" },
			];
			return ok({
				items,
				scores: [{ total: 500, baseScore: 500, filenameBonus: 0, specialFilenameBonus: 0, frecencyBoost: 20, distancePenalty: 0, currentFilePenalty: 0, comboMatchBoost: 0, exactMatch: true, matchType: "exact" }],
				totalMatched: 1,
				totalFiles: 10,
			});
		},
	});

	const runtime = new FffRuntime(process.cwd(), { finder });
	const result = await runtime.grepSearch({ pattern: "src/components/button.ts", limit: 5 });
	assert.equal(result.isOk(), true);
	if (result.isErr()) assert.fail(result.error.message);
	assert.match(result.value.formatted, /0 content matches\. But there is a relevant file path: src\/components\/button.ts/);
});

test("multiGrepSearch falls back to single-pattern grep when multi-grep is empty", async () => {
	const multiCalls: string[][] = [];
	const grepCalls: string[] = [];
	const finder = createMockFinder({
		multiGrep(options): Result<GrepResult> {
			multiCalls.push(options.patterns);
			return ok({
				items: [],
				totalMatched: 0,
				totalFilesSearched: 1,
				totalFiles: 3,
				filteredFileCount: 3,
				nextCursor: null,
			});
		},
		grep(query): Result<GrepResult> {
			grepCalls.push(query);
			if (query === "FirstVariant") {
				return ok({
					items: [],
					totalMatched: 0,
					totalFilesSearched: 1,
					totalFiles: 3,
					filteredFileCount: 3,
					nextCursor: null,
				});
			}
			if (query === "second_variant") {
				return ok({
					items: [makeMatch("src/example.ts", 7, "const second_variant = true;")],
					totalMatched: 1,
					totalFilesSearched: 1,
					totalFiles: 3,
					filteredFileCount: 3,
					nextCursor: null,
				});
			}
			throw new Error(`unexpected query: ${query}`);
		},
	});

	const runtime = new FffRuntime(process.cwd(), { finder });
	const result = await runtime.multiGrepSearch({ patterns: ["FirstVariant", "second_variant"], limit: 5 });
	assert.equal(result.isOk(), true);
	if (result.isErr()) assert.fail(result.error.message);
	assert.deepEqual(multiCalls, [["FirstVariant", "second_variant"]]);
	assert.deepEqual(grepCalls, ["FirstVariant", "second_variant"]);
	assert.match(result.value.formatted, /0 multi-pattern matches\. Plain grep fallback for "second_variant":/);
	assert.match(result.value.formatted, /src\/example.ts:7: const second_variant = true;/);
});

test("grepSearch uses multi-grep engine for slash/brace literal patterns", async () => {
	let grepCalls = 0;
	let multiCalls = 0;
	const pattern = "/repos/{owner}/{repo}/pulls/{pull_number}/files";
	const finder = createMockFinder({
		grep(): Result<GrepResult> {
			grepCalls += 1;
			return ok({
				items: [],
				totalMatched: 0,
				totalFilesSearched: 1,
				totalFiles: 1,
				filteredFileCount: 1,
				nextCursor: null,
			});
		},
		multiGrep(options): Result<GrepResult> {
			multiCalls += 1;
			assert.deepEqual(options.patterns, [pattern]);
			return ok({
				items: [makeMatch("spec.yaml", 3, `  ${pattern}:`)],
				totalMatched: 1,
				totalFilesSearched: 1,
				totalFiles: 1,
				filteredFileCount: 1,
				nextCursor: null,
			});
		},
	});

	const runtime = new FffRuntime(process.cwd(), { finder });
	const result = await runtime.grepSearch({ pattern, mode: "plain", limit: 5 });
	assert.equal(result.isOk(), true);
	if (result.isErr()) assert.fail(result.error.message);
	assert.equal(multiCalls, 1);
	assert.equal(grepCalls, 0);
	assert.equal(result.value.items.length, 1);
	assert.equal(result.value.items[0]?.relativePath, "spec.yaml");
});

test("grepSearch keeps pattern query plain and applies scope/glob as post-filters", async () => {
	const root = await mkdtemp(join(tmpdir(), "pi-fff-"));
	await mkdir(join(root, "src"), { recursive: true });
	await writeFile(join(root, "src", "example.ts"), "export const needle = true;\n", "utf8");

	const calls: Array<{ query: string; cursor: GrepCursor | null | undefined }> = [];
	const finder = createMockFinder({
		grep(query, options): Result<GrepResult> {
			calls.push({ query, cursor: options?.cursor });
			return ok({
				items: [
					makeMatch("src/example.ts", 1, "export const needle = true;"),
					makeMatch("src/example.js", 2, "const needle = true;"),
					makeMatch("other/ignore.ts", 3, "export const needle = true;"),
				],
				totalMatched: 3,
				totalFilesSearched: 3,
				totalFiles: 3,
				filteredFileCount: 3,
				nextCursor: null,
			});
		},
	});

	const runtime = new FffRuntime(root, { finder });
	const result = await runtime.grepSearch({ pattern: "needle", pathQuery: "src", glob: "**/*.ts", limit: 5 });
	assert.equal(result.isOk(), true);
	if (result.isErr()) assert.fail(result.error.message);
	assert.equal(calls.length, 1);
	assert.equal(calls[0]?.query, "needle");
	assert.equal(result.value.constraintQuery, undefined);
	assert.equal(result.value.scope?.relativePath, "src");
	assert.equal(result.value.items.length, 1);
	assert.equal(result.value.items[0]?.relativePath, "src/example.ts");
});
