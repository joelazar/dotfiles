#!/usr/bin/env node
/**
 * Extracts session transcripts for a given cwd, splits into context-sized files,
 * optionally spawns subagents to analyze patterns.
 */

import {
    copyFileSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    rmSync,
    writeFileSync,
} from "fs";
import { spawn } from "child_process";
import { createInterface } from "readline";
import { homedir, tmpdir } from "os";
import { join, resolve } from "path";
import { parseSessionEntries } from "@mariozechner/pi-coding-agent";

const MAX_CHARS_PER_FILE = 100_000; // ~20k tokens

function cwdToSessionDir(cwd) {
    const normalized = resolve(cwd).replace(/\//g, "-");
    return `--${normalized.slice(1)}--`;
}

function extractTextContent(content) {
    if (typeof content === "string") return content;
    if (!Array.isArray(content)) return "";
    return content
        .filter((c) => c.type === "text" && c.text)
        .map((c) => c.text)
        .join("\n");
}

function parseSession(filePath) {
    const content = readFileSync(filePath, "utf8");
    const entries = parseSessionEntries(content);
    const messages = [];

    for (const entry of entries) {
        if (entry.type !== "message") continue;
        const { role, content } = entry.message;
        if (role !== "user" && role !== "assistant") continue;
        const text = extractTextContent(content);
        if (!text.trim()) continue;
        messages.push(`[${role.toUpperCase()}]\n${text}`);
    }
    return messages;
}

function truncateLine(text, maxWidth) {
    const singleLine = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    if (singleLine.length <= maxWidth) return singleLine;
    return singleLine.slice(0, maxWidth - 3) + "...";
}

function splitOversizedTranscript(transcript, maxChars) {
    if (transcript.length <= maxChars) return [transcript];

    const chunks = [];
    let cursor = 0;

    while (cursor < transcript.length) {
        let end = Math.min(cursor + maxChars, transcript.length);

        if (end < transcript.length) {
            const newlineIdx = transcript.lastIndexOf("\n", end);
            const minimumSplit = cursor + Math.floor(maxChars * 0.6);
            if (newlineIdx >= minimumSplit) {
                end = newlineIdx;
            }
        }

        chunks.push(transcript.slice(cursor, end));

        cursor = end;
        if (transcript[cursor] === "\n") {
            cursor++;
        }
    }

    return chunks;
}

function runSubagent(prompt, cwd) {
    return new Promise((resolve) => {
        const child = spawn("pi", ["--mode", "json", "--tools", "read,write", "-p", prompt], {
            cwd,
            stdio: ["ignore", "pipe", "pipe"],
        });

        let textBuffer = "";
        const rl = createInterface({ input: child.stdout });

        rl.on("line", (line) => {
            try {
                const event = JSON.parse(line);
                if (event.type === "message_update" && event.assistantMessageEvent) {
                    if (event.assistantMessageEvent.type === "text_delta" && event.assistantMessageEvent.delta) {
                        textBuffer += event.assistantMessageEvent.delta;
                    }
                } else if (event.type === "tool_execution_start" && event.toolName) {
                    if (textBuffer.trim()) {
                        console.log(`  ${truncateLine(textBuffer, 100)}`);
                        textBuffer = "";
                    }
                    let argsStr = "";
                    if (event.args) {
                        if (event.toolName === "read") {
                            argsStr = event.args.path || "";
                            if (event.args.offset) argsStr += ` offset=${event.args.offset}`;
                            if (event.args.limit) argsStr += ` limit=${event.args.limit}`;
                        } else if (event.toolName === "write") {
                            argsStr = event.args.path || "";
                        }
                    }
                    console.log(`  [${event.toolName}] ${argsStr}`);
                } else if (event.type === "turn_end") {
                    if (textBuffer.trim()) {
                        console.log(`  ${truncateLine(textBuffer, 100)}`);
                    }
                    textBuffer = "";
                }
            } catch {
                // Ignore malformed JSON
            }
        });

        child.stderr.on("data", (data) => {
            process.stderr.write(data.toString());
        });

        child.on("close", (code) => resolve({ success: code === 0 }));
        child.on("error", (err) => {
            console.error(`  Failed to spawn pi: ${err.message}`);
            resolve({ success: false });
        });
    });
}

async function main() {
    const args = process.argv.slice(2);
    const analyzeFlag = args.includes("--analyze");

    const outputIdx = args.indexOf("--output");
    let outputDir = resolve("./session-transcripts");
    if (outputIdx !== -1 && args[outputIdx + 1]) {
        outputDir = resolve(args[outputIdx + 1]);
    }

    const patternIdx = args.indexOf("--pattern");
    let pattern = null;
    if (patternIdx !== -1 && args[patternIdx + 1]) {
        pattern = args[patternIdx + 1];
    }

    const flagIndices = new Set();
    flagIndices.add(args.indexOf("--analyze"));
    if (outputIdx !== -1) {
        flagIndices.add(outputIdx);
        flagIndices.add(outputIdx + 1);
    }
    if (patternIdx !== -1) {
        flagIndices.add(patternIdx);
        flagIndices.add(patternIdx + 1);
    }
    const cwdArg = args.find((a, i) => !flagIndices.has(i) && !a.startsWith("--"));

    mkdirSync(outputDir, { recursive: true });
    const sessionsBase = join(homedir(), ".pi/agent/sessions");

    // Find matching session directories
    let sessionDirs = [];
    if (pattern) {
        // Pattern mode: find all session dirs matching the pattern
        const allDirs = readdirSync(sessionsBase).filter((d) => {
            const fullPath = join(sessionsBase, d);
            return existsSync(fullPath) && readdirSync(fullPath).some((f) => f.endsWith(".jsonl"));
        });
        sessionDirs = allDirs
            .filter((d) => d.toLowerCase().includes(pattern.toLowerCase()))
            .map((d) => join(sessionsBase, d));

        if (sessionDirs.length === 0) {
            console.error(`No sessions found matching pattern "${pattern}"`);
            console.error(`Available session dirs:`);
            allDirs.slice(0, 10).forEach((d) => console.error(`  ${d}`));
            if (allDirs.length > 10) console.error(`  ... and ${allDirs.length - 10} more`);
            process.exit(1);
        }
        console.log(`Found ${sessionDirs.length} session dir(s) matching "${pattern}":`);
        sessionDirs.forEach((d) => console.log(`  ${d.replace(sessionsBase + "/", "")}`));
    } else {
        // Single cwd mode (original behavior)
        const cwd = resolve(cwdArg || process.cwd());
        const sessionDirName = cwdToSessionDir(cwd);
        const sessionDir = join(sessionsBase, sessionDirName);

        if (!existsSync(sessionDir)) {
            console.error(`No sessions found for ${cwd}`);
            console.error(`Expected: ${sessionDir}`);
            console.error(`\nTip: Use --pattern <substring> to match multiple session dirs`);
            process.exit(1);
        }
        sessionDirs = [sessionDir];
    }

    // Collect all session files from all matching dirs
    const sessionFiles = [];
    for (const dir of sessionDirs) {
        const files = readdirSync(dir)
            .filter((f) => f.endsWith(".jsonl"))
            .map((f) => ({ dir, file: f, path: join(dir, f) }));
        sessionFiles.push(...files);
    }
    sessionFiles.sort((a, b) => a.file.localeCompare(b.file));

    console.log(`Found ${sessionFiles.length} total session files`);

    const allTranscripts = [];
    for (const { dir, file, path: filePath } of sessionFiles) {
        const messages = parseSession(filePath);
        if (messages.length > 0) {
            const dirLabel = pattern ? `${dir.replace(sessionsBase + "/", "")}/${file}` : file;
            allTranscripts.push(`=== SESSION: ${dirLabel} ===\n${messages.join("\n---\n")}\n=== END SESSION ===`);
        }
    }

    if (allTranscripts.length === 0) {
        console.error("No transcripts found");
        process.exit(1);
    }

    const outputFiles = [];
    let currentContent = "";
    let fileIndex = 0;

    function flushCurrentContent() {
        if (currentContent.length === 0) return;

        const filename = `session-transcripts-${String(fileIndex).padStart(3, "0")}.txt`;
        writeFileSync(join(outputDir, filename), currentContent);
        outputFiles.push(filename);
        console.log(`Wrote ${filename} (${currentContent.length} chars)`);

        currentContent = "";
        fileIndex++;
    }

    for (const transcript of allTranscripts) {
        if (transcript.length > MAX_CHARS_PER_FILE) {
            flushCurrentContent();

            const chunks = splitOversizedTranscript(transcript, MAX_CHARS_PER_FILE);
            chunks.forEach((chunk, chunkIndex) => {
                const filename = `session-transcripts-${String(fileIndex).padStart(3, "0")}.txt`;
                writeFileSync(join(outputDir, filename), chunk);
                outputFiles.push(filename);
                console.log(
                    `Wrote ${filename} (${chunk.length} chars) - split chunk ${chunkIndex + 1}/${chunks.length}`
                );
                fileIndex++;
            });
            continue;
        }

        if (currentContent.length > 0 && currentContent.length + transcript.length + 2 > MAX_CHARS_PER_FILE) {
            flushCurrentContent();
        }

        currentContent += (currentContent ? "\n\n" : "") + transcript;
    }

    flushCurrentContent();

    console.log(`\nCreated ${outputFiles.length} transcript file(s) in ${outputDir}`);

    if (!analyzeFlag) {
        console.log("\nRun with --analyze to spawn pi subagents for pattern analysis.");
        return;
    }

    const analysisPrompt = `You are analyzing session transcripts to identify recurring user instructions that could be automated.

READING INSTRUCTIONS:
The transcript file is large. Read it in chunks of 1000 lines using offset/limit parameters:
1. First: read with limit=1000 (lines 1-1000)
2. Then: read with offset=1001, limit=1000 (lines 1001-2000)
3. Continue incrementing offset by 1000 until you reach the end
4. Only after reading the ENTIRE file, perform the analysis and write the summary

ANALYSIS TASK:
Look for patterns where the user repeatedly gives similar instructions. These could become:
- AGENTS.md entries: coding style rules, behavior guidelines, project conventions
- Skills: multi-step workflows with external tools (search, browser, APIs)
- Prompt templates: reusable prompts for common tasks

OUTPUT FORMAT (strict):
Write a file with exactly this structure. Use --- as separator between patterns.

PATTERN: <short descriptive name>
TYPE: agents-md | skill | prompt-template
FREQUENCY: <number of times observed>
EVIDENCE:
- "<exact quote 1>"
- "<exact quote 2>"
- "<exact quote 3>"
DRAFT:
<proposed content for AGENTS.md entry, SKILL.md, or prompt template>
---

Rules:
- Only include patterns that appear 2+ times
- EVIDENCE must contain exact quotes from the transcripts
- DRAFT must be ready-to-use content
- If no patterns found, write "NO PATTERNS FOUND"
- Do not include any other text outside this format`;

    console.log("\nSpawning subagents for analysis...");
    const createdSummaryFiles = [];

    for (const file of outputFiles) {
        const summaryFile = file.replace(".txt", ".summary.txt");
        const filePath = join(outputDir, file);
        const summaryPath = join(outputDir, summaryFile);

        if (!existsSync(filePath)) {
            console.error(`Skipping ${file} - transcript file missing`);
            continue;
        }

        const fileContent = readFileSync(filePath, "utf8");
        const fileSize = fileContent.length;

        if (fileSize > MAX_CHARS_PER_FILE) {
            console.log(`Skipping ${file} (${fileSize} chars) - too large for analysis`);
            continue;
        }

        console.log(`Analyzing ${file} (${fileSize} chars)...`);

        const lineCount = fileContent.split("\n").length;
        const analysisCwd = mkdtempSync(join(tmpdir(), "pi-session-analyzer-"));
        const isolatedTranscriptPath = join(analysisCwd, "transcript.txt");
        const isolatedSummaryPath = join(analysisCwd, "summary.txt");

        writeFileSync(isolatedTranscriptPath, fileContent);

        const fullPrompt = `${analysisPrompt}\n\nThe file ${isolatedTranscriptPath} has ${lineCount} lines. Read it in full using chunked reads, then write your analysis to ${isolatedSummaryPath}`;

        try {
            const result = await runSubagent(fullPrompt, analysisCwd);

            if (result.success && existsSync(isolatedSummaryPath)) {
                copyFileSync(isolatedSummaryPath, summaryPath);
                console.log(`  -> ${summaryFile}`);
                createdSummaryFiles.push(summaryFile);
            } else if (result.success) {
                console.error(`  Agent finished but did not write ${summaryFile}`);
            } else {
                console.error(`  Failed to analyze ${file}`);
            }
        } finally {
            rmSync(analysisCwd, { recursive: true, force: true });
        }
    }

    const summaryFiles = [...createdSummaryFiles].sort();

    console.log(`\n=== Individual Analysis Complete ===`);
    console.log(`Created ${summaryFiles.length} summary files`);

    if (summaryFiles.length === 0) {
        console.log("No summary files created. Nothing to aggregate.");
        return;
    }

    console.log("\nAggregating findings into final summary...");

    const finalSummaryPath = join(outputDir, "FINAL-SUMMARY.txt");
    const aggregationCwd = mkdtempSync(join(tmpdir(), "pi-session-analyzer-aggregate-"));

    const isolatedSummaryPaths = summaryFiles.map((file, index) => {
        const sourcePath = join(outputDir, file);
        const targetPath = join(aggregationCwd, `summary-${String(index).padStart(3, "0")}.txt`);
        copyFileSync(sourcePath, targetPath);
        return targetPath;
    });

    const summaryPaths = isolatedSummaryPaths.join("\n");
    const isolatedFinalSummaryPath = join(aggregationCwd, "FINAL-SUMMARY.txt");

    const aggregationPrompt = `You are aggregating pattern analysis results from multiple summary files.

Read ALL of the following summary files:
${summaryPaths}

Then create a consolidated final summary that:
1. Merges duplicate patterns (same pattern found in multiple files)
2. Ranks patterns by total frequency across all files
3. Groups patterns by type (agents-md, skill, prompt-template)
4. Provides the best/most complete DRAFT for each unique pattern

OUTPUT FORMAT (strict):
Write the final summary with this structure:

# AGENTS.MD PATTERNS (sorted by frequency)

## Pattern: <name>
Total Frequency: <sum across all files>
Evidence:
- "<best quotes>"
Draft:
<consolidated draft>

---

# SKILL PATTERNS (sorted by frequency)

## Pattern: <name>
...

---

# PROMPT TEMPLATE PATTERNS (sorted by frequency)

## Pattern: <name>
...

---

# SUMMARY
- Total unique patterns found: <N>
- Patterns by type: agents-md (<N>), skill (<N>), prompt-template (<N>)
- Top 3 most frequent patterns: <list>

Write the final summary to ${isolatedFinalSummaryPath}`;

    try {
        const aggregateResult = await runSubagent(aggregationPrompt, aggregationCwd);

        if (aggregateResult.success && existsSync(isolatedFinalSummaryPath)) {
            copyFileSync(isolatedFinalSummaryPath, finalSummaryPath);
            console.log(`\n=== Final Summary Created ===`);
            console.log(`  ${finalSummaryPath}`);
        } else if (aggregateResult.success) {
            console.error(`Agent finished but did not write final summary`);
        } else {
            console.error(`Failed to create final summary`);
        }
    } finally {
        rmSync(aggregationCwd, { recursive: true, force: true });
    }
}

main().catch(console.error);
