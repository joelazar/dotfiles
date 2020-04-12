# [joelazar](https://github.com/joelazar)’s dotfiles

![joedotfiles - neofetch](https://user-images.githubusercontent.com/16268238/76142019-d1728f80-6069-11ea-9d44-a46382414c5c.png)

![joedotfiles - second workspace](https://user-images.githubusercontent.com/16268238/76142030-fb2bb680-6069-11ea-9d5f-c955479af682.png)

## Details

This is the dotfiles setup which I use for my [`Arch Linux`](https://archlinux.org/).
Theoritically, it could (and should) work on any non unorthodox Arch based
distributions too, but I didn't test it.

Let me try to briefly list the installed and configured packages:

* [`yay`](https://github.com/Jguer/yay) - As an aur helper
* [`zsh`](http://zsh.sourceforge.net/) - Z shell
* [`oh my zsh`](https://ohmyz.sh/) - oh my zsh framework for zsh configurations
* [`sway`](https://swaywm.org/) - I3 compatible window manager with wayland
* [`mako`](https://github.com/emersion/mako) - Notification daemon
* [`dmenu`](https://git.suckless.org/dmenu/) - Application launcher for WMs
* [`tmux`](https://github.com/tmux/tmux) - As a terminal multiplexer
* [`neovim`](https://neovim.io/) - Vim on drugs
  * [`SpaceVim`](https://spacevim.org/) - A community-driven vim distribution, which handles collections of plugins in layers.
* [`git`](https://git-scm.com/) - No comment
  * [`diff-so-fancy`](https://github.com/so-fancy/diff-so-fancy) - Pretty discriptive add-on for git
* [`htop`](https://hisham.hm/htop/) - As a monitoring tool
* [`fzf`](https://github.com/junegunn/fzf) - Command-line fuzzy finder
* [`ripgrep`](https://github.com/BurntSushi/ripgrep) - Grep on drugs
* [`mpv`](https://mpv.io/) - For media
* [`nnn`](https://github.com/jarun/nnn) - File manager
* [`alacritty`](https://github.com/jwilm/alacritty) - Terminal with GPU-acceleration written in Rust
* [`font awesome`](https://origin.fontawesome.com/) - Fonts
* [`nerd fonts symbols`](https://www.nerdfonts.com/) - Symbols
* [`blackarch`](https://blackarch.org/) repo added with some basic penetration tool set
* [`firefox`](https://www.mozilla.org/en-GB/firefox/) - Good ol' Firefox
* [`spotify`](https://www.spotify.com/) - For music
* [`firejail`](https://firejail.wordpress.com/) - Running everything in sandbox
* [`zathura`](https://github.com/pwmt/zathura) - Document viewer
* [`docker`](https://www.docker.com/) - Container framework for OS level virtualization
* [`ncdu`](https://dev.yorhel.nl/ncdu) - Disk usage analyzer
* [`wine`](https://www.winehq.org/) - In case of need
* [`gimp`](https://www.gimp.org/) - For image manupulation
* [`rust`](https://www.rust-lang.org/), [`go`](https://golang.org/), [`python`](https://www.python.org/), [`clang`](https://clang.llvm.org/) - For programming
* some useful scripts for example setting up [`algo vpn`](https://github.com/trailofbits/algo)
* and many more other useful stuff

## Setup

To set up the `dotfiles` just clone and execute [run_setup](src/os/run_setup).

(:warning: **DO NOT** run it until you don't fully
understand [what it does](src/os/run_setup). Seriously, **DON'T**!)

![Just don't :)](https://i.imgflip.com/pms4m.jpg)

That's it! :sparkles:

The setup process will:

* Create some additional [directories](src/os/create_directories)
* [Symlink](src/os/create_symbolic_links) the
  [`alacritty`](src/alacritty),
  [`development`](src/development),
  [`git`](src/git),
  [`mpv`](src/mpv),
  [`neovim`](src/nvim),
  [`scripts`](src/scripts),
  [`share`](src/share),
  [`shell`](src/shell),
  [`sway`](src/sway),
  [`tmux`](src/tmux),
* Install applications / command-line tools for Arch
  [`Install`](src/os/install_applications)
* Install [`SpaceVim` setup](src/nvim/init.toml)
* Set some [`settings`](src/os/settings)

## Customize

### Local Settings

The `dotfiles` can be easily extended to suit additional local
requirements by using the following files:

#### `~/.bash.local`

The `~/.bash.local` file it will be automatically sourced after
all the other [`bash` related files](src/shell), thus, allowing
its content to add to or overwrite the existing aliases, settings,
PATH, etc.

Here is a very simple example of a `~/.bash.local` file:

```bash
#!/bin/bash

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

# Set local aliases.

alias starwars="telnet towel.blinkenlights.nl"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

# Set PATH additions.

PATH="$PATH:$HOME/dotfiles/src/bin"

export PATH

```

#### `~/.gitconfig.local`

The `~/.gitconfig.local` file it will be automatically included
after the configurations from `~/.gitconfig`, thus, allowing its
content to overwrite or add to the existing `git` configurations.

__Note:__ Use `~/.gitconfig.local` to store sensitive information
such as the `git` user credentials, e.g.:

```bash
[user]

    name = Agi
    email = agi@example.com

```

## Update

To update your system you can either run the [`run_setup`
script](src/os/run_setup) (which is linked to your PATH btw.) or,
if you want to just update one particular part, run that part, it should work.
Everything was designed to be idempotent so you can use this as a system update
as well.


## Acknowledgements

Inspiration and code was taken from alrra, thus this is/was mainly a fork from his repo.
However, I removed macos part of it and tried to improve some lines here and there
and converted it to be Manjaro compatible and later Arch compatible.
* [Cătălin](https://github.com/alrra)
  [dotfiles](https://github.com/alrra/dotfiles)


## License

The code is available under the [MIT license](LICENSE.txt).
