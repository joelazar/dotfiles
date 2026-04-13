import { Result } from "better-result";
import type { Result as BetterResult } from "better-result";

export type AppResult<T, E> = BetterResult<T, E>;

export function errResult<T, E>(error: E): AppResult<T, E> {
	return Result.err(error);
}

export function okVoid<E = never>(): AppResult<void, E> {
	return Result.ok();
}

export function propagateError<T, E>(result: AppResult<unknown, E>): AppResult<T, E> {
	if (result.isErr()) return errResult(result.error);
	throw new Error("propagateError called with Ok result");
}

export function toVoidResult<E>(result: AppResult<unknown, E>): AppResult<void, E> {
	return result.isErr() ? errResult(result.error) : okVoid();
}
