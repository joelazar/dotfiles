import assert from "node:assert/strict";
import test from "node:test";
import { AmbiguousPathError, GrepCursorMismatchError } from "../src/errors.ts";
import { formatGrepError, formatPathResolutionError } from "../src/error-format.ts";

test("formatPathResolutionError renders ambiguous candidate list", () => {
	const error = new AmbiguousPathError({
		query: "editor",
		candidates: [
			{
				item: {
					path: "/repo/src/editor.ts",
					relativePath: "src/editor.ts",
					fileName: "editor.ts",
					size: 1,
					modified: 0,
					accessFrecencyScore: 0,
					modificationFrecencyScore: 0,
					totalFrecencyScore: 0,
					gitStatus: "clean",
				},
				score: { total: 100, baseScore: 100, filenameBonus: 0, specialFilenameBonus: 0, frecencyBoost: 0, distancePenalty: 0, currentFilePenalty: 0, comboMatchBoost: 0, exactMatch: false, matchType: "fuzzy" },
			},
			{
				item: {
					path: "/repo/src/editor-utils.ts",
					relativePath: "src/editor-utils.ts",
					fileName: "editor-utils.ts",
					size: 1,
					modified: 0,
					accessFrecencyScore: 0,
					modificationFrecencyScore: 0,
					totalFrecencyScore: 0,
					gitStatus: "clean",
				},
				score: { total: 80, baseScore: 80, filenameBonus: 0, specialFilenameBonus: 0, frecencyBoost: 0, distancePenalty: 0, currentFilePenalty: 0, comboMatchBoost: 0, exactMatch: false, matchType: "fuzzy" },
			},
		],
	});

	const message = formatPathResolutionError("read", "editor", error);
	assert.match(message, /Could not resolve "editor" uniquely for read\./);
	assert.match(message, /1\. src\/editor\.ts \(fuzzy\)/);
	assert.match(message, /2\. src\/editor-utils\.ts \(fuzzy\)/);
});

test("formatGrepError returns cursor mismatch message", () => {
	const error = new GrepCursorMismatchError({ cursor: "grep:123" });
	assert.equal(formatGrepError(error, "src"), "This grep cursor belongs to a different query. Re-run without cursor.");
});
