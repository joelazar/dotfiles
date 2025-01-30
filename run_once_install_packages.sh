#!/bin/bash

SOURCE_DIR=$(chezmoi source-path)

cd "$SOURCE_DIR" &&
    . "./scripts/utils_install" &&
    . "./scripts/utils"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "Install packages\n"

ask_for_confirmation "Would you like to do it now? It can take a bit of time."
if ! answer_is_yes; then
    exit
fi

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

ask_for_sudo

# TODO: install homebrew
# /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
# /opt/homebrew/bin/brew install chezmoi
# brew install chezmoi
# git clone git@github.com:joelazar/dotfiles.git ~/.local/share/chezmoi
# /opt/homebrew/bin/chezmoi init
# /opt/homebrew/bin/chezmoi apply
# brew bundle

# TODO: install rust with rustup
# curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

print_in_purple "Package managers\n"

install_nnn_plugins

# TODO: install pip packages
# pip3 install pynvim --break-system-packages

print_in_purple "NPM packages\n"

install_npm_package "npm-check"
install_npm_package "rag-crawler"
install_npm_package "yalc"

print_in_purple "Go packages\n"

install_go_package "github.com/cosmos72/gomacro@latest" "gomacro"

print_in_purple "GH plugins\n"

# TODO: check if gh was authenticated already
install_gh_plugin "dlvhdr/gh-dash"
install_gh_plugin "github/gh-copilot"

# TODO: install yazi plugins
# ya pack -a yazi-rs/plugins:max-preview
# ya pack -a yazi-rs/plugins:smart-filter
# ya pack -a yazi-rs/plugins:hide-preview
# ya pack -a yazi-rs/plugins:diff
# ya pack -a yazi-rs/plugins:git
# ya pack -a KKV9/compress
# git clone https://github.com/BennyOe/tokyo-night.yazi.git ~/.config/yazi/flavors/tokyo-night.yazi

# TODO: install magic
# curl -ssL https://magic.modular.com/deb13a78-95b6-40bf-8bd0-52802eb302a8 | bash
# echo 'magic completion --shell fish | source' >> ~/.config/fish/completions/magic.fish
