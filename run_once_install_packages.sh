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
#
# set fish as default
# sudo sh -c 'echo /opt/homebrew/bin/fish >> /etc/shells'
# chsh -s /opt/homebrew/bin/fish
#
# install chezmoi -->
# /opt/homebrew/bin/brew install chezmoi

# brew bundle install

# TODO: add mojo

print_in_purple "Package managers\n"

pyenv

install_nnn_plugins

print_in_purple "NPM packages\n"

install_npm_package "npm-check"
install_npm_package "yalc"

print_in_purple "Go packages\n"

install_go_package "github.com/cosmos72/gomacro@latest" "gomacro"

print_in_purple "Rust packages\n"

print_in_purple "GH plugins\n"

# TODO: check if gh was authenticated already

install_gh_plugin "dlvhdr/gh-dash"
install_gh_plugin "github/gh-copilot"
