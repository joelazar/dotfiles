---
name: web-search
description: "Default for web lookup/research/latest/current/URL/package/docs questions. Uses kagi→codex→anthropic→perplexity, escalating only if needed. Prefer this over provider skills unless user explicitly names kagi, perplexity, codex/claude/gemini, or ai-search."
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
