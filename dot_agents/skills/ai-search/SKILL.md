---
name: ai-search
description: "Low-level provider web search via codex, anthropic/Claude, or gemini-cli. Use only when user names ai-search/codex/gemini/claude search, compares providers, or wants native search; otherwise use web-search."
---

# AI Search

Use this skill to run a **fast model with native web search enabled** and get a concise research summary with explicit full URLs.

## Script

- `search.mjs`

## Usage

Run from this skill directory:

```bash
node search.mjs "<what to search>" --purpose "<why you need this>"
```

Examples:

```bash
node search.mjs "latest python release" --purpose "update dependency notes"
node search.mjs "vite 7 breaking changes" --purpose "prepare migration checklist"
```

Optional flags:

- `--provider openai-codex|anthropic|gemini-cli`
- `--model <model-id>` (for `gemini-cli`, defaults to `gemini-3.1-flash-lite-preview`)
- `--timeout <ms>`
- `--json`

The `gemini-cli` provider shells out to the local `gemini` CLI with `-y` (yolo)
and forces use of the built-in `google_web_search` tool. No API key needed —
gemini-cli uses its own auth.

## Output expectations

The script instructs the model to:

- search the internet for the requested topic
- provide a concise summary for the given purpose
- include full canonical URLs (`https://...`) for each key finding
- highlight disagreements between sources

## Notes

- No extra npm install is required.
- If module resolution fails, set `PI_AI_MODULE_PATH` to `@mariozechner/pi-ai`'s `dist/index.js` path.
