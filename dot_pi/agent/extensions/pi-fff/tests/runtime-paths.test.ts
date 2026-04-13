import assert from "node:assert/strict";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { getProjectDatabasePaths, resolveProjectRoot } from "../src/runtime-paths.ts";

test("getProjectDatabasePaths is stable for the same cwd and different across projects", () => {
	const root = "/agent/pi-fff";
	const first = getProjectDatabasePaths(root, "/repo/one");
	const again = getProjectDatabasePaths(root, "/repo/one");
	const second = getProjectDatabasePaths(root, "/repo/two");

	assert.equal(first.dbDir, again.dbDir);
	assert.equal(first.frecencyDbPath, again.frecencyDbPath);
	assert.equal(first.historyDbPath, again.historyDbPath);
	assert.notEqual(first.dbDir, second.dbDir);
	assert.match(first.dbDir, /^\/agent\/pi-fff\/[a-f0-9]{12}$/);
});

test("resolveProjectRoot returns nearest git root and falls back to cwd", async () => {
	const root = await mkdtemp(join(tmpdir(), "pi-fff-root-"));
	const repo = join(root, "repo");
	const nested = join(repo, "packages", "app");
	await mkdir(join(repo, ".git"), { recursive: true });
	await mkdir(nested, { recursive: true });

	assert.equal(await resolveProjectRoot(nested), repo);
	assert.equal(await resolveProjectRoot(root), root);
});
