import assert from "node:assert/strict";
import test from "node:test";
import { buildStatusReport, inferFffGrepMode } from "../src/extension-common.ts";

test("inferFffGrepMode only enables regex when explicitly requested", () => {
	assert.equal(inferFffGrepMode(undefined), "plain");
	assert.equal(inferFffGrepMode(true), "plain");
	assert.equal(inferFffGrepMode(false), "regex");
});

test("buildStatusReport includes runtime paths, tracker state, and classification mode", () => {
	const report = buildStatusReport({
		status: { state: "ready", indexedFiles: 42 },
		health: {
			version: "test",
			git: { available: true, repositoryFound: true, libgit2Version: "1.0" },
			filePicker: { initialized: true, indexedFiles: 42, basePath: "/repo" },
			frecency: { initialized: true, dbHealthcheck: { path: "/db/frecency.db", diskSize: 1 } },
			queryTracker: { initialized: false, dbHealthcheck: { path: "/db/history.db", diskSize: 2 } },
		},
		metadata: {
			cwd: "/repo/packages/app",
			projectRoot: "/repo",
			dbDir: "/db",
			frecencyDbPath: "/db/frecency.db",
			historyDbPath: "/db/history.db",
			definitionClassification: "heuristic",
		},
		features: [
			{ label: "Autocomplete", enabled: true },
			{ label: "Agent tools", enabled: false },
		],
	});

	assert.match(report, /cwd: \/repo\/packages\/app/);
	assert.match(report, /project root: \/repo/);
	assert.match(report, /frecency db: \/db\/frecency.db/);
	assert.match(report, /query history: off/);
	assert.match(report, /definition classification: heuristic/);
	assert.match(report, /Autocomplete: on/);
	assert.match(report, /Agent tools: off/);
});
