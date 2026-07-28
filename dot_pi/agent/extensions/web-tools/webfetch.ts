import { formatSize } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import { FetchPage, type FetchPageError } from "./fetch-page.ts";
import { createOperationSignal, FetchPublicWebClient, isOperationTimeoutError } from "./network.ts";
import { SpawnCommandRunner } from "./providers/command.ts";
import { KagiSummarizeProvider, type SummarizeError, type SummarizeUrl } from "./providers/kagi-summarize.ts";
import { appendExpandHint, appendExpandedPreview, getTextContent } from "./render.ts";
import { getWebToolsSettings, SUMMARY_TYPES, WEB_FETCH_FORMATS, type ToolInputParseError } from "./settings.ts";
import {
	TempFileToolOutputStore,
	projectFetchPageResultToPiToolResult,
	projectSummarizeResultToPiToolResult,
	type PiToolResult,
	type ToolOutputStore,
	type ToolOutputStoreError,
	type WebFetchDetails,
} from "./tool-output.ts";
import {
	redactUrlCredentialsForDisplay,
	type ParsePublicHttpUrlError,
	type SummaryType,
	type WebFetchFormat,
	type WebToolsSettings,
} from "./types.ts";
import { parseWebFetchToolParams } from "./webfetch-input.ts";

export {
	OPENCODE_WEBFETCH_DEFAULT_USER_AGENT,
	OPENCODE_WEBFETCH_FALLBACK_USER_AGENT,
	createWebFetchHeaders,
	getFallbackUserAgent,
	shouldRetryWithFallbackUserAgent,
} from "./fetch-page.ts";

export interface WebFetchToolComposition {
	readonly settings: WebToolsSettings;
	readonly fetchPage: FetchPage;
	readonly summarizeUrl: SummarizeUrl;
	readonly outputStore: ToolOutputStore;
}

interface RenderTheme {
	fg(name: string, value: string): string;
	bold(value: string): string;
}

type WebFetchBoundaryError =
	| ToolInputParseError
	| ParsePublicHttpUrlError
	| FetchPageError
	| SummarizeError
	| ToolOutputStoreError;

export function createWebFetchTool(composition?: WebFetchToolComposition) {
	return {
		name: "webfetch",
		label: "Web Fetch",
		description:
			"Fetch a single URL and return readable markdown, text, raw HTML/source, or an inline raster image, or summarize it with Kagi.",
		promptSnippet: "Fetch one public URL as markdown, text, html, or an image, or summarize it with Kagi",
		promptGuidelines: [
			"Use webfetch when the user provides a URL or after websearch identifies a page to inspect.",
			"Prefer webfetch format=markdown unless the user explicitly wants plain text or raw source.",
			"Use summarize for long pages, paywalled or JS-heavy articles, and YouTube videos, where a plain fetch returns little usable text.",
		],
		parameters: Type.Object({
			url: Type.String({ description: "The http:// or https:// URL to fetch." }),
			format: Type.Optional(
				StringEnum([...WEB_FETCH_FORMATS], {
					description: "Return format. Defaults to the web-tools fetch default format setting.",
				}),
			),
			summarize: Type.Optional(
				StringEnum([...SUMMARY_TYPES], {
					description:
						"Summarize the URL with Kagi's summarizer instead of fetching it. Works on articles and YouTube videos. 'summary' is prose, 'keypoints' is a bullet list, 'eli5' is a simplified explanation.",
				}),
			),
			timeout: Type.Optional(
				Type.Number({
					description: "Optional timeout in seconds. Overrides the web-tools fetch timeout setting.",
				}),
			),
		}),

		async execute(
			_toolCallId: string,
			params: unknown,
			signal?: AbortSignal,
			onUpdate?: (update: PiToolResult<WebFetchDetails>) => void,
		) {
			const actualComposition = composition ?? createDefaultWebFetchComposition();
			const parsed = parseWebFetchToolParams(params, actualComposition.settings.fetch);
			if (parsed._tag === "err") {
				throw toWebFetchToolError(parsed.error);
			}

			const summaryType = parsed.value.summarize;
			const composed = createOperationSignal(parsed.value.timeoutSeconds * 1000, signal);
			onUpdate?.({
				content: [textContent(`${summaryType ? "Summarizing" : "Fetching"} ${parsed.value.url}...`)],
				details: {
					requestedUrl: parsed.value.url,
					finalUrl: parsed.value.url,
					format: parsed.value.format,
					status: 0,
					mime: "",
					contentType: "",
					bytes: 0,
					...(summaryType ? { summaryType } : {}),
				},
			});

			try {
				if (summaryType) {
					const summary = await actualComposition.summarizeUrl.summarize(
						{ url: parsed.value.url, summaryType },
						{ signal: composed.signal },
					);
					if (summary._tag === "err") {
						throw toWebFetchBoundaryError(summary.error, parsed.value.timeoutSeconds, signal, composed.signal);
					}

					const projectedSummary = await projectSummarizeResultToPiToolResult(
						summary.value,
						actualComposition.outputStore,
					);
					if (projectedSummary._tag === "err") {
						throw toWebFetchBoundaryError(projectedSummary.error, parsed.value.timeoutSeconds, signal, composed.signal);
					}

					return projectedSummary.value;
				}

				const result = await actualComposition.fetchPage.fetch(
					{ url: parsed.value.url, format: parsed.value.format },
					{ signal: composed.signal },
				);
				if (result._tag === "err") {
					throw toWebFetchBoundaryError(result.error, parsed.value.timeoutSeconds, signal, composed.signal);
				}

				const projected = await projectFetchPageResultToPiToolResult(result.value, actualComposition.outputStore);
				if (projected._tag === "err") {
					throw toWebFetchBoundaryError(projected.error, parsed.value.timeoutSeconds, signal, composed.signal);
				}

				return projected.value;
			} finally {
				composed.cleanup();
			}
		},

		renderCall(args: { url: string; format?: WebFetchFormat; summarize?: SummaryType }, theme: RenderTheme) {
			let text = theme.fg("toolTitle", theme.bold("webfetch "));
			text += theme.fg("accent", redactUrlCredentialsForDisplay(args.url));
			if (args.summarize) {
				text += theme.fg("muted", ` (kagi ${args.summarize})`);
			} else if (args.format && args.format !== "markdown") {
				text += theme.fg("muted", ` (${args.format})`);
			}
			return new Text(text, 0, 0);
		},

		renderResult(
			result: { content: Array<{ type: string; text?: string }>; details?: WebFetchDetails; isError?: boolean },
			options: { expanded: boolean; isPartial: boolean },
			theme: RenderTheme,
		) {
			if (options.isPartial) {
				return new Text(theme.fg("warning", result.details?.summaryType ? "Summarizing..." : "Fetching..."), 0, 0);
			}
			if (result.isError) {
				return new Text(theme.fg("error", `✗ ${getTextContent(result.content) || "Fetch failed"}`), 0, 0);
			}

			const details = result.details;
			let text = theme.fg("success", details?.summaryType ? `✓ Summarized (${details.summaryType})` : "✓ Fetched");
			if (details?.mime && !details.summaryType) {
				text += theme.fg("muted", ` (${details.mime})`);
			}
			if (details?.bytes) {
				text += theme.fg("dim", ` ${formatSize(details.bytes)}`);
			}
			if (details?.truncated) {
				text += theme.fg("warning", " [truncated]");
			}
			if (details?.image) {
				text += theme.fg("muted", " [image]");
			}
			text = appendExpandHint(text, options.expanded);

			if (options.expanded) {
				if (details?.image) {
					text += `\n${theme.fg("dim", `Image URL: ${details.finalUrl}`)}`;
				} else {
					text = appendExpandedPreview(text, getTextContent(result.content), theme, { maxLines: 12, maxColumns: 220 });
				}
				if (details?.fullOutputPath) {
					text += `\n${theme.fg("dim", `Full output: ${details.fullOutputPath}`)}`;
				}
			}

			return new Text(text, 0, 0);
		},
	};
}

export function toWebFetchToolError(error: WebFetchBoundaryError): Error {
	return new Error(renderSafeWebFetchError(error));
}

function createDefaultWebFetchComposition(): WebFetchToolComposition {
	const settings = getWebToolsSettings();
	return {
		settings,
		fetchPage: new FetchPage({ publicWeb: new FetchPublicWebClient(), settings: settings.fetch }),
		summarizeUrl: new KagiSummarizeProvider(settings.kagi.command, new SpawnCommandRunner()),
		outputStore: new TempFileToolOutputStore(),
	};
}

function toWebFetchBoundaryError(
	error: WebFetchBoundaryError,
	timeoutSeconds: number,
	outerSignal: AbortSignal | undefined,
	operationSignal: AbortSignal,
): Error {
	if (outerSignal?.aborted) {
		return new Error("Web fetch cancelled");
	}
	if (isOperationTimeoutError(operationSignal.reason)) {
		return new Error(`Web fetch timed out after ${timeoutSeconds}s`);
	}
	return toWebFetchToolError(error);
}

function renderSafeWebFetchError(error: WebFetchBoundaryError): string {
	switch (error._tag) {
		case "InvalidToolInput":
			return error.message;
		case "InvalidToolField":
			return `${error.field}: ${error.message}`;
		case "UnknownToolField":
			return `Unknown webfetch field: ${error.field}`;
		case "EmptyUrl":
			return "URL cannot be empty";
		case "UnsupportedUrlProtocol":
			return "URL must start with http:// or https://";
		case "InvalidUrl":
			return "Invalid URL";
		case "UrlCredentialsUnsupported":
			return "URL credentials are not supported";
		case "PublicWebRequestFailed":
			return "Request failed";
		case "PublicWebCancelled":
			return "Web fetch cancelled";
		case "PublicWebTimedOut":
			return `Web fetch timed out after ${error.timeoutSeconds}s`;
		case "PrivateHostBlocked":
			return "Blocked private or local host";
		case "PrivateIpBlocked":
			return "Blocked private or local IP address";
		case "RedirectLocationMissing":
			return "Redirect response was missing a Location header";
		case "RedirectLocationInvalid":
			return "Redirect response had an invalid Location header";
		case "RedirectLimitExceeded":
			return "Too many redirects while fetching URL";
		case "RedirectProtocolUnsupported":
			return "Redirected to unsupported protocol";
		case "HttpStatusRejected":
			return `Request failed (${error.status} ${error.statusText || ""})`.trim();
		case "ResponseTooLarge":
			return `Response too large (${Math.floor(error.maxBytes / (1024 * 1024))}MB limit)`;
		case "UnsupportedBinaryContent":
			return `Unsupported binary content${error.mime ? ` (${error.mime})` : ""}. Try a more text-oriented URL.`;
		case "HtmlConversionFailed":
			return "HTML conversion failed";
		case "SummarizerUnavailable":
			return "Kagi CLI unavailable. Install kagi-cli and run 'kagi auth' to summarize URLs.";
		case "SummarizerCommandFailed":
			return `Kagi summarizer failed (exit ${error.exitCode ?? "signal"})`;
		case "SummarizerResponseTooLarge":
			return `Summary response too large (${Math.floor(error.maxBytes / (1024 * 1024))}MB limit)`;
		case "SummarizerProtocolInvalid":
			return "Kagi summarizer returned an invalid response";
		case "SummarizerReturnedError":
			return error.safeMessage;
		case "SummarizerCancelled":
			return "Summary cancelled";
		case "TempFileWriteFailed":
			return "Failed to write full webfetch output";
	}
}

function textContent(text: string) {
	return { type: "text" as const, text };
}
