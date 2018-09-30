#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Development\n\n"

install_package "ctags" "ctags"
install_package "clang" "clang"
install_package "docker" "docker"
install_package "exercism" "exercism-cli"
install_package "gedit" "gedit"
install_package "git" "git"
install_package "git-standup" "git-standup"
install_package "go" "go"
install_package "fd" "fd"
install_package "fzf" "fzf"
install_package "heroku" "heroku"
install_package "kdiff3" "kdiff3"
install_package "meld" "meld"
install_package "neovim" "neovim"
install_package "nodejs" "nodejs"
install_package "npm" "npm"
install_package "openJDK" "jdk10-openjdk"
install_package "shfmt" "shfmt"
install_package "texlive-science" "texlive-science"
install_package "texmaker" "texmaker"
install_package "the Silver Searcher" "the_silver_searcher"
install_package "tmux" "tmux"
