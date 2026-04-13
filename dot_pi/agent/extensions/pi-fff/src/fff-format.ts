import { truncateHead, truncateLine, type TruncationResult } from "@mariozechner/pi-coding-agent";
import { CROPPED_MATCH_LINE_WIDTH, DEFAULT_FILE_CANDIDATE_LIMIT, MAX_AUTO_EXPAND_LINES, type FffFileCandidate, type GrepMatch, type GrepOutputMode, type ResolvedPath } from "./fff-types.ts";

function formatContextLine(path: string, lineNumber: number, line: string) {
	return `${path}-${lineNumber}- ${truncateLine(line).text}`;
}

function frecencyWord(score: number): string | undefined {
	if (score >= 100) return "hot";
	if (score >= 50) return "warm";
	if (score >= 10) return "frequent";
	return undefined;
}

function formatGitStatus(status: string): string | undefined {
	return status && status !== "clean" ? status : undefined;
}

function fileSuffix(totalFrecencyScore: number, gitStatus: string): string {
	const frecency = frecencyWord(totalFrecencyScore);
	const git = formatGitStatus(gitStatus);
	if (frecency && git) return ` - ${frecency} git:${git}`;
	if (frecency) return ` - ${frecency}`;
	if (git) return ` git:${git}`;
	return "";
}

export function cropMatchLine(line: string, ranges: [number, number][] | undefined, maxLen = CROPPED_MATCH_LINE_WIDTH): { text: string; wasTruncated: boolean } {
	const normalized = line.trimEnd();
	if (normalized.length <= maxLen) return { text: normalized, wasTruncated: false };

	const first = ranges?.[0];
	if (!first) {
		const truncated = truncateLine(normalized);
		return { text: truncated.text, wasTruncated: truncated.wasTruncated };
	}

	const [start, end] = first;
	const matchStart = Math.max(0, Math.min(normalized.length, start));
	const matchEnd = Math.max(matchStart, Math.min(normalized.length, end));
	const matchLength = Math.max(1, matchEnd - matchStart);
	const available = Math.max(0, maxLen - matchLength);
	const before = Math.floor(available / 3);
	const after = available - before;
	let windowStart = Math.max(0, matchStart - before);
	let windowEnd = Math.min(normalized.length, matchEnd + after);

	if (windowEnd - windowStart < maxLen && windowStart > 0) {
		windowStart = Math.max(0, windowEnd - maxLen);
	}
	if (windowEnd - windowStart < maxLen && windowEnd < normalized.length) {
		windowEnd = Math.min(normalized.length, windowStart + maxLen);
	}

	let text = normalized.slice(windowStart, windowEnd);
	if (windowStart > 0) text = `…${text}`;
	if (windowEnd < normalized.length) text = `${text}…`;
	return { text, wasTruncated: true };
}

export function isLikelyDefinitionLine(line: string): boolean {
	const trimmed = line.trim();
	return /^(export\s+)?(async\s+)?function\s+/.test(trimmed)
		|| /^(export\s+)?class\s+/.test(trimmed)
		|| /^(export\s+)?interface\s+/.test(trimmed)
		|| /^(export\s+)?type\s+/.test(trimmed)
		|| /^(export\s+)?enum\s+/.test(trimmed)
		|| /^(export\s+)?const\s+[A-Za-z0-9_$]+\s*=\s*(async\s*)?(\(|<|function\b)/.test(trimmed)
		|| /^(pub\s+)?(struct|enum|trait|fn)\s+/.test(trimmed)
		|| /^(impl\s+|def\s+|class\s+)/.test(trimmed);
}

type FilePreview = {
	path: string;
	lineNumber: number;
	lineContent: string;
	matchRanges?: [number, number][];
	contextAfter: string[];
	isDefinition: boolean;
	count: number;
};

function pickSuggestedReadPath(items: GrepMatch[]): { path?: string; reason?: string; expandedPath?: string } {
	if (items.length === 0) return {};
	const definition = items.find((item) => isLikelyDefinitionLine(item.lineContent));
	const first = items[0];
	const uniqueFiles = new Set(items.map((item) => item.relativePath));
	const suggested = definition ?? first;
	const reason = uniqueFiles.size === 1 ? "only match" : definition ? "definition found" : "best match";
	return {
		path: suggested?.relativePath,
		reason,
		expandedPath: definition?.relativePath,
	};
}

function collectFilePreviews(items: GrepMatch[]): FilePreview[] {
	const previews = new Map<string, FilePreview>();
	for (const item of items) {
		const existing = previews.get(item.relativePath);
		if (existing) {
			existing.count += 1;
			continue;
		}
		previews.set(item.relativePath, {
			path: item.relativePath,
			lineNumber: item.lineNumber,
			lineContent: item.lineContent,
			matchRanges: item.matchRanges,
			contextAfter: item.contextAfter ?? [],
			isDefinition: isLikelyDefinitionLine(item.lineContent),
			count: 1,
		});
	}
	return [...previews.values()];
}

function finalizeGrepText(text: string, options: { includeCursorHint: boolean; nextCursor?: string; matchLimitReached?: number }) {
	const truncation = truncateHead(text);
	let output = truncation.truncated
		? `${truncation.content}\n\n[Output truncated at ${truncation.maxBytes} bytes / ${truncation.maxLines} lines]`
		: truncation.content;
	if (options.includeCursorHint && options.nextCursor) {
		output += `\n\ncursor: ${options.nextCursor}`;
	} else if (options.matchLimitReached) {
		output += `\n\n[${options.matchLimitReached} matches shown. Refine the pattern or increase limit for more.]`;
	}
	return { text: output, truncation: truncation.truncated ? truncation : undefined };
}

function buildContentLines(items: GrepMatch[], requestedContext: number, suggestion: { expandedPath?: string; path?: string; reason?: string }) {
	const lines: string[] = [];
	let linesTruncated = false;
	if (suggestion.path) {
		lines.push(`→ Read ${suggestion.path} (${suggestion.reason})`);
	}

	const explicitContext = requestedContext > 0;
	const autoExpandPath = explicitContext ? undefined : suggestion.expandedPath;
	let autoExpanded = false;

	for (const match of items) {
		const before = explicitContext ? match.contextBefore ?? [] : [];
		for (let i = 0; i < before.length; i += 1) {
			const lineNumber = match.lineNumber - before.length + i;
			const truncated = truncateLine(before[i] ?? "");
			linesTruncated ||= truncated.wasTruncated;
			lines.push(formatContextLine(match.relativePath, lineNumber, truncated.text));
		}

		const main = cropMatchLine(match.lineContent, match.matchRanges);
		linesTruncated ||= main.wasTruncated;
		lines.push(`${match.relativePath}:${match.lineNumber}: ${main.text}`);

		if (explicitContext) {
			const after = match.contextAfter ?? [];
			for (let i = 0; i < after.length; i += 1) {
				const truncated = truncateLine(after[i] ?? "");
				linesTruncated ||= truncated.wasTruncated;
				lines.push(formatContextLine(match.relativePath, match.lineNumber + i + 1, truncated.text));
			}
			continue;
		}

		if (!autoExpanded && autoExpandPath === match.relativePath && isLikelyDefinitionLine(match.lineContent)) {
			const after = (match.contextAfter ?? []).slice(0, MAX_AUTO_EXPAND_LINES);
			for (let i = 0; i < after.length; i += 1) {
				const content = after[i] ?? "";
				if (!content.trim()) continue;
				const truncated = truncateLine(content);
				linesTruncated ||= truncated.wasTruncated;
				lines.push(`${match.relativePath}|${match.lineNumber + i + 1}: ${truncated.text}`);
			}
			autoExpanded = true;
		}
	}
	return { lines, linesTruncated };
}

function buildFilesWithMatchesLines(items: GrepMatch[]) {
	const previews = collectFilePreviews(items);
	const suggestion = pickSuggestedReadPath(items);
	const lines: string[] = [];
	let linesTruncated = false;
	if (suggestion.path) {
		lines.push(`→ Read ${suggestion.path} (${suggestion.reason})`);
	}
	for (const preview of previews) {
		lines.push(`${preview.path}${preview.isDefinition ? " [def]" : ""}`);
		const main = cropMatchLine(preview.lineContent, preview.matchRanges);
		linesTruncated ||= main.wasTruncated;
		lines.push(`  ${preview.lineNumber}: ${main.text}`);
		if (preview.isDefinition) {
			for (let i = 0; i < Math.min(MAX_AUTO_EXPAND_LINES, preview.contextAfter.length); i += 1) {
				const line = preview.contextAfter[i] ?? "";
				if (!line.trim()) continue;
				const truncated = truncateLine(line);
				linesTruncated ||= truncated.wasTruncated;
				lines.push(`  ${preview.lineNumber + i + 1}| ${truncated.text}`);
			}
		}
	}
	return { lines, linesTruncated, suggestedReadPath: suggestion.path };
}

function buildCountLines(items: GrepMatch[]) {
	const counts = new Map<string, number>();
	const order: string[] = [];
	for (const item of items) {
		if (!counts.has(item.relativePath)) order.push(item.relativePath);
		counts.set(item.relativePath, (counts.get(item.relativePath) ?? 0) + 1);
	}
	return { lines: order.map((path) => `${path}: ${counts.get(path) ?? 0}`), linesTruncated: false };
}

function buildUsageLines(items: GrepMatch[]) {
	const groups = new Map<string, GrepMatch[]>();
	const order: string[] = [];
	for (const item of items) {
		if (!groups.has(item.relativePath)) order.push(item.relativePath);
		groups.set(item.relativePath, [...(groups.get(item.relativePath) ?? []), item]);
	}
	const lines: string[] = [];
	let linesTruncated = false;
	for (const path of order) {
		lines.push(path);
		for (const item of groups.get(path) ?? []) {
			const main = cropMatchLine(item.lineContent, item.matchRanges);
			linesTruncated ||= main.wasTruncated;
			lines.push(`  ${item.lineNumber}: ${main.text}`);
		}
	}
	return { lines, linesTruncated };
}

export function buildGrepText(
	items: GrepMatch[],
	options: {
		limit: number;
		requestedContext: number;
		includeCursorHint: boolean;
		nextCursor?: string;
		regexFallbackError?: string;
		outputMode?: GrepOutputMode;
	},
): { text: string; linesTruncated: boolean; matchLimitReached?: number; truncation?: TruncationResult; suggestedReadPath?: string } {
	if (items.length === 0) {
		return { text: "No matches found.", linesTruncated: false };
	}

	const outputMode = options.outputMode ?? "content";
	const suggestion = pickSuggestedReadPath(items);
	const prefixLines = options.regexFallbackError ? [`! regex failed: ${options.regexFallbackError}, using literal match`] : [];
	const built = outputMode === "files_with_matches"
		? buildFilesWithMatchesLines(items)
		: outputMode === "count"
			? { ...buildCountLines(items), suggestedReadPath: undefined }
			: outputMode === "usage"
				? { ...buildUsageLines(items), suggestedReadPath: undefined }
				: { ...buildContentLines(items, options.requestedContext, suggestion), suggestedReadPath: suggestion.path };

	const matchLimitReached = items.length >= options.limit && outputMode === "content" ? options.limit : undefined;
	const finalized = finalizeGrepText([...prefixLines, ...built.lines].join("\n"), {
		includeCursorHint: options.includeCursorHint,
		nextCursor: options.nextCursor,
		matchLimitReached,
	});

	return {
		text: finalized.text,
		linesTruncated: built.linesTruncated,
		matchLimitReached,
		truncation: finalized.truncation,
		suggestedReadPath: built.suggestedReadPath,
	};
}

export function formatFindFilesText(
	query: string,
	items: FffFileCandidate[],
	options: { totalMatched?: number; totalFiles?: number; nextCursor?: string; pageIndex: number; pageSize: number },
): string {
	if (items.length === 0) {
		return options.pageIndex > 0 ? `0 more results for \"${query}\".` : `0 results for \"${query}\"${options.totalFiles ? ` (${options.totalFiles} indexed)` : ""}`;
	}

	const lines: string[] = [];
	const top = items[0];
	const second = items[1];
	if (top && options.pageIndex === 0) {
		if (top.score?.exactMatch || top.score?.matchType === "exact") {
			lines.push(`→ Read ${top.item.relativePath} (exact match!)`);
		} else if (!second || (top.score?.total ?? Number.NEGATIVE_INFINITY) > (second.score?.total ?? Number.NEGATIVE_INFINITY) * 2) {
			lines.push(`→ Read ${top.item.relativePath} (best match — Read this file directly)`);
		}
	}

	if ((options.totalMatched ?? 0) > items.length + options.pageIndex * options.pageSize) {
		lines.push(`${items.length}/${options.totalMatched} matches`);
	} else if (options.totalMatched && options.pageIndex > 0) {
		lines.push(`${Math.min(options.totalMatched, options.pageIndex * options.pageSize + items.length)}/${options.totalMatched} matches`);
	}

	lines.push(...formatCandidateLines(items, items.length));
	if (options.nextCursor) lines.push(`cursor: ${options.nextCursor}`);
	return lines.join("\n");
}

export function resolutionSummary(resolution: ResolvedPath): string {
	return `Resolved ${resolution.query} -> ${resolution.relativePath}`;
}

export function formatCandidateLines(candidates: FffFileCandidate[], max = DEFAULT_FILE_CANDIDATE_LIMIT): string[] {
	return candidates.slice(0, max).map((candidate, index) => {
		const matchType = candidate.score?.matchType;
		const suffix = fileSuffix(candidate.item.totalFrecencyScore, candidate.item.gitStatus);
		return `${index + 1}. ${candidate.item.relativePath}${matchType ? ` (${matchType})` : ""}${suffix}`;
	});
}
