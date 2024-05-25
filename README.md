# [joelazar](https://github.com/joelazar)’s dotfiles

## Wallpaper

![joedotfiles - wallpaper](https://github.com/joelazar/dotfiles/assets/16268238/bfa565ef-ebcd-467c-927d-7293a74324b8)

## Neovim with my [custom config](https://github.com/joelazar/nvim-config)

![joedotfiles - neovim](https://github.com/joelazar/dotfiles/assets/16268238/9a81f29a-1929-43d7-a87a-ae2da28469d3)

## Eza + FZF

![joedotfiles - eza+fzf](https://github.com/joelazar/dotfiles/assets/16268238/c40498f8-e082-4c21-9b96-c31ed56df758)

## Lazygit

![joedotfiles - lazygit](https://github.com/joelazar/dotfiles/assets/16268238/d5728557-8192-44ce-a88d-d076827e9f38)

## Firefox + [Vimium](https://addons.mozilla.org/en-US/firefox/addon/vimium-ff/)

![joedotfiles - firefox + vimium](https://github.com/joelazar/dotfiles/assets/16268238/b95dfd66-9ee7-42a7-b2c2-76c190ea0a3a)

## nnn + preview-tui

![joedotfiles - nnn+preview](https://github.com/joelazar/dotfiles/assets/16268238/bec3b981-766a-4013-b00a-4a8d09154e6d)

## Details

This is the dotfiles setup which I use for my MacOS.

Let me try to briefly list the installed and configured packages:

- [`homebrew`](https://brew.sh/) - Package manager for MacOS
- [`colima`](https://github.com/abiosoft/colima) - For running Linux containers on MacOS
- [`hyperkey`](https://hyperkey.app/) - For remapping Caps Lock key
- [`monitorcontrol`](https://github.com/MonitorControl/MonitorControl) - For controlling external monitor brightness
- [`raycast`](https://raycast.com/) - For productivity
- [`kitty`](https://sw.kovidgoyal.net/kitty/) - Fast, feature-rich, GPU based terminal emulator
- [`fish`](https://fishshell.com/) - Fish shell - [config](dot_config/private_fish)
  - [`fisher`](https://github.com/jorgebucaran/fisher) - A plugin manager for fish
    - [`fzf.fish`](https://github.com/PatrickF1/fzf.fish) - Fish + FZF
    - [`done`](https://github.com/franciscolourenco/done) - Automatically receive notifications when long processes finish
    - [`replay`](https://github.com/jorgebucaran/replay.fish) - Run Bash commands replaying changes in Fish
    - [./dot_config/private_fish/fish_plugins](dot_config/private_fish/fish_plugins) - For complete list
  - [`starship`](https://github.com/starship/starship) - For pimping my prompt - [config](dot_config/starship.toml)
- [`fzf`](https://github.com/junegunn/fzf) - Command-line fuzzy finder
- [`atuin`](https://github.com/atuinsh/atuin) - For getting my shell history everywhere
- [`ripgrep`](https://github.com/BurntSushi/ripgrep) - Grep on steroids
- [`fd`](https://github.com/sharkdp/fd) - Updated find
- [`zoxide`](https://github.com/ajeetdsouza/zoxide) - Smarter cd command
- [`eza`](https://github.com/eza-community/eza) - Modern `ls`
- [`bat`](https://github.com/sharkdp/bat) - cat(1) clone with wings
- [`mods`](https://github.com/charmbracelet/mods/) - For AI chats from the terminal
- [`neovim`](https://neovim.io/) - Vim on steroids
  - [`my neovim config`](https://github.com/joelazar/nvim-config) - My own Neovim config written in Lua
- [`git`](https://git-scm.com/) - No comment
  - [`delta`](https://github.com/dandavison/delta) - Diff tool with syntax highlighting
  - [`lazygit`](https://github.com/jesseduffield/lazygit) - simple terminal UI for git commands
- [`btop`](https://github.com/aristocratos/btop) - For monitoring
- [`nnn`](https://github.com/jarun/nnn) - File manager
- [`firefox`](https://www.mozilla.org/en-GB/firefox/) - Good ol' Firefox
- [`mpv`](https://mpv.io/) - For media
- [`ncspot`](https://github.com/hrkfdn/ncspot) - Cross-platform ncurses Spotify client
- [`rust`](https://www.rust-lang.org/), [`go`](https://golang.org/), [`python`](https://www.python.org/), [`clang`](https://clang.llvm.org/) - For programming
- and many more other useful stuff. See the following [file](run_once_install_packages.sh).

Most of my apps are configured to use colors of [`catppuccin mocha`](https://github.com/catppuccin).

## Setup

These dotfiles are managed with [chezmoi](https://github.com/twpayne/chezmoi).

Install them with:

```sh
chezmoi init https://github.com/joelazar/dotfiles.git

chezmoi apply
```

## Acknowledgements

Some [utils functions](scripts/) which I'm using for the initial [setup](run_once_install_packages.sh) and later for my update [script](private_dot_local/bin/executable_update_everything) was taken from [alrra](https://github.com/alrra)'s [dotfiles](https://github.com/alrra/dotfiles) repo, and I'm truly grateful for it.

My wallpapers are from [catpuccin-wallpapers](https://github.com/zhichaoh/catppuccin-wallpapers) repo.

## License

The code is available under the [MIT license](LICENSE).
