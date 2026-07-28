import test from "node:test";
import assert from "node:assert/strict";
import { ok, type Result } from "../result.ts";
import type { CommandOutput, CommandRequest, CommandRunner, CommandRunnerError } from "../providers/command.ts";
import {
	buildKagiSummarizeArgs,
	KagiSummarizeProvider,
	parseKagiSummarizeOutput,
} from "../providers/kagi-summarize.ts";
import { parsePublicHttpUrl, type PublicHttpUrl } from "../types.ts";

class FakeCommandRunner implements CommandRunner {
	readonly requests: CommandRequest[] = [];

	constructor(private readonly output: Result<CommandOutput, CommandRunnerError>) {}

	async run(request: CommandRequest): Promise<Result<CommandOutput, CommandRunnerError>> {
		this.requests.push(request);
		return this.output;
	}
}

test("buildKagiSummarizeArgs uses the subscriber summarizer with the requested type", () => {
	assert.deepEqual(buildKagiSummarizeArgs({ url: mustUrl("https://example.com/post"), summaryType: "keypoints" }), [
		"summarize",
		"--subscriber",
		"--error-format",
		"json",
		"--summary-type",
		"keypoints",
		"--url",
		"https://example.com/post",
	]);
});

test("parseKagiSummarizeOutput prefers markdown and falls back to HTML output", () => {
	const url = mustUrl("https://example.com/post");

	assert.deepEqual(parseKagiSummarizeOutput('{"data":{"markdown":"  # Summary  "}}', url), {
		_tag: "ok",
		value: "# Summary",
	});
	assert.deepEqual(parseKagiSummarizeOutput('{"data":{"output":"<p>Plain <strong>summary</strong></p>"}}', url), {
		_tag: "ok",
		value: "Plain **summary**",
	});
});

test("parseKagiSummarizeOutput rejects malformed or empty payloads", () => {
	const url = mustUrl("https://example.com/post");

	assert.deepEqual(parseKagiSummarizeOutput("nope", url), {
		_tag: "err",
		error: { _tag: "SummarizerProtocolInvalid", reason: "Invalid JSON CLI output" },
	});
	assert.deepEqual(parseKagiSummarizeOutput('{"meta":{}}', url), {
		_tag: "err",
		error: { _tag: "SummarizerProtocolInvalid", reason: "Missing summary payload" },
	});
	assert.deepEqual(parseKagiSummarizeOutput('{"data":{"markdown":"   "}}', url), {
		_tag: "err",
		error: { _tag: "SummarizerProtocolInvalid", reason: "Empty summary" },
	});
});

test("KagiSummarizeProvider returns summary markdown for a URL", async () => {
	const runner = new FakeCommandRunner(ok({ exitCode: 0, stdout: '{"data":{"markdown":"Key idea."}}', stderr: "" }));
	const provider = new KagiSummarizeProvider("kagi", runner);

	const result = await provider.summarize({ url: mustUrl("https://example.com/post"), summaryType: "summary" });

	assert.deepEqual(result, {
		_tag: "ok",
		value: { url: "https://example.com/post", summaryType: "summary", markdown: "Key idea." },
	});
	assert.equal(runner.requests[0]?.command, "kagi");
});

test("KagiSummarizeProvider surfaces the CLI error message on non-zero exit", async () => {
	const provider = new KagiSummarizeProvider(
		"kagi",
		new FakeCommandRunner(ok({ exitCode: 1, stdout: "", stderr: '{"message":"network error: summarizer timed out"}' })),
	);

	const result = await provider.summarize({ url: mustUrl("https://example.com/post"), summaryType: "eli5" });

	assert.deepEqual(result, {
		_tag: "err",
		error: { _tag: "SummarizerReturnedError", safeMessage: "network error: summarizer timed out" },
	});
});

function mustUrl(input: string): PublicHttpUrl {
	const parsed = parsePublicHttpUrl(input);
	if (parsed._tag === "err") {
		throw new Error("Invalid test URL");
	}
	return parsed.value;
}
