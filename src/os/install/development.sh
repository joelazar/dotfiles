#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh" \
    && . "./utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Development\n\n"

install_package "Git" "git"
install_package "kdiff3" "kdiff3"
install_package "meld" "meld"
install_package "tmux" "tmux"

if ! package_is_installed "neovim"; then

    add_ppa "neovim-ppa/stable" \
        || print_error "neovim (add PPA)"

    update &> /dev/null \
        || print_error "neovim (resync package index files)"

fi

install_package "Neovim" "neovim"
install_package "The Silver Searcher" "silversearcher-ag"
install_package "Go" "golang"
install_package "Texlive-base" "texlive-base"
install_package "Texlive-latex" "texlive-latex-base"
install_package "Texmaker" "texmaker"
install_package "Geany" "geany"
install_package "JRE" "default-jre"
install_package "JDK" "default-jdk"

if ! package_is_installed "code"; then

    add_key "https://packages.microsoft.com/keys/microsoft.asc" \
        || print_error "Visual Studio Code (add key)"

    add_to_source_list "[arch=amd64] https://packages.microsoft.com/repos/vscode stable main" "vscode.list" \
        || print_error "Visual Studio Code (add to package resource list)"

    update &> /dev/null \
        || print_error "Visual Studio Code (resync package index files)"

fi

install_package "Visual Studio Code" "code"

if ! package_is_installed "docker-ce"; then

    add_key "https://download.docker.com/linux/ubuntu/gpg" \
        || print_error "Docker (add key)"

    add_to_source_list "[arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) edge" "docker.list" \
        || print_error "Docker (add to package resource list)"

    update &> /dev/null \
        || print_error "Docker (resync package index files)"

fi

install_package "Docker" "docker-ce"
