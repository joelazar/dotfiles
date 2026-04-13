import type { HealthCheck, FileItem, FileFinder, GrepCursor, GrepMatch, GrepMode, GrepResult, Location, Result as EngineResult, Score } from "@ff-labs/fff-node";
import type { TruncationResult } from "@mariozechner/pi-coding-agent";
import type { FindFilesError, GrepSearchError, PathResolutionError, RelatedFilesError } from "./errors.ts";
import type { AppResult } from "./result-utils.ts";

export const DEFAULT_FILE_CANDIDATE_LIMIT = 8;
export const DEFAULT_GREP_LIMIT = 100;
export const DEFAULT_FIND_FILES_LIMIT = 20;
export const MAX_MATCHES_PER_FILE = 200;
export const AUTO_EXPAND_AFTER_CONTEXT = 6;
export const MAX_AUTO_EXPAND_LINES = 5;
export const MAX_GREP_CURSOR_STATES = 64;
export const CROPPED_MATCH_LINE_WIDTH = 180;
export const GREP_CURSOR_PREFIX = "grep:";
export const FIND_FILES_CURSOR_PREFIX = "find:";

export type FffFileCandidate = {
	item: FileItem;
	score?: Score;
};

export type ResolvedPath = {
	kind: "resolved";
	query: string;
	absolutePath: string;
	relativePath: string;
	pathType: "file" | "directory";
	location?: Location;
	candidates: FffFileCandidate[];
};

export type PathResolution = AppResult<ResolvedPath, PathResolutionError>;

export type GrepOutputMode = "content" | "files_with_matches" | "count" | "usage";

export type GrepSearchRequest = {
	pattern: string;
	mode?: GrepMode;
	pathQuery?: string;
	glob?: string;
	constraints?: string;
	context?: number;
	limit?: number;
	cursor?: string;
	includeCursorHint?: boolean;
	outputMode?: GrepOutputMode;
};

export type GrepSearchResponse = {
	items: GrepMatch[];
	formatted: string;
	truncation?: TruncationResult;
	matchLimitReached?: number;
	linesTruncated: boolean;
	regexFallbackError?: string;
	scope?: ResolvedPath;
	nextCursor?: string;
	constraintQuery?: string;
	suggestedReadPath?: string;
};

export type FindFilesRequest = {
	query: string;
	limit?: number;
	cursor?: string;
};

export type FindFilesResponse = {
	items: FffFileCandidate[];
	formatted: string;
	nextCursor?: string;
	totalMatched?: number;
	totalFiles?: number;
};

export type RelatedFilesResponse = {
	base: ResolvedPath;
	items: FffFileCandidate[];
};

export type FindFilesResult = AppResult<FindFilesResponse, FindFilesError>;
export type RelatedFilesResult = AppResult<RelatedFilesResponse, RelatedFilesError>;
export type GrepSearchResult = AppResult<GrepSearchResponse, GrepSearchError>;

export type GrepBaseRequest = {
	pathQuery?: string;
	glob?: string;
	constraints?: string;
	context: number;
	limit: number;
	cursor?: string;
	includeCursorHint?: boolean;
	outputMode?: GrepOutputMode;
};

export type SingleGrepRequest = GrepBaseRequest & {
	kind: "single";
	pattern: string;
	mode: GrepMode;
};

export type MultiGrepRequest = GrepBaseRequest & {
	kind: "multi";
	patterns: string[];
};

export type FileCursorPayload = {
	query: string;
	searchQuery?: string;
	pageIndex: number;
	pageSize: number;
};

export type StoredGrepContinuation = {
	requestKey: string;
	remainingItems: GrepMatch[];
	engineCursor: GrepCursor | null;
	regexFallbackError?: string;
};

export type RuntimeOptions = {
	finder?: FileFinder;
	projectRoot?: string;
};

export type RuntimeMetadata = {
	cwd: string;
	projectRoot: string;
	dbDir: string;
	frecencyDbPath: string;
	historyDbPath: string;
	definitionClassification: "heuristic" | "native";
};

export type { HealthCheck, FileItem, FileFinder, GrepCursor, GrepMatch, GrepMode, GrepResult, Location, EngineResult, Score };
