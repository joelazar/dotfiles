import { spawn } from "node:child_process";
import { err, ok, type Result } from "../result.ts";

export interface CommandRequest {
	readonly command: string;
	readonly args: readonly string[];
	readonly cwd?: string;
	readonly maxOutputBytes: number;
}

export interface CommandOutput {
	readonly exitCode: number | null;
	readonly stdout: string;
	readonly stderr: string;
}

export type CommandRunnerError =
	| { readonly _tag: "CommandSpawnFailed"; readonly cause: unknown }
	| { readonly _tag: "CommandOutputTooLarge"; readonly maxBytes: number }
	| { readonly _tag: "CommandCancelled"; readonly cause?: unknown };

export interface CommandRunner {
	run(
		request: CommandRequest,
		options?: { readonly signal?: AbortSignal },
	): Promise<Result<CommandOutput, CommandRunnerError>>;
}

const MAX_STDERR_BYTES = 16 * 1024;

export class SpawnCommandRunner implements CommandRunner {
	/** Run a local command without a shell and return bounded stdout/stderr text. */
	run(
		request: CommandRequest,
		options: { readonly signal?: AbortSignal } = {},
	): Promise<Result<CommandOutput, CommandRunnerError>> {
		return new Promise((resolve) => {
			if (options.signal?.aborted) {
				resolve(err({ _tag: "CommandCancelled", cause: options.signal.reason }));
				return;
			}

			let child: ReturnType<typeof spawn>;
			try {
				child = spawn(request.command, [...request.args], {
					cwd: request.cwd,
					stdio: ["ignore", "pipe", "pipe"],
				});
			} catch (cause: unknown) {
				resolve(err({ _tag: "CommandSpawnFailed", cause }));
				return;
			}

			const stdout = new BoundedText(request.maxOutputBytes);
			const stderr = new BoundedText(MAX_STDERR_BYTES);
			let settled = false;

			const finish = (result: Result<CommandOutput, CommandRunnerError>) => {
				if (settled) return;
				settled = true;
				options.signal?.removeEventListener("abort", onAbort);
				resolve(result);
			};

			const kill = () => {
				child.kill("SIGTERM");
			};

			function onAbort() {
				kill();
				finish(err({ _tag: "CommandCancelled", cause: options.signal?.reason }));
			}

			options.signal?.addEventListener("abort", onAbort, { once: true });

			child.stdout?.on("data", (chunk: Buffer) => {
				if (!stdout.push(chunk)) {
					kill();
					finish(err({ _tag: "CommandOutputTooLarge", maxBytes: request.maxOutputBytes }));
				}
			});
			child.stderr?.on("data", (chunk: Buffer) => {
				stderr.push(chunk);
			});

			child.on("error", (cause: unknown) => {
				finish(err({ _tag: "CommandSpawnFailed", cause }));
			});

			child.on("close", (exitCode) => {
				finish(ok({ exitCode, stdout: stdout.text(), stderr: stderr.text() }));
			});
		});
	}
}

class BoundedText {
	private readonly chunks: Buffer[] = [];
	private bytes = 0;

	constructor(private readonly maxBytes: number) {}

	/** Append a chunk, returning false once the byte budget is exceeded. */
	push(chunk: Buffer): boolean {
		this.bytes += chunk.byteLength;
		if (this.bytes > this.maxBytes) {
			return false;
		}
		this.chunks.push(chunk);
		return true;
	}

	text(): string {
		return Buffer.concat(this.chunks).toString("utf8");
	}
}
