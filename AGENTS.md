# Instructions

## Common operations

```bash
chezmoi diff             # preview changes
chezmoi apply <target>   # apply individual files, never all at once
```

Always apply changed targets after editing, edits in this source directory have no effect on the live system until applied.

## Structure

This repo root is the chezmoi source directory. Map a live path to its source with `chezmoi source-path <target>`; if it says "not managed", run `readlink` on the path, since these live in other repos:

- `~/.pi/agent/AGENTS.md`, `~/.claude/CLAUDE.md`, `~/Code/AGENTS.md` -> `~/Code/joelazar/agents-md/files/` (edit there, symlinks reject `sed -i`)
- `~/.agents/skills`, `~/.claude/skills` -> `~/Code/joelazar/skills`
- `~/.config/nvim` -> `~/Code/joelazar/nvim-config`
- pi extensions (commit, split-fork, subq, sandbox, ...) -> `~/Code/joelazar/pi-extensions/extensions/<name>/`; Claude Code provider -> `~/Code/joelazar/pi-claude-code`

## Shell scripts

- Bash with error handling and descriptive function names
- Source `scripts/utils` for color/style helpers; use `gum` for prompts and spinners, with plain fallbacks
- Validate with `bash -n` and `shellcheck` before finishing
