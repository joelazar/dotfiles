# [joelazar](https://github.com/joelazar)’s dotfiles 🚀

## Screenshots 🖼️

### Wallpaper 🖌️

![joedotfiles - wallpaper](https://github.com/joelazar/dotfiles/assets/16268238/bfa565ef-ebcd-467c-927d-7293a74324b8)

### Neovim with [custom config](https://github.com/joelazar/nvim-config) 📝

![joedotfiles - neovim](https://github.com/joelazar/dotfiles/assets/16268238/9a81f29a-1929-43d7-a87a-ae2da28469d3)

### Eza + FZF 📂🔍

![joedotfiles - eza+fzf](https://github.com/joelazar/dotfiles/assets/16268238/c40498f8-e082-4c21-9b96-c31ed56df758)

### Lazygit 🦥🌱

![joedotfiles - lazygit](https://github.com/joelazar/dotfiles/assets/16268238/d5728557-8192-44ce-a88d-d076827e9f38)

### Firefox + [Vimium](https://addons.mozilla.org/en-US/firefox/addon/vimium-ff/) 🦊⌨️

![joedotfiles - firefox + vimium](https://github.com/joelazar/dotfiles/assets/16268238/b95dfd66-9ee7-42a7-b2c2-76c190ea0a3a)

---

## Overview 🧰

These are my personal dotfiles for macOS, managed with [chezmoi](https://github.com/twpayne/chezmoi). They automate the setup and configuration of my development environment, including shell, editors, CLI tools, and GUI apps.

### Key Features ✨

- **Automated setup** with `chezmoi` and `run_once_install_packages.sh`
- **Consistent theming** (Tokyo Night)
- **Modern CLI utilities** for navigation, search, and productivity
- **Editor and terminal integration** (Neovim, Zed, Ghostty)
- **Rich shell experience** (Fish, Starship, Atuin, Direnv)
- **Developer tooling** for Python, Go, Rust, Node.js, Docker, Kubernetes, and more

---

## Notable Tools & Configurations 🛠️

### [Zed](https://zed.dev/) 🦋

- **Config:** See `dot_config/zed/private_settings.json`, `private_keymap.json`, and `tasks.json`
- **Features:**
  - Modern, collaborative code editor with Vim mode enabled
  - Custom keybindings for navigation, pane management, and Git integration
  - Integrated terminal with custom font and environment variables
  - LSP support for Python, Go, Ansible, Markdown, etc.
  - Custom tasks for running tests, scripts, and tools like `lazygit` and `yazi`
  - Snippet support for JavaScript, TypeScript, and TSX
  - Theming: Tokyo Night, VSCode Icons (Dark)
  - File/folder exclusions for performance
  - AI/LLM integration (OpenAI, Anthropic, DeepSeek, Ollama, etc.)

### [Yazi](https://yazi-rs.github.io/) 🦆

- **Config:** See `dot_config/yazi/`
- **Features:**
  - Fast, TUI file manager with preview and plugin support
  - Custom keymaps for diffing, toggling preview panes, smart filtering, archiving, and image rotation
  - Opener rules for editing, browsing, extracting, and playing files
  - Plugins for Git integration, diff, compress, and more
  - Theming: Tokyo Night flavor
  - Integration with `$EDITOR` and `$BROWSER` environment variables

### [Fish Shell](https://fishshell.com/) 🐟

- **Config:** See `dot_config/private_fish/`
- **Features:**
  - Vi key bindings, custom greeting, and prompt (Starship)
  - Extensive aliases for Git, Docker, Kubernetes, and more
  - Custom PATH setup for Homebrew, Go, Node, Python, Rust, etc.
  - Plugin management via Fisher (`fish_plugins`)
  - FZF integration with advanced keybindings and preview commands
  - Atuin for shell history, Direnv for project environments, Zoxide for smart `cd`
  - Custom functions (e.g., `ssh-tunnel`, `yy` for Yazi directory jumping, `diff` with delta)

### [Neovim](https://neovim.io/) 🥷

- **Config:** [joelazar/nvim-config](https://github.com/joelazar/nvim-config)
- **Features:**
  - Lua-based configuration
  - Integrated with system clipboard, LSP, Treesitter, and more
  - Custom keybindings and plugins for productivity
  - Used as default editor and man pager

### [Lazygit](https://github.com/jesseduffield/lazygit) & [Lazydocker](https://github.com/jesseduffield/lazydocker) 🦥🐳

- **Config:** See `private_Library/private_Application Support/lazygit/config.yml` and `lazydocker/config.yml`
- **Features:**
  - Custom color themes matching the rest of the setup
  - Keybindings for branch management, PR creation, GitHub integration, and more
  - Integration with `delta` for diffs
  - Custom commands for common workflows

### [Eza](https://github.com/eza-community/eza) 📁

- **Config:** See `dot_config/eza/theme.yml`
- **Features:**
  - Modern replacement for `ls` with icons, Git status, and colorized output
  - Custom color theme matching Tokyo Night
  - Used in aliases for `ls`, `ll`, etc.

### [Atuin](https://github.com/atuinsh/atuin) 🕰️

- **Config:** See `dot_config/atuin/config.toml`
- **Features:**
  - Shell history sync and search
  - Session-based filtering for up-arrow history
  - Compact style and custom inline height

### [Starship Prompt](https://starship.rs/) 🌟

- **Config:** See `dot_config/starship.toml`
- **Features:**
  - Custom prompt symbols and module settings
  - Integration with Direnv, Sudo, and more

### [Direnv](https://direnv.net/) 🌱

- **Config:** See `dot_config/direnv/direnv.toml`
- **Features:**
  - Automatic loading of `.envrc` and `.env` files for project-specific environments

### [Delta](https://github.com/dandavison/delta) 🌈

- **Config:** See `dot_config/bat/bat.conf` and Git config
- **Features:**
  - Syntax-highlighted diffs for Git, Fish, and other tools

### [Ghostty](https://ghostty.app/) 👻

- **Config:** See `dot_config/ghostty/config`
- **Features:**
  - GPU-accelerated terminal emulator
  - Custom font, keybindings, and Tokyo Night theme
  - Integration with Fish shell

### [Btop](https://github.com/aristocratos/btop) 📊

- **Config:** See `dot_config/btop/btop.conf`
- **Features:**
  - Resource monitor
  - Vim keybindings and detailed graphs

### [fzf](https://github.com/junegunn/fzf) 🔎

- **Config:** See Fish config and custom scripts
- **Features:**
  - Fuzzy finder for files, directories, history, and processes
  - Custom preview commands using `bat` and `eza`
  - Used in scripts like `rgfzf` for project search

### [Ripgrep](https://github.com/BurntSushi/ripgrep) 🦸

- **Config:** See `dot_config/ripgrep/config`
- **Features:**
  - Fast recursive search with custom ignore rules and color output

### [pgcli](https://www.pgcli.com/) 🐘

- **Config:** See `dot_config/pgcli/config`
- **Features:**
  - Enhanced Postgres CLI with auto-completion, syntax highlighting, and Vi mode

### [K9s](https://k9scli.io/) 🐶

- **Config:** See `dot_config/k9s/config.yml` and `plugin.yml`
- **Features:**
  - Terminal UI for Kubernetes clusters
  - Custom plugins for viewing logs with `bat`

### [Wireshark](https://www.wireshark.org/) 🦈

- **Config:** See `dot_config/wireshark/preferences`
- **Features:**
  - Custom font and column setup for packet analysis

---

## Package Management 📦

- **Homebrew**: All packages and casks are managed via `Brewfile.private` and `Brewfile.work`
- **NPM/Node**: Global packages installed via `run_once_install_packages.sh`
- **Go, Rust, Python**: Install scripts for language-specific tools and formatters

---

## Setup Instructions ⚡

1. **Install chezmoi** (if not already installed):

   ```sh
   brew install chezmoi
   ```

2. **Initialize dotfiles:**

   ```sh
   chezmoi init https://github.com/joelazar/dotfiles.git
   chezmoi apply
   ```

3. **Install packages:**

   ```sh
   ./run_once_install_packages.sh
   ```

4. **Apply system settings:**

   ```sh
   ./run_once_settings.sh
   ```

---

## Custom Scripts 🧑‍💻

- See `private_dot_local/bin/` for utility scripts:
  - `backup`, `cht`, `custom-update`, `fonttest`, `rgfzf`, `switch-main-display`, `transfer`, `untilfail`, etc.
- Many scripts use FZF, Bat, Age, and other CLI tools for enhanced workflows.

---

## Theming 🎨

- **Tokyo Night** are used across terminal, editors, and CLI tools for a consistent look.
- Fonts: Fira Code, FiraCode Nerd Font

---

## Acknowledgements 🙏

- Some utility functions and setup scripts are adapted from [alrra/dotfiles](https://github.com/alrra/dotfiles).

---

## License 📄

The code is available under the [MIT license](LICENSE).
