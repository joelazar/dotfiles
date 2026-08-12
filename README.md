# [joelazar](https://github.com/joelazar)'s dotfiles 🚀

## Screenshots 🖼️

### [Wallpaper](https://unsplash.com/photos/hot-air-balloons-during-daytime-JiLTJODH5j4) + [Raycast](https://www.raycast.com/) 🖌️

![joedotfiles - wallpaper+raycast](https://github.com/user-attachments/assets/d6a13e1c-9266-407d-9342-976b9ec99e40)

### Neovim with [my custom config](https://github.com/joelazar/nvim-config) 📝

![joedotfiles - neovim](https://github.com/user-attachments/assets/b1f074d8-afb9-46eb-a75d-6d7e9837b565)

### [Eza](https://github.com/eza-community/eza) + [fzf](https://github.com/junegunn/fzf) 📂🔍

![joedotfiles - eza+fzf](https://github.com/user-attachments/assets/9f991e04-a29d-411d-a88e-b039e4b69179)

### [Lazygit](https://github.com/jesseduffield/lazygit) 🦥🌱

![joedotfiles - lazygit](https://github.com/user-attachments/assets/45fbe8ec-f124-4c64-9a17-64123076993f)

### [Zen browser](https://zen-browser.app/) 🧘‍♀️

![joedotfiles - zen](https://github.com/user-attachments/assets/bdd31b4c-c3e2-4267-8675-871ec7266585)

### [Zed](https://zed.dev/) 📝

![joedotfiles - zed](https://github.com/user-attachments/assets/7b08edeb-661a-4548-bfab-18ffc43b273e)

---

## Overview 🧰

This repo is the source of truth for my macOS setup.

I use [chezmoi](https://www.chezmoi.io/) to manage shell config, editor settings, package installs, macOS defaults, AI tooling, and a pile of small wo [... omitted end of long line]

A few quick facts:

- **Platform:** macOS
- **Dotfile manager:** [chezmoi](https://www.chezmoi.io/)
- **Profiles:** `private`, `work`, and `workstation`
- **Bootstrap path:** [`bootstrap.sh`](bootstrap.sh)
- **First-run automation:** [`run_once_install_packages.sh.tmpl`](.chezmoiscripts/run_once_install_packages.sh.tmpl) and [`run_once_settings.sh.tmpl`] [... omitted end of long line]
- **Theme:** Catppuccin Mocha across most of the stack
- **Fonts:** Maple Mono / Maple Mono NF

---

## What lives here 📁

| Path                                                                                                                     | What it contains          [... omitted end of long line]
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------- [... omitted end of long line]
| [`dot_config/`](dot_config/)                                                                                             | App and CLI configuration [... omitted end of long line]
| [`dot_pi/`](dot_pi/)                                                                                                     | Pi agent configuration, p [... omitted end of long line]
| [`dot_agents/`](dot_agents/)                                                                                             | Local skill library in `s [... omitted end of long line]
| [`dot_claude/`](dot_claude/)                                                                                             | Claude Code configuration [... omitted end of long line]
| [`dot_codex/`](dot_codex/)                                                                                               | Codex configuration templ [... omitted end of long line]
| [`dot_ipython/`](dot_ipython/)                                                                                           | IPython profile config    [... omitted end of long line]
| [`private_dot_local/bin/`](private_dot_local/bin/)                                                                       | Personal utility scripts  [... omitted end of long line]
| [`scripts/`](scripts/)                                                                                                   | Shared helper scripts use [... omitted end of long line]
| [`Brewfile.private`](Brewfile.private), [`Brewfile.work`](Brewfile.work), [`Brewfile.workstation`](Brewfile.workstation) | Package sets by machine t [... omitted end of long line]

---

## Highlights ✨

### Shell and terminal 🐚

My day-to-day shell is Fish, with config in [`dot_config/private_fish/`](dot_config/private_fish/).

That setup includes:

- vi-style key bindings
- [Starship](https://starship.rs/) prompt with `mise`, `sudo`, and Yazi indicators via [`dot_config/starship.toml`](dot_config/starship.toml)
- [Atuin](https://github.com/atuinsh/atuin) for history
- [Zoxide](https://github.com/ajeetdsouza/zoxide) for smarter directory jumping
- [Mise](https://mise.jdx.dev/) for runtime management via [`dot_config/mise/config.toml`](dot_config/mise/config.toml)
- [Television](https://github.com/alexpasmantier/television) shell integration so `Ctrl+T` opens context-aware pickers instead of a generic file list

The terminal is [Ghostty](https://ghostty.org/), configured in [`dot_config/ghostty/config`](dot_config/ghostty/config). It uses Catppuccin Mocha, Map [... omitted end of long line]

### Editors ✍️

I mostly use [Zed](https://zed.dev/) and Neovim.

Zed is configured in [`dot_config/zed/`](dot_config/zed/) with:

- Vim mode and which-key hints
- custom pane and tab navigation
- tuned git panel and inline blame
- Television-powered file and text search tasks
- Yazi and Lazygit tasks wired into the editor
- AI assistant defaults for day-to-day coding work

Neovim lives in a separate repo: [joelazar/nvim-config](https://github.com/joelazar/nvim-config). This repo bootstraps it during first-run setup.

### Search, navigation, and file management 🔎

A lot of this setup is about moving around quickly:

- [Yazi](https://yazi-rs.github.io/) for file management via [`dot_config/yazi/`](dot_config/yazi/)
- [fzf](https://github.com/junegunn/fzf), [fd](https://github.com/sharkdp/fd), and [ripgrep](https://github.com/BurntSushi/ripgrep) for fast terminal  [... omitted end of long line]
- [Eza](https://github.com/eza-community/eza) for directory listings via [`dot_config/eza/`](dot_config/eza/)
- [Television](https://github.com/alexpasmantier/television) with **105 channels** in [`dot_config/television/cable/`](dot_config/television/cable/)

Those Television channels cover far more than files. There are pickers for git branches, worktrees, diffs, repositories, Docker and Kubernetes resourc [... omitted end of long line]

### Git and GitHub workflow 🌿

Git tooling is a big part of this repo:

- [Lazygit](https://github.com/jesseduffield/lazygit) config in [`dot_config/lazygit/config.yml`](dot_config/lazygit/config.yml)
- [gh-dash](https://github.com/dlvhdr/gh-dash) config in [`dot_config/gh-dash/config.yml`](dot_config/gh-dash/config.yml)
- [gh-repo-man](https://github.com/2kabhishek/gh-repo-man) config in [`dot_config/gh-repo-man/config.yml`](dot_config/gh-repo-man/config.yml)
- `delta` + `diffnav` for readable diffs
- custom scripts for repo cleanup, worktree creation, and recursive repo management

The Lazygit setup includes custom PR commands, conventional commit helpers, GitHub shortcuts, Catppuccin Mocha styling, and delta-powered diff views.

### macOS workflow 🍎

This repo also handles the machine itself, not just terminal tools.

- [AeroSpace](https://github.com/nikitabobko/AeroSpace) tiling window manager config in [`dot_config/aerospace/aerospace.toml`](dot_config/aerospace/a [... omitted end of long line]
- [Karabiner-Elements](https://karabiner-elements.pqrs.org/) keyboard remapping in [`dot_config/private_karabiner/`](dot_config/private_karabiner/), i [... omitted end of long line]
- macOS defaults and shell/editor bootstrapping in [`run_once_settings.sh.tmpl`](.chezmoiscripts/run_once_settings.sh.tmpl)
- launch agents in [`private_Library/LaunchAgents/`](private_Library/LaunchAgents/)
- app defaults, file associations, Dock behavior, keyboard repeat, Touch ID for `sudo`, and similar setup tasks

AeroSpace is set up with workspace assignments, vim-style focus movement, resize modes, and app launch shortcuts for tools I use constantly.

---

## AI and coding-agent setup 🤖

A lot of this repo is devoted to AI-assisted development. That part has grown quite a bit.

### Agent clients and configs 🛠️

This repo currently tracks config for:

- [Claude Code](https://docs.anthropic.com/en/docs/build-with-claude/claude-code) in [`dot_claude/`](dot_claude/)
- [Pi](https://github.com/mariozechner/pi-coding-agent) in [`dot_pi/`](dot_pi/)
- [Codex](https://github.com/openai/codex) templates in [`dot_codex/`](dot_codex/)
- [llama.cpp](https://github.com/ggml-org/llama.cpp) (`llama-server`) for local models

There is also a small helper script, [`ai-update`](private_dot_local/bin/executable_ai-update), that updates the main CLI agents and Pi extensions.

### Pi agent 🥧

Pi is where most of the custom work happens.

The config in [`dot_pi/agent/`](dot_pi/agent/) includes:

- Catppuccin Mocha theme in [`dot_pi/agent/themes/`](dot_pi/agent/themes/)
- local model definitions in [`dot_pi/agent/models.json`](dot_pi/agent/models.json)
- guardrails for secrets, sensitive files, and permissions in [`dot_pi/agent/extensions/guardrails.json`](dot_pi/agent/extensions/guardrails.json)
- a managed settings modifier in [`dot_pi/agent/modify_private_settings.json`](dot_pi/agent/modify_private_settings.json) that tracks shared keys whil [... omitted end of long line]

Models cycle forward with `ctrl+space` via [`dot_pi/agent/keybindings.json`](dot_pi/agent/keybindings.json). The enabled set lives in `enabledModels`  [... omitted end of long line]

### Local Pi extensions 🧩

There are **12 local Pi extensions** in [`dot_pi/agent/extensions/`](dot_pi/agent/extensions/). The ones I rely on most are:

- `lazygit` integration
- `sandbox` and the `guardrails.json` config for policy and permission control
- `answer`, `context`, and `split-fork` for session and context handling
- `commit` and `pr-create` for git and GitHub workflows
- `copy-command`, `cwd-history`, and `export-md` for everyday shortcuts
- `project-trust` and `anthropic-extra` for provider and trust setup
- `private_rtk.ts`, which rewrites bash commands through `rtk` to save tokens

### Agent skills 🎯

Skills are no longer tracked here. They live in a dedicated repo,
[`joelazar/skills`](https://github.com/joelazar/skills), which symlinks itself to
`~/.agents/skills` via its own `install.sh`. `~/.claude/skills` is a symlink to that
path, so every agent reads the same library.

---

## Package management 📦

Package installation is split by machine type:

- [`Brewfile.private`](Brewfile.private)
- [`Brewfile.work`](Brewfile.work)
- [`Brewfile.workstation`](Brewfile.workstation)

On first apply, [`run_once_install_packages.sh.tmpl`](.chezmoiscripts/run_once_install_packages.sh.tmpl) takes care of the rest. That script installs  [... omitted end of long line]

Some notable pieces from the current setup:

- Node globals managed by mise through [`dot_default-npm-packages`](dot_default-npm-packages): Pi, `gondolin`, `ccusage`, `defuddle`, `npm-check`, `ob [... omitted end of long line]
- UV tools installed with extra dependencies: `ansible-core` (with `ansible` and `netaddr`) and `pgcli` (with Catppuccin styling and `psycopg[binary]` [... omitted end of long line]
- GitHub CLI plugins `gh-dash` and `gh-repo-man`
- Casks vary by machine type, for example Karabiner-Elements, plus Helium browser and Inkscape on the work profile

---

## Setup ⚡

### Fresh machine 🆕

If Homebrew and chezmoi are not installed yet, start with:

```sh
curl -sSL https://raw.githubusercontent.com/joelazar/dotfiles/main/bootstrap.sh | bash
```

Or clone locally and run:

```sh
git clone https://github.com/joelazar/dotfiles.git
cd dotfiles
./bootstrap.sh
```

### Existing chezmoi setup 🔧

If you already have Homebrew and chezmoi:

```sh
brew install chezmoi
chezmoi init https://github.com/joelazar/dotfiles.git
chezmoi apply
```

### First-time prompts 💬

During initialization, chezmoi asks for:

- git email
- git username
- machine type: `work`, `private`, or `workstation`

Those values come from [`.chezmoi.toml.tmpl`](.chezmoi.toml.tmpl).

### Important note ⚠️

This repo is the **chezmoi source directory**, not the live destination.

If you edit files here, you need to run:

```sh
chezmoi apply
```

Without that step, your real dotfiles under `$HOME` will not change.

---

## Day-to-day maintenance 🔁

A few commands I use a lot:

```sh
chezmoi apply            # push source changes into the live home directory
chezmoi diff             # preview what will change
```

---

## Custom scripts 🧑‍💻

Most of the personal helpers live in [`private_dot_local/bin/`](private_dot_local/bin/).

| Script                                                                                  | What it does                                               [... omitted end of long line]
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------- [... omitted end of long line]
| [`agent-md`](private_dot_local/bin/executable_agent-md)                                 | Creates or fixes `AGENTS.md` / `CLAUDE.md` files for codin [... omitted end of long line]
| [`ai-update`](private_dot_local/bin/executable_ai-update)                               | Updates Claude Code, Codex, Pi, and Pi local packages      [... omitted end of long line]
| [`chatterbox`](private_dot_local/bin/executable_chatterbox)                             | Local text-to-speech via the Chatterbox TTS model          [... omitted end of long line]
| [`cht`](private_dot_local/bin/executable_cht)                                           | Quick cheat-sheet lookup via cht.sh                        [... omitted end of long line]
| [`code-snippet.applescript`](private_dot_local/bin/executable_code-snippet.applescript) | Raycast script that wraps selected text in a code block    [... omitted end of long line]
| [`custom-update`](private_dot_local/bin/executable_custom-update)                       | Runs broader system and tool updates                       [... omitted end of long line]
| [`discord-summary`](private_dot_local/bin/executable_discord-summary)                   | Summarizes the last 24h of selected Discord channels via k [... omitted end of long line]
| [`fonttest`](private_dot_local/bin/executable_fonttest)                                 | Checks terminal font rendering                             [... omitted end of long line]
| [`formatter`](private_dot_local/bin/executable_formatter)                               | Formats USB drives and SD cards with a `gum` UI            [... omitted end of long line]
| [`git-repo-manager`](private_dot_local/bin/executable_git-repo-manager)                 | Finds git repos recursively and offers interactive actions [... omitted end of long line]
| [`git-reset`](private_dot_local/bin/executable_git-reset)                               | Resets repos back to their default branch state            [... omitted end of long line]
| [`git-worktree-new`](private_dot_local/bin/executable_git-worktree-new)                 | Creates sibling worktrees for the current repo             [... omitted end of long line]
| [`init-windows`](private_dot_local/bin/executable_init-windows)                         | Opens my usual app set for a work session                  [... omitted end of long line]
| [`kokoro`](private_dot_local/bin/executable_kokoro)                                     | Local text-to-speech via the Kokoro ONNX model             [... omitted end of long line]
| [`listen-later`](private_dot_local/bin/executable_listen-later)                         | Turns an article, file, or text into a Kokoro-narrated Spo [... omitted end of long line]
| [`obsidian-update`](private_dot_local/bin/executable_obsidian-update)                   | Triggers Obsidian plugin and theme updates across vaults   [... omitted end of long line]
| [`pi`](private_dot_local/bin/executable_pi)                                             | Runs the Pi agent CLI through the mise-managed Node 24 run [... omitted end of long line]
| [`pr-create`](private_dot_local/bin/executable_pr-create)                               | Creates pull requests with a guided interactive prompt     [... omitted end of long line]
| [`restic-backup`](private_dot_local/bin/executable_restic-backup)                       | Backs up selected dotfiles and configs to `$RESTIC_REPOSIT [... omitted end of long line]
| [`restic-maintain`](private_dot_local/bin/executable_restic-maintain)                   | Prunes old snapshots from the restic backup repo           [... omitted end of long line]
| [`skills-invocation`](private_dot_local/bin/executable_skills-invocation)               | Re-applies the skill invocation policy after `skills updat [... omitted end of long line]
| [`switch-main-display`](private_dot_local/bin/executable_switch-main-display)           | Changes the primary display on multi-monitor setups        [... omitted end of long line]
| [`transcribe`](private_dot_local/bin/executable_transcribe)                             | Offline audio/video transcription via whisper.cpp          [... omitted end of long line]
| [`transfer`](private_dot_local/bin/executable_transfer)                                 | Uploads files through transfer.sh                          [... omitted end of long line]
| [`untilfail`](private_dot_local/bin/executable_untilfail)                               | Repeats a command until it fails                           [... omitted end of long line]
| [`update-submodules`](private_dot_local/bin/executable_update-submodules)               | Updates git submodules                                     [... omitted end of long line]
| [`wtfport`](private_dot_local/bin/executable_wtfport)                                   | Shows what is listening on a port and can kill it          [... omitted end of long line]

Shared shell helpers used by the setup scripts live in [`scripts/utils`](scripts/utils) and [`scripts/utils_install`](scripts/utils_install).

---

## Theming 🎨

Catppuccin Mocha is the common thread through most of the environment: Ghostty, Tmux, Fish, Yazi, Television, Lazygit, Bat, Btop, Starship, Atuin, Eza [... omitted end of long line]

Fonts are centered on Maple Mono and Maple Mono NF, including OpenType alternates like `cv02`, `cv05`, `cv61`, and `cv63`.

---

## Acknowledgements 🙏

Some helper functions and setup patterns were originally adapted from [alrra/dotfiles](https://github.com/alrra/dotfiles).

Parts of the Pi setup are also adapted from or inspired by work from:

| Author         | GitHub                                       | Contributions                                                                        [... omitted end of long line]
| -------------- | -------------------------------------------- | ------------------------------------------------------------------------------------ [... omitted end of long line]
| Mario Zechner  | [@badlogic](https://github.com/badlogic)     | Pi itself, plus extensions and skills adapted from the Pi ecosystem, such as `sandbo [... omitted end of long line]
| Armin Ronacher | [@mitsuhiko](https://github.com/mitsuhiko)   | Extensions and skills adapted from `agent-stuff`, including `answer`, `context`, and [... omitted end of long line]
| Aliou Diallo   | [@aliou](https://github.com/aliou)           | `pi-guardrails` and `pi-processes` packages                                          [... omitted end of long line]
| Fero           | [@ferologics](https://github.com/ferologics) | `session-analyzer` skill from the Pi skills ecosystem                                [... omitted end of long line]

---

## License 📄

This repository is available under the [MIT license](LICENSE).
