import assert from "node:assert/strict";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { FffRuntime } from "../src/fff.ts";

test("getMetadata reports cwd, project root, db paths, and heuristic classification", async () => {
	const root = await mkdtemp(join(tmpdir(), "pi-fff-meta-"));
	const repo = join(root, "repo");
	const nested = join(repo, "packages", "app");
	await mkdir(join(repo, ".git"), { recursive: true });
	await mkdir(nested, { recursive: true });

	const runtime = new FffRuntime(nested, { projectRoot: repo });
	const metadata = await runtime.getMetadata();

	assert.equal(metadata.cwd, nested);
	assert.equal(metadata.projectRoot, repo);
	assert.equal(metadata.definitionClassification, "heuristic");
	assert.match(metadata.dbDir, /\/pi-fff\/[a-f0-9]{12}$/);
	assert.equal(metadata.frecencyDbPath, join(metadata.dbDir, "frecency.db"));
	assert.equal(metadata.historyDbPath, join(metadata.dbDir, "history.db"));
});
