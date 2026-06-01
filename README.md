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
- **Profiles:** `private`, `work`, and `workstation`
- **Bootstrap path:** [`bootstrap.sh`](bootstrap.sh)
- **First-run automation:** [`run_once_install_packages.sh.tmpl`](run_once_install_packages.sh.tmpl) and [`run_once_settings.sh.tmpl`](run_once_settings.sh.tmpl)
- **Theme:** Catppuccin Mocha across most of the stack
- **Fonts:** Maple Mono / Maple Mono NF

---

## What lives here 📁

| Path                                                                                                                     | What it contains                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [`dot_config/`](dot_config/)                                                                                             | App and CLI configuration for tools like Fish, Ghostty, Zed, Yazi, Television, Starship, Mise, Lazygit, pgcli, Wireshark, and more          |
| [`dot_pi/`](dot_pi/)                                                                                                     | Pi agent configuration, prompts, themes, modes, and local extensions                                                                        |
| [`dot_agents/`](dot_agents/)                                                                                             | Local skill library organized into `skills/`, `frontend-skills/`, and `python-skills/`, plus `improve-skill` and `skill-creator` meta-tools |
| [`dot_claude/`](dot_claude/)                                                                                             | Claude Code configuration                                                                                                                   |
| [`dot_claude-work/`](dot_claude-work/)                                                                                   | Separate Claude Code profile for work                                                                                                       |
| [`dot_codex/`](dot_codex/)                                                                                               | Codex configuration templates                                                                                                               |
| [`private_dot_local/bin/`](private_dot_local/bin/)                                                                       | Personal utility scripts                                                                                                                    |
| [`scripts/`](scripts/)                                                                                                   | Shared helper scripts used by install/setup flows, including `pi-packages-update`                                                           |
| [`Brewfile.private`](Brewfile.private), [`Brewfile.work`](Brewfile.work), [`Brewfile.workstation`](Brewfile.workstation) | Package sets by machine type                                                                                                                |

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

The terminal is [Ghostty](https://ghostty.org/), configured in [`dot_config/ghostty/config`](dot_config/ghostty/config). It uses Catppuccin Mocha, Maple Mono NF, split navigation shortcuts, a huge scrollback buffer, and a top-mounted quick terminal.

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
- [fzf](https://github.com/junegunn/fzf), [fd](https://github.com/sharkdp/fd), and [ripgrep](https://github.com/BurntSushi/ripgrep) for fast terminal navigation
- [Eza](https://github.com/eza-community/eza) for directory listings via [`dot_config/eza/`](dot_config/eza/)
- [Television](https://github.com/alexpasmantier/television) with **97 channels** in [`dot_config/television/cable/`](dot_config/television/cable/)

Those Television channels cover far more than files. There are pickers for git branches, worktrees, diffs, repositories, Docker and Kubernetes resources, AWS resources, ports, launchd services, recent files, markdown search, and more.

### Git and GitHub workflow 🌿

Git tooling is a big part of this repo:

- [Lazygit](https://github.com/jesseduffield/lazygit) config in [`private_Library/private_Application Support/lazygit/config.yml`](private_Library/private_Application%20Support/lazygit/config.yml)
- [gh-dash](https://github.com/dlvhdr/gh-dash) config in [`dot_config/gh-dash/config.yml`](dot_config/gh-dash/config.yml)
- [gh-repo-man](https://github.com/2kabhishek/gh-repo-man) config in [`dot_config/gh-repo-man/config.yml`](dot_config/gh-repo-man/config.yml)
- `delta` + `diffnav` for readable diffs
- custom scripts for repo cleanup, worktree creation, and recursive repo management

The Lazygit setup includes custom PR commands, conventional commit helpers, GitHub shortcuts, Catppuccin Mocha styling, and delta-powered diff views.

### macOS workflow 🍎

This repo also handles the machine itself, not just terminal tools.

- [AeroSpace](https://github.com/nikitabobko/AeroSpace) tiling window manager config in [`dot_aerospace.toml`](dot_aerospace.toml)
- [Karabiner-Elements](https://karabiner-elements.pqrs.org/) keyboard remapping in [`dot_config/private_karabiner/`](dot_config/private_karabiner/), including a `disable_cmd_tab.json` profile
- macOS defaults and shell/editor bootstrapping in [`run_once_settings.sh.tmpl`](run_once_settings.sh.tmpl)
- launch agents in [`private_Library/LaunchAgents/`](private_Library/LaunchAgents/)
- app defaults, file associations, Dock behavior, keyboard repeat, Touch ID for `sudo`, and similar setup tasks

AeroSpace is set up with workspace assignments, vim-style focus movement, resize modes, and app launch shortcuts for tools I use constantly.

---

## AI and coding-agent setup 🤖

A lot of this repo is devoted to AI-assisted development. That part has grown quite a bit.

### Agent clients and configs 🛠️

This repo currently tracks config for:

- [Claude Code](https://docs.anthropic.com/en/docs/build-with-claude/claude-code) in [`dot_claude/`](dot_claude/)
- a separate Claude work profile in [`dot_claude-work/`](dot_claude-work/)
- [Pi](https://github.com/mariozechner/pi-coding-agent) in [`dot_pi/`](dot_pi/)
- [Codex](https://github.com/openai/codex) templates in [`dot_codex/`](dot_codex/)
- [Ollama](https://ollama.com/) for local models

There is also a small helper script, [`ai-update`](private_dot_local/bin/executable_ai-update), that updates the main CLI agents and Pi extensions.

### Pi agent 🥧

Pi is where most of the custom work happens.

The config in [`dot_pi/agent/`](dot_pi/agent/) includes:

- Catppuccin Mocha theme
- local model definitions in [`dot_pi/agent/models.json`](dot_pi/agent/models.json)
- path blocking for secrets and sensitive files in [`dot_pi/agent/path-policy.json`](dot_pi/agent/path-policy.json)
- prompt templates in [`dot_pi/agent/prompts/`](dot_pi/agent/prompts/)
- a managed settings modifier in [`dot_pi/agent/modify_private_settings.json`](dot_pi/agent/modify_private_settings.json)

Models are switched with Pi's built-in selector, bound to `ctrl+space` via [`dot_pi/agent/keybindings.json`](dot_pi/agent/keybindings.json). The enabled set lives in `enabledModels` in the managed settings.

### Local Pi extensions 🧩

There are **9 local Pi extensions** in [`dot_pi/agent/extensions/`](dot_pi/agent/extensions/). The ones I rely on most are:

- `default-tools` to enable `grep` and `find` by default
- `lazygit` and `ghostty` integrations
- `path-policy`, `permission-gate`, and `sandbox` for guardrails
- `todos`, `loop`, `session-breakdown`, and `auto-session-name` for session management
- `uv` to steer Python workflows toward `uv`
- `whimsical` for diagram generation

### Local skills 🎯

The skill library under [`dot_agents/`](dot_agents/) uses the `skills` CLI's global lock file, tracked as [`dot_agents/dot_skill-lock.json`](dot_agents/dot_skill-lock.json) and applied to `~/.agents/.skill-lock.json`.

Local skills live under [`dot_agents/skills/`](dot_agents/skills/). Remote skills are tracked in the lock file and updated with `skills update -g`.

Two meta-tools, `improve-skill` and `skill-creator`, live at the `dot_agents/` level. They're for building and evaluating new skills rather than using them directly.

---

## Package management 📦

Package installation is split by machine type:

- [`Brewfile.private`](Brewfile.private)
- [`Brewfile.work`](Brewfile.work)
- [`Brewfile.workstation`](Brewfile.workstation)

On first apply, [`run_once_install_packages.sh.tmpl`](run_once_install_packages.sh.tmpl) takes care of the rest. That script installs Homebrew packages, Bun globals, Go tools, UV tools, GitHub CLI plugins, Yazi plugins, and a few extra utilities.

Some notable pieces from the current setup:

- Bun packages for Pi, Codex usage tooling, Defuddle, Obsidian automation, and Google Workspace CLI access
- UV-managed tools such as `gitingest`, `pylatexenc`, and `nginx-language-server`
- GitHub CLI plugins like `gh-dash`, `gh-repo-man`, and `gh-markdown-preview`
- Casks: Helium browser, Karabiner-Elements, Inkscape, Grafana

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

There is also a local Pi extension in [`.pi/extensions/chezmoi-auto-apply/`](.pi/extensions/chezmoi-auto-apply/) that automatically runs `chezmoi apply` after agent-driven edits in this repo.

---

## Custom scripts 🧑‍💻

Most of the personal helpers live in [`private_dot_local/bin/`](private_dot_local/bin/).

| Script                                                                        | What it does                                                               |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`agent-md`](private_dot_local/bin/executable_agent-md)                       | Creates or fixes `AGENTS.md` / `CLAUDE.md` files for coding-agent projects |
| [`ai-update`](private_dot_local/bin/executable_ai-update)                     | Updates Claude Code, Codex, Pi, and Pi extensions                          |
| [`backup`](private_dot_local/bin/executable_backup)                           | Encrypted backups with `restic` and `age`                                  |
| [`cht`](private_dot_local/bin/executable_cht)                                 | Quick cheat-sheet lookup via cht.sh                                        |
| [`custom-update`](private_dot_local/bin/executable_custom-update)             | Runs broader system and tool updates                                       |
| [`fonttest`](private_dot_local/bin/executable_fonttest)                       | Checks terminal font rendering                                             |
| [`formatter`](private_dot_local/bin/executable_formatter)                     | Formats USB drives and SD cards with a `gum` UI                            |
| [`git-repo-manager`](private_dot_local/bin/executable_git-repo-manager)       | Finds git repos recursively and offers interactive actions                 |
| [`git-reset`](private_dot_local/bin/executable_git-reset)                     | Resets repos back to their default branch state                            |
| [`git-worktree-new`](private_dot_local/bin/executable_git-worktree-new)       | Creates sibling worktrees for the current repo                             |
| [`init-windows`](private_dot_local/bin/executable_init-windows)               | Opens my usual app set for a work session                                  |
| [`obsidian-update`](private_dot_local/bin/executable_obsidian-update)         | Triggers Obsidian plugin and theme updates across vaults                   |
| [`pr-create`](private_dot_local/bin/executable_pr-create)                     | Creates pull requests with a guided interactive prompt                     |
| [`switch-main-display`](private_dot_local/bin/executable_switch-main-display) | Changes the primary display on multi-monitor setups                        |
| [`transfer`](private_dot_local/bin/executable_transfer)                       | Uploads files through transfer.sh                                          |
| [`untilfail`](private_dot_local/bin/executable_untilfail)                     | Repeats a command until it fails                                           |
| [`update-submodules`](private_dot_local/bin/executable_update-submodules)     | Updates git submodules                                                     |
| [`wtfport`](private_dot_local/bin/executable_wtfport)                         | Shows what is listening on a port and can kill it                          |

Shared shell helpers used by the setup scripts live in [`scripts/utils`](scripts/utils) and [`scripts/utils_install`](scripts/utils_install).

---

## Theming 🎨

Catppuccin Mocha is the common thread through most of the environment: Ghostty, Tmux, Fish, Yazi, Television, Lazygit, Bat, Btop, Starship, Atuin, Eza, Delta, Fzf, Gh-Dash, K9s, and Zed all use it in one form or another.

Fonts are centered on Maple Mono and Maple Mono NF, including OpenType alternates like `cv02`, `cv05`, `cv61`, and `cv63`.

---

## Acknowledgements 🙏

Some helper functions and setup patterns were originally adapted from [alrra/dotfiles](https://github.com/alrra/dotfiles).

Parts of the Pi setup are also adapted from or inspired by work from:

| Author          | GitHub                                       | Contributions                                                                                                                                                                                                                       |
| --------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mario Zechner   | [@badlogic](https://github.com/badlogic)     | Pi itself, plus extensions and skills adapted from the Pi ecosystem, including `antigravity-image-gen`, `editor-with-context`, `notify`, `permission-gate`, `sandbox`, `session-name`, and `youtube-transcript`-related work        |
| Armin Ronacher  | [@mitsuhiko](https://github.com/mitsuhiko)   | Extensions and skills adapted from `agent-stuff`, including `answer`, `context`, `loop`, `prompt-editor`, `session-breakdown`, `todos`, `whimsical`, `frontend-design`, `github`, `humanizer`, `summarize`, `uv`, and `web-browser` |
| Daniel Griesser | [@HazAT](https://github.com/HazAT)           | `ghostty` extension from `pi-ghostty`                                                                                                                                                                                               |
| Fero            | [@ferologics](https://github.com/ferologics) | `session-analyzer` skill from the Pi skills ecosystem                                                                                                                                                                               |

---

## License 📄

This repository is available under the [MIT license](LICENSE).
