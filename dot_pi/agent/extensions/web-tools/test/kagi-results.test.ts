import test from "node:test";
import assert from "node:assert/strict";
import { parseKagiErrorMessage, parseKagiSearchOutput } from "../providers/kagi-results.ts";

test("parseKagiSearchOutput normalizes web results and drops related searches", () => {
	const stdout = JSON.stringify({
		data: [
			{
				t: 0,
				url: "https://example.com/docs",
				title: "Example Docs",
				snippet: "Jun 8, 2022   Example    docs page.   Summarize",
				published: "2022-06-08T00:00:00Z",
			},
			{ t: 1, list: ["example docs tutorial"] },
			{ t: 0, url: "not-a-url", title: "Broken" },
		],
	});

	const parsed = parseKagiSearchOutput(stdout);

	assert.equal(parsed._tag, "ok");
	assert.deepEqual(parsed.value.results, [
		{
			title: "Example Docs",
			url: "https://example.com/docs",
			snippet: "Jun 8, 2022 Example docs page.",
			publishedAt: "2022-06-08T00:00:00Z",
		},
	]);
	assert.equal(parsed.value.explicitNoResults, false);
});

test("parseKagiSearchOutput reports an explicit empty result list", () => {
	const parsed = parseKagiSearchOutput('{"data": []}');

	assert.equal(parsed._tag, "ok");
	assert.equal(parsed.value.results.length, 0);
	assert.equal(parsed.value.explicitNoResults, true);
});

test("parseKagiSearchOutput rejects malformed CLI output", () => {
	assert.deepEqual(parseKagiSearchOutput("not json"), { _tag: "err", error: { _tag: "InvalidJson" } });
	assert.deepEqual(parseKagiSearchOutput("   "), {
		_tag: "err",
		error: { _tag: "InvalidPayload", reason: "Empty CLI output" },
	});
	assert.deepEqual(parseKagiSearchOutput('{"results": []}'), {
		_tag: "err",
		error: { _tag: "InvalidPayload", reason: "Missing result array" },
	});
});

test("parseKagiErrorMessage extracts the CLI JSON error message", () => {
	const stderr = '{"code":"configuration_error","message":"configuration error: missing session token"}';

	assert.equal(parseKagiErrorMessage(stderr), "configuration error: missing session token");
	assert.equal(parseKagiErrorMessage("plain failure text"), "plain failure text");
	assert.equal(parseKagiErrorMessage("   "), undefined);
});
