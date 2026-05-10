---
name: listen-later
description: Convert an article, newsletter, or document into a short Kokoro-narrated audio read-up and upload it as a private episode to the user's "📥 Listen Later" Spotify show. ONLY trigger on explicit phrases like "listen later", "read-up", "save as audio for the commute", "add to my listen-later feed". Do NOT trigger on generic summarize, TTS, save-to-spotify, podcast, or cover-art requests — those route to the `save-to-spotify` skill.
---

# Listen Later

Opinionated pipeline: arbitrary text → Kokoro `af_heart` audio → private episode in the **📥 Listen Later** Spotify show.

For voice cloning, multilingual, custom cover art, or full podcast production, stop and use `save-to-spotify` directly — this skill is intentionally rigid.

## Defaults (do not ask unless user overrides)

| | |
|---|---|
| Voice | Kokoro `af_heart`, 1.0× (`kokoro` on PATH) |
| Length | **Mode-dependent** — see below |
| Show | `📥 Listen Later` (must already exist; resolve URI via `save-to-spotify --json shows`) |
| Cover | Reuse show cover for the episode (no per-episode art) |
| Timeline | Chapters only — no images, no link companions |
| Chapter rule | Every chapter ≥30s (Spotify rejects too many short ones). Consolidate adjacent segments into chapters after rendering. First chapter MUST start at `0`. |

## Mode selection (infer from the user's words, do not ask)

- **Verbatim mode** — default when the user says *"read-up"*, *"save to listen later"*, *"add to my queue"*, or just pastes text. Narrate the **full text**, lightly cleaned for TTS (strip markdown / hashtags / emojis / URLs, expand abbreviations, em dash → hyphen). Do NOT cut content. Length follows the source: ~150 wpm → a 1500-word article becomes ~10 minutes.
- **Summarize mode** — only when the user says *"summarize"*, *"TL;DR"*, *"short version"*, or *"key points"*. Pick target length from source complexity:

  | Source | Target |
  |---|---|
  | Tweet thread / short blog post (<800 words) | 1–2 min |
  | Newsletter / medium article (800–3000 words) | 3–5 min |
  | Long-form essay / report / paper (>3000 words) | 5–8 min |
  | Dense technical / multi-topic source | bias to the longer end |

  Within the target, write 6–12 declarative segments preserving the source's structure 1:1.

Segment count rule of thumb: ~30–60 seconds of speech per segment.

## Interview (one round, then proceed)

Confirm only: **episode title** (propose one). Skip everything else.

## Flow

1. **Preflight**: `save-to-spotify --json auth status` and `which kokoro`. Resolve show URI from the shows list.
2. **Script**: 6–10 declarative segments, links stripped, abbreviations expanded for TTS, em dashes → hyphens.
3. **Render**: `kokoro -t "<text>" -o seg_NN.wav` per segment.
4. **Convert**: each WAV → MP3 at `-ar 44100 -ac 1 -b:a 192k`.
5. **Silence**: `silence_300.mp3` between segments, `silence_600.mp3` as outer pad.
6. **Concat**: `pad + seg + (gap + seg)... + pad`, **re-encoded** (no `-c copy`).
7. **Normalize**: `ffmpeg -i raw.mp3 -af loudnorm episode.mp3`.
8. **Chapters**: cursor walks the actual MP3 durations. Force first chapter to `start_time_ms: 0`. Then merge adjacent segments until every chapter is ≥30s — typically ends up at 3–5 chapters for a 3-min episode.
9. **Description**: short HTML — one intro paragraph, `<ul>` of `M:SS — Title`, source link if supplied.
10. **Upload**: `save-to-spotify --json episodes create --show-id <SHOW_URI> --title "<T>" --file episode.mp3 --image show_cover.jpg --summary "<HTML>"`.
11. **Timeline**: `save-to-spotify --json timeline set --episode-id <EP_ID> --from-file timeline.json`.
12. **Poll**: `save-to-spotify --json episodes status <EP_ID>` until `readiness == READY`.

## Working directory

Use `/tmp/listen-later/<slug>/` (segments, silences, episode.mp3, timeline.json, description.html). Write incrementally — if step N fails, prior steps are preserved.

## Errors to watch

- `first chapter must start at 0 ms` → set `items[0].chapter.start_time_ms = 0`.
- `too many short chapters` → merge adjacent segment chapters until ≥30s each.
- Missing `📥 Listen Later` show → ask the user to create it once via `save-to-spotify shows create --title "📥 Listen Later" ...`, do NOT auto-create silently.
