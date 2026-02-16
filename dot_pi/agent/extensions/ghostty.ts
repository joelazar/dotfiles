/**
 * ghostty - Ghostty terminal title and progress bar integration.
 *
 * Shows a dynamic window title with project, session, and model info.
 * Animates a braille spinner and pulses Ghostty's native progress bar
 * while the agent is working, with a brief completion flash when done.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { writeFileSync } from "node:fs";
import path from "node:path";

const BRAILLE_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

let currentModel: string | undefined;
let sessionName: string | undefined;
let isWorking = false;
let currentTool: string | undefined;
let spinnerTimer: ReturnType<typeof setInterval> | undefined;
let completionTimer: ReturnType<typeof setTimeout> | undefined;
let frameIndex = 0;

function ghosttyWrite(seq: string) {
	try {
		writeFileSync("/dev/tty", seq);
	} catch {
		// /dev/tty unavailable (e.g. subagent context)
	}
}

function setProgress(state: number, value?: number) {
	const args = value !== undefined ? `${state};${value}` : `${state}`;
	ghosttyWrite(`\x1b]9;4;${args}\x07`);
}

function buildTitle(extra?: string): string {
	const segments: string[] = ["π"];
	segments.push(path.basename(process.cwd()));
	if (sessionName) segments.push(sessionName);
	if (extra) segments.push(extra);
	else if (currentModel) segments.push(currentModel);
	return segments.join(" · ");
}

function startSpinner(ctx: { ui: { setTitle: (title: string) => void } }) {
	if (spinnerTimer) clearInterval(spinnerTimer);
	if (completionTimer) {
		clearTimeout(completionTimer);
		completionTimer = undefined;
	}
	isWorking = true;
	currentTool = undefined;
	frameIndex = 0;
	setProgress(3);
	spinnerTimer = setInterval(() => {
		const frame = BRAILLE_FRAMES[frameIndex % BRAILLE_FRAMES.length];
		frameIndex++;
		const extra = currentTool ?? undefined;
		ctx.ui.setTitle(`${frame} ${buildTitle(extra)}`);
	}, 80);
}

function stopSpinner(ctx: { ui: { setTitle: (title: string) => void } }) {
	isWorking = false;
	currentTool = undefined;
	if (spinnerTimer) {
		clearInterval(spinnerTimer);
		spinnerTimer = undefined;
	}
	setProgress(1, 100);
	ctx.ui.setTitle(buildTitle());
	completionTimer = setTimeout(() => {
		setProgress(0);
		completionTimer = undefined;
	}, 800);
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		currentModel = ctx.model?.id;
		sessionName = pi.getSessionName();
		ctx.ui.setTitle(buildTitle());
	});

	pi.on("model_select", async (event, ctx) => {
		if (!ctx.hasUI) return;
		currentModel = event.model.id;
		if (!isWorking) ctx.ui.setTitle(buildTitle());
	});

	pi.on("agent_start", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		startSpinner(ctx);
	});

	pi.on("agent_end", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		stopSpinner(ctx);
	});

	pi.on("tool_execution_start", async (event, _ctx) => {
		currentTool = event.toolName;
	});

	pi.on("tool_execution_end", async (_event, _ctx) => {
		currentTool = undefined;
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		if (spinnerTimer) clearInterval(spinnerTimer);
		if (completionTimer) clearTimeout(completionTimer);
		spinnerTimer = undefined;
		completionTimer = undefined;
		setProgress(0);
	});
}
