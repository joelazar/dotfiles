import { err, ok, type Result } from "./result.ts";
import {
	FETCH_TIMEOUT_SECONDS,
	SUMMARIZE_TIMEOUT_SECONDS,
	SUMMARY_TYPES,
	WEB_FETCH_FORMATS,
	clampInteger,
	type ToolInputParseError,
} from "./settings.ts";
import {
	parsePublicHttpUrl,
	type ParsePublicHttpUrlError,
	type PublicHttpUrl,
	type SummaryType,
	type WebFetchFormat,
	type WebToolsSettings,
} from "./types.ts";

export interface RawWebFetchToolParams {
	readonly url: string;
	readonly format?: WebFetchFormat;
	readonly summarize?: SummaryType;
	readonly timeout?: number;
}

export interface WebFetchToolInput {
	readonly url: PublicHttpUrl;
	readonly format: WebFetchFormat;
	/** When set, the page is summarized by Kagi instead of fetched and converted. */
	readonly summarize?: SummaryType;
	readonly timeoutSeconds: number;
}

/** Parse raw Pi webfetch params into service-facing input. */
export function parseWebFetchToolParams(
	raw: unknown,
	settings: WebToolsSettings["fetch"],
): Result<WebFetchToolInput, ToolInputParseError | ParsePublicHttpUrlError> {
	if (!isPlainObject(raw)) {
		return err({ _tag: "InvalidToolInput", message: "Expected an object" });
	}

	for (const key of Object.keys(raw)) {
		if (key !== "url" && key !== "format" && key !== "summarize" && key !== "timeout") {
			return err({ _tag: "UnknownToolField", field: key });
		}
	}

	const urlValue = raw["url"];
	if (typeof urlValue !== "string") {
		return err({ _tag: "InvalidToolField", field: "url", message: "Expected a string" });
	}

	const url = parsePublicHttpUrl(urlValue);
	if (url._tag === "err") {
		return url;
	}

	const formatValue = raw["format"];
	let format = settings.defaultFormat;
	if (formatValue !== undefined) {
		if (typeof formatValue !== "string" || !isWebFetchFormat(formatValue)) {
			return err({ _tag: "InvalidToolField", field: "format", message: "Expected one of: markdown, text, html" });
		}
		format = formatValue;
	}

	const summarizeValue = raw["summarize"];
	let summarize: SummaryType | undefined;
	if (summarizeValue !== undefined) {
		if (typeof summarizeValue !== "string" || !isSummaryType(summarizeValue)) {
			return err({
				_tag: "InvalidToolField",
				field: "summarize",
				message: `Expected one of: ${SUMMARY_TYPES.join(", ")}`,
			});
		}
		summarize = summarizeValue;
	}

	// Summaries wait on Kagi's summarizer, so they get their own, more generous budget.
	const timeoutBounds = summarize ? SUMMARIZE_TIMEOUT_SECONDS : FETCH_TIMEOUT_SECONDS;
	const configuredTimeout = summarize ? settings.summarizeTimeoutSeconds : settings.timeoutSeconds;
	const timeoutValue = raw["timeout"];
	let timeoutSeconds = clampInteger(configuredTimeout, {
		min: timeoutBounds.min,
		max: timeoutBounds.max,
		fallback: timeoutBounds.default,
	});
	if (timeoutValue !== undefined) {
		if (typeof timeoutValue !== "number" || !Number.isFinite(timeoutValue)) {
			return err({ _tag: "InvalidToolField", field: "timeout", message: "Expected a finite number" });
		}
		timeoutSeconds = clampInteger(timeoutValue, {
			min: timeoutBounds.min,
			max: timeoutBounds.max,
			fallback: timeoutBounds.default,
		});
	}

	return ok({ url: url.value, format, ...(summarize ? { summarize } : {}), timeoutSeconds });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWebFetchFormat(value: string): value is WebFetchFormat {
	const formats: readonly string[] = WEB_FETCH_FORMATS;
	return formats.includes(value);
}

function isSummaryType(value: string): value is SummaryType {
	const types: readonly string[] = SUMMARY_TYPES;
	return types.includes(value);
}
