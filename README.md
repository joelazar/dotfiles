# [joelazar](https://github.com/joelazar)’s dotfiles

## Details

This is the dotfiles setup which I use for my [`Manjaro i3 edition`](https://manjaro.org/download/i3/).
Theoritically, it could work on any non unorthodox Arch based
distributions but I didn't tested and I'm pretty sure that
some parts would need a little more attention to get them work.

Let me try to summarize the installed packages without attempting to be too comprehensive:

* [`yay`](https://github.com/Jguer/yay) - As a aur helper
* [`bash`](https://www.gnu.org/software/bash/) - Good ol' Bourne Again Shell
* [`tmux`](https://github.com/tmux/tmux) - As a terminal multiplexer
* [`neovim`](https://neovim.io/) - Vim on drugs
* [`git`](https://git-scm.com/) - No comment
  * [`diff-so-fancy`](https://github.com/so-fancy/diff-so-fancy) - Pretty discriptive add-on for git
* [`htop`](https://hisham.hm/htop/) - As a monitoring tool
* [`fzf`](https://github.com/junegunn/fzf) - Command-line fuzzy finder
* [`ripgrep`](https://github.com/BurntSushi/ripgrep) - Grep on drugs
* [`mpv`](https://mpv.io/) - For media
* [`i3`](https://i3wm.org/) - Window manager
* [`i3blocks`](https://github.com/vivien/i3blocks) - Status bar for i3
* [`compton`](https://github.com/chjj/compton) - Compositor for Xorg
* [`rofi`](https://github.com/davatorium/rofi) - A smart and fancy windows switcher, application launcher
* [`dunst`](https://dunst-project.org/) - Notification daemon
* [`ranger`](https://github.com/ranger/ranger) - File manager
* [`alacritty`](https://github.com/jwilm/alacritty) - Terminal with GPU-acceleration written in Rust
* [`font awesome`](https://origin.fontawesome.com/) - Fonts
* [`blackarch`](https://blackarch.org/) repo added with some basic penetration tool set
* [`chromium`](https://www.chromium.org/) and [`firefox`](https://www.mozilla.org/en-GB/firefox/) - Browsers
* [`spotify`](https://www.spotify.com/) - For music
* [`firejail`](https://firejail.wordpress.com/) - Running everything in sandbox
* [`zathura`](https://github.com/pwmt/zathura) - Document viewer
* [`docker`](https://www.docker.com/) - Container framework for OS level virtualization
* [`ncdu`](https://dev.yorhel.nl/ncdu) - Disk usage analyzer
* [`wine`](https://www.winehq.org/) - In case of need
* [`gimp`](https://www.gimp.org/) - For image manupulation
* [`rust`](https://www.rust-lang.org/), [`go`](https://golang.org/), [`python`](https://www.python.org/), [`clang`](https://clang.llvm.org/) - For programming
* some useful scripts for exmaple setting up [`algo vpn`](https://github.com/trailofbits/algo)
* and many more other useful stuff

## Setup

To set up the `dotfiles` just run the appropriate snippet in the
terminal:

(:warning: **DO NOT** run the `setup` snippet if you don't fully
understand [what it does](src/os/setup.sh). Seriously, **DON'T**!)

![Just don't :)](https://i.imgflip.com/pms4m.jpg)

| `Manjaro - i3 edition` | `bash -c "$(wget -qO - https://raw.github.com/joelazar/dotfiles/master/src/os/setup.sh)"` |

That's it! :sparkles:

The setup process will:

* Download the dotfiles on your computer (by default it will suggest
  `~/dotfiles`)
* Create some additional [directories](src/os/create_directories.sh)
* [Symlink](src/os/create_symbolic_links.sh) the
  [`git`](src/git),
  [`alacritty`](src/alacritty),
  [`development`](src/development),
  [`i3`](src/i3),
  [`mpv`](src/mpv),
  [`ranger`](src/ranger),
  [`scripts`](src/scripts),
  [`tmux`](src/tmux),
  [`shell`](src/shell),
  [`neovim`](src/nvim),
  [`services`](src/services)
* Install applications / command-line tools for Manjaro
  [`Install`](src/os/install)
* Install [`nvim` plugins](src/nvim/init.vim)
* Set some [`services`](src/os/preferences/services.sh) and [`crondjobs`](src/os/preferences/cronjobs.sh)

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

To update your system you can either run the [`setup`
script](src/os/setup.sh) (which is linked to your PATH btw.) or,
if you want to just update one particular part, run that part, it should work.
Everything was designed to be idempotent so you can use this as a system update
as well.


## Acknowledgements

Inspiration and code was taken from alrra, thus this is mainly a fork from his repo.
However, I removed macos part of it and tried to improve some lines here and there
and converted it to Manjaro compatible.
* [Cătălin](https://github.com/alrra)
  [dotfiles](https://github.com/alrra/dotfiles)


## License

The code is available under the [MIT license](LICENSE.txt).
