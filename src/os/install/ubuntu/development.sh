#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../../utils.sh" \
    && . "utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

print_in_purple "\n   Git\n\n"

install_package "Git" "git"
install_package "kdiff3" "kdiff3"
install_package "meld" "meld"
install_package "Wireshark" "wireshark"
# deb http://download.virtualbox.org/virtualbox/debian xenial contrib

install_package "Virtualbox" "virtualbox-5.1" # 5.1?

print_in_purple "\n   tmux\n\n"

install_package "tmux" "tmux"

install_package "GNOME Vim" "vim-gnome"
#neovim

install_package "The Silver Searcher" "silversearcher-ag"

install_package "Go" "go"

install_package "Texlive" "texlive-full" # TODO - not full!
install_package "Texmaker" "texmaker"

install_package "JRE" "default-jre"
install_package "JDK" "default-jdk"

if ! package_is_installed "code"; then

    add_key "https://packages.microsoft.com/keys/microsoft.asc" \
        || print_error "Visual Studio Code (add key)"

    add_to_source_list "[arch=amd64] https://packages.microsoft.com/repos/vscode stable main" "vscode.list" \
        || print_error "Visual Studio Code (add to package resource list)"

    update &> /dev/null \
        || print_error "Visual Studio Code (resync package index files)"

    install_package "Visual Studio Code" "code"

fi



