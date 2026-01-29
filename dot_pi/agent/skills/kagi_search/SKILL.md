---
name: kagi_search
description: Web search and content extraction via Kagi Search API. Use for searching documentation, facts, or any web content. Lightweight, no browser required.
---

# Kagi Search

Web search and content extraction using the official Kagi Search API. No browser required.

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
6. Install dependencies (run once):
   ```bash
   cd {baseDir}
   npm install
   ```

## Pricing

The Kagi Search API is priced at $25 for 1000 queries (2.5 cents per search).

## Search

```bash
{baseDir}/search.js "query"                         # Basic search (10 results)
{baseDir}/search.js "query" -n 20                   # More results (max 100)
{baseDir}/search.js "query" --content               # Include page content as markdown
{baseDir}/search.js "query" -n 5 --content          # Combined options
```

### Options

- `-n <num>` - Number of results (default: 10, max: 100)
- `--content` - Fetch and include page content as markdown

## Extract Page Content

```bash
{baseDir}/content.js https://example.com/article
```

Fetches a URL and extracts readable content as markdown.

## Output Format

```
--- Result 1 ---
Title: Page Title
Link: https://example.com/page
Published: 2024-01-15T00:00:00Z
Snippet: Description from search results
Content: (if --content flag used)
  Markdown content extracted from the page...

--- Result 2 ---
...

--- Related Searches ---
- related term 1
- related term 2
```

## When to Use

- Searching for documentation or API references
- Looking up facts or current information
- Fetching content from specific URLs
- Any task requiring web search without interactive browsing

## Notes

- Search results inherit your Kagi account settings (personalized results, blocked/promoted sites)
- Results may include related search suggestions at the end
