#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Development\n\n"

install_package "Git" "git"
install_package "tk" "tk"
install_package "kdiff3" "kdiff3"
install_package "meld" "meld"
install_package "tmux" "tmux"
install_package "Neovim" "neovim"
install_package "The Silver Searcher" "the_silver_searcher"
install_package "Go" "go"
install_package "Texlive-science" "texlive-science"
install_package "Texmaker" "texmaker"
install_package "Geany" "geany"
install_package "OpenJDK" "jdk9-openjdk"
install_package "Visual Studio Code" "visual-studio-code"
install_package "Docker" "docker"

