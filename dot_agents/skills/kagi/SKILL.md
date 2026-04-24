---
name: kagi
description: "Kagi CLI: search/quick, translate, summarize, news/smallweb, lenses, bangs, redirects, assistant. Use only when user names Kagi or needs Kagi-specific features; otherwise use web-search."
license: MIT
compatibility: Requires Kagi subscription for most features. Works on macOS, Linux, and Windows. Install via Homebrew, Scoop, npm, or direct script.
metadata:
  author: Microck
  version: "0.4.4"
  repository: https://github.com/Microck/kagi-cli
  npm: https://www.npmjs.com/package/kagi-cli
  docs: https://kagi.micr.dev
---

## Overview

kagi-cli is a terminal CLI that provides command-line access to Kagi search, Quick Answer, AI Assistant, translation, summarization, public feeds through `news` and `smallweb`, and account-level search settings like lenses, custom assistants, custom bangs, and redirects. It outputs JSON by default for scripting and automation, with `--format pretty` for human-readable terminal output on the commands that support alternate renderers.

The CLI prioritizes the subscriber session-token path, so existing Kagi subscribers can use most features without paying for API access. Paid API features (summarize, fastgpt, enrich) are available by setting `KAGI_API_TOKEN`.

## Commands

### kagi search

Search Kagi with JSON output by default.

```bash
# Basic search
kagi search "query"

# Pretty terminal output
kagi search --format pretty "query"

# Search with lens
kagi search --lens 2 "query"

# Filtered search
kagi search --time month --region us --order recency "rust release notes"

# Date-bounded search
kagi search --from-date 2026-03-01 --to-date 2026-03-31 "rust release notes"

# Per-request personalization override
kagi search --no-personalized "rust release notes"

# Output formats: json (default), pretty, compact, markdown, csv
kagi search --format markdown "query" > results.md
```

### kagi quick

Get a direct answer with references instead of a list of results.

```bash
# Quick answer with pretty output
kagi quick --format pretty "what is rust"

# JSON for scripting
kagi quick "capital of japan" | jq -r '.message.markdown'

# Markdown for documentation
kagi quick --format markdown "explain async/await" > notes.md
```

Output includes the answer, structured references, and follow-up questions.

### kagi translate

Translate text through Kagi Translate with language detection and extras.

```bash
# Auto-detect source, translate to English (default)
kagi translate "Bonjour tout le monde"

# Translate to specific target
kagi translate "Hello world" --to es

# Translation output is always JSON
kagi translate "Good morning" --to de | jq -r '.translation.translation'

# Skip extras for faster response
kagi translate "text" --to ja --no-alternatives --no-word-insights
```

Includes alternatives, word insights, alignments, and suggestions by default.

### kagi batch

Run multiple searches in parallel with rate limiting.

```bash
# Parallel searches
kagi batch "rust async" "python tutorial" "go concurrency"

# With output format
kagi batch "query1" "query2" --format compact

# CSV for spreadsheet analysis
kagi batch "product A review" "product B review" --format csv > comparison.csv
```

### kagi assistant

Prompt Kagi Assistant and manage conversation threads.

```bash
# Start conversation
kagi assistant "Explain quantum computing"

# Continue existing thread
kagi assistant --thread-id "<thread-id>" "Give me an example"

# Use a saved assistant profile with prompt overrides
kagi assistant --assistant research --model gpt-5-mini --web-access --no-personalized "Summarize the latest Rust release"

# List threads
kagi assistant thread list

# Get one thread as JSON
kagi assistant thread get "<thread-id>"

# Export thread
kagi assistant thread export "<thread-id>" --format markdown > thread.md

# Delete thread
kagi assistant thread delete "<thread-id>"
```

### kagi assistant custom

Manage saved assistant profiles.

```bash
# List built-in and custom assistants
kagi assistant custom list

# Inspect one assistant by id or exact name
kagi assistant custom get "Release Notes"

# Create a custom assistant
kagi assistant custom create "Release Notes" --model gpt-5-mini --web-access --lens 2 --instructions "Focus on release diffs and migrations."

# Update an existing custom assistant
kagi assistant custom update "Release Notes" --bang-trigger relnotes --no-personalized

# Delete a custom assistant
kagi assistant custom delete "Release Notes"
```

### kagi ask-page

Ask the Assistant about a specific web page.

```bash
kagi ask-page https://example.com/article "What are the main points?"
```

### kagi summarize

Summarize URLs or text using Kagi's summarizer.

```bash
# Subscriber summarizer (free with subscription)
kagi summarize --subscriber --url https://example.com

# With options
kagi summarize --subscriber --url "$URL" --summary-type keypoints --length digest

# Paid API summarizer
kagi summarize --url https://example.com --engine cecil
```

### kagi news

Fetch Kagi News (public, no auth required), optionally with local content filters.

```bash
# Tech news
kagi news --category tech --limit 5

# JSON output
kagi news --category world | jq '.stories[0].title'

# List built-in content-filter presets
kagi news --list-filter-presets

# Hide stories that match the politics preset
kagi news --filter-preset politics

# Keep matching stories in output, but tag them for downstream tools
kagi news --filter-preset politics --filter-mode blur
```

### kagi smallweb

Fetch the Kagi Small Web feed (public, no auth required).

```bash
kagi smallweb --limit 10
```

### kagi fastgpt

Quick factual answers through the paid API.

```bash
kagi fastgpt "what changed in rust 1.86?"
```

### kagi enrich

Query Kagi's enrichment indexes (paid API).

```bash
kagi enrich web "local-first software"
kagi enrich news "browser privacy"
```

### kagi lens

Manage Kagi search lenses.

```bash
kagi lens list
kagi lens get "Default"
kagi lens create "Rust Docs" --included-sites rust-lang.org,docs.rs --shortcut rustdocs
kagi lens update "Rust Docs" --description "Rust docs only" --region us
kagi lens enable "Rust Docs"
kagi lens disable "Rust Docs"
kagi lens delete "Rust Docs"
```

### kagi bang custom

Manage custom bangs.

```bash
kagi bang custom list
kagi bang custom get docs
kagi bang custom create "Docs" --trigger docs --template "https://docs.rs/releases/search?query=%s"
kagi bang custom update docs --shortcut-menu
kagi bang custom delete docs
```

### kagi redirect

Manage redirect rules.

```bash
kagi redirect list
kagi redirect get '^https://old.example.com/(.*)|https://new.example.com/$1'
kagi redirect create '^https://old.example.com/(.*)|https://new.example.com/$1'
kagi redirect update '^https://old.example.com/(.*)|https://new.example.com/$1' '^https://old.example.com/(.*)|https://docs.example.com/$1'
kagi redirect enable '^https://old.example.com/(.*)|https://docs.example.com/$1'
kagi redirect disable '^https://old.example.com/(.*)|https://new.example.com/$1'
kagi redirect delete '^https://old.example.com/(.*)|https://docs.example.com/$1'
```

## Output Formats

`search` and `batch` support `json`, `pretty`, `compact`, `markdown`, and `csv`. `quick` and `assistant` support `json`, `pretty`, `compact`, and `markdown`. Commands like `translate`, `news`, `smallweb`, `fastgpt`, `enrich`, `ask-page`, and `summarize` emit JSON only.

| Format     | Use Case                                   |
| ---------- | ------------------------------------------ |
| `json`     | Default, for scripting and jq pipelines    |
| `pretty`   | Human-readable terminal output with colors |
| `compact`  | Condensed output for quick scanning        |
| `markdown` | Documentation-ready output                 |
| `csv`      | Spreadsheet-compatible                     |

```bash
kagi search "query" --format json | jq '.'
kagi search "query" --format pretty
kagi search "query" --format markdown > results.md
kagi search "query" --format csv > results.csv
```

## Common Workflows

### Research Pipeline

```bash
# Quick overview
kagi quick --format pretty "topic overview"

# Deep search with filters
kagi search --time month --format pretty "topic research"

# Batch related searches
kagi batch "topic history" "topic applications" "topic future" --format compact

# Ask assistant about findings
kagi assistant "Summarize what I found about topic"
```

### Daily News Briefing

```bash
kagi news --category tech --limit 5
```

### Content Analysis

```bash
# Summarize an article
kagi summarize --subscriber --url "$URL" --summary-type keypoints

# Ask about a page
kagi ask-page "$URL" "What is the author's main argument?"
```

### Translation Workflow

```bash
# Quick translation
kagi translate "text" --to es

# Full analysis
kagi translate "text" --to de | jq '{
  translation: .translation.translation,
  alternatives: .alternatives.elements[0:3],
  insights: .word_insights.insights[0:5]
}'
```

### Assistant Thread Management

```bash
# Start research thread
kagi assistant "Help me understand X" > thread.json
THREAD_ID=$(cat thread.json | jq -r '.thread.id')

# Continue later
kagi assistant --thread-id "$THREAD_ID" "Now explain Y"

# Export for documentation
kagi assistant thread export "$THREAD_ID" --format markdown > research.md
```

### Batch Research

```bash
# Compare multiple topics
kagi batch "rust vs go" "python vs ruby" "react vs vue" --format pretty

# Save as CSV
kagi batch "topic1" "topic2" "topic3" --format csv > comparison.csv
```

## Input Requirements

- **Search queries**: Text strings; optionally with `--lens`, `--time`, `--region`, `--order` filters
- **Quick queries**: Natural language questions
- **Translate text**: Text string; optionally `--from` and `--to` language codes
- **URLs**: Valid HTTP/HTTPS URLs for summarize and ask-page
- **Thread IDs**: Alphanumeric strings from assistant responses
- **Categories**: News categories: world, usa, tech, science, business, etc.

## Constraints

- Session token required for: search --lens, quick, ask-page, assistant, translate, summarize --subscriber
- API token required for: summarize (public API), fastgpt, enrich
- Rate limits apply based on Kagi subscription tier
- API usage has per-query costs; session-based features included with subscription
- Translation requires session token

## Error Handling

| Error                 | Resolution                                      |
| --------------------- | ----------------------------------------------- |
| `missing credentials` | Run `kagi auth` or set KAGI_SESSION_TOKEN       |
| `auth check failed`   | Verify token is valid and not expired           |
| `403/401`             | Check token permissions and subscription status |
| `invalid lens`        | Use valid lens index from your Kagi account     |
| `rate limited`        | Wait and retry; reduce batch concurrency        |

## Resources

- Documentation: https://kagi.micr.dev
- GitHub: https://github.com/Microck/kagi-cli
- npm: https://www.npmjs.com/package/kagi-cli
- Kagi: https://kagi.com
- Auth Matrix: https://kagi.micr.dev/reference/auth-matrix
