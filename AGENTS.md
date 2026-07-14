# Instructions

## Common operations

```bash
chezmoi diff             # preview changes
chezmoi apply <target>   # apply individual files, never all at once
```

Always apply changed targets after editing, edits in this source directory have no effect on the live system until applied.

## Structure

This repo root is the chezmoi source directory.

- `dot_*` → `~/.*`, `private_*` → sensitive files, `.tmpl` → Go text/template (variables: `{{ .email }}`, `{{ .name }}`, `{{ .type }}`, `{{ .chezmoi.sourceDir }}`)
- `.chezmoiscripts/` — `run_once_*`/`run_onchange_*` setup scripts
- `scripts/` — shared shell utilities, not deployed
- `Brewfile.{work,private,workstation}` — packages per machine type (`type` is prompted on `chezmoi init`)

## Shell scripts

- Bash with error handling and descriptive function names
- Source `scripts/utils` for color/style helpers; use `gum` for prompts and spinners, with plain fallbacks
- Validate with `bash -n` and `shellcheck` before finishing

## CI

`.github/workflows/chezmoi.yml` applies and verifies all three machine types and lints scripts.
