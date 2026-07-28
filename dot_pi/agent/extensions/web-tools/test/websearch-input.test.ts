import test from "node:test";
import assert from "node:assert/strict";
import { parseWebSearchToolParams } from "../websearch-input.ts";
import type { WebToolsSettings } from "../types.ts";

const testSearchSettings: WebToolsSettings["search"] = {
	enabled: true,
	provider: "kagi",
	timeoutSeconds: 60,
	defaultMaxResults: 8,
	defaultRecency: "any",
};

test("parseWebSearchToolParams trims query and applies defaults", () => {
	const result = parseWebSearchToolParams({ query: "  example docs  " }, testSearchSettings);

	assert.equal(result._tag, "ok");
	assert.equal(result.value.query, "example docs");
	assert.equal(result.value.maxResults, 8);
	assert.equal(result.value.recency, "any");
	assert.equal(result.value.timeoutSeconds, 60);
});

test("parseWebSearchToolParams accepts recency and clamps maxResults", () => {
	const low = parseWebSearchToolParams({ query: "example", maxResults: 0, recency: "week" }, testSearchSettings);
	const high = parseWebSearchToolParams({ query: "example", maxResults: 999 }, testSearchSettings);
	const clampedDefault = parseWebSearchToolParams(
		{ query: "example" },
		{ ...testSearchSettings, defaultMaxResults: 999 },
	);

	assert.equal(low._tag, "ok");
	assert.equal(low.value.recency, "week");
	assert.equal(low.value.maxResults, 1);
	assert.equal(high._tag, "ok");
	assert.equal(high.value.maxResults, 20);
	assert.equal(clampedDefault._tag, "ok");
	assert.equal(clampedDefault.value.maxResults, 20);
});

test("parseWebSearchToolParams rejects invalid boundary input", () => {
	assert.deepEqual(parseWebSearchToolParams({ query: "   " }, testSearchSettings), {
		_tag: "err",
		error: { _tag: "EmptySearchQuery" },
	});
	assert.deepEqual(parseWebSearchToolParams({ query: "example", recency: "decade" }, testSearchSettings), {
		_tag: "err",
		error: { _tag: "InvalidToolField", field: "recency", message: "Expected one of: any, day, week, month, year" },
	});
	assert.deepEqual(parseWebSearchToolParams({ query: "example", maxResults: "8" }, testSearchSettings), {
		_tag: "err",
		error: { _tag: "InvalidToolField", field: "maxResults", message: "Expected a finite number" },
	});
	assert.deepEqual(parseWebSearchToolParams({ query: "example", depth: "auto" }, testSearchSettings), {
		_tag: "err",
		error: { _tag: "UnknownToolField", field: "depth" },
	});
});
