import { createHash } from "node:crypto";
import { stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";

function stableProjectKey(cwd: string): string {
	return createHash("sha1").update(resolve(cwd)).digest("hex").slice(0, 12);
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

export async function resolveProjectRoot(cwd: string): Promise<string> {
	const start = resolve(cwd);
	let current = start;
	while (true) {
		if (await pathExists(resolve(current, ".git"))) return current;
		const parent = dirname(current);
		if (parent === current) return start;
		current = parent;
	}
}

export function getProjectDatabasePaths(root: string, cwd: string) {
	const dbDir = resolve(root, stableProjectKey(cwd));
	return {
		dbDir,
		frecencyDbPath: resolve(dbDir, "frecency.db"),
		historyDbPath: resolve(dbDir, "history.db"),
	};
}
