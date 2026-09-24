#!/usr/bin/env bash
# Claude Code status line: model | dir (branch) | context %
set -euo pipefail

input=$(cat)

model=$(jq -r '.model.display_name // "?"' <<<"$input")
dir=$(jq -r '.workspace.current_dir // .cwd // ""' <<<"$input")
pct=$(jq -r '.context_window.used_percentage // 0' <<<"$input" | cut -d. -f1)

branch=""
if [[ -n "$dir" ]] && git -C "$dir" rev-parse --is-inside-work-tree &>/dev/null; then
  branch=$(git -C "$dir" --no-optional-locks branch --show-current 2>/dev/null || true)
fi

dir_name="${dir/#"$HOME"/\~}"
out="[$model] $dir_name"
[[ -n "$branch" ]] && out+=" ($branch)"
out+=" | ${pct}% ctx"

printf '%s\n' "$out"
