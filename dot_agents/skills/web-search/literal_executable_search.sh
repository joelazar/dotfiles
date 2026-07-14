#!/usr/bin/env bash
# kagi-only web research dispatcher.
# Modes: search | quick | ask | summarize.
# Every mode post-processes kagi-cli JSON down to the minimal meaningful text
# so the caller's context never sees HTML, favicons, traces, or metadata.
set -uo pipefail

MODE=""
INPUT=""
LIMIT=5
THREAD_ID=""
SUMMARY_TYPE="summary"
LENGTH=""
FOLLOWUPS=0

usage() {
  cat <<'EOF'
Usage:
  search.sh <mode> "<query|url>" [flags]

Modes:
  search     List results (title + url + snippet). Cheapest, no synthesis.
  quick      Grounded answer with ranked source links. Default for facts.
  ask        Kagi Assistant for deeper synthesis / multi-step reasoning.
  summarize  Condense one URL into key text.

Flags:
  --limit <n>          search: number of results (default 5)
  --thread-id <id>     ask: continue an existing assistant thread
  --summary-type <t>   summarize: summary | keypoints (default summary)
  --length <l>         summarize: short | digest | etc.
  --followups          quick: also print follow-up questions

Examples:
  search.sh quick "latest stable rust version"
  search.sh search "vite 7 breaking changes" --limit 8
  search.sh ask "compare uv vs poetry for monorepos"
  search.sh summarize "https://example.com/article"
EOF
}

[[ $# -eq 0 ]] && { usage; exit 2; }
MODE="$1"; shift

while [[ $# -gt 0 ]]; do
  case "$1" in
    --limit)        LIMIT="$2"; shift 2 ;;
    --thread-id)    THREAD_ID="$2"; shift 2 ;;
    --summary-type) SUMMARY_TYPE="$2"; shift 2 ;;
    --length)       LENGTH="$2"; shift 2 ;;
    --followups)    FOLLOWUPS=1; shift ;;
    -h|--help)      usage; exit 0 ;;
    -*) echo "Unknown flag: $1" >&2; usage; exit 2 ;;
    *)  INPUT="${INPUT:+$INPUT }$1"; shift ;;
  esac
done

[[ -z "$INPUT" ]] && { usage; exit 2; }

command -v kagi >/dev/null 2>&1 || { echo "ERROR: kagi CLI not on PATH" >&2; exit 127; }
# cd $HOME so kagi-cli resolves the session token in ~/.kagi.toml
cd "$HOME" || exit 1

case "$MODE" in
  search)
    kagi search --limit "$LIMIT" "$INPUT" \
      | jq -r '.data[]? | select(.url) | "- [\(.title)](\(.url))\n  \(.snippet // "" | gsub("\\s+"; " "))"'
    ;;

  quick)
    out="$(kagi quick "$INPUT")"
    jq -r '.message.markdown' <<<"$out"
    echo
    jq -r '.references.markdown // empty' <<<"$out"
    [[ "$FOLLOWUPS" -eq 1 ]] && jq -r '(.followup_questions // [])[] | "- " + .' <<<"$out"
    ;;

  ask)
    if [[ -n "$THREAD_ID" ]]; then
      kagi assistant --thread-id "$THREAD_ID" --format markdown "$INPUT"
    else
      kagi assistant --format markdown "$INPUT"
    fi
    ;;

  summarize)
    args=(summarize --subscriber --url "$INPUT" --summary-type "$SUMMARY_TYPE")
    [[ -n "$LENGTH" ]] && args+=(--length "$LENGTH")
    kagi "${args[@]}" | jq -r '.data.markdown // .data.output // empty'
    ;;

  *)
    echo "Unknown mode: $MODE" >&2; usage; exit 2 ;;
esac
