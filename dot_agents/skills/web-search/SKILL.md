---
name: web-search
description: "DEFAULT web search skill. Tiered: kagi quick → codex → anthropic → perplexity, escalates only if answer insufficient. Use this for ANY task that needs fresh internet data. Trigger phrases (all route here): 'search the web', 'web-search', 'websearch', 'search on the internet', 'search on internet', 'on the internet', 'look up', 'lookup', 'find online', 'find on the web', 'search for X', 'search after X', 'do research', 'do some research', 'make a research', 'research about X', 'research topic', 'what is the latest X', 'current version of Y', 'recent docs for Z', 'check if package exists', 'find the URL for', 'who/what/when/where on the internet', 'google it', 'find out about'. ALWAYS prefer this skill over `kagi`, `perplexity-search`, or `ai-search` unless the user explicitly names a specific provider (e.g. 'use kagi', 'with perplexity', 'via codex')."
allowed-tools: [Bash, Read]
---

# Web Search (tiered)

Single entry point for web research. Runs providers in a strict cost/speed order
and lets you escalate when the previous tier's answer is not good enough.

## Tier order (always follow)

| Tier | Provider          | Why first / when                                             |
| ---- | ----------------- | ------------------------------------------------------------ |
| 1    | `kagi quick`      | Fastest grounded answer, source confidence %, free w/ subscription |
| 2    | `codex`           | Deeper synthesis, clean canonical URLs, code-aware           |
| 3    | `anthropic`       | Second analytical opinion when codex hedges or gets it wrong |
| 4    | `perplexity`      | Most citations, last resort for hard or very recent topics   |

**Always start at tier 1.** Only escalate to the next tier if the current
answer is insufficient (vague, hedged, missing key facts, contradicts known
truth, no real URLs, or explicitly says it could not find X).

Do **not** call multiple tiers in parallel — the whole point is to save tokens
and time when tier 1 already answers the question.

## Usage

Single script, one provider per call:

```bash
~/.agents/skills/web-search/search.sh --provider <kagi|codex|anthropic|perplexity> "<query>" [--purpose "<why>"]
```

Examples:

```bash
# Tier 1 — start here every time
~/.agents/skills/web-search/search.sh --provider kagi \
  "latest stable Firefox version macOS user agent" \
  --purpose "update hardcoded UA in nvim plugin"

# Tier 2 — escalate if tier 1 was vague or missed the version
~/.agents/skills/web-search/search.sh --provider codex \
  "latest stable Firefox version macOS user agent" \
  --purpose "update hardcoded UA in nvim plugin"

# Tier 3 / 4 — only when needed
~/.agents/skills/web-search/search.sh --provider anthropic "..."
~/.agents/skills/web-search/search.sh --provider perplexity "..."
```

## Escalation rubric

After each tier's output, ask yourself:

1. **Did it answer the actual question?** A hedge ("not directly available")
   counts as no — escalate.
2. **Are there real canonical URLs** (not just titles, not redirect wrappers)?
   If no, escalate.
3. **Does the data look current?** If purpose mentions "latest" and the answer
   cites an old version, escalate.
4. **Did sources disagree without resolution?** Escalate to corroborate.

If tier-1 answer satisfies all four → stop. Don't run tier 2+.

## Provider notes

- **kagi**: requires `KAGI_API_KEY` env (already set) and `~/.kagi.toml` with
  session token. Wrapper does `cd $HOME` automatically. Output includes
  source confidence percentages and follow-up questions.
- **codex / anthropic**: thin wrappers over `native-web-search` skill's
  `search.mjs`. No extra setup needed if that skill already works.
- **perplexity**: requires `PERPLEXITY_API_KEY` env. Wraps `perplexity-search`
  skill's `--ask` mode (sonar model).

## When NOT to use this skill

- For raw search results with no synthesis → use `kagi search` or
  `perplexity --search` directly.
- For deep research reports → use `perplexity --deep` directly.
- For reading a known URL → use `defuddle` or `summarize` skill, not search.

## Related skills (kept for specialized use)

- `kagi` — full kagi-cli toolbox (translate, summarize, news, batch, etc.)
- `perplexity-search` — search/research/reason/deep modes
- `ai-search` — direct provider control for codex/anthropic/gemini-cli
