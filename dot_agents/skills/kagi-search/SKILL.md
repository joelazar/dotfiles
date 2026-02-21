---
name: kagi-search
description: Fast web search and content extraction via Kagi Search API. Uses a Go backend for quick startup and supports JSON output.
---

# Kagi Search

Fast web search and content extraction using the official Kagi Search API.

This skill now uses a Go backend (auto-built on first run) for faster startup and fewer dependency issues.

## Setup

Requires a Kagi account with API access enabled.

1. Create an account at https://kagi.com/signup
2. Navigate to Settings -> Advanced -> API portal: https://kagi.com/settings/api
3. Generate an API Token
4. Add funds to your API balance at: https://kagi.com/settings/billing_api
5. Add to your shell profile (`~/.profile` or `~/.zprofile` for zsh):
   ```bash
   export KAGI_API_KEY="your-api-key-here"
   ```
6. Ensure Go 1.26 is installed and available in `PATH` (https://go.dev/dl/)

## Pricing

The Kagi Search API is priced at $25 for 1000 queries (2.5 cents per search).

## Search

```bash
{baseDir}/kagi-search search "query"                              # Basic search (10 results)
{baseDir}/kagi-search search "query" -n 20                        # More results (max 100)
{baseDir}/kagi-search search "query" --content                    # Include extracted page content
{baseDir}/kagi-search search "query" --json                       # JSON output
{baseDir}/kagi-search search "query" -n 5 --content --json        # Combined options
```

### Search options

- `-n <num>` - Number of results (default: 10, max: 100)
- `--content` - Fetch and include page content for each result
- `--json` - Emit JSON output
- `--timeout <sec>` - HTTP timeout in seconds (default: 15)
- `--max-content-chars <num>` - Max chars per fetched result content (default: 5000)

## Extract Page Content

```bash
{baseDir}/kagi-search content https://example.com/article
{baseDir}/kagi-search content https://example.com/article --json
```

### Content options

- `--json` - Emit JSON output
- `--timeout <sec>` - HTTP timeout in seconds (default: 20)
- `--max-chars <num>` - Max chars to output (default: 20000)

## Output

### Default (text)

`kagi-search search` prints readable text blocks, and `kagi-search content` prints extracted content.

### JSON (`--json`)

`kagi-search search --json` returns:

- `query`
- `meta` (includes API metadata like `ms`, `api_balance` when provided)
- `results[]` with `title`, `link`, `snippet`, optional `published`, optional `content`
- `related_searches[]`

`kagi-search content --json` returns:

- `url`
- `title`
- `content`
- `error` (only when extraction fails)

## When to Use

- Searching for documentation or API references
- Looking up facts or current information
- Fetching content from specific URLs
- Any task requiring web search without interactive browsing

## Notes

- Search results inherit your Kagi account settings (personalized results, blocked/promoted sites)
- Results may include related search suggestions (`t:1` objects)
- Content extraction uses `codeberg.org/readeck/go-readability/v2` (Readability v2)
- The Go binary is cached under `{baseDir}/.bin/` and rebuilt automatically when source changes
