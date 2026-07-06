---
name: web-search
description: "Default for web lookup/research/latest/current/URL/package/docs questions. Backed by kagi-cli, plus google (agy) and claude (claude-code) modes. Returns only minimal, meaningful text."
allowed-tools: [Bash, Read]
---

# Web Search

## Modes

| Mode        | Backend                       | Use when                                                      |
| ----------- | ----------------------------- | ------------------------------------------------------------- |
| `quick`     | `kagi quick`                  | **Default.** A fact or short answer with ranked source links. |
| `search`    | `kagi search`                 | You want raw result links to pick from, no synthesis.         |
| `ask`       | `kagi assistant`              | Deeper synthesis, comparisons, multi-step reasoning.          |
| `summarize` | `kagi summarize --subscriber` | Condense one known URL into key text.                         |
| `google`    | `agy -p` (Antigravity CLI)    | User says "use google" / "google it". Google-grounded agent.  |
| `claude`    | `claude -p` (Claude Code)     | User says "use claude" / "ask claude". Web-grounded agent.    |

Start with `quick`. Escalate to `ask` only when the answer needs reasoning or
synthesis across sources. Use `search` when you specifically want a link list.
Use `summarize` only when you already have a URL. Use `google` when the user
explicitly asks for Google, `claude` when the user explicitly asks for Claude.

## Usage

```bash
~/.agents/skills/web-search/search.sh <mode> "<query|url>" [flags]
```

Examples:

```bash
# Default — grounded answer + ranked source links
~/.agents/skills/web-search/search.sh quick "latest stable rust version"

# Raw link list, choose your own limit
~/.agents/skills/web-search/search.sh search "vite 7 breaking changes" --limit 8

# Deeper synthesis / comparison
~/.agents/skills/web-search/search.sh ask "compare uv vs poetry for monorepos"

# Continue an assistant thread (id printed by a prior ask)
~/.agents/skills/web-search/search.sh ask "now show a migration example" --thread-id "<id>"

# Condense one page
~/.agents/skills/web-search/search.sh summarize "https://example.com/article"
~/.agents/skills/web-search/search.sh summarize "<url>" --summary-type keypoints

# User asked for Google — grounded answer via Antigravity CLI
~/.agents/skills/web-search/search.sh google "weather in budapest next 7 days"

# User asked for Claude — grounded answer via Claude Code
~/.agents/skills/web-search/search.sh claude "weather in budapest next 7 days"
```

## Flags

- `--limit <n>` — `search`: number of results (default 5).
- `--thread-id <id>` — `ask`: continue an existing assistant thread.
- `--summary-type <summary|keypoints>` — `summarize` (default `summary`).
- `--length <short|digest|...>` — `summarize` output length.
- `--followups` — `quick`: also print Kagi's follow-up question suggestions.

## Context hygiene (why this skill exists)

The script never forwards raw kagi-cli JSON. It extracts only:

- `quick` → `.message.markdown` answer + `.references.markdown` (titled links
  with confidence %). HTML, tooltips, favicon proxies, and traces are dropped.
- `search` → `title`, `url`, `snippet` per result; snippets whitespace-collapsed.
- `ask` → assistant markdown text only (via `--format markdown`).
- `summarize` → `.data.markdown` only.
- `google` → plain-text agent response from `agy -p` (no JSON involved).
- `claude` → plain-text agent response from `claude -p` (no JSON involved).

Keep queries tight and prefer `quick`/`search` before `ask`, since the assistant
returns the most text. Raise `--limit` deliberately, not by default.

## Requirements

- `kagi` CLI on `PATH` and a Kagi subscription.
- `~/.kagi.toml` with a session token (the script `cd`s to `$HOME` so kagi-cli
  resolves it). Set up once with `kagi auth`.
- `jq` for the minimal-output post-processing.
- `google` mode only: `agy` (Antigravity CLI) on `PATH`, authenticated via its
  interactive Google OAuth flow.
- `claude` mode only: `claude` (Claude Code) on `PATH`, authenticated.

## When NOT to use this skill

- Reading a known URL in full → use the `summarize` skill or `defuddle`, not
  `search` mode.
- Full kagi-cli toolbox (translate, news, batch, lenses, bangs) → use `kagi`
  directly; this skill intentionally exposes only the four research modes.
