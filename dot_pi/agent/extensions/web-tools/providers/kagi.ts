import { homedir } from "node:os";
import { err, ok, type Result } from "../result.ts";
import type { NormalizedSearchResult, SearchProvider, SearchProviderError, SearchProviderRequest } from "./types.ts";
import type { CommandRunner, CommandRunnerError } from "./command.ts";
import { parseKagiErrorMessage, parseKagiSearchOutput, type KagiResultsParseError } from "./kagi-results.ts";

export const MAX_SEARCH_OUTPUT_BYTES = 1 * 1024 * 1024;

export class KagiSearchProvider implements SearchProvider {
	readonly name = "kagi" as const;

	constructor(
		private readonly command: string,
		private readonly runner: CommandRunner,
	) {}

	/** Search through the local Kagi CLI and return normalized public-web results. */
	async search(
		input: SearchProviderRequest,
		options: { readonly signal?: AbortSignal } = {},
	): Promise<Result<readonly NormalizedSearchResult[], SearchProviderError>> {
		const output = await this.runner.run(
			{
				command: this.command,
				args: buildKagiSearchArgs(input),
				// kagi-cli resolves ~/.kagi.toml relative to the home directory.
				cwd: homedir(),
				maxOutputBytes: MAX_SEARCH_OUTPUT_BYTES,
			},
			{ signal: options.signal },
		);

		if (output._tag === "err") {
			return err(mapCommandRunnerError(output.error));
		}

		if (output.value.exitCode !== 0) {
			const safeMessage = parseKagiErrorMessage(output.value.stderr);
			if (safeMessage) {
				return err({ _tag: "SearchProviderReturnedError", provider: this.name, safeMessage });
			}
			return err({ _tag: "SearchProviderCommandFailed", provider: this.name, exitCode: output.value.exitCode });
		}

		const parsed = parseKagiSearchOutput(output.value.stdout);
		if (parsed._tag === "err") {
			return err({ _tag: "SearchProviderProtocolInvalid", provider: this.name, reason: renderParseReason(parsed.error) });
		}

		if (parsed.value.results.length === 0 && !parsed.value.explicitNoResults) {
			return err({ _tag: "SearchProviderNoRecognizedResults", provider: this.name });
		}

		return ok(parsed.value.results.slice(0, input.maxResults));
	}
}

/** Build the argument list for `kagi search`, keeping output JSON-only. */
export function buildKagiSearchArgs(input: SearchProviderRequest): readonly string[] {
	const args = [
		"search",
		"--format",
		"json",
		"--error-format",
		"json",
		"--no-color",
		"--limit",
		String(input.maxResults),
	];
	if (input.recency !== "any") {
		args.push("--time", input.recency);
	}
	args.push("--", input.query);
	return args;
}

function mapCommandRunnerError(error: CommandRunnerError): SearchProviderError {
	switch (error._tag) {
		case "CommandSpawnFailed":
			return { _tag: "SearchProviderUnavailable", provider: "kagi", cause: error.cause };
		case "CommandOutputTooLarge":
			return { _tag: "SearchProviderResponseTooLarge", provider: "kagi", maxBytes: error.maxBytes };
		case "CommandCancelled":
			return { _tag: "SearchProviderCancelled", provider: "kagi", cause: error.cause };
	}
}

function renderParseReason(error: KagiResultsParseError): string {
	switch (error._tag) {
		case "InvalidJson":
			return "Invalid JSON CLI output";
		case "InvalidPayload":
			return error.reason;
	}
}
