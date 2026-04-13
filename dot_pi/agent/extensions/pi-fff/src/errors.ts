import { TaggedError } from "better-result";
import type { FffFileCandidate } from "./fff-types.ts";

function messageFromCause(cause: unknown): string {
	return cause instanceof Error ? cause.message : String(cause);
}

export class FeatureStateReadError extends TaggedError("FeatureStateReadError")<{
	path: string;
	cause: unknown;
	message: string;
}>() {
	constructor(args: { path: string; cause: unknown }) {
		super({
			...args,
			message: `Failed to read pi-fff feature state at ${args.path}: ${messageFromCause(args.cause)}`,
		});
	}
}

export class FeatureStateParseError extends TaggedError("FeatureStateParseError")<{
	path: string;
	cause: unknown;
	message: string;
}>() {
	constructor(args: { path: string; cause: unknown }) {
		super({
			...args,
			message: `Failed to parse pi-fff feature state at ${args.path}: ${messageFromCause(args.cause)}`,
		});
	}
}

export class FeatureStateWriteError extends TaggedError("FeatureStateWriteError")<{
	path: string;
	cause: unknown;
	message: string;
}>() {
	constructor(args: { path: string; cause: unknown }) {
		super({
			...args,
			message: `Failed to save pi-fff feature state at ${args.path}: ${messageFromCause(args.cause)}`,
		});
	}
}

export class RuntimeInitializationError extends TaggedError("RuntimeInitializationError")<{
	cwd: string;
	step: string;
	cause: unknown;
	message: string;
}>() {
	constructor(args: { cwd: string; step: string; cause: unknown }) {
		super({
			...args,
			message: `Failed to initialize FFF runtime (${args.step}) for ${args.cwd}: ${messageFromCause(args.cause)}`,
		});
	}
}

export class FinderOperationError extends TaggedError("FinderOperationError")<{
	operation: string;
	reason: string;
	cause?: unknown;
	message: string;
}>() {
	constructor(args: { operation: string; reason: string; cause?: unknown }) {
		super({
			...args,
			message: `FFF ${args.operation} failed: ${args.reason}`,
		});
	}
}

export class EmptyPathQueryError extends TaggedError("EmptyPathQueryError")<{
	query: string;
	message: string;
}>() {
	constructor(args: { query: string }) {
		super({ ...args, message: "Path query is empty." });
	}
}

export class EmptyFileQueryError extends TaggedError("EmptyFileQueryError")<{
	query: string;
	message: string;
}>() {
	constructor(args: { query: string }) {
		super({ ...args, message: "File query is empty." });
	}
}

export class MissingPathError extends TaggedError("MissingPathError")<{
	query: string;
	reason: string;
	message: string;
}>() {
	constructor(args: { query: string; reason: string }) {
		super({ ...args, message: args.reason });
	}
}

export class AmbiguousPathError extends TaggedError("AmbiguousPathError")<{
	query: string;
	candidates: FffFileCandidate[];
	message: string;
}>() {
	constructor(args: { query: string; candidates: FffFileCandidate[] }) {
		super({ ...args, message: `Ambiguous path query: ${args.query}` });
	}
}

export class InvalidFindFilesCursorError extends TaggedError("InvalidFindFilesCursorError")<{
	query: string;
	cursor: string;
	message: string;
}>() {
	constructor(args: { query: string; cursor: string }) {
		super({ ...args, message: "Invalid or expired find_files cursor." });
	}
}

export class InvalidGrepCursorError extends TaggedError("InvalidGrepCursorError")<{
	cursor: string;
	message: string;
}>() {
	constructor(args: { cursor: string }) {
		super({ ...args, message: "Invalid or expired grep cursor." });
	}
}

export class GrepCursorMismatchError extends TaggedError("GrepCursorMismatchError")<{
	cursor: string;
	message: string;
}>() {
	constructor(args: { cursor: string }) {
		super({ ...args, message: "This grep cursor belongs to a different query. Re-run without cursor." });
	}
}

export type FeatureStateLoadError = FeatureStateReadError | FeatureStateParseError;
export type PathResolutionError = EmptyPathQueryError | MissingPathError | AmbiguousPathError | RuntimeInitializationError | FinderOperationError;
export type FindFilesError = EmptyFileQueryError | InvalidFindFilesCursorError | RuntimeInitializationError | FinderOperationError;
export type RelatedFilesError = PathResolutionError | FinderOperationError;
export type GrepSearchError = InvalidGrepCursorError | GrepCursorMismatchError | PathResolutionError | FinderOperationError;
