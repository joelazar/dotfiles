---
disable-model-invocation: true
name: listen-later
description: Convert an article, newsletter, or document into a short Kokoro-narrated audio read-up and upload it as a private episode to the user's "📥 Listen Later" Spotify show. ONLY trigger on explicit phrases like "listen later", "read-up", "save as audio for the commute", "add to my listen-later feed". Do NOT trigger on generic summarize, TTS, save-to-spotify, podcast, or cover-art requests — those route to the `save-to-spotify` skill.
---

# Listen Later

Opinionated pipeline: arbitrary text → Kokoro `af_heart` audio → private episode in the **📥 Listen Later** Spotify show.

For voice cloning, multilingual, custom cover art, or full podcast production, stop and use `save-to-spotify` directly — this skill is intentionally rigid.

## Defaults (do not ask unless user overrides)

|              |                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Voice        | Kokoro `af_heart`, 1.0× (`kokoro` on PATH)                                                                                                              |
| Length       | **Mode-dependent** — see below                                                                                                                          |
| Show         | `📥 Listen Later` (must already exist; resolve URI via `save-to-spotify --json shows`)                                                                  |
| Cover        | Reuse show cover for the episode (no per-episode art)                                                                                                   |
| Timeline     | Chapters only — no images, no link companions                                                                                                           |
| Polling      | Off by default. Only poll when the user explicitly asks to wait until ready.                                                                            |
| Chapter rule | Every chapter ≥30s (Spotify rejects too many short ones). Consolidate adjacent segments into chapters after rendering. First chapter MUST start at `0`. |

## Mode selection (infer from the user's words, do not ask)

- **Verbatim mode** — default when the user says _"read-up"_, _"save to listen later"_, _"add to my queue"_, or just pastes text. Narrate the **full text**, lightly cleaned for TTS (strip markdown / hashtags / emojis / URLs, expand abbreviations, em dash → hyphen). Do NOT cut content. Length follows the source: ~150 wpm → a 1500-word article becomes ~10 minutes.
- **Summarize mode** — only when the user says _"summarize"_, _"TL;DR"_, _"short version"_, or _"key points"_. Pick target length from source complexity:

  | Source                                         | Target                 |
  | ---------------------------------------------- | ---------------------- |
  | Tweet thread / short blog post (<800 words)    | 1–2 min                |
  | Newsletter / medium article (800–3000 words)   | 3–5 min                |
  | Long-form essay / report / paper (>3000 words) | 5–8 min                |
  | Dense technical / multi-topic source           | bias to the longer end |

  Within the target, write 6–12 declarative segments preserving the source's structure 1:1.

Segment count rule of thumb: ~30–60 seconds of speech per segment.

## Interview

Do not ask for confirmation. Derive the episode title from the source title, article `<title>`, or URL slug. If the user supplies a title, use it.

## Flow

1. **Preflight**: run one shell block that creates the work directory, checks `save-to-spotify --json auth status`, checks `which kokoro`, extracts the page, and resolves the `📥 Listen Later` show URI from `save-to-spotify --json shows`. Do not inspect files one at a time unless something fails.
2. **Script**: write `segments.json` with 6–10 declarative segments, links stripped, abbreviations expanded for TTS, em dashes → hyphens. Include chapter titles in the same file.
3. **Render**: render all segments in one shell block. Prefer parallel Kokoro jobs when there is more than one segment, capped at CPU count: `printf '%s\0' seg_*.txt | xargs -0 -P "$(sysctl -n hw.ncpu 2>/dev/null || nproc)" -I{} sh -c 'kokoro -t "$(cat "$1")" -o "${1%.txt}.wav"' sh {}`.
4. **Silence**: generate WAV silence once with ffmpeg: 300 ms between segments and 600 ms as outer pad.
5. **Concat**: concat WAVs with the ffmpeg concat demuxer, then encode and normalize in a single final MP3 command when possible: `ffmpeg -f concat -safe 0 -i concat.txt -af loudnorm -ar 44100 -ac 1 -b:a 192k episode.mp3`.
6. **Durations**: use `ffprobe` on WAV/MP3 files in one shell block and write `durations.json`.
7. **Chapters**: cursor walks the actual durations. Force first chapter to `start_time_ms: 0`. Merge adjacent segments until every chapter is ≥30s — typically ends up at 3–5 chapters for a 3-min episode.
8. **Description**: short HTML — one intro paragraph, `<ul>` of `M:SS — Title`, source link if supplied.
9. **Upload**: `save-to-spotify --json episodes create --show-id <SHOW_URI> --title "<T>" --file episode.mp3 --image show_cover.jpg --summary "<HTML>"`.
10. **Timeline**: `save-to-spotify --json timeline set --episode-id <EP_ID> --from-file timeline.json`.
11. **Poll**: skip by default. If the user explicitly asks to wait until ready, run `save-to-spotify --json episodes status <EP_ID>` until `readiness == READY`.

## Working directory

Use `/tmp/listen-later/<slug>/` (segments, silences, episode.mp3, timeline.json, description.html). Write incrementally — if step N fails, prior steps are preserved.

## Errors to watch

- `first chapter must start at 0 ms` → set `items[0].chapter.start_time_ms = 0`.
- `too many short chapters` → merge adjacent segment chapters until ≥30s each.
- Missing `📥 Listen Later` show → ask the user to create it once via `save-to-spotify shows create --title "📥 Listen Later" ...`, do NOT auto-create silently.
