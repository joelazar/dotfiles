# [joelazar](https://github.com/joelazar)’s dotfiles

![joedotfiles - wallpaper](screenshots/wallpaper.png)

![joedotfiles - spacevim](screenshots/spacevim.png)

![joedotfiles - diff](screenshots/diff.png)

## Details

This is the dotfiles setup which I use for my [`Arch Linux`](https://archlinux.org/).
Theoritically, it could (and should) work on any non unorthodox Arch based
distributions too, but I didn't test it.

Let me try to briefly list the installed and configured packages:

* [`yay`](https://github.com/Jguer/yay) - As an aur helper
* [`fish`](https://fishshell.com/) - Fish shell
* [`fisher`](https://github.com/jorgebucaran/fisher) - A plugin manager for fish
* [`sway`](https://swaywm.org/) - I3 compatible window manager, but with wayland
* [`waybar`](https://github.com/Alexays/Waybar) - Highly customizable Wayland bar
* [`mako`](https://github.com/emersion/mako) - Notification daemon
* [`sway-launcher-desktop`](https://github.com/Biont/sway-launcher-desktop) - Application launcher
* [`tmux`](https://github.com/tmux/tmux) - As a terminal multiplexer
* [`neovim`](https://neovim.io/) - Vim on drugs
  * [`SpaceVim`](https://spacevim.org/) - A community-driven vim distribution, which handles collections of plugins in layers.
* [`git`](https://git-scm.com/) - No comment
  * [`delta`](https://github.com/dandavison/delta) - Diff tool with syntax highlighting
* [`bpytop`](https://github.com/aristocratos/bpytop) - As a monitoring tool
* [`fzf`](https://github.com/junegunn/fzf) - Command-line fuzzy finder
* [`ripgrep`](https://github.com/BurntSushi/ripgrep) - Grep on drugs
* [`mpv`](https://mpv.io/) - For media
* [`nnn`](https://github.com/jarun/nnn) - File manager
* [`alacritty`](https://github.com/alacritty/alacritty) - A GPU-Accelerated terminal emulator
* [`font awesome`](https://origin.fontawesome.com/) - Fonts
* [`nerd fonts`](https://www.nerdfonts.com/) - Complete nerd fonts package
* [`blackarch`](https://blackarch.org/) repo added with some basic penetration tool set
* [`firefox`](https://www.mozilla.org/en-GB/firefox/) - Good ol' Firefox
* [`spotify`](https://www.spotify.com/) - For music
* [`firejail`](https://firejail.wordpress.com/) - Running everything in sandbox
* [`zathura`](https://github.com/pwmt/zathura) - Document viewer
* [`docker`](https://www.docker.com/) - Container framework for OS level virtualization
* [`ncdu`](https://dev.yorhel.nl/ncdu) - Disk usage analyzer
* [`proton`](https://github.com/ValveSoftware/Proton)- In case of need
* [`rust`](https://www.rust-lang.org/), [`go`](https://golang.org/), [`python`](https://www.python.org/), [`clang`](https://clang.llvm.org/) - For programming
* and many more other useful stuff

## Setup

These dotfiles are managed with [chezmoi](https://github.com/twpayne/chezmoi).

Install them with:

```sh
chezmoi init https://github.com/joelazar/dotfiles.git
```

## Acknowledgements

Some of the [utils functions](scripts/) which I'm using for the initial [setup](run_once_install_packages.sh) and later for my update [script](private_dot_local/bin/executable_update_everything) was taken from [alrra](https://github.com/alrra)'s [dotfiles](https://github.com/alrra/dotfiles) repo and I'm really grateful for it.

I usually take my wallpapers from [Unsplash](https://unsplash.com/) and the one which is present in my screenshot is from [Michal Zych](https://unsplash.com/@enzu).

## License

The code is available under the [MIT license](LICENSE).
