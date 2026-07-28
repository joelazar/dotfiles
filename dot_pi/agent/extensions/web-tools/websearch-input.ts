import { err, ok, type Result } from "./result.ts";
import {
	SEARCH_MAX_RESULTS,
	SEARCH_RECENCIES,
	SEARCH_TIMEOUT_SECONDS,
	clampInteger,
	type ToolInputParseError,
} from "./settings.ts";
import {
	parseSearchQuery,
	type ParseSearchQueryError,
	type SearchQuery,
	type SearchRecency,
	type WebToolsSettings,
} from "./types.ts";

export interface RawWebSearchToolParams {
	readonly query: string;
	readonly maxResults?: number;
	readonly recency?: SearchRecency;
}

export interface WebSearchToolInput {
	readonly query: SearchQuery;
	readonly maxResults: number;
	readonly recency: SearchRecency;
	readonly timeoutSeconds: number;
}

/** Parse raw Pi websearch params into service-facing input. */
export function parseWebSearchToolParams(
	raw: unknown,
	settings: WebToolsSettings["search"],
): Result<WebSearchToolInput, ToolInputParseError | ParseSearchQueryError> {
	if (!isPlainObject(raw)) {
		return err({ _tag: "InvalidToolInput", message: "Expected an object" });
	}

	for (const key of Object.keys(raw)) {
		if (key !== "query" && key !== "maxResults" && key !== "recency") {
			return err({ _tag: "UnknownToolField", field: key });
		}
	}

	const queryValue = raw["query"];
	if (typeof queryValue !== "string") {
		return err({ _tag: "InvalidToolField", field: "query", message: "Expected a string" });
	}

	const query = parseSearchQuery(queryValue);
	if (query._tag === "err") {
		return query;
	}

	const maxResultsValue = raw["maxResults"];
	let maxResults = clampInteger(settings.defaultMaxResults, {
		min: SEARCH_MAX_RESULTS.min,
		max: SEARCH_MAX_RESULTS.max,
		fallback: SEARCH_MAX_RESULTS.default,
	});
	if (maxResultsValue !== undefined) {
		if (typeof maxResultsValue !== "number" || !Number.isFinite(maxResultsValue)) {
			return err({ _tag: "InvalidToolField", field: "maxResults", message: "Expected a finite number" });
		}
		maxResults = clampInteger(maxResultsValue, {
			min: SEARCH_MAX_RESULTS.min,
			max: SEARCH_MAX_RESULTS.max,
			fallback: SEARCH_MAX_RESULTS.default,
		});
	}

	const recencyValue = raw["recency"];
	let recency = settings.defaultRecency;
	if (recencyValue !== undefined) {
		if (typeof recencyValue !== "string" || !isSearchRecency(recencyValue)) {
			return err({
				_tag: "InvalidToolField",
				field: "recency",
				message: `Expected one of: ${SEARCH_RECENCIES.join(", ")}`,
			});
		}
		recency = recencyValue;
	}

	const timeoutSeconds = clampInteger(settings.timeoutSeconds, {
		min: SEARCH_TIMEOUT_SECONDS.min,
		max: SEARCH_TIMEOUT_SECONDS.max,
		fallback: SEARCH_TIMEOUT_SECONDS.default,
	});

	return ok({ query: query.value, maxResults, recency, timeoutSeconds });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSearchRecency(value: string): value is SearchRecency {
	const recencies: readonly string[] = SEARCH_RECENCIES;
	return recencies.includes(value);
}
