---
name: ai-search
description: "Low-level provider web search via codex, claude-code, openai-cli, or gemini. Use only when user names ai-search/codex/gemini/claude/openai-cli search, compares providers, or wants native search; otherwise use web-search."
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

- `--provider codex|claude-code|openai-cli|gemini`
- `--model <model-id>` (defaults: `codex` → `gpt-5.5` with low reasoning, `claude-code` → `claude-haiku-4-5` with low thinking budget, `openai-cli` → `gpt-5.3-chat-latest` or `$OPENAI_CLI_MODEL`, `gemini` → `gemini-3.1-flash-lite-preview`)
- `--timeout <ms>`
- `--json`

Provider names are user-facing aliases:

- `codex` uses the existing ChatGPT/Codex OAuth-backed web search path with `gpt-5.5` and low reasoning.
- `claude-code` uses the existing Anthropic/Claude web search path with `claude-haiku-4-5` and a low thinking budget.
- `openai-cli` shells out to the official `openai` CLI and calls
  `openai responses create` with the built-in `web_search_preview` tool. It requires the
  `openai` binary on `PATH` and `OPENAI_API_KEY` in the environment.
- `gemini` shells out to the local `gemini` CLI with `-y` (yolo) and forces use
  of the built-in `google_web_search` tool. No API key needed — gemini-cli uses
  its own auth.

## Output expectations

The script instructs the model to:

- search the internet for the requested topic
- provide a concise summary for the given purpose
- include full canonical URLs (`https://...`) for each key finding
- highlight disagreements between sources

## Notes

- No extra npm install is required.
- If module resolution fails, set `PI_AI_MODULE_PATH` to `@earendil-works/pi-ai`'s `dist/index.js` path.
