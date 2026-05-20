#!/usr/bin/env bash
# Tiered web-search dispatcher. One provider per call.
# Picks the right backend (kagi quick / codex / claude-code / openai-cli / perplexity)
# and normalizes invocation/output. See SKILL.md for tier order + escalation rules.
set -uo pipefail

PROVIDER=""
QUERY=""
PURPOSE="general research support"
TIMEOUT_MS=180000

usage() {
  cat <<'EOF'
Usage:
  search.sh --provider <kagi|codex|claude-code|openai-cli|perplexity> "<query>" [--purpose "<why>"] [--timeout <ms>]

Tier order (see SKILL.md):
  1. kagi         — fastest grounded answer, source confidence %
  2. codex        — deeper synthesis with clean canonical URLs (gpt-5.5, low reasoning)
  3. claude-code  — second analytical opinion (haiku 4.5, low thinking)
  4. openai-cli   — OpenAI API web_search fallback (gpt-5.3-chat-latest)
  5. perplexity   — most citations, last resort

Examples:
  search.sh --provider kagi "latest python release" --purpose "update deps"
  search.sh --provider codex "vite 7 breaking changes"
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --provider)  PROVIDER="$2"; shift 2 ;;
    --provider=*) PROVIDER="${1#*=}"; shift ;;
    --purpose)   PURPOSE="$2"; shift 2 ;;
    --purpose=*) PURPOSE="${1#*=}"; shift ;;
    --timeout)   TIMEOUT_MS="$2"; shift 2 ;;
    --timeout=*) TIMEOUT_MS="${1#*=}"; shift ;;
    -h|--help)   usage; exit 0 ;;
    --) shift; QUERY="${QUERY:+$QUERY }$*"; break ;;
    -*) echo "Unknown flag: $1" >&2; usage; exit 2 ;;
    *)  QUERY="${QUERY:+$QUERY }$1"; shift ;;
  esac
done

if [[ -z "$PROVIDER" || -z "$QUERY" ]]; then
  usage
  exit 2
fi

NWS_DIR="$HOME/.agents/skills/ai-search"
PPLX_DIR="$HOME/.agents/skills/perplexity-search"

run_kagi() {
  if ! command -v kagi >/dev/null 2>&1; then
    echo "ERROR: kagi CLI not on PATH" >&2; return 127
  fi
  local prompt="$QUERY

Purpose: $PURPOSE

Provide concise summary, key findings, full canonical URLs (https://...), call out source disagreements."
  # cd $HOME so .kagi.toml is picked up (kagi-cli looks at relative path)
  ( cd "$HOME" && kagi quick --format markdown "$prompt" )
}

run_search_mjs() {
  local provider="$1"
  if [[ ! -f "$NWS_DIR/search.mjs" ]]; then
    echo "ERROR: ai-search skill not found at $NWS_DIR" >&2; return 127
  fi
  node "$NWS_DIR/search.mjs" "$QUERY" \
    --purpose "$PURPOSE" \
    --provider "$provider" \
    --timeout "$TIMEOUT_MS"
}

run_perplexity() {
  if [[ ! -f "$PPLX_DIR/perplexity_search.py" ]]; then
    echo "ERROR: perplexity-search skill not found at $PPLX_DIR" >&2; return 127
  fi
  local prompt="$QUERY

Purpose: $PURPOSE

Provide concise summary, key findings, full canonical URLs (https://...), call out source disagreements."
  python3 "$PPLX_DIR/perplexity_search.py" --ask "$prompt"
}

case "$PROVIDER" in
  kagi|kagi-quick)              run_kagi ;;
  codex|openai-codex)           run_search_mjs codex ;;
  claude-code|claude|anthropic) run_search_mjs claude-code ;;
  openai-cli|openai-api)        run_search_mjs openai-cli ;;
  perplexity|pplx|sonar)        run_perplexity ;;
  *) echo "Unknown provider: $PROVIDER" >&2; usage; exit 2 ;;
esac
