import { CustomEditor } from "@mariozechner/pi-coding-agent";
import type { AutocompleteItem, AutocompleteProvider, AutocompleteSuggestions } from "@mariozechner/pi-tui";
import type { FffRuntime } from "./fff.ts";

const PATH_DELIMITERS = new Set([" ", "\t", '"', "'", "="]);
const MAX_RESULTS = 20;

function findLastDelimiter(text: string): number {
	for (let i = text.length - 1; i >= 0; i -= 1) {
		if (PATH_DELIMITERS.has(text[i] ?? "")) return i;
	}
	return -1;
}

function isTokenStart(text: string, index: number): boolean {
	return index === 0 || PATH_DELIMITERS.has(text[index - 1] ?? "");
}

function findUnclosedQuoteStart(text: string): number | null {
	let inQuotes = false;
	let quoteStart = -1;
	for (let i = 0; i < text.length; i += 1) {
		if (text[i] === '"') {
			inQuotes = !inQuotes;
			if (inQuotes) quoteStart = i;
		}
	}
	return inQuotes ? quoteStart : null;
}

function extractAtPrefix(text: string): string | null {
	const quoteStart = findUnclosedQuoteStart(text);
	if (quoteStart !== null && quoteStart > 0 && text[quoteStart - 1] === "@" && isTokenStart(text, quoteStart - 1)) {
		return text.slice(quoteStart - 1);
	}

	const lastDelimiterIndex = findLastDelimiter(text);
	const tokenStart = lastDelimiterIndex === -1 ? 0 : lastDelimiterIndex + 1;
	if (text[tokenStart] === "@") return text.slice(tokenStart);
	return null;
}

function parseAtPrefix(prefix: string): { rawQuery: string; isQuotedPrefix: boolean } {
	if (prefix.startsWith('@"')) return { rawQuery: prefix.slice(2), isQuotedPrefix: true };
	return { rawQuery: prefix.slice(1), isQuotedPrefix: false };
}

function normalizeInsertedPath(value: string): string {
	let normalized = value.trim();
	if (normalized.startsWith("@")) normalized = normalized.slice(1);
	if (normalized.startsWith('"') && normalized.endsWith('"') && normalized.length >= 2) {
		normalized = normalized.slice(1, -1);
	}
	return normalized;
}

function toSuggestion(relativePath: string, label: string, description: string, isQuotedPrefix: boolean): AutocompleteItem {
	const path = relativePath.replace(/\\/g, "/");
	const needsQuotes = isQuotedPrefix || path.includes(" ");
	return {
		value: needsQuotes ? `@"${path}"` : `@${path}`,
		label,
		description,
	};
}

class FffAtAutocompleteProvider implements AutocompleteProvider {
	constructor(
		private readonly baseProvider: AutocompleteProvider,
		private readonly runtime: FffRuntime,
	) {}

	async getSuggestions(
		lines: string[],
		cursorLine: number,
		cursorCol: number,
		options: { signal: AbortSignal; force?: boolean },
	): Promise<AutocompleteSuggestions | null> {
		const currentLine = lines[cursorLine] ?? "";
		const textBeforeCursor = currentLine.slice(0, cursorCol);
		const atPrefix = extractAtPrefix(textBeforeCursor);
		if (!atPrefix) return this.baseProvider.getSuggestions(lines, cursorLine, cursorCol, options);
		if (options.signal.aborted) return null;

		const { rawQuery, isQuotedPrefix } = parseAtPrefix(atPrefix);
		const candidatesResult = await this.runtime.searchFileCandidates(rawQuery, MAX_RESULTS);
		if (options.signal.aborted || candidatesResult.isErr() || candidatesResult.value.length === 0) {
			return this.baseProvider.getSuggestions(lines, cursorLine, cursorCol, options);
		}

		return {
			prefix: atPrefix,
			items: candidatesResult.value.map((candidate) => {
				const matchType = candidate.score?.matchType ? ` · ${candidate.score.matchType}` : "";
				return toSuggestion(
					candidate.item.relativePath,
					candidate.item.fileName || candidate.item.relativePath,
					`${candidate.item.relativePath}${matchType}`,
					isQuotedPrefix,
				);
			}),
		};
	}

	applyCompletion(
		lines: string[],
		cursorLine: number,
		cursorCol: number,
		item: AutocompleteItem,
		prefix: string,
	): { lines: string[]; cursorLine: number; cursorCol: number } {
		void this.runtime.trackQuery(prefix, normalizeInsertedPath(item.value));
		return this.baseProvider.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
	}

	shouldTriggerFileCompletion?(lines: string[], cursorLine: number, cursorCol: number): boolean {
		const candidate = this.baseProvider as AutocompleteProvider & {
			shouldTriggerFileCompletion?: (l: string[], line: number, col: number) => boolean;
		};
		return candidate.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ?? true;
	}
}

/**
 * Monkey-patch Editor.prototype.setAutocompleteProvider so that ANY editor
 * (default, PromptEditor, HistoryEditor, etc.) wraps its autocomplete
 * provider with FffAtAutocompleteProvider.
 *
 * This avoids the setEditorComponent conflict where multiple extensions
 * (pi-fff, prompt-editor, cwd-history) each call setEditorComponent and
 * the last one wins — losing the fff autocomplete wrapping.
 */
const EditorPrototype = Object.getPrototypeOf(CustomEditor.prototype) as {
	setAutocompleteProvider(provider: AutocompleteProvider): void;
};
const originalSetAutocompleteProvider = EditorPrototype.setAutocompleteProvider;

let activeRuntime: FffRuntime | null = null;
let autocompleteEnabled = true;

export function enableAutocompletePatching(runtime: FffRuntime | null, enabled: boolean): void {
	activeRuntime = runtime;
	autocompleteEnabled = enabled;
}

EditorPrototype.setAutocompleteProvider = function (this: typeof EditorPrototype, provider: AutocompleteProvider): void {
	if (activeRuntime && autocompleteEnabled) {
		originalSetAutocompleteProvider.call(this, new FffAtAutocompleteProvider(provider, activeRuntime));
	} else {
		originalSetAutocompleteProvider.call(this, provider);
	}
};
