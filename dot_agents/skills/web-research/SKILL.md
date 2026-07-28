---
name: web-research
description: "Synthesized answers from the web: a fact with sources, a comparison or multi-step question, or a second opinion when the user says \"use google\" or \"ask claude\". For raw result links or reading one URL, use the websearch and webfetch tools instead."
allowed-tools: [Bash, Read]
---

# Web research

Someone else does the synthesis. Plain retrieval belongs to the pi `web-tools`
extension: result links → `websearch`, one page → `webfetch`, one page or
YouTube URL condensed → `webfetch` with `summarize=summary`.

```bash
~/.agents/skills/web-research/web-research.sh <mode> "<question>" [flags]
```

| Mode     | Backend            | Use when                                                                                             |
| -------- | ------------------ | ---------------------------------------------------------------------------------------------------- |
| `quick`  | `kagi quick`       | **Default.** A fact or short answer; prints ranked source links. `--followups` adds Kagi's follow-ups. |
| `ask`    | `kagi assistant`   | The answer needs reasoning or synthesis across sources. `--thread-id <id>` continues a prior thread.   |
| `google` | `agy -p`           | User says "use google" / "google it".                                                                 |
| `claude` | `claude -p`        | User says "use claude" / "ask claude".                                                                |

Start at `quick`; escalate to `ask` only when a fact lookup cannot answer it.

## `ask` is slow

Short prompts return in seconds, long multi-part ones in 2–3 minutes. Give it a
300s tool timeout and let it run to completion — the wait is normal.

## Setup

`kagi auth` once, with a Kagi subscription. `google` and `claude` modes need an
authenticated `agy` or `claude` on `PATH`. The script names any missing
dependency and exits.

kagi-cli's other tools (translate, news, batch, lenses, bangs) are deliberately
absent — run `kagi` directly for those.
