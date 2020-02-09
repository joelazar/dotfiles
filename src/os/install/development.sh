#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Development\n\n"

install_package "clang" "clang"
install_package "ctags" "ctags"
install_package "code" "code"
install_package "delve" "delve"
install_package "docker" "docker"
install_package "fd" "fd"
install_package "fzf" "fzf"
install_package "git" "git"
install_package "go" "go"
install_package "hugo" "hugo"
install_package "kdiff3" "kdiff3"
install_package "neovim" "neovim"
install_package "openJDK" "jdk-openjdk"
install_package "python" "python"
install_package "ripgrep" "ripgrep"
install_package "rust" "rust"
install_package "shellcheck" "shellcheck"
install_package "shfmt" "shfmt"
install_package "texlive-science" "texlive-science"
install_package "texmaker" "texmaker"
install_package "tmux" "tmux"
install_package "yapf" "yapf"

print_in_purple "\n   Python packages\n\n"

install_package "pipenv" "python-pipenv"
install_package "python-jedi" "python-jedi"
install_package "python-neovim" "python-neovim"
install_package "python-virtualenv" "python-virtualenv"
install_package "grip" "grip"
