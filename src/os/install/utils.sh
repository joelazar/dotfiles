#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "../utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

add_key() {
    wget -qO - "$1" | sudo apt-key add - &> /dev/null
}

add_key_by_hash() {
    sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys "$1" &> /dev/null
}

add_ppa() {
    sudo add-apt-repository -y ppa:"$1" &> /dev/null
}

add_repo() {
    sudo add-apt-repository -y "$1" &> /dev/null
}

add_to_source_list() {
    sudo sh -c "printf 'deb $1' >> '/etc/apt/sources.list.d/$2'"
}

autoremove() {
    execute \
        "pacman -Rsn $(pacman -Qdtq)" \
        "PACMAN (autoremove)"
}

install_package() {
    declare -r PACKAGE="$2"
    declare -r PACKAGE_READABLE_NAME="$1"

    if ! package_is_installed "$PACKAGE"; then
        execute "sudo pacman -S $PACKAGE"
        #                                      suppress output ─┘│
        #            assume "yes" as the answer to all prompts ──┘
    else
        print_success "$PACKAGE_READABLE_NAME"
    fi
}

install_package_with_yaourt() {
    declare -r PACKAGE="$2"
    declare -r PACKAGE_READABLE_NAME="$1"

    if ! package_is_installed_yaourt "$PACKAGE"; then
        execute "sudo yaourt -Sq $PACKAGE"
        #                                      suppress output ─┘│
        #            assume "yes" as the answer to all prompts ──┘
    else
        print_success "$PACKAGE_READABLE_NAME"
    fi
}

package_is_installed() {
    pacman -Q | grep -q "$1" &> /dev/null
}

update() {
    execute \
        "sudo pacman -Syyu" \
        "PACMAN (update)"
}

rank() {
    execute \
        "sudo pacman-mirrors -f 0 && sudo pacman -Syy" \
        "PACMAN (rank mirrors)"
}
