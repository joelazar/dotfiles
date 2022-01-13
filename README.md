# [joelazar](https://github.com/joelazar)’s dotfiles

![joedotfiles - wallpaper](screenshots/wallpaper.png)

![joedotfiles - neovim](screenshots/neovim.png)

![joedotfiles - exa+fzf](screenshots/exa-fzf.png)

![joedotfiles - lazygit](screenshots/lazygit.png)

![joedotfiles - firefox](screenshots/firefox.png)

![joedotfiles - nnn+zathura+launcher](screenshots/nnn+zathura+launcher.png)

![joedotfiles - ncspot](screenshots/ncspot.png)

![joedotfiles - btop+neofetch](screenshots/btop+neofetch.png)

## Details

This is the dotfiles setup which I use for my [`Arch Linux`](https://archlinux.org/).
Theoretically, it could (and should) work on any non-unorthodox Arch based
distributions too, but I didn't test it.

Let me try to briefly list the installed and configured packages:

- [`yay`](https://github.com/Jguer/yay) - As an aur helper
- [`blackarch`](https://blackarch.org/) - repo added with some basic penetration tool set
- [`firejail`](https://firejail.wordpress.com/) - Running everything in sandbox
- [`docker`](https://www.docker.com/) - Container framework for OS level virtualization
- [`fish`](https://fishshell.com/) - Fish shell - [config](dot_config/private_fish)
  - [`fisher`](https://github.com/jorgebucaran/fisher) - A plugin manager for fish
    - [`fzf.fish`](https://github.com/PatrickF1/fzf.fish) - Fish + FZF
    - [`done`](https://github.com/franciscolourenco/done) - Automatically receive notifications when long processes finish
    - [`replay`](https://github.com/jorgebucaran/replay.fish) - Run Bash commands replaying changes in Fish
  - [`starship`](https://github.com/starship/starship) - For pimping my prompt - [config](dot_config/starship.toml)
- [`fzf`](https://github.com/junegunn/fzf) - Command-line fuzzy finder
- [`ripgrep`](https://github.com/BurntSushi/ripgrep) - Grep on drugs
- [`sway`](https://swaywm.org/) - I3 compatible window manager, but with Wayland - [config](dot_config/sway/config)
  - [`waybar`](https://github.com/Alexays/Waybar) - Highly customizable Wayland bar - [config](dot_config/waybar/config)
  - [`mako`](https://github.com/emersion/mako) - Notification daemon
  - [`sway-launcher-desktop`](https://github.com/Biont/sway-launcher-desktop) - Application launcher
- [`tmux`](https://github.com/tmux/tmux) - As a terminal multiplexer - [config](dot_tmux.conf)
- [`neovim`](https://neovim.io/) - Vim on drugs
  - [`my neovim config`](https://github.com/joelazar/nvim-config) - My own Neovim config written in Lua
- [`git`](https://git-scm.com/) - No comment
  - [`delta`](https://github.com/dandavison/delta) - Diff tool with syntax highlighting
  - [`lazygit`](https://github.com/jesseduffield/lazygit) - simple terminal UI for git commands
- [`btop`](https://github.com/aristocratos/btop) - For monitoring
- [`alacritty`](https://github.com/alacritty/alacritty) - A GPU-Accelerated terminal emulator - [config](dot_config/alacritty/alacritty.yml)
- [`nnn`](https://github.com/jarun/nnn) - File manager
- [`noto fonts`](https://github.com/googlefonts/noto-fonts) - Fonts
- [`firefox`](https://www.mozilla.org/en-GB/firefox/) - Good ol' Firefox
  - [`tridactyl`](https://github.com/tridactyl/tridactyl) - Vim-like interface for Firefox
- [`mpv`](https://mpv.io/) - For media
- [`ncspot`](https://github.com/hrkfdn/ncspot) - Cross-platform ncurses Spotify client
- [`zathura`](https://github.com/pwmt/zathura) - Document viewer
- [`ncdu`](https://dev.yorhel.nl/ncdu) - Disk usage analyzer
- [`rust`](https://www.rust-lang.org/), [`go`](https://golang.org/), [`python`](https://www.python.org/), [`clang`](https://clang.llvm.org/) - For programming
- and many more other useful stuff. See the following [file](run_once_install_packages.sh).

Most of the apps are configured with colors of [`nightfox`](https://github.com/EdenEast/nightfox.nvim).

## Setup

These dotfiles are managed with [chezmoi](https://github.com/twpayne/chezmoi).

Install them with:

```sh
chezmoi init https://github.com/joelazar/dotfiles.git

chezmoi apply
```

## Acknowledgements

Some [utils functions](scripts/) which I'm using for the initial [setup](run_once_install_packages.sh) and later for my update [script](private_dot_local/bin/executable_update_everything) was taken from [alrra](https://github.com/alrra)'s [dotfiles](https://github.com/alrra/dotfiles) repo, and I'm truly grateful for it.

I usually take my wallpapers from [Unsplash](https://unsplash.com/) and the one which is present in my screenshot is from [Arnaud Steckle](https://unsplash.com/@arnaudsteckle).

## License

The code is available under the [MIT license](LICENSE).
