import { homedir } from "node:os";
import { htmlToMarkdown } from "../html.ts";
import { err, ok, type Result } from "../result.ts";
import type { PublicHttpUrl, SummaryType } from "../types.ts";
import type { CommandRunner, CommandRunnerError } from "./command.ts";
import { parseKagiErrorMessage } from "./kagi-results.ts";

export const MAX_SUMMARY_OUTPUT_BYTES = 1 * 1024 * 1024;

export interface SummarizeRequest {
	readonly url: PublicHttpUrl;
	readonly summaryType: SummaryType;
}

export type SummarizeError =
	| { readonly _tag: "SummarizerUnavailable"; readonly cause: unknown }
	| { readonly _tag: "SummarizerCommandFailed"; readonly exitCode: number | null }
	| { readonly _tag: "SummarizerResponseTooLarge"; readonly maxBytes: number }
	| { readonly _tag: "SummarizerProtocolInvalid"; readonly reason: string }
	| { readonly _tag: "SummarizerReturnedError"; readonly safeMessage: string }
	| { readonly _tag: "SummarizerCancelled"; readonly cause?: unknown };

export interface SummarizeResult {
	readonly url: PublicHttpUrl;
	readonly summaryType: SummaryType;
	readonly markdown: string;
}

export interface SummarizeUrl {
	summarize(
		input: SummarizeRequest,
		options?: { readonly signal?: AbortSignal },
	): Promise<Result<SummarizeResult, SummarizeError>>;
}

export class KagiSummarizeProvider implements SummarizeUrl {
	constructor(
		private readonly command: string,
		private readonly runner: CommandRunner,
	) {}

	/** Summarize one URL with the Kagi subscriber summarizer through the local CLI. */
	async summarize(
		input: SummarizeRequest,
		options: { readonly signal?: AbortSignal } = {},
	): Promise<Result<SummarizeResult, SummarizeError>> {
		const output = await this.runner.run(
			{
				command: this.command,
				args: buildKagiSummarizeArgs(input),
				// kagi-cli resolves ~/.kagi.toml relative to the home directory.
				cwd: homedir(),
				maxOutputBytes: MAX_SUMMARY_OUTPUT_BYTES,
			},
			{ signal: options.signal },
		);

		if (output._tag === "err") {
			return err(mapCommandRunnerError(output.error));
		}

		if (output.value.exitCode !== 0) {
			const safeMessage = parseKagiErrorMessage(output.value.stderr);
			if (safeMessage) {
				return err({ _tag: "SummarizerReturnedError", safeMessage });
			}
			return err({ _tag: "SummarizerCommandFailed", exitCode: output.value.exitCode });
		}

		const markdown = parseKagiSummarizeOutput(output.value.stdout, input.url);
		if (markdown._tag === "err") {
			return markdown;
		}

		return ok({ url: input.url, summaryType: input.summaryType, markdown: markdown.value });
	}
}

/** Build the argument list for the Kagi subscriber summarizer. */
export function buildKagiSummarizeArgs(input: SummarizeRequest): readonly string[] {
	return [
		"summarize",
		"--subscriber",
		"--error-format",
		"json",
		"--summary-type",
		input.summaryType,
		"--url",
		input.url,
	];
}

/** Extract summary markdown from `kagi summarize` JSON output. */
export function parseKagiSummarizeOutput(
	stdout: string,
	url: PublicHttpUrl,
): Result<string, Extract<SummarizeError, { _tag: "SummarizerProtocolInvalid" }>> {
	const trimmed = stdout.trim();
	if (!trimmed) {
		return err({ _tag: "SummarizerProtocolInvalid", reason: "Empty CLI output" });
	}

	let payload: unknown;
	try {
		payload = JSON.parse(trimmed);
	} catch {
		return err({ _tag: "SummarizerProtocolInvalid", reason: "Invalid JSON CLI output" });
	}

	const data = isPlainObject(payload) ? payload["data"] : undefined;
	if (!isPlainObject(data)) {
		return err({ _tag: "SummarizerProtocolInvalid", reason: "Missing summary payload" });
	}

	const markdown = data["markdown"];
	if (typeof markdown === "string" && markdown.trim()) {
		return ok(markdown.trim());
	}

	// The subscriber summarizer only returns HTML in `output` for some engines.
	const output = data["output"];
	if (typeof output === "string" && output.trim()) {
		return ok(htmlToMarkdown(output, url).trim());
	}

	return err({ _tag: "SummarizerProtocolInvalid", reason: "Empty summary" });
}

function mapCommandRunnerError(error: CommandRunnerError): SummarizeError {
	switch (error._tag) {
		case "CommandSpawnFailed":
			return { _tag: "SummarizerUnavailable", cause: error.cause };
		case "CommandOutputTooLarge":
			return { _tag: "SummarizerResponseTooLarge", maxBytes: error.maxBytes };
		case "CommandCancelled":
			return { _tag: "SummarizerCancelled", cause: error.cause };
	}
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
