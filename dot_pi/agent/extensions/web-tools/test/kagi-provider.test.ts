import test from "node:test";
import assert from "node:assert/strict";
import { ok, type Result } from "../result.ts";
import { buildKagiSearchArgs, KagiSearchProvider } from "../providers/kagi.ts";
import type { CommandOutput, CommandRequest, CommandRunner, CommandRunnerError } from "../providers/command.ts";
import { SpawnCommandRunner } from "../providers/command.ts";
import { parseSearchQuery, type SearchQuery } from "../types.ts";

class FakeCommandRunner implements CommandRunner {
	readonly requests: CommandRequest[] = [];

	constructor(private readonly output: Result<CommandOutput, CommandRunnerError>) {}

	async run(request: CommandRequest): Promise<Result<CommandOutput, CommandRunnerError>> {
		this.requests.push(request);
		return this.output;
	}
}

test("buildKagiSearchArgs pins JSON output and passes the query after --", () => {
	assert.deepEqual(buildKagiSearchArgs({ query: mustQuery("--weird query"), maxResults: 5, recency: "any" }), [
		"search",
		"--format",
		"json",
		"--error-format",
		"json",
		"--no-color",
		"--limit",
		"5",
		"--",
		"--weird query",
	]);
});

test("buildKagiSearchArgs forwards a recency window as --time", () => {
	const args = buildKagiSearchArgs({ query: mustQuery("release news"), maxResults: 3, recency: "week" });

	assert.ok(args.includes("--time"));
	assert.equal(args[args.indexOf("--time") + 1], "week");
});

test("KagiSearchProvider normalizes CLI results and caps them at maxResults", async () => {
	const runner = new FakeCommandRunner(
		ok({
			exitCode: 0,
			stdout: JSON.stringify({
				data: [
					{ t: 0, url: "https://example.com/one", title: "One", snippet: "First" },
					{ t: 0, url: "https://example.com/two", title: "Two", snippet: "Second" },
				],
			}),
			stderr: "",
		}),
	);
	const provider = new KagiSearchProvider("kagi", runner);

	const result = await provider.search({ query: mustQuery("example"), maxResults: 1, recency: "any" });

	assert.equal(result._tag, "ok");
	assert.equal(result.value.length, 1);
	assert.equal(result.value[0]?.url, "https://example.com/one");
	assert.equal(runner.requests[0]?.command, "kagi");
});

test("KagiSearchProvider surfaces the CLI error message on non-zero exit", async () => {
	const provider = new KagiSearchProvider(
		"kagi",
		new FakeCommandRunner(ok({ exitCode: 1, stdout: "", stderr: '{"message":"auth error: session token expired"}' })),
	);

	const result = await provider.search({ query: mustQuery("example"), maxResults: 5, recency: "any" });

	assert.deepEqual(result, {
		_tag: "err",
		error: { _tag: "SearchProviderReturnedError", provider: "kagi", safeMessage: "auth error: session token expired" },
	});
});

test("KagiSearchProvider reports a missing CLI as unavailable", async () => {
	const provider = new KagiSearchProvider("pi-kagi-does-not-exist", new SpawnCommandRunner());

	const result = await provider.search({ query: mustQuery("example"), maxResults: 5, recency: "any" });

	assert.equal(result._tag, "err");
	assert.equal(result.error._tag, "SearchProviderUnavailable");
});

test("SpawnCommandRunner caps command output", async () => {
	const runner = new SpawnCommandRunner();

	const result = await runner.run({
		command: "node",
		args: ["-e", "process.stdout.write('x'.repeat(4096))"],
		maxOutputBytes: 16,
	});

	assert.deepEqual(result, { _tag: "err", error: { _tag: "CommandOutputTooLarge", maxBytes: 16 } });
});

function mustQuery(input: string): SearchQuery {
	const parsed = parseSearchQuery(input);
	if (parsed._tag === "err") {
		throw new Error("Invalid test query");
	}
	return parsed.value;
}
