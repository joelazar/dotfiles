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

I use [chezmoi](https://www.chezmoi.io/) to manage shell config, editor settings, package installs, macOS defaults, AI tooling, and a pile of small workflow tweaks that are easy to forget until you lose them. The point is simple: I should be able to set up a new machine, run `chezmoi apply`, and get back to work without rebuilding my environment from memory.

A few quick facts:

- **Platform:** macOS
- **Dotfile manager:** [chezmoi](https://www.chezmoi.io/)
- **Bootstrap path:** [`bootstrap.sh`](bootstrap.sh)
- **First-run automation:** [`run_once_install_packages.sh.tmpl`](.chezmoiscripts/run_once_install_packages.sh.tmpl), [`run_once_settings.sh.tmpl`](.chezmoiscripts/run_once_settings.sh.tmpl), plus `run_onchange_*` scripts for cloning my repos to `~/Code/joelazar` ([`run_onchange_before_clone-repos.sh.tmpl`](.chezmoiscripts/run_onchange_before_clone-repos.sh.tmpl)), default apps, CleanShot, `pmset` sudoers, and Node native module rebuilds
- **Theme:** Catppuccin Mocha across most of the stack
- **Fonts:** Maple Mono / Maple Mono NF

---

## What lives here 📁

| Path                                               | What it contains                                                                                                                   |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [`dot_config/`](dot_config/)                       | App and CLI configuration for tools like Fish, Ghostty, Zed, Yazi, Television, Starship, Mise, Lazygit, pgcli, Wireshark, and more |
| [`dot_pi/`](dot_pi/)                               | Pi agent configuration, prompts, themes, skills, and extension config                                                              |
| [`dot_claude/`](dot_claude/)                       | Claude Code configuration                                                                                                          |
| [`dot_ipython/`](dot_ipython/)                     | IPython profile config                                                                                                             |
| [`private_dot_local/bin/`](private_dot_local/bin/) | Personal utility scripts                                                                                                           |
| [`scripts/`](scripts/)                             | Shared helper scripts used by install/setup flows, including `pi-packages-update`                                                  |
| [`Brewfile`](Brewfile)                             | Homebrew packages, casks, and npm globals                                                                                          |

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

The terminal is [Ghostty](https://ghostty.org/), configured in [`dot_config/ghostty/config`](dot_config/ghostty/config). It uses Catppuccin Mocha, Maple Mono NF, split navigation shortcuts, a huge scrollback buffer, and keybinds to dump the scrollback into an editor or the browser.

### Editors ✍️

I mostly use [Zed](https://zed.dev/) and Neovim.

Zed is configured in [`dot_config/zed/`](dot_config/zed/) with:

- Vim mode and which-key hints
- custom pane and tab navigation
- tuned git panel and inline blame
- Television-powered file and text search tasks
- Yazi and Lazygit tasks wired into the editor
- AI assistant defaults for day-to-day coding work

Neovim lives in a separate repo: [joelazar/nvim-config](https://github.com/joelazar/nvim-config). [`run_onchange_before_clone-repos.sh.tmpl`](.chezmoiscripts/run_onchange_before_clone-repos.sh.tmpl) clones it to `~/Code/joelazar/nvim-config`, and chezmoi symlinks `~/.config/nvim` to that checkout.

### Search, navigation, and file management 🔎

A lot of this setup is about moving around quickly:

- [Yazi](https://yazi-rs.github.io/) for file management via [`dot_config/yazi/`](dot_config/yazi/)
- [fzf](https://github.com/junegunn/fzf), [fd](https://github.com/sharkdp/fd), and [ripgrep](https://github.com/BurntSushi/ripgrep) for fast terminal navigation
- [Eza](https://github.com/eza-community/eza) for directory listings via [`dot_config/eza/`](dot_config/eza/)
- [Television](https://github.com/alexpasmantier/television) with **107 channels** in [`dot_config/television/cable/`](dot_config/television/cable/)

Those Television channels cover far more than files. There are pickers for git branches, worktrees, diffs, repositories, Docker and Kubernetes resources, AWS resources, ports, launchd services, recent files, markdown search, and more.

### Git and GitHub workflow 🌿

Git tooling is a big part of this repo:

- [Lazygit](https://github.com/jesseduffield/lazygit) config in [`dot_config/lazygit/config.yml`](dot_config/lazygit/config.yml)
- [gh-dash](https://github.com/dlvhdr/gh-dash) config in [`dot_config/gh-dash/config.yml`](dot_config/gh-dash/config.yml)
- [gh-repo-man](https://github.com/2kabhishek/gh-repo-man) config in [`dot_config/gh-repo-man/config.yml`](dot_config/gh-repo-man/config.yml)
- `delta` + `diffnav` for readable diffs
- custom scripts for repo cleanup, submodule updates, and recursive repo management

The Lazygit setup includes custom PR commands, conventional commit helpers, GitHub shortcuts, Catppuccin Mocha styling, and delta-powered diff views.

### macOS workflow 🍎

This repo also handles the machine itself, not just terminal tools.

- [AeroSpace](https://github.com/nikitabobko/AeroSpace) tiling window manager config in [`dot_config/aerospace/aerospace.toml`](dot_config/aerospace/aerospace.toml)
- [Karabiner-Elements](https://karabiner-elements.pqrs.org/) keyboard remapping in [`dot_config/private_karabiner/`](dot_config/private_karabiner/), including a `disable_cmd_tab.json` profile
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
- [Pi](https://github.com/earendil-works/pi-mono) in [`dot_pi/`](dot_pi/)
- [llama.cpp](https://github.com/ggml-org/llama.cpp) (`llama-server`) for local models, kept running by a launch agent

Codex and Antigravity CLI are installed from the Brewfile but carry no tracked config. The [`ai-update`](private_dot_local/bin/executable_ai-update) script updates all of these agents plus Pi's local packages.

### Pi agent 🥧

Pi is where most of the custom work happens.

The config in [`dot_pi/agent/`](dot_pi/agent/) includes:

- Catppuccin Mocha theme in [`dot_pi/agent/themes/`](dot_pi/agent/themes/)
- local model definitions in [`dot_pi/agent/models.json`](dot_pi/agent/models.json)
- guardrails for secrets, sensitive files, and permissions in [`dot_pi/agent/extensions/guardrails.json`](dot_pi/agent/extensions/guardrails.json)
- tracked agent settings in [`dot_pi/agent/private_settings.json`](dot_pi/agent/private_settings.json)

Models cycle forward with `ctrl+space` via [`dot_pi/agent/keybindings.json`](dot_pi/agent/keybindings.json). The enabled set lives in `enabledModels` in the managed settings.

### Pi extensions 🧩

My extensions live in their own repos and are wired in through `private_settings.json`.

The `extensions` list loads individual entries from [joelazar/pi-extensions](https://github.com/joelazar/pi-extensions), the personal collection: `sandbox`, `context`, `split-fork`, `spawn`, `commit`, `pr-create`, `cwd-history`, `export-md`, `save-md`, `anthropic-extra`, `web-tools`, `rtk`, `ask-user`, `skill-toggle`, `thinking-back`, `footer`, and `btw`.

The `packages` list pulls in standalone packages:

- [joelazar/pi-tuicr](https://github.com/joelazar/pi-tuicr), review the diff in tuicr and send the comments back to pi
- [joelazar/pi-lazygit](https://github.com/joelazar/pi-lazygit), open lazygit from inside a session
- [joelazar/pi-nvim](https://github.com/joelazar/pi-nvim), open Neovim from inside a session, landing on changed files
- [joelazar/pi-review](https://github.com/joelazar/pi-review), a `/review` and `/end-review` code review workflow
- [joelazar/pi-copy-block](https://github.com/joelazar/pi-copy-block), copy a code block out of the last reply
- third-party: `pi-guardrails`, `visual-explainer`, `pi-claude-code-use`, `session-recall`, and `i-have-adhd`

Only [`dot_pi/agent/extensions/guardrails.json`](dot_pi/agent/extensions/guardrails.json) stays here, since it configures the third-party `pi-guardrails` package rather than an extension of mine.

### Agent skills 🎯

Skills live in a separate repo: [joelazar/skills](https://github.com/joelazar/skills).
The same clone script puts it in `~/Code/joelazar/skills`, and chezmoi symlinks `~/.agents/skills` to that checkout.
`~/.claude/skills` is a symlink to `~/.agents/skills`, so every agent reads the same library.

---

## Package management 📦

Packages are listed in the [`Brewfile`](Brewfile). On first apply, [`run_once_install_packages.sh.tmpl`](.chezmoiscripts/run_once_install_packages.sh.tmpl) takes care of the rest. That script installs the Homebrew bundle, Rust via `rustup`, UV tools, GitHub CLI plugins, Yazi plugins, and Herdr plugins.

Some notable pieces from the current setup:

- Node globals installed by Homebrew bundle `npm` entries: Pi, `gondolin`, `ccusage`, `npm-check`, and `obsidian-headless`
  - `.chezmoiscripts/run_onchange_rebuild-node-native-modules.sh.tmpl` rebuilds native addons (e.g. `better-sqlite3`) of global npm packages whenever the Node ABI changes
- UV tools installed with extra dependencies: `ansible-core` (with `ansible` and `netaddr`), `pgcli` (with Catppuccin styling and `psycopg[binary]`), and `pylatexenc` for inline LaTeX rendering in Neovim
- GitHub CLI plugins `gh-dash` and `gh-repo-man`
- Herdr plugins: Auto Title (tab/pane titles, configured by `private_Library/private_Application Support/herdr-auto-title/config.env`) and `smart-splits.nvim` (linked from the lazy.nvim clone)
- Yazi plugins `toggle-pane`, `smart-filter`, `diff`, `git`, and `ouch`
- Casks for the desktop side: Ghostty, Zed, Raycast, AeroSpace, Karabiner-Elements, 1Password, Obsidian, CleanShot, Claude, Codex, Antigravity CLI, and more

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
- git email and username for work repositories

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

| Script                                                                            | What it does                                                              |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [`ai-update`](private_dot_local/bin/executable_ai-update)                         | Updates Claude Code, Codex, Antigravity CLI, Pi, and Pi local packages    |
| [`custom-update`](private_dot_local/bin/executable_custom-update)                 | Runs broader system and tool updates                                      |
| [`discord-summary`](private_dot_local/bin/executable_discord-summary)             | Summarizes the last 24h of selected Discord channels via kagi             |
| [`fonttest`](private_dot_local/bin/executable_fonttest)                           | Checks terminal font rendering                                            |
| [`formatter`](private_dot_local/bin/executable_formatter)                         | Formats USB drives and SD cards with a `gum` UI                           |
| [`term-tab`](private_dot_local/bin/executable_term-tab)                     | Opens a new Herdr or Ghostty tab in a directory, optionally with a command |
| [`git-repo-manager`](private_dot_local/bin/executable_git-repo-manager)           | Finds git repos recursively and offers interactive actions                |
| [`git-reset`](private_dot_local/bin/executable_git-reset)                         | Resets repos back to their default branch state                           |
| [`git-submodules-update`](private_dot_local/bin/executable_git-submodules-update) | Updates git submodules                                                    |
| [`gitmoji`](private_dot_local/bin/executable_gitmoji)                             | Interactive gitmoji commit helper built on `gum`                          |
| [`gj`](private_dot_local/bin/executable_gj)                                       | Clones repos into a `gj.root`-based directory layout                      |
| [`gwt`](private_dot_local/bin/executable_gwt)                                     | Creates a git worktree for a branch under the `gj` layout                 |
| [`kokoro`](private_dot_local/bin/executable_kokoro)                               | Local text-to-speech via the Kokoro ONNX model                            |
| [`listen-later`](private_dot_local/bin/executable_listen-later)                   | Turns an article, file, or text into a Kokoro-narrated Spotify episode    |
| [`pi`](private_dot_local/bin/executable_pi)                                       | Runs the Pi agent CLI through the mise-managed Node 26 runtime            |
| [`pr-create`](private_dot_local/bin/executable_pr-create)                         | Creates pull requests with a guided interactive prompt                    |
| [`restic-backup`](private_dot_local/bin/executable_restic-backup)                 | Backs up selected dotfiles and configs to `$RESTIC_REPOSITORY` via restic |
| [`restic-maintain`](private_dot_local/bin/executable_restic-maintain)             | Prunes old snapshots from the restic backup repo                          |
| [`restic-mount`](private_dot_local/bin/executable_restic-mount)                   | Mounts the restic repo to browse and copy files                           |
| [`switch-main-display`](private_dot_local/bin/executable_switch-main-display)     | Changes the primary display on multi-monitor setups                       |
| [`toggle-lid-sleep`](private_dot_local/bin/executable_toggle-lid-sleep)           | Raycast script that toggles clamshell sleep                               |
| [`transcribe`](private_dot_local/bin/executable_transcribe)                       | Offline audio/video transcription via whisper.cpp                         |
| [`untilfail`](private_dot_local/bin/executable_untilfail)                         | Repeats a command until it fails                                          |
| [`workspace-tabs`](private_dot_local/bin/executable_workspace-tabs)               | Opens the daily terminal workspace: Obsidian vault in nvim plus gh-dash    |
| [`wtfport`](private_dot_local/bin/executable_wtfport)                             | Shows what is listening on a port and can kill it                         |

The restic scripts share [`private_dot_local/lib/restic-common.sh`](private_dot_local/lib/restic-common.sh). Shared shell helpers used by the setup scripts live in [`scripts/utils`](scripts/utils) and [`scripts/utils_install`](scripts/utils_install).

---

## Theming 🎨

Catppuccin Mocha is the common thread through most of the environment: Ghostty, Tmux, Fish, Yazi, Television, Lazygit, Bat, Btop, Starship, Atuin, Eza, Delta, Fzf, Gh-Dash, K9s, and Zed all use it in one form or another.

Fonts are centered on Maple Mono and Maple Mono NF, including OpenType alternates like `cv02`, `cv05`, `cv61`, and `cv63`.

---

## Acknowledgements 🙏

Some helper functions and setup patterns were originally adapted from [alrra/dotfiles](https://github.com/alrra/dotfiles).

Parts of the Pi setup are also adapted from or inspired by work from:

| Author         | GitHub                                       | Contributions                                                                                     |
| -------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Mario Zechner  | [@badlogic](https://github.com/badlogic)     | Pi itself, plus extensions and skills adapted from the Pi ecosystem, such as `sandbox`            |
| Armin Ronacher | [@mitsuhiko](https://github.com/mitsuhiko)   | Extensions and skills adapted from `agent-stuff`, including `answer`, `context`, and `split-fork` |
| Aliou Diallo   | [@aliou](https://github.com/aliou)           | `pi-guardrails` package                                                                           |
| Nico Bailon    | [@nicobailon](https://github.com/nicobailon) | `visual-explainer` package                                                                        |

---

## License 📄

This repository is available under the [MIT license](LICENSE).
