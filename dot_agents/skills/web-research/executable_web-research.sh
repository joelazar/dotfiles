#!/usr/bin/env bash
# Web research dispatcher for answers that need synthesis.
# Modes: quick | ask (kagi) | google (agy) | claude (claude-code).
# Link lists and single-URL summaries are NOT here on purpose: use the pi
# web-tools extension (websearch / webfetch summarize=...) for those.
# Every kagi mode post-processes CLI JSON down to the minimal meaningful text
# so the caller's context never sees HTML, favicons, traces, or metadata.
set -uo pipefail

MODE=""
INPUT=""
THREAD_ID=""
FOLLOWUPS=0

usage() {
    cat <<'EOF'
Usage:
  web-research.sh <mode> "<question>" [flags]

Modes:
  quick      Grounded answer with ranked source links. Default for facts.
  ask        Kagi Assistant for deeper synthesis / multi-step reasoning.
  google     Google-grounded answer via Antigravity CLI (agy).
  claude     Web-grounded answer via Claude Code (claude -p).

Flags:
  --thread-id <id>     ask: continue an existing assistant thread
  --followups          quick: also print follow-up questions

Examples:
  web-research.sh quick "latest stable rust version"
  web-research.sh ask "compare uv vs poetry for monorepos"
  web-research.sh ask "now show a migration example" --thread-id "<id>"
  web-research.sh google "weather in budapest next 7 days"
  web-research.sh claude "weather in budapest next 7 days"

Not this skill:
  raw result links        -> websearch tool (pi web-tools extension)
  read/summarize one URL  -> webfetch tool, optionally summarize=summary
EOF
}

[[ $# -eq 0 ]] && {
    usage
    exit 2
}
MODE="$1"
shift

while [[ $# -gt 0 ]]; do
    case "$1" in
    --thread-id)
        THREAD_ID="$2"
        shift 2
        ;;
    --followups)
        FOLLOWUPS=1
        shift
        ;;
    -h | --help)
        usage
        exit 0
        ;;
    -*)
        echo "Unknown flag: $1" >&2
        usage
        exit 2
        ;;
    *)
        INPUT="${INPUT:+$INPUT }$1"
        shift
        ;;
    esac
done

[[ -z "$INPUT" ]] && {
    usage
    exit 2
}

cd "$HOME" || exit 1

PROMPT="Search the web for: $INPUT. Give a compact, factual answer with source URLs."

case "$MODE" in
google)
    command -v agy >/dev/null 2>&1 || {
        echo "ERROR: agy CLI not on PATH" >&2
        exit 127
    }
    exec agy -p "$PROMPT" --print-timeout 2m
    ;;
claude)
    command -v claude >/dev/null 2>&1 || {
        echo "ERROR: claude CLI not on PATH" >&2
        exit 127
    }
    exec claude -p "$PROMPT" --allowedTools WebSearch WebFetch
    ;;
esac

command -v kagi >/dev/null 2>&1 || {
    echo "ERROR: kagi CLI not on PATH" >&2
    exit 127
}

case "$MODE" in
quick)
    out="$(kagi quick "$INPUT")"
    jq -r '.message.markdown' <<<"$out"
    echo
    jq -r '.references.markdown // empty' <<<"$out"
    if [[ "$FOLLOWUPS" -eq 1 ]]; then
        jq -r '(.followup_questions // [])[] | "- " + .' <<<"$out"
    fi
    ;;

ask)
    if [[ -n "$THREAD_ID" ]]; then
        kagi assistant --thread-id "$THREAD_ID" --format markdown "$INPUT"
    else
        kagi assistant --format markdown "$INPUT"
    fi
    ;;

*)
    echo "Unknown mode: $MODE" >&2
    usage
    exit 2
    ;;
esac
