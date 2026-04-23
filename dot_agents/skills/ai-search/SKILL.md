---
name: ai-search
description: "Low-level AI provider web search (codex, anthropic, gemini-cli). DO NOT use for general web search — use the `web-search` skill instead. Use this skill ONLY when the user explicitly says 'use ai-search', 'use codex', 'use gemini', 'use claude search', or asks to compare AI providers / get a specific model's native search."
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
