import { err, ok, type Result } from "../result.ts";
import { parsePublicHttpUrl, type NormalizedSearchResult } from "../types.ts";

export interface ParsedKagiResults {
	readonly results: readonly NormalizedSearchResult[];
	/** True when the CLI answered with a well-formed but empty result list. */
	readonly explicitNoResults: boolean;
}

export type KagiResultsParseError =
	| { readonly _tag: "InvalidJson" }
	| { readonly _tag: "InvalidPayload"; readonly reason: string };

/** Parse `kagi search --format json` stdout into normalized public-web results. */
export function parseKagiSearchOutput(stdout: string): Result<ParsedKagiResults, KagiResultsParseError> {
	const trimmed = stdout.trim();
	if (!trimmed) {
		return err({ _tag: "InvalidPayload", reason: "Empty CLI output" });
	}

	let payload: unknown;
	try {
		payload = JSON.parse(trimmed);
	} catch {
		return err({ _tag: "InvalidJson" });
	}

	const items = extractItems(payload);
	if (!items) {
		return err({ _tag: "InvalidPayload", reason: "Missing result array" });
	}

	const results: NormalizedSearchResult[] = [];
	for (const item of items) {
		const normalized = normalizeItem(item);
		if (normalized) {
			results.push(normalized);
		}
	}

	return ok({ results, explicitNoResults: items.length === 0 });
}

/** Extract a safe, human-readable message from `kagi --error-format json` stderr. */
export function parseKagiErrorMessage(stderr: string): string | undefined {
	const line = stderr
		.split("\n")
		.map((candidate) => candidate.trim())
		.reverse()
		.find((candidate) => candidate.startsWith("{"));
	if (!line) {
		const fallback = stderr.trim().split("\n").at(-1)?.trim();
		return fallback || undefined;
	}

	try {
		const parsed: unknown = JSON.parse(line);
		if (isPlainObject(parsed) && typeof parsed["message"] === "string" && parsed["message"].trim()) {
			return parsed["message"].trim();
		}
	} catch {
		return undefined;
	}
	return undefined;
}

function extractItems(payload: unknown): readonly unknown[] | undefined {
	if (Array.isArray(payload)) {
		return payload;
	}
	if (isPlainObject(payload) && Array.isArray(payload["data"])) {
		return payload["data"];
	}
	return undefined;
}

function normalizeItem(item: unknown): NormalizedSearchResult | undefined {
	if (!isPlainObject(item)) {
		return undefined;
	}

	// Kagi tags related-search blocks with t=1; only web results (t=0) carry a URL.
	const kind = item["t"];
	if (typeof kind === "number" && kind !== 0) {
		return undefined;
	}

	const rawUrl = item["url"];
	if (typeof rawUrl !== "string") {
		return undefined;
	}
	const url = parsePublicHttpUrl(rawUrl);
	if (url._tag === "err") {
		return undefined;
	}

	const title = typeof item["title"] === "string" && item["title"].trim() ? item["title"].trim() : rawUrl;
	const snippet = cleanSnippet(item["snippet"]);
	const publishedAt = typeof item["published"] === "string" && item["published"].trim() ? item["published"].trim() : undefined;

	return {
		title,
		url: url.value,
		...(snippet ? { snippet } : {}),
		...(publishedAt ? { publishedAt } : {}),
	};
}

function cleanSnippet(value: unknown): string | undefined {
	if (typeof value !== "string") {
		return undefined;
	}
	// Kagi appends a "Summarize" affordance to snippets; it carries no information for the model.
	const collapsed = value.replace(/\s+/g, " ").replace(/\s*Summarize\s*$/, "").trim();
	return collapsed || undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
