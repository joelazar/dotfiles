# [joelazar](https://github.com/joelazar)'s dotfiles 🚀

## Screenshots 🖼️

### [Wallpaper](https://unsplash.com/photos/hot-air-balloons-during-daytime-JiLTJODH5j4) + [Raycast](https://www.raycast.com/) 🖌️

![joedotfiles - wallpaper+raycast](https://github.com/user-attachments/assets/d6a13e1c-9266-407d-9342-976b9ec99e40)

### Neovim with [my custom config](https://github.com/joelazar/nvim-config) 📝

![joedotfiles - neovim](https://github.com/user-attachments/assets/b1f074d8-afb9-46eb-a75d-6d7e9837b565)

### [Eza](https://github.com/eza-community/eza) + [FZF](https://github.com/junegunn/fzf) 📂🔍

![joedotfiles - eza+fzf](https://github.com/user-attachments/assets/9f991e04-a29d-411d-a88e-b039e4b69179)

### [Lazygit](https://github.com/jesseduffield/lazygit) 🦥🌱

![joedotfiles - lazygit](https://github.com/user-attachments/assets/45fbe8ec-f124-4c64-9a17-64123076993f)

### [Zen browser](https://zen-browser.app/) 🧘‍♀️

![joedotfiles - zen](https://github.com/user-attachments/assets/bdd31b4c-c3e2-4267-8675-871ec7266585)

### [Zed](https://zed.dev/) 📝

![joedotfiles - zed](https://github.com/user-attachments/assets/7b08edeb-661a-4548-bfab-18ffc43b273e)

---

## Overview 🧰

These are my personal dotfiles for macOS, managed with [chezmoi](https://github.com/twpayne/chezmoi). They automate the setup and configuration of my development environment, including shell, editors, CLI tools, and GUI apps.

### Key Features ✨

- **Automated setup** with `chezmoi`, [`bootstrap.sh`](bootstrap.sh), and [`run_once_install_packages.sh`](run_once_install_packages.sh.tmpl)
- **Consistent theming** (Tokyo Night everywhere)
- **Modern CLI utilities** for navigation, search, and productivity
- **Editor and terminal integration** (Neovim, Zed, Ghostty)
- **Rich shell experience** (Fish, Starship, Atuin, Direnv, Television)
- **Developer tooling** for Python, Go, Rust, Node.js, Docker, Kubernetes, and more
- **AI/LLM integration** (Claude Code, Pi Agent, Gemini, Codex, and local models via Ollama)
- **Window management** with AeroSpace tiling WM

---

## Notable Tools & Configurations 🛠️

### [Zed](https://zed.dev/) 🦋

- **Config:** See [`dot_config/zed/private_settings.json`](dot_config/zed/private_settings.json), [`private_keymap.json`](dot_config/zed/private_keymap.json), and [`tasks.json`](dot_config/zed/tasks.json)
- **Features:**
  - Modern, collaborative code editor with Vim mode enabled
  - Custom keybindings for navigation, pane management, and Git integration
  - Integrated terminal with custom font and environment variables
  - LSP support for Python, Go, Bash, Helm, Ansible, Markdown, etc.
  - Custom tasks for running tests, scripts, and tools like `lazygit` and `yazi`
  - Snippet support for JavaScript, TypeScript, and TSX
  - Theming: Tokyo Night, VSCode Icons (Dark)
  - File/folder exclusions for performance
  - AI/LLM agent integration (Anthropic, OpenAI, DeepSeek, Ollama, etc.)
  - Edit predictions via Copilot/Mercury

### [Yazi](https://yazi-rs.github.io/) 🦆

- **Config:** See [`dot_config/yazi/`](dot_config/yazi/)
- **Features:**
  - Fast, TUI file manager with preview and plugin support
  - Custom keymaps for diffing, toggling preview panes, smart filtering, archiving, and image rotation/conversion (PNG/JPEG)
  - Opener rules for editing, browsing, extracting, and playing files (including IINA for video)
  - Plugins for Git integration, diff, compress, and more
  - Theming: Tokyo Night flavor
  - Integration with `$EDITOR` and `$BROWSER` environment variables

### [Fish Shell](https://fishshell.com/) 🐟

- **Config:** See [`dot_config/private_fish/`](dot_config/private_fish/)
- **Features:**
  - Vi key bindings, custom greeting, and prompt (Starship)
  - Extensive aliases for Git, Docker, Kubernetes, OpenTofu, and more
  - Custom PATH setup for Homebrew, Go, Node, Python, Rust, Antigravity, etc.
  - Plugin management via Fisher (`fish_plugins`)
  - FZF integration with advanced keybindings and preview commands
  - Atuin for shell history, Direnv for project environments, Zoxide for smart `cd`
  - Television shell integration for smart autocomplete (Ctrl+T triggers contextual channels)
  - Custom functions (e.g., `ssh-tunnel`, `yy` for Yazi directory jumping, `diff` with diffnav, `fido2` for FIDO2 file encryption)

### [Neovim](https://neovim.io/) 🥷

- **Config:** [joelazar/nvim-config](https://github.com/joelazar/nvim-config)
- **Features:**
  - Lua-based configuration
  - Integrated with system clipboard, LSP, Treesitter, and more
  - Custom keybindings and plugins for productivity
  - Used as default editor and man pager

### [Lazygit](https://github.com/jesseduffield/lazygit) & [Lazydocker](https://github.com/jesseduffield/lazydocker) 🦥🐳

- **Config:** See [`private_Library/private_Application Support/lazygit/config.yml`](private_Library/private_Application%20Support/lazygit/config.yml) and [`lazydocker/config.yml`](private_Library/private_Application%20Support/jesseduffield/lazydocker/config.yml)
- **Features:**
  - Tokyo Night themed UI with rounded borders and nerd font icons
  - Custom keybindings for branch management, PR creation, GitHub integration, and more
  - Integration with `delta` for syntax-highlighted diffs (including side-by-side mode)
  - Custom commands for common workflows
  - Hunk mode staging view

### [Ghostty](https://ghostty.app/) 👻

- **Config:** See [`dot_config/ghostty/config`](dot_config/ghostty/config)
- **Features:**
  - GPU-accelerated terminal emulator
  - Maple Mono NF font with custom ligature features
  - Tokyo Night theme
  - Quick terminal (drop-down from top), hidden window buttons
  - Custom keybindings for splits and navigation
  - Integration with Fish shell
  - Massive scrollback buffer (1B lines)

### [Television](https://github.com/alexpasmantier/television) 📺

- **Config:** See [`dot_config/television/`](dot_config/television/)
- **Features:**
  - Blazing fast TUI fuzzy finder with preview support
  - Tokyo Night theme
  - 80+ custom cable channels for: files, dirs, git (branches, log, diff, stash, worktrees, submodules, repos), Docker (containers, images, volumes, networks, compose), Kubernetes (pods, deployments, services, contexts), AWS (S3, EC2, RDS, ElastiCache, Secrets Manager), SSH hosts, todo comments, and much more
  - Shell integration with Fish: context-aware autocomplete (e.g., `git checkout` → branches, `cd` → dirs, `ssh` → hosts)
  - Custom actions per channel (edit, open, delete, etc.)

### [AeroSpace](https://github.com/nikitabobko/AeroSpace) 🪟

- **Config:** See [`dot_aerospace.toml`](dot_aerospace.toml)
- **Features:**
  - Tiling window manager for macOS (i3-like)
  - Workspace assignments for apps (e.g., browsers → 2, Slack/Discord → 4, Signal/Messages → 5)
  - Keyboard-driven window management with `alt` key shortcuts

### [gh-dash](https://github.com/dlvhdr/gh-dash) 📊

- **Config:** See [`dot_config/gh-dash/config.yml`](dot_config/gh-dash/config.yml)
- **Features:**
  - GitHub dashboard for PRs and issues in the terminal
  - Custom sections: my PRs, drafts, review requested, involves me, recently closed
  - Filters for bot PRs (Renovate, Dependabot, GitHub Actions)
  - Custom keybindings: approve, merge, auto-merge, draft toggle, lazygit, diffview
  - Integration with `diffnav` for diff paging

### [Eza](https://github.com/eza-community/eza) 📁

- **Config:** See [`dot_config/eza/theme.yml`](dot_config/eza/theme.yml)
- **Features:**
  - Modern replacement for `ls` with icons, Git status, and colorized output
  - Custom color theme matching Tokyo Night
  - Used in aliases for `ls`, `ll`, etc.

### [Atuin](https://github.com/atuinsh/atuin) 🕰️

- **Config:** See [`dot_config/atuin/config.toml`](dot_config/atuin/config.toml)
- **Features:**
  - Shell history sync and search
  - Session-based filtering for up-arrow history
  - Compact style and custom inline height

### [Starship Prompt](https://starship.rs/) 🌟

- **Config:** See [`dot_config/starship.toml`](dot_config/starship.toml)
- **Features:**
  - Custom prompt symbols and module settings
  - Integration with Direnv, Sudo, Mise, Yazi level indicator, and more
  - Git metrics display

### [Direnv](https://direnv.net/) 🌱

- **Config:** See [`dot_config/direnv/direnv.toml`](dot_config/direnv/direnv.toml)
- **Features:**
  - Automatic loading of `.envrc` and `.env` files for project-specific environments

### [Delta](https://github.com/dandavison/delta) & [Diffnav](https://github.com/dlvhdr/diffnav) 🌈

- **Config:** See [`dot_config/bat/bat.conf`](dot_config/bat/bat.conf) and Git config
- **Features:**
  - `delta` for syntax-highlighted diffs in Git and Lazygit
  - `diffnav` as the default Git diff pager for interactive navigation
  - Custom `diff` Fish function wrapping `diffnav`

### [Btop](https://github.com/aristocratos/btop) 📊

- **Config:** See [`dot_config/btop/btop.conf`](dot_config/btop/btop.conf)
- **Features:**
  - Resource monitor
  - Vim keybindings and detailed graphs

### [fzf](https://github.com/junegunn/fzf) 🔎

- **Config:** See Fish config and custom scripts
- **Features:**
  - Fuzzy finder for files, directories, history, and processes
  - Custom preview commands using `bat` and `eza`
  - Toggle between files/directories/hidden files modes
  - Used in scripts like `rgfzf` for project search

### [Ripgrep](https://github.com/BurntSushi/ripgrep) 🦸

- **Config:** See [`dot_config/ripgrep/config`](dot_config/ripgrep/config)
- **Features:**
  - Fast recursive search with custom ignore rules and color output

### [Fastfetch](https://github.com/fastfetch-cli/fastfetch) ⚡

- **Config:** See [`dot_config/fastfetch/config.conf`](dot_config/fastfetch/config.conf)
- **Features:**
  - Fast system information tool (neofetch alternative)

### [Bruno](https://www.usebruno.com/) 🐶

- **Features:**
  - API client for developers
  - Open-source alternative to Postman
  - Also available as CLI tool (`bruno-cli`)

### [Ice](https://github.com/jordanbaird/Ice) ❄️

- **Features:**
  - Menu bar customization tool for macOS
  - Hide, reorder, or add custom menu bar items
  - Customize appearance and behavior of the menu bar

### [pgcli](https://www.pgcli.com/) 🐘

- **Config:** See [`dot_config/pgcli/config`](dot_config/pgcli/config)
- **Features:**
  - Enhanced Postgres CLI with auto-completion, syntax highlighting, and Vi mode

### [K9s](https://k9scli.io/) ☸️

- **Config:** See [`private_Library/private_Application Support/k9s/`](private_Library/private_Application%20Support/k9s/)
- **Features:**
  - Terminal UI for Kubernetes clusters
  - Custom plugins for viewing logs with `bat`
  - Custom aliases for quick navigation

### [Wireshark](https://www.wireshark.org/) 🦈

- **Config:** See [`dot_config/wireshark/preferences`](dot_config/wireshark/preferences)
- **Features:**
  - Custom font and column setup for packet analysis
  - Telecom-specific settings

### [Harper](https://github.com/elijah-potter/harper) 📝

- **Config:** See [`dot_config/harper/config.toml`](dot_config/harper/config.toml)
- **Features:**
  - Grammar checker LSP used in Zed and Neovim

### [gh-repo-man](https://github.com/2kabhishek/gh-repo-man) 🗂️

- **Config:** See [`dot_config/gh-repo-man/config.yml`](dot_config/gh-repo-man/config.yml)
- **Features:**
  - GitHub CLI extension for managing and cloning repositories
  - Organized by username in `~/Code/` with FZF preview
  - Cached repo lists and README previews

### [Mise](https://mise.jdx.dev/) 🔧

- **Config:** See [`dot_config/mise/config.toml`](dot_config/mise/config.toml)
- **Features:**
  - Dev tool version manager (asdf alternative)
  - Integrated with Starship prompt

---

## AI/LLM Tooling 🤖

A significant part of this setup is dedicated to AI-assisted development:

- **[Claude Code](https://docs.anthropic.com/en/docs/build-with-claude/claude-code)** — Anthropic's CLI coding agent with custom permissions and Wakatime integration
- **[Pi Agent](https://github.com/mariozechner/pi-coding-agent)** — Heavily customized coding agent harness (see detailed section below). Config in [`dot_pi/`](dot_pi/)
- **[Gemini CLI](https://github.com/google-gemini/gemini-cli)** — Google's Gemini from the terminal
- **[Codex](https://github.com/openai/codex)** — OpenAI's coding agent
- **[Ollama](https://ollama.com/)** — Local LLM runner for self-hosted models
- **[`ai-update`](private_dot_local/bin/executable_ai-update)** — Script to keep all AI tools up to date

### [Pi Agent](https://github.com/mariozechner/pi-coding-agent) 🥧

- **Config:** See [`dot_pi/`](dot_pi/)
- **Features:**
  - Multi-provider coding agent TUI with Tokyo Night theme
  - Default model: Claude Opus 4.6 (Anthropic), with Gemini, OpenAI Codex, and local Ollama models enabled
  - Sandbox execution with comprehensive credential/secret path blocking
  - Path policy to guard sensitive files from agent reads/writes
  - Python command interception (`pip`, `poetry`, `python`) → automatically redirected to `uv`
  - Ghostty terminal integration (title, progress bar)
  - Lazygit integration via `/lazygit` command or `Ctrl+G`
  - Desktop notifications on task completion
  - Session naming, session breakdown analysis, and CWD history tracking
  - Sub-agent system with specialized roles (planner, reviewer, scout, worker)

- **Skills:**

  | Skill                | Description                                                            |
  | -------------------- | ---------------------------------------------------------------------- |
  | `frontend-design`    | Design and implement production-ready frontend interfaces              |
  | `github`             | Interact with GitHub using the `gh` CLI (issues, PRs, CI runs, search) |
  | `improve-skill`      | Analyze session transcripts to improve or create skills                |
  | `kagi-search`        | Web search and content extraction via Kagi Search API                  |
  | `session-analyzer`   | Mine session history for automation opportunities                      |
  | `summarize`          | Convert URLs/files (PDF, DOCX, HTML) to Markdown via `markitdown`      |
  | `uv`                 | Use `uv` instead of pip/python/venv for Python workflows               |
  | `web-browser`        | Remote-control Chrome via CDP for web interaction                      |
  | `youtube-transcript` | Fetch YouTube video transcripts for analysis                           |

- **Prompt Templates:**

  | Template           | Description                                                  |
  | ------------------ | ------------------------------------------------------------ |
  | `address-comments` | Get GitHub PR and address all non-resolved review comments   |
  | `catchup`          | Read all changed code in current branch vs default branch    |
  | `clean-gone`       | Clean up git branches marked as `[gone]` (deleted on remote) |
  | `commit`           | Create a git commit                                          |
  | `create-pr`        | Commit, push, and open a PR                                  |
  | `double-check`     | Double-check recent work and look for edge cases             |
  | `explain-codebase` | Scan and explain the whole codebase                          |
  | `search-web`       | Search the web for a given query                             |

- **Extensions:**

  | Extension               | Description                                                       |
  | ----------------------- | ----------------------------------------------------------------- |
  | `antigravity-image-gen` | Image generation via Antigravity models                           |
  | `answer`                | Q&A extraction from assistant responses                           |
  | `commit-shortcut`       | Quick commit shortcut                                             |
  | `cwd-history`           | Track working directory history across sessions                   |
  | `editor-with-context`   | See last agent response when composing prompts                    |
  | `extensions-manager`    | Manage extensions from within Pi                                  |
  | `files`                 | File management utilities                                         |
  | `ghostty`               | Ghostty terminal title and progress bar integration               |
  | `handoff`               | Transfer context to a new focused session                         |
  | `lazygit`               | Open lazygit with `/lazygit` or `Ctrl+G`                          |
  | `loop`                  | Loop/repeat task execution                                        |
  | `notify`                | Desktop notifications on completion                               |
  | `path-policy`           | Block reads/writes to sensitive credential paths                  |
  | `permission-gate`       | Permission gate for dangerous operations                          |
  | `prompt-editor`         | Custom prompt editor with model selector                          |
  | `review`                | Code review (inspired by Codex's review feature)                  |
  | `sandbox`               | Sandboxed execution with network/filesystem restrictions          |
  | `session-breakdown`     | Analyze and summarize session activity                            |
  | `session-name`          | Auto-name sessions                                                |
  | `subagent`              | Delegate to specialized agents (planner, reviewer, scout, worker) |
  | `todos`                 | File-based todo management in `.pi/todos`                         |
  | `uv-intercept`          | Intercept `pip`/`poetry`/`python` → redirect to `uv`              |
  | `whimsical`             | Fun/whimsical messages                                            |

- **Packages:** `pi-interactive-shell` (interactive shell overlay for delegating to sub-agents)

- **Credits:** Many skills and extensions are adapted from or inspired by the work of others:

  | Author          | GitHub                                       | Contributions                                                                                                                                                                                                                                                                                                                                |
  | --------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | Mario Zechner   | [@badlogic](https://github.com/badlogic)     | Pi Agent itself ([pi-mono](https://github.com/badlogic/pi-mono)), extensions (`antigravity-image-gen`, `editor-with-context`, `handoff`, `notify`, `permission-gate`, `sandbox`, `session-name`, `subagent`), skills (`youtube-transcript`, `kagi-search` adapted from `brave-search` in [pi-skills](https://github.com/badlogic/pi-skills)) |
  | Armin Ronacher  | [@mitsuhiko](https://github.com/mitsuhiko)   | Extensions (`answer`, `files`, `loop`, `prompt-editor`, `review`, `session-breakdown`, `todos`, `whimsical`), intercepted commands (`pip`/`poetry`/`python` → `uv`), skills (`frontend-design`, `github`, `summarize`, `uv`, `web-browser`) from [agent-stuff](https://github.com/mitsuhiko/agent-stuff)                                     |
  | Daniel Griesser | [@HazAT](https://github.com/HazAT)           | `ghostty` extension from [pi-ghostty](https://github.com/HazAT/pi-ghostty)                                                                                                                                                                                                                                                                   |
  | Fero            | [@ferologics](https://github.com/ferologics) | `session-analyzer` skill from [pi-skills](https://github.com/ferologics/pi-skills)                                                                                                                                                                                                                                                           |

---

## Package Management 📦

- **Homebrew**: All packages and casks are managed via [`Brewfile.private`](Brewfile.private) and [`Brewfile.work`](Brewfile.work)
- **Bun**: Global JavaScript/TypeScript packages (e.g., `claude-code`, `pi-coding-agent`) installed via [`run_once_install_packages.sh`](run_once_install_packages.sh.tmpl)
- **UV**: Python tool management (e.g., `gitingest`)
- **Go, Rust**: Install scripts for language-specific tools and formatters

---

## Setup Instructions ⚡

### First-time setup (fresh system)

If you're setting up on a completely fresh macOS system without Homebrew or chezmoi:

1. **Run the bootstrap script:**

   ```sh
   curl -sSL https://raw.githubusercontent.com/joelazar/dotfiles/main/bootstrap.sh | bash
   ```

   Or clone and run locally:

   ```sh
   git clone https://github.com/joelazar/dotfiles.git
   cd dotfiles
   ./bootstrap.sh
   ```

   This script will:
   - Install Homebrew (if not present)
   - Install chezmoi via Homebrew
   - Initialize and apply the dotfiles configuration

### Manual setup (if you already have brew and chezmoi)

1. **Install chezmoi** (if not already installed):

   ```sh
   brew install chezmoi
   ```

2. **Initialize dotfiles:**

   ```sh
   chezmoi init https://github.com/joelazar/dotfiles.git
   chezmoi apply
   ```

### Post-installation steps

3. **Install packages:**

   The `run_once_install_packages.sh` script runs automatically on first `chezmoi apply`. It installs Homebrew packages, Bun globals, Go tools, Rust tools, UV tools, and more.

4. **Apply system settings:**

   The `run_once_settings.sh` script also runs automatically, configuring macOS defaults (Dock, Finder, keyboard, trackpad, etc.).

---

## Custom Scripts 🧑‍💻

See [`private_dot_local/bin/`](private_dot_local/bin/) for utility scripts:

| Script                                                                        | Description                                               |
| ----------------------------------------------------------------------------- | --------------------------------------------------------- |
| [`agent-md`](private_dot_local/bin/executable_agent-md)                       | Manage AGENTS.md and CLAUDE.md files for AI coding agents |
| [`ai-update`](private_dot_local/bin/executable_ai-update)                     | Update all AI/LLM CLI tools (Claude, Gemini, Codex, etc.) |
| [`backup`](private_dot_local/bin/executable_backup)                           | Encrypted backup utility using `restic` and `age`         |
| [`cht`](private_dot_local/bin/executable_cht)                                 | Cheat sheet lookup via cht.sh                             |
| [`claude-review`](private_dot_local/bin/executable_claude-review)             | Pre-commit hook for AI code review                        |
| [`custom-update`](private_dot_local/bin/executable_custom-update)             | Update system packages, tools, and configs                |
| [`fonttest`](private_dot_local/bin/executable_fonttest)                       | Test terminal font rendering                              |
| [`formatter`](private_dot_local/bin/executable_formatter)                     | USB & SD card formatting tool with `gum` UI               |
| [`git-repo-manager`](private_dot_local/bin/executable_git-repo-manager)       | Find and manage git repositories recursively              |
| [`git-reset`](private_dot_local/bin/executable_git-reset)                     | Reset repos to default branch and drop local changes      |
| [`git-worktree-new`](private_dot_local/bin/executable_git-worktree-new)       | Create git worktrees alongside current repo               |
| [`obsidian-update`](private_dot_local/bin/executable_obsidian-update)         | Update Obsidian plugins and themes                        |
| [`rgfzf`](private_dot_local/bin/executable_rgfzf)                             | Ripgrep + FZF interactive search                          |
| [`switch-main-display`](private_dot_local/bin/executable_switch-main-display) | Switch primary display on multi-monitor setups            |
| [`transfer`](private_dot_local/bin/executable_transfer)                       | Upload files via transfer.sh                              |
| [`untilfail`](private_dot_local/bin/executable_untilfail)                     | Run a command repeatedly until it fails                   |
| [`update-submodules`](private_dot_local/bin/executable_update-submodules)     | Update all git submodules to latest                       |
| [`wtfport`](private_dot_local/bin/executable_wtfport)                         | Find/kill processes listening on a given port             |

Many scripts use [gum](https://github.com/charmbracelet/gum) for interactive TUI, plus FZF, Bat, and Age for enhanced workflows.

---

## Theming 🎨

- **Tokyo Night** is used consistently across all tools: Ghostty, Zed, Neovim, Lazygit, Yazi, Television, Eza, Bat, Pi Agent, and more.
- **Fonts:** Maple Mono, Maple Mono NF (with custom OpenType features: `cv02`, `cv05`, `cv61`, `cv63`)

---

## Acknowledgements 🙏

- Some utility functions and setup scripts are adapted from [alrra/dotfiles](https://github.com/alrra/dotfiles).

---

## License 📄

The code is available under the [MIT license](LICENSE).
