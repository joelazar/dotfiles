# web-tools

Pi extension that registers two public-web tools:

- `webfetch` — fetch one public URL as markdown, text, html, or an inline raster image, or summarize it with Kagi
- `websearch` — search the public web through the local [kagi-cli](https://github.com/kagisearch) binary

Both Kagi-backed paths (`websearch`, and `webfetch summarize=…`) shell out to the local `kagi`
binary, so nothing is sent to a third-party API and no extra credentials live in this extension.
The `web-research` skill in `~/.agents/skills/web-research` covers what stays outside the extension:
Kagi Quick Answer, Kagi Assistant, and second opinions from Google/Claude agents.

## Tools

### `webfetch`

Parameters:

- `url` — required
- `format` — optional: `markdown`, `text`, `html`
- `summarize` — optional: `summary`, `keypoints`, `eli5` (routes to Kagi instead of fetching)
- `timeout` — optional timeout in seconds, clamped to `1..120` for fetches and `1..300` for summaries

Current defaults:

- `defaultFormat`: `markdown`
- `timeoutSeconds`: `30`
- `summarizeTimeoutSeconds`: `120`
- `maxResponseBytes`: `5 MB`
- `blockPrivateHosts`: `true`
- `maxRedirects`: `5`
- `fallbackUserAgent`: `opencode`

Behavior notes:

- only `http://` and `https://` URLs are supported
- URL userinfo credentials (`https://user:pass@example.com`) are rejected and redacted in diagnostics
- private/local hosts and IPs are blocked by default
- raster images (`png`, `jpeg`, `gif`, `webp`) are returned inline as images
- HTML is converted to markdown or text when requested
- binary content is rejected
- if a site returns `403` with `cf-mitigated: challenge`, the tool retries with the fallback user agent

Summarize notes:

- runs `kagi summarize --subscriber --error-format json --summary-type <type> --url <url>`
- `summarize` bypasses the HTTP fetch entirely, so it also works on YouTube videos and JS-heavy or paywalled articles
- prefers the CLI's `data.markdown`, falling back to `data.output` converted from HTML
- `format` is ignored while summarizing; output is always markdown

### `websearch`

Parameters:

- `query` — required
- `maxResults` — optional, clamped to `1..20`
- `recency` — optional: `any`, `day`, `week`, `month`, `year`

Current defaults:

- `enabled`: `true`
- `provider`: `kagi`
- `timeoutSeconds`: `60`
- `defaultMaxResults`: `8`
- `defaultRecency`: `any`

Behavior notes:

- runs `kagi search --format json --error-format json --no-color --limit <n> [--time <recency>] -- <query>`
- the child process is spawned without a shell, with `cwd` set to the home directory so kagi-cli finds `~/.kagi.toml`
- `recency` other than `any` is forwarded as `--time`
- related-search entries (`t != 0`) and non-HTTP(S) URLs are dropped
- snippets are whitespace-collapsed and the trailing `Summarize` affordance is stripped
- CLI output is limited to `1 MB`
- on non-zero exit, the `message` field of the CLI's JSON error is surfaced as the tool error

Requirements:

- `kagi` on `PATH` and an authenticated `~/.kagi.toml` (`kagi auth`)

## Configuration

The extension has an internal settings shape:

```ts
{
  kagi: {
    command: string;
  };
  fetch: {
    defaultFormat: "markdown" | "text" | "html";
    timeoutSeconds: number;
    summarizeTimeoutSeconds: number;
    maxResponseBytes: number;
    blockPrivateHosts: boolean;
    maxRedirects: number;
    fallbackUserAgent: string;
  };
  search: {
    enabled: boolean;
    provider: "kagi";
    timeoutSeconds: number;
    defaultMaxResults: number;
    defaultRecency: "any" | "day" | "week" | "month" | "year";
  };
}
```

But in the current implementation, these are hardcoded defaults in `settings.ts`.

That means:

- `webfetch.format`, `webfetch.summarize`, and `webfetch.timeout` can be overridden per call
- `websearch.maxResults` and `websearch.recency` can be overridden per call
- the underlying defaults are not currently exposed through Pi settings, extension settings, or env vars

To change the defaults, edit:

- `home/.pi/agent/extensions/web-tools/settings.ts`

## Source of truth

- extension entry: `home/.pi/agent/extensions/web-tools/index.ts`
- settings/defaults: `home/.pi/agent/extensions/web-tools/settings.ts`
- fetch Pi adapter: `home/.pi/agent/extensions/web-tools/webfetch.ts`
- fetch service: `home/.pi/agent/extensions/web-tools/fetch-page.ts`
- public web adapter: `home/.pi/agent/extensions/web-tools/network.ts`
- search Pi adapter: `home/.pi/agent/extensions/web-tools/websearch.ts`
- search service: `home/.pi/agent/extensions/web-tools/search-web.ts`
- Kagi search adapter: `home/.pi/agent/extensions/web-tools/providers/kagi.ts`
- Kagi summarizer adapter: `home/.pi/agent/extensions/web-tools/providers/kagi-summarize.ts`
- Kagi result parser: `home/.pi/agent/extensions/web-tools/providers/kagi-results.ts`
- command runner port: `home/.pi/agent/extensions/web-tools/providers/command.ts`
- tool output projection: `home/.pi/agent/extensions/web-tools/tool-output.ts`
