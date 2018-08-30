#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Development\n\n"

install_package "ctags" "ctags"
install_package "docker" "docker"
install_package "eclipse" "eclipse-java"
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
install_package "openJDK" "jdk9-openjdk"
install_package "texlive-science" "texlive-science"
install_package "texmaker" "texmaker"
install_package "the Silver Searcher" "the_silver_searcher"
install_package "tk" "tk"
install_package "tmux" "tmux"
install_package "visual studio code" "visual-studio-code-bin"
