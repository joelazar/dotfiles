import assert from "node:assert/strict";
import test from "node:test";
import type { GrepMatch } from "@ff-labs/fff-node";
import { buildGrepText, cropMatchLine, formatCandidateLines } from "../src/fff.ts";

function makeMatch(overrides: Partial<GrepMatch> = {}): GrepMatch {
	return {
		path: "/repo/src/example.ts",
		relativePath: "src/example.ts",
		fileName: "example.ts",
		gitStatus: "clean",
		size: 128,
		modified: 0,
		isBinary: false,
		totalFrecencyScore: 0,
		accessFrecencyScore: 0,
		modificationFrecencyScore: 0,
		lineNumber: 10,
		col: 0,
		byteOffset: 0,
		lineContent: "const value = exampleIdentifierThatIsVeryLongAndShouldBeCenteredAroundTheMatch();",
		matchRanges: [[14, 64]],
		contextBefore: [],
		contextAfter: [],
		...overrides,
	};
}

test("cropMatchLine centers output around the match", () => {
	const line = "prefix ".repeat(30) + "importantIdentifier" + " suffix".repeat(30);
	const start = line.indexOf("importantIdentifier");
	const result = cropMatchLine(line, [[start, start + "importantIdentifier".length]], 60);

	assert.equal(result.wasTruncated, true);
	assert.match(result.text, /importantIdentifier/);
	assert.match(result.text, /^…/);
	assert.match(result.text, /…$/);
});

test("formatCandidateLines adds frecency and git suffixes", () => {
	const lines = formatCandidateLines([
		{
			item: {
				path: "/repo/src/example.ts",
				relativePath: "src/example.ts",
				fileName: "example.ts",
				size: 64,
				modified: 0,
				accessFrecencyScore: 0,
				modificationFrecencyScore: 0,
				totalFrecencyScore: 120,
				gitStatus: "modified",
			},
			score: { total: 100, baseScore: 100, filenameBonus: 0, specialFilenameBonus: 0, frecencyBoost: 0, distancePenalty: 0, currentFilePenalty: 0, comboMatchBoost: 0, exactMatch: false, matchType: "fuzzy" },
		},
	]);

	assert.deepEqual(lines, ["1. src/example.ts (fuzzy) - hot git:modified"]);
});

test("buildGrepText adds read suggestion, definition expansion, and cursor hint", () => {
	const definition = makeMatch({
		lineContent: "export function performSearch() {",
		matchRanges: [[16, 29]],
		contextAfter: ["  return 42;", "}", "", "const ignored = true;"],
	});
	const usage = makeMatch({
		lineNumber: 40,
		lineContent: "const result = performSearch();",
		matchRanges: [[15, 28]],
		contextAfter: [],
	});

	const built = buildGrepText([definition, usage], {
		limit: 10,
		requestedContext: 0,
		includeCursorHint: true,
		nextCursor: "grep:2",
		outputMode: "content",
	});

	assert.match(built.text, /→ Read src\/example.ts \((only match|definition found)\)/);
	assert.match(built.text, /src\/example.ts:10: export function performSearch\(\) \{/);
	assert.match(built.text, /src\/example.ts\|11:   return 42;/);
	assert.match(built.text, /cursor: grep:2/);
	assert.equal(built.suggestedReadPath, "src/example.ts");
});

test("buildGrepText supports files_with_matches output mode", () => {
	const definition = makeMatch({
		lineContent: "export function performSearch() {",
		matchRanges: [[16, 29]],
		contextAfter: ["  return 42;", "}"],
	});
	const other = makeMatch({
		relativePath: "src/other.ts",
		path: "/repo/src/other.ts",
		fileName: "other.ts",
		lineNumber: 5,
		lineContent: "const needle = performSearch();",
		matchRanges: [[6, 12]],
	});

	const built = buildGrepText([definition, other], {
		limit: 10,
		requestedContext: 0,
		includeCursorHint: false,
		outputMode: "files_with_matches",
	});

	assert.match(built.text, /→ Read src\/example.ts/);
	assert.match(built.text, /src\/example.ts \[def\]/);
	assert.match(built.text, /  10: export function performSearch\(\) \{/);
	assert.match(built.text, /src\/other.ts/);
});

test("buildGrepText supports count output mode", () => {
	const first = makeMatch({ lineNumber: 1, lineContent: "needle one" });
	const second = makeMatch({ lineNumber: 2, lineContent: "needle two" });
	const third = makeMatch({
		relativePath: "src/other.ts",
		path: "/repo/src/other.ts",
		fileName: "other.ts",
		lineNumber: 3,
		lineContent: "needle three",
		matchRanges: [[0, 6]],
	});

	const built = buildGrepText([first, second, third], {
		limit: 10,
		requestedContext: 0,
		includeCursorHint: false,
		outputMode: "count",
	});

	assert.equal(built.text, "src/example.ts: 2\nsrc/other.ts: 1");
});

test("buildGrepText supports usage output mode", () => {
	const first = makeMatch({ lineNumber: 10, lineContent: "const one = needle();" });
	const second = makeMatch({
		relativePath: "src/other.ts",
		path: "/repo/src/other.ts",
		fileName: "other.ts",
		lineNumber: 3,
		lineContent: "const two = needle();",
		matchRanges: [[12, 18]],
	});

	const built = buildGrepText([first, second], {
		limit: 10,
		requestedContext: 0,
		includeCursorHint: false,
		outputMode: "usage",
	});

	assert.match(built.text, /src\/example.ts\n  10: const one = needle\(\);/);
	assert.match(built.text, /src\/other.ts\n  3: const two = needle\(\);/);
});
